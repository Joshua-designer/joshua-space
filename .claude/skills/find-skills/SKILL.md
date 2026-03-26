---
name: find-skills
description: Project bridge for the globally installed `find-skills` capability. Use when a team agent needs to discover missing skills before extending scope.
---

# Find Skills Bridge

## Purpose

- Expose the installed `find-skills` capability inside the project-local `.claude/skills/` hierarchy
- Keep agent prompts aligned with the new project harness

## Source

- Global install: `/Users/joshuaju/.codex/skills/find-skills/`

## Use

- Use when the current task may require a missing skill or specialized workflow
- Prefer this before inventing new role behavior

## Notes

- This bridge does not replace the global install
- Keep the original install intact and treat this folder as the project-local entry point
