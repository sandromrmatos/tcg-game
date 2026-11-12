// ============================================================================
// PERSIST — durable local save layer (mirrors Search and Go, minus the cloud)
//
// Cooperating layers, strongest first:
//   1. Optional real files on the device via the File System Access API
//      (Chrome/Edge desktop and Android). Up to two, written in turn, so a
//      device dying mid-write can only damage one of them.
//   2. IndexedDB as the always-on working copy, plus rolling snapshots.
//   3. A compressed copy in localStorage, in two alternating slots.
//   4. A small "a save exists" marker in localStorage, so a save that vanished
//      is noticed instead of being mistaken for a brand-new player.
//   5. Manual download / import of a .json backup, which works everywhere.
//
// Plain script (no ES modules) so the game still runs from file://.
// ============================================================================

const Persist = (() => {
    const DB_NAME = 'tcg-collection';
    const DB_VERSION = 1;
    const KV_STORE = 'kv';
    const KEY_SAVE = 'save';
    const KEY_HANDLE = 'saveFileHandle';
    const KEY_HANDLE_B = 'saveFileHandleB';
    const KEY_SNAPSHOTS = 'snapshots';

    const LS_MARKER = 'tcg.saveMarker';
    const LS_BACKUP_KEYS = ['tcg.backup.a', 'tcg.backup.b'];

    const SAVE_FILENAME = 'tcg-collection-save.json';
    const SAVE_FILENAME_B = 'tcg-collection-save-B.json';

    const SNAPSHOT_KEEP = 6;
    const SNAPSHOT_GAP_MS = 3 * 3600000;     // 3 hours
    const FILE_WRITE_GAP_MS = 20000;
    const LOCAL_BACKUP_GAP_MS = 60000;

    const MSG_EMPTY_FILE =
        'That file is empty — there is no save data in it. This happens when a save is cut off, '
        + 'for example by the phone switching off. Try an older backup.';
    const MSG_DAMAGED_FILE =
        'That file is damaged and could not be read as a save. Try an older backup.';
    const MSG_NOT_A_SAVE = 'That file is not a TCG collection save.';

    let idb = null;

    /** How much progress a save represents, and whether it is effectively blank. */
    function progressOf(save) {
        if (!save || typeof save !== 'object') {
            return { unique: 0, copies: 0, games: 0, gems: 0, empty: true };
        }
        const cards = save.cards && typeof save.cards === 'object' ? save.cards : {};
        let unique = 0, copies = 0;
        for (const qty of Object.values(cards)) {
            const n = Number(qty) || 0;
            if (n > 0) { unique++; copies += n; }
        }
        const games = Number(save.stats && save.stats.played) || 0;
        const claims = save.missionsClaimed ? Object.keys(save.missionsClaimed).length : 0;
        const gems = Number(save.gems) || 0;
        return { unique, copies, games, gems, empty: copies === 0 && games === 0 && claims === 0 };
    }

    /** Whether a parsed object has the shape of a save at all. */
    const looksLikeSave = o =>
        !!o && typeof o === 'object' && !Array.isArray(o)
        && (o.app === 'tcg-collection' || ('cards' in o && 'credits' in o));

    function friendly(message) {
        const e = new Error(message);
        e.friendly = true;
        return e;
    }

    /** Text -> save object, with a player-facing error for each failure. */
    async function parseSaveText(text) {
        if (SaveCodec.isBlankText(text)) throw friendly(MSG_EMPTY_FILE);
        let json;
        try { json = await SaveCodec.unpackText(text); }
        catch (e) { throw friendly(MSG_DAMAGED_FILE); }
        let data;
        try { data = JSON.parse(json); }
        catch (e) { throw friendly(MSG_DAMAGED_FILE); }
        if (!looksLikeSave(data)) throw friendly(MSG_NOT_A_SAVE);
        return data;
    }

    // ---------------------------------------------------------------
    // localStorage helpers: reads swallow errors, writes let quota errors through
    // ---------------------------------------------------------------
    function lsGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function lsSet(key, value) {
        localStorage.setItem(key, value);
    }
    function lsDel(key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }

    function readMarker() {
        try {
            const m = JSON.parse(lsGet(LS_MARKER) || 'null');
            return m && typeof m === 'object' ? m : null;
        } catch (e) { return null; }
    }

    const markerHasProgress = m => !!(m && m.progress && (m.progress.copies > 0 || m.progress.games > 0));

    // ---------------------------------------------------------------
    // IndexedDB primitives
    // ---------------------------------------------------------------
    function openIDB() {
        if (idb) return Promise.resolve(idb);
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
            };
            req.onsuccess = () => { idb = req.result; resolve(idb); };
            req.onerror = () => reject(req.error);
        });
    }

    async function idbGet(key) {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(KV_STORE, 'readonly');
            const r = tx.objectStore(KV_STORE).get(key);
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        });
    }

    async function idbSet(key, value) {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(KV_STORE, 'readwrite');
            tx.objectStore(KV_STORE).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function idbDel(key) {
        const db = await openIDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(KV_STORE, 'readwrite');
            tx.objectStore(KV_STORE).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    const P = {
        SAVE_FILENAME, MSG_EMPTY_FILE, MSG_DAMAGED_FILE, MSG_NOT_A_SAVE,
        progressOf, looksLikeSave, parseSaveText, readMarker,

        supportsFS: typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function',
        fileHandle: null,
        fileHandleB: null,
        filePermission: 'prompt',
        filePermissionB: 'prompt',
        persisted: false,
        idbAvailable: true,
        lastError: null,
        lastFileWriteAt: 0,
        lastFileError: null,
        lastLocalBackupAt: 0,
        lastLocalBackupError: null,
        guardTripped: null,
        onStatusChange: null,
        _nextFile: 0,
        _nextLocal: 0,
        _pendingFile: null,
        _fileTimer: null,
        _fileChain: Promise.resolve(),

        async init() {
            try {
                if (navigator.storage && navigator.storage.persist) {
                    this.persisted = (navigator.storage.persisted && await navigator.storage.persisted()) || false;
                    if (!this.persisted) this.persisted = await navigator.storage.persist();
                }
            } catch (e) { /* non-fatal */ }

            try { await openIDB(); }
            catch (e) { this.idbAvailable = false; this.lastError = e; }

            if (this.supportsFS && this.idbAvailable) {
                try {
                    const h = await idbGet(KEY_HANDLE);
                    if (h) { this.fileHandle = h; this.filePermission = await this._queryPerm(h); }
                    const hb = await idbGet(KEY_HANDLE_B);
                    if (hb) { this.fileHandleB = hb; this.filePermissionB = await this._queryPerm(hb); }
                } catch (e) {
                    this.lastError = e;
                    this.filePermission = 'prompt';
                }
            }

            // Carry on writing the older localStorage slot, so the newer one
            // survives the next write whatever happens to it.
            const slots = this._localEntries();
            if (slots[0] && slots[1]) this._nextLocal = slots[0].savedAt <= slots[1].savedAt ? 0 : 1;
            else this._nextLocal = slots[0] ? 1 : 0;

            this._emit();
            return this;
        },

        async _queryPerm(handle) {
            try {
                if (!handle || !handle.queryPermission) return 'granted';
                return await handle.queryPermission({ mode: 'readwrite' });
            } catch (e) { return 'prompt'; }
        },

        _emit() { try { if (this.onStatusChange) this.onStatusChange(this.status()); } catch (e) { /* ignore */ } },

        _writableFiles() {
            const out = [];
            if (this.fileHandle && this.filePermission === 'granted') out.push(this.fileHandle);
            if (this.fileHandleB && this.filePermissionB === 'granted') out.push(this.fileHandleB);
            return out;
        },

        status() {
            const autoFileSave = !!this.fileHandle && this.filePermission === 'granted';
            return {
                supportsFS: this.supportsFS,
                linked: !!this.fileHandle,
                fileName: this.fileHandle ? this.fileHandle.name : null,
                filePermission: this.filePermission,
                linkedB: !!this.fileHandleB,
                fileNameB: this.fileHandleB ? this.fileHandleB.name : null,
                filePermissionB: this.filePermissionB,
                persisted: this.persisted,
                idbAvailable: this.idbAvailable,
                autoFileSave,
                twoFiles: autoFileSave && !!this.fileHandleB && this.filePermissionB === 'granted',
                lastFileWriteAt: this.lastFileWriteAt,
                lastFileError: this.lastFileError ? (this.lastFileError.message || String(this.lastFileError)) : null,
                lastLocalBackupAt: this.lastLocalBackupAt,
                lastLocalBackupError: this.lastLocalBackupError
                    ? (this.lastLocalBackupError.message || String(this.lastLocalBackupError)) : null,
                guardTripped: this.guardTripped
            };
        },

        // ---------- loading ----------

        /**
         * Reads the newest available save: whichever of the device files or the
         * IndexedDB copy has the later savedAt. `readFailed`, `recoverable` and
         * `missing` let the caller refuse to start a fresh account over a save
         * it merely failed to read.
         */
        async load() {
            let fromIDB = null, fromFile = null, readFailed = false;

            if (this.idbAvailable) {
                try { fromIDB = (await idbGet(KEY_SAVE)) || null; }
                catch (e) { this.lastError = e; readFailed = true; }
            }

            const files = [[this.fileHandle, this.filePermission], [this.fileHandleB, this.filePermissionB]];
            for (const [h, perm] of files) {
                if (!h || perm !== 'granted') continue;
                try {
                    const d = await this._readFile(h);
                    if (d && (!fromFile || (d.savedAt || 0) > (fromFile.savedAt || 0))) fromFile = d;
                } catch (e) {
                    this.lastError = e;
                    readFailed = true;
                }
            }

            // Without IndexedDB (some file:// setups) the localStorage copy is
            // the working copy, so load it directly.
            if (!this.idbAvailable && !fromFile) {
                const local = await this.newestLocalBackup(true);
                if (local) return { data: local.data, source: 'browser backup', readFailed, recoverable: null, missing: false };
            }

            let recoverable = null, missing = false;
            if (!fromIDB && !fromFile) {
                const snap = await this.newestSnapshot();
                const local = await this.newestLocalBackup();
                recoverable = [snap, local].filter(Boolean)
                    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0] || null;
                missing = markerHasProgress(readMarker());
            }

            if (fromFile && fromIDB) {
                const pick = (fromFile.savedAt || 0) > (fromIDB.savedAt || 0) ? fromFile : fromIDB;
                return { data: pick, source: pick === fromFile ? 'file' : 'idb', readFailed, recoverable, missing };
            }
            if (fromFile) return { data: fromFile, source: 'file', readFailed, recoverable, missing };
            if (fromIDB) return { data: fromIDB, source: 'idb', readFailed, recoverable, missing };
            return { data: null, source: 'none', readFailed, recoverable, missing };
        },

        async _readFile(handle) {
            const file = await handle.getFile();
            if (file.size === 0) return null;            // freshly linked, never written
            return parseSaveText(await file.text());
        },

        // ---------- saving ----------

        /**
         * Writes to every available layer. Guarded: a blank account is never
         * allowed to overwrite a save that still holds progress. Deliberate
         * wipes (reset, import) pass `force: true`. `urgent` writes the files
         * and the localStorage copy now rather than on their timers.
         * @returns {Promise<number|null>} the savedAt stamp, or null if refused.
         */
        async writeNow(data, { force = false, urgent = false } = {}) {
            const progress = progressOf(data);
            if (!force && progress.empty) {
                let existing = null;
                if (this.idbAvailable) {
                    try { existing = (await idbGet(KEY_SAVE)) || null; } catch (e) { /* fall through */ }
                }
                const before = progressOf(existing);
                const marker = readMarker();
                if ((existing && !before.empty) || markerHasProgress(marker)) {
                    this.guardTripped = {
                        at: Date.now(),
                        existing: existing && !before.empty ? before : Object.assign({}, marker.progress, { empty: false }),
                        existingSavedAt: Number((existing && existing.savedAt) || (marker && marker.savedAt)) || 0
                    };
                    this._emit();
                    return null;
                }
            }

            const payload = Object.assign({}, data, { savedAt: Date.now() });
            if (this.idbAvailable) {
                try { await idbSet(KEY_SAVE, payload); }
                catch (e) { this.lastError = e; }
            }

            try {
                if (!progress.empty) {
                    lsSet(LS_MARKER, JSON.stringify({ savedAt: payload.savedAt, progress }));
                } else if (force) {
                    lsDel(LS_MARKER);
                }
            } catch (e) { /* a full quota only costs the marker */ }

            this._queueFileWrite(payload, { now: urgent || force });
            if (urgent || force) await this._fileChain;

            // Without IndexedDB the localStorage copy is the only copy, so write it every time.
            const localDue = !this.idbAvailable || urgent || force
                || payload.savedAt - this.lastLocalBackupAt >= LOCAL_BACKUP_GAP_MS;
            if ((!progress.empty || !this.idbAvailable) && localDue) {
                await this._writeLocalBackup(payload);
            } else if (progress.empty && force) {
                LS_BACKUP_KEYS.forEach(lsDel);
            }

            await this._maybeSnapshot(payload);
            this.guardTripped = null;
            this._emit();
            return payload.savedAt;
        },

        _queueFileWrite(payload, { now = false } = {}) {
            if (!this._writableFiles().length) return;
            this._pendingFile = payload;
            const wait = now ? 0 : Math.max(0, FILE_WRITE_GAP_MS - (Date.now() - this.lastFileWriteAt));
            if (wait === 0) {
                clearTimeout(this._fileTimer);
                this._fileTimer = null;
                this._fileChain = this._fileChain.then(() => this._writeFileNow());
            } else if (!this._fileTimer) {
                this._fileTimer = setTimeout(() => {
                    this._fileTimer = null;
                    this._fileChain = this._fileChain.then(() => this._writeFileNow());
                }, wait);
            }
        },

        async _writeFileNow() {
            const payload = this._pendingFile;
            if (!payload) return;
            this._pendingFile = null;
            const files = this._writableFiles();
            if (!files.length) return;

            const target = files[this._nextFile % files.length];
            const isB = target === this.fileHandleB;
            try {
                await this._writeTo(target, payload);
                this.lastFileWriteAt = Date.now();
                this.lastFileError = null;
                this._nextFile = (this._nextFile + 1) % 2;
            } catch (e) {
                this.lastError = e;
                this.lastFileError = e;
                if (isB) this.filePermissionB = await this._queryPerm(target);
                else this.filePermission = await this._queryPerm(target);
                this._nextFile = (this._nextFile + 1) % 2;
            }
            this._emit();
        },

        async _writeTo(handle, payload) {
            const writable = await handle.createWritable();
            await writable.write(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
            await writable.close();
        },

        // ---------- localStorage A/B copies ----------

        _localEntries() {
            return LS_BACKUP_KEYS.map(key => {
                try {
                    const e = JSON.parse(lsGet(key) || 'null');
                    return e && typeof e.data === 'string' ? Object.assign({}, e, { key }) : null;
                } catch (err) { return null; }
            });
        },

        async _writeLocalBackup(payload) {
            try {
                const packed = await SaveCodec.packText(JSON.stringify(payload));
                const entry = JSON.stringify({
                    savedAt: payload.savedAt, progress: progressOf(payload), data: packed
                });
                const key = LS_BACKUP_KEYS[this._nextLocal];
                try {
                    lsSet(key, entry);
                } catch (e) {
                    // Out of room: drop the slot being replaced and retry once.
                    // The other slot is left alone, so one good copy remains.
                    lsDel(key);
                    lsSet(key, entry);
                }
                this._nextLocal = (this._nextLocal + 1) % 2;
                this.lastLocalBackupAt = payload.savedAt;
                this.lastLocalBackupError = null;
            } catch (e) {
                this.lastLocalBackupError = e;   // never let this break a real save
            }
        },

        /** The newest localStorage copy that unpacks to a save, or null. */
        async newestLocalBackup(allowEmpty = false) {
            const list = this._localEntries().filter(Boolean)
                .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
            for (const e of list) {
                try {
                    const data = await parseSaveText(e.data);
                    if (!allowEmpty && progressOf(data).empty) continue;
                    return { savedAt: e.savedAt, progress: progressOf(data), data, source: 'browser backup' };
                } catch (err) { /* damaged slot: try the other */ }
            }
            return null;
        },

        // ---------- rolling snapshots ----------

        async _maybeSnapshot(payload) {
            if (!this.idbAvailable || progressOf(payload).empty) return;
            try {
                const list = (await idbGet(KEY_SNAPSHOTS)) || [];
                const last = list[list.length - 1];
                if (last && (payload.savedAt - (last.savedAt || 0)) < SNAPSHOT_GAP_MS) return;
                list.push({ savedAt: payload.savedAt, progress: progressOf(payload), data: payload });
                while (list.length > SNAPSHOT_KEEP) list.shift();
                await idbSet(KEY_SNAPSHOTS, list);
            } catch (e) {
                this.lastError = e;
            }
        },

        async snapshots() {
            if (!this.idbAvailable) return [];
            try { return (await idbGet(KEY_SNAPSHOTS)) || []; }
            catch (e) { return []; }
        },

        async newestSnapshot() {
            const list = await this.snapshots();
            for (let i = list.length - 1; i >= 0; i--) {
                if (list[i] && !progressOf(list[i].data).empty) return Object.assign({}, list[i], { source: 'snapshot' });
            }
            return null;
        },

        // ---------- device file linking ----------

        async _pickSaveFile(suggestedName) {
            if (!this.supportsFS) throw new Error('This browser cannot write directly to device files. Use "Download backup" instead.');
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [{ description: 'TCG collection save', accept: { 'application/json': ['.json'] } }]
            });
            const perm = handle.requestPermission ? await handle.requestPermission({ mode: 'readwrite' }) : 'granted';
            if (perm !== 'granted') throw new Error('Write permission was not granted.');
            return handle;
        },

        async linkFile(data) {
            const handle = await this._pickSaveFile(SAVE_FILENAME);
            if (this.fileHandleB && handle.isSameEntry && await handle.isSameEntry(this.fileHandleB)) {
                throw new Error('That is already your second save file. Pick a different file.');
            }
            this.fileHandle = handle;
            this.filePermission = 'granted';
            if (this.idbAvailable) await idbSet(KEY_HANDLE, handle);
            this._nextFile = 0;
            await this.writeNow(data, { urgent: true });
            this._emit();
            return this.status();
        },

        async linkSecondFile(data) {
            if (!this.fileHandle) throw new Error('Link your main save file first.');
            const handle = await this._pickSaveFile(SAVE_FILENAME_B);
            if (handle.isSameEntry && await handle.isSameEntry(this.fileHandle)) {
                throw new Error('That is your main save file. Pick a different file for the second copy.');
            }
            this.fileHandleB = handle;
            this.filePermissionB = 'granted';
            if (this.idbAvailable) await idbSet(KEY_HANDLE_B, handle);
            this._nextFile = 1;
            await this.writeNow(data, { urgent: true });
            this._emit();
            return this.status();
        },

        /** Re-asks for permission on a linked file whose permission lapsed. */
        async regrant() {
            if (!this.fileHandle || !this.fileHandle.requestPermission) return this.filePermission;
            try { this.filePermission = await this.fileHandle.requestPermission({ mode: 'readwrite' }); }
            catch (e) { this.filePermission = 'prompt'; }
            if (this.fileHandleB && this.fileHandleB.requestPermission) {
                try { this.filePermissionB = await this.fileHandleB.requestPermission({ mode: 'readwrite' }); }
                catch (e) { this.filePermissionB = 'prompt'; }
            }
            this._emit();
            return this.filePermission;
        },

        /** Pick an existing save file, adopt it as the main file, return its data. */
        async openFile() {
            if (!this.supportsFS || !window.showOpenFilePicker) throw new Error('This browser cannot open device files directly. Use "Import backup" instead.');
            const [handle] = await window.showOpenFilePicker({
                types: [{ description: 'TCG collection save', accept: { 'application/json': ['.json'] } }]
            });
            const file = await handle.getFile();
            if (file.size === 0) throw friendly(MSG_EMPTY_FILE);
            const data = await parseSaveText(await file.text());
            const perm = handle.requestPermission ? await handle.requestPermission({ mode: 'readwrite' }) : 'granted';
            if (perm === 'granted') {
                this.fileHandle = handle;
                this.filePermission = 'granted';
                if (this.idbAvailable) await idbSet(KEY_HANDLE, handle);
            }
            this._emit();
            return data;
        },

        // ---------- manual backup ----------

        /** True on iPhone / iPad (iPadOS reports itself as a Mac with a touch screen). */
        isIOS() {
            const ua = navigator.userAgent || '';
            return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
        },

        /**
         * Saves a backup file. Must be called straight from a tap: the share
         * sheet is only allowed during the tap itself.
         *
         * iOS ignores a link's `download` attribute in many cases (always in
         * the home-screen app and inside the arcade's frame) and does so
         * silently, so on iPhone/iPad the file goes through the share sheet,
         * where "Save to Files" keeps it.
         *
         * @returns {Promise<'shared'|'downloaded'|'opened'|'cancelled'>}
         */
        async download(data, filename = SAVE_FILENAME) {
            const payload = Object.assign({}, data, { savedAt: Date.now() });
            const text = JSON.stringify(payload, null, 2);

            if (this.isIOS()) {
                const file = typeof File === 'function' ? new File([text], filename, { type: 'application/json' }) : null;
                if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({ files: [file], title: 'TCG backup' });
                        return 'shared';
                    } catch (err) {
                        if (err && err.name === 'AbortError') return 'cancelled';
                        console.warn('[persist] share failed', err);
                    }
                }
                // Older iOS: show the file in a new tab, where it can be shared or saved.
                const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
                const opened = window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 60000);
                if (opened) return 'opened';
            }

            const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
            return 'downloaded';
        },

        async importFile(file) {
            if (!file || file.size === 0) throw friendly(MSG_EMPTY_FILE);
            return parseSaveText(await file.text());
        },

        async wipe() {
            if (!this.idbAvailable) return;
            try { await idbDel(KEY_SAVE); } catch (e) { /* ignore */ }
        }
    };

    return P;
})();
