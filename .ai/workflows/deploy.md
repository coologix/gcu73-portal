# Workflow: Deploy

Use only when a GCU73 issue is moved to `Ready to Deploy`.

This is the single explicit deployment gate for GCU73. There is no PR review, release branch, or
separate QA deployment flow. Deploy only what the change requires, then verify and report evidence.

## Inputs

- Linear issue and explicit `Ready to Deploy` state.
- Approved branch, commit SHA, and worktree path.
- Implementation and QA evidence.
- Repository deployment instructions and existing deploy scripts.
- Access to required providers: frontend host, backend host, and Supabase when applicable.
- Base repository env files from `/Users/michaelmadumeexinity/Documents/PAJUNO/gcu73-portal` when
  deployment commands need local env.

## Environment Handling

- Use the base repo env files for deployment commands when the worktree does not have untracked env
  files.
- If a deploy command requires an env file in the worktree, copy the necessary base repo env file as
  an untracked file and never commit it.
- Do not print or paste secret values into Linear, screenshots, logs, or summaries.

## Procedure

1. Confirm the issue is in `Ready to Deploy`.
2. Confirm the deploy scope:
   - frontend only
   - backend only
   - Supabase only
   - frontend plus backend
   - frontend/backend plus Supabase
3. Confirm the branch is ready to land to `main` and contains only intentional commits for the
   issue.
4. If Supabase schema, migration, function, policy, storage, or data changes are required, summarize
   the exact deployment action before running it. If approval is unclear, move to `Blocked`.
5. Follow the repository's existing deployment process exactly.
6. After deployment, verify the live result.
7. For UI changes, capture post-deploy screenshots.
8. Record deploy evidence in Linear and move to `Done` only after validation succeeds.

## Outputs

- Deploy scope.
- Commands or provider jobs run.
- Commit SHA deployed.
- Supabase actions taken, if any.
- Live URL or environment verified.
- Screenshot paths or attachments for UI changes.
- Final validation summary in simple bullets.
- Rollback note when the repository documents one.

## Stop Conditions

- The issue is not in `Ready to Deploy`.
- Deployment credentials are unavailable.
- Supabase deployment impact is unclear.
- The repository has no documented safe deployment path for the required target.
- Validation fails after deployment. Move to `Blocked` or `Rework` with details.
