# 품질 이슈 및 대응 가이드

이 문서는 기존 `figma-generate-design` 공식 skill에서 발생하는 품질 이슈의 근본 원인과 대응 방법을 정의한다.

---

## 이슈 #1: Code Connect 미설정 시 이미지 추측 문제

### 증상

- get_code 툴이 빈 결과를 반환하거나 내부적으로 실패한다
- LLM이 get_image(스크린샷)만으로 디자인을 추측한다
- 폰트, 컬러, 간격이 85~90% 틀리는 결과가 나온다

### 원인

- Code Connect는 Organization/Enterprise 플랜에서만 정상 작동한다
- Free/Pro 플랜에서는 get_code_connect_map이 빈 결과를 반환한다
- Code Connect 없이는 컴포넌트 → 코드 매핑 정보가 없어 이미지 기반 추측으로 폴백한다

### 감지 방법

- Setup 모드 S-1단계에서 `mcp__figma__get_code_connect_map` 호출
- 빈 배열 또는 에러 응답 = Code Connect 미설정

### 대응 로직

1. get_code_connect_map 호출
2. 빈 결과 시 사용자에게 경고:
   "⚠️ Code Connect가 설정되지 않아 컴포넌트 → 코드 매핑을 사용할 수 없습니다.
   Organization/Enterprise 플랜 + Code Connect 설정을 권장합니다.
   이미지 기반 추측 모드로 전환되어 퀄리티가 낮아질 수 있습니다."
3. 진행 여부 사용자 확인
4. 진행하는 경우: search_design_system에 더 의존하여 컴포넌트 탐색

### 참조

- Figma 포럼: https://forum.figma.com/report-a-problem-6/figma-mcp-can-t-get-good-results-have-tried-many-things-41861
- Code Connect 문서: https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/

---

## 이슈 #2: 컴포넌트 Hallucination

### 증상

- AI가 디자인 시스템에 없는 컴포넌트를 임의로 만들어낸다
- 존재하지 않는 componentKey로 importComponentByKeyAsync를 호출하여 런타임 에러 발생
- 생성된 디자인에 깨진 인스턴스가 표시된다

### 원인

- 디자인 시스템을 검색하지 않고 컴포넌트 이름을 추측한다
- 일반적인 UI 패턴 (Button, Card 등)이 모든 디자인 시스템에 있을 것이라고 가정한다
- Code Connect가 없으면 더 빈번하게 발생한다

### 감지 방법

- Setup 모드에서 design-system.md에 기록된 컴포넌트만 "확인됨" 상태
- Generate 모드에서 design-system.md에 없는 컴포넌트를 import하려고 하면 차단

### 대응 로직

1. Setup 모드에서 모든 사용 가능한 컴포넌트를 design-system.md에 기록
2. Generate 모드에서는 design-system.md에 있는 컴포넌트만 import 허용
3. 필요한 컴포넌트가 없으면 사용자에게 보고:
   "'{컴포넌트명}'이 디자인 시스템에 존재하지 않습니다.
   대안: (a) 기본 프레임으로 직접 빌드 (b) 유사 컴포넌트 '{유사명}' 사용 (c) 사용자 지정"
4. 절대로 확인되지 않은 componentKey로 import 시도하지 않는다

---

## 이슈 #3: MCP 툴 호출 순서 미준수

### 증상

- 디자인 시스템 탐색 없이 바로 use_figma를 호출하여 컨텍스트 누락
- 검증 단계를 건너뛰어 품질 문제를 발견하지 못함
- 순서가 뒤바뀌어 이전 단계의 결과를 활용하지 못함

### 원인

- LLM이 최단 경로로 결과를 생성하려 하여 중간 단계를 건너뛴다
- 에러가 발생해도 즉시 재시도하여 문제를 반복한다

### 올바른 순서 (Setup 모드)

1. get_code_connect_map → CC 가용성 판단
2. get_metadata → 파일 구조 파악
3. search_design_system → 컴포넌트/Variables 탐색
4. get_variable_defs → 토큰 정의 수집
5. design-system.md 생성

### 올바른 순서 (Generate 모드)

1. design-system.md 읽기
2. 화면 설계 (섹션 분할, 컴포넌트 매핑)
3. use_figma → 래퍼 프레임 생성 (1회)
4. use_figma → 섹션별 빌드 (섹션당 1회)
5. get_screenshot → 섹션별 검증
6. get_metadata → Variables 바인딩 검증

### 위반 시 결과

- 컴포넌트 Hallucination 증가 (탐색 스킵)
- 하드코딩된 값 사용 (Variables 수집 스킵)
- 품질 문제 미발견 (검증 스킵)

---

## 이슈 #4: 하드코딩된 hex/px 값 사용

### 증상

- Variables가 존재하는데도 `#3B82F6`, `16px` 같은 리터럴 값을 직접 사용한다
- 디자인 시스템과 연동되지 않아 토큰 변경 시 수동 업데이트 필요
- 디자인 파일의 일관성이 깨진다

### 원인

- Variables 탐색을 하지 않거나, 탐색 결과를 use_figma 코드에 반영하지 않는다
- setBoundVariable API 사용법을 모르거나 잘못 사용한다
- "빠르게 결과 내기" 위해 리터럴 값을 사용한다

### 대응 로직

1. Setup 모드에서 Variables를 카테고리별로 수집하여 design-system.md에 기록:
    - color: Color/Primary/Blue → variableKey
    - spacing: Spacing/Gap/Medium → variableKey
    - typography: Text/Heading/H1 → variableKey
2. Generate 모드에서 use_figma 코드 작성 시:
    - 모든 색상 → `setBoundVariable()` 또는 `figma.variables.setBoundVariableForPaint()` 사용
    - spacing → Variables 바인딩 (가능한 경우)
    - Variables가 없는 값만 리터럴 허용 (주석으로 "토큰 없음" 명시)
3. G-5 검증에서 get_metadata로 boundVariables 속성 확인

### 검증 방법

- get_metadata 응답에서 boundVariables 필드 확인
- Variables가 존재하는데 바인딩 안 된 속성 → FAIL → 수정 후 재검증
