import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';

/** Preserve attribution for the core runtime and the standalone integration of @gramlot/gramlot-browser. */
export async function runtimeNotices(coreRuntime) {
    const notices = JSON.parse(await readFile(join(dirname(coreRuntime), 'runtime-notices.json'), 'utf8'));
    notices.push({name: '@gramlot/gramlot-browser', text: await readFile(new URL('../LICENSE', import.meta.url), 'utf8')});
    return notices;
}
