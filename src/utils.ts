export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function firstString(value: unknown): string | null {
  const direct = asString(value);

  if (direct !== null) {
    return direct;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstString(item);

      if (message !== null) {
        return message;
      }
    }
  }

  if (isRecord(value)) {
    return (
      firstString(value.message) ??
      firstString(value.title) ??
      firstString(value.detail) ??
      firstString(value.error)
    );
  }

  return null;
}

export function normalizeFieldMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, string>>(
    (fields, [field, messageValue]) => {
      const message = firstString(messageValue);

      if (message !== null) {
        fields[field] = message;
      }

      return fields;
    },
    {}
  );
}
