import { describe, expect, it } from "vitest";
import { Quadtree } from "./quadtree";

describe("quadtree", () => {
  it("returns only items that overlap the query", () => {
    const tree = new Quadtree({ x: 0, y: 0, width: 1000, height: 1000 }, 4, 8);
    tree.insert("a", { x: 10, y: 10, width: 20, height: 20 });
    tree.insert("b", { x: 400, y: 400, width: 30, height: 30 });
    tree.insert("c", { x: 15, y: 18, width: 10, height: 10 });
    const hit = tree.query({ x: 0, y: 0, width: 50, height: 50 });
    expect(hit.sort()).toEqual(["a", "c"]);
    expect(tree.queryPoint(410, 410)).toEqual(["b"]);
  });

  it("still finds items that span a split boundary", () => {
    const tree = new Quadtree({ x: 0, y: 0, width: 100, height: 100 }, 1, 6);
    tree.insert("wide", { x: 10, y: 40, width: 80, height: 10 });
    tree.insert("far", { x: 90, y: 90, width: 5, height: 5 });
    expect(tree.queryPoint(12, 45)).toContain("wide");
    expect(tree.queryPoint(70, 45)).toContain("wide");
    expect(tree.queryPoint(12, 45)).not.toContain("far");
  });
});
