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
    // Milliseconds per beat. 0 disables pacing entirely.
    speed: 1,
    baseBeat: 620,
    entries: [],
    maxEntries: 400,

    _listEl: null,
    _toastEl: null,
    _bannerEl: null,

    init() {
        this._listEl = document.getElementById('battle-log-entries');
        this._toastEl = document.getElementById('toast-stack');
        this._bannerEl = document.getElementById('turn-banner');
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

    /** Coin flip with a visible result. */
    async coin(result, context) {
        const icon = result === 'heads' ? '🪙' : '⚫';
        const label = result === 'heads' ? 'Heads' : 'Tails';
        await this.say(context ? `${context}: ${label}` : label,
            { kind: 'coin', icon, pace: 0.75 });
    },

    /** Multiple coins at once. */
    async coins(results, context) {
        const rendered = results.map(r => (r === 'heads' ? 'heads' : 'tails')).join(', ');
        const heads = results.filter(r => r === 'heads').length;
        await this.say(
            `${context}: ${rendered} (${heads} head${heads === 1 ? '' : 's'})`,
            { kind: 'coin', icon: '🪙', pace: 0.85 }
        );
    },

    async dice(value, context) {
        await this.say(context ? `${context}: rolled ${value}` : `Rolled ${value}`,
            { kind: 'dice', icon: '🎲', pace: 0.75 });
    },

    /** Full-width banner announcing whose turn it is. */
    async turnBanner(side, turnNumber) {
        this.write(`— Turn ${turnNumber}: ${subject(side)} —`, { kind: 'turn' });
        if (!this._bannerEl || this.speed <= 0) return;

        this._bannerEl.textContent =
            side === 'player' ? 'Your Turn' : "Opponent's Turn";
        this._bannerEl.className = `turn-banner turn-banner-${side} turn-banner-show`;
        await delay(900 * this.speed);
        this._bannerEl.classList.remove('turn-banner-show');
    },

    clear() {
        this.entries = [];
        if (this._listEl) this._listEl.innerHTML = '';
        if (this._toastEl) this._toastEl.innerHTML = '';
    }
};
