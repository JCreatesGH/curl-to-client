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

  it("generates a Python requests client", () => {
    const code = generateClient(
      `curl -X POST 'https://api.x.com/users?team=eng' -H 'Authorization: Bearer t' -d '{"name":"Ada"}'`,
      { functionName: "create_user", target: "python" }
    );
    expect(code).toContain("import requests");
    expect(code).toContain("def create_user():");
    expect(code).toContain("requests.post(url, params=params, headers=headers, data=data)");
    expect(code).toContain('params = {"team":"eng"}');
    expect(code).toContain("resp.raise_for_status()");
    expect(code).toContain("return resp.json()");
  });

  it("uses requests.request() for non-standard methods", () => {
    const code = generateClient("curl -X PURGE https://x.com/cache", { target: "python" });
    expect(code).toContain('requests.request("PURGE", url)');
  });
});
