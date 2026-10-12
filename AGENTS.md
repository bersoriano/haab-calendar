<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md - System Rules for AI Tools

## 1. Git Workflow Constraints

- You must work exclusively within your assigned task branch. Never attempt to push directly to `main` or `master`.
- Do not attempt to use `git worktree` commands; your runtime environment is already isolated.
- Before writing any code, verify your active branch using `git branch --show-current`.

## 2. Sync & Commits

- Run `git pull origin <your-branch-name>` before editing any files.
- Make small, atomic commits using the Conventional Commits specification (e.g., `feat(ui): add button`, `fix(api): fix timeout`).

## 3. Conflict Handling

- If you encounter a Git merge conflict that fails automated tests, STOP immediately.
- Do not guess or blindly overwrite code blocks. Present the conflict markers to the human.

## 4. Navigation Changes

- A navigation is separate markup per width: a row of controls on a desktop, a collapsed menu or drawer on a phone. A check made at one width says nothing about the other.
- When a change alters what a bar, menu, sidebar or drawer shows, record it in `e2e/nav-widths.spec.ts`: add or edit the case for that surface and account state. Every case there runs at phone and desktop widths.
- Assert what is on screen, not only what is gone. An empty bar passes every "is not shown" check.
