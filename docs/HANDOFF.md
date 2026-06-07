# Public Handoff

## Project

Open Sanguo Strategy is a public alpha of a local single-player Three Kingdoms strategy sandbox.

## Startup

```bash
npm install
npm run dev
```

Windows users can also double-click `start.bat`.

## Build

```bash
npm run build
```

## Directory Notes

- `src/components/`: React UI components.
- `src/data/`: cities, factions, generals, skills, art placeholders, and character profile data.
- `src/systems/`: turn, command, city, battle, AI, save, scenario, and extension systems.
- `docs/`: public documentation, roadmap, workflow, and handoff notes.
- `public/`: reserved for future clearly licensed static assets.

## Public Asset Policy

The public alpha does not include private or copyright-unclear images, portraits, music, fonts, videos, or sound effects. Current visuals use generated SVG data-URI placeholders in `src/data/artAssets.ts`.

## Packaging for GitHub

Include:

- `package.json`
- `package-lock.json`
- `.npmrc`
- `.gitignore`
- `start.bat`
- `index.html`
- `src/`
- `docs/`
- `.github/`
- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `vite.config.ts`
- `tsconfig*.json`

Do not include:

- `node_modules/`
- `dist/`
- `build/`
- `coverage/`
- `.env`
- logs
- archives
- backup folders
- copyright-unclear assets
- private or sensitive information

## Common Troubleshooting

- Dependency install fails: check Node.js, network connectivity, and npm registry configuration.
- Dev server does not start: run `npm install`, then `npm run dev`.
- Blank page after old saves: clear localStorage for this app and start a new game.
