# Public Art Asset Policy

The public alpha version intentionally does not include the private or copyright-unclear image pack from the original local project.

## Current Public Implementation

- `src/data/artAssets.ts` generates lightweight SVG data-URI placeholders in code.
- No external CDN, online image, online font, music, sound effect, or video is required.
- `public/` is kept for future clearly licensed assets, but the current public version does not require image files to run.

## Why This Matters

The repository is intended for public GitHub upload. To keep the project safe for open-source collaboration, do not commit media assets unless their license and authorship are clear.

## Allowed Future Assets

- Original assets created by contributors and explicitly contributed under a compatible license.
- Public-domain or permissively licensed assets with attribution requirements documented.
- Simple generated placeholders created in code or SVG files.

## Not Allowed

- Commercial game portraits, backgrounds, UI sheets, music, fonts, sound effects, or videos.
- AI-generated or edited media that imitates a specific copyrighted game, film, animation, or official artwork.
- Assets copied from unknown websites or private art packs.

## Packaging Note

Do not include `node_modules`, `dist`, archives, logs, temporary files, or copyright-unclear media in a public release package.
