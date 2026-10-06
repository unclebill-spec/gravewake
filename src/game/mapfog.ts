/**
 * playtest1v [OWNER-APPROVED 2026-10-05 21:31 ET: playtest1v map fog + bone car]: the map fog. The corner map and the
 * full map start dark on the vale, the town and each village, and fill in where the hero has been: a disc of
 * MAPFOG.radius tiles round the hero, kept per map (world, town, village:<id>) and saved as a run-length string.
 * Villages, wayrifts and dungeon mouths show on the maps only once their tile has been seen. The play view itself is
 * not fogged (dungeon floors keep their own fog, as before). An old save (no mapSeen) starts with the town open and
 * a disc round every place it has already been: the gate, the hero's spot and each dungeon mouth it has entered.
 */
export const MAPFOG = { radius: 11, oldRadius: 14, v: 1 } as const;

/** Which maps keep a map fog, by key (dungeon floors, inside rooms, camp and rifts do not). */
export function fogKey(mapId: string, inside: string): string | null {
  if (mapId === "world" || mapId === "town") return mapId;
  if (mapId === "village" && inside) return `village:${inside}`;
  return null;
}

/** Open a disc of radius r round (cx, cy) in seen (w x h). Returns how many tiles were newly opened. */
export function reveal(seen: Uint8Array, w: number, h: number, cx: number, cy: number, r: number): number {
  let n = 0;
  const r2 = r * r + r;
  for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r2) continue;
      const i = y * w + x;
      if (!seen[i]) {
        seen[i] = 1;
        n++;
      }
    }
  }
  return n;
}

/** Run-length string: the size, then alternating run lengths (dark first) in base 36, dot-separated. */
export function encodeSeen(seen: Uint8Array, w: number, h: number): string {
  const runs: string[] = [];
  let cur = 0;
  let len = 0;
  for (let i = 0; i < seen.length; i++) {
    const v = seen[i] ? 1 : 0;
    if (v === cur) len++;
    else {
      runs.push(len.toString(36));
      cur = v;
      len = 1;
    }
  }
  runs.push(len.toString(36));
  return `${w}x${h}:${runs.join(".")}`;
}

/** Back from encodeSeen; null when it does not fit a w x h map (a changed map, a damaged save). */
export function decodeSeen(s: string | undefined, w: number, h: number): Uint8Array | null {
  if (!s || typeof s !== "string") return null;
  const m = /^(\d+)x(\d+):([0-9a-z.]*)$/.exec(s);
  if (!m || Number(m[1]) !== w || Number(m[2]) !== h) return null;
  const out = new Uint8Array(w * h);
  let i = 0;
  let v = 0;
  for (const part of m[3].split(".")) {
    const len = parseInt(part, 36);
    if (!Number.isFinite(len) || len < 0 || i + len > out.length) return null;
    if (v) out.fill(1, i, i + len);
    i += len;
    v ^= 1;
  }
  return i === out.length ? out : null;
}
