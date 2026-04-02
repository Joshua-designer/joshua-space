# 사내 규칙집

## Project

- 목적: AI 기반 B2B SaaS 화면 기획/설계/구현 협업 하네스
- 팀 구성: PO, Researcher, UX Writer, UI Designer, Frontend Developer, Reviewer
- 에이전트 위치: `.claude/agents/`
- 전역 규칙 위치: `.claude/rules/`
- 로컬 스킬 위치: `.claude/skills/frontend-design/`
- 새 요청이 들어오면 항상 이 저장소의 로컬 에이전트와 로컬 스킬 브리지를 우선 사용

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
- 추가 스킬이 필요하면 먼저 `find-skills`로 `https://skills.sh/` 또는 `npx skills find` 결과를 확인
- 스킬 추천 시 `https://skills.sh/` 기준으로 설치 수와 인기가 높은 스킬을 우선 제안
- 새 스킬 설치는 추천과 근거를 먼저 제시한 뒤 사용자 승인 후 진행

## Constraints

- 이전 단계 결과 기반으로만 다음 단계 작성
- 입력 부족 시 가정 명시
- 확정과 가설 분리
- 중복 설명 금지
- PRD 요청 시 모든 에이전트는 `.claude/rules/prd-rules.md` 구조/원칙을 필수 준수
- 저장소 밖의 에이전트나 임의 역할을 우선하지 말고 `.claude/agents/`와 `.claude/skills/`를 기본 진입점으로 사용
