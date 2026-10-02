# 005 · Introduction

Document ID: **GN-105**. [Concise mirror](../docs_llm/005-introduction.md).

Gramlot describes web interfaces in Python or JavaScript and keeps them bound to
the application state in the browser. [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html)
explains Page, Source, Data, logic and Host, and lists the repositories.

<a id="gn-105-005"></a>

## 005 · What this adapter does

Block ID: **GN-105-005**.

gramlot-js-server serves JavaScript Gramlot pages from Node.js 22 or Bun. It
connects a folder of trusted Page modules to the core's `FileHost` and exposes
the pages over HTTP. `startServer` from `@gramlot/gramlot-js-server/node` runs on
`node:http`; the same function from `@gramlot/gramlot-js-server/bun` runs on `Bun.serve`.

The adapter owns the HTTP side: routing, bounded payload parsing, the response
and error mapping, the request identity, the mount prefix and the Content
Security Policy header. The core's Host owns the pages: it finds the Page class,
builds the bootstrap document, runs `main` and the remote Source methods, and
closes the page. No database and no Python process are involved.

<a id="gn-105-010"></a>

## 010 · The request flow on this host

Block ID: **GN-105-010**.

1. **Page URL.** The browser requests `GET /` or `GET /orders`. The adapter asks
   the Host to open the page: `FileHost` maps the path to `index.js` or
   `orders.js` in the pages folder and registers a page instance with a TTL.
2. **Bootstrap document.** The answer is a small HTML document: a root `div`, a
   module script with a nonce, the page's resources (the `Page.css` URLs, the
   page stylesheet, the companion module) and the URLs of the three endpoints.
   When a Content Security Policy is configured, the header carries the nonce.
3. **Runtime.** The script imports the Gramlot runtime from `/assets/gramlot.js`,
   served by the adapter from the linked core.
4. **Main.** The runtime posts the page ID to `/gramlot/main`. The Host creates the
   Page instance, runs `main(root)` and answers with the Source as TYTX JSON.
5. **Source to browser.** The runtime renders the DOM from the Source, installs the
   Data declarations and starts the bindings. Typing in a bound field writes the
   Data; formulas and controllers react; the DOM follows.
6. **Remote Source.** A named method of the page can call `remoteSource`; the
   runtime posts the page ID, the method name and the parameters to
   `/gramlot/source` and receives a Source branch.
7. **Close.** When the browser leaves the page it posts the page ID to
   `/gramlot/close`; the TTL covers the cases where that request is lost.

<a id="gn-105-015"></a>

## 015 · What this adapter does not do

Block ID: **GN-105-015**.

- Python pages: use [gramlot-uvicorn](https://github.com/gramlot-org/gramlot-uvicorn).
- Pages without a server, as one HTML file or a static folder:
  use [@gramlot/gramlot-serverless](105-introduction.md).
- Application assets outside the pages folder (images, fonts, a shared theme):
  the adapter serves only the runtime and the page companions; a front server or
  the application serves the rest ([Deployment](025-deployment.md)).
- Authentication: the adapter passes a request identity to the Host through
  `ownerForRequest`; it does not implement sessions or logins.
