# Elemental Awakening TCG

A browser trading card game: two card sets, 170 cards, played against an AI.
No build step, no dependencies. Open `index.html`.

---

## Playing

Score **3 points** to win. You score a point whenever you knock out one of your
opponent's creatures, bench creatures included. If nobody reaches 3 by turn 30,
the higher score wins.

One **active** creature fights; up to **three bench** creatures wait behind it.

Each turn you may play one item, play Stage 1 creatures to empty bench slots,
evolve creatures (from turn 3), attach one energy, use abilities, and then either
retreat or attack. Attacking ends your turn, so abilities come first.

Full rules are in the game: **Rules** in the log panel.

---

## Layout

```
index.html              markup and script load order
style.css               all styling
test.html               content validator + game fuzzer
test-ui.html            UI state tests (button enablement per phase)
tools/import-csv.html   spreadsheet -> card literals

src/
  data/
    sets.js             THE set registry — one entry per card set
    cards.js            all 170 card definitions
    preset-decks.js     the 23 AI preset deck lists
    raid-bosses.js      raid bosses, full-art cards, the strong lines boss decks use
    decks.js            deck library, persistence, deck validation
  meta/
    profile.js          the save: collection, currencies, decks, stats
    missions.js         missions
    achievements.js     per-card achievements
    raids.js            raid tasks, rewards and boss deck generation
  core/
    util.js             randomness, side naming, type chart, card helpers
    cards-index.js      id lookups, evolution links resolved to ids
    timing.js           duration model + all "can I do this?" rule checks
    state.js            gameState, side/creature factories, shields
    status.js           status conditions — the single application gate
    heal.js             healing, non-attack damage, energy
    damage.js           the ordered damage modifier table
    combat.js           ONE attack pipeline, used by both sides
    effects.js          move effect registry (80 effects)
    abilities.js        ability registry (31 abilities)
    items.js            item registry (14 items)
    actions.js          draw, play, evolve, retreat, switch, setup
    knockout.js         knockouts, points, promotion, game end
    turn.js             turn lifecycle
  ai/
    ai.js               the AI policy — decisions only, no rules
  ui/
    log.js              battle log + toasts
    prompt.js           player choices + card zoom
    render.js           board, hand, HUD, controls
    interaction.js      input handlers
    screens.js          deck selection, modals, game over
    deckbuilder.js      deck builder
  validate.js           startup content validator
  main.js               bootstrap
```

### The one rule worth knowing

**The player and the AI share every implementation.** The AI decides *what* to
do and then calls the same functions the UI calls. There is one attack pipeline,
one ability registry, one item registry, one damage modifier table. A move
behaves identically no matter who plays it.

The seam that makes this work is `ctx.chooseMyCreature({ ..., aiPick })`: the
player gets an interactive board selection, the AI runs the heuristic. The effect
itself never asks who is playing.

---

## Documentation

| File | What it is |
|---|---|
| `ADDING_A_SET.md` | **Start here to add cards.** Step by step, with the failure modes that can no longer happen. |
| `BEHAVIOR_SPEC.md` | The behavioural contract: every effect, ability and item, the canonical damage order, the turn lifecycle, and a ledger of the bugs the rewrite fixed. |
| `TCG Game Specs.md` | Original long-form design spec. Historical. |
| `REFACTORING_GUIDE.md` | The plan this rewrite implemented. Historical. |
| `NEW_ABILITIES_GUIDE.md`, `*_FIX.md`, `*_SUMMARY.md`, `*_REPORT.md`, `*_CHECKLIST.md` | Notes from the pre-rewrite bug-fixing period. Historical; the bugs they describe are covered in the ledger in `BEHAVIOR_SPEC.md`. |

`script.js` in this folder is the **superseded** single-file implementation. It is
no longer loaded by anything and can be deleted.

---

## Testing

There are two test pages, and they cover different things. Run both.

### `test.html` — rules engine

**Validate content** — proves every card references an implemented effect,
ability and item; that every evolution link resolves to exactly one card; that
ids are unique and belong to exactly one set. This is the check that turns a
typo'd effect id from a move that silently does nothing into a named error.

**Run fuzzer** — builds random legal decks from the whole card pool and plays
complete games with both seats driven by the AI, then reports crashes, games that
failed to reach a result, and which effects were never exercised.

```
4000 games, 0 crashes, 0 unfinished
0 validation errors, 3 benign warnings
80/80 effects, 31/31 abilities, 14/14 items exercised
average 14.8 turns, range 1–30
```

### `test-ui.html` — control states

The fuzzer drives the engine directly and never touches the control bar, so it
cannot catch a button that is wrongly enabled or disabled. This page asserts what
the real renderer produces in each phase: setup, player turn, opponent turn,
after attacking, under a restriction, and at game over. 31 assertions, all
passing.

It exists because a permanently disabled Ready button shipped once: the setup
phase has `currentTurn === null`, and the button's state was derived from a
"is it the player's turn" test that setup can never satisfy.

### Headless

```
chrome --headless=new --dump-dom --virtual-time-budget=300000 \
       "file:///path/to/TCG Game/test.html?auto=4000"

chrome --headless=new --dump-dom --virtual-time-budget=40000 \
       "file:///path/to/TCG Game/test-ui.html"
```

Also useful:
- `index.html?validate=images` confirms every card id has an image.
- `index.html?deck=0` skips the deck screen; `?deck=0&aiDeck=3` fixes both decks.

---

## Card sets

| Set | Cards | Image files |
|---|---|---|
| Elemental Awakening | 84 (79 creatures, 5 items) | `Elemental Awakening_01.png` … `_84.png` |
| Galactic Adventures | 86 (77 creatures, 9 items) | `Galactic Adventures_01.png` … `_86.png` |

Both use two-digit numbering. Cards from different sets mix freely in a deck.

The AI picks its deck from `preset-decks.js`: 9 Elemental Awakening decks (two
per type plus a Neutral-only deck) and 14 Galactic Adventures decks (three per
type plus two Neutral-only). A preset's `set` field is the set the player must
have unlocked before the AI can pick it. Promo cards never appear in AI decks.

## Turn rules worth knowing

- Energy is typed. In a cost, M/W/C/K need Mystic/Wind/Celestial/Mechanic and
  N accepts any type (`parseEnergyCost`, `energyNeeded` in `util.js`). A
  creature's energy lives in `card.energyUnits`; `card.energy` is the total.
- Each deck has `energyTypes`; a turn's energy is rolled from them at the
  start of the turn (`turnEnergyType`), so the player sees it before attaching.
- Flux only flips when energy is attached to the Flux creature itself.

- The player who goes first skips their turn-1 draw and cannot attack on
  turn 1 (`isStarterFirstTurn` in `state.js`).
- One voluntary retreat per turn (`retreatedThisTurn`); forced switches from
  moves and abilities are not limited.

---

## Deck building

Exactly 20 cards, at most 2 copies of any card, at least one Stage 1, one primary
type plus any number of Neutral and Item cards. Custom decks are saved to
`localStorage` per username.

The builder generates its set tabs from the set registry, so a new set appears
without any code change, and flags evolutions whose pre-evolution is missing.

A deck's full-art copies are stored as `fullArt: { cardId: count }` next to
`cards`. When both versions of a card are available, the builder asks which one
to add.

---

## Raid Bosses and full art

Full-art images live in `Full art/`, named like the normal card image. Each one
has a boss in `RAID_BOSSES` (`src/data/raid-bosses.js`); adding a boss is one
line there plus the image.

- A boss opens once the player owns 2 normal copies of its card.
- Tasks, counted only in games against that boss: win 5 in a row (a loss or
  leaving resets it, a draw doesn't), and one win with a deck of at least 14
  creature cards of each type.
- First clear: 1 full-art copy, no credits. Later clears: 1 credit per boss per
  week (Monday to Sunday), held on the raid page if credits are full.
- The boss deck is generated every game (`Raids.generateDeck`): 2 full-art boss
  cards, 2 of each card in its line, lines from `RAID_STRONG_CARDS` weighted by
  their simulated win rate, 2 Card Draw, items for its type, only unlocked sets,
  one energy type, and the same composition rules as the AI presets.
- In a game, `fullArtLeft` on each side counts the full-art copies still in the
  deck; `instanceFromDeck` / `returnToDeck` keep it right, and `card.fullArt`
  picks the image through `cardArt()`.

---

## Known limitations

- Single player only.
- The AI is a solid heuristic player, not a planner: it does not look ahead.
- No sound.
- Card art is not bundled with any licence file; it lives in `cards/`.
