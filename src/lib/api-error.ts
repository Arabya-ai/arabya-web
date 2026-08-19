import { NextResponse } from "next/server";

export type ApiErrorBody = {
  ok: false;
  code: string;
  message: string;
  traceId: string;
  /** Backward-compatible alias kept for existing clients. */
  error: string;
};

function newTraceId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function apiError(
  code: string,
  status: number,
  message = code,
): NextResponse<ApiErrorBody> {
  const traceId = newTraceId();
  return NextResponse.json(
    { ok: false, code, message, traceId, error: code },
    { status, headers: { "X-Trace-Id": traceId } },
  );
}

export function requestTooLarge(
  request: Request,
  maxBytes: number,
): boolean {
  const raw = request.headers.get("content-length");
  if (!raw) return false;
  const bytes = Number(raw);
  return Number.isFinite(bytes) && bytes > maxBytes;
}
