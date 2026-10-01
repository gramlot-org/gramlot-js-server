// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import {readdir, readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {TextDecoder, TextEncoder} from "node:util";
import path from "node:path";
import {pathToFileURL} from "node:url";

const [directoryArg, modulesArg] = process.argv.slice(2);
if (!directoryArg || !modulesArg) throw Error("usage: node test_runtime.mjs SHOWCASE_DIRECTORY NODE_MODULES_DIRECTORY");
const directory = path.resolve(directoryArg);
const require = createRequire(path.join(path.resolve(modulesArg), "package.json"));
const {JSDOM, ResourceLoader, VirtualConsole} = require("jsdom");

const tick = (window, milliseconds = 0) => new Promise(resolve => window.setTimeout(resolve, milliseconds));
async function waitFor(window, predicate, label, attempts = 200) {
    for (let index = 0; index < attempts; index++) {
        if (predicate()) return;
        await tick(window, 10);
    }
    throw Error(`Timed out waiting for ${label}`);
}
function installBrowserGaps(window, network) {
    window.TextEncoder = TextEncoder;
    window.TextDecoder = TextDecoder;
    window.fetch = url => { network.push(String(url)); return Promise.reject(Error(`Network forbidden: ${url}`)); };
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.requestAnimationFrame = callback => window.setTimeout(() => callback(Date.now()), 0);
    window.cancelAnimationFrame = handle => window.clearTimeout(handle);
    if (window.Range) {
        window.Range.prototype.getClientRects = () => [];
        window.Range.prototype.getBoundingClientRect = () => ({x:0, y:0, left:0, top:0, right:0, bottom:0, width:0, height:0, toJSON() { return this; }});
    }
}
async function openPage(file, {loadFrames = true} = {}) {
    const local = [], network = [], errors = [];
    class OfflineLoader extends ResourceLoader {
        fetch(url, options) {
            if (url.startsWith("file:")) {
                local.push(url);
                if (!loadFrames && url.endsWith(".html")) return Promise.resolve(Buffer.from("<!doctype html><title>frame tested separately</title>"));
                return super.fetch(url, options);
            }
            network.push(url);
            return Promise.reject(Error(`Network forbidden: ${url}`));
        }
    }
    const console = new VirtualConsole();
    console.on("jsdomError", error => errors.push(error));
    console.on("error", (...parts) => errors.push(Error(parts.map(String).join(" "))));
    const dom = new JSDOM(await readFile(file, "utf8"), {
        url: pathToFileURL(file).href,
        runScripts: "dangerously",
        resources: new OfflineLoader(),
        virtualConsole: console,
        beforeParse(window) { installBrowserGaps(window, network); },
    });
    await waitFor(dom.window, () => dom.window.document.documentElement.dataset.gramlotReady, path.basename(file));
    assert.equal(dom.window.document.documentElement.dataset.gramlotReady, "true", errors.map(error => error.stack).join("\n"));
    assert.ok(dom.window.__gramlotShowcaseApplication, `${path.basename(file)} exposes its application`);
    assert.ok(dom.window.GramlotShowcase, `${path.basename(file)} exposes the mount API`);
    assert.deepEqual(network, [], `${path.basename(file)} made a network request`);
    return {dom, local, network, errors};
}
function editText(window, label, value) {
    const widget = [...window.document.querySelectorAll("gnr-textbox")].find(node => node.getAttribute("lbl") === label);
    assert.ok(widget, `text input ${label}`);
    const input = widget.shadowRoot.querySelector("input");
    input.value = String(value);
    input.dispatchEvent(new window.Event("input", {bubbles:true, composed:true}));
    input.dispatchEvent(new window.Event("change", {bubbles:true, composed:true}));
}
function editNumber(window, label, value) {
    const widget = [...window.document.querySelectorAll("gnr-numbertextbox")].find(node => node.getAttribute("lbl") === label);
    assert.ok(widget, `number input ${label}`);
    const input = widget.shadowRoot.querySelector("input");
    input.value = String(value);
    input.dispatchEvent(new window.Event("input", {bubbles:true, composed:true}));
    input.dispatchEvent(new window.Event("change", {bubbles:true, composed:true}));
}

const files = [path.join(directory, "index.html"), ...(await readdir(path.join(directory, "pages"))).filter(name => name.endsWith(".html")).sort().map(name => path.join(directory, "pages", name))];
const pageResults = [];
for (const file of files) {
    const result = await openPage(file, {loadFrames: path.basename(file) !== "index.html"});
    await tick(result.dom.window, 30);
    assert.deepEqual(result.network, [], `${path.basename(file)} made a delayed network request`);
    assert.deepEqual(result.errors, [], `${path.basename(file)} browser errors: ${result.errors.map(error => error.stack).join("\n")}`);
    pageResults.push(path.basename(file));
    result.dom.window.close();
}

const formula = await openPage(path.join(directory, "pages", "data_formula.html"));
const formulaWindow = formula.dom.window;
await waitFor(formulaWindow, () => formulaWindow.document.querySelector("gnr-codemirror")?.shadowRoot?.querySelector(".cm-editor"), "local CodeMirror editor");
const formulaApp = formulaWindow.__gramlotShowcaseApplication;
const formulaData = formulaApp.builder.data;
assert.equal(formulaData.getItem("data_root.subtotal"), 75);
assert.equal(formulaData.getItem("data_root.total"), 67.5);
editNumber(formulaWindow, "Quantity", 4);
assert.equal(formulaData.getItem("data_root.subtotal"), 100);
assert.equal(formulaData.getItem("data_root.total"), 90);
const inspector = formulaWindow.__gramlotShowcaseApplication.inspector;
assert.ok(inspector, "page inspector service");
const component = await inspector.open();
assert.ok(component?.shadowRoot, "embedded inspector initialized from local assets");
assert.equal(component.shadowRoot.querySelector('[data-inspector="data"]').storeBag, formulaData.getItem("data_root"));
const sourceNode = formulaApp.builder.source.getNodeByAttr("node_id", "source_root") || formulaApp.builder.source.getNodeByAttr("nodeId", "source_root");
assert.equal(component.shadowRoot.querySelector('[data-inspector="source"]').storeBag, sourceNode.getValue());
inspector.close();
assert.equal(component.opened, false);
await inspector.open();
assert.equal(component.opened, true);
const channel = formulaWindow.document.querySelector("gnr-framechannel");
assert.ok(channel, "page frame channel");
let channelChanges = 0;
channel.addEventListener("change", () => channelChanges++);
const message = {protocol:"gramlot-frame-channel/v1", channel:"showcase-tools", value:false};
channel._onMessage({origin:"null", source:{}, data:message});
assert.equal(channelChanges, 0, "frame channel rejects a foreign source window");
channel._onMessage({origin:"null", source:formulaWindow, data:message});
assert.equal(channelChanges, 1, "file frame channel accepts the exact parent window");
assert.equal(channel.value, false);
formulaApp.dispose();
assert.equal(formulaWindow.document.querySelector("gramlot-inspector"), null);
assert.deepEqual(formula.network, []);
assert.deepEqual(formula.errors, []);
formula.dom.window.close();


const binding = await openPage(path.join(directory, "pages", "hello_binding.html"));
const bindingWindow = binding.dom.window;
editText(bindingWindow, "Name", "Grace");
assert.equal(bindingWindow.__gramlotShowcaseApplication.builder.data.getItem("data_root.name"), "Grace");
assert.match(bindingWindow.document.getElementById("app").textContent, /This message is for Grace/);
assert.deepEqual(binding.network, []);
assert.deepEqual(binding.errors, []);
binding.dom.window.close();

const controller = await openPage(path.join(directory, "pages", "data_controller.html"));
const controllerWindow = controller.dom.window;
editText(controllerWindow, "Your name", "grace");
const uppercaseWidget = controllerWindow.document.querySelector("gnr-checkbox");
const uppercaseInput = uppercaseWidget.shadowRoot.querySelector('input[type="checkbox"]');
uppercaseInput.checked = true;
uppercaseInput.dispatchEvent(new controllerWindow.Event("change", {bubbles:true}));
assert.equal(controllerWindow.__gramlotShowcaseApplication.builder.data.getItem("data_root.greeting"), "Hello GRACE");
assert.equal(controllerWindow.__gramlotShowcaseApplication.builder.data.getItem("data_root.characters"), 5);
assert.deepEqual(controller.network, []);
assert.deepEqual(controller.errors, []);
controller.dom.window.close();

const checkbox = await openPage(path.join(directory, "pages", "input_widgets.html"));
const checkboxWindow = checkbox.dom.window;
const checkboxApp = checkboxWindow.__gramlotShowcaseApplication;
const checkboxWidget = checkboxWindow.document.querySelector("gnr-checkbox");
assert.ok(checkboxWidget, "checkbox widget");
const checkboxInput = checkboxWidget.shadowRoot.querySelector('input[type="checkbox"]');
assert.equal(checkboxApp.builder.data.getItem("data_root.profile.updates"), true);
checkboxInput.checked = false;
checkboxInput.dispatchEvent(new checkboxWindow.Event("change", {bubbles:true}));
assert.equal(checkboxApp.builder.data.getItem("data_root.profile.updates"), false);
checkboxInput.checked = true;
checkboxInput.dispatchEvent(new checkboxWindow.Event("change", {bubbles:true}));
assert.equal(checkboxApp.builder.data.getItem("data_root.profile.updates"), true);
assert.deepEqual(checkbox.network, []);
assert.deepEqual(checkbox.errors, []);
checkbox.dom.window.close();

const rpc = await openPage(path.join(directory, "pages", "data_rpc.html"));
const rpcWindow = rpc.dom.window;
await waitFor(rpcWindow, () => String(rpcWindow.__gramlotShowcaseApplication.builder.data.getItem("data_root.status")).includes("RPC unavailable"), "offline RPC rejection");
assert.equal(rpcWindow.__gramlotShowcaseApplication.builder.data.getItem("data_root.status"), "Request failed: RPC unavailable in offline export; use FastAPI");
assert.deepEqual(rpc.network, []);
assert.deepEqual(rpc.errors, []);
rpc.dom.window.close();

console.log(`PASS showcase runtime: ${pageResults.length} pages booted from file://; local CodeMirror, binding/formula, checkbox, inspector lifecycle/disposal and explicit offline RPC were verified with zero network requests.`);
