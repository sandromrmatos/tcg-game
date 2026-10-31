// ============================================================================
// RENDERING
//
// Rebuilds the board, hand, HUD and controls from gameState. Pure read-only:
// nothing here mutates the game, so it is always safe to call.
//
// The board now shows the state that used to be invisible — active shields,
// auras, restrictions and queued bonuses appear as chips, so you can see why a
// number came out the way it did instead of only reading it in a popup.
// ============================================================================

const UiState = {
    // A hand card the player has picked up, awaiting a target.
    selection: null,     // { card, handIndex, mode: 'bench' | 'evolve' }
    energyMode: false    // waiting for the player to pick an energy target
};

const Render = {
    all() {
        this.hud();
        this.board();
        this.hand();
        this.controls();
    },

    scores() {
        this.hud();
    },

    // -----------------------------------------------------------------------
    // HUD
    // -----------------------------------------------------------------------

    hud() {
        for (const side of SIDES) {
            const s = gameState[side];
            setText(`${side}-points`, s.points);
            setText(`${side}-deck-count`, s.deck.length);
            setText(`${side}-hand-count`, s.hand.length);
            setText(`${side}-discard-count`, s.discardPile.length);
            renderPips(`${side}-point-pips`, s.points, POINTS_TO_WIN);
            renderChips(`${side}-side-chips`, sideChips(side));
        }

        setText('turn-number', gameState.turnNumber);
        setText('turn-limit', MAX_TURNS);

        const label = document.getElementById('turn-label');
        if (label) {
            if (gameState.phase === 'setup') {
                label.textContent = 'Setup — place your active creature';
            } else if (gameState.phase === 'gameOver') {
                label.textContent = 'Game over';
            } else if (gameState.phase === 'deckSelection') {
                label.textContent = 'Choose a deck';
            } else {
                label.textContent = gameState.currentTurn === 'player'
                    ? 'Your turn' : "Opponent's turn";
            }
            label.dataset.side = gameState.currentTurn || '';
        }
    },

    // -----------------------------------------------------------------------
    // Board
    // -----------------------------------------------------------------------

    board() {
        for (const side of SIDES) {
            const s = gameState[side];

            const activeSlot = document.querySelector(`.active-slot[data-player="${side}"]`);
            if (activeSlot) {
                fillSlot(activeSlot, s.active, side, 'active', null);
            }

            s.bench.forEach((card, index) => {
                const slot = document.querySelector(
                    `.bench-slot[data-player="${side}"][data-slot="${index}"]`);
                if (slot) fillSlot(slot, card, side, 'bench', index);
            });
        }
    },

    // -----------------------------------------------------------------------
    // Hands
    // -----------------------------------------------------------------------

    hand() {
        const playerHand = document.getElementById('player-hand');
        if (playerHand) {
            playerHand.innerHTML = '';
            gameState.player.hand.forEach((card, index) => {
                playerHand.appendChild(buildHandCard(card, index));
            });
            if (gameState.player.hand.length === 0) {
                playerHand.appendChild(emptyNote('No cards in hand'));
            }
        }

        const opponentHand = document.getElementById('opponent-hand');
        if (opponentHand) {
            opponentHand.innerHTML = '';
            for (let i = 0; i < gameState.opponent.hand.length; i++) {
                const back = document.createElement('div');
                back.className = 'card-back';
                opponentHand.appendChild(back);
            }
        }
    },

    // -----------------------------------------------------------------------
    // Controls
    // -----------------------------------------------------------------------

    controls() {
        const isSetup = gameState.phase === 'setup';
        const playerTurn = gameState.currentTurn === 'player' &&
            gameState.phase === 'playing' && !gameState.busy;

        const bar = document.getElementById('move-buttons');
        if (bar) {
            bar.innerHTML = '';
            const active = gameState.player.active;
            if (active && gameState.phase === 'playing') {
                for (const move of movesOf(active.data)) {
                    bar.appendChild(buildMoveButton(move, playerTurn));
                }
            }
        }

        // Energy and retreat are meaningless during setup, so they are hidden
        // rather than shown disabled.
        const energyBtn = document.getElementById('energy-btn');
        if (energyBtn) {
            energyBtn.style.display = isSetup ? 'none' : '';
            const check = canAttachEnergy('player');
            energyBtn.disabled = !playerTurn || !check.ok;
            energyBtn.title = check.ok ? "Attach this turn's energy" : check.reason;
            energyBtn.classList.toggle('btn-armed', UiState.energyMode);
        }

        const retreatBtn = document.getElementById('retreat-btn');
        if (retreatBtn) {
            retreatBtn.style.display = isSetup ? 'none' : '';
            const active = gameState.player.active;
            const check = active
                ? creatureCanRetreat(active, 'player')
                : { ok: false, reason: 'No active creature.' };
            const usedTurn = gameState.player.hasAttacked;
            retreatBtn.disabled = !playerTurn || !check.ok || usedTurn;
            retreatBtn.textContent = active
                ? `Retreat (${active.data.retreat}⚡)`
                : 'Retreat';
            retreatBtn.title = usedTurn
                ? 'You have already attacked this turn.'
                : (check.ok ? 'Switch your active creature' : check.reason);
        }

        const endBtn = document.getElementById('end-turn-btn');
        if (endBtn) {
            if (isSetup) {
                // Setup runs before any turn starts, so `currentTurn` is still
                // null here and the normal playerTurn test cannot be used.
                const ready = !!gameState.player.active && !gameState.busy;
                endBtn.disabled = !ready;
                endBtn.textContent = 'Ready';
                endBtn.title = ready
                    ? 'Start the game'
                    : 'Click a Stage 1 creature in your hand to place it as your active creature.';
            } else {
                endBtn.disabled = !playerTurn;
                endBtn.textContent = 'End turn';
                endBtn.title = playerTurn ? 'End your turn' : '';
            }
        }

        const busy = document.getElementById('busy-indicator');
        if (busy) busy.classList.toggle('busy-show', gameState.busy);
    }
};

// ---------------------------------------------------------------------------
// Slot / creature rendering
// ---------------------------------------------------------------------------

function fillSlot(slot, card, side, location, index) {
    slot.innerHTML = '';
    slot.classList.toggle('slot-filled', !!card);
    slot.classList.remove('choosable');

    if (!card) {
        const hint = document.createElement('span');
        hint.className = 'slot-hint';
        hint.textContent = location === 'active' ? 'Active' : 'Bench';
        slot.appendChild(hint);
        return;
    }

    slot.appendChild(buildCreature(card, side, location, index));
}

function buildCreature(card, side, location, index) {
    const wrap = document.createElement('div');
    wrap.className = 'creature';
    wrap.dataset.type = getCardType(card.data);

    const art = document.createElement('img');
    art.className = 'creature-art';
    art.src = cardImage(card.id);
    art.alt = card.data.name;
    wrap.appendChild(art);

    // HP bar with the actual remaining number, rather than only a damage total.
    const hp = remainingHp(card);
    const fraction = clamp(hp / card.data.hp, 0, 1);

    const hpBar = document.createElement('div');
    hpBar.className = 'hp-bar';
    const hpFill = document.createElement('div');
    hpFill.className = 'hp-fill';
    hpFill.style.width = `${fraction * 100}%`;
    hpFill.dataset.level = fraction > 0.5 ? 'high' : (fraction > 0.25 ? 'mid' : 'low');
    hpBar.appendChild(hpFill);
    wrap.appendChild(hpBar);

    const hpText = document.createElement('div');
    hpText.className = 'hp-text';
    hpText.textContent = `${hp}/${card.data.hp}`;
    wrap.appendChild(hpText);

    if (card.energy > 0) {
        const energy = document.createElement('div');
        energy.className = 'energy-pips';
        for (let i = 0; i < Math.min(card.energy, 8); i++) {
            const pip = document.createElement('span');
            pip.className = 'energy-pip';
            energy.appendChild(pip);
        }
        if (card.energy > 8) {
            const extra = document.createElement('span');
            extra.className = 'energy-extra';
            extra.textContent = `+${card.energy - 8}`;
            energy.appendChild(extra);
        }
        energy.title = `${card.energy} energy attached`;
        wrap.appendChild(energy);
    }

    const chips = creatureChips(card);
    if (chips.length > 0) {
        wrap.appendChild(buildChipRow(chips, 'creature-chips'));
    }

    art.addEventListener('mouseenter', () => CardZoom.show(card.id));
    art.addEventListener('mouseleave', () => CardZoom.hide());

    // Ability button, for the player's own creatures.
    if (side === 'player' && card.data.abilityEffect) {
        wrap.appendChild(buildAbilityButton(card, location, index));
    }

    return wrap;
}

function buildAbilityButton(card, location, index) {
    const btn = document.createElement('button');
    btn.className = 'ability-btn';
    btn.type = 'button';
    btn.textContent = card.data.abilityName || 'Ability';

    const check = AbilityRegistry.canUse(card, 'player', location);
    btn.disabled = !check.ok || gameState.busy;
    btn.title = check.ok
        ? `Use ${card.data.abilityName}`
        : check.reason;

    btn.addEventListener('click', event => {
        event.stopPropagation();
        onUseAbility(card, location, index);
    });
    return btn;
}

function buildMoveButton(move, enabled) {
    const btn = document.createElement('button');
    btn.className = 'move-btn';
    btn.type = 'button';

    const check = canAttackWith('player', move.number);
    btn.disabled = !enabled || !check.ok;
    btn.title = check.ok ? `Use ${move.name}` : check.reason;

    const name = document.createElement('span');
    name.className = 'move-name';
    name.textContent = move.name;
    btn.appendChild(name);

    const meta = document.createElement('span');
    meta.className = 'move-meta';

    const cost = document.createElement('span');
    cost.className = 'move-cost';
    const active = gameState.player.active;
    const paid = active ? Math.min(active.energy, move.costCount) : 0;
    for (let i = 0; i < move.costCount; i++) {
        const pip = document.createElement('i');
        pip.className = i < paid ? 'cost-pip cost-paid' : 'cost-pip';
        cost.appendChild(pip);
    }
    meta.appendChild(cost);

    const damage = document.createElement('span');
    damage.className = 'move-damage';
    damage.textContent = move.damage ? `${move.damage}` : '—';
    meta.appendChild(damage);

    btn.appendChild(meta);

    if (move.effect) {
        const tag = document.createElement('span');
        tag.className = 'move-effect-tag';
        tag.textContent = 'effect';
        btn.appendChild(tag);
    }

    btn.addEventListener('click', () => onAttack(move.number));
    return btn;
}

function buildHandCard(card, index) {
    const el = document.createElement('div');
    el.className = 'hand-card';
    el.dataset.type = getCardType(card.data);

    const selected = UiState.selection && UiState.selection.handIndex === index;
    el.classList.toggle('hand-card-selected', !!selected);

    const art = document.createElement('img');
    art.src = cardImage(card.id);
    art.alt = card.data.name;
    el.appendChild(art);

    const playable = handCardPlayability(card);
    el.classList.toggle('hand-card-dim', !playable.ok);
    el.title = playable.ok ? card.data.name : `${card.data.name} — ${playable.reason}`;

    el.addEventListener('mouseenter', () => CardZoom.show(card.id));
    el.addEventListener('mouseleave', () => CardZoom.hide());
    el.addEventListener('click', () => onHandCardClick(card, index));

    return el;
}

/** Why a hand card can or cannot be played right now. */
function handCardPlayability(card) {
    if (gameState.phase === 'setup') {
        if (card.data.stage !== 'Stage 1') {
            return { ok: false, reason: 'Only Stage 1 creatures during setup' };
        }
        return { ok: true };
    }
    if (gameState.currentTurn !== 'player' || gameState.phase !== 'playing') {
        return { ok: false, reason: 'Not your turn' };
    }
    if (gameState.player.hasAttacked) {
        return { ok: false, reason: 'You have already attacked' };
    }

    if (isItem(card.data)) {
        return ItemRegistry.canUse(card, 'player');
    }
    if (card.data.stage === 'Stage 1') {
        if (emptyBenchSlots('player').length === 0) {
            return { ok: false, reason: 'Bench is full' };
        }
        return { ok: true };
    }
    // Evolution card.
    if (evolutionTargets('player', card).length === 0) {
        return gameState.turnNumber < FIRST_EVOLUTION_TURN
            ? { ok: false, reason: `No evolution before turn ${FIRST_EVOLUTION_TURN}` }
            : { ok: false, reason: 'No creature it can evolve' };
    }
    return { ok: true };
}

// ---------------------------------------------------------------------------
// Chips: the previously invisible state
// ---------------------------------------------------------------------------

function buildChipRow(chips, className) {
    const row = document.createElement('div');
    row.className = className;
    for (const chip of chips) {
        const el = document.createElement('span');
        el.className = `chip chip-${chip.kind || 'info'}`;
        el.textContent = chip.icon;
        el.title = chip.label;
        row.appendChild(el);
    }
    return row;
}

function renderChips(elementId, chips) {
    const host = document.getElementById(elementId);
    if (!host) return;
    host.innerHTML = '';
    for (const chip of chips) {
        const el = document.createElement('span');
        el.className = `chip chip-${chip.kind || 'info'}`;
        el.textContent = chip.icon;
        el.title = chip.label;
        host.appendChild(el);
    }
}

function renderPips(elementId, filled, total) {
    const host = document.getElementById(elementId);
    if (!host) return;
    host.innerHTML = '';
    for (let i = 0; i < total; i++) {
        const pip = document.createElement('span');
        pip.className = i < filled ? 'point-pip point-pip-on' : 'point-pip';
        host.appendChild(pip);
    }
}

/** Everything currently true about one creature. */
function creatureChips(card) {
    const chips = [];
    const f = card.flags;

    for (const status of Status.list(card)) {
        const condition = STATUS_CONDITIONS[status];
        chips.push({ icon: condition.icon, label: `${condition.name}: ${condition.blurb}`, kind: 'bad' });
    }

    const shieldLabels = {
        mindRipple: 'Mind Ripple',
        cottonGuard: 'Cotton Guard',
        elementalFortitude: 'Elemental Fortitude (Wind / Mechanic)'
    };
    for (const key of Object.keys(shieldLabels)) {
        const shield = readShield(f.shields, key);
        if (shield) {
            chips.push({ icon: '🛡️', label: `${shieldLabels[key]}: -${shield.amount} damage`, kind: 'good' });
        }
    }

    if (Timing.active(f.metalicProtectionUntil)) {
        chips.push({ icon: '⚙️', label: 'Metalic Protection: immune to Mechanic damage', kind: 'good' });
    }
    if (Timing.active(f.hydrationUntil)) {
        chips.push({ icon: '💧', label: 'Hydration: immune to status conditions', kind: 'good' });
    }
    if (Timing.active(f.aquaMirrorUntil)) {
        chips.push({ icon: '🪞', label: 'Aqua Mirror: reflects status conditions', kind: 'good' });
    }
    if (f.retaliationStone) {
        chips.push({ icon: '💎', label: 'Retaliation Stone: deals 20 back when damaged', kind: 'good' });
    }
    if (f.absorbEnergy) {
        chips.push({ icon: '⚡', label: 'Absorb Energy: gains energy when healed', kind: 'good' });
    }
    if (f.energizedHealing > 0) {
        chips.push({ icon: '💧', label: `Energized Healing: heals ${f.energizedHealing} when charged`, kind: 'good' });
    }
    if (f.healingRetreat > 0) {
        chips.push({ icon: '🌿', label: `Healing Retreat: heals ${f.healingRetreat} on retreat`, kind: 'good' });
    }
    if (f.chillRecharge) {
        chips.push({ icon: '❄️', label: 'Chill Recharge: next attack +20', kind: 'good' });
    }
    if (f.sproutBoostReady) {
        chips.push({ icon: '🌱', label: 'Sprout Boost: next attack +30', kind: 'good' });
    }
    if (f.guardian) {
        chips.push({ icon: '🛡️', label: 'Guarding the active creature', kind: 'good' });
    }
    if (Timing.active(f.cantAttackUntil)) {
        chips.push({ icon: '💤', label: `Cannot attack for ${Timing.describe(f.cantAttackUntil)}`, kind: 'bad' });
    }
    if (Timing.active(f.cantRetreatUntil)) {
        chips.push({ icon: '⛓️', label: `Cannot retreat for ${Timing.describe(f.cantRetreatUntil)}`, kind: 'bad' });
    }
    for (const [effectId, deadline] of Object.entries(f.cooldowns)) {
        if (!Timing.active(deadline)) continue;
        chips.push({ icon: '🔧', label: `${effectId} recharging for ${Timing.describe(deadline)}`, kind: 'bad' });
    }

    return chips;
}

/** Everything currently true about one side. */
function sideChips(side) {
    const chips = [];
    const f = gameState[side].flags;

    const shieldLabels = {
        monksFury: "Monk's Fury",
        spectralBurst: 'Spectral Burst',
        defenseAura: 'Defense Aura',
        hardAsSteel: 'Hard as Steel (Mechanic / Neutral)',
        shieldBarrier: 'Shield Barrier',
        galeShield: 'Gale Shield (Wind defenders)',
        caprineGuard: 'Caprine Guard (Celestial / Mystic)'
    };
    for (const key of Object.keys(shieldLabels)) {
        const shield = readShield(f.shields, key);
        if (shield) {
            chips.push({ icon: '🛡️', label: `${shieldLabels[key]}: -${shield.amount} damage`, kind: 'good' });
        }
    }

    if (Timing.active(f.guardianModeUntil)) {
        chips.push({ icon: '🛡️', label: 'Guardian Mode: -10 damage to all creatures', kind: 'good' });
    }
    if (Timing.active(f.clarityAuraUntil)) {
        chips.push({ icon: '✨', label: 'Clarity Aura: immune to Hallucination', kind: 'good' });
    }
    if (Timing.active(f.camouflageUntil)) {
        chips.push({ icon: '🍃', label: 'Camouflage: bench cannot be damaged', kind: 'good' });
    }
    if (f.booster) {
        chips.push({ icon: '⬆️', label: 'Booster: next attack +20', kind: 'good' });
    }
    if (f.powerUpAttacks > 0) {
        chips.push({ icon: '⬆️', label: `Power-Up: +10 damage for ${f.powerUpAttacks} more attack(s)`, kind: 'good' });
    }
    if (Timing.active(f.amuletUntil)) {
        chips.push({ icon: '⬆️', label: 'Amulet: Neutral creatures +20 damage', kind: 'good' });
    }
    if (f.warriorModeBonus > 0) {
        chips.push({ icon: '⬆️', label: `Warrior Mode: +${f.warriorModeBonus} damage this turn`, kind: 'good' });
    }
    if (f.sturdyPresenceBonus > 0) {
        chips.push({ icon: '⬆️', label: `Sturdy Presence: +${f.sturdyPresenceBonus} damage this turn`, kind: 'good' });
    }
    if (f.auraOfStrengthBonus > 0) {
        chips.push({ icon: '⬆️', label: `Aura of Strength: +${f.auraOfStrengthBonus} damage this turn`, kind: 'good' });
    }
    if (f.thunderRush) {
        chips.push({ icon: '⚡', label: 'Thunder Rush: attack damage doubled this turn', kind: 'good' });
    }
    if (f.rainbowStrike) {
        chips.push({ icon: '🌈', label: 'Rainbow Strike: attack also hits the bench', kind: 'good' });
    }
    if (f.phaseShift) {
        chips.push({ icon: '🌀', label: 'Phase Shift: must switch out after attacking', kind: 'info' });
    }
    if (Timing.active(f.invincibleLockUntil)) {
        chips.push({ icon: '🚫', label: `Cannot attack for ${Timing.describe(f.invincibleLockUntil)}`, kind: 'bad' });
    }
    if (Timing.active(f.cantAttackUntil)) {
        chips.push({ icon: '🚫', label: 'Cannot attack this turn (Quick Reflexes)', kind: 'bad' });
    }
    if (Timing.active(f.cantDealDamageUntil)) {
        chips.push({ icon: '🌊', label: 'Deals no damage this turn (Tidal Illusion)', kind: 'bad' });
    }
    if (Timing.active(f.cantUseItemsUntil)) {
        chips.push({ icon: '🔮', label: 'Cannot use items this turn (Mirage Shield)', kind: 'bad' });
    }

    return chips;
}

// ---------------------------------------------------------------------------
// Small DOM helpers
// ---------------------------------------------------------------------------

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function emptyNote(text) {
    const el = document.createElement('div');
    el.className = 'empty-note';
    el.textContent = text;
    return el;
}
