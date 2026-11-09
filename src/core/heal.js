// ============================================================================
// HEALING AND DIRECT DAMAGE
//
// Every point of healing in the game goes through healCreature(). The original
// code had ten effects and one ability decrementing `card.damage` directly,
// which meant Absorb Energy silently failed to trigger from any of them.
//
// Likewise every point of non-attack damage goes through damageCreature(), so
// Camouflage (bench protection) is enforced in one place instead of being
// re-checked by each area-of-effect move.
// ============================================================================

/**
 * Heals a creature and runs any on-heal ability.
 *
 * @param {object} card
 * @param {number} amount
 * @param {object} [opts] { side, silent }
 * @returns {Promise<number>} HP actually restored
 */
async function healCreature(card, amount, opts = {}) {
    if (!card || amount <= 0) return 0;

    const before = card.damage;
    card.damage = Math.max(0, card.damage - amount);
    const restored = before - card.damage;

    if (restored > 0 && !opts.silent) {
        await Log.say(
            `${creatureName(card, opts.side)} healed ${restored} HP.`,
            { kind: 'heal', icon: '💚', pace: 0.6 }
        );
    }

    // Absorb Energy (Lumifloris, Photosynthra), always on: "When this creature
    // is healed, it also gains an additional Energy card from your deck".
    if (restored > 0 && cardAbilityOn(card, 'absorbEnergy')) {
        AbilityRegistry.noteTriggered('absorbEnergy');
        // "An additional Energy card from your deck": one of the deck's types.
        const owner = opts.side || (locateCard(card) || {}).side;
        const type = rollEnergyType(owner);
        addEnergyUnits(card, type, 1);
        Render.board();
        await Log.say(
            `${creatureName(card, opts.side)}'s Absorb Energy attached 1 ${type} energy!`,
            { kind: 'ability', icon: ENERGY_ICONS[type] || '⚡', pace: 0.6 }
        );
    }

    Render.board();
    return restored;
}

/**
 * Deals damage outside the attack pipeline: recoil, area-of-effect moves,
 * Retaliation Stone, Gnawing Precision, hallucination self-damage.
 *
 * Knockouts are NOT resolved here — callers finish their effect and then let
 * resolveKnockouts() sweep the board, so a move that kills several creatures
 * reports all of it before any promotion prompt appears.
 *
 * @param {object} card
 * @param {number} amount
 * @param {object} [opts] { side, location, silent, reason }
 * @returns {Promise<number>} damage actually dealt
 */
async function damageCreature(card, amount, opts = {}) {
    if (!card || amount <= 0) return 0;

    const side = opts.side || (locateCard(card) || {}).side;
    const location = opts.location || (locateCard(card) || {}).location;

    // Camouflage (always on): while it is in play, its side's bench can't be
    // damaged. Self-inflicted bench damage (Risky Recoil) is blocked too.
    if (location === 'bench' && side && sideHasAbility(side, 'camouflage')) {
        AbilityRegistry.noteTriggered('camouflage');
        if (!opts.silent) {
            await Log.say(
                `${possessive(side)} Camouflage protected ${card.data.name} on the bench!`,
                { kind: 'ability', icon: '🍃', pace: 0.6 }
            );
        }
        return 0;
    }

    // Damage from the other side goes through the same always-on rules as an
    // attack (Guardian Mode, Warrior Mode, Hard as Steel, ...).
    if (opts.source) {
        const adjusted = adjustCrossDamage(card, side, amount, opts.source);
        if (adjusted !== amount && !opts.silent) {
            await Log.say(`${card.data.name}: ${amount} damage adjusted to ${adjusted} by abilities.`,
                { kind: 'shield', icon: '🛡️', pace: 0.5 });
        }
        amount = adjusted;
        if (amount <= 0) return 0;
    }

    card.damage += amount;
    Render.board();

    if (!opts.silent) {
        const reason = opts.reason ? ` (${opts.reason})` : '';
        await Log.say(
            `${creatureName(card, side)} took ${amount} damage${reason}.`,
            { kind: 'damage', icon: '💥', pace: 0.6 }
        );
    }
    return amount;
}

/**
 * Attaches energy and runs any on-attach ability.
 * @param {object} [opts] { side, silent, type } — `type` is the energy type;
 *   without one, each energy is rolled from the owner's deck types.
 * @returns {Promise<string[]>} the types attached
 */
async function attachEnergyTo(card, count = 1, opts = {}) {
    if (!card || count <= 0) return [];

    const owner = opts.side || (locateCard(card) || {}).side;
    const types = [];
    for (let i = 0; i < count; i++) {
        const type = ENERGY_TYPES.includes(opts.type) ? opts.type : rollEnergyType(owner);
        addEnergyUnits(card, type, 1);
        types.push(type);
    }
    Render.board();
    if (!opts.silent) {
        const label = types.every(t => t === types[0])
            ? `${count} ${types[0]} energy`
            : types.join(' + ') + ' energy';
        await Log.say(
            `${creatureName(card, opts.side)} gained ${label}.`,
            { kind: 'info', icon: ENERGY_ICONS[types[0]] || '⚡', pace: 0.6 }
        );
    }

    // Energized Healing (Nebuleap 10, Comiscroaker 20), always on: "Every time
    // you attach energy to this creature, heal N HP".
    const healId = ['energizedHealing1', 'energizedHealing2'].find(id => cardAbilityOn(card, id));
    const healAmount = healId ? PASSIVE_AMOUNTS[healId] : 0;
    if (healAmount > 0 && card.damage > 0) {
        AbilityRegistry.noteTriggered(healId);
        await Log.say(
            `${creatureName(card, opts.side)}'s Energized Healing triggered!`,
            { kind: 'ability', icon: '💧', pace: 0.6 }
        );
        await healCreature(card, healAmount, { side: opts.side });
    }
    return types;
}

/**
 * Removes energy, never below zero. Takes the types the creature's own moves
 * need least (see takeEnergyUnits).
 * @returns {Promise<number>} how many were removed; `opts.removedTypes`, if
 *   given an array, receives the types.
 */
async function discardEnergyFrom(card, count, opts = {}) {
    if (!card || count <= 0) return 0;
    const types = takeEnergyUnits(card, count, { random: !!opts.random });
    if (Array.isArray(opts.removedTypes)) opts.removedTypes.push(...types);
    Render.board();
    if (types.length > 0 && !opts.silent) {
        const counts = {};
        for (const t of types) counts[t] = (counts[t] || 0) + 1;
        const label = Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(' + ');
        await Log.say(
            `${creatureName(card, opts.side)} discarded ${label} energy.`,
            { kind: 'info', icon: '🔻', pace: 0.6 }
        );
    }
    return types.length;
}
