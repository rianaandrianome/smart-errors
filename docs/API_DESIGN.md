# API Design

This document defines the first public contract for `smart-errors`. Implementation should follow this API before adding extra helpers or framework-specific behavior.

## Package Goal

`smart-errors` normalizes backend API errors into one predictable object for frontend applications.

It should work for:

- Field validation errors
- Global request errors
- Authentication and authorization errors
- Billing and payment errors
- API client wrapper errors
- Unknown or malformed error values

The package should be framework-independent and safe to call with `unknown`.

## Public Types

### `NormalizedError`

```ts
export type NormalizedError = {
  message: string | null;
  code: string | null;
  status: number | null;
  fields: Record<string, string>;
  global: string[];
  raw: unknown;
};
```

Rules:

- `message` is the best human-readable summary.
- `code` is a machine-readable error code when present.
- `status` is the HTTP status code when present.
- `fields` contains field-like errors, keyed by field path.
- `global` contains human-readable errors that are not tied to a field.
- `raw` preserves the original input for debugging or advanced handling.

### `NormalizeOptions`

```ts
export type NormalizeOptions = {
  map?: ErrorMapper;
  fallbackMessage?: string;
};
```

Rules:

- `map` lets users normalize custom API formats.
- `fallbackMessage` is used when no message can be extracted.
- If `fallbackMessage` is not provided, `message` should be `null` when no message exists.

### `ErrorMapper`

```ts
export type ErrorMapper = (error: unknown) => PartialNormalizedError | null | undefined;
```

### `PartialNormalizedError`

```ts
export type PartialNormalizedError = Partial<
  Omit<NormalizedError, "raw">
> & {
  raw?: unknown;
};
```

Rules:

- A mapper can return only the pieces it knows about.
- Missing properties are filled with safe defaults.
- Returning `null` or `undefined` falls back to built-in normalization.

## Public Functions

### `normalizeErrors(error, options?)`

```ts
export function normalizeErrors(
  error: unknown,
  options?: NormalizeOptions
): NormalizedError;
```

Behavior:

- Accepts any input, including `null`, strings, arrays, objects, and thrown `Error` instances.
- Never throws for malformed input.
- Applies `options.map` first when provided.
- Falls back to built-in normalization when the mapper returns `null` or `undefined`.
- Preserves the original input in `raw`.

Example:

```ts
const error = normalizeErrors(apiError);

error.message;
error.code;
error.status;
error.fields.email;
```

### `getErrorMessage(error, fallback?)`

```ts
export function getErrorMessage(
  error: NormalizedError,
  fallback?: string
): string | null;
```

Behavior:

- Returns `error.message` when present.
- Returns `fallback` when no message is present and a fallback was provided.
- Returns `null` when neither exists.

### `getFieldError(error, field)`

```ts
export function getFieldError(
  error: NormalizedError,
  field: string
): string | null;
```

Behavior:

- Returns `error.fields[field]` when present.
- Returns `null` when the field has no error.

### `hasFieldError(error, field)`

```ts
export function hasFieldError(
  error: NormalizedError,
  field: string
): boolean;
```

Behavior:

- Returns `true` when `getFieldError(error, field)` returns a message.
- Returns `false` otherwise.

### `getGlobalErrors(error)`

```ts
export function getGlobalErrors(error: NormalizedError): string[];
```

Behavior:

- Returns `error.global`.
- Always returns an array.

### `isErrorCode(error, code)`

```ts
export function isErrorCode(
  error: NormalizedError,
  code: string
): boolean;
```

Behavior:

- Returns `true` when `error.code === code`.
- Returns `false` otherwise.

## Supported Input Shapes

### JavaScript `Error`

```ts
new Error("Something went wrong");
```

Expected output:

```ts
{
  message: "Something went wrong",
  code: null,
  status: null,
  fields: {},
  global: [],
  raw: error
}
```

### String

```ts
"Something went wrong"
```

Expected output:

```ts
{
  message: "Something went wrong",
  code: null,
  status: null,
  fields: {},
  global: [],
  raw: "Something went wrong"
}
```

### Laravel and Rails

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["This email is already used"],
    "password": ["Password must contain at least 8 characters"]
  }
}
```

Expected field output:

```ts
{
  email: "This email is already used",
  password: "Password must contain at least 8 characters"
}
```

### Django REST Framework

```json
{
  "email": ["This email is already used"],
  "non_field_errors": ["Unable to create account"]
}
```

Expected output:

```ts
{
  fields: {
    email: "This email is already used"
  },
  global: ["Unable to create account"]
}
```

### Symfony

```json
{
  "violations": [
    {
      "propertyPath": "email",
      "title": "This email is already used"
    }
  ]
}
```

Expected field output:

```ts
{
  email: "This email is already used"
}
```

### Generic REST

```json
{
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Your payment could not be processed.",
    "fields": {
      "cardNumber": "Card number is invalid"
    }
  }
}
```

Expected output:

```ts
{
  message: "Your payment could not be processed.",
  code: "PAYMENT_FAILED",
  fields: {
    cardNumber: "Card number is invalid"
  }
}
```

### API Client Wrappers

The normalizer should unwrap common API client shapes before parsing the underlying response body.

```ts
{
  response: {
    status: 401,
    data: {
      code: "UNAUTHENTICATED",
      message: "Please sign in again."
    }
  }
}
```

Expected output:

```ts
{
  message: "Please sign in again.",
  code: "UNAUTHENTICATED",
  status: 401
}
```

## Normalization Rules

- Prefer the first useful human-readable message.
- Prefer explicit status values from wrappers or response objects.
- Prefer explicit machine-readable codes from `code`, `errorCode`, or nested `error.code`.
- For arrays of messages, use the first string for a field.
- Ignore non-string field messages unless a nested string can be safely extracted.
- Preserve dot paths and bracket paths exactly as received.
- Put `non_field_errors`, `nonFieldErrors`, `base`, and `_error` into `global`.
- Return safe defaults for unknown input.

## Non-Goals For Version 0.1

- Translating error messages
- Formatting messages for display
- Deep schema validation
- HTTP requests
- Framework adapters as required dependencies
- Mutating the original error object

## Export Surface For Version 0.1

```ts
export type {
  ErrorMapper,
  NormalizedError,
  NormalizeOptions,
  PartialNormalizedError,
};

export {
  getErrorMessage,
  getFieldError,
  getGlobalErrors,
  hasFieldError,
  isErrorCode,
  normalizeErrors,
};
```
