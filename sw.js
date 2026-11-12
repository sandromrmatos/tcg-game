/* ============================================================
   sw.js — makes the game installable and lets it start offline

   With a manifest and this worker, Chrome on a phone offers "Add to
   Home screen" / "Install app", and the installed game opens in its own
   window without the browser bar, like Search and Go and Pinball Creatures.

   Strategy:
     code and pages (html, js, css, manifest)  network first, cache fallback,
       so a new version is picked up on the next open without bumping
       anything, and the last version still starts offline.
     images and audio                          stale while revalidate: the
       cached copy shows straight away, and the worker checks the server in
       the background and stores a newer file if there is one, so redrawn
       card art appears on the next open without bumping anything. The
       browser's HTTP cache (10 minutes on GitHub Pages) keeps those checks
       cheap. The 170 card images (~34 MB) are NOT precached: each is cached
       the first time it is seen, so installing stays quick and light.

   Bump CACHE_VERSION only to throw every cached file away. v2 did that
   once, because v1 kept images forever and never noticed redrawn cards.
   ============================================================ */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `ea-tcg-${CACHE_VERSION}`;

/** The shell: without these the game does not start. */
const CORE = [
    './',
    'index.html',
    'style.css',
    'hub.css',
    'manifest.webmanifest',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable-512.png',
    'icons/apple-touch-icon.png',
    'src/data/sets.js',
    'src/data/cards.js',
    'src/data/card-text.js',
    'src/data/preset-decks.js',
    'src/data/raid-bosses.js',
    'src/core/util.js',
    'src/core/cards-index.js',
    'src/core/timing.js',
    'src/core/state.js',
    'src/data/decks.js',
    'src/data/collection-data.js',
    'src/meta/codec.js',
    'src/meta/persist.js',
    'src/meta/achievements.js',
    'src/meta/profile.js',
    'src/meta/missions.js',
    'src/meta/raids.js',
    'src/meta/daily.js',
    'src/ui/log.js',
    'src/ui/prompt.js',
    'src/core/status.js',
    'src/core/heal.js',
    'src/core/damage.js',
    'src/core/combat.js',
    'src/core/effects.js',
    'src/core/abilities.js',
    'src/core/items.js',
    'src/core/actions.js',
    'src/core/knockout.js',
    'src/core/turn.js',
    'src/ai/ai.js',
    'src/ui/render.js',
    'src/ui/interaction.js',
    'src/ui/deckbuilder.js',
    'src/ui/screens.js',
    'src/ui/hub.js',
    'src/ui/arcade.js',
    'src/ui/pvp.js',
    'src/validate.js',
    'src/main.js'
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // `reload` so the install never adopts a stale HTTP-cached copy.
        await cache.addAll(CORE.map(url => new Request(url, { cache: 'reload' })));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) {
            if (key.startsWith('ea-tcg-') && key !== CACHE_NAME) await caches.delete(key);
        }
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    // The test pages always run against the live files.
    if (/\/test(-ui)?\.html$/.test(url.pathname)) return;

    const isAsset = /\.(png|jpe?g|webp|gif|svg|mp3|ogg|wav)$/i.test(url.pathname);
    event.respondWith(isAsset ? staleWhileRevalidate(req, event) : networkFirst(req));
});

async function networkFirst(req) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const res = await fetch(req);
        if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
        return res;
    } catch {
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') {
            const shell = await cache.match('index.html');
            if (shell) return shell;
        }
        return offline();
    }
}

/**
 * Serves the cached image at once and refreshes it in the background, so an
 * updated file on the server replaces the cached one for the next time.
 */
async function staleWhileRevalidate(req, event) {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(req, { ignoreSearch: true });
    const refresh = fetch(req).then(res => {
        if (res.ok && res.type === 'basic') return cache.put(req, res.clone()).then(() => res);
        return res;
    });
    if (hit) {
        // Keep the worker alive until the background refresh is stored.
        event.waitUntil(refresh.catch(() => {}));
        return hit;
    }
    try {
        return await refresh;
    } catch {
        return offline();
    }
}

function offline() {
    return new Response('Offline and not cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}
