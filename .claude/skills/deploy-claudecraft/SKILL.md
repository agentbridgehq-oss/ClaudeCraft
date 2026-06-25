---
description: Commits, pushes, and deploys claudecraft-standalone to Railway, then polls until the deploy succeeds or fails. Use when the user asks to deploy, ship, or push ClaudeCraft changes live.
disable-model-invocation: true
arguments: [message]
---

Deploy the current changes in this repo to production.

## Current changes
!`git status --short`

## Steps

1. If there are uncommitted changes, stage and commit them with a message describing what changed (use "$message" as a starting point if provided, otherwise infer a concise message from the diff). Never use `git add -A` blindly if there are untracked files that look like secrets or unrelated cruft — check `git status` first.
2. `git push origin main`
3. `railway up --detach --service claudecraft -m "<same commit message>"`
4. Poll deploy status until it resolves:
   ```
   railway deployment list --json --service claudecraft
   ```
   Check the `status` field of the first entry. Keep polling every ~6 seconds (up to ~20 times) until it's `SUCCESS` or `FAILED` — don't just report "deployed" after the `railway up` command returns, that only means the upload started.
5. If `FAILED`, fetch the build logs and diagnose before reporting back.
6. Once `SUCCESS`, curl `https://www.claudecraft.ca/` and confirm a 200 — don't trust the deploy status alone, verify the actual served content.
7. Report the live URL: `https://claudecraft.ca`
