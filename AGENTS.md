# Repository Guidelines

Project-specific rules for agents working in this repository.

## General Guidelines

- Never use the em dash "—". Use plain dash "-" instead.
- When writing commit messages, NEVER auto-add your agent name as co-author.
- Never manually modify CHANGELOG.md files or any files that are marked as auto-generated.
- When writing or substantially editing long Markdown files, put each full sentence on its own line. Preserve normal Markdown structure, but avoid wrapping multiple sentences onto one physical line.
- When making technical decisions, do not give much weight to development cost. Instead, prefer quality, simplicity, robustness, scalability, and long term maintainability.
- When doing bug fixes, always start with reproducing the bug in an E2E setting as closely aligned with how an end user would typically use the application. This makes sure you find the real problem so your fix will actually solve it.
- When end-to-end testing a product, be picky about the UI you see and be obsessed with pixel perfection. If something clearly looks off, even if it is not directly related to what you are doing, try to get it fixed along the way
- Apply that same high standard to engineering excellence: lint, test failures, and test flakiness. If you see one, even if it is not caused by what you are working on right now, still get it fixed.

## Agentic Plans

- Every agentic plan produced while working on this project MUST be saved as a Markdown file in `/docs/plans/`.
- Plans must be written to `/docs/plans/` before implementation begins, so the user can review them.
- Name plan files `YYYY-MM-DD-<short-slug>.md` (e.g., `2026-10-14-rag-pipeline-redesign.md`).
- Append a suffix like `-v2` when iterating on a plan rather than overwriting the original, so planning history is preserved.
- Keep the plan file updated as work progresses: mark steps done and reflect any scope changes, so the file remains an accurate record.
- See `/docs/plans/README.md` for the expected contents of a plan file.

## README Maintenance

- After executing each plan, update the project-level `README.md`.
- The README should give a high-level overview of what the project is able to do and the general file structure, so future sessions are aware of how things are structured.

## Pull Requests

- After executing each plan, create a pull request containing all of the relevant changes.
- Use short, imperative commit subjects that explain the change (for example, `Add price history loader`). Pull requests should summarize the change and rationale, link related issues when available, and include test or manual verification steps. Include screenshots only when a change adds a visual interface.

## Security & Configuration

Keep credentials and local configuration out of version control. The `.gitignore` already excludes common nodejs and `.env` files; provide a safe example configuration with placeholder values if the application later needs environment variables.

# Repository Guidelines

## 1. Engineering rules

1. No comments in code. Docstrings only on external, well-named functions. Every file opens with a docstring: one sentence on what it is and one on why it is the minimum.
1. Never use em dashes. Use single hyphens when punctuation needs a dash. Keep sentences plain English, short, and to the point.
1. Delete stale code and docs when replacing a flow.
1. Keep one source of truth per feature. Update or remove conflicting docs in the same change.
1. Keep README focused on what runs now. Cut features and their upgrade path go in docs/notes.md.
1. For changes, report only changed files, verification run, and known limitation.
1. Avoid filler terms such as “robust,” “seamless,” “comprehensive,” “leverages,” and “future-proof.”
1. Every new file needs a named owner and a reason it cannot fit an existing file.
1. Prefer concrete acceptance criteria over vague product language.
1. Always pull with rebase before pushing. Use autostash when the worktree has other agents' changes, then resolve any restore conflicts without changing their work.
1. Keep documents in `./docs`, unix format, no tables. Prose summaries of each external part; document gotchas and tried-and-rejected approaches so others can learn.
1. Never over-engineer. KISS - ponytail rules (adapted from github.com/dietrichgebert/ponytail). Lazy senior dev: the best code is the code never written. Before writing code, stop at the first rung that holds: does this need to exist at all (speculative need = skip it, say so in one line); already in this codebase (reuse the helper or pattern - look before you write); stdlib does it; native platform feature covers it (`input[type=date]` over a picker lib, css over js, db constraint over app code); installed dependency solves it (never add a new one for what a few lines can do); one line; only then the minimum code that works. The ladder runs after you understand the problem, not instead of it - read the code the change touches and trace the real flow first. Bug fix = root cause, not symptom: grep every caller of the function you touch; one guard in the shared function beats a guard per caller. No unrequested abstractions (no interface with one impl, no factory for one product, no config for a constant). No boilerplate or scaffolding for later. Deletion over addition. Boring over clever. Fewest files possible. Two same-size options: take the one correct on edge cases. A deliberate simplification with a known ceiling (global lock, O(n²) scan, naive heuristic) gets named in the commit message or docs with its upgrade path - rule 1 still bans the comment. Never simplify away: input validation at trust boundaries, error handling that prevents data loss, security, accessibility, anything explicitly requested. User insists on the full version: build it.
1. Tests: smoke-level only. Root `npm test` proves the service path; frontend tests cover the api boundary. Do not rebuild unit suites.


## Testing Guidelines

- No test suite or coverage requirement exists yet. Add tests alongside new behavior under `tests/`, with descriptive names that state the behavior being checked (for example, `test_loads_price_history`). Introduce a test framework and document its invocation when the first tests are added; run relevant tests before submitting changes.
- Tests should be smoke-level only. Root `npm test` proves the service path; frontend tests cover the api boundary