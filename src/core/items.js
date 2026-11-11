// ============================================================================
// ITEM REGISTRY
//
// Keyed by `itemEffect` on the card, not by display name. The original
// dispatched on `card.data.name` through a 14-branch if/else for the player and
// an entirely separate 340-line sequence for the AI, so adding an item meant
// editing three places and the two paths had already diverged.
//
// A reprint in a future set just carries the same itemEffect id and works.
//
// Each entry may define:
//   requires(ctx) -> {ok, reason}   a legal target must exist
//   use(ctx) -> boolean|undefined   return false to abort without spending it
//   aiWants(ctx) -> boolean
//   endsTurn: true                  Mystic Scroll
// ============================================================================

const ItemRegistry = {
    items: new Map(),

    register(id, definition) {
        if (this.items.has(id)) {
            console.error(`[Items] duplicate registration for "${id}"`);
        }
        this.items.set(id, Object.assign({ id }, definition));
    },

    get(id) {
        return id ? this.items.get(id) || null : null;
    },

    has(id) {
        return this.items.has(id);
    },

    ids() {
        return Array.from(this.items.keys());
    },

    /**
     * Shared legality: the turn's item slot, Mirage Shield, and the item's own
     * target requirement. An item with no legal target cannot be played and
     * does not waste the turn's item action.
     */
    canUse(card, side) {
        if (!card || !isItem(card.data)) return { ok: false, reason: 'Not an item.' };

        const base = sideCanUseItem(side);
        if (!base.ok) return base;

        const def = this.get(card.data.itemEffect);
        if (!def) {
            return { ok: false, reason: `Item "${card.data.itemEffect}" is not implemented.` };
        }
        if (def.requires) {
            return def.requires(makeItemContext(card, side, -1));
        }
        return { ok: true };
    },

    /** Plays an item from hand. */
    async use(card, side, handIndex) {
        const check = this.canUse(card, side);
        if (!check.ok) {
            Log.warn(check.reason);
            return false;
        }

        const s = gameState[side];
        const def = this.get(card.data.itemEffect);
        const ctx = makeItemContext(card, side, handIndex);

        // Items are shown in the middle of the screen for both sides.
        await showcaseCard(side, card.id, {
            label: `${subject(side)} ${verb(side, 'uses', 'use')} ${card.data.name}`,
            target: { discard: side }
        });

        await Log.say(
            `${subject(side)} ${verb(side, 'plays', 'play')} ${card.data.name}.`,
            { kind: 'item', icon: '🎴', side }
        );

        // Lock: flip a coin; on tails the card is not spent but the turn's item
        // action is, so it cannot simply be retried.
        if (Status.has(s.active, 'lock')) {
            await Log.say(
                `${creatureName(s.active, side)} is Locked — flipping for the item.`,
                { kind: 'status', icon: '🔒' }
            );
            const flip = Rng.flip();
            await Log.coin(flip, 'Lock check');
            if (flip === 'tails') {
                s.itemUsedThisTurn = true;
                Render.all();
                await Log.say(`${card.data.name} slips back into hand, unused.`,
                    { kind: 'status', icon: '🔒' });
                return false;
            }
        }

        const result = await def.use(ctx);
        if (result === false) {
            // The player backed out; nothing is spent.
            Render.all();
            return false;
        }

        // Spend it.
        const index = s.hand.indexOf(card);
        if (index !== -1) s.hand.splice(index, 1);
        s.discardPile.push(card);
        s.itemUsedThisTurn = true;
        s.flags.usedItemOnTurn = gameState.turnNumber;
        trackPlayed(side, card.id);

        Render.all();

        // Energy Siphon (always on): each opposing Lumbertail gets 1 energy
        // whenever this side uses an item.
        const foe = foeOf(side);
        for (const siphon of creaturesWithAbility(foe, 'energySiphon')) {
            AbilityRegistry.noteTriggered('energySiphon');
            await Log.say(`${creatureName(siphon, foe)}'s Energy Siphon draws power from the item!`,
                { kind: 'ability', icon: '⚡', pace: 0.6 });
            await attachEnergyTo(siphon, 1, { side: foe });
        }

        if (def.endsTurn) {
            await Log.say(`${possessive(side)} turn ends.`, { kind: 'info', pace: 0.6 });
            s.hasAttacked = true;
        }
        return true;
    },

    /** Would the AI play this item now? */
    aiWants(card, side) {
        const def = this.get(card.data.itemEffect);
        if (!def) return false;
        if (!this.canUse(card, side).ok) return false;
        if (!def.aiWants) return true;
        return def.aiWants(makeItemContext(card, side, -1));
    }
};

function makeItemContext(card, side, handIndex) {
    return makeContext(side, { card, handIndex, item: card.data.itemEffect });
}

/** Shared requirement: this side has at least one damaged creature. */
function requiresDamagedCreature(typeFilter) {
    return ctx => {
        if (damagedCreatures(ctx.side, typeFilter).length === 0) {
            const label = typeFilter ? `${typeFilter} creature` : 'creature';
            return { ok: false, reason: `No damaged ${label} to heal.` };
        }
        return { ok: true };
    };
}

// ===========================================================================
// ELEMENTAL AWAKENING
// ===========================================================================

ItemRegistry.register('potion', {
    requires: requiresDamagedCreature(),
    async use(ctx) {
        const target = await ctx.chooseMyCreature({
            title: 'Heal a creature 20 HP',
            filter: c => c.card.damage > 0,
            aiPick: candidates => mostHurt(candidates)
        });
        if (!target) return false;
        await ctx.heal(target.card, 20);
    },
    aiWants: ctx => !!ctx.me.active && ctx.me.active.damage > 0
});

ItemRegistry.register('cardDraw', {
    requires(ctx) {
        if (ctx.me.deck.length === 0) {
            return { ok: false, reason: 'The deck is empty.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        const drawn = drawCards(ctx.side, 2);
        await ctx.say(`${subject(ctx.side)} ${verb(ctx.side, 'draws', 'draw')} ${drawn} card(s).`,
            { kind: 'item', icon: '🎴' });
    }
});

ItemRegistry.register('booster', {
    async use(ctx) {
        ctx.me.flags.booster = true;
        await ctx.say(`${possessive(ctx.side)} next attack deals +20 damage.`,
            { kind: 'item', icon: '⬆️' });
    },
    // Pointless unless it can actually attack this turn.
    aiWants: ctx => sideWillAttackThisTurn(ctx.side)
});

ItemRegistry.register('powerUp', {
    async use(ctx) {
        ctx.me.flags.powerUpAttacks = 3;
        await ctx.say(`${possessive(ctx.side)} next 3 attacks deal +10 damage.`,
            { kind: 'item', icon: '⬆️' });
    },
    aiWants: ctx => ctx.me.flags.powerUpAttacks === 0 && sideWillAttackThisTurn(ctx.side)
});

ItemRegistry.register('remedy', {
    requires(ctx) {
        if (!Status.any(ctx.me.active)) {
            return { ok: false, reason: 'Your active creature has no condition to cure.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        await Status.clear(ctx.me.active, { side: ctx.side });
    }
});

// ===========================================================================
// GALACTIC ADVENTURES
// ===========================================================================

ItemRegistry.register('energyAntenna', {
    requires(ctx) {
        const mechanics = creaturesInPlay(ctx.side)
            .filter(c => getCardType(c.data) === 'Mechanic');
        if (mechanics.length === 0) {
            return { ok: false, reason: 'No Mechanic creature in play.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        const type = rollEnergyType(ctx.side);
        const target = await ctx.chooseMyCreature({
            title: `Attach 1 ${type} energy to a Mechanic creature`,
            filter: c => getCardType(c.card.data) === 'Mechanic',
            aiPick: candidates => bestEnergyTarget(candidates, type)
        });
        if (!target) return false;
        await ctx.energy(target.card, 1, ctx.side, type);
    }
});

ItemRegistry.register('reviveCrystal', {
    requires(ctx) {
        if (ctx.me.discardPile.filter(c => isCreature(c.data)).length === 0) {
            return { ok: false, reason: 'No creature in your discard pile.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        const creatures = ctx.me.discardPile.filter(c => isCreature(c.data));
        const index = await ctx.chooseCard({
            cards: creatures,
            title: 'Return a creature to your hand',
            aiPick: cards => {
                // Prefer the beefiest Stage 1, since only Stage 1 can be played
                // straight to the bench.
                const playable = cards.filter(c => c.data.stage === 'Stage 1');
                const pool = playable.length ? playable : cards;
                const best = pool.slice().sort((a, b) => b.data.hp - a.data.hp)[0];
                return cards.indexOf(best);
            }
        });
        if (index === null) return false;

        const revived = creatures[index];
        ctx.me.discardPile.splice(ctx.me.discardPile.indexOf(revived), 1);
        resetCardInstance(revived);
        revived.evolutionChain = [];
        revived.evolutionId = newEvolutionId();
        ctx.me.hand.push(revived);

        await ctx.say(`${revived.data.name} returns to hand, fully restored.`,
            { kind: 'item', icon: '💠' });
    }
});

ItemRegistry.register('shieldBarrier', {
    requires(ctx) {
        if (!ctx.me.active) return { ok: false, reason: 'No active creature.' };
        return { ok: true };
    },
    async use(ctx) {
        grantSideShield(ctx.side, 'shieldBarrier', 20);
        await ctx.say(`${possessive(ctx.side)} creatures take 20 less damage next turn.`,
            { kind: 'item', icon: '🛡️' });
    }
});

ItemRegistry.register('auraCrystal', {
    requires: requiresDamagedCreature(),
    async use(ctx) {
        const damaged = damagedCreatures(ctx.side);
        await ctx.say(`Aura Crystal heals ${damaged.length} creature(s) for 10.`,
            { kind: 'item', icon: '💚' });
        for (const card of damaged) {
            await ctx.heal(card, 10, { silent: true });
        }
        Render.board();
    },
    aiWants: ctx => damagedCreatures(ctx.side).length >= 2
});

ItemRegistry.register('healingCrystal', {
    requires: requiresDamagedCreature('Celestial'),
    async use(ctx) {
        const target = await ctx.chooseMyCreature({
            title: 'Heal a Celestial creature 40 HP',
            filter: c => getCardType(c.card.data) === 'Celestial' && c.card.damage > 0,
            aiPick: candidates => mostHurt(candidates)
        });
        if (!target) return false;
        await ctx.heal(target.card, 40);
    }
});

ItemRegistry.register('disruptor', {
    requires(ctx) {
        if (ctx.them.hand.length === 0) {
            return { ok: false, reason: 'The opponent has no cards in hand.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        const size = ctx.them.hand.length;
        returnToDeck(ctx.foe, ctx.them.hand);
        ctx.them.hand = [];
        Rng.shuffle(ctx.them.deck);

        const target = Math.max(0, size - 1);
        const drawn = drawCards(ctx.foe, target);
        await ctx.say(
            `${subject(ctx.foe)} shuffled ${size} card(s) away and drew ${drawn}.`,
            { kind: 'item', icon: '🌀' }
        );
    },
    aiWants: ctx => ctx.them.hand.length >= 3
});

ItemRegistry.register('amulet', {
    async use(ctx) {
        ctx.me.flags.amuletUntil = Timing.myTurns(2);
        await ctx.say(
            `${possessive(ctx.side)} Neutral creatures deal +20 damage for 2 turns.`,
            { kind: 'item', icon: '⬆️' }
        );
    },
    aiWants(ctx) {
        if (Timing.active(ctx.me.flags.amuletUntil)) return false;
        return creaturesInPlay(ctx.side).some(c => getCardType(c.data) === 'Neutral');
    }
});

ItemRegistry.register('galeShield', {
    async use(ctx) {
        grantSideShield(ctx.side, 'galeShield', 30);
        await ctx.say(
            `${possessive(ctx.side)} Wind creatures take 30 less damage next turn.`,
            { kind: 'item', icon: '🛡️' }
        );
    },
    aiWants: ctx => creaturesInPlay(ctx.side).some(c => getCardType(c.data) === 'Wind')
});

// Searches the DECK, which holds card ids. The original filtered the deck as if
// it held card instances, so this item always failed and wasted the turn.
ItemRegistry.register('mysticScroll', {
    endsTurn: true,
    requires(ctx) {
        if (findMysticStage1InDeck(ctx.side) === -1) {
            return { ok: false, reason: 'No Mystic Stage 1 creature left in your deck.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        const deckIndex = findMysticStage1InDeck(ctx.side);
        if (deckIndex === -1) return false;

        const cardId = ctx.me.deck[deckIndex];
        ctx.me.deck.splice(deckIndex, 1);
        const drawn = instanceFromDeck(ctx.side, cardId);
        ctx.me.hand.push(drawn);

        await ctx.say(`${subject(ctx.side)} searched out ${drawn.data.name}.`,
            { kind: 'item', icon: '📜' });
    }
});

function findMysticStage1InDeck(side) {
    return gameState[side].deck.findIndex(cardId => {
        const data = getCardData(cardId);
        return data && data.stage === 'Stage 1' && getCardType(data) === 'Mystic';
    });
}

// ===========================================================================
// ACCESSORIES (Temporal Rift)
//
// An accessory card is attached from the hand to one of your creatures of the
// accessory's type: at most one accessory per creature, one accessory per
// turn (separate from the item card), and none while the opponent's Cryo Roar
// or Alloy Clutch is in effect. Lock and Mirage Shield name items, so they
// don't stop accessories.
//
// It stays on through retreats and through an evolution into a creature of
// the same type. Evolving (or Elemental Shift) into another type discards it,
// and it goes to the discard pile with the creature when it is knocked out.
//
// Each entry may define:
//   hpBonus, attackBonus, retreatReduction         read by util.js / damage.js
//   onTurnStart(card, side)                         Celestial Armor
//   activate: { label, use(card, side) }            Neutral Elixir's button
// Damage reductions live in the damage table (damage.js), like every shield.
// ===========================================================================

const AccessoryRegistry = {
    accessories: new Map(),
    used: new Map(),          // coverage counts for the test page

    register(id, definition) {
        if (this.accessories.has(id)) console.error(`[Accessories] duplicate registration for "${id}"`);
        this.accessories.set(id, Object.assign({ id }, definition));
    },
    get(id) { return id ? this.accessories.get(id) || null : null; },
    has(id) { return this.accessories.has(id); },
    ids() { return Array.from(this.accessories.keys()); },
    note(id) { this.used.set(id, (this.used.get(id) || 0) + 1); },

    /** Can this side attach an accessory at all this turn? */
    sideCanAttach(side) {
        const s = gameState[side];
        if (gameState.phase !== 'playing') return { ok: false, reason: 'Not in play.' };
        if (gameState.currentTurn !== side) return { ok: false, reason: 'Not your turn.' };
        if (s.hasAttacked) return { ok: false, reason: 'You have already attacked this turn.' };
        if (s.accessoryUsedThisTurn) return { ok: false, reason: 'Only one accessory card per turn.' };
        if (Timing.active(s.flags.cantUseAccessoriesUntil)) {
            return { ok: false, reason: "You can't use accessory cards this turn." };
        }
        return { ok: true };
    },

    /** The creatures this accessory could go on. */
    targets(card, side) {
        return boardCandidates(side, c => !c.card.accessory && accessoryFits(card.data, c.card));
    },

    canUse(card, side) {
        if (!card || !isAccessory(card.data)) return { ok: false, reason: 'Not an accessory.' };
        const base = this.sideCanAttach(side);
        if (!base.ok) return base;
        if (!this.get(card.data.accessoryEffect)) {
            return { ok: false, reason: `Accessory "${card.data.accessoryEffect}" is not implemented.` };
        }
        if (this.targets(card, side).length === 0) {
            return { ok: false, reason: `${card.data.name} needs one of your ${card.data.accessoryType} creatures without an accessory.` };
        }
        return { ok: true };
    },

    /** Attaches an accessory from hand to `target` (a board candidate, or chosen here). */
    async attach(card, side, target = null) {
        const check = this.canUse(card, side);
        if (!check.ok) { Log.warn(check.reason); return false; }
        if (!target) {
            target = await chooseCreatureOf(side, {
                title: `Attach ${card.data.name} to which creature?`,
                filter: c => !c.card.accessory && accessoryFits(card.data, c.card),
                cancellable: side === 'player',
                aiPick: candidates => aiAccessoryTarget(card, candidates)
            });
        }
        if (!target || target.card.accessory || !accessoryFits(card.data, target.card)) return false;

        const s = gameState[side];
        const index = s.hand.indexOf(card);
        if (index === -1) return false;

        await showcaseCard(side, card.id, {
            label: `${subject(side)} ${verb(side, 'attaches', 'attach')} ${card.data.name}`,
            target: { side, location: target.location, index: target.index }
        });
        s.hand.splice(index, 1);
        target.card.accessory = card;
        s.accessoryUsedThisTurn = true;
        trackPlayed(side, card.id);
        this.note(card.data.accessoryEffect);
        Render.all();
        await Log.say(`${subject(side)} ${verb(side, 'attaches', 'attach')} ${card.data.name} to ${target.card.data.name}.`,
            { kind: 'item', icon: '🧿', side });
        return true;
    },

    /** The accessory's own button on the creature (Neutral Elixir). */
    activation(creature) {
        const def = creature && creature.accessory && this.get(creature.accessory.data.accessoryEffect);
        return def && def.activate ? def.activate : null;
    },

    canActivate(creature, side) {
        const act = this.activation(creature);
        if (!act) return { ok: false, reason: 'Nothing to activate.' };
        if (gameState.phase !== 'playing' || gameState.currentTurn !== side) return { ok: false, reason: 'Not your turn.' };
        if (gameState[side].hasAttacked) return { ok: false, reason: 'You have already attacked this turn.' };
        return act.requires ? act.requires(creature, side) : { ok: true };
    },

    async activate(creature, side) {
        const check = this.canActivate(creature, side);
        if (!check.ok) { Log.warn(check.reason); return false; }
        const act = this.activation(creature);
        this.note(creature.accessory.data.accessoryEffect);
        await act.use(creature, side);
        Render.all();
        return true;
    }
};

/** Does accessory card data `acc` fit this creature (by its current type)? */
function accessoryFits(acc, creature) {
    return !!acc && !!creature && isCreature(creature.data) && getCardType(creature.data) === acc.accessoryType;
}

/** The creature wears an accessory with this effect id. */
function accessoryOn(card, effectId) {
    return !!card && !!card.accessory && card.accessory.data.accessoryEffect === effectId;
}

function accessoryDef(card) {
    return card && card.accessory ? AccessoryRegistry.get(card.accessory.data.accessoryEffect) : null;
}

/** Read by util.js maxHp(). */
function accessoryHpBonus(card) {
    const def = accessoryDef(card);
    return def && def.hpBonus ? def.hpBonus : 0;
}

/** Read by util.js retreatCost(). */
function accessoryRetreatReduction(card) {
    const def = accessoryDef(card);
    return def && def.retreatReduction ? def.retreatReduction : 0;
}

/** Puts a creature's accessory in its owner's discard pile. */
function discardAccessory(card, side, reason) {
    if (!card || !card.accessory) return null;
    const acc = card.accessory;
    card.accessory = null;
    const owner = side || (locateCard(card) || {}).side;
    if (owner) gameState[owner].discardPile.push(acc);
    if (reason) Log.write(`${acc.data.name} falls off ${card.data.name} (${reason}).`, { kind: 'item', icon: '🧿' });
    return acc;
}

/** After a type change: an accessory for another type is discarded. */
function checkAccessoryFits(card, side) {
    if (card && card.accessory && !accessoryFits(card.accessory.data, card)) {
        discardAccessory(card, side, `${card.data.name} is no longer ${card.accessory.data.accessoryType}`);
    }
}

/** Start of a side's turn: Celestial Armor heals its creature. */
async function accessoriesOnTurnStart(side) {
    for (const card of creaturesInPlay(side)) {
        const def = accessoryDef(card);
        if (def && def.onTurnStart) await def.onTurnStart(card, side);
    }
}

/** Which creature the AI puts an accessory on. */
function aiAccessoryTarget(acc, candidates) {
    const score = entry => {
        const c = entry.card;
        let s = remainingHp(c) + (entry.location === 'active' ? 40 : 0);
        if (acc.accessoryEffect === 'windFeather') s += retreatCost(c) * 25;
        if (acc.accessoryEffect === 'mechanicToolkit' && c.data.abilityEffect) s += 60;
        if (acc.accessoryEffect === 'mysticAmulet') s += movesOf(c.data).some(m => canPayMove(c, m)) ? 30 : 0;
        return s;
    };
    return candidates.slice().sort((a, b) => score(b) - score(a))[0] || null;
}

// "Attach to a Mystic creature. This creature gains 10 extra HP and its attacks deal 10 additional damage."
AccessoryRegistry.register('mysticAmulet', { hpBonus: 10 });

// "Attach to a Wind creature. This creature's retreat cost is reduced by one Energy."
AccessoryRegistry.register('windFeather', { retreatReduction: 1 });

// "Attach to a Celestial creature. This creature takes 10 less damage from
// attacks and heals 10 HP at the start of each turn." (each of its owner's turns)
AccessoryRegistry.register('celestialArmor', {
    async onTurnStart(card, side) {
        if (card.damage <= 0) return;
        AccessoryRegistry.note('celestialArmor');
        await Log.say(`${creatureName(card, side)}'s Celestial Armor glows.`, { kind: 'heal', icon: '🧿', pace: 0.5 });
        await healCreature(card, 10, { side });
    }
});

// "Attach to a Mechanic creature. If this creature has an ability, it takes 20
// less damage from attacks."
AccessoryRegistry.register('mechanicToolkit', {});

// "Attach to a Neutral creature. You can move it to your hand, recovering all
// its HP. Discard this card if you do." The creature (with its earlier stages)
// goes back to the hand fully healed; its energy and the Elixir are discarded.
AccessoryRegistry.register('neutralElixir', {
    activate: {
        label: 'Use Neutral Elixir',
        requires(card, side) {
            const s = gameState[side];
            if (s.active === card && benchCreatures(side).length === 0) {
                return { ok: false, reason: 'You need a bench creature to take its place.' };
            }
            return { ok: true };
        },
        async use(card, side) {
            const s = gameState[side];
            const wasActive = s.active === card;
            const elixir = discardAccessory(card, side);
            const name = card.data.name;
            // The whole evolution line returns to the hand, every card fresh.
            const line = (card.evolutionChain || []).map(e => {
                const inst = makeCardInstance(e.id);
                inst.fullArt = !!e.fullArt;
                return inst;
            });
            await Status.clear(card, { silent: true });
            const energyTotal = card.energy;
            if (wasActive) s.active = null;
            else s.bench[s.bench.indexOf(card)] = null;
            resetCardInstance(card);
            card.evolutionChain = [];
            card.evolutionId = newEvolutionId();
            s.hand.push(...line, card);
            Render.all();
            await Log.say(
                `${subject(side)} ${verb(side, 'uses', 'use')} ${elixir ? elixir.data.name : 'Neutral Elixir'}: ` +
                `${name} returns to the hand, fully healed` + (energyTotal ? ` (${energyTotal} energy discarded).` : '.'),
                { kind: 'heal', icon: '🧪', side });
            if (wasActive) await promoteFromBench(side);
        }
    }
});

/** Should the AI pull this creature back to its hand with Neutral Elixir? */
function aiWantsElixir(card, side) {
    if (!accessoryOn(card, 'neutralElixir')) return false;
    if (!AccessoryRegistry.canActivate(card, side).ok) return false;
    const s = gameState[side];
    const hurt = remainingHp(card) <= Math.max(30, maxHp(card) * 0.35);
    // A creature about to be knocked out: saving it denies the opponent a point.
    return hurt && (s.active !== card || benchCreatures(side).length > 0);
}
