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
                label.textContent = gameState.setupReady.player && SideNames.opponent
                    ? `Waiting for ${SideNames.opponent}…`
                    : 'Setup — place your active creature';
            } else if (gameState.phase === 'gameOver') {
                label.textContent = 'Game over';
            } else if (gameState.phase === 'deckSelection') {
                label.textContent = 'Choose a deck';
            } else {
                label.textContent = gameState.currentTurn === 'player'
                    ? 'Your turn' : (SideNames.opponent ? `${SideNames.opponent}'s turn` : "Opponent's turn");
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
            // This turn's energy type, rolled at the start of the turn.
            const type = gameState.player.turnEnergyType;
            energyBtn.textContent = type && gameState.phase === 'playing'
                ? `Attach ${ENERGY_ICONS[type]} ${type} energy`
                : 'Attach energy';
            energyBtn.style.setProperty('--energy', type ? typeColor(type) : '');
            energyBtn.classList.toggle('btn-energy-typed', !!type);
            energyBtn.title = check.ok
                ? `This turn's energy is ${type || 'not rolled yet'}. Attach it to any of your creatures.`
                : check.reason;
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
                ? `Retreat (${retreatCost(active)}⚡)`
                : 'Retreat';
            retreatBtn.title = usedTurn
                ? 'You have already attacked this turn.'
                : (check.ok ? 'Switch your active creature (once per turn)' : check.reason);
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

    // The opponent's setup stays face down until you press Ready, so you
    // can't pick your own opening around it.
    if (side === 'opponent' && gameState.phase === 'setup') {
        const back = document.createElement('div');
        back.className = 'creature-facedown';
        back.title = 'Revealed when you press Ready';
        slot.appendChild(back);
        return;
    }

    slot.appendChild(buildCreature(card, side, location, index));
}

function buildCreature(card, side, location, index) {
    const wrap = document.createElement('div');
    wrap.className = 'creature' + (card.fullArt ? ' full-art' : '');
    wrap.dataset.type = getCardType(card.data);

    const art = document.createElement('img');
    art.className = 'creature-art';
    art.src = cardArt(card.id, card.fullArt);
    art.alt = card.data.name;
    wrap.appendChild(art);

    // HP bar with the actual remaining number, rather than only a damage total.
    const hp = remainingHp(card);
    const fraction = clamp(hp / maxHp(card), 0, 1);

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
    hpText.textContent = `${hp}/${maxHp(card)}`;
    wrap.appendChild(hpText);

    if (card.energy > 0) {
        // One pip per energy, coloured by its type.
        const energy = document.createElement('div');
        energy.className = 'energy-pips';
        const units = [];
        for (const type of ENERGY_TYPES) for (let i = 0; i < card.energyUnits[type]; i++) units.push(type);
        for (const type of units.slice(0, 8)) {
            const pip = document.createElement('span');
            pip.className = 'energy-pip';
            pip.style.setProperty('--energy', typeColor(type));
            energy.appendChild(pip);
        }
        if (units.length > 8) {
            const extra = document.createElement('span');
            extra.className = 'energy-extra';
            extra.textContent = `+${units.length - 8}`;
            energy.appendChild(extra);
        }
        energy.title = ENERGY_TYPES.filter(t => card.energyUnits[t])
            .map(t => `${card.energyUnits[t]} ${t}`).join(', ') + ' energy attached';
        wrap.appendChild(energy);
    }

    const chips = creatureChips(card);
    if (chips.length > 0) {
        wrap.appendChild(buildChipRow(chips, 'creature-chips'));
    }

    CardZoom.bind(art, card.id, card.fullArt);

    // An attached accessory shows as a small card in the corner.
    if (card.accessory) {
        const acc = document.createElement('img');
        acc.className = 'accessory-badge';
        acc.src = cardImage(card.accessory.id);
        acc.alt = card.accessory.data.name;
        acc.title = `${card.accessory.data.name} attached`;
        CardZoom.bind(acc, card.accessory.id, false);
        wrap.appendChild(acc);
    }

    // Abilities no longer sit on the card as a button that overlapped
    // everything. A creature whose ability can be used right now gets a
    // flashing rainbow border; tapping it opens the creature panel, which
    // shows the ability and a button to use it.
    if (side === 'player' && card.data.abilityEffect) {
        wrap.classList.add('creature-has-ability');
        if (abilityReady(card, location)) wrap.classList.add('creature-ability-ready');
        const badge = document.createElement('span');
        badge.className = 'ability-badge';
        badge.textContent = '✨';
        badge.title = AbilityRegistry.isPassive(card.data.abilityEffect)
            ? `Ability: ${card.data.abilityName} (always on). Tap the card to see it.`
            : `Ability: ${card.data.abilityName}. Tap the card to see it.`;
        wrap.appendChild(badge);
    }
    if (side === 'player') {
        wrap.addEventListener('click', event => {
            // While a prompt is choosing a creature, the slot's own handler
            // owns the click.
            if (Prompt.isOpen) return;
            event.stopPropagation();
            onCreatureClick(card, location, index);
        });
    }

    return wrap;
}

/** Can the player use this creature's ability right now? */
function abilityReady(card, location) {
    if (gameState.busy || gameState.currentTurn !== 'player') return false;
    return AbilityRegistry.canUse(card, 'player', location).ok;
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
    cost.title = `Needs ${describeEnergyCost(move.cost)}`;
    for (const pip of costPips(gameState.player.active, move.cost)) cost.appendChild(pip);
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

/**
 * One pip per energy in a cost. Typed pips are coloured by their type; "any"
 * pips are white-ringed. A pip is filled when the creature's energy covers it:
 * typed pips from that type, then "any" pips from whatever is left.
 */
function costPips(card, costString) {
    const units = Object.assign(emptyEnergyUnits(), card && card.energyUnits);
    const cost = parseEnergyCost(costString);
    const pips = [];
    let spare = 0;
    for (const type of ENERGY_TYPES) {
        const paid = Math.min(cost.specific[type], units[type]);
        spare += units[type] - paid;
        for (let i = 0; i < cost.specific[type]; i++) {
            const pip = document.createElement('i');
            pip.className = 'cost-pip cost-typed' + (i < paid ? ' cost-paid' : '');
            pip.style.setProperty('--energy', typeColor(type));
            pip.title = `${type} energy`;
            pips.push(pip);
        }
    }
    for (let i = 0; i < cost.any; i++) {
        const pip = document.createElement('i');
        pip.className = 'cost-pip cost-any' + (i < spare ? ' cost-paid' : '');
        pip.title = 'Any energy';
        pips.push(pip);
    }
    return pips;
}

function buildHandCard(card, index) {
    const el = document.createElement('div');
    el.className = 'hand-card';
    el.dataset.type = getCardType(card.data);

    const selected = UiState.selection && UiState.selection.handIndex === index;
    el.classList.toggle('hand-card-selected', !!selected);

    const art = document.createElement('img');
    art.src = cardArt(card.id, card.fullArt);
    art.alt = card.data.name;
    el.appendChild(art);
    el.classList.toggle('full-art', !!card.fullArt);

    const playable = handCardPlayability(card);
    el.classList.toggle('hand-card-dim', !playable.ok);
    el.title = playable.ok ? card.data.name : `${card.data.name} — ${playable.reason}`;

    CardZoom.bind(el, card.id, card.fullArt);
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
    if (isAccessory(card.data)) {
        return AccessoryRegistry.canUse(card, 'player');
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

/**
 * One chip: an icon that explains itself when tapped (or hovered), so "⬆️"
 * says which boost it is, what it applies to and how long it lasts.
 */
function buildChip(chip) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `chip chip-${chip.kind || 'info'} chip-tappable`;
    el.textContent = chip.icon;
    el.title = chip.label;
    el.setAttribute('aria-label', chip.label);
    el.addEventListener('click', event => {
        // Don't also select the creature the chip sits on.
        event.stopPropagation();
        ChipTip.toggle(el, chip);
    });
    return el;
}

function buildChipRow(chips, className) {
    const row = document.createElement('div');
    row.className = className;
    for (const chip of chips) row.appendChild(buildChip(chip));
    return row;
}

function renderChips(elementId, chips) {
    const host = document.getElementById(elementId);
    if (!host) return;
    host.innerHTML = '';
    for (const chip of chips) host.appendChild(buildChip(chip));
}

/** The small explanation bubble opened by tapping a chip. */
const ChipTip = {
    _el: null,
    _for: null,
    _timer: null,

    toggle(anchor, chip) {
        if (this._for === anchor && this._el && this._el.classList.contains('chip-tip-show')) { this.hide(); return; }
        this.show(anchor, chip);
    },

    show(anchor, chip) {
        if (!this._el) {
            this._el = document.createElement('div');
            this._el.className = 'chip-tip';
            this._el.setAttribute('role', 'tooltip');
            document.body.appendChild(this._el);
            document.addEventListener('click', e => { if (this._el && !this._el.contains(e.target)) this.hide(); });
            window.addEventListener('scroll', () => this.hide(), true);
        }
        const [name, ...rest] = String(chip.label).split(': ');
        this._el.innerHTML = '';
        const title = document.createElement('div');
        title.className = 'chip-tip-title';
        title.textContent = `${chip.icon} ${rest.length ? name : ''}`.trim();
        const body = document.createElement('div');
        body.className = 'chip-tip-body';
        const text = rest.length ? rest.join(': ') : chip.label;
        body.textContent = text.charAt(0).toUpperCase() + text.slice(1);
        this._el.append(title, body);
        this._el.dataset.kind = chip.kind || 'info';

        const r = anchor.getBoundingClientRect();
        this._el.classList.add('chip-tip-show');
        const w = Math.min(280, window.innerWidth - 16);
        this._el.style.width = `${w}px`;
        const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
        const h = this._el.offsetHeight;
        const below = r.bottom + 8 + h < window.innerHeight;
        this._el.style.left = `${left}px`;
        this._el.style.top = `${below ? r.bottom + 6 : Math.max(8, r.top - h - 6)}px`;
        this._for = anchor;
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this.hide(), 8000);
    },

    hide() {
        clearTimeout(this._timer);
        if (this._el) this._el.classList.remove('chip-tip-show');
        this._for = null;
    }
};

/** How long an effect on `side` lasts, in that side's own turns, for the chips. */
function turnsLeft(deadline, side) {
    const n = Timing.remaining(deadline);
    const now = gameState.currentTurn === side;
    const whose = side === 'player' ? 'your' : possessive(side).replace(/^The /, 'the ');
    if (now && n === 1) return 'Ends after this turn.';
    return `Lasts ${n} more of ${whose} turn${n === 1 ? '' : 's'}${now ? ', counting this one' : ''}.`;
}

/** Status conditions, for the chips: what they do and when they end. */
function statusExplanation(condition) {
    return `${condition.name}: status condition. ${condition.blurb} ` +
        'It lasts until it is cured (Remedy, some abilities) or the creature leaves the active spot.';
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

    const owner = locateCard(card);
    const ownerSide = owner ? owner.side : 'player';

    for (const status of Status.list(card)) {
        const condition = STATUS_CONDITIONS[status];
        chips.push({ icon: condition.icon, label: statusExplanation(condition), kind: 'bad' });
    }

    // "Takes N less damage" shields on this creature, each used up by the next attack it takes.
    const shieldLabels = {
        mindRipple: 'Mind Ripple',
        cottonGuard: 'Cotton Guard',
        monksFury: "Monk's Fury",
        spectralBurst: 'Spectral Burst',
        oreLash: 'Ore Lash',
        coreTangle: 'Core Tangle',
        searGuard: 'Sear Guard'
    };
    for (const key of Object.keys(shieldLabels)) {
        const shield = readShield(f.shields, key);
        if (shield) {
            chips.push({ icon: '🛡️', label: `${shieldLabels[key]}: this creature takes ${shield.amount} less damage from the next attack ` +
                "that hits it, until the end of the opponent's next turn.", kind: 'good' });
        }
    }

    if (card.accessory) {
        const text = typeof cardText === 'function' ? cardText(card.accessory.id, 'accessory') : '';
        chips.push({ icon: '🧿', label: `${card.accessory.data.name}: accessory card attached to this creature. ${text}`.trim(), kind: 'good' });
    }
    if (Timing.active(f.anchoredUntil)) {
        chips.push({ icon: '⚓', label: "Anchored Terrain: attacks from Mechanic creatures deal it no damage, until the end of the opponent's next turn.", kind: 'good' });
    }
    if (f.bloomshroudTurn) {
        chips.push({ icon: '🌸', label: "Bloomshroud: at the start of the opponent's next turn they flip a coin. Tails: this creature takes no damage or status conditions that turn.", kind: 'good' });
    }
    if (typeof bloomshroudSafe === 'function' && bloomshroudSafe(card)) {
        chips.push({ icon: '🌸', label: 'Bloomshroud: this creature takes no damage or status conditions this turn.', kind: 'good' });
    }
    const printed = getCardData(card.id);
    if (printed && getCardType(printed) !== getCardType(card.data)) {
        chips.push({ icon: '🔄', label: `Elemental Shift: this creature is ${getCardType(card.data)} type (printed ${getCardType(printed)}) until it leaves play.`, kind: 'info' });
    }

    // Always-on abilities show while they are in effect where the creature stands.
    const passive = card.data.abilityEffect && AbilityRegistry.isPassive(card.data.abilityEffect)
        ? AbilityRegistry.get(card.data.abilityEffect) : null;
    if (passive && cardAbilityOn(card, card.data.abilityEffect)) {
        chips.push({ icon: '✨', label: `${card.data.abilityName} (always on): ${passive.summary}`, kind: 'good' });
    }

    if (f.chillRecharge) {
        chips.push({ icon: '❄️', label: "Chill Recharge: this creature's next attack deals +20 damage.", kind: 'good' });
    }
    if (f.sproutBoostReady) {
        chips.push({ icon: '🌱', label: "Sprout Boost: this creature's next attack deals +30 damage.", kind: 'good' });
    }
    if (owner && gameState[owner.side] && gameState[owner.side].flags.guardianCard === card &&
        Timing.active(gameState[owner.side].flags.guardianUntil)) {
        chips.push({ icon: '🛡️', label: 'Guardian: this benched creature takes the next attack meant for the active creature.', kind: 'good' });
    }
    if (Timing.active(f.cantAttackUntil)) {
        chips.push({ icon: '💤', label: `Can't attack: this creature can't attack. ${turnsLeft(f.cantAttackUntil, ownerSide)}`, kind: 'bad' });
    }
    if (Timing.active(f.cantRetreatUntil)) {
        chips.push({ icon: '⛓️', label: `Can't retreat: this creature can't retreat. ${turnsLeft(f.cantRetreatUntil, ownerSide)}`, kind: 'bad' });
    }
    for (const [effectId, deadline] of Object.entries(f.cooldowns)) {
        if (!Timing.active(deadline)) continue;
        const move = movesOf(card.data).find(m => m.effect === effectId);
        chips.push({ icon: '🔧', label: `${move ? move.name : effectId}: recharging, can't be used. ${turnsLeft(deadline, ownerSide)}`, kind: 'bad' });
    }

    return chips;
}

/** Everything currently true about one side. */
function sideChips(side) {
    const chips = [];
    const f = gameState[side].flags;

    const who = side === 'player' ? 'your' : possessive(side);
    const shieldLabels = {
        shieldBarrier: ['Shield Barrier', `${who} active creature takes`],
        galeShield: ['Gale Shield', `${who} Wind creatures take`]
    };
    for (const [key, [name, takes]] of Object.entries(shieldLabels)) {
        const shield = readShield(f.shields, key);
        if (shield) {
            chips.push({ icon: '🛡️', label: `${name}: ${takes} ${shield.amount} less damage from attacks, until the end of the opponent's next turn.`, kind: 'good' });
        }
    }

    if (f.booster) {
        chips.push({ icon: '⬆️', label: `Booster (item): ${who} next attack this turn deals +20 damage, whatever creature makes it. Ends with this turn.`, kind: 'good' });
    }
    if (f.powerUpAttacks > 0) {
        chips.push({ icon: '⬆️', label: `Power-Up (item): ${who} next ${f.powerUpAttacks === 1 ? 'attack deals' : `${f.powerUpAttacks} attacks each deal`} +10 damage, whatever creature makes ${f.powerUpAttacks === 1 ? 'it' : 'them'}.`, kind: 'good' });
    }
    if (Timing.active(f.amuletUntil)) {
        chips.push({ icon: '⬆️', label: `Amulet (item): ${who} Neutral creatures deal +20 damage when they attack. Other types get nothing. ${turnsLeft(f.amuletUntil, side)}`, kind: 'good' });
    }
    if (f.phaseShift) {
        chips.push({ icon: '🌀', label: 'Phase Shift: after attacking, the active creature switches with a benched one.', kind: 'info' });
    }
    if (Timing.active(f.invincibleLockUntil)) {
        chips.push({ icon: '🚫', label: `Invincible Gambit: ${who} attacks and abilities deal no damage. ${turnsLeft(f.invincibleLockUntil, side)}`, kind: 'bad' });
    }
    if (Timing.active(f.cantAttackUntil)) {
        chips.push({ icon: '🚫', label: `Can't attack: ${side === 'player' ? 'you' : subject(side)} can't attack. ${turnsLeft(f.cantAttackUntil, side)}`, kind: 'bad' });
    }
    if (Timing.active(f.cantDealDamageUntil)) {
        chips.push({ icon: '🌊', label: `Tidal Illusion: ${who} attacks deal no damage. ${turnsLeft(f.cantDealDamageUntil, side)}`, kind: 'bad' });
    }
    if (Timing.active(f.cantEvolveUntil)) {
        chips.push({ icon: '🧸', label: `Cuddle Storm: ${side === 'player' ? 'you' : subject(side)} can't evolve creatures. ${turnsLeft(f.cantEvolveUntil, side)}`, kind: 'bad' });
    }
    if (Timing.active(f.cantUseAccessoriesUntil)) {
        chips.push({ icon: '🧊', label: `No accessories: ${side === 'player' ? 'you' : subject(side)} can't attach accessory cards. ${turnsLeft(f.cantUseAccessoriesUntil, side)}`, kind: 'bad' });
    }
    if (f.abilitiesBlockedTurn !== null && f.abilitiesBlockedTurn >= gameState.turnNumber) {
        chips.push({ icon: '🔇', label: `Memento Echo: none of ${who} abilities work, always-on ones included, ` +
            (f.abilitiesBlockedTurn === gameState.turnNumber ? 'this turn.' : 'on the next turn.'), kind: 'bad' });
    }
    const foe = foeOf(side);
    if (gameState[foe] && hasAbilityAt(gameState[foe].active, 'mirageShield', 'active')) {
        chips.push({ icon: '🔮', label: `Mirage Shield: ${side === 'player' ? 'you' : subject(side)} can't use item cards while the opponent's ${gameState[foe].active.data.name} is active.`, kind: 'bad' });
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
