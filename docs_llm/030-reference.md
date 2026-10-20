# 030 · Reference

Document ID: **GN-130**. [Expanded version](../docs/030-reference.md).

<a id="gn-130-005"></a>

## 005 · Package exports

Block ID: **GN-130-005**.

`@gramlot/gramlot-js-server/node` → `startServer` (Node 22+, `node:http`);
`@gramlot/gramlot-js-server/bun` → `startServer` (Bun; elsewhere throws `The Bun
host requires Bun`). `@gramlot/gramlot` is a peer: one copy for adapter and
pages. `Page`: `@gramlot/gramlot/page`; `GramlotServer`, `GramlotFileServer`:
`@gramlot/gramlot/server`. Command `gramlot` (025); optional peer
`@gramlot/gramlot-examples` >=0.3.4 for the gallery.

<a id="gn-130-010"></a>

## 010 · startServer

Block ID: **GN-130-010**.

`const app = await startServer(options)` ([Configuration](020-configuration.md));
rejects when it cannot listen or read the runtime. Result: `url`
(`http://<hostname>:<port>`), `gramlotServer` (the `GramlotServer`), `server` (`http.Server` or `Bun.Server`),
`close()` (clears the registry, closes connections, stops).

<a id="gn-130-015"></a>

## 015 · HTTP endpoints

Block ID: **GN-130-015**.

In order, each path under `mountPath`:

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET`/`HEAD` | `/app.webmanifest` | — | 200 `application/manifest+json` (installable root); else 404 |
| `GET`/`HEAD` | `/assets/gramlot.js` | — | 200 runtime of `runtimeAsset()` (`GRAMLOT_DEV`) |
| `GET`/`HEAD` | `/themes/<path>` of the core | — | 200, type by extension |
| `GET`/`HEAD` | key of `assets` | — | 200, its `type` |
| `GET`/`HEAD` | `*.css`, `*.js` below pages | — | 200 file |
| `POST` | `/gramlot/rpc` | envelope `{id, pageId, contentType, name, params}`, TYTX JSON | 200 `{id, contentType, value}` or `{id, contentType, error: {code, name, message}}` |
| `POST` | `/gramlot/close` | `{pageId}` | 200 `{"ok":true}` |
| `GET` | page path, `<path>/index.html` | — | 200 HTML bootstrap, CSP header when configured, `Set-Cookie: gramlot_owner` |

`Cache-Control: no-store` everywhere but the runtime (`no-cache`, `X-Content-Type-Options: nosniff`).
A page response sets the cookie `gramlot_owner`. Every 405 has `Allow`: `GET, HEAD` runtime, themes,
assets, companions, manifest; `POST` rpc, close; `GET` page (`HEAD` on a page: 405). Rules of the
public [server protocol](https://gramlot.readthedocs.io/en/latest/docs/public/101-server-protocol.html), Part B.
`/gramlot/rpc`: `source`/`main` the page, `source`/other a Source method, `data` an endpoint;
`page_expired`, `not_found`, `not_authenticated`, `not_authorized`, `application_error` are
outcomes with status 200. Declare Source fragments with `Page.registerSource` and mount them with `remote`;
use `dataRpc` for endpoint values and `dataRemote` for lazy Data. See [Calling the server](https://github.com/gramlot-org/gramlot/blob/main/docs/public/098-server-calls.md#gc-095-100)
and [Remote content and lazy Data](https://github.com/gramlot-org/gramlot/blob/main/docs/public/099-remote-content.md#gc-095-105).

RPC and close require the exact media type `application/json`, compared without
case sensitivity and with semicolon parameters allowed (`Application/JSON` and
`application/json; charset=utf-8` are accepted). Missing/empty types and lookalikes
such as `application/jsonp` answer 415. Both bodies are read with `decodeBody` of the core:
strict UTF-8, a leading byte order mark removed; invalid bytes answer 400 `Request body is
not UTF-8` before endpoint execution or page closure. Rejected requests leave the page usable.

<a id="gn-130-020"></a>

## 020 · Status codes

Block ID: **GN-130-020**.

301 bare prefix → prefix `/`; 400 invalid UTF-8 body, undecodable path, the message of the
`InvalidRequest` of `call` (`Request is not TYTX text`, `Request must be a mapping`, `Request <field> must be a
string`, `Request contentType must be source or data`, `Request params must be a mapping`), close body
not JSON or without string `pageId` (`Close message is not JSON`, `Close message pageId must be a string`);
404 `Not found` (outside the prefix, unknown page, bad segment, escaping path, non-companion file);
405 wrong method, with `Allow`; 415 not `application/json`; 503 `maxPages`; 500 other errors → `onError`.

<a id="gn-130-025"></a>

## 025 · The command gramlot

Block ID: **GN-130-025**.

`gramlot node|bun gallery [--host 127.0.0.1] [--port 8080] [--mount PATH]
[--catalog CATALOG.json PAGES]... [--serverless-download URL]`: gallery of
`@gramlot/gramlot-examples`, the families of its `catalog.json` + each `--catalog`;
`--serverless-download` adds a footer link to an offline gallery ZIP that the deployment serves. Setup quick starts stay in the server documentation,
not in the gallery. Prints `Gramlot gallery (node):
<URL>`; stops on `SIGINT`/`SIGTERM`; runs again with `bun`/`node` when asked
(`gramlot: bun is not on PATH`); missing examples package → `The gallery needs
@gramlot/gramlot-examples: …`. gramlot-py-server installs a Python `gramlot` too: run
this one through `npx gramlot` or `node_modules/.bin`, the Python one inside its
virtual environment. Staging in a temporary folder (GE-010 §025); checked
by `server/test/verify_gallery_browser.mjs`.

Setup quick starts remain in the server README and tutorials; the gallery does
not include their sections or routes. Registration form remains an application
example in the standalone gallery.


<a id="gn-130-030"></a>

## 030 · Root manifest and reusable index

Block ID: **GN-130-030**.

A root Page with `static installable = true`, `static title` and
`static appIcon = '/app-icon.png'` advertises `<prefix>/app.webmanifest`.
Supply that square 512×512 PNG in the existing asset map. The gallery command
already includes its app icon. GET/HEAD return `application/manifest+json`, without
a page session or RPC envelope; other verbs return 405. A disabled root answers
404. Child pages never advertise their own manifest.

Override `manifest({baseUrl = './'} = {})` to extend the object returned by
`super.manifest({baseUrl})`. Default scope, identity, launch and icon URLs use the
mount prefix. Keep the metadata public; no endpoint registration is needed.

`IndexPage` and `IndexLogic` are exported from `@gramlot/gramlot/page` for grouped
navigation, iframe tabs and a customizable footer. See the
[core authoring guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/095-writing-pages.md#gc-095-110).
Install using HTTPS or localhost and keep the Node server running. The gallery
footer explains browser installation and exposes the native prompt when offered.
Safari on macOS Sonoma or later uses File → Add to Dock. No offline cache is added.
