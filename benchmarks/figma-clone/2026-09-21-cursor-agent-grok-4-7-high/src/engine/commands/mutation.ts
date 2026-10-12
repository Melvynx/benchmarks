import type {
  ColorStyle,
  Comment,
  DesignDocument,
  GeometricNode,
  Guide,
  NodeId,
  Page,
  SceneNode,
  TextStyle,
} from "../types";
import { isGeometric } from "../types";

export type NodeDiff = Record<NodeId, { before: SceneNode | null; after: SceneNode | null }>;

export type MetaDiff = {
  guides?: { before: Guide[]; after: Guide[] };
  comments?: { before: Comment[]; after: Comment[] };
  styles?: {
    before: { colors: ColorStyle[]; texts: TextStyle[] };
    after: { colors: ColorStyle[]; texts: TextStyle[] };
  };
  name?: { before: string; after: string };
  pages?: { before: Page[]; after: Page[] };
};

export class Mutation {
  readonly baseline = new Map<NodeId, SceneNode | null>();
  guidesBefore: Guide[] | null = null;
  commentsBefore: Comment[] | null = null;
  stylesBefore: { colors: ColorStyle[]; texts: TextStyle[] } | null = null;
  nameBefore: string | null = null;
  pagesBefore: Page[] | null = null;

  constructor(
    readonly doc: DesignDocument,
    readonly pageId: NodeId,
  ) {}

  page(): Page {
    const page = this.doc.pages.find((item) => item.id === this.pageId);
    if (!page) throw new Error(`Missing page ${this.pageId}`);
    return page;
  }

  remember(id: NodeId): void {
    if (this.baseline.has(id)) return;
    const node = this.page().nodes[id];
    this.baseline.set(id, node ? structuredClone(node) : null);
  }

  node(id: NodeId): SceneNode | null {
    return this.page().nodes[id] ?? null;
  }

  update(id: NodeId, fn: (node: GeometricNode) => void): void {
    const node = this.node(id);
    if (!node || !isGeometric(node)) return;
    this.remember(id);
    fn(node);
  }

  markOverride(id: NodeId, keys: string[]): void {
    const node = this.node(id);
    if (!node || !isGeometric(node) || !node.masterNodeId) return;
    const next = new Set(node.overriddenKeys);
    for (const key of keys) next.add(key);
    node.overriddenKeys = [...next];
  }

  touchGuides(): void {
    if (!this.guidesBefore) this.guidesBefore = structuredClone(this.page().guides);
  }

  touchComments(): void {
    if (!this.commentsBefore) this.commentsBefore = structuredClone(this.page().comments);
  }

  touchStyles(): void {
    if (!this.stylesBefore) {
      this.stylesBefore = {
        colors: structuredClone(this.doc.colorStyles),
        texts: structuredClone(this.doc.textStyles),
      };
    }
  }

  touchName(): void {
    if (this.nameBefore === null) this.nameBefore = this.doc.name;
  }

  touchPages(): void {
    if (!this.pagesBefore) this.pagesBefore = structuredClone(this.doc.pages);
  }

  restore(): void {
    const page = this.page();
    for (const [id, prev] of this.baseline) {
      if (prev) page.nodes[id] = structuredClone(prev);
      else delete page.nodes[id];
    }
    if (this.guidesBefore) page.guides = structuredClone(this.guidesBefore);
    if (this.commentsBefore) page.comments = structuredClone(this.commentsBefore);
    if (this.stylesBefore) {
      this.doc.colorStyles = structuredClone(this.stylesBefore.colors);
      this.doc.textStyles = structuredClone(this.stylesBefore.texts);
    }
    if (this.nameBefore !== null) this.doc.name = this.nameBefore;
    if (this.pagesBefore) this.doc.pages = structuredClone(this.pagesBefore);
  }

  nodeDiff(): NodeDiff {
    const page = this.page();
    const diff: NodeDiff = {};
    for (const [id, before] of this.baseline) {
      const current = page.nodes[id];
      diff[id] = {
        before: before ? structuredClone(before) : null,
        after: current ? structuredClone(current) : null,
      };
    }
    return diff;
  }

  metaDiff(): MetaDiff | null {
    const page = this.page();
    const meta: MetaDiff = {};
    if (this.guidesBefore) meta.guides = { before: structuredClone(this.guidesBefore), after: structuredClone(page.guides) };
    if (this.commentsBefore) {
      meta.comments = { before: structuredClone(this.commentsBefore), after: structuredClone(page.comments) };
    }
    if (this.stylesBefore) {
      meta.styles = {
        before: structuredClone(this.stylesBefore),
        after: { colors: structuredClone(this.doc.colorStyles), texts: structuredClone(this.doc.textStyles) },
      };
    }
    if (this.nameBefore !== null) meta.name = { before: this.nameBefore, after: this.doc.name };
    if (this.pagesBefore) meta.pages = { before: structuredClone(this.pagesBefore), after: structuredClone(this.doc.pages) };
    return Object.keys(meta).length ? meta : null;
  }

  isEmpty(): boolean {
    return this.baseline.size === 0 && !this.metaDiff();
  }
}

export function applyNodeDiff(page: Page, diff: NodeDiff, side: "before" | "after"): void {
  for (const [id, change] of Object.entries(diff)) {
    const node = change[side];
    if (node) page.nodes[id] = structuredClone(node);
    else delete page.nodes[id];
  }
}

export function applyMeta(doc: DesignDocument, pageId: string, meta: MetaDiff, side: "before" | "after"): void {
  const page = doc.pages.find((item) => item.id === pageId);
  if (meta.guides && page) page.guides = structuredClone(meta.guides[side]);
  if (meta.comments && page) page.comments = structuredClone(meta.comments[side]);
  if (meta.styles) {
    doc.colorStyles = structuredClone(meta.styles[side].colors);
    doc.textStyles = structuredClone(meta.styles[side].texts);
  }
  if (meta.name) doc.name = meta.name[side];
  if (meta.pages) doc.pages = structuredClone(meta.pages[side]);
}
