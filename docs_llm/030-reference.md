# 030 · Reference

Document ID: **GN-130**. [Expanded version](../docs/030-reference.md).

<a id="gn-130-005"></a>

## 005 · Package exports

Block ID: **GN-130-005**.

`@gramlot/gramlot-js-server/native` → `startNativeServer` (Node 22+, `node:http`);
`@gramlot/gramlot-js-server/bun` → `startNativeServer` (Bun; elsewhere throws `The Bun
host requires Bun`). `@gramlot/gramlot` is a peer: one copy for adapter and
pages. `Page`, `source`: `@gramlot/gramlot/page`; `Host`, `FileHost`:
`@gramlot/gramlot/server`.

<a id="gn-130-010"></a>

## 010 · startNativeServer

Block ID: **GN-130-010**.

`const app = await startNativeServer(options)` ([Configuration](020-configuration.md));
rejects when it cannot listen or read the runtime. Result: `url`
(`http://<hostname>:<port>`), `host`, `server` (`http.Server` or `Bun.Server`),
`close()` (clears the registry, closes connections, stops).

<a id="gn-130-015"></a>

## 015 · HTTP endpoints

Block ID: **GN-130-015**.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET` | page path | — | 200 HTML bootstrap, CSP header when configured |
| `GET`/`HEAD` | `/assets/gramlot.js` | — | 200 runtime |
| `GET`/`HEAD` | `*.css`, `*_aux.js` below pages | — | 200 file |
| `POST` | `/gramlot/main` | `{pageId}` JSON | 200 TYTX Source |
| `POST` | `/gramlot/source` | `{pageId, method, params?}` | 200 TYTX Source |
| `POST` | `/gramlot/close` | `{pageId}` | 200 `{"ok":true}` |

`Cache-Control: no-store` everywhere but the runtime (`X-Content-Type-Options: nosniff`).

<a id="gn-130-020"></a>

## 020 · Status codes

Block ID: **GN-130-020**.

400 undecodable path / invalid or missing payload, `pageId`, `method`, `params`;
404 `Not found` (unknown page, bad segment, escaping path, non-companion file,
expired or unowned page); 404 `Unknown Source method`; 405 wrong method; 413
body > 4096 bytes; 415 not `application/json`; 503 `maxPages`; 500 other
errors → `onError`.
