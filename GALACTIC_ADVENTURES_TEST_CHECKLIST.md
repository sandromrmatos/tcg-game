# Galactic Adventures Expansion - Test Checklist

## 1. Status Conditions Testing

### Flux (⚡) Testing
- [ ] Creature can be inflicted with Flux status
- [ ] Flux indicator (⚡) appears on creature card
- [ ] When attaching energy to Flux creature, coin flip triggers
- [ ] On tails, energy attachment is blocked
- [ ] On heads, energy attachment proceeds normally
- [ ] Flux is cured when creature retreats to bench
- [ ] Remedy card cures Flux

### Lock (🔒) Testing
- [ ] Creature can be inflicted with Lock status
- [ ] Lock indicator (🔒) appears on creature card
- [ ] When using item card with Lock active, coin flip triggers
- [ ] On tails, item returns to hand and cannot be used
- [ ] On heads, item is used normally
- [ ] Lock is cured when creature retreats to bench
- [ ] Remedy card cures Lock

## 2. Card Database Testing
- [ ] All 86 Galactic Adventures cards load correctly
- [ ] Card images display properly (76 creatures + 10 items)
- [ ] Card IDs follow format: "Galactic Adventures_###.png"
- [ ] Evolution chains work (Stage 1 → Stage 2 → Stage 3)

## 3. Move Effects Testing

### Status Infliction Moves
- [ ] Mind Pulse - inflicts Flux on opponent
- [ ] Flux Wave - inflicts Flux on opponent
- [ ] Forest Fury - inflicts Hallucination on opponent
- [ ] Psychic Prowl - inflicts Lock on opponent

### Instant KO Move
- [ ] Triple Threat Flip - flip 3 coins, if all heads, instant KO

### Shield/Protection Moves
- [ ] Invincible Gambit - grants shield for specified turns
- [ ] Mind Ripple - grants 20 damage reduction shield next turn

### Damage Modifier Moves
- [ ] Shadow Wrap - reduces next attack damage
- [ ] Galactic Meteor - extra damage based on energy
- [ ] Verdant Struggle - more damage if damaged
- [ ] Fury Spin - damage increases with energy
- [ ] Enraged Charge - bonus damage when damaged
- [ ] Overdrive Smash - bonus damage for each energy
- [ ] Sprout Boost - permanent attack increase

### Healing Moves
- [ ] Coffee Heal - heals self
- [ ] Bean Blast - damage and heal
- [ ] Berry Burst - heals self
- [ ] Laughing Leaves - heals self

### Special Mechanics
- [ ] Scavenge Strike - bonus damage if opponent has items in discard
- [ ] Gulp Swap - switches attacker and defender
- [ ] Alphabet Assault - damage varies by creature name
- [ ] Inferno Constrict - damage over time effect
- [ ] Tempest Hold - restricts opponent's retreat

## 4. Creature Abilities Testing

### Energy/Healing Abilities
- [ ] Extra Charge - attach energy to Neutral creatures
- [ ] Healing Retreat - heal when retreating
- [ ] Absorb Energy - heal based on energy count
- [ ] Energized Healing - heal when energy attached

### Form Change Abilities
- [ ] Guardian Mode - defensive stance for Meerkool
- [ ] Warrior Mode - offensive stance for Meerkool

### Protection Abilities
- [ ] Mirage Shield - blocks first item card used against it
- [ ] Metallic Protection - immune to Mechanic attacks
- [ ] Caprine Guard - reduces Celestial damage
- [ ] Elemental Fortitude - creates type-specific shields
- [ ] Hydration - prevents all status conditions

### Attack Abilities
- [ ] Thunder Rush - doubles next attack damage
- [ ] Retaliation Stone - counter-attack when damaged
- [ ] Gnawing Precision - direct damage to opponent's active

### Status Reflection
- [ ] Aqua Mirror - reflects status conditions back to attacker

## 5. Item Cards Testing

### Energy Antenna
- [ ] Attaches 1 energy to a Mechanic creature
- [ ] Only works if Mechanic creatures are in play

### Revive Crystal
- [ ] Retrieves creature card from discard pile
- [ ] Adds retrieved card to hand
- [ ] Only shows creature cards (not items)

### Shield Barrier
- [ ] Reduces damage to active creature by 20 next turn
- [ ] Shield is consumed after damage reduction

### Aura Crystal
- [ ] Heals all damaged creatures by 10 HP
- [ ] Works on both active and bench creatures

### Healing Crystal
- [ ] Heals a Celestial creature by 40 HP
- [ ] Only works on damaged Celestial creatures

### Disruptor
- [ ] Opponent shuffles hand into deck
- [ ] Opponent draws same number of cards minus 1

### Amulet
- [ ] Neutral creatures deal +20 damage
- [ ] Effect lasts for 2 turns
- [ ] Bonus applies to all Neutral creatures

### Gale Shield
- [ ] Wind creatures take 30 less damage next turn
- [ ] Shield is consumed after damage reduction
- [ ] Only protects Wind type creatures

### Mystic Scroll
- [ ] Searches deck for Mystic Stage 1 creature
- [ ] Adds found creature to hand
- [ ] Forces turn to end immediately

## 6. Deck Builder UI Testing

### Set Selection
- [ ] Deck builder opens showing Elemental Awakening by default
- [ ] Set selection header displays with arrows (◀ ▶)
- [ ] Left arrow switches between sets
- [ ] Right arrow switches between sets
- [ ] Set name displays correctly in header
- [ ] Cards filter correctly by set

### Card Display
- [ ] Elemental Awakening cards show when that set is selected
- [ ] Galactic Adventures cards show when that set is selected
- [ ] Cards are sorted correctly by ID number
- [ ] Card images load properly for both sets

### Deck Building
- [ ] Can add cards from Elemental Awakening
- [ ] Can add cards from Galactic Adventures
- [ ] Can mix cards from both sets in same deck
- [ ] Type validation still works (no mixing primary types except with Neutral/Items)
- [ ] Max 2 copies per card rule enforced
- [ ] Must have exactly 20 cards
- [ ] Must have at least 1 Stage 1 creature

## 7. Integration Testing

### AI Behavior
- [ ] AI can use Galactic Adventures cards
- [ ] AI responds appropriately to new status conditions
- [ ] AI can use new item cards when appropriate

### Game Flow
- [ ] Turn counter decrements Amulet duration
- [ ] Turn counter decrements Invincible Gambit shields
- [ ] Status conditions persist across turns
- [ ] Status conditions clear on retreat
- [ ] Item effects apply at correct timing

### Visual Feedback
- [ ] Status indicators stack correctly (Hallucination, Flux, Lock)
- [ ] Damage numbers display correctly
- [ ] Alerts explain what's happening clearly
- [ ] Animations play smoothly

## 8. Edge Cases

- [ ] Using items with no valid targets shows appropriate message
- [ ] Flux coin flip with no energy to attach
- [ ] Lock coin flip with multiple items
- [ ] Evolution chains work across sets
- [ ] Multiple status conditions on same creature
- [ ] Deck with only Neutral and Item cards (no primary type)
- [ ] Creature with multiple abilities
- [ ] Move with multiple effects

## Testing Notes

### How to Test
1. Open `index.html` in a web browser
2. Navigate to deck builder
3. Test set navigation with arrow buttons
4. Create test decks with cards from both sets
5. Play games testing specific moves/abilities
6. Check console for any JavaScript errors

### Known Limitations
- Item cards with target selection use automatic selection (first eligible target)
- Some abilities may need specific game states to trigger
- AI behavior is basic and may not use optimal strategy

### Files Modified
- `c:\Users\sandr\Downloads\Games\TCG Game\script.js` - All game logic
- `c:\Users\sandr\Downloads\Games\TCG Game\style.css` - Status indicators

### Card Images
All card images should be in: `c:\Users\sandr\Downloads\Games\TCG Game\cards\`
Format: `Galactic Adventures_###.png` (e.g., `Galactic Adventures_001.png`)
