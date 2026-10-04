"""playtest1p [OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]: the back and side views,
laid by hand in code.

Bill (2026-10-04 01:10 ET): "Polish back inside views". playtest1o's back and side views were derived from the front
drawing (the face filled in from behind, a profile head on the front body from the side). This module draws them
properly:

  side   a true profile. The torso is its depth, not its width (4 to 7 px by build); the legs stride (front leg
         forward, back leg behind, a lifted heel, a passing knee), the arms swing past the body in the walk, boots and
         bare feet point the way the body faces; the cape, the coat tails, the scarf and the hair fall behind; the
         nose, brow, eye and ear are the head's profile (sprite_writer._face_side). Each hand keeps what it holds in
         the front view: facing east the weapon hand is the far one (behind the body) and the shield arm the near one;
         facing west it is the other way round. So the west view is its own drawing (drawn facing right with the hands
         swapped, then turned over), never the east view in a mirror; the light stays on the south-east side.
  back   the head from behind (the hair in locks with a crown light, hood seams, a helm's neck guard), shoulder blades
         and the spine seam, the belt and apron ties from behind, the cape in folds, packs and quivers
         on their straps. No face is ever shown or mirrored from behind.

Same 16x32 rig, same eleven poses and columns, the locked palette (sprite_writer._check), hard pixels, feet on row 28.
The front views (every older strip) are not touched: VIEW == "front" never reaches this module.
"""

from __future__ import annotations

import sprite_writer as sw
from sprite_writer import (
    BODY, BONE, FACE_X, GOLD, GOLD_HI, INK, ITEMS, MOUTH, PEOPLE_BOB, STEEL, STEEL_HI, WOOD, Sprite, dk, lt,
)

TAG = "[OWNER-APPROVED 2026-10-04 01:10 ET: playtest1p view polish and big bosses]"

# a body's depth seen from the side, by build (its width from the front is BUILD's x0..x1)
DEPTH = {"slim": 4, "mid": 5, "broad": 6, "stout": 7}
# where a hand ends up from its shoulder, facing right (+x forward), per arm key of the front tables
SARM = {
    "down": (0, 6), "fwd": (2, 5), "back": (-2, 5), "hip": (1, 4), "raise": (-2, -6), "strike": (4, 2),
    "follow": (3, 6), "chest": (3, 2), "up": (2, -7), "open": (4, 1), "guard": (3, 2), "reach": (5, 1),
    "long": (0, 8), "longfwd": (3, 7), "longback": (-3, 7), "claw": (5, 0),
}
# per legs key: (far foot x from the body's middle, far foot lift), (near foot x, near lift). The heel is at x, the toe x+3.
SLEGS = {
    "stand": ((-2, 0), (0, 0)),
    "idle": ((-3, 0), (0, 0)),
    "walk0": ((2, 0), (-4, 1)),   # contact: the far leg forward, the near heel lifting behind
    "walk1": ((0, 2), (-1, 0)),   # passing: the far knee comes through, the near foot planted
    "walk2": ((-4, 1), (2, 0)),   # contact: the near leg forward
    "brace": ((-4, 0), (1, 0)),
    "lunge": ((-5, 0), (3, 0)),
}
# the cape and the hair stream back a little more when the body moves
TRAIL = {"walk0": 1, "walk1": 2, "walk2": 1, "swing1": 2, "swing2": 1, "lunge": 2}


def _line(s: Sprite, x0: int, y0: int, x1: int, y1: int, color: str, thick: int = 2, edge: str | None = None) -> None:
    """A limb from (x0, y0) to (x1, y1), `thick` px across, its last pixel row/column in `edge` if given."""
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for k in range(n + 1):
        x = round(x0 + (x1 - x0) * k / n)
        y = round(y0 + (y1 - y0) * k / n)
        if abs(y1 - y0) >= abs(x1 - x0):
            s.rect(x, y, thick, 1, color)
            if edge:
                s.set(x, y, edge)
        else:
            s.rect(x, y, 1, thick, color)
            if edge:
                s.set(x, y + thick - 1, edge)


def _flip(s: Sprite) -> Sprite:
    out = Sprite(s.w, s.h)
    for y in range(s.h):
        out.p[y] = list(reversed(s.p[y]))
    return out


def person_side(spec: dict, pose: str, rank: str, sash: str | None, seed: str, bob: bool, west: bool = False) -> Sprite:
    """One person in profile, facing right; with west=True the left-facing drawing (hands swapped, light kept south-east)."""
    s = _side(spec, pose, rank, sash, seed, bob, west)
    return _flip(s) if west else s


def _side(spec: dict, pose: str, rank: str, sash: str | None, seed: str, bob: bool, west: bool) -> Sprite:
    ux, uy, hdy, legs, larm, rarm = BODY[pose]
    if bob:
        uy += PEOPLE_BOB.get(pose, 0)
    arms = spec.get("arms") or {}
    if pose in arms:
        larm, rarm = arms[pose]
    hdy += spec.get("hunch", 0)
    lean = (spec.get("lean") or {}).get(pose, 0)
    uy += spec.get("short", 0)
    ex = spec["extra"]
    staffy = spec["weapon"] in ("staff", "crystal", "scythe")
    if staffy and pose in ("cast0", "cast2"):
        rarm = "down"
    # facing right the body leans forward, never sideways (the front view's sway is a lean seen from the side)
    fwd = 1 if lean > 0 or spec.get("hunch", 0) >= 2 else 0
    if pose in ("swing1", "swing2"):
        fwd += 1
    elif pose == "swing0":
        fwd -= 1
    cx = 8 + fwd
    depth = DEPTH[spec["build"]]
    tf = cx + depth // 2          # the chest
    tb = tf - depth + 1           # the back
    ay = 14 + uy
    hip = 22 + uy
    cloth = spec["cloth"]
    lit_front = not west          # the sun is south-east: facing east the chest is lit, facing west the back
    light = lambda c: lt(c) if lt(c) != c else c  # noqa: E731
    robe, coat = spec["robe"], spec["coat"]
    trail = TRAIL.get(pose, TRAIL.get(legs, 0))
    # which arm is near the camera: facing east the body's own right arm (the front view's screen-left arm, larm)
    near_key, far_key = (rarm, larm) if west else (larm, rarm)
    weapon_near = west            # the weapon hand is the front view's screen-right hand (rarm)
    s = Sprite()

    # ---- behind everything: the cape, the high collar, a pack, a sack or a quiver on the back
    if spec["cape"]:
        c = spec["cape"]
        long = 25 if "collar" in ex else 23
        for y in range(ay, long + 1):
            spread = min(3, (y - ay) // 3) + (trail if y > ay + 5 else 0)
            left = tb - 1 - spread
            s.rect(left, y, tb + 2 - left, 1, c)
            s.set(left, y, dk(c))
            if (y - ay) % 4 == 2 and y > ay + 2:
                s.set(left + 2, y, dk(c))   # a fold
        if spec["capein"]:
            for y in range(ay + 5, long + 1):
                s.set(tb + 1, y, spec["capein"])
        for i, xx in enumerate(range(tb - 7, tb + 2)):
            if i % 3 == 1:
                s.set(xx, long, None)
    if spec["back"] == "pack":
        s.rect(tb - 4, ay - 3, 5, 11, "#6a5040")
        s.rect(tb - 4, ay - 3, 5, 1, "#8a6858")
        s.rect(tb - 4, ay - 5, 4, 2, "#c4a15a")
        s.rect(tb - 4, ay - 3, 1, 11, "#4a382c")
        s.rect(tb - 3, ay + 3, 3, 1, "#4a382c")   # the flap's strap
        s.set(tb - 2, ay + 4, "#e0c060")
    elif spec["back"] == "sack":
        s.rect(tb - 4, ay - 5, 5, 7, "#c4a050")
        s.rect(tb - 3, ay - 6, 3, 1, "#c4a050")
        s.rect(tb - 4, ay + 1, 5, 1, "#8a7048")
        s.set(tb - 2, ay - 4, lt("#c4a050"))
        s.set(tb - 3, ay - 6, "#6a5030")
    elif spec["back"] == "quiver":
        _line(s, tb - 3, ay - 5, tb - 1, ay + 4, "#5a3828", 2)
        s.pts([(tb - 4, ay - 6), (tb - 3, ay - 7), (tb - 2, ay - 6)], "#c43838")   # fletching
        s.set(tb - 3, ay - 4, "#8a5840")
    if "collar" in ex:
        hy0 = 5 + uy
        c = spec["cape"] or cloth
        s.rect(tb - 1, hy0 + 3, 2, ay - hy0 - 2, c)
        s.rect(tb - 2, hy0 + 2, 1, ay - hy0 - 2, c)
        if spec["capein"]:
            s.rect(tb, hy0 + 4, 1, ay - hy0 - 3, spec["capein"])

    # ---- the far arm and whatever its hand holds (the torso covers it)
    far_hand = _side_arm(s, spec, far_key, cx - 1, ay + 1, near=False)
    if not weapon_near:
        _held(s, spec, pose, far_hand, staffy)
    elif "shield" in ex:
        # the shield on the far arm: its rim shows in front of the chest
        hx, hy = far_hand
        s.rect(tf + 1, ay + 1, 2, 7, "#6a2030")
        s.rect(tf + 2, ay + 1, 1, 7, STEEL)
        s.set(tf + 1, ay + 1, STEEL_HI)
        s.set(tf + 2, ay + 8, dk(STEEL))
    if "dagger2" in ex and not pose.startswith("cast") and weapon_near:
        s.set(far_hand[0] + 1, far_hand[1] + 2, STEEL)

    # ---- the legs: far first, then near
    _side_legs(s, spec, legs, cx, hip, robe, ex)

    # ---- the torso, its depth
    bottom = 21 + uy
    if robe:
        bottom = 26
    elif coat:
        bottom = 24
    for y in range(ay, bottom + 1):
        x0, x1 = tb, tf
        if y == ay:
            x0, x1 = tb + 1, tf - (1 if depth > 4 else 0)
        if spec["build"] == "stout" and ay + 3 <= y <= ay + 7:
            x1 = tf + 1   # the belly
        if spec["build"] == "broad" and ay + 1 <= y <= ay + 3:
            x1 = tf + 1   # the chest
        s.rect(x0, y, x1 - x0 + 1, 1, cloth)
        back_c = light(cloth) if not lit_front and y < ay + 5 else dk(cloth)
        front_c = light(cloth) if lit_front and y < ay + 6 else (dk(cloth) if not lit_front else cloth)
        s.set(x0, y, back_c)
        s.set(x1, y, front_c)
    if robe:
        # the robe falls from the waist and its hem swings back with the stride
        sw_ = {"walk0": -1, "walk2": 1, "walk1": 0}.get(pose, 0)
        for y in range(hip - 1, 27):
            spread = (y - hip + 2) // 2
            x0 = tb - spread + (min(0, sw_) if y > 23 else 0) - (trail // 2 if y > 24 else 0)
            x1 = tf + spread // 2 + (max(0, sw_) if y > 23 else 0)
            s.rect(x0, y, x1 - x0 + 1, 1, cloth)
            s.set(x0, y, dk(cloth))
            if lit_front:
                s.set(x1, y, light(cloth) if y < 25 else cloth)
        lo = min(x for x in range(16) if s.p[25][x] == cloth or s.p[25][x] == dk(cloth))
        hi = max(x for x in range(16) if s.p[25][x] in (cloth, dk(cloth), light(cloth)))
        s.rect(lo, 25, hi - lo + 1, 1, spec["trim"])
        s.rect(lo, 26, hi - lo + 1, 1, dk(cloth))
        s.rect(cx - 1, ay + 2, 1, 10, dk(cloth))   # the side seam
    elif coat:
        # coat tails fall behind
        for y in range(21 + uy, 25):
            s.set(tb - 1 - (y - 21 - uy) // 2 - (trail if y > 22 else 0), y, cloth)
            s.set(tb - 1 - (y - 21 - uy) // 2 - (trail if y > 22 else 0) + 1, y, cloth)
        s.rect(tb - 2 - trail, 24, tf - tb + 3 + trail, 1, dk(cloth))
        s.set(tf, 21 + uy, spec["trim"])
    # collar and the chest trim at the front
    s.rect(tb + 1, ay, depth - 2, 1, spec["trim"])
    s.set(tf, ay + 1, spec["trim"])
    # the belt, its buckle at the front
    if not robe or "stole" in ex:
        by = 20 + uy
        s.rect(tb, by, tf - tb + 1, 1, spec["belt"])
        s.set(tf, by, spec["metal"] or GOLD)
        s.set(tb, by, dk(spec["belt"]))
    else:
        s.rect(tb + 1, 20 + uy, depth - 2, 1, spec["trim"])
        s.set(tb, 21 + uy, spec["trim"])   # the cord's knot hangs at the back
    _side_details(s, spec, tb, tf, cx, ay, uy, hip, sash, pose, trail, lit_front)

    # ---- the head (the profile face from sprite_writer), its hair, beard and hat
    hx = fwd + (1 if spec.get("hunch", 0) >= 1 else 0)
    hy = 5 + uy + hdy
    sw._head(s, spec, hx, hy, pose)
    sw._hair(s, spec, hx, hy)
    if spec["hairstyle"] in ("long", "pony") and trail and spec["hat"] not in ("hood", "cowl"):
        s.set(FACE_X + hx - 1 - (1 if trail > 1 else 0), hy + 6, dk(spec["hair"]))   # the hair lifts behind
    sw._beard(s, spec, hx, hy, long=sw.role_long_beard(spec))
    if "mask" in ex:
        s.rect(FACE_X + hx + 4, hy + 5, 4, 3, spec["hatc"])
        s.set(FACE_X + hx + 7, hy + 5, lt(spec["hatc"]))
    _side_hat(s, spec, hx, hy)
    if spec["hat"] in ("hood", "cowl"):
        face = Sprite()
        sw._head(face, spec, hx, hy, pose)
        sw._beard(face, spec, hx, hy, long=sw.role_long_beard(spec))
        if "mask" in ex:
            face.rect(FACE_X + hx + 4, hy + 5, 4, 3, spec["hatc"])
        for yy in range(hy + 2, hy + 8):
            for xx in range(FACE_X + hx + 4, FACE_X + hx + 9):
                if 0 <= yy < 32 and 0 <= xx < 16 and face.get(xx, yy):
                    s.p[yy][xx] = face.p[yy][xx]
        s.rect(FACE_X + hx + 4, hy + 2, 4, 1, dk(spec["skin"]) if "faceless" not in ex else "#101820")
        s.rect(FACE_X + hx + 3, hy + 2, 1, 6, dk(spec["hatc"]))   # the hood's rim
    if "gem" in ex:
        s.rect(FACE_X + hx + 5, hy - 1, 2, 2, "#9ec4e0")
        s.set(FACE_X + hx + 6, hy - 1, "#e8f2f8")
        s.pts([(FACE_X + hx + 4, hy), (FACE_X + hx + 7, hy)], GOLD)
    if "specs" in ex:
        s.pts([(FACE_X + hx + 5, hy + 4), (FACE_X + hx + 7, hy + 4)], GOLD)
        s.set(FACE_X + hx + 4, hy + 4, GOLD)

    # ---- the near arm last, and what its hand holds
    near_hand = _side_arm(s, spec, near_key, cx, ay + 1, near=True)
    if weapon_near:
        _held(s, spec, pose, near_hand, staffy)
    elif "shield" in ex:
        # the shield on the near arm, its face to the camera
        hx_, hy_ = near_hand
        sx, sy = hx_ - 1, hy_ - 4
        face = "#6a2030"
        s.rect(sx, sy, 4, 6, face)
        s.rect(sx + 1, sy + 6, 2, 1, face)
        s.rect(sx, sy, 4, 1, STEEL_HI)
        s.rect(sx, sy, 1, 6, STEEL)
        s.rect(sx + 3, sy, 1, 6, dk(STEEL))
        s.rect(sx + 1, sy + 1, 1, 5, GOLD)
        s.rect(sx, sy + 2, 3, 1, GOLD)
    if "dagger2" in ex and not pose.startswith("cast") and not weapon_near:
        s.set(near_hand[0] + 1, near_hand[1] + 2, STEEL_HI)
        s.set(near_hand[0] + 1, near_hand[1] + 3, STEEL)
    sw._rank_marks(s, spec, rank, hx, hy, tb, tf, ay)
    s.outline()
    core, ring = spec["glow"]
    wh = near_hand if weapon_near else far_hand
    oh = far_hand if weapon_near else near_hand
    if pose == "cast0":
        if staffy:
            sw._glow(s, wh[0] + 1, max(1, wh[1] - 16), 1, core, ring)
        sw._glow(s, oh[0] + 1, oh[1] - 1, 1, core, ring)
    elif pose == "cast1":
        if staffy:
            sw._glow(s, wh[0] + 1, max(2, wh[1] - 17), 3, core, ring)
        else:
            sw._glow(s, min(14, max(near_hand[0], far_hand[0]) + 2), max(2, min(near_hand[1], far_hand[1]) - 1), 3, core, ring)
    elif pose == "cast2":
        sw._scatter(s, core, ring, seed)
    return s


def _side_arm(s: Sprite, spec: dict, key: str, sx: int, sy: int, near: bool) -> tuple[int, int]:
    dx, dy = SARM.get(key, (0, 6))
    sleeve = spec.get("sleeve") or (spec["cloth"] if "barearms" not in spec["extra"] else spec["skin"])
    if "mail" in spec["extra"]:
        sleeve = STEEL
    if not near:
        sleeve = dk(sleeve)
    ex, ey = sx + dx, sy + dy
    _line(s, sx, sy, ex, ey - (1 if dy > 0 else -1 if dy < 0 else 0), sleeve, 2, dk(sleeve) if near else None)
    if near and abs(dy) >= 3:
        s.set(sx + 1, sy, lt(sleeve) if lt(sleeve) != sleeve else sleeve)   # the shoulder's light
    hand = spec["gloves"] or spec["skin"]
    if not near:
        hand = dk(hand)
    hx, hy = ex, ey
    s.rect(hx, hy, 2, 2, hand)
    s.set(hx, hy + 1, dk(hand))
    if "handclaws" in spec["extra"]:
        s.pts([(hx + 2, hy + 1), (hx + 2, hy + 2)], BONE)
    return hx, hy


def _held(s: Sprite, spec: dict, pose: str, hand: tuple[int, int], staffy: bool) -> None:
    hx, hy = hand
    if pose in ("stand", "idle", "walk0", "walk1", "walk2"):
        sw._weapon_rest(s, spec, hx, hy)
        if spec["item"]:
            ITEMS[spec["item"]](s, hx, hy)
    elif pose.startswith("swing"):
        sw._swing_weapon(s, spec, pose, hx, hy)
    elif staffy:
        sw._weapon_rest(s, spec, hx, hy)


def _side_legs(s: Sprite, spec: dict, legs: str, cx: int, hip: int, robe: bool, ex: tuple) -> None:
    pants = spec["pants"] or dk(spec["cloth"], 2)
    boot = spec["boot"]
    thin = "thinlegs" in ex
    bare = "bare" in ex
    for i, (fdx, lift) in enumerate(SLEGS[legs]):
        near = i == 1
        p = pants if near else dk(pants)
        b = boot if near else dk(boot)
        fx = cx + fdx - 1      # heel
        ft = 26 - lift         # top of the boot
        hx = cx - 1 - (0 if near else 0)
        if not robe:
            if thin:
                _line(s, hx + 1, hip, fx + 1, ft - 1, p, 1)
                kx = (hx + fx) // 2 + 1 + (1 if lift >= 2 else 0)
                s.rect(kx, (hip + ft) // 2, 2, 1, p)   # the knee
            else:
                knee = lift >= 2   # a passing knee bends forward
                if knee:
                    _line(s, hx, hip, hx + 2, hip + 2, p, 2)
                    _line(s, hx + 2, hip + 2, fx, ft - 1, p, 2)
                else:
                    _line(s, hx, hip, fx, ft - 1, p, 2, dk(p) if near else None)
        elif lift:
            # under a robe a lifted foot shows only its toe on row 27, so a robed walk still reads as steps
            if spec.get("_person"):
                s.rect(fx + 1, 27, 3, 1, b)
            continue
        if bare:
            s.rect(fx, ft + 1, 4, 2, b)
            s.set(fx + 1, ft, b)
            s.set(fx, ft + 2, dk(b))
            if "claws" in ex:
                s.pts([(fx + 4, ft + 2), (fx + 4, ft + 1)], BONE)
            continue
        s.rect(fx, ft, 2, 1, lt(b) if near else b)     # the cuff
        s.rect(fx, ft + 1, 4, 2, b)                    # the foot, toe forward
        s.set(fx + 3, ft + 1, lt(b) if near else b)    # the toe's light
        if lift:
            s.rect(fx, ft + 2, 4, 1, dk(b))            # the sole shows on a lifted foot
        else:
            s.set(fx, ft + 2, dk(b))                   # the heel


def _side_details(s: Sprite, spec: dict, tb: int, tf: int, cx: int, ay: int, uy: int, hip: int, sash: str | None, pose: str, trail: int, lit_front: bool) -> None:
    ex = spec["extra"]
    tr = spec["trim"]
    cloth = spec["cloth"]
    if spec["apron"]:
        a = spec["apron"]
        bottom = 24 if not spec["robe"] else 25
        s.rect(tf - 1, ay + 2, 2, bottom - ay - 1, a)
        s.set(tf + 1 if spec["build"] == "stout" else tf, ay + 5, a)
        s.rect(tf - 1, bottom, 2, 1, dk(a))
        s.pts([(tb - 1, 20 + uy), (tb - 2, 21 + uy)], a)   # the ties at the back
        if "stains" in ex:
            s.set(tf, ay + 7, "#6a8a32")
    if "tabard" in ex:
        s.rect(tf - 1, ay + 1, 2, 9, tr)
        s.set(tf - 1, ay + 1, dk(tr))
    if "pauldrons" in ex:
        s.rect(cx - 2, ay - 1, 4, 3, STEEL)
        s.rect(cx - 2, ay + 1, 4, 1, dk(STEEL))
        s.set(cx, ay - 1, STEEL_HI)
        s.set(cx + 1, ay - 1, STEEL_HI)
    if "vest" in ex:
        s.rect(tf - 1, ay + 1, 2, 5, dk(cloth))
        s.set(tf, ay + 2, "#f0e2c8")
        s.set(tf, ay + 4, GOLD)
    if "jabot" in ex:
        s.pts([(tf + 1, ay), (tf + 1, ay + 1), (tf, ay + 2)], "#f0e2c8")
        s.set(tf + 1, ay + 2, "#d8d0c0")
    if "bowtie" in ex:
        s.pts([(tf, ay), (tf + 1, ay)], "#6a1828")
    if "stole" in ex:
        s.rect(tf - 1, ay, 1, 11, GOLD)
        s.set(tf - 1, ay + 10, "#c4a050")
    if "badge" in ex:
        s.set(tf, ay + 2, GOLD_HI)
        s.set(tf - 1, ay + 2, GOLD)
    if "bandolier" in ex:
        for i in range(tf - tb + 1):
            s.set(tf - i, ay + 1 + (i * 5) // max(1, tf - tb), "#2a241c")
        s.set(tf - 1, ay + 2, STEEL_HI)
    if "scarf" in ex:
        s.rect(tb, ay - 1, tf - tb + 1, 2, "#8a2030")
        s.pts([(tb - 1, ay), (tb - 2 - (trail > 0), ay + 1), (tb - 3 - trail, ay + 1 + (trail == 0))], "#8a2030")
        s.set(tb - 1, ay + 1, "#6a1828")
    if "tape" in ex:
        s.rect(tf, ay, 1, 6, "#e0c060")
        s.set(tf, ay + 3, "#8a7048")
    if "shawl" in ex:
        s.rect(tb - 1, ay, tf - tb + 3, 3, "#c4b48a")
        s.rect(tb - 1, ay + 2, tf - tb + 3, 1, "#a89470")
    if "stars" in ex:
        s.pts([(tb + 1, ay + 4), (tf - 1, ay + 8), (tb + 1, 23)], GOLD_HI)
    if "runes" in ex:
        s.pts([(tb, 24), (tb + 2, 23), (tf, 24)], "#c4b4e0")
    if "wraith" in ex:
        s.clear(0, 25, 16, 4)
        drift = {"walk0": 1, "walk2": -1, "swing1": 1, "swing2": 1}.get(pose, 0)
        for i, xx in enumerate(range(tb - 2 - trail, tf + 2)):
            depth = (i * 5 + uy + drift) % 3 + (1 if xx < tb else 0)
            s.rect(xx, 25, 1, 1 + depth, cloth if i % 2 else dk(cloth))
    if "ribs" in ex:
        for yy in (ay + 1, ay + 3, ay + 5):
            s.rect(tb + 1, yy, tf - tb, 1, "#3a2830")
        s.rect(tb, ay, 1, 8, cloth)   # the spine at the back
        s.set(tb, ay + 3, dk(cloth))
        s.rect(tb, ay + 7, tf - tb + 1, 1, "#3a2830")
    if "torn" in ex:
        s.pts([(tb + 1, 21 + uy), (tf - 1, 21 + uy), (tf, ay + 3)], spec["skin"])
        s.set(tb + 2, ay + 5, dk(cloth))
    if "wraps" in ex:
        for yy in range(ay + 1, 22 + uy, 3):
            for i in range(tf - tb + 1):
                s.set(tb + i, yy + (i // 3), dk(cloth))
        s.set(tf - 1, ay + 2, lt(cloth) if lt(cloth) != cloth else "#fff8ee")
    if "furchest" in ex:
        s.rect(tf - 1, ay + 1, 2, 5, lt(cloth))
        s.pts([(tf + 1, ay + 2), (tf + 1, ay + 4), (tf, ay + 6)], lt(cloth))
    if "loin" in ex:
        s.rect(tf - 2, 20 + uy, 3, 3, tr)
        s.set(tf, 22 + uy, None)
        s.rect(tf - 2, 20 + uy, 3, 1, dk(tr))
    if "bolts" in ex:
        hy = 5 + uy + spec.get("hunch", 0)
        s.set(cx - 1, hy + 7, STEEL)
        s.set(cx - 1, hy + 8, STEEL_HI)
    if sash:
        for i in range(tf - tb + 1):
            yy = ay + 1 + (i * 6) // max(1, tf - tb)
            s.set(tf - i, yy, lt(sash))
            s.set(tf - i, yy + 1, sash)
        s.rect(tb - 1, ay + 7, 2, 2, sash)
        s.set(tb - 1, ay + 7, lt(sash))


def _side_hat(s: Sprite, spec: dict, hx: int, hy: int) -> None:
    """A hat turned to the right: brims and peaks forward, knots, plumes and points to the back."""
    hat = spec["hat"]
    c = spec["hatc"]
    d = dk(c)
    li = lt(c)
    x = FACE_X + hx
    tr = spec["trim"]
    if hat in ("none",):
        return
    if hat == "helm":
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x, hy - 1, 8, 3, c)
        s.rect(x, hy + 2, 4, 4, c)       # the cheek guard covers the back of the head
        s.rect(x, hy - 1, 1, 7, d)
        s.rect(x + 5, hy - 2, 1, 3, li)
        s.rect(x, hy + 2, 8, 1, d)       # the brow ridge
        s.set(x + 8, hy + 2, c)          # its peak over the nose
        s.rect(x + 1, hy + 5, 3, 1, d)
        s.set(x + 3, hy + 3, li)         # a rivet
        pl = spec.get("plume")
        if pl:
            s.pts([(x + 3, hy - 3), (x + 2, hy - 4), (x + 1, hy - 4), (x, hy - 3), (x - 1, hy - 2)], pl)
            s.set(x + 2, hy - 4, lt(pl))
            s.set(x - 1, hy - 1, dk(pl))
        return
    if hat == "kettle":
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x + 1, hy - 1, 6, 2, c)
        s.rect(x - 2, hy + 1, 12, 1, c)
        s.rect(x - 1, hy + 2, 10, 1, d)
        s.rect(x + 5, hy - 2, 1, 3, li)
        s.set(x + 1, hy - 1, d)
        return
    if hat == "point":
        s.rect(x - 2, hy + 1, 12, 1, c)
        s.rect(x - 1, hy + 2, 10, 1, d)
        s.rect(x, hy, 8, 1, tr)
        s.rect(x + 1, hy - 1, 6, 1, c)
        s.rect(x + 1, hy - 2, 5, 1, c)
        s.rect(x + 1, hy - 3, 4, 1, c)
        s.rect(x, hy - 4, 3, 1, c)       # the point bends back
        s.rect(x - 1, hy - 5, 2, 1, c)
        s.set(x + 1, hy - 1, d)
        s.set(x + 4, hy - 2, GOLD_HI)
        s.set(x + 3, hy - 3, li)
        return
    if hat == "witchhat":
        s.rect(x - 3, hy + 1, 14, 1, c)
        s.rect(x - 1, hy + 2, 10, 1, d)
        s.rect(x, hy, 8, 1, tr)
        s.set(x + 6, hy, GOLD)           # the buckle at the front
        s.rect(x + 1, hy - 1, 6, 1, c)
        s.rect(x + 1, hy - 2, 5, 1, c)
        s.rect(x, hy - 3, 4, 1, c)
        s.rect(x - 1, hy - 4, 3, 1, c)
        s.set(x - 2, hy - 4, d)
        s.set(x + 5, hy - 1, li)
        s.set(x + 4, hy - 2, li)
        return
    if hat == "kerchief":
        s.rect(x, hy - 1, 8, 3, c)
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x, hy + 1, 8, 1, d)
        s.pts([(x - 1, hy + 1), (x - 1, hy + 2), (x - 2, hy + 3)], c)   # the knot at the back
        s.rect(x + 4, hy - 2, 2, 1, li)
        return
    if hat == "flatcap":
        s.rect(x, hy - 1, 8, 2, c)
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x + 3, hy + 1, 7, 1, d)   # the peak forward
        s.set(x + 5, hy - 2, li)
        return
    if hat == "visor":
        s.rect(x, hy + 1, 8, 1, tr)
        s.rect(x + 3, hy + 2, 7, 1, c)   # the visor forward
        s.set(x + 8, hy + 2, lt(c))
        return
    if hat == "headband":
        s.rect(x, hy + 2, 8, 1, c)
        s.pts([(x - 1, hy + 2), (x - 2, hy + 3), (x - 1, hy + 4)], c)   # the tails at the back
        s.set(x + 5, hy + 2, lt(c))
        return
    if hat == "plume":
        s.rect(x - 2, hy + 1, 12, 1, c)
        s.rect(x, hy - 2, 7, 3, c)
        s.rect(x, hy, 7, 1, tr)
        s.set(x, hy - 2, d)
        pl = spec.get("plume") or "#c44868"
        s.pts([(x, hy - 3), (x - 1, hy - 4), (x - 2, hy - 4), (x - 3, hy - 3), (x - 3, hy - 2)], pl)   # the plume sweeps back
        s.set(x - 1, hy - 4, lt(pl))
        return
    if hat == "souwester":
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x, hy - 1, 8, 2, c)
        s.rect(x - 2, hy + 1, 12, 1, c)
        s.rect(x - 3, hy + 2, 4, 2, c)   # the long back brim
        s.rect(x - 2, hy + 3, 1, 1, d)
        s.rect(x + 5, hy - 2, 1, 2, li)
        return
    if hat == "turban":
        s.rect(x + 1, hy - 3, 6, 1, c)
        s.rect(x, hy - 2, 8, 4, c)
        s.rect(x - 1, hy - 1, 9, 2, c)
        s.rect(x - 1, hy, 9, 1, d)
        s.rect(x + 1, hy - 2, 5, 1, lt(c))
        s.set(x + 6, hy - 1, GOLD)
        s.set(x + 7, hy - 1, GOLD_HI)
        s.set(x + 6, hy - 4, spec.get("plume") or tr)
        s.set(x + 7, hy - 5, spec.get("plume") or tr)
        s.pts([(x - 1, hy + 1), (x - 2, hy + 2)], d)   # the cloth's tail behind
        return
    if hat == "goggles":
        s.rect(x, hy + 1, 8, 1, "#3a2418")
        s.rect(x + 6, hy + 1, 2, 1, "#9ec060")
        s.set(x + 7, hy + 1, "#e8f2f8")
        s.set(x + 8, hy + 1, "#3a2418")
        return
    if hat == "aviator":
        s.rect(x, hy - 1, 8, 3, c)
        s.rect(x + 1, hy - 2, 6, 1, c)
        s.rect(x, hy + 2, 4, 4, c)       # the ear flap
        s.rect(x, hy - 1, 1, 7, d)
        s.set(x + 1, hy + 4, d)
        s.rect(x + 5, hy + 1, 3, 1, "#9ec4e0")
        s.set(x + 7, hy + 1, "#e8f2f8")
        s.rect(x + 1, hy + 1, 4, 1, "#c4b48a")
        return
    if hat == "tophat":
        s.rect(x - 1, hy + 1, 10, 1, c)
        s.rect(x + 1, hy - 4, 6, 5, c)
        s.rect(x + 1, hy, 6, 1, tr)
        s.rect(x + 5, hy - 4, 1, 4, li)
        s.rect(x + 1, hy - 4, 1, 5, d)
        return
    if hat == "widebrim":
        s.rect(x - 3, hy + 1, 14, 1, c)
        s.set(x - 3, hy + 2, c)
        s.set(x + 10, hy + 2, c)
        s.rect(x + 1, hy - 2, 6, 3, c)
        s.rect(x + 1, hy, 6, 1, tr)
        s.rect(x - 2, hy + 2, 12, 1, None)
        s.rect(x + 5, hy - 2, 1, 2, li)
        s.set(x + 1, hy - 1, d)
        return
    if hat == "bowler":
        s.rect(x + 2, hy - 3, 4, 1, c)
        s.rect(x + 1, hy - 2, 6, 3, c)
        s.rect(x - 1, hy + 1, 10, 1, c)
        s.rect(x + 1, hy, 6, 1, dk(c))
        s.set(x + 5, hy - 2, li)
        return
    if hat == "mitre":
        s.rect(x + 3, hy - 5, 2, 1, c)
        s.rect(x + 2, hy - 4, 4, 1, c)
        s.rect(x + 1, hy - 3, 6, 4, c)
        s.rect(x + 1, hy - 3, 1, 4, dk(c))
        s.rect(x, hy + 1, 8, 1, GOLD)
        s.rect(x + 4, hy - 4, 1, 5, GOLD)   # the band seen edge on
        s.pts([(x, hy + 2), (x - 1, hy + 3), (x - 1, hy + 4)], GOLD)   # a lappet at the back
        return
    if hat in ("hood", "cowl"):
        s.rect(x - 1, hy, 10, 9, c)
        s.rect(x, hy - 1, 8, 1, c)
        s.pts([(x, hy - 2), (x - 1, hy - 1), (x - 2, hy)], c)   # the point falls back
        s.rect(x - 1, hy + 1, 1, 8, d)
        s.rect(x + 2, hy, 1, 8, d)        # the fold behind the opening
        s.rect(x + 6, hy, 1, 2, li)
        if hat == "cowl":
            s.rect(x + 3, hy + 1, 5, 1, tr)
            s.set(x + 7, hy, GOLD_HI)
        return
    sw._hat(s, spec, hx, hy)


# ---------------------------------------------------------------- back

TAG_1Q = "[OWNER-APPROVED 2026-10-04 05:43 ET: playtest1q detailed big bosses, wizard back view, Phone boss label]"


def _bright(c: str) -> int:
    return sum(int(c[i:i + 2], 16) for i in (1, 3, 5))


def skin_ramp(spec: dict) -> set:
    sk = spec["skin"]
    return {sk, dk(sk), dk(sk, 2), lt(sk)}


def _neck_shade(s: Sprite, x: int, hy: int, neck: set, c: str) -> None:
    """playtest1q: the neck under a head seen from behind (rows hy+8, hy+9, the middle columns) is in the hair's or the
    hat's shadow, colour c: a bare strip of skin there, between a collar, read as a mouth at 5x. A skin pixel under
    another skin pixel (a hand, an arm) is left alone."""
    for yy in (hy + 8, hy + 9):
        for xx in range(x + 1, x + 7):
            if s.get(xx, yy) in neck and s.get(xx, yy - 1) not in neck:
                s.set(xx, yy, c)


def back_head(s: Sprite, spec: dict, x: int, hy: int) -> None:
    """playtest1q [OWNER-APPROVED 2026-10-04 05:43 ET: playtest1q detailed big bosses, wizard back view, Phone boss label]: the back of a human head is hair or hat only.

    Bill (2026-10-04 05:43 ET): the wizard's back view showed a skin-coloured patch under his white hair that read as a
    face. playtest1p's locks gave pale hair a parting, brim shadow and nape line of dk(hair, 3), which for white hair is
    #c4a090 = dk(SKIN), and parted symmetrically at x+2 / x+5 (where the front's eyes sit), so a white-haired back was a
    skin-toned face with two dark eyes. From behind now:
      * every pixel of the head box (x..x+7, from the hair's top down to the nape) that is skin, a feature or a beard is
        hair; nothing in the body's own skin ramp is left there, and the hair's shades never borrow a skin colour;
      * the shading is the hair's own ramp, asymmetric (a crown light to the south-east, one parting slanting off the
        middle, a darker band at the nape): no pair of dark pixels at the eye columns;
      * a bald head shows its crown with a horseshoe of hair round the back; a stitched or tufted scalp (the zombies)
        gets its nape band and a seam down the back of the skull, not a blank face;
      * hats, hoods, helms and caps keep every pixel they drew."""
    st = spec["hairstyle"]
    hat = spec["hat"]
    h = spec["hair"]
    skin = skin_ramp(spec)
    hair_ramp = [h, dk(h), dk(h, 2), dk(h, 3), lt(h), lt(h, 2), lt(h, 3)]
    ok = [c for c in hair_ramp if c not in skin and c != INK]

    def shade(*cands: str) -> str:
        for c in cands:
            if c in ok and c != h:
                return c
        return h

    d = shade(dk(h), dk(h, 2))
    dd = shade(dk(h, 2), dk(h)) if _bright(h) > 480 else d
    li = shade(lt(h), lt(h, 2)) if _bright(h) >= 150 else shade(lt(h, 3), lt(h, 2), lt(h))
    feats = skin | {MOUTH, spec["eyes"], "#e8e0d0", "#f4f0e8", "#3a2830", "#6a2030", "#101820"}
    if spec.get("beard"):
        b = spec["beard"]
        feats |= {b, dk(b), lt(b)}
    feats -= {h}
    if hat in ("hood", "cowl", "helm", "aviator"):
        # the hood or helm is the whole head from behind; a lit skin pixel left inside it is cloth or steel
        c = spec["hatc"]
        for yy in range(hy, hy + 8):
            for xx in range(x, x + 8):
                if s.get(xx, yy) in skin:
                    s.set(xx, yy, c if hat != "aviator" else (h if yy < hy + 6 else dk(h) if dk(h) not in skin else h))
        # the neck under it is in its shadow (a hood or cowl falls over it, a helm's guard and a cap's edge shade it)
        nc = dk(c) if hat != "aviator" else (dk(h) if dk(h) not in skin else h)
        _neck_shade(s, x, hy, skin | {sw.SKIN} | set(sw.SKINS), nc)
        return
    if st in ("none", "bald"):
        # the crown is skin, with a horseshoe of hair (or the scalp's shade) round the back at the ears and nape
        band = h if st == "bald" else dk(spec["skin"]) if dk(spec["skin"]) != INK else spec["skin"]
        band_d = shade(dk(h), dk(h, 2)) if st == "bald" else band
        for yy in range(hy + 4, hy + 7):
            for xx in range(x, x + 8):
                if s.get(xx, yy) in skin:
                    s.set(xx, yy, band if yy < hy + 6 else band_d)
        if st == "bald":
            for xx in range(x, x + 8):
                if s.get(xx, hy + 7) in skin and x + 1 < xx < x + 6:
                    s.set(xx, hy + 7, band_d)
        if s.get(x + 5, hy + 1) in skin:
            s.set(x + 5, hy + 1, lt(spec["skin"]))   # the crown's light, off the middle
        return
    if st in ("tufts", "flattop"):
        # a stitched or tufted scalp from behind: hair at the nape, a seam down the back of the skull (one column, off
        # the middle), the tufts kept; a flattop's hair comes down the back to the ears
        low = hy + 2 if st == "flattop" else hy + 5
        for yy in range(low, hy + 7):
            for xx in range(x, x + 8):
                if s.get(xx, yy) in skin:
                    s.set(xx, yy, h if yy < hy + 6 else d)
        for yy in range(hy + 1, low):
            if s.get(x + 3, yy) in skin:
                s.set(x + 3, yy, dk(spec["skin"], 2) if dk(spec["skin"], 2) != INK else dk(spec["skin"]))
        return
    # haired: the hair's top row under the hat (a tall hat pushes it down)
    top = next((yy for yy in range(max(0, hy - 2), hy + 7) if sum(1 for xx in range(x + 1, x + 7) if s.get(xx, yy) in [h] + ok + list(feats)) >= 4), hy)
    end = hy + (9 if st == "long" else 6)
    for yy in range(top, end + 1):
        for xx in range(x - 1, x + 9):
            c = s.get(xx, yy)
            if c in feats or (c in hair_ramp and c != h and xx in range(x, x + 8)):
                s.set(xx, yy, h)   # the face, its shades and old partings are all behind the hair
    # the nape: the head's bottom row is the hair's shade (long hair falls on past it)
    if st != "long":
        for xx in range(x + 1, x + 7):
            if s.get(xx, hy + 7) in skin:
                s.set(xx, hy + 7, d)
    # the neck under the hair is in the hair's shadow (a bare strip of skin there, between a collar, read as a mouth
    # under the vampire's black hair once the boss was drawn 5x)
    _neck_shade(s, x, hy, skin | {sw.SKIN} | set(sw.SKINS), d)   # the vampire's neck is drawn in the base SKIN under his PALE face
    # shading in the hair's own ramp: the brim's shadow under a hat, the crown light to the south-east, one parting
    # slanting down from just right of the middle to the left, a strand at the right edge, the nape band
    if hat != "none":
        for xx in range(x, x + 8):
            if s.get(xx, top) == h:
                s.set(xx, top, d)
    lt_row = top + (1 if hat != "none" else 0)
    for xx in (x + 4, x + 5):
        if s.get(xx, lt_row) == h:
            s.set(xx, lt_row, li)
    if s.get(x + 6, lt_row + 1) == h:
        s.set(x + 6, lt_row + 1, li)
    part = [(x + 4, top + 2), (x + 3, top + 3), (x + 3, top + 4), (x + 2, top + 5)]
    pd = li if _bright(h) < 200 else dd
    for px_, py_ in part:
        if py_ <= hy + 5 and s.get(px_, py_) == h:
            s.set(px_, py_, pd)
    if s.get(x + 6, hy + 4) == h:
        s.set(x + 6, hy + 4, d)
    if st == "long":
        for yy in (hy + 7, hy + 8):
            for xx in (x + 2, x + 5):
                if s.get(xx, yy) == h:
                    s.set(xx, yy, d)   # long hair falls in locks past the nape
    else:
        for xx in range(x + 1, x + 7):
            if s.get(xx, hy + 6) == h:
                s.set(xx, hy + 6, d)
    if spec.get("beard") and st != "long":
        for px_ in ((x - 1, hy + 5), (x + 8, hy + 5)):
            if s.get(px_[0], px_[1]) is None:
                s.set(px_[0], px_[1], spec["beard"])   # a beard shows at the jaw from behind


def back_details(s: Sprite, spec: dict, ux: int, uy: int, hx: int, hy: int, pose: str) -> None:
    """playtest1p: the back of a person, before the outline: the hair in locks, the hood's seam, the helm's neck guard,
    shoulder blades, the spine seam, the cape's folds, a pack's straps. It only paints over the part it
    names (hair over hair, a seam over cloth), so an arm or a weapon crossing the back stays whole."""
    x0, x1, _, _ = sw.BUILD[spec["build"]]
    x0 += ux
    x1 += ux
    ay = 14 + uy
    cloth = spec["cloth"]
    ex = spec["extra"]
    x = FACE_X + hx
    hat = spec["hat"]
    st = spec["hairstyle"]
    h = spec["hair"]
    head = spec.get("head", "human")

    def on(px: int, py: int, over, color: str) -> None:
        if s.get(px, py) in over:
            s.set(px, py, color)

    if head == "human":
        back_head(s, spec, x, hy)
    if hat in ("hood", "cowl"):
        c = spec["hatc"]
        for yy in range(hy - 1, hy + 8):
            on(x + 3, yy, (c,), dk(c))   # the back seam
            if yy > hy + 1:
                on(x + 4, yy, (c,), dk(c))
        on(x + 1, hy + 1, (c,), lt(c) if lt(c) != c else c)
        on(x + 6, hy + 1, (c,), lt(c) if lt(c) != c else c)
    elif hat == "helm":
        c = spec["hatc"]
        for xx in range(x - 1, x + 9):
            on(xx, hy + 5, (None, c, dk(c), spec["skin"], dk(spec["skin"])), c)   # the neck guard
            on(xx, hy + 6, (None, c, dk(c), spec["skin"], dk(spec["skin"])), dk(c))
        for yy in range(hy - 1, hy + 5):
            on(x + 3, yy, (c, lt(c)), dk(c))   # the crest seam
        on(x + 5, hy, (c,), lt(c))
    if head == "skull":
        for p in ((x + 3, hy), (x + 4, hy + 1), (x + 3, hy + 2), (x + 4, hy + 3)):
            on(p[0], p[1], (spec["skin"], lt(spec["skin"])), dk(spec["skin"]))   # the suture
    elif head == "wolf":
        for yy in range(hy + 1, hy + 7):
            on(x + 3, yy, (spec["skin"],), dk(spec["skin"]))   # the ruff down the nape
            on(x + 4, yy, (spec["skin"],), dk(spec["skin"]))
    elif head == "ghoul":
        for yy in range(hy + 1, hy + 7, 2):
            on(x + 4, yy, (spec["skin"],), dk(spec["skin"]))   # the knuckled spine
    elif head == "pumpkin":
        on(x + 3, hy + 6, (spec["skin"],), dk(spec["skin"]))
    elif head == "goblin":
        on(x + 2, hy + 4, (spec["skin"],), dk(spec["skin"]))
        on(x + 5, hy + 4, (spec["skin"],), dk(spec["skin"]))
    # the back: shoulder blades and the spine seam
    if not spec["cape"] and spec["back"] not in ("pack",) and "ribs" not in ex and "wraps" not in ex:
        li = lt(cloth) if lt(cloth) != cloth else cloth
        on(x0 + 1, ay + 2, (cloth,), li)
        on(x1 - 1, ay + 2, (cloth,), li)
        on(x0 + 2, ay + 3, (cloth,), dk(cloth))
        on(x1 - 2, ay + 3, (cloth,), dk(cloth))
        for yy in range(ay + 2, (26 if spec["robe"] else 20 + uy)):
            if (yy - ay) % 2 == 0:
                on(7 + ux, yy, (cloth,), dk(cloth))
    if "ribs" in ex:
        for yy in range(ay, ay + 8):
            on(7 + ux, yy, ("#3a2830", dk(cloth)), cloth)   # the spine from behind
            on(8 + ux, yy, ("#3a2830", dk(cloth)), cloth)
    if spec["cape"]:
        c = spec["cape"]
        for xx in range(x0, x1 + 1):
            on(xx, ay, (c,), dk(c))   # the shoulder line
        for fx in (x0 + 1, 8 + ux, x1 - 1):
            for yy in range(ay + 3, 23):
                if (yy + fx) % 3:
                    on(fx, yy, (c,), dk(c))   # the folds
        li = lt(c) if lt(c) != c else c
        on(x0 + 1, ay + 1, (c,), li)   # the cape catches the light on the shoulders (no clasp: it fastens in front)
        on(x1 - 1, ay + 1, (c,), li)
    if spec["back"] == "pack":
        for yy in range(ay, ay + 6):
            on(x0, yy, ("#6a5040", "#4a382c", "#8a6858"), "#4a382c")
            on(x1, yy, ("#6a5040", "#4a382c", "#8a6858"), "#4a382c")
    if spec["apron"]:
        a = spec["apron"]
        for p in ((7 + ux, 21 + uy), (8 + ux, 21 + uy), (6 + ux, 22 + uy), (9 + ux, 22 + uy)):
            on(p[0], p[1], (cloth, dk(cloth), spec["pants"], dk(spec["pants"] or cloth)), a)   # the bow
