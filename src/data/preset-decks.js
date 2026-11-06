// Preset deck lists. Card ids only; validated at startup by validate.js.
//
// `set` is the card set the player must have unlocked before the AI can pick
// the deck (default: the first set). Promo cards never appear in AI decks.
// Galactic Adventures decks mix in Elemental Awakening cards, mostly items.
const presetEA = n => `Elemental Awakening_${String(n).padStart(2, '0')}.png`;
const presetGA = n => `Galactic Adventures_${String(n).padStart(2, '0')}.png`;
/** Two copies of each listed card. */
const presetTwoOf = (...ids) => ids.flatMap(id => [id, id]);

const presetDeckLists = [
    {
        name: "Mystic Deck",
        type: "preset",
        cards: [
            "Elemental Awakening_04.png", "Elemental Awakening_04.png",
            "Elemental Awakening_05.png", "Elemental Awakening_05.png",
            "Elemental Awakening_06.png", "Elemental Awakening_06.png",
            "Elemental Awakening_07.png", "Elemental Awakening_07.png",
            "Elemental Awakening_08.png", "Elemental Awakening_08.png",
            "Elemental Awakening_12.png", "Elemental Awakening_12.png",
            "Elemental Awakening_13.png", "Elemental Awakening_13.png",
            "Elemental Awakening_14.png", "Elemental Awakening_14.png",
            "Elemental Awakening_65.png", "Elemental Awakening_65.png",
            "Elemental Awakening_66.png",
            "Elemental Awakening_67.png"
        ]
    },
    {
        name: "Wind Deck",
        type: "preset",
        cards: [
            "Elemental Awakening_15.png", "Elemental Awakening_15.png",
            "Elemental Awakening_17.png", "Elemental Awakening_17.png",
            "Elemental Awakening_18.png", "Elemental Awakening_18.png",
            "Elemental Awakening_28.png", "Elemental Awakening_28.png",
            "Elemental Awakening_29.png", "Elemental Awakening_29.png",
            "Elemental Awakening_34.png", "Elemental Awakening_34.png",
            "Elemental Awakening_35.png", "Elemental Awakening_35.png",
            "Elemental Awakening_36.png", "Elemental Awakening_36.png",
            "Elemental Awakening_65.png",
            "Elemental Awakening_66.png", "Elemental Awakening_66.png",
            "Elemental Awakening_67.png"
        ]
    },
    {
        name: "Celestial Deck",
        type: "preset",
        cards: [
            "Elemental Awakening_39.png",
            "Elemental Awakening_40.png", "Elemental Awakening_40.png",
            "Elemental Awakening_41.png", "Elemental Awakening_41.png",
            "Elemental Awakening_45.png", "Elemental Awakening_45.png",
            "Elemental Awakening_46.png", "Elemental Awakening_46.png",
            "Elemental Awakening_47.png", "Elemental Awakening_47.png",
            "Elemental Awakening_48.png", "Elemental Awakening_48.png",
            "Elemental Awakening_49.png", "Elemental Awakening_49.png",
            "Elemental Awakening_65.png", "Elemental Awakening_65.png",
            "Elemental Awakening_66.png",
            "Elemental Awakening_67.png", "Elemental Awakening_67.png"
        ]
    },
    {
        name: "Mechanic Deck",
        type: "preset",
        cards: [
            "Elemental Awakening_37.png",
            "Elemental Awakening_38.png",
            "Elemental Awakening_52.png", "Elemental Awakening_52.png",
            "Elemental Awakening_53.png", "Elemental Awakening_53.png",
            "Elemental Awakening_59.png", "Elemental Awakening_59.png",
            "Elemental Awakening_60.png", "Elemental Awakening_60.png",
            "Elemental Awakening_61.png", "Elemental Awakening_61.png",
            "Elemental Awakening_63.png", "Elemental Awakening_63.png",
            "Elemental Awakening_64.png", "Elemental Awakening_64.png",
            "Elemental Awakening_65.png",
            "Elemental Awakening_66.png", "Elemental Awakening_66.png",
            "Elemental Awakening_67.png"
        ]
    },
    {
        name: "Mystic Deck 2",
        type: "preset",
        cards: [
            "Elemental Awakening_01.png", "Elemental Awakening_01.png",
            "Elemental Awakening_02.png", "Elemental Awakening_02.png",
            "Elemental Awakening_03.png", "Elemental Awakening_03.png",
            "Elemental Awakening_09.png", "Elemental Awakening_09.png",
            "Elemental Awakening_10.png", "Elemental Awakening_10.png",
            "Elemental Awakening_11.png", "Elemental Awakening_11.png",
            "Elemental Awakening_30.png", "Elemental Awakening_30.png",
            "Elemental Awakening_65.png",
            "Elemental Awakening_66.png", "Elemental Awakening_66.png",
            "Elemental Awakening_67.png",
            "Elemental Awakening_68.png",
            "Elemental Awakening_69.png"
        ]
    },
    {
        name: "Wind Deck 2",
        type: "preset",
        cards: [
            "Elemental Awakening_16.png", "Elemental Awakening_16.png",
            "Elemental Awakening_19.png", "Elemental Awakening_19.png",
            "Elemental Awakening_20.png", "Elemental Awakening_20.png",
            "Elemental Awakening_21.png", "Elemental Awakening_21.png",
            "Elemental Awakening_22.png", "Elemental Awakening_22.png",
            "Elemental Awakening_23.png", "Elemental Awakening_23.png",
            "Elemental Awakening_24.png",
            "Elemental Awakening_25.png",
            "Elemental Awakening_26.png",
            "Elemental Awakening_31.png",
            "Elemental Awakening_65.png",
            "Elemental Awakening_66.png",
            "Elemental Awakening_67.png",
            "Elemental Awakening_68.png"
        ]
    },
    {
        name: "Celestial Deck 2",
        type: "preset",
        cards: [
            "Elemental Awakening_27.png", "Elemental Awakening_27.png",
            "Elemental Awakening_32.png",
            "Elemental Awakening_42.png", "Elemental Awakening_42.png",
            "Elemental Awakening_43.png", "Elemental Awakening_43.png",
            "Elemental Awakening_44.png", "Elemental Awakening_44.png",
            "Elemental Awakening_50.png", "Elemental Awakening_50.png",
            "Elemental Awakening_51.png", "Elemental Awakening_51.png",
            "Elemental Awakening_65.png",
            "Elemental Awakening_66.png", "Elemental Awakening_66.png",
            "Elemental Awakening_67.png",
            "Elemental Awakening_68.png", "Elemental Awakening_68.png",
            "Elemental Awakening_69.png"
        ]
    },
    {
        name: "Mechanic Deck 2",
        type: "preset",
        cards: [
            "Elemental Awakening_33.png",
            "Elemental Awakening_54.png", "Elemental Awakening_54.png",
            "Elemental Awakening_55.png", "Elemental Awakening_55.png",
            "Elemental Awakening_56.png", "Elemental Awakening_56.png",
            "Elemental Awakening_57.png", "Elemental Awakening_57.png",
            "Elemental Awakening_58.png", "Elemental Awakening_58.png",
            "Elemental Awakening_62.png", "Elemental Awakening_62.png",
            "Elemental Awakening_65.png", "Elemental Awakening_65.png",
            "Elemental Awakening_66.png", "Elemental Awakening_66.png",
            "Elemental Awakening_67.png",
            "Elemental Awakening_68.png",
            "Elemental Awakening_69.png"
        ]
    },

    // ---- Elemental Awakening: Neutral only ---------------------------------
    {
        name: "Neutral Deck",
        type: "preset",
        set: "EA",
        cards: [
            ...presetTwoOf(presetEA(34), presetEA(35), presetEA(36)),          // Babybara → Carmibara → Reddybara
            ...presetTwoOf(presetEA(28), presetEA(29)),                  // Baklavaff → Galaktikreme
            ...presetTwoOf(presetEA(31), presetEA(32)),                  // Antheara (70 HP), Antheara (Long Tongue Sweep)
            ...presetTwoOf(presetEA(39)),                          // Alpakina
            ...presetTwoOf(presetEA(66)),                          // Card Draw
            presetEA(65), presetEA(67)                          // Potion, Booster
        ]
    },

    // ---- Galactic Adventures --------------------------------------------
    // Rules for these lists: every card in an evolution line has 2 copies,
    // and a line is always complete (all three stages of a three-stage line).
    // Creatures that don't evolve can be single copies. Items only appear in
    // decks they work for: Energy Antenna (Mechanic creatures), Healing
    // Crystal (Celestial), Gale Shield (Wind), Mystic Scroll (Mystic Stage 1),
    // Amulet (Neutral creatures). Every deck uses its main type's energy;
    // Neutral-only decks can use any.

    // ---- Galactic Adventures: Mystic ---------------------------------------
    {
        name: "Galactic Mystic Deck",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(19), presetGA(20), presetGA(21)),   // Astralin → Aetherin → Mystaeon
            ...presetTwoOf(presetGA(3), presetGA(4)),                   // Psybella → Fuschioria
            ...presetTwoOf(presetGA(43)),                               // Mummira
            ...presetTwoOf(presetGA(64), presetGA(65)),                 // Mangost → Ectomango
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(74), presetEA(67)                                  // Mystic Scroll, Booster
        ]
    },
    {
        name: "Galactic Mystic Deck 2",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(40), presetGA(41), presetGA(42)),   // Psychea → Olympis → Oraclyon
            ...presetTwoOf(presetGA(64), presetGA(65)),                 // Mangost → Ectomango
            ...presetTwoOf(presetGA(43)),                               // Mummira
            ...presetTwoOf(presetGA(9)),                                // Meerkool (Guardian Mode)
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(74), presetGA(69), presetEA(65), presetEA(68)      // Mystic Scroll, Aura Crystal, Potion, Power-Up
        ]
    },
    {
        name: "Galactic Mystic Deck 3",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(40), presetGA(41), presetGA(42)),   // Psychea → Olympis → Oraclyon
            ...presetTwoOf(presetGA(19), presetGA(20), presetGA(21)),   // Astralin → Aetherin → Mystaeon
            ...presetTwoOf(presetGA(3), presetGA(4)),                   // Psybella → Fuschioria
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(74), presetEA(69)                                  // Mystic Scroll, Remedy
        ]
    },

    // ---- Galactic Adventures: Wind -----------------------------------------
    {
        name: "Galactic Wind Deck",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(17), presetGA(18)),                 // Skybee → Zephyrbuzz
            ...presetTwoOf(presetGA(15), presetGA(16)),                 // Airsting → Breezebuzz
            ...presetTwoOf(presetGA(47), presetGA(48), presetGA(49)),   // Cockeriel → Cockatrike → Cockarion
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            ...presetTwoOf(presetGA(73)),                               // Gale Shield
            presetEA(67), presetEA(65)                                  // Booster, Potion
        ]
    },
    {
        name: "Galactic Wind Deck 2",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(57), presetGA(58)),                 // Eclipso → Astraea
            ...presetTwoOf(presetGA(22)),                               // Hoatzion
            ...presetTwoOf(presetGA(33)),                               // Electrogriff
            ...presetTwoOf(presetGA(53)),                               // Tielzor
            ...presetTwoOf(presetGA(17), presetGA(18)),                 // Skybee → Zephyrbuzz
            ...presetTwoOf(presetGA(10)),                               // Meerkool (Warrior Mode)
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(73), presetEA(68)                                  // Gale Shield, Power-Up
        ]
    },
    {
        name: "Galactic Wind Deck 3",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(47), presetGA(48), presetGA(49)),   // Cockeriel → Cockatrike → Cockarion
            ...presetTwoOf(presetGA(57), presetGA(58)),                 // Eclipso → Astraea
            presetGA(53), presetGA(33),                                 // Tielzor, Electrogriff
            ...presetTwoOf(presetEA(22), presetEA(23)),                 // Aeroquatic → Prismarine
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(73), presetGA(67)                                  // Gale Shield, Revive Crystal
        ]
    },

    // ---- Galactic Adventures: Celestial ------------------------------------
    {
        name: "Galactic Celestial Deck",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(34), presetGA(35), presetGA(36)),   // Crocasprout → Crocablade → Crocaterra
            ...presetTwoOf(presetGA(50), presetGA(51), presetGA(52)),   // Beanling → Beanleaf → Beanknight
            ...presetTwoOf(presetGA(11)),                               // Starraffe
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(70), presetEA(67), presetEA(65), presetEA(68)      // Healing Crystal, Booster, Potion, Power-Up
        ]
    },
    {
        name: "Galactic Celestial Deck 2",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(12), presetGA(13), presetGA(14)),   // Trunket → Elefeir → Planterdon
            ...presetTwoOf(presetGA(23), presetGA(24)),                 // Lumifloris → Photosynthra
            ...presetTwoOf(presetGA(25), presetGA(26)),                 // Nebuleap → Comiscroaker
            ...presetTwoOf(presetGA(56)),                               // Astrollus
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(70), presetGA(68)                                  // Healing Crystal, Shield Barrier
        ]
    },
    {
        name: "Galactic Celestial Deck 3",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(34), presetGA(35), presetGA(36)),   // Crocasprout → Crocablade → Crocaterra
            ...presetTwoOf(presetGA(25), presetGA(26)),                 // Nebuleap → Comiscroaker
            presetGA(56), presetGA(11),                                 // Astrollus, Starraffe
            ...presetTwoOf(presetGA(37), presetGA(38), presetGA(39)),   // Pangolilly → Pangomancer → Pangodice
            ...presetTwoOf(presetEA(66))                                // Card Draw
        ]
    },

    // ---- Galactic Adventures: Mechanic -------------------------------------
    {
        name: "Galactic Mechanic Deck",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(30), presetGA(31), presetGA(32)),   // Auregear → Mechalumin → Stilflare
            ...presetTwoOf(presetGA(27), presetGA(28)),                 // Gearpup → Gearstrike
            ...presetTwoOf(presetGA(29)),                               // Steelspirit
            ...presetTwoOf(presetGA(54), presetGA(55)),                 // Steellamb → Pigmoat
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(66), presetGA(67)                                  // Energy Antenna, Revive Crystal
        ]
    },
    {
        name: "Galactic Mechanic Deck 2",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(61), presetGA(62), presetGA(63)),   // Lithogarde → Gallicore → Notreclast
            ...presetTwoOf(presetGA(1), presetGA(2)),                   // Gadgetrix → Teklash
            ...presetTwoOf(presetGA(54), presetGA(55)),                 // Steellamb → Pigmoat
            presetGA(9), presetGA(10),                                  // Meerkool (Guardian Mode), Meerkool (Warrior Mode)
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(68), presetGA(66)                                  // Shield Barrier, Energy Antenna
        ]
    },
    {
        name: "Galactic Mechanic Deck 3",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(27), presetGA(28)),                 // Gearpup → Gearstrike
            ...presetTwoOf(presetGA(61), presetGA(62), presetGA(63)),   // Lithogarde → Gallicore → Notreclast
            presetGA(29),                                               // Steelspirit
            ...presetTwoOf(presetEA(62)),                               // Metamonk
            ...presetTwoOf(presetEA(52)),                               // Voltveil
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(66), presetGA(71), presetEA(65)                    // Energy Antenna, Disruptor, Potion
        ]
    },

    // ---- Galactic Adventures: Neutral only ---------------------------------
    {
        name: "Galactic Neutral Deck",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(6), presetGA(7), presetGA(8)),      // Anter → Antoro → Antaray
            ...presetTwoOf(presetGA(44), presetGA(45), presetGA(46)),   // Mousuck → Mousuckler → Mousucklord
            presetGA(9), presetGA(10),                                  // Meerkool, Meerkool
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            ...presetTwoOf(presetGA(72)),                               // Amulet
            presetEA(67), presetEA(65)                                  // Booster, Potion
        ]
    },
    {
        name: "Galactic Neutral Deck 2",
        type: "preset",
        set: "GA",
        cards: [
            ...presetTwoOf(presetGA(37), presetGA(38), presetGA(39)),   // Pangolilly → Pangomancer → Pangodice
            ...presetTwoOf(presetGA(59), presetGA(60)),                 // Platypog → Fluffbill
            ...presetTwoOf(presetEA(28), presetEA(29)),                 // Baklavaff → Galaktikreme
            presetGA(9), presetGA(10),                                  // Meerkool, Meerkool
            ...presetTwoOf(presetEA(66)),                               // Card Draw
            presetGA(72), presetEA(65)                                  // Amulet, Potion
        ]
    }
];

