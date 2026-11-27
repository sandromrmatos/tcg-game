// ============================================================================
// TRADING CARDS WITH ANOTHER PLAYER
//
// Like online play (pvp.js) and on the same Firebase connection: one player
// makes a room and gets a 4-letter code, the other joins with it. Each picks a
// card to give; both see the card they give and the card they get; when both
// confirm the same pair, the trade happens on both devices.
//
// Rules (Profile.tradeProblem): it costs each player 5 credits and 2 gems, a
// player trades once a day, a card can only be given with at least 3 normal
// copies owned, both cards are the same rarity, and nobody receives a card
// from a set they haven't unlocked.
//
// Room data, under tcgPvp/trades/{CODE}:
//   { createdAt, v, status: 'open' | 'done', pair,
//     host:  { name, sets: [setId], offer: cardId|null, ok: pair|null, applied },
//     guest: { ...the same } }
// A confirmation is the pair it confirms ("hostCard>guestCard"), so changing
// either card cancels both confirmations by itself. The host then moves the
// room to 'done' with a transaction, and each device applies the trade once
// when it sees 'done'. Both devices are trusted, as in online play.
// ============================================================================

const TRADE_PROTOCOL = 1;

const TradeLobby = {
    busy: false,                 // connected and in the trade window
    state: 'idle',               // idle | connecting | error | menu | creating | hosting | joining | trading | done
    message: '',
    role: null,                  // 'host' | 'guest'
    code: '',
    ref: null,
    room: null,                  // last snapshot of the room
    result: null,                // what happened, for the done screen
    _applied: false,
    _offs: [],
    _session: 0,
    _version: null,

    init() {
        const close = document.getElementById('trade-close');
        if (close) close.addEventListener('click', () => this.close());
    },

    /** Both devices must agree on the cards and their rarities. */
    version() {
        if (!this._version) {
            const cards = cardDatabase.map(c => [c.id, c.rarity, c.set]);
            this._version = `t${TRADE_PROTOCOL}-${pvpHash(JSON.stringify(cards))}`;
        }
        return this._version;
    },

    other() {
        return this.role === 'host' ? 'guest' : 'host';
    },

    mine() {
        return (this.room && this.room[this.role]) || null;
    },

    theirs() {
        return (this.room && this.room[this.other()]) || null;
    },

    /** The pair both sides confirm: "hostCard>guestCard". */
    pair(room = this.room) {
        if (!room || !room.host || !room.guest || !room.host.offer || !room.guest.offer) return null;
        return `${room.host.offer}>${room.guest.offer}`;
    },

    // -----------------------------------------------------------------------
    // Opening and closing
    // -----------------------------------------------------------------------

    async open() {
        if (typeof PvP !== 'undefined' && PvP.active) return;
        if (this.busy) { Screens.openModal('trade-modal'); this.render(); return; }
        const st = Profile.tradeStatus();
        if (!st.canTrade) {
            Hub.alert('🔄 Trading', st.reasons.join(' '));
            return;
        }
        Screens.openModal('trade-modal');
        this.state = 'connecting';
        this.message = '';
        this.result = null;
        this.render();
        const session = ++this._session;
        this.busy = true;
        const res = await PvPNet.connect();
        if (session !== this._session) return;
        if (!res.ok) {
            this.busy = false;
            this._fail(res.reason);
            return;
        }
        this.state = 'menu';
        this.render();
    },

    close() {
        this._session++;
        this._stopWatching();
        if (this.ref) {
            const ref = this.ref;
            if (this.role === 'host') {
                ref.onDisconnect().cancel().catch(() => {});
                // A finished room is kept a moment so the other device sees 'done'.
                setTimeout(() => ref.remove().catch(() => {}), this.state === 'done' ? 5000 : 0);
            } else {
                ref.child('guest').onDisconnect().cancel().catch(() => {});
                if (this.state !== 'done') ref.child('guest').remove().catch(() => {});
            }
        }
        this.ref = null;
        this.room = null;
        this.role = null;
        this.busy = false;
        this.state = 'idle';
        Screens.closeModal('trade-modal');
        PvPNet.disconnectSoon(2000);
        if (typeof Hub !== 'undefined' && Hub.page === 'trade') Hub.renderTrade();
    },

    _stopWatching() {
        for (const off of this._offs) off();
        this._offs = [];
    },

    _fail(reason) {
        this._stopWatching();
        this.state = 'error';
        this.message = reason === 'setup'
            ? "Trading isn't switched on for this game's server yet. (The database needs a rule for tcgPvp/trades.)"
            : reason === 'offline'
                ? "You're offline. Connect to the internet to trade."
                : "Trading isn't available right now. The free online service may be at its limit. Please try again later.";
        this.render();
    },

    _info() {
        const name = PvPLobby.setName(document.getElementById('trade-name') ? document.getElementById('trade-name').value : PvPLobby.name());
        return { name, sets: Profile.unlockedSets().map(s => s.id), offer: null, ok: null, applied: false };
    },

    // -----------------------------------------------------------------------
    // Rooms
    // -----------------------------------------------------------------------

    async create() {
        const info = this._info();
        const session = ++this._session;
        this.state = 'creating';
        this.render();
        try {
            for (let attempt = 0; attempt < 6; attempt++) {
                let code = '';
                for (let i = 0; i < 4; i++) code += PVP_CODE_LETTERS[Math.floor(Math.random() * PVP_CODE_LETTERS.length)];
                const ref = PvPNet.root.child('trades').child(code);
                const res = await pvpWithTimeout(ref.transaction(cur => (cur === null
                    ? { createdAt: Date.now(), v: this.version(), status: 'open', host: info } : undefined)), 10000);
                if (!res.committed) continue;
                if (session !== this._session) { ref.remove().catch(() => {}); return; }
                ref.onDisconnect().remove();
                this._prune();
                this.role = 'host';
                this.code = code;
                this.ref = ref;
                this.state = 'hosting';
                this._listen();
                this.render();
                return;
            }
            throw new Error('No free room code');
        } catch (err) {
            console.warn('[trade] create failed', err);
            if (session === this._session) this._fail(pvpIsPermissionError(err) ? 'setup' : 'unavailable');
        }
    },

    async join() {
        const input = document.getElementById('trade-code');
        const code = String(input ? input.value : '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        if (code.length !== 4) { this.message = 'Enter the 4-letter room code.'; this.render(); return; }
        const info = this._info();
        const session = ++this._session;
        this.state = 'joining';
        this.message = '';
        this.render();
        try {
            const ref = PvPNet.root.child('trades').child(code);
            const snap = await pvpWithTimeout(ref.once('value'), 10000);
            const room = snap.val();
            if (session !== this._session) return;
            let error = null;
            if (!room || !room.host) error = `There's no trade room with the code ${code}. Check the code and try again.`;
            else if (room.v !== this.version()) error = 'The other player has a different version of the game. Both of you reload the page, then try again.';
            else if (room.guest || room.status !== 'open') error = 'That trade room already has two players.';
            if (!error) {
                const res = await pvpWithTimeout(ref.child('guest').transaction(cur => (cur === null ? info : undefined)), 10000);
                if (!res.committed) error = 'That trade room already has two players.';
            }
            if (error) { this.state = 'menu'; this.message = error; this.render(); return; }
            ref.child('guest').onDisconnect().remove();
            this.role = 'guest';
            this.code = code;
            this.ref = ref;
            this.state = 'trading';
            this._listen();
            this.render();
        } catch (err) {
            console.warn('[trade] join failed', err);
            if (session === this._session) this._fail(pvpIsPermissionError(err) ? 'setup' : 'unavailable');
        }
    },

    _prune() {
        try {
            PvPNet.root.child('trades').orderByChild('createdAt').endAt(Date.now() - 86400000).limitToFirst(25)
                .once('value', snap => snap.forEach(child => { child.ref.remove().catch(() => {}); })).catch(() => {});
        } catch (e) { /* not important */ }
    },

    _listen() {
        const ref = this.ref;
        const session = this._session;
        const cb = snap => { if (session === this._session) this._onRoom(snap.val()); };
        ref.on('value', cb);
        this._offs.push(() => ref.off('value', cb));
    },

    // -----------------------------------------------------------------------
    // The trade itself
    // -----------------------------------------------------------------------

    _onRoom(room) {
        const before = this.room;
        this.room = room;
        if (this.state === 'done') return;
        if (!room || !room.host) {
            this._left(before && before.host ? before.host.name : 'The other player');
            return;
        }
        if (this.role === 'host' && this.state === 'hosting' && room.guest) this.state = 'trading';
        if (this.role === 'host' && this.state === 'trading' && !room.guest) {
            this._left(before && before.guest ? before.guest.name : 'The other player');
            return;
        }

        // Both confirmed the same pair: the host closes the deal for both.
        const pair = this.pair(room);
        if (this.role === 'host' && room.status === 'open' && pair && room.host.ok === pair && room.guest.ok === pair) {
            this.ref.transaction(cur => {
                if (!cur || cur.status !== 'open' || !cur.host || !cur.guest) return undefined;
                const p = this.pair(cur);
                if (!p || cur.host.ok !== p || cur.guest.ok !== p) return undefined;
                cur.status = 'done';
                cur.pair = p;
                return cur;
            }).catch(err => console.warn('[trade] commit failed', err));
        }
        if (room.status === 'done' && room.pair && !this._applied) {
            this._apply(room);
            return;
        }
        this.render();
    },

    _left(name) {
        this._stopWatching();
        this.state = 'menu';
        if (this.ref && this.role === 'host') this.ref.remove().catch(() => {});
        this.ref = null;
        this.room = null;
        this.role = null;
        this.message = `${name} left the trade. Nothing was traded.`;
        this.render();
    },

    /** The room says 'done': this device gives its card and takes the other one, once. */
    _apply(room) {
        this._applied = true;
        const [hostCard, guestCard] = room.pair.split('>');
        const give = this.role === 'host' ? hostCard : guestCard;
        const receive = this.role === 'host' ? guestCard : hostCard;
        const theirs = room[this.other()] || {};
        const res = Profile.applyTrade(give, receive, Array.isArray(theirs.sets) ? theirs.sets : null);
        this.result = res.error
            ? { ok: false, text: `The trade couldn't be completed on this device: ${res.error}` }
            : { ok: true, give, receive, isNew: res.isNew, quantity: res.quantity, unlocked: res.unlocked, name: theirs.name };
        if (this.ref) this.ref.child(this.role).child('applied').set(!res.error).catch(() => {});
        this.state = 'done';
        this._stopWatching();
        this.render();
        if (typeof Hub !== 'undefined' && Hub.page === 'trade') Hub.renderTrade();
    },

    /** Picks (or changes) the card this player offers. Clears any confirmation. */
    offer(cardId) {
        if (!this.ref || this.state !== 'trading') return;
        this.ref.child(this.role).update({ offer: cardId, ok: null }).catch(() => {});
    },

    confirm() {
        const mine = this.mine(), theirs = this.theirs();
        if (!mine || !theirs) return;
        const problem = Profile.tradeProblem(mine.offer, theirs.offer, theirs.sets);
        if (problem) { this.message = problem; this.render(); return; }
        const theirCard = getCardData(theirs.offer);
        if (!theirCard || !Profile.isSetUnlocked(theirCard.set)) return;
        this.message = '';
        this.ref.child(this.role).update({ ok: this.pair() }).catch(() => {});
    },

    unconfirm() {
        if (this.ref) this.ref.child(this.role).update({ ok: null }).catch(() => {});
    },

    // -----------------------------------------------------------------------
    // Drawing
    // -----------------------------------------------------------------------

    _cardTile(cardId, caption, extraClass = '') {
        const card = getCardData(cardId);
        if (!card) return h('div', { class: `trade-slot trade-empty ${extraClass}`, text: caption });
        const rarity = Collection.rarity(card.rarity);
        const img = h('img', { src: cardImage(card.id), alt: card.name, loading: 'lazy' });
        if (typeof CardZoom !== 'undefined') CardZoom.bind(img, card.id);
        return h('div', { class: `trade-slot ${extraClass}` }, img,
            h('div', { class: 'trade-slot-name', text: card.name }),
            h('div', { class: 'trade-slot-meta', style: { color: rarity.color }, text: `${rarity.icon} ${rarity.name} · ${setById(card.set).name}` }));
    },

    render() {
        const body = document.getElementById('trade-body');
        if (!body) return;
        const grid = body.querySelector('.trade-grid');
        const scroll = grid ? grid.scrollTop : 0;
        body.innerHTML = '';
        const note = text => h('p', { class: 'pvp-note', text });
        const foot = (...buttons) => h('div', { class: 'modal-foot' }, ...buttons);
        const btn = (text, onClick, kind = 'ghost', disabled = false) =>
            h('button', { class: `btn btn-${kind}`, type: 'button', text, disabled, on: { click: onClick } });

        if (['connecting', 'creating', 'joining'].includes(this.state)) {
            body.appendChild(note(this.state === 'connecting' ? 'Connecting to the online service…'
                : this.state === 'creating' ? 'Making a trade room…' : 'Joining the trade room…'));
            return;
        }
        if (this.state === 'error') {
            body.appendChild(h('p', { class: 'pvp-error', text: `⚠️ ${this.message}` }));
            body.appendChild(foot(btn('Close', () => this.close())));
            return;
        }
        if (this.state === 'done') {
            const r = this.result || {};
            if (r.ok) {
                body.appendChild(h('p', { class: 'trade-done', text: '✅ Trade complete!' }));
                body.appendChild(h('div', { class: 'trade-pair' },
                    this._cardTile(r.give, '', 'trade-gone'),
                    h('div', { class: 'trade-arrow', text: '➜' }),
                    this._cardTile(r.receive, '')));
                body.appendChild(note(`You gave ${getCardData(r.give).name} to ${r.name || 'the other player'} and got ` +
                    `${getCardData(r.receive).name}${r.isNew ? ' (new card!)' : ''}. You now own ${r.quantity}. ` +
                    `Paid ${TRADE_CREDITS} 🪙 and ${TRADE_GEMS} 💜. You can trade again tomorrow.`));
            } else {
                body.appendChild(h('p', { class: 'pvp-error', text: `⚠️ ${r.text || 'The trade did not complete.'}` }));
            }
            body.appendChild(foot(btn('Close', () => this.close(), 'primary')));
            return;
        }
        if (this.state === 'hosting') {
            body.appendChild(note('Your trade room code:'));
            body.appendChild(h('div', { class: 'pvp-code', text: this.code }));
            body.appendChild(note('Tell the other player this code. The trade window opens as soon as they join.'));
            body.appendChild(foot(btn('Cancel', () => this.close())));
            return;
        }
        if (this.state === 'trading') {
            this._renderTrade(body, scroll);
            return;
        }

        // Menu
        body.appendChild(note(`Swap one card for one card with a friend on another device. Each trade costs both players ` +
            `${TRADE_CREDITS} 🪙 and ${TRADE_GEMS} 💜, once a day. You can give a card you own at least ${TRADE_MIN_COPIES} copies of, ` +
            'for one of the same rarity, from a set the other player has unlocked.'));
        if (this.message) body.appendChild(h('p', { class: 'pvp-error', text: this.message }));
        const nameInput = h('input', { id: 'trade-name', class: 'text-input', type: 'text', maxlength: '16', autocomplete: 'off' });
        nameInput.value = PvPLobby.name();
        body.appendChild(h('label', { class: 'pvp-field' }, h('span', { text: 'Your name' }), nameInput));
        body.appendChild(h('div', { class: 'pvp-actions' }, btn('➕ Make a trade room', () => this.create(), 'primary')));
        const code = h('input', { id: 'trade-code', class: 'text-input pvp-code-input', type: 'text', maxlength: '4',
            placeholder: 'CODE', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': 'Trade room code' });
        body.appendChild(h('div', { class: 'pvp-join' }, code, btn('🔗 Join', () => this.join(), 'primary')));
    },

    _renderTrade(body, scroll) {
        const mine = this.mine() || {}, theirs = this.theirs() || {};
        const theirName = String(theirs.name || 'The other player').slice(0, 16);
        const pair = this.pair();
        const theirCard = getCardData(theirs.offer);
        const myCard = getCardData(mine.offer);
        const iConfirmed = !!pair && mine.ok === pair;
        const theyConfirmed = !!pair && theirs.ok === pair;
        const theirSets = Array.isArray(theirs.sets) ? theirs.sets : [];

        body.appendChild(h('p', { class: 'pvp-note', text: `Trading with ${theirName}. Room ${this.code}.` }));
        body.appendChild(h('div', { class: 'trade-pair' },
            h('div', { class: 'trade-side' }, h('h3', { text: 'You give' }),
                this._cardTile(mine.offer, 'Pick a card below')),
            h('div', { class: 'trade-arrow', text: '⇄' }),
            h('div', { class: 'trade-side' }, h('h3', { text: 'You get' }),
                this._cardTile(theirs.offer, `${theirName} hasn't picked a card yet`))));

        // Problems with the current pair, as this device sees them.
        let problem = null;
        if (myCard && theirCard) problem = Profile.tradeProblem(mine.offer, theirs.offer, theirSets);
        if (theirCard && !Profile.isSetUnlocked(theirCard.set)) problem = `You haven't unlocked ${setById(theirCard.set).name}, so you can't receive ${theirCard.name}. Ask ${theirName} to pick another card.`;
        if (problem) body.appendChild(h('p', { class: 'pvp-error', text: problem }));
        if (this.message) body.appendChild(h('p', { class: 'pvp-error', text: this.message }));

        const status = !pair ? 'Both of you pick a card, then confirm.'
            : iConfirmed && theyConfirmed ? 'Both confirmed: trading…'
                : iConfirmed ? `You confirmed. Waiting for ${theirName}…`
                    : theyConfirmed ? `${theirName} confirmed. Confirm to trade.`
                        : 'Check both cards, then confirm.';
        body.appendChild(h('p', { class: 'trade-status', text: status }));

        // My tradable cards: 3+ copies, a set they've unlocked, and once they've picked,
        // their card's rarity and kind (a promo only trades for a promo).
        const fits = c => !theirCard || (c.rarity === theirCard.rarity && !!c.promo === !!theirCard.promo);
        const kind = theirCard ? `${Collection.rarity(theirCard.rarity).name}${theirCard.promo ? ' promo' : ''}` : '';
        const cards = Profile.tradableCards()
            .filter(c => theirSets.includes(c.set) && fits(c))
            .sort((a, b) => a.rarity - b.rarity || cardSets.findIndex(s => s.id === a.set) - cardSets.findIndex(s => s.id === b.set) || a.number - b.number);
        body.appendChild(h('p', { class: 'trade-pick-title', text: theirCard
            ? `Your ${kind} cards with ${TRADE_MIN_COPIES}+ copies:`
            : `Your cards with ${TRADE_MIN_COPIES}+ copies:` }));
        const grid = h('div', { class: 'cards-grid trade-grid' });
        if (!cards.length) {
            grid.appendChild(h('p', { class: 'pvp-note', text: theirCard
                ? `You have no ${kind} card with ${TRADE_MIN_COPIES}+ copies that ${theirName} can receive.`
                : `You have no card with ${TRADE_MIN_COPIES}+ copies that ${theirName} can receive.` }));
        }
        for (const card of cards) {
            grid.appendChild(h('div', {
                class: `card-item ${card.id === mine.offer ? 'trade-picked' : ''}`,
                on: { click: () => this.offer(card.id) }
            },
                h('img', { src: cardImage(card.id), alt: card.name, loading: 'lazy' }),
                h('div', { class: 'card-quantity', text: String(Profile.owned(card.id)) })));
        }
        body.appendChild(grid);
        grid.scrollTop = scroll;

        body.appendChild(h('div', { class: 'modal-foot' },
            h('button', { class: 'btn btn-ghost', type: 'button', text: 'Leave', on: { click: () => this.close() } }),
            iConfirmed
                ? h('button', { class: 'btn btn-ghost', type: 'button', text: 'Undo confirm', on: { click: () => this.unconfirm() } })
                : h('button', {
                    class: 'btn btn-primary', type: 'button', disabled: !pair || !!problem,
                    text: `✅ Confirm (${TRADE_CREDITS} 🪙 + ${TRADE_GEMS} 💜)`, on: { click: () => this.confirm() }
                })));
    }
};

document.addEventListener('DOMContentLoaded', () => TradeLobby.init());
if (document.readyState !== 'loading') TradeLobby.init();
