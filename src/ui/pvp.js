// ============================================================================
// ONLINE PvP
//
// Two players, two devices, one game. Both devices run the same engine from
// the same random seed, and each sends only what its player does: the actions
// (play to bench, attach energy, attack...) and the answers to choices. The
// other device replays them, so both boards stay identical without ever
// sending the board itself. This is "deterministic lockstep".
//
// What keeps the two devices in step:
//   * the same seed (Rng.seed), chosen by the player who made the room
//   * the same order of everything random: on the guest's device SIDES is
//     reversed for the game, so loops over both sides always run host first
//   * every choice the player makes is sent, forced ones included, and the
//     other device waits for it at the same point (combat.js)
//   * a short hash of the board travels with each message; if the two boards
//     ever differ the game stops without a result instead of carrying on wrong
//
// The connection is the arcade's Firebase Realtime Database, under tcgPvp/.
// Its free plan has no daily write limit; it caps 100 connections at once and
// the data downloaded per month. The game can't read those limits, so it
// checks the service actually answers (and accepts a test write) before
// offering a room, and says "not available" when it doesn't.
// ============================================================================

const PVP_TURN_SECONDS = 60;        // each turn; when it runs out the turn ends
const PVP_SETUP_SECONDS = 90;       // placing the opening creatures
const PVP_CHOICE_SECONDS = 30;      // a choice asked during the other player's turn
const PVP_ABANDON_SECONDS = 45;     // the other player offline this long: you win
const PVP_SILENCE_SECONDS = 120;    // nothing from them during their turn for this long: you win
const PVP_LOST_SECONDS = 45;        // this device offline this long: the game stops
const PVP_PROTOCOL = 1;             // bump when the rules code changes in a way the card data doesn't show
const PVP_NAME_KEY = 'tcg.pvpName';
const PVP_DECK_KEY = 'tcg.pvpDeck';
const PVP_CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PVP_SDK_BASE = 'https://www.gstatic.com/firebasejs/10.8.0/';
const PVP_FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDaxTpbasYOjVhm13D1Zi6lyqCatEqTn-M',
    authDomain: 'arcade-sandro.firebaseapp.com',
    projectId: 'arcade-sandro',
    databaseURL: 'https://arcade-sandro-default-rtdb.firebaseio.com',
    storageBucket: 'arcade-sandro.firebasestorage.app',
    messagingSenderId: '348759287679',
    appId: '1:348759287679:web:313c0f25e4227fa07a1c4a'
};

/** Small stable string hash (FNV-1a), for the version and board checks. */
function pvpHash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
}

/** Rejects after `ms` with an Error whose code is 'timeout'. */
function pvpWithTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => { const e = new Error('timeout'); e.code = 'timeout'; reject(e); }, ms);
        Promise.resolve(promise).then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
}

function pvpIsPermissionError(err) {
    const text = `${err && err.code} ${err && err.message}`.toLowerCase();
    return text.includes('permission');
}

// ---------------------------------------------------------------------------
// The connection: Firebase Realtime Database
// ---------------------------------------------------------------------------

const PvPNet = {
    db: null,
    root: null,
    _sdk: null,
    _generation: 0,

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[data-pvp-src="${src}"]`);
            if (existing && existing.dataset.loaded === 'true') { resolve(); return; }
            const s = existing || document.createElement('script');
            s.src = src;
            s.async = true;
            s.dataset.pvpSrc = src;
            s.onload = () => { s.dataset.loaded = 'true'; resolve(); };
            s.onerror = () => reject(new Error('Could not load the online service'));
            if (!existing) document.head.appendChild(s);
        });
    },

    /** Loads the Firebase SDK the first time online play is opened. */
    loadSdk() {
        if (window.firebase && window.firebase.database) return Promise.resolve();
        if (!this._sdk) {
            this._sdk = this._loadScript(PVP_SDK_BASE + 'firebase-app-compat.js')
                .then(() => this._loadScript(PVP_SDK_BASE + 'firebase-database-compat.js'))
                .catch(err => { this._sdk = null; throw err; });
        }
        return this._sdk;
    },

    /**
     * Connects and checks the service really answers: it must report a live
     * connection and accept (then delete) a small test write.
     * @returns {Promise<{ok: boolean, reason?: 'setup'|'unavailable'|'offline'}>}
     */
    async connect() {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, reason: 'offline' };
        try {
            await pvpWithTimeout(this.loadSdk(), 12000);
        } catch (err) {
            return { ok: false, reason: 'unavailable' };
        }
        try {
            const fb = window.firebase;
            const app = (fb.apps || []).find(a => a.name === 'tcg-pvp') || fb.initializeApp(PVP_FIREBASE_CONFIG, 'tcg-pvp');
            this.db = app.database();
            this.db.goOnline();
            this._generation++;
            this.root = this.db.ref('tcgPvp');

            await pvpWithTimeout(new Promise(resolve => {
                const ref = this.db.ref('.info/connected');
                const cb = snap => { if (snap.val() === true) { ref.off('value', cb); resolve(); } };
                ref.on('value', cb);
            }), 9000);

            const probe = this.root.child('health').push();
            await pvpWithTimeout(probe.set({ at: window.firebase.database.ServerValue.TIMESTAMP }), 8000);
            probe.remove().catch(() => {});
            return { ok: true };
        } catch (err) {
            console.warn('[pvp] connect failed', err);
            this.disconnectSoon(0);
            return { ok: false, reason: pvpIsPermissionError(err) ? 'setup' : 'unavailable' };
        }
    },

    /** Drops the connection (after a delay) unless a new session has started since. */
    disconnectSoon(ms = 4000) {
        const gen = this._generation;
        setTimeout(() => {
            if (gen === this._generation && this.db && !PvP.active && !PvPLobby.busy) {
                try { this.db.goOffline(); } catch (e) { /* already offline */ }
            }
        }, ms);
    },

    room(code) {
        return this.root.child('rooms').child(code);
    },

    /** Removes rooms nobody cleaned up (older than a day). Best effort. */
    pruneStale() {
        try {
            this.root.child('rooms').orderByChild('createdAt').endAt(Date.now() - 86400000).limitToFirst(25)
                .once('value', snap => snap.forEach(child => { child.ref.remove().catch(() => {}); }))
                .catch(() => {});
        } catch (e) { /* not important */ }
    },

    /** Creates a room with a fresh 4-letter code. Returns { code, ref }. */
    async createRoom(info) {
        for (let attempt = 0; attempt < 6; attempt++) {
            let code = '';
            for (let i = 0; i < 4; i++) code += PVP_CODE_LETTERS[Math.floor(Math.random() * PVP_CODE_LETTERS.length)];
            const ref = this.room(code);
            const result = await pvpWithTimeout(ref.transaction(current => (current === null ? {
                createdAt: Date.now(),
                v: PvP.version(),
                status: 'waiting',
                host: info
            } : undefined)), 10000);
            if (result.committed) {
                // While waiting, the room disappears if this device goes away.
                ref.onDisconnect().remove();
                this.pruneStale();
                return { code, ref };
            }
        }
        throw new Error('No free room code');
    },

    /** Takes the guest seat in a room. Returns { ref, room } or { error }. */
    async joinRoom(code, info) {
        const ref = this.room(code);
        const snap = await pvpWithTimeout(ref.once('value'), 10000);
        const room = snap.val();
        if (!room || !room.host) return { error: `There's no room with the code ${code}. Check the code and try again.` };
        if (room.v !== PvP.version()) {
            return { error: 'The other player has a different version of the game. Both of you reload the page (pull down to refresh on a phone), then try again.' };
        }
        if (room.status !== 'waiting' || room.guest) return { error: 'That room already has two players.' };
        const result = await pvpWithTimeout(ref.child('guest').transaction(current => (current === null ? info : undefined)), 10000);
        if (!result.committed) return { error: 'That room already has two players.' };
        return { ref, room };
    },

    /**
     * The message channel for a game in progress, plus presence: each device
     * marks itself present, and the mark is removed by the server when its
     * connection drops.
     */
    gameTransport(ref, role) {
        const other = role === 'host' ? 'guest' : 'host';
        const actions = ref.child('actions');
        const me = ref.child('presence').child(role);
        const them = ref.child('presence').child(other);
        const connected = this.db.ref('.info/connected');
        const offs = [];
        const watch = (r, event, cb) => { r.on(event, cb); offs.push(() => r.off(event, cb)); };

        return {
            listen(onMessage) {
                watch(actions, 'child_added', snap => onMessage(snap.val()));
                watch(connected, 'value', snap => {
                    const on = snap.val() === true;
                    if (on) {
                        me.onDisconnect().remove();
                        me.set(true).catch(() => {});
                    }
                    PvP.onConnection(on);
                });
                watch(them, 'value', snap => PvP.onOpponentPresence(snap.val() === true));
            },
            send(msg) {
                return actions.push(msg);
            },
            close({ removeRoom = false } = {}) {
                for (const off of offs) off();
                me.onDisconnect().cancel().catch(() => {});
                me.remove().catch(() => {});
                // The host tidies the room away, a little later so the last
                // message (a forfeit, say) still reaches the other player.
                if (removeRoom) setTimeout(() => ref.remove().catch(() => {}), 4000);
                PvPNet.disconnectSoon(6000);
            }
        };
    }
};

// ---------------------------------------------------------------------------
// The game in progress
// ---------------------------------------------------------------------------

const PvP = {
    active: false,
    role: null,                  // 'host' | 'guest'
    opponentName: '',
    transport: null,

    seq: 0,                      // next number for a message this device sends
    nextIn: 0,                   // next number expected from the other device
    inbox: new Map(),
    waiter: null,                // { kind, resolve, reject } while waiting for them

    openingHand: [],
    turnKey: null,               // the turn number the clock is running for
    turnSide: null,
    deadline: 0,
    turnStartedAt: 0,
    setupDeadline: 0,
    timedOut: false,
    lastHeard: 0,
    awaySince: null,
    offlineSince: null,
    _tick: null,
    _ending: false,
    _setupAuto: false,
    _version: null,

    /** Identifies the rules both devices must share: protocol + the card data. */
    version() {
        if (!this._version) {
            const cards = (typeof cardDatabase !== 'undefined' ? cardDatabase : []).map(c => [
                c.id, c.type, c.stage, c.hp, c.retreat, c.prevStage,
                c.move1Name, c.move1Cost, c.move1Damage, c.move1Effect,
                c.move2Name, c.move2Cost, c.move2Damage, c.move2Effect,
                c.abilityEffect, c.itemEffect, c.accessoryEffect, c.accessoryType
            ]);
            this._version = `${PVP_PROTOCOL}-${pvpHash(JSON.stringify(cards))}`;
        }
        return this._version;
    },

    /**
     * Starts the game on this device.
     * @param {object} o { role, seed, deckName, theirs: {name, deck(JSON)}, transport }
     */
    begin(o) {
        const theirDeck = JSON.parse(o.theirs.deck);
        this.cleanup();
        this.active = true;
        this.role = o.role;
        this.opponentName = String(o.theirs.name || 'Opponent').slice(0, 16);
        this.transport = o.transport;
        this.seq = 0;
        this.nextIn = 0;
        this.inbox = new Map();
        this.waiter = null;
        this.timedOut = false;
        this._ending = false;
        this._setupAuto = false;
        this.turnKey = null;
        this.lastHeard = Date.now();
        this.awaySince = null;
        this.offlineSince = null;

        // Host first in every loop over both sides, on both devices.
        if (this.role === 'guest' && SIDES[0] === 'player') SIDES.reverse();
        SideNames.opponent = this.opponentName;

        DeckLibrary.load();
        const mine = DeckLibrary.decks.findIndex(d => d.type === 'custom' && d.name === o.deckName);
        gameState.player.selectedDeck = mine;
        gameState.opponent.selectedDeck = DeckLibrary.setPvpDeck(theirDeck);

        if (typeof Profile !== 'undefined' && Profile.s) Profile.startMatch(o.deckName, this.opponentName, { pvp: true });

        const nameEl = document.querySelector('.hud-side[data-player="opponent"] .hud-name');
        if (nameEl) nameEl.textContent = `🌐 ${this.opponentName}`;

        this.transport.listen(msg => this._receive(msg));
        this.setupDeadline = Date.now() + PVP_SETUP_SECONDS * 1000;
        this._tick = setInterval(() => this.tick(), 250);

        // Seeded last, right before the decks are shuffled, so nothing else
        // can draw a random number on one device and not the other.
        Rng.seed(o.seed);
        Screens.beginGame({ pvp: true });
        this.openingHand = gameState.player.hand.slice();
        Log.write(`🌐 Online game against ${this.opponentName}. Each turn has ${PVP_TURN_SECONDS} seconds.`,
            { kind: 'turn', icon: '🌐' });
    },

    // -----------------------------------------------------------------------
    // Messages
    // -----------------------------------------------------------------------

    /** A short fingerprint of both boards, in host-first order. */
    stateHash() {
        const card = c => (c ? `${c.id}:${c.damage}:${c.energy}` : '-');
        const parts = [gameState.turnNumber, SIDES.indexOf(gameState.currentTurn)];
        for (const side of SIDES) {
            const s = gameState[side];
            parts.push(s.points, s.deck.join(','), s.hand.map(c => c.id).join(','),
                s.discardPile.length, card(s.active), s.bench.map(card).join(','));
        }
        return pvpHash(parts.join('|'));
    },

    _send(kind, payload, withHash) {
        if (!this.transport) return;
        const msg = {
            by: this.role,
            seq: kind === 'x' ? -1 : this.seq++,
            k: kind,
            d: JSON.stringify(payload),
            h: withHash ? this.stateHash() : ''
        };
        Promise.resolve()
            .then(() => this.transport.send(msg))
            .catch(err => {
                console.error('[pvp] send failed', err);
                this.abort("The online service stopped accepting moves (it may be at its free limit).");
            });
    },

    _receive(msg) {
        if (!msg || msg.by === this.role || !this.active) return;
        this.lastHeard = Date.now();
        if (msg.k === 'x') {
            let d = {};
            try { d = JSON.parse(msg.d); } catch (e) { /* ignore */ }
            this._control(d);
            return;
        }
        if (typeof msg.seq !== 'number' || msg.seq < this.nextIn || this.inbox.has(msg.seq)) return;
        this.inbox.set(msg.seq, msg);
        this._pump();
    },

    _pump() {
        if (!this.waiter || !this.inbox.has(this.nextIn)) return;
        const msg = this.inbox.get(this.nextIn);
        this.inbox.delete(this.nextIn);
        this.nextIn++;
        const w = this.waiter;
        this.waiter = null;
        if (msg.k !== w.kind) {
            console.error('[pvp] out of sync: expected', w.kind, 'got', msg);
            this.abort('The two games got out of sync.');
            w.reject(new GameOverSignal());
            return;
        }
        w.resolve(msg);
    },

    _rejectWaiter() {
        const w = this.waiter;
        this.waiter = null;
        if (w) w.reject(new GameOverSignal());
    },

    /** Waits for the other device's next message, which must be of `kind`. */
    take(kind, checkHash = true) {
        return new Promise((resolve, reject) => {
            if (!this.active || isGameOver()) { reject(new GameOverSignal()); return; }
            this.waiter = {
                kind,
                resolve: msg => {
                    if (checkHash && msg.h && msg.h !== this.stateHash()) {
                        console.error('[pvp] board mismatch at', kind, msg);
                        this.abort('The two games got out of sync.');
                        reject(new GameOverSignal());
                        return;
                    }
                    let d;
                    try { d = JSON.parse(msg.d); } catch (e) { d = null; }
                    resolve(d);
                },
                reject
            };
            this._pump();
        });
    },

    async takeAction(checkHash = true) {
        const a = await this.take('a', checkHash);
        if (!a || typeof a.t !== 'string') {
            this.abort('The two games got out of sync.');
            throw new GameOverSignal();
        }
        return a;
    },

    async takeChoice() {
        const c = await this.take('c');
        return c ? c.v : null;
    },

    /**
     * Sends an action the player is about to take. False means it must not
     * happen: it isn't their turn, or their time ran out.
     */
    sendAction(action) {
        if (!this.active || isGameOver()) return false;
        if (gameState.phase !== 'playing' || gameState.currentTurn !== 'player') return false;
        if (this.timedOut && action.t !== 'end') {
            Log.warn("Time's up for this turn.");
            return false;
        }
        this._send('a', action, true);
        return true;
    },

    sendChoice(value) {
        if (!this.active || isGameOver()) return;
        this._send('c', { v: value === undefined ? null : value }, true);
    },

    /**
     * Runs one of the player's prompts. A choice asked during the other
     * player's turn (a new active creature, say) gets its own short clock, so
     * nobody is left waiting on a player who walked away.
     */
    async localChoice(ask) {
        const ownTurn = gameState.phase === 'playing' && gameState.currentTurn === 'player';
        const timer = ownTurn ? null : setTimeout(() => Prompt.autoResolve(), PVP_CHOICE_SECONDS * 1000);
        try {
            return await ask();
        } finally {
            clearTimeout(timer);
        }
    },

    /** Things that end the game at once, whatever the engine is waiting for. */
    _control(d) {
        if (isGameOver()) return;
        if (d.t === 'forfeit') {
            endGame('player', `${this.opponentName} left the game.`);
            this._rejectWaiter();
        } else if (d.t === 'claim') {
            endGame('opponent', `${this.opponentName} didn't hear from your device for too long.`);
            this._rejectWaiter();
        } else if (d.t === 'abort') {
            this.abort(`${this.opponentName}'s game stopped: ${d.reason || 'connection problem'}.`, { tell: false });
        }
    },

    // -----------------------------------------------------------------------
    // Setup and turns
    // -----------------------------------------------------------------------

    /** Ready pressed: send this setup, wait for theirs, then start. */
    async localReady() {
        const s = gameState.player;
        const opening = this.openingHand;
        this._send('a', {
            t: 'setup',
            a: opening.indexOf(s.active),
            b: s.bench.map(c => (c ? opening.indexOf(c) : -1))
        }, false);
        Render.all();
        if (!gameState.setupReady.opponent) {
            Log.write(`Waiting for ${this.opponentName} to be ready…`, { kind: 'info', icon: '⏳' });
        }
        const theirs = await this.takeAction(false);
        if (theirs.t !== 'setup' || !this.applySetup('opponent', theirs)) {
            this.abort('The two games got out of sync.');
            throw new GameOverSignal();
        }
        Log.write(`${this.opponentName} is ready.`, { kind: 'info', icon: '✅' });
        await startGame();
    },

    /** Places the other player's opening creatures, by position in their opening hand. */
    applySetup(side, a) {
        const s = gameState[side];
        const opening = s.hand.slice();
        const pick = i => (Number.isInteger(i) && i >= 0 && opening[i] && opening[i].data.stage === 'Stage 1' ? opening[i] : null);
        const active = pick(a.a);
        if (!active) return false;
        const bench = s.bench.map((_, i) => pick((a.b || [])[i]));
        const used = new Set([active, ...bench].filter(Boolean));
        if (used.size !== 1 + bench.filter(Boolean).length) return false;
        s.active = active;
        s.bench = bench;
        s.hand = opening.filter(c => !used.has(c));
        gameState.setupReady[side] = true;
        return true;
    },

    /** Called by beginTurn: starts the turn clock. */
    onTurnStart(side) {
        this.turnSide = side;
        this.turnKey = gameState.turnNumber;
        this.turnStartedAt = Date.now();
        this.deadline = this.turnStartedAt + PVP_TURN_SECONDS * 1000;
        this.timedOut = false;
        this._ending = false;
        this.renderClock();
    },

    /** The other player's turn: replay their actions as they arrive. */
    async runRemoteTurn(side) {
        const turn = gameState.turnNumber;
        while (this.active && !isGameOver() && gameState.currentTurn === side && gameState.turnNumber === turn) {
            const a = await this.takeAction();
            await this.applyRemote(side, a);
            assertRunning();
            Render.all();
        }
    },

    _spot(side, loc, idx) {
        const s = gameState[side];
        const card = loc === 'active' ? s.active : (loc === 'bench' ? s.bench[idx] : null);
        return card ? { side, location: loc === 'active' ? 'active' : 'bench', index: loc === 'active' ? null : idx, card } : null;
    },

    /**
     * One of the other player's actions, through the same calls the player's
     * own buttons make (interaction.js), in the same order.
     */
    async applyRemote(side, a) {
        const s = gameState[side];
        switch (a.t) {
            case 'bench':
                await playCreatureToBench(side, a.h, a.slot);
                break;
            case 'evolve':
                await evolveCreature(side, a.h, a.loc, a.loc === 'active' ? null : a.idx);
                break;
            case 'energy': {
                const spot = this._spot(side, a.loc, a.idx);
                if (spot) await attachTurnEnergy(side, spot.card);
                break;
            }
            case 'retreat':
                await performRetreat(side, a.idx);
                break;
            case 'item': {
                const card = s.hand[a.h];
                if (card) {
                    await ItemRegistry.use(card, side, a.h);
                    await resolveKnockouts();
                }
                break;
            }
            case 'accessory': {
                const card = s.hand[a.h];
                const target = this._spot(side, a.loc, a.idx);
                if (card && target) await AccessoryRegistry.attach(card, side, target);
                break;
            }
            case 'useAcc': {
                const spot = this._spot(side, a.loc, a.idx);
                if (spot) {
                    await AccessoryRegistry.activate(spot.card, side);
                    await resolveKnockouts();
                }
                break;
            }
            case 'ability': {
                const spot = this._spot(side, a.loc, a.idx);
                if (spot) {
                    await AbilityRegistry.use(spot.card, side, spot.location, spot.index);
                    await resolveKnockouts();
                }
                break;
            }
            case 'attack':
                await resolveAttack(side, a.n);
                break;
            case 'end':
                if (a.timeout) Log.write(`⏱ ${this.opponentName} ran out of time.`, { kind: 'info', icon: '⏱' });
                await resolveKnockouts();
                await endTurn();
                break;
            default:
                this.abort('The two games got out of sync.');
                throw new GameOverSignal();
        }
    },

    // -----------------------------------------------------------------------
    // The clock
    // -----------------------------------------------------------------------

    tick() {
        if (!this.active) return;
        const now = Date.now();
        this.renderClock();

        // This device lost its connection for too long.
        if (this.offlineSince && now - this.offlineSince > PVP_LOST_SECONDS * 1000) {
            this.abort('Your device lost its connection to the online service.');
            return;
        }
        if (isGameOver()) return;

        // The other player's device went away and hasn't come back.
        if (this.awaySince && now - this.awaySince > PVP_ABANDON_SECONDS * 1000) {
            this.winBy(`${this.opponentName} left or lost their connection.`);
            return;
        }

        if (gameState.phase === 'setup') {
            if (!gameState.setupReady.player && now >= this.setupDeadline) this._setupTimeout();
            // Their setup clock would have placed for them long ago.
            else if (gameState.setupReady.player && now - Math.max(this.setupDeadline, this.lastHeard) > PVP_SILENCE_SECONDS * 1000) {
                this.winBy(`${this.opponentName} stopped responding.`);
            }
            return;
        }
        if (gameState.phase !== 'playing' || this.turnKey !== gameState.turnNumber) return;

        if (gameState.currentTurn === 'player') {
            if (!this.timedOut && now >= this.deadline) {
                this.timedOut = true;
                Log.write("⏱ Time's up: your turn ends.", { kind: 'info', icon: '⏱' });
                if (typeof Hub !== 'undefined' && Hub.dismissDialog) Hub.dismissDialog();
            }
            if (this.timedOut) {
                // Answer whatever is open, then end the turn once nothing is running.
                if (Prompt.isOpen) Prompt.autoResolve();
                else if (!gameState.busy) this._forceEnd();
            }
        } else if (now - Math.max(this.turnStartedAt, this.lastHeard) > PVP_SILENCE_SECONDS * 1000) {
            this.winBy(`${this.opponentName} stopped responding.`);
        }
    },

    _forceEnd() {
        if (this._ending || gameState.busy || gameState.currentTurn !== 'player' || gameState.phase !== 'playing') return;
        this._ending = true;
        if (typeof clearSelection === 'function') clearSelection();
        if (!this.sendAction({ t: 'end', timeout: true })) { this._ending = false; return; }
        playerEndTurn().catch(err => console.error(err));
    },

    /** Setup clock ran out: place creatures for the player and press Ready. */
    _setupTimeout() {
        if (this._setupAuto || gameState.busy) return;
        this._setupAuto = true;
        Prompt.cancelAll();
        if (typeof Hub !== 'undefined' && Hub.dismissDialog) Hub.dismissDialog();
        if (!gameState.player.active) {
            aiSetup('player');
            gameState.setupReady.player = false;
        }
        Log.write("⏱ Time's up: your creatures were placed for you.", { kind: 'info', icon: '⏱' });
        onEndTurnButton();
    },

    renderClock() {
        const el = document.getElementById('pvp-clock');
        if (!el) return;
        if (!this.active || isGameOver() || gameState.phase === 'deckSelection') {
            el.textContent = '';
            el.classList.remove('pvp-clock-show', 'pvp-clock-low');
            return;
        }
        const now = Date.now();
        let text, left;
        if (this.offlineSince) {
            text = '📡 Reconnecting…';
        } else if (gameState.phase === 'setup') {
            left = Math.max(0, Math.ceil((this.setupDeadline - now) / 1000));
            text = gameState.setupReady.player ? `⏳ Waiting for ${this.opponentName}` : `⏱ Setup ${left}s`;
            if (gameState.setupReady.player) left = null;
        } else if (this.turnKey === gameState.turnNumber) {
            left = Math.max(0, Math.ceil((this.deadline - now) / 1000));
            text = gameState.currentTurn === 'player' ? `⏱ ${left}s` : `⏱ ${this.opponentName}: ${left}s`;
        } else {
            text = '';
        }
        el.textContent = text;
        el.classList.toggle('pvp-clock-show', !!text);
        el.classList.toggle('pvp-clock-low', typeof left === 'number' && left <= 10);
    },

    // -----------------------------------------------------------------------
    // Connection events (from the transport)
    // -----------------------------------------------------------------------

    onConnection(on) {
        if (!this.active) return;
        this.offlineSince = on ? null : (this.offlineSince || Date.now());
    },

    onOpponentPresence(present) {
        if (!this.active) return;
        this.awaySince = present ? null : (this.awaySince || Date.now());
    },

    // -----------------------------------------------------------------------
    // Ending
    // -----------------------------------------------------------------------

    /** The game ended (normally or not): stop the clock. */
    onGameOver() {
        if (this._tick) { clearInterval(this._tick); this._tick = null; }
        this.renderClock();
    },

    /** The other player is gone: this player wins. */
    winBy(reason) {
        if (!this.active || isGameOver()) return;
        this._send('x', { t: 'claim' }, false);
        endGame('player', reason);
        this._rejectWaiter();
    },

    /** "Leave game": the other player wins at once. Profile records the loss. */
    forfeit() {
        if (!this.active) return;
        this._send('x', { t: 'forfeit' }, false);
        this._rejectWaiter();
    },

    /** The game can't go on (out of sync, connection lost): no result for anyone. */
    abort(reason, { tell = true } = {}) {
        if (!this.active || isGameOver()) return;
        if (tell) this._send('x', { t: 'abort', reason: 'connection problem' }, false);
        gameState.phase = 'gameOver';
        Prompt.cancelAll();
        if (typeof Profile !== 'undefined' && Profile.cancelMatch) Profile.cancelMatch();
        this.onGameOver();
        Log.write(`Game stopped. ${reason}`, { kind: 'info', icon: '⚠️' });
        Render.all();
        Screens.showGameOver('tie', 'Game stopped', reason,
            { type: 'none', message: "This online game doesn't count: no win, loss or credit for either player." });
        this._rejectWaiter();
    },

    /** Back to normal (AI) play: called when the player returns to the menu. */
    cleanup() {
        if (this._tick) { clearInterval(this._tick); this._tick = null; }
        this._rejectWaiter();
        if (this.transport) {
            try { this.transport.close({ removeRoom: this.role === 'host' }); } catch (e) { console.warn(e); }
        }
        this.transport = null;
        if (SIDES[0] !== 'player') SIDES.reverse();
        if (this.active) Rng.reset();
        SideNames.opponent = null;
        DeckLibrary.clearPvpDeck();
        const nameEl = document.querySelector('.hud-side[data-player="opponent"] .hud-name');
        if (nameEl) nameEl.textContent = 'Opponent';
        this.active = false;
        this.role = null;
        this.inbox = new Map();
        this.openingHand = [];
        this.turnKey = null;
        this.renderClock();
    }
};

// ---------------------------------------------------------------------------
// The lobby: pick a deck, then make a room or join one by its code
// ---------------------------------------------------------------------------

const PvPLobby = {
    busy: false,                 // connecting, waiting in a room, or joining
    state: 'idle',
    message: '',
    code: '',
    roomRef: null,
    _offs: [],
    _session: 0,

    init() {
        const btn = document.getElementById('pvp-btn');
        if (btn) btn.addEventListener('click', () => this.open());
        const close = document.getElementById('pvp-close');
        if (close) close.addEventListener('click', () => this.close());
    },

    name() {
        try { return localStorage.getItem(PVP_NAME_KEY) || 'Player'; } catch (e) { return 'Player'; }
    },

    setName(value) {
        const clean = String(value || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16) || 'Player';
        try { localStorage.setItem(PVP_NAME_KEY, clean); } catch (e) { /* keeps the default */ }
        return clean;
    },

    /** The player's decks that can be played right now. */
    decks() {
        DeckLibrary.load();
        return DeckLibrary.playerDecks().filter(d => !Screens._deckProblem(d));
    },

    async open() {
        if (PvP.active) return;
        Screens.openModal('pvp-modal');
        if (this.state === 'hosting' || this.state === 'joining' || this.state === 'connecting') { this.render(); return; }
        this.state = 'connecting';
        this.render();
        const session = ++this._session;
        this.busy = true;
        const result = await PvPNet.connect();
        if (session !== this._session) return;
        this.busy = false;
        if (!result.ok) {
            this.state = 'error';
            this.message = result.reason === 'setup'
                ? "Online play isn't switched on for this game's server yet. (The database needs a rule for tcgPvp.)"
                : result.reason === 'offline'
                    ? "You're offline. Connect to the internet to play online."
                    : "Online play isn't available right now. The free online service may be at its limit " +
                      '(it allows 100 players at once and a monthly amount of data). Please try again later.';
        } else {
            this.state = 'menu';
            this.message = '';
        }
        this.render();
    },

    close() {
        this._session++;
        this._stopWatching();
        if (this.state === 'hosting' && this.roomRef) {
            this.roomRef.onDisconnect().cancel().catch(() => {});
            this.roomRef.remove().catch(() => {});
        } else if (this.state === 'waiting-seed' && this.roomRef) {
            this.roomRef.child('guest').remove().catch(() => {});
        }
        this.roomRef = null;
        this.busy = false;
        this.state = 'idle';
        Screens.closeModal('pvp-modal');
        PvPNet.disconnectSoon(2000);
    },

    _stopWatching() {
        for (const off of this._offs) off();
        this._offs = [];
    },

    _watch(ref, event, cb) {
        ref.on(event, cb);
        this._offs.push(() => ref.off(event, cb));
    },

    /** This player's details as the other device needs them. */
    _info(deck) {
        return {
            name: this.setName(document.getElementById('pvp-name') ? document.getElementById('pvp-name').value : this.name()),
            v: PvP.version(),
            deck: JSON.stringify({ name: deck.name, cards: deck.cards, energyTypes: deck.energyTypes, fullArt: deck.fullArt || {} })
        };
    },

    _chosenDeck() {
        const select = document.getElementById('pvp-deck');
        const name = select ? select.value : '';
        const deck = this.decks().find(d => d.name === name);
        if (deck) { try { localStorage.setItem(PVP_DECK_KEY, deck.name); } catch (e) { /* fine */ } }
        return deck || null;
    },

    _theirDeckOk(info) {
        try {
            const deck = JSON.parse(info.deck);
            return Array.isArray(deck.cards) && validateDeck(deck.cards).valid;
        } catch (e) {
            return false;
        }
    },

    async create() {
        const deck = this._chosenDeck();
        if (!deck) return;
        if (!(await Screens._confirmNoWinCredit())) return;
        const info = this._info(deck);
        const session = ++this._session;
        this.state = 'creating';
        this.busy = true;
        this.render();
        let room;
        try {
            room = await PvPNet.createRoom(info);
        } catch (err) {
            console.warn('[pvp] create failed', err);
            if (session !== this._session) return;
            this._fail(pvpIsPermissionError(err) ? 'setup' : 'unavailable');
            return;
        }
        if (session !== this._session) { room.ref.remove().catch(() => {}); return; }
        this.code = room.code;
        this.roomRef = room.ref;
        this.state = 'hosting';
        this.render();

        this._watch(room.ref.child('guest'), 'value', snap => {
            const guest = snap.val();
            if (!guest || session !== this._session || this.state !== 'hosting') return;
            if (guest.v !== PvP.version() || !this._theirDeckOk(guest)) {
                // A guest on another version: free the seat for someone else.
                room.ref.child('guest').remove().catch(() => {});
                return;
            }
            const seed = (Math.floor(Math.random() * 4294967295) >>> 0) || 1;
            this.state = 'starting';
            this.render();
            room.ref.onDisconnect().cancel()
                .then(() => room.ref.update({ seed, status: 'playing' }))
                .then(() => {
                    if (session !== this._session) return;
                    this._start('host', seed, deck.name, guest, room.ref);
                })
                .catch(err => { console.warn(err); this._fail('unavailable'); });
        });
    },

    async join() {
        const deck = this._chosenDeck();
        const input = document.getElementById('pvp-code');
        const code = String(input ? input.value : '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        if (!deck) return;
        if (code.length !== 4) {
            this.message = 'Enter the 4-letter room code.';
            this.render();
            return;
        }
        if (!(await Screens._confirmNoWinCredit())) return;
        const info = this._info(deck);
        const session = ++this._session;
        this.state = 'joining';
        this.busy = true;
        this.message = '';
        this.render();
        let joined;
        try {
            joined = await PvPNet.joinRoom(code, info);
        } catch (err) {
            console.warn('[pvp] join failed', err);
            if (session !== this._session) return;
            this._fail(pvpIsPermissionError(err) ? 'setup' : 'unavailable');
            return;
        }
        if (session !== this._session) return;
        if (joined.error) {
            this.state = 'menu';
            this.busy = false;
            this.message = joined.error;
            this.render();
            return;
        }
        if (!this._theirDeckOk(joined.room.host)) {
            joined.ref.child('guest').remove().catch(() => {});
            this.state = 'menu';
            this.busy = false;
            this.message = "The other player's deck couldn't be read. Ask them to pick another deck.";
            this.render();
            return;
        }
        this.code = code;
        this.roomRef = joined.ref;
        this.state = 'waiting-seed';
        this.render();
        // Leaving before the host starts frees the seat.
        joined.ref.child('guest').onDisconnect().remove();
        this._watch(joined.ref.child('seed'), 'value', snap => {
            const seed = snap.val();
            if (!seed || session !== this._session || this.state !== 'waiting-seed') return;
            joined.ref.child('guest').onDisconnect().cancel().catch(() => {});
            this._start('guest', seed, deck.name, joined.room.host, joined.ref);
        });
        // The host left before starting: the room is gone.
        this._watch(joined.ref.child('host'), 'value', snap => {
            if (snap.val() || session !== this._session || this.state !== 'waiting-seed') return;
            this._stopWatching();
            this.state = 'menu';
            this.busy = false;
            this.message = 'The other player closed the room.';
            this.render();
        });
    },

    _start(role, seed, deckName, theirs, ref) {
        this._stopWatching();
        this.state = 'idle';
        this.busy = false;
        this.roomRef = null;
        Screens.closeModal('pvp-modal');
        PvP.begin({ role, seed, deckName, theirs, transport: PvPNet.gameTransport(ref, role) });
    },

    _fail(reason) {
        this._stopWatching();
        this.busy = false;
        this.state = 'error';
        this.message = reason === 'setup'
            ? "Online play isn't switched on for this game's server yet. (The database needs a rule for tcgPvp.)"
            : "Online play isn't available right now. The free online service may be at its limit. Please try again later.";
        this.render();
    },

    render() {
        const body = document.getElementById('pvp-body');
        if (!body) return;
        body.innerHTML = '';
        const note = text => h('p', { class: 'pvp-note', text });

        if (this.state === 'connecting' || this.state === 'creating' || this.state === 'joining') {
            body.appendChild(note(this.state === 'connecting' ? 'Connecting to the online service…'
                : this.state === 'creating' ? 'Making a room…' : 'Joining the room…'));
            return;
        }
        if (this.state === 'error') {
            body.appendChild(h('p', { class: 'pvp-error', text: `⚠️ ${this.message}` }));
            body.appendChild(h('div', { class: 'modal-foot' },
                h('button', { class: 'btn btn-ghost', type: 'button', text: 'Close', on: { click: () => this.close() } }),
                h('button', { class: 'btn btn-primary', type: 'button', text: 'Try again', on: { click: () => { this.state = 'idle'; this.open(); } } })));
            return;
        }
        if (this.state === 'hosting') {
            body.appendChild(note('Your room code:'));
            body.appendChild(h('div', { class: 'pvp-code', text: this.code }));
            body.appendChild(note('Tell the other player this code. The game starts as soon as they join.'));
            body.appendChild(h('div', { class: 'modal-foot' },
                h('button', { class: 'btn btn-ghost', type: 'button', text: 'Cancel', on: { click: () => this.close() } })));
            return;
        }
        if (this.state === 'waiting-seed' || this.state === 'starting') {
            body.appendChild(note('Found the other player. Starting…'));
            return;
        }

        // Menu
        const decks = this.decks();
        body.appendChild(note(`Play a friend on another device. Each turn has ${PVP_TURN_SECONDS} seconds. ` +
            `A win pays 1 credit like a win against the AI (shared limit of ${WIN_CREDITS_PER_DAY} a day). Leaving counts as a loss.`));
        if (this.message) body.appendChild(h('p', { class: 'pvp-error', text: this.message }));

        const nameInput = h('input', { id: 'pvp-name', class: 'text-input', type: 'text', maxlength: '16', autocomplete: 'off' });
        nameInput.value = this.name();
        body.appendChild(h('label', { class: 'pvp-field' }, h('span', { text: 'Your name' }), nameInput));

        if (!decks.length) {
            body.appendChild(h('p', { class: 'pvp-error', text: 'You need a playable deck first. Build one on the Play page.' }));
            return;
        }
        const select = h('select', { id: 'pvp-deck', class: 'select-input' });
        let saved = '';
        try { saved = localStorage.getItem(PVP_DECK_KEY) || ''; } catch (e) { /* none */ }
        for (const d of decks) select.appendChild(h('option', { value: d.name, text: d.name }));
        if (decks.some(d => d.name === saved)) select.value = saved;
        body.appendChild(h('label', { class: 'pvp-field' }, h('span', { text: 'Your deck' }), select));

        body.appendChild(h('div', { class: 'pvp-actions' },
            h('button', { class: 'btn btn-primary', type: 'button', text: '➕ Make a room', on: { click: () => this.create() } })));

        const code = h('input', { id: 'pvp-code', class: 'text-input pvp-code-input', type: 'text', maxlength: '4',
            placeholder: 'CODE', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': 'Room code' });
        body.appendChild(h('div', { class: 'pvp-join' },
            code,
            h('button', { class: 'btn btn-primary', type: 'button', text: '🔗 Join', on: { click: () => this.join() } })));
        body.appendChild(h('p', { class: 'pvp-fine', text:
            'Both devices run the game, so this is meant for playing people you know.' }));
    }
};

document.addEventListener('DOMContentLoaded', () => PvPLobby.init());
if (document.readyState !== 'loading') PvPLobby.init();
