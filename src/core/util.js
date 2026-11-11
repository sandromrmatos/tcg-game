// ============================================================================
// SHARED UTILITIES
// Randomness, side naming, type chart, small helpers.
// ============================================================================

const SIDES = ['player', 'opponent'];

/** The opposing side key. */
function foeOf(side) {
    return side === 'player' ? 'opponent' : 'player';
}

/**
 * Subject form used in log lines: "You" / "The AI".
 * Every message is written once and reads correctly for either side, which is
 * what lets the player and AI share one implementation of every effect.
 */
function subject(side) {
    return side === 'player' ? 'You' : (SideNames.opponent || 'The AI');
}

/** Possessive form: "Your" / "The AI's". */
function possessive(side) {
    if (side === 'player') return 'Your';
    return SideNames.opponent ? `${SideNames.opponent}'s` : "The AI's";
}

/** In an online game the opponent is named instead of "The AI" (set by pvp.js). */
const SideNames = { opponent: null };

/**
 * A creature's display name, qualified by owner so the log is never ambiguous
 * when both sides have the same card in play.
 */
function creatureName(card, side) {
    if (!card) return 'nothing';
    if (side === undefined) return card.data.name;
    return `${possessive(side)} ${card.data.name}`;
}

/** Third-person verb agreement for the subject form above. */
function verb(side, singular, plural) {
    return side === 'player' ? plural : singular;
}

// ---------------------------------------------------------------------------
// Randomness. Routed through one object so the fuzz harness can seed it.
// ---------------------------------------------------------------------------

const Rng = {
    _next: Math.random,

    /** Replace the source with a deterministic generator (used by test.html). */
    seed(n) {
        let s = n >>> 0 || 1;
        this._next = function () {
            // xorshift32
            s ^= s << 13; s >>>= 0;
            s ^= s >> 17;
            s ^= s << 5; s >>>= 0;
            return s / 4294967296;
        };
    },

    reset() {
        this._next = Math.random;
    },

    float() {
        return this._next();
    },

    /** Integer in [0, n). */
    int(n) {
        return Math.floor(this._next() * n);
    },

    flip() {
        return this._next() < 0.5 ? 'heads' : 'tails';
    },

    /** Standard six-sided die. */
    roll() {
        return Math.floor(this._next() * 6) + 1;
    },

    pick(array) {
        if (!array || array.length === 0) return null;
        return array[this.int(array.length)];
    },

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.int(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
};

/** Flips `count` coins, returning { results, heads, tails }. */
function flipMany(count) {
    const results = [];
    let heads = 0;
    for (let i = 0; i < count; i++) {
        const r = Rng.flip();
        results.push(r);
        if (r === 'heads') heads++;
    }
    return { results, heads, tails: count - heads };
}

/** Flips until tails, returning { results, heads }. Heads count excludes the tails. */
function flipUntilTails() {
    const results = [];
    let heads = 0;
    for (;;) {
        const r = Rng.flip();
        results.push(r);
        if (r === 'tails') break;
        heads++;
        // Safety valve: a fair coin will not reach this, but a bad Rng shouldn't hang.
        if (heads > 200) break;
    }
    return { results, heads };
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const TYPE_COLORS = {
    Mystic: '#9b59b6',
    Wind: '#4aa8e0',
    Celestial: '#3ec97a',
    Mechanic: '#e08b3c',
    Neutral: '#8d98a5',
    Item: '#5a6b7d',
    Accessory: '#c9a227'
};

/** The five creature types, in display order. */
const CREATURE_TYPES = ['Mystic', 'Wind', 'Celestial', 'Mechanic', 'Neutral'];

/** Mystic -> Wind -> Celestial -> Mystic, plus Mechanic -> Neutral. */
const SUPER_EFFECTIVE = {
    Mystic: 'Wind',
    Wind: 'Celestial',
    Celestial: 'Mystic',
    Mechanic: 'Neutral'
};

function getCardType(cardData) {
    return (cardData && cardData.type) || 'Neutral';
}

function typeColor(type) {
    return TYPE_COLORS[type] || '#34495e';
}

function isSuperEffective(attackerType, defenderType) {
    if (!CREATURE_TYPES.includes(attackerType) || !CREATURE_TYPES.includes(defenderType)) return false;
    // Twist of Fate (Aurorion, always on): while one is in play, every
    // weakness is reversed for both players, so Wind beats Mystic and Neutral
    // beats Mechanic.
    if (typeof twistOfFateActive === 'function' && twistOfFateActive()) {
        return SUPER_EFFECTIVE[defenderType] === attackerType;
    }
    // Neutral neither deals nor receives a bonus, except from Mechanic.
    if (attackerType === 'Neutral') return false;
    return SUPER_EFFECTIVE[attackerType] === defenderType;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function isItem(cardData) {
    return !!cardData && cardData.stage === 'Item';
}

/** Accessory cards (Temporal Rift onwards) are attached to a creature. */
function isAccessory(cardData) {
    return !!cardData && cardData.stage === 'Accessory';
}

function isCreature(cardData) {
    return !!cardData && cardData.stage !== 'Item' && cardData.stage !== 'Accessory';
}

/** Energy cost: the cost string's length is the number of energy required. */
function energyCost(costString) {
    return costString ? costString.length : 0;
}

// ---------------------------------------------------------------------------
// Typed energy
//
// Energy comes in four types. In a move cost, M W C K need that exact type
// and N accepts any type: "MN" is 1 Mystic + 1 of anything, so a creature
// holding 2 Celestial cannot use it. A creature's energy is stored as a count
// per type in `card.energyUnits`; `card.energy` is the total.
// ---------------------------------------------------------------------------

const ENERGY_TYPES = ['Mystic', 'Wind', 'Celestial', 'Mechanic'];
const COST_LETTER_TYPES = { M: 'Mystic', W: 'Wind', C: 'Celestial', K: 'Mechanic' };
const ENERGY_ICONS = { Mystic: '🔮', Wind: '🌪️', Celestial: '🌿', Mechanic: '⚙️' };

function emptyEnergyUnits() {
    return { Mystic: 0, Wind: 0, Celestial: 0, Mechanic: 0 };
}

/** { specific: {Mystic: n, ...}, any: n } for a cost string. */
function parseEnergyCost(costString) {
    const specific = emptyEnergyUnits();
    let any = 0;
    for (const letter of costString || '') {
        const type = COST_LETTER_TYPES[letter];
        if (type) specific[type]++;
        else any++;
    }
    return { specific, any };
}

function energyUnitsTotal(units) {
    return ENERGY_TYPES.reduce((sum, t) => sum + ((units && units[t]) || 0), 0);
}

/**
 * Energy still missing before this creature can pay a cost, given optional
 * extra units it would have. 0 means the cost can be paid.
 */
function energyNeeded(card, costString, extra = null) {
    const cost = parseEnergyCost(costString);
    const units = Object.assign(emptyEnergyUnits(), card && card.energyUnits);
    if (extra) for (const t of ENERGY_TYPES) units[t] += extra[t] || 0;
    let short = 0, usedForSpecific = 0;
    for (const t of ENERGY_TYPES) {
        short += Math.max(0, cost.specific[t] - units[t]);
        usedForSpecific += Math.min(cost.specific[t], units[t]);
    }
    const spare = energyUnitsTotal(units) - usedForSpecific;
    return short + Math.max(0, cost.any - spare);
}

/** Can this creature pay for a move right now (ignoring turn rules)? */
function canPayMove(card, move) {
    return !!card && !!move && energyNeeded(card, move.cost) === 0;
}

/** "1 Mystic + 1 any" style description of a cost string. */
function describeEnergyCost(costString) {
    const cost = parseEnergyCost(costString);
    const parts = ENERGY_TYPES.filter(t => cost.specific[t]).map(t => `${cost.specific[t]} ${t}`);
    if (cost.any) parts.push(`${cost.any} any`);
    return parts.length ? parts.join(' + ') : 'nothing';
}

/** Energy types this creature's moves ask for by name. */
function energyTypesUsedBy(cardData) {
    const types = new Set();
    for (const move of movesOf(cardData)) {
        const cost = parseEnergyCost(move.cost);
        for (const t of ENERGY_TYPES) if (cost.specific[t]) types.add(t);
    }
    return types;
}

/** Reads move 1 or move 2 off card data into a uniform shape. */
function moveOf(cardData, moveNumber) {
    if (!cardData) return null;
    const n = moveNumber === 2 ? 2 : 1;
    const name = cardData[`move${n}Name`];
    if (!name) return null;
    return {
        number: n,
        name,
        cost: cardData[`move${n}Cost`] || '',
        costCount: energyCost(cardData[`move${n}Cost`]),
        damage: cardData[`move${n}Damage`] || 0,
        effect: cardData[`move${n}Effect`] || null
    };
}

/** Both defined moves of a card. */
function movesOf(cardData) {
    return [moveOf(cardData, 1), moveOf(cardData, 2)].filter(Boolean);
}

/** A creature's maximum HP, including an attached accessory (Mystic Amulet +10). */
function maxHp(card) {
    if (!card) return 0;
    const bonus = typeof accessoryHpBonus === 'function' ? accessoryHpBonus(card) : 0;
    return (card.data.hp || 0) + bonus;
}

/** Energy a creature pays to retreat, after accessories (Wind Feather -1). Never below 0. */
function retreatCost(card) {
    if (!card) return 0;
    const cut = typeof accessoryRetreatReduction === 'function' ? accessoryRetreatReduction(card) : 0;
    return Math.max(0, (card.data.retreat || 0) - cut);
}

function remainingHp(card) {
    return card ? maxHp(card) - card.damage : 0;
}

function isFainted(card) {
    return !!card && card.damage >= maxHp(card);
}

function newEvolutionId() {
    return Math.random().toString(36).slice(2, 11);
}
