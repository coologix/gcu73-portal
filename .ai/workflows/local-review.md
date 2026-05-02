# Workflow: Local Review

Use when GCU73 work is ready for human review before QA preview or deploy approval.

This is a handoff state. Do not continue implementation unless the issue moves to `Rework`,
`QA Preview`, or `Ready to Deploy`.

## Inputs

- Linear issue and latest workpad/progress comment.
- Worktree path, branch, commit SHA, and validation evidence from implementation.
- Any screenshots, logs, or notes already attached to Linear.

## Procedure

1. Confirm that the implementation outputs are present in Linear.
2. Confirm whether the change appears to be frontend-only, backend/API, Supabase, or mixed.
3. Confirm that the next recommended board state is clear.
4. If evidence is incomplete, move the issue to `Blocked` with the missing item.
5. Otherwise stop and wait for human board action.

## Outputs

- Review handoff summary in Linear:
  - branch and commit
  - what changed
  - validation result
  - deployment impact
  - recommended next state

## Stop Conditions

- Do not run QA preview from this state.
- Do not deploy from this state.
- Do not merge to `main` from this state.

