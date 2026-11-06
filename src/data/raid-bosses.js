// ============================================================================
// RAID BOSSES AND FULL ART
//
// Every full-art card has an image in `Full art/`, with the same filename as
// the card id, and a raid boss that awards it. Adding a boss is one line here
// plus the image; the Raid Bosses page, missions and stats pick it up.
//
// RAID_STRONG_CARDS marks the creatures the boss decks are built from: each id
// stands for its whole evolution line, and its number is the average win rate
// of the AI decks that use the line in the 23,000-game simulation (see
// "TCG AI decks results.md"). Higher numbers are picked far more often. Lines
// only appear once their set is unlocked; lines that aren't listed are only
// used when a deck can't be filled from the listed ones.
// ============================================================================

const FULL_ART_DIR = 'Full art/';

const RAID_BOSSES = [
    { id: 'mystikeon', cardId: 'Elemental Awakening_11.png' },
    { id: 'dewmo',     cardId: 'Elemental Awakening_27.png' },
    { id: 'babybara',  cardId: 'Elemental Awakening_34.png' },
    { id: 'alpakina',  cardId: 'Elemental Awakening_39.png' },
    { id: 'aloebud',   cardId: 'Elemental Awakening_47.png' },
    { id: 'aeglet',    cardId: 'Elemental Awakening_63.png' }
];

const RAID_STRONG_CARDS = {
    // Mystic
    'Elemental Awakening_04.png': 51,  // Traplet → Traphex
    'Elemental Awakening_06.png': 51,  // Chimerasprout → Chimerafluff → Chimereal
    'Elemental Awakening_12.png': 51,  // Spiritfoil → Nebulicorn → Wraithhorn
    'Elemental Awakening_01.png': 44,  // Meditot → Zenquaza
    'Elemental Awakening_03.png': 44,  // Harmoniqueon
    'Elemental Awakening_09.png': 44,  // Pheonyx
    'Elemental Awakening_10.png': 44,  // Mystikid → Mystikeon
    // Wind
    'Elemental Awakening_16.png': 69,  // Aeruffin
    'Elemental Awakening_19.png': 69,  // Dodolet → Dodrift → Dodoryphon
    'Elemental Awakening_24.png': 69,  // Pyrosora
    'Elemental Awakening_25.png': 69,  // Batakaze → Shadowflit
    'Elemental Awakening_22.png': 52,  // Aeroquatic → Prismarine
    // Celestial
    'Elemental Awakening_42.png': 66,  // Rosbud → Rosalia
    'Elemental Awakening_44.png': 66,  // Verdanthorn
    'Elemental Awakening_50.png': 66,  // Floretta → Lizaflora
    'Galactic Adventures_50.png': 58,  // Beanling → Beanleaf → Beanknight
    'Galactic Adventures_12.png': 54,  // Trunket → Elefeir → Planterdon
    'Galactic Adventures_23.png': 54,  // Lumifloris → Photosynthra
    // Mechanic
    'Elemental Awakening_54.png': 72,  // Venomgear → Toxiforge
    'Elemental Awakening_56.png': 72,  // Envoye
    'Elemental Awakening_57.png': 72,  // Struto → Strutalon
    'Elemental Awakening_62.png': 71,  // Metamonk
    'Elemental Awakening_52.png': 55,  // Voltveil
    'Galactic Adventures_27.png': 58,  // Gearpup → Gearstrike
    'Galactic Adventures_29.png': 58,  // Steelspirit
    // Neutral
    'Galactic Adventures_06.png': 79,  // Anter → Antoro → Antaray
    'Galactic Adventures_44.png': 79,  // Mousuck → Mousuckler → Mousucklord
    'Elemental Awakening_33.png': 72,  // Antheara
    'Elemental Awakening_27.png': 66,  // Dewmo
    'Elemental Awakening_31.png': 66,  // Antheara (70 HP)
    'Elemental Awakening_32.png': 65,  // Antheara
    'Galactic Adventures_59.png': 57,  // Platypog → Fluffbill
    'Elemental Awakening_28.png': 54,  // Baklavaff → Galaktikreme
    'Elemental Awakening_34.png': 52,  // Babybara → Carmibara → Reddybara
    'Galactic Adventures_10.png': 52   // Meerkool (Warrior Mode)
};

/**
 * Items a boss deck may carry beyond its Card Draw. Type-specific items are
 * only added when the deck has creatures of that type (TYPE_SPECIFIC_ITEMS).
 */
const RAID_ITEMS = [
    'Elemental Awakening_66.png',  // Card Draw (always at least one)
    'Elemental Awakening_65.png',  // Potion
    'Elemental Awakening_67.png',  // Booster
    'Elemental Awakening_68.png',  // Power-Up
    'Galactic Adventures_67.png',  // Revive Crystal
    'Galactic Adventures_68.png',  // Shield Barrier
    'Galactic Adventures_66.png',  // Energy Antenna (Mechanic)
    'Galactic Adventures_70.png',  // Healing Crystal (Celestial)
    'Galactic Adventures_72.png',  // Amulet (Neutral)
    'Galactic Adventures_73.png',  // Gale Shield (Wind)
    'Galactic Adventures_74.png'   // Mystic Scroll (Mystic)
];

const RAID_DRAW_ITEM = 'Elemental Awakening_66.png';

/** The items the strongest AI decks lean on, picked before the others. */
const RAID_CORE_ITEMS = [
    'Elemental Awakening_65.png',  // Potion
    'Elemental Awakening_67.png',  // Booster
    'Elemental Awakening_68.png'   // Power-Up
];

function raidBossById(id) {
    return RAID_BOSSES.find(b => b.id === id) || null;
}

/** True if the card has a full-art version. */
function hasFullArt(cardId) {
    return RAID_BOSSES.some(b => b.cardId === cardId);
}

function fullArtImage(cardId) {
    return FULL_ART_DIR + cardId;
}

/** The image for a card, in its full-art version when asked and available. */
function cardArt(cardId, fullArt = false) {
    return fullArt && hasFullArt(cardId) ? fullArtImage(cardId) : cardImage(cardId);
}
