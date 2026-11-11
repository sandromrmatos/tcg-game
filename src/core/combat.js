// ============================================================================
// COMBAT
//
// ONE attack pipeline, used by the player and the AI. Every message is written
// once using subject()/possessive() so it reads correctly for either side.
//
// The original had two ~700-line implementations of this that had to be kept in
// sync by hand; they hadn't been, which produced most of the reported bugs.
// ============================================================================

/** Builds the choice/target candidate list for one side's board. */
function boardCandidates(side, filter) {
    const s = gameState[side];
    const out = [];
    if (s.active) {
        out.push({ side, location: 'active', index: null, card: s.active });
    }
    s.bench.forEach((card, index) => {
        if (card) out.push({ side, location: 'bench', index, card });
    });
    return filter ? out.filter(filter) : out;
}

/**
 * Asks a side to choose one of its creatures.
 *
 * This is the seam that lets one implementation serve both sides: the player
 * gets an interactive board selection, the AI runs `aiPick`.
 */
async function chooseCreatureOf(side, opts = {}) {
    const candidates = boardCandidates(side, opts.filter);
    if (candidates.length === 0) return null;

    // A forced choice needs no interaction.
    if (candidates.length === 1 && !opts.cancellable) return candidates[0];

    // Who decides: the board's owner, unless the caller says otherwise.
    const chooser = opts.chooser || side;
    if (chooser === 'player' && !Automation.active) {
        return await Prompt.chooseCreature({
            candidates,
            title: opts.title || 'Choose a creature',
            cancellable: opts.cancellable
        });
    }
    return opts.aiPick ? opts.aiPick(candidates) : Rng.pick(candidates);
}

/**
 * Asks a side to pick one of a few options (Elemental Shift's new type).
 * Returns the option's value, or null when the player cancels.
 */
async function chooseOptionOf(side, opts = {}) {
    const options = opts.options || [];
    if (options.length === 0) return null;
    if (side === 'player' && !Automation.active) {
        const list = options.slice();
        if (opts.cancellable) list.push({ label: 'Cancel', value: null, kind: 'ghost' });
        return await Prompt.chooseOption({ title: opts.title, subtitle: opts.subtitle, options: list });
    }
    const picked = opts.aiPick ? opts.aiPick(options) : null;
    return picked !== null && picked !== undefined ? picked : (opts.cancellable ? null : options[0].value);
}

/** Asks a side to choose from an arbitrary list of cards. */
async function chooseCardOf(side, opts = {}) {
    const cards = opts.cards || [];
    if (cards.length === 0) return null;
    if (cards.length === 1 && !opts.cancellable) return 0;

    if (side === 'player' && !Automation.active) {
        return await Prompt.chooseCards({
            cards,
            title: opts.title || 'Choose a card',
            subtitle: opts.subtitle,
            cancellable: opts.cancellable,
            cancelLabel: opts.cancelLabel
        });
    }
    const picked = opts.aiPick ? opts.aiPick(cards) : Rng.int(cards.length);
    return typeof picked === 'number' ? picked : 0;
}

/**
 * The context handed to every effect, ability and item implementation.
 * Nothing in a handler needs to know whether it is running for the player.
 */
function makeContext(side, extra = {}) {
    const foe = foeOf(side);
    const ctx = {
        side,
        foe,
        me: gameState[side],
        them: gameState[foe],

        // --- logging -------------------------------------------------------
        say: (text, opts) => Log.say(text, opts),
        note: (text, opts) => Log.write(text, opts),

        // --- randomness, all logged ---------------------------------------
        async flip(label) {
            const result = Rng.flip();
            await Log.coin(result, label);
            return result;
        },
        async flipMany(count, label) {
            const outcome = flipMany(count);
            await Log.coins(outcome.results, `${label} (${count} coins)`);
            return outcome;
        },
        async flipUntilTails(label) {
            const outcome = flipUntilTails();
            await Log.coins(outcome.results, `${label} (until tails)`);
            return outcome;
        },
        async roll(label) {
            const value = Rng.roll();
            await Log.dice(value, label);
            return value;
        },

        // --- board mutation, all funnelled through one implementation -----
        heal: (card, amount, opts = {}) =>
            healCreature(card, amount, Object.assign({ side: locateSideOf(card, side) }, opts)),
        // Damage to the other side's creatures records where it came from, so
        // always-on abilities on both sides apply to it (adjustCrossDamage).
        hit: (card, amount, opts = {}) => {
            const targetSide = opts.side || locateSideOf(card, foe);
            if (targetSide === side || opts.source) return damageCreature(card, amount, opts);
            const source = { card: extra.attacker || extra.card || null, side, kind: extra.move ? 'move' : 'ability' };
            return damageCreature(card, amount, Object.assign({}, opts, { source }));
        },
        // `type` is optional: without it the energy is one of the owner's deck types.
        energy: (card, count = 1, ownerSide, type) =>
            attachEnergyTo(card, count, { side: ownerSide || locateSideOf(card, side), type }),
        unenergy: (card, count = 1, ownerSide, removedTypes, random = false) =>
            discardEnergyFrom(card, count, { side: ownerSide || locateSideOf(card, side), removedTypes, random }),

        // --- status, always gated by Status.apply -------------------------
        status: (card, statusName) => Status.apply(card, statusName, {
            targetSide: locateSideOf(card, foe),
            attackerSide: side
        }),

        // --- choices --------------------------------------------------------
        chooseMyCreature: opts => chooseCreatureOf(side, opts),
        // This side picks one of the OTHER side's creatures (Gnawing Precision):
        // the player chooses when the player acts, the AI when the AI acts.
        chooseTheirCreature: opts => chooseCreatureOf(foe, Object.assign({}, opts, { chooser: side })),
        chooseCreatureOf: (whichSide, opts) => chooseCreatureOf(whichSide, opts),
        chooseCard: opts => chooseCardOf(side, opts),
        chooseCardOf: (whichSide, opts) => chooseCardOf(whichSide, opts)
    };
    return Object.assign(ctx, extra);
}

/** Best-effort owner lookup, falling back to a supplied default. */
function locateSideOf(card, fallback) {
    const spot = locateCard(card);
    return spot ? spot.side : fallback;
}

// ---------------------------------------------------------------------------
// Legality
// ---------------------------------------------------------------------------

/**
 * Everything that must be true before an attack is allowed. Used by the player
 * UI (to enable buttons and explain refusals) and by the AI (to pick a move),
 * so the two can never disagree.
 */
function canAttackWith(side, moveNumber) {
    const s = gameState[side];
    const attacker = s.active;
    const defender = gameState[foeOf(side)].active;

    if (gameState.phase !== 'playing') return { ok: false, reason: 'Not in play.' };
    if (gameState.currentTurn !== side) return { ok: false, reason: 'Not your turn.' };
    if (s.hasAttacked) return { ok: false, reason: 'You have already attacked this turn.' };
    if (isStarterFirstTurn(side)) {
        return { ok: false, reason: 'The player who goes first cannot attack on turn 1.' };
    }
    if (!attacker) return { ok: false, reason: 'No active creature.' };
    if (!defender) return { ok: false, reason: 'No target.' };

    const attackCheck = creatureCanAttack(attacker, side);
    if (!attackCheck.ok) return attackCheck;

    const move = moveOf(attacker.data, moveNumber);
    if (!move) return { ok: false, reason: 'That move does not exist.' };

    return moveIsUsable(attacker, move, side);
}

/** Moves this creature could legally use right now. */
function usableMoves(side) {
    const attacker = gameState[side].active;
    if (!attacker) return [];
    return movesOf(attacker.data).filter(m => canAttackWith(side, m.number).ok);
}

// ---------------------------------------------------------------------------
// The pipeline
// ---------------------------------------------------------------------------

/**
 * Resolves a complete attack. See BEHAVIOR_SPEC.md section 2 for the phase
 * order this implements.
 *
 * @param {'player'|'opponent'} side
 * @param {number} moveNumber
 */
async function resolveAttack(side, moveNumber) {
    const foe = foeOf(side);
    const me = gameState[side];
    const them = gameState[foe];
    const attacker = me.active;
    const defender = them.active;

    // ---- Phase A: gating ------------------------------------------------
    const legality = canAttackWith(side, moveNumber);
    if (!legality.ok) {
        Log.warn(legality.reason);
        return;
    }

    const move = moveOf(attacker.data, moveNumber);
    me.hasAttacked = true;
    trackAttack(side, attacker.id);

    if (side === 'opponent') {
        await Log.centerBanner(`⚔️ ${move.name}`, `${creatureName(attacker, side)} attacks`,
            { kind: 'attack', ms: 1400 });
    }
    await Log.say(
        `${subject(side)} ${verb(side, 'uses', 'use')} ${move.name}.`,
        { kind: 'attack', icon: '⚔️', side }
    );

    // ---- Phase B: pre-roll ---------------------------------------------
    // Rolled after all gating so an aborted attack can't leave a stale flip
    // behind, which was a real defect in the original ordering.
    if (Status.has(attacker, 'hallucination')) {
        const flip = Rng.flip();
        attacker.flags.hallucinationFlip = flip;
        await Log.coin(flip, `${creatureName(attacker, side)} is hallucinating`);
        await Log.say(
            flip === 'heads'
                ? 'The vision sharpens its aim: +10 damage.'
                : 'The vision turns on it: 40 self-damage after the attack.',
            { kind: 'status', icon: '😵', pace: 0.6 }
        );
    }

    const ctx = makeContext(side, {
        attacker,
        defender,
        move,
        damage: move.damage || 0,
        attackerType: getCardType(attacker.data),
        defenderType: getCardType(defender.data)
    });

    // ---- Phase C: damage calculation -----------------------------------
    ctx.damage = await EffectRegistry.damageCalc(ctx);

    // ---- Phase D: modifiers --------------------------------------------
    ctx.damage = await applyDamageModifiers(ctx, ctx.damage);

    // ---- Phase E: application ------------------------------------------
    const redirected = await applyGuardianRedirect(ctx);
    if (!redirected) {
        if (ctx.damage > 0) {
            defender.damage += ctx.damage;
            Render.board();
            await Log.say(
                `${creatureName(defender, foe)} takes ${ctx.damage} damage ` +
                `(${Math.max(0, remainingHp(defender))}/${maxHp(defender)} HP left).`,
                { kind: 'damage', icon: '💥' }
            );
        } else {
            await Log.say(`No damage dealt.`, { kind: 'info', pace: 0.6 });
        }

        await applyRetaliationStone(ctx);
    }

    await applyRainbowStrike(ctx);
    await applyHallucinationBacklash(ctx);

    // ---- Phase F: effects, then knockouts ------------------------------
    await applyPhaseShift(ctx);

    await EffectRegistry.resolve(ctx);
    await EffectRegistry.resolveIfTargetAlive(ctx);

    // Remembered after the effects, so Reverie Talon reads the attack before this one.
    me.lastAttack = { name: move.name, turn: gameState.turnNumber };

    await resolveKnockouts();
    await endTurn();
}

/**
 * Guardian: a benched Aegiscelis soaks the hit meant for the active creature.
 * Returns true if the damage was redirected.
 */
async function applyGuardianRedirect(ctx) {
    const guard = ctx.them.flags.guardianCard;
    if (!guard || !Timing.active(ctx.them.flags.guardianUntil)) return false;
    if (!(ctx.damage > 0)) return false;
    // It is the creature that used Guardian that protects, and only while it
    // is still on the bench: after a swap or a knockout the protection ends.
    if (!ctx.them.bench.includes(guard) || isFainted(guard)) {
        ctx.them.flags.guardianCard = null;
        ctx.them.flags.guardianUntil = null;
        return false;
    }
    ctx.them.flags.guardianCard = null;
    ctx.them.flags.guardianUntil = null;

    await Log.say(
        `${creatureName(guard, ctx.foe)} steps in and takes the hit!`,
        { kind: 'ability', icon: '🛡️' }
    );
    // Guardian intercepts the attack, so it bypasses the bench Camouflage check.
    guard.damage += ctx.damage;
    Render.board();
    await Log.say(
        `${creatureName(guard, ctx.foe)} takes ${ctx.damage} damage.`,
        { kind: 'damage', icon: '💥' }
    );
    return true;
}

/** Retaliation Stone: the defender strikes back for 20 if it was damaged. */
async function applyRetaliationStone(ctx) {
    // Always on: every attack that damages it is answered.
    if (!cardAbilityOn(ctx.defender, 'retaliationStone') || !(ctx.damage > 0)) return;
    AbilityRegistry.noteTriggered('retaliationStone');
    await Log.say(
        `${creatureName(ctx.defender, ctx.foe)}'s Retaliation Stone strikes back!`,
        { kind: 'ability', icon: '💎' }
    );
    await damageCreature(ctx.attacker, 20, {
        side: ctx.side,
        location: 'active',
        reason: 'Retaliation Stone',
        source: { card: ctx.defender, side: ctx.foe, kind: 'ability' }
    });
}

/** Rainbow Strike (always on): every attack also clips a random enemy bench creature. */
async function applyRainbowStrike(ctx) {
    if (!cardAbilityOn(ctx.attacker, 'rainbowStrike')) return;

    const bench = benchCreatures(ctx.foe);
    if (bench.length === 0) return;

    AbilityRegistry.noteTriggered('rainbowStrike');
    const target = Rng.pick(bench);
    await Log.say(`Rainbow Strike arcs to the bench!`, { kind: 'ability', icon: '🌈' });
    await damageCreature(target, 30, {
        side: ctx.foe,
        location: 'bench',
        source: { card: ctx.attacker, side: ctx.side, kind: 'move' }
    });
}

/** Hallucination tails: the attacker hurts itself. */
async function applyHallucinationBacklash(ctx) {
    const flip = ctx.attacker.flags.hallucinationFlip;
    ctx.attacker.flags.hallucinationFlip = null;
    if (flip !== 'tails') return;

    await damageCreature(ctx.attacker, 40, {
        side: ctx.side,
        location: 'active',
        reason: 'hallucination'
    });
}

/** Phase Shift: the attacker must retreat to the bench after attacking. */
async function applyPhaseShift(ctx) {
    if (!ctx.me.flags.phaseShift) return;
    ctx.me.flags.phaseShift = false;

    if (benchCreatures(ctx.side).length === 0) {
        await Log.say('Phase Shift needs a bench creature, but there is none.',
            { kind: 'info', pace: 0.6 });
        return;
    }
    await Log.say(`Phase Shift: ${subject(ctx.side).toLowerCase()} must switch out.`,
        { kind: 'ability', icon: '🌀' });

    const choice = await chooseCreatureOf(ctx.side, {
        title: 'Phase Shift: choose a creature to switch in',
        filter: c => c.location === 'bench',
        aiPick: candidates => healthiestAttacker(candidates)
    });
    if (choice) await swapActiveWithBench(ctx.side, choice.index, { free: true });
}
