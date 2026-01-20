export function buildName(name: any): { en: string; ar?: string } {
  if (!name) {
    throw new Error("name is required");
  }

  if (typeof name === "string") {
    const en = name.trim();
    if (!en) {
      throw new Error("name.en cannot be empty");
    }
    return { en };
  }

  if (typeof name === "object") {
    const en = name.en ? String(name.en).trim() : "";
    if (!en) {
      throw new Error("name.en cannot be empty");
    }

    const ar = name.ar ? String(name.ar).trim() : undefined;

    return ar ? { en, ar } : { en };
  }

  throw new Error("Invalid name format");
}

export function buildDescription(desc: any): { en?: string; ar?: string } | undefined {
  if (!desc) return undefined;

  if (typeof desc === "string") {
    const en = desc.trim();
    if (!en) return undefined;
    return { en };
  }

  if (typeof desc === "object") {
    const en = desc.en ? String(desc.en).trim() : undefined;
    const ar = desc.ar ? String(desc.ar).trim() : undefined;

    if (!en && !ar) return undefined;

    const out: { en?: string; ar?: string } = {};
    if (en) out.en = en;
    if (ar) out.ar = ar;

    return out;
  }

  return undefined;
}
