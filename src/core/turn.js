// ============================================================================
// TURN LIFECYCLE
//
// Short, because durations are absolute deadlines (see timing.js) rather than
// counters that have to be decremented in the right order. The original
// endTurn() was ~260 lines of interleaved clearing with comments explaining
// which turn each line was compensating for; nearly all of it is now unnecessary.
//
// What genuinely has to happen at a turn boundary:
//   * drop this-turn-only damage bonuses that were never spent
//   * roll the per-turn action budget
//   * re-enable abilities
//   * check the turn limit
//   * hand over
// ============================================================================

async function startGame() {
    gameState.phase = 'playing';
    gameState.turnNumber = 1;
    gameState.currentTurn = Rng.flip() === 'heads' ? 'player' : 'opponent';
    turnTracker.clear();

    Render.all();
    await Log.say(
        `${subject(gameState.currentTurn)} ${verb(gameState.currentTurn, 'goes', 'go')} first.`,
        { kind: 'turn', icon: '🎬' }
    );
    await beginTurn();
}

/** Clears the bonuses that only ever applied to the turn just finishing. */
function clearEndOfTurnBonuses(side) {
    const f = gameState[side].flags;
    f.auraOfStrengthBonus = 0;
    f.sturdyPresenceBonus = 0;
    f.warriorModeBonus = 0;
    f.thunderRush = false;
    f.booster = false;
    f.rainbowStrike = false;
    f.phaseShift = false;
}

/** Resets a side's per-turn action budget. */
function resetTurnBudget(side) {
    const s = gameState[side];
    s.energyAttachedThisTurn = false;
    s.hasAttacked = false;
    s.itemUsedThisTurn = false;
    s.flags.fluxCheckDone = false;
    s.flags.fluxCheckPassed = false;
}

function resetAbilityUses(side) {
    for (const card of creaturesInPlay(side)) {
        card.abilityUsedThisTurn = false;
    }
}

/** Ends the current turn and hands over. */
async function endTurn() {
    if (isGameOver()) return;
    if (gameState.phase !== 'playing') return;

    const ending = gameState.currentTurn;

    clearEndOfTurnBonuses(ending);

    // Turn limit is checked before handing over, so turn 30 is really the last.
    if (gameState.turnNumber >= MAX_TURNS) {
        await endGameOnTurnLimit();
        return;
    }

    gameState.currentTurn = foeOf(ending);
    gameState.turnNumber++;

    await beginTurn();
}

/** Starts the turn for gameState.currentTurn. */
async function beginTurn() {
    const side = gameState.currentTurn;

    resetTurnBudget(side);
    resetAbilityUses(side);
    turnTracker.clear();

    Render.all();
    await Log.turnBanner(side, gameState.turnNumber);

    // Draw for the turn.
    const drawn = drawCards(side, 1);
    if (drawn === 0) {
        await Log.say(`${possessive(side)} deck is empty.`, { kind: 'info', pace: 0.5 });
    }

    await announceActiveRestrictions(side);

    Render.all();

    if (side === 'opponent' || Automation.playBothSides) {
        await runAiTurn(side);
    }
}

/**
 * Tells the player up front why they can't do something this turn, instead of
 * only finding out when a button is missing.
 */
async function announceActiveRestrictions(side) {
    const s = gameState[side];

    if (Timing.active(s.flags.invincibleLockUntil)) {
        await Log.say(
            `${subject(side)} cannot attack for ${Timing.describe(s.flags.invincibleLockUntil)} (Invincible Gambit).`,
            { kind: 'status', icon: '🚫', pace: 0.6 }
        );
    }
    if (Timing.active(s.flags.cantAttackUntil)) {
        await Log.say(`${subject(side)} cannot attack this turn (Quick Reflexes).`,
            { kind: 'status', icon: '🚫', pace: 0.6 });
    }
    if (Timing.active(s.flags.cantDealDamageUntil)) {
        await Log.say(`${subject(side)} will deal no damage this turn (Tidal Illusion).`,
            { kind: 'status', icon: '🌊', pace: 0.6 });
    }
    if (Timing.active(s.flags.cantUseItemsUntil)) {
        await Log.say(`${subject(side)} cannot use items this turn (Mirage Shield).`,
            { kind: 'status', icon: '🔮', pace: 0.6 });
    }
    if (s.active && Timing.active(s.active.flags.cantAttackUntil)) {
        await Log.say(`${creatureName(s.active, side)} cannot attack this turn (Wing Slap).`,
            { kind: 'status', icon: '💤', pace: 0.6 });
    }
}

/** "Done"/"End Turn" from the player. */
async function playerEndTurn() {
    if (gameState.currentTurn !== 'player') return;
    if (gameState.busy) return;
    await runExclusive(async () => {
        await resolveKnockouts();
        await endTurn();
    });
}

/**
 * Serialises a resolution pipeline: blocks input while it runs and swallows the
 * GameOverSignal used to unwind everything the moment the game ends.
 */
async function runExclusive(work) {
    if (gameState.busy) return;
    gameState.busy = true;
    Render.controls();
    try {
        await work();
    } catch (err) {
        if (!(err instanceof GameOverSignal)) throw err;
    } finally {
        gameState.busy = false;
        Render.all();
    }
}
