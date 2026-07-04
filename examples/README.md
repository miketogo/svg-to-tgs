# Example: SVG → Lottie → TGS

A minimal but **real, Telegram-compliant** animated sticker: a blue square that
rotates once over 3 seconds.

| File                | What it is                                             |
| ------------------- | ------------------------------------------------------ |
| `square.svg`        | Source vector artwork (static)                         |
| `square.lottie.json`| Human-readable Lottie animation                        |
| `square.tgs`        | Gzipped, ready-to-upload Telegram sticker (327 bytes)  |

## Try it

Validate the file against Telegram's rules:

```bash
node ../tools/validate-tgs.mjs square.tgs
```

Then send `square.tgs` to [@Stickers](https://t.me/Stickers) in Telegram to add
it to a pack, or convert your own SVG at **https://svgtotgs.com**.

## How `square.tgs` was made

The Lottie in `square.lottie.json` is serialized to JSON and gzipped:

```js
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

const lottie = JSON.parse(readFileSync('square.lottie.json', 'utf8'));
writeFileSync('square.tgs', gzipSync(Buffer.from(JSON.stringify(lottie)), { level: 9 }));
```

Note the Telegram-required root fields: `tgs: 1`, `fr: 60`, `w/h: 512`, `ip: 0`,
`op: 180`, a single shape layer, and a keyframed rotation from 0° to 360°.
