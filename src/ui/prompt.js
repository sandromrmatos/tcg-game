// ============================================================================
// PLAYER PROMPTS
//
// The bridge that lets one implementation of an effect serve both sides.
//
// An effect never asks "am I the player?" — it calls ctx.chooseCreature({...})
// and passes an `aiPick` heuristic. For the player that opens an interactive
// selection; for the AI it runs the heuristic. Same code path, same rules.
// ============================================================================

const Prompt = {
    _promptBar: null,
    _cardModal: null,
    _active: null,

    init() {
        this._promptBar = document.getElementById('prompt-bar');
        this._cardModal = document.getElementById('choice-modal');
    },

    get isOpen() {
        return this._active !== null;
    },

    _showBar(title, onCancel) {
        if (!this._promptBar) return;
        this._promptBar.innerHTML = '';

        const label = document.createElement('span');
        label.className = 'prompt-text';
        label.textContent = title;
        this._promptBar.appendChild(label);

        if (onCancel) {
            const cancel = document.createElement('button');
            cancel.className = 'prompt-cancel';
            cancel.textContent = 'Cancel';
            cancel.onclick = onCancel;
            this._promptBar.appendChild(cancel);
        }
        this._promptBar.classList.add('prompt-bar-show');
    },

    _hideBar() {
        if (!this._promptBar) return;
        this._promptBar.classList.remove('prompt-bar-show');
        this._promptBar.innerHTML = '';
    },

    _slotElement(candidate) {
        if (candidate.location === 'active') {
            return document.querySelector(
                `.active-slot[data-player="${candidate.side}"]`);
        }
        return document.querySelector(
            `.bench-slot[data-player="${candidate.side}"][data-slot="${candidate.index}"]`);
    },

    /**
     * Highlights board slots and waits for the player to pick one.
     * @param {object} opts { candidates, title, cancellable }
     * @returns {Promise<object|null>} the chosen candidate, or null if cancelled
     */
    chooseCreature(opts) {
        const candidates = opts.candidates || [];
        if (candidates.length === 0) return Promise.resolve(null);

        return new Promise(resolve => {
            const bound = [];

            const cleanup = () => {
                for (const { el, handler } of bound) {
                    el.classList.remove('choosable');
                    el.removeEventListener('click', handler);
                }
                this._hideBar();
                this._active = null;
            };

            const finish = value => {
                cleanup();
                resolve(value);
            };

            for (const candidate of candidates) {
                const el = this._slotElement(candidate);
                if (!el) continue;
                const handler = event => {
                    event.stopPropagation();
                    finish(candidate);
                };
                el.classList.add('choosable');
                el.addEventListener('click', handler);
                bound.push({ el, handler });
            }

            if (bound.length === 0) {
                // Nothing selectable was rendered; don't deadlock.
                this._active = null;
                resolve(null);
                return;
            }

            this._active = { cancel: () => finish(null) };
            this._showBar(opts.title || 'Choose a creature',
                opts.cancellable ? () => finish(null) : null);
        });
    },

    /**
     * Modal grid of card faces. Used for discard piles, deck searches and any
     * choice that isn't a creature currently on the board.
     * @returns {Promise<number|null>} index into `cards`, or null
     */
    chooseCards(opts) {
        const cards = opts.cards || [];
        if (cards.length === 0) return Promise.resolve(null);

        return new Promise(resolve => {
            const modal = this._cardModal;
            if (!modal) { resolve(0); return; }

            const titleEl = modal.querySelector('.choice-title');
            const subtitleEl = modal.querySelector('.choice-subtitle');
            const gridEl = modal.querySelector('.choice-grid');
            const footEl = modal.querySelector('.choice-foot');

            titleEl.textContent = opts.title || 'Choose a card';
            subtitleEl.textContent = opts.subtitle || '';
            subtitleEl.style.display = opts.subtitle ? 'block' : 'none';
            gridEl.innerHTML = '';
            footEl.innerHTML = '';

            const finish = value => {
                modal.classList.remove('modal-show');
                this._active = null;
                resolve(value);
            };

            cards.forEach((entry, index) => {
                // Accepts either an instance ({ id, data }) or raw card data.
                const cardId = entry.id || entry.cardId;
                const data = entry.data || entry;

                const tile = document.createElement('button');
                tile.className = 'choice-card';
                tile.type = 'button';

                const img = document.createElement('img');
                img.src = cardImage(cardId);
                img.alt = data.name;
                tile.appendChild(img);

                const caption = document.createElement('span');
                caption.className = 'choice-card-label';
                caption.textContent = entry.label || data.name;
                tile.appendChild(caption);

                CardZoom.bind(tile, cardId);
                tile.addEventListener('click', () => finish(index));

                gridEl.appendChild(tile);
            });

            if (opts.cancellable) {
                const skip = document.createElement('button');
                skip.className = 'btn btn-ghost';
                skip.textContent = opts.cancelLabel || 'Skip';
                skip.onclick = () => finish(null);
                footEl.appendChild(skip);
            }

            this._active = { cancel: () => finish(null) };
            modal.classList.add('modal-show');
        });
    },

    /**
     * Simple button list. Returns the chosen option's `value`, or null.
     * @param {object} opts { title, subtitle, options: [{label, value, kind}], cancellable }
     */
    chooseOption(opts) {
        return new Promise(resolve => {
            const modal = this._cardModal;
            if (!modal) { resolve(null); return; }

            const titleEl = modal.querySelector('.choice-title');
            const subtitleEl = modal.querySelector('.choice-subtitle');
            const gridEl = modal.querySelector('.choice-grid');
            const footEl = modal.querySelector('.choice-foot');

            titleEl.textContent = opts.title || 'Choose';
            subtitleEl.textContent = opts.subtitle || '';
            subtitleEl.style.display = opts.subtitle ? 'block' : 'none';
            gridEl.innerHTML = '';
            footEl.innerHTML = '';

            const finish = value => {
                modal.classList.remove('modal-show');
                this._active = null;
                resolve(value);
            };

            for (const option of (opts.options || [])) {
                const btn = document.createElement('button');
                btn.className = `btn ${option.kind === 'ghost' ? 'btn-ghost' : 'btn-primary'}`;
                btn.textContent = option.label;
                btn.onclick = () => finish(option.value);
                footEl.appendChild(btn);
            }

            if (opts.cancellable) {
                const cancel = document.createElement('button');
                cancel.className = 'btn btn-ghost';
                cancel.textContent = opts.cancelLabel || 'Cancel';
                cancel.onclick = () => finish(null);
                footEl.appendChild(cancel);
            }

            this._active = { cancel: () => finish(null) };
            modal.classList.add('modal-show');
        });
    },

    /**
     * Highlights EMPTY board slots and waits for a pick. Used for placing a
     * creature on the bench, where there is no card to click yet.
     * @returns {Promise<number|null>} the chosen bench slot index
     */
    chooseEmptyBenchSlot(opts) {
        const slots = opts.slots || [];
        if (slots.length === 0) return Promise.resolve(null);

        return new Promise(resolve => {
            const bound = [];

            const cleanup = () => {
                for (const { el, handler } of bound) {
                    el.classList.remove('choosable');
                    el.removeEventListener('click', handler);
                }
                this._hideBar();
                this._active = null;
            };
            const finish = value => { cleanup(); resolve(value); };

            for (const index of slots) {
                const el = document.querySelector(
                    `.bench-slot[data-player="${opts.side}"][data-slot="${index}"]`);
                if (!el) continue;
                const handler = event => {
                    event.stopPropagation();
                    finish(index);
                };
                el.classList.add('choosable');
                el.addEventListener('click', handler);
                bound.push({ el, handler });
            }

            if (bound.length === 0) { this._active = null; resolve(null); return; }

            this._active = { cancel: () => finish(null) };
            this._showBar(opts.title || 'Choose a bench slot', () => finish(null));
        });
    },

    /** Force-closes any open prompt (used when the game ends mid-choice). */
    cancelAll() {
        if (this._active) this._active.cancel();
    }
};

// ---------------------------------------------------------------------------
// Card zoom, shared by every surface that shows a card face.
//
//   mouse: hover to zoom, move away to close (as before)
//   touch: press and hold to zoom, let go to close. A quick tap is still a
//          normal tap (add to deck, play the card), and the tap that ends a
//          hold is swallowed so holding a card never also plays it.
//
// The old version zoomed on `mouseenter`, which phones fire on every tap but
// never follow with `mouseleave`, so the zoom stuck open over everything.
// ---------------------------------------------------------------------------

const CardZoom = {
    _el: null,
    _img: null,
    HOLD_MS: 320,
    MOVE_CANCEL_PX: 12,

    init() {
        this._el = document.getElementById('card-zoom');
        this._img = document.getElementById('card-zoom-image');
        // A zoom must never outlive the gesture or the page it was opened on.
        window.addEventListener('blur', () => this.hide());
        document.addEventListener('visibilitychange', () => this.hide());
    },

    show(cardId) {
        if (!this._el || !cardId) return;
        this._img.src = cardImage(cardId);
        this._el.classList.add('card-zoom-show');
    },

    hide() {
        if (!this._el) return;
        this._el.classList.remove('card-zoom-show');
    },

    /**
     * Wires zoom onto one element. `cardId` may be a function, for elements
     * whose card can change between renders.
     */
    bind(el, cardId) {
        if (!el) return el;
        const id = () => (typeof cardId === 'function' ? cardId() : cardId);
        let timer = null;
        let held = false;
        let start = null;

        const cancelHold = () => {
            clearTimeout(timer);
            timer = null;
        };
        const end = () => {
            cancelHold();
            if (held) this.hide();
            start = null;
        };

        el.addEventListener('pointerenter', e => {
            if (e.pointerType === 'mouse') this.show(id());
        });
        el.addEventListener('pointerleave', e => {
            if (e.pointerType === 'mouse') this.hide();
            else end();
        });
        el.addEventListener('pointerdown', e => {
            if (e.pointerType === 'mouse') return;
            held = false;
            start = { x: e.clientX, y: e.clientY };
            cancelHold();
            timer = setTimeout(() => {
                held = true;
                this.show(id());
            }, this.HOLD_MS);
        });
        el.addEventListener('pointermove', e => {
            if (!start || held) return;
            // A finger moving is a scroll, not a hold.
            if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > this.MOVE_CANCEL_PX) cancelHold();
        });
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        // Swallow the click that ends a hold, so zooming never also acts.
        el.addEventListener('click', e => {
            if (!held) return;
            held = false;
            e.preventDefault();
            e.stopImmediatePropagation();
        }, true);
        // Stop the phone's own long-press menu ("save image") appearing.
        el.addEventListener('contextmenu', e => e.preventDefault());
        el.classList.add('zoomable');
        return el;
    }
};
