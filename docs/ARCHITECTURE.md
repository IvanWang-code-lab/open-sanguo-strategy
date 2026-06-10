# Architecture Overview

This document describes the current architecture direction for Open Sanguo Strategy.

Open Sanguo Strategy is designed as a browser-based strategy game framework inspired by Three Kingdoms history and classic turn-based strategy games. The project is currently in early open-source preparation, with a focus on clarity, maintainability, and future extensibility.

## High-level Architecture

The project is organized around a lightweight browser frontend architecture.

Current major areas include:

* User interface and game screens
* Strategic map presentation
* Game state and turn progression
* Faction, city, officer, and army data structures
* Documentation and contribution workflow
* GitHub project maintenance files

The goal is to keep the project easy to understand for contributors while leaving enough room for future gameplay systems.

## Repository Structure

```text
.github/            GitHub templates and project workflow files
docs/               Project documentation and design notes
src/                Main TypeScript and React source code
public/             Static assets used by the browser app
package.json        Project scripts and dependency definitions
vite.config.ts      Vite build configuration
tsconfig.json       TypeScript configuration
```

## Frontend Layer

The frontend layer is expected to handle:

* Main game layout
* Map view
* Command panels
* City and faction information
* Officer and army display
* Turn-based interaction flow

The frontend should remain modular so that gameplay systems can be improved without rewriting the entire interface.

## Game State Layer

The game state layer should eventually manage:

* Current turn
* Active faction
* City ownership
* Officer data
* Army location and status
* Resource and command state
* Scenario data

This layer should be designed for readability first. Complex optimization can be added later only when needed.

## Data and Scenario Layer

The project should support mod-friendly data structures over time.

Future scenario data may include:

* Factions
* Cities
* Officers
* Armies
* Events
* Map regions
* Starting conditions

A long-term goal is to make scenario data easier to edit without changing core source code.

## AI and Simulation Layer

Future AI systems may include:

* Basic faction decision-making
* City defense and expansion logic
* Army movement decisions
* Battle evaluation
* Event response behavior

AI behavior should be added gradually and kept explainable.

## Documentation Layer

Documentation is part of the project architecture.

Current and planned documentation includes:

* README
* Roadmap
* Contribution guidelines
* Security policy
* Codex workflow
* Architecture overview
* Development setup guide
* Release checklist

## Maintenance Principles

The project should follow these maintenance principles:

* Keep changes focused and reviewable
* Prefer clear TypeScript and readable React components
* Avoid unnecessary dependencies
* Keep documentation aligned with the actual codebase
* Use issues and releases to track project progress
* Use Codex-assisted maintenance for review, refactoring, documentation, and test planning

## Next Architecture Goals

The next architecture improvements are:

* Add a clearer development setup guide
* Document the main source modules
* Prepare a minimal playable browser prototype
* Separate game data from UI components
* Add basic testing structure
* Improve release and issue workflow
