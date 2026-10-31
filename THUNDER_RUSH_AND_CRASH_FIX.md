# Thunder Rush Ability & AI Crash Fix

## Issue 1: Thunder Rush Not Working

### Problem Description
Breezebuzz (and Zephyrbuzz) have the Thunder Rush ability which should double attack damage if the opponent evolved a creature last turn. However:
- The ability button appeared but was always disabled
- Even when opponent evolved on turn 4, player couldn't use Thunder Rush on turn 5
- Error message: "Thunder Rush requires the opponent to have evolved a creature last turn!"

### Root Cause
The ability checks for `gameState.opponent.evolvedLastTurn` flag, but this flag was **never set** anywhere in the code. The evolution system tracked evolutions in `turnTracker.evolvedThisTurn` but didn't set the per-player flag needed for Thunder Rush.

### Solution
Added `evolvedLastTurn` flag tracking to the evolution system:

#### 1. Player Evolution (`evolveCard` function)
```javascript
// After evolution completes, set the flag
gameState[player].evolvedLastTurn = true;
```

#### 2. AI Evolution (`aiTryEvolveOnce` function)
Added to both active and bench evolution paths:
```javascript
// Set evolvedLastTurn flag for Thunder Rush ability tracking
gameState.opponent.evolvedLastTurn = true;
```

#### 3. Flag Clearing (`endTurn` function)
**IMPORTANT:** The flag is cleared for the player whose turn is **STARTING**, not ending!

```javascript
// Clear evolvedLastTurn for the player whose turn is STARTING
// This allows the opponent to use Thunder Rush during their entire turn
gameState[playerStartingTurn].evolvedLastTurn = false;
```

**Why this timing matters:**
- Turn 13: Opponent evolves → `opponent.evolvedLastTurn = true`
- Turn 14 (your turn): You can use Thunder Rush because `opponent.evolvedLastTurn` is still `true`
- Turn 15 starts: NOW clear `opponent.evolvedLastTurn` to `false`

If we cleared it at the end of turn 13, it would already be false on turn 14!

**Bug Fix (2026-08-06):** Initially cleared the flag at the wrong time (end of the turn when evolution happened), which meant it was already false when the opponent's next turn started. Fixed to clear at the start of the turn AFTER the opponent's turn, ensuring the flag persists through the full turn cycle.

### How It Works Now
1. **Turn 13 (Opponent turn)**: Opponent evolves a creature (any creature, active or bench)
   - Sets `gameState.opponent.evolvedLastTurn = true`
2. **Turn 13 ends, Turn 14 starts (Player turn)**: Thunder Rush ability becomes available
   - Check passes: `gameState.opponent.evolvedLastTurn === true`
   - Player can activate Thunder Rush
   - Next attack damage is doubled
3. **Turn 14 ends, Turn 15 starts**: Flag is cleared
   - Sets `gameState.opponent.evolvedLastTurn = false`

**Key Timing:** The flag persists through the ENTIRE next player's turn, allowing them to use Thunder Rush anytime during their turn. It's only cleared when THEIR turn ends and the next turn begins.

---

## Issue 2: Game Freeze After Thunder Rush

### Problem Description
After using Thunder Rush ability and attacking, the game would freeze during the AI's turn. Console error:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'name')
at script.js:6270:81
at Array.findIndex (<anonymous>)
at aiUseItems (script.js:6270:53)
```

### Root Cause
The AI's `aiUseItems()` function uses `findIndex()` to search for specific item cards:
```javascript
// BEFORE (Crash-prone)
const potionIndex = gameState.opponent.hand.findIndex(card => card.data.name === "Potion");
```

If the hand array contained any `null` or `undefined` entries (which can happen after certain game actions), the findIndex callback would try to access `.data.name` on undefined, causing a crash.

### Solution
Added null/undefined checks to all `findIndex` calls in AI item usage:

#### Fixed Locations
1. **Remedy search** (line ~6395):
```javascript
const remedyIndex = gameState.opponent.hand.findIndex(card => 
    card && card.data && card.data.name === "Remedy"
);
```

2. **Potion search** (line ~6415):
```javascript
const potionIndex = gameState.opponent.hand.findIndex(card => 
    card && card.data && card.data.name === "Potion"
);
```

3. **Booster search** (line ~6433):
```javascript
const boosterIndex = gameState.opponent.hand.findIndex(card => 
    card && card.data && card.data.name === "Booster"
);
```

4. **Guardian's Call - Aegiscelis search** (2 locations, lines ~5410 & ~5627):
```javascript
const aegiscelisIndex = gameState.opponent.hand.findIndex(c => 
    c && c.data && c.data.name === "Aegiscelis"
);
```

### Pattern
The fix follows a defensive programming pattern:
```javascript
// Safe findIndex pattern
array.findIndex(item => item && item.data && item.data.property === value)
```

This ensures:
1. `item` exists (not null/undefined)
2. `item.data` exists
3. Only then access `item.data.property`

---

## Testing Checklist

### Thunder Rush Ability
- [x] Opponent evolves creature on turn 4
- [x] Player can use Thunder Rush on turn 5
- [x] Thunder Rush doubles attack damage
- [x] Thunder Rush flag clears after turn ends
- [x] Works with bench evolutions (not just active)
- [x] Works for both Breezebuzz and Zephyrbuzz

### AI Crash Prevention
- [x] AI uses items without crashing
- [x] Game continues after Thunder Rush ability is used
- [x] No errors in console during AI turn
- [x] AI can find and use Remedy, Potion, Booster
- [x] Guardian's Call ability works for AI

---

## Files Modified
- `TCG Game/script.js`:
  - Line ~1658: Added `evolvedLastTurn = true` to player evolution
  - Lines ~6332 & ~6355: Added `evolvedLastTurn = true` to AI evolution (active & bench)
  - Line ~5922: Clear `evolvedLastTurn` flag in `endTurn()`
  - Lines ~6395, ~6415, ~6433: Added null checks to item findIndex calls
  - Lines ~5410, ~5627: Added null checks to Guardian's Call findIndex

---

## Related Issues
This fix is related to but separate from:
- **Secondary Effects Knockout Fix** (Tempest Hold fix)
- **Evolution System Fixes** (Double evolution bug, evolution chain discard)

---

**Fix Date**: 2026-08-06  
**Issue Reporter**: User (Turn 5 bug report)  
**Fixed By**: Kiro AI  
**Status**: ✅ Complete
