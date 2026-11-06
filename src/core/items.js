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
