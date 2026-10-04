# Contributing

## Setup

```sh
npm install                                   # the three packages, with the released core from npm
npm install --no-save playwright && npx playwright install chromium   # browser checks only
python3 -m venv .venv && .venv/bin/pip install -r requirements-docs.txt   # documentation only
```

To test against the core `main` branch, place a `gramlot` checkout beside this
repository, build its runtime (`npm --prefix js install && npm --prefix js run build`)
and link it: `npm install --no-save @gramlot/gramlot@file:../gramlot/js`.
The link is not saved in `package.json`.

## Checks before a commit

```sh
npm test -w server                       # Node contract, quick-start and gallery tests
(cd server && bun test test/server.test.mjs test/quickstart.test.mjs test/gallery.test.mjs)   # the same on Bun
npm test -w serverless                   # exporter and static gallery tests
npm test -w create                       # create-gramlot: both templates built and started
npm run test:coverage -w server          # lcov in server/coverage/
npm run test:coverage -w serverless      # lcov in serverless/coverage/
.venv/bin/python scripts/check_docs.py   # when documentation changes
```

Browser checks of the exporter, from `serverless/`:

```sh
node scripts/verify_quickstart_browser.mjs ../node_modules/playwright/index.mjs    # README quick start, file and directory
node scripts/verify_page_module_browser.mjs ../node_modules/playwright/index.mjs   # Page and Logic in one module, stylesheets
node scripts/verify_gallery_browser.mjs ../node_modules/playwright/index.mjs       # gramlot-serverless gallery from disk
node scripts/verify_export_browser.mjs <built.html> ../node_modules/playwright/index.mjs - '<h1 text>' [method]
node scripts/verify_worker_sentinel_browser.mjs ../node_modules/playwright/index.mjs   # linked core only
```

Browser checks of the server, from `server/` (runtime `node` or `bun`):

```sh
node test/browser.mjs node ../node_modules/playwright/index.mjs <chromium executable>   # mount prefix, page logic, CSP
node test/verify_gallery_browser.mjs node ../node_modules/playwright/index.mjs           # gramlot node gallery under /js
```

## Commits and branches

- New work on `develop`; `main` holds verified, owner-accepted work.
- Messages: imperative subject in English, present tense.
- Use `git switch`, never `git checkout`. Never force-push a pushed branch:
  fixes land as new commits.
- No AI, LLM or assistant references in commits, pull requests, code, comments
  or documents; no assistant `Co-Authored-By` trailers; no `Generated with …`
  lines.
- Pair `docs/` and `docs_llm/` guides: namespace GN for the server, GS for
  the serverless exporter and `create-gramlot`, shared Document and Block IDs, lowercase anchors.
  `scripts/check_docs.py` validates and builds both. Internal notes stay in
  `docs/internal/` and `docs_llm/internal/`, out of the published build.
- The README quick starts are `server/test/fixtures/quickstart/` and
  `serverless/examples/quickstart/`: keep the README, the tutorials, the fixtures
  and the gallery pages of `server/gallery/` and `serverless/gallery/` equal (the
  tests compare them). The page template of `create/` is the gallery page
  `serverless-02`.

## Releases

No registry publication, tag or deployment without owner authorization.
