// ============================================================================
// BATTLE SOUNDS
//
// Short sound effects for what happens in a game: coin flips (a bright rising
// chime for heads, a sad falling one for tails), dice, attacks, damage,
// knockouts, points, items, abilities, healing, energy, status conditions,
// the turn banner and the end of the game.
//
// Every sound is synthesised with the Web Audio API, so there are no audio
// files to download or cache. Sounds hang off the battle log: whatever the
// game writes to the log (Log.write / coin / coins / dice / turnBanner) picks
// its sound from the entry's kind, so new effects get sounds for free.
//
// Off in the test harnesses (Log.speed 0). The 🔊 button in the battle log
// header turns them off and on; the choice is kept on this device.
// ============================================================================

const Sfx = {
    STORAGE_KEY: 'tcg.sfx',
    ctx: null,
    master: null,
    enabled: true,
    volume: 0.5,
    _last: {},

    init() {
        try { this.enabled = localStorage.getItem(this.STORAGE_KEY) !== 'off'; } catch (e) { /* default on */ }
        // Browsers (iOS especially) only allow audio to start from a tap.
        const unlock = () => { this._ensure(); };
        document.addEventListener('pointerdown', unlock, { passive: true });
        document.addEventListener('keydown', unlock);
        this._hookLog();
        const btn = document.getElementById('sfx-btn');
        if (btn) {
            btn.addEventListener('click', () => this.toggle());
            this._syncButton();
        }
    },

    toggle() {
        this.enabled = !this.enabled;
        try { localStorage.setItem(this.STORAGE_KEY, this.enabled ? 'on' : 'off'); } catch (e) { /* this page only */ }
        this._syncButton();
        if (this.enabled) this.play('item');
    },

    _syncButton() {
        const btn = document.getElementById('sfx-btn');
        if (!btn) return;
        btn.textContent = this.enabled ? '🔊' : '🔇';
        btn.setAttribute('aria-pressed', String(this.enabled));
        btn.setAttribute('aria-label', this.enabled ? 'Turn battle sounds off' : 'Turn battle sounds on');
        btn.title = this.enabled ? 'Battle sounds on' : 'Battle sounds off';
    },

    _ensure() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
            return this.ctx;
        }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.volume;
            this.master.connect(this.ctx.destination);
        } catch (e) {
            this.ctx = null;
        }
        return this.ctx;
    },

    _ready() {
        if (!this.enabled || typeof Log === 'undefined' || Log.speed <= 0) return null;
        if (typeof Automation !== 'undefined' && Automation.active) return null;
        const ctx = this._ensure();
        return ctx && ctx.state === 'running' ? ctx : null;
    },

    // ---- building blocks ----------------------------------------------------

    /** One note: frequency (or [from, to] for a slide), start offset and length in seconds. */
    _tone(freq, at, len, { type = 'sine', gain = 0.3, attack = 0.01 } = {}) {
        const ctx = this.ctx;
        const t0 = ctx.currentTime + at;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        if (Array.isArray(freq)) {
            osc.frequency.setValueAtTime(freq[0], t0);
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq[1]), t0 + len);
        } else {
            osc.frequency.setValueAtTime(freq, t0);
        }
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + len + 0.05);
    },

    /** A burst of filtered noise: whooshes, thuds and rattles. */
    _noise(at, len, { gain = 0.3, freq = 1200, q = 1, type = 'bandpass', sweepTo = null } = {}) {
        const ctx = this.ctx;
        const t0 = ctx.currentTime + at;
        const frames = Math.max(1, Math.floor(ctx.sampleRate * len));
        const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = type;
        filter.Q.value = q;
        filter.frequency.setValueAtTime(freq, t0);
        if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t0 + len);
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        src.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        src.start(t0);
        src.stop(t0 + len + 0.05);
    },

    // ---- the sounds ----------------------------------------------------------

    SOUNDS: {
        // A bright rising arpeggio.
        heads(s) {
            s._tone(1400, 0, 0.05, { type: 'triangle', gain: 0.15 });
            [523, 659, 784, 1047].forEach((f, i) => s._tone(f, 0.05 + i * 0.07, 0.22, { type: 'triangle', gain: 0.22 }));
        },
        // A sad falling "wah-wah".
        tails(s) {
            s._tone(1400, 0, 0.05, { type: 'triangle', gain: 0.12 });
            s._tone([392, 370], 0.06, 0.22, { type: 'sawtooth', gain: 0.08 });
            s._tone([370, 330], 0.3, 0.22, { type: 'sawtooth', gain: 0.08 });
            s._tone([330, 247], 0.54, 0.45, { type: 'sawtooth', gain: 0.08 });
        },
        dice(s) {
            for (let i = 0; i < 5; i++) s._noise(i * 0.06, 0.04, { gain: 0.25, freq: 2500 + i * 300, q: 4 });
            s._tone(880, 0.34, 0.12, { type: 'square', gain: 0.06 });
        },
        attack(s) {
            s._noise(0, 0.28, { gain: 0.35, freq: 600, sweepTo: 3000, q: 0.8 });
        },
        damage(s) {
            s._tone([180, 60], 0, 0.22, { type: 'sine', gain: 0.45 });
            s._noise(0, 0.12, { gain: 0.3, freq: 400, type: 'lowpass' });
        },
        ko(s) {
            s._tone([440, 70], 0, 0.7, { type: 'sawtooth', gain: 0.12 });
            s._noise(0.05, 0.4, { gain: 0.25, freq: 300, type: 'lowpass' });
        },
        point(s) {
            [784, 1175].forEach((f, i) => s._tone(f, i * 0.1, 0.4, { type: 'triangle', gain: 0.22 }));
        },
        item(s) {
            [1319, 1568, 2093].forEach((f, i) => s._tone(f, i * 0.05, 0.18, { type: 'sine', gain: 0.14 }));
        },
        ability(s) {
            [660, 880, 990, 1320].forEach((f, i) => s._tone(f, i * 0.06, 0.3, { type: 'sine', gain: 0.12 }));
        },
        heal(s) {
            s._tone([520, 780], 0, 0.35, { type: 'sine', gain: 0.18, attack: 0.08 });
            s._tone([780, 1040], 0.12, 0.35, { type: 'sine', gain: 0.12, attack: 0.08 });
        },
        energy(s) {
            s._tone([600, 1200], 0, 0.12, { type: 'square', gain: 0.07 });
        },
        status(s) {
            s._tone([300, 220], 0, 0.18, { type: 'triangle', gain: 0.18 });
            s._tone([260, 180], 0.16, 0.22, { type: 'triangle', gain: 0.15 });
        },
        shield(s) {
            s._tone(1250, 0, 0.3, { type: 'triangle', gain: 0.12 });
            s._tone(1870, 0, 0.25, { type: 'sine', gain: 0.06 });
        },
        place(s) {
            s._noise(0, 0.05, { gain: 0.2, freq: 1800, q: 2 });
        },
        yourTurn(s) {
            s._tone(587, 0, 0.14, { type: 'triangle', gain: 0.16 });
            s._tone(880, 0.12, 0.22, { type: 'triangle', gain: 0.16 });
        },
        theirTurn(s) {
            s._tone(440, 0, 0.14, { type: 'triangle', gain: 0.1 });
            s._tone(330, 0.12, 0.2, { type: 'triangle', gain: 0.1 });
        },
        win(s) {
            [523, 659, 784].forEach((f, i) => s._tone(f, i * 0.12, 0.25, { type: 'triangle', gain: 0.22 }));
            s._tone(1047, 0.38, 0.7, { type: 'triangle', gain: 0.25 });
            s._tone(784, 0.38, 0.7, { type: 'sine', gain: 0.12 });
        },
        lose(s) {
            [392, 349, 311].forEach((f, i) => s._tone(f, i * 0.22, 0.3, { type: 'sawtooth', gain: 0.07 }));
            s._tone([262, 196], 0.66, 0.8, { type: 'sawtooth', gain: 0.07 });
        },
        draw(s) {
            s._tone(523, 0, 0.3, { type: 'triangle', gain: 0.15 });
            s._tone(523, 0.3, 0.4, { type: 'triangle', gain: 0.12 });
        },
        warn(s) {
            s._tone(160, 0, 0.12, { type: 'square', gain: 0.05 });
        }
    },

    play(name) {
        const sound = this.SOUNDS[name];
        if (!sound || !this._ready()) return;
        // The same sound twice within a moment is one sound.
        const now = performance.now();
        if (this._last[name] && now - this._last[name] < 70) return;
        this._last[name] = now;
        try { sound(this); } catch (e) { /* never let a sound break the game */ }
    },

    // ---- wiring to the battle log -------------------------------------------

    /** The sound for one log entry, from its kind (and icon, for energy and the result). */
    soundFor(text, opts) {
        const kind = opts.kind || 'info';
        if (opts.icon === '🏁') {
            return /^You win/.test(text) ? 'win' : /draw/i.test(text) ? 'draw' : 'lose';
        }
        if (typeof ENERGY_ICONS !== 'undefined' && kind === 'info' && Object.values(ENERGY_ICONS).includes(opts.icon)) return 'energy';
        if (opts.icon === '🃏') return 'place';
        return {
            attack: 'attack', damage: 'damage', ko: 'ko', point: 'point', item: 'item',
            ability: 'ability', heal: 'heal', status: 'status', shield: 'shield', warn: 'warn'
        }[kind] || null;
    },

    _hookLog() {
        if (typeof Log === 'undefined' || Log._sfxHooked) return;
        Log._sfxHooked = true;
        const sfx = this;
        let quiet = 0;   // coin/dice entries are voiced by their own hooks

        const write = Log.write;
        Log.write = function (text, opts = {}) {
            if (!quiet) {
                const name = sfx.soundFor(text, opts);
                if (name) sfx.play(name);
            }
            return write.apply(this, arguments);
        };
        const wrapQuiet = (method, pick) => {
            const orig = Log[method];
            Log[method] = async function (...args) {
                sfx.play(pick(...args));
                quiet++;
                try { return await orig.apply(this, args); } finally { quiet--; }
            };
        };
        wrapQuiet('coin', result => (result === 'heads' ? 'heads' : 'tails'));
        wrapQuiet('coins', results => {
            const heads = results.filter(r => r === 'heads').length;
            return heads * 2 >= results.length ? 'heads' : 'tails';
        });
        wrapQuiet('dice', () => 'dice');
        wrapQuiet('turnBanner', side => (side === 'player' ? 'yourTurn' : 'theirTurn'));
    }
};
