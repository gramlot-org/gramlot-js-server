# 020 · Configuration

Document ID: **GN-120**. [Expanded version](../docs/020-configuration.md).

Options of `startNativeServer`, same on Node and Bun.

<a id="gn-120-005"></a>

## 005 · Options

Block ID: **GN-120-005**.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `pages` | string | — | Pages folder → `new FileHost(pages, options)` unless `host` |
| `host` | Host | `null` | Custom Host (`resolvePage`, `resolveResources`) |
| `hostname` | string | `'127.0.0.1'` | Address |
| `port` | number | `0` | Port; `0` = free port, see `app.url` |
| `mountPath` | string | `''` | Prefix added once to root-relative bootstrap URLs |
| `contentSecurityPolicy` | string/null | `null` | Header on HTML pages, `{nonce}` replaced |
| `ownerForRequest` | `async (request) => owner` | `null` | Identity compared on main/source/close |
| `onError` | function | `console.error` | Unexpected errors; response 500 |
| `runtimeUrl`, `mainUrl`, `sourceUrl`, `closeUrl` | string | `/assets/gramlot.js`, `/gramlot/main`, `/gramlot/source`, `/gramlot/close` | Host URLs |
| `rootId` | string | `'gramlot-root'` | Root element id |
| `pageTtl` | number | `1800` | Seconds a page stays registered |
| `maxPages` | integer | `1000` | Registry capacity; above: 503 |

Host options reach `FileHost` only when the adapter builds it.

<a id="gn-120-010"></a>

## 010 · Mount prefix

Block ID: **GN-120-010**.

`mountPath: '/app'` (slashes trimmed) → bootstrap URLs `/app/assets/gramlot.js`,
`/app/gramlot/main|source|close`, `/app/index.css`; relative and absolute
`Page.css` unchanged; never `/app/app/`. Requests arrive **without** the prefix:
a front server strips it ([Deployment](025-deployment.md)). `/app/index.css` on
the adapter: 404.

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
the code to named logic … or serve the page with the permissive CSP profile …`;
nothing written. `null`: no header, inline runs.

<a id="gn-120-020"></a>

## 020 · Request identity

Block ID: **GN-120-020**.

`ownerForRequest(request)` → owner, compared with `===` to the owner at opening.
Different owner: main/source 404, close 200 and no effect. Default `null`: any
client reads any open page. Derive the owner from the application's session.

<a id="gn-120-025"></a>

## 025 · Limits

Block ID: **GN-120-025**.

JSON bodies ≤ 4096 bytes (413), content type `application/json` (415);
`pageTtl` positive and finite, pruned at openings and main/source; `maxPages`
→ 503; `close()` clears the registry and stops the server.
