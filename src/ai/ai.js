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
        await aiConsiderRetreat(side);
        assertRunning();

        await aiPlayItem(side);
        assertRunning();

        await aiPlayCreatures(side);
        assertRunning();

        await aiEvolveAll(side);
        assertRunning();

        await aiAttachEnergy(side);
        assertRunning();

        await aiUseAbilities(side);
        assertRunning();

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
    const inTrouble = hp < active.data.hp * 0.4 || hp < 30;
    if (!inTrouble) return;

    // Goes through the shared legality check, so Tempest Hold and Ethereal
    // Snare bind the AI exactly as they bind the player.
    if (!creatureCanRetreat(active, side).ok) return;

    const candidates = boardCandidates(side, c => c.location === 'bench')
        .filter(c => affordableMoves(c.card).length > 0);
    if (candidates.length === 0) return;

    const replacement = healthiestAttacker(candidates);
    if (!replacement) return;

    // Use Healing Retreat first, so the retreat also heals.
    if (active.data.abilityEffect &&
        active.data.abilityEffect.indexOf('healingRetreat') === 0 &&
        AbilityRegistry.canUse(active, side, 'active').ok) {
        await AbilityRegistry.use(active, side, 'active', null);
    }

    await performRetreat(side, replacement.index);
}

/** Moves this creature could pay for right now, ignoring turn state. */
function affordableMoves(card) {
    return movesOf(card.data).filter(m => card.energy >= m.costCount);
}

// ---------------------------------------------------------------------------
// 2. Items
// ---------------------------------------------------------------------------

async function aiPlayItem(side) {
    if (!sideCanUseItem(side).ok) return;

    const items = gameState[side].hand.filter(c => isItem(c.data));
    for (const card of items) {
        if (!ItemRegistry.aiWants(card, side)) continue;
        await ItemRegistry.use(card, side, gameState[side].hand.indexOf(card));
        await resolveKnockouts();
        return;   // one item per turn
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

    // Charge the active creature until it can pay for its most expensive move,
    // then start building up the bench.
    if (active) {
        const costs = movesOf(active.data).map(m => m.costCount);
        const mostExpensive = costs.length ? Math.max(...costs) : 0;
        if (active.energy < mostExpensive) {
            await attachTurnEnergy(side, active);
            return;
        }
    }

    const bench = boardCandidates(side, c => c.location === 'bench');
    const target = bench.length ? bestEnergyTarget(bench) : null;
    if (target) {
        await attachTurnEnergy(side, target.card);
    } else if (active) {
        await attachTurnEnergy(side, active);
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

/** Picks the best legal move, or null if it cannot attack. */
function aiChooseMove(side) {
    const legal = usableMoves(side);
    if (legal.length === 0) return null;

    if (Automation.exploreRate > 0 && Rng.float() < Automation.exploreRate) {
        return Rng.pick(legal);
    }

    const defender = gameState[foeOf(side)].active;
    const defenderHp = defender ? remainingHp(defender) : 0;

    const scored = legal.map(move => {
        const estimate = estimateMoveDamage(move, side);
        // A knockout is worth far more than raw damage.
        const lethal = defender && estimate >= defenderHp;
        return { move, score: estimate + (lethal ? 1000 : 0) };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
}
