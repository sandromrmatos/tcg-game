// ============================================================================
// BATTLE SAVE — resuming a game after the page reloads
//
// A real game against the AI (vs AI, raids, daily challenges) is saved in
// Profile.s.battle whenever the player is free to act: when setup starts, and
// after each action on their turn (runExclusive in turn.js). Pressing End Turn
// marks the save, so a reload during the AI's turn replays it from the start.
// Real games use the seeded Rng and its state is saved too, so the replayed
// turn (and every coin to come) comes out the same: reloading can't re-roll.
//
// On the next load Profile.afterLoad keeps the match open when a save is
// there, and the hub offers to resume it. Online games can't be resumed:
// a reload there still counts as a loss.
//
// Card instances are stored once each, by reference ({ $ref }), so the same
// creature in two places (the Guardian flag, an attached accessory) stays one
// object. Their card data is not stored: it is looked up again by id.
// ============================================================================

const BATTLE_SAVE_VERSION = 1;

const BattleSave = {
    /** Can the game on screen be saved now? */
    _enabled() {
        return typeof Profile !== 'undefined' && !!Profile.s && Profile.hasActiveMatch() &&
            !(typeof PvP !== 'undefined' && PvP.active) && !Profile.s.activeMatch.pvp;
    },

    /** Saves the game if the player is free to act (setup, or idle on their turn). */
    save({ endTurn = false } = {}) {
        if (!this._enabled() || gameState.busy) return;
        const idle = gameState.phase === 'setup' ||
            (gameState.phase === 'playing' && gameState.currentTurn === 'player');
        if (!idle) return;
        try {
            Profile.s.battle = this.encode({ endTurn });
            Profile.touch('battle', { immediate: true });
        } catch (err) {
            console.warn('[battle-save] could not save the game', err);
        }
    },

    clear() {
        if (typeof Profile !== 'undefined' && Profile.s && Profile.s.battle) Profile.s.battle = null;
    },

    // -----------------------------------------------------------------------
    // Encoding
    // -----------------------------------------------------------------------

    encode({ endTurn = false } = {}) {
        const table = [];
        const seen = new Map();
        const isInstance = v => v && typeof v === 'object' && v.energyUnits && typeof v.id === 'string' && 'data' in v;
        const enc = v => {
            if (v === null || typeof v !== 'object') return typeof v === 'function' ? undefined : v;
            if (v instanceof Set) return { $set: [...v].map(enc) };
            if (v instanceof Map) return { $map: [...v].map(([k, x]) => [enc(k), enc(x)]) };
            if (Array.isArray(v)) return v.map(enc);
            if (isInstance(v)) {
                if (seen.has(v)) return { $ref: seen.get(v) };
                const n = table.length;
                seen.set(v, n);
                table.push(null);
                const out = {};
                for (const key of Object.keys(v)) {
                    if (key === 'energy') continue;   // a getter over energyUnits
                    if (key === 'data') { if (v.data !== getCardData(v.id)) out.$data = enc(v.data); continue; }
                    out[key] = enc(v[key]);
                }
                table[n] = out;
                return { $ref: n };
            }
            const out = {};
            for (const key of Object.keys(v)) {
                // Evolution chain entries carry the card data: looked up again by id.
                if (key === 'data' && typeof v.id === 'string' && v.data === getCardData(v.id)) { out.$d = 1; continue; }
                const x = enc(v[key]);
                if (x !== undefined) out[key] = x;
            }
            return out;
        };
        const deckOf = index => {
            const d = DeckLibrary.get(index);
            return d ? JSON.parse(JSON.stringify(d)) : null;
        };
        const state = {};
        for (const key of ['player', 'opponent', 'currentTurn', 'firstTurnSide', 'turnNumber', 'phase', 'setupReady', 'track']) {
            state[key] = enc(gameState[key]);
        }
        return {
            v: BATTLE_SAVE_VERSION,
            savedAt: Date.now(),
            matchStartedAt: Profile.s.activeMatch.startedAt,
            endTurn: !!endTurn,
            rng: Rng.state(),
            turnTracker: { played: [...turnTracker.playedThisTurn], evolved: [...turnTracker.evolvedThisTurn] },
            decks: { player: deckOf(gameState.player.selectedDeck), opponent: deckOf(gameState.opponent.selectedDeck) },
            returnPage: Screens.returnPage || null,
            table,
            state
        };
    },

    decode(save) {
        const table = save.table;
        const made = table.map(entry => {
            if (!entry || !getCardData(entry.id)) throw new Error(`unknown card ${entry && entry.id}`);
            return makeCardInstance(entry.id);
        });
        const dec = v => {
            if (v === null || typeof v !== 'object') return v;
            if (Array.isArray(v)) return v.map(dec);
            if ('$ref' in v) return made[v.$ref];
            if ('$set' in v) return new Set(v.$set.map(dec));
            if ('$map' in v) return new Map(v.$map.map(([k, x]) => [dec(k), dec(x)]));
            const out = {};
            for (const key of Object.keys(v)) {
                if (key === '$d') continue;
                out[key] = dec(v[key]);
            }
            if (v.$d) out.data = getCardData(out.id);
            return out;
        };
        table.forEach((entry, n) => {
            const card = made[n];
            for (const key of Object.keys(entry)) {
                if (key === '$data') { card.data = dec(entry.$data); continue; }
                card[key] = dec(entry[key]);
            }
        });
        const state = {};
        for (const key of Object.keys(save.state)) state[key] = dec(save.state[key]);
        return state;
    },

    /** Does the saved game belong to the open match and still load? */
    valid(save, match) {
        if (!save || !match || save.v !== BATTLE_SAVE_VERSION || match.pvp) return false;
        if (save.matchStartedAt !== match.startedAt) return false;
        if (!save.decks || !save.decks.player || !save.decks.opponent) return false;
        try { this.decode(JSON.parse(JSON.stringify(save))); return true; } catch (err) { return false; }
    },

    // -----------------------------------------------------------------------
    // Resuming
    // -----------------------------------------------------------------------

    /** On load: offer to resume the saved game, or give it up as a loss. */
    async offer() {
        const m = Profile.s.activeMatch;
        const save = Profile.s.battle;
        if (!m || !this.valid(save, m)) return;
        const answer = await Hub.dialog({
            title: '⚔️ Resume your game?',
            message: `Your game (${m.deck} vs ${m.opponent}) was still running when the page closed. ` +
                `Carry on from turn ${save.state.turnNumber || 1}, or leave it (that counts as a loss).`,
            buttons: [{ label: 'Leave (loss)', value: 'leave', kind: 'danger' }, { label: '▶️ Resume', value: 'resume', kind: 'primary' }]
        });
        if (answer && answer.value === 'resume') {
            try { await this.resume(save); return; } catch (err) { console.error('[battle-save] resume failed', err); }
        }
        this.clear();
        Profile.forfeitMatch(null);
        if (typeof Hub !== 'undefined') Hub.renderHeader();
    },

    async resume(save) {
        const state = this.decode(save);
        resetGameState();
        Object.assign(gameState, state, { busy: false, attackingSide: null });
        for (const side of SIDES) {
            if (!gameState[side].shinyLeft) gameState[side].shinyLeft = {};
            if (!gameState[side].fullArtLeft) gameState[side].fullArtLeft = {};
        }
        turnTracker.clear();
        for (const id of (save.turnTracker && save.turnTracker.played) || []) turnTracker.playedThisTurn.add(id);
        for (const id of (save.turnTracker && save.turnTracker.evolved) || []) turnTracker.evolvedThisTurn.add(id);

        // The decks the game was played with: the player's saved deck (or the
        // auto team), and the AI's preset or generated deck (raid, daily).
        DeckLibrary.load();
        const find = d => DeckLibrary.decks.find(x => x.type === d.type && x.name === d.name &&
            JSON.stringify(x.cards) === JSON.stringify(d.cards));
        const pd = save.decks.player, od = save.decks.opponent;
        let opp = od.type === 'preset' ? find(od) : null;
        if (!opp) { DeckLibrary.setRaidDeck(od); opp = DeckLibrary.raidDeck; }
        let mine = pd.type === 'custom' ? find(pd) : null;
        if (!mine) mine = DeckLibrary.setAutoDeck(pd);
        gameState.player.selectedDeck = DeckLibrary.indexOf(mine);
        gameState.opponent.selectedDeck = DeckLibrary.indexOf(opp);
        Screens.returnPage = save.returnPage || null;
        Rng.restore(save.rng);

        Log.clear();
        document.getElementById('deck-screen').classList.remove('screen-show');
        document.getElementById('game-screen').classList.add('screen-show');
        Log.write(`▶️ Game resumed: turn ${gameState.turnNumber || 'setup'}, ${gameState.player.points}–${gameState.opponent.points}.`,
            { kind: 'turn', icon: '▶️' });
        Render.all();
        // The player had pressed End Turn: the AI's turn is played again (with the same rolls).
        if (save.endTurn && gameState.phase === 'playing' && gameState.currentTurn === 'player') await playerEndTurn();
    }
};
