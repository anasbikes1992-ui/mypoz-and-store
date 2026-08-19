export type UxEventKind =
  | "click"
  | "nav"
  | "error"
  | "ux_failure"
  | "rage_click";

export type ReplayFrame = {
  t: number;
  type: UxEventKind | "input";
  path: string;
  tag?: string;
  x?: number;
  y?: number;
  detail?: string;
};

export type UxEvent = {
  sessionId: string;
  kind: UxEventKind;
  path: string;
  message?: string;
  replay?: ReplayFrame[];
  at: string;
  slug?: string;
};

export type StoredUxEvent = {
  id: string;
  sessionId: string;
  kind: UxEventKind;
  path: string;
  message: string;
  replay: ReplayFrame[];
  at: string;
  slug: string;
};

const RAGE_WINDOW_MS = 800;
const RAGE_CLICKS = 3;

export function detectRageClick(
  stamps: number[],
  now = Date.now(),
): boolean {
  const recent = stamps.filter((t) => now - t <= RAGE_WINDOW_MS);
  return recent.length >= RAGE_CLICKS;
}
