var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/daemon.ts
import { spawn } from "node:child_process";
import { mkdir as mkdir3, unlink, writeFile } from "node:fs/promises";
import net from "node:net";
import path5 from "node:path";

// src/browser-manager.ts
import { mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
var DISCOVERY_PORTS = [9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229];
var PROBE_TIMEOUT_MS = 750;
var MANUAL_CONNECT_TIMEOUT_MS = 5e3;
var PAGE_TITLE_TIMEOUT_MS = 1500;
var TARGET_ID_PATTERN = /^[a-f0-9]{16,}$/i;
function isIgnorableFileError(error) {
  const code = error?.code;
  return code === "ENOENT" || code === "ENOTDIR" || code === "EACCES";
}
function isHttpEndpoint(endpoint) {
  return endpoint.startsWith("http://") || endpoint.startsWith("https://");
}
var BrowserManager = class {
  browsers = /* @__PURE__ */ new Map();
  baseDir;
  dependencies;
  constructor(baseDir = path.join(os.homedir(), ".dev-browser", "browsers"), dependencies = {}) {
    this.baseDir = baseDir;
    this.dependencies = {
      connectOverCDP: chromium.connectOverCDP.bind(chromium),
      fetch: globalThis.fetch,
      homedir: os.homedir,
      launchPersistentContext: chromium.launchPersistentContext.bind(
        chromium
      ),
      mkdir,
      platform: process.platform,
      readFile,
      ...dependencies
    };
  }
  async ensureBrowser(name, options = {}) {
    this.throwIfOperationAborted(options);
    await this.ensureBaseDir();
    this.throwIfOperationAborted(options);
    const existing = this.browsers.get(name);
    const requestedHeadless = options.headless ?? existing?.headless ?? false;
    const requestedIgnoreHTTPSErrors = options.ignoreHTTPSErrors ?? existing?.ignoreHTTPSErrors ?? false;
    if (existing) {
      const needsRelaunch = existing.type !== "launched" || !existing.browser.isConnected() || options.headless !== void 0 && existing.headless !== requestedHeadless || options.ignoreHTTPSErrors !== void 0 && existing.ignoreHTTPSErrors !== requestedIgnoreHTTPSErrors;
      if (!needsRelaunch) {
        return existing;
      }
      await this.stopBrowser(name);
    }
    return this.launchBrowser(name, requestedHeadless, requestedIgnoreHTTPSErrors, options);
  }
  async autoConnect(name, options = {}) {
    this.throwIfOperationAborted(options);
    await this.ensureBaseDir();
    this.throwIfOperationAborted(options);
    const existing = this.browsers.get(name);
    if (existing?.type === "connected" && existing.browser.isConnected()) {
      return existing;
    }
    if (existing) {
      await this.stopBrowser(name);
    }
    const attemptedEndpoints = /* @__PURE__ */ new Set();
    let lastError;
    const tryEndpoint = async (endpoint) => {
      if (!endpoint || attemptedEndpoints.has(endpoint)) {
        return null;
      }
      attemptedEndpoints.add(endpoint);
      try {
        return await this.openConnectedBrowser(name, endpoint, options);
      } catch (error) {
        this.throwIfOperationAborted(options);
        lastError = error;
        return null;
      }
    };
    const devToolsEndpoint = await this.readDevToolsActivePort();
    this.throwIfOperationAborted(options);
    const devToolsBrowser = await tryEndpoint(devToolsEndpoint);
    if (devToolsBrowser) {
      return devToolsBrowser;
    }
    for (const port of DISCOVERY_PORTS) {
      this.throwIfOperationAborted(options);
      const endpoint = await this.probePort(port);
      this.throwIfOperationAborted(options);
      const connectedBrowser = await tryEndpoint(endpoint);
      if (connectedBrowser) {
        return connectedBrowser;
      }
    }
    throw new Error(this.buildAutoConnectError(lastError));
  }
  async connectBrowser(name, endpoint, options = {}) {
    if (endpoint === "auto") {
      return this.autoConnect(name, options);
    }
    this.throwIfOperationAborted(options);
    await this.ensureBaseDir();
    this.throwIfOperationAborted(options);
    const resolvedEndpoint = await this.resolveEndpoint(endpoint);
    this.throwIfOperationAborted(options);
    const existing = this.browsers.get(name);
    if (existing) {
      const isSameConnection = existing.type === "connected" && existing.endpoint === resolvedEndpoint && existing.browser.isConnected();
      if (isSameConnection) {
        return existing;
      }
      await this.stopBrowser(name);
    }
    return this.openConnectedBrowser(name, resolvedEndpoint, options);
  }
  getBrowser(name) {
    const entry = this.browsers.get(name);
    if (!entry || !entry.browser.isConnected()) {
      return void 0;
    }
    return entry;
  }
  async getPage(browserName, pageNameOrId) {
    const entry = this.getBrowserEntry(browserName);
    const existingPage = entry.pages.get(pageNameOrId);
    if (existingPage && !existingPage.isClosed()) {
      return existingPage;
    }
    entry.pages.delete(pageNameOrId);
    if (TARGET_ID_PATTERN.test(pageNameOrId)) {
      const page2 = await this.findPageByTargetId(entry, pageNameOrId);
      if (page2) {
        return page2;
      }
    }
    const page = await entry.context.newPage();
    this.registerNamedPage(entry, pageNameOrId, page);
    return page;
  }
  async newPage(browserName) {
    const entry = this.getBrowserEntry(browserName);
    return entry.context.newPage();
  }
  async listPages(browserName) {
    const entry = this.browsers.get(browserName);
    if (!entry || !entry.browser.isConnected()) {
      return [];
    }
    this.pruneClosedPages(entry);
    const namesByPage = this.getNamedPagesByPage(entry);
    const summaries = await Promise.all(
      this.getContextPages(entry).map(
        async ({ context, page }) => {
          const id = await this.getPageTargetId(context, page);
          if (!id) {
            return null;
          }
          let title = "";
          try {
            title = await this.getPageTitle(page);
          } catch (error) {
            if (page.isClosed()) {
              return null;
            }
            throw error;
          }
          return {
            id,
            url: page.url(),
            title,
            name: namesByPage.get(page) ?? null
          };
        }
      )
    );
    return summaries.filter((summary) => summary !== null);
  }
  async closePage(browserName, pageName) {
    const entry = this.getBrowserEntry(browserName);
    const page = entry.pages.get(pageName);
    if (!page || page.isClosed()) {
      entry.pages.delete(pageName);
      throw new Error(`Page "${browserName}/${pageName}" not found`);
    }
    entry.pages.delete(pageName);
    if (!page.isClosed()) {
      await page.close();
    }
  }
  listBrowsers() {
    return Array.from(this.browsers.values()).map((entry) => {
      this.pruneClosedPages(entry);
      const status = entry.type === "connected" ? entry.browser.isConnected() ? "connected" : "disconnected" : entry.browser.isConnected() ? "running" : "disconnected";
      return {
        name: entry.name,
        type: entry.type,
        status,
        pages: this.listNamedPages(entry)
      };
    }).sort((left, right) => left.name.localeCompare(right.name));
  }
  async stopBrowser(name) {
    const entry = this.browsers.get(name);
    if (!entry) {
      return;
    }
    this.browsers.delete(name);
    entry.pages.clear();
    try {
      if (entry.type === "launched") {
        await this.closeLaunchedBrowser(entry);
      } else {
        await entry.browser.close();
      }
    } catch {
    }
  }
  async stopAll() {
    const names = Array.from(this.browsers.keys());
    await Promise.allSettled(names.map(async (name) => this.stopBrowser(name)));
  }
  browserCount() {
    return this.browsers.size;
  }
  async ensureBaseDir() {
    await this.dependencies.mkdir(this.baseDir, { recursive: true });
  }
  getBrowserEntry(name) {
    const entry = this.browsers.get(name);
    if (!entry || !entry.browser.isConnected()) {
      throw new Error(`Browser "${name}" is not running`);
    }
    return entry;
  }
  async launchBrowser(name, headless, ignoreHTTPSErrors, operation = {}) {
    const profileDir = path.join(this.baseDir, name, "chromium-profile");
    await this.dependencies.mkdir(profileDir, { recursive: true });
    const timeout = this.remainingOperationTimeout(operation);
    const context = await this.dependencies.launchPersistentContext(profileDir, {
      headless,
      viewport: headless ? void 0 : null,
      ignoreHTTPSErrors,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      ...timeout === void 0 ? {} : { timeout }
    });
    const browser = context.browser();
    try {
      this.throwIfOperationAborted(operation);
    } catch (error) {
      await context.close().catch(() => void 0);
      if (browser?.isConnected()) {
        await browser.close().catch(() => void 0);
      }
      throw error;
    }
    if (!browser) {
      await context.close();
      throw new Error(`Playwright did not expose a browser handle for "${name}"`);
    }
    const entry = {
      name,
      type: "launched",
      browser,
      context,
      pages: /* @__PURE__ */ new Map(),
      profileDir,
      headless,
      ignoreHTTPSErrors
    };
    this.attachBrowserLifecycle(entry);
    this.browsers.set(name, entry);
    return entry;
  }
  async openConnectedBrowser(name, endpoint, operation = {}) {
    const timeout = this.remainingOperationTimeout(operation);
    const browser = timeout === void 0 ? await this.dependencies.connectOverCDP(endpoint) : await this.dependencies.connectOverCDP(endpoint, { timeout });
    try {
      this.throwIfOperationAborted(operation);
    } catch (error) {
      await browser.close().catch(() => void 0);
      throw error;
    }
    const contexts = browser.contexts();
    for (const browserContext of contexts) {
      browserContext.pages();
    }
    const context = contexts[0] ?? await browser.newContext();
    const entry = {
      name,
      type: "connected",
      browser,
      context,
      pages: /* @__PURE__ */ new Map(),
      endpoint,
      headless: false,
      ignoreHTTPSErrors: false
    };
    this.attachBrowserLifecycle(entry);
    this.browsers.set(name, entry);
    return entry;
  }
  attachBrowserLifecycle(entry) {
    entry.browser.on("disconnected", () => {
      const current = this.browsers.get(entry.name);
      if (current !== entry) {
        return;
      }
      entry.pages.clear();
      if (entry.type === "launched") {
        this.browsers.delete(entry.name);
      }
    });
  }
  throwIfOperationAborted(options) {
    if (options.signal?.aborted) {
      throw options.signal.reason instanceof Error ? options.signal.reason : new Error(String(options.signal.reason));
    }
    if (options.deadline !== void 0 && Date.now() >= options.deadline) {
      throw new Error("Browser setup deadline exceeded");
    }
  }
  remainingOperationTimeout(options) {
    this.throwIfOperationAborted(options);
    if (options.deadline === void 0) {
      return void 0;
    }
    return Math.max(1, options.deadline - Date.now());
  }
  async closeLaunchedBrowser(entry) {
    const contexts = this.getBrowserContexts(entry);
    await Promise.allSettled(contexts.map(async (context) => context.close()));
    if (entry.browser.isConnected()) {
      await entry.browser.close().catch(() => void 0);
    }
  }
  async discoverChrome() {
    const devToolsEndpoint = await this.readDevToolsActivePort();
    if (devToolsEndpoint) {
      return devToolsEndpoint;
    }
    for (const port of DISCOVERY_PORTS) {
      const endpoint = await this.probePort(port);
      if (endpoint) {
        return endpoint;
      }
    }
    return null;
  }
  async readDevToolsActivePort(expectedPort) {
    for (const candidate of this.getDevToolsActivePortCandidates()) {
      let contents;
      try {
        contents = await this.dependencies.readFile(candidate, "utf8");
      } catch (error) {
        if (isIgnorableFileError(error)) {
          continue;
        }
        throw error;
      }
      const endpoint = this.parseDevToolsActivePort(contents, expectedPort);
      if (endpoint) {
        return endpoint;
      }
    }
    return null;
  }
  async probePort(port) {
    const endpoint = `http://127.0.0.1:${port}`;
    const result = await this.fetchDebuggerWebSocketUrl(endpoint, PROBE_TIMEOUT_MS);
    if (result.status === "ok") {
      return result.webSocketDebuggerUrl;
    }
    if (result.status === "not-found") {
      return this.readDevToolsActivePort(port);
    }
    return null;
  }
  getDevToolsActivePortCandidates() {
    const homeDir = this.dependencies.homedir();
    switch (this.dependencies.platform) {
      case "darwin":
        return [
          path.join(
            homeDir,
            "Library",
            "Application Support",
            "Google",
            "Chrome",
            "DevToolsActivePort"
          ),
          path.join(
            homeDir,
            "Library",
            "Application Support",
            "Google",
            "Chrome Canary",
            "DevToolsActivePort"
          ),
          path.join(homeDir, "Library", "Application Support", "Chromium", "DevToolsActivePort"),
          path.join(
            homeDir,
            "Library",
            "Application Support",
            "BraveSoftware",
            "Brave-Browser",
            "DevToolsActivePort"
          )
        ];
      case "linux":
        return [
          path.join(homeDir, ".config", "google-chrome", "DevToolsActivePort"),
          path.join(homeDir, ".config", "chromium", "DevToolsActivePort"),
          path.join(homeDir, ".config", "google-chrome-beta", "DevToolsActivePort"),
          path.join(homeDir, ".config", "google-chrome-unstable", "DevToolsActivePort"),
          path.join(homeDir, ".config", "BraveSoftware", "Brave-Browser", "DevToolsActivePort")
        ];
      case "win32":
        return [
          path.join(
            homeDir,
            "AppData",
            "Local",
            "Google",
            "Chrome",
            "User Data",
            "DevToolsActivePort"
          ),
          path.join(
            homeDir,
            "AppData",
            "Local",
            "Google",
            "Chrome Beta",
            "User Data",
            "DevToolsActivePort"
          ),
          path.join(
            homeDir,
            "AppData",
            "Local",
            "Google",
            "Chrome SxS",
            "User Data",
            "DevToolsActivePort"
          ),
          path.join(homeDir, "AppData", "Local", "Chromium", "User Data", "DevToolsActivePort"),
          path.join(
            homeDir,
            "AppData",
            "Local",
            "BraveSoftware",
            "Brave-Browser",
            "User Data",
            "DevToolsActivePort"
          )
        ];
      default:
        return [];
    }
  }
  async resolveEndpoint(endpoint) {
    if (endpoint === "auto") {
      const discoveredEndpoint = await this.discoverChrome();
      if (discoveredEndpoint) {
        return discoveredEndpoint;
      }
      throw new Error(this.buildAutoConnectError());
    }
    if (isHttpEndpoint(endpoint)) {
      const discoveredEndpoint = await this.resolveHttpEndpoint(
        endpoint,
        MANUAL_CONNECT_TIMEOUT_MS
      );
      if (!discoveredEndpoint) {
        throw new Error(this.buildManualConnectError(endpoint));
      }
      return discoveredEndpoint;
    }
    return endpoint;
  }
  async fetchDebuggerWebSocketUrl(endpoint, timeoutMs) {
    let response;
    try {
      response = await this.dependencies.fetch(this.toJsonVersionUrl(endpoint), {
        headers: {
          accept: "application/json"
        },
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch {
      return { status: "unavailable" };
    }
    if (response.status === 404) {
      return { status: "not-found" };
    }
    if (!response.ok) {
      return { status: "unavailable" };
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      return { status: "unavailable" };
    }
    const webSocketDebuggerUrl = typeof payload === "object" && payload !== null ? payload.webSocketDebuggerUrl : void 0;
    return typeof webSocketDebuggerUrl === "string" && webSocketDebuggerUrl.length > 0 ? {
      status: "ok",
      webSocketDebuggerUrl
    } : { status: "unavailable" };
  }
  toJsonVersionUrl(endpoint) {
    const url = new URL(endpoint);
    if (url.pathname !== "/json/version") {
      url.pathname = "/json/version";
      url.search = "";
      url.hash = "";
    }
    return url;
  }
  buildAutoConnectError(lastError) {
    const launchCommand = this.dependencies.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9222" : this.dependencies.platform === "win32" ? "chrome.exe --remote-debugging-port=9222" : "google-chrome --remote-debugging-port=9222";
    const details = [
      "Could not auto-discover a running Chrome instance with remote debugging enabled.",
      "Enable Chrome remote debugging at chrome://inspect/#remote-debugging",
      `or launch Chrome with: ${launchCommand}`
    ];
    const lastErrorMessage = lastError instanceof Error ? lastError.message : typeof lastError === "string" && lastError.length > 0 ? lastError : null;
    if (lastErrorMessage) {
      details.push(`Last connection error: ${lastErrorMessage}`);
    }
    return details.join("\n");
  }
  async resolveHttpEndpoint(endpoint, timeoutMs) {
    const result = await this.fetchDebuggerWebSocketUrl(endpoint, timeoutMs);
    if (result.status === "ok") {
      return result.webSocketDebuggerUrl;
    }
    if (result.status === "not-found") {
      const port = this.getEndpointPort(endpoint);
      if (port !== null) {
        return this.readDevToolsActivePort(port);
      }
    }
    return null;
  }
  parseDevToolsActivePort(contents, expectedPort) {
    const lines = contents.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    const port = Number.parseInt(lines[0] ?? "", 10);
    const webSocketPath = lines[1] ?? "";
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return null;
    }
    if (expectedPort !== void 0 && port !== expectedPort) {
      return null;
    }
    if (!webSocketPath.startsWith("/devtools/browser/")) {
      return null;
    }
    return `ws://127.0.0.1:${port}${webSocketPath}`;
  }
  getEndpointPort(endpoint) {
    let url;
    try {
      url = new URL(endpoint);
    } catch {
      return null;
    }
    const rawPort = url.port || (url.protocol === "https:" ? "443" : url.protocol === "http:" ? "80" : "");
    const port = Number.parseInt(rawPort, 10);
    return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
  }
  buildManualConnectError(endpoint) {
    return [
      `Could not resolve a CDP WebSocket endpoint from ${endpoint}.`,
      "If Chrome is using built-in remote debugging, run `dev-browser --connect` without a URL so DevToolsActivePort can be auto-discovered.",
      "Or connect with the exact ws://127.0.0.1:<port>/devtools/browser/... URL from DevToolsActivePort, or launch Chrome with --remote-debugging-port=9222."
    ].join("\n");
  }
  registerNamedPage(entry, pageName, page) {
    entry.pages.set(pageName, page);
    page.on("close", () => {
      const current = entry.pages.get(pageName);
      if (current === page) {
        entry.pages.delete(pageName);
      }
    });
  }
  pruneClosedPages(entry) {
    for (const [pageName, page] of entry.pages.entries()) {
      if (page.isClosed()) {
        entry.pages.delete(pageName);
      }
    }
  }
  listNamedPages(entry) {
    this.pruneClosedPages(entry);
    return Array.from(entry.pages.entries()).filter(([, page]) => !page.isClosed()).map(([name]) => name).sort((left, right) => left.localeCompare(right));
  }
  getNamedPagesByPage(entry) {
    const namesByPage = /* @__PURE__ */ new Map();
    for (const [name, page] of entry.pages.entries()) {
      if (!page.isClosed() && !namesByPage.has(page)) {
        namesByPage.set(page, name);
      }
    }
    return namesByPage;
  }
  getBrowserContexts(entry) {
    return [.../* @__PURE__ */ new Set([entry.context, ...entry.browser.contexts()])];
  }
  getContextPages(entry) {
    const pages = [];
    for (const context of this.getBrowserContexts(entry)) {
      for (const page of context.pages()) {
        if (!page.isClosed()) {
          pages.push({ context, page });
        }
      }
    }
    return pages;
  }
  async getPageTitle(page) {
    let timeoutId;
    try {
      return await Promise.race([
        page.title(),
        new Promise((resolve) => {
          timeoutId = setTimeout(() => resolve(""), PAGE_TITLE_TIMEOUT_MS);
        })
      ]);
    } finally {
      if (timeoutId !== void 0) {
        clearTimeout(timeoutId);
      }
    }
  }
  async findPageByTargetId(entry, targetId) {
    for (const { context, page } of this.getContextPages(entry)) {
      const pageTargetId = await this.getPageTargetId(context, page);
      if (pageTargetId === targetId) {
        return page;
      }
    }
    return null;
  }
  async getPageTargetId(context, page) {
    let session;
    try {
      session = await context.newCDPSession(page);
      const result = await session.send("Target.getTargetInfo");
      const targetId = typeof result === "object" && result !== null && "targetInfo" in result && typeof result.targetInfo === "object" && result.targetInfo !== null && "targetId" in result.targetInfo ? result.targetInfo.targetId : void 0;
      if (typeof targetId !== "string" || targetId.length === 0) {
        throw new Error("CDP target info did not include a targetId");
      }
      return targetId;
    } catch (error) {
      if (page.isClosed()) {
        return null;
      }
      throw error;
    } finally {
      await session?.detach().catch(() => void 0);
    }
  }
};

// src/format-error.ts
function formatError(error) {
  if (error instanceof Error) {
    if (error.name === "ScriptTimeoutError") {
      return error.message;
    }
    const header = `${error.name}: ${error.message}`;
    if (!error.stack) {
      return header;
    }
    return error.stack.startsWith(header) ? error.stack : `${header}
${error.stack}`;
  }
  return String(error);
}

// src/execute-request.ts
var RequestTimeoutError = class extends Error {
  constructor(timeoutMs) {
    super(`Script timed out after ${formatTimeoutDuration(timeoutMs)} and was terminated.`);
    this.name = "ScriptTimeoutError";
  }
};
var RequestDisconnectedError = class extends Error {
  constructor() {
    super("Client disconnected");
    this.name = "RequestDisconnectedError";
  }
};
function formatTimeoutDuration(timeoutMs) {
  if (timeoutMs % 1e3 === 0) {
    return `${timeoutMs / 1e3}s`;
  }
  return `${timeoutMs}ms`;
}
function abortReason(signal) {
  return signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason));
}
var RequestSession = class {
  deadline;
  signal;
  #controller = new AbortController();
  #detachDisconnect;
  #request;
  #timeout;
  #timeoutMs;
  #transport;
  #active = true;
  #messages = Promise.resolve();
  #terminal = Promise.resolve();
  constructor(request, timeoutMs, transport) {
    this.#request = request;
    this.#timeoutMs = timeoutMs;
    this.#transport = transport;
    this.deadline = Date.now() + timeoutMs;
    this.signal = this.#controller.signal;
    this.#detachDisconnect = transport.onDisconnect(() => {
      this.#disconnect();
    });
    this.#timeout = setTimeout(() => {
      this.#finish(
        {
          id: request.id,
          type: "error",
          message: new RequestTimeoutError(timeoutMs).message
        },
        new RequestTimeoutError(timeoutMs)
      );
    }, timeoutMs);
    this.#timeout.unref?.();
  }
  stream(type, data) {
    if (!this.#active) {
      return;
    }
    this.#messages = this.#messages.then(async () => {
      if (this.#transport.isOpen()) {
        await this.#transport.send({ id: this.#request.id, type, data });
      }
    }).catch(() => void 0);
  }
  async complete() {
    this.#finish({ id: this.#request.id, type: "complete", success: true });
    await this.#terminal;
  }
  async fail(error) {
    this.#finish({ id: this.#request.id, type: "error", message: formatError(error) });
    await this.#terminal;
  }
  throwIfAborted() {
    if (this.signal.aborted) {
      throw abortReason(this.signal);
    }
  }
  throwIfAbortedOrExpired() {
    this.throwIfAborted();
    if (Date.now() < this.deadline) {
      return;
    }
    const error = new RequestTimeoutError(this.#timeoutMs);
    this.#finish(
      {
        id: this.#request.id,
        type: "error",
        message: error.message
      },
      error
    );
    throw error;
  }
  async dispose() {
    clearTimeout(this.#timeout);
    this.#detachDisconnect();
    await this.#terminal;
  }
  #disconnect() {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    clearTimeout(this.#timeout);
    this.#controller.abort(new RequestDisconnectedError());
  }
  #finish(message, abortError) {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    clearTimeout(this.#timeout);
    if (abortError) {
      this.#controller.abort(abortError);
    }
    this.#terminal = this.#messages.then(async () => {
      if (this.#transport.isOpen()) {
        await this.#transport.send(message);
      }
    }).catch(() => void 0);
  }
};
async function executeRequest(request, timeoutMs, transport, dependencies) {
  const session = new RequestSession(request, timeoutMs, transport);
  try {
    await dependencies.withBrowserLock(
      request.browser,
      async () => {
        session.throwIfAbortedOrExpired();
        await dependencies.prepareBrowser(request, {
          deadline: session.deadline,
          signal: session.signal
        });
        session.throwIfAbortedOrExpired();
        await dependencies.runScript(
          request,
          {
            onStdout: (data) => session.stream("stdout", data),
            onStderr: (data) => session.stream("stderr", data)
          },
          {
            deadline: session.deadline,
            signal: session.signal
          }
        );
        session.throwIfAbortedOrExpired();
      },
      { signal: session.signal }
    );
    session.throwIfAbortedOrExpired();
    await session.complete();
  } catch (error) {
    try {
      session.throwIfAbortedOrExpired();
    } catch {
    }
    await session.fail(error);
  } finally {
    await session.dispose();
  }
}

// src/idle-browser-reaper.ts
var MAX_TIMER_DELAY_MS = 2147483647;
var IdleBrowserReaper = class {
  #activity = /* @__PURE__ */ new Map();
  #dependencies;
  #now;
  #idleTimeoutMs = 0;
  #timer = null;
  constructor(dependencies) {
    this.#dependencies = dependencies;
    this.#now = dependencies.now ?? Date.now;
  }
  configure(idleTimeoutMs) {
    if (idleTimeoutMs === this.#idleTimeoutMs) {
      return;
    }
    this.#idleTimeoutMs = idleTimeoutMs;
    this.#scheduleNextDeadline();
  }
  get idleTimeoutMs() {
    return this.#idleTimeoutMs;
  }
  requestStarted(browserName) {
    const state = this.#getOrCreateActivity(browserName);
    state.activeRequests += 1;
    state.lastActivityAt = this.#now();
    this.#scheduleNextDeadline();
  }
  requestFinished(browserName) {
    const state = this.#getOrCreateActivity(browserName);
    state.activeRequests = Math.max(0, state.activeRequests - 1);
    state.lastActivityAt = this.#now();
    this.#scheduleNextDeadline();
  }
  browserStopped(browserName) {
    this.#activity.delete(browserName);
    this.#scheduleNextDeadline();
  }
  idleInfo(browser) {
    const state = this.#activity.get(browser.name);
    if (!state) {
      return { activeRequests: 0 };
    }
    const now = this.#now();
    const idleForMs = Math.max(0, now - state.lastActivityAt);
    const info = {
      activeRequests: state.activeRequests,
      idleForMs
    };
    if (browser.type === "launched" && this.#idleTimeoutMs > 0 && state.activeRequests === 0) {
      info.idleRemainingMs = Math.max(0, this.#idleTimeoutMs - idleForMs);
    }
    return info;
  }
  dispose() {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
  #getOrCreateActivity(browserName) {
    let state = this.#activity.get(browserName);
    if (!state) {
      state = { activeRequests: 0, lastActivityAt: this.#now() };
      this.#activity.set(browserName, state);
    }
    return state;
  }
  #scheduleNextDeadline() {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    if (this.#idleTimeoutMs === 0) {
      return;
    }
    const now = this.#now();
    let earliestDeadline;
    for (const browser of this.#dependencies.listBrowsers()) {
      if (browser.type !== "launched") {
        continue;
      }
      const state = this.#getOrCreateActivity(browser.name);
      if (state.activeRequests > 0) {
        continue;
      }
      const deadline = state.lastActivityAt + this.#idleTimeoutMs;
      earliestDeadline = earliestDeadline === void 0 ? deadline : Math.min(earliestDeadline, deadline);
    }
    if (earliestDeadline === void 0) {
      return;
    }
    const delay = Math.min(MAX_TIMER_DELAY_MS, Math.max(0, earliestDeadline - now));
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.#reapDueBrowsers().finally(() => this.#scheduleNextDeadline());
    }, delay);
    this.#timer.unref?.();
  }
  async #reapDueBrowsers() {
    if (this.#idleTimeoutMs === 0) {
      return;
    }
    const now = this.#now();
    const candidates = this.#dependencies.listBrowsers().filter((browser) => {
      const state = this.#activity.get(browser.name);
      return browser.type === "launched" && state !== void 0 && state.activeRequests === 0 && now - state.lastActivityAt >= this.#idleTimeoutMs;
    }).map((browser) => browser.name);
    await Promise.allSettled(
      candidates.map(async (browserName) => {
        await this.#dependencies.withBrowserLock(browserName, async () => {
          const browser = this.#dependencies.listBrowsers().find((candidate) => candidate.name === browserName);
          const state = this.#activity.get(browserName);
          if (!browser || browser.type !== "launched" || !state || state.activeRequests > 0 || this.#idleTimeoutMs === 0 || this.#now() - state.lastActivityAt < this.#idleTimeoutMs) {
            return;
          }
          try {
            await this.#dependencies.stopBrowser(browserName);
            this.#activity.delete(browserName);
          } catch {
            state.lastActivityAt = this.#now();
          }
        });
      })
    );
  }
};

// src/lock.ts
function abortReason2(signal) {
  return signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason));
}
async function waitForTurn(previous, signal) {
  if (signal.aborted) {
    throw abortReason2(signal);
  }
  await new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(abortReason2(signal));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    previous.then(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    });
  });
}
function createKeyedLock() {
  const locks = /* @__PURE__ */ new Map();
  return async function withLock(key, action, options = {}) {
    const previous = (locks.get(key) ?? Promise.resolve()).catch(() => void 0);
    let release;
    const current = new Promise((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    locks.set(key, tail);
    try {
      if (options.signal) {
        await waitForTurn(previous, options.signal);
      } else {
        await previous;
      }
      if (options.signal?.aborted) {
        throw abortReason2(options.signal);
      }
      return await action();
    } finally {
      release();
      void tail.then(() => {
        if (locks.get(key) === tail) {
          locks.delete(key);
        }
      });
    }
  };
}
function createMutex() {
  const withLock = createKeyedLock();
  const lockKey = /* @__PURE__ */ Symbol("mutex");
  return function withMutex(action) {
    return withLock(lockKey, action);
  };
}

// src/local-endpoint.ts
import os2 from "node:os";
import path2 from "node:path";
function sanitizePipeSegment(value) {
  const sanitized = value.replace(/[^A-Za-z0-9._-]/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return sanitized.length > 0 ? sanitized : "user";
}
function getDefaultUsername(homedir) {
  const fromEnv = process.env.USERNAME || process.env.USER;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv;
  }
  try {
    const username = os2.userInfo().username;
    if (username.trim().length > 0) {
      return username;
    }
  } catch {
  }
  return path2.basename(homedir) || "user";
}
function getDevBrowserBaseDir(homedir = os2.homedir()) {
  return path2.join(homedir, ".dev-browser");
}
function getDaemonEndpoint(options = {}) {
  const homedir = options.homedir ?? os2.homedir();
  const platform = options.platform ?? process.platform;
  if (platform === "win32") {
    const username = sanitizePipeSegment(options.username ?? getDefaultUsername(homedir));
    return `\\\\.\\pipe\\dev-browser-daemon-${username}`;
  }
  return path2.join(getDevBrowserBaseDir(homedir), "daemon.sock");
}
function getPidPath(homedir = os2.homedir()) {
  return path2.join(getDevBrowserBaseDir(homedir), "daemon.pid");
}
function getBrowsersDir(homedir = os2.homedir()) {
  return path2.join(getDevBrowserBaseDir(homedir), "browsers");
}
function requiresDaemonEndpointCleanup(platform = process.platform) {
  return platform !== "win32";
}

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util3) {
  util3.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util3.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util3.assertNever = assertNever;
  util3.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util3.getValidEnumValues = (obj) => {
    const validKeys = util3.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util3.objectValues(filtered);
  };
  util3.objectValues = (obj) => {
    return util3.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util3.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util3.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util3.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util3.joinValues = joinValues;
  util3.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path6, errorMaps, issueData } = params;
  const fullPath = [...path6, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path6, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path6;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// src/protocol.ts
var RequestBaseSchema = external_exports.object({
  id: external_exports.string().min(1),
  idleTimeoutMs: external_exports.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional()
});
var ExecuteRequestSchema = RequestBaseSchema.extend({
  type: external_exports.literal("execute"),
  browser: external_exports.string().min(1).default("default"),
  script: external_exports.string(),
  headless: external_exports.boolean().optional(),
  ignoreHTTPSErrors: external_exports.boolean().optional(),
  connect: external_exports.string().min(1).optional(),
  timeoutMs: external_exports.number().int().positive().optional()
});
var BrowsersRequestSchema = RequestBaseSchema.extend({
  type: external_exports.literal("browsers")
});
var BrowserStopRequestSchema = RequestBaseSchema.extend({
  type: external_exports.literal("browser-stop"),
  browser: external_exports.string().min(1)
});
var StatusRequestSchema = RequestBaseSchema.extend({
  type: external_exports.literal("status")
});
var InstallRequestSchema = RequestBaseSchema.extend({
  type: external_exports.literal("install")
});
var StopRequestSchema = RequestBaseSchema.extend({
  type: external_exports.literal("stop")
});
var RequestSchema = external_exports.discriminatedUnion("type", [
  ExecuteRequestSchema,
  BrowsersRequestSchema,
  BrowserStopRequestSchema,
  StatusRequestSchema,
  InstallRequestSchema,
  StopRequestSchema
]);
var ResponseBaseSchema = external_exports.object({
  id: external_exports.string().min(1)
});
var StdoutMessageSchema = ResponseBaseSchema.extend({
  type: external_exports.literal("stdout"),
  data: external_exports.string()
});
var StderrMessageSchema = ResponseBaseSchema.extend({
  type: external_exports.literal("stderr"),
  data: external_exports.string()
});
var CompleteMessageSchema = ResponseBaseSchema.extend({
  type: external_exports.literal("complete"),
  success: external_exports.literal(true)
});
var ErrorMessageSchema = ResponseBaseSchema.extend({
  type: external_exports.literal("error"),
  message: external_exports.string()
});
var ResultMessageSchema = ResponseBaseSchema.extend({
  type: external_exports.literal("result"),
  data: external_exports.unknown()
});
var ResponseSchema = external_exports.discriminatedUnion("type", [
  StdoutMessageSchema,
  StderrMessageSchema,
  CompleteMessageSchema,
  ErrorMessageSchema,
  ResultMessageSchema
]);
function describeZodError(error) {
  return error.issues.map((issue) => {
    const path6 = issue.path.length > 0 ? issue.path.join(".") : "request";
    return `${path6}: ${issue.message}`;
  }).join("; ");
}
function extractId(value) {
  if (!value || typeof value !== "object") {
    return void 0;
  }
  const maybeId = value.id;
  return typeof maybeId === "string" && maybeId.length > 0 ? maybeId : void 0;
}
function parseRequest(line) {
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid JSON request"
    };
  }
  const result = RequestSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: describeZodError(result.error),
      id: extractId(parsed)
    };
  }
  return {
    success: true,
    request: result.data
  };
}
function serialize(message) {
  return `${JSON.stringify(ResponseSchema.parse(message))}
`;
}

// src/sandbox/quickjs-sandbox.ts
import { readFile as readFile2 } from "node:fs/promises";
import util2 from "node:util";

// src/temp-files.ts
import { constants } from "node:fs";
import { lstat, mkdir as mkdir2, open } from "node:fs/promises";
import path3 from "node:path";
var SAFE_PATH_SEGMENT_PATTERN = /[^A-Za-z0-9._-]/g;
var NOFOLLOW_FLAG = constants.O_NOFOLLOW ?? 0;
var DEV_BROWSER_BASE_DIR = getDevBrowserBaseDir();
var DEV_BROWSER_TMP_DIR = path3.join(DEV_BROWSER_BASE_DIR, "tmp");
function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}
function isWithinDirectory(rootDir, candidatePath) {
  if (candidatePath === rootDir) {
    return true;
  }
  const rootWithSeparator = rootDir.endsWith(path3.sep) ? rootDir : `${rootDir}${path3.sep}`;
  return candidatePath.startsWith(rootWithSeparator);
}
function sanitizePathSegment(segment) {
  if (segment.length === 0) {
    throw new Error("File paths must not contain empty path segments");
  }
  if (segment === "." || segment === ".." || segment.includes("..")) {
    throw new Error("File paths must not contain '.' or '..' segments");
  }
  const sanitized = segment.replace(SAFE_PATH_SEGMENT_PATTERN, "_");
  if (sanitized.length === 0 || sanitized === "." || sanitized === "..") {
    throw new Error("File paths must resolve to a valid filename");
  }
  return sanitized;
}
function sanitizeRelativePath(fileName) {
  const rawPath = requireNonEmptyString(fileName, "File name");
  if (rawPath.includes("\0")) {
    throw new Error("File names must not contain null bytes");
  }
  if (path3.posix.isAbsolute(rawPath) || path3.win32.isAbsolute(rawPath)) {
    throw new Error("Absolute paths are not allowed");
  }
  const normalized = rawPath.replace(/\\/g, "/");
  if (normalized.startsWith("/")) {
    throw new Error("Absolute paths are not allowed");
  }
  return normalized.split("/").map(sanitizePathSegment);
}
async function assertControlledDirectory(directoryPath, label) {
  const stats = await lstat(directoryPath);
  if (stats.isSymbolicLink()) {
    throw new Error(`${label} must not be a symlink`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`${label} must be a directory`);
  }
}
async function assertSafeParentDirectories(rootDir, destinationPath, createParents) {
  const relativeParent = path3.relative(rootDir, path3.dirname(destinationPath));
  if (relativeParent.length === 0) {
    return;
  }
  const segments = relativeParent.split(path3.sep).filter((segment) => segment.length > 0);
  let currentPath = rootDir;
  for (const segment of segments) {
    currentPath = path3.join(currentPath, segment);
    if (createParents) {
      await mkdir2(currentPath, {
        recursive: true
      });
    }
    try {
      const stats = await lstat(currentPath);
      if (stats.isSymbolicLink()) {
        throw new Error(`Temp path parent must not be a symlink: ${currentPath}`);
      }
      if (!stats.isDirectory()) {
        throw new Error(`Temp path parent must be a directory: ${currentPath}`);
      }
    } catch (error) {
      if (error.code === "ENOENT" && !createParents) {
        return;
      }
      throw error;
    }
  }
}
function normalizeSymlinkError(error, destinationPath) {
  if (error.code === "ELOOP") {
    return new Error(`Refusing to follow symlinked temp file: ${destinationPath}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}
async function assertDestinationIsNotSymlink(destinationPath) {
  try {
    const stats = await lstat(destinationPath);
    if (stats.isSymbolicLink()) {
      throw new Error(`Refusing to follow symlinked temp file: ${destinationPath}`);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}
async function ensureDevBrowserTempDir() {
  await mkdir2(DEV_BROWSER_BASE_DIR, {
    recursive: true
  });
  await assertControlledDirectory(DEV_BROWSER_BASE_DIR, "Dev Browser base directory");
  await mkdir2(DEV_BROWSER_TMP_DIR, {
    recursive: true
  });
  await assertControlledDirectory(DEV_BROWSER_TMP_DIR, "Dev Browser temp directory");
  return path3.resolve(DEV_BROWSER_TMP_DIR);
}
async function resolveDevBrowserTempPath(fileName, options = {}) {
  const rootDir = await ensureDevBrowserTempDir();
  const segments = sanitizeRelativePath(fileName);
  const destinationPath = path3.resolve(rootDir, ...segments);
  if (!isWithinDirectory(rootDir, destinationPath)) {
    throw new Error("Resolved temp file path escapes the controlled temp directory");
  }
  await assertSafeParentDirectories(rootDir, destinationPath, options.createParents ?? false);
  return destinationPath;
}
async function writeDevBrowserTempFile(fileName, data) {
  const destinationPath = await resolveDevBrowserTempPath(fileName, {
    createParents: true
  });
  await assertDestinationIsNotSymlink(destinationPath);
  let handle;
  try {
    handle = await open(
      destinationPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | NOFOLLOW_FLAG,
      384
    );
    await handle.writeFile(data);
  } catch (error) {
    throw normalizeSymlinkError(error, destinationPath);
  } finally {
    await handle?.close();
  }
  return destinationPath;
}
async function readDevBrowserTempFile(fileName) {
  const destinationPath = await resolveDevBrowserTempPath(fileName);
  await assertDestinationIsNotSymlink(destinationPath);
  let handle;
  try {
    handle = await open(destinationPath, constants.O_RDONLY | NOFOLLOW_FLAG);
    return await handle.readFile({
      encoding: "utf8"
    });
  } catch (error) {
    throw normalizeSymlinkError(error, destinationPath);
  } finally {
    await handle?.close();
  }
}

// src/sandbox/playwright-internals.ts
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path4 from "node:path";
import { fileURLToPath } from "node:url";
var require2 = createRequire(import.meta.url);
var currentDir = path4.dirname(fileURLToPath(import.meta.url));
function resolvePlaywrightInternal(modulePath) {
  const candidates = [
    path4.resolve(currentDir, "../../node_modules/playwright-core", modulePath),
    path4.resolve(currentDir, "node_modules/playwright-core", modulePath),
    path4.resolve(process.cwd(), "node_modules/playwright-core", modulePath)
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Could not locate Playwright internals at ${modulePath}`);
}
var serverInternals = require2(
  resolvePlaywrightInternal(path4.join("lib", "server", "index.js"))
);
var clientInternals = require2(
  resolvePlaywrightInternal(path4.join("lib", "client", "connection.js"))
);
var nodePlatformInternals = require2(
  resolvePlaywrightInternal(path4.join("lib", "server", "utils", "nodePlatform.js"))
);
var { createPlaywright, DispatcherConnection, RootDispatcher, PlaywrightDispatcher } = serverInternals;
var { Connection } = clientInternals;
var { nodePlatform } = nodePlatformInternals;

// src/sandbox/host-bridge.ts
var HostBridge = class {
  dispatcherConnection;
  rootDispatcher;
  playwright;
  sendToSandbox;
  options;
  playwrightDispatcher;
  disposed = false;
  constructor(options) {
    this.sendToSandbox = options.sendToSandbox;
    this.options = {
      preLaunchedBrowser: options.preLaunchedBrowser,
      sharedBrowser: options.sharedBrowser,
      denyLaunch: options.denyLaunch,
      sdkLanguage: options.sdkLanguage ?? "javascript"
    };
    this.playwright = createPlaywright({
      sdkLanguage: this.options.sdkLanguage ?? "javascript"
    });
    this.dispatcherConnection = new DispatcherConnection(false);
    this.dispatcherConnection.onmessage = (message) => {
      this.sendToSandbox(JSON.stringify(message));
    };
    this.rootDispatcher = new RootDispatcher(this.dispatcherConnection, async (rootScope) => {
      this.playwrightDispatcher = new PlaywrightDispatcher(rootScope, this.playwright, {
        preLaunchedBrowser: this.options.preLaunchedBrowser,
        sharedBrowser: this.options.sharedBrowser,
        denyLaunch: this.options.denyLaunch
      });
      return this.playwrightDispatcher;
    });
  }
  async receiveFromSandbox(json) {
    await this.dispatcherConnection.dispatch(JSON.parse(json));
  }
  async stopPendingOperations(error) {
    const dispatchers = this.dispatcherConnection._dispatcherByGuid;
    if (!dispatchers) {
      await this.rootDispatcher.stopPendingOperations(error);
      return;
    }
    const controllers = new Set(
      [...new Set(dispatchers.values())].flatMap((dispatcher) => [
        ...dispatcher._activeProgressControllers ?? []
      ])
    );
    await Promise.all([...controllers].map((controller) => controller.abort(error)));
  }
  async dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.dispatcherConnection.onmessage = () => {
    };
    let cleanupError;
    try {
      await this.stopPendingOperations(new Error("Sandbox bridge disposed"));
    } catch (error) {
      cleanupError = error;
    }
    try {
      await this.playwrightDispatcher?.cleanup();
    } catch (error) {
      cleanupError ??= error;
    } finally {
      this.rootDispatcher._dispose();
    }
    if (cleanupError) {
      throw cleanupError;
    }
  }
};

// src/sandbox/quickjs-host.ts
import {
  getQuickJS
} from "quickjs-emscripten";
var QuickJSHost = class _QuickJSHost {
  static async create(options = {}) {
    const quickjs = await getQuickJS();
    return new _QuickJSHost(quickjs, options);
  }
  #quickjs;
  #runtime;
  #context;
  #options;
  #timers = /* @__PURE__ */ new Map();
  #pendingDeferreds = /* @__PURE__ */ new Set();
  #disposed = false;
  #interruptDeadline;
  #nextTimerId = 1;
  constructor(quickjs, options) {
    this.#quickjs = quickjs;
    this.#options = options;
    this.#runtime = quickjs.newRuntime();
    if (options.memoryLimitBytes !== void 0) {
      this.#runtime.setMemoryLimit(options.memoryLimitBytes);
    }
    if (options.maxStackSizeBytes !== void 0) {
      this.#runtime.setMaxStackSize(options.maxStackSizeBytes);
    }
    if (options.cpuTimeoutMs !== void 0) {
      this.#runtime.setInterruptHandler(() => {
        return this.#interruptDeadline !== void 0 && Date.now() > this.#interruptDeadline;
      });
    }
    this.#context = this.#runtime.newContext();
    this.#installConsole();
    this.#installTimers();
    this.#installHostCall();
    this.#installTransportSend();
    for (const [name, value] of Object.entries(options.globals ?? {})) {
      this.setGlobal(name, value);
    }
  }
  get disposed() {
    return this.#disposed;
  }
  setGlobal(name, value) {
    this.#assertAlive();
    const valueHandle = this.#toHandle(value);
    try {
      this.#context.setProp(this.#context.global, name, valueHandle);
    } finally {
      valueHandle.dispose();
    }
  }
  executeScriptSync(code, options = {}) {
    const resultHandle = this.#evalCode(code, options);
    try {
      const promiseState = this.#context.getPromiseState(resultHandle);
      if (!(promiseState.type === "fulfilled" && promiseState.notAPromise)) {
        throw new Error("QuickJS script returned a promise; use executeScript() instead");
      }
      return this.#dumpHandle(resultHandle);
    } finally {
      resultHandle.dispose();
    }
  }
  async executeScript(code, options = {}) {
    const resultHandle = this.#evalCode(code, options);
    return this.#consumeHandle(resultHandle);
  }
  async callFunction(name, ...args) {
    this.#assertAlive();
    const functionHandle = this.#context.getProp(this.#context.global, name);
    const argHandles = args.map((value) => this.#toHandle(value));
    try {
      if (this.#context.typeof(functionHandle) !== "function") {
        throw new Error(`QuickJS global "${name}" is not a function`);
      }
      const result = this.#runWithCpuLimit(
        () => this.#context.callFunction(functionHandle, this.#context.global, ...argHandles)
      );
      const resultHandle = this.#unwrapResult(result, `QuickJS function "${name}" failed`);
      return await this.#consumeHandle(resultHandle);
    } finally {
      for (const argHandle of argHandles) {
        argHandle.dispose();
      }
      functionHandle.dispose();
    }
  }
  dispose() {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    for (const timerId of [...this.#timers.keys()]) {
      this.#clearTimer(timerId);
    }
    for (const deferred of [...this.#pendingDeferreds]) {
      deferred.dispose();
      this.#pendingDeferreds.delete(deferred);
    }
    this.#context.dispose();
    this.#runtime.dispose();
  }
  #installConsole() {
    const consoleObject = this.#context.newObject();
    try {
      for (const level of ["log", "warn", "error", "info"]) {
        const fn = this.#context.newFunction(level, (...args) => {
          const nativeArgs = args.map((arg) => this.#context.dump(arg));
          this.#options.onConsole?.(level, nativeArgs);
        });
        this.#context.setProp(consoleObject, level, fn);
        fn.dispose();
      }
      this.#context.setProp(this.#context.global, "console", consoleObject);
    } finally {
      consoleObject.dispose();
    }
  }
  #installHostCall() {
    const hostCall = this.#context.newFunction("__hostCall", (nameHandle, argsJsonHandle) => {
      const name = this.#context.getString(nameHandle);
      const argsJson = this.#context.getString(argsJsonHandle);
      const args = this.#parseArgs(name, argsJson);
      const invoke = () => {
        if (this.#options.onHostCall) {
          return this.#options.onHostCall(name, args);
        }
        const handler = this.#options.hostFunctions?.[name];
        if (!handler) {
          throw new Error(`No host function registered for "${name}"`);
        }
        return handler(...args);
      };
      return this.#bridgeHostResult(invoke);
    });
    this.#context.setProp(this.#context.global, "__hostCall", hostCall);
    hostCall.dispose();
  }
  #installTransportSend() {
    const transportSend = this.#context.newFunction("__transport_send", (messageHandle) => {
      const message = this.#context.getString(messageHandle);
      return this.#bridgeHostResult(() => this.#options.onTransportSend?.(message));
    });
    this.#context.setProp(this.#context.global, "__transport_send", transportSend);
    transportSend.dispose();
  }
  #installTimers() {
    const setTimeoutHandle = this.#context.newFunction(
      "setTimeout",
      (callbackHandle, delayHandle, ...argHandles) => {
        if (this.#context.typeof(callbackHandle) !== "function") {
          throw new TypeError("setTimeout callback must be a function");
        }
        const timerId = this.#nextTimerId++;
        const delay = Math.max(0, this.#context.getNumber(delayHandle));
        const callback = callbackHandle.dup();
        const args = argHandles.map((arg) => arg.dup());
        const timeout = globalThis.setTimeout(() => {
          if (this.#disposed) {
            this.#clearTimer(timerId);
            return;
          }
          const record = this.#timers.get(timerId);
          if (!record) {
            return;
          }
          try {
            const result = this.#runWithCpuLimit(
              () => this.#context.callFunction(record.callback, this.#context.undefined, ...record.args)
            );
            if (result.error) {
              this.#emitConsoleError(this.#context.dump(result.error));
              result.error.dispose();
            } else {
              result.value.dispose();
            }
            this.#tryDrainPendingJobs();
          } finally {
            this.#clearTimer(timerId);
          }
        }, delay);
        this.#timers.set(timerId, { callback, args, timeout });
        return this.#context.newNumber(timerId);
      }
    );
    const clearTimeoutHandle = this.#context.newFunction("clearTimeout", (timerIdHandle) => {
      this.#clearTimer(this.#context.getNumber(timerIdHandle));
    });
    this.#context.setProp(this.#context.global, "setTimeout", setTimeoutHandle);
    this.#context.setProp(this.#context.global, "clearTimeout", clearTimeoutHandle);
    setTimeoutHandle.dispose();
    clearTimeoutHandle.dispose();
  }
  #clearTimer(timerId) {
    const record = this.#timers.get(timerId);
    if (!record) {
      return;
    }
    globalThis.clearTimeout(record.timeout);
    record.callback.dispose();
    for (const arg of record.args) {
      arg.dispose();
    }
    this.#timers.delete(timerId);
  }
  #bridgeHostResult(invoker) {
    try {
      const result = invoker();
      if (this.#isPromiseLike(result)) {
        return this.#createDeferredPromise(result);
      }
      if (result === void 0) {
        return;
      }
      return this.#toHandle(result);
    } catch (error) {
      throw this.#normalizeHostError(error);
    }
  }
  #createDeferredPromise(promise) {
    const deferred = this.#context.newPromise();
    this.#pendingDeferreds.add(deferred);
    promise.then((value) => {
      if (this.#disposed || !deferred.alive) {
        return;
      }
      const valueHandle = value === void 0 ? void 0 : this.#toHandle(value);
      try {
        deferred.resolve(valueHandle);
      } finally {
        valueHandle?.dispose();
      }
    }).catch((error) => {
      if (this.#disposed || !deferred.alive) {
        return;
      }
      const errorHandle = this.#newGuestErrorHandle(error);
      try {
        deferred.reject(errorHandle);
      } finally {
        errorHandle.dispose();
      }
    }).finally(() => {
      this.#pendingDeferreds.delete(deferred);
      this.#tryDrainPendingJobs();
    });
    return deferred.handle;
  }
  #evalCode(code, options) {
    this.#assertAlive();
    const result = this.#runWithCpuLimit(
      () => this.#context.evalCode(code, options.filename ?? "sandbox.js", {
        type: options.type
      })
    );
    return this.#unwrapResult(result, "QuickJS evaluation failed");
  }
  async #consumeHandle(handle) {
    try {
      const promiseState = this.#context.getPromiseState(handle);
      if (promiseState.type === "fulfilled" && promiseState.notAPromise) {
        return this.#dumpHandle(handle);
      }
      if (promiseState.type === "fulfilled") {
        try {
          return this.#dumpHandle(promiseState.value);
        } finally {
          promiseState.value.dispose();
        }
      }
      if (promiseState.type === "pending") {
        const resolved2 = await this.#awaitQuickJSPromise(handle);
        try {
          return this.#dumpHandle(resolved2);
        } finally {
          resolved2.dispose();
        }
      }
      if (promiseState.type === "rejected") {
        try {
          throw this.#toError("QuickJS promise rejected", promiseState.error);
        } finally {
          promiseState.error.dispose();
        }
      }
      const resolved = await this.#awaitQuickJSPromise(handle);
      try {
        return this.#dumpHandle(resolved);
      } finally {
        resolved.dispose();
      }
    } finally {
      handle.dispose();
    }
  }
  async #awaitQuickJSPromise(promiseHandle) {
    let settled = false;
    const nativePromise = this.#context.resolvePromise(promiseHandle).finally(() => {
      settled = true;
    });
    while (!settled) {
      this.#drainPendingJobs();
      if (settled) {
        break;
      }
      await this.#options.onDrain?.();
      this.#drainPendingJobs();
      if (settled) {
        break;
      }
      await new Promise((resolve) => {
        globalThis.setTimeout(resolve, 0);
      });
    }
    this.#drainPendingJobs();
    return this.#unwrapResult(await nativePromise, "QuickJS promise rejected");
  }
  #drainPendingJobs() {
    this.#assertAlive();
    while (true) {
      const jobResult = this.#runWithCpuLimit(() => this.#runtime.executePendingJobs());
      if (jobResult.error) {
        const error = this.#toError("QuickJS pending job failed", jobResult.error);
        jobResult.error.dispose();
        throw error;
      }
      if (jobResult.value === 0) {
        return;
      }
    }
  }
  #tryDrainPendingJobs() {
    if (this.#disposed) {
      return;
    }
    try {
      this.#drainPendingJobs();
    } catch (error) {
      this.#emitConsoleError(this.#normalizeHostError(error));
    }
  }
  #unwrapResult(result, prefix) {
    if (result.error) {
      const error = this.#toError(prefix, result.error);
      result.error.dispose();
      throw error;
    }
    return result.value;
  }
  #toHandle(value) {
    if (value === void 0) {
      return this.#context.undefined.dup();
    }
    if (value === null) {
      return this.#context.null.dup();
    }
    if (value === true) {
      return this.#context.true.dup();
    }
    if (value === false) {
      return this.#context.false.dup();
    }
    switch (typeof value) {
      case "number":
        return this.#context.newNumber(value);
      case "string":
        return this.#context.newString(value);
      case "bigint":
        return this.#context.newBigInt(value);
      case "object": {
        if (Array.isArray(value)) {
          const arrayHandle = this.#context.newArray();
          try {
            value.forEach((item, index) => {
              const itemHandle = this.#toHandle(item);
              try {
                this.#context.setProp(arrayHandle, index, itemHandle);
              } finally {
                itemHandle.dispose();
              }
            });
            return arrayHandle;
          } catch (error) {
            arrayHandle.dispose();
            throw error;
          }
        }
        const objectHandle = this.#context.newObject();
        try {
          for (const [key, item] of Object.entries(value)) {
            const itemHandle = this.#toHandle(item);
            try {
              this.#context.setProp(objectHandle, key, itemHandle);
            } finally {
              itemHandle.dispose();
            }
          }
          return objectHandle;
        } catch (error) {
          objectHandle.dispose();
          throw error;
        }
      }
      default:
        throw new TypeError(`Unsupported host value type: ${typeof value}`);
    }
  }
  #dumpHandle(handle) {
    return this.#context.dump(handle);
  }
  #parseArgs(name, argsJson) {
    try {
      const parsed = JSON.parse(argsJson);
      if (!Array.isArray(parsed)) {
        throw new Error("Expected a JSON array");
      }
      return parsed;
    } catch (error) {
      throw new Error(
        `Invalid JSON arguments for host call "${name}": ${this.#normalizeHostError(error).message}`
      );
    }
  }
  #newGuestErrorHandle(error) {
    const normalized = this.#normalizeHostError(error);
    const errorHandle = this.#context.newError({
      name: normalized.name || "Error",
      message: normalized.message
    });
    if (normalized.stack) {
      const stackHandle = this.#context.newString(normalized.stack);
      try {
        this.#context.setProp(errorHandle, "stack", stackHandle);
      } finally {
        stackHandle.dispose();
      }
    }
    return errorHandle;
  }
  #toError(prefix, errorHandle) {
    const dumped = this.#context.dump(errorHandle);
    const normalized = this.#normalizeHostError(dumped);
    normalized.message = `${prefix}: ${normalized.message}`;
    return normalized;
  }
  #emitConsoleError(error) {
    const normalized = this.#normalizeHostError(error);
    this.#options.onConsole?.("error", [
      {
        name: normalized.name,
        message: normalized.message,
        stack: normalized.stack
      }
    ]);
  }
  #normalizeHostError(error) {
    if (error instanceof Error) {
      return error;
    }
    if (typeof error === "object" && error !== null) {
      const name = "name" in error && typeof error.name === "string" ? error.name : "Error";
      const message = "message" in error && typeof error.message === "string" ? error.message : JSON.stringify(error);
      const normalized = new Error(message);
      normalized.name = name;
      if ("stack" in error && typeof error.stack === "string") {
        normalized.stack = error.stack;
      }
      return normalized;
    }
    return new Error(String(error));
  }
  #runWithCpuLimit(callback) {
    if (this.#options.cpuTimeoutMs === void 0) {
      return callback();
    }
    const previousDeadline = this.#interruptDeadline;
    this.#interruptDeadline = Date.now() + this.#options.cpuTimeoutMs;
    try {
      return callback();
    } finally {
      this.#interruptDeadline = previousDeadline;
    }
  }
  #assertAlive() {
    if (this.#disposed) {
      throw new Error("QuickJSHost has been disposed");
    }
  }
  #isPromiseLike(value) {
    return typeof value === "object" && value !== null && "then" in value;
  }
};

// src/sandbox/quickjs-sandbox.ts
import { existsSync as existsSync2 } from "node:fs";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var DEFAULT_MEMORY_LIMIT_BYTES = 512 * 1024 * 1024;
var WAIT_FOR_OBJECT_ATTEMPTS = 1e3;
function findBundlePath() {
  const candidates = [
    fileURLToPath2(new URL("./sandbox-client.js", import.meta.url)),
    fileURLToPath2(new URL("../../dist/sandbox-client.js", import.meta.url))
  ];
  for (const p of candidates) {
    if (existsSync2(p)) return p;
  }
  throw new Error(
    `Failed to find sandbox-client.js. Searched:
${candidates.map((c) => `  - ${c}`).join("\n")}`
  );
}
var BUNDLE_PATH = findBundlePath();
var TRANSPORT_RECEIVE_GLOBAL = "__transport_receive";
var bundleCodePromise;
function formatArgs(args) {
  return args.map(
    (arg) => typeof arg === "string" ? arg : util2.inspect(arg, {
      colors: false,
      depth: 6,
      compact: 3,
      breakLength: Infinity
    })
  ).join(" ");
}
function normalizeError(error) {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}
function getSandboxClientBundleCode() {
  bundleCodePromise ??= readFile2(BUNDLE_PATH, "utf8").catch((error) => {
    bundleCodePromise = void 0;
    const message = error instanceof Error ? error.message : "Sandbox client bundle could not be read";
    throw new Error(`Failed to load sandbox client bundle at ${BUNDLE_PATH}: ${message}`);
  });
  return bundleCodePromise;
}
function formatTimeoutDuration2(timeoutMs) {
  if (timeoutMs % 1e3 === 0) {
    return `${timeoutMs / 1e3}s`;
  }
  return `${timeoutMs}ms`;
}
function createScriptTimeoutError(timeoutMs) {
  const error = new Error(
    `Script timed out after ${formatTimeoutDuration2(timeoutMs)} and was terminated.`
  );
  error.name = "ScriptTimeoutError";
  return error;
}
function createGuestScriptTimeoutErrorSource(timeoutMs) {
  const message = JSON.stringify(createScriptTimeoutError(timeoutMs).message);
  return `(() => {
    const error = new Error(${message});
    error.name = "ScriptTimeoutError";
    return error;
  })()`;
}
function wrapScriptWithWallClockTimeout(script, timeoutMs) {
  if (timeoutMs === void 0) {
    return script;
  }
  return `
    (() => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(${createGuestScriptTimeoutErrorSource(timeoutMs)});
        }, ${timeoutMs});

        Promise.resolve()
          .then(() => (${script}))
          .then(resolve, reject)
          .finally(() => {
            clearTimeout(timeoutId);
          });
      });
    })()
  `;
}
function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}
function toServerImpl(clientObject, label) {
  const connection = clientObject._connection;
  const toImpl = connection?.toImpl;
  if (typeof toImpl !== "function") {
    throw new Error(`${label} does not expose a server implementation`);
  }
  const impl = toImpl(clientObject);
  if (!impl) {
    throw new Error(`${label} could not be mapped to a server implementation`);
  }
  return impl;
}
function extractGuid(page) {
  const guid = toServerImpl(page, "Playwright page").guid;
  if (typeof guid !== "string" || guid.length === 0) {
    throw new Error("Playwright page did not expose a guid");
  }
  return guid;
}
function decodeSandboxFilePayload(value, label) {
  if (typeof value !== "object" || value === null) {
    throw new TypeError(`${label} must be an object`);
  }
  const encoding = "encoding" in value ? value.encoding : void 0;
  const data = "data" in value ? value.data : void 0;
  if (encoding !== "utf8" && encoding !== "base64" || typeof data !== "string") {
    throw new TypeError(`${label} must include a valid encoding and string data`);
  }
  if (encoding === "utf8") {
    return data;
  }
  return Buffer.from(data, "base64");
}
var QuickJSSandbox = class {
  #options;
  #anonymousPages = /* @__PURE__ */ new Set();
  #abortWakeup;
  #pendingHostOperations = /* @__PURE__ */ new Set();
  #transportInbox = [];
  #asyncError;
  #abortError;
  #resolveAbortWakeup;
  #host;
  #hostBridge;
  #flushPromise;
  #disposed = false;
  #initialized = false;
  constructor(options) {
    this.#options = options;
    this.#abortWakeup = new Promise((resolve) => {
      this.#resolveAbortWakeup = resolve;
    });
  }
  async initialize() {
    this.#assertAlive();
    this.#throwIfAborted();
    if (this.#initialized) {
      return;
    }
    try {
      await ensureDevBrowserTempDir();
      this.#throwIfAborted();
      this.#host = await QuickJSHost.create({
        memoryLimitBytes: this.#options.memoryLimitBytes ?? DEFAULT_MEMORY_LIMIT_BYTES,
        cpuTimeoutMs: this.#options.timeoutMs,
        hostFunctions: {
          getPage: (name) => this.#getPage(name),
          newPage: () => this.#newPage(),
          listPages: () => this.#options.manager.listPages(this.#options.browserName),
          closePage: (name) => this.#closePage(name),
          saveScreenshot: (name, data) => this.#writeTempFile(name, data),
          writeFile: (name, data) => this.#writeTempFile(name, data),
          readFile: (name) => this.#readTempFile(name)
        },
        onConsole: (level, args) => {
          this.#routeConsole(level, args);
        },
        onDrain: () => this.#drainAsyncOps(),
        onTransportSend: (message) => {
          this.#handleTransportSend(message);
        }
      });
      this.#throwIfAborted();
      this.#host.executeScriptSync(
        `
          const __performanceOrigin = Date.now();
          const __base64Alphabet =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

          const __encodeBase64 = (bytes) => {
            let result = "";
            for (let index = 0; index < bytes.length; index += 3) {
              const chunk =
                (bytes[index] << 16) |
                ((bytes[index + 1] ?? 0) << 8) |
                (bytes[index + 2] ?? 0);
              result += __base64Alphabet[(chunk >> 18) & 63];
              result += __base64Alphabet[(chunk >> 12) & 63];
              result += index + 1 < bytes.length ? __base64Alphabet[(chunk >> 6) & 63] : "=";
              result += index + 2 < bytes.length ? __base64Alphabet[chunk & 63] : "=";
            }
            return result;
          };

          const __decodeBase64 = (base64) => {
            const normalized = String(base64).replace(/\\s+/g, "");
            const output = [];
            for (let index = 0; index < normalized.length; index += 4) {
              const a = __base64Alphabet.indexOf(normalized[index] ?? "A");
              const b = __base64Alphabet.indexOf(normalized[index + 1] ?? "A");
              const c =
                normalized[index + 2] === "="
                  ? 64
                  : __base64Alphabet.indexOf(normalized[index + 2] ?? "A");
              const d =
                normalized[index + 3] === "="
                  ? 64
                  : __base64Alphabet.indexOf(normalized[index + 3] ?? "A");
              const chunk = (a << 18) | (b << 12) | ((c & 63) << 6) | (d & 63);
              output.push((chunk >> 16) & 255);
              if (c !== 64) {
                output.push((chunk >> 8) & 255);
              }
              if (d !== 64) {
                output.push(chunk & 255);
              }
            }
            return new Uint8Array(output);
          };

          globalThis.URL ??= class URL {
            constructor(value, base) {
              this.href = base === undefined ? String(value) : String(base) + String(value);
            }

            toJSON() {
              return this.href;
            }

            toString() {
              return this.href;
            }
          };

          globalThis.Buffer ??= class Buffer extends Uint8Array {
            constructor(value, byteOffset, length) {
              if (typeof value === "number") {
                super(value);
                return;
              }
              if (value instanceof ArrayBuffer) {
                super(value, byteOffset, length);
                return;
              }
              if (ArrayBuffer.isView(value)) {
                super(value.buffer, value.byteOffset, value.byteLength);
                return;
              }
              super(value);
            }

            static isBuffer(value) {
              return value instanceof Buffer;
            }

            static from(value, encodingOrOffset, length) {
              if (typeof value === "string") {
                if (encodingOrOffset !== undefined && encodingOrOffset !== "base64") {
                  throw new Error("QuickJS Buffer only supports base64 string input");
                }
                return new Buffer(__decodeBase64(value));
              }
              if (value instanceof ArrayBuffer) {
                return new Buffer(value, encodingOrOffset, length);
              }
              if (ArrayBuffer.isView(value)) {
                return new Buffer(
                  value.buffer.slice(
                    value.byteOffset,
                    value.byteOffset + value.byteLength,
                  ),
                );
              }
              if (Array.isArray(value)) {
                return new Buffer(value);
              }
              throw new TypeError("Unsupported Buffer.from input");
            }

            toString(encoding) {
              if (encoding === undefined || encoding === "utf8") {
                return Array.from(this)
                  .map((value) => String.fromCharCode(value))
                  .join("");
              }
              if (encoding === "base64") {
                return __encodeBase64(this);
              }
              throw new Error("QuickJS Buffer only supports utf8 and base64 output");
            }
          };

          globalThis.performance ??= {
            now: () => Date.now() - __performanceOrigin,
            timeOrigin: __performanceOrigin,
          };
          globalThis.global = globalThis;
        `,
        {
          filename: "quickjs-runtime.js"
        }
      );
      const bundleCode = await getSandboxClientBundleCode();
      this.#throwIfAborted();
      const bundleFactorySource = JSON.stringify(`${bundleCode}
return __PlaywrightClient;`);
      this.#host.executeScriptSync(
        `
          globalThis.__createPlaywrightClient = () => {
            return new Function(${bundleFactorySource})();
          };
        `,
        {
          filename: "sandbox-client.js"
        }
      );
      const browserEntry = this.#options.manager.getBrowser(this.#options.browserName);
      if (!browserEntry) {
        throw new Error(
          `Browser "${this.#options.browserName}" not found. It should have been created before script execution.`
        );
      }
      this.#hostBridge = new HostBridge({
        sendToSandbox: (json) => {
          this.#transportInbox.push(json);
        },
        preLaunchedBrowser: toServerImpl(browserEntry.browser, "Playwright browser"),
        sharedBrowser: true,
        denyLaunch: true
      });
      this.#throwIfAborted();
      await this.#host.executeScript(
        `
          (() => {
            const hostCall = globalThis.__hostCall;
            const transportSend = globalThis.__transport_send;
            const createPlaywrightClient = globalThis.__createPlaywrightClient;

            if (typeof hostCall !== "function") {
              throw new Error("Sandbox bridge did not expose a host-call function");
            }
            if (typeof transportSend !== "function") {
              throw new Error("Sandbox bridge did not expose a transport sender");
            }
            if (typeof createPlaywrightClient !== "function") {
              throw new Error("Sandbox client bundle did not expose a Playwright client factory");
            }

            if (!delete globalThis.__hostCall) {
              globalThis.__hostCall = undefined;
            }
            if (!delete globalThis.__transport_send) {
              globalThis.__transport_send = undefined;
            }
            if (!delete globalThis.__createPlaywrightClient) {
              globalThis.__createPlaywrightClient = undefined;
            }

            const playwrightClient = createPlaywrightClient();
            const connection = new playwrightClient.Connection(playwrightClient.quickjsPlatform);
            connection.onmessage = (message) => {
              transportSend(JSON.stringify(message));
            };

            Object.defineProperty(globalThis, "${TRANSPORT_RECEIVE_GLOBAL}", {
              value: (json) => {
                connection.dispatch(JSON.parse(json));
              },
              configurable: false,
              enumerable: false,
              writable: false,
            });

            const waitForConnectionObject = async (guid, label) => {
              if (typeof guid !== "string" || guid.length === 0) {
                throw new Error(\`\${label} did not return a valid guid\`);
              }

              for (let attempt = 0; attempt < ${WAIT_FOR_OBJECT_ATTEMPTS}; attempt += 1) {
                const object = connection.getObjectWithKnownName(guid);
                if (object) {
                  return object;
                }
                await new Promise((resolve) => setTimeout(resolve, 0));
              }

              throw new Error(\`Timed out waiting for \${label} (\${guid}) in the sandbox\`);
            };

            const encodeHostFilePayload = (value) => {
              if (typeof value === "string") {
                return { encoding: "utf8", data: value };
              }
              if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
                return { encoding: "base64", data: Buffer.from(value).toString("base64") };
              }
              throw new TypeError(
                "File data must be a string, Buffer, Uint8Array, or ArrayBuffer",
              );
            };

            return (async () => {
              await connection.initializePlaywright();

              const browserApi = Object.create(null);
              Object.defineProperties(browserApi, {
                getPage: {
                  value: async (name) => {
                    const guid = await hostCall("getPage", JSON.stringify([name]));
                    return await waitForConnectionObject(guid, \`page "\${name}"\`);
                  },
                  enumerable: true,
                },
                newPage: {
                  value: async () => {
                    const guid = await hostCall("newPage", JSON.stringify([]));
                    return await waitForConnectionObject(guid, "anonymous page");
                  },
                  enumerable: true,
                },
                listPages: {
                  value: async () => {
                    return await hostCall("listPages", JSON.stringify([]));
                  },
                  enumerable: true,
                },
                closePage: {
                  value: async (name) => {
                    await hostCall("closePage", JSON.stringify([name]));
                  },
                  enumerable: true,
                },
              });
              Object.freeze(browserApi);

              Object.defineProperty(globalThis, "browser", {
                value: browserApi,
                configurable: false,
                enumerable: true,
                writable: false,
              });

              Object.defineProperties(globalThis, {
                saveScreenshot: {
                  value: async (buffer, name) => {
                    return await hostCall(
                      "saveScreenshot",
                      JSON.stringify([name, encodeHostFilePayload(buffer)]),
                    );
                  },
                  configurable: false,
                  enumerable: true,
                  writable: false,
                },
                writeFile: {
                  value: async (name, data) => {
                    return await hostCall(
                      "writeFile",
                      JSON.stringify([name, encodeHostFilePayload(data)]),
                    );
                  },
                  configurable: false,
                  enumerable: true,
                  writable: false,
                },
                readFile: {
                  value: async (name) => {
                    return await hostCall("readFile", JSON.stringify([name]));
                  },
                  configurable: false,
                  enumerable: true,
                  writable: false,
                },
              });
            })();
          })()
        `,
        {
          filename: "sandbox-init.js"
        }
      );
      this.#throwIfAborted();
      await this.#flushTransportQueue();
      this.#throwIfAborted();
      this.#throwIfAsyncError();
      this.#initialized = true;
    } catch (error) {
      await this.dispose();
      throw error;
    }
  }
  async executeScript(script) {
    this.#assertInitialized();
    this.#throwIfAborted();
    let executionError;
    try {
      this.#throwIfAsyncError();
      await this.#host.executeScript(
        wrapScriptWithWallClockTimeout(script, this.#options.timeoutMs),
        {
          filename: "user-script.js"
        }
      );
      this.#throwIfAborted();
      await this.#flushTransportQueue();
      this.#throwIfAsyncError();
    } catch (error) {
      executionError = error;
    }
    try {
      await this.#cleanupAnonymousPages();
    } catch (error) {
      executionError ??= error;
    }
    if (executionError) {
      throw executionError;
    }
  }
  async dispose() {
    if (this.#disposed) {
      return;
    }
    try {
      await this.stopPendingOperations(new Error("QuickJS sandbox disposed"));
    } catch {
    }
    this.#disposed = true;
    await this.#cleanupAnonymousPages({
      suppressErrors: true
    });
    this.#transportInbox.length = 0;
    this.#pendingHostOperations.clear();
    try {
      await this.#hostBridge?.dispose();
    } catch {
    } finally {
      this.#hostBridge = void 0;
      this.#host?.dispose();
      this.#host = void 0;
      this.#flushPromise = void 0;
    }
  }
  async abort(error) {
    if (!this.#abortError) {
      this.#abortError = error;
      this.#resolveAbortWakeup();
    }
    await this.stopPendingOperations(this.#abortError);
  }
  async stopPendingOperations(error) {
    await this.#hostBridge?.stopPendingOperations(error);
  }
  #routeConsole(level, args) {
    const line = `${formatArgs(args)}
`;
    if (level === "warn" || level === "error") {
      this.#options.onStderr(line);
      return;
    }
    this.#options.onStdout(line);
  }
  #handleTransportSend(message) {
    if (!this.#hostBridge) {
      this.#asyncError ??= new Error("Sandbox transport is not initialized");
      return;
    }
    const operation = this.#hostBridge.receiveFromSandbox(message).catch((error) => {
      this.#asyncError ??= normalizeError(error);
    }).finally(() => {
      this.#pendingHostOperations.delete(operation);
    });
    this.#pendingHostOperations.add(operation);
  }
  async #drainAsyncOps() {
    this.#throwIfAborted();
    this.#throwIfAsyncError();
    await this.#flushTransportQueue();
    this.#throwIfAborted();
    this.#throwIfAsyncError();
    if (this.#pendingHostOperations.size === 0) {
      return;
    }
    await Promise.race([Promise.race(this.#pendingHostOperations), this.#abortWakeup]);
    this.#throwIfAborted();
    this.#throwIfAsyncError();
    await this.#flushTransportQueue();
    this.#throwIfAborted();
    this.#throwIfAsyncError();
  }
  async #flushTransportQueue() {
    this.#throwIfAsyncError();
    if (!this.#host || this.#transportInbox.length === 0) {
      return;
    }
    if (this.#flushPromise) {
      await this.#flushPromise;
      return;
    }
    const flush = async () => {
      while (this.#transportInbox.length > 0) {
        const message = this.#transportInbox.shift();
        if (message === void 0) {
          continue;
        }
        await this.#host.callFunction(TRANSPORT_RECEIVE_GLOBAL, message);
        this.#throwIfAsyncError();
      }
    };
    this.#flushPromise = flush().finally(() => {
      this.#flushPromise = void 0;
    });
    await this.#flushPromise;
  }
  async #getPage(name) {
    const page = await this.#options.manager.getPage(
      this.#options.browserName,
      requireString(name, "Page name or targetId")
    );
    return extractGuid(page);
  }
  async #newPage() {
    const page = await this.#options.manager.newPage(this.#options.browserName);
    this.#anonymousPages.add(page);
    page.on("close", () => {
      this.#anonymousPages.delete(page);
    });
    return extractGuid(page);
  }
  async #closePage(name) {
    await this.#options.manager.closePage(
      this.#options.browserName,
      requireString(name, "Page name")
    );
  }
  async #writeTempFile(name, payload) {
    return await writeDevBrowserTempFile(
      requireString(name, "File name"),
      decodeSandboxFilePayload(payload, "File data")
    );
  }
  async #readTempFile(name) {
    return await readDevBrowserTempFile(requireString(name, "File name"));
  }
  async #cleanupAnonymousPages(options = {}) {
    const anonymousPages = [...this.#anonymousPages];
    this.#anonymousPages.clear();
    for (const page of anonymousPages) {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch (error) {
        if (!options.suppressErrors) {
          throw error;
        }
      }
    }
    if (options.suppressErrors) {
      try {
        await this.#flushTransportQueue();
      } catch {
      }
      return;
    }
    await this.#flushTransportQueue();
    this.#throwIfAsyncError();
  }
  #throwIfAsyncError() {
    if (this.#asyncError) {
      throw this.#asyncError;
    }
  }
  #throwIfAborted() {
    if (this.#abortError) {
      throw this.#abortError;
    }
  }
  #assertAlive() {
    if (this.#disposed) {
      throw new Error("QuickJS sandbox has been disposed");
    }
  }
  #assertInitialized() {
    this.#assertAlive();
    if (!this.#initialized || !this.#host || !this.#hostBridge) {
      throw new Error("QuickJS sandbox has not been initialized");
    }
  }
};

// src/sandbox/script-runner-quickjs.ts
async function finalizeSandbox(sandbox, abortPromise) {
  let finalizationError;
  try {
    await abortPromise;
  } catch (error) {
    finalizationError = error;
  }
  try {
    await sandbox.dispose();
  } catch (error) {
    finalizationError ??= error;
  }
  if (finalizationError instanceof Error) {
    throw finalizationError;
  }
  if (finalizationError !== void 0) {
    throw new Error(String(finalizationError));
  }
}
async function runScript(script, manager2, browserName, output, options = {}) {
  const sandbox = new QuickJSSandbox({
    manager: manager2,
    browserName,
    onStdout: output.onStdout,
    onStderr: output.onStderr,
    memoryLimitBytes: options.memoryLimitBytes,
    timeoutMs: options.timeout
  });
  let abortPromise = Promise.resolve();
  const onAbort = () => {
    const reason = options.signal?.reason instanceof Error ? options.signal.reason : new Error(String(options.signal?.reason ?? "Script aborted"));
    abortPromise = sandbox.abort(reason);
  };
  options.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    if (options.signal?.aborted) {
      onAbort();
      throw options.signal.reason;
    }
    await sandbox.initialize();
    await sandbox.executeScript(`(async () => {
${script}
})()`);
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    await finalizeSandbox(sandbox, abortPromise);
  }
}

// src/daemon.ts
var BASE_DIR = getDevBrowserBaseDir();
var SOCKET_PATH = getDaemonEndpoint();
var PID_PATH = getPidPath();
var BROWSERS_DIR = getBrowsersDir();
var DEFAULT_SCRIPT_TIMEOUT_MS = 3e4;
var SOCKET_CLOSE_TIMEOUT_MS = 500;
var MAX_FRAME_CHARS = 10 * 1024 * 1024;
var EMBEDDED_PACKAGE_JSON = JSON.stringify({
  name: "dev-browser-runtime",
  private: true,
  type: "module",
  dependencies: {
    playwright: "1.58.2",
    "playwright-core": "1.58.2",
    "quickjs-emscripten": "^0.32.0"
  }
});
if (process.env.PW_CHROMIUM_ATTACH_TO_OTHER === void 0) {
  process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";
}
var manager = new BrowserManager(BROWSERS_DIR);
var startedAt = Date.now();
var withBrowserLock = createKeyedLock();
var withInstallLock = createMutex();
var clients = /* @__PURE__ */ new Set();
var idleReaper = new IdleBrowserReaper({
  listBrowsers: () => manager.listBrowsers(),
  stopBrowser: (name) => manager.stopBrowser(name),
  withBrowserLock
});
var server = null;
var shuttingDown = null;
var ownsEndpoint = false;
async function writeMessage(socket, message) {
  if (socket.destroyed) {
    return;
  }
  await new Promise((resolve, reject) => {
    const payload = serialize(message);
    socket.write(payload, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
async function unlinkIfExists(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
async function closeServerInstance(serverToClose) {
  await new Promise((resolve) => {
    serverToClose.close(() => {
      resolve();
    });
  });
}
async function closeClientSocket(socket) {
  if (socket.destroyed) {
    return;
  }
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (!socket.destroyed) {
        socket.destroy();
      }
    }, SOCKET_CLOSE_TIMEOUT_MS);
    timeout.unref();
    const finish = () => {
      clearTimeout(timeout);
      resolve();
    };
    socket.once("close", finish);
    socket.once("error", finish);
    socket.end();
  });
}
function createMessageQueue(socket) {
  let queue = Promise.resolve();
  return {
    push(message) {
      queue = queue.then(() => writeMessage(socket, message)).catch(() => void 0);
      return queue;
    },
    async drain() {
      await queue;
    }
  };
}
async function handleExecute(socket, request) {
  idleReaper.requestStarted(request.browser);
  try {
    await executeRequest(
      request,
      request.timeoutMs ?? DEFAULT_SCRIPT_TIMEOUT_MS,
      {
        isOpen: () => !socket.destroyed && socket.writable && !socket.writableEnded,
        onDisconnect: (listener) => {
          const onDisconnect = () => listener();
          socket.once("close", onDisconnect);
          socket.once("error", onDisconnect);
          return () => {
            socket.off("close", onDisconnect);
            socket.off("error", onDisconnect);
          };
        },
        send: (message) => writeMessage(socket, message)
      },
      {
        withBrowserLock,
        prepareBrowser: async (currentRequest, context) => {
          const operation = { deadline: context.deadline, signal: context.signal };
          if (currentRequest.connect === "auto") {
            await manager.autoConnect(currentRequest.browser, operation);
          } else if (currentRequest.connect) {
            await manager.connectBrowser(currentRequest.browser, currentRequest.connect, operation);
          } else {
            await manager.ensureBrowser(currentRequest.browser, {
              headless: currentRequest.headless,
              ignoreHTTPSErrors: currentRequest.ignoreHTTPSErrors,
              ...operation
            });
          }
        },
        runScript: async (currentRequest, output, context) => {
          await runScript(currentRequest.script, manager, currentRequest.browser, output, {
            signal: context.signal,
            timeout: Math.max(1, context.deadline - Date.now())
          });
        }
      }
    );
  } finally {
    idleReaper.requestFinished(request.browser);
  }
}
async function handleInstall(socket, request) {
  await withInstallLock(async () => {
    const output = createMessageQueue(socket);
    try {
      await mkdir3(BASE_DIR, { recursive: true });
      await writeFile(path5.join(BASE_DIR, "package.json"), EMBEDDED_PACKAGE_JSON);
      const npmProgram = process.platform === "win32" ? "npm.cmd" : "npm";
      await runInstallCommand(output, request.id, npmProgram, ["install"], BASE_DIR, "npm install");
      await runInstallCommand(
        output,
        request.id,
        npmProgram,
        ["exec", "--", "playwright", "install", "chromium"],
        BASE_DIR,
        "Playwright install"
      );
      await writeMessage(socket, {
        id: request.id,
        type: "complete",
        success: true
      });
    } catch (error) {
      await output.drain().catch(() => void 0);
      await writeMessage(socket, {
        id: request.id,
        type: "error",
        message: formatError(error)
      });
    }
  });
}
async function runInstallCommand(output, requestId, program, args, cwd, label) {
  const child = spawn(program, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (data) => {
    void output.push({
      id: requestId,
      type: "stdout",
      data
    });
  });
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (data) => {
    void output.push({
      id: requestId,
      type: "stderr",
      data
    });
  });
  const result = await new Promise(
    (resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => {
        resolve({ code, signal });
      });
    }
  );
  await output.drain();
  if (result.code === 0) {
    return;
  }
  const reason = result.signal !== null ? `${label} terminated by signal ${result.signal}` : `${label} failed with exit code ${result.code ?? "unknown"}`;
  throw new Error(reason);
}
async function handleRequest(socket, line) {
  const parsed = parseRequest(line);
  if (!parsed.success) {
    await writeMessage(socket, {
      id: parsed.id ?? "unknown",
      type: "error",
      message: parsed.error
    });
    return;
  }
  const { request } = parsed;
  if (request.idleTimeoutMs !== void 0) {
    idleReaper.configure(request.idleTimeoutMs);
  }
  if (shuttingDown && request.type !== "stop") {
    await writeMessage(socket, {
      id: request.id,
      type: "error",
      message: "Daemon is shutting down"
    });
    return;
  }
  switch (request.type) {
    case "execute":
      await handleExecute(socket, request);
      return;
    case "browsers":
      const browsers = manager.listBrowsers();
      await writeMessage(socket, {
        id: request.id,
        type: "result",
        data: browsers.map((browser) => ({ ...browser, ...idleReaper.idleInfo(browser) }))
      });
      await writeMessage(socket, {
        id: request.id,
        type: "complete",
        success: true
      });
      return;
    case "browser-stop":
      await withBrowserLock(request.browser, () => manager.stopBrowser(request.browser));
      idleReaper.browserStopped(request.browser);
      await writeMessage(socket, {
        id: request.id,
        type: "result",
        data: { browser: request.browser, stopped: true }
      });
      await writeMessage(socket, {
        id: request.id,
        type: "complete",
        success: true
      });
      return;
    case "status":
      const statusBrowsers = manager.listBrowsers();
      await writeMessage(socket, {
        id: request.id,
        type: "result",
        data: {
          pid: process.pid,
          uptimeMs: Date.now() - startedAt,
          browserCount: manager.browserCount(),
          browsers: statusBrowsers.map((browser) => ({
            ...browser,
            ...idleReaper.idleInfo(browser)
          })),
          socketPath: SOCKET_PATH,
          idleTimeoutMs: idleReaper.idleTimeoutMs
        }
      });
      await writeMessage(socket, {
        id: request.id,
        type: "complete",
        success: true
      });
      return;
    case "install":
      await handleInstall(socket, request);
      return;
    case "stop":
      await writeMessage(socket, {
        id: request.id,
        type: "result",
        data: { stopping: true }
      });
      await writeMessage(socket, {
        id: request.id,
        type: "complete",
        success: true
      });
      void shutdown(0);
      return;
  }
}
async function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return shuttingDown;
  }
  shuttingDown = (async () => {
    const serverToClose = server;
    server = null;
    const serverClosed = serverToClose ? closeServerInstance(serverToClose) : Promise.resolve();
    await manager.stopAll();
    idleReaper.dispose();
    await Promise.allSettled(Array.from(clients, (socket) => closeClientSocket(socket)));
    await serverClosed;
    const cleanup = [];
    if (ownsEndpoint) {
      cleanup.push(unlinkIfExists(PID_PATH));
      if (requiresDaemonEndpointCleanup()) {
        cleanup.push(unlinkIfExists(SOCKET_PATH));
      }
    }
    await Promise.allSettled(cleanup);
    clients.clear();
    process.exit(exitCode);
  })();
  return shuttingDown;
}
async function isEndpointActive(endpoint) {
  return await new Promise((resolve) => {
    const probe = net.connect(endpoint);
    const finish = (active) => {
      probe.destroy();
      resolve(active);
    };
    probe.once("connect", () => finish(true));
    probe.once("error", () => finish(false));
  });
}
function listenOnEndpoint(target) {
  return new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    target.once("error", onError);
    target.listen(SOCKET_PATH, () => {
      target.off("error", onError);
      resolve();
    });
  });
}
async function bindEndpoint(target) {
  try {
    await listenOnEndpoint(target);
    return;
  } catch (error) {
    const code = error.code;
    if (code !== "EADDRINUSE" || !requiresDaemonEndpointCleanup()) {
      throw error;
    }
  }
  if (await isEndpointActive(SOCKET_PATH)) {
    process.stderr.write("daemon already running\n");
    process.exit(0);
  }
  await unlinkIfExists(SOCKET_PATH);
  await listenOnEndpoint(target);
}
async function start() {
  await mkdir3(BASE_DIR, { recursive: true });
  await ensureDevBrowserTempDir();
  server = net.createServer((socket) => {
    if (shuttingDown) {
      socket.end();
      return;
    }
    clients.add(socket);
    socket.setEncoding("utf8");
    let buffer = "";
    let queue = Promise.resolve();
    socket.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      if (buffer.length > MAX_FRAME_CHARS || lines.some((line) => line.length > MAX_FRAME_CHARS)) {
        socket.pause();
        buffer = "";
        void writeMessage(socket, {
          id: "unknown",
          type: "error",
          message: `Request exceeds the maximum frame size of ${MAX_FRAME_CHARS} characters`
        }).catch(() => void 0).finally(() => {
          socket.destroy();
        });
        return;
      }
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          continue;
        }
        queue = queue.then(() => handleRequest(socket, line)).catch(async (error) => {
          console.error("Request handling error:", error);
          if (!socket.destroyed) {
            await writeMessage(socket, {
              id: "unknown",
              type: "error",
              message: formatError(error)
            });
          }
        });
      }
    });
    socket.on("close", () => {
      clients.delete(socket);
    });
    socket.on("error", () => {
      clients.delete(socket);
    });
  });
  await bindEndpoint(server);
  server.on("error", (error) => {
    console.error("Daemon server error:", error);
    void shutdown(1);
  });
  ownsEndpoint = true;
  await writeFile(PID_PATH, `${process.pid}
`);
  process.stderr.write("daemon ready\n");
}
function registerShutdownHandlers() {
  const handleSignal = () => {
    void shutdown(0);
  };
  const handleFatalError = (error) => {
    console.error("Fatal daemon error:", error);
    void shutdown(1);
  };
  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);
  process.on("SIGHUP", handleSignal);
  process.on("uncaughtException", handleFatalError);
  process.on("unhandledRejection", handleFatalError);
}
registerShutdownHandlers();
start().catch((error) => {
  console.error("Failed to start daemon:", error);
  void shutdown(1);
});
