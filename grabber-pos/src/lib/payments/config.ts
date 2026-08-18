/**
 * MyPoz owns its payment processors under ./gateways.
 * The thin browser PaymentsClient (client.ts) is optional; storefront uses /api/store/.../pay.
 */
export { getAdapter, pickProvider, anyGatewayConfigured, PROVIDER_KEYS } from "./gateways";
export type { ProviderKey, CurrencyCode, CheckoutResult } from "./gateways";
