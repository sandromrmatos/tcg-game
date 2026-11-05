// ============================================================================
// KNOCKOUTS AND GAME END
//
// One sweep resolves every fainted creature on the board, wherever the damage
// came from. The original called knockoutCreature() from ~20 scattered places,
// each responsible for remembering to discard the evolution chain, award the
// point, check for the win and prompt for a replacement — and they didn't all
// do the same things.
// ============================================================================

/**
 * Moves a creature and its whole evolution chain to the discard pile.
 * A knocked-out Stage 3 sends all three cards, which is why the chain is
 * tracked on the instance.
 */
function discardCreature(side, card) {
    const pile = gameState[side].discardPile;
    if (card.evolutionChain && card.evolutionChain.length > 0) {
        for (const previous of card.evolutionChain) pile.push(previous);
    }
    pile.push(card);
}

/** Awards a point and ends the game if it was the winning one. */
async function awardPoint(side) {
    gameState[side].points++;
    Render.scores();
    await Log.say(
        `${subject(side)} ${verb(side, 'scores', 'score')} a point ` +
        `(${gameState[side].points}/${POINTS_TO_WIN}).`,
        { kind: 'point', icon: '⭐', side }
    );

    if (gameState[side].points >= POINTS_TO_WIN) {
        await endGame(side, `${subject(side)} reached ${POINTS_TO_WIN} points.`);
    }
}

/**
 * Resolves every fainted creature, looping until the board is stable, then
 * checks for a side that has run out of creatures.
 *
 * Safe to call any number of times; it does nothing when nothing has fainted.
 */
async function resolveKnockouts() {
    if (isGameOver()) return;

    for (let pass = 0; pass < 12; pass++) {
        let acted = false;

        // Bench first, so an area-of-effect move reports all its kills before
        // anyone is asked to promote a replacement.
        for (const side of SIDES) {
            const bench = gameState[side].bench;
            for (let i = 0; i < bench.length; i++) {
                const card = bench[i];
                if (!isFainted(card)) continue;

                await Log.say(
                    `${creatureName(card, side)} was knocked out on the bench!`,
                    { kind: 'ko', icon: '☠️' }
                );
                await Status.clear(card, { silent: true });
                discardCreature(side, card);
                bench[i] = null;
                Render.all();
                acted = true;

                await awardPoint(foeOf(side));
                assertRunning();
            }
        }

        for (const side of SIDES) {
            const active = gameState[side].active;
            if (!isFainted(active)) continue;

            await Log.say(
                `${creatureName(active, side)} was knocked out!`,
                { kind: 'ko', icon: '☠️' }
            );
            await Status.clear(active, { silent: true });
            discardCreature(side, active);
            gameState[side].active = null;
            Render.all();
            acted = true;

            await awardPoint(foeOf(side));
            assertRunning();

            await promoteFromBench(side);
            assertRunning();
        }

        if (!acted) break;
    }

    await checkForEmptyBoard();
}

/**
 * Asks a side to promote a bench creature into the empty active slot.
 * The player picks; the AI takes its healthiest usable creature.
 */
async function promoteFromBench(side) {
    if (gameState[side].active) return;

    const available = benchCreatures(side);
    if (available.length === 0) return;   // handled by checkForEmptyBoard

    const choice = await chooseCreatureOf(side, {
        title: 'Choose a creature to bring into the active spot',
        filter: c => c.location === 'bench',
        aiPick: candidates => healthiestAttacker(candidates)
    });

    const index = choice ? choice.index : gameState[side].bench.findIndex(c => c);
    const card = gameState[side].bench[index];
    gameState[side].bench[index] = null;
    gameState[side].active = card;

    // A creature arriving from the bench is always clean. Status only ever
    // exists on the active creature, so there is nothing to carry in.
    card.status.clear();
    card.flags.hallucinationFlip = null;

    Render.all();
    await Log.say(
        `${creatureName(card, side)} steps up to the active spot.`,
        { kind: 'info', icon: '⬆️' }
    );
}

/** A side with no creatures left loses immediately. */
async function checkForEmptyBoard() {
    if (isGameOver()) return;
    if (gameState.phase !== 'playing') return;

    for (const side of SIDES) {
        const hasAny = gameState[side].active || benchCreatures(side).length > 0;
        if (!hasAny) {
            await endGame(foeOf(side), `${subject(side)} ${verb(side, 'has', 'have')} no creatures left.`);
            return;
        }
    }
}

/** Turn limit reached: whoever has more points wins. */
async function endGameOnTurnLimit() {
    const p = gameState.player.points;
    const o = gameState.opponent.points;
    if (p > o) await endGame('player', `Turn limit reached, ${p}-${o}.`);
    else if (o > p) await endGame('opponent', `Turn limit reached, ${o}-${p}.`);
    else await endGame('tie', `Turn limit reached, tied ${p}-${o}.`);
}

async function endGame(winner, reason) {
    if (isGameOver()) return;
    gameState.phase = 'gameOver';
    Prompt.cancelAll();

    const message = winner === 'tie'
        ? "It's a draw!"
        : (winner === 'player' ? 'You win!' : 'The AI wins.');

    Log.write(`${message} ${reason}`, { kind: 'point', icon: '🏁' });
    Render.all();

    // Collection layer: record the result and pay the daily win credit. Only
    // real games have an active match; QA games and test harnesses don't.
    let reward = null;
    if (typeof Profile !== 'undefined' && Profile.hasActiveMatch()) {
        reward = Profile.finishMatch(winner, `${gameState.player.points}-${gameState.opponent.points}`,
            playerMatchReport(winner === 'player'));
    }
    Screens.showGameOver(winner, message, reason, reward);
    reportResultToArcade(winner);
}

/**
 * What the player did this match, for the per-card achievements: the cards
 * they put into play, attacks per card, the cards still standing at a win, and
 * the primary type of the AI's deck.
 */
function playerMatchReport(won) {
    const t = gameState.track.player;
    const opponentDeck = DeckLibrary.get(gameState.opponent.selectedDeck);
    return {
        won: !!won,
        played: Array.from(t.played),
        attacks: Object.assign({}, t.attacks),
        survivors: won ? Array.from(cardsStillInPlay('player')) : [],
        opponentType: opponentDeck ? deckPrimaryType(opponentDeck.cards) : null
    };
}

/** Reports the result to the surrounding arcade shell, if there is one. */
function reportResultToArcade(winner) {
    if (winner === 'tie') return;
    if (!(window.parent && window.parent.saveGameScore)) return;

    const playerDeck = DeckLibrary.get(gameState.player.selectedDeck);
    const opponentDeck = DeckLibrary.get(gameState.opponent.selectedDeck);
    try {
        window.parent.saveGameScore('TCG Game', {
            result: winner === 'player' ? 'win' : 'loss',
            playerDeck: playerDeck ? playerDeck.name : 'unknown',
            opponentDeck: opponentDeck ? opponentDeck.name : 'unknown'
        }).then(saveResult => {
            if (saveResult && saveResult.isNewBest && window.parent.showNewBestScore) {
                window.parent.showNewBestScore('TCG Game', { result: 'win' });
            }
        }).catch(err => console.error('Could not save result:', err));
    } catch (err) {
        console.error('Could not save result:', err);
    }
}
