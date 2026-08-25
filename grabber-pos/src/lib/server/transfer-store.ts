import "server-only";
import { docStore } from "./persistence/doc-store";
import { resolveDb } from "./persistence/backend";

export interface StockTransferRequest {
  id: string;
  sourceBranch: string;
  targetBranch: string;
  productId: string;
  productName: string;
  quantity: number;
  status: "pending_dispatch" | "in_transit" | "received_approved" | "rejected";
  dispatchedBy: string;
  dispatchedAt: string;
  receivedBy?: string;
  receivedAt?: string;
  notes?: string;
}

const store = docStore<StockTransferRequest[]>({
  key: "stock_transfers",
  file: "stock_transfers.json",
});

export async function createTransferRequest(input: {
  sourceBranch: string;
  targetBranch: string;
  productId: string;
  productName: string;
  quantity: number;
  dispatchedBy: string;
  notes?: string;
}): Promise<StockTransferRequest> {
  const db = await resolveDb();
  if (db) {
    if (input.sourceBranch === input.targetBranch) {
      throw new Error("Source and target branch must be different");
    }
    const typed = db as any;
    const request: StockTransferRequest = {
      id: "TRF-" + Date.now().toString(36),
      sourceBranch: input.sourceBranch,
      targetBranch: input.targetBranch,
      productId: input.productId,
      productName: input.productName,
      quantity: input.quantity,
      status: "pending_dispatch",
      dispatchedBy: input.dispatchedBy,
      dispatchedAt: new Date().toISOString(),
      notes: input.notes,
    };
    const { error: headerError } = await typed.from("stock_transfers").insert({
      id: request.id,
      source_branch_id: request.sourceBranch,
      target_branch_id: request.targetBranch,
      status: request.status,
      dispatched_by: request.dispatchedBy,
      dispatched_at: request.dispatchedAt,
      notes: request.notes ?? null,
    });
    if (headerError) throw new Error(headerError.message);
    const { error: lineError } = await typed.from("stock_transfer_lines").insert({
      transfer_id: request.id,
      product_id: request.productId,
      product_name: request.productName,
      quantity: request.quantity,
    });
    if (lineError) throw new Error(lineError.message);
    return request;
  }

  const current = await store.read([]);
  const request: StockTransferRequest = {
    id: "TRF-" + Date.now().toString(36),
    sourceBranch: input.sourceBranch,
    targetBranch: input.targetBranch,
    productId: input.productId,
    productName: input.productName,
    quantity: input.quantity,
    status: "pending_dispatch",
    dispatchedBy: input.dispatchedBy,
    dispatchedAt: new Date().toISOString(),
    notes: input.notes,
  };
  await store.write([request, ...current]);
  return request;
}

export async function approveTransferReceipt(
  transferId: string,
  receivedBy: string,
): Promise<StockTransferRequest> {
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { data: header, error: headerError } = await typed
      .from("stock_transfers")
      .select("id, source_branch_id, target_branch_id, status, dispatched_by, dispatched_at, received_by, received_at, notes")
      .eq("id", transferId)
      .maybeSingle();
    if (headerError) throw new Error(headerError.message);
    if (!header) throw new Error("Transfer request not found");
    if (header.status === "received_approved") {
      const { data: line } = await typed
        .from("stock_transfer_lines")
        .select("product_id, product_name, quantity")
        .eq("transfer_id", transferId)
        .limit(1)
        .maybeSingle();
      return {
        id: header.id,
        sourceBranch: header.source_branch_id,
        targetBranch: header.target_branch_id,
        productId: line?.product_id ?? "",
        productName: line?.product_name ?? "",
        quantity: Number(line?.quantity ?? 0),
        status: "received_approved",
        dispatchedBy: header.dispatched_by,
        dispatchedAt: header.dispatched_at,
        receivedBy: header.received_by ?? undefined,
        receivedAt: header.received_at ?? undefined,
        notes: header.notes ?? undefined,
      };
    }

    const { data: lines, error: lineError } = await typed
      .from("stock_transfer_lines")
      .select("product_id, product_name, quantity")
      .eq("transfer_id", transferId);
    if (lineError) throw new Error(lineError.message);

    for (const line of (lines ?? []) as any[]) {
      const quantity = Number(line.quantity ?? 0);
      const { error: sourceError } = await typed.rpc("adjust_stock", {
        p_branch: header.source_branch_id,
        p_product: line.product_id,
        p_delta: -quantity,
        p_note: `transfer_out:${transferId}`,
      });
      if (sourceError) throw new Error(sourceError.message);
      const { error: targetError } = await typed.rpc("adjust_stock", {
        p_branch: header.target_branch_id,
        p_product: line.product_id,
        p_delta: quantity,
        p_note: `transfer_in:${transferId}`,
      });
      if (targetError) throw new Error(targetError.message);
    }

    const receivedAt = new Date().toISOString();
    const { error: updateError } = await typed
      .from("stock_transfers")
      .update({
        status: "received_approved",
        received_by: receivedBy,
        received_at: receivedAt,
      })
      .eq("id", transferId);
    if (updateError) throw new Error(updateError.message);

    const first = ((lines ?? []) as any[])[0];
    return {
      id: header.id,
      sourceBranch: header.source_branch_id,
      targetBranch: header.target_branch_id,
      productId: first?.product_id ?? "",
      productName: first?.product_name ?? "",
      quantity: Number(first?.quantity ?? 0),
      status: "received_approved",
      dispatchedBy: header.dispatched_by,
      dispatchedAt: header.dispatched_at,
      receivedBy,
      receivedAt,
      notes: header.notes ?? undefined,
    };
  }

  const current = await store.read([]);
  let updatedItem: StockTransferRequest | null = null;
  const next = current.map((item) => {
    if (item.id === transferId) {
      updatedItem = {
        ...item,
        status: "received_approved" as const,
        receivedBy,
        receivedAt: new Date().toISOString(),
      };
      return updatedItem;
    }
    return item;
  });

  if (!updatedItem) throw new Error("Transfer request not found");
  await store.write(next);
  return updatedItem;
}

export async function listTransfers(): Promise<StockTransferRequest[]> {
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { data, error } = await typed
      .from("stock_transfers")
      .select("id, source_branch_id, target_branch_id, status, dispatched_by, dispatched_at, received_by, received_at, notes, stock_transfer_lines(product_id, product_name, quantity)")
      .order("dispatched_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map((row) => {
      const line = Array.isArray(row.stock_transfer_lines) ? row.stock_transfer_lines[0] : row.stock_transfer_lines;
      return {
        id: row.id,
        sourceBranch: row.source_branch_id,
        targetBranch: row.target_branch_id,
        productId: line?.product_id ?? "",
        productName: line?.product_name ?? "",
        quantity: Number(line?.quantity ?? 0),
        status: row.status,
        dispatchedBy: row.dispatched_by,
        dispatchedAt: row.dispatched_at,
        receivedBy: row.received_by ?? undefined,
        receivedAt: row.received_at ?? undefined,
        notes: row.notes ?? undefined,
      } as StockTransferRequest;
    });
  }

  return store.read([]);
}
