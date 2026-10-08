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
| `server` | `GramlotServer` | `null` | A custom `GramlotServer` implementing `resolvePage` and `resolveResources`; `pages` is then ignored |
| `hostname` | string | `'127.0.0.1'` | Listening address |
| `port` | number | `0` | Listening port; `0` selects a free port, reported in `app.url` |
| `mountPath` | string | `''` | Mount prefix: added once to the root-relative bootstrap URLs and carried by every request path |
| `assets` | object | `{}` | Application files: URL path (without the prefix) → `{file, type}`, served by `GET` and `HEAD` |
| `contentSecurityPolicy` | string or null | `null` | Policy sent on HTML pages, `{nonce}` replaced by the bootstrap nonce |
| `ownerForRequest` | `async (request) => owner` | returns `null` | Identity of the request, compared on main, source and close |
| `onError` | `(error) => void` | `console.error` | Receives unexpected errors; the response is 500 |
| `runtimeUrl` | string | `'/assets/gramlot.js'` | `GramlotServer` option: URL of the runtime |
| `mainUrl` | string | `'/gramlot/main'` | `GramlotServer` option: URL of the main endpoint |
| `sourceUrl` | string | `'/gramlot/source'` | `GramlotServer` option: URL of the remote Source endpoint |
| `closeUrl` | string | `'/gramlot/close'` | `GramlotServer` option: URL of the close endpoint |
| `rootId` | string | `'gramlot-root'` | `GramlotServer` option: id of the root element |
| `pageTtl` | number | `1800` | `GramlotServer` option: seconds a registered page stays open without a close |
| `maxPages` | integer | `1000` | `GramlotServer` option: registered pages at most; above it, 503 |
| `reload` | boolean or `null` | `null` | `GramlotFileServer` option: import a page module again when its file changes; `null` takes the value from `GRAMLOT_DEV` |

The `GramlotServer` options and `reload` reach `GramlotFileServer` only when the adapter builds it. A custom `server`
carries its own.

The environment variable `GRAMLOT_DEV` is read by the core at start: unset (deployment)
serves the minified runtime `gramlot.min.js` and imports each page module once;
`YES` (development) serves the minified runtime and imports a page module again
when its file changes; `DEBUG` serves the readable runtime `gramlot.js` and imports
again as `YES`. Any other value fails the start. The runtime URL is `runtimeUrl` in
every mode.

`sourceUrl` names the remote Source endpoint. Source methods (`Page.registerSource`, `remoteSource`) are not yet part of the page-writing API: they arrive together with the `remote` grammar attribute and `@endpoint`.

<a id="gn-120-010"></a>

## 010 · Mount prefix

Block ID: **GN-120-010**.

`mountPath: '/app'` (leading and trailing slashes are trimmed) is passed to
`openPage` as the mount prefix. The bootstrap document then carries
`/app/assets/gramlot.js`, `/app/gramlot/main`, `/app/gramlot/source`,
`/app/gramlot/close` and `/app/index.css`; a relative or absolute `Page.css`
URL stays as written. The prefix is added once: `/app/app/…` never appears.

Request paths carry the prefix: `GET /app/orders` opens the page `orders`. The
adapter removes the prefix before serving runtime, themes, assets, companions,
endpoints and pages; a path outside the prefix answers 404, and the prefix
without its final slash (`/app`) answers 301 to `/app/`. A front server forwards
the path unchanged ([Deployment](025-deployment.md)). Until 0.2.3 request paths
arrived without the prefix and the front server removed it.

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

`ownerForRequest(request)` receives the Fetch `Request` of every page, main,
source and close request and returns the owner, any value compared with `===`.
The owner is stored with the page at opening. A main or source request whose
owner differs answers 404; a close request whose owner differs answers 200 and
closes nothing. The default returns `null` for every request: every browser can
read every open page. An application that serves several users derives the owner
from its own session cookie or header.

<a id="gn-120-025"></a>

## 025 · Limits

Block ID: **GN-120-025**.

- JSON payloads of main, source and close are read up to 4096 bytes; a larger body
  answers 413. The content type must start with `application/json`, else 415.
- Pages expire `pageTtl` seconds after opening; expired pages are pruned at each
  opening and each main or source request. `pageTtl` must be positive and finite.
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
