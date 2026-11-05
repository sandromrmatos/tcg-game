// ============================================================================
// SCREENS AND MODALS
//
// Deck selection, deck preview, discard viewer, rules panel, debug launcher and
// the game-over panel. One small modal stack so Escape always closes the thing
// on top.
// ============================================================================

const Screens = {
    _stack: [],

    init() {
        // Close buttons and backdrop clicks, wired generically.
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal(btn.getAttribute('data-close-modal'));
            });
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', event => {
                if (event.target === modal && modal.dataset.dismissable !== 'false') {
                    this.closeModal(modal.id);
                }
            });
        });

        const createBtn = document.getElementById('create-deck-btn');
        if (createBtn) createBtn.addEventListener('click', () => DeckBuilder.open());

        const debugBtn = document.getElementById('debug-btn');
        if (debugBtn) debugBtn.addEventListener('click', () => this.requestDebug());

        const debugStart = document.getElementById('debug-start-btn');
        if (debugStart) debugStart.addEventListener('click', () => this.startDebugGame());

        const debugBuild = document.getElementById('debug-build-btn');
        if (debugBuild) debugBuild.addEventListener('click', () => {
            this.closeModal('debug-modal');
            DeckBuilder.open(null, { qa: true });
        });

        // QA: look at either deck before starting a test battle.
        for (const [buttonId, selectId] of [['debug-preview-player', 'debug-player-deck'], ['debug-preview-ai', 'debug-ai-deck']]) {
            const btn = document.getElementById(buttonId);
            if (!btn) continue;
            btn.addEventListener('click', () => {
                const select = document.getElementById(selectId);
                const index = parseInt(select && select.value, 10);
                if (Number.isInteger(index)) this.showDeckPreview(index, { playable: false });
            });
        }

        const debugClear = document.getElementById('debug-clear-btn');
        if (debugClear) debugClear.addEventListener('click', () => {
            for (const d of DeckLibrary.loadTestDecks()) DeckLibrary.deleteTestDeck(d.name);
            this.showDebug();
        });
    },

    /** Session-only flag set by the QA password. */
    debugUnlocked: false,
    DEBUG_PASSWORD: '12345',

    // -----------------------------------------------------------------------
    // Modal stack
    // -----------------------------------------------------------------------

    openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add('modal-show');
        this._stack.push(id);
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('modal-show');
        this._stack = this._stack.filter(entry => entry !== id);
    },

    closeTopModal() {
        const top = this._stack[this._stack.length - 1];
        if (top) this.closeModal(top);
    },

    // -----------------------------------------------------------------------
    // Deck selection
    // -----------------------------------------------------------------------

    showDeckSelection() {
        document.getElementById('deck-screen').classList.add('screen-show');
        document.getElementById('game-screen').classList.remove('screen-show');

        if (typeof Hub !== 'undefined') Hub.showPage('play');
        else this.renderDeckList();
    },

    /** The player's own decks (built from owned cards). Presets are the AI's. */
    renderDeckList() {
        DeckLibrary.load();
        const list = document.getElementById('deck-list');
        if (!list) return;
        list.innerHTML = '';

        const decks = DeckLibrary.playerDecks();
        if (decks.length === 0) {
            list.appendChild(this._buildNoDecksTile());
            return;
        }
        for (const deck of decks) {
            list.appendChild(this._buildDeckTile(deck, DeckLibrary.indexOf(deck)));
        }
    },

    _buildNoDecksTile() {
        const tile = document.createElement('div');
        tile.className = 'deck-tile deck-empty';

        const title = document.createElement('h3');
        title.textContent = 'No decks yet';
        tile.appendChild(title);

        const text = document.createElement('p');
        text.className = 'deck-meta';
        text.textContent = `To play against the AI you need a ${DECK_SIZE}-card deck built from cards you own: ` +
            'one main type, plus any Neutral and Item cards, at least one Stage 1 creature, and at most ' +
            `${MAX_COPIES} copies of a card. Collect cards with Draw a Card, the Store, missions and the mini-games.`;
        tile.appendChild(text);
        return tile;
    },

    _buildDeckTile(deck, index) {
        const tile = document.createElement('div');
        tile.className = 'deck-tile';
        tile.dataset.custom = deck.type === 'custom' ? 'true' : 'false';

        const title = document.createElement('h3');
        title.textContent = deck.name;
        if (deck.type === 'custom') {
            const star = document.createElement('span');
            star.className = 'deck-custom-badge';
            star.textContent = '★';
            star.title = 'Custom deck';
            title.appendChild(star);
        }
        tile.appendChild(title);

        // Type breakdown, so the tile says something useful at a glance.
        const counts = new Map();
        for (const id of deck.cards) {
            const data = getCardData(id);
            if (!data) continue;
            const type = getCardType(data);
            counts.set(type, (counts.get(type) || 0) + 1);
        }
        const types = document.createElement('div');
        types.className = 'deck-types';
        for (const [type, count] of counts) {
            const pill = document.createElement('span');
            pill.className = 'type-pill';
            pill.style.setProperty('--pill', typeColor(type));
            pill.textContent = `${type} ${count}`;
            types.appendChild(pill);
        }
        tile.appendChild(types);

        const setsUsed = new Set(deck.cards.map(id => {
            const set = setForCardId(id);
            return set ? set.name : 'Unknown';
        }));
        const meta = document.createElement('p');
        meta.className = 'deck-meta';
        meta.textContent = `${deck.cards.length} cards · ${Array.from(setsUsed).join(' + ')}`;
        tile.appendChild(meta);

        const problem = this._deckProblem(deck);
        if (problem) {
            const warn = document.createElement('p');
            warn.className = 'deck-problem';
            warn.textContent = problem;
            tile.appendChild(warn);
        }

        const actions = document.createElement('div');
        actions.className = 'deck-actions';

        const play = document.createElement('button');
        play.className = 'btn btn-primary';
        play.textContent = 'Play';
        play.onclick = () => this.selectDeck(index);
        actions.appendChild(play);

        const preview = document.createElement('button');
        preview.className = 'btn btn-ghost';
        preview.textContent = 'Preview';
        preview.onclick = () => this.showDeckPreview(index);
        actions.appendChild(preview);

        if (deck.type === 'custom') {
            const edit = document.createElement('button');
            edit.className = 'btn btn-ghost';
            edit.textContent = 'Edit';
            edit.onclick = () => DeckBuilder.open(deck.name);
            actions.appendChild(edit);

            const remove = document.createElement('button');
            remove.className = 'btn btn-danger';
            remove.textContent = 'Delete';
            remove.onclick = async () => {
                const confirmed = await Prompt.chooseOption({
                    title: `Delete "${deck.name}"?`,
                    subtitle: 'This cannot be undone.',
                    options: [{ label: 'Delete', value: true }],
                    cancellable: true
                });
                if (confirmed) {
                    DeckLibrary.deleteCustomDeck(deck.name);
                    this.showDeckSelection();
                }
            };
            actions.appendChild(remove);
        }

        tile.appendChild(actions);
        return tile;
    },

    /**
     * @param {number} index deck library index
     * @param {object} [opts] { playable: false } hides "Play this deck" (QA preview)
     */
    showDeckPreview(index, opts = {}) {
        const deck = DeckLibrary.get(index);
        if (!deck) return;
        const playable = opts.playable !== false;

        const tag = deck.type === 'preset'
            ? ` · AI deck (${deckPrimaryType(deck.cards)})`
            : deck.type === 'test' ? ' · QA test deck' : '';
        setText('deck-preview-title', deck.name + tag);

        const grid = document.getElementById('deck-preview-grid');
        grid.innerHTML = '';

        const counts = new Map();
        for (const id of deck.cards) counts.set(id, (counts.get(id) || 0) + 1);

        const ordered = Array.from(counts.keys()).sort((a, b) => {
            const setA = setForCardId(a), setB = setForCardId(b);
            const nameA = setA ? setA.name : '', nameB = setB ? setB.name : '';
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return cardNumber(a) - cardNumber(b);
        });

        for (const id of ordered) {
            const data = getCardData(id);
            if (!data) continue;

            const tile = document.createElement('div');
            tile.className = 'preview-card';

            const img = document.createElement('img');
            img.src = cardImage(id);
            img.alt = data.name;
            CardZoom.bind(img, id);
            tile.appendChild(img);

            const count = document.createElement('span');
            count.className = 'preview-count';
            count.textContent = `×${counts.get(id)}`;
            tile.appendChild(count);

            grid.appendChild(tile);
        }

        const warnings = deckWarnings(deck.cards);
        const warnEl = document.getElementById('deck-preview-warnings');
        if (warnEl) {
            warnEl.innerHTML = '';
            warnEl.style.display = warnings.length ? 'block' : 'none';
            for (const text of warnings) {
                const line = document.createElement('div');
                line.textContent = text;
                warnEl.appendChild(line);
            }
        }

        const playBtn = document.getElementById('deck-preview-play');
        if (playBtn) {
            playBtn.style.display = playable ? '' : 'none';
            playBtn.onclick = () => {
                this.closeModal('deck-preview-modal');
                this.selectDeck(index);
            };
        }

        this.openModal('deck-preview-modal');
    },

    /**
     * The panel for one of the player's creatures: the card, its state, and
     * its ability with a Use button. Opening it never acts on its own.
     */
    showCreaturePanel(card, location, index) {
        const body = document.getElementById('creature-panel-body');
        if (!body) return;
        body.innerHTML = '';

        const data = card.data;
        const hp = remainingHp(card);
        const el = (tag, cls, text) => {
            const node = document.createElement(tag);
            if (cls) node.className = cls;
            if (text !== undefined) node.textContent = text;
            return node;
        };

        const img = el('img', 'creature-panel-img');
        img.src = cardImage(card.id);
        img.alt = data.name;
        body.appendChild(img);

        const info = el('div', 'creature-panel-info');
        info.appendChild(el('h2', null, data.name));
        info.appendChild(el('p', 'creature-panel-meta',
            `${data.type} · ${data.stage} · ${location === 'active' ? 'Active' : 'Bench'}`));
        info.appendChild(el('p', 'creature-panel-meta',
            `HP ${hp}/${data.hp} · ⚡ ${card.energy} energy · Retreat ${data.retreat}`));

        for (const status of Status.list(card)) {
            const c = STATUS_CONDITIONS[status];
            info.appendChild(el('p', 'creature-panel-status', `${c.icon} ${c.name}: ${c.blurb}`));
        }

        if (data.abilityEffect) {
            const box = el('div', 'creature-panel-ability');
            const where = { any: 'Usable from the active spot or the bench', active: 'Usable from the active spot only', bench: 'Usable from the bench only' };
            box.appendChild(el('div', 'creature-panel-ability-name', `✨ ${data.abilityName}`));
            const text = typeof cardText === 'function' ? cardText(card.id, 'ability') : '';
            if (text) box.appendChild(el('p', 'creature-panel-ability-text', text));
            box.appendChild(el('p', 'creature-panel-ability-where', where[data.abilityLocation || 'any'] || ''));

            const check = gameState.busy
                ? { ok: false, reason: 'Wait for the current action to finish.' }
                : AbilityRegistry.canUse(card, 'player', location);
            if (!check.ok) box.appendChild(el('p', 'creature-panel-ability-why', check.reason));

            const use = el('button', 'btn btn-primary', `Use ${data.abilityName}`);
            use.type = 'button';
            use.disabled = !check.ok;
            use.onclick = () => {
                this.closeModal('creature-modal');
                onUseAbility(card, location, index);
            };
            box.appendChild(use);
            info.appendChild(box);
        } else {
            info.appendChild(el('p', 'creature-panel-meta', 'This creature has no ability.'));
        }

        for (const move of movesOf(data)) {
            const text = typeof cardText === 'function' ? cardText(card.id, `move${move.number}`) : '';
            const line = el('p', 'creature-panel-move',
                `⚔️ ${move.name} · ${move.costCount}⚡ · ${move.damage || '—'}${text ? ' · ' + text : ''}`);
            info.appendChild(line);
        }

        body.appendChild(info);
        this.openModal('creature-modal');
    },

    /** Why a player deck can't be played right now, or null. */
    _deckProblem(deck) {
        const check = validateDeck(deck.cards);
        if (!check.valid) return check.error;
        if (deck.type === 'custom' && typeof Profile !== 'undefined' && Profile.s) {
            const own = Profile.checkOwnership(deck.cards);
            if (!own.valid) return own.error;
        }
        return null;
    },

    /**
     * Starts a real game with one of the player's decks; the AI takes a random
     * preset. The match is recorded so leaving it counts as a loss.
     */
    async selectDeck(index) {
        const deck = DeckLibrary.get(index);
        if (!deck) return;

        const problem = this._deckProblem(deck);
        if (problem) {
            Log.warn(`That deck can't be played: ${problem}`);
            return;
        }

        const hasProfile = typeof Profile !== 'undefined' && !!Profile.s;
        if (hasProfile && typeof Hub !== 'undefined') {
            const notice = Profile.preMatchNotice();
            const lines = [];
            if (notice.creditsFull) {
                lines.push(`Your credits are full (${MAX_CREDITS}/${MAX_CREDITS}). Even if you win, you won't get a credit. Spend some credits first if you want the reward.`);
            } else if (notice.dailyLimitReached) {
                lines.push(`You've already earned your ${WIN_CREDITS_PER_DAY} win credits today, so a win won't earn a credit until tomorrow.`);
            }
            if (lines.length) {
                const go = await Hub.dialog({
                    title: 'No credit for this game',
                    message: lines.join(' '),
                    buttons: [{ label: 'Cancel', value: false }, { label: 'Play anyway', value: true, kind: 'primary' }]
                });
                if (!go || !go.value) return;
            }
        }

        gameState.player.selectedDeck = index;

        // Galactic Adventures decks join the AI's pool once that set is unlocked.
        const presets = DeckLibrary.aiPresets();
        const aiDeck = Rng.pick(presets) || deck;
        gameState.opponent.selectedDeck = DeckLibrary.indexOf(aiDeck);

        this.closeModal('deck-preview-modal');
        if (hasProfile) Profile.startMatch(deck.name, aiDeck.name);
        this.beginGame();
    },

    /** "Leave game": a running real match counts as a loss, so confirm first. */
    async requestLeaveGame() {
        const running = gameState.phase !== 'gameOver'
            && typeof Profile !== 'undefined' && Profile.hasActiveMatch();
        if (running) {
            const answer = typeof Hub !== 'undefined'
                ? await Hub.dialog({
                    title: 'Leave this game?',
                    message: 'Leaving a game before it ends counts as a loss in your stats.',
                    buttons: [{ label: 'Keep playing', value: false }, { label: 'Leave (counts as a loss)', value: true, kind: 'danger' }]
                })
                : { value: true };
            if (!answer || !answer.value) return;
            Profile.forfeitMatch(playerMatchReport(false));
        }
        gameState.phase = 'gameOver';
        Prompt.cancelAll();
        this.returnToDeckSelection();
    },

    beginGame() {
        Log.clear();
        gameState.track = createMatchTrack();
        gameState.firstTurnSide = null;
        gameState.phase = 'setup';
        buildDecks();
        drawOpeningHands();
        aiSetup();

        document.getElementById('deck-screen').classList.remove('screen-show');
        document.getElementById('game-screen').classList.add('screen-show');

        Log.write('Place your active creature, then press Ready. The AI\'s creatures stay face down until then.',
            { kind: 'turn', icon: '🎬' });
        Render.all();
    },

    returnToDeckSelection() {
        resetGameState();
        Log.clear();
        this.closeModal('game-over-modal');
        this.showDeckSelection();
    },

    // -----------------------------------------------------------------------
    // Discard viewer
    // -----------------------------------------------------------------------

    showDiscard(side) {
        const pile = gameState[side].discardPile;
        setText('discard-title', side === 'player' ? 'Your discard pile' : "Opponent's discard pile");

        const grid = document.getElementById('discard-grid');
        grid.innerHTML = '';

        if (pile.length === 0) {
            grid.appendChild(emptyNote('Nothing here yet.'));
        } else {
            for (const card of pile) {
                const img = document.createElement('img');
                img.className = 'discard-card';
                img.src = cardImage(card.id);
                img.alt = card.data.name;
                CardZoom.bind(img, card.id);
                grid.appendChild(img);
            }
        }
        this.openModal('discard-modal');
    },

    // -----------------------------------------------------------------------
    // Rules
    // -----------------------------------------------------------------------

    showInfo() {
        this.buildInfoContent();
        this.openModal('info-modal');
    },

    /**
     * The rules panel is generated from the registries, so it can never drift
     * out of date the way a hand-written list does.
     */
    buildInfoContent() {
        const host = document.getElementById('info-generated');
        if (!host || host.dataset.built === 'true') return;

        const section = (title, body) => {
            const wrap = document.createElement('section');
            const h = document.createElement('h3');
            h.textContent = title;
            wrap.appendChild(h);
            wrap.appendChild(body);
            host.appendChild(wrap);
        };

        // Status conditions
        const statusList = document.createElement('ul');
        for (const [id, condition] of Object.entries(STATUS_CONDITIONS)) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${condition.icon} ${condition.name}</strong> — ${condition.blurb}`;
            statusList.appendChild(li);
        }
        const statusNote = document.createElement('p');
        statusNote.textContent =
            'Conditions only ever sit on the active creature and clear the moment it leaves the active spot.';
        const statusWrap = document.createElement('div');
        statusWrap.appendChild(statusList);
        statusWrap.appendChild(statusNote);
        section('Status conditions', statusWrap);

        // Type chart
        const typeList = document.createElement('ul');
        for (const [attacker, defender] of Object.entries(SUPER_EFFECTIVE)) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${attacker}</strong> is super effective against <strong>${defender}</strong> (+10 damage)`;
            typeList.appendChild(li);
        }
        section('Type effectiveness', typeList);

        // Damage order, straight from the modifier table.
        const orderList = document.createElement('ol');
        orderList.className = 'info-order';
        for (const mod of DAMAGE_MODIFIERS) {
            const li = document.createElement('li');
            li.textContent = mod.label;
            orderList.appendChild(li);
        }
        const orderNote = document.createElement('p');
        orderNote.textContent =
            'Damage is calculated in this order, identically for both players.';
        const orderWrap = document.createElement('div');
        orderWrap.appendChild(orderNote);
        orderWrap.appendChild(orderList);
        section('Damage order', orderWrap);

        // Card sets
        const setList = document.createElement('ul');
        for (const set of cardSets) {
            const cards = CardIndex.inSet(set.id);
            const creatures = cards.filter(c => isCreature(c)).length;
            const items = cards.length - creatures;
            const li = document.createElement('li');
            li.innerHTML = `<strong>${set.name}</strong> — ${creatures} creatures, ${items} items`;
            setList.appendChild(li);
        }
        section('Card sets', setList);

        host.dataset.built = 'true';
    },

    // -----------------------------------------------------------------------
    // Game over
    // -----------------------------------------------------------------------

    showGameOver(winner, message, reason, reward) {
        setText('game-over-title', message);
        setText('game-over-reason', reason || '');
        setText('game-over-score',
            `${gameState.player.points} — ${gameState.opponent.points}`);

        const rewardEl = document.getElementById('game-over-reward');
        if (rewardEl) {
            rewardEl.textContent = reward ? reward.message : 'QA game: not counted in stats or credits.';
            rewardEl.dataset.kind = reward ? reward.type : 'qa';
        }

        const panel = document.getElementById('game-over-modal');
        if (panel) panel.dataset.result = winner;

        const again = document.getElementById('game-over-again');
        if (again) again.onclick = () => this.returnToDeckSelection();

        this.openModal('game-over-modal');
    },

    // -----------------------------------------------------------------------
    // Debug launcher: pick both decks, for testing specific matchups
    // -----------------------------------------------------------------------

    /** The QA launcher is password-protected; the password lasts for the session. */
    async requestDebug() {
        if (!this.debugUnlocked) {
            if (typeof Hub === 'undefined') return;
            const answer = await Hub.dialog({
                title: 'QA mode',
                message: 'Enter the QA password to choose both decks.',
                input: { type: 'password', placeholder: 'Password' },
                buttons: [{ label: 'Cancel', value: false }, { label: 'Unlock', value: true, kind: 'primary' }]
            });
            if (!answer || !answer.value) return;
            if (answer.text !== this.DEBUG_PASSWORD) {
                Log.warn('Wrong password.');
                return;
            }
            this.debugUnlocked = true;
        }
        this.showDebug();
    },

    showDebug() {
        DeckLibrary.load();
        const tag = deck => {
            if (deck.type === 'preset') {
                const set = setById(deck.set);
                return ` (AI preset · ${deckPrimaryType(deck.cards)}${set && set.id !== cardSets[0].id ? ' · ' + set.name : ''})`;
            }
            return deck.type === 'custom' ? ' ★ yours' : deck.type === 'test' ? ' 🧪 test' : '';
        };
        const fill = select => {
            select.innerHTML = '';
            DeckLibrary.all().forEach((deck, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = deck.name + tag(deck);
                select.appendChild(option);
            });
        };
        const playerSelect = document.getElementById('debug-player-deck');
        const aiSelect = document.getElementById('debug-ai-deck');
        if (!playerSelect || !aiSelect) return;

        fill(playerSelect);
        fill(aiSelect);
        playerSelect.selectedIndex = 0;
        aiSelect.selectedIndex = Math.min(1, DeckLibrary.all().length - 1);

        this.openModal('debug-modal');
    },

    startDebugGame() {
        const playerIndex = parseInt(document.getElementById('debug-player-deck').value, 10);
        const aiIndex = parseInt(document.getElementById('debug-ai-deck').value, 10);

        const check = validateDeck((DeckLibrary.get(playerIndex) || {}).cards || []);
        if (!check.valid) {
            Log.warn(`Your deck is not legal: ${check.error}`);
            return;
        }

        // QA games are deliberately not recorded: no stats, no win credit.
        gameState.player.selectedDeck = playerIndex;
        gameState.opponent.selectedDeck = aiIndex;

        this.closeModal('debug-modal');
        this.beginGame();
    }
};
