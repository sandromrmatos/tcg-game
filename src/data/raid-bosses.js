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
    { id: 'aeglet',    cardId: 'Elemental Awakening_63.png' },
    { id: 'spiritfoil', cardId: 'Elemental Awakening_12.png' },
    { id: 'teklash',    cardId: 'Galactic Adventures_02.png' },
    { id: 'starraffe',  cardId: 'Galactic Adventures_11.png' },
    { id: 'airsting',   cardId: 'Galactic Adventures_15.png' },
    { id: 'mystaeon',   cardId: 'Galactic Adventures_21.png' },
    { id: 'mousuckler', cardId: 'Galactic Adventures_45.png' },
    { id: 'cockatrike', cardId: 'Galactic Adventures_48.png' },
    { id: 'ectomango',  cardId: 'Galactic Adventures_65.png' },
    // Temporal Rift
    { id: 'anukibi',    cardId: 'Temporal Rift_04.png' },
    { id: 'rustarok',   cardId: 'Temporal Rift_11.png' },
    { id: 'cycloblaze', cardId: 'Temporal Rift_16.png' },
    { id: 'florinelle', cardId: 'Temporal Rift_24.png' },
    { id: 'mythloon',   cardId: 'Temporal Rift_27.png' },
    { id: 'nimbearis',  cardId: 'Temporal Rift_34.png' },
    { id: 'orkidia',    cardId: 'Temporal Rift_43.png' },
    { id: 'cryobbit',   cardId: 'Temporal Rift_49.png' },
    { id: 'cacklair',   cardId: 'Temporal Rift_55.png' },
    // Crystal Canopy (Cryostone and Sushimi are promos: their boss decks keep their own promo line)
    { id: 'berlimperador', cardId: 'Crystal Canopy_03.png' },
    { id: 'elaroo',     cardId: 'Crystal Canopy_07.png' },
    { id: 'stroopa',    cardId: 'Crystal Canopy_24.png' },
    { id: 'anemora',    cardId: 'Crystal Canopy_30.png' },
    { id: 'crimorae',   cardId: 'Crystal Canopy_37.png' },
    { id: 'rayvora',    cardId: 'Crystal Canopy_40.png' },
    { id: 'corleon',    cardId: 'Crystal Canopy_42.png' },
    { id: 'oculara',    cardId: 'Crystal Canopy_44.png' },
    { id: 'fizzelle',   cardId: 'Crystal Canopy_48.png' },
    { id: 'fillwrapp',  cardId: 'Crystal Canopy_55.png' },
    { id: 'legopeck',   cardId: 'Crystal Canopy_57.png' },
    { id: 'heliboo',    cardId: 'Crystal Canopy_63.png' },
    { id: 'ashquake',   cardId: 'Crystal Canopy_66.png' },
    { id: 'cryostone',  cardId: 'Crystal Canopy_82.png' },
    { id: 'sushimi',    cardId: 'Crystal Canopy_84.png' }
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
    'Galactic Adventures_10.png': 52,  // Meerkool (Warrior Mode)
    // Temporal Rift: the family test's win rates (tcg-family-test-temporal.xlsx)
    'Temporal Rift_39.png': 57,        // Terruffian → Yawnshire
    'Temporal Rift_19.png': 56,        // Tanglett → Tangrash
    'Temporal Rift_36.png': 55,        // Harpuddle
    'Temporal Rift_12.png': 55,        // Solyssa
    'Temporal Rift_48.png': 55,        // Eskiddo → Cryobbit
    'Temporal Rift_35.png': 54,        // Ignivault
    'Temporal Rift_24.png': 52,        // Florinelle → Lavandread → Thornaria
    // Crystal Canopy: the family test's win rates (tcg-family-test-crystal.xlsx)
    'Crystal Canopy_08.png': 55,       // Fructopus → Arborctton
    'Crystal Canopy_13.png': 55,       // Avokarn → Granocado
    'Crystal Canopy_41.png': 54,       // Reeflet → Corleon
    'Crystal Canopy_64.png': 53,       // Lavarocko → Ignistone → Ashquake
    'Crystal Canopy_58.png': 53,       // Breezeba → Twistulip
    'Crystal Canopy_52.png': 53,       // Folivern → Brambleon → Sylgroth
    'Crystal Canopy_47.png': 52        // Coralith → Fizzelle
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

/**
 * Mythical raids: the boss is a Mythical card (rarity 5), the reward is that
 * card, one copy. A Mythical raid opens once the player owns every card of
 * `afterSet` (promos included) and 2 copies of every non-promo card of it, and
 * its boss deck only uses cards from the sets up to `afterSet`.
 */
const MYTHICAL_BOSSES = [
    { id: 'astralyon',  cardId: 'mythical_01.png', mythical: true, afterSet: 'EA' },
    { id: 'chromarion', cardId: 'mythical_02.png', mythical: true, afterSet: 'GA' },
    { id: 'aetherave',  cardId: 'mythical_03.png', mythical: true, afterSet: 'TR' }
];

/** Every raid boss: the full-art ones, then the Mythical ones. */
const ALL_RAID_BOSSES = RAID_BOSSES.concat(MYTHICAL_BOSSES);

function raidBossById(id) {
    return ALL_RAID_BOSSES.find(b => b.id === id) || null;
}

/** The picture of a boss: its full art, or the Mythical card itself. */
function raidBossImage(boss) {
    return boss.mythical ? cardImage(boss.cardId) : fullArtImage(boss.cardId);
}

/** True if the card has a full-art version. */
function hasFullArt(cardId) {
    return RAID_BOSSES.some(b => b.cardId === cardId);
}

function fullArtImage(cardId) {
    return FULL_ART_DIR + cardId;
}

// ---- Shiny cards ------------------------------------------------------------
// The shiny version of a card: bought in the Store's Shiny shop for regular
// copies (SHINY_COST_COPIES of them, keeping SHINY_KEEP) and credits. Like
// full art it is cosmetic and plays exactly like the normal card. The art is
// in shiny/<card id>: the 64 Elemental Awakening creatures (no items, no promos).
const SHINY_DIR = 'shiny/';
const SHINY_SETS = ['EA'];
const SHINY_COST_COPIES = 10;    // regular copies traded in for one shiny
const SHINY_KEEP = 2;            // regular copies that must be left afterwards
const SHINY_COST_CREDITS = 5;

/** True if the card has a shiny version. */
function hasShiny(cardId) {
    const card = typeof getCardData === 'function' ? getCardData(cardId) : null;
    return !!card && SHINY_SETS.includes(card.set) && isCreature(card) && !card.promo;
}

function shinyImage(cardId) {
    return SHINY_DIR + cardId;
}

/**
 * The image for a card in one art version. `variant` is the art a card
 * instance or deck row carries in its `fullArt` field: false (normal), true
 * (full art) or 'shiny'. Falls back to the normal art if that version doesn't exist.
 */
function cardArt(cardId, variant = false) {
    if (variant === 'shiny') return hasShiny(cardId) ? shinyImage(cardId) : cardImage(cardId);
    return variant && hasFullArt(cardId) ? fullArtImage(cardId) : cardImage(cardId);
}

/** "✦ " for full art, "✨ " for shiny, "" for the normal art: a name prefix. */
function artMark(variant) {
    return variant === 'shiny' ? '✨ ' : variant ? '✦ ' : '';
}

/** "full art" / "shiny" / "" for labels. */
function artLabel(variant) {
    return variant === 'shiny' ? 'shiny' : variant ? 'full art' : '';
}
