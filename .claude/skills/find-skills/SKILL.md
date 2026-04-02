---
name: find-skills
description: Project bridge for the globally installed `find-skills` capability. Use when a team agent needs to discover missing skills before extending scope.
---

# Find Skills Bridge

## Purpose

- Expose the installed `find-skills` capability inside the project-local `.claude/skills/` hierarchy
- Keep agent prompts aligned with the new project harness

## Source

- Installed global skill: `~/.agents/skills/find-skills/`
- Install command: `npx skills add https://github.com/vercel-labs/skills --skill find-skills`
- Browse skills at: `https://skills.sh/`

## Use

- Use when the current task may require a missing skill or specialized workflow
- Prefer this before inventing new role behavior
- Search or browse for relevant skills first, then recommend the best option to the user
- Prioritize skills with higher install counts and stronger popularity on `https://skills.sh/`
- Install a new skill only after the user explicitly approves the installation

## Notes

- This bridge does not replace the global install
- Keep the original install intact and treat this folder as the project-local entry point
