#!/usr/bin/env node
import { generateClient, Target } from "./generate.js";

const TARGETS: Target[] = ["fetch", "python", "go"];

const HELP = `curl-to-client — turn a cURL command into client code

Usage:
  curl-to-client '<curl command>' [--target fetch|python|go] [--name fn] [--sample '<json>']
  <curl command> | curl-to-client --target go

Options:
  --target NAME    output language: fetch (default), python, go
  --name NAME      name of the generated function (default: request)
  --sample JSON    a sample JSON response; infers a typed return (fetch target)
  -h, --help       show this help

Quote the whole cURL command as one argument so its own flags aren't consumed.`;

interface Parsed { help: boolean; target: string; name?: string; sample?: string; positionals: string[]; }

/** Split our own flags from the (positional) cURL command. Each flag consumes
 * its value, so a flag value is never mistaken for the command. */
function parseArgs(args: string[]): Parsed {
  const p: Parsed = { help: false, target: "fetch", positionals: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") p.help = true;
    else if (a === "--target") p.target = args[++i];
    else if (a === "--name") p.name = args[++i];
    else if (a === "--sample") p.sample = args[++i];
    else p.positionals.push(a);
  }
  return p;
}

/** Pure entry point: side-effect-free so it can be unit-tested. stdin is passed
 * in rather than read here (used only when no command is on the argv). */
export function run(args: string[], stdin = ""): { code: number; output: string } {
  const a = parseArgs(args);
  if (a.help) return { code: 0, output: HELP };

  const curl = (a.positionals.join(" ").trim() || stdin.trim());
  if (!curl) return { code: 1, output: HELP };
  if (!TARGETS.includes(a.target as Target)) {
    return { code: 2, output: `Error: unknown target '${a.target}' (choose ${TARGETS.join(", ")})` };
  }

  let sampleResponse: unknown;
  if (a.sample !== undefined) {
    try { sampleResponse = JSON.parse(a.sample); }
    catch { return { code: 2, output: "Error: --sample must be valid JSON" }; }
  }

  try {
    return { code: 0, output: generateClient(curl, { target: a.target as Target, functionName: a.name, sampleResponse }) };
  } catch (e) {
    return { code: 2, output: `Error: ${(e as Error).message}` };
  }
}

// Execute only when invoked as the CLI binary (not when imported by tests).
if (process.argv[1] && /cli\.js$/.test(process.argv[1])) {
  const argv = process.argv.slice(2);
  const finish = (stdin: string) => {
    const { code, output } = run(argv, stdin);
    (code === 0 ? console.log : console.error)(output);
    process.exit(code);
  };
  // read piped stdin only when the command wasn't supplied as an argument
  const needStdin = parseArgs(argv).positionals.length === 0 && !process.stdin.isTTY;
  if (needStdin) {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => finish(buf));
  } else {
    finish("");
  }
}
