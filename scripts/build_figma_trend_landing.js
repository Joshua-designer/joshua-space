const channel = process.argv[2] || "e1ao6fqx";
const wsUrl = process.argv[3] || "ws://127.0.0.1:3055";

const colors = {
  ink: { r: 0.11, g: 0.13, b: 0.16, a: 1 },
  slate: { r: 0.35, g: 0.39, b: 0.45, a: 1 },
  line: { r: 0.86, g: 0.88, b: 0.9, a: 1 },
  paper: { r: 0.99, g: 0.99, b: 0.98, a: 1 },
  warm: { r: 0.97, g: 0.95, b: 0.9, a: 1 },
  mint: { r: 0.91, g: 0.97, b: 0.94, a: 1 },
  sky: { r: 0.91, g: 0.95, b: 1, a: 1 },
  green: { r: 0.1, g: 0.29, b: 0.22, a: 1 },
  greenSoft: { r: 0.82, g: 0.91, b: 0.84, a: 1 },
  amber: { r: 0.96, g: 0.77, b: 0.39, a: 1 },
  white: { r: 1, g: 1, b: 1, a: 1 },
};

const socket = new WebSocket(wsUrl);
const pending = new Map();
let joined = false;
let joinResolver;
let joinRejecter;
const joinPromise = new Promise((resolve, reject) => {
  joinResolver = resolve;
  joinRejecter = reject;
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

socket.onopen = () => {
  socket.send(JSON.stringify({ type: "join", channel, id: "codex-build-join" }));
};

socket.onmessage = (event) => {
  const raw = String(event.data);
  const data = JSON.parse(raw);

  if (data.type === "system" && data.channel === channel && !joined) {
    joined = true;
    joinResolver();
    return;
  }

  if (data.type !== "broadcast" || !data.message) {
    return;
  }

  const msg = data.message;
  if (!msg.id || !pending.has(msg.id)) {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(msg, "result") && !Object.prototype.hasOwnProperty.call(msg, "error")) {
    return;
  }

  const request = pending.get(msg.id);
  clearTimeout(request.timeout);
  pending.delete(msg.id);

  if (msg.error) {
    request.reject(new Error(msg.error));
    return;
  }

  request.resolve(msg.result);
};

socket.onerror = (error) => {
  if (!joined) {
    joinRejecter(error);
  }
};

function send(command, params) {
  const id = `${command}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out waiting for ${command}`));
    }, 30000);

    pending.set(id, { resolve, reject, timeout });
    socket.send(
      JSON.stringify({
        id,
        type: "message",
        channel,
        message: {
          id,
          command,
          params: { ...params, commandId: id },
        },
      })
    );
  });
}

async function createFrame(params) {
  return send("create_frame", params);
}

async function createText(params) {
  return send("create_text", params);
}

async function setCornerRadius(nodeId, radius) {
  return send("set_corner_radius", {
    nodeId,
    radius,
    corners: [true, true, true, true],
  });
}

async function frame(params) {
  const result = await createFrame(params);
  if (params.cornerRadius) {
    await setCornerRadius(result.id, params.cornerRadius);
  }
  return result;
}

async function text(parentId, content, fontSize, fontWeight, fontColor, name) {
  return createText({
    x: 0,
    y: 0,
    text: content,
    fontSize,
    fontWeight,
    fontColor,
    name,
    parentId,
  });
}

async function sectionCard(parentId, title, body, options = {}) {
  const card = await frame({
    x: 0,
    y: 0,
    width: options.width || 640,
    height: options.height || 180,
    name: title,
    parentId,
    fillColor: options.fillColor || colors.white,
    strokeColor: options.strokeColor || colors.line,
    strokeWeight: 1,
    layoutMode: "VERTICAL",
    paddingTop: 22,
    paddingRight: 22,
    paddingBottom: 22,
    paddingLeft: 22,
    itemSpacing: 10,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: options.cornerRadius || 18,
  });

  await text(card.id, title, 20, 700, colors.ink, `${title} Title`);
  await text(card.id, body, options.bodySize || 14, 400, colors.slate, `${title} Body`);
  return card;
}

async function statCard(parentId, value, label, fillColor, dark = false) {
  const card = await frame({
    x: 0,
    y: 0,
    width: 180,
    height: 104,
    name: label,
    parentId,
    fillColor,
    layoutMode: "VERTICAL",
    paddingTop: 18,
    paddingRight: 18,
    paddingBottom: 18,
    paddingLeft: 18,
    itemSpacing: 6,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 18,
  });

  await text(card.id, value, 28, 700, dark ? colors.white : colors.ink, `${label} Value`);
  await text(card.id, label, 12, 500, dark ? colors.white : colors.slate, `${label} Label`);
  return card;
}

async function chip(parentId, label, fillColor, fontColor, width = 160) {
  const node = await frame({
    x: 0,
    y: 0,
    width,
    height: 48,
    name: label,
    parentId,
    fillColor,
    strokeColor: fillColor === colors.white ? colors.line : undefined,
    strokeWeight: fillColor === colors.white ? 1 : undefined,
    layoutMode: "VERTICAL",
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 16,
    itemSpacing: 0,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    primaryAxisAlignItems: "CENTER",
    counterAxisAlignItems: "CENTER",
    cornerRadius: 999,
  });

  await text(node.id, label, 14, 600, fontColor, `${label} Text`);
  return node;
}

async function button(parentId, label, fillColor, fontColor, width = 200) {
  return chip(parentId, label, fillColor, fontColor, width);
}

async function buildProductBrief(x, y) {
  const root = await frame({
    x,
    y,
    width: 760,
    height: 1440,
    name: "기획서 | Flavor Radar",
    fillColor: colors.paper,
    strokeColor: colors.line,
    strokeWeight: 1,
    layoutMode: "VERTICAL",
    paddingTop: 36,
    paddingRight: 36,
    paddingBottom: 36,
    paddingLeft: 36,
    itemSpacing: 18,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 28,
  });

  await text(root.id, "기획서", 16, 600, colors.green, "Document Tag");
  await text(root.id, "Flavor Radar", 36, 700, colors.ink, "Title");
  await text(
    root.id,
    "글로벌 식품 시장의 식품 트렌드를 빠르게 포착하는\n트렌드 캐칭 서비스",
    18,
    500,
    colors.slate,
    "Subtitle"
  );

  await sectionCard(
    root.id,
    "1. 제품 개요",
    "한 줄 정의\n글로벌 식품 시장의 변화를 시장별로 읽는 트렌드 인텔리전스 서비스\n\n핵심 가치\n국가·카테고리·원재료 단위의 변화를 빠르게 비교하고\n다음 액션까지 바로 연결한다."
  );

  await sectionCard(
    root.id,
    "2. 해결 문제",
    "• 국가별 식품 트렌드 데이터가 흩어져 있다\n• 보고서가 느려 신상품 기획 타이밍을 놓친다\n• 검색량, 메뉴 노출, SNS 버즈를 한 번에 보기 어렵다\n• 전략팀과 마케팅팀이 같은 신호를 보지 못한다",
    { fillColor: colors.warm }
  );

  await sectionCard(
    root.id,
    "3. 핵심 사용자",
    "• 식품 제조사 상품기획팀\n• 글로벌 유통사 카테고리 매니저\n• 외식 브랜드 메뉴 전략팀\n• 투자/리서치 조직의 시장 분석 담당자",
    { fillColor: colors.sky }
  );

  await sectionCard(
    root.id,
    "4. MVP 범위",
    "반드시 포함\n• 글로벌 트렌드 맵\n• 국가/카테고리 필터\n• 시그널 카드와 워치리스트\n• 주간 다이제스트 신청\n\n이번에는 제외\n• 예측 모델 상세 설정\n• 팀 협업 코멘트 기능",
    { height: 210 }
  );

  await sectionCard(
    root.id,
    "5. 성공 기준",
    "사용자 관점\n• 3분 안에 관심 시장의 신호를 찾는다\n• 첫 방문에서 데모 요청 또는 다이제스트 신청을 완료한다\n\n비즈니스 관점\n• 랜딩 전환율\n• 온보딩 완료율\n• 주간 다이제스트 구독률",
    { fillColor: colors.mint, height: 210 }
  );

  return root;
}

async function buildFeatureSpec(x, y) {
  const root = await frame({
    x,
    y,
    width: 820,
    height: 1440,
    name: "기능정의서 | Flavor Radar",
    fillColor: colors.paper,
    strokeColor: colors.line,
    strokeWeight: 1,
    layoutMode: "VERTICAL",
    paddingTop: 36,
    paddingRight: 36,
    paddingBottom: 36,
    paddingLeft: 36,
    itemSpacing: 18,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 28,
  });

  await text(root.id, "기능정의서", 16, 600, colors.green, "Document Tag");
  await text(root.id, "Flavor Radar MVP", 36, 700, colors.ink, "Title");
  await text(
    root.id,
    "랜딩에서 가치 인지 후 온보딩을 거쳐\n개인화된 트렌드 탐색으로 이어지는 구조",
    18,
    500,
    colors.slate,
    "Subtitle"
  );

  await sectionCard(
    root.id,
    "1. 핵심 기능",
    "• 글로벌 트렌드 맵: 국가/지역별 상승 신호 표시\n• 카테고리 필터: Beverage, Snack, Dairy, Frozen 등\n• 시그널 카드: 검색량, 메뉴 채택, SNS 버즈, 원재료 급상승\n• 워치리스트: 관심 시장/카테고리 저장\n• Weekly Digest: 이메일 브리프 신청",
    { height: 210 }
  );

  await sectionCard(
    root.id,
    "2. 데이터 시그널 정의",
    "기본 신호\n• 검색량 변화율\n• 메뉴/제품 출시 언급량\n• 소셜 버즈 증가율\n• 원재료 연관 키워드 상승\n\n표시 방식\n• 상승/보합/하락 배지\n• 7일 / 30일 기준 비교",
    { fillColor: colors.sky, height: 210 }
  );

  await sectionCard(
    root.id,
    "3. 주요 사용자 플로우",
    "1) 랜딩 진입\n2) 가치 메시지 확인\n3) 데모 요청 또는 시작하기 클릭\n4) 온보딩에서 역할/관심 시장/카테고리 선택\n5) 개인화된 대시보드 또는 다이제스트 신청 완료",
    { height: 190 }
  );

  await sectionCard(
    root.id,
    "4. 화면 정의",
    "랜딩 페이지\n• Hero, Feature, Use Case, Coverage, CTA\n\n온보딩\n• Step 1 역할 선택\n• Step 2 관심 시장 선택\n• Step 3 카테고리/워치리스트 설정\n• Step 4 Digest 수신 빈도 확인",
    { fillColor: colors.warm, height: 220 }
  );

  await sectionCard(
    root.id,
    "5. 상태 정의",
    "빈 상태\n• 관심 시장이 없으면 추천 시장 제안\n\n로딩 상태\n• 지역 데이터를 가져오는 중 메시지 표시\n\n에러 상태\n• 데이터 지연 시 마지막 업데이트 시간 노출",
    { height: 190 }
  );

  await sectionCard(
    root.id,
    "6. 주요 CTA",
    "랜딩\n• 데모 요청하기\n• 무료 주간 브리프 받기\n\n온보딩\n• 다음 단계\n• 내 대시보드 보기",
    { fillColor: colors.mint, height: 170 }
  );

  return root;
}

async function buildLandingPage(x, y) {
  const root = await frame({
    x,
    y,
    width: 1440,
    height: 2200,
    name: "화면 디자인 | 랜딩페이지",
    fillColor: colors.warm,
    layoutMode: "VERTICAL",
    paddingTop: 56,
    paddingRight: 56,
    paddingBottom: 56,
    paddingLeft: 56,
    itemSpacing: 28,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });

  const nav = await frame({
    x: 0,
    y: 0,
    width: 1328,
    height: 72,
    name: "Nav",
    parentId: root.id,
    fillColor: colors.paper,
    strokeColor: colors.line,
    strokeWeight: 1,
    layoutMode: "HORIZONTAL",
    paddingTop: 20,
    paddingRight: 24,
    paddingBottom: 20,
    paddingLeft: 24,
    primaryAxisAlignItems: "SPACE_BETWEEN",
    counterAxisAlignItems: "CENTER",
    itemSpacing: 20,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 20,
  });
  await text(nav.id, "Flavor Radar", 24, 700, colors.ink, "Brand");
  const navActions = await frame({
    x: 0,
    y: 0,
    width: 430,
    height: 32,
    name: "Nav Actions",
    parentId: nav.id,
    fillColor: colors.paper,
    layoutMode: "HORIZONTAL",
    itemSpacing: 12,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    counterAxisAlignItems: "CENTER",
  });
  await text(navActions.id, "Market Signals", 14, 500, colors.slate, "Nav 1");
  await text(navActions.id, "Use Cases", 14, 500, colors.slate, "Nav 2");
  await text(navActions.id, "Pricing", 14, 500, colors.slate, "Nav 3");
  await button(navActions.id, "데모 요청하기", colors.green, colors.white, 170);

  const hero = await frame({
    x: 0,
    y: 0,
    width: 1328,
    height: 520,
    name: "Hero",
    parentId: root.id,
    fillColor: colors.paper,
    layoutMode: "HORIZONTAL",
    paddingTop: 40,
    paddingRight: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    itemSpacing: 28,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 28,
  });

  const heroLeft = await frame({
    x: 0,
    y: 0,
    width: 700,
    height: 440,
    name: "Hero Copy",
    parentId: hero.id,
    fillColor: colors.paper,
    layoutMode: "VERTICAL",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    itemSpacing: 16,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await text(heroLeft.id, "GLOBAL FOOD TREND INTELLIGENCE", 14, 700, colors.green, "Eyebrow");
  await text(heroLeft.id, "식품 시장의 다음 신호를\n가장 먼저 포착하세요", 52, 700, colors.ink, "Hero Title");
  await text(
    heroLeft.id,
    "국가, 카테고리, 원재료 단위로\n떠오르는 식품 트렌드를 빠르게 읽고\n다음 제품 기획으로 연결합니다.",
    20,
    500,
    colors.slate,
    "Hero Body"
  );
  const heroButtons = await frame({
    x: 0,
    y: 0,
    width: 440,
    height: 56,
    name: "Hero Buttons",
    parentId: heroLeft.id,
    fillColor: colors.paper,
    layoutMode: "HORIZONTAL",
    itemSpacing: 12,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await button(heroButtons.id, "데모 요청하기", colors.green, colors.white, 180);
  await button(heroButtons.id, "무료 브리프 받기", colors.white, colors.ink, 180);

  const statRow = await frame({
    x: 0,
    y: 0,
    width: 620,
    height: 104,
    name: "Stats",
    parentId: heroLeft.id,
    fillColor: colors.paper,
    layoutMode: "HORIZONTAL",
    itemSpacing: 12,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await statCard(statRow.id, "42", "모니터링 국가", colors.mint, false);
  await statCard(statRow.id, "16", "식품 카테고리", colors.sky, false);
  await statCard(statRow.id, "7일", "핵심 신호 갱신", colors.greenSoft, false);

  const heroRight = await frame({
    x: 0,
    y: 0,
    width: 520,
    height: 440,
    name: "Signal Panel",
    parentId: hero.id,
    fillColor: colors.green,
    layoutMode: "VERTICAL",
    paddingTop: 28,
    paddingRight: 28,
    paddingBottom: 28,
    paddingLeft: 28,
    itemSpacing: 16,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 24,
  });
  await text(heroRight.id, "Signal Board", 16, 600, colors.greenSoft, "Signal Label");
  await text(heroRight.id, "이번 주 급상승 신호", 30, 700, colors.white, "Signal Title");
  await sectionCard(
    heroRight.id,
    "Japan / Functional Snacks",
    "검색량 +24%\n에너지 젤, 저당 프로틴 바 언급 증가",
    {
      width: 464,
      height: 122,
      fillColor: colors.paper,
      strokeColor: colors.paper,
      bodySize: 13,
      cornerRadius: 18,
    }
  );
  await sectionCard(
    heroRight.id,
    "US / Frozen Convenience",
    "메뉴 채택 +18%\n프리미엄 냉동 브런치 키워드 상승",
    {
      width: 464,
      height: 122,
      fillColor: { r: 0.16, g: 0.37, b: 0.29, a: 1 },
      strokeColor: { r: 0.16, g: 0.37, b: 0.29, a: 1 },
      bodySize: 13,
      cornerRadius: 18,
    }
  );

  const features = await frame({
    x: 0,
    y: 0,
    width: 1328,
    height: 280,
    name: "Features",
    parentId: root.id,
    fillColor: colors.warm,
    layoutMode: "HORIZONTAL",
    itemSpacing: 20,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });

  await sectionCard(features.id, "Country Radar", "국가별 상승 카테고리를\n하나의 맵에서 비교", {
    width: 429,
    height: 280,
    fillColor: colors.paper,
    cornerRadius: 24,
    bodySize: 18,
  });
  await sectionCard(features.id, "Signal Cards", "검색량·메뉴·SNS·원재료를\n카드 단위로 빠르게 스캔", {
    width: 429,
    height: 280,
    fillColor: colors.paper,
    cornerRadius: 24,
    bodySize: 18,
  });
  await sectionCard(features.id, "Watchlist & Digest", "관심 시장을 저장하고\n주간 브리프로 이어지는 구조", {
    width: 429,
    height: 280,
    fillColor: colors.paper,
    cornerRadius: 24,
    bodySize: 18,
  });

  const useCases = await frame({
    x: 0,
    y: 0,
    width: 1328,
    height: 360,
    name: "Use Cases",
    parentId: root.id,
    fillColor: colors.paper,
    layoutMode: "VERTICAL",
    paddingTop: 32,
    paddingRight: 32,
    paddingBottom: 32,
    paddingLeft: 32,
    itemSpacing: 18,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 28,
  });
  await text(useCases.id, "누가 이 서비스를 쓰는가", 16, 700, colors.green, "Use Case Label");
  await text(useCases.id, "제품 전략 팀부터 유통 바이어까지", 34, 700, colors.ink, "Use Case Title");
  const caseRow = await frame({
    x: 0,
    y: 0,
    width: 1264,
    height: 188,
    name: "Use Case Row",
    parentId: useCases.id,
    fillColor: colors.paper,
    layoutMode: "HORIZONTAL",
    itemSpacing: 18,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await sectionCard(caseRow.id, "식품 제조사", "신제품 카테고리와 원재료 신호를\n출시 타이밍에 맞춰 탐색", {
    width: 410,
    height: 188,
    fillColor: colors.warm,
    cornerRadius: 20,
    bodySize: 16,
  });
  await sectionCard(caseRow.id, "유통사 바이어", "국가별 급상승 제품군을 비교하고\n입점 우선순위를 빠르게 검토", {
    width: 410,
    height: 188,
    fillColor: colors.sky,
    cornerRadius: 20,
    bodySize: 16,
  });
  await sectionCard(caseRow.id, "외식 브랜드", "메뉴 채택 신호를 보고\n로컬 메뉴 실험 방향을 정리", {
    width: 410,
    height: 188,
    fillColor: colors.mint,
    cornerRadius: 20,
    bodySize: 16,
  });

  const coverage = await frame({
    x: 0,
    y: 0,
    width: 1328,
    height: 380,
    name: "Coverage",
    parentId: root.id,
    fillColor: colors.warm,
    layoutMode: "HORIZONTAL",
    itemSpacing: 20,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  const coverageLeft = await frame({
    x: 0,
    y: 0,
    width: 650,
    height: 380,
    name: "Coverage Left",
    parentId: coverage.id,
    fillColor: colors.green,
    layoutMode: "VERTICAL",
    paddingTop: 30,
    paddingRight: 30,
    paddingBottom: 30,
    paddingLeft: 30,
    itemSpacing: 16,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 26,
  });
  await text(coverageLeft.id, "Market Coverage", 16, 700, colors.greenSoft, "Coverage Label");
  await text(coverageLeft.id, "지역별 변화와 카테고리별 기회를\n한 화면에서 비교", 34, 700, colors.white, "Coverage Title");
  await text(
    coverageLeft.id,
    "APAC, North America, Europe 기준으로\n상승 신호와 Watchlist를 한 번에 본다.",
    18,
    500,
    colors.white,
    "Coverage Body"
  );
  const coverageStats = await frame({
    x: 0,
    y: 0,
    width: 560,
    height: 104,
    name: "Coverage Stats",
    parentId: coverageLeft.id,
    fillColor: colors.green,
    layoutMode: "HORIZONTAL",
    itemSpacing: 12,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await statCard(coverageStats.id, "120K+", "주간 신호 샘플", { r: 0.2, g: 0.41, b: 0.33, a: 1 }, true);
  await statCard(coverageStats.id, "30일", "비교 기간", { r: 0.2, g: 0.41, b: 0.33, a: 1 }, true);
  await statCard(coverageStats.id, "4x", "탐색 속도", { r: 0.2, g: 0.41, b: 0.33, a: 1 }, true);

  const coverageRight = await frame({
    x: 0,
    y: 0,
    width: 658,
    height: 380,
    name: "Coverage Right",
    parentId: coverage.id,
    fillColor: colors.paper,
    layoutMode: "VERTICAL",
    paddingTop: 30,
    paddingRight: 30,
    paddingBottom: 30,
    paddingLeft: 30,
    itemSpacing: 14,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 26,
  });
  await text(coverageRight.id, "이번 주 추천 Watchlist", 18, 700, colors.ink, "Watchlist Title");
  await chip(coverageRight.id, "Japan / Functional Snacks", colors.sky, colors.ink, 300);
  await chip(coverageRight.id, "US / Premium Frozen", colors.mint, colors.ink, 260);
  await chip(coverageRight.id, "Germany / Plant Protein", colors.warm, colors.ink, 270);
  await chip(coverageRight.id, "Korea / Zero Sugar Beverage", colors.white, colors.ink, 310);
  await button(coverageRight.id, "내 Watchlist로 가져오기", colors.green, colors.white, 250);

  const cta = await frame({
    x: 0,
    y: 0,
    width: 1328,
    height: 220,
    name: "Bottom CTA",
    parentId: root.id,
    fillColor: colors.paper,
    layoutMode: "VERTICAL",
    paddingTop: 34,
    paddingRight: 34,
    paddingBottom: 34,
    paddingLeft: 34,
    itemSpacing: 18,
    primaryAxisAlignItems: "CENTER",
    counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 26,
  });
  await text(cta.id, "다음 제품 기획 전에,\n지금 시장의 신호부터 확인하세요", 34, 700, colors.ink, "CTA Title");
  const ctaButtons = await frame({
    x: 0,
    y: 0,
    width: 420,
    height: 56,
    name: "CTA Buttons",
    parentId: cta.id,
    fillColor: colors.paper,
    layoutMode: "HORIZONTAL",
    itemSpacing: 12,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await button(ctaButtons.id, "데모 요청하기", colors.green, colors.white, 180);
  await button(ctaButtons.id, "무료 브리프 받기", colors.white, colors.ink, 180);

  return root;
}

async function buildOnboarding(x, y) {
  const root = await frame({
    x,
    y,
    width: 1280,
    height: 980,
    name: "화면 디자인 | 온보딩",
    fillColor: colors.sky,
    layoutMode: "HORIZONTAL",
    paddingTop: 40,
    paddingRight: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    itemSpacing: 24,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });

  const left = await frame({
    x: 0,
    y: 0,
    width: 380,
    height: 900,
    name: "Onboarding Left",
    parentId: root.id,
    fillColor: colors.green,
    layoutMode: "VERTICAL",
    paddingTop: 30,
    paddingRight: 30,
    paddingBottom: 30,
    paddingLeft: 30,
    itemSpacing: 16,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 28,
  });
  await text(left.id, "Flavor Radar", 24, 700, colors.white, "Brand");
  await text(left.id, "온보딩", 16, 600, colors.greenSoft, "Tag");
  await text(left.id, "관심 시장을 고르면\n첫 대시보드가 바로 개인화됩니다", 34, 700, colors.white, "Onboarding Title");
  await text(
    left.id,
    "선택한 지역과 카테고리를 바탕으로\n가장 먼저 볼 시그널 카드와\n주간 브리프를 맞춤 구성합니다.",
    18,
    500,
    colors.white,
    "Onboarding Body"
  );
  await chip(left.id, "Step 1 역할 선택", { r: 0.2, g: 0.41, b: 0.33, a: 1 }, colors.white, 220);
  await chip(left.id, "Step 2 관심 시장", { r: 0.2, g: 0.41, b: 0.33, a: 1 }, colors.white, 220);
  await chip(left.id, "Step 3 카테고리 설정", { r: 0.2, g: 0.41, b: 0.33, a: 1 }, colors.white, 240);
  await chip(left.id, "Step 4 Digest 확인", { r: 0.2, g: 0.41, b: 0.33, a: 1 }, colors.white, 220);

  const right = await frame({
    x: 0,
    y: 0,
    width: 796,
    height: 900,
    name: "Onboarding Right",
    parentId: root.id,
    fillColor: colors.paper,
    layoutMode: "VERTICAL",
    paddingTop: 32,
    paddingRight: 32,
    paddingBottom: 32,
    paddingLeft: 32,
    itemSpacing: 20,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 28,
  });

  const progress = await frame({
    x: 0,
    y: 0,
    width: 732,
    height: 54,
    name: "Progress",
    parentId: right.id,
    fillColor: colors.paper,
    layoutMode: "HORIZONTAL",
    itemSpacing: 12,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await chip(progress.id, "1 Role", colors.greenSoft, colors.ink, 130);
  await chip(progress.id, "2 Market", colors.green, colors.white, 140);
  await chip(progress.id, "3 Category", colors.white, colors.ink, 150);
  await chip(progress.id, "4 Digest", colors.white, colors.ink, 140);

  await text(right.id, "어떤 시장을 먼저 추적하고 싶나요?", 34, 700, colors.ink, "Question");
  await text(
    right.id,
    "선택한 시장을 기준으로 첫 화면의 추천 시그널과 주간 리포트를 구성합니다.",
    18,
    500,
    colors.slate,
    "Description"
  );

  const marketGrid = await frame({
    x: 0,
    y: 0,
    width: 732,
    height: 248,
    name: "Market Grid",
    parentId: right.id,
    fillColor: colors.paper,
    layoutMode: "HORIZONTAL",
    layoutWrap: "WRAP",
    itemSpacing: 12,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await chip(marketGrid.id, "APAC", colors.green, colors.white, 170);
  await chip(marketGrid.id, "North America", colors.white, colors.ink, 170);
  await chip(marketGrid.id, "Europe", colors.white, colors.ink, 170);
  await chip(marketGrid.id, "Middle East", colors.white, colors.ink, 170);
  await chip(marketGrid.id, "Japan", colors.sky, colors.ink, 170);
  await chip(marketGrid.id, "Korea", colors.sky, colors.ink, 170);
  await chip(marketGrid.id, "US", colors.white, colors.ink, 170);
  await chip(marketGrid.id, "Germany", colors.white, colors.ink, 170);

  const categoryBox = await frame({
    x: 0,
    y: 0,
    width: 732,
    height: 220,
    name: "Category Box",
    parentId: right.id,
    fillColor: colors.warm,
    layoutMode: "VERTICAL",
    paddingTop: 24,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    itemSpacing: 16,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 22,
  });
  await text(categoryBox.id, "추천 카테고리", 18, 700, colors.ink, "Category Title");
  const categoryRow = await frame({
    x: 0,
    y: 0,
    width: 684,
    height: 116,
    name: "Category Row",
    parentId: categoryBox.id,
    fillColor: colors.warm,
    layoutMode: "HORIZONTAL",
    layoutWrap: "WRAP",
    itemSpacing: 12,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await chip(categoryRow.id, "Functional Beverage", colors.paper, colors.ink, 210);
  await chip(categoryRow.id, "Protein Snack", colors.paper, colors.ink, 180);
  await chip(categoryRow.id, "Frozen Convenience", colors.paper, colors.ink, 200);
  await chip(categoryRow.id, "Zero Sugar", colors.paper, colors.ink, 160);

  const digestBox = await frame({
    x: 0,
    y: 0,
    width: 732,
    height: 120,
    name: "Digest Box",
    parentId: right.id,
    fillColor: colors.mint,
    layoutMode: "VERTICAL",
    paddingTop: 24,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    itemSpacing: 10,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    cornerRadius: 22,
  });
  await text(digestBox.id, "Weekly Digest", 18, 700, colors.ink, "Digest Title");
  await text(digestBox.id, "매주 월요일 오전 9시, 선택한 시장의 상승 신호를 이메일로 받습니다.", 16, 500, colors.slate, "Digest Body");

  const actions = await frame({
    x: 0,
    y: 0,
    width: 420,
    height: 56,
    name: "Onboarding Actions",
    parentId: right.id,
    fillColor: colors.paper,
    layoutMode: "HORIZONTAL",
    itemSpacing: 12,
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
  });
  await button(actions.id, "이전", colors.white, colors.ink, 120);
  await button(actions.id, "다음 단계", colors.green, colors.white, 150);
  await button(actions.id, "건너뛰고 둘러보기", colors.paper, colors.slate, 180);

  return root;
}

async function main() {
  await joinPromise;
  await wait(300);

  const baseX = 3200;
  const topY = 160;
  const lowerY = 1680;

  const docInfo = await send("get_document_info", {});
  console.log(`Connected to page: ${docInfo.name} (${docInfo.id})`);

  const productBrief = await buildProductBrief(baseX, topY);
  const featureSpec = await buildFeatureSpec(baseX + 820, topY);
  const landing = await buildLandingPage(baseX, lowerY);
  const onboarding = await buildOnboarding(baseX + 1500, lowerY + 120);

  console.log("Created nodes:");
  console.log(JSON.stringify({
    productBrief: productBrief.id,
    featureSpec: featureSpec.id,
    landing: landing.id,
    onboarding: onboarding.id,
  }, null, 2));

  await wait(500);
  socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
