// ============================================================================
// DECK BUILDER
//
// Set navigation is generated from the cardSets registry, so a third set shows
// up as another tab with no code change. The original hard-coded a two-value
// toggle (`x === 'Elemental Awakening' ? 'Galactic Adventures' : ...`) that a
// third set could not express.
//
// Also adds what the original lacked: a name search, type and stage filters,
// live validation and warnings about missing pre-evolutions.
// ============================================================================

const DeckBuilder = {
    cards: [],           // card ids, with duplicates
    editingName: null,
    setFilter: 'all',    // 'all' or a set id
    typeFilter: 'all',
    stageFilter: 'all',
    search: '',

    /**
     * @param {string} [existingName] deck to edit
     * @param {object} [opts] { qa: true } builds a QA test deck from any card,
     *   ignoring the collection. QA decks are kept apart from the player's.
     */
    open(existingName, opts = {}) {
        this.cards = [];
        this.qa = !!opts.qa;
        this.editingName = existingName || null;
        this.setFilter = 'all';
        this.typeFilter = 'all';
        this.stageFilter = 'all';
        this.search = '';

        if (existingName) {
            const saved = this.qa ? DeckLibrary.findTest(existingName) : DeckLibrary.findCustom(existingName);
            if (saved) this.cards = saved.cards.slice();
        }

        setText('builder-title', this.qa ? 'QA test deck builder (any card)' : 'Deck builder');
        setText('builder-hint', this.qa
            ? 'QA mode: every card is available. Test decks only appear in the QA launcher and never count towards stats or credits.'
            : 'Only cards you own are shown. You can use as many copies as you own, up to ' + MAX_COPIES + ' of each card.');

        const nameInput = document.getElementById('builder-name');
        if (nameInput) nameInput.value = existingName || '';

        this.buildControls();
        this.renderPool();
        this.renderDeck();

        Screens.openModal('builder-modal');
    },

    close() {
        Screens.closeModal('builder-modal');
        this.cards = [];
    },

    // -----------------------------------------------------------------------
    // Controls
    // -----------------------------------------------------------------------

    buildControls() {
        // Set tabs, generated from the registry.
        const tabs = document.getElementById('builder-set-tabs');
        if (tabs) {
            tabs.innerHTML = '';
            const sets = this.qa ? cardSets : cardSets.filter(s => this.setOpen(s.id));
            const entries = [{ id: 'all', name: 'All sets' }].concat(
                sets.map(s => ({ id: s.id, name: s.name })));

            for (const entry of entries) {
                const tab = document.createElement('button');
                tab.className = 'set-tab';
                tab.type = 'button';
                tab.textContent = entry.name;
                tab.classList.toggle('set-tab-active', this.setFilter === entry.id);
                tab.onclick = () => {
                    this.setFilter = entry.id;
                    this.buildControls();
                    this.renderPool();
                };
                tabs.appendChild(tab);
            }
        }

        // Type filter, generated from the types actually present.
        const typeSelect = document.getElementById('builder-type-filter');
        if (typeSelect && typeSelect.options.length === 0) {
            const types = ['all'].concat(
                Array.from(new Set(cardDatabase.map(c => getCardType(c)))).sort());
            for (const type of types) {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type === 'all' ? 'All types' : type;
                typeSelect.appendChild(option);
            }
            typeSelect.addEventListener('change', () => {
                this.typeFilter = typeSelect.value;
                this.renderPool();
            });
        }

        const stageSelect = document.getElementById('builder-stage-filter');
        if (stageSelect && stageSelect.options.length === 0) {
            const stages = ['all'].concat(
                Array.from(new Set(cardDatabase.map(c => c.stage))));
            for (const stage of stages) {
                const option = document.createElement('option');
                option.value = stage;
                option.textContent = stage === 'all' ? 'All stages' : stage;
                stageSelect.appendChild(option);
            }
            stageSelect.addEventListener('change', () => {
                this.stageFilter = stageSelect.value;
                this.renderPool();
            });
        }

        const searchInput = document.getElementById('builder-search');
        if (searchInput && !searchInput.dataset.bound) {
            searchInput.dataset.bound = 'true';
            searchInput.addEventListener('input', () => {
                this.search = searchInput.value.trim().toLowerCase();
                this.renderPool();
            });
        }

        const saveBtn = document.getElementById('builder-save');
        if (saveBtn && !saveBtn.dataset.bound) {
            saveBtn.dataset.bound = 'true';
            saveBtn.addEventListener('click', () => this.save());
        }

        const clearBtn = document.getElementById('builder-clear');
        if (clearBtn && !clearBtn.dataset.bound) {
            clearBtn.dataset.bound = 'true';
            clearBtn.addEventListener('click', () => {
                this.cards = [];
                this.renderPool();
                this.renderDeck();
            });
        }
    },

    // -----------------------------------------------------------------------
    // Card pool
    // -----------------------------------------------------------------------

    hasProfile() {
        return typeof Profile !== 'undefined' && !!Profile.s;
    },

    setOpen(setId) {
        return !this.hasProfile() || Profile.isSetUnlocked(setId);
    },

    /** How many copies of a card this deck may hold: owned, capped at MAX_COPIES. */
    limit(cardId) {
        if (this.qa || !this.hasProfile()) return MAX_COPIES;
        return Math.min(MAX_COPIES, Profile.owned(cardId));
    },

    filteredPool() {
        return cardDatabase.filter(card => {
            if (!this.qa && this.hasProfile()) {
                if (Profile.owned(card.id) <= 0) return false;
                if (!Profile.isSetUnlocked(card.set)) return false;
            }
            if (this.setFilter !== 'all' && card.set !== this.setFilter) return false;
            if (this.typeFilter !== 'all' && getCardType(card) !== this.typeFilter) return false;
            if (this.stageFilter !== 'all' && card.stage !== this.stageFilter) return false;
            if (this.search) {
                const haystack = [
                    card.name,
                    card.move1Name || '',
                    card.move2Name || '',
                    card.abilityName || ''
                ].join(' ').toLowerCase();
                if (!haystack.includes(this.search)) return false;
            }
            return true;
        }).sort((a, b) => {
            if (a.set !== b.set) return String(a.set).localeCompare(String(b.set));
            return a.number - b.number;
        });
    },

    renderPool() {
        const host = document.getElementById('builder-pool');
        if (!host) return;
        host.innerHTML = '';

        const pool = this.filteredPool();
        setText('builder-pool-count', pool.length);

        if (pool.length === 0) {
            const ownsNothing = !this.qa && this.hasProfile() && Object.keys(Profile.s.cards).length === 0;
            host.appendChild(emptyNote(ownsNothing
                ? "You don't own any cards yet. Draw cards, buy them in the Store, or earn credits from missions and mini-games."
                : 'No cards match those filters.'));
            return;
        }

        for (const card of pool) {
            const copies = this.cards.filter(id => id === card.id).length;
            const limit = this.limit(card.id);

            const tile = document.createElement('button');
            tile.className = 'pool-card';
            tile.type = 'button';
            tile.dataset.type = getCardType(card);
            tile.disabled = copies >= limit;
            tile.title = copies >= limit
                ? (limit < MAX_COPIES
                    ? `${card.name}: you own ${limit}, all in the deck`
                    : `${card.name}: already at ${MAX_COPIES} copies`)
                : `Add ${card.name}`;

            const img = document.createElement('img');
            img.src = cardImage(card.id);
            img.alt = card.name;
            img.loading = 'lazy';
            tile.appendChild(img);

            if (copies > 0) {
                const badge = document.createElement('span');
                badge.className = 'pool-count';
                badge.textContent = `${copies}/${limit}`;
                tile.appendChild(badge);
            }
            if (!this.qa && this.hasProfile()) {
                const own = document.createElement('span');
                own.className = 'pool-owned';
                own.textContent = `own ${Profile.owned(card.id)}`;
                tile.appendChild(own);
            }

            tile.addEventListener('mouseenter', () => CardZoom.show(card.id));
            tile.addEventListener('mouseleave', () => CardZoom.hide());
            tile.addEventListener('click', () => this.add(card.id));

            host.appendChild(tile);
        }
    },

    // -----------------------------------------------------------------------
    // Deck contents
    // -----------------------------------------------------------------------

    add(cardId) {
        if (this.cards.filter(id => id === cardId).length >= this.limit(cardId)) return;
        if (this.cards.length >= DECK_SIZE) {
            Log.warn(`A deck holds ${DECK_SIZE} cards.`);
            return;
        }
        this.cards.push(cardId);
        this.renderPool();
        this.renderDeck();
    },

    remove(cardId) {
        const index = this.cards.indexOf(cardId);
        if (index !== -1) this.cards.splice(index, 1);
        this.renderPool();
        this.renderDeck();
    },

    renderDeck() {
        setText('builder-deck-count', this.cards.length);
        setText('builder-deck-target', DECK_SIZE);

        const host = document.getElementById('builder-deck');
        if (host) {
            host.innerHTML = '';

            const counts = new Map();
            for (const id of this.cards) counts.set(id, (counts.get(id) || 0) + 1);

            const ordered = Array.from(counts.keys()).sort((a, b) => {
                const da = getCardData(a), db = getCardData(b);
                if (da.stage !== db.stage) return String(da.stage).localeCompare(String(db.stage));
                return da.name.localeCompare(db.name);
            });

            if (ordered.length === 0) {
                host.appendChild(emptyNote('Click cards on the left to add them.'));
            }

            for (const id of ordered) {
                const data = getCardData(id);
                const row = document.createElement('div');
                row.className = 'deck-row';

                const img = document.createElement('img');
                img.src = cardImage(id);
                img.alt = data.name;
                img.addEventListener('mouseenter', () => CardZoom.show(id));
                img.addEventListener('mouseleave', () => CardZoom.hide());
                row.appendChild(img);

                const label = document.createElement('span');
                label.className = 'deck-row-name';
                label.textContent = data.name;
                row.appendChild(label);

                const stage = document.createElement('span');
                stage.className = 'deck-row-stage';
                stage.textContent = data.stage;
                row.appendChild(stage);

                const count = document.createElement('span');
                count.className = 'deck-row-count';
                count.textContent = `×${counts.get(id)}`;
                row.appendChild(count);

                const remove = document.createElement('button');
                remove.className = 'deck-row-remove';
                remove.type = 'button';
                remove.textContent = '−';
                remove.title = `Remove one ${data.name}`;
                remove.onclick = () => this.remove(id);
                row.appendChild(remove);

                host.appendChild(row);
            }
        }

        this.renderValidation();
    },

    renderValidation() {
        const host = document.getElementById('builder-validation');
        if (!host) return;
        host.innerHTML = '';

        const result = this.check();
        const line = document.createElement('div');
        line.className = result.valid ? 'validation-ok' : 'validation-error';
        line.textContent = result.valid ? 'This deck is legal.' : result.error;
        host.appendChild(line);

        for (const warning of deckWarnings(this.cards)) {
            const warn = document.createElement('div');
            warn.className = 'validation-warn';
            warn.textContent = warning;
            host.appendChild(warn);
        }

        const saveBtn = document.getElementById('builder-save');
        if (saveBtn) saveBtn.disabled = !result.valid;
    },

    // -----------------------------------------------------------------------
    // Saving
    // -----------------------------------------------------------------------

    /** Deck rules plus, outside QA mode, the cards must be owned. */
    check() {
        const result = validateDeck(this.cards);
        if (!result.valid || this.qa || !this.hasProfile()) return result;
        return Profile.checkOwnership(this.cards);
    },

    save() {
        const nameInput = document.getElementById('builder-name');
        const name = (nameInput ? nameInput.value : '').trim();

        if (!name) {
            Log.warn('Give the deck a name first.');
            return;
        }
        const result = this.check();
        if (!result.valid) {
            Log.warn(result.error);
            return;
        }

        const existing = this.qa ? DeckLibrary.findTest(name) : DeckLibrary.findCustom(name);
        if (existing && name !== this.editingName) {
            Log.warn(`You already have a deck called "${name}". Pick another name.`);
            return;
        }

        if (this.qa) {
            DeckLibrary.saveTestDeck(name, this.cards, this.editingName);
            this.close();
            Screens.showDebug();
            return;
        }

        // Saving under a new name replaces the edited deck in place.
        DeckLibrary.saveCustomDeck(name, this.cards, this.editingName);
        this.close();
        Screens.showDeckSelection();
    }
};
