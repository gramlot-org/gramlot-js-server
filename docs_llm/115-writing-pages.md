# 115 · Writing pages for this host

Document ID: **GS-115**.

[Paired view](../docs/115-writing-pages.md).

Binding: the core's [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).
Here: what is specific to the export without a server.

<a id="gs-115-005"></a>

## 005 · Files and folders

Block ID: **GS-115-005**.

- Page: `.js`/`.mjs` exporting `class Page` extends the core `Page`; no `Page` →
  build error `The module exports no class Page`; not a subclass → start error.
- Import the core as `@gramlot/gramlot` (npm); another name bundles a second copy.
- `*_aux.js` is never a page.
- Browser-compatible imports only (esbuild); `node:*` fails the build, output kept.
- The build imports the module in Node (as `FileHost`) for `Page.css` and `Logic`;
  `main` runs only in the Worker; module-level code runs at build.

Folder: `build pages -o dist`: first-level `.js`/`.mjs` = pages (`index.js` →
index, `about.js` → `about/index.html`); names `[a-z][a-z0-9_-]*`; subfolders hold
imported modules (bundled); other files copied, dot names skipped. Links name the
file (`about/index.html`, `../index.html`): same link from disk, static host and
js-server.

<a id="gs-115-010"></a>

## 010 · The page logic

Block ID: **GS-115-010**.

`Logic` of the page module, else `<name>_aux.js`; both → `Two logic modules for
one page`. Root group: `func: 'greeting'`; formula `method(kwargs)`, controller
`method(node, kwargs)`.

- Bundled as one ES module for the window; `@gramlot/gramlot/page` → the core of
  the window (`GramlotStandalone`): one core copy, small module.
- The Worker returns the URL (`/<name>.js` or `/<name>_aux.js`); the window maps it
  to a Blob URL; a failing import stops the start and releases the Worker.
- Inline code runs in the window (`'unsafe-eval'` in the file, no policy in the
  directory; [Configuration](120-configuration.md)).
- `js_requires` groups need a resource system; `WorkerHost` resolves `Page.css`,
  the page stylesheet and the page logic.

<a id="gs-115-015"></a>

## 015 · Stylesheets and styles

Block ID: **GS-115-015**.

`Page.css`: array of strings, else start error. `<name>.css` loads after it.

| Export | `Page.css` and `<name>.css` |
| --- | --- |
| One file | `<style>` in load order; `/themes/…` from the `@gramlot/gramlot` package, other URLs from the page folder; `http(s)://`, `//`, `.`/`..`, missing file → build error |
| Directory | Links; root-relative URLs inside the export (folder build copies the folder's files, `buildDirectory` the listed `assets`); `/themes/…` copied from the core; `<name>.css` → `assets/styles/<route>.css`; relative, `//`, `.`/`..` refused |

<a id="gs-115-020"></a>

## 020 · Source methods in the Worker

Block ID: **GS-115-020**.

`source(Page.prototype.method)`; the window calls `gramlot.remoteSource(node,
'method', params)` → Worker → branch by message. `main` and unmarked methods:
`Unknown Source method`. `params` must clone (`DataCloneError` for functions). Fresh
Page per call. Registry TTL 1800 s (core default): later calls fail `Unknown,
expired or unowned page`; reload the file.

<a id="gs-115-025"></a>

## 025 · What the export contains and what it does not

Block ID: **GS-115-025**.

Contains: runtime, `WorkerHost` with the page, the page logic, the stylesheets,
runtime notices as inert JSON (file) or `assets/runtime-notices.json` (directory).
Not: unimported code, server, database, `dataRpc`, server resolvers. All public:
no secrets in pages or their modules.
