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
    } else if (card.data.stage === 'Stage 1') {
        await onPlayCreature(card, handIndex);
    } else {
        await onEvolve(card, handIndex);
    }
}

async function onPlayItem(card, handIndex) {
    const check = ItemRegistry.canUse(card, 'player');
    if (!check.ok) {
        Log.warn(check.reason);
        return;
    }
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
        s.active = card;
        s.hand.splice(handIndex, 1);
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

async function onEnergyButton() {
    if (gameState.busy || Prompt.isOpen) return;

    const check = canAttachEnergy('player');
    if (!check.ok) {
        Log.warn(check.reason);
        return;
    }

    UiState.energyMode = true;
    Render.controls();

    const choice = await Prompt.chooseCreature({
        candidates: boardCandidates('player'),
        title: 'Attach energy to which creature?',
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
        title: `Switch ${active.data.name} with which creature? (costs ${active.data.retreat} energy)`,
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
        if (saved) speed.value = saved;
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
