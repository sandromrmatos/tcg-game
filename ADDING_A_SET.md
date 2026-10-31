# Adding a card set

The whole point of the refactor: adding a set should be data entry plus one
registry entry per genuinely new mechanic, with the validator catching anything
you miss before you play a single game.

There is **no** file where you have to remember to also update the AI, and no
place where a set's cards get special-cased.

---

## 1. Convert the spreadsheet

Open `tools/import-csv.html`, paste the CSV, set the set name and a short id.

It produces the card literals and, separately, a list of every move, ability and
item whose rules text implies behaviour. Those are the only things needing code.
Effect ids are never guessed from prose.

Paste the literals at the end of the array in `src/data/cards.js`.

Do not add a `set` field. It is derived from the id prefix, so a card can never
disagree with the registry.

---

## 2. Register the set

`src/data/sets.js`:

```js
{
    id: 'CC',
    name: 'Cosmic Collision',
    prefix: 'Cosmic Collision_',
    accent: '#8b6cf0'
}
```

`prefix` must match the start of every card id in the set exactly. The validator
rejects a prefix that is a prefix of another set's, since that would leak cards
between sets.

The deck builder tab, the card browser, image paths and the rules panel all read
this list, so they pick the set up with no further changes.

---

## 3. Add the images

Drop the PNGs into `cards/`, named exactly as each card's `id`.

Verify with `test.html` → **Check card images**, or `index.html?validate=images`.

---

## 4. Implement the new mechanics

### A move effect

`src/core/effects.js`. Declare it once, with the phases it takes part in:

```js
EffectRegistry.register('cometCrash', {
    // Runs while damage is being computed. Return the new damage.
    async onDamageCalc(ctx) {
        const flip = await ctx.flip(ctx.move.name);
        return flip === 'heads' ? ctx.damage + 30 : ctx.damage;
    },

    // Runs after damage, ALWAYS — including when the attack scored a knockout.
    // Attacker-side consequences go here: recoil, self-heal, cooldowns, draws.
    async onResolve(ctx) {
        await ctx.hit(ctx.attacker, 10, { side: ctx.side, location: 'active' });
    },

    // Runs only if the defender survived. For things that are meaningless once
    // it has fainted: retreat locks, forced switches, forced knockouts.
    async onResolveIfTargetAlive(ctx) {
        ctx.defender.flags.cantRetreatUntil = Timing.opponentTurns(1);
    }
});
```

Then set `move1Effect: "cometCrash"` on the card.

Common shapes already exist as one-liners — see `bonusDamageOnHeads`,
`nothingOnTails`, `damagePerHeads`, `damagePerDieRoll`, `damagePerCount`,
`selfHeal`, `selfRecoil`, `statusOnDefender`, `statusOnDefenderIfHeads`,
`creatureShield`.

**Status conditions:** call `ctx.status(ctx.defender, 'flux')`. It already
refuses to land on a fainted creature and already respects Clarity Aura,
Hydration and Aqua Mirror, so never write to `card.status` directly.

**Healing and damage:** always `ctx.heal(...)` and `ctx.hit(...)`, never
`card.damage -= n`. That is what keeps Absorb Energy and Camouflage working.

**Choices:** `ctx.chooseMyCreature({ title, filter, aiPick })`. The player gets
an interactive selection, the AI runs `aiPick`. One implementation, both seats.

If the printed damage is a poor guide to a move's real value (a coin-flip move
that prints 0, or prints 100 but whiffs half the time), add an entry to
`EXPECTED_DAMAGE` at the bottom of `effects.js` so the AI values it correctly.

### An ability

`src/core/abilities.js`:

```js
AbilityRegistry.register('starlightWard', {
    // Optional extra legality, beyond the shared once-per-turn / location checks.
    requires(ctx) {
        if (benchCreatures(ctx.side).length === 0) {
            return { ok: false, reason: 'Starlight Ward needs a bench creature.' };
        }
        return { ok: true };
    },
    async use(ctx) {
        grantSideShield(ctx.side, 'starlightWard', 20);
        await ctx.say(`${possessive(ctx.side)} creatures take 20 less damage next turn.`,
            { kind: 'ability', icon: '🛡️' });
    },
    // Whether the AI should use it right now. Defaults to always.
    aiWants: ctx => sideWillAttackThisTurn(ctx.side)
});
```

Set `abilityName`, `abilityEffect` and `abilityLocation` on the card.
`abilityLocation` is data, so where an ability may be used needs no code.

A new shield also needs one row in `DAMAGE_MODIFIERS` (`src/core/damage.js`),
positioned where it should apply. That array **is** the resolution order.

### An item

`src/core/items.js`:

```js
ItemRegistry.register('starChart', {
    requires(ctx) {
        if (ctx.me.deck.length === 0) return { ok: false, reason: 'Your deck is empty.' };
        return { ok: true };
    },
    async use(ctx) {
        drawCards(ctx.side, 2);
        await ctx.say(`${subject(ctx.side)} ${verb(ctx.side, 'draws', 'draw')} 2 cards.`,
            { kind: 'item', icon: '🎴' });
    },
    aiWants: ctx => ctx.me.hand.length <= 4
});
```

Set `itemEffect: "starChart"` on the card. Items are keyed by effect id, not by
display name, so a reprint in a later set reuses the implementation for free.

Returning `false` from `use` aborts without spending the card — use that when the
player cancels out of a choice.

### A status condition

`src/core/status.js`, one entry in `STATUS_CONDITIONS`, plus a check wherever it
triggers. The three existing ones trigger on attacking, on attaching energy and
on using an item.

---

## 5. Validate and fuzz

Open `test.html`.

**Validate content** must report zero errors. It checks that every
`moveNEffect`, `abilityEffect` and `itemEffect` on every card resolves to a
registered implementation, that every `prevStage` resolves to exactly one card,
that ids are unique and map to exactly one set, that Stage 2 and 3 cards have a
pre-evolution, and that no move does nothing.

Warnings are worth reading but not blocking. A move name mapping to two
different effects usually means a copy-paste slip; graded ability pairs like
Healing Retreat legitimately trip it.

**Run fuzzer** with a few thousand games. It builds random legal decks from the
whole pool, so new cards get played immediately, and drives both seats with the
AI policy. Look for:

- `crashes = 0`
- `unfinished = 0`
- coverage listing nothing under "never resolved" — anything listed was never
  reached, so it is untested

The current baseline, for comparison: 4000 games, 0 crashes, 0 unfinished,
all 80 effects / 31 abilities / 14 items exercised, average 14.8 turns.

Then open `test-ui.html`. It asserts control-bar state per phase and should
report 31/31. The fuzzer never touches the buttons, so this is the only thing
that catches a control that is wrongly enabled or disabled. If a new set adds a
restriction that should grey out a button, add an assertion here for it.

---

## 6. Optional: preset decks

`src/data/preset-decks.js`. The AI picks its deck from the presets, so until a
set has a preset deck the AI will not play its cards in a normal game. The
fuzzer covers them either way, via random decks.

---

## Things that used to bite, and no longer can

| Old failure | Why it can't recur |
|---|---|
| A typo'd effect id silently did nothing | The validator names it at startup |
| An effect implemented for the player but not the AI | One implementation, one pipeline |
| An effect dropped when the attack scored a knockout | `onResolve` always runs |
| A status ignoring Clarity Aura | One gated `Status.apply` |
| Healing not triggering Absorb Energy | All healing goes through `healCreature` |
| A "next turn" restriction never expiring, or never applying | Absolute deadlines via `Timing`, nothing to decrement |
| A new set needing the set switcher rewritten | Set navigation is a cursor over the registry |
| A reused creature name cross-wiring evolution | Evolution matches ids, resolved within the set |
| A new shield the AI's attacks ignored | One ordered `DAMAGE_MODIFIERS` table |
