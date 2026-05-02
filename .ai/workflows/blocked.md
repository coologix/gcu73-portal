# Workflow: Blocked

Use when a GCU73 issue cannot continue safely.

## Inputs

- Current Linear issue state and latest agent notes.
- The failed command, missing credential, missing environment variable, unavailable service, or
  unclear instruction.
- Worktree path and branch, if one exists.

## Procedure

1. Stop implementation, QA, or deployment work.
2. Record the blocker in Linear using concrete language.
3. Include exactly what is needed from the user or environment.
4. If setup work is needed, create or recommend a separate Backlog issue for that setup.
5. Do not retry until the issue is moved out of `Blocked`.

## Outputs

- Blocker summary.
- Required human action.
- Affected command, service, or credential.
- Current worktree and branch.
- Suggested next state after unblock.

