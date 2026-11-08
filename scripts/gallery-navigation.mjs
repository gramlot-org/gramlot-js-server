/** Navigate the real Bag tree in browser qualification, expanding only the requested section. */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const catalog = JSON.parse(readFileSync(createRequire(import.meta.url).resolve('@gramlot/gramlot-examples/catalog.json'), 'utf8'));
export async function galleryRow(page, key) {
    const family = catalog.families.find(group => group.key === key || group.examples.some(item => item.key === key));
    if (!family) throw new Error(`Unknown gallery test key: ${key}`);
    const tree = page.locator('#gallery-navigation-tree');
    const expand = async path => {
        const node = tree.locator(`[data-path="${path}"]`);
        if (await node.getAttribute('aria-expanded') !== 'true') await node.locator(':scope > .row > button').click();
    };
    // A group with more than one family is a tree branch of its own; a group with one family shows the family.
    const grouped = family.group && catalog.families.filter(item => item.group === family.group).length > 1;
    let path = grouped ? `${family.group}.${family.key}` : family.key;
    if (await tree.isVisible()) {
        if (grouped) await expand(family.group);
        await expand(path);
    }
    const example = family.examples.find(item => item.key === key);
    if (example) {
        for (const directory of example.folder.split('/').slice(0, -1)) {
            path += `.${directory}`;
            await expand(path);
        }
        path += `.${key}`;
    }
    return tree.locator(`[data-path="${path}"] > .row`);
}

export const galleryRoutes = Object.fromEntries(catalog.families.flatMap(family => family.examples.map(item => [item.key, `pages/${family.folder}/${item.folder}`])));
