// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {readdir, readFile, rm, mkdir, writeFile} from "node:fs/promises";
import {join, resolve} from "node:path";

const packageFromInput = input => {
    const normalized = resolve(input).replaceAll("\\\\", "/");
    const marker = "/node_modules/";
    const at = normalized.lastIndexOf(marker);
    if (at < 0) return null;
    const tail = normalized.slice(at + marker.length).split("/");
    const name = tail[0].startsWith("@") ? `${tail[0]}/${tail[1]}` : tail[0];
    return {name, root: normalized.slice(0, at + marker.length) + name};
};
const filenameFor = name => name.replace(/^@/, "").replaceAll("/", "-") + ".txt";
async function licenseFile(root) {
    const names = await readdir(root);
    return names.sort().find(name => /^(licen[cs]e|copying|copyright)([-.]|$)/i.test(name)) || null;
}

export async function generateNotices({metafile, pocRoot, outputDirectory, runtimeSha256, esbuildVersion, esbuildRoot}) {
    const packages = new Map();
    for (const input of Object.keys(metafile.inputs)) {
        const found = packageFromInput(input);
        if (!found) continue;
        const entry = packages.get(found.name) || {...found, inputs: 0};
        entry.inputs++;
        packages.set(found.name, entry);
    }
    const licenses = join(outputDirectory, "licenses");
    await rm(licenses, {recursive:true, force:true});
    await mkdir(licenses, {recursive:true});
    const rows = [];
    for (const entry of [...packages.values()].sort((left, right) => left.name.localeCompare(right.name))) {
        const manifest = JSON.parse(await readFile(join(entry.root, "package.json"), "utf8"));
        const declared = typeof manifest.license === "string" ? manifest.license : "SEE LICENSE FILE";
        let source = await licenseFile(entry.root);
        let text;
        if (source) text = await readFile(join(entry.root, source), "utf8");
        else if (entry.name === "genro-tytx" && declared === "Apache-2.0") text = await readFile(join(pocRoot, "LICENSE"), "utf8");
        else throw Error(`license text not found for bundled package ${entry.name}`);
        const filename = filenameFor(entry.name);
        await writeFile(join(licenses, filename), text.endsWith("\n") ? text : text + "\n");
        rows.push(`- ${entry.name} ${manifest.version} — ${declared} — ${entry.inputs} input file(s) — licenses/${filename}`);
    }
    await writeFile(join(licenses, "GRAMLOT-LICENSE.txt"), await readFile(join(pocRoot, "LICENSE")));
    await writeFile(join(licenses, "GRAMLOT-NOTICE.txt"), await readFile(join(pocRoot, "NOTICE")));
    const esbuildLicense = await licenseFile(esbuildRoot);
    if (!esbuildLicense) throw Error("license text not found for esbuild");
    await writeFile(join(licenses, "esbuild-build-tool.txt"), await readFile(join(esbuildRoot, esbuildLicense)));
    const notice = [
        "Third-party notices for the Gramlot offline showcase browser runtime.",
        "",
        `Runtime SHA-256: ${runtimeSha256}`,
        `Runtime dependency packages: ${rows.length}. The input counts below come from the esbuild metafile.`,
        "Full license texts are stored in assets/licenses/. Gramlot first-party sources are Apache-2.0; see GRAMLOT-LICENSE.txt and GRAMLOT-NOTICE.txt.",
        "",
        "Bundled runtime packages:",
        "",
        ...rows,
        "",
        `Build-only tool: esbuild ${esbuildVersion} — MIT — licenses/esbuild-build-tool.txt`,
        "",
    ].join("\n");
    await writeFile(join(outputDirectory, "THIRD-PARTY-NOTICES.txt"), notice);
    return {packages: rows.length, licenseFiles: rows.length + 3};
}
