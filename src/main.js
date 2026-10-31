// ============================================================================
// BOOTSTRAP
//
// Load order matters and is fixed in index.html: data, then core, then UI.
// Nothing here runs game logic; it wires the pieces together and opens the
// deck selection screen.
// ============================================================================

async function bootstrap() {
    // 1. Index the card pool and resolve evolution links.
    CardIndex.build();

    // 2. UI surfaces.
    Log.init();
    Prompt.init();
    CardZoom.init();
    Screens.init();
    bindInteractions();

    // 3. Content validation. Errors mean a card references something that isn't
    //    implemented, which is exactly the failure this project kept hitting.
    const params = new URLSearchParams(window.location.search);
    Validate.run();
    if (params.get('validate') === 'images') {
        Validate.checkImages();
    }

    // 4. The player's save. If one should exist but could not be read, stop at
    //    the recovery screen: starting a fresh account would autosave over it.
    //    (The old ?deck= shortcut is gone: it skipped the collection rules.
    //    QA mode on the Play tab replaces it.)
    const gate = document.getElementById('boot-gate');
    let result;
    try {
        result = await Profile.init();
    } catch (err) {
        console.error(err);
        gate.innerHTML = '';
        gate.appendChild(h('div', { class: 'gate-panel' },
            h('h1', { text: 'The game could not start' }),
            h('p', { class: 'gate-warn', text: String(err && err.message || err) })));
        return;
    }
    if (result === 'gate') {
        Hub.showRecoveryGate();
        return;
    }
    gate.classList.remove('show');
    gate.innerHTML = '';

    // 5. Decks, then the hub.
    DeckLibrary.load();
    Hub.init();
    Screens.showDeckSelection();
    Render.all();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

// ---------------------------------------------------------------------------
// Test surface, used by test.html. Keeping it explicit means the harness does
// not have to reach into internals.
// ---------------------------------------------------------------------------

const TCG = {
    // state
    gameState,
    turnTracker,
    resetGameState,

    // data
    cardSets,
    cardDatabase,
    CardIndex,
    DeckLibrary,
    getCardData,
    validateDeck,

    // registries
    EffectRegistry,
    AbilityRegistry,
    ItemRegistry,
    DAMAGE_MODIFIERS,
    STATUS_CONDITIONS,

    // engine
    Rng,
    Timing,
    Status,
    startGame,
    endTurn,
    resolveAttack,
    resolveKnockouts,
    canAttackWith,
    usableMoves,
    buildDecks,
    drawOpeningHands,
    aiSetup,
    runAiTurn,

    // tooling
    Validate,
    Log,

    // collection layer
    Profile,
    Persist,
    Missions,
    Collection
};

window.TCG = TCG;
