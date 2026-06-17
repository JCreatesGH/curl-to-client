import { describe, it, expect } from "vitest";
import { tokenize } from "./tokenize";
import { parseCurl } from "./parse-curl";

describe("tokenize", () => {
  it("handles quotes and line continuations", () => {
    expect(tokenize(`curl -H 'A: b c' --data "x=1" \\\n  https://x.com`))
      .toEqual(["curl", "-H", "A: b c", "--data", "x=1", "https://x.com"]);
  });
});

describe("parseCurl", () => {
  it("parses method, headers, body, url", () => {
    const p = parseCurl(`curl -X POST https://api.x.com/v1/users -H 'Content-Type: application/json' -H 'Authorization: Bearer t' -d '{"name":"Ada"}'`);
    expect(p.method).toBe("POST");
    expect(p.url).toBe("https://api.x.com/v1/users");
    expect(p.headers["Content-Type"]).toBe("application/json");
    expect(p.headers["Authorization"]).toBe("Bearer t");
    expect(p.body).toBe('{"name":"Ada"}');
  });

  it("defaults method to GET, or POST when body present", () => {
    expect(parseCurl("curl https://x.com").method).toBe("GET");
    expect(parseCurl("curl https://x.com -d a=1").method).toBe("POST");
  });

  it("splits query params and handles -u basic auth", () => {
    const p = parseCurl("curl 'https://x.com/s?q=hi&page=2' -u user:pass");
    expect(p.url).toBe("https://x.com/s");
    expect(p.query).toEqual({ q: "hi", page: "2" });
    expect(p.headers["Authorization"]).toMatch(/^Basic /);
  });

  it("handles attached short flags (-XPOST, -d'...')", () => {
    const p = parseCurl(`curl -XPOST https://x.com -d'{"a":1}'`);
    expect(p.method).toBe("POST");
    expect(p.body).toBe('{"a":1}');
  });

  it("concatenates multiple -d flags with &", () => {
    const p = parseCurl("curl https://x.com -d a=1 -d b=2");
    expect(p.body).toBe("a=1&b=2");
    expect(p.method).toBe("POST");
  });

  it("url-encodes --data-urlencode values", () => {
    const p = parseCurl("curl https://x.com --data-urlencode 'q=a b&c'");
    expect(p.body).toBe("q=a%20b%26c");
  });

  it("--json sets body and JSON content-type/accept headers", () => {
    const p = parseCurl(`curl https://x.com --json '{"a":1}'`);
    expect(p.body).toBe('{"a":1}');
    expect(p.method).toBe("POST");
    expect(p.headers["Content-Type"]).toBe("application/json");
    expect(p.headers["Accept"]).toBe("application/json");
  });
});
