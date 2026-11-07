# 020 · Configuration

Document ID: **GN-120**. [Expanded version](../docs/020-configuration.md).

Options of `startServer`, same on Node and Bun.

<a id="gn-120-005"></a>

## 005 · Options

Block ID: **GN-120-005**.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `pages` | string | — | Pages folder → `new GramlotFileServer(pages, options)` unless `server` |
| `server` | `GramlotServer` | `null` | Custom `GramlotServer` (`resolvePage`, `resolveResources`); core themes for any server, pages-folder files only for a `GramlotFileServer` |
| `hostname` | string | `'127.0.0.1'` | Address |
| `port` | number | `0` | Port; `0` = free port, see `app.url` |
| `mountPath` | string | `''` | Prefix added once to root-relative bootstrap URLs; carried by request paths |
| `assets` | object | `{}` | URL path → `{file, type}`, `GET`/`HEAD` |
| `contentSecurityPolicy` | string/null | `null` | Header on HTML pages, `{nonce}` replaced |
| `ownerForRequest` | `async (request) => owner` | `null`: cookie `gramlot_owner` | Identity compared on rpc/close; replaces the cookie |
| `onError` | function | `console.error` | Unexpected errors; response 500 |
| `runtimeUrl`, `rpcUrl`, `closeUrl` | string | `/assets/gramlot.js`, `/gramlot/rpc`, `/gramlot/close` | `GramlotServer` URLs |
| `rootId` | string | `'gramlot-root'` | Root element id |
| `pageTtl` | number | `1800` | Seconds a page stays registered without a call (opening and each call start the period again) |
| `maxPages` | integer | `1000` | Registry capacity; above: 503 |
| `cssTheme` | string or `false` | `'gramlot-base'` | Base theme of every page (core themes folder); `false` none; a page replaces it with `static css_theme` |
| `collections` | array | `[]` | Component collections (section 035) |
| `reload` | boolean or `null` | `null` | `GramlotFileServer`: re-import a changed page module; `null` → from `GRAMLOT_DEV` |

`GramlotServer` options and `reload` reach `GramlotFileServer` only when the adapter builds it.
`GRAMLOT_DEV`: unset → `gramlot.min.js`, page modules imported once; `YES` →
`gramlot.min.js`, changed page modules re-imported; `DEBUG` → `gramlot.js`,
re-imported; other values fail the start. Same runtime URL in every mode.
`rpcUrl`: every request envelope (main, Source methods, endpoints); there is no
`/gramlot/main` or `/gramlot/source` route.

<a id="gn-120-010"></a>

## 010 · Mount prefix

Block ID: **GN-120-010**.

`mountPath: '/app'` (slashes trimmed) → bootstrap URLs `/app/assets/gramlot.js`,
`/app/gramlot/rpc|close`, `/app/index.css`; relative and absolute
`Page.css` unchanged; never `/app/app/`. Requests carry the prefix: the adapter
removes it; outside it 404; `/app` → 301 `/app/`. A front server forwards the
path unchanged ([Deployment](025-deployment.md)).

<a id="gn-120-015"></a>

## 015 · Content Security Policy

Block ID: **GN-120-015**.

Header on HTML pages only, nonce of the opening in `{nonce}`.

| Profile | Value | Runs |
| --- | --- | --- |
| Strict | `script-src 'nonce-{nonce}'; object-src 'none'; base-uri 'none'` | Named logic only |
| Permissive | `script-src 'nonce-{nonce}' 'unsafe-eval'; object-src 'none'; base-uri 'none'` | Named logic and inline code |

Strict + inline declaration → `EvalError` `<tag> '<label>' '<attribute>': inline
code blocked by the Content Security Policy of the page (no 'unsafe-eval'); move
the code to named logic (a method of the page's class Logic) or serve the page with the permissive CSP profile …`;
nothing written. `null`: no header, inline runs.

<a id="gn-120-020"></a>

## 020 · Request identity

Block ID: **GN-120-020**.

Each browser owns its pages: the page response sets the cookie `gramlot_owner` (random,
`Path` the prefix or `/`, `HttpOnly`, `SameSite=Lax`, session), reused when sent back. Different
or missing owner: rpc outcome `page_expired`, close 200 and no effect.
`ownerForRequest(request)` → owner, compared with `===`, replaces the cookie (no cookie set):
derive the owner from the application's session.

<a id="gn-120-025"></a>

## 025 · Limits

Block ID: **GN-120-025**.

No body size limit in the adapter (a front proxy may set one), media type
`application/json` (415; `charset` accepted), body UTF-8 (a leading byte order mark is
removed, invalid bytes 400); `pageTtl` positive and finite, a page expires `pageTtl` seconds
after its last use, pruned at openings and rpc; `maxPages` → 503; `close()` clears the
registry and stops the server.

<a id="gn-120-030"></a>

## 030 · Application assets

Block ID: **GN-120-030**.

`assets: {'/img/logo.svg': {file, type: 'image/svg+xml'}}` → `GET /app/img/logo.svg`
with that type; `HEAD` headers only; other methods 405. Key without `/`, or no
`file`/`type`: error at start; read at each request. Order: runtime, core themes
(when the core has the file), assets, companions, pages.

<a id="gn-120-035"></a>
## 035 · Application component collections

Block ID: **GN-120-035**.

GramlotServer provides all packaged standard collections automatically.
Declare custom prepared collections in `static gramlots = [customCollection]` on
`Page`. Import their generated descriptors, including `name`, `buildId`, `grammar`,
`module`, `css` and `dependencies`; do not import browser widget implementations
just to declare server dependencies. Base-class declarations accumulate before
subclass declarations. Dependencies name other declared records and are ordered
before consumers. Missing dependencies, cycles and conflicting identities fail.
Server-wide `collections` remain additive defaults for every page.

At startup the file server imports candidate page modules beneath its pages root
and discovers their declarations, without constructing pages or calling `main`.
Hidden/private entries, symlinks and `_aux.js` companions are excluded; modules
without a Page export are ignored, while an invalid Page export fails startup.
These are trusted application imports and may run module-level code. The adapter
resolves standard entries from the core package and requires custom collection
entries in `assets`, verifies each entire artifact and
retains a fixed snapshot for the process lifetime. A custom neutral server uses
its explicitly supplied server-wide collection registry.

Each page bootstrap activates only its own graph; the registry of hosted files
may contain more collections. The core reuses compiled grammars per builder class
and ordered composition, while creating fresh Source, Data and authorization
contexts. Fingerprinted asset GET/HEAD responses carry
`Cache-Control: public, max-age=31536000, immutable`; page and RPC responses remain
`no-store`. Unknown fingerprints return 404. Rebuilds produce new URLs. Restart
the process after rebuilding a collection: changing package files never changes
bytes already served under an existing build identity.

The gallery shell selects inputs, layout, tree and editors; basic field lessons
select inputs/layout, and Typst is selected only by its lesson. The core guide
[Components](https://gramlot.readthedocs.io/en/latest/docs/public/105-components.html)
describes the prepared collection contract.

<a id="gn-120-040"></a>
## 040 · Optional Markdown resource

Block ID: **GN-120-040**.

The core's `markdownUrl` is the sibling `gramlot-markdown.js` of `runtimeUrl`.
The host serves this packaged asset with JavaScript media type, `no-cache`, `ETag`
and `Last-Modified`, using GET or HEAD, and answers 304 to a matching condition; the bootstrap import map prefixes it with the mount path.
Registering collections does not fetch the parser. It loads once when an editor,
preview, guide or gallery description first needs Markdown. Deploy the matching
core runtime, optional asset and prepared collections together.

<a id="gn-120-045"></a>
## 045 · Visual Editor documents

Block ID: **GN-120-045**.

The gallery option `editorJavaScript` (CLI `--editor-javascript`) supplies one JS
page to the Visual Editor. It is read-only unless `remoteEdit` (`--remote-edit`)
is explicitly enabled. The adapter's VisualEditorDocuments service accepts a
host-owned key/file map, not arbitrary browser paths.

Save validates UTF-8, size, syntax and revision and atomically replaces the file;
it does not execute the module. Preview requires editing permission and the saved
revision, and runs Page.main in a bounded Node/Bun child process. The process is
resource-bounded, not a security sandbox for untrusted code. Preview does not
install target RPC endpoints or companion Logic.

The serverless Worker supports the visual Source editor and shared SourceImport,
without filesystem save/preview or a provider. The existing runtime export bridge
shares VisualEditorLogic/SourcePicker rather than bundling another core instance.
WebKit file-origin upload remains limited; HTTP WebKit and Chromium file export
use the same protocol. No alternate File reader was added.


Standard collections are server-owned defaults for every site, not gallery or
launcher configuration. Their entry files come from `standardCollectionAssets()`
and retain the existing artifact fingerprint checks. External engines remain lazy
in hosted pages. Directory and single-file exports embed the standard bundles
for file-origin use; the single-file import map uses a generated CSP nonce while
the runtime script remains hash-authorized. No `unsafe-inline` script policy is added.
