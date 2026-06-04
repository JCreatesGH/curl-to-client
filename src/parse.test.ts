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
});
