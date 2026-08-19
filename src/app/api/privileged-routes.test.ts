import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
import { GET as getAdminPrayerSettings } from "@/app/api/admin/prayer-settings/route";
import { GET as getEditorAdhkar, PATCH as patchEditorAdhkar } from "@/app/api/editor/adhkar-content/route";
import { GET as getStudioUploads } from "@/app/api/studio/uploads/route";

const authMock = vi.mocked(auth);

type ErrorBody = {
  ok: false;
  code: string;
  message: string;
  traceId: string;
  error: string;
};

async function readError(res: Response): Promise<ErrorBody> {
  return (await res.json()) as ErrorBody;
}

describe("privileged routes — negative auth/role checks", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("GET /api/admin/prayer-settings rejects unauthenticated callers", async () => {
    authMock.mockResolvedValue(null);
    const res = await getAdminPrayerSettings();
    expect(res.status).toBe(401);
    const body = await readError(res);
    expect(body.code).toBe("unauthorized");
    expect(body.traceId).toMatch(/^[a-f0-9]{12}$/);
    expect(body.error).toBe("unauthorized");
  });

  it("GET /api/admin/prayer-settings rejects member role", async () => {
    authMock.mockResolvedValue({
      user: { email: "member@example.com", role: "member" },
    } as never);
    const res = await getAdminPrayerSettings();
    expect(res.status).toBe(403);
    const body = await readError(res);
    expect(body.code).toBe("forbidden");
  });

  it("GET /api/editor/adhkar-content rejects unauthenticated callers", async () => {
    authMock.mockResolvedValue(null);
    const res = await getEditorAdhkar();
    expect(res.status).toBe(401);
    const body = await readError(res);
    expect(body.code).toBe("unauthorized");
  });

  it("GET /api/editor/adhkar-content rejects member role", async () => {
    authMock.mockResolvedValue({
      user: { email: "member@example.com", role: "member" },
    } as never);
    const res = await getEditorAdhkar();
    expect(res.status).toBe(403);
    const body = await readError(res);
    expect(body.code).toBe("forbidden");
  });

  it("PATCH /api/editor/adhkar-content rejects oversized payloads via content-length", async () => {
    authMock.mockResolvedValue({
      user: { email: "editor@example.com", role: "editor" },
    } as never);
    const res = await patchEditorAdhkar(
      new Request("http://localhost/api/editor/adhkar-content", {
        method: "PATCH",
        headers: { "content-length": "999999" },
      }),
    );
    expect(res.status).toBe(413);
    const body = await readError(res);
    expect(body.code).toBe("payload_too_large");
  });

  it("GET /api/studio/uploads rejects unauthenticated callers", async () => {
    authMock.mockResolvedValue(null);
    const res = await getStudioUploads();
    expect(res.status).toBe(401);
    const body = await readError(res);
    expect(body.code).toBe("unauthorized");
  });

  it("GET /api/studio/uploads rejects member role", async () => {
    authMock.mockResolvedValue({
      user: { email: "member@example.com", role: "member" },
    } as never);
    const res = await getStudioUploads();
    expect(res.status).toBe(403);
    const body = await readError(res);
    expect(body.code).toBe("forbidden");
  });
});
