const channel = process.argv[2] || "e1ao6fqx";
const wsUrl = process.argv[3] || "ws://127.0.0.1:3055";

const c = {
  bg: { r: 0.96, g: 0.95, b: 0.92, a: 1 },
  paper: { r: 0.985, g: 0.98, b: 0.96, a: 1 },
  ink: { r: 0.08, g: 0.1, b: 0.12, a: 1 },
  body: { r: 0.28, g: 0.31, b: 0.35, a: 1 },
  dark: { r: 0.08, g: 0.2, b: 0.17, a: 1 },
  dark2: { r: 0.14, g: 0.31, b: 0.26, a: 1 },
  softGreen: { r: 0.81, g: 0.89, b: 0.84, a: 1 },
  softBlue: { r: 0.88, g: 0.93, b: 0.99, a: 1 },
  softSand: { r: 0.94, g: 0.83, b: 0.63, a: 1 },
  line: { r: 0.84, g: 0.82, b: 0.78, a: 1 },
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

socket.onopen = () => {
  socket.send(JSON.stringify({ type: "join", channel, id: "codex-landing-v4-join" }));
};

socket.onmessage = (event) => {
  const data = JSON.parse(String(event.data));
  if (data.type === "system" && data.channel === channel && !joined) {
    joined = true;
    joinResolver();
    return;
  }
  if (data.type !== "broadcast" || !data.message) return;
  const msg = data.message;
  if (!msg.id || !pending.has(msg.id)) return;
  if (!Object.prototype.hasOwnProperty.call(msg, "result") && !Object.prototype.hasOwnProperty.call(msg, "error")) return;
  const req = pending.get(msg.id);
  clearTimeout(req.timeout);
  pending.delete(msg.id);
  if (msg.error) req.reject(new Error(msg.error));
  else req.resolve(msg.result);
};

socket.onerror = (error) => {
  if (!joined) joinRejecter(error);
};

function send(command, params) {
  const id = `${command}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out waiting for ${command}`));
    }, 30000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({
      id,
      type: "message",
      channel,
      message: { id, command, params: { ...params, commandId: id } },
    }));
  });
}

async function createFrame(params) { return send("create_frame", params); }
async function createText(params) { return send("create_text", params); }
async function setCornerRadius(nodeId, radius) {
  return send("set_corner_radius", { nodeId, radius, corners: [true, true, true, true] });
}
async function frame(params) {
  const result = await createFrame(params);
  if (params.cornerRadius) await setCornerRadius(result.id, params.cornerRadius);
  return result;
}
async function text(parentId, content, fontSize, fontWeight, fontColor, name) {
  return createText({ x: 0, y: 0, text: content, fontSize, fontWeight, fontColor, name, parentId });
}

async function button(parentId, label, fillColor, fontColor, width = 180, height = 52) {
  const node = await frame({
    x: 0, y: 0, width, height, name: label, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 14, paddingRight: 18, paddingBottom: 14, paddingLeft: 18,
    primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 999,
  });
  await text(node.id, label, 15, 700, fontColor, `${label} Text`);
  return node;
}

async function pill(parentId, label, fillColor, fontColor, width = 160, height = 42) {
  const node = await frame({
    x: 0, y: 0, width, height, name: label, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 10, paddingRight: 14, paddingBottom: 10, paddingLeft: 14,
    primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 999,
  });
  await text(node.id, label, 13, 600, fontColor, `${label} Text`);
  return node;
}

async function panel(parentId, title, body, opts) {
  const node = await frame({
    x: 0, y: 0, width: opts.width, height: opts.height, name: title, parentId,
    fillColor: opts.fillColor, strokeColor: opts.strokeColor, strokeWeight: opts.strokeColor ? 1 : undefined,
    layoutMode: "VERTICAL", paddingTop: opts.padding || 28, paddingRight: opts.padding || 28, paddingBottom: opts.padding || 28, paddingLeft: opts.padding || 28,
    itemSpacing: opts.spacing || 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: opts.cornerRadius || 24,
  });
  await text(node.id, title, opts.titleSize || 26, 700, opts.titleColor || c.ink, `${title} Title`);
  await text(node.id, body, opts.bodySize || 16, 500, opts.bodyColor || c.body, `${title} Body`);
  return node;
}

async function smallFeature(parentId, heading, desc) {
  return panel(parentId, heading, desc, {
    width: 320,
    height: 182,
    fillColor: c.paper,
    strokeColor: c.line,
    titleSize: 22,
    bodySize: 15,
    padding: 22,
    spacing: 10,
    cornerRadius: 22,
  });
}

async function trustItem(parentId, heading, desc) {
  return panel(parentId, heading, desc, {
    width: 312,
    height: 156,
    fillColor: c.paper,
    strokeColor: c.line,
    titleSize: 18,
    bodySize: 14,
    padding: 20,
    spacing: 8,
    cornerRadius: 18,
  });
}

async function dayItem(parentId, day, title, body) {
  const node = await frame({
    x: 0, y: 0, width: 410, height: 236, name: day, parentId, fillColor: c.paper, strokeColor: c.line, strokeWeight: 1,
    layoutMode: "VERTICAL", paddingTop: 26, paddingRight: 26, paddingBottom: 26, paddingLeft: 26,
    itemSpacing: 10, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 22,
  });
  await text(node.id, day, 14, 700, c.dark2, `${day} Label`);
  await text(node.id, title, 28, 700, c.ink, `${day} Title`);
  await text(node.id, body, 16, 500, c.body, `${day} Body`);
  return node;
}

async function buildLandingV4(x, y) {
  const root = await frame({
    x, y, width: 1440, height: 3700, name: "화면 디자인 | 랜딩페이지 v4 shade-ref",
    fillColor: c.bg, layoutMode: "VERTICAL",
    paddingTop: 22, paddingRight: 22, paddingBottom: 60, paddingLeft: 22,
    itemSpacing: 24, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });

  const nav = await frame({
    x: 0, y: 0, width: 1396, height: 72, name: "Nav", parentId: root.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", paddingTop: 18, paddingRight: 22, paddingBottom: 18, paddingLeft: 22,
    primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 18,
  });
  await text(nav.id, "Flavor Radar", 28, 700, c.ink, "Brand");
  const navRight = await frame({
    x: 0, y: 0, width: 620, height: 40, name: "Nav Right", parentId: nav.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", itemSpacing: 16, counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(navRight.id, "Features", 14, 500, c.body, "Features");
  await text(navRight.id, "Resources", 14, 500, c.body, "Resources");
  await text(navRight.id, "Use Cases", 14, 500, c.body, "Use Cases");
  await text(navRight.id, "Pricing", 14, 500, c.body, "Pricing");
  await button(navRight.id, "무료 브리프 받기", c.paper, c.ink, 150, 44);
  await button(navRight.id, "데모 요청하기", c.dark, c.white, 160, 44);

  const hero = await frame({
    x: 0, y: 0, width: 1396, height: 920, name: "Hero", parentId: root.id, fillColor: c.dark,
    layoutMode: "VERTICAL", paddingTop: 34, paddingRight: 34, paddingBottom: 34, paddingLeft: 34,
    itemSpacing: 30, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 32,
  });

  const eventBar = await frame({
    x: 0, y: 0, width: 1328, height: 36, name: "Event Bar", parentId: hero.id, fillColor: c.dark2,
    layoutMode: "HORIZONTAL", paddingTop: 8, paddingRight: 14, paddingBottom: 8, paddingLeft: 14,
    itemSpacing: 8, counterAxisAlignItems: "CENTER", layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 999,
  });
  await text(eventBar.id, "NEW", 12, 700, c.white, "New");
  await text(eventBar.id, "글로벌 식품 전략팀을 위한 트렌드 인텔리전스 레이아웃", 12, 500, c.softGreen, "Notice");

  const heroBody = await frame({
    x: 0, y: 0, width: 1328, height: 760, name: "Hero Body", parentId: hero.id, fillColor: c.dark,
    layoutMode: "HORIZONTAL", itemSpacing: 24, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });

  const heroLeft = await frame({
    x: 0, y: 0, width: 700, height: 760, name: "Hero Left", parentId: heroBody.id, fillColor: c.dark,
    layoutMode: "VERTICAL", paddingTop: 18, paddingRight: 0, paddingBottom: 18, paddingLeft: 0,
    itemSpacing: 20, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(heroLeft.id, "식품 시장의 다음 신호를\n지금 바로 포착하세요.", 78, 700, c.white, "Hero Title");
  await text(heroLeft.id, "국가별 수요 변화, 카테고리 급상승, 원재료 시그널, 브랜드 반응을 한 플랫폼에서 읽습니다. 보고서보다 빠르고, 검색보다 구조적입니다.", 22, 500, c.softGreen, "Hero Body");
  const heroCtas = await frame({
    x: 0, y: 0, width: 420, height: 56, name: "Hero CTAs", parentId: heroLeft.id, fillColor: c.dark,
    layoutMode: "HORIZONTAL", itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await button(heroCtas.id, "Start for Free", c.white, c.ink, 170, 52);
  await button(heroCtas.id, "Book a Demo", c.softSand, c.ink, 170, 52);
  const featureTabs = await frame({
    x: 0, y: 0, width: 620, height: 58, name: "Feature Tabs", parentId: heroLeft.id, fillColor: c.dark,
    layoutMode: "HORIZONTAL", itemSpacing: 10, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await pill(featureTabs.id, "Search", c.dark2, c.white, 120, 44);
  await pill(featureTabs.id, "Access", c.dark2, c.white, 120, 44);
  await pill(featureTabs.id, "Share", c.dark2, c.white, 120, 44);
  await pill(featureTabs.id, "Archive", c.dark2, c.white, 120, 44);

  const heroRight = await frame({
    x: 0, y: 0, width: 604, height: 760, name: "Hero Right", parentId: heroBody.id, fillColor: c.paper,
    layoutMode: "VERTICAL", paddingTop: 22, paddingRight: 22, paddingBottom: 22, paddingLeft: 22,
    itemSpacing: 16, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 26,
  });

  await panel(heroRight.id, "Rising now", "Japan / Functional snacks\nKorea / Zero sugar beverages\nUS / Premium frozen brunch\nGermany / Plant protein desserts", {
    width: 560, height: 250, fillColor: c.softBlue, titleSize: 18, bodySize: 34, titleColor: c.ink, bodyColor: c.ink, spacing: 16, cornerRadius: 22,
  });
  const heroMid = await frame({
    x: 0, y: 0, width: 560, height: 160, name: "Hero Mid", parentId: heroRight.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await panel(heroMid.id, "Search by trend", "시장, 카테고리, 원재료, 키워드로 탐색", {
    width: 274, height: 160, fillColor: c.softSand, titleSize: 20, bodySize: 15, titleColor: c.ink, bodyColor: c.ink, padding: 18, cornerRadius: 18,
  });
  await panel(heroMid.id, "Digest", "주간 브리프로 바로 전환", {
    width: 274, height: 160, fillColor: c.softGreen, titleSize: 20, bodySize: 15, titleColor: c.ink, bodyColor: c.ink, padding: 18, cornerRadius: 18,
  });
  await panel(heroRight.id, "Live market board", "검색량, 메뉴 채택, SNS 언급량, 원재료 반응을 같은 기준으로 정리한 시그널 보드. 첫 방문에서도 사용 목적이 읽히도록 크고 간결한 정보 위계로 배치.", {
    width: 560, height: 268, fillColor: c.paper, strokeColor: c.line, titleSize: 22, bodySize: 16, titleColor: c.ink, bodyColor: c.body, padding: 22, cornerRadius: 22,
  });

  const section1 = await frame({
    x: 0, y: 0, width: 1396, height: 360, name: "Section 1", parentId: root.id, fillColor: c.bg,
    layoutMode: "VERTICAL", paddingTop: 16, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(section1.id, "Flavor Radar isn't just another trend tool.", 54, 700, c.ink, "Section 1 Title");
  await text(section1.id, "It's everything your team needs to move from weak market signal to confident product direction.", 24, 500, c.body, "Section 1 Body");
  const features = await frame({
    x: 0, y: 0, width: 1396, height: 204, name: "Feature List", parentId: section1.id, fillColor: c.bg,
    layoutMode: "HORIZONTAL", itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await smallFeature(features.id, "Instant market access", "국가별 트렌드 변화를 한 번에 비교");
  await smallFeature(features.id, "AI signal search", "문장 단위로도 식품 트렌드를 찾는 구조");
  await smallFeature(features.id, "Digest & watchlist", "관심 신호를 저장하고 주간 브리프로 이어짐");
  await smallFeature(features.id, "Sharing for teams", "마케팅, 전략, 상품기획이 같은 데이터를 공유");

  const section2 = await frame({
    x: 0, y: 0, width: 1396, height: 720, name: "Section 2", parentId: root.id, fillColor: c.paper,
    layoutMode: "VERTICAL", paddingTop: 34, paddingRight: 34, paddingBottom: 34, paddingLeft: 34,
    itemSpacing: 22, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(section2.id, "Introducing Flavor Radar", 16, 700, c.dark2, "Section 2 Eyebrow");
  await text(section2.id, "A trend system that works like your team does.", 54, 700, c.ink, "Section 2 Title");
  const section2Row = await frame({
    x: 0, y: 0, width: 1328, height: 520, name: "Section 2 Row", parentId: section2.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await panel(section2Row.id, "Find everything with AI", "국가, 키워드, 메뉴 유형, 원재료 설명, 카테고리 문장까지 자연어로 찾을 수 있는 탐색 경험", {
    width: 650, height: 520, fillColor: c.softBlue, titleSize: 38, bodySize: 22, titleColor: c.ink, bodyColor: c.ink, padding: 30, spacing: 18, cornerRadius: 26,
  });
  const section2Right = await frame({
    x: 0, y: 0, width: 660, height: 520, name: "Section 2 Right", parentId: section2Row.id, fillColor: c.paper,
    layoutMode: "VERTICAL", itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await panel(section2Right.id, "Use AI to label signals", "식품 카테고리, 씬 설명이 아니라 이 서비스 맥락에서는 시장, 카테고리, 원재료, 포맷 신호를 자동 분류하는 개념으로 번역했습니다.", {
    width: 660, height: 248, fillColor: c.softSand, titleSize: 24, bodySize: 16, titleColor: c.ink, bodyColor: c.ink, padding: 24, cornerRadius: 22,
  });
  await panel(section2Right.id, "Customize sharing", "전략팀, 마케팅팀, 카테고리 매니저가 같은 시그널을 보고도 각자 필요한 뷰를 공유할 수 있는 구조를 강조", {
    width: 660, height: 254, fillColor: c.softGreen, titleSize: 24, bodySize: 16, titleColor: c.ink, bodyColor: c.ink, padding: 24, cornerRadius: 22,
  });

  const section3 = await frame({
    x: 0, y: 0, width: 1396, height: 660, name: "Industries", parentId: root.id, fillColor: c.dark,
    layoutMode: "VERTICAL", paddingTop: 34, paddingRight: 34, paddingBottom: 34, paddingLeft: 34,
    itemSpacing: 22, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(section3.id, "Powering food teams across every industry.", 52, 700, c.white, "Industries Title");
  await text(section3.id, "Discover how Flavor Radar can power yours.", 22, 500, c.softGreen, "Industries Body");
  const industryGrid = await frame({
    x: 0, y: 0, width: 1328, height: 430, name: "Industry Grid", parentId: section3.id, fillColor: c.dark,
    layoutMode: "HORIZONTAL", layoutWrap: "WRAP", itemSpacing: 14, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await panel(industryGrid.id, "Food Manufacturers", "신제품 기획과 카테고리 확장", { width: 254, height: 132, fillColor: c.dark2, titleSize: 22, bodySize: 14, titleColor: c.white, bodyColor: c.white, padding: 20, cornerRadius: 18 });
  await panel(industryGrid.id, "Retail Buyers", "입점 우선순위와 수요 감지", { width: 254, height: 132, fillColor: c.dark2, titleSize: 22, bodySize: 14, titleColor: c.white, bodyColor: c.white, padding: 20, cornerRadius: 18 });
  await panel(industryGrid.id, "Consumer Brands", "브랜드 캠페인과 SKU 방향 설정", { width: 254, height: 132, fillColor: c.dark2, titleSize: 22, bodySize: 14, titleColor: c.white, bodyColor: c.white, padding: 20, cornerRadius: 18 });
  await panel(industryGrid.id, "Food Service", "메뉴 전략과 지역별 적용", { width: 254, height: 132, fillColor: c.dark2, titleSize: 22, bodySize: 14, titleColor: c.white, bodyColor: c.white, padding: 20, cornerRadius: 18 });
  await panel(industryGrid.id, "Investment Teams", "시장 감지와 카테고리 분석", { width: 254, height: 132, fillColor: c.dark2, titleSize: 22, bodySize: 14, titleColor: c.white, bodyColor: c.white, padding: 20, cornerRadius: 18 });
  await panel(industryGrid.id, "Agencies", "트렌드 기반 브랜드 전략 지원", { width: 254, height: 132, fillColor: c.dark2, titleSize: 22, bodySize: 14, titleColor: c.white, bodyColor: c.white, padding: 20, cornerRadius: 18 });
  await panel(industryGrid.id, "Research Teams", "시그널 정리와 내부 리포트 가속", { width: 254, height: 132, fillColor: c.dark2, titleSize: 22, bodySize: 14, titleColor: c.white, bodyColor: c.white, padding: 20, cornerRadius: 18 });
  await panel(industryGrid.id, "Global Strategy", "시장별 우선순위 재배치", { width: 254, height: 132, fillColor: c.dark2, titleSize: 22, bodySize: 14, titleColor: c.white, bodyColor: c.white, padding: 20, cornerRadius: 18 });

  const section4 = await frame({
    x: 0, y: 0, width: 1396, height: 620, name: "Trust Section", parentId: root.id, fillColor: c.paper,
    layoutMode: "VERTICAL", paddingTop: 34, paddingRight: 34, paddingBottom: 34, paddingLeft: 34,
    itemSpacing: 20, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(section4.id, "Built to protect decision quality.", 50, 700, c.ink, "Trust Title");
  await text(section4.id, "Shade의 신뢰/보안 섹션 구조를 참고해, 이 서비스에서는 데이터 출처와 업데이트 신뢰도를 강조하는 블록으로 변환했습니다.", 18, 500, c.body, "Trust Body");
  const trustGrid = await frame({
    x: 0, y: 0, width: 1328, height: 356, name: "Trust Grid", parentId: section4.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", layoutWrap: "WRAP", itemSpacing: 16, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await trustItem(trustGrid.id, "Verified Sources", "검색량, 메뉴 채택, 카테고리 반응 등 신뢰 가능한 신호만 집계");
  await trustItem(trustGrid.id, "Weekly Refresh", "마지막 갱신 시점을 명확하게 표기해 정보 신선도 확보");
  await trustItem(trustGrid.id, "Role-based Views", "팀별로 필요한 시그널만 보이도록 뷰를 분리");
  await trustItem(trustGrid.id, "Private Watchlists", "조직 내 전략 가설을 외부 노출 없이 관리");
  await trustItem(trustGrid.id, "Explainable Signals", "왜 이 신호가 올랐는지 설명 텍스트와 함께 제공");
  await trustItem(trustGrid.id, "Digest Control", "알림 빈도와 범위를 사용자가 직접 조절");
  await trustItem(trustGrid.id, "Accessible Reading", "본문 16px+, CTA 44px+, 대비 확보 기준을 유지");
  await trustItem(trustGrid.id, "Fast Scanning", "헤드라인만 읽어도 의미가 이어지도록 구성");

  const section5 = await frame({
    x: 0, y: 0, width: 1396, height: 520, name: "30 Days", parentId: root.id, fillColor: c.bg,
    layoutMode: "VERTICAL", paddingTop: 8, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(section5.id, "Your first 30 days on Flavor Radar, painless.", 52, 700, c.ink, "30 Days Title");
  await text(section5.id, "Shade의 도입 타임라인 섹션을 참고해, 이 서비스에서는 온보딩 이후 안착 플로우를 보여주는 구조로 변환했습니다.", 18, 500, c.body, "30 Days Body");
  const dayRow = await frame({
    x: 0, y: 0, width: 1396, height: 248, name: "Day Row", parentId: section5.id, fillColor: c.bg,
    layoutMode: "HORIZONTAL", itemSpacing: 16, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await dayItem(dayRow.id, "Day 1", "Pick your markets.", "관심 국가와 카테고리를 정하고 첫 대시보드가 개인화됩니다.");
  await dayItem(dayRow.id, "Day 14", "Refine your watchlist.", "유의미했던 신호만 저장하고 팀별 뷰를 정리합니다.");
  await dayItem(dayRow.id, "Day 21", "Start acting on signals.", "신제품 기획, 카테고리 입점, 브랜드 전략에 바로 반영합니다.");

  const footer = await frame({
    x: 0, y: 0, width: 1396, height: 300, name: "Footer CTA", parentId: root.id, fillColor: c.dark,
    layoutMode: "VERTICAL", paddingTop: 40, paddingRight: 40, paddingBottom: 40, paddingLeft: 40,
    itemSpacing: 18, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(footer.id, "Stop waiting. Start sensing.", 64, 700, c.white, "Footer Title");
  await text(footer.id, "다음 식품 트렌드를 기다리지 말고 먼저 읽으세요.", 22, 500, c.softGreen, "Footer Body");
  const footerCtas = await frame({
    x: 0, y: 0, width: 420, height: 56, name: "Footer CTAs", parentId: footer.id, fillColor: c.dark,
    layoutMode: "HORIZONTAL", itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await button(footerCtas.id, "무료 브리프 받기", c.white, c.ink, 170, 52);
  await button(footerCtas.id, "데모 요청하기", c.softSand, c.ink, 170, 52);

  return root;
}

async function main() {
  await joinPromise;
  const page = await send("get_document_info", {});
  console.log(`Connected to page: ${page.name} (${page.id})`);
  const node = await buildLandingV4(9400, 1500);
  console.log(JSON.stringify({ landingV4: node.id }, null, 2));
  socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
