import { describe, it, expect } from "vitest";
import { run } from "./cli";

const CURL = `curl -X POST 'https://api.x.com/users' -H 'Authorization: Bearer t' -d '{"name":"Ada"}'`;

describe("cli", () => {
  it("shows help with --help (exit 0)", () => {
    expect(run(["--help"]).code).toBe(0);
    expect(run(["--help"]).output).toContain("Usage:");
  });

  it("shows help and exits 1 with no command", () => {
    expect(run([]).code).toBe(1);
  });

  it("generates fetch by default", () => {
    const r = run([CURL]);
    expect(r.code).toBe(0);
    expect(r.output).toContain("export async function request()");
    expect(r.output).toContain('method: "POST"');
  });

  it("honors --target go and --name", () => {
    const r = run([CURL, "--target", "go", "--name", "createUser"]);
    expect(r.code).toBe(0);
    expect(r.output).toContain("func CreateUser() ([]byte, error) {");
  });

  it("reads the command from stdin when no positional is given", () => {
    const r = run(["--target", "python"], CURL);
    expect(r.code).toBe(0);
    expect(r.output).toContain("import requests");
  });

  it("infers a typed return from --sample", () => {
    const r = run([CURL, "--sample", '{"id":1,"name":"Ada"}']);
    expect(r.code).toBe(0);
    expect(r.output).toContain("export interface Response {");
    expect(r.output).toContain("Promise<Response>");
  });

  it("rejects an unknown target (exit 2)", () => {
    const r = run([CURL, "--target", "ruby"]);
    expect(r.code).toBe(2);
    expect(r.output).toContain("unknown target");
  });

  it("rejects invalid --sample JSON (exit 2)", () => {
    const r = run([CURL, "--sample", "{not json}"]);
    expect(r.code).toBe(2);
    expect(r.output).toContain("valid JSON");
  });
});
