// ============================================================================
// SUPERSEDED — DO NOT EDIT
//
// This is the original single-file implementation. It is no longer loaded by
// index.html or test.html and is kept only for reference. The live code is in
// src/, split by responsibility; see README.md for the layout and
// ADDING_A_SET.md for how to add cards.
//
// This file is safe to delete.
// ============================================================================

// Card database from CSV
const cardDatabase = [
    {id: "Elemental Awakening_04.png", name: "Traplet", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "M", move1Name: "Aura Whisper", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Elemental Awakening_05.png", name: "Traphex", stage: "Stage 2", hp: 120, retreat: 2, move1Cost: "M", move1Name: "Lunar Glow", move1Damage: 30, move1Effect: null, move2Cost: "MM", move2Name: "Ethereal Snare", move2Damage: 50, move2Effect: "cantRetreat", prevStage: "Traplet", type: "Mystic"},
    {id: "Elemental Awakening_06.png", name: "Chimerasprout", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "M", move1Name: "Psycho Drift", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Elemental Awakening_07.png", name: "Chimerafluff", stage: "Stage 2", hp: 90, retreat: 1, move1Cost: "MN", move1Name: "Mental Tackle", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Chimerasprout", type: "Mystic"},
    {id: "Elemental Awakening_08.png", name: "Chimereal", stage: "Stage 3", hp: 140, retreat: 3, move1Cost: "MN", move1Name: "Illusion Mist", move1Damage: 40, move1Effect: null, move2Cost: "MMMN", move2Name: "Vision Beam", move2Damage: 100, move2Effect: "discard2Energy", prevStage: "Chimerafluff", type: "Mystic"},
    {id: "Elemental Awakening_12.png", name: "Spiritfoil", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "N", move1Name: "Shade Tackle", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Elemental Awakening_13.png", name: "Nebulicorn", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "M", move1Name: "Nebula Howl", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Spiritfoil", type: "Mystic"},
    {id: "Elemental Awakening_14.png", name: "Wraithhorn", stage: "Stage 3", hp: 90, retreat: 2, move1Cost: "MM", move1Name: "Wraith Dash", move1Damage: 50, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Nebulicorn", type: "Mystic"},
    {id: "Elemental Awakening_15.png", name: "Zephyrquill", stage: "Stage 1", hp: 40, retreat: 1, move1Cost: "W", move1Name: "Gale Flow", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Elemental Awakening_17.png", name: "Stormbud", stage: "Stage 1", hp: 30, retreat: 1, move1Cost: "W", move1Name: "Budding Wind", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Elemental Awakening_18.png", name: "Blossomgale", stage: "Stage 2", hp: 80, retreat: 0, move1Cost: "WW", move1Name: "Gale Strike", move1Damage: 40, move1Effect: null, move2Cost: "NNN", move2Name: "Petal Tornado", move2Damage: 90, move2Effect: "recoil20", prevStage: "Stormbud", type: "Wind"},
    {id: "Elemental Awakening_28.png", name: "Baklavaff", stage: "Stage 1", hp: 70, retreat: 1, move1Cost: "NN", move1Name: "Honey Drizzle", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Elemental Awakening_29.png", name: "Galaktikreme", stage: "Stage 2", hp: 110, retreat: 1, move1Cost: "NN", move1Name: "Pastry Crunch", move1Damage: 50, move1Effect: null, move2Cost: "NNNN", move2Name: "Creamy Confection", move2Damage: 80, move2Effect: "creamyConfection", prevStage: "Baklavaff", type: "Neutral"},
    {id: "Elemental Awakening_34.png", name: "Babybara", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "N", move1Name: "Muddy Tackle", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Elemental Awakening_35.png", name: "Carmibara", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "N", move1Name: "Crimson Chomp", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Babybara", type: "Neutral"},
    {id: "Elemental Awakening_36.png", name: "Reddybara", stage: "Stage 3", hp: 130, retreat: 2, move1Cost: "NN", move1Name: "River Rush", move1Damage: 50, move1Effect: null, move2Cost: "NNNN", move2Name: "Risky Recoil", move2Damage: 130, move2Effect: "riskyRecoil", prevStage: "Carmibara", type: "Neutral", abilityName: "Sturdy Presence", abilityEffect: "sturdyPresence", abilityLocation: "any"},
    {id: "Elemental Awakening_37.png", name: "Serafini", stage: "Stage 1", hp: 30, retreat: 1, move1Cost: "N", move1Name: "Heavenly Retreat", move1Damage: 0, move1Effect: "heavenlyRetreat", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Elemental Awakening_38.png", name: "Serafina", stage: "Stage 2", hp: 60, retreat: 2, move1Cost: "NN", move1Name: "Serene Light", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Serafini", type: "Neutral", abilityName: "Resourceful Recovery", abilityEffect: "resourcefulRecovery", abilityLocation: "any"},
    {id: "Elemental Awakening_39.png", name: "Alpakina", stage: "Stage 1", hp: 120, retreat: 2, move1Cost: "NNN", move1Name: "Energy Snatch", move1Damage: 40, move1Effect: "energySnatch", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Elemental Awakening_40.png", name: "Floonleef", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "N", move1Name: "Swirl", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Elemental Awakening_41.png", name: "Aerobloom", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "C", move1Name: "Balloon Burst", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Floonleef", type: "Celestial"},
    {id: "Elemental Awakening_45.png", name: "Faeclover", stage: "Stage 1", hp: 30, retreat: 1, move1Cost: "C", move1Name: "Leaf Tickle", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Elemental Awakening_46.png", name: "Sunbloss", stage: "Stage 2", hp: 90, retreat: 1, move1Cost: "CCC", move1Name: "Nature's Clap", move1Damage: 60, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Faeclover", type: "Celestial", abilityName: "Clarity Aura", abilityEffect: "clarityAura", abilityLocation: "any"},
    {id: "Elemental Awakening_47.png", name: "Aloebud", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "C", move1Name: "Aloe Slash", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Elemental Awakening_48.png", name: "Aloeflora", stage: "Stage 2", hp: 70, retreat: 1, move1Cost: "C", move1Name: "Vera Tackle", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Aloebud", type: "Celestial"},
    {id: "Elemental Awakening_49.png", name: "Aloetide", stage: "Stage 3", hp: 90, retreat: 3, move1Cost: "CCC", move1Name: "Healing Sap", move1Damage: 50, move1Effect: "healingSap", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Aloeflora", type: "Celestial"},
    {id: "Elemental Awakening_52.png", name: "Voltveil", stage: "Stage 1", hp: 80, retreat: 2, move1Cost: "NN", move1Name: "Iron Spin", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Elemental Awakening_53.png", name: "Byteblade", stage: "Stage 1", hp: 90, retreat: 3, move1Cost: "KKK", move1Name: "Shadow Byte", move1Damage: 60, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Elemental Awakening_59.png", name: "Ponimetal", stage: "Stage 1", hp: 70, retreat: 1, move1Cost: "N", move1Name: "Iron Tail Whip", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Elemental Awakening_60.png", name: "Equinix", stage: "Stage 2", hp: 90, retreat: 1, move1Cost: "N", move1Name: "Titan Kick", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Ponimetal", type: "Mechanic"},
    {id: "Elemental Awakening_61.png", name: "Equinox", stage: "Stage 3", hp: 110, retreat: 3, move1Cost: "KNN", move1Name: "Metal Burst", move1Damage: 60, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Equinix", type: "Mechanic", abilityName: "Aura of Strength", abilityEffect: "auraOfStrength", abilityLocation: "any"},
    {id: "Elemental Awakening_63.png", name: "Aeglet", stage: "Stage 1", hp: 60, retreat: 3, move1Cost: "KK", move1Name: "Metalic Buzz", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic", abilityName: "Guardian's Call", abilityEffect: "guardiansCall", abilityLocation: "any"},
    {id: "Elemental Awakening_64.png", name: "Aegiscelis", stage: "Stage 2", hp: 130, retreat: 3, move1Cost: "KK", move1Name: "Guardian Glow", move1Damage: 50, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Aeglet", type: "Mechanic", abilityName: "Guardian", abilityEffect: "guardian", abilityLocation: "bench"},
    {id: "Elemental Awakening_65.png", name: "Potion", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Elemental Awakening_66.png", name: "Card Draw", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Elemental Awakening_67.png", name: "Booster", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Elemental Awakening_01.png", name: "Meditot", stage: "Stage 1", hp: 50, retreat: 2, move1Cost: "MM", move1Name: "Mind Mirage", move1Damage: 20, move1Effect: "mindMirage", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Elemental Awakening_02.png", name: "Zenquaza", stage: "Stage 2", hp: 100, retreat: 2, move1Cost: "MMN", move1Name: "Ethereal Echo", move1Damage: 30, move1Effect: "etherealEcho", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Meditot", type: "Mystic"},
    {id: "Elemental Awakening_03.png", name: "Harmoniqueon", stage: "Stage 1", hp: 110, retreat: 2, move1Cost: "M", move1Name: "Cosmic Calm", move1Damage: 20, move1Effect: null, move2Cost: "MMNN", move2Name: "Phantom Pulse", move2Damage: 60, move2Effect: "phantomPulse", prevStage: null, type: "Mystic"},
    {id: "Elemental Awakening_09.png", name: "Pheonyx", stage: "Stage 1", hp: 90, retreat: 3, move1Cost: "N", move1Name: "Dizzy Shot", move1Damage: 10, move1Effect: "dizzyShot", move2Cost: "MMMN", move2Name: "Mystic Blaze", move2Damage: 30, move2Effect: "mysticBlaze", prevStage: null, type: "Mystic", abilityName: "Phase Shift", abilityEffect: "phaseShift", abilityLocation: "active"},
    {id: "Elemental Awakening_10.png", name: "Mystikid", stage: "Stage 1", hp: 40, retreat: 1, move1Cost: "M", move1Name: "Dreamwave", move1Damage: 0, move1Effect: "dreamwave", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Elemental Awakening_11.png", name: "Mystikeon", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "MM", move1Name: "Dream Booster", move1Damage: 30, move1Effect: "dreamBooster", move2Cost: "MMM", move2Name: "Zen Bolt", move2Damage: 60, move2Effect: null, prevStage: "Mystikid", type: "Mystic", abilityName: "Camouflage", abilityEffect: "camouflage", abilityLocation: "any"},
    {id: "Elemental Awakening_16.png", name: "Aeruffin", stage: "Stage 1", hp: 90, retreat: 2, move1Cost: "WN", move1Name: "Beak Gust", move1Damage: 30, move1Effect: null, move2Cost: "WWN", move2Name: "Gale Flip", move2Damage: 0, move2Effect: "galeFlip", prevStage: null, type: "Wind"},
    {id: "Elemental Awakening_19.png", name: "Dodolet", stage: "Stage 1", hp: 40, retreat: 1, move1Cost: "N", move1Name: "Coin Clash", move1Damage: 0, move1Effect: "coinClash", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Elemental Awakening_20.png", name: "Dodrift", stage: "Stage 2", hp: 60, retreat: 1, move1Cost: "W", move1Name: "Dice Fury", move1Damage: 0, move1Effect: "diceFury", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Dodolet", type: "Wind"},
    {id: "Elemental Awakening_21.png", name: "Dodoryphon", stage: "Stage 3", hp: 100, retreat: 1, move1Cost: "WW", move1Name: "Dice Tempest", move1Damage: 0, move1Effect: "diceTempest", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Dodrift", type: "Wind"},
    {id: "Elemental Awakening_22.png", name: "Aeroquatic", stage: "Stage 1", hp: 70, retreat: 0, move1Cost: "WN", move1Name: "Rainbow Surge", move1Damage: 50, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Elemental Awakening_23.png", name: "Prismarine", stage: "Stage 2", hp: 90, retreat: 1, move1Cost: "WN", move1Name: "Aqua Radiance", move1Damage: 60, move1Effect: null, move2Cost: "WWWN", move2Name: "Prismatic Dive", move2Damage: 40, move2Effect: "prismaticDive", prevStage: "Aeroquatic", type: "Wind", abilityName: "Rainbow Strike", abilityEffect: "rainbowStrike", abilityLocation: "active"},
    {id: "Elemental Awakening_24.png", name: "Pyrosora", stage: "Stage 1", hp: 100, retreat: 2, move1Cost: "W", move1Name: "Inferno Wing", move1Damage: 40, move1Effect: "infernoWing", move2Cost: "WWW", move2Name: "Solar Ascend", move2Damage: 70, move2Effect: "solarAscend", prevStage: null, type: "Wind"},
    {id: "Elemental Awakening_25.png", name: "Batakaze", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "W", move1Name: "Night Strike", move1Damage: 0, move1Effect: "nightStrike", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Elemental Awakening_26.png", name: "Shadowflit", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "W", move1Name: "Ethereal Pulse", move1Damage: 0, move1Effect: "etherealPulse", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Batakaze", type: "Wind"},
    {id: "Elemental Awakening_27.png", name: "Dewmo", stage: "Stage 1", hp: 110, retreat: 2, move1Cost: "NNN", move1Name: "Neutral Surge", move1Damage: 0, move1Effect: "neutralSurge", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Elemental Awakening_30.png", name: "Antheara", stage: "Stage 1", hp: 50, retreat: 0, move1Cost: "N", move1Name: "Tongue Sweep", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Elemental Awakening_31.png", name: "Antheara", stage: "Stage 1", hp: 70, retreat: 1, move1Cost: "N", move1Name: "Tongue Sweep", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Elemental Awakening_32.png", name: "Antheara", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "N", move1Name: "Long Tongue Sweep", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Elemental Awakening_33.png", name: "Antheara", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "N", move1Name: "Tongue Sweep", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral", abilityName: "Defense Aura", abilityEffect: "defenseAura", abilityLocation: "active"},
    {id: "Elemental Awakening_42.png", name: "Rosbud", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "C", move1Name: "Petal Flick", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Elemental Awakening_43.png", name: "Rosalia", stage: "Stage 2", hp: 90, retreat: 1, move1Cost: "CCC", move1Name: "Fortune Smite", move1Damage: 50, move1Effect: "fortuneSmite", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Rosbud", type: "Celestial", abilityName: "Celestial Blessing", abilityEffect: "celestialBlessing", abilityLocation: "any"},
    {id: "Elemental Awakening_44.png", name: "Verdanthorn", stage: "Stage 1", hp: 110, retreat: 3, move1Cost: "C", move1Name: "Thorny Vines", move1Damage: 0, move1Effect: "thornyVines", move2Cost: "CCN", move2Name: "Healing Roots", move2Damage: 60, move2Effect: "healingRoots", prevStage: null, type: "Celestial"},
    {id: "Elemental Awakening_50.png", name: "Floretta", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "N", move1Name: "Minor Mend", move1Damage: 20, move1Effect: "minorMend", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Elemental Awakening_51.png", name: "Lizaflora", stage: "Stage 2", hp: 80, retreat: 0, move1Cost: "NN", move1Name: "Major Mend", move1Damage: 40, move1Effect: "majorMend", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Floretta", type: "Celestial"},
    {id: "Elemental Awakening_54.png", name: "Venomgear", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "K", move1Name: "Toxic Toss", move1Damage: 0, move1Effect: "toxicToss", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Elemental Awakening_55.png", name: "Toxiforge", stage: "Stage 2", hp: 110, retreat: 2, move1Cost: "KKK", move1Name: "Veno Slash", move1Damage: 50, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Venomgear", type: "Mechanic", abilityName: "Quick Reflexes", abilityEffect: "quickReflexes", abilityLocation: "any"},
    {id: "Elemental Awakening_56.png", name: "Envoye", stage: "Stage 1", hp: 100, retreat: 1, move1Cost: "K", move1Name: "Forceful Flip", move1Damage: 0, move1Effect: "forcefulFlip", move2Cost: "KKN", move2Name: "Scrap Strike", move2Damage: 0, move2Effect: "scrapStrike", prevStage: null, type: "Mechanic"},
    {id: "Elemental Awakening_57.png", name: "Struto", stage: "Stage 1", hp: 80, retreat: 1, move1Cost: "K", move1Name: "Metallic Wing", move1Damage: 0, move1Effect: "metallicWing", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Elemental Awakening_58.png", name: "Strutalon", stage: "Stage 2", hp: 130, retreat: 2, move1Cost: "KKKN", move1Name: "Turbo Charge", move1Damage: 70, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Struto", type: "Mechanic", abilityName: "Hard as Steel", abilityEffect: "hardAsSteel", abilityLocation: "any"},
    {id: "Elemental Awakening_62.png", name: "Metamonk", stage: "Stage 1", hp: 130, retreat: 2, move1Cost: "KK", move1Name: "Monastic Strike", move1Damage: 50, move1Effect: null, move2Cost: "KKKN", move2Name: "Monk's Fury", move2Damage: 70, move2Effect: "monksFury", prevStage: null, type: "Mechanic"},
    {id: "Elemental Awakening_68.png", name: "Power-Up", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Elemental Awakening_69.png", name: "Remedy", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Elemental Awakening_70.png", name: "Dragomind", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "M", move1Name: "Mind Blaze", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Elemental Awakening_71.png", name: "Mindsheer", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "M", move1Name: "Blue Nova", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Dragomind", type: "Mystic"},
    {id: "Elemental Awakening_72.png", name: "Psydrake", stage: "Stage 3", hp: 110, retreat: 2, move1Cost: "MM", move1Name: "Brain Freeze", move1Damage: 50, move1Effect: "brainFreeze", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Mindsheer", type: "Mystic"},
    {id: "Elemental Awakening_73.png", name: "Blushbat", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "W", move1Name: "Echo Loop", move1Damage: 10, move1Effect: "echoLoop", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Elemental Awakening_74.png", name: "Cerisebat", stage: "Stage 2", hp: 70, retreat: 1, move1Cost: "WN", move1Name: "Pink Gust", move1Damage: 0, move1Effect: "pinkGust", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Blushbat", type: "Wind"},
    {id: "Elemental Awakening_75.png", name: "Flutterwing", stage: "Stage 3", hp: 90, retreat: 1, move1Cost: "WN", move1Name: "Wing Slap", move1Damage: 80, move1Effect: "wingSlap", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Cerisebat", type: "Wind"},
    {id: "Elemental Awakening_76.png", name: "Minkpaw", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "N", move1Name: "Claw Swipe", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Elemental Awakening_77.png", name: "Furstream", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "NN", move1Name: "Whisker Whip", move1Damage: 50, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Minkpaw", type: "Neutral"},
    {id: "Elemental Awakening_78.png", name: "Lumbertail", stage: "Stage 3", hp: 100, retreat: 1, move1Cost: "NNN", move1Name: "Feline Fury", move1Damage: 70, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Furstream", type: "Neutral", abilityName: "Energy Siphon", abilityEffect: "energySiphon", abilityLocation: "any"},
    {id: "Elemental Awakening_79.png", name: "Astromelon", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "C", move1Name: "Nebula Kiss", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Elemental Awakening_80.png", name: "Lunamelon", stage: "Stage 2", hp: 80, retreat: 2, move1Cost: "C", move1Name: "Moonlight Slam", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Astromelon", type: "Celestial"},
    {id: "Elemental Awakening_81.png", name: "Orbitmelon", stage: "Stage 3", hp: 110, retreat: 2, move1Cost: "C", move1Name: "Planet Burst", move1Damage: 50, move1Effect: "planetBurst", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Lunamelon", type: "Celestial"},
    {id: "Elemental Awakening_82.png", name: "Ghoulpole", stage: "Stage 1", hp: 70, retreat: 2, move1Cost: "KK", move1Name: "Soul Snare", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Elemental Awakening_83.png", name: "Apparitron", stage: "Stage 2", hp: 90, retreat: 2, move1Cost: "KK", move1Name: "Eerie Attraction", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Ghoulpole", type: "Mechanic"},
    {id: "Elemental Awakening_84.png", name: "Poltergnet", stage: "Stage 3", hp: 130, retreat: 3, move1Cost: "KKK", move1Name: "Spectral Burst", move1Damage: 60, move1Effect: "spectralBurst", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Apparitron", type: "Mechanic"},
    // Galactic Adventures Expansion
    {id: "Galactic Adventures_01.png", name: "Gadgetrix", stage: "Stage 1", hp: 70, retreat: 2, move1Cost: "KK", move1Name: "Rusty Scratch", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Galactic Adventures_02.png", name: "Teklash", stage: "Stage 2", hp: 120, retreat: 2, move1Cost: "KK", move1Name: "Metallic Clink", move1Damage: 30, move1Effect: null, move2Cost: "NNN", move2Name: "Triple Threat Flip", move2Damage: 0, move2Effect: "tripleThreatFlip", prevStage: "Gadgetrix", type: "Mechanic"},
    {id: "Galactic Adventures_03.png", name: "Psybella", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "M", move1Name: "Mind Pulse", move1Damage: 20, move1Effect: "mindPulse", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Galactic Adventures_04.png", name: "Fuschioria", stage: "Stage 2", hp: 90, retreat: 1, move1Cost: "M", move1Name: "Dream Booster", move1Damage: 30, move1Effect: "dreamBooster", move2Cost: "MM", move2Name: "Shadow Wrap", move2Damage: 40, move2Effect: "shadowWrap", prevStage: "Psybella", type: "Mystic"},
    {id: "Galactic Adventures_05.png", name: "Zenethra", stage: "Stage 1", hp: 50, retreat: 2, move1Cost: "MM", move1Name: "Invincible Gambit", move1Damage: 0, move1Effect: "invincibleGambit", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Galactic Adventures_06.png", name: "Anter", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "N", move1Name: "Gentle Nudge", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Galactic Adventures_07.png", name: "Antoro", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "NN", move1Name: "Back Whip", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Anter", type: "Neutral"},
    {id: "Galactic Adventures_08.png", name: "Antaray", stage: "Stage 3", hp: 110, retreat: 3, move1Cost: "NNN", move1Name: "Quick jab", move1Damage: 60, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Antoro", type: "Neutral", abilityName: "Extra Charge", abilityEffect: "extraCharge", abilityLocation: "any"},
    {id: "Galactic Adventures_09.png", name: "Meerkool", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "N", move1Name: "Berserk", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral", abilityName: "Guardian Mode", abilityEffect: "guardianMode", abilityLocation: "any"},
    {id: "Galactic Adventures_10.png", name: "Meerkool", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "N", move1Name: "Berserk", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral", abilityName: "Warrior Mode", abilityEffect: "warriorMode", abilityLocation: "any"},
    {id: "Galactic Adventures_11.png", name: "Starraffe", stage: "Stage 1", hp: 90, retreat: 2, move1Cost: "C", move1Name: "Galactic Meteor", move1Damage: 0, move1Effect: "galacticMeteor", move2Cost: "NNN", move2Name: "Starfall Strike", move2Damage: 50, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Galactic Adventures_12.png", name: "Trunket", stage: "Stage 1", hp: 70, retreat: 2, move1Cost: "C", move1Name: "Celestial Vines", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial", abilityName: "Healing Retreat", abilityEffect: "healingRetreat1", abilityLocation: "active"},
    {id: "Galactic Adventures_13.png", name: "Elefeir", stage: "Stage 2", hp: 90, retreat: 2, move1Cost: "CN", move1Name: "Astral Tusk", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Trunket", type: "Celestial", abilityName: "Healing Retreat", abilityEffect: "healingRetreat2", abilityLocation: "active"},
    {id: "Galactic Adventures_14.png", name: "Planterdon", stage: "Stage 3", hp: 110, retreat: 2, move1Cost: "CN", move1Name: "Starry Stomp", move1Damage: 60, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Elefeir", type: "Celestial", abilityName: "Mirage Shield", abilityEffect: "mirageShield", abilityLocation: "active"},
    {id: "Galactic Adventures_15.png", name: "Airsting", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "N", move1Name: "Aero Pollen", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Galactic Adventures_16.png", name: "Breezebuzz", stage: "Stage 2", hp: 80, retreat: 2, move1Cost: "WN", move1Name: "Cyclone Swarm", move1Damage: 50, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Airsting", type: "Wind", abilityName: "Thunder Rush", abilityEffect: "thunderRush", abilityLocation: "active"},
    {id: "Galactic Adventures_17.png", name: "Skybee", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "WN", move1Name: "Zephyr Sting", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Galactic Adventures_18.png", name: "Zephyrbuzz", stage: "Stage 2", hp: 90, retreat: 2, move1Cost: "WWN", move1Name: "Whirlwind Wasp", move1Damage: 60, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Skybee", type: "Wind", abilityName: "Thunder Rush", abilityEffect: "thunderRush", abilityLocation: "active"},
    {id: "Galactic Adventures_19.png", name: "Astralin", stage: "Stage 1", hp: 50, retreat: 2, move1Cost: "M", move1Name: "Tidal Illusion", move1Damage: 0, move1Effect: "tidalIllusion", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Galactic Adventures_20.png", name: "Aetherin", stage: "Stage 2", hp: 70, retreat: 2, move1Cost: "MM", move1Name: "Mind Ripple", move1Damage: 20, move1Effect: "mindRipple", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Astralin", type: "Mystic"},
    {id: "Galactic Adventures_21.png", name: "Mystaeon", stage: "Stage 3", hp: 110, retreat: 3, move1Cost: "MM", move1Name: "Flux Wave", move1Damage: 60, move1Effect: "fluxWave", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Aetherin", type: "Mystic"},
    {id: "Galactic Adventures_22.png", name: "Hoatzion", stage: "Stage 1", hp: 80, retreat: 1, move1Cost: "W", move1Name: "Verdant Struggle", move1Damage: 0, move1Effect: "verdantStruggle", move2Cost: "WWW", move2Name: "Fury Spin", move2Damage: 60, move2Effect: "furySpin", prevStage: null, type: "Wind"},
    {id: "Galactic Adventures_23.png", name: "Lumifloris", stage: "Stage 1", hp: 60, retreat: 2, move1Cost: "CC", move1Name: "Regrowth", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial", abilityName: "Absorb Energy", abilityEffect: "absorbEnergy", abilityLocation: "any"},
    {id: "Galactic Adventures_24.png", name: "Photosynthra", stage: "Stage 2", hp: 80, retreat: 2, move1Cost: "CCN", move1Name: "Enraged Charge", move1Damage: 40, move1Effect: "enragedCharge", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Lumifloris", type: "Celestial", abilityName: "Absorb Energy", abilityEffect: "absorbEnergy", abilityLocation: "any"},
    {id: "Galactic Adventures_25.png", name: "Nebuleap", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "C", move1Name: "Bog Bite", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial", abilityName: "Energized Healing", abilityEffect: "energizedHealing1", abilityLocation: "any"},
    {id: "Galactic Adventures_26.png", name: "Comiscroaker", stage: "Stage 2", hp: 90, retreat: 1, move1Cost: "C", move1Name: "Marshy Muddle", move1Damage: 30, move1Effect: null, move2Cost: "CCC", move2Name: "Toadstool Toss", move2Damage: 70, move2Effect: null, prevStage: "Nebuleap", type: "Celestial", abilityName: "Energized Healing", abilityEffect: "energizedHealing2", abilityLocation: "any"},
    {id: "Galactic Adventures_27.png", name: "Gearpup", stage: "Stage 1", hp: 80, retreat: 2, move1Cost: "KK", move1Name: "Metallic Bark", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Galactic Adventures_28.png", name: "Gearstrike", stage: "Stage 2", hp: 120, retreat: 3, move1Cost: "KK", move1Name: "Scavenge Strike", move1Damage: 40, move1Effect: "scavengeStrike", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Gearpup", type: "Mechanic"},
    {id: "Galactic Adventures_29.png", name: "Steelspirit", stage: "Stage 1", hp: 160, retreat: 2, move1Cost: "KK", move1Name: "Gear Grind", move1Damage: 30, move1Effect: "gearGrind", move2Cost: "KNN", move2Name: "Chill Recharge", move2Damage: 0, move2Effect: "chillRecharge", prevStage: null, type: "Mechanic", abilityName: "Metalic protection", abilityEffect: "metalicProtection", abilityLocation: "any"},
    {id: "Galactic Adventures_30.png", name: "Auregear", stage: "Stage 1", hp: 90, retreat: 2, move1Cost: "KKK", move1Name: "Void Pulse", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Galactic Adventures_31.png", name: "Mechalumin", stage: "Stage 2", hp: 90, retreat: 3, move1Cost: "KKK", move1Name: "Quantum Burst", move1Damage: 60, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Auregear", type: "Mechanic"},
    {id: "Galactic Adventures_32.png", name: "Stilflare", stage: "Stage 3", hp: 130, retreat: 4, move1Cost: "KKK", move1Name: "Overdrive Smash", move1Damage: 100, move1Effect: "overdriveSmash", move2Cost: "KKKK", move2Name: "Fragile Force", move2Damage: 50, move2Effect: null, prevStage: "Mechalumin", type: "Mechanic"},
    {id: "Galactic Adventures_33.png", name: "Electrogriff", stage: "Stage 1", hp: 90, retreat: 1, move1Cost: "WW", move1Name: "Harsh Flinch", move1Damage: 20, move1Effect: "harshFlinch", move2Cost: "WWW", move2Name: "Tempest Hold", move2Damage: 90, move2Effect: "tempestHold", prevStage: null, type: "Wind"},
    {id: "Galactic Adventures_34.png", name: "Crocasprout", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "C", move1Name: "Leaf Bite", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Galactic Adventures_35.png", name: "Crocablade", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "CC", move1Name: "Vine Slash", move1Damage: 50, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Crocasprout", type: "Celestial"},
    {id: "Galactic Adventures_36.png", name: "Crocaterra", stage: "Stage 3", hp: 110, retreat: 2, move1Cost: "CC", move1Name: "Forest Fury", move1Damage: 50, move1Effect: "forestFury", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Crocablade", type: "Celestial"},
    {id: "Galactic Adventures_37.png", name: "Pangolilly", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "N", move1Name: "Roll Tackle", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Galactic Adventures_38.png", name: "Pangomancer", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "NN", move1Name: "Lucky Tackle", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Pangolilly", type: "Neutral"},
    {id: "Galactic Adventures_39.png", name: "Pangodice", stage: "Stage 3", hp: 110, retreat: 1, move1Cost: "NN", move1Name: "Chaos Dice", move1Damage: 30, move1Effect: "chaosDice", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Pangomancer", type: "Neutral"},
    {id: "Galactic Adventures_40.png", name: "Psychea", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "M", move1Name: "Foresight Beam", move1Damage: 10, move1Effect: "foresightBeam", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Galactic Adventures_41.png", name: "Olympis", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "MM", move1Name: "Olympic Wave", move1Damage: 30, move1Effect: "fluxWave", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Psychea", type: "Mystic"},
    {id: "Galactic Adventures_42.png", name: "Oraclyon", stage: "Stage 3", hp: 100, retreat: 2, move1Cost: "MM", move1Name: "Ancient Wisdom", move1Damage: 50, move1Effect: "fluxWave", move2Cost: "MMN", move2Name: "Foresight Blast", move2Damage: 60, move2Effect: "dreamBooster", prevStage: "Olympis", type: "Mystic"},
    {id: "Galactic Adventures_43.png", name: "Mummira", stage: "Stage 1", hp: 90, retreat: 1, move1Cost: "N", move1Name: "Spectral Wrap", move1Damage: 10, move1Effect: "spectralWrapGA", move2Cost: "MMN", move2Name: "Mummy's Curse", move2Damage: 60, move2Effect: "fluxWave", prevStage: null, type: "Mystic"},
    {id: "Galactic Adventures_44.png", name: "Mousuck", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "N", move1Name: "Nibble Peck", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Galactic Adventures_45.png", name: "Mousuckler", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "NN", move1Name: "Hairy Echo", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Mousuck", type: "Neutral"},
    {id: "Galactic Adventures_46.png", name: "Mousucklord", stage: "Stage 3", hp: 110, retreat: 2, move1Cost: "NN", move1Name: "Piercing Bite", move1Damage: 60, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Mousuckler", type: "Neutral", abilityName: "Gnawing Precision", abilityEffect: "gnawingPrecision", abilityLocation: "any"},
    {id: "Galactic Adventures_47.png", name: "Cockeriel", stage: "Stage 1", hp: 30, retreat: 1, move1Cost: "N", move1Name: "Beak Bash", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Galactic Adventures_48.png", name: "Cockatrike", stage: "Stage 2", hp: 70, retreat: 1, move1Cost: "N", move1Name: "Sonic Chirp", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Cockeriel", type: "Wind"},
    {id: "Galactic Adventures_49.png", name: "Cockarion", stage: "Stage 3", hp: 90, retreat: 1, move1Cost: "NN", move1Name: "Feather Barrage", move1Damage: 40, move1Effect: "featherBarrage", move2Cost: "WNN", move2Name: "Blow Blitz", move2Damage: 100, move2Effect: "recoil40", prevStage: "Cockatrike", type: "Wind"},
    {id: "Galactic Adventures_50.png", name: "Beanling", stage: "Stage 1", hp: 40, retreat: 1, move1Cost: "C", move1Name: "Sprout Boost", move1Damage: 0, move1Effect: "sproutBoost", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Galactic Adventures_51.png", name: "Beanleaf", stage: "Stage 2", hp: 70, retreat: 1, move1Cost: "CC", move1Name: "Coffee Heal", move1Damage: 30, move1Effect: "coffeeHeal", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Beanling", type: "Celestial"},
    {id: "Galactic Adventures_52.png", name: "Beanknight", stage: "Stage 3", hp: 90, retreat: 2, move1Cost: "CC", move1Name: "Bean Blast", move1Damage: 40, move1Effect: "beanBlast", move2Cost: "CNN", move2Name: "Caffeine Addiction", move2Damage: 50, move2Effect: "caffeineAddiction", prevStage: "Beanleaf", type: "Celestial"},
    {id: "Galactic Adventures_53.png", name: "Tielzor", stage: "Stage 1", hp: 80, retreat: 2, move1Cost: "W", move1Name: "Sky Draw", move1Damage: 0, move1Effect: "skyDraw", move2Cost: "WWWW", move2Name: "Hurricane Wing", move2Damage: 100, move2Effect: "hurricaneWing", prevStage: null, type: "Wind"},
    {id: "Galactic Adventures_54.png", name: "Steellamb", stage: "Stage 1", hp: 80, retreat: 2, move1Cost: "KK", move1Name: "Iron Rush", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Galactic Adventures_55.png", name: "Pigmoat", stage: "Stage 2", hp: 120, retreat: 2, move1Cost: "KNN", move1Name: "Horn Bash", move1Damage: 50, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Steellamb", type: "Mechanic", abilityName: "Caprine Guard", abilityEffect: "caprineGuard", abilityLocation: "any"},
    {id: "Galactic Adventures_56.png", name: "Astrollus", stage: "Stage 1", hp: 90, retreat: 2, move1Cost: "C", move1Name: "Galactic Pulse", move1Damage: 20, move1Effect: null, move2Cost: "NNN", move2Name: "Starlight Kick", move2Damage: 60, move2Effect: "forestFury", prevStage: null, type: "Celestial"},
    {id: "Galactic Adventures_57.png", name: "Eclipso", stage: "Stage 1", hp: 40, retreat: 1, move1Cost: "W", move1Name: "Eclipse Tackle", move1Damage: 20, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Galactic Adventures_58.png", name: "Astraea", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "W", move1Name: "Nebula Blow", move1Damage: 30, move1Effect: null, move2Cost: "WW", move2Name: "Starry Stomp", move2Damage: 50, move2Effect: null, prevStage: "Eclipso", type: "Wind", abilityName: "Elemental Fortitude", abilityEffect: "elementalFortitude", abilityLocation: "any"},
    {id: "Galactic Adventures_59.png", name: "Platypog", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "N", move1Name: "Tail Dance", move1Damage: 20, move1Effect: "tailDance", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Galactic Adventures_60.png", name: "Fluffbill", stage: "Stage 2", hp: 80, retreat: 1, move1Cost: "N", move1Name: "Bill Bash", move1Damage: 50, move1Effect: "tailDance", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Platypog", type: "Neutral", abilityName: "Hydration", abilityEffect: "hydration", abilityLocation: "active"},
    {id: "Galactic Adventures_61.png", name: "Lithogarde", stage: "Stage 1", hp: 70, retreat: 2, move1Cost: "K", move1Name: "Tidal Strike", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mechanic"},
    {id: "Galactic Adventures_62.png", name: "Gallicore", stage: "Stage 2", hp: 100, retreat: 2, move1Cost: "KK", move1Name: "Iron Ascent", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Lithogarde", type: "Mechanic"},
    {id: "Galactic Adventures_63.png", name: "Notreclast", stage: "Stage 3", hp: 100, retreat: 2, move1Cost: "KK", move1Name: "Iron Ascent", move1Damage: 40, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Gallicore", type: "Mechanic", abilityName: "Retaliation Stone", abilityEffect: "retaliationStone", abilityLocation: "any"},
    {id: "Galactic Adventures_64.png", name: "Mangost", stage: "Stage 1", hp: 50, retreat: 1, move1Cost: "MM", move1Name: "Spectral Slice", move1Damage: 30, move1Effect: "spectralSlice", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Galactic Adventures_65.png", name: "Ectomango", stage: "Stage 2", hp: 70, retreat: 1, move1Cost: "MM", move1Name: "Juicy Aroma", move1Damage: 40, move1Effect: "fluxWave", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Mangost", type: "Mystic", abilityName: "Aqua Mirror", abilityEffect: "aquaMirror", abilityLocation: "active"},
    {id: "Galactic Adventures_66.png", name: "Energy Antenna", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Galactic Adventures_67.png", name: "Revive Crystal", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Galactic Adventures_68.png", name: "Shield Barrier", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Galactic Adventures_69.png", name: "Aura Crystal", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Galactic Adventures_70.png", name: "Healing Crystal", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Galactic Adventures_71.png", name: "Disruptor", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Galactic Adventures_72.png", name: "Amulet", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Galactic Adventures_73.png", name: "Gale Shield", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Galactic Adventures_74.png", name: "Mystic Scroll", stage: "Item", hp: 0, retreat: 0, move1Cost: null, move1Name: null, move1Damage: null, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Item"},
    {id: "Galactic Adventures_75.png", name: "Goggly", stage: "Stage 1", hp: 50, retreat: 0, move1Cost: "NN", move1Name: "Gulp Swap", move1Damage: 0, move1Effect: "gulpSwap", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Galactic Adventures_76.png", name: "Cloudlet", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "N", move1Name: "Cotton Guard", move1Damage: 0, move1Effect: "cottonGuard", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Galactic Adventures_77.png", name: "Cloudboss", stage: "Stage 2", hp: 100, retreat: 1, move1Cost: "N", move1Name: "Cotton Guard", move1Damage: 0, move1Effect: "cottonGuard", move2Cost: "NN", move2Name: "Cloud Bounce", move2Damage: 30, move2Effect: "cloudBounce", prevStage: "Cloudlet", type: "Neutral"},
    {id: "Galactic Adventures_78.png", name: "Sadotter", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "N", move1Name: "Melancholy Splash", move1Damage: 10, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Neutral"},
    {id: "Galactic Adventures_79.png", name: "Weeweep", stage: "Stage 2", hp: 90, retreat: 1, move1Cost: "N", move1Name: "Sorrow Swipe", move1Damage: 30, move1Effect: null, move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Sadotter", type: "Neutral"},
    {id: "Galactic Adventures_80.png", name: "Melanchote", stage: "Stage 3", hp: 130, retreat: 3, move1Cost: "NN", move1Name: "Desolate Dive", move1Damage: 50, move1Effect: null, move2Cost: "NNN", move2Name: "Alphabet Assault", move2Damage: 0, move2Effect: "alphabetAssault", prevStage: "Weeweep", type: "Neutral"},
    {id: "Galactic Adventures_81.png", name: "Metalmagma", stage: "Stage 1", hp: 100, retreat: 2, move1Cost: "KK", move1Name: "Molten Coil", move1Damage: 30, move1Effect: null, move2Cost: "KKK", move2Name: "Inferno Constrict", move2Damage: 0, move2Effect: "infernoConstrict", prevStage: null, type: "Mechanic"},
    {id: "Galactic Adventures_82.png", name: "Laugherry", stage: "Stage 1", hp: 40, retreat: 1, move1Cost: "C", move1Name: "Berry Burst", move1Damage: 10, move1Effect: "berryBurst", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Celestial"},
    {id: "Galactic Adventures_83.png", name: "Gigglewood", stage: "Stage 2", hp: 70, retreat: 1, move1Cost: "CC", move1Name: "Laughing Leaves", move1Damage: 20, move1Effect: "laughingLeaves", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: "Laugherry", type: "Celestial"},
    {id: "Galactic Adventures_84.png", name: "Quirkquack", stage: "Stage 1", hp: 60, retreat: 1, move1Cost: "W", move1Name: "Aerial Peck", move1Damage: 20, move1Effect: null, move2Cost: "WW", move2Name: "Windy Specs", move2Damage: 50, move2Effect: null, prevStage: null, type: "Wind"},
    {id: "Galactic Adventures_85.png", name: "Pantheraura", stage: "Stage 1", hp: 70, retreat: 1, move1Cost: "MM", move1Name: "Mind Mirage", move1Damage: 30, move1Effect: "dreamBooster", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"},
    {id: "Galactic Adventures_86.png", name: "Frostant", stage: "Stage 1", hp: 70, retreat: 1, move1Cost: "MM", move1Name: "Psychic Prowl", move1Damage: 30, move1Effect: "psychicProwl", move2Cost: null, move2Name: null, move2Damage: null, move2Effect: null, prevStage: null, type: "Mystic"}
];

// Deck definitions
const deckTemplates = [
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
    }
];

// Load custom decks from localStorage
function loadCustomDecks() {
    const username = window.parent && window.parent.currentUsername ? window.parent.currentUsername : 'Guest';
    const savedDecks = localStorage.getItem(`tcg_custom_decks_${username}`);
    if (savedDecks) {
        try {
            const customDecks = JSON.parse(savedDecks);
            customDecks.forEach(deck => {
                deck.type = 'custom';
                if (!deckTemplates.find(d => d.name === deck.name && d.type === 'custom')) {
                    deckTemplates.push(deck);
                }
            });
        } catch (e) {
            console.error("Error loading custom decks:", e);
        }
    }
}

// Save custom deck
function saveCustomDeck(deckName, cards) {
    const username = window.parent && window.parent.currentUsername ? window.parent.currentUsername : 'Guest';
    const savedDecks = localStorage.getItem(`tcg_custom_decks_${username}`);
    let customDecks = savedDecks ? JSON.parse(savedDecks) : [];
    
    // Remove existing deck with same name
    customDecks = customDecks.filter(d => d.name !== deckName);
    
    // Add new deck
    customDecks.push({
        name: deckName,
        type: 'custom',
        cards: cards
    });
    
    localStorage.setItem(`tcg_custom_decks_${username}`, JSON.stringify(customDecks));
    
    // Add to deckTemplates if not already there
    const existingIndex = deckTemplates.findIndex(d => d.name === deckName && d.type === 'custom');
    if (existingIndex >= 0) {
        deckTemplates[existingIndex].cards = cards;
    } else {
        deckTemplates.push({
            name: deckName,
            type: 'custom',
            cards: cards
        });
    }
}

// Edit custom deck
function editCustomDeck(deckName) {
    const username = window.parent && window.parent.currentUsername ? window.parent.currentUsername : 'Guest';
    const savedDecks = localStorage.getItem(`tcg_custom_decks_${username}`);
    if (!savedDecks) return;
    
    const customDecks = JSON.parse(savedDecks);
    const deck = customDecks.find(d => d.name === deckName);
    
    if (!deck) {
        alert("Deck not found!");
        return;
    }
    
    // Load the deck into the builder
    customDeckCards = [...deck.cards];
    
    const modal = document.getElementById('deck-builder-modal');
    if (!modal) {
        console.error("Deck builder modal not found!");
        return;
    }
    
    modal.style.display = 'flex';
    
    const deckNameInput = document.getElementById('custom-deck-name');
    const availableCards = document.getElementById('available-cards');
    const customDeckCardsDiv = document.getElementById('custom-deck-cards');
    
    if (!deckNameInput || !availableCards || !customDeckCardsDiv) {
        console.error("Deck builder elements not found!");
        return;
    }
    
    deckNameInput.value = deckName;
    availableCards.innerHTML = '';
    customDeckCardsDiv.innerHTML = '';
    
    // Reset to Elemental Awakening when opening
    currentCardSet = 'Elemental Awakening';
    
    // Update available cards display with set selection
    updateAvailableCards();
    updateDeckBuilder();
}

// Delete custom deck
function deleteCustomDeck(deckName) {
    if (!confirm(`Are you sure you want to delete "${deckName}"?`)) {
        return;
    }
    
    const username = window.parent && window.parent.currentUsername ? window.parent.currentUsername : 'Guest';
    const savedDecks = localStorage.getItem(`tcg_custom_decks_${username}`);
    if (!savedDecks) return;
    
    let customDecks = JSON.parse(savedDecks);
    customDecks = customDecks.filter(d => d.name !== deckName);
    
    localStorage.setItem(`tcg_custom_decks_${username}`, JSON.stringify(customDecks));
    
    // Remove from deckTemplates
    const index = deckTemplates.findIndex(d => d.name === deckName && d.type === 'custom');
    if (index >= 0) {
        deckTemplates.splice(index, 1);
    }
    
    alert(`Deck "${deckName}" deleted successfully!`);
    showDeckSelection();
}

// Get card type from card data
function getCardType(cardData) {
    return cardData.type || "Neutral";
}

// Validate deck
function validateDeck(cards) {
    if (cards.length === 0) {
        return { valid: false, error: "Deck is empty!" };
    }
    
    // Check for exactly 20 cards
    if (cards.length !== 20) {
        return { valid: false, error: `Deck must have exactly 20 cards! Currently: ${cards.length}` };
    }
    
    // Check for max 2 copies of each card
    const cardCounts = {};
    cards.forEach(cardId => {
        cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    });
    
    for (const [cardId, count] of Object.entries(cardCounts)) {
        if (count > 2) {
            const cardData = getCardData(cardId);
            return { valid: false, error: `You can only have up to 2 copies of ${cardData.name}!` };
        }
    }
    
    // Check for at least 1 Stage 1 creature
    const hasStage1 = cards.some(cardId => {
        const cardData = getCardData(cardId);
        return cardData && cardData.stage === "Stage 1";
    });
    
    if (!hasStage1) {
        return { valid: false, error: "Deck must contain at least 1 Stage 1 creature!" };
    }
    
    // Check type mixing
    let primaryType = null;
    for (const cardId of cards) {
        const cardData = getCardData(cardId);
        if (!cardData) continue;
        
        const cardType = getCardType(cardData);
        
        // Neutral and Item cards can mix with anything
        if (cardType === "Neutral" || cardType === "Item") continue;
        
        if (!primaryType) {
            primaryType = cardType;
        } else if (cardType !== primaryType) {
            return { valid: false, error: `Cannot mix ${primaryType} and ${cardType} types! Only Neutral and Item cards can be mixed.` };
        }
    }
    
    return { valid: true };
}

// Game state
const gameState = {
    player: {
        deck: [],
        hand: [],
        active: null,
        bench: [null, null, null],
        points: 0,
        energyAttachedThisTurn: false,
        hasAttacked: false,
        itemUsedThisTurn: false,
        discardPile: [],
        selectedDeck: null,
        boosterActive: false,
        powerUpTurnsRemaining: 0, // Power-Up item effect
        monksFuryShield: false, // Monk's Fury damage reduction
        cantAttackNextTurn: false, // Quick Reflexes effect
        clarityAuraActive: false, // Clarity Aura hallucination prevention
        camouflageActive: false, // Camouflage bench protection
        rainbowStrikeActive: false, // Rainbow Strike bench damage
        phaseShiftActive: false, // Phase Shift forced switch
        sturdyPresenceBonus: 0 // Sturdy Presence damage bonus
    },
    opponent: {
        deck: [],
        hand: [],
        active: null,
        bench: [null, null, null],
        points: 0,
        energyAttachedThisTurn: false,
        hasAttacked: false,
        itemUsedThisTurn: false,
        discardPile: [],
        selectedDeck: null,
        boosterActive: false,
        powerUpTurnsRemaining: 0,
        monksFuryShield: false,
        cantAttackNextTurn: false, // Quick Reflexes effect
        clarityAuraActive: false, // Clarity Aura hallucination prevention
        camouflageActive: false, // Camouflage bench protection
        rainbowStrikeActive: false, // Rainbow Strike bench damage
        phaseShiftActive: false, // Phase Shift forced switch
        sturdyPresenceBonus: 0 // Sturdy Presence damage bonus
    },
    currentTurn: null, // 'player' or 'opponent'
    turnNumber: 0,
    phase: 'deckSelection', // 'deckSelection', 'setup', 'playing', 'gameOver'
    selectedCard: null,
    selectedSlot: null,
    waitingForSelection: false,
    setupReady: {player: false, opponent: false}
};

// Track which cards were played/evolved this turn
const turnTracker = {
    playedThisTurn: new Set(),
    evolvedThisTurn: new Set(), // Still track card objects for backward compatibility
    evolvedIds: new Set() // Track evolutionId of cards that evolved this turn
};

// Initialize the game
function initGame() {
    loadCustomDecks(); // Load user's custom decks
    setupEventListeners();
    showDeckSelection();
}

// Create decks with specified cards
function createDecks() {
    const playerDeck = deckTemplates[gameState.player.selectedDeck];
    const opponentDeck = deckTemplates[gameState.opponent.selectedDeck];
    
    gameState.player.deck = shuffleDeck([...playerDeck.cards]);
    gameState.opponent.deck = shuffleDeck([...opponentDeck.cards]);
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Draw initial hands (ensure at least 1 Stage 1 card)
function drawInitialHands() {
    let validHand = false;
    while (!validHand) {
        gameState.player.hand = [];
        for (let i = 0; i < 5; i++) {
            const cardId = gameState.player.deck.pop();
            const cardData = getCardData(cardId);
            gameState.player.hand.push({id: cardId, data: cardData, energy: 0, damage: 0, cantRetreat: false, abilityUsedThisTurn: false});
        }
        validHand = gameState.player.hand.some(card => card.data.stage === "Stage 1");
        
        // If hand is invalid, return cards to deck and reshuffle
        if (!validHand) {
            gameState.player.deck.push(...gameState.player.hand.map(card => card.id));
            gameState.player.deck = shuffleDeck(gameState.player.deck);
        }
    }

    validHand = false;
    while (!validHand) {
        gameState.opponent.hand = [];
        for (let i = 0; i < 5; i++) {
            const cardId = gameState.opponent.deck.pop();
            const cardData = getCardData(cardId);
            gameState.opponent.hand.push({id: cardId, data: cardData, energy: 0, damage: 0, cantRetreat: false, abilityUsedThisTurn: false});
        }
        validHand = gameState.opponent.hand.some(card => card.data.stage === "Stage 1");
        
        // If hand is invalid, return cards to deck and reshuffle
        if (!validHand) {
            gameState.opponent.deck.push(...gameState.opponent.hand.map(card => card.id));
            gameState.opponent.deck = shuffleDeck(gameState.opponent.deck);
        }
    }
}

function getCardData(cardId) {
    return cardDatabase.find(card => card.id === cardId);
}

// Deck Selection Functions
function showDeckSelection() {
    const deckList = document.getElementById('deck-list');
    deckList.innerHTML = '';
    
    deckTemplates.forEach((deckTemplate, index) => {
        const deckOption = document.createElement('div');
        deckOption.className = 'deck-option';
        deckOption.style.position = 'relative';
        
        const customBadge = deckTemplate.type === 'custom' ? ' <span style="color: gold;">★</span>' : '';
        
        deckOption.innerHTML = `
            <h2>${deckTemplate.name}${customBadge}</h2>
            <p>${deckTemplate.cards.length} Cards</p>
            <p style="margin-top: 10px; font-size: 14px;">Click to preview</p>
        `;
        
        deckOption.addEventListener('click', () => showDeckPreview(index));
        
        // Add edit and delete buttons for custom decks
        if (deckTemplate.type === 'custom') {
            const actionsDiv = document.createElement('div');
            actionsDiv.style.position = 'absolute';
            actionsDiv.style.top = '10px';
            actionsDiv.style.right = '10px';
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '5px';
            
            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️';
            editBtn.style.backgroundColor = '#3498db';
            editBtn.style.color = 'white';
            editBtn.style.border = 'none';
            editBtn.style.borderRadius = '5px';
            editBtn.style.padding = '5px 10px';
            editBtn.style.cursor = 'pointer';
            editBtn.style.fontSize = '16px';
            editBtn.title = 'Edit deck';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                editCustomDeck(deckTemplate.name);
            };
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.style.backgroundColor = '#e74c3c';
            deleteBtn.style.color = 'white';
            deleteBtn.style.border = 'none';
            deleteBtn.style.borderRadius = '5px';
            deleteBtn.style.padding = '5px 10px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.fontSize = '16px';
            deleteBtn.title = 'Delete deck';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteCustomDeck(deckTemplate.name);
            };
            
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            deckOption.appendChild(actionsDiv);
        }
        
        deckList.appendChild(deckOption);
    });
    
    // Add "Create Custom Deck" button
    const createDeckBtn = document.createElement('div');
    createDeckBtn.className = 'deck-option create-deck-btn';
    createDeckBtn.innerHTML = `
        <h2 style="font-size: 32px;">+</h2>
        <p>Create Custom Deck</p>
    `;
    createDeckBtn.addEventListener('click', () => showDeckBuilder());
    deckList.appendChild(createDeckBtn);
    
    // Add "Debug Mode" button
    const debugBtn = document.createElement('div');
    debugBtn.className = 'deck-option create-deck-btn';
    debugBtn.style.backgroundColor = '#9b59b6';
    debugBtn.innerHTML = `
        <h2 style="font-size: 32px;">🔧</h2>
        <p>Debug Mode</p>
    `;
    console.log('Debug button created, adding click listener');
    debugBtn.addEventListener('click', () => {
        console.log('Debug button clicked!');
        showDebugModal();
    });
    deckList.appendChild(debugBtn);
    console.log('Debug button appended to deck list');
}

function showDeckPreview(deckIndex) {
    const deckTemplate = deckTemplates[deckIndex];
    const modal = document.getElementById('deck-preview-modal');
    const title = document.getElementById('deck-preview-title');
    const cardsDiv = document.getElementById('deck-preview-cards');
    const selectBtn = document.getElementById('select-deck-btn');
    
    title.textContent = deckTemplate.name;
    cardsDiv.innerHTML = '';
    
    // Count unique cards
    const cardCounts = {};
    deckTemplate.cards.forEach(cardId => {
        cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    });
    
    // Get unique card IDs and sort by ID number
    const uniqueCards = Object.keys(cardCounts).sort((a, b) => {
        // Extract number from ID (e.g., "Elemental Awakening_04.png" -> 4)
        const numA = parseInt(a.match(/\d+/)[0]);
        const numB = parseInt(b.match(/\d+/)[0]);
        return numA - numB;
    });
    
    // Display each unique card
    uniqueCards.forEach(cardId => {
        const cardData = getCardData(cardId);
        const count = cardCounts[cardId];
        
        const previewItem = document.createElement('div');
        previewItem.className = 'deck-preview-item';
        
        const img = document.createElement('img');
        img.src = `cards/${cardId}`;
        img.alt = cardData.name;
        
        // Add hover zoom
        img.addEventListener('mouseenter', () => showCardZoom(cardId));
        img.addEventListener('mouseleave', hideCardZoom);
        
        const countDiv = document.createElement('div');
        countDiv.className = 'card-count';
        countDiv.textContent = `× ${count}`;
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'card-name';
        nameDiv.textContent = cardData.name;
        
        previewItem.appendChild(img);
        previewItem.appendChild(countDiv);
        previewItem.appendChild(nameDiv);
        cardsDiv.appendChild(previewItem);
    });
    
    selectBtn.onclick = () => selectDeck(deckIndex);
    modal.style.display = 'flex';
}

function closeDeckPreview() {
    document.getElementById('deck-preview-modal').style.display = 'none';
}

function selectDeck(deckIndex) {
    gameState.player.selectedDeck = deckIndex;
    
    // AI randomly selects a preset deck only (not custom decks)
    const presetDecks = deckTemplates.filter(d => d.type === 'preset');
    const randomPresetIndex = Math.floor(Math.random() * presetDecks.length);
    const selectedPresetDeck = presetDecks[randomPresetIndex];
    
    // Find the actual index in deckTemplates
    gameState.opponent.selectedDeck = deckTemplates.findIndex(d => d === selectedPresetDeck);
    
    closeDeckPreview();
    
    // Hide deck selection, show game screen
    document.getElementById('deck-selection').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    
    gameState.phase = 'setup';
    createDecks();
    drawInitialHands();
    renderGame();
}

window.closeDeckPreview = closeDeckPreview;

// Deck Builder Functions
let customDeckCards = [];
let currentCardSet = 'Elemental Awakening'; // Track which set is currently shown

function showDeckBuilder() {
    customDeckCards = [];
    const modal = document.getElementById('deck-builder-modal');
    
    if (!modal) {
        console.error("Deck builder modal not found!");
        return;
    }
    
    // Show modal first
    modal.style.display = 'flex';
    
    // Then access elements inside it
    const availableCards = document.getElementById('available-cards');
    const deckName = document.getElementById('custom-deck-name');
    const customDeckCardsDiv = document.getElementById('custom-deck-cards');
    
    if (!deckName || !availableCards || !customDeckCardsDiv) {
        console.error("Deck builder elements not found!", {
            deckName: !!deckName,
            availableCards: !!availableCards,
            customDeckCardsDiv: !!customDeckCardsDiv
        });
        return;
    }
    
    deckName.value = '';
    availableCards.innerHTML = '';
    customDeckCardsDiv.innerHTML = '';
    
    // Reset to Elemental Awakening when opening
    currentCardSet = 'Elemental Awakening';
    
    // Update available cards display
    updateAvailableCards();
    updateDeckBuilder();
}

function updateAvailableCards() {
    const availableCards = document.getElementById('available-cards');
    if (!availableCards) return;
    
    availableCards.innerHTML = '';
    
    // Update the h3 header to include set navigation
    const cardPoolDiv = availableCards.parentElement;
    let headerDiv = cardPoolDiv.querySelector('.set-navigation-header');
    
    if (!headerDiv) {
        // Create header container if it doesn't exist
        headerDiv = document.createElement('div');
        headerDiv.className = 'set-navigation-header';
        headerDiv.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px;';
        
        const h3 = cardPoolDiv.querySelector('h3');
        if (h3) {
            h3.parentNode.insertBefore(headerDiv, h3);
            h3.remove();
        }
    }
    
    // Clear and rebuild header
    headerDiv.innerHTML = '';
    
    const prevArrow = document.createElement('button');
    prevArrow.textContent = '◀';
    prevArrow.style.cssText = 'font-size: 20px; padding: 5px 15px; background: #3498db; border: none; border-radius: 5px; color: white; cursor: pointer;';
    prevArrow.onclick = () => {
        currentCardSet = currentCardSet === 'Elemental Awakening' ? 'Galactic Adventures' : 'Elemental Awakening';
        updateAvailableCards();
    };
    
    const setLabel = document.createElement('h3');
    setLabel.textContent = currentCardSet;
    setLabel.style.cssText = 'margin: 0; color: #ecf0f1;';
    
    const nextArrow = document.createElement('button');
    nextArrow.textContent = '▶';
    nextArrow.style.cssText = 'font-size: 20px; padding: 5px 15px; background: #3498db; border: none; border-radius: 5px; color: white; cursor: pointer;';
    nextArrow.onclick = () => {
        currentCardSet = currentCardSet === 'Elemental Awakening' ? 'Galactic Adventures' : 'Elemental Awakening';
        updateAvailableCards();
    };
    
    headerDiv.appendChild(prevArrow);
    headerDiv.appendChild(setLabel);
    headerDiv.appendChild(nextArrow);
    
    // Filter cards by current set
    const filteredCards = cardDatabase.filter(cardData => {
        return cardData.id.startsWith(currentCardSet);
    });
    
    // Sort card database by output_id (the number in the filename)
    const sortedCards = [...filteredCards].sort((a, b) => {
        const aNum = parseInt(a.id.match(/(\d+)/)?.[0] || '0');
        const bNum = parseInt(b.id.match(/(\d+)/)?.[0] || '0');
        return aNum - bNum;
    });
    
    // Group all creature and item cards
    sortedCards.forEach(cardData => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'builder-card';
        cardDiv.dataset.cardId = cardData.id;
        
        const img = document.createElement('img');
        img.src = `cards/${cardData.id}`;
        img.alt = cardData.name;
        
        const cardType = getCardType(cardData);
        const typeLabel = document.createElement('div');
        typeLabel.className = 'card-type-label';
        typeLabel.textContent = cardType;
        typeLabel.style.fontSize = '10px';
        typeLabel.style.padding = '2px 5px';
        typeLabel.style.background = getTypeColor(cardType);
        typeLabel.style.borderRadius = '3px';
        typeLabel.style.marginTop = '5px';
        
        cardDiv.appendChild(img);
        cardDiv.appendChild(typeLabel);
        
        // Add hover zoom
        cardDiv.addEventListener('mouseenter', () => showCardZoom(cardData.id));
        cardDiv.addEventListener('mouseleave', hideCardZoom);
        
        cardDiv.addEventListener('click', () => addCardToDeck(cardData.id));
        
        availableCards.appendChild(cardDiv);
    });
    
    updateDeckBuilder();
}

function getTypeColor(type) {
    switch(type) {
        case 'Mystic': return '#9b59b6';
        case 'Wind': return '#3498db';
        case 'Celestial': return '#2ecc71';
        case 'Mechanic': return '#f39c12';
        case 'Neutral': return '#95a5a6';
        default: return '#34495e';
    }
}

function addCardToDeck(cardId) {
    // Count how many copies of this card are already in the deck
    const count = customDeckCards.filter(id => id === cardId).length;
    
    // Max 2 copies per card rule
    if (count >= 2) {
        alert("You can only have up to 2 copies of the same card in your deck!");
        return;
    }
    
    customDeckCards.push(cardId);
    updateDeckBuilder();
}

function removeCardFromDeck(index) {
    customDeckCards.splice(index, 1);
    updateDeckBuilder();
}

function updateDeckBuilder() {
    const deckCardsDiv = document.getElementById('custom-deck-cards');
    const countSpan = document.getElementById('deck-card-count');
    const validationDiv = document.getElementById('deck-validation');
    
    countSpan.textContent = customDeckCards.length;
    deckCardsDiv.innerHTML = '';
    
    // Count unique cards
    const cardCounts = {};
    customDeckCards.forEach(cardId => {
        cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    });
    
    // Display each unique card with count
    Object.keys(cardCounts).sort().forEach(cardId => {
        const cardData = getCardData(cardId);
        const count = cardCounts[cardId];
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'builder-card-in-deck';
        
        const img = document.createElement('img');
        img.src = `cards/${cardId}`;
        img.alt = cardData.name;
        img.style.width = '60px';
        img.style.cursor = 'pointer';
        
        const countDiv = document.createElement('div');
        countDiv.textContent = `× ${count}`;
        countDiv.style.fontSize = '14px';
        countDiv.style.fontWeight = 'bold';
        
        // Make the entire card clickable to remove one copy
        cardDiv.style.cursor = 'pointer';
        cardDiv.onclick = () => {
            const index = customDeckCards.indexOf(cardId);
            if (index !== -1) removeCardFromDeck(index);
        };
        
        cardDiv.appendChild(img);
        cardDiv.appendChild(countDiv);
        
        // Add hover zoom
        img.addEventListener('mouseenter', () => showCardZoom(cardId));
        img.addEventListener('mouseleave', hideCardZoom);
        
        deckCardsDiv.appendChild(cardDiv);
    });
    
    // Validate deck
    const validation = validateDeck(customDeckCards);
    if (!validation.valid) {
        validationDiv.textContent = validation.error;
        validationDiv.style.color = '#e74c3c';
    } else {
        validationDiv.textContent = '✓ Deck is valid!';
        validationDiv.style.color = '#2ecc71';
    }
}

function saveCustomDeckHandler() {
    const deckName = document.getElementById('custom-deck-name').value.trim();
    
    if (!deckName) {
        alert("Please enter a deck name!");
        return;
    }
    
    const validation = validateDeck(customDeckCards);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    
    saveCustomDeck(deckName, [...customDeckCards]);
    alert(`Deck "${deckName}" saved successfully!`);
    closeDeckBuilder();
    showDeckSelection();
}

function closeDeckBuilder() {
    document.getElementById('deck-builder-modal').style.display = 'none';
    customDeckCards = [];
}

window.closeDeckBuilder = closeDeckBuilder;

// Setup event listeners
function setupEventListeners() {
    document.getElementById('done-btn').addEventListener('click', handleDone);
    document.getElementById('energy-btn').addEventListener('click', handleEnergyButton);
    document.getElementById('attack-btn').addEventListener('click', () => handleAttack(1));
    document.getElementById('attack2-btn').addEventListener('click', () => handleAttack(2));
    document.getElementById('retreat-btn').addEventListener('click', handleRetreatButton);
    document.getElementById('player-discard-btn').addEventListener('click', () => showDiscardPile('player'));
    document.getElementById('opponent-discard-btn').addEventListener('click', () => showDiscardPile('opponent'));
    document.getElementById('new-game-btn').addEventListener('click', resetAndStartNewGame);
    
    // Add event listener for save custom deck button (if it exists)
    const saveBtn = document.getElementById('save-custom-deck-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCustomDeckHandler);
    }
}

// Render the game
function renderGame() {
    updateDeckCounts();
    updatePoints();
    updateTurnIndicator();
    renderHand('player');
    renderHand('opponent');
    renderBoard('player');
    renderBoard('opponent');
    updateActionButtons();
}

function updateDeckCounts() {
    document.getElementById('player-deck-count').textContent = gameState.player.deck.length;
    document.getElementById('opponent-deck-count').textContent = gameState.opponent.deck.length;
    document.getElementById('player-discard-btn').textContent = `Your Discard Pile (${gameState.player.discardPile.length})`;
    document.getElementById('opponent-discard-btn').textContent = `Opponent's Discard Pile (${gameState.opponent.discardPile.length})`;
}

function updatePoints() {
    document.getElementById('player-points').textContent = gameState.player.points;
    document.getElementById('opponent-points').textContent = gameState.opponent.points;
}

function updateTurnIndicator() {
    const indicator = document.getElementById('turn-indicator');
    const turnNum = document.getElementById('turn-number');
    
    turnNum.textContent = gameState.turnNumber;
    
    if (gameState.phase === 'setup') {
        indicator.textContent = 'Setup Phase - Place your active creature';
    } else if (gameState.phase === 'gameOver') {
        indicator.textContent = 'Game Over!';
    } else {
        indicator.textContent = gameState.currentTurn === 'player' ? 'Your Turn' : "Opponent's Turn";
    }
}

function renderHand(player) {
    const hand = gameState[player].hand;
    const handElement = document.getElementById(`${player}-hand`);
    handElement.innerHTML = '';

    if (player === 'opponent') {
        // Show card backs for opponent
        hand.forEach(() => {
            const cardBack = document.createElement('div');
            cardBack.className = 'card-back';
            cardBack.textContent = 'Card';
            handElement.appendChild(cardBack);
        });
    } else {
        // Show actual cards for player
        hand.forEach((card, index) => {
            const cardElement = createCardElement(card, player, 'hand', index);
            handElement.appendChild(cardElement);
        });
    }
}

function renderBoard(player) {
    // Render active card
    const activeSlot = document.querySelector(`.active-slot[data-player="${player}"]`);
    activeSlot.innerHTML = '';
    if (gameState[player].active) {
        const cardElement = createCardElement(gameState[player].active, player, 'active');
        activeSlot.appendChild(cardElement);
        
        // Add ability button for active creature if player's turn
        if (player === 'player' && gameState[player].active.data.abilityName) {
            const abilityBtn = document.getElementById('ability-active-btn');
            if (abilityBtn) {
                const card = gameState[player].active;
                abilityBtn.textContent = card.data.abilityName;
                abilityBtn.style.display = 'inline-block';
                
                // Check if ability can be used
                const canUse = checkAbilityUsable(card, 'active');
                abilityBtn.disabled = !canUse;
                
                // Update click handler
                abilityBtn.onclick = () => {
                    if (canUse) {
                        useAbility(card, player, 'active', null);
                    }
                };
            }
        } else if (player === 'player') {
            // Remove ability button if active creature doesn't have one
            const abilityBtn = document.getElementById('ability-active-btn');
            if (abilityBtn) {
                abilityBtn.style.display = 'none';
            }
        }
    } else {
        // No active creature, hide ability button
        if (player === 'player') {
            const abilityBtn = document.getElementById('ability-active-btn');
            if (abilityBtn) {
                abilityBtn.style.display = 'none';
            }
        }
    }

    // Render bench
    gameState[player].bench.forEach((card, index) => {
        const benchSlot = document.querySelector(`.bench-slot[data-player="${player}"][data-slot="${index}"]`);
        benchSlot.innerHTML = '';
        
        if (card) {
            const cardElement = createCardElement(card, player, 'bench', index);
            benchSlot.appendChild(cardElement);
            
            // Handle ability button for bench creature (player only)
            if (player === 'player') {
                const abilityBtn = document.getElementById(`bench-ability-btn-${index}`);
                if (abilityBtn) {
                    if (card.data.abilityName && (card.data.abilityLocation === 'any' || card.data.abilityLocation === 'bench')) {
                        abilityBtn.textContent = card.data.abilityName;
                        abilityBtn.style.display = 'block';
                        
                        // Check if ability can be used
                        const canUse = checkAbilityUsable(card, 'bench');
                        abilityBtn.disabled = !canUse;
                        
                        abilityBtn.onclick = (e) => {
                            e.stopPropagation();
                            if (canUse) {
                                useAbility(card, player, 'bench', index);
                            }
                        };
                    } else {
                        abilityBtn.style.display = 'none';
                    }
                }
            }
        } else {
            // No card in this bench slot - hide ability button
            if (player === 'player') {
                const abilityBtn = document.getElementById(`bench-ability-btn-${index}`);
                if (abilityBtn) {
                    abilityBtn.style.display = 'none';
                }
            }
        }
    });
}

function createCardElement(card, player, location, index = null) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'game-card';
    
    const img = document.createElement('img');
    img.src = `cards/${card.id}`;
    img.alt = card.data.name;
    cardDiv.appendChild(img);

    // Add energy indicators
    if (card.energy > 0 && card.data.stage !== "Item") {
        const energyDiv = document.createElement('div');
        energyDiv.className = 'energy-indicators';
        for (let i = 0; i < card.energy; i++) {
            const energyIcon = document.createElement('div');
            energyIcon.className = 'energy-icon';
            energyDiv.appendChild(energyIcon);
        }
        cardDiv.appendChild(energyDiv);
    }

    // Add damage indicator
    if (card.damage > 0 && card.data.stage !== "Item") {
        const damageDiv = document.createElement('div');
        damageDiv.className = 'damage-indicator';
        damageDiv.textContent = card.damage;
        cardDiv.appendChild(damageDiv);
    }
    
    // Add hallucination indicator
    if (StatusConditionManager.hasStatus(card, 'hallucination') && card.data.stage !== "Item") {
        const hallucinationDiv = document.createElement('div');
        hallucinationDiv.className = 'hallucination-indicator';
        hallucinationDiv.textContent = '😵';
        hallucinationDiv.title = 'Hallucinating';
        cardDiv.appendChild(hallucinationDiv);
    }
    
    // Add flux indicator
    if (StatusConditionManager.hasStatus(card, 'flux') && card.data.stage !== "Item") {
        const fluxDiv = document.createElement('div');
        fluxDiv.className = 'flux-indicator';
        fluxDiv.textContent = '⚡';
        fluxDiv.title = 'Flux - Energy attachment requires coin flip';
        cardDiv.appendChild(fluxDiv);
    }
    
    // Add lock indicator
    if (StatusConditionManager.hasStatus(card, 'lock') && card.data.stage !== "Item") {
        const lockDiv = document.createElement('div');
        lockDiv.className = 'lock-indicator';
        lockDiv.textContent = '🔒';
        lockDiv.title = 'Lock - Item usage requires coin flip';
        cardDiv.appendChild(lockDiv);
    }

    // Add HP display
    if (card.data.stage !== "Item") {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'card-stats';
        const currentHp = card.data.hp - card.damage;
        statsDiv.innerHTML = `<span>HP: ${currentHp}/${card.data.hp}</span>`;
        cardDiv.appendChild(statsDiv);
    }

    // Add hover zoom effect
    cardDiv.addEventListener('mouseenter', () => showCardZoom(card.id));
    cardDiv.addEventListener('mouseleave', hideCardZoom);

    // Add click handlers
    if (player === 'player') {
        if (location === 'hand') {
            cardDiv.addEventListener('click', () => handleCardClick(card, index));
        } else if (location === 'bench' || location === 'active') {
            cardDiv.addEventListener('click', () => handleBoardCardClick(card, location, index));
        }
    }

    return cardDiv;
}

function showCardZoom(cardId) {
    const zoom = document.getElementById('card-zoom');
    const img = document.getElementById('zoom-image');
    img.src = `cards/${cardId}`;
    zoom.style.display = 'block';
}

function hideCardZoom() {
    document.getElementById('card-zoom').style.display = 'none';
}

// Discard pile functions
function showDiscardPile(player) {
    const modal = document.getElementById('discard-modal');
    const title = document.getElementById('discard-title');
    const cardsDiv = document.getElementById('discard-cards');
    
    title.textContent = player === 'player' ? 'Your Discard Pile' : "Opponent's Discard Pile";
    cardsDiv.innerHTML = '';
    
    if (gameState[player].discardPile.length === 0) {
        cardsDiv.innerHTML = '<p style="color: #fff; padding: 20px;">No cards in discard pile</p>';
    } else {
        gameState[player].discardPile.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'modal-card';
            
            const img = document.createElement('img');
            img.src = `cards/${card.id}`;
            img.alt = card.data.name;
            cardDiv.appendChild(img);
            
            // Add hover zoom
            cardDiv.addEventListener('mouseenter', () => showCardZoom(card.id));
            cardDiv.addEventListener('mouseleave', hideCardZoom);
            
            cardsDiv.appendChild(cardDiv);
        });
    }
    
    modal.style.display = 'flex';
}

function closeDiscardModal() {
    document.getElementById('discard-modal').style.display = 'none';
}

// Flash item card for opponent
function flashItemCard(cardId, callback) {
    const flash = document.getElementById('item-flash');
    const img = document.getElementById('flash-image');
    
    img.src = `cards/${cardId}`;
    flash.style.display = 'flex';
    
    setTimeout(() => {
        flash.style.display = 'none';
        if (callback) callback();
    }, 1500);
}

// Make closeDiscardModal available globally
window.closeDiscardModal = closeDiscardModal;

// Handle card click from hand
function handleCardClick(card, handIndex) {
    // Block all actions if game is over
    if (gameState.phase === 'gameOver') return;
    
    if (gameState.phase === 'setup') {
        handleSetupCardClick(card, handIndex);
    } else if (gameState.currentTurn === 'player' && !gameState.player.hasAttacked) {
        handlePlayCardClick(card, handIndex);
    }
}

function handleSetupCardClick(card, handIndex) {
    // Only allow Stage 1 cards during setup
    if (card.data.stage !== "Stage 1") {
        alert("You can only place Stage 1 creatures during setup!");
        return;
    }

    gameState.selectedCard = {card, handIndex};
    
    // If no active creature, force selection of active slot first
    if (!gameState.player.active) {
        document.querySelector('.active-slot[data-player="player"]').classList.add('can-place');
        // Only allow active slot
        const activeSlot = document.querySelector('.active-slot[data-player="player"]');
        activeSlot.addEventListener('click', handleSlotClick, {once: true});
    } else {
        // Active exists, can place on bench
        gameState.player.bench.forEach((slot, index) => {
            if (!slot) {
                document.querySelector(`.bench-slot[data-player="player"][data-slot="${index}"]`).classList.add('can-place');
            }
        });
        
        // Add click handlers to bench slots only
        document.querySelectorAll('.bench-slot.can-place').forEach(slot => {
            slot.addEventListener('click', handleSlotClick, {once: true});
        });
    }
}

function handleSlotClick(e) {
    const slot = e.currentTarget;
    const player = slot.dataset.player;
    
    if (player !== 'player') return;

    // Remove highlights
    document.querySelectorAll('.can-place').forEach(s => s.classList.remove('can-place'));

    if (!gameState.selectedCard) return;

    const {card, handIndex} = gameState.selectedCard;

    // Place card
    if (slot.classList.contains('active-slot')) {
        gameState.player.active = card;
        gameState.player.hand.splice(handIndex, 1);
    } else if (slot.classList.contains('bench-slot')) {
        const benchIndex = parseInt(slot.dataset.slot);
        gameState.player.bench[benchIndex] = card;
        gameState.player.hand.splice(handIndex, 1);
        turnTracker.playedThisTurn.add(card);
    }

    gameState.selectedCard = null;
    renderGame();
    checkSetupComplete();
}

function checkSetupComplete() {
    if (gameState.player.active && !gameState.setupReady.player) {
        gameState.setupReady.player = true;
    }

    // AI setup
    if (!gameState.setupReady.opponent && !gameState.opponent.active) {
        aiSetup();
    }

    // Don't auto-start - wait for player to click Done
}

function aiSetup() {
    // Find all Stage 1 cards
    const stage1Cards = gameState.opponent.hand.filter(card => card.data.stage === "Stage 1");
    
    if (stage1Cards.length === 0) return;

    // Place first Stage 1 as active
    const activeCard = stage1Cards[0];
    const activeIndex = gameState.opponent.hand.indexOf(activeCard);
    gameState.opponent.active = activeCard;
    gameState.opponent.hand.splice(activeIndex, 1);

    // Place remaining Stage 1 cards on bench
    const remainingStage1 = gameState.opponent.hand.filter(card => card.data.stage === "Stage 1");
    remainingStage1.forEach((card, i) => {
        if (i < 3) {
            const handIndex = gameState.opponent.hand.indexOf(card);
            gameState.opponent.bench[i] = card;
            gameState.opponent.hand.splice(handIndex, 1);
        }
    });

    gameState.setupReady.opponent = true;
    renderGame();
}

function startGame() {
    gameState.phase = 'playing';
    gameState.turnNumber = 0; // Start at 0, will increment to 1 when first turn starts
    gameState.currentTurn = Math.random() < 0.5 ? 'player' : 'opponent';
    
    // Clear turn tracker
    turnTracker.playedThisTurn.clear();
    turnTracker.evolvedThisTurn.clear();
    turnTracker.evolvedIds.clear();
    
    // Increment turn counter for first turn
    gameState.turnNumber++;
    
    renderGame();
    
    if (gameState.currentTurn === 'opponent') {
        setTimeout(aiTurn, 1000);
    }
}

// Handle playing cards during game
function handlePlayCardClick(card, handIndex) {
    // Cancel any previous selections when clicking a new card
    if (gameState.selectedCard) {
        // Clear highlights from previous selection
        document.querySelectorAll('.can-select').forEach(s => {
            s.classList.remove('can-select');
            // Clone and replace to remove all event listeners
            const clone = s.cloneNode(true);
            s.parentNode.replaceChild(clone, s);
        });
        document.querySelectorAll('.can-place').forEach(s => {
            s.classList.remove('can-place');
            // Clone and replace to remove all event listeners
            const clone = s.cloneNode(true);
            s.parentNode.replaceChild(clone, s);
        });
        gameState.selectedCard = null;
    }
    
    if (card.data.stage === "Item") {
        // Check if item already used this turn
        if (gameState.player.itemUsedThisTurn) {
            alert("You can only use one item card per turn!");
            return;
        }
        useItemCard(card, handIndex);
    } else if (card.data.stage === "Stage 1") {
        // Can only place on empty bench slots
        gameState.selectedCard = {card, handIndex, type: 'place'};
        highlightEmptyBenchSlots('player');
    } else {
        // Evolution card - check if turn is >= 3
        if (gameState.turnNumber < 3) {
            alert("You cannot evolve creatures until turn 3!");
            return;
        }
        gameState.selectedCard = {card, handIndex, type: 'evolve'};
        highlightEvolvableCards('player');
    }
}

function highlightEmptyBenchSlots(player) {
    gameState[player].bench.forEach((slot, index) => {
        if (!slot) {
            const slotElement = document.querySelector(`.bench-slot[data-player="${player}"][data-slot="${index}"]`);
            slotElement.classList.add('can-place');
            slotElement.addEventListener('click', placeBenchCard, {once: true});
        }
    });
}

function placeBenchCard(e) {
    const slot = e.currentTarget;
    const benchIndex = parseInt(slot.dataset.slot);
    
    document.querySelectorAll('.can-place').forEach(s => s.classList.remove('can-place'));
    
    if (!gameState.selectedCard) return;

    const {card, handIndex} = gameState.selectedCard;
    gameState.player.bench[benchIndex] = card;
    gameState.player.hand.splice(handIndex, 1);
    turnTracker.playedThisTurn.add(card);
    
    gameState.selectedCard = null;
    renderGame();
}

function highlightEvolvableCards(player) {
    // Check active card
    if (gameState[player].active && canEvolve(gameState[player].active, gameState.selectedCard.card, 'active', null)) {
        const activeSlot = document.querySelector(`.active-slot[data-player="${player}"]`);
        activeSlot.classList.add('can-select');
        activeSlot.addEventListener('click', () => evolveCard(player, 'active', null), {once: true});
    }
    
    // Check bench
    gameState[player].bench.forEach((card, index) => {
        if (card && canEvolve(card, gameState.selectedCard.card, 'bench', index)) {
            const benchSlot = document.querySelector(`.bench-slot[data-player="${player}"][data-slot="${index}"]`);
            benchSlot.classList.add('can-select');
            benchSlot.addEventListener('click', () => evolveCard(player, 'bench', index), {once: true});
        }
    });
}

function canEvolve(targetCard, evolutionCard, location, index) {
    // Check if evolution card's prevStage matches target card's name
    if (evolutionCard.data.prevStage !== targetCard.data.name) return false;
    
    // Can't evolve if target was played or evolved this turn
    // Check both card object (for backward compatibility) and evolutionId
    if (turnTracker.playedThisTurn.has(targetCard) || 
        turnTracker.evolvedThisTurn.has(targetCard) ||
        (targetCard.evolutionId && turnTracker.evolvedIds.has(targetCard.evolutionId))) {
        return false;
    }
    
    return true;
}

function evolveCard(player, location, index) {
    document.querySelectorAll('.can-select').forEach(s => s.classList.remove('can-select'));
    
    if (!gameState.selectedCard) return;

    const {card, handIndex} = gameState.selectedCard;
    let targetCard;
    
    if (location === 'active') {
        targetCard = gameState[player].active;
    } else {
        targetCard = gameState[player].bench[index];
    }

    // Transfer damage and energy
    card.damage = targetCard.damage;
    card.energy = targetCard.energy;
    
    // Transfer evolutionId from target card (or create one if missing)
    card.evolutionId = targetCard.evolutionId || Math.random().toString(36).substr(2, 9);
    
    // Build evolution chain - add target card to the chain, then transfer the entire chain
    card.evolutionChain = targetCard.evolutionChain || [];
    card.evolutionChain.push({
        id: targetCard.id,
        data: targetCard.data
    });
    
    // Initialize ability flags (don't inherit from previous evolution)
    card.abilityUsedThisTurn = false;
    card.absorbEnergyActive = false;
    card.energizedHealingAmount = 0;
    card.healingRetreatAmount = 0;
    
    // Replace the card
    if (location === 'active') {
        gameState[player].active = card;
    } else {
        gameState[player].bench[index] = card;
    }
    
    // Remove from hand
    gameState[player].hand.splice(handIndex, 1);
    
    // Mark as evolved this turn (track both card object and evolutionId)
    turnTracker.evolvedThisTurn.add(card);
    if (card.evolutionId) {
        turnTracker.evolvedIds.add(card.evolutionId);
    }
    
    // Set evolvedLastTurn flag for Thunder Rush ability tracking
    gameState[player].evolvedLastTurn = true;
    
    gameState.selectedCard = null;
    renderGame();
}

// Item cards
function useItemCard(card, handIndex) {
    // Check if Mirage Shield is active (opponent used it last turn)
    if (gameState.player.cantUseItemsNextTurn) {
        alert("Your opponent used Mirage Shield! You cannot use items this turn!");
        return;
    }
    
    // Check if active creature has Lock condition
    if (gameState.player.active && StatusConditionManager.hasStatus(gameState.player.active, 'lock')) {
        alert("Your active creature is affected by Lock! Flipping a coin to determine if you can use the item...");
        const flip = flipCoin();
        alert(`Coin flip: ${flip}`);
        
        if (flip === 'tails') {
            alert("Coin was tails! You cannot use this item card. It returns to your hand.");
            gameState.player.itemUsedThisTurn = true; // Mark as used so can't try again this turn
            return;
        } else {
            alert("Coin was heads! You can use the item normally.");
        }
    }
    
    // Track that player used an item this turn for Energy Siphon ability
    gameState.player.usedItemThisTurn = true;
    
    if (card.data.name === "Potion") {
        usePotionCard(handIndex);
    } else if (card.data.name === "Card Draw") {
        useCardDrawCard(handIndex);
    } else if (card.data.name === "Booster") {
        useBoosterCard(handIndex);
    } else if (card.data.name === "Power-Up") {
        usePowerUpCard(handIndex);
    } else if (card.data.name === "Remedy") {
        useRemedyCard(handIndex);
    } else if (card.data.name === "Energy Antenna") {
        useEnergyAntennaCard(handIndex);
    } else if (card.data.name === "Revive Crystal") {
        useReviveCrystalCard(handIndex);
    } else if (card.data.name === "Shield Barrier") {
        useShieldBarrierCard(handIndex);
    } else if (card.data.name === "Aura Crystal") {
        useAuraCrystalCard(handIndex);
    } else if (card.data.name === "Healing Crystal") {
        useHealingCrystalCard(handIndex);
    } else if (card.data.name === "Disruptor") {
        useDisruptorCard(handIndex);
    } else if (card.data.name === "Amulet") {
        useAmuletCard(handIndex);
    } else if (card.data.name === "Gale Shield") {
        useGaleShieldCard(handIndex);
    } else if (card.data.name === "Mystic Scroll") {
        useMysticScrollCard(handIndex);
    }
}

function usePotionCard(handIndex) {
    gameState.selectedCard = {handIndex, type: 'potion'};
    
    // Highlight damaged creatures
    if (gameState.player.active && gameState.player.active.damage > 0) {
        const activeSlot = document.querySelector('.active-slot[data-player="player"]');
        activeSlot.classList.add('can-select');
        activeSlot.addEventListener('click', () => healCard('player', 'active', null), {once: true});
    }
    
    gameState.player.bench.forEach((card, index) => {
        if (card && card.damage > 0) {
            const benchSlot = document.querySelector(`.bench-slot[data-player="player"][data-slot="${index}"]`);
            benchSlot.classList.add('can-select');
            benchSlot.addEventListener('click', () => healCard('player', 'bench', index), {once: true});
        }
    });
}

function healCard(player, location, index) {
    document.querySelectorAll('.can-select').forEach(s => s.classList.remove('can-select'));
    
    let card;
    if (location === 'active') {
        card = gameState[player].active;
    } else {
        card = gameState[player].bench[index];
    }
    
    // Heal the creature (automatically handles Absorb Energy)
    healCreature(card, 20);
    
    // Add to discard pile
    const usedCard = gameState.player.hand[gameState.selectedCard.handIndex];
    gameState.player.discardPile.push(usedCard);
    
    // Remove potion from hand
    gameState.player.hand.splice(gameState.selectedCard.handIndex, 1);
    gameState.selectedCard = null;
    
    // Mark item as used
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
}

function useCardDrawCard(handIndex) {
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    
    // Draw 2 cards
    drawCards('player', 2);
    
    // Remove card from hand
    gameState.player.hand.splice(handIndex, 1);
    
    // Mark item as used
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
}

function useBoosterCard(handIndex) {
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    
    gameState.player.boosterActive = true;
    
    // Remove card from hand
    gameState.player.hand.splice(handIndex, 1);
    
    // Mark item as used
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
    alert("Booster activated! Your next attack will deal +20 damage.");
}

function usePowerUpCard(handIndex) {
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    
    // Activate Power-Up for next 3 turns
    gameState.player.powerUpTurnsRemaining = 3;
    
    // Remove card from hand
    gameState.player.hand.splice(handIndex, 1);
    
    // Mark item as used
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
    alert("Power-Up activated! Your attacks will deal +10 damage for the next 3 turns.");
}

function useRemedyCard(handIndex) {
    // Check if active creature has any special conditions
    if (!gameState.player.active) {
        alert("You have no active creature!");
        return;
    }
    
    const activeCreature = gameState.player.active;
    const hasSpecialCondition = activeCreature.hallucinating || activeCreature.hasFlux || activeCreature.hasLock;
    
    if (!hasSpecialCondition) {
        alert("Your active creature has no special conditions to cure!");
        return;
    }
    
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    
    // Cure all special conditions
    if (activeCreature.hallucinating) {
        activeCreature.hallucinating = false;
        activeCreature.hallucinationFlip = null;
    }
    if (activeCreature.hasFlux) {
        activeCreature.hasFlux = false;
    }
    if (activeCreature.hasLock) {
        activeCreature.hasLock = false;
    }
    
    // Remove card from hand
    gameState.player.hand.splice(handIndex, 1);
    
    // Mark item as used
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
    alert("Remedy used! Your active creature has been cured of all special conditions.");
}

// Galactic Adventures Item Cards
function useEnergyAntennaCard(handIndex) {
    // Energy Antenna - attach 1 energy to a Mechanic creature
    const mechanicCreatures = [];
    if (gameState.player.active && getCardType(gameState.player.active.data) === 'Mechanic') {
        mechanicCreatures.push({card: gameState.player.active, location: 'active'});
    }
    gameState.player.bench.forEach((card, idx) => {
        if (card && getCardType(card.data) === 'Mechanic') {
            mechanicCreatures.push({card: card, location: 'bench', index: idx});
        }
    });
    
    if (mechanicCreatures.length === 0) {
        alert("You have no Mechanic creatures to attach energy to!");
        return;
    }
    
    // Store the item card index for later use
    gameState.selectedCard = {handIndex, type: 'energyAntenna'};
    
    // Highlight Mechanic creatures for selection
    if (gameState.player.active && getCardType(gameState.player.active.data) === 'Mechanic') {
        const activeSlot = document.querySelector('.active-slot[data-player="player"]');
        activeSlot.classList.add('can-select');
        activeSlot.addEventListener('click', () => attachEnergyAntennaEnergy('player', 'active', null), {once: true});
    }
    
    gameState.player.bench.forEach((card, index) => {
        if (card && getCardType(card.data) === 'Mechanic') {
            const benchSlot = document.querySelector(`.bench-slot[data-player="player"][data-slot="${index}"]`);
            benchSlot.classList.add('can-select');
            benchSlot.addEventListener('click', () => attachEnergyAntennaEnergy('player', 'bench', index), {once: true});
        }
    });
}

function attachEnergyAntennaEnergy(player, location, index) {
    // Remove all selection highlights
    document.querySelectorAll('.can-select').forEach(s => s.classList.remove('can-select'));
    
    let card;
    if (location === 'active') {
        card = gameState[player].active;
    } else {
        card = gameState[player].bench[index];
    }
    
    // Attach energy
    card.energy++;
    
    // Add to discard pile
    const usedCard = gameState.player.hand[gameState.selectedCard.handIndex];
    gameState.player.discardPile.push(usedCard);
    
    // Remove Energy Antenna from hand
    gameState.player.hand.splice(gameState.selectedCard.handIndex, 1);
    
    // Mark item as used
    gameState.player.itemUsedThisTurn = true;
    
    // Clear selected card state
    gameState.selectedCard = null;
    
    renderGame();
    alert(`Energy Antenna used! Attached 1 energy to ${card.data.name}!`);
}

function useReviveCrystalCard(handIndex) {
    // Revive Crystal - choose creature from discard pile and add to hand
    const creatureCards = gameState.player.discardPile.filter(c => c.data.stage !== 'Item');
    
    if (creatureCards.length === 0) {
        alert("No creature cards in your discard pile!");
        return;
    }
    
    // For simplicity, take first creature card
    const revivedCard = creatureCards[0];
    const index = gameState.player.discardPile.indexOf(revivedCard);
    gameState.player.discardPile.splice(index, 1);
    
    // Reset the creature completely (full HP, no status conditions, no energy, etc.)
    revivedCard.damage = 0;
    revivedCard.energy = 0;
    revivedCard.hallucinating = false;
    revivedCard.hallucinationFlip = null;
    revivedCard.hasFlux = false;
    revivedCard.hasLock = false;
    revivedCard.cantRetreat = false;
    revivedCard.cantAttackNextTurn = false;
    revivedCard.cantAttackUntilTurn = null;
    revivedCard.abilityUsedThisTurn = false;
    revivedCard.cantUseOverdrive = 0;
    revivedCard.mindRippleShield = false;
    revivedCard.cottonGuardShield = false;
    revivedCard.chillRechargeBonus = null;
    
    // Add to hand
    gameState.player.hand.push(revivedCard);
    
    // Add Revive Crystal to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    gameState.player.hand.splice(handIndex, 1);
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
    alert(`Revive Crystal used! ${revivedCard.data.name} was fully restored and added to your hand!`);
}

function useShieldBarrierCard(handIndex) {
    // Shield Barrier - reduce damage to active by 20 next turn
    if (!gameState.player.active) {
        alert("You have no active creature!");
        return;
    }
    
    gameState.player.shieldBarrierActive = 20;
    
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    gameState.player.hand.splice(handIndex, 1);
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
    alert("Shield Barrier used! Your active creature takes 20 less damage next turn!");
}

function useAuraCrystalCard(handIndex) {
    // Aura Crystal - heal all creatures with damage by 10 HP
    let healedCount = 0;
    
    if (gameState.player.active && gameState.player.active.damage > 0) {
        healCreature(gameState.player.active, 10);
        healedCount++;
    }
    
    gameState.player.bench.forEach(card => {
        if (card && card.damage > 0) {
            healCreature(card, 10);
            healedCount++;
        }
    });
    
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    gameState.player.hand.splice(handIndex, 1);
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
    alert(`Aura Crystal used! Healed ${healedCount} creature(s) for 10 HP each!`);
}

function useHealingCrystalCard(handIndex) {
    // Healing Crystal - heal a Celestial creature by 40 HP (player selects which one)
    const celestialCreatures = [];
    if (gameState.player.active && getCardType(gameState.player.active.data) === 'Celestial' && gameState.player.active.damage > 0) {
        celestialCreatures.push({card: gameState.player.active, location: 'active'});
    }
    gameState.player.bench.forEach((card, idx) => {
        if (card && getCardType(card.data) === 'Celestial' && card.damage > 0) {
            celestialCreatures.push({card: card, location: 'bench', index: idx});
        }
    });
    
    if (celestialCreatures.length === 0) {
        alert("You have no damaged Celestial creatures to heal!");
        return;
    }
    
    // Store the item card index for later use
    gameState.selectedCard = {handIndex, type: 'healingCrystal'};
    
    // Highlight Celestial creatures for selection
    if (gameState.player.active && getCardType(gameState.player.active.data) === 'Celestial' && gameState.player.active.damage > 0) {
        const activeSlot = document.querySelector('.active-slot[data-player="player"]');
        activeSlot.classList.add('can-select');
        activeSlot.addEventListener('click', () => healCelestialCreature('player', 'active', null), {once: true});
    }
    
    gameState.player.bench.forEach((card, index) => {
        if (card && getCardType(card.data) === 'Celestial' && card.damage > 0) {
            const benchSlot = document.querySelector(`.bench-slot[data-player="player"][data-slot="${index}"]`);
            benchSlot.classList.add('can-select');
            benchSlot.addEventListener('click', () => healCelestialCreature('player', 'bench', index), {once: true});
        }
    });
}

function healCelestialCreature(player, location, index) {
    // Remove all selection highlights
    document.querySelectorAll('.can-select').forEach(s => s.classList.remove('can-select'));
    
    let card;
    if (location === 'active') {
        card = gameState[player].active;
    } else {
        card = gameState[player].bench[index];
    }
    
    // Heal creature (automatically handles Absorb Energy)
    const absorbEnergyTriggered = healCreature(card, 40);
    
    // Add to discard pile
    const usedCard = gameState.player.hand[gameState.selectedCard.handIndex];
    gameState.player.discardPile.push(usedCard);
    
    // Remove Healing Crystal from hand
    gameState.player.hand.splice(gameState.selectedCard.handIndex, 1);
    
    // Mark item as used
    gameState.player.itemUsedThisTurn = true;
    
    // Clear selected card state
    gameState.selectedCard = null;
    
    renderGame();
    alert(`Healing Crystal used! Healed ${card.data.name} for 40 HP!${absorbEnergyTriggered ? ' Absorb Energy triggered - gained 1 energy!' : ''}`);
}

function useDisruptorCard(handIndex) {
    // Disruptor - opponent shuffles hand into deck and draws same number minus one
    const opponentHandSize = gameState.opponent.hand.length;
    
    if (opponentHandSize === 0) {
        alert("Opponent has no cards in hand!");
        return;
    }
    
    // Extract card IDs from opponent's hand (hand contains objects, deck contains IDs)
    // Filter out any cards without valid IDs
    const cardIds = gameState.opponent.hand
        .filter(card => card && card.id)
        .map(card => card.id);
    
    // Shuffle opponent's hand back into deck
    gameState.opponent.deck.push(...cardIds);
    gameState.opponent.hand = [];
    shuffleDeck(gameState.opponent.deck);
    
    // Draw cards (original count minus 1)
    const drawCount = Math.max(0, opponentHandSize - 1);
    for (let i = 0; i < drawCount && gameState.opponent.deck.length > 0; i++) {
        const cardId = gameState.opponent.deck.pop();
        const cardData = getCardData(cardId);
        if (cardData) {
            gameState.opponent.hand.push({id: cardId, data: cardData, energy: 0, damage: 0, abilityUsedThisTurn: false});
        } else {
            console.error('Card data not found for ID:', cardId);
        }
    }
    
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    gameState.player.hand.splice(handIndex, 1);
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
    alert(`Disruptor used! Opponent shuffled ${opponentHandSize} cards into deck and drew ${drawCount} cards!`);
}

function useAmuletCard(handIndex) {
    // Amulet - for next 2 turns, all Neutral creatures' attack damage boosted by 20
    gameState.player.amuletTurnsRemaining = 2;
    
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    gameState.player.hand.splice(handIndex, 1);
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
    alert("Amulet used! For the next 2 turns, all your Neutral creatures deal +20 damage!");
}

function useGaleShieldCard(handIndex) {
    // Gale Shield - next turn, Wind creatures take 30 less damage
    gameState.player.galeShieldActive = 30;
    
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    gameState.player.hand.splice(handIndex, 1);
    gameState.player.itemUsedThisTurn = true;
    
    renderGame();
    alert("Gale Shield used! Next turn, your Wind creatures take 30 less damage!");
}

function useMysticScrollCard(handIndex) {
    // Mystic Scroll - draw a Mystic Stage 1 creature from deck, turn ends
    const mysticStage1Cards = gameState.player.deck.filter(c => 
        c.data.stage === 'Stage 1' && getCardType(c.data) === 'Mystic'
    );
    
    if (mysticStage1Cards.length === 0) {
        alert("No Mystic Stage 1 creatures in your deck!");
        // Still use the card
        const usedCard = gameState.player.hand[handIndex];
        gameState.player.discardPile.push(usedCard);
        gameState.player.hand.splice(handIndex, 1);
        gameState.player.itemUsedThisTurn = true;
        gameState.player.hasAttacked = true; // Force turn end
        renderGame();
        setTimeout(endTurn, 1000);
        return;
    }
    
    // Take first Mystic Stage 1
    const drawnCard = mysticStage1Cards[0];
    const deckIndex = gameState.player.deck.indexOf(drawnCard);
    gameState.player.deck.splice(deckIndex, 1);
    gameState.player.hand.push(drawnCard);
    
    // Add to discard pile
    const usedCard = gameState.player.hand[handIndex];
    gameState.player.discardPile.push(usedCard);
    gameState.player.hand.splice(handIndex, 1);
    gameState.player.itemUsedThisTurn = true;
    gameState.player.hasAttacked = true; // Force turn end
    
    renderGame();
    alert(`Mystic Scroll used! Drew ${drawnCard.data.name} from your deck! Your turn ends.`);
    setTimeout(endTurn, 1000);
}

// Handle board card clicks (for energy attachment)
function handleBoardCardClick(card, location, index) {
    // Block if game is over
    if (gameState.phase === 'gameOver') return;
    
    if (gameState.waitingForSelection === 'energy') {
        attachEnergy('player', location, index);
    }
}

// Energy system
function handleEnergyButton() {
    if (gameState.player.energyAttachedThisTurn) return;
    
    // Can't attach energy during setup
    if (gameState.phase === 'setup') {
        alert("You cannot attach energy during setup!");
        return;
    }
    
    // Check if active creature has Flux condition
    if (gameState.player.active && StatusConditionManager.hasStatus(gameState.player.active, 'flux')) {
        // Check if player already flipped coins for Flux this turn
        if (!gameState.player.fluxCheckDoneThisTurn) {
            alert("Your active creature is affected by Flux! Flipping 2 coins to determine if you can attach energy...");
            const flip1 = flipCoin();
            const flip2 = flipCoin();
            alert(`Coin 1: ${flip1}, Coin 2: ${flip2}`);
            
            gameState.player.fluxCheckDoneThisTurn = true; // Mark that we've flipped
            
            if (flip1 === 'tails' && flip2 === 'tails') {
                alert("Both coins were tails! You cannot attach energy this turn due to Flux.");
                gameState.player.energyAttachedThisTurn = true; // Disable button
                updateActionButtons(); // Update UI to show button disabled
                return;
            } else {
                alert("At least one coin was heads! You can proceed to attach energy.");
                gameState.player.fluxCheckPassedThisTurn = true; // Allow attachment
            }
        } else {
            // Already flipped this turn - check if they passed
            if (!gameState.player.fluxCheckPassedThisTurn) {
                // They got 2 tails earlier, shouldn't be able to click again (button should be disabled)
                return;
            }
            // Otherwise, they passed the check earlier, proceed normally
        }
    }
    
    gameState.waitingForSelection = 'energy';
    
    // Highlight all creatures in play
    if (gameState.player.active) {
        const activeSlot = document.querySelector('.active-slot[data-player="player"]');
        activeSlot.classList.add('can-select');
    }
    
    gameState.player.bench.forEach((card, index) => {
        if (card) {
            const benchSlot = document.querySelector(`.bench-slot[data-player="player"][data-slot="${index}"]`);
            benchSlot.classList.add('can-select');
        }
    });
}

function attachEnergy(player, location, index) {
    document.querySelectorAll('.can-select').forEach(s => s.classList.remove('can-select'));
    
    let card;
    if (location === 'active') {
        card = gameState[player].active;
    } else {
        card = gameState[player].bench[index];
    }
    
    card.energy++;
    gameState[player].energyAttachedThisTurn = true;
    gameState.waitingForSelection = null;
    
    // Check for Energized Healing (Galactic Adventures)
    if (card.energizedHealingAmount && card.damage > 0) {
        const healAmount = card.energizedHealingAmount;
        healCreature(card, healAmount);
        alert(`${card.data.name}'s Energized Healing activated! Healed ${healAmount} HP!`);
        card.energizedHealingAmount = 0; // Clear the flag after use
    }
    
    renderGame();
}

// Attack system
function handleAttack(moveNumber) {
    const attacker = gameState.player.active;
    const defender = gameState.opponent.active;
    
    if (!attacker || !defender) return;
    
    // Check if player is affected by Invincible Gambit
    if (gameState.player.invincibleTurnsLeft && gameState.player.invincibleTurnsLeft > 0) {
        alert(`You cannot attack! Invincible Gambit prevents you from attacking for ${gameState.player.invincibleTurnsLeft} more turn(s)!`);
        return;
    }
    
    // Check if player can't attack this turn due to Quick Reflexes or Wing Slap
    if (gameState.player.cantAttackNextTurn) {
        alert(`You can't attack this turn due to Quick Reflexes effect!`);
        return;
    }
    
    // Check if attacker can't attack this turn due to Wing Slap
    if (attacker.cantAttackNextTurn) {
        alert(`${attacker.data.name} can't attack this turn due to Wing Slap effect!`);
        return;
    }
    
    // Check if attacker is hallucinating
    if (StatusConditionManager.hasStatus(attacker, 'hallucination')) {
        const flip = flipCoin();
        alert(`${attacker.data.name} is hallucinating! Coin flip: ${flip}!`);
        if (flip === 'heads') {
            alert(`Hallucination: ${attacker.data.name} will deal 10 extra damage!`);
        } else {
            alert(`Hallucination: ${attacker.data.name} will deal 40 damage to itself!`);
        }
        // Store the flip result to apply later
        attacker.hallucinationFlip = flip;
    }
    
    // Check if can attack (has enough energy)
    const moveCost = moveNumber === 1 ? attacker.data.move1Cost : attacker.data.move2Cost;
    if (!moveCost || attacker.energy < moveCost.length) {
        alert("Not enough energy to attack!");
        return;
    }
    
    // Check if this move is Overdrive Smash and is on cooldown
    const effect = moveNumber === 1 ? attacker.data.move1Effect : attacker.data.move2Effect;
    if (effect === 'overdriveSmash' && attacker.cantUseOverdrive && attacker.cantUseOverdrive > 0) {
        alert(`${attacker.data.name} can't use Overdrive Smash yet! ${attacker.cantUseOverdrive} turn${attacker.cantUseOverdrive > 1 ? 's' : ''} remaining.`);
        return;
    }
    
    let damage = moveNumber === 1 ? attacker.data.move1Damage : attacker.data.move2Damage;
    
    const moveName = moveNumber === 1 ? attacker.data.move1Name : attacker.data.move2Name;
    console.log("Player using move", moveNumber + ":", moveName, "with effect:", effect);
    
    // Handle special damage calculation effects
    let infernoWingFlip = null; // Store the flip result for infernoWing
    
    if (effect === 'dizzyShot') {
        const flip = flipCoin();
        alert(`Dizzy Shot: Coin flip result: ${flip}!`);
        if (flip === 'heads') {
            damage += 20;
            alert(`Coin was heads! Dizzy Shot deals ${damage} damage!`);
        } else {
            alert(`Coin was tails! Dizzy Shot deals ${damage} damage.`);
        }
    } else if (effect === 'infernoWing') {
        infernoWingFlip = flipCoin();
        alert(`Inferno Wing: Coin flip result: ${infernoWingFlip}!`);
        if (infernoWingFlip === 'tails') {
            alert(`Coin was tails! Inferno Wing will deal 20 damage to ${attacker.data.name} after the attack!`);
        } else {
            alert(`Coin was heads! No self-damage.`);
        }
    } else if (effect === 'galeFlip') {
        let headsCount = 0;
        let results = [];
        for (let i = 0; i < 4; i++) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') headsCount++;
        }
        damage = headsCount * 40;
        alert(`Gale Flip: Flipped 4 coins - ${results.join(', ')}!\nGot ${headsCount} heads! Deals ${damage} damage!`);
    } else if (effect === 'coinClash') {
        const flip = flipCoin();
        alert(`Coin Clash: Coin flip result: ${flip}!`);
        if (flip === 'heads') {
            damage = 30;
            alert(`Coin was heads! Coin Clash deals 30 damage!`);
        } else {
            damage = 0;
            alert(`Coin was tails! Coin Clash deals no damage.`);
        }
    } else if (effect === 'diceFury') {
        const roll = rollDice();
        damage = roll * 10;
        alert(`Dice Fury: Rolled a ${roll}! Deals ${damage} damage!`);
    } else if (effect === 'diceTempest') {
        const roll = rollDice();
        damage = roll * 20;
        alert(`Dice Tempest: Rolled a ${roll}! Deals ${damage} damage!`);
    } else if (effect === 'neutralSurge') {
        let neutralCount = 0;
        // Count player's neutral creatures
        if (gameState.player.active && getCardType(gameState.player.active.data) === 'Neutral') neutralCount++;
        gameState.player.bench.forEach(card => {
            if (card && getCardType(card.data) === 'Neutral') neutralCount++;
        });
        // Count opponent's neutral creatures
        if (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Neutral') neutralCount++;
        gameState.opponent.bench.forEach(card => {
            if (card && getCardType(card.data) === 'Neutral') neutralCount++;
        });
        damage = neutralCount * 20;
        alert(`Neutral Surge: Found ${neutralCount} Neutral creatures in play! Deals ${damage} damage!`);
    } else if (effect === 'nightStrike') {
        // Night Strike - 20 damage per energy attached to attacker
        damage = attacker.energy * 20;
        alert(`Night Strike: ${attacker.data.name} has ${attacker.energy} energy attached! Deals ${damage} damage!`);
    } else if (effect === 'etherealPulse') {
        // Ethereal Pulse - 20 damage per energy on both active creatures
        const playerActiveEnergy = gameState.player.active ? gameState.player.active.energy : 0;
        const opponentActiveEnergy = gameState.opponent.active ? gameState.opponent.active.energy : 0;
        const totalEnergy = playerActiveEnergy + opponentActiveEnergy;
        damage = totalEnergy * 20;
        alert(`Ethereal Pulse: Both active creatures have ${totalEnergy} total energy (${playerActiveEnergy} + ${opponentActiveEnergy})! Deals ${damage} damage!`);
    } else if (effect === 'fortuneSmite') {
        const flip = flipCoin();
        alert(`Fortune Smite: Coin flip result: ${flip}!`);
        if (flip === 'heads') {
            damage += 20;
            alert(`Coin was heads! Fortune Smite deals ${damage} damage!`);
        } else {
            alert(`Coin was tails! Fortune Smite deals ${damage} damage.`);
        }
    } else if (effect === 'thornyVines') {
        // Count opponent's creatures in play (active + bench)
        let creatureCount = 0;
        if (gameState.opponent.active) creatureCount++;
        gameState.opponent.bench.forEach(card => {
            if (card) creatureCount++;
        });
        damage = creatureCount * 10;
        alert(`Thorny Vines: Opponent has ${creatureCount} creatures in play! Deals ${damage} damage!`);
    } else if (effect === 'toxicToss') {
        let headsCount = 0;
        let results = [];
        for (let i = 0; i < 2; i++) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') headsCount++;
        }
        damage = headsCount * 20;
        alert(`Toxic Toss: Flipped 2 coins - ${results.join(', ')}!\nGot ${headsCount} heads! Deals ${damage} damage!`);
    } else if (effect === 'scrapStrike') {
        // Count Item cards in opponent's discard pile
        let itemCount = 0;
        gameState.opponent.discardPile.forEach(card => {
            if (card.data && card.data.type === 'Item') itemCount++;
        });
        damage = itemCount * 20;
        alert(`Scrap Strike: Opponent has ${itemCount} Item cards in their discard pile! Deals ${damage} damage!`);
    } else if (effect === 'metallicWing') {
        // This move does 0 base damage but attaches energy after
        damage = 0;
    } else if (effect === 'echoLoop') {
        // Echo Loop - flip coins until tails, +10 damage per heads
        let headsCount = 0;
        let results = [];
        let keepFlipping = true;
        while (keepFlipping) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') {
                headsCount++;
            } else {
                keepFlipping = false;
            }
        }
        const bonusDamage = headsCount * 10;
        damage += bonusDamage;
        alert(`Echo Loop: Flipped ${results.join(', ')}!\nGot ${headsCount} heads before tails! Deals ${damage} damage total (10 base + ${bonusDamage} bonus)!`);
    } else if (effect === 'pinkGust') {
        // Pink Gust - flip 2 coins, 30 damage per heads
        let headsCount = 0;
        let results = [];
        for (let i = 0; i < 2; i++) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') headsCount++;
        }
        damage = headsCount * 30;
        alert(`Pink Gust: Flipped 2 coins - ${results.join(', ')}!\nGot ${headsCount} heads! Deals ${damage} damage!`);
    }
    
    // Galactic Adventures damage calculation effects
    if (effect === 'shadowWrap') {
        // Shadow Wrap - +30 damage if opponent has special condition
        if (defender.hallucinating || defender.hasFlux || defender.hasLock) {
            damage += 30;
            alert(`Shadow Wrap: ${defender.data.name} has a special condition! +30 damage! Total: ${damage}`);
        }
    } else if (effect === 'galacticMeteor') {
        // Galactic Meteor - 10 damage per energy on opponent's active
        damage = defender.energy * 10;
        alert(`Galactic Meteor: ${defender.data.name} has ${defender.energy} energy! Deals ${damage} damage!`);
    } else if (effect === 'verdantStruggle') {
        // Verdant Struggle - Flip 2 coins, if both heads deal 50, otherwise 0
        const flip1 = flipCoin();
        const flip2 = flipCoin();
        alert(`Verdant Struggle: Flipped ${flip1} and ${flip2}`);
        if (flip1 === 'heads' && flip2 === 'heads') {
            damage = 50;
            alert("Both heads! Deals 50 damage!");
        } else {
            damage = 0;
            alert("At least one tails! Deals no damage!");
        }
    } else if (effect === 'furySpin') {
        // Fury Spin - +50 damage if HP is 30 or less
        const attackerRemaining = attacker.data.hp - attacker.damage;
        if (attackerRemaining <= 30) {
            damage += 50;
            alert(`Fury Spin: ${attacker.data.name} has ${attackerRemaining} HP (30 or less)! +50 damage! Total: ${damage}`);
        }
    } else if (effect === 'enragedCharge') {
        // Enraged Charge - +30 damage per energy after 3
        if (attacker.energy > 3) {
            const extraEnergy = attacker.energy - 3;
            damage += extraEnergy * 30;
            alert(`Enraged Charge: ${attacker.data.name} has ${extraEnergy} extra energy! +${extraEnergy * 30} damage! Total: ${damage}`);
        }
    } else if (effect === 'gearGrind') {
        // Gear Grind - Flip coin, if heads +20 damage
        const flip = flipCoin();
        alert(`Gear Grind: Coin flip: ${flip}`);
        if (flip === 'heads') {
            damage += 20;
            alert(`Coin was heads! +20 damage! Total: ${damage}`);
        }
    } else if (effect === 'harshFlinch') {
        // Harsh Flinch - Flip coins until tails, +20 per heads
        let headsCount = 0;
        let results = [];
        let keepFlipping = true;
        while (keepFlipping) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') {
                headsCount++;
            } else {
                keepFlipping = false;
            }
        }
        const bonusDamage = headsCount * 20;
        damage += bonusDamage;
        alert(`Harsh Flinch: Flipped ${results.join(', ')}! Got ${headsCount} heads before tails! +${bonusDamage} damage! Total: ${damage}`);
    } else if (effect === 'foresightBeam') {
        // Foresight Beam - Flip coin, if heads +10 damage
        const flip = flipCoin();
        alert(`Foresight Beam: Coin flip: ${flip}`);
        if (flip === 'heads') {
            damage += 10;
            alert(`Coin was heads! +10 damage! Total: ${damage}`);
        }
    } else if (effect === 'spectralWrapGA') {
        // Spectral Wrap (Galactic Adventures) - +10 damage per energy on opponent's active
        const bonusDamage = defender.energy * 10;
        damage += bonusDamage;
        alert(`Spectral Wrap: ${defender.data.name} has ${defender.energy} energy! +${bonusDamage} damage! Total: ${damage}`);
    } else if (effect === 'featherBarrage') {
        // Feather Barrage - Flip coin, if heads +20 damage
        const flip = flipCoin();
        alert(`Feather Barrage: Coin flip: ${flip}`);
        if (flip === 'heads') {
            damage += 20;
            alert(`Coin was heads! +20 damage! Total: ${damage}`);
        }
    } else if (effect === 'hurricaneWing') {
        // Hurricane Wing - Flip coin, if tails no damage
        const flip = flipCoin();
        alert(`Hurricane Wing: Coin flip: ${flip}`);
        if (flip === 'tails') {
            damage = 0;
            alert("Coin was tails! Hurricane Wing deals no damage!");
        }
    } else if (effect === 'tailDance') {
        // Tail Dance - Flip coin, if tails no damage
        const flip = flipCoin();
        alert(`Tail Dance: Coin flip: ${flip}`);
        if (flip === 'tails') {
            damage = 0;
            alert("Coin was tails! Tail Dance deals no damage!");
        }
    } else if (effect === 'alphabetAssault') {
        // Alphabet Assault - 10 damage per letter in opponent's active creature name
        const letterCount = defender.data.name.length;
        damage = letterCount * 10;
        alert(`Alphabet Assault: ${defender.data.name} has ${letterCount} letters! Deals ${damage} damage!`);
    } else if (effect === 'infernoConstrict') {
        // Inferno Constrict - 30 damage per Mechanic creature on bench
        let mechanicCount = 0;
        gameState.player.bench.forEach(card => {
            if (card && getCardType(card.data) === 'Mechanic') mechanicCount++;
        });
        damage = mechanicCount * 30;
        alert(`Inferno Constrict: ${mechanicCount} Mechanic creatures on your bench! Deals ${damage} damage!`);
    }
    
    // Apply booster
    if (gameState.player.boosterActive) {
        damage += 20;
        gameState.player.boosterActive = false;
    }
    
    // Apply Power-Up bonus
    if (gameState.player.powerUpTurnsRemaining > 0) {
        damage += 10;
    }
    
    // Apply Hallucination effect
    if (attacker.hallucinationFlip === 'heads') {
        damage += 10;
        alert(`Hallucination bonus: +10 damage! Total: ${damage}`);
    }
    
    // Apply Super Effective bonus
    const attackerType = getCardType(attacker.data);
    const defenderType = getCardType(defender.data);
    if (isSuperEffective(attackerType, defenderType)) {
        damage += 10;
        alert(`Super Effective move! ${attackerType} is super effective against ${defenderType}! +10 damage!`);
    }
    
    // Apply Aura of Strength bonus (must be applied before shields)
    if (gameState.player.auraOfStrengthBonus) {
        damage += gameState.player.auraOfStrengthBonus;
        alert(`Aura of Strength bonus: +${gameState.player.auraOfStrengthBonus} damage! Total: ${damage}`);
        gameState.player.auraOfStrengthBonus = 0; // Consumed after this attack
    }
    
    // Apply Sturdy Presence bonus (must be applied before shields)
    if (gameState.player.sturdyPresenceBonus) {
        damage += gameState.player.sturdyPresenceBonus;
        alert(`Sturdy Presence bonus: +${gameState.player.sturdyPresenceBonus} damage! Total: ${damage}`);
        gameState.player.sturdyPresenceBonus = 0; // Consumed after this attack
    }
    
    // Apply Warrior Mode bonus (Galactic Adventures)
    if (gameState.player.warriorModeBonus) {
        damage += gameState.player.warriorModeBonus;
        alert(`Warrior Mode bonus: +${gameState.player.warriorModeBonus} damage! Total: ${damage}`);
        gameState.player.warriorModeBonus = 0; // Consumed after this attack
    }
    
    // Apply Amulet bonus (Galactic Adventures - only for Neutral creatures)
    if (gameState.player.amuletTurnsRemaining > 0 && attackerType === 'Neutral') {
        damage += 20;
        alert(`Amulet bonus: +20 damage for Neutral creature! Total: ${damage}`);
    }
    
    // Apply Thunder Rush (doubles damage if active)
    if (gameState.player.thunderRushActive) {
        damage *= 2;
        alert(`Thunder Rush activated! Damage doubled to ${damage}!`);
        gameState.player.thunderRushActive = false; // Consumed after this attack
    }
    
    // Apply Chill Recharge bonus (from previous turn)
    if (attacker.chillRechargeBonus) {
        damage += 20;
        alert(`Chill Recharge bonus: +20 damage! Total: ${damage}`);
        attacker.chillRechargeBonus = false; // Consumed after this attack
    }
    
    // Apply Sprout Boost bonus (from 2 turns ago)
    if (attacker.sproutBoostActive) {
        damage += 30;
        alert(`Sprout Boost activated! +30 damage! Total: ${damage}`);
        attacker.sproutBoostActive = false; // Consumed after this attack
    }
    
    // Apply Monk's Fury shield (opponent's shield reduces damage to them)
    if (gameState.opponent.monksFuryShield) {
        damage = Math.max(0, damage - 20);
        alert(`Monk's Fury shield reduces damage by 20! ${attacker.data.name} deals ${damage} damage!`);
        gameState.opponent.monksFuryShield = false; // Shield is consumed
    }
    
    // Apply Hard as Steel shield (opponent's shield - only from Mechanic/Neutral attackers)
    if (gameState.opponent.hardAsSteelShield && (attackerType === 'Mechanic' || attackerType === 'Neutral')) {
        const shieldAmount = gameState.opponent.hardAsSteelShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Hard as Steel shield reduces damage by ${shieldAmount}! ${attacker.data.name} deals ${damage} damage!`);
        gameState.opponent.hardAsSteelShield = 0; // Shield is consumed
    }
    
    // Apply Spectral Burst shield (opponent's shield reduces damage to them)
    if (gameState.opponent.spectralBurstShield) {
        const shieldAmount = gameState.opponent.spectralBurstShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Spectral Burst shield reduces damage by ${shieldAmount}! ${attacker.data.name} deals ${damage} damage!`);
        gameState.opponent.spectralBurstShield = 0; // Shield is consumed
    }
    
    // Apply Defense Aura shield (opponent's shield reduces damage to them)
    if (gameState.opponent.defenseAuraShield) {
        const shieldAmount = gameState.opponent.defenseAuraShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Defense Aura shield reduces damage by ${shieldAmount}! ${attacker.data.name} deals ${damage} damage!`);
        gameState.opponent.defenseAuraShield = 0; // Shield is consumed
    }
    
    // Apply Shield Barrier (Galactic Adventures item)
    if (gameState.opponent.shieldBarrierActive) {
        const shieldAmount = gameState.opponent.shieldBarrierActive;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Shield Barrier reduces damage by ${shieldAmount}! ${attacker.data.name} deals ${damage} damage!`);
        gameState.opponent.shieldBarrierActive = 0; // Shield is consumed
    }
    
    // Apply Gale Shield (Galactic Adventures item - only for Wind creatures)
    if (gameState.opponent.galeShieldActive && defenderType === 'Wind') {
        const shieldAmount = gameState.opponent.galeShieldActive;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Gale Shield reduces damage by ${shieldAmount}! ${attacker.data.name} deals ${damage} damage!`);
        gameState.opponent.galeShieldActive = 0; // Shield is consumed
    }
    
    // Apply Mind Ripple shield (Galactic Adventures)
    if (defender.mindRippleShield) {
        damage = Math.max(0, damage - 20);
        alert(`Mind Ripple shield reduces damage by 20! ${attacker.data.name} deals ${damage} damage!`);
        defender.mindRippleShield = false; // Shield is consumed
    }
    
    // Apply Cotton Guard shield (Galactic Adventures)
    if (defender.cottonGuardShield) {
        damage = Math.max(0, damage - 20);
        alert(`Cotton Guard shield reduces damage by 20! ${attacker.data.name} deals ${damage} damage!`);
        defender.cottonGuardShield = false; // Shield is consumed
    }
    
    // Apply Guardian Mode shield (Galactic Adventures - all creatures)
    if (gameState.opponent.guardianModeActive) {
        damage = Math.max(0, damage - 10);
        alert(`Guardian Mode reduces damage by 10! ${attacker.data.name} deals ${damage} damage!`);
    }
    
    // Apply Caprine Guard shield (Galactic Adventures - only from Celestial/Mystic)
    if (gameState.opponent.caprineGuardShield && (attackerType === 'Celestial' || attackerType === 'Mystic')) {
        const shieldAmount = gameState.opponent.caprineGuardShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Caprine Guard reduces damage by ${shieldAmount}! ${attacker.data.name} deals ${damage} damage!`);
        gameState.opponent.caprineGuardShield = 0; // Shield is consumed
    }
    
    // Apply Elemental Fortitude shield (Galactic Adventures - only from Wind/Mechanic, creature-specific)
    if (defender.elementalFortitudeShield && (attackerType === 'Wind' || attackerType === 'Mechanic')) {
        const shieldAmount = defender.elementalFortitudeShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Elemental Fortitude reduces damage by ${shieldAmount}! ${attacker.data.name} deals ${damage} damage!`);
        defender.elementalFortitudeShield = 0; // Shield is consumed
    }
    
    // Apply Metalic Protection (Galactic Adventures - no damage from Mechanic)
    if (defender.metalicProtectionActive && attackerType === 'Mechanic') {
        damage = 0;
        alert(`${defender.data.name}'s Metalic Protection blocks all Mechanic damage! ${attacker.data.name} deals no damage!`);
        // Don't consume the shield here - it lasts the entire turn
    }
    
    console.log("Total damage:", damage, "Defender HP:", defender.data.hp, "Current damage:", defender.damage);
    
    // Check for Guardian ability - redirect damage to bench creature
    if (gameState.opponent.guardianBenchIndex !== null && gameState.opponent.guardianBenchIndex !== undefined) {
        const guardianIndex = gameState.opponent.guardianBenchIndex;
        const guardianCard = gameState.opponent.bench[guardianIndex];
        if (guardianCard) {
            alert(`${guardianCard.data.name} uses Guardian! It takes the damage instead of ${defender.data.name}!`);
            guardianCard.damage += damage;
            gameState.opponent.guardianBenchIndex = null; // Ability consumed
            renderGame();
            
            // Check if guardian is knocked out
            if (guardianCard.damage >= guardianCard.data.hp) {
                alert(`${guardianCard.data.name} was knocked out protecting ${defender.data.name}!`);
                
                // Add all cards in evolution chain to discard pile
                if (guardianCard.evolutionChain && guardianCard.evolutionChain.length > 0) {
                    guardianCard.evolutionChain.forEach(prevCard => {
                        gameState.opponent.discardPile.push(prevCard);
                    });
                }
                gameState.opponent.discardPile.push(guardianCard);
                
                gameState.opponent.bench[guardianIndex] = null;
                gameState.opponent.points++;
                updatePoints();
                // Continue with the rest of the turn
                if (gameState.player.hasAttacked) {
                    setTimeout(() => endTurn(), 500);
                }
                return;
            }
            // If guardian survives, continue turn normally
            if (gameState.player.hasAttacked) {
                setTimeout(() => endTurn(), 500);
            }
            return;
        } else {
            // Guardian creature no longer exists, clear the index
            gameState.opponent.guardianBenchIndex = null;
        }
    }
    
    // Check if attacker can't deal damage this turn (Tidal Illusion effect)
    if (gameState.player.cantDealDamageNextTurn) {
        damage = 0;
        alert(`Tidal Illusion prevents you from dealing any damage this turn!`);
    }
    
    // Apply base damage to defender
    defender.damage += damage;
    
    // Check for Retaliation Stone (Galactic Adventures) - counter-attack when damaged
    if (defender.retaliationStoneActive && damage > 0) {
        attacker.damage += 20;
        defender.retaliationStoneActive = false; // Consumed after use
        alert(`${defender.data.name}'s Retaliation Stone activated! ${attacker.data.name} takes 20 damage!`);
        renderGame();
        
        // Check if attacker was knocked out by retaliation
        if (attacker.damage >= attacker.data.hp) {
            alert(`${attacker.data.name} was knocked out by Retaliation Stone!`);
            knockoutCreature('player');
            return; // Exit the function as attacker is knocked out
        }
    }
    
    // Apply Rainbow Strike - deal 30 damage to random opponent bench creature
    if (gameState.player.rainbowStrikeActive) {
        const opponentBench = gameState.opponent.bench.filter(c => c !== null);
        if (opponentBench.length > 0) {
            const randomIndex = Math.floor(Math.random() * opponentBench.length);
            let actualIndex = 0;
            let count = 0;
            for (let i = 0; i < gameState.opponent.bench.length; i++) {
                if (gameState.opponent.bench[i] !== null) {
                    if (count === randomIndex) {
                        actualIndex = i;
                        break;
                    }
                    count++;
                }
            }
            const benchTarget = gameState.opponent.bench[actualIndex];
            benchTarget.damage += 30;
            alert(`Rainbow Strike! ${benchTarget.data.name} on bench takes 30 damage!`);
            
            // Check if bench creature was knocked out
            if (benchTarget.damage >= benchTarget.data.hp) {
                alert(`${benchTarget.data.name} was knocked out!`);
                
                // Add all cards in evolution chain to discard pile
                if (benchTarget.evolutionChain && benchTarget.evolutionChain.length > 0) {
                    benchTarget.evolutionChain.forEach(prevCard => {
                        gameState.opponent.discardPile.push(prevCard);
                    });
                }
                gameState.opponent.discardPile.push(benchTarget);
                
                gameState.opponent.bench[actualIndex] = null;
                gameState.player.points++;
                updatePoints();
            }
        }
        gameState.player.rainbowStrikeActive = false; // Consumed
        renderGame();
    }
    
    // Apply hallucination self-damage if tails
    if (attacker.hallucinationFlip === 'tails') {
        attacker.damage += 40;
        alert(`Hallucination penalty: ${attacker.data.name} deals 40 damage to itself!`);
        renderGame();
        
        // Check if attacker knocked itself out
        if (attacker.damage >= attacker.data.hp) {
            alert(`${attacker.data.name} knocked itself out from hallucination!`);
            // Clear hallucination flip result
            delete attacker.hallucinationFlip;
            knockoutCreature('player');
            return; // Exit the function as attacker is knocked out
        }
    }
    
    // Clear hallucination flip result
    delete attacker.hallucinationFlip;
    
    gameState.player.hasAttacked = true;
    renderGame();
    
    // Check for Phase Shift - must switch after attacking
    if (gameState.player.phaseShiftActive) {
        const playerBench = gameState.player.bench.filter(c => c !== null);
        if (playerBench.length > 0) {
            // Prompt player to select bench creature to switch with
            alert(`Phase Shift! You must switch ${gameState.player.active.data.name} with a bench creature.`);
            
            // Highlight bench creatures for selection
            gameState.phase = 'phaseShiftSwitch';
            gameState.player.bench.forEach((card, index) => {
                if (card) {
                    const benchSlot = document.querySelector(`.bench-slot[data-player="player"][data-slot="${index}"]`);
                    if (benchSlot) {
                        benchSlot.classList.add('can-select');
                        
                        // Use addEventListener with once:true to ensure handler is removed after use
                        const handlePhaseShiftSwitch = () => {
                            // Perform the switch
                            const temp = gameState.player.active;
                            gameState.player.active = gameState.player.bench[index];
                            gameState.player.bench[index] = temp;
                            
                            // Clear hallucination on switched creature
                            if (temp.hallucinating) {
                                temp.hallucinating = false;
                                alert(`${temp.data.name} is no longer hallucinating!`);
                            }
                            
                            // Clean up
                            document.querySelectorAll('.can-select').forEach(s => s.classList.remove('can-select'));
                            gameState.player.phaseShiftActive = false;
                            gameState.phase = 'main';
                            
                            alert(`Switched ${temp.data.name} with ${gameState.player.active.data.name}!`);
                            renderGame();
                            
                            // Continue with knockout check
                            continueAfterPhaseShift();
                        };
                        
                        benchSlot.addEventListener('click', handlePhaseShiftSwitch, {once: true});
                    }
                }
            });
            return; // Exit to wait for player selection
        } else {
            alert("Phase Shift requires a bench creature to switch with, but you have none!");
            gameState.player.phaseShiftActive = false;
        }
    }
    
    function continueAfterPhaseShift() {
    // Check if defender is knocked out by base damage
    const defenderKnockedOut = defender.damage >= defender.data.hp;
    
    console.log("Defender knocked out?", defenderKnockedOut, "Effect:", effect);
    
    if (defenderKnockedOut) {
        // Apply effect first (if any), then handle knockout
        if (effect && !['dizzyShot', 'infernoWing', 'galeFlip', 'coinClash', 'diceFury', 'diceTempest', 'neutralSurge', 'nightStrike', 'etherealPulse', 'prismaticDive', 'solarAscend', 'mysticBlaze', 'fortuneSmite', 'thornyVines', 'toxicToss', 'scrapStrike', 'metallicWing', 'healingRoots', 'minorMend', 'majorMend', 'monksFury', 'forcefulFlip', 'mindMirage', 'etherealEcho', 'phantomPulse', 'dreamwave', 'dreamBooster', 'echoLoop', 'pinkGust', 'brainFreeze', 'wingSlap', 'planetBurst', 'spectralBurst'].includes(effect)) {
            console.log("Calling handleMoveEffectBeforeKnockout with effect:", effect);
            handleMoveEffectBeforeKnockout(effect, attacker, 'player', () => {
                knockoutCreature('opponent');
            });
        } else {
            // Handle special post-damage effects even when defender is knocked out
            if (effect === 'infernoWing') {
                if (infernoWingFlip === 'tails') {
                    attacker.damage += 20;
                    alert(`Inferno Wing deals 20 damage to ${attacker.data.name}!`);
                    renderGame();
                }
                knockoutCreature('opponent');
            } else if (effect === 'solarAscend') {
                const flip = flipCoin();
                alert(`Solar Ascend: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    if (!gameState.opponent.camouflageActive) {
                        let damageLog = "Solar Ascend hits all opponent's benched creatures for 10 damage!\n";
                        gameState.opponent.bench.forEach((card, idx) => {
                            if (card) {
                                card.damage += 10;
                                damageLog += `${card.data.name} on bench takes 10 damage!\n`;
                            }
                        });
                        alert(damageLog);
                    } else {
                        alert("Solar Ascend aimed at bench, but Camouflage protected them!");
                    }
                    renderGame();
                } else {
                    alert("Coin was tails! No bench damage.");
                }
                knockoutCreature('opponent');
            } else if (effect === 'mysticBlaze') {
                // Deal 30 damage to all opponent's creatures on bench (active already KO'd)
                if (!gameState.opponent.camouflageActive) {
                    let damageLog = "Mystic Blaze hits all opponent's benched creatures for 30 damage!\n";
                    gameState.opponent.bench.forEach((card, idx) => {
                        if (card) {
                            card.damage += 30;
                            damageLog += `${card.data.name} on bench takes 30 damage!\n`;
                        }
                });
                    alert(damageLog);
                    renderGame();
                    // Check bench knockouts first, then handle active
                    checkBenchKnockouts('opponent');
                } else {
                    alert("Mystic Blaze aimed at bench, but Camouflage protected them!");
                    renderGame();
                }
                knockoutCreature('opponent');
            } else if (effect === 'healingRoots') {
                attacker.damage = Math.max(0, attacker.damage - 20);
                alert(`${attacker.data.name} healed 20 HP!`);
                renderGame();
                knockoutCreature('opponent');
            } else if (effect === 'minorMend') {
                attacker.damage = Math.max(0, attacker.damage - 10);
                alert(`${attacker.data.name} healed 10 HP!`);
                renderGame();
                knockoutCreature('opponent');
            } else if (effect === 'majorMend') {
                attacker.damage = Math.max(0, attacker.damage - 20);
                alert(`${attacker.data.name} healed 20 HP!`);
                renderGame();
                knockoutCreature('opponent');
            } else if (effect === 'metallicWing') {
                attacker.energy++;
                alert(`${attacker.data.name} attached 1 energy!`);
                renderGame();
                knockoutCreature('opponent');
            } else if (effect === 'monksFury') {
                const flip = flipCoin();
                alert(`Monk's Fury: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    gameState.player.monksFuryShield = true;
                    alert("Monk's Fury shield activated! Next turn, opponent's damage will be reduced by 20.");
                } else {
                    alert("Coin was tails! No shield activated.");
                }
                knockoutCreature('opponent');
            } else if (effect === 'forcefulFlip') {
                const flip = flipCoin();
                alert(`Forceful Flip: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    const opponentBench = gameState.opponent.bench.filter(c => c !== null);
                    if (opponentBench.length > 0) {
                        alert("Opponent has bench creatures! They must swap their active creature.");
                        // This would require opponent to select, for simplicity we'll auto-select first bench creature
                        const firstBenchIndex = gameState.opponent.bench.findIndex(c => c !== null);
                        const temp = gameState.opponent.active;
                        
                        // Cure special conditions when moving to bench
                        if (temp.hallucinating) {
                            temp.hallucinating = false;
                            alert(`${temp.data.name} is no longer hallucinating!`);
                        }
                        if (temp.hasFlux) {
                            temp.hasFlux = false;
                            alert(`${temp.data.name} is no longer affected by Flux!`);
                        }
                        if (temp.hasLock) {
                            temp.hasLock = false;
                            alert(`${temp.data.name} is no longer affected by Lock!`);
                        }
                        
                        gameState.opponent.active = gameState.opponent.bench[firstBenchIndex];
                        gameState.opponent.bench[firstBenchIndex] = temp;
                        alert(`Opponent swapped ${temp.data.name} with ${gameState.opponent.active.data.name}!`);
                        renderGame();
                    } else {
                        alert("Opponent has no bench creatures to swap with!");
                    }
                } else {
                    alert("Coin was tails! No forced swap.");
                }
                knockoutCreature('opponent');
            } else if (effect === 'mindMirage') {
                // Defender was knocked out, no hallucination applied
                alert("Defender was knocked out!");
                knockoutCreature('opponent');
            } else if (effect === 'etherealEcho') {
                // Defender was knocked out, no hallucination applied
                alert("Defender was knocked out!");
                knockoutCreature('opponent');
            } else if (effect === 'phantomPulse') {
                // Defender was knocked out, no hallucination applied
                alert("Defender was knocked out!");
                knockoutCreature('opponent');
            } else if (effect === 'dreamwave') {
                // Defender was knocked out, no hallucination applied
                alert("Defender was knocked out!");
                knockoutCreature('opponent');
            } else if (effect === 'dreamBooster') {
                // Defender was knocked out, no hallucination applied
                alert("Defender was knocked out!");
                knockoutCreature('opponent');
            } else if (effect === 'brainFreeze') {
                // Defender was knocked out, no hallucination applied
                alert("Defender was knocked out!");
                knockoutCreature('opponent');
            } else if (effect === 'wingSlap') {
                attacker.cantAttackNextTurn = true;
                attacker.cantAttackUntilTurn = gameState.turnNumber + 4; // Skip their next turn (2 turns from now = 4 turn increments)
                alert(`${attacker.data.name} can't attack next turn!`);
                renderGame();
                knockoutCreature('opponent');
            } else if (effect === 'planetBurst') {
                attacker.damage = Math.max(0, attacker.damage - 10);
                alert(`${attacker.data.name} healed 10 HP!`);
                renderGame();
                knockoutCreature('opponent');
            } else if (effect === 'spectralBurst') {
                gameState.player.spectralBurstShield = 10;
                alert(`Spectral Burst shield activated! Next turn, opponent's damage will be reduced by 10.`);
                renderGame();
                knockoutCreature('opponent');
            } else {
                // No additional effect or already handled, just handle knockout
                knockoutCreature('opponent');
            }
        }
    } else {
        // Defender survives, handle all effects normally
        if (effect && !['dizzyShot', 'infernoWing', 'galeFlip', 'coinClash', 'diceFury', 'diceTempest', 'neutralSurge', 'nightStrike', 'etherealPulse', 'prismaticDive', 'solarAscend', 'mysticBlaze', 'fortuneSmite', 'thornyVines', 'toxicToss', 'scrapStrike', 'metallicWing', 'healingRoots', 'minorMend', 'majorMend', 'monksFury', 'forcefulFlip', 'mindMirage', 'etherealEcho', 'phantomPulse', 'dreamwave', 'dreamBooster', 'echoLoop', 'pinkGust', 'brainFreeze', 'wingSlap', 'planetBurst', 'spectralBurst'].includes(effect)) {
            console.log("Calling handleMoveEffect with effect:", effect);
            handleMoveEffect(effect, attacker, defender, 'player');
        } else {
            // Check for special post-damage effects
            if (effect === 'infernoWing') {
                if (infernoWingFlip === 'tails') {
                    attacker.damage += 20;
                    alert(`Inferno Wing deals 20 damage to ${attacker.data.name}!`);
                    renderGame();
                    checkKnockoutsAndContinue('player');
                } else {
                    setTimeout(() => endTurn(), 500);
                }
            } else if (effect === 'mysticBlaze') {
                // Deal 30 damage to all opponent's creatures
                if (!gameState.opponent.camouflageActive) {
                    let damageLog = "Mystic Blaze hits all opponent's creatures for 30 damage!\n";
                    gameState.opponent.bench.forEach((card, idx) => {
                        if (card) {
                            card.damage += 30;
                            damageLog += `${card.data.name} on bench takes 30 damage!\n`;
                        }
                    });
                    alert(damageLog);
                } else {
                    alert("Mystic Blaze aimed at bench, but Camouflage protected them!");
                }
                checkKnockoutsAndContinue('player');
            } else if (effect === 'prismaticDive') {
                let headsCount = 0;
                let results = [];
                for (let i = 0; i < 2; i++) {
                    const flip = flipCoin();
                    results.push(flip);
                    if (flip === 'heads') headsCount++;
                }
                const extraDamage = headsCount * 40;
                if (extraDamage > 0) {
                    defender.damage += extraDamage;
                    alert(`Prismatic Dive: Flipped 2 coins - ${results.join(', ')}!\nGot ${headsCount} heads! Deals ${extraDamage} extra damage!`);
                    renderGame();
                    checkKnockoutsAndContinue('player');
                } else {
                    alert(`Prismatic Dive: Flipped 2 coins - ${results.join(', ')}!\nNo extra damage.`);
                    // No extra damage, just end turn
                    setTimeout(() => endTurn(), 500);
                }
            } else if (effect === 'solarAscend') {
                const flip = flipCoin();
                alert(`Solar Ascend: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    if (!gameState.opponent.camouflageActive) {
                        let damageLog = "Solar Ascend hits all opponent's benched creatures for 10 damage!\n";
                        gameState.opponent.bench.forEach((card, idx) => {
                            if (card) {
                                card.damage += 10;
                                damageLog += `${card.data.name} on bench takes 10 damage!\n`;
                            }
                        });
                        alert(damageLog);
                    } else {
                        alert("Solar Ascend aimed at bench, but Camouflage protected them!");
                    }
                    checkKnockoutsAndContinue('player');
                } else {
                    alert("Coin was tails! No bench damage.");
                    // No extra damage, just end turn
                    setTimeout(() => endTurn(), 500);
                }
            } else if (effect === 'healingRoots') {
                attacker.damage = Math.max(0, attacker.damage - 20);
                alert(`${attacker.data.name} healed 20 HP!`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'minorMend') {
                attacker.damage = Math.max(0, attacker.damage - 10);
                alert(`${attacker.data.name} healed 10 HP!`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'majorMend') {
                attacker.damage = Math.max(0, attacker.damage - 20);
                alert(`${attacker.data.name} healed 20 HP!`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'metallicWing') {
                attacker.energy++;
                alert(`${attacker.data.name} attached 1 energy!`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'monksFury') {
                const flip = flipCoin();
                alert(`Monk's Fury: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    gameState.player.monksFuryShield = true;
                    alert("Monk's Fury shield activated! Next turn, opponent's damage will be reduced by 20.");
                } else {
                    alert("Coin was tails! No shield activated.");
                }
                checkKnockoutsAndContinue('player');
            } else if (effect === 'forcefulFlip') {
                const flip = flipCoin();
                alert(`Forceful Flip: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    const opponentBench = gameState.opponent.bench.filter(c => c !== null);
                    if (opponentBench.length > 0) {
                        alert("Opponent has bench creatures! They must swap their active creature.");
                        // Auto-select first bench creature
                        const firstBenchIndex = gameState.opponent.bench.findIndex(c => c !== null);
                        const temp = gameState.opponent.active;
                        
                        // Cure special conditions when moving to bench
                        if (temp.hallucinating) {
                            temp.hallucinating = false;
                            alert(`${temp.data.name} is no longer hallucinating!`);
                        }
                        if (temp.hasFlux) {
                            temp.hasFlux = false;
                            alert(`${temp.data.name} is no longer affected by Flux!`);
                        }
                        if (temp.hasLock) {
                            temp.hasLock = false;
                            alert(`${temp.data.name} is no longer affected by Lock!`);
                        }
                        
                        gameState.opponent.active = gameState.opponent.bench[firstBenchIndex];
                        gameState.opponent.bench[firstBenchIndex] = temp;
                        alert(`Opponent swapped ${temp.data.name} with ${gameState.opponent.active.data.name}!`);
                        renderGame();
                    } else {
                        alert("Opponent has no bench creatures to swap with!");
                    }
                } else {
                    alert("Coin was tails! No forced swap.");
                }
                checkKnockoutsAndContinue('player');
            } else if (effect === 'mindMirage') {
                defender.hallucinating = true;
                alert(`${defender.data.name} is now hallucinating!`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'etherealEcho') {
                const flip = flipCoin();
                alert(`Ethereal Echo: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    damage += 30;
                    defender.damage += 30;
                    alert(`Coin was heads! Ethereal Echo deals 30 extra damage!`);
                    renderGame();
                }
                defender.hallucinating = true;
                alert(`${defender.data.name} is now hallucinating!`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'phantomPulse') {
                defender.hallucinating = true;
                alert(`${defender.data.name} is now hallucinating!`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'dreamwave') {
                const flip = flipCoin();
                alert(`Dreamwave: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    defender.hallucinating = true;
                    alert(`${defender.data.name} is now hallucinating!`);
                } else {
                    alert("Coin was tails! No hallucination caused.");
                }
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'dreamBooster') {
                const flip = flipCoin();
                alert(`Dream Booster: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    defender.hallucinating = true;
                    alert(`${defender.data.name} is now hallucinating!`);
                } else {
                    alert("Coin was tails! No hallucination caused.");
                }
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'brainFreeze') {
                applyHallucination(defender, 'opponent');
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'wingSlap') {
                attacker.cantAttackNextTurn = true;
                attacker.cantAttackUntilTurn = gameState.turnNumber + 4; // Skip their next turn (2 turns from now = 4 turn increments)
                alert(`${attacker.data.name} can't attack next turn!`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'planetBurst') {
                attacker.damage = Math.max(0, attacker.damage - 10);
                alert(`${attacker.data.name} healed 10 HP!`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else if (effect === 'spectralBurst') {
                gameState.player.spectralBurstShield = 10;
                alert(`Spectral Burst shield activated! Next turn, opponent's damage will be reduced by 10.`);
                renderGame();
                checkKnockoutsAndContinue('player');
            } else {
                // No special post-damage effect, just end turn
                setTimeout(() => endTurn(), 500);
            }
        }
    }
    } // Close continueAfterPhaseShift
    
    // If Phase Shift is not active, continue immediately
    if (!gameState.player.phaseShiftActive) {
        continueAfterPhaseShift();
    }
}

// Coin flip utility
function flipCoin() {
    return Math.random() < 0.5 ? 'heads' : 'tails';
}

function rollDice() {
    return Math.floor(Math.random() * 6) + 1; // Returns 1-6
}

// ============================================================================
// STATUS CONDITION MANAGER - Centralized system for handling status effects
// ============================================================================
const StatusConditionManager = {
    // All status conditions and their properties
    conditions: {
        hallucination: {
            icon: '😵',
            description: 'Flip coin on attack: Heads +10 damage, Tails take 40 self-damage'
        },
        flux: {
            icon: '⚡',
            description: 'Flip 2 coins on energy attachment: Both tails = blocked'
        },
        lock: {
            icon: '🔒',
            description: 'Flip coin on item use: Tails = item returns to hand'
        }
    },
    
    // Apply a status condition to a creature (only works on active creatures)
    applyStatus(creature, statusName) {
        if (!creature) {
            console.error('[StatusManager] Cannot apply status to null creature');
            return false;
        }
        
        if (!this.conditions[statusName]) {
            console.error(`[StatusManager] Unknown status condition: ${statusName}`);
            return false;
        }
        
        // Initialize status set if it doesn't exist
        if (!creature.statusConditions) {
            creature.statusConditions = new Set();
        }
        
        creature.statusConditions.add(statusName);
        console.log(`[StatusManager] Applied ${statusName} to ${creature.data.name}`);
        return true;
    },
    
    // Remove a specific status condition from a creature
    removeStatus(creature, statusName) {
        if (!creature || !creature.statusConditions) return;
        creature.statusConditions.delete(statusName);
        console.log(`[StatusManager] Removed ${statusName} from ${creature.data.name}`);
    },
    
    // Clear ALL status conditions from a creature
    clearAllStatus(creature) {
        if (!creature) return;
        
        if (creature.statusConditions && creature.statusConditions.size > 0) {
            console.log(`[StatusManager] Clearing all status from ${creature.data.name}`);
            creature.statusConditions.clear();
        }
        
        // Also clear old properties for backward compatibility
        creature.hallucinating = false;
        creature.hasFlux = false;
        creature.hasLock = false;
    },
    
    // Check if creature has a specific status
    hasStatus(creature, statusName) {
        if (!creature) return false;
        
        // Check new system
        if (creature.statusConditions && creature.statusConditions.has(statusName)) {
            return true;
        }
        
        // Check old properties for backward compatibility during migration
        if (statusName === 'hallucination' && creature.hallucinating) return true;
        if (statusName === 'flux' && creature.hasFlux) return true;
        if (statusName === 'lock' && creature.hasLock) return true;
        
        return false;
    },
    
    // Get all status conditions on a creature
    getAllStatus(creature) {
        if (!creature || !creature.statusConditions) return [];
        return Array.from(creature.statusConditions);
    },
    
    // Migrate old status properties to new system (for existing creatures)
    migrateOldStatus(creature) {
        if (!creature) return;
        
        if (creature.hallucinating) {
            this.applyStatus(creature, 'hallucination');
            creature.hallucinating = false;
        }
        
        if (creature.hasFlux) {
            this.applyStatus(creature, 'flux');
            creature.hasFlux = false;
        }
        
        if (creature.hasLock) {
            this.applyStatus(creature, 'lock');
            creature.hasLock = false;
        }
    }
};

// Apply hallucination with protection checks
// Returns true if hallucination was applied, false if blocked
function applyHallucination(target, targetPlayer) {
    // targetPlayer should be 'player' or 'opponent' indicating who owns the target creature
    const isProtected = gameState[targetPlayer].clarityAuraActive;
    
    if (!isProtected) {
        target.hallucinating = true;
        alert(`${target.data.name} is now hallucinating!`);
        return true;
    } else {
        alert(`${target.data.name} is protected from Hallucination by Clarity Aura!`);
        return false;
    }
}

// Check if attack is super effective
function isSuperEffective(attackerType, defenderType) {
    // Neutral type has no super effective matchups
    if (attackerType === 'Neutral' || defenderType === 'Neutral') {
        return false;
    }
    
    // Item cards don't have type effectiveness
    if (attackerType === 'Item' || defenderType === 'Item') {
        return false;
    }
    
    // Super effective matchups
    const matchups = {
        'Mystic': 'Wind',      // Mystic is super effective against Wind
        'Wind': 'Celestial',   // Wind is super effective against Celestial
        'Celestial': 'Mystic', // Celestial is super effective against Mystic
        'Mechanic': 'Neutral'  // Mechanic is super effective against Neutral
    };
    
    return matchups[attackerType] === defenderType;
}

// Handle attacker-only effects before knockout (when defender is already knocked out by base damage)
function handleMoveEffectBeforeKnockout(effect, attacker, attackingPlayer, callback) {
    console.log("handleMoveEffectBeforeKnockout called with effect:", effect);
    
    if (!effect) {
        callback();
        return;
    }
    
    const opponent = attackingPlayer === 'player' ? 'opponent' : 'player';
    
    switch(effect) {
        case 'cantRetreat':
            // Ethereal Snare - defender can't retreat, but defender is knocked out so skip this
            setTimeout(() => {
                alert("Defender was knocked out!");
                callback();
            }, 500);
            break;
            
        case 'discard2Energy':
            // Vision Beam - attacker loses 2 energy
            attacker.energy = Math.max(0, attacker.energy - 2);
            setTimeout(() => {
                alert(`${attacker.data.name} discarded 2 energy!`);
                renderGame();
                callback();
            }, 500);
            break;
            
        case 'recoil20':
            // Petal Tornado - 20 damage to self
            attacker.damage += 20;
            setTimeout(() => {
                alert(`${attacker.data.name} took 20 recoil damage!`);
                renderGame();
                // Check if attacker knocked itself out
                if (attacker.damage >= attacker.data.hp) {
                    // Both attacker and defender are knocked out
                    // Handle defender knockout first, then attacker
                    callback(); // This knocks out the defender
                    // Then knock out the attacker after a delay
                    setTimeout(() => {
                        knockoutCreature(attackingPlayer);
                    }, 1000);
                } else {
                    // Only defender knocked out, attacker survives
                    callback();
                }
            }, 500);
            break;
            
        case 'recoil40':
            // Blow Blitz - 40 damage to self
            attacker.damage += 40;
            setTimeout(() => {
                alert(`${attacker.data.name} took 40 recoil damage!`);
                renderGame();
                // Check if attacker knocked itself out
                if (attacker.damage >= attacker.data.hp) {
                    // Both attacker and defender are knocked out
                    // Handle defender knockout first, then attacker
                    callback(); // This knocks out the defender
                    // Then knock out the attacker after a delay
                    setTimeout(() => {
                        knockoutCreature(attackingPlayer);
                    }, 1000);
                } else {
                    // Only defender knocked out, attacker survives
                    callback();
                }
            }, 500);
            break;
            
        case 'creamyConfection':
            // Creamy Confection - coin flip for energy attach or discard
            setTimeout(() => {
                const result = flipCoin();
                if (result === 'heads') {
                    // Attach energy to random bench
                    const bench = gameState[attackingPlayer].bench.filter(c => c !== null);
                    if (bench.length > 0) {
                        const randomBench = bench[Math.floor(Math.random() * bench.length)];
                        randomBench.energy++;
                        alert(`Coin flip: HEADS! Attached 1 energy to ${randomBench.data.name} on bench!`);
                    } else {
                        alert(`Coin flip: HEADS! But no bench creatures to attach energy to.`);
                    }
                } else {
                    // Discard 2 energy
                    attacker.energy = Math.max(0, attacker.energy - 2);
                    alert(`Coin flip: TAILS! ${attacker.data.name} discarded 2 energy!`);
                }
                renderGame();
                callback();
            }, 500);
            break;
            
        case 'riskyRecoil':
            // Risky Recoil - coin flip for random friendly damage
            setTimeout(() => {
                const result = flipCoin();
                if (result === 'tails') {
                    // Damage random friendly creature
                    const allFriendly = [gameState[attackingPlayer].active, ...gameState[attackingPlayer].bench].filter(c => c !== null);
                    if (allFriendly.length > 0) {
                        const randomTarget = allFriendly[Math.floor(Math.random() * allFriendly.length)];
                        randomTarget.damage += 50;
                        alert(`Coin flip: TAILS! ${randomTarget.data.name} took 50 damage!`);
                        renderGame();
                        // Check if that creature was knocked out
                        if (randomTarget.damage >= randomTarget.data.hp) {
                            if (randomTarget === gameState[attackingPlayer].active) {
                                // Both attacker and defender are knocked out
                                // Handle defender knockout first, then attacker
                                callback(); // This knocks out the defender
                                // Then knock out the attacker after a delay
                                setTimeout(() => {
                                    knockoutCreature(attackingPlayer);
                                }, 1000);
                            } else {
                                // Bench creature knocked out - remove it
                                const benchIndex = gameState[attackingPlayer].bench.indexOf(randomTarget);
                                if (benchIndex !== -1) {
                                    gameState[attackingPlayer].discardPile.push(randomTarget);
                                    gameState[attackingPlayer].bench[benchIndex] = null;
                                }
                                callback();
                            }
                        } else {
                            callback();
                        }
                    } else {
                        alert(`Coin flip: TAILS! But no creatures to damage.`);
                        callback();
                    }
                } else {
                    alert(`Coin flip: HEADS! No recoil damage.`);
                    callback();
                }
            }, 500);
            break;
            
        case 'heavenlyRetreat':
            // Heavenly Retreat - free swap (but defender is knocked out, so probably won't happen)
            const bench = gameState[attackingPlayer].bench.filter(c => c !== null);
            if (bench.length > 0) {
                if (attackingPlayer === 'player') {
                    // Player chooses which bench creature to swap with
                    showBenchSelectionModal(attackingPlayer, 'heavenlyRetreat');
                    // Note: endTurn is called in the modal handler
                } else {
                    // AI automatically selects the bench creature with highest HP
                    let bestIndex = -1;
                    let bestHp = -1;
                    
                    gameState[attackingPlayer].bench.forEach((card, index) => {
                        if (card) {
                            const currentHp = card.data.hp - card.damage;
                            if (currentHp > bestHp) {
                                bestHp = currentHp;
                                bestIndex = index;
                            }
                        }
                    });
                    
                    if (bestIndex !== -1) {
                        performHeavenlyRetreat(attackingPlayer, bestIndex);
                        callback();
                    } else {
                        alert("No bench creatures to swap with!");
                        callback();
                    }
                }
            } else {
                alert("No bench creatures to swap with!");
                callback();
            }
            break;
            
        case 'energySnatch':
            // Energy Snatch - coin flip to remove opponent energy
            setTimeout(() => {
                const result = flipCoin();
                if (result === 'heads') {
                    const allOpponent = [gameState[opponent].active, ...gameState[opponent].bench].filter(c => c !== null && c.energy > 0);
                    if (allOpponent.length > 0) {
                        const randomTarget = allOpponent[Math.floor(Math.random() * allOpponent.length)];
                        randomTarget.energy--;
                        alert(`Coin flip: HEADS! Removed 1 energy from ${randomTarget.data.name}!`);
                    } else {
                        alert(`Coin flip: HEADS! But no opponent creatures with energy.`);
                    }
                } else {
                    alert(`Coin flip: TAILS! No energy removed.`);
                }
                renderGame();
                callback();
            }, 500);
            break;
            
        case 'healingSap':
            // Healing Sap - heal attacker 20 HP
            attacker.damage = Math.max(0, attacker.damage - 20);
            setTimeout(() => {
                alert(`${attacker.data.name} healed 20 HP!`);
                renderGame();
                callback();
            }, 500);
            break;
            
        case 'scavengeStrike':
            // Scavenge Strike - Flip coin, if heads move item from discard to hand
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Scavenge Strike: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    const items = gameState[attackingPlayer].discardPile.filter(c => c.data.stage === 'Item');
                    if (items.length > 0) {
                        if (attackingPlayer === 'player') {
                            // Let player choose (for simplicity, take first item)
                            const item = items[0];
                            gameState[attackingPlayer].hand.push(item);
                            const index = gameState[attackingPlayer].discardPile.indexOf(item);
                            gameState[attackingPlayer].discardPile.splice(index, 1);
                            alert(`You retrieved ${item.data.name} from your discard pile!`);
                        } else {
                            // AI chooses randomly
                            const item = items[Math.floor(Math.random() * items.length)];
                            gameState[attackingPlayer].hand.push(item);
                            const index = gameState[attackingPlayer].discardPile.indexOf(item);
                            gameState[attackingPlayer].discardPile.splice(index, 1);
                            alert(`AI retrieved ${item.data.name} from discard pile!`);
                        }
                        renderGame();
                    } else {
                        alert("No item cards in discard pile!");
                    }
                } else {
                    alert("Coin was tails! No item retrieved.");
                }
                callback();
            }, 500);
            break;
            
        case 'overdriveSmash':
            // Overdrive Smash - Can't use this move on your next turn
            attacker.cantUseOverdrive = 3;
            setTimeout(() => {
                alert(`${attacker.data.name} can't use Overdrive Smash for the next 2 turns!`);
                callback();
            }, 500);
            break;
            
        case 'chillRecharge':
            // Chill Recharge - Heal 10 HP and increase next attack by 20
            attacker.damage = Math.max(0, attacker.damage - 10);
            attacker.chillRechargeBonus = true;
            setTimeout(() => {
                alert(`${attacker.data.name} healed 10 HP! Next attack will deal +20 damage!`);
                renderGame();
                callback();
            }, 500);
            break;
            
        case 'caffeineAddiction':
            // Caffeine Addiction - Flip coin, heads heal 20, tails Lock (but defender is KO'd so skip lock)
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Caffeine Addiction: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    attacker.damage = Math.max(0, attacker.damage - 20);
                    alert(`${attacker.data.name} healed 20 HP!`);
                } else {
                    alert(`Coin was tails, but defender was knocked out so Lock has no effect.`);
                }
                renderGame();
                callback();
            }, 500);
            break;
            
        case 'skyDraw':
            // Sky Draw - Draw a card after attacking
            if (gameState[attackingPlayer].deck.length > 0) {
                const cardId = gameState[attackingPlayer].deck.pop();
                const cardData = getCardData(cardId);
                const drawnCard = {
                    id: cardId,
                    data: cardData,
                    energy: 0,
                    damage: 0,
                    abilityUsedThisTurn: false,
                    absorbEnergyActive: false,
                    energizedHealingAmount: 0,
                    healingRetreatAmount: 0,
                    evolutionId: Math.random().toString(36).substr(2, 9),
                    evolutionChain: []
                };
                gameState[attackingPlayer].hand.push(drawnCard);
                setTimeout(() => {
                    alert(`${attackingPlayer === 'player' ? 'You' : 'AI'} drew a card!`);
                    renderGame();
                    callback();
                }, 500);
            } else {
                callback();
            }
            break;
            
        case 'coffeeHeal':
            // Coffee Heal - Heal bench creature 10 HP
            setTimeout(() => {
                const benchWithDamage = gameState[attackingPlayer].bench.filter(c => c && c.damage > 0);
                if (benchWithDamage.length > 0) {
                    if (attackingPlayer === 'player') {
                        if (benchWithDamage.length === 1) {
                            const target = benchWithDamage[0];
                            healCreature(target, 10);
                            alert(`Healed ${target.data.name} for 10 HP!`);
                            renderGame();
                            callback();
                        } else {
                            showBenchHealModal('player', 10, attackingPlayer);
                            // Note: callback will be called from modal
                        }
                    } else {
                        const target = benchWithDamage[Math.floor(Math.random() * benchWithDamage.length)];
                        healCreature(target, 10);
                        alert(`AI healed ${target.data.name} for 10 HP!`);
                        renderGame();
                        callback();
                    }
                } else {
                    alert("No damaged bench creatures to heal!");
                    callback();
                }
            }, 500);
            break;
            
        case 'beanBlast':
            // Bean Blast - Heal bench creature 20 HP
            setTimeout(() => {
                const benchWithDamage = gameState[attackingPlayer].bench.filter(c => c && c.damage > 0);
                if (benchWithDamage.length > 0) {
                    if (attackingPlayer === 'player') {
                        if (benchWithDamage.length === 1) {
                            const target = benchWithDamage[0];
                            healCreature(target, 20);
                            alert(`Healed ${target.data.name} for 20 HP!`);
                            renderGame();
                            callback();
                        } else {
                            showBenchHealModal('player', 20, attackingPlayer);
                            // Note: callback will be called from modal
                        }
                    } else {
                        const target = benchWithDamage[Math.floor(Math.random() * benchWithDamage.length)];
                        healCreature(target, 20);
                        alert(`AI healed ${target.data.name} for 20 HP!`);
                        renderGame();
                        callback();
                    }
                } else {
                    callback();
                }
            }, 500);
            break;
            
        case 'tempestHold':
            // Tempest Hold - Attacker can't retreat for 2 turns
            attacker.cantRetreatTurns = 2;
            setTimeout(() => {
                alert(`${attacker.data.name} can't retreat for the next 2 turns!`);
                callback();
            }, 500);
            break;
            
        case 'forestFury':
            // Forest Fury - Causes Lock (but defender already knocked out, so no effect)
            setTimeout(() => {
                alert(`${opponent === 'player' ? 'Your' : "Opponent's"} creature was knocked out before Lock could be applied!`);
                callback();
            }, 500);
            break;
            
        case 'chaosDice':
            // Chaos Dice - Roll dice (but defender already knocked out, so no status effect)
            setTimeout(() => {
                const roll = rollDice();
                alert(`Chaos Dice: Rolled a ${roll}! But the defender was knocked out, so no status condition applied.`);
                callback();
            }, 500);
            break;
            
        case 'caffeineAddiction':
            // Caffeine Addiction - Flip coin, heads heal 20, tails Lock (but defender already KO'd)
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Caffeine Addiction: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    attacker.damage = Math.max(0, attacker.damage - 20);
                    alert(`${attacker.data.name} healed 20 HP!`);
                } else {
                    alert(`Coin was tails, but defender was knocked out so Lock has no effect.`);
                }
                renderGame();
                callback();
            }, 500);
            break;
            
        case 'mindPulse':
            // Mind Pulse - Flip coin (but defender already knocked out, so no hallucination)
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Mind Pulse: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    alert(`Coin was heads, but defender was knocked out before hallucination could be applied!`);
                } else {
                    alert("Coin was tails! No hallucination.");
                }
                callback();
            }, 500);
            break;
            
        case 'fluxWave':
            // Flux Wave - (but defender already knocked out, so no Flux)
            setTimeout(() => {
                alert(`Defender was knocked out before Flux could be applied!`);
                callback();
            }, 500);
            break;
            
        case 'psychicProwl':
            // Psychic Prowl - Flip coin (but defender already knocked out, so no status)
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Psychic Prowl: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    alert(`Coin was heads, but defender was knocked out before Flux could be applied!`);
                } else {
                    alert(`Coin was tails, but defender was knocked out before Lock could be applied!`);
                }
                callback();
            }, 500);
            break;
            
        default:
            callback();
    }
}

// Handle move effects
function handleMoveEffect(effect, attacker, defender, attackingPlayer) {
    console.log("handleMoveEffect called with effect:", effect);
    
    if (!effect) {
        // No effect, check for defender knockout and end turn
        checkKnockoutsAndContinue(attackingPlayer);
        return;
    }
    
    const opponent = attackingPlayer === 'player' ? 'opponent' : 'player';
    
    switch(effect) {
        case 'cantRetreat':
            // Ethereal Snare - defender can't retreat next turn
            defender.cantRetreat = true;
            setTimeout(() => {
                alert(`${defender.data.name} can't retreat on its next turn!`);
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'discard2Energy':
            // Vision Beam - attacker loses 2 energy
            attacker.energy = Math.max(0, attacker.energy - 2);
            setTimeout(() => {
                alert(`${attacker.data.name} discarded 2 energy!`);
                renderGame();
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'recoil20':
            // Petal Tornado - 20 damage to self
            attacker.damage += 20;
            setTimeout(() => {
                alert(`${attacker.data.name} took 20 recoil damage!`);
                renderGame();
                // Check if attacker knocked itself out
                if (attacker.damage >= attacker.data.hp) {
                    knockoutCreature(attackingPlayer);
                } else {
                    checkKnockoutsAndContinue(attackingPlayer);
                }
            }, 500);
            break;
            
        case 'creamyConfection':
            // Creamy Confection - coin flip for energy attach or discard
            setTimeout(() => {
                const result = flipCoin();
                if (result === 'heads') {
                    // Attach energy to random bench
                    const bench = gameState[attackingPlayer].bench.filter(c => c !== null);
                    if (bench.length > 0) {
                        const randomBench = bench[Math.floor(Math.random() * bench.length)];
                        randomBench.energy++;
                        alert(`Coin flip: HEADS! Attached 1 energy to ${randomBench.data.name} on bench!`);
                    } else {
                        alert(`Coin flip: HEADS! But no bench creatures to attach energy to.`);
                    }
                } else {
                    // Discard 2 energy
                    attacker.energy = Math.max(0, attacker.energy - 2);
                    alert(`Coin flip: TAILS! ${attacker.data.name} discarded 2 energy!`);
                }
                renderGame();
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'riskyRecoil':
            // Risky Recoil - coin flip for random friendly damage
            setTimeout(() => {
                const result = flipCoin();
                if (result === 'tails') {
                    // Damage random friendly creature
                    const allFriendly = [gameState[attackingPlayer].active, ...gameState[attackingPlayer].bench].filter(c => c !== null);
                    if (allFriendly.length > 0) {
                        const randomTarget = allFriendly[Math.floor(Math.random() * allFriendly.length)];
                        randomTarget.damage += 50;
                        alert(`Coin flip: TAILS! ${randomTarget.data.name} took 50 damage!`);
                        renderGame();
                        // Check if that creature was knocked out
                        if (randomTarget.damage >= randomTarget.data.hp) {
                            if (randomTarget === gameState[attackingPlayer].active) {
                                knockoutCreature(attackingPlayer);
                            } else {
                                // Bench creature knocked out - remove it
                                const benchIndex = gameState[attackingPlayer].bench.indexOf(randomTarget);
                                if (benchIndex !== -1) {
                                    gameState[attackingPlayer].discardPile.push(randomTarget);
                                    gameState[attackingPlayer].bench[benchIndex] = null;
                                }
                                checkKnockoutsAndContinue(attackingPlayer);
                            }
                        } else {
                            checkKnockoutsAndContinue(attackingPlayer);
                        }
                    } else {
                        alert(`Coin flip: TAILS! But no creatures to damage.`);
                        checkKnockoutsAndContinue(attackingPlayer);
                    }
                } else {
                    alert(`Coin flip: HEADS! No recoil damage.`);
                    checkKnockoutsAndContinue(attackingPlayer);
                }
            }, 500);
            break;
            
        case 'heavenlyRetreat':
            // Heavenly Retreat - free swap
            const bench = gameState[attackingPlayer].bench.filter(c => c !== null);
            if (bench.length > 0) {
                if (attackingPlayer === 'player') {
                    // Player chooses which bench creature to swap with
                    showBenchSelectionModal(attackingPlayer, 'heavenlyRetreat');
                } else {
                    // AI automatically selects the bench creature with highest HP
                    let bestIndex = -1;
                    let bestHp = -1;
                    
                    gameState[attackingPlayer].bench.forEach((card, index) => {
                        if (card) {
                            const currentHp = card.data.hp - card.damage;
                            if (currentHp > bestHp) {
                                bestHp = currentHp;
                                bestIndex = index;
                            }
                        }
                    });
                    
                    if (bestIndex !== -1) {
                        performHeavenlyRetreat(attackingPlayer, bestIndex);
                    } else {
                        alert("No bench creatures to swap with!");
                        setTimeout(endTurn, 500);
                    }
                }
            } else {
                alert("No bench creatures to swap with!");
                setTimeout(endTurn, 500);
            }
            break;
            
        case 'energySnatch':
            // Energy Snatch - coin flip to remove opponent energy
            setTimeout(() => {
                const result = flipCoin();
                if (result === 'heads') {
                    const allOpponent = [gameState[opponent].active, ...gameState[opponent].bench].filter(c => c !== null && c.energy > 0);
                    if (allOpponent.length > 0) {
                        const randomTarget = allOpponent[Math.floor(Math.random() * allOpponent.length)];
                        randomTarget.energy--;
                        alert(`Coin flip: HEADS! Removed 1 energy from ${randomTarget.data.name}!`);
                    } else {
                        alert(`Coin flip: HEADS! But no opponent creatures with energy.`);
                    }
                } else {
                    alert(`Coin flip: TAILS! No energy removed.`);
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'healingSap':
            // Healing Sap - heal attacker 20 HP
            attacker.damage = Math.max(0, attacker.damage - 20);
            setTimeout(() => {
                alert(`${attacker.data.name} healed 20 HP!`);
                renderGame();
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        // Galactic Adventures Move Effects
        case 'tripleThreatFlip':
            // Triple Threat Flip - flip 2 coins, if both heads KO opponent
            setTimeout(() => {
                const flip1 = flipCoin();
                const flip2 = flipCoin();
                alert(`Triple Threat Flip: Coin 1: ${flip1}, Coin 2: ${flip2}`);
                if (flip1 === 'heads' && flip2 === 'heads') {
                    alert(`Both coins were heads! ${defender.data.name} is knocked out regardless of HP!`);
                    defender.damage = defender.data.hp; // Force knockout
                } else {
                    alert("At least one coin was tails. This move has no effect.");
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'mindPulse':
            // Mind Pulse - Flip coin, if heads cause Hallucination (only if defender survives)
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Mind Pulse: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    // Check if defender survived the attack
                    if (defender.damage < defender.data.hp) {
                        StatusConditionManager.applyStatus(defender, 'hallucination');
                        alert(`${defender.data.name} is now hallucinating!`);
                        renderGame();
                    } else {
                        alert(`${defender.data.name} was knocked out before hallucination could be applied!`);
                    }
                } else {
                    alert("Coin was tails! No hallucination.");
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'shadowWrap':
            // Shadow Wrap - +30 damage if opponent has special condition
            // This is handled in attack damage calculation, not here
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'invincibleGambit':
            // Invincible Gambit - Flip 3 coins, opponent can't attack for each heads on their turns, then faint
            setTimeout(() => {
                let headsCount = 0;
                for (let i = 0; i < 3; i++) {
                    if (flipCoin() === 'heads') headsCount++;
                }
                alert(`Invincible Gambit: Got ${headsCount} heads! Opponent can't attack for ${headsCount} of their turn(s).`);
                if (headsCount > 0) {
                    if (!gameState[opponent].invincibleTurnsLeft) {
                        gameState[opponent].invincibleTurnsLeft = 0;
                    }
                    gameState[opponent].invincibleTurnsLeft += headsCount;
                }
                // Attacker faints
                attacker.damage = attacker.data.hp;
                alert(`${attacker.data.name} faints after using Invincible Gambit!`);
                renderGame();
                knockoutCreature(attackingPlayer);
            }, 500);
            break;
            
        case 'galacticMeteor':
            // Galactic Meteor - 10 damage per energy attached to opponent
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'tidalIllusion':
            // Tidal Illusion - Flip coin, if heads opponent deals no damage next turn
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Tidal Illusion: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    gameState[opponent].cantDealDamageNextTurn = true;
                    alert(`${opponent === 'player' ? 'You' : 'Opponent'} can't deal damage next turn!`);
                } else {
                    alert("Coin was tails! No effect.");
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'mindRipple':
            // Mind Ripple - Next turn, this creature takes 20 less damage
            attacker.mindRippleShield = true;
            setTimeout(() => {
                alert(`${attacker.data.name} will take 20 less damage next turn!`);
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'fluxWave':
            // Flux Wave - Opponent's creature is affected by Flux (only if still alive)
            setTimeout(() => {
                // Check if defender survived the attack
                if (defender.damage < defender.data.hp) {
                    StatusConditionManager.applyStatus(defender, 'flux');
                    alert(`${defender.data.name} is now affected by Flux!`);
                    renderGame();
                } else {
                    alert(`${defender.data.name} was knocked out before Flux could be applied!`);
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'spectralSlice':
            // Spectral Slice - Flip coin, if heads cause Flux (only if defender survives)
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Spectral Slice: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    // Check if defender survived the attack
                    if (defender.damage < defender.data.hp) {
                        StatusConditionManager.applyStatus(defender, 'flux');
                        alert(`${defender.data.name} is now affected by Flux!`);
                        renderGame();
                    } else {
                        alert(`${defender.data.name} was knocked out before Flux could be applied!`);
                    }
                } else {
                    alert("Coin was tails! No Flux applied.");
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'verdantStruggle':
            // Verdant Struggle - Flip 2 coins, if 2 heads deal 50, otherwise 0
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'furySpin':
            // Fury Spin - +50 damage if HP is 30 or less
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'enragedCharge':
            // Enraged Charge - +30 damage per energy after 3
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'scavengeStrike':
            // Scavenge Strike - Flip coin, if heads move item from discard to hand
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Scavenge Strike: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    const items = gameState[attackingPlayer].discardPile.filter(c => c.data.stage === 'Item');
                    if (items.length > 0) {
                        if (attackingPlayer === 'player') {
                            // Let player choose
                            alert("Choose an item card from your discard pile:");
                            // For simplicity, take first item
                            const item = items[0];
                            gameState[attackingPlayer].hand.push(item);
                            const index = gameState[attackingPlayer].discardPile.indexOf(item);
                            gameState[attackingPlayer].discardPile.splice(index, 1);
                            alert(`You retrieved ${item.data.name} from your discard pile!`);
                        } else {
                            // AI chooses randomly
                            const item = items[Math.floor(Math.random() * items.length)];
                            gameState[attackingPlayer].hand.push(item);
                            const index = gameState[attackingPlayer].discardPile.indexOf(item);
                            gameState[attackingPlayer].discardPile.splice(index, 1);
                            alert(`AI retrieved ${item.data.name} from discard pile!`);
                        }
                        renderGame();
                    } else {
                        alert("No item cards in discard pile!");
                    }
                } else {
                    alert("Coin was tails! No item retrieved.");
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'gearGrind':
            // Gear Grind - Flip coin, if heads +20 damage
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'chillRecharge':
            // Chill Recharge - Heal 10 HP and increase next attack by 20
            attacker.damage = Math.max(0, attacker.damage - 10);
            attacker.chillRechargeBonus = true;
            setTimeout(() => {
                alert(`${attacker.data.name} healed 10 HP! Next attack will deal +20 damage!`);
                renderGame();
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'overdriveSmash':
            // Overdrive Smash - Can't use this move on your next turn (skip 2 player turns)
            attacker.cantUseOverdrive = 3; // Will decrement: end of turn 5->2, end of turn 6->1, end of turn 7->0
            setTimeout(() => {
                alert(`${attacker.data.name} can't use Overdrive Smash for the next 2 turns!`);
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'harshFlinch':
            // Harsh Flinch - Flip coins until tails, +20 per heads
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'tempestHold':
            // Tempest Hold - Attacker can't retreat for 2 turns
            attacker.cantRetreatTurns = 2;
            setTimeout(() => {
                alert(`${attacker.data.name} can't retreat for the next 2 turns!`);
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'forestFury':
            // Forest Fury - Causes Lock
            setTimeout(() => {
                // Check if defender survived the attack
                if (defender.damage < defender.data.hp) {
                    StatusConditionManager.applyStatus(defender, 'lock');
                    alert(`${defender.data.name} is now affected by Lock!`);
                    renderGame();
                } else {
                    alert(`${defender.data.name} was knocked out! Lock not applied.`);
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'chaosDice':
            // Chaos Dice - Roll dice, apply Hallucination (1-2), Flux (3-4), or Lock (5-6)
            // Only apply status if defender survives the attack
            setTimeout(() => {
                const roll = rollDice();
                alert(`Chaos Dice: Rolled a ${roll}!`);
                
                // Check if defender survived the attack
                if (defender.damage < defender.data.hp) {
                    if (roll <= 2) {
                        StatusConditionManager.applyStatus(defender, 'hallucination');
                        alert(`${defender.data.name} is now hallucinating!`);
                    } else if (roll <= 4) {
                        StatusConditionManager.applyStatus(defender, 'flux');
                        alert(`${defender.data.name} is now affected by Flux!`);
                    } else {
                        StatusConditionManager.applyStatus(defender, 'lock');
                        alert(`${defender.data.name} is now affected by Lock!`);
                    }
                    renderGame();
                } else {
                    alert(`${defender.data.name} was knocked out! Status condition not applied.`);
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'foresightBeam':
            // Foresight Beam - Flip coin, if heads +10 damage
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'spectralWrapGA':
            // Spectral Wrap (Galactic Adventures) - +10 damage per energy on opponent's active
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'featherBarrage':
            // Feather Barrage - Flip coin, if heads +20 damage
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'recoil40':
            // Blow Blitz - 40 damage to self
            attacker.damage += 40;
            setTimeout(() => {
                alert(`${attacker.data.name} took 40 recoil damage!`);
                renderGame();
                if (attacker.damage >= attacker.data.hp) {
                    knockoutCreature(attackingPlayer);
                } else {
                    checkKnockoutsAndContinue(attackingPlayer);
                }
            }, 500);
            break;
            
        case 'sproutBoost':
            // Sprout Boost - Next attack in 2 turns deals +30 damage
            attacker.sproutBoostTurns = 2;
            setTimeout(() => {
                alert(`In 2 turns, ${attacker.data.name}'s next attack will deal +30 damage!`);
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'coffeeHeal':
            // Coffee Heal - Heal bench creature 10 HP
            setTimeout(() => {
                const benchWithDamage = gameState[attackingPlayer].bench.filter(c => c && c.damage > 0);
                if (benchWithDamage.length > 0) {
                    if (attackingPlayer === 'player') {
                        // Player chooses which bench creature to heal
                        if (benchWithDamage.length === 1) {
                            // Only one damaged bench creature, heal it automatically
                            const target = benchWithDamage[0];
                            healCreature(target, 10);
                            alert(`Healed ${target.data.name} for 10 HP!`);
                            renderGame();
                            checkKnockoutsAndContinue(attackingPlayer);
                        } else {
                            // Multiple damaged bench creatures, let player choose
                            showBenchHealModal('player', 10, attackingPlayer);
                        }
                    } else {
                        // AI chooses randomly from damaged bench creatures
                        const target = benchWithDamage[Math.floor(Math.random() * benchWithDamage.length)];
                        healCreature(target, 10);
                        alert(`AI healed ${target.data.name} for 10 HP!`);
                        renderGame();
                        checkKnockoutsAndContinue(attackingPlayer);
                    }
                } else {
                    // No damaged bench creatures to heal
                    alert("No damaged bench creatures to heal!");
                    checkKnockoutsAndContinue(attackingPlayer);
                }
            }, 500);
            break;
            
        case 'beanBlast':
            // Bean Blast - Heal bench creature 20 HP
            setTimeout(() => {
                const benchWithDamage = gameState[attackingPlayer].bench.filter(c => c && c.damage > 0);
                if (benchWithDamage.length > 0) {
                    if (attackingPlayer === 'player') {
                        // Player chooses which bench creature to heal
                        if (benchWithDamage.length === 1) {
                            // Only one damaged bench creature, heal it automatically
                            const target = benchWithDamage[0];
                            healCreature(target, 20);
                            alert(`Healed ${target.data.name} for 20 HP!`);
                            renderGame();
                            checkKnockoutsAndContinue(attackingPlayer);
                        } else {
                            // Multiple damaged bench creatures, let player choose
                            showBenchHealModal('player', 20, attackingPlayer);
                        }
                    } else {
                        // AI chooses randomly from damaged bench creatures
                        const target = benchWithDamage[Math.floor(Math.random() * benchWithDamage.length)];
                        healCreature(target, 20);
                        alert(`AI healed ${target.data.name} for 20 HP!`);
                        renderGame();
                        checkKnockoutsAndContinue(attackingPlayer);
                    }
                } else {
                    // No damaged bench creatures to heal
                    checkKnockoutsAndContinue(attackingPlayer);
                }
            }, 500);
            break;
            
        case 'caffeineAddiction':
            // Caffeine Addiction - Flip coin, heads heal 20, tails Lock
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Caffeine Addiction: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    attacker.damage = Math.max(0, attacker.damage - 20);
                    alert(`${attacker.data.name} healed 20 HP!`);
                } else {
                    defender.hasLock = true;
                    alert(`${defender.data.name} is now affected by Lock!`);
                }
                renderGame();
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'skyDraw':
            // Sky Draw - Draw a card after attacking
            if (gameState[attackingPlayer].deck.length > 0) {
                const cardId = gameState[attackingPlayer].deck.pop();
                const cardData = getCardData(cardId);
                const drawnCard = {
                    id: cardId,
                    data: cardData,
                    energy: 0,
                    damage: 0,
                    abilityUsedThisTurn: false,
                    absorbEnergyActive: false,
                    energizedHealingAmount: 0,
                    healingRetreatAmount: 0,
                    evolutionId: Math.random().toString(36).substr(2, 9),
                    evolutionChain: []
                };
                gameState[attackingPlayer].hand.push(drawnCard);
                setTimeout(() => {
                    alert(`${attackingPlayer === 'player' ? 'You' : 'AI'} drew a card!`);
                    renderGame();
                    checkKnockoutsAndContinue(attackingPlayer);
                }, 500);
            } else {
                checkKnockoutsAndContinue(attackingPlayer);
            }
            break;
            
        case 'hurricaneWing':
            // Hurricane Wing - Flip coin, if tails no damage
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'tailDance':
            // Tail Dance - Flip coin, if tails no damage
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'gulpSwap':
            // Gulp Swap - Swap remaining HP with opponent's active (capped at max HP)
            setTimeout(() => {
                const attackerRemaining = attacker.data.hp - attacker.damage;
                const defenderRemaining = defender.data.hp - defender.damage;
                
                // Calculate new damage values (remaining HP becomes the other's remaining HP)
                let attackerNewDamage = attacker.data.hp - defenderRemaining;
                let defenderNewDamage = defender.data.hp - attackerRemaining;
                
                // Cap at max HP (damage can't be negative)
                attackerNewDamage = Math.max(0, attackerNewDamage);
                defenderNewDamage = Math.max(0, defenderNewDamage);
                
                // Apply the swapped damage
                attacker.damage = attackerNewDamage;
                defender.damage = defenderNewDamage;
                
                // Calculate actual remaining HP after capping
                const attackerFinalHP = attacker.data.hp - attacker.damage;
                const defenderFinalHP = defender.data.hp - defender.damage;
                
                alert(`HP swapped! ${attacker.data.name}: ${attackerFinalHP} HP, ${defender.data.name}: ${defenderFinalHP} HP`);
                renderGame();
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'cottonGuard':
            // Cotton Guard - Take 20 less damage next turn
            attacker.cottonGuardShield = true;
            setTimeout(() => {
                alert(`${attacker.data.name} will take 20 less damage next turn!`);
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'cloudBounce':
            // Cloud Bounce - Transfer energy between bench creatures
            setTimeout(() => {
                if (attackingPlayer === 'player') {
                    alert("Cloud Bounce: You may transfer an energy between bench creatures (or skip).");
                    // For simplicity, skip this feature for now
                }
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'alphabetAssault':
            // Alphabet Assault - 10 damage per letter in opponent's active creature name
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'infernoConstrict':
            // Inferno Constrict - 30 damage per Mechanic creature on bench
            // This is handled in attack damage calculation
            checkKnockoutsAndContinue(attackingPlayer);
            break;
            
        case 'berryBurst':
            // Berry Burst - Heal 10 HP from each creature with damage
            setTimeout(() => {
                let healed = 0;
                if (gameState[attackingPlayer].active && gameState[attackingPlayer].active.damage > 0) {
                    gameState[attackingPlayer].active.damage = Math.max(0, gameState[attackingPlayer].active.damage - 10);
                    healed++;
                }
                gameState[attackingPlayer].bench.forEach(c => {
                    if (c && c.damage > 0) {
                        c.damage = Math.max(0, c.damage - 10);
                        healed++;
                    }
                });
                alert(`Berry Burst healed ${healed} creature(s) for 10 HP each!`);
                renderGame();
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'laughingLeaves':
            // Laughing Leaves - Heal 20 HP from each creature with damage
            setTimeout(() => {
                let healed = 0;
                if (gameState[attackingPlayer].active && gameState[attackingPlayer].active.damage > 0) {
                    gameState[attackingPlayer].active.damage = Math.max(0, gameState[attackingPlayer].active.damage - 20);
                    healed++;
                }
                gameState[attackingPlayer].bench.forEach(c => {
                    if (c && c.damage > 0) {
                        c.damage = Math.max(0, c.damage - 20);
                        healed++;
                    }
                });
                alert(`Laughing Leaves healed ${healed} creature(s) for 20 HP each!`);
                renderGame();
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        case 'psychicProwl':
            // Psychic Prowl - Flip coin, heads Flux, tails Lock
            setTimeout(() => {
                const flip = flipCoin();
                alert(`Psychic Prowl: Coin flip: ${flip}`);
                if (flip === 'heads') {
                    defender.hasFlux = true;
                    alert(`${defender.data.name} is now affected by Flux!`);
                } else {
                    defender.hasLock = true;
                    alert(`${defender.data.name} is now affected by Lock!`);
                }
                renderGame();
                checkKnockoutsAndContinue(attackingPlayer);
            }, 500);
            break;
            
        default:
            setTimeout(endTurn, 1000);
    }
}

function checkKnockoutsAndContinue(attackingPlayer) {
    const defender = attackingPlayer === 'player' ? gameState.opponent.active : gameState.player.active;
    const defenderPlayer = attackingPlayer === 'player' ? 'opponent' : 'player';
    
    // Check if defender is knocked out
    if (defender && defender.damage >= defender.data.hp) {
        knockoutCreature(defenderPlayer);
    } else {
        // Check bench creatures for knockouts on both sides
        checkBenchKnockouts('player');
        checkBenchKnockouts('opponent');
        setTimeout(endTurn, 1000);
    }
}

function checkBenchKnockouts(player) {
    const opponent = player === 'player' ? 'opponent' : 'player';
    
    // Check each bench slot for knocked out creatures
    for (let i = gameState[player].bench.length - 1; i >= 0; i--) {
        const benchCard = gameState[player].bench[i];
        if (benchCard && benchCard.damage >= benchCard.data.hp) {
            // Creature is knocked out
            alert(`${benchCard.data.name} on ${player === 'player' ? 'your' : "opponent's"} bench was knocked out!`);
            
            // Add all cards in evolution chain to discard pile
            if (benchCard.evolutionChain && benchCard.evolutionChain.length > 0) {
                benchCard.evolutionChain.forEach(prevCard => {
                    gameState[player].discardPile.push(prevCard);
                });
            }
            
            // Move to discard pile
            gameState[player].discardPile.push(benchCard);
            gameState[player].bench[i] = null;
            
            // Opponent gets a point
            gameState[opponent].points++;
            
            if (opponent === 'player') {
                alert("You scored a point!");
            } else {
                alert("Your opponent scored a point!");
            }
            
            // Check for game over
            if (gameState[opponent].points >= 3) {
                setTimeout(() => endGame(opponent), 500);
                return;
            }
            
            renderGame();
        }
    }
}

// Retreat system
function handleRetreatButton() {
    const activeCard = gameState.player.active;
    if (!activeCard) return;
    
    // Check if blocked by Tempest Hold
    if (activeCard.cantRetreatTurns && activeCard.cantRetreatTurns > 0) {
        alert(`${activeCard.data.name} can't retreat! (Tempest Hold: ${activeCard.cantRetreatTurns} turn${activeCard.cantRetreatTurns > 1 ? 's' : ''} remaining)`);
        return;
    }
    
    if (activeCard.energy < activeCard.data.retreat) {
        alert("Not enough energy to retreat!");
        return;
    }
    
    // Check if there are bench creatures
    const availableBench = gameState.player.bench.filter(card => card !== null);
    if (availableBench.length === 0) {
        alert("No creatures on bench to swap with!");
        return;
    }
    
    // Show selection modal
    showBenchSelectionModal('player', 'retreat');
}

function showBenchSelectionModal(player, action) {
    const modal = document.getElementById('select-modal');
    const title = document.getElementById('modal-title');
    const options = document.getElementById('modal-options');
    
    if (action === 'retreat') {
        title.textContent = 'Select a creature to switch with';
    } else if (action === 'heavenlyRetreat') {
        title.textContent = 'Select a creature to swap with (no cost)';
    } else {
        title.textContent = 'Select a new active creature';
    }
    options.innerHTML = '';
    
    gameState[player].bench.forEach((card, index) => {
        if (card) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'modal-card';
            
            const img = document.createElement('img');
            img.src = `cards/${card.id}`;
            img.alt = card.data.name;
            cardDiv.appendChild(img);
            
            cardDiv.addEventListener('click', () => {
                if (action === 'retreat') {
                    performRetreat(player, index);
                } else if (action === 'heavenlyRetreat') {
                    performHeavenlyRetreat(player, index);
                } else {
                    // Knockout - selecting new active
                    selectNewActiveCreature(player, index);
                    // End turn after knockout replacement
                    setTimeout(endTurn, 1000);
                }
                modal.style.display = 'none';
            });
            
            options.appendChild(cardDiv);
        }
    });
    
    modal.style.display = 'flex';
}

function performHeavenlyRetreat(player, benchIndex) {
    const activeCard = gameState[player].active;
    const benchCard = gameState[player].bench[benchIndex];
    
    // Clear ALL status conditions when moving to bench (centralized)
    const hadStatus = StatusConditionManager.getAllStatus(activeCard).length > 0;
    StatusConditionManager.clearAllStatus(activeCard);
    if (hadStatus) {
        alert(`${activeCard.data.name}'s status conditions cleared!`);
    }
    
    // Swap without discarding energy (free retreat)
    gameState[player].active = benchCard;
    gameState[player].bench[benchIndex] = activeCard;
    
    // Mark as attacked to end turn
    gameState[player].hasAttacked = true;
    
    renderGame();
    
    // Check for knockouts and continue
    setTimeout(endTurn, 1000);
}

function performRetreat(player, benchIndex) {
    const activeCard = gameState[player].active;
    const benchCard = gameState[player].bench[benchIndex];
    
    // Discard retreat cost energy
    activeCard.energy -= activeCard.data.retreat;
    
    // Clear ALL status conditions when moving to bench (centralized)
    const hadStatus = StatusConditionManager.getAllStatus(activeCard).length > 0;
    StatusConditionManager.clearAllStatus(activeCard);
    if (hadStatus) {
        alert(`${activeCard.data.name}'s status conditions cleared!`);
    }
    
    // Check for Healing Retreat ability
    if (activeCard.healingRetreatAmount) {
        const healAmount = activeCard.healingRetreatAmount;
        healCreature(activeCard, healAmount);
        alert(`${activeCard.data.name}'s Healing Retreat activated! Healed ${healAmount} HP!`);
        activeCard.healingRetreatAmount = 0; // Clear the flag after use
    }
    
    // Swap
    gameState[player].active = benchCard;
    gameState[player].bench[benchIndex] = activeCard;
    
    renderGame();
}

// Show modal for selecting bench creature to heal
function showBenchHealModal(player, healAmount, attackingPlayer, callback) {
    const modal = document.getElementById('select-modal');
    const title = document.getElementById('modal-title');
    const options = document.getElementById('modal-options');
    
    title.textContent = `Select a bench creature to heal ${healAmount} HP`;
    options.innerHTML = '';
    
    gameState[player].bench.forEach((card, index) => {
        // Only show creatures with damage
        if (card && card.damage > 0) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'modal-card';
            
            const img = document.createElement('img');
            img.src = `cards/${card.id}`;
            img.alt = card.data.name;
            cardDiv.appendChild(img);
            
            // Show HP info
            const hpInfo = document.createElement('div');
            hpInfo.textContent = `HP: ${card.data.hp - card.damage}/${card.data.hp}`;
            hpInfo.style.textAlign = 'center';
            hpInfo.style.fontSize = '12px';
            hpInfo.style.marginTop = '5px';
            cardDiv.appendChild(hpInfo);
            
            cardDiv.addEventListener('click', () => {
                // Heal the selected creature
                healCreature(card, healAmount);
                alert(`Healed ${card.data.name} for ${healAmount} HP!`);
                renderGame();
                modal.style.display = 'none';
                // Call callback if provided, otherwise use checkKnockoutsAndContinue
                if (callback) {
                    callback();
                } else {
                    checkKnockoutsAndContinue(attackingPlayer);
                }
            });
            
            options.appendChild(cardDiv);
        }
    });
    
    modal.style.display = 'flex';
}

// Knockout system
function knockoutCreature(player) {
    const opponent = player === 'player' ? 'opponent' : 'player';
    
    const knockedOutCard = gameState[player].active;
    
    // Clear ALL status conditions before knocking out (centralized)
    StatusConditionManager.clearAllStatus(knockedOutCard);
    
    // Add all cards in the evolution chain to discard pile
    // First add all previous evolutions from the chain
    if (knockedOutCard.evolutionChain && knockedOutCard.evolutionChain.length > 0) {
        knockedOutCard.evolutionChain.forEach(prevCard => {
            gameState[player].discardPile.push(prevCard);
        });
    }
    
    // Then add the final evolved card itself
    gameState[player].discardPile.push(knockedOutCard);
    
    // Opponent gets a point
    gameState[opponent].points++;
    
    // Show point notification
    if (opponent === 'player') {
        setTimeout(() => alert("You scored a point!"), 100);
    } else {
        setTimeout(() => alert("Your opponent scored a point!"), 100);
    }
    
    // Check for game over
    if (gameState[opponent].points >= 3) {
        setTimeout(() => endGame(opponent), 500);
        return;
    }
    
    // Remove knocked out creature
    gameState[player].active = null;
    
    // Check if player has bench creatures
    const availableBench = gameState[player].bench.filter(card => card !== null);
    if (availableBench.length === 0) {
        // No bench - opponent wins
        setTimeout(() => endGame(opponent), 500);
        return;
    }
    
    // Player must select new active creature
    if (player === 'player') {
        setTimeout(() => showBenchSelectionModal(player, 'knockout'), 300);
    } else {
        // AI selects creature with highest HP
        setTimeout(() => aiSelectNewActive(), 300);
    }
}

function selectNewActiveCreature(player, benchIndex) {
    gameState[player].active = gameState[player].bench[benchIndex];
    gameState[player].bench[benchIndex] = null;
    
    // NOTE: Incoming creatures should NOT have status conditions!
    // Status conditions only affect the active creature that was hit.
    // The new creature coming in should be clean.
    // The StatusConditionManager handles this automatically.
    
    renderGame();
}

function aiSelectNewActive() {
    let bestIndex = -1;
    let bestHp = -1;
    
    gameState.opponent.bench.forEach((card, index) => {
        if (card) {
            const currentHp = card.data.hp - card.damage;
            if (currentHp > bestHp) {
                bestHp = currentHp;
                bestIndex = index;
            }
        }
    });
    
    if (bestIndex !== -1) {
        selectNewActiveCreature('opponent', bestIndex);
        // End turn after AI selects new active from knockout
        setTimeout(endTurn, 1000);
    }
}

// Draw cards
function drawCards(player, count) {
    for (let i = 0; i < count; i++) {
        if (gameState[player].deck.length > 0) {
            const cardId = gameState[player].deck.pop();
            const cardData = getCardData(cardId);
            gameState[player].hand.push({
                id: cardId, 
                data: cardData, 
                energy: 0, 
                damage: 0, 
                abilityUsedThisTurn: false,
                absorbEnergyActive: false,
                energizedHealingAmount: 0,
                healingRetreatAmount: 0,
                evolutionId: Math.random().toString(36).substr(2, 9), // Unique ID that persists across evolutions
                evolutionChain: [] // Track all cards in the evolution chain (for discard pile)
            });
        }
    }
}

// Universal healing function - handles absorbEnergy and other healing-related effects
function healCreature(card, healAmount) {
    if (!card || healAmount <= 0) return;
    
    // Apply healing
    card.damage = Math.max(0, card.damage - healAmount);
    
    // Check for Absorb Energy ability - if active, attach energy when healed
    if (card.absorbEnergyActive) {
        card.energy++;
        card.absorbEnergyActive = false;
        return true; // Return true to indicate Absorb Energy was triggered
    }
    
    return false;
}

// Ability system
function checkAbilityUsable(card, location) {
    // Can't use abilities if game is over or not player's turn or already attacked
    if (gameState.phase === 'gameOver' || gameState.currentTurn !== 'player' || gameState.player.hasAttacked) {
        return false;
    }
    
    // Check if ability was already used this turn
    if (card.abilityUsedThisTurn) {
        return false;
    }
    
    // Check location requirement
    if (card.data.abilityLocation === 'active' && location !== 'active') {
        return false;
    }
    
    // Ability can be used
    return true;
}

function useAbility(card, player, location, index) {
    const abilityEffect = card.data.abilityEffect;
    
    if (!abilityEffect) return;
    
    console.log(`Using ability: ${card.data.abilityName} (${abilityEffect})`);
    
    switch(abilityEffect) {
        case 'defenseAura':
            // Defense Aura - reduce next attack damage by 10
            gameState.player.defenseAuraShield = 10;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Defense Aura! Next turn, opponent's damage will be reduced by 10.`);
            renderGame();
            break;
            
        case 'resourcefulRecovery':
            // Resourceful Recovery - flip coin, if heads attach energy to random creature
            const flip = flipCoin();
            alert(`${card.data.name} used Resourceful Recovery! Coin flip: ${flip}!`);
            
            if (flip === 'heads') {
                // Get all creatures in play
                const allCreatures = [];
                if (gameState.player.active) allCreatures.push({card: gameState.player.active, name: gameState.player.active.data.name});
                gameState.player.bench.forEach((benchCard, idx) => {
                    if (benchCard) allCreatures.push({card: benchCard, name: benchCard.data.name});
                });
                
                if (allCreatures.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allCreatures.length);
                    const targetCreature = allCreatures[randomIndex];
                    targetCreature.card.energy++;
                    alert(`Heads! Attached 1 energy to ${targetCreature.name}!`);
                } else {
                    alert("Heads! But no creatures to attach energy to.");
                }
            } else {
                alert("Tails! No energy attached.");
            }
            
            card.abilityUsedThisTurn = true;
            renderGame();
            break;
            
        case 'hardAsSteel':
            // Hard as Steel - reduce damage from Mechanic/Neutral attacks by 30 next turn
            gameState.player.hardAsSteelShield = 30;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Hard as Steel! Next turn, damage from Mechanic/Neutral creatures will be reduced by 30.`);
            renderGame();
            break;
            
        case 'auraOfStrength':
            // Aura of Strength - requires full bench, gives +30 damage bonus this turn
            const fullBench = gameState.player.bench.filter(c => c !== null).length === 3;
            if (!fullBench) {
                alert(`${card.data.name}'s Aura of Strength requires a full bench (3 creatures)!`);
                return;
            }
            gameState.player.auraOfStrengthBonus = 30;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Aura of Strength! Your attacks this turn deal +30 damage!`);
            renderGame();
            break;
            
        case 'guardiansCall':
            // Guardian's Call - flip coin, if heads can evolve Aeglet to Aegiscelis immediately
            const hasAegiscelisInHand = gameState.player.hand.some(c => c.data.name === "Aegiscelis");
            if (!hasAegiscelisInHand) {
                alert(`${card.data.name}'s Guardian's Call requires Aegiscelis in your hand!`);
                return;
            }
            const guardianFlip = flipCoin();
            alert(`${card.data.name} used Guardian's Call! Coin flip: ${guardianFlip}!`);
            if (guardianFlip === 'heads') {
                // Find Aegiscelis in hand
                const aegiscelisIndex = gameState.player.hand.findIndex(c => c.data.name === "Aegiscelis");
                const aegiscelis = gameState.player.hand[aegiscelisIndex];
                
                // Evolve the card
                const newCard = {
                    id: aegiscelis.id, // Preserve card ID for image display
                    data: aegiscelis.data,
                    damage: card.damage, // Preserve damage
                    energy: card.energy, // Preserve energy
                    hallucinating: card.hallucinating || false,
                    cantRetreat: card.cantRetreat || false,
                    abilityUsedThisTurn: false,
                    justPlayed: false,
                    justEvolved: true
                };
                
                // Replace in correct location
                if (location === 'active') {
                    gameState.player.active = newCard;
                } else if (location === 'bench') {
                    gameState.player.bench[index] = newCard;
                }
                
                // Remove from hand
                gameState.player.hand.splice(aegiscelisIndex, 1);
                alert(`Heads! ${card.data.name} evolved into Aegiscelis!`);
                card.abilityUsedThisTurn = true;
                renderGame();
            } else {
                alert("Tails! Evolution failed.");
                card.abilityUsedThisTurn = true;
                renderGame();
            }
            break;
            
        case 'guardian':
            // Guardian - next turn, this creature takes damage instead of active creature
            if (location !== 'bench') {
                alert(`${card.data.name}'s Guardian ability can only be used from the bench!`);
                return;
            }
            gameState.player.guardianBenchIndex = index;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Guardian! Next turn, it will take damage instead of your active creature!`);
            renderGame();
            break;
            
        case 'energySiphon':
            // Energy Siphon - if opponent used item last turn, attach energy to this creature
            if (!gameState.opponent.usedItemLastTurn) {
                alert(`${card.data.name}'s Energy Siphon requires the opponent to have used an item card last turn!`);
                return;
            }
            card.energy++;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Energy Siphon! Attached 1 energy because opponent used an item last turn!`);
            renderGame();
            break;
            
        case 'quickReflexes':
            // Quick Reflexes - flip 2 coins, if both heads opponent can't attack next turn
            const flip1 = flipCoin();
            const flip2 = flipCoin();
            alert(`${card.data.name} used Quick Reflexes! Coin flips: ${flip1}, ${flip2}!`);
            if (flip1 === 'heads' && flip2 === 'heads') {
                gameState.opponent.cantAttackNextTurn = true;
                gameState.opponent.cantAttackUntilTurn = gameState.turnNumber + 2; // Can't attack on opponent's next turn
                card.abilityUsedThisTurn = true;
                alert("Both heads! Opponent can't attack next turn!");
                renderGame();
            } else {
                alert("Not both heads! No effect.");
                card.abilityUsedThisTurn = true;
                renderGame();
            }
            break;
            
        case 'clarityAura':
            // Clarity Aura - prevents all creatures from getting hallucination
            gameState.player.clarityAuraActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Clarity Aura! Your creatures are protected from Hallucination this turn!`);
            renderGame();
            break;
            
        case 'celestialBlessing':
            // Celestial Blessing - heal one random celestial creature by 30 HP
            const allCelestials = [];
            // Add player's celestial creatures
            if (gameState.player.active && getCardType(gameState.player.active.data) === 'Celestial' && gameState.player.active.damage > 0) {
                allCelestials.push({owner: 'player', location: 'active', card: gameState.player.active});
            }
            gameState.player.bench.forEach((benchCard, idx) => {
                if (benchCard && getCardType(benchCard.data) === 'Celestial' && benchCard.damage > 0) {
                    allCelestials.push({owner: 'player', location: 'bench', index: idx, card: benchCard});
                }
            });
            // Add opponent's celestial creatures
            if (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Celestial' && gameState.opponent.active.damage > 0) {
                allCelestials.push({owner: 'opponent', location: 'active', card: gameState.opponent.active});
            }
            gameState.opponent.bench.forEach((benchCard, idx) => {
                if (benchCard && getCardType(benchCard.data) === 'Celestial' && benchCard.damage > 0) {
                    allCelestials.push({owner: 'opponent', location: 'bench', index: idx, card: benchCard});
                }
            });
            
            if (allCelestials.length === 0) {
                alert(`${card.data.name} used Celestial Blessing, but there are no damaged Celestial creatures to heal!`);
                card.abilityUsedThisTurn = true;
                renderGame();
            } else {
                const randomIndex = Math.floor(Math.random() * allCelestials.length);
                const target = allCelestials[randomIndex];
                target.card.damage = Math.max(0, target.card.damage - 30);
                card.abilityUsedThisTurn = true;
                alert(`${card.data.name} used Celestial Blessing! Healed ${target.card.data.name} for 30 HP!`);
                renderGame();
            }
            break;
            
        case 'sturdyPresence':
            // Sturdy Presence - +20 damage bonus this turn
            gameState.player.sturdyPresenceBonus = 20;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Sturdy Presence! Your attacks this turn deal +20 damage!`);
            renderGame();
            break;
            
        case 'rainbowStrike':
            // Rainbow Strike - deals 30 damage to random bench creature when attacking
            if (location !== 'active') {
                alert(`${card.data.name}'s Rainbow Strike can only be used from the active spot!`);
                return;
            }
            gameState.player.rainbowStrikeActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Rainbow Strike! When you attack, it will also deal 30 damage to a random opponent bench creature!`);
            renderGame();
            break;
            
        case 'camouflage':
            // Camouflage - protects bench creatures from damage
            gameState.player.camouflageActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Camouflage! Your bench creatures are protected from damage this turn!`);
            renderGame();
            break;
            
        case 'phaseShift':
            // Phase Shift - after attacking, must switch with bench creature
            if (location !== 'active') {
                alert(`${card.data.name}'s Phase Shift can only be used from the active spot!`);
                return;
            }
            gameState.player.phaseShiftActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Phase Shift! After attacking, you must switch it with a bench creature!`);
            renderGame();
            break;
            
        // Galactic Adventures Abilities
        case 'extraCharge':
            // Extra Charge - attach energy to neutral creature
            const neutralCreatures = [];
            if (gameState.player.active && getCardType(gameState.player.active.data) === 'Neutral') {
                neutralCreatures.push({card: gameState.player.active, name: gameState.player.active.data.name, location: 'active'});
            }
            gameState.player.bench.forEach((benchCard, idx) => {
                if (benchCard && getCardType(benchCard.data) === 'Neutral') {
                    neutralCreatures.push({card: benchCard, name: benchCard.data.name, location: 'bench', index: idx});
                }
            });
            if (neutralCreatures.length === 0) {
                alert(`${card.data.name}'s Extra Charge requires a Neutral creature in play!`);
                return;
            }
            
            // Store ability info for later use
            gameState.selectedAbility = {card: card, type: 'extraCharge', location: location, index: index};
            
            // Highlight Neutral creatures for player selection
            if (gameState.player.active && getCardType(gameState.player.active.data) === 'Neutral') {
                const activeSlot = document.querySelector('.active-slot[data-player="player"]');
                activeSlot.classList.add('can-select');
                activeSlot.addEventListener('click', () => applyExtraCharge('active', null), {once: true});
            }
            
            gameState.player.bench.forEach((benchCard, benchIndex) => {
                if (benchCard && getCardType(benchCard.data) === 'Neutral') {
                    const benchSlot = document.querySelector(`.bench-slot[data-player="player"][data-slot="${benchIndex}"]`);
                    benchSlot.classList.add('can-select');
                    benchSlot.addEventListener('click', () => applyExtraCharge('bench', benchIndex), {once: true});
                }
            });
            
            alert(`${card.data.name} used Extra Charge! Click on a Neutral creature to attach energy.`);
            break;
            
        case 'guardianMode':
            // Guardian Mode - reduces all damage taken by any creature by 10
            gameState.player.guardianModeActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Guardian Mode! All your creatures take 10 less damage this turn!`);
            renderGame();
            break;
            
        case 'warriorMode':
            // Warrior Mode - increases all damage from active creature by 10 (FIXED: was 20)
            gameState.player.warriorModeBonus = 10;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Warrior Mode! Your active creature's attacks deal +10 damage this turn!`);
            renderGame();
            break;
            
        case 'healingRetreat1':
            // Healing Retreat (Trunket) - heals 20 HP when retreating
            if (location !== 'active') {
                alert(`${card.data.name}'s Healing Retreat can only be used from the active spot!`);
                return;
            }
            card.healingRetreatAmount = 20;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Healing Retreat! It will heal 20 HP when it retreats to the bench!`);
            renderGame();
            break;
            
        case 'healingRetreat2':
            // Healing Retreat (Elefeir) - heals 40 HP when retreating
            if (location !== 'active') {
                alert(`${card.data.name}'s Healing Retreat can only be used from the active spot!`);
                return;
            }
            card.healingRetreatAmount = 40;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Healing Retreat! It will heal 40 HP when it retreats to the bench!`);
            renderGame();
            break;
            
        case 'mirageShield':
            // Mirage Shield - opponent can't use items next turn
            if (location !== 'active') {
                alert(`${card.data.name}'s Mirage Shield can only be used from the active spot!`);
                return;
            }
            gameState.opponent.cantUseItemsNextTurn = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Mirage Shield! Opponent can't use items next turn!`);
            renderGame();
            break;
            
        case 'thunderRush':
            // Thunder Rush - doubles attack damage if opponent evolved last turn
            if (location !== 'active') {
                alert(`${card.data.name}'s Thunder Rush can only be used from the active spot!`);
                return;
            }
            if (!gameState.opponent.evolvedLastTurn) {
                alert(`${card.data.name}'s Thunder Rush requires the opponent to have evolved a creature last turn!`);
                return;
            }
            gameState.player.thunderRushActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Thunder Rush! Your attack damage will be doubled this turn!`);
            renderGame();
            break;
            
        case 'absorbEnergy':
            // Absorb Energy - if healed this turn, gain additional energy
            card.absorbEnergyActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Absorb Energy! If it's healed this turn, it will also gain 1 energy!`);
            renderGame();
            break;
            
        case 'energizedHealing1':
            // Energized Healing (Nebuleap) - if energy attached, heal 10 HP
            card.energizedHealingAmount = 10;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Energized Healing! If you attach energy to it this turn and it has damage, it will heal 10 HP!`);
            renderGame();
            break;
            
        case 'energizedHealing2':
            // Energized Healing (Comiscroaker) - if energy attached, heal 20 HP
            card.energizedHealingAmount = 20;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Energized Healing! If you attach energy to it this turn and it has damage, it will heal 20 HP!`);
            renderGame();
            break;
            
        case 'metalicProtection':
            // Metalic Protection - can't be damaged by Mechanic attacks next turn, but loses 20 HP
            card.damage += 20;
            card.metalicProtectionActive = true; // Store on the creature, not the player
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Metalic Protection! It takes 20 HP damage but can't be damaged by Mechanic attacks next turn!`);
            renderGame();
            // Check if knocked out
            if (card.damage >= card.data.hp) {
                if (location === 'active') {
                    knockoutCreature('player');
                }
            }
            break;
            
        case 'caprineGuard':
            // Caprine Guard - next turn takes 40 less damage from Celestial or Mystic
            gameState.player.caprineGuardShield = 40;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Caprine Guard! Next turn, it takes 40 less damage from Celestial/Mystic attacks!`);
            renderGame();
            break;
            
        case 'elementalFortitude':
            // Elemental Fortitude - THIS creature takes 20 less damage from Wind and Mechanic next turn
            card.elementalFortitudeShield = 20;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Elemental Fortitude! Next turn, it takes 20 less damage from Wind/Mechanic attacks!`);
            renderGame();
            break;
            
        case 'hydration':
            // Hydration - not affected by status conditions when attacked next turn
            if (location !== 'active') {
                alert(`${card.data.name}'s Hydration can only be used from the active spot!`);
                return;
            }
            card.hydrationActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Hydration! It won't be affected by status conditions from opponent's attacks next turn!`);
            renderGame();
            break;
            
        case 'retaliationStone':
            // Retaliation Stone - if damaged by attack next turn, deals 20 damage back
            card.retaliationStoneActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Retaliation Stone! If damaged by an attack next turn, it deals 20 damage back!`);
            renderGame();
            break;
            
        case 'aquaMirror':
            // Aqua Mirror - if given special condition, opponent also gets it
            if (location !== 'active') {
                alert(`${card.data.name}'s Aqua Mirror can only be used from the active spot!`);
                return;
            }
            card.aquaMirrorActive = true;
            card.abilityUsedThisTurn = true;
            alert(`${card.data.name} used Aqua Mirror! If it gets a special condition next turn, the attacker also gets it!`);
            renderGame();
            break;
            
        case 'gnawingPrecision':
            // Gnawing Precision - select opponent creature to deal 20 damage to
            alert(`${card.data.name} used Gnawing Precision! Select an opponent's creature to deal 20 damage:`);
            // For simplicity, damage opponent's active
            if (gameState.opponent.active) {
                gameState.opponent.active.damage += 20;
                alert(`${card.data.name} dealt 20 damage to ${gameState.opponent.active.data.name}!`);
                card.abilityUsedThisTurn = true;
                renderGame();
                // Check if knocked out
                if (gameState.opponent.active.damage >= gameState.opponent.active.data.hp) {
                    knockoutCreature('opponent');
                }
            }
            break;
            
        default:
            console.log("Unknown ability effect:", abilityEffect);
    }
}

// Helper function for Extra Charge ability - player selects target
function applyExtraCharge(targetLocation, targetIndex) {
    // Remove all selection highlights
    document.querySelectorAll('.can-select').forEach(s => s.classList.remove('can-select'));
    
    // Get the target creature
    let targetCard;
    if (targetLocation === 'active') {
        targetCard = gameState.player.active;
    } else {
        targetCard = gameState.player.bench[targetIndex];
    }
    
    // Attach energy
    targetCard.energy++;
    
    // Get the ability user from stored state
    const abilityCard = gameState.selectedAbility.card;
    abilityCard.abilityUsedThisTurn = true;
    
    // Clear stored state
    gameState.selectedAbility = null;
    
    alert(`Extra Charge attached 1 energy to ${targetCard.data.name}!`);
    renderGame();
}

// AI use abilities
function aiUseAbilities() {
    // Check active creature for abilities
    if (gameState.opponent.active && gameState.opponent.active.data.abilityName) {
        const card = gameState.opponent.active;
        if (!card.abilityUsedThisTurn) {
            const abilityEffect = card.data.abilityEffect;
            
            if (abilityEffect === 'defenseAura') {
                gameState.opponent.defenseAuraShield = 10;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Defense Aura! Next turn, your damage will be reduced by 10.`);
                renderGame();
            } else if (abilityEffect === 'resourcefulRecovery') {
                const flip = flipCoin();
                alert(`AI's ${card.data.name} used Resourceful Recovery! Coin flip: ${flip}!`);
                
                if (flip === 'heads') {
                    const allCreatures = [];
                    if (gameState.opponent.active) allCreatures.push({card: gameState.opponent.active, name: gameState.opponent.active.data.name});
                    gameState.opponent.bench.forEach((benchCard) => {
                        if (benchCard) allCreatures.push({card: benchCard, name: benchCard.data.name});
                    });
                    
                    if (allCreatures.length > 0) {
                        const randomIndex = Math.floor(Math.random() * allCreatures.length);
                        const targetCreature = allCreatures[randomIndex];
                        targetCreature.card.energy++;
                        alert(`Heads! AI attached 1 energy to ${targetCreature.name}!`);
                    } else {
                        alert("Heads! But AI has no creatures to attach energy to.");
                    }
                } else {
                    alert("Tails! No energy attached.");
                }
                
                card.abilityUsedThisTurn = true;
                renderGame();
            } else if (abilityEffect === 'hardAsSteel') {
                gameState.opponent.hardAsSteelShield = 30;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Hard as Steel! Next turn, damage from Mechanic/Neutral creatures will be reduced by 30.`);
                renderGame();
            } else if (abilityEffect === 'auraOfStrength') {
                const fullBench = gameState.opponent.bench.filter(c => c !== null).length === 3;
                if (fullBench) {
                    gameState.opponent.auraOfStrengthBonus = 30;
                    card.abilityUsedThisTurn = true;
                    alert(`AI's ${card.data.name} used Aura of Strength! AI's attacks this turn deal +30 damage!`);
                    renderGame();
                }
            } else if (abilityEffect === 'guardiansCall') {
                const hasAegiscelisInHand = gameState.opponent.hand.some(c => c.data.name === "Aegiscelis");
                if (hasAegiscelisInHand) {
                    const guardianFlip = flipCoin();
                    alert(`AI's ${card.data.name} used Guardian's Call! Coin flip: ${guardianFlip}!`);
                    if (guardianFlip === 'heads') {
                        const aegiscelisIndex = gameState.opponent.hand.findIndex(c => c && c.data && c.data.name === "Aegiscelis");
                        const aegiscelis = gameState.opponent.hand[aegiscelisIndex];
                        
                        const newCard = {
                            id: aegiscelis.id, // Preserve card ID for image display
                            data: aegiscelis.data,
                            damage: card.damage,
                            energy: card.energy,
                            hallucinating: card.hallucinating || false,
                            cantRetreat: card.cantRetreat || false,
                            abilityUsedThisTurn: false,
                            justPlaced: false,
                            justEvolved: true
                        };
                        
                        gameState.opponent.active = newCard;
                        gameState.opponent.hand.splice(aegiscelisIndex, 1);
                        alert(`Heads! AI's ${card.data.name} evolved into Aegiscelis!`);
                        card.abilityUsedThisTurn = true;
                        renderGame();
                    } else {
                        alert("Tails! Evolution failed.");
                        card.abilityUsedThisTurn = true;
                        renderGame();
                    }
                }
            } else if (abilityEffect === 'energySiphon') {
                if (gameState.player.usedItemLastTurn) {
                    card.energy++;
                    card.abilityUsedThisTurn = true;
                    alert(`AI's ${card.data.name} used Energy Siphon! Attached 1 energy because you used an item last turn!`);
                    renderGame();
                }
            } else if (abilityEffect === 'quickReflexes') {
                const flip1 = flipCoin();
                const flip2 = flipCoin();
                alert(`AI's ${card.data.name} used Quick Reflexes! Coin flips: ${flip1}, ${flip2}!`);
                if (flip1 === 'heads' && flip2 === 'heads') {
                    gameState.player.cantAttackNextTurn = true;
                    gameState.player.cantAttackUntilTurn = gameState.turnNumber + 2; // Can't attack on player's next turn
                    card.abilityUsedThisTurn = true;
                    alert("Both heads! You can't attack next turn!");
                    renderGame();
                } else {
                    alert("Not both heads! No effect.");
                    card.abilityUsedThisTurn = true;
                    renderGame();
                }
            } else if (abilityEffect === 'clarityAura') {
                gameState.opponent.clarityAuraActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Clarity Aura! AI's creatures are protected from Hallucination this turn!`);
                renderGame();
            } else if (abilityEffect === 'celestialBlessing') {
                const allCelestials = [];
                if (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Celestial' && gameState.opponent.active.damage > 0) {
                    allCelestials.push({owner: 'opponent', location: 'active', card: gameState.opponent.active});
                }
                gameState.opponent.bench.forEach((benchCard, idx) => {
                    if (benchCard && getCardType(benchCard.data) === 'Celestial' && benchCard.damage > 0) {
                        allCelestials.push({owner: 'opponent', location: 'bench', index: idx, card: benchCard});
                    }
                });
                if (gameState.player.active && getCardType(gameState.player.active.data) === 'Celestial' && gameState.player.active.damage > 0) {
                    allCelestials.push({owner: 'player', location: 'active', card: gameState.player.active});
                }
                gameState.player.bench.forEach((benchCard, idx) => {
                    if (benchCard && getCardType(benchCard.data) === 'Celestial' && benchCard.damage > 0) {
                        allCelestials.push({owner: 'player', location: 'bench', index: idx, card: benchCard});
                    }
                });
                
                if (allCelestials.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allCelestials.length);
                    const target = allCelestials[randomIndex];
                    target.card.damage = Math.max(0, target.card.damage - 30);
                    card.abilityUsedThisTurn = true;
                    alert(`AI's ${card.data.name} used Celestial Blessing! Healed ${target.card.data.name} for 30 HP!`);
                    renderGame();
                } else {
                    card.abilityUsedThisTurn = true;
                }
            } else if (abilityEffect === 'sturdyPresence') {
                gameState.opponent.sturdyPresenceBonus = 20;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Sturdy Presence! AI's attacks this turn deal +20 damage!`);
                renderGame();
            } else if (abilityEffect === 'rainbowStrike') {
                gameState.opponent.rainbowStrikeActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Rainbow Strike! When AI attacks, it will also deal 30 damage to a random bench creature!`);
                renderGame();
            } else if (abilityEffect === 'camouflage') {
                gameState.opponent.camouflageActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Camouflage! AI's bench creatures are protected from damage this turn!`);
                renderGame();
            } else if (abilityEffect === 'phaseShift') {
                gameState.opponent.phaseShiftActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Phase Shift! After attacking, AI will switch it with a bench creature!`);
                renderGame();
            }
            // Galactic Adventures abilities
            else if (abilityEffect === 'extraCharge') {
                // Extra Charge - attach energy to any Neutral creature
                const neutralCreatures = [];
                if (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Neutral') {
                    neutralCreatures.push(gameState.opponent.active);
                }
                gameState.opponent.bench.forEach(benchCard => {
                    if (benchCard && getCardType(benchCard.data) === 'Neutral') {
                        neutralCreatures.push(benchCard);
                    }
                });
                
                if (neutralCreatures.length > 0) {
                    const target = neutralCreatures[Math.floor(Math.random() * neutralCreatures.length)];
                    target.energy++;
                    card.abilityUsedThisTurn = true;
                    alert(`AI's ${card.data.name} used Extra Charge! Attached 1 energy to ${target.data.name}!`);
                    renderGame();
                }
            } else if (abilityEffect === 'guardianMode') {
                // Guardian Mode - all AI creatures take 10 less damage
                gameState.opponent.guardianModeActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Guardian Mode! All AI creatures take 10 less damage this turn!`);
                renderGame();
            } else if (abilityEffect === 'warriorMode') {
                // Warrior Mode - AI's attacks deal +10 damage this turn (FIXED: was 20)
                console.log("[DEBUG] AI Warrior Mode activated (aiUseAbilities path)");
                console.log("[DEBUG] Before setting bonus, gameState.opponent.warriorModeBonus =", gameState.opponent.warriorModeBonus);
                gameState.opponent.warriorModeBonus = 10;
                console.log("[DEBUG] After setting bonus, gameState.opponent.warriorModeBonus =", gameState.opponent.warriorModeBonus);
                console.log("[DEBUG] AI active creature:", gameState.opponent.active?.data.name);
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Warrior Mode! AI's attacks this turn deal +10 damage!`);
                renderGame();
            } else if (abilityEffect === 'thunderRush') {
                // Thunder Rush - AI's next attack deals double damage
                gameState.opponent.thunderRushActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Thunder Rush! AI's next attack deals double damage!`);
                renderGame();
            } else if (abilityEffect === 'metalicProtection') {
                // Metalic Protection - can't be damaged by Mechanic attacks next turn, but loses 20 HP
                card.damage += 20;
                card.metalicProtectionActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Metalic Protection! It takes 20 HP damage but can't be damaged by Mechanic attacks next turn!`);
                renderGame();
                // Check if knocked out
                if (card.damage >= card.data.hp) {
                    knockoutCreature('opponent');
                }
            } else if (abilityEffect === 'retaliationStone') {
                // Retaliation Stone - if damaged by attack next turn, deals 20 damage back
                card.retaliationStoneActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Retaliation Stone! If damaged by an attack next turn, it deals 20 damage back!`);
                renderGame();
            } else if (abilityEffect === 'mirageShield') {
                // Mirage Shield - player can't use items next turn
                gameState.player.cantUseItemsNextTurn = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Mirage Shield! You can't use items next turn!`);
                renderGame();
            }
        }
    }
    
    // Check bench creatures for abilities (only "any" location abilities)
    gameState.opponent.bench.forEach((card, benchIndex) => {
        if (card && card.data.abilityName && card.data.abilityLocation === 'any' && !card.abilityUsedThisTurn) {
            const abilityEffect = card.data.abilityEffect;
            
            if (abilityEffect === 'resourcefulRecovery') {
                const flip = flipCoin();
                alert(`AI's ${card.data.name} used Resourceful Recovery! Coin flip: ${flip}!`);
                
                if (flip === 'heads') {
                    const allCreatures = [];
                    if (gameState.opponent.active) allCreatures.push({card: gameState.opponent.active, name: gameState.opponent.active.data.name});
                    gameState.opponent.bench.forEach((benchCard) => {
                        if (benchCard) allCreatures.push({card: benchCard, name: benchCard.data.name});
                    });
                    
                    if (allCreatures.length > 0) {
                        const randomIndex = Math.floor(Math.random() * allCreatures.length);
                        const targetCreature = allCreatures[randomIndex];
                        targetCreature.card.energy++;
                        alert(`Heads! AI attached 1 energy to ${targetCreature.name}!`);
                    } else {
                        alert("Heads! But AI has no creatures to attach energy to.");
                    }
                } else {
                    alert("Tails! No energy attached.");
                }
                
                card.abilityUsedThisTurn = true;
                renderGame();
            } else if (abilityEffect === 'hardAsSteel') {
                gameState.opponent.hardAsSteelShield = 30;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Hard as Steel! Next turn, damage from Mechanic/Neutral creatures will be reduced by 30.`);
                renderGame();
            } else if (abilityEffect === 'auraOfStrength') {
                const fullBench = gameState.opponent.bench.filter(c => c !== null).length === 3;
                if (fullBench) {
                    gameState.opponent.auraOfStrengthBonus = 30;
                    card.abilityUsedThisTurn = true;
                    alert(`AI's ${card.data.name} used Aura of Strength! AI's attacks this turn deal +30 damage!`);
                    renderGame();
                }
            } else if (abilityEffect === 'guardiansCall') {
                const hasAegiscelisInHand = gameState.opponent.hand.some(c => c.data.name === "Aegiscelis");
                if (hasAegiscelisInHand) {
                    const guardianFlip = flipCoin();
                    alert(`AI's ${card.data.name} used Guardian's Call! Coin flip: ${guardianFlip}!`);
                    if (guardianFlip === 'heads') {
                        const aegiscelisIndex = gameState.opponent.hand.findIndex(c => c && c.data && c.data.name === "Aegiscelis");
                        const aegiscelis = gameState.opponent.hand[aegiscelisIndex];
                        
                        const newCard = {
                            id: aegiscelis.id, // Preserve card ID for image display
                            data: aegiscelis.data,
                            damage: card.damage,
                            energy: card.energy,
                            hallucinating: card.hallucinating || false,
                            cantRetreat: card.cantRetreat || false,
                            abilityUsedThisTurn: false,
                            justPlayed: false,
                            justEvolved: true
                        };
                        
                        gameState.opponent.bench[benchIndex] = newCard;
                        gameState.opponent.hand.splice(aegiscelisIndex, 1);
                        alert(`Heads! AI's ${card.data.name} evolved into Aegiscelis!`);
                        card.abilityUsedThisTurn = true;
                        renderGame();
                    } else {
                        alert("Tails! Evolution failed.");
                        card.abilityUsedThisTurn = true;
                        renderGame();
                    }
                }
            } else if (abilityEffect === 'guardian') {
                // AI uses Guardian ability strategically - if active creature has low HP
                if (gameState.opponent.active && gameState.opponent.active.damage >= gameState.opponent.active.data.hp * 0.6) {
                    gameState.opponent.guardianBenchIndex = benchIndex;
                    card.abilityUsedThisTurn = true;
                    alert(`AI's ${card.data.name} used Guardian! Next turn, it will take damage instead of AI's active creature!`);
                    renderGame();
                }
            } else if (abilityEffect === 'energySiphon') {
                if (gameState.player.usedItemLastTurn) {
                    card.energy++;
                    card.abilityUsedThisTurn = true;
                    alert(`AI's ${card.data.name} used Energy Siphon! Attached 1 energy because you used an item last turn!`);
                    renderGame();
                }
            } else if (abilityEffect === 'quickReflexes') {
                const flip1 = flipCoin();
                const flip2 = flipCoin();
                alert(`AI's ${card.data.name} used Quick Reflexes! Coin flips: ${flip1}, ${flip2}!`);
                if (flip1 === 'heads' && flip2 === 'heads') {
                    gameState.player.cantAttackNextTurn = true;
                    gameState.player.cantAttackUntilTurn = gameState.turnNumber + 2; // Can't attack on player's next turn
                    card.abilityUsedThisTurn = true;
                    alert("Both heads! You can't attack next turn!");
                    renderGame();
                } else {
                    alert("Not both heads! No effect.");
                    card.abilityUsedThisTurn = true;
                    renderGame();
                }
            } else if (abilityEffect === 'clarityAura') {
                gameState.opponent.clarityAuraActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Clarity Aura! AI's creatures are protected from Hallucination this turn!`);
                renderGame();
            } else if (abilityEffect === 'celestialBlessing') {
                const allCelestials = [];
                if (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Celestial' && gameState.opponent.active.damage > 0) {
                    allCelestials.push({owner: 'opponent', location: 'active', card: gameState.opponent.active});
                }
                gameState.opponent.bench.forEach((benchCard, idx) => {
                    if (benchCard && getCardType(benchCard.data) === 'Celestial' && benchCard.damage > 0) {
                        allCelestials.push({owner: 'opponent', location: 'bench', index: idx, card: benchCard});
                    }
                });
                if (gameState.player.active && getCardType(gameState.player.active.data) === 'Celestial' && gameState.player.active.damage > 0) {
                    allCelestials.push({owner: 'player', location: 'active', card: gameState.player.active});
                }
                gameState.player.bench.forEach((benchCard, idx) => {
                    if (benchCard && getCardType(benchCard.data) === 'Celestial' && benchCard.damage > 0) {
                        allCelestials.push({owner: 'player', location: 'bench', index: idx, card: benchCard});
                    }
                });
                
                if (allCelestials.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allCelestials.length);
                    const target = allCelestials[randomIndex];
                    target.card.damage = Math.max(0, target.card.damage - 30);
                    card.abilityUsedThisTurn = true;
                    alert(`AI's ${card.data.name} used Celestial Blessing! Healed ${target.card.data.name} for 30 HP!`);
                    renderGame();
                } else {
                    card.abilityUsedThisTurn = true;
                }
            } else if (abilityEffect === 'sturdyPresence') {
                gameState.opponent.sturdyPresenceBonus = 20;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Sturdy Presence! AI's attacks this turn deal +20 damage!`);
                renderGame();
            } else if (abilityEffect === 'camouflage') {
                gameState.opponent.camouflageActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Camouflage! AI's bench creatures are protected from damage this turn!`);
                renderGame();
            }
            // Galactic Adventures "any" location abilities
            else if (abilityEffect === 'extraCharge') {
                // Extra Charge - attach energy to any Neutral creature
                const neutralCreatures = [];
                if (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Neutral') {
                    neutralCreatures.push(gameState.opponent.active);
                }
                gameState.opponent.bench.forEach(benchCard => {
                    if (benchCard && getCardType(benchCard.data) === 'Neutral') {
                        neutralCreatures.push(benchCard);
                    }
                });
                
                if (neutralCreatures.length > 0) {
                    const target = neutralCreatures[Math.floor(Math.random() * neutralCreatures.length)];
                    target.energy++;
                    card.abilityUsedThisTurn = true;
                    alert(`AI's ${card.data.name} used Extra Charge! Attached 1 energy to ${target.data.name}!`);
                    renderGame();
                }
            } else if (abilityEffect === 'retaliationStone') {
                // Retaliation Stone - if damaged by attack next turn, deals 20 damage back
                card.retaliationStoneActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Retaliation Stone! If damaged by an attack next turn, it deals 20 damage back!`);
                renderGame();
            } else if (abilityEffect === 'guardianMode') {
                // Guardian Mode - all AI creatures take 10 less damage
                gameState.opponent.guardianModeActive = true;
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Guardian Mode! All AI creatures take 10 less damage this turn!`);
                renderGame();
            } else if (abilityEffect === 'warriorMode') {
                // Warrior Mode - AI's attacks deal +10 damage this turn (FIXED: was 20)
                console.log("[DEBUG] AI Warrior Mode activated");
                console.log("[DEBUG] Before setting bonus, gameState.opponent.warriorModeBonus =", gameState.opponent.warriorModeBonus);
                gameState.opponent.warriorModeBonus = 10;
                console.log("[DEBUG] After setting bonus, gameState.opponent.warriorModeBonus =", gameState.opponent.warriorModeBonus);
                console.log("[DEBUG] AI active creature:", gameState.opponent.active?.data.name);
                card.abilityUsedThisTurn = true;
                alert(`AI's ${card.data.name} used Warrior Mode! AI's attacks this turn deal +10 damage!`);
                renderGame();
            }
        }
    });
}

// Turn management
function handleDone() {
    if (gameState.phase === 'setup') {
        if (gameState.player.active && gameState.setupReady.player && gameState.setupReady.opponent) {
            startGame();
        } else if (!gameState.player.active) {
            alert("You must place an active creature first!");
        }
    } else if (gameState.currentTurn === 'player') {
        endTurn();
    }
}

function endTurn() {
    // Decrement Power-Up counter for the player whose turn just ended
    const currentPlayer = gameState[gameState.currentTurn];
    if (currentPlayer.powerUpTurnsRemaining > 0 && currentPlayer.hasAttacked) {
        currentPlayer.powerUpTurnsRemaining--;
        if (currentPlayer.powerUpTurnsRemaining > 0) {
            alert(`Power-Up: ${currentPlayer.powerUpTurnsRemaining} turn${currentPlayer.powerUpTurnsRemaining > 1 ? 's' : ''} remaining!`);
        } else {
            alert("Power-Up effect has ended!");
        }
    }
    
    // Decrement Amulet counter for the player whose turn just ended (Galactic Adventures)
    if (currentPlayer.amuletTurnsRemaining > 0) {
        currentPlayer.amuletTurnsRemaining--;
        if (currentPlayer.amuletTurnsRemaining > 0) {
            alert(`Amulet: ${currentPlayer.amuletTurnsRemaining} turn${currentPlayer.amuletTurnsRemaining > 1 ? 's' : ''} remaining! (+20 damage for Neutral creatures)`);
        } else {
            alert("Amulet effect has ended!");
        }
    }
    
    // Reset cantRetreat flags for current player's active creature (effect lasts one turn)
    if (gameState[gameState.currentTurn].active) {
        gameState[gameState.currentTurn].active.cantRetreat = false;
    }
    
    // Remember who is ending their turn (for clearing effects AFTER the switch)
    const playerEndingTurn = gameState.currentTurn;
    const playerStartingNextTurn = gameState.currentTurn === 'player' ? 'opponent' : 'player';
    
    // Switch turns
    gameState.currentTurn = playerStartingNextTurn;
    
    // Clear Guardian Mode for the player whose turn just ENDED (they were protected during opponent's last turn)
    // Turn 5 player uses Guardian Mode (player.guardianModeActive = true)
    // Turn 6 opponent turn (player is protected from AI attacks)
    // Turn 6 ENDS → clear player.guardianModeActive
    // Turn 7 player turn (no longer protected)
    gameState[playerStartingNextTurn].guardianModeActive = false;
    
    // Increment turn counter at the start of each new turn
    gameState.turnNumber++;
    
    // Check if cantAttackNextTurn should be cleared based on turn number (for Wing Slap on individual creatures)
    // This happens AFTER turn increment so we check against the new turn number
    if (gameState[gameState.currentTurn].active && gameState[gameState.currentTurn].active.cantAttackNextTurn) {
        if (gameState.turnNumber >= gameState[gameState.currentTurn].active.cantAttackUntilTurn) {
            gameState[gameState.currentTurn].active.cantAttackNextTurn = false;
            delete gameState[gameState.currentTurn].active.cantAttackUntilTurn;
        }
    }
    
    // Check if player-level cantAttackNextTurn should be cleared (for Quick Reflexes on entire player)
    if (gameState[gameState.currentTurn].cantAttackNextTurn) {
        if (gameState.turnNumber >= gameState[gameState.currentTurn].cantAttackUntilTurn) {
            gameState[gameState.currentTurn].cantAttackNextTurn = false;
            delete gameState[gameState.currentTurn].cantAttackUntilTurn;
        }
    }
    
    // Decrement cantRetreatTurns ONLY for the player whose turn just ENDED (Tempest Hold effect)
    // This ensures the restriction counts down only during that player's own turns
    if (gameState[playerEndingTurn].active && gameState[playerEndingTurn].active.cantRetreatTurns > 0) {
        gameState[playerEndingTurn].active.cantRetreatTurns--;
        if (gameState[playerEndingTurn].active.cantRetreatTurns === 0) {
            const playerName = playerEndingTurn === 'player' ? '' : "AI's ";
            alert(`${playerName}${gameState[playerEndingTurn].active.data.name} can retreat again!`);
        }
    }
    gameState[playerEndingTurn].bench.forEach(card => {
        if (card && card.cantRetreatTurns > 0) {
            card.cantRetreatTurns--;
        }
    });
    
    // Decrement invincibleTurnsLeft ONLY for the player whose turn just ENDED (Invincible Gambit effect)
    // This ensures the opponent can't attack only during their own turns
    if (gameState[playerEndingTurn].invincibleTurnsLeft && gameState[playerEndingTurn].invincibleTurnsLeft > 0) {
        gameState[playerEndingTurn].invincibleTurnsLeft--;
        if (gameState[playerEndingTurn].invincibleTurnsLeft === 0) {
            const playerName = playerEndingTurn === 'player' ? 'You' : 'AI';
            alert(`${playerName} can attack again! Invincible Gambit effect has ended.`);
        } else {
            const playerName = playerEndingTurn === 'player' ? 'You' : 'AI';
            alert(`${playerName} cannot attack for ${gameState[playerEndingTurn].invincibleTurnsLeft} more turn(s)!`);
        }
    }
    
    // Check for turn limit
    if (gameState.turnNumber > 30) {
        endGameByTurnLimit();
        return;
    }
    
    // Reset turn-specific flags
    gameState.player.energyAttachedThisTurn = false;
    gameState.player.hasAttacked = false;
    gameState.player.itemUsedThisTurn = false;
    gameState.player.boosterActive = false;
    // Clear Flux check flags
    gameState.player.fluxCheckDoneThisTurn = false;
    gameState.player.fluxCheckPassedThisTurn = false;
    // Track item usage for Energy Siphon ability
    gameState.player.usedItemLastTurn = gameState.player.usedItemThisTurn || false;
    gameState.player.usedItemThisTurn = false;
    // Clear Aura of Strength bonus at end of turn
    gameState.player.auraOfStrengthBonus = 0;
    // Clear Sturdy Presence bonus at end of turn
    gameState.player.sturdyPresenceBonus = 0;
    // Clear turn-based ability effects (Clarity Aura and Camouflage protect for opponent's turn, so don't clear them here)
    // gameState.player.clarityAuraActive is cleared when player's next turn starts
    // gameState.player.camouflageActive is cleared when player's next turn starts
    gameState.player.rainbowStrikeActive = false;
    gameState.player.phaseShiftActive = false;
    // Note: cantAttackNextTurn is handled separately above based on turn number
    
    gameState.opponent.energyAttachedThisTurn = false;
    gameState.opponent.hasAttacked = false;
    gameState.opponent.itemUsedThisTurn = false;
    gameState.opponent.boosterActive = false;
    // Clear Flux check flags (opponent)
    gameState.opponent.fluxCheckDoneThisTurn = false;
    gameState.opponent.fluxCheckPassedThisTurn = false;
    // Track item usage for Energy Siphon ability
    gameState.opponent.usedItemLastTurn = gameState.opponent.usedItemThisTurn || false;
    gameState.opponent.usedItemThisTurn = false;
    // Clear Aura of Strength bonus at end of turn
    gameState.opponent.auraOfStrengthBonus = 0;
    // Clear Sturdy Presence bonus at end of turn
    gameState.opponent.sturdyPresenceBonus = 0;
    // Clear turn-based ability effects (Clarity Aura and Camouflage protect for opponent's turn, so don't clear them here)
    // gameState.opponent.clarityAuraActive is cleared when opponent's next turn starts
    // gameState.opponent.camouflageActive is cleared when opponent's next turn starts
    gameState.opponent.rainbowStrikeActive = false;
    gameState.opponent.phaseShiftActive = false;
    // Note: cantAttackNextTurn is handled separately above based on turn number
    
    // Clear Clarity Aura and Camouflage for the player whose turn is STARTING (they've been protected during opponent's turn)
    // This ensures: Turn 5 use ability → Turn 6 opponent attacks (protected) → Turn 7 starts (cleared)
    const playerStartingTurn = gameState.currentTurn;
    gameState[playerStartingTurn].clarityAuraActive = false;
    gameState[playerStartingTurn].camouflageActive = false;
    
    // Clear evolvedLastTurn for the player whose turn is STARTING (for Thunder Rush tracking)
    // This ensures: Turn 13 opponent evolves → Turn 14 player can use Thunder Rush → Turn 14 ends, Turn 15 starts (cleared)
    // The flag stays true through the OPPONENT player's turn so THEY can check if YOU evolved
    gameState[playerStartingTurn].evolvedLastTurn = false;
    
    // Note: Guardian Mode is cleared right after turn switch above
    
    // Clear Warrior Mode for the player whose turn just ENDED (Galactic Adventures)
    // Logic: Turn 5 use Warrior Mode → attack same turn (boosted) → Turn 6 starts (cleared)
    // Use playerEndingTurn which was declared earlier
    gameState[playerEndingTurn].warriorModeBonus = 0;
    
    // Clear Metalic Protection from the player whose turn is STARTING (Galactic Adventures)
    // Same logic: Turn 5 use ability → Turn 6 opponent attacks (protected) → Turn 7 starts (cleared)
    if (gameState[playerStartingTurn].active && gameState[playerStartingTurn].active.metalicProtectionActive) {
        gameState[playerStartingTurn].active.metalicProtectionActive = false;
    }
    gameState[playerStartingTurn].bench.forEach(card => {
        if (card && card.metalicProtectionActive) {
            card.metalicProtectionActive = false;
        }
    });
    
    // Clear Mirage Shield (cantUseItemsNextTurn) from the player whose turn just ENDED (Galactic Adventures)
    // Turn 5 player uses Mirage Shield (opponent.cantUseItemsNextTurn = true)
    // Turn 6 opponent can't use items (blocked)
    // Turn 6 ENDS → clear opponent.cantUseItemsNextTurn
    // Turn 7+ opponent can use items again
    gameState[playerEndingTurn].cantUseItemsNextTurn = false;
    
    // Clear Tidal Illusion (cantDealDamageNextTurn) from the player whose turn just ENDED
    // Turn 1 player uses Tidal Illusion (opponent.cantDealDamageNextTurn = true)
    // Turn 2 opponent can't deal damage (blocked during their entire turn)
    // Turn 2 ENDS → clear opponent.cantDealDamageNextTurn
    // Turn 3+ opponent can deal damage again
    gameState[playerEndingTurn].cantDealDamageNextTurn = false;
    
    // Reset ability used flags for all creatures
    if (gameState.player.active) gameState.player.active.abilityUsedThisTurn = false;
    gameState.player.bench.forEach(card => {
        if (card) card.abilityUsedThisTurn = false;
    });
    if (gameState.opponent.active) gameState.opponent.active.abilityUsedThisTurn = false;
    gameState.opponent.bench.forEach(card => {
        if (card) card.abilityUsedThisTurn = false;
    });
    
    // Decrement Overdrive Smash cooldown for all creatures (Galactic Adventures)
    if (gameState.player.active && gameState.player.active.cantUseOverdrive > 0) {
        gameState.player.active.cantUseOverdrive--;
        if (gameState.player.active.cantUseOverdrive === 0) {
            alert(`${gameState.player.active.data.name} can use Overdrive Smash again!`);
        }
    }
    gameState.player.bench.forEach(card => {
        if (card && card.cantUseOverdrive > 0) {
            card.cantUseOverdrive--;
        }
    });
    if (gameState.opponent.active && gameState.opponent.active.cantUseOverdrive > 0) {
        gameState.opponent.active.cantUseOverdrive--;
        if (gameState.opponent.active.cantUseOverdrive === 0) {
            alert(`AI's ${gameState.opponent.active.data.name} can use Overdrive Smash again!`);
        }
    }
    gameState.opponent.bench.forEach(card => {
        if (card && card.cantUseOverdrive > 0) {
            card.cantUseOverdrive--;
        }
    });
    
    // Decrement Sprout Boost countdown for all creatures (Galactic Adventures)
    if (gameState.player.active && gameState.player.active.sproutBoostTurns > 0) {
        gameState.player.active.sproutBoostTurns--;
        if (gameState.player.active.sproutBoostTurns === 0) {
            gameState.player.active.sproutBoostActive = true;
            alert(`${gameState.player.active.data.name}'s Sprout Boost is ready! Next attack deals +30 damage!`);
        }
    }
    gameState.player.bench.forEach(card => {
        if (card && card.sproutBoostTurns > 0) {
            card.sproutBoostTurns--;
            if (card.sproutBoostTurns === 0) {
                card.sproutBoostActive = true;
            }
        }
    });
    if (gameState.opponent.active && gameState.opponent.active.sproutBoostTurns > 0) {
        gameState.opponent.active.sproutBoostTurns--;
        if (gameState.opponent.active.sproutBoostTurns === 0) {
            gameState.opponent.active.sproutBoostActive = true;
            alert(`AI's ${gameState.opponent.active.data.name}'s Sprout Boost is ready! Next attack deals +30 damage!`);
        }
    }
    gameState.opponent.bench.forEach(card => {
        if (card && card.sproutBoostTurns > 0) {
            card.sproutBoostTurns--;
            if (card.sproutBoostTurns === 0) {
                card.sproutBoostActive = true;
            }
        }
    });
    
    // Clear turn tracker
    turnTracker.playedThisTurn.clear();
    turnTracker.evolvedThisTurn.clear();
    turnTracker.evolvedIds.clear();
    
    // Draw card at start of turn
    drawCards(gameState.currentTurn, 1);
    
    renderGame();
    
    // AI turn
    if (gameState.currentTurn === 'opponent') {
        setTimeout(aiTurn, 1500);
    }
}

function endGameByTurnLimit() {
    const playerPoints = gameState.player.points;
    const opponentPoints = gameState.opponent.points;
    
    if (playerPoints > opponentPoints) {
        endGame('player');
    } else if (opponentPoints > playerPoints) {
        endGame('opponent');
    } else {
        endGame('tie');
    }
}

function endGame(winner) {
    gameState.phase = 'gameOver';
    
    let message;
    let result; // 'win' or 'loss'
    
    if (winner === 'tie') {
        message = "Game Over! It's a tie!";
        result = 'tie';
    } else if (winner === 'player') {
        message = "You Win!";
        result = 'win';
    } else {
        message = "Opponent Wins!";
        result = 'loss';
    }
    
    // Save win/loss record to leaderboard
    if (result !== 'tie' && window.parent && window.parent.saveGameScore) {
        window.parent.saveGameScore("TCG Game", {
            result: result,
            playerDeck: deckTemplates[gameState.player.selectedDeck].name,
            opponentDeck: deckTemplates[gameState.opponent.selectedDeck].name
        }).then((saveResult) => {
            console.log("TCG Game result saved successfully");
            if (saveResult && saveResult.isNewBest && window.parent.showNewBestScore) {
                window.parent.showNewBestScore("TCG Game", { result: result });
            }
        }).catch(err => {
            console.error("Error saving TCG Game result:", err);
        });
    }
    
    alert(message);
    renderGame();
}

function resetAndStartNewGame() {
    // Reset game state completely
    gameState.player = {
        deck: [],
        hand: [],
        active: null,
        bench: [null, null, null],
        points: 0,
        energyAttachedThisTurn: false,
        hasAttacked: false,
        itemUsedThisTurn: false,
        discardPile: [],
        selectedDeck: null,
        boosterActive: false,
        powerUpTurnsRemaining: 0,
        monksFuryShield: false
    };
    gameState.opponent = {
        deck: [],
        hand: [],
        active: null,
        bench: [null, null, null],
        points: 0,
        energyAttachedThisTurn: false,
        hasAttacked: false,
        itemUsedThisTurn: false,
        discardPile: [],
        selectedDeck: null,
        boosterActive: false,
        powerUpTurnsRemaining: 0,
        monksFuryShield: false
    };
    gameState.currentTurn = null;
    gameState.turnNumber = 0;
    gameState.phase = 'deckSelection';
    gameState.selectedCard = null;
    gameState.selectedSlot = null;
    gameState.waitingForSelection = false;
    gameState.setupReady = {player: false, opponent: false};
    
    turnTracker.playedThisTurn.clear();
    turnTracker.evolvedThisTurn.clear();
    
    // Hide game screen, show deck selection
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('deck-selection').style.display = 'block';
    
    // Restart from deck selection
    showDeckSelection();
}

// AI Turn
function aiTurn() {
    if (gameState.currentTurn !== 'opponent' || gameState.phase === 'gameOver') return;
    
    // 1. Check if active creature should retreat (low HP and has better options on bench)
    aiConsiderRetreat();
    
    if (gameState.phase === 'gameOver') return;
    
    setTimeout(() => {
        // 2. Try to use item cards
        aiUseItems(() => {
            if (gameState.phase === 'gameOver') return;
            
            setTimeout(() => {
                // 3. Play Stage 1 cards to bench
                aiPlayStage1ToBench();
                
                if (gameState.phase === 'gameOver') return;
                
                setTimeout(() => {
                    // 4. Try to evolve creatures (keep trying until no more evolutions possible)
                    aiEvolveAll();
                    
                    if (gameState.phase === 'gameOver') return;
                    
                    setTimeout(() => {
                        // 5. Attach energy
                        aiAttachEnergy();
                        
                        if (gameState.phase === 'gameOver') return;
                        
                        setTimeout(() => {
                            // 6. Use abilities
                            aiUseAbilities();
                            
                            if (gameState.phase === 'gameOver') return;
                            
                            setTimeout(() => {
                                // 7. Attack if possible
                                if (aiCanAttack()) {
                                    aiAttack();
                                    // Attack ends turn automatically
                                } else {
                                    // End turn
                                    endTurn();
                                }
                            }, 1000);
                        }, 1000);
                    }, 1000);
                }, 1000);
            }, 1000);
        });
    }, 1000);
}

function aiConsiderRetreat() {
    const active = gameState.opponent.active;
    
    if (!active) return;
    
    // Check if active creature is low on HP (below 40% or less than 30 HP remaining)
    const hpRemaining = active.data.hp - active.damage;
    const hpPercent = hpRemaining / active.data.hp;
    const isLowHP = hpPercent < 0.4 || hpRemaining < 30;
    
    if (!isLowHP) return;
    
    // Check if active can retreat (has enough energy)
    if (active.energy < active.data.retreat) return;
    
    // Find a bench creature that can attack
    let bestBenchIndex = -1;
    let bestBenchScore = -1;
    
    for (let i = 0; i < gameState.opponent.bench.length; i++) {
        const benchCard = gameState.opponent.bench[i];
        if (!benchCard) continue;
        
        // Check if bench creature can attack
        const move1Cost = benchCard.data.move1Cost;
        if (!move1Cost) continue;
        
        const canAttack = benchCard.energy >= move1Cost.length;
        if (!canAttack) continue;
        
        // Calculate score: prefer creatures with more HP and higher attack potential
        const benchHpRemaining = benchCard.data.hp - benchCard.damage;
        const benchHpPercent = benchHpRemaining / benchCard.data.hp;
        const attackPower = benchCard.data.move1Damage || 0;
        
        // Score based on HP percentage and attack power
        const score = benchHpPercent * 100 + attackPower;
        
        if (score > bestBenchScore) {
            bestBenchScore = score;
            bestBenchIndex = i;
        }
    }
    
    // If we found a good bench creature to swap with, retreat
    if (bestBenchIndex !== -1) {
        console.log(`AI retreating ${active.data.name} (${hpRemaining}/${active.data.hp} HP) for ${gameState.opponent.bench[bestBenchIndex].data.name}`);
        
        // Check if active has Healing Retreat ability and use it before retreating
        if (active.data.abilityEffect && 
            (active.data.abilityEffect === 'healingRetreat1' || active.data.abilityEffect === 'healingRetreat2') &&
            !active.abilityUsedThisTurn) {
            const healAmount = active.data.abilityEffect === 'healingRetreat1' ? 20 : 40;
            active.healingRetreatAmount = healAmount;
            active.abilityUsedThisTurn = true;
            alert(`AI's ${active.data.name} used Healing Retreat before retreating!`);
        }
        
        // Remove retreat cost energy
        active.energy -= active.data.retreat;
        
        // Clear ALL status conditions when moving to bench (centralized)
        const hadStatus = StatusConditionManager.getAllStatus(active).length > 0;
        StatusConditionManager.clearAllStatus(active);
        if (hadStatus) {
            alert(`AI's ${active.data.name}'s status conditions cleared!`);
        }
        
        // Check for Healing Retreat ability
        if (active.healingRetreatAmount) {
            const healAmount = active.healingRetreatAmount;
            healCreature(active, healAmount);
            alert(`AI's ${active.data.name}'s Healing Retreat activated! Healed ${healAmount} HP!`);
            active.healingRetreatAmount = 0; // Clear the flag after use
        }
        
        // Swap active with bench
        const temp = gameState.opponent.active;
        gameState.opponent.active = gameState.opponent.bench[bestBenchIndex];
        gameState.opponent.bench[bestBenchIndex] = temp;
        
        renderGame();
        alert(`AI retreated ${temp.data.name} to the bench!`);
    }
}

function aiPlayStage1ToBench() {
    // Find all Stage 1 cards in hand
    const stage1Cards = gameState.opponent.hand.filter(card => card.data.stage === "Stage 1");
    
    // Find empty bench slots
    for (let i = 0; i < gameState.opponent.bench.length; i++) {
        if (!gameState.opponent.bench[i] && stage1Cards.length > 0) {
            // Play the first Stage 1 to this bench slot
            const card = stage1Cards.shift();
            const handIndex = gameState.opponent.hand.indexOf(card);
            gameState.opponent.bench[i] = card;
            gameState.opponent.hand.splice(handIndex, 1);
            turnTracker.playedThisTurn.add(card);
        }
    }
    
    renderGame();
}

function aiEvolveAll() {
    // Keep trying to evolve until no more evolutions are possible
    let evolved = false;
    
    do {
        evolved = aiTryEvolveOnce();
    } while (evolved);
}

function aiTryEvolveOnce() {
    // Can't evolve before turn 3
    if (gameState.turnNumber < 3) return false;
    
    // Check hand for evolution cards
    for (let i = gameState.opponent.hand.length - 1; i >= 0; i--) {
        const card = gameState.opponent.hand[i];
        
        if (card.data.stage === "Stage 1") continue;
        if (card.data.stage === "Item") continue;
        
        // Try to evolve active
        if (gameState.opponent.active && canEvolve(gameState.opponent.active, card, 'active', null)) {
            const targetCard = gameState.opponent.active;
            card.damage = targetCard.damage;
            card.energy = targetCard.energy;
            card.evolutionId = targetCard.evolutionId || Math.random().toString(36).substr(2, 9);
            
            // Build evolution chain
            card.evolutionChain = targetCard.evolutionChain || [];
            card.evolutionChain.push({
                id: targetCard.id,
                data: targetCard.data
            });
            
            gameState.opponent.active = card;
            gameState.opponent.hand.splice(i, 1);
            turnTracker.evolvedThisTurn.add(card);
            if (card.evolutionId) {
                turnTracker.evolvedIds.add(card.evolutionId);
            }
            
            // Set evolvedLastTurn flag for Thunder Rush ability tracking
            gameState.opponent.evolvedLastTurn = true;
            
            renderGame();
            return true;
        }
        
        // Try to evolve bench
        for (let j = 0; j < gameState.opponent.bench.length; j++) {
            const benchCard = gameState.opponent.bench[j];
            if (benchCard && canEvolve(benchCard, card, 'bench', j)) {
                card.damage = benchCard.damage;
                card.energy = benchCard.energy;
                card.evolutionId = benchCard.evolutionId || Math.random().toString(36).substr(2, 9);
                
                // Build evolution chain
                card.evolutionChain = benchCard.evolutionChain || [];
                card.evolutionChain.push({
                    id: benchCard.id,
                    data: benchCard.data
                });
                
                gameState.opponent.bench[j] = card;
                gameState.opponent.hand.splice(i, 1);
                turnTracker.evolvedThisTurn.add(card);
                if (card.evolutionId) {
                    turnTracker.evolvedIds.add(card.evolutionId);
                }
                
                // Set evolvedLastTurn flag for Thunder Rush ability tracking
                gameState.opponent.evolvedLastTurn = true;
                
                renderGame();
                return true;
            }
        }
    }
    
    return false;
}

function aiUseItems(callback) {
    // Check if AI has any item cards and hasn't used one this turn
    if (gameState.opponent.itemUsedThisTurn || gameState.phase === 'gameOver') {
        callback();
        return;
    }
    
    // Check if Mirage Shield is active (player used it last turn)
    if (gameState.opponent.cantUseItemsNextTurn) {
        callback();
        return;
    }
    
    // Use Remedy if active creature has special conditions
    if (gameState.opponent.active && gameState.opponent.active.hallucinating) {
        const remedyIndex = gameState.opponent.hand.findIndex(card => card && card.data && card.data.name === "Remedy");
        if (remedyIndex !== -1) {
            const remedy = gameState.opponent.hand[remedyIndex];
            flashItemCard(remedy.id, () => {
                if (gameState.phase === 'gameOver') return;
                gameState.opponent.active.hallucinating = false;
                gameState.opponent.active.hallucinationFlip = null;
                gameState.opponent.discardPile.push(remedy);
                gameState.opponent.hand.splice(remedyIndex, 1);
                gameState.opponent.itemUsedThisTurn = true;
                gameState.opponent.usedItemThisTurn = true; // Track for Energy Siphon
                renderGame();
                callback();
            });
            return;
        }
    }
    
    // Find potion if active creature is damaged
    if (gameState.opponent.active && gameState.opponent.active.damage > 0) {
        const potionIndex = gameState.opponent.hand.findIndex(card => card && card.data && card.data.name === "Potion");
        if (potionIndex !== -1) {
            const potion = gameState.opponent.hand[potionIndex];
            flashItemCard(potion.id, () => {
                if (gameState.phase === 'gameOver') return;
                healCreature(gameState.opponent.active, 20);
                gameState.opponent.discardPile.push(potion);
                gameState.opponent.hand.splice(potionIndex, 1);
                gameState.opponent.itemUsedThisTurn = true;
                gameState.opponent.usedItemThisTurn = true; // Track for Energy Siphon
                renderGame();
                callback();
            });
            return;
        }
    }
    
    // Use Booster ONLY if AI can attack this turn
    const boosterIndex = gameState.opponent.hand.findIndex(card => card && card.data && card.data.name === "Booster");
    if (boosterIndex !== -1 && aiCanAttack()) {
        const booster = gameState.opponent.hand[boosterIndex];
        flashItemCard(booster.id, () => {
            if (gameState.phase === 'gameOver') return;
            gameState.opponent.boosterActive = true;
            gameState.opponent.discardPile.push(booster);
            gameState.opponent.hand.splice(boosterIndex, 1);
            gameState.opponent.itemUsedThisTurn = true;
            gameState.opponent.usedItemThisTurn = true; // Track for Energy Siphon
            renderGame();
            callback();
        });
        return;
    }
    
    // Use Power-Up ONLY if AI can attack this turn and doesn't already have it active
    const powerUpIndex = gameState.opponent.hand.findIndex(card => card.data.name === "Power-Up");
    if (powerUpIndex !== -1 && aiCanAttack() && gameState.opponent.powerUpTurnsRemaining === 0) {
        const powerUp = gameState.opponent.hand[powerUpIndex];
        flashItemCard(powerUp.id, () => {
            if (gameState.phase === 'gameOver') return;
            gameState.opponent.powerUpTurnsRemaining = 3;
            gameState.opponent.discardPile.push(powerUp);
            gameState.opponent.hand.splice(powerUpIndex, 1);
            gameState.opponent.itemUsedThisTurn = true;
            gameState.opponent.usedItemThisTurn = true; // Track for Energy Siphon
            renderGame();
            callback();
        });
        return;
    }
    
    // Use Card Draw if available
    const cardDrawIndex = gameState.opponent.hand.findIndex(card => card.data.name === "Card Draw");
    if (cardDrawIndex !== -1) {
        const cardDraw = gameState.opponent.hand[cardDrawIndex];
        flashItemCard(cardDraw.id, () => {
            if (gameState.phase === 'gameOver') return;
            drawCards('opponent', 2);
            gameState.opponent.discardPile.push(cardDraw);
            gameState.opponent.hand.splice(cardDrawIndex, 1);
            gameState.opponent.itemUsedThisTurn = true;
            gameState.opponent.usedItemThisTurn = true; // Track for Energy Siphon
            renderGame();
            callback();
        });
        return;
    }
    
    // Galactic Adventures Items
    
    // Use Energy Antenna if AI has Mechanic creatures
    const energyAntennaIndex = gameState.opponent.hand.findIndex(card => card.data.name === "Energy Antenna");
    if (energyAntennaIndex !== -1) {
        const mechanicCreatures = [];
        if (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Mechanic') {
            mechanicCreatures.push(gameState.opponent.active);
        }
        gameState.opponent.bench.forEach(card => {
            if (card && getCardType(card.data) === 'Mechanic') {
                mechanicCreatures.push(card);
            }
        });
        
        if (mechanicCreatures.length > 0) {
            const energyAntenna = gameState.opponent.hand[energyAntennaIndex];
            flashItemCard(energyAntenna.id, () => {
                if (gameState.phase === 'gameOver') return;
                // Attach to first Mechanic creature
                mechanicCreatures[0].energy++;
                gameState.opponent.discardPile.push(energyAntenna);
                gameState.opponent.hand.splice(energyAntennaIndex, 1);
                gameState.opponent.itemUsedThisTurn = true;
                gameState.opponent.usedItemThisTurn = true;
                renderGame();
                callback();
            });
            return;
        }
    }
    
    // Use Revive Crystal if AI has creatures in discard pile
    const reviveCrystalIndex = gameState.opponent.hand.findIndex(card => card.data.name === "Revive Crystal");
    if (reviveCrystalIndex !== -1) {
        const creatureCards = gameState.opponent.discardPile.filter(c => c.data.stage !== 'Item');
        if (creatureCards.length > 0) {
            const reviveCrystal = gameState.opponent.hand[reviveCrystalIndex];
            flashItemCard(reviveCrystal.id, () => {
                if (gameState.phase === 'gameOver') return;
                // Take first creature card
                const revivedCard = creatureCards[0];
                const index = gameState.opponent.discardPile.indexOf(revivedCard);
                gameState.opponent.discardPile.splice(index, 1);
                
                // Reset the creature completely
                revivedCard.damage = 0;
                revivedCard.energy = 0;
                revivedCard.hallucinating = false;
                revivedCard.hallucinationFlip = null;
                revivedCard.hasFlux = false;
                revivedCard.hasLock = false;
                revivedCard.cantRetreat = false;
                revivedCard.cantAttackNextTurn = false;
                revivedCard.cantAttackUntilTurn = null;
                revivedCard.abilityUsedThisTurn = false;
                revivedCard.cantUseOverdrive = 0;
                revivedCard.mindRippleShield = false;
                revivedCard.cottonGuardShield = false;
                revivedCard.chillRechargeBonus = null;
                revivedCard.metalicProtectionActive = false;
                
                gameState.opponent.hand.push(revivedCard);
                gameState.opponent.discardPile.push(reviveCrystal);
                gameState.opponent.hand.splice(reviveCrystalIndex, 1);
                gameState.opponent.itemUsedThisTurn = true;
                gameState.opponent.usedItemThisTurn = true;
                renderGame();
                callback();
            });
            return;
        }
    }
    
    // Use Healing Crystal if AI has damaged Celestial creatures
    const healingCrystalIndex = gameState.opponent.hand.findIndex(card => card.data.name === "Healing Crystal");
    if (healingCrystalIndex !== -1) {
        const celestialCreatures = [];
        if (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Celestial' && gameState.opponent.active.damage > 0) {
            celestialCreatures.push(gameState.opponent.active);
        }
        gameState.opponent.bench.forEach(card => {
            if (card && getCardType(card.data) === 'Celestial' && card.damage > 0) {
                celestialCreatures.push(card);
            }
        });
        
        if (celestialCreatures.length > 0) {
            const healingCrystal = gameState.opponent.hand[healingCrystalIndex];
            flashItemCard(healingCrystal.id, () => {
                if (gameState.phase === 'gameOver') return;
                // Heal first damaged Celestial
                healCreature(celestialCreatures[0], 40);
                gameState.opponent.discardPile.push(healingCrystal);
                gameState.opponent.hand.splice(healingCrystalIndex, 1);
                gameState.opponent.itemUsedThisTurn = true;
                gameState.opponent.usedItemThisTurn = true;
                renderGame();
                callback();
            });
            return;
        }
    }
    
    // Use Aura Crystal if AI has any damaged creatures
    const auraCrystalIndex = gameState.opponent.hand.findIndex(card => card.data.name === "Aura Crystal");
    if (auraCrystalIndex !== -1) {
        let hasDamagedCreature = false;
        if (gameState.opponent.active && gameState.opponent.active.damage > 0) hasDamagedCreature = true;
        gameState.opponent.bench.forEach(card => {
            if (card && card.damage > 0) hasDamagedCreature = true;
        });
        
        if (hasDamagedCreature) {
            const auraCrystal = gameState.opponent.hand[auraCrystalIndex];
            flashItemCard(auraCrystal.id, () => {
                if (gameState.phase === 'gameOver') return;
                // Heal all damaged creatures by 10
                if (gameState.opponent.active && gameState.opponent.active.damage > 0) {
                    healCreature(gameState.opponent.active, 10);
                }
                gameState.opponent.bench.forEach(card => {
                    if (card && card.damage > 0) {
                        healCreature(card, 10);
                    }
                });
                gameState.opponent.discardPile.push(auraCrystal);
                gameState.opponent.hand.splice(auraCrystalIndex, 1);
                gameState.opponent.itemUsedThisTurn = true;
                gameState.opponent.usedItemThisTurn = true;
                renderGame();
                callback();
            });
            return;
        }
    }
    
    // Use Amulet if AI has Neutral creatures and can attack
    const amuletIndex = gameState.opponent.hand.findIndex(card => card.data.name === "Amulet");
    if (amuletIndex !== -1 && aiCanAttack() && gameState.opponent.amuletTurnsRemaining === 0) {
        const hasNeutral = (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Neutral') ||
            gameState.opponent.bench.some(card => card && getCardType(card.data) === 'Neutral');
        
        if (hasNeutral) {
            const amulet = gameState.opponent.hand[amuletIndex];
            flashItemCard(amulet.id, () => {
                if (gameState.phase === 'gameOver') return;
                gameState.opponent.amuletTurnsRemaining = 2;
                gameState.opponent.discardPile.push(amulet);
                gameState.opponent.hand.splice(amuletIndex, 1);
                gameState.opponent.itemUsedThisTurn = true;
                gameState.opponent.usedItemThisTurn = true;
                renderGame();
                callback();
            });
            return;
        }
    }
    
    // Use Shield Barrier if AI can be attacked soon
    const shieldBarrierIndex = gameState.opponent.hand.findIndex(card => card && card.data && card.data.name === "Shield Barrier");
    if (shieldBarrierIndex !== -1 && gameState.opponent.active) {
        const shieldBarrier = gameState.opponent.hand[shieldBarrierIndex];
        flashItemCard(shieldBarrier.id, () => {
            if (gameState.phase === 'gameOver') return;
            gameState.opponent.shieldBarrierActive = 20;
            gameState.opponent.discardPile.push(shieldBarrier);
            gameState.opponent.hand.splice(shieldBarrierIndex, 1);
            gameState.opponent.itemUsedThisTurn = true;
            gameState.opponent.usedItemThisTurn = true;
            renderGame();
            callback();
        });
        return;
    }
    
    // Use Gale Shield if AI has Wind creatures
    const galeShieldIndex = gameState.opponent.hand.findIndex(card => card && card.data && card.data.name === "Gale Shield");
    if (galeShieldIndex !== -1) {
        const hasWind = (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Wind') ||
            gameState.opponent.bench.some(card => card && getCardType(card.data) === 'Wind');
        
        if (hasWind) {
            const galeShield = gameState.opponent.hand[galeShieldIndex];
            flashItemCard(galeShield.id, () => {
                if (gameState.phase === 'gameOver') return;
                gameState.opponent.galeShieldActive = 30;
                gameState.opponent.discardPile.push(galeShield);
                gameState.opponent.hand.splice(galeShieldIndex, 1);
                gameState.opponent.itemUsedThisTurn = true;
                gameState.opponent.usedItemThisTurn = true;
                renderGame();
                callback();
            });
            return;
        }
    }
    
    // Use Disruptor if player has cards in hand
    const disruptorIndex = gameState.opponent.hand.findIndex(card => card && card.data && card.data.name === "Disruptor");
    if (disruptorIndex !== -1 && gameState.player.hand.length > 0) {
        const disruptor = gameState.opponent.hand[disruptorIndex];
        flashItemCard(disruptor.id, () => {
            if (gameState.phase === 'gameOver') return;
            const playerHandSize = gameState.player.hand.length;
            
            // Extract card IDs from player's hand (hand contains objects, deck contains IDs)
            // Filter out any cards without valid IDs
            const cardIds = gameState.player.hand
                .filter(card => card && card.id)
                .map(card => card.id);
            
            // Shuffle player's hand back into deck
            gameState.player.deck.push(...cardIds);
            gameState.player.hand = [];
            shuffleDeck(gameState.player.deck);
            
            // Draw cards (original count minus 1)
            const drawCount = Math.max(0, playerHandSize - 1);
            for (let i = 0; i < drawCount && gameState.player.deck.length > 0; i++) {
                const cardId = gameState.player.deck.pop();
                const cardData = getCardData(cardId);
                if (cardData) {
                    gameState.player.hand.push({id: cardId, data: cardData, energy: 0, damage: 0, abilityUsedThisTurn: false});
                } else {
                    console.error('Card data not found for ID:', cardId);
                }
            }
            
            gameState.opponent.discardPile.push(disruptor);
            gameState.opponent.hand.splice(disruptorIndex, 1);
            gameState.opponent.itemUsedThisTurn = true;
            gameState.opponent.usedItemThisTurn = true;
            renderGame();
            callback();
        });
        return;
    }
    
    // Use Mystic Scroll if AI needs a Mystic Stage 1 creature
    const mysticScrollIndex = gameState.opponent.hand.findIndex(card => card && card.data && card.data.name === "Mystic Scroll");
    if (mysticScrollIndex !== -1) {
        const mysticStage1InDeck = gameState.opponent.deck.some(cardId => {
            const cardData = getCardData(cardId);
            return cardData && cardData.stage === 'Stage 1' && getCardType(cardData) === 'Mystic';
        });
        
        if (mysticStage1InDeck) {
            const mysticScroll = gameState.opponent.hand[mysticScrollIndex];
            flashItemCard(mysticScroll.id, () => {
                if (gameState.phase === 'gameOver') return;
                
                // Find first Mystic Stage 1 in deck
                const mysticIndex = gameState.opponent.deck.findIndex(cardId => {
                    const cardData = getCardData(cardId);
                    return cardData && cardData.stage === 'Stage 1' && getCardType(cardData) === 'Mystic';
                });
                
                if (mysticIndex !== -1) {
                    const cardId = gameState.opponent.deck[mysticIndex];
                    const cardData = getCardData(cardId);
                    gameState.opponent.hand.push({id: cardId, data: cardData, energy: 0, damage: 0, abilityUsedThisTurn: false});
                    gameState.opponent.deck.splice(mysticIndex, 1);
                }
                
                gameState.opponent.discardPile.push(mysticScroll);
                gameState.opponent.hand.splice(mysticScrollIndex, 1);
                gameState.opponent.itemUsedThisTurn = true;
                gameState.opponent.usedItemThisTurn = true;
                renderGame();
                callback();
            });
            return;
        }
    }
    
    callback();
}

function aiAttachEnergy() {
    if (gameState.opponent.energyAttachedThisTurn) return;
    
    const active = gameState.opponent.active;
    
    // Check if AI's active creature has Flux condition
    if (active && StatusConditionManager.hasStatus(active, 'flux')) {
        // Check if AI already flipped coins for Flux this turn
        if (!gameState.opponent.fluxCheckDoneThisTurn) {
            alert(`AI's ${active.data.name} is affected by Flux! Flipping 2 coins...`);
            const flip1 = flipCoin();
            const flip2 = flipCoin();
            alert(`Coin 1: ${flip1}, Coin 2: ${flip2}`);
            
            gameState.opponent.fluxCheckDoneThisTurn = true;
            
            if (flip1 === 'tails' && flip2 === 'tails') {
                alert("Both coins were tails! AI cannot attach energy this turn due to Flux.");
                gameState.opponent.energyAttachedThisTurn = true; // Block energy attachment
                return;
            } else {
                alert("At least one coin was heads! AI can attach energy.");
                gameState.opponent.fluxCheckPassedThisTurn = true;
            }
        } else if (!gameState.opponent.fluxCheckPassedThisTurn) {
            // Already failed Flux check this turn
            return;
        }
    }
    
    // Check if active has enough energy for all moves
    if (active) {
        let maxEnergyCost = 0;
        
        if (active.data.move1Cost) {
            maxEnergyCost = Math.max(maxEnergyCost, active.data.move1Cost.length);
        }
        if (active.data.move2Cost) {
            maxEnergyCost = Math.max(maxEnergyCost, active.data.move2Cost.length);
        }
        
        // If active already has enough energy, attach to bench instead
        if (active.energy >= maxEnergyCost) {
            // Find first bench creature
            for (let i = 0; i < gameState.opponent.bench.length; i++) {
                if (gameState.opponent.bench[i]) {
                    gameState.opponent.bench[i].energy++;
                    gameState.opponent.energyAttachedThisTurn = true;
                    renderGame();
                    return;
                }
            }
        }
        
        // Otherwise attach to active
        active.energy++;
        gameState.opponent.energyAttachedThisTurn = true;
    } else if (gameState.opponent.bench[0]) {
        gameState.opponent.bench[0].energy++;
        gameState.opponent.energyAttachedThisTurn = true;
    }
    
    renderGame();
}

function aiCanAttack() {
    const attacker = gameState.opponent.active;
    if (!attacker) return false;
    
    // Check if blocked by Wing Slap or Quick Reflexes
    if (attacker.cantAttackNextTurn) return false;
    if (gameState.opponent.cantAttackNextTurn) return false;
    
    // Check if has Move 1 and enough energy for it
    const move1Cost = attacker.data.move1Cost;
    if (move1Cost && attacker.energy >= move1Cost.length) {
        return true;
    }
    
    // Check if has Move 2 and enough energy for it
    const move2Cost = attacker.data.move2Cost;
    if (move2Cost && attacker.energy >= move2Cost.length) {
        return true;
    }
    
    // Can't afford either move
    return false;
}

function aiAttack() {
    const attacker = gameState.opponent.active;
    const defender = gameState.player.active;
    
    if (!attacker || !defender) return;
    
    // Check if AI is affected by Invincible Gambit
    if (gameState.opponent.invincibleTurnsLeft && gameState.opponent.invincibleTurnsLeft > 0) {
        alert(`AI cannot attack! Invincible Gambit prevents them from attacking for ${gameState.opponent.invincibleTurnsLeft} more turn(s)!`);
        setTimeout(() => endTurn(), 500);
        return;
    }
    
    // Check if AI can't attack this turn due to Quick Reflexes
    if (gameState.opponent.cantAttackNextTurn) {
        alert(`AI can't attack this turn due to Quick Reflexes effect!`);
        setTimeout(() => endTurn(), 500);
        return;
    }
    
    // Check if attacker can't attack this turn due to Wing Slap
    if (attacker.cantAttackNextTurn) {
        alert(`AI's ${attacker.data.name} can't attack this turn due to Wing Slap effect!`);
        setTimeout(() => endTurn(), 500);
        return;
    }
    
    // Check if attacker is hallucinating
    if (StatusConditionManager.hasStatus(attacker, 'hallucination')) {
        const flip = flipCoin();
        alert(`AI's ${attacker.data.name} is hallucinating! Coin flip: ${flip}!`);
        if (flip === 'heads') {
            alert(`Hallucination: AI's ${attacker.data.name} will deal 10 extra damage!`);
        } else {
            alert(`Hallucination: AI's ${attacker.data.name} will deal 40 damage to itself!`);
        }
        // Store the flip result to apply later
        attacker.hallucinationFlip = flip;
    }
    
    // Choose move: AI prefers Move 2 if affordable and better than Move 1
    let damage = 0;
    let effect = null;
    let moveNumber = 1;
    
    const canUseMove1 = attacker.data.move1Cost && attacker.energy >= attacker.data.move1Cost.length;
    const canUseMove2 = attacker.data.move2Cost && attacker.energy >= attacker.data.move2Cost.length;
    
    if (canUseMove2 && canUseMove1) {
        // Both moves available - prefer Move 2 unless Move 1 is clearly better
        // Move 2 is preferred by default (usually more powerful)
        damage = attacker.data.move2Damage;
        effect = attacker.data.move2Effect;
        moveNumber = 2;
        console.log("AI chose move 2 (both available):", attacker.data.move2Name, "damage:", damage, "effect:", effect);
    } else if (canUseMove2) {
        // Only Move 2 affordable
        damage = attacker.data.move2Damage;
        effect = attacker.data.move2Effect;
        moveNumber = 2;
        console.log("AI chose move 2 (only option):", attacker.data.move2Name, "damage:", damage, "effect:", effect);
    } else if (canUseMove1) {
        // Only Move 1 affordable
        damage = attacker.data.move1Damage;
        effect = attacker.data.move1Effect;
        moveNumber = 1;
        console.log("AI chose move 1 (only option):", attacker.data.move1Name, "damage:", damage, "effect:", effect);
    } else {
        // This shouldn't happen (aiCanAttack should prevent this)
        console.error("AI tried to attack but can't afford any moves!");
        setTimeout(() => endTurn(), 500);
        return;
    }
    
    // Handle special damage calculation effects
    let infernoWingFlip = null; // Store the flip result for infernoWing
    
    if (effect === 'dizzyShot') {
        const flip = flipCoin();
        alert(`AI's Dizzy Shot: Coin flip result: ${flip}!`);
        if (flip === 'heads') {
            damage += 20;
            alert(`Coin was heads! Dizzy Shot deals ${damage} damage!`);
        } else {
            alert(`Coin was tails! Dizzy Shot deals ${damage} damage.`);
        }
    } else if (effect === 'infernoWing') {
        infernoWingFlip = flipCoin();
        alert(`AI's Inferno Wing: Coin flip result: ${infernoWingFlip}!`);
        if (infernoWingFlip === 'tails') {
            alert(`Coin was tails! Inferno Wing will deal 20 damage to ${attacker.data.name} after the attack!`);
        } else {
            alert(`Coin was heads! No self-damage.`);
        }
    } else if (effect === 'galeFlip') {
        let headsCount = 0;
        let results = [];
        for (let i = 0; i < 4; i++) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') headsCount++;
        }
        damage = headsCount * 40;
        alert(`AI's Gale Flip: Flipped 4 coins - ${results.join(', ')}!\nGot ${headsCount} heads! Deals ${damage} damage!`);
    } else if (effect === 'coinClash') {
        const flip = flipCoin();
        alert(`AI's Coin Clash: Coin flip result: ${flip}!`);
        if (flip === 'heads') {
            damage = 30;
            alert(`Coin was heads! Coin Clash deals 30 damage!`);
        } else {
            damage = 0;
            alert(`Coin was tails! Coin Clash deals no damage.`);
        }
    } else if (effect === 'diceFury') {
        const roll = rollDice();
        damage = roll * 10;
        alert(`AI's Dice Fury: Rolled a ${roll}! Deals ${damage} damage!`);
    } else if (effect === 'diceTempest') {
        const roll = rollDice();
        damage = roll * 20;
        alert(`AI's Dice Tempest: Rolled a ${roll}! Deals ${damage} damage!`);
    } else if (effect === 'neutralSurge') {
        let neutralCount = 0;
        // Count player's neutral creatures
        if (gameState.player.active && getCardType(gameState.player.active.data) === 'Neutral') neutralCount++;
        gameState.player.bench.forEach(card => {
            if (card && getCardType(card.data) === 'Neutral') neutralCount++;
        });
        // Count opponent's neutral creatures
        if (gameState.opponent.active && getCardType(gameState.opponent.active.data) === 'Neutral') neutralCount++;
        gameState.opponent.bench.forEach(card => {
            if (card && getCardType(card.data) === 'Neutral') neutralCount++;
        });
        damage = neutralCount * 20;
        alert(`AI's Neutral Surge: Found ${neutralCount} Neutral creatures in play! Deals ${damage} damage!`);
    } else if (effect === 'nightStrike') {
        // Night Strike - 20 damage per energy attached to attacker
        damage = attacker.energy * 20;
        alert(`AI's Night Strike: ${attacker.data.name} has ${attacker.energy} energy attached! Deals ${damage} damage!`);
    } else if (effect === 'etherealPulse') {
        // Ethereal Pulse - 20 damage per energy on both active creatures
        const playerActiveEnergy = gameState.player.active ? gameState.player.active.energy : 0;
        const opponentActiveEnergy = gameState.opponent.active ? gameState.opponent.active.energy : 0;
        const totalEnergy = playerActiveEnergy + opponentActiveEnergy;
        damage = totalEnergy * 20;
        alert(`AI's Ethereal Pulse: Both active creatures have ${totalEnergy} total energy (${playerActiveEnergy} + ${opponentActiveEnergy})! Deals ${damage} damage!`);
    } else if (effect === 'fortuneSmite') {
        const flip = flipCoin();
        alert(`AI's Fortune Smite: Coin flip result: ${flip}!`);
        if (flip === 'heads') {
            damage += 20;
            alert(`Coin was heads! Fortune Smite deals ${damage} damage!`);
        } else {
            alert(`Coin was tails! Fortune Smite deals ${damage} damage.`);
        }
    } else if (effect === 'thornyVines') {
        // Count player's creatures in play (active + bench)
        let creatureCount = 0;
        if (gameState.player.active) creatureCount++;
        gameState.player.bench.forEach(card => {
            if (card) creatureCount++;
        });
        damage = creatureCount * 10;
        alert(`AI's Thorny Vines: You have ${creatureCount} creatures in play! Deals ${damage} damage!`);
    } else if (effect === 'toxicToss') {
        let headsCount = 0;
        let results = [];
        for (let i = 0; i < 2; i++) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') headsCount++;
        }
        damage = headsCount * 20;
        alert(`AI's Toxic Toss: Flipped 2 coins - ${results.join(', ')}!\nGot ${headsCount} heads! Deals ${damage} damage!`);
    } else if (effect === 'scrapStrike') {
        // Count Item cards in player's discard pile
        let itemCount = 0;
        gameState.player.discardPile.forEach(card => {
            if (card.data && card.data.type === 'Item') itemCount++;
        });
        damage = itemCount * 20;
        alert(`AI's Scrap Strike: You have ${itemCount} Item cards in your discard pile! Deals ${damage} damage!`);
    } else if (effect === 'metallicWing') {
        // This move does 0 base damage but attaches energy after
        damage = 0;
    } else if (effect === 'echoLoop') {
        // Echo Loop - flip coins until tails, +10 damage per heads
        let headsCount = 0;
        let results = [];
        let keepFlipping = true;
        while (keepFlipping) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') {
                headsCount++;
            } else {
                keepFlipping = false;
            }
        }
        const bonusDamage = headsCount * 10;
        damage += bonusDamage;
        alert(`AI's Echo Loop: Flipped ${results.join(', ')}!\nGot ${headsCount} heads before tails! Deals ${damage} damage total (10 base + ${bonusDamage} bonus)!`);
    } else if (effect === 'pinkGust') {
        // Pink Gust - flip 2 coins, 30 damage per heads
        let headsCount = 0;
        let results = [];
        for (let i = 0; i < 2; i++) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') headsCount++;
        }
        damage = headsCount * 30;
        alert(`AI's Pink Gust: Flipped 2 coins - ${results.join(', ')}!\nGot ${headsCount} heads! Deals ${damage} damage!`);
    } else if (effect === 'gearGrind') {
        // Gear Grind - Flip coin, if heads +20 damage
        const flip = flipCoin();
        alert(`AI's Gear Grind: Coin flip: ${flip}`);
        if (flip === 'heads') {
            damage += 20;
            alert(`Coin was heads! +20 damage! Total: ${damage}`);
        }
    } else if (effect === 'galacticMeteor') {
        // Galactic Meteor - 10 damage per energy on player's active
        damage = defender.energy * 10;
        alert(`AI's Galactic Meteor: ${defender.data.name} has ${defender.energy} energy! Deals ${damage} damage!`);
    } else if (effect === 'shadowWrap') {
        // Shadow Wrap - +30 damage if player has special condition
        if (defender.hallucinating || defender.hasFlux || defender.hasLock) {
            damage += 30;
            alert(`AI's Shadow Wrap: ${defender.data.name} has a special condition! +30 damage! Total: ${damage}`);
        }
    } else if (effect === 'verdantStruggle') {
        // Verdant Struggle - Flip 2 coins, if both heads deal 50, otherwise 0
        const flip1 = flipCoin();
        const flip2 = flipCoin();
        alert(`AI's Verdant Struggle: Flipped ${flip1} and ${flip2}`);
        if (flip1 === 'heads' && flip2 === 'heads') {
            damage = 50;
            alert("Both heads! Deals 50 damage!");
        } else {
            damage = 0;
            alert("At least one tails! Deals no damage!");
        }
    } else if (effect === 'furySpin') {
        // Fury Spin - +50 damage if HP is 30 or less
        const attackerRemaining = attacker.data.hp - attacker.damage;
        if (attackerRemaining <= 30) {
            damage += 50;
            alert(`AI's Fury Spin: ${attacker.data.name} has ${attackerRemaining} HP (30 or less)! +50 damage! Total: ${damage}`);
        }
    } else if (effect === 'enragedCharge') {
        // Enraged Charge - +30 damage per energy after 3
        if (attacker.energy > 3) {
            const extraEnergy = attacker.energy - 3;
            damage += extraEnergy * 30;
            alert(`AI's Enraged Charge: ${attacker.data.name} has ${extraEnergy} extra energy! +${extraEnergy * 30} damage! Total: ${damage}`);
        }
    } else if (effect === 'harshFlinch') {
        // Harsh Flinch - Flip coins until tails, +20 per heads
        let headsCount = 0;
        let results = [];
        let keepFlipping = true;
        while (keepFlipping) {
            const flip = flipCoin();
            results.push(flip);
            if (flip === 'heads') {
                headsCount++;
            } else {
                keepFlipping = false;
            }
        }
        const bonusDamage = headsCount * 20;
        damage += bonusDamage;
        alert(`AI's Harsh Flinch: Flipped ${results.join(', ')}! Got ${headsCount} heads before tails! +${bonusDamage} damage! Total: ${damage}`);
    } else if (effect === 'foresightBeam') {
        // Foresight Beam - Flip coin, if heads +10 damage
        const flip = flipCoin();
        alert(`AI's Foresight Beam: Coin flip: ${flip}`);
        if (flip === 'heads') {
            damage += 10;
            alert(`Coin was heads! +10 damage! Total: ${damage}`);
        }
    } else if (effect === 'spectralWrapGA') {
        // Spectral Wrap (Galactic Adventures) - +10 damage per energy on player's active
        const bonusDamage = defender.energy * 10;
        damage += bonusDamage;
        alert(`AI's Spectral Wrap: ${defender.data.name} has ${defender.energy} energy! +${bonusDamage} damage! Total: ${damage}`);
    } else if (effect === 'featherBarrage') {
        // Feather Barrage - Flip coin, if heads +20 damage
        const flip = flipCoin();
        alert(`AI's Feather Barrage: Coin flip: ${flip}`);
        if (flip === 'heads') {
            damage += 20;
            alert(`Coin was heads! +20 damage! Total: ${damage}`);
        }
    } else if (effect === 'hurricaneWing') {
        // Hurricane Wing - Flip coin, if tails no damage
        const flip = flipCoin();
        alert(`AI's Hurricane Wing: Coin flip: ${flip}`);
        if (flip === 'tails') {
            damage = 0;
            alert("Coin was tails! Hurricane Wing deals no damage!");
        }
    } else if (effect === 'tailDance') {
        // Tail Dance - Flip coin, if tails no damage
        const flip = flipCoin();
        alert(`AI's Tail Dance: Coin flip: ${flip}`);
        if (flip === 'tails') {
            damage = 0;
            alert("Coin was tails! Tail Dance deals no damage!");
        }
    } else if (effect === 'alphabetAssault') {
        // Alphabet Assault - 10 damage per letter in player's active creature name
        const letterCount = defender.data.name.length;
        damage = letterCount * 10;
        alert(`AI's Alphabet Assault: ${defender.data.name} has ${letterCount} letters! Deals ${damage} damage!`);
    } else if (effect === 'infernoConstrict') {
        // Inferno Constrict - 30 damage per Mechanic creature on AI's bench
        let mechanicCount = 0;
        gameState.opponent.bench.forEach(card => {
            if (card && getCardType(card.data) === 'Mechanic') mechanicCount++;
        });
        damage = mechanicCount * 30;
        alert(`AI's Inferno Constrict: ${mechanicCount} Mechanic creatures on AI's bench! Deals ${damage} damage!`);
    }
    
    // Apply opponent's booster if active
    if (gameState.opponent.boosterActive) {
        damage += 20;
        gameState.opponent.boosterActive = false;
    }
    
    // Apply Power-Up bonus
    if (gameState.opponent.powerUpTurnsRemaining > 0) {
        damage += 10;
    }
    
    // Apply Hallucination effect
    if (attacker.hallucinationFlip === 'heads') {
        damage += 10;
        alert(`Hallucination bonus: AI deals +10 damage! Total: ${damage}`);
    }
    
    // Apply Super Effective bonus
    const attackerType = getCardType(attacker.data);
    const defenderType = getCardType(defender.data);
    if (isSuperEffective(attackerType, defenderType)) {
        damage += 10;
        alert(`Super Effective move! AI's ${attackerType} is super effective against ${defenderType}! +10 damage!`);
    }
    
    // Apply Aura of Strength bonus (must be applied before shields)
    if (gameState.opponent.auraOfStrengthBonus) {
        damage += gameState.opponent.auraOfStrengthBonus;
        alert(`AI's Aura of Strength bonus: +${gameState.opponent.auraOfStrengthBonus} damage! Total: ${damage}`);
        gameState.opponent.auraOfStrengthBonus = 0; // Consumed after this attack
    }
    
    // Apply Sturdy Presence bonus (must be applied before shields)
    if (gameState.opponent.sturdyPresenceBonus) {
        damage += gameState.opponent.sturdyPresenceBonus;
        alert(`AI's Sturdy Presence bonus: +${gameState.opponent.sturdyPresenceBonus} damage! Total: ${damage}`);
        gameState.opponent.sturdyPresenceBonus = 0; // Consumed after this attack
    }
    
    // Apply Warrior Mode bonus (Galactic Adventures)
    if (gameState.opponent.warriorModeBonus) {
        console.log("[DEBUG] Applying Warrior Mode bonus in aiAttack");
        console.log("[DEBUG] Damage before Warrior Mode:", damage);
        console.log("[DEBUG] gameState.opponent.warriorModeBonus value:", gameState.opponent.warriorModeBonus);
        console.log("[DEBUG] typeof warriorModeBonus:", typeof gameState.opponent.warriorModeBonus);
        damage += gameState.opponent.warriorModeBonus;
        console.log("[DEBUG] Damage after Warrior Mode:", damage);
        alert(`AI's Warrior Mode bonus: +${gameState.opponent.warriorModeBonus} damage! Total: ${damage}`);
        gameState.opponent.warriorModeBonus = 0; // Consumed after this attack
    }
    
    // Apply Guardian Mode shield (Galactic Adventures - all creatures)
    if (gameState.player.guardianModeActive) {
        damage = Math.max(0, damage - 10);
        alert(`Guardian Mode reduces AI's damage by 10! AI deals ${damage} damage!`);
    }
    
    // Apply Monk's Fury shield (player's shield reduces damage to them)
    if (gameState.player.monksFuryShield) {
        damage = Math.max(0, damage - 20);
        alert(`Monk's Fury shield reduces AI's damage by 20! AI deals ${damage} damage!`);
        gameState.player.monksFuryShield = false; // Shield is consumed
    }
    
    // Apply Hard as Steel shield (player's shield - only from Mechanic/Neutral attackers)
    if (gameState.player.hardAsSteelShield && (attackerType === 'Mechanic' || attackerType === 'Neutral')) {
        const shieldAmount = gameState.player.hardAsSteelShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Hard as Steel shield reduces damage by ${shieldAmount}! AI deals ${damage} damage!`);
        gameState.player.hardAsSteelShield = 0; // Shield is consumed
    }
    
    // Apply Spectral Burst shield (player's shield reduces damage to them)
    if (gameState.player.spectralBurstShield) {
        const shieldAmount = gameState.player.spectralBurstShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Spectral Burst shield reduces AI's damage by ${shieldAmount}! AI deals ${damage} damage!`);
        gameState.player.spectralBurstShield = 0; // Shield is consumed
    }
    
    // Apply Defense Aura shield (player's shield reduces damage to them)
    if (gameState.player.defenseAuraShield) {
        const shieldAmount = gameState.player.defenseAuraShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Defense Aura shield reduces AI's damage by ${shieldAmount}! AI deals ${damage} damage!`);
        gameState.player.defenseAuraShield = 0; // Shield is consumed
    }
    
    // Apply Shield Barrier (Galactic Adventures item)
    if (gameState.player.shieldBarrierActive) {
        const shieldAmount = gameState.player.shieldBarrierActive;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Shield Barrier reduces AI's damage by ${shieldAmount}! AI deals ${damage} damage!`);
        gameState.player.shieldBarrierActive = 0; // Shield is consumed
    }
    
    // Apply Gale Shield (Galactic Adventures item - only for Wind creatures)
    if (gameState.player.galeShieldActive && defenderType === 'Wind') {
        const shieldAmount = gameState.player.galeShieldActive;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Gale Shield reduces AI's damage by ${shieldAmount}! AI deals ${damage} damage!`);
        gameState.player.galeShieldActive = 0; // Shield is consumed
    }
    
    // Apply Mind Ripple shield (Galactic Adventures)
    if (defender.mindRippleShield) {
        damage = Math.max(0, damage - 20);
        alert(`Mind Ripple shield reduces AI's damage by 20! AI deals ${damage} damage!`);
        defender.mindRippleShield = false; // Shield is consumed
    }
    
    // Apply Caprine Guard shield (Galactic Adventures - only from Celestial/Mystic)
    if (gameState.player.caprineGuardShield && (attackerType === 'Celestial' || attackerType === 'Mystic')) {
        const shieldAmount = gameState.player.caprineGuardShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Caprine Guard reduces AI's damage by ${shieldAmount}! AI deals ${damage} damage!`);
        gameState.player.caprineGuardShield = 0; // Shield is consumed
    }
    
    // Apply Elemental Fortitude shield (Galactic Adventures - only from Wind/Mechanic, creature-specific)
    if (defender.elementalFortitudeShield && (attackerType === 'Wind' || attackerType === 'Mechanic')) {
        const shieldAmount = defender.elementalFortitudeShield;
        damage = Math.max(0, damage - shieldAmount);
        alert(`Elemental Fortitude reduces AI's damage by ${shieldAmount}! AI deals ${damage} damage!`);
        defender.elementalFortitudeShield = 0; // Shield is consumed
    }
    
    // Apply Metalic Protection (Galactic Adventures - no damage from Mechanic)
    if (defender.metalicProtectionActive && attackerType === 'Mechanic') {
        damage = 0;
        alert(`${defender.data.name}'s Metalic Protection blocks all Mechanic damage! AI's ${attacker.data.name} deals no damage!`);
        // Don't consume the shield here - it lasts the entire turn
    }
    
    console.log("Total damage:", damage, "Defender HP:", defender.data.hp, "Current damage:", defender.damage);
    
    // Check for Guardian ability - redirect damage to bench creature
    if (gameState.player.guardianBenchIndex !== null && gameState.player.guardianBenchIndex !== undefined) {
        const guardianCard = gameState.player.bench[gameState.player.guardianBenchIndex];
        if (guardianCard) {
            alert(`${guardianCard.data.name} uses Guardian! It takes the damage instead of ${defender.data.name}!`);
            guardianCard.damage += damage;
            const guardianIndex = gameState.player.guardianBenchIndex;
            gameState.player.guardianBenchIndex = null; // Ability consumed
            renderGame();
            
            // Check if guardian is knocked out
            if (guardianCard.damage >= guardianCard.data.hp) {
                alert(`${guardianCard.data.name} was knocked out protecting ${defender.data.name}!`);
                
                // Add all cards in evolution chain to discard pile
                if (guardianCard.evolutionChain && guardianCard.evolutionChain.length > 0) {
                    guardianCard.evolutionChain.forEach(prevCard => {
                        gameState.player.discardPile.push(prevCard);
                    });
                }
                gameState.player.discardPile.push(guardianCard);
                
                gameState.player.bench[guardianIndex] = null;
                gameState.opponent.points++;
                updatePoints();
                // Continue with the rest of the turn
                setTimeout(() => endTurn(), 500);
                return;
            }
            // If guardian survives, continue turn normally
            setTimeout(() => endTurn(), 500);
            return;
        } else {
            // Guardian creature no longer exists, clear the index
            gameState.player.guardianBenchIndex = null;
        }
    }
    
    // Check if AI can't deal damage this turn (Tidal Illusion effect)
    if (gameState.opponent.cantDealDamageNextTurn) {
        damage = 0;
        alert(`Tidal Illusion prevents AI from dealing any damage this turn!`);
    }
    
    // Apply damage to defender
    defender.damage += damage;
    
    // Check for Retaliation Stone (Galactic Adventures) - counter-attack when damaged
    if (defender.retaliationStoneActive && damage > 0) {
        attacker.damage += 20;
        defender.retaliationStoneActive = false; // Consumed after use
        alert(`${defender.data.name}'s Retaliation Stone activated! AI's ${attacker.data.name} takes 20 damage!`);
        renderGame();
        
        // Check if AI attacker was knocked out by retaliation
        if (attacker.damage >= attacker.data.hp) {
            alert(`AI's ${attacker.data.name} was knocked out by Retaliation Stone!`);
            knockoutCreature('opponent');
            return; // Exit the function as attacker is knocked out
        }
    }
    
    // Apply Rainbow Strike - deal 30 damage to random player bench creature
    if (gameState.opponent.rainbowStrikeActive) {
        const playerBench = gameState.player.bench.filter(c => c !== null);
        if (playerBench.length > 0) {
            const randomIndex = Math.floor(Math.random() * playerBench.length);
            let actualIndex = 0;
            let count = 0;
            for (let i = 0; i < gameState.player.bench.length; i++) {
                if (gameState.player.bench[i] !== null) {
                    if (count === randomIndex) {
                        actualIndex = i;
                        break;
                    }
                    count++;
                }
            }
            const benchTarget = gameState.player.bench[actualIndex];
            benchTarget.damage += 30;
            alert(`AI's Rainbow Strike! ${benchTarget.data.name} on bench takes 30 damage!`);
            
            // Check if bench creature was knocked out
            if (benchTarget.damage >= benchTarget.data.hp) {
                alert(`${benchTarget.data.name} was knocked out!`);
                
                // Add all cards in evolution chain to discard pile
                if (benchTarget.evolutionChain && benchTarget.evolutionChain.length > 0) {
                    benchTarget.evolutionChain.forEach(prevCard => {
                        gameState.player.discardPile.push(prevCard);
                    });
                }
                gameState.player.discardPile.push(benchTarget);
                
                gameState.player.bench[actualIndex] = null;
                gameState.opponent.points++;
                updatePoints();
            }
        }
        gameState.opponent.rainbowStrikeActive = false; // Consumed
        renderGame();
    }
    
    // Apply hallucination self-damage if tails
    if (attacker.hallucinationFlip === 'tails') {
        attacker.damage += 40;
        alert(`Hallucination penalty: AI's ${attacker.data.name} deals 40 damage to itself!`);
        renderGame();
        
        // Check if attacker knocked itself out
        if (attacker.damage >= attacker.data.hp) {
            alert(`AI's ${attacker.data.name} knocked itself out from hallucination!`);
            // Clear hallucination flip result
            delete attacker.hallucinationFlip;
            knockoutCreature('opponent');
            return; // Exit the function as attacker is knocked out
        }
    }
    
    // Clear hallucination flip result
    delete attacker.hallucinationFlip;
    
    gameState.opponent.hasAttacked = true;
    renderGame();
    
    // Check for Phase Shift - AI must switch after attacking
    if (gameState.opponent.phaseShiftActive) {
        const opponentBench = gameState.opponent.bench.filter(c => c !== null);
        if (opponentBench.length > 0) {
            // AI randomly selects a bench creature to switch with
            const randomIndex = Math.floor(Math.random() * opponentBench.length);
            let actualIndex = 0;
            let count = 0;
            for (let i = 0; i < gameState.opponent.bench.length; i++) {
                if (gameState.opponent.bench[i] !== null) {
                    if (count === randomIndex) {
                        actualIndex = i;
                        break;
                    }
                    count++;
                }
            }
            
            const temp = gameState.opponent.active;
            gameState.opponent.active = gameState.opponent.bench[actualIndex];
            gameState.opponent.bench[actualIndex] = temp;
            
            // Clear hallucination on switched creature
            if (temp.hallucinating) {
                temp.hallucinating = false;
                alert(`AI's ${temp.data.name} is no longer hallucinating!`);
            }
            
            gameState.opponent.phaseShiftActive = false;
            alert(`AI's Phase Shift! Switched ${temp.data.name} with ${gameState.opponent.active.data.name}!`);
            renderGame();
        } else {
            alert("AI's Phase Shift requires a bench creature to switch with, but AI has none!");
            gameState.opponent.phaseShiftActive = false;
        }
    }
    
    // Check if defender is knocked out by base damage
    const defenderKnockedOut = defender.damage >= defender.data.hp;
    
    console.log("Defender knocked out?", defenderKnockedOut, "Effect:", effect);
    
    if (defenderKnockedOut) {
        // Apply effect first (if any), then handle knockout
        if (effect && !['dizzyShot', 'infernoWing', 'galeFlip', 'coinClash', 'diceFury', 'diceTempest', 'neutralSurge', 'nightStrike', 'etherealPulse', 'prismaticDive', 'solarAscend', 'mysticBlaze', 'fortuneSmite', 'thornyVines', 'toxicToss', 'scrapStrike', 'metallicWing', 'healingRoots', 'minorMend', 'majorMend', 'monksFury', 'forcefulFlip', 'mindMirage', 'etherealEcho', 'phantomPulse', 'dreamwave', 'dreamBooster', 'echoLoop', 'pinkGust', 'brainFreeze', 'wingSlap', 'planetBurst', 'spectralBurst'].includes(effect)) {
            console.log("Calling handleMoveEffectBeforeKnockout with effect:", effect);
            handleMoveEffectBeforeKnockout(effect, attacker, 'opponent', () => {
                knockoutCreature('player');
            });
        } else {
            // Handle special post-damage effects even when defender is knocked out
            if (effect === 'infernoWing') {
                if (infernoWingFlip === 'tails') {
                    attacker.damage += 20;
                    alert(`AI's Inferno Wing deals 20 damage to ${attacker.data.name}!`);
                    renderGame();
                }
                knockoutCreature('player');
            } else if (effect === 'solarAscend') {
                const flip = flipCoin();
                alert(`AI's Solar Ascend: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    if (!gameState.player.camouflageActive) {
                        let damageLog = "AI's Solar Ascend hits all your benched creatures for 10 damage!\n";
                        gameState.player.bench.forEach((card, idx) => {
                            if (card) {
                                card.damage += 10;
                                damageLog += `${card.data.name} on bench takes 10 damage!\n`;
                            }
                        });
                        alert(damageLog);
                    } else {
                        alert("AI's Solar Ascend aimed at bench, but Camouflage protected them!");
                    }
                    renderGame();
                } else {
                    alert("Coin was tails! No bench damage.");
                }
                knockoutCreature('player');
            } else if (effect === 'mysticBlaze') {
                // Deal 30 damage to all player's creatures on bench (active already KO'd)
                if (!gameState.player.camouflageActive) {
                    let damageLog = "AI's Mystic Blaze hits all your benched creatures for 30 damage!\n";
                    gameState.player.bench.forEach((card, idx) => {
                        if (card) {
                            card.damage += 30;
                            damageLog += `${card.data.name} on bench takes 30 damage!\n`;
                        }
                    });
                    alert(damageLog);
                    renderGame();
                    // Check bench knockouts first, then handle active
                    checkBenchKnockouts('player');
                } else {
                    alert("AI's Mystic Blaze aimed at bench, but Camouflage protected them!");
                    renderGame();
                }
                knockoutCreature('player');
            } else if (effect === 'healingRoots') {
                attacker.damage = Math.max(0, attacker.damage - 20);
                alert(`AI's ${attacker.data.name} healed 20 HP!`);
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'minorMend') {
                attacker.damage = Math.max(0, attacker.damage - 10);
                alert(`AI's ${attacker.data.name} healed 10 HP!`);
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'majorMend') {
                attacker.damage = Math.max(0, attacker.damage - 20);
                alert(`AI's ${attacker.data.name} healed 20 HP!`);
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'metallicWing') {
                attacker.energy++;
                alert(`AI's ${attacker.data.name} attached 1 energy!`);
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'monksFury') {
                const flip = flipCoin();
                alert(`AI's Monk's Fury: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    gameState.opponent.monksFuryShield = true;
                    alert("AI's Monk's Fury shield activated! Next turn, your damage will be reduced by 20.");
                } else {
                    alert("Coin was tails! No shield activated.");
                }
                knockoutCreature('player');
            } else if (effect === 'forcefulFlip') {
                const flip = flipCoin();
                alert(`AI's Forceful Flip: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    const playerBench = gameState.player.bench.filter(c => c !== null);
                    if (playerBench.length > 0) {
                        alert("You have bench creatures! You must swap your active creature.");
                        // Auto-select first bench creature
                        const firstBenchIndex = gameState.player.bench.findIndex(c => c !== null);
                        const temp = gameState.player.active;
                        
                        // Cure hallucination when moving to bench
                        if (temp.hallucinating) {
                            temp.hallucinating = false;
                            alert(`${temp.data.name} is no longer hallucinating!`);
                        }
                        
                        gameState.player.active = gameState.player.bench[firstBenchIndex];
                        gameState.player.bench[firstBenchIndex] = temp;
                        alert(`You swapped ${temp.data.name} with ${gameState.player.active.data.name}!`);
                        renderGame();
                    } else {
                        alert("You have no bench creatures to swap with!");
                    }
                } else {
                    alert("Coin was tails! No forced swap.");
                }
                knockoutCreature('player');
            } else if (effect === 'mindMirage') {
                applyHallucination(defender, 'player');
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'etherealEcho') {
                applyHallucination(defender, 'player');
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'phantomPulse') {
                applyHallucination(defender, 'player');
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'dreamwave') {
                const flip = flipCoin();
                alert(`AI's Dreamwave: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    applyHallucination(defender, 'player');
                } else {
                    alert("Coin was tails! No hallucination caused.");
                }
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'dreamBooster') {
                const flip = flipCoin();
                alert(`AI's Dream Booster: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    applyHallucination(defender, 'player');
                } else {
                    alert("Coin was tails! No hallucination caused.");
                }
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'brainFreeze') {
                applyHallucination(defender, 'player');
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'wingSlap') {
                attacker.cantAttackNextTurn = true;
                attacker.cantAttackUntilTurn = gameState.turnNumber + 4; // Skip their next turn (2 turns from now = 4 turn increments)
                alert(`AI's ${attacker.data.name} can't attack next turn!`);
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'planetBurst') {
                attacker.damage = Math.max(0, attacker.damage - 10);
                alert(`AI's ${attacker.data.name} healed 10 HP!`);
                renderGame();
                knockoutCreature('player');
            } else if (effect === 'spectralBurst') {
                gameState.opponent.spectralBurstShield = 10;
                alert(`AI's Spectral Burst shield activated! Next turn, your damage will be reduced by 10.`);
                renderGame();
                knockoutCreature('player');
            } else {
                // No additional effect or already handled, just handle knockout
                knockoutCreature('player');
            }
        }
    } else {
        // Defender survives, handle all effects normally
        if (effect && !['dizzyShot', 'infernoWing', 'galeFlip', 'coinClash', 'diceFury', 'diceTempest', 'neutralSurge', 'nightStrike', 'etherealPulse', 'prismaticDive', 'solarAscend', 'mysticBlaze', 'fortuneSmite', 'thornyVines', 'toxicToss', 'scrapStrike', 'metallicWing', 'healingRoots', 'minorMend', 'majorMend', 'monksFury', 'forcefulFlip', 'mindMirage', 'etherealEcho', 'phantomPulse', 'dreamwave', 'dreamBooster', 'echoLoop', 'pinkGust', 'brainFreeze', 'wingSlap', 'planetBurst', 'spectralBurst'].includes(effect)) {
            console.log("Calling handleMoveEffect with effect:", effect);
            handleMoveEffect(effect, attacker, defender, 'opponent');
        } else {
            // Check for special post-damage effects
            if (effect === 'infernoWing') {
                if (infernoWingFlip === 'tails') {
                    attacker.damage += 20;
                    alert(`AI's Inferno Wing deals 20 damage to ${attacker.data.name}!`);
                    renderGame();
                    checkKnockoutsAndContinue('opponent');
                } else {
                    setTimeout(() => endTurn(), 500);
                }
            } else if (effect === 'mysticBlaze') {
                // Deal 30 damage to all player's creatures
                if (!gameState.player.camouflageActive) {
                    let damageLog = "AI's Mystic Blaze hits all your creatures for 30 damage!\n";
                    gameState.player.bench.forEach((card, idx) => {
                        if (card) {
                            card.damage += 30;
                            damageLog += `${card.data.name} on bench takes 30 damage!\n`;
                        }
                    });
                    alert(damageLog);
                } else {
                    alert("AI's Mystic Blaze aimed at bench, but Camouflage protected them!");
                }
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'prismaticDive') {
                let headsCount = 0;
                let results = [];
                for (let i = 0; i < 2; i++) {
                    const flip = flipCoin();
                    results.push(flip);
                    if (flip === 'heads') headsCount++;
                }
                const extraDamage = headsCount * 40;
                if (extraDamage > 0) {
                    defender.damage += extraDamage;
                    alert(`AI's Prismatic Dive: Flipped 2 coins - ${results.join(', ')}!\nGot ${headsCount} heads! Deals ${extraDamage} extra damage!`);
                    renderGame();
                    checkKnockoutsAndContinue('opponent');
                } else {
                    alert(`AI's Prismatic Dive: Flipped 2 coins - ${results.join(', ')}!\nNo extra damage.`);
                    // No extra damage, just end turn
                    setTimeout(() => endTurn(), 500);
                }
            } else if (effect === 'solarAscend') {
                const flip = flipCoin();
                alert(`AI's Solar Ascend: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    if (!gameState.player.camouflageActive) {
                        let damageLog = "AI's Solar Ascend hits all your benched creatures for 10 damage!\n";
                        gameState.player.bench.forEach((card, idx) => {
                            if (card) {
                                card.damage += 10;
                                damageLog += `${card.data.name} on bench takes 10 damage!\n`;
                            }
                        });
                        alert(damageLog);
                    } else {
                        alert("AI's Solar Ascend aimed at bench, but Camouflage protected them!");
                    }
                    checkKnockoutsAndContinue('opponent');
                } else {
                    alert("Coin was tails! No bench damage.");
                    // No extra damage, just end turn
                    setTimeout(() => endTurn(), 500);
                }
            } else if (effect === 'healingRoots') {
                attacker.damage = Math.max(0, attacker.damage - 20);
                alert(`AI's ${attacker.data.name} healed 20 HP!`);
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'minorMend') {
                attacker.damage = Math.max(0, attacker.damage - 10);
                alert(`AI's ${attacker.data.name} healed 10 HP!`);
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'majorMend') {
                attacker.damage = Math.max(0, attacker.damage - 20);
                alert(`AI's ${attacker.data.name} healed 20 HP!`);
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'metallicWing') {
                attacker.energy++;
                alert(`AI's ${attacker.data.name} attached 1 energy!`);
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'monksFury') {
                const flip = flipCoin();
                alert(`AI's Monk's Fury: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    gameState.opponent.monksFuryShield = true;
                    alert("AI's Monk's Fury shield activated! Next turn, your damage will be reduced by 20.");
                } else {
                    alert("Coin was tails! No shield activated.");
                }
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'forcefulFlip') {
                const flip = flipCoin();
                alert(`AI's Forceful Flip: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    const playerBench = gameState.player.bench.filter(c => c !== null);
                    if (playerBench.length > 0) {
                        alert("You have bench creatures! You must swap your active creature.");
                        // Auto-select first bench creature
                        const firstBenchIndex = gameState.player.bench.findIndex(c => c !== null);
                        const temp = gameState.player.active;
                        
                        // Cure hallucination when moving to bench
                        if (temp.hallucinating) {
                            temp.hallucinating = false;
                            alert(`${temp.data.name} is no longer hallucinating!`);
                        }
                        
                        gameState.player.active = gameState.player.bench[firstBenchIndex];
                        gameState.player.bench[firstBenchIndex] = temp;
                        alert(`You swapped ${temp.data.name} with ${gameState.player.active.data.name}!`);
                        renderGame();
                    } else {
                        alert("You have no bench creatures to swap with!");
                    }
                } else {
                    alert("Coin was tails! No forced swap.");
                }
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'mindMirage') {
                applyHallucination(defender, 'player');
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'etherealEcho') {
                const flip = flipCoin();
                alert(`AI's Ethereal Echo: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    damage += 30;
                    defender.damage += 30;
                    alert(`Coin was heads! Ethereal Echo deals 30 extra damage!`);
                    renderGame();
                }
                applyHallucination(defender, 'player');
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'phantomPulse') {
                applyHallucination(defender, 'player');
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'dreamwave') {
                const flip = flipCoin();
                alert(`AI's Dreamwave: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    applyHallucination(defender, 'player');
                } else {
                    alert("Coin was tails! No hallucination caused.");
                }
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'dreamBooster') {
                const flip = flipCoin();
                alert(`AI's Dream Booster: Coin flip result: ${flip}!`);
                if (flip === 'heads') {
                    applyHallucination(defender, 'player');
                } else {
                    alert("Coin was tails! No hallucination caused.");
                }
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'brainFreeze') {
                applyHallucination(defender, 'player');
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'wingSlap') {
                attacker.cantAttackNextTurn = true;
                attacker.cantAttackUntilTurn = gameState.turnNumber + 4; // Skip their next turn (2 turns from now = 4 turn increments)
                alert(`AI's ${attacker.data.name} can't attack next turn!`);
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'planetBurst') {
                attacker.damage = Math.max(0, attacker.damage - 10);
                alert(`AI's ${attacker.data.name} healed 10 HP!`);
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else if (effect === 'spectralBurst') {
                gameState.opponent.spectralBurstShield = 10;
                alert(`AI's Spectral Burst shield activated! Next turn, your damage will be reduced by 10.`);
                renderGame();
                checkKnockoutsAndContinue('opponent');
            } else {
                // No special post-damage effect, just end turn
                setTimeout(() => endTurn(), 500);
            }
        }
    }
}

// Update action buttons
function updateActionButtons() {
    const energyBtn = document.getElementById('energy-btn');
    const attackBtn = document.getElementById('attack-btn');
    const attack2Btn = document.getElementById('attack2-btn');
    const retreatBtn = document.getElementById('retreat-btn');
    const abilityBtn = document.getElementById('ability-active-btn');
    const doneBtn = document.getElementById('done-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    
    if (gameState.phase === 'setup') {
        energyBtn.disabled = true;
        attackBtn.style.display = 'none';
        attack2Btn.style.display = 'none';
        if (abilityBtn) abilityBtn.style.display = 'none';
        retreatBtn.style.display = 'none';
        doneBtn.textContent = 'Done';
        doneBtn.style.display = 'inline-block';
        newGameBtn.style.display = 'none';
    } else if (gameState.phase === 'gameOver') {
        energyBtn.disabled = true;
        attackBtn.style.display = 'none';
        attack2Btn.style.display = 'none';
        if (abilityBtn) abilityBtn.style.display = 'none';
        retreatBtn.style.display = 'none';
        doneBtn.style.display = 'none';
        newGameBtn.style.display = 'inline-block';
    } else if (gameState.currentTurn === 'player') {
        energyBtn.disabled = gameState.player.energyAttachedThisTurn || gameState.player.hasAttacked;
        doneBtn.style.display = 'inline-block';
        newGameBtn.style.display = 'none';
        
        // Check both moves
        const active = gameState.player.active;
        if (active && !gameState.player.hasAttacked) {
            const canAttack1 = active.data.move1Cost && active.energy >= active.data.move1Cost.length;
            const canAttack2 = active.data.move2Cost && active.energy >= active.data.move2Cost.length;
            
            // Check if creature can't attack this turn due to Wing Slap effect
            const blockedByWingSlap = active.cantAttackNextTurn;
            
            attackBtn.style.display = canAttack1 ? 'inline-block' : 'none';
            attack2Btn.style.display = canAttack2 ? 'inline-block' : 'none';
            
            // Disable attack buttons if blocked by Wing Slap
            if (blockedByWingSlap) {
                attackBtn.disabled = true;
                attack2Btn.disabled = true;
                attackBtn.title = "This creature can't attack this turn!";
                attack2Btn.title = "This creature can't attack this turn!";
            } else {
                attackBtn.disabled = false;
                attack2Btn.disabled = false;
                attackBtn.title = "";
                attack2Btn.title = "";
            }
            
            // Update button text with move names and damage
            if (canAttack1) {
                if (active.data.move1Name && active.data.move1Damage) {
                    attackBtn.textContent = `${active.data.move1Name} (${active.data.move1Damage})`;
                } else if (active.data.move1Name) {
                    attackBtn.textContent = active.data.move1Name;
                } else {
                    attackBtn.textContent = 'Attack';
                }
            }
            
            if (canAttack2) {
                if (active.data.move2Name && active.data.move2Damage) {
                    attack2Btn.textContent = `${active.data.move2Name} (${active.data.move2Damage})`;
                } else if (active.data.move2Name) {
                    attack2Btn.textContent = active.data.move2Name;
                } else {
                    attack2Btn.textContent = 'Attack 2';
                }
            }
            
            // Update ability button
            if (abilityBtn && active.data.abilityName) {
                abilityBtn.style.display = 'inline-block';
                const canUseAbility = checkAbilityUsable(active, 'active');
                abilityBtn.disabled = !canUseAbility;
                abilityBtn.textContent = active.data.abilityName;
            } else if (abilityBtn) {
                abilityBtn.style.display = 'none';
            }
        } else {
            attackBtn.style.display = 'none';
            attack2Btn.style.display = 'none';
            if (abilityBtn) abilityBtn.style.display = 'none';
        }
        
        const canRetreat = gameState.player.active &&
                          !gameState.player.active.cantRetreat &&
                          gameState.player.active.energy >= gameState.player.active.data.retreat &&
                          !gameState.player.hasAttacked &&
                          gameState.player.bench.some(card => card !== null);
        if (canRetreat) {
            retreatBtn.style.display = 'inline-block';
            retreatBtn.textContent = `Retreat (${gameState.player.active.data.retreat})`;
            retreatBtn.disabled = false;
        } else if (gameState.player.active && gameState.player.active.cantRetreat && !gameState.player.hasAttacked) {
            retreatBtn.style.display = 'inline-block';
            retreatBtn.textContent = `Retreat (Can't Retreat!)`;
            retreatBtn.disabled = true;
        } else {
            retreatBtn.style.display = 'none';
        }
        
        doneBtn.disabled = false;
        doneBtn.textContent = 'End Turn';
    } else {
        energyBtn.disabled = true;
        attackBtn.style.display = 'none';
        attack2Btn.style.display = 'none';
        if (abilityBtn) abilityBtn.style.display = 'none';
        retreatBtn.style.display = 'none';
        doneBtn.disabled = true;
        doneBtn.textContent = "Opponent's Turn";
        doneBtn.style.display = 'inline-block';
        newGameBtn.style.display = 'none';
    }
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    // Add event listener for debug start button
    const debugStartBtn = document.getElementById('debug-start-game');
    if (debugStartBtn) {
        debugStartBtn.addEventListener('click', startDebugGame);
    }
});

// Info Modal Functions
function showInfoModal() {
    document.getElementById('info-modal').style.display = 'flex';
}

function closeInfoModal() {
    document.getElementById('info-modal').style.display = 'none';
}

// Add info button event listener
document.getElementById('info-btn').addEventListener('click', showInfoModal);

// Debug Mode Functions
function showDebugModal() {
    console.log('showDebugModal called');
    const modal = document.getElementById('debug-modal');
    const playerSelect = document.getElementById('debug-player-deck');
    const opponentSelect = document.getElementById('debug-opponent-deck');
    
    console.log('Modal element:', modal);
    console.log('Player select:', playerSelect);
    console.log('Opponent select:', opponentSelect);
    
    if (!modal) {
        console.error('debug-modal element not found!');
        return;
    }
    
    if (!playerSelect || !opponentSelect) {
        console.error('Select elements not found!');
        return;
    }
    
    // Clear existing options
    playerSelect.innerHTML = '';
    opponentSelect.innerHTML = '';
    
    // Populate both dropdowns with all decks
    deckTemplates.forEach((deck, index) => {
        const customBadge = deck.type === 'custom' ? ' ★' : '';
        
        const playerOption = document.createElement('option');
        playerOption.value = index;
        playerOption.textContent = `${deck.name}${customBadge}`;
        playerSelect.appendChild(playerOption);
        
        const opponentOption = document.createElement('option');
        opponentOption.value = index;
        opponentOption.textContent = `${deck.name}${customBadge}`;
        opponentSelect.appendChild(opponentOption);
    });
    
    // Set default selections (first preset decks)
    playerSelect.selectedIndex = 0;
    opponentSelect.selectedIndex = 1;
    
    console.log('About to show modal');
    modal.style.display = 'flex';
    console.log('Modal display set to flex');
}

function closeDebugModal() {
    document.getElementById('debug-modal').style.display = 'none';
}

function startDebugGame() {
    const playerSelect = document.getElementById('debug-player-deck');
    const opponentSelect = document.getElementById('debug-opponent-deck');
    
    const playerDeckIndex = parseInt(playerSelect.value);
    const opponentDeckIndex = parseInt(opponentSelect.value);
    
    // Set the selected decks
    gameState.player.selectedDeck = playerDeckIndex;
    gameState.opponent.selectedDeck = opponentDeckIndex;
    
    closeDebugModal();
    
    // Hide deck selection, show game screen
    document.getElementById('deck-selection').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    
    gameState.phase = 'setup';
    createDecks();
    drawInitialHands();
    renderGame();
}

// Make closeDebugModal available globally
window.closeDebugModal = closeDebugModal;
