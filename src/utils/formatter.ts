type JsonField = Record<string, string | undefined>;

interface MapperOptions {
  fields: {
    [key: string]: keyof JsonField; // e.g., name_en -> 'en'
  };
}

export function mapJsonFields(jsonField: JsonField, options: MapperOptions) {
  const result: Record<string, string | null> = {};
  for (const [apiKey, jsonKey] of Object.entries(options.fields)) {
    result[apiKey] = jsonField?.[jsonKey] ?? null;
  }
  return result;
}
