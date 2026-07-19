# Changelog

## v0.3.0 - SG V19.2.0 public prototype

This release publishes the latest SG V19.2.0 source updates as a playable open-source browser strategy prototype.

### Added

- Added the latest SG V19.2.0 source structure
- Added post-battle settlement flow
- Added army and officer transfer systems
- Added updated command, city, battle, AI, save, and turn systems
- Added simulation and regression support scripts
- Added GitHub Pages deployment workflow
- Added a public live demo link to the README
- Added GitHub Actions CI build verification
- Added CodeQL security scanning
- Enabled Dependabot vulnerability monitoring

### Improved

- Improved core game-state consistency
- Improved battle result and city ownership updates
- Improved officer position and army-state handling
- Improved save and reload foundations
- Improved public repository maintenance and deployment workflow
- Improved TypeScript build reliability

### Validation

- Local production build passes
- GitHub Actions CI passes
- CodeQL analysis passes
- Dependabot currently reports no open alerts
- GitHub Pages deployment completes successfully
- Public live demo is available

### Live demo

https://ivanwang-code-lab.github.io/open-sanguo-strategy/

### Current status

The project is actively maintained and remains under development. Additional gameplay validation, balancing, edge-case testing, and interface improvements will continue in later releases.

## v0.1.1 - Prototype core maintenance update

This release continues the early open-source preparation of Open Sanguo Strategy by adding more prototype-oriented core logic.

### Added

* Added sample scenario data for a minimal Three Kingdoms prototype
* Added TypeScript scenario type definitions
* Added basic turn progression helpers
* Added prototype game state helpers
* Added scenario validation helpers
* Added prototype bootstrap helpers
* Added example helpers for prototype bootstrap flow
* Added example helpers for scenario validation reporting

### Improved

* Improved the project foundation for a minimal playable browser prototype
* Improved separation between scenario data, type definitions, validation, and prototype state logic
* Improved maintainability for future gameplay and UI integration work

### Current status

The project is still in early development. The current focus is to connect the prototype core logic to a simple browser interface.

### Next steps

* Connect sample scenario data to the browser UI
* Display current turn and active faction
* Show basic city ownership information
* Add a simple end-turn action
* Continue improving validation and source structure

## v0.1.0 - Initial open-source preparation

Initial public source release with documentation, roadmap, contribution guidelines, security policy, Codex workflow, issue planning, and browser game source structure.



# Changelog

## v0.1.0-alpha

Initial public alpha release.

### Core Features

- React + Vite + TypeScript single-player strategy sandbox.
- Local `localStorage` save flow.
- Lord selection, city map, city panel, turn progression, AI actions, and battle flow.
- Political orders and military orders for turn-based pacing.
- Army formation and tactical battle decision systems.
- Public-safe generated placeholder art instead of copyright-unclear images.
- Open-source documentation, roadmap, contribution guide, security policy, issue templates, and PR template.

### Known Limitations

- This is an alpha learning project and not a finished commercial game.
- Balance, AI decision quality, battle pacing, and UI polish still need iteration.
- Public version intentionally excludes private or copyright-unclear media assets.
