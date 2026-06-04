import { tokenize } from "./tokenize.js";

export interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  query: Record<string, string>;
}

export function parseCurl(command: string): ParsedCurl {
  const tokens = tokenize(command.trim());
  if (tokens[0] === "curl") tokens.shift();

  const headers: Record<string, string> = {};
  let method = "";
  let url = "";
  let body: string | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = () => tokens[++i];
    if (t === "-X" || t === "--request") method = next().toUpperCase();
    else if (t === "-H" || t === "--header") {
      const h = next();
      const idx = h.indexOf(":");
      if (idx > -1) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary") {
      body = next();
    } else if (t === "-u" || t === "--user") {
      headers["Authorization"] = "Basic " + Buffer.from(next()).toString("base64");
    } else if (t === "-A" || t === "--user-agent") {
      headers["User-Agent"] = next();
    } else if (t.startsWith("-")) {
      // skip flags like -s, -L, --compressed (and their value if it looks attached)
    } else if (!url) {
      url = t;
    }
  }

  if (!method) method = body ? "POST" : "GET";

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
