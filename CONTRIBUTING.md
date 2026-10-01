# Contributing

## Setup

```sh
npm install                                   # released core from the JSR registry
npm install --no-save playwright && npx playwright install chromium   # browser checks only
python3 -m venv .venv && .venv/bin/pip install -r requirements-docs.txt   # documentation only
```

To test against the core `main` branch, place a `gramlot` checkout beside this
repository, build its runtime (`npm --prefix js install && npm --prefix js run build`)
and link it: `npm install --no-save @gramlot/gramlot@file:../gramlot/js`.
The link is not saved in `package.json`.

## Checks before a commit

```sh
npm test                                 # exporter tests
npm run test:coverage                    # the same with lcov in coverage/
node scripts/verify_quickstart_browser.mjs node_modules/playwright/index.mjs    # README quick start, file and directory
node scripts/verify_native_html_browser.mjs <built.html> node_modules/playwright/index.mjs - '<h1 text>' [method]
node scripts/verify_worker_sentinel_browser.mjs node_modules/playwright/index.mjs   # linked core only
.venv/bin/python scripts/check_docs.py   # when documentation changes
```

## Commits and branches

- New work on `develop`; `main` holds verified, owner-accepted work.
- Messages: imperative subject in English, present tense.
- Use `git switch`, never `git checkout`. Never force-push a pushed branch:
  fixes land as new commits.
- No AI, LLM or assistant references in commits, pull requests, code, comments
  or documents; no assistant `Co-Authored-By` trailers; no `Generated with …`
  lines.
- Pair `docs/` and `docs_llm/` guides: namespace GS, shared Document and Block
  IDs, lowercase anchors. `scripts/check_docs.py` validates and builds both.
  Published guides: `docs/105-…` to `docs/140-…`. Internal notes (architecture,
  core contract, verification records, showcase): `docs/internal/`, kept out of
  the published build.

## Releases

No registry publication, tag or deployment without owner authorization.
