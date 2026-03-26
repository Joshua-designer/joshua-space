# 사내 규칙집

## Project

- 목적: AI 기반 B2B SaaS 화면 기획/설계/구현 협업 하네스
- 팀 구성: PO, Researcher, UX Writer, UI Designer, Frontend Developer, Reviewer
- 에이전트 위치: `.claude/agents/`
- 전역 규칙 위치: `.claude/rules/`
- 로컬 스킬 위치: `.claude/skills/frontend-design/`

## Core Workflow

1. `product-owner.md`
2. `researcher.md`
3. `ux-writer.md`
4. `ui-designer.md`
5. `frontend-developer.md`
6. `reviewer.md`

## Installed Skills

- 유지: `find-skills`
- 유지: `anthropic-skill-creator`
- 프로젝트 브리지 경로:
  - `.claude/skills/find-skills/`
  - `.claude/skills/anthropic-skill-creator/`
- 프로젝트 로컬 스킬은 위 설치 스킬을 대체하지 않고 보조적으로 사용

## Constraints

- 이전 단계 결과 기반으로만 다음 단계 작성
- 입력 부족 시 가정 명시
- 확정과 가설 분리
- 중복 설명 금지
