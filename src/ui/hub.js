// ============================================================================
// HUB — the collection side of the game
//
// The main screen (#deck-screen) is now a hub: a header with credits, gems,
// the next-credit timer, music and Info, a tab bar, and one page per feature:
//   Play (your decks vs the AI) · Card Dex · Draw a Card · Store · Missions ·
//   Spin the Wheel · Guess the Number · Memory Game · Collection · Stats ·
//   Save data
// Pages are rebuilt from Profile state whenever they are shown or acted on.
// ============================================================================

/** Tiny DOM builder: h('div', { class: 'x', text: 'y', on: { click } }, ...children) */
function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
        if (value === undefined || value === null || value === false) continue;
        if (key === 'class') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key === 'on') for (const [ev, fn] of Object.entries(value)) el.addEventListener(ev, fn);
        else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key in el && typeof value !== 'string') el[key] = value;
        else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) {
        if (child === null || child === undefined || child === false) continue;
        el.appendChild(typeof child === 'string' || typeof child === 'number'
            ? document.createTextNode(String(child)) : child);
    }
    return el;
}

function fmtReward(reward) {
    const parts = [];
    if (reward.credits > 0) parts.push(`🪙 +${reward.credits}`);
    if (reward.gems > 0) parts.push(`💜 +${reward.gems}`);
    return parts.join('  ');
}

function fmtWon(credits, gems) {
    const parts = [];
    if (credits > 0) parts.push(plural(credits, 'credit'));
    if (gems > 0) parts.push(plural(gems, 'gem'));
    return parts.join(' and ');
}

function pct(a, b) {
    return b > 0 ? Math.round((a / b) * 100) : 0;
}

function progressBar(current, target, extraClass = '') {
    return h('div', { class: `progress-track ${extraClass}` },
        h('div', { class: 'progress-fill', style: { width: `${Math.min(100, pct(current, target))}%` } }));
}

const MUSIC_TRACKS = [
    { name: 'Hidden Glade', file: 'Hidden-Glade.mp3' },
    { name: 'Haunted Corridor', file: 'Haunted-Corridor.mp3' },
    { name: 'Pocket Kingdom', file: 'Pocket-Kingdom.mp3' }
];

const WHEEL_COLORS = ['#4a4a6a', '#66bb6a', '#4a4a6a', '#42a5f5', '#4a4a6a', '#ffd700', '#4a4a6a', '#ab47bc', '#4a4a6a', '#7b1fa2'];

const Hub = {
    page: 'play',
    navLocked: false,
    dexSet: null,
    storeSet: null,
    missionCat: 'all',
    draw: { busy: false, cooldownUntil: 0, last: null, error: '' },
    wheel: { rotation: 0, spinning: false, result: null, error: '' },
    guessUi: { feedback: '', result: null, error: '' },
    mem: { images: {}, matched: [], pending: [], busy: false, result: null, error: '' },
    music: { index: 0, playing: false },
    _today: null,

    PAGES: [
        { id: 'play',       label: '⚔️ Play' },
        { id: 'dex',        label: '📚 Card Dex' },
        { id: 'draw',       label: '🎰 Draw a Card' },
        { id: 'store',      label: '🛒 Store' },
        { id: 'missions',   label: '📋 Missions' },
        { id: 'wheel',      label: '🎡 Spin the Wheel' },
        { id: 'guess',      label: '🎯 Guess the Number' },
        { id: 'memory',     label: '🧠 Memory Game' },
        { id: 'collection', label: '📈 Collection' },
        { id: 'stats',      label: '🏆 Stats' },
        { id: 'save',       label: '💾 Save data' }
    ],

    // -----------------------------------------------------------------------
    // Setup
    // -----------------------------------------------------------------------

    init() {
        this.dexSet = cardSets[0].id;
        this.storeSet = cardSets[0].id;
        this._today = dayKey();

        const nav = document.getElementById('hub-nav');
        nav.innerHTML = '';
        for (const p of this.PAGES) {
            nav.appendChild(h('button', {
                class: 'hub-tab', type: 'button', dataset: { page: p.id },
                on: { click: () => this.showPage(p.id) }
            }, p.label, h('span', { class: 'hub-tab-badge', dataset: { badge: p.id } })));
        }

        const infoBtn = document.getElementById('hub-info-btn');
        if (infoBtn) infoBtn.addEventListener('click', () => Screens.openModal('hub-info-modal'));

        this.initAudio();

        Profile.subscribe((s, reason) => {
            this.renderHeader();
            if (reason === 'unlock') {
                for (const set of cardSets) {
                    if (this._announced && !this._announced.has(set.id) && Profile.isSetUnlocked(set.id)) {
                        this._announced.add(set.id);
                        this.celebrateUnlock(set);
                    }
                }
            }
            if (reason === 'save-blocked') this.renderNotices();
            if ((reason === 'saved' || reason === 'save-blocked') && this.page === 'save') this.renderSave();
        });
        this._announced = new Set(cardSets.filter(s => Profile.isSetUnlocked(s.id)).map(s => s.id));
        Persist.onStatusChange = () => { if (this.page === 'save') this.renderSave(); };

        // Keep the save current when the app goes to the background.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) Profile.flush({ urgent: true });
            else this.tick();
        });
        window.addEventListener('pagehide', () => Profile.flush({ urgent: true }));

        setInterval(() => this.tick(), 1000);
        this.renderHeader();
        this.renderNotices();
    },

    /** Once a second: credit regeneration, the timer, and a new day. */
    tick() {
        if (!Profile.s) return;
        let changed = Profile.regen();
        const today = dayKey();
        if (today !== this._today) {
            this._today = today;
            if (Profile.markLoginDay()) changed = true;
            if (this.page !== 'draw' && this.page !== 'guess' && this.page !== 'memory') this.renderPage();
        }
        if (changed) Profile.touch('regen');
        else this.renderHeader();
    },

    renderHeader() {
        if (!Profile.s) return;
        setText('hub-credits', Profile.s.credits);
        setText('hub-credits-max', MAX_CREDITS);
        setText('hub-gems', Profile.s.gems);

        const timer = document.getElementById('hub-timer');
        if (timer) {
            const ms = Profile.msUntilNextCredit();
            if (Profile.s.credits >= MAX_CREDITS) {
                timer.textContent = 'Credits full';
            } else {
                const m = Math.floor(ms / 60000), sec = Math.floor((ms % 60000) / 1000);
                timer.textContent = `⏰ next credit in ${m}:${String(sec).padStart(2, '0')}`;
            }
        }
        const sunday = document.getElementById('hub-sunday');
        if (sunday) sunday.classList.toggle('show', isSundayToday());

        const badge = document.querySelector('[data-badge="missions"]');
        if (badge) {
            const n = Missions.claimableCount();
            badge.textContent = n > 0 ? String(n) : '';
            badge.classList.toggle('show', n > 0);
        }
    },

    /** Messages that need the player's attention: boot notices and a blocked save. */
    renderNotices() {
        const host = document.getElementById('hub-notices');
        if (!host) return;
        host.innerHTML = '';
        for (const text of Profile.bootNotices) {
            host.appendChild(h('div', { class: 'hub-notice' }, text,
                h('button', { class: 'hub-notice-close', type: 'button', text: '×', on: { click: () => {
                    Profile.bootNotices = Profile.bootNotices.filter(t => t !== text);
                    this.renderNotices();
                } } })));
        }
        const g = Profile.saveBlocked;
        if (g) {
            host.appendChild(h('div', { class: 'hub-notice hub-notice-bad' },
                h('b', { text: 'Saving is paused. ' }),
                `This device still holds a save with ${g.existing.unique} unique cards ` +
                `(saved ${g.existingSavedAt ? new Date(g.existingSavedAt).toLocaleString() : 'earlier'}), ` +
                'but the game is running an empty account. Nothing has been overwritten. ' +
                'Reload to try loading it again, or use Reset all progress in Save data if you really want to start over.'));
        }
    },

    toast(text, kind = 'info') {
        const map = { good: 'heal', bad: 'ko', warn: 'warn', gold: 'point', info: 'info' };
        Log.toast(text, { kind: map[kind] || 'info' });
    },

    celebrateUnlock(set) {
        this.dialog({
            title: `🎉 ${set.name} unlocked!`,
            message: `You collected 90% of the previous set, so ${set.name} cards can now be drawn, bought and used in decks.`,
            buttons: [{ label: 'Awesome!', value: true, kind: 'primary' }]
        });
    },

    // -----------------------------------------------------------------------
    // Dialog (confirm / alert / password)
    // -----------------------------------------------------------------------

    /**
     * @param {object} opts { title, message, input: {type, placeholder}, buttons: [{label, value, kind}] }
     * @returns {Promise<{value, text}>} value is false when dismissed with Escape
     */
    dialog(opts) {
        return new Promise(resolve => {
            const modal = document.getElementById('hub-dialog');
            const input = document.getElementById('hub-dialog-input');
            const foot = document.getElementById('hub-dialog-buttons');
            setText('hub-dialog-title', opts.title || '');
            setText('hub-dialog-message', opts.message || '');

            input.value = '';
            input.style.display = opts.input ? '' : 'none';
            if (opts.input) {
                input.type = opts.input.type || 'text';
                input.placeholder = opts.input.placeholder || '';
            }

            const buttons = opts.buttons && opts.buttons.length ? opts.buttons : [{ label: 'OK', value: true, kind: 'primary' }];
            const primary = buttons.find(b => b.kind === 'primary' || b.kind === 'danger') || buttons[buttons.length - 1];

            const finish = value => {
                modal.classList.remove('modal-show');
                window.removeEventListener('keydown', onKey, true);
                resolve({ value, text: input.value });
            };
            const onKey = e => {
                if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); finish(false); }
                else if (e.key === 'Enter' && opts.input) { e.stopPropagation(); e.preventDefault(); finish(primary.value); }
            };

            foot.innerHTML = '';
            for (const b of buttons) {
                foot.appendChild(h('button', {
                    class: `btn ${b.kind === 'primary' ? 'btn-primary' : b.kind === 'danger' ? 'btn-danger' : 'btn-ghost'}`,
                    type: 'button', text: b.label, on: { click: () => finish(b.value) }
                }));
            }

            window.addEventListener('keydown', onKey, true);
            modal.classList.add('modal-show');
            setTimeout(() => (opts.input ? input : foot.lastChild).focus(), 30);
        });
    },

    alert(title, message) {
        return this.dialog({ title, message, buttons: [{ label: 'OK', value: true, kind: 'primary' }] });
    },

    async confirm(title, message, okLabel = 'OK', kind = 'primary') {
        const r = await this.dialog({ title, message, buttons: [{ label: 'Cancel', value: false }, { label: okLabel, value: true, kind }] });
        return !!(r && r.value);
    },

    // -----------------------------------------------------------------------
    // Navigation
    // -----------------------------------------------------------------------

    showPage(id) {
        if (this.navLocked && id !== this.page) {
            this.toast('Guess the number correctly before leaving!', 'warn');
            return;
        }
        this.page = id;
        document.querySelectorAll('.hub-tab').forEach(t => t.classList.toggle('active', t.dataset.page === id));
        document.querySelectorAll('.hub-page').forEach(p => p.classList.toggle('active', p.id === `page-${id}`));
        const active = document.querySelector('.hub-tab.active');
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        this.renderPage();
    },

    renderPage() {
        const renderers = {
            play: () => this.renderPlay(),
            dex: () => this.renderDex(),
            draw: () => this.renderDraw(),
            store: () => this.renderStore(),
            missions: () => this.renderMissions(),
            wheel: () => this.renderWheel(),
            guess: () => this.renderGuess(),
            memory: () => this.renderMemory(),
            collection: () => this.renderCollection(),
            stats: () => this.renderStats(),
            save: () => this.renderSave()
        };
        (renderers[this.page] || renderers.play)();
        this.renderHeader();
    },

    pageHost(id) {
        const host = document.getElementById(`page-${id}`);
        host.innerHTML = '';
        return host;
    },

    pageTitle(title, subtitle) {
        return h('div', { class: 'page-head' }, h('h2', { text: title }), subtitle ? h('p', { class: 'page-sub', text: subtitle }) : null);
    },

    notice(text, kind = '') {
        return h('div', { class: `page-notice ${kind}` }, text);
    },

    /** Previous/next arrows over the set registry, with the lock state shown. */
    setSwitcher(current, onChange) {
        const index = cardSets.findIndex(s => s.id === current);
        const set = cardSets[index];
        const locked = !Profile.isSetUnlocked(set.id);
        return h('div', { class: 'set-switcher' },
            h('button', {
                class: 'set-arrow', type: 'button', text: '←', disabled: index <= 0,
                on: { click: () => onChange(cardSets[index - 1].id) }
            }),
            h('span', { class: 'set-name', text: (locked ? '🔒 ' : '') + set.name }),
            h('button', {
                class: 'set-arrow', type: 'button', text: '→', disabled: index >= cardSets.length - 1,
                on: { click: () => onChange(cardSets[index + 1].id) }
            }));
    },

    lockNotice(setId) {
        const req = Profile.unlockRequirement(setId);
        if (!req) return null;
        return this.notice(
            `🔒 This set unlocks when you own ${req.needed} of the ${req.total} non-promo ${req.prevSet.name} cards (90%). ` +
            `You have ${req.have}. Promo cards don't count.`, 'locked');
    },

    // -----------------------------------------------------------------------
    // Play
    // -----------------------------------------------------------------------

    renderPlay() {
        const st = Profile.preMatchNotice();
        const summary = document.getElementById('play-summary');
        if (summary) {
            summary.textContent = `Win a game against the AI to earn 1 credit (up to ${WIN_CREDITS_PER_DAY} a day). ` +
                `Win credits today: ${st.winCreditsToday}/${WIN_CREDITS_PER_DAY}.` +
                (st.creditsFull ? ` Your credits are full, so a win won't earn one right now.` : '');
        }
        Screens.renderDeckList();
    },

    // -----------------------------------------------------------------------
    // Card Dex
    // -----------------------------------------------------------------------

    renderDex() {
        const host = this.pageHost('dex');
        const setId = this.dexSet;
        const p = Profile.setProgress(setId);
        host.appendChild(this.pageTitle('📚 Card Dex', 'Every card in the set and how many of each you own. Tap a card you own for details.'));
        host.appendChild(this.setSwitcher(setId, id => { this.dexSet = id; this.renderDex(); }));
        host.appendChild(h('p', { class: 'set-progress-line' },
            `Owned ${p.owned}/${p.total} · Non-promo ${p.ownedNonPromo}/${p.totalNonPromo} · ${p.copies} copies`));

        const locked = !Profile.isSetUnlocked(setId);
        if (locked) host.appendChild(this.lockNotice(setId));

        const grid = h('div', { class: 'cards-grid' + (locked ? ' grid-locked' : '') });
        for (const card of Collection.setCards(setId)) {
            const qty = Profile.owned(card.id);
            const rarity = Collection.rarity(card.rarity);
            grid.appendChild(h('div', {
                class: `card-item ${qty === 0 ? 'not-owned' : ''}`,
                title: qty > 0 ? card.name : 'Not collected yet',
                on: { click: () => { if (qty > 0) this.showCardModal(card); } }
            },
                h('img', { src: cardImage(card.id), alt: qty > 0 ? card.name : 'Unknown card', loading: 'lazy' }),
                qty > 0 ? h('div', { class: 'card-quantity', text: String(qty) }) : null,
                h('span', { class: 'card-rarity', title: rarity.name, text: rarity.icon }),
                card.promo ? h('span', { class: 'card-promo', text: 'PROMO' }) : null));
        }
        host.appendChild(grid);
    },

    showCardModal(card) {
        const body = document.getElementById('hub-card-body');
        body.innerHTML = '';
        const rarity = Collection.rarity(card.rarity);
        body.appendChild(h('img', { class: 'card-modal-img', src: cardImage(card.id), alt: card.name }));
        body.appendChild(h('div', { class: 'card-details' },
            h('h3', { text: card.name }),
            h('p', { class: 'card-type', style: { color: rarity.color } }, `${card.type} • ${rarity.icon} ${rarity.name}${card.promo ? ' • Promo' : ''}`),
            h('p', { text: `${card.stage}${card.hp ? ` · HP ${card.hp}` : ''}` }),
            card.abilityName ? h('p', { text: `Ability: ${card.abilityName}` }) : null,
            h('p', { class: 'owned-count', text: `You own: ${Profile.owned(card.id)}` })));
        Screens.openModal('hub-card-modal');
    },

    // -----------------------------------------------------------------------
    // Draw a Card
    // -----------------------------------------------------------------------

    renderDraw() {
        const host = this.pageHost('draw');
        const d = this.draw;
        let setId = Profile.s.drawSet;
        if (!Profile.isSetUnlocked(setId)) setId = cardSets[0].id;

        host.appendChild(this.pageTitle('🎰 Draw a Card',
            `Spend 1 credit for a random card. Odds: 🟢 55% · 🔵 28% · ⭐ 13% · 💎 4%.` +
            (isSundayToday() ? ' 🎉 It\'s Sunday: Promo cards can be drawn today!' : ' Promo cards can only be drawn on Sundays.')));

        const tabs = h('div', { class: 'set-tabs center' });
        for (const set of cardSets) {
            const open = Profile.isSetUnlocked(set.id);
            tabs.appendChild(h('button', {
                class: `set-tab ${set.id === setId ? 'set-tab-active' : ''}`, type: 'button',
                disabled: !open || d.busy, title: open ? `Draw from ${set.name}` : 'Locked',
                text: (open ? '' : '🔒 ') + set.name,
                on: { click: () => { Profile.s.drawSet = set.id; Profile.touch('draw-set'); this.renderDraw(); } }
            }));
        }
        host.appendChild(tabs);

        const lockedSet = cardSets.find(s => !Profile.isSetUnlocked(s.id));
        if (lockedSet) host.appendChild(this.lockNotice(lockedSet.id));

        const area = h('div', { class: 'panel draw-area' });
        if (d.error) area.appendChild(this.notice(d.error, 'bad'));

        if (d.busy) {
            area.appendChild(h('div', { class: 'spinner-container' }, h('div', { class: 'spinner' }), h('p', { text: 'Drawing your card...' })));
        } else if (d.last) {
            const c = d.last.card, rarity = Collection.rarity(c.rarity);
            area.appendChild(h('div', { class: 'card-display' },
                d.last.isNew ? h('div', { class: 'new-banner', text: '🌟 NEW 🌟' }) : null,
                h('img', { src: cardImage(c.id), alt: c.name, on: { click: () => this.showCardModal(c) } }),
                h('div', { class: 'card-info' },
                    h('h3', { text: c.name }),
                    h('p', { class: 'type', text: c.type + (c.promo ? ' · Promo' : '') }),
                    h('div', { class: 'rarity', text: `${rarity.icon} Rarity: ${rarity.name}` }),
                    h('p', { class: 'quantity', text: `You now own: ${d.last.quantity}` }))));
        } else {
            area.appendChild(h('div', { class: 'empty-state', text: 'Click the button below to draw a card!' }));
        }

        const waiting = Date.now() < d.cooldownUntil;
        const noCredits = Profile.s.credits < 1;
        area.appendChild(h('button', {
            class: 'btn btn-primary btn-lg big-btn', type: 'button',
            disabled: d.busy || waiting || noCredits,
            text: d.busy ? 'Drawing...' : waiting ? 'Wait 5 seconds...' : noCredits ? 'No credits left' : 'Draw Card (1 🪙)',
            on: { click: () => this.doDraw(setId) }
        }));
        if (noCredits && !d.busy) {
            area.appendChild(h('p', { class: 'page-sub', text: 'Credits come back at 1 per hour. Missions, mini-games and wins against the AI give more.' }));
        }
        host.appendChild(area);
    },

    doDraw(setId) {
        const d = this.draw;
        if (d.busy) return;
        d.error = '';
        // The draw is decided and saved first, so refreshing mid-animation can't re-roll it.
        const res = Profile.draw(setId);
        if (res.error) { d.error = res.error; this.renderDraw(); return; }
        d.busy = true;
        d.last = null;
        this.renderDraw();
        setTimeout(() => {
            d.busy = false;
            d.last = res;
            d.cooldownUntil = Date.now() + 5000;
            if (this.page === 'draw') this.renderDraw();
            setTimeout(() => { if (this.page === 'draw' && !d.busy) this.renderDraw(); }, 5050);
        }, 2000);
    },

    // -----------------------------------------------------------------------
    // Store
    // -----------------------------------------------------------------------

    renderStore() {
        const host = this.pageHost('store');
        const setId = this.storeSet;
        host.appendChild(this.pageTitle('🛒 Store',
            'Buy any specific card with gems. Prices: 🟢 Common 1 · 🔵 Uncommon 5 · ⭐ Rare 10 · 💎 Epic 20.'));
        host.appendChild(h('p', { class: 'store-gems', text: `💜 ${Profile.s.gems} Gems` }));
        host.appendChild(this.setSwitcher(setId, id => { this.storeSet = id; this.renderStore(); }));

        const locked = !Profile.isSetUnlocked(setId);
        if (locked) host.appendChild(this.lockNotice(setId));

        const grid = h('div', { class: 'cards-grid' + (locked ? ' grid-locked' : '') });
        for (const card of Collection.setCards(setId)) {
            const qty = Profile.owned(card.id);
            grid.appendChild(h('div', {
                class: `card-item ${qty === 0 ? 'store-not-owned' : ''}`,
                on: { click: () => { if (!locked) this.showStoreModal(card); } }
            },
                h('img', { src: cardImage(card.id), alt: card.name, loading: 'lazy' }),
                h('div', { class: 'card-quantity', text: String(qty) }),
                h('span', { class: 'card-price', text: `💜 ${Profile.cardCost(card)}` })));
        }
        host.appendChild(grid);
    },

    showStoreModal(card, error = '') {
        const body = document.getElementById('hub-store-body');
        body.innerHTML = '';
        const rarity = Collection.rarity(card.rarity);
        const cost = Profile.cardCost(card);
        const canAfford = Profile.s.gems >= cost;
        body.appendChild(h('div', { class: 'card-details' },
            h('h3', { text: card.name }),
            h('p', { class: 'card-type', style: { color: rarity.color } }, `${card.type} • ${rarity.icon} ${rarity.name}${card.promo ? ' • Promo' : ''}`),
            h('p', { class: 'owned-count', text: `You own: ${Profile.owned(card.id)}` }),
            h('div', { class: 'buy-box' },
                h('p', { class: 'buy-cost', text: `Cost: 💜 ${cost}  (you have ${Profile.s.gems})` }),
                error ? h('p', { class: 'buy-error', text: error }) : null,
                h('button', {
                    class: 'btn btn-primary', type: 'button', disabled: !canAfford,
                    text: canAfford ? 'Buy' : 'Not enough gems',
                    on: { click: () => {
                        const res = Profile.buy(card.id);
                        if (res.error) { this.showStoreModal(card, res.error); return; }
                        this.toast(`Bought ${card.name}${res.isNew ? ' (new!)' : ''}`, 'good');
                        this.showStoreModal(card);
                        this.renderStore();
                    } }
                }))));
        Screens.openModal('hub-store-modal');
    },

    // -----------------------------------------------------------------------
    // Missions
    // -----------------------------------------------------------------------

    renderMissions(error = '') {
        const host = this.pageHost('missions');
        host.appendChild(this.pageTitle('📋 Missions', 'Complete missions to earn credits and gems.'));

        const tabs = h('div', { class: 'set-tabs center' });
        for (const c of Missions.CATEGORIES) {
            tabs.appendChild(h('button', {
                class: `set-tab ${this.missionCat === c.id ? 'set-tab-active' : ''}`, type: 'button', text: c.name,
                on: { click: () => { this.missionCat = c.id; this.renderMissions(); } }
            }));
        }
        host.appendChild(tabs);
        if (error) host.appendChild(this.notice(error, 'bad'));

        const list = h('div', { class: 'missions-list' });
        for (const m of Missions.list()) {
            if (this.missionCat !== 'all' && m.cat !== this.missionCat) continue;
            list.appendChild(h('div', { class: `mission-card ${m.claimed ? 'claimed' : ''} ${m.canClaim ? 'ready' : ''}` },
                h('div', { class: 'mission-info' },
                    h('div', { class: 'mission-description', text: m.description }),
                    m.target !== null ? h('div', { class: 'mission-progress' },
                        progressBar(m.current, m.target),
                        h('span', { class: 'progress-label', text: `${m.current}/${m.target}` })) : null,
                    h('div', { class: 'mission-reward', text: fmtReward(m.reward) }),
                    m.blockedByCap ? h('div', { class: 'mission-cap', text: `Not enough room under the ${MAX_CREDITS}-credit cap. Spend some credits to claim.` }) : null),
                h('button', {
                    class: 'btn btn-primary claim-btn', type: 'button',
                    disabled: !m.canClaim, text: m.claimed ? 'Claimed' : 'Claim',
                    on: { click: () => {
                        const res = Profile.claimMission(m.id);
                        if (res.error) { this.renderMissions(res.error); return; }
                        this.toast(`Claimed ${fmtReward(res.reward)}`, 'gold');
                        this.renderMissions();
                    } }
                })));
        }
        host.appendChild(list);
    },

    // -----------------------------------------------------------------------
    // Spin the Wheel
    // -----------------------------------------------------------------------

    renderWheel() {
        const host = this.pageHost('wheel');
        const w = this.wheel;
        const st = Profile.wheelStatus();
        const segments = Profile.wheelSegments(st.sunday);
        const angle = 360 / segments.length;

        host.appendChild(this.pageTitle('🎡 Spin the Wheel',
            'Spin once a day for a chance to win bonus credits or gems!' + (st.sunday ? ' 🎉 It\'s Sunday: gem prizes are boosted!' : '')));

        const area = h('div', { class: 'panel wheel-area' });
        if (!st.canPlay && !w.spinning) {
            area.appendChild(this.notice(st.alreadyToday
                ? '🕐 You\'ve already spun the wheel today. Come back tomorrow!'
                : `⚠️ You have ${st.credits}/${MAX_CREDITS} credits. You need ${MINIGAME_MAX_CREDITS} or fewer to spin, since you could win up to 5 more (max is ${MAX_CREDITS}).`, 'warn'));
        }

        const gradient = `conic-gradient(${WHEEL_COLORS.map((c, i) => `${c} ${i * angle}deg ${(i + 1) * angle}deg`).join(', ')})`;
        const wheel = h('div', { class: 'wheel', style: { background: gradient, transform: `rotate(${w.rotation}deg)` } });
        segments.forEach((seg, i) => {
            const a = i * angle + angle / 2;
            const x = 150 + 110 * Math.sin(a * Math.PI / 180);
            const y = 150 - 110 * Math.cos(a * Math.PI / 180);
            wheel.appendChild(h('div', {
                class: 'wheel-label', text: seg.label,
                style: { left: `${x}px`, top: `${y}px`, transform: `translate(-50%, -50%) rotate(${a}deg)` }
            }));
        });
        area.appendChild(h('div', { class: 'wheel-wrapper' }, h('div', { class: 'wheel-pointer', text: '▼' }), wheel));

        if (w.result && !w.spinning) {
            const win = w.result.creditsWon > 0 || w.result.gemsWon > 0;
            area.appendChild(h('div', { class: `result-banner ${win ? 'win' : 'no-win'}`,
                text: win ? `🎉 You won ${fmtWon(w.result.creditsWon, w.result.gemsWon)}!` : '😢 No win this time. Try again tomorrow!' }));
        }
        if (w.error) area.appendChild(this.notice(w.error, 'bad'));

        area.appendChild(h('button', {
            class: 'btn btn-primary btn-lg big-btn', type: 'button',
            disabled: w.spinning || !st.canPlay, text: w.spinning ? 'Spinning...' : 'Spin the Wheel',
            on: { click: () => this.doSpin() }
        }));
        host.appendChild(area);
        this._wheelEl = wheel;
    },

    doSpin() {
        const w = this.wheel;
        if (w.spinning) return;
        w.error = '';
        w.result = null;
        const res = Profile.spinWheel();
        if (res.error) { w.error = res.error; this.renderWheel(); return; }

        const angle = 36;
        const centre = res.index * angle + angle / 2;
        const targetMod = (360 - centre) % 360;
        const delta = (targetMod - (w.rotation % 360) + 360) % 360;
        const target = w.rotation + 5 * 360 + delta;
        w.spinning = true;
        this.renderWheel();               // drawn at the old angle
        w.rotation = target;
        // Change the angle on a later frame so the CSS transition animates it.
        const el = this._wheelEl;
        if (el) requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transform = `rotate(${target}deg)`; }));
        setTimeout(() => {
            w.spinning = false;
            w.result = res;
            if (this.page === 'wheel') this.renderWheel();
        }, 4200);
    },

    // -----------------------------------------------------------------------
    // Guess the Number
    // -----------------------------------------------------------------------

    renderGuess() {
        const host = this.pageHost('guess');
        const g = this.guessUi;
        const st = Profile.guessStatus();
        this.setNavLocked(st.active);

        host.appendChild(this.pageTitle('🎯 Guess the Number', `I'm thinking of a number between ${GUESS_MIN} and ${GUESS_MAX}. Can you guess it?`));
        const area = h('div', { class: 'panel game-area' });

        if (!st.canPlay && !st.active && !g.result) {
            area.appendChild(this.notice(st.alreadyToday
                ? '🕐 You already played today. Come back tomorrow!'
                : `⚠️ You have ${st.credits}/${MAX_CREDITS} credits. You need ${MINIGAME_MAX_CREDITS} or fewer to play, since you could win up to 5 more (max is ${MAX_CREDITS}).`, 'warn'));
        }

        if (!st.active && !g.result && st.canPlay) {
            area.appendChild(h('p', { class: 'page-sub', text: '3 or fewer guesses wins 5 credits, 4-5 wins 3, 6-7 wins 2, 8+ wins 1. Once you start, you can\'t leave until you guess it.' }));
            area.appendChild(h('button', {
                class: 'btn btn-primary btn-lg big-btn', type: 'button', text: 'Start Game',
                on: { click: () => {
                    const res = Profile.startGuess();
                    g.error = res.error || '';
                    g.feedback = '';
                    g.result = null;
                    this.renderGuess();
                } }
            }));
        }

        if (st.active) {
            area.appendChild(h('p', { class: 'guess-counter', text: `Guesses made: ${st.count}` }));
            const input = h('input', { class: 'text-input guess-input', type: 'number', min: String(GUESS_MIN), max: String(GUESS_MAX), placeholder: 'Enter a number...', inputmode: 'numeric' });
            const form = h('form', { class: 'guess-form', on: { submit: e => {
                e.preventDefault();
                const res = Profile.guess(parseInt(input.value, 10));
                if (res.error) { g.error = res.error; this.renderGuess(); return; }
                g.error = '';
                if (res.correct) { g.result = res; g.feedback = ''; }
                else g.feedback = res.feedback;
                this.renderGuess();
            } } }, input, h('button', { class: 'btn btn-primary', type: 'submit', text: 'Guess' }));
            area.appendChild(form);
            if (g.feedback) {
                area.appendChild(h('div', { class: `feedback ${g.feedback}` }, 'The number is ', h('strong', { text: g.feedback })));
            }
            setTimeout(() => input.focus(), 30);
        }

        if (g.result) {
            area.appendChild(h('div', { class: 'result-banner win' },
                h('p', { text: `🎉 Correct! The number was ${g.result.target}` }),
                h('p', { text: `You took ${g.result.count} guess${g.result.count > 1 ? 'es' : ''}` }),
                h('p', { text: `💰 You won ${fmtWon(g.result.creditsWon, g.result.gemsWon)}!` })));
        }
        if (g.error) area.appendChild(this.notice(g.error, 'bad'));
        host.appendChild(area);
    },

    setNavLocked(locked) {
        this.navLocked = locked;
        document.querySelectorAll('.hub-tab').forEach(t => {
            t.classList.toggle('locked', locked && t.dataset.page !== this.page);
            t.title = locked && t.dataset.page !== this.page ? 'Guess the number correctly before leaving' : '';
        });
    },

    // -----------------------------------------------------------------------
    // Memory Game
    // -----------------------------------------------------------------------

    renderMemory() {
        const host = this.pageHost('memory');
        const m = this.mem;
        const st = Profile.memoryStatus();

        // Restore an in-progress board (after a refresh or coming back to the page).
        if (st.active && !m.busy) {
            m.images = {};
            m.matched = [];
            for (const { position, image } of st.matched) { m.images[position] = image; m.matched.push(position); }
            m.pending = [];
            if (st.firstFlip) { m.images[st.firstFlip.position] = st.firstFlip.image; m.pending = [st.firstFlip.position]; }
        }

        host.appendChild(this.pageTitle('🧠 Memory Game', 'Find all 8 matching pairs!'));
        const area = h('div', { class: 'panel memory-area' });

        if (!st.canPlay && !st.active && !m.result) {
            area.appendChild(this.notice(st.alreadyToday
                ? '🕐 You already played today. Come back tomorrow!'
                : `⚠️ You have ${st.credits}/${MAX_CREDITS} credits. You need ${MINIGAME_MAX_CREDITS} or fewer to play, since you could win up to 5 more (max is ${MAX_CREDITS}).`, 'warn'));
        }
        if (!st.active && !m.result && st.canPlay) {
            area.appendChild(h('p', { class: 'page-sub', text: 'Reward: 50% chance of +2 credits, 40% +3, 10% +5, and a 50% chance of a bonus gem (guaranteed on Sundays).' }));
            area.appendChild(h('button', {
                class: 'btn btn-primary btn-lg big-btn', type: 'button', text: 'Start Game',
                on: { click: () => {
                    const res = Profile.startMemory();
                    m.error = res.error || '';
                    m.images = {}; m.matched = []; m.pending = []; m.result = null;
                    this.renderMemory();
                } }
            }));
        }

        if (st.active || (m.busy && !m.result)) {
            const grid = h('div', { class: 'memory-grid' });
            for (let pos = 0; pos < MEMORY_BOARD_SIZE; pos++) {
                const faceUp = m.matched.includes(pos) || m.pending.includes(pos);
                grid.appendChild(h('div', {
                    class: `memory-tile ${faceUp ? 'face-up' : ''} ${m.matched.includes(pos) ? 'matched' : ''}`,
                    on: { click: () => this.flipMemory(pos) }
                }, h('img', {
                    src: faceUp ? `assets/memory/${m.images[pos]}.png` : 'assets/memory/card-back.png',
                    alt: faceUp ? m.images[pos] : 'Face-down card'
                })));
            }
            area.appendChild(grid);
        }

        if (m.result) {
            area.appendChild(h('div', { class: 'result-banner win' },
                h('p', { text: `🎉 You found all 8 pairs! You won ${fmtWon(m.result.creditsWon, m.result.gemsWon)}!` })));
        }
        if (m.error) area.appendChild(this.notice(m.error, 'bad'));
        host.appendChild(area);
    },

    flipMemory(pos) {
        const m = this.mem;
        if (m.busy || m.matched.includes(pos) || m.pending.includes(pos)) return;
        const res = Profile.revealMemory(pos);
        if (res.error) { m.error = res.error; this.renderMemory(); return; }
        m.error = '';
        m.images[pos] = res.image;
        if (res.firstImage !== undefined) m.images[res.firstPosition] = res.firstImage;

        if (res.isFirstFlip) {
            m.pending = [pos];
            this.renderMemory();
            return;
        }
        if (res.matched) {
            m.matched.push(res.firstPosition, pos);
            m.pending = [];
            if (res.gameComplete) m.result = res;
            this.renderMemory();
            return;
        }
        // Mismatch: show both, then hide them again.
        m.pending = [res.firstPosition, pos];
        m.busy = true;
        this.renderMemory();
        setTimeout(() => {
            m.pending = [];
            m.busy = false;
            if (this.page === 'memory') this.renderMemory();
        }, 900);
    },

    // -----------------------------------------------------------------------
    // Collection progress (personal, replaces the leaderboard)
    // -----------------------------------------------------------------------

    renderCollection() {
        const host = this.pageHost('collection');
        host.appendChild(this.pageTitle('📈 Collection progress', 'How much of each set you have collected.'));

        const table = h('table', { class: 'data-table' });
        table.appendChild(h('thead', {}, h('tr', {},
            ['Set', 'Unique', '🟢 Common', '🔵 Uncommon', '⭐ Rare', '💎 Epic', 'Promo'].map(t => h('th', { text: t })))));
        const tbody = h('tbody');
        const totals = { owned: 0, total: 0, r: { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] }, promo: [0, 0] };
        for (const set of cardSets) {
            const r = { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] };
            const promo = [0, 0];
            let owned = 0, total = 0;
            for (const c of Collection.setCards(set.id)) {
                const have = Profile.owned(c.id) > 0 ? 1 : 0;
                total++; owned += have;
                r[c.rarity][1]++; r[c.rarity][0] += have;
                if (c.promo) { promo[1]++; promo[0] += have; }
            }
            totals.owned += owned; totals.total += total;
            for (const k of [1, 2, 3, 4]) { totals.r[k][0] += r[k][0]; totals.r[k][1] += r[k][1]; }
            totals.promo[0] += promo[0]; totals.promo[1] += promo[1];
            tbody.appendChild(h('tr', {},
                h('td', { text: (Profile.isSetUnlocked(set.id) ? '' : '🔒 ') + set.name }),
                h('td', {}, h('strong', { text: `${owned}/${total}` })),
                [1, 2, 3, 4].map(k => h('td', { text: `${r[k][0]}/${r[k][1]}` })),
                h('td', { text: `${promo[0]}/${promo[1]}` })));
        }
        tbody.appendChild(h('tr', { class: 'total-row' },
            h('td', { text: 'All sets' }),
            h('td', {}, h('strong', { text: `${totals.owned}/${totals.total}` })),
            [1, 2, 3, 4].map(k => h('td', { text: `${totals.r[k][0]}/${totals.r[k][1]}` })),
            h('td', { text: `${totals.promo[0]}/${totals.promo[1]}` })));
        table.appendChild(tbody);
        host.appendChild(h('div', { class: 'table-container' }, table));

        const cards = h('div', { class: 'progress-cards' });
        for (const set of cardSets) {
            const p = Profile.setProgress(set.id);
            const req = Profile.unlockRequirement(set.id);
            const unlocked = Profile.isSetUnlocked(set.id);
            const card = h('div', { class: 'panel progress-card' },
                h('h3', { text: (unlocked ? '' : '🔒 ') + set.name }),
                h('p', { text: `All cards: ${p.owned}/${p.total} (${pct(p.owned, p.total)}%)` }),
                progressBar(p.owned, p.total),
                h('p', { text: `Non-promo: ${p.ownedNonPromo}/${p.totalNonPromo} (${pct(p.ownedNonPromo, p.totalNonPromo)}%)` }),
                progressBar(p.ownedNonPromo, p.totalNonPromo, 'alt'),
                h('p', { class: 'page-sub', text: `${p.copies} copies owned` }));
            if (req) {
                card.appendChild(h('p', { class: unlocked ? 'unlock-ok' : 'unlock-pending', text: unlocked
                    ? `✅ Unlocked ${new Date(Profile.s.unlockedSets[set.id]).toLocaleDateString()}`
                    : `Unlocks at ${req.needed}/${req.total} non-promo ${req.prevSet.name} cards. You have ${req.have}.` }));
            }

            const byType = new Map();
            for (const c of Collection.setCards(set.id)) {
                const t = getCardType(c);
                const e = byType.get(t) || [0, 0];
                e[1]++;
                if (Profile.owned(c.id) > 0) e[0]++;
                byType.set(t, e);
            }
            const pills = h('div', { class: 'deck-types' });
            for (const [t, [o, n]] of byType) {
                const pill = h('span', { class: 'type-pill', text: `${t} ${o}/${n}` });
                pill.style.setProperty('--pill', typeColor(t));
                pills.appendChild(pill);
            }
            card.appendChild(pills);
            cards.appendChild(card);
        }
        host.appendChild(cards);
    },

    // -----------------------------------------------------------------------
    // Stats
    // -----------------------------------------------------------------------

    renderStats() {
        const host = this.pageHost('stats');
        const st = Profile.s.stats;
        host.appendChild(this.pageTitle('🏆 Stats', 'Your games against the AI. Leaving a game early counts as a loss. QA games are not counted.'));

        const tiles = [
            ['Games played', st.played], ['Won', st.won], ['Lost', st.lost], ['Drawn', st.drawn],
            ['Win rate', st.played ? `${pct(st.won, st.played)}%` : '–'],
            ['Games left early', st.forfeits],
            ['Current win streak', st.streak], ['Best win streak', st.bestStreak],
            ['Win credits today', `${Profile.winCreditsToday()}/${WIN_CREDITS_PER_DAY}`],
            ['Win credits earned', st.winCreditsEarned]
        ];
        host.appendChild(h('div', { class: 'stat-grid' },
            tiles.map(([label, value]) => h('div', { class: 'panel stat-tile' },
                h('div', { class: 'stat-value', text: String(value) }), h('div', { class: 'stat-label', text: label })))));

        host.appendChild(h('h3', { class: 'section-title', text: 'Against each AI deck' }));
        const opp = h('table', { class: 'data-table' },
            h('thead', {}, h('tr', {}, ['AI deck', 'Played', 'Won', 'Lost', 'Drawn', 'Win rate'].map(t => h('th', { text: t })))));
        const tb = h('tbody');
        for (const preset of presetDeckLists) {
            const o = st.byOpponent[preset.name] || { played: 0, won: 0, lost: 0, drawn: 0 };
            tb.appendChild(h('tr', {},
                h('td', { text: preset.name }), h('td', { text: String(o.played) }), h('td', { text: String(o.won) }),
                h('td', { text: String(o.lost) }), h('td', { text: String(o.drawn) }),
                h('td', { text: o.played ? `${pct(o.won, o.played)}%` : '–' })));
        }
        opp.appendChild(tb);
        host.appendChild(h('div', { class: 'table-container' }, opp));

        host.appendChild(h('h3', { class: 'section-title', text: 'Recent games' }));
        if (st.history.length === 0) {
            host.appendChild(this.notice('No games yet. Build a deck on the Play tab and challenge the AI!'));
        } else {
            const list = h('div', { class: 'history-list' });
            for (const g of st.history) {
                const label = g.result === 'win' ? 'Win' : g.result === 'loss' ? (g.forfeit ? 'Loss (left early)' : 'Loss') : 'Draw';
                list.appendChild(h('div', { class: `history-row ${g.result}` },
                    h('span', { class: 'history-result', text: label }),
                    h('span', { class: 'history-match', text: `${g.deck} vs ${g.opponent}` }),
                    h('span', { class: 'history-score', text: g.score }),
                    h('span', { class: 'history-date', text: g.at ? new Date(g.at).toLocaleString() : '' })));
            }
            host.appendChild(list);
        }
    },

    // -----------------------------------------------------------------------
    // Save data
    // -----------------------------------------------------------------------

    renderSave() {
        const host = this.pageHost('save');
        const st = Persist.status();
        const p = Persist.progressOf(Profile.s);
        host.appendChild(this.pageTitle('💾 Save data',
            'Your progress saves automatically in this browser. Download a backup file to keep a copy or move your progress to another device (for example your phone), then use Import backup there.'));

        const time = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const bits = [];
        if (st.twoFiles) bits.push(`Auto-saving to "${st.fileName}" and "${st.fileNameB}" in turn.`);
        else if (st.autoFileSave) bits.push(`Auto-saving to "${st.fileName}" on your device.`);
        else if (st.linked && st.filePermission !== 'granted') bits.push(`Save file "${st.fileName}" needs permission again. Tap "Re-link / change save file" to re-grant.`);
        else if (st.supportsFS) bits.push('No device file linked yet. Progress is stored in the browser only.');
        else bits.push('This browser cannot write device files directly. Use "Download backup" to keep a copy.');
        if (st.autoFileSave && st.lastFileWriteAt) bits.push(`File last written ${time(st.lastFileWriteAt)}.`);
        if (st.lastFileError) bits.push(`⚠ Last file write failed: ${st.lastFileError}`);
        if (!st.idbAvailable) bits.push('⚠ This browser blocked its database here, so progress is kept in localStorage only.');
        bits.push(st.persisted ? 'Browser storage is marked persistent.' : 'Browser storage is not persistent (the browser may clear it under storage pressure).');
        if (Profile.lastSavedAt) bits.push(`Last saved ${time(Profile.lastSavedAt)}.`);
        if (st.lastLocalBackupError) bits.push(`⚠ Browser backup copy failed: ${st.lastLocalBackupError}`);

        const card = h('div', { class: 'panel save-card' });
        if (Profile.saveBlocked) {
            card.appendChild(this.notice('Saving is paused to protect an existing save on this device. Reload to try loading it again, or Reset all progress to start over.', 'bad'));
        }
        if (!st.autoFileSave && !p.empty) {
            card.appendChild(this.notice(`Your ${p.unique} unique cards only exist in this browser, which can be cleared without warning. Download a backup regularly${st.supportsFS ? ', or link a save file on your device' : ''}.`, 'warn'));
        }
        card.appendChild(h('p', { class: 'page-sub', text: bits.join(' ') }));
        card.appendChild(h('p', { text: `This save: ${p.unique} unique cards, ${p.copies} copies, ${p.games} games played, ${Profile.s.decks.length} decks.` }));

        const row = (...btns) => h('div', { class: 'btn-row' }, ...btns);

        if (st.supportsFS) {
            card.appendChild(row(
                h('button', { class: 'btn', type: 'button', text: st.linked ? 'Re-link / change save file' : 'Link save file on device', on: { click: () => this.linkFile() } }),
                st.autoFileSave && !st.twoFiles
                    ? h('button', { class: 'btn btn-ghost', type: 'button', text: st.linkedB ? 'Re-link second save file' : 'Link a second save file (recommended)', on: { click: () => this.linkSecondFile() } })
                    : null,
                h('button', { class: 'btn btn-ghost', type: 'button', text: 'Restore from file…', on: { click: () => this.openFile() } })));
        }

        const fileInput = h('input', { type: 'file', accept: 'application/json,.json,text/plain,.txt', hidden: true, on: { change: e => this.importFile(e) } });
        card.appendChild(row(
            h('button', { class: 'btn btn-primary', type: 'button', text: 'Download backup', on: { click: () => {
                Persist.download(Profile.s);
                this.toast('Backup downloaded', 'good');
            } } }),
            h('button', { class: 'btn btn-ghost', type: 'button', text: 'Import backup…', on: { click: () => fileInput.click() } }),
            fileInput));

        card.appendChild(h('p', { class: 'page-sub', text:
            'On a phone: open the game, tap Download backup, and keep the file somewhere safe (Files / Downloads / cloud drive). ' +
            'To move progress, open the game on the other device and tap Import backup. Importing replaces the progress on that device.' }));
        if (st.supportsFS) {
            card.appendChild(h('p', { class: 'page-sub', text:
                'Linking a save file writes your progress straight to a file on your device, so it survives clearing browser data. ' +
                'Link a second file as well and saves take turns between the two, so a device switching off mid-save can only damage one of them.' }));
        }

        card.appendChild(row(h('button', { class: 'btn btn-danger', type: 'button', text: 'Reset all progress', on: { click: () => this.wipe() } })));
        host.appendChild(card);
    },

    async linkFile() {
        try {
            const st = Persist.status();
            if (st.linked && st.filePermission !== 'granted') {
                const perm = await Persist.regrant();
                if (perm === 'granted') {
                    await Profile.flush();
                    this.toast('Save file re-connected', 'good');
                    this.renderSave();
                    return;
                }
            }
            await Persist.linkFile(Profile.s);
            this.toast('Save file linked: progress is now written to your device', 'good');
        } catch (e) {
            if (!e || e.name !== 'AbortError') this.toast((e && e.message) || 'Could not link file', 'bad');
        }
        this.renderSave();
    },

    async linkSecondFile() {
        try {
            await Persist.linkSecondFile(Profile.s);
            this.toast('Second save file linked: saves now alternate between the two', 'good');
        } catch (e) {
            if (!e || e.name !== 'AbortError') this.toast((e && e.message) || 'Could not link file', 'bad');
        }
        this.renderSave();
    },

    async openFile() {
        try {
            const data = await Persist.openFile();
            const p = Persist.progressOf(data);
            if (!await this.confirm('Restore this save?', `Replace your current progress with that file (${p.unique} unique cards, ${p.games} games)?`, 'Replace', 'danger')) return;
            await Profile.replace(data);
            this.afterReplace('Progress restored');
        } catch (e) {
            if (!e || e.name !== 'AbortError') this.toast((e && e.message) || 'Could not open file', 'bad');
        }
        this.renderSave();
    },

    async importFile(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            const data = await Persist.importFile(file);
            const p = Persist.progressOf(data);
            const when = data.savedAt ? ` saved ${new Date(data.savedAt).toLocaleString()}` : '';
            if (!await this.confirm('Import this backup?',
                `Replace your current progress with this backup${when} (${p.unique} unique cards, ${p.games} games)?`, 'Replace', 'danger')) return;
            await Profile.replace(data);
            this.afterReplace('Backup imported');
        } catch (err) {
            this.toast(err && err.friendly ? err.message : 'That file could not be read as a save', 'bad');
        }
        this.renderSave();
    },

    async wipe() {
        if (!await this.confirm('Reset all progress?', 'Erase all progress: cards, decks, credits, gems, missions and stats?', 'Erase', 'danger')) return;
        if (!await this.confirm('Really erase everything?', 'This cannot be undone. Download a backup first if you might want it back.', 'Erase everything', 'danger')) return;
        await Profile.reset();
        this.afterReplace('Progress reset');
    },

    afterReplace(message) {
        this._announced = new Set(cardSets.filter(s => Profile.isSetUnlocked(s.id)).map(s => s.id));
        this.guessUi = { feedback: '', result: null, error: '' };
        this.mem = { images: {}, matched: [], pending: [], busy: false, result: null, error: '' };
        this.draw = { busy: false, cooldownUntil: 0, last: null, error: '' };
        DeckLibrary.load();
        this.renderNotices();
        this.renderHeader();
        this.toast(message, 'good');
    },

    // -----------------------------------------------------------------------
    // Music
    // -----------------------------------------------------------------------

    initAudio() {
        const host = document.getElementById('hub-audio');
        if (!host) return;
        const audio = h('audio', { loop: true, preload: 'none' });
        const name = h('span', { class: 'audio-track-name' });
        const play = h('button', { class: 'audio-btn', type: 'button', 'aria-label': 'Play' });
        const load = () => {
            audio.src = `assets/audio/${MUSIC_TRACKS[this.music.index].file}`;
            name.textContent = `🎵 ${MUSIC_TRACKS[this.music.index].name}`;
        };
        const sync = () => { play.textContent = this.music.playing ? '⏸' : '▶️'; };
        const skip = dir => {
            this.music.index = (this.music.index + dir + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
            load();
            if (this.music.playing) audio.play().catch(() => {});
        };
        play.addEventListener('click', () => {
            if (this.music.playing) audio.pause();
            else audio.play().catch(() => {});
            this.music.playing = !this.music.playing;
            sync();
        });
        host.append(
            audio,
            h('button', { class: 'audio-btn', type: 'button', 'aria-label': 'Previous track', text: '⏮', on: { click: () => skip(-1) } }),
            play,
            h('button', { class: 'audio-btn', type: 'button', 'aria-label': 'Next track', text: '⏭', on: { click: () => skip(1) } }),
            name);
        load();
        sync();
    },

    // -----------------------------------------------------------------------
    // Recovery gate: shown instead of the game when a save should exist but
    // could not be loaded. Nothing autosaves while it is up.
    // -----------------------------------------------------------------------

    showRecoveryGate() {
        const gate = document.getElementById('boot-gate');
        const snap = Profile.loadRecoverable;
        const marker = Persist.readMarker();
        gate.innerHTML = '';
        gate.classList.add('show');

        const msg = h('p', { class: 'gate-error' });
        const say = t => { msg.textContent = t; };
        const fileInput = h('input', { type: 'file', accept: 'application/json,.json,text/plain,.txt', hidden: true });

        const restore = async data => {
            if (Persist.progressOf(data).empty && !await this.confirm('Restore it anyway?', 'That backup looks empty.', 'Restore')) return;
            await Profile.replace(data);
            location.reload();
        };

        fileInput.addEventListener('change', async e => {
            const file = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!file) return;
            try { await restore(await Persist.importFile(file)); }
            catch (err) { say(err && err.friendly ? err.message : 'That file could not be read as a save.'); }
        });

        const what = snap && snap.source === 'browser backup' ? 'Newest browser backup' : 'Newest snapshot';
        gate.appendChild(h('div', { class: 'gate-panel' },
            h('h1', { text: 'Your save did not load' }),
            h('p', { class: 'gate-warn', text: Profile.loadReadFailed
                ? 'The save could not be read. It may still be on this device.'
                : snap ? 'No save was found, but this device has a backup copy, so one should exist.'
                    : 'Your save has gone missing from this browser. Restore it from a backup file.' }),
            h('p', { class: 'page-sub', text: 'The game has not started, so nothing has been overwritten. Do not skip past this unless you are happy to start over.' }),
            marker && marker.progress ? h('p', { class: 'page-sub', text:
                `Last save the game remembers: ${new Date(marker.savedAt).toLocaleString()} (${marker.progress.unique} unique cards, ${marker.progress.games} games).` }) : null,
            snap ? h('p', { class: 'gate-ok', text: `${what}: ${new Date(snap.savedAt).toLocaleString()} (${snap.progress.unique} unique cards).` })
                : h('p', { class: 'gate-warn', text: 'No snapshot was found on this device.' }),
            h('div', { class: 'gate-buttons' },
                h('button', { class: 'btn btn-primary', type: 'button', text: 'Try loading again', on: { click: () => location.reload() } }),
                snap ? h('button', { class: 'btn', type: 'button', text: `Restore that ${snap.source === 'browser backup' ? 'backup' : 'snapshot'}`,
                    on: { click: async () => { try { await Profile.replace(snap.data); location.reload(); } catch (e) { say(e.message || 'Could not restore it'); } } } }) : null,
                Persist.supportsFS ? h('button', { class: 'btn', type: 'button', text: 'Open my save file…',
                    on: { click: async () => {
                        try { await restore(await Persist.openFile()); }
                        catch (e) { if (!e || e.name !== 'AbortError') say(e && e.friendly ? e.message : 'That file could not be read as a save.'); }
                    } } }) : null,
                h('button', { class: 'btn', type: 'button', text: 'Restore from a backup file…', on: { click: () => fileInput.click() } }),
                h('button', { class: 'btn btn-ghost', type: 'button', text: 'Start a new account anyway',
                    on: { click: async () => {
                        if (!await this.confirm('Start a brand-new account?', 'Anything still on this device will be replaced.', 'Start over', 'danger')) return;
                        await Profile.reset();
                        location.reload();
                    } } })),
            fileInput,
            msg));
    }
};
