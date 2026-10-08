/** @gramlot/create: the two templates, the question, the errors; each project built and started
 * with the packages of this workspace (the project folder sits inside it). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';

const here = fileURLToPath(new URL('./', import.meta.url));
const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const version = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;

async function workspace(t) {
    const folder = await mkdtemp(join(here, '.project-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    return folder;
}

const create = (cwd, args, input) => spawnSync(process.execPath, [cli, ...args], {cwd, input, encoding: 'utf8'});

/** Start serve.mjs of a project with runtime on a free port; its first line is the URL. */
async function start(project, runtime) {
    const child = spawn(runtime, ['serve.mjs'], {cwd: project, env: {...process.env, PORT: '0'}, stdio: ['ignore', 'pipe', 'inherit']});
    const url = await new Promise((done, fail) => {
        createInterface({input: child.stdout}).once('line', done);
        child.once('exit', code => fail(new Error(`serve.mjs exit ${code}`)));
    });
    return {url, async stop() {
        child.kill('SIGTERM');
        await new Promise(done => child.exitCode !== null ? done() : child.once('exit', done));
    }};
}

const runtimes = ['node', ...(spawnSync('bun', ['--version']).error ? [] : ['bun'])];

test('page: index.js with Page and Logic, the scripts, built to one file and served', async t => {
    const folder = await workspace(t);
    const result = create(folder, ['page', 'My Form']);
    assert.equal(result.status, 0, result.stderr);
    const project = join(folder, 'My Form');
    assert.deepEqual((await readdir(project)).sort(), ['.gitignore', 'README.md', 'index.css', 'index.js', 'package.json', 'serve.mjs']);
    const manifest = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
    assert.equal(manifest.name, 'my-form');
    assert.deepEqual(manifest.scripts, {build: 'gramlot-serverless build index.js -o index.html',
        start: 'node serve.mjs', 'start:bun': 'bun serve.mjs'});
    assert.deepEqual(manifest.dependencies, {'@gramlot/gramlot': '>=0.2.12',
        '@gramlot/gramlot-js-server': `>=${version}`, '@gramlot/gramlot-serverless': `>=${version}`});
    const page = await import(join(project, 'index.js'));
    assert.equal(typeof page.Page, 'function');
    assert.equal(page.Logic.prototype.summary({name: 'Ada', email: 'ada@example.org'}), 'Ada <ada@example.org>');
    assert.match(await readFile(join(project, 'README.md'), 'utf8'), /^# my-form/);

    const build = spawnSync('npm', ['run', 'build'], {cwd: project, encoding: 'utf8'});
    assert.equal(build.status, 0, build.stderr);
    const html = await readFile(join(project, 'index.html'), 'utf8');
    assert.match(html, /"\/index\.js":/);
    assert.match(html, /--gramlot-brand-blue/);
    assert.match(html, /#buttons \{/);
    for (const runtime of runtimes) {
        const app = await start(project, runtime);
        try {
            const opened = await (await fetch(app.url)).text();
            assert.match(opened, /<title>Registration<\/title>/, runtime);
            assert.match(opened, /"\/index\.css"/);
            assert.equal((await fetch(app.url + 'themes/gramlot-base/theme.css')).status, 200, runtime);
            assert.equal((await fetch(app.url + 'index.js')).status, 200, runtime);
        } finally { await app.stop(); }
    }
});

test('site: pages/ with a menu and a second page, built to dist/ twice and served', async t => {
    const folder = await workspace(t);
    const result = create(folder, ['site', 'club']);
    assert.equal(result.status, 0, result.stderr);
    const project = join(folder, 'club');
    assert.deepEqual((await readdir(join(project, 'pages'))).sort(), ['index.js', 'registration.js', 'site.css']);
    assert.equal(JSON.parse(await readFile(join(project, 'package.json'), 'utf8')).scripts.build, 'gramlot-serverless build pages -o dist');
    for (let run = 0; run < 2; run++) {
        const build = spawnSync('npm', ['run', 'build'], {cwd: project, encoding: 'utf8'});
        assert.equal(build.status, 0, build.stderr);
    }
    for (const path of ['dist/index.html', 'dist/registration/index.html', 'dist/site.css', 'dist/themes/gramlot-base/theme.css']) {
        assert.ok((await stat(join(project, path))).isFile(), path);
    }
    assert.match(await readFile(join(project, 'dist/assets/workers/index.js'), 'utf8'), /registration\/index\.html/);
    for (const runtime of runtimes) {
        const app = await start(project, runtime);
        try {
            for (const [path, title] of [['', 'My site'], ['index.html', 'My site'], ['registration/index.html', 'Registration']]) {
                assert.match(await (await fetch(app.url + path)).text(), new RegExp(`<title>${title}</title>`), `${runtime} ${path}`);
            }
            assert.equal((await fetch(app.url + 'site.css')).status, 200);
        } finally { await app.stop(); }
    }
});

test('without the word the command asks page or site; wrong answers and arguments fail', async t => {
    const folder = await workspace(t);
    const asked = create(folder, ['asked'], 'site\n');
    assert.equal(asked.status, 0, asked.stderr);
    assert.match(asked.stdout, /page or site\? /);
    assert.ok((await stat(join(folder, 'asked/pages/index.js'))).isFile());
    await mkdir(join(folder, 'busy'));
    await writeFile(join(folder, 'busy/notes.txt'), 'keep');
    for (const [args, input, message] of [[['other'], 'blog\n', /Answer page or site, not "blog"/],
        [['quiet'], '', /No answer to "page or site\?"/], [['page'], '', /Usage/], [['page', 'a', 'b'], '', /Usage/],
        [['page', 'busy'], '', /exists and is not an empty folder/]]) {
        const run = create(folder, args, input);
        assert.equal(run.status, 1, args.join(' '));
        assert.match(run.stderr, message);
    }
    assert.equal(await readFile(join(folder, 'busy/notes.txt'), 'utf8'), 'keep');
    await assert.rejects(stat(join(folder, 'other')), {code: 'ENOENT'});
});
