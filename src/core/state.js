// ============================================================================
// GAME STATE
//
// One factory builds a side, so a new game can never inherit stale flags (the
// original resetAndStartNewGame() rebuilt sides with only a subset of their
// fields, letting auras and shields leak between games).
//
// All transient state lives under `.flags`, on both sides and creatures, so a
// full reset is one assignment rather than a hand-maintained field list.
// ============================================================================

const BENCH_SIZE = 3;
const POINTS_TO_WIN = 3;
const MAX_TURNS = 30;
const HAND_SIZE = 5;
const FIRST_EVOLUTION_TURN = 3;

/** Thrown to unwind the resolution pipeline the moment the game ends. */
class GameOverSignal extends Error {
    constructor() {
        super('game over');
        this.name = 'GameOverSignal';
    }
}

function createSide() {
    return {
        deck: [],
        hand: [],
        active: null,
        bench: new Array(BENCH_SIZE).fill(null),
        discardPile: [],
        points: 0,
        selectedDeck: null,

        // Per-turn action budget.
        energyAttachedThisTurn: false,
        hasAttacked: false,
        itemUsedThisTurn: false,
        // One voluntary retreat per turn. Forced switches (Phase Shift,
        // Heavenly Retreat, Forceful Flip, promotion after a knockout) do not
        // go through performRetreat, so they never read or set this.
        retreatedThisTurn: false,

        // The energy types this side's deck uses (set by buildDecks), and the
        // type of this turn's energy, rolled at the start of the turn so the
        // player can see it before attaching.
        energyTypes: ENERGY_TYPES.slice(),
        turnEnergyType: null,

        // Full-art copies still in the deck, by card id (set by buildDecks).
        // The deck itself only holds ids; see instanceFromDeck / returnToDeck.
        fullArtLeft: {},

        // Everything else. Cleared wholesale between games and selectively in
        // endTurn(). See turn.js for the lifecycle.
        flags: createSideFlags()
    };
}

function createSideFlags() {
    return {
        // --- Damage bonuses -------------------------------------------------
        booster: false,             // Booster item: +20 to one attack
        powerUpAttacks: 0,          // Power-Up item: +10 to the next 3 attacks
        amuletUntil: null,          // Amulet item: +20 for Neutral attackers
        // Always-on abilities (Aura of Strength, Warrior Mode, Guardian Mode,
        // Camouflage, Mirage Shield...) keep no flags: the rules check the
        // board each time. See creaturesWithAbility() in abilities.js.

        // --- Damage reduction -----------------------------------------------
        // { amount, until } records keyed by id. See grantSideShield().
        // shieldBarrier | galeShield
        shields: {},

        // --- Restrictions on THIS side, as absolute deadlines --------------
        cantAttackUntil: null,      // Quick Reflexes
        cantDealDamageUntil: null,  // Tidal Illusion
        invincibleLockUntil: null,  // Invincible Gambit: the OTHER side deals no damage
        forcedEnergyType: null,     // Starfall Strike: next turn's energy is this type
        forcedEnergyUntil: null,

        // --- Misc -----------------------------------------------------------
        phaseShift: false,          // must swap out after attacking
        guardianCard: null,         // the bench Aegiscelis soaking the next hit (Guardian)
        guardianUntil: null,
        usedItemOnTurn: null,       // turn number, read by Energy Siphon
        evolvedOnTurn: null,        // turn number, read by Thunder Rush
        fluxCheckDone: false,
        fluxCheckPassed: false
    };
}

function createCreatureFlags() {
    return {
        // --- Restrictions, as absolute deadlines ---------------------------
        cantRetreatUntil: null,     // Ethereal Snare (1), Tempest Hold (2)
        cantAttackUntil: null,      // Wing Slap
        cooldowns: {},              // effectId -> deadline (Overdrive Smash)

        // --- Damage reduction attached to this creature --------------------
        // mindRipple | cottonGuard | monksFury | spectralBurst
        shields: {},

        // --- Queued bonuses for this creature's next attack ----------------
        chillRecharge: false,       // +20
        sproutBoostReady: false,    // +30

        // --- Set during an attack, consumed by the damage pipeline ---------
        hallucinationFlip: null
    };
}

// ---------------------------------------------------------------------------
// Shields. One uniform record shape so the damage pipeline can read every
// shield the same way, and a new shield in a future set is one table row.
// ---------------------------------------------------------------------------

function grantSideShield(side, key, amount) {
    gameState[side].flags.shields[key] = {
        amount,
        until: Timing.throughOpponentTurn()
    };
}

function grantCreatureShield(card, key, amount) {
    card.flags.shields[key] = {
        amount,
        until: Timing.throughOpponentTurn()
    };
}

/** Returns the live shield record, or null if absent or expired. */
function readShield(bag, key) {
    const entry = bag && bag[key];
    return entry && Timing.active(entry.until) ? entry : null;
}

function consumeShield(bag, key) {
    if (bag) delete bag[key];
}

/** The one place a playable creature/item instance is created. */
function makeCardInstance(cardId) {
    const data = getCardData(cardId);
    const card = {
        id: cardId,
        data,
        damage: 0,
        // Energy attached, per type. Change it only through addEnergyUnits /
        // takeEnergyUnits (or attachEnergyTo / discardEnergyFrom in heal.js).
        energyUnits: emptyEnergyUnits(),
        status: new Set(),
        abilityUsedThisTurn: false,
        evolutionId: newEvolutionId(),
        evolutionChain: [],
        // Shown with its full-art image. Cosmetic only.
        fullArt: false,
        flags: createCreatureFlags()
    };
    // `energy` stays the total, which is what retreat costs and the
    // "N damage per energy" moves count. Setting it (test pages only) adds or
    // removes energy of the creature's owner's deck type.
    Object.defineProperty(card, 'energy', {
        enumerable: true,
        get() { return energyUnitsTotal(this.energyUnits); },
        set(n) {
            const diff = Math.max(0, Math.floor(Number(n) || 0)) - energyUnitsTotal(this.energyUnits);
            if (diff > 0) addEnergyUnits(this, defaultEnergyTypeFor(this), diff);
            else if (diff < 0) takeEnergyUnits(this, -diff);
        }
    });
    return card;
}

/**
 * An instance for a card leaving `side`'s deck (draw, opening hand, search).
 * The deck's full-art copies of that card are handed out first.
 */
function instanceFromDeck(side, cardId) {
    const card = makeCardInstance(cardId);
    const left = gameState[side] && gameState[side].fullArtLeft;
    if (left && left[cardId] > 0) {
        left[cardId]--;
        card.fullArt = true;
    }
    return card;
}

/** Puts instances back into `side`'s deck as ids, keeping full-art counts right. */
function returnToDeck(side, cards) {
    const s = gameState[side];
    for (const card of cards) {
        s.deck.push(card.id);
        if (card.fullArt) s.fullArtLeft[card.id] = (s.fullArtLeft[card.id] || 0) + 1;
    }
}

/** Adds energy of one type to a creature, with no side effects. */
function addEnergyUnits(card, type, count = 1) {
    if (!card || !ENERGY_TYPES.includes(type) || count <= 0) return;
    card.energyUnits[type] += count;
}

/**
 * Removes `count` energy and returns the types removed. Takes the energy the
 * creature's own moves need least: types its moves never name first, then
 * whichever type it holds most of.
 */
function takeEnergyUnits(card, count = 1, { random = false } = {}) {
    const removed = [];
    if (!card) return removed;
    const wanted = energyTypesUsedBy(card.data);
    for (let i = 0; i < count; i++) {
        const held = ENERGY_TYPES.filter(t => card.energyUnits[t] > 0);
        if (held.length === 0) break;
        if (random) {
            // Every attached energy is equally likely (Energy Snatch).
            const pool = [];
            for (const t of held) for (let k = 0; k < card.energyUnits[t]; k++) pool.push(t);
            const pick = Rng.pick(pool);
            card.energyUnits[pick]--;
            removed.push(pick);
            continue;
        }
        held.sort((a, b) =>
            (wanted.has(a) ? 1 : 0) - (wanted.has(b) ? 1 : 0) ||
            card.energyUnits[b] - card.energyUnits[a]);
        card.energyUnits[held[0]]--;
        removed.push(held[0]);
    }
    return removed;
}

/** The energy type a side's deck hands out, picked at random if it has several. */
function rollEnergyType(side) {
    const types = (side && gameState[side] && gameState[side].energyTypes) || ENERGY_TYPES;
    return types.length === 1 ? types[0] : Rng.pick(types);
}

/** Fallback type for a creature: its owner's deck type, else its own. */
function defaultEnergyTypeFor(card) {
    const spot = typeof locateCard === 'function' ? locateCard(card) : null;
    const types = spot && gameState[spot.side].energyTypes;
    if (types && types.length) return types[0];
    const own = card && card.data && card.data.type;
    return ENERGY_TYPES.includes(own) ? own : ENERGY_TYPES[0];
}

/** Restores an instance to pristine condition (Revive Crystal). */
function resetCardInstance(card) {
    card.damage = 0;
    card.energyUnits = emptyEnergyUnits();
    card.status = new Set();
    card.abilityUsedThisTurn = false;
    card.flags = createCreatureFlags();
    return card;
}

const gameState = {
    player: createSide(),
    opponent: createSide(),
    currentTurn: null,          // 'player' | 'opponent'
    // The side that won the opening coin flip. On global turn 1 that side
    // skips its draw and cannot attack (see isStarterFirstTurn).
    firstTurnSide: null,
    turnNumber: 0,
    phase: 'deckSelection',     // deckSelection | setup | playing | gameOver
    setupReady: { player: false, opponent: false },
    // What each side did this match, for the per-card achievements.
    track: createMatchTrack(),
    busy: false                 // true while a resolution pipeline is running
};

const turnTracker = {
    playedThisTurn: new Set(),  // evolutionIds played this turn
    evolvedThisTurn: new Set(), // evolutionIds evolved this turn

    clear() {
        this.playedThisTurn.clear();
        this.evolvedThisTurn.clear();
    }
};

function resetGameState() {
    gameState.player = createSide();
    gameState.opponent = createSide();
    gameState.currentTurn = null;
    gameState.firstTurnSide = null;
    gameState.turnNumber = 0;
    gameState.phase = 'deckSelection';
    gameState.setupReady = { player: false, opponent: false };
    gameState.track = createMatchTrack();
    gameState.busy = false;
    turnTracker.clear();
}

// ---------------------------------------------------------------------------
// Match tracking, read by the per-card achievements at the end of a game.
// `played` holds card ids a side put into play (setup, bench, evolution, an
// item it used); `attacks` counts attacks by the id of the attacking card.
// ---------------------------------------------------------------------------

function createMatchTrack() {
    return {
        player: { played: new Set(), attacks: {} },
        opponent: { played: new Set(), attacks: {} }
    };
}

function trackPlayed(side, cardId) {
    const t = gameState.track && gameState.track[side];
    if (t && cardId) t.played.add(cardId);
}

function trackAttack(side, cardId) {
    const t = gameState.track && gameState.track[side];
    if (t && cardId) t.attacks[cardId] = (t.attacks[cardId] || 0) + 1;
}

/** Card ids still on a side's board, evolution chains included. */
function cardsStillInPlay(side) {
    const ids = new Set();
    for (const card of creaturesInPlay(side)) {
        ids.add(card.id);
        for (const previous of card.evolutionChain || []) ids.add(previous.id);
    }
    return ids;
}

/**
 * The first-turn rule: the side that goes first skips its turn-1 draw and
 * cannot attack on turn 1. It may still attach energy, play and evolve
 * (evolution is blocked before turn 3 anyway). Simulated across 25,600
 * AI-vs-AI games, this brought first-player wins from 63% to 54%.
 */
function isStarterFirstTurn(side) {
    return gameState.turnNumber === 1 && !!gameState.firstTurnSide &&
        gameState.firstTurnSide === side;
}

// ---------------------------------------------------------------------------
// Board accessors
// ---------------------------------------------------------------------------

function sideState(side) {
    return gameState[side];
}

/** Active + bench, excluding empty slots. */
function creaturesInPlay(side) {
    const s = gameState[side];
    const out = [];
    if (s.active) out.push(s.active);
    for (const c of s.bench) if (c) out.push(c);
    return out;
}

function benchCreatures(side) {
    return gameState[side].bench.filter(c => c !== null);
}

function benchIndexOf(side, card) {
    return gameState[side].bench.indexOf(card);
}

function emptyBenchSlots(side) {
    const out = [];
    gameState[side].bench.forEach((c, i) => { if (!c) out.push(i); });
    return out;
}

/** Locates a card on the board: { side, location, index } or null. */
function locateCard(card) {
    for (const side of SIDES) {
        if (gameState[side].active === card) {
            return { side, location: 'active', index: null };
        }
        const i = gameState[side].bench.indexOf(card);
        if (i !== -1) return { side, location: 'bench', index: i };
    }
    return null;
}

function isGameOver() {
    return gameState.phase === 'gameOver';
}

/** Aborts the current resolution pipeline if the game has ended. */
function assertRunning() {
    if (isGameOver()) throw new GameOverSignal();
}
