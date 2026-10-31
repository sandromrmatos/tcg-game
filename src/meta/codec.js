// ============================================================================
// SAVE CODEC
//
// Packs a save into a small text blob and back, using the same format as
// Search and Go: "TCGZ1:" + base64(gzip(JSON)). A save is repetitive JSON, so
// gzip keeps the localStorage backup copies small.
//
// Falls back to plain JSON when the browser has no CompressionStream, and
// unpackText reads either form.
// ============================================================================

const SaveCodec = (() => {
    const PACK_PREFIX = 'TCGZ1:';

    const canCompress = () =>
        typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

    /** Uint8Array -> base64, in slices so a large save cannot blow the stack. */
    function bytesToBase64(bytes) {
        let bin = '';
        const STEP = 0x8000;
        for (let i = 0; i < bytes.length; i += STEP) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + STEP));
        }
        return btoa(bin);
    }

    function base64ToBytes(b64) {
        const bin = atob(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    async function pipe(bytes, stream) {
        const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
        return new Uint8Array(await res.arrayBuffer());
    }

    /** JSON text -> packed text (or the JSON unchanged if gzip is unavailable). */
    async function packText(json) {
        if (!canCompress()) return json;
        const gz = await pipe(new TextEncoder().encode(json), new CompressionStream('gzip'));
        return PACK_PREFIX + bytesToBase64(gz);
    }

    /** Packed text or plain JSON -> JSON text. Throws if it is neither. */
    async function unpackText(text) {
        let t = String(text == null ? '' : text).trim();
        if (t.length > 1 && t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
        if (t.startsWith('{')) return t;
        // Accept the bare base64 too: "H4sI" is how every gzip stream starts.
        const b64 = t.startsWith(PACK_PREFIX) ? t.slice(PACK_PREFIX.length)
            : t.startsWith('H4sI') ? t : null;
        if (b64 == null) throw new Error('not a save');
        if (!canCompress()) throw new Error('This browser cannot unpack compressed saves');
        const raw = await pipe(base64ToBytes(b64.replace(/\s+/g, '')), new DecompressionStream('gzip'));
        return new TextDecoder().decode(raw);
    }

    /** Whether a string is nothing at all: empty, whitespace or NUL bytes. */
    const isBlankText = text => !String(text == null ? '' : text).replace(/[\s\u0000]+/g, '');

    return { PACK_PREFIX, packText, unpackText, isBlankText };
})();
