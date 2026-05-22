# MCP 도구 상세 가이드

이 스킬에서 사용하는 Figma MCP 도구의 상세 사용법과 주의사항을 정리한다.
도구 이름의 전체 형식은 `mcp__figma__<도구명>`이다.

---

## 읽기 전용 도구

### get_metadata

- **용도**: 노드 트리 구조 조회 (sparse XML 형식)
- **사용 단계**: Setup S-1, S-2 / Generate G-5
- **핵심 파라미터**: fileKey, nodeId
- **반환값**: 노드 ID, 이름, 타입, 위치, 크기 정보
- **주의사항**:
    - 대규모 디자인에서 전체 컨텍스트 대신 이 도구로 구조만 파악
    - INSTANCE 타입 노드에서 componentId를 추출하여 컴포넌트 식별 가능
    - 검증 시 boundVariables 속성으로 Variables 바인딩 여부 확인

### get_screenshot

- **용도**: 노드/페이지 스크린샷 캡처
- **사용 단계**: Setup S-1 / Generate G-5
- **핵심 파라미터**: fileKey, nodeId
- **주의사항**:
    - 전체 페이지 스크린샷은 텍스트 잘림, 색상 오류를 숨길 수 있다
    - 섹션별로 개별 캡처하는 것이 더 정확하다
    - 토큰 사용량이 크므로 필요할 때만 호출

### get_variable_defs

- **용도**: 노드에 바인딩된 Variables 정의 조회
- **사용 단계**: Setup S-3
- **핵심 파라미터**: fileKey, nodeId
- **반환값**: 색상, spacing, typography 등 Variables 정의
- **주의사항**:
    - `getLocalVariableCollectionsAsync()`는 로컬 변수만 반환 — 라이브러리 변수 미포함
    - 라이브러리 Variables는 `search_design_system`의 `includeVariables: true`로 조회

### get_code_connect_map

- **용도**: Code Connect 매핑 확인 (컴포넌트 → 코드)
- **사용 단계**: Setup S-1
- **핵심 파라미터**: fileKey, nodeId, clientFrameworks, clientLanguages
- **반환값**: componentName, source, snippet, version, label
- **주의사항**:
    - Organization/Enterprise 플랜 전용
    - Free/Pro 플랜에서는 빈 결과 반환 — 이슈 #1 참조
    - 빈 결과 시 반드시 사용자에게 알림

---

## 검색/탐색 도구

### search_design_system

- **용도**: 디자인 라이브러리에서 컴포넌트, Variables, 스타일 검색
- **사용 단계**: Setup S-2, S-3
- **핵심 파라미터**:
    - `query`: 검색어 (영문 권장)
    - `fileKey`: 대상 파일
    - `includeComponents`: 컴포넌트 포함 여부
    - `includeVariables`: Variables 포함 여부
    - `includeStyles`: 스타일 포함 여부
- **검색 팁**:
    - 짧고 단순한 쿼리 사용 ("Button", "gray", "spacing")
    - 여러 쿼리를 병렬로 실행하여 폭넓게 탐색
    - 단수/복수, 영문/한글 변형 모두 시도
    - "검색 결과 없음" ≠ "존재하지 않음" — 다른 키워드로 재시도
- **주의사항**:
    - 이 도구의 결과만이 "확인된 컴포넌트"의 근거가 된다
    - 결과에 없는 componentKey로 import 시도 금지 (이슈 #2)

---

## 쓰기 도구

### use_figma

- **용도**: Plugin API JavaScript 실행 (캔버스에 디자인 작성)
- **사용 단계**: Generate G-3, G-4
- **핵심 특성**:
    - **20KB 응답 제한** — 복잡한 섹션은 분할 호출
    - 섹션당 1회 호출 원칙
    - 반환값으로 생성된 노드의 ID를 받아야 다음 호출에서 참조 가능
- **기술 제약**:
    - **크로스 콜 reparent 금지**: 한 호출에서 만든 노드를 다른 호출에서 이동하면 실패
    - **sizing은 appendChild 후**: `layoutSizingHorizontal = "FILL"`은 부모에 추가한 후 설정
    - **텍스트 오버라이드**: `setProperties()`로 수행, `node.characters` 직접 수정 금지
    - **폰트 로드 필수**: `figma.loadFontAsync()` 호출 후 텍스트 조작
    - **폰트 이름 주의**: "Semi Bold" (공백 포함), "SemiBold" (붙여쓰기) 등 정확히 매칭
- **Variables 바인딩 방법**:

    ```javascript
    // 색상 바인딩
    const colorVar = await figma.variables.importVariableByKeyAsync('variableKey');
    figma.variables.setBoundVariableForPaint(node, 'fills', 0, colorVar);

    // spacing 바인딩
    const spacingVar = await figma.variables.importVariableByKeyAsync('variableKey');
    node.setBoundVariable('paddingLeft', spacingVar);
    node.setBoundVariable('paddingRight', spacingVar);

    // 컴포넌트 import
    const componentSet = await figma.importComponentSetByKeyAsync('componentKey');
    const variant = componentSet.findChild((n) => n.name === 'Type=Primary, Size=Medium');
    const instance = variant.createInstance();
    ```

### generate_figma_design (보조적 사용)

- **용도**: 웹앱 라이브 UI를 스크린샷하여 Figma 디자인 레이어로 변환
- **사용 단계**: Generate 모드에서 웹앱 병렬 워크플로우 시에만
- **주의사항**:
    - Remote MCP 서버에서만 사용 가능
    - 이 도구의 출력은 참조용 — use_figma로 다시 빌드해야 디자인 시스템 연동 가능
    - 사용 후 레퍼런스 결과물은 삭제

---

## Build vs Import 구분

| 직접 빌드 (figma.createFrame 등) | 디자인 시스템 Import              |
| -------------------------------- | --------------------------------- |
| 페이지 래퍼 프레임               | 컴포넌트 (Button, Card, Input 등) |
| 섹션 컨테이너                    | Variables (색상, spacing, radius) |
| 레이아웃 그리드                  | 텍스트 스타일 (heading, body)     |
| 구분선, 배경                     | 이펙트 스타일 (shadow)            |

**Golden Rule**: 디자인 시스템에 존재하는 것은 반드시 import하여 사용한다.
직접 빌드는 구조적 컨테이너에만 한정한다.
