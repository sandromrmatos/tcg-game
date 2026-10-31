# AI Secondary Move Effects Fix

## Issue Description
When the AI used moves with secondary effects (especially Galactic Adventures expansion moves), the effects were not applying. For example:
- **Harsh Flinch** (Electrogriff) - Should flip coins until tails and add +20 damage per heads, but AI didn't flip any coins
- Many other Galactic Adventures moves were also missing their effects

## Root Cause
The AI attack function (`aiAttack()`) was missing the Galactic Adventures damage calculation effects that were present in the player attack function (`handleAttack()`). The effects were only partially implemented in the AI version.

### Missing Effects in AI Attack
The following 12 effects were completely missing from the AI attack damage calculation:

1. **shadowWrap** - +30 damage if opponent has special condition (Hallucination/Flux/Lock)
2. **verdantStruggle** - Flip 2 coins, if both heads deal 50, otherwise 0
3. **furySpin** - +50 damage if HP is 30 or less
4. **enragedCharge** - +30 damage per energy after 3
5. **harshFlinch** - Flip coins until tails, +20 per heads ← **Reported issue**
6. **foresightBeam** - Flip coin, if heads +10 damage
7. **spectralWrapGA** - +10 damage per energy on opponent's active
8. **featherBarrage** - Flip coin, if heads +20 damage
9. **hurricaneWing** - Flip coin, if tails no damage
10. **tailDance** - Flip coin, if tails no damage
11. **alphabetAssault** - 10 damage per letter in opponent's name
12. **infernoConstrict** - 30 damage per Mechanic creature on bench

## Solution
Added all 12 missing damage calculation effects to the AI attack function, matching the implementation in the player attack function.

### Implementation Details

#### Added After `galacticMeteor` Check (Around Line 7100)
```javascript
} else if (effect === 'shadowWrap') {
    if (defender.hallucinating || defender.hasFlux || defender.hasLock) {
        damage += 30;
        alert(`AI's Shadow Wrap: ${defender.data.name} has a special condition! +30 damage! Total: ${damage}`);
    }
} else if (effect === 'verdantStruggle') {
    const flip1 = flipCoin();
    const flip2 = flipCoin();
    alert(`AI's Verdant Struggle: Flipped ${flip1} and ${flip2}`);
    if (flip1 === 'heads' && flip2 === 'heads') {
        damage = 50;
        alert("Both heads! Deals 50 damage!");
    } else {
        damage = 0;
        alert("At least one tails! Deals no damage!");
    }
} else if (effect === 'furySpin') {
    const attackerRemaining = attacker.data.hp - attacker.damage;
    if (attackerRemaining <= 30) {
        damage += 50;
        alert(`AI's Fury Spin: ${attacker.data.name} has ${attackerRemaining} HP (30 or less)! +50 damage! Total: ${damage}`);
    }
} else if (effect === 'enragedCharge') {
    if (attacker.energy > 3) {
        const extraEnergy = attacker.energy - 3;
        damage += extraEnergy * 30;
        alert(`AI's Enraged Charge: ${attacker.data.name} has ${extraEnergy} extra energy! +${extraEnergy * 30} damage! Total: ${damage}`);
    }
} else if (effect === 'harshFlinch') {
    // FIXED: AI now flips coins until tails
    let headsCount = 0;
    let results = [];
    let keepFlipping = true;
    while (keepFlipping) {
        const flip = flipCoin();
        results.push(flip);
        if (flip === 'heads') {
            headsCount++;
        } else {
            keepFlipping = false;
        }
    }
    const bonusDamage = headsCount * 20;
    damage += bonusDamage;
    alert(`AI's Harsh Flinch: Flipped ${results.join(', ')}! Got ${headsCount} heads before tails! +${bonusDamage} damage! Total: ${damage}`);
}
// ... and 7 more effects
```

### Alert Pattern
All AI effects now show alerts prefixed with "AI's" to distinguish them from player moves:
- Player: `"Harsh Flinch: Flipped..."`
- AI: `"AI's Harsh Flinch: Flipped..."`

## Affected Creatures & Moves

### Now Working for AI
1. **Electrogriff** (Galactic Adventures_033)
   - Move 1: Harsh Flinch - Now flips coins correctly

2. **Hoatzion** (Galactic Adventures_022)
   - Move 1: Verdant Struggle - Now flips coins
   - Move 2: Fury Spin - Now checks HP correctly

3. **Photosynthra** (Galactic Adventures_024)
   - Move 1: Enraged Charge - Now adds bonus per energy

4. **Psychea** (Galactic Adventures_040)
   - Move 1: Foresight Beam - Now flips coin

5. **Mummira** (Galactic Adventures_043)
   - Move 1: Spectral Wrap - Now adds damage per energy

6. **Serpenmoon** (Galactic Adventures_053)
   - Move 1: Alphabet Assault - Now counts letters

7. **Infernoconda** (Galactic Adventures_055)
   - Move 2: Inferno Constrict - Now counts Mechanic creatures

8. And more creatures with similar effects...

## Testing Checklist

### Harsh Flinch (Reported Issue)
- [x] AI uses Harsh Flinch from Electrogriff
- [x] AI flips coins until tails
- [x] Shows alert with flip results
- [x] Adds +20 damage per heads
- [x] Base 20 damage + bonus applied correctly

### Other Effects
- [x] Shadow Wrap checks for status conditions
- [x] Verdant Struggle flips 2 coins (both heads = 50, else 0)
- [x] Fury Spin checks HP ≤ 30
- [x] Enraged Charge checks energy > 3
- [x] Foresight Beam flips coin for +10
- [x] Spectral Wrap GA adds damage per energy
- [x] Feather Barrage flips coin for +20
- [x] Hurricane Wing flips coin (tails = 0 damage)
- [x] Tail Dance flips coin (tails = 0 damage)
- [x] Alphabet Assault counts letters in name
- [x] Inferno Constrict counts Mechanic creatures

## Pattern Consistency
The AI attack function now mirrors the player attack function for all Galactic Adventures damage calculation effects, ensuring:
- Same damage formulas
- Same coin flip mechanics
- Same conditional checks
- Same alert messages (with "AI's" prefix)

## Files Modified
- `TCG Game/script.js`:
  - Lines ~7100-7230: Added 12 missing effect implementations to `aiAttack()` function

## Related Fixes
This fix complements:
- **Secondary Effects Knockout Fix** - Status conditions on KO
- **Thunder Rush Fix** - Ability tracking for evolution

---

**Fix Date**: 2026-08-06  
**Issue Reporter**: User (Harsh Flinch not working)  
**Fixed By**: Kiro AI  
**Status**: ✅ Complete

## Notes
- All Galactic Adventures moves now work identically for both player and AI
- Future move additions should be added to BOTH `handleAttack()` and `aiAttack()` functions
- Coin flip and dice roll mechanics are consistent across all implementations
