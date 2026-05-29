# SVG to TGS SEO Public Files

This folder contains public SEO and LLM-readable documentation for https://svgtotgs.com/. It is safe to publish as a standalone public Git repository because it contains generated documentation and crawl files only, not the application source code.

## Contents

- `llms.txt`: short LLM index for the site
- `llms-full.txt`: full LLM context with product, workflow, page, FAQ, and policy summaries
- `llms/*.md`: Markdown versions of the main public pages
- `robots.txt`: crawler policy copied from `public/robots.txt`
- `sitemap.xml`: sitemap copied from `public/sitemap.xml`

## Canonical Site

https://svgtotgs.com/

## Generated Pages

- SVG to TGS Converter for Telegram Stickers and Custom Emoji: https://svgtotgs.com/
- SVG to TGS Converter: https://svgtotgs.com/svg-to-tgs
- Convert SVG to Telegram Sticker: https://svgtotgs.com/svg-to-telegram-sticker
- Telegram Custom Emoji Maker: https://svgtotgs.com/telegram-custom-emoji
- Telegram Animated Sticker Maker: https://svgtotgs.com/telegram-animated-sticker-maker
- Telegram Sticker Pack Maker: https://svgtotgs.com/telegram-sticker-pack-maker
- TGS Converter for Telegram Stickers: https://svgtotgs.com/tgs-converter
- Lottie to TGS for Telegram: What You Need to Know: https://svgtotgs.com/lottie-to-tgs
- Create Telegram Animated Stickers Without After Effects: https://svgtotgs.com/after-effects-alternative
- Custom Emoji and Stickers for Telegram Bots: https://svgtotgs.com/telegram-bot-custom-emoji
- Animate SVG Online for Telegram Stickers and Emoji: https://svgtotgs.com/svg-animation-online
- SVG to TGS Pro: https://svgtotgs.com/upgrade
- Privacy Policy: https://svgtotgs.com/privacy
- Terms of Service and Public Offer: https://svgtotgs.com/terms

## Update Flow

Run `npm run generate:llms` from the main project. The command updates both `public/` and this `seo-public/` folder. Run `npm run build` when you also need a fresh generated sitemap in `dist/`.

## Notes

- SVG to TGS is an independent browser-based SVG to TGS converter for Telegram animated stickers and custom emoji.
- The product focuses on SVG input and Telegram-ready TGS output.
- Direct Lottie JSON upload is not the current promised workflow.
