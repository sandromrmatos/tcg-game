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

    // Absorb Energy (Lumifloris, Photosynthra): continuous while in play, per
    // the card text "When this creature is healed, it also gains an Energy".
    if (restored > 0 && card.flags.absorbEnergy) {
        card.energy++;
        Render.board();
        await Log.say(
            `${creatureName(card, opts.side)}'s Absorb Energy attached 1 energy!`,
            { kind: 'ability', icon: '⚡', pace: 0.6 }
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

    // Camouflage protects the whole bench for a turn.
    if (location === 'bench' && side && Timing.active(gameState[side].flags.camouflageUntil)) {
        if (!opts.silent) {
            await Log.say(
                `${possessive(side)} Camouflage protected ${card.data.name} on the bench!`,
                { kind: 'ability', icon: '🍃', pace: 0.6 }
            );
        }
        return 0;
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

/** Attaches energy and runs any on-attach ability. */
async function attachEnergyTo(card, count = 1, opts = {}) {
    if (!card || count <= 0) return;

    card.energy += count;
    Render.board();
    if (!opts.silent) {
        await Log.say(
            `${creatureName(card, opts.side)} gained ${count} energy.`,
            { kind: 'info', icon: '⚡', pace: 0.6 }
        );
    }

    // Energized Healing (Nebuleap, Comiscroaker): continuous, per the card text
    // "Every time you attach energy to this creature, heal N HP".
    const healAmount = card.flags.energizedHealing;
    if (healAmount > 0 && card.damage > 0) {
        await Log.say(
            `${creatureName(card, opts.side)}'s Energized Healing triggered!`,
            { kind: 'ability', icon: '💧', pace: 0.6 }
        );
        await healCreature(card, healAmount, { side: opts.side });
    }
}

/** Removes energy, never below zero. */
async function discardEnergyFrom(card, count, opts = {}) {
    if (!card || count <= 0) return 0;
    const removed = Math.min(card.energy, count);
    card.energy -= removed;
    Render.board();
    if (removed > 0 && !opts.silent) {
        await Log.say(
            `${creatureName(card, opts.side)} discarded ${removed} energy.`,
            { kind: 'info', icon: '🔻', pace: 0.6 }
        );
    }
    return removed;
}
