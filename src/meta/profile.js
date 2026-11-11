// ============================================================================
// PROFILE — the player's collection, currencies and progress
//
// Single player per browser. All rules from the slaymon collection game live
// here, rewritten to run in the browser instead of on a backend:
//   * credits: max 12, regenerate 1 per hour (caught up on load), 1 per draw
//   * gems: start at 5, no cap, spent in the Store
//   * draws: weighted rarity roll, Promo cards only on Sundays
//   * Spin the Wheel / Guess the Number / Memory: once a day, 7 or fewer credits
//   * missions: see missions.js
// Plus what is new in the playable version:
//   * decks are built from owned cards only
//   * 1 credit per win against the AI, up to 3 a day
//   * match stats, with leaving a game counted as a loss
//   * a set unlocks once 90% of the previous set's non-promo cards are owned
//
// Saving goes through Persist (persist.js): debounced autosave on every change,
// immediate save for anything a refresh must not undo.
// ============================================================================

const SAVE_APP_ID = 'tcg-collection';
const SAVE_VERSION = 1;

const MAX_CREDITS = 12;
const CREDIT_REGEN_MS = 3600000;          // 1 hour
const START_CREDITS = 12;
const START_GEMS = 5;
const MINIGAME_MAX_CREDITS = 7;            // every mini-game can pay out up to 5
const WIN_CREDITS_PER_DAY = 3;
const SET_UNLOCK_RATIO = 0.9;
const GUESS_MIN = 1;
const GUESS_MAX = 50;
const MEMORY_IMAGES = ['Floonleef', 'Venomgear', 'Aloebud', 'Babybara', 'Baklavaff', 'Batakaze', 'Dewmo', 'Dodolet'];
const MEMORY_BOARD_SIZE = 16;

/**
 * The Temporal Rift mini-games (hard mode of the arcade versions). They open
 * with the Temporal Rift set. Rewards, once a day each, like the others:
 *   sorting          by time: under 0:40 → 5🪙 +1💜 · 1:00 → 3🪙, 50% 💜 · 1:15 → 2🪙 · slower → 1🪙
 *   puzzle           by time: up to 3:00 → 5🪙 +1💜 · 5:00 → 3🪙, 50% 💜 ·
 *                    8:00 → 2🪙 · slower → 1🪙
 *   tetris           by score: 20+ → 5🪙 +1💜 · 10+ → 3🪙, 50% 💜 · 5+ → 2🪙 · less → 1🪙
 * Sundays: every finished game pays at least 1💜, and the best tier pays 2💜.
 */
const ARCADE_GAMES = ['sorting', 'puzzle', 'tetris'];
const ARCADE_SET = 'TR';
const ARCADE_TIME_TIERS = [{ upTo: 180, credits: 5, gem: 1 }, { upTo: 300, credits: 3, gem: 0.5 },
    { upTo: 480, credits: 2, gem: 0 }, { upTo: Infinity, credits: 1, gem: 0 }];
// Creature Sorting is quicker: under 40 seconds is the best tier (whole seconds, so 39 is the last).
const SORTING_TIME_TIERS = [{ upTo: 39, credits: 5, gem: 1 }, { upTo: 60, credits: 3, gem: 0.5 },
    { upTo: 75, credits: 2, gem: 0 }, { upTo: Infinity, credits: 1, gem: 0 }];
const ARCADE_SCORE_TIERS = [{ from: 20, credits: 5, gem: 1 }, { from: 10, credits: 3, gem: 0.5 },
    { from: 5, credits: 2, gem: 0 }, { from: 0, credits: 1, gem: 0 }];

const RARITIES = {
    1: { name: 'Common',   icon: '🟢', color: '#90EE90', cost: 1 },
    2: { name: 'Uncommon', icon: '🔵', color: '#87CEEB', cost: 5 },
    3: { name: 'Rare',     icon: '⭐', color: '#FFD700', cost: 10 },
    4: { name: 'Epic',     icon: '💎', color: '#FF69B4', cost: 20 }
};

/** Cumulative draw odds, in percent: 55 / 28 / 13 / 4. */
const DRAW_ODDS = [{ rarity: 1, upTo: 55 }, { rarity: 2, upTo: 83 }, { rarity: 3, upTo: 96 }, { rarity: 4, upTo: 100 }];

/** Local calendar day key, e.g. "2026-10-31". */
function dayKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSundayToday(d = new Date()) {
    return d.getDay() === 0;
}

function randInt(n) {
    return Math.floor(Math.random() * n);
}

function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// ---------------------------------------------------------------------------
// Collection metadata (rarity, promo), attached to the card objects
// ---------------------------------------------------------------------------

const Collection = {
    init() {
        for (const card of cardDatabase) {
            const meta = (typeof CARD_COLLECTION_DATA !== 'undefined' && CARD_COLLECTION_DATA[card.id]) || null;
            card.rarity = meta ? meta.rarity : 1;
            card.promo = meta ? !!meta.promo : false;
        }
    },

    rarity(r) {
        return RARITIES[r] || { name: 'Unknown', icon: '', color: '#ccc', cost: 0 };
    },

    /** Cards of a set in collector-number order. */
    setCards(setId) {
        return CardIndex.inSet(setId);
    },

    hasAbility(card) {
        return !!(card && card.abilityName);
    }
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const Profile = {
    s: null,
    loadedFrom: null,
    loadReadFailed: false,
    loadRecoverable: null,
    loadMissing: false,
    lastSavedAt: 0,
    saveBlocked: null,
    bootNotices: [],
    _listeners: [],
    _saveTimer: null,
    _saving: false,
    _pendingFlush: false,
    _pendingForce: false,
    _pendingUrgent: false,

    // -----------------------------------------------------------------------
    // State shape
    // -----------------------------------------------------------------------

    blank() {
        const sets = {};
        for (const set of cardSets) sets[set.id] = null;
        sets[cardSets[0].id] = Date.now();
        return {
            app: SAVE_APP_ID,
            version: SAVE_VERSION,
            createdAt: Date.now(),
            credits: START_CREDITS,
            creditTimer: 0,              // ms timestamp the next credit arrives; 0 at the cap
            gems: START_GEMS,
            cards: {},                   // cardId -> quantity owned
            decks: [],                   // [{ name, cards: [cardId] }]
            unlockedSets: sets,          // setId -> unlocked-at timestamp, or null
            missionsClaimed: {},         // missionId -> claimed-at timestamp
            loginDays: {},               // dayKey -> true
            wheelDays: {},
            guessDays: {},
            memoryDays: {},
            lastSpinDate: null,
            lastGuessDate: null,
            lastMemoryDate: null,
            minigameResults: {},         // 'wheel'|'guess'|'memory' -> { date, credits, gems } of the last play
            guessGame: null,             // { target, count, date }
            memoryGame: null,            // { board, matched, firstFlip, date }
            // Temporal Rift mini-games (sorting, puzzle, tetris): days played,
            // last play date, and the game in progress.
            arcadeDays: { sorting: {}, puzzle: {}, tetris: {} },
            arcadeLast: { sorting: null, puzzle: null, tetris: null },
            arcadeBest: { sorting: null, puzzle: null, tetris: 0 },  // fastest seconds / top score
            arcadeGame: null,            // { key, date, startedAt, seed, score }
            drawsTotal: 0,
            purchasesTotal: 0,
            drawSet: cardSets[0].id,
            winCredits: { date: null, count: 0 },
            activeMatch: null,           // set while a real game is in progress
            stats: this.blankStats(),
            cardAch: {},                 // cardId -> per-card achievement counters
            cardAchClaimed: {},          // cardId -> { bronze, silver, gold } claimed-at timestamps
            fullArt: {},                 // cardId -> full-art copies owned (raid rewards)
            raids: {}                    // bossId -> raid record (see raids.js)
        };
    },

    blankStats() {
        return {
            played: 0, won: 0, lost: 0, drawn: 0, forfeits: 0,
            streak: 0, bestStreak: 0,
            winCreditsEarned: 0,
            // Results split by who took the first turn. Games where the match
            // ended before the opening flip (left during setup) are in neither.
            first: this.blankRecord(),
            second: this.blankRecord(),
            byOpponent: {},              // deck name -> { played, won, lost, drawn }
            // Online games against other players, kept apart from the AI totals.
            pvp: { played: 0, won: 0, lost: 0, drawn: 0, forfeits: 0 },
            history: []                  // newest first: { at, deck, opponent, result, score, forfeit, first, pvp }
        };
    },

    blankRecord() {
        return { played: 0, won: 0, lost: 0, drawn: 0 };
    },

    /** One card's achievement counters, created on first use. */
    blankCardAch() {
        const vs = {};
        for (const type of CARD_ACH_OPPONENT_TYPES) vs[type] = 0;
        return { vs, wins: 0, attacks: 0, survived: 0 };
    },

    /** Fills defaults and coerces types, so old or hand-edited saves load safely. */
    migrate(raw) {
        const base = this.blank();
        if (!raw || typeof raw !== 'object') return base;

        const int = (v, min = 0) => Math.max(min, Math.floor(Number(v) || 0));
        const dayMap = v => {
            const out = {};
            if (v && typeof v === 'object') {
                for (const k of Object.keys(v)) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) out[k] = true;
            }
            return out;
        };
        const dateOrNull = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

        const s = Object.assign({}, base);
        s.createdAt = Number(raw.createdAt) || base.createdAt;
        s.credits = Math.min(MAX_CREDITS, int(raw.credits));
        if (raw.credits === undefined) s.credits = START_CREDITS;
        s.creditTimer = int(raw.creditTimer);
        s.gems = raw.gems === undefined ? START_GEMS : int(raw.gems);

        s.cards = {};
        if (raw.cards && typeof raw.cards === 'object') {
            for (const [id, qty] of Object.entries(raw.cards)) {
                const n = int(qty);
                if (n > 0 && getCardData(id)) s.cards[id] = n;
            }
        }

        s.decks = [];
        const names = new Set();
        for (const d of Array.isArray(raw.decks) ? raw.decks : []) {
            if (!d || typeof d.name !== 'string' || !Array.isArray(d.cards)) continue;
            const name = d.name.trim().slice(0, 40);
            if (!name || names.has(name)) continue;
            names.add(name);
            const cards = d.cards.filter(id => typeof id === 'string' && getCardData(id));
            // Decks saved before energy types existed get their main type.
            const energyTypes = cleanEnergyTypes(d.energyTypes);
            s.decks.push({
                name, cards,
                energyTypes: energyTypes.length ? energyTypes : defaultDeckEnergyTypes(cards),
                fullArt: cleanFullArt(d.fullArt, cards)
            });
        }

        s.fullArt = {};
        if (raw.fullArt && typeof raw.fullArt === 'object') {
            for (const [id, qty] of Object.entries(raw.fullArt)) {
                const n = int(qty);
                if (n > 0 && getCardData(id) && hasFullArt(id)) s.fullArt[id] = n;
            }
        }
        s.raids = Raids.sanitize(raw.raids);

        s.unlockedSets = Object.assign({}, base.unlockedSets);
        if (raw.unlockedSets && typeof raw.unlockedSets === 'object') {
            for (const set of cardSets) {
                const at = Number(raw.unlockedSets[set.id]);
                if (at > 0) s.unlockedSets[set.id] = at;
            }
        }

        s.missionsClaimed = {};
        if (raw.missionsClaimed && typeof raw.missionsClaimed === 'object') {
            for (const [id, at] of Object.entries(raw.missionsClaimed)) s.missionsClaimed[id] = Number(at) || Date.now();
        }

        s.loginDays = dayMap(raw.loginDays);
        s.wheelDays = dayMap(raw.wheelDays);
        s.guessDays = dayMap(raw.guessDays);
        s.memoryDays = dayMap(raw.memoryDays);
        s.lastSpinDate = dateOrNull(raw.lastSpinDate);
        s.lastGuessDate = dateOrNull(raw.lastGuessDate);
        s.lastMemoryDate = dateOrNull(raw.lastMemoryDate);

        s.arcadeDays = {};
        s.arcadeLast = {};
        s.arcadeBest = {};
        for (const key of ARCADE_GAMES) {
            s.arcadeDays[key] = dayMap(raw.arcadeDays && raw.arcadeDays[key]);
            s.arcadeLast[key] = dateOrNull(raw.arcadeLast && raw.arcadeLast[key]);
            const best = raw.arcadeBest && Number(raw.arcadeBest[key]);
            s.arcadeBest[key] = key === 'tetris' ? int(best) : (best > 0 ? Math.floor(best) : null);
        }
        const ag = raw.arcadeGame;
        s.arcadeGame = ag && typeof ag === 'object' && ARCADE_GAMES.includes(ag.key) && Number(ag.startedAt) > 0
            ? { key: ag.key, date: dateOrNull(ag.date) || dayKey(), startedAt: Number(ag.startedAt),
                seed: int(ag.seed), score: int(ag.score) }
            : null;

        s.minigameResults = {};
        if (raw.minigameResults && typeof raw.minigameResults === 'object') {
            for (const key of ['wheel', 'guess', 'memory'].concat(ARCADE_GAMES)) {
                const r = raw.minigameResults[key];
                if (r && typeof r === 'object' && dateOrNull(r.date)) {
                    s.minigameResults[key] = { date: r.date, credits: int(r.credits), gems: int(r.gems) };
                }
            }
        }

        const g = raw.guessGame;
        s.guessGame = g && typeof g === 'object' && int(g.target) >= GUESS_MIN && int(g.target) <= GUESS_MAX
            ? { target: int(g.target), count: int(g.count), date: dateOrNull(g.date) || dayKey() }
            : null;

        const m = raw.memoryGame;
        s.memoryGame = m && typeof m === 'object' && Array.isArray(m.board) && m.board.length === MEMORY_BOARD_SIZE
            && m.board.every(x => MEMORY_IMAGES.includes(x))
            ? {
                board: m.board.slice(),
                matched: (Array.isArray(m.matched) ? m.matched : []).map(Number)
                    .filter(i => i >= 0 && i < MEMORY_BOARD_SIZE),
                firstFlip: Number.isInteger(m.firstFlip) ? m.firstFlip : null,
                date: dateOrNull(m.date) || dayKey()
            }
            : null;

        s.drawsTotal = int(raw.drawsTotal);
        s.purchasesTotal = int(raw.purchasesTotal);
        s.drawSet = setById(raw.drawSet) ? raw.drawSet : base.drawSet;
        s.winCredits = raw.winCredits && typeof raw.winCredits === 'object'
            ? { date: dateOrNull(raw.winCredits.date), count: Math.min(WIN_CREDITS_PER_DAY, int(raw.winCredits.count)) }
            : base.winCredits;

        const am = raw.activeMatch;
        s.activeMatch = am && typeof am === 'object'
            ? {
                startedAt: Number(am.startedAt) || Date.now(),
                deck: String(am.deck || 'Unknown deck'),
                opponent: String(am.opponent || 'AI'),
                wentFirst: typeof am.wentFirst === 'boolean' ? am.wentFirst : null,
                pvp: !!am.pvp,
                raid: am.raid && typeof am.raid === 'object' && raidBossById(am.raid.bossId)
                    ? { bossId: am.raid.bossId, types: (Array.isArray(am.raid.types) ? am.raid.types : []).filter(t => RAID_TYPES.includes(t)) }
                    : null
            }
            : null;

        const st = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
        s.stats = this.blankStats();
        for (const k of ['played', 'won', 'lost', 'drawn', 'forfeits', 'streak', 'bestStreak', 'winCreditsEarned']) {
            s.stats[k] = int(st[k]);
        }
        for (const k of ['first', 'second']) {
            const rec = st[k] && typeof st[k] === 'object' ? st[k] : {};
            s.stats[k] = { played: int(rec.played), won: int(rec.won), lost: int(rec.lost), drawn: int(rec.drawn) };
        }
        {
            const rec = st.pvp && typeof st.pvp === 'object' ? st.pvp : {};
            s.stats.pvp = { played: int(rec.played), won: int(rec.won), lost: int(rec.lost), drawn: int(rec.drawn), forfeits: int(rec.forfeits) };
        }

        // Per-card achievements: only known card ids, only numeric counters.
        s.cardAch = {};
        if (raw.cardAch && typeof raw.cardAch === 'object') {
            for (const [id, rec] of Object.entries(raw.cardAch)) {
                if (!getCardData(id) || !rec || typeof rec !== 'object') continue;
                const clean = this.blankCardAch();
                for (const type of CARD_ACH_OPPONENT_TYPES) clean.vs[type] = int(rec.vs && rec.vs[type]);
                clean.wins = int(rec.wins);
                clean.attacks = int(rec.attacks);
                clean.survived = int(rec.survived);
                s.cardAch[id] = clean;
            }
        }
        s.cardAchClaimed = {};
        if (raw.cardAchClaimed && typeof raw.cardAchClaimed === 'object') {
            for (const [id, rec] of Object.entries(raw.cardAchClaimed)) {
                if (!getCardData(id) || !rec || typeof rec !== 'object') continue;
                const clean = {};
                for (const tier of CARD_ACH_TIERS) if (Number(rec[tier.id]) > 0) clean[tier.id] = Number(rec[tier.id]);
                if (Object.keys(clean).length) s.cardAchClaimed[id] = clean;
            }
        }
        if (st.byOpponent && typeof st.byOpponent === 'object') {
            for (const [name, o] of Object.entries(st.byOpponent)) {
                if (!o || typeof o !== 'object') continue;
                s.stats.byOpponent[name] = { played: int(o.played), won: int(o.won), lost: int(o.lost), drawn: int(o.drawn) };
            }
        }
        s.stats.history = (Array.isArray(st.history) ? st.history : []).slice(0, 30)
            .filter(h => h && typeof h === 'object' && ['win', 'loss', 'draw'].includes(h.result))
            .map(h => ({
                at: Number(h.at) || 0, deck: String(h.deck || ''), opponent: String(h.opponent || ''),
                result: h.result, score: String(h.score || ''), forfeit: !!h.forfeit,
                first: typeof h.first === 'boolean' ? h.first : null,
                pvp: !!h.pvp
            }));

        s.app = SAVE_APP_ID;
        s.version = SAVE_VERSION;
        return s;
    },

    // -----------------------------------------------------------------------
    // Lifecycle and saving
    // -----------------------------------------------------------------------

    subscribe(fn) { this._listeners.push(fn); },

    emit(reason) {
        for (const fn of this._listeners) {
            try { fn(this.s, reason); } catch (e) { console.error(e); }
        }
    },

    /**
     * Loads the save without writing anything. Returns 'gate' when a save
     * should exist but could not be read, so the caller can show the recovery
     * screen instead of starting a fresh account over it.
     */
    async init() {
        Collection.init();
        await Persist.init();
        const { data, source, readFailed, recoverable, missing } = await Persist.load();
        this.s = this.migrate(data);
        this.loadedFrom = source;
        this.loadReadFailed = !!readFailed;
        this.loadRecoverable = recoverable || null;
        this.loadMissing = !!missing;

        if (source === 'none' && (this.loadReadFailed || this.loadRecoverable || this.loadMissing)) {
            return 'gate';
        }
        this.afterLoad();
        return 'ok';
    },

    /** Daily bookkeeping that runs once the save is in hand. */
    afterLoad({ save = true } = {}) {
        this.bootNotices = [];
        this.markLoginDay();
        this.regen();
        this.checkUnlocks();

        // A real game that was still running when the page closed is a loss,
        // the same as leaving it with the button.
        if (this.s.activeMatch) {
            const m = this.s.activeMatch;
            this._recordResult('loss', { deck: m.deck, opponent: m.opponent, score: '', forfeit: true, wentFirst: m.wentFirst, pvp: m.pvp });
            if (m.raid) Raids.onResult(m.raid, 'loss', { forfeit: true });
            this.s.activeMatch = null;
            this.bootNotices.push(`Your last game (${m.deck} vs ${m.opponent}) was left unfinished, so it counted as a loss.`);
        }
        if (save) this.touch('load', { immediate: true });
    },

    touch(reason = 'change', { immediate = false } = {}) {
        this.emit(reason);
        if (immediate) return this.flush();
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.flush(), 700);
        return Promise.resolve();
    },

    async flush({ force = false, urgent = false } = {}) {
        clearTimeout(this._saveTimer);
        if (!this.s) return;
        if (this._saving) {
            this._pendingFlush = true;
            this._pendingForce = this._pendingForce || force;
            this._pendingUrgent = this._pendingUrgent || urgent;
            return;
        }
        this._saving = true;
        try {
            const at = await Persist.writeNow(this.s, { force, urgent });
            if (at == null) {
                this.saveBlocked = Persist.guardTripped;
                this.emit('save-blocked');
            } else {
                this.lastSavedAt = at;
                this.saveBlocked = null;
                this.emit('saved');
            }
        } catch (e) {
            console.error('[profile] save failed', e);
        } finally {
            this._saving = false;
            if (this._pendingFlush) {
                const next = { force: this._pendingForce, urgent: this._pendingUrgent };
                this._pendingFlush = this._pendingForce = this._pendingUrgent = false;
                this.flush(next);
            }
        }
    },

    /** Replaces the whole save (import, restore). Force-writes past the guard. */
    async replace(raw) {
        this.s = this.migrate(raw);
        this.afterLoad({ save: false });
        await this.flush({ force: true });
        this.emit('load');
    },

    /** Erases all progress. Force-writes past the guard. */
    async reset() {
        this.s = this.blank();
        this.bootNotices = [];
        this.markLoginDay();
        await this.flush({ force: true });
        this.emit('load');
    },

    markLoginDay() {
        const today = dayKey();
        if (!this.s.loginDays[today]) {
            this.s.loginDays[today] = true;
            return true;
        }
        return false;
    },

    // -----------------------------------------------------------------------
    // Credits and gems
    // -----------------------------------------------------------------------

    /** Catches up every credit earned since the timer was last checked. */
    regen(now = Date.now()) {
        const s = this.s;
        let c = s.credits, t = s.creditTimer;
        if (c < MAX_CREDITS && !t) t = now + CREDIT_REGEN_MS;   // repair a missing timer
        while (c < MAX_CREDITS && t && now >= t) {
            c++;
            t += CREDIT_REGEN_MS;
        }
        if (c >= MAX_CREDITS) { c = MAX_CREDITS; t = 0; }
        const changed = c !== s.credits || t !== s.creditTimer;
        s.credits = c;
        s.creditTimer = t;
        return changed;
    },

    msUntilNextCredit(now = Date.now()) {
        if (this.s.credits >= MAX_CREDITS || !this.s.creditTimer) return 0;
        return Math.max(0, this.s.creditTimer - now);
    },

    _spendCredits(n) {
        const wasFull = this.s.credits >= MAX_CREDITS;
        this.s.credits = Math.max(0, this.s.credits - n);
        // The clock only restarts when leaving the cap, as in slaymon.
        if (wasFull || !this.s.creditTimer) this.s.creditTimer = Date.now() + CREDIT_REGEN_MS;
    },

    /** Adds credits up to the cap. Returns how many were actually added. */
    _addCredits(n) {
        const before = this.s.credits;
        this.s.credits = Math.min(MAX_CREDITS, before + n);
        if (this.s.credits >= MAX_CREDITS) this.s.creditTimer = 0;
        return this.s.credits - before;
    },

    // -----------------------------------------------------------------------
    // Cards and sets
    // -----------------------------------------------------------------------

    owned(cardId) {
        return this.s.cards[cardId] || 0;
    },

    /** Full-art copies owned. They are separate from the normal copies. */
    ownedFullArt(cardId) {
        return (this.s && this.s.fullArt[cardId]) || 0;
    },

    _addCard(cardId) {
        const isNew = !this.s.cards[cardId];
        this.s.cards[cardId] = (this.s.cards[cardId] || 0) + 1;
        return { isNew, quantity: this.s.cards[cardId] };
    },

    /** Ownership counts for a set, overall and excluding Promo cards. */
    setProgress(setId) {
        const cards = Collection.setCards(setId);
        const out = { total: cards.length, owned: 0, totalNonPromo: 0, ownedNonPromo: 0, copies: 0 };
        for (const c of cards) {
            const q = this.owned(c.id);
            if (q > 0) { out.owned++; out.copies += q; }
            if (!c.promo) {
                out.totalNonPromo++;
                if (q > 0) out.ownedNonPromo++;
            }
        }
        return out;
    },

    /**
     * What unlocking a set takes: 90% of the PREVIOUS set's non-promo cards.
     * The first set is always open.
     */
    unlockRequirement(setId) {
        const index = cardSets.findIndex(s => s.id === setId);
        if (index <= 0) return null;
        const prev = cardSets[index - 1];
        const p = this.setProgress(prev.id);
        return {
            prevSet: prev,
            needed: Math.ceil(p.totalNonPromo * SET_UNLOCK_RATIO),
            have: p.ownedNonPromo,
            total: p.totalNonPromo
        };
    },

    isSetUnlocked(setId) {
        return !!(this.s && this.s.unlockedSets[setId]);
    },

    /** Unlocks any set whose requirement is now met. Returns newly unlocked sets. */
    checkUnlocks() {
        const fresh = [];
        for (const set of cardSets) {
            if (this.isSetUnlocked(set.id)) continue;
            const req = this.unlockRequirement(set.id);
            if (req && this.isSetUnlocked(req.prevSet.id) && req.have >= req.needed) {
                this.s.unlockedSets[set.id] = Date.now();
                fresh.push(set);
            }
        }
        if (fresh.length) this.emit('unlock');
        return fresh;
    },

    unlockedSets() {
        return cardSets.filter(s => this.isSetUnlocked(s.id));
    },

    // -----------------------------------------------------------------------
    // Draw a card
    // -----------------------------------------------------------------------

    draw(setId) {
        this.regen();
        const set = setById(setId);
        if (!set) return { error: 'Unknown set.' };
        if (!this.isSetUnlocked(setId)) return { error: `${set.name} is still locked.` };
        if (this.s.credits < 1) return { error: 'Not enough credits' };

        const sunday = isSundayToday();
        const pool = Collection.setCards(setId).filter(c => sunday || !c.promo);
        const roll = Math.random() * 100;
        const rarity = (DRAW_ODDS.find(o => roll < o.upTo) || DRAW_ODDS[DRAW_ODDS.length - 1]).rarity;
        let tier = pool.filter(c => c.rarity === rarity);
        if (tier.length === 0) tier = pool;
        if (tier.length === 0) return { error: 'No cards available' };
        const card = tier[randInt(tier.length)];

        this._spendCredits(1);
        const { isNew, quantity } = this._addCard(card.id);
        this.s.drawsTotal++;
        this.s.drawSet = setId;
        const unlocked = this.checkUnlocks();
        this.touch('draw', { immediate: true });
        return { card, isNew, quantity, unlocked };
    },

    // -----------------------------------------------------------------------
    // Store
    // -----------------------------------------------------------------------

    cardCost(card) {
        return Collection.rarity(card.rarity).cost;
    },

    buy(cardId) {
        const card = getCardData(cardId);
        if (!card) return { error: 'Card not found' };
        if (!this.isSetUnlocked(card.set)) return { error: 'That set is still locked.' };
        const cost = this.cardCost(card);
        if (!cost) return { error: 'Card has no valid rarity' };
        if (this.s.gems < cost) return { error: `Not enough gems. This card costs ${cost} 💜.` };

        this.s.gems -= cost;
        const { isNew, quantity } = this._addCard(cardId);
        this.s.purchasesTotal++;
        const unlocked = this.checkUnlocks();
        this.touch('buy', { immediate: true });
        return { success: true, cost, isNew, quantity, unlocked };
    },

    // -----------------------------------------------------------------------
    // Spin the Wheel
    // -----------------------------------------------------------------------

    wheelSegments(sunday = isSundayToday()) {
        const gemLow = sunday ? 3 : 1;
        const gemHigh = sunday ? 6 : 2;
        return [
            { type: 'none',   label: 'No Win', credits: 0, gems: 0 },
            { type: 'credit', label: '+1🪙',   credits: 1, gems: 0 },
            { type: 'none',   label: 'No Win', credits: 0, gems: 0 },
            { type: 'credit', label: '+3🪙',   credits: 3, gems: 0 },
            { type: 'none',   label: 'No Win', credits: 0, gems: 0 },
            { type: 'credit', label: '+5🪙',   credits: 5, gems: 0 },
            { type: 'none',   label: 'No Win', credits: 0, gems: 0 },
            { type: 'gem',    label: `+${gemLow} 💜`,  credits: 0, gems: gemLow },
            { type: 'none',   label: 'No Win', credits: 0, gems: 0 },
            { type: 'gem',    label: `+${gemHigh} 💜`, credits: 0, gems: gemHigh }
        ];
    },

    wheelStatus() {
        this.regen();
        const alreadyToday = this.s.lastSpinDate === dayKey();
        const tooMany = this.s.credits > MINIGAME_MAX_CREDITS;
        return { canPlay: !alreadyToday && !tooMany, alreadyToday, tooMany, credits: this.s.credits, sunday: isSundayToday() };
    },

    spinWheel() {
        const st = this.wheelStatus();
        if (st.alreadyToday) return { error: 'You already spun the wheel today. Come back tomorrow!' };
        if (st.tooMany) {
            return { error: `You have too many credits to spin right now. Use some credits until you have ${MINIGAME_MAX_CREDITS} or fewer, since you could win up to 5 more.` };
        }
        const segments = this.wheelSegments(st.sunday);
        const index = randInt(segments.length);
        const seg = segments[index];
        this._addCredits(seg.credits);
        this.s.gems += seg.gems;
        const today = dayKey();
        this.s.lastSpinDate = today;
        this.s.wheelDays[today] = true;
        this.s.minigameResults.wheel = { date: today, credits: seg.credits, gems: seg.gems };
        this.touch('wheel', { immediate: true });
        return { index, creditsWon: seg.credits, gemsWon: seg.gems };
    },

    // -----------------------------------------------------------------------
    // Guess the Number (no give-up)
    // -----------------------------------------------------------------------

    guessStatus() {
        this.regen();
        const active = !!this.s.guessGame;
        const alreadyToday = this.s.lastGuessDate === dayKey();
        const tooMany = this.s.credits > MINIGAME_MAX_CREDITS;
        return {
            canPlay: !alreadyToday && !tooMany && !active,
            alreadyToday, tooMany, active,
            count: active ? this.s.guessGame.count : 0,
            credits: this.s.credits, sunday: isSundayToday()
        };
    },

    startGuess() {
        const st = this.guessStatus();
        if (st.active) return { error: 'You already have an active game in progress. Complete it first!' };
        if (st.alreadyToday) return { error: 'You already played the number guessing game today. Come back tomorrow!' };
        if (st.tooMany) {
            return { error: `You have ${st.credits}/${MAX_CREDITS} credits. You need ${MINIGAME_MAX_CREDITS} or fewer to play, since you could win up to 5 more.` };
        }
        this.s.guessGame = { target: GUESS_MIN + randInt(GUESS_MAX - GUESS_MIN + 1), count: 0, date: dayKey() };
        // Saved at once, so a refresh cannot re-roll the number.
        this.touch('guess', { immediate: true });
        return { ok: true };
    },

    guessCreditsFor(count) {
        if (count <= 3) return 5;
        if (count <= 5) return 3;
        if (count <= 7) return 2;
        return 1;
    },

    guess(value) {
        const game = this.s.guessGame;
        if (!game) return { error: 'No active game. Start a new game first!' };
        const n = Number(value);
        if (!Number.isInteger(n) || n < GUESS_MIN || n > GUESS_MAX) {
            return { error: `Please enter a number between ${GUESS_MIN} and ${GUESS_MAX}` };
        }
        game.count++;
        if (n !== game.target) {
            this.touch('guess', { immediate: true });
            return { correct: false, feedback: n < game.target ? 'higher' : 'lower', count: game.count };
        }

        const creditsWon = this.guessCreditsFor(game.count);
        const gemsWon = isSundayToday() ? 1 : (Math.random() < 0.5 ? 1 : 0);
        this.regen();
        this._addCredits(creditsWon);
        this.s.gems += gemsWon;
        const today = dayKey();
        this.s.lastGuessDate = today;
        this.s.guessDays[today] = true;
        this.s.minigameResults.guess = { date: today, credits: creditsWon, gems: gemsWon };
        const result = { correct: true, target: game.target, count: game.count, creditsWon, gemsWon };
        this.s.guessGame = null;
        this.touch('guess', { immediate: true });
        return result;
    },

    // -----------------------------------------------------------------------
    // Memory game
    // -----------------------------------------------------------------------

    memoryStatus() {
        this.regen();
        const g = this.s.memoryGame;
        const alreadyToday = this.s.lastMemoryDate === dayKey();
        const tooMany = this.s.credits > MINIGAME_MAX_CREDITS;
        return {
            canPlay: !alreadyToday && !tooMany && !g,
            alreadyToday, tooMany, active: !!g,
            matched: g ? g.matched.map(p => ({ position: p, image: g.board[p] })) : [],
            firstFlip: g && g.firstFlip !== null ? { position: g.firstFlip, image: g.board[g.firstFlip] } : null,
            credits: this.s.credits, sunday: isSundayToday()
        };
    },

    startMemory() {
        const st = this.memoryStatus();
        if (st.active) return { error: 'You already have an active game in progress. Complete it first!' };
        if (st.alreadyToday) return { error: 'You already played the memory game today. Come back tomorrow!' };
        if (st.tooMany) {
            return { error: `You have ${st.credits}/${MAX_CREDITS} credits. You need ${MINIGAME_MAX_CREDITS} or fewer to play, since you could win up to 5 more.` };
        }
        const board = MEMORY_IMAGES.concat(MEMORY_IMAGES);
        for (let i = board.length - 1; i > 0; i--) {
            const j = randInt(i + 1);
            [board[i], board[j]] = [board[j], board[i]];
        }
        this.s.memoryGame = { board, matched: [], firstFlip: null, date: dayKey() };
        this.touch('memory', { immediate: true });
        return { ok: true };
    },

    revealMemory(position) {
        const g = this.s.memoryGame;
        if (!g) return { error: 'No active game. Start a new game first!' };
        if (!Number.isInteger(position) || position < 0 || position >= MEMORY_BOARD_SIZE) {
            return { error: `Position must be between 0 and ${MEMORY_BOARD_SIZE - 1}` };
        }
        if (g.matched.includes(position)) return { error: 'That card is already matched' };
        if (g.firstFlip === position) return { error: 'Pick a different card' };

        const image = g.board[position];
        if (g.firstFlip === null) {
            g.firstFlip = position;
            this.touch('memory');
            return { position, image, isFirstFlip: true };
        }

        const firstPosition = g.firstFlip;
        const firstImage = g.board[firstPosition];
        g.firstFlip = null;
        if (firstImage !== image) {
            this.touch('memory');
            return { position, image, isFirstFlip: false, matched: false, firstPosition, firstImage };
        }

        g.matched.push(firstPosition, position);
        if (g.matched.length < MEMORY_BOARD_SIZE) {
            this.touch('memory');
            return { position, image, isFirstFlip: false, matched: true, firstPosition, gameComplete: false };
        }

        // All 8 pairs: 50% +2, 40% +3, 10% +5 credits; 50% +1 gem (sure on Sundays).
        const r = Math.random() * 100;
        const creditsWon = r < 50 ? 2 : r < 90 ? 3 : 5;
        const gemsWon = isSundayToday() ? 1 : (Math.random() < 0.5 ? 1 : 0);
        this.regen();
        this._addCredits(creditsWon);
        this.s.gems += gemsWon;
        const today = dayKey();
        this.s.lastMemoryDate = today;
        this.s.memoryDays[today] = true;
        this.s.minigameResults.memory = { date: today, credits: creditsWon, gems: gemsWon };
        this.s.memoryGame = null;
        this.touch('memory', { immediate: true });
        return { position, image, isFirstFlip: false, matched: true, firstPosition, gameComplete: true, creditsWon, gemsWon };
    },

    // -----------------------------------------------------------------------
    // Temporal Rift mini-games: Creature Sorting, Puzzle, Tetris
    //
    // Starting a game uses the day's go. The game is saved as it starts, so
    // leaving and coming back resumes it with the clock still running (Sorting,
    // Puzzle: the same board from its seed) or ends it on the score so far
    // (Tetris), which stops a slow start being thrown away for a fresh one.
    // -----------------------------------------------------------------------

    arcadeUnlocked() {
        return this.isSetUnlocked(ARCADE_SET);
    },

    arcadeStatus(key) {
        this.regen();
        const g = this.s.arcadeGame;
        const active = !!g && g.key === key;
        const busyElsewhere = !!g && g.key !== key;
        const alreadyToday = this.s.arcadeLast[key] === dayKey();
        const tooMany = this.s.credits > MINIGAME_MAX_CREDITS;
        const locked = !this.arcadeUnlocked();
        return {
            locked, active, busyElsewhere, alreadyToday, tooMany,
            canPlay: !locked && !alreadyToday && !tooMany && !g,
            credits: this.s.credits,
            sunday: isSundayToday(),
            game: active ? Object.assign({}, g) : null,
            best: this.s.arcadeBest[key]
        };
    },

    startArcade(key) {
        if (!ARCADE_GAMES.includes(key)) return { error: 'Unknown game.' };
        const st = this.arcadeStatus(key);
        if (st.locked) return { error: 'Unlock after completing 90% of Galactic Adventures.' };
        if (st.active) return { ok: true, game: st.game };
        if (st.busyElsewhere) return { error: 'Finish the mini-game you already started first.' };
        if (st.alreadyToday) return { error: 'You already played this today. Come back tomorrow!' };
        if (st.tooMany) return { error: `You need ${MINIGAME_MAX_CREDITS} or fewer credits to play.` };
        this.s.arcadeGame = { key, date: dayKey(), startedAt: Date.now(), seed: 1 + randInt(2147483000), score: 0 };
        this.touch('arcade', { immediate: true });
        return { ok: true, game: Object.assign({}, this.s.arcadeGame) };
    },

    /** Tetris saves its score as it goes, so a closed game still counts. */
    arcadeProgress(key, score) {
        const g = this.s.arcadeGame;
        if (!g || g.key !== key) return;
        g.score = Math.max(g.score, Math.floor(Number(score) || 0));
        this.touch('arcade');
    },

    /** The reward for a result: seconds (sorting, puzzle) or score (tetris). */
    arcadeReward(key, value, sunday = isSundayToday(), roll = Math.random()) {
        const tiers = key === 'tetris' ? ARCADE_SCORE_TIERS : key === 'sorting' ? SORTING_TIME_TIERS : ARCADE_TIME_TIERS;
        const tier = key === 'tetris' ? tiers.find(t => value >= t.from) : tiers.find(t => value <= t.upTo);
        const best = tier === tiers[0];
        let gems = tier.gem >= 1 ? 1 : (roll < tier.gem ? 1 : 0);
        if (sunday) gems = best ? 2 : Math.max(1, gems);
        return { credits: tier.credits, gems };
    },

    /**
     * Ends the game in progress and pays its reward.
     * @param {object} result { seconds } for sorting and puzzle, { score } for tetris
     */
    finishArcade(key, result = {}) {
        const g = this.s.arcadeGame;
        if (!g || g.key !== key) return { error: 'No game in progress.' };
        const value = key === 'tetris'
            ? Math.max(g.score, Math.floor(Number(result.score) || 0))
            : Math.max(1, Math.floor((Date.now() - g.startedAt) / 1000));
        const reward = this.arcadeReward(key, value);
        this.regen();
        this._addCredits(reward.credits);
        this.s.gems += reward.gems;
        const today = dayKey();
        this.s.arcadeLast[key] = today;
        this.s.arcadeDays[key][today] = true;
        if (key === 'tetris') this.s.arcadeBest.tetris = Math.max(this.s.arcadeBest.tetris || 0, value);
        else if (!this.s.arcadeBest[key] || value < this.s.arcadeBest[key]) this.s.arcadeBest[key] = value;
        this.s.minigameResults[key] = { date: today, credits: reward.credits, gems: reward.gems };
        this.s.arcadeGame = null;
        this.touch('arcade', { immediate: true });
        return { ok: true, value, creditsWon: reward.credits, gemsWon: reward.gems };
    },

    // -----------------------------------------------------------------------
    // Missions
    // -----------------------------------------------------------------------

    claimMission(missionId) {
        const mission = Missions.find(missionId);
        if (!mission) return { error: 'Mission not found' };
        if (this.s.missionsClaimed[missionId]) return { error: 'Mission already claimed' };
        this.regen();
        const state = Missions.state(mission, Missions.progress());
        if (!state.completed) return { error: 'Mission not completed yet' };
        const room = MAX_CREDITS - this.s.credits;
        if (mission.reward.credits > 0 && room < mission.reward.credits) {
            return { error: `Not enough room for ${mission.reward.credits} credits (${this.s.credits}/${MAX_CREDITS})` };
        }
        this._addCredits(mission.reward.credits);
        this.s.gems += mission.reward.gems;
        this.s.missionsClaimed[missionId] = Date.now();
        this.touch('mission', { immediate: true });
        return { success: true, reward: mission.reward };
    },

    // -----------------------------------------------------------------------
    // Decks (owned cards only)
    // -----------------------------------------------------------------------

    decks() {
        return this.s ? this.s.decks : [];
    },

    findDeck(name) {
        return this.decks().find(d => d.name === name) || null;
    },

    saveDeck(name, cards, previousName = null, energyTypes = null, fullArt = null) {
        const keep = this.s.decks.filter(d => d.name !== name && d.name !== previousName);
        const index = this.s.decks.findIndex(d => d.name === (previousName || name));
        const types = cleanEnergyTypes(energyTypes);
        const entry = {
            name, cards: cards.slice(),
            energyTypes: types.length ? types : defaultDeckEnergyTypes(cards),
            fullArt: cleanFullArt(fullArt, cards)
        };
        if (index >= 0) keep.splice(Math.min(index, keep.length), 0, entry);
        else keep.push(entry);
        this.s.decks = keep;
        this.touch('decks', { immediate: true });
    },

    deleteDeck(name) {
        this.s.decks = this.s.decks.filter(d => d.name !== name);
        this.touch('decks', { immediate: true });
    },

    /**
     * Checks the deck only uses cards the player owns, in the quantities owned.
     * Full-art copies are checked against the full-art copies owned, the rest
     * against the normal ones.
     */
    checkOwnership(cardIds, fullArt = null) {
        const counts = new Map();
        for (const id of cardIds) counts.set(id, (counts.get(id) || 0) + 1);
        const fa = cleanFullArt(fullArt, cardIds);
        for (const [id, total] of counts) {
            const data = getCardData(id);
            const name = data ? data.name : id;
            const f = fa[id] || 0;
            const haveFa = this.ownedFullArt(id);
            if (f > haveFa) {
                return {
                    valid: false,
                    error: haveFa === 0
                        ? `You don't own the full-art ${name}.`
                        : `The deck uses ${f} full-art ${name}, but you own ${haveFa}.`
                };
            }
            const n = total - f;
            const have = this.owned(id);
            if (have < n) {
                return {
                    valid: false,
                    error: have === 0
                        ? `You don't own ${name}.`
                        : `The deck uses ${n} copies of ${name}, but you own ${have}.`
                };
            }
        }
        return { valid: true };
    },

    // -----------------------------------------------------------------------
    // Matches against the AI
    // -----------------------------------------------------------------------

    winCreditsToday() {
        const wc = this.s.winCredits;
        return wc && wc.date === dayKey() ? wc.count : 0;
    },

    /** What to tell the player before a game starts. */
    preMatchNotice() {
        this.regen();
        return {
            creditsFull: this.s.credits >= MAX_CREDITS,
            dailyLimitReached: this.winCreditsToday() >= WIN_CREDITS_PER_DAY,
            winCreditsToday: this.winCreditsToday()
        };
    },

    /**
     * @param {object} [opts] { raid: { bossId, types } } for a raid game: the
     *   boss, and the types the player's deck counts for (raidQualifyingTypes)
     */
    startMatch(deckName, opponentName, { raid = null, pvp = false } = {}) {
        this.s.activeMatch = {
            startedAt: Date.now(), deck: deckName, opponent: opponentName, wentFirst: null,
            pvp: !!pvp,
            raid: raid ? { bossId: raid.bossId, types: (raid.types || []).slice() } : null
        };
        // Immediate: closing the page mid-game must still count as a loss.
        this.touch('match-start', { immediate: true });
    },

    /** Called once the opening coin flip has decided who goes first. */
    setMatchStarter(playerWentFirst) {
        if (!this.s || !this.s.activeMatch) return;
        this.s.activeMatch.wentFirst = !!playerWentFirst;
        this.touch('match-starter', { immediate: true });
    },

    hasActiveMatch() {
        return !!(this.s && this.s.activeMatch);
    },

    /**
     * Records the result of the running match and pays the win credit.
     * @param {'player'|'opponent'|'tie'} winner
     * @returns {{type, message}|null} the reward line for the game-over panel
     */
    finishMatch(winner, score, report = null) {
        const m = this.s && this.s.activeMatch;
        if (!m) return null;
        const result = winner === 'player' ? 'win' : winner === 'opponent' ? 'loss' : 'draw';
        this.s.activeMatch = null;
        this._recordResult(result, { deck: m.deck, opponent: m.opponent, score, wentFirst: m.wentFirst, pvp: m.pvp });
        // The per-card achievements are about the AI decks; online games don't count.
        if (report && !m.pvp) this.recordCardAchievements(report);

        let reward;
        if (result === 'win') {
            this.regen();
            const today = this.winCreditsToday();
            if (today >= WIN_CREDITS_PER_DAY) {
                reward = { type: 'limit', message: `You've reached your daily limit of ${WIN_CREDITS_PER_DAY} win credits, so this win earned no credit. Come back tomorrow!` };
            } else if (this.s.credits >= MAX_CREDITS) {
                reward = { type: 'full', message: `Your credits are full (${MAX_CREDITS}/${MAX_CREDITS}), so this win earned no credit.` };
            } else {
                this._addCredits(1);
                this.s.winCredits = { date: dayKey(), count: today + 1 };
                this.s.stats.winCreditsEarned++;
                reward = { type: 'credit', message: `🪙 +1 credit for the win! (${today + 1}/${WIN_CREDITS_PER_DAY} win credits today)` };
            }
        } else if (result === 'draw') {
            reward = { type: 'none', message: 'Draws do not earn credits.' };
        } else {
            reward = { type: 'none', message: 'Win a game to earn a credit.' };
        }
        if (m.raid) {
            const raid = Raids.onResult(m.raid, result);
            if (raid.lines.length) reward.message += '\n' + raid.lines.join('\n');
            reward.raid = raid;
        }
        this.touch('match-end', { immediate: true });
        return reward;
    },

    /** The player left a running match: it counts as a loss. Attacks made still count. */
    forfeitMatch(report = null) {
        const m = this.s && this.s.activeMatch;
        if (!m) return;
        this.s.activeMatch = null;
        this._recordResult('loss', { deck: m.deck, opponent: m.opponent, score: '', forfeit: true, wentFirst: m.wentFirst, pvp: m.pvp });
        if (m.raid) Raids.onResult(m.raid, 'loss', { forfeit: true });
        if (report && !m.pvp) this.recordCardAchievements(Object.assign({}, report, { won: false, survivors: [] }));
        this.touch('match-end', { immediate: true });
    },

    /** An online game that broke off (connection lost, out of sync): it doesn't count. */
    cancelMatch() {
        if (!this.s || !this.s.activeMatch) return;
        this.s.activeMatch = null;
        this.touch('match-cancel', { immediate: true });
    },

    _recordResult(result, { deck, opponent, score, forfeit = false, wentFirst = null, pvp = false }) {
        const st = this.s.stats;
        if (pvp) {
            // Online games have their own totals and stay out of the AI ones.
            const rec = st.pvp;
            rec.played++;
            if (result === 'win') rec.won++;
            else if (result === 'loss') rec.lost++;
            else rec.drawn++;
            if (forfeit) rec.forfeits++;
            st.history.unshift({ at: Date.now(), deck, opponent, result, score: score || '', forfeit, first: wentFirst, pvp: true });
            if (st.history.length > 30) st.history.length = 30;
            return;
        }
        st.played++;
        if (result === 'win') { st.won++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); }
        else if (result === 'loss') { st.lost++; st.streak = 0; }
        else { st.drawn++; st.streak = 0; }
        if (forfeit) st.forfeits++;

        const bump = rec => {
            rec.played++;
            if (result === 'win') rec.won++;
            else if (result === 'loss') rec.lost++;
            else rec.drawn++;
        };
        bump(st.byOpponent[opponent] || (st.byOpponent[opponent] = this.blankRecord()));
        if (wentFirst === true) bump(st.first);
        else if (wentFirst === false) bump(st.second);

        st.history.unshift({ at: Date.now(), deck, opponent, result, score: score || '', forfeit, first: wentFirst });
        if (st.history.length > 30) st.history.length = 30;
    },

    // -----------------------------------------------------------------------
    // Per-card achievements (definitions and progress in achievements.js)
    // -----------------------------------------------------------------------

    cardAchRecord(cardId) {
        return this.s.cardAch[cardId] || (this.s.cardAch[cardId] = this.blankCardAch());
    },

    /**
     * Credits one finished match. A card only counts towards the win tasks if
     * the player put it into play (setup, bench, evolution, or using the item);
     * attacks count whatever the result.
     */
    recordCardAchievements(report) {
        const won = !!report.won;
        const type = CARD_ACH_OPPONENT_TYPES.includes(report.opponentType) ? report.opponentType : null;
        if (won) {
            for (const id of new Set(report.played || [])) {
                if (!getCardData(id)) continue;
                const rec = this.cardAchRecord(id);
                rec.wins++;
                if (type) rec.vs[type]++;
            }
            for (const id of new Set(report.survivors || [])) {
                if (!getCardData(id)) continue;
                this.cardAchRecord(id).survived++;
            }
        }
        for (const [id, n] of Object.entries(report.attacks || {})) {
            if (!getCardData(id) || !(n > 0)) continue;
            this.cardAchRecord(id).attacks += n;
        }
    },

    /**
     * Pays out one achievement tier for a card.
     * Bronze and silver pay a credit and a chance of a gem, so they wait for
     * room under the credit cap, the same as missions. Gold pays a random promo
     * card from the set the player picks, at the usual rarity odds.
     */
    claimCardAchievement(cardId, tierId, { setId = null } = {}) {
        const st = CardAchievements.state(cardId);
        if (!st) return { error: 'Card not found' };
        const tier = st.tiers.find(t => t.id === tierId);
        if (!tier) return { error: 'This card has no such reward.' };
        if (tier.claimed) return { error: 'Already claimed.' };
        if (!tier.reached) return { error: `Complete ${tier.tasks} tasks first.` };

        this.regen();
        const reward = { credits: 0, gems: 0, card: null };
        if (tier.reward.credits) {
            if (MAX_CREDITS - this.s.credits < tier.reward.credits) {
                return { error: `Not enough room for ${tier.reward.credits} credit (${this.s.credits}/${MAX_CREDITS}). Spend some credits first.` };
            }
            reward.credits = this._addCredits(tier.reward.credits);
            if (Math.random() < tier.reward.gemChance) {
                this.s.gems += 1;
                reward.gems = 1;
            }
        }
        if (tier.reward.promo) {
            const set = setById(setId);
            if (!set || !this.isSetUnlocked(setId)) return { error: 'Choose an unlocked set.' };
            const card = this.rollPromo(setId);
            if (!card) return { error: `${set.name} has no promo cards.` };
            const { isNew, quantity } = this._addCard(card.id);
            reward.card = card;
            reward.isNew = isNew;
            reward.quantity = quantity;
            this.checkUnlocks();
        }

        const rec = this.s.cardAchClaimed[cardId] || (this.s.cardAchClaimed[cardId] = {});
        rec[tierId] = Date.now();
        this.touch('card-achievement', { immediate: true });
        return { success: true, reward };
    },

    /** Promo cards of a set that a reward can hand out. */
    promoPool(setId) {
        return Collection.setCards(setId).filter(c => c.promo);
    },

    /** A random promo card, weighted by rarity with the normal draw odds. */
    rollPromo(setId) {
        const pool = this.promoPool(setId);
        if (pool.length === 0) return null;
        const roll = Math.random() * 100;
        const rarity = (DRAW_ODDS.find(o => roll < o.upTo) || DRAW_ODDS[DRAW_ODDS.length - 1]).rarity;
        let tier = pool.filter(c => c.rarity === rarity);
        // A missing rarity falls back to the nearest one below, then to any promo.
        for (let r = rarity - 1; tier.length === 0 && r >= 1; r--) tier = pool.filter(c => c.rarity === r);
        if (tier.length === 0) tier = pool;
        return tier[randInt(tier.length)];
    }
};
