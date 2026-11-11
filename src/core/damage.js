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
    // Always-on abilities of the attacking side (one bonus each, however many
    // copies of the creature are in play).
    {
        id: 'auraOfStrength',
        label: 'Aura of Strength',
        test: ctx => sideHasAbility(ctx.side, 'auraOfStrength') &&
                     benchCreatures(ctx.side).length >= BENCH_SIZE,
        apply: (ctx, dmg) => passiveBonus('auraOfStrength', dmg + 30)
    },
    {
        id: 'sturdyPresence',
        label: 'Sturdy Presence',
        test: ctx => sideHasAbility(ctx.side, 'sturdyPresence'),
        apply: (ctx, dmg) => passiveBonus('sturdyPresence', dmg + 20)
    },
    {
        id: 'warriorMode',
        label: 'Warrior Mode',
        test: ctx => sideHasAbility(ctx.side, 'warriorMode'),
        apply: (ctx, dmg) => passiveBonus('warriorMode', dmg + 10)
    },
    {
        id: 'amulet',
        label: 'Amulet',
        test: ctx => Timing.active(ctx.me.flags.amuletUntil) &&
                     ctx.attackerType === 'Neutral',
        apply: (ctx, dmg) => dmg + 20
    },
    {
        id: 'mysticAmulet',
        label: 'Mystic Amulet',
        test: ctx => accessoryOn(ctx.attacker, 'mysticAmulet'),
        apply: (ctx, dmg) => dmg + 10
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
        // "...if your opponent evolved a creature in the last turn."
        test: ctx => cardAbilityOn(ctx.attacker, 'thunderRush') &&
                     ctx.them.flags.evolvedOnTurn === gameState.turnNumber - 1,
        apply: (ctx, dmg) => passiveBonus('thunderRush', dmg * 2)
    },

    // --- Defender reductions ------------------------------------------------
    // Monk's Fury and Spectral Burst protect the creature that used them, not
    // whoever happens to be active when the next attack lands.
    {
        id: 'monksFury',
        label: "Monk's Fury",
        test: ctx => readShield(ctx.defender.flags.shields, 'monksFury'),
        apply: (ctx, dmg) => dmg - readShield(ctx.defender.flags.shields, 'monksFury').amount,
        consume: ctx => consumeShield(ctx.defender.flags.shields, 'monksFury')
    },
    {
        id: 'hardAsSteel',
        label: 'Hard as Steel',
        test: ctx => cardAbilityOn(ctx.defender, 'hardAsSteel') &&
                     (ctx.attackerType === 'Mechanic' || ctx.attackerType === 'Neutral'),
        apply: (ctx, dmg) => passiveBonus('hardAsSteel', dmg - 30)
    },
    {
        id: 'spectralBurst',
        label: 'Spectral Burst',
        test: ctx => readShield(ctx.defender.flags.shields, 'spectralBurst'),
        apply: (ctx, dmg) => dmg - readShield(ctx.defender.flags.shields, 'spectralBurst').amount,
        consume: ctx => consumeShield(ctx.defender.flags.shields, 'spectralBurst')
    },
    {
        id: 'defenseAura',
        label: 'Defense Aura',
        // The defender is the active creature, which is where Defense Aura works.
        test: ctx => cardAbilityOn(ctx.defender, 'defenseAura'),
        apply: (ctx, dmg) => passiveBonus('defenseAura', dmg - 10)
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
    // Always-on abilities of the defending creature or its side.
    {
        id: 'guardianMode',
        label: 'Guardian Mode',
        test: ctx => sideHasAbility(ctx.foe, 'guardianMode'),
        apply: (ctx, dmg) => passiveBonus('guardianMode', dmg - 10)
    },
    {
        id: 'caprineGuard',
        label: 'Caprine Guard',
        test: ctx => cardAbilityOn(ctx.defender, 'caprineGuard') &&
                     (ctx.attackerType === 'Celestial' || ctx.attackerType === 'Mystic'),
        apply: (ctx, dmg) => passiveBonus('caprineGuard', dmg - 40)
    },
    {
        id: 'elementalFortitude',
        label: 'Elemental Fortitude',
        test: ctx => cardAbilityOn(ctx.defender, 'elementalFortitude') &&
                     (ctx.attackerType === 'Wind' || ctx.attackerType === 'Mechanic'),
        apply: (ctx, dmg) => passiveBonus('elementalFortitude', dmg - 20)
    },
    {
        id: 'metalicProtection',
        label: 'Metalic Protection',
        test: ctx => cardAbilityOn(ctx.defender, 'metalicProtection') &&
                     ctx.attackerType === 'Mechanic',
        apply: () => passiveBonus('metalicProtection', 0)
    },

    // --- Temporal Rift defences -------------------------------------------
    {
        id: 'oreLash',
        label: 'Ore Lash',
        test: ctx => readShield(ctx.defender.flags.shields, 'oreLash'),
        apply: (ctx, dmg) => dmg - readShield(ctx.defender.flags.shields, 'oreLash').amount,
        consume: ctx => consumeShield(ctx.defender.flags.shields, 'oreLash')
    },
    {
        id: 'coreTangle',
        label: 'Core Tangle',
        test: ctx => readShield(ctx.defender.flags.shields, 'coreTangle'),
        apply: (ctx, dmg) => dmg - readShield(ctx.defender.flags.shields, 'coreTangle').amount,
        consume: ctx => consumeShield(ctx.defender.flags.shields, 'coreTangle')
    },
    {
        id: 'foxyArmor',
        label: 'Foxy Armor',
        test: ctx => sideHasAbility(ctx.foe, 'foxyArmor') && vulpettaEvolutions(ctx.foe).length > 0,
        apply: (ctx, dmg) => passiveBonus('foxyArmor', dmg - 10 * vulpettaEvolutions(ctx.foe).length)
    },
    {
        id: 'techShieldA',
        label: 'Tech Shield',
        test: ctx => sideHasAbility(ctx.foe, 'techShieldA') && nameHas(ctx.attacker, 'a'),
        apply: (ctx, dmg) => passiveBonus('techShieldA', dmg - 20)
    },
    {
        id: 'techShieldE',
        label: 'Tech Shield',
        test: ctx => sideHasAbility(ctx.foe, 'techShieldE') && nameHas(ctx.attacker, 'e'),
        apply: (ctx, dmg) => passiveBonus('techShieldE', dmg - 20)
    },
    {
        id: 'celestialArmor',
        label: 'Celestial Armor',
        test: ctx => accessoryOn(ctx.defender, 'celestialArmor'),
        apply: (ctx, dmg) => dmg - 10
    },
    {
        id: 'mechanicToolkit',
        label: 'Mechanic Toolkit',
        test: ctx => accessoryOn(ctx.defender, 'mechanicToolkit') && !!ctx.defender.data.abilityEffect,
        apply: (ctx, dmg) => dmg - 20
    },
    {
        id: 'anchoredTerrain',
        label: 'Anchored Terrain',
        test: ctx => Timing.active(ctx.defender.flags.anchoredUntil) && ctx.attackerType === 'Mechanic',
        apply: () => 0
    },
    {
        id: 'stealthMode',
        label: 'Stealth Mode',
        test: ctx => cardAbilityOn(ctx.defender, 'stealthMode') && ctx.attacker.energy < ctx.defender.energy,
        apply: (ctx, dmg) => passiveBonus('stealthMode', Math.ceil(dmg / 2))
    },
    {
        id: 'bloomshroud',
        label: 'Bloomshroud',
        test: ctx => bloomshroudSafe(ctx.defender),
        apply: () => 0
    },
    // Last of the defences: it reads the damage the attack would really deal.
    {
        id: 'overloadGuard',
        label: 'Overload Guard',
        test: ctx => cardAbilityOn(ctx.defender, 'overloadGuard'),
        apply: (ctx, dmg) => dmg >= 50 ? passiveBonus('overloadGuard', 0) : dmg
    },

    // --- "Deals no damage" restrictions on the attacking side -------------
    {
        id: 'tidalIllusion',
        label: 'Tidal Illusion',
        test: ctx => Timing.active(ctx.me.flags.cantDealDamageUntil),
        apply: () => 0
    },
    {
        id: 'invincibleGambit',
        label: 'Invincible Gambit',
        test: ctx => Timing.active(ctx.me.flags.invincibleLockUntil),
        apply: () => 0
    }
];

/** Tech Shield: does this creature's name contain the letter (any case)? */
function nameHas(card, letter) {
    return !!card && !!card.data && card.data.name.toLowerCase().includes(letter);
}

/** Bloomshroud: the opponent flipped tails this turn, so nothing can touch it. */
function bloomshroudSafe(card) {
    return !!card && card.flags.bloomshroudSafeTurn === gameState.turnNumber;
}

/** Records an always-on ability firing (for test coverage) and passes the value through. */
function passiveBonus(abilityId, value) {
    if (typeof AbilityRegistry !== 'undefined') AbilityRegistry.noteTriggered(abilityId);
    return value;
}

/**
 * The same always-on rules for damage that doesn't come from the attack itself
 * (bench sweeps, Rainbow Strike, Gnawing Precision, Retaliation Stone), when a
 * creature on one side damages a creature on the other.
 *
 * @param {object} target  the creature being hit
 * @param {string} targetSide
 * @param {number} amount
 * @param {object} source  { card, side, kind: 'move' | 'ability' }
 * @returns {number} the adjusted amount, never below 0
 */
function adjustCrossDamage(target, targetSide, amount, source) {
    if (!source || !source.side || source.side === targetSide) return amount;
    const from = gameState[source.side].flags;
    // "Deals no damage" (Invincible Gambit, Tidal Illusion): everything the
    // side deals on its locked turns, not only its attack. The turns of the
    // side that cast it in between don't count.
    if (gameState.currentTurn === source.side &&
        (Timing.active(from.invincibleLockUntil) || Timing.active(from.cantDealDamageUntil))) return 0;

    const sourceType = source.card ? getCardType(source.card.data) : null;
    let dmg = amount;
    if (sideHasAbility(source.side, 'warriorMode')) dmg = passiveBonus('warriorMode', dmg + 10);
    if (sideHasAbility(targetSide, 'guardianMode')) dmg = passiveBonus('guardianMode', dmg - 10);
    if (cardAbilityOn(target, 'hardAsSteel') && (sourceType === 'Mechanic' || sourceType === 'Neutral')) {
        dmg = passiveBonus('hardAsSteel', dmg - 30);
    }
    if (cardAbilityOn(target, 'elementalFortitude') && (sourceType === 'Wind' || sourceType === 'Mechanic')) {
        dmg = passiveBonus('elementalFortitude', dmg - 20);
    }
    // These two name moves / attacks, so ability damage isn't reduced by them.
    if (source.kind === 'move' && cardAbilityOn(target, 'caprineGuard') &&
        (sourceType === 'Celestial' || sourceType === 'Mystic')) {
        dmg = passiveBonus('caprineGuard', dmg - 40);
    }
    if (source.kind === 'move' && cardAbilityOn(target, 'metalicProtection') && sourceType === 'Mechanic') {
        dmg = passiveBonus('metalicProtection', 0);
    }
    // Temporal Rift: protections for the active creature apply to any damage
    // it takes; accessories that name "attacks" only to moves.
    const isActive = gameState[targetSide] && gameState[targetSide].active === target;
    if (isActive && sideHasAbility(targetSide, 'foxyArmor')) {
        const n = vulpettaEvolutions(targetSide).length;
        if (n) dmg = passiveBonus('foxyArmor', dmg - 10 * n);
    }
    if (isActive && sideHasAbility(targetSide, 'techShieldA') && nameHas(source.card, 'a')) dmg = passiveBonus('techShieldA', dmg - 20);
    if (isActive && sideHasAbility(targetSide, 'techShieldE') && nameHas(source.card, 'e')) dmg = passiveBonus('techShieldE', dmg - 20);
    if (source.kind === 'move' && accessoryOn(target, 'celestialArmor')) dmg -= 10;
    if (source.kind === 'move' && accessoryOn(target, 'mechanicToolkit') && target.data.abilityEffect) dmg -= 20;
    if (source.kind === 'move' && Timing.active(target.flags.anchoredUntil) && sourceType === 'Mechanic') dmg = 0;
    if (bloomshroudSafe(target)) dmg = 0;
    return Math.max(0, dmg);
}

/**
 * Runs the whole modifier list in order and logs each one that fires.
 *
 * @param {object} ctx  { side, foe, me, them, attacker, defender,
 *                        attackerType, defenderType }
 * @param {number} startingDamage
 * @returns {Promise<number>} final damage, never below 0
 */
async function applyDamageModifiers(ctx, startingDamage) {
    // A move that does no damage (a missed coin flip, a utility move) stays at
    // 0: bonuses such as super effective, Booster or Amulet only add to damage
    // that is actually being dealt. Single-use bonuses are not spent on it.
    if (!(startingDamage > 0)) return 0;

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
