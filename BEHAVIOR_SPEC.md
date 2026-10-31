# TCG Game — Behavior Specification

This is the **contract for the refactor**. It records the intended behavior of every
move effect, ability, item, and status condition, derived from the original
`script.js` implementation cross-checked against the `Move1 Description` /
`Move2 Description` / `Ability` columns in the two source CSVs.

Where the old code and the CSV design intent disagreed, the CSV wins and the
divergence is recorded in the Bug Ledger at the bottom.

Two rules were confirmed by the project owner and apply throughout:

1. **Attacker-side effects always resolve, even when the attack knocks the defender out.**
   Only effects that *target the defender* are skipped on a knockout.
2. **The AI and the player run the same rules.** A move, ability, or item behaves
   identically regardless of who uses it. There is exactly one implementation of each.

---

## 1. Core rules

| Rule | Value |
|---|---|
| Deck size | exactly 20 cards |
| Max copies of one card | 2 |
| Deck must contain | at least 1 Stage 1 creature |
| Type mixing | one primary type (Mystic / Wind / Celestial / Mechanic) + any number of Neutral and Item cards |
| Opening hand | 5 cards, redrawn until it contains at least 1 Stage 1 |
| Board | 1 active slot + 3 bench slots per side |
| Win conditions | first to 3 points; or most points after turn 30; or opponent has no creature to promote |
| Points | 1 per knocked-out creature, including bench creatures killed by AoE |
| Energy | 1 attachment per turn, to any creature in play; generic (cost is a length, not a colour) |
| Item cards | 1 per turn |
| Attacking | ends the turn |
| Retreat | costs `retreat` energy, discarded from the retreating creature; clears its status |
| Evolution | not before turn 3; not on a creature played this turn; not twice on the same creature in one turn; damage and energy persist |
| Turn counter | increments once per side's turn, so a "round" is 2 increments |

### Type effectiveness (+10 damage)

Mystic → Wind → Celestial → Mystic (cycle). Mechanic → Neutral. Neutral attacks
have no super-effective target. Items have no type interaction.

---

## 2. Canonical damage pipeline

Every attack, by either side, resolves in exactly this order. This is the single
biggest source of the old player/AI divergence, so the order is normative.

**Phase A — gating (abort the attack, no turn consumed)**
1. Attacker's side is under Invincible Gambit → abort
2. Attacker's side is under Quick Reflexes lock → abort
3. Attacker creature is under Wing Slap lock → abort
4. Not enough energy for the chosen move → abort
5. Move is on cooldown (Overdrive Smash) → abort

**Phase B — pre-roll**
6. If attacker has Hallucination, flip once and store the result for this attack

**Phase C — damage calculation**
7. `damage = move.damage`
8. Effect hook `onDamageCalc` (may replace or adjust `damage`)
9. Booster `+20` (consumed)
10. Power-Up `+10` (while turns remain)
11. Hallucination heads `+10`
12. Super effective `+10`
13. Aura of Strength bonus (consumed)
14. Sturdy Presence bonus (consumed)
15. Warrior Mode bonus (consumed)
16. Amulet `+20` if the attacker is Neutral
17. Thunder Rush `×2` (consumed)
18. Chill Recharge `+20` (consumed)
19. Sprout Boost `+30` (consumed)

**Phase D — defender-side reduction** (all clamp at 0)
20. Monk's Fury `−20` (consumed)
21. Hard as Steel `−30` if attacker is Mechanic or Neutral (consumed)
22. Spectral Burst shield (consumed)
23. Defense Aura shield (consumed)
24. Shield Barrier (consumed)
25. Gale Shield if defender is Wind (consumed)
26. Mind Ripple `−20` (consumed)
27. Cotton Guard `−20` (consumed)
28. Guardian Mode `−10` (**not** consumed, lasts the turn)
29. Caprine Guard if attacker is Celestial or Mystic (consumed)
30. Elemental Fortitude if attacker is Wind or Mechanic (consumed)
31. Metalic Protection → `damage = 0` if attacker is Mechanic (**not** consumed)

**Phase E — application**
32. Guardian redirect: a bench creature with Guardian takes the damage instead; resolve its knockout; turn ends
33. Tidal Illusion on the attacker's side → `damage = 0`
34. Apply `damage` to the defender
35. Retaliation Stone: defender deals 20 back if it took damage (consumed); may KO the attacker
36. Rainbow Strike: 30 to a random enemy bench creature (consumed)
37. Hallucination tails → attacker takes 40 self-damage; may KO the attacker
38. Mark `hasAttacked`
39. Phase Shift: attacker must swap to the bench

**Phase F — effect resolution**
40. Effect hook `onResolve` — runs **always**, including when the defender died
41. Effect hook `onResolveIfTargetAlive` — runs only if the defender survived
42. Knockout resolution (active, then bench, both sides), then end of turn

---

## 3. Move effects

`calc` = `onDamageCalc`, `always` = `onResolve`, `alive` = `onResolveIfTargetAlive`.

### Damage-calculation effects

| Effect | Card | Phase | Behavior |
|---|---|---|---|
| `dizzyShot` | Pheonyx | calc | Flip 1: heads `+20` |
| `fortuneSmite` | Rosalia | calc | Flip 1: heads `+20` |
| `foresightBeam` | Psychea | calc | Flip 1: heads `+10` |
| `gearGrind` | Steelspirit | calc | Flip 1: heads `+20` |
| `featherBarrage` | Cockarion | calc | Flip 1: heads `+20` |
| `coinClash` | Dodolet | calc | Flip 1: heads → `30`, tails → `0` |
| `hurricaneWing` | Tielzor | calc | Flip 1: tails → `0` |
| `tailDance` | Platypog, Fluffbill | calc | Flip 1: tails → `0` |
| `verdantStruggle` | Hoatzion | calc | Flip 2: both heads → `50`, else `0` |
| `toxicToss` | Venomgear | calc | Flip 2: `20` per heads |
| `pinkGust` | Cerisebat | calc | Flip 2: `30` per heads |
| `galeFlip` | Aeruffin | calc | Flip 4: `40` per heads |
| `echoLoop` | Blushbat | calc | Flip until tails: `+10` per heads |
| `harshFlinch` | Electrogriff | calc | Flip until tails: `+20` per heads |
| `diceFury` | Dodrift | calc | Roll d6: damage `= roll × 10` |
| `diceTempest` | Dodoryphon | calc | Roll d6: damage `= roll × 20` |
| `nightStrike` | Batakaze | calc | `= attacker.energy × 20` |
| `etherealPulse` | Shadowflit | calc | `= (both actives' energy) × 20` |
| `galacticMeteor` | Starraffe | calc | `= defender.energy × 10` |
| `spectralWrapGA` | Mummira | calc | `+= defender.energy × 10` |
| `neutralSurge` | Dewmo | calc | `= (all Neutral creatures in play, both sides) × 20` |
| `thornyVines` | Verdanthorn | calc | `= (defender side creature count) × 10` |
| `scrapStrike` | Envoye | calc | `= (Item cards in defender's discard) × 20` |
| `alphabetAssault` | Melanchote | calc | `= defender.name.length × 10` |
| `infernoConstrict` | Metalmagma | calc | `= (Mechanic creatures on attacker's bench) × 30` |
| `enragedCharge` | Photosynthra | calc | `+30` per energy above 3 |
| `furySpin` | Hoatzion | calc | `+50` if attacker has ≤30 HP remaining |
| `shadowWrap` | Fuschioria | calc | `+30` if the defender has any status condition |
| `metallicWing` | Struto | calc + always | damage `0`; attacker gains 1 energy |

### Attacker-side effects (always resolve, even on a knockout)

| Effect | Card | Behavior |
|---|---|---|
| `recoil20` | Blossomgale | Attacker takes 20; may KO itself |
| `recoil40` | Cockarion | Attacker takes 40; may KO itself |
| `discard2Energy` | Chimereal | Attacker loses 2 energy |
| `healingRoots` | Verdanthorn | Heal attacker 20 |
| `minorMend` | Floretta | Heal attacker 10 |
| `majorMend` | Lizaflora | Heal attacker 20 |
| `planetBurst` | Orbitmelon | Heal attacker 10 |
| `healingSap` | Aloetide | Heal attacker 20 |
| `chillRecharge` | Steelspirit | Heal attacker 10; next attack `+20` |
| `monksFury` | Metamonk | Flip 1: heads → attacker's side gains a 20-point shield next turn |
| `spectralBurst` | Poltergnet | Attacker's side gains a 10-point shield next turn |
| `cottonGuard` | Cloudlet, Cloudboss | Attacker takes 20 less damage next turn |
| `mindRipple` | Aetherin | Attacker takes 20 less damage next turn |
| `sproutBoost` | Beanling | After 2 turns, attacker's next attack deals `+30` |
| `tempestHold` | Electrogriff | Attacker cannot retreat for 2 of its own turns |
| `overdriveSmash` | Stilflare | This move goes on a 2-turn cooldown for this creature |
| `wingSlap` | Flutterwing | Attacker cannot attack on its next turn |
| `skyDraw` | Tielzor | Attacker draws 1 card |
| `scavengeStrike` | Gearstrike | Flip 1: heads → return a chosen Item from discard to hand |
| `creamyConfection` | Galaktikreme | Flip 1: heads → 1 energy to a chosen bench creature; tails → attacker loses 2 energy |
| `riskyRecoil` | Reddybara | Flip 1: tails → 50 damage to one random own creature; may KO it |
| `energySnatch` | Alpakina | Flip 1: heads → remove 1 energy from a random enemy creature that has energy |
| `heavenlyRetreat` | Serafini | Free swap with a chosen bench creature; turn ends |
| `coffeeHeal` | Beanleaf | Heal a chosen damaged own bench creature 10 |
| `beanBlast` | Beanknight | Heal a chosen damaged own bench creature 20 |
| `berryBurst` | Laugherry | Heal every damaged creature on the attacker's side 10 |
| `laughingLeaves` | Gigglewood | Heal every damaged creature on the attacker's side 20 |
| `caffeineAddiction` | Beanknight | Flip 1: heads → heal attacker 20; tails → Lock on the defender (defender-targeting half is skipped on a KO) |
| `invincibleGambit` | Zenethra | Flip 3: defender's side cannot attack for 1 turn per heads; then the attacker faints |
| `cloudBounce` | Cloudboss | Move 1 energy between two of the attacker's own creatures (optional) |
| `gulpSwap` | Goggly | Swap remaining HP with the defender, each capped at its own max HP |
| `solarAscend` | Pyrosora | Flip 1: heads → 10 to every enemy bench creature (blocked by Camouflage) |
| `mysticBlaze` | Pheonyx | 30 to every enemy bench creature (blocked by Camouflage) |
| `prismaticDive` | Prismarine | Flip 2: `+40` damage to the defender per heads |
| `forcefulFlip` | Envoye | Flip 1: heads → the defender's side must promote a bench creature; the retreating creature's status clears |

### Defender-targeting effects (skipped when the defender is knocked out)

| Effect | Card | Behavior |
|---|---|---|
| `cantRetreat` | Traphex | Defender cannot retreat on its next turn |
| `mindMirage` | Meditot | Hallucination on the defender |
| `etherealEcho` | Zenquaza | Flip 1: heads `+30` damage; then Hallucination on the defender |
| `phantomPulse` | Harmoniqueon | Hallucination on the defender |
| `brainFreeze` | Psydrake | Hallucination on the defender |
| `dreamwave` | Mystikid | Flip 1: heads → Hallucination on the defender |
| `dreamBooster` | Mystikeon, Fuschioria, Oraclyon, Pantheraura | Flip 1: heads → Hallucination on the defender |
| `mindPulse` | Psybella | Flip 1: heads → Hallucination on the defender |
| `fluxWave` | Mystaeon, Olympis, Oraclyon, Mummira, Ectomango | Flux on the defender |
| `spectralSlice` | Mangost | Flip 1: heads → Flux on the defender |
| `forestFury` | Crocaterra, Astrollus | Lock on the defender |
| `psychicProwl` | Frostant | Flip 1: heads → Flux, tails → Lock, on the defender |
| `chaosDice` | Pangodice | Roll d6 → Hallucination (1–2), Flux (3–4), Lock (5–6) on the defender |
| `tidalIllusion` | Astralin | Flip 1: heads → the defender's side deals no damage for its whole next turn |
| `tripleThreatFlip` | Teklash | Flip 2: both heads → the defender is knocked out regardless of HP |

---

## 4. Abilities

Each ability is used at most once per turn per creature, and only before attacking.
`location` is where the creature must be for the ability to be legal.

| Effect | Card(s) | Location | Behavior |
|---|---|---|---|
| `defenseAura` | Antheara (d) | active | Own side gains a 10-point shield next turn |
| `resourcefulRecovery` | Serafina | any | Flip 1: heads → 1 energy to a random own creature |
| `hardAsSteel` | Strutalon | any | Own side takes 30 less from Mechanic/Neutral attackers next turn |
| `auraOfStrength` | Equinox | any | Requires a full bench; own attacks this turn deal `+30` |
| `guardiansCall` | Aeglet | any | Requires Aegiscelis in hand; flip 1: heads → evolve into Aegiscelis immediately, preserving damage, energy, evolution chain and evolution id |
| `guardian` | Aegiscelis | bench | Next turn this creature takes damage in place of the active creature |
| `energySiphon` | Lumbertail | any | Requires the opponent to have used an item last turn; gain 1 energy |
| `quickReflexes` | Toxiforge | any | Flip 2: both heads → opponent cannot attack on their next turn |
| `clarityAura` | Sunbloss | any | Own creatures cannot receive Hallucination during the opponent's next turn |
| `celestialBlessing` | Rosalia | any | Heal one random damaged Celestial creature 30, either side |
| `sturdyPresence` | Reddybara | any | Own attacks this turn deal `+20` |
| `rainbowStrike` | Prismarine | active | This turn's attack also deals 30 to a random enemy bench creature |
| `camouflage` | Mystikeon | any | Own bench creatures cannot be damaged during the opponent's next turn |
| `phaseShift` | Pheonyx | active | After attacking, this creature must swap to the bench |
| `extraCharge` | Antaray | any | Attach 1 extra energy to a chosen Neutral creature |
| `guardianMode` | Meerkool (a) | any | All own creatures take 10 less damage during the opponent's next turn |
| `warriorMode` | Meerkool (b) | any | Own attacks this turn deal `+10` |
| `healingRetreat1` | Trunket | active | Heals 20 when this creature retreats to the bench |
| `healingRetreat2` | Elefeir | active | Heals 40 when this creature retreats to the bench |
| `mirageShield` | Planterdon | active | Opponent cannot use items during their next turn |
| `thunderRush` | Breezebuzz, Zephyrbuzz | active | Requires the opponent to have evolved last turn; this turn's attack damage is doubled |
| `absorbEnergy` | Lumifloris, Photosynthra | any | While active, any healing of this creature also attaches 1 energy |
| `energizedHealing1` | Nebuleap | any | While active, attaching energy to this creature also heals it 10 |
| `energizedHealing2` | Comiscroaker | any | While active, attaching energy to this creature also heals it 20 |
| `gnawingPrecision` | Mousucklord | any | Deal 20 to a chosen enemy creature |
| `metalicProtection` | Steelspirit | any | Takes 20 self-damage; immune to Mechanic damage during the opponent's next turn |
| `caprineGuard` | Pigmoat | any | Takes 40 less from Celestial/Mystic attackers next turn |
| `elementalFortitude` | Astraea | any | This creature takes 20 less from Wind/Mechanic attackers next turn |
| `hydration` | Fluffbill | active | Immune to status conditions from the opponent's attacks during their next turn |
| `retaliationStone` | Notreclast | any | If damaged by an attack next turn, deals 20 back to the attacker |
| `aquaMirror` | Ectomango | active | If this creature receives a status condition next turn, the attacker receives it too |

---

## 5. Items

| Card | Behavior |
|---|---|
| Potion | Heal a chosen own creature 20 |
| Card Draw | Draw 2 |
| Booster | Next attack this turn deals `+20` |
| Power-Up | Attacks deal `+10` for the next 3 turns |
| Remedy | Clear all status conditions from the own active creature |
| Energy Antenna | Attach 1 energy to a chosen own Mechanic creature |
| Revive Crystal | Return a chosen creature from the own discard pile to hand, fully reset |
| Shield Barrier | Own side takes 20 less damage next turn |
| Aura Crystal | Heal every damaged own creature 10 |
| Healing Crystal | Heal a chosen damaged own Celestial creature 40 |
| Disruptor | Opponent shuffles their hand into their deck and draws one fewer card |
| Amulet | Own Neutral creatures deal `+20` for the next 2 turns |
| Gale Shield | Own Wind creatures take 30 less damage next turn |
| Mystic Scroll | Search the own deck for a Mystic Stage 1 and put it in hand; the turn then ends |

Items require a legal target: an item with no valid target cannot be played and
does not consume the turn's item slot.

---

## 6. Status conditions

Status conditions exist **only on the active creature**. They are applied by
attacks, and they are cleared when the creature leaves the active slot for any
reason (retreat, Heavenly Retreat, forced swap, Phase Shift, knockout) and by Remedy.
A creature promoted from the bench always arrives clean.

| Status | Icon | Trigger | Effect |
|---|---|---|---|
| Hallucination | 😵 | When this creature attacks | Flip 1: heads → `+10` damage, tails → 40 self-damage |
| Flux | ⚡ | When this side attaches energy | Flip 2: both tails → attachment blocked for the turn |
| Lock | 🔒 | When this side uses an item | Flip 1: tails → the item is not spent and stays in hand |

Application is gated by, in order: the target must be alive; Clarity Aura on the
target's side blocks Hallucination; Hydration on the target blocks everything;
Aqua Mirror on the target reflects the same status back onto the attacker.

The Flux check happens once per turn. Once failed, energy attachment stays blocked
for the remainder of that turn.

---

## 7. Turn lifecycle

A "next turn" restriction is set on the affected side and cleared at the **end of
that side's own turn**, so the restriction is felt for a full turn. This is the
rule the project's steering doc calls out, and it now applies uniformly — including
to Wing Slap and Quick Reflexes, which previously used a separate absolute
`cantAttackUntilTurn` deadline.

Order of operations in `endTurn`:

1. Decrement the ending side's Power-Up and Amulet counters
2. Decrement the ending side's retreat locks, attack locks, and move cooldowns
3. Clear the ending side's expiring restrictions: Tidal Illusion, Mirage Shield, Wing Slap, Quick Reflexes, Warrior Mode
4. Advance Sprout Boost counters
5. Switch sides and increment the turn counter
6. Clear the starting side's protective auras that covered the opponent's turn: Guardian Mode, Clarity Aura, Camouflage, Metalic Protection, Hydration, Aqua Mirror
7. Clear the starting side's `evolvedLastTurn`
8. Reset per-turn flags for both sides: energy attached, has attacked, item used, Booster, Flux check, one-turn damage bonuses
9. Reset every creature's `abilityUsedThisTurn`
10. Clear the turn tracker
11. Check the turn limit (>30 ends the game on points)
12. Draw 1 for the side now starting
13. Hand over to the AI if it is the AI's turn

---

## 8. Bug ledger

Behavior present in the old code that the refactor **deliberately changes**. All
were confirmed by reading `script.js`; line numbers refer to the original file.

### Attacker/defender resolution

| # | Old behavior | New behavior |
|---|---|---|
| 1 | 11 attacker-side effects were absent from the knockout path and silently dropped when the attack killed the defender: `invincibleGambit`, `tidalIllusion`, `cottonGuard`, `cloudBounce`, `sproutBoost`, `gulpSwap`, `mindRipple`, `tripleThreatFlip`, `spectralSlice`, `berryBurst`, `laughingLeaves` | Attacker-side halves always resolve; only defender-targeting halves are skipped |
| 2 | `prismaticDive` was routed to the inline chain but only implemented in the survive branch, so its bench damage vanished on a knockout (3147, 7878) | Resolves in both cases |

### Player/AI divergence

| # | Old behavior | New behavior |
|---|---|---|
| 3 | Player's `mindMirage`, `etherealEcho`, `phantomPulse`, `dreamwave`, `dreamBooster` wrote `defender.hallucinating` raw (3255–3292), bypassing the AI's Clarity Aura; the AI's copies checked it | One gated application path for both sides |
| 5 | The Overdrive Smash cooldown was checked only on the player path (2332) | Checked for both |
| 6 | `aiConsiderRetreat` ignored `cantRetreat` and `cantRetreatTurns` (6388–6473), so Tempest Hold and Ethereal Snare did not bind the AI | One retreat-legality check for both |
| 7 | The AI's `forcefulFlip` cleared only Hallucination (7773, 7960); the player's cleared all three | One status-clearing path |
| 20 | The AI attack path omitted Cotton Guard entirely, so the player's Cotton Guard did not reduce AI damage | Single ordered reduction pipeline |
| 21 | The AI attack path never read `amuletTurnsRemaining`, `chillRechargeBonus`, `sproutBoostActive`, or `thunderRushActive`, so the AI's Amulet, Chill Recharge, Sprout Boost and Thunder Rush had no effect | Single ordered bonus pipeline |
| 19 | The AI's ability chains covered 20 of 31 abilities from the active slot and 15 from the bench; `absorbEnergy`, `energizedHealing1/2`, `caprineGuard`, `elementalFortitude`, `gnawingPrecision`, `hydration`, `aquaMirror` were never used by the AI | One registry; every ability is available to both sides, with a per-ability AI heuristic |

### Dead or incorrect implementations

| # | Old behavior | New behavior |
|---|---|---|
| 4 | `guardiansCall` built a replacement card without `evolutionChain`, `evolutionId` or `statusConditions` (5127, 5586, 5807), so the pre-evolution card never reached the discard pile and the creature could be evolved again the same turn | Goes through the shared evolution routine |
| 8 | `case 'caffeineAddiction'` appeared twice in `handleMoveEffectBeforeKnockout` (3754, 3883); the second was dead | One definition |
| 9 | `caffeineAddiction` (4501) and `psychicProwl` (4655, 4658) wrote the legacy booleans instead of the status manager, so those statuses never entered the status set | All status goes through one API |
| 11 | `useMysticScrollCard` filtered the deck as if it held card objects (`c.data.stage`) but the deck holds id strings, so it always failed, wasted the card and ended the turn | Resolves ids correctly |
| 13 | `cloudBounce` was a no-op that only printed a message | Implemented as an energy move between own creatures |
| 14 | `healingRoots`, `minorMend`, `majorMend`, `planetBurst`, `healingSap`, `chillRecharge`, `caffeineAddiction`, `berryBurst`, `laughingLeaves` and `celestialBlessing` all decremented `damage` directly, bypassing `healCreature()`, so Absorb Energy never triggered from them | All healing goes through one function |
| 22 | `hydration` and `aquaMirror` set flags that were never read anywhere — the two abilities did nothing | Implemented in the status application gate |
| 12 | `useReviveCrystalCard` and `scavengeStrike` auto-picked the first candidate while telling the player to choose | The player chooses; the AI picks by heuristic |

### Lifecycle and state

| # | Old behavior | New behavior |
|---|---|---|
| 15 | `resetAndStartNewGame` rebuilt the side objects with a subset of their fields and never cleared `turnTracker.evolvedIds`, so flags could leak into a new game | One factory builds a side; full reset |
| 16 | The Overdrive cooldown check ran after the Hallucination flip was stored, so an aborted attack left a stale flip that applied to the next attack | All gating precedes the roll |
| 17 | `checkAbilityUsable` never enforced `abilityLocation === 'bench'`; only the render path gated it | Location is enforced in the shared legality check |
| 26 | **Introduced by this rewrite, then fixed.** The Ready button's enabled state was derived from a "is it the player's turn" test requiring `phase === 'playing'`. During setup the phase is `setup` and `currentTurn` is still `null`, so Ready was permanently disabled and the game could not be started. The engine fuzzer could not catch it because it bypasses the setup UI entirely. | Setup is handled explicitly in `Render.controls()`, and `test-ui.html` now asserts control state in every phase |
| 18 | `absorbEnergy` and `energizedHealing` were one-shot per activation, but the CSVs describe them as continuous ("every time", "when this creature is healed") | Continuous while the creature is in play |

### Content data

| # | Old behavior | New behavior |
|---|---|---|
| 23 | Evolution matched on `prevStage` by **name**, and names are not unique (4 × Antheara, 2 × Meerkool) | Cards carry a resolved `prevStageId`; a startup validator rejects ambiguous links |
| 24 | `Galactic Adventures_85` "Pantheraura" has `move1Name: "Mind Mirage"` but `move1Effect: "dreamBooster"` (a coin-flip version), which contradicts Mind Mirage on Meditot | Kept as-is (the CSV agrees), but the validator now reports name/effect mismatches as warnings |
| 25 | README documented Galactic Adventures images as `_001.png`–`_086.png`; on disk they are `_01.png`–`_86.png` | Documentation corrected; the validator checks every id against the `cards/` folder |
