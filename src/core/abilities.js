// ============================================================================
// ABILITY REGISTRY
//
// One entry per ability, used by BOTH sides.
//
// The original had the player's abilities in a 31-case switch and the AI's in
// two more if/else chains (one for the active slot, one for the bench). The
// bench chain covered 15 of the 31, so the AI never used Absorb Energy,
// Energized Healing, Caprine Guard, Elemental Fortitude, Gnawing Precision,
// Hydration or Aqua Mirror at all — and the last two did nothing for either
// side, because their flags were written but never read.
//
// Each entry may define:
//   requires(ctx) -> {ok, reason}   extra legality beyond the shared checks
//   use(ctx)                        the effect (async)
//   aiWants(ctx) -> boolean         whether the AI should use it now
//
// `abilityLocation` on the card is authoritative for where it may be used, so
// that rule lives in data, not code.
//
// ADDING AN ABILITY FOR A NEW SET: one register() call. validate.js fails at
// startup if a card names an ability id that isn't here.
// ============================================================================

const AbilityRegistry = {
    abilities: new Map(),

    register(id, definition) {
        if (this.abilities.has(id)) {
            console.error(`[Abilities] duplicate registration for "${id}"`);
        }
        this.abilities.set(id, Object.assign({ id }, definition));
    },

    get(id) {
        return id ? this.abilities.get(id) || null : null;
    },

    has(id) {
        return this.abilities.has(id);
    },

    ids() {
        return Array.from(this.abilities.keys());
    },

    /**
     * The shared legality check. Both the ability buttons and the AI call this,
     * so a button is never offered for something the rules forbid.
     * @returns {{ok: boolean, reason?: string}}
     */
    canUse(card, side, location) {
        if (!card || !card.data.abilityEffect) {
            return { ok: false, reason: 'No ability.' };
        }
        if (gameState.phase !== 'playing') {
            return { ok: false, reason: 'Not in play.' };
        }
        if (gameState.currentTurn !== side) {
            return { ok: false, reason: 'Not your turn.' };
        }
        if (gameState[side].hasAttacked) {
            return { ok: false, reason: 'Abilities must be used before attacking.' };
        }
        if (card.abilityUsedThisTurn) {
            return { ok: false, reason: `${card.data.name} already used its ability this turn.` };
        }

        const required = card.data.abilityLocation || 'any';
        if (required !== 'any' && required !== location) {
            return {
                ok: false,
                reason: `${card.data.abilityName} can only be used from the ${required} spot.`
            };
        }

        const def = this.get(card.data.abilityEffect);
        if (!def) {
            return { ok: false, reason: `Ability "${card.data.abilityEffect}" is not implemented.` };
        }
        if (def.requires) {
            const ctx = makeAbilityContext(card, side, location);
            return def.requires(ctx);
        }
        return { ok: true };
    },

    /** Runs an ability after checking legality. */
    async use(card, side, location, index) {
        const check = this.canUse(card, side, location);
        if (!check.ok) {
            Log.warn(check.reason);
            return false;
        }

        const def = this.get(card.data.abilityEffect);
        const ctx = makeAbilityContext(card, side, location, index);

        if (side === 'opponent') {
            await Log.centerBanner(`✨ ${card.data.abilityName}`,
                `${creatureName(card, side)} uses its ability`, { kind: 'ability', ms: 1500 });
        }
        await Log.say(
            `${creatureName(card, side)} uses ${card.data.abilityName}.`,
            { kind: 'ability', icon: '✨', side }
        );

        // Marked before running, so an ability that opens a prompt can't be
        // triggered twice by an impatient second click.
        card.abilityUsedThisTurn = true;
        Render.all();

        await def.use(ctx);
        Render.all();
        return true;
    },

    /** Would the AI use this ability right now? */
    aiWants(card, side, location, index) {
        const def = this.get(card.data.abilityEffect);
        if (!def) return false;
        if (!def.aiWants) return true;
        return def.aiWants(makeAbilityContext(card, side, location, index));
    }
};

/** Ability context: the standard context plus who is using it and from where. */
function makeAbilityContext(card, side, location, index) {
    return makeContext(side, {
        card,
        location,
        index: index === undefined ? benchIndexOf(side, card) : index,
        ability: card.data.abilityEffect
    });
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** True if this side still has an attack available this turn. */
function sideWillAttackThisTurn(side) {
    return gameState.currentTurn === side &&
        !gameState[side].hasAttacked &&
        usableMoves(side).length > 0;
}

function damagedCreatures(side, typeFilter) {
    return creaturesInPlay(side).filter(c =>
        c.damage > 0 && (!typeFilter || getCardType(c.data) === typeFilter));
}

/** Grants a side-wide shield and announces it. */
function sideShieldAbility(key, amount, description) {
    return {
        async use(ctx) {
            grantSideShield(ctx.side, key, amount);
            await ctx.say(
                `${possessive(ctx.side)} creatures take ${amount} less damage next turn ${description}.`,
                { kind: 'ability', icon: '🛡️' }
            );
        }
    };
}

// ===========================================================================
// ELEMENTAL AWAKENING
// ===========================================================================

AbilityRegistry.register('defenseAura', sideShieldAbility(
    'defenseAura', 10, 'from the next attack'));

AbilityRegistry.register('hardAsSteel', Object.assign(
    sideShieldAbility('hardAsSteel', 30, 'from Mechanic and Neutral attackers'),
    {
        aiWants(ctx) {
            const attackerType = ctx.them.active ? getCardType(ctx.them.active.data) : null;
            return attackerType === 'Mechanic' || attackerType === 'Neutral';
        }
    }
));

AbilityRegistry.register('resourcefulRecovery', {
    async use(ctx) {
        const flip = await ctx.flip('Resourceful Recovery');
        if (flip !== 'heads') {
            await ctx.say('No energy attached.', { kind: 'info', pace: 0.5 });
            return;
        }
        const target = await ctx.chooseMyCreature({
            title: 'Attach 1 energy to any of your creatures',
            aiPick: candidates => bestEnergyTarget(candidates)
        });
        if (target) await ctx.energy(target.card, 1);
    }
});

AbilityRegistry.register('auraOfStrength', {
    requires(ctx) {
        if (benchCreatures(ctx.side).length < BENCH_SIZE) {
            return { ok: false, reason: 'Aura of Strength needs a full bench of 3 creatures.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        ctx.me.flags.auraOfStrengthBonus = 30;
        await ctx.say(`${possessive(ctx.side)} attacks deal +30 damage this turn.`,
            { kind: 'ability', icon: '⬆️' });
    },
    aiWants: ctx => sideWillAttackThisTurn(ctx.side)
});

// "Flip a coin. If heads, evolve this creature immediately."
// Resolved through the shared evolution routine and matched by evolution link
// rather than the hardcoded creature name the original used, so this ability
// works unchanged for any future creature that has it.
AbilityRegistry.register('guardiansCall', {
    requires(ctx) {
        if (findEvolutionInHand(ctx.side, ctx.card) === -1) {
            return {
                ok: false,
                reason: `${ctx.card.data.abilityName} needs ${ctx.card.data.name}'s evolution in hand.`
            };
        }
        return { ok: true };
    },
    async use(ctx) {
        const flip = await ctx.flip("Guardian's Call");
        if (flip !== 'heads') {
            await ctx.say('The evolution fails.', { kind: 'info', pace: 0.5 });
            return;
        }
        const handIndex = findEvolutionInHand(ctx.side, ctx.card);
        if (handIndex === -1) return;

        // Bypasses the normal turn-timing restrictions, but goes through the
        // same routine, so damage, energy and the evolution chain all carry over.
        turnTracker.playedThisTurn.delete(ctx.card.evolutionId);
        turnTracker.evolvedThisTurn.delete(ctx.card.evolutionId);
        const savedTurn = gameState.turnNumber;
        gameState.turnNumber = Math.max(savedTurn, FIRST_EVOLUTION_TURN);
        await evolveCreature(ctx.side, handIndex, ctx.location, ctx.index);
        gameState.turnNumber = savedTurn;
    }
});

/** Index in hand of a card that evolves `card`, or -1. */
function findEvolutionInHand(side, card) {
    return gameState[side].hand.findIndex(
        h => isCreature(h.data) && isEvolutionOf(h.data, card.data));
}

AbilityRegistry.register('guardian', {
    async use(ctx) {
        ctx.me.flags.guardianIndex = ctx.index;
        ctx.me.flags.guardianUntil = Timing.throughOpponentTurn();
        await ctx.say(
            `${creatureName(ctx.card, ctx.side)} will take the next hit meant for the active creature.`,
            { kind: 'ability', icon: '🛡️' }
        );
    },
    // Worth spending only when the active creature is in real danger.
    aiWants(ctx) {
        const active = ctx.me.active;
        return !!active && remainingHp(active) <= active.data.hp * 0.4;
    }
});

AbilityRegistry.register('energySiphon', {
    requires(ctx) {
        if (ctx.them.flags.usedItemOnTurn !== gameState.turnNumber - 1) {
            return { ok: false, reason: 'Energy Siphon needs the opponent to have used an item last turn.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        await ctx.energy(ctx.card, 1);
    }
});

AbilityRegistry.register('quickReflexes', {
    async use(ctx) {
        const { heads } = await ctx.flipMany(2, 'Quick Reflexes');
        if (heads < 2) {
            await ctx.say('Not both heads: no effect.', { kind: 'info', pace: 0.5 });
            return;
        }
        ctx.them.flags.cantAttackUntil = Timing.opponentTurns(1);
        await ctx.say(`${subject(ctx.foe)} cannot attack next turn!`,
            { kind: 'status', icon: '🚫' });
    }
});

AbilityRegistry.register('clarityAura', {
    async use(ctx) {
        ctx.me.flags.clarityAuraUntil = Timing.throughOpponentTurn();
        await ctx.say(
            `${possessive(ctx.side)} creatures are shielded from Hallucination next turn.`,
            { kind: 'ability', icon: '✨' }
        );
    }
});

AbilityRegistry.register('celestialBlessing', {
    requires(ctx) {
        const anyDamaged = damagedCreatures('player', 'Celestial').length +
            damagedCreatures('opponent', 'Celestial').length;
        if (anyDamaged === 0) {
            return { ok: false, reason: 'No damaged Celestial creature to heal.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        // Deliberately random across BOTH sides, as printed on the card.
        const pool = [];
        for (const side of SIDES) {
            for (const card of damagedCreatures(side, 'Celestial')) {
                pool.push({ side, card });
            }
        }
        const pick = Rng.pick(pool);
        if (!pick) return;
        await ctx.heal(pick.card, 30, { side: pick.side });
    },
    // Only worth it when the AI has more to gain than its opponent.
    aiWants(ctx) {
        return damagedCreatures(ctx.side, 'Celestial').length >
            damagedCreatures(ctx.foe, 'Celestial').length;
    }
});

AbilityRegistry.register('sturdyPresence', {
    async use(ctx) {
        ctx.me.flags.sturdyPresenceBonus = 20;
        await ctx.say(`${possessive(ctx.side)} attacks deal +20 damage this turn.`,
            { kind: 'ability', icon: '⬆️' });
    },
    aiWants: ctx => sideWillAttackThisTurn(ctx.side)
});

AbilityRegistry.register('rainbowStrike', {
    async use(ctx) {
        ctx.me.flags.rainbowStrike = true;
        await ctx.say(
            `This turn's attack will also hit a random bench creature for 30.`,
            { kind: 'ability', icon: '🌈' }
        );
    },
    aiWants: ctx => sideWillAttackThisTurn(ctx.side) &&
        benchCreatures(ctx.foe).length > 0
});

AbilityRegistry.register('camouflage', {
    async use(ctx) {
        ctx.me.flags.camouflageUntil = Timing.throughOpponentTurn();
        await ctx.say(
            `${possessive(ctx.side)} bench creatures cannot be damaged next turn.`,
            { kind: 'ability', icon: '🍃' }
        );
    },
    aiWants: ctx => benchCreatures(ctx.side).length > 0
});

AbilityRegistry.register('phaseShift', {
    requires(ctx) {
        if (benchCreatures(ctx.side).length === 0) {
            return { ok: false, reason: 'Phase Shift needs a bench creature to switch with.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        ctx.me.flags.phaseShift = true;
        await ctx.say(
            `${creatureName(ctx.card, ctx.side)} will slip back to the bench after attacking.`,
            { kind: 'ability', icon: '🌀' }
        );
    },
    // Only useful when retreating afterwards is actually desirable.
    aiWants(ctx) {
        const active = ctx.me.active;
        return sideWillAttackThisTurn(ctx.side) &&
            benchCreatures(ctx.side).length > 0 &&
            !!active && remainingHp(active) <= active.data.hp * 0.5;
    }
});

// ===========================================================================
// GALACTIC ADVENTURES
// ===========================================================================

AbilityRegistry.register('extraCharge', {
    requires(ctx) {
        const neutrals = creaturesInPlay(ctx.side)
            .filter(c => getCardType(c.data) === 'Neutral');
        if (neutrals.length === 0) {
            return { ok: false, reason: 'Extra Charge needs a Neutral creature in play.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        const target = await ctx.chooseMyCreature({
            title: 'Attach 1 extra energy to a Neutral creature',
            filter: c => getCardType(c.card.data) === 'Neutral',
            aiPick: candidates => bestEnergyTarget(candidates)
        });
        if (target) await ctx.energy(target.card, 1);
    }
});

AbilityRegistry.register('guardianMode', {
    async use(ctx) {
        ctx.me.flags.guardianModeUntil = Timing.throughOpponentTurn();
        await ctx.say(
            `${possessive(ctx.side)} creatures take 10 less damage next turn.`,
            { kind: 'ability', icon: '🛡️' }
        );
    }
});

AbilityRegistry.register('warriorMode', {
    async use(ctx) {
        ctx.me.flags.warriorModeBonus = 10;
        await ctx.say(`${possessive(ctx.side)} attacks deal +10 damage this turn.`,
            { kind: 'ability', icon: '⬆️' });
    },
    aiWants: ctx => sideWillAttackThisTurn(ctx.side)
});

/** Healing Retreat comes in two strengths (Trunket 20, Elefeir 40). */
function healingRetreatAbility(amount) {
    return {
        async use(ctx) {
            ctx.card.flags.healingRetreat = amount;
            await ctx.say(
                `${creatureName(ctx.card, ctx.side)} will heal ${amount} HP when it retreats.`,
                { kind: 'ability', icon: '🌿' }
            );
        },
        // Only meaningful if it is damaged and could actually retreat.
        aiWants(ctx) {
            return ctx.card.damage > 0 && creatureCanRetreat(ctx.card, ctx.side).ok;
        }
    };
}

AbilityRegistry.register('healingRetreat1', healingRetreatAbility(20));
AbilityRegistry.register('healingRetreat2', healingRetreatAbility(40));

AbilityRegistry.register('mirageShield', {
    async use(ctx) {
        ctx.them.flags.cantUseItemsUntil = Timing.opponentTurns(1);
        await ctx.say(`${subject(ctx.foe)} cannot use items next turn.`,
            { kind: 'status', icon: '🔮' });
    }
});

AbilityRegistry.register('thunderRush', {
    requires(ctx) {
        if (ctx.them.flags.evolvedOnTurn !== gameState.turnNumber - 1) {
            return { ok: false, reason: 'Thunder Rush needs the opponent to have evolved last turn.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        ctx.me.flags.thunderRush = true;
        await ctx.say(`${possessive(ctx.side)} attack damage is doubled this turn!`,
            { kind: 'ability', icon: '⚡' });
    },
    aiWants: ctx => sideWillAttackThisTurn(ctx.side)
});

AbilityRegistry.register('absorbEnergy', {
    async use(ctx) {
        ctx.card.flags.absorbEnergy = true;
        await ctx.say(
            `${creatureName(ctx.card, ctx.side)} will gain energy whenever it is healed.`,
            { kind: 'ability', icon: '⚡' }
        );
    }
});

/** Energized Healing comes in two strengths (Nebuleap 10, Comiscroaker 20). */
function energizedHealingAbility(amount) {
    return {
        async use(ctx) {
            ctx.card.flags.energizedHealing = amount;
            await ctx.say(
                `${creatureName(ctx.card, ctx.side)} will heal ${amount} HP whenever energy is attached to it.`,
                { kind: 'ability', icon: '💧' }
            );
        }
    };
}

AbilityRegistry.register('energizedHealing1', energizedHealingAbility(10));
AbilityRegistry.register('energizedHealing2', energizedHealingAbility(20));

AbilityRegistry.register('gnawingPrecision', {
    requires(ctx) {
        if (creaturesInPlay(ctx.foe).length === 0) {
            return { ok: false, reason: 'No opposing creature to target.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        const target = await ctx.chooseTheirCreature({
            title: "Deal 20 damage to any of your opponent's creatures",
            aiPick: candidates => {
                // Prefer a finishing blow, then the most damaged target.
                const lethal = candidates.filter(c => remainingHp(c.card) <= 20);
                return lethal.length ? lethal[0] : mostHurt(candidates);
            }
        });
        if (!target) return;
        await ctx.hit(target.card, 20, {
            side: ctx.foe,
            location: target.location,
            reason: 'Gnawing Precision'
        });
        await resolveKnockouts();
    }
});

AbilityRegistry.register('metalicProtection', {
    async use(ctx) {
        ctx.card.flags.metalicProtectionUntil = Timing.throughOpponentTurn();
        await ctx.say(
            `${creatureName(ctx.card, ctx.side)} hardens: immune to Mechanic damage next turn, at a cost of 20 HP.`,
            { kind: 'ability', icon: '⚙️' }
        );
        await ctx.hit(ctx.card, 20, {
            side: ctx.side,
            location: ctx.location,
            reason: 'Metalic Protection'
        });
        await resolveKnockouts();
    },
    // Costs 20 HP, so only when it survives it and the threat is Mechanic.
    aiWants(ctx) {
        if (remainingHp(ctx.card) <= 30) return false;
        return creaturesInPlay(ctx.foe).some(c => getCardType(c.data) === 'Mechanic');
    }
});

AbilityRegistry.register('caprineGuard', Object.assign(
    sideShieldAbility('caprineGuard', 40, 'from Celestial and Mystic attackers'),
    {
        aiWants(ctx) {
            const type = ctx.them.active ? getCardType(ctx.them.active.data) : null;
            return type === 'Celestial' || type === 'Mystic';
        }
    }
));

AbilityRegistry.register('elementalFortitude', {
    async use(ctx) {
        grantCreatureShield(ctx.card, 'elementalFortitude', 20);
        await ctx.say(
            `${creatureName(ctx.card, ctx.side)} takes 20 less damage from Wind and Mechanic next turn.`,
            { kind: 'ability', icon: '🛡️' }
        );
    },
    aiWants(ctx) {
        const type = ctx.them.active ? getCardType(ctx.them.active.data) : null;
        return type === 'Wind' || type === 'Mechanic';
    }
});

AbilityRegistry.register('hydration', {
    async use(ctx) {
        ctx.card.flags.hydrationUntil = Timing.throughOpponentTurn();
        await ctx.say(
            `${creatureName(ctx.card, ctx.side)} is immune to status conditions next turn.`,
            { kind: 'ability', icon: '💧' }
        );
    }
});

AbilityRegistry.register('retaliationStone', {
    async use(ctx) {
        ctx.card.flags.retaliationStone = true;
        await ctx.say(
            `${creatureName(ctx.card, ctx.side)} will strike back for 20 if it is damaged.`,
            { kind: 'ability', icon: '💎' }
        );
    }
});

AbilityRegistry.register('aquaMirror', {
    async use(ctx) {
        ctx.card.flags.aquaMirrorUntil = Timing.throughOpponentTurn();
        await ctx.say(
            `${creatureName(ctx.card, ctx.side)} will reflect any status condition back at the attacker.`,
            { kind: 'ability', icon: '🪞' }
        );
    }
});
