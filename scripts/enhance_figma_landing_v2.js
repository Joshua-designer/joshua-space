const channel = process.argv[2] || "e1ao6fqx";
const wsUrl = process.argv[3] || "ws://127.0.0.1:3055";

const c = {
  bg: { r: 0.95, g: 0.92, b: 0.85, a: 1 },
  cream: { r: 0.98, g: 0.97, b: 0.94, a: 1 },
  ink: { r: 0.1, g: 0.12, b: 0.15, a: 1 },
  muted: { r: 0.34, g: 0.37, b: 0.42, a: 1 },
  forest: { r: 0.08, g: 0.22, b: 0.17, a: 1 },
  forestSoft: { r: 0.21, g: 0.39, b: 0.31, a: 1 },
  sage: { r: 0.79, g: 0.88, b: 0.81, a: 1 },
  sky: { r: 0.87, g: 0.92, b: 0.99, a: 1 },
  sand: { r: 0.95, g: 0.83, b: 0.62, a: 1 },
  line: { r: 0.85, g: 0.83, b: 0.78, a: 1 },
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
  socket.send(JSON.stringify({ type: "join", channel, id: "codex-landing-v2-join" }));
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
  const request = pending.get(msg.id);
  clearTimeout(request.timeout);
  pending.delete(msg.id);
  if (msg.error) request.reject(new Error(msg.error));
  else request.resolve(msg.result);
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

async function pill(parentId, label, fillColor, fontColor, width = 160, height = 44) {
  const node = await frame({
    x: 0, y: 0, width, height, name: label, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 10, paddingRight: 14, paddingBottom: 10, paddingLeft: 14,
    primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 999,
  });
  await text(node.id, label, 13, 600, fontColor, `${label} Text`);
  return node;
}

async function splitStat(parentId, top, bottom, fillColor, fontColor = c.ink) {
  const node = await frame({
    x: 0, y: 0, width: 170, height: 110, name: bottom, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 18, paddingRight: 18, paddingBottom: 18, paddingLeft: 18,
    itemSpacing: 4, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 18,
  });
  await text(node.id, top, 30, 700, fontColor, `${bottom} Value`);
  await text(node.id, bottom, 12, 500, fontColor, `${bottom} Label`);
  return node;
}

async function editorialBlock(parentId, title, body, fillColor, width, height, accentColor = c.ink, textColor = c.ink) {
  const node = await frame({
    x: 0, y: 0, width, height, name: title, parentId, fillColor,
    layoutMode: "VERTICAL", paddingTop: 28, paddingRight: 28, paddingBottom: 28, paddingLeft: 28,
    itemSpacing: 14, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 24,
  });
  await text(node.id, title, 30, 700, accentColor, `${title} Title`);
  await text(node.id, body, 17, 500, textColor, `${title} Body`);
  return node;
}

async function buildLandingV2(x, y) {
  const root = await frame({
    x, y, width: 1440, height: 2660, name: "화면 디자인 | 랜딩페이지 v2",
    fillColor: c.bg,
    layoutMode: "VERTICAL",
    paddingTop: 0, paddingRight: 0, paddingBottom: 60, paddingLeft: 0,
    itemSpacing: 0, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });

  const hero = await frame({
    x: 0, y: 0, width: 1440, height: 900, name: "Hero v2", parentId: root.id,
    fillColor: c.forest,
    layoutMode: "VERTICAL", paddingTop: 32, paddingRight: 44, paddingBottom: 40, paddingLeft: 44,
    itemSpacing: 36, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });

  const nav = await frame({
    x: 0, y: 0, width: 1352, height: 64, name: "Nav", parentId: hero.id, fillColor: c.forest,
    layoutMode: "HORIZONTAL", primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(nav.id, "Flavor Radar", 28, 700, c.white, "Brand");
  const navRight = await frame({
    x: 0, y: 0, width: 520, height: 52, name: "Nav Right", parentId: nav.id, fillColor: c.forest,
    layoutMode: "HORIZONTAL", itemSpacing: 14, counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(navRight.id, "Signals", 14, 500, c.sage, "Signals");
  await text(navRight.id, "Markets", 14, 500, c.sage, "Markets");
  await text(navRight.id, "Digest", 14, 500, c.sage, "Digest");
  await pill(navRight.id, "데모 요청", c.white, c.ink, 150, 48);

  const heroMain = await frame({
    x: 0, y: 0, width: 1352, height: 730, name: "Hero Main", parentId: hero.id, fillColor: c.forest,
    layoutMode: "HORIZONTAL", itemSpacing: 24, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });

  const copy = await frame({
    x: 0, y: 0, width: 560, height: 730, name: "Hero Copy", parentId: heroMain.id, fillColor: c.forest,
    layoutMode: "VERTICAL", paddingTop: 38, paddingRight: 0, paddingBottom: 38, paddingLeft: 0,
    itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await pill(copy.id, "GLOBAL FOOD TREND INTELLIGENCE", c.forestSoft, c.white, 270, 40);
  await text(copy.id, "The next food\nsignal starts here.", 72, 700, c.white, "Hero Title En");
  await text(copy.id, "글로벌 식품 시장에서 막 올라오는 흐름을\n국가, 카테고리, 원재료 기준으로 먼저 포착합니다.", 22, 500, c.sage, "Hero Body");
  const heroCtas = await frame({
    x: 0, y: 0, width: 420, height: 54, name: "Hero CTAs", parentId: copy.id, fillColor: c.forest,
    layoutMode: "HORIZONTAL", itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await pill(heroCtas.id, "데모 요청하기", c.sand, c.ink, 170, 50);
  await pill(heroCtas.id, "주간 브리프 받기", c.white, c.ink, 170, 50);
  await text(copy.id, "For product teams, category managers, and food strategy leads.", 14, 500, c.sage, "Hero Footnote");

  const poster = await frame({
    x: 0, y: 0, width: 768, height: 730, name: "Hero Poster", parentId: heroMain.id, fillColor: c.cream,
    layoutMode: "VERTICAL", paddingTop: 26, paddingRight: 26, paddingBottom: 26, paddingLeft: 26,
    itemSpacing: 16, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });

  const posterTop = await frame({
    x: 0, y: 0, width: 716, height: 400, name: "Poster Top", parentId: poster.id, fillColor: c.cream,
    layoutMode: "HORIZONTAL", itemSpacing: 16, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  const trendBoard = await frame({
    x: 0, y: 0, width: 470, height: 400, name: "Trend Board", parentId: posterTop.id, fillColor: c.sky,
    layoutMode: "VERTICAL", paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24,
    itemSpacing: 14, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 24,
  });
  await text(trendBoard.id, "Rising this week", 16, 700, c.ink, "Trend Label");
  await text(trendBoard.id, "Functional snacks in Japan\nZero sugar beverages in Korea\nPremium frozen brunch in the US", 34, 700, c.ink, "Trend Content");
  await text(trendBoard.id, "검색량, 메뉴 채택, 소셜 버즈를 한 번에 읽는 시그널 보드", 16, 500, c.muted, "Trend Foot");

  const posterSide = await frame({
    x: 0, y: 0, width: 230, height: 400, name: "Poster Side", parentId: posterTop.id, fillColor: c.cream,
    layoutMode: "VERTICAL", itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await splitStat(posterSide.id, "42", "Markets", c.forest, c.white);
  await splitStat(posterSide.id, "16", "Categories", c.sand, c.ink);
  await splitStat(posterSide.id, "7d", "Freshness", c.sage, c.ink);

  const posterBottom = await frame({
    x: 0, y: 0, width: 716, height: 262, name: "Poster Bottom", parentId: poster.id, fillColor: c.cream,
    layoutMode: "HORIZONTAL", itemSpacing: 16, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await editorialBlock(posterBottom.id, "Watchlist", "Japan / Functional Snacks\nUS / Premium Frozen\nGermany / Plant Protein", c.forestSoft, 260, 262, c.white, c.white);
  await editorialBlock(posterBottom.id, "Digest", "매주 월요일 오전,\n관심 시장의 급상승 신호를\n한 장의 브리프로 전달합니다.", c.white, 220, 262, c.ink, c.muted);
  await editorialBlock(posterBottom.id, "Use Case", "신제품 기획 전\n어떤 시장과 카테고리를\n먼저 볼지 빠르게 결정합니다.", c.sand, 220, 262, c.ink, c.ink);

  const proofBand = await frame({
    x: 0, y: 0, width: 1440, height: 132, name: "Proof Band", parentId: root.id, fillColor: c.cream,
    layoutMode: "HORIZONTAL", paddingTop: 0, paddingRight: 44, paddingBottom: 0, paddingLeft: 44,
    itemSpacing: 26, counterAxisAlignItems: "CENTER", layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(proofBand.id, "Used by teams tracking menu shifts, retail launches, and ingredient momentum.", 22, 600, c.ink, "Proof Text");
  await pill(proofBand.id, "APAC", c.bg, c.ink, 110, 42);
  await pill(proofBand.id, "North America", c.bg, c.ink, 160, 42);
  await pill(proofBand.id, "Europe", c.bg, c.ink, 120, 42);
  await pill(proofBand.id, "Weekly Digest", c.bg, c.ink, 150, 42);

  const sectionA = await frame({
    x: 0, y: 0, width: 1440, height: 560, name: "Section A", parentId: root.id, fillColor: c.bg,
    layoutMode: "HORIZONTAL", paddingTop: 54, paddingRight: 44, paddingBottom: 54, paddingLeft: 44,
    itemSpacing: 26, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await editorialBlock(sectionA.id, "한 화면에서 시장의 온도를 읽는다", "국가별로 어떤 식품 카테고리가 오르고 있는지, 왜 올라오는지, 지금 볼 가치가 있는지까지 한 번에 이해하도록 설계했습니다.", c.cream, 520, 452, c.ink, c.muted);
  const mosaic = await frame({
    x: 0, y: 0, width: 806, height: 452, name: "Mosaic", parentId: sectionA.id, fillColor: c.bg,
    layoutMode: "HORIZONTAL", itemSpacing: 16, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  const mosaicLeft = await frame({
    x: 0, y: 0, width: 390, height: 452, name: "Mosaic Left", parentId: mosaic.id, fillColor: c.sky,
    layoutMode: "VERTICAL", paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24,
    itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 24,
  });
  await text(mosaicLeft.id, "Market Signals", 16, 700, c.ink, "Mosaic Label");
  await text(mosaicLeft.id, "검색량과 제품 출시,\n메뉴 확산, 원재료 반응을\n같은 리듬으로 묶는다.", 38, 700, c.ink, "Mosaic Title");
  const mosaicRight = await frame({
    x: 0, y: 0, width: 400, height: 452, name: "Mosaic Right", parentId: mosaic.id, fillColor: c.bg,
    layoutMode: "VERTICAL", itemSpacing: 16, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await editorialBlock(mosaicRight.id, "Country Radar", "일본, 한국, 미국, 독일 등\n핵심 시장을 나란히 비교", c.forest, 400, 218, c.white, c.white);
  await editorialBlock(mosaicRight.id, "Ingredient Pulse", "저당, 단백질, 식물성, 냉동 편의식 등\n원재료와 포맷 변화 추적", c.sand, 400, 218, c.ink, c.ink);

  const sectionB = await frame({
    x: 0, y: 0, width: 1440, height: 620, name: "Section B", parentId: root.id, fillColor: c.cream,
    layoutMode: "VERTICAL", paddingTop: 54, paddingRight: 44, paddingBottom: 54, paddingLeft: 44,
    itemSpacing: 24, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await text(sectionB.id, "From signal to decision", 18, 700, c.forest, "Section B Eyebrow");
  await text(sectionB.id, "읽고 끝나는 리포트가 아니라,\n다음 액션으로 이어지는 탐색 구조", 48, 700, c.ink, "Section B Title");
  const workflow = await frame({
    x: 0, y: 0, width: 1352, height: 360, name: "Workflow", parentId: sectionB.id, fillColor: c.cream,
    layoutMode: "HORIZONTAL", itemSpacing: 18, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await editorialBlock(workflow.id, "01 Select", "관심 시장과 카테고리를 고르면\n첫 화면이 즉시 개인화됩니다.", c.white, 438, 360, c.ink, c.muted);
  await editorialBlock(workflow.id, "02 Scan", "상승 신호를 카드가 아니라\n큰 맥락 단위로 훑고 우선순위를 정합니다.", c.sky, 438, 360, c.ink, c.ink);
  await editorialBlock(workflow.id, "03 Act", "워치리스트와 Digest로\n의사결정을 팀 운영 흐름에 연결합니다.", c.sage, 438, 360, c.ink, c.ink);

  const footerCta = await frame({
    x: 44, y: 0, width: 1352, height: 340, name: "Footer CTA", parentId: root.id, fillColor: c.forest,
    layoutMode: "VERTICAL", paddingTop: 40, paddingRight: 40, paddingBottom: 40, paddingLeft: 40,
    itemSpacing: 18, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED", cornerRadius: 28,
  });
  await text(footerCta.id, "Move before the market does.", 62, 700, c.white, "Footer Title");
  await text(footerCta.id, "다음 식품 트렌드를 기다리지 말고 먼저 잡으세요.", 22, 500, c.sage, "Footer Body");
  const footerActions = await frame({
    x: 0, y: 0, width: 420, height: 54, name: "Footer Actions", parentId: footerCta.id, fillColor: c.forest,
    layoutMode: "HORIZONTAL", itemSpacing: 12, layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED",
  });
  await pill(footerActions.id, "데모 요청하기", c.sand, c.ink, 180, 50);
  await pill(footerActions.id, "브리프 구독하기", c.white, c.ink, 180, 50);

  return root;
}

async function main() {
  await joinPromise;
  const page = await send("get_document_info", {});
  console.log(`Connected to page: ${page.name} (${page.id})`);
  const node = await buildLandingV2(6200, 1680);
  console.log(JSON.stringify({ landingV2: node.id }, null, 2));
  socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
