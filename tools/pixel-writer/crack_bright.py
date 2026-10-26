"""MB sprint Oct 26 (b), spec #2: cracked brick one shade brighter so a secret wall reads at Phone zoom.

The chip (the lit lip beside the crack line) moves from the cave's wall light to the next brighter colour of the
locked palette nearest that light's hue, and runs beside every line pixel instead of every third. Palette-locked."""
import make_gravewake  # noqa: F401  puts the locked palette on the path
from palette_locked import LOCKED


def _rgb(h: str):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def brighter(hex_: str) -> str:
    """The locked colour closest to hex_ that is lighter by one step (luma +12..+60), nearest in RGB."""
    r, g, b = _rgb(hex_)
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    best, bd = hex_, 1e9
    for c in sorted(LOCKED):
        cr, cg, cb = _rgb(c)
        cl = 0.299 * cr + 0.587 * cg + 0.114 * cb
        if not (12 <= cl - luma <= 60):
            continue
        d = (cr - r) ** 2 + (cg - g) ** 2 + (cb - b) ** 2
        if d < bd:
            best, bd = c, d
    return best


def write() -> list:
    """Repaint cells 0-1 (the two cracks) of every feat-<cave>.png; the rest of each sheet is left byte for byte.
    Run after make_gravewake.feat_sheets(): python3 -c "import crack_bright as c; c.write()"."""
    from PIL import Image
    import make_gravewake as m
    from pixel_writer import crack
    made = []
    for name, (_wall, hi) in m.WALLS.items():
        path = m.OUT / f"feat-{name}.png"
        im = Image.open(path).convert("RGBA")
        for kind in (0, 1):
            cell = crack(kind, m.LINE, brighter(hi), 1).image()
            im.paste((0, 0, 0, 0), (kind * 16, 0, kind * 16 + 16, 16))
            im.paste(cell, (kind * 16, 0))
        im.save(path)
        made.append(im)
    return made
