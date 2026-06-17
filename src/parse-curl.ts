import { tokenize } from "./tokenize.js";

export interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  query: Record<string, string>;
}

// Expand attached short-flag values (`-XPOST`, `-d{...}`, `-H'A: b'`, `-uuser:pass`)
// into separate flag + value tokens so the main loop sees them uniformly.
function expandShortFlags(tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    const m = /^-([XHdAu])(.+)$/.exec(t);
    if (m) out.push("-" + m[1], m[2]);
    else out.push(t);
  }
  return out;
}

// `--data-urlencode` encodes the value (after `=` if a `name=value` form is given).
function urlencodePart(s: string): string {
  const eq = s.indexOf("=");
  if (eq > -1) return s.slice(0, eq + 1) + encodeURIComponent(s.slice(eq + 1));
  return encodeURIComponent(s);
}

export function parseCurl(command: string): ParsedCurl {
  const tokens = expandShortFlags(tokenize(command.trim()));
  if (tokens[0] === "curl") tokens.shift();

  const headers: Record<string, string> = {};
  let method = "";
  let url = "";
  const dataParts: string[] = [];   // -d/--data/--data-raw/--data-urlencode/--json (joined by &)
  let binaryBody: string | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = () => tokens[++i];
    if (t === "-X" || t === "--request") method = next().toUpperCase();
    else if (t === "-H" || t === "--header") {
      const h = next();
      const idx = h.indexOf(":");
      if (idx > -1) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (t === "-d" || t === "--data" || t === "--data-raw") {
      dataParts.push(next());
    } else if (t === "--data-urlencode") {
      dataParts.push(urlencodePart(next()));
    } else if (t === "--data-binary") {
      binaryBody = next();
    } else if (t === "--json") {
      dataParts.push(next());
      headers["Content-Type"] ??= "application/json";
      headers["Accept"] ??= "application/json";
    } else if (t === "-u" || t === "--user") {
      headers["Authorization"] = "Basic " + Buffer.from(next()).toString("base64");
    } else if (t === "-A" || t === "--user-agent") {
      headers["User-Agent"] = next();
    } else if (t.startsWith("-")) {
      // skip boolean flags like -s, -L, --compressed
    } else if (!url) {
      url = t;
    }
  }

  // curl concatenates multiple data flags with `&`; --data-binary is sent verbatim.
  const body = dataParts.length ? dataParts.join("&") : binaryBody;

  if (!method) method = body !== undefined ? "POST" : "GET";

  // split query string out of the URL
  const query: Record<string, string> = {};
  let cleanUrl = url;
  const q = url.indexOf("?");
  if (q > -1) {
    cleanUrl = url.slice(0, q);
    for (const pair of url.slice(q + 1).split("&")) {
      if (!pair) continue;
      const [k, v = ""] = pair.split("=");
      query[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }

  return { method, url: cleanUrl, headers, body, query };
}
