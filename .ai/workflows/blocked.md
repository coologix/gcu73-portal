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
3. Before blocking on Portless, verify whether the proxy is already running. Do not start, stop, or
   restart `portless proxy` from inside the Codex app-server task; ask the operator to run
   `portless proxy start --https` outside the sandbox when needed.
4. Record the blocker in Linear using concrete language.
5. Include exactly what is needed from the user or environment.
6. If setup work is needed, create or recommend a separate Backlog issue for that setup.
7. Do not retry until the issue is moved out of `Blocked`.

## Outputs

- Blocker summary.
- Required human action.
- Affected command, service, or credential.
- Whether the base repo env was checked.
- Whether Portless proxy status was checked, for browser-facing tasks.
- Current worktree and branch.
- Suggested next state after unblock.
