/* ============================================================
   duo.js — raiding with a friend

   Two players, two phones, one raid boss. The player who found the raid (the
   host) invites a friend with a four-letter code; the friend joins from the 👥
   button on their map. Only in-person raids can be shared: not teleports, not
   Grand Raids.

   The friend can only join if the raid's creature is one they could find
   themselves: its set (and, for an exclusive, its wave) has to be unlocked on
   their save.

   How a turn works
     * The boss has 5x HP in a regular raid and 6x in an exclusive one; its
       other stats get the usual raid boosts.
     * Each player picks an action within 20 seconds, or one is picked for them
       at random.
     * The three creatures act in order of Speed. The boss's damaging moves hit
       both players' creatures.
     * A player whose three creatures have all fainted, while the friend still
       has some, boosts the friend's creature instead: +10% Attack, Defence or
       Speed, applied at the start of the turn.

   The host's phone runs the battle (the same engine as a solo fight, with one
   Battle per player sharing the one boss) and sends each turn's events and the
   state of every creature to the friend's phone, which only sends its choice
   back. So the two can never disagree about what happened.

   The connection is this project's Firebase Realtime Database, under
   duoRaids/, signed in with the same anonymous account as the cloud backup.
   ============================================================ */

import {
  DB, species, statsFor, raidModifiers, STAT_KEYS, STAT_LABELS, STATUS_CONDITIONS
} from './data.js';
import { Battle, Battler, battlerFromCreature, chooseAIMove, battleEnv } from './battle.js';
import { cloudApp, FIREBASE_SDK } from './cloud.js';
import { store } from './state.js';
import { $, el, toast, sleep } from './ui.js';

/* ---------------------------------------------------------------
   Rules
   --------------------------------------------------------------- */

export const DUO_HP_MULTIPLIER = { regular: 5, exclusive: 6 };
export const DUO_TURN_SECONDS = 20;
/** Extra time the host gives the friend's choice to arrive before picking for them. */
const DUO_GRACE_SECONDS = 4;
/** What a player with no creatures left can do for the friend each turn. */
export const DUO_BOOST_PCT = 0.10;
export const DUO_BOOST_STATS = ['attack', 'defence', 'speed'];
/** The friend's phone gone this long during the battle: the raid ends for them. */
const DUO_HOST_LOST_SECONDS = 30;

/**
 * The Realtime Database. Created in the Firebase console (Build → Realtime
 * Database → Create database). The default US location gives this address;
 * a database in another location has a different one, so change it here.
 */
export const DUO_DATABASE_URL = 'https://search-and-go-51e64-default-rtdb.firebaseio.com';
const ROOT = 'duoRaids';
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/* ---------------------------------------------------------------
   Who can join
   --------------------------------------------------------------- */

/**
 * Could this player find the raid's creature themselves? Regular raids need
 * its set (and rarity tier) unlocked; exclusive ones need it to be one of the
 * exclusives in play for them.
 */
export function canFindRaidCreature(raid) {
  const id = raid?.speciesId;
  if (!id || !species(id)) return false;
  const pools = raid.exclusive
    ? [DB.exclusiveRollable || [], DB.exclusiveInPlay || []]
    : [DB.available || []];
  return pools.some(list => list.some(sp => sp.id === id));
}

/** Only in-person raids can be shared. */
export function canInviteToRaid(raid, { grand = false } = {}) {
  return !!raid && !raid.teleport && !grand && !store.isTeleporting && !raid.defeated;
}

/* ---------------------------------------------------------------
   The battle (run on the host's phone)
   --------------------------------------------------------------- */

/** The boss: raid boosts on Attack, Defence and Speed, and 5x / 6x HP. */
export function duoBossBattler(raid) {
  const sp = species(raid.bossId || raid.speciesId);
  const base = statsFor(sp, raid.level, null);
  const mods = raidModifiers(!!raid.exclusive, false);
  const stats = {};
  for (const k of STAT_KEYS) {
    const m = k === 'hp' ? DUO_HP_MULTIPLIER[raid.exclusive ? 'exclusive' : 'regular'] : (mods[k] ?? 1);
    stats[k] = Math.max(1, Math.round(base[k] * m));
  }
  return new Battler({
    speciesId: sp.id, level: raid.level, shiny: !!raid.shiny,
    stats, moves: sp.movesAt(raid.level, null), label: sp.name
  });
}

/** Rider effects that land on the opponent, which the boss's second target gets too. */
const ON_OPPONENT = new Set(['status', 'statSwap', 'buffOpponent', 'debuffOpponent']);
function opponentEffectsOnly(fx) {
  if (!fx) return null;
  if (fx.kind === 'combo') {
    const parts = fx.parts.filter(p => ON_OPPONENT.has(p.kind));
    return parts.length ? (parts.length === 1 ? parts[0] : { ...fx, parts }) : null;
  }
  return ON_OPPONENT.has(fx.kind) ? fx : null;
}

export class DuoRaid {
  /**
   * @param {object} o { raid, host: {name, team: creature records}, guest: {...}, rng, env }
   */
  constructor({ raid, host, guest, rng = Math.random, env = battleEnv() }) {
    this.raid = raid;
    this.rng = rng;
    this.boss = duoBossBattler(raid);
    this.names = { host: host.name, guest: guest.name };
    const make = team => new Battle({
      player: team.map(battlerFromCreature), enemy: [this.boss], kind: 'raid', rng, env
    });
    this.battles = { host: make(host.team), guest: make(guest.team) };
    this.turn = 0;
    this.over = false;
    this.winner = null;     // 'player' (both won) | 'enemy'
    this.introduced = false;
  }

  other(role) { return role === 'host' ? 'guest' : 'host'; }
  wiped(role) { return this.battles[role].playerRemaining === 0; }
  active(role) { const a = this.battles[role].playerActive; return a && !a.fainted ? a : null; }

  /** What `role` may do now: moves (with whether each can be used), or boosts. */
  options(role) {
    const b = this.battles[role];
    if (this.over) return { kind: 'none' };
    if (this.wiped(role)) {
      return this.active(this.other(role)) ? { kind: 'boost', stats: DUO_BOOST_STATS.slice() } : { kind: 'none' };
    }
    const usable = b.usableMoves('player');
    return {
      kind: 'moves',
      moves: b.availableMoves.map((m, i) => {
        const ok = usable.includes(m);
        let why = null;
        if (!ok) {
          const r = b.moveBlockedReason('player', m);
          why = r && typeof r === 'object' ? `${r.ability} stops it` : r ? `${STATUS_CONDITIONS[r]?.icon || ''} ${r}` : 'Loop';
        }
        return { i, name: m.name, desc: Battle.describeMove(m), isStatus: !!m.isStatus, usable: ok, why };
      }),
      canWait: usable.length === 0
    };
  }

  /** A choice made for a player who ran out of time. */
  randomChoice(role) {
    const opt = this.options(role);
    if (opt.kind === 'boost') return { kind: 'boost', stat: opt.stats[Math.floor(this.rng() * opt.stats.length)] };
    if (opt.kind !== 'moves') return { kind: 'wait' };
    const usable = opt.moves.filter(m => m.usable);
    if (!usable.length) return { kind: 'wait' };
    return { kind: 'move', i: usable[Math.floor(this.rng() * usable.length)].i, auto: true };
  }

  /** A choice that isn't legal any more becomes a random one. */
  _clean(role, choice) {
    const opt = this.options(role);
    if (opt.kind === 'boost') {
      return choice?.kind === 'boost' && DUO_BOOST_STATS.includes(choice.stat) ? choice : this.randomChoice(role);
    }
    if (opt.kind !== 'moves') return { kind: 'wait' };
    if (choice?.kind === 'move' && opt.moves[choice.i]?.usable) return choice;
    if (choice?.kind === 'wait' && opt.canWait) return choice;
    return this.randomChoice(role);
  }

  _tag(events, who) {
    for (const e of events) e.who = who;
    return events;
  }

  /**
   * Plays one turn. `choices` is { host, guest }, each { kind: 'move', i } |
   * { kind: 'boost', stat } | { kind: 'wait' }.
   * @returns {object[]} events, each tagged with `who`
   */
  takeTurn(choices) {
    if (this.over) return [];
    const { host: A, guest: B } = this.battles;
    const ch = { host: this._clean('host', choices.host), guest: this._clean('guest', choices.guest) };
    this.turn++;
    A.turn = this.turn;
    B.turn = this.turn;
    const events = [{ type: 'turn', turn: this.turn, who: 'host' }];

    // On the first turn (and after a creature comes in) say what is held and what abilities do.
    events.push(...this._tag(A.heldLines(), 'host'), ...this._tag(A.abilityLines(), 'host'));
    events.push(...this._tag(B.heldLines().filter(e => e.side === 'player'), 'guest'),
      ...this._tag(B.abilityLines().filter(e => e.side === 'player'), 'guest'));

    A.turnDamage = { player: 0, enemy: 0 };
    B.turnDamage = { player: 0, enemy: 0 };

    // A player with nothing left standing cheers the friend on, before anyone moves.
    for (const role of ['host', 'guest']) {
      const c = ch[role];
      if (c.kind !== 'boost') continue;
      const friend = this.active(this.other(role));
      if (!friend) continue;
      const r = friend.applyBuff(c.stat, DUO_BOOST_PCT);
      events.push({
        type: 'support', who: role, friendWho: this.other(role),
        actorLabel: friend.label, stat: c.stat, statLabel: STAT_LABELS[c.stat],
        pct: Math.round(DUO_BOOST_PCT * 100), before: r.before, after: r.after,
        totalPct: friend.buffPercent(c.stat), auto: !!c.auto
      });
    }

    // Everyone who can still act, fastest first; ties are a coin flip.
    const actors = [];
    for (const role of ['host', 'guest']) {
      const me = this.active(role);
      if (!me || ch[role].kind === 'boost') continue;
      const move = ch[role].kind === 'move' ? this.battles[role].availableMoves[ch[role].i] : null;
      actors.push({ role, actor: me, move, speed: this.battles[role].speedOf(me), tie: this.rng() });
    }
    const bossMoves = A.usableMoves('enemy');
    const bossMove = bossMoves.length ? chooseAIMove({ moves: bossMoves }, this.rng) : null;
    actors.push({ role: 'boss', actor: this.boss, move: bossMove, speed: A.speedOf(this.boss), tie: this.rng() });
    actors.sort((x, y) => (y.speed - x.speed) || (x.tie - y.tie));
    if (A.speedInverted || B.speedInverted) actors.reverse();
    events.push({ type: 'order', order: actors.map(a => a.role), who: 'host' });

    for (const step of actors) {
      if (this.boss.fainted) break;
      if (step.actor.fainted) {
        events.push({ type: 'skipped', who: step.role === 'boss' ? 'host' : step.role,
          side: step.role === 'boss' ? 'enemy' : 'player', actorLabel: step.actor.label, move: step.move?.name || null });
        continue;
      }
      if (step.role === 'boss') events.push(...this._bossActs(step.move));
      else events.push(...this._tag(this.battles[step.role].act({ side: 'player', actor: step.actor, target: this.boss, move: step.move }), step.role));
      events.push(...this._tag(A.abilityChanges(), 'host'));
      events.push(...this._tag(B.abilityChanges().filter(e => e.side === 'player'), 'guest'));
    }

    // The boss's per-turn effects once (from the host's battle), each player's own once.
    events.push(...this._tag(A.endOfTurn(), 'host'));
    events.push(...this._tag(B.endOfTurn(['player']), 'guest'));
    events.push(...this._tag(A.handleFaints(), 'host'));
    events.push(...this._tag(B.handleFaints().filter(e => e.side === 'player'), 'guest'));

    if (this.boss.fainted) {
      this.over = true;
      this.winner = 'player';
    } else if (this.wiped('host') && this.wiped('guest')) {
      this.over = true;
      this.winner = 'enemy';
    }
    if (this.over) events.push({ type: 'end', winner: this.winner, who: 'host' });
    return events;
  }

  /**
   * The boss's go: the move is used on one player's creature in full (status
   * checks, Loop, its own effects), then its damage, and any effect that lands
   * on the opponent, on the other player's creature too.
   */
  _bossActs(move) {
    const roles = ['host', 'guest'].filter(r => this.active(r));
    if (!roles.length) return [];
    if (roles.length === 2 && this.rng() < 0.5) roles.reverse();
    const [first, second] = roles;
    const X = this.battles[first];
    const evs = this._tag(X.act({ side: 'enemy', actor: this.boss, target: this.active(first), move }), first);
    const hit = evs.some(e => e.type === 'damage' && e.side === 'enemy' && !e.selfHit);
    const out = evs;
    if (second && hit && move && move.power > 0 && !this.boss.fainted) {
      const Y = this.battles[second];
      const echo = { ...move, effect: opponentEffectsOnly(move.effect) };
      // Hallucination was already rolled for the first target.
      const hall = this.boss.status.Hallucination;
      delete this.boss.status.Hallucination;
      try {
        const more = Y.applyMove({ side: 'enemy', actor: this.boss, target: this.active(second), move: echo })
          .filter(e => e.type !== 'move');
        out.push(...this._tag(more, second));
      } finally {
        if (hall) this.boss.status.Hallucination = hall;
      }
    }
    // Lasting team effects the boss sets up count against both players.
    const other = this.battles[first === 'host' ? 'guest' : 'host'];
    other.sideFx.enemy = { ...X.sideFx.enemy };
    other.speedInverted = other.speedInverted || X.speedInverted;
    return out;
  }

  /** Everything the screens need, for both phones. */
  snapshot() {
    const one = b => ({
      label: b.label, speciesId: b.speciesId, shiny: b.shiny, level: b.level,
      hp: b.hp, maxHp: b.maxHp, fainted: b.fainted, uid: b.uid || null,
      stats: { ...b.stats },
      buffs: Object.fromEntries(STAT_KEYS.filter(k => k !== 'hp' && b.buffPercent(k) != null).map(k => [k, b.buffPercent(k)])),
      status: Object.keys(b.status)
    });
    const side = role => ({
      name: this.names[role],
      index: this.battles[role].playerIndex,
      team: this.battles[role].player.map(one),
      wiped: this.wiped(role),
      options: this.options(role)
    });
    return { turn: this.turn, over: this.over, winner: this.winner, boss: one(this.boss),
      sides: { host: side('host'), guest: side('guest') } };
  }
}

/* ---------------------------------------------------------------
   The connection
   --------------------------------------------------------------- */

const Net = {
  db: null,
  sdk: null,
  uid: null,

  /** Connects and checks the database answers, with a test write. */
  async connect() {
    if (!navigator.onLine) return { ok: false, reason: 'offline' };
    try {
      const { app, uid } = await withTimeout(cloudApp(), 15000);
      const sdk = await withTimeout(import(`${FIREBASE_SDK}/firebase-database.js`), 15000);
      this.sdk = sdk;
      this.uid = uid;
      this.db = sdk.getDatabase(app, DUO_DATABASE_URL);
      await withTimeout(waitConnected(sdk, this.db), 10000);
      const probe = sdk.push(sdk.ref(this.db, `${ROOT}/health`));
      await withTimeout(sdk.set(probe, { at: sdk.serverTimestamp(), uid }), 8000);
      sdk.remove(probe).catch(() => {});
      return { ok: true };
    } catch (err) {
      console.warn('[duo] connect failed', err);
      const text = `${err?.code || ''} ${err?.message || ''}`.toLowerCase();
      return { ok: false, reason: text.includes('permission') ? 'setup' : 'unavailable' };
    }
  },

  ref(path) { return this.sdk.ref(this.db, `${ROOT}/${path}`); }
};

/**
 * Resolves once the database reports a live connection.
 *
 * When it is already connected (a second raid, or inviting again after
 * cancelling), Firebase answers inside onValue itself, before `off` exists.
 * The old version unsubscribed there, which threw, so the check never finished
 * and reported "not available" until the idle connection dropped minutes later.
 */
export function waitConnected(sdk, db) {
  return new Promise(resolve => {
    let off = null;
    let done = false;
    off = sdk.onValue(sdk.ref(db, '.info/connected'), snap => {
      if (done || snap.val() !== true) return;
      done = true;
      resolve();
      if (off) off();          // a later answer: stop listening now
    });
    if (done) off();           // it answered straight away: stop listening here
  });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms);
    Promise.resolve(promise).then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

/** Identifies the rules both phones must share: the creature data. */
let versionCache = null;
export function duoVersion() {
  if (versionCache) return versionCache;
  const data = (DB.species || []).map(sp => [sp.id, sp.type, sp.rarity, STAT_KEYS.map(k => sp.baseStats?.[k])]);
  let h = 0x811c9dc5;
  const text = JSON.stringify(data);
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  versionCache = `1-${h.toString(36)}`;
  return versionCache;
}

const failText = reason => reason === 'setup'
  ? "Raiding with a friend isn't switched on yet (the game's online database needs setting up)."
  : reason === 'offline'
    ? "You're offline. Connect to the internet to raid with a friend."
    : "Raiding with a friend isn't available right now. The free online service may be at its limit; please try again later.";

/** The fields of a creature the other phone needs to rebuild it for the battle. */
function teamRecord(c) {
  return {
    uid: c.uid, speciesId: c.speciesId, level: c.level, shiny: !!c.shiny,
    statMod: c.statMod || null, moveUnlock: c.moveUnlock || null, boosts: c.boosts || null,
    moveBoost: c.moveBoost || null, held: c.held || null, hp: c.hp ?? null
  };
}

/* ---------------------------------------------------------------
   A session: one duo raid, from the invite to the result
   --------------------------------------------------------------- */

/**
 * The UI hooks it calls (all optional):
 *   onLobby(state)     lobby text changed ({ step, code, friend, message })
 *   onState(turnData)  a turn was played ({ events, snap }) — render it
 *   onChoose(options, deadline) the player can act now
 *   onEnd(result)      the raid is over ({ won, snap, myResults, damageByUid })
 *   onAbort(message)   the raid ended early without a result
 */
export class DuoSession {
  constructor(role, hooks) {
    this.role = role;
    this.hooks = hooks || {};
    this.code = null;
    this.raid = null;
    this.friend = null;
    this.ready = false;           // the friend has joined
    this.started = false;
    this.done = false;
    this.engine = null;           // host only
    this.myTeam = null;
    this.nextTurn = 1;
    this.choices = {};
    this.turnTimer = null;
    this.graceTimer = null;
    this.offs = [];
    this.friendAway = null;
    this.watchdog = null;
    this.lastSnap = null;
  }

  get name() { return (store.s?.nickname || 'Trainer').slice(0, 20); }
  hook(name, ...args) { try { this.hooks[name]?.(...args); } catch (e) { console.error(e); } }
  watch(r, cb) { const off = Net.sdk.onValue(r, cb); this.offs.push(off); }
  watchAdded(r, cb) { const off = Net.sdk.onChildAdded(r, cb); this.offs.push(off); }

  /* ---- host ---- */

  async host(raid) {
    this.raid = {
      speciesId: raid.speciesId, bossId: raid.bossId || null, rarity: raid.rarity, level: raid.level,
      exclusive: !!raid.exclusive, shiny: !!raid.shiny, xp: raid.xp ?? 0, dustRange: raid.dustRange || [30, 40]
    };
    this.hook('onLobby', { step: 'connecting' });
    const c = await Net.connect();
    if (!c.ok) { this.hook('onLobby', { step: 'error', message: failText(c.reason) }); return false; }
    const { runTransaction, onDisconnect, serverTimestamp } = Net.sdk;
    for (let attempt = 0; attempt < 6; attempt++) {
      let code = '';
      for (let i = 0; i < 4; i++) code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
      const r = Net.ref(`rooms/${code}`);
      try {
        const res = await withTimeout(runTransaction(r, cur => (cur === null ? {
          createdAt: Date.now(), v: duoVersion(), status: 'waiting', raid: this.raid,
          host: { name: this.name, uid: Net.uid }
        } : undefined)), 10000);
        if (!res.committed) continue;
        this.code = code;
        this._holdRoom('host');
        this._pruneOld();
        this._listenHost();
        this.hook('onLobby', { step: 'waiting', code });
        return true;
      } catch (err) {
        console.warn('[duo] create failed', err);
        this.hook('onLobby', { step: 'error', message: failText('unavailable') });
        return false;
      }
    }
    this.hook('onLobby', { step: 'error', message: failText('unavailable') });
    return false;
  }

  /**
   * Keeps this player's place while their phone is away, until the raid starts.
   *
   * iOS closes the connection as soon as Safari leaves the screen (to send the
   * code in Messages or WhatsApp, or when the screen locks). The room used to
   * be removed by the server when the host's connection dropped (onDisconnect
   * remove), so on an iPhone the code on screen no longer existed by the time
   * the friend typed it: "There's no raid with the code…". Android keeps the
   * connection a while in the background, which is why it worked the other way.
   *
   * Now the server only marks the player away (`hostAway` / `guestAway`), and
   * every reconnection clears the mark and arms it again. The room still goes
   * when the host cancels, leaves or finishes, and forgotten ones are pruned.
   */
  _holdRoom(role) {
    const { onDisconnect, set, remove, ref } = Net.sdk;
    const away = Net.ref(`rooms/${this.code}/${role}Away`);
    this.watch(ref(Net.db, '.info/connected'), snap => {
      if (snap.val() !== true || this.started || this.done) return;
      onDisconnect(away).set(true).catch(() => {});
      remove(away).catch(() => {});
    });
  }

  /** Once the raid starts, presence (_presence) takes over from the away mark. */
  _releaseRoom() {
    if (!this.code || !Net.sdk) return;
    Net.sdk.onDisconnect(Net.ref(`rooms/${this.code}/${this.role}Away`)).cancel().catch(() => {});
    Net.sdk.remove(Net.ref(`rooms/${this.code}/${this.role}Away`)).catch(() => {});
  }

  _pruneOld() {
    const { query, orderByChild, endAt, limitToFirst, get, remove } = Net.sdk;
    // Rooms are no longer removed when a phone drops, so forgotten ones go after 3 hours.
    get(query(Net.ref('rooms'), orderByChild('createdAt'), endAt(Date.now() - 3 * 3600000), limitToFirst(20)))
      .then(snap => snap.forEach(child => { remove(child.ref).catch(() => {}); }))
      .catch(() => {});
  }

  _listenHost() {
    this.watch(Net.ref(`rooms/${this.code}/guest`), snap => {
      const g = snap.val();
      if (!g || this.friend) return;
      this.friend = g;
      this.ready = true;
      this.hook('onLobby', { step: 'joined', code: this.code, friend: g.name });
    });
    this.watch(Net.ref(`rooms/${this.code}/teams`), snap => {
      const teams = snap.val() || {};
      if (!this.started && teams.host && teams.guest) this._start(teams);
    });
  }

  _start(teams) {
    this.started = true;
    const room = Net.ref(`rooms/${this.code}`);
    Net.sdk.onDisconnect(room).cancel().catch(() => {});
    this._releaseRoom();
    Net.sdk.update(room, { status: 'playing' }).catch(() => {});
    this.engine = new DuoRaid({
      raid: this.raid,
      host: { name: this.name, team: teams.host.team },
      guest: { name: teams.guest.name || this.friend?.name || 'Friend', team: teams.guest.team }
    });
    this._presence();
    this._publish([], 0);
  }

  /** Sends the state for the next turn to both screens. */
  _publish(events, turn) {
    const snap = this.engine.snapshot();
    const data = { events: JSON.stringify(events), snap: JSON.stringify(snap) };
    if (snap.over) {
      data.guestResult = JSON.stringify({
        damageByUid: this.engine.battles.guest.damageByUid,
        hp: this.engine.battles.guest.player.map(b => ({ uid: b.uid, hp: b.hp }))
      });
    }
    Net.sdk.set(Net.ref(`rooms/${this.code}/turns/${turn}`), data)
      .catch(err => { console.error('[duo] publish failed', err); this._abort("The online service stopped accepting moves."); });
    this._receiveTurn(events, snap);
    if (snap.over) {
      this._finish(snap, {
        damageByUid: this.engine.battles.host.damageByUid,
        hp: this.engine.battles.host.player.map(b => ({ uid: b.uid, hp: b.hp }))
      });
      setTimeout(() => Net.sdk.remove(Net.ref(`rooms/${this.code}`)).catch(() => {}), 15000);
      return;
    }
    // Wait for the friend's choice, or pick one for them.
    this.choices = {};
    const n = this.nextTurn;
    const off = Net.sdk.onValue(Net.ref(`rooms/${this.code}/choices/${n}/guest`), s => {
      const v = s.val();
      if (!v || this.nextTurn !== n) return;
      try { this.choices.guest = JSON.parse(v); } catch (e) { this.choices.guest = null; }
      this._maybeResolve();
    });
    this.offs.push(off);
    clearTimeout(this.graceTimer);
    this.graceTimer = setTimeout(() => {
      if (this.nextTurn !== n || this.choices.guest) return;
      this.choices.guest = this.engine.randomChoice('guest');
      this._maybeResolve();
    }, (DUO_TURN_SECONDS + DUO_GRACE_SECONDS) * 1000);
  }

  _maybeResolve() {
    if (!this.engine || this.engine.over || !this.choices.host || !this.choices.guest) return;
    clearTimeout(this.graceTimer);
    const n = this.nextTurn;
    this.nextTurn++;
    const events = this.engine.takeTurn({ host: this.choices.host, guest: this.choices.guest });
    this._publish(events, n);
  }

  /* ---- guest ---- */

  async join(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    if (code.length !== 4) return { error: 'Enter the 4-letter code your friend sees.' };
    const c = await Net.connect();
    if (!c.ok) return { error: failText(c.reason) };
    const { get, runTransaction, onDisconnect } = Net.sdk;
    let room;
    try {
      room = (await withTimeout(get(Net.ref(`rooms/${code}`)), 10000)).val();
    } catch (err) {
      return { error: failText('unavailable') };
    }
    if (!room || !room.raid) return { error: `There's no raid with the code ${code}. Check it with your friend.` };
    if (room.v !== duoVersion()) {
      return { error: 'You and your friend have different versions of the game. Both of you reload the page, then try again.' };
    }
    if (room.status !== 'waiting' || room.guest) return { error: 'Someone has already joined that raid.' };
    if (room.host?.uid === Net.uid) return { error: "That's your own raid: send the code to a friend." };
    if (!canFindRaidCreature(room.raid)) {
      const name = species(room.raid.speciesId)?.name || 'this creature';
      return { error: `You can't join: ${name} isn't one you can find yet. Unlock its set${room.raid.exclusive ? ' (or its exclusive wave)' : ''} first.` };
    }
    try {
      const res = await withTimeout(runTransaction(Net.ref(`rooms/${code}/guest`),
        cur => (cur === null ? { name: this.name, uid: Net.uid } : undefined)), 10000);
      if (!res.committed) return { error: 'Someone has already joined that raid.' };
    } catch (err) {
      return { error: failText('unavailable') };
    }
    this.code = code;
    // The seat is kept while this phone is away (an iPhone sending a message):
    // leave() frees it when the friend really goes.
    this._holdRoom('guest');
    this.raid = room.raid;
    this.friend = room.host;
    this.ready = true;
    // The host went before the battle started: the room is gone.
    this.watch(Net.ref(`rooms/${code}/host`), snap => {
      if (!snap.val() && !this.started && !this.done) this._abort(`${this.friend?.name || 'Your friend'} closed the raid.`);
    });
    this.watchAdded(Net.ref(`rooms/${code}/turns`), snap => this._guestTurn(snap.val()));
    return { ok: true, raid: room.raid, friend: room.host?.name || 'Friend' };
  }

  _guestTurn(data) {
    if (!data || this.done) return;
    if (!this.started) {
      this.started = true;
      this._releaseRoom();
      this._presence();
    }
    if (data.aborted) { this._abort(data.aborted); return; }
    let events = [], snap = null;
    try { events = JSON.parse(data.events || '[]'); snap = JSON.parse(data.snap); } catch (e) { return; }
    if (!snap || !snap.sides) return;
    this.nextTurn = snap.turn + 1;
    this._receiveTurn(events, snap);
    if (snap.over) {
      let mine = { damageByUid: {}, hp: [] };
      try { mine = JSON.parse(data.guestResult || '{}'); } catch (e) { /* none */ }
      this._finish(snap, mine);
    }
  }

  /* ---- both ---- */

  /** This player's team is chosen: send it. */
  submitTeam(creatures) {
    this.myTeam = creatures.map(teamRecord);
    return Net.sdk.set(Net.ref(`rooms/${this.code}/teams/${this.role}`),
      { name: this.name, team: this.myTeam }).catch(() => this._abort(failText('unavailable')));
  }

  _receiveTurn(events, snap) {
    this.lastSnap = snap;
    this.hook('onState', { events, snap, myRole: this.role });
    if (snap.over) return;
    clearTimeout(this.turnTimer);
    const opts = snap.sides[this.role].options;
    const deadline = Date.now() + DUO_TURN_SECONDS * 1000;
    const turn = snap.turn + 1;
    this.chosen = false;
    if (opts.kind === 'none') {
      this.choose({ kind: 'wait' }, turn);
      return;
    }
    this.hook('onChoose', opts, deadline, turn);
    this.turnTimer = setTimeout(() => {
      if (this.chosen || this.nextTurn !== turn) return;
      this.choose(this._randomFrom(opts), turn);
      toast("Time's up: an action was picked for you", '', 2400);
    }, DUO_TURN_SECONDS * 1000);
  }

  _randomFrom(opts) {
    if (opts.kind === 'boost') return { kind: 'boost', stat: opts.stats[Math.floor(Math.random() * opts.stats.length)], auto: true };
    const usable = (opts.moves || []).filter(m => m.usable);
    return usable.length ? { kind: 'move', i: usable[Math.floor(Math.random() * usable.length)].i, auto: true } : { kind: 'wait' };
  }

  /** The player picked (or ran out of time). */
  choose(choice, turn = this.nextTurn) {
    if (this.chosen || this.done || turn !== this.nextTurn) return;
    this.chosen = true;
    clearTimeout(this.turnTimer);
    this.hook('onWaiting', this.friend?.name || 'your friend');
    if (this.role === 'host') {
      this.choices.host = choice;
      this._maybeResolve();
    } else {
      Net.sdk.set(Net.ref(`rooms/${this.code}/choices/${turn}/guest`), JSON.stringify(choice))
        .catch(() => this._abort(failText('unavailable')));
    }
  }

  _presence() {
    const { onDisconnect, set } = Net.sdk;
    const mine = Net.ref(`rooms/${this.code}/presence/${this.role}`);
    set(mine, true).catch(() => {});
    onDisconnect(mine).remove();
    const other = this.role === 'host' ? 'guest' : 'host';
    this.watch(Net.ref(`rooms/${this.code}/presence/${other}`), snap => {
      const here = snap.val() === true;
      if (here) { this.friendAway = null; clearTimeout(this.watchdog); return; }
      if (this.done || this.friendAway) return;
      this.friendAway = Date.now();
      if (this.role === 'host') {
        toast(`${this.friend?.name || 'Your friend'} lost their connection: their creature acts at random`, '', 3600);
      } else {
        this.watchdog = setTimeout(() => {
          if (this.friendAway && !this.done) this._abort(`${this.friend?.name || 'Your friend'}'s phone lost its connection, so the raid has ended.`);
        }, DUO_HOST_LOST_SECONDS * 1000);
      }
    });
  }

  _finish(snap, mine) {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.turnTimer);
    clearTimeout(this.graceTimer);
    this.hook('onEnd', { won: snap.winner === 'player', snap, myResults: mine.hp || [], damageByUid: mine.damageByUid || {} });
    this._stop();
  }

  _abort(message) {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.turnTimer);
    clearTimeout(this.graceTimer);
    this.hook('onAbort', message);
    this._stop();
  }

  /** This player leaves (closing the screen). The host's leaving ends the raid for both. */
  leave() {
    if (!this.code || !Net.sdk) { this._stop(); return; }
    if (!this.done) {
      if (this.role === 'host') {
        const msg = `${this.name} left the raid.`;
        if (this.started) {
          Net.sdk.set(Net.ref(`rooms/${this.code}/turns/${this.nextTurn}`),
            { events: '[]', snap: JSON.stringify(this.lastSnap || {}), aborted: msg }).catch(() => {});
        }
        setTimeout(() => Net.sdk.remove(Net.ref(`rooms/${this.code}`)).catch(() => {}), 4000);
      } else if (!this.started) {
        Net.sdk.remove(Net.ref(`rooms/${this.code}/guest`)).catch(() => {});
      }
    }
    this.done = true;
    clearTimeout(this.turnTimer);
    clearTimeout(this.graceTimer);
    this._stop();
  }

  _stop() {
    for (const off of this.offs) { try { off(); } catch (e) { /* gone */ } }
    this.offs = [];
    clearTimeout(this.watchdog);
    if (Net.sdk && this.code) {
      Net.sdk.remove(Net.ref(`rooms/${this.code}/presence/${this.role}`)).catch(() => {});
    }
  }
}

/* ---------------------------------------------------------------
   Text for the battle log
   --------------------------------------------------------------- */

/** One log line for a duo event, or null for events not worth a line. */
export function duoEventText(e, myRole, names) {
  const owner = who => (who === myRole ? 'Your' : `${names[who] || 'Your friend'}'s`);
  const sideName = (side, who) => (side === 'enemy' ? 'The boss' : owner(who));
  const b = s => `<b>${s}</b>`;
  switch (e.type) {
    case 'turn': return `<span class="muted">— Turn ${e.turn} —</span>`;
    case 'move': return `${sideName(e.side, e.who)} ${b(e.actorLabel)} used ${b(e.move)}.`;
    case 'damage': return e.selfHit
      ? `${STATUS_CONDITIONS.Hallucination.icon} ${sideName(e.side, e.who)} ${b(e.targetLabel)} hit itself for ${b(e.amount)}.`
      : `${e.side === 'enemy' ? `${owner(e.who)} ${b(e.targetLabel)}` : `The boss`} took ${b(e.amount)} damage`
        + `${e.superEffective ? ' (super effective)' : e.notVeryEffective ? ' (not very effective)' : ''}`
        + `${e.sturdyBy ? ` — ${e.sturdyBy} held on` : e.savedBy ? ` — the ${e.savedBy} saved it` : ''} (${e.hpAfter}/${e.maxHp}).`;
    case 'faint': return `<span class="debuff">💫 ${e.side === 'enemy' ? 'The boss' : owner(e.who)} ${b(e.label)} fainted!</span>`;
    case 'switch': return `${owner(e.who)} ${b(e.label)} comes in.`;
    case 'heal': return `<span class="buff">${e.targetSide === 'enemy' ? 'The boss' : owner(e.who)} ${b(e.actorLabel)} healed ${e.amount} HP${e.fromAbility ? ` (${e.fromAbility})` : ''}.</span>`;
    case 'buff': case 'debuff': {
      const whose = e.targetSide === 'enemy' ? 'The boss' : owner(e.who);
      const stats = (e.stats || []).map(s => s.statLabel).join(', ');
      return `<span class="${e.type}">${whose} ${b(e.actorLabel)}'s ${stats} ${e.type === 'buff' ? 'rose' : 'fell'} ${e.pct}%${e.fromAbility ? ` (${e.fromAbility})` : ''}.</span>`;
    }
    case 'support':
      return `<span class="buff">📣 ${e.who === myRole ? 'You cheer on' : `${names[e.who] || 'Your friend'} cheers on`} `
        + `${owner(e.friendWho).replace(/^Your$/, 'your')} ${b(e.actorLabel)}: ${e.statLabel} +${e.pct}% (${e.before} → ${e.after})${e.auto ? ' — picked for them' : ''}.</span>`;
    case 'status':
      return `<span class="status-log">${e.icon} ${e.targetSide === 'enemy' ? 'The boss' : owner(e.who)} ${b(e.targetLabel)} `
        + (e.resisted ? `resists ${e.status} (${e.resisted}).` : e.already ? `already has ${e.status}.` : `now has ${b(e.status)}.`) + '</span>';
    case 'statusEnd': return `<span class="status-log">${e.targetSide === 'enemy' ? 'The boss' : owner(e.who)} ${b(e.targetLabel)} is no longer ${e.status}.</span>`;
    case 'statusBlocked': return `<span class="status-log">${sideName(e.side, e.who)} ${b(e.actorLabel)} couldn't move${e.reason && e.reason !== 'none' ? ` (${e.reason === 'ability' ? e.ability : e.reason})` : ''}.</span>`;
    case 'statusForced': return `<span class="status-log">${sideName(e.side, e.who)} ${b(e.actorLabel)} is stuck using ${b(e.move)}.</span>`;
    case 'skipped': return null;
    case 'partingShot': return `<span class="debuff">${sideName(e.side, e.who)} ${b(e.actorLabel)}'s ${e.ability} hit ${b(e.targetLabel)} for ${e.amount} on the way down.</span>`;
    case 'hpCost': return `<span class="debuff">${sideName(e.targetSide, e.who)} ${b(e.actorLabel)} paid ${e.amount} HP for the move.</span>`;
    case 'reflect': return e.fizzled ? null : `${sideName(e.side, e.who)} ${b(e.actorLabel)} reflected ${e.amount} damage.`;
    case 'sideFx': return `<span class="sidefx">${sideName(e.side, e.who)} ${b(e.actorLabel)} changed the battle${e.pct ? ` (${e.pct}%)` : ''}.</span>`;
    case 'statSwap': return `<span class="sidefx">${sideName(e.targetSide, e.who)} ${b(e.actorLabel)}'s stats were swapped.</span>`;
    case 'copyStats': return `${sideName(e.side, e.who)} ${b(e.actorLabel)} copied ${b(e.fromLabel)}'s stat changes.`;
    case 'held': return `<span class="held-log">◈ ${sideName(e.side, e.who)} ${b(e.actorLabel)} is holding a ${b(e.item)}.</span>`;
    case 'ability': return `<span class="ability">✦ ${sideName(e.side, e.who)} ${b(e.actorLabel)}: ${e.ability} ${e.active ? 'is in effect' : 'is not in effect'}.</span>`;
    case 'end': return `<b>${e.winner === 'player' ? 'The boss was beaten!' : 'Both teams were wiped out.'}</b>`;
    default: return null;
  }
}

/* ---------------------------------------------------------------
   Joining from the map
   --------------------------------------------------------------- */

/** The 👥 button on the map: asks for the code, then joins and opens the raid. */
export function openJoinDuo(openGuestRaid) {
  const wrap = el('div', { class: 'modal-wrap duo-join' });
  const close = () => wrap.remove();
  const input = el('input', { class: 'duo-code-input', maxlength: '4', placeholder: 'CODE', autocomplete: 'off',
    autocapitalize: 'characters', 'aria-label': 'Raid code' });
  const msg = el('p', { class: 'hint duo-msg' });
  const go = el('button', { class: 'btn primary', text: 'Join', onclick: async () => {
    go.disabled = true;
    msg.textContent = 'Joining…';
    const session = new DuoSession('guest');
    const res = await session.join(input.value);
    go.disabled = false;
    if (res.error) { msg.textContent = res.error; session.leave(); return; }
    close();
    openGuestRaid(res.raid, session, res.friend);
  } });
  wrap.append(
    el('div', { class: 'modal-backdrop', onclick: close }),
    el('div', { class: 'modal' },
      el('h3', { text: "👥 Join a friend's raid" }),
      el('p', { class: 'hint', text: 'Ask your friend for the 4-letter code on their raid screen. You can join if the raid creature is one you can find yourself.' }),
      input, msg,
      el('div', { class: 'btn-row' }, el('button', { class: 'btn ghost', text: 'Cancel', onclick: close }), go)));
  document.body.append(wrap);
  setTimeout(() => input.focus(), 50);
}

export const duoSleep = sleep;
export const duo$ = $;

/** For tests only: lets a test page swap the connection for an in-memory one. */
export const __duoTest = { Net };
