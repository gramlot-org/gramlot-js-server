# 120 · Configuration

Document ID: **GS-120**.

[Paired view](../docs_llm/120-configuration.md).

This adapter has no server, so it has no mount prefix, no request identity and no
payload limits. Its configuration is the options of the three functions below and
the Content Security Policy of the exported file.

<a id="gs-120-005"></a>

## 005 · `build` and the command line

Block ID: **GS-120-005**.

`build({page, output})` from `@gramlot/serverless` (`src/build.js`):

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `page` | string | required | Path of the `.js`/`.mjs` page, resolved against the current directory. Another extension: `Standalone pages must be JavaScript (.js or .mjs)`. A `*_aux` file is refused. |
| `output` | string | required | Path of the `.html`/`.htm` file. Another extension: `Output must be an HTML file`. Parent directories are created. The file is written to a temporary name and renamed, so a failed build leaves an existing output untouched. |

It returns `{output, bytes, sha256}`: the absolute path, the size and the SHA-256
of the file. The document title is the page file name until the page starts, then
`Page.title`.

The command `gramlot-serverless build PAGE.js -o OUTPUT.html` (`src/cli.js`) calls
`build` with the two paths and prints `Built <output>: <bytes> bytes, sha256 <hash>`.
`-h` prints the usage. Any other form, or an error, prints
`gramlot-serverless: <message>` and exits with status 1.

<a id="gs-120-010"></a>

## 010 · `buildDirectory`

Block ID: **GS-120-010**.

`buildDirectory({pages, output, assets})` from `@gramlot/serverless/directory`
(`src/build-directory.js`):

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `pages` | object | required | Route identifier → absolute path of a `.js`/`.mjs` page. `index` is required. A route matches `^[a-z][a-z0-9_-]*$`. |
| `output` | string | required | Directory to create. It must not exist: `Output directory already exists`. The export is staged beside it and renamed at the end. |
| `assets` | array | `[]` | `{source, target}` pairs: `source` is an absolute file, `target` a relative path (`^[A-Za-z0-9._/-]+$`, no leading `/`, no `.` or `..` segment) that must not collide with a generated file or another asset. Only listed assets are copied. |

Every page, and the exporter itself, must resolve the same installation of
`@gramlot/gramlot`; otherwise `All Pages must resolve the same Gramlot core
installation` or `Pages and Serverless must resolve the same Gramlot core
installation`. It returns `{output, routes}`.

Generated files: `index.html`, `<route>/index.html` for the other routes,
`assets/standalone.js` (the runtime, shared), `assets/runtime-notices.json`, and
`assets/workers/<route>.js` (the bootstrap of each page, with its Worker and
companion embedded). Each document loads the two scripts through relative paths and
passes its directory to `mount` as `assetRoot`. The documents carry no Content
Security Policy; the host that serves them may set one.

<a id="gs-120-015"></a>

## 015 · Content Security Policy of the single file

Block ID: **GS-120-015**.

`build` writes one `<meta http-equiv="Content-Security-Policy">`:

```text
default-src 'none'; script-src 'sha256-<hash of the runtime script>' blob:;
worker-src blob:; style-src 'unsafe-inline'; img-src data: blob:;
connect-src 'none'; base-uri 'none'; form-action 'none'
```

- The runtime script is allowed by the SHA-256 of its final bytes. A copy of the
  file with one byte changed inside the script does not start
  (`scripts/verify_worker_sentinel_browser.mjs` checks it).
- `blob:` covers the Worker and the companion module.
- No `'unsafe-inline'` and no `'unsafe-eval'` for scripts: only named logic runs.
  Inline code fails with the core `EvalError` described in
  [Troubleshooting](140-troubleshooting.md).
- Styles: inline `style` attributes only. Images: `data:` and `blob:` URLs only.
  No `fetch`, `XMLHttpRequest` or WebSocket from the document (`connect-src 'none'`).

This is the only profile of the file. The permissive profile of the server
adapters (`'unsafe-eval'`, inline code allowed) does not exist here, and the
policy is not an option of `build`.

<a id="gs-120-020"></a>

## 020 · `mount`

Block ID: **GS-120-020**.

`mount(options)` from `@gramlot/serverless/standalone` (`src/standalone.js`) is
called by the exported documents. It is public for custom shells:

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `workerUrl` | string | required | URL of the bundled Worker script (`WorkerHost` plus the page). |
| `modules` | object | `{}` | Companion URL returned by the Worker → URL the window imports. A URL the Worker names and `modules` lacks: `Standalone module not provided: <url>`. |
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

`new WorkerHost(PageClass, {aux, ...hostOptions})` from
`@gramlot/serverless/worker-host` runs inside the Worker. The exporter writes the
Worker entry itself (`new WorkerHost(Page, {aux})`), so these options are relevant
to custom Worker bundles only:

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `aux` | string or `null` | `null` | URL that names the companion, returned in the `open` resources with group `null`. |
| `pageTtl` | number (seconds) | `1800` | Core Host option: the registered page expires after it. |
| `maxPages` | integer | `1000` | Core Host option: registry capacity. |

The remaining core Host options describe server URLs and have no effect in a
Worker. `WorkerHost` serves one page (`/`); `resolveResources` returns `Page.css`
as written and the companion URL.
