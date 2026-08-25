import { NextResponse } from "next/server";

/**
 * Typed business errors with stable HTTP mappings for auth, state,
 * duplicate, and stock failures across commerce APIs.
 */
export type BusinessErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID"
  | "DUPLICATE"
  | "CONFLICT"
  | "STOCK"
  | "ALREADY_VOID"
  | "NOT_PENDING"
  | "AMOUNT_MISMATCH";

export class BusinessError extends Error {
  readonly code: BusinessErrorCode;
  readonly httpStatus: number;

  constructor(code: BusinessErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = "BusinessError";
    this.code = code;
    this.httpStatus = httpStatus ?? defaultStatus(code);
  }
}

function defaultStatus(code: BusinessErrorCode): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "INVALID":
      return 400;
    case "DUPLICATE":
    case "CONFLICT":
    case "ALREADY_VOID":
    case "NOT_PENDING":
    case "AMOUNT_MISMATCH":
    case "STOCK":
      return 422;
    default:
      return 422;
  }
}

/** Map thrown errors (including Postgres RPC messages) onto BusinessError. */
export function toBusinessError(error: unknown): BusinessError {
  if (error instanceof BusinessError) return error;
  const msg = error instanceof Error ? error.message : String(error);

  if (/AUTH:|Unauthorized/i.test(msg)) {
    return new BusinessError("UNAUTHORIZED", msg, 401);
  }
  if (/ROLE:|Forbidden|Permission denied/i.test(msg)) {
    return new BusinessError("FORBIDDEN", msg, 403);
  }
  if (/not found|NOT_FOUND|PENDING_SALE_NOT_FOUND/i.test(msg)) {
    return new BusinessError("NOT_FOUND", msg, 404);
  }
  if (/SALE_ALREADY_VOID|already void/i.test(msg)) {
    return new BusinessError("ALREADY_VOID", msg, 422);
  }
  if (/SALE_NOT_PENDING|NOT_PENDING/i.test(msg)) {
    return new BusinessError("NOT_PENDING", msg, 422);
  }
  if (/STOCK:|insufficient stock/i.test(msg)) {
    return new BusinessError("STOCK", msg, 422);
  }
  if (/duplicate|unique|client_uuid/i.test(msg)) {
    return new BusinessError("DUPLICATE", msg, 422);
  }
  if (/AMOUNT_MISMATCH/i.test(msg)) {
    return new BusinessError("AMOUNT_MISMATCH", msg, 422);
  }
  return new BusinessError("CONFLICT", msg, 422);
}

export function businessErrorResponse(error: unknown): NextResponse {
  const mapped = toBusinessError(error);
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: mapped.message,
      code: mapped.code,
    },
    { status: mapped.httpStatus },
  );
}
