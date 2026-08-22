import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getPermissions,
  savePermissions,
  verifyManagerPin,
  permissionsHasPin,
  type PermissionKey,
  type PermissionsConfig,
  type UserOverrides,
} from "@/lib/server/permissions-store";
import {
  resolvePermission,
  type PermissionKey as SharedKey,
} from "@/lib/permissions";
import {
  requireRoles,
  requireTenantSession,
} from "@/lib/server/auth-session";

export async function GET() {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;

  try {
    const cfg = await getPermissions();
    // Never expose the raw PIN / hash to the client
    return NextResponse.json({
      success: true,
      data: {
        idleLockMinutes: cfg.idleLockMinutes,
        roleDefaults: cfg.roleDefaults,
        userOverrides: cfg.userOverrides ?? {},
        hasPin: permissionsHasPin(cfg),
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 500 },
    );
  }
}

const permissionKeySchema = z.enum([
  "void_sale",
  "discount_override",
  "price_override",
  "view_reports",
  "open_register",
  "close_register",
  "stock_adjust",
  "manage_users",
]);

const verifySchema = z.object({
  action: z.literal("verify").optional(),
  pin: z.string().min(1).max(32),
  /** Optional permission gate after PIN succeeds. */
  permission: permissionKeySchema.optional(),
  userId: z.string().max(80).optional(),
  role: z.string().max(40).optional(),
});

const checkSchema = z.object({
  action: z.literal("check"),
  permission: permissionKeySchema,
  userId: z.string().max(80).optional(),
  role: z.string().max(40).optional(),
});

const saveSchema = z.object({
  idleLockMinutes: z.number().int().min(1).max(120).optional(),
  managerPin: z.string().min(4).max(32).optional(),
  roleDefaults: z
    .record(z.string(), z.array(permissionKeySchema))
    .optional(),
  userOverrides: z
    .record(
      z.string(),
      z.record(permissionKeySchema, z.boolean()),
    )
    .optional(),
});

function toPatch(
  data: z.infer<typeof saveSchema>,
): Partial<PermissionsConfig> {
  const patch: Partial<PermissionsConfig> = {};
  if (data.idleLockMinutes !== undefined) {
    patch.idleLockMinutes = data.idleLockMinutes;
  }
  if (data.managerPin !== undefined) {
    patch.managerPin = data.managerPin;
  }
  if (data.roleDefaults !== undefined) {
    patch.roleDefaults = data.roleDefaults as Record<string, PermissionKey[]>;
  }
  if (data.userOverrides !== undefined) {
    patch.userOverrides = data.userOverrides as UserOverrides;
  }
  return patch;
}

function publicData(cfg: PermissionsConfig) {
  return {
    idleLockMinutes: cfg.idleLockMinutes,
    hasPin: permissionsHasPin(cfg),
    roleDefaults: cfg.roleDefaults,
    userOverrides: cfg.userOverrides ?? {},
  };
}

export async function POST(req: NextRequest) {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Permission check (no PIN)
  if (
    body &&
    typeof body === "object" &&
    (body as { action?: string }).action === "check"
  ) {
    const parsed = checkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: "Invalid check body" },
        { status: 400 },
      );
    }
    const cfg = await getPermissions();
    const allowed = resolvePermission(
      cfg,
      parsed.data.permission as SharedKey,
      { userId: parsed.data.userId, role: parsed.data.role ?? gate.session.role },
    );
    return NextResponse.json({
      success: true,
      data: { allowed },
      error: null,
    });
  }

  // Verify PIN (used by BillPanel / IdleLock / void)
  if (
    body &&
    typeof body === "object" &&
    ("pin" in body || (body as { action?: string }).action === "verify")
  ) {
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, data: null, error: "PIN required" },
        { status: 400 },
      );
    }
    const cfg = await getPermissions();
    if (!permissionsHasPin(cfg)) {
      return NextResponse.json({
        success: false,
        data: { valid: false, configured: false },
        error: "Manager PIN is not configured. Ask an owner to set it in Permissions.",
      });
    }
    const ok = await verifyManagerPin(parsed.data.pin);
    if (!ok) {
      return NextResponse.json({
        success: false,
        data: { valid: false },
        error: "Invalid manager PIN",
      });
    }

    if (parsed.data.permission) {
      const allowed = resolvePermission(
        cfg,
        parsed.data.permission as SharedKey,
        {
          userId: parsed.data.userId,
          role: parsed.data.role ?? "manager",
        },
      );
      if (!allowed) {
        return NextResponse.json({
          success: false,
          data: { valid: false, allowed: false },
          error: "Permission denied for this action",
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: { valid: true, allowed: true },
      error: null,
    });
  }

  const forbidden = requireRoles(gate.session, ["owner"]);
  if (forbidden) return forbidden;

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid body",
      },
      { status: 400 },
    );
  }

  const cfg = await savePermissions(toPatch(parsed.data));
  return NextResponse.json({
    success: true,
    data: publicData(cfg),
    error: null,
  });
}

export async function PUT(req: NextRequest) {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
  const forbidden = requireRoles(gate.session, ["owner"]);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid body",
      },
      { status: 400 },
    );
  }

  const patch = toPatch(parsed.data);
  // Empty PIN string means "keep existing"
  if (patch.managerPin !== undefined && !patch.managerPin.trim()) {
    delete patch.managerPin;
  }

  const cfg = await savePermissions(patch);
  return NextResponse.json({
    success: true,
    data: publicData(cfg),
    error: null,
  });
}
