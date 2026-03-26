---
name: frontend-design
description: Project-local orchestration skill for the screen design and implementation team. Use when the task requires the local PO, Researcher, UX Writer, UI Designer, Frontend Developer, and Reviewer prompts together.
---

# Frontend Design

## Purpose

- Route work through the local agent prompts in `.claude/agents/`
- Enforce project-specific output discipline from `.claude/rules/global-rules.md`
- Keep installed external skills active without replacing them

## Workflow

1. Start from `product-owner.md`
2. Validate via `researcher.md`
3. Produce copy via `ux-writer.md`
4. Define structure via `ui-designer.md`
5. Translate structure into implementation via `frontend-developer.md`
6. Review via `reviewer.md`

## Installed Skills To Keep

- `find-skills`: use via `../find-skills/` when missing capability discovery is needed
- `anthropic-skill-creator`: use via `../anthropic-skill-creator/` when improving prompts, workflows, or local skills

## References

- Team map: see [references/team-map.md](references/team-map.md)
- Prompt conventions: see [references/prompt-conventions.md](references/prompt-conventions.md)
- Eval notes: see [evals/README.md](evals/README.md)
