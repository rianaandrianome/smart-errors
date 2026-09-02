export type NormalizedError = {
  message: string | null;
  code: string | null;
  status: number | null;
  fields: Record<string, string>;
  global: string[];
  raw: unknown;
};

export type PartialNormalizedError = Partial<
  Omit<NormalizedError, "raw">
> & {
  raw?: unknown;
};

export type ErrorMapper = (
  error: unknown
) => PartialNormalizedError | null | undefined;

export type NormalizeOptions = {
  map?: ErrorMapper;
  fallbackMessage?: string;
};
