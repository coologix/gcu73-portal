# Workflow: QA Preview

Use when a GCU73 issue is moved to `QA Preview`.

This workflow is for local QA evidence only. It does not deploy. It should serve the UI through
Portless when the change is browser-facing, point the app at deployed Supabase, capture screenshots
when useful, and summarize the result in simple bullets.

## Inputs

- Linear issue, acceptance criteria, branch, commit SHA, and worktree path.
- Repository instructions for local development and environment variables.
- Existing project commands for running the frontend/backend locally.
- Deployed Supabase configuration already used by the project.
- Portless availability and `local-symphony` proxy status.

## Procedure

1. Read the implementation evidence and classify the change again:
   - frontend-only
   - backend/API only
   - Supabase deployment required
   - mixed
2. If the change requires a Supabase migration, function deploy, policy change, storage change, or
   production data mutation, do not deploy it here. Summarize what is required and move or recommend
   `Ready to Deploy`.
3. If the change is frontend-visible and can safely run against deployed Supabase:
   - verify `portless` is installed
   - ensure `portless proxy start --https` is running
   - use `portless run <existing dev command>` or the repository's documented equivalent
   - provide the Portless URL in Linear
4. Exercise the changed path in a browser when feasible.
5. Capture screenshots for UI changes and reference where they are stored or attached.
6. Summarize QA in short bullets.
7. Move or recommend `QA Review` when QA evidence is ready for human review.

## Outputs

- Portless URL for browser-facing QA, when a local UI was served.
- Screenshot paths or attachments for UI changes, when captured.
- Simple QA bullet summary:
  - what was checked
  - what passed
  - what was not checked
  - any risk or follow-up
- Deployment impact:
  - no deploy required yet
  - frontend deploy required
  - backend deploy required
  - Supabase deploy required
  - mixed deploy required
- Recommended next state: `QA Review`, `Ready to Deploy`, `Rework`, or `Blocked`.

## Stop Conditions

- Portless is unavailable for a browser-facing QA task.
- Required environment variables are missing.
- Deployed Supabase cannot be used safely.
- The next step would mutate deployed Supabase or deploy application code without explicit approval.

