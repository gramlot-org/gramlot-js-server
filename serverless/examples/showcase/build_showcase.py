"""Export the unified PoC showcase as a relocatable offline directory and ZIP.

Run with the PoC Python dependencies and its src/ on PYTHONPATH. Browser assets
are built separately by build_runtime.mjs. No lesson bodies are rewritten.
"""
from __future__ import annotations
import argparse
import hashlib
from html import escape
import importlib.util
import json
from pathlib import Path
import shutil
import zipfile

from gramlot.builder import GramlotBuilder
from gramlot.showcase import ShowcaseCatalog, get_showcase_directory
from gramlot.showcase.demo_catalog import CATALOG
from gramlot.transport import to_tytx


def load_page(path):
    spec = importlib.util.spec_from_file_location('export_' + path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.Page


def build(poc, assets, destination):
    if not all((assets / filename).is_file() for filename in ('runtime.js', 'provenance.json', 'THIRD-PARTY-NOTICES.txt')):
        raise FileNotFoundError('Build the browser assets before exporting the showcase')
    original = get_showcase_directory().resolve() / 'pages'
    if not original.is_relative_to(poc.resolve()):
        raise ValueError('PYTHONPATH must select the same PoC checkout passed to --poc')
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copytree(assets, destination / 'assets', dirs_exist_ok=True)
    pages = [('index', load_page(original / 'index.py'), 'index.html')]
    pages += [(lesson.id, load_page(original / f'{lesson.id}.py'), f'pages/{lesson.id}.html')
              for lesson in CATALOG.lessons]
    manifest = {'format': 'gramlot-showcase-directory', 'version': 1,
                'hosting': 'offline file or static HTTP', 'pages': [], 'source_sha256': {},
                'limitations': ['No Python RPC backend; the RPC lesson displays an offline error.',
                                'Development export from gramlot-poc; not an accepted core port.']}
    for name, page_class, relative in pages:
        page = page_class()
        if name == 'index':
            page.catalog = ShowcaseCatalog(CATALOG.lessons, default=CATALOG.default,
                                           page_url='pages/{id}.html')
            page.host_label = 'Standalone · offline'
        builder = GramlotBuilder(name)
        page.main(builder.root)
        payload = {'name': name, 'source': to_tytx(builder.source),
                   'inspector': getattr(page, 'source_inspection', False)}
        encoded = json.dumps(payload, ensure_ascii=False).replace('<', '\\u003c')
        prefix = '' if name == 'index' else '../'
        title = 'Gramlot Showcase' if name == 'index' else next(l.title for l in CATALOG.lessons if l.id == name)
        html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title><style>html,body,#app{{margin:0;width:100%;height:100%;}} #boot-error{{padding:1rem;color:#a21;white-space:pre-wrap}}</style>
</head><body><main id="app"></main><noscript>This showcase requires JavaScript.</noscript>
<script id="gramlot-page" type="application/json">{encoded}</script>
<script src="{prefix}assets/runtime.js"></script>
</body></html>'''
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html)
        source_path = original / f'{name}.py'
        source_rel = f'source/pages/{name}.py'
        copy = destination / source_rel
        copy.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, copy)
        manifest['source_sha256'][source_rel] = hashlib.sha256(source_path.read_bytes()).hexdigest()
        manifest['pages'].append({'id': name, 'path': relative, 'title': title})
    shared = original.parent.parent
    for filename in ('__init__.py', 'demo_catalog.py', 'showcase.css', 'navigation-tree.css'):
        source_path = shared / filename
        target = destination / 'source' / filename
        shutil.copy2(source_path, target)
        manifest['source_sha256'][f'source/{filename}'] = hashlib.sha256(source_path.read_bytes()).hexdigest()
    for filename in ('LICENSE', 'NOTICE'):
        path = poc / filename
        if path.exists(): shutil.copy2(path, destination / filename)
    (destination / 'README.txt').write_text('''Gramlot unified showcase — offline development preview

Extract the ENTIRE ZIP, then open index.html in your browser.
Keep index.html, pages/ and assets/ together. Do not open inside the ZIP viewer.
No Python installation or server is required to view local lessons.
The original shell, navigation tree, closable lesson tabs and Source/Inspector
are preserved. The catalog uses relative exported page URLs. Browser resources
are packaged locally. Original Python source is included under source/.

The dataRpc lesson preserves its source, but has no Python backend. It reports
an explicit offline error. A static server does not enable RPC.
This export is a development preview of gramlot-poc, not core port acceptance.

If a browser restricts local iframe files, serve this directory with a static
HTTP server and open its index.html. This uses the same files and no RPC backend.
Verification details are recorded alongside the archive in the repository.
''')
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return manifest


def archive(directory, output):
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(directory.rglob('*')):
            if path.is_file():
                info = zipfile.ZipInfo('showcase/' + path.relative_to(directory).as_posix(), (2026, 9, 17, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                bundle.writestr(info, path.read_bytes())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--poc', type=Path, required=True)
    parser.add_argument('--assets', type=Path, required=True)
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--zip', type=Path, required=True)
    args = parser.parse_args()
    result = build(args.poc, args.assets, args.directory)
    archive(args.directory, args.zip)
    print(json.dumps({'pages': len(result['pages']), 'zip': str(args.zip), 'bytes': args.zip.stat().st_size}))

if __name__ == '__main__': main()
