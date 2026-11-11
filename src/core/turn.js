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
    // SIDES rather than literal names: in online play the guest's SIDES is
    // reversed, so the same seeded flip picks the same player on both devices.
    gameState.currentTurn = Rng.flip() === 'heads' ? SIDES[0] : SIDES[1];
    gameState.firstTurnSide = gameState.currentTurn;
    turnTracker.clear();

    // The board was hidden during setup; everything placed is now revealed.
    for (const side of SIDES) {
        for (const card of creaturesInPlay(side)) trackPlayed(side, card.id);
    }

    // A real match remembers who started, for the first/second win rates.
    if (typeof Profile !== 'undefined' && Profile.hasActiveMatch && Profile.hasActiveMatch()) {
        Profile.setMatchStarter(gameState.firstTurnSide === 'player');
    }

    Render.all();
    const starter = gameState.firstTurnSide;
    await Log.say(
        `${subject(starter)} ${verb(starter, 'goes', 'go')} first.`,
        { kind: 'turn', icon: '🎬' }
    );
    await beginTurn();
}

/** Clears the bonuses that only ever applied to the turn just finishing. */
function clearEndOfTurnBonuses(side) {
    const f = gameState[side].flags;
    f.booster = false;
    f.phaseShift = false;
}

/** Resets a side's per-turn action budget. */
function resetTurnBudget(side) {
    const s = gameState[side];
    s.energyAttachedThisTurn = false;
    s.hasAttacked = false;
    s.itemUsedThisTurn = false;
    s.accessoryUsedThisTurn = false;
    s.retreatedThisTurn = false;
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

    // Metalic Protection (always on): "...but it loses 20 hp", at the end of
    // each of its owner's turns.
    const steel = creaturesWithAbility(ending, 'metalicProtection');
    for (const card of steel) {
        AbilityRegistry.noteTriggered('metalicProtection');
        await damageCreature(card, 20, { side: ending, reason: 'Metalic Protection' });
    }
    if (steel.length) await resolveKnockouts();
    if (isGameOver()) return;

    // Forest Kin (Florvulpa), always on: "When your turn ends, you may search
    // your deck for a card that evolves from Vulpetta and add it to your hand."
    await forestKinSearch(ending);

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

    // This turn's energy type, rolled now so the player sees it before
    // attaching. Starfall Strike can force it to Celestial for one turn.
    const f = gameState[side].flags;
    if (f.forcedEnergyType && Timing.active(f.forcedEnergyUntil)) {
        gameState[side].turnEnergyType = f.forcedEnergyType;
        await Log.say(`Starfall Strike: ${possessive(side).toLowerCase()} energy this turn is ${f.forcedEnergyType}.`,
            { kind: 'status', icon: ENERGY_ICONS[f.forcedEnergyType] || '⚡', pace: 0.7 });
    } else {
        gameState[side].turnEnergyType = rollEnergyType(side);
    }
    f.forcedEnergyType = null;
    f.forcedEnergyUntil = null;

    // Draw for the turn. The side going first skips it on turn 1.
    if (isStarterFirstTurn(side)) {
        const who = side === 'player' ? 'you skip'
            : subject(side) === 'The AI' ? 'the AI skips' : `${subject(side)} skips`;
        await Log.say(`Going first: ${who} the draw and cannot attack this turn. Energy can still be attached.`,
            { kind: 'info', icon: 'ℹ️', pace: 0.9 });
    } else {
        const drawn = drawCards(side, 1);
        if (drawn === 0) {
            await Log.say(`${possessive(side)} deck is empty.`, { kind: 'info', pace: 0.5 });
        }
    }

    // Start-of-turn rules: Celestial Armor heals; a Bloomshroud the other
    // side set up is flipped for now.
    await accessoriesOnTurnStart(side);
    await flipBloomshrouds(side);
    await resolveKnockouts();
    if (isGameOver()) return;

    await announceActiveRestrictions(side);

    Render.all();

    // Online PvP: no AI. The 60-second clock starts, and on the other
    // player's turn their actions are replayed as they arrive.
    if (typeof PvP !== 'undefined' && PvP.active) {
        PvP.onTurnStart(side);
        if (side === 'opponent') await PvP.runRemoteTurn(side);
        return;
    }

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
            `${subject(side)} ${verb(side, 'deals', 'deal')} no damage this turn (Invincible Gambit, ${Timing.describe(s.flags.invincibleLockUntil)} left).`,
            { kind: 'status', icon: '🚫', pace: 0.6 }
        );
    }
    if (Timing.active(s.flags.cantAttackUntil)) {
        await Log.say(`${subject(side)} cannot attack this turn.`,
            { kind: 'status', icon: '🚫', pace: 0.6 });
    }
    if (Timing.active(s.flags.cantEvolveUntil)) {
        await Log.say(`${subject(side)} cannot evolve this turn (Cuddle Storm).`, { kind: 'status', icon: '🧸', pace: 0.6 });
    }
    if (Timing.active(s.flags.cantUseAccessoriesUntil)) {
        await Log.say(`${subject(side)} cannot use accessory cards this turn.`, { kind: 'status', icon: '🧊', pace: 0.6 });
    }
    if (abilitiesBlocked(side)) {
        await Log.say(`${subject(side)} cannot use abilities this turn (Memento Echo).`, { kind: 'status', icon: '🔇', pace: 0.6 });
    }
    if (Timing.active(s.flags.cantDealDamageUntil)) {
        await Log.say(`${subject(side)} will deal no damage this turn (Tidal Illusion).`,
            { kind: 'status', icon: '🌊', pace: 0.6 });
    }
    if (hasAbilityAt(gameState[foeOf(side)].active, 'mirageShield', 'active')) {
        AbilityRegistry.noteTriggered('mirageShield');
        await Log.say(`${subject(side)} cannot use items while ${gameState[foeOf(side)].active.data.name} is active (Mirage Shield).`,
            { kind: 'status', icon: '🔮', pace: 0.6 });
    }
    if (s.active && Timing.active(s.active.flags.cantAttackUntil)) {
        await Log.say(`${creatureName(s.active, side)} cannot attack this turn (Wing Slap).`,
            { kind: 'status', icon: '💤', pace: 0.6 });
    }
}

/** Forest Kin: once per turn end, take a Vulpetta evolution from the deck (optional). */
async function forestKinSearch(side) {
    const kin = creaturesWithAbility(side, 'forestKin')[0];
    if (!kin) return;
    const s = gameState[side];
    const ids = [...new Set(s.deck.filter(id => {
        const d = getCardData(id);
        return d && isCreature(d) && d.prevStage === 'Vulpetta';
    }))];
    if (ids.length === 0) return;
    const options = ids.map(id => makeCardInstance(id));
    const index = await chooseCardOf(side, {
        cards: options,
        title: "Forest Kin: take a Vulpetta evolution from your deck?",
        subtitle: 'It goes into your hand.',
        cancellable: true,
        cancelLabel: 'No thanks',
        // The AI takes one it doesn't already hold.
        aiPick: cards => {
            const held = new Set(s.hand.map(c => c.id));
            const fresh = cards.findIndex(c => !held.has(c.id));
            return fresh === -1 ? 0 : fresh;
        }
    });
    if (index === null || index === undefined || !options[index]) return;
    const id = options[index].id;
    s.deck.splice(s.deck.indexOf(id), 1);
    s.hand.push(instanceFromDeck(side, id));
    AbilityRegistry.noteTriggered('forestKin');
    Render.all();
    await Log.say(`${creatureName(kin, side)}'s Forest Kin: ${subject(side).toLowerCase()} ${verb(side, 'takes', 'take')} ` +
        (side === 'player' ? getCardData(id).name : 'a Vulpetta evolution') + ' from the deck.',
        { kind: 'ability', icon: '🦊', pace: 0.6 });
}

/** Bloomshroud: as this side's turn starts, it flips for each shrouded enemy creature. */
async function flipBloomshrouds(side) {
    for (const card of creaturesInPlay(foeOf(side))) {
        if (card.flags.bloomshroudTurn !== gameState.turnNumber) continue;
        card.flags.bloomshroudTurn = null;
        const flip = Rng.flip();
        await Log.coin(flip, `Bloomshroud on ${card.data.name}`);
        if (flip === 'tails') {
            card.flags.bloomshroudSafeTurn = gameState.turnNumber;
            await Log.say(`${creatureName(card, foeOf(side))} can't be damaged or given status conditions this turn!`,
                { kind: 'status', icon: '🌸' });
        } else {
            await Log.say('The petals scatter: Bloomshroud fails.', { kind: 'info', pace: 0.5 });
        }
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
