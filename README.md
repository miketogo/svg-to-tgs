# SVG to TGS

Convert **SVG** artwork into **TGS** — the animated sticker and custom emoji
format used by Telegram. This repo is a small, practical reference for the TGS
format: a plain-language spec, a working example you can send to Telegram, and a
dependency-free validator that checks whether a `.tgs` file will be accepted.

👉 **Free browser converter (SVG → TGS, no After Effects): https://svgtotgs.com**

## Demo

![SVG to TGS — SVG in, Telegram-ready TGS out](docs/demo.gif)

*Pick a motion preset, preview it in a Telegram-style frame, and export a `.tgs`
under 4 KB. ([watch the full video](https://youtu.be/qC1yKnyPU_o))*

---

## What is TGS?

A `.tgs` file is **gzip-compressed [Lottie](https://airbnb.io/lottie/) JSON**
with Telegram-specific constraints. It is *not* a video and *not* a raster
image — it's vector animation data. Telegram uses it for animated stickers and
custom emoji.

For an animated **sticker** to be accepted by `@Stickers`, the `.tgs` must be:

| Constraint  | Value                         |
| ----------- | ----------------------------- |
| Canvas      | 512 × 512 px                  |
| File size   | under 64 KB (gzipped)         |
| Duration    | up to 3 seconds               |
| Frame rate  | 60 FPS (so `op` ≤ 180 frames) |
| Content     | vector only, no embedded media |

Custom emoji use the same format at a smaller display size.

Full details: [`spec/tgs-format.md`](spec/tgs-format.md).

### TGS is not TGA

These get confused constantly. **TGS** = Telegram animation (Lottie-based).
**TGA** (Truevision Targa) = an unrelated *static raster image* format. If you
want an animated Telegram sticker or emoji, you want **TGS**.

---

## Turn an SVG into a TGS

The fast path — no After Effects, no Lottie tooling:

1. Export a clean vector **SVG** (Figma / Illustrator / Inkscape). Convert text
   to outlines and avoid embedded raster images.
2. Open **[svgtotgs.com](https://svgtotgs.com)**, upload the SVG, pick a motion
   preset, and preview it in a Telegram-style frame.
3. Export the `.tgs`. Telegram's limits are enforced automatically.
4. Send it to `@Stickers` (sticker pack) or use the custom-emoji flow.

Conversion runs fully client-side (WebAssembly) — files never leave your browser.

---

## Validate a .tgs file

A zero-dependency Node script (built-ins only) that checks a `.tgs` against
Telegram's rules and reports errors and warnings:

```bash
node tools/validate-tgs.mjs examples/square.tgs
```

```
examples/square.tgs
  WARN: gzip=0.3 KB, json=0.7 KB, layers=1, assets=0
```

Errors mean Telegram will likely reject the file (wrong size, embedded media,
masks/effects, out-of-range frames, etc.). Point it at your own exports:

```bash
node tools/validate-tgs.mjs my-sticker.tgs another.tgs
```

---

## Example

[`examples/`](examples/) contains a minimal but real, Telegram-compliant sticker:

- `square.svg` — the source vector artwork
- `square.lottie.json` — the readable Lottie animation (a rotating square)
- `square.tgs` — the gzipped, ready-to-upload result (327 bytes)

You can send `square.tgs` to `@Stickers` to see the whole loop end to end.

---

## Repo contents

```
spec/tgs-format.md    Plain-language TGS/Telegram format reference
tools/validate-tgs.mjs  Dependency-free .tgs validator
examples/             Sample SVG → Lottie → TGS
llms.txt, llms-full.txt, llms/  Machine-readable project summaries
robots.txt, sitemap.xml         Crawl files for the site
```

## Related guides

- [Convert SVG to Telegram sticker](https://svgtotgs.com/svg-to-telegram-sticker)
- [Telegram custom emoji maker](https://svgtotgs.com/telegram-custom-emoji)
- [Telegram animated sticker maker](https://svgtotgs.com/telegram-animated-sticker-maker)
- [TGS converter](https://svgtotgs.com/tgs-converter)
- [Lottie → TGS explained](https://svgtotgs.com/lottie-to-tgs)
- [Make stickers without After Effects](https://svgtotgs.com/after-effects-alternative)
- Telegram bot: [@svgto_tgs_bot](https://t.me/svgto_tgs_bot)

## License

[MIT](LICENSE)
