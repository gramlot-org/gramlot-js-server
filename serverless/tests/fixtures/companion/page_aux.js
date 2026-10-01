/** Companion of page.js: every call is counted on globalThis.gramlotSentinel. */
export class Logic {
    prepara(kwargs) {
        globalThis.gramlotSentinel = (globalThis.gramlotSentinel ?? 0) + 1;
        return `${kwargs.base}: ${kwargs._reason}`;
    }
}
