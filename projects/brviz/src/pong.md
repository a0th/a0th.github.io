---
title: Pong das Divas
toc: false
sidebar: false
header: false
footer: false
---

<style>
html, body { overscroll-behavior: none; }
.pong {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #0b0614;
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
.pong [hidden] { display: none !important; }
.pong canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}
.pong-tela {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  background: rgba(11, 6, 20, 0.92);
  touch-action: manipulation;
}
.pong-metade {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1rem;
  min-height: 0;
}
.pong-metade.topo { transform: rotate(180deg); }
.pong-titulo { font-size: 1.1rem; font-weight: 700; letter-spacing: 0.04em; }
.pong-divas {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.4rem;
  width: 100%;
  max-width: 32rem;
}
.pong-diva {
  appearance: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.35rem 0.05rem;
  border: 2px solid transparent;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.pong-diva img {
  width: 100%;
  max-width: 64px;
  aspect-ratio: 1;
  border: 2px solid var(--cor);
  border-radius: 50%;
}
.pong-diva strong { max-width: 100%; overflow: hidden; text-overflow: ellipsis; font-size: 0.7rem; }
.pong-diva span { font-size: 0.65rem; opacity: 0.7; }
.pong-diva[aria-pressed="true"] {
  border-color: var(--cor);
  background: color-mix(in srgb, var(--cor) 25%, transparent);
  box-shadow: 0 0 18px var(--cor);
}
.pong-efeito { min-height: 1.3em; font-size: 0.85rem; text-align: center; opacity: 0.85; }
.pong-meio {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem 0.75rem;
  padding: 0.6rem 1rem;
  border-block: 1px solid rgba(255, 255, 255, 0.12);
}
.pong-botao {
  appearance: none;
  padding: 0.7rem 2rem;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff4fa3, #a64dff);
  color: #fff;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
}
.pong-botao.secundario { background: rgba(255, 255, 255, 0.12); font-size: 0.95rem; }
.pong-botao:disabled { opacity: 0.35; cursor: default; }
.pong-aviso {
  flex-basis: 100%;
  max-width: 36rem;
  margin: 0;
  font-size: 0.6rem;
  line-height: 1.3;
  text-align: center;
  opacity: 0.55;
}
.pong-retrato {
  width: min(36vw, 150px);
  border: 4px solid var(--cor);
  border-radius: 50%;
  box-shadow: 0 0 40px var(--cor);
}
.pong-resultado { font-size: 1.4rem; font-weight: 800; text-align: center; }
.pong-placar { font-size: 1rem; opacity: 0.75; }
</style>

```js
const DIVAS = [
  {id: "ahri", nome: "Ahri", cor: "#ff4fa3", poder: "Charme", efeito: "A bola desacelera ao chegar na sua raquete", img: await FileAttachment("./data/divas/ahri.png").url()},
  {id: "evelynn", nome: "Evelynn", cor: "#a64dff", poder: "Camuflagem", efeito: "A bola some por 0,5 s depois da sua rebatida", img: await FileAttachment("./data/divas/evelynn.png").url()},
  {id: "akali", nome: "Akali", cor: "#3dffb5", poder: "Mortalha", efeito: "Sua raquete fica maior por 4 s", img: await FileAttachment("./data/divas/akali.png").url()},
  {id: "kaisa", nome: "Kai'Sa", cor: "#4d8dff", poder: "Evolução", efeito: "Sua próxima rebatida sai mais rápida", img: await FileAttachment("./data/divas/kaisa.png").url()},
  {id: "seraphine", nome: "Seraphine", cor: "#ffc94d", poder: "Escudo", efeito: "Um escudo segura um ponto contra você", img: await FileAttachment("./data/divas/seraphine.png").url()},
];
```

```js
const PONTOS_VITORIA = 7;
const RECARGA = 10;
const MORTALHA = 4;
const CAMUFLAGEM = 0.5;
const ANGULO_MAX = Math.PI / 3;
const DUPLO_TOQUE_MS = 300;
const AVISO_RIOT =
  "Jogo de fã gratuito e sem fins comerciais. Pong das Divas não é endossado pela Riot Games e não reflete as opiniões da Riot Games nem de ninguém oficialmente envolvido na produção ou no gerenciamento das propriedades da Riot Games. Riot Games e todas as propriedades associadas são marcas comerciais ou registradas da Riot Games, Inc.";

const ac = new AbortController();
const {signal} = ac;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const root = html`<div class="pong"></div>`;
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
root.append(canvas);

const novoJogador = () => ({diva: null, x: 0, w: 0, score: 0, charge: 0, armed: false, wideUntil: 0, hitAt: -1, lastTap: 0, lastTapX: 0});
const players = [novoJogador(), novoJogador()];
const ball = {x: 0, y: 0, dx: 0, dy: 1, speed: 0, boost: 1, charm: false, hiddenUntil: 0, hitter: null, trail: []};
let fase = "select";
let clock = 0;
let faseAte = 0;
let receiver = 0;
let shieldFlash = [-1, -1];
let ultimoBip = 0;

let W = 0;
let H = 0;
const paddleY = (i) => (i === 0 ? H * 0.07 : H * 0.93);
const paddleH = () => Math.max(10, H * 0.016);
const ballR = () => Math.max(6, Math.min(W, H) * 0.022);
const baseW = () => W * 0.24;
const baseSpeed = () => H * 0.6;
const maxSpeed = () => H * 1.7;

function resize() {
  const {width: w, height: h} = canvas.getBoundingClientRect();
  if (!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (W && H) {
    for (const p of players) p.x *= w / W;
    ball.x *= w / W;
    ball.y *= h / H;
    ball.speed *= h / H;
    ball.trail = [];
  }
  W = w;
  H = h;
}
const ro = new ResizeObserver(resize);
ro.observe(canvas);

// Som

let audio = null;
function ligarAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!audio && AC) audio = new AC();
  audio?.resume?.();
}
function tom(f0, f1, dur, tipo = "square", vol = 0.06, atraso = 0) {
  if (!audio) return;
  const t0 = audio.currentTime + atraso;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audio.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
const som = {
  raquete: () => tom(520, 780, 0.07),
  parede: () => tom(300, 260, 0.05, "triangle"),
  ponto: () => tom(440, 110, 0.35, "sawtooth"),
  poder: () => tom(400, 1200, 0.25, "sine", 0.08),
  escudo: () => tom(900, 300, 0.2, "triangle", 0.08),
  bip: (f = 660) => tom(f, f, 0.08, "sine", 0.07),
  vitoria: () => [523, 659, 784, 1047].forEach((f, k) => tom(f, f, 0.18, "triangle", 0.08, k * 0.12)),
};

// Tela cheia e tela sempre acesa

let lock = null;
async function manterAceso() {
  try {
    lock = (await navigator.wakeLock?.request("screen")) ?? null;
  } catch {}
}
function telaCheia() {
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const pedir = root.requestFullscreen ?? root.webkitRequestFullscreen;
  try {
    pedir?.call(root, {navigationUI: "hide"})?.catch?.(() => {});
  } catch {}
}
document.addEventListener(
  "visibilitychange",
  () => {
    if (document.visibilityState === "visible" && fase !== "select" && (!lock || lock.released)) manterAceso();
  },
  {signal}
);

// Partida

function centralizarBola() {
  Object.assign(ball, {x: W / 2, y: H / 2, speed: 0, boost: 1, charm: false, hiddenUntil: 0, hitter: null, trail: []});
}

function comecarPartida() {
  for (const p of players) {
    Object.assign(p, {x: W / 2, w: baseW(), score: 0, charge: 0.3, armed: false, wideUntil: 0, hitAt: -1, lastTap: 0});
  }
  shieldFlash = [-1, -1];
  receiver = Math.random() < 0.5 ? 0 : 1;
  centralizarBola();
  fase = "countdown";
  faseAte = clock + 3;
  ultimoBip = 4;
  mostrar(null);
}

function sacar() {
  const a = (Math.random() * 2 - 1) * 0.45;
  centralizarBola();
  ball.dx = Math.sin(a);
  ball.dy = (receiver === 0 ? -1 : 1) * Math.cos(a);
  ball.speed = baseSpeed();
  fase = "play";
}

function ponto(i) {
  const p = players[i];
  p.score++;
  navigator.vibrate?.(120);
  som.ponto();
  centralizarBola();
  if (p.score >= PONTOS_VITORIA) {
    fase = "win";
    som.vitoria();
    navigator.vibrate?.([100, 60, 200]);
    mostrar(telaVitoria(i));
  } else {
    receiver = 1 - i;
    fase = "serve";
    faseAte = clock + 1.2;
  }
}

function ativarPoder(i) {
  const p = players[i];
  if (p.charge < 1 || p.armed || clock < p.wideUntil) return;
  p.charge = 0;
  if (p.diva.id === "akali") p.wideUntil = clock + MORTALHA;
  else p.armed = true;
  som.poder();
  navigator.vibrate?.(30);
}

function rebater(i, xHit, surf) {
  const p = players[i];
  const r = ballR();
  const a = clamp((xHit - p.x) / (p.w / 2), -1, 1) * ANGULO_MAX;
  ball.dx = Math.sin(a);
  ball.dy = (i === 0 ? 1 : -1) * Math.cos(a);
  ball.x = xHit;
  ball.y = i === 0 ? surf + r : surf - r;
  ball.speed = Math.min(ball.speed * 1.05, maxSpeed());
  ball.boost = 1;
  ball.charm = false;
  ball.hitter = i;
  p.hitAt = clock;
  if (p.armed && p.diva.id === "kaisa") {
    ball.boost = 1.6;
    p.armed = false;
  }
  if (p.armed && p.diva.id === "evelynn") {
    ball.hiddenUntil = clock + CAMUFLAGEM;
    p.armed = false;
  }
  som.raquete();
}

function passo(h) {
  const r = ballR();
  const v = ball.speed * ball.boost * (ball.charm ? 0.4 : 1);
  const px = ball.x;
  const py = ball.y;
  ball.x += ball.dx * v * h;
  ball.y += ball.dy * v * h;

  if (ball.x < r) {
    ball.x = r;
    ball.dx = Math.abs(ball.dx);
    som.parede();
  } else if (ball.x > W - r) {
    ball.x = W - r;
    ball.dx = -Math.abs(ball.dx);
    som.parede();
  }

  const alvo = ball.dy < 0 ? 0 : 1;
  const p = players[alvo];

  if (p.armed && p.diva.id === "ahri" && !ball.charm && Math.abs(ball.y - paddleY(alvo)) < H * 0.4) {
    ball.charm = true;
    p.armed = false;
  }

  const surf = alvo === 0 ? paddleY(0) + paddleH() / 2 : paddleY(1) - paddleH() / 2;
  const antes = alvo === 0 ? py - r : py + r;
  const agora = alvo === 0 ? ball.y - r : ball.y + r;
  const cruzou = alvo === 0 ? antes >= surf && agora <= surf : antes <= surf && agora >= surf;
  if (cruzou && agora !== antes) {
    const xHit = px + (ball.x - px) * ((surf - antes) / (agora - antes));
    if (Math.abs(xHit - p.x) <= p.w / 2 + r) return rebater(alvo, xHit, surf);
  }

  const naBorda = alvo === 0 ? ball.y - r <= 0 : ball.y + r >= H;
  if (naBorda && p.armed && p.diva.id === "seraphine") {
    ball.y = alvo === 0 ? r : H - r;
    ball.dy = -ball.dy;
    p.armed = false;
    shieldFlash[alvo] = clock;
    som.escudo();
    return;
  }

  if (ball.y < -r) ponto(1);
  else if (ball.y > H + r) ponto(0);
}

function atualizar(dt) {
  clock += dt;
  if (fase === "select" || fase === "win") return;

  for (const p of players) {
    if (fase === "play" && !p.armed && clock >= p.wideUntil) p.charge = Math.min(1, p.charge + dt / RECARGA);
    const alvoW = baseW() * (clock < p.wideUntil ? 1.7 : 1);
    p.w += (alvoW - p.w) * Math.min(1, dt * 10);
    p.x = clamp(p.x, p.w / 2, W - p.w / 2);
  }

  if (fase === "countdown") {
    const n = Math.ceil(faseAte - clock);
    if (n < ultimoBip && n > 0) som.bip();
    ultimoBip = n;
    if (clock >= faseAte) {
      som.bip(990);
      sacar();
    }
  } else if (fase === "serve" && clock >= faseAte) {
    sacar();
  }

  if (fase === "play") {
    let resto = dt;
    while (resto > 0 && fase === "play") {
      const h = Math.min(resto, 1 / 240);
      passo(h);
      resto -= h;
    }
    if (clock < ball.hiddenUntil) ball.trail.length = 0;
    else {
      ball.trail.push({x: ball.x, y: ball.y});
      if (ball.trail.length > 14) ball.trail.shift();
    }
  }
}

// Desenho

function orientado(i, desenhar) {
  if (i === 1) return desenhar();
  ctx.save();
  ctx.translate(W, H);
  ctx.rotate(Math.PI);
  desenhar();
  ctx.restore();
}

function hud(i) {
  const p = players[i];
  const cor = p.diva.cor;
  const base = H / 2;

  ctx.fillStyle = cor;
  ctx.globalAlpha = 0.9;
  ctx.font = `800 ${Math.round(H * 0.07)}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(String(p.score), W - 20, base + 14);
  ctx.globalAlpha = 1;

  const cx = 34;
  const cy = base + 40;
  const pronto = p.charge >= 1 && !p.armed && clock >= p.wideUntil;
  const ativo = p.armed || clock < p.wideUntil;
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = cor;
  ctx.shadowColor = cor;
  ctx.shadowBlur = pronto || ativo ? 10 + 6 * Math.sin(clock * 8) : 0;
  ctx.beginPath();
  ctx.arc(cx, cy, 16, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (ativo ? 1 : p.charge));
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.fillText(p.diva.poder, cx + 26, cy - 7);
  ctx.font = "12px system-ui, sans-serif";
  ctx.globalAlpha = 0.7;
  ctx.fillText(ativo ? "ativo" : pronto ? "toque 2 vezes" : "recarregando", cx + 26, cy + 9);
  ctx.globalAlpha = 1;

  if (fase === "countdown") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = `800 ${Math.round(H * 0.1)}px system-ui, sans-serif`;
    ctx.fillText(String(Math.max(1, Math.ceil(faseAte - clock))), W / 2, H * 0.72);
    ctx.font = "14px system-ui, sans-serif";
    ctx.globalAlpha = 0.75;
    ctx.fillText("Arraste para mover · 2 toques: poder", W / 2, H * 0.8);
    ctx.globalAlpha = 1;
  }
}

function desenhar() {
  ctx.fillStyle = "#0b0614";
  ctx.fillRect(0, 0, W, H);
  if (fase === "select") return;

  for (const i of [0, 1]) {
    const cor = players[i].diva.cor;
    const g = ctx.createLinearGradient(0, i === 0 ? 0 : H, 0, H / 2);
    g.addColorStop(0, cor + "40");
    g.addColorStop(1, cor + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, i === 0 ? 0 : H / 2, W, H / 2);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  players.forEach((p, i) => {
    const cor = p.diva.cor;
    const flash = clock - shieldFlash[i] < 0.3;
    if ((p.armed && p.diva.id === "seraphine") || flash) {
      ctx.strokeStyle = flash ? "#fff" : cor;
      ctx.shadowColor = cor;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, i === 0 ? 2 : H - 2);
      ctx.lineTo(W, i === 0 ? 2 : H - 2);
      ctx.stroke();
    }

    const h = paddleH();
    ctx.fillStyle = clock - p.hitAt < 0.1 ? "#fff" : cor;
    ctx.shadowColor = cor;
    ctx.shadowBlur = p.armed ? 18 + 8 * Math.sin(clock * 10) : 14;
    ctx.beginPath();
    ctx.roundRect(p.x - p.w / 2, paddleY(i) - h / 2, p.w, h, h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  const r = ballR();
  if (fase === "play" && clock >= ball.hiddenUntil) {
    const cor = ball.hitter == null ? "#ffffff" : players[ball.hitter].diva.cor;
    ball.trail.forEach((t, k) => {
      const f = (k + 1) / ball.trail.length;
      ctx.globalAlpha = 0.45 * f;
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r * (0.4 + 0.6 * f), 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.shadowColor = ball.charm ? players[ball.dy < 0 ? 0 : 1].diva.cor : cor;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (fase === "countdown" || fase === "serve") {
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(clock * 10);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  orientado(0, () => hud(0));
  orientado(1, () => hud(1));
}

let raf = 0;
let ultimo = null;
function quadro(ts) {
  raf = requestAnimationFrame(quadro);
  const dt = ultimo == null ? 0 : Math.min((ts - ultimo) / 1000, 0.05);
  ultimo = ts;
  if (!W || !H) return;
  atualizar(dt);
  desenhar();
}
raf = requestAnimationFrame(quadro);

// Toques: cada pointerId fica preso à metade em que começou

const toques = new Map();
canvas.addEventListener(
  "pointerdown",
  (e) => {
    if (fase !== "countdown" && fase !== "serve" && fase !== "play") return;
    e.preventDefault();
    const {top, height} = canvas.getBoundingClientRect();
    const i = e.clientY - top < height / 2 ? 0 : 1;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    toques.set(e.pointerId, {i, x: e.clientX});
    const p = players[i];
    const t = performance.now();
    if (t - p.lastTap < DUPLO_TOQUE_MS && Math.abs(e.clientX - p.lastTapX) < 60) {
      ativarPoder(i);
      p.lastTap = 0;
    } else {
      p.lastTap = t;
      p.lastTapX = e.clientX;
    }
  },
  {signal}
);
canvas.addEventListener(
  "pointermove",
  (e) => {
    const toque = toques.get(e.pointerId);
    if (!toque) return;
    const p = players[toque.i];
    p.x = clamp(p.x + (e.clientX - toque.x) * 1.25, p.w / 2, W - p.w / 2);
    toque.x = e.clientX;
  },
  {signal}
);
for (const tipo of ["pointerup", "pointercancel", "lostpointercapture"]) {
  canvas.addEventListener(tipo, (e) => toques.delete(e.pointerId), {signal});
}

// Telas em HTML: escolha de diva e vitória

let telaAtual = null;
function mostrar(tela) {
  telaAtual?.remove();
  telaAtual = tela;
  if (tela) root.append(tela);
}

function telaEscolha() {
  const jogar = html`<button class="pong-botao" disabled>Jogar</button>`;
  const atualizarJogar = () => (jogar.disabled = !players[0].diva || !players[1].diva);

  const metade = (i) => {
    const efeito = html`<div class="pong-efeito"></div>`;
    const botoes = DIVAS.map((d) => {
      const b = html`<button class="pong-diva" style=${`--cor:${d.cor}`} aria-pressed="false">
        <img src=${d.img} alt="" draggable="false"><strong>${d.nome}</strong><span>${d.poder}</span>
      </button>`;
      const escolher = () => {
        players[i].diva = d;
        for (const o of botoes) o.setAttribute("aria-pressed", String(o === b));
        efeito.textContent = `${d.poder}: ${d.efeito}`;
        atualizarJogar();
      };
      b.addEventListener("pointerdown", escolher);
      b.addEventListener("click", (e) => e.detail === 0 && escolher());
      return b;
    });
    const atual = players[i].diva;
    if (atual) botoes[DIVAS.indexOf(atual)].dispatchEvent(new PointerEvent("pointerdown"));
    return html`<div class=${i === 0 ? "pong-metade topo" : "pong-metade"}>
      <div class="pong-titulo">Jogador ${i + 1} · escolha sua diva</div>
      <div class="pong-divas">${botoes}</div>
      ${efeito}
    </div>`;
  };

  jogar.addEventListener("click", () => {
    ligarAudio();
    telaCheia();
    manterAceso();
    comecarPartida();
  });

  return html`<div class="pong-tela">
    ${metade(0)}
    <div class="pong-meio">${jogar}<p class="pong-aviso">${AVISO_RIOT}</p></div>
    ${metade(1)}
  </div>`;
}

function telaVitoria(vencedor) {
  const d = players[vencedor].diva;
  const placar = (i) => `${players[i].score} × ${players[1 - i].score}`;
  const metade = (i) => html`<div class=${i === 0 ? "pong-metade topo" : "pong-metade"}>
    <img class="pong-retrato" src=${d.img} alt=${d.nome} style=${`--cor:${d.cor}`} draggable="false">
    <div class="pong-resultado">${i === vencedor ? `Você venceu com ${d.nome}!` : `${d.nome} venceu`}</div>
    <div class="pong-placar">${placar(i)}</div>
  </div>`;
  const revanche = html`<button class="pong-botao">Revanche</button>`;
  const trocar = html`<button class="pong-botao secundario">Trocar divas</button>`;
  revanche.addEventListener("click", () => {
    manterAceso();
    comecarPartida();
  });
  trocar.addEventListener("click", () => {
    fase = "select";
    mostrar(telaEscolha());
  });
  return html`<div class="pong-tela">${metade(0)}<div class="pong-meio">${revanche}${trocar}</div>${metade(1)}</div>`;
}

mostrar(telaEscolha());

invalidation.then(() => {
  cancelAnimationFrame(raf);
  ac.abort();
  ro.disconnect();
  lock?.release().catch(() => {});
  audio?.close();
  if (document.fullscreenElement === root) document.exitFullscreen().catch(() => {});
});

display(root);
```
