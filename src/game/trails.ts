/**
 * playtest1g [OWNER-APPROVED 2026-10-02: playtest1g trail paths] (owner-requested 2026-10-02 11:30 ET, drawing only):
 * the trail path sheets for the vale, the Winter hollow, the Cinder and the Dry waste (tools/pixel-writer/
 * trail_writer.py), drawn over each trail tile's own biome ground in place of the flat brown square, the way playtest1f
 * draws the swamp's (wayrifts.ts SWAMP_PATH). 16x16 cells by the same NESW mask (1 N, 2 E, 4 S, 8 W; 16 and 17 the
 * straights' variant). The vale's sheet has one row a season. g.tiles still holds a trail there: looks only.
 */
import { T } from "./content";
import type { SeasonId } from "./seasons";

export const TRAIL_VALE = "/art/writer/trail-vale.png";
export const TRAIL_SNOW = "/art/writer/trail-snow.png";
export const TRAIL_ASH = "/art/writer/trail-ash.png";
export const TRAIL_SAND = "/art/writer/trail-sand.png";
export const TRAIL_SHEETS = [TRAIL_VALE, TRAIL_SNOW, TRAIL_ASH, TRAIL_SAND];

/** The sheet for a trail tile's biome ground (gravewake_vale VALE_GROUND: vale grass, snow, sand, ash; the swamp has
 * its own, SWAMP_PATH). */
export const TRAIL_BY_GROUND: Readonly<Record<number, string>> = { [T.grass]: TRAIL_VALE, [T.snow]: TRAIL_SNOW, [T.ash]: TRAIL_ASH, [T.sand]: TRAIL_SAND };

/** The vale sheet's row for a season (autumn, winter, spring, summer: the writer's order). */
export const TRAIL_SEASON_ROW: Record<SeasonId, number> = { autumn: 0, winter: 1, spring: 2, summer: 3 };
