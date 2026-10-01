# gramlot-js-server repository instructions

Read README.md and the guides in `docs/` before changing this repository.
Follow ../gramlot/AGENTS.md and its constitution for framework matters.

- This is the Node.js and Bun host adapter for Gramlot pages. It serves the
  Gramlot 0.2.0 minimal Host contract (`resolvePage`, `resolveResources`,
  `openPage`) and owns only HTTP routing, payload parsing, response mapping and
  request identity. Page execution, registrations and TTL stay in the core Host.
- `@gramlot/native-html` is a peer dependency, linked from a core checkout with
  `npm install --no-save ../gramlot/js`. Never save a local path in
  `package.json`; never copy the framework into this repository.
- Use `node:http` on Node and the native `fetch` server on Bun; no Express, no
  database adapters.
- Keep code, comments and maintained documentation in English.
- Pair `docs` and `docs_llm` guides; namespace **GN**; three-digit filenames
  spaced by five; shared Document and Block IDs and lowercase anchors. Run
  `python scripts/check_docs.py` after changing documentation. The published
  manual is the user guides GN-105 to GN-140 (`docs/005-introduction.md` to
  `docs/040-troubleshooting.md`); the internal notes GN-005 and GN-010 live in
  `docs/internal/` and `docs_llm/internal/`, outside the toctree. Document IDs
  are never reused: new guides take new numbers.
- The README quick start is the page in `test/fixtures/quickstart/`, executed
  by `test/quickstart.test.mjs`; change both together.
- Before a commit: `npm run test:native` and
  `bun test test/native.test.mjs test/quickstart.test.mjs`; for behavior
  changes also the browser harness `test/native-browser.mjs`.
- Use `develop` for new work; `main` holds verified, owner-accepted work.
- Git: `git switch`, never `git checkout`; never force-push a pushed branch;
  commit messages with an imperative English subject.
- **No AI, LLM or assistant references anywhere**: not in commits, pull
  requests, code, comments or documents. Never add `Co-Authored-By` trailers
  for assistants or `Generated with …` lines. This is a contractual
  obligation.
- No registry publication, tag, release or deployment without owner
  authorization.

## History

The owner approved JavaScript page authoring for the local PoC on 2026-09-16,
authorized this public repository on 2026-09-17 and accepted the clean-core
native 0.1.0 profile on 2026-09-24. `src/start.mjs` and GN-005
(`docs/internal/005-node-host.md`) record the earlier sibling-PoC server; GN-010
(`docs/internal/010-native-html.md`) records the native profile and its
verification. Neither overrides the native Host/Page contract.
