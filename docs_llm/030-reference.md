# 030 · Reference

Document ID: **GN-130**. [Expanded version](../docs/030-reference.md).

<a id="gn-130-005"></a>

## 005 · Package exports

Block ID: **GN-130-005**.

`@gramlot/gramlot-js-server/node` → `startServer` (Node 22+, `node:http`);
`@gramlot/gramlot-js-server/bun` → `startServer` (Bun; elsewhere throws `The Bun
host requires Bun`). `@gramlot/gramlot` is a peer: one copy for adapter and
pages. `Page`, `source`: `@gramlot/gramlot/page`; `Host`, `FileHost`:
`@gramlot/gramlot/server`. Command `gramlot` (025); optional peer
`@gramlot/gramlot-examples` >=0.2.4 for the gallery.

<a id="gn-130-010"></a>

## 010 · startServer

Block ID: **GN-130-010**.

`const app = await startServer(options)` ([Configuration](020-configuration.md));
rejects when it cannot listen or read the runtime. Result: `url`
(`http://<hostname>:<port>`), `host`, `server` (`http.Server` or `Bun.Server`),
`close()` (clears the registry, closes connections, stops).

<a id="gn-130-015"></a>

## 015 · HTTP endpoints

Block ID: **GN-130-015**.

In order, each path under `mountPath`:

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET`/`HEAD` | `/assets/gramlot.js` | — | 200 runtime |
| `GET`/`HEAD` | `/themes/<path>` of the core | — | 200, type by extension |
| `GET`/`HEAD` | key of `assets` | — | 200, its `type` |
| `GET`/`HEAD` | `*.css`, `*.js` below pages | — | 200 file |
| `POST` | `/gramlot/main` | `{pageId}` JSON | 200 TYTX Source |
| `POST` | `/gramlot/source` | `{pageId, method, params?}` | 200 TYTX Source |
| `POST` | `/gramlot/close` | `{pageId}` | 200 `{"ok":true}` |
| `GET` | page path, `<path>/index.html` | — | 200 HTML bootstrap, CSP header when configured |

`Cache-Control: no-store` everywhere but the runtime (`X-Content-Type-Options: nosniff`).
`/gramlot/source`: remote Source requests. Source methods (`source(...)`, `remoteSource`) are not yet part of the page-writing API: they arrive together with the `remote` grammar attribute and `@endpoint`.

<a id="gn-130-020"></a>

## 020 · Status codes

Block ID: **GN-130-020**.

301 bare prefix → prefix `/`; 400 undecodable path / invalid or missing payload, `pageId`, `method`, `params`;
404 `Not found` (outside the prefix, unknown page, bad segment, escaping path, non-companion file,
expired or unowned page); 404 `Unknown Source method`; 405 wrong method; 413
body > 4096 bytes; 415 not `application/json`; 503 `maxPages`; 500 other
errors → `onError`.

<a id="gn-130-025"></a>

## 025 · The command gramlot

Block ID: **GN-130-025**.

`gramlot node|bun gallery [--host 127.0.0.1] [--port 8080] [--mount PATH]
[--catalog CATALOG.json PAGES]...`: gallery of `@gramlot/gramlot-examples`, common
families + `node-01`/`bun-01` + each `--catalog`. Prints `Gramlot gallery (node):
<URL>`; stops on `SIGINT`/`SIGTERM`; runs again with `bun`/`node` when asked
(`gramlot: bun is not on PATH`); missing examples package → `The gallery needs
@gramlot/gramlot-examples: …`. gramlot-py-server installs a Python `gramlot` too: run
this one through `npx gramlot` or `node_modules/.bin`, the Python one inside its
virtual environment. Staging in a temporary folder (GE-010 §025); checked
by `server/test/verify_gallery_browser.mjs`.
