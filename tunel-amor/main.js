import * as THREE from "three";

// La fuente manuscrita debe estar lista antes de dibujar las texturas de texto
try {
  await Promise.race([
    Promise.all([document.fonts.load('96px "Sue Ellen Francisco"'), document.fonts.load('24px "Sue Ellen Francisco"')]),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
} catch (e) {}

/* =====================================================================
   CONFIGURACIÓN  (edita aquí textos, cantidades y colores)
   ===================================================================== */
const PHRASES = [
  "Te amo demasiado", "Eres mi todo", "Eres mi vida", "Contigo hasta el fin",
  "Tu sonrisa ilumina mi mundo", "Juntos por siempre", "Amor eterno",
  "Amor infinito", "Mi corazón es tuyo", "Siempre contigo", "Mi todo eres tú",
];
const TEXT_COLORS = ["#d36bff", "#ff6ec7", "#b784ff", "#ff8fd0", "#c58bff"];
const HEART_COLORS = [0x8a1fd1, 0xc2187a, 0xff3fa4, 0x6a1b9a, 0xb5179e];

const COUNT_TEXT = 120;
const COUNT_STICKER = 46;
const COUNT_HEART = 26;
const COUNT_STARS = 1800;
const COUNT_SQUARES = 14;
const DEPTH = 90;             // largo del túnel
const RADIUS = 5.2;           // radio base del túnel

// Coloca tus imágenes en assets/stickers/ con estos nombres (PNG con fondo transparente).
const STICKER_FILES = Array.from({ length: 8 }, (_, i) => `assets/stickers/s${i + 1}.png`);
// Si una imagen no existe se usa uno de estos emojis como sustituto.
const STICKER_FALLBACK = ["🐱", "🐻", "🌸", "⭐", "🍯", "🐰", "💗", "🧸"];

/* =====================================================================
   UTILIDADES
   ===================================================================== */
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function heartPath(ctx, w, h, pad = 0) {
  const x = pad, y = pad, W = w - pad * 2, H = h - pad * 2;
  ctx.beginPath();
  ctx.moveTo(x + W / 2, y + H);
  ctx.bezierCurveTo(x - W * 0.15, y + H * 0.6, x - W * 0.05, y - H * 0.05, x + W * 0.28, y + H * 0.02);
  ctx.bezierCurveTo(x + W * 0.42, y + H * 0.04, x + W / 2, y + H * 0.16, x + W / 2, y + H * 0.26);
  ctx.bezierCurveTo(x + W / 2, y + H * 0.16, x + W * 0.58, y + H * 0.04, x + W * 0.72, y + H * 0.02);
  ctx.bezierCurveTo(x + W * 1.05, y - H * 0.05, x + W * 1.15, y + H * 0.6, x + W / 2, y + H);
  ctx.closePath();
}

/* Corazón de nebulosa con borde metálico (loader y modal) */
function drawNebulaHeart(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  heartPath(ctx, w, h, 14);
  ctx.clip();
  ctx.fillStyle = "#2a0a4a";
  ctx.fillRect(0, 0, w, h);
  const blobs = [
    ["#ff2d6f", 0.35, 0.35, 0.55], ["#ff5aa5", 0.6, 0.4, 0.45], ["#7a2cff", 0.5, 0.8, 0.5],
    ["#ff7a3d", 0.45, 0.55, 0.28], ["#3a8bff", 0.8, 0.7, 0.3], ["#c01bd8", 0.25, 0.7, 0.4],
  ];
  for (const [c, bx, by, br] of blobs) {
    const g = ctx.createRadialGradient(bx * w, by * h, 0, bx * w, by * h, br * w);
    g.addColorStop(0, c + "ee"); g.addColorStop(1, c + "00");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand(0.3, 1)})`;
    const s = Math.random() < 0.1 ? 2.2 : 1;
    ctx.fillRect(rand(0, w), rand(0, h), s, s);
  }
  ctx.restore();
  // borde metálico
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#f2f2f2"); grad.addColorStop(0.35, "#8a8a8a");
  grad.addColorStop(0.6, "#e8e0d0"); grad.addColorStop(1, "#6e6e6e");
  heartPath(ctx, w, h, 14);
  ctx.lineWidth = 7; ctx.strokeStyle = grad; ctx.lineJoin = "round"; ctx.stroke();
  heartPath(ctx, w, h, 19);
  ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.stroke();
}

/* Mano de píxeles del loader */
function drawPixelHand(canvas) {
  const art = [
    "......##........",
    ".....#WW#.......",
    ".....#WW#.......",
    ".....#WW#.......",
    ".....#WW###.....",
    ".....#WW#WW###..",
    ".##..#WW#WW#WW#.",
    "#WW###WWWWWWWW#.",
    "#WWW#WWWWWWWWW#.",
    ".#WWWWWWWWWWWW#.",
    "..#WWWWWWWWWWW#.",
    "..#WWWWWWWWWW#..",
    "...#WWWWWWWWW#..",
    "...#WWWWWWWW#...",
    "....#WWWWWWW#...",
    "....#########...",
  ];
  const ctx = canvas.getContext("2d");
  canvas.width = 16; canvas.height = 16;
  art.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === ".") return;
    ctx.fillStyle = c === "#" ? "#111" : "#fff";
    ctx.fillRect(x, y, 1, 1);
  }));
}

/* Texto neón → textura */
function makeTextTexture(text, color) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const fs = 96;
  ctx.font = `${fs}px "Sue Ellen Francisco", "Gochi Hand", cursive`;
  const tw = Math.ceil(ctx.measureText(text).width);
  c.width = tw + 80; c.height = fs + 80;
  ctx.font = `${fs}px "Sue Ellen Francisco", "Gochi Hand", cursive`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = color; ctx.shadowBlur = 28;
  ctx.fillStyle = color;
  ctx.fillText(text, c.width / 2, c.height / 2);
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ffe6f7";
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: c.width / c.height };
}

function emojiTexture(emoji) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.font = "100px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(emoji, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,90,190,.95)");
  g.addColorStop(0.35, "rgba(200,30,140,.55)");
  g.addColorStop(1, "rgba(120,0,90,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function starTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "#fff"); g.addColorStop(0.4, "rgba(255,255,255,.7)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

/* Radio de un hexágono en función del ángulo (da la forma de túnel poligonal) */
function hexRadius(a, R) {
  const seg = Math.PI / 3;
  const m = ((a % seg) + seg) % seg;
  return (R * Math.cos(Math.PI / 6)) / Math.cos(m - seg / 2);
}

/* =====================================================================
   ESCENA
   ===================================================================== */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 18, DEPTH * 0.92);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);
camera.position.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const pl = new THREE.PointLight(0xff5fc0, 60, 40);
pl.position.set(0, 0, -2);
camera.add(pl);
scene.add(camera);

// Resplandor del fondo del túnel
const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture(), transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
}));
glow.scale.set(60, 60, 1);
glow.position.set(0, 0, -DEPTH * 0.55);
scene.add(glow);

const items = []; // todo lo que viaja por el túnel

function placeOnTunnel(obj, spread = 1) {
  const a = Math.random() * Math.PI * 2;
  const r = hexRadius(a, RADIUS) * rand(0.45, 1.25) * spread;
  obj.position.set(Math.cos(a) * r, Math.sin(a) * r, -Math.random() * DEPTH);
  return a;
}

/* ---- Frases ---- */
for (let i = 0; i < COUNT_TEXT; i++) {
  const phrase = pick(PHRASES);
  const { tex, aspect } = makeTextTexture(phrase, pick(TEXT_COLORS));
  const h = rand(0.5, 1.1) * (Math.random() < 0.12 ? 1.9 : 1);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(h * aspect, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  const a = placeOnTunnel(mesh, 1.05);
  const alongWall = Math.random() < 0.7;
  mesh.rotation.z = alongWall ? a + Math.PI / 2 + rand(-0.12, 0.12) : rand(-Math.PI, Math.PI);
  mesh.rotation.y = rand(-0.5, 0.5);
  items.push({ obj: mesh, kind: "text", spin: rand(-0.05, 0.05) });
  scene.add(mesh);
}

/* ---- Stickers ---- */
const loader = new THREE.TextureLoader();
function loadSticker(i) {
  return new Promise((res) => {
    loader.load(
      STICKER_FILES[i], (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); },
      undefined, () => res(emojiTexture(STICKER_FALLBACK[i % STICKER_FALLBACK.length]))
    );
  });
}
const stickerTextures = await Promise.all(STICKER_FILES.map((_, i) => loadSticker(i)));

for (let i = 0; i < COUNT_STICKER; i++) {
  const tex = pick(stickerTextures);
  const s = rand(0.8, 2.1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(s, s, 1);
  placeOnTunnel(sp, 0.95);
  items.push({ obj: sp, kind: "sticker", rot: rand(-0.35, 0.35), spin: rand(-0.4, 0.4), bob: Math.random() * 6 });
  scene.add(sp);
}

/* ---- Corazones 3D ---- */
const heartShape = new THREE.Shape();
heartShape.moveTo(0, -0.5);
heartShape.bezierCurveTo(-0.9, 0.1, -0.5, 0.75, 0, 0.3);
heartShape.bezierCurveTo(0.5, 0.75, 0.9, 0.1, 0, -0.5);
const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.25, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.08, bevelSegments: 3 });
heartGeo.center();
for (let i = 0; i < COUNT_HEART; i++) {
  const mat = new THREE.MeshStandardMaterial({
    color: pick(HEART_COLORS), roughness: 0.35, metalness: 0.25, emissive: 0x330033, transparent: true,
  });
  const m = new THREE.Mesh(heartGeo, mat);
  const s = rand(0.5, 1.8);
  m.scale.set(s, s, s);
  placeOnTunnel(m, 1.0);
  m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
  items.push({ obj: m, kind: "heart", tumble: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)) });
  scene.add(m);
}

/* ---- Cuadrados grises translúcidos (como en el original) ---- */
for (let i = 0; i < COUNT_SQUARES; i++) {
  const s = rand(0.12, 0.6);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(s, s),
    new THREE.MeshBasicMaterial({ color: 0xbdbdbd, transparent: true, opacity: rand(0.35, 0.7), depthWrite: false })
  );
  placeOnTunnel(m, 1.1);
  items.push({ obj: m, kind: "square" });
  scene.add(m);
}

/* ---- Estrellas ---- */
const starPos = new Float32Array(COUNT_STARS * 3);
for (let i = 0; i < COUNT_STARS; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * RADIUS * 1.5;
  starPos[i * 3] = Math.cos(a) * r;
  starPos[i * 3 + 1] = Math.sin(a) * r;
  starPos[i * 3 + 2] = -Math.random() * DEPTH;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
  size: 0.16, map: starTexture(), transparent: true, depthWrite: false, color: 0xffffff,
}));
scene.add(stars);

/* =====================================================================
   INTERACCIÓN
   ===================================================================== */
const speedEl = document.getElementById("speed");
let drag = { x: 0, y: 0, tx: 0, ty: 0, down: false, lx: 0, ly: 0 };

addEventListener("pointerdown", (e) => {
  if (e.target.closest(".controls, #openMsg, #modal, #loader")) return;
  drag.down = true; drag.lx = e.clientX; drag.ly = e.clientY;
});
addEventListener("pointermove", (e) => {
  if (!drag.down) return;
  drag.tx += (e.clientX - drag.lx) * 0.004;
  drag.ty += (e.clientY - drag.ly) * 0.004;
  drag.tx = THREE.MathUtils.clamp(drag.tx, -0.6, 0.6);
  drag.ty = THREE.MathUtils.clamp(drag.ty, -0.6, 0.6);
  drag.lx = e.clientX; drag.ly = e.clientY;
});
addEventListener("pointerup", () => (drag.down = false));

const modal = document.getElementById("modal");
document.getElementById("openMsg").onclick = () => modal.classList.remove("hidden");
document.getElementById("closeMsg").onclick = () => modal.classList.add("hidden");

const music = document.getElementById("music");
function startMusic() { music.volume = 0.8; music.play().catch(() => {}); }
addEventListener("pointerdown", startMusic, { once: true });

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 1 ? 78 : 62;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

/* =====================================================================
   LOOP
   ===================================================================== */
const clock = new THREE.Clock();
let speed = 8;
const fadeFar = DEPTH * 0.9;

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const targetSpeed = 2 + (speedEl.value / 100) * 22;
  speed += (targetSpeed - speed) * Math.min(1, dt * 3);

  // el túnel se acerca a la cámara
  for (const it of items) {
    const o = it.obj;
    o.position.z += speed * dt;
    if (o.position.z > 1.5) {
      o.position.z -= DEPTH;
      const a = Math.random() * Math.PI * 2;
      const r = hexRadius(a, RADIUS) * rand(0.45, 1.25);
      o.position.x = Math.cos(a) * r; o.position.y = Math.sin(a) * r;
      if (it.kind === "text") o.rotation.z = a + Math.PI / 2 + rand(-0.12, 0.12);
    }
    const d = -o.position.z;
    const fade = THREE.MathUtils.clamp((fadeFar - d) / 25, 0, 1) * THREE.MathUtils.clamp((d - 0.3) / 2.5, 0, 1);
    if (o.material) o.material.opacity = (it.kind === "square" ? 0.5 : 1) * fade;

    if (it.kind === "heart") {
      o.rotation.x += it.tumble.x * dt; o.rotation.y += it.tumble.y * dt; o.rotation.z += it.tumble.z * dt;
    } else if (it.kind === "sticker") {
      o.material.rotation = it.rot + Math.sin(t * 0.8 + it.bob) * 0.18;
    } else if (it.kind === "text") {
      o.rotation.z += it.spin * dt;
    }
  }

  // estrellas
  const p = starGeo.attributes.position.array;
  for (let i = 0; i < COUNT_STARS; i++) {
    p[i * 3 + 2] += speed * dt;
    if (p[i * 3 + 2] > 1) p[i * 3 + 2] -= DEPTH;
  }
  starGeo.attributes.position.needsUpdate = true;

  // el brillo del fondo respira (y se nota más al ir lento)
  const slow = 1 - THREE.MathUtils.clamp((speed - 2) / 22, 0, 1);
  glow.material.opacity = 0.25 + 0.2 * Math.sin(t * 0.6) + slow * 0.35;

  // cámara: giro lento + arrastre
  drag.x += (drag.tx - drag.x) * 0.08;
  drag.y += (drag.ty - drag.y) * 0.08;
  camera.rotation.z = t * 0.18 + Math.sin(t * 0.3) * 0.25;
  camera.rotation.y = -drag.x;
  camera.rotation.x = -drag.y;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

/* =====================================================================
   ARRANQUE (loader → escena)
   ===================================================================== */
drawNebulaHeart(document.getElementById("loaderHeart"));
drawNebulaHeart(document.getElementById("modalHeart"));
drawPixelHand(document.getElementById("pixelHand"));

await document.fonts.ready;
const startButton = document.getElementById("startTunnel");
const startLabel = startButton.querySelector(".loader-text");
startLabel.textContent = "TOCA PARA INICIAR";
startButton.disabled = false;
startButton.addEventListener("click", () => {
  startButton.disabled = true;
  animate();
  const loadingScreen = document.getElementById("loader");
  loadingScreen.classList.add("out");
  setTimeout(() => loadingScreen.remove(), 1000);
}, { once: true });
