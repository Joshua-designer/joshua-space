# 툴 호출 순서 체크리스트

이 스킬 실행 시 아래 체크리스트를 순서대로 따른다. **건너뛰기 금지**.

---

## Setup 모드 (디자인 시스템 탐색 → design-system.md 생성)

### S-1: 대상 파일 연결

- [ ] Figma URL에서 fileKey 추출 (figma-implement 파싱 규칙 참조)
- [ ] `mcp__figma__get_metadata` 호출 → 파일/페이지 노드 트리 확보
- [ ] `mcp__figma__get_code_connect_map` 호출 → Code Connect 가용성 판단
    - 빈 결과 시: 사용자에게 경고 메시지 + 진행 여부 확인
    - CC 가용 여부를 design-system.md에 기록

### S-2: 컴포넌트 탐색

- [ ] 기존 화면에서 INSTANCE 노드 추출 (get_metadata 결과에서 componentId 식별)
    - 추출된 componentKey 목록 = "검증된 컴포넌트 풀" (최우선 소스)
- [ ] `mcp__figma__search_design_system` 호출 (includeComponents: true)
    - 쿼리: UI 요소별 ("Button", "Input", "Card", "Navigation" 등)
    - 여러 쿼리를 실행하여 폭넓게 탐색
    - 단수/복수, 영문 변형 시도
- [ ] 컴포넌트별 정보 정리: 이름, componentKey, variant 목록, 텍스트 프로퍼티
- [ ] `mcp__figma__search_design_system` 호출 (includeStyles: true)
    - 쿼리: "heading", "body", "shadow" 등

### S-3: Variables/토큰 탐색

- [ ] `mcp__figma__get_variable_defs` 호출 → 로컬 Variables 수집
- [ ] `mcp__figma__search_design_system` 호출 (includeVariables: true)
    - 쿼리: "color", "gray", "red", "blue", "space", "radius", "padding" 등
    - 짧고 단순한 쿼리를 여러 개 병렬 실행
- [ ] Variables를 카테고리별로 분류:
    - color (색상 토큰)
    - spacing (간격 토큰)
    - typography (폰트 크기, 행간 등)
    - radius (모서리 둥글기)
    - shadow/effect (그림자, 이펙트)

### S-4: design-system.md 생성

- [ ] 수집된 정보를 `generated/design-system.md`에 구조화하여 저장
- [ ] 파일 정보 섹션: fileKey, 생성일시, CC 가용성
- [ ] 컴포넌트 목록 섹션: 이름, key, variants, 텍스트 프로퍼티
- [ ] Variables 섹션: 카테고리별 정리 (이름, key, 값/타입)
- [ ] 텍스트 스타일 섹션
- [ ] 이펙트 스타일 섹션
- [ ] Build vs Import 가이드 섹션
- [ ] 사용자에게 결과를 보여주고 확인

---

## Generate 모드 (design-system.md 기반 → Figma 캔버스에 디자인 작성)

### G-1: 사전 확인

- [ ] `generated/design-system.md` 존재 확인
    - 없으면: "design-system.md가 없습니다. Setup 모드를 먼저 실행해주세요." 안내
    - 있으면: 파일 읽기
- [ ] 사용자 요구사항 확인 (코드 파일 경로, 자연어 설명, 참조 Figma 화면)
- [ ] Figma 대상 파일 URL 확인

### G-2: 화면 설계

- [ ] design-system.md에서 사용 가능한 컴포넌트/Variables 파악
- [ ] 화면을 논리적 섹션으로 분할 (Header, Content, Sidebar, Footer 등)
- [ ] 각 섹션에 매핑할 컴포넌트 결정:
    - design-system.md에 있는 컴포넌트 → import 예정
    - 없는 컴포넌트 → 사용자에게 보고 (직접 빌드 / 유사 컴포넌트 / 사용자 지정)
- [ ] 각 속성에 매핑할 Variables 결정:
    - design-system.md에 있는 Variable → 바인딩 예정
    - 없는 값 → 리터럴 허용 (주석 명시)
- [ ] 설계 결과를 사용자에게 보여주고 확인

### G-3: 래퍼 생성

- [ ] `mcp__figma__use_figma` 1회 호출 → 최상위 래퍼 프레임 생성
    - Auto Layout (VERTICAL), width 설정 (예: 1440px)
    - 배경색 Variable 바인딩 (있는 경우)
- [ ] 생성된 래퍼 nodeId 기록
- [ ] **확인**: 래퍼가 정상 생성되었는지 에러 없는지

### G-4: 섹션별 빌드

- [ ] 섹션 목록을 위에서 아래로 순서대로 처리
- [ ] 각 섹션마다 `mcp__figma__use_figma` 1회 호출:
    - [ ] 래퍼 nodeId를 참조하여 래퍼 안에서 빌드
    - [ ] 디자인 시스템 컴포넌트: `importComponentByKeyAsync` / `importComponentSetByKeyAsync`
    - [ ] Variables 바인딩: `setBoundVariable()` / `setBoundVariableForPaint()`
    - [ ] 텍스트 오버라이드: `setProperties()` 사용
    - [ ] sizing: appendChild 이후에 설정
    - [ ] 응답 크기 20KB 이하 확인 (초과 시 분할)
- [ ] 각 섹션의 생성된 nodeId 기록

### G-5: 검증

- [ ] `mcp__figma__get_screenshot` → 섹션별 스크린샷 캡처
- [ ] 시각 검토:
    - [ ] 레이아웃이 의도대로 배치되었는가
    - [ ] 컴포넌트가 올바른 variant로 표시되는가
    - [ ] 텍스트가 정상 렌더링되는가
    - [ ] 간격/정렬이 일관적인가
- [ ] `mcp__figma__get_metadata` → 노드 트리 재조회:
    - [ ] Variables 바인딩이 올바르게 적용되었는지
    - [ ] 하드코딩된 hex/px 값이 없는지
    - [ ] 컴포넌트 인스턴스가 디자인 시스템에서 import된 것인지
- [ ] 불일치 발견 시:
    - [ ] 문제 사항 사용자 보고
    - [ ] 해당 섹션 use_figma 재호출로 수정
    - [ ] G-5 재실행 (재검증)

---

## Error Recovery 체크리스트

use_figma 또는 다른 MCP 도구에서 에러 발생 시:

1. [ ] **STOP** — 즉시 재시도하지 않는다
2. [ ] **에러 메시지 읽기** — 에러의 구체적 내용 파악
3. [ ] **상태 확인** — `get_metadata` 또는 `get_screenshot`으로 현재 캔버스 상태 확인
4. [ ] **원인 분석** — 에러의 근본 원인 식별
5. [ ] **스크립트 수정** — 원인에 맞게 use_figma 코드 수정
6. [ ] **재시도** — 수정된 코드로 재실행
7. [ ] **반복 실패 시** — 사용자에게 상황 보고 + 대안 제시

---

## 주의사항

- **[절대 규칙]** 이 체크리스트의 순서는 변경할 수 없다
- **[절대 규칙]** 항목을 건너뛸 수 없다 — 해당 없는 항목은 "해당 없음"으로 표시하되 확인은 필수
- **[절대 규칙]** G-4(빌드) 완료 후 반드시 G-5(검증)를 실행한다
- **[절대 규칙]** Setup 모드 완료(design-system.md 생성) 전에 Generate 모드 진입 금지
