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
- The build imports the module in Node (as `GramlotFileServer`) for `Page.css` and `Logic`;
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
- `js_requires` groups need a resource system; `GramlotWorkerServer` resolves `Page.css`,
  the page stylesheet and the page logic.

<a id="gs-115-015"></a>

## 015 · Stylesheets and styles

Block ID: **GS-115-015**.

`Page.css`: array of strings, else start error. `<name>.css` loads after it.

| Export | `Page.css` and `<name>.css` |
| --- | --- |
| One file | `<style>` in load order: the theme of the page first (base theme, `css_theme`, none for `false`), `Page.css`, `<name>.css`; `/themes/…` from the `@gramlot/gramlot` package, other URLs from the page folder; `http(s)://`, `//`, `.`/`..`, missing file → build error |
| Directory | Links; root-relative URLs inside the export (folder build copies the folder's files, `buildDirectory` the listed `assets`); the theme of each page and `/themes/…` copied from the core; `<name>.css` → `assets/styles/<route>.css`; relative, `//`, `.`/`..` refused |

<a id="gs-115-020"></a>

## 020 · Source methods in the Worker

Block ID: **GS-115-020**.

Declare Source fragments with `Page.registerSource` and mount them with `remote`;
use `dataRpc` for endpoint values and `dataRemote` for lazy Data. See the
[shared authoring guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/095-writing-pages.md#gc-095-100).
The Worker answers them with the envelope `contentType: 'source'` ([Reference](130-reference.md)).

<a id="gs-115-025"></a>

## 025 · What the export contains and what it does not

Block ID: **GS-115-025**.

Contains: runtime, `GramlotWorkerServer` with the page, the page logic, the stylesheets,
runtime notices as inert JSON (file) or `assets/runtime-notices.json` (directory).
Not: unimported code, an external application server or database.
`dataRpc`, `remote` and `dataRemote` execute bundled Page methods in the Worker;
they provide neither a Python server nor persistent server state. All public:
no secrets in pages or their modules.

**Learning path.** Follow the [shared release-by-release example sequence](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-015) after this
environment's setup. Revisit examples when a later release simplifies the code;
prerequisite links support that chronology. The gallery is a source viewer, not a file editor. Edit a
separate project; Page runs on the host and Logic in the browser (the standalone
host is a JavaScript Worker). Reload/reopen after saving; development reload is
not automatic hot reload. The sequence explains inline and named Logic in their
release context; use named Logic for reusable behavior. Inline examples require the
documented CSP profile. Common examples do not cover every advanced case.

<a id="gs-115-035"></a>
## 035 · Page formatting context

Block ID: **GS-115-035**.

Development support: declare `static locale = 'it-IT'` and
`static timeZone = 'Europe/Rome'` on Page. The Worker transports this metadata
to the browser instance; it does not format with the Worker's environment.
`gramlot.format` and live HTML text declared with `format` use this context.
Call or node options override the page. Omitted page settings use the browser
locale/timezone at startup. Masks use `{}`; migrate legacy `%s`.
Example: `root.p('^amount', {format: '0.00', mask: 'Total: {}'})`.
See the core's [formatting contract](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html#gc-095-125)
for supported patterns, explicit dtype and current static-rendering limits.
