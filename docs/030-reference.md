# 030 · Reference

Document ID: **GN-130**. [Concise mirror](../docs_llm/030-reference.md).

<a id="gn-130-005"></a>

## 005 · Package exports

Block ID: **GN-130-005**.

| Specifier | Export | Runtime |
| --- | --- | --- |
| `gramlot-js-server/native` | `startNativeServer(options)` | Node.js 22 or later, `node:http` |
| `gramlot-js-server/bun` | `startNativeServer(options)` | Bun, `Bun.serve`; throws `The Bun host requires Bun` elsewhere |

`@gramlot/gramlot` is a peer dependency: the application and the adapter
resolve the same copy of the core, or `instanceof Page` fails
([Troubleshooting](040-troubleshooting.md)). The Page base class, `source`,
`Host` and `FileHost` are the core's: `@gramlot/gramlot/page` and
`@gramlot/gramlot/server`.

<a id="gn-130-010"></a>

## 010 · startNativeServer

Block ID: **GN-130-010**.

```js
const app = await startNativeServer(options);
```

`options` is described in [Configuration](020-configuration.md). The promise
resolves when the server listens and rejects when it cannot (address in use,
runtime file missing). The result:

| Property | Type | Meaning |
| --- | --- | --- |
| `url` | string | `http://<hostname>:<port>` with the bound port |
| `host` | Host | The `FileHost` built from `pages`, or the `host` passed in |
| `server` | `http.Server` or `Bun.Server` | The listening server |
| `close()` | `async () => void` | Clears the page registry, closes connections, stops the server |

<a id="gn-130-015"></a>

## 015 · HTTP endpoints

Block ID: **GN-130-015**.

Paths are shown with the default Host options and without mount prefix.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | any page path (`/`, `/orders`) | — | 200 `text/html`, the bootstrap document; `Content-Security-Policy` when configured |
| `GET`, `HEAD` | `/assets/gramlot.js` | — | 200 `text/javascript`, the runtime |
| `GET`, `HEAD` | `*.css`, `*_aux.js` below the pages folder | — | 200 `text/css` or `text/javascript` |
| `POST` | `/gramlot/main` | `{"pageId"}` as `application/json` | 200 `application/json`, the Source of `main` in TYTX |
| `POST` | `/gramlot/source` | `{"pageId", "method", "params"?}` | 200 `application/json`, the Source of the method |
| `POST` | `/gramlot/close` | `{"pageId"}` | 200 `{"ok": true}`, always |

Every response of the adapter carries `Cache-Control: no-store`, except the
runtime, which carries `X-Content-Type-Options: nosniff`.

<a id="gn-130-020"></a>

## 020 · Status codes

Block ID: **GN-130-020**.

| Status | Body | When |
| --- | --- | --- |
| 400 | `Invalid path` | A path that does not decode |
| 400 | `Invalid main payload`, `Missing main payload`, `Missing pageId`, `Invalid Source request` | A body that is not JSON, has no `pageId`, or a `method`/`params` of the wrong type |
| 404 | `Not found` | Unknown page path, invalid segment, path leaving the folder, file not a companion, expired or unowned page |
| 404 | `Unknown Source method` | `method` is `main`, unmarked or missing |
| 405 | `Method not allowed` | `POST` on a page, a companion or the runtime; `GET` on an endpoint |
| 413 | `Payload too large` | A JSON body above 4096 bytes |
| 415 | `Expected application/json` | Another content type on an endpoint |
| 503 | `Page registry capacity reached` | `maxPages` reached |
| 500 | `Internal server error` | Any other error; the error object reaches `onError` |
