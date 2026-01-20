export function normalizeRelations(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeRelations);

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const match = /^__([a-zA-Z0-9_]+)__$/.exec(k);
    const key = match ? match[1] : k;
    out[key] = normalizeRelations(v);
  }
  return out;
}
