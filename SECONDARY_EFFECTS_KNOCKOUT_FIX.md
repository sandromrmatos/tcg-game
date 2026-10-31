# Secondary Move Effects Knockout Fix

## Issue Description
Secondary move effects were not applying when attacks knocked out the opponent. Specifically:
- **Forest Fury** - Should apply Lock to defender
- **Chaos Dice** - Should apply Hallucination/Flux/Lock to defender
- **Mind Pulse** - Should apply Hallucination on coin flip
- **Flux Wave** - Should apply Flux to defender
- **Psychic Prowl** - Should apply Flux or Lock on coin flip
- **Caffeine Addiction** - Should apply Lock on coin flip (tails)

**Note:** Tempest Hold was initially included but is actually a self-restriction (attacker can't retreat), not a defender-targeting effect.

## Root Cause
When an attack knocked out the opponent's active creature, the game would:
1. Check if defender HP ≥ damage
2. If yes, call `handleMoveEffectBeforeKnockout()` for attacker-only effects
3. Handle knockout
4. Force opponent to select new active creature

However, effects that targeted the **defender** were not included in `handleMoveEffectBeforeKnockout()`, so they never applied to the incoming replacement creature.

## Solution

### 1. Added Defender-Targeting Effects to `handleMoveEffectBeforeKnockout()`
Added the following cases to handle defender-targeting status condition effects even when the original defender is knocked out:

```javascript
case 'forestFury':
    // Sets incomingHasLock = true on opponent's gameState
    
case 'chaosDice':
    // Sets incomingHallucinating/incomingHasFlux/incomingHasLock based on dice roll
    
case 'mindPulse':
    // Sets incomingHallucinating = true on coin flip heads
    
case 'fluxWave':
    // Sets incomingHasFlux = true
    
case 'psychicProwl':
    // Sets incomingHasFlux or incomingHasLock based on coin flip
    
case 'caffeineAddiction':
    // Heals attacker on heads, sets incomingHasLock on tails
```

### 2. Updated `selectNewActiveCreature()`
Modified to apply incoming status effects to the new active creature:

```javascript
function selectNewActiveCreature(player, benchIndex) {
    gameState[player].active = gameState[player].bench[benchIndex];
    gameState[player].bench[benchIndex] = null;
    
    // Apply incoming status conditions
    if (gameState[player].incomingHallucinating) {
        gameState[player].active.hallucinating = true;
        gameState[player].incomingHallucinating = false;
        alert(`${gameState[player].active.data.name} is hallucinating!`);
    }
    
    if (gameState[player].incomingHasFlux) {
        gameState[player].active.hasFlux = true;
        gameState[player].incomingHasFlux = false;
        alert(`${gameState[player].active.data.name} is affected by Flux!`);
    }
    
    if (gameState[player].incomingHasLock) {
        gameState[player].active.hasLock = true;
        gameState[player].incomingHasLock = false;
        alert(`${gameState[player].active.data.name} is affected by Lock!`);
    }
    
    renderGame();
}
```

## Pattern
This fix establishes a pattern for handling **defender-targeting status condition effects** when the defender is knocked out:

1. Effect is called via `handleMoveEffectBeforeKnockout()` (not in exclusion list)
2. Effect sets a flag on the opponent's `gameState` (e.g., `incomingHasLock = true`)
3. Player selects replacement creature
4. `selectNewActiveCreature()` applies the flag to the new active creature
5. Flag is cleared after application

## Tempest Hold - Special Case
**Tempest Hold is NOT a defender-targeting effect.** It restricts the **attacker** from retreating for 2 turns.

The move works like this:
- Electrogriff uses Tempest Hold and attacks
- Electrogriff cannot retreat for 2 turns
- The opponent is not affected by any retreat restriction

This is similar to moves like Wing Slap where the attacker pays a cost (can't attack/retreat next turn) for dealing damage.

## Testing Checklist
- [x] Forest Fury applies Lock to incoming creature
- [x] Chaos Dice applies correct status based on roll to incoming creature
- [x] Mind Pulse applies Hallucination on heads to incoming creature
- [x] Flux Wave applies Flux to incoming creature
- [x] Psychic Prowl applies Flux/Lock based on flip to incoming creature
- [x] Caffeine Addiction applies Lock on tails to incoming creature
- [x] All effects show proper alerts
- [x] Status conditions persist through turns
- [x] Tempest Hold restricts attacker, not defender

## Files Modified
- `TCG Game/script.js`:
  - Lines 3735-3800: Added defender-targeting status effects to `handleMoveEffectBeforeKnockout()`
  - Lines 4205-4212: Fixed Tempest Hold to affect attacker instead of defender
  - Lines 4838-4862: Updated `selectNewActiveCreature()` to apply incoming status conditions

## Related Documentation
- See `tcg-game-patterns.md` steering file for move effects system
- See `README.md` for status conditions overview
- See `GALACTIC_ADVENTURES_IMPLEMENTATION_SUMMARY.md` for recent bug fixes

---

**Fix Date**: 2026-08-06  
**Issue Reporter**: User  
**Fixed By**: Kiro AI  
**Status**: ✅ Complete (Tempest Hold corrected 2026-08-06)
