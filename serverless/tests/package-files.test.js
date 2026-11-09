import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every relative import of a published module is published', () => {
    const [packed] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'],
        {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}));
    const published = new Set(packed.files.map(({path}) => path));
    const missing = [];
    for (const path of published) {
        if (!/\.m?js$/.test(path)) continue;
        // Template literals hold generated modules that resolve against another directory.
        const source = readFileSync(join(root, path), 'utf8').replace(/`[^`]*`/g, '``');
        for (const [, specifier] of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
            const target = normalize(join(dirname(path), specifier));
            if (!published.has(target)) missing.push(`${path} -> ${target}`);
        }
    }
    assert.deepEqual(missing, []);
});
