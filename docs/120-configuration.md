# 120 · Configuration

Document ID: **GS-120**.

[Paired view](../docs_llm/120-configuration.md).

This adapter has no server, so it has no mount prefix, no request identity and no
payload limits. Its configuration is the options of the command and of the
functions below, and the Content Security Policy of the exported file.

<a id="gs-120-005"></a>

## 005 · `build` and the command line

Block ID: **GS-120-005**.

`build({page, output})` from `@gramlot/gramlot-serverless` (`serverless/src/build.js`):

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `page` | string | required | Path of the `.js`/`.mjs` page, resolved against the current directory. Another extension: `Standalone pages must be JavaScript (.js or .mjs)`. A `*_aux` file is refused. |
| `output` | string | required | Path of the `.html`/`.htm` file. Another extension: `Output must be an HTML file`. Parent directories are created. The file is written to a temporary name and renamed, so a failed build leaves an existing output untouched. |

It returns `{output, bytes, sha256}`: the absolute path, the size and the SHA-256
of the file. The document title is the page file name until the page starts, then
`Page.title`. `build` imports the page module to read `Page.css` and the `Logic`
export, and writes the stylesheets into the file
([Writing pages for this host](115-writing-pages.md)).

The command (`serverless/src/cli.js`) has three forms:

| Command | Effect |
| --- | --- |
| `gramlot-serverless build PAGE.js -o OUTPUT.html` | `build` of one page; prints `Built <output>: <bytes> bytes, sha256 <hash>` |
| `gramlot-serverless build FOLDER -o OUTPUT` | `buildDirectory` of the pages and files of the folder; prints `Built <output>: <n> pages (<routes>)` |
| `gramlot-serverless gallery OUTPUT [--catalog CATALOG.json PAGES]...` | The gallery of `@gramlot/gramlot-examples` as a directory ([Reference](130-reference.md)) |

`-h` prints the usage. Any other form, or an error, prints
`gramlot-serverless: <message>` and exits with status 1.

<a id="gs-120-010"></a>

## 010 · `buildDirectory`

Block ID: **GS-120-010**.

`buildDirectory({pages, output, assets})` from `@gramlot/gramlot-serverless/directory`
(`serverless/src/build-directory.js`):

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `pages` | object | required | Route identifier → absolute path of a `.js`/`.mjs` page. `index` is required. A route matches `^[a-z][a-z0-9_-]*$`. |
| `output` | string | required | Directory to write. A previous export there (a directory with `assets/standalone.js`) is replaced; any other existing path fails: `Output directory already exists and is not a previous export`. The export is staged beside it and renamed at the end. |
| `assets` | array | `[]` | `{source, target}` pairs: `source` is an absolute file, `target` a relative path (`^[A-Za-z0-9._/-]+$`, no leading `/`, no `.` or `..` segment) that must not collide with a generated file or another asset. Only listed assets are copied. |

Every page, and the exporter itself, must resolve the same installation of
`@gramlot/gramlot`; otherwise `All Pages must resolve the same Gramlot core
installation` or `Pages and @gramlot/gramlot-serverless must resolve the same Gramlot core
installation`. It returns `{output, routes}`.

Generated files: `index.html`, `<route>/index.html` for the other routes,
`assets/standalone.js` (the runtime, shared), `assets/runtime-notices.json`,
`assets/workers/<route>.js` (the bootstrap of each page, with its Worker and
logic module embedded) and `assets/styles/<route>.css` (the stylesheet
`<name>.css` of a page). A `Page.css` URL under `/themes/` is copied from the core
package unless an asset has its path. `folderPages(folder)`, from the same module,
returns the `{pages, assets}` of a folder for the command. Each document loads the two scripts through relative paths and
passes its directory to `mount` as `assetRoot`. The documents carry no Content
Security Policy; the host that serves them may set one.

<a id="gs-120-015"></a>

## 015 · Content Security Policy of the single file

Block ID: **GS-120-015**.

`build` writes one `<meta http-equiv="Content-Security-Policy">`:

```text
default-src 'none'; script-src 'sha256-<hash of the runtime script>' 'unsafe-eval' blob:;
worker-src blob:; style-src 'unsafe-inline'; img-src data: blob:;
connect-src *; base-uri 'none'; form-action 'none'
```

- The runtime script is allowed by the SHA-256 of its final bytes. A copy of the
  file with one byte changed inside the script does not start
  (`serverless/scripts/verify_worker_sentinel_browser.mjs` checks it).
- `blob:` covers the Worker and the logic module.
- No `'unsafe-inline'`. `'unsafe-eval'` lets the page compile the inline code
  (`formula`, `script`, `==`, `action`, `connect_on<event>`, `_if`/`_else`) of the
  Source it receives from its Worker: named logic and inline code run. The core
  runs only the inline code received with the Source; code written later in the
  page is refused ([Troubleshooting](140-troubleshooting.md)).
- Styles: `<style>` elements and `style` attributes (`'unsafe-inline'` for
  styles only); the build writes `Page.css` and `<name>.css` as `<style>`.
  Images: `data:` and `blob:` URLs only.
- Connections are open (`connect-src *`): `fetch`, `XMLHttpRequest` and WebSocket
  work from the document, until a page can declare its own policy.

This is the only profile of the file, from gramlot-js-server 0.2.3 (0.2.2 wrote no
`'unsafe-eval'` and `connect-src 'none'`). The policy is not an option of
`build`.

<a id="gs-120-020"></a>

## 020 · `mount`

Block ID: **GS-120-020**.

`mount(options)` from `@gramlot/gramlot-serverless/standalone` (`serverless/src/standalone.js`) is
called by the exported documents. It is public for custom shells:

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `workerUrl` | string | required | URL of the bundled Worker script (`WorkerHost` plus the page). |
| `modules` | object | `{}` | Logic module URL returned by the Worker → URL the window imports. A URL the Worker names and `modules` lacks: `Standalone module not provided: <url>`. |
| `element` | Element | `null` | Root element; when `null`, the element with id `rootId`. |
| `rootId` | string | `'gramlot-root'` | Id of the root element. The document must contain it. |
| `document` | Document | `globalThis.document` | The document to render into. |
| `signal` | AbortSignal | none | Cancels the start: the Worker is disposed, `mount` rejects with the reason. |
| `assetRoot` | string or `null` | `null` | Absolute `file:`, `http:` or `https:` directory URL ending in `/`. With it, every `Page.css` URL must be root-relative, without `.`/`..`, and is resolved inside the directory. |

It resolves to the started `Gramlot` instance, also set on `window.gramlot`; the
instance exposes `transport` (the `WorkerTransport`) and `dispose()`. On any start
failure, `mount` disposes the Worker and the half-created instance before
rejecting.

<a id="gs-120-025"></a>

## 025 · `WorkerHost`

Block ID: **GS-120-025**.

`new WorkerHost(PageClass, {logic, stylesheet, inlineCss, ...hostOptions})` from
`@gramlot/gramlot-serverless/worker-host` runs inside the Worker. The exporter writes the
Worker entry itself, so these options are relevant to custom Worker bundles only.
Until 0.2.3 the option `logic` was called `aux`; the old name is not accepted.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `logic` | string or `null` | `null` | URL that names the page logic module, returned in the `open` resources with group `null`. |
| `stylesheet` | string or `null` | `null` | URL of the page stylesheet, returned after `Page.css`. |
| `inlineCss` | boolean | `false` | The document holds the stylesheets: no CSS URL is returned. The single file sets it. |
| `pageTtl` | number (seconds) | `1800` | Core Host option: the registered page expires after it. |
| `maxPages` | integer | `1000` | Core Host option: registry capacity. |

The remaining core Host options describe server URLs and have no effect in a
Worker. `WorkerHost` serves one page (`/`); `resolveResources` returns `Page.css`
as written, the page stylesheet and the logic URL.
