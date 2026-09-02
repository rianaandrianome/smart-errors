import { describe, expect, it } from "vitest";

import {
  getErrorMessage,
  getFieldError,
  getGlobalErrors,
  hasFieldError,
  isErrorCode,
  normalizeErrors,
} from "../src";
import {
  asString,
  firstString,
  isRecord,
  normalizeFieldMap,
} from "../src/utils";

describe("normalizeErrors", () => {
  it("returns the normalized error shape with safe defaults", () => {
    expect(normalizeErrors(null)).toEqual({
      message: null,
      code: null,
      status: null,
      fields: {},
      global: [],
      raw: null,
    });
  });

  it("normalizes string errors into messages", () => {
    expect(normalizeErrors("boom")).toEqual({
      message: "boom",
      code: null,
      status: null,
      fields: {},
      global: [],
      raw: "boom",
    });
  });

  it("normalizes JavaScript Error instances into messages", () => {
    const raw = new Error("Request failed.");

    expect(normalizeErrors(raw)).toEqual({
      message: "Request failed.",
      code: null,
      status: null,
      fields: {},
      global: [],
      raw,
    });
  });

  it("uses a fallback message when no message is normalized", () => {
    expect(
      normalizeErrors(null, {
        fallbackMessage: "Something went wrong.",
      })
    ).toEqual({
      message: "Something went wrong.",
      code: null,
      status: null,
      fields: {},
      global: [],
      raw: null,
    });
  });

  it("fills missing mapper fields with normalized defaults", () => {
    const raw = { error: "custom" };

    expect(
      normalizeErrors(raw, {
        map: () => ({
          message: "Payment failed.",
          code: "PAYMENT_FAILED",
          status: 402,
          fields: {
            cardNumber: "Card number is invalid.",
          },
        }),
      })
    ).toEqual({
      message: "Payment failed.",
      code: "PAYMENT_FAILED",
      status: 402,
      fields: {
        cardNumber: "Card number is invalid.",
      },
      global: [],
      raw,
    });
  });

  it("falls back to default normalization when a mapper returns null", () => {
    expect(
      normalizeErrors("boom", {
        map: () => null,
      })
    ).toEqual({
      message: "boom",
      code: null,
      status: null,
      fields: {},
      global: [],
      raw: "boom",
    });
  });

  it("normalizes simple object errors safely", () => {
    const raw = {
      message: "The given data was invalid.",
      code: "VALIDATION_FAILED",
      status: 422,
      errors: {
        email: ["Email is already used."],
        password: {
          message: "Password is too short.",
        },
        ignored: 123,
      },
      non_field_errors: ["Unable to create account."],
    };

    expect(normalizeErrors(raw)).toEqual({
      message: "The given data was invalid.",
      code: "VALIDATION_FAILED",
      status: 422,
      fields: {
        email: "Email is already used.",
        password: "Password is too short.",
      },
      global: ["Unable to create account."],
      raw,
    });
  });
});

describe("supported error formats", () => {
  it("normalizes Laravel and Rails field errors", () => {
    const raw = {
      message: "The given data was invalid.",
      errors: {
        email: ["This email is already used"],
        password: ["Password must contain at least 8 characters"],
      },
    };

    expect(normalizeErrors(raw)).toEqual({
      message: "The given data was invalid.",
      code: null,
      status: null,
      fields: {
        email: "This email is already used",
        password: "Password must contain at least 8 characters",
      },
      global: [],
      raw,
    });
  });

  it("normalizes Django REST Framework top-level field errors", () => {
    const raw = {
      email: ["This email is already used"],
      password: ["Password must contain at least 8 characters"],
      non_field_errors: ["Unable to create account"],
    };

    expect(normalizeErrors(raw)).toEqual({
      message: null,
      code: null,
      status: null,
      fields: {
        email: "This email is already used",
        password: "Password must contain at least 8 characters",
      },
      global: ["Unable to create account"],
      raw,
    });
  });

  it("normalizes Symfony violations", () => {
    const raw = {
      violations: [
        {
          propertyPath: "email",
          title: "This email is already used",
        },
        {
          propertyPath: "password",
          message: "Password must contain at least 8 characters",
        },
      ],
    };

    expect(normalizeErrors(raw)).toEqual({
      message: null,
      code: null,
      status: null,
      fields: {
        email: "This email is already used",
        password: "Password must contain at least 8 characters",
      },
      global: [],
      raw,
    });
  });

  it("normalizes generic REST error envelopes", () => {
    const raw = {
      error: {
        code: "PAYMENT_FAILED",
        message: "Your payment could not be processed.",
        fields: {
          cardNumber: "Card number is invalid",
        },
      },
    };

    expect(normalizeErrors(raw)).toEqual({
      message: "Your payment could not be processed.",
      code: "PAYMENT_FAILED",
      status: null,
      fields: {
        cardNumber: "Card number is invalid",
      },
      global: [],
      raw,
    });
  });

  it("normalizes Axios-style response wrappers", () => {
    const raw = {
      response: {
        status: 401,
        data: {
          code: "UNAUTHENTICATED",
          message: "Please sign in again.",
        },
      },
    };

    expect(normalizeErrors(raw)).toEqual({
      message: "Please sign in again.",
      code: "UNAUTHENTICATED",
      status: 401,
      fields: {},
      global: [],
      raw,
    });
  });
});

describe("internal parsing utilities", () => {
  it("checks records without accepting arrays or null", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });

  it("returns strings without coercing non-strings", () => {
    expect(asString("message")).toBe("message");
    expect(asString(123)).toBeNull();
    expect(asString("")).toBeNull();
  });

  it("finds the first string in arrays and common message objects", () => {
    expect(firstString([null, { message: ["Nested message."] }])).toBe(
      "Nested message."
    );
    expect(firstString({ title: "Violation title." })).toBe("Violation title.");
    expect(firstString(false)).toBeNull();
  });

  it("normalizes record values into a first-message field map", () => {
    expect(
      normalizeFieldMap({
        email: ["Email is invalid.", "Email is required."],
        password: { message: "Password is too short." },
        ignored: true,
      })
    ).toEqual({
      email: "Email is invalid.",
      password: "Password is too short.",
    });
  });
});

describe("helpers", () => {
  const error = normalizeErrors(
    {},
    {
      map: () => ({
        message: "The request failed.",
        code: "REQUEST_FAILED",
        fields: {
          email: "Email is required.",
        },
        global: ["Try again later."],
      }),
    }
  );

  it("returns the normalized error message", () => {
    expect(getErrorMessage(error)).toBe("The request failed.");
  });

  it("returns a fallback message when the normalized message is missing", () => {
    expect(getErrorMessage(normalizeErrors(null), "Fallback.")).toBe(
      "Fallback."
    );
  });

  it("returns field errors by key", () => {
    expect(getFieldError(error, "email")).toBe("Email is required.");
    expect(getFieldError(error, "password")).toBeNull();
  });

  it("checks whether a field has an error", () => {
    expect(hasFieldError(error, "email")).toBe(true);
    expect(hasFieldError(error, "password")).toBe(false);
  });

  it("returns global errors", () => {
    expect(getGlobalErrors(error)).toEqual(["Try again later."]);
  });

  it("checks normalized error codes", () => {
    expect(isErrorCode(error, "REQUEST_FAILED")).toBe(true);
    expect(isErrorCode(error, "PAYMENT_FAILED")).toBe(false);
  });
});
