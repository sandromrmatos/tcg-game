// ============================================================================
// RAID BOSSES
//
// A raid boss is an AI deck built around one card's full-art version. Its
// page opens once the player owns 2 normal copies of that card. Beating the
// raid means completing every task, counted only in games against that boss:
//   * win 5 games in a row against it (only a loss or leaving a game against
//     this boss breaks the streak; a draw neither adds nor breaks)
//   * win once with a deck holding at least 14 Mystic creature cards, and the
//     same for Wind, Neutral, Celestial and Mechanic
// The first time pays 1 full-art copy and nothing else. After that the tasks
// start over, and completing them again pays 1 credit, once per week
// (Monday to Sunday) per boss. Boss wins also count for the usual daily win
// credits, which Profile.finishMatch pays.
//
// The boss deck is rebuilt at random for every game: 2 full-art copies of the
// boss card, 2 of every other card in its evolution line, strong lines from
// unlocked sets (RAID_STRONG_CARDS), at least one Card Draw, and no mixed
// energy: every creature only asks for the deck's one energy type.
// ============================================================================

const RAID_STREAK_TARGET = 5;
const RAID_TYPE_TARGET = 14;
const RAID_NORMAL_COPIES = 2;
const RAID_TYPES = ['Mystic', 'Wind', 'Neutral', 'Celestial', 'Mechanic'];

// Mythical raids: a longer streak, and four deck tasks on top of the type ones.
const MYTHIC_STREAK_TARGET = 7;
const MYTHIC_TASKS = [
    { id: 'singleton', label: 'Win with only 1 copy of each card in your deck',
      test: ids => new Set(ids).size === ids.length },
    { id: 'noHighHp', label: 'Win without creature cards of 100 HP or more',
      test: ids => ids.every(id => { const d = getCardData(id); return !d || !isCreature(d) || d.hp < 100; }) },
    { id: 'noItems', label: 'Win without item cards in your deck',
      test: ids => ids.every(id => !isItem(getCardData(id))) },
    { id: 'commonUncommon', label: 'Win with only Common and Uncommon cards in your deck',
      test: ids => ids.every(id => { const d = getCardData(id); return !!d && d.rarity <= 2; }) }
];
/** Every task a win can tick: the five types, and the Mythical deck tasks. */
const RAID_TASK_KEYS = RAID_TYPES.concat(MYTHIC_TASKS.map(t => t.id));

function raidStreakTarget(boss) {
    return boss && boss.mythical ? MYTHIC_STREAK_TARGET : RAID_STREAK_TARGET;
}

/** What a win with this deck counts for: its types, plus the Mythical deck tasks it meets. */
function raidQualifyingTasks(cardIds, boss) {
    const out = raidQualifyingTypes(cardIds);
    if (boss && boss.mythical) for (const t of MYTHIC_TASKS) if (t.test(cardIds)) out.push(t.id);
    return out;
}

/** Readable names for the task keys ("Mystic", "only 1 copy of each card"…). */
function raidTaskName(key) {
    const short = { singleton: '1 copy of each card', noHighHp: 'no 100+ HP creatures', noItems: 'no item cards', commonUncommon: 'only Common and Uncommon cards' };
    return short[key] || key;
}

/** How often a Neutral boss leads each type, by how well the type did in the simulation. */
const RAID_TYPE_WEIGHTS = { Neutral: 3, Mechanic: 3, Wind: 2, Celestial: 2, Mystic: 1 };

/** Key of the week (Monday to Sunday) a date falls in: the Monday's dayKey. */
function raidWeekKey(d = new Date()) {
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return dayKey(monday);
}

/** Creature cards per type in a deck list. */
function raidTypeCounts(cardIds) {
    const counts = {};
    for (const id of cardIds || []) {
        const data = getCardData(id);
        if (!data || !isCreature(data)) continue;
        const type = getCardType(data);
        counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
}

/** The types a deck counts for: at least 14 creature cards of that type. */
function raidQualifyingTypes(cardIds) {
    const counts = raidTypeCounts(cardIds);
    return RAID_TYPES.filter(t => (counts[t] || 0) >= RAID_TYPE_TARGET);
}

const Raids = {
    // -----------------------------------------------------------------------
    // Bosses and their records
    // -----------------------------------------------------------------------

    /** Bosses whose card exists, in list order, with the card data attached. */
    bosses() {
        return ALL_RAID_BOSSES.map(b => Object.assign({}, b, { card: getCardData(b.cardId) })).filter(b => b.card);
    },

    find(bossId) {
        const boss = raidBossById(bossId);
        const card = boss && getCardData(boss.cardId);
        return card ? Object.assign({}, boss, { card }) : null;
    },

    blankCycle() {
        return { streak: 0, streakDone: false, types: {} };
    },

    blankRecord() {
        return {
            played: 0, won: 0, lost: 0, drawn: 0, forfeits: 0,
            streak: 0, bestStreak: 0,           // all-time streak against this boss
            completions: 0,
            firstCompletedAt: 0,
            lastCreditWeek: null,               // week of the last rematch credit
            pendingCredit: 0,                   // earned while credits were full
            cycle: this.blankCycle()            // progress towards the next completion
        };
    },

    /** Cleans a saved raids map (Profile.migrate). Unknown bosses are dropped. */
    sanitize(raw) {
        const out = {};
        if (!raw || typeof raw !== 'object') return out;
        const int = v => Math.max(0, Math.floor(Number(v) || 0));
        for (const boss of ALL_RAID_BOSSES) {
            const r = raw[boss.id];
            if (!r || typeof r !== 'object') continue;
            const rec = this.blankRecord();
            for (const k of ['played', 'won', 'lost', 'drawn', 'forfeits', 'streak', 'bestStreak', 'completions', 'firstCompletedAt']) {
                rec[k] = int(r[k]);
            }
            rec.pendingCredit = Math.min(1, int(r.pendingCredit));
            rec.lastCreditWeek = typeof r.lastCreditWeek === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.lastCreditWeek)
                ? r.lastCreditWeek : null;
            const c = r.cycle && typeof r.cycle === 'object' ? r.cycle : {};
            rec.cycle.streak = int(c.streak);
            rec.cycle.streakDone = !!c.streakDone || rec.cycle.streak >= raidStreakTarget(boss);
            for (const t of RAID_TASK_KEYS) if (c.types && c.types[t]) rec.cycle.types[t] = true;
            out[boss.id] = rec;
        }
        return out;
    },

    record(bossId) {
        const all = Profile.s.raids;
        return all[bossId] || (all[bossId] = this.blankRecord());
    },

    /** A read-only view of the record, without creating one. */
    peek(bossId) {
        return (Profile.s && Profile.s.raids[bossId]) || this.blankRecord();
    },

    isUnlocked(boss) {
        if (boss.mythical) return this.mastery(boss.afterSet).done;
        return Profile.owned(boss.cardId) >= RAID_NORMAL_COPIES;
    },

    /**
     * A Mythical raid's key: every card of the set (promos too), and 2 copies
     * of each non-promo card. Full-art copies count as copies.
     * @returns {{have, total, done}} cards that meet it, out of the set
     */
    mastery(setId) {
        const cards = Collection.setCards(setId);
        const copies = id => Profile.owned(id) + Profile.ownedFullArt(id);
        const have = cards.filter(c => copies(c.id) >= (c.promo ? 1 : RAID_NORMAL_COPIES)).length;
        return { have, total: cards.length, done: cards.length > 0 && have === cards.length };
    },

    /** The task list for the current attempt, with what is done. */
    tasks(boss) {
        const rec = this.peek(boss.id);
        const owned = Profile.owned(boss.cardId);
        if (boss.mythical) {
            const target = MYTHIC_STREAK_TARGET;
            const m = this.mastery(boss.afterSet);
            const setName = (setById(boss.afterSet) || {}).name || boss.afterSet;
            const list = [{
                id: 'mastery',
                label: `Own every ${setName} card (promos too) and 2 copies of each non-promo one`,
                done: m.done, progress: `${m.have}/${m.total}`
            }, {
                id: 'streak',
                label: `Win ${target} games in a row against this boss`,
                done: rec.cycle.streakDone,
                progress: rec.cycle.streakDone ? `${target}/${target}` : `${rec.cycle.streak}/${target}`
            }];
            for (const type of RAID_TYPES) {
                list.push({ id: `type_${type}`, type, label: `Win with a deck of at least ${RAID_TYPE_TARGET} ${type} creature cards`,
                    done: !!rec.cycle.types[type], progress: rec.cycle.types[type] ? '1/1' : '0/1' });
            }
            for (const t of MYTHIC_TASKS) {
                list.push({ id: t.id, label: t.label, done: !!rec.cycle.types[t.id], progress: rec.cycle.types[t.id] ? '1/1' : '0/1' });
            }
            return list;
        }
        const list = [{
            id: 'copies',
            label: `Have ${RAID_NORMAL_COPIES} copies of the normal ${boss.card.name}`,
            done: owned >= RAID_NORMAL_COPIES,
            progress: `${Math.min(owned, RAID_NORMAL_COPIES)}/${RAID_NORMAL_COPIES}`
        }, {
            id: 'streak',
            label: `Win ${RAID_STREAK_TARGET} games in a row against this boss`,
            done: rec.cycle.streakDone,
            progress: rec.cycle.streakDone ? `${RAID_STREAK_TARGET}/${RAID_STREAK_TARGET}`
                : `${rec.cycle.streak}/${RAID_STREAK_TARGET}`
        }];
        for (const type of RAID_TYPES) {
            list.push({
                id: `type_${type}`,
                type,
                label: `Win with a deck of at least ${RAID_TYPE_TARGET} ${type} creature cards`,
                done: !!rec.cycle.types[type],
                progress: rec.cycle.types[type] ? '1/1' : '0/1'
            });
        }
        return list;
    },

    /** Everything the Raid Bosses page shows for one boss. */
    status(boss) {
        const rec = this.peek(boss.id);
        const tasks = this.tasks(boss);
        const week = raidWeekKey();
        return {
            boss,
            rec,
            tasks,
            unlocked: this.isUnlocked(boss),
            owned: Profile.owned(boss.cardId),
            done: tasks.filter(t => t.done).length,
            total: tasks.length,
            fullArtOwned: Profile.ownedFullArt(boss.cardId),
            completed: rec.completions > 0,
            creditThisWeek: rec.lastCreditWeek === week
        };
    },

    /** Bosses beaten at least once, for the raid missions. */
    completedCount() {
        if (!Profile.s) return 0;
        return ALL_RAID_BOSSES.filter(b => (Profile.s.raids[b.id] || {}).completions > 0).length;
    },

    /** Bosses with a rematch credit waiting for room under the cap. */
    pendingCount() {
        if (!Profile.s) return 0;
        return ALL_RAID_BOSSES.filter(b => (Profile.s.raids[b.id] || {}).pendingCredit > 0).length;
    },

    // -----------------------------------------------------------------------
    // Results (called by Profile when a raid match ends)
    // -----------------------------------------------------------------------

    /**
     * @param {{bossId, types}} raid what Profile.startMatch stored
     * @param {'win'|'loss'|'draw'} result
     * @returns {{lines: string[], fullArt: string|null, completed: boolean}}
     */
    onResult(raid, result, { forfeit = false } = {}) {
        const out = { lines: [], fullArt: null, completed: false };
        const boss = raid && this.find(raid.bossId);
        if (!boss) return out;
        const rec = this.record(boss.id);
        rec.played++;

        if (result === 'win') {
            rec.won++;
            rec.streak++;
            rec.bestStreak = Math.max(rec.bestStreak, rec.streak);
            rec.cycle.streak++;
            if (rec.cycle.streak >= raidStreakTarget(boss)) rec.cycle.streakDone = true;
            const fresh = [];
            const keys = boss.mythical ? RAID_TASK_KEYS : RAID_TYPES;
            for (const type of raid.types || []) {
                if (keys.includes(type) && !rec.cycle.types[type]) {
                    rec.cycle.types[type] = true;
                    fresh.push(type);
                }
            }
            if (fresh.length) out.lines.push(`🐉 Raid task done: a win with ${fresh.map(raidTaskName).join(' and ')}.`);
        } else if (result === 'loss') {
            rec.lost++;
            if (forfeit) rec.forfeits++;
            if (rec.cycle.streak > 0 && !rec.cycle.streakDone) {
                out.lines.push(`🐉 Your raid streak against ${boss.card.name} was reset.`);
            }
            rec.streak = 0;
            rec.cycle.streak = 0;
        } else {
            rec.drawn++;
        }

        const tasks = this.tasks(boss);
        const allDone = tasks.every(t => t.done);
        if (allDone && result === 'win') {
            this._complete(boss, rec, out);
        } else if (!forfeit) {
            const done = tasks.filter(t => t.done).length;
            const streak = rec.cycle.streakDone ? 'done' : `${rec.cycle.streak}/${raidStreakTarget(boss)}`;
            out.lines.push(`🐉 Raid tasks ${done}/${tasks.length} · streak ${streak}`);
        }
        return out;
    },

    _complete(boss, rec, out) {
        out.completed = true;
        const first = rec.completions === 0;
        rec.completions++;
        rec.cycle = this.blankCycle();
        if (first && boss.mythical) {
            // The Mythical card itself: the only way to get it, one copy.
            rec.firstCompletedAt = Date.now();
            if (!Profile.owned(boss.cardId)) Profile._addCard(boss.cardId);
            out.mythical = boss.cardId;
            out.lines.push(`🌟 Mythical raid complete! ${boss.card.name} joins your collection.`);
            return;
        }
        if (first) {
            rec.firstCompletedAt = Date.now();
            Profile.s.fullArt[boss.cardId] = (Profile.s.fullArt[boss.cardId] || 0) + 1;
            out.fullArt = boss.cardId;
            out.lines.push(`✦ Raid complete! You won the full-art ${boss.card.name}.`);
            return;
        }
        const week = raidWeekKey();
        if (rec.lastCreditWeek === week) {
            out.lines.push(`✦ Raid complete again. You already earned this week's rematch credit for ${boss.card.name}; the next one is from Monday.`);
            return;
        }
        rec.lastCreditWeek = week;
        if (Profile._addCredits(1) > 0) {
            out.lines.push(`✦ Raid complete again: 🪙 +1 rematch credit (1 per boss each week).`);
        } else {
            rec.pendingCredit = 1;
            out.lines.push(`✦ Raid complete again. Your credits are full, so the rematch credit waits on the Raid Bosses page.`);
        }
    },

    /** Pays a rematch credit that was earned while credits were full. */
    claimCredit(bossId) {
        const rec = Profile.s.raids[bossId];
        if (!rec || !rec.pendingCredit) return { error: 'No credit waiting.' };
        Profile.regen();
        if (Profile.s.credits >= MAX_CREDITS) {
            return { error: `Your credits are full (${MAX_CREDITS}/${MAX_CREDITS}). Spend some first.` };
        }
        Profile._addCredits(1);
        rec.pendingCredit = 0;
        Profile.touch('raid-credit', { immediate: true });
        return { success: true };
    },

    // -----------------------------------------------------------------------
    // Boss decks
    // -----------------------------------------------------------------------

    _units: null,

    /** Every evolution line (or single creature) in the card pool. */
    units() {
        if (this._units) return this._units;
        const seen = new Set();
        const units = [];
        for (const card of cardDatabase) {
            if (!isCreature(card) || seen.has(card.id)) continue;
            const line = raidLineOf(card);
            for (const c of line) seen.add(c.id);
            const energy = new Set(line.flatMap(c => [...energyTypesUsedBy(c)]));
            const score = Math.max(0, ...line.map(c => RAID_STRONG_CARDS[c.id] || 0));
            units.push({
                ids: line.map(c => c.id),
                type: getCardType(card),
                energy,
                promo: line.some(raidIsPromo),
                strong: score > 0,
                score,
                sets: [...new Set(line.map(c => c.set))]
            });
        }
        this._units = units;
        return units;
    },

    /**
     * A fresh random deck for a boss.
     * @param {object} boss from bosses() / find()
     * @param {object} [opts] { isSetOpen(setId) → bool, rng }
     * @returns {{name, type, cards, energyTypes, fullArt, mainType, bossId}|null}
     */
    generateDeck(boss, opts = {}) {
        let isSetOpen = opts.isSetOpen || (setId => !Profile.s || Profile.isSetUnlocked(setId));
        // A Mythical boss only uses cards from the sets up to the one that opens it.
        if (boss.mythical && boss.afterSet) {
            const limit = cardSets.findIndex(s => s.id === boss.afterSet);
            const open = isSetOpen;
            isSetOpen = setId => cardSets.findIndex(s => s.id === setId) <= limit && open(setId);
        }
        const rng = opts.rng || Rng;
        const card = boss.card || getCardData(boss.cardId);
        if (!card) return null;

        // A Neutral boss can lead a deck of any one type, or stay all Neutral.
        // Stronger types come up more often (RAID_TYPE_WEIGHTS).
        const options = getCardType(card) === 'Neutral' ? ['Neutral'].concat(ENERGY_TYPES) : [getCardType(card)];
        const pickType = () => {
            const total = options.reduce((sum, t) => sum + (RAID_TYPE_WEIGHTS[t] || 1), 0);
            let roll = rng.float() * total;
            for (const t of options) if ((roll -= RAID_TYPE_WEIGHTS[t] || 1) < 0) return t;
            return options[options.length - 1];
        };
        for (const strongOnly of [true, false]) {
            for (let attempt = 0; attempt < 60; attempt++) {
                const mainType = pickType();
                const deck = this._tryBuild(card, mainType, { isSetOpen, rng, strongOnly });
                if (deck) return Object.assign(deck, { bossId: boss.id }, boss.mythical ? { fullArt: {}, name: `Mythical Raid: ${card.name}` } : {});
            }
        }
        return null;
    },

    _tryBuild(bossCard, mainType, { isSetOpen, rng, strongOnly }) {
        // Promo stages stay out, unless the boss itself is a promo (Cryostone,
        // Sushimi): then its own line is the deck's core.
        const family = raidBossLine(bossCard).filter(c => !raidIsPromo(c) || raidIsPromo(bossCard));
        const familyIds = new Set(family.map(c => c.id));
        const cards = [];
        for (const c of family) cards.push(c.id, c.id);

        const itemSlots = 5 + rng.int(2);   // 5 or 6 items
        let creatureSlots = DECK_SIZE - cards.length - itemSlots;
        if (creatureSlots < 0) return null;

        const pool = this.units().filter(u =>
            !u.promo &&
            !u.ids.some(id => familyIds.has(id)) &&
            u.sets.every(isSetOpen) &&
            (strongOnly ? u.strong : true) &&
            (mainType === 'Neutral' ? u.type === 'Neutral' : (u.type === mainType || u.type === 'Neutral')) &&
            [...u.energy].every(t => t === mainType));

        // Weighted draw without replacement: the better a line did in the
        // simulation, the likelier it is picked (a 79% line is about 12 times
        // as likely as a 51% one). Unlisted lines are a last resort.
        const weight = u => (u.strong ? Math.pow(Math.max(2, u.score - 40), 2) : 4);
        const left = pool.slice();
        const singles = [];
        while (creatureSlots > 0 && left.length) {
            const total = left.reduce((sum, u) => sum + weight(u), 0);
            let roll = rng.float() * total;
            let index = 0;
            while (index < left.length - 1 && (roll -= weight(left[index])) > 0) index++;
            const unit = left.splice(index, 1)[0];
            if (unit.ids.length === 1) {
                const copies = Math.min(creatureSlots, 1 + rng.int(2));
                for (let i = 0; i < copies; i++) cards.push(unit.ids[0]);
                creatureSlots -= copies;
                if (copies === 1) singles.push(unit.ids[0]);
            } else if (unit.ids.length * 2 <= creatureSlots) {
                for (const id of unit.ids) cards.push(id, id);
                creatureSlots -= unit.ids.length * 2;
            }
        }
        // Top up single creatures to 2 copies before giving up on the slots.
        while (creatureSlots > 0 && singles.length) {
            cards.push(singles.pop());
            creatureSlots--;
        }
        if (creatureSlots > 0) return null;

        // Items: 2 Card Draw, then the item for the deck's type (Amulet too
        // when Neutral creatures do much of the fighting), then the proven
        // damage and healing items, then the rest.
        const creatureData = cards.map(getCardData).filter(d => d && isCreature(d));
        const types = new Set(creatureData.map(getCardType));
        const neutralCards = creatureData.filter(d => getCardType(d) === 'Neutral').length;
        const itemOk = id => {
            const data = getCardData(id);
            if (!data || !isSetOpen(data.set)) return false;
            const needs = TYPE_SPECIFIC_ITEMS[data.itemEffect];
            return !needs || types.has(needs);
        };
        const items = [];
        const addItem = (id, copies) => {
            for (let i = 0; i < copies && items.length < itemSlots; i++) {
                if (items.filter(x => x === id).length < MAX_COPIES) items.push(id);
            }
        };
        addItem(RAID_DRAW_ITEM, 2);
        const needsOf = id => TYPE_SPECIFIC_ITEMS[getCardData(id).itemEffect];
        const typed = RAID_ITEMS.filter(id => id !== RAID_DRAW_ITEM && itemOk(id) && (
            needsOf(id) === mainType || (needsOf(id) === 'Neutral' && neutralCards >= 6)));
        for (const id of typed) addItem(id, 1 + rng.int(2));
        const pick = list => rng.shuffle(list.filter(id => itemOk(id) && !typed.includes(id)));
        for (const id of pick(RAID_CORE_ITEMS)) addItem(id, 1 + rng.int(2));
        for (const id of pick(RAID_ITEMS.filter(id => id !== RAID_DRAW_ITEM && !RAID_CORE_ITEMS.includes(id)))) addItem(id, 1);
        if (items.length < itemSlots) return null;
        cards.push(...items);

        const energyTypes = mainType === 'Neutral' ? ENERGY_TYPES.slice() : [mainType];
        if (cards.length !== DECK_SIZE) return null;
        if (!validateDeck(cards).valid) return null;
        if (presetCompositionProblems(cards).length) return null;
        if (energyTypeWarnings(cards, energyTypes).length) return null;

        return {
            name: `Raid Boss: ${bossCard.name}`,
            type: 'raid',
            cards,
            energyTypes,
            fullArt: { [bossCard.id]: 2 },
            mainType
        };
    }
};

/** Promo cards never go into a boss deck. Reads the collection data directly,
 *  so it also works on the test pages, where Collection.init never runs. */
function raidIsPromo(card) {
    if (card.promo) return true;
    const meta = typeof CARD_COLLECTION_DATA !== 'undefined' && CARD_COLLECTION_DATA[card.id];
    return !!(meta && meta.promo);
}

/**
 * The boss card's own evolution path: what it evolves from and into, but not
 * sibling branches. Rustarok's deck gets Vulpetta and Rustarok, not Vulpetta's
 * three other evolutions of other types.
 */
function raidBossLine(card) {
    const path = [card];
    for (let cur = card; cur.prevStageIds && cur.prevStageIds.length;) {
        cur = getCardData(cur.prevStageIds[0]);
        if (!cur || path.includes(cur)) break;
        path.unshift(cur);
    }
    const stack = (card.nextStageIds || []).slice();
    while (stack.length) {
        const next = getCardData(stack.pop());
        if (!next || path.includes(next)) continue;
        path.push(next);
        stack.push(...(next.nextStageIds || []));
    }
    const order = { 'Stage 1': 1, 'Stage 2': 2, 'Stage 3': 3 };
    return path.sort((a, b) => (order[a.stage] || 9) - (order[b.stage] || 9));
}

/** A card's whole evolution line, in stage order. */
function raidLineOf(card) {
    const seen = new Set();
    const stack = [card.id];
    while (stack.length) {
        const id = stack.pop();
        if (seen.has(id)) continue;
        seen.add(id);
        const d = getCardData(id);
        if (d) stack.push(...(d.prevStageIds || []), ...(d.nextStageIds || []));
    }
    const order = { 'Stage 1': 1, 'Stage 2': 2, 'Stage 3': 3 };
    return [...seen].map(getCardData).filter(Boolean).sort((a, b) => (order[a.stage] || 9) - (order[b.stage] || 9));
}
