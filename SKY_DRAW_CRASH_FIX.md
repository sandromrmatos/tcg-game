# Sky Draw Crash Fix

## Issue Description
When using Sky Draw move (Tielzor and other creatures), the game would freeze/crash with the following error:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'name')
at createCardElement (script.js:1240:25)
```

This happened for both player and AI when using Sky Draw.

## Root Cause
The Sky Draw effect implementation had a critical bug in how it drew cards from the deck.

### The Problem
The deck (`gameState.player.deck` and `gameState.opponent.deck`) contains **card IDs** (strings), not card objects.

**Sky Draw's Incorrect Implementation:**
```javascript
// WRONG - Pushes a string ID directly to hand
const drawnCard = gameState[attackingPlayer].deck.pop();  // Returns a string ID
gameState[attackingPlayer].hand.push(drawnCard);  // Pushes string to hand
```

This caused the hand array to contain a raw string instead of a proper card object. When `renderHand()` tried to render the card, it called `createCardElement(card)` where `card` was just a string, not an object with `.data.name`, causing the crash.

### How Other Functions Do It Correctly
The `drawCards()` function (used at turn start) properly converts card IDs to card objects:

```javascript
// CORRECT - Creates full card object from ID
const cardId = gameState[player].deck.pop();  // Get ID
const cardData = getCardData(cardId);  // Look up card data
gameState[player].hand.push({
    id: cardId,
    data: cardData,
    energy: 0,
    damage: 0,
    abilityUsedThisTurn: false,
    // ... other properties
});
```

## Solution
Updated both Sky Draw implementations (in `handleMoveEffect` and `handleMoveEffectBeforeKnockout`) to properly create card objects from IDs.

### Fixed Implementation

#### In `handleMoveEffect` (Line ~3648)
```javascript
case 'skyDraw':
    // Sky Draw - Draw a card after attacking
    if (gameState[attackingPlayer].deck.length > 0) {
        const cardId = gameState[attackingPlayer].deck.pop();
        const cardData = getCardData(cardId);
        const drawnCard = {
            id: cardId,
            data: cardData,
            energy: 0,
            damage: 0,
            abilityUsedThisTurn: false,
            absorbEnergyActive: false,
            energizedHealingAmount: 0,
            healingRetreatAmount: 0,
            evolutionId: Math.random().toString(36).substr(2, 9),
            evolutionChain: []
        };
        gameState[attackingPlayer].hand.push(drawnCard);
        setTimeout(() => {
            alert(`${attackingPlayer === 'player' ? 'You' : 'AI'} drew a card!`);
            renderGame();
            callback();
        }, 500);
    } else {
        callback();
    }
    break;
```

#### In `handleMoveEffectBeforeKnockout` (Line ~4356)
Same implementation for consistency.

### Card Object Structure
All cards in hand, active, bench, and discard must have this structure:
```javascript
{
    id: string,              // e.g. "Galactic Adventures_001.png"
    data: object,            // Card data from cardDatabase
    energy: number,          // Energy attached
    damage: number,          // Damage taken
    abilityUsedThisTurn: boolean,
    absorbEnergyActive: boolean,
    energizedHealingAmount: number,
    healingRetreatAmount: number,
    evolutionId: string,     // Unique ID for evolution tracking
    evolutionChain: array    // Previous evolution forms
}
```

## Affected Creatures
Sky Draw is used by several creatures:

1. **Tielzor** (Elemental Awakening_73)
   - Move 2: Sky Draw (30 damage + draw 1 card)

2. **Aerohawk** (Elemental Awakening_58)
   - Move 2: Sky Draw (50 damage + draw 1 card)

All of these now work correctly for both player and AI.

## Testing Checklist
- [x] Player uses Sky Draw (Tielzor) - No crash
- [x] AI uses Sky Draw - No crash
- [x] Card properly appears in hand
- [x] Card has full data structure
- [x] Card can be played from hand
- [x] Works when defender is knocked out
- [x] Works when defender survives
- [x] No F12 console errors

## Pattern: Card Drawing
**Rule for Future Effects:** Any effect that draws cards must follow this pattern:

```javascript
// 1. Get card ID from deck
const cardId = gameState[player].deck.pop();

// 2. Look up card data
const cardData = getCardData(cardId);

// 3. Create full card object
const card = {
    id: cardId,
    data: cardData,
    energy: 0,
    damage: 0,
    // ... all other required properties
};

// 4. Add to hand
gameState[player].hand.push(card);
```

**Never** push the raw card ID to the hand!

## Data Structure Understanding

### Deck
- Contains: **Array of strings** (card IDs)
- Example: `["Galactic Adventures_001.png", "Elemental Awakening_05.png", ...]`

### Hand / Active / Bench / Discard
- Contains: **Array of card objects**
- Each object has: `{id, data, energy, damage, ...}`

This separation allows:
- Efficient deck storage (just IDs)
- Full card state in play (energy, damage, abilities)
- Easy card lookup via `getCardData(id)`

## Files Modified
- `TCG Game/script.js`:
  - Lines ~3648-3672: Fixed Sky Draw in `handleMoveEffect()`
  - Lines ~4356-4380: Fixed Sky Draw in `handleMoveEffectBeforeKnockout()`

## Related Systems
This fix ensures consistency with:
- `drawCards()` function - Used at turn start
- `drawInitialHands()` function - Used at game start
- All other card drawing mechanics

---

**Fix Date**: 2026-08-06  
**Issue Reporter**: User (Sky Draw with Tielzor crash)  
**Fixed By**: Kiro AI  
**Status**: ✅ Complete

## Notes
- Sky Draw now works identically to the standard draw system
- Both player and AI can safely use Sky Draw
- Card object structure is now consistent across all game states
- Future card-drawing effects should follow the same pattern
