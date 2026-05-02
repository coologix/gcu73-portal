# Workflow: Implement

Use when a GCU73 Portal issue is in `Ready`, `In Progress`, or `Rework`.

GCU73 is a simple no-PR project. Work happens in a Local Symphony worktree, commits are local until
review, and approved changes go straight to `main` during the deploy workflow.

## Inputs

- Linear issue identifier, title, description, acceptance criteria, and current state.
- Resolved GCU73 worktree path under `~/.local-symphony/workspaces/gcu73-portal`.
- Target repository root: `/Users/michaelmadumeexinity/Documents/PAJUNO/gcu73-portal`.
- Repository instructions: `AGENTS.md`, `CLAUDE.md`, `README.md`, `.ai`, docs, package scripts,
  Supabase docs, deployment docs, and environment notes when present.
- Any user-provided credentials or deployment approval already recorded in Linear.

## Procedure

1. Read the repository instructions before editing files.
2. Confirm the issue scope and classify the change:
   - frontend-only
   - backend/API only
   - Supabase schema, migration, policy, function, storage, or seed change
   - mixed
3. Update Linear with a short implementation plan, including the classification.
4. Implement the smallest correct change in the assigned worktree.
5. Use existing repository commands for typecheck, lint, tests, build, and Supabase checks. Do not
   invent new scripts when project scripts already exist.
6. Commit the work locally on the Symphony branch when validation is complete enough for review.
7. Move the issue to `Local Review` with the required outputs.

## Outputs

- Worktree path.
- Branch name.
- Commit SHA.
- Files changed summary.
- Change classification: frontend-only, backend/API, Supabase, or mixed.
- Validation commands run and results.
- Any checks not run, with a concrete reason.
- Recommended next state:
  - `QA Preview` for frontend-visible changes that can be served locally against deployed Supabase.
  - `Ready to Deploy` when deployment approval is the next required action.
  - `Blocked` when credentials, routing, local services, or acceptance criteria are missing.

## Stop Conditions

- Required repository guidance is missing and the next action is unsafe without it.
- Supabase access is required but unavailable.
- The issue requires production data mutation without explicit permission.
- The requested action requires deploy approval but the issue is not in `Ready to Deploy`.
- Portless is required for UI verification but unavailable.

