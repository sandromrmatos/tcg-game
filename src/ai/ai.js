// ============================================================================
// AI OPPONENT
//
// The AI is a policy, not a rules engine. It decides WHAT to do and then calls
// exactly the same functions the player's UI calls, so it cannot play by
// different rules — which is what went wrong in the original, where the AI had
// its own copies of the attack pipeline, the ability list and the item list.
//
// Every function takes the side it is playing, so the same policy can drive
// either seat. test.html uses that to play both sides and fuzz whole games.
//
// Turn order:
//   1. retreat if the active creature is in trouble
//   2. play one item
//   3. fill the bench with Stage 1 creatures
//   4. evolve everything it can
//   5. attach the turn's energy
//   6. use abilities
//   7. attack, or end the turn
// ============================================================================

/** When active, prompts resolve through AI heuristics for BOTH sides. */
const Automation = {
    active: false,        // headless: never wait for a human choice
    playBothSides: false,
    // Chance of picking a random legal move instead of the best one. Zero in
    // normal play; the fuzzer raises it so rarely-optimal moves still get
    // exercised, which is how a move like Chill Recharge gets covered at all.
    exploreRate: 0
};

async function runAiTurn(side = 'opponent') {
    if (gameState.currentTurn !== side) return;

    try {
        // A moment to take in the board before the AI starts acting. Each
        // step below also pauses (Log.aiPause), so its turn can be followed.
        await Log.aiPause(side, 0.6);

        await aiUseElixirs(side);
        assertRunning();

        await aiConsiderRetreat(side);
        assertRunning();

        await aiPlayItem(side);
        assertRunning();

        await aiPlayCreatures(side);
        assertRunning();

        await aiEvolveAll(side);
        assertRunning();

        // After evolving, so the accessory goes on the final form's type.
        await aiPlayAccessory(side);
        assertRunning();

        await aiAttachEnergy(side);
        assertRunning();

        await aiUseAbilities(side);
        assertRunning();

        await aiPlayBoostItem(side);
        assertRunning();

        await Log.aiPause(side, 0.8);
        await aiAttackOrPass(side);
    } catch (err) {
        if (err instanceof GameOverSignal) return;
        console.error('AI turn failed:', err);
        // Never leave the game wedged on an AI error.
        if (!isGameOver()) await endTurn();
    }
}

// ---------------------------------------------------------------------------
// 1. Retreat
// ---------------------------------------------------------------------------

async function aiConsiderRetreat(side) {
    const active = gameState[side].active;
    if (!active) return;

    const hp = remainingHp(active);
    const inTrouble = hp < maxHp(active) * 0.4 || hp < 30;
    if (!inTrouble) return;

    // Goes through the shared legality check, so Tempest Hold and Ethereal
    // Snare bind the AI exactly as they bind the player.
    if (!creatureCanRetreat(active, side).ok) return;

    const candidates = boardCandidates(side, c => c.location === 'bench')
        .filter(c => affordableMoves(c.card).length > 0);
    if (candidates.length === 0) return;

    const replacement = healthiestAttacker(candidates);
    if (!replacement) return;

    // Healing Retreat is always on: performRetreat heals on its own.
    await performRetreat(side, replacement.index);
    await Log.aiPause(side, 0.6);
}

/** Moves this creature could pay for right now, ignoring turn state. */
function affordableMoves(card) {
    return movesOf(card.data).filter(m => canPayMove(card, m));
}

// ---------------------------------------------------------------------------
// 2. Items
// ---------------------------------------------------------------------------

async function aiPlayItem(side) {
    if (!sideCanUseItem(side).ok) return;

    const items = gameState[side].hand.filter(c => isItem(c.data));
    for (const card of items) {
        // Damage boosts wait for aiPlayBoostItem, just before the attack.
        const def = ItemRegistry.get(card.data.itemEffect);
        if (def && def.late) continue;
        if (!ItemRegistry.aiWants(card, side)) continue;
        await ItemRegistry.use(card, side, gameState[side].hand.indexOf(card));
        await resolveKnockouts();
        return;   // one item per turn
    }
}

/** One accessory a turn, on the creature it helps most. */
async function aiPlayAccessory(side) {
    if (!AccessoryRegistry.sideCanAttach(side).ok) return;
    const options = gameState[side].hand.filter(c => isAccessory(c.data) && AccessoryRegistry.canUse(c, side).ok);
    if (options.length === 0) return;
    const card = options[0];
    await AccessoryRegistry.attach(card, side);
    await Log.aiPause(side, 0.5);
}

/** Neutral Elixir: pull a creature about to be knocked out back to the hand. */
async function aiUseElixirs(side) {
    for (const card of creaturesInPlay(side)) {
        if (!aiWantsElixir(card, side)) continue;
        await AccessoryRegistry.activate(card, side);
        assertRunning();
        await Log.aiPause(side, 0.5);
    }
}

// ---------------------------------------------------------------------------
// 3. Creatures to the bench
// ---------------------------------------------------------------------------

async function aiPlayCreatures(side) {
    const s = gameState[side];

    for (;;) {
        const slot = s.bench.findIndex(c => !c);
        if (slot === -1) break;

        const stage1 = s.hand
            .map((card, index) => ({ card, index }))
            .filter(entry => entry.card.data.stage === 'Stage 1');
        if (stage1.length === 0) break;

        // Strongest first, so the bench holds real threats rather than filler.
        stage1.sort((a, b) => creatureValue(b.card) - creatureValue(a.card));

        await playCreatureToBench(side, stage1[0].index, slot);
        assertRunning();
        await Log.aiPause(side, 0.4);
    }
}

function creatureValue(card) {
    const best = movesOf(card.data)
        .reduce((max, m) => Math.max(max, m.damage || 0), 0);
    return card.data.hp + best;
}

// ---------------------------------------------------------------------------
// 4. Evolution
// ---------------------------------------------------------------------------

async function aiEvolveAll(side) {
    // Each evolution can enable another, so keep going until nothing changes.
    for (let guard = 0; guard < 12; guard++) {
        const evolved = await aiEvolveOnce(side);
        if (!evolved) break;
        assertRunning();
    }
}

async function aiEvolveOnce(side) {
    const s = gameState[side];

    for (let handIndex = 0; handIndex < s.hand.length; handIndex++) {
        const card = s.hand[handIndex];
        if (!isCreature(card.data) || card.data.stage === 'Stage 1') continue;

        const targets = evolutionTargets(side, card);
        if (targets.length === 0) continue;

        // Evolve the active creature first: it is the one that is fighting.
        const target = targets.find(t => t.location === 'active') || targets[0];
        await evolveCreature(side, handIndex, target.location, target.index);
        return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// 5. Energy
// ---------------------------------------------------------------------------

async function aiAttachEnergy(side) {
    if (!canAttachEnergy(side).ok) return;

    const active = gameState[side].active;
    const type = turnEnergyType(side);
    const bench = boardCandidates(side, c => c.location === 'bench');
    const benchTarget = bench.length ? bestEnergyTarget(bench, type) : null;
    const benchHelps = !!benchTarget && energyHelpScore(benchTarget.card, type) > 0;

    // Charge the active creature while this energy still gets it closer to a
    // move, then build up the bench. A Flux active risks losing the energy, so
    // a bench creature it helps is taken first.
    const activeHelps = !!active && energyHelpScore(active, type) > 0;
    const activeInFlux = !!active && Status.has(active, 'flux');
    if (activeHelps && !(activeInFlux && benchHelps)) {
        await attachTurnEnergy(side, active);
        return;
    }
    if (benchTarget && (benchHelps || !active)) {
        await attachTurnEnergy(side, benchTarget.card);
    } else if (active && !activeInFlux) {
        await attachTurnEnergy(side, active);
    } else if (benchTarget) {
        await attachTurnEnergy(side, benchTarget.card);
    }
}

// ---------------------------------------------------------------------------
// 6. Abilities
// ---------------------------------------------------------------------------

async function aiUseAbilities(side) {
    // Active first, then bench. Every ability in the registry is available;
    // whether to use one is the registry entry's aiWants decision.
    for (const spot of boardCandidates(side)) {
        const card = spot.card;
        if (!card.data.abilityEffect) continue;
        if (!AbilityRegistry.canUse(card, side, spot.location).ok) continue;
        if (!AbilityRegistry.aiWants(card, side, spot.location, spot.index)) continue;

        await AbilityRegistry.use(card, side, spot.location, spot.index);
        assertRunning();
        await Log.aiPause(side, 0.6);
    }
}

// ---------------------------------------------------------------------------
// 7. Attack
// ---------------------------------------------------------------------------

async function aiAttackOrPass(side) {
    const choice = aiChooseMove(side);
    if (!choice) {
        await endTurn();
        return;
    }
    // resolveAttack runs the shared pipeline and ends the turn itself.
    await resolveAttack(side, choice.number);
}

/**
 * A bounded, read-only tactical estimate for effects whose value is not direct
 * damage. Combat remains authoritative in the effect registry: this only helps
 * the AI choose between legal moves and must never mutate state or roll RNG.
 */
function estimateMoveTacticalValue(move, side) {
    const attacker = gameState[side].active;
    const defender = gameState[foeOf(side)].active;
    if (!attacker || !defender || !move.effect) return 0;

    const missingHp = card => Math.max(0, maxHp(card) - remainingHp(card));
    const ownBench = gameState[side].bench.filter(Boolean);
    const foeBench = gameState[foeOf(side)].bench.filter(Boolean);
    const defenderHas = status => defender.status?.has(status);
    const statusValue = (status, value, chance = 1) => defenderHas(status) ? 0 : value * chance;

    switch (move.effect) {
        // Disruption is valuable only while it can land on a fresh active target.
        case 'mindMirage': case 'phantomPulse': case 'brainFreeze':
            return statusValue('hallucination', 18);
        case 'dreamwave': case 'dreamBooster': case 'mindPulse':
            return statusValue('hallucination', 18, 0.5);
        case 'fluxWave': case 'psychicProwl':
            return statusValue('flux', 12);
        case 'spectralSlice': return statusValue('flux', 12, 0.5);
        case 'forestFury': return statusValue('lock', 10);
        case 'chaosDice':
            return defender.status?.size ? 0 : 13; // expected value of one of three conditions
        case 'cantRetreat': return foeBench.length ? 10 : 0;

        // Reward actual recoverable health rather than a fixed maximum heal.
        case 'healingRoots': case 'minorMend': case 'planetBurst':
            return Math.min(20, missingHp(attacker)) * 0.8;
        // Heals 30 on every damaged creature: the attacker, then the bench.
        case 'healingSap':
            return Math.min(30, missingHp(attacker)) * 0.8 +
                ownBench.reduce((sum, card) => sum + Math.min(30, missingHp(card)) * 0.35, 0);
        case 'majorMend': return Math.min(20, missingHp(attacker)) * 0.9;
        case 'coffeeHeal':
            return ownBench.length ? Math.min(10, Math.max(...ownBench.map(missingHp))) * 0.7 : 0;
        case 'beanBlast':
            return ownBench.length ? Math.min(20, Math.max(...ownBench.map(missingHp))) * 0.7 : 0;
        case 'berryBurst': case 'laughingLeaves':
            return ownBench.reduce((sum, card) => sum + Math.min(20, missingHp(card)) * 0.35, 0);
        case 'chillRecharge': return Math.min(10, missingHp(attacker)) * 0.7 + 14;

        // Board pressure and future resources; values are intentionally lower
        // than a clean active hit so they cannot eclipse a real knockout.
        case 'mysticBlaze': return foeBench.reduce((sum, card) => sum + Math.min(30, remainingHp(card)) * 0.45, 0);
        case 'solarAscend': return foeBench.reduce((sum, card) => sum + Math.min(10, remainingHp(card)) * 0.25, 0);
        case 'metallicWing': return 13;
        case 'skyDraw': return gameState[side].deck.length ? 9 : 0;
        case 'energySnatch':
            return gameState[foeOf(side)].active.energy > 0 || foeBench.some(card => card.energy > 0) ? 11 : 0;
        case 'creamyConfection': return ownBench.length ? 4 : -10;
        case 'sproutBoost': return 20;
        case 'mindRipple': case 'cottonGuard': return 12;
        case 'monksFury': return 6;
        case 'spectralBurst': return 8;
        case 'tidalIllusion': return 13;
        // Half the time the opponent's next energy is Celestial: only a
        // nuisance if their deck doesn't use Celestial energy.
        case 'starfallStrike':
            return (gameState[foeOf(side)].energyTypes || []).includes('Celestial') ? 0 : 6;

        // Put a cost on effects whose downside is not reflected in printed damage.
        case 'recoil20': case 'infernoWing': return -Math.min(20, remainingHp(attacker)) * 0.35;
        case 'recoil40': return -Math.min(40, remainingHp(attacker)) * 0.35;
        case 'discard2Energy': return attacker.energy >= 2 ? -12 : 0;
        case 'overdriveSmash': case 'wingSlap': return -14;
        case 'tempestHold': return -5;
        case 'invincibleGambit': return -80;

        // Temporal Rift
        case 'destinedFate': return defender.status?.size ? 0 : 14;
        case 'mistralVeil':
            return /Stage [23]/.test(defender.data.stage) ? statusValue('flux', 12) : 0;
        case 'tailNuzzle': return 12;                 // 50% of a lost attack
        case 'cuddleStorm': return 5;
        case 'cryoRoar': return 3;
        case 'alloyClutch': return 6;
        case 'mementoEcho': return 10;
        case 'bloomshroud': return 10;
        case 'oreLash': return 12;
        case 'coreTangle': return 20;
        case 'anchoredTerrain': return getCardType(defender.data) === 'Mechanic' ? 25 : 4;
        case 'energyDrain': return defender.energy > 0 ? 14 : 0;
        case 'violetVeil': return Math.min(maxHp(attacker), missingHp(attacker)) * 0.45;
        case 'sweetHeal': return Math.min(10 * sweetCount(side), missingHp(attacker)) * 0.8;
        case 'citrusBloom': case 'vitaminBurst': {
            const amount = move.effect === 'citrusBloom' ? 10 : 20;
            const best = Math.max(0, ...creaturesInPlay(side).map(missingHp));
            return Math.min(amount, best) * 0.75;
        }
        case 'sweetSneak':
            return foeBench.length ? Math.min(10 * sweetCount(side), Math.min(...foeBench.map(remainingHp))) * 0.4 : 0;
        case 'tempestDive':
            return foeBench.reduce((sum, card) => sum + Math.min(20, remainingHp(card)) * 0.45, 0);
        case 'magnetarcNeedle': return gameState[foeOf(side)].hand.length ? 6 : 0;
        case 'superRoar': return foeBench.length ? 5 : 0;
        case 'stormsChance': return -Math.min(20, creaturesInPlay(side).reduce((s, c) => s + c.energy, 0) * 4) - 10;
        default: return 0;
    }
}

/**
 * Would a damage-boosting item change THIS turn's attack? True only when the
 * side can attack now, the move it will use deals damage, the boost applies
 * to the active creature (Amulet: Neutral only), and the extra damage isn't
 * cancelled (Tidal Illusion, Bloomshroud...) or wasted into Overload Guard.
 * Read-only.
 * @param {object} o { bonus, neutralOnly }
 */
function aiBoostPaysOff(side, { bonus, neutralOnly = false }) {
    if (!sideWillAttackThisTurn(side)) return false;
    const active = gameState[side].active;
    const defender = gameState[foeOf(side)].active;
    if (!active || !defender) return false;
    if (neutralOnly && getCardType(active.data) !== 'Neutral') return false;
    const move = aiChooseMove(side, { explore: false });
    if (!move) return false;
    const base = estimateMoveDamage(move, side);
    if (!(base > 0)) return false;
    const without = aiProjectedDamage(move, side, base);
    const withBoost = aiProjectedDamage(move, side, base + bonus);
    if (cardAbilityOn(defender, 'overloadGuard') && withBoost >= 50) return false;
    return withBoost > without;
}

/**
 * Items marked `late` (the damage boosts, and Mystic Scroll, which ends the
 * turn) go in last, after energy and abilities, so the AI knows whether it
 * really attacks this turn and with what.
 */
async function aiPlayBoostItem(side) {
    if (!sideCanUseItem(side).ok) return;
    for (const card of gameState[side].hand.filter(c => isItem(c.data))) {
        const def = ItemRegistry.get(card.data.itemEffect);
        if (!def || !def.late || !ItemRegistry.aiWants(card, side)) continue;
        await ItemRegistry.use(card, side, gameState[side].hand.indexOf(card));
        await resolveKnockouts();
        await Log.aiPause(side, 0.5);
        return;
    }
}

/**
 * The damage a move would really deal after every bonus and shield, except
 * Overload Guard itself. Read-only: runs the modifier table without spending
 * single-use bonuses or logging.
 */
function aiProjectedDamage(move, side, baseDamage) {
    const attacker = gameState[side].active;
    const defender = gameState[foeOf(side)].active;
    if (!attacker || !defender || !(baseDamage > 0)) return 0;
    const ctx = makeContext(side, {
        attacker, defender, move, damage: baseDamage,
        attackerType: getCardType(attacker.data),
        defenderType: getCardType(defender.data)
    });
    let damage = baseDamage;
    for (const mod of DAMAGE_MODIFIERS) {
        if (mod.id === 'overloadGuard' || !mod.test(ctx)) continue;
        damage = Math.max(0, mod.apply(ctx, damage));
    }
    return damage;
}

/** Picks the best legal move, prioritising a real knockout over tactical value. */
function aiChooseMove(side, { explore = true } = {}) {
    const legal = usableMoves(side);
    if (legal.length === 0) return null;

    if (explore && Automation.exploreRate > 0 && Rng.float() < Automation.exploreRate) {
        return Rng.pick(legal);
    }

    const defender = gameState[foeOf(side)].active;
    const defenderHp = defender ? remainingHp(defender) : 0;

    const scored = legal.map(move => {
        let damage = estimateMoveDamage(move, side);
        // Overload Guard (Ignivault): an attack that lands 50 or more does
        // nothing, so a smaller hit is the better move.
        if (defender && cardAbilityOn(defender, 'overloadGuard') &&
            aiProjectedDamage(move, side, damage) >= 50) {
            damage = 0;
        }
        const tactical = estimateMoveTacticalValue(move, side);
        // A knockout is worth far more than any tactical upside.
        const lethal = defender && damage >= defenderHp;
        return { move, score: damage + tactical + (lethal ? 1000 : 0) };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
}
