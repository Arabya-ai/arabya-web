import { describe, expect, it } from "vitest";
import { apiError, requestTooLarge } from "@/lib/api-error";

describe("apiError", () => {
  it("returns a stable envelope with backward-compatible error alias", async () => {
    const res = apiError("forbidden", 403);
    expect(res.status).toBe(403);
    expect(res.headers.get("X-Trace-Id")).toMatch(/^[a-f0-9]{12}$/);

    const body = (await res.json()) as {
      ok: false;
      code: string;
      message: string;
      traceId: string;
      error: string;
    };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("forbidden");
    expect(body.message).toBe("forbidden");
    expect(body.error).toBe("forbidden");
    expect(body.traceId).toBe(res.headers.get("X-Trace-Id"));
  });
});

describe("requestTooLarge", () => {
  it("detects oversized content-length before body parse", () => {
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-length": "999999" },
    });
    expect(requestTooLarge(req, 120_000)).toBe(true);
  });

  it("allows missing or small content-length", () => {
    const missing = new Request("http://localhost/api/test", { method: "POST" });
    const small = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-length": "100" },
    });
    expect(requestTooLarge(missing, 120_000)).toBe(false);
    expect(requestTooLarge(small, 120_000)).toBe(false);
  });
});
