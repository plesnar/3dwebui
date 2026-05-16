# GitHub Copilot Instructions

Use AGENTS.md in the repository root as the canonical project instruction file.

## Copilot Quick Rules

- Follow architecture and constraints in AGENTS.md.
- Keep edits minimal and scoped to the user request.
- Prefer existing patterns in `src/app`, `src/widgets`, and `src/drag`.
- Preserve global focused-widget and active-window behavior.
- Exclude non-interactive helper objects from raycast-based interaction.
- Run `npm run build` to validate non-trivial code changes.

If guidance in prompts conflicts with this file, prefer direct user intent, then AGENTS.md conventions.
