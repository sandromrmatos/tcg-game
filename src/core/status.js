// ============================================================================
// STATUS CONDITIONS
//
// One entry point. `Status.apply()` owns every gate:
//   * the target must exist and still be alive
//   * Hydration on the target blocks all status
//   * Clarity Aura on the target's side blocks Hallucination
//   * Aqua Mirror on the target reflects the status back at the attacker
//
// The original code had three competing representations (a Set, three legacy
// booleans, and an applyHallucination() helper that wrote the booleans) with
// eight sites writing them directly. That is why some moves respected Clarity
// Aura and others didn't. There is now exactly one writer.
//
// Adding a fourth status = one entry in STATUS_CONDITIONS + one CSS class.
// ============================================================================

const STATUS_CONDITIONS = {
    hallucination: {
        name: 'Hallucination',
        icon: '😵',
        blurb: 'When attacking, flip a coin. Heads: +10 damage. Tails: 40 self-damage.',
        blockedByClarityAura: true
    },
    flux: {
        name: 'Flux',
        icon: '⚡',
        blurb: 'When attaching energy, flip 2 coins. Both tails: attachment blocked.',
        blockedByClarityAura: false
    },
    lock: {
        name: 'Lock',
        icon: '🔒',
        blurb: 'When using an item, flip a coin. Tails: the item stays in hand.',
        blockedByClarityAura: false
    }
};

const Status = {
    has(card, statusName) {
        return !!card && card.status instanceof Set && card.status.has(statusName);
    },

    any(card) {
        return !!card && card.status instanceof Set && card.status.size > 0;
    },

    list(card) {
        return card && card.status ? Array.from(card.status) : [];
    },

    /**
     * Applies a status condition, respecting every protection.
     *
     * @param {object} card       the target creature instance
     * @param {string} statusName key in STATUS_CONDITIONS
     * @param {object} opts       { targetSide, attackerSide, reflected }
     * @returns {Promise<boolean>} true if the status landed
     */
    async apply(card, statusName, opts = {}) {
        const condition = STATUS_CONDITIONS[statusName];
        if (!condition) {
            console.error(`[Status] unknown condition: ${statusName}`);
            return false;
        }
        if (!card) return false;

        const targetSide = opts.targetSide || (locateCard(card) || {}).side;

        // Status only ever lands on a living creature. This single check
        // replaces the per-effect "did the defender survive?" guards that were
        // inconsistently applied across the old switch statements.
        if (isFainted(card)) {
            await Log.say(
                `${creatureName(card, targetSide)} was knocked out before ${condition.name} could apply.`,
                { kind: 'info', pace: 0.5 }
            );
            return false;
        }

        if (Timing.active(card.flags.hydrationUntil)) {
            await Log.say(
                `${creatureName(card, targetSide)} is protected from ${condition.name} by Hydration!`,
                { kind: 'status', icon: '💧' }
            );
            return false;
        }

        if (condition.blockedByClarityAura && targetSide &&
            Timing.active(gameState[targetSide].flags.clarityAuraUntil)) {
            await Log.say(
                `${creatureName(card, targetSide)} is protected from ${condition.name} by Clarity Aura!`,
                { kind: 'status', icon: '✨' }
            );
            return false;
        }

        if (card.status.has(statusName)) {
            // Already afflicted; nothing stacks.
            return false;
        }

        card.status.add(statusName);
        Render.board();
        await Log.say(
            `${creatureName(card, targetSide)} is now affected by ${condition.name}!`,
            { kind: 'status', icon: condition.icon }
        );

        // Aqua Mirror sends the same condition back at the attacker.
        if (Timing.active(card.flags.aquaMirrorUntil) && !opts.reflected && opts.attackerSide) {
            const attacker = gameState[opts.attackerSide].active;
            if (attacker) {
                await Log.say(
                    `${creatureName(card, targetSide)}'s Aqua Mirror reflects ${condition.name}!`,
                    { kind: 'status', icon: '🪞' }
                );
                await this.apply(attacker, statusName, {
                    targetSide: opts.attackerSide,
                    attackerSide: targetSide,
                    reflected: true
                });
            }
        }

        return true;
    },

    remove(card, statusName) {
        if (card && card.status) card.status.delete(statusName);
    },

    /**
     * Clears every status. Called whenever a creature leaves the active slot
     * (retreat, forced swap, Phase Shift, knockout) and by Remedy.
     * @returns {Promise<boolean>} true if anything was cleared
     */
    async clear(card, opts = {}) {
        if (!card || !card.status || card.status.size === 0) return false;

        const names = this.list(card)
            .map(s => STATUS_CONDITIONS[s].name)
            .join(', ');
        card.status.clear();
        card.flags.hallucinationFlip = null;

        if (opts.silent) return true;
        await Log.say(
            `${creatureName(card, opts.side)} recovered from ${names}.`,
            { kind: 'heal', icon: '🌿', pace: 0.6 }
        );
        return true;
    }
};
