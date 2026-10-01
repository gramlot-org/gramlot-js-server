# Contributing

## Setup

```sh
npm install                                   # both packages, with the released core from npm
npm install --no-save playwright && npx playwright install chromium   # browser checks only
python3 -m venv .venv && .venv/bin/pip install -r requirements-docs.txt   # documentation only
```

To test against the core `main` branch, place a `gramlot` checkout beside this
repository, build its runtime (`npm --prefix js install && npm --prefix js run build`)
and link it: `npm install --no-save @gramlot/gramlot@file:../gramlot/js`.
The link is not saved in `package.json`.

## Checks before a commit

```sh
npm run test:server -w server            # Node contract and quick-start tests
(cd server && bun test test/server.test.mjs test/quickstart.test.mjs)   # the same on Bun
npm test -w browser                      # exporter tests
npm run test:coverage -w server          # lcov in server/coverage/
npm run test:coverage -w browser         # lcov in browser/coverage/
.venv/bin/python scripts/check_docs.py   # when documentation changes
```

Browser checks of the exporter, from `browser/`:

```sh
node scripts/verify_quickstart_browser.mjs ../node_modules/playwright/index.mjs    # README quick start, file and directory
node scripts/verify_export_browser.mjs <built.html> ../node_modules/playwright/index.mjs - '<h1 text>' [method]
node scripts/verify_worker_sentinel_browser.mjs ../node_modules/playwright/index.mjs   # linked core only
```

`npm test -w server` also runs the historical PoC tests, which need the sibling
`gramlot-poc` checkout.

## Commits and branches

- New work on `develop`; `main` holds verified, owner-accepted work.
- Messages: imperative subject in English, present tense.
- Use `git switch`, never `git checkout`. Never force-push a pushed branch:
  fixes land as new commits.
- No AI, LLM or assistant references in commits, pull requests, code, comments
  or documents; no assistant `Co-Authored-By` trailers; no `Generated with …`
  lines.
- Pair `docs/` and `docs_llm/` guides: namespace GN for the server, GS for
  the browser exporter, shared Document and Block IDs, lowercase anchors.
  `scripts/check_docs.py` validates and builds both. Internal notes stay in
  `docs/internal/` and `docs_llm/internal/`, out of the published build.
- The README quick starts are `server/test/fixtures/quickstart/` and
  `browser/examples/quickstart/`: keep the README, the tutorials and the
  fixtures equal.

## Releases

No registry publication, tag or deployment without owner authorization.
