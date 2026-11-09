# Galactic Adventures — Implementation Summary

Galactic Adventures (GA) is the game's second set: 86 cards (77 creatures in 40
families, 9 items) and two status conditions, Flux and Lock. This document says
where each part lives in the code and how the card text was read. The full rule
set for both sets, with the damage order, is in `BEHAVIOR_SPEC.md`.

The card text authority is `Galactic Adventures.csv` in the repo root. The copy
in `cards/` is older and not used.

---

## 1. Where it lives

| Part | File |
|---|---|
| Card data (stats, costs, effect and ability ids) | `src/data/cards.js` |
| Card text shown in the game | `src/data/card-text.js` (copied from the root CSV) |
| Set definition, card numbers, promos | `src/data/sets.js`, `src/core/cards-index.js` |
| Move effects | `src/core/effects.js` (`EffectRegistry`) |
| Abilities | `src/core/abilities.js` (`AbilityRegistry`) |
| Damage modifiers, damage outside the attack | `src/core/damage.js` |
| Items | `src/core/items.js` (`ItemRegistry`) |
| Flux, Lock, Hallucination | `src/core/status.js`, Flux check in `src/core/actions.js`, Lock check in `items.js` |
| Durations | `src/core/timing.js` |

Every move, ability and item is registered once and used by both the player and
the AI. `validate.js` fails at startup if a card names an unregistered effect.

---

## 2. Status conditions

| Status | Effect | Cards that cause it |
|---|---|---|
| Flux ⚡ | When energy is attached to the Flux creature, flip 2 coins: both tails, the energy is lost and the turn's attachment is used. Attaching to the bench is not affected | Olympis, Oraclyon (Ancient Wisdom), Mystaeon, Mummira (Mummy's Curse), Ectomango; Mangost and Frostant on heads; Pangodice on 3–4 |
| Lock 🔒 | When the side uses an item, flip 1: tails, the item stays in hand, but the turn's item is used | Crocaterra, Astrollus (Starlight Kick); Frostant on tails; Beanknight's Caffeine Addiction on tails; Pangodice on 5–6 |

Like Hallucination, both live only on the active creature and are cleared when
it leaves the active slot or by Remedy. Hydration (Fluffbill) blocks them; Aqua
Mirror (Ectomango) also gives them to the attacker.

---

## 3. Moves with effects

Plain-damage moves are left out.

| # | Card | Move | Effect |
|---|---|---|---|
| 02 | Teklash | Triple Threat Flip | Flip 2: both heads, the defender is knocked out |
| 03 | Psybella | Mind Pulse | Flip 1: heads, Hallucination |
| 04 | Fuschioria | Dream Booster / Shadow Wrap | Flip 1: heads, Hallucination / +30 if the defender has a status |
| 05 | Zenethra | Invincible Gambit | Always 0 damage. Flip 3: for each heads, the opponent deals no damage on one of their turns (their next 1–3 turns; yours don't count). Their moves still have their other effects. Zenethra then faints |
| 11 | Starraffe | Galactic Meteor / Starfall Strike | 10 per energy on the defender / Flip 1: heads, the opponent's next energy is Celestial |
| 19 | Astralin | Tidal Illusion | Flip 1: heads, the opponent deals no damage on their next turn |
| 20 | Aetherin | Mind Ripple | Aetherin takes 20 less during the opponent's next turn |
| 21, 41, 42, 43, 65 | Mystaeon, Olympis, Oraclyon, Mummira, Ectomango | Flux Wave and similar | Flux |
| 22 | Hoatzion | Verdant Struggle / Fury Spin | Flip 2: both heads 50, else 0 / +50 at 30 HP or less |
| 24 | Photosynthra | Enraged Charge | +30 per energy above 3 |
| 28 | Gearstrike | Scavenge Strike | Flip 1: heads, return an item from your discard pile to hand |
| 29 | Steelspirit | Gear Grind / Chill Recharge | Flip 1: heads +20 / heal 10, its next attack +20 |
| 32 | Stilflare | Overdrive Smash | Can't be used on its owner's next turn (2 turns counting the opponent's) |
| 33 | Electrogriff | Harsh Flinch / Tempest Hold | +20 per heads until tails / it can't retreat for 2 of its turns |
| 36, 56 | Crocaterra, Astrollus | Forest Fury, Starlight Kick | Lock |
| 39 | Pangodice | Chaos Dice | d6: 1–2 Hallucination, 3–4 Flux, 5–6 Lock |
| 40 | Psychea | Foresight Beam | Flip 1: heads +10 |
| 42 | Oraclyon | Foresight Blast | Hallucination, always |
| 43 | Mummira | Spectral Wrap | +10 per energy on the defender |
| 49 | Cockarion | Feather Barrage / Blow Blitz | Flip 1: heads +20 / 40 recoil |
| 50 | Beanling | Sprout Boost | Its next attack +30, kept if it evolves first |
| 51 | Beanleaf | Coffee Heal | Heal a damaged bench creature 10 |
| 52 | Beanknight | Bean Blast / Caffeine Addiction | Heal a damaged bench creature 20 / Flip 1: heads heal itself 20, tails Lock |
| 53 | Tielzor | Sky Draw / Hurricane Wing | Draw 1 / Flip 1: tails 0 |
| 59, 60 | Platypog, Fluffbill | Tail Dance, Bill Bash | Flip 1: tails 0 |
| 64 | Mangost | Spectral Slice | Flip 1: heads, Flux |
| 75 | Goggly | Gulp Swap | Swap remaining HP with the defender, each capped at its max |
| 76, 77 | Cloudlet, Cloudboss | Cotton Guard | This creature takes 20 less during the opponent's next turn |
| 77 | Cloudboss | Cloud Bounce | Optionally move 1 energy from one of your bench creatures to another (bench only) |
| 80 | Melanchote | Alphabet Assault | 10 per letter of the defender's name |
| 81 | Metalmagma | Inferno Constrict | 30 per Mechanic creature on your bench |
| 82, 83 | Laugherry, Gigglewood | Berry Burst, Laughing Leaves | Heal each of your damaged creatures 10 / 20 |
| 85 | Pantheraura | Mind Mirage | Hallucination, always |
| 86 | Frostant | Psychic Prowl | Flip 1: heads Flux, tails Lock |

A move that deals 0 damage stays at 0: no type bonus, Booster, Warrior Mode or
any other bonus is added, and single-use bonuses aren't spent.

---

## 4. Abilities

An ability is **always on** unless its card text is a choice. Always-on abilities
have no button: they work while the creature is in play where the card says.
Choice abilities have a button in the creature panel, can be used once per turn
before attacking, and anything they set up lasts until your next turn.

| # | Card | Ability | Kind | Where | Behavior |
|---|---|---|---|---|---|
| 08 | Antaray | Extra Charge | choice | any | Attach 1 extra energy to a Neutral creature of yours |
| 09 | Meerkool | Guardian Mode | always | any | All damage your creatures take from the opponent −10 |
| 10 | Meerkool | Warrior Mode | always | any | All damage your side deals to the opponent +10 |
| 12, 13 | Trunket, Elefeir | Healing Retreat | always | active | Heals 20 / 40 whenever it moves from active to the bench, if damaged |
| 14 | Planterdon | Mirage Shield | always | active | The opponent can't use items |
| 16, 18 | Breezebuzz, Zephyrbuzz | Thunder Rush | always | active | Its attack damage ×2 if the opponent evolved on their last turn |
| 23, 24 | Lumifloris, Photosynthra | Absorb Energy | always | any | Whenever it is healed, it also gets 1 energy |
| 25, 26 | Nebuleap, Comiscroaker | Energized Healing | always | any | Whenever energy is attached to it, it heals 10 / 20 |
| 29 | Steelspirit | Metalic Protection | always | any | Mechanic attacks deal it 0 damage; it loses 20 HP at the end of each of its owner's turns |
| 46 | Mousucklord | Gnawing Precision | choice | any | Deal 20 to an opposing creature. Whoever uses it picks the target, so the AI picks when the AI uses it |
| 55 | Pigmoat | Caprine Guard | always | any | Takes 40 less from moves by Celestial and Mystic creatures |
| 58 | Astraea | Elemental Fortitude | always | any | Takes 20 less from Wind and Mechanic creatures |
| 60 | Fluffbill | Hydration | always | active | Can't get status conditions |
| 63 | Notreclast | Retaliation Stone | always | any | Whenever an attack damages it, it deals 20 back to the attacker |
| 65 | Ectomango | Aqua Mirror | always | active | Any status condition it gets from the opponent is also given to the attacker |

Galactic abilities that interact with the Elemental Awakening ones work the same
way: Energy Siphon (Lumbertail) fires on every item the opponent plays, including
GA items, and Guardian (Aegiscelis, a choice) protects your active creature from
the next attack during the opponent's turn, remembering the Aegiscelis itself
rather than its bench slot.

### Reading of the card text

- One bonus per ability: two Meerkool #10 in play still give +10.
- Damage that isn't the attack itself (bench sweeps, Rainbow Strike, Gnawing
  Precision, Retaliation Stone) also gets Warrior Mode, Guardian Mode, Hard as
  Steel and Elemental Fortitude. Caprine Guard and Metalic Protection name moves
  or attacks, so they don't reduce ability damage.
- Invincible Gambit and Tidal Illusion zero this damage too, but only on the
  locked side's own turns.
- Shields from moves (Mind Ripple, Cotton Guard, Monk's Fury, Spectral Burst)
  protect the creature that used the move, not whoever is active next.
- Metalic Protection's "loses 20 HP" is read as a cost paid at the end of each of
  its owner's turns while it is in play, active or benched.

---

## 5. Items

| # | Item | Behavior |
|---|---|---|
| 66 | Energy Antenna | 1 energy to a chosen Mechanic creature of yours |
| 67 | Revive Crystal | Return a chosen creature from your discard pile to hand, fully reset |
| 68 | Shield Barrier | Your creatures take 20 less from the opponent's next attack |
| 69 | Aura Crystal | Heal each of your damaged creatures 10 |
| 70 | Healing Crystal | Heal a chosen damaged Celestial creature of yours 40 |
| 71 | Disruptor | The opponent shuffles their hand into their deck and draws one fewer |
| 72 | Amulet | Your Neutral creatures' attacks +20 for 2 of your turns |
| 73 | Gale Shield | Your Wind creatures take 30 less from the opponent's next attack |
| 74 | Mystic Scroll | Take a Mystic Stage 1 from your deck into your hand; your turn ends |

Items with no legal target can't be played and don't use the turn's item. The
AI's preset decks only include a type-specific item (Energy Antenna, Healing
Crystal, Gale Shield, Mystic Scroll, Amulet) if the deck has that type.

---

## 6. Testing

| Check | What it covers | Last result |
|---|---|---|
| `test.html?auto=4000` | Engine fuzzer, random decks from both sets; reports every effect, ability and item that never fired | 4,000 games, 0 crashes, every effect, ability and item exercised |
| `test-ui.html` | Buttons and controls in every phase, energy, Flux, Starfall, raids, full art | 116/116 |
| Family strength test | Every GA family, 5,000 AI-vs-AI games each, results in `tcg-family-test-galactic.xlsx` | 200,000 games, 0 crashes; family win rates 41.1–57.4%, every family within 8 points of its type average |

The "Before vs after changes" sheet tracks three runs with the same seeds:

1. Before the ability fixes: family win rates 30.1–63.3%.
2. After the ability fixes: 30.4–60.4%. Steelspirit fell from 63.3% to 46.5%
   once Metalic Protection cost 20 HP every turn.
3. After the balance pass below: 41.1–57.4% (standard deviation 4.2 points).

### Balance pass (November 2026)

| Card | Change |
|---|---|
| Photosynthra | Enraged Charge 40+ → 50+ |
| Comiscroaker | Toadstool Toss 70 → 60 |
| Electrogriff | Harsh Flinch 20+ → 10+, Tempest Hold 90 → 80 |
| Pangodice | Chaos Dice 30 → 50 |
| Mousucklord | Piercing Bite 60 → 50, cost NN → NNN |
| Cockarion | Blow Blitz 100 → 110 |
| Beanknight | Caffeine Addiction 50 → 70 |
| Tielzor | HP 80 → 100, Hurricane Wing cost WWWW → WWW |
| Fluffbill | Bill Bash 50 → 70, cost N → NN |
| Ectomango | HP 70 → 80, Juicy Aroma 40 → 50 |
| Cloudboss | Cloud Bounce 30 → 40 |
| Gigglewood | Laughing Leaves 20 → 40 |
| Pantheraura | HP 70 → 80, Mind Mirage 30 → 40 |
| Frostant | Retreat 1 → 0, Psychic Prowl 30 → 40 |

These are in `src/data/cards.js` and the root `Galactic Adventures.csv`.

---

## 7. Raid bosses

Galactic full-art cards each have a raid boss in `src/data/raid-bosses.js`:
Teklash (#02), Starraffe (#11), Airsting (#15), Mystaeon (#21), Mousuckler (#45),
Cockatrike (#48) and Ectomango (#65). A boss opens once the player owns 2 normal
copies of its card, which needs the set to be unlocked, and its deck is built
from the boss's line plus lines from unlocked sets.
