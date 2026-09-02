import { describe, expect, it } from "vitest";

import { normalizeErrors } from "../src";

describe("normalizeErrors", () => {
  it("returns the normalized error shape", () => {
    expect(normalizeErrors("boom")).toEqual({
      message: null,
      code: null,
      status: null,
      fields: {},
      global: [],
      raw: "boom",
    });
  });
});
