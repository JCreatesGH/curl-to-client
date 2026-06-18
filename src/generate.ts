import { parseCurl, ParsedCurl } from "./parse-curl.js";
import { inferTypes } from "./infer-types.js";

export type Target = "fetch" | "python" | "go";

export interface GenerateOptions {
  functionName?: string;
  sampleResponse?: unknown;     // a sample JSON body to infer the return type
  target?: Target;              // output language (default "fetch")
}

export function generateClient(curlCommand: string, opts: GenerateOptions = {}): string {
  const p = parseCurl(curlCommand);
  const fn = opts.functionName ?? "request";
  if (opts.target === "python") return generatePython(p, fn);
  if (opts.target === "go") return generateGo(p, fn);
  const returnType = opts.sampleResponse !== undefined ? "Response" : "unknown";
  const typeDefs = opts.sampleResponse !== undefined
    ? inferTypes(opts.sampleResponse, "Response") + "\n\n"
    : "";

  const headerLines = Object.entries(p.headers)
    .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n");

  const hasBody = p.body !== undefined;
  const init = [
    `  const res = await fetch(url.toString(), {`,
    `    method: ${JSON.stringify(p.method)},`,
    headerLines ? `    headers: {\n${headerLines}\n    },` : "",
    hasBody ? `    body: ${JSON.stringify(p.body)},` : "",
    `  });`,
  ].filter(Boolean).join("\n");

  const queryLines = Object.entries(p.query)
    .map(([k, v]) => `  url.searchParams.set(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join("\n");

  return `${typeDefs}export async function ${fn}(): Promise<${returnType}> {
  const url = new URL(${JSON.stringify(p.url)});
${queryLines ? queryLines + "\n" : ""}${init}
  if (!res.ok) throw new Error(\`\${res.status} \${res.statusText}\`);
  return res.json() as Promise<${returnType}>;
}
`;
}

const PY_METHODS = new Set(["get", "post", "put", "delete", "patch", "head", "options"]);

function generatePython(p: ParsedCurl, fn: string): string {
  const out: string[] = ["import requests", "", "", `def ${fn}():`];
  out.push(`    url = ${JSON.stringify(p.url)}`);
  const args = ["url"];
  if (Object.keys(p.query).length) { out.push(`    params = ${JSON.stringify(p.query)}`); args.push("params=params"); }
  if (Object.keys(p.headers).length) { out.push(`    headers = ${JSON.stringify(p.headers)}`); args.push("headers=headers"); }
  if (p.body !== undefined) { out.push(`    data = ${JSON.stringify(p.body)}`); args.push("data=data"); }
  const m = p.method.toLowerCase();
  const call = PY_METHODS.has(m)
    ? `requests.${m}(${args.join(", ")})`
    : `requests.request(${JSON.stringify(p.method)}, ${args.join(", ")})`;
  out.push(`    resp = ${call}`);
  out.push(`    resp.raise_for_status()`);
  out.push(`    return resp.json()`);
  return out.join("\n") + "\n";
}

// Go function names are conventionally exported (capitalized).
const goName = (fn: string) => fn.charAt(0).toUpperCase() + fn.slice(1);
// JSON and Go share string-escaping rules closely enough for literals here.
const goStr = (s: string) => JSON.stringify(s);

function generateGo(p: ParsedCurl, fn: string): string {
  const hasQuery = Object.keys(p.query).length > 0;
  const hasHeaders = Object.keys(p.headers).length > 0;
  const hasBody = p.body !== undefined;

  const imports = ["io", "net/http"];
  if (hasQuery) imports.push("net/url");
  if (hasBody) imports.push("strings");
  imports.sort();

  const L: string[] = ["package main", "", "import ("];
  for (const im of imports) L.push(`\t${goStr(im)}`);
  L.push(")", "", `func ${goName(fn)}() ([]byte, error) {`);

  let urlExpr = goStr(p.url);
  if (hasQuery) {
    L.push(`\tu, err := url.Parse(${goStr(p.url)})`, `\tif err != nil {`, `\t\treturn nil, err`, `\t}`);
    L.push(`\tq := u.Query()`);
    for (const [k, v] of Object.entries(p.query)) L.push(`\tq.Set(${goStr(k)}, ${goStr(v)})`);
    L.push(`\tu.RawQuery = q.Encode()`);
    urlExpr = "u.String()";
  }

  const bodyArg = hasBody ? `strings.NewReader(${goStr(p.body!)})` : "nil";
  L.push(`\treq, err := http.NewRequest(${goStr(p.method)}, ${urlExpr}, ${bodyArg})`,
    `\tif err != nil {`, `\t\treturn nil, err`, `\t}`);
  if (hasHeaders) {
    for (const [k, v] of Object.entries(p.headers)) L.push(`\treq.Header.Set(${goStr(k)}, ${goStr(v)})`);
  }
  L.push(`\tresp, err := http.DefaultClient.Do(req)`, `\tif err != nil {`, `\t\treturn nil, err`, `\t}`,
    `\tdefer resp.Body.Close()`, `\treturn io.ReadAll(resp.Body)`, "}");
  return L.join("\n") + "\n";
}
