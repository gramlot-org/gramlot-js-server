/**
 * The two templates of @gramlot/create in a real browser:
 * `node test/verify_templates_browser.mjs PLAYWRIGHT_ENTRY [ENGINE] [RUNTIME]`.
 * Each project is created inside the workspace, built with `npm run build` and opened from
 * disk and from `npm start` (RUNTIME node or bun, default node). The form computes its summary
 * with Logic, the theme applies, the menu links work, the buttons of gramlot.utl.inout prepare the
 * email, save a file that Reload reads back, and download JSON.
 */
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath, pathToFileURL} from 'node:url';

const [playwrightEntry, engineName = 'chromium', runtime = 'node'] = process.argv.slice(2);
if (!playwrightEntry) throw new Error('Usage: verify_templates_browser.mjs PLAYWRIGHT_ENTRY [ENGINE] [RUNTIME]');
const here = fileURLToPath(new URL('./', import.meta.url));
const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function run(command, args, cwd) {
    const result = spawnSync(command, args, {cwd, encoding: 'utf8'});
    assert.equal(result.status, 0, `${command} ${args.join(' ')}: ${result.stderr}`);
}

/** Start serve.mjs of a project on a free port; its first line is the URL. */
async function start(project) {
    const child = spawn(runtime, ['serve.mjs'], {cwd: project, env: {...process.env, PORT: '0'}, stdio: ['ignore', 'pipe', 'inherit']});
    const url = await new Promise((done, fail) => {
        createInterface({input: child.stdout}).once('line', done);
        child.once('exit', code => fail(new Error(`serve.mjs exit ${code}`)));
    });
    return {url, stop: () => { child.kill('SIGTERM'); }};
}

/** A tab that records errors and the mailto: links followed by gramlot.utl.inout. */
async function open(context, url) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url);
    await page.waitForFunction(() => window.gramlot?.state === 'started');
    return {page, errors};
}

/** The registration form: summary, theme, email, save, reload, download. */
async function checkForm(page, folder) {
    const text = selector => page.locator(selector).textContent();
    assert.equal(await text('#summary'), 'Type your name.');
    await page.fill('#name', 'Ada');
    await page.fill('#email', 'ada@example.org');
    assert.equal(await text('#summary'), 'Ada <ada@example.org>');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement)
        .getPropertyValue('--gramlot-brand-blue').trim()), '#456bc4');
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('buttons')).display), 'flex');

    await page.click('#send');
    const mails = await page.evaluate(() => globalThis.mailtoLinks);
    assert.equal(mails.length, 1);
    const mail = new URL(mails[0]);
    assert.equal(mail.protocol, 'mailto:');
    assert.equal(decodeURIComponent(mail.pathname), 'office@example.org');
    assert.equal(mail.searchParams.get('subject'), 'Registration');
    assert.match(mail.searchParams.get('body'), /name: Ada\nemail: ada@example\.org/);

    const [saved] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
    assert.equal(saved.suggestedFilename(), 'registration.json');
    const savedFile = join(folder, `saved-${Date.now()}.json`);
    await saved.saveAs(savedFile);
    await page.fill('#name', 'Grace');
    assert.equal(await text('#summary'), 'Grace <ada@example.org>');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#restore')]);
    await chooser.setFiles(savedFile);
    await page.waitForFunction(() => document.getElementById('name').value === 'Ada');
    assert.equal(await text('#summary'), 'Ada <ada@example.org>');

    const [downloaded] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
    const exported = JSON.parse(await readFile(await downloaded.path(), 'utf8'));
    assert.match(JSON.stringify(exported), /"Ada"/);
    assert.match(JSON.stringify(exported), /ada@example\.org/);
}

const folder = await mkdtemp(join(here, '.project-'));
const engine = (await import(pathToFileURL(resolve(playwrightEntry))))[engineName];
const browser = await engine.launch({headless: true});
const servers = [];
try {
    run(process.execPath, [cli, 'page', 'form'], folder);
    run(process.execPath, [cli, 'site', 'club'], folder);
    for (const name of ['form', 'club']) run('npm', ['run', 'build'], join(folder, name));
    const context = await browser.newContext({acceptDownloads: true});
    await context.addInitScript(() => {
        // The mail program is outside the browser: record the mailto: link instead of following it.
        globalThis.mailtoLinks = [];
        const click = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
            if (this.protocol === 'mailto:') globalThis.mailtoLinks.push(this.href);
            else click.call(this);
        };
    });
    const formServer = await start(join(folder, 'form'));
    const clubServer = await start(join(folder, 'club'));
    servers.push(formServer, clubServer);

    for (const url of [pathToFileURL(join(folder, 'form/index.html')).href, formServer.url,
        pathToFileURL(join(folder, 'club/dist/registration/index.html')).href, `${clubServer.url}registration/index.html`]) {
        const {page, errors} = await open(context, url);
        await checkForm(page, folder);
        assert.deepEqual(errors, [], url);
        await page.close();
    }

    for (const base of [pathToFileURL(join(folder, 'club/dist/')).href, clubServer.url]) {
        const {page, errors} = await open(context, `${base}index.html`);
        assert.equal(await page.title(), 'My site');
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.menu')).display), 'flex');
        await page.click('text=Registration');
        await page.waitForFunction(() => window.gramlot?.state === 'started' && document.title === 'Registration');
        assert.equal(page.url(), `${base}registration/index.html`);
        await page.click('text=Home');
        await page.waitForFunction(() => window.gramlot?.state === 'started' && document.title === 'My site');
        assert.equal(page.url(), `${base}index.html`);
        assert.deepEqual(errors, [], base);
        await page.close();
    }
    console.log(`${engineName} ${browser.version()} PASS @gramlot/create templates (${runtime} for npm start): ` +
        'page from disk and from the server, site from dist/ and from the server, summary by Logic, theme, ' +
        'menu links, sendMail, save and restore, download');
} finally {
    for (const server of servers) server.stop();
    await browser.close();
    await rm(folder, {recursive: true, force: true});
}
