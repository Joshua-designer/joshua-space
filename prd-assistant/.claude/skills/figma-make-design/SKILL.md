---
name: figma-make-design
description: 'Figma 디자인 시스템을 기반으로 Figma 캔버스에 고품질 디자인을 자동 생성하는 스킬.
    디자인 시스템 컴포넌트와 Variables를 정확히 사용하며, 하드코딩된 값이나 존재하지 않는
    컴포넌트를 만들지 않는다. "figma 디자인 생성", "figma make", "피그마 디자인 만들기",
    "figma design generate", "캔버스에 디자인", "figma에 디자인", "피그마에 화면 만들어줘",
    "디자인 시스템 설정", "design system setup" 등을 언급하면 트리거.'
compatibility: Requires Figma MCP server connection.
metadata:
    mcp-server: figma
---

# Figma-Make-Design — Figma 캔버스 디자인 생성 Skill

Figma 디자인 시스템을 한 번 탐색하여 로컬 레퍼런스(`design-system.md`)로 저장하고, 이후 디자인 생성 시 이 레퍼런스를 읽어 고품질 디자인을 Figma 캔버스에 작성한다. 기존 `figma-generate-design` 공식 skill의 품질 이슈(컴포넌트 hallucination, 하드코딩된 값, Code Connect 미확인)를 방지하는 강화된 워크플로우를 사용한다.

---

## figma-implement와의 역할 경계

| 기준          | figma-implement                     | figma-make-design (이 스킬)                                     |
| ------------- | ----------------------------------- | --------------------------------------------------------------- |
| **방향**      | Figma → Code (디자인을 코드로 구현) | 요구사항 → Figma 캔버스 (디자인 생성)                           |
| **입력**      | Figma URL (기존 디자인)             | 코드 파일, 자연어 설명, 또는 Figma URL + 수정 요청              |
| **출력**      | SCSS Modules + React 컴포넌트       | Figma 캔버스 위의 디자인 (프레임, 컴포넌트 인스턴스, Variables) |
| **핵심 도구** | get_design_context, get_screenshot  | use_figma, search_design_system, get_variable_defs              |

**URL 파싱 규칙**: `figma-implement` SKILL.md의 1단계 URL 파싱 규칙을 따른다.
**MCP 도구 참조**: `figma-implement` SKILL.md의 MCP 도구 참조 테이블과 이 스킬의 `references/mcp-tool-guide.md`를 함께 참조한다.

---

## 트리거 키워드

"figma 디자인 생성", "figma make", "피그마 디자인 만들기", "figma design generate", "캔버스에 디자인", "figma에 디자인", "피그마에 화면 만들어줘", "디자인 시스템 설정", "design system setup", "디자인 시스템 탐색"

---

## When to use

- Figma 캔버스에 새 화면/컴포넌트를 디자인 시스템 기반으로 생성할 때
- 기존 Figma 디자인을 수정/업데이트할 때
- 코드나 요구사항을 Figma 디자인으로 변환할 때
- 디자인 시스템(컴포넌트, Variables, 스타일)을 탐색하여 레퍼런스를 만들 때

## When NOT to use

- Figma 디자인을 **코드**로 구현할 때 → `figma-implement` 스킬 사용
- 단순 Figma 스크린샷 조회 → MCP 도구 직접 호출
- FigJam 다이어그램 작업 → `generate_diagram` 도구 직접 사용
- Code Connect 매핑 생성 → `figma-code-connect-components` 스킬 사용

---

## 2가지 모드

이 스킬은 **Setup**과 **Generate** 두 가지 모드로 동작한다.

| 모드         | 목적                               | 입력                        | 출력                         |
| ------------ | ---------------------------------- | --------------------------- | ---------------------------- |
| **Setup**    | 디자인 시스템 탐색 + 레퍼런스 생성 | Figma 파일 URL              | `generated/design-system.md` |
| **Generate** | 캔버스에 디자인 작성               | 요구사항 + design-system.md | Figma 캔버스 디자인          |

- Setup은 디자인 시스템이 변경될 때만 재실행하면 된다
- Generate는 매번 로컬 `design-system.md` 파일만 읽어서 수행한다
- **[절대 규칙]** design-system.md가 없으면 Generate 모드를 실행할 수 없다 — Setup 먼저 안내

---

## Setup 모드 — 디자인 시스템 탐색

디자인 시스템을 한 번 탐색하여 `generated/design-system.md`로 저장한다.
상세 체크리스트: `assets/tool-call-sequence.md` 참조.

### S-1: 대상 파일 연결

1. Figma URL에서 fileKey를 추출한다 (figma-implement SKILL.md의 URL 파싱 규칙 따름)
2. `mcp__figma__get_metadata`로 파일/페이지 구조를 파악한다
3. `mcp__figma__get_code_connect_map`을 호출하여 Code Connect 가용성을 판단한다:
    - **매핑 존재**: CC 가용 플래그 설정, 매핑 정보 저장
    - **빈 결과 또는 에러**: 사용자에게 경고 메시지 표시:
      "⚠️ Code Connect가 설정되지 않아 컴포넌트 → 코드 매핑을 사용할 수 없습니다.
      Organization/Enterprise 플랜 + Code Connect 설정을 권장합니다.
      이미지 기반 추측 모드로 전환되어 퀄리티가 낮아질 수 있습니다."
      → 계속 진행 여부 사용자 확인
4. **[Code Connect Publish 체크]** design-system.md가 이미 존재하고 `code_connect_status`가 `"unpublished"`인 경우:
    - 사용자에게 질문: "이전 Setup에서 컴포넌트가 Publish되지 않아 Code Connect 없이 진행했습니다. 현재 컴포넌트가 Publish되었나요?"
    - **Publish됨** → `get_code_connect_map`으로 재확인 → 매핑 존재 시 Setup을 **처음부터 재실행**하여 design-system.md를 Code Connect 기반으로 업데이트
    - **아직 미게시** → 기존 design-system.md를 그대로 사용하여 Generate 진행
    - 이 체크는 **Setup 모드 진입 시, 그리고 Generate 모드에서 design-system.md를 읽을 때** 모두 수행한다

### S-2: 컴포넌트 탐색

**2-1. 기존 화면 인스턴스에서 컴포넌트 맵 추출 (Figma 공식 권장, 최우선)**

- `get_metadata` 결과에서 `INSTANCE` 타입 노드를 식별한다
- componentId/componentKey를 추출하여 "검증된 컴포넌트 풀"로 저장한다
- 이 방법이 가장 신뢰할 수 있는 소스다

**2-2. search_design_system으로 보충 탐색**

- `mcp__figma__search_design_system` 호출 (includeComponents: true, includeStyles: true)
- UI 요소별 쿼리: "Button", "Input", "Card", "Navigation", "Tab", "Modal" 등
- 짧고 단순한 쿼리를 여러 개 실행하여 폭넓게 탐색한다
- 단수/복수, 영문 변형 모두 시도한다
- 결과에서 componentKey, variant 옵션, 텍스트 프로퍼티를 정리한다

### S-3: Variables/토큰 탐색

1. `mcp__figma__get_variable_defs`로 Variables를 수집한다
2. `mcp__figma__search_design_system` (includeVariables: true)로 라이브러리 Variables를 수집한다
    - 쿼리: "color", "gray", "red", "blue", "space", "radius", "padding", "shadow" 등
3. Variables를 카테고리별로 분류한다:
    - **color**: 색상 토큰 (Primary, Secondary, Surface, Text 등)
    - **spacing**: 간격 토큰 (Gap, Padding, Margin 등)
    - **typography**: 폰트 크기, 행간 등
    - **radius**: 모서리 둥글기
    - **shadow/effect**: 그림자, 이펙트

### S-4: design-system.md 생성

수집된 정보를 `generated/design-system.md`에 아래 구조로 저장한다:

```
# Design System Reference

## 파일 정보
- fileKey: ...
- 생성일시: YYYY-MM-DD HH:mm
- Code Connect 가용성: Yes/No

## 컴포넌트 목록
| 이름 | componentKey | 소스 | variant 옵션 | 텍스트 프로퍼티 |
|------|-------------|------|-------------|----------------|

## Variables
### Color
| 이름 | variableKey | 값/타입 |
|------|------------|---------|

### Spacing
| 이름 | variableKey | 값/타입 |
|------|------------|---------|

### Typography
...

### Radius
...

### Shadow/Effect
...

## 텍스트 스타일
| 이름 | styleKey | Font | Size | Weight | Line Height |
|------|---------|------|------|--------|-------------|

## 이펙트 스타일
| 이름 | styleKey | 타입 | 값 |
|------|---------|------|-----|

## Build vs Import 가이드
- 직접 빌드: 페이지 래퍼, 섹션 컨테이너, 레이아웃 그리드
- 디자인 시스템 import: 컴포넌트, Variables, 텍스트 스타일, 이펙트 스타일
```

사용자에게 결과를 보여주고 확인을 받는다.

---

## Generate 모드 — Figma 캔버스에 디자인 작성

`design-system.md`를 읽어 Figma 캔버스에 디자인을 생성한다.
상세 체크리스트: `assets/tool-call-sequence.md` 참조.
기술 규칙: `references/design-system-rules.md` 참조.

### G-1: 사전 확인

1. `generated/design-system.md` 존재를 확인한다
    - 없으면: "design-system.md가 없습니다. Setup 모드를 먼저 실행해주세요." 안내
2. 사용자 요구사항을 확인한다 (코드 파일, 자연어 설명, 참조 Figma 화면)
3. Figma 대상 파일 URL을 확인한다
4. **요구사항 검증 (grill-me 패턴 적용)**:
    - 수집된 요구사항의 모호성을 체계적으로 검증한다
    - **코드베이스/디자인 시스템 먼저 탐색**: design-system.md와 기존 Figma 화면을 참조하여 스스로 답할 수 있는 부분은 먼저 해결한다
    - **비즈니스 판단이 필요한 미결 사항만 사용자에게 질문** (3~5개 그룹, 추천 답변 포함):

    | 카테고리       | 디자인 생성 맥락 질문 예시                                                |
    | -------------- | ------------------------------------------------------------------------- |
    | **[레이아웃]** | "데스크톱(1440px) 기준인가요? 반응형이 필요한가요?"                       |
    | **[콘텐츠]**   | "각 섹션에 들어갈 실제 텍스트/데이터가 있나요? 더미 데이터를 사용할까요?" |
    | **[컴포넌트]** | "디자인 시스템에 '{이름}'이 없습니다. 유사한 '{대안}'을 사용할까요?"      |
    | **[인터랙션]** | "hover/active 등 상태별 디자인도 필요한가요?"                             |
    | **[범위]**     | "이 화면의 모든 섹션을 한 번에 만들까요? 우선순위가 있나요?"              |
    | **[참조]**     | "참고할 기존 화면이나 외부 레퍼런스가 있나요?"                            |
    - 라운드를 반복하여 모든 미결 사항을 해결한다
    - **[절대 규칙] 요구사항 검증이 완료되기 전에 G-2(화면 설계)로 진행하지 않는다**
    - 검증 완료 시 확인된 결정사항을 정리하여 사용자에게 보여준다:
        ```
        ## 요구사항 확인 완료 ✅
        - 레이아웃: 데스크톱 1440px, 단일 컬럼
        - 섹션: Header, Content, Footer (3개)
        - 컴포넌트: Button/Primary, Card/Default, Input/Text (design-system.md 확인됨)
        - 상태: default만 (hover/active는 2차)
        - 콘텐츠: 더미 텍스트 사용
        ```

5. **대상 페이지를 결정한다**:
    - **[절대 규칙] 새 디자인은 항상 새 페이지에 생성한다** — 기존 디자인과의 혼선 방지
    - `mcp__figma__get_metadata`로 기존 페이지 목록을 조회하여 이름 중복을 피한다
    - 사용자에게 새 페이지 이름을 확인한다 (예: "Settings Page", "Dashboard v2")
    - 기존 화면 수정(G-6)인 경우에만 기존 페이지에서 작업한다

### G-2: 화면 설계

1. design-system.md를 읽어 사용 가능한 컴포넌트/Variables를 파악한다
2. 화면을 논리적 섹션으로 분할한다 (Header, Content Area, Sidebar, Footer 등)
3. 각 섹션에 매핑할 컴포넌트와 Variables를 결정한다:
    - design-system.md에 있는 컴포넌트 → import 예정
    - **없는 컴포넌트 → import 금지, 사용자에게 보고**:
      "'{컴포넌트명}'이 디자인 시스템에 존재하지 않습니다.
      대안: (a) 기본 프레임으로 직접 빌드 (b) 유사 컴포넌트 '{유사명}' 사용 (c) 사용자 지정"
4. 설계 결과를 사용자에게 보여주고 확인을 받는다

### G-3: 페이지 및 래퍼 생성

`mcp__figma__use_figma` 1회 호출로 새 페이지를 만들고 그 안에 래퍼 프레임을 생성한다:

```javascript
// 1. 새 페이지 생성 (기존 디자인과 분리)
const newPage = figma.createPage();
newPage.name = 'TARGET_PAGE_NAME'; // G-1에서 확인한 페이지 이름
await figma.setCurrentPageAsync(newPage);

// 2. 래퍼 프레임 생성 (0, 0 위치)
const wrapper = figma.createFrame();
wrapper.name = 'Page Wrapper';
wrapper.layoutMode = 'VERTICAL';
wrapper.resize(1440, 100);
wrapper.layoutSizingHorizontal = 'FIXED';
wrapper.layoutSizingVertical = 'HUG';
// 배경색 Variable 바인딩 (design-system.md 참조)
return { wrapperId: wrapper.id, pageId: newPage.id };
```

**스크린 구분 규칙**:

- Wrapper의 `itemSpacing`을 `100`으로 설정하여 스크린 간 충분한 간격을 둔다
- 각 스크린 프레임 앞에 **라벨 프레임**을 삽입한다:
    - 제목: 스크린 번호 + 이름 (예: "Screen 1 — Experiments List (실험 목록)")
    - 서브타이틀: 관련 User Story 참조 (예: "US-2: 실험 목록 조회")
    - 구분선: Brand 색상 2px 라인
- 이 라벨은 디자인 핸드오프 시 개발자가 어떤 화면인지 즉시 식별할 수 있게 한다

**[절대 규칙]** 새 디자인은 항상 새 페이지에 생성한다 — 기존 페이지의 디자인을 건드리지 않는다.
**[절대 규칙]** 래퍼 밖에서 섹션을 만들고 나중에 이동(reparent)하는 것은 금지 — 크로스 콜 reparent는 실패한다.

### G-4: 섹션별 빌드

1. 섹션 목록을 위에서 아래로 순서대로 처리한다
2. **각 섹션마다 `mcp__figma__use_figma` 1회 호출** (20KB 제한 준수)
3. 각 use_figma 호출에서:
    - 래퍼 nodeId를 `figma.getNodeByIdAsync()`로 참조
    - design-system.md의 componentKey로 컴포넌트 import:
      `importComponentByKeyAsync()` / `importComponentSetByKeyAsync()`
    - **Variables 바인딩 필수**: `setBoundVariable()` / `setBoundVariableForPaint()`
    - 텍스트 오버라이드: `setProperties()` 사용 (node.characters 직접 수정 금지)
    - sizing: appendChild 이후에 설정
4. 복잡한 섹션은 하위 그룹으로 분할하여 여러 번 호출한다

기술 상세: `references/design-system-rules.md` 참조.

### G-5: 검증

1. `mcp__figma__get_screenshot` → 섹션별 스크린샷 캡처
2. 시각 검토:
    - 레이아웃이 의도대로 배치되었는가
    - 컴포넌트가 올바른 variant로 표시되는가
    - 텍스트가 정상 렌더링되는가
    - 간격/정렬이 일관적인가
3. `mcp__figma__get_metadata` → 노드 트리 재조회:
    - Variables 바인딩이 올바르게 적용되었는지
    - 하드코딩된 hex/px 값이 없는지
    - 컴포넌트 인스턴스가 디자인 시스템에서 import된 것인지
4. **Acceptance Criteria 대조 검증**:
    - PRD/User Story의 각 화면별 Acceptance Criteria를 하나씩 대조한다
    - 각 AC 항목에 대해:
        - ✅ 디자인에 반영됨 — 해당 UI 요소가 존재하고 의도대로 표현됨
        - ⚠️ 부분 반영 — UI 요소는 있으나 세부사항 누락 (예: 빈 상태 미구현)
        - ❌ 미반영 — 해당 AC를 충족하는 UI 요소가 없음
    - AC 대조 결과를 사용자에게 표 형태로 보고한다
    - ❌ 항목이 있으면 해당 섹션을 수정한 후 재검증한다
    - **[절대 규칙] AC 대조 없이 "검증 완료"를 선언하지 않는다**
5. 불일치 발견 시:
    - 문제 사항을 사용자에게 보고
    - 해당 섹션의 use_figma를 재호출하여 수정
    - G-5를 다시 실행 (재검증)

### G-6: 기존 화면 업데이트 (수정 모드)

이미 존재하는 Figma 화면을 수정할 때:

1. `mcp__figma__get_metadata`로 기존 화면의 노드 트리를 파악한다
2. `mcp__figma__get_screenshot`으로 현재 상태를 캡처한다
3. 변경이 필요한 노드를 식별한다
4. `mcp__figma__use_figma`로 해당 노드만 수정한다
5. G-5(검증)를 다시 실행한다

---

## Anti-Rationalization (자기합리화 방어)

자주 발생하는 지름길 생각과 그 문제점을 정리한다.

| 지름길 생각                            | 실제 문제                                                 |
| -------------------------------------- | --------------------------------------------------------- |
| "design-system.md 없이도 만들 수 있다" | 컴포넌트 hallucination이 발생한다. 반드시 Setup 먼저 실행 |
| "Variables 안 써도 보기엔 같다"        | 디자인 시스템 일관성이 깨진다. Variables 바인딩이 필수    |
| "AC가 없어도 요구사항은 파악했다"      | AC 없이는 검증 기준이 없다. "완료"를 정의할 수 없다       |

---

## Red Flags (경고 신호)

아래 신호가 보이면 즉시 중단하고 워크플로우로 돌아간다.

- design-system.md 없이 Generate 모드 진입
- 존재하지 않는 componentKey 사용
- AC 대조 없이 검증 완료 선언
- Variables 바인딩 없이 하드코딩된 값 사용

---

## Verification Checklist (검증 체크리스트)

모든 단계 완료 후 아래 항목을 체크한다. 하나라도 미충족이면 완료가 아니다.

- [ ] design-system.md 기반 컴포넌트만 사용
- [ ] Variables 바인딩 확인
- [ ] AC 대조 표 작성 완료
- [ ] Code Connect publish 성공 (해당 시)

---

## 핵심 규칙

1. **[절대 규칙] Setup 없이 Generate 금지**
    - design-system.md가 없으면 Generate 모드를 실행할 수 없다
    - 반드시 Setup 모드로 디자인 시스템 레퍼런스를 먼저 생성한다

2. **[절대 규칙] 컴포넌트 Hallucination 금지**
    - design-system.md에 없는 컴포넌트를 import하거나 참조하지 않는다
    - 필요한 컴포넌트가 없으면 사용자에게 보고하고 대안을 제시한다
    - 상세: `references/quality-issues.md` 이슈 #2 참조

3. **[절대 규칙] Variables 우선 바인딩**
    - design-system.md에 Variable이 있으면 반드시 바인딩한다
    - hex/px 리터럴은 토큰이 없을 때만 허용하며, 주석으로 "토큰 없음"을 명시한다
    - 상세: `references/quality-issues.md` 이슈 #4 참조

4. **[절대 규칙] 빌드 후 검증 필수**
    - G-4(빌드) 완료 후 반드시 G-5(검증)를 실행한다
    - 검증 없이 완료를 선언하지 않는다

5. **[절대 규칙] 래퍼 먼저, 그 안에서 빌드**
    - 섹션을 래퍼 밖에서 만들고 나중에 이동(reparent)하지 않는다
    - 크로스 콜 reparent는 실패한다

6. **[절대 규칙] 섹션당 1회 use_figma**
    - 20KB 응답 제한을 준수하기 위해 하나의 use_figma에 전체 화면을 넣지 않는다
    - 복잡한 섹션은 하위 그룹으로 분할한다

7. **[절대 규칙] 탐색 전 빌드 금지**
    - Setup 모드에서 디자인 시스템 탐색이 완료되기 전에 use_figma를 호출하지 않는다
    - Generate 모드에서 design-system.md를 읽기 전에 use_figma를 호출하지 않는다

8. **Error Recovery**
    - use_figma 실패 시 즉시 재시도하지 않는다
    - STOP → 에러 메시지 읽기 → get_metadata/get_screenshot 확인 → 스크립트 수정 → 재시도
    - 상세: `assets/tool-call-sequence.md` Error Recovery 체크리스트 참조

9. **Code Connect 실패 감지 및 알림**
    - Setup S-1에서 get_code_connect_map이 빈 결과를 반환하면 사용자에게 즉시 알린다
    - 상세: `references/quality-issues.md` 이슈 #1 참조

10. **[절대 규칙] Code Connect Publish 상태 추적**
    - design-system.md에 `code_connect_status` 필드를 기록한다 (`"connected"` / `"unpublished"`)
    - `"unpublished"` 상태의 design-system.md가 존재할 때, 이 스킬이 실행되면 **반드시** 사용자에게 Publish 여부를 먼저 질문한다
    - Publish 완료 시 Setup을 재실행하여 design-system.md를 업데이트한다
    - 이 체크를 건너뛰고 Generate로 진행하는 것은 금지한다

11. **[절대 규칙] 스크린 간 시각적 구분 필수**
    - 각 스크린 프레임 앞에 제목 라벨(스크린 번호 + 이름 + User Story 참조)을 삽입한다
    - Wrapper에 100px 이상 간격을 설정하여 스크린을 명확히 분리한다
    - 라벨 없이 스크린을 나열하면 핸드오프 시 혼란이 발생한다

12. **[절대 규칙] AC 대조 검증 필수**
    - G-5에서 시각 검증뿐 아니라 PRD/User Story의 Acceptance Criteria를 항목별로 대조한다
    - AC 대조 결과를 사용자에게 보고하고, 미반영 항목은 수정 후 재검증한다

13. **요구사항 검증 완료 전 디자인 시작 금지**
    - G-1에서 grill-me 패턴으로 요구사항을 충분히 검증한 후에만 G-2로 진행한다
    - 모호한 요구사항으로 디자인을 시작하면 재작업이 불가피하다

---

## Error Recovery 프로토콜

MCP 도구에서 에러 발생 시:

1. **STOP** — 즉시 재시도하지 않는다
2. **에러 메시지 읽기** — 구체적 내용 파악
3. **상태 확인** — `get_metadata` 또는 `get_screenshot`으로 현재 캔버스 상태 확인
4. **원인 분석** — 에러의 근본 원인 식별:
    - 존재하지 않는 componentKey → design-system.md 재확인
    - 20KB 초과 → 섹션 분할
    - reparent 실패 → 래퍼 안에서 빌드하도록 수정
    - 폰트 로드 실패 → 폰트 이름 정확히 매칭
5. **스크립트 수정** — 원인에 맞게 use_figma 코드 수정
6. **재시도** — 수정된 코드로 재실행
7. **반복 실패** — 사용자에게 상황 보고 + 대안 제시

---

## MCP 도구 참조

이 스킬에서 사용하는 주요 MCP 도구. 상세는 `references/mcp-tool-guide.md` 참조.
기본 도구 목록은 `figma-implement` SKILL.md의 MCP 도구 참조 테이블도 함께 참조.

| 도구                               | 용도                           | 사용 모드/단계                          |
| ---------------------------------- | ------------------------------ | --------------------------------------- |
| `mcp__figma__get_metadata`         | 노드 트리 구조 파악            | Setup S-1, S-2 / Generate G-1, G-5, G-6 |
| `mcp__figma__get_screenshot`       | 스크린샷 캡처                  | Setup S-1 / Generate G-5, G-6           |
| `mcp__figma__get_code_connect_map` | Code Connect 가용성 확인       | Setup S-1                               |
| `mcp__figma__search_design_system` | 컴포넌트/Variables/스타일 검색 | Setup S-2, S-3                          |
| `mcp__figma__get_variable_defs`    | Variables 정의 조회            | Setup S-3                               |
| `mcp__figma__use_figma`            | 캔버스에 디자인 작성           | Generate G-3, G-4, G-6                  |

---

## Examples

### 예시 1: 디자인 시스템 Setup

```
사용자: "이 Figma 파일의 디자인 시스템을 설정해줘: https://figma.com/design/abc123/My-Design-System"

실행:
1. S-1: fileKey="abc123" 추출, get_metadata, get_code_connect_map
2. S-2: INSTANCE 노드에서 컴포넌트 추출, search_design_system으로 보충
3. S-3: get_variable_defs + search_design_system(includeVariables)
4. S-4: generated/design-system.md 생성 → 사용자 확인
```

### 예시 2: 새 화면 디자인 생성

```
사용자: "설정 화면을 Figma에 만들어줘. 사이드바 + 메인 콘텐츠 레이아웃으로."

실행:
1. G-1: design-system.md 읽기, 요구사항 확인
2. G-2: 섹션 분할 (Sidebar, Main Content), 컴포넌트 매핑
3. G-3: 래퍼 프레임 생성 (1440px, VERTICAL)
4. G-4: Sidebar 섹션 빌드 → Main Content 섹션 빌드
5. G-5: 섹션별 스크린샷 + Variables 바인딩 검증
```

### 예시 3: 기존 화면 수정

```
사용자: "이 화면의 헤더 섹션을 수정해줘: https://figma.com/design/abc123/Page?node-id=100-200"

실행:
1. G-1: design-system.md 읽기
2. G-6: get_metadata로 기존 구조 파악 → get_screenshot 캡처
3. G-6: 헤더 노드 식별 → use_figma로 수정
4. G-5: 수정 결과 검증
```

### 예시 4: 웹앱 병렬 워크플로우 (웹앱 전용)

```
사용자: "실행 중인 웹앱(localhost:3000)을 Figma 디자인으로 변환해줘"

실행:
1. G-1: design-system.md 읽기
2. 병렬 실행:
   a. generate_figma_design으로 웹앱 캡처 → 픽셀 퍼펙트 레퍼런스
   b. G-3~G-4: use_figma로 디자인 시스템 기반 빌드
3. 두 결과를 비교하여 레이아웃 정확도 향상
4. generate_figma_design 출력은 레퍼런스 확인 후 삭제
5. G-5: 검증
```

---

## Common Edge Cases

### 디자인 시스템에 컴포넌트가 없는 경우

- search_design_system 결과가 비어있으면 사용자에게 보고한다
- 대안을 제시: 기본 프레임으로 직접 빌드, 유사 컴포넌트 사용, 사용자 지정
- **절대로 존재하지 않는 componentKey로 import하지 않는다**

### Variables/토큰이 없는 경우

- 디자인 시스템에 Variables가 설정되지 않은 경우
- 리터럴 값(hex, px) 사용을 허용하되, 주석으로 "토큰 없음" 명시
- 사용자에게 디자인 시스템 정비를 권장

### Code Connect가 없는 경우 (Free/Pro 플랜)

- S-1에서 감지하여 사용자에게 알림
- search_design_system에 더 의존하여 탐색
- 코드 매핑 없이 컴포넌트 key만으로 진행

### 20KB 제한 초과

- 복잡한 섹션을 하위 그룹으로 분할한다
- 반복 패턴(리스트, 그리드)은 그룹 단위로 분할한다
- 각 호출에서 생성된 nodeId를 반환하여 다음 호출에서 참조한다

### design-system.md가 오래된 경우

- 디자인 시스템이 변경된 후 Setup을 재실행하지 않으면 불일치 발생
- G-2에서 필요한 컴포넌트가 design-system.md에 없으면 Setup 재실행을 안내한다
- design-system.md의 생성일시를 확인하여 오래되었으면 경고한다

### 기존 화면 업데이트 시 기존 요소 손상

- G-6에서 기존 노드 ID를 사용하여 직접 수정한다
- 새 노드 추가는 기존 부모 안에 appendChild로만 한다
- 수정 후 반드시 G-5 검증으로 기존 요소 무결성 확인

---

## 참조 문서

- `references/quality-issues.md` — 4가지 품질 이슈 상세 (원인, 감지, 대응)
- `references/mcp-tool-guide.md` — MCP 도구별 상세 사용법
- `references/design-system-rules.md` — 컴포넌트/Variables 적용 기술 규칙
- `assets/tool-call-sequence.md` — 단계별 툴 호출 체크리스트
- `figma-implement` SKILL.md — URL 파싱 규칙, MCP 도구 참조 테이블
