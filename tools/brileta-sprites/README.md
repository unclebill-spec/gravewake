# brileta-sprites

Earmarked for Gravewake and for later games.

This is the MIT tree and boulder generator by Mark Ayzenshtat
(https://github.com/mayz/brileta-sprites). It draws a tree or a rock from a seed.
The copy here is the tool. Do not edit the generator to match one game.
Pass a seed, then snap the picture onto that game's colors.

## Use it again

```bash
npx tsc -p tools/brileta-sprites
node tools/brileta-sprites/make_gravewake.mjs
```

The second command writes Gravewake's strips to `public/art/brileta`.
Another game should import `generateTree` and `generateBoulder` from `dist/`
and keep its own color list.

```js
import { generateTree, TreeArchetype } from "./dist/trees.js";
import { generateBoulder } from "./dist/boulders.js";

const tree = generateTree(3, 20, TreeArchetype.DECIDUOUS);
const rock = generateBoulder(1, 16);
```

`tree.canvas` is a small RGBA buffer. The edges are soft. Before it goes
into a 16px game, snap alpha to on or off and map each pixel to a short palette.
That step is in `make_gravewake.mjs`.
