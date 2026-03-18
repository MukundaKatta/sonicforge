import { describe, it, expect } from "vitest";
import { Sonicforge } from "../src/core.js";
describe("Sonicforge", () => {
  it("init", () => { expect(new Sonicforge().getStats().ops).toBe(0); });
  it("op", async () => { const c = new Sonicforge(); await c.process(); expect(c.getStats().ops).toBe(1); });
  it("reset", async () => { const c = new Sonicforge(); await c.process(); c.reset(); expect(c.getStats().ops).toBe(0); });
});
