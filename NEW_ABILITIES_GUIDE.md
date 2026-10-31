# New Abilities Quick Reference Guide

## 5 New Creature Abilities

### 🛡️ Hard as Steel (Strutalon)
**Card:** Elemental Awakening_58.png  
**Type:** Mechanic  
**HP:** 130  
**Stage:** Stage 2 (evolves from Struto)

**Ability:**
- Use from active spot or bench
- Reduces damage from **Mechanic** or **Neutral** attacks by **30** next turn
- Shield lasts until consumed by one attack

**Strategy Tips:**
- Use before opponent's turn if they have Mechanic/Neutral creatures
- Great against: Byteblade, Voltveil, Envoye, Galaktikreme, Baklavaff
- Doesn't work against: Mystic, Wind, Celestial types
- Can turn a 60 damage attack into 30 damage

**Example:**
```
Turn 3: Strutalon uses Hard as Steel
Turn 4: Opponent's Galaktikreme (Neutral) uses Pastry Crunch (50 damage)
Result: 50 - 30 = 20 damage to Strutalon
```

---

### 💪 Aura of Strength (Equinox)
**Card:** Elemental Awakening_61.png  
**Type:** Mechanic  
**HP:** 110  
**Stage:** Stage 3 (evolves from Equinix → Ponimetal)

**Ability:**
- Requires **full bench** (3 creatures on bench)
- Use from active spot or bench
- Adds **+30 damage** to your attacks this turn
- Bonus consumed after one attack

**Strategy Tips:**
- Build your bench before using this ability
- Best with high-damage moves (makes 60 → 90 damage)
- Use on same turn you plan to attack
- Bonus applied BEFORE opponent's shields

**Example:**
```
Setup: Equinox active, bench full (3 creatures)
Turn 5: Use Aura of Strength
Turn 5: Attack with Metal Burst (60 base damage)
Result: 60 + 30 = 90 damage!
```

---

### ⚡ Guardian's Call (Aeglet)
**Card:** Elemental Awakening_63.png  
**Type:** Mechanic  
**HP:** 60  
**Stage:** Stage 1

**Ability:**
- Requires **Aegiscelis in hand**
- Use from active spot or bench
- Flip a coin - if **heads**, evolve to Aegiscelis immediately
- **Bypasses all evolution rules** (can evolve same turn, turn 1, turn 2)

**Strategy Tips:**
- Keep Aegiscelis in hand when you play Aeglet
- 50% chance to skip evolution restrictions
- Preserves damage and energy when evolving
- Can attack immediately after evolving (if heads)
- Great for emergency evolution in tough situations

**Example:**
```
Turn 1: Play Aeglet from hand
Turn 1: Use Guardian's Call (normally can't evolve turn 1)
Result: Flip heads → Aeglet instantly becomes Aegiscelis!
HP: 60 → 130, can use Guardian Glow (50 damage) same turn
```

---

### 🛡️ Guardian (Aegiscelis)
**Card:** Elemental Awakening_64.png  
**Type:** Mechanic  
**HP:** 130  
**Stage:** Stage 2 (evolves from Aeglet)

**Ability:**
- **MUST be on bench** to use (cannot use from active)
- Next turn, this creature takes damage instead of your active creature
- Redirects ALL damage from one attack
- Guardian may be knocked out if damage exceeds its HP

**Strategy Tips:**
- Protect your valuable active creature from fatal damage
- Use when active creature is low HP and you can't retreat
- Aegiscelis has high HP (130) so can tank big hits
- Position Aegiscelis on bench before opponent's turn
- If Guardian is KO'd, opponent gets the prize point

**Example:**
```
Setup: Active creature has 80/100 HP (20 HP left)
Turn 6: Aegiscelis (bench, 130 HP) uses Guardian
Turn 7: Opponent attacks for 60 damage
Result: Aegiscelis takes 60 damage (now 70/130 HP)
        Active creature safe at 20/100 HP!
```

**AI Behavior:** AI uses Guardian when its active creature is 60%+ damaged

---

### ⚡ Energy Siphon (Lumbertail)
**Card:** Elemental Awakening_78.png  
**Type:** Neutral  
**HP:** 100  
**Stage:** Stage 3 (evolves from Furstream → Minkpaw)

**Ability:**
- Requires **opponent used item card last turn**
- Use from active spot or bench
- Attaches **1 energy** to this creature
- Works with any item: Potion, Card Draw, Booster, Power-Up, Remedy

**Strategy Tips:**
- Watch opponent's item usage carefully
- Free energy if opponent heals or draws cards
- Great for energy-hungry attacks (Feline Fury costs NNN)
- No cost to use - pure benefit
- Can accelerate your attack setup

**Example:**
```
Turn 4 (Opponent): Uses Potion to heal active creature
Turn 5 (You): Lumbertail uses Energy Siphon
Result: Lumbertail gains +1 energy (now has 3 energy)
Can use Feline Fury (70 damage, costs NNN)
```

---

## Ability Button Location

All abilities appear below the creature card display when:
1. Creature has an ability
2. Creature meets location requirements (active/bench/any)
3. Ability hasn't been used this turn
4. Creature exists in play

Click the ability button to activate. Alert will confirm success or explain why it can't be used.

---

## Combining Abilities

### Power Combo 1: Guardian + Hard as Steel
1. Strutalon (bench) uses Hard as Steel
2. Aegiscelis (bench) uses Guardian
3. Opponent attacks with Mechanic/Neutral creature for 80 damage
4. Result: 80 - 30 = 50 damage → redirected to Aegiscelis
5. Aegiscelis takes only 50 damage, active untouched!

### Power Combo 2: Aura of Strength + Booster
1. Build full bench
2. Use Aura of Strength (+30 damage)
3. Use Booster item (+20 damage)
4. Attack with 60 damage move
5. Result: 60 + 30 + 20 = 110 damage in one hit!

### Power Combo 3: Guardian's Call → Guardian
1. Play Aeglet
2. Use Guardian's Call (flip heads)
3. Evolves to Aegiscelis
4. Next turn: Retreat to bench
5. Use Guardian ability to protect new active creature
6. Fast defensive setup!

---

## Counter Strategies

**Against Hard as Steel:**
- Use non-Mechanic/Neutral attackers (Mystic, Wind, Celestial)
- Retreat and switch to different type
- Use multiple small attacks instead of one big attack

**Against Aura of Strength:**
- Attack before they build full bench
- Knock out bench creatures
- Use defensive abilities or items to reduce damage

**Against Guardian's Call:**
- Nothing you can do (coin flip is random)
- If fails, they wasted their turn - attack hard!

**Against Guardian:**
- Attack with multiple small hits to deplete Guardian's HP
- Use effects that bypass damage (e.g., energy removal)
- Force them to use Guardian early, then attack later

**Against Energy Siphon:**
- Avoid using items if opponent has Lumbertail
- Time item usage strategically
- Use items on turns when you can knock out Lumbertail

---

## Evolution Chains

**Strutalon Line:**
```
Struto (Stage 1, 80 HP)
    ↓ evolve
Strutalon (Stage 2, 130 HP) ← Hard as Steel ability
```

**Equinox Line:**
```
Ponimetal (Stage 1, 70 HP)
    ↓ evolve
Equinix (Stage 2, 90 HP)
    ↓ evolve
Equinox (Stage 3, 110 HP) ← Aura of Strength ability
```

**Aegiscelis Line:**
```
Aeglet (Stage 1, 60 HP) ← Guardian's Call ability
    ↓ evolve (or Guardian's Call shortcut)
Aegiscelis (Stage 2, 130 HP) ← Guardian ability
```

**Lumbertail Line:**
```
Minkpaw (Stage 1, 50 HP)
    ↓ evolve
Furstream (Stage 2, 80 HP)
    ↓ evolve
Lumbertail (Stage 3, 100 HP) ← Energy Siphon ability
```

---

## Deck Building Tips

**Hard as Steel Deck:**
- Include Mechanic energy (K)
- Pair with high-HP creatures
- Defensive playstyle

**Aura of Strength Deck:**
- Include multiple low-retreat creatures for bench
- High-damage attackers
- Aggressive playstyle

**Guardian Deck:**
- Include retreat cards
- Multiple bench creatures
- Defensive control playstyle

**Energy Siphon Deck:**
- Include high energy cost moves
- Energy acceleration
- Adaptive playstyle

---

## Quick Reference Table

| Ability | Card | Type | Location | Condition | Effect |
|---------|------|------|----------|-----------|--------|
| Hard as Steel | Strutalon | Mechanic | Any | None | -30 dmg from Mech/Neutral next turn |
| Aura of Strength | Equinox | Mechanic | Any | Full bench | +30 dmg this turn |
| Guardian's Call | Aeglet | Mechanic | Any | Aegiscelis in hand | Coin flip to evolve instantly |
| Guardian | Aegiscelis | Mechanic | Bench only | None | Redirect damage next turn |
| Energy Siphon | Lumbertail | Neutral | Any | Opp used item last turn | +1 energy |

---

**Have fun with the new abilities!** 🎮
