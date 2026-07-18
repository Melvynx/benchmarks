import { readFile } from "node:fs/promises";

function fakeElement(name) {
  const classes = new Set();
  return {
    name,
    id: "",
    className: "",
    innerHTML: "",
    style: {},
    offsetWidth: 210,
    offsetHeight: 180,
    dataset: {},
    handlers: {},
    children: [],
    classList: {
      add: (...values) => values.forEach((value) => classes.add(value)),
      remove: (...values) => values.forEach((value) => classes.delete(value)),
      toggle: (value) => classes.has(value) ? classes.delete(value) : classes.add(value),
      contains: (value) => classes.has(value)
    },
    addEventListener(type, handler) { this.handlers[type] = handler; },
    append(child) { this.children.push(child); },
    remove() {},
    focus() {},
    getBoundingClientRect() { return { left: 20, right: 220, top: 20, bottom: 60, width: 200, height: 40 }; }
  };
}

const root = fakeElement("app");
const main = fakeElement("main");
const toast = fakeElement("toast");
const storage = new Map();

globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key)
};
globalThis.matchMedia = () => ({ matches: false });
globalThis.requestAnimationFrame = (callback) => { callback(); return 1; };
globalThis.window = globalThis;
globalThis.window.setTimeout = (callback) => { callback(); return 1; };
globalThis.window.clearTimeout = () => {};
globalThis.document = {
  activeElement: null,
  body: fakeElement("body"),
  handlers: {},
  querySelector(selector) {
    if (selector === "#app") return root;
    if (selector === "#toast-region") return toast;
    if (selector === "#main-surface") return main;
    return null;
  },
  createElement: (name) => fakeElement(name),
  getElementById: () => null,
  addEventListener(type, handler) { this.handlers[type] = handler; }
};

function actionTarget(action, dataset = {}) {
  return {
    dataset: { action, ...dataset },
    closest(selector) { return selector === "[data-action]" ? this : null; },
    getBoundingClientRect() { return { left: 20, right: 60, top: 20, bottom: 60, width: 40, height: 40 }; }
  };
}

function action(actionName, dataset = {}) {
  const target = actionTarget(actionName, dataset);
  root.handlers.click({ target, preventDefault() {}, stopPropagation() {} });
}

function input(field, value) {
  root.handlers.input({ target: { id: "", value, dataset: { compose: field } } });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await import("./app.js");

const index = await readFile(new URL("./index.html", import.meta.url), "utf8");
const styles = await readFile(new URL("./styles.css", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
assert(index.includes("<title>gpt-5.6-sol</title>"), "browser title must match model name");
assert(packageJson.scripts.start.includes("--port 9147"), "start script must use port 9147");
assert(styles.includes("@media (max-width: 760px)") && styles.includes(".mobile-bottom-nav"), "responsive mobile layout should be defined");
assert(root.innerHTML.includes('<h1 class="brand-title">gpt-5.6-sol</h1>'), "visible title must match model name");
assert(root.innerHTML.includes("Quarterly roadmap review"), "seeded inbox should render");
assert(root.innerHTML.includes("Compose"), "compose control should render");

action("navigate", { folder: "sent" });
assert(root.innerHTML.includes("Monday’s workshop"), "Sent navigation should render sent mail");

action("navigate", { folder: "inbox" });
root.handlers.click({
  target: { closest: (selector) => selector === ".mail-row" ? { dataset: { mailId: "m-101" } } : null },
  preventDefault() {},
  stopPropagation() {}
});
assert(main.innerHTML.includes("Perfect — I’ve incorporated your notes"), "message thread should open with hierarchy");

action("back");
action("select", { id: "m-101" });
assert(main.innerHTML.includes("1 selected"), "selection toolbar should update");
action("clear-selection");

action("star", { id: "m-102" });
action("navigate", { folder: "starred" });
assert(root.innerHTML.includes("Lisbon this weekend?"), "starring should update the Starred mailbox");
action("navigate", { folder: "inbox" });

document.handlers.click({
  target: {
    dataset: { action: "apply-label", ids: "m-102", label: "Work" },
    closest: (selector) => selector.includes("floating-menu") ? { dataset: { action: "apply-label", ids: "m-102", label: "Work" } } : null
  },
  preventDefault() {},
  stopPropagation() {}
});
action("navigate", { folder: "label:Work" });
assert(root.innerHTML.includes("Lisbon this weekend?"), "labeling should update label navigation");
action("navigate", { folder: "inbox" });

action("archive-one", { id: "m-102" });
assert(!root.innerHTML.includes("Lisbon this weekend?"), "archiving should remove a conversation from Inbox");

root.handlers.input({ target: { id: "mail-search", value: "has:attachment", dataset: {} } });
assert(main.innerHTML.includes("Q3-roadmap.pdf") || main.innerHTML.includes("Quarterly roadmap review"), "attachment search should return matching mail");
action("clear-search");

action("open-compose");
document.handlers.click({
  target: {
    dataset: { action: "choose-contact", email: "maya.chen@example.com" },
    closest: (selector) => selector.includes("contact-suggestions") ? { dataset: { action: "choose-contact", email: "maya.chen@example.com" } } : null
  },
  preventDefault() {},
  stopPropagation() {}
});
input("subject", "Smoke test message");
input("body", "This verifies the local compose and send workflow.");
action("send");
action("navigate", { folder: "sent" });
assert(root.innerHTML.includes("Smoke test message"), "sent message should appear in Sent");

action("open-compose");
input("subject", "Persistent draft");
input("body", "This draft should remain available after closing compose.");
action("close-compose");
action("navigate", { folder: "drafts" });
assert(root.innerHTML.includes("Persistent draft"), "closed compose should persist as a draft");

action("navigate", { folder: "inbox" });
action("delete-one", { id: "m-108" });
action("navigate", { folder: "trash" });
assert(root.innerHTML.includes("Studio keys"), "deleting should move a conversation to Trash");

console.log("Smoke workflows passed: navigation, reading, selection, search, starring, labels, archive, delete, drafts, send, and titles.");
