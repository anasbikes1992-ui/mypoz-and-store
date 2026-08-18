import "server-only";
import { docStore } from "./persistence/doc-store";

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
  return store.read([]);
}
