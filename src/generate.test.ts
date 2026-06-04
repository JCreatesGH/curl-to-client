import { describe, it, expect } from "vitest";
import { generateClient } from "./generate";

describe("generateClient", () => {
  it("emits a typed fetch wrapper from curl + sample", () => {
    const code = generateClient(
      `curl -X POST https://api.x.com/users -H 'Authorization: Bearer t' -d '{"name":"Ada"}'`,
      { functionName: "createUser", sampleResponse: { id: 1, name: "Ada" } }
    );
    expect(code).toContain("export interface Response {");
    expect(code).toContain("export async function createUser(): Promise<Response>");
    expect(code).toContain('method: "POST"');
    expect(code).toContain('"Authorization": "Bearer t"');
    expect(code).toContain("body:");
    expect(code).toContain("res.json()");
  });

  it("sets query params and falls back to unknown without a sample", () => {
    const code = generateClient("curl 'https://x.com/s?q=hi'");
    expect(code).toContain('url.searchParams.set("q", "hi")');
    expect(code).toContain("Promise<unknown>");
  });
});
