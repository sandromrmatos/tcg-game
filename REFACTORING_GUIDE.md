# TCG Game - Code Refactoring Guide

## Problem Analysis

The current implementation has several critical issues that make it bug-prone and difficult to maintain:

### 1. **Status Conditions Are Scattered**
- Hallucination, Flux, and Lock are applied in individual move effects
- Each move that causes a status condition has its own logic
- No centralized validation that status only affects active creatures
- When creatures switch or are KO'd, status conditions leak to incoming creatures

### 2. **No Centralized Status Condition System**
- Status checks happen in multiple places (energy attachment, attack, item use)
- Each check duplicates logic instead of calling a shared function
- No unified way to clear status conditions when creatures leave active slot
- Hard to add new status conditions without touching dozens of places

### 3. **Move Effects Are Mixed With Game Logic**
- Damage calculation, effect application, and knockout checking are intertwined
- Hard to determine when effects should apply (before damage, after damage, only if survives)
- No clear distinction between "immediate effects" and "delayed effects"

### 4. **Ability System Is Inconsistent**
- Some abilities set flags, others modify stats directly
- No clear pattern for when abilities activate or deactivate
- Timing issues with ability clearing (start of turn vs end of turn)

---

## Proposed Refactoring Plan

### Phase 1: Centralize Status Condition System

#### 1.1 Create Status Condition Manager

```javascript
// New centralized status condition system
const StatusConditionManager = {
    // All status conditions and their properties
    conditions: {
        hallucination: {
            icon: '😵',
            description: 'Flip coin on attack: Heads +10 damage, Tails take 40 self-damage',
            triggers: ['onAttack'],
            canStack: false
        },
        flux: {
            icon: '⚡',
            description: 'Flip 2 coins on energy attachment: Both tails = blocked',
            triggers: ['onEnergyAttach'],
            canStack: false
        },
        lock: {
            icon: '🔒',
            description: 'Flip coin on item use: Tails = item returns to hand',
            triggers: ['onItemUse'],
            canStack: false
        }
    },
    
    // Apply a status condition to a creature
    applyStatus(creature, statusName) {
        if (!this.conditions[statusName]) {
            console.error(`Unknown status condition: ${statusName}`);
            return false;
        }
        
        // Status conditions only affect active creatures
        // Store the status on the creature object
        if (!creature.statusConditions) {
            creature.statusConditions = new Set();
        }
        
        creature.statusConditions.add(statusName);
        return true;
    },
    
    // Remove a status condition from a creature
    removeStatus(creature, statusName) {
        if (creature.statusConditions) {
            creature.statusConditions.delete(statusName);
        }
    },
    
    // Clear ALL status conditions from a creature
    clearAllStatus(creature) {
        if (creature.statusConditions) {
            creature.statusConditions.clear();
        }
    },
    
    // Check if creature has a specific status
    hasStatus(creature, statusName) {
        return creature.statusConditions && creature.statusConditions.has(statusName);
    },
    
    // Get all status conditions on a creature
    getAllStatus(creature) {
        return creature.statusConditions ? Array.from(creature.statusConditions) : [];
    },
    
    // Trigger status effects (called by game actions)
    triggerStatusEffects(creature, triggerType, context) {
        if (!creature.statusConditions) return null;
        
        for (const statusName of creature.statusConditions) {
            const condition = this.conditions[statusName];
            if (condition.triggers.includes(triggerType)) {
                const result = this.executeStatusEffect(statusName, creature, context);
                if (result) return result;
            }
        }
        return null;
    },
    
    // Execute the actual status effect logic
    executeStatusEffect(statusName, creature, context) {
        switch(statusName) {
            case 'hallucination':
                return this.handleHallucination(creature);
            case 'flux':
                return this.handleFlux(creature);
            case 'lock':
                return this.handleLock(creature, context);
            default:
                return null;
        }
    },
    
    handleHallucination(creature) {
        const flip = flipCoin();
        alert(`${creature.data.name} is hallucinating! Coin flip: ${flip}!`);
        if (flip === 'heads') {
            alert(`Hallucination: ${creature.data.name} will deal 10 extra damage!`);
            return { bonusDamage: 10 };
        } else {
            alert(`Hallucination: ${creature.data.name} will deal 40 damage to itself!`);
            return { selfDamage: 40 };
        }
    },
    
    handleFlux(creature) {
        alert(`${creature.data.name} is affected by Flux! Flipping 2 coins...`);
        const flip1 = flipCoin();
        const flip2 = flipCoin();
        alert(`Coin 1: ${flip1}, Coin 2: ${flip2}`);
        
        if (flip1 === 'tails' && flip2 === 'tails') {
            alert("Both coins were tails! Energy attachment blocked!");
            return { blocked: true };
        } else {
            alert("At least one coin was heads! Energy attachment allowed.");
            return { blocked: false };
        }
    },
    
    handleLock(creature, context) {
        alert(`${creature.data.name} is affected by Lock! Flipping coin...`);
        const flip = flipCoin();
        alert(`Coin flip: ${flip}`);
        
        if (flip === 'tails') {
            alert("Coin was tails! Item returns to hand!");
            return { itemReturned: true };
        } else {
            alert("Coin was heads! Item used normally.");
            return { itemReturned: false };
        }
    }
};
```

#### 1.2 Replace All Status Condition Logic

**BEFORE (scattered in moves):**
```javascript
case 'fluxWave':
    if (defender.damage < defender.data.hp) {
        defender.hasFlux = true;
        alert(`${defender.data.name} is now affected by Flux!`);
    }
    break;

case 'mindPulse':
    if (defender.damage < defender.data.hp) {
        defender.hallucinating = true;
        alert(`${defender.data.name} is now hallucinating!`);
    }
    break;

case 'forestFury':
    defender.hasLock = true;
    alert(`${defender.data.name} is now affected by Lock!`);
    break;
```

**AFTER (centralized):**
```javascript
case 'fluxWave':
    if (defender.damage < defender.data.hp) {
        StatusConditionManager.applyStatus(defender, 'flux');
        alert(`${defender.data.name} is now affected by Flux!`);
    }
    break;

case 'mindPulse':
    if (defender.damage < defender.data.hp) {
        StatusConditionManager.applyStatus(defender, 'hallucination');
        alert(`${defender.data.name} is now hallucinating!`);
    }
    break;

case 'forestFury':
    if (defender.damage < defender.data.hp) {
        StatusConditionManager.applyStatus(defender, 'lock');
        alert(`${defender.data.name} is now affected by Lock!`);
    }
    break;
```

#### 1.3 Update Game Actions to Use Status Manager

**Energy Attachment:**
```javascript
function handleEnergyButton() {
    if (gameState.player.energyAttachedThisTurn) return;
    
    const activeCreature = gameState.player.active;
    
    // Check for Flux using centralized system
    if (activeCreature && StatusConditionManager.hasStatus(activeCreature, 'flux')) {
        if (!gameState.player.fluxCheckDoneThisTurn) {
            const result = StatusConditionManager.triggerStatusEffects(
                activeCreature, 
                'onEnergyAttach'
            );
            
            gameState.player.fluxCheckDoneThisTurn = true;
            
            if (result && result.blocked) {
                gameState.player.energyAttachedThisTurn = true;
                updateActionButtons();
                return;
            }
            
            gameState.player.fluxCheckPassedThisTurn = true;
        } else if (!gameState.player.fluxCheckPassedThisTurn) {
            return; // Already failed Flux check this turn
        }
    }
    
    // Continue with normal energy attachment...
}
```

**Attack Hallucination:**
```javascript
function handleAttack(moveNumber) {
    const attacker = gameState.player.active;
    
    // Check for hallucination using centralized system
    if (StatusConditionManager.hasStatus(attacker, 'hallucination')) {
        const result = StatusConditionManager.triggerStatusEffects(
            attacker,
            'onAttack'
        );
        
        if (result.selfDamage) {
            attacker.hallucinationSelfDamage = result.selfDamage;
        }
        if (result.bonusDamage) {
            attacker.hallucinationBonusDamage = result.bonusDamage;
        }
    }
    
    // Continue with attack...
}
```

**Item Use:**
```javascript
function useItemCard(card, handIndex) {
    if (gameState.player.itemUsedThisTurn) return;
    
    const activeCreature = gameState.player.active;
    
    // Check for Lock using centralized system
    if (activeCreature && StatusConditionManager.hasStatus(activeCreature, 'lock')) {
        const result = StatusConditionManager.triggerStatusEffects(
            activeCreature,
            'onItemUse',
            { itemCard: card }
        );
        
        if (result && result.itemReturned) {
            // Item goes back to hand, don't consume it
            alert(`${card.data.name} returned to hand due to Lock!`);
            return;
        }
    }
    
    // Continue with normal item use...
}
```

#### 1.4 Automatic Status Clearing on Switch/KO

```javascript
// When creature switches OUT of active spot
function handleSwitch(player, outgoingCreature, incomingCreature) {
    // Clear ALL status conditions from creature leaving active
    StatusConditionManager.clearAllStatus(outgoingCreature);
    
    // Perform the switch
    // ...
}

// When creature is knocked out
function knockoutCreature(player) {
    const creature = gameState[player].active;
    
    // Clear all status conditions before knockout
    StatusConditionManager.clearAllStatus(creature);
    
    // Continue with knockout logic
    // ...
}

// When creature retreats
function performRetreat(player, benchIndex) {
    const activeCreature = gameState[player].active;
    
    // Clear status from creature going to bench
    StatusConditionManager.clearAllStatus(activeCreature);
    
    // Continue with retreat
    // ...
}
```

---

### Phase 2: Centralize Move Effect System

#### 2.1 Create Move Effect Registry

```javascript
const MoveEffectRegistry = {
    effects: {},
    
    // Register a move effect with its timing and behavior
    register(effectName, config) {
        this.effects[effectName] = {
            timing: config.timing, // 'preDamage', 'postDamage', 'postDamageIfSurvives'
            requiresTarget: config.requiresTarget || false,
            execute: config.execute
        };
    },
    
    // Execute a move effect at the appropriate time
    execute(effectName, timing, context) {
        const effect = this.effects[effectName];
        if (!effect) return;
        
        if (effect.timing === timing) {
            return effect.execute(context);
        }
    },
    
    // Check if an effect should run at this timing
    shouldRunAt(effectName, timing) {
        const effect = this.effects[effectName];
        return effect && effect.timing === timing;
    }
};

// Register all move effects upfront
MoveEffectRegistry.register('fluxWave', {
    timing: 'postDamageIfSurvives',
    requiresTarget: true,
    execute: (ctx) => {
        StatusConditionManager.applyStatus(ctx.defender, 'flux');
        alert(`${ctx.defender.data.name} is now affected by Flux!`);
    }
});

MoveEffectRegistry.register('mindPulse', {
    timing: 'postDamageIfSurvives',
    requiresTarget: true,
    execute: (ctx) => {
        StatusConditionManager.applyStatus(ctx.defender, 'hallucination');
        alert(`${ctx.defender.data.name} is now hallucinating!`);
    }
});

MoveEffectRegistry.register('forestFury', {
    timing: 'postDamageIfSurvives',
    requiresTarget: true,
    execute: (ctx) => {
        StatusConditionManager.applyStatus(ctx.defender, 'lock');
        alert(`${ctx.defender.data.name} is now affected by Lock!`);
    }
});

MoveEffectRegistry.register('chaosDice', {
    timing: 'postDamageIfSurvives',
    requiresTarget: true,
    execute: (ctx) => {
        const roll = rollDice();
        alert(`Chaos Dice: Rolled a ${roll}!`);
        
        if (roll <= 2) {
            StatusConditionManager.applyStatus(ctx.defender, 'hallucination');
            alert(`${ctx.defender.data.name} is now hallucinating!`);
        } else if (roll <= 4) {
            StatusConditionManager.applyStatus(ctx.defender, 'flux');
            alert(`${ctx.defender.data.name} is now affected by Flux!`);
        } else {
            StatusConditionManager.applyStatus(ctx.defender, 'lock');
            alert(`${ctx.defender.data.name} is now affected by Lock!`);
        }
    }
});

MoveEffectRegistry.register('recoil20', {
    timing: 'postDamage',
    requiresTarget: false,
    execute: (ctx) => {
        ctx.attacker.damage += 20;
        alert(`${ctx.attacker.data.name} took 20 recoil damage!`);
        renderGame();
    }
});
```

#### 2.2 Unified Attack Flow

```javascript
function executeAttack(attacker, defender, move, attackingPlayer) {
    // 1. Calculate base damage
    let damage = move.damage;
    
    // 2. Execute pre-damage effects
    if (move.effect) {
        const preDamageResult = MoveEffectRegistry.execute(move.effect, 'preDamage', {
            attacker, defender, move, attackingPlayer
        });
        if (preDamageResult && preDamageResult.damageModifier) {
            damage += preDamageResult.damageModifier;
        }
    }
    
    // 3. Apply damage
    defender.damage += damage;
    renderGame();
    
    // 4. Check if defender survived
    const defenderSurvived = defender.damage < defender.data.hp;
    
    // 5. Execute post-damage effects
    if (move.effect) {
        // Effects that always trigger
        MoveEffectRegistry.execute(move.effect, 'postDamage', {
            attacker, defender, move, attackingPlayer
        });
        
        // Effects that only trigger if defender survives
        if (defenderSurvived) {
            MoveEffectRegistry.execute(move.effect, 'postDamageIfSurvives', {
                attacker, defender, move, attackingPlayer
            });
        }
    }
    
    // 6. Handle knockouts
    checkKnockoutsAndContinue(attackingPlayer);
}
```

---

### Phase 3: Centralize Ability System

#### 3.1 Create Ability Manager

```javascript
const AbilityManager = {
    abilities: {},
    
    // Register an ability
    register(abilityName, config) {
        this.abilities[abilityName] = {
            type: config.type, // 'passive', 'triggered', 'activated'
            trigger: config.trigger, // When it activates
            duration: config.duration, // How long it lasts
            effect: config.effect
        };
    },
    
    // Activate an ability
    activate(creature, player, abilityName) {
        const ability = this.abilities[abilityName];
        if (!ability) return false;
        
        return ability.effect(creature, player);
    },
    
    // Clear abilities at end of turn
    clearTurnBasedAbilities(player) {
        const abilities = this.abilities;
        
        // Clear warrior mode
        if (gameState[player].warriorModeBonus) {
            gameState[player].warriorModeBonus = 0;
        }
        
        // Clear guardian mode
        if (gameState[player].guardianModeActive) {
            gameState[player].guardianModeActive = false;
        }
        
        // Clear other turn-based abilities
        // ...
    }
};

// Register abilities
AbilityManager.register('warriorMode', {
    type: 'activated',
    trigger: 'manual',
    duration: 'turn',
    effect: (creature, player) => {
        gameState[player].warriorModeBonus = 10;
        console.log(`[Ability] ${player} Warrior Mode activated: +10 damage`);
        alert(`${creature.data.name} used Warrior Mode! Attacks deal +10 damage this turn!`);
        return true;
    }
});

AbilityManager.register('guardianMode', {
    type: 'activated',
    trigger: 'manual',
    duration: 'turn',
    effect: (creature, player) => {
        gameState[player].guardianModeActive = true;
        console.log(`[Ability] ${player} Guardian Mode activated: -10 damage taken`);
        alert(`${creature.data.name} used Guardian Mode! All creatures take 10 less damage this turn!`);
        return true;
    }
});
```

---

---

## 7. Function Purposes: handleMoveEffect vs handleMoveEffectBeforeKnockout

### handleMoveEffect (Regular Move Effects)
**When it runs**: After base damage is applied, but ONLY if defender is still alive  
**Purpose**: Effects that target or affect the DEFENDER

**Examples:**
- Status conditions on defender: `forestFury`, `chaosDice`, `caffeineAddiction`, `mindPulse`, `fluxWave`, `psychicProwl`, `spectralSlice`
- Defender restrictions: `cantRetreat` (Ethereal Snare)
- Any effect that requires defender to still exist

**Pattern Rule**: ALWAYS check `if (defender.damage >= defender.data.hp)` before applying effects to defender

---

### handleMoveEffectBeforeKnockout (Attacker-Side Effects)
**When it runs**: After base damage is applied, EVEN if defender is knocked out  
**Purpose**: Effects that ONLY affect the ATTACKER or OTHER creatures (NOT the defender)

**Legitimate uses:**
1. **Recoil moves** - `recoil20`, `recoil40` (attacker damages itself)
2. **Energy effects** - `discard2Energy`, `creamyConfection`, `energySnatch` (energy manipulation)
3. **Self-healing** - `healingSap`, `chillRecharge` (attacker heals itself)
4. **Attacker consequences** - `riskyRecoil`, `overdriveSmash`, `tempestHold` (attacker suffers drawbacks)
5. **Bench effects** - `coffeeHeal`, `beanBlast` (heal attacker's bench)
6. **Draw effects** - `skyDraw`, `scavengeStrike` (attacker draws cards)
7. **Free retreat** - `heavenlyRetreat` (attacker can retreat)

**Why this function exists**: Some moves have costs/consequences for the attacker that should happen even if the attack kills the defender. For example, a recoil move should still damage the attacker even if it KO's the opponent.

**Pattern Rule**: If an effect needs to apply status to DEFENDER, it does NOT belong here!

**Fixed bugs (removed "incoming" logic from this function):**
- ❌ `forestFury` - Was trying to apply Lock to "incoming" creature → Now shows "defender was KO'd" message
- ❌ `chaosDice` - Was trying to apply status to "incoming" creature → Now shows "defender was KO'd" message
- ❌ `caffeineAddiction` - Was trying to apply Lock to "incoming" creature → Now shows "defender was KO'd" message
- ❌ `mindPulse` - Was trying to apply Hallucination to "incoming" creature → Now shows "defender was KO'd" message
- ❌ `fluxWave` - Was trying to apply Flux to "incoming" creature → Now shows "defender was KO'd" message
- ❌ `psychicProwl` - Was trying to apply Flux/Lock to "incoming" creature → Now shows "defender was KO'd" message

These now correctly skip status application and show "defender was knocked out before [status] could be applied" message.

---

### Phase 4: Implementation Order

#### Step 1: Add Status Condition Manager (2-3 hours)
1. Create `StatusConditionManager` object
2. Add to script.js after flipCoin/rollDice functions
3. Don't change existing code yet - just add the manager

#### Step 2: Update Status Checks (3-4 hours)
1. Replace all `creature.hasFlux` checks with `StatusConditionManager.hasStatus(creature, 'flux')`
2. Replace all `creature.hallucinating` checks with `StatusConditionManager.hasStatus(creature, 'hallucination')`
3. Replace all `creature.hasLock` checks with `StatusConditionManager.hasStatus(creature, 'lock')`
4. Test energy attachment, attacks, item use

#### Step 3: Update Status Application (2-3 hours)
1. Replace all status condition applications in move effects
2. Add survival checks (`defender.damage < defender.data.hp`) to ALL status-applying moves
3. Test all moves that apply status conditions

#### Step 4: Add Auto-Clearing (1-2 hours)
1. Add `StatusConditionManager.clearAllStatus()` to:
   - `knockoutCreature()`
   - `performRetreat()`
   - `selectNewActiveCreature()` (when switching in from bench)
2. Test that status clears properly

#### Step 5: Create Move Effect Registry (Optional - 4-6 hours)
1. Create `MoveEffectRegistry`
2. Register 5-10 common effects as proof of concept
3. Test that registered effects work
4. Gradually migrate remaining effects

#### Step 6: Create Ability Manager (Optional - 3-4 hours)
1. Create `AbilityManager`
2. Register common abilities (Warrior Mode, Guardian Mode)
3. Replace ability activation calls
4. Add centralized turn-end clearing

---

### Phase 5: Testing Checklist

After each phase:

- [ ] **Status Conditions**
  - [ ] Flux blocks energy attachment (2 tails)
  - [ ] Flux allows energy after passing check
  - [ ] Hallucination triggers on attack
  - [ ] Lock affects item use
  - [ ] Status clears when creature leaves active
  - [ ] Status clears when creature is KO'd
  - [ ] Status doesn't affect incoming creature

- [ ] **Move Effects**
  - [ ] Status-applying moves check survival
  - [ ] Recoil moves damage attacker
  - [ ] Multi-target moves hit all targets
  - [ ] Effects trigger at correct timing

- [ ] **Abilities**
  - [ ] Warrior Mode adds correct damage
  - [ ] Guardian Mode reduces damage
  - [ ] Abilities clear at turn end
  - [ ] Abilities don't stack incorrectly

---

## Benefits of Refactoring

### 1. **Centralized Status Logic**
- ✅ Status conditions ALWAYS only affect active creatures
- ✅ One place to add survival checks
- ✅ Automatic clearing on switch/KO
- ✅ Easy to add new status conditions

### 2. **Move Effect Consistency**
- ✅ Clear timing rules (pre-damage vs post-damage vs if-survives)
- ✅ No more status leaking to incoming creatures
- ✅ Easy to see all effects in one place
- ✅ Consistent behavior across all moves

### 3. **Ability Management**
- ✅ Centralized turn-end clearing
- ✅ No more hardcoded values scattered around
- ✅ Debug logging built-in
- ✅ Easy to track ability state

### 4. **Maintainability**
- ✅ Adding new status condition: 1 place to edit
- ✅ Fixing status bug: 1 place to fix
- ✅ Testing status: 1 function to test
- ✅ Understanding code: read registry, not search entire file

---

## Migration Strategy

### Conservative Approach (Recommended)
1. Create new systems alongside old code
2. Migrate one category at a time (status first, then moves, then abilities)
3. Keep old code until new code is tested
4. Remove old code once confident

### Aggressive Approach (Faster but risky)
1. Create all new systems at once
2. Find-and-replace all old patterns
3. Test everything thoroughly
4. Fix bugs as they appear

**Recommendation:** Use Conservative Approach. Status conditions are the highest priority bug source.

---

## Questions to Consider

1. **Should we keep backward compatibility?**
   - Do saved games need to work after refactoring?
   - Answer: No - localStorage data can be cleared for major refactor

2. **Should we refactor all at once or incrementally?**
   - Answer: Incrementally - do status conditions first (biggest pain point)

3. **How much testing is needed?**
   - Answer: Test each phase thoroughly before moving to next
   - Focus on: Status application, status clearing, status checks

4. **Can we auto-migrate old creature data?**
   - Answer: Yes - add migration function that converts old status properties to new Set-based system

---

## Conclusion

The current code has grown organically and now has architectural issues. This refactoring:

1. **Solves the immediate problem**: Status conditions leaking to incoming creatures
2. **Prevents future bugs**: Centralized logic means fewer places for bugs to hide
3. **Makes adding features easier**: New status conditions, moves, abilities are simple to add
4. **Improves code readability**: Clear separation of concerns

**Estimated Total Time:** 10-15 hours for full refactoring, or 5-7 hours for just status conditions

**Priority:** Start with Phase 1 (Status Conditions) - it solves 80% of the current bugs.
