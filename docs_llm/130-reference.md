# 130 · Reference

Document ID: **GS-130**.

[Paired view](../docs/130-reference.md).

<a id="gs-130-005"></a>

## 005 · Package and entries

Block ID: **GS-130-005**.

`@gramlot/gramlot-serverless` (`serverless/package.json`), Node ≥ 22:
`@gramlot/gramlot-serverless` → `build`; `/directory` → `buildDirectory`; `/standalone` →
`mount` (window); `/gramlot-worker-server` → `GramlotWorkerServer` (Worker); `/directory` also
`folderPages`. Command `gramlot-serverless` (`node serverless/src/cli.js`): `build
PAGE.js -o OUTPUT.html`, `build FOLDER -o OUTPUT`, `gallery OUTPUT [--catalog …]`.
Dependencies `@genrojs/builders >=0.6.0`, `esbuild`; peer `@gramlot/gramlot >=0.3.26`;
optional peer `@gramlot/gramlot-examples >=0.3.26` (gallery).

<a id="gs-130-010"></a>

## 010 · Build-time API

Block ID: **GS-130-010**.

`build({page, output}) → {output, bytes, sha256}`: imports the module, bundles
page and logic, HtmlBuilder document with the stylesheets and the policy
([GS-120-015](120-configuration.md)); `TypeError`s (extension, `*_aux`, no `Page`,
stylesheet not inlinable), `Two logic modules for one page`, esbuild errors, `HtmlBuilder changed the runtime script: its CSP hash would not
match`. `buildDirectory({pages, output, assets}) → {output, routes}`: validates,
stages, renames over a previous export; `TypeError`s, `… is not a previous
export`, the two "same Gramlot core installation" errors, esbuild errors.
`folderPages(folder) → {pages, assets}`. `bundles.js`, `gallery.js` are internal.

<a id="gs-130-015"></a>

## 015 · Runtime API

Block ID: **GS-130-015**.

`mount(options) → Gramlot` ([GS-120-020](120-configuration.md));
`globalThis.gramlot`. `Gramlot`: `state` (`'started'`), `src.source`, `data`,
`src.remoteSource(node, method, params)`, `dispose()` (terminates the Worker),
`rpc.transport`. `WorkerTransport`: `open(signal)` → `{pageId, title, resources, capabilities, nameSyntax}`,
`call(text, signal)` → response envelope text (as `HttpTransport`), `close(pageId)`, `dispose(error)`,
`pending`, `closed`; Worker `error`/`messageerror` dispose it; no `supportsCallSync` (`callSync` throws, a
`dataRemote` with `sync` reads asynchronously). `WorkerServerAdapter` (`serverless/src/worker-server-adapter.js`,
not an entry): the core `ServerAdapter` whose `createTransport()` returns that transport. `GramlotWorkerServer`:
extends core `GramlotServer`, Part C of the [server protocol](https://gramlot.readthedocs.io/en/latest/docs/public/101-server-protocol.html) over `postMessage`: `{id, open: true}` →
`{id, open: {pageId, title, resources, capabilities: [], nameSyntax}}`; `{id, text}` → `{id, text}` (envelopes
of `call`); `{pageId}` without `id` closes. Outcomes inside the envelope; failed open,
`InvalidRequest`, `Unknown Worker message` → `{id, error: {name, message}}`. Owner null.
Declare Source fragments with `Page.registerSource` and mount them with `remote`;
use `dataRpc` for endpoint values and `dataRemote` for lazy Data. See [Calling the server](https://github.com/gramlot-org/gramlot/blob/main/docs/public/098-server-calls.md#gc-095-100)
and [Remote content and lazy Data](https://github.com/gramlot-org/gramlot/blob/main/docs/public/099-remote-content.md#gc-095-105).

<a id="gs-130-020"></a>

## 020 · Exported files

Block ID: **GS-130-020**.

Single file: doctype, charset, viewport, policy meta, title, notices JSON script
(`gramlot-runtime-notices`), `<style>` per stylesheet, `#gramlot-root`, one
`<script>`: runtime (global `GramlotStandalone` with `Page`, `source`), Worker and
logic module sources as Blob URLs revoked after start. Directory:
[GS-120-010](120-configuration.md); `assets/workers/<route>.js` calls
`GramlotStandalone.mount({workerUrl, modules, assetRoot})`.

Prepared collection bundles import the actual public exports of
`@gramlot/gramlot`, `/components` and `/page` from the window's shared runtime.
Each entry keeps its own export surface: a name available in core is not
implicitly available through `/components` or `/page`. Artifact verification and
declared collection dependency checks still apply before bundling.

<a id="gs-130-025"></a>

## 025 · Verification scripts

Block ID: **GS-130-025**.

`npm test`; `verify_page_module_browser.mjs PLAYWRIGHT [ENGINE]` (Page and
Logic in one module, theme, stylesheets, and a Logic that imports `Bag` and `createDecimal`
from `@gramlot/gramlot/page`; file and directory);
`verify_gallery_browser.mjs PLAYWRIGHT [ENGINE]` (gallery from disk, every example, the `Logic` of the examples that call its methods);
`verify_quickstart_browser.mjs PLAYWRIGHT [ENGINE] [EXECUTABLE]` (file and
directory export in a real browser); `verify_export_browser.mjs HTML PLAYWRIGHT
EXECUTABLE TEXT [METHOD] [ENGINE]`; `verify_inline_browser.mjs HTML PLAYWRIGHT
[EXECUTABLE] [ENGINE]` (inline code of main and a remote Source, no CSP violation);
`verify_worker_sentinel_browser.mjs PLAYWRIGHT
[ENGINE] [EXECUTABLE]` (core `avvio`, Logic in the window only; linked core checkout); `scripts/check_docs.py`.

<a id="gs-130-030"></a>

## 030 · The gallery command

Block ID: **GS-130-030**.

`gramlot-serverless gallery OUTPUT [--catalog CATALOG.json PAGES]...`: the
gramlot-examples gallery as a directory from disk; `index.html` + `<key>/index.html`;
every family of the common `catalog.json` + `serverless-02` (`npm create @gramlot page`) + each `--catalog`. Prints `Built <output>: the gallery and <n> examples; open
index.html`. Rules of `buildDirectory` (a previous gallery is replaced); export size depends
on the installed examples and runtime, with one Worker per route. Missing examples package → `The gallery needs
@gramlot/gramlot-examples: …`.

Setup quick starts remain in the server README and tutorials; the gallery does
not include their sections or routes. Registration form remains an application
example in the standalone gallery.


The staged gallery keeps lesson descriptions and supplies galleryUrls mapping route keys to relative HTML files. The carousel uses this map for lazy full-size and thumbnail frames, both from disk and under a static-host prefix.

<a id="gs-130-035"></a>

## 035 · Install a directory export

Block ID: **GS-130-035**.

`buildDirectory` reads the root Page's `installable` flag. When true, it writes
`app.webmanifest` from `new Page().manifest({baseUrl: './'})` and adds a manifest
link only to `index.html`. The output reserves the name `app.webmanifest`; an
asset with that name is rejected. Copy the icon named by `appIcon` through the
build's asset map. The default manifest declares a square 512×512 PNG. The gallery
export includes that asset automatically. Child Page flags do not create manifests.
A single-file `build` rejects an installable root; use directory export instead.

Serve the directory over HTTPS or localhost for browser installation. The app
still executes in the browser Worker; a static server only serves its files.
Opening `index.html` directly remains supported for execution, but is not the
installation path. No service worker or offline cache is added. Safari on macOS
Sonoma or later uses File → Add to Dock; Chromium can offer its installation prompt.

The reusable `IndexPage` and `IndexLogic` are available through the existing Page
entry in both Worker and window bundles. Use concrete exported URLs such as
`hello/index.html` in navigation. See the
[core index guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/095-writing-pages.md#gc-095-110).


Development route update, 2026-10-20: explicit buildDirectory page maps may use slash-separated route segments, each following the existing lowercase route-identifier grammar. Empty segments and traversal remain invalid. The gallery uses nested routes for filesystem index pages and child pages; relative runtime/worker/frame paths reflect their depth. Its normal root Logic is staged as index_aux.js. Filesystem discovery is completed at export time and its one-level Bags are serialized through TYTX; browser expansion still requests individual directory Bags from the Worker.

<a id="gs-130-040"></a>

## 040 · Worker uploads

Block ID: **GS-130-040**.

The Worker advertises `upload` and receives the browser-selected File after the
shared preparation request. It reads at most 256 KiB at a time, reports progress
and returns the application target outcome. A JavaScript Page registers its
operation with `Page.registerUpload('method')`; the method returns an
`UploadTarget` imported from `@gramlot/gramlot/page`. It validates its untrusted
metadata and chooses its destination. The target implements `write`, `finish`,
`abort` and `status` and declares `maxBytes`.

The Worker registry is in memory. Terminating the Worker loses its upload status
and can interrupt cleanup; this cannot establish that an external destination
is unsaved. The shared queue does not retry an uncertain outcome automatically.


Browser page Logic may import `BrowserCameraProvider` from the shared Gramlot runtime and explicitly attach it to `page.dvc`. The provider and camera preview run in the window; the Worker continues to own page execution and upload operations. Capture requires a secure browser context and user permission.


Worker upload qualification (2026-11-01): Chromium passes from a file-origin
export, including attachments saved after their parent record. WebKit passes the
same export served over HTTP, but file-origin upload fails with NotReadableError
when its Worker reads the File. A native-only probe reproduces the problem; see
[WebKit bug 258443](https://bugs.webkit.org/show_bug.cgi?id=258443). No alternate
transfer protocol is implemented. Do not claim file-origin upload support on
WebKit from the otherwise successful serverless tests.


The following Chromium probes exercise real Worker transfers from file-origin
exports. Run from the repository root after building the core collections:

- `node serverless/scripts/verify_upload_browser.mjs PLAYWRIGHT`: bounded chunks,
  byte progress, per-file metadata and the reconciled outcome in one HTML file.
- `node serverless/scripts/verify_upload_ui_browser.mjs PLAYWRIGHT GALLERY`: file
  selection and manual upload through the shared widget in a directory export.
- `node serverless/scripts/verify_upload_after_save_browser.mjs PLAYWRIGHT GALLERY`:
  files stay queued until the record-save signal, then carry the record context
  separately from per-file metadata.

`PLAYWRIGHT` is the absolute path to Playwright's module; `GALLERY` is the absolute
path to the examples gallery module exporting `buildGallery`. These checks do not
claim WebKit file-origin upload support or enable a public HTTP upload endpoint.
