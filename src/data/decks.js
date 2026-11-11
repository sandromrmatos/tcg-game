// ============================================================================
// DECK LIBRARY
//
// Preset decks (from preset-decks.js) plus the player's saved custom decks.
// Deck validation lives here so the builder, the preset list and the startup
// validator all agree on what a legal deck is.
// ============================================================================

const DECK_SIZE = 20;
const MAX_COPIES = 2;

const DeckLibrary = {
    decks: [],

    /**
     * Rebuilds the list:
     *   preset - the AI's decks (the player cannot pick these outside QA mode)
     *   custom - the player's decks, built from owned cards, kept in the save
     *   test   - QA-only decks built from any card, kept in localStorage
     *
     * Without a Profile (test.html) custom decks are empty.
     */
    load() {
        const entry = (d, type) => ({
            name: d.name,
            type,
            cards: d.cards.slice(),
            energyTypes: deckEnergyTypes(d),
            fullArt: cleanFullArt(d.fullArt, d.cards)
        });
        this.decks = presetDeckLists.map(d => Object.assign(entry(d, 'preset'), {
            // The set that has to be unlocked before the AI may pick this deck.
            set: d.set || cardSets[0].id
        }));

        for (const custom of this.loadCustomDecks()) this.decks.push(entry(custom, 'custom'));
        for (const test of this.loadTestDecks()) this.decks.push(entry(test, 'test'));
        // The raid boss deck of the current (or last) raid game, rebuilt at
        // random for every raid game. Kept last so the other indexes stay put.
        if (this.raidDeck) this.decks.push(this.raidDeck);
        if (this.pvpDeck) this.decks.push(this.pvpDeck);
        return this.decks;
    },

    raidDeck: null,

    // The other player's deck during an online game (pvp.js). Removed after.
    pvpDeck: null,

    /** Puts the online opponent's deck in the library; returns its index. */
    setPvpDeck(deck) {
        this.clearPvpDeck();
        this.pvpDeck = {
            name: deck.name,
            type: 'pvp',
            cards: deck.cards.slice(),
            energyTypes: deckEnergyTypes(deck),
            fullArt: cleanFullArt(deck.fullArt, deck.cards)
        };
        this.decks.push(this.pvpDeck);
        return this.decks.length - 1;
    },

    clearPvpDeck() {
        if (!this.pvpDeck) return;
        const old = this.decks.indexOf(this.pvpDeck);
        if (old !== -1) this.decks.splice(old, 1);
        this.pvpDeck = null;
    },

    /** Puts a freshly generated raid boss deck in the library; returns its index. */
    setRaidDeck(deck) {
        if (this.raidDeck) {
            const old = this.decks.indexOf(this.raidDeck);
            if (old !== -1) this.decks.splice(old, 1);
        }
        this.raidDeck = Object.assign({}, deck, {
            type: 'raid',
            cards: deck.cards.slice(),
            energyTypes: deckEnergyTypes(deck),
            fullArt: cleanFullArt(deck.fullArt, deck.cards)
        });
        this.decks.push(this.raidDeck);
        return this.decks.length - 1;
    },

    all() {
        return this.decks;
    },

    get(index) {
        return this.decks[index] || null;
    },

    presets() {
        return this.decks.filter(d => d.type === 'preset');
    },

    /**
     * The presets the AI may pick in a real game. A deck tied to a later set
     * (the Galactic Adventures decks) only joins once the player has unlocked
     * drawing from that set. Without a Profile (test pages) every preset counts.
     */
    aiPresets() {
        return this.presets().filter(d => !this.hasProfile() || Profile.isSetUnlocked(d.set));
    },

    /** The decks the player can play with normally. */
    playerDecks() {
        return this.decks.filter(d => d.type === 'custom');
    },

    indexOf(deck) {
        return this.decks.indexOf(deck);
    },

    // -----------------------------------------------------------------------
    // Persistence: player decks live in the Profile save, test decks in a
    // separate localStorage key that never goes into the save file.
    // -----------------------------------------------------------------------

    hasProfile() {
        return typeof Profile !== 'undefined' && !!Profile.s;
    },

    loadCustomDecks() {
        return this.hasProfile() ? Profile.decks() : [];
    },

    saveCustomDeck(name, cards, previousName = null, energyTypes = null, fullArt = null) {
        if (!this.hasProfile()) return;
        Profile.saveDeck(name, cards, previousName, energyTypes, fullArt);
        this.load();
    },

    deleteCustomDeck(name) {
        if (!this.hasProfile()) return;
        Profile.deleteDeck(name);
        this.load();
    },

    findCustom(name) {
        return this.loadCustomDecks().find(d => d.name === name) || null;
    },

    TEST_KEY: 'tcg_qa_test_decks',

    loadTestDecks() {
        try {
            const parsed = JSON.parse(localStorage.getItem(this.TEST_KEY) || '[]');
            return Array.isArray(parsed) ? parsed.filter(d => d && d.name && Array.isArray(d.cards)) : [];
        } catch (err) {
            return [];
        }
    },

    saveTestDeck(name, cards, previousName = null, energyTypes = null, fullArt = null) {
        const keep = this.loadTestDecks().filter(d => d.name !== name && d.name !== previousName);
        keep.push({ name, cards: cards.slice(), energyTypes: cleanEnergyTypes(energyTypes), fullArt: cleanFullArt(fullArt, cards) });
        try { localStorage.setItem(this.TEST_KEY, JSON.stringify(keep)); } catch (err) { console.error(err); }
        this.load();
    },

    deleteTestDeck(name) {
        const keep = this.loadTestDecks().filter(d => d.name !== name);
        try { localStorage.setItem(this.TEST_KEY, JSON.stringify(keep)); } catch (err) { console.error(err); }
        this.load();
    },

    findTest(name) {
        return this.loadTestDecks().find(d => d.name === name) || null;
    }
};

/**
 * Validates a list of card ids against the deck construction rules.
 * @returns {{valid: boolean, error?: string}}
 */
function validateDeck(cardIds) {
    if (!cardIds || cardIds.length === 0) {
        return { valid: false, error: 'The deck is empty.' };
    }
    if (cardIds.length !== DECK_SIZE) {
        return {
            valid: false,
            error: `A deck needs exactly ${DECK_SIZE} cards (currently ${cardIds.length}).`
        };
    }

    const counts = new Map();
    for (const id of cardIds) {
        counts.set(id, (counts.get(id) || 0) + 1);
    }
    for (const [id, count] of counts) {
        if (count > MAX_COPIES) {
            const data = getCardData(id);
            return {
                valid: false,
                error: `At most ${MAX_COPIES} copies of ${data ? data.name : id}.`
            };
        }
    }

    const hasStage1 = cardIds.some(id => {
        const data = getCardData(id);
        return data && data.stage === 'Stage 1';
    });
    if (!hasStage1) {
        return { valid: false, error: 'A deck needs at least one Stage 1 creature.' };
    }

    // Types mix freely now that energy is typed: a creature whose moves need
    // an energy type the deck doesn't use is a warning (energyTypeWarnings),
    // not an error.
    for (const id of cardIds) {
        if (!getCardData(id)) return { valid: false, error: `Unknown card: ${id}` };
    }

    return { valid: true };
}

/**
 * A deck's primary type: the non-Neutral creature type it has most cards of,
 * or 'Neutral' for a deck of only Neutral creatures. Used for "win against a
 * Mystic deck" style achievements and the AI deck labels.
 */
function deckPrimaryType(cardIds) {
    const counts = {};
    for (const id of cardIds || []) {
        const data = getCardData(id);
        if (!data || !isCreature(data)) continue;
        const type = getCardType(data);
        if (type !== 'Neutral') counts[type] = (counts[type] || 0) + 1;
    }
    let best = 'Neutral', most = 0;
    for (const type of CREATURE_TYPES) {
        if ((counts[type] || 0) > most) { best = type; most = counts[type]; }
    }
    return best;
}

/**
 * The energy types a deck starts with when none were chosen: its main type.
 * A Neutral-only deck's moves accept any energy, so it gets all four.
 */
function defaultDeckEnergyTypes(cardIds) {
    const type = deckPrimaryType(cardIds);
    return ENERGY_TYPES.includes(type) ? [type] : ENERGY_TYPES.slice();
}

/** A clean list of energy types: known types, no repeats, in the standard order. */
function cleanEnergyTypes(types) {
    const set = new Set(Array.isArray(types) ? types : []);
    return ENERGY_TYPES.filter(t => set.has(t));
}

/** The energy types a deck uses in a game. */
function deckEnergyTypes(deck) {
    const chosen = cleanEnergyTypes(deck && deck.energyTypes);
    return chosen.length ? chosen : defaultDeckEnergyTypes(deck ? deck.cards : []);
}

/**
 * Creatures whose moves name an energy type the deck doesn't use. Legal, but
 * those moves (or all of the creature's moves) can never be paid for.
 */
function energyTypeWarnings(cardIds, energyTypes) {
    const have = new Set(energyTypes);
    const out = [];
    for (const id of new Set(cardIds)) {
        const data = getCardData(id);
        if (!data || !isCreature(data)) continue;
        const missing = [...energyTypesUsedBy(data)].filter(t => !have.has(t));
        if (missing.length) out.push(`${data.name} needs ${missing.join(' and ')} energy, which this deck doesn't use.`);
    }
    return out;
}

/**
 * A deck's full-art copies as a clean map { cardId: count }: only cards that
 * have a full-art version, and never more full-art copies than the deck holds.
 */
function cleanFullArt(fullArt, cardIds) {
    const out = {};
    if (!fullArt || typeof fullArt !== 'object') return out;
    const counts = new Map();
    for (const id of cardIds || []) counts.set(id, (counts.get(id) || 0) + 1);
    for (const [id, n] of Object.entries(fullArt)) {
        const k = Math.min(Math.max(0, Math.floor(Number(n) || 0)), counts.get(id) || 0);
        if (k > 0 && typeof hasFullArt === 'function' && hasFullArt(id)) out[id] = k;
    }
    return out;
}

/**
 * A deck list grouped for display: one entry per card and version, e.g.
 * [{ id, fullArt: true, count: 1 }, { id, fullArt: false, count: 1 }].
 */
function deckEntries(cardIds, fullArt) {
    const fa = cleanFullArt(fullArt, cardIds);
    const counts = new Map();
    for (const id of cardIds || []) counts.set(id, (counts.get(id) || 0) + 1);
    const out = [];
    for (const [id, n] of counts) {
        const f = fa[id] || 0;
        if (f > 0) out.push({ id, fullArt: true, count: f });
        if (n - f > 0) out.push({ id, fullArt: false, count: n - f });
    }
    return out;
}

/** Items that only work with one creature type, and the type they need. */
const TYPE_SPECIFIC_ITEMS = {
    energyAntenna: 'Mechanic',
    healingCrystal: 'Celestial',
    galeShield: 'Wind',
    mysticScroll: 'Mystic',
    amulet: 'Neutral'
};

/**
 * The house rules for the AI's preset decks (player decks are free to break
 * them): an evolution line is complete, with 2 copies of every stage, and an
 * item that only works with one creature type is only in decks that have
 * that type.
 */
function presetCompositionProblems(cardIds) {
    const problems = [];
    const counts = new Map();
    for (const id of cardIds) counts.set(id, (counts.get(id) || 0) + 1);

    // Walk each line from every card, in both directions, within the set.
    const lineOf = data => {
        const seen = new Set();
        const stack = [data.id];
        while (stack.length) {
            const id = stack.pop();
            if (seen.has(id)) continue;
            seen.add(id);
            const d = getCardData(id);
            if (!d) continue;
            stack.push(...(d.prevStageIds || []), ...(d.nextStageIds || []));
        }
        return [...seen].map(getCardData).filter(Boolean);
    };
    const reported = new Set();
    for (const id of counts.keys()) {
        const data = getCardData(id);
        if (!data || !isCreature(data)) continue;
        const evolves = (data.prevStageIds || []).length || (data.nextStageIds || []).length;
        if (!evolves) continue;
        const line = lineOf(data);
        const key = line.map(c => c.id).sort().join('|');
        if (reported.has(key)) continue;
        // Promo stages can't be in an AI deck, so they don't count towards a line.
        let stages = line.filter(c => !c.promo);
        // A line that branches (Vulpetta evolves into four creatures) only
        // needs the branches the deck uses, plus everything they evolve from.
        if (line.some(c => (c.nextStageIds || []).length > 1)) {
            const needed = new Set();
            const addWithAncestors = d => {
                if (!d || needed.has(d.id)) return;
                needed.add(d.id);
                for (const prev of d.prevStageIds || []) addWithAncestors(getCardData(prev));
            };
            for (const c of line) if (counts.has(c.id)) addWithAncestors(c);
            stages = stages.filter(c => needed.has(c.id));
        }
        const missing = stages.filter(c => !counts.has(c.id));
        const single = stages.filter(c => counts.get(c.id) === 1);
        if (missing.length || single.length) {
            reported.add(key);
            const names = stages.map(c => c.name).join(' → ');
            if (missing.length) problems.push(`${names} is incomplete: no ${missing.map(c => c.name).join(', ')}.`);
            if (single.length) problems.push(`${names} has only 1 ${single.map(c => c.name).join(', 1 ')} (should be 2 of each stage).`);
        }
    }

    const types = new Set([...counts.keys()].map(getCardData).filter(d => d && isCreature(d)).map(getCardType));
    for (const id of counts.keys()) {
        const data = getCardData(id);
        const needs = data && (TYPE_SPECIFIC_ITEMS[data.itemEffect] || (isAccessory(data) ? data.accessoryType : null));
        if (needs && !types.has(needs)) problems.push(`${data.name} only works with ${needs} creatures, and the deck has none.`);
    }
    return problems;
}

/**
 * Warnings that don't make a deck illegal but usually mean a mistake, such as
 * an evolution whose pre-evolution isn't in the deck.
 */
function deckWarnings(cardIds) {
    const warnings = [];
    const present = new Set(cardIds);

    for (const id of new Set(cardIds)) {
        const data = getCardData(id);
        if (!data || !data.prevStage) continue;
        const hasPrevious = data.prevStageIds.some(prevId => present.has(prevId));
        if (!hasPrevious) {
            warnings.push(`${data.name} needs ${data.prevStage} in the deck to evolve.`);
        }
    }
    return warnings;
}
