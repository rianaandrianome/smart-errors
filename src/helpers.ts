import type { NormalizedError } from "./types";

export function getErrorMessage(
  error: NormalizedError,
  fallback?: string
): string | null {
  return error.message ?? fallback ?? null;
}

export function getFieldError(
  error: NormalizedError,
  field: string
): string | null {
  return error.fields[field] ?? null;
}

export function hasFieldError(error: NormalizedError, field: string): boolean {
  return getFieldError(error, field) !== null;
}

export function getGlobalErrors(error: NormalizedError): string[] {
  return error.global;
}

export function isErrorCode(error: NormalizedError, code: string): boolean {
  return error.code === code;
}
