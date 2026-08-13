import { afterEach, describe, expect, it } from "vitest";
import { isE2eAuthEnabled } from "@/lib/e2e-auth";

describe("isE2eAuthEnabled", () => {
  const prevNode = process.env.NODE_ENV;
  const prevFlag = process.env.ARABYA_E2E_AUTH;

  afterEach(() => {
    process.env.NODE_ENV = prevNode;
    if (prevFlag === undefined) delete process.env.ARABYA_E2E_AUTH;
    else process.env.ARABYA_E2E_AUTH = prevFlag;
  });

  it("is off in production even if flag is set", () => {
    process.env.NODE_ENV = "production";
    process.env.ARABYA_E2E_AUTH = "1";
    expect(isE2eAuthEnabled()).toBe(false);
  });

  it("is on in development when flag is 1", () => {
    process.env.NODE_ENV = "development";
    process.env.ARABYA_E2E_AUTH = "1";
    expect(isE2eAuthEnabled()).toBe(true);
  });

  it("is off when flag missing", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ARABYA_E2E_AUTH;
    expect(isE2eAuthEnabled()).toBe(false);
  });
});
