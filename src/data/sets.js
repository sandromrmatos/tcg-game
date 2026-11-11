// ============================================================================
// CARD SET REGISTRY
//
// This is the ONLY place a card set is declared. Adding a new set means adding
// one entry here and appending its cards to data/cards.js — the deck builder,
// card browser, image paths and validator all read from this list.
//
// `prefix` must match the leading portion of every card id in the set, and no
// prefix may be a prefix of another (validate.js enforces both).
// ============================================================================

const cardSets = [
    {
        id: 'EA',
        name: 'Elemental Awakening',
        prefix: 'Elemental Awakening_',
        accent: '#f0a63c'
    },
    {
        id: 'GA',
        name: 'Galactic Adventures',
        prefix: 'Galactic Adventures_',
        accent: '#7fd4ff'
    },
    {
        id: 'TR',
        name: 'Temporal Rift',
        prefix: 'Temporal Rift_',
        accent: '#c792ff'
    }
];

// Folder holding every card image, keyed by the card id (which is a filename).
const CARDS_IMAGE_DIR = 'cards/';

/** The single place card image URLs are built. */
function cardImage(cardId) {
    return CARDS_IMAGE_DIR + cardId;
}

/** Returns the set descriptor a card id belongs to, or null. */
function setForCardId(cardId) {
    return cardSets.find(s => cardId.startsWith(s.prefix)) || null;
}

function setById(setId) {
    return cardSets.find(s => s.id === setId) || null;
}

/**
 * Extracts the printed collector number from a card id.
 * "Galactic Adventures_07.png" -> 7
 */
function cardNumber(cardId) {
    const set = setForCardId(cardId);
    const rest = set ? cardId.slice(set.prefix.length) : cardId;
    const match = rest.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
}
