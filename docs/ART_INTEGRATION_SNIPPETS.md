# Public Art Integration Snippets

The public version uses generated placeholders from `src/data/artAssets.ts`.

```ts
import { ART_ASSETS, getBattleBackground, getFactionPortrait } from "../data/artAssets";

const lordBackground = ART_ASSETS.backgrounds.lordSelect;
const mapBackground = ART_ASSETS.backgrounds.mapClean;
const portrait = getFactionPortrait(faction.id);
const battleBackground = getBattleBackground({ terrain: defenderCity.terrain });
```

These values are safe data URLs and do not depend on external files.

If future contributors add real assets, they must:

- Place only clearly licensed assets in `public/assets/`.
- Document the source and license.
- Avoid copyright-unclear game, film, animation, music, font, or UI materials.
- Keep the app buildable without external CDN or private services.
