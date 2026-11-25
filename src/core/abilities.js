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
// Two kinds of ability, following the card text:
//
//   * ACTIVATED — the text describes a choice ("you may", "flip a coin",
//     "attach an energy", "deal 20 damage to any creature"). The player presses
//     a button, once per turn, before attacking. Entries define:
//       requires(ctx) -> {ok, reason}   extra legality beyond the shared checks
//       use(ctx)                        the effect (async)
//       aiWants(ctx) -> boolean         whether the AI should use it now
//
//   * ALWAYS ON (`passive: true`) — the text describes a standing rule ("this
//     creature takes 30 less damage", "your bench can't be damaged"). There is
//     no button; the rule is read where it applies (damage.js, heal.js,
//     status.js, combat.js, timing.js, actions.js, items.js, turn.js) through
//     cardAbilityOn() / sideHasAbility() below.
//
// `abilityLocation` on the card is authoritative for where an ability works:
// where an activated one can be used from, and where an always-on one is in
// effect ('active', 'bench' or 'any').
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

    /** True for an always-on ability: it has no button and is never "used". */
    isPassive(id) {
        const def = this.get(id);
        return !!(def && def.passive);
    },

    /**
     * Called by the rules each time an always-on ability changes something,
     * so the test harness can report which ones were exercised.
     */
    triggered: new Map(),
    noteTriggered(id) {
        this.triggered.set(id, (this.triggered.get(id) || 0) + 1);
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
        if (this.isPassive(card.data.abilityEffect)) {
            return { ok: false, reason: `${card.data.abilityName} is always on: there is nothing to activate.` };
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
        if (abilitiesBlocked(side)) {
            const why = Timing.active(gameState[side].flags.abilitiesBlockedUntil) ? 'Ability Seal' : 'Memento Echo';
            return { ok: false, reason: `${why}: no abilities can be used this turn.` };
        }
        if (abilityLocked(card)) {
            return { ok: false, reason: `Ability Lock: ${card.data.name} can't use its ability this turn.` };
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

/** Creatures that could be healed: damaged, and not blocked by Hex or Silent Aura. */
function damagedCreatures(side, typeFilter) {
    return creaturesInPlay(side).filter(c =>
        c.damage > 0 && !healBlockedBy(c, side) && (!typeFilter || getCardType(c.data) === typeFilter));
}

// ---------------------------------------------------------------------------
// Always-on abilities: where the rules ask "is this in effect right now?"
// ---------------------------------------------------------------------------

/** Does this card's ability work at this board location? */
function abilityWorksAt(card, location) {
    const where = card.data.abilityLocation || 'any';
    return where === 'any' || where === location;
}

/**
 * Memento Echo (Wraithrift): "Next turn, your opponent can't use abilities."
 * On that side's next turn none of its abilities work, always-on ones included.
 */
function abilitiesBlocked(side) {
    const s = side && gameState[side];
    if (!s) return false;
    if (s.flags.abilitiesBlockedTurn === gameState.turnNumber) return true;
    // Ability Seal (Crystal Canopy item): the same, on that side's next two turns.
    return gameState.currentTurn === side && Timing.active(s.flags.abilitiesBlockedUntil);
}

/** Ability Lock (Terraflew): this one creature's ability doesn't work, always-on ones included. */
function abilityLocked(card) {
    return !!card && !!card.flags && Timing.active(card.flags.abilityLockUntil);
}

/** This creature has ability `id` and is standing where it works. */
function hasAbilityAt(card, id, location) {
    if (!card || !card.data || card.data.abilityEffect !== id || !abilityWorksAt(card, location)) return false;
    if (abilityLocked(card)) return false;
    const spot = locateCard(card);
    return !(spot && abilitiesBlocked(spot.side));
}

/** This creature is in play, has ability `id`, and it is in effect where it stands. */
function cardAbilityOn(card, id) {
    if (!card || !card.data || card.data.abilityEffect !== id) return false;
    if (abilityLocked(card)) return false;
    const spot = locateCard(card);
    return !!spot && abilityWorksAt(card, spot.location) && !abilitiesBlocked(spot.side);
}

/** A side's creatures whose always-on ability `id` is currently in effect. */
function creaturesWithAbility(side, id) {
    const s = gameState[side];
    if (!s || abilitiesBlocked(side)) return [];
    const out = [];
    if (hasAbilityAt(s.active, id, 'active')) out.push(s.active);
    for (const card of s.bench) if (hasAbilityAt(card, id, 'bench')) out.push(card);
    return out;
}

function sideHasAbility(side, id) {
    return creaturesWithAbility(side, id).length > 0;
}

/** Healing Retreat and Energized Healing come in two strengths. */
const PASSIVE_AMOUNTS = {
    healingRetreat1: 20,
    healingRetreat2: 40,
    energizedHealing1: 10,
    energizedHealing2: 20
};

/** Registers an always-on ability. `summary` is shown in the creature panel. */
function passiveAbility(summary) {
    return { passive: true, summary };
}

// ===========================================================================
// ELEMENTAL AWAKENING
// ===========================================================================

// --- Always on ---------------------------------------------------------------

// "While in the active position, it takes 10 less damage from attacks."
AbilityRegistry.register('defenseAura', passiveAbility(
    'While this creature is active, it takes 10 less damage from attacks.'));

// "This creature takes 30 less damage from neutral and mechanic creatures."
AbilityRegistry.register('hardAsSteel', passiveAbility(
    'This creature takes 30 less damage from Neutral and Mechanic creatures.'));

// "When this creature is in play, all of your attacks deal 20 more damage."
AbilityRegistry.register('sturdyPresence', passiveAbility(
    'While this creature is in play, all your attacks deal 20 more damage.'));

// "Boosts the damage of any of your active creature attacks by 30 if you have
// a full bench."
AbilityRegistry.register('auraOfStrength', passiveAbility(
    'While this creature is in play and your bench is full, your attacks deal 30 more damage.'));

// "Prevents all of your creatures from getting the Hallucination status condition."
AbilityRegistry.register('clarityAura', passiveAbility(
    'While this creature is in play, your creatures cannot get Hallucination.'));

// "Your bench creatures can't be damaged."
AbilityRegistry.register('camouflage', passiveAbility(
    'While this creature is in play, your bench creatures cannot be damaged.'));

// "When attacking, also deal 30 damage to a random creature from the opponent's bench."
AbilityRegistry.register('rainbowStrike', passiveAbility(
    'Whenever this creature attacks, it also deals 30 damage to a random opposing bench creature.'));

// "Whenever your opponent uses an item card, attach one energy to this creature."
AbilityRegistry.register('energySiphon', passiveAbility(
    'Whenever your opponent uses an item, this creature gets 1 energy.'));

// --- Activated (the card text is a choice) ------------------------------------

AbilityRegistry.register('resourcefulRecovery', {
    async use(ctx) {
        const flip = await ctx.flip('Resourceful Recovery');
        if (flip !== 'heads') {
            await ctx.say('No energy attached.', { kind: 'info', pace: 0.5 });
            return;
        }
        const type = rollEnergyType(ctx.side);
        const target = await ctx.chooseMyCreature({
            title: `Attach 1 ${type} energy to any of your creatures`,
            aiPick: candidates => bestEnergyTarget(candidates, type)
        });
        if (target) await ctx.energy(target.card, 1, ctx.side, type);
    }
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

// "Protects the active creature, taking damage on their behalf." A choice made
// from the bench each turn: during the opponent's next turn, the next attack
// on the active creature hits this Aegiscelis instead. It remembers the
// creature, not the bench slot, so a swap can't put someone else in its place.
AbilityRegistry.register('guardian', {
    async use(ctx) {
        ctx.me.flags.guardianCard = ctx.card;
        ctx.me.flags.guardianUntil = Timing.throughOpponentTurn();
        await ctx.say(
            `${creatureName(ctx.card, ctx.side)} will take the next hit meant for the active creature.`,
            { kind: 'ability', icon: '🛡️' }
        );
    },
    // Worth spending only when the active creature is in real danger.
    aiWants(ctx) {
        const active = ctx.me.active;
        return !!active && remainingHp(active) <= maxHp(active) * 0.4;
    }
});

/** Index in hand of a card that evolves `card`, or -1. */
function findEvolutionInHand(side, card) {
    return gameState[side].hand.findIndex(
        h => isCreature(h.data) && isEvolutionOf(h.data, card.data));
}

AbilityRegistry.register('quickReflexes', {
    async use(ctx) {
        const { heads } = await ctx.flipMany(2, 'Quick Reflexes', { need: 'all' });
        if (heads < 2) {
            await ctx.say('Not both heads: no effect.', { kind: 'info', pace: 0.5 });
            return;
        }
        ctx.them.flags.cantAttackUntil = Timing.opponentTurns(1);
        await ctx.say(`${subject(ctx.foe)} cannot attack next turn!`,
            { kind: 'status', icon: '🚫' });
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

// "The creature can move out of the active position and reappear on the bench
// after an attack" — optional, so it stays a choice made before attacking.
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
            !!active && remainingHp(active) <= maxHp(active) * 0.5;
    }
});

// ===========================================================================
// GALACTIC ADVENTURES
// ===========================================================================

// --- Always on ---------------------------------------------------------------

// "Reduces all damage taken by 10" — every creature on your side, from every
// source your opponent controls (attacks, bench damage, abilities).
AbilityRegistry.register('guardianMode', passiveAbility(
    'While this creature is in play, all damage your creatures take from the opponent is reduced by 10.'));

// "Increases all damage done by 10" — every attack, and every other damage
// your side deals to the opponent's creatures.
AbilityRegistry.register('warriorMode', passiveAbility(
    'While this creature is in play, all damage your side deals to the opponent is increased by 10.'));

// "When this creature retreats to the bench, it heals 20 / 40 HP."
AbilityRegistry.register('healingRetreat1', passiveAbility(
    'When this creature leaves the active spot for the bench, it heals 20 HP.'));
AbilityRegistry.register('healingRetreat2', passiveAbility(
    'When this creature leaves the active spot for the bench, it heals 40 HP.'));

// "If this creature is in the active slot, your opponent can't use items."
AbilityRegistry.register('mirageShield', passiveAbility(
    'While this creature is active, your opponent cannot use items.'));

// "Double the attack damage of this creature if your opponent evolved a
// creature in the last turn."
AbilityRegistry.register('thunderRush', passiveAbility(
    "This creature's attack damage is doubled if your opponent evolved a creature on their last turn."));

// "When this creature is healed, it also gains an additional Energy card."
AbilityRegistry.register('absorbEnergy', passiveAbility(
    'Whenever this creature is healed, it also gets 1 energy.'));

// "Every time you attach energy to this creature, heal 10 / 20 HP."
AbilityRegistry.register('energizedHealing1', passiveAbility(
    'Whenever energy is attached to this creature, it heals 10 HP.'));
AbilityRegistry.register('energizedHealing2', passiveAbility(
    'Whenever energy is attached to this creature, it heals 20 HP.'));

// "This creature can't be damaged by Mechanic attacks, but it loses 20 hp."
// The 20 HP is lost at the end of each of its owner's turns (turn.js).
AbilityRegistry.register('metalicProtection', passiveAbility(
    'This creature cannot be damaged by Mechanic attacks, but it loses 20 HP at the end of each of your turns.'));

// "This creature takes 40 less damage from moves by Celestial and Mystic creatures."
AbilityRegistry.register('caprineGuard', passiveAbility(
    'This creature takes 40 less damage from moves by Celestial and Mystic creatures.'));

// "This creature takes 20 less damage from Wind and Mechanic-type creatures."
AbilityRegistry.register('elementalFortitude', passiveAbility(
    'This creature takes 20 less damage from Wind and Mechanic creatures.'));

// "This creature is not affected by status conditions."
AbilityRegistry.register('hydration', passiveAbility(
    'While this creature is active, it cannot get status conditions.'));

// "When damaged by an attack, it deals 20 damage back."
AbilityRegistry.register('retaliationStone', passiveAbility(
    'Whenever an attack damages this creature, it deals 20 damage back to the attacker.'));

// "Reflects any status condition back to the attacking creature."
AbilityRegistry.register('aquaMirror', passiveAbility(
    'While this creature is active, any status condition it gets is also given to the attacker.'));

// --- Activated (the card text is a choice) ------------------------------------

// "Once during your turn, you may attach an additional energy to a neutral creature."
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
        const type = rollEnergyType(ctx.side);
        const target = await ctx.chooseMyCreature({
            title: `Attach 1 extra ${type} energy to a Neutral creature`,
            filter: c => getCardType(c.card.data) === 'Neutral',
            aiPick: candidates => bestEnergyTarget(candidates, type)
        });
        if (target) await ctx.energy(target.card, 1, ctx.side, type);
    }
});

// "Deal 20 damage to any creature from your opponent." The user of the
// ability picks the target, so the AI chooses when the AI uses it.
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

// ===========================================================================
// TEMPORAL RIFT
// ===========================================================================

/** Noctivane, Zephyraun, Florvulpa, Rustarok: the creatures that evolve from Vulpetta. */
function isVulpettaEvolution(card) {
    return !!card && !!card.data && card.data.prevStage === 'Vulpetta';
}

function vulpettaEvolutions(side) {
    return creaturesInPlay(side).filter(isVulpettaEvolution);
}

/** Twist of Fate: true while any Aurorion's ability is in effect, on either side. */
function twistOfFateActive() {
    if (typeof gameState === 'undefined' || !gameState.player) return false;
    const on = SIDES.some(side => sideHasAbility(side, 'twistOfFate'));
    if (on) AbilityRegistry.noteTriggered('twistOfFate');
    return on;
}

// --- Always on ---------------------------------------------------------------

// "If this creature evolved this turn, draw a card." Fires as it evolves (actions.js).
AbilityRegistry.register('lookerFate', passiveAbility(
    'When a creature evolves into this one, you draw a card.'));

// "Your active creature takes 10 less damage for each Vulpetta evolution you have in play."
AbilityRegistry.register('foxyArmor', passiveAbility(
    'Your active creature takes 10 less damage for each Vulpetta evolution you have in play.'));

// "When your turn ends, you may search your deck for a card that evolves from
// Vulpetta and add it to your hand." Runs at the end of the owner's turn (turn.js).
AbilityRegistry.register('forestKin', passiveAbility(
    'At the end of your turn, you may take a card that evolves from Vulpetta from your deck into your hand.'));

// "This creature takes no damage from attacks that deal 50 or more damage."
AbilityRegistry.register('overloadGuard', passiveAbility(
    'Attacks that would deal this creature 50 or more damage deal it none.'));

// "Your active creature takes 20 less damage from creatures with an "A" / "E" in their name."
AbilityRegistry.register('techShieldA', passiveAbility(
    'Your active creature takes 20 less damage from creatures with an "A" in their name.'));
AbilityRegistry.register('techShieldE', passiveAbility(
    'Your active creature takes 20 less damage from creatures with an "E" in their name.'));

// "This creature takes half damage (rounded up) from attacks by creatures with
// fewer energy cards attached than it."
AbilityRegistry.register('stealthMode', passiveAbility(
    'This creature takes half damage (rounded up) from attacks by creatures with fewer energy attached than it.'));

// "All type weaknesses are reversed." (util.js isSuperEffective)
AbilityRegistry.register('twistOfFate', passiveAbility(
    'While this creature is in play, every type weakness is reversed, for both players.'));

// Temporal Rift promos. The "when knocked out" ones fire from knockout.js
// (knockoutAbilities), wherever the creature was and whatever knocked it out.
AbilityRegistry.register('graniteGuard', passiveAbility(
    'This creature takes 20 less damage from attacks, on the bench too.'));
AbilityRegistry.register('dozeGuard', passiveAbility(
    "Attacked while it has no damage, it flips a coin: heads, the attack deals it no damage (the move's other effects still happen)."));
AbilityRegistry.register('paperJam', passiveAbility(
    'When this creature is knocked out, your opponent discards the top 2 cards of their deck.'));
AbilityRegistry.register('cursedGaze', passiveAbility(
    "When this creature is knocked out, the opponent's active creature is affected by Lock."));
AbilityRegistry.register('umbrellaSnap', passiveAbility(
    "When this creature is knocked out, it deals 20 damage to the opponent's active creature."));
AbilityRegistry.register('stormCanopy', passiveAbility(
    "When this creature is knocked out, it deals 50 damage to the opponent's active creature and causes Hallucination."));

// --- Activated -----------------------------------------------------------------

// Noctonona — "Flip a coin for each card in your discard pile. Heal your active creature 10 HP per heads."
AbilityRegistry.register('middayHeal', {
    requires(ctx) {
        if (!ctx.me.discardPile.length) return { ok: false, reason: 'Your discard pile is empty.' };
        if (!ctx.me.active || ctx.me.active.damage <= 0) return { ok: false, reason: 'Your active creature has no damage to heal.' };
        return { ok: true };
    },
    async use(ctx) {
        const { heads } = await ctx.flipMany(ctx.me.discardPile.length, 'Midday Heal');
        if (heads) await ctx.heal(ctx.me.active, 10 * heads, { side: ctx.side });
        else await ctx.say('No heads: no healing.', { kind: 'info', pace: 0.5 });
    },
    aiWants: ctx => !!ctx.me.active && ctx.me.active.damage >= 20 && ctx.me.discardPile.length >= 2
});

// Solflare — "You may discard a card from your hand to heal this creature 40 HP."
AbilityRegistry.register('sunriseMend', {
    requires(ctx) {
        if (!ctx.me.hand.length) return { ok: false, reason: 'You have no card in your hand to discard.' };
        if (ctx.card.damage <= 0) return { ok: false, reason: `${ctx.card.data.name} has no damage to heal.` };
        return { ok: true };
    },
    async use(ctx) {
        const hand = ctx.me.hand.slice();
        const index = await ctx.chooseCard({
            cards: hand,
            title: `Sunrise Mend: discard which card to heal ${ctx.card.data.name} 40 HP?`,
            cancellable: true,
            cancelLabel: 'Cancel',
            // The card the AI least wants to keep.
            aiPick: cards => {
                let worst = 0;
                cards.forEach((c, i) => { if (handCardKeepScore(c) < handCardKeepScore(cards[worst])) worst = i; });
                return worst;
            }
        });
        if (index === null || index === undefined || !hand[index]) return;
        const card = hand[index];
        const at = ctx.me.hand.indexOf(card);
        if (at === -1) return;
        ctx.me.hand.splice(at, 1);
        ctx.me.discardPile.push(card);
        Render.all();
        await ctx.say(`${subject(ctx.side)} ${verb(ctx.side, 'discards', 'discard')} ${card.data.name}.`, { kind: 'ability', icon: '☀️', pace: 0.5 });
        await ctx.heal(ctx.card, 40, { side: ctx.side });
    },
    aiWants: ctx => ctx.card.damage >= 30 && ctx.me.hand.length >= 2
});

// "Once during your turn, you may move one energy from a Vulpetta evolution to another one."
AbilityRegistry.register('fastLink', {
    requires(ctx) {
        const line = vulpettaEvolutions(ctx.side);
        if (line.length < 2 || !line.some(c => c.energy > 0)) {
            return { ok: false, reason: 'Fast Link needs two Vulpetta evolutions in play, one with energy.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        const from = await ctx.chooseMyCreature({
            title: 'Move energy FROM which Vulpetta evolution?',
            filter: c => isVulpettaEvolution(c.card) && c.card.energy > 0,
            cancellable: true,
            aiPick: candidates => candidates.slice().sort((a, b) => b.card.energy - a.card.energy)[0]
        });
        if (!from) return;
        const to = await ctx.chooseMyCreature({
            title: 'Move energy TO which Vulpetta evolution?',
            filter: c => isVulpettaEvolution(c.card) && c.card !== from.card,
            cancellable: true,
            aiPick: candidates => candidates.find(c => c.location === 'active') || bestEnergyTarget(candidates)
        });
        if (!to) return;
        const moved = [];
        await ctx.unenergy(from.card, 1, ctx.side, moved);
        if (moved.length) await ctx.energy(to.card, 1, ctx.side, moved[0]);
    },
    // Worth it when it gets the active creature closer to a move.
    aiWants(ctx) {
        const active = ctx.me.active;
        if (!isVulpettaEvolution(active)) return false;
        return energyHelpScore(active, null) > 0 &&
            vulpettaEvolutions(ctx.side).some(c => c !== active && c.energy > 0);
    }
});

// "If active, choose a benched opponent creature and deal 10 damage per
// Vulpetta evolution you have in play."
AbilityRegistry.register('skyGrace', {
    requires(ctx) {
        if (benchCreatures(ctx.foe).length === 0) return { ok: false, reason: 'Your opponent has no benched creature.' };
        return { ok: true };
    },
    async use(ctx) {
        const amount = 10 * vulpettaEvolutions(ctx.side).length;
        const target = await ctx.chooseTheirCreature({
            title: `Deal ${amount} damage to one of your opponent's benched creatures`,
            filter: c => c.location === 'bench',
            aiPick: candidates => {
                const lethal = candidates.filter(c => remainingHp(c.card) <= amount);
                return lethal.length ? lethal[0] : mostHurt(candidates) || candidates[0];
            }
        });
        if (!target) return;
        await ctx.hit(target.card, amount, { side: ctx.foe, location: 'bench', reason: 'Sky Grace' });
        await resolveKnockouts();
    }
});

// "Once per turn, you may heal 20 HP of a creature, but this creature loses 30 HP."
AbilityRegistry.register('natureHarmony', {
    requires(ctx) {
        if (!creaturesInPlay(ctx.side).some(c => c !== ctx.card && c.damage > 0)) {
            return { ok: false, reason: 'No other damaged creature to heal.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        const target = await ctx.chooseMyCreature({
            title: 'Heal which creature 20 HP?',
            filter: c => c.card !== ctx.card && c.card.damage > 0,
            cancellable: true,
            aiPick: candidates => mostHurt(candidates)
        });
        if (!target) return;
        await ctx.heal(target.card, 20);
        await damageCreature(ctx.card, 30, { side: ctx.side, reason: 'Nature Harmony' });
        await resolveKnockouts();
    },
    // Only to rescue the active creature, and never when it would sink Solyssa.
    aiWants(ctx) {
        const active = ctx.me.active;
        return !!active && active !== ctx.card && active.damage >= 20 && remainingHp(ctx.card) > 50;
    }
});

// "Flip a coin. If heads, switch your opponent's active creature with one of
// their benched creatures." The opponent picks which one comes in.
AbilityRegistry.register('windSweep', {
    requires(ctx) {
        if (benchCreatures(ctx.foe).length === 0) return { ok: false, reason: 'Your opponent has no benched creature.' };
        return { ok: true };
    },
    async use(ctx) {
        const flip = await ctx.flip('Wind Sweep');
        if (flip !== 'heads') {
            await ctx.say('The wind dies down.', { kind: 'info', pace: 0.5 });
            return;
        }
        const choice = await ctx.chooseCreatureOf(ctx.foe, {
            title: 'Wind Sweep: choose your new active creature',
            filter: c => c.location === 'bench',
            aiPick: candidates => healthiestAttacker(candidates)
        });
        if (choice) await swapActiveWithBench(ctx.foe, choice.index, { free: true });
    },
    // Worth it when their active creature is the one to fear, or nearly ready to attack.
    aiWants(ctx) {
        const them = ctx.them.active;
        return !!them && usableMovesFor(them).length > 0;
    }
});

// "Once per turn, you may heal 50 HP of both active creatures."
AbilityRegistry.register('sharedBlessing', {
    requires(ctx) {
        if (!(ctx.me.active && ctx.me.active.damage > 0) && !(ctx.them.active && ctx.them.active.damage > 0)) {
            return { ok: false, reason: 'Neither active creature is damaged.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        if (ctx.me.active) await ctx.heal(ctx.me.active, 50, { side: ctx.side });
        if (ctx.them.active) await ctx.heal(ctx.them.active, 50, { side: ctx.foe });
    },
    // Only when it helps this side more than the other.
    aiWants(ctx) {
        const mine = ctx.me.active ? Math.min(50, ctx.me.active.damage) : 0;
        const theirs = ctx.them.active ? Math.min(50, ctx.them.active.damage) : 0;
        return mine >= 30 && mine > theirs;
    }
});

// "Allows you to change the type of this creature to any other type." It
// keeps the new type until it leaves play.
AbilityRegistry.register('elementalShift', {
    async use(ctx) {
        const current = getCardType(ctx.card.data);
        const options = CREATURE_TYPES.filter(t => t !== current);
        const type = await chooseOptionOf(ctx.side, {
            title: `Change ${ctx.card.data.name} to which type?`,
            options: options.map(t => ({ label: t, value: t })),
            cancellable: true,
            aiPick: () => bestShiftType(ctx)
        });
        if (!type) return;
        setCreatureType(ctx.card, type);
        await ctx.say(`${creatureName(ctx.card, ctx.side)} is now ${type} type.`, { kind: 'ability', icon: '🔄' });
    },
    aiWants(ctx) {
        const best = bestShiftType(ctx);
        return !!best && best !== getCardType(ctx.card.data);
    }
});

/** A creature changes type in play (Elemental Shift). Its printed card is unchanged. */
function setCreatureType(card, type) {
    card.data = Object.assign({}, card.data, { type });
    // An accessory for the old type falls off (items.js).
    if (typeof checkAccessoryFits === 'function') checkAccessoryFits(card);
}

/**
 * The AI's Elemental Shift choice: a type that beats the opposing active
 * creature, and otherwise one that stops it being beaten.
 */
function bestShiftType(ctx) {
    const card = ctx.card;
    const foe = ctx.them.active;
    if (!foe || ctx.me.active !== card) return null;
    const foeType = getCardType(foe.data);
    const current = getCardType(card.data);
    const beats = CREATURE_TYPES.find(t => t !== current && isSuperEffective(t, foeType));
    if (beats && !isSuperEffective(current, foeType)) return beats;
    if (isSuperEffective(foeType, current)) {
        return CREATURE_TYPES.find(t => t !== current && !isSuperEffective(foeType, t)) || null;
    }
    return null;
}

/** Moves a creature could pay for, as the AI sees it. */
function usableMovesFor(card) {
    return movesOf(card.data).filter(m => canPayMove(card, m));
}

// ===========================================================================
// CRYSTAL CANOPY
// ===========================================================================

// --- Always on ---------------------------------------------------------------

// Shadegeist. Fires from knockout.js, only for a knockout during the opponent's attack.
AbilityRegistry.register('mindTrap', passiveAbility(
    'If an attack knocks this creature out, flip a coin. Heads: the attacker gets Hallucination. Tails: it gets Hex.'));
// Tendrivale (damage.js).
AbilityRegistry.register('itemSurge', passiveAbility(
    "If your opponent used an item card on their last turn, this creature's attacks do 40 extra damage."));
// Corleon (turn.js, at the start of your turn).
AbilityRegistry.register('evoEcho', passiveAbility(
    'At the start of your turn, if your opponent evolved a creature on their last turn, this creature heals to full HP.'));
// Cryostralis (damage.js).
AbilityRegistry.register('chillEcho', passiveAbility(
    "While your opponent has 2 points, this creature's attacks deal double damage."));
// Sylgroth (damage.js).
AbilityRegistry.register('pressureWard', passiveAbility(
    "While your opponent's bench is full, this creature takes 40 less damage from attacks."));
// Crispisoy (turn.js rustTick).
AbilityRegistry.register('oxidizeSurge', passiveAbility(
    "While this creature is in play, Rust deals 30 damage to your opponent's creatures instead of 20."));
// Twistulip (damage.js).
AbilityRegistry.register('gearBoost', passiveAbility(
    'While this creature has an accessory attached, its attacks deal 20 more damage.'));
// Heliboo (damage.js).
AbilityRegistry.register('linkedArsenal', passiveAbility(
    'While this creature is in play, your creatures with an accessory attached deal 10 more damage with their attacks.'));
// Ignistone 10, Ashquake 20 (damage.js).
AbilityRegistry.register('armorSync10', passiveAbility(
    'While this creature has an accessory attached, it takes 10 less damage from attacks.'));
AbilityRegistry.register('armorSync20', passiveAbility(
    'While this creature has an accessory attached, it takes 20 less damage from attacks.'));

// --- Activated -----------------------------------------------------------------

/** Draws for an ability, with the log line. */
async function abilityDraw(ctx, n) {
    const drawn = drawCards(ctx.side, n);
    Render.all();
    await ctx.say(drawn
        ? `${subject(ctx.side)} ${verb(ctx.side, 'draws', 'draw')} ${drawn === 1 ? 'a card' : `${drawn} cards`}.`
        : `${possessive(ctx.side)} deck is empty.`, { kind: 'ability', icon: '🎴', pace: 0.6 });
}

// Elaroo — "Once per turn, if this creature has 30 HP or less left, you may draw a card."
AbilityRegistry.register('singlePeril', {
    requires(ctx) {
        if (remainingHp(ctx.card) > 30) return { ok: false, reason: `${ctx.card.data.name} needs 30 HP or less left.` };
        if (!ctx.me.deck.length) return { ok: false, reason: 'Your deck is empty.' };
        return { ok: true };
    },
    async use(ctx) { await abilityDraw(ctx, 1); }
});

// Arborctton — "Once per turn, if both active creatures have 50 HP or less left, you may draw 2 cards."
AbilityRegistry.register('mutualPeril', {
    requires(ctx) {
        const mine = ctx.me.active, theirs = ctx.them.active;
        if (!mine || !theirs || remainingHp(mine) > 50 || remainingHp(theirs) > 50) {
            return { ok: false, reason: 'Both active creatures need 50 HP or less left.' };
        }
        if (!ctx.me.deck.length) return { ok: false, reason: 'Your deck is empty.' };
        return { ok: true };
    },
    async use(ctx) { await abilityDraw(ctx, 2); }
});

// Spudrake — "Once per turn, if the opposing active creature has a status condition, you may flip a coin. If heads, draw a card."
AbilityRegistry.register('baggyFortune', {
    requires(ctx) {
        if (!Status.any(ctx.them.active)) return { ok: false, reason: "The opposing active creature has no status condition." };
        if (!ctx.me.deck.length) return { ok: false, reason: 'Your deck is empty.' };
        return { ok: true };
    },
    async use(ctx) {
        const flip = await ctx.flip('Baggy Fortune');
        if (flip === 'heads') await abilityDraw(ctx, 1);
        else await ctx.say('No card this time.', { kind: 'info', pace: 0.5 });
    }
});

// Swiftail — "Once per turn, if this creature is active, you may heal 20 HP from each benched creature. If you do, this creature takes 40 damage."
AbilityRegistry.register('sharedVitality', {
    requires(ctx) {
        if (!damagedCreatures(ctx.side).some(c => c !== ctx.card && ctx.me.bench.includes(c))) {
            return { ok: false, reason: 'No damaged benched creature to heal.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        for (const card of benchCreatures(ctx.side)) {
            if (card.damage > 0) await ctx.heal(card, 20, { side: ctx.side });
        }
        await damageCreature(ctx.card, 40, { side: ctx.side, location: 'active', reason: 'Shared Vitality' });
        await resolveKnockouts();
    },
    // Worth it when the bench gets back at least 40 HP and Swiftail can take the hit.
    aiWants(ctx) {
        const healed = damagedCreatures(ctx.side).filter(c => ctx.me.bench.includes(c))
            .reduce((sum, c) => sum + Math.min(20, c.damage), 0);
        return healed >= 40 && remainingHp(ctx.card) > 70;
    }
});

// --- Crystal Canopy promos ------------------------------------------------------

// Ghoulgourd (timing.js creatureCanRetreat).
AbilityRegistry.register('glacialWard', passiveAbility(
    "While this creature has full HP, an opposing active creature with a status condition can't retreat."));
// Sushimaru (combat.js reactivePlatingRust).
AbilityRegistry.register('wasabiCurse', passiveAbility(
    'When an attack damages this creature, the attacker is affected by Hex.'));
// Chargorb Electro and Chargorb Rusty (damage.js).
AbilityRegistry.register('jetstreamBoost', passiveAbility(
    "If you have Chargorb Rusty in play, this creature's attacks deal 20 extra damage."));
AbilityRegistry.register('ironGuard', passiveAbility(
    'If you have Chargorb Electro in play, this creature takes 10 less damage from attacks.'));

// Barystellar — "Once per turn, if your bench is full, you may swap a random
// hand card for a random Stage 2 from your deck." The hand card goes into the
// deck, which is then shuffled.
AbilityRegistry.register('cosmicDrift', {
    requires(ctx) {
        if (benchCreatures(ctx.side).length < BENCH_SIZE) return { ok: false, reason: 'Cosmic Drift needs a full bench.' };
        if (!ctx.me.hand.length) return { ok: false, reason: 'You have no card in your hand.' };
        if (!ctx.me.deck.some(id => (getCardData(id) || {}).stage === 'Stage 2')) return { ok: false, reason: 'No Stage 2 creature left in your deck.' };
        return { ok: true };
    },
    async use(ctx) {
        const s = ctx.me;
        const spots = [];
        s.deck.forEach((id, i) => { if ((getCardData(id) || {}).stage === 'Stage 2') spots.push(i); });
        const [stage2] = s.deck.splice(Rng.pick(spots), 1);
        const out = s.hand.splice(Rng.int(s.hand.length), 1)[0];
        returnToDeck(ctx.side, [out]);
        Rng.shuffle(s.deck);
        s.hand.push(instanceFromDeck(ctx.side, stage2));
        Render.all();
        await ctx.say(ctx.side === 'player'
            ? `Cosmic Drift: ${out.data.name} goes into your deck, ${getCardData(stage2).name} comes to your hand.`
            : `Cosmic Drift: ${subject(ctx.side)} swaps a hand card for a Stage 2 from the deck.`, { kind: 'ability', icon: '🌌', pace: 0.6 });
    },
    // With a full bench, a Stage 1 in hand can't be played: worth swapping.
    aiWants: ctx => ctx.me.hand.some(c => c.data.stage === 'Stage 1' ||
        (isItem(c.data) && !ItemRegistry.canUse(c, ctx.side).ok && c.data.itemEffect !== 'handRecycle'))
});

// ===========================================================================
// MYTHICAL CARDS
// ===========================================================================

// Astralyon (heal.js healBlockedBy).
AbilityRegistry.register('silentAura', passiveAbility(
    "While this creature is active, your opponent's creatures can't be healed."));
// Chromarion (util.js retreatCost).
AbilityRegistry.register('staticHold', passiveAbility(
    "While this creature is active, your opponent's retreats cost 2 more energy."));

/**
 * Aetherave's Psych On: the opposing creatures' abilities it could use now, as
 * this creature. Only abilities you activate (always-on ones have nothing to
 * use), not bench-only ones, and only those whose conditions it meets.
 */
function psychOnChoices(ctx) {
    const seen = new Set();
    const out = [];
    for (const c of creaturesInPlay(ctx.foe)) {
        const id = c.data.abilityEffect;
        const def = id && AbilityRegistry.get(id);
        if (!def || def.passive || id === 'psychOn' || seen.has(id) || c.data.abilityLocation === 'bench') continue;
        const borrowed = makeAbilityContext(ctx.card, ctx.side, 'active');
        borrowed.ability = id;
        if (def.requires && !def.requires(borrowed).ok) continue;
        seen.add(id);
        out.push({ id, def, name: c.data.abilityName, from: c.data.name, ctx: borrowed });
    }
    return out;
}

// Aetherave — "Once per turn, while active, you may use an ability of one of your opponent's creatures."
AbilityRegistry.register('psychOn', {
    requires(ctx) {
        if (!psychOnChoices(ctx).length) return { ok: false, reason: "None of your opponent's abilities can be used right now." };
        return { ok: true };
    },
    async use(ctx) {
        const choices = psychOnChoices(ctx);
        const id = await chooseOptionOf(ctx.side, {
            title: 'Psych On: use which ability?',
            options: choices.map(c => ({ label: `${c.name} (${c.from})`, value: c.id })),
            cancellable: true,
            aiPick: () => (choices.find(c => !c.def.aiWants || c.def.aiWants(c.ctx)) || choices[0]).id
        });
        const pick = choices.find(c => c.id === id);
        if (!pick) return;
        await ctx.say(`${creatureName(ctx.card, ctx.side)} copies ${pick.name}!`, { kind: 'ability', icon: '🌀', pace: 0.6 });
        await pick.def.use(pick.ctx);
    },
    aiWants: ctx => psychOnChoices(ctx).some(c => !c.def.aiWants || c.def.aiWants(c.ctx))
});
