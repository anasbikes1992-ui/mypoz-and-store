import "server-only";
import {
  createEntity,
  listCollection,
  updateEntity,
} from "@/lib/server/collection-store";

/** Same POS customers collection the counter uses — not a second identity DB. */
export async function upsertPosCustomer(input: {
  name: string;
  email?: string | null;
  mobile?: string | null;
}): Promise<string | null> {
  const email = (input.email ?? "").trim().toLowerCase();
  const mobile = (input.mobile ?? "").trim();
  if (!email && !mobile) return null;

  const rows = await listCollection("customers");
  const existing = rows.find((r) => {
    const e = String(r.email ?? "").trim().toLowerCase();
    const m = String(r.mobile ?? "").trim();
    if (email && e && e === email) return true;
    if (mobile && m && m === mobile) return true;
    return false;
  });

  if (existing) {
    await updateEntity("customers", existing.id, {
      name: input.name || existing.name,
      email: email || existing.email,
      mobile: mobile || existing.mobile,
    });
    return existing.id;
  }

  const created = await createEntity("customers", {
    name: input.name || email || mobile || "Customer",
    email,
    mobile,
    creditLimit: 0,
    points: 0,
    address: "",
  });
  return created.id;
}
