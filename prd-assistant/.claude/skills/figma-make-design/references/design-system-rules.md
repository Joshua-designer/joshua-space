# 디자인 시스템 적용 규칙

이 문서는 use_figma로 디자인을 작성할 때 디자인 시스템 컴포넌트와 Variables를 올바르게 적용하는 규칙을 정의한다.

---

## 컴포넌트 사용 규칙

### Import 방법

**단일 컴포넌트:**

```javascript
const component = await figma.importComponentByKeyAsync('componentKey');
const instance = component.createInstance();
parentFrame.appendChild(instance);
```

**컴포넌트 세트 (Variants 포함):**

```javascript
const componentSet = await figma.importComponentSetByKeyAsync('componentSetKey');
// variant 이름으로 찾기
const variant = componentSet.findChild((n) => n.name === 'Type=Primary, Size=Medium');
const instance = variant.createInstance();
parentFrame.appendChild(instance);
```

### Variant 선택 방법

- design-system.md의 컴포넌트 목록에서 사용 가능한 variant 확인
- variant 이름 형식: `Property=Value, Property=Value` (쉼표+공백 구분)
- 정확한 이름 매칭 필수 — 추측 금지

### 텍스트 오버라이드 방법

**올바른 방법 (setProperties):**

```javascript
const instance = variant.createInstance();
// 컴포넌트의 텍스트 프로퍼티 키를 사용
instance.setProperties({
    'Label#12345:0': '버튼 텍스트',
    'Description#67890:0': '설명 텍스트'
});
```

**잘못된 방법 (직접 수정):**

```javascript
// ❌ 금지 — 컴포넌트 인스턴스의 내부 텍스트를 직접 수정하면 안 됨
const textNode = instance.findOne((n) => n.type === 'TEXT');
textNode.characters = '새 텍스트'; // 금지
```

### 존재하지 않는 컴포넌트 처리

1. design-system.md에서 컴포넌트 검색
2. 없으면 사용자에게 보고 (대안 제시)
3. 사용자가 직접 빌드를 선택하면 기본 프레임으로 구성:
    ```javascript
    const frame = figma.createFrame();
    frame.layoutMode = 'HORIZONTAL';
    frame.counterAxisAlignItems = 'CENTER';
    // Variables 바인딩은 동일하게 적용
    ```

---

## Variables 바인딩 규칙

### 색상 바인딩

**프레임/도형 배경색:**

```javascript
const colorVar = await figma.variables.importVariableByKeyAsync('variableKey');
// fills 속성에 Variable 바인딩
const fills = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', colorVar);
node.fills = [fills];
```

**텍스트 색상:**

```javascript
const textColorVar = await figma.variables.importVariableByKeyAsync('variableKey');
const textFills = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', textColorVar);
textNode.fills = [textFills];
```

**테두리 색상:**

```javascript
const borderColorVar = await figma.variables.importVariableByKeyAsync('variableKey');
const strokes = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', borderColorVar);
node.strokes = [strokes];
```

### Spacing 바인딩

```javascript
const spacingVar = await figma.variables.importVariableByKeyAsync('variableKey');
// padding
node.setBoundVariable('paddingTop', spacingVar);
node.setBoundVariable('paddingRight', spacingVar);
node.setBoundVariable('paddingBottom', spacingVar);
node.setBoundVariable('paddingLeft', spacingVar);
// gap
node.setBoundVariable('itemSpacing', spacingVar);
```

### Typography 바인딩

- 텍스트 스타일이 있으면 `textStyleId`로 적용
- Variables 기반 타이포그래피는 fontSize, lineHeight 등에 개별 바인딩

### 바인딩 판단 기준

| Variables 존재 여부              | 행동                                      |
| -------------------------------- | ----------------------------------------- |
| design-system.md에 Variable 있음 | **반드시** setBoundVariable 사용          |
| Variable 없음 (리터럴만)         | 리터럴 값 허용, 주석으로 "토큰 없음" 명시 |
| 불확실                           | search_design_system으로 재탐색 후 판단   |

---

## Auto Layout 규칙

### 기본 설정 패턴

```javascript
const frame = figma.createFrame();
// 레이아웃 방향
frame.layoutMode = 'VERTICAL'; // 또는 "HORIZONTAL"
// 정렬
frame.primaryAxisAlignItems = 'MIN'; // MIN | CENTER | MAX | SPACE_BETWEEN
frame.counterAxisAlignItems = 'MIN'; // MIN | CENTER | MAX
// 크기
frame.resize(1440, 100); // 초기 크기 설정
frame.layoutSizingHorizontal = 'FIXED'; // FIXED | FILL | HUG
frame.layoutSizingVertical = 'HUG'; // FIXED | FILL | HUG
```

### 중요: sizing은 appendChild 이후에 설정

```javascript
// ✅ 올바른 순서
parentFrame.appendChild(childFrame);
childFrame.layoutSizingHorizontal = 'FILL'; // appendChild 이후

// ❌ 잘못된 순서
childFrame.layoutSizingHorizontal = 'FILL'; // appendChild 이전 — 무시될 수 있음
parentFrame.appendChild(childFrame);
```

### Sizing 옵션

| 옵션    | 의미                  | 사용 시점                    |
| ------- | --------------------- | ---------------------------- |
| `FIXED` | 고정 크기             | 래퍼 프레임의 width          |
| `FILL`  | 부모의 남은 공간 채움 | 섹션 컨테이너의 가로         |
| `HUG`   | 콘텐츠에 맞춤         | 래퍼 프레임의 height, 텍스트 |

---

## 섹션 빌드 패턴

### 래퍼 프레임 생성 (G-3)

```javascript
const page = figma.currentPage;
const wrapper = figma.createFrame();
wrapper.name = 'Page Wrapper';
wrapper.layoutMode = 'VERTICAL';
wrapper.resize(1440, 100);
wrapper.layoutSizingHorizontal = 'FIXED';
wrapper.layoutSizingVertical = 'HUG';
// 배경색 Variable 바인딩 (있는 경우)
const bgVar = await figma.variables.importVariableByKeyAsync('bgVariableKey');
const bgFill = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', bgVar);
wrapper.fills = [bgFill];
return { wrapperId: wrapper.id };
```

### 섹션 빌드 (G-4, 섹션당 1회 호출)

```javascript
const wrapper = await figma.getNodeByIdAsync('WRAPPER_ID');

// 섹션 컨테이너
const section = figma.createFrame();
section.name = 'Header Section';
section.layoutMode = 'HORIZONTAL';
wrapper.appendChild(section);
section.layoutSizingHorizontal = 'FILL'; // appendChild 이후!
section.layoutSizingVertical = 'HUG';

// 디자인 시스템 컴포넌트 import
const buttonSet = await figma.importComponentSetByKeyAsync('BUTTON_KEY');
const primaryBtn = buttonSet.findChild((n) => n.name === 'Type=Primary, Size=Medium');
const btnInstance = primaryBtn.createInstance();
section.appendChild(btnInstance);
btnInstance.setProperties({ 'Label#12345:0': '시작하기' });

// spacing Variable 바인딩
const gapVar = await figma.variables.importVariableByKeyAsync('GAP_KEY');
section.setBoundVariable('itemSpacing', gapVar);

return { sectionId: section.id };
```

---

## 20KB 제한 대응 전략

### 분할 기준

- 컴포넌트 인스턴스 5개 이하 = 1회 호출
- 5개 초과 또는 복잡한 중첩 = 하위 그룹으로 분할
- 반복 패턴 (리스트, 그리드) = 그룹 단위로 분할

### 분할 방법

```
섹션 A (use_figma 1회)
├── 헤더 컨테이너
├── 버튼 그룹

섹션 B (use_figma 1회)
├── 카드 리스트 (1~3번째)

섹션 C (use_figma 1회)
├── 카드 리스트 (4~6번째)
├── 페이지네이션
```

### 호출 간 연결

- 각 호출에서 생성된 노드 ID를 반환
- 다음 호출에서 `figma.getNodeByIdAsync(ID)`로 참조
- 새 노드는 항상 기존 부모 안에 `appendChild`로 추가

---

## 주의사항

- 위 코드 스니펫은 패턴 예시이며, 실제 variableKey와 componentKey는 design-system.md에서 참조한다
- 모든 코드는 use_figma 도구의 JavaScript 실행 환경에서 동작한다
- 에러 발생 시 Error Recovery 프로토콜을 따른다 (STOP → 에러 읽기 → 확인 → 수정 → 재시도)
