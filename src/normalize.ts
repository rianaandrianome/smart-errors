import type { NormalizedError, NormalizeOptions } from "./types";

export function normalizeErrors(
  error: unknown,
  options: NormalizeOptions = {}
): NormalizedError {
  const mapped = options.map?.(error);

  return {
    message: mapped?.message ?? options.fallbackMessage ?? null,
    code: mapped?.code ?? null,
    status: mapped?.status ?? null,
    fields: mapped?.fields ?? {},
    global: mapped?.global ?? [],
    raw: mapped?.raw ?? error,
  };
}
