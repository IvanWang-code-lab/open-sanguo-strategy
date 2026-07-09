# Development Guide

This document explains how to set up and work on Open Sanguo Strategy locally.

Open Sanguo Strategy is currently in early open-source preparation. The goal of this guide is to make the project easier to run, inspect, and improve.

## Requirements

Recommended environment:

* Node.js
* npm
* Git
* A modern browser
* A code editor such as VS Code

## Install Dependencies

After cloning the repository, install dependencies:

```bash
npm install
```

## Start the Development Server

Run the local development server:

```bash
npm run dev
```

If a Windows start script is available, Windows users may also run:

```bash
start.bat
```

## Build the Project

To build the project:

```bash
npm run build
```

## Recommended Development Workflow

1. Review the related issue or documentation first.
2. Keep changes small and focused.
3. Avoid unnecessary dependencies.
4. Update documentation when behavior changes.
5. Run available checks before committing.
6. Use clear commit messages.

## Suggested Commit Message Style

Examples:

```text
Improve development setup documentation
Add architecture overview documentation
Refine prototype planning notes
Update project roadmap
```

## Working With Issues

Issues should be used to track project planning, bugs, and development tasks.

Good issues should include:

* Clear title
* Short summary
* Planned scope
* Out-of-scope items when needed
* Acceptance criteria when possible

## Codex-assisted Development

Codex may be used to support:

* Code review
* Refactoring
* Documentation updates
* Test planning
* Release note preparation
* Issue triage

All Codex-assisted changes should still be reviewed by the maintainer before being committed.

## Current Development Focus

The current focus is to prepare a minimal playable browser prototype.

Near-term tasks include:

* Improve local setup documentation
* Document source module responsibilities
* Separate game data from UI components
* Define a small sample scenario
* Add basic turn progression
* Improve project structure for contributors

## Notes

This project is not yet a complete game. It is being prepared as an open-source browser strategy game framework that can be improved step by step.
