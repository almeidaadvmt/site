/* Almeida Advocacia — site institucional
   Configurações fáceis de alterar ficam aqui em cima. */
const CONFIG = {
  whatsapp: "5565992546217", // DDI + DDD + número, só dígitos
  whatsappMensagem: "Olá! Vim pelo site da Almeida Advocacia e gostaria de atendimento.",
  // Link da página de agendamento (ex.: Google Agenda > Programação de horários).
  // Enquanto estiver vazio, os botões de agenda abrem o WhatsApp com pedido de agendamento.
  agendaUrl: "",
  agendaMensagem: "Olá! Gostaria de agendar um atendimento com a Almeida Advocacia.",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Av.+Cidade+do+M%C3%A9xico%2C+424%2C+Cuiab%C3%A1+-+MT%2C+78060-598",
  dados: { publicacoes: "data/publicacoes.json", noticias: "data/noticias.json" }
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const waLink = (msg) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
const fmtData = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y) return "";
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${String(d).padStart(2, "0")} ${meses[m - 1]} ${y}`;
};
const byDate = (a, b) => String(b.data).localeCompare(String(a.data));
const leitura = (pub) => {
  const txt = (pub.conteudo || []).map((b) => (typeof b === "string" ? b : b.h || "")).join(" ");
  return Math.max(1, Math.round(txt.split(/\s+/).length / 200));
};

/* ---------- links de WhatsApp, agenda e mapa ---------- */
function wireLinks() {
  $$(".js-whats").forEach((a) => (a.href = waLink(CONFIG.whatsappMensagem)));
  $$(".js-agenda").forEach((a) => (a.href = CONFIG.agendaUrl || waLink(CONFIG.agendaMensagem)));
  $$(".js-map").forEach((a) => (a.href = CONFIG.mapsUrl));
}

/* ---------- menu no celular ---------- */
function wireMenu() {
  const header = $(".site-header");
  const btn = $("#menu-btn");
  btn.addEventListener("click", () => {
    const open = header.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  });
  $$("#nav a").forEach((a) => a.addEventListener("click", () => {
    header.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }));
}

/* ---------- dados ---------- */
const store = { publicacoes: null, noticias: null };
async function load(kind) {
  if (store[kind]) return store[kind];
  try {
    const r = await fetch(CONFIG.dados[kind], { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    store[kind] = (await r.json()).sort(byDate);
  } catch (e) {
    store[kind] = [];
    console.warn("Não foi possível carregar", kind, e);
  }
  return store[kind];
}

/* ---------- renderização ---------- */
const markSvg = () => (document.querySelector(".brand svg")?.outerHTML || "").replace("<svg ", '<svg class="cover-mark" ');
function pubItem(p) {
  const capa = p.capa ? `<img src="${esc(p.capa)}" alt="" loading="lazy">` : markSvg();
  return `<a class="pub" href="#pub-${esc(p.id)}">
    <div class="pub-cover">${capa}<span>${esc(p.area)}</span></div>
    <div class="pub-body">
      <p class="pub-meta"><time datetime="${esc(p.data)}">${fmtData(p.data)}</time> · ${leitura(p)} min de leitura</p>
      <h3>${esc(p.titulo)}</h3>
      <p>${esc(p.resumo)}</p>
    </div>
  </a>`;
}
function newsItem(n) {
  return `<article class="item">
    <div class="item-meta"><span class="tag">${esc(n.area)}</span><time datetime="${esc(n.data)}">${fmtData(n.data)}</time></div>
    <div class="item-body">
      <h3>${esc(n.titulo)}</h3>
      <p>${esc(n.resumo)}</p>
      <p class="source">Fonte: ${esc(n.fonte)} · <a class="item-link" href="${esc(n.url)}" target="_blank" rel="noopener">Ler na fonte</a></p>
    </div>
  </article>`;
}
const emptyMsg = (t) => `<p class="empty">${t}</p>`;

async function renderHome() {
  const [pubs, news] = await Promise.all([load("publicacoes"), load("noticias")]);
  $("#home-pubs").innerHTML = pubs.length ? pubs.slice(0, 3).map(pubItem).join("") : emptyMsg("As primeiras publicações estarão disponíveis em breve.");
  $("#home-news").innerHTML = news.length ? news.slice(0, 3).map(newsItem).join("") : emptyMsg("As notícias estarão disponíveis em breve.");
}

let filtroArea = "Todas";
async function renderPubs() {
  const pubs = await load("publicacoes");
  const areas = ["Todas", ...new Set(pubs.map((p) => p.area))];
  $("#pub-filters").innerHTML = areas.map((a) => `<button type="button" class="chip" data-area="${esc(a)}" aria-pressed="${a === filtroArea}">${esc(a)}</button>`).join("");
  $$("#pub-filters .chip").forEach((b) => b.addEventListener("click", () => { filtroArea = b.dataset.area; renderPubs(); }));
  const lista = filtroArea === "Todas" ? pubs : pubs.filter((p) => p.area === filtroArea);
  $("#all-pubs").innerHTML = lista.length ? lista.map(pubItem).join("") : emptyMsg("Nenhuma publicação nesta área por enquanto.");
}

async function renderNews() {
  const news = await load("noticias");
  $("#all-news").innerHTML = news.length ? news.map(newsItem).join("") : emptyMsg("As notícias estarão disponíveis em breve.");
}

async function renderArticle(id) {
  const pubs = await load("publicacoes");
  const p = pubs.find((x) => x.id === id);
  const el = $("#article");
  if (!p) {
    el.innerHTML = `<a class="back" href="#publicacoes">← Publicações</a><h1>Publicação não encontrada</h1><p class="lede">O artigo pode ter sido removido ou o endereço está incompleto.</p>`;
    return;
  }
  const corpo = (p.conteudo || []).map((b) => (typeof b === "string" ? `<p>${esc(b)}</p>` : `<h2>${esc(b.h)}</h2>`)).join("");
  el.innerHTML = `<a class="back" href="#publicacoes">← Publicações</a>
    <p class="eyebrow">${esc(p.area)}</p>
    <h1>${esc(p.titulo)}</h1>
    <p class="byline">${esc(p.autor || "Almeida Advocacia")} · <time datetime="${esc(p.data)}">${fmtData(p.data)}</time> · ${leitura(p)} min de leitura</p>
    <p class="lede">${esc(p.resumo)}</p>
    <div class="prose">${corpo}</div>
    <p class="disclaimer">Texto de caráter informativo, que não constitui parecer nem substitui a análise do caso concreto por profissional habilitado. Para tratar de uma situação específica, <a class="js-whats" href="${waLink(CONFIG.whatsappMensagem)}" target="_blank" rel="noopener">fale com o escritório</a>.</p>`;
  document.title = `${p.titulo} | Almeida Advocacia`;
}

/* ---------- navegação por âncora ---------- */
const VIEWS = ["home", "publicacoes", "noticias", "artigo", "perfil"];
function show(view) {
  VIEWS.forEach((v) => ($(`#view-${v}`).hidden = v !== view));
  $$("#nav a").forEach((a) => {
    const atual = (a.dataset.route === view && view !== "home");
    if (atual) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (view !== "artigo" && view !== "perfil") document.title = "Almeida Advocacia";
}
async function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h === "publicacoes") { show("publicacoes"); window.scrollTo(0, 0); return renderPubs(); }
  if (h === "noticias") { show("noticias"); window.scrollTo(0, 0); return renderNews(); }
  if (h === "perfil") { show("perfil"); window.scrollTo(0, 0); document.title = "Trajetória | Almeida Advocacia"; return; }
  if (h.startsWith("pub-")) { show("artigo"); window.scrollTo(0, 0); return renderArticle(h.slice(4)); }
  const wasHidden = $("#view-home").hidden;
  show("home");
  renderHome();
  const alvo = h && document.getElementById(h);
  if (alvo && h !== "inicio") requestAnimationFrame(() => alvo.scrollIntoView({ block: "start" }));
  else if (wasHidden || h === "inicio") window.scrollTo(0, 0);
}

wireLinks();
wireMenu();
window.addEventListener("hashchange", route);
route();
