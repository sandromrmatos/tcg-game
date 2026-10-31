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
        this.decks = presetDeckLists.map(d => ({
            name: d.name,
            type: 'preset',
            cards: d.cards.slice()
        }));

        for (const custom of this.loadCustomDecks()) {
            this.decks.push({ name: custom.name, type: 'custom', cards: custom.cards.slice() });
        }
        for (const test of this.loadTestDecks()) {
            this.decks.push({ name: test.name, type: 'test', cards: test.cards.slice() });
        }
        return this.decks;
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

    saveCustomDeck(name, cards, previousName = null) {
        if (!this.hasProfile()) return;
        Profile.saveDeck(name, cards, previousName);
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

    saveTestDeck(name, cards, previousName = null) {
        const keep = this.loadTestDecks().filter(d => d.name !== name && d.name !== previousName);
        keep.push({ name, cards: cards.slice() });
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

    // Exactly one primary type; Neutral and Item cards mix with anything.
    let primary = null;
    for (const id of cardIds) {
        const data = getCardData(id);
        if (!data) return { valid: false, error: `Unknown card: ${id}` };

        const type = getCardType(data);
        if (type === 'Neutral' || type === 'Item') continue;

        if (!primary) primary = type;
        else if (type !== primary) {
            return {
                valid: false,
                error: `A deck can't mix ${primary} and ${type}. Only Neutral and Item cards mix freely.`
            };
        }
    }

    return { valid: true };
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
