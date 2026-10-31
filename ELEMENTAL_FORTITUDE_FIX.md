# Elemental Fortitude Fix - Creature-Specific Protection

## Issue Description
Elemental Fortitude ability (Astraea) was protecting the wrong creature. When used from the bench, it protected the active creature instead of protecting only Astraea itself.

**Expected Behavior:**
- Astraea (on bench) uses Elemental Fortitude
- Only Astraea gets the shield
- If opponent attacks Astraea (on bench or after switching to active), shield applies
- If opponent attacks a different creature, shield does NOT apply

**Actual Behavior (Before Fix):**
- Astraea (on bench) uses Elemental Fortitude
- Shield applies to the entire player (team-wide)
- Active creature gets protected instead of Astraea ❌
- Wrong creature receives the benefit

## Root Cause
The ability was setting the shield on `gameState.player` (team-wide) instead of on the specific `card` (creature-specific).

### Before (Wrong)
```javascript
// Ability activation - sets team-wide shield
gameState.player.elementalFortitudeShield = 20;

// Damage check - checks team-wide shield
if (gameState.opponent.elementalFortitudeShield && ...) {
    // Reduces damage for active creature, regardless of who used ability
}
```

### After (Correct)
```javascript
// Ability activation - sets creature-specific shield
card.elementalFortitudeShield = 20;

// Damage check - checks defender's shield
if (defender.elementalFortitudeShield && ...) {
    // Only reduces damage if THIS creature has the shield
}
```

## Solution

### 1. Changed Ability Activation (Line ~5307)
```javascript
case 'elementalFortitude':
    // THIS creature (card) gets the shield, not the whole team
    card.elementalFortitudeShield = 20;
    card.abilityUsedThisTurn = true;
    alert(`${card.data.name} used Elemental Fortitude! Next turn, it takes 20 less damage from Wind/Mechanic attacks!`);
    renderGame();
    break;
```

### 2. Changed Player Attack Damage Check (Line ~2726)
```javascript
// Check the DEFENDER's shield, not gameState
if (defender.elementalFortitudeShield && (attackerType === 'Wind' || attackerType === 'Mechanic')) {
    const shieldAmount = defender.elementalFortitudeShield;
    damage = Math.max(0, damage - shieldAmount);
    alert(`Elemental Fortitude reduces damage by ${shieldAmount}! ${attacker.data.name} deals ${damage} damage!`);
    defender.elementalFortitudeShield = 0; // Shield is consumed
}
```

### 3. Changed AI Attack Damage Check (Line ~7265)
Same logic for AI attacks - checks `defender.elementalFortitudeShield` instead of `gameState.player.elementalFortitudeShield`.

## How It Works Now

### Example: Astraea on Bench
```
Turn 5 (Your turn):
  - Astraea is on bench
  - Use Elemental Fortitude ability
  - Astraea.elementalFortitudeShield = 20
  - Active creature does NOT have shield

Turn 6 (Opponent's turn):
  - Opponent attacks your active creature
  - Active creature has no shield → takes full damage
  - Astraea on bench still has shield
  
  OR
  
  - Opponent attacks Astraea on bench (somehow)
  - Astraea has shield → reduces Wind/Mechanic damage by 20
  - Shield consumed
```

### Example: Astraea on Active, Then Switches
```
Turn 5 (Your turn):
  - Astraea is active
  - Use Elemental Fortitude ability
  - Astraea.elementalFortitudeShield = 20
  - Switch Astraea to bench

Turn 6 (Opponent's turn):
  - Opponent attacks new active creature
  - New active has no shield → takes full damage
  - Astraea on bench still has shield = 20
  
Turn 7 (Your turn):
  - Switch Astraea back to active

Turn 8 (Opponent's turn):
  - Opponent attacks Astraea (now active) with Wind/Mechanic
  - Astraea has shield → reduces damage by 20
  - Shield consumed
```

## Key Points

1. **Creature-Specific**: Shield is on the card object, not the player/team
2. **Persists Through Switching**: If Astraea goes to bench, shield stays with it
3. **Consumed on Use**: Shield clears to 0 when it blocks damage
4. **Type-Specific**: Only works against Wind and Mechanic attackers
5. **Location-Agnostic**: Works whether Astraea is active or on bench

## Pattern: Creature-Specific vs Team-Wide Shields

### Creature-Specific Shields (stored on card)
- `card.elementalFortitudeShield` - Elemental Fortitude
- `card.mindRippleShield` - Mind Ripple
- `card.cottonGuardShield` - Cotton Guard
- `card.metalicProtectionActive` - Metalic Protection

These protect only the creature that used the ability.

### Team-Wide Shields (stored on gameState)
- `gameState.player.guardianModeActive` - Guardian Mode (all creatures)
- `gameState.player.shieldBarrierActive` - Shield Barrier item (active only)
- `gameState.player.galeShieldActive` - Gale Shield item (Wind creatures only)
- `gameState.player.caprineGuardShield` - Caprine Guard (from certain types)

These protect all creatures or specific groups.

## Testing Checklist
- [x] Astraea on bench uses Elemental Fortitude
- [x] Only Astraea has shield (active creature doesn't)
- [x] Opponent attacks active → no shield applies
- [x] Astraea switches to active
- [x] Opponent attacks Astraea with Wind/Mechanic → shield applies
- [x] Shield reduces damage by 20
- [x] Shield is consumed after use
- [x] Non-Wind/Mechanic attacks ignore shield
- [x] Works for AI's Astraea too

## Files Modified
- `TCG Game/script.js`:
  - Line ~5309: Changed `gameState.player.elementalFortitudeShield` to `card.elementalFortitudeShield`
  - Line ~2727: Changed shield check from `gameState.opponent` to `defender`
  - Line ~7267: Changed shield check from `gameState.player` to `defender`

---

**Fix Date**: 2026-08-06  
**Issue Reporter**: User (Astraea Elemental Fortitude protecting wrong creature)  
**Fixed By**: Kiro AI  
**Status**: ✅ Complete
