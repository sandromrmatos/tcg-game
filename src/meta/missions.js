// ============================================================================
// MISSIONS
//
// The slaymon missions (minus the three Social ones), plus set missions and
// games-vs-AI missions for the playable version. `id` is the key stored in
// the save's missionsClaimed, so never rename one once players may have
// claimed it.
//
// Collection missions count unique owned cards across ALL sets, as before.
// Progress is computed live from the save; nothing is stored but the claims.
//
// Note: card type is "Mechanic" (matching the CSV), not "Mechanical".
// ============================================================================

const Missions = (() => {
    const r = (credits, gems) => ({ credits, gems });

    const BASE = [
        { id: 'login_5',  cat: 'daily', description: 'Login on 5 different days',  type: 'login_days', target: 5,  reward: r(2, 0) },
        { id: 'login_10', cat: 'daily', description: 'Login on 10 different days', type: 'login_days', target: 10, reward: r(3, 1) },
        { id: 'login_20', cat: 'daily', description: 'Login on 20 different days', type: 'login_days', target: 20, reward: r(3, 2) },
        { id: 'login_50', cat: 'daily', description: 'Login on 50 different days', type: 'login_days', target: 50, reward: r(5, 5) },

        { id: 'unique_total_10', cat: 'collection', description: 'Collect 10 unique cards', type: 'unique_total', target: 10, reward: r(2, 0) },
        { id: 'unique_total_20', cat: 'collection', description: 'Collect 20 unique cards', type: 'unique_total', target: 20, reward: r(3, 0) },
        { id: 'unique_total_50', cat: 'collection', description: 'Collect 50 unique cards', type: 'unique_total', target: 50, reward: r(5, 2) },

        { id: 'unique_common_10', cat: 'collection', description: 'Collect 10 unique common cards', type: 'unique_rarity', rarity: 1, target: 10, reward: r(2, 0) },
        { id: 'unique_common_20', cat: 'collection', description: 'Collect 20 unique common cards', type: 'unique_rarity', rarity: 1, target: 20, reward: r(3, 1) },
        { id: 'unique_common_50', cat: 'collection', description: 'Collect 50 unique common cards', type: 'unique_rarity', rarity: 1, target: 50, reward: r(5, 2) },

        { id: 'unique_uncommon_5',  cat: 'collection', description: 'Collect 5 unique uncommon cards',  type: 'unique_rarity', rarity: 2, target: 5,  reward: r(2, 0) },
        { id: 'unique_uncommon_10', cat: 'collection', description: 'Collect 10 unique uncommon cards', type: 'unique_rarity', rarity: 2, target: 10, reward: r(3, 1) },
        { id: 'unique_uncommon_20', cat: 'collection', description: 'Collect 20 unique uncommon cards', type: 'unique_rarity', rarity: 2, target: 20, reward: r(5, 2) },

        { id: 'unique_rare_2',  cat: 'collection', description: 'Collect 2 unique rare cards',  type: 'unique_rarity', rarity: 3, target: 2,  reward: r(2, 0) },
        { id: 'unique_rare_5',  cat: 'collection', description: 'Collect 5 unique rare cards',  type: 'unique_rarity', rarity: 3, target: 5,  reward: r(3, 1) },
        { id: 'unique_rare_10', cat: 'collection', description: 'Collect 10 unique rare cards', type: 'unique_rarity', rarity: 3, target: 10, reward: r(5, 2) },

        { id: 'unique_epic_1', cat: 'collection', description: 'Collect 1 unique epic card',  type: 'unique_rarity', rarity: 4, target: 1, reward: r(2, 0) },
        { id: 'unique_epic_2', cat: 'collection', description: 'Collect 2 unique epic cards', type: 'unique_rarity', rarity: 4, target: 2, reward: r(3, 2) },
        { id: 'unique_epic_5', cat: 'collection', description: 'Collect 5 unique epic cards', type: 'unique_rarity', rarity: 4, target: 5, reward: r(5, 5) },

        { id: 'ability_2',  cat: 'collection', description: 'Collect 2 unique cards with an ability',  type: 'unique_ability', target: 2,  reward: r(2, 0) },
        { id: 'ability_5',  cat: 'collection', description: 'Collect 5 unique cards with an ability',  type: 'unique_ability', target: 5,  reward: r(3, 1) },
        { id: 'ability_10', cat: 'collection', description: 'Collect 10 unique cards with an ability', type: 'unique_ability', target: 10, reward: r(5, 2) },
        { id: 'ability_20', cat: 'collection', description: 'Collect 20 unique cards with an ability', type: 'unique_ability', target: 20, reward: r(5, 5) }
    ];

    // Per-type families, generated so the five types stay identical.
    const TYPE_TIERS = [{ n: 10, reward: r(2, 0) }, { n: 20, reward: r(3, 1) }, { n: 50, reward: r(5, 2) }];
    for (const type of ['Mystic', 'Wind', 'Neutral', 'Celestial', 'Mechanic']) {
        const key = type.toLowerCase();
        for (const t of TYPE_TIERS) {
            BASE.push({
                id: `unique_${key}_${t.n}`, cat: 'collection',
                description: `Collect ${t.n} unique ${key} cards`,
                type: 'unique_type', cardType: type, target: t.n, reward: t.reward
            });
        }
    }

    BASE.push(
        { id: 'unique_item_2',  cat: 'collection', description: 'Collect 2 unique item cards',  type: 'unique_type', cardType: 'Item', target: 2,  reward: r(2, 0) },
        { id: 'unique_item_5',  cat: 'collection', description: 'Collect 5 unique item cards',  type: 'unique_type', cardType: 'Item', target: 5,  reward: r(3, 1) },
        { id: 'unique_item_10', cat: 'collection', description: 'Collect 10 unique item cards', type: 'unique_type', cardType: 'Item', target: 10, reward: r(5, 2) },

        { id: 'unique_promo_2',  cat: 'collection', description: 'Collect 2 unique Promo cards',  type: 'unique_promo', target: 2,  reward: r(2, 0) },
        { id: 'unique_promo_5',  cat: 'collection', description: 'Collect 5 unique Promo cards',  type: 'unique_promo', target: 5,  reward: r(3, 1) },
        { id: 'unique_promo_10', cat: 'collection', description: 'Collect 10 unique Promo cards', type: 'unique_promo', target: 10, reward: r(5, 2) },

        { id: 'wheel_once',    cat: 'minigames', description: 'Play "Spin the Wheel" one time',          type: 'wheel_once',               reward: r(2, 0) },
        { id: 'wheel_days_5',  cat: 'minigames', description: 'Play "Spin the Wheel" on 5 different days',  type: 'wheel_days', target: 5,  reward: r(2, 1) },
        { id: 'wheel_days_10', cat: 'minigames', description: 'Play "Spin the Wheel" on 10 different days', type: 'wheel_days', target: 10, reward: r(3, 2) },
        { id: 'wheel_days_20', cat: 'minigames', description: 'Play "Spin the Wheel" on 20 different days', type: 'wheel_days', target: 20, reward: r(5, 3) },

        { id: 'guess_once',    cat: 'minigames', description: 'Play "Guess the Number" one time',          type: 'guess_once',               reward: r(2, 0) },
        { id: 'guess_days_5',  cat: 'minigames', description: 'Play "Guess the Number" on 5 different days',  type: 'guess_days', target: 5,  reward: r(2, 1) },
        { id: 'guess_days_10', cat: 'minigames', description: 'Play "Guess the Number" on 10 different days', type: 'guess_days', target: 10, reward: r(3, 2) },
        { id: 'guess_days_20', cat: 'minigames', description: 'Play "Guess the Number" on 20 different days', type: 'guess_days', target: 20, reward: r(5, 3) }
    );

    // ---- New: per-set missions, generated from the set registry ----
    const SET_MISSIONS = [];
    for (const set of cardSets) {
        for (const t of [{ n: 10, reward: r(2, 0) }, { n: 25, reward: r(3, 1) }, { n: 50, reward: r(5, 2) }]) {
            SET_MISSIONS.push({
                id: `set_${set.id}_${t.n}`, cat: 'sets',
                description: `Collect ${t.n} unique ${set.name} cards`,
                type: 'set_unique', setId: set.id, target: t.n, reward: t.reward
            });
        }
        SET_MISSIONS.push({
            id: `set_${set.id}_complete`, cat: 'sets',
            description: `Complete the ${set.name} set (every non-promo card)`,
            type: 'set_complete', setId: set.id, reward: r(5, 5)
        });
    }
    for (const set of cardSets.slice(1)) {
        SET_MISSIONS.push({
            id: `unlock_${set.id}`, cat: 'sets',
            description: `Unlock the ${set.name} set`,
            type: 'set_unlocked', setId: set.id, reward: r(5, 3)
        });
    }

    // ---- New: games against the AI ----
    const aiDeckCount = typeof presetDeckLists !== 'undefined' ? presetDeckLists.length : 8;
    const GAME_MISSIONS = [
        { id: 'play_1',  cat: 'games', description: 'Play your first game against the AI', type: 'games_played', target: 1,  reward: r(2, 0) },
        { id: 'play_10', cat: 'games', description: 'Play 10 games against the AI',         type: 'games_played', target: 10, reward: r(3, 1) },
        { id: 'play_50', cat: 'games', description: 'Play 50 games against the AI',         type: 'games_played', target: 50, reward: r(5, 2) },
        { id: 'win_1',   cat: 'games', description: 'Win your first game against the AI', type: 'games_won', target: 1,   reward: r(2, 0) },
        { id: 'win_5',   cat: 'games', description: 'Win 5 games against the AI',         type: 'games_won', target: 5,   reward: r(3, 0) },
        { id: 'win_10',  cat: 'games', description: 'Win 10 games against the AI',        type: 'games_won', target: 10,  reward: r(3, 1) },
        { id: 'win_25',  cat: 'games', description: 'Win 25 games against the AI',        type: 'games_won', target: 25,  reward: r(5, 2) },
        { id: 'win_50',  cat: 'games', description: 'Win 50 games against the AI',        type: 'games_won', target: 50,  reward: r(5, 3) },
        { id: 'win_100', cat: 'games', description: 'Win 100 games against the AI',       type: 'games_won', target: 100, reward: r(5, 5) },
        { id: 'streak_3', cat: 'games', description: 'Win 3 games in a row', type: 'win_streak', target: 3, reward: r(3, 1) },
        { id: 'streak_5', cat: 'games', description: 'Win 5 games in a row', type: 'win_streak', target: 5, reward: r(5, 2) },
        { id: 'beat_4',   cat: 'games', description: 'Beat 4 different AI decks', type: 'opponents_beaten', target: Math.min(4, aiDeckCount), reward: r(3, 1) },
        { id: 'beat_all', cat: 'games', description: `Beat every AI deck at least once (${aiDeckCount})`, type: 'opponents_beaten', target: aiDeckCount, reward: r(5, 3) }
    ];

    const ALL = BASE.concat(SET_MISSIONS, GAME_MISSIONS);

    const CATEGORIES = [
        { id: 'all', name: 'All' },
        { id: 'collection', name: 'Collection' },
        { id: 'sets', name: 'Sets' },
        { id: 'games', name: 'Games vs AI' },
        { id: 'minigames', name: 'Mini-games' },
        { id: 'daily', name: 'Login' }
    ];

    /** Everything the mission states are computed from, in one pass. */
    function progress() {
        const s = Profile.s;
        const p = {
            total: 0, byRarity: { 1: 0, 2: 0, 3: 0, 4: 0 }, byType: {}, promo: 0, ability: 0, bySet: {},
            loginDays: Object.keys(s.loginDays).length,
            wheelDays: Object.keys(s.wheelDays).length,
            guessDays: Object.keys(s.guessDays).length,
            played: s.stats.played,
            won: s.stats.won,
            bestStreak: s.stats.bestStreak,
            opponentsBeaten: Object.values(s.stats.byOpponent).filter(o => o.won > 0).length
        };
        for (const [id, qty] of Object.entries(s.cards)) {
            if (!(qty > 0)) continue;
            const c = getCardData(id);
            if (!c) continue;
            p.total++;
            p.byRarity[c.rarity] = (p.byRarity[c.rarity] || 0) + 1;
            p.byType[getCardType(c)] = (p.byType[getCardType(c)] || 0) + 1;
            if (c.promo) p.promo++;
            if (Collection.hasAbility(c)) p.ability++;
            p.bySet[c.set] = (p.bySet[c.set] || 0) + 1;
        }
        return p;
    }

    const numeric = (have, target) => ({ current: Math.min(have, target), target, completed: have >= target });
    const flag = done => ({ current: null, target: null, completed: !!done });

    function state(m, p) {
        switch (m.type) {
            case 'unique_total':     return numeric(p.total, m.target);
            case 'unique_rarity':    return numeric(p.byRarity[m.rarity] || 0, m.target);
            case 'unique_type':      return numeric(p.byType[m.cardType] || 0, m.target);
            case 'unique_promo':     return numeric(p.promo, m.target);
            case 'unique_ability':   return numeric(p.ability, m.target);
            case 'login_days':       return numeric(p.loginDays, m.target);
            case 'wheel_days':       return numeric(p.wheelDays, m.target);
            case 'guess_days':       return numeric(p.guessDays, m.target);
            case 'wheel_once':       return flag(p.wheelDays >= 1);
            case 'guess_once':       return flag(p.guessDays >= 1);
            case 'set_unique':       return numeric(p.bySet[m.setId] || 0, m.target);
            case 'set_complete': {
                const sp = Profile.setProgress(m.setId);
                return numeric(sp.ownedNonPromo, sp.totalNonPromo);
            }
            case 'set_unlocked':     return flag(Profile.isSetUnlocked(m.setId));
            case 'games_played':     return numeric(p.played, m.target);
            case 'games_won':        return numeric(p.won, m.target);
            case 'win_streak':       return numeric(p.bestStreak, m.target);
            case 'opponents_beaten': return numeric(p.opponentsBeaten, m.target);
            default:                 return flag(false);
        }
    }

    /** Missions with progress, unclaimed first and claimed at the bottom. */
    function list() {
        Profile.regen();
        const p = progress();
        const room = MAX_CREDITS - Profile.s.credits;
        const rows = ALL.map(m => {
            const st = state(m, p);
            const claimed = !!Profile.s.missionsClaimed[m.id];
            const canClaim = st.completed && !claimed && (m.reward.credits === 0 || room >= m.reward.credits);
            const blockedByCap = st.completed && !claimed && !canClaim;
            return Object.assign({}, m, st, { claimed, canClaim, blockedByCap });
        });
        // Ready to claim first, then completed-but-blocked by the credit cap,
        // then the rest in progress, then claimed at the bottom.
        return rows.filter(m => m.canClaim)
            .concat(rows.filter(m => m.blockedByCap))
            .concat(rows.filter(m => !m.claimed && !m.canClaim && !m.blockedByCap))
            .concat(rows.filter(m => m.claimed));
    }

    function claimableCount() {
        return list().filter(m => m.canClaim).length;
    }

    return {
        all: ALL,
        CATEGORIES,
        find: id => ALL.find(m => m.id === id) || null,
        progress,
        state,
        list,
        claimableCount
    };
})();
