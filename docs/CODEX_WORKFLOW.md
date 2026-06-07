# Codex Workflow

Open Sanguo Strategy is intended to be a practical learning repository for AI-assisted open-source game development.

## Issue Triage

Codex can help summarize bug reports, identify missing reproduction steps, group related issues, and draft maintainer responses. It should not invent user impact, fake priority, or close issues without maintainer review.

## PR Review

Codex can review pull requests for TypeScript errors, gameplay regressions, save compatibility risks, UI breakage, and missing documentation. Reviews should focus on concrete file and line references when possible.

## Release Note Generation

Codex can summarize merged changes into changelog entries, highlight known limitations, and keep public release notes honest. It must not fabricate stars, downloads, users, contributors, or ecosystem impact.

## Test Generation

Codex can propose and generate tests for pure systems such as command budgets, turn progression, battle calculations, AI decisions, and save migration. Maintainers should run and inspect generated tests before merging.

## Documentation Maintenance

Codex can update README, roadmap, system logic, handoff notes, and contributor guides after gameplay or architecture changes.

## Refactoring Assistance

Codex can suggest focused refactors for repeated logic, type safety, or component complexity. Large rewrites should be split into small reviewed PRs.

## Safety Rules

- Do not include secrets, tokens, private registry credentials, private paths, company data, customer data, or personal data.
- Do not add copyright-unclear media assets.
- Do not introduce backend services, databases, accounts, or external API dependencies without explicit maintainer approval.
- Prefer stable, buildable changes over broad unfinished prototypes.
