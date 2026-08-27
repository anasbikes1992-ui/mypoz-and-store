/**
 * Thin tenant plane context for Jarvis agents.
 * Approvals / write tools (docs/work/10) will gate on this later.
 */
export type TenantContext = {
  organizationId: string;
  userId: string;
  role: string;
  plane: "owner" | "hq";
};

export function tenantContextFromSession(
  session: { orgId: string; userId: string; role: string },
  plane: "owner" | "hq",
): TenantContext {
  return {
    organizationId: session.orgId,
    userId: session.userId,
    role: session.role,
    plane,
  };
}
