/** Companion of page.js: named logic runs in the window, never in the Worker. */
export class Logic {
    greeting(kwargs) { return `Hello, ${kwargs.name}`; }
}
