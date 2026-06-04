// Infer a TypeScript type from a sample JSON value, emitting named interfaces.
type Named = { name: string; body: string };

export function inferTypes(sample: unknown, rootName = "Response"): string {
  const interfaces: Named[] = [];
  const seen = new Map<string, string>();

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/[^A-Za-z0-9]/g, "");

  function typeOf(value: unknown, name: string): string {
    if (value === null) return "null";
    if (Array.isArray(value)) {
      if (value.length === 0) return "unknown[]";
      const itemName = name.endsWith("s") ? name.slice(0, -1) : name + "Item";
      return typeOf(value[0], itemName) + "[]";
    }
    if (typeof value === "object") {
      const props = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${typeOf(v, cap(k))};`)
        .join("\n");
      const body = `{\n${props}\n}`;
      const ifaceName = cap(name);
      // dedupe identical shapes
      if (!seen.has(body)) {
        seen.set(body, ifaceName);
        interfaces.push({ name: ifaceName, body });
      }
      return seen.get(body)!;
    }
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return "string";
  }

  const rootType = typeOf(sample, rootName);
  const defs = interfaces.map((i) => `export interface ${i.name} ${i.body}`).join("\n\n");
  // when root is an array/primitive, expose a type alias
  if (!interfaces.some((i) => i.name === cap(rootName))) {
    return `${defs}\n\nexport type ${cap(rootName)} = ${rootType};`.trim();
  }
  return defs;
}
