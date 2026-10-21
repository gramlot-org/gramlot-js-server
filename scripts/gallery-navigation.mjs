/** Navigate the real Bag tree in browser qualification, expanding only the requested section. */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const catalog = JSON.parse(readFileSync(createRequire(import.meta.url).resolve('@gramlot/gramlot-examples/catalog.json'), 'utf8'));
export async function galleryRow(page, key) {
    const family = catalog.families.find(group => group.key === key || group.examples.some(item => item.key === key));
    if (!family) throw new Error(`Unknown gallery test key: ${key}`);
    const tree = page.locator('#gallery-navigation-tree');
    const branch = tree.locator(`[data-path="${family.key}"]`);
    if (await tree.isVisible() && await branch.getAttribute('aria-expanded') !== 'true') {
        await branch.locator(':scope > .row > button').click();
    }
    const example = family.examples.find(item => item.key === key);
    let path = family.key;
    if (example) {
        for (const directory of example.folder.split('/').slice(0, -1)) {
            path += `.${directory}`;
            const node = tree.locator(`[data-path="${path}"]`);
            if (await node.getAttribute('aria-expanded') !== 'true') {
                await node.locator(':scope > .row > button').click();
            }
        }
        path += `.${key}`;
    }
    return tree.locator(`[data-path="${path}"] > .row`);
}

export const galleryRoutes = Object.fromEntries(catalog.families.flatMap(family => family.examples.map(item => [item.key, `pages/${family.folder}/${item.folder}`])));
