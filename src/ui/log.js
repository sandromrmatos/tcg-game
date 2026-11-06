// ============================================================================
// BATTLE LOG + TOASTS
//
// Replaces the original 584 blocking `alert()` calls. Two surfaces:
//
//   * a persistent, scrollable battle log — the full history of the game
//   * transient toasts — the last few beats, so you can follow without reading
//
// `await Log.say(...)` writes an entry and yields for a pacing interval, which
// is what gives resolution its rhythm. Setting Log.speed = 0 (fuzz harness)
// makes every await resolve immediately, so a whole game runs in microseconds.
// ============================================================================

const Log = {
    // Multiplier on every pause. 0 disables pacing entirely (test harnesses).
    speed: 1,
    // One beat at Normal pace. Raised from 620 ms: the AI's turn read as a blur.
    baseBeat: 900,
    entries: [],
    maxEntries: 400,

    _listEl: null,
    _toastEl: null,
    _bannerEl: null,
    _centerEl: null,

    init() {
        this._listEl = document.getElementById('battle-log-entries');
        this._toastEl = document.getElementById('toast-stack');
        this._bannerEl = document.getElementById('turn-banner');
        this._centerEl = document.getElementById('center-banner');
    },

    /**
     * Extra breathing room between the AI's actions, so each one can be seen
     * before the next. Only the opponent waits; the player's own actions
     * already happen at the pace they click.
     */
    aiPause(side, multiplier = 1) {
        if (side !== 'opponent') return Promise.resolve();
        return this.beat(multiplier);
    },

    /**
     * A message in the middle of the screen, styled like the "Your turn"
     * banner. Used for coin flips and dice so the result can't be missed.
     */
    async centerBanner(main, sub, { kind = 'coin', ms = 1300 } = {}) {
        if (!this._centerEl || this.speed <= 0) return;
        this._centerEl.innerHTML = '';
        const big = document.createElement('div');
        big.className = 'center-banner-main';
        big.textContent = main;
        this._centerEl.appendChild(big);
        if (sub) {
            const small = document.createElement('div');
            small.className = 'center-banner-sub';
            small.textContent = sub;
            this._centerEl.appendChild(small);
        }
        this._centerEl.className = `center-banner center-banner-${kind}`;
        // Restart the animation even when two flips land back to back.
        void this._centerEl.offsetWidth;
        this._centerEl.classList.add('center-banner-show');
        const duration = ms * Math.max(0.6, this.speed);
        this._centerEl.style.setProperty('--banner-ms', `${duration}ms`);
        await delay(duration);
        this._centerEl.classList.remove('center-banner-show');
    },

    /** Pacing helper. All timed waits in the game funnel through here. */
    beat(multiplier = 1) {
        if (this.speed <= 0) return Promise.resolve();
        return delay(this.baseBeat * multiplier * this.speed);
    },

    /**
     * Records an entry and (optionally) shows a toast, then waits one beat.
     * @param {string} text
     * @param {object} [opts] { kind, side, toast, pace, icon }
     */
    async say(text, opts = {}) {
        this.write(text, opts);
        if (opts.toast !== false) this.toast(text, opts);
        await this.beat(opts.pace === undefined ? 1 : opts.pace);
    },

    /** Records an entry without pacing. Use for detail lines. */
    write(text, opts = {}) {
        const entry = {
            text,
            kind: opts.kind || 'info',
            side: opts.side || null,
            icon: opts.icon || null,
            turn: gameState.turnNumber
        };
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) this.entries.shift();
        this._renderEntry(entry);
    },

    _renderEntry(entry) {
        if (!this._listEl) return;
        const row = document.createElement('div');
        row.className = `log-entry log-${entry.kind}` +
            (entry.side ? ` log-side-${entry.side}` : '');

        if (entry.icon) {
            const icon = document.createElement('span');
            icon.className = 'log-icon';
            icon.textContent = entry.icon;
            row.appendChild(icon);
        }

        const body = document.createElement('span');
        body.className = 'log-text';
        body.textContent = entry.text;
        row.appendChild(body);

        this._listEl.appendChild(row);
        // Keep the newest entry visible.
        this._listEl.scrollTop = this._listEl.scrollHeight;
    },

    toast(text, opts = {}) {
        if (!this._toastEl || this.speed <= 0) return;
        const el = document.createElement('div');
        el.className = `toast toast-${opts.kind || 'info'}`;

        if (opts.icon) {
            const icon = document.createElement('span');
            icon.className = 'toast-icon';
            icon.textContent = opts.icon;
            el.appendChild(icon);
        }
        const body = document.createElement('span');
        body.textContent = text;
        el.appendChild(body);

        this._toastEl.appendChild(el);

        const life = 2400 * Math.max(0.35, this.speed);
        setTimeout(() => {
            el.classList.add('toast-out');
            setTimeout(() => el.remove(), 320);
        }, life);

        // Never let toasts pile up beyond a readable stack.
        while (this._toastEl.children.length > 4) {
            this._toastEl.firstChild.remove();
        }
    },

    /**
     * Immediate, non-paced feedback for an illegal action. This is the only
     * message type the player must not miss, so it also flashes the toast.
     */
    warn(text) {
        this.write(text, { kind: 'warn', icon: '!' });
        this.toast(text, { kind: 'warn', icon: '!' });
    },

    // -----------------------------------------------------------------------
    // Specialised beats
    // -----------------------------------------------------------------------

    /** Coin flip with a visible result, in the log and in the middle of the screen. */
    async coin(result, context) {
        const icon = result === 'heads' ? '🪙' : '⚫';
        const label = result === 'heads' ? 'Heads' : 'Tails';
        this.write(context ? `${context}: ${label}` : label, { kind: 'coin', icon });
        await this.centerBanner(`${icon} ${label}!`, context || 'Coin flip', { kind: result === 'heads' ? 'coin' : 'tails' });
        await this.beat(0.3);
    },

    /** Multiple coins at once. */
    async coins(results, context) {
        const rendered = results.map(r => (r === 'heads' ? 'heads' : 'tails')).join(', ');
        const heads = results.filter(r => r === 'heads').length;
        const text = `${context}: ${rendered} (${heads} head${heads === 1 ? '' : 's'})`;
        this.write(text, { kind: 'coin', icon: '🪙' });
        const faces = results.map(r => (r === 'heads' ? '🪙' : '⚫')).join(' ');
        await this.centerBanner(`${faces}`, `${context}: ${heads} head${heads === 1 ? '' : 's'}`,
            { kind: 'coin', ms: 1500 });
        await this.beat(0.3);
    },

    async dice(value, context) {
        this.write(context ? `${context}: rolled ${value}` : `Rolled ${value}`, { kind: 'dice', icon: '🎲' });
        await this.centerBanner(`🎲 ${value}`, context ? `${context}: rolled ${value}` : `Rolled ${value}`,
            { kind: 'dice' });
        await this.beat(0.3);
    },

    /** Full-width banner announcing whose turn it is. */
    async turnBanner(side, turnNumber) {
        this.write(`— Turn ${turnNumber}: ${subject(side)} —`, { kind: 'turn' });
        if (!this._bannerEl || this.speed <= 0) return;

        this._bannerEl.textContent =
            side === 'player' ? 'Your Turn' : "Opponent's Turn";
        this._bannerEl.className = `turn-banner turn-banner-${side}`;
        void this._bannerEl.offsetWidth;
        const duration = 1300 * Math.max(0.6, this.speed);
        this._bannerEl.style.setProperty('--banner-ms', `${duration}ms`);
        this._bannerEl.classList.add('turn-banner-show');
        await delay(duration);
        this._bannerEl.classList.remove('turn-banner-show');
    },

    clear() {
        this.entries = [];
        if (this._listEl) this._listEl.innerHTML = '';
        if (this._toastEl) this._toastEl.innerHTML = '';
        if (this._centerEl) this._centerEl.classList.remove('center-banner-show');
        if (typeof Showcase !== 'undefined') Showcase.clear();
    }
};

// ---------------------------------------------------------------------------
// Card showcase: a card the opponent plays (or an item either side uses) is
// shown large in the middle of the screen, then flies to where it is going:
// the bench slot, the creature it evolves, or the discard pile.
// ---------------------------------------------------------------------------

const Showcase = {
    _host: null,

    init() {
        this._host = document.getElementById('showcase');
    },

    enabled() {
        return !!this._host && Log.speed > 0 &&
            !!document.getElementById('game-screen') &&
            document.getElementById('game-screen').classList.contains('screen-show');
    },

    /** Two seconds at Normal pace for the opponent; a shorter look at your own items. */
    holdMs(side) {
        return (side === 'opponent' ? 2000 : 1200) * Math.max(0.5, Log.speed);
    },

    _targetElement(side, target) {
        if (!target) return null;
        if (target.discard) return document.getElementById(`${target.discard}-discard-count`);
        if (target.location === 'active') {
            return document.querySelector(`.active-slot[data-player="${target.side || side}"]`);
        }
        return document.querySelector(
            `.bench-slot[data-player="${target.side || side}"][data-slot="${target.index}"]`);
    },

    async play(cardId, { label, side, target, fullArt = false } = {}) {
        if (!this.enabled()) return;
        const host = this._host;
        host.innerHTML = '';

        const card = document.createElement('div');
        card.className = `showcase-card showcase-${side || 'opponent'}` + (fullArt ? ' showcase-full-art' : '');
        const img = document.createElement('img');
        img.src = cardArt(cardId, fullArt);
        img.alt = (getCardData(cardId) || {}).name || '';
        card.appendChild(img);
        if (label) {
            const caption = document.createElement('div');
            caption.className = 'showcase-caption';
            caption.textContent = label;
            card.appendChild(caption);
        }
        host.appendChild(card);
        host.classList.add('showcase-show');

        await delay(this.holdMs(side));

        // Fly to the destination, shrinking to its size.
        const to = this._targetElement(side, target);
        const from = img.getBoundingClientRect();
        if (to && from.width > 0) {
            const dest = to.getBoundingClientRect();
            const dx = (dest.left + dest.width / 2) - (from.left + from.width / 2);
            const dy = (dest.top + dest.height / 2) - (from.top + from.height / 2);
            const scale = Math.max(0.08, Math.min(1, (dest.width || 20) / from.width));
            card.classList.add('showcase-fly');
            card.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
            card.style.opacity = target && target.discard ? '0' : '0.35';
            await delay(520);
        } else {
            card.classList.add('showcase-fade');
            await delay(300);
        }
        this.clear();
    },

    clear() {
        if (!this._host) return;
        this._host.classList.remove('showcase-show');
        this._host.innerHTML = '';
    }
};
