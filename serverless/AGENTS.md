# gramlot-serverless repository instructions

Read README.md and the guides in `docs/` before changing this repository. The
internal notes (architecture, usage history, core contract, verification records,
showcase history) are in `docs/internal/` and `docs_llm/internal/`, out of the
published build.
Follow ../gramlot/AGENTS.md and its constitution for framework matters.

- This is the standalone Browser/Worker exporter for Gramlot JavaScript pages.
  It owns JS bundling, HTML and directory packaging, `WorkerHost`,
  `WorkerTransport` and the standalone startup. It does not own Gramlot Source,
  Data Bags, Host or the browser runtime; `WorkerHost` delegates Page execution
  to the core Host through `@gramlot/gramlot/host`.
- The core is `@gramlot/gramlot >=0.2.0`, installed from the JSR registry by
  `npm install`. Verification against the core `main` branch links a checkout with
  `npm install --no-save @gramlot/gramlot@file:../gramlot/js`. Never save a
  local path in `package.json`; never copy the framework into this repository.
- Never ship a substitute runtime, a manual application DOM, an eval bootstrap
  or a fallback compiler. Fail if an accepted integration is unavailable.
- Offline builds reject `dataRpc` and server resolvers. Only `application_data`
  crosses the JSON boundary through a typed Bag codec.
- The single-file profile applies the strict CSP (script hash, `blob:`, no
  `'unsafe-inline'`, no `'unsafe-eval'`); the directory profile writes no CSP.
  A `*_aux` file is a page companion for the window, never a page.
- Keep code, comments and maintained documentation in English.
- Pair `docs` and `docs_llm` guides; namespace **GS**; three-digit filenames
  spaced by five; shared Document and Block IDs and lowercase anchors; retired
  blocks keep their anchor. Published guides are GS-105 to GS-140; the internal
  notes keep GS-005 to GS-030. Run `python scripts/check_docs.py` after changing
  documentation. The README quick start is `examples/quickstart/`, run by
  `tests/quickstart.test.js` and `scripts/verify_quickstart_browser.mjs`: change
  them together.
- Before a commit: `npm test`; for behavior changes also the browser checks
  (`scripts/verify_quickstart_browser.mjs`, `scripts/verify_native_html_browser.mjs`,
  `scripts/verify_worker_sentinel_browser.mjs`).
- Use `develop` for new work; `main` holds verified, owner-accepted work.
- Git: `git switch`, never `git checkout`; never force-push a pushed branch;
  commit messages with an imperative English subject.
- **No AI, LLM or assistant references anywhere**: not in commits, pull
  requests, code, comments or documents. Never add `Co-Authored-By` trailers
  for assistants or `Generated with …` lines. This is a contractual
  obligation.
- No registry publication, tag, release, deployment or visibility change
  without owner authorization.

## History

The owner accepted the clean-core native 0.1.0 profile on 2026-09-24, approved
the integration-repository name `gramlot-minimal` for the Python/Uvicorn and
Browser/Worker profiles the same day, and assigned the standalone Worker
transport and startup to this side (core constitution amendment 11.46). The
repositories were later split: this repository is `gramlot-serverless`, with the
package `@gramlot/serverless` and the `gramlot-serverless` command; historical
standalone names are not compatibility aliases. Core 0.2.0, which this exporter
requires, was released on 2026-09-30. `examples/showcase` and `showcase.zip`
record the earlier PoC and do not override the native Host/Page/Worker contract.
