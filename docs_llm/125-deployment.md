# 125 · Deployment

Document ID: **GS-125**.

[Paired view](../docs/125-deployment.md).

<a id="gs-125-005"></a>

## 005 · Opening from disk

Block ID: **GS-125-005**.

Single file: double-click or `file://`. Directory: `index.html`, routes at
`<route>/index.html`; relative paths to `assets/`, `assetRoot` = the directory;
move it as a whole (runtime, workers, stylesheets, copied files). No network request at start
(`serverless/scripts/verify_quickstart_browser.mjs` blocks HTTP(S)). Recipients need a
browser, not Node.

<a id="gs-125-010"></a>

## 010 · Static hosting

Block ID: **GS-125-010**.

Any static server. Single file as `text/html`; the policy is in the document, no
header needed; connections open (`connect-src *`). Directory as is,
under any prefix, with `text/html`, `text/javascript` (`assets/`) and `text/css`;
no rewrites; the documents carry no policy, the server may set one: the
documents load scripts from `assets/` and start a Blob Worker and a Blob module,
so a server policy must allow `'self'` and `blob:` for scripts and workers (a
server header is not tested in this repository). The single file changes at every
build; `assets/standalone.js` changes with the core version.

<a id="gs-125-015"></a>

## 015 · Security notes

Block ID: **GS-125-015**.

Nothing dynamic: only imported code, page logic, stylesheets, copied files. The
page logic is public: no server-only logic in an export. Typed data stay in the
user's browser; they leave only through `gramlot.utl.inout` or page code
([No server: a tutorial](135-serverless-tutorial.md)). The single file runs the inline code of its
Source; the core runs no code written later, refuses inline code read from Data,
`on<event>` attributes and `javascript:` URLs. The
Worker talks to no server. Build pages from trusted folders only: imports are
bundled as they are.

<a id="gs-125-020"></a>

## 020 · Production checklist

Block ID: **GS-125-020**.

1. `npm test` and `verify_quickstart_browser.mjs` pass with the shipped core
   version.
2. `Page.css` URLs root-relative or `/themes/…`, files in the pages folder.
3. Logic in `Logic` or short inline code; no server-only import.
4. The export opens from `file://` without console errors.
5. The runtime notices travel with the export.
