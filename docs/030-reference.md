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
([Troubleshooting](040-troubleshooting.md)). The Page base class, `source`,
`Host` and `FileHost` are the core's: `@gramlot/gramlot/page` and
`@gramlot/gramlot/server`. The package installs the command `gramlot`
(section 025); `@gramlot/gramlot-examples` 0.2.4 or later is an optional peer
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
| `host` | Host | The `FileHost` built from `pages`, or the `host` passed in |
| `server` | `http.Server` or `Bun.Server` | The listening server |
| `close()` | `async () => void` | Clears the page registry, closes connections, stops the server |

<a id="gn-130-015"></a>

## 015 · HTTP endpoints

Block ID: **GN-130-015**.

Paths are shown with the default Host options and without mount prefix; with
`mountPath` every path starts with it. In this order:

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `GET`, `HEAD` | `/assets/gramlot.js` | — | 200 `text/javascript`, the runtime |
| `GET`, `HEAD` | `/themes/<path>`, a file of the core themes | — | 200, media type of the extension |
| `GET`, `HEAD` | a key of `assets` | — | 200, the `type` of the entry |
| `GET`, `HEAD` | `*.css`, `*.js` below the pages folder | — | 200 `text/css` or `text/javascript` |
| `POST` | `/gramlot/main` | `{"pageId"}` as `application/json` | 200 `application/json`, the Source of `main` in TYTX |
| `POST` | `/gramlot/source` | `{"pageId", "method", "params"?}` | 200 `application/json`, the Source of the method |
| `POST` | `/gramlot/close` | `{"pageId"}` | 200 `{"ok": true}`, always |
| `GET` | any page path (`/`, `/orders`, `/orders/index.html`) | — | 200 `text/html`, the bootstrap document; `Content-Security-Policy` when configured |

Every response of the adapter carries `Cache-Control: no-store`, except the
runtime, which carries `X-Content-Type-Options: nosniff`.

<a id="gn-130-020"></a>

## 020 · Status codes

Block ID: **GN-130-020**.

| Status | Body | When |
| --- | --- | --- |
| 301 | — | The mount prefix without its final slash; `Location` is the prefix with `/` |
| 400 | `Invalid path` | A path that does not decode |
| 400 | `Invalid main payload`, `Missing main payload`, `Missing pageId`, `Invalid Source request` | A body that is not JSON, has no `pageId`, or a `method`/`params` of the wrong type |
| 404 | `Not found` | A path outside the mount prefix, unknown page path, invalid segment, path leaving the folder, file not a companion, expired or unowned page |
| 404 | `Unknown Source method` | `method` is `main`, unmarked or missing |
| 405 | `Method not allowed` | `POST` on a page, a companion, an asset, a theme file or the runtime; `GET` on an endpoint |
| 413 | `Payload too large` | A JSON body above 4096 bytes |
| 415 | `Expected application/json` | Another content type on an endpoint |
| 503 | `Page registry capacity reached` | `maxPages` reached |
| 500 | `Internal server error` | Any other error; the error object reaches `onError` |

<a id="gn-130-025"></a>

## 025 · The command gramlot

Block ID: **GN-130-025**.

The runtime comes first, then the command:

```sh
gramlot node gallery [--host HOST] [--port PORT] [--mount PATH] [--catalog CATALOG.json PAGES]...
gramlot bun gallery  [same options]
```

`gallery` serves the gallery of `@gramlot/gramlot-examples` on Node.js or Bun:
the common families (`e01`–`e13`, `b01`–`b11`, `c01`–`c09`), the family of the
runtime of this package (`node-01` or `bun-01`, the quick start of the README) and
the families of each `--catalog`, a pair of an environment `catalog.json` and its
pages folder (GE-010 of gramlot-examples).

| Option | Default | Effect |
| --- | --- | --- |
| `--host` | `127.0.0.1` | Listening address |
| `--port` | `8080` | Listening port; `0` selects a free one |
| `--mount` | none | Serves every URL under the prefix: `--mount /js` → `http://127.0.0.1:8080/js/` |
| `--catalog` | none | Two values, repeatable |

The command prints `Gramlot gallery (node): <URL>` and stops on `SIGINT` or
`SIGTERM`. Each example opens at the URL of its key (`/js/c03`). `gramlot bun
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
and a `<key>_aux.js` that re-exports `Logic` from the example's page module, served
as JavaScript (GE-010 §025 of gramlot-examples). The test
`server/test/verify_gallery_browser.mjs` opens every example under `/js` in a real
browser.
