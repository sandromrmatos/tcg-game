// ============================================================================
// PLAYER INPUT
//
// Thin handlers: each one validates through the same shared check the AI uses,
// then calls the same action function. No rules live here.
//
// Every handler runs inside runExclusive(), which blocks further input while a
// resolution is in flight and unwinds cleanly when the game ends mid-sequence.
// ============================================================================

function clearSelection() {
    UiState.selection = null;
    UiState.energyMode = false;
    document.querySelectorAll('.choosable').forEach(el => el.classList.remove('choosable'));
    Render.all();
}

/**
 * Asks the player to confirm an action before it happens. Uses the hub's
 * dialog (with the card shown) when it is loaded, and the in-game choice
 * modal otherwise.
 * @returns {Promise<boolean>}
 */
async function confirmAction({ title, message = '', okLabel = 'Confirm', cardId = null, fullArt = false }) {
    CardZoom.hide();
    if (typeof Hub !== 'undefined' && document.getElementById('hub-dialog')) {
        const answer = await Hub.dialog({
            title, message,
            image: cardId ? cardArt(cardId, fullArt) : null,
            buttons: [{ label: 'Cancel', value: false }, { label: okLabel, value: true, kind: 'primary' }]
        });
        return !!(answer && answer.value);
    }
    const value = await Prompt.chooseOption({
        title, subtitle: message,
        options: [{ label: okLabel, value: true }],
        cancellable: true
    });
    return value === true;
}

/** One line describing a move: damage, then its rules text. */
function describeMove(card, move) {
    const parts = [];
    parts.push(move.damage ? `${move.damage} damage` : 'No base damage');
    parts.push(`costs ${describeEnergyCost(move.cost)} energy`);
    const text = typeof cardText === 'function' ? cardText(card.id, `move${move.number}`) : '';
    if (text) parts.push(text);
    return parts.join('. ').replace(/\.\./g, '.');
}

// ---------------------------------------------------------------------------
// Hand
// ---------------------------------------------------------------------------

async function onHandCardClick(card, handIndex) {
    if (gameState.busy || Prompt.isOpen) return;

    if (gameState.phase === 'setup') {
        await onSetupPlace(card, handIndex);
        return;
    }
    if (gameState.phase !== 'playing') return;
    if (gameState.currentTurn !== 'player') {
        Log.warn("It's not your turn.");
        return;
    }
    if (gameState.player.hasAttacked) {
        Log.warn('You have already attacked this turn.');
        return;
    }

    if (isItem(card.data)) {
        await onPlayItem(card, handIndex);
    } else if (isAccessory(card.data)) {
        await onPlayAccessory(card);
    } else if (card.data.stage === 'Stage 1') {
        await onPlayCreature(card, handIndex);
    } else {
        await onEvolve(card, handIndex);
    }
}

/** Attach an accessory: pick one of your creatures of its type. */
async function onPlayAccessory(card) {
    const check = AccessoryRegistry.canUse(card, 'player');
    if (!check.ok) {
        Log.warn(check.reason);
        return;
    }
    const target = await Prompt.chooseCreature({
        candidates: AccessoryRegistry.targets(card, 'player'),
        title: `Attach ${card.data.name} to which ${card.data.accessoryType} creature? (one accessory per turn)`,
        cancellable: true
    });
    if (!target) return;
    await runExclusive(async () => {
        await AccessoryRegistry.attach(card, 'player', target);
    });
}

/** The accessory's own button (Neutral Elixir), from the creature panel. */
async function onUseAccessory(card) {
    const check = AccessoryRegistry.canActivate(card, 'player');
    if (!check.ok) {
        Log.warn(check.reason);
        return;
    }
    await runExclusive(async () => {
        await AccessoryRegistry.activate(card, 'player');
        await resolveKnockouts();
    });
}

async function onPlayItem(card, handIndex) {
    const check = ItemRegistry.canUse(card, 'player');
    if (!check.ok) {
        Log.warn(check.reason);
        return;
    }
    const text = typeof cardText === 'function' ? cardText(card.id, 'item') : '';
    const confirmed = await confirmAction({
        title: `Use ${card.data.name}?`,
        message: (text ? text + ' ' : '') + 'You can play one item card per turn.',
        okLabel: 'Use item',
        cardId: card.id
    });
    if (!confirmed) return;
    // The hand may have changed while the dialog was open.
    handIndex = gameState.player.hand.indexOf(card);
    if (handIndex === -1 || !ItemRegistry.canUse(card, 'player').ok) return;

    await runExclusive(async () => {
        await ItemRegistry.use(card, 'player', handIndex);
        await resolveKnockouts();
    });
}

async function onPlayCreature(card, handIndex) {
    const slots = emptyBenchSlots('player');
    if (slots.length === 0) {
        Log.warn('Your bench is full.');
        return;
    }

    const slot = await Prompt.chooseEmptyBenchSlot({
        side: 'player',
        slots,
        title: `Place ${card.data.name} on which bench slot?`
    });
    if (slot === null) return;

    await runExclusive(async () => {
        await playCreatureToBench('player', handIndex, slot);
    });
}

async function onEvolve(card, handIndex) {
    const targets = evolutionTargets('player', card);
    if (targets.length === 0) {
        // Report the most useful reason rather than a generic refusal.
        if (gameState.turnNumber < FIRST_EVOLUTION_TURN) {
            Log.warn(`You cannot evolve before turn ${FIRST_EVOLUTION_TURN}.`);
        } else {
            Log.warn(`Nothing in play can evolve into ${card.data.name} right now.`);
        }
        return;
    }

    const choice = await Prompt.chooseCreature({
        candidates: targets,
        title: `Evolve which creature into ${card.data.name}?`,
        cancellable: true
    });
    if (!choice) return;

    await runExclusive(async () => {
        await evolveCreature('player', handIndex, choice.location, choice.index);
    });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

async function onSetupPlace(card, handIndex) {
    if (card.data.stage !== 'Stage 1') {
        Log.warn('Only Stage 1 creatures can be placed during setup.');
        return;
    }

    const s = gameState.player;
    if (!s.active) {
        const confirmed = await confirmAction({
            title: `Make ${card.data.name} your active creature?`,
            message: `Your active creature does the fighting and can only leave by retreating. ` +
                `${card.data.name} has ${card.data.hp} HP and a retreat cost of ${card.data.retreat}.`,
            okLabel: 'Place as active',
            cardId: card.id,
            fullArt: card.fullArt
        });
        if (!confirmed || s.active || gameState.phase !== 'setup') return;
        const index = s.hand.indexOf(card);
        if (index === -1) return;
        s.active = card;
        s.hand.splice(index, 1);
        Log.write(`You place ${card.data.name} as your active creature.`,
            { kind: 'info', icon: '🃏' });
        Render.all();
        return;
    }

    const slots = emptyBenchSlots('player');
    if (slots.length === 0) {
        Log.warn('Your board is full. Press Ready to begin.');
        return;
    }
    const slot = await Prompt.chooseEmptyBenchSlot({
        side: 'player',
        slots,
        title: `Place ${card.data.name} on which bench slot?`
    });
    if (slot === null) return;

    s.bench[slot] = card;
    s.hand.splice(s.hand.indexOf(card), 1);
    Log.write(`You place ${card.data.name} on the bench.`, { kind: 'info', icon: '🃏' });
    Render.all();
}

// ---------------------------------------------------------------------------
// Action bar
// ---------------------------------------------------------------------------

async function onAttack(moveNumber) {
    if (gameState.busy || Prompt.isOpen) return;

    const check = canAttackWith('player', moveNumber);
    if (!check.ok) {
        Log.warn(check.reason);
        return;
    }
    const attacker = gameState.player.active;
    const move = moveOf(attacker.data, moveNumber);
    const confirmed = await confirmAction({
        title: `Use ${move.name}?`,
        message: `${describeMove(attacker, move)}. Attacking ends your turn, so play items, ` +
            'attach energy and use abilities first.',
        okLabel: 'Attack',
        cardId: attacker.id,
        fullArt: attacker.fullArt
    });
    if (!confirmed || !canAttackWith('player', moveNumber).ok) return;

    clearSelection();
    await runExclusive(async () => {
        await resolveAttack('player', moveNumber);
    });
}

async function onUseAbility(card, location, index) {
    if (gameState.busy || Prompt.isOpen) return;

    const check = AbilityRegistry.canUse(card, 'player', location);
    if (!check.ok) {
        Log.warn(check.reason);
        return;
    }
    await runExclusive(async () => {
        await AbilityRegistry.use(card, 'player', location, index);
        await resolveKnockouts();
    });
}

/**
 * Tapping one of your creatures opens its panel: the card, HP and energy,
 * and its ability with a button to use it. The panel is the confirmation
 * step for abilities: nothing happens until "Use" is pressed.
 */
function onCreatureClick(card, location, index) {
    if (gameState.busy || Prompt.isOpen) return;
    if (gameState.phase !== 'playing' && gameState.phase !== 'setup') return;
    CardZoom.hide();
    if (typeof Screens !== 'undefined' && Screens.showCreaturePanel) {
        Screens.showCreaturePanel(card, location, index);
    }
}

async function onEnergyButton() {
    if (gameState.busy || Prompt.isOpen) return;

    const check = canAttachEnergy('player');
    if (!check.ok) {
        Log.warn(check.reason);
        return;
    }

    UiState.energyMode = true;
    Render.controls();

    const type = turnEnergyType('player');
    const active = gameState.player.active;
    const fluxNote = active && Status.has(active, 'flux')
        ? ` ${active.data.name} has Flux: attaching to it needs a coin check, the bench doesn't.` : '';
    const choice = await Prompt.chooseCreature({
        candidates: boardCandidates('player'),
        title: `Attach ${ENERGY_ICONS[type]} ${type} energy to which creature?${fluxNote}`,
        cancellable: true
    });

    UiState.energyMode = false;
    if (!choice) {
        Render.all();
        return;
    }

    await runExclusive(async () => {
        await attachTurnEnergy('player', choice.card);
    });
}

async function onRetreatButton() {
    if (gameState.busy || Prompt.isOpen) return;

    const active = gameState.player.active;
    const check = active
        ? creatureCanRetreat(active, 'player')
        : { ok: false, reason: 'No active creature.' };
    if (!check.ok) {
        Log.warn(check.reason);
        return;
    }
    if (gameState.player.hasAttacked) {
        Log.warn('You have already attacked this turn.');
        return;
    }

    const choice = await Prompt.chooseCreature({
        candidates: boardCandidates('player', c => c.location === 'bench'),
        title: `Switch ${active.data.name} with which creature? (costs ${retreatCost(active)} energy)`,
        cancellable: true
    });
    if (!choice) return;

    await runExclusive(async () => {
        await performRetreat('player', choice.index);
    });
}

async function onEndTurnButton() {
    if (gameState.busy || Prompt.isOpen) return;

    if (gameState.phase === 'setup') {
        if (!gameState.player.active) {
            Log.warn('Place an active creature before starting.');
            return;
        }
        gameState.setupReady.player = true;
        clearSelection();
        await runExclusive(async () => {
            await startGame();
        });
        return;
    }
    clearSelection();
    await playerEndTurn();
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function bindInteractions() {
    const bind = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    };

    bind('energy-btn', onEnergyButton);
    bind('retreat-btn', onRetreatButton);
    bind('end-turn-btn', onEndTurnButton);
    bind('info-btn', () => Screens.showInfo());
    bind('new-game-btn', () => Screens.requestLeaveGame());
    bind('player-discard-btn', () => Screens.showDiscard('player'));
    bind('opponent-discard-btn', () => Screens.showDiscard('opponent'));

    // Log speed control, so a player who wants to read can slow it down and a
    // player who has read enough can speed it up.
    const speed = document.getElementById('speed-select');
    if (speed) {
        const saved = localStorage.getItem('tcg_log_speed');
        // A pace saved by an older version may not be one of today's options.
        if (saved && Array.from(speed.options).some(o => o.value === saved)) speed.value = saved;
        Log.speed = parseFloat(speed.value);
        speed.addEventListener('change', () => {
            Log.speed = parseFloat(speed.value);
            localStorage.setItem('tcg_log_speed', speed.value);
        });
    }

    // Escape cancels an open prompt.
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            Prompt.cancelAll();
            Screens.closeTopModal();
        }
    });
}
