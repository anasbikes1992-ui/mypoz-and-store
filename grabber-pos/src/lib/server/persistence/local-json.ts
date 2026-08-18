import "server-only";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";

/**
 * Atomic JSON file helpers for the local/demo backend. Writes go to a unique
 * temp file and are renamed into place, so a crash mid-write can't leave a
 * truncated file and two concurrent writers can't clobber each other's temp.
 */
const DATA_DIR = path.join(process.cwd(), "data");

export function dataFile(name: string): string {
  return path.join(DATA_DIR, name);
}

export async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(
  file: string,
  value: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID().slice(0, 8)}.tmp`;
  try {
    await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
    await fs.rename(tmp, file);
  } catch (error) {
    await fs.rm(tmp, { force: true });
    throw error;
  }
}

/**
 * Serialize read-modify-write cycles per file.
 *
 * The local backend rewrites a whole JSON array on every change, so two
 * overlapping updates would otherwise read the same snapshot and the second
 * write would silently drop the first one's record. The durable backend has no
 * such problem — it writes one row per record — so this only guards local mode.
 */
const queues = new Map<string, Promise<unknown>>();

export function withFileLock<T>(
  file: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = queues.get(file) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  // Keep the chain alive but never let a rejection poison later callers.
  queues.set(
    file,
    next.catch(() => undefined),
  );
  return next;
}
