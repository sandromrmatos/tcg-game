// ============================================================================
// AUTO-GENERATED TEAMS
//
// A random 20-card deck for the PLAYER, built the way the raid and daily
// challenge AI decks are (Raids._tryBuild): one main type plus Neutral, whole
// evolution lines with 2 of every stage, the stronger lines from the family
// tests picked more often, then Card Draw, the type's own item and the proven
// items. On top of that it only uses cards the player owns:
//
//   * never more copies of a card than the player has (normal + full art),
//   * full-art copies first, whenever the player owns them,
//   * only sets the player has unlocked,
//   * a daily challenge's rules when it is built for one (per-card rules filter
//     the pool, deck rules such as "at most 3 items" or "1 copy of each card"
//     shape it, and the finished deck must pass Daily.violations' checks).
//
// Used by the Play page, the raid bosses and the daily challenges (screens.js).
// ============================================================================

const AutoTeam = {
    _units: null,

    /** Usable copies of a card: normal plus full art, at most 2 in a deck. */
    copies(cardId) {
        if (typeof Profile === 'undefined' || !Profile.s) return 0;
        return Math.min(MAX_COPIES, Profile.owned(cardId) + Profile.ownedFullArt(cardId));
    },

    /**
     * Every evolution line as a buildable unit. A line that branches (Vulpetta
     * into four creatures) is one unit per branch, so a player who owns one
     * branch can still use it. A branch counts as the type of its last stage.
     */
    units() {
        if (this._units) return this._units;
        const seen = new Set();
        const out = [];
        for (const card of cardDatabase) {
            if (!isCreature(card) || seen.has(card.id)) continue;
            const line = raidLineOf(card);
            for (const c of line) seen.add(c.id);
            const branching = line.some(c => (c.nextStageIds || []).length > 1);
            const paths = branching
                ? line.filter(c => !(c.nextStageIds || []).length).map(leaf => {
                    const path = [leaf];
                    for (let cur = leaf; cur.prevStageIds && cur.prevStageIds.length;) {
                        cur = getCardData(cur.prevStageIds[0]);
                        if (!cur || path.includes(cur)) break;
                        path.unshift(cur);
                    }
                    return path;
                })
                : [line];
            for (const path of paths) {
                const score = Math.max(0, ...path.map(c => RAID_STRONG_CARDS[c.id] || 0));
                out.push({
                    ids: path.map(c => c.id),
                    type: getCardType(branching ? path[path.length - 1] : path[0]),
                    energy: new Set(path.flatMap(c => [...energyTypesUsedBy(c)])),
                    strong: score > 0,
                    score
                });
            }
        }
        this._units = out;
        return out;
    },

    /**
     * Builds a team.
     * @param {object} [o] { restrictions: a daily mode's rules ([] = none), rng }
     * @returns {{name, type, cards, energyTypes, fullArt, mainType}|null}
     */
    build({ restrictions = [], rng = Rng } = {}) {
        if (typeof Profile === 'undefined' || !Profile.s) return null;
        const rules = (restrictions || []).map(r => ({ r, def: DAILY_RESTRICTIONS[r.id] })).filter(x => x.def);
        const allowed = card => !!card && Profile.isSetUnlocked(card.set) &&
            rules.every(({ r, def }) => !def.allows || def.allows(r, card));
        const shape = {
            allowed,
            per: rules.some(x => x.r.id === 'singleton') ? 1 : MAX_COPIES,
            single: rules.some(x => x.r.id === 'singleton'),
            itemCap: rules.some(x => x.r.id === 'noItems') ? 0
                : rules.some(x => x.r.id === 'maxItems') ? DAILY_MAX_ITEMS : Infinity,
            deckOk: ids => rules.every(({ r, def }) => !def.deckCheck || !def.deckCheck(r, ids)),
            rng,
            // Extreme challenges name a card the deck must include: it goes in first.
            must: (rules.find(x => x.r.id === 'mustInclude') || { r: {} }).r.cardId || null
        };
        // Rules that ask for a number of certain cards make those cards likelier picks.
        const twoMin = rules.find(x => x.r.id === 'twoMovesMin');
        const rarity = rules.find(x => x.r.id === 'minRarity');
        shape.prefer = id => {
            const d = getCardData(id);
            return !!d && ((twoMin && dailyTwoMoves(d)) || (rarity && d.rarity === rarity.r.rarity));
        };

        // Units the player can field: every stage allowed and owned twice
        // (once under "1 copy of each card"); a single creature needs 1 copy.
        // The last, loose pass also takes lines it only has 1 copy of a stage of.
        const fieldable = loose => this.units().filter(u => u.ids.every(id =>
            allowed(getCardData(id)) && this.copies(id) >= (u.ids.length === 1 || loose ? 1 : shape.per)));
        const usable = fieldable(false);
        const anyUsable = fieldable(true);
        if (!anyUsable.length) return null;

        // Extreme: the must-include card. A creature brings its unit; when the
        // rules forbid (or the player lacks) a later stage, the line is cut to
        // end at that card. Its type, or the type an item/accessory needs,
        // becomes the main type of the typed passes.
        const mustCard = shape.must ? getCardData(shape.must) : null;
        let mustUnit = null, mustType = null;
        if (mustCard && isCreature(mustCard)) {
            const find = list => list.find(u => u.ids.includes(shape.must));
            mustUnit = find(usable) || find(anyUsable) || this._cutUnit(mustCard, allowed);
            if (!mustUnit) return null;
            mustType = mustUnit.type;
        } else if (mustCard) {
            mustType = TYPE_SPECIFIC_ITEMS[mustCard.itemEffect] ||
                (isAccessory(mustCard) && mustCard.accessoryType !== 'Any' ? mustCard.accessoryType : null);
        }

        // Like the AI decks: one main type (stronger types more often), then
        // looser passes, and last a mix of types for a small collection.
        const fits = (u, mainType) => mainType === 'Neutral'
            ? u.type === 'Neutral' && [...u.energy].length === 0
            : (u.type === mainType || u.type === 'Neutral') && [...u.energy].every(t => t === mainType);
        const types = CREATURE_TYPES.filter(t => usable.some(u => u.type === t && fits(u, t)));
        const pickType = () => {
            const total = types.reduce((sum, t) => sum + (RAID_TYPE_WEIGHTS[t] || 1), 0);
            let roll = rng.float() * total;
            for (const t of types) if ((roll -= RAID_TYPE_WEIGHTS[t] || 1) < 0) return t;
            return types[types.length - 1];
        };
        // The loose pass is for hard daily rules and small collections: any
        // types, and an evolution line may have 1 copy of a stage, as long as
        // every evolution's earlier stage is in the deck.
        const passes = [{ strongOnly: true }, { strongOnly: false }, { mixed: true }, { mixed: true, loose: true, tries: 150 }];
        for (const pass of passes) {
            for (let attempt = 0; attempt < (pass.tries || 60); attempt++) {
                const mainType = pass.mixed || !types.length ? null
                    : (mustType && types.includes(mustType) ? mustType : pickType());
                const from = pass.loose ? anyUsable : usable;
                const pool = from.filter(u => (pass.mixed || fits(u, mainType)) && (!pass.strongOnly || u.strong));
                // The must-include creature's unit always takes part, whatever the pass.
                if (mustUnit && !pool.some(u => u.ids.includes(shape.must))) pool.push(mustUnit);
                // A must-include item or accessory for one type brings a creature of that type.
                let forceUnit = null;
                if (!mustUnit && mustType) {
                    const ofType = list => list.filter(u => u.type === mustType);
                    forceUnit = rng.pick(ofType(pool).length ? ofType(pool) : ofType(from)) || null;
                    if (forceUnit && !pool.includes(forceUnit)) pool.push(forceUnit);
                }
                if (!pool.length) continue;
                const deck = this._tryBuild(pool, mainType, Object.assign({}, shape, { loose: !!pass.loose, forceUnit }));
                if (deck) return deck;
            }
        }
        return null;
    },

    /** A unit from the base stage up to `card`, when every stage is allowed and owned. */
    _cutUnit(card, allowed) {
        const path = [card];
        for (let cur = card; cur.prevStageIds && cur.prevStageIds.length;) {
            cur = getCardData(cur.prevStageIds[0]);
            if (!cur || path.includes(cur)) break;
            path.unshift(cur);
        }
        if (!path.every(c => allowed(c) && this.copies(c.id) >= 1)) return null;
        return {
            ids: path.map(c => c.id),
            type: getCardType(card),
            energy: new Set(path.flatMap(c => [...energyTypesUsedBy(c)])),
            strong: false,
            score: 0
        };
    },

    _tryBuild(pool, mainType, { allowed, per, single, itemCap, deckOk, rng, loose = false, prefer = () => false, must = null, forceUnit = null }) {
        const cards = [];
        const room = () => DECK_SIZE - cards.length;
        let itemSlots = Math.min(itemCap, 5 + rng.int(2));
        // A must-include accessory needs a slot even under "no item cards".
        const mustCard = must ? getCardData(must) : null;
        if (mustCard && !isCreature(mustCard)) itemSlots = Math.max(itemSlots, 1);
        let creatureSlots = DECK_SIZE - itemSlots;

        // Weighted draw without replacement, as in Raids._tryBuild.
        // Neutral lines are only the support of a typed team, so they come up less.
        const support = u => (mainType && mainType !== 'Neutral' && u.type === 'Neutral' ? 0.08 : 1);
        const weight = u => (u.strong ? Math.pow(Math.max(2, u.score - 40), 2) : 4) * (u.ids.some(prefer) ? 8 : 1) * support(u);
        const left = pool.slice();
        const singles = [];
        let forced = must ? left.findIndex(u => u.ids.includes(must)) : -1;
        if (forced < 0 && forceUnit) forced = left.indexOf(forceUnit);
        while (creatureSlots > 0 && left.length) {
            const total = left.reduce((sum, u) => sum + weight(u), 0);
            let roll = rng.float() * total;
            let index = 0;
            while (index < left.length - 1 && (roll -= weight(left[index])) > 0) index++;
            if (forced >= 0) { index = forced; forced = -1; }
            const unit = left.splice(index, 1)[0];
            if (unit.ids.some(id => cards.includes(id))) continue;   // two branches share their first stages
            if (unit.ids.length === 1) {
                const most = Math.min(per, this.copies(unit.ids[0]), creatureSlots);
                const copies = Math.min(most, 1 + rng.int(2));
                for (let i = 0; i < copies; i++) cards.push(unit.ids[0]);
                creatureSlots -= copies;
                if (copies < most) singles.push(unit.ids[0]);
            } else {
                // A loose line takes what it can: up to `per` of each stage owned,
                // never fewer of a later stage than of the one before it.
                const counts = [];
                for (const id of unit.ids) {
                    const prev = counts.length ? counts[counts.length - 1] : per;
                    counts.push(loose ? Math.min(prev, per, this.copies(id)) : per);
                }
                let size = counts.reduce((a, b) => a + b, 0);
                // Loose: trim later stages to 1 copy to fit an odd number of slots.
                for (let i = counts.length - 1; loose && size > creatureSlots && i >= 0; i--) {
                    while (counts[i] > 1 && size > creatureSlots) { counts[i]--; size--; }
                }
                if (size > creatureSlots) continue;
                unit.ids.forEach((id, i) => { for (let k = 0; k < counts[i]; k++) cards.push(id); });
                creatureSlots -= size;
            }
        }
        // Top up single creatures before giving up on the slots.
        while (creatureSlots > 0 && singles.length) {
            const id = singles.pop();
            cards.push(id);
            creatureSlots--;
        }
        // Not enough creatures: more items (where the rules allow) fill the gap.
        if (creatureSlots > 0) itemSlots += creatureSlots;

        // Items and accessories the player owns: Card Draw, the type's own
        // item, the proven ones, then any other item, then accessories.
        const creatureData = cards.map(getCardData).filter(d => d && isCreature(d));
        if (!creatureData.length) return null;
        // A typed team is mostly that type (at least as many as its Neutral creatures).
        if (mainType && mainType !== 'Neutral') {
            const ofType = creatureData.filter(d => getCardType(d) === mainType).length;
            if (ofType < creatureData.length - ofType) return null;
        }
        const present = new Set(creatureData.map(getCardType));
        const neutralCards = creatureData.filter(d => getCardType(d) === 'Neutral').length;
        const needsOf = d => TYPE_SPECIFIC_ITEMS[d.itemEffect] || (isAccessory(d) && d.accessoryType !== 'Any' ? d.accessoryType : null);
        const ok = id => {
            const d = getCardData(id);
            if (!d || !(isItem(d) || isAccessory(d)) || !allowed(d) || this.copies(id) < 1) return false;
            const needs = needsOf(d);
            return !needs || present.has(needs);
        };
        const owned = cardDatabase.filter(d => (isItem(d) || isAccessory(d)) && ok(d.id)).map(d => d.id);
        const typed = owned.filter(id => isItem(getCardData(id)) && (needsOf(getCardData(id)) === mainType ||
            (needsOf(getCardData(id)) === 'Neutral' && neutralCards >= 6)));
        const order = [...(must ? [must] : []), ...rng.shuffle(owned.filter(prefer)), RAID_DRAW_ITEM, ...typed, ...rng.shuffle(RAID_CORE_ITEMS.slice()),
            ...rng.shuffle(RAID_ITEMS.slice()),
            ...rng.shuffle(owned.filter(id => isItem(getCardData(id)))),
            ...rng.shuffle(owned.filter(id => isAccessory(getCardData(id))))];
        let items = 0;
        for (const id of order) {
            if (itemSlots <= 0 || room() <= 0) break;
            if (!ok(id)) continue;
            const d = getCardData(id);
            const have = cards.filter(x => x === id).length;
            const most = Math.min(per, this.copies(id));
            for (let i = have; i < most && itemSlots > 0 && room() > 0; i++) {
                if (isItem(d) && items >= itemCap) break;
                cards.push(id);
                itemSlots--;
                if (isItem(d)) items++;
            }
        }
        if (cards.length !== DECK_SIZE) return null;

        const usedTypes = new Set(creatureData.flatMap(d => [...energyTypesUsedBy(d)]));
        const energyTypes = mainType && mainType !== 'Neutral' ? [mainType]
            : (!mainType && usedTypes.size ? ENERGY_TYPES.filter(t => usedTypes.has(t)) : ENERGY_TYPES.slice());
        if (!validateDeck(cards).valid) return null;
        // 2 of every stage, as in the AI decks; under "1 copy of each card", 1 of every stage.
        if (single || loose ? deckWarnings(cards).length : presetCompositionProblems(cards).length) return null;
        // Type-specific items and typed accessories still need their type (part of the composition check).
        if (cards.some(id => { const d = getCardData(id); const n = needsOf(d); return n && !present.has(n); })) return null;
        if (energyTypeWarnings(cards, energyTypes).length) return null;
        if (!deckOk(cards)) return null;

        // Full art first: every full-art copy the player owns is used.
        const fullArt = {};
        for (const id of new Set(cards)) {
            const n = Math.min(cards.filter(x => x === id).length, Profile.ownedFullArt(id));
            if (n > 0 && hasFullArt(id)) fullArt[id] = n;
        }
        if (!Profile.checkOwnership(cards, fullArt).valid) return null;

        const label = mainType || deckPrimaryType(cards);
        return {
            name: `🎲 Auto team (${mainType ? label : 'mixed'})`,
            type: 'auto',
            cards: cards.slice(),
            energyTypes,
            fullArt,
            mainType: mainType || 'Mixed'
        };
    },

    /** "2× Traplet, 2× Traphex, …" for the preview. */
    describe(deck) {
        const counts = new Map();
        for (const id of deck.cards) counts.set(id, (counts.get(id) || 0) + 1);
        return [...counts].map(([id, n]) => {
            const d = getCardData(id);
            const fa = deck.fullArt && deck.fullArt[id] ? ` (${deck.fullArt[id]} full art ✦)` : '';
            return `${n}× ${d ? d.name : id}${fa}`;
        }).join(' · ');
    }
};
