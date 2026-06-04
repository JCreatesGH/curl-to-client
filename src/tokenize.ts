// Split a shell-ish command line into tokens, honoring single/double quotes
// and line-continuation backslashes.
export function tokenize(input: string): string[] {
  const cleaned = input.replace(/\\\r?\n/g, " ");
  const tokens: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let started = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch; started = true;
    } else if (/\s/.test(ch)) {
      if (started) { tokens.push(cur); cur = ""; started = false; }
    } else {
      cur += ch; started = true;
    }
  }
  if (started) tokens.push(cur);
  return tokens;
}
