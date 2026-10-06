# 115 · Writing pages for this host

Document ID: **GS-115**.

[Paired view](../docs_llm/115-writing-pages.md).

The binding itself (pointers, setters, formulas, controllers, events) is the
core's: read [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).
This guide covers what is specific to the export without a server.

<a id="gs-115-005"></a>

## 005 · Files and folders

Block ID: **GS-115-005**.

- A page is a `.js` or `.mjs` module that exports `class Page` extending the core
  `Page` from `@gramlot/gramlot/page`. A module without `Page` fails the build with
  `The module exports no class Page: <file>`; a `Page` that does not extend the
  core class fails at start with `Page modules must export a subclass of Page`.
- The page imports the core under the same name the exporter uses,
  `@gramlot/gramlot`, installed from npm. A page that imports another name of the
  same core bundles a second copy, and the start fails with the error above.
- A `*_aux.js` file is never accepted as a page:
  `A *_aux file is a page companion, not a page`.
- Imports must be browser-compatible. The page and its imports are bundled for the
  Worker with esbuild: a Node-only import (`node:fs`, …) fails the build, and the
  existing output is kept.
- The build imports the page module in Node, as the core `FileHost` does, to read
  `Page.css` and the `Logic` export; `main` runs only in the Worker. Module-level
  code of the page runs at build time too.

**A folder of pages.** `gramlot-serverless build pages -o dist` takes every `.js`
and `.mjs` file at the first level of `pages/` as a page: `index.js` is the index,
`about.js` the page `about/` (`dist/about/index.html`). A page name starts with a
lowercase letter, followed by lowercase letters, digits, `_` or `-`. Modules
imported by the pages live in subfolders; they are bundled, not copied. Every
other file of the folder (stylesheets, images) is copied to the same relative
path, except names that start with a dot. A link between pages names the file:
`about/index.html` from the index, `../index.html` back; the same link works from
the folder on disk, on a static host and with `@gramlot/gramlot-js-server`.

<a id="gs-115-010"></a>

## 010 · The page logic

Block ID: **GS-115-010**.

The page logic is the `Logic` export of the page module; else the module
`<name>_aux.js` beside `<name>.js`, which exports `Logic`. A page with both is an
error at build: `Two logic modules for one page`. The methods of `Logic` are the
root logic group of the page: `func: 'greeting'` names `Logic.prototype.greeting`.
A formula method is called as `method(kwargs)` and returns the value; a controller
method as `method(node, kwargs)`.

- The exporter bundles the `Logic` export as one ES module for the window. Its
  import of `@gramlot/gramlot/page` resolves to the core of the window
  (`GramlotStandalone`), so the window holds one copy of the core and the module
  stays small.
- The Worker returns only the URL that names the logic module (`/<name>.js` or
  `/<name>_aux.js`). The window replaces it with a Blob URL and `PageBootstrap`
  imports it before the page starts. A failing import stops the start and
  releases the Worker.
- Inline code (`formula`, `script`, `==`, `action`, `connect_on<event>`,
  `_if`/`_else`) runs in the window: the single file allows `'unsafe-eval'`, the
  directory has no policy ([Configuration](120-configuration.md)). A short
  computation fits inline; a longer one belongs in a method of `Logic`.
- `js_requires` groups (`func: 'business.discount'`) need a Host with a resource
  system. `WorkerHost` resolves `Page.css`, the page stylesheet and the page logic.

<a id="gs-115-015"></a>

## 015 · Stylesheets and styles

Block ID: **GS-115-015**.

`Page.css` is a static array of URL strings, as in `<link href>`. Anything else
fails with `Standalone Page.css must be an array of strings`. `<name>.css` beside
the page file is its stylesheet, loaded after the `Page.css` URLs.

| Export | `Page.css` and `<name>.css` |
| --- | --- |
| One file (`build page.js`) | Written into the file as `<style>` elements, in load order. `/themes/…` is read from the `@gramlot/gramlot` package (`/themes/gramlot-base/theme.css`); any other URL (`/site.css`, `site.css`) from the folder of the page. `http(s)://`, `//…`, a `.`/`..` segment or a missing file fail the build. |
| Directory (`build pages`, `buildDirectory`) | Links. Root-relative URLs (`/site.css`) resolve inside the export directory: the folder build copies the files of the folder; `buildDirectory` copies the files listed in `assets`. `/themes/…` URLs are copied from the core package. `<name>.css` is written to `assets/styles/<route>.css`. A relative URL, `//…`, or a `.`/`..` segment is refused at start. |

A URL that points outside the export is not served by anything.

<a id="gs-115-020"></a>

## 020 · Source methods in the Worker

Block ID: **GS-115-020**.

Source methods (`source(...)`, `remoteSource`) are not yet part of the page-writing API: they arrive together with the `remote` grammar attribute and `@endpoint`.
The Worker keeps the operation `source`; the [Reference](130-reference.md)
lists it.

<a id="gs-115-025"></a>

## 025 · What the export contains and what it does not

Block ID: **GS-115-025**.

- Contained: the Gramlot runtime, the `WorkerHost` with the page, the page logic,
  the stylesheets, the runtime license notices as inert JSON (`<script
  type="application/json" id="gramlot-runtime-notices">` in the file,
  `assets/runtime-notices.json` in the directory).
- Not contained: anything the page does not import, a server, a database,
  `dataRpc` or server resolvers.
- Public: everything in the export is readable by whoever opens it, the page
  logic included. Keep secrets out of pages and their modules.
