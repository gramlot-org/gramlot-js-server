/**
 * The packages that the window runtime of an export leaves out, as the core browser runtime does
 * (gramlot-org/gramlot#84, core `js/scripts/runtime-options.mjs`). `@genrojs/tytx` imports big.js beside
 * decimal.js and selects decimal.js. `@genrojs/bag` and `@genrojs/tytx` parse XML with the native `DOMParser`
 * of the window; the Worker has no `DOMParser` and keeps @xmldom/xmldom. Each package becomes a module whose
 * classes throw when constructed.
 *
 * @module
 */
const absentPackages = {
    'big.js': "export default class Big { constructor() { throw new Error('The Gramlot window runtime has no big.js: decimals use decimal.js'); } }",
    '@xmldom/xmldom': "const absent = () => { throw new Error('The Gramlot window runtime has no @xmldom/xmldom: XML uses the native DOMParser'); };\n" +
        'export class DOMParser { constructor() { absent(); } }\nexport class XMLSerializer { constructor() { absent(); } }',
};

/** The esbuild plugin of the window runtime bundle; never used for the Worker bundle. */
export const absentPackagePlugin = {
    name: 'absent-package',
    setup(build) {
        const filter = new RegExp(`^(${Object.keys(absentPackages).map(name => name.replace(/[./]/g, '\\$&')).join('|')})$`);
        build.onResolve({filter}, args => ({path: args.path, namespace: 'absent-package'}));
        build.onLoad({filter: /.*/, namespace: 'absent-package'}, args => ({contents: absentPackages[args.path], loader: 'js'}));
    },
};
