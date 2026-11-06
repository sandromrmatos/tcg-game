// ============================================================================
// DURATION MODEL
//
// The original code used three different mechanisms for "lasts until next turn"
// (a boolean cleared in endTurn for the ending side, a countdown decremented in
// endTurn, and an absolute `cantAttackUntilTurn` compared after the turn counter
// had already advanced). Getting any of them subtly wrong produced restrictions
// that either never applied or never expired — several of the fixed bugs.
//
// Everything now stores an ABSOLUTE turn deadline and is tested with
// Timing.active(). Nothing needs to be decremented, so nothing can drift.
//
// `gameState.turnNumber` advances by 1 per side's turn, so a given side acts on
// every second value. Given T = the turn number when an effect is created:
//
//   this turn only ................................. T
//   through the opponent's next turn ............... T + 1
//   through the opponent's next N turns ............ T + 2N - 1
//   through my own next N turns ..................... T + 2N
// ============================================================================

const Timing = {
    /** Bonuses that only apply to the attack being made right now. */
    thisTurn() {
        return gameState.turnNumber;
    },

    /**
     * Shields and protective auras: set on my turn, must cover the opponent's
     * following turn, expire before my next turn.
     * Used by Guardian Mode, Clarity Aura, Camouflage, Metalic Protection,
     * Hydration, Aqua Mirror, and every "-N damage next turn" shield.
     */
    throughOpponentTurn() {
        return gameState.turnNumber + 1;
    },

    /**
     * Restrictions I place on the opponent for N of THEIR turns.
     * N = 1 for Tidal Illusion, Mirage Shield, Quick Reflexes, Ethereal Snare.
     * N = heads count for Invincible Gambit.
     */
    opponentTurns(n) {
        return gameState.turnNumber + (2 * n) - 1;
    },

    /**
     * Restrictions on my own creature for N of MY future turns.
     * N = 1 for Wing Slap, N = 2 for Tempest Hold and the Overdrive cooldown.
     */
    myTurns(n) {
        return gameState.turnNumber + (2 * n);
    },

    /** True while the deadline has not passed. */
    active(deadline) {
        return typeof deadline === 'number' && gameState.turnNumber <= deadline;
    },

    /**
     * Turns remaining, counted in the affected side's own turns. For display.
     */
    remaining(deadline) {
        if (!this.active(deadline)) return 0;
        return Math.ceil((deadline - gameState.turnNumber + 1) / 2);
    },

    /** Formats "2 turns" / "1 turn" for messages. */
    describe(deadline) {
        const n = this.remaining(deadline);
        return `${n} turn${n === 1 ? '' : 's'}`;
    }
};

// ---------------------------------------------------------------------------
// Queries built on the model. These are the ONLY places the rules are read,
// so the player and the AI cannot disagree about them.
// ---------------------------------------------------------------------------

/** Can this side attack at all this turn? */
function sideCanAttack(side) {
    const f = gameState[side].flags;
    if (Timing.active(f.invincibleLockUntil)) {
        return { ok: false, reason: `Invincible Gambit stops ${subject(side).toLowerCase()} attacking for ${Timing.describe(f.invincibleLockUntil)}.` };
    }
    if (Timing.active(f.cantAttackUntil)) {
        return { ok: false, reason: `Quick Reflexes stops ${subject(side).toLowerCase()} attacking this turn.` };
    }
    return { ok: true };
}

/** Can this specific creature attack this turn? */
function creatureCanAttack(card, side) {
    const sideCheck = sideCanAttack(side);
    if (!sideCheck.ok) return sideCheck;
    if (!card) return { ok: false, reason: 'No active creature.' };
    if (Timing.active(card.flags.cantAttackUntil)) {
        return { ok: false, reason: `${creatureName(card, side)} can't attack this turn (Wing Slap).` };
    }
    return { ok: true };
}

/** Is a specific move available (energy, cooldown)? */
function moveIsUsable(card, move, side) {
    if (!card || !move) return { ok: false, reason: 'No move.' };
    if (!canPayMove(card, move)) {
        return { ok: false, reason: `Not enough energy for ${move.name} (needs ${describeEnergyCost(move.cost)}).` };
    }
    const cooldown = move.effect ? card.flags.cooldowns[move.effect] : null;
    if (Timing.active(cooldown)) {
        return { ok: false, reason: `${move.name} is recharging for ${Timing.describe(cooldown)}.` };
    }
    return { ok: true };
}

/** Can this creature retreat? */
function creatureCanRetreat(card, side) {
    if (!card) return { ok: false, reason: 'No active creature.' };
    // One voluntary retreat per turn, so the creature that just came in cannot
    // be retreated straight back out. Forced switches don't use this check.
    if (side && gameState[side] && gameState[side].retreatedThisTurn) {
        return { ok: false, reason: 'You can only retreat once per turn.' };
    }
    if (Timing.active(card.flags.cantRetreatUntil)) {
        return { ok: false, reason: `${creatureName(card, side)} can't retreat for ${Timing.describe(card.flags.cantRetreatUntil)}.` };
    }
    if (card.energy < card.data.retreat) {
        return { ok: false, reason: `Not enough energy to retreat (needs ${card.data.retreat} of any type).` };
    }
    if (benchCreatures(side).length === 0) {
        return { ok: false, reason: 'No bench creature to switch with.' };
    }
    return { ok: true };
}

/** Can this side play an item this turn? */
function sideCanUseItem(side) {
    const s = gameState[side];
    if (s.itemUsedThisTurn) {
        return { ok: false, reason: 'Only one item card per turn.' };
    }
    if (Timing.active(s.flags.cantUseItemsUntil)) {
        return { ok: false, reason: 'Mirage Shield prevents item use this turn.' };
    }
    return { ok: true };
}
