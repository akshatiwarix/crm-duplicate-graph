import { describe, expect, it } from "vitest";
import { UnionFind } from "./union-find";

describe("UnionFind", () => {
  it("returns an unseen node as its own root", () => {
    const uf = new UnionFind();
    expect(uf.find("a")).toBe("a");
  });

  it("merges two nodes under one root", () => {
    const uf = new UnionFind();
    uf.union("a", "b");
    expect(uf.find("a")).toBe(uf.find("b"));
  });

  it("is transitive: union(a,b) + union(b,c) puts a and c in the same component", () => {
    const uf = new UnionFind();
    uf.union("a", "b");
    uf.union("b", "c");
    expect(uf.find("a")).toBe(uf.find("c"));
  });

  it("keeps unrelated nodes in separate components", () => {
    const uf = new UnionFind();
    uf.union("a", "b");
    expect(uf.find("c")).not.toBe(uf.find("a"));
  });
});
