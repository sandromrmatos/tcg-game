// ============================================================================
// PER-CARD ACHIEVEMENTS
//
// Every card in every set (all stages, items and promos included) has the same
// list of tasks. Creatures have 9, items the first 7. Completing 5, 7 and 9
// tasks unlocks the Bronze, Silver and Gold rewards.
//
// Counters are recorded by Profile.recordCardAchievements at the end of each
// real game (QA games never count). Progress is computed live from them here;
// only the claims are stored separately. Task and tier ids are stored in the
// save, so never rename one once players may have progress on it.
// ============================================================================

/** The deck types a win can be credited against, in task order. */
const CARD_ACH_OPPONENT_TYPES = ['Mystic', 'Wind', 'Neutral', 'Celestial', 'Mechanic'];

const CARD_ACH_TYPE_ICONS = { Mystic: '🔮', Wind: '🌪️', Neutral: '⚪', Celestial: '🌿', Mechanic: '⚙️' };

/**
 * The tasks, in display order. `creaturesOnly` tasks don't apply to items,
 * which is why items have 7 tasks rather than 9.
 */
const CARD_ACH_TASKS = [
    { id: 'own2', icon: '🗂️', label: 'Own 2 copies of this card', target: 2, kind: 'own' },
    ...CARD_ACH_OPPONENT_TYPES.map(type => ({
        id: `vs${type}`, icon: CARD_ACH_TYPE_ICONS[type], target: 3, kind: 'vs', type,
        label: `Win 3 games against a ${type} deck with this card`
    })),
    { id: 'wins20', icon: '🏆', label: 'Win 20 games with this card', target: 20, kind: 'wins' },
    { id: 'attacks5', icon: '⚔️', label: 'Use an attack from this card 5 times', target: 5, kind: 'attacks', creaturesOnly: true,
      hint: 'Attacks that deal no damage count too.' },
    { id: 'survive3', icon: '🛡️', label: 'Have this card still in play, not knocked out, at the end of 3 wins', target: 3, kind: 'survived', creaturesOnly: true }
];

/**
 * Rewards by the number of tasks completed. Gold needs all 9, so items, with
 * 7 tasks, top out at Silver.
 */
const CARD_ACH_TIERS = [
    { id: 'bronze', label: 'Bronze', tasks: 5, reward: { credits: 1, gemChance: 0.10 } },
    { id: 'silver', label: 'Silver', tasks: 7, reward: { credits: 1, gemChance: 0.25 } },
    { id: 'gold',   label: 'Gold',   tasks: 9, reward: { promo: true } }
];

const CardAchievements = {
    TASKS: CARD_ACH_TASKS,
    TIERS: CARD_ACH_TIERS,

    tasksFor(card) {
        return CARD_ACH_TASKS.filter(t => !t.creaturesOnly || isCreature(card));
    },

    tiersFor(card) {
        const count = this.tasksFor(card).length;
        return CARD_ACH_TIERS.filter(t => t.tasks <= count);
    },

    /** Human-readable reward for a tier. */
    rewardLabel(tier) {
        if (tier.reward.promo) return '🎁 Random promo card';
        return `🪙 +${tier.reward.credits} · ${Math.round(tier.reward.gemChance * 100)}% 💜`;
    },

    /**
     * Full state for one card: each task's progress, how many are done, the
     * tier reached, and which tiers can be claimed now.
     */
    state(cardId) {
        const card = getCardData(cardId);
        if (!card || typeof Profile === 'undefined' || !Profile.s) return null;
        const rec = Profile.s.cardAch[cardId] || Profile.blankCardAch();
        const claimed = Profile.s.cardAchClaimed[cardId] || {};

        const progressOf = task => {
            switch (task.kind) {
                case 'own':      return Profile.owned(cardId);
                case 'vs':       return rec.vs[task.type] || 0;
                case 'wins':     return rec.wins;
                case 'attacks':  return rec.attacks;
                case 'survived': return rec.survived;
                default:         return 0;
            }
        };

        const tasks = this.tasksFor(card).map(task => {
            const progress = progressOf(task);
            return { def: task, progress: Math.min(progress, task.target), target: task.target, done: progress >= task.target };
        });
        const done = tasks.filter(t => t.done).length;

        const room = MAX_CREDITS - Profile.s.credits;
        const tiers = this.tiersFor(card).map(t => {
            const reached = done >= t.tasks;
            const isClaimed = !!claimed[t.id];
            const blockedByCap = reached && !isClaimed && !!t.reward.credits && room < t.reward.credits;
            return Object.assign({}, t, {
                reached,
                claimed: isClaimed,
                claimable: reached && !isClaimed && !blockedByCap,
                blockedByCap
            });
        });
        const top = tiers.filter(t => t.reached).pop() || null;

        return {
            card, tasks, done, total: tasks.length, tiers,
            tier: top ? top.id : null,
            claimable: tiers.filter(t => t.claimable).length,
            // Reached and unclaimed, including those waiting for credit room.
            waiting: tiers.filter(t => t.reached && !t.claimed).length
        };
    },

    /** Rewards ready to claim, across every card or one set. */
    claimableCount(setId = null) {
        if (typeof Profile === 'undefined' || !Profile.s) return 0;
        Profile.regen();
        const cards = setId ? CardIndex.inSet(setId) : cardDatabase;
        let n = 0;
        for (const card of cards) {
            // Only cards with any progress or ownership can have a tier reached.
            if (!Profile.s.cardAch[card.id] && Profile.owned(card.id) < 2) continue;
            const st = this.state(card.id);
            if (st) n += st.claimable;
        }
        return n;
    },

    /** Tier tallies for one set, for the page header. */
    setSummary(setId) {
        const out = { bronze: 0, silver: 0, gold: 0, total: 0, claimable: 0 };
        for (const card of CardIndex.inSet(setId)) {
            out.total++;
            const st = this.state(card.id);
            if (!st) continue;
            if (st.tier) out[st.tier]++;
            out.claimable += st.claimable;
        }
        return out;
    }
};
