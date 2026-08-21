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
import { isLocale, type Locale } from "@/lib/whatsapp/i18n";
import {
  findCollectionByField,
  getCollection,
  listCollection,
  putCollection,
  readWhatsAppDocument,
  resolveWhatsAppTenant,
  writeWhatsAppDocument,
  type WhatsAppTenant,
} from "./whatsapp-durable";

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
  createdAt: string;
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
  updatedAt: string;
}

const CONVERSATIONS = "whatsapp_conversations";
const MESSAGES = "whatsapp_messages";

const conversations = recordStore<WhatsAppConversation>({
  collection: CONVERSATIONS,
  file: "whatsapp-conversations.json",
});

const messages = recordStore<WhatsAppMessage>({
  collection: MESSAGES,
  file: "whatsapp-messages.json",
});

const settingsDoc = docStore<Partial<WhatsAppSettings>>({
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

export async function readWhatsAppSettings(
  phoneNumberId?: string,
): Promise<WhatsAppSettings> {
  const tenant = await tenantFor(phoneNumberId);
  const raw = tenant
    ? await readWhatsAppDocument(tenant)
    : await settingsDoc.read({});
  const localeRaw = String(raw.locale ?? "en");
  return {
    phoneNumberId: String(raw.phoneNumberId ?? ""),
    verifyToken: String(raw.verifyToken ?? ""),
    accessToken: String(raw.accessToken ?? ""),
    locale: isLocale(localeRaw) ? localeRaw : "en",
    greeting: String(raw.greeting ?? ""),
    locationText: String(raw.locationText ?? ""),
    offersText: String(raw.offersText ?? ""),
    staffNotify: Boolean(raw.staffNotify ?? true),
    enabledPaths: normalizeEnabledPaths(
      raw.enabledPaths as Partial<AutomationPathEnabled> | undefined,
    ),
    updatedAt: String(raw.updatedAt ?? ""),
  };
}

export async function writeWhatsAppSettings(
  patch: Partial<WhatsAppSettings>,
): Promise<WhatsAppSettings> {
  const current = await readWhatsAppSettings();
  const next: WhatsAppSettings = {
    phoneNumberId: patch.phoneNumberId ?? current.phoneNumberId,
    verifyToken:
      patch.verifyToken && patch.verifyToken.trim()
        ? patch.verifyToken.trim()
        : current.verifyToken,
    accessToken:
      patch.accessToken && patch.accessToken.trim()
        ? patch.accessToken.trim()
        : current.accessToken,
    locale: patch.locale ?? current.locale,
    greeting: patch.greeting ?? current.greeting,
    locationText: patch.locationText ?? current.locationText,
    offersText: patch.offersText ?? current.offersText,
    staffNotify: patch.staffNotify ?? current.staffNotify,
    enabledPaths: patch.enabledPaths
      ? normalizeEnabledPaths(patch.enabledPaths)
      : current.enabledPaths,
    updatedAt: new Date().toISOString(),
  };
  const tenant = await tenantFor(next.phoneNumberId || undefined);
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
    updatedAt: settings.updatedAt,
  };
}
