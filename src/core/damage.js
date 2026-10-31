// ============================================================================
// DAMAGE MODIFIER TABLE
//
// The complete, ordered list of everything that changes an attack's damage.
// Array order IS resolution order, so the whole pipeline is auditable in one
// screen, and both sides run the identical list.
//
// This replaces two hand-maintained sequences of if-blocks (one in the player
// attack path, one in the AI path) that had drifted apart: the AI path was
// missing Cotton Guard entirely and never read Amulet, Chill Recharge, Sprout
// Boost or Thunder Rush, so four of the AI's own cards did nothing.
//
// ADDING A SHIELD OR BONUS FOR A NEW SET: insert one row at the right position.
// ============================================================================

const DAMAGE_MODIFIERS = [

    // --- Attacker bonuses ---------------------------------------------------
    {
        id: 'booster',
        label: 'Booster',
        test: ctx => ctx.me.flags.booster,
        apply: (ctx, dmg) => dmg + 20,
        consume: ctx => { ctx.me.flags.booster = false; }
    },
    {
        id: 'powerUp',
        label: 'Power-Up',
        test: ctx => ctx.me.flags.powerUpAttacks > 0,
        apply: (ctx, dmg) => dmg + 10,
        consume: ctx => { ctx.me.flags.powerUpAttacks--; }
    },
    {
        id: 'hallucination',
        label: 'Hallucination',
        test: ctx => ctx.attacker.flags.hallucinationFlip === 'heads',
        apply: (ctx, dmg) => dmg + 10
        // Not consumed here: the pipeline clears the flip after the attack,
        // because the tails branch is self-damage applied later.
    },
    {
        id: 'superEffective',
        label: 'Super effective',
        test: ctx => isSuperEffective(ctx.attackerType, ctx.defenderType),
        apply: (ctx, dmg) => dmg + 10
    },
    {
        id: 'auraOfStrength',
        label: 'Aura of Strength',
        test: ctx => ctx.me.flags.auraOfStrengthBonus > 0,
        apply: (ctx, dmg) => dmg + ctx.me.flags.auraOfStrengthBonus,
        consume: ctx => { ctx.me.flags.auraOfStrengthBonus = 0; }
    },
    {
        id: 'sturdyPresence',
        label: 'Sturdy Presence',
        test: ctx => ctx.me.flags.sturdyPresenceBonus > 0,
        apply: (ctx, dmg) => dmg + ctx.me.flags.sturdyPresenceBonus,
        consume: ctx => { ctx.me.flags.sturdyPresenceBonus = 0; }
    },
    {
        id: 'warriorMode',
        label: 'Warrior Mode',
        test: ctx => ctx.me.flags.warriorModeBonus > 0,
        apply: (ctx, dmg) => dmg + ctx.me.flags.warriorModeBonus,
        consume: ctx => { ctx.me.flags.warriorModeBonus = 0; }
    },
    {
        id: 'amulet',
        label: 'Amulet',
        test: ctx => Timing.active(ctx.me.flags.amuletUntil) &&
                     ctx.attackerType === 'Neutral',
        apply: (ctx, dmg) => dmg + 20
    },
    {
        id: 'chillRecharge',
        label: 'Chill Recharge',
        test: ctx => ctx.attacker.flags.chillRecharge,
        apply: (ctx, dmg) => dmg + 20,
        consume: ctx => { ctx.attacker.flags.chillRecharge = false; }
    },
    {
        id: 'sproutBoost',
        label: 'Sprout Boost',
        test: ctx => ctx.attacker.flags.sproutBoostReady,
        apply: (ctx, dmg) => dmg + 30,
        consume: ctx => { ctx.attacker.flags.sproutBoostReady = false; }
    },
    {
        id: 'thunderRush',
        label: 'Thunder Rush',
        test: ctx => ctx.me.flags.thunderRush,
        apply: (ctx, dmg) => dmg * 2,
        consume: ctx => { ctx.me.flags.thunderRush = false; }
    },

    // --- Defender reductions ------------------------------------------------
    {
        id: 'monksFury',
        label: "Monk's Fury",
        test: ctx => readShield(ctx.them.flags.shields, 'monksFury'),
        apply: (ctx, dmg) => dmg - readShield(ctx.them.flags.shields, 'monksFury').amount,
        consume: ctx => consumeShield(ctx.them.flags.shields, 'monksFury')
    },
    {
        id: 'hardAsSteel',
        label: 'Hard as Steel',
        test: ctx => readShield(ctx.them.flags.shields, 'hardAsSteel') &&
                     (ctx.attackerType === 'Mechanic' || ctx.attackerType === 'Neutral'),
        apply: (ctx, dmg) => dmg - readShield(ctx.them.flags.shields, 'hardAsSteel').amount,
        consume: ctx => consumeShield(ctx.them.flags.shields, 'hardAsSteel')
    },
    {
        id: 'spectralBurst',
        label: 'Spectral Burst',
        test: ctx => readShield(ctx.them.flags.shields, 'spectralBurst'),
        apply: (ctx, dmg) => dmg - readShield(ctx.them.flags.shields, 'spectralBurst').amount,
        consume: ctx => consumeShield(ctx.them.flags.shields, 'spectralBurst')
    },
    {
        id: 'defenseAura',
        label: 'Defense Aura',
        test: ctx => readShield(ctx.them.flags.shields, 'defenseAura'),
        apply: (ctx, dmg) => dmg - readShield(ctx.them.flags.shields, 'defenseAura').amount,
        consume: ctx => consumeShield(ctx.them.flags.shields, 'defenseAura')
    },
    {
        id: 'shieldBarrier',
        label: 'Shield Barrier',
        test: ctx => readShield(ctx.them.flags.shields, 'shieldBarrier'),
        apply: (ctx, dmg) => dmg - readShield(ctx.them.flags.shields, 'shieldBarrier').amount,
        consume: ctx => consumeShield(ctx.them.flags.shields, 'shieldBarrier')
    },
    {
        id: 'galeShield',
        label: 'Gale Shield',
        test: ctx => readShield(ctx.them.flags.shields, 'galeShield') &&
                     ctx.defenderType === 'Wind',
        apply: (ctx, dmg) => dmg - readShield(ctx.them.flags.shields, 'galeShield').amount,
        consume: ctx => consumeShield(ctx.them.flags.shields, 'galeShield')
    },
    {
        id: 'mindRipple',
        label: 'Mind Ripple',
        test: ctx => readShield(ctx.defender.flags.shields, 'mindRipple'),
        apply: (ctx, dmg) => dmg - readShield(ctx.defender.flags.shields, 'mindRipple').amount,
        consume: ctx => consumeShield(ctx.defender.flags.shields, 'mindRipple')
    },
    {
        id: 'cottonGuard',
        label: 'Cotton Guard',
        test: ctx => readShield(ctx.defender.flags.shields, 'cottonGuard'),
        apply: (ctx, dmg) => dmg - readShield(ctx.defender.flags.shields, 'cottonGuard').amount,
        consume: ctx => consumeShield(ctx.defender.flags.shields, 'cottonGuard')
    },
    {
        id: 'guardianMode',
        label: 'Guardian Mode',
        // Lasts the whole turn, so it is deliberately not consumed.
        test: ctx => Timing.active(ctx.them.flags.guardianModeUntil),
        apply: (ctx, dmg) => dmg - 10
    },
    {
        id: 'caprineGuard',
        label: 'Caprine Guard',
        test: ctx => readShield(ctx.them.flags.shields, 'caprineGuard') &&
                     (ctx.attackerType === 'Celestial' || ctx.attackerType === 'Mystic'),
        apply: (ctx, dmg) => dmg - readShield(ctx.them.flags.shields, 'caprineGuard').amount,
        consume: ctx => consumeShield(ctx.them.flags.shields, 'caprineGuard')
    },
    {
        id: 'elementalFortitude',
        label: 'Elemental Fortitude',
        test: ctx => readShield(ctx.defender.flags.shields, 'elementalFortitude') &&
                     (ctx.attackerType === 'Wind' || ctx.attackerType === 'Mechanic'),
        apply: (ctx, dmg) => dmg - readShield(ctx.defender.flags.shields, 'elementalFortitude').amount,
        consume: ctx => consumeShield(ctx.defender.flags.shields, 'elementalFortitude')
    },
    {
        id: 'metalicProtection',
        label: 'Metalic Protection',
        // Total immunity for the turn, so also not consumed.
        test: ctx => Timing.active(ctx.defender.flags.metalicProtectionUntil) &&
                     ctx.attackerType === 'Mechanic',
        apply: () => 0
    },
    {
        id: 'tidalIllusion',
        label: 'Tidal Illusion',
        test: ctx => Timing.active(ctx.me.flags.cantDealDamageUntil),
        apply: () => 0
    }
];

/**
 * Runs the whole modifier list in order and logs each one that fires.
 *
 * @param {object} ctx  { side, foe, me, them, attacker, defender,
 *                        attackerType, defenderType }
 * @param {number} startingDamage
 * @returns {Promise<number>} final damage, never below 0
 */
async function applyDamageModifiers(ctx, startingDamage) {
    let damage = startingDamage;

    for (const mod of DAMAGE_MODIFIERS) {
        if (!mod.test(ctx)) continue;

        const before = damage;
        damage = Math.max(0, mod.apply(ctx, damage));
        if (mod.consume) mod.consume(ctx);

        if (damage === before) continue;

        const delta = damage - before;
        const rendered = delta > 0 ? `+${delta}` : `${delta}`;
        await Log.say(
            `${mod.label}: ${rendered} damage (now ${damage}).`,
            { kind: delta > 0 ? 'damage' : 'shield', icon: delta > 0 ? '⬆️' : '🛡️', pace: 0.5 }
        );
    }

    return damage;
}
