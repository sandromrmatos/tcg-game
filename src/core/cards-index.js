// ============================================================================
// CARD INDEX
//
// Builds fast lookups over cardDatabase and resolves evolution links from names
// to concrete card ids.
//
// Why: the original code matched evolutions on `prevStage` by NAME, but names
// are not unique (four cards are named "Antheara", two "Meerkool"). A third set
// reusing an existing creature name would have silently cross-wired evolution.
// Here each evolution card gets `prevStageIds`, resolved WITHIN ITS OWN SET, so
// a set-3 "Traplet" can never evolve into set-1 "Traphex".
// ============================================================================

const CardIndex = {
    byId: new Map(),
    bySet: new Map(),      // setId -> card[] sorted by collector number
    built: false,

    build() {
        this.byId.clear();
        this.bySet.clear();
        for (const set of cardSets) this.bySet.set(set.id, []);

        for (const card of cardDatabase) {
            const set = setForCardId(card.id);
            // `set` is derived, never hand-written, so data can't disagree with
            // the registry. validate.js reports any card with no matching set.
            card.set = set ? set.id : null;
            card.number = cardNumber(card.id);
            this.byId.set(card.id, card);
            if (set) this.bySet.get(set.id).push(card);
        }

        for (const list of this.bySet.values()) {
            list.sort((a, b) => a.number - b.number);
        }

        this.resolveEvolutionLinks();
        this.built = true;
    },

    /**
     * Turns `prevStage` (a name) into `prevStageIds` (concrete ids), preferring
     * candidates in the same set. Also records the reverse link.
     */
    resolveEvolutionLinks() {
        for (const card of cardDatabase) {
            card.prevStageIds = [];
            card.nextStageIds = [];
        }

        for (const card of cardDatabase) {
            if (!card.prevStage) continue;

            const sameSet = cardDatabase.filter(
                c => c.name === card.prevStage && c.set === card.set
            );
            const anySet = cardDatabase.filter(c => c.name === card.prevStage);
            const candidates = sameSet.length > 0 ? sameSet : anySet;

            card.prevStageIds = candidates.map(c => c.id);
            for (const c of candidates) c.nextStageIds.push(card.id);
        }
    },

    get(cardId) {
        return this.byId.get(cardId) || null;
    },

    inSet(setId) {
        return this.bySet.get(setId) || [];
    },

    all() {
        return cardDatabase;
    }
};

/** Card data by id. O(1). */
function getCardData(cardId) {
    return CardIndex.get(cardId);
}

/**
 * True if `evolutionCard` is a legal evolution of `targetCard`, ignoring
 * per-turn timing rules (those live in actions.js).
 */
function isEvolutionOf(evolutionCardData, targetCardData) {
    if (!evolutionCardData || !targetCardData) return false;
    return evolutionCardData.prevStageIds.includes(targetCardData.id);
}
