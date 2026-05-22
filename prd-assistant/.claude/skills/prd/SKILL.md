---
name: prd
description: 'Notion 페이지의 기획 내용을 분석하여 PRD를 작성하고, User Story를 분해하여 Notion DB에 등록한 뒤, 디자인 DRAFT를 생성하는 기획자/디자이너용 워크플로우. 사용자가 "PRD", "프로덕트 요구사항", "기능 기획", "user story", "유저 스토리", "기능 분해" 등을 언급하면 트리거.'
---

# PRD — Product Requirements Document 자동화 Skill (기획자/디자이너용)

Notion 페이지의 기획 내용을 분석하여 PRD를 작성하고, User Story를 분해하여 Notion DB에 등록한 뒤, 각 Story별 디자인 DRAFT를 생성하는 기획자/디자이너용 워크플로우다.

기존에 다른 AI가 작성한 PRD가 있을 수 있으나, 이를 기반으로 사용자 중심의 PRD를 재작성한다.

---

## 트리거 키워드

"PRD", "프로덕트 요구사항", "기능 기획", "user story", "유저 스토리", "기능 분해", "요구사항 정의", "스토리 분해"

---

## 워크플로우 문서 시스템

```
workflows/
  {YYYY-MM-DD}_{feature-name}/
    workflow.md              # 마스터 워크플로우 진행 기록
    source-analysis.md       # Notion 원본 + 기존 PRD 분석 결과
    clarifications.md        # Q&A 기록
    prd.md                   # 최종 PRD 문서
    user-stories.md          # User Story 목록 + Notion DB 매핑
    design-guidelines.md     # 화면별 디자인 가이드라인 (조건부)
    design-draft-log.md      # 디자인 DRAFT 진행 로그 (조건부)
    design-draft-document.md # 디자인 Draft 문서 — 디자인 배경, 결정 과정, 디자이너 참고사항 (조건부)
    handoff-sync-log.md      # US별 핸드오프 동기화 현황 — Figma URL, 기술 정의서, Notion 업데이트 상태 (조건부)
```

### 워크플로우 재개 (Resume) 규칙

워크플로우 시작 시 `workflows/` 디렉토리에 미완료 워크플로우가 있는지 확인한다:

1. `workflow.md`의 체크리스트에서 `[ ]` (미완료) 항목이 있는 문서를 찾는다
2. 미완료 워크플로우가 있으면 사용자에게 이어서 진행할지, 새로 시작할지 질문한다
3. 이어서 진행하는 경우, 기존 문서를 모두 읽어 컨텍스트를 복원한 뒤 마지막 완료 단계 다음부터 재개한다

---

## 워크플로우 (10단계)

> **⚠️ [단계 완료 게이트]** 각 단계는 반드시 순차 실행한다. 이전 단계의 산출물 파일이 워크플로우 디렉토리에 기록 완료된 후에만 다음 단계로 진행한다. 산출물 없이 다음 단계로 건너뛰는 것은 절대 금지.

### Phase 1: 이해 (Understanding)

#### 1단계: 입력 + 초기화

- Notion 페이지 URL 입력받기
- page_id 추출 (URL 마지막 32자리 hex를 UUID로 변환: 8-4-4-4-12 형식)
- 워크플로우 문서 디렉토리 초기화: `workflows/{YYYY-MM-DD}_{feature-name}/`
- `workflow.md` 생성 (각 단계 체크리스트 포함)
- **Notion 페이지 내용 검증**: 2단계에서 페이지를 읽은 뒤, 아래 핵심 항목이 포함되어 있는지 확인하고 부족한 부분은 사용자에게 보충을 요청한다:
    - 기능 배경 및 목적 (왜 이 기능이 필요한지)
    - 대상 사용자 (누가, 어떤 상황에서 사용하는지)
    - 핵심 요구사항 (무엇을 원하는지 — 구체적 기능 목록)
    - 참고 자료 (Figma 링크, 경쟁사 분석, 관련 문서 등)
    - 비즈니스 규칙 (있는 경우)
    - 기존 시스템과의 관계 (있는 경우)
    - 내용이 너무 부족하면(핵심 항목 2개 이하) 사용자에게 "Notion 페이지에 기획 내용을 좀 더 보충해주시면 PRD 품질이 높아집니다"라고 안내

#### 2단계: Notion 페이지 읽기 + 기존 PRD 분석

- `mcp__notion__notion-fetch`로 페이지 전체 내용 읽기
- 기존 AI PRD 감지 (PRD 템플릿 키워드 존재 여부)
- 기존 PRD가 있으면: 갭 분석 (보완 필요 항목 식별)
- 결과를 `source-analysis.md`에 기록

### Phase 전환 시 요약 기록 규칙

각 Phase 완료 시 workflow.md에 5줄 이내 요약을 추가한다:

```
## Phase {N}: {Phase명} 완료
- **핵심 결정**: {확정된 가장 중요한 결정 1~2개}
- **발견 사항**: {예상과 다르거나 주의 필요한 점}
- **다음 Phase 입력**: {다음 Phase에 전달할 핵심 정보}
- **열린 질문**: {미결 사항, 없으면 "없음"}
```

### Phase 2: 검증 (Validation)

#### 3단계: Clarification 인터뷰

- 모든 불확실한 사항을 사용자에게 질문 (기술적 질문 포함)
- 각 질문에 **추천 답변(recommended answer)** 함께 제시
- 한 번에 3~5개 질문 그룹화
- 질문 카테고리: [범위], [우선순위], [기술], [UX], [데이터], [비자동화]
- 결과를 `clarifications.md`에 기록

#### 3b단계: Notion "Clarification with Claude" 서브페이지 생성

1. Feature 페이지 하위에 서브페이지 생성
    - `mcp__notion__notion-create-pages` 사용
    - parent: Feature 페이지 ID (1단계에서 추출)
    - title: "Clarification with Claude"
2. 콘텐츠: clarifications.md 전체 내용 (카테고리별 Q&A, 추천 답변, 최종 결정)
3. 후속 clarification 추가 시 서브페이지도 업데이트

### Phase 3: 설계 (Design)

#### 4단계: PRD 초안 작성

- `templates/prd-template.md` 기반으로 PRD 작성
- 비즈니스 중심의 기능 요구사항 정의
- 비자동화 항목 식별: 각 FR에 `구현 가능 여부` 표시 (자동화/부분 자동화/수동 필요)
- 수동 필요 항목은 TODO 체크리스트 + 상세 가이드라인 포함
- 결과를 `prd.md`에 기록

#### 4b단계: 디자인 가이드라인 작성 (조건부)

> 새로운 화면이 필요한 FR이 있는 경우에만 수행한다. 기존 화면의 로직 변경만 포함된 경우 이 단계를 건너뛴다.

- PRD의 §7 UI/UX 설계에서 **새로운 화면이 필요한 항목**을 식별
- 화면별로 `templates/design-guideline-template.md` 기반의 디자인 가이드라인 작성
- 가이드라인에 반드시 포함할 항목:
    - 화면 목적 및 사용 맥락
    - 주요 컴포넌트 구성 및 설명
    - Acceptance Criteria (디자인 관점)
    - 인터랙션 및 상태 (hover, active, disabled, error, loading 등)
    - 레이아웃 방향
    - 표시할 데이터 항목 및 형식
    - 반응형 요구사항 (필요 시)
- **상세도 기준**: `figma-make-design` 스킬이 이 가이드라인만으로 디자인 DRAFT를 생성할 수 있는 수준
- 결과를 `design-guidelines.md`에 기록

#### 5단계: PRD 사용자 승인 + Notion 기록

> **⚠️ [절대 규칙] Notion은 되돌리기 어려운 외부 시스템이다. 반드시 사용자의 명시적 승인을 받은 후에만 Notion에 기록한다.**

1. PRD 초안을 터미널에 **전문 출력**하여 사용자 리뷰
2. 사용자 피드백 수집 → 수정 반영 (반복 가능)
3. **사용자가 명시적으로 "승인" 또는 "LGTM"을 선언한 경우에만** Notion에 기록
4. 기존 AI PRD가 있으면 "기존 PRD를 교체할지, 아래에 추가할지" 질문
5. `mcp__notion__notion-update-page`로 페이지 하단에 **prd.md 전문을 그대로** 기록
    - **⚠️ [절대 금지] 임의 축약/요약 금지**: prd.md 파일의 전체 내용을 그대로 Notion에 기록한다. "길어서", "효율성을 위해" 등 어떤 이유로도 내용을 축약하거나 요약하지 않는다. 사용자가 승인한 것은 prd.md 전문이지, 축약본이 아니다.
6. **디자인 가이드라인이 있는 경우**: PRD 내용 하단에 디자인 가이드라인도 함께 Notion에 기록 (design-guidelines.md 전체 내용)

### Phase 4: 분해 (Decomposition)

#### 6단계: Vertical Slice 분해

- **수직 슬라이스**: 각 Story가 사용자 시나리오를 완전히 관통하도록 분해
- **Tracer Bullet**: 가장 핵심적인 1개 Story를 최우선으로 배치 (전체 플로우 검증)
- **점진적 복잡도**: 단순 → 복잡 순서 정렬
- **HITL vs AFK 분류**: 사용자 개입 필요 여부 표시
- **의존성 그래프**: Story 간 선후관계를 Mermaid 다이어그램으로 시각화
- **디자인 필요 여부**: 각 Story에 디자인 필요/불필요 표시 + 해당 design-guidelines.md 화면 참조
- 각 Story는 비즈니스 요구사항 수준으로 작성 (파일명, 함수명 대신 "어떤 기능이 필요한가"로 기술)
- 결과를 `user-stories.md`에 기록

#### 7단계: User Story 사용자 승인 + Notion DB 기록

> **⚠️ [절대 규칙] 반드시 사용자의 명시적 승인을 받은 후에만 Notion DB에 기록한다.**

1. 분해된 User Story 전체 목록을 터미널에 출력 (Story별: 제목, AC, 의존성, HITL/AFK, 디자인 필요 여부)
2. 의존성 그래프 (Mermaid)를 함께 제시
3. 사용자 피드백 수집 → Story 추가/수정/삭제/순서 변경 반영 (반복 가능)
4. **승인 즉시 `user-stories.md` 상태를 APPROVED로 업데이트** (Notion 기록 전에 로컬 md 파일 먼저 저장)
5. **사용자가 명시적으로 "승인"을 선언한 경우에만** Notion DB에 페이지 생성

**Notion DB 스키마:**

User Story DB (`collection://3063da37-7d34-819c-b672-000bb80d89eb`):

```
mcp__notion__notion-create-pages
  parent: { data_source_id: "collection://3063da37-7d34-819c-b672-000bb80d89eb" }
  pages: [{
    properties: {
      "UserStory": "US-001: {Story Title}",
      "Features": ["{Feature 페이지 URL}"],
      "Status": "To Do"
    },
    content: "## User Story\n\nAs a ... I want to ... so that ...\n\n## Acceptance Criteria\n..."
  }]
```

- Feature 페이지와 `Features` Relation으로 자동 양방향 연결
- Notion 생성 후 `user-stories.md`에 Story ID ↔ Notion Page ID 매핑 추가

### Phase 5: 디자인 Draft 생성 (조건부)

> 디자인이 필요한 User Story가 있는 경우에만 수행한다.

#### 8단계: User Story별 디자인 DRAFT 생성

`design-guidelines.md`가 존재하고, 디자인이 필요한 User Story가 있는 경우:

1. **Figma 파일 URL 입력 요청**: 사용자에게 디자인 DRAFT를 생성할 Figma 파일 URL을 요청한다
    - "디자인 DRAFT를 생성할 Figma 파일 URL을 입력해주세요. (예: https://figma.com/design/xxx/파일명)"
    - 사용자가 URL을 제공하면 fileKey를 추출하여 저장
    - **디자인 시스템 Setup 확인**: `figma-make-design` 스킬의 `generated/design-system.md` 존재 여부 체크
    - design-system.md가 없으면: "디자인 시스템 Setup이 필요합니다. 먼저 Setup을 진행하겠습니다." 안내 후 Setup 모드 실행
2. **디자인이 필요한 Story 목록 식별**: `user-stories.md`에서 "디자인 필요: 필요" 표시된 Story를 필터링
3. **각 Story별로 디자인 DRAFT 생성**:
    - `figma-make-design` 스킬 호출
    - 입력: `design-guidelines.md`의 해당 화면 가이드라인 + `prd.md` + 해당 User Story
    - Figma 대상 파일: 1단계에서 입력받은 Figma 파일 URL 사용
    - 산출물: Figma DRAFT URL, 디자인 결정 사항, 참고 노트
    - `design-draft-log.md`에 Story별로 기록:
        - Story ID + 제목
        - DRAFT Figma URL
        - 디자인 결정 사항
        - 상태: DRAFT 생성 완료 / 리뷰 중 / 수정 중 / 확정
4. **사용자에게 DRAFT 리뷰 요청**

#### 9단계: 디자인 DRAFT 리뷰 및 최종 확정

1. **사용자 리뷰 + 디자이너 코멘트 수집**:
    - 사용자가 DRAFT를 리뷰하고 피드백 제공
    - 디자이너의 코멘트가 있으면 수집
2. **피드백 반영** (반복 가능):
    - 피드백이 있으면 `figma-make-design`으로 DRAFT 수정
    - `design-draft-log.md` 업데이트 (수정 이력, 반영 내용)
3. **DRAFT 확정**:
    - 사용자가 "확정" 선언 시 해당 Story의 디자인 상태를 "확정"으로 업데이트
    - `design-draft-log.md`와 `user-stories.md` 모두 업데이트
4. **디자인 Draft 문서 작성 + Notion 기록**:

    > **⚠️ [절대 규칙] 디자인 Draft 확정 후 반드시 디자인 Draft 문서를 작성하여 Notion에 기록한다. Figma URL만 기록하는 것은 절대 금지.**

    확정된 각 Story에 대해 `templates/design-draft-document-template.md` 기반으로 디자인 Draft 문서를 작성한다. 이 문서의 목적은 **디자이너가 Draft를 이해하고 최종 디자인을 제작할 수 있도록** 충분한 맥락을 제공하는 것이다.

    **문서에 반드시 포함할 내용:**
    - **디자인 배경**: 이 화면이 왜 필요한지 (PRD에서 발췌), 대상 사용자, 주요 사용 시나리오
    - **디자인 결정 과정**: Claude가 이 디자인을 선택한 이유. 레이아웃/컴포넌트/인터랙션별로 "왜 이렇게 했는지"와 "검토했지만 선택하지 않은 대안"을 기록
    - **PRD 요구사항 대응**: PRD의 각 요구사항이 디자인에 어떻게 반영되었는지 대응표
    - **Clarification 기반 결정**: 3단계 검증에서 확인된 디자인 관련 결정사항 (어떤 질문에 대해 어떤 결정이 내려졌는지)
    - **디자이너 참고사항**: 의도적으로 생략한 부분, 디자인 시스템 활용 내역, 반응형/접근성 고려사항
    - **수정 이력**: 사용자 피드백으로 수정된 내역

    **Notion 기록 절차:**
    a. 디자인 Draft 문서를 터미널에 출력하여 사용자 리뷰
    b. 사용자가 "승인"하면 Feature 페이지 하위에 서브페이지로 생성
        - `mcp__notion__notion-create-pages` 사용
        - parent: Feature 페이지 ID
        - title: "Design Draft: {화면명}"
    c. 디자인 Draft 문서 전문을 Notion 서브페이지에 기록 (축약 금지)
    d. 로컬에도 `design-draft-document.md`로 저장

5. **모든 Story 처리 완료 시 최종 보고**:
    - 전체 Story 목록 및 디자인 DRAFT Figma 링크
    - 디자인 Draft 문서 Notion 페이지 링크
    - 확정된 Story / 리뷰 중인 Story 상태 요약

### Phase 6: 핸드오프 동기화 (Handoff Sync)

> 디자인 Draft가 확정된 User Story가 있는 경우에만 수행한다.

#### 10단계: US별 Notion 핸드오프 동기화

9단계에서 확정된 디자인을 각 US의 Notion 페이지에 반영한다. 개발자가 US 페이지 하나만 열어도 Figma 링크, 기술 정의서, 디자인 배경 문서를 모두 확인할 수 있도록 만드는 것이 목표다.

**사전 조건 확인:**
- `design-draft-log.md`에서 상태가 "확정"인 Story 목록 추출
- `user-stories.md`에서 각 Story의 Notion Page ID 확인
- 9단계에서 생성된 "Design Draft: {화면명}" Notion 서브페이지 URL 확인

**각 확정된 US에 대해 순서대로 처리:**

1. **기술 정의서 작성**

    `prd.md` + `design-guidelines.md` + `design-draft-log.md` + 해당 US의 AC를 종합하여 기술 정의서를 작성한다.

    기술 정의서에 반드시 포함할 항목:

    | 항목 | 내용 |
    |------|------|
    | **화면 개요** | 화면 목적, 진입 경로, 주요 사용 시나리오 |
    | **UI 컴포넌트 명세** | 각 컴포넌트 이름, 역할, 상태(default/hover/active/disabled/loading/error) |
    | **인터랙션 명세** | 사용자 액션별 시스템 반응 (클릭, 입력, 제출, 취소 등) |
    | **데이터 명세** | 화면에 표시되는 데이터 항목, 타입, 출처(API 엔드포인트 또는 상태) |
    | **유효성 검사 규칙** | 입력 필드별 validation 조건 및 에러 메시지 |
    | **예외 케이스** | 빈 상태(Empty State), 에러 상태, 로딩 상태, 권한 없음 상태 처리 방식 |
    | **AC 대응표** | US의 각 Acceptance Criteria 항목이 어떤 UI 요소로 구현되었는지 매핑 |
    | **접근성 고려사항** | aria-label 필요 여부, 키보드 탐색, 색상 대비 등 |

    작성 후 로컬 `handoff-sync-log.md`에 해당 US의 기술 정의서 초안을 저장한다.

2. **사용자 검토 요청**

    기술 정의서를 터미널에 출력하여 사용자가 확인할 수 있도록 한다:
    - 누락된 컴포넌트나 인터랙션이 있는지
    - API 엔드포인트 정보를 추가해야 하는지
    - 개발팀과 사전에 협의된 내용 반영 여부

    피드백이 있으면 수정 후 재확인한다.

3. **Notion US 페이지 업데이트**

    > **⚠️ [절대 규칙] 사용자 검토 완료 후에만 Notion에 기록한다.**

    `mcp__notion__notion-update-page`로 해당 US의 Notion 페이지에 아래 내용을 추가한다:

    ```
    ---
    ## 🎨 Figma 완성본

    [Figma 링크 → {화면명}]({Figma URL})

    > 위 링크는 확정된 디자인 Draft입니다.
    > 디자이너 최종 검수 후 프로덕션 디자인으로 전환될 예정입니다.

    ---
    ## 📐 기술 정의서

    ### 화면 개요
    {화면 목적 및 진입 경로}

    ### UI 컴포넌트 명세
    | 컴포넌트 | 역할 | 상태 |
    |---------|------|------|
    | ...     | ...  | ...  |

    ### 인터랙션 명세
    | 사용자 액션 | 시스템 반응 |
    |-----------|-----------|
    | ...       | ...       |

    ### 데이터 명세
    | 항목 | 타입 | 출처 |
    |-----|------|------|
    | ... | ...  | ...  |

    ### 유효성 검사 규칙
    {입력 필드별 validation 조건}

    ### 예외 케이스
    | 상태 | 처리 방식 |
    |-----|---------|
    | 빈 상태 | ... |
    | 에러 상태 | ... |
    | 로딩 상태 | ... |

    ### AC 대응표
    | Acceptance Criteria | 구현 UI 요소 |
    |--------------------|------------|
    | ...                | ...        |

    ### 접근성 고려사항
    {aria-label, 키보드 탐색 등}

    ---
    ## 📎 디자인 Draft 문서

    → [Design Draft: {화면명}]({Step 9에서 생성된 Notion 서브페이지 URL})

    디자인 배경, 결정 과정, 디자이너 참고사항이 포함된 문서입니다.
    ```

    - **⚠️ [절대 금지]** 기술 정의서 내용을 축약하거나 일부만 기록하는 것. 전문을 그대로 기록한다.
    - **⚠️ [절대 금지]** Design Draft 문서 링크를 누락하는 것. Step 9의 Notion 서브페이지 URL을 반드시 연결한다.

4. **`handoff-sync-log.md` 업데이트**

    각 US 처리 완료 후 아래 형식으로 기록한다:

    ```markdown
    ## {US-ID}: {Story 제목}
    - Notion Page ID: {page_id}
    - Figma 완성본 URL: {figma_url}
    - 기술 정의서: 작성 완료
    - Design Draft 문서 링크: {notion_subpage_url}
    - Notion 업데이트: ✅ 완료 / ⏳ 대기
    - 처리 일시: {YYYY-MM-DD HH:mm}
    ```

5. **전체 동기화 완료 보고**

    모든 US 처리 후 최종 보고:
    ```
    ## 핸드오프 동기화 완료 ✅

    | US | Figma | 기술 정의서 | Design Draft 링크 | Notion 상태 |
    |----|-------|-----------|-----------------|------------|
    | US-001 | ✅ | ✅ | ✅ | ✅ |
    | US-002 | ✅ | ✅ | ✅ | ✅ |
    ...

    → 개발자가 각 US 페이지에서 Figma 링크 + 기술 정의서 + 디자인 Draft 문서를 바로 확인할 수 있습니다.
    ```

---

## Notion 기록 위치 요약

| 단계 | 기록 위치 | 내용 |
|------|-----------|------|
| 3b단계 | 사용자가 입력한 Notion 페이지의 **서브페이지** | "Clarification with Claude" 제목의 Q&A 기록 |
| 5단계 | 사용자가 입력한 Notion 페이지 **하단** | PRD 전문 + 디자인 가이드라인 (있는 경우) |
| 7단계 | **User Story DB** (별도 Notion 데이터베이스) | 각 Story가 개별 페이지로 생성, Feature 페이지와 Relation 연결 |
| 9단계 | 사용자가 입력한 Notion 페이지의 **서브페이지** | "Design Draft: {화면명}" 제목의 디자인 Draft 문서 (배경, 결정 과정, 디자이너 참고사항) |
| 10단계 | **각 User Story의 Notion 페이지 본문** | Figma 완성본 URL + 기술 정의서 전문 + Design Draft 문서 링크 (9단계 서브페이지 연결) |

---

## Anti-Rationalization (자기합리화 방어)

자주 발생하는 지름길 생각과 그 문제점을 정리한다.

| 지름길 생각                        | 실제 문제                                                |
| ---------------------------------- | -------------------------------------------------------- |
| "기존 AI PRD를 그대로 쓰면 빠르다" | 불완전한 PRD는 개발자와의 소통 비용을 증가시킨다         |
| "단계를 건너뛰면 효율적이다"       | 이전 단계 산출물 없이 다음 단계 진행은 재작업을 유발한다 |
| "Notion에 요약만 써도 된다"        | PRD 축약 기록은 나중에 해석 불가. 전문을 기록해야 한다   |
| "Figma 링크만 달아줘도 충분하다"   | 개발자는 Figma를 열지 않을 수 있다. 기술 정의서가 없으면 커뮤니케이션 비용이 다시 올라간다 |
| "Design Draft 문서 링크는 나중에"  | 링크 누락 시 디자인 배경 컨텍스트가 단절된다. 10단계에서 반드시 연결한다 |

---

## Red Flags (경고 신호)

아래 신호가 보이면 즉시 중단하고 워크플로우로 돌아간다.

- source-analysis.md 없이 clarification 시작
- Notion 기록 전 사용자 승인 없음
- PRD를 축약하여 기록 (전문 필수)
- Phase 전환 요약 없이 다음 Phase 진입
- Design Draft가 확정되지 않은 상태에서 10단계 진입
- Figma URL만 기록하고 기술 정의서 없이 핸드오프 완료 선언
- handoff-sync-log.md 없이 US별 동기화 현황 추적

---

## Verification Checklist (검증 체크리스트)

모든 단계 완료 후 아래 항목을 체크한다. 하나라도 미충족이면 완료가 아니다.

- [ ] prd.md 전문이 Notion에 기록됨
- [ ] 모든 단계 산출물 파일 존재 (source-analysis, clarifications, prd, user-stories)
- [ ] User Story DB에 Notion 페이지 생성됨
- [ ] 각 Phase 전환 시 요약 기록됨
- [ ] 디자인이 필요한 Story의 DRAFT가 생성됨 (해당되는 경우)
- [ ] 디자인 Draft 문서가 Notion 서브페이지로 기록됨 (해당되는 경우)
- [ ] 확정된 각 US의 Notion 페이지에 Figma 링크 + 기술 정의서 전문 + Design Draft 문서 링크 기록됨 (해당되는 경우)
- [ ] handoff-sync-log.md에 모든 US 상태가 "완료"로 업데이트됨 (해당되는 경우)

---

## 핵심 규칙

1. **[절대 규칙] 단계 완료 게이트 — 이전 단계 산출물 없이 다음 단계 진행 절대 금지**: 각 단계는 반드시 순차 실행한다. 다음 단계로 넘어가기 전에 해당 단계의 산출물 파일이 워크플로우 디렉토리에 기록 완료되어야 한다. 산출물 체크리스트: 1단계→워크플로우 디렉토리+workflow.md, 2단계→source-analysis.md, 3단계→clarifications.md
2. **Notion 기록 전 승인 필수**: PRD든 User Story든 Notion에 기록하기 전에 반드시 사용자의 명시적 승인("승인", "LGTM")을 받는다. 승인 없이 Notion API를 호출하는 것은 절대 금지
3. **PRD 축약 금지**: prd.md 전문을 그대로 Notion에 기록한다. 임의 축약/요약 절대 금지
4. **Vertical Slice**: 각 Story가 사용자 시나리오를 완전히 관통하도록 분해
5. **Tracer Bullet First**: 가장 핵심 Story를 최우선 배치하여 전체 플로우를 검증
6. **디자인 DRAFT는 참고용**: Claude Code가 생성한 디자인 DRAFT는 디자이너가 최종 디자인을 제작할 때 참고하는 초안이다. DRAFT를 최종본으로 간주하지 않는다
7. **디자인 가이드라인 Notion 동기화**: design-guidelines.md 내용은 반드시 Notion PRD 문서 하단에도 기록하여, 디자이너와 팀원이 Notion에서 확인할 수 있도록 한다
8. **[절대 규칙] 기술 정의서 축약 금지**: 10단계에서 Notion US 페이지에 기술 정의서를 기록할 때 전문을 그대로 붙여넣는다. "개발자가 알아서 보겠지", "Figma 링크만 있어도 충분하다"는 판단으로 임의 축약하거나 링크만 남기는 것은 절대 금지
9. **[절대 규칙] Design Draft 문서 링크 필수**: 10단계 핸드오프 시 기술 정의서와 함께 반드시 9단계에서 생성한 Design Draft Notion 서브페이지 링크를 US 페이지에 기록한다. 링크 없이 핸드오프 완료를 선언하지 않는다
