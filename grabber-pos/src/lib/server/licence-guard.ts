import "server-only";
import { isLicenseExpired } from "@/lib/plans";
import { readTenant } from "./tenant-store";

/**
 * Licence enforcement for the reselling model.
 *
 * An expired licence stops the client from *transacting* — every sale path
 * funnels through `createSale`, so guarding there covers the POS and every
 * vertical settle with one check. Reads, reports and the super-admin console
 * stay available so the operator can review data and renew.
 */
export class LicenceExpiredError extends Error {
  constructor(expiry: string) {
    super(
      `Licence expired on ${expiry}. Renew in the super-admin console to resume selling.`,
    );
    this.name = "LicenceExpiredError";
  }
}

export async function assertLicenceActive(): Promise<void> {
  const { license } = await readTenant();
  if (isLicenseExpired(license.expiry)) {
    throw new LicenceExpiredError(license.expiry);
  }
}
