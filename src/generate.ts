import { parseCurl } from "./parse-curl.js";
import { inferTypes } from "./infer-types.js";

export interface GenerateOptions {
  functionName?: string;
  sampleResponse?: unknown;     // a sample JSON body to infer the return type
}

export function generateClient(curlCommand: string, opts: GenerateOptions = {}): string {
  const p = parseCurl(curlCommand);
  const fn = opts.functionName ?? "request";
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
