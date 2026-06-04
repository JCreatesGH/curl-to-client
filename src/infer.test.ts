import { describe, it, expect } from "vitest";
import { inferTypes } from "./infer-types";

describe("inferTypes", () => {
  it("infers a flat object", () => {
    const ts = inferTypes({ id: 1, name: "Ada", active: true }, "User");
    expect(ts).toContain("export interface User {");
    expect(ts).toContain("id: number;");
    expect(ts).toContain("name: string;");
    expect(ts).toContain("active: boolean;");
  });

  it("infers nested objects and arrays", () => {
    const ts = inferTypes({ user: { id: 1 }, tags: ["a", "b"] }, "Response");
    expect(ts).toContain("user: User;");
    expect(ts).toContain("tags: string[];");
    expect(ts).toContain("export interface User {");
  });

  it("aliases when root is an array", () => {
    const ts = inferTypes([{ id: 1 }], "List");
    expect(ts).toContain("export type List =");
    expect(ts).toContain("[]");
  });

  it("quotes non-identifier keys and handles null", () => {
    const ts = inferTypes({ "weird-key": null }, "R");
    expect(ts).toContain('"weird-key": null;');
  });
});
