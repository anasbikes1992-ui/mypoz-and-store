import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";

/**
 * Play-area sessions billed by time. Check-in stamps the start; check-out bills
 * elapsed hours × the hourly rate as a sale.
 */
export interface PlaySession {
  id: string;
  name: string;
  ratePerHour: number;
  startTime: string;
}

const store = recordStore<PlaySession>({
  collection: "play-sessions",
  file: "play-sessions.json",
});

/** Elapsed hours (min 1 minute) and the charge for a session at `now`. */
export function sessionCharge(session: PlaySession, now = Date.now()) {
  const ms = Math.max(60_000, now - new Date(session.startTime).getTime());
  const hours = ms / 3_600_000;
  const charge = Math.ceil(hours * session.ratePerHour);
  return { minutes: Math.round(ms / 60_000), hours, charge };
}

export async function listSessions(): Promise<PlaySession[]> {
  return (await store.list()).sort((a, b) =>
    b.startTime.localeCompare(a.startTime),
  );
}

export async function getSession(id: string): Promise<PlaySession | null> {
  return store.get(id);
}

export async function checkIn(
  name: string,
  ratePerHour: number,
): Promise<PlaySession> {
  const session: PlaySession = {
    id: "PLY-" + randomUUID().slice(0, 8),
    name: name.trim() || "Guest",
    ratePerHour: Math.max(0, Number(ratePerHour) || 0),
    startTime: new Date().toISOString(),
  };
  return store.put(session);
}

export async function removeSession(id: string): Promise<void> {
  await store.remove(id);
}
