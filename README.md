# smart-errors

Normalize backend API errors into a predictable, framework-independent shape for frontend applications.

Backend errors rarely arrive in the exact format your frontend needs. One API returns Laravel-style validation errors, another sends Django REST Framework objects, another nests everything under `error.details`, and every frontend ends up with a small one-off adapter.

`smart-errors` gives you a tiny TypeScript utility layer for turning those responses into a simple structure:

```ts
import { normalizeErrors } from "smart-errors";

const error = normalizeErrors({
  status: 422,
  message: "The given data was invalid.",
  errors: {
    email: ["This email is already used"],
    password: ["Password must contain at least 8 characters"],
  },
});

error.fields.email;
// "This email is already used"

error.message;
// "The given data was invalid."

error.status;
// 422
```

It also works for non-form errors:

```ts
const error = normalizeErrors({
  error: {
    code: "PAYMENT_FAILED",
    message: "Your payment could not be processed.",
  },
});

error.code;
// "PAYMENT_FAILED"

error.message;
// "Your payment could not be processed."
```

## Why

Frontend apps need predictable error handling for forms, toasts, tables, dashboards, auth flows, billing screens, API clients, and mobile views. APIs often return different shapes for validation errors, request errors, authorization failures, and generic server errors.

`smart-errors` keeps that translation small, tested, and reusable across React, Vue, Svelte, React Native, mobile apps, or any TypeScript/JavaScript project.

## Features

- Framework-independent TypeScript core
- Normalizes common backend API error response shapes
- Supports field-level, global, coded, and status-based errors
- Works with string messages, string arrays, nested objects, and error lists
- Includes helper functions for field errors and general API errors
- Allows custom mappings for project-specific APIs
- Zero runtime dependencies

## Installation

```bash
npm install smart-errors
```

```bash
yarn add smart-errors
```

```bash
pnpm add smart-errors
```

## Quick Start

```ts
import {
  getErrorMessage,
  getFieldError,
  getGlobalErrors,
  hasFieldError,
  isErrorCode,
  normalizeErrors,
} from "smart-errors";

const apiError = {
  status: 422,
  message: "The given data was invalid.",
  errors: {
    email: ["This email is already used"],
    password: ["Password must contain at least 8 characters"],
  },
};

const error = normalizeErrors(apiError);

getErrorMessage(error);
// "The given data was invalid."

getFieldError(error, "email");
// "This email is already used"

hasFieldError(error, "password");
// true

getGlobalErrors(error);
// []
```

## API

The planned public API for version 0.1 is documented in [docs/API_DESIGN.md](docs/API_DESIGN.md).

### `normalizeErrors(error, options?)`

Converts an unknown API error response into a normalized error object.

```ts
const error = normalizeErrors(apiError);
```

Returns:

```ts
type NormalizedError = {
  message: string | null;
  code: string | null;
  status: number | null;
  fields: Record<string, string>;
  global: string[];
  raw: unknown;
};
```

### `getErrorMessage(error, fallback?)`

Returns the main error message, with an optional fallback.

```ts
getErrorMessage(error, "Something went wrong.");
// "The given data was invalid."
```

### `getFieldError(error, field)`

Returns the first error message for a field-like key.

```ts
getFieldError(error, "email");
// "This email is already used"
```

### `hasFieldError(error, field)`

Returns whether a field-like key has an error.

```ts
hasFieldError(error, "password");
// true
```

### `getGlobalErrors(error)`

Returns errors that are not attached to a specific field.

```ts
getGlobalErrors(error);
// ["Something went wrong. Please try again."]
```

### `isErrorCode(error, code)`

Returns whether the normalized error has a specific machine-readable code.

```ts
isErrorCode(error, "PAYMENT_FAILED");
// true
```

## Supported Error Shapes

`smart-errors` is designed to support common validation formats from popular backend frameworks, generic REST APIs, and common API client error objects.

### Laravel

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["This email is already used"]
  }
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

### Django REST Framework

```json
{
  "email": ["This email is already used"],
  "non_field_errors": ["Unable to create account"]
}
```

### Rails

```json
{
  "errors": {
    "email": ["has already been taken"],
    "password": ["is too short"]
  }
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

### API Client Errors

```ts
normalizeErrors({
  response: {
    status: 401,
    data: {
      code: "UNAUTHENTICATED",
      message: "Please sign in again.",
    },
  },
});
```

## Custom Mapping

When an API has its own response format, pass a mapper.

```ts
const error = normalizeErrors(response, {
  map(input) {
    return {
      message: input.errorMessage,
      code: input.errorCode,
      status: input.statusCode,
      fields: {
        email: input.details.email.message,
      },
      global: input.summary ? [input.summary] : [],
    };
  },
});
```

## Common Use Cases

`smart-errors` does not depend on a specific UI framework or use case. Use the normalized result wherever your frontend needs consistent error handling.

### Toasts

```ts
const error = normalizeErrors(apiError);

toast.error(getErrorMessage(error, "Something went wrong."));
```

### API Clients

```ts
const error = normalizeErrors(apiError);

if (isErrorCode(error, "UNAUTHENTICATED")) {
  redirectToLogin();
}
```

### Forms

```ts
const error = normalizeErrors(apiError);

Object.entries(error.fields).forEach(([field, message]) => {
  setError(field as keyof FormValues, {
    type: "server",
    message,
  });
});
```

### Vue

```ts
const error = normalizeErrors(apiError);

fieldErrors.value = error.fields;
globalErrors.value = error.global;
```

## TypeScript

The package is written in TypeScript and ships with type definitions.

```ts
import type { NormalizedError } from "smart-errors";

function getDisplayMessage(error: NormalizedError) {
  return error.message ?? "Something went wrong.";
}
```

## Design Goals

- Small API surface
- Predictable output
- Safe handling of unknown input
- No framework assumptions
- Useful defaults with easy escape hatches
- Clear behavior covered by tests

## Roadmap

- Core normalization utilities
- Presets for Laravel, Symfony, Django REST Framework, Rails, and generic REST APIs
- Support for common API client wrappers
- First-class TypeScript types
- Unit tests for supported response shapes
- ESM and CommonJS builds
- GitHub Actions CI
- npm publishing workflow

## Development

```bash
npm install
npm test
npm run build
```

## Contributing

Issues and pull requests are welcome. Good contributions include:

- Additional backend framework presets
- Edge cases from real API responses
- Type improvements
- Documentation examples for popular frontend use cases
