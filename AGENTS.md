# gramlot-js-server repository instructions

Read README.md and the guides in `docs/` before changing this repository.
Follow ../gramlot/AGENTS.md and its constitution for framework matters.

The repository is an npm workspace with two packages:

- `server/`, `@gramlot/gramlot-js-server`: the Node.js and Bun host adapter;
- `browser/`, `@gramlot/gramlot-browser`: the standalone Browser/Worker
  exporter.

## Rules common to both packages

- `@gramlot/gramlot` is installed from the registry by `npm install` at the
  root. Verification against the core `main` branch links a checkout with
  `npm install --no-save @gramlot/gramlot@file:../gramlot/js`. Never save a
  local path in `package.json`; never copy the framework into this repository.
- Keep code, comments and maintained documentation in English.
- Pair `docs` and `docs_llm` guides; three-digit filenames spaced by five;
  shared Document and Block IDs and lowercase anchors; retired blocks keep their
  anchor. Namespace **GN** for the server guides (files `005`–`040`, IDs
  GN-105 to GN-140; internal notes GN-005 and GN-010 in `docs/internal/`) and
  **GS** for the browser guides (files `105`–`140`, IDs GS-105 to GS-140;
  internal notes GS-005 to GS-030 in `docs/internal/browser/`). Internal
  notes stay out of the published build. Document IDs are never reused: new
  guides take new numbers. Run `python scripts/check_docs.py` after changing
  documentation.
- Use `develop` for new work; `main` holds verified, owner-accepted work.
- Git: `git switch`, never `git checkout`; never force-push a pushed branch;
  commit messages with an imperative English subject.
- **No AI, LLM or assistant references anywhere**: not in commits, pull
  requests, code, comments or documents. Never add `Co-Authored-By` trailers
  for assistants or `Generated with …` lines. This is a contractual
  obligation.
- No registry publication, tag, release, deployment or visibility change
  without owner authorization.

## server/

- It serves the Gramlot 0.2.0 minimal Host contract (`resolvePage`,
  `resolveResources`, `openPage`) and owns only HTTP routing, payload parsing,
  response mapping and request identity. Page execution, registrations and TTL
  stay in the core Host.
- Use `node:http` on Node and the native `fetch` server on Bun; no Express, no
  database adapters.
- The README quick start is the page in `server/test/fixtures/quickstart/`,
  executed by `server/test/quickstart.test.mjs`; change both together.
- Before a commit: `npm test -w server` and, from `server/`,
  `bun test test/server.test.mjs test/quickstart.test.mjs`; for behavior
  changes also the browser harness `server/test/browser.mjs`.

## browser/

- It owns JS bundling, HTML and directory packaging, `WorkerHost`,
  `WorkerTransport` and the standalone startup. It does not own Gramlot Source,
  Data Bags, Host or the browser runtime; `WorkerHost` delegates Page execution
  to the core Host through `@gramlot/gramlot/host`.
- Never ship a substitute runtime, a manual application DOM, an eval bootstrap
  or a fallback compiler. Fail if an accepted integration is unavailable.
- Offline builds reject `dataRpc` and server resolvers. Only `application_data`
  crosses the JSON boundary through a typed Bag codec.
- The single-file profile applies the strict CSP (script hash, `blob:`, no
  `'unsafe-inline'`, no `'unsafe-eval'`); the directory profile writes no CSP.
  A `*_aux` file is a page companion for the window, never a page.
- The README quick start is `browser/examples/quickstart/`, run by
  `browser/tests/quickstart.test.js` and
  `browser/scripts/verify_quickstart_browser.mjs`: change them together.
- Before a commit: `npm test -w browser`; for behavior changes also the
  browser checks in `browser/scripts/`.

## History

> **Naming (2026-10-02):** in the dated text of this document, "native" as the label of a release, profile, milestone, adapter, module, API or pages names the scope of the 0.1.0 milestone (no web components, no recipes). That label has no technical meaning; current documents do not use it ([GC-005 §030](https://github.com/gramlot-org/gramlot/blob/main/docs/005-documentation-policy.md#gc-005-030)). "native" for browser controls, DOM events, HTML attributes, DOM operations, Bag events or platform APIs keeps its technical meaning. Dated text is not rewritten.

The owner approved JavaScript page authoring for the local PoC on 2026-09-16,
authorized the public `gramlot-js-server` repository on 2026-09-17 and accepted
the clean-core native 0.1.0 profile on 2026-09-24. GN-005
(`docs/internal/005-node-host.md`) records the earlier sibling-PoC server, whose
code was removed on 2026-10-01 and remains in the history before that date;
GN-010 (`docs/internal/010-hosts.md`) records the native profile and its
verification. Neither overrides the native Host/Page contract.

The Browser/Worker profile started in `gramlot-minimal` on 2026-09-24 (core
constitution amendment 11.46 assigns the standalone Worker transport and
startup to this side), then lived in the `gramlot-serverless` repository with
the package `@gramlot/serverless`. On 2026-10-01 the owner merged it into this
repository with its history; the package became `@gramlot/gramlot-browser`, in
`browser/`, and the server entry points lost the `native` prefix of the 0.1.0
profile (`/node`, `/bun`, `startServer`).
Historical names are not compatibility aliases.
