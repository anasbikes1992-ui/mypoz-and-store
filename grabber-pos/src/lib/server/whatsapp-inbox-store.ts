import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";
import { docStore } from "./persistence/doc-store";
import type { BotPayload, BotState } from "@/lib/whatsapp/menu";
import { emptyBotPayload } from "@/lib/whatsapp/menu";
import {
  normalizeEnabledPaths,
  type AutomationPathEnabled,
} from "@/lib/whatsapp/automation-graph";
import {
  normalizeEnabledEvents,
  type WaEventEnabled,
} from "@/lib/whatsapp/event-automations";
import { isLocale, type Locale } from "@/lib/whatsapp/i18n";
import {
  findCollectionByField,
  getCollection,
  listCollection,
  putCollection,
  readWhatsAppDocument,
  resolveWhatsAppTenant,
  resolveWhatsAppTenantForOrg,
  writeWhatsAppDocument,
  type WhatsAppTenant,
} from "./whatsapp-durable";

import {
  normalizeMetaPhoneNumberId,
  normalizeMetaAccessToken,
  readStoredMetaAccessToken,
  readStoredMetaPhoneNumberId,
} from "@/lib/whatsapp/phone-number-id";

export interface WhatsAppConversation {
  id: string;
  waId: string;
  phone: string;
  name?: string;
  state: BotState;
  payload: BotPayload;
  lastMessage: string;
  lastSaleId?: string;
  needsStaffReply?: boolean;
  /** Employee/user name or id for staff handoff. */
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  direction: "in" | "out";
  body: string;
  waMessageId?: string;
  /** Meta delivery status: sent | delivered | read | failed */
  deliveryStatus?: string;
  deliveryStatusAt?: string;
  createdAt: string;
}

export interface WhatsAppOptOut {
  id: string;
  phone: string;
  optedOut: boolean;
  updatedAt: string;
}

export interface WhatsAppSettings {
  phoneNumberId: string;
  verifyToken: string;
  accessToken: string;
  locale: Locale;
  greeting: string;
  locationText: string;
  offersText: string;
  staffNotify: boolean;
  /** Which greeting-menu branches customers see. */
  enabledPaths: AutomationPathEnabled;
  /** Which outbound commerce event automations are on. */
  enabledEvents: WaEventEnabled;
  updatedAt: string;
}

const CONVERSATIONS = "whatsapp_conversations";
const MESSAGES = "whatsapp_messages";
const OPTOUTS = "whatsapp_optouts";

const conversations = recordStore<WhatsAppConversation>({
  collection: CONVERSATIONS,
  file: "whatsapp-conversations.json",
});

const messages = recordStore<WhatsAppMessage>({
  collection: MESSAGES,
  file: "whatsapp-messages.json",
});

const settingsDoc = docStore<Partial<WhatsAppSettings> & { optedOutPhones?: string[] }>({
  key: "whatsapp",
  file: "whatsapp-settings.json",
});

async function tenantFor(phoneNumberId?: string): Promise<WhatsAppTenant | null> {
  try {
    return await resolveWhatsAppTenant(phoneNumberId);
  } catch {
    return null;
  }
}

async function tenantForOrg(orgId: string): Promise<WhatsAppTenant | null> {
  try {
    return await resolveWhatsAppTenantForOrg(orgId);
  } catch {
    return null;
  }
}

export async function listConversations(
  phoneNumberId?: string,
): Promise<WhatsAppConversation[]> {
  const tenant = await tenantFor(phoneNumberId);
  const rows = tenant
    ? await listCollection<WhatsAppConversation>(tenant, CONVERSATIONS)
    : await conversations.list();
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversation(
  id: string,
  phoneNumberId?: string,
): Promise<WhatsAppConversation | null> {
  const tenant = await tenantFor(phoneNumberId);
  if (tenant) return getCollection<WhatsAppConversation>(tenant, CONVERSATIONS, id);
  return conversations.get(id);
}

export async function listMessages(
  conversationId: string,
  phoneNumberId?: string,
): Promise<WhatsAppMessage[]> {
  const tenant = await tenantFor(phoneNumberId);
  const rows = tenant
    ? await listCollection<WhatsAppMessage>(tenant, MESSAGES)
    : await messages.list();
  return rows
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function findMessageByWaId(
  waMessageId: string,
  phoneNumberId?: string,
): Promise<WhatsAppMessage | null> {
  const tenant = await tenantFor(phoneNumberId);
  if (tenant) {
    return findCollectionByField<WhatsAppMessage>(
      tenant,
      MESSAGES,
      "waMessageId",
      waMessageId,
    );
  }
  const all = await messages.list();
  return all.find((m) => m.waMessageId === waMessageId) ?? null;
}

export async function upsertConversation(
  input: Omit<WhatsAppConversation, "createdAt" | "updatedAt"> & {
    createdAt?: string;
  },
  phoneNumberId?: string,
): Promise<WhatsAppConversation> {
  const tenant = await tenantFor(phoneNumberId);
  const existing = tenant
    ? await getCollection<WhatsAppConversation>(tenant, CONVERSATIONS, input.id)
    : await conversations.get(input.id);
  const now = new Date().toISOString();
  const row: WhatsAppConversation = {
    ...existing,
    ...input,
    payload: input.payload ?? existing?.payload ?? emptyBotPayload(),
    assignedTo:
      input.assignedTo !== undefined
        ? input.assignedTo.trim() || undefined
        : existing?.assignedTo,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };
  if (tenant) return putCollection(tenant, CONVERSATIONS, row);
  return conversations.put(row);
}

export async function assignConversation(
  id: string,
  assignTo: string,
  phoneNumberId?: string,
): Promise<WhatsAppConversation | null> {
  const existing = await getConversation(id, phoneNumberId);
  if (!existing) return null;
  return upsertConversation(
    {
      id: existing.id,
      waId: existing.waId,
      phone: existing.phone,
      name: existing.name,
      state: existing.state,
      payload: existing.payload,
      lastMessage: existing.lastMessage,
      lastSaleId: existing.lastSaleId,
      needsStaffReply: existing.needsStaffReply,
      assignedTo: assignTo.trim(),
    },
    phoneNumberId,
  );
}

/** Mark staff handoff resolved (after a human reply from MyPoz inbox). */
export async function resolveStaffHandoff(
  id: string,
  phoneNumberId?: string,
): Promise<WhatsAppConversation | null> {
  const existing = await getConversation(id, phoneNumberId);
  if (!existing) return null;
  return upsertConversation(
    {
      id: existing.id,
      waId: existing.waId,
      phone: existing.phone,
      name: existing.name,
      state: "GREETING",
      payload: existing.payload,
      lastMessage: existing.lastMessage,
      lastSaleId: existing.lastSaleId,
      needsStaffReply: false,
      assignedTo: existing.assignedTo,
    },
    phoneNumberId,
  );
}

export async function appendMessage(
  input: Omit<WhatsAppMessage, "id" | "createdAt"> & { id?: string },
  phoneNumberId?: string,
): Promise<WhatsAppMessage> {
  const row: WhatsAppMessage = {
    ...input,
    id: input.id ?? `WM-${randomUUID().slice(0, 10)}`,
    createdAt: new Date().toISOString(),
  };
  const tenant = await tenantFor(phoneNumberId);
  if (tenant) return putCollection(tenant, MESSAGES, row);
  return messages.put(row);
}

/** Persist Meta delivery/read/failed status onto the outbound message row. */
export async function updateMessageDeliveryStatus(
  waMessageId: string,
  status: string,
  phoneNumberId?: string,
): Promise<WhatsAppMessage | null> {
  const existing = await findMessageByWaId(waMessageId, phoneNumberId);
  if (!existing) return null;
  const row: WhatsAppMessage = {
    ...existing,
    deliveryStatus: status,
    deliveryStatusAt: new Date().toISOString(),
  };
  const tenant = await tenantFor(phoneNumberId);
  if (tenant) return putCollection(tenant, MESSAGES, row);
  return messages.put(row);
}

function phoneKey(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function isOptedOut(
  phone: string,
  phoneNumberId?: string,
  orgId?: string,
): Promise<boolean> {
  const key = phoneKey(phone);
  if (!key) return false;
  const tenant = orgId
    ? await tenantForOrg(orgId)
    : await tenantFor(phoneNumberId);
  if (tenant) {
    const row = await getCollection<WhatsAppOptOut>(tenant, OPTOUTS, key);
    return Boolean(row?.optedOut);
  }
  const raw = await settingsDoc.read({});
  const list = Array.isArray(raw.optedOutPhones)
    ? (raw.optedOutPhones as string[])
    : [];
  return list.includes(key);
}

export async function setOptOut(
  phone: string,
  optedOut: boolean,
  phoneNumberId?: string,
  orgId?: string,
): Promise<void> {
  const key = phoneKey(phone);
  if (!key) return;
  const tenant = orgId
    ? await tenantForOrg(orgId)
    : await tenantFor(phoneNumberId);
  const now = new Date().toISOString();
  if (tenant) {
    await putCollection(tenant, OPTOUTS, {
      id: key,
      phone: key,
      optedOut,
      updatedAt: now,
    } satisfies WhatsAppOptOut);
    return;
  }
  const raw = await settingsDoc.read({});
  const prev = Array.isArray(raw.optedOutPhones)
    ? (raw.optedOutPhones as string[])
    : [];
  const next = optedOut
    ? [...new Set([...prev, key])]
    : prev.filter((p) => p !== key);
  await settingsDoc.write({ ...raw, optedOutPhones: next });
}

export async function readWhatsAppSettings(
  phoneNumberId?: string,
  orgId?: string,
): Promise<WhatsAppSettings> {
  const tenant = orgId
    ? await tenantForOrg(orgId)
    : await tenantFor(phoneNumberId);
  const raw = tenant
    ? await readWhatsAppDocument(tenant)
    : await settingsDoc.read({});
  const localeRaw = String(raw.locale ?? "en");
  const greetingExtra =
    typeof (raw as { greetingExtra?: unknown }).greetingExtra === "string"
      ? String((raw as { greetingExtra?: string }).greetingExtra)
      : "";
  return {
    phoneNumberId: readStoredMetaPhoneNumberId(raw.phoneNumberId),
    verifyToken: String(raw.verifyToken ?? ""),
    accessToken: readStoredMetaAccessToken(raw.accessToken),
    locale: isLocale(localeRaw) ? localeRaw : "en",
    greeting: String(raw.greeting ?? greetingExtra ?? ""),
    locationText: String(raw.locationText ?? ""),
    offersText: String(raw.offersText ?? ""),
    staffNotify: Boolean(raw.staffNotify ?? true),
    enabledPaths: normalizeEnabledPaths(
      raw.enabledPaths as Partial<AutomationPathEnabled> | undefined,
    ),
    enabledEvents: normalizeEnabledEvents(
      raw.enabledEvents as Partial<WaEventEnabled> | undefined,
    ),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export async function writeWhatsAppSettings(
  patch: Partial<WhatsAppSettings>,
  orgId?: string,
): Promise<WhatsAppSettings> {
  const current = await readWhatsAppSettings(undefined, orgId);
  const phonePatch =
    patch.phoneNumberId !== undefined
      ? normalizeMetaPhoneNumberId(patch.phoneNumberId)
      : undefined;
  const tokenPatch =
    patch.accessToken !== undefined ? patch.accessToken.trim() : undefined;
  const next: WhatsAppSettings = {
    phoneNumberId: phonePatch ?? current.phoneNumberId,
    verifyToken:
      patch.verifyToken && patch.verifyToken.trim()
        ? patch.verifyToken.trim()
        : current.verifyToken,
    accessToken:
      tokenPatch
        ? normalizeMetaAccessToken(tokenPatch)
        : current.accessToken,
    locale: patch.locale ?? current.locale,
    greeting: patch.greeting ?? current.greeting,
    locationText: patch.locationText ?? current.locationText,
    offersText: patch.offersText ?? current.offersText,
    staffNotify: patch.staffNotify ?? current.staffNotify,
    enabledPaths: patch.enabledPaths
      ? normalizeEnabledPaths(patch.enabledPaths)
      : current.enabledPaths,
    enabledEvents: patch.enabledEvents
      ? normalizeEnabledEvents(patch.enabledEvents)
      : current.enabledEvents,
    updatedAt: new Date().toISOString(),
  };
  const tenant = orgId
    ? await tenantForOrg(orgId)
    : await tenantFor(undefined);
  if (tenant) {
    await writeWhatsAppDocument(tenant, next as unknown as Record<string, unknown>);
    return next;
  }
  await settingsDoc.write(next);
  return next;
}

export function publicWhatsAppSettings(settings: WhatsAppSettings) {
  return {
    phoneNumberId: settings.phoneNumberId,
    verifyTokenSet: Boolean(settings.verifyToken),
    accessTokenSet: Boolean(settings.accessToken),
    locale: settings.locale,
    greeting: settings.greeting,
    locationText: settings.locationText,
    offersText: settings.offersText,
    staffNotify: settings.staffNotify,
    enabledPaths: settings.enabledPaths,
    enabledEvents: settings.enabledEvents,
    updatedAt: settings.updatedAt,
  };
}
