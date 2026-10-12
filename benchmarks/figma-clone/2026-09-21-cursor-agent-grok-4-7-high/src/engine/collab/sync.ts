import * as Y from "yjs";
import type { DesignDocument, NodeId, Page, SceneNode } from "../types";

export class DocumentSync {
  readonly ydoc = new Y.Doc();
  readonly clientId: number;
  private nodes: Y.Map<string>;
  private meta: Y.Map<string>;
  private channel: BroadcastChannel | null = null;
  constructor(private onRemote: () => void) {
    this.clientId = this.ydoc.clientID;
    this.nodes = this.ydoc.getMap("nodes");
    this.meta = this.ydoc.getMap("meta");
    this.nodes.observe((_event, transaction) => {
      if (transaction.origin === "local" || transaction.origin === "seed" || transaction.origin === "remote") return;
      this.onRemote();
    });
    this.meta.observe((_event, transaction) => {
      if (transaction.origin === "local" || transaction.origin === "seed" || transaction.origin === "remote") return;
      this.onRemote();
    });
  }

  load(bytes: Uint8Array | null): DesignDocument | null {
    if (bytes) Y.applyUpdate(this.ydoc, bytes, "seed");
    return this.hydrate();
  }

  seed(doc: DesignDocument): void {
    this.ydoc.transact(() => {
      this.writeDocument(doc);
    }, "seed");
  }

  write(doc: DesignDocument): void {
    this.ydoc.transact(() => {
      this.writeDocument(doc);
    }, "local");
  }

  connect(room: string): void {
    this.destroyChannel();
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`grok47:${room}`);
    this.channel = channel;
    this.ydoc.on("update", this.onLocalUpdate);
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "update") {
        Y.applyUpdate(this.ydoc, new Uint8Array(msg.update), "remote");
        this.onRemote();
      } else if (msg.type === "sync-request" && msg.from !== this.clientId) {
        channel.postMessage({
          type: "sync",
          to: msg.from,
          update: Array.from(Y.encodeStateAsUpdate(this.ydoc)),
        });
      } else if (msg.type === "sync" && msg.to === this.clientId) {
        Y.applyUpdate(this.ydoc, new Uint8Array(msg.update), "remote");
        this.onRemote();
      } else if (msg.type === "cursor" && msg.from !== this.clientId) {
        this.cursorListeners.forEach((fn) => fn(msg));
      }
    };
    channel.postMessage({ type: "sync-request", from: this.clientId });
  }

  publishCursor(x: number, y: number): void {
    this.channel?.postMessage({ type: "cursor", from: this.clientId, x, y });
  }

  private cursorListeners = new Set<(msg: CursorMessage) => void>();

  onCursor(fn: (msg: CursorMessage) => void): () => void {
    this.cursorListeners.add(fn);
    return () => this.cursorListeners.delete(fn);
  }

  encode(): Uint8Array {
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  hydrate(): DesignDocument | null {
    const id = this.meta.get("id");
    if (!id) return null;
    const pages = parseJson<PageShell[]>(this.meta.get("pages") ?? "[]", []);
    const built: Page[] = pages.map((shell) => {
      const nodes: Record<NodeId, SceneNode> = {};
      this.nodes.forEach((json, key) => {
        if (!key.startsWith(`${shell.id}/`)) return;
        const nodeId = key.slice(shell.id.length + 1);
        nodes[nodeId] = JSON.parse(json) as SceneNode;
      });
      return {
        id: shell.id,
        name: shell.name,
        background: shell.background,
        rootId: shell.rootId,
        guides: shell.guides,
        comments: shell.comments,
        camera: shell.camera,
        nodes,
      };
    });
    if (!built.length) return null;
    return {
      id,
      name: this.meta.get("name") ?? "Untitled",
      currentPageId: this.meta.get("currentPageId") ?? built[0]!.id,
      pages: built,
      colorStyles: parseJson(this.meta.get("colorStyles") ?? "[]", []),
      textStyles: parseJson(this.meta.get("textStyles") ?? "[]", []),
    };
  }

  destroy(): void {
    this.ydoc.off("update", this.onLocalUpdate);
    this.destroyChannel();
    this.ydoc.destroy();
  }

  private onLocalUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote" || origin === "seed") return;
    this.channel?.postMessage({ type: "update", update: Array.from(update) });
  };

  private destroyChannel(): void {
    this.ydoc.off("update", this.onLocalUpdate);
    this.channel?.close();
    this.channel = null;
  }

  private writeDocument(doc: DesignDocument): void {
    this.meta.set("id", doc.id);
    this.meta.set("name", doc.name);
    this.meta.set("currentPageId", doc.currentPageId);
    this.meta.set(
      "pages",
      JSON.stringify(
        doc.pages.map((page) => ({
          id: page.id,
          name: page.name,
          background: page.background,
          rootId: page.rootId,
          guides: page.guides,
          comments: page.comments,
          camera: page.camera,
        })),
      ),
    );
    this.meta.set("colorStyles", JSON.stringify(doc.colorStyles));
    this.meta.set("textStyles", JSON.stringify(doc.textStyles));
    const keep = new Set<string>();
    for (const page of doc.pages) {
      for (const node of Object.values(page.nodes)) {
        const key = `${page.id}/${node.id}`;
        keep.add(key);
        this.nodes.set(key, JSON.stringify(node));
      }
    }
    const stale: string[] = [];
    this.nodes.forEach((_value, key) => {
      if (!keep.has(key)) stale.push(key);
    });
    for (const key of stale) this.nodes.delete(key);
  }
}

type PageShell = Omit<Page, "nodes">;

type SyncMessage =
  | { type: "update"; update: number[] }
  | { type: "sync-request"; from: number }
  | { type: "sync"; to: number; update: number[] }
  | CursorMessage;

type CursorMessage = { type: "cursor"; from: number; x: number; y: number };

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, i + size));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
