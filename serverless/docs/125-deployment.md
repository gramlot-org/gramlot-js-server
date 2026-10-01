# 125 · Deployment

Document ID: **GS-125**.

[Paired view](../docs_llm/125-deployment.md).

<a id="gs-125-005"></a>

## 005 · Opening from disk

Block ID: **GS-125-005**.

The single file opens with a double-click or a `file://` URL. The directory export
opens from `index.html`, and each route from `<route>/index.html`; the documents
reference `assets/` through relative paths, and `mount` receives the directory
itself as `assetRoot`, so the directory can be moved or renamed as a whole. Keep
its contents together: the shared runtime, the workers and the listed assets.

Both forms make no network request at start (`scripts/verify_quickstart_browser.mjs`
blocks HTTP and HTTPS and passes). The file can be sent by mail or copied to a USB
key; the recipient needs a browser, not Node.

<a id="gs-125-010"></a>

## 010 · Static hosting

Block ID: **GS-125-010**.

Any static web server or object store serves the export: there is nothing to run
on the server side.

- Single file: serve it as `text/html`. Its Content Security Policy is in the
  document, so no header is required. Served from `https://`, the policy still
  forbids connections from the document (`connect-src 'none'`).
- Directory: serve the directory as is, under any path prefix, with `text/html`
  for the documents, `text/javascript` for `assets/`, and `text/css` for the
  stylesheets you listed. No rewrite rule is needed. The documents carry no policy:
  the server may set a `Content-Security-Policy` header. The documents load their
  scripts from `assets/` and start a Blob Worker and a Blob module, so such a
  header must allow `'self'` and `blob:` for scripts and workers. A server header
  is not tested in this repository.
- Caching: the single file changes at every build (its hash is in the policy);
  the directory's `assets/standalone.js` changes with the core version.

<a id="gs-125-015"></a>

## 015 · Security notes

Block ID: **GS-125-015**.

- Nothing is served dynamically: the export contains only what the pages import,
  the companions and the assets listed in `buildDirectory`. A `Page.css` URL that
  points outside the export is not resolved by anything.
- The companion runs in the browser and is readable by anyone who has the file.
  Server-only logic (queries, keys, data access) has no place in an export.
- The single file accepts no inline code: a page that relies on inline formulas or
  handlers fails at start instead of running unreviewed code.
- The Worker has no server to talk to; `remoteSource` stays inside the browser.
- Build only pages from folders you trust: `build` and `buildDirectory` bundle
  the page's imports as they are.

<a id="gs-125-020"></a>

## 020 · Production checklist

Block ID: **GS-125-020**.

1. `npm test` and `scripts/verify_quickstart_browser.mjs` pass with the core
   version you ship (`node -p "require('@gramlot/gramlot/package.json').version"`).
2. Every `Page.css` URL of a directory export is root-relative and listed in
   `assets`; the single-file pages declare none.
3. All logic is named: no `formula`, `script`, `==`, `action` or
   `connect_on<event>` strings in the pages.
4. The export opens from `file://` with no console error before it is uploaded.
5. The runtime notices (`gramlot-runtime-notices` or `assets/runtime-notices.json`)
   travel with the export: they carry the licenses of the bundled software.
