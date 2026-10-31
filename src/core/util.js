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
    return side === 'player' ? 'You' : 'The AI';
}

/** Possessive form: "Your" / "The AI's". */
function possessive(side) {
    return side === 'player' ? 'Your' : "The AI's";
}

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
    Item: '#5a6b7d'
};

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
    if (attackerType === 'Item' || defenderType === 'Item') return false;
    // Neutral neither deals nor receives a bonus, except from Mechanic.
    if (attackerType === 'Neutral') return false;
    return SUPER_EFFECTIVE[attackerType] === defenderType;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function isItem(cardData) {
    return cardData && cardData.stage === 'Item';
}

function isCreature(cardData) {
    return cardData && cardData.stage !== 'Item';
}

/** Energy cost is generic: the cost string's length is the number required. */
function energyCost(costString) {
    return costString ? costString.length : 0;
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

function remainingHp(card) {
    return card ? card.data.hp - card.damage : 0;
}

function isFainted(card) {
    return !!card && card.damage >= card.data.hp;
}

function newEvolutionId() {
    return Math.random().toString(36).slice(2, 11);
}
