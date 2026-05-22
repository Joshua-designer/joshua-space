---
name: figma-read
description: 'Figma 디자인을 다단계로 정밀 파싱하여 디자인 명세서를 작성하는 스킬. Figma URL을 입력하면 노드 트리를 파악하고, 각 자식 노드/variant를 개별 수집하여 정확한 디자인 명세서를 생성한다. "figma 읽기", "figma 파싱", "디자인 분석", "figma read", "피그마 분석" 등을 언급하면 트리거.'
---

# Figma-Read — Figma 디자인 정밀 파싱 Skill

Figma URL로부터 디자인을 다단계로 파싱하여 정확한 디자인 명세서를 작성한다. 추측을 배제하고 Figma에서 추출한 정확한 값만 사용한다.

---

## 트리거 키워드

"figma 읽기", "figma 파싱", "디자인 분석", "figma read", "피그마 분석", "디자인 명세", "디자인 스펙"

---

## 워크플로우

### 1단계: URL 파싱 및 구조 파악

Figma URL에서 fileKey와 nodeId를 추출한다:

**URL 형식별 파싱 규칙:**

```
일반 디자인: https://figma.com/design/:fileKey/:fileName?node-id=1-2
→ fileKey = :fileKey
→ nodeId = "1:2" (하이픈을 콜론으로 변환)

브랜치: https://figma.com/design/:fileKey/branch/:branchKey/:fileName
→ fileKey = :branchKey (브랜치 키를 fileKey로 사용)

FigJam: https://figma.com/board/:fileKey/:fileName
→ fileKey = :fileKey (get_figjam 도구 사용)
```

**예시:**

```
입력: https://www.figma.com/design/ebKzRVw4pS2OzqBeKZWUNn/Food-Lab--Handoff-?node-id=8885-125491&m=dev
추출: fileKey = "ebKzRVw4pS2OzqBeKZWUNn", nodeId = "8885:125491"
```

**노드 트리 구조 파악:**

`mcp__figma__get_metadata`로 전체 노드 트리를 조회하여 구조를 파악한다.

자식 노드 목록에서 **variant/state 패턴**을 식별한다:

- 이름에 "default", "hover", "active", "disabled", "selected" 등 상태 키워드
- 이름에 "single", "multi", "type=", "size=", "variant=" 등 변형 키워드
- 동일 프레임 아래 유사한 이름의 반복 노드 → variant set로 판단

### 2단계: 깊이 파싱 — 개별 노드 수집

**[절대 규칙]** 루트 노드 1회 `get_design_context`로 끝내지 않는다. 반드시 아래 순서를 따른다:

1. **주요 자식 노드 각각에 `mcp__figma__get_design_context` 호출** (variant/state별로)
    - 각 variant/state의 디자인 속성, 코드, 스크린샷을 개별 수집
    - 복합 UI 요소(탭, 드롭다운, 모달 등)는 각 상태를 개별 노드로 분리 수집

2. **각 variant/state별 `mcp__figma__get_screenshot` 캡처**
    - 스크린샷은 시각 정보를 정확히 기록
    - 디자인 리뷰 및 개발 전달 시 참조 이미지로 사용

3. **`mcp__figma__get_variable_defs`로 디자인 토큰 수집**
    - Figma 변수/토큰 정보 수집
    - 색상, 타이포그래피, 간격 등 디자인 시스템 값 확인

**응답 처리:**

- 응답이 truncated되면 `mcp__figma__get_metadata`로 하위 노드 ID를 확인한 후 재호출
- 모든 variant를 빠짐없이 수집

### 3단계: 디자인 명세서 작성

수집한 정보를 아래 형식의 마크다운 표로 정리한다:

```markdown
# [컴포넌트명] 디자인 명세서

## 레이아웃

| 속성      | 값                    |
| --------- | --------------------- |
| Direction | row / column          |
| Gap       | Npx                   |
| Padding   | top right bottom left |
| Width     | Npx / auto            |
| Height    | Npx / auto            |

## 타이포그래피

| 요소 | Font       | Size | Weight | Line Height | Color   |
| ---- | ---------- | ---- | ------ | ----------- | ------- |
| 제목 | Pretendard | 16px | 600    | 24px        | #1A1A1A |
| 본문 | Pretendard | 14px | 400    | 20px        | #666666 |

## 색상

| 용도               | Hex     | Figma Variable       |
| ------------------ | ------- | -------------------- |
| Primary Background | #0066FF | Color/Primary/Blue   |
| Text               | #1A1A1A | Color/Text/Primary   |
| Border             | #E5E5E5 | Color/Border/Default |

## Border

| 요소     | Radius | Color       | Width |
| -------- | ------ | ----------- | ----- |
| 컨테이너 | 8px    | #E5E5E5     | 1px   |
| 버튼     | 4px    | transparent | 0     |

## 간격(Spacing)

| 요소 간       | 값   |
| ------------- | ---- |
| 아이콘-텍스트 | 8px  |
| 버튼 간       | 12px |
| 섹션 간       | 24px |

## 변형(Variants)

| Variant     | 차이점                                                |
| ----------- | ----------------------------------------------------- |
| single_main | 파란색 배경(#0066FF), 흰색 텍스트, 우측에 체크 아이콘 |
| single      | 흰색 배경, 회색 텍스트(#666), 체크 아이콘 없음        |
| multi       | 흰색 배경, 회색 텍스트(#666), 좌측에 체크박스         |

## 상호작용 상태

| State    | 변경 속성                                      |
| -------- | ---------------------------------------------- |
| hover    | background: #F5F5F5, cursor: pointer           |
| active   | background: #0052CC, border: 2px solid #0052CC |
| disabled | opacity: 0.5, cursor: not-allowed              |

## Figma 스크린샷

- [루트 노드 스크린샷]
- [variant: single_main 스크린샷]
- [variant: single 스크린샷]
- [variant: multi 스크린샷]
```

**명세서 작성 규칙:**

- **[절대 규칙]** 명세서에 "추측" 또는 "아마도" 같은 표현이 있으면 안 됨
- 모든 값은 Figma에서 직접 추출한 것이어야 함
- 불확실한 값이 있으면 해당 노드를 다시 조회
- 스크린샷을 포함하여 시각적 참조를 제공

### 4단계: 사용자 리뷰 및 확정

1. 디자인 명세서를 사용자에게 제시
2. 피드백 수집 → 수정 반영 (반복 가능)
3. 사용자 승인 후 확정

---

## Figma MCP 도구 참조

| 도구                               | 용도                                                      | 사용 단계 |
| ---------------------------------- | --------------------------------------------------------- | --------- |
| `mcp__figma__get_metadata`         | 노드 트리 구조 파악, 자식 노드 ID 식별, variant 패턴 발견 | 1단계     |
| `mcp__figma__get_design_context`   | 디자인 속성, 코드, 스크린샷 추출 (개별 노드별)            | 2단계     |
| `mcp__figma__get_screenshot`       | 개별 노드/variant 스크린샷 캡처                           | 2단계     |
| `mcp__figma__get_variable_defs`    | 디자인 토큰(색상, spacing, typography) 수집               | 2단계     |
| `mcp__figma__search_design_system` | 디자인 시스템 컴포넌트 검색                               | 2단계     |

---

## Anti-Rationalization (자기합리화 방어)

| 지름길 생각                         | 실제 문제                                                        |
| ----------------------------------- | ---------------------------------------------------------------- |
| "루트 노드 한 번 호출이면 충분하다" | variant/state를 개별 수집하지 않으면 누락이 발생한다             |
| "대충 비슷하면 된다"                | 1px 차이도 디자인 명세에서는 중요하다. 정확한 값을 기록한다      |
| "스크린샷만으로 충분하다"           | 스크린샷은 참고용이고, 정확한 속성값은 get_design_context로 수집 |

---

## Red Flags (경고 신호)

아래 신호가 보이면 즉시 중단하고 워크플로우로 돌아간다.

- 명세서에 "추측", "아마도" 표현이 포함됨
- get_design_context 없이 스크린샷만으로 명세서 작성
- variant가 있는데 1개만 수집하고 나머지를 추측
- 루트 노드 1회 호출로 명세서 작성 완료 선언

---

## Verification Checklist (검증 체크리스트)

모든 단계 완료 후 아래 항목을 체크한다. 하나라도 미충족이면 완료가 아니다.

- [ ] 모든 variant/state가 개별 수집됨
- [ ] 명세서에 추측 표현 없음
- [ ] 스크린샷이 포함됨
- [ ] 사용자 승인 완료

---

## 핵심 규칙

1. **[절대 규칙] 루트 노드 1회 호출 금지**
    - `get_design_context`를 최상위 노드에 한 번만 호출하고 끝내는 것은 금지
    - 반드시 자식 노드/variant를 개별 수집
    - 복합 UI 요소는 상태별로 분리 수집

2. **[절대 규칙] 추측 금지**
    - border-radius, 색상, spacing 등을 "일반적으로 8px", "보통 #333" 같이 추측하지 않음
    - Figma에서 읽은 정확한 값만 사용
    - 불확실하면 해당 노드를 다시 조회

3. **variant 전수 조사**
    - Figma에 variant가 있으면 모든 variant의 디자인을 개별 수집
    - 하나만 보고 나머지를 추측하지 않음
    - 각 variant/state의 스크린샷을 모두 캡처

4. **명세서 승인 후 확정**
    - 명세서를 사용자에게 보여주고 승인받기 전에 확정하지 않음
    - 명세서에 "추측", "아마도" 표현이 있으면 수정 후 재제출
