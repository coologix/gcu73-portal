# Workflow: Blocked

Use when a GCU73 issue cannot continue safely.

## Inputs

- Current Linear issue state and latest agent notes.
- The failed command, missing credential, missing environment variable, unavailable service, or
  unclear instruction.
- Worktree path and branch, if one exists.

## Procedure

1. Stop implementation, QA, or deployment work.
2. Before blocking on missing env, check the base repo
   `/Users/michaelmadumeexinity/Documents/PAJUNO/gcu73-portal` for `.env`, `.env.local`, and
   documented env files. Worktrees do not include untracked env files.
3. Record the blocker in Linear using concrete language.
4. Include exactly what is needed from the user or environment.
5. If setup work is needed, create or recommend a separate Backlog issue for that setup.
6. Do not retry until the issue is moved out of `Blocked`.

## Outputs

- Blocker summary.
- Required human action.
- Affected command, service, or credential.
- Whether the base repo env was checked.
- Current worktree and branch.
- Suggested next state after unblock.
