# Workflow: Rework

Use when review or QA feedback requires changes on a GCU73 issue.

## Inputs

- Linear feedback from `Local Review`, `QA Review`, or user comments.
- Existing worktree, branch, and latest commit.
- Screenshots, logs, or QA notes attached to the issue.

## Procedure

1. Read all feedback and turn it into a short checklist in Linear.
2. Implement only the feedback items unless a small supporting fix is required.
3. Re-run the relevant repository validation.
4. Re-run Portless QA only when the feedback affects browser-visible behavior and Portless is
   available.
5. Commit the rework locally.
6. Return the issue to `Local Review` or recommend `QA Preview`, depending on the feedback type.

## Outputs

- Feedback checklist with completion status.
- New commit SHA.
- Validation results.
- Updated screenshots or Portless URL when UI behavior changed.
- Recommended next state.

## Stop Conditions

- Feedback is ambiguous.
- Required credentials, services, or environment variables are missing.
- The requested fix requires deploy approval but the issue is not in `Ready to Deploy`.

