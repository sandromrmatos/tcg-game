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
        if (!def || !def.onDamageCalc) return ctx.damage;
        const result = await def.onDamageCalc(ctx);
        return typeof result === 'number' ? Math.max(0, result) : ctx.damage;
    },

    /** Phase F, part 1. Always runs. */
    async resolve(ctx) {
        const def = this.get(ctx.move.effect);
        if (def && def.onResolve) await def.onResolve(ctx);
    },

    /** Phase F, part 2. Only when the defender is still standing. */
    async resolveIfTargetAlive(ctx) {
        const def = this.get(ctx.move.effect);
        if (!def || !def.onResolveIfTargetAlive) return;
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

EffectRegistry.register('coinClash', {
    async onDamageCalc(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        if (flip === 'heads') {
            await ctx.say('Coin Clash connects for 30!', { kind: 'damage', pace: 0.5 });
            return 30;
        }
        await ctx.say('Coin Clash does nothing.', { kind: 'info', pace: 0.5 });
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

EffectRegistry.register('nightStrike', damagePerCount(
    20,
    n => `${n} energy attached`,
    ctx => ctx.attacker.energy
));

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
EffectRegistry.register('healingSap', selfHeal(20));

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
        grantSideShield(ctx.side, 'monksFury', 20);
        await ctx.say(
            `${possessive(ctx.side)} side takes 20 less damage next turn (Monk's Fury).`,
            { kind: 'ability', icon: '🛡️' }
        );
    }
});

EffectRegistry.register('spectralBurst', {
    async onResolve(ctx) {
        grantSideShield(ctx.side, 'spectralBurst', 10);
        await ctx.say(
            `${possessive(ctx.side)} side takes 10 less damage next turn (Spectral Burst).`,
            { kind: 'ability', icon: '🛡️' }
        );
    }
});

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
        ctx.attacker.flags.cooldowns.overdriveSmash = Timing.myTurns(2);
        await ctx.say(
            `Overdrive Smash overheats and can't be used for 2 turns.`,
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
            const target = await ctx.chooseMyCreature({
                title: 'Attach 1 energy to a bench creature',
                filter: c => c.location === 'bench',
                aiPick: candidates => bestEnergyTarget(candidates)
            });
            if (!target) {
                await ctx.say('No bench creature to charge.', { kind: 'info', pace: 0.5 });
                return;
            }
            await ctx.energy(target.card, 1);
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
        await ctx.unenergy(victim, 1, ctx.foe);
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
            // Extend an existing lock rather than overwriting it, so a second
            // cast adds turns instead of possibly shortening the first.
            const current = ctx.them.flags.invincibleLockUntil;
            ctx.them.flags.invincibleLockUntil = Timing.active(current)
                ? current + (2 * heads)
                : Timing.opponentTurns(heads);
            await ctx.say(
                `${subject(ctx.foe)} cannot attack for ${heads} turn${heads === 1 ? '' : 's'}!`,
                { kind: 'status', icon: '🚫' }
            );
        } else {
            await ctx.say('No heads: the gambit fails.', { kind: 'info', pace: 0.5 });
        }
        // The attacker faints regardless. Knockout resolution sweeps it up.
        ctx.attacker.damage = ctx.attacker.data.hp;
        await ctx.say(
            `${creatureName(ctx.attacker, ctx.side)} collapses from the effort.`,
            { kind: 'ko', icon: '☠️' }
        );
        Render.board();
    }
});

// "Move an energy between your own creatures." Was a no-op in the original.
EffectRegistry.register('cloudBounce', {
    async onResolve(ctx) {
        const sources = creaturesInPlay(ctx.side).filter(c => c.energy > 0);
        if (sources.length === 0 || creaturesInPlay(ctx.side).length < 2) {
            await ctx.say('No energy to move.', { kind: 'info', pace: 0.5 });
            return;
        }
        const from = await ctx.chooseMyCreature({
            title: 'Move energy FROM which creature?',
            filter: c => c.card.energy > 0,
            cancellable: true,
            aiPick: candidates => {
                // Prefer taking from a bench creature that is not about to attack.
                const bench = candidates.filter(c => c.location === 'bench');
                return (bench.length ? bench : candidates)
                    .slice()
                    .sort((a, b) => b.card.energy - a.card.energy)[0];
            }
        });
        if (!from) {
            await ctx.say('No energy moved.', { kind: 'info', pace: 0.5 });
            return;
        }
        const to = await ctx.chooseMyCreature({
            title: 'Move energy TO which creature?',
            filter: c => c.card !== from.card,
            cancellable: true,
            aiPick: candidates => bestEnergyTarget(candidates)
        });
        if (!to) {
            await ctx.say('No energy moved.', { kind: 'info', pace: 0.5 });
            return;
        }
        await ctx.unenergy(from.card, 1);
        await ctx.energy(to.card, 1);
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
        ctx.attacker.damage = Math.max(0, ctx.attacker.data.hp - defenderHp);
        ctx.defender.damage = Math.max(0, ctx.defender.data.hp - attackerHp);

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
        ctx.defender.damage = ctx.defender.data.hp;
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
        await swapActiveWithBench(ctx.foe, choice.index);
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

/** Prefers a creature that is close to affording a move. */
function bestEnergyTarget(candidates) {
    const score = entry => {
        const moves = movesOf(entry.card.data);
        if (moves.length === 0) return -1;
        const cheapest = Math.min(...moves.map(m => m.costCount));
        const deficit = cheapest - entry.card.energy;
        // A creature one energy short is the most valuable target.
        return deficit === 1 ? 100 : (deficit > 0 ? 50 - deficit : 10);
    };
    return candidates.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

/** Healthiest creature that can actually threaten something. */
function healthiestAttacker(candidates) {
    const score = entry => {
        const hpFraction = remainingHp(entry.card) / entry.card.data.hp;
        const best = movesOf(entry.card.data)
            .filter(m => entry.card.energy >= m.costCount)
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
    nightStrike: (move, v) => v.attacker.energy * 20,
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
    invincibleGambit: () => 0
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
    if (def && def.expectedDamage) {
        return def.expectedDamage(move, { side, attacker, defender });
    }
    return move.damage || 0;
}
