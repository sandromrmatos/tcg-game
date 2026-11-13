// ============================================================================
// DAILY CHALLENGES
//
// Three challenges a day: Easy, Medium and Hard. Each has:
//   * an AI deck built like a raid boss deck (strong cards from the sets the
//     player has unlocked), around a strong "leader" line
//   * deck-building restrictions the player's deck must follow: one for Easy,
//     two for Medium, three (harder ones) for Hard
//   * a target of consecutive wins: 1, 2 and 3. A loss, draw or leaving the
//     game resets that mode's streak.
//
// Everything for the day is made the first time the challenges are looked at
// and kept in the save, so the restrictions and the AI decks stay the same
// all day, however many times they are played. A new set is made at local
// midnight. Rewards wait in `unclaimed` until claimed, so a reward earned
// with full credits isn't lost when the day changes.
// ============================================================================

const DAILY_MODES = [
    { id: 'easy',   name: 'Easy',   icon: '🟢', wins: 1, rules: 1 },
    { id: 'medium', name: 'Medium', icon: '🟠', wins: 2, rules: 2 },
    { id: 'hard',   name: 'Hard',   icon: '🔴', wins: 3, rules: 3 }
];

/** Rewards per mode. `card`: 'random' = any unlocked set, 'choose' = the player picks the set. */
const DAILY_REWARDS = {
    easy:   { credits: 1, gemChance: 0,   card: null },
    medium: { credits: 1, gemChance: 0,   card: 'random' },
    hard:   { credits: 2, gemChance: 0.5, card: 'choose' }
};

/** Odds for a reward card, uncommon or better, in the same ratio as Draw a Card (28 / 13 / 4). */
const DAILY_CARD_ODDS = [{ rarity: 2, weight: 28 }, { rarity: 3, weight: 13 }, { rarity: 4, weight: 4 }];

const DAILY_MAX_ITEMS = 3;

/** A small seeded generator with the same shape as Rng, for the day's challenges. */
function dailyRng(seedText) {
    let s = 0x811c9dc5;
    for (let i = 0; i < seedText.length; i++) { s ^= seedText.charCodeAt(i); s = Math.imul(s, 0x01000193) >>> 0; }
    s = s || 1;
    const next = () => {
        s ^= s << 13; s >>>= 0;
        s ^= s >> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
    return {
        float: next,
        int: n => Math.floor(next() * n),
        pick: a => (a && a.length ? a[Math.floor(next() * a.length)] : null),
        shuffle(a) {
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(next() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }
    };
}

/** Part of an evolution line (evolves, or evolves from something). */
function dailyEvolves(card) {
    return (card.prevStageIds || []).length > 0 || (card.nextStageIds || []).length > 0;
}

// ---------------------------------------------------------------------------
// Restrictions
//
// Each kind has a `group`: a challenge never has two of the same group, so
// they can't contradict or repeat each other. `allows(card)` is a per-card
// rule; `deckCheck(cardIds)` a whole-deck one. `available(ctx)` says whether
// the rule makes sense for this player (an accessory ban before accessories
// exist would be no restriction at all).
// ---------------------------------------------------------------------------

const DAILY_RESTRICTIONS = {
    noType: {
        group: 'type',
        label: r => `No ${r.types.join(' or ')} creatures`,
        allows: (r, c) => !isCreature(c) || !r.types.includes(getCardType(c)),
        make: (ctx, rng, tier) => {
            const types = rng.shuffle(ctx.ownedTypes.slice());
            const n = tier === 'hard' ? 2 : 1;
            if (types.length <= n) return null;
            return { types: types.slice(0, n).sort() };
        }
    },
    noItems: {
        group: 'items',
        label: () => 'No item cards',
        allows: (r, c) => !isItem(c)
    },
    maxItems: {
        group: 'items',
        label: () => `At most ${DAILY_MAX_ITEMS} item cards`,
        deckCheck: (r, ids) => {
            const n = ids.filter(id => isItem(getCardData(id))).length;
            return n > DAILY_MAX_ITEMS ? `The deck has ${n} item cards; at most ${DAILY_MAX_ITEMS} are allowed.` : null;
        }
    },
    noAccessories: {
        group: 'pool',
        label: () => 'No accessory cards',
        allows: (r, c) => !isAccessory(c),
        available: ctx => ctx.accessoriesOpen
    },
    onlySet: {
        group: 'pool',
        label: r => `Only ${(setById(r.setId) || { name: r.setId }).name} cards`,
        allows: (r, c) => c.set === r.setId,
        available: ctx => ctx.sets.length >= 2,
        make: (ctx, rng) => ({ setId: rng.pick(ctx.sets) })
    },
    evolvingOnly: {
        group: 'evo',
        label: () => 'Only creatures that evolve or evolve from another card',
        allows: (r, c) => !isCreature(c) || dailyEvolves(c)
    },
    nonEvolvingOnly: {
        group: 'evo',
        label: () => "Only creatures that don't evolve",
        allows: (r, c) => !isCreature(c) || !dailyEvolves(c)
    },
    noStage3: {
        group: 'evo',
        label: () => 'No Stage 3 creatures',
        allows: (r, c) => c.stage !== 'Stage 3',
        available: ctx => ctx.ownsStage3
    },
    noEpic: {
        group: 'rarity',
        label: () => 'No Epic cards',
        allows: (r, c) => c.rarity !== 4,
        available: ctx => ctx.ownsRarity[4] > 0
    },
    commonUncommon: {
        group: 'rarity',
        label: () => 'Only Common and Uncommon cards',
        allows: (r, c) => !(c.rarity >= 3),
        available: ctx => ctx.ownsRarity[3] + ctx.ownsRarity[4] > 0
    },
    noAbilities: {
        group: 'ability',
        label: () => 'No creatures with an ability',
        allows: (r, c) => !isCreature(c) || !c.abilityName
    },
    noMoveEffects: {
        group: 'effects',
        label: () => 'No creatures with a move that has an effect (only plain damage moves)',
        allows: (r, c) => !isCreature(c) || !movesOf(c).some(m => m.effect)
    },
    minRarity: {
        group: 'rarity',
        label: r => `At least ${r.count} ${Collection.rarity(r.rarity).name} cards`,
        deckCheck: (r, ids) => {
            const n = ids.filter(id => (getCardData(id) || {}).rarity === r.rarity).length;
            return n < r.count ? `The deck has ${n}.` : null;
        },
        make: (ctx, rng, tier) => {
            // Rarer cards ask for fewer copies; Hard asks for more than Medium.
            const options = { 2: [5, 8], 3: [3, 5], 4: [2, 3] };
            const rarities = [2, 3, 4].filter(r => (ctx.copiesByRarity[r] || 0) >= options[r][0]);
            if (!rarities.length) return null;
            const rarity = rng.pick(rarities);
            const [low, high] = options[rarity];
            const count = tier === 'hard' ? high : low + rng.int(high - low);
            if ((ctx.copiesByRarity[rarity] || 0) < count) return null;
            return { rarity, count };
        }
    },
    singleton: {
        group: 'copies',
        label: () => 'Only 1 copy of each card',
        deckCheck: (r, ids) => {
            const seen = new Set(), twice = new Set();
            for (const id of ids) { if (seen.has(id)) twice.add(id); seen.add(id); }
            return twice.size ? `More than 1 copy of ${[...twice].map(id => (getCardData(id) || { name: id }).name).join(', ')}.` : null;
        }
    }
};

/** Which restrictions each mode draws from. Medium and Hard need at least `core` from their own list. */
const DAILY_POOLS = {
    easy:   { own: ['noStage3', 'noType', 'noAccessories', 'noEpic', 'maxItems'], core: 1 },
    medium: { own: ['noItems', 'noType', 'onlySet', 'noAbilities', 'evolvingOnly', 'nonEvolvingOnly', 'noMoveEffects', 'minRarity'],
              extra: ['noStage3', 'noAccessories', 'noEpic', 'maxItems'], core: 1 },
    hard:   { own: ['noType', 'commonUncommon', 'singleton', 'onlySet', 'noItems', 'evolvingOnly', 'nonEvolvingOnly', 'noAbilities', 'noMoveEffects', 'minRarity'],
              extra: ['noStage3', 'noAccessories', 'noEpic', 'maxItems'], core: 2 }
};

const Daily = {

    // -----------------------------------------------------------------------
    // The day's challenges
    // -----------------------------------------------------------------------

    /** Today's challenges, made (and saved) the first time they're asked for. */
    today() {
        const s = Profile.s;
        const today = dayKey();
        if (!s.daily || typeof s.daily !== 'object') s.daily = this.blank();
        if (s.daily.date !== today || !s.daily.modes) {
            s.daily.date = today;
            s.daily.modes = this.generate(today);
            Profile.touch('daily-new', { immediate: true });
        }
        return s.daily;
    },

    blank() {
        return { date: null, modes: null, unclaimed: [] };
    },

    mode(id) {
        return DAILY_MODES.find(m => m.id === id) || null;
    },

    /** What the player's collection allows, for choosing sensible restrictions. */
    _context() {
        const sets = Profile.unlockedSets().map(s => s.id);
        const ctx = {
            sets,
            accessoriesOpen: cardDatabase.some(c => isAccessory(c) && sets.includes(c.set)),
            ownedTypes: [],
            ownsStage3: false,
            ownsRarity: { 1: 0, 2: 0, 3: 0, 4: 0 },
            copiesByRarity: { 1: 0, 2: 0, 3: 0, 4: 0 }   // usable copies (up to 2 each) in unlocked sets
        };
        const types = new Set();
        for (const card of cardDatabase) {
            if (this._copies(card.id) <= 0) continue;
            if (sets.includes(card.set) && ctx.copiesByRarity[card.rarity] !== undefined) {
                ctx.copiesByRarity[card.rarity] += Math.min(MAX_COPIES, this._copies(card.id));
            }
            if (isCreature(card)) types.add(getCardType(card));
            if (card.stage === 'Stage 3') ctx.ownsStage3 = true;
            if (ctx.ownsRarity[card.rarity] !== undefined) ctx.ownsRarity[card.rarity]++;
        }
        ctx.ownedTypes = CREATURE_TYPES.filter(t => types.has(t));
        return ctx;
    },

    /** Normal plus full-art copies owned. */
    _copies(cardId) {
        return Profile.owned(cardId) + Profile.ownedFullArt(cardId);
    },

    generate(date) {
        const ctx = this._context();
        const modes = {};
        const usedLeaders = new Set();
        for (const m of DAILY_MODES) {
            const rng = dailyRng(`${date}|${m.id}|${ctx.sets.join(',')}`);
            const deck = this._makeDeck(m.id, rng, usedLeaders);
            if (deck && deck.leader) usedLeaders.add(deck.leader);
            modes[m.id] = {
                restrictions: this._makeRestrictions(m, ctx, rng),
                deck,
                streak: 0, bestStreak: 0, played: 0, won: 0,
                done: false
            };
        }
        return modes;
    },

    _makeRestrictions(mode, ctx, rng) {
        const pool = DAILY_POOLS[mode.id];
        const usable = id => {
            const def = DAILY_RESTRICTIONS[id];
            return def && (!def.available || def.available(ctx));
        };
        // Try for the full number of rules the player's cards can still meet;
        // a small collection gets fewer rather than an impossible challenge.
        for (let count = mode.rules; count >= 0; count--) {
            for (let attempt = 0; attempt < 60; attempt++) {
                const picked = [];
                const groups = new Set();
                const add = id => {
                    const def = DAILY_RESTRICTIONS[id];
                    if (groups.has(def.group)) return false;
                    const params = def.make ? def.make(ctx, rng, mode.id) : {};
                    if (!params) return false;
                    picked.push(Object.assign({ id }, params));
                    groups.add(def.group);
                    return true;
                };
                const own = rng.shuffle(pool.own.filter(usable));
                const any = rng.shuffle(pool.own.concat(pool.extra || []).filter(usable));
                const core = Math.min(pool.core, count);
                for (const id of own) { if (picked.length >= core) break; add(id); }
                for (const id of any) { if (picked.length >= count) break; add(id); }
                if (picked.length === count && this._feasible(picked)) return picked;
            }
        }
        return [];
    },

    /** Can the player's own cards make a legal 20-card deck under these rules? */
    _feasible(restrictions) {
        const allowed = card => restrictions.every(r => {
            const def = DAILY_RESTRICTIONS[r.id];
            return !def.allows || def.allows(r, card);
        });
        const single = restrictions.some(r => r.id === 'singleton');
        const itemCap = restrictions.some(r => r.id === 'maxItems') ? DAILY_MAX_ITEMS : Infinity;
        const need = restrictions.find(r => r.id === 'minRarity');
        let total = 0, items = 0, stage1 = false, rareCreatures = 0, rareItems = 0;
        for (const card of cardDatabase) {
            const owned = this._copies(card.id);
            if (owned <= 0 || !Profile.isSetUnlocked(card.set) || !allowed(card)) continue;
            const n = Math.min(owned, single ? 1 : MAX_COPIES);
            if (isItem(card)) items += n;
            else total += n;
            if (card.stage === 'Stage 1') stage1 = true;
            if (need && card.rarity === need.rarity) {
                if (isItem(card)) rareItems += n;
                else rareCreatures += n;
            }
        }
        if (need && rareCreatures + Math.min(rareItems, itemCap) < need.count) return false;
        return stage1 && total + Math.min(items, itemCap) >= DECK_SIZE;
    },

    /** The AI deck for a mode: a raid-style deck around a strong line. Harder modes get stronger leaders. */
    _makeDeck(modeId, rng, usedLeaders) {
        const open = setId => Profile.isSetUnlocked(setId);
        const leaders = Object.entries(typeof RAID_STRONG_CARDS !== 'undefined' ? RAID_STRONG_CARDS : {})
            .map(([id, score]) => ({ card: getCardData(id), score }))
            .filter(l => l.card && isCreature(l.card) && open(l.card.set) && !raidIsPromo(l.card))
            .sort((a, b) => b.score - a.score);
        const share = modeId === 'hard' ? 1 / 3 : modeId === 'medium' ? 2 / 3 : 1;
        let pool = leaders.slice(0, Math.max(3, Math.ceil(leaders.length * share)));
        const fresh = pool.filter(l => !usedLeaders.has(l.card.id));
        if (fresh.length) pool = fresh;
        rng.shuffle(pool);
        for (const leader of pool) {
            const deck = Raids.generateDeck({ id: 'daily', card: leader.card }, { rng, isSetOpen: open });
            if (!deck) continue;
            const mode = this.mode(modeId);
            return {
                name: `Daily challenge (${mode.name})`,
                cards: deck.cards,
                energyTypes: deck.energyTypes,
                mainType: deck.mainType,
                leader: leader.card.id
            };
        }
        // Nothing could be built: fall back to one of the AI's own decks.
        const presets = DeckLibrary.aiPresets();
        const preset = presets.length ? presets[rng.int(presets.length)] : null;
        if (!preset) return null;
        return {
            name: `Daily challenge (${this.mode(modeId).name})`,
            cards: preset.cards.slice(),
            energyTypes: preset.energyTypes.slice(),
            mainType: deckPrimaryType(preset.cards),
            leader: null
        };
    },

    // -----------------------------------------------------------------------
    // Checking a deck
    // -----------------------------------------------------------------------

    describe(r) {
        const def = DAILY_RESTRICTIONS[r.id];
        return def ? def.label(r) : r.id;
    },

    /** Why a deck breaks today's rules for a mode, one line per broken rule. Empty = fits. */
    violations(modeId, cardIds) {
        const st = this.today().modes[modeId];
        if (!st) return ['Unknown challenge.'];
        const out = [];
        for (const r of st.restrictions) {
            const def = DAILY_RESTRICTIONS[r.id];
            if (!def) continue;
            if (def.allows) {
                const bad = [...new Set(cardIds.filter(id => {
                    const c = getCardData(id);
                    return c && !def.allows(r, c);
                }))];
                if (bad.length) {
                    const names = bad.map(id => getCardData(id).name);
                    const list = names.length > 4 ? `${names.slice(0, 4).join(', ')} and ${names.length - 4} more` : names.join(', ');
                    out.push(`${def.label(r)}: ${list}`);
                }
            }
            if (def.deckCheck) {
                const problem = def.deckCheck(r, cardIds);
                if (problem) out.push(`${def.label(r)}: ${problem}`);
            }
        }
        return out;
    },

    // -----------------------------------------------------------------------
    // Results and rewards
    // -----------------------------------------------------------------------

    /**
     * Records a finished daily challenge game (Profile.finishMatch / forfeitMatch).
     * @param {{mode, date}} daily what Profile.startMatch stored
     * @returns {{lines: string[], completed: boolean}}
     */
    onResult(daily, result, { forfeit = false } = {}) {
        const out = { lines: [], completed: false };
        const mode = daily && this.mode(daily.mode);
        if (!mode) return out;
        const day = this.today();
        if (daily.date !== day.date) {
            out.lines.push("📅 The daily challenges changed at midnight, so this game didn't count for them.");
            return out;
        }
        const st = day.modes[mode.id];
        if (!st || st.done) return out;
        st.played++;
        if (result === 'win') {
            st.won++;
            st.streak++;
            st.bestStreak = Math.max(st.bestStreak, st.streak);
            if (st.streak >= mode.wins) {
                st.done = true;
                day.unclaimed.push({ mode: mode.id, date: day.date });
                out.completed = true;
                out.lines.push(`📅 ${mode.name} daily challenge complete! Claim your reward on the Daily Challenges page.`);
            } else {
                out.lines.push(`📅 ${mode.name} challenge: ${st.streak}/${mode.wins} wins in a row.`);
            }
        } else {
            if (st.streak > 0) out.lines.push(`📅 Your ${mode.name} challenge streak was reset (${mode.wins} wins in a row needed).`);
            else if (!forfeit) out.lines.push(`📅 ${mode.name} challenge: ${mode.wins} wins in a row needed.`);
            st.streak = 0;
        }
        return out;
    },

    claimableCount() {
        if (!Profile.s || !Profile.s.daily) return 0;
        return (Profile.s.daily.unclaimed || []).length;
    },

    rewardText(modeId) {
        const r = DAILY_REWARDS[modeId];
        const parts = [`🪙 ${plural(r.credits, 'credit')}`];
        if (r.gemChance) parts.push(`${Math.round(r.gemChance * 100)}% chance of 💜 1 gem`);
        if (r.card === 'random') parts.push('a card (Uncommon or better) from any set you have unlocked');
        if (r.card === 'choose') parts.push('a card (Uncommon or better) from the set of your choice');
        return parts.join(' + ');
    },

    /** A non-promo card of Uncommon or better from a set, at the 28 / 13 / 4 odds. */
    rollCard(setId, roll = Math.random()) {
        const pool = Collection.setCards(setId).filter(c => !c.promo && c.rarity >= 2);
        if (!pool.length) return null;
        const odds = DAILY_CARD_ODDS.filter(o => pool.some(c => c.rarity === o.rarity));
        const total = odds.reduce((sum, o) => sum + o.weight, 0);
        let left = roll * total, rarity = odds[odds.length - 1].rarity;
        for (const o of odds) { if ((left -= o.weight) < 0) { rarity = o.rarity; break; } }
        const tier = pool.filter(c => c.rarity === rarity);
        return tier[randInt(tier.length)];
    },

    /**
     * Pays one waiting reward. Credits need room under the cap (like
     * missions); gems and cards never block.
     * @param {number} index position in unclaimed
     * @param {object} [opts] { setId } for a Hard reward
     */
    claim(index, { setId = null } = {}) {
        const day = this.today();
        const entry = day.unclaimed[index];
        if (!entry) return { error: 'No reward waiting.' };
        const reward = DAILY_REWARDS[entry.mode];
        if (!reward) return { error: 'Unknown reward.' };

        Profile.regen();
        if (MAX_CREDITS - Profile.s.credits < reward.credits) {
            return { error: `Not enough room for ${plural(reward.credits, 'credit')} (${Profile.s.credits}/${MAX_CREDITS}). Spend some credits first.` };
        }
        let cardSet = null;
        if (reward.card === 'choose') {
            if (!setId || !Profile.isSetUnlocked(setId)) return { error: 'Choose one of your unlocked sets.' };
            cardSet = setId;
        } else if (reward.card === 'random') {
            const sets = Profile.unlockedSets().map(s => s.id);
            cardSet = sets[randInt(sets.length)];
        }

        const out = { credits: Profile._addCredits(reward.credits), gems: 0, card: null };
        if (reward.gemChance && Math.random() < reward.gemChance) {
            Profile.s.gems += 1;
            out.gems = 1;
        }
        if (cardSet) {
            const card = this.rollCard(cardSet);
            if (card) {
                const { isNew, quantity } = Profile._addCard(card.id);
                Object.assign(out, { card, isNew, quantity });
                Profile.checkUnlocks();
            }
        }
        day.unclaimed.splice(index, 1);
        Profile.touch('daily-claim', { immediate: true });
        return { success: true, mode: entry.mode, reward: out };
    },

    /** Cleans a saved daily block (Profile.migrate). A broken day is simply made again. */
    sanitize(raw) {
        const out = this.blank();
        if (!raw || typeof raw !== 'object') return out;
        out.unclaimed = (Array.isArray(raw.unclaimed) ? raw.unclaimed : [])
            .filter(e => e && DAILY_REWARDS[e.mode])
            .map(e => ({ mode: e.mode, date: String(e.date || '') }))
            .slice(0, 30);
        const modes = raw.modes && typeof raw.modes === 'object' ? raw.modes : null;
        const okMode = m => m && typeof m === 'object' && Array.isArray(m.restrictions) &&
            m.restrictions.every(r => r && DAILY_RESTRICTIONS[r.id]) &&
            m.deck && Array.isArray(m.deck.cards) && m.deck.cards.every(id => getCardData(id));
        if (typeof raw.date === 'string' && modes && DAILY_MODES.every(m => okMode(modes[m.id]))) {
            out.date = raw.date;
            out.modes = {};
            const int = v => Math.max(0, Math.floor(Number(v) || 0));
            for (const m of DAILY_MODES) {
                const src = modes[m.id];
                out.modes[m.id] = {
                    restrictions: src.restrictions.map(r => Object.assign({}, r)),
                    deck: {
                        name: String(src.deck.name || `Daily challenge (${m.name})`),
                        cards: src.deck.cards.slice(),
                        energyTypes: cleanEnergyTypes(src.deck.energyTypes),
                        mainType: String(src.deck.mainType || ''),
                        leader: src.deck.leader && getCardData(src.deck.leader) ? src.deck.leader : null
                    },
                    streak: int(src.streak), bestStreak: int(src.bestStreak),
                    played: int(src.played), won: int(src.won),
                    done: !!src.done
                };
            }
        }
        return out;
    }
};
