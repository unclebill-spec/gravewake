/**
 * batch7 item 5: save backup. A save leaves the game as a small JSON file and comes back through a checked import:
 * the wrapper, the size, every field a loaded game leans on, then a trial load in a scratch game before it touches a slot.
 */
import { CLASSES } from "./content";

export const BACKUP_FORMAT = "gravewake-save";
export const BACKUP_VERSION = 1;
export const BACKUP_MAX_BYTES = 2_000_000;

export type Backup = { format: typeof BACKUP_FORMAT; version: number; exported: string; save: Record<string, unknown> };
export type ImportResult = { ok: true; save: Record<string, unknown> } | { ok: false; error: string };

/** The file's text: the wrapper around one save record. */
export function backupText(save: object, now = new Date()): string {
  const b: Backup = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exported: now.toISOString(), save: save as Record<string, unknown> };
  return JSON.stringify(b, null, 1);
}

/** A safe file name for a save: gravewake-<name>-lv<level>.json */
export function backupName(name: string, level: number): string {
  const n = String(name || "hero").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "hero";
  return `gravewake-${n}-lv${Math.max(1, Math.floor(level) || 1)}.json`;
}

const num = (v: unknown, lo = 0, hi = Number.MAX_SAFE_INTEGER) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const strs = (v: unknown) => v === undefined || (Array.isArray(v) && v.every((x) => typeof x === "string"));

/** Check a file's text. Only the shape is checked here; the game then trial-loads it (Game.importSave). */
export function parseBackup(text: string): ImportResult {
  if (typeof text !== "string" || !text.trim()) return { ok: false, error: "The file is empty." };
  if (text.length > BACKUP_MAX_BYTES) return { ok: false, error: "The file is too big to be a Gravewake save." };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not JSON." };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "That file is not a Gravewake save." };
  const w = data as Partial<Backup>;
  if (w.format !== BACKUP_FORMAT) return { ok: false, error: "That file is not a Gravewake save." };
  if (!num(w.version, 1) || (w.version as number) > BACKUP_VERSION) return { ok: false, error: "That save is from a newer Gravewake." };
  const s = w.save as Record<string, unknown> | undefined;
  if (!s || typeof s !== "object" || Array.isArray(s)) return { ok: false, error: "The save inside the file is missing." };
  if (typeof s.cls !== "string" || !Object.prototype.hasOwnProperty.call(CLASSES, s.cls)) return { ok: false, error: "The save's class is unknown." };
  if (typeof s.name !== "string" || s.name.length > 40) return { ok: false, error: "The save's name is not valid." };
  if (!["str", "dex", "int"].includes(s.path as string) || typeof s.mapId !== "string") return { ok: false, error: "The save is missing its path or place." };
  if (!num(s.level, 1, 999) || !Number.isInteger(s.level)) return { ok: false, error: "The save's level is not valid." };
  for (const k of ["xp", "str", "dex", "int", "sta", "agi", "fort", "coin", "worldMs"]) if (!num(s[k])) return { ok: false, error: `The save's ${k} is not valid.` };
  for (const k of ["px", "py", "hp"]) if (!num(s[k], -1e9, 1e9)) return { ok: false, error: `The save's ${k} is not valid.` };
  if (!Array.isArray(s.inv) || !s.equip || typeof s.equip !== "object") return { ok: false, error: "The save's pack is not valid." };
  for (const k of ["specials", "book", "badges", "marks", "bestiary"]) if (!strs(s[k])) return { ok: false, error: `The save's ${k} is not valid.` };
  if (s.ngPlus !== undefined && !(num(s.ngPlus, 0, 99) && Number.isInteger(s.ngPlus))) return { ok: false, error: "The save's New Game+ count is not valid." };
  return { ok: true, save: s };
}
