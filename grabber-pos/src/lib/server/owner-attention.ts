import "server-only";
import { getRepository } from "@/lib/server/repositories";
import { listConversations } from "@/lib/server/whatsapp-inbox-store";

export interface OwnerAttentionSnapshot {
  lowStock: number;
  expired: number;
  unfulfilledOrders: number;
  whatsappNeedsReply: number;
  total: number;
}

export async function getOwnerAttentionSnapshot(): Promise<OwnerAttentionSnapshot> {
  const repo = await getRepository();
  const [inv, sales, conversations] = await Promise.all([
    repo.inventoryStats(),
    repo.listSales(300),
    listConversations().catch(() => []),
  ]);

  const unfulfilledOrders = sales.filter((s) => {
    if (s.status === "voided") return false;
    const src = s.source ?? "POS";
    if (src !== "ONLINE_STORE" && src !== "WHATSAPP") return false;
    const fs = (s.fulfillmentStatus ?? "").toLowerCase();
    return fs !== "delivered" && fs !== "completed" && fs !== "picked_up";
  }).length;

  const whatsappNeedsReply = conversations.filter((c) => c.needsStaffReply).length;

  const total =
    (inv.lowStock > 0 ? 1 : 0) +
    (inv.expired > 0 ? 1 : 0) +
    (unfulfilledOrders > 0 ? 1 : 0) +
    (whatsappNeedsReply > 0 ? 1 : 0);

  return {
    lowStock: inv.lowStock,
    expired: inv.expired,
    unfulfilledOrders,
    whatsappNeedsReply,
    total,
  };
}
