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
        auraOfStrengthBonus: 0,     // cleared at the end of this side's turn
        sturdyPresenceBonus: 0,
        warriorModeBonus: 0,
        thunderRush: false,         // doubles this turn's attack

        // --- Damage reduction -----------------------------------------------
        // { amount, until } records keyed by id. See grantSideShield().
        // monksFury | spectralBurst | defenseAura | hardAsSteel |
        // shieldBarrier | galeShield | caprineGuard
        shields: {},

        // --- Protective auras, each an absolute turn deadline ---------------
        guardianModeUntil: null,    // -10 to all damage this side takes
        clarityAuraUntil: null,     // blocks Hallucination on this side
        camouflageUntil: null,      // this side's bench cannot be damaged

        // --- Restrictions on THIS side, as absolute deadlines --------------
        cantAttackUntil: null,      // Quick Reflexes
        cantDealDamageUntil: null,  // Tidal Illusion
        cantUseItemsUntil: null,    // Mirage Shield
        invincibleLockUntil: null,  // Invincible Gambit

        // --- Misc -----------------------------------------------------------
        rainbowStrike: false,       // this turn's attack also hits the bench
        phaseShift: false,          // must swap out after attacking
        guardianIndex: null,        // bench slot soaking damage for the active
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
        // mindRipple | cottonGuard | elementalFortitude
        shields: {},

        // --- Protective auras ----------------------------------------------
        metalicProtectionUntil: null,  // immune to Mechanic damage
        hydrationUntil: null,          // immune to status conditions
        aquaMirrorUntil: null,         // reflects status back at the attacker

        // --- Reactive / continuous while in play ---------------------------
        retaliationStone: false,    // deals 20 back when damaged
        absorbEnergy: false,        // healing also attaches energy
        energizedHealing: 0,        // energy attachment also heals this much
        healingRetreat: 0,          // heals this much when retreating
        guardian: false,            // soaks damage for the active creature

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
    return {
        id: cardId,
        data,
        damage: 0,
        energy: 0,
        status: new Set(),
        abilityUsedThisTurn: false,
        evolutionId: newEvolutionId(),
        evolutionChain: [],
        flags: createCreatureFlags()
    };
}

/** Restores an instance to pristine condition (Revive Crystal). */
function resetCardInstance(card) {
    card.damage = 0;
    card.energy = 0;
    card.status = new Set();
    card.abilityUsedThisTurn = false;
    card.flags = createCreatureFlags();
    return card;
}

const gameState = {
    player: createSide(),
    opponent: createSide(),
    currentTurn: null,          // 'player' | 'opponent'
    turnNumber: 0,
    phase: 'deckSelection',     // deckSelection | setup | playing | gameOver
    setupReady: { player: false, opponent: false },
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
    gameState.turnNumber = 0;
    gameState.phase = 'deckSelection';
    gameState.setupReady = { player: false, opponent: false };
    gameState.busy = false;
    turnTracker.clear();
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
