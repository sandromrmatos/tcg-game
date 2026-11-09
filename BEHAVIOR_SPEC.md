# TCG Game — Behavior Specification

The rules as the code implements them, for every move effect, ability, item and
status condition. The source of truth for card text is the two CSVs in the repo
root: `Tcg game - Elemental Awakening.csv` and `Galactic Adventures.csv` (the
copies in `cards/` are older and not used).

Rules that apply throughout:

1. **The AI and the player run the same rules.** There is one implementation of
   each move, ability and item, and both sides call it.
2. **Attacker-side effects always resolve, even when the attack knocks the defender
   out.** Only effects that act on the defender are skipped after a knockout.
3. **0 damage is always 0.** A move that deals no damage (a utility move, a missed
   coin flip) gets no bonuses: super effective, Booster, Power-Up, Amulet, Warrior
   Mode and the rest only add to damage that is actually dealt, and single-use
   bonuses are not spent on it.
4. **Always-on abilities are always on.** Only abilities whose card text is a
   choice have a button (section 4).
5. **Whoever uses an effect makes its choices.** When the AI uses Gnawing
   Precision, the AI picks the target, even though it's one of your creatures.
   The exception is Forceful Flip, where the card says the defender switches, so
   the defending side chooses.

---

## 1. Core rules

| Rule | Value |
|---|---|
| Deck size | exactly 20 cards, at most 2 copies of a card |
| Deck must contain | at least 1 Stage 1 creature |
| Type mixing | one main type (Mystic / Wind / Celestial / Mechanic) + any Neutral creatures and items |
| Opening hand | 5 cards, redrawn until it has a Stage 1 |
| Board | 1 active slot + 3 bench slots per side |
| Win | first to 3 points; or more points after turn 30 (equal = draw); or the opponent has no creatures left |
| Points | 1 per knocked-out creature, bench knockouts included |
| First turn | a coin decides who starts; the starter skips the turn-1 draw and can't attack on turn 1 (energy is allowed) |
| Energy | typed. Each deck uses one or more energy types; each turn rolls one type and you may attach 1 energy of it to any of your creatures |
| Move costs | letters: `M` Mystic, `W` Wind, `C` Celestial, `K` Mechanic, `N` any type |
| Items | 1 per turn |
| Attacking | ends the turn |
| Retreat | once per turn; costs `retreat` energy (any type) from the retreating creature; clears its status conditions. Forced switches don't count as the retreat |
| Evolution | from turn 3; not onto a creature played this turn; once per creature per turn; damage, energy, status and attack/retreat locks carry over |
| Turn counter | +1 per side's turn, so each side acts on every second number |

### Type effectiveness (+10 damage)

Mystic → Wind → Celestial → Mystic, and Mechanic → Neutral. Neutral attackers
never get the bonus.

### Durations

Every "next turn" effect stores an absolute turn deadline (`timing.js`), so nothing
is counted down and nothing can drift. With T = the turn it was created:

| Helper | Deadline | Used by |
|---|---|---|
| `throughOpponentTurn()` | T + 1 | shields (Shield Barrier, Gale Shield, Mind Ripple, Cotton Guard, Monk's Fury, Spectral Burst), Guardian |
| `opponentTurns(n)` | T + 2n − 1 | Tidal Illusion, Quick Reflexes, Ethereal Snare, Starfall Strike (n = 1); Invincible Gambit (n = heads) |
| `myTurns(n)` | T + 2n | Wing Slap, Overdrive Smash (n = 1); Tempest Hold, Amulet (n = 2) |

An `opponentTurns(n)` effect sits on the opposing side and is only read on that
side's own turns, so the caster's turns in between never use it up.

---

## 2. Attack pipeline

Every attack, by either side, resolves in this order (`combat.js`, `damage.js`).

**A. Gating** (the attack doesn't happen and the turn isn't used)
1. Starter's turn 1
2. Quick Reflexes on the attacking side
3. Wing Slap on the attacking creature
4. Not enough energy of the right types
5. Move on cooldown (Overdrive Smash)

Invincible Gambit and Tidal Illusion do **not** stop attacks: the move is used and
its other effects happen, it just deals 0 damage.

**B. Pre-roll**
6. Hallucination: flip once now (heads +10, tails 40 self-damage after the attack)

**C. Damage calculation**
7. `damage = move.damage`, then the move's `onDamageCalc` (coin flips, counts)
8. **If the result is 0, it stays 0**: phase D is skipped entirely

**D. Modifiers** (in this order; never below 0)

| # | Modifier | Amount | Notes |
|---|---|---|---|
| 9 | Booster | +20 | spent |
| 10 | Power-Up | +10 | one of 3 attacks spent |
| 11 | Hallucination heads | +10 | |
| 12 | Super effective | +10 | |
| 13 | Aura of Strength | +30 | Equinox in play and your bench is full |
| 14 | Sturdy Presence | +20 | Reddybara in play |
| 15 | Warrior Mode | +10 | Meerkool #10 in play |
| 16 | Amulet | +20 | attacker is Neutral |
| 17 | Chill Recharge | +20 | spent |
| 18 | Sprout Boost | +30 | spent |
| 19 | Thunder Rush | ×2 | this creature, opponent evolved on their last turn |
| 20 | Monk's Fury | −20 | on the defending creature only; spent |
| 21 | Hard as Steel | −30 | defender is Strutalon, attacker Mechanic or Neutral |
| 22 | Spectral Burst | −10 | on the defending creature only; spent |
| 23 | Defense Aura | −10 | defender is Antheara (Defense Aura) |
| 24 | Shield Barrier | −20 | whole side; spent |
| 25 | Gale Shield | −30 | whole side, Wind defenders; spent |
| 26 | Mind Ripple | −20 | on the defending creature only; spent |
| 27 | Cotton Guard | −20 | on the defending creature only; spent |
| 28 | Guardian Mode | −10 | Meerkool #09 on the defending side |
| 29 | Caprine Guard | −40 | defender is Pigmoat, attacker Celestial or Mystic |
| 30 | Elemental Fortitude | −20 | defender is Astraea, attacker Wind or Mechanic |
| 31 | Metalic Protection | → 0 | defender is Steelspirit, attacker Mechanic |
| 32 | Tidal Illusion | → 0 | attacking side is under it |
| 33 | Invincible Gambit | → 0 | attacking side is under it |

Always-on bonuses count once per ability, however many copies are in play.

**E. Application**
34. Guardian: if a benched Aegiscelis used Guardian last turn and is still on the
    bench, it takes the damage instead (only when there is damage)
35. Otherwise the defender takes the damage; then Retaliation Stone (20 back)
36. Rainbow Strike: 30 to a random enemy bench creature
37. Hallucination tails: 40 to the attacker
38. Phase Shift: the attacker switches to the bench

**F. Effects and knockouts**
39. `onResolve` — always runs, including after a knockout
40. `onResolveIfTargetAlive` — only if the defender survived
41. Knockouts (bench first, then actives, both sides), then end of turn

### Damage outside the attack

Bench sweeps (Mystic Blaze, Solar Ascend), Rainbow Strike, Gnawing Precision and
Retaliation Stone are damage from one side to the other, so they get the same
always-on rules (`adjustCrossDamage`):

- Warrior Mode +10 for the dealing side; Guardian Mode −10 for the receiving side
- Hard as Steel and Elemental Fortitude by the source creature's type
- Caprine Guard and Metalic Protection only against moves (their text says "moves" / "attacks"), not abilities
- Invincible Gambit and Tidal Illusion: a side under them deals 0 of this damage too, on its own turns
- Camouflage: no damage at all to that side's bench

Self-damage (recoil, Risky Recoil, Hallucination, Metalic Protection) gets none of
these, except that Camouflage still protects the bench from Risky Recoil.

---

## 3. Move effects

`calc` = during damage calculation, `always` = after damage, even on a knockout,
`alive` = only if the defender survived.

### Damage calculation

| Effect | Card | Behavior |
|---|---|---|
| `dizzyShot` | Pheonyx | Flip 1: heads +20 |
| `fortuneSmite` | Rosalia | Flip 1: heads +20 |
| `gearGrind` | Steelspirit | Flip 1: heads +20 |
| `featherBarrage` | Cockarion | Flip 1: heads +20 |
| `foresightBeam` | Psychea | Flip 1: heads +10 |
| `coinClash` | Dodolet | Flip 1: heads 30, tails 0 |
| `hurricaneWing` | Tielzor | Flip 1: tails 0 |
| `tailDance` | Platypog, Fluffbill | Flip 1: tails 0 |
| `verdantStruggle` | Hoatzion | Flip 2: both heads 50, else 0 |
| `toxicToss` | Venomgear | Flip 2: 20 per heads |
| `pinkGust` | Cerisebat | Flip 2: 30 per heads |
| `galeFlip` | Aeruffin | Flip 4: 40 per heads |
| `prismaticDive` | Prismarine | Flip 2: +40 per heads |
| `echoLoop` | Blushbat | Flip until tails: +10 per heads |
| `harshFlinch` | Electrogriff | Flip until tails: +20 per heads |
| `diceFury` | Dodrift | d6 × 10 |
| `diceTempest` | Dodoryphon | d6 × 20 |
| `nightStrike` | Batakaze | 20 per **Wind** energy on the attacker |
| `etherealPulse` | Shadowflit | 20 per energy on both active creatures |
| `galacticMeteor` | Starraffe | 10 per energy on the defender |
| `spectralWrapGA` | Mummira | +10 per energy on the defender |
| `neutralSurge` | Dewmo | 20 per Neutral creature in play (both sides) |
| `thornyVines` | Verdanthorn | 10 per creature the opponent has in play |
| `scrapStrike` | Envoye | 20 per item in the opponent's discard pile |
| `alphabetAssault` | Melanchote | 10 per letter of the defender's name |
| `infernoConstrict` | Metalmagma | 30 per Mechanic creature on your bench |
| `enragedCharge` | Photosynthra | +30 per energy above 3 |
| `furySpin` | Hoatzion | +50 if the attacker has 30 HP or less |
| `shadowWrap` | Fuschioria | +30 if the defender has a status condition |
| `etherealEcho` | Zenquaza | Flip 1: heads +30; always Hallucination on the defender |
| `metallicWing` | Struto | 0 damage; the attacker gets 1 energy |
| `invincibleGambit` | Zenethra | Always 0 damage (see below) |

### Attacker side (always)

| Effect | Card | Behavior |
|---|---|---|
| `recoil20` / `recoil40` | Blossomgale / Cockarion | Attacker takes 20 / 40 |
| `infernoWing` | Pyrosora | Flip 1: tails, the attacker takes 20 |
| `discard2Energy` | Chimereal | Attacker loses 2 energy |
| `healingRoots`, `majorMend` | Verdanthorn, Lizaflora | Heal the attacker 20 |
| `minorMend`, `planetBurst` | Floretta, Orbitmelon | Heal the attacker 10 |
| `healingSap` | Aloetide | Heal 30 on each of your damaged creatures |
| `berryBurst` / `laughingLeaves` | Laugherry / Gigglewood | Heal each of your damaged creatures 10 / 20 |
| `coffeeHeal` / `beanBlast` | Beanleaf / Beanknight | Heal a chosen damaged bench creature 10 / 20 |
| `chillRecharge` | Steelspirit | Heal the attacker 10; its next attack +20 |
| `sproutBoost` | Beanling | Its next attack +30, kept if it evolves first |
| `monksFury` | Metamonk | Flip 1: heads, **this creature** takes 20 less during the opponent's next turn |
| `spectralBurst` | Poltergnet | **This creature** takes 10 less during the opponent's next turn |
| `mindRipple`, `cottonGuard` | Aetherin; Cloudlet, Cloudboss | This creature takes 20 less during the opponent's next turn |
| `tempestHold` | Electrogriff | The attacker can't retreat for 2 of its turns |
| `wingSlap` | Flutterwing | The attacker can't attack on its next turn |
| `overdriveSmash` | Stilflare | Can't be used on its owner's next turn (blocked for 2 turns counting the opponent's), usable again the turn after |
| `skyDraw` | Tielzor | Draw 1 |
| `scavengeStrike` | Gearstrike | Flip 1: heads, return a chosen item from the discard pile to hand |
| `creamyConfection` | Galaktikreme | Flip 1: heads, 1 energy to a chosen bench creature; tails, the attacker loses 2 energy |
| `riskyRecoil` | Reddybara | Flip 1: tails, 50 to a random creature of yours |
| `energySnatch` | Alpakina | Flip 1: heads, a random opposing creature with energy loses a **random** one of its energy |
| `heavenlyRetreat` | Serafini | Free switch with a chosen bench creature |
| `cloudBounce` | Cloudboss | Optionally move 1 energy from one of your **bench** creatures to another bench creature |
| `gulpSwap` | Goggly | Swap remaining HP with the defender, each capped at its max |
| `mysticBlaze` | Pheonyx | 30 to every opposing bench creature |
| `solarAscend` | Pyrosora | Flip 1: heads, 10 to every opposing bench creature |
| `starfallStrike` | Starraffe | Flip 1: heads, the opponent's next turn energy is Celestial |
| `caffeineAddiction` | Beanknight | Flip 1: heads, heal the attacker 20; tails, Lock on the defender |
| `invincibleGambit` | Zenethra | Flip 3. For each heads the opponent deals no damage on one of **their** turns (their next 1–3 turns; your turns don't count). Their moves still work, only the damage is 0, and that includes bench and ability damage. Zenethra then faints |

### Defender side

| Effect | Card | When | Behavior |
|---|---|---|---|
| `mindMirage` | Meditot, Oraclyon, Pantheraura | always | Hallucination, no coin |
| `phantomPulse` | Harmoniqueon | always | Hallucination |
| `brainFreeze` | Psydrake | always | Hallucination |
| `dreamwave` | Mystikid | always | Flip 1: heads, Hallucination |
| `dreamBooster` | Mystikeon, Fuschioria | always | Flip 1: heads, Hallucination |
| `mindPulse` | Psybella | always | Flip 1: heads, Hallucination |
| `fluxWave` | Mystaeon, Olympis, Oraclyon, Mummira, Ectomango | always | Flux |
| `spectralSlice` | Mangost | always | Flip 1: heads, Flux |
| `forestFury` | Crocaterra, Astrollus | always | Lock |
| `psychicProwl` | Frostant | always | Flip 1: heads Flux, tails Lock |
| `chaosDice` | Pangodice | always | d6: 1–2 Hallucination, 3–4 Flux, 5–6 Lock |
| `cantRetreat` | Traphex | alive | The defender can't retreat on its next turn |
| `tidalIllusion` | Astralin | alive | Flip 1: heads, the opponent deals no damage on their next turn |
| `tripleThreatFlip` | Teklash | alive | Flip 2: both heads, the defender is knocked out |
| `forcefulFlip` | Envoye | alive | Flip 1: heads, the defending side must switch (it chooses) |

Status conditions can't land on a knocked-out creature, so "always" status effects
do nothing after a knockout.

---

## 4. Abilities

### Always on (no button)

They work whenever the creature is in play and standing where the card says
(`active`, `bench` or `any`). Nothing is "used", nothing expires, and swapping or
evolving the creature away ends them.

| Effect | Card | Where | Behavior |
|---|---|---|---|
| `defenseAura` | Antheara | active | This creature takes 10 less damage from attacks |
| `hardAsSteel` | Strutalon | any | This creature takes 30 less from Mechanic and Neutral creatures |
| `sturdyPresence` | Reddybara | any | Your attacks +20 |
| `auraOfStrength` | Equinox | any | Your attacks +30 while your bench is full |
| `clarityAura` | Sunbloss | any | Your creatures can't get Hallucination |
| `camouflage` | Mystikeon | any | Your bench creatures can't be damaged |
| `rainbowStrike` | Prismarine | active | Its attacks also deal 30 to a random opposing bench creature |
| `energySiphon` | Lumbertail | any | Whenever the opponent uses an item, it gets 1 energy |
| `guardianMode` | Meerkool #09 | any | All damage your creatures take from the opponent −10 |
| `warriorMode` | Meerkool #10 | any | All damage your side deals to the opponent +10 |
| `healingRetreat1` / `2` | Trunket / Elefeir | active | Heals 20 / 40 whenever it goes from active to the bench (retreat or forced switch), if damaged |
| `mirageShield` | Planterdon | active | The opponent can't use items |
| `thunderRush` | Breezebuzz, Zephyrbuzz | active | Its attack damage ×2 if the opponent evolved on their last turn |
| `absorbEnergy` | Lumifloris, Photosynthra | any | Whenever it is healed, it also gets 1 energy |
| `energizedHealing1` / `2` | Nebuleap / Comiscroaker | any | Whenever energy is attached to it, it heals 10 / 20 |
| `metalicProtection` | Steelspirit | any | Mechanic attacks deal it no damage; it loses 20 HP at the end of each of its owner's turns |
| `caprineGuard` | Pigmoat | any | Takes 40 less from moves by Celestial and Mystic creatures |
| `elementalFortitude` | Astraea | any | Takes 20 less from Wind and Mechanic creatures |
| `hydration` | Fluffbill | active | Can't get status conditions |
| `retaliationStone` | Notreclast | any | Whenever an attack damages it, it deals 20 back to the attacker |
| `aquaMirror` | Ectomango | active | Any status condition it gets from the opponent is also given to the attacker |

### Choice (a button, once per turn)

Used from the creature panel, at most once per turn per creature, before
attacking. An effect that lasts lasts until your next turn, then you decide again.

| Effect | Card | Where | Behavior |
|---|---|---|---|
| `resourcefulRecovery` | Serafina | any | Flip 1: heads, 1 energy to a chosen creature of yours |
| `guardiansCall` | Aeglet | any | Needs Aegiscelis in hand. Flip 1: heads, evolve into it now (damage, energy and chain kept) |
| `guardian` | Aegiscelis | bench | During the opponent's next turn, the next attack on your active creature hits this Aegiscelis instead. It remembers the creature, not the bench slot; if it leaves the bench first, the protection ends |
| `quickReflexes` | Toxiforge | any | Flip 2: both heads, the opponent can't attack on their next turn |
| `celestialBlessing` | Rosalia | any | Heal a random damaged Celestial creature 30, either side |
| `phaseShift` | Pheonyx | active | After this turn's attack, it switches to the bench (free) |
| `extraCharge` | Antaray | any | Attach 1 extra energy to a Neutral creature of yours |
| `gnawingPrecision` | Mousucklord | any | Deal 20 to an opposing creature; the user of the ability chooses which |

---

## 5. Items

| Card | Behavior |
|---|---|
| Potion | Heal a chosen creature of yours 20 |
| Card Draw | Draw 2 |
| Booster | Your next attack this turn +20 |
| Power-Up | Your next 3 attacks +10 |
| Remedy | Clear your active creature's status conditions |
| Energy Antenna | 1 energy to a chosen Mechanic creature of yours |
| Revive Crystal | Return a chosen creature from your discard pile to hand, fully reset |
| Shield Barrier | Your creatures take 20 less from the opponent's next attack |
| Aura Crystal | Heal each of your damaged creatures 10 |
| Healing Crystal | Heal a chosen damaged Celestial creature of yours 40 |
| Disruptor | The opponent shuffles their hand into their deck and draws one fewer |
| Amulet | Your Neutral creatures' attacks +20 for 2 of your turns |
| Gale Shield | Your Wind creatures take 30 less from the opponent's next attack |
| Mystic Scroll | Take a Mystic Stage 1 from your deck into your hand; your turn ends |

An item without a legal target can't be played and doesn't use the turn's item.
Mirage Shield blocks all items while the opposing Planterdon is active. Each item
used triggers every opposing Lumbertail's Energy Siphon.

---

## 6. Status conditions

Status conditions only exist on the active creature. They come from attacks and
are cleared when the creature leaves the active slot (retreat, switch, knockout)
and by Remedy. A creature coming in from the bench always arrives clean.
Evolving keeps them.

| Status | Effect |
|---|---|
| Hallucination 😵 | When it attacks, flip 1: heads +10 damage (only if the move deals damage), tails 40 self-damage |
| Flux ⚡ | When you attach energy to it, flip 2: both tails, that energy is lost and the turn's attachment is used. Attaching to the bench doesn't flip |
| Lock 🔒 | When you use an item, flip 1: tails, the item stays in hand but the turn's item is used |

Checks, in order: the target must be alive; Hydration on the target blocks
everything; Clarity Aura on the target's side blocks Hallucination; nothing stacks;
Aqua Mirror on the target gives the same status to the attacker (once, no
ping-pong).

---

## 7. Turn lifecycle

`endTurn` for the side whose turn is ending:
1. Drop unspent this-turn bonuses (Booster, Phase Shift)
2. Metalic Protection: each of its Steelspirits loses 20 HP, then knockouts
3. Turn 30 just ended → the game ends on points
4. Switch sides, turn counter +1

`beginTurn` for the side starting:
1. Reset the turn budget (energy, attack, item, retreat, Flux check) and ability uses
2. Roll the turn's energy type (Celestial if Starfall Strike landed)
3. Draw 1 (not for the starter on turn 1)
4. Announce what's in effect against it (Invincible Gambit, Quick Reflexes, Tidal Illusion, Mirage Shield, Wing Slap)
5. Hand over to the AI if it's the AI's turn

Nothing else needs clearing: every timed effect is a deadline, and always-on
abilities are read from the board each time.

---

## 8. Change ledger

Behavior that was deliberately changed, newest first.

### Ability and effect fixes (November 2026)

| # | Before | Now |
|---|---|---|
| 40 | Most abilities were buttons that had to be pressed each turn, even when the card text describes something permanent | 23 abilities are always on (section 4); only the 8 whose text is a choice have a button |
| 41 | Always-on bonuses stacked with several copies | One bonus per ability |
| 42 | Guardian remembered a bench slot, so a swap could make a different creature take the hit | Remembers the Aegiscelis itself; ends if it leaves the bench |
| 43 | Monk's Fury, Spectral Burst, Hard as Steel, Defense Aura and Caprine Guard were side-wide, so a creature switched in got the protection | Only the creature itself is protected |
| 44 | Invincible Gambit stopped the opponent attacking at all | The opponent attacks normally but deals 0 damage, for one of their turns per heads; Zenethra's own damage is always 0 |
| 45 | Overdrive Smash was blocked for 2 of its owner's turns | Blocked for 1 of its owner's turns (2 turns counting the opponent's) |
| 46 | Bonuses (super effective, Booster, Warrior Mode...) turned 0-damage moves into damage | 0 stays 0; single-use bonuses aren't spent |
| 47 | Oraclyon's Foresight Blast and Pantheraura's Mind Mirage flipped a coin for Hallucination | Always cause Hallucination, like Meditot's Mind Mirage |
| 48 | Cloud Bounce could move energy to or from the active creature | Bench to bench only |
| 49 | Energy Snatch took the energy type the creature held most of | A random one of its energy |
| 50 | Energy Siphon was a button | Automatic whenever the opponent uses an item |
| 51 | Guardian Mode had to be activated and only reduced attack damage | Reduces all damage to any of your creatures from the opponent |
| 52 | Sprout Boost and Chill Recharge were lost when the creature evolved | Kept |
| 53 | Metalic Protection cost 20 HP once, when pressed | Always on; 20 HP at the end of each of its owner's turns |
| 54 | Healing Retreat had to be pressed before retreating | Heals on every move from active to bench, if damaged |
| 55 | Camouflage didn't cover the side's own Risky Recoil | Covers all bench damage |
| 56 | When the AI used Gnawing Precision, the player was asked to pick their own creature | The AI chooses |
| 57 | The AI's status scoring looked up `'Hallucination'` but statuses are lowercase, so it never valued them | Lowercase keys |
| 58 | Bench sweeps, Rainbow Strike, Gnawing Precision and Retaliation Stone ignored defensive and damage abilities | Same always-on rules as attacks (section 2) |

### Earlier fixes

| # | Before | Now |
|---|---|---|
| 30 | Healing Sap only healed the attacker | Heals 30 on each damaged creature of yours |
| 31 | Energy was generic | Typed energy, typed move costs |
| 32 | The player going first could attack on turn 1 | The starter can't attack and skips the turn-1 draw |
| 33 | Retreat could be repeated in one turn | Once per turn |

### From the original refactor

| # | Old behavior | New behavior |
|---|---|---|
| 1 | 11 attacker-side effects were dropped when the attack knocked the defender out | Attacker-side effects always resolve |
| 2 | `prismaticDive` bonus vanished on a knockout | A damage bonus, computed before damage |
| 3 | Player's Hallucination moves bypassed Clarity Aura | One gated status path |
| 4 | `guardiansCall` built a replacement card without its evolution chain | Uses the shared evolution routine |
| 5 | Overdrive Smash cooldown was only checked for the player | Checked for both |
| 6 | The AI ignored retreat locks | One retreat-legality check |
| 7 | The AI's `forcefulFlip` cleared only Hallucination | One status-clearing path |
| 8–9 | Duplicate `caffeineAddiction` case; status written to legacy booleans | One definition; one status API |
| 11 | Mystic Scroll always failed | Reads deck ids correctly |
| 12 | Revive Crystal and Scavenge Strike auto-picked while asking the player | The player chooses |
| 13 | `cloudBounce` did nothing | Implemented |
| 14 | Several heals bypassed `healCreature()`, so Absorb Energy missed them | All healing goes through one function |
| 15 | New games could inherit flags | One factory, full reset |
| 16 | An aborted attack left a stale Hallucination flip | All gating before the roll |
| 17 | Bench-only abilities could be used from the active slot | Location enforced in one check |
| 19 | The AI never used 8 abilities | One registry for both sides |
| 20–21 | The AI's attacks skipped Cotton Guard, Amulet, Chill Recharge, Sprout Boost, Thunder Rush | One ordered pipeline |
| 22 | Hydration and Aqua Mirror did nothing | Implemented in the status gate |
| 23 | Evolution matched by name (names repeat) | Matched by card id, validated at startup |
| 26 | Ready button stuck disabled in setup | Fixed, covered by `test-ui.html` |
