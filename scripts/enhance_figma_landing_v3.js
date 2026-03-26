const channel = process.argv[2] || "e1ao6fqx";
const wsUrl = process.argv[3] || "ws://127.0.0.1:3055";

const c = {
  canvas: { r: 0.95, g: 0.93, b: 0.88, a: 1 },
  paper: { r: 0.98, g: 0.97, b: 0.95, a: 1 },
  ink: { r: 0.09, g: 0.11, b: 0.13, a: 1 },
  text: { r: 0.23, g: 0.27, b: 0.31, a: 1 },
  forest: { r: 0.08, g: 0.22, b: 0.18, a: 1 },
  forest2: { r: 0.16, g: 0.33, b: 0.27, a: 1 },
  mist: { r: 0.87, g: 0.92, b: 0.98, a: 1 },
  sand: { r: 0.94, g: 0.82, b: 0.61, a: 1 },
  sage: { r: 0.82, g: 0.89, b: 0.84, a: 1 },
  line: { r: 0.84, g: 0.81, b: 0.76, a: 1 },
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
  socket.send(JSON.stringify({ type: "join", channel, id: "codex-landing-v3-join" }));
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

async function pill(parentId, label, fillColor, fontColor, width = 150, height = 44) {
  const node = await frame({
    x: 0, y: 0, width, height, name: label, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 10, paddingRight: 14, paddingBottom: 10, paddingLeft: 14,
    primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 999,
  });
  await text(node.id, label, 13, 600, fontColor, `${label} Text`);
  return node;
}

async function button(parentId, label, fillColor, fontColor, width = 180, height = 54) {
  const node = await frame({
    x: 0, y: 0, width, height, name: label, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 14, paddingRight: 18, paddingBottom: 14, paddingLeft: 18,
    primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 999,
  });
  await text(node.id, label, 15, 700, fontColor, `${label} Text`);
  return node;
}

async function block(parentId, title, body, options) {
  const node = await frame({
    x: 0, y: 0, width: options.width, height: options.height, name: title, parentId,
    fillColor: options.fillColor, strokeColor: options.strokeColor, strokeWeight: options.strokeColor ? 1 : undefined,
    layoutMode: "VERTICAL", paddingTop: options.padding || 28, paddingRight: options.padding || 28, paddingBottom: options.padding || 28, paddingLeft: options.padding || 28,
    itemSpacing: options.spacing || 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: options.cornerRadius || 24,
  });
  await text(node.id, title, options.titleSize || 28, 700, options.titleColor || c.ink, `${title} Title`);
  await text(node.id, body, options.bodySize || 16, 500, options.bodyColor || c.text, `${title} Body`);
  return node;
}

async function stat(parentId, value, label, fillColor, fg) {
  const node = await frame({
    x: 0, y: 0, width: 186, height: 112, name: label, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 18, paddingRight: 18, paddingBottom: 18, paddingLeft: 18,
    itemSpacing: 4, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 20,
  });
  await text(node.id, value, 30, 700, fg, `${label} Value`);
  await text(node.id, label, 13, 500, fg, `${label} Label`);
  return node;
}

async function buildLandingV3(x, y) {
  const root = await frame({
    x, y, width: 1440, height: 2920, name: "화면 디자인 | 랜딩페이지 v3",
    fillColor: c.canvas, layoutMode: "VERTICAL", paddingTop: 24, paddingRight: 24, paddingBottom: 64, paddingLeft: 24,
    itemSpacing: 24, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });

  const navWrap = await frame({
    x: 0, y: 0, width: 1392, height: 76, name: "Top Nav", parentId: root.id, fillColor: c.paper, strokeColor: c.line, strokeWeight: 1,
    layoutMode: "HORIZONTAL", paddingTop: 20, paddingRight: 24, paddingBottom: 20, paddingLeft: 24,
    primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER", layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 20,
  });
  await text(navWrap.id, "Flavor Radar", 28, 700, c.ink, "Brand");
  const navRight = await frame({
    x: 0, y: 0, width: 560, height: 40, name: "Nav Items", parentId: navWrap.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", itemSpacing: 16, counterAxisAlignItems: "CENTER", layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(navRight.id, "Signals", 14, 500, c.text, "Signals");
  await text(navRight.id, "Markets", 14, 500, c.text, "Markets");
  await text(navRight.id, "Use Cases", 14, 500, c.text, "Use Cases");
  await text(navRight.id, "Digest", 14, 500, c.text, "Digest");
  await button(navRight.id, "데모 요청하기", c.forest, c.white, 170, 48);

  const hero = await frame({
    x: 0, y: 0, width: 1392, height: 860, name: "Hero", parentId: root.id, fillColor: c.forest,
    layoutMode: "HORIZONTAL", paddingTop: 34, paddingRight: 34, paddingBottom: 34, paddingLeft: 34,
    itemSpacing: 26, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 34,
  });

  const heroCopy = await frame({
    x: 0, y: 0, width: 574, height: 792, name: "Hero Copy", parentId: hero.id, fillColor: c.forest,
    layoutMode: "VERTICAL", paddingTop: 18, paddingRight: 0, paddingBottom: 18, paddingLeft: 0,
    itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await pill(heroCopy.id, "Global food trend intelligence", c.forest2, c.white, 250, 40);
  await text(heroCopy.id, "Catch the next\nfood shift before\nit becomes obvious.", 74, 700, c.white, "Hero Title");
  await text(heroCopy.id, "국가, 카테고리, 원재료 축으로 막 올라오는 식품 트렌드를 읽고\n다음 제품 기획과 마켓 우선순위까지 바로 연결합니다.", 22, 500, c.sage, "Hero Body");
  const heroActions = await frame({
    x: 0, y: 0, width: 420, height: 56, name: "Hero Actions", parentId: heroCopy.id, fillColor: c.forest,
    layoutMode: "HORIZONTAL", itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await button(heroActions.id, "데모 요청하기", c.sand, c.ink, 180, 54);
  await button(heroActions.id, "무료 브리프 받기", c.white, c.ink, 180, 54);
  await text(heroCopy.id, "명확한 헤드라인, 충분한 버튼 크기, 높은 명도 대비로 첫 화면 가독성을 확보", 14, 500, c.sage, "A11y Note");

  const heroVisual = await frame({
    x: 0, y: 0, width: 724, height: 792, name: "Hero Visual", parentId: hero.id, fillColor: c.paper,
    layoutMode: "VERTICAL", paddingTop: 22, paddingRight: 22, paddingBottom: 22, paddingLeft: 22,
    itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });

  const heroTop = await frame({
    x: 0, y: 0, width: 680, height: 448, name: "Hero Top", parentId: heroVisual.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await block(heroTop.id, "Signal board", "Japan / Functional Snacks\nKorea / Zero Sugar Beverage\nUS / Premium Frozen Breakfast\n\n검색량, 메뉴 채택, 소셜 버즈를 같은 레이어에서 읽습니다.", {
    width: 438, height: 448, fillColor: c.mist, titleSize: 18, bodySize: 32, titleColor: c.ink, bodyColor: c.ink, spacing: 16, cornerRadius: 24,
  });
  const statCol = await frame({
    x: 0, y: 0, width: 224, height: 448, name: "Hero Stats", parentId: heroTop.id, fillColor: c.paper,
    layoutMode: "VERTICAL", itemSpacing: 14, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await stat(statCol.id, "42", "Markets tracked", c.forest, c.white);
  await stat(statCol.id, "16", "Food categories", c.sand, c.ink);
  await stat(statCol.id, "7d", "Refresh cycle", c.sage, c.ink);

  const heroBottom = await frame({
    x: 0, y: 0, width: 680, height: 282, name: "Hero Bottom", parentId: heroVisual.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", itemSpacing: 16, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await block(heroBottom.id, "Watchlist", "APAC launches to watch\nJapan / Functional Snacks\nGermany / Plant Protein", {
    width: 214, height: 282, fillColor: c.forest2, titleSize: 18, bodySize: 24, titleColor: c.white, bodyColor: c.white, cornerRadius: 22,
  });
  await block(heroBottom.id, "Digest", "매주 월요일 오전 9시\n내 관심 시장의 상승 신호를\n간결한 브리프로 받습니다.", {
    width: 214, height: 282, fillColor: c.paper, strokeColor: c.line, titleSize: 18, bodySize: 24, titleColor: c.ink, bodyColor: c.text, cornerRadius: 22,
  });
  await block(heroBottom.id, "Use case", "신제품 기획 전\n어느 시장을 먼저 볼지\n빠르게 결정하는 사이트", {
    width: 220, height: 282, fillColor: c.sand, titleSize: 18, bodySize: 24, titleColor: c.ink, bodyColor: c.ink, cornerRadius: 22,
  });

  const introBand = await frame({
    x: 0, y: 0, width: 1392, height: 140, name: "Intro Band", parentId: root.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", paddingTop: 0, paddingRight: 28, paddingBottom: 0, paddingLeft: 28,
    itemSpacing: 22, counterAxisAlignItems: "CENTER", layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 24,
  });
  await text(introBand.id, "Mobbin과 Dribbble 계열의 최근 사이트 흐름을 참고해 카드 남용을 줄이고, 큰 시각 블록과 편집형 그리드로 재구성", 22, 600, c.ink, "Intro Text");
  await pill(introBand.id, "Editorial layout", c.canvas, c.ink, 150, 42);
  await pill(introBand.id, "High contrast", c.canvas, c.ink, 130, 42);
  await pill(introBand.id, "Accessible CTA", c.canvas, c.ink, 140, 42);

  const valueSection = await frame({
    x: 0, y: 0, width: 1392, height: 620, name: "Value Section", parentId: root.id, fillColor: c.canvas,
    layoutMode: "HORIZONTAL", itemSpacing: 24, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await block(valueSection.id, "한 섹션, 한 메시지", "Hero는 약속, 다음 섹션은 가치, 그 다음은 사용 맥락으로 역할을 나눠 스캔이 빠르게 되도록 설계했습니다.", {
    width: 444, height: 620, fillColor: c.paper, strokeColor: c.line, titleSize: 44, bodySize: 18, titleColor: c.ink, bodyColor: c.text, cornerRadius: 28, spacing: 18, padding: 34,
  });
  const rightStack = await frame({
    x: 0, y: 0, width: 924, height: 620, name: "Value Grid", parentId: valueSection.id, fillColor: c.canvas,
    layoutMode: "VERTICAL", itemSpacing: 20, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  const topRow = await frame({
    x: 0, y: 0, width: 924, height: 300, name: "Top Row", parentId: rightStack.id, fillColor: c.canvas,
    layoutMode: "HORIZONTAL", itemSpacing: 20, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await block(topRow.id, "Country radar", "지역별로 어떤 카테고리가 얼마나 빠르게 올라오는지 한눈에 비교", {
    width: 452, height: 300, fillColor: c.mist, titleSize: 30, bodySize: 18, titleColor: c.ink, bodyColor: c.text,
  });
  await block(topRow.id, "Ingredient pulse", "저당, 단백질, 냉동 편의식, 기능성 스낵처럼 원재료와 포맷 변화를 읽는 레이어", {
    width: 452, height: 300, fillColor: c.sand, titleSize: 30, bodySize: 18, titleColor: c.ink, bodyColor: c.ink,
  });
  const bottomRow = await frame({
    x: 0, y: 0, width: 924, height: 300, name: "Bottom Row", parentId: rightStack.id, fillColor: c.canvas,
    layoutMode: "HORIZONTAL", itemSpacing: 20, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await block(bottomRow.id, "Watchlist", "팀이 관심 있는 시장만 따로 저장하고 계속 추적", {
    width: 296, height: 300, fillColor: c.forest, titleSize: 28, bodySize: 17, titleColor: c.white, bodyColor: c.white,
  });
  await block(bottomRow.id, "Weekly digest", "리포트 길이를 줄이고 중요한 시그널만 메일로 정리", {
    width: 296, height: 300, fillColor: c.paper, strokeColor: c.line, titleSize: 28, bodySize: 17, titleColor: c.ink, bodyColor: c.text,
  });
  await block(bottomRow.id, "Fast decisions", "사이트 방문 후 3분 안에 다음 액션이 보이도록 CTA를 반복 배치", {
    width: 292, height: 300, fillColor: c.sage, titleSize: 28, bodySize: 17, titleColor: c.ink, bodyColor: c.ink,
  });

  const flowSection = await frame({
    x: 0, y: 0, width: 1392, height: 660, name: "Flow Section", parentId: root.id, fillColor: c.paper, strokeColor: c.line, strokeWeight: 1,
    layoutMode: "VERTICAL", paddingTop: 36, paddingRight: 36, paddingBottom: 36, paddingLeft: 36,
    itemSpacing: 24, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(flowSection.id, "From signal to action", 18, 700, c.forest, "Flow Eyebrow");
  await text(flowSection.id, "정보를 예쁘게 쌓는 대신,\n결정 순서대로 읽히는 레이아웃", 52, 700, c.ink, "Flow Title");
  await text(flowSection.id, "기본 웹 접근성을 위해 본문은 16px 이상, 주요 문장은 18px 이상, CTA는 48px 이상 높이로 구성하고 대비가 낮은 조합은 피했습니다.", 18, 500, c.text, "Flow Body");
  const flowRow = await frame({
    x: 0, y: 0, width: 1320, height: 360, name: "Flow Row", parentId: flowSection.id, fillColor: c.paper,
    layoutMode: "HORIZONTAL", itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await block(flowRow.id, "01 Select market", "관심 지역과 카테고리를 고른다", {
    width: 428, height: 360, fillColor: c.canvas, titleSize: 34, bodySize: 20, titleColor: c.ink, bodyColor: c.text, padding: 30,
  });
  await block(flowRow.id, "02 Scan signals", "상승/보합/하락 신호를 빠르게 읽는다", {
    width: 428, height: 360, fillColor: c.mist, titleSize: 34, bodySize: 20, titleColor: c.ink, bodyColor: c.text, padding: 30,
  });
  await block(flowRow.id, "03 Save or brief", "워치리스트 저장 또는 브리프 신청으로 이어진다", {
    width: 428, height: 360, fillColor: c.sand, titleSize: 34, bodySize: 20, titleColor: c.ink, bodyColor: c.ink, padding: 30,
  });

  const cta = await frame({
    x: 0, y: 0, width: 1392, height: 320, name: "Final CTA", parentId: root.id, fillColor: c.forest,
    layoutMode: "VERTICAL", paddingTop: 42, paddingRight: 42, paddingBottom: 42, paddingLeft: 42,
    itemSpacing: 18, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 30,
  });
  await text(cta.id, "Move before the market does.", 64, 700, c.white, "CTA Title");
  await text(cta.id, "다음 식품 기획의 힌트를 기다리지 말고 먼저 포착하세요.", 22, 500, c.sage, "CTA Body");
  const ctaRow = await frame({
    x: 0, y: 0, width: 420, height: 56, name: "CTA Buttons", parentId: cta.id, fillColor: c.forest,
    layoutMode: "HORIZONTAL", itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await button(ctaRow.id, "데모 요청하기", c.sand, c.ink, 180, 54);
  await button(ctaRow.id, "브리프 구독하기", c.white, c.ink, 180, 54);

  return root;
}

async function main() {
  await joinPromise;
  const page = await send("get_document_info", {});
  console.log(`Connected to page: ${page.name} (${page.id})`);
  const node = await buildLandingV3(7800, 1600);
  console.log(JSON.stringify({ landingV3: node.id }, null, 2));
  socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
