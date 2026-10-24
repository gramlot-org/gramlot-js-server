# 030 · Reference

Document ID: **GN-130**. [Concise mirror](../docs_llm/030-reference.md).

<a id="gn-130-005"></a>

## 005 · Package exports

Block ID: **GN-130-005**.

| Specifier | Export | Runtime |
| --- | --- | --- |
| `@gramlot/gramlot-js-server/node` | `startServer(options)` | Node.js 22 or later, `node:http` |
| `@gramlot/gramlot-js-server/bun` | `startServer(options)` | Bun, `Bun.serve`; throws `The Bun host requires Bun` elsewhere |

`@gramlot/gramlot` is a peer dependency: the application and the adapter
resolve the same copy of the core, or `instanceof Page` fails
([Troubleshooting](040-troubleshooting.md)). The Page base class,
`GramlotServer` and `GramlotFileServer` are the core's: `@gramlot/gramlot/page` and
`@gramlot/gramlot/server`. The package installs the command `gramlot`
(section 025); `@gramlot/gramlot-examples` 0.3.4 or later is an optional peer
dependency, needed by `gramlot … gallery` only.

<a id="gn-130-010"></a>

## 010 · startServer

Block ID: **GN-130-010**.

```js
const app = await startServer(options);
```

`options` is described in [Configuration](020-configuration.md). The promise
resolves when the server listens and rejects when it cannot (address in use,
runtime file missing). The result:

| Property | Type | Meaning |
| --- | --- | --- |
| `url` | string | `http://<hostname>:<port>` with the bound port |
| `gramlotServer` | `GramlotServer` | The `GramlotFileServer` built from `pages`, or the `server` passed in |
| `server` | `http.Server` or `Bun.Server` | The listening server |
| `close()` | `async () => void` | Clears the page registry, closes connections, stops the server |

<a id="gn-130-015"></a>

## 015 · HTTP endpoints

Block ID: **GN-130-015**.

Paths are shown with the default `GramlotServer` options and without mount prefix; with
`mountPath` every path starts with it. In this order:

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET`, `HEAD` | `/app.webmanifest` | — | 200 `application/manifest+json` for an installable root page; 404 otherwise |
| `GET`, `HEAD` | `/assets/gramlot.js` | — | 200 `text/javascript`, the runtime chosen by `runtimeAsset()` of the core (`GRAMLOT_DEV`, [Configuration](020-configuration.md)) |
| `GET`, `HEAD` | `/themes/<path>`, a file of the core themes | — | 200, media type of the extension |
| `GET`, `HEAD` | a key of `assets` | — | 200, the `type` of the entry |
| `GET`, `HEAD` | `*.css`, `*.js` below the pages folder | — | 200 `text/css` or `text/javascript` |
| `POST` | `/gramlot/rpc` | the request envelope `{id, pageId, contentType, name, params}` as TYTX JSON, `application/json` | 200 `application/json`, the response envelope of `GramlotServer.call`: `{id, contentType, value}` or `{id, contentType, error: {code, name, message}}` |
| `POST` | `/gramlot/close` | `{"pageId"}` | 200 `{"ok": true}`, always |
| `GET` | any page path (`/`, `/orders`, `/orders/index.html`) | — | 200 `text/html`, the bootstrap document; `Content-Security-Policy` when configured; `Set-Cookie: gramlot_owner=…` |

Page and RPC responses carry `Cache-Control: no-store`. The runtime carries
`Cache-Control: no-cache` and `X-Content-Type-Options: nosniff`. Verified collection
assets use fingerprinted URLs and `Cache-Control: public, max-age=31536000, immutable`;
the process serves the bytes verified at startup. Other assets remain `no-store`.
A page response sets the owner cookie `gramlot_owner` ([Configuration](020-configuration.md)).
Every 405 carries an `Allow` header: `GET, HEAD` on the runtime, the theme files, the
assets, the companions and the manifest, `POST` on rpc and close, `GET` on a page
(`HEAD` on a page answers 405 too). These are the rules of the public
[server protocol](https://gramlot.readthedocs.io/en/latest/docs/public/101-server-protocol.html), Part B.

`/gramlot/rpc` answers every call of the page: `contentType: 'source'` with `name: 'main'`
for the page, `'source'` with another name for a Source method, `'data'` for an endpoint
(`Page.registerEndpoint`). An unknown, expired or unowned page, an unknown name, an `auth`
rule and an exception of the method are outcomes in the envelope (`page_expired`,
`not_found`, `not_authenticated`, `not_authorized`, `application_error`), with status 200.
Declare Source fragments with `Page.registerSource` and mount them with `remote`;
use `dataRpc` for endpoint values and `dataRemote` for lazy Data. See [Calling the server](https://github.com/gramlot-org/gramlot/blob/main/docs/public/098-server-calls.md#gc-095-100)
and [Remote content and lazy Data](https://github.com/gramlot-org/gramlot/blob/main/docs/public/099-remote-content.md#gc-095-105).

RPC and close require the exact media type `application/json`, compared without
case sensitivity and with semicolon parameters allowed (`Application/JSON` and
`application/json; charset=utf-8` are accepted). Missing/empty types and lookalikes
such as `application/jsonp` answer 415. Both bodies are read with `decodeBody` of
the core: strict UTF-8 with a leading byte order mark removed. Invalid bytes
answer 400 `Request body is not UTF-8` before endpoint execution or page closure.
Rejected requests leave the page usable.

<a id="gn-130-020"></a>

## 020 · Status codes

Block ID: **GN-130-020**.

| Status | Body | When |
| --- | --- | --- |
| 301 | — | The mount prefix without its final slash; `Location` is the prefix with `/` |
| 400 | `Invalid path` | A path that does not decode |
| 400 | `Request body is not UTF-8` | Invalid UTF-8 bytes in an rpc or close body |
| 400 | the message of the `InvalidRequest` of `GramlotServer.call`: `Request is not TYTX text`, `Request must be a mapping`, `Request <field> must be a string` (`id`, `pageId`, `contentType`, `name`), `Request contentType must be source or data`, `Request params must be a mapping` | An rpc body that is not an envelope |
| 400 | `Close message is not JSON`, `Close message pageId must be a string` | A close body that is not JSON or has no string `pageId` |
| 404 | `Not found` | A path outside the mount prefix, unknown page path, invalid segment, path leaving the folder, file not a companion |
| 405 | `Method not allowed`, with `Allow` | A method the URL does not accept: any method but `GET` on a page (`HEAD` included, `Allow: GET`); any method but `GET` and `HEAD` on the runtime, a theme file, an asset, a companion or the manifest (`Allow: GET, HEAD`); any method but `POST` on rpc or close (`Allow: POST`) |
| 415 | `Expected application/json` | Another content type on rpc or close |
| 503 | `Page registry capacity reached` | `maxPages` reached |
| 500 | `Internal server error` | Any other error; the error object reaches `onError` |

<a id="gn-130-025"></a>

## 025 · The command gramlot

Block ID: **GN-130-025**.

The runtime comes first, then the command:

```sh
gramlot node gallery [--host HOST] [--port PORT] [--mount PATH] [--catalog CATALOG.json PAGES]... [--serverless-download URL]
gramlot bun gallery  [same options]
```

`gallery` serves the gallery of `@gramlot/gramlot-examples` on Node.js or Bun:
the families of the `catalog.json` of the installed examples package and
the families of each `--catalog`, a pair of an environment `catalog.json` and its
pages folder (GE-010 of gramlot-examples).

| Option | Default | Effect |
| --- | --- | --- |
| `--host` | `127.0.0.1` | Listening address |
| `--port` | `8080` | Listening port; `0` selects a free one |
| `--mount` | none | Serves every URL under the prefix: `--mount /js` → `http://127.0.0.1:8080/js/` |
| `--catalog` | none | Two values, repeatable |
| `--serverless-download` | none | URL of an offline gallery ZIP that the deployment serves; the gallery shows a footer link to it ([Tutorial](010-tutorial.md), section 040) |

The command prints `Gramlot gallery (node): <URL>` and stops on `SIGINT` or
`SIGTERM`. Each example opens at the URL of its key (`/js/<key>`). `gramlot bun
gallery` started from Node runs again with `bun`, and `gramlot node gallery`
started from Bun runs again with `node`; a missing executable is reported as
`gramlot: bun is not on PATH`. Without `@gramlot/gramlot-examples` the command
answers `The gallery needs @gramlot/gramlot-examples: npm install @gramlot/gramlot-examples`.

[gramlot-py-server](https://github.com/gramlot-org/gramlot-py-server) installs a
Python command with the same name, `gramlot`. Run each one from its own
installation, so they do not clash: this command through `npx gramlot` or the
project's `node_modules/.bin`, the Python command inside its virtual environment.

The gallery stages one page module per example in a temporary folder, removed on
stop: a subclass of the example that adds the gallery frame script, its stylesheet
and a `<key>_aux.js` that re-exports every name of the example's page module
(`export *`: `Logic` when the module exports it, no `Logic` when it does not), served
as JavaScript (GE-010 §025 of gramlot-examples). The test
`server/test/verify_gallery_browser.mjs` opens every example under `/js` in a real
browser.

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
