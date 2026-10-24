# 020 · Configuration

Document ID: **GN-120**. [Concise mirror](../docs_llm/020-configuration.md).

Every option is a property of the object passed to `startServer`. The
Node and the Bun entry points accept the same options.

<a id="gn-120-005"></a>

## 005 · Options

Block ID: **GN-120-005**.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `pages` | string | — | Path of the pages folder; builds `new GramlotFileServer(pages, options)` when `server` is not given |
| `server` | `GramlotServer` | `null` | A custom `GramlotServer` implementing `resolvePage` and `resolveResources`; `pages` is then ignored. The core themes under `/themes/` are served for any `GramlotServer`; the files below the pages folder only for a `GramlotFileServer` |
| `hostname` | string | `'127.0.0.1'` | Listening address |
| `port` | number | `0` | Listening port; `0` selects a free port, reported in `app.url` |
| `mountPath` | string | `''` | Mount prefix: added once to the root-relative bootstrap URLs and carried by every request path |
| `assets` | object | `{}` | Application files: URL path (without the prefix) → `{file, type}`, served by `GET` and `HEAD` |
| `contentSecurityPolicy` | string or null | `null` | Policy sent on HTML pages, `{nonce}` replaced by the bootstrap nonce |
| `ownerForRequest` | `async (request) => owner` | `null`: the cookie `gramlot_owner` | Identity of the request, compared on rpc and close; replaces the cookie |
| `onError` | `(error) => void` | `console.error` | Receives unexpected errors; the response is 500 |
| `runtimeUrl` | string | `'/assets/gramlot.js'` | `GramlotServer` option: URL of the runtime |
| `rpcUrl` | string | `'/gramlot/rpc'` | `GramlotServer` option: URL that receives every request envelope |
| `closeUrl` | string | `'/gramlot/close'` | `GramlotServer` option: URL of the close endpoint |
| `rootId` | string | `'gramlot-root'` | `GramlotServer` option: id of the root element |
| `pageTtl` | number | `1800` | `GramlotServer` option: seconds a registered page stays open without a call; opening it and every call to it start the period again |
| `maxPages` | integer | `1000` | `GramlotServer` option: registered pages at most; above it, 503 |
| `cssTheme` | string or `false` | `'gramlot-base'` | `GramlotServer` option: the base theme of every page, the name of a folder of the core themes; `false` loads none. A page replaces it with `static css_theme` |
| `collections` | array | `[]` | `GramlotServer` option: the component collections of the application; see section 035 |
| `reload` | boolean or `null` | `null` | `GramlotFileServer` option: import a page module again when its file changes; `null` takes the value from `GRAMLOT_DEV` |

The `GramlotServer` options and `reload` reach `GramlotFileServer` only when the adapter builds it. A custom `server`
carries its own.

The environment variable `GRAMLOT_DEV` is read by the core at start: unset (deployment)
serves the minified runtime `gramlot.min.js` and imports each page module once;
`YES` (development) serves the minified runtime and imports a page module again
when its file changes; `DEBUG` serves the readable runtime `gramlot.js` and imports
again as `YES`. Any other value fails the start. The runtime URL is `runtimeUrl` in
every mode.

`rpcUrl` receives the request envelopes of `main`, of the Source methods and of the
endpoints; the adapter has no route `/gramlot/main` or `/gramlot/source`.

<a id="gn-120-010"></a>

## 010 · Mount prefix

Block ID: **GN-120-010**.

`mountPath: '/app'` (leading and trailing slashes are trimmed) is passed to
`openPage` as the mount prefix. The bootstrap document then carries
`/app/assets/gramlot.js`, `/app/gramlot/rpc`, `/app/gramlot/close` and
`/app/index.css`; a relative or absolute `Page.css`
URL stays as written. The prefix is added once: `/app/app/…` never appears.

Request paths carry the prefix: `GET /app/orders` opens the page `orders`. The
adapter removes the prefix before serving runtime, themes, assets, companions,
endpoints and pages; a path outside the prefix answers 404, and the prefix
without its final slash (`/app`) answers 301 to `/app/`. A front server forwards
the path unchanged ([Deployment](025-deployment.md)).

<a id="gn-120-015"></a>

## 015 · Content Security Policy

Block ID: **GN-120-015**.

The application chooses the policy; Gramlot defines two profiles. The adapter
writes the header on HTML pages only, with the nonce of that opening in place of
`{nonce}`; the runtime, the companions and the error responses carry no header.

| Profile | `contentSecurityPolicy` | Pages that run |
| --- | --- | --- |
| Strict | `script-src 'nonce-{nonce}'; object-src 'none'; base-uri 'none'` | Named logic only |
| Permissive | `script-src 'nonce-{nonce}' 'unsafe-eval'; object-src 'none'; base-uri 'none'` | Named logic and inline code |

Under the strict profile an inline declaration does not run. The page reports an
`EvalError` that names the node and the attribute:

```text
dataFormula 'dataFormula_0' 'formula': inline code blocked by the Content Security
Policy of the page (no 'unsafe-eval'); move the code to named logic (a method of
the page's class Logic) or serve the page with the permissive CSP profile, which
allows 'unsafe-eval'
```

Nothing is written to the Data. With `contentSecurityPolicy: null` no header is
sent and the browser applies no policy; inline code runs.

<a id="gn-120-020"></a>

## 020 · Request identity

Block ID: **GN-120-020**.

Each browser is the owner of the pages it opens. The page response sets the cookie
`gramlot_owner` (a random value, `Path` the mount prefix or `/`, `HttpOnly`,
`SameSite=Lax`, no lifetime) and reuses the value that the browser already sends; rpc
and close requests carry it back. The owner is stored with the page at opening. A
request whose owner differs, or that has no cookie, receives the outcome `page_expired`;
a close request whose owner differs answers 200 and closes nothing. A client that learns
a page ID cannot use it from another browser.

`ownerForRequest(request)` replaces the cookie with the identity system of the
application: it receives the Fetch `Request` of every page, rpc and close request and
returns the owner, any value compared with `===`. The adapter then sets no cookie. An
application that serves several users derives the owner from its own session cookie or
header.

<a id="gn-120-025"></a>

## 025 · Limits

Block ID: **GN-120-025**.

- The bodies of rpc and close have no size limit in the adapter; a proxy in front
  may set one. The media type must be `application/json` (parameters such as
  `charset` are accepted), else 415. A body is read as UTF-8; a leading byte
  order mark is removed and invalid bytes answer 400.
- A page expires `pageTtl` seconds after its last use: opening it and every call
  that names it for its owner start the period again. Expired pages are pruned at
  each opening and each rpc request. `pageTtl` must be positive and finite.
- `maxPages` registered pages at most; `ServerCapacity` answers 503.
- `close()` on the returned application clears every registered page and stops
  the server.

<a id="gn-120-030"></a>

## 030 · Application assets

Block ID: **GN-120-030**.

`assets` serves files of the application that are not below the pages folder:

```js
await startServer({pages, mountPath: '/app', assets: {
    '/img/logo.svg': {file: '/srv/app/logo.svg', type: 'image/svg+xml'},
}});
```

`GET /app/img/logo.svg` answers the file with that `Content-Type`; `HEAD` answers
the headers; another method answers 405. A key that does not start with `/`, or an
entry without `file` and `type`, is an error at start. The file is read at each
request. Order of the rules: runtime, core themes (`/themes/`, when the core has
the file), assets, companions below the pages folder, pages.

<a id="gn-120-035"></a>
## 035 · Application component collections

Block ID: **GN-120-035**.

Declare optional prepared collections in `static gramlots = [inputs, layout]` on
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
requires each collection entry in `assets`, verifies its entire artifact and
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
