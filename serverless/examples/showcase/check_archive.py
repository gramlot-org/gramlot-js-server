"""Check offline archive paths, hashes and original lesson preservation."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import zipfile

class Links(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag in {'script','link','img'}:
            value=attrs.get('src') or attrs.get('href')
            if value: self.links.append(value)

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('zip',type=Path)
args=parser.parse_args()
with zipfile.ZipFile(args.zip) as archive:
    assert archive.testzip() is None
    names=set(archive.namelist())
    assert 'showcase/index.html' in names
    assert 'showcase/assets/THIRD-PARTY-NOTICES.txt' in names
    provenance=json.loads(archive.read('showcase/assets/provenance.json'))
    assert not provenance['externalImports']
    assert hashlib.sha256(archive.read('showcase/assets/runtime.js')).hexdigest() == provenance['runtimeSha256']
    assert all(n.startswith('showcase/') and '..' not in Path(n).parts for n in names)
    manifest=json.loads(archive.read('showcase/manifest.json'))
    assert len(manifest['pages']) == 12
    for relative,digest in manifest['source_sha256'].items():
        assert hashlib.sha256(archive.read('showcase/'+relative)).hexdigest() == digest
    for page in manifest['pages']:
        filename='showcase/'+page['path']
        parser=Links(); parser.feed(archive.read(filename).decode())
        for link in parser.links:
            assert not link.startswith(('http:','https:','/'))
            parts=list(Path(filename).parent.parts)
            for part in Path(link).parts:
                if part=='..': parts.pop()
                elif part!='.': parts.append(part)
            assert '/'.join(parts) in names, (filename,link)
    assert 'pages/overview.html' in archive.read('showcase/index.html').decode()
    assert 'self.triangle_area' in archive.read('showcase/source/pages/data_rpc.py').decode()
print('PASS archive integrity, 12 HTML pages, local assets, original source hashes and relative navigation')
