// ============================================================================
// MOVE EFFECT REGISTRY
//
// Each effect is declared EXACTLY ONCE, with the phases it participates in:
//
//   onDamageCalc(ctx) -> number
//       Runs while damage is being computed. Return the new damage.
//
//   onResolve(ctx)
//       Runs after damage is applied, ALWAYS — including when the attack
//       knocked the defender out. This is where attacker-side consequences go
//       (recoil, self-heal, cooldowns, shields, draws, bench effects).
//
//   onResolveIfTargetAlive(ctx)
//       Runs only if the defender survived. For things that manipulate the
//       defender or the defender's side in a way that is meaningless once it
//       has fainted (retreat locks, forced swaps, forced knockouts).
//
// Status conditions may be applied from either resolve hook: Status.apply()
// already refuses to land on a fainted creature and says so, which is why the
// old "did the defender survive?" guard is not repeated per effect.
//
// The original code dispatched the same effect from six places (two inline
// pre-damage chains, two inline post-damage chains, and two shared switches),
// mirrored again for the AI, with routing driven by a 33-name exclusion array
// copy-pasted four times. All of that is replaced by this table.
//
// ADDING A MOVE FOR A NEW SET: add one register() call. validate.js will fail
// loudly at startup if a card references an effect id that isn't registered.
// ============================================================================

const EffectRegistry = {
    effects: new Map(),

    register(id, definition) {
        if (this.effects.has(id)) {
            console.error(`[Effects] duplicate registration for "${id}"`);
        }
        this.effects.set(id, Object.assign({ id }, definition));
    },

    get(id) {
        return id ? this.effects.get(id) || null : null;
    },

    has(id) {
        return this.effects.has(id);
    },

    ids() {
        return Array.from(this.effects.keys());
    },

    /** Phase C. Returns the adjusted damage. */
    async damageCalc(ctx) {
        const def = this.get(ctx.move.effect);
        if (!def) return ctx.damage;
        // Null Orb (Crystal Canopy): the move deals its printed damage and
        // nothing else happens. Said once, here.
        if (movesNegated(ctx.side)) {
            await ctx.say(`Null Orb: ${ctx.move.name} only deals its printed damage.`, { kind: 'status', icon: '⚫', pace: 0.6 });
            return ctx.damage;
        }
        if (!def.onDamageCalc) return ctx.damage;
        const result = await def.onDamageCalc(ctx);
        return typeof result === 'number' ? Math.max(0, result) : ctx.damage;
    },

    /** Phase F, part 1. Always runs. */
    async resolve(ctx) {
        const def = this.get(ctx.move.effect);
        if (movesNegated(ctx.side)) return;
        if (def && def.onResolve) await def.onResolve(ctx);
    },

    /** Phase F, part 2. Only when the defender is still standing. */
    async resolveIfTargetAlive(ctx) {
        const def = this.get(ctx.move.effect);
        if (!def || !def.onResolveIfTargetAlive) return;
        if (movesNegated(ctx.side)) return;
        if (isFainted(ctx.defender)) return;
        await def.onResolveIfTargetAlive(ctx);
    }
};

// ---------------------------------------------------------------------------
// Shorthand builders for the patterns that repeat across many cards.
// ---------------------------------------------------------------------------

/** "Flip a coin. If heads, this move does +N damage." */
function bonusDamageOnHeads(bonus) {
    return {
        async onDamageCalc(ctx) {
            const flip = await ctx.flip(ctx.move.name);
            if (flip !== 'heads') return ctx.damage;
            await ctx.say(`+${bonus} damage!`, { kind: 'damage', pace: 0.5 });
            return ctx.damage + bonus;
        }
    };
}

/** "Flip a coin. If tails, this move does nothing." */
function nothingOnTails() {
    return {
        async onDamageCalc(ctx) {
            const flip = await ctx.flip(ctx.move.name);
            if (flip === 'heads') return ctx.damage;
            await ctx.say(`${ctx.move.name} misses entirely.`, { kind: 'info', pace: 0.5 });
            return 0;
        }
    };
}

/** "Flip N coins. This move does D damage for each heads." */
function damagePerHeads(coins, per) {
    return {
        async onDamageCalc(ctx) {
            const { heads } = await ctx.flipMany(coins, ctx.move.name);
            const total = heads * per;
            await ctx.say(`${heads} heads: ${total} damage.`, { kind: 'damage', pace: 0.5 });
            return total;
        }
    };
}

/** "Flip until tails. This move does +D damage for each heads." */
function bonusPerHeadsUntilTails(per) {
    return {
        async onDamageCalc(ctx) {
            const { heads } = await ctx.flipUntilTails(ctx.move.name);
            const bonus = heads * per;
            await ctx.say(`${heads} heads before tails: +${bonus} damage.`,
                { kind: 'damage', pace: 0.5 });
            return ctx.damage + bonus;
        }
    };
}

/** "Roll a die. This move does D times the roll." */
function damagePerDieRoll(per) {
    return {
        async onDamageCalc(ctx) {
            const roll = await ctx.roll(ctx.move.name);
            const total = roll * per;
            await ctx.say(`${total} damage.`, { kind: 'damage', pace: 0.5 });
            return total;
        }
    };
}

/** Damage scaled by something countable on the board. */
function damagePerCount(per, describe, count) {
    return {
        async onDamageCalc(ctx) {
            const n = count(ctx);
            const total = n * per;
            await ctx.say(`${describe(n, ctx)}: ${total} damage.`,
                { kind: 'damage', pace: 0.6 });
            return total;
        }
    };
}

/** Heals the attacker for a fixed amount, always (even on a knockout). */
function selfHeal(amount) {
    return {
        async onResolve(ctx) {
            await ctx.heal(ctx.attacker, amount);
        }
    };
}

/** Damages the attacker for a fixed amount, always. */
function selfRecoil(amount) {
    return {
        async onResolve(ctx) {
            await ctx.hit(ctx.attacker, amount, {
                side: ctx.side,
                location: 'active',
                reason: 'recoil'
            });
        }
    };
}

/** Applies one status condition to the defender. */
function statusOnDefender(statusName) {
    return {
        async onResolve(ctx) {
            await ctx.status(ctx.defender, statusName);
        }
    };
}

/** "Flip a coin. If heads, this move causes <status>." */
function statusOnDefenderIfHeads(statusName) {
    return {
        async onResolve(ctx) {
            const flip = await ctx.flip(ctx.move.name);
            if (flip === 'heads') {
                await ctx.status(ctx.defender, statusName);
            } else {
                await ctx.say('No condition inflicted.', { kind: 'info', pace: 0.5 });
            }
        }
    };
}

/** Grants the attacker's creature a damage shield for the opponent's turn. */
function creatureShield(key, amount, label) {
    return {
        async onResolve(ctx) {
            grantCreatureShield(ctx.attacker, key, amount);
            await ctx.say(
                `${creatureName(ctx.attacker, ctx.side)} will take ${amount} less damage next turn (${label}).`,
                { kind: 'ability', icon: '🛡️' }
            );
        }
    };
}

// ===========================================================================
// DAMAGE CALCULATION EFFECTS
// ===========================================================================

EffectRegistry.register('dizzyShot', bonusDamageOnHeads(20));
EffectRegistry.register('fortuneSmite', bonusDamageOnHeads(20));
EffectRegistry.register('gearGrind', bonusDamageOnHeads(20));
EffectRegistry.register('featherBarrage', bonusDamageOnHeads(20));
EffectRegistry.register('foresightBeam', bonusDamageOnHeads(10));

EffectRegistry.register('hurricaneWing', nothingOnTails());
EffectRegistry.register('tailDance', nothingOnTails());

EffectRegistry.register('toxicToss', damagePerHeads(2, 20));
EffectRegistry.register('pinkGust', damagePerHeads(2, 30));
EffectRegistry.register('galeFlip', damagePerHeads(4, 40));

EffectRegistry.register('echoLoop', bonusPerHeadsUntilTails(10));
EffectRegistry.register('harshFlinch', bonusPerHeadsUntilTails(20));

EffectRegistry.register('diceFury', damagePerDieRoll(10));
EffectRegistry.register('diceTempest', damagePerDieRoll(20));

// Coin Clash, and Crystal Canopy's Bubble Gambler: "Flip a coin. If heads, 30 damage."
EffectRegistry.register('coinClash', {
    async onDamageCalc(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip === 'heads') {
            await ctx.say(`${ctx.move.name} connects for 30!`, { kind: 'damage', pace: 0.5 });
            return 30;
        }
        await ctx.say(`${ctx.move.name} does nothing.`, { kind: 'info', pace: 0.5 });
        return 0;
    }
});

EffectRegistry.register('verdantStruggle', {
    async onDamageCalc(ctx) {
        const { heads } = await ctx.flipMany(2, ctx.move.name);
        if (heads === 2) {
            await ctx.say('Both heads: 50 damage!', { kind: 'damage', pace: 0.5 });
            return 50;
        }
        await ctx.say('Not both heads: no damage.', { kind: 'info', pace: 0.5 });
        return 0;
    }
});

// "Flip 2 coins. This move does an extra 40 damage for each heads."
// Declared as a damage bonus rather than post-damage, so it is reduced by
// shields like any other damage and cannot be lost when the target dies.
EffectRegistry.register('prismaticDive', {
    async onDamageCalc(ctx) {
        const { heads } = await ctx.flipMany(2, ctx.move.name);
        if (heads === 0) {
            await ctx.say('No extra damage.', { kind: 'info', pace: 0.5 });
            return ctx.damage;
        }
        const bonus = heads * 40;
        await ctx.say(`+${bonus} damage!`, { kind: 'damage', pace: 0.5 });
        return ctx.damage + bonus;
    }
});

// "Flip a coin. If heads, +30 damage. This move causes Hallucination."
EffectRegistry.register('etherealEcho', {
    async onDamageCalc(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') return ctx.damage;
        await ctx.say('+30 damage!', { kind: 'damage', pace: 0.5 });
        return ctx.damage + 30;
    },
    async onResolve(ctx) {
        await ctx.status(ctx.defender, 'hallucination');
    }
});

// "20 damage for each Wind energy attached to it": other types don't count.
EffectRegistry.register('nightStrike', damagePerCount(
    20,
    n => `${n} Wind energy attached`,
    ctx => ctx.attacker.energyUnits.Wind || 0
));

// "Flip a coin. If heads, your opponent can only draw Celestial energy next
// turn." Their next turn's energy is Celestial, whatever their deck uses.
EffectRegistry.register('starfallStrike', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('No effect on their energy.', { kind: 'info', pace: 0.5 });
            return;
        }
        ctx.them.flags.forcedEnergyType = 'Celestial';
        ctx.them.flags.forcedEnergyUntil = Timing.opponentTurns(1);
        await ctx.say(`${subject(ctx.foe)} can only draw Celestial energy next turn.`,
            { kind: 'status', icon: ENERGY_ICONS.Celestial });
    }
});

EffectRegistry.register('etherealPulse', damagePerCount(
    20,
    n => `${n} energy across both active creatures`,
    ctx => (ctx.attacker ? ctx.attacker.energy : 0) + (ctx.defender ? ctx.defender.energy : 0)
));

EffectRegistry.register('galacticMeteor', damagePerCount(
    10,
    (n, ctx) => `${creatureName(ctx.defender, ctx.foe)} has ${n} energy`,
    ctx => ctx.defender.energy
));

EffectRegistry.register('neutralSurge', damagePerCount(
    20,
    n => `${n} Neutral creatures in play`,
    ctx => [...creaturesInPlay('player'), ...creaturesInPlay('opponent')]
        .filter(c => getCardType(c.data) === 'Neutral').length
));

EffectRegistry.register('thornyVines', damagePerCount(
    10,
    (n, ctx) => `${possessive(ctx.foe)} ${n} creatures in play`,
    ctx => creaturesInPlay(ctx.foe).length
));

EffectRegistry.register('scrapStrike', damagePerCount(
    20,
    (n, ctx) => `${n} item cards in ${possessive(ctx.foe).toLowerCase()} discard pile`,
    ctx => ctx.them.discardPile.filter(c => isItem(c.data)).length
));

EffectRegistry.register('alphabetAssault', damagePerCount(
    10,
    (n, ctx) => `"${ctx.defender.data.name}" has ${n} letters`,
    ctx => ctx.defender.data.name.length
));

EffectRegistry.register('infernoConstrict', damagePerCount(
    30,
    n => `${n} Mechanic creatures on the bench`,
    ctx => benchCreatures(ctx.side).filter(c => getCardType(c.data) === 'Mechanic').length
));

// "+10 damage for each energy attached to your opponent's active creature."
EffectRegistry.register('spectralWrapGA', {
    async onDamageCalc(ctx) {
        const bonus = ctx.defender.energy * 10;
        if (bonus === 0) return ctx.damage;
        await ctx.say(
            `${creatureName(ctx.defender, ctx.foe)} has ${ctx.defender.energy} energy: +${bonus} damage.`,
            { kind: 'damage', pace: 0.6 }
        );
        return ctx.damage + bonus;
    }
});

// "+30 damage for any additional energy attached" (beyond the move's own cost
// tier of 3, matching the original implementation).
EffectRegistry.register('enragedCharge', {
    async onDamageCalc(ctx) {
        if (ctx.attacker.energy <= 3) return ctx.damage;
        const extra = ctx.attacker.energy - 3;
        const bonus = extra * 30;
        await ctx.say(`${extra} surplus energy: +${bonus} damage.`,
            { kind: 'damage', pace: 0.6 });
        return ctx.damage + bonus;
    }
});

// "+50 damage if its HP is 30 or less."
EffectRegistry.register('furySpin', {
    async onDamageCalc(ctx) {
        const hp = remainingHp(ctx.attacker);
        if (hp > 30) return ctx.damage;
        await ctx.say(`Cornered at ${hp} HP: +50 damage!`,
            { kind: 'damage', pace: 0.6 });
        return ctx.damage + 50;
    }
});

// "+30 damage if your opponent has a status condition."
EffectRegistry.register('shadowWrap', {
    async onDamageCalc(ctx) {
        if (!Status.any(ctx.defender)) return ctx.damage;
        await ctx.say(
            `${creatureName(ctx.defender, ctx.foe)} is afflicted: +30 damage.`,
            { kind: 'damage', pace: 0.6 }
        );
        return ctx.damage + 30;
    }
});

// Deals no damage; attaches an energy instead.
EffectRegistry.register('metallicWing', {
    onDamageCalc() {
        return 0;
    },
    async onResolve(ctx) {
        await ctx.energy(ctx.attacker, 1);
    }
});

// ===========================================================================
// ATTACKER-SIDE EFFECTS — always resolve, even on a knockout
// ===========================================================================

EffectRegistry.register('recoil20', selfRecoil(20));
EffectRegistry.register('recoil40', selfRecoil(40));

EffectRegistry.register('healingRoots', selfHeal(20));
EffectRegistry.register('minorMend', selfHeal(10));
EffectRegistry.register('majorMend', selfHeal(20));
EffectRegistry.register('planetBurst', selfHeal(10));
// "Heal 30 HP from each of your creatures that has damage." Always resolves.
EffectRegistry.register('healingSap', {
    async onResolve(ctx) {
        await healAllOwnCreatures(ctx, 30, 'Healing Sap');
    }
});

EffectRegistry.register('mindRipple', creatureShield('mindRipple', 20, 'Mind Ripple'));
EffectRegistry.register('cottonGuard', creatureShield('cottonGuard', 20, 'Cotton Guard'));

EffectRegistry.register('discard2Energy', {
    async onResolve(ctx) {
        await ctx.unenergy(ctx.attacker, 2);
    }
});

EffectRegistry.register('chillRecharge', {
    async onResolve(ctx) {
        await ctx.heal(ctx.attacker, 10);
        ctx.attacker.flags.chillRecharge = true;
        await ctx.say(
            `${creatureName(ctx.attacker, ctx.side)} is charged: next attack deals +20.`,
            { kind: 'ability', icon: '❄️' }
        );
    }
});

// "Your next attack does 30 more damage."
// Attacking ends the turn, so this necessarily lands on the following turn —
// no countdown needed. The original ran a 2-turn counter that made the bonus
// arrive a turn later than the card says.
EffectRegistry.register('sproutBoost', {
    async onResolve(ctx) {
        ctx.attacker.flags.sproutBoostReady = true;
        await ctx.say(
            `${creatureName(ctx.attacker, ctx.side)} is charged: its next attack deals +30.`,
            { kind: 'ability', icon: '🌱' }
        );
    }
});

EffectRegistry.register('monksFury', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('No shield raised.', { kind: 'info', pace: 0.5 });
            return;
        }
        // "Next turn THIS creature takes 20 less damage": the shield sits on
        // Metamonk, so a creature switched in afterwards isn't protected.
        grantCreatureShield(ctx.attacker, 'monksFury', 20);
        await ctx.say(
            `${creatureName(ctx.attacker, ctx.side)} takes 20 less damage next turn (Monk's Fury).`,
            { kind: 'ability', icon: '🛡️' }
        );
    }
});

// "Next turn, this creature takes 10 less damage."
EffectRegistry.register('spectralBurst', creatureShield('spectralBurst', 10, 'Spectral Burst'));

EffectRegistry.register('tempestHold', {
    async onResolve(ctx) {
        ctx.attacker.flags.cantRetreatUntil = Timing.myTurns(2);
        await ctx.say(
            `${creatureName(ctx.attacker, ctx.side)} is rooted and can't retreat for 2 turns.`,
            { kind: 'status', icon: '⛓️' }
        );
    }
});

EffectRegistry.register('overdriveSmash', {
    async onResolve(ctx) {
        // "Can't use this move next turn": blocked on its owner's next turn
        // only, so it's available again the turn after.
        ctx.attacker.flags.cooldowns.overdriveSmash = Timing.myTurns(1);
        await ctx.say(
            `Overdrive Smash overheats and can't be used next turn.`,
            { kind: 'info', icon: '🔧' }
        );
    }
});

EffectRegistry.register('wingSlap', {
    async onResolve(ctx) {
        ctx.attacker.flags.cantAttackUntil = Timing.myTurns(1);
        await ctx.say(
            `${creatureName(ctx.attacker, ctx.side)} is winded and can't attack next turn.`,
            { kind: 'status', icon: '💤' }
        );
    }
});

EffectRegistry.register('skyDraw', {
    async onResolve(ctx) {
        const drawn = drawCards(ctx.side, 1);
        if (drawn === 0) {
            await ctx.say(`${possessive(ctx.side)} deck is empty.`, { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.say(`${subject(ctx.side)} drew a card.`, { kind: 'info', icon: '🎴' });
    }
});

EffectRegistry.register('creamyConfection', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip === 'heads') {
            const type = rollEnergyType(ctx.side);
            const target = await ctx.chooseMyCreature({
                title: `Attach 1 ${type} energy to a bench creature`,
                filter: c => c.location === 'bench',
                aiPick: candidates => bestEnergyTarget(candidates, type)
            });
            if (!target) {
                await ctx.say('No bench creature to charge.', { kind: 'info', pace: 0.5 });
                return;
            }
            await ctx.energy(target.card, 1, ctx.side, type);
        } else {
            await ctx.unenergy(ctx.attacker, 2);
        }
    }
});

EffectRegistry.register('riskyRecoil', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip === 'heads') {
            await ctx.say('No backlash.', { kind: 'info', pace: 0.5 });
            return;
        }
        const own = creaturesInPlay(ctx.side);
        const victim = Rng.pick(own);
        if (!victim) return;
        const spot = locateCard(victim);
        await ctx.hit(victim, 50, {
            side: ctx.side,
            location: spot ? spot.location : 'active',
            reason: 'backlash'
        });
    }
});

EffectRegistry.register('energySnatch', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('No energy taken.', { kind: 'info', pace: 0.5 });
            return;
        }
        const charged = creaturesInPlay(ctx.foe).filter(c => c.energy > 0);
        const victim = Rng.pick(charged);
        if (!victim) {
            await ctx.say(`${possessive(ctx.foe)} creatures have no energy to take.`,
                { kind: 'info', pace: 0.5 });
            return;
        }
        // "Discard a random energy": any of its attached energy, equally likely.
        await ctx.unenergy(victim, 1, ctx.foe, null, true);
    }
});

EffectRegistry.register('scavengeStrike', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('Nothing salvaged.', { kind: 'info', pace: 0.5 });
            return;
        }
        const items = ctx.me.discardPile.filter(c => isItem(c.data));
        if (items.length === 0) {
            await ctx.say('No item cards in the discard pile.', { kind: 'info', pace: 0.5 });
            return;
        }
        const index = await ctx.chooseCard({
            cards: items,
            title: 'Return an item card to your hand',
            aiPick: () => Rng.int(items.length)
        });
        if (index === null) return;
        const item = items[index];
        ctx.me.discardPile.splice(ctx.me.discardPile.indexOf(item), 1);
        ctx.me.hand.push(item);
        Render.all();
        await ctx.say(`${subject(ctx.side)} salvaged ${item.data.name}.`,
            { kind: 'item', icon: '♻️' });
    }
});

EffectRegistry.register('coffeeHeal', {
    async onResolve(ctx) {
        await healOwnBenchCreature(ctx, 10);
    }
});

EffectRegistry.register('beanBlast', {
    async onResolve(ctx) {
        await healOwnBenchCreature(ctx, 20);
    }
});

/** Shared by Coffee Heal and Bean Blast. */
async function healOwnBenchCreature(ctx, amount) {
    const damaged = ctx.me.bench.filter(c => c && c.damage > 0);
    if (damaged.length === 0) {
        await ctx.say('No damaged bench creature to heal.', { kind: 'info', pace: 0.5 });
        return;
    }
    const target = await ctx.chooseMyCreature({
        title: `Heal a bench creature ${amount} HP`,
        filter: c => c.location === 'bench' && c.card.damage > 0,
        aiPick: candidates => mostHurt(candidates)
    });
    if (!target) return;
    await ctx.heal(target.card, amount);
}

EffectRegistry.register('berryBurst', {
    async onResolve(ctx) {
        await healAllOwnCreatures(ctx, 10, 'Berry Burst');
    }
});

EffectRegistry.register('laughingLeaves', {
    async onResolve(ctx) {
        await healAllOwnCreatures(ctx, 20, 'Laughing Leaves');
    }
});

async function healAllOwnCreatures(ctx, amount, label) {
    const damaged = creaturesInPlay(ctx.side).filter(c => c.damage > 0);
    if (damaged.length === 0) {
        await ctx.say(`${label} finds nothing to heal.`, { kind: 'info', pace: 0.5 });
        return;
    }
    await ctx.say(`${label} heals ${damaged.length} creature(s) for ${amount}.`,
        { kind: 'heal', icon: '💚' });
    for (const card of damaged) {
        await ctx.heal(card, amount, { silent: true });
    }
    Render.board();
}

// "Flip a coin. If heads, heal this creature 20 HP. If tails, your opponent's
// creature is now Locked." One flip drives both halves, so both live here;
// Status.apply() declines harmlessly if the defender already fainted.
EffectRegistry.register('caffeineAddiction', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip === 'heads') {
            await ctx.heal(ctx.attacker, 20);
        } else {
            await ctx.status(ctx.defender, 'lock');
        }
    }
});

EffectRegistry.register('invincibleGambit', {
    async onResolve(ctx) {
        const { heads } = await ctx.flipMany(3, ctx.move.name);
        if (heads > 0) {
            // "For each heads, your opponent can't deal damage for 1 turn":
            // the opponent's next `heads` turns (their turns only; this
            // side's turns in between don't count). Their moves still work,
            // they just deal 0 damage (damage.js). A second cast adds turns.
            const current = ctx.them.flags.invincibleLockUntil;
            ctx.them.flags.invincibleLockUntil = Timing.active(current)
                ? current + (2 * heads)
                : Timing.opponentTurns(heads);
            await ctx.say(
                `${subject(ctx.foe)} ${verb(ctx.foe, 'deals', 'deal')} no damage for ${heads} turn${heads === 1 ? '' : 's'}!`,
                { kind: 'status', icon: '🚫' }
            );
        } else {
            await ctx.say('No heads: the gambit fails.', { kind: 'info', pace: 0.5 });
        }
        // The attacker faints regardless. Knockout resolution sweeps it up.
        ctx.attacker.damage = maxHp(ctx.attacker);
        await ctx.say(
            `${creatureName(ctx.attacker, ctx.side)} collapses from the effort.`,
            { kind: 'ko', icon: '☠️' }
        );
        Render.board();
    }
});

// "Move an energy from one of your benched creatures to another" — bench to
// bench only, and optional.
EffectRegistry.register('cloudBounce', {
    async onResolve(ctx) {
        const bench = benchCreatures(ctx.side);
        if (bench.length < 2 || !bench.some(c => c.energy > 0)) {
            await ctx.say('No energy to move between bench creatures.', { kind: 'info', pace: 0.5 });
            return;
        }
        const from = await ctx.chooseMyCreature({
            title: 'Move energy FROM which bench creature?',
            filter: c => c.location === 'bench' && c.card.energy > 0,
            cancellable: true,
            aiPick: candidates => candidates.slice().sort((a, b) => b.card.energy - a.card.energy)[0]
        });
        if (!from) {
            await ctx.say('No energy moved.', { kind: 'info', pace: 0.5 });
            return;
        }
        const to = await ctx.chooseMyCreature({
            title: 'Move energy TO which bench creature?',
            filter: c => c.location === 'bench' && c.card !== from.card,
            cancellable: true,
            aiPick: candidates => bestEnergyTarget(candidates)
        });
        if (!to) {
            await ctx.say('No energy moved.', { kind: 'info', pace: 0.5 });
            return;
        }
        // The same energy moves, so it keeps its type.
        const moved = [];
        await ctx.unenergy(from.card, 1, ctx.side, moved);
        if (moved.length) await ctx.energy(to.card, 1, ctx.side, moved[0]);
    }
});

EffectRegistry.register('gulpSwap', {
    async onResolve(ctx) {
        if (isFainted(ctx.defender)) {
            await ctx.say('Nothing left to swap with.', { kind: 'info', pace: 0.5 });
            return;
        }
        const attackerHp = remainingHp(ctx.attacker);
        const defenderHp = remainingHp(ctx.defender);

        // Each creature receives the other's remaining HP, capped at its own max.
        // A creature with Hex can lose HP this way but never gain it.
        const swapTo = (card, hp) => {
            const next = Math.max(0, maxHp(card) - hp);
            card.damage = Status.has(card, 'hex') ? Math.max(card.damage, next) : next;
        };
        swapTo(ctx.attacker, defenderHp);
        swapTo(ctx.defender, attackerHp);

        Render.board();
        await ctx.say(
            `HP swapped: ${ctx.attacker.data.name} ${remainingHp(ctx.attacker)}, ` +
            `${ctx.defender.data.name} ${remainingHp(ctx.defender)}.`,
            { kind: 'info', icon: '🔄' }
        );
    }
});

// Area of effect on the opponent's bench. Runs even when the active died,
// which is why it lives in onResolve. Camouflage is enforced by damageCreature.
EffectRegistry.register('mysticBlaze', {
    async onResolve(ctx) {
        await hitOpponentBench(ctx, 30, 'Mystic Blaze');
    }
});

EffectRegistry.register('solarAscend', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('No bench damage.', { kind: 'info', pace: 0.5 });
            return;
        }
        await hitOpponentBench(ctx, 10, 'Solar Ascend');
    }
});

async function hitOpponentBench(ctx, amount, label) {
    const bench = benchCreatures(ctx.foe);
    if (bench.length === 0) {
        await ctx.say(`${possessive(ctx.foe)} bench is empty.`, { kind: 'info', pace: 0.5 });
        return;
    }
    await ctx.say(`${label} sweeps the bench for ${amount}.`, { kind: 'damage', icon: '💥' });
    for (const card of bench) {
        await ctx.hit(card, amount, {
            side: ctx.foe,
            location: 'bench',
            silent: true
        });
    }
    Render.board();
}

// ===========================================================================
// DEFENDER-TARGETING EFFECTS — skipped when the defender is knocked out
// ===========================================================================

EffectRegistry.register('mindMirage', statusOnDefender('hallucination'));
EffectRegistry.register('phantomPulse', statusOnDefender('hallucination'));
EffectRegistry.register('brainFreeze', statusOnDefender('hallucination'));
EffectRegistry.register('fluxWave', statusOnDefender('flux'));
EffectRegistry.register('forestFury', statusOnDefender('lock'));

EffectRegistry.register('dreamwave', statusOnDefenderIfHeads('hallucination'));
EffectRegistry.register('dreamBooster', statusOnDefenderIfHeads('hallucination'));
EffectRegistry.register('mindPulse', statusOnDefenderIfHeads('hallucination'));
EffectRegistry.register('spectralSlice', statusOnDefenderIfHeads('flux'));

EffectRegistry.register('psychicProwl', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        await ctx.status(ctx.defender, flip === 'heads' ? 'flux' : 'lock');
    }
});

EffectRegistry.register('chaosDice', {
    async onResolve(ctx) {
        const roll = await ctx.roll(ctx.move.name);
        const status = roll <= 2 ? 'hallucination' : (roll <= 4 ? 'flux' : 'lock');
        await ctx.status(ctx.defender, status);
    }
});

EffectRegistry.register('cantRetreat', {
    async onResolveIfTargetAlive(ctx) {
        ctx.defender.flags.cantRetreatUntil = Timing.opponentTurns(1);
        await ctx.say(
            `${creatureName(ctx.defender, ctx.foe)} is snared and can't retreat next turn.`,
            { kind: 'status', icon: '⛓️' }
        );
    }
});

EffectRegistry.register('tidalIllusion', {
    async onResolveIfTargetAlive(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('The illusion fades.', { kind: 'info', pace: 0.5 });
            return;
        }
        ctx.them.flags.cantDealDamageUntil = Timing.opponentTurns(1);
        await ctx.say(
            `${subject(ctx.foe)} will deal no damage next turn!`,
            { kind: 'status', icon: '🌊' }
        );
    }
});

EffectRegistry.register('tripleThreatFlip', {
    async onResolveIfTargetAlive(ctx) {
        const { heads } = await ctx.flipMany(2, ctx.move.name);
        if (heads < 2) {
            await ctx.say('Not both heads: no effect.', { kind: 'info', pace: 0.5 });
            return;
        }
        ctx.defender.damage = maxHp(ctx.defender);
        Render.board();
        await ctx.say(
            `Both heads! ${creatureName(ctx.defender, ctx.foe)} is knocked out outright!`,
            { kind: 'ko', icon: '☠️' }
        );
    }
});

EffectRegistry.register('forcefulFlip', {
    async onResolveIfTargetAlive(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('No forced switch.', { kind: 'info', pace: 0.5 });
            return;
        }
        if (benchCreatures(ctx.foe).length === 0) {
            await ctx.say(`${possessive(ctx.foe)} bench is empty — nothing to switch to.`,
                { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.say(`${subject(ctx.foe)} must switch active creature!`,
            { kind: 'info', icon: '🔄' });

        // The DEFENDING side chooses, so this prompts the player when the AI
        // uses the move and runs the AI heuristic when the player uses it.
        const choice = await ctx.chooseCreatureOf(ctx.foe, {
            title: 'Forced switch: choose your new active creature',
            filter: c => c.location === 'bench',
            aiPick: candidates => healthiestAttacker(candidates)
        });
        if (!choice) return;
        // A forced switch, not a retreat: the creature keeps all its energy.
        await swapActiveWithBench(ctx.foe, choice.index, { free: true });
    }
});

EffectRegistry.register('heavenlyRetreat', {
    async onResolve(ctx) {
        if (benchCreatures(ctx.side).length === 0) {
            await ctx.say('No bench creature to swap with.', { kind: 'info', pace: 0.5 });
            return;
        }
        const choice = await ctx.chooseMyCreature({
            title: 'Swap to which bench creature? (free)',
            filter: c => c.location === 'bench',
            aiPick: candidates => healthiestAttacker(candidates)
        });
        if (!choice) return;
        await swapActiveWithBench(ctx.side, choice.index, { free: true });
    }
});

// ---------------------------------------------------------------------------
// AI selection heuristics, shared by effects, abilities and items so the AI
// makes the same kind of choice everywhere.
// ---------------------------------------------------------------------------

/** The damaged creature furthest from full health. */
function mostHurt(candidates) {
    return candidates.slice().sort((a, b) => b.card.damage - a.card.damage)[0] || null;
}

/**
 * How much one energy of `type` would help this creature, for the AI.
 * Highest when it finishes paying for a move; 0 when it doesn't help any move.
 * Without a type the energy is treated as one that fits anything.
 */
function energyHelpScore(card, type) {
    const moves = movesOf(card.data);
    if (moves.length === 0) return -1;
    const extra = emptyEnergyUnits();
    if (type) extra[type] = 1;
    let best = 0;
    for (const move of moves) {
        const cost = effectiveCost(card, move);
        const before = energyNeeded(card, cost);
        const after = type ? energyNeeded(card, cost, extra) : Math.max(0, before - 1);
        if (after >= before) continue;
        // Finishing a move beats getting closer to one.
        best = Math.max(best, after === 0 ? 100 : 50 - after);
    }
    return best;
}

/** Prefers a creature that is close to affording a move with this energy. */
function bestEnergyTarget(candidates, type = null) {
    const score = entry => {
        const s = energyHelpScore(entry.card, type);
        // Nothing helped: fall back to whoever is furthest from a move.
        return s > 0 ? s : 10 - entry.card.energy;
    };
    return candidates.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

/** Healthiest creature that can actually threaten something. */
function healthiestAttacker(candidates) {
    const score = entry => {
        const hpFraction = remainingHp(entry.card) / maxHp(entry.card);
        const best = movesOf(entry.card.data)
            .filter(m => canPayMove(entry.card, m))
            .reduce((max, m) => Math.max(max, m.damage || 0), 0);
        return hpFraction * 100 + best;
    };
    return candidates.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

// "Flip a coin. If tails, this attack also deals 20 damage to itself."
// Attacker-side, so it resolves even when the attack scores a knockout.
EffectRegistry.register('infernoWing', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip === 'heads') {
            await ctx.say('No self-damage.', { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.hit(ctx.attacker, 20, {
            side: ctx.side,
            location: 'active',
            reason: 'Inferno Wing backlash'
        });
    }
});

// ===========================================================================
// TEMPORAL RIFT
// ===========================================================================

/** Flakette, Canelette and Rollinette this side has in play (the attacker included). */
const SWEET_TRIO = ['Flakette', 'Canelette', 'Rollinette'];
function sweetCount(side) {
    return creaturesInPlay(side).filter(c => SWEET_TRIO.includes(c.data.name)).length;
}

/** "Heal N HP from a creature of your choice": one of your own damaged creatures. */
function healChosenOwnCreature(amount) {
    return {
        async onResolve(ctx) {
            if (!creaturesInPlay(ctx.side).some(c => c.damage > 0)) {
                await ctx.say('No damaged creature to heal.', { kind: 'info', pace: 0.5 });
                return;
            }
            const target = await ctx.chooseMyCreature({
                title: `Heal one of your creatures ${amount} HP`,
                filter: c => c.card.damage > 0,
                aiPick: candidates => mostHurt(candidates)
            });
            if (target) await ctx.heal(target.card, amount);
        }
    };
}

/** "Your opponent can't X next turn": a restriction on the other side for one of its turns. */
function foeRestriction(flag, message, icon, coin = true) {
    return {
        async onResolve(ctx) {
            if (coin) {
                const flip = await ctx.flip(ctx.move.name);
                if (flip !== 'heads') {
                    await ctx.say('No effect.', { kind: 'info', pace: 0.5 });
                    return;
                }
            }
            ctx.them.flags[flag] = Timing.opponentTurns(1);
            await ctx.say(`${subject(ctx.foe)} ${message}`, { kind: 'status', icon });
        }
    };
}

/** The defending creature's printed stage is 2 or 3. */
function evolvedDefender(ctx) {
    return !!ctx.defender && (ctx.defender.data.stage === 'Stage 2' || ctx.defender.data.stage === 'Stage 3');
}

// "This move does 20 damage for each Flakette, Canelette or Rollinette you have in play."
EffectRegistry.register('sweetTackle', damagePerCount(
    20,
    n => `${n} sweet creature${n === 1 ? '' : 's'} in play`,
    ctx => sweetCount(ctx.side)
));

// "This move heals this creature 10 HP for each Flakette, Canelette or Rollinette you have in play."
EffectRegistry.register('sweetHeal', {
    async onResolve(ctx) {
        await ctx.heal(ctx.attacker, 10 * sweetCount(ctx.side));
    }
});

// "Deal 10 damage for each Flakette, Canelette or Rollinette you have in play
// to a random opponent's bench creature."
EffectRegistry.register('sweetSneak', {
    async onResolve(ctx) {
        const bench = benchCreatures(ctx.foe);
        if (bench.length === 0) {
            await ctx.say(`${possessive(ctx.foe)} bench is empty.`, { kind: 'info', pace: 0.5 });
            return;
        }
        const target = Rng.pick(bench);
        await ctx.hit(target, 10 * sweetCount(ctx.side), { side: ctx.foe, location: 'bench', reason: 'Sweet Sneak' });
    }
});

// "Flip a coin. If heads, your opponent can't attack next turn."
EffectRegistry.register('tailNuzzle', foeRestriction('cantAttackUntil', "can't attack next turn!", '🚫'));

// "Flip a coin. If heads, your opponent's active creature has Lock. If tails, it has Hallucination."
EffectRegistry.register('destinedFate', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        await ctx.status(ctx.defender, flip === 'heads' ? 'lock' : 'hallucination');
    }
});

EffectRegistry.register('duoGale', damagePerHeads(2, 50));
EffectRegistry.register('drillPincer', damagePerHeads(4, 10));
EffectRegistry.register('galeScatter2', damagePerHeads(2, 20));
EffectRegistry.register('galeScatter3', damagePerHeads(3, 20));

// "Flip 2 coins. If both are heads, your opponent chooses a card from their hand and discards it."
EffectRegistry.register('magnetarcNeedle', {
    async onResolve(ctx) {
        const { heads } = await ctx.flipMany(2, ctx.move.name);
        if (heads < 2) {
            await ctx.say('Not both heads: no discard.', { kind: 'info', pace: 0.5 });
            return;
        }
        const hand = ctx.them.hand;
        if (hand.length === 0) {
            await ctx.say(`${subject(ctx.foe)} ${verb(ctx.foe, 'has', 'have')} no cards in hand.`, { kind: 'info', pace: 0.5 });
            return;
        }
        // The opponent chooses; the AI gives up the card it can least use.
        const index = await ctx.chooseCardOf(ctx.foe, {
            cards: hand.slice(),
            title: 'Magnetarc Needle: discard a card from your hand',
            aiPick: cards => {
                let worst = 0;
                cards.forEach((c, i) => { if (handCardKeepScore(c) < handCardKeepScore(cards[worst])) worst = i; });
                return worst;
            }
        });
        const card = hand[index === null ? 0 : index];
        if (!card) return;
        hand.splice(hand.indexOf(card), 1);
        ctx.them.discardPile.push(card);
        Render.all();
        await ctx.say(`${subject(ctx.foe)} discarded ${card.data.name}.`, { kind: 'item', icon: '🗑️' });
    }
});

/** How much the AI wants to keep a hand card (higher keeps it). */
function handCardKeepScore(card) {
    if (isCreature(card.data)) return card.data.stage === 'Stage 1' ? 30 : 40;
    if (isAccessory(card.data)) return 25;
    return card.data.itemEffect === 'cardDraw' ? 20 : 15;
}

// "Flip a coin. If tails, discard all energy from your creatures. You can't use this move next turn."
EffectRegistry.register('stormsChance', {
    async onResolve(ctx) {
        ctx.attacker.flags.cooldowns.stormsChance = Timing.myTurns(1);
        const flip = await ctx.flip(ctx.move.name);
        if (flip === 'heads') {
            await ctx.say('The storm passes.', { kind: 'info', pace: 0.5 });
        } else {
            await ctx.say(`The storm drains all of ${possessive(ctx.side).toLowerCase()} energy!`, { kind: 'status', icon: '🌪️' });
            for (const card of creaturesInPlay(ctx.side)) {
                if (card.energy > 0) await ctx.unenergy(card, card.energy, ctx.side);
            }
        }
        await ctx.say(`Storm's Chance can't be used next turn.`, { kind: 'info', icon: '🔧', pace: 0.5 });
    }
});

EffectRegistry.register('citrusBloom', healChosenOwnCreature(10));
EffectRegistry.register('vitaminBurst', healChosenOwnCreature(20));

// "This creature takes 20 / 40 less damage next turn."
EffectRegistry.register('oreLash', creatureShield('oreLash', 20, 'Ore Lash'));
EffectRegistry.register('coreTangle', creatureShield('coreTangle', 40, 'Core Tangle'));

// "Next turn, this creature can't be damaged by attacks from Mechanic creatures."
EffectRegistry.register('anchoredTerrain', {
    async onResolve(ctx) {
        ctx.attacker.flags.anchoredUntil = Timing.throughOpponentTurn();
        await ctx.say(`${creatureName(ctx.attacker, ctx.side)} can't be damaged by Mechanic attacks next turn.`,
            { kind: 'ability', icon: '⚓' });
    }
});

// "This attack does 70 damage if your opponent is affected by Flux."
EffectRegistry.register('whimCurse', {
    async onDamageCalc(ctx) {
        if (Status.has(ctx.defender, 'flux')) {
            await ctx.say('The curse feeds on Flux: 70 damage!', { kind: 'damage', pace: 0.5 });
            return 70;
        }
        await ctx.say('No Flux to feed on: no damage.', { kind: 'info', pace: 0.5 });
        return 0;
    }
});

// "Flip 2 coins. If both are heads, this attack does 10 damage."
EffectRegistry.register('funkyScent', {
    async onDamageCalc(ctx) {
        const { heads } = await ctx.flipMany(2, ctx.move.name);
        return heads === 2 ? 10 : 0;
    }
});

// "Remove an energy attached to your opponent's active creature and attach it to this creature."
EffectRegistry.register('energyDrain', {
    async onResolveIfTargetAlive(ctx) {
        if (ctx.defender.energy === 0) {
            await ctx.say(`${creatureName(ctx.defender, ctx.foe)} has no energy to drain.`, { kind: 'info', pace: 0.5 });
            return;
        }
        const moved = [];
        await ctx.unenergy(ctx.defender, 1, ctx.foe, moved);
        if (moved.length) await ctx.energy(ctx.attacker, 1, ctx.side, moved[0]);
    }
});

// "Flip a coin. If heads, heal all HP of this creature."
EffectRegistry.register('violetVeil', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip === 'heads') await ctx.heal(ctx.attacker, ctx.attacker.damage);
        else await ctx.say('No healing.', { kind: 'info', pace: 0.5 });
    }
});

// "Next turn, your opponent can't use abilities." Always-on ones included.
EffectRegistry.register('mementoEcho', {
    async onResolve(ctx) {
        ctx.them.flags.abilitiesBlockedTurn = gameState.turnNumber + 1;
        await ctx.say(`${subject(ctx.foe)} can't use abilities next turn!`, { kind: 'status', icon: '🔇' });
    }
});

// "This attack deals 20 damage to each of your opponent's creatures." The
// active takes the move's own 20; the bench is swept here.
EffectRegistry.register('tempestDive', {
    async onResolve(ctx) {
        await hitOpponentBench(ctx, 20, 'Tempest Dive');
    }
});

// "Flip a coin. If heads, your opponent can't evolve next turn."
EffectRegistry.register('cuddleStorm', foeRestriction('cantEvolveUntil', "can't evolve next turn!", '🧸'));

// "Flip 2 coins. If both are heads, this attack does 50 extra damage."
EffectRegistry.register('ignitionJab', {
    async onDamageCalc(ctx) {
        const { heads } = await ctx.flipMany(2, ctx.move.name);
        if (heads < 2) return ctx.damage;
        await ctx.say('+50 damage!', { kind: 'damage', pace: 0.5 });
        return ctx.damage + 50;
    }
});

// "Flip a coin. If heads, your opponent can't use accessory cards next turn."
EffectRegistry.register('cryoRoar', foeRestriction('cantUseAccessoriesUntil', "can't use accessory cards next turn!", '🧊'));
// "Your opponent can't use Accessory cards next turn."
EffectRegistry.register('alloyClutch', foeRestriction('cantUseAccessoriesUntil', "can't use accessory cards next turn!", '🔩', false));

// "If your opponent's creature has a status condition, do 40 extra damage."
EffectRegistry.register('telepondLeap', {
    async onDamageCalc(ctx) {
        if (!Status.any(ctx.defender)) return ctx.damage;
        await ctx.say(`${creatureName(ctx.defender, ctx.foe)} is afflicted: +40 damage.`, { kind: 'damage', pace: 0.6 });
        return ctx.damage + 40;
    }
});

// "Next turn, your opponent flips a coin. If tails, this creature takes no
// damage or status effects." The coin is flipped as their turn starts (turn.js).
EffectRegistry.register('bloomshroud', {
    async onResolve(ctx) {
        ctx.attacker.flags.bloomshroudTurn = gameState.turnNumber + 1;
        await ctx.say(`${creatureName(ctx.attacker, ctx.side)} hides in a shroud of petals.`, { kind: 'ability', icon: '🌸' });
    }
});

// "This move does 10 extra damage for each evolution you made this game."
EffectRegistry.register('canopyDrift', {
    async onDamageCalc(ctx) {
        const n = ctx.me.evolutionsMade || 0;
        if (!n) return ctx.damage;
        await ctx.say(`${n} evolution${n === 1 ? '' : 's'} this game: +${10 * n} damage.`, { kind: 'damage', pace: 0.6 });
        return ctx.damage + 10 * n;
    }
});

// "Flip a coin. If heads, your opponent switches their active creature." They choose.
EffectRegistry.register('superRoar', {
    async onResolveIfTargetAlive(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('No switch.', { kind: 'info', pace: 0.5 });
            return;
        }
        if (benchCreatures(ctx.foe).length === 0) {
            await ctx.say(`${possessive(ctx.foe)} bench is empty — nothing to switch to.`, { kind: 'info', pace: 0.5 });
            return;
        }
        const choice = await ctx.chooseCreatureOf(ctx.foe, {
            title: 'Super Roar: choose your new active creature',
            filter: c => c.location === 'bench',
            aiPick: candidates => healthiestAttacker(candidates)
        });
        if (choice) await swapActiveWithBench(ctx.foe, choice.index, { free: true });
    }
});

// "If you used an attack with Dive in its name last turn, this move does 40
// extra damage." Any move with "Dive" in its name counts, so future ones do too.
function usedDiveLastTurn(side) {
    const last = gameState[side].lastAttack;
    return !!last && last.turn === gameState.turnNumber - 2 && /dive/i.test(last.name);
}
EffectRegistry.register('reverieTalon', {
    async onDamageCalc(ctx) {
        if (!usedDiveLastTurn(ctx.side)) return ctx.damage;
        await ctx.say('Last turn was a dive: +40 damage!', { kind: 'damage', pace: 0.6 });
        return ctx.damage + 40;
    }
});

// "If your opponent's creature is a Stage 2 or 3, it now has Flux."
EffectRegistry.register('mistralVeil', {
    async onResolve(ctx) {
        if (evolvedDefender(ctx)) await ctx.status(ctx.defender, 'flux');
    }
});

// "This move deals 30 extra damage if your opponent's creature is a Stage 2 or 3."
EffectRegistry.register('pixieDraft', {
    async onDamageCalc(ctx) {
        if (!evolvedDefender(ctx)) return ctx.damage;
        await ctx.say(`${creatureName(ctx.defender, ctx.foe)} is evolved: +30 damage.`, { kind: 'damage', pace: 0.6 });
        return ctx.damage + 30;
    }
});

// ===========================================================================
// TEMPORAL RIFT PROMO CREATURES
// ===========================================================================

/** How many letter A's (either case) a creature's name has. */
function countLetterA(card) {
    return card && card.data ? (card.data.name.match(/a/gi) || []).length : 0;
}

/** This side's discard pile has more cards than the other side's. */
function biggerDiscard(ctx) {
    return ctx.me.discardPile.length > ctx.them.discardPile.length;
}

/** The defending creature has two moves printed. */
function defenderHasTwoMoves(ctx) {
    return !!ctx.defender && movesOf(ctx.defender.data).length === 2;
}

// Craggit — "Roll 10 dice. Heal this creature 10 HP for each 6."
EffectRegistry.register('stoneThump', {
    async onResolve(ctx) {
        const rolls = [];
        for (let i = 0; i < 10; i++) rolls.push(Rng.roll());
        const sixes = rolls.filter(r => r === 6).length;
        Log.write(`${ctx.move.name}: rolled ${rolls.join(', ')} (${sixes} six${sixes === 1 ? '' : 'es'})`, { kind: 'dice', icon: '🎲' });
        if (typeof Sfx !== 'undefined') Sfx.play('dice');
        await Log.centerBanner(`🎲 ${sixes} × 6`, `${ctx.move.name}: 10 dice`, { kind: 'dice' });
        if (sixes) await ctx.heal(ctx.attacker, 10 * sixes);
        else await ctx.say('No sixes: no healing.', { kind: 'info', pace: 0.5 });
    }
});

// Voltfryer — "This creature takes 30 less damage next turn."
EffectRegistry.register('searGuard', creatureShield('searGuard', 30, 'Sear Guard'));

// Voltfryer — "Flip a coin for each retreat energy of both active creatures. +30 for each heads."
// The retreat cost after effects such as Wind Feather.
EffectRegistry.register('burnBurst', {
    async onDamageCalc(ctx) {
        const coins = retreatCost(ctx.attacker) + retreatCost(ctx.defender);
        if (!coins) {
            await ctx.say('Neither creature has a retreat cost: no coins to flip.', { kind: 'info', pace: 0.5 });
            return ctx.damage;
        }
        const { heads } = await ctx.flipMany(coins, ctx.move.name);
        if (heads) await ctx.say(`${heads} heads: +${30 * heads} damage.`, { kind: 'damage', pace: 0.5 });
        return ctx.damage + 30 * heads;
    }
});

// Gazorilla — "+40 damage if there's an accessory in your discard pile."
EffectRegistry.register('gazeJab', {
    async onDamageCalc(ctx) {
        if (!ctx.me.discardPile.some(c => isAccessory(c.data))) return ctx.damage;
        await ctx.say('An accessory in the discard pile: +40 damage.', { kind: 'damage', pace: 0.6 });
        return ctx.damage + 40;
    }
});

// Gazorilla — "Flip 3 coins: 40 damage for each heads. Flip 6 if your deck has fewer than 5 cards."
EffectRegistry.register('gorillaCrash', {
    async onDamageCalc(ctx) {
        const coins = ctx.me.deck.length < 5 ? 6 : 3;
        const { heads } = await ctx.flipMany(coins, ctx.move.name);
        await ctx.say(`${heads} heads: ${40 * heads} damage.`, { kind: 'damage', pace: 0.5 });
        return 40 * heads;
    }
});

// Nyamura — "If your discard pile has more cards than your opponent's, they get Hallucination."
EffectRegistry.register('nyapawSwipe', {
    async onResolve(ctx) {
        if (biggerDiscard(ctx)) await ctx.status(ctx.defender, 'hallucination');
    }
});

// Nyamura — "+50 damage if your discard pile has more cards than your opponent's."
EffectRegistry.register('moonlitRake', {
    async onDamageCalc(ctx) {
        if (!biggerDiscard(ctx)) return ctx.damage;
        await ctx.say(`Bigger discard pile (${ctx.me.discardPile.length} vs ${ctx.them.discardPile.length}): +50 damage.`,
            { kind: 'damage', pace: 0.6 });
        return ctx.damage + 50;
    }
});

// Solflare — "Your opponent shows you their hand." Shown for 3 seconds to the
// player who attacked (the AI gains nothing from seeing it).
EffectRegistry.register('solarBurst', {
    async onResolve(ctx) {
        const hand = ctx.them.hand;
        if (!hand.length) {
            await ctx.say(`${possessive(ctx.foe)} hand is empty.`, { kind: 'info', pace: 0.5 });
            return;
        }
        if (ctx.side === 'player') {
            Log.write(`${subject(ctx.foe)}'s hand: ${hand.map(c => c.data.name).join(', ')}.`, { kind: 'info', icon: '☀️' });
            if (typeof Screens !== 'undefined' && Screens.revealHand && Log.speed > 0 &&
                !(typeof Automation !== 'undefined' && Automation.active)) {
                await Screens.revealHand(hand, `☀️ ${possessive(ctx.foe)} hand`, 3000);
            }
        } else {
            await ctx.say(`${subject(ctx.side)} ${verb(ctx.side, 'looks', 'look')} at your hand (${hand.length} card${hand.length === 1 ? '' : 's'}).`,
                { kind: 'info', icon: '☀️', pace: 0.6 });
        }
    }
});

// Sanctuarch — "Does nothing if the opponent's active creature has 2 moves."
EffectRegistry.register('sanctuJab', {
    async onDamageCalc(ctx) {
        if (!defenderHasTwoMoves(ctx)) return ctx.damage;
        await ctx.say(`${creatureName(ctx.defender, ctx.foe)} has 2 moves: ${ctx.move.name} does nothing.`, { kind: 'info', pace: 0.6 });
        return 0;
    }
});

// Sanctuarch — "+40 damage if the opponent's active creature has 2 moves."
EffectRegistry.register('divineCrash', {
    async onDamageCalc(ctx) {
        if (!defenderHasTwoMoves(ctx)) return ctx.damage;
        await ctx.say(`${creatureName(ctx.defender, ctx.foe)} has 2 moves: +40 damage.`, { kind: 'damage', pace: 0.6 });
        return ctx.damage + 40;
    }
});

// Snoozoth — "Flip a coin per card in both discard piles. Each heads deals 20 to
// a random enemy. Can't attack next turn." Every heads picks from all the
// opponent's creatures, and nothing is knocked out until every hit is dealt,
// so a creature can be picked again after it would have fainted.
EffectRegistry.register('napRoll', {
    async onResolve(ctx) {
        const coins = ctx.me.discardPile.length + ctx.them.discardPile.length;
        if (coins > 0) {
            const { heads } = await ctx.flipMany(coins, ctx.move.name);
            const tally = new Map();
            for (let i = 0; i < heads; i++) {
                const target = Rng.pick(creaturesInPlay(ctx.foe));
                if (!target) break;
                tally.set(target, (tally.get(target) || 0) + 1);
            }
            for (const [card, n] of tally) {
                let dealt = 0;
                for (let i = 0; i < n; i++) dealt += await ctx.hit(card, 20, { side: ctx.foe, silent: true });
                await ctx.say(`${creatureName(card, ctx.foe)} is hit ${n} time${n === 1 ? '' : 's'}: ${dealt} damage.`,
                    { kind: 'damage', icon: '💤', pace: 0.5 });
            }
            Render.board();
        } else {
            await ctx.say('Both discard piles are empty: no coins to flip.', { kind: 'info', pace: 0.5 });
        }
        ctx.attacker.flags.cantAttackUntil = Timing.myTurns(1);
        await ctx.say(`${creatureName(ctx.attacker, ctx.side)} dozes off and can't attack next turn.`, { kind: 'status', icon: '💤', pace: 0.6 });
    }
});

// Penkit — "10 damage for each A in the name of the opponent's active creature."
EffectRegistry.register('featherFlick', {
    async onDamageCalc(ctx) {
        const n = countLetterA(ctx.defender);
        await ctx.say(`${n} A${n === 1 ? '' : "'s"} in ${ctx.defender.data.name}: ${10 * n} damage.`, { kind: 'damage', pace: 0.6 });
        return 10 * n;
    }
});

// Penseraph — "Flip a coin per A in the opponent's name. Heads: 30 to a benched
// creature you pick. Tails: 10 to itself." The same creature can be picked
// again; with no bench the heads are lost. Knockouts wait until the end.
EffectRegistry.register('skyBurst', {
    async onResolve(ctx) {
        const n = countLetterA(ctx.defender);
        if (!n) {
            await ctx.say(`No A in ${ctx.defender.data.name}: no coins to flip.`, { kind: 'info', pace: 0.5 });
            return;
        }
        const { results } = await ctx.flipMany(n, ctx.move.name);
        const heads = results.filter(r => r === 'heads').length;
        const tails = n - heads;
        for (let i = 0; i < heads; i++) {
            if (benchCreatures(ctx.foe).length === 0) {
                await ctx.say(`${possessive(ctx.foe)} bench is empty: the heads are lost.`, { kind: 'info', pace: 0.5 });
                break;
            }
            const target = await ctx.chooseTheirCreature({
                title: `Sky Burst: deal 30 damage to which benched creature? (${i + 1}/${heads})`,
                filter: c => c.location === 'bench',
                // A finishing blow first, then the creature closest to fainting.
                aiPick: candidates => {
                    const alive = candidates.filter(c => remainingHp(c.card) > 0);
                    const pool = alive.length ? alive : candidates;
                    const lethal = pool.filter(c => remainingHp(c.card) <= 30);
                    return (lethal.length ? lethal : pool).slice().sort((a, b) => remainingHp(a.card) - remainingHp(b.card))[0];
                }
            });
            if (!target) break;
            await ctx.hit(target.card, 30, { side: ctx.foe, location: 'bench', reason: 'Sky Burst' });
        }
        if (tails) {
            await ctx.hit(ctx.attacker, 10 * tails, { side: ctx.side, reason: 'recoil' });
        }
    }
});

// ===========================================================================
// CRYSTAL CANOPY
// ===========================================================================

/** Null Orb: on this side's turn its moves deal printed damage and nothing else. */
function movesNegated(side) {
    const s = side && gameState[side];
    return !!s && gameState.currentTurn === side && Timing.active(s.flags.movesNegatedUntil);
}

/**
 * Rng.flip() hook: coin flips made by the side whose turn it is.
 *   Crinkle Crash — that side's next flip lands tails (used up by it).
 *   Storm Pendant — the first flip of the move being used lands heads.
 * Crinkle Crash wins when both apply, and spends the Pendant too.
 */
function coinOverride(raw) {
    if (typeof gameState === 'undefined' || gameState.phase !== 'playing') return raw;
    const side = gameState.currentTurn;
    const f = side && gameState[side] && gameState[side].flags;
    if (!f) return raw;
    if (Timing.active(f.forcedTailsUntil)) {
        f.forcedTailsUntil = null;
        f.pendantHeads = false;
        Log.write('Crinkle Crash: this coin lands on tails.', { kind: 'status', icon: '🥔' });
        return 'tails';
    }
    if (f.pendantHeads) {
        f.pendantHeads = false;
        if (typeof AccessoryRegistry !== 'undefined') AccessoryRegistry.note('stormPendant');
        Log.write('Storm Pendant: the first coin of this move lands on heads.', { kind: 'item', icon: '🧿' });
        return 'heads';
    }
    return raw;
}

/** "This move does +N damage if <test>". */
function bonusIf(bonus, test, why) {
    return {
        async onDamageCalc(ctx) {
            if (!test(ctx)) return ctx.damage;
            await ctx.say(`${why(ctx)}: +${bonus} damage.`, { kind: 'damage', pace: 0.6 });
            return ctx.damage + bonus;
        }
    };
}

/** "Flip a coin for each X. +N damage for each heads." */
function bonusPerHeadsOf(per, count, what) {
    return {
        async onDamageCalc(ctx) {
            const coins = count(ctx);
            if (!coins) {
                await ctx.say(`No ${what} to flip for.`, { kind: 'info', pace: 0.5 });
                return ctx.damage;
            }
            const { heads } = await ctx.flipMany(coins, ctx.move.name);
            if (heads) await ctx.say(`${heads} heads: +${heads * per} damage.`, { kind: 'damage', pace: 0.5 });
            return ctx.damage + heads * per;
        }
    };
}

/** Takes an accessory off a creature into its owner's discard pile, with a log line. */
async function knockAccessoryOff(ctx, card, side) {
    if (!card || !card.accessory) return false;
    const acc = discardAccessory(card, side);
    Render.all();
    await ctx.say(`${acc.data.name} is knocked off ${creatureName(card, side)}.`, { kind: 'item', icon: '🧿' });
    return true;
}

/** All of the opponent's creatures in play are Stage 2 or 3. */
function foeAllEvolved(side) {
    const all = creaturesInPlay(foeOf(side));
    return all.length > 0 && all.every(c => c.data.stage === 'Stage 2' || c.data.stage === 'Stage 3');
}

/** A creature of this side was knocked out on the turn just before this one. */
function lostCreatureLastTurn(side) {
    return gameState[side].flags.lostCreatureOnTurn === gameState.turnNumber - 1;
}

/** The opponent played an item card on their last turn. */
function foeUsedItemLastTurn(side) {
    return gameState[foeOf(side)].flags.usedItemOnTurn === gameState.turnNumber - 1;
}

// Elaroo — "Your opponent is now affected by Hex. Heal this creature to full HP."
EffectRegistry.register('breathStruggle', {
    async onResolve(ctx) {
        if (!isFainted(ctx.attacker) && ctx.attacker.damage > 0) await ctx.heal(ctx.attacker, ctx.attacker.damage);
        await ctx.status(ctx.defender, 'hex');
    }
});

EffectRegistry.register('rustOnDefender', statusOnDefender('rust'));
EffectRegistry.register('rustIfHeads', statusOnDefenderIfHeads('rust'));
EffectRegistry.register('hexOnDefender', statusOnDefender('hex'));
EffectRegistry.register('hexIfHeads', statusOnDefenderIfHeads('hex'));

// Berlimperador — "+40 if all of your opponent's creatures in play are Stage 2 or 3."
EffectRegistry.register('fadoFist', bonusIf(40, ctx => foeAllEvolved(ctx.side),
    ctx => `All of ${possessive(ctx.foe).toLowerCase()} creatures are evolved`));

// Tubshade, Ashquake — "This creature's next attack does 20 extra damage."
EffectRegistry.register('nextAttack20', {
    async onResolve(ctx) {
        if (isFainted(ctx.attacker)) return;
        ctx.attacker.flags.nextAttackBonus = 20;
        await ctx.say(`${creatureName(ctx.attacker, ctx.side)}'s next attack does 20 extra damage.`, { kind: 'ability', icon: '⬆️', pace: 0.6 });
    }
});

// Arborctton — "Heads: 100 damage. Tails: this creature takes 100 damage."
EffectRegistry.register('knockKnotSlam', {
    async onDamageCalc(ctx) {
        ctx.knockKnotFlip = await ctx.flip(ctx.move.name);
        if (ctx.knockKnotFlip === 'heads') {
            await ctx.say(`${ctx.move.name} lands: 100 damage!`, { kind: 'damage', pace: 0.5 });
            return 100;
        }
        await ctx.say(`${ctx.move.name} backfires.`, { kind: 'info', pace: 0.5 });
        return 0;
    },
    async onResolve(ctx) {
        if (ctx.knockKnotFlip !== 'tails') return;
        await ctx.hit(ctx.attacker, 100, { side: ctx.side, location: 'active', reason: 'recoil' });
    }
});

// Toxflare — "If your opponent's bench isn't full, their active creature is now affected by Hex."
EffectRegistry.register('mindFlare', {
    async onResolve(ctx) {
        if (benchCreatures(ctx.foe).length >= BENCH_SIZE) {
            await ctx.say(`${possessive(ctx.foe)} bench is full: no Hex.`, { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.status(ctx.defender, 'hex');
    }
});

// Sylvickie — "If your opponent's bench is full, their active creature is now affected by Flux."
EffectRegistry.register('neuroLance', {
    async onResolve(ctx) {
        if (benchCreatures(ctx.foe).length < BENCH_SIZE) {
            await ctx.say(`${possessive(ctx.foe)} bench isn't full: no Flux.`, { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.status(ctx.defender, 'flux');
    }
});

// Terraflew — "Flip a coin. If heads, the opponent's active creature can't use its ability next turn."
// Always-on abilities stop working too.
EffectRegistry.register('abilityLock', {
    async onResolveIfTargetAlive(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('No lock.', { kind: 'info', pace: 0.5 });
            return;
        }
        ctx.defender.flags.abilityLockUntil = Timing.opponentTurns(1);
        await ctx.say(`${creatureName(ctx.defender, ctx.foe)}'s ability is locked until the end of its next turn.`,
            { kind: 'status', icon: '🔇' });
    }
});

// Granocado — "If this creature has an accessory, it takes 40 less damage from attacks next turn."
EffectRegistry.register('overchargeSlam', {
    async onResolve(ctx) {
        if (!ctx.attacker.accessory || isFainted(ctx.attacker)) return;
        grantCreatureShield(ctx.attacker, 'overchargeSlam', 40);
        await ctx.say(`${creatureName(ctx.attacker, ctx.side)} will take 40 less damage next turn (Overcharge Slam).`,
            { kind: 'ability', icon: '🛡️' });
    }
});

// Bovraze, Highbrahm — "Next turn, your benched creatures can't be damaged." (heal.js)
EffectRegistry.register('moorStomp', {
    async onResolve(ctx) {
        ctx.me.flags.benchSafeUntil = Timing.throughOpponentTurn();
        await ctx.say(`${possessive(ctx.side)} benched creatures can't be damaged next turn.`, { kind: 'ability', icon: '🐂' });
    }
});

// Lapindle +20, Florhind +30 — "...if your opponent's active creature has an accessory."
EffectRegistry.register('meadowKick20', bonusIf(20, ctx => !!ctx.defender.accessory,
    ctx => `${creatureName(ctx.defender, ctx.foe)} wears ${ctx.defender.accessory.data.name}`));
EffectRegistry.register('meadowKick30', bonusIf(30, ctx => !!ctx.defender.accessory,
    ctx => `${creatureName(ctx.defender, ctx.foe)} wears ${ctx.defender.accessory.data.name}`));

// Florhind — "Next turn, this creature takes no damage from Celestial or Mystic creatures."
EffectRegistry.register('forestFlicker', {
    async onResolve(ctx) {
        if (isFainted(ctx.attacker)) return;
        ctx.attacker.flags.flickerUntil = Timing.throughOpponentTurn();
        await ctx.say(`${creatureName(ctx.attacker, ctx.side)} takes no damage from Celestial or Mystic creatures next turn.`,
            { kind: 'ability', icon: '🦌' });
    }
});

// Stroopa, Swiftail — "Flip a coin. If heads, this creature takes no damage next turn."
EffectRegistry.register('untouchableIfHeads', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads' || isFainted(ctx.attacker)) {
            if (flip !== 'heads') await ctx.say('No protection.', { kind: 'info', pace: 0.5 });
            return;
        }
        ctx.attacker.flags.untouchableUntil = Timing.throughOpponentTurn();
        await ctx.say(`${creatureName(ctx.attacker, ctx.side)} can't be damaged during the opponent's next turn!`,
            { kind: 'ability', icon: '✨' });
    }
});

// Waflair — "Flip a coin. If heads, remove the accessory from your opponent's active creature."
EffectRegistry.register('syrupSplash', {
    async onResolveIfTargetAlive(ctx) {
        if (!ctx.defender.accessory) return;
        const flip = await ctx.flip(ctx.move.name);
        if (flip !== 'heads') {
            await ctx.say('The accessory holds.', { kind: 'info', pace: 0.5 });
            return;
        }
        await knockAccessoryOff(ctx, ctx.defender, ctx.foe);
    }
});

// Syruprex — "Remove the accessory from your opponent's active creature."
EffectRegistry.register('sealBreaker', {
    async onResolveIfTargetAlive(ctx) {
        await knockAccessoryOff(ctx, ctx.defender, ctx.foe);
    }
});

// Combino — "+20 if your opponent used an item card last turn."
EffectRegistry.register('cluckquake', bonusIf(20, ctx => foeUsedItemLastTurn(ctx.side),
    ctx => `${subject(ctx.foe)} used an item last turn`));

// Combino — "Flip a coin. If tails, this creature is left with 10 HP." (Never raises its HP.)
EffectRegistry.register('skyScratch', {
    async onResolve(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip === 'heads') {
            await ctx.say(`${creatureName(ctx.attacker, ctx.side)} lands cleanly.`, { kind: 'info', pace: 0.5 });
            return;
        }
        if (isFainted(ctx.attacker) || remainingHp(ctx.attacker) <= 10) return;
        ctx.attacker.damage = maxHp(ctx.attacker) - 10;
        Render.board();
        await ctx.say(`${creatureName(ctx.attacker, ctx.side)} is left with 10 HP.`, { kind: 'damage', icon: '💥' });
    }
});

// Verdemone — "Flip 3 coins. If you get 3 heads, heal all of your creatures to full HP."
EffectRegistry.register('reefMirage', {
    async onResolve(ctx) {
        const { heads } = await ctx.flipMany(3, ctx.move.name);
        if (heads < 3) {
            await ctx.say('Not 3 heads: no healing.', { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.say('3 heads! Every creature heals to full.', { kind: 'heal', icon: '💚' });
        for (const card of creaturesInPlay(ctx.side)) {
            if (card.damage > 0 && !isFainted(card)) await ctx.heal(card, card.damage);
        }
    }
});

// Spudrake — "Your opponent's next coin flip, during their next turn, lands on tails." (coinOverride)
EffectRegistry.register('crinkleCrash', {
    async onResolve(ctx) {
        ctx.them.flags.forcedTailsUntil = Timing.opponentTurns(1);
        await ctx.say(`${possessive(ctx.foe)} next coin flip will land on tails.`, { kind: 'status', icon: '🥔' });
    }
});

// Rayvora — "+60 if one of your creatures was knocked out last turn."
EffectRegistry.register('arcanePulse', bonusIf(60, ctx => lostCreatureLastTurn(ctx.side),
    () => 'A creature was knocked out last turn'));

// Oculara — "Flip 2 coins. If both are heads, remove all accessories attached to your opponent's creatures."
EffectRegistry.register('disruptivePulse', {
    async onResolve(ctx) {
        const { heads } = await ctx.flipMany(2, ctx.move.name);
        if (heads < 2) {
            await ctx.say('Not both heads: the accessories stay.', { kind: 'info', pace: 0.5 });
            return;
        }
        const worn = creaturesInPlay(ctx.foe).filter(c => c.accessory);
        if (!worn.length) {
            await ctx.say(`${subject(ctx.foe)} ${verb(ctx.foe, 'has', 'have')} no accessories attached.`, { kind: 'info', pace: 0.5 });
            return;
        }
        for (const card of worn) await knockAccessoryOff(ctx, card, ctx.foe);
    }
});

// Fizzelle — "If your opponent has at least 1 point, heal 50 HP from this creature."
EffectRegistry.register('tideBind', {
    async onResolve(ctx) {
        if (ctx.them.points < 1) return;
        await ctx.heal(ctx.attacker, 50);
    }
});

// Caulithyme — "Flip 2 coins. If both are heads, draw a card."
EffectRegistry.register('verdantCrown', {
    async onResolve(ctx) {
        const { heads } = await ctx.flipMany(2, ctx.move.name);
        if (heads < 2) {
            await ctx.say('Not both heads: no card.', { kind: 'info', pace: 0.5 });
            return;
        }
        const drawn = drawCards(ctx.side, 1);
        await ctx.say(drawn ? `${subject(ctx.side)} ${verb(ctx.side, 'draws', 'draw')} a card.` : 'The deck is empty.',
            { kind: 'item', icon: '🎴', pace: 0.6 });
    }
});

// Caulithyme — "If both players have the same number of points, deal 60 damage to a random creature on your opponent's bench."
EffectRegistry.register('rootSurge', {
    async onResolve(ctx) {
        if (ctx.me.points !== ctx.them.points) {
            await ctx.say('The points are not tied: no bench damage.', { kind: 'info', pace: 0.5 });
            return;
        }
        const bench = benchCreatures(ctx.foe);
        if (!bench.length) {
            await ctx.say(`${possessive(ctx.foe)} bench is empty.`, { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.hit(Rng.pick(bench), 60, { side: ctx.foe, location: 'bench', reason: 'Root Surge' });
    }
});

// Crispisoy — "Flip a coin for each of your benched creatures. +10 for each heads."
EffectRegistry.register('wrapture', bonusPerHeadsOf(10, ctx => benchCreatures(ctx.side).length, 'benched creatures'));
// Ignistone +10, Ashquake +20 — "Flip a coin for each creature on your opponent's bench."
EffectRegistry.register('blisterBurst10', bonusPerHeadsOf(10, ctx => benchCreatures(ctx.foe).length, "opposing benched creatures"));
EffectRegistry.register('blisterBurst20', bonusPerHeadsOf(20, ctx => benchCreatures(ctx.foe).length, "opposing benched creatures"));

// Legopeck — "If this creature has an accessory attached, this move does 20 / 30 extra damage."
EffectRegistry.register('aeroSnap', bonusIf(20, ctx => !!ctx.attacker.accessory,
    ctx => `${ctx.attacker.data.name} wears ${ctx.attacker.accessory.data.name}`));
EffectRegistry.register('pieceGlide', bonusIf(30, ctx => !!ctx.attacker.accessory,
    ctx => `${ctx.attacker.data.name} wears ${ctx.attacker.accessory.data.name}`));

// Heliboo — "Discard 2 random energy from your creatures." Every attached energy is equally likely.
EffectRegistry.register('heliumBurst', {
    async onResolve(ctx) {
        for (let i = 0; i < 2; i++) {
            const pool = [];
            for (const card of creaturesInPlay(ctx.side)) for (let k = 0; k < card.energy; k++) pool.push(card);
            if (!pool.length) {
                if (i === 0) await ctx.say(`${subject(ctx.side)} ${verb(ctx.side, 'has', 'have')} no energy to discard.`, { kind: 'info', pace: 0.5 });
                return;
            }
            await ctx.unenergy(Rng.pick(pool), 1, ctx.side, undefined, true);
        }
    }
});

// ===========================================================================
// CRYSTAL CANOPY PROMOS
// ===========================================================================

/** Item cards (not accessories) in this side's discard pile. */
function itemsInDiscard(side) {
    return gameState[side].discardPile.filter(c => isItem(c.data)).length;
}

/** This side put a Babybara into play this game (Gelibara's Polar Pounce). */
function playedBabybara(side) {
    const t = gameState.track && gameState.track[side];
    return !!t && [...t.played].some(id => { const d = getCardData(id); return d && d.name === 'Babybara'; });
}

// Tunarisu — "If you have 2 or more item cards in your discard pile, your opponent is now affected by Flux."
EffectRegistry.register('wasabiFocus', {
    async onResolve(ctx) {
        if (itemsInDiscard(ctx.side) < 2) {
            await ctx.say('Fewer than 2 items in the discard pile: no Flux.', { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.status(ctx.defender, 'flux');
    }
});

// Sushimaru — "If your opponent's active creature has a status condition, it can't retreat next turn."
// Mechabeyle — "If your opponent's active creature has an ability, it can't retreat next turn."
function cantRetreatIf(test, why) {
    return {
        async onResolveIfTargetAlive(ctx) {
            if (!test(ctx)) {
                await ctx.say(`${creatureName(ctx.defender, ctx.foe)} ${why}: it can still retreat.`, { kind: 'info', pace: 0.5 });
                return;
            }
            ctx.defender.flags.cantRetreatUntil = Timing.opponentTurns(1);
            await ctx.say(`${creatureName(ctx.defender, ctx.foe)} can't retreat next turn.`, { kind: 'status', icon: '⛓️' });
        }
    };
}
EffectRegistry.register('spiritFillet', cantRetreatIf(ctx => Status.any(ctx.defender), 'has no status condition'));
EffectRegistry.register('resonanceCrash', cantRetreatIf(ctx => !!ctx.defender.data.abilityEffect, 'has no ability'));

// Chargorb Electro and Rusty — "Flip a coin for each card in your hand. 30 damage for each heads."
EffectRegistry.register('voltGust', {
    async onDamageCalc(ctx) {
        const coins = ctx.me.hand.length;
        if (!coins) {
            await ctx.say('No cards in hand: no coins to flip.', { kind: 'info', pace: 0.5 });
            return 0;
        }
        const { heads } = await ctx.flipMany(coins, ctx.move.name);
        await ctx.say(`${heads} heads: ${30 * heads} damage.`, { kind: 'damage', pace: 0.5 });
        return 30 * heads;
    }
});

// Castanito — "Put a random creature with 50 HP or less from your deck into your hand."
EffectRegistry.register('nutBash', {
    async onResolve(ctx) {
        const deck = ctx.me.deck;
        const spots = [];
        deck.forEach((id, i) => { const d = getCardData(id); if (d && isCreature(d) && d.hp <= 50) spots.push(i); });
        if (!spots.length) {
            await ctx.say('No creature with 50 HP or less in the deck.', { kind: 'info', pace: 0.5 });
            return;
        }
        const [id] = deck.splice(Rng.pick(spots), 1);
        ctx.me.hand.push(instanceFromDeck(ctx.side, id));
        Render.all();
        await ctx.say(`${subject(ctx.side)} ${verb(ctx.side, 'takes', 'take')} ` +
            (ctx.side === 'player' ? getCardData(id).name : 'a creature') + ' from the deck.', { kind: 'item', icon: '🌰', pace: 0.6 });
    }
});

// Brasquente — "Next turn, this creature takes no damage from moves that cost 3 or more energy." (damage.js)
EffectRegistry.register('chestnutCrush', {
    async onResolve(ctx) {
        if (isFainted(ctx.attacker)) return;
        ctx.attacker.flags.bigMoveGuardUntil = Timing.throughOpponentTurn();
        await ctx.say(`${creatureName(ctx.attacker, ctx.side)} takes no damage from moves that cost 3 or more energy next turn.`,
            { kind: 'ability', icon: '🌰' });
    }
});

// Gelibara — "If you played a Babybara this game, your opponent is now affected by Hallucination and Hex."
EffectRegistry.register('polarPounce', {
    async onResolve(ctx) {
        if (!playedBabybara(ctx.side)) {
            await ctx.say('No Babybara played this game: no conditions.', { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.status(ctx.defender, 'hallucination');
        await ctx.status(ctx.defender, 'hex');
    }
});

// Tulippestus — "If your opponent retreats next turn, their new active creature takes 40 damage." (actions.js)
EffectRegistry.register('celestialBlossom', {
    async onResolve(ctx) {
        ctx.them.flags.retreatTrapUntil = Timing.opponentTurns(1);
        await ctx.say(`If ${subject(ctx.foe).toLowerCase()} ${verb(ctx.foe, 'retreats', 'retreat')} next turn, the new active creature takes 40 damage.`,
            { kind: 'status', icon: '🌷' });
    }
});

// ===========================================================================
// AI DAMAGE EXPECTATIONS
//
// Move selection needs to know what a move is actually worth, and the printed
// damage often isn't it: Gale Flip prints 0 but averages 80, Hurricane Wing
// prints 100 but whiffs half the time.
//
// Each entry receives (move, view) where view is { side, attacker, defender }
// and returns the AI's estimate. Anything not listed falls back to move.damage.
// A new set only needs an entry here if its move's printed damage is misleading.
// ===========================================================================

const EXPECTED_DAMAGE = {
    // Pure coin/dice damage
    galeFlip: () => 80,                       // 4 coins x 40
    toxicToss: () => 20,                      // 2 coins x 20
    pinkGust: () => 30,                       // 2 coins x 30
    coinClash: () => 15,                      // 50% of 30
    diceFury: () => 35,                       // avg roll 3.5 x 10
    diceTempest: () => 70,                    // avg roll 3.5 x 20
    verdantStruggle: () => 13,                // 25% of 50
    hurricaneWing: move => move.damage * 0.5,
    tailDance: move => move.damage * 0.5,

    // Flat coin bonuses
    dizzyShot: move => move.damage + 10,
    fortuneSmite: move => move.damage + 10,
    gearGrind: move => move.damage + 10,
    featherBarrage: move => move.damage + 10,
    foresightBeam: move => move.damage + 5,
    etherealEcho: move => move.damage + 15,
    prismaticDive: move => move.damage + 40,
    echoLoop: move => move.damage + 10,
    harshFlinch: move => move.damage + 20,

    // Board-dependent
    nightStrike: (move, v) => (v.attacker.energyUnits.Wind || 0) * 20,
    etherealPulse: (move, v) => (v.attacker.energy + v.defender.energy) * 20,
    galacticMeteor: (move, v) => v.defender.energy * 10,
    spectralWrapGA: (move, v) => move.damage + v.defender.energy * 10,
    neutralSurge: () => [...creaturesInPlay('player'), ...creaturesInPlay('opponent')]
        .filter(c => getCardType(c.data) === 'Neutral').length * 20,
    thornyVines: (move, v) => creaturesInPlay(foeOf(v.side)).length * 10,
    scrapStrike: (move, v) => gameState[foeOf(v.side)].discardPile
        .filter(c => isItem(c.data)).length * 20,
    alphabetAssault: (move, v) => v.defender.data.name.length * 10,
    infernoConstrict: (move, v) => benchCreatures(v.side)
        .filter(c => getCardType(c.data) === 'Mechanic').length * 30,
    enragedCharge: (move, v) => move.damage + Math.max(0, v.attacker.energy - 3) * 30,
    furySpin: (move, v) => move.damage + (remainingHp(v.attacker) <= 30 ? 50 : 0),
    shadowWrap: (move, v) => move.damage + (Status.any(v.defender) ? 30 : 0),

    // Utility moves whose printed damage doesn't reflect their value
    metallicWing: () => 0,
    tripleThreatFlip: () => 60,               // 25% outright knockout
    gulpSwap: () => 0,
    // Suicidal: only picked when there is nothing else to do.
    invincibleGambit: () => 0,

    // Temporal Rift
    sweetTackle: (move, v) => sweetCount(v.side) * 20,
    duoGale: () => 50,                        // 2 coins x 50
    drillPincer: () => 20,                    // 4 coins x 10
    galeScatter2: () => 20,                   // 2 coins x 20
    galeScatter3: () => 30,                   // 3 coins x 20
    whimCurse: (move, v) => Status.has(v.defender, 'flux') ? 70 : 0,
    funkyScent: () => 3,                      // 25% of 10
    ignitionJab: move => move.damage + 12.5,  // 25% of +50
    telepondLeap: (move, v) => move.damage + (Status.any(v.defender) ? 40 : 0),
    canopyDrift: (move, v) => move.damage + 10 * (gameState[v.side].evolutionsMade || 0),
    reverieTalon: (move, v) => move.damage + (usedDiveLastTurn(v.side) ? 40 : 0),
    pixieDraft: (move, v) => move.damage + (v.defender && /Stage [23]/.test(v.defender.data.stage) ? 30 : 0),

    // Temporal Rift promos
    searGuard: () => 0,
    burnBurst: (move, v) => move.damage + 15 * (retreatCost(v.attacker) + retreatCost(v.defender)),
    gazeJab: (move, v) => move.damage + (gameState[v.side].discardPile.some(c => isAccessory(c.data)) ? 40 : 0),
    gorillaCrash: (move, v) => (gameState[v.side].deck.length < 5 ? 6 : 3) * 20,
    moonlitRake: (move, v) => move.damage +
        (gameState[v.side].discardPile.length > gameState[foeOf(v.side)].discardPile.length ? 50 : 0),
    sanctuJab: (move, v) => (movesOf(v.defender.data).length === 2 ? 0 : move.damage),
    divineCrash: (move, v) => move.damage + (movesOf(v.defender.data).length === 2 ? 40 : 0),
    // Half the coins land, spread over the opponent's creatures: the active's share.
    napRoll: (move, v) => (gameState[v.side].discardPile.length + gameState[foeOf(v.side)].discardPile.length) * 10 /
        Math.max(1, creaturesInPlay(foeOf(v.side)).length),
    featherFlick: (move, v) => 10 * countLetterA(v.defender),

    // Crystal Canopy
    fadoFist: (move, v) => move.damage + (foeAllEvolved(v.side) ? 40 : 0),
    knockKnotSlam: () => 50,                  // 50% of 100
    meadowKick20: (move, v) => move.damage + (v.defender.accessory ? 20 : 0),
    meadowKick30: (move, v) => move.damage + (v.defender.accessory ? 30 : 0),
    cluckquake: (move, v) => move.damage + (foeUsedItemLastTurn(v.side) ? 20 : 0),
    arcanePulse: (move, v) => move.damage + (lostCreatureLastTurn(v.side) ? 60 : 0),
    wrapture: (move, v) => move.damage + 5 * benchCreatures(v.side).length,
    blisterBurst10: (move, v) => move.damage + 5 * benchCreatures(foeOf(v.side)).length,
    blisterBurst20: (move, v) => move.damage + 10 * benchCreatures(foeOf(v.side)).length,
    aeroSnap: (move, v) => move.damage + (v.attacker.accessory ? 20 : 0),
    pieceGlide: (move, v) => move.damage + (v.attacker.accessory ? 30 : 0),
    // Crystal Canopy promos
    voltGust: (move, v) => 15 * gameState[v.side].hand.length,
    nutBash: () => 0
};

for (const [id, estimator] of Object.entries(EXPECTED_DAMAGE)) {
    const def = EffectRegistry.get(id);
    if (def) def.expectedDamage = estimator;
    else console.error(`[Effects] expectedDamage for unknown effect "${id}"`);
}

/** The AI's view of what a move will do. */
function estimateMoveDamage(move, side) {
    const attacker = gameState[side].active;
    const defender = gameState[foeOf(side)].active;
    if (!attacker || !defender) return move.damage || 0;

    const def = EffectRegistry.get(move.effect);
    // Null Orb: only the printed damage happens.
    if (movesNegated(side)) return move.damage || 0;
    if (def && def.expectedDamage) {
        return def.expectedDamage(move, { side, attacker, defender });
    }
    return move.damage || 0;
}
