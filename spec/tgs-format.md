# TGS format reference

A practical, plain-language description of the TGS format used by Telegram for
animated stickers and custom emoji. This is a working reference, not the
official Telegram specification.

## The short version

A `.tgs` file is **gzip-compressed Lottie JSON**. To read one:

```js
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const lottie = JSON.parse(gunzipSync(readFileSync('sticker.tgs')).toString('utf8'));
```

To write one, serialize a Lottie object to JSON and gzip it:

```js
import { gzipSync } from 'node:zlib';
writeFileSync('sticker.tgs', gzipSync(Buffer.from(JSON.stringify(lottie)), { level: 9 }));
```

## Telegram requirements

### Container
- File must be valid **gzip**.
- Gzipped size **under 64 KB** (stickers).

### Root object
| Field    | Requirement                          |
| -------- | ------------------------------------ |
| `tgs`    | must equal `1`                       |
| `ddd`    | `0` (no 3D)                          |
| `fr`     | `60` (frame rate)                    |
| `w`, `h` | `512` × `512`                        |
| `ip`     | `0` (in point)                       |
| `op`     | positive, **≤ 180** (≤ 3s at 60 fps) |
| `assets` | array, **no embedded/external media** (`p`, `u`, `e` fields) |
| `layers` | non-empty array                      |

### Layers
- Only **shape layers** (`ty: 4`) are allowed.
- `ddd` must be `0`.
- **No masks** (`hasMask` / `masksProperties`).
- **No effects** (`ef`).
- Must have a valid transform (`ks`) and at least one shape.

### Shapes
Allowed shape types: groups (`gr`), paths (`sh`), fills (`fl`), strokes (`st`),
gradient fills/strokes (`gf` / `gs`), trim paths (`tm`), transforms (`tr`).

- Path data (`sh.ks.k`) needs matching `v` / `i` / `o` arrays of `[x, y]`
  points, with `c` (closed) as a boolean.
- Colors are normalized `0..1` RGB(A) arrays.
- Opacity values are `0..100`.
- In a group, the transform (`tr`) should be the **last** item.

### Keyframes
- Animatable properties use `{ a: 0, k }` (static) or `{ a: 1, k: [...] }`
  (keyframed).
- **No expressions** (`x` field).
- Keyframe times (`t`) are integers, strictly increasing, within `0 .. op-1`.

## Common reasons Telegram rejects a sticker
- Gzipped file over 64 KB.
- Canvas isn't 512×512, or frame rate isn't 60.
- Animation longer than 180 frames.
- Embedded raster images (comes from SVG `<image>` or non-vector art).
- Masks, effects, or 3D layers.
- Expressions left in by an export tool.

Validate before uploading with [`tools/validate-tgs.mjs`](../tools/validate-tgs.mjs).

## Generating TGS from SVG
SVG has no timeline, so "SVG → TGS" means: parse the vector shapes, map them to
Lottie shape layers, apply motion (presets or per-layer), and gzip the result
under Telegram's constraints. A free browser implementation:
**https://svgtotgs.com**.
