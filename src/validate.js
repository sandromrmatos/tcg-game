// ============================================================================
// CONTENT VALIDATOR
//
// The anti-bug net for adding a set. Runs at startup and turns the failure mode
// that cost the most time — a card referencing an effect that nobody
// implemented, which silently did nothing — into a loud, specific error.
//
// Errors are things that WILL misbehave in play. Warnings are things that are
// probably a data mistake but are legal.
// ============================================================================

const Validate = {
    errors: [],
    warnings: [],

    run(options = {}) {
        this.errors = [];
        this.warnings = [];

        this.checkSets();
        this.checkCardIdentity();
        this.checkEffectReferences();
        this.checkAbilityReferences();
        this.checkItemReferences();
        this.checkMoves();
        this.checkEvolutionLinks();
        this.checkNameConsistency();
        this.checkRegistries();
        this.checkPresetDecks();

        this.report(options);
        return { errors: this.errors, warnings: this.warnings };
    },

    error(message) { this.errors.push(message); },
    warn(message) { this.warnings.push(message); },

    // -----------------------------------------------------------------------

    checkSets() {
        const seen = new Set();
        for (const set of cardSets) {
            if (seen.has(set.id)) this.error(`Duplicate set id "${set.id}".`);
            seen.add(set.id);
            if (!set.prefix) this.error(`Set "${set.name}" has no prefix.`);
        }

        // A prefix that is a prefix of another would leak cards between sets.
        for (const a of cardSets) {
            for (const b of cardSets) {
                if (a === b) continue;
                if (b.prefix.startsWith(a.prefix)) {
                    this.error(
                        `Set prefix "${a.prefix}" is a prefix of "${b.prefix}" — ` +
                        `cards would be assigned to the wrong set.`
                    );
                }
            }
        }

        for (const card of cardDatabase) {
            if (!card.set) {
                this.error(`Card "${card.id}" matches no set prefix in data/sets.js.`);
            }
        }
    },

    checkCardIdentity() {
        const ids = new Set();
        for (const card of cardDatabase) {
            if (ids.has(card.id)) this.error(`Duplicate card id "${card.id}".`);
            ids.add(card.id);

            if (!card.name) this.error(`Card "${card.id}" has no name.`);
            if (!card.stage) this.error(`Card "${card.id}" has no stage.`);
            if (!card.type) this.error(`Card "${card.id}" has no type.`);

            if (isCreature(card)) {
                if (!(card.hp > 0)) this.error(`Creature "${card.name}" (${card.id}) has no HP.`);
                if (typeof card.retreat !== 'number') {
                    this.error(`Creature "${card.name}" (${card.id}) has no retreat cost.`);
                }
            }
        }
    },

    checkEffectReferences() {
        for (const card of cardDatabase) {
            for (const n of [1, 2]) {
                const effect = card[`move${n}Effect`];
                if (!effect) continue;
                if (!EffectRegistry.has(effect)) {
                    this.error(
                        `"${card.name}" (${card.id}) move ${n} uses effect "${effect}", ` +
                        `which is not registered in core/effects.js.`
                    );
                }
                if (!card[`move${n}Name`]) {
                    this.error(`"${card.name}" (${card.id}) has a move ${n} effect but no move ${n} name.`);
                }
            }
        }
    },

    checkAbilityReferences() {
        const validLocations = ['any', 'active', 'bench'];
        for (const card of cardDatabase) {
            const effect = card.abilityEffect;
            const name = card.abilityName;

            if (!effect && !name) continue;
            if (effect && !name) {
                this.error(`"${card.name}" (${card.id}) has abilityEffect but no abilityName.`);
            }
            if (name && !effect) {
                this.error(`"${card.name}" (${card.id}) has abilityName but no abilityEffect.`);
            }
            if (effect && !AbilityRegistry.has(effect)) {
                this.error(
                    `"${card.name}" (${card.id}) uses ability "${effect}", ` +
                    `which is not registered in core/abilities.js.`
                );
            }
            if (effect && !validLocations.includes(card.abilityLocation || 'any')) {
                this.error(
                    `"${card.name}" (${card.id}) has abilityLocation ` +
                    `"${card.abilityLocation}"; expected one of ${validLocations.join(', ')}.`
                );
            }
        }
    },

    checkItemReferences() {
        for (const card of cardDatabase) {
            if (!isItem(card)) {
                if (card.itemEffect) {
                    this.error(`"${card.name}" (${card.id}) is not an Item but has an itemEffect.`);
                }
                continue;
            }
            if (!card.itemEffect) {
                this.error(`Item "${card.name}" (${card.id}) has no itemEffect.`);
                continue;
            }
            if (!ItemRegistry.has(card.itemEffect)) {
                this.error(
                    `Item "${card.name}" (${card.id}) uses "${card.itemEffect}", ` +
                    `which is not registered in core/items.js.`
                );
            }
        }
    },

    checkMoves() {
        for (const card of cardDatabase) {
            if (!isCreature(card)) continue;

            const moves = movesOf(card);
            if (moves.length === 0) {
                this.error(`Creature "${card.name}" (${card.id}) has no usable move.`);
                continue;
            }
            for (const move of moves) {
                if (move.costCount === 0) {
                    this.warn(`"${card.name}" move "${move.name}" costs no energy.`);
                }
                if (!move.damage && !move.effect) {
                    this.warn(`"${card.name}" move "${move.name}" does nothing: no damage and no effect.`);
                }
            }
            // A move 2 without a move 1 would never be reachable in the UI order.
            if (card.move2Name && !card.move1Name) {
                this.error(`"${card.name}" (${card.id}) defines move 2 but not move 1.`);
            }
        }
    },

    checkEvolutionLinks() {
        for (const card of cardDatabase) {
            if (!card.prevStage) continue;

            if (card.prevStageIds.length === 0) {
                this.error(
                    `"${card.name}" (${card.id}) evolves from "${card.prevStage}", ` +
                    `but no card with that name exists.`
                );
                continue;
            }

            const sameSet = card.prevStageIds.filter(id => {
                const prev = getCardData(id);
                return prev && prev.set === card.set;
            });
            if (sameSet.length === 0) {
                this.warn(
                    `"${card.name}" (${card.id}) evolves from "${card.prevStage}", ` +
                    `which only exists in another set. Cross-set evolution is allowed ` +
                    `but is usually a naming mistake.`
                );
            }
            if (card.prevStageIds.length > 1) {
                this.warn(
                    `"${card.name}" (${card.id}) can evolve from ${card.prevStageIds.length} ` +
                    `different cards all named "${card.prevStage}": ${card.prevStageIds.join(', ')}.`
                );
            }
        }

        // A Stage 2 or 3 with nothing to evolve from is unplayable.
        for (const card of cardDatabase) {
            if (card.stage === 'Stage 2' || card.stage === 'Stage 3') {
                if (!card.prevStage) {
                    this.error(`"${card.name}" (${card.id}) is ${card.stage} but has no prevStage.`);
                }
            }
        }
    },

    /**
     * A move name should map to one effect across the whole card pool. When it
     * doesn't, one of the two cards is usually a copy-paste slip.
     */
    checkNameConsistency() {
        const moveEffects = new Map();   // move name -> Set of effect ids
        for (const card of cardDatabase) {
            for (const move of movesOf(card)) {
                if (!moveEffects.has(move.name)) moveEffects.set(move.name, new Map());
                moveEffects.get(move.name).set(move.effect || '(none)', card.name);
            }
        }
        for (const [moveName, variants] of moveEffects) {
            if (variants.size > 1) {
                const detail = Array.from(variants.entries())
                    .map(([effect, cardName]) => `${effect} on ${cardName}`)
                    .join(', ');
                this.warn(`Move "${moveName}" maps to more than one effect: ${detail}.`);
            }
        }

        const abilityEffects = new Map();
        for (const card of cardDatabase) {
            if (!card.abilityName) continue;
            if (!abilityEffects.has(card.abilityName)) {
                abilityEffects.set(card.abilityName, new Map());
            }
            abilityEffects.get(card.abilityName).set(card.abilityEffect, card.name);
        }
        for (const [abilityName, variants] of abilityEffects) {
            if (variants.size > 1) {
                const detail = Array.from(variants.entries())
                    .map(([effect, cardName]) => `${effect} on ${cardName}`)
                    .join(', ');
                // Intentional for the graded pairs (Healing Retreat, Energized
                // Healing), so this is only ever a hint.
                this.warn(`Ability "${abilityName}" maps to more than one effect: ${detail}.`);
            }
        }
    },

    /** Registered implementations that no card uses are dead weight. */
    checkRegistries() {
        const usedEffects = new Set();
        const usedAbilities = new Set();
        const usedItems = new Set();

        for (const card of cardDatabase) {
            if (card.move1Effect) usedEffects.add(card.move1Effect);
            if (card.move2Effect) usedEffects.add(card.move2Effect);
            if (card.abilityEffect) usedAbilities.add(card.abilityEffect);
            if (card.itemEffect) usedItems.add(card.itemEffect);
        }

        for (const id of EffectRegistry.ids()) {
            if (!usedEffects.has(id)) this.warn(`Effect "${id}" is registered but unused.`);
        }
        for (const id of AbilityRegistry.ids()) {
            if (!usedAbilities.has(id)) this.warn(`Ability "${id}" is registered but unused.`);
        }
        for (const id of ItemRegistry.ids()) {
            if (!usedItems.has(id)) this.warn(`Item "${id}" is registered but unused.`);
        }

        const modifierIds = new Set();
        for (const mod of DAMAGE_MODIFIERS) {
            if (modifierIds.has(mod.id)) {
                this.error(`Duplicate damage modifier id "${mod.id}".`);
            }
            modifierIds.add(mod.id);
        }
    },

    checkPresetDecks() {
        for (const deck of presetDeckLists) {
            for (const id of deck.cards) {
                if (!getCardData(id)) {
                    this.error(`Preset deck "${deck.name}" references unknown card "${id}".`);
                }
            }
            const result = validateDeck(deck.cards);
            if (!result.valid) {
                this.error(`Preset deck "${deck.name}" is not legal: ${result.error}`);
            }
            for (const warning of deckWarnings(deck.cards)) {
                this.warn(`Preset deck "${deck.name}": ${warning}`);
            }
        }
    },

    /**
     * Confirms every card id has a matching image file. Async, because it has
     * to actually request them; opt in with ?validate=images.
     */
    async checkImages() {
        const missing = [];
        await Promise.all(cardDatabase.map(card => new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => { missing.push(card.id); resolve(); };
            img.src = cardImage(card.id);
        })));

        if (missing.length > 0) {
            console.error(`[Validate] ${missing.length} missing card image(s):`, missing);
        } else {
            console.info(`[Validate] all ${cardDatabase.length} card images resolve.`);
        }
        return missing;
    },

    // -----------------------------------------------------------------------

    report(options = {}) {
        const { errors, warnings } = this;

        if (errors.length === 0 && warnings.length === 0) {
            console.info(
                `[Validate] content OK — ${cardDatabase.length} cards, ` +
                `${EffectRegistry.ids().length} effects, ` +
                `${AbilityRegistry.ids().length} abilities, ` +
                `${ItemRegistry.ids().length} items across ${cardSets.length} sets.`
            );
            return;
        }

        if (errors.length > 0) {
            console.error(`[Validate] ${errors.length} content error(s):`);
            for (const message of errors) console.error('  •', message);
        }
        if (warnings.length > 0) {
            console.warn(`[Validate] ${warnings.length} content warning(s):`);
            for (const message of warnings) console.warn('  •', message);
        }

        // Errors mean something will misbehave in play, so surface them in the
        // page rather than only in the console.
        if (errors.length > 0 && options.showBanner !== false) {
            this.showBanner(errors);
        }
    },

    showBanner(errors) {
        const banner = document.getElementById('validation-banner');
        if (!banner) return;

        banner.innerHTML = '';
        const heading = document.createElement('strong');
        heading.textContent = `${errors.length} card data error(s) — check the console.`;
        banner.appendChild(heading);

        const list = document.createElement('ul');
        for (const message of errors.slice(0, 8)) {
            const li = document.createElement('li');
            li.textContent = message;
            list.appendChild(li);
        }
        banner.appendChild(list);
        banner.classList.add('banner-show');
    }
};
