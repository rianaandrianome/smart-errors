import type {
  NormalizedError,
  NormalizeOptions,
  PartialNormalizedError,
} from "./types";
import { asString, firstString, isRecord, normalizeFieldMap } from "./utils";

const GLOBAL_ERROR_KEYS = [
  "global",
  "non_field_errors",
  "nonFieldErrors",
  "base",
  "_error",
];
const FIELD_EXCLUDED_KEYS = [
  ...GLOBAL_ERROR_KEYS,
  "code",
  "error",
  "errorCode",
  "errors",
  "fields",
  "message",
  "response",
  "status",
  "statusCode",
  "violations",
];

function createNormalizedError(
  raw: unknown,
  partial: PartialNormalizedError = {},
  fallbackMessage?: string
): NormalizedError {
  return {
    message: partial.message ?? fallbackMessage ?? null,
    code: partial.code ?? null,
    status: partial.status ?? null,
    fields: partial.fields ?? {},
    global: partial.global ?? [],
    raw: partial.raw ?? raw,
  };
}

function getStatus(error: unknown): number | null {
  if (!isRecord(error)) {
    return null;
  }

  return typeof error.status === "number"
    ? error.status
    : typeof error.statusCode === "number"
      ? error.statusCode
      : null;
}

function getResponseData(error: Record<string, unknown>): unknown {
  if (isRecord(error.response)) {
    return error.response.data ?? error.response.body ?? error.response;
  }

  return error;
}

function getResponseStatus(error: Record<string, unknown>): number | null {
  if (isRecord(error.response)) {
    return getStatus(error.response);
  }

  return null;
}

function getCode(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  const nestedError = isRecord(error.error) ? error.error : null;

  return (
    asString(error.code) ??
    asString(error.errorCode) ??
    asString(nestedError?.code) ??
    asString(nestedError?.errorCode)
  );
}

function getGlobalErrors(error: unknown): string[] {
  if (!isRecord(error)) {
    return [];
  }

  const messages: string[] = [];

  for (const key of GLOBAL_ERROR_KEYS) {
    const message = firstString(error[key]);

    if (message !== null) {
      messages.push(message);
    }
  }

  return messages;
}

function getLaravelRailsFields(error: Record<string, unknown>): Record<string, string> {
  return normalizeFieldMap(error.errors);
}

function getDjangoFields(error: Record<string, unknown>): Record<string, string> {
  return Object.entries(error).reduce<Record<string, string>>(
    (fields, [key, value]) => {
      if (FIELD_EXCLUDED_KEYS.includes(key)) {
        return fields;
      }

      const message = firstString(value);

      if (message !== null) {
        fields[key] = message;
      }

      return fields;
    },
    {}
  );
}

function getSymfonyFields(error: Record<string, unknown>): Record<string, string> {
  if (!Array.isArray(error.violations)) {
    return {};
  }

  return error.violations.reduce<Record<string, string>>((fields, violation) => {
    if (!isRecord(violation)) {
      return fields;
    }

    const field = asString(violation.propertyPath);
    const message = firstString(violation.title) ?? firstString(violation.message);

    if (field !== null && message !== null) {
      fields[field] = message;
    }

    return fields;
  }, {});
}

function getGenericRestFields(error: Record<string, unknown>): Record<string, string> {
  if (isRecord(error.error)) {
    return normalizeFieldMap(error.error.fields);
  }

  return normalizeFieldMap(error.fields);
}

function getFields(error: Record<string, unknown>): Record<string, string> {
  return {
    ...getDjangoFields(error),
    ...getLaravelRailsFields(error),
    ...getGenericRestFields(error),
    ...getSymfonyFields(error),
  };
}

function normalizeBuiltIn(error: unknown): PartialNormalizedError {
  if (error instanceof Error) {
    return {
      message: asString(error.message),
    };
  }

  if (typeof error === "string") {
    return {
      message: asString(error),
    };
  }

  if (!isRecord(error)) {
    return {};
  }

  const data = getResponseData(error);
  const responseStatus = getResponseStatus(error);

  if (data !== error && isRecord(data)) {
    const normalized = normalizeBuiltIn(data);

    return {
      ...normalized,
      status: responseStatus ?? normalized.status ?? null,
    };
  }

  const nestedError = isRecord(error.error) ? error.error : null;

  return {
    message:
      firstString(error.message) ??
      firstString(nestedError?.message) ??
      firstString(error.error),
    code: getCode(error),
    status: responseStatus ?? getStatus(error),
    fields: getFields(error),
    global: getGlobalErrors(error),
  };
}

export function normalizeErrors(
  error: unknown,
  options: NormalizeOptions = {}
): NormalizedError {
  const mapped = options.map?.(error);
  const normalized = mapped ?? normalizeBuiltIn(error);

  return createNormalizedError(error, normalized, options.fallbackMessage);
}
