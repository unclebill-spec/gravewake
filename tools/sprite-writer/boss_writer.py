"""playtest1p [OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]: big bodies for bosses,
minis and rares.

Bill (2026-10-04 01:10 ET): bosses at least 5x the player's size, minis and rares 2 to 3x. Since playtest1c a boss was a
people-scale body in a cold-fire ring. This writer lays every big rank's frames out again at its own size, from the
1x frames the sprite writer draws (front strip and the -dirs sheet's back, east and west rows), so the big body is the
same body, pose for pose:

    BIG = {"boss": 5, "mini": 3, "rare": 2}      (linear: a boss cell is 80x160, the hero's is 16x32)

Each frame is magnified by hand-written rules, never resampled: no blur, no new colours.

  1. Edge rounding (EPX corners grown with the scale): a block's corner whose two neighbours agree takes their colour
     in a small triangle, so a curve stays a curve instead of a staircase of 5x5 blocks.
  2. Line weight: the outer outline stays 2 px (1 px at 2x) on the outside of the silhouette; a line drawn inside the
     body (an arm against a coat, a seam) thins to 1 px down its middle; a lone dark pixel (an eye, a nostril) keeps
     its whole block. The pixels a thick line gives up take the colour of the body beside them.
  3. Detail the 1x frame has no room for: a rim of light along each shape's top edge and a core shadow along its
     bottom and right edges (one locked palette step, sprite_writer lt/dk), and a sparse hide-and-cloth grain on the
     darker materials. Glow colours (the eyes, lanterns, flames: EM_COLOURS and every neon) are never shaded.

Sheets: public/art/sprites/big/<family>-<rank>.png for the 17 foe families, mimic-rare.png, pumpkin-lord-boss.png,
krampus-boss.png. Eleven poses across (as the strips), four views down: row 0 front, 1 back, 2 east, 3 west. Each has
an _em glow mask (the EM_COLOURS pixels), as foes_em.png. Palette locked, hard alpha (checked here).

    python3 tools/sprite-writer/boss_writer.py      (after dirs_writer.py; make_gravewake.py runs both)

playtest1q [OWNER-APPROVED 2026-10-04 05:43 ET: playtest1q detailed big bosses, wizard back view, Phone boss label]:
drawn in full detail at their real size. Bill (2026-10-04 05:43 ET, "A b and c pls"; A): the 5x bosses and the 2-3x
minis and rares were the 1x art blown up (crisp but blocky). Each big cell is now drawn at its own size from the same
body, pose for pose and view for view, keeping playtest1p's silhouette (its alpha is playtest1p's to the pixel), its 2 px
outline and its feet, so the hitboxes, feet and arenas do not move. Over the magnified layout the writer paints:

  materials  every colour is given a material from the body's own spec (sprite_writer MONSTERS / BOSS_DRESS /
             RARE_DRESS, FAMILY_COLORS): cloth, skin, bone, wraps, fur, hair, metal, gold, leather, bark, leaf,
             straw, burlap, rind, ecto, membrane, horn, hide, wood. Each region is lit from above in its material's
             own ramp (at most 4 steps: dk2, dk, base, lt; C1), with a dithered band edge, and gets its texture:
             folds down cloth, plate seams and rivets on metal, cracks in bone, mottling and stitches on skin,
             strands in fur and hair, grain and knots in bark and wood, ribs on a pumpkin, wisps in ectoplasm,
             veins in a wing, rings on horn, weave in burlap, wrap bands on a mummy.
  faces      eyes are drawn as eyes: a lid line, the iris in its own colour, a white-hot core; a glowing eye gets a
             1 px halo of its family's neon. Mouths get teeth.
  glow       every flame and lamp keeps its colour with a hot core; each family carries one signature neon (blue
             cold fire, violet or red; NEON in palette_locked): runes on its robe, hide or bark (5x7 glyphs on a boss,
             3x5 on a mini, 3x3 on a rare), its eye halos, its crown gem. The neon pixels join the _em mask, so they
             glow in the dark as the lamps do.

Seeded by family and anchored to each region (never Math.random, never a resample): the same frame always gives the
same pixels. Palette LOCKED_V3 (palette v3 adds the neon tubes), hard alpha.

playtest1r [OWNER-APPROVED 2026-10-04 09:00 ET: playtest1r fully reshaped big bosses]: fully reshaped. Bill (2026-10-04 09:00 ET,
"Yes, fully reshape the bosses"): playtest1q kept playtest1p's silhouettes, the 1x outline blown up, so a boss still read
as a broad rectangle. Every big body is now designed at its own size, no longer magnified from a 1x frame: a rig renderer
(the 1q magnifier and detail pass is retired, frozen in scripts/frozen/playtest1r/boss_writer.py.txt) draws each family
from shapes in a design space in boss px (soles on y=150, the body's centre x=40; 58 either side and 166 up at most),
scaled by s/5 into the rank's 24s x 36s cell (soles on row 34s, centre 12s across):

  rig        a skeleton per pose (BASE_POSE: arms, legs, lean, sway, breath, glow, mouth) gives the joints for the
             front, back and side views; the west row is the east row turned over. Stand, idle (breathing), a three-step
             walk (cape and hem sway), a three-step swing (wind-up, strike, follow-through) and a three-step cast
             (gather, release, fade) for every family.
  shapes     ellipses, tapered tubes and bevelled polygons with analytic normals (ell, tube, poly, dot), each with a
             material (cloth, skin, bone, fur, hair, metal, gold, leather, bark, leaf, straw, rind, ecto, membrane,
             horn, hide, wood, wraps, tooth...), a line weight and a depth order.
  light      a key light from the upper left in five locked steps (sprite_writer dk/lt), a dithered band edge at 4x
             and up, a cast shadow from the nearer parts, each material's texture (folds, grain, strands, cracks), a
             rim of the family's neon on the dark materials and a 1 px ink outline round the whole silhouette.
  glow       eyes, flames, orbs, runes and staff heads in glow ramps (neon blue cold fire, violet, red, fire, gold,
             green, bone) that are never shaded; they alone make the _em mask (the glow buffer, not a colour list).
  families   the Vampire Queen (gown, high collar, cape, claws, a blood orb when she casts), the Lich (skull, crown,
             tattered robe, staff of cold fire), the Witch (hat, broom, cauldron-green hex), the Wolfman (hunched,
             snout, claws), the Frankenstein zombie, the skeleton king, the ghoul, the lantern wraith, the scarecrow
             (a crow on the boss's hat), the pharaoh mummy, the goblin chief, Krampus (horns, chain, basket, tongue),
             the Pumpkin Lord (carved face, vines, cloak), the ghost (wispy tail, veil), the bat, the treant (branches,
             roots, bark face), the headless horseman, the cat, the rat and the mimic. A boss wears its crown or regalia,
             a mini an iron collar, a rare its family's rare palette (sprite_writer FAMILY_RARE).

The writer also measures each sheet's silhouette (shape_of: top, half, body, foot) and writes src/game/bigshapes.ts,
which bigboss.ts reads for the hurt radius, the foot box, the shadow, the label and bar height and the camera fit.
Palette LOCKED_V3, hard alpha, the same 108 files, 11 poses x 4 views at 24s x 36s (feet point 34s+2 down, 12s across).

playtest1s [OWNER-APPROVED 2026-10-04 14:08 ET: playtest1s big sprite audit]: audited frame by frame. Bill (2026-10-04
14:08 ET): every big boss, mini and rare must look good at its size. qa/playtest1s/sheet_audit.py measured every cell of
the 54 sheets (clipping at the cell edge, stray bits, pinholes, the soles row, pops between frames, glow, colour drift,
palette) and the contact sheets were looked over; fixed here:
  tidy       every cell: a pinhole (a transparent bit the body closes round, under max(2, s) px) takes the commonest
             colour beside it; a crumb (a bit apart from the body, under max(4, s*s) px, no glow) is dropped (hat tips,
             tatters, a raised foot's raster crumbs). 772 pinholes and 253 crumbs in playtest1r's sheets.
  west       a person's west row keeps the weapon in its right hand (behind the body, the far hand facing west); it was the
             east row in a mirror, the weapon changing hands (the 1x sheets keep the hand since playtest1p).
  reach      a side-view hand past the reach line turns back the short way, by the least it takes (it always threw the
             claw overhead, so the ghoul's idle beat flung its arms up and down).
  Krampus    the chain's links hang on one run of chain (they floated apart).
  horse      the profile horse's hooves stand on the soles row (they floated 6 px over it on the boss).
  ghost      the eyes stay lit in the idle beat (the mini's and rare's blinked off at every beat).
  mimic      a true profile (lid hinged at the back, the maw a wedge facing east; it was the front squeezed) and, from
             behind, the lid stays on its hinge (it floated over a gap).
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
from PIL import Image

import sprite_writer as sw
from palette_locked import LOCKED, LOCKED_V3, NEON

TAG = "[OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]"
TAG_1Q = "[OWNER-APPROVED 2026-10-04 05:43 ET: playtest1q detailed big bosses, wizard back view, Phone boss label]"
TAG_1R = "[OWNER-APPROVED 2026-10-04 09:00 ET: playtest1r fully reshaped big bosses]"
BIG = {"boss": 5, "mini": 3, "rare": 2}

# ================================================================ core
# ---------------------------------------------------------------- the rig renderer (playtest1r)

def _code(c):
    return (1 << 24) | int(c[1:], 16)

def _hex(v):
    return f"#{v & 0xFFFFFF:06x}"

INK = _code(sw.INK)
_LV3 = sorted(LOCKED_V3)
_LV3_RGB = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in _LV3], dtype=np.float64)

def near(c):
    """the locked colour nearest a design colour"""
    if c in LOCKED_V3:
        return c
    r = np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64)
    return _LV3[int(np.argmin(((_LV3_RGB - r) ** 2).sum(1)))]

_RAMP = {}
def ramp(c):
    """five steps: dk2, dk, base, lt, lt2 (locked palette steps)"""
    c = near(c)
    if c not in _RAMP:
        _RAMP[c] = [sw.dk(c, 2), sw.dk(c), c, sw.lt(c), sw.lt(c, 2)]
    return _RAMP[c]

GLOW_RAMPS = {
    "blue": ["#3a6ad0", "#4ab8ff", "#9ae4ff", "#e7f4ff"],
    "violet": ["#7a5ad0", "#b07aff", "#c9a0e8", "#f4fbff"],
    "red": ["#c43838", "#ff3a50", "#ffd0d0", "#fff8ee"],
    "fire": ["#c45a18", "#e07a2f", "#f4e27a", "#fff8e0"],
    "gold": ["#e0a040", "#f4e27a", "#fff0c0", "#fff8e0"],
    "green": ["#6a8a32", "#9ec060", "#c8e080", "#f4fbff"],
    "bone": ["#c4b48a", "#e8e0d0", "#f4efe4", "#fff8e0"],
}
LIGHT = np.array([-0.55, -0.72, 0.65]); LIGHT = LIGHT / np.linalg.norm(LIGHT)
MATS = ["plain", "cloth", "skin", "bone", "fur", "hair", "bark", "leaf", "metal", "gold", "leather", "wrap",
        "rind", "ecto", "membrane", "horn", "straw", "burlap", "wood", "vine", "gem", "eye", "tooth", "mouth", "silk", "hide"]
MAT = {m: i for i, m in enumerate(MATS)}
GLOSS = {MAT["metal"], MAT["gold"], MAT["bone"], MAT["gem"], MAT["horn"], MAT["silk"], MAT["tooth"]}


# playtest1r: a big cell is 24s x 36s px (the 1q cell was the 1x cell's 16 x 32 grown, which a 5x body's reach, a raised
# staff or a swung chain, did not fit); the soles on row 34s, so the feet point is 34s + 2 down and 12s across.
CELL_W, CELL_H, SOLE = 24, 36, 34
# how far a body may reach in design units: 58 either side of its middle, 166 over its soles (a 1-2 px margin)
REACH_X, REACH_UP = 58.0, 166.0


class Cell:
    """one big cell: W = 24s, H = 36s px; design space (the boss's px) with the soles on y = 150, x = 40 the middle."""

    def __init__(self, s, neon="blue", rim=True, fit=1.0, pad=0):
        # fit: the family's size inside its cell (FIT: a family whose reach would leave the cell is drawn a touch
        # smaller, the same for every pose and view, so nothing is cut at the edge); pad: a probe canvas's margin
        self.s, self.k = s, s / 5.0 * fit
        self.W, self.H = CELL_W * s + 2 * pad, CELL_H * s + pad
        H, W = self.H, self.W
        yy, xx = np.mgrid[0:H, 0:W]
        self.X = 40.0 + (xx + 0.5 - CELL_W // 2 * s - pad) / self.k
        self.Y = 150.0 - (SOLE * s + pad - (yy + 0.5)) / self.k
        self.col = np.zeros((H, W), np.int64)
        self.z = np.full((H, W), -1, np.int32)
        self.part = np.full((H, W), -1, np.int32)
        self.nx = np.zeros((H, W)); self.ny = np.zeros((H, W)); self.nz = np.ones((H, W))
        self.mat = np.zeros((H, W), np.int16)
        self.glow = np.zeros((H, W), np.int8)       # 1: a glow part (emissive)
        self.gramp = np.zeros((H, W), np.int8)      # which glow ramp
        self.tone = np.zeros((H, W), np.int8)       # extra steps (far limbs -1, a lining -1)
        self.u = np.zeros((H, W)); self.v = np.zeros((H, W))
        self.lines = {}                              # z -> line kind of that layer ("ink", "soft", None)
        self.partline = {}
        self.nz_ = 0
        self.neon = neon
        self.rim = rim
        self._gk = list(GLOW_RAMPS)

    # -------------------------------------------------- painting
    def _put(self, m, nx, ny, nz, col, mat="plain", line="ink", glow=None, tone=0, part=None, u=None, v=None):
        if not m.any():
            return
        z = self.nz_; self.nz_ += 1
        p = z if part is None else part
        self.lines[z] = line
        self.col[m] = _code(near(col)) if not glow else _code(GLOW_RAMPS[glow][1])
        self.z[m] = z
        self.part[m] = p
        self.nx[m] = nx[m]; self.ny[m] = ny[m]; self.nz[m] = nz[m]
        self.mat[m] = MAT[mat]
        self.glow[m] = 1 if glow else 0
        if glow:
            self.gramp[m] = self._gk.index(glow)
        self.tone[m] = tone
        if u is not None:
            self.u[m] = u[m]; self.v[m] = v[m]

    def ell(self, cx, cy, rx, ry, col, rot=0.0, flat=1.0, cut=None, **o):
        """an ellipse (a spheroid's normals; flat > 1 faces the viewer more). cut(X, Y) -> mask to keep."""
        dx, dy = self.X - cx, self.Y - cy
        c, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        a, b = (dx * c + dy * s_) / max(rx, 0.3), (-dx * s_ + dy * c) / max(ry, 0.3)
        r2 = a * a + b * b
        lim = 1.0 + 0.5 / max(0.6, min(rx, ry) * self.k)
        m = r2 <= (1.0 if min(rx, ry) * self.k > 1.2 else lim)
        if cut is not None:
            m &= cut(self.X, self.Y)
        na, nb = a, b
        nx = na * c - nb * s_; ny = na * s_ + nb * c
        nz = np.sqrt(np.clip(1 - r2, 0, 1)) * flat + 0.05
        ln = np.sqrt(nx * nx + ny * ny + nz * nz)
        self._put(m, nx / ln, ny / ln, nz / ln, col, u=dx, v=dy, **o)

    def tube(self, pts, col, flat=1.0, cap=True, **o):
        """a tapered tube through points (x, y, r): cylinder normals across it."""
        best = np.full(self.X.shape, 1e9); bnx = np.zeros(self.X.shape); bny = np.zeros(self.X.shape)
        rr = np.zeros(self.X.shape); along = np.zeros(self.X.shape); acc = 0.0
        for (x0, y0, r0), (x1, y1, r1) in zip(pts, pts[1:]):
            vx, vy = x1 - x0, y1 - y0
            L2 = vx * vx + vy * vy or 1e-6
            t = np.clip(((self.X - x0) * vx + (self.Y - y0) * vy) / L2, 0, 1)
            if not cap:
                pass
            px, py = x0 + t * vx, y0 + t * vy
            ex, ey = self.X - px, self.Y - py
            d = np.sqrt(ex * ex + ey * ey)
            r = r0 + t * (r1 - r0)
            q = d / np.maximum(r, 0.3)
            take = q < best
            best = np.where(take, q, best); bnx = np.where(take, ex / np.maximum(r, 0.3), bnx); bny = np.where(take, ey / np.maximum(r, 0.3), bny)
            rr = np.where(take, r, rr); along = np.where(take, acc + t * math.sqrt(L2), along)
            acc += math.sqrt(L2)
        minr = min(p[2] for p in pts) * self.k
        m = best <= (1.0 if minr > 0.9 else 1.0 + 0.55 / max(0.35, minr))
        nz = np.sqrt(np.clip(1 - best * best, 0, 1)) * flat + 0.05
        ln = np.sqrt(bnx ** 2 + bny ** 2 + nz ** 2)
        self._put(m, bnx / ln, bny / ln, nz / ln, col, u=bnx * rr, v=along, **o)

    def poly(self, pts, col, bevel=4.0, flat=1.0, **o):
        """a polygon with a rounded bevel of `bevel` design px round its edge."""
        X, Y = self.X, self.Y
        inside = np.zeros(X.shape, bool)
        dmin = np.full(X.shape, 1e9); onx = np.zeros(X.shape); ony = np.zeros(X.shape)
        n = len(pts)
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            if (y0 > Y) is not None:
                cond = ((y0 > Y) != (y1 > Y)) & (X < (x1 - x0) * (Y - y0) / ((y1 - y0) or 1e-9) + x0)
                inside ^= cond
            vx, vy = x1 - x0, y1 - y0
            L2 = vx * vx + vy * vy or 1e-6
            t = np.clip(((X - x0) * vx + (Y - y0) * vy) / L2, 0, 1)
            ex, ey = X - (x0 + t * vx), Y - (y0 + t * vy)
            d = np.sqrt(ex * ex + ey * ey)
            take = d < dmin
            dmin = np.where(take, d, dmin)
            onx = np.where(take, -ex / np.maximum(d, 1e-6), onx); ony = np.where(take, -ey / np.maximum(d, 1e-6), ony)
        m = inside
        # inside pixels: the edge's outward normal is -(direction to the edge) ... ex points from the edge to the pixel
        w = np.clip(1 - dmin / max(bevel, 0.5), 0, 1)
        nx, ny = -onx * w, -ony * w
        nx, ny = -nx, -ny
        nz = np.sqrt(np.clip(1 - (nx * nx + ny * ny), 0, 1)) * flat + 0.05
        ln = np.sqrt(nx * nx + ny * ny + nz * nz)
        cx = sum(p[0] for p in pts) / n; cy = min(p[1] for p in pts)
        self._put(m, nx / ln, ny / ln, nz / ln, col, u=X - cx, v=Y - cy, **o)

    def dot(self, x, y, col, r=1.0, **o):
        """a feature that must show at every size (an eye, a stud): at least one pixel."""
        self.ell(x, y, max(r, 0.6 / self.k), max(r, 0.6 / self.k), col, **o)

    # -------------------------------------------------- finishing
    def render(self):
        H, W = self.H, self.W
        on = self.z >= 0
        out = np.zeros((H, W), np.int64)
        glow = self.glow.astype(bool) & on
        # light: key light from the top left, a little ambient
        I = 0.30 + 0.85 * np.clip(self.nx * LIGHT[0] + self.ny * LIGHT[1] + self.nz * LIGHT[2], 0, 1)
        step = np.where(I < 0.52, 0, np.where(I < 0.74, 1, np.where(I < 0.98, 2, 3)))
        gloss = np.isin(self.mat, list(GLOSS))
        spec = gloss & (I > 1.08)
        step = np.where(spec, 4, step)
        # dither the band edges on the big cells
        if self.s >= 4:
            yy, xx = np.indices((H, W))
            chk = ((xx + yy) % 2 == 0)
            near_up = (np.abs(I - 0.52) < 0.025) | (np.abs(I - 0.74) < 0.025) | (np.abs(I - 0.98) < 0.025)
            step = np.where(near_up & chk & (I < np.select([I < 0.6, I < 0.86], [0.52, 0.74], 0.98)), step + 1, step)
        # cast shadow: a part in front, up and to the left of a pixel, shades it a step
        sh = np.zeros((H, W), bool)
        reach = [(1, 1)] + ([(2, 2), (2, 1)] if self.s >= 4 else []) + ([(1, 0)] if self.s >= 3 else [])
        for dy, dx in reach:
            zz = np.full((H, W), -1, np.int32); pp = np.full((H, W), -1, np.int32)
            zz[dy:, dx:] = self.z[:H - dy, :W - dx]; pp[dy:, dx:] = self.part[:H - dy, :W - dx]
            sh |= (zz > self.z) & (pp != self.part) & on
        step = step - sh.astype(int) + self.tone + self._texture(on)
        step = np.clip(step, 0, 4)
        # colours
        for code in np.unique(self.col[on & ~glow]):
            R = ramp(_hex(int(code)))
            m = on & ~glow & (self.col == code)
            for i in range(5):
                out[m & (step == i)] = _code(R[i])
        # glow parts: rim, body, core, white-hot centre by depth
        if glow.any():
            gk = self._gk
            depth = self.nz
            for gi in np.unique(self.gramp[glow]):
                G = GLOW_RAMPS[gk[gi]]
                m = glow & (self.gramp == gi)
                lv = np.where(depth > 0.9, 3, np.where(depth > 0.62, 2, np.where(depth > 0.25, 1, 0)))
                for i in range(4):
                    out[m & (lv == i)] = _code(G[i])
        # lines between parts: on the far part's side of an edge with a part in front
        line = np.zeros((H, W), bool); soft = np.zeros((H, W), bool)
        lk = np.array([{"ink": 2, "soft": 1}.get(self.lines.get(q), 0) for q in range(max(1, self.nz_))], np.int8)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            zz = np.full((H, W), -1, np.int32); pp = np.full((H, W), -1, np.int32)
            ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
            xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
            zz[yd, xd] = self.z[ys, xs]; pp[yd, xd] = self.part[ys, xs]
            front = (zz > self.z) & (pp != self.part) & on & (zz >= 0)
            kind = lk[np.maximum(zz, 0)]
            line |= front & (kind == 2)
            soft |= front & (kind == 1)
        soft &= ~line
        line &= ~glow
        soft &= ~glow
        out[line] = INK
        for code in np.unique(self.col[soft]):
            R = ramp(_hex(int(code)))
            out[soft & (self.col == code)] = _code(R[0])
        # the neon rim: the silhouette's back-lit side (right and below) catches the family's cold fire
        edge = on & ~self._shift(on, 0, 1) | on & ~self._shift(on, 0, -1) | on & ~self._shift(on, 1, 0) | on & ~self._shift(on, -1, 0)
        if self.rim:
            ring2 = on & ~edge & (self._shift(edge, 0, -1) | self._shift(edge, -1, 0) | self._shift(edge, 0, 1))
            rimc = (self.nx * 0.9 - self.ny * 0.1) > 0.42
            nm = NEON[self.neon]
            dark = np.zeros((H, W), bool)
            for code in np.unique(self.col[on & ~glow]):
                r_, g_, b_ = (int(code) >> 16) & 255, (int(code) >> 8) & 255, int(code) & 255
                if (max(r_, g_, b_) + min(r_, g_, b_)) / 510 < 0.5:
                    dark |= self.col == code
            rimm = ring2 & rimc & dark & ~glow & ~line
            out[rimm] = _code(nm[2])
        out[edge & ~glow] = INK
        out[glow & edge] = _code(GLOW_RAMPS[self._gk[0]][0]) if False else out[glow & edge]
        out[~on] = 0
        return out, (glow & on)

    def _shift(self, a, dy, dx):
        H, W = a.shape
        o = np.zeros_like(a)
        ys = slice(max(0, dy), H + min(0, dy)); yd = slice(max(0, -dy), H + min(0, -dy))
        xs = slice(max(0, dx), W + min(0, dx)); xd = slice(max(0, -dx), W + min(0, -dx))
        o[yd, xd] = a[ys, xs]
        return o

    def _texture(self, on):
        """material grain as steps (-1 darker, +1 lighter), anchored to each part's own coordinates"""
        t = np.zeros(self.z.shape, np.int8)
        if self.s < 3:
            return t
        u, v, m = self.u, self.v, self.mat
        k = self.k
        hsh = (np.floor(u * k).astype(np.int64) * 73856093 ^ np.floor(v * k).astype(np.int64) * 19349663 ^ (self.z.astype(np.int64) * 83492791))
        hsh = np.abs((hsh ^ (hsh >> 13)) * 1274126177) % 1009
        def where(mat, cond, val):
            nonlocal t
            t = np.where((m == MAT[mat]) & cond & on, t + val, t)
        fold = 9.0
        where("cloth", (np.abs(((u + 1.5 * np.sin(v * 0.11)) % fold) - fold / 2) < 0.6 / k) & (v > 6), -1)
        where("silk", (np.abs(((u + 2.0 * np.sin(v * 0.07)) % 11.0) - 5.5) < 0.6 / k) & (v > 4), -1)
        where("silk", (np.abs(((u + 2.0 * np.sin(v * 0.07) + 1.6) % 11.0) - 5.5) < 0.5 / k) & (v > 4), 1)
        where("fur", ((np.floor(v * k) + np.floor(u * k * 0.5) * 3) % 4 == 0) & (hsh % 3 != 0), -1)
        where("hair", (np.abs((u * 1.0) % 4.0 - 2.0) < 0.5 / k), -1)
        where("bark", (np.abs(((u + 2.5 * np.sin(v * 0.13)) % 6.0) - 3.0) < 0.55 / k), -1)
        where("bark", (hsh % 97 == 0), 1)
        where("wood", (np.abs(((v + 1.2 * np.sin(u * 0.3)) % 5.0) - 2.5) < 0.45 / k), -1)
        where("wrap", (np.abs(((v + 0.45 * u) % 6.0) - 3.0) < 0.55 / k), -1)
        where("wrap", (np.abs(((v + 0.45 * u + 1.2) % 6.0) - 3.0) < 0.45 / k), 1)
        where("straw", (np.floor(u * k) % 2 == 0) & (hsh % 4 != 0), 1)
        where("straw", (np.floor(u * k) % 3 == 0), -1)
        where("burlap", ((np.floor(u * k) + np.floor(v * k)) % 3 == 0), -1)
        where("leaf", (hsh % 7 == 0), 1)
        where("leaf", (hsh % 11 == 3), -1)
        where("ecto", (np.abs(((u * 0.6 + v * 0.25) % 9.0) - 4.5) < 0.5 / k) & (v > 10), 1)
        where("skin", (hsh % 61 == 0), -1)
        where("bone", (hsh % 83 == 0), -1)
        where("leather", (hsh % 41 == 0), -1)
        where("metal", (np.abs((v % 8.0) - 4.0) < 0.5 / k), -1)
        where("rind", (np.abs(((u * 1.0) % 9.0) - 4.5) < 0.6 / k), -1)
        where("membrane", (np.abs(((u - v * 0.6) % 10.0) - 5.0) < 0.5 / k), -1)
        where("horn", (np.abs((v % 4.0) - 2.0) < 0.45 / k), -1)
        where("hide", (hsh % 53 == 0), -1)
        where("hide", (np.abs(((u * 0.8 + v * 0.3) % 13.0) - 6.5) < 0.45 / k) & (v > 3), 1)
        return t


# ================================================================ rig
# ---------------------------------------------------------------- the humanoid rig (playtest1r)

POSES = ("stand", "idle", "walk0", "walk1", "walk2", "swing0", "swing1", "swing2", "cast0", "cast1", "cast2")
# per pose: arms (shoulder, elbow) for the left and right arm (0 = hanging, 90 = straight forward, 180 = overhead),
# arm spread (deg out to the side, front view), legs (hip, knee bend), body lean (deg forward), cape sway, the breath,
# the glow's strength (casting), and how open the mouth is.
BASE_POSE = {
    "stand":  dict(aL=(6, 14), aR=(6, 14), sp=(9, 9), lL=(2, 3), lR=(-2, 3), lean=0, sway=0, br=0, glow=0, mouth=0),
    "idle":   dict(aL=(4, 18), aR=(4, 18), sp=(11, 11), lL=(2, 4), lR=(-2, 4), lean=1, sway=1.5, br=1.5, glow=0, mouth=0),
    "walk0":  dict(aL=(-22, 12), aR=(26, 22), sp=(8, 8), lL=(24, 6), lR=(-18, 22), lean=3, sway=-2.5, br=0, glow=0, mouth=0),
    "walk1":  dict(aL=(2, 16), aR=(2, 16), sp=(9, 9), lL=(4, 4), lR=(16, 48), lean=4, sway=1, br=0.5, glow=0, mouth=0),
    "walk2":  dict(aL=(26, 22), aR=(-22, 12), sp=(8, 8), lL=(-18, 22), lR=(24, 6), lean=3, sway=3, br=0, glow=0, mouth=0),
    "swing0": dict(aL=(30, 40), aR=(165, 70), sp=(14, 20), lL=(16, 8), lR=(-14, 10), lean=-6, sway=-3, br=1, glow=0.3, mouth=1),
    "swing1": dict(aL=(-20, 20), aR=(80, 4), sp=(12, 6), lL=(28, 14), lR=(-22, 14), lean=12, sway=4, br=0, glow=0.5, mouth=2),
    "swing2": dict(aL=(-10, 24), aR=(28, 10), sp=(10, 4), lL=(22, 10), lR=(-18, 12), lean=8, sway=2.5, br=0, glow=0.2, mouth=1),
    "cast0":  dict(aL=(55, 70), aR=(55, 70), sp=(16, 16), lL=(6, 4), lR=(-6, 4), lean=-2, sway=-1, br=1, glow=0.6, mouth=0),
    "cast1":  dict(aL=(160, 18), aR=(160, 18), sp=(30, 30), lL=(8, 4), lR=(-8, 4), lean=-6, sway=-3, br=2, glow=1.0, mouth=2),
    "cast2":  dict(aL=(88, 8), aR=(88, 8), sp=(18, 18), lL=(14, 6), lR=(-10, 8), lean=6, sway=3, br=0.5, glow=0.8, mouth=1),
}


def rot(x, y, deg, ox=0.0, oy=0.0):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    x, y = x - ox, y - oy
    return ox + x * c - y * s, oy + x * s + y * c


class Body:
    """the joints of one pose in one view (design space). side: +1 the figure's right. view 0 front, 1 back, 2 east."""

    def __init__(self, sp, P, view):
        self.sp, self.P, self.view = sp, P, view
        g = sp
        self.side_view = view == 2
        thigh, shin = g["thigh"], g["shin"]
        # legs first: the lower foot stands on the ground
        hip_y0 = 150 - g["foot_h"] - thigh - shin
        legs = {}
        low = -1e9
        for side, (a, kb) in (("L", P["lL"]), ("R", P["lR"])):
            a1 = math.radians(a); a2 = math.radians(a - kb)
            kx, ky = thigh * math.sin(a1), thigh * math.cos(a1)
            ax_, ay = kx + shin * math.sin(a2), ky + shin * math.cos(a2)
            legs[side] = (kx, ky, ax_, ay, math.sin(a1) * thigh + math.sin(a2) * shin)
            low = max(low, ay)
        lift = (thigh + shin) - low   # how far the hips sink when no leg is straight
        hip_y = hip_y0 + lift + g.get("sink", 0)
        cx = 40.0 + g.get("cx", 0)
        self.cx = cx
        self.hip = (cx, hip_y)
        lean = P["lean"] + g.get("lean", 0)
        self.lean = lean
        hunch = g.get("hunch", 0)
        br = P["br"] * g.get("breathe", 1)
        # spine: pelvis -> chest -> neck, leaning forward (side view) or just shortened (front view)
        T = g["torso"]
        if self.side_view:
            chest = rot(cx, hip_y - T * 0.55, lean, cx, hip_y)
            neck = rot(chest[0], chest[1] - T * 0.45 - br * 0.4, lean + hunch, chest[0], chest[1])
            head = rot(neck[0], neck[1] - g["neck"] - g["head"][1] * 0.8, lean + hunch * 1.4, neck[0], neck[1])
            head = (head[0] + g.get("head_fwd", 0), head[1])
        else:
            f = math.cos(math.radians(lean * 0.8))
            chest = (cx, hip_y - T * 0.55 * f)
            neck = (cx, chest[1] - (T * 0.45 + br * 0.4) * math.cos(math.radians((lean + hunch) * 0.8)))
            head = (cx, neck[1] - (g["neck"] + g["head"][1] * 0.8) * math.cos(math.radians((lean + hunch * 1.4) * 0.7)) + hunch * 0.3)
        self.chest, self.neck, self.head = chest, neck, head
        # shoulders, arms
        self.joints = {}
        sw_ = g["shoulder"] + br * 0.3
        for side, (a, e), spd in (("L", P["aL"], P["sp"][0]), ("R", P["aR"], P["sp"][1])):
            sgn = 1 if side == "R" else -1
            up, fo = g["upper"], g["fore"]
            if self.side_view:
                sx, sy = rot(cx, neck[1] + g["sh_drop"], 0)[0], neck[1] + g["sh_drop"]
                sx = neck[0] - 1.0
                a1 = math.radians(a + lean * 0.5); a2 = math.radians(a + e + lean * 0.5)
                ex_, ey = sx + up * math.sin(a1), sy + up * math.cos(a1)
                hx, hy = ex_ + fo * math.sin(a2), ey + fo * math.cos(a2)
                # a reach that would leave the cell bends the elbow until the hand is in. playtest1s: the forearm turns the
                # short way back in (down toward the side for a low hand, up for a raised one), by the least it takes, so a
                # hand a hair past the line moves a hair; it always turned up (a claw thrown overhead), so a breath that
                # crossed the line made the idle beat throw the arm up and down (a pop)
                lim = REACH_X - 11 - (g.get("held_reach", 0) if side == "R" else 0)
                bend = 0
                a0 = a + e + lean * 0.5
                turn = (1 if hx > 40 else -1) * (-1 if math.cos(math.radians(a0)) > 0 else 1)
                while abs(hx - 40.0) > lim and bend < 90:
                    bend += 1
                    a2 = math.radians(a0 + turn * bend)
                    hx, hy = ex_ + fo * math.sin(a2), ey + fo * math.cos(a2)
                z = 1 if side == "R" else -1
                self.joints[side] = dict(s=(sx, sy), e=(ex_, ey), h=(hx, hy), z=z, fwd=math.sin(a1))
            else:
                xs = (-1 if view == 0 else 1) * sgn   # the figure's right is the viewer's left from the front
                sx, sy = cx + xs * sw_, neck[1] + g["sh_drop"]
                a1 = math.radians(a); a2 = math.radians(a + e)
                spr = math.radians(spd)
                ex_ = sx + xs * up * math.sin(spr) * max(0.25, math.cos(a1) if a < 100 else 0.6) - xs * up * math.sin(a1) * 0.05
                ey = sy + up * math.cos(a1) * math.cos(spr * 0.6)
                hx = ex_ + xs * fo * math.sin(spr) * 0.7 - xs * fo * math.sin(a2) * 0.08
                hy = ey + fo * math.cos(a2) * math.cos(spr * 0.4)
                fwd = math.sin(a1) * up + math.sin(a2) * fo
                z = 1 if (fwd > 14) == (view == 0) else -1   # in front of the body, or behind it
                if view == 1 and fwd <= 14:
                    z = 1
                if view == 0 and fwd <= 14:
                    z = 1
                if view == 1 and fwd > 14:
                    z = -1
                self.joints[side] = dict(s=(sx, sy), e=(ex_, ey), h=(hx, hy), z=z, fwd=fwd)
        # legs
        for side in ("L", "R"):
            sgn = 1 if side == "R" else -1
            kx, ky, ax_, ay, fw = legs[side]
            if self.side_view:
                hx, hy = cx + (1.0 if side == "R" else -1.0), hip_y
                self.joints["leg" + side] = dict(h=(hx, hy), k=(hx + kx, hy + ky), a=(hx + ax_, hy + ay), z=1 if side == "R" else -1, fwd=fw)
            else:
                xs = (-1 if view == 0 else 1) * sgn
                hx, hy = cx + xs * g["hipw"], hip_y
                # front view: a step forward shortens the leg a little and the foot comes down a touch
                kxx = hx + xs * 1.5
                self.joints["leg" + side] = dict(h=(hx, hy), k=(kxx, hy + ky), a=(hx + xs * 2.0, hy + ay), z=0, fwd=fw)
        self.ground = 150.0


def limb(c, a, b, d, r0, r1, r2, col, **o):
    """upper and lower limb as one bent tube"""
    c.tube([(a[0], a[1], r0), (b[0], b[1], r1), (d[0], d[1], r2)], col, **o)


POSES_N = len(POSES)

# ================================================================ parts
# ---------------------------------------------------------------- shared garments and heads (playtest1r)


def wave(n, amp, ph):
    return [amp * math.sin(i * 2.1 + ph) for i in range(n)]


def skirt(c, B, top_w, hem_w, col, hem_y=149.0, tatter=0.0, sway=0.0, mat="cloth", line="ink", tone=0, top=None, back_flare=6.0, n=9, ph=0.0):
    """a gown or robe from the waist to the hem: front/back views a flared trapezoid, the side view a bell with its
    back trailing; the hem waves (tatter) and swings with the walk (sway)."""
    cx, hy = B.hip
    ty = hy - 6 if top is None else top
    pts = []
    if B.view == 2:
        lean = B.lean
        tx = cx + math.sin(math.radians(lean)) * 6
        front = tx + top_w * 0.75
        backx = tx - top_w * 0.85
        pts = [(backx, ty), (front, ty), (front + 3 + max(0, lean) * 0.4, ty + (hem_y - ty) * 0.5)]
        hem = []
        for i in range(n + 1):
            f = i / n
            x = (cx + hem_w * 0.55 + sway * 0.4) + f * (-(hem_w * 1.15) - back_flare - sway * 1.2)
            y = hem_y - (tatter * (0.5 + 0.5 * math.sin(i * 2.3 + ph)) if 0 < i < n else 0)
            hem.append((x, y))
        pts += hem
        pts.append((backx - back_flare * 0.6 - sway * 0.6, ty + (hem_y - ty) * 0.55))
    else:
        l, r = cx - top_w, cx + top_w
        pts = [(l, ty), (r, ty)]
        for i in range(n + 1):
            f = i / n
            x = cx + hem_w - f * 2 * hem_w + sway * (1 - abs(f - 0.5) * 2) * 0.8 + sway * 0.5
            y = hem_y - (tatter * (0.5 + 0.5 * math.sin(i * 2.3 + ph)) if 0 < i < n else 0)
            pts.append((x, y))
    c.poly(pts, col, bevel=5.0, mat=mat, line=line, tone=tone)
    return pts


def cape(c, B, col, lining, width, length=148.0, sway=0.0, tatter=4.0, mat="cloth", collar=0.0, n=10):
    """a cape off the shoulders: behind the body from the front (its lining showing at the edges), over the back from
    behind, trailing out behind in profile. Returns nothing; draw it first (front/side) or after the body (back)."""
    nx, ny = B.neck
    sy = ny + 2
    if B.view == 2:
        bx = nx - 3
        pts = [(bx + 3, sy - 2), (bx - 6, sy + 4)]
        tail = bx - width * 0.8 - abs(sway) * 1.6 - 4
        for i in range(n + 1):
            f = i / n
            x = bx - 2 + f * (tail - bx + 2) - sway * 0.8 * f
            y = length - tatter * (0.5 + 0.5 * math.sin(i * 1.9 + sway)) * (0 < i < n)
            pts.append((x, y))
        pts.append((tail + 2, sy + 30))
        pts = [pts[0]] + pts[1:]
        c.poly(pts, col, bevel=6.0, mat=mat, line="ink")
        return
    hw = width
    pts = [(nx - B.sp["shoulder"] - 1, sy), (nx + B.sp["shoulder"] + 1, sy)]
    for i in range(n + 1):
        f = i / n
        x = nx + hw - f * 2 * hw + sway * (0.6 + 0.4 * math.sin(f * 3.1))
        y = length - tatter * (0.5 + 0.5 * math.sin(i * 1.7 + sway * 0.7)) * (0 < i < n)
        pts.append((x, y))
    if B.view == 0:
        c.poly(pts, lining, bevel=3.0, mat=mat, line="ink", tone=-1)
        # the outer face shows past the lining at both edges
        l = [(nx - B.sp["shoulder"] - 1, sy), (nx - B.sp["shoulder"] + 3, sy + 4), (nx - hw * 0.62 + sway * 0.5, length - 6), (nx - hw + sway * 0.6, length - tatter * 0.5)]
        r = [(nx + B.sp["shoulder"] + 1, sy), (nx + B.sp["shoulder"] - 3, sy + 4), (nx + hw * 0.62 + sway * 0.5, length - 6), (nx + hw + sway * 0.6, length - tatter * 0.5)]
        c.poly(l[::-1] + [(nx - B.sp["shoulder"] - 4, sy + 6)], col, bevel=3.0, mat=mat, line="soft", part=c.nz_ - 1)
        c.poly(r + [(nx + B.sp["shoulder"] + 4, sy + 6)], col, bevel=3.0, mat=mat, line="soft", part=c.nz_ - 2)
    else:
        c.poly(pts, col, bevel=7.0, mat=mat, line="ink")


def high_collar(c, B, col, lining, h=16.0, w=15.0):
    """a vampire's high standing collar, fanned behind the head"""
    hx, hy = B.head
    nx, ny = B.neck
    if B.view == 2:
        pts = [(nx - 2, ny + 3), (nx - 9, hy - h * 0.55), (nx - 5, hy - h * 0.75), (nx + 1, ny - 2)]
        c.poly(pts, lining if False else col, bevel=2.5, mat="silk", line="ink")
        return
    pts = [(nx - w * 0.35, ny + 3), (nx - w, hy - h * 0.35), (nx - w * 0.75, hy - h * 0.62), (nx - 3, ny - 4),
           (nx + 3, ny - 4), (nx + w * 0.75, hy - h * 0.62), (nx + w, hy - h * 0.35), (nx + w * 0.35, ny + 3)]
    c.poly(pts, col, bevel=2.5, mat="silk", line="ink")
    if B.view == 0:
        inner = [(nx - w * 0.3, ny + 1), (nx - w * 0.82, hy - h * 0.33), (nx - w * 0.66, hy - h * 0.5), (nx - 3, ny - 3),
                 (nx + 3, ny - 3), (nx + w * 0.66, hy - h * 0.5), (nx + w * 0.82, hy - h * 0.33), (nx + w * 0.3, ny + 1)]
        c.poly(inner, lining, bevel=2.0, mat="silk", line=None, part=c.nz_ - 1)


def face_human(c, B, hr, skin, eyes="red", brow="#1a1014", mouth="fangs", P=None, nose=True, cheek=True, ear=True):
    """a head: the skull's oval, ears, brows, glowing eyes with a dark lid, nose and mouth; in profile a true profile"""
    hx, hy = B.head
    v = B.view
    rx, ry = hr, hr * 1.18
    if v == 2:
        c.ell(hx, hy, rx * 0.92, ry, skin, mat="skin", line="ink", part=900)
        c.ell(hx + rx * 0.72, hy + ry * 0.12, rx * 0.36, ry * 0.25, skin, mat="skin", line=None, part=900)   # nose
        c.ell(hx + rx * 0.35, hy + ry * 0.55, rx * 0.45, ry * 0.32, skin, mat="skin", line=None, part=900)   # jaw
        if ear:
            c.ell(hx - rx * 0.15, hy + ry * 0.05, rx * 0.2, ry * 0.26, skin, mat="skin", line="soft", tone=-1)
        c.ell(hx + rx * 0.42, hy - ry * 0.02, rx * 0.2, ry * 0.11, sw.INK, line=None)
        c.dot(hx + rx * 0.47, hy - ry * 0.02, "#ff3a50", r=rx * 0.11, glow=eyes)
        c.tube([(hx + rx * 0.22, hy - ry * 0.22, 0.7), (hx + rx * 0.65, hy - ry * 0.2, 0.8)], brow, line=None)
        if mouth:
            c.tube([(hx + rx * 0.4, hy + ry * 0.48, 0.6), (hx + rx * 0.72, hy + ry * 0.45, 0.6)], "#3a1014" if mouth else skin, line=None)
            if mouth == "fangs":
                c.tube([(hx + rx * 0.62, hy + ry * 0.47, 0.5), (hx + rx * 0.6, hy + ry * 0.66, 0.35)], "#f4ecdc", line=None, mat="tooth")
        return
    if v == 1:
        c.ell(hx, hy, rx, ry, skin, mat="skin", line="ink", part=900)
        if ear:
            for s_ in (-1, 1):
                c.ell(hx + s_ * rx * 0.98, hy + ry * 0.05, rx * 0.18, ry * 0.25, skin, mat="skin", line="soft", tone=-1)
        return
    if ear:
        for s_ in (-1, 1):
            c.ell(hx + s_ * rx * 0.98, hy + ry * 0.05, rx * 0.2, ry * 0.26, skin, mat="skin", line="ink", tone=-1)
    c.ell(hx, hy, rx, ry, skin, mat="skin", line="ink", part=900, flat=1.7)
    c.ell(hx, hy + ry * 0.55, rx * 0.62, ry * 0.42, skin, mat="skin", line=None, part=900, flat=1.7)   # jaw
    if cheek:
        for s_ in (-1, 1):
            c.ell(hx + s_ * rx * 0.45, hy + ry * 0.3, rx * 0.2, ry * 0.1, skin, mat="skin", line=None, tone=-1, part=900)
    for s_ in (-1, 1):
        ex = hx + s_ * rx * 0.4
        c.ell(ex, hy - ry * 0.0, rx * 0.3, ry * 0.17, sw.INK, line=None, part=901, rot=-s_ * 12)
        c.dot(ex + s_ * rx * 0.04, hy + ry * 0.01, "#ff3a50", r=rx * 0.15, glow=eyes, line=None, part=902)
        c.tube([(hx + s_ * rx * 0.1, hy - ry * 0.15, 0.9), (hx + s_ * rx * 0.72, hy - ry * 0.32, 1.1)], brow, line=None, part=903)
    if nose:
        c.ell(hx, hy + ry * 0.2, rx * 0.12, ry * 0.18, skin, line=None, tone=-1, part=904)
    if mouth:
        mw = rx * (0.38 if (P or {}).get("mouth", 0) else 0.3)
        mh = 0.7 + 0.7 * (P or {}).get("mouth", 0)
        c.ell(hx, hy + ry * 0.52, mw, mh, "#2a1018", line=None, part=905)
        if mouth == "fangs":
            for s_ in (-1, 1):
                c.tube([(hx + s_ * mw * 0.55, hy + ry * 0.5, 0.55), (hx + s_ * mw * 0.5, hy + ry * 0.5 + 1.8 + mh * 0.6, 0.3)], "#f4ecdc", line=None, mat="tooth", part=906)


def hand(c, at, r, col, claws=None, n=3, spread=0.0, dirn=(0.0, 1.0), **o):
    c.ell(at[0], at[1], r, r * 1.1, col, mat="skin", **o)
    if claws:
        dx, dy = dirn
        for i in range(n):
            a = (i - (n - 1) / 2) * 0.45 + spread
            ca, sa = math.cos(a), math.sin(a)
            vx, vy = dx * ca - dy * sa, dx * sa + dy * ca
            x0, y0 = at[0] + vx * r * 0.8, at[1] + vy * r * 0.8
            c.tube([(x0, y0, r * 0.32), (x0 + vx * r * 1.3, y0 + vy * r * 1.3, r * 0.12)], claws, line="soft", mat="horn")


def crown(c, B, hr, col="#e0c060", gem="#a02030", pts=5, h=7.0, glow=None):
    hx, hy = B.head
    top = hy - hr * 1.05
    if B.view == 2:
        c.poly([(hx - hr * 0.7, top + 3), (hx + hr * 0.6, top + 3), (hx + hr * 0.7, top - h * 0.7), (hx + hr * 0.25, top - h * 0.25), (hx, top - h), (hx - hr * 0.3, top - h * 0.3), (hx - hr * 0.75, top - h * 0.75)], col, bevel=1.5, mat="gold", line="ink")
        c.dot(hx + hr * 0.25, top - 0.5, gem, r=1.3, mat="gem", line=None, glow=glow)
        return
    w = hr * 0.95
    ps = [(hx - w, top + 3), (hx + w, top + 3)]
    for i in range(pts * 2 + 1):
        f = i / (pts * 2)
        x = hx + w - f * 2 * w
        y = top - (h if i % 2 == 0 else h * 0.35) * (1.0 if 0 < i < pts * 2 else 0.85)
        if i == pts:
            y -= 2
        ps.append((x, y))
    c.poly(ps, col, bevel=1.5, mat="gold", line="ink")
    if B.view == 0:
        c.dot(hx, top - 0.3, gem, r=1.6, mat="gem", line="ink", glow=glow)


# ================================================================ heads
# ---------------------------------------------------------------- heads and hats (playtest1r)


def skull(c, B, r, bone, eyes="blue", jaw_open=0.0, crack=True):
    hx, hy = B.head
    v = B.view
    if v == 2:
        c.ell(hx - 1, hy - 1, r * 0.95, r * 1.0, bone, mat="bone", line="ink", part=910)
        c.poly([(hx - 2, hy + r * 0.3), (hx + r * 0.9, hy + r * 0.25), (hx + r * 0.85, hy + r * 0.8), (hx + r * 0.2, hy + r * 0.9)], bone, bevel=2, mat="bone", line=None, part=910)
        c.ell(hx + r * 0.42, hy + r * 0.05, r * 0.3, r * 0.27, sw.INK, line=None, part=911)
        c.dot(hx + r * 0.48, hy + r * 0.08, "#4ab8ff", r=r * 0.13, glow=eyes, line=None, part=912)
        c.ell(hx + r * 0.82, hy + r * 0.38, r * 0.1, r * 0.14, sw.INK, line=None, part=913)
        jy = hy + r * 0.95 + jaw_open * 2.5
        c.poly([(hx - r * 0.1, jy - 3), (hx + r * 0.85, jy - 2), (hx + r * 0.8, jy + 1.5), (hx, jy + 2)], bone, bevel=1.5, mat="bone", line="ink", part=914)
        for i in range(4):
            c.tube([(hx + r * (0.2 + 0.18 * i), hy + r * 0.82, 0.55), (hx + r * (0.2 + 0.18 * i), hy + r * 0.95, 0.5)], sw.INK, line=None, part=915)
        return
    c.ell(hx, hy - 1, r, r * 1.02, bone, mat="bone", line="ink", part=910, flat=1.3)
    if v == 1:
        if crack:
            c.tube([(hx + 1, hy - r * 0.9, 0.5), (hx + 3, hy - r * 0.4, 0.5), (hx + 1.5, hy, 0.4)], sw.dk(bone, 2), line=None, part=910)
        return
    c.poly([(hx - r * 0.7, hy + r * 0.3), (hx + r * 0.7, hy + r * 0.3), (hx + r * 0.55, hy + r * 0.95), (hx - r * 0.55, hy + r * 0.95)], bone, bevel=2, mat="bone", line=None, part=910)
    for s_ in (-1, 1):
        c.ell(hx + s_ * r * 0.38, hy + r * 0.08, r * 0.3, r * 0.28, sw.INK, line=None, part=911)
        c.dot(hx + s_ * r * 0.36, hy + r * 0.12, "#4ab8ff", r=r * 0.13, glow=eyes, line=None, part=912)
    c.poly([(hx, hy + r * 0.35), (hx - r * 0.13, hy + r * 0.6), (hx + r * 0.13, hy + r * 0.6)], sw.INK, bevel=0.5, line=None, part=913)
    jy = hy + r * 0.98 + jaw_open * 2.5
    c.poly([(hx - r * 0.55, jy - 3), (hx + r * 0.55, jy - 3), (hx + r * 0.4, jy + 2), (hx - r * 0.4, jy + 2)], bone, bevel=1.5, mat="bone", line="ink", part=914)
    for i in range(-2, 3):
        c.tube([(hx + i * r * 0.17, hy + r * 0.78, 0.55), (hx + i * r * 0.17, hy + r * 0.98 + jaw_open, 0.5)], sw.INK, line=None, part=915)
    if crack:
        c.tube([(hx - r * 0.2, hy - r * 0.95, 0.5), (hx - r * 0.35, hy - r * 0.55, 0.5), (hx - r * 0.2, hy - r * 0.35, 0.4)], sw.dk(bone, 2), line=None, part=916)


def lich_crown(c, B, r, col="#3a4048", gem="#4ab8ff", glow="blue"):
    hx, hy = B.head
    top = hy - r * 0.85
    if B.view == 2:
        c.poly([(hx - r * 0.95, top + 3), (hx + r * 0.75, top + 3), (hx + r * 0.85, top - 9), (hx + r * 0.4, top - 2), (hx, top - 12), (hx - r * 0.4, top - 2), (hx - r * 0.95, top - 9)], col, bevel=1.2, mat="metal", line="ink")
        c.dot(hx + r * 0.35, top, gem, r=1.4, glow=glow, line=None)
        return
    ps = [(hx - r * 1.02, top + 3), (hx + r * 1.02, top + 3), (hx + r * 1.05, top - 8), (hx + r * 0.62, top - 1), (hx + r * 0.45, top - 11), (hx + r * 0.2, top - 1), (hx, top - 14), (hx - r * 0.2, top - 1), (hx - r * 0.45, top - 11), (hx - r * 0.62, top - 1), (hx - r * 1.05, top - 8)]
    c.poly(ps, col, bevel=1.2, mat="metal", line="ink")
    if B.view == 0:
        c.dot(hx, top + 0.5, gem, r=1.7, glow=glow, line=None)
        for s_ in (-1, 1):
            c.dot(hx + s_ * r * 0.55, top + 1, gem, r=1.0, glow=glow, line=None)


def witch_hat(c, B, r, col, band, P, tall=34.0):
    hx, hy = B.head
    v = B.view
    brim_y = hy - r * 0.62
    sway = P["sway"]
    if v == 2:
        c.ell(hx + 1, brim_y, r * 1.9, r * 0.38, col, mat="cloth", line="ink", flat=0.6)
        c.poly([(hx - r * 0.8, brim_y), (hx + r * 0.9, brim_y), (hx + r * 0.2, brim_y - tall * 0.55), (hx - r * 0.5 - sway, brim_y - tall * 0.95), (hx - r * 1.6 - sway * 1.4, brim_y - tall * 0.8), (hx - r * 0.65, brim_y - tall * 0.5)], col, bevel=4, mat="cloth", line="ink")
        c.poly([(hx - r * 0.82, brim_y - 1), (hx + r * 0.88, brim_y - 1), (hx + r * 0.75, brim_y - 5), (hx - r * 0.72, brim_y - 5)], band, bevel=1, mat="cloth", line="soft")
        return
    c.ell(hx, brim_y, r * 2.0, r * 0.42, col, mat="cloth", line="ink", flat=0.6)
    c.poly([(hx - r * 0.95, brim_y), (hx + r * 0.95, brim_y), (hx + r * 0.35, brim_y - tall * 0.6), (hx + r * 0.9 + sway, brim_y - tall * 0.92), (hx + r * 1.6 + sway * 1.5, brim_y - tall * 0.78), (hx + r * 0.25, brim_y - tall * 0.98), (hx - r * 0.25, brim_y - tall * 0.6)], col, bevel=4, mat="cloth", line="ink")
    c.poly([(hx - r * 0.95, brim_y - 1), (hx + r * 0.95, brim_y - 1), (hx + r * 0.82, brim_y - 5.5), (hx - r * 0.82, brim_y - 5.5)], band, bevel=1, mat="cloth", line="soft")
    if v == 0:
        c.poly([(hx - 3, brim_y - 2), (hx + 3, brim_y - 2), (hx + 3, brim_y - 6.5), (hx - 3, brim_y - 6.5)], "#e0c060", bevel=0.8, mat="gold", line="ink")


def wolf_head(c, B, r, fur, P, eyes="red", nose="#140c10", inner="#6a3030"):
    hx, hy = B.head
    v = B.view
    snarl = P.get("mouth", 0)
    if v == 2:
        # ears back, the long snout forward
        c.poly([(hx - r * 0.6, hy - r * 0.4), (hx - r * 0.1, hy - r * 0.6), (hx - r * 0.75, hy - r * 1.75)], fur, bevel=2, mat="fur", line="ink")
        c.ell(hx - 1, hy, r * 0.95, r * 0.9, fur, mat="fur", line="ink", part=920)
        c.poly([(hx + r * 0.2, hy - r * 0.35), (hx + r * 1.75, hy + r * 0.05), (hx + r * 1.8, hy + r * 0.4), (hx + r * 0.3, hy + r * 0.55)], fur, bevel=3, mat="fur", line=None, part=920)
        jaw = 1.5 + snarl * 2.2
        c.poly([(hx + r * 0.2, hy + r * 0.45), (hx + r * 1.55, hy + r * 0.45 + jaw * 0.6), (hx + r * 1.45, hy + r * 0.75 + jaw), (hx + r * 0.3, hy + r * 0.9)], sw.dk(fur), bevel=2, mat="fur", line="ink", part=921)
        c.poly([(hx + r * 0.45, hy + r * 0.48), (hx + r * 1.6, hy + r * 0.42), (hx + r * 1.5, hy + r * 0.48 + jaw * 0.7), (hx + r * 0.5, hy + r * 0.6 + jaw * 0.3)], inner, bevel=0.5, line=None, part=922)
        for i in range(4):
            x = hx + r * (0.6 + 0.25 * i)
            c.poly([(x - 0.8, hy + r * 0.45), (x + 0.8, hy + r * 0.45), (x, hy + r * 0.45 + 2.2)], "#f4ecdc", bevel=0.4, mat="tooth", line=None, part=923)
        c.ell(hx + r * 1.78, hy + r * 0.12, r * 0.2, r * 0.17, nose, line=None, part=924)
        c.ell(hx + r * 0.5, hy - r * 0.2, r * 0.22, r * 0.12, sw.INK, line=None, part=925, rot=12)
        c.dot(hx + r * 0.55, hy - r * 0.2, "#ff3a50", r=r * 0.11, glow=eyes, line=None, part=926)
        c.tube([(hx - r * 0.2, hy + r * 0.3, 2.0), (hx - r * 0.7, hy + r * 1.0, 3.2)], sw.dk(fur), mat="fur", line=None)   # the ruff
        return
    for s_ in (-1, 1):
        c.poly([(hx + s_ * r * 0.25, hy - r * 0.55), (hx + s_ * r * 0.95, hy - r * 0.2), (hx + s_ * r * 0.95, hy - r * 1.6)], fur, bevel=2.2, mat="fur", line="ink")
        if v == 0:
            c.poly([(hx + s_ * r * 0.45, hy - r * 0.55), (hx + s_ * r * 0.85, hy - r * 0.35), (hx + s_ * r * 0.88, hy - r * 1.25)], inner, bevel=1, line=None)
    c.ell(hx, hy, r * 1.05, r * 0.92, fur, mat="fur", line="ink", part=920)
    # cheek ruff
    for s_ in (-1, 1):
        c.poly([(hx + s_ * r * 0.7, hy - r * 0.1), (hx + s_ * r * 1.35, hy + r * 0.45), (hx + s_ * r * 0.9, hy + r * 0.55), (hx + s_ * r * 1.15, hy + r * 0.85), (hx + s_ * r * 0.5, hy + r * 0.75)], fur, bevel=2, mat="fur", line="soft", part=920)
    if v == 1:
        return
    c.ell(hx, hy + r * 0.45, r * 0.55, r * 0.45, sw.lt(fur), mat="fur", line=None, part=920)   # muzzle
    jaw = 1.0 + snarl * 1.8
    c.ell(hx, hy + r * 0.7 + jaw * 0.4, r * 0.4, 1.0 + jaw * 0.6, inner, line=None, part=922)
    for s_ in (-1, 1):
        c.poly([(hx + s_ * r * 0.25 - 0.9, hy + r * 0.62), (hx + s_ * r * 0.25 + 0.9, hy + r * 0.62), (hx + s_ * r * 0.25, hy + r * 0.62 + 2.8)], "#f4ecdc", bevel=0.4, mat="tooth", line=None, part=923)
    c.ell(hx, hy + r * 0.3, r * 0.22, r * 0.15, nose, line=None, part=924)
    for s_ in (-1, 1):
        c.ell(hx + s_ * r * 0.42, hy - r * 0.12, r * 0.24, r * 0.13, sw.INK, line=None, part=925, rot=-s_ * 18)
        c.dot(hx + s_ * r * 0.42, hy - r * 0.11, "#ff3a50", r=r * 0.12, glow=eyes, line=None, part=926)
        c.tube([(hx + s_ * r * 0.15, hy - r * 0.28, 1.0), (hx + s_ * r * 0.7, hy - r * 0.38, 1.1)], sw.dk(fur, 2), line=None, part=927)


def pumpkin_head(c, B, r, rind, P, face="#f4e27a", jag=True, stem="#3a4a20", glow="fire"):
    hx, hy = B.head
    v = B.view
    rx, ry = r * 1.25, r * 1.0
    c.ell(hx, hy, rx, ry, rind, mat="rind", line="ink", part=930, flat=1.2)
    for s_ in (-1, 1):
        c.ell(hx + s_ * rx * 0.55, hy + 0.5, rx * 0.5, ry * 0.95, rind, mat="rind", line="soft", part=931 + (s_ > 0), flat=1.1)
    c.ell(hx, hy - 0.5, rx * 0.45, ry * 1.0, rind, mat="rind", line="soft", part=933, flat=1.3)
    c.tube([(hx, hy - ry * 0.85, 2.0), (hx + 2, hy - ry * 1.25, 1.6), (hx + 5, hy - ry * 1.4, 1.2)], stem, mat="vine", line="ink")
    if v == 1:
        return
    sx = 0.55 if v == 2 else 0.0
    ox = hx + (rx * 0.35 if v == 2 else 0)
    k = 0.75 if v == 2 else 1.0
    m = P.get("mouth", 0)
    def tri(cx_, cy_, w, h, up=True):
        return [(cx_ - w, cy_ + (h if up else 0)), (cx_ + w, cy_ + (h if up else 0)), (cx_, cy_ + (0 if up else h))] if up else [(cx_ - w, cy_), (cx_ + w, cy_), (cx_, cy_ + h)]
    for s_ in ((-1, 1) if v != 2 else (1,)):
        ex = ox + s_ * rx * 0.38 * k if v != 2 else ox + rx * 0.15
        c.poly([(ex - r * 0.28, hy - r * 0.05), (ex + r * 0.28, hy - r * 0.05), (ex + s_ * r * 0.05, hy - r * 0.45)], face, bevel=0.8, glow=glow, line="ink", part=934)
    # the jagged carved grin
    w = rx * (0.62 if v != 2 else 0.38)
    top = hy + r * 0.22
    bot = hy + r * 0.62 + m * 1.2
    n = 7 if v != 2 else 4
    pts = []
    for i in range(n + 1):
        f = i / n
        x = ox - w + 2 * w * f
        pts.append((x, top + (r * 0.12 if (i % 2 and jag) else 0) - (math.sin(f * math.pi) * r * 0.1)))
    for i in range(n, -1, -1):
        f = i / n
        x = ox - w + 2 * w * f
        pts.append((x, bot - (r * 0.14 if (i % 2 == 0 and jag and 0 < i < n) else 0) - (1 - math.sin(f * math.pi)) * r * 0.25))
    c.poly(pts, face, bevel=0.8, glow=glow, line="ink", part=935)


def goat_head(c, B, r, fur, horn, P, eyes="red", tongue="#c43838"):
    """Krampus: a long goat face, horns curling back and out, a beard, the long tongue"""
    hx, hy = B.head
    v = B.view
    m = P.get("mouth", 0)
    if v == 2:
        c.tube([(hx - 1, hy - r * 0.6, 3.0), (hx - 6, hy - r * 1.6, 2.4), (hx - 14, hy - r * 1.5, 1.8), (hx - 17, hy - r * 0.7, 1.2), (hx - 14, hy - r * 0.2, 0.8)], horn, mat="horn", line="ink")
        c.ell(hx - 1, hy, r * 0.9, r * 0.95, fur, mat="fur", line="ink", part=940)
        c.poly([(hx + r * 0.1, hy - r * 0.4), (hx + r * 1.3, hy + r * 0.2), (hx + r * 1.2, hy + r * 0.8), (hx + r * 0.1, hy + r * 0.85)], fur, bevel=3, mat="fur", line=None, part=940)
        c.poly([(hx - r * 0.1, hy + r * 0.6), (hx + r * 0.9, hy + r * 0.8), (hx + r * 0.3, hy + r * 2.0), (hx - r * 0.3, hy + r * 1.4)], sw.dk(fur), bevel=2, mat="fur", line="soft")
        c.ell(hx - r * 0.55, hy - r * 0.1, r * 0.45, r * 0.2, fur, mat="fur", line="ink", rot=20)
        c.ell(hx + r * 0.45, hy - r * 0.15, r * 0.22, r * 0.13, sw.INK, line=None, part=941)
        c.dot(hx + r * 0.5, hy - r * 0.15, "#ff3a50", r=r * 0.12, glow=eyes, line=None, part=942)
        c.tube([(hx + r * 1.0, hy + r * 0.7, 1.4), (hx + r * 1.4, hy + r * 1.4 + m, 1.3), (hx + r * 1.2, hy + r * 2.0 + m * 1.5, 1.0)], tongue, mat="mouth", line="ink")
        c.ell(hx + r * 1.25, hy + r * 0.25, r * 0.12, r * 0.1, sw.INK, line=None, part=943)
        return
    for s_ in (-1, 1):
        c.tube([(hx + s_ * r * 0.5, hy - r * 0.75, 3.0), (hx + s_ * r * 1.2, hy - r * 1.7, 2.6), (hx + s_ * r * 2.1, hy - r * 1.9, 2.0), (hx + s_ * r * 2.6, hy - r * 1.3, 1.4), (hx + s_ * r * 2.3, hy - r * 0.8, 0.8)], horn, mat="horn", line="ink")
    for s_ in (-1, 1):
        c.ell(hx + s_ * r * 1.05, hy - r * 0.15, r * 0.5, r * 0.2, fur, mat="fur", line="ink", rot=s_ * 25)
    c.ell(hx, hy, r * 0.85, r * 1.0, fur, mat="fur", line="ink", part=940)
    if v == 1:
        return
    c.poly([(hx - r * 0.55, hy + r * 0.35), (hx + r * 0.55, hy + r * 0.35), (hx + r * 0.25, hy + r * 1.9), (hx, hy + r * 2.2), (hx - r * 0.25, hy + r * 1.9)], sw.dk(fur), bevel=2, mat="fur", line="soft", part=944)
    c.ell(hx, hy + r * 0.5, r * 0.45, r * 0.35, sw.lt(fur), mat="fur", line=None, part=945)
    c.ell(hx, hy + r * 0.35, r * 0.2, r * 0.1, sw.INK, line=None, part=946)
    c.ell(hx, hy + r * 0.78, r * 0.32, 1.0 + m * 0.8, "#2a1018", line=None, part=947)
    c.tube([(hx, hy + r * 0.8, 1.6), (hx + 1, hy + r * 1.5 + m, 1.5), (hx - 1, hy + r * 2.2 + m * 1.5, 1.1)], tongue, mat="mouth", line="ink", part=948)
    for s_ in (-1, 1):
        c.ell(hx + s_ * r * 0.38, hy - r * 0.12, r * 0.25, r * 0.14, sw.INK, line=None, part=949, rot=-s_ * 20)
        c.dot(hx + s_ * r * 0.38, hy - r * 0.1, "#ff3a50", r=r * 0.12, glow=eyes, line=None, part=950)


# ================================================================ person
# ---------------------------------------------------------------- the dressed humanoid (playtest1r)


def _dir(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1.0
    return dx / L, dy / L


def leg(c, B, side, pal, sp, tone=0):
    j = B.joints["leg" + side]
    h, k, a = j["h"], j["k"], j["a"]
    kind = sp.get("legs", "pants")
    col = pal.get("pants", pal.get("skin")) if kind in ("pants", "boots") else pal.get("leg", pal["skin"])
    mat = {"pants": "cloth", "bare": "skin", "bone": "bone", "fur": "fur", "wrap": "wrap", "straw": "straw", "bark": "bark"}.get(kind, "cloth")
    rt, rk, ra = sp.get("leg_r", (6.0, 4.6, 3.6))
    if kind == "bone":
        rt, rk, ra = 2.4, 2.6, 2.0
    if sp.get("digi"):
        # a beast's hind leg: thigh forward, the hock kicked back, the paw on its toes
        dx = 1 if B.view == 2 else 0
        hock = (k[0] - 6 * dx, k[1] + (a[1] - k[1]) * 0.62)
        c.tube([(h[0], h[1], rt + 1), (k[0], k[1], rk + 0.5), (hock[0], hock[1], rk * 0.75), (a[0], a[1], ra)], col, mat=mat, tone=tone)
    else:
        c.tube([(h[0], h[1], rt), (k[0], k[1], rk), (a[0], a[1], ra)], col, mat=mat, tone=tone)
        if kind == "bone":
            c.ell(k[0], k[1], 3.0, 2.6, col, mat="bone", tone=tone, line="soft")
    foot = sp.get("foot", "boot")
    fc = pal.get("boot", "#2a241c")
    if foot == "none":
        return
    if B.view == 2:
        if foot == "paw":
            c.ell(a[0] + 3.5, 147.5, 5.5, 2.8, pal.get("leg", pal["skin"]), mat="fur", tone=tone)
            for i in range(3):
                c.tube([(a[0] + 6 + i * 1.2, 148.5, 0.9), (a[0] + 8.5 + i * 1.2, 149.6, 0.4)], pal.get("claw", "#e8e0d0"), line=None, mat="horn", tone=tone)
        elif foot == "hoof":
            c.poly([(a[0] - 3, a[1] - 3), (a[0] + 3.5, a[1] - 3), (a[0] + 4.5, 149.8), (a[0] - 3.5, 149.8)], fc, bevel=1.5, mat="horn", tone=tone)
        elif foot == "bone":
            c.tube([(a[0] - 1, 148.6, 1.6), (a[0] + 6, 148.8, 1.2)], col, mat="bone", tone=tone)
        else:
            c.poly([(a[0] - 3.5, a[1] - 4), (a[0] + 3, a[1] - 4), (a[0] + 4, 145.5), (a[0] + 8, 147.0), (a[0] + 8.2, 149.8), (a[0] - 4, 149.8)], fc, bevel=2.0, mat="leather", tone=tone)
    else:
        if foot == "paw":
            c.ell(a[0], 147.6, 4.6, 2.6, pal.get("leg", pal["skin"]), mat="fur", tone=tone)
            for i in (-1, 0, 1):
                c.tube([(a[0] + i * 2.2, 148.6, 0.8), (a[0] + i * 2.6, 149.7, 0.4)], pal.get("claw", "#e8e0d0"), line=None, mat="horn")
        elif foot == "hoof":
            c.poly([(a[0] - 3.5, a[1] - 3), (a[0] + 3.5, a[1] - 3), (a[0] + 4, 149.8), (a[0] + 0.5, 149.8), (a[0], 147.5), (a[0] - 0.5, 149.8), (a[0] - 4, 149.8)], fc, bevel=1.5, mat="horn", tone=tone)
        elif foot == "bone":
            c.ell(a[0], 148.5, 3.2, 1.5, col, mat="bone", tone=tone)
        else:
            c.poly([(a[0] - 4, a[1] - 4), (a[0] + 4, a[1] - 4), (a[0] + 4.8, 149.8), (a[0] - 4.8, 149.8)], fc, bevel=2.2, mat="leather", tone=tone)


def arm(c, B, side, pal, sp, tone=0):
    j = B.joints[side]
    s_, e, h = j["s"], j["e"], j["h"]
    kind = sp.get("arms", "sleeve")
    col = {"sleeve": pal.get("sleeve", pal.get("cloth")), "bare": pal["skin"], "bone": pal["skin"], "fur": pal.get("fur", pal["skin"]),
           "wrap": pal["skin"], "straw": pal.get("sleeve", pal.get("cloth"))}[kind]
    mat = {"sleeve": "cloth", "bare": "skin", "bone": "bone", "fur": "fur", "wrap": "wrap", "straw": "cloth"}[kind]
    r0, r1, r2 = sp.get("arm_r", (5.0, 4.0, 3.4))
    if kind == "bone":
        r0, r1, r2 = 2.2, 2.4, 1.8
    if sp.get("long_arms"):
        pass
    c.tube([(s_[0], s_[1], r0), (e[0], e[1], r1), (h[0], h[1], r2)], col, mat=mat, tone=tone)
    if kind == "bone":
        c.ell(e[0], e[1], 2.8, 2.6, col, mat="bone", tone=tone, line="soft")
        c.ell(s_[0], s_[1], 4.0, 3.6, col, mat="bone", tone=tone, line="soft")
    if kind == "straw":
        # straw tufts out of the cuff
        dx, dy = _dir(e, h)
        for i in (-1, 0, 1):
            c.tube([(h[0], h[1], 1.0), (h[0] + dx * 5 + i * 2.0, h[1] + dy * 5 + abs(i) * 1.0, 0.5)], pal.get("straw", "#c4a15a"), mat="straw", line="soft", tone=tone)
        return
    cuff = pal.get("cuff")
    dx, dy = _dir(e, h)
    if cuff and kind == "sleeve":
        c.ell(h[0] - dx * 1.5, h[1] - dy * 1.5, r2 + 1.6, 2.4, cuff, rot=math.degrees(math.atan2(dy, dx)) + 90, mat="cloth", tone=tone)
    hk = sp.get("hand", "hand")
    hc = pal.get("hand", pal["skin"])
    at = (h[0] + dx * 2.6, h[1] + dy * 2.6)
    if hk == "claw":
        hand(c, at, 3.0, hc, claws=pal.get("claw", "#e8e0d0"), n=3, dirn=(dx, dy), tone=tone)
    elif hk == "bigclaw":
        hand(c, at, 4.0, hc, claws=pal.get("claw", "#e8e0d0"), n=4, dirn=(dx, dy), tone=tone)
    elif hk == "bone":
        c.ell(at[0], at[1], 2.4, 2.6, hc, mat="bone", tone=tone)
        for i in (-1, 0, 1):
            c.tube([(at[0] + i * 1.3, at[1] + 1, 0.7), (at[0] + i * 1.6 + dx * 3, at[1] + dy * 4 + 1, 0.5)], hc, mat="bone", line=None, tone=tone)
    elif hk == "glove":
        c.ell(at[0], at[1], 3.0, 3.2, pal.get("glove", "#2a241c"), mat="leather", tone=tone)
    elif hk != "none":
        c.ell(at[0], at[1], 2.8, 3.0, hc, mat="skin", tone=tone)


def torso(c, B, pal, sp, col=None, mat="cloth", top_y=None):
    cx, hy = B.hip
    nx, ny = B.neck
    sh = sp["shoulder"]
    wa = sp.get("waist", sh * 0.62)
    hw = sp.get("hips", sh * 0.7)
    col = col or pal.get("cloth")
    if B.view == 2:
        ch = sp.get("chest_d", 9.0)
        bk = sp.get("back_d", 7.0) + sp.get("hump", 0)
        mx, my = B.chest
        pts = [(cx - hw * 0.75, hy + 2), (cx + hw * 0.7, hy + 2), (cx + wa * 0.65, (hy + my) / 2), (mx + ch, my), (nx + ch * 0.6, ny + 6), (nx + 3, ny - 1), (nx - 4, ny - 1), (nx - bk * 0.9, ny + 5), (mx - bk, my + 2), (cx - wa * 0.8, (hy + my) / 2)]
    else:
        my = B.chest[1]
        pts = [(cx - hw, hy + 3), (cx + hw, hy + 3), (cx + wa, (hy + my) / 2 + 2), (nx + sh * 0.92, my - 3), (nx + sh, ny + 5), (nx + sh * 0.7, ny + 1), (nx + 4, ny - 1),
               (nx - 4, ny - 1), (nx - sh * 0.7, ny + 1), (nx - sh, ny + 5), (nx - sh * 0.92, my - 3), (cx - wa, (hy + my) / 2 + 2)]
    c.poly(pts, col, bevel=6.0, mat=mat)
    return pts


def reach(x, y, dx, dy, L, short=0.55):
    """how long a held thing pointing (dx, dy) from (x, y) may be and stay in the cell (REACH_X, REACH_UP): L, or as
    much of it as fits, never under short x L"""
    lo = L * short
    l = L
    while l > lo:
        tx, ty = x + dx * l, y + dy * l
        if abs(tx - 40.0) <= REACH_X - 9 and 150.0 - ty <= REACH_UP - 3:
            break
        l -= 0.5
    return l


def held(c, B, pal, sp, P, kind, front=True):
    """the weapon or tool in the right hand"""
    j = B.joints["R"]
    h, e = j["h"], j["e"]
    dx, dy = _dir(e, h)
    hx, hy = h[0] + dx * 2.6, h[1] + dy * 2.6
    v = B.view
    tone = 0
    if kind == "staff":
        # held upright beside the body; the head glows with the cast
        g = 3.5 + 3.5 * P["glow"]
        up = reach(hx, hy, 0.0, -1.0, 48 + 2 * g, short=0.3) - 4 - 2 * g
        top = (hx + (2 if v == 2 else 0), hy - up)
        bot = (hx - (1 if v == 2 else 0), min(149, hy + 78 - up))
        if P["glow"] >= 0.9:
            top = (hx + dx * 6, hy - up)
        c.tube([(bot[0], bot[1], 1.6), (top[0], top[1], 2.0)], pal.get("wood", "#4a3424"), mat="wood")
        g = 3.5 + 3.5 * P["glow"]
        prong = pal.get("prong", "#c4b48a")
        c.tube([(top[0] - 4, top[1] + 2, 1.2), (top[0] - 4.5, top[1] - 6, 0.8)], prong, mat="bone", line="soft")
        c.tube([(top[0] + 4, top[1] + 2, 1.2), (top[0] + 4.5, top[1] - 6, 0.8)], prong, mat="bone", line="soft")
        c.ell(top[0], top[1] - 4, g, g, pal.get("orb", "#4ab8ff"), glow=pal.get("orb_glow", "blue"), line=None)
    elif kind == "broom":
        a = math.radians(-35 if v != 2 else -20)
        L = 62
        ux_, uy_ = -math.sin(a) * (1 if v != 1 else -1), math.cos(a)
        L = min(L, reach(hx, hy, ux_, uy_, L * 0.65 + 14, short=0.5) / 0.65 - 14 / 0.65, reach(hx, hy, -ux_, -uy_, L * 0.35, short=0.4) / 0.35)
        tx, ty = hx + math.sin(a) * L * 0.35 * (1 if v != 1 else -1), hy - math.cos(a) * L * 0.35
        bx, by = hx - math.sin(a) * L * 0.65 * (1 if v != 1 else -1), min(146, hy + math.cos(a) * L * 0.65)
        c.tube([(tx, ty, 1.5), (bx, by, 1.7)], pal.get("wood", "#5a4030"), mat="wood")
        # the bristles, bound
        ux, uy = _dir((tx, ty), (bx, by))
        c.poly([(bx - uy * 3, by + ux * 3), (bx + uy * 3, by - ux * 3), (bx + ux * 13 + uy * 7, by + uy * 13 - ux * 7), (bx + ux * 14, by + uy * 14), (bx + ux * 13 - uy * 7, by + uy * 13 + ux * 7)], pal.get("straw", "#c4a15a"), bevel=2.5, mat="straw")
        c.tube([(bx - uy * 3.4, by + ux * 3.4, 1.0), (bx + uy * 3.4, by - ux * 3.4, 1.0)], pal.get("band", "#6a3a8a"), mat="cloth", line="soft")
    elif kind == "sword":
        L = reach(hx, hy, dx, dy, 39, short=0.75) - 5
        c.tube([(hx - dx * 3, hy - dy * 3, 1.4), (hx + dx * 2, hy + dy * 2, 1.4)], pal.get("hilt", "#6a5040"), mat="leather")
        c.tube([(hx - dy * 5, hy + dx * 5, 1.2), (hx + dy * 5, hy - dx * 5, 1.2)], pal.get("guard", "#c4a050"), mat="gold", line="soft")
        c.poly([(hx + dx * 2 - dy * 2.4, hy + dy * 2 + dx * 2.4), (hx + dx * 2 + dy * 2.4, hy + dy * 2 - dx * 2.4), (hx + dx * L + dy * 1.0, hy + dy * L - dx * 1.0), (hx + dx * (L + 5), hy + dy * (L + 5)), (hx + dx * L - dy * 1.0, hy + dy * L + dx * 1.0)],
               pal.get("blade", "#b0b6bc"), bevel=1.5, mat="metal")
    elif kind == "dagger":
        L = reach(hx, hy, dx, dy, 14)
        c.poly([(hx - dy * 1.6, hy + dx * 1.6), (hx + dy * 1.6, hy - dx * 1.6), (hx + dx * L, hy + dy * L)], pal.get("blade", "#b0b6bc"), bevel=1.0, mat="metal")
    elif kind == "lantern":
        lx, ly = hx + dx * 3, hy + dy * 3 + 6
        c.tube([(hx, hy, 0.7), (lx, ly - 6, 0.6)], "#3a3228", mat="metal", line=None)
        c.poly([(lx - 5, ly - 5), (lx + 5, ly - 5), (lx + 6, ly + 6), (lx - 6, ly + 6)], "#3a3228", bevel=1.0, mat="metal")
        c.ell(lx, ly + 0.5, 3.6 + P["glow"] * 1.5, 4.2 + P["glow"] * 1.5, "#f4e27a", glow="fire", line=None)
        c.poly([(lx - 6, ly - 6), (lx + 6, ly - 6), (lx + 3, ly - 9), (lx - 3, ly - 9)], "#3a3228", bevel=1.0, mat="metal")
    elif kind == "pitchfork":
        up = reach(hx, hy, 0.0, -1.0, 51, short=0.35) - 11
        top = (hx + 1, hy - up)
        c.tube([(hx - 1, min(149, hy + 70 - up), 1.5), (top[0], top[1], 1.5)], pal.get("wood", "#6a5040"), mat="wood")
        c.tube([(top[0] - 6, top[1], 1.0), (top[0] + 6, top[1], 1.0)], "#6a6e78", mat="metal")
        for i in (-6, 0, 6):
            c.tube([(top[0] + i, top[1], 1.0), (top[0] + i * 1.05, top[1] - 11, 0.5)], "#8a8e94", mat="metal", line="soft")
    elif kind == "chain":
        # a swinging chain of links off the hand (squeezed toward the hand when its swing would leave the cell)
        n = 9
        sw_ = P.get("sway", 0)
        pts = []
        for i in range(n):
            t_ = (i + 1) / n
            pts.append((hx + (dx * 18 + sw_ * 2.5) * t_ + math.sin(t_ * 3.2) * 3, min(147.0, hy + 30 * t_ * t_ + dy * 8 * t_)))
        far = max(abs(x - 40.0) for x, _ in pts)
        f_ = 1.0 if far <= REACH_X - 3 else max(0.2, (REACH_X - 3 - abs(hx - 40.0)) / max(1e-6, far - abs(hx - 40.0)))
        # playtest1s: the links hang on one run of chain (they floated apart, a dot each)
        c.tube([(hx, hy, 0.75)] + [(hx + (x - hx) * f_, y, 0.75) for x, y in pts], "#5a5e66", mat="metal", line="ink")
        for i, (x, y) in enumerate(pts):
            c.ell(hx + (x - hx) * f_, y, 2.2 if i % 2 else 1.4, 1.6 if i % 2 else 2.4, "#8a8e94", mat="metal", line="ink")
    elif kind == "cleaver":
        L = reach(hx, hy, dx, dy, 30) - 8
        c.tube([(hx - dx * 2, hy - dy * 2, 1.4), (hx + dx * 4, hy + dy * 4, 1.4)], "#4a3424", mat="wood")
        c.poly([(hx + dx * 4 - dy * 2, hy + dy * 4 + dx * 2), (hx + dx * L - dy * 2, hy + dy * L + dx * 2), (hx + dx * L + dy * 8, hy + dy * L - dx * 8), (hx + dx * 6 + dy * 7, hy + dy * 6 - dx * 7)], "#8a8e94", bevel=1.5, mat="metal")


def person(c, rank, view, P, sp, pal, head_fn, hooks=None):
    """a dressed humanoid: hooks(stage, c, B) draws the family's own pieces at each stage:
    'back' (behind all), 'far' (side view, behind the body), 'body' (over the torso), 'head' (over the head), 'front' (last)."""
    hooks = hooks or (lambda *a: None)
    if "held_reach" not in sp:
        sp = dict(sp, held_reach={"sword": 22, "broom": 10, "cleaver": 16, "dagger": 8}.get(sp.get("held"), 0))
    B = Body(sp, P, view)
    J = B.joints
    v = view
    hooks("back", c, B)
    # side view: the far limbs first, a shade darker. playtest1s [OWNER-APPROVED 2026-10-04 14:08 ET: playtest1s big sprite audit]: the west
    # row is this drawing turned over, so for it the arms trade places: the right hand and what it holds go behind the
    # body (facing west it is the far hand) and the left comes in front; the west row was the east one in a mirror, the
    # weapon swapping hands
    west = v == 2 and bool(P.get("_west"))
    if v == 2:
        if west:
            if sp.get("held"):
                held(c, B, pal, sp, P, sp["held"])
            arm(c, B, "R", pal, sp, tone=-1)
        elif J["L"]["z"] < 0:
            arm(c, B, "L", pal, sp, tone=-1)
        if sp.get("dress") != "robe":
            leg(c, B, "L", pal, sp, tone=-1)
        hooks("far", c, B)
    elif v == 1:
        hooks("far", c, B)
    else:
        hooks("far", c, B)
    # legs (front and back: the farther-forward leg in front)
    robe = sp.get("dress") == "robe"
    if robe:
        # under a robe only the feet show at the hem
        for s_ in ("L", "R"):
            a = J["leg" + s_]["a"]
            c.ell(a[0] + (3 if v == 2 else 0), 148.0, 4.5, 2.4, pal.get("boot", "#2a241c"), mat="leather", tone=-1 if (v == 2 and s_ == "L") else 0)
    elif v != 2:
        order = sorted(("L", "R"), key=lambda s_: (J["leg" + s_]["fwd"] if v == 0 else -J["leg" + s_]["fwd"]))
        for s_ in order:
            leg(c, B, s_, pal, sp)
    else:
        leg(c, B, "R", pal, sp)
    # arms behind the body (front view: none; back view: arms reaching forward are hidden)
    for s_ in ("L", "R"):
        if v != 2 and J[s_]["z"] < 0:
            arm(c, B, s_, pal, sp)
    style = sp.get("dress", "shirt")
    if style == "robe":
        skirt(c, B, top_w=sp.get("robe_top", 8), hem_w=sp.get("robe_hem", 24) * (0.85 if v == 2 else 1), col=pal.get("robe", pal["cloth"]), hem_y=sp.get("hem_y", 149.5), tatter=sp.get("tatter", 2.0), sway=P["sway"], mat=sp.get("robe_mat", "cloth"), back_flare=sp.get("flare", 6))
    elif style == "coat":
        skirt(c, B, top_w=sp.get("robe_top", 9), hem_w=sp.get("robe_hem", 16) * (0.85 if v == 2 else 1), col=pal.get("coat", pal["cloth"]), hem_y=sp.get("hem_y", 122), tatter=sp.get("tatter", 1.5), sway=P["sway"] * 0.6, mat="cloth", back_flare=3, n=7)
    elif style == "loin":
        cx, hy = B.hip
        if v == 2:
            c.poly([(cx - 6, hy - 2), (cx + 6, hy - 2), (cx + 7 + P["sway"] * 0.3, hy + 16), (cx - 7 + P["sway"] * 0.3, hy + 15)], pal.get("loin", pal["cloth"]), bevel=2, mat="cloth")
        else:
            c.poly([(cx - 9, hy - 2), (cx + 9, hy - 2), (cx + 6, hy + 18), (cx + P["sway"] * 0.3, hy + 20), (cx - 6, hy + 18)], pal.get("loin", pal["cloth"]), bevel=2, mat="cloth")
    tcol = pal.get("torso", pal.get("cloth"))
    if sp.get("torso_fn"):
        sp["torso_fn"](c, B)
    else:
        torso(c, B, pal, sp, col=tcol, mat=sp.get("torso_mat", "cloth"))
    hooks("body", c, B)
    # arms in front
    if v == 2:
        if J["L"]["z"] > 0:
            arm(c, B, "L", pal, sp, tone=-1)
    hk = sp.get("held")
    if hk and v == 1:
        held(c, B, pal, sp, P, hk)
    for s_ in ("L", "R"):
        if v != 2 and J[s_]["z"] > 0:
            arm(c, B, s_, pal, sp)
    if v == 2:
        hooks("prehead", c, B)
    else:
        hooks("prehead", c, B)
    nx, ny = B.neck
    if sp.get("neck_show", True):
        c.tube([(nx, ny + 3, sp.get("neck_r", 3.4)), (B.head[0] * 0.5 + nx * 0.5, (B.head[1] + ny) / 2, sp.get("neck_r", 3.4) * 0.9)], pal.get("neckc", pal["skin"]), mat=sp.get("neck_mat", "skin"), tone=-1)
    head_fn(c, B, P)
    hooks("head", c, B)
    if v == 2 and west:
        arm(c, B, "L", pal, sp)
    elif v == 2:
        if hk:
            held(c, B, pal, sp, P, hk)
        arm(c, B, "R", pal, sp)
    elif hk and v == 0:
        held(c, B, pal, sp, P, hk)
    hooks("front", c, B)
    return B


# ================================================================ fams
# ---------------------------------------------------------------- the families (playtest1r)

BASE = dict(thigh=30, shin=30, foot_h=4, torso=40, neck=4, head=(11, 12), shoulder=16, hipw=7, upper=22, fore=21, sh_drop=4, breathe=1)


def _P(P, **kw):
    q = dict(P)
    q.update(kw)
    return q


def lich(c, rank, view, P):
    pal = {"boss": dict(cloth="#2e1e38", robe="#2e1e38", cape="#1a1428", trim="#8eb4d8", skin="#f4ecdc", orb="#4ab8ff", eyes="blue", wood="#3a2a44", mantle="#3a4458"),
           "mini": dict(cloth="#3a4458", robe="#3a4458", cape="#2e1e38", trim="#8eb4d8", skin="#f4ecdc", orb="#4ab8ff", eyes="blue", wood="#3a2a44", mantle="#2e3848"),
           "rare": dict(cloth="#2a4a38", robe="#2a4a38", cape="#1a2818", trim="#9ec060", skin="#e8e0d0", orb="#9ec060", eyes="green", wood="#2a2018", mantle="#1e3428")}[rank]
    pal["orb_glow"] = pal["eyes"]
    pal["sleeve"] = pal["cloth"]; pal["hand"] = pal["skin"]
    sp = dict(BASE, head=(10, 10.5), shoulder=17, torso=42, lean=4, hunch=8, dress="robe", robe_hem=30, robe_top=9, tatter=9, flare=9, arms="sleeve", hand="bone", held="staff", neck_show=False, arm_r=(5.6, 4.6, 4.4))
    P = _P(P, aR=(max(P["aR"][0], 20), max(20, P["aR"][1] + 30)) if P["glow"] < 0.9 else P["aR"])
    if view == 2 and P["glow"] < 0.9:
        P["aR"] = (35, 55)
    def hooks(stage, c, B):
        hx, hy = B.head
        nx, ny = B.neck
        sw_ = P["sway"]
        if stage == "back" and view != 1:
            cape(c, B, pal["cape"], sw.dk(pal["cape"]), width=34, length=146, sway=sw_, tatter=10, n=12)
        if stage == "body":
            # the mantle over the shoulders: a tattered short cape with a hood fallen back
            if view == 2:
                c.poly([(nx - 9, ny - 2), (nx + 8, ny - 1), (nx + 10, ny + 16), (nx + 3, ny + 20), (nx - 3, ny + 15), (nx - 10, ny + 21), (nx - 13, ny + 10)], pal["mantle"], bevel=4, mat="cloth")
            else:
                pts = [(nx - 20, ny + 18), (nx - 21, ny + 6), (nx - 10, ny - 3), (nx + 10, ny - 3), (nx + 21, ny + 6), (nx + 20, ny + 18)]
                for i in range(7):
                    f = i / 6
                    pts.append((nx + 18 - 36 * f, ny + 20 + (5 if i % 2 else 0)))
                c.poly(pts, pal["mantle"], bevel=5, mat="cloth")
                if view == 0:
                    for s_ in (-1, 1):
                        c.tube([(nx + s_ * 4, ny + 2, 0.9), (nx + s_ * 3, ny + 34, 0.9)], pal["trim"], line=None, glow=pal["eyes"])
                    # ribs show where the robe is torn open
                    for i in range(3):
                        c.tube([(nx - 6, ny + 10 + i * 4.5, 0.9), (nx, ny + 9 + i * 4.5, 1.0), (nx + 6, ny + 10 + i * 4.5, 0.9)], pal["skin"], mat="bone", line="soft")
        if stage == "prehead":
            # the hood fallen back behind the skull
            if view == 1:
                pass
            elif view == 2:
                c.ell(hx - 7, hy + 2, 7, 9, pal["mantle"], mat="cloth")
            else:
                c.ell(hx, hy + 1, 13.5, 12.5, pal["mantle"], mat="cloth", line="ink")
                c.ell(hx, hy + 2, 11.5, 11, sw.dk(pal["mantle"], 2), mat="cloth", line=None, tone=-1)
        if stage == "head":
            if view == 1:
                c.ell(hx, hy + 1, 13.5, 13.5, pal["mantle"], mat="cloth", line="ink")
                c.tube([(hx, hy - 10, 1.0), (hx + 1, hy + 10, 1.0)], sw.dk(pal["mantle"]), line=None)
            lich_crown(c, B, 10, col="#3a4048", gem=pal["orb"], glow=pal["eyes"])
            if view == 1:
                cape(c, B, pal["cape"], pal["cape"], width=30, length=146, sway=sw_, tatter=10, n=12)
        if stage == "front" and P["glow"] >= 0.6 and view != 1:
            # cold fire in the free hand
            j = B.joints["L"]
            hxx, hyy = j["h"]
            c.ell(hxx + (4 if view == 2 else 0), hyy - 4, 2.5 + 3.5 * P["glow"], 3 + 4 * P["glow"], pal["orb"], glow=pal["eyes"], line=None)
    return person(c, rank, view, P, sp, pal, lambda c, B, P: skull(c, B, 10, pal["skin"], eyes=pal["eyes"], jaw_open=P["mouth"] * 0.6), hooks)


def witch(c, rank, view, P):
    pal = {"boss": dict(cloth="#3a1830", robe="#3a1830", cape="#1a1218", hat="#140810", band="#6a3a8a", skin="#8a9a70", hair="#4a4a50", eyes="violet", trim="#e0c060"),
           "mini": dict(cloth="#3a1830", robe="#3a1830", cape="#1a1218", hat="#1a1218", band="#6a3a8a", skin="#8a9a70", hair="#4a4a50", eyes="violet", trim="#6a3a8a"),
           "rare": dict(cloth="#2a4a38", robe="#2a4a38", cape="#1a1218", hat="#1a1218", band="#9ec060", skin="#c5d4e8", hair="#d8dce0", eyes="green", trim="#9ec060")}[rank]
    pal["sleeve"] = pal["cloth"]; pal["hand"] = pal["skin"]; pal["claw"] = "#2a2030"; pal["cuff"] = pal["band"]
    sp = dict(BASE, head=(10.5, 11), shoulder=14, torso=40, lean=3, hunch=10, dress="robe", robe_hem=27, tatter=6, flare=7, hand="claw", held="broom", arm_r=(4.6, 3.8, 3.4))
    def head(c, B, P):
        hx, hy = B.head
        r = 10.5
        # long grey hair behind
        if view != 2:
            c.poly([(hx - r * 1.1, hy - 4), (hx + r * 1.1, hy - 4), (hx + r * 1.5 + P["sway"] * 0.4, hy + 26), (hx - r * 1.5 + P["sway"] * 0.4, hy + 26)], pal["hair"], bevel=3, mat="hair")
        else:
            c.poly([(hx - 2, hy - 6), (hx - r * 1.1, hy - 3), (hx - r * 1.6 - P["sway"] * 0.5, hy + 26), (hx - 2, hy + 18)], pal["hair"], bevel=3, mat="hair")
        if view == 1:
            c.ell(hx, hy, r, r * 1.1, pal["hair"], mat="hair", line="ink")
            return
        face_human(c, B, r, pal["skin"], eyes=pal["eyes"], brow="#2a2030", mouth="hag", P=P, nose=False)
        # the hooked nose and the chin
        if view == 2:
            c.poly([(hx + r * 0.7, hy - 1), (hx + r * 1.55, hy + r * 0.45), (hx + r * 1.2, hy + r * 0.55), (hx + r * 0.75, hy + r * 0.35)], pal["skin"], bevel=1.5, mat="skin", line="ink")
            c.dot(hx + r * 0.95, hy + r * 0.15, "#3a4a20", r=0.9, line=None)
        else:
            c.poly([(hx - 1.6, hy - 1), (hx + 1.6, hy - 1), (hx + 2.2, hy + r * 0.45), (hx, hy + r * 0.62), (hx - 2.2, hy + r * 0.45)], pal["skin"], bevel=1.2, mat="skin", line="soft")
            c.dot(hx + r * 0.45, hy + r * 0.3, "#3a4a20", r=0.9, line=None)
        # hair in front of the ears
        for s_ in ((-1, 1) if view == 0 else (-1,)):
            x0 = hx + s_ * r * 0.95 if view == 0 else hx - r * 0.6
            c.poly([(x0 - 3, hy - 6), (x0 + 3, hy - 6), (x0 + 3 + s_ * 1.5, hy + 18), (x0 - 2 + s_ * 1.5, hy + 22)], pal["hair"], bevel=2, mat="hair", line="soft")
    def hooks(stage, c, B):
        sw_ = P["sway"]
        nx, ny = B.neck
        if stage == "back" and view != 1:
            cape(c, B, pal["cape"], pal["band"], width=30, length=148, sway=sw_, tatter=8, n=11)
        if stage == "body":
            cx, hy = B.hip
            if view != 2:
                c.tube([(cx - 9, hy - 3, 1.6), (cx + 9, hy - 3, 1.6)], pal["band"], mat="leather", line="soft")
                c.dot(cx, hy - 3, pal["trim"], r=2.0, mat="gold", line="ink")
            if view == 0:
                # a skull charm and the shawl
                c.poly([(nx - 15, ny + 4), (nx + 15, ny + 4), (nx, ny + 22)], pal["band"], bevel=3, mat="cloth")
        if stage == "head":
            witch_hat(c, B, 10.5, pal["hat"], pal["band"], P, tall=36 if rank == "boss" else 30)
            if view == 1:
                cape(c, B, pal["cape"], pal["band"], width=28, length=148, sway=sw_, tatter=8, n=11)
        if stage == "front" and P["glow"] >= 0.6 and view != 1:
            j = B.joints["L"]
            hxx, hyy = j["h"]
            c.ell(hxx + (4 if view == 2 else 0), hyy - 5, 2.5 + 3.5 * P["glow"], 2.5 + 3.5 * P["glow"], "#b07aff", glow=pal["eyes"], line=None)
    return person(c, rank, view, P, sp, pal, head, hooks)


def wolf(c, rank, view, P):
    fur = {"boss": "#4a3424", "mini": "#5a4030", "rare": "#8a9098"}[rank]
    pal = dict(skin=fur, fur=fur, leg=fur, pants={"boss": "#2a2a2e", "mini": "#3a2418", "rare": "#4a545c"}[rank], loin={"boss": "#2a2a2e", "mini": "#3a2418", "rare": "#4a545c"}[rank],
               cloth=fur, claw="#e8e0d0", hand=fur, cape="#6a2030", chest=sw.lt(fur))
    sp = dict(BASE, head=(13, 13), shoulder=21, torso=38, lean=16, hunch=18, hipw=9, thigh=28, shin=31, dress="loin", legs="fur", arms="fur", hand="bigclaw", foot="paw", digi=True,
              arm_r=(7.5, 6.2, 5.0), leg_r=(9.5, 6.5, 4.0), torso_mat="fur", waist=13, hips=12, chest_d=16, back_d=12, hump=5, upper=24, fore=24, neck_show=False)
    P = _P(P, aL=(P["aL"][0] + 12, P["aL"][1] + 18), aR=(P["aR"][0] + 12, P["aR"][1] + 18), sp=(P["sp"][0] + 10, P["sp"][1] + 10))
    def hooks(stage, c, B):
        nx, ny = B.neck
        sw_ = P["sway"]
        if stage == "back" and view != 1 and rank == "boss":
            cape(c, B, pal["cape"], sw.dk(pal["cape"]), width=30, length=128, sway=sw_, tatter=12, n=9)
        if stage == "body":
            mx, my = B.chest
            if view == 0:
                for s_ in (-1, 1):
                    c.ell(nx + s_ * 6.5, my - 2, 7.5, 6, pal["chest"], mat="fur", line="soft", part=960)
                for i in range(3):
                    c.ell(nx, my + 8 + i * 6, 6 - i, 2.6, pal["chest"], mat="fur", line="soft", tone=-1, part=961)
            if view == 1:
                # the hackles up the spine
                for i in range(5):
                    c.poly([(nx - 5, ny + 3 + i * 6), (nx + 5, ny + 3 + i * 6), (nx, ny - 3 + i * 6)], sw.dk(fur), bevel=1.5, mat="fur", line="soft")
            if view == 2:
                for i in range(5):
                    bx = nx - 6 - i * 1.5
                    c.poly([(bx, ny + i * 6), (bx - 6, ny - 2 + i * 6), (bx - 1, ny + 5 + i * 6)], fur, bevel=1.5, mat="fur", line="soft")
        if stage == "head" and view == 1 and rank == "boss":
            cape(c, B, pal["cape"], pal["cape"], width=28, length=128, sway=sw_, tatter=12, n=9)
        if stage == "front" and view == 2:
            # the tail
            cx, hy = B.hip
            c.tube([(cx - 7, hy + 2, 4.0), (cx - 15, hy + 10 + sw_, 4.5), (cx - 22 - sw_, hy + 20, 3.5), (cx - 25 - sw_ * 1.5, hy + 30, 1.5)], fur, mat="fur", line="ink")
    return person(c, rank, view, P, sp, pal, lambda c, B, P: wolf_head(c, B, 13, fur, P, eyes="red" if rank != "rare" else "blue"), hooks)


def zombie(c, rank, view, P):
    pal = {"boss": dict(skin="#7a8a58", cloth="#2a2a2e", torso="#2a2a2e", sleeve="#2a2a2e", pants="#1a1a1c", boot="#141414", hair="#1a1a1c", eyes="green"),
           "mini": dict(skin="#7a8a58", cloth="#4a3828", torso="#4a3828", sleeve="#4a3828", pants="#3a3228", boot="#2a241c", hair="#2a3024", eyes="green"),
           "rare": dict(skin="#9eb0c8", cloth="#2a3a6a", torso="#2a3a6a", sleeve="#2a3a6a", pants="#1c3040", boot="#16161a", hair="#1a2030", eyes="blue")}[rank]
    pal["hand"] = pal["skin"]; pal["claw"] = "#c8d0c0"
    broad = rank == "boss"
    sp = dict(BASE, head=(12, 12.5), shoulder=21 if broad else 17, torso=44 if broad else 40, lean=6, hunch=6, hipw=9, dress="coat" if broad else "shirt", robe_hem=19, hem_y=118,
              hand="claw", arm_r=(6.5, 5.4, 4.8) if broad else (5.2, 4.4, 3.8), leg_r=(7.0, 5.6, 4.4), waist=15, hips=13, neck_r=5.0, chest_d=11, back_d=9)
    stiff = {"stand": 78, "idle": 82, "walk0": 74, "walk1": 80, "walk2": 76}
    if P.get("_pose") in stiff:
        a = stiff[P["_pose"]]
        P = _P(P, aL=(a, 6), aR=(a + 6, 4), sp=(10, 10))
    def head(c, B, P):
        hx, hy = B.head
        r = 12
        if broad:
            # Frankenstein: the flat top, the scar, the bolts
            face_human(c, B, r, pal["skin"], eyes=pal["eyes"], brow="#1a1a1c", mouth="grim", P=P)
            if view == 2:
                c.poly([(hx - r * 0.95, hy - r * 0.3), (hx - r * 0.9, hy - r * 1.3), (hx + r * 0.8, hy - r * 1.3), (hx + r * 0.85, hy - r * 0.75), (hx - r * 0.2, hy - r * 0.85), (hx - r * 0.5, hy - r * 0.2)], pal["hair"], bevel=1.5, mat="hair")
            elif view == 1:
                c.poly([(hx - r * 1.0, hy - r * 1.32), (hx + r * 1.0, hy - r * 1.32), (hx + r * 1.02, hy - r * 0.35), (hx + r * 0.5, hy - r * 0.15), (hx - r * 0.5, hy - r * 0.2), (hx - r * 1.02, hy - r * 0.35)], pal["hair"], bevel=2, mat="hair")
            else:
                c.poly([(hx - r * 1.0, hy - r * 0.55), (hx - r * 1.0, hy - r * 1.32), (hx + r * 1.0, hy - r * 1.32), (hx + r * 1.0, hy - r * 0.55), (hx + r * 0.5, hy - r * 0.75), (hx, hy - r * 0.62), (hx - r * 0.5, hy - r * 0.78)], pal["hair"], bevel=1.5, mat="hair")
                c.tube([(hx - r * 0.6, hy - r * 0.5, 0.6), (hx + r * 0.3, hy - r * 0.45, 0.6)], "#3a2830", line=None)
                for i in range(4):
                    x = hx - r * 0.5 + i * r * 0.25
                    c.tube([(x, hy - r * 0.58, 0.45), (x + 0.6, hy - r * 0.35, 0.45)], "#3a2830", line=None)
            if view != 1:
                for s_ in ((-1, 1) if view == 0 else (-1,)):
                    bx = hx + s_ * r * 1.05 if view == 0 else hx - r * 0.2
                    c.tube([(bx, hy + r * 0.75, 2.0), (bx + s_ * 4.5 if view == 0 else bx, hy + r * 0.75, 2.0)], "#8a8e94", mat="metal", line="ink")
                    c.ell(bx + s_ * 4.5 if view == 0 else bx, hy + r * 0.75, 1.6, 2.6, "#b0b6bc", mat="metal", line="ink")
        else:
            face_human(c, B, r, pal["skin"], eyes=pal["eyes"], brow="#2a3024", mouth="gape", P=_P(P, mouth=max(1, P["mouth"])))
            if view != 2:
                for i in range(5):
                    x = hx - r * 0.7 + i * r * 0.35
                    c.tube([(x, hy - r * 1.0, 1.0), (x + (1 if i % 2 else -1), hy - r * 1.35, 0.6)], pal["hair"], mat="hair", line="soft")
            else:
                for i in range(4):
                    x = hx - r * 0.6 + i * r * 0.35
                    c.tube([(x, hy - r * 1.0, 1.0), (x - 1.5, hy - r * 1.35, 0.6)], pal["hair"], mat="hair", line="soft")
    def hooks(stage, c, B):
        nx, ny = B.neck
        cx, hy = B.hip
        if stage == "body":
            if view == 0:
                # the shirt torn open on stitched green flesh
                c.poly([(nx - 5, ny + 2), (nx + 6, ny + 2), (nx + 3, ny + 30), (nx - 2, ny + 34), (nx - 4, ny + 26)], pal["skin"], bevel=2, mat="skin", line="ink")
                c.tube([(nx - 3, ny + 10, 0.5), (nx + 3, ny + 16, 0.5)], "#3a2830", line=None)
                for i in range(3):
                    c.tube([(nx - 2 + i * 2, ny + 11 + i * 2, 0.4), (nx + i * 2, ny + 9 + i * 2, 0.4)], "#3a2830", line=None)
            if view != 2:
                c.tube([(cx - 12, hy - 1, 1.4), (cx + 12, hy - 1, 1.4)], "#3a2418", mat="leather", line="soft")
    P["_pose"] = None
    return person(c, rank, view, P, sp, pal, head, hooks)


def skeleton(c, rank, view, P):
    pal = {"boss": dict(skin="#f4ecdc", cloth="#c4b48a", cape="#6a2030", eyes="red", metal="#8a8e94"),
           "mini": dict(skin="#f4ecdc", cloth="#d8cfc0", cape=None, eyes="red", metal="#8a8e94"),
           "rare": dict(skin="#c4a15a", cloth="#a07850", cape=None, eyes="green", metal="#c4a050")}[rank]
    pal["leg"] = pal["skin"]; pal["hand"] = pal["skin"]; pal["loin"] = "#6a5040" if rank != "boss" else "#3a2428"
    sp = dict(BASE, head=(10.5, 10.5), shoulder=17, torso=40, lean=2, dress="loin", legs="bone", arms="bone", hand="bone", foot="bone", held="sword", neck_show=True, neck_r=1.8, neck_mat="bone", neckc=pal["skin"])
    def hooks(stage, c, B):
        nx, ny = B.neck
        cx, hy = B.hip
        mx, my = B.chest
        sw_ = P["sway"]
        if stage == "back" and view != 1 and pal["cape"]:
            cape(c, B, pal["cape"], sw.dk(pal["cape"]), width=30, length=140, sway=sw_, tatter=10, n=10)
        if stage == "body":
            pass
        if stage == "head" and view == 1 and pal["cape"]:
            cape(c, B, pal["cape"], pal["cape"], width=27, length=140, sway=sw_, tatter=10, n=10)
    # the skeleton draws its own torso: spine, ribcage, pelvis
    def torso_bones(c, B):
        nx, ny = B.neck
        cx, hy = B.hip
        bone = pal["skin"]
        c.tube([(cx, hy, 2.0), (B.chest[0], B.chest[1], 2.2), (nx, ny, 2.0)], bone, mat="bone")
        if view == 2:
            c.poly([(cx - 6, hy - 3), (cx + 6, hy - 3), (cx + 5, hy + 5), (cx - 5, hy + 4)], bone, bevel=2, mat="bone")
            for i in range(5):
                y = ny + 6 + i * 4.5
                c.tube([(nx - 3, y, 1.1), (nx + 7 - i * 0.6, y + 3, 1.1), (nx + 4, y + 7, 0.9)], bone, mat="bone", line="ink")
        else:
            c.poly([(cx - 10, hy - 4), (cx + 10, hy - 4), (cx + 7, hy + 5), (cx, hy + 3), (cx - 7, hy + 5)], bone, bevel=2.5, mat="bone")
            for i in range(5):
                y = ny + 6 + i * 4.5
                w = 14 - abs(i - 1.5) * 1.6
                c.tube([(nx - w, y + 3, 1.1), (nx - w * 0.6, y, 1.2), (nx, y + 1.5, 1.0), (nx + w * 0.6, y, 1.2), (nx + w, y + 3, 1.1)], bone, mat="bone", line="ink")
            c.tube([(nx - 15, ny + 2, 1.6), (nx, ny + 4, 1.6), (nx + 15, ny + 2, 1.6)], bone, mat="bone")   # the collarbones
        if rank == "boss" and view != 1:
            # a tattered tabard over the ribs
            if view == 0:
                c.poly([(nx - 7, ny + 3), (nx + 7, ny + 3), (cx + 7, hy + 18), (cx + 2, hy + 14), (cx - 3, hy + 20), (cx - 7, hy + 15)], pal["cloth"], bevel=2, mat="cloth")
                c.tube([(nx - 3, ny + 10, 1.0), (nx + 3, ny + 10, 1.0)], "#a02030", line=None)
                c.tube([(nx, ny + 7, 1.0), (nx, ny + 17, 1.0)], "#a02030", line=None)
    sp["dress"] = "loin"
    def head(c, B, P):
        skull(c, B, 10.5, pal["skin"], eyes=pal["eyes"], jaw_open=P["mouth"] * 0.8)
        if rank == "boss":
            # a dented iron helm
            hx, hy = B.head
            if view == 2:
                c.poly([(hx - 10.5, hy - 1), (hx - 10, hy - 9), (hx - 3, hy - 13), (hx + 6, hy - 11), (hx + 10.5, hy - 4), (hx + 9, hy - 2), (hx - 3, hy - 4)], pal["metal"], bevel=2, mat="metal")
            else:
                c.poly([(hx - 11.5, hy - 1), (hx - 10, hy - 10), (hx, hy - 13.5), (hx + 10, hy - 10), (hx + 11.5, hy - 1), (hx + 7, hy - 3.5), (hx - 7, hy - 3.5)], pal["metal"], bevel=2.5, mat="metal")
                c.tube([(hx, hy - 13, 1.2), (hx, hy - 3, 1.2)], sw.dk(pal["metal"]), line=None)
    sp["torso_fn"] = torso_bones
    return person(c, rank, view, P, sp, pal, head, hooks)


def mini_collar(c, B, w=9.0):
    """a remnant (mini) wears an iron collar with a rust brand, as the 1x minis do"""
    nx, ny = B.neck
    if B.view == 2:
        c.ell(nx, ny + 1, 5.5, 2.6, "#8a8e94", mat="metal", line="ink")
        c.dot(nx + 4, ny + 3.5, "#c43838", r=1.2, line=None)
        return
    c.ell(nx, ny + 1, w, 2.8, "#8a8e94", mat="metal", line="ink")
    if B.view == 0:
        c.dot(nx, ny + 4.2, "#c43838", r=1.5, line="ink")


def ghoul(c, rank, view, P):
    skin = {"boss": "#6a5344", "mini": "#8a6a4a", "rare": "#6a8a32"}[rank]
    pal = dict(skin=skin, leg=skin, hand=skin, claw="#e8e0d0", loin={"boss": "#2e1e38", "mini": "#6a4a30", "rare": "#3a4a20"}[rank], cloth=skin, cape="#2e1e38")
    sp = dict(BASE, head=(11, 11), shoulder=19, torso=36, lean=18, hunch=22, hipw=9, thigh=27, shin=29, dress="loin", legs="bare", arms="bare", hand="bigclaw", foot="paw",
              arm_r=(6.0, 5.0, 4.4), leg_r=(7.5, 5.5, 4.0), torso_mat="skin", waist=12, hips=12, chest_d=12, back_d=11, hump=7, upper=27, fore=29, neck_show=False)
    P = _P(P, aL=(P["aL"][0] + 8, P["aL"][1] + 6), aR=(P["aR"][0] + 8, P["aR"][1] + 6), sp=(P["sp"][0] + 6, P["sp"][1] + 6))
    def head(c, B, P):
        hx, hy = B.head
        r = 11
        v = B.view
        m = P["mouth"]
        if v == 2:
            c.poly([(hx - r * 0.5, hy - r * 0.2), (hx - r * 1.5, hy - r * 0.9), (hx - r * 0.6, hy + r * 0.2)], skin, bevel=1.5, mat="skin", line="ink")
            c.ell(hx, hy, r * 0.95, r * 0.9, skin, mat="skin", line="ink", part=970)
            c.poly([(hx + r * 0.2, hy + r * 0.2), (hx + r * 1.15, hy + r * 0.3), (hx + r * 1.1, hy + r * 0.85 + m), (hx + r * 0.2, hy + r * 0.9)], skin, bevel=2, mat="skin", line=None, part=970)
            c.poly([(hx + r * 0.4, hy + r * 0.5), (hx + r * 1.12, hy + r * 0.5), (hx + r * 1.05, hy + r * 0.62 + m), (hx + r * 0.45, hy + r * 0.7)], "#2a1018", bevel=0.5, line=None, part=971)
            for i in range(3):
                x = hx + r * (0.55 + 0.2 * i)
                c.poly([(x - 0.8, hy + r * 0.5), (x + 0.8, hy + r * 0.5), (x, hy + r * 0.5 + 2.2)], "#e8e0d0", bevel=0.3, mat="tooth", line=None, part=972)
            c.ell(hx + r * 0.5, hy - r * 0.15, r * 0.25, r * 0.15, sw.INK, line=None, part=973)
            c.dot(hx + r * 0.55, hy - r * 0.13, "#b07aff", r=r * 0.12, glow="violet" if rank != "rare" else "green", line=None, part=974)
            return
        for s_ in (-1, 1):
            c.poly([(hx + s_ * r * 0.8, hy - r * 0.2), (hx + s_ * r * 1.75, hy - r * 0.8), (hx + s_ * r * 0.85, hy + r * 0.35)], skin, bevel=1.5, mat="skin", line="ink")
        c.ell(hx, hy, r, r * 0.95, skin, mat="skin", line="ink", part=970, flat=1.4)
        if v == 1:
            for i in range(3):
                c.tube([(hx - 4 + i * 4, hy - r * 0.7, 0.6), (hx - 3 + i * 4, hy - r * 0.2, 0.6)], sw.dk(skin, 2), line=None)
            return
        c.ell(hx, hy + r * 0.55, r * 0.7, r * 0.45, skin, mat="skin", line=None, part=970, flat=1.4)
        c.ell(hx, hy + r * 0.58, r * 0.55, 1.4 + m * 1.0, "#2a1018", line=None, part=971)
        for i in range(-3, 4):
            c.poly([(hx + i * r * 0.15 - 0.7, hy + r * 0.5), (hx + i * r * 0.15 + 0.7, hy + r * 0.5), (hx + i * r * 0.15, hy + r * 0.5 + 2.0)], "#e8e0d0", bevel=0.3, mat="tooth", line=None, part=972)
        for s_ in (-1, 1):
            c.ell(hx + s_ * r * 0.4, hy - r * 0.08, r * 0.28, r * 0.2, sw.INK, line=None, part=973)
            c.dot(hx + s_ * r * 0.4, hy - r * 0.06, "#b07aff", r=r * 0.13, glow="violet" if rank != "rare" else "green", line=None, part=974)
        c.ell(hx, hy + r * 0.22, r * 0.12, r * 0.08, sw.INK, line=None, part=975)
    def hooks(stage, c, B):
        nx, ny = B.neck
        mx, my = B.chest
        if stage == "back" and view != 1 and rank == "boss":
            cape(c, B, pal["cape"], sw.dk(pal["cape"]), width=30, length=126, sway=P["sway"], tatter=12, n=9)
        if stage == "body":
            if view == 0:
                for i in range(4):
                    c.tube([(nx - 10, my - 6 + i * 4.5, 0.8), (nx - 3, my - 7 + i * 4.5, 0.8)], sw.dk(skin), line=None)
                    c.tube([(nx + 3, my - 7 + i * 4.5, 0.8), (nx + 10, my - 6 + i * 4.5, 0.8)], sw.dk(skin), line=None)
            if view == 1:
                for i in range(6):
                    c.ell(nx, ny + 4 + i * 5, 2.2, 1.6, sw.lt(skin), mat="bone", line="soft")
            if rank == "mini":
                mini_collar(c, B, 10)
        if stage == "head" and view == 1 and rank == "boss":
            cape(c, B, pal["cape"], pal["cape"], width=28, length=126, sway=P["sway"], tatter=12, n=9)
    return person(c, rank, view, P, sp, pal, head, hooks)


def lantern(c, rank, view, P):
    pal = {"boss": dict(rind="#e07a2f", coat="#3a2a44", cloth="#3a2a44", torso="#3a2a44", sleeve="#3a2a44", pants="#2e1e38", glove="#2e1e38", boot="#1a1424", cape="#6a2030", lining="#2a1018", face="fire"),
           "mini": dict(rind="#e07a2f", coat="#3a2a44", cloth="#3a2a44", torso="#3a2a44", sleeve="#3a2a44", pants="#2e1e38", glove="#2e1e38", boot="#1a1424", cape=None, lining=None, face="fire"),
           "rare": dict(rind="#9ec060", coat="#1c3040", cloth="#1c3040", torso="#1c3040", sleeve="#1c3040", pants="#16161a", glove="#16161a", boot="#101014", cape=None, lining=None, face="gold")}[rank]
    pal["skin"] = pal["rind"]; pal["cuff"] = sw.dk(pal["coat"])
    sp = dict(BASE, head=(12, 12), shoulder=15, torso=42, thigh=32, shin=32, dress="coat", robe_hem=17, hem_y=120, hand="glove", held="lantern", neck_show=True, neck_r=2.6, neckc="#3d4a28", neck_mat="vine",
              arm_r=(4.4, 3.8, 3.4), leg_r=(4.8, 4.0, 3.4))
    def hooks(stage, c, B):
        nx, ny = B.neck
        if stage == "back" and view != 1 and pal["cape"]:
            cape(c, B, pal["cape"], pal["lining"], width=28, length=140, sway=P["sway"], tatter=6, n=10)
        if stage == "body":
            if view == 0:
                for i in range(4):
                    c.dot(nx + 2.5, ny + 9 + i * 7, "#c4a050", r=1.1, mat="gold", line="ink")
                c.poly([(nx - 7, ny), (nx + 7, ny), (nx + 2, ny + 10), (nx - 2, ny + 10)], sw.dk(pal["coat"]), bevel=1.5, mat="cloth", line="soft")
            if rank == "mini":
                mini_collar(c, B, 6)
        if stage == "head":
            if rank == "boss":
                # a crown of curling vines and leaves
                hx, hy = B.head
                for i, s_ in enumerate((-1, -0.4, 0.4, 1)):
                    x = hx + s_ * 11
                    c.tube([(x, hy - 9, 1.2), (x + s_ * 2, hy - 15, 1.0), (x + s_ * 4.5, hy - 16, 0.7)], "#3d4a28", mat="vine", line="ink")
                    c.ell(x + s_ * 3, hy - 13.5, 2.6, 1.5, "#6a3a28", rot=30 * s_, mat="leaf", line="ink")
            if view == 1 and pal["cape"]:
                cape(c, B, pal["cape"], pal["lining"], width=26, length=140, sway=P["sway"], tatter=6, n=10)
    return person(c, rank, view, P, sp, pal, lambda c, B, P: pumpkin_head(c, B, 12, pal["rind"], P, glow=pal["face"]), hooks)


def scarecrow(c, rank, view, P):
    C = {"boss": dict(shirt="#8a6840", sack="#c4a15a", hat="#1a1014", band="#e0c060"), "mini": dict(shirt="#8a6840", sack="#c4a15a", hat="#3a2418", band="#6a2030"),
         "rare": dict(shirt="#2a4a38", sack="#8a9870", hat="#1a1a1c", band="#6a2030")}[rank]
    pal = dict(skin=C["sack"], cloth=C["shirt"], torso=C["shirt"], sleeve=C["shirt"], pants="#5a4030", boot="#3a2418", straw="#e0c080", leg="#e0c080", wood="#5a4030")
    sp = dict(BASE, head=(11, 12), shoulder=17, torso=40, lean=2, hunch=6, dress="coat", robe_hem=15, hem_y=104, arms="straw", legs="pants", hand="none", held="pitchfork",
              arm_r=(4.4, 3.8, 3.2), leg_r=(4.0, 3.4, 2.8), neck_show=False)
    P = _P(P, aL=(P["aL"][0] + 20, P["aL"][1] - 6), sp=(P["sp"][0] + 18, P["sp"][1] + 4))
    def head(c, B, P):
        hx, hy = B.head
        r = 11
        v = B.view
        c.ell(hx, hy, r, r * 1.08, C["sack"], mat="burlap", line="ink", part=980, flat=1.2)
        # the sack's tied neck with straw bursting out
        c.tube([(hx - 6, hy + r * 1.0, 1.6), (hx + 6, hy + r * 1.0, 1.6)], "#5a4030", mat="straw", line="ink")
        for i in range(-3, 4):
            c.tube([(hx + i * 2.2, hy + r * 1.05, 1.0), (hx + i * 3.2, hy + r * 1.5, 0.5)], pal["straw"], mat="straw", line="soft")
        if v == 1:
            c.tube([(hx, hy - r * 0.8, 0.5), (hx, hy + r * 0.8, 0.5)], sw.dk(C["sack"], 2), line=None)
            return
        ox = hx + (r * 0.35 if v == 2 else 0)
        eyes = "red" if rank != "rare" else "gold"
        for s_ in ((-1, 1) if v != 2 else (1,)):
            ex = ox + s_ * r * 0.4 if v != 2 else ox + r * 0.2
            c.ell(ex, hy - r * 0.1, r * 0.26, r * 0.24, sw.INK, line=None, part=981)
            c.dot(ex, hy - r * 0.08, "#ff3a50", r=r * 0.13, glow=eyes, line=None, part=982)
            # cross stitches over the eyes
            c.tube([(ex - r * 0.3, hy - r * 0.38, 0.45), (ex + r * 0.3, hy + r * 0.14, 0.45)], "#3a2418", line=None, part=983)
        # the stitched grin
        w = r * (0.6 if v != 2 else 0.35)
        my_ = hy + r * 0.48 + P["mouth"] * 0.6
        c.tube([(ox - w, my_ - 1.5, 0.6), (ox, my_ + 0.5, 0.7), (ox + w, my_ - 1.5, 0.6)], "#2a1018", line=None, part=984)
        for i in range(5):
            x = ox - w + i * w / 2
            c.tube([(x, my_ - 3, 0.4), (x, my_ + 1.5, 0.4)], "#3a2418", line=None, part=985)
    def hooks(stage, c, B):
        hx, hy = B.head
        nx, ny = B.neck
        cx, hpy = B.hip
        if stage == "far" and view == 2:
            pass
        if stage == "body":
            if view != 1:
                c.poly([(nx - 6 + (3 if view == 2 else 0), ny + 14), (nx + 1 + (3 if view == 2 else 0), ny + 14), (nx + (3 if view == 2 else 0), ny + 22), (nx - 6 + (3 if view == 2 else 0), ny + 21)], "#6a2030", bevel=1, mat="cloth", line="ink")
            c.tube([(cx - 11, hpy - 4, 1.4), (cx + 11, hpy - 4, 1.4)] if view != 2 else [(cx - 6, hpy - 4, 1.4), (cx + 7, hpy - 4, 1.4)], "#5a4030", mat="straw", line="soft")
            for i in range(-3, 4):
                x = cx + i * 3 if view != 2 else cx + i * 1.6
                c.tube([(x, hpy - 3, 1.0), (x + i * 0.5, hpy + 4, 0.5)], pal["straw"], mat="straw", line="soft")
            if rank == "mini":
                mini_collar(c, B, 7)
        if stage == "head":
            v = view
            r = 11
            brim = hy - r * 0.55
            c.ell(hx, brim, r * 1.95, r * 0.45, C["hat"], mat="cloth", line="ink", flat=0.6, rot=-6 if v == 0 else 0)
            c.poly([(hx - r * 0.85, brim), (hx + r * 0.85, brim), (hx + r * 0.7, brim - r * 0.95), (hx - r * 0.6, brim - r * 1.05)], C["hat"], bevel=3, mat="cloth", line="ink")
            c.poly([(hx - r * 0.84, brim - 1), (hx + r * 0.84, brim - 1), (hx + r * 0.8, brim - 4), (hx - r * 0.8, brim - 4)], C["band"], bevel=1, mat="gold" if rank == "boss" else "cloth", line="soft")
            if rank == "boss" and v != 1:
                # a crow on the brim
                bx = hx + r * 1.1 if v == 0 else hx - r * 0.8
                c.ell(bx, brim - 5, 4.0, 3.2, "#1a1418", mat="fur", line="ink")
                c.ell(bx + (2.5 if v == 0 else 3), brim - 8.5, 2.2, 2.0, "#1a1418", mat="fur", line="ink")
                c.poly([(bx + 4, brim - 9), (bx + 7.5, brim - 8.3), (bx + 4, brim - 7.5)], "#e0c060", bevel=0.4, mat="horn", line=None)
                c.dot(bx + 3.2, brim - 9.2, "#ff3a50", r=0.7, glow="red", line=None)
                c.tube([(bx - 3, brim - 4, 1.2), (bx - 7, brim - 1 + P["sway"] * 0.3, 0.6)], "#1a1418", mat="fur", line="ink")
        if stage == "front" and view == 0:
            # patches on the shirt
            c.poly([(nx + 4, ny + 20), (nx + 11, ny + 20), (nx + 11, ny + 27), (nx + 4, ny + 27)], "#6a2030", bevel=0.8, mat="cloth", line="ink")
            c.tube([(nx + 4, ny + 20, 0.4), (nx + 11, ny + 27, 0.4)], "#e0c080", line=None)
    return person(c, rank, view, P, sp, pal, head, hooks)


def mummy(c, rank, view, P):
    pal = {"boss": dict(skin="#f0e2c0", cape="#6a2030", trim="#e0c060", eyes="gold"), "mini": dict(skin="#f0e2c0", cape=None, trim="#c4b48a", eyes="gold"),
           "rare": dict(skin="#8eb4d8", cape=None, trim="#7aa0c0", eyes="blue")}[rank]
    pal.update(cloth=pal["skin"], torso=pal["skin"], leg=pal["skin"], hand=pal["skin"], loin=pal["trim"], claw="#c4b48a")
    sp = dict(BASE, head=(11, 12), shoulder=18, torso=42, lean=5, hunch=6, hipw=8, dress="loin", legs="wrap", arms="wrap", hand="claw", foot="none",
              arm_r=(5.6, 4.8, 4.2), leg_r=(6.8, 5.4, 4.6), torso_mat="wrap", waist=13, hips=12, neck_r=4.4, neck_mat="wrap")
    stiff = {"stand": 85, "idle": 88, "walk0": 80, "walk1": 86, "walk2": 82}
    if P.get("_pose") in stiff:
        a = stiff[P["_pose"]]
        P = _P(P, aL=(a, 4), aR=(a - 4, 8) if P["_pose"] != "idle" else (10, 12), sp=(8, 8))
    def head(c, B, P):
        hx, hy = B.head
        r = 11
        v = B.view
        c.ell(hx, hy, r, r * 1.1, pal["skin"], mat="wrap", line="ink", part=990, flat=1.2)
        if v == 1:
            c.tube([(hx - 2, hy + r * 0.4, 1.2), (hx - 6 - P["sway"], hy + r * 1.8, 0.8)], pal["skin"], mat="wrap", line="ink")
            return
        ox = hx + (r * 0.35 if v == 2 else 0)
        # a gap in the wraps: the dark under them and one burning eye, the other half hidden
        c.poly([(ox - r * 0.75, hy - r * 0.32), (ox + r * 0.75, hy - r * 0.18), (ox + r * 0.72, hy + r * 0.12), (ox - r * 0.78, hy - r * 0.02)] if v != 2 else
               [(ox - r * 0.2, hy - r * 0.3), (ox + r * 0.62, hy - r * 0.2), (ox + r * 0.62, hy + r * 0.1), (ox - r * 0.2, hy)], "#1a1418", bevel=0.8, line=None, part=991)
        for s_ in ((-1, 1) if v != 2 else (1,)):
            ex = ox + s_ * r * 0.38 if v != 2 else ox + r * 0.25
            c.dot(ex, hy - r * 0.1, "#f4e27a", r=r * (0.15 if s_ > 0 else 0.11), glow=pal["eyes"], line=None, part=992)
        c.tube([(ox - r * 0.85, hy + r * 0.3, 1.2), (ox + r * 0.8, hy + r * 0.48, 1.2)] if v != 2 else [(ox - r * 0.3, hy + r * 0.3, 1.2), (ox + r * 0.62, hy + r * 0.42, 1.2)], sw.dk(pal["skin"]), mat="wrap", line="soft", part=993)
    def hooks(stage, c, B):
        nx, ny = B.neck
        cx, hpy = B.hip
        sw_ = P["sway"]
        if stage == "back" and view != 1 and pal["cape"]:
            cape(c, B, pal["cape"], sw.dk(pal["cape"]), width=30, length=146, sway=sw_, tatter=8, n=10)
        if stage == "body":
            # trailing loose wraps
            if view != 2:
                c.tube([(cx + 8, hpy + 4, 1.2), (cx + 12 + sw_, hpy + 18, 1.0), (cx + 10 + sw_ * 1.5, hpy + 28, 0.7)], pal["skin"], mat="wrap", line="ink")
            if rank == "boss" and view != 1:
                # a gold collar and the pharaoh's belt
                if view == 0:
                    c.poly([(nx - 14, ny + 2), (nx + 14, ny + 2), (nx + 11, ny + 9), (nx, ny + 12), (nx - 11, ny + 9)], pal["trim"], bevel=2, mat="gold")
                    for i in range(-2, 3):
                        c.dot(nx + i * 4.5, ny + 6 + (2 - abs(i)) * 1.2, "#3a78a8", r=1.0, mat="gem", line=None)
                c.tube([(cx - 12, hpy - 2, 1.8), (cx + 12, hpy - 2, 1.8)] if view == 0 else [(cx - 7, hpy - 2, 1.8), (cx + 8, hpy - 2, 1.8)], pal["trim"], mat="gold", line="soft")
            if rank == "mini":
                mini_collar(c, B, 9)
        if stage == "head":
            if rank == "boss":
                # the nemes headdress
                hx, hy = B.head
                r = 11
                if view == 2:
                    c.poly([(hx - r * 1.05, hy - r * 0.2), (hx - r * 0.8, hy - r * 1.1), (hx + r * 0.6, hy - r * 1.15), (hx + r * 0.75, hy - r * 0.55), (hx - r * 0.1, hy - r * 0.55), (hx - r * 0.6, hy + r * 1.6), (hx - r * 1.3, hy + r * 1.4)], "#e0c060", bevel=2.5, mat="gold", line="ink")
                    c.dot(hx + r * 0.65, hy - r * 0.85, "#3a78a8", r=1.4, mat="gem", line="ink")
                else:
                    c.poly([(hx - r * 1.05, hy - r * 0.3), (hx - r * 0.85, hy - r * 1.12), (hx + r * 0.85, hy - r * 1.12), (hx + r * 1.05, hy - r * 0.3), (hx + r * 1.5, hy + r * 1.5), (hx + r * 0.95, hy + r * 1.55), (hx + r * 0.75, hy - r * 0.45), (hx - r * 0.75, hy - r * 0.45), (hx - r * 0.95, hy + r * 1.55), (hx - r * 1.5, hy + r * 1.5)],
                           "#e0c060", bevel=2.5, mat="gold", line="ink")
                    for i in range(3):
                        c.tube([(hx - r * 1.3, hy + r * (0.1 + 0.4 * i), 0.7), (hx - r * 0.9, hy + r * (0.1 + 0.4 * i), 0.7)], "#3a78a8", line=None)
                        c.tube([(hx + r * 0.9, hy + r * (0.1 + 0.4 * i), 0.7), (hx + r * 1.3, hy + r * (0.1 + 0.4 * i), 0.7)], "#3a78a8", line=None)
                    if view == 0:
                        c.dot(hx, hy - r * 0.85, "#3a78a8", r=1.6, mat="gem", line="ink")
            if view == 1 and pal["cape"]:
                cape(c, B, pal["cape"], pal["cape"], width=27, length=146, sway=sw_, tatter=8, n=10)
    return person(c, rank, view, P, sp, pal, head, hooks)


def goblin(c, rank, view, P):
    pal = {"boss": dict(skin="#6a8a32", cloth="#8a2030", trim="#c4a050"), "mini": dict(skin="#6a8a32", cloth="#6a2030", trim="#c4a050"), "rare": dict(skin="#8eb4d8", cloth="#2a3a6a", trim="#c4a050")}[rank]
    pal.update(torso=pal["cloth"], sleeve=pal["cloth"], pants="#3a3228", boot="#3a4a20", hand=pal["skin"], claw="#e8e0d0", leg=pal["skin"])
    # a goblin is short and squat: big head, big ears, a sack of loot on its back
    sp = dict(BASE, head=(15, 14), shoulder=17, torso=34, thigh=22, shin=22, hipw=8, lean=8, hunch=8, dress="shirt", hand="claw", held="dagger", arm_r=(4.8, 4.0, 3.6), leg_r=(5.6, 4.6, 3.8),
              waist=13, hips=13, chest_d=12, back_d=9, upper=19, fore=18, neck_show=False)
    def head(c, B, P):
        hx, hy = B.head
        r = 14
        v = B.view
        m = P["mouth"]
        sk = pal["skin"]
        if v == 2:
            c.poly([(hx - r * 0.3, hy - r * 0.2), (hx - r * 1.6, hy - r * 0.75), (hx - r * 0.4, hy + r * 0.25)], sk, bevel=2, mat="skin", line="ink")
            c.ell(hx, hy, r * 0.9, r * 0.85, sk, mat="skin", line="ink", part=995)
            c.poly([(hx + r * 0.6, hy - r * 0.15), (hx + r * 1.4, hy + r * 0.35), (hx + r * 0.65, hy + r * 0.3)], sk, bevel=1.5, mat="skin", line="ink")
            c.ell(hx + r * 0.45, hy - r * 0.25, r * 0.2, r * 0.14, sw.INK, line=None)
            c.dot(hx + r * 0.5, hy - r * 0.24, "#f4e27a", r=r * 0.1, glow="red", line=None)
            c.tube([(hx + r * 0.2, hy + r * 0.55, 0.7), (hx + r * 0.75, hy + r * 0.5 - m * 0.4, 0.7)], "#2a1018", line=None)
            return
        for s_ in (-1, 1):
            c.poly([(hx + s_ * r * 0.7, hy - r * 0.25), (hx + s_ * r * 1.9, hy - r * 0.65), (hx + s_ * r * 1.5, hy - r * 0.15), (hx + s_ * r * 0.75, hy + r * 0.3)], sk, bevel=2, mat="skin", line="ink")
            if v == 0:
                c.poly([(hx + s_ * r * 0.85, hy - r * 0.15), (hx + s_ * r * 1.6, hy - r * 0.45), (hx + s_ * r * 0.9, hy + r * 0.1)], "#c46858", bevel=1, line=None)
        c.ell(hx, hy, r * 0.95, r * 0.88, sk, mat="skin", line="ink", part=995, flat=1.4)
        if v == 1:
            return
        c.poly([(hx - 2, hy - r * 0.1), (hx + 2, hy - r * 0.1), (hx + 3.5, hy + r * 0.35), (hx, hy + r * 0.45), (hx - 3.5, hy + r * 0.35)], sk, bevel=1.5, mat="skin", line="soft", part=996)
        c.ell(hx, hy + r * 0.62, r * 0.55, 1.2 + m * 0.9, "#2a1018", line=None, part=997)
        for s_ in (-1, 1):
            c.poly([(hx + s_ * r * 0.35 - 0.8, hy + r * 0.55), (hx + s_ * r * 0.35 + 0.8, hy + r * 0.55), (hx + s_ * r * 0.35, hy + r * 0.55 + 2.4)], "#e8e0d0", bevel=0.3, mat="tooth", line=None, part=998)
            c.ell(hx + s_ * r * 0.4, hy - r * 0.22, r * 0.22, r * 0.17, sw.INK, line=None, part=999)
            c.dot(hx + s_ * r * 0.4, hy - r * 0.2, "#f4e27a", r=r * 0.11, glow="red", line=None, part=1000)
    def hooks(stage, c, B):
        nx, ny = B.neck
        cx, hpy = B.hip
        def sack():
            if view == 2:
                c.ell(nx - 14, ny + 12, 11, 13, "#8a6840", mat="burlap", line="ink")
                c.dot(nx - 18, ny + 4, "#f4e27a", r=1.6, glow="gold", line=None)
            else:
                c.ell(nx + (0 if view == 1 else 0), ny + 8, 16, 15, "#8a6840", mat="burlap", line="ink")
                c.tube([(nx - 4, ny - 6, 1.6), (nx + 4, ny - 6, 1.4)], "#5a4030", mat="straw", line="ink")
                if view == 1:
                    c.dot(nx - 6, ny - 3, "#f4e27a", r=1.8, glow="gold", line=None)
                    c.dot(nx + 4, ny - 4, "#f4e27a", r=1.4, glow="gold", line=None)
        if stage == "back" and view != 1:
            sack()
        if stage == "body":
            c.tube([(cx - 12, hpy - 3, 1.5), (cx + 12, hpy - 3, 1.5)] if view != 2 else [(cx - 8, hpy - 3, 1.5), (cx + 9, hpy - 3, 1.5)], "#5a4030", mat="leather", line="soft")
            if view != 1:
                c.dot(cx + (5 if view == 0 else 7), hpy - 3, pal["trim"], r=2.0, mat="gold", line="ink")
            if rank == "mini":
                mini_collar(c, B, 8)
        if stage == "head":
            if rank == "boss":
                crown(c, B, 13, col="#e0c060", gem="#a02030", h=7, glow="red")
            if view == 1:
                sack()
    return person(c, rank, view, P, sp, pal, head, hooks)


def krampus(c, rank, view, P):
    C = sw.FAMILY_COLORS["krampus"]
    fur = C["fur"]
    pal = dict(skin=fur, fur=fur, leg=fur, hand=fur, claw=C["claw"], boot=C["hoof"], cloth=fur, loin=C["fur_deep"])
    sp = dict(BASE, head=(11, 12), shoulder=22, torso=40, lean=10, hunch=12, hipw=9, thigh=28, shin=31, dress="loin", legs="fur", arms="fur", hand="bigclaw", foot="hoof", digi=True,
              arm_r=(7.5, 6.2, 5.0), leg_r=(9.5, 6.5, 4.2), torso_mat="fur", waist=14, hips=13, chest_d=15, back_d=12, hump=5, upper=24, fore=23, neck_show=False, held="chain")
    def hooks(stage, c, B):
        nx, ny = B.neck
        cx, hpy = B.hip
        sw_ = P["sway"]
        def basket():
            # the wicker basket on its back, birch switches sticking out
            if view == 2:
                bx, by = nx - 17, ny + 16
                for i in range(4):
                    c.tube([(bx + 2 + i * 2, by - 10, 0.9), (bx - 2 + i * 3, by - 26 - i, 0.6)], C["birch"], mat="wood", line="soft")
                c.poly([(bx - 9, by - 12), (bx + 8, by - 12), (bx + 7, by + 14), (bx - 8, by + 14)], C["wicker"], bevel=2.5, mat="straw")
                c.tube([(bx - 9, by - 12, 1.5), (bx + 8, by - 12, 1.5)], C["rim"], mat="wood", line="ink")
            else:
                bx, by = nx, ny + 14
                for i in range(5):
                    c.tube([(bx - 8 + i * 4, by - 12, 0.9), (bx - 12 + i * 6, by - 30 - (i % 2) * 3, 0.6)], C["birch"], mat="wood", line="soft")
                c.poly([(bx - 16, by - 13), (bx + 16, by - 13), (bx + 14, by + 14), (bx - 14, by + 14)], C["wicker"], bevel=3, mat="straw")
                c.tube([(bx - 16.5, by - 13, 1.6), (bx + 16.5, by - 13, 1.6)], C["rim"], mat="wood", line="ink")
                for i in range(3):
                    c.tube([(bx - 15, by - 5 + i * 7, 0.6), (bx + 15, by - 5 + i * 7, 0.6)], C["weave"], line=None)
        if stage == "back" and view != 1:
            basket()
        if stage == "body":
            mx, my = B.chest
            # the shaggy ruff and the chains crossing the chest
            if view != 2:
                for i in range(7):
                    x = nx - 18 + i * 6
                    c.poly([(x - 4, ny + 2), (x + 4, ny + 2), (x + 1, ny + 14 + (i % 2) * 4)], C["fur_hi"], bevel=1.5, mat="fur", line="soft")
                c.tube([(nx - 16, ny + 4, 1.0), (cx + 12, hpy - 2, 1.0)], "#6a6e78", mat="metal", line=None)
                for i in range(7):
                    t = i / 6
                    c.ell(nx - 16 + (cx + 12 - nx + 16) * t, ny + 4 + (hpy - 2 - ny - 4) * t, 1.8, 1.3, "#8a8e94", mat="metal", line="ink")
            else:
                for i in range(4):
                    c.poly([(nx - 6 + i * 4, ny), (nx - 2 + i * 4, ny), (nx - 3 + i * 4, ny + 14)], C["fur_hi"], bevel=1.5, mat="fur", line="soft")
            c.tube([(cx - 13, hpy - 2, 1.4), (cx + 13, hpy - 2, 1.4)] if view != 2 else [(cx - 8, hpy - 2, 1.4), (cx + 9, hpy - 2, 1.4)], C["ribbon"], mat="cloth", line="soft")
        if stage == "head" and view == 1:
            basket()
        if stage == "front" and view == 2:
            c.tube([(cx - 7, hpy, 2.5), (cx - 13, hpy + 8 + sw_, 2.0), (cx - 15 - sw_, hpy + 14, 1.0)], fur, mat="fur", line="ink")
    return person(c, rank, view, P, sp, pal, lambda c, B, P: goat_head(c, B, 11, fur, C["horn"], P, eyes="red", tongue=C["tongue"]), hooks)


def pumpkin_lord(c, rank, view, P):
    C = sw.FAMILY_COLORS["pumpkinlord"]
    pal = dict(skin=C["rind"], cloth=C["cloak"], robe=C["cloak"], torso=C["cloak"], sleeve=C["cloak"], hand=C["root"], claw=C["root"], cape=C["cloak"], boot=C["root"])
    sp = dict(BASE, head=(14, 13), shoulder=19, torso=42, lean=3, hunch=4, dress="robe", robe_hem=30, tatter=8, flare=9, hand="claw", neck_show=True, neck_r=3.0, neckc=C["vine"], neck_mat="vine",
              arm_r=(5.8, 4.8, 4.0))
    def hooks(stage, c, B):
        nx, ny = B.neck
        cx, hpy = B.hip
        sw_ = P["sway"]
        if stage == "back" and view != 1:
            cape(c, B, sw.dk(C["cloak"]), "#6a3a28", width=36, length=149, sway=sw_, tatter=10, n=12)
        if stage == "body":
            # vines coil round the body, leaves on them; roots trail at the hem
            if view != 2:
                pts = [(cx - 14, 146, 1.6), (cx - 10, 128, 1.8), (cx + 8, 112, 1.8), (cx + 10, hpy - 6, 1.6), (nx - 8, ny + 12, 1.5), (nx + 12, ny + 4, 1.2)]
                c.tube(pts, C["vine"], mat="vine", line="ink")
                for (x, y, _) in pts[1:5]:
                    c.ell(x + 4, y - 2, 3.5, 2.0, C["leaf"], rot=-30, mat="leaf", line="ink")
                c.tube([(cx + 16, 148, 1.6), (cx + 13, 132, 1.4), (cx + 17, 120, 1.1)], C["root"], mat="bark", line="ink")
            else:
                c.tube([(cx + 6, 144, 1.6), (cx + 2, 120, 1.8), (cx + 8, hpy - 4, 1.6), (nx + 5, ny + 10, 1.4)], C["vine"], mat="vine", line="ink")
                c.ell(cx + 6, 124, 3.5, 2.0, C["leaf"], rot=-30, mat="leaf", line="ink")
            if view == 0:
                # the high ragged collar
                c.poly([(nx - 16, ny + 4), (nx - 20, ny - 10), (nx - 10, ny - 2), (nx - 6, ny - 14), (nx, ny - 3), (nx + 6, ny - 14), (nx + 10, ny - 2), (nx + 20, ny - 10), (nx + 16, ny + 4)], sw.dk(C["cloak"]), bevel=2, mat="cloth")
        if stage == "head":
            hx, hy = B.head
            # the crown of curling vines
            for s_ in (-1, -0.35, 0.35, 1):
                x = hx + s_ * 13
                c.tube([(x, hy - 10, 1.4), (x + s_ * 3, hy - 18, 1.1), (x + s_ * 6.5, hy - 19, 0.7)], C["vine"], mat="vine", line="ink")
                c.ell(x + s_ * 4, hy - 16, 3.2, 1.8, C["leaf_hi"], rot=30 * s_, mat="leaf", line="ink")
            if view == 1:
                cape(c, B, sw.dk(C["cloak"]), "#6a3a28", width=33, length=149, sway=sw_, tatter=10, n=12)
        if stage == "front" and P["glow"] >= 0.6 and view != 1:
            j = B.joints["L"]
            hxx, hyy = j["h"]
            c.ell(hxx + (4 if view == 2 else 0), hyy - 5, 2.5 + 3.5 * P["glow"], 2.5 + 3.5 * P["glow"], C["glow"], glow="fire", line=None)
    return person(c, rank, view, P, sp, pal, lambda c, B, P: pumpkin_head(c, B, 14, C["rind"], P, stem=C["stem"]), hooks)


# ================================================================ fam_vampire
VAMP = dict(thigh=30, shin=30, foot_h=4, torso=40, neck=4, head=(12, 13), shoulder=16, hipw=7, upper=22, fore=21, sh_drop=4, breathe=1)

def vampire(c, rank, view, P):
    sp = dict(VAMP)
    pal = {"boss": dict(gown="#6a1020", cape="#2a1020", lining="#a02030", skin="#ecd8cc", hair="#1a1014", eyes="red", trim="#e0c060"),
           "mini": dict(gown="#8f2d3a", cape="#2a1020", lining="#6a1020", skin="#ecd8cc", hair="#1a1014", eyes="red", trim="#c4a050"),
           "rare": dict(gown="#2a3a6a", cape="#1a2030", lining="#3a78a8", skin="#d8dce0", hair="#1a1014", eyes="blue", trim="#9ec4e0")}[rank]
    B = Body(sp, P, view)
    hr = sp["head"][0]
    sway = P["sway"]
    J = B.joints
    def arm(side, front):
        j = J[side]
        if (j["z"] > 0) != front:
            return
        tone = -1 if (view == 2 and side == "L") else 0
        c.tube([(j["s"][0], j["s"][1], 6.0), (j["e"][0], j["e"][1], 4.6), (j["h"][0], j["h"][1], 4.0)], pal["gown"], mat="silk", tone=tone)
        # the sleeve's flared cuff
        hx, hy = j["h"]; ex, ey = j["e"]
        dx, dy = hx - ex, hy - ey; L = math.hypot(dx, dy) or 1
        c.ell(hx - dx / L * 2, hy - dy / L * 2, 5.0, 3.2, pal["lining"], rot=math.degrees(math.atan2(dy, dx)) + 90, mat="silk", tone=tone)
        hand(c, (hx + dx / L * 2.5, hy + dy / L * 2.5), 2.6, pal["skin"], claws="#6a1020", dirn=(dx / L, dy / L), tone=tone)
    if view != 1:
        cape(c, B, pal["cape"], pal["lining"], width=36, length=149, sway=sway, tatter=5)
        high_collar(c, B, pal["cape"], pal["lining"], h=18, w=16)
    if view == 2:
        arm("L", False)
        arm("L", True)
    # long hair behind the shoulders
    hx, hy = B.head
    if view != 2:
        c.poly([(hx - hr * 1.05, hy - 2), (hx + hr * 1.05, hy - 2), (hx + hr * 1.25 + sway * 0.3, hy + 30), (hx - hr * 1.25 + sway * 0.3, hy + 30)], pal["hair"], bevel=3, mat="hair", line="ink")
    else:
        c.poly([(hx - hr * 0.2, hy - hr), (hx - hr * 0.95, hy - 2), (hx - hr * 1.3 - sway * 0.4, hy + 28), (hx - hr * 0.2 - sway * 0.2, hy + 26)], pal["hair"], bevel=3, mat="hair", line="ink")
    # the gown
    skirt(c, B, top_w=9, hem_w=31 if view != 2 else 25, col=pal["gown"], hem_y=149.5, tatter=3.0, sway=sway, mat="silk", back_flare=8)
    # bodice
    cx, hy2 = B.hip
    nx, ny = B.neck
    if view == 2:
        c.poly([(cx - 6, hy2 - 4), (cx + 5, hy2 - 4), (nx + 7, ny + 12), (nx + 3, ny + 2), (nx - 5, ny + 2), (nx - 7, ny + 14)], pal["gown"], bevel=4, mat="silk")
    else:
        sh = sp["shoulder"]
        c.poly([(cx - 7, hy2 - 3), (cx + 7, hy2 - 3), (nx + sh * 0.85, ny + 14), (nx + sh, ny + 4), (nx + 4, ny + 1), (nx - 4, ny + 1), (nx - sh, ny + 4), (nx - sh * 0.85, ny + 14)], pal["gown"], bevel=5, mat="silk")
        if view == 0:
            # a V of pale skin, the gold trim and the brooch
            c.poly([(nx - 5, ny + 2), (nx + 5, ny + 2), (nx, ny + 13)], pal["skin"], bevel=2, mat="skin", line="soft")
            c.tube([(nx - 6, ny + 2, 0.9), (nx, ny + 14, 1.0), (nx + 6, ny + 2, 0.9)], pal["trim"], mat="gold", line=None)
            c.tube([(cx - 7, hy2 - 4, 1.0), (cx + 7, hy2 - 4, 1.0)], pal["trim"], mat="gold", line="soft")
            c.dot(nx, ny + 15, "#a02030", r=1.8, mat="gem", line="ink", glow="red" if rank != "rare" else "blue")
        else:
            c.tube([(cx - 7, hy2 - 4, 1.0), (cx + 7, hy2 - 4, 1.0)], pal["trim"], mat="gold", line="soft")
    if view == 0:
        arm("L", True); arm("R", True)
    elif view == 1:
        arm("L", True); arm("R", True)
    # neck and head
    c.tube([(nx, ny + 3, 3.4), (nx, ny - 4, 3.2)], pal["skin"], mat="skin", tone=-1)
    face_human(c, B, hr, pal["skin"], eyes=pal["eyes"], brow=pal["hair"], mouth="fangs", P=P)
    # hair over the head: a widow's peak in front, the crown of it from behind
    if view == 0:
        c.poly([(hx - hr * 1.02, hy + 2), (hx - hr * 0.9, hy - hr * 0.8), (hx, hy - hr * 1.22), (hx + hr * 0.9, hy - hr * 0.8), (hx + hr * 1.02, hy + 2), (hx + hr * 0.75, hy - hr * 0.35), (hx, hy - hr * 0.48), (hx - hr * 0.75, hy - hr * 0.35)], pal["hair"], bevel=3, mat="hair", line="ink")
    elif view == 1:
        c.ell(hx, hy - 1, hr * 1.06, hr * 1.22, pal["hair"], mat="hair", line="ink")
    else:
        c.poly([(hx - hr * 1.0, hy + 3), (hx - hr * 0.9, hy - hr * 0.8), (hx, hy - hr * 1.22), (hx + hr * 0.8, hy - hr * 0.9), (hx + hr * 0.55, hy - hr * 0.45), (hx - hr * 0.1, hy - hr * 0.4), (hx - hr * 0.3, hy + 4)], pal["hair"], bevel=3, mat="hair", line="ink")
    if rank != "rare":
        crown(c, B, hr, col=pal["trim"], gem="#a02030", h=8 if rank == "boss" else 5, glow="red")
    if view == 1:
        cape(c, B, pal["cape"], pal["lining"], width=33, length=149, sway=sway, tatter=5, mat="silk")
        high_collar(c, B, pal["cape"], pal["lining"], h=18, w=16)
        c.poly([(hx - hr * 0.95, hy), (hx + hr * 0.95, hy), (hx + hr * 1.15 + sway * 0.3, hy + 36), (hx, hy + 40), (hx - hr * 1.15 + sway * 0.3, hy + 36)], pal["hair"], bevel=3, mat="hair", line="ink")
        c.ell(hx, hy - 1, hr * 1.06, hr * 1.22, pal["hair"], mat="hair", line="ink")
        if rank != "rare":
            crown(c, B, hr, col=pal["trim"], gem="#a02030", h=8 if rank == "boss" else 5, glow="red")
    if view == 2:
        arm("R", False); arm("R", True)
    if P["glow"] >= 0.6 and view != 1:
        hL, hR = J["L"]["h"], J["R"]["h"]
        ox, oy = (hL[0] + hR[0]) / 2, (hL[1] + hR[1]) / 2 - 4
        if view == 2:
            ox, oy = hR[0] + 5, hR[1] - 2
        c.ell(ox, oy, 3 + 4 * P["glow"], 3 + 4 * P["glow"], "#ff3a50", glow="red" if rank != "rare" else "blue", line=None)
    return B


# ================================================================ creatures
# ---------------------------------------------------------------- the drawn families (playtest1r)

PH = {"stand": 0, "idle": 1, "walk0": 0, "walk1": 1, "walk2": 2, "swing0": 0, "swing1": 1, "swing2": 2, "cast0": 0, "cast1": 1, "cast2": 2}


def _pose(P):
    return P.get("_pose") or "stand"


def ghost(c, rank, view, P):
    C = dict(sw.FAMILY_COLORS["ghost"])
    if rank == "rare":
        C.update(sw.FAMILY_RARE["ghost"])
    if rank == "boss":
        C.update(sw.FAMILY_BOSS["ghost"])
    body, mouth = C["body"], C["mouth"]
    eyes = "blue" if rank != "rare" else "green"
    pose = _pose(P)
    bob = {"stand": 0, "idle": -2, "walk0": -2, "walk1": -4, "walk2": -2, "swing0": 0, "swing1": 2, "swing2": 2, "cast0": 0, "cast1": -4, "cast2": -2}[pose]
    ph = PH[pose] + (0.5 if pose.startswith("walk") else 0)
    sway = P["sway"]
    hx, hy = 40.0, 34.0 + bob
    r = 15.0
    v = view
    # the veil / hood and the body tapering into a curling wispy tail
    def tail_pts(side_view):
        pts = []
        n = 14
        if side_view:
            # profile: the body leans forward, the tail streams back and curls
            top = [(hx - r * 0.9, hy - 2), (hx + r * 0.95, hy - 2)]
            front = [(hx + r * 1.1, hy + 18), (hx + r * 0.9 + sway * 0.3, hy + 52), (hx + r * 0.2, hy + 78)]
            tip = (hx - 24 - sway * 1.5, 128 + math.sin(ph * 2.1) * 6)
            back = [(hx - 8, hy + 96), tip, (hx - 18 - sway, hy + 74), (hx - r * 1.15, hy + 40), (hx - r * 1.05, hy + 14)]
            return top + front + back
        hw0 = r * 1.15
        pts = [(hx - hw0, hy), (hx + hw0, hy)]
        right = [(hx + r * 1.35, hy + 26), (hx + r * 1.45 + sway * 0.4, hy + 52)]
        hem = []
        for i in range(n + 1):
            f = i / n
            x = hx + r * 1.45 - f * r * 2.9 + sway * (0.6 - abs(f - 0.5))
            depth = 18 + 10 * math.sin(f * math.pi) + 7 * math.sin(i * 1.9 + ph * 2.0)
            hem.append((x, hy + 58 + depth * (0.4 if i % 2 else 1.0)))
        # the long curling tail from the middle
        tip = [(hx + 6 + sway, hy + 90), (hx + 2 - sway * 1.2 + math.sin(ph * 2) * 4, 138), (hx - 6 + sway * 0.5, hy + 92)]
        hem2 = hem[:n // 2] + tip + hem[n // 2 + 1:]
        left = [(hx - r * 1.45 + sway * 0.4, hy + 52), (hx - r * 1.35, hy + 26)]
        return pts + right + hem2 + left
    arm_up = {"swing0": -18, "swing1": 10, "swing2": 14, "cast0": -10, "cast1": -30, "cast2": 0}.get(pose, 4)
    def arms(front):
        for s_ in (-1, 1):
            if v == 2 and (s_ < 0) == front:
                continue
            if v != 2 and not front:
                continue
            sx = hx + s_ * r * 1.25 if v != 2 else hx + 4
            sy = hy + 16
            up = arm_up if (s_ > 0 or pose.startswith("cast")) else 4 + (2 if pose == "idle" else 0)
            ex = sx + (s_ * 10 if v != 2 else 12)
            ey = sy + 16 + up * 0.6
            hx2 = ex + (s_ * 6 if v != 2 else 10)
            hy2 = ey + 10 + up * 0.8
            tone = -1 if (v == 2 and s_ < 0) else 0
            c.tube([(sx, sy, 6.0), (ex, ey, 5.0), (hx2, hy2, 3.0)], body, mat="ecto", tone=tone)
            # tattered sleeve tips and long fingers
            for k_ in (-1, 0, 1):
                c.tube([(hx2, hy2, 1.4), (hx2 + (s_ * 4 if v != 2 else 5) + k_ * 1.5, hy2 + 7 + abs(k_), 0.5)], body, mat="ecto", line="soft", tone=tone)
    if v == 2:
        arms(False)
    c.poly(tail_pts(v == 2), body, bevel=9, mat="ecto", flat=1.2)
    if v != 2:
        arms(True)
    # the head under its veil
    c.ell(hx + (2 if v == 2 else 0), hy, r, r * 1.05, body, mat="ecto", line="ink", part=1100, flat=1.2)
    if v != 1:
        ox = hx + (r * 0.45 if v == 2 else 0)
        for s_ in ((-1, 1) if v != 2 else (1,)):
            ex = ox + s_ * r * 0.42 if v != 2 else ox + r * 0.1
            c.ell(ex, hy + 1, r * 0.25, r * 0.36, sw.INK, line=None, part=1101)
            c.dot(ex, hy + 2, "#4ab8ff", r=r * 0.12, glow=eyes, line=None, part=1102)  # playtest1s: lit in idle too (no blink pop)
        mo = {"swing1": 1.0, "cast1": 1.0, "swing0": 0.6, "cast0": 0.6, "swing2": 0.6}.get(pose, 0.3)
        c.ell(ox if v != 2 else ox + r * 0.2, hy + r * 0.6, r * (0.22 if v != 2 else 0.15), 2 + 5 * mo, mouth, line=None, part=1103)
    # the boss: a bride's veil and crown; a mini: the iron collar
    if rank == "boss":
        if v != 2:
            c.poly([(hx - r * 1.1, hy - r * 0.4), (hx + r * 1.1, hy - r * 0.4), (hx + r * 1.6 + sway * 0.5, hy + 40), (hx + r * 1.2, hy + 44), (hx + r * 0.95, hy + 4), (hx - r * 0.95, hy + 4), (hx - r * 1.2, hy + 44), (hx - r * 1.6 + sway * 0.5, hy + 40)] if v == 0 else
                   [(hx - r * 1.1, hy - r * 0.4), (hx + r * 1.1, hy - r * 0.4), (hx + r * 1.5 + sway * 0.5, hy + 48), (hx - r * 1.5 + sway * 0.5, hy + 48)], "#d0d8e4", bevel=4, mat="silk", line="soft")
        else:
            c.poly([(hx - r * 0.6, hy - r * 0.9), (hx + r * 0.6, hy - r * 0.8), (hx - r * 0.4, hy + 6), (hx - r * 1.6 - sway, hy + 50), (hx - r * 1.2, hy - r * 0.2)], "#d0d8e4", bevel=4, mat="silk", line="soft")
        crown(c, Box(hx, hy - 2), r, col="#e0c060", gem="#4ab8ff", h=8, glow="blue", view=v)
    elif rank == "mini":
        c.ell(hx, hy + r * 0.95, r * 0.75, 2.6, "#8a8e94", mat="metal", line="ink")
        if v == 0:
            c.dot(hx, hy + r * 0.95 + 3, "#c43838", r=1.4, line="ink")
    if P["glow"] >= 0.6 and v != 1:
        gx = hx + (r * 1.7 if v == 2 else 0)
        c.ell(gx, hy - r * 1.6 if pose == "cast1" else hy + 30, 3 + 4 * P["glow"], 3 + 4 * P["glow"], "#9ae4ff", glow=eyes, line=None)


class Box:
    """a stand-in Body for the hat writers: a head at (x, y)"""
    def __init__(self, x, y, view=0):
        self.head = (x, y)
        self.view = view


_crown = crown
def crown(c, B, hr, col="#e0c060", gem="#a02030", pts=5, h=7.0, glow=None, view=None):
    if view is not None:
        B.view = view
    return _crown(c, B, hr, col=col, gem=gem, pts=pts, h=h, glow=glow)


def bat(c, rank, view, P):
    C = dict(sw.FAMILY_COLORS["bat"])
    if rank == "rare":
        C.update(sw.FAMILY_RARE["bat"])
    if rank == "boss":
        C.update(sw.FAMILY_BOSS["bat"])
    body, wing = C["body"], C["wing"]
    pose = _pose(P)
    flap = {"stand": 0.2, "idle": 0.6, "walk0": 1.0, "walk1": 0.0, "walk2": -0.8, "swing0": 1.0, "swing1": -0.6, "swing2": -0.2, "cast0": 0.6, "cast1": 1.0, "cast2": 0.2}[pose]
    by = {"stand": 66, "idle": 64, "walk0": 62, "walk1": 66, "walk2": 70, "swing0": 60, "swing1": 74, "swing2": 70, "cast0": 64, "cast1": 58, "cast2": 64}[pose]
    bx = 40.0
    v = view
    eyes = "fire" if rank != "rare" else "gold"
    def wing_pts(s_, side_view=False, far=False):
        # shoulder, then the arm out to the wrist, finger tips with scalloped membrane between
        sx, sy = bx + s_ * 7, by - 6
        up = flap * 30
        span = 37 if not side_view else 28
        wx, wy = sx + s_ * span * 0.55, sy - 8 - up * 0.6
        tips = []
        for i, (ang, ln) in enumerate(((-10, 1.0), (15, 0.95), (40, 0.85), (70, 0.7))):
            a = math.radians(ang - flap * 25)
            tips.append((wx + s_ * math.cos(a) * span * 0.5 * ln, wy + math.sin(a) * span * 0.5 * ln + up * 0.15))
        body_pt = (bx + s_ * 4, by + 18)
        pts = [(sx, sy), (wx, wy)]
        for i, t in enumerate(tips):
            pts.append(t)
            if i < len(tips) - 1:
                nt = tips[i + 1]
                mx, my = (t[0] + nt[0]) / 2, (t[1] + nt[1]) / 2
                pts.append((mx * 0.8 + wx * 0.2, my * 0.8 + wy * 0.2 + 2))
        pts.append(body_pt)
        return pts, (sx, sy), (wx, wy), tips
    def draw_wing(s_, tone=0, side_view=False):
        pts, s0, w0, tips = wing_pts(s_, side_view)
        if s_ < 0:
            pts = pts[::-1]
        c.poly(pts, wing, bevel=3, mat="membrane", tone=tone)
        c.tube([(s0[0], s0[1], 2.4), (w0[0], w0[1], 1.8)], body, mat="fur", line="soft", tone=tone)
        for t in tips:
            c.tube([(w0[0], w0[1], 1.2), (t[0], t[1], 0.5)], sw.dk(body), mat="horn", line=None, tone=tone)
        c.tube([(w0[0], w0[1], 0.8), (w0[0] + s_ * 1.5, w0[1] - 4, 0.4)], "#e8e0d0", mat="horn", line=None, tone=tone)
    if v == 2:
        draw_wing(-1, tone=-1, side_view=True)
    elif v == 1:
        pass
    if v != 2:
        draw_wing(-1); draw_wing(1)
    # the body: furred, with legs tucked and clawed feet hanging
    c.ell(bx, by + 6, 10, 15, body, mat="fur", line="ink", part=1200)
    c.ell(bx + (2 if v == 2 else 0), by + 2, 8, 9, sw.lt(body) if v == 0 else body, mat="fur", line=None, part=1200)
    for s_ in (-1, 1):
        fx = bx + s_ * 4 + (2 if v == 2 else 0)
        c.tube([(fx, by + 18, 2.0), (fx + s_ * 1, by + 26, 1.4)], sw.dk(body), mat="fur", line="soft")
        for k_ in (-1, 0, 1):
            c.tube([(fx + s_ * 1, by + 26, 0.8), (fx + s_ * 1 + k_ * 1.4, by + 29, 0.4)], "#e8e0d0", mat="horn", line=None)
    # the head: big ears, the leaf nose, fangs, burning eyes
    hx, hy = bx + (5 if v == 2 else 0), by - 14
    for s_ in ((-1, 1) if v != 2 else (-1,)):
        ex_ = hx + s_ * 6 if v != 2 else hx - 2
        c.poly([(ex_ - 4, hy - 2), (ex_ + 4, hy - 2), (ex_ + s_ * 4 if v != 2 else ex_ - 3, hy - 17)], body, bevel=2, mat="fur", line="ink")
        if v == 0:
            c.poly([(ex_ - 2, hy - 3), (ex_ + 2, hy - 3), (ex_ + s_ * 3, hy - 13)], "#6a3040", bevel=1, line=None)
    c.ell(hx, hy, 8.5, 7.5, body, mat="fur", line="ink", part=1201)
    if v != 1:
        m = P.get("mouth", 0)
        ox = hx + (4 if v == 2 else 0)
        for s_ in ((-1, 1) if v != 2 else (1,)):
            ex = ox + s_ * 3.4 if v != 2 else ox
            c.ell(ex, hy - 1, 2.2, 1.8, sw.INK, line=None, part=1202)
            c.dot(ex, hy - 1, "#e07a2f", r=1.1, glow=eyes, line=None, part=1203)
        c.poly([(ox - 1.6, hy + 1), (ox + 1.6, hy + 1), (ox, hy + 4)] if v != 2 else [(ox + 4, hy), (ox + 7, hy + 2), (ox + 4, hy + 3)], "#6a3040", bevel=0.5, line=None, part=1204)
        c.ell(ox, hy + 5, 3.2, 1 + m, "#2a1018", line=None, part=1205)
        for s_ in (-1, 1):
            c.poly([(ox + s_ * 1.8 - 0.6, hy + 4.5), (ox + s_ * 1.8 + 0.6, hy + 4.5), (ox + s_ * 1.8, hy + 7.5)], "#f4ecdc", bevel=0.3, mat="tooth", line=None, part=1206)
    if rank == "boss":
        crown(c, Box(hx, hy - 1), 8, col="#e0c060", gem="#b07aff", h=6, glow="violet", view=v)
    elif rank == "mini":
        c.ell(hx, hy + 7, 6, 2, "#8a8e94", mat="metal", line="ink")
    if v == 2:
        draw_wing(1, side_view=True)
    if P["glow"] >= 0.6 and v != 1:
        c.ell(hx + (10 if v == 2 else 0), hy - 18, 2 + 4 * P["glow"], 2 + 4 * P["glow"], "#b07aff", glow="violet", line=None)


def tree(c, rank, view, P):
    C = dict(sw.FAMILY_COLORS["tree"])
    if rank == "rare":
        C.update(sw.FAMILY_RARE["tree"])
    if rank == "boss":
        C.update(sw.FAMILY_BOSS["tree"])
    bark, leaf = C["bark"], C["leaf"]
    pose = _pose(P)
    v = view
    sway = P["sway"]
    lean = {"swing0": -4, "swing1": 6, "swing2": 4, "walk0": 2, "walk1": 3, "walk2": 2, "cast1": -3}.get(pose, 0)
    step = {"walk0": (5, -3), "walk1": (0, 2), "walk2": (-3, 5), "swing1": (6, -4)}.get(pose, (0, 0))
    br = P["br"]
    tx = 40.0 + lean * 0.5
    top = 44 - br
    eyes = "gold" if rank != "rare" else "red"
    # roots: thick legs splaying into gnarled feet; in profile two stumps, one stepping
    def roots(far):
        if v == 2:
            for s_, dx_, tone in ((-1, step[1], -1), (1, step[0], 0)):
                if (tone < 0) != far:
                    continue
                c.tube([(tx + s_ * 2, 112, 8), (tx + s_ * 3 + dx_, 134, 6.5), (tx + s_ * 3 + dx_ * 1.4, 147, 5.5)], bark, mat="bark", tone=tone)
                c.tube([(tx + s_ * 3 + dx_ * 1.4, 147, 3.5), (tx + s_ * 3 + dx_ * 1.4 + 11, 149, 1.5)], bark, mat="bark", tone=tone, line="soft")
                c.tube([(tx + s_ * 3 + dx_ * 1.4, 147, 3.0), (tx + s_ * 3 + dx_ * 1.4 - 8, 149.3, 1.2)], bark, mat="bark", tone=tone, line="soft")
            return
        if far:
            return
        for s_, dy_ in ((-1, step[0]), (1, step[1])):
            x0 = tx + s_ * 11
            c.tube([(x0, 112, 9), (x0 + s_ * 4, 134 - max(0, dy_) * 0.6, 7), (x0 + s_ * 6, 147 - max(0, dy_) * 0.6, 5.5)], bark, mat="bark")
            for k_ in (-1, 0, 1):
                c.tube([(x0 + s_ * 6, 147 - max(0, dy_) * 0.6, 3), (x0 + s_ * 6 + k_ * 9 + s_ * 3, 149.4 - max(0, dy_) * 0.6, 1.2)], bark, mat="bark", line="soft")
    # branch arms: a heavy limb that forks into twig fingers
    arm_a = {"stand": (20, 20), "idle": (24, 18), "walk0": (30, 12), "walk1": (20, 22), "walk2": (12, 30), "swing0": (24, 150), "swing1": (24, 70), "swing2": (20, 35), "cast0": (60, 60), "cast1": (150, 150), "cast2": (90, 90)}[pose]
    def branch(s_, ang, tone=0):
        sx, sy = tx + s_ * 20, top + 26
        if v == 2:
            sx = tx + 2
        a1 = math.radians(ang)
        L1, L2 = 26, 24
        if v == 2:
            ex, ey = sx + L1 * math.sin(a1), sy + L1 * math.cos(a1)
            hx, hy = ex + L2 * math.sin(a1 + 0.3), ey + L2 * math.cos(a1 + 0.3)
        else:
            spread = math.radians(35 if ang < 100 else 25)
            ex, ey = sx + s_ * L1 * math.sin(spread) * 0.9, sy + L1 * math.cos(a1) * 0.8
            hx, hy = ex + s_ * L2 * math.sin(spread) * 0.5, ey + L2 * math.cos(a1 + 0.2) * 0.85
        c.tube([(sx, sy, 7), (ex, ey, 5), (hx, hy, 3)], bark, mat="bark", tone=tone)
        dx, dy = hx - ex, hy - ey
        L = math.hypot(dx, dy) or 1
        for k_ in (-1, 0, 1):
            a = math.atan2(dy, dx) + k_ * 0.5
            c.tube([(hx, hy, 2.2), (hx + math.cos(a) * 9, hy + math.sin(a) * 9, 0.6)], bark, mat="bark", line="soft", tone=tone)
        c.ell(ex + (2 if v != 2 else 0), ey - 3, 5, 3.5, leaf, mat="leaf", line="ink", tone=tone)
    if v == 2:
        branch(-1, arm_a[0], tone=-1)
        roots(True)
    roots(False)
    # the trunk: wide at the root, a hollow mouth, knots; a crown of branches and leaves above
    w0, w1 = 22, 17
    trunk = [(tx - w0, 120), (tx - w0 * 0.75, 100), (tx - w1, top + 30), (tx - w1 * 0.8, top + 8), (tx + w1 * 0.8, top + 8), (tx + w1, top + 30), (tx + w0 * 0.75, 100), (tx + w0, 120), (tx + 8, 116), (tx, 122), (tx - 8, 116)]
    if v == 2:
        trunk = [(tx - 16, 120), (tx - 14, top + 30), (tx - 11, top + 8), (tx + 10, top + 8), (tx + 14, top + 30), (tx + 16, 120), (tx, 122)]
    c.poly(trunk, bark, bevel=10, mat="bark")
    # the canopy: clumps of leaves on forked boughs
    for (dx, dy, rx_, ry_) in ((-16, -2, 16, 13), (16, -2, 16, 13), (0, -14, 19, 14), (-8, -24, 12, 9), (10, -22, 12, 9)):
        if v == 2:
            dx *= 0.7
        c.tube([(tx + dx * 0.3, top + 10, 3), (tx + dx * 0.8, top + dy + 4, 2)], bark, mat="bark", line="soft")
    for i, (dx, dy, rx_, ry_) in enumerate(((-17, -2, 16, 12), (17, -2, 16, 12), (0, -14, 20, 14), (-9, -25, 12, 9), (11, -23, 12, 9))):
        if v == 2:
            dx *= 0.7
        c.ell(tx + dx + sway * 0.4, top + dy, rx_, ry_, leaf, mat="leaf", line="ink", part=1300)
    if v != 1:
        ox = tx + (7 if v == 2 else 0)
        fy = top + 42
        # brows of bark, glowing eyes in knot-holes, the hollow mouth
        for s_ in ((-1, 1) if v != 2 else (1,)):
            ex = ox + s_ * 7 if v != 2 else ox + 3
            c.ell(ex, fy, 4.2, 3.2, "#140c10", line=None, part=1301)
            c.dot(ex, fy + 0.5, "#f4e27a", r=1.6, glow=eyes, line=None, part=1302)
            c.tube([(ex - s_ * 5, fy - 6, 1.6), (ex + s_ * 4, fy - 3, 1.4)], sw.dk(bark), mat="bark", line=None, part=1303)
        m = P.get("mouth", 0)
        c.poly([(ox - 7, fy + 12), (ox - 2, fy + 10), (ox + 3, fy + 12), (ox + 7, fy + 11), (ox + 5, fy + 18 + m * 3), (ox - 1, fy + 20 + m * 3), (ox - 6, fy + 17 + m * 2)] if v != 2 else
               [(ox - 1, fy + 11), (ox + 6, fy + 11), (ox + 5, fy + 18 + m * 3), (ox, fy + 19 + m * 3)], "#140c10", bevel=1, line=None, part=1304)
        c.ell(ox + (9 if v != 2 else -6), fy + 30, 2.5, 3, sw.dk(bark), line=None, part=1305)
    if v != 2:
        branch(-1, arm_a[0]); branch(1, arm_a[1])
    else:
        branch(1, arm_a[1])
    if rank == "boss":
        crown(c, Box(tx, top - 26), 10, col="#e0c060", gem="#b07aff", h=7, glow="violet", view=v)
    elif rank == "mini":
        c.tube([(tx - 16, top + 20, 1.4), (tx + 16, top + 20, 1.4)] if v != 2 else [(tx - 10, top + 20, 1.4), (tx + 10, top + 20, 1.4)], "#8a8e94", mat="metal", line="ink")
    if P["glow"] >= 0.6 and v != 1:
        for k_ in range(3):
            c.dot(tx - 12 + k_ * 12, top - 34 - k_ % 2 * 4, "#b07aff", r=1.5 + P["glow"] * 1.5, glow="violet", line=None)


def quad_legs(pose):
    """walk phases for four legs (front near, front far, back near, back far): hip angle, knee bend"""
    w = {"walk0": (24, -18, -16, 22), "walk1": (0, 6, 4, -2), "walk2": (-18, 24, 22, -16)}.get(pose)
    if w is None:
        w = (4, -2, -3, 3)
    return w


def horse(c, rank, view, P):
    C = dict(sw.FAMILY_COLORS["horse"])
    if rank == "rare":
        C.update(sw.FAMILY_RARE["horse"])
    if rank == "boss":
        C.update(sw.FAMILY_BOSS["horse"])
    hide, mane, hoof, cloak, collar = C["hide"], C["mane"], C["hoof"], C["cloak"], C["collar"]
    pose = _pose(P)
    v = view
    rear = {"swing0": 22, "swing1": 8, "swing2": 2, "cast1": 6}.get(pose, 0)
    bob = {"walk1": -2, "idle": -1}.get(pose, 0)
    fire = "fire" if rank != "rare" else "blue"
    legs = quad_legs(pose)
    by = 92 + bob
    if v == 2:
        # profile: a horse of 64 px with a headless cloaked rider (the boss) or a saddle cloth
        bx = 38.0
        L = 25
        def rr(x, y):
            return rot(x, y, -rear, bx - L, by + 8)
        def leg_(hipx, hipy, a, kb, tone, front):
            hx_, hy_ = rr(hipx, hipy)
            a = a + (-rear * 2.2 if front and rear else 0)
            a1 = math.radians(a); a2 = math.radians(a - (kb + (60 if front and rear > 10 else 0)) * (1 if front else -0.6))
            kx, ky = hx_ + 18 * math.sin(a1), hy_ + 18 * math.cos(a1)
            ax, ay = kx + 22 * math.sin(a2), min(146, ky + 22 * math.cos(a2))
            if not (front and rear):
                # playtest1s: a planted hoof stands on the soles row (the profile horse floated 6 px over it); a
                # stepping one lifts 4
                ay = max(ay, 142.0 if pose.startswith("walk") and a > 12 else 146.0)
            c.tube([(hx_, hy_, 6.5 if not front else 5.5), (kx, ky, 3.4), (ax, ay, 2.6)], hide, mat="hide", tone=tone)
            c.poly([(ax - 3, ay - 1), (ax + 3.5, ay - 1), (ax + 4.5, ay + 4), (ax - 3.5, ay + 4)], hoof, bevel=1, mat="horn", tone=tone)
            # feathered fetlocks of fire on the nightmare
            c.ell(ax, ay - 2, 3.6, 2.2, "#e07a2f", glow=fire, line=None, tone=tone)
        leg_(bx + L - 6, by + 6, legs[1], 10, -1, True)
        leg_(bx - L + 6, by + 6, legs[3], 14, -1, False)
        # tail of fire-shot hair
        tx_, ty_ = rr(bx - L - 3, by - 4)
        c.tube([(tx_, ty_, 4), (tx_ - 9 - P["sway"], ty_ + 14, 4.5), (tx_ - 10 - P["sway"] * 1.5, ty_ + 32, 2.5), (tx_ - 7 - P["sway"] * 2, ty_ + 42, 1)], mane, mat="hair")
        body = [rr(x, y) for x, y in ((bx - L - 4, by - 6), (bx - L + 6, by - 13), (bx + L - 6, by - 12), (bx + L + 4, by - 6), (bx + L + 6, by + 6), (bx + L - 4, by + 14), (bx - L + 4, by + 14), (bx - L - 6, by + 6))]
        c.poly(body, hide, bevel=9, mat="hide")
        # the neck and the long head
        nb = rr(bx + L - 2, by - 8)
        nt = rr(bx + L + 10, by - 38)
        c.tube([(nb[0], nb[1], 9), (nt[0], nt[1], 6)], hide, mat="hide")
        hd0 = nt
        hd1 = rr(bx + L + 22, by - 24)
        c.tube([(hd0[0], hd0[1], 6), (hd1[0], hd1[1], 4)], hide, mat="hide", part=1400)
        ear = rr(bx + L + 8, by - 47)
        c.poly([(hd0[0] - 3, hd0[1] - 2), (hd0[0] + 2, hd0[1] - 3), ear], hide, bevel=1.2, mat="hide")
        ex, ey = rr(bx + L + 13, by - 35)
        c.ell(ex, ey, 2.4, 1.6, sw.INK, line=None, part=1401)
        c.dot(ex + 0.5, ey, "#e07a2f", r=1.2, glow=fire, line=None, part=1402)
        nx_, ny_ = rr(bx + L + 21, by - 23)
        c.ell(nx_, ny_, 1.4, 1.0, sw.INK, line=None, part=1403)
        # the burning mane down the neck
        for i in range(6):
            t = i / 5
            mx, my = nb[0] + (nt[0] - nb[0]) * t, nb[1] + (nt[1] - nb[1]) * t
            c.poly([(mx - 4, my), (mx + 1, my - 3), (mx - 8 - P["sway"] * 0.5, my - 6 + (i % 2) * 3)], mane, bevel=1, mat="hair", line="soft")
            if i % 2 == 0:
                c.dot(mx - 7 - P["sway"] * 0.5, my - 5, "#e07a2f", r=1.4, glow=fire, line=None)
        # saddle cloth (cloak) and collar
        sc = [rr(x, y) for x, y in ((bx - 12, by - 13), (bx + 10, by - 13), (bx + 12, by + 10), (bx + 2, by + 13), (bx - 6, by + 10), (bx - 14, by + 12))]
        c.poly(sc, cloak, bevel=3, mat="cloth")
        c1, c2 = rr(bx + L - 2, by - 14), rr(bx + L + 6, by - 2)
        c.tube([(c1[0], c1[1], 2.0), (c2[0], c2[1], 2.0)], collar, mat="gold" if rank == "boss" else "leather", line="soft")
        if rank == "boss":
            # the headless rider: cloak streaming back, the lantern head held out
            sx, sy = rr(bx - 2, by - 14)
            hipx, hipy = sx, sy - 2
            c.poly([(hipx - 8, hipy + 4), (hipx + 7, hipy + 4), (hipx + 8, hipy - 30), (hipx + 2, hipy - 36), (hipx - 6, hipy - 34), (hipx - 9 - P["sway"] * 0.5, hipy - 4)], "#1a1418", bevel=4, mat="cloth")
            c.poly([(hipx - 6, hipy - 34), (hipx - 4, hipy - 30), (hipx - 26 - P["sway"] * 2, hipy - 6 + abs(P["sway"])), (hipx - 30 - P["sway"] * 2, hipy - 14), (hipx - 18, hipy - 30)], "#6a2030", bevel=3, mat="cloth")
            c.tube([(hipx - 2, hipy - 3, 4), (hipx + 4, hipy + 10, 3.4), (hipx + 1, hipy + 20, 2.8)], "#1a1418", mat="cloth")
            c.ell(hipx + 0.5, hipy - 36, 6, 2.4, "#ff3a50", glow="red", line=None)   # the stump burns
            ax = 30 if pose.startswith("swing") else 60
            hx2, hy2 = hipx + 4 + 12 * math.sin(math.radians(ax)), hipy - 28 + 12 * math.cos(math.radians(ax)) + 10
            c.tube([(hipx + 3, hipy - 28, 3), (hx2, hy2, 2.4)], "#1a1418", mat="cloth")
            pumpkin_head(c, Box(hx2 + 4, hy2 + 4, 2), 5.5, "#e07a2f", P, glow="fire")
        else:
            if rank == "mini":
                m1 = rr(bx + L + 4, by - 26)
                c.ell(m1[0], m1[1], 6, 2.6, "#8a8e94", mat="metal", line="ink", rot=-50)
        leg_(bx + L - 8, by + 8, legs[0], 10, 0, True)
        leg_(bx - L + 8, by + 8, legs[2], 14, 0, False)
        return
    # front / back: a narrow tall shape: chest, the head high on its neck, two legs in front and two behind
    bx = 40.0
    hindw, frontw = 12, 9
    for s_ in (-1, 1):
        a = legs[3] if s_ < 0 else legs[2]
        lift = max(0, -a) * 0.18
        x = bx + s_ * hindw
        c.tube([(x, by, 7), (x, 124 - lift, 3.6), (x, 143 - lift, 3.0)], hide, mat="hide", tone=-1)
        c.poly([(x - 3.4, 143 - lift), (x + 3.4, 143 - lift), (x + 4, 149.6 - lift), (x - 4, 149.6 - lift)], hoof, bevel=1, mat="horn", tone=-1)
        c.ell(x, 141 - lift, 4, 2.2, "#e07a2f", glow=fire, line=None, tone=-1)
    if v == 1:
        c.tube([(bx, by - 8, 4), (bx + P["sway"], by + 14, 5), (bx + P["sway"] * 1.5, by + 34, 2)], mane, mat="hair")
    c.ell(bx, by, 17, 15, hide, mat="hide", part=1400)
    c.poly([(bx - 16, by - 10), (bx + 16, by - 10), (bx + 15, by + 12), (bx - 15, by + 12)], cloak, bevel=4, mat="cloth", line="soft")
    for s_ in (-1, 1):
        a = legs[1] if s_ < 0 else legs[0]
        lift = max(0, a) * 0.25 + (rear * 1.2 if rear else 0)
        x = bx + s_ * frontw
        c.tube([(x, by + 6, 6), (x + s_ * 0.5, 124 - lift, 3.6), (x, 143 - lift, 3.0)], hide, mat="hide")
        c.poly([(x - 3.4, 143 - lift), (x + 3.4, 143 - lift), (x + 4, 149.6 - lift), (x - 4, 149.6 - lift)], hoof, bevel=1, mat="horn")
        c.ell(x, 141 - lift, 4, 2.2, "#e07a2f", glow=fire, line=None)
    hy = by - 38 - rear * 0.6
    def rider():
        if True:
            # the rider, headless, over the horse
            ry = by - 14
            c.poly([(bx - 13, ry + 8), (bx + 13, ry + 8), (bx + 12, ry - 26), (bx + 6, ry - 32), (bx - 6, ry - 32), (bx - 12, ry - 26)], "#1a1418", bevel=5, mat="cloth")
            if v == 0:
                c.poly([(bx - 13, ry - 28), (bx - 18 + P["sway"], ry + 14), (bx - 12, ry + 10)], "#6a2030", bevel=2, mat="cloth", line="soft")
                c.poly([(bx + 13, ry - 28), (bx + 18 + P["sway"], ry + 14), (bx + 12, ry + 10)], "#6a2030", bevel=2, mat="cloth", line="soft")
            else:
                c.poly([(bx - 13, ry - 30), (bx + 13, ry - 30), (bx + 16 + P["sway"], ry + 12), (bx - 16 + P["sway"], ry + 12)], "#6a2030", bevel=3, mat="cloth")
            c.ell(bx, ry - 32, 7, 2.6, "#ff3a50", glow="red", line=None)
            for s_ in (-1, 1):
                c.tube([(bx + s_ * 12, ry + 6, 4), (bx + s_ * 15, ry + 22, 3.4)], "#1a1418", mat="cloth")
            if v == 0:
                up = 1 if pose.startswith("swing") or pose == "cast1" else 0
                hxx, hyy = bx - 20, ry - 18 - up * 14
                c.tube([(bx - 12, ry - 26, 3.4), (hxx, hyy, 2.6)], "#1a1418", mat="cloth")
                pumpkin_head(c, Box(hxx - 1, hyy - 5, 0), 5.5, "#e07a2f", P, glow="fire")

    if rank == "boss" and v == 0:
        rider()
    # neck and head, high (rearing lifts it more)
    hy = by - 38 - rear * 0.6
    if v == 0:
        c.tube([(bx, by - 10, 9), (bx, hy + 8, 6.5)], hide, mat="hide")
        c.tube([(bx, hy - 4, 7), (bx, hy + 14, 5)], hide, mat="hide", part=1401)
        for s_ in (-1, 1):
            c.poly([(bx + s_ * 3, hy - 8), (bx + s_ * 7, hy - 6), (bx + s_ * 6, hy - 17)], hide, bevel=1.2, mat="hide")
            c.ell(bx + s_ * 5.5, hy - 1, 2.0, 1.6, sw.INK, line=None, part=1402)
            c.dot(bx + s_ * 5.6, hy - 0.8, "#e07a2f", r=1.1, glow=fire, line=None, part=1403)
            c.ell(bx + s_ * 2.2, hy + 16, 1.2, 1.0, sw.INK, line=None, part=1404)
        c.tube([(bx, hy - 10, 2.4), (bx + P["sway"] * 0.5, hy - 2, 2.0)], mane, mat="hair", line="soft")
        c.dot(bx, hy - 9, "#e07a2f", r=2.0, glow=fire, line=None)
        c.tube([(bx - 9, by - 13, 2.0), (bx + 9, by - 13, 2.0)], collar, mat="gold" if rank == "boss" else "leather", line="soft")
    else:
        c.tube([(bx, by - 10, 9), (bx, hy + 8, 6.5)], hide, mat="hide")
        c.ell(bx, hy, 7, 8, hide, mat="hide", part=1401)
        for s_ in (-1, 1):
            c.poly([(bx + s_ * 3, hy - 6), (bx + s_ * 7, hy - 4), (bx + s_ * 6, hy - 15)], hide, bevel=1.2, mat="hide")
        for i in range(5):
            c.poly([(bx - 3, hy + i * 7), (bx + 3, hy + i * 7), (bx + P["sway"] * 0.4, hy + 9 + i * 7)], mane, bevel=1, mat="hair", line="soft")
    if rank == "boss" and v == 1:
        rider()
    if rank == "mini":
        c.ell(bx, hy + 12, 7, 2.4, "#8a8e94", mat="metal", line="ink")


def beast4(c, rank, view, P, sp):
    """a four-legged beast (the cat, the rat): side view walks on four legs, front and back views face on"""
    pose = _pose(P)
    v = view
    fur, belly, eye_c, eyes = sp["fur"], sp["belly"], sp["eye"], sp["eyes"]
    legs = quad_legs(pose)
    arch = {"cast0": 6, "cast1": 10, "cast2": 4, "swing0": 4}.get(pose, 0) + sp.get("arch", 0)
    crouch = {"swing0": 6, "idle": 1, "walk1": -2}.get(pose, 0)
    by = sp["by"] + crouch
    L = sp["len"]
    bh = sp["bh"]
    hr = sp["hr"]
    m = P.get("mouth", 0)
    sway = P["sway"]
    tail = sp["tail"]
    if v == 2:
        bx = sp.get("sbx", 36.0)
        def leg_(x, a, tone, front, raise_=0.0):
            a1 = math.radians(a)
            ln = sp["leg"]
            hx_, hy_ = x, by + bh * 0.3
            kx, ky = hx_ + ln * 0.5 * math.sin(a1), hy_ + ln * 0.5 * math.cos(a1) - raise_
            ax, ay = kx + ln * 0.5 * math.sin(a1 * 0.5) + (raise_ * 0.6 if front else 0), min(148, hy_ + ln - raise_ * 1.5)
            c.tube([(hx_, hy_, sp["legr"] * 1.5), (kx, ky, sp["legr"]), (ax, ay, sp["legr"] * 0.8)], fur, mat="fur", tone=tone)
            c.ell(ax + 2, min(148.2, ay + 1), sp["legr"] * 1.3, sp["legr"] * 0.8, fur, mat="fur", tone=tone)
            if raise_:
                for k_ in (-1, 0, 1):
                    c.tube([(ax + 3, ay + 1 + k_, 0.8), (ax + 7, ay + 2 + k_ * 1.5, 0.4)], "#e8e0d0", mat="horn", line=None)
        swipe = 18 if pose == "swing1" else 10 if pose == "swing2" else 0
        leg_(bx + L * 0.7, legs[1], -1, True)
        leg_(bx - L * 0.7, legs[3], -1, False)
        # tail behind
        tb = (bx - L * 0.95, by - bh * 0.3)
        if tail == "curl":
            c.tube([(tb[0], tb[1], 3.5), (tb[0] - 10, tb[1] - 14 - arch, 3.2), (tb[0] - 6 - sway, tb[1] - 30 - arch, 2.8), (tb[0] + 2 - sway, tb[1] - 36 - arch, 2.0)], fur, mat="fur")
        else:
            c.tube([(tb[0], tb[1] + 4, 3.0), (tb[0] - 10, tb[1] + 16, 2.2), (tb[0] - 16 - sway, tb[1] + 30, 1.6), (tb[0] - 15 - sway * 1.2, 146, 1.0), (tb[0] - 4 - sway * 1.5, 149, 0.6)], sp["tailc"], mat="skin")
        body = [(bx - L, by), (bx - L * 0.5, by - bh * 0.5 - arch), (bx + L * 0.3, by - bh * 0.55 - arch * 0.6), (bx + L * 0.9, by - bh * 0.45), (bx + L * 1.05, by + bh * 0.1), (bx + L * 0.6, by + bh * 0.5), (bx - L * 0.4, by + bh * 0.5), (bx - L * 1.05, by + bh * 0.2)]
        c.poly(body, fur, bevel=bh * 0.45, mat="fur")
        c.ell(bx + L * 0.35, by + bh * 0.25, L * 0.45, bh * 0.25, belly, mat="fur", line=None, tone=0)
        # head on the front
        hx, hy = bx + L * 1.05 + sp.get("hgap", 4), by - bh * 0.55 - (6 if pose == "cast1" else 0)
        sp["head"](c, hx, hy, hr, 2, P)
        leg_(bx + L * 0.75, legs[0], 0, True, raise_=swipe)
        leg_(bx - L * 0.65, legs[2], 0, False)
        return
    bx = 40.0
    # front/back: the haunches behind, the chest, two forelegs, the head on top
    hy = sp["by"] - bh * 0.9 + crouch - (6 if pose == "cast1" else 0)
    if v == 1:
        if tail == "curl":
            c.tube([(bx, by + bh * 0.2, 3.5), (bx + 8 + sway, by - 6 - arch, 3.2), (bx + 4 + sway * 1.5, by - 26 - arch, 2.6), (bx - 3 + sway, by - 32 - arch, 1.8)], fur, mat="fur")
    for s_ in (-1, 1):
        c.ell(bx + s_ * L * 0.45, by + bh * 0.35, L * 0.42, bh * 0.55, fur, mat="fur", tone=-1 if v == 0 else 0)
        c.ell(bx + s_ * L * 0.55, 146, sp["legr"] * 1.6, sp["legr"] * 0.9, fur, mat="fur", tone=-1 if v == 0 else 0)
    c.ell(bx, by, L * 0.5, bh * 0.75, fur, mat="fur", part=1500)
    if v == 0:
        c.ell(bx, by + bh * 0.1, L * 0.3, bh * 0.55, belly, mat="fur", line=None, part=1500)
    for s_ in (-1, 1):
        a = legs[1] if s_ < 0 else legs[0]
        lift = max(0, a) * 0.2 + (14 if (pose == "swing1" and s_ > 0) else 0)
        x = bx + s_ * L * 0.25
        c.tube([(x, by + bh * 0.1, sp["legr"] * 1.4), (x, 146 - lift, sp["legr"])], fur, mat="fur")
        c.ell(x, 147.4 - lift, sp["legr"] * 1.3, sp["legr"] * 0.8, fur, mat="fur")
        if lift > 10:
            for k_ in (-1, 0, 1):
                c.tube([(x + k_ * 1.6, 148 - lift, 0.8), (x + k_ * 2, 152 - lift, 0.4)], "#e8e0d0", mat="horn", line=None)
    if v == 1 and tail != "curl":
        c.tube([(bx, by + bh * 0.4, 3.0), (bx + 6 + sway, by + bh * 0.9, 2.2), (bx + 10 + sway * 1.5, 146, 1.4), (bx + 18 + sway, 149, 0.6)], sp["tailc"], mat="skin")
    sp["head"](c, bx, hy, hr, v, P)
    if v == 0 and tail == "curl":
        c.tube([(bx + L * 0.5, by + bh * 0.3, 3.0), (bx + L * 0.75 + sway, by - 8 - arch, 2.6), (bx + L * 0.6 + sway * 1.5, by - 22 - arch, 2.0)], fur, mat="fur")


def cat(c, rank, view, P):
    C = dict(sw.FAMILY_COLORS["cat"])
    if rank == "rare":
        C.update(sw.FAMILY_RARE["cat"])
    fur = C["fur"]
    eyes = "gold" if rank != "rare" else "blue"
    def head(c, hx, hy, r, v, P):
        m = P.get("mouth", 0)
        hiss = P["_pose"] in ("cast0", "cast1", "swing1")
        if v == 2:
            c.poly([(hx - r * 0.5, hy - r * 0.5), (hx + r * 0.1, hy - r * 0.8), (hx - r * 0.35, hy - r * 1.7)], fur, bevel=1.5, mat="fur", line="ink")
            c.ell(hx, hy, r, r * 0.9, fur, mat="fur", line="ink", part=1600)
            c.ell(hx + r * 0.75, hy + r * 0.25, r * 0.45, r * 0.38, fur, mat="fur", line=None, part=1600)
            c.ell(hx + r * 0.45, hy - r * 0.15, r * 0.3, r * 0.22, sw.INK, line=None, part=1601)
            c.dot(hx + r * 0.52, hy - r * 0.15, "#f4e27a", r=r * 0.2, glow=eyes, line=None, part=1602)
            c.ell(hx + r * 1.15, hy + r * 0.12, r * 0.12, r * 0.1, C["nose"], line=None, part=1603)
            if hiss:
                c.poly([(hx + r * 0.5, hy + r * 0.45), (hx + r * 1.15, hy + r * 0.4), (hx + r * 0.9, hy + r * 0.85)], "#2a1018", bevel=0.5, line=None, part=1604)
                c.poly([(hx + r * 0.95, hy + r * 0.42), (hx + r * 1.1, hy + r * 0.42), (hx + r * 1.0, hy + r * 0.7)], "#f4ecdc", bevel=0.2, mat="tooth", line=None, part=1605)
            for k_ in (-1, 1):
                c.tube([(hx + r * 1.0, hy + r * 0.3, 0.35), (hx + r * 1.55, hy + r * 0.3 + k_ * r * 0.25, 0.3)], "#8a8e94", line=None)
            return
        for s_ in (-1, 1):
            c.poly([(hx + s_ * r * 0.25, hy - r * 0.6), (hx + s_ * r * 0.95, hy - r * 0.35), (hx + s_ * r * 0.85, hy - r * 1.55)], fur, bevel=1.5, mat="fur", line="ink")
            if v == 0:
                c.poly([(hx + s_ * r * 0.42, hy - r * 0.6), (hx + s_ * r * 0.8, hy - r * 0.45), (hx + s_ * r * 0.75, hy - r * 1.2)], C["nose"], bevel=0.8, line=None, tone=-1)
        c.ell(hx, hy, r * 1.05, r * 0.9, fur, mat="fur", line="ink", part=1600, flat=1.3)
        for s_ in (-1, 1):
            c.poly([(hx + s_ * r * 0.8, hy), (hx + s_ * r * 1.35, hy + r * 0.35), (hx + s_ * r * 0.7, hy + r * 0.6)], fur, bevel=1, mat="fur", line="soft", part=1600)
        if v == 1:
            return
        for s_ in (-1, 1):
            c.ell(hx + s_ * r * 0.42, hy - r * 0.08, r * 0.3, r * 0.27, sw.INK, line=None, part=1601)
            c.ell(hx + s_ * r * 0.42, hy - r * 0.08, r * 0.24, r * 0.22, "#f4e27a", glow=eyes, line=None, part=1602)
            c.ell(hx + s_ * r * 0.42, hy - r * 0.08, r * 0.06, r * 0.2, sw.INK, line=None, part=1603)
            for k_ in (-1, 1):
                c.tube([(hx + s_ * r * 0.35, hy + r * 0.35, 0.35), (hx + s_ * r * 1.5, hy + r * 0.3 + k_ * r * 0.18, 0.3)], "#8a8e94", line=None, part=1604)
        c.poly([(hx - r * 0.12, hy + r * 0.2), (hx + r * 0.12, hy + r * 0.2), (hx, hy + r * 0.32)], C["nose"], bevel=0.3, line=None, part=1605)
        if hiss:
            c.ell(hx, hy + r * 0.5, r * 0.3, r * 0.2, "#2a1018", line=None, part=1606)
            for s_ in (-1, 1):
                c.poly([(hx + s_ * r * 0.2 - 0.6, hy + r * 0.38), (hx + s_ * r * 0.2 + 0.6, hy + r * 0.38), (hx + s_ * r * 0.2, hy + r * 0.62)], "#f4ecdc", bevel=0.2, mat="tooth", line=None, part=1607)
        if rank == "boss":
            crown(c, Box(hx, hy), r * 0.85, col="#e0c060", gem="#b07aff", h=6, glow="violet", view=v)
        elif rank == "mini":
            c.ell(hx, hy + r * 0.95, r * 0.7, 2.2, "#8a8e94", mat="metal", line="ink")
    sp = dict(fur=fur, belly=sw.lt(fur), eye=C["eye"], eyes=eyes, by=98, len=26, bh=34, hr=17, leg=50, legr=4.6, tail="curl", sbx=31.0, hgap=1, head=head)
    return beast4(c, rank, view, P, sp)


def rat(c, rank, view, P):
    C = dict(sw.FAMILY_COLORS["rat"])
    if rank == "rare":
        C.update(sw.FAMILY_RARE["rat"])
    fur = C["fur"]
    eyes = "red"
    def head(c, hx, hy, r, v, P):
        m = P.get("mouth", 0)
        if v == 2:
            c.ell(hx - r * 0.3, hy - r * 0.6, r * 0.45, r * 0.5, C["ear"], mat="skin", line="ink")
            c.poly([(hx - r * 0.8, hy - r * 0.6), (hx + r * 0.3, hy - r * 0.7), (hx + r * 1.7, hy + r * 0.15), (hx + r * 1.6, hy + r * 0.4), (hx - r * 0.6, hy + r * 0.8)], fur, bevel=r * 0.5, mat="fur", line="ink", part=1700)
            c.ell(hx + r * 1.68, hy + r * 0.2, r * 0.16, r * 0.13, C["nose"], line=None, part=1701)
            c.ell(hx + r * 0.4, hy - r * 0.2, r * 0.18, r * 0.16, sw.INK, line=None, part=1702)
            c.dot(hx + r * 0.43, hy - r * 0.2, "#ff3a50", r=r * 0.1, glow=eyes, line=None, part=1703)
            c.poly([(hx + r * 1.3, hy + r * 0.45), (hx + r * 1.5, hy + r * 0.45), (hx + r * 1.42, hy + r * 0.8 + m * 0.5)], "#f4e27a", bevel=0.2, mat="tooth", line="ink", part=1704)
            for k_ in (-1, 1):
                c.tube([(hx + r * 1.4, hy + r * 0.25, 0.3), (hx + r * 1.85, hy + r * 0.2 + k_ * r * 0.3, 0.25)], "#c8c8d0", line=None)
            return
        for s_ in (-1, 1):
            c.ell(hx + s_ * r * 0.8, hy - r * 0.55, r * 0.5, r * 0.5, C["ear"], mat="skin", line="ink", tone=-1 if v == 1 else 0)
        c.ell(hx, hy, r * 0.95, r * 0.85, fur, mat="fur", line="ink", part=1700, flat=1.3)
        if v == 1:
            return
        c.ell(hx, hy + r * 0.45, r * 0.5, r * 0.45, sw.lt(fur), mat="fur", line=None, part=1700)
        c.ell(hx, hy + r * 0.3, r * 0.2, r * 0.14, C["nose"], line=None, part=1701)
        for s_ in (-1, 1):
            c.ell(hx + s_ * r * 0.4, hy - r * 0.15, r * 0.2, r * 0.18, sw.INK, line=None, part=1702)
            c.dot(hx + s_ * r * 0.4, hy - r * 0.14, "#ff3a50", r=r * 0.11, glow=eyes, line=None, part=1703)
            for k_ in (-1, 1):
                c.tube([(hx + s_ * r * 0.3, hy + r * 0.4, 0.3), (hx + s_ * r * 1.5, hy + r * 0.35 + k_ * r * 0.2, 0.25)], "#c8c8d0", line=None, part=1705)
        c.poly([(hx - r * 0.18, hy + r * 0.55), (hx + r * 0.18, hy + r * 0.55), (hx + r * 0.16, hy + r * 0.95 + m * 0.4), (hx - r * 0.16, hy + r * 0.95 + m * 0.4)], "#f4e27a", bevel=0.3, mat="tooth", line="ink", part=1704)
        c.tube([(hx, hy + r * 0.56, 0.3), (hx, hy + r * 0.92, 0.3)], "#8a6840", line=None, part=1706)
        if rank == "boss":
            crown(c, Box(hx, hy), r * 0.8, col="#e0c060", gem="#a02030", h=6, glow="red", view=v)
        elif rank == "mini":
            c.ell(hx, hy + r * 0.95, r * 0.7, 2.2, "#8a8e94", mat="metal", line="ink")
    sp = dict(fur=fur, belly=sw.lt(fur), eye=C["eye"], eyes=eyes, by=112, len=27, bh=29, hr=15, leg=36, legr=4.2, sbx=33.0, hgap=0, tail="long", tailc=C["tail"], head=head, arch=4)
    return beast4(c, rank, view, P, sp)


def mimic(c, rank, view, P):
    C = sw.FAMILY_COLORS["mimic"]
    pose = _pose(P)
    v = view
    open_ = {"stand": 0.15, "idle": 0.3, "walk0": 0.25, "walk1": 0.45, "walk2": 0.25, "swing0": 0.9, "swing1": 0.5, "swing2": 0.3, "cast0": 0.7, "cast1": 1.0, "cast2": 0.6}[pose]
    hop = {"walk1": -6, "swing0": -3, "cast1": -4}.get(pose, 0)
    legs = quad_legs(pose)
    bx = 40.0
    W, H = 34, 26
    base = 136 + hop
    lid_h = 18
    ang = open_ * 55
    def legs_draw(tone_back):
        for i, s_ in enumerate((-1, 1)):
            for j, fb in enumerate((-1, 1)):
                if v == 2:
                    x = bx + fb * 22
                    tone = -1 if s_ < 0 else 0
                    if (tone < 0) != tone_back:
                        continue
                else:
                    x = bx + s_ * (24 if fb > 0 else 18)
                    tone = -1 if fb < 0 else 0
                    if (fb < 0) != tone_back:
                        continue
                a = legs[i * 2 + j]
                kx = x + s_ * 6 + (a * 0.15 if v == 2 else 0)
                c.tube([(x, base - 2, 3.4), (kx, base + 4 - hop * 0.3, 2.6), (x + (a * 0.2 if v == 2 else s_ * 2), 148.5, 2.0)], C["leg"], mat="hide", tone=tone)
                for k_ in (-1, 0, 1):
                    c.tube([(x + (a * 0.2 if v == 2 else s_ * 2), 148.5, 0.8), (x + (a * 0.2 if v == 2 else s_ * 2) + k_ * 1.6 + 1.5, 149.6, 0.4)], "#e8e0d0", mat="horn", line=None, tone=tone)
    legs_draw(True)
    if v == 2:
        mimic_side(c, P, C, pose, open_, ang, base, H, lid_h)
        legs_draw(False)
        return
    hw = W
    # the chest
    c.poly([(bx - hw, base - H), (bx + hw, base - H), (bx + hw, base), (bx - hw, base)], C["wood"], bevel=3, mat="wood")
    for s_ in (-1, 1):
        c.poly([(bx + s_ * hw - 3, base - H), (bx + s_ * hw + 0.5 * s_, base - H), (bx + s_ * hw + 0.5 * s_, base), (bx + s_ * hw - 3 * s_, base)] if s_ > 0 else [(bx - hw - 0.5, base - H), (bx - hw + 3, base - H), (bx - hw + 3, base), (bx - hw - 0.5, base)], C["lid"], bevel=1, mat="gold", line="soft")
    c.tube([(bx - hw, base - H * 0.45, 1.4), (bx + hw, base - H * 0.45, 1.4)], C["lid"], mat="gold", line="soft")
    # the open maw between the box and the lid, with teeth and the tongue
    top = base - H
    gap = 4 + open_ * 22
    if v != 1:
        c.poly([(bx - hw + 2, top), (bx + hw - 2, top), (bx + hw - 4, top - gap), (bx - hw + 4, top - gap)], C["maw"], bevel=2, line=None, part=1800)
        for k_ in range(9):
            x = bx - hw + 5 + k_ * (2 * hw - 10) / 8
            c.poly([(x - 2, top), (x + 2, top), (x, top - 3 - open_ * 3)], C["tooth"], bevel=0.3, mat="tooth", line="ink", part=1801)
            c.poly([(x - 2, top - gap), (x + 2, top - gap), (x, top - gap + 3 + open_ * 3)], C["tooth"], bevel=0.3, mat="tooth", line="ink", part=1801)
        if open_ > 0.35:
            tl = 6 + open_ * 22
            c.tube([(bx, top - 2, 4), (bx + 6 + P["sway"], top + tl * 0.6, 3.6), (bx + 2 + P["sway"] * 1.5, top + tl, 2.4)], C["tongue"], mat="mouth", line="ink")
        for s_ in (-1, 1):
            c.dot(bx + s_ * hw * 0.45, top - gap * 0.5, "#e07a2f", r=2.2 + open_ * 1.2, glow="fire", line=None, part=1802)
    # the lid, lifted (playtest1s: seen from behind it stays on its hinge, tipping up, where it floated over a gap)
    ly = top - gap if v != 1 else top
    if v == 1:
        lid_h = lid_h + open_ * 10
    lid = [(bx - hw - 1, ly), (bx + hw + 1, ly), (bx + hw - 1, ly - lid_h * 0.6), (bx + hw * 0.6, ly - lid_h), (bx - hw * 0.6, ly - lid_h), (bx - hw + 1, ly - lid_h * 0.6)]
    c.poly(lid, C["wood"], bevel=4, mat="wood")
    c.tube([(bx - hw - 1, ly - 1, 1.6), (bx + hw + 1, ly - 1, 1.6)], C["lid"], mat="gold", line="soft")
    c.tube([(bx - hw * 0.6, ly - lid_h + 1, 1.4), (bx + hw * 0.6, ly - lid_h + 1, 1.4)], C["lid"], mat="gold", line="soft")
    if v == 0:
        c.poly([(bx - 4, ly - 2), (bx + 4, ly - 2), (bx + 4, ly + 6), (bx, ly + 9), (bx - 4, ly + 6)], C["latch"], bevel=1, mat="metal", line="ink")
        c.ell(bx, ly + 3, 1.6, 2.0, "#2a1018", line=None)
    legs_draw(False)


def mimic_side(c, P, C, pose, open_, ang, base, H, lid_h):
    """playtest1s [OWNER-APPROVED 2026-10-04 14:08 ET: playtest1s big sprite audit]: the mimic in profile (east): the
    chest's depth, the lid hinged at the back and opening to the front, the maw a wedge of teeth between them facing
    east, one eye's glow in it and the tongue out over the front (it was the front view squeezed, its face to the viewer)."""
    bx = 40.0
    hw = 22.0
    top = base - H
    c.poly([(bx - hw, top), (bx + hw, top), (bx + hw, base), (bx - hw, base)], C["wood"], bevel=3, mat="wood")
    c.poly([(bx + hw - 3, top), (bx + hw + 0.5, top), (bx + hw + 0.5, base), (bx + hw - 3, base)], C["lid"], bevel=1, mat="gold", line="soft")
    c.poly([(bx - hw - 0.5, top), (bx - hw + 3, top), (bx - hw + 3, base), (bx - hw - 0.5, base)], C["lid"], bevel=1, mat="gold", line="soft")
    c.tube([(bx - hw, base - H * 0.45, 1.4), (bx + hw, base - H * 0.45, 1.4)], C["lid"], mat="gold", line="soft")
    a = ang * 1.1
    hx0, hy0 = bx - hw, top
    def lr(x, y):
        return rot(x, y, -a, hx0, hy0)
    lip = lr(bx + hw + 1, top)
    if open_ > 0.05:
        c.poly([(hx0 + 3, top), (bx + hw - 1, top), lip], C["maw"], bevel=1.5, line=None, part=1800)
        nx, ny = rot(0.0, 1.0, -a)
        for k_ in range(5):
            t = 0.3 + k_ * 0.17
            x = bx - hw + 2 * hw * t
            c.poly([(x - 2, top), (x + 2, top), (x, top - 3 - open_ * 3)], C["tooth"], bevel=0.3, mat="tooth", line="ink", part=1801)
            ux, uy = lr(x, top)
            c.poly([(ux - 2 * math.cos(math.radians(a)), uy + 2 * math.sin(math.radians(a))), (ux + 2 * math.cos(math.radians(a)), uy - 2 * math.sin(math.radians(a))),
                    (ux + nx * (3 + open_ * 3), uy + ny * (3 + open_ * 3))], C["tooth"], bevel=0.3, mat="tooth", line="ink", part=1801)
        ex, ey = bx + hw * 0.25, top
        lx, ly = lr(ex, top)
        c.dot((ex + lx) / 2, (ey + ly) / 2, "#e07a2f", r=2.2 + open_ * 1.2, glow="fire", line=None, part=1802)
        if open_ > 0.35:
            tl = 6 + open_ * 22
            c.tube([(bx + hw * 0.4, top - 2, 4), (bx + hw + 4 + P["sway"], top + tl * 0.4, 3.6), (bx + hw + 3 + P["sway"] * 1.5, top + tl * 0.8, 2.4)], C["tongue"], mat="mouth", line="ink")
    lid = [lr(x, y) for x, y in ((bx - hw - 1, top), (bx + hw + 1, top), (bx + hw - 1, top - lid_h * 0.6), (bx + hw * 0.6, top - lid_h), (bx - hw * 0.6, top - lid_h), (bx - hw + 1, top - lid_h * 0.6))]
    c.poly(lid, C["wood"], bevel=4, mat="wood")
    b0, b1 = lr(bx - hw - 1, top - 1), lr(bx + hw + 1, top - 1)
    c.tube([(b0[0], b0[1], 1.6), (b1[0], b1[1], 1.6)], C["lid"], mat="gold", line="soft")
    t0, t1 = lr(bx - hw * 0.6, top - lid_h + 1), lr(bx + hw * 0.6, top - lid_h + 1)
    c.tube([(t0[0], t0[1], 1.4), (t1[0], t1[1], 1.4)], C["lid"], mat="gold", line="soft")
    # the latch on the lid's front lip
    q = [lr(x, y) for x, y in ((bx + hw - 1, top - 2), (bx + hw + 2, top - 2), (bx + hw + 2, top + 5), (bx + hw - 1, top + 5))]
    c.poly(q, C["latch"], bevel=0.8, mat="metal", line="ink")


# ================================================================ tail
# ---------------------------------------------------------------- sheets, masks, shapes (playtest1r)

DRAW = {
    "zombie": zombie, "skeleton": skeleton, "ghost": ghost, "bat": bat, "ghoul": ghoul, "witch": witch, "lantern": lantern,
    "scarecrow": scarecrow, "wolf": wolf, "mummy": mummy, "vampire": vampire, "tree": tree, "lich": lich, "horse": horse,
    "goblin": goblin, "cat": cat, "rat": rat, "mimic": mimic, "pumpkin-lord": pumpkin_lord, "krampus": krampus,
}
# each family's signature neon: the cold fire of its rim light (blue for the dead, violet for the hexed, red for blood and flame)
NEON_OF = {
    "zombie": "blue", "skeleton": "blue", "ghost": "blue", "mummy": "blue", "lich": "blue",
    "bat": "violet", "ghoul": "violet", "witch": "violet", "tree": "violet", "cat": "violet", "mimic": "violet",
    "lantern": "red", "wolf": "red", "vampire": "red", "horse": "red", "goblin": "red", "rat": "red", "scarecrow": "red",
    "pumpkin-lord": "red", "krampus": "red",
}


def probe(fam, rank, s=2, pad=24):
    """how far a family reaches in design units (any pose, any view), drawn on a wide canvas: (side reach from x=40,
    height over the soles)"""
    dx = dy = 0.0
    for v in (0, 1, 2):
        for p in POSES:
            c = Cell(s, NEON_OF[fam], pad=pad)
            P = dict(BASE_POSE[p])
            P["_pose"] = p
            DRAW[fam](c, rank, v, P)
            img, _ = c.render()
            on = img != 0
            if on.any():
                dx = max(dx, float(np.abs(c.X[on] - 40.0).max() + 0.5 / c.k))
                dy = max(dy, float((150.0 - c.Y[on]).max() + 0.5 / c.k))
    return dx, dy


# a family drawn larger than its design (the bat's design hovers small in a cell this tall)
SIZE = {"bat": 1.25}
_FIT = {}
def fit_of(fam, rank):
    """the family's size in its cell: 1, or a touch less when its reach would leave the cell (REACH_X each side, REACH_UP up)"""
    key = (fam, rank)
    if key not in _FIT:
        dx, dy = probe(fam, rank)
        _FIT[key] = round(min(SIZE.get(fam, 1.0), (REACH_X - 1.5) / dx, REACH_UP / dy), 3)
    return _FIT[key]


def cell(fam, rank, s, view, pose):
    """one big cell: codes and its glow mask. view 0 front, 1 back, 2 east, 3 west (the east drawing turned over; a
    person's arms trade places first, playtest1s). Then the playtest1s tidy (_tidy)."""
    c = Cell(s, NEON_OF[fam], fit=fit_of(fam, rank))
    P = dict(BASE_POSE[pose])
    P["_pose"] = pose
    P["_west"] = view == 3  # playtest1s: person() keeps the weapon in the right hand facing west (the far one)
    DRAW[fam](c, rank, 2 if view == 3 else view, P)
    img, glow = c.render()
    img = _tidy(img, glow, s)
    if view == 3:
        img, glow = img[:, ::-1], glow[:, ::-1]
    return img, glow


def _parts(on, eight):
    """the connected parts of a mask (8- or 4-connected), largest first: lists of (y, x)"""
    h, w = on.shape
    seen = np.zeros_like(on)
    steps = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)] if eight else [(-1, 0), (0, -1), (0, 1), (1, 0)]
    out = []
    for y0, x0 in zip(*np.nonzero(on)):
        if seen[y0, x0]:
            continue
        seen[y0, x0] = True
        part = [(int(y0), int(x0))]
        i = 0
        while i < len(part):
            y, x = part[i]
            i += 1
            for dy, dx in steps:
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and on[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    part.append((yy, xx))
        out.append(part)
    out.sort(key=lambda q: (-len(q), q[0]))
    return out


def _tidy(img, glow, s):
    """playtest1s [OWNER-APPROVED 2026-10-04 14:08 ET: playtest1s big sprite audit]: the audit's clean-up of a drawn cell (qa/playtest1s/sheet_audit.py measures the same
    things). A pinhole, a transparent bit the body closes round (4-connected, under max(2, s) px), takes the commonest
    colour beside it, so no ground shows through a hem or a seam; a crumb, a bit standing apart from the body (8-connected,
    under max(4, s*s) px) with no glow in it, is dropped (the thin tip of a hat, a tatter or a raised foot the raster cut
    off). Glow bits (sparks, motes, an orb) stand apart on purpose and stay."""
    img = img.copy()
    on = img != 0
    h, w = on.shape
    hole = max(2, s)
    for part in _parts(~on, False)[1:]:
        if len(part) >= hole or any(y in (0, h - 1) or x in (0, w - 1) for y, x in part):
            continue
        for y, x in part:
            near = [int(img[yy, xx]) for yy in (y - 1, y, y + 1) for xx in (x - 1, x, x + 1) if 0 <= yy < h and 0 <= xx < w and img[yy, xx] != 0]
            if near:
                img[y, x] = max(sorted(set(near)), key=near.count)
    on = img != 0
    crumb = max(4, s * s)
    for part in _parts(on, True)[1:]:
        if len(part) < crumb and not any(glow[y, x] for y, x in part):
            for y, x in part:
                img[y, x] = 0
    return img


def sheet_codes(fam, rank, s):
    H, W = CELL_H * s, CELL_W * s
    out = np.zeros((4 * H, POSES_N * W), np.int64)
    em = np.zeros((4 * H, POSES_N * W), bool)
    for v in range(4):
        for i, p in enumerate(POSES):
            img, g = cell(fam, rank, s, v, p)
            out[v * H:(v + 1) * H, i * W:(i + 1) * W] = img
            em[v * H:(v + 1) * H, i * W:(i + 1) * W] = g & (img != 0)
    return out, em


def _image(c):
    h, w = c.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    on = c != 0
    out[..., 0] = (c >> 16) & 255
    out[..., 1] = (c >> 8) & 255
    out[..., 2] = c & 255
    out[..., 3] = np.where(on, 255, 0)
    out[~on] = 0
    return Image.fromarray(out, "RGBA")


# the rank defaults the measured hurt radius and foot are held near (bigboss.ts BODY and FOOT): a body's own shape moves
# them, within reason, so a fight's reach and the arenas the 1p audit cleared still hold
RANK_BODY = {"boss": 22, "mini": 11, "rare": 5}
RANK_FOOT = {"boss": (18, 8), "mini": (9, 4), "rare": (4, 2)}


def _clamp(v, lo, hi):
    return int(max(lo, min(hi, v)))


def shape_of(codes, s, rank):
    """what the game needs to know of a big body's silhouette, in px at its scale, measured from the sheet:
      top   how high its top stands over the feet point (stand, idle and walk poses, front and side views)
      half  how far it reaches either side of the feet point (any pose, any view)
      body  the hurt radius: the median half-width of the body's middle (the run through its centre line, front stand,
            from 35% to 75% of its height), held within 0.75-1.5x the rank's BODY
      foot  the ground it covers: rx the half-width of its lowest 2 rows (front stand), ry a little under half that
            (the side view's depth), held within 0.75-1.35x the rank's FOOT"""
    H, W = CELL_H * s, CELL_W * s
    feet = SOLE * s + 2
    cx = CELL_W // 2 * s
    def c_(v, p):
        return codes[v * H:(v + 1) * H, p * W:(p + 1) * W] != 0
    top = 0
    half = 0
    for v in range(4):
        for p in range(POSES_N):
            a = c_(v, p)
            ys = np.nonzero(a.any(1))[0]
            xs = np.nonzero(a.any(0))[0]
            if not len(ys):
                continue
            if p <= 4 and v in (0, 2):
                top = max(top, feet - int(ys[0]))
            half = max(half, int(max(cx - xs[0], xs[-1] + 1 - cx)))
    a = c_(0, 0)
    ys = np.nonzero(a.any(1))[0]
    widths = []
    for y in range(int(feet - top * 0.75), int(feet - top * 0.35) + 1):
        row = a[y]
        if not row[cx] and not row[cx - 1]:
            continue
        l = cx if row[cx] else cx - 1
        while l > 0 and row[l - 1]:
            l -= 1
        r = cx - 1 if not row[cx] else cx
        while r < W - 1 and row[r + 1]:
            r += 1
        widths.append(max(cx - l, r + 1 - cx))
    bo = RANK_BODY[rank]
    body = _clamp(round(float(np.median(widths))) if widths else bo, round(bo * 0.75), round(bo * 1.5))
    fx, fy = RANK_FOOT[rank]
    low = a[ys[-1] - 1:ys[-1] + 1].any(0)
    xs = np.nonzero(low)[0]
    rx = _clamp(max(cx - xs[0], xs[-1] + 1 - cx) if len(xs) else fx, round(fx * 0.75), round(fx * 1.35))
    ry = _clamp(round(rx * 0.45), max(2, round(fy * 0.75)), round(fy * 1.35))
    return {"top": int(top), "half": int(half), "body": body, "foot": {"rx": rx, "ry": ry}}


def _check(name, im):
    a = np.asarray(im.convert("RGBA"))
    alpha = a[..., 3]
    if not np.isin(alpha, (0, 255)).all():
        raise SystemExit(f"{name}: soft alpha")
    cols = {f"#{r:02x}{g:02x}{b:02x}" for r, g, b in a[alpha == 255][:, :3].reshape(-1, 3).tolist()}
    bad = sorted(cols - set(LOCKED_V3))
    if bad:
        raise SystemExit(f"{name}: off-palette {bad[:6]}")


SHEETS = [(f, r, s) for f in ("zombie", "skeleton", "ghost", "bat", "ghoul", "witch", "lantern", "scarecrow", "wolf", "mummy", "vampire", "tree", "lich", "horse", "goblin", "cat", "rat")
          for r, s in BIG.items()] + [("mimic", "rare", 2), ("pumpkin-lord", "boss", 5), ("krampus", "boss", 5)]


def _one(job):
    fam, rank, s = job
    codes, em = sheet_codes(fam, rank, s)
    return f"{fam}-{rank}", codes, em, shape_of(codes, s, rank)


def build(only=None, workers=6):
    """every big sheet: name -> (sheet image, glow mask image, shape). The sheets are drawn in parallel processes (each
    sheet alone is the same pixels whichever process draws it)."""
    jobs = [j for j in SHEETS if not only or f"{j[0]}-{j[1]}" in only]
    if workers > 1 and len(jobs) > 1:
        import multiprocessing as mp
        with mp.get_context("fork").Pool(workers) as pool:
            res = pool.map(_one, jobs, chunksize=1)
    else:
        res = [_one(j) for j in jobs]
    made = {}
    for name, codes, em, shape in res:
        made[name] = (_image(codes), _image(np.where(em, codes, 0)), shape)
    # a mini's and a rare's hurt radius and foot follow their boss's shape (the same design, measured where it is
    # largest, so a thin 2x line or a gap between arm and body cannot make one family's ranks disagree)
    for name, (_, _, shape) in made.items():
        fam, rank = name.rsplit("-", 1)
        boss = made.get(f"{fam}-boss")
        if rank == "boss" or boss is None:
            continue
        b = boss[2]
        kb = min(1.5, max(0.75, b["body"] / RANK_BODY["boss"]))
        kf = min(1.35, max(0.75, b["foot"]["rx"] / RANK_FOOT["boss"][0]))
        fx, fy = RANK_FOOT[rank]
        shape["body"] = int(round(RANK_BODY[rank] * kb))
        rx = int(round(fx * kf))
        shape["foot"] = {"rx": rx, "ry": _clamp(round(rx * 0.45), max(2, round(fy * 0.75)), round(fy * 1.35))}
    return made


def shapes_ts(made):
    """src/game/bigshapes.ts: the measured shapes, as data"""
    rows = [f'  "{n}": {{ top: {v[2]["top"]}, half: {v[2]["half"]}, body: {v[2]["body"]}, foot: {{ rx: {v[2]["foot"]["rx"]}, ry: {v[2]["foot"]["ry"]} }} }},' for n, v in sorted(made.items())]
    return ("/**\n * playtest1r " + TAG_1R + ": each big sheet's\n"
            " * silhouette as the game needs it, measured by tools/sprite-writer/boss_writer.py from the sheets it draws (do not\n"
            " * edit by hand; re-run the writer): top = how high the body stands over its feet point (stand, idle, walk; front and\n"
            " * side), half = how far it reaches either side in any pose, body = its half-width at mid-height (the hurt radius),\n"
            " * foot = the ground it covers (front width, side depth). All in px at the sheet's scale. bigboss.ts reads it.\n */\n"
            "export type BigShape = { top: number; half: number; body: number; foot: { rx: number; ry: number } };\n"
            "export const BIG_SHAPES: Record<string, BigShape> = {\n" + "\n".join(rows) + "\n};\n")


def main(out=None):
    import make_gravewake as m
    default = out is None
    out = out or m.OUT
    big = out / "big"
    big.mkdir(parents=True, exist_ok=True)
    made = build()
    files = {}
    for n, (im, em, _) in made.items():
        files[f"{n}.png"] = im
        files[f"{n}_em.png"] = em
    for n, im in files.items():
        _check(n, im)
        im.save(big / n, optimize=True)
    ts = shapes_ts(made)
    if default:
        (Path(__file__).resolve().parents[2] / "src/game/bigshapes.ts").write_text(ts)
    else:
        (out / "bigshapes.ts").write_text(ts)
    return files


if __name__ == "__main__":
    print(len(main()), "sheets")
