// ============================================================================
// TEMPORAL RIFT MINI-GAMES
//
// Creature Sorting, Puzzle and Tetris, the hard modes of the arcade versions,
// as pages of the Mini-games tab. They open with the Temporal Rift set;
// rules and rewards live in Profile (startArcade / finishArcade), this file
// is only the boards.
//
// Sorting and Puzzle rebuild their board from the saved seed, so coming back
// to a game in progress shows the same board with the clock still running.
// ============================================================================

/** A small seeded generator (mulberry32), so a saved seed rebuilds the same board. */
function arcadeRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function arcadeClock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const SORTING_SHELVES = 14;     // hard mode: 13 creatures, 3 of each, one shelf spare
const SORTING_CREATURES = 13;
const SORTING_IMAGES = 18;
const PUZZLE_SIZE = 7;          // hard mode: 7 × 7 pieces

Object.assign(Hub, {
    arcade: { timer: null, sorting: null, puzzle: null, tetris: null, result: null },

    /** Rules and rewards for the game pages and the Mini-games list. */
    arcadeInfo: {
        sorting: { icon: '🗄️', name: 'Creature Sorting', page: 'sorting',
            about: 'Sort 13 creatures onto 14 shelves, three of a kind each. The faster you finish, the bigger the reward.',
            rules: 'Tap a creature, then an empty slot to move it. Finish in under 0:40 for 5 credits and a gem, 1:00 for 3 credits and maybe a gem, 1:15 for 2 credits, or slower for 1.' },
        puzzle: { icon: '🧩', name: 'Puzzle', page: 'puzzle',
            about: 'Rebuild a full-art card from 49 pieces. The faster you finish, the bigger the reward.',
            rules: 'Tap a piece, then the spot where it belongs. Finish in 3:00 for 5 credits and a gem, 5:00 for 3 credits and maybe a gem, 8:00 for 2 credits, or slower for 1.' },
        tetris: { icon: '🧱', name: 'Tetris', page: 'tetris',
            about: 'Hard mode: clear lines as the blocks speed up. 20 lines or more guarantees a gem.',
            rules: 'Each cleared line is 1 point. 20+ points: 5 credits and a gem. 10+: 3 credits and maybe a gem. 5+: 2 credits. Less: 1 credit.' }
    },

    arcadeListEntries() {
        return ARCADE_GAMES.map(key => {
            const info = this.arcadeInfo[key];
            return { id: info.page, key, icon: info.icon, name: info.name, about: info.about, status: Profile.arcadeStatus(key) };
        });
    },

    stopArcadeTimer() {
        if (this.arcade.timer) clearInterval(this.arcade.timer);
        this.arcade.timer = null;
    },

    /** The top of each game page: back link, title, and why it can't be played. */
    arcadeHeader(host, key, st) {
        const info = this.arcadeInfo[key];
        host.appendChild(this.backToMinigames());
        host.appendChild(this.pageTitle(`${info.icon} ${info.name}`, info.rules +
            ' Sundays: at least 1 gem, and 2 for the best result.'));
        if (st.locked) {
            host.appendChild(this.notice('🔒 Unlock after completing 90% of Galactic Adventures.', 'locked'));
            return false;
        }
        const r = this.arcade.result;
        if (r && r.key === key) {
            host.appendChild(h('div', { class: 'result-banner win' },
                h('p', { text: key === 'tetris' ? `🏁 Game over: ${r.value} point${r.value === 1 ? '' : 's'}` : `🎉 Done in ${arcadeClock(r.value * 1000)}!` }),
                h('p', { text: `💰 You won ${fmtWon(r.creditsWon, r.gemsWon)}!` })));
        }
        if (st.best !== null && st.best !== undefined && st.best !== 0) {
            host.appendChild(h('p', { class: 'page-sub', text: key === 'tetris' ? `Best score: ${st.best}` : `Best time: ${arcadeClock(st.best * 1000)}` }));
        }
        if (!st.active && !st.canPlay) {
            host.appendChild(this.notice(
                st.busyElsewhere ? '⏳ You have another mini-game in progress. Finish it first.'
                    : st.alreadyToday ? '🕐 You already played today. Come back tomorrow!'
                    : `⚠️ You have ${st.credits}/${MAX_CREDITS} credits. You need ${MINIGAME_MAX_CREDITS} or fewer to play, since you could win up to 5 more (max is ${MAX_CREDITS}).`,
                'warn'));
            return false;
        }
        return true;
    },

    arcadeStartButton(key, onStart) {
        return h('button', {
            class: 'btn btn-primary btn-lg big-btn', type: 'button', text: 'Start game',
            on: { click: () => {
                const res = Profile.startArcade(key);
                if (res.error) { this.toast(res.error, 'warn'); return; }
                this.arcade.result = null;
                onStart();
            } }
        });
    },

    finishArcadeGame(key, result) {
        this.stopArcadeTimer();
        const res = Profile.finishArcade(key, result);
        this.setNavLocked(false);
        if (res.error) { this.toast(res.error, 'warn'); return; }
        this.arcade.result = Object.assign({ key }, res);
        this.arcade[key] = null;
        this.renderPage();
    },

    // -----------------------------------------------------------------------
    // Creature Sorting
    // -----------------------------------------------------------------------

    /** The shuffled shelves for a seed: solved shelves scrambled by legal moves, so always solvable. */
    sortingBoard(seed) {
        const rand = arcadeRng(seed);
        const pool = Array.from({ length: SORTING_IMAGES }, (_, i) => i + 1);
        const chosen = [];
        for (let i = 0; i < SORTING_CREATURES; i++) chosen.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
        const shelves = chosen.map(n => [n, n, n]);
        shelves.push([null, null, null]);
        for (let i = 0; i < Math.max(50, SORTING_SHELVES * 10); i++) {
            const full = [], empty = [];
            shelves.forEach((shelf, s) => shelf.forEach((v, k) => (v === null ? empty : full).push([s, k])));
            const [fs, fk] = full[Math.floor(rand() * full.length)];
            const [es, ek] = empty[Math.floor(rand() * empty.length)];
            shelves[es][ek] = shelves[fs][fk];
            shelves[fs][fk] = null;
        }
        return shelves;
    },

    sortingSolved(shelves) {
        let empty = 0;
        for (const shelf of shelves) {
            const items = shelf.filter(v => v !== null);
            if (items.length === 0) empty++;
            else if (items.length !== 3 || items[0] !== items[1] || items[1] !== items[2]) return false;
        }
        return empty === 1;
    },

    renderSorting() {
        const host = this.pageHost('sorting');
        const st = Profile.arcadeStatus('sorting');
        this.stopArcadeTimer();
        this.setNavLocked(st.active);
        if (!this.arcadeHeader(host, 'sorting', st)) return;

        if (!st.active) {
            host.appendChild(this.arcadeStartButton('sorting', () => this.renderSorting()));
            return;
        }
        const g = st.game;
        if (!this.arcade.sorting || this.arcade.sorting.seed !== g.seed) {
            this.arcade.sorting = { seed: g.seed, shelves: this.sortingBoard(g.seed), selected: null };
        }
        const game = this.arcade.sorting;
        const clock = h('div', { class: 'arcade-clock', text: arcadeClock(Date.now() - g.startedAt) });
        host.appendChild(clock);
        this.arcade.timer = setInterval(() => { clock.textContent = arcadeClock(Date.now() - g.startedAt); }, 250);

        const wrap = h('div', { class: 'sorting-shelves' });
        game.shelves.forEach((shelf, s) => {
            const row = h('div', { class: 'sorting-shelf' });
            shelf.forEach((item, k) => {
                const selected = game.selected && game.selected[0] === s && game.selected[1] === k;
                const slot = h('button', {
                    class: `sorting-slot${item === null ? ' empty' : ''}${selected ? ' selected' : ''}`, type: 'button',
                    'aria-label': item === null ? 'Empty slot' : `Creature ${item}`,
                    on: { click: () => this.sortingTap(s, k) }
                });
                if (item !== null) slot.appendChild(h('img', { src: `assets/sorting/${String(item).padStart(2, '0')}.png`, alt: '' }));
                row.appendChild(slot);
            });
            wrap.appendChild(row);
        });
        host.appendChild(wrap);
    },

    sortingTap(s, k) {
        const game = this.arcade.sorting;
        if (!game) return;
        const item = game.shelves[s][k];
        if (!game.selected) {
            if (item !== null) game.selected = [s, k];
        } else if (game.selected[0] === s && game.selected[1] === k) {
            game.selected = null;
        } else if (item === null) {
            const [fs, fk] = game.selected;
            game.shelves[s][k] = game.shelves[fs][fk];
            game.shelves[fs][fk] = null;
            game.selected = null;
            if (this.sortingSolved(game.shelves)) {
                this.finishArcadeGame('sorting', {});
                return;
            }
        } else {
            game.selected = [s, k];
        }
        this.renderSorting();
    },

    // -----------------------------------------------------------------------
    // Puzzle
    // -----------------------------------------------------------------------

    renderPuzzle() {
        const host = this.pageHost('puzzle');
        const st = Profile.arcadeStatus('puzzle');
        this.stopArcadeTimer();
        this.setNavLocked(st.active);
        if (!this.arcadeHeader(host, 'puzzle', st)) return;

        if (!st.active) {
            host.appendChild(this.arcadeStartButton('puzzle', () => this.renderPuzzle()));
            return;
        }
        const g = st.game;
        if (!this.arcade.puzzle || this.arcade.puzzle.seed !== g.seed) {
            const rand = arcadeRng(g.seed);
            const images = RAID_BOSSES.map(b => fullArtImage(b.cardId));
            const order = Array.from({ length: PUZZLE_SIZE * PUZZLE_SIZE }, (_, i) => i);
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(rand() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]];
            }
            this.arcade.puzzle = { seed: g.seed, image: images[Math.floor(rand() * images.length)], order, placed: new Set(), selected: null };
        }
        const game = this.arcade.puzzle;
        const clock = h('div', { class: 'arcade-clock', text: arcadeClock(Date.now() - g.startedAt) });
        host.appendChild(clock);
        this.arcade.timer = setInterval(() => { clock.textContent = arcadeClock(Date.now() - g.startedAt); }, 250);

        // Tiles keep the card's 2:3 shape; the board fits the page width.
        const width = Math.min(336, Math.max(240, (host.clientWidth || 340) - 24));
        const tw = Math.floor(width / PUZZLE_SIZE), th = Math.floor(tw * 1.5);
        // The pieces tray is drawn smaller, so the board and the pieces fit on a phone.
        const tileStyle = (index, scale = 1) => {
            const w = Math.floor(tw * scale), hgt = Math.floor(th * scale);
            return {
                width: `${w}px`, height: `${hgt}px`,
                backgroundImage: `url("${encodeURI(game.image)}")`,
                backgroundSize: `${w * PUZZLE_SIZE}px ${hgt * PUZZLE_SIZE}px`,
                backgroundPosition: `-${(index % PUZZLE_SIZE) * w}px -${Math.floor(index / PUZZLE_SIZE) * hgt}px`
            };
        };
        const TRAY = 0.7;
        const gridStyle = { gridTemplateColumns: `repeat(${PUZZLE_SIZE}, ${tw}px)` };
        const trayStyle = { gridTemplateColumns: `repeat(${PUZZLE_SIZE}, ${Math.floor(tw * TRAY)}px)` };

        const preview = h('div', { class: 'puzzle-preview', style: { backgroundImage: `url("${encodeURI(game.image)}")` }, title: 'The finished picture' });
        const board = h('div', { class: 'puzzle-grid puzzle-board', style: gridStyle });
        for (let i = 0; i < PUZZLE_SIZE * PUZZLE_SIZE; i++) {
            const placed = game.placed.has(i);
            board.appendChild(h('button', {
                class: `puzzle-cell${placed ? ' placed' : ''}`, type: 'button', 'aria-label': `Spot ${i + 1}`,
                style: placed ? tileStyle(i) : { width: `${tw}px`, height: `${th}px` },
                on: { click: () => this.puzzleTapCell(i) }
            }));
        }
        const tray = h('div', { class: 'puzzle-grid puzzle-tray', style: trayStyle });
        for (const index of game.order) {
            const used = game.placed.has(index);
            tray.appendChild(h('button', {
                class: `puzzle-piece${used ? ' used' : ''}${game.selected === index ? ' selected' : ''}`, type: 'button',
                'aria-label': 'Puzzle piece', disabled: used,
                style: used ? { width: `${Math.floor(tw * TRAY)}px`, height: `${Math.floor(th * TRAY)}px` } : tileStyle(index, TRAY),
                on: { click: () => this.puzzleTapPiece(index) }
            }));
        }
        host.appendChild(h('div', { class: 'puzzle-layout' }, preview, board,
            h('p', { class: 'page-sub', text: `${game.placed.size} of ${PUZZLE_SIZE * PUZZLE_SIZE} pieces placed. Pieces:` }), tray));
    },

    puzzleTapPiece(index) {
        const game = this.arcade.puzzle;
        if (!game || game.placed.has(index)) return;
        game.selected = game.selected === index ? null : index;
        this.renderPuzzle();
    },

    puzzleTapCell(cell) {
        const game = this.arcade.puzzle;
        if (!game || game.selected === null || game.placed.has(cell)) return;
        // Only the right piece fits; a wrong spot just drops the selection.
        if (game.selected === cell) game.placed.add(cell);
        game.selected = null;
        if (game.placed.size === PUZZLE_SIZE * PUZZLE_SIZE) {
            this.finishArcadeGame('puzzle', {});
            return;
        }
        this.renderPuzzle();
    },

    // -----------------------------------------------------------------------
    // Tetris (hard: starts at 500 ms a step, 20 ms faster per line, down to 100)
    // -----------------------------------------------------------------------

    renderTetris() {
        const host = this.pageHost('tetris');
        const st = Profile.arcadeStatus('tetris');
        this.stopArcadeTimer();
        // A game saved as running but not running here was left: it ends on
        // the score it had reached.
        if (st.active && !this.arcade.tetris) {
            this.finishArcadeGame('tetris', { score: st.game.score });
            return;
        }
        this.setNavLocked(st.active);
        if (!this.arcadeHeader(host, 'tetris', st) && !st.active) return;

        if (!st.active) {
            host.appendChild(this.arcadeStartButton('tetris', () => {
                this.arcade.tetris = this.newTetris();
                this.renderTetris();
            }));
            return;
        }
        const t = this.arcade.tetris;
        const score = h('div', { class: 'arcade-clock', text: `Score: ${t.score}` });
        const canvas = h('canvas', { class: 'tetris-canvas', width: 200, height: 400 });
        const next = h('canvas', { class: 'tetris-next', width: 80, height: 80 });
        const btn = (label, fn, cls = '') => h('button', {
            class: `btn tetris-btn ${cls}`, type: 'button', text: label,
            on: { pointerdown: e => { e.preventDefault(); fn(); } }
        });
        host.appendChild(h('div', { class: 'tetris-layout' },
            h('div', {}, score, canvas),
            h('div', { class: 'tetris-side' }, h('p', { class: 'page-sub', text: 'Next' }), next)));
        host.appendChild(h('div', { class: 'tetris-controls' },
            h('div', {}, btn('↻', () => t.rotate())),
            h('div', {}, btn('←', () => t.move(-1)), btn('↓', () => t.drop()), btn('→', () => t.move(1))),
            h('div', {}, btn('DROP', () => t.hardDrop(), 'wide'))));
        t.attach(canvas, next, score);
    },

    newTetris() {
        const COLS = 10, ROWS = 20, BLOCK = 20;
        const colors = [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'];
        const shapes = {
            T: [[0, 0, 0], [1, 1, 1], [0, 1, 0]], I: [[0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0]],
            S: [[0, 3, 3], [3, 3, 0], [0, 0, 0]], Z: [[4, 4, 0], [0, 4, 4], [0, 0, 0]],
            L: [[0, 5, 0], [0, 5, 0], [0, 5, 5]], O: [[6, 6], [6, 6]], J: [[0, 7, 0], [0, 7, 0], [7, 7, 0]]
        };
        const types = 'TISZLOJ';
        const randomType = () => types[Math.floor(Math.random() * types.length)];
        const piece = type => shapes[type].map(row => row.slice());
        const t = {
            board: Array.from({ length: ROWS }, () => new Array(COLS).fill(0)),
            score: 0, over: false, interval: 500, counter: 0, last: 0,
            nextType: randomType(), player: { x: 0, y: 0, m: null },
            canvas: null, ctx: null, nctx: null, scoreEl: null, raf: null
        };
        const collide = () => t.player.m.some((row, y) => row.some((v, x) =>
            v && (t.board[y + t.player.y] === undefined || t.board[y + t.player.y][x + t.player.x] !== 0)));
        const merge = () => t.player.m.forEach((row, y) => row.forEach((v, x) => { if (v) t.board[y + t.player.y][x + t.player.x] = v; }));
        const draw = () => {
            if (!t.ctx) return;
            t.ctx.fillStyle = '#16131f';
            t.ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
            const paint = (m, ox, oy) => m.forEach((row, y) => row.forEach((v, x) => {
                if (!v) return;
                t.ctx.fillStyle = colors[v];
                t.ctx.fillRect((x + ox) * BLOCK, (y + oy) * BLOCK, BLOCK - 1, BLOCK - 1);
            }));
            paint(t.board, 0, 0);
            if (!t.over) paint(t.player.m, t.player.x, t.player.y);
        };
        const drawNext = () => {
            if (!t.nctx) return;
            t.nctx.fillStyle = '#16131f';
            t.nctx.fillRect(0, 0, 80, 80);
            piece(t.nextType).forEach((row, y) => row.forEach((v, x) => {
                if (!v) return;
                t.nctx.fillStyle = colors[v];
                t.nctx.fillRect(x * 20, y * 20, 19, 19);
            }));
        };
        const reset = () => {
            t.player.m = piece(t.nextType);
            t.nextType = randomType();
            drawNext();
            t.player.y = 0;
            t.player.x = (COLS / 2 | 0) - (t.player.m[0].length / 2 | 0);
            if (collide()) {
                t.over = true;
                draw();
                setTimeout(() => Hub.finishArcadeGame('tetris', { score: t.score }), 900);
            }
        };
        const sweep = () => {
            for (let y = ROWS - 1; y >= 0; y--) {
                if (t.board[y].every(v => v !== 0)) {
                    t.board.splice(y, 1);
                    t.board.unshift(new Array(COLS).fill(0));
                    t.score++;
                    t.interval = Math.max(100, t.interval - 20);
                    y++;
                }
            }
            if (t.scoreEl) t.scoreEl.textContent = `Score: ${t.score}`;
            Profile.arcadeProgress('tetris', t.score);
        };
        const land = () => { merge(); sweep(); reset(); t.counter = 0; };
        t.drop = () => {
            if (t.over) return;
            t.player.y++;
            if (collide()) { t.player.y--; land(); }
            t.counter = 0;
            draw();
        };
        t.hardDrop = () => {
            if (t.over) return;
            while (!collide()) t.player.y++;
            t.player.y--;
            land();
            draw();
        };
        t.move = dir => {
            if (t.over) return;
            t.player.x += dir;
            if (collide()) t.player.x -= dir;
            draw();
        };
        t.rotate = () => {
            if (t.over) return;
            const m = t.player.m;
            const turn = matrix => {
                for (let y = 0; y < matrix.length; y++) for (let x = 0; x < y; x++) [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
                matrix.forEach(row => row.reverse());
            };
            const unturn = matrix => { turn(matrix); turn(matrix); turn(matrix); };
            const pos = t.player.x;
            let offset = 1;
            turn(m);
            while (collide()) {
                t.player.x += offset;
                offset = -(offset + (offset > 0 ? 1 : -1));
                if (offset > m[0].length) { unturn(m); t.player.x = pos; return; }
            }
            draw();
        };
        const loop = time => {
            if (t.over || !t.canvas || !document.body.contains(t.canvas)) { t.raf = null; return; }
            const delta = time - (t.last || time);
            t.last = time;
            t.counter += Math.min(delta, 1000);
            if (t.counter > t.interval) t.drop();
            draw();
            t.raf = requestAnimationFrame(loop);
        };
        t.attach = (canvas, next, scoreEl) => {
            t.canvas = canvas; t.ctx = canvas.getContext('2d');
            t.nctx = next.getContext('2d'); t.scoreEl = scoreEl;
            if (!t.player.m) reset();
            drawNext();
            draw();
            if (!t.raf) { t.last = 0; t.raf = requestAnimationFrame(loop); }
        };
        if (!Hub._tetrisKeys) {
            Hub._tetrisKeys = true;
            document.addEventListener('keydown', e => {
                const g = Hub.arcade.tetris;
                if (!g || g.over || Hub.page !== 'tetris') return;
                const keys = { ArrowLeft: () => g.move(-1), ArrowRight: () => g.move(1), ArrowDown: () => g.drop(), ArrowUp: () => g.rotate(), ' ': () => g.hardDrop() };
                if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
            });
        }
        return t;
    }
});
