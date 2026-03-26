const channel = process.argv[2] || "e1ao6fqx";
const wsUrl = process.argv[3] || "ws://127.0.0.1:3055";

const c = {
  bg: { r: 0.97, g: 0.96, b: 0.93, a: 1 },
  paper: { r: 1, g: 1, b: 1, a: 1 },
  ink: { r: 0.09, g: 0.1, b: 0.12, a: 1 },
  text: { r: 0.28, g: 0.31, b: 0.36, a: 1 },
  mute: { r: 0.45, g: 0.48, b: 0.53, a: 1 },
  line: { r: 0.87, g: 0.87, b: 0.84, a: 1 },
  yellow: { r: 0.99, g: 0.9, b: 0.2, a: 1 },
  yellowSoft: { r: 0.99, g: 0.97, b: 0.83, a: 1 },
  green: { r: 0.09, g: 0.22, b: 0.18, a: 1 },
  greenSoft: { r: 0.83, g: 0.9, b: 0.86, a: 1 },
  blueSoft: { r: 0.9, g: 0.94, b: 0.99, a: 1 },
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
  socket.send(JSON.stringify({ type: "join", channel, id: "codex-food-mag-join" }));
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

async function card(parentId, title, body, opts = {}) {
  const node = await frame({
    x: 0, y: 0, width: opts.width || 640, height: opts.height || 190, name: title, parentId,
    fillColor: opts.fillColor || c.paper, strokeColor: opts.strokeColor || c.line, strokeWeight: 1,
    layoutMode: "VERTICAL", paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24,
    itemSpacing: 10, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: opts.cornerRadius || 20,
  });
  await text(node.id, title, opts.titleSize || 20, 700, opts.titleColor || c.ink, `${title} Title`);
  await text(node.id, body, opts.bodySize || 14, 400, opts.bodyColor || c.text, `${title} Body`);
  return node;
}

async function pill(parentId, label, fillColor, fontColor, width = 150, height = 42) {
  const node = await frame({
    x: 0, y: 0, width, height, name: label, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 10, paddingRight: 14, paddingBottom: 10, paddingLeft: 14,
    primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 999,
  });
  await text(node.id, label, 13, 600, fontColor, `${label} Text`);
  return node;
}

async function button(parentId, label, fillColor, fontColor, width = 160, height = 50) {
  const node = await frame({
    x: 0, y: 0, width, height, name: label, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 14, paddingRight: 18, paddingBottom: 14, paddingLeft: 18,
    primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 999,
  });
  await text(node.id, label, 15, 700, fontColor, `${label} Text`);
  return node;
}

async function buildBrief(x, y) {
  const root = await frame({
    x, y, width: 860, height: 1780, name: "기획서 | Food Trend Magazine", fillColor: c.bg,
    strokeColor: c.line, strokeWeight: 1, layoutMode: "VERTICAL",
    paddingTop: 36, paddingRight: 36, paddingBottom: 36, paddingLeft: 36, itemSpacing: 16,
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(root.id, "기획서", 16, 700, c.green, "Doc Label");
  await text(root.id, "Food Trend Magazine", 38, 700, c.ink, "Doc Title");
  await text(root.id, "글로벌 식품 산업의 변화를 에디토리얼 방식으로 전달하는 트렌드 매거진 사이트", 18, 500, c.text, "Doc Sub");

  await card(root.id, "1. Problem", "식품 시장 트렌드 정보는 분산돼 있고, 리서치 리포트는 무겁다. 빠르게 읽히는 매거진형 사이트가 필요하다.");
  await card(root.id, "2. Goal", "의사결정자가 최신 식품 트렌드를 빠르게 스캔하고, 심화 콘텐츠와 구독 전환까지 이어지게 한다.");
  await card(root.id, "3. Target User", "식품 브랜드 전략팀, 상품기획자, 카테고리 매니저, 식품 리서처, 투자/컨설팅 분석가");
  await card(root.id, "4. Key Features", "• Weekly cover story\n• Region/category trend highlights\n• Editor's pick articles\n• Searchable topic archive\n• Newsletter subscription", { height: 210, fillColor: c.yellowSoft });
  await card(root.id, "5. User Scenario", "홈 진입 → 이번 주 핵심 트렌드 확인 → 지역/주제별 기사 탐색 → 아카이브 또는 뉴스레터 구독 → 반복 방문", { height: 200 });
  await card(root.id, "6. Policy / Rules", "• 기사형 콘텐츠 우선\n• 과장된 마케팅 문구 지양\n• 최신성 표기 필수\n• 유료 전환보다 신뢰 형성 우선", { fillColor: c.blueSoft, height: 190 });
  await card(root.id, "7. Edge Cases", "• 트렌드 업데이트가 없을 때\n• 특정 국가 데이터가 부족할 때\n• 검색 결과가 없을 때\n• 뉴스레터 미구독 상태", { height: 200 });
  await card(root.id, "8. KPI", "• 기사 클릭률\n• 뉴스레터 구독 전환율\n• 홈 체류 시간\n• 아카이브 재방문율", { fillColor: c.greenSoft, height: 180 });
  return root;
}

async function buildMeeting(x, y) {
  const root = await frame({
    x, y, width: 980, height: 2040, name: "회의록 | Agent Discussion", fillColor: c.bg,
    strokeColor: c.line, strokeWeight: 1, layoutMode: "VERTICAL",
    paddingTop: 36, paddingRight: 36, paddingBottom: 36, paddingLeft: 36, itemSpacing: 16,
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(root.id, "회의록", 16, 700, c.green, "Meeting Label");
  await text(root.id, "Food Trend Magazine Site", 38, 700, c.ink, "Meeting Title");
  await text(root.id, "새 하네스 기준 에이전트별 검토 의견 요약", 18, 500, c.text, "Meeting Sub");

  await card(root.id, "PO 의견", "문제는 '트렌드 정보 접근성'이다. 리포트 사이트가 아니라 빠른 탐색과 반복 방문을 만드는 콘텐츠 제품으로 정의해야 한다.", { height: 180 });
  await card(root.id, "Researcher 의견", "[Hypothesis] 사용자들은 전체 보고서보다 '이번 주에 무엇이 바뀌었는지'를 먼저 원한다. 지역/카테고리 진입점이 핵심이다.", { height: 190, fillColor: c.blueSoft });
  await card(root.id, "UX Writer 의견", "매거진 사이트이지만 UI 문구는 최대한 설명형보다 정보형이어야 한다. 섹션명은 '이번 주 핵심', '지역별 포착', '주제 아카이브' 같이 즉시 이해돼야 한다.", { height: 210 });
  await card(root.id, "UI Designer 의견", "레이아웃은 카드 남용보다 큰 타이틀과 간결한 기사 블록이 맞다. 카카오 서비스 페이지처럼 카테고리 라벨과 정돈된 섹션 흐름을 참조할 수 있다.", { height: 210, fillColor: c.yellowSoft });
  await card(root.id, "Frontend Developer 의견", "검색, 주제 필터, 기사 목록, 뉴스레터 폼은 재사용 컴포넌트로 분리해야 한다. 최신 기사/추천 기사/아카이브 데이터 구조를 초기에 명확히 해야 한다.", { height: 220 });
  await card(root.id, "Reviewer 의견", "매거진 톤을 이유로 정보 탐색성이 떨어지면 실패다. 첫 화면에서 최신 기사, 분류 기준, 구독 액션이 명확히 보여야 한다.", { height: 200, fillColor: c.greenSoft });
  await card(root.id, "합의 사항", "• 홈은 이번 주 핵심 트렌드 중심\n• 지역/카테고리 기반 기사 탐색 제공\n• 뉴스레터 구독은 반복 방문 장치\n• 디자인은 기업형 신뢰감 + 매거진 리듬 조합", { height: 220 });
  await card(root.id, "보류 사항", "[Hypothesis] 국가별 데이터 깊이 수준, 검색 고도화 범위, 기사 수집 방식은 후속 검토 필요", { height: 170 });
  return root;
}

async function buildDesign(x, y) {
  const root = await frame({
    x, y, width: 1440, height: 2560, name: "디자인 | Food Trend Magazine", fillColor: c.bg,
    layoutMode: "VERTICAL", paddingTop: 22, paddingRight: 22, paddingBottom: 48, paddingLeft: 22,
    itemSpacing: 22, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });

  const nav = await frame({
    x: 0, y: 0, width: 1396, height: 74, name: "Nav", parentId: root.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", paddingTop: 18, paddingRight: 24, paddingBottom: 18, paddingLeft: 24,
    primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 18,
  });
  await text(nav.id, "Food Trend Magazine", 28, 700, c.ink, "Brand");
  const navRight = await frame({
    x: 0, y: 0, width: 580, height: 42, name: "Nav Right", parentId: nav.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", itemSpacing: 14, counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(navRight.id, "Weekly", 14, 500, c.text, "Weekly");
  await text(navRight.id, "Regions", 14, 500, c.text, "Regions");
  await text(navRight.id, "Categories", 14, 500, c.text, "Categories");
  await text(navRight.id, "Archive", 14, 500, c.text, "Archive");
  await button(navRight.id, "뉴스레터 구독", c.yellow, c.ink, 150, 44);

  const hero = await frame({
    x: 0, y: 0, width: 1396, height: 620, name: "Hero", parentId: root.id, fillColor: c.yellow,
    layoutMode: "HORIZONTAL", paddingTop: 34, paddingRight: 34, paddingBottom: 34, paddingLeft: 34,
    itemSpacing: 24, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 30,
  });
  const heroLeft = await frame({
    x: 0, y: 0, width: 780, height: 552, name: "Hero Left", parentId: hero.id, fillColor: c.yellow,
    layoutMode: "VERTICAL", paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await pill(heroLeft.id, "COMMUNICATION-STYLE SERVICE PAGE INSPIRED", c.paper, c.ink, 300, 40);
  await text(heroLeft.id, "이번 주 글로벌 식품 트렌드,\n읽기 쉽게 정리했습니다.", 64, 700, c.ink, "Hero Title");
  await text(heroLeft.id, "카카오 서비스 페이지처럼 큰 메시지와 정돈된 블록 구조를 참고해,\n식품 산업 트렌드를 매거진 방식으로 탐색하는 홈을 구성했습니다.", 22, 500, c.ink, "Hero Body");
  const heroActions = await frame({
    x: 0, y: 0, width: 360, height: 52, name: "Hero Actions", parentId: heroLeft.id, fillColor: c.yellow,
    layoutMode: "HORIZONTAL", itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await button(heroActions.id, "최신 기사 보기", c.ink, c.paper, 150, 50);
  await button(heroActions.id, "뉴스레터 구독", c.paper, c.ink, 150, 50);

  const heroRight = await frame({
    x: 0, y: 0, width: 524, height: 552, name: "Hero Right", parentId: hero.id, fillColor: c.paper,
    layoutMode: "VERTICAL", paddingTop: 22, paddingRight: 22, paddingBottom: 22, paddingLeft: 22,
    itemSpacing: 14, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 24,
  });
  await card(heroRight.id, "Cover Story", "Protein desserts are no longer niche.\nHow APAC and US markets are reframing indulgence through high-protein formats.", {
    width: 480, height: 214, fillColor: c.blueSoft, strokeColor: c.blueSoft, titleSize: 18, bodySize: 30, bodyColor: c.ink,
  });
  await card(heroRight.id, "Quick Reads", "• Japan: functional snacks become default\n• Korea: zero sugar RTD keeps climbing\n• Europe: plant protein shifts from novelty to routine", {
    width: 480, height: 260, fillColor: c.paper, strokeColor: c.line, bodySize: 16,
  });

  const sectionTitle = await frame({
    x: 0, y: 0, width: 1396, height: 120, name: "Section Intro", parentId: root.id, fillColor: c.bg,
    layoutMode: "VERTICAL", paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(sectionTitle.id, "지역과 카테고리로 흐름을 읽는 매거진", 52, 700, c.ink, "Section Title");
  await text(sectionTitle.id, "카카오 서비스/상세 페이지에서 보이는 큰 카피 중심 흐름을 참고해, 소개보다 콘텐츠 탐색이 먼저 보이도록 구성", 18, 500, c.text, "Section Body");

  const featureGrid = await frame({
    x: 0, y: 0, width: 1396, height: 420, name: "Feature Grid", parentId: root.id, fillColor: c.bg,
    layoutMode: "HORIZONTAL", itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await card(featureGrid.id, "이번 주 핵심", "편집장이 선정한 이번 주 주요 식품 신호를 가장 먼저 노출", {
    width: 335, height: 420, titleSize: 28, bodySize: 18, fillColor: c.paper,
  });
  await card(featureGrid.id, "지역별 포착", "APAC, North America, Europe 기준으로 주간 변화 탐색", {
    width: 335, height: 420, titleSize: 28, bodySize: 18, fillColor: c.yellowSoft,
  });
  await card(featureGrid.id, "카테고리 트렌드", "Beverage, Snack, Frozen, Dairy, Plant Protein 등으로 필터", {
    width: 335, height: 420, titleSize: 28, bodySize: 18, fillColor: c.blueSoft,
  });
  await card(featureGrid.id, "Archive & Digest", "읽은 기사 저장, 아카이브 검색, 뉴스레터 구독으로 반복 방문 유도", {
    width: 335, height: 420, titleSize: 28, bodySize: 18, fillColor: c.greenSoft,
  });

  const articles = await frame({
    x: 0, y: 0, width: 1396, height: 640, name: "Articles", parentId: root.id, fillColor: c.paper,
    layoutMode: "VERTICAL", paddingTop: 30, paddingRight: 30, paddingBottom: 30, paddingLeft: 30,
    itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(articles.id, "Editor's Pick", 18, 700, c.green, "Articles Label");
  await text(articles.id, "이번 주에 반드시 읽어야 할 기사", 44, 700, c.ink, "Articles Title");
  const articleRow = await frame({
    x: 0, y: 0, width: 1336, height: 450, name: "Article Row", parentId: articles.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await card(articleRow.id, "Japan / Functional Snacks", "면역·에너지·고단백 메시지가 스낵 포맷에서 강해지고 있다.", {
    width: 430, height: 450, titleSize: 34, bodySize: 20, fillColor: c.yellowSoft,
  });
  await card(articleRow.id, "US / Frozen Breakfast", "냉동 브런치가 '편의'가 아니라 '프리미엄 루틴'으로 재해석된다.", {
    width: 430, height: 450, titleSize: 34, bodySize: 20, fillColor: c.blueSoft,
  });
  await card(articleRow.id, "Europe / Plant Protein", "육류 대체를 넘어 디저트와 스낵으로 범위가 넓어지고 있다.", {
    width: 430, height: 450, titleSize: 34, bodySize: 20, fillColor: c.greenSoft,
  });

  const footer = await frame({
    x: 0, y: 0, width: 1396, height: 260, name: "Footer CTA", parentId: root.id, fillColor: c.ink,
    layoutMode: "VERTICAL", paddingTop: 36, paddingRight: 36, paddingBottom: 36, paddingLeft: 36,
    itemSpacing: 16, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(footer.id, "식품 트렌드를 더 자주, 더 가볍게 읽으세요.", 46, 700, c.paper, "Footer Title");
  await text(footer.id, "주간 뉴스레터로 핵심 기사만 받아볼 수 있습니다.", 20, 500, c.paper, "Footer Body");
  const footerAction = await frame({
    x: 0, y: 0, width: 180, height: 52, name: "Footer Action", parentId: footer.id, fillColor: c.ink,
    layoutMode: "HORIZONTAL", itemSpacing: 0, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await button(footerAction.id, "구독하기", c.yellow, c.ink, 160, 50);
  return root;
}

async function buildUsability(x, y) {
  const root = await frame({
    x, y, width: 920, height: 1840, name: "사용성 검토 | Food Trend Magazine", fillColor: c.bg,
    strokeColor: c.line, strokeWeight: 1, layoutMode: "VERTICAL",
    paddingTop: 36, paddingRight: 36, paddingBottom: 36, paddingLeft: 36, itemSpacing: 16,
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(root.id, "사용성 검토", 16, 700, c.green, "Usability Label");
  await text(root.id, "Food Trend Magazine", 38, 700, c.ink, "Usability Title");
  await text(root.id, "구조/탐색/기본 접근성 중심 검토", 18, 500, c.text, "Usability Sub");

  await card(root.id, "1. Critical Issues", "• 첫 화면에서 기사 탐색과 구독 행동이 동시에 보이되 우선순위가 명확해야 함\n• 지역/카테고리 축이 혼동되면 탐색성이 떨어짐", { height: 210 });
  await card(root.id, "2. UX Problems", "• 매거진 톤을 강조하면 검색/분류 기능이 묻힐 수 있음\n• 최신성과 아카이브 기준이 분명하지 않으면 신뢰가 떨어짐", { height: 200, fillColor: c.yellowSoft });
  await card(root.id, "3. Missing Cases", "• 검색 결과 없음\n• 신규 사용자에게 추천 기사만 보이는 상태\n• 데이터 부족 지역 노출 방식\n• 뉴스레터 미구독 상태 안내", { height: 220 });
  await card(root.id, "4. Accessibility Check", "• 본문 16px 이상\n• 주요 CTA 높이 44px 이상\n• 밝은 배경/짙은 텍스트 대비 유지\n• 섹션 제목만 읽어도 흐름 파악 가능", { height: 220, fillColor: c.blueSoft });
  await card(root.id, "5. Improvement Suggestions", "• Hero 아래에 '이번 주 핵심 / Regions / Categories / Archive' 같은 빠른 탐색 진입점 제공\n• 기사 카드에 최신 업데이트 일시 표시\n• 구독 CTA 반복 배치", { height: 230 });
  await card(root.id, "6. Priority", "High: 정보 구조 선명도\nMed: 기사 메타데이터 표기\nLow: 추가 인터랙션 고도화", { height: 170, fillColor: c.greenSoft });
  return root;
}

async function main() {
  await joinPromise;
  const page = await send("get_document_info", {});
  console.log(`Connected to page: ${page.name} (${page.id})`);

  const baseX = 11800;
  const topY = 220;

  const brief = await buildBrief(baseX, topY);
  const meeting = await buildMeeting(baseX + 900, topY);
  const design = await buildDesign(baseX, topY + 1880);
  const usability = await buildUsability(baseX + 1460, topY + 1880);

  console.log(JSON.stringify({
    brief: brief.id,
    meeting: meeting.id,
    design: design.id,
    usability: usability.id,
  }, null, 2));

  socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
