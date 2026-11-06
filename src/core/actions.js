// ============================================================================
// PLAYER / AI ACTIONS
//
// Drawing, playing, evolving, attaching energy, retreating and switching.
// Every one is side-agnostic, so the AI drives the same functions the UI does.
// ============================================================================

/**
 * UI bridge: shows a card that was just played in the middle of the screen,
 * then flies it to where it is going. A no-op in the headless harnesses (no
 * Showcase loaded, or Log.speed 0), so the rules never wait on it there.
 *
 * @param {object} opts { label, target: {side, location, index} | {discard: side}, creatureOnly }
 *   creatureOnly: only the opponent's creatures are shown; your own you just placed.
 */
async function showcaseCard(side, cardId, opts = {}) {
    if (typeof Showcase === 'undefined' || !Showcase.enabled()) return;
    if (opts.creatureOnly && side !== 'opponent') return;
    await Showcase.play(cardId, Object.assign({ side }, opts));
}

/**
 * Draws cards from the deck into hand.
 * @returns {number} how many were actually drawn (the deck may run dry)
 */
function drawCards(side, count) {
    const s = gameState[side];
    let drawn = 0;
    for (let i = 0; i < count; i++) {
        if (s.deck.length === 0) break;
        s.hand.push(instanceFromDeck(side, s.deck.pop()));
        drawn++;
    }
    if (drawn > 0) Render.all();
    return drawn;
}

/**
 * Swaps the active creature with a bench creature.
 *
 * This is the single place a creature leaves the active slot voluntarily, so it
 * is where status clearing and Healing Retreat live. Used by retreat, Heavenly
 * Retreat, Phase Shift and Forceful Flip.
 *
 * @param {object} [opts] { free } — `free` skips the retreat energy cost
 */
async function swapActiveWithBench(side, benchIndex, opts = {}) {
    const s = gameState[side];
    const outgoing = s.active;
    const incoming = s.bench[benchIndex];
    if (!outgoing || !incoming) return;

    if (!opts.free) {
        await discardEnergyFrom(outgoing, outgoing.data.retreat, { side, silent: true });
    }

    // Leaving the active slot always clears status conditions.
    await Status.clear(outgoing, { side });

    // Healing Retreat (Trunket 20, Elefeir 40).
    if (outgoing.flags.healingRetreat > 0) {
        const amount = outgoing.flags.healingRetreat;
        outgoing.flags.healingRetreat = 0;
        await Log.say(
            `${creatureName(outgoing, side)}'s Healing Retreat activates!`,
            { kind: 'ability', icon: '🌿' }
        );
        await healCreature(outgoing, amount, { side });
    }

    s.active = incoming;
    s.bench[benchIndex] = outgoing;

    // The incoming creature arrives clean.
    incoming.status.clear();
    incoming.flags.hallucinationFlip = null;

    Render.all();
    await Log.say(
        `${subject(side)} ${verb(side, 'switches', 'switch')} to ${incoming.data.name}.`,
        { kind: 'info', icon: '🔄', side }
    );
}

/** Retreat, paying the energy cost. Refuses with a reason if illegal. */
async function performRetreat(side, benchIndex) {
    const s = gameState[side];
    const check = creatureCanRetreat(s.active, side);
    if (!check.ok) {
        Log.warn(check.reason);
        return false;
    }
    if (!s.bench[benchIndex]) return false;

    s.retreatedThisTurn = true;
    await swapActiveWithBench(side, benchIndex);
    return true;
}

// ---------------------------------------------------------------------------
// Energy
// ---------------------------------------------------------------------------

/**
 * The Flux check. Only applies when the energy is going onto the active
 * creature that has Flux: attaching to a bench creature never flips. Runs at
 * most once per turn; a failed check uses up the turn's energy.
 * @param {object} target the creature the energy is going onto
 * @returns {Promise<boolean>} true if attachment may proceed
 */
async function passesFluxCheck(side, target) {
    const s = gameState[side];
    const active = s.active;
    if (!active || target !== active || !Status.has(active, 'flux')) return true;

    if (s.flags.fluxCheckDone) return s.flags.fluxCheckPassed;

    s.flags.fluxCheckDone = true;
    await Log.say(
        `${creatureName(active, side)} is in Flux — flipping 2 coins for energy.`,
        { kind: 'status', icon: '⚡' }
    );
    const { results, tails } = flipMany(2);
    await Log.coins(results, 'Flux check');

    if (tails === 2) {
        s.flags.fluxCheckPassed = false;
        s.energyAttachedThisTurn = true;   // spends the attachment for the turn
        Render.controls();
        await Log.say('Both tails: no energy can be attached this turn.',
            { kind: 'status', icon: '⚡' });
        return false;
    }

    s.flags.fluxCheckPassed = true;
    await Log.say('Energy attachment is allowed.', { kind: 'info', pace: 0.5 });
    return true;
}

/** Can this side attach its one energy right now? */
function canAttachEnergy(side) {
    const s = gameState[side];
    if (gameState.phase !== 'playing') return { ok: false, reason: 'Not in play.' };
    if (gameState.currentTurn !== side) return { ok: false, reason: 'Not your turn.' };
    if (s.energyAttachedThisTurn) return { ok: false, reason: 'Already attached energy this turn.' };
    if (s.hasAttacked) return { ok: false, reason: 'You have already attacked this turn.' };
    if (creaturesInPlay(side).length === 0) return { ok: false, reason: 'No creature to charge.' };
    return { ok: true };
}

/** Attaches this turn's energy to a specific creature. */
async function attachTurnEnergy(side, card) {
    const s = gameState[side];
    const check = canAttachEnergy(side);
    if (!check.ok) {
        Log.warn(check.reason);
        return false;
    }
    if (!(await passesFluxCheck(side, card))) return false;

    s.energyAttachedThisTurn = true;
    await attachEnergyTo(card, 1, { side, type: turnEnergyType(side) });
    Render.all();
    return true;
}

/** This turn's energy type for a side, rolled once at the start of its turn. */
function turnEnergyType(side) {
    const s = gameState[side];
    if (!s.turnEnergyType) s.turnEnergyType = rollEnergyType(side);
    return s.turnEnergyType;
}

// ---------------------------------------------------------------------------
// Playing and evolving
// ---------------------------------------------------------------------------

/** Puts a Stage 1 creature from hand onto an empty bench slot. */
async function playCreatureToBench(side, handIndex, benchIndex) {
    const s = gameState[side];
    const card = s.hand[handIndex];
    if (!card || card.data.stage !== 'Stage 1') return false;
    if (s.bench[benchIndex]) return false;

    // The opponent's card is shown in the middle of the screen first, then
    // flies to its bench slot.
    await showcaseCard(side, card.id, {
        label: `${subject(side)} ${verb(side, 'plays', 'play')} ${card.data.name} to the bench`,
        target: { side, location: 'bench', index: benchIndex },
        creatureOnly: true,
        fullArt: card.fullArt
    });

    s.bench[benchIndex] = card;
    s.hand.splice(handIndex, 1);
    turnTracker.playedThisTurn.add(card.evolutionId);
    trackPlayed(side, card.id);

    Render.all();
    await Log.say(
        `${subject(side)} ${verb(side, 'plays', 'play')} ${card.data.name} to the bench.`,
        { kind: 'info', icon: '🃏', side }
    );
    return true;
}

/**
 * Whether `evolutionCard` (in hand) may evolve `targetCard` (in play).
 * Returns { ok, reason } so the UI can explain a refusal.
 */
function canEvolveOnto(evolutionCard, targetCard) {
    if (!evolutionCard || !targetCard) return { ok: false, reason: 'Nothing to evolve.' };

    if (gameState.turnNumber < FIRST_EVOLUTION_TURN) {
        return { ok: false, reason: `Evolution is not allowed before turn ${FIRST_EVOLUTION_TURN}.` };
    }
    // Matched by card id, not by name: four cards share the name "Antheara" and
    // two share "Meerkool", and a future set may reuse a name again.
    if (!isEvolutionOf(evolutionCard.data, targetCard.data)) {
        return { ok: false, reason: `${evolutionCard.data.name} does not evolve from ${targetCard.data.name}.` };
    }
    if (turnTracker.playedThisTurn.has(targetCard.evolutionId)) {
        return { ok: false, reason: `${targetCard.data.name} was played this turn.` };
    }
    if (turnTracker.evolvedThisTurn.has(targetCard.evolutionId)) {
        return { ok: false, reason: `${targetCard.data.name} has already evolved this turn.` };
    }
    return { ok: true };
}

/** Every creature in play that this hand card could evolve. */
function evolutionTargets(side, evolutionCard) {
    return boardCandidates(side).filter(c => canEvolveOnto(evolutionCard, c.card).ok);
}

/**
 * Evolves a creature in play using a card from hand.
 *
 * Damage, energy, the evolution id and the evolution chain all carry over.
 * Guardian's Call routes through here too, which is what fixes the original's
 * hand-built replacement object that lost the chain and allowed double evolution.
 */
async function evolveCreature(side, handIndex, location, benchIndex) {
    const s = gameState[side];
    const evolution = s.hand[handIndex];
    const target = location === 'active' ? s.active : s.bench[benchIndex];

    const check = canEvolveOnto(evolution, target);
    if (!check.ok) {
        Log.warn(check.reason);
        return false;
    }

    await showcaseCard(side, evolution.id, {
        label: `${possessive(side)} ${target.data.name} evolves into ${evolution.data.name}`,
        target: { side, location, index: benchIndex },
        creatureOnly: true,
        fullArt: evolution.fullArt
    });

    evolution.damage = target.damage;
    evolution.energyUnits = Object.assign(emptyEnergyUnits(), target.energyUnits);
    evolution.evolutionId = target.evolutionId;
    evolution.evolutionChain = (target.evolutionChain || []).concat([{
        id: target.id,
        data: target.data,
        fullArt: !!target.fullArt
    }]);

    // Status carries over — it is a condition on the creature in the active
    // slot, and evolving does not remove it.
    evolution.status = new Set(target.status);

    // Ability state does NOT carry over: the new form has its own ability.
    evolution.abilityUsedThisTurn = false;
    evolution.flags = createCreatureFlags();
    // Restrictions tied to the slot rather than the form do persist.
    evolution.flags.cantRetreatUntil = target.flags.cantRetreatUntil;
    evolution.flags.cantAttackUntil = target.flags.cantAttackUntil;

    if (location === 'active') s.active = evolution;
    else s.bench[benchIndex] = evolution;

    s.hand.splice(handIndex, 1);
    turnTracker.evolvedThisTurn.add(evolution.evolutionId);
    trackPlayed(side, evolution.id);
    // Stamped rather than a boolean, so Thunder Rush can ask "did they evolve
    // on the immediately preceding turn?" without any clearing logic.
    s.flags.evolvedOnTurn = gameState.turnNumber;

    Render.all();
    await Log.say(
        `${creatureName(target, side)} evolved into ${evolution.data.name}!`,
        { kind: 'info', icon: '✨', side }
    );
    return true;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/** Builds and shuffles both decks from the chosen deck lists. */
function buildDecks() {
    for (const side of SIDES) {
        const deck = DeckLibrary.get(gameState[side].selectedDeck);
        gameState[side].deck = Rng.shuffle(deck.cards.slice());
        gameState[side].energyTypes = deckEnergyTypes(deck);
        gameState[side].fullArtLeft = cleanFullArt(deck.fullArt, deck.cards);
    }
}

/**
 * Draws opening hands, redrawing until each contains at least one Stage 1 so
 * both sides can legally set up.
 */
function drawOpeningHands() {
    for (const side of SIDES) {
        const s = gameState[side];
        for (let attempt = 0; attempt < 200; attempt++) {
            s.hand = [];
            for (let i = 0; i < HAND_SIZE && s.deck.length > 0; i++) {
                s.hand.push(instanceFromDeck(side, s.deck.pop()));
            }
            if (s.hand.some(c => c.data.stage === 'Stage 1')) break;
            // Put them back and reshuffle.
            returnToDeck(side, s.hand);
            s.deck = Rng.shuffle(s.deck);
        }
    }
}

/** The AI's opening placement: strongest Stage 1 active, the rest to the bench. */
function aiSetup(side = 'opponent') {
    const s = gameState[side];
    const stage1 = s.hand.filter(c => c.data.stage === 'Stage 1');
    if (stage1.length === 0) return;

    const ranked = stage1.slice().sort((a, b) => {
        const score = card => card.data.hp +
            movesOf(card.data).reduce((max, m) => Math.max(max, m.damage || 0), 0);
        return score(b) - score(a);
    });

    const active = ranked[0];
    s.active = active;
    s.hand.splice(s.hand.indexOf(active), 1);

    for (const card of ranked.slice(1)) {
        const slot = s.bench.findIndex(c => !c);
        if (slot === -1) break;
        s.bench[slot] = card;
        s.hand.splice(s.hand.indexOf(card), 1);
        turnTracker.playedThisTurn.add(card.evolutionId);
    }

    gameState.setupReady[side] = true;
    Render.all();
}
