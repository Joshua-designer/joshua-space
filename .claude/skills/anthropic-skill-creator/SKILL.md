---
name: anthropic-skill-creator
description: Project bridge for the globally installed `anthropic-skill-creator` capability. Use when a team agent needs to improve prompts, workflows, or local skills.
---

# Anthropic Skill Creator Bridge

## Purpose

- Expose the installed `anthropic-skill-creator` capability inside the project-local `.claude/skills/` hierarchy
- Let agents reference a stable project path after the harness migration

## Source

- Global install: `/Users/joshuaju/.codex/skills/anthropic-skill-creator/`

## Use

- Use when improving prompt structure
- Use when refining local workflows or local skills
- Use when creating new project-local skills under `.claude/skills/`

## Notes

- This bridge does not replace the global install
- Keep the original install intact and treat this folder as the project-local entry point
