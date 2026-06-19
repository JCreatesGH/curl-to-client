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

  it("generates a Go net/http client", () => {
    const code = generateClient(
      `curl -X POST 'https://api.x.com/users?team=eng' -H 'Authorization: Bearer t' -d '{"name":"Ada"}'`,
      { functionName: "createUser", target: "go" }
    );
    expect(code).toContain("package main");
    expect(code).toContain('"net/url"');        // query -> net/url imported
    expect(code).toContain('"strings"');         // body -> strings imported
    expect(code).toContain("func CreateUser() ([]byte, error) {");  // exported name
    expect(code).toContain('http.NewRequest("POST", u.String(), strings.NewReader("{\\"name\\":\\"Ada\\"}"))');
    expect(code).toContain('q.Set("team", "eng")');
    expect(code).toContain('req.Header.Set("Authorization", "Bearer t")');
    expect(code).toContain("io.ReadAll(resp.Body)");
  });

  it("omits net/url and strings imports for a bare GET", () => {
    const code = generateClient("curl https://x.com/health", { target: "go" });
    expect(code).not.toContain('"net/url"');
    expect(code).not.toContain('"strings"');
    expect(code).toContain('http.NewRequest("GET", "https://x.com/health", nil)');
  });

  it("generates a Rust reqwest client", () => {
    const code = generateClient(
      `curl -X POST 'https://api.x.com/users?team=eng' -H 'Authorization: Bearer t' -d '{"name":"Ada"}'`,
      { functionName: "createUser", target: "rust" }
    );
    expect(code).toContain('features = ["blocking", "json"]');
    expect(code).toContain("pub fn create_user() -> Result<String, Box<dyn Error>> {");  // snake_case
    expect(code).toContain('let client = reqwest::blocking::Client::new();');
    expect(code).toContain('let resp = client.post("https://api.x.com/users")');
    expect(code).toContain('.query(&[("team", "eng")])');
    expect(code).toContain('.header("Authorization", "Bearer t")');
    expect(code).toContain('.body("{\\"name\\":\\"Ada\\"}")');
    expect(code).toContain(".send()?");
    expect(code).toContain(".error_for_status()?;");
    expect(code).toContain("Ok(resp.text()?)");
  });

  it("uses Method::from_bytes for an uncommon Rust verb, and a bare GET chains straight to send", () => {
    expect(generateClient("curl -X PURGE https://x.com/cache", { target: "rust" }))
      .toContain('reqwest::Method::from_bytes("PURGE".as_bytes()).unwrap()');
    const get = generateClient("curl https://x.com/health", { target: "rust" });
    expect(get).toContain('client.get("https://x.com/health")');
    expect(get).not.toContain(".query(");   // no query/headers/body -> straight to send
    expect(get).not.toContain(".body(");
  });
});
