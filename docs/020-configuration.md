# 020 · Configuration

Document ID: **GN-120**. [Concise mirror](../docs_llm/020-configuration.md).

Every option is a property of the object passed to `startServer`. The
Node and the Bun entry points accept the same options.

<a id="gn-120-005"></a>

## 005 · Options

Block ID: **GN-120-005**.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `pages` | string | — | Path of the pages folder; builds `new FileHost(pages, options)` when `host` is not given |
| `host` | Host | `null` | A custom Host implementing `resolvePage` and `resolveResources`; `pages` is then ignored |
| `hostname` | string | `'127.0.0.1'` | Listening address |
| `port` | number | `0` | Listening port; `0` selects a free port, reported in `app.url` |
| `mountPath` | string | `''` | Mount prefix added once to the root-relative bootstrap URLs |
| `contentSecurityPolicy` | string or null | `null` | Policy sent on HTML pages, `{nonce}` replaced by the bootstrap nonce |
| `ownerForRequest` | `async (request) => owner` | returns `null` | Identity of the request, compared on main, source and close |
| `onError` | `(error) => void` | `console.error` | Receives unexpected errors; the response is 500 |
| `runtimeUrl` | string | `'/assets/gramlot.js'` | Host option: URL of the runtime |
| `mainUrl` | string | `'/gramlot/main'` | Host option: URL of the main endpoint |
| `sourceUrl` | string | `'/gramlot/source'` | Host option: URL of the remote Source endpoint |
| `closeUrl` | string | `'/gramlot/close'` | Host option: URL of the close endpoint |
| `rootId` | string | `'gramlot-root'` | Host option: id of the root element |
| `pageTtl` | number | `1800` | Host option: seconds a registered page stays open without a close |
| `maxPages` | integer | `1000` | Host option: registered pages at most; above it, 503 |

The Host options reach `FileHost` only when the adapter builds it. A custom `host`
carries its own.

<a id="gn-120-010"></a>

## 010 · Mount prefix

Block ID: **GN-120-010**.

`mountPath: '/app'` (leading and trailing slashes are trimmed) is passed to
`openPage` as the mount prefix. The bootstrap document then carries
`/app/assets/gramlot.js`, `/app/gramlot/main`, `/app/gramlot/source`,
`/app/gramlot/close` and `/app/index.css`; a relative or absolute `Page.css`
URL stays as written. The prefix is added once: `/app/app/…` never appears.

Request paths arrive **without** the prefix. The adapter listens at the root and
expects a front server that strips the mount before forwarding, as the
[Deployment](025-deployment.md) guide shows. `GET /app/index.css` on the
adapter itself answers 404.

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
the page companion _aux.js) or serve the page with the permissive CSP profile,
which allows 'unsafe-eval'
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
- `maxPages` registered pages at most; `HostCapacity` answers 503.
- `close()` on the returned application clears every registered page and stops
  the server.
