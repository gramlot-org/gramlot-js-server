/** Embed module-relative resources only from the verified artifact snapshot. */
import {parse} from 'acorn';
import {dirname, join, normalize} from 'node:path/posix';
import {lookup} from 'mime-types';
import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

export function embedCollectionAssets(source, modulePath, content) {
    const edits = [];
    const tree = parse(source, {ecmaVersion: 'latest', sourceType: 'module'});
    function visit(node) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'URL') {
            const [path, base] = node.arguments;
            if (base?.type === 'MemberExpression' && !base.computed && base.property.name === 'url' &&
                base.object.type === 'MetaProperty' && base.object.meta.name === 'import') {
                if (node.arguments.length !== 2 || path.type !== 'Literal' || typeof path.value !== 'string')
                    throw new TypeError('Collection asset URL requires a literal path');
                if (!path.value.startsWith('./') && !path.value.startsWith('../'))
                    throw new TypeError('Collection asset URL requires a module-relative path');
                const key = normalize(join(dirname(modulePath), path.value));
                if (!content.has(key)) throw new Error(`Unverified collection asset: ${key}`);
                const type = lookup(key);
                if (!type) throw new TypeError(`Unknown collection asset media type: ${key}`);
                const url = `data:${type};base64,${content.get(key).toString('base64')}`;
                edits.push({start: node.start, end: node.end, text: `new URL(${JSON.stringify(url)})`});
                return;
            }
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(visit);
            else if (value && typeof value === 'object') visit(value);
        }
    }
    visit(tree);
    for (const {start, end, text} of edits.sort((a, b) => b.start - a.start))
        source = source.slice(0, start) + text + source.slice(end);
    return source;
}

const coreComponents = join(dirname(realpathSync(createRequire(import.meta.url).resolve('@gramlot/gramlot'))), 'components') + '/';
const coreFiles = {has: file => existsSync(file), get: file => readFileSync(file)};

/** The esbuild plugin of the classic-script bundles of the core sources (window runtime and Worker). A classic
 * script has no import.meta.url: each `new URL('./file', import.meta.url)` of a core component module (the license
 * texts of the charts and grid collections) becomes a data: URL of the file, as in the collection artifacts. */
export const coreAssetPlugin = {
    name: 'core-component-assets',
    setup(build) {
        build.onLoad({filter: /\.js$/}, async args => {
            if (!args.path.startsWith(coreComponents)) return undefined;
            const source = await readFile(args.path, 'utf8');
            if (!source.includes('import.meta.url')) return undefined;
            return {contents: embedCollectionAssets(source, args.path, coreFiles), loader: 'js'};
        });
    },
};
