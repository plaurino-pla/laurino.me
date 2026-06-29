// laurino.me — una biblioteca infinita
// A first-person walk through an endless Borgesian library: a rotunda of
// bookshelves wrapping a vertiginous central shaft that recedes into glowing
// fog above and below. Each lit book is a part of Pablo Laurino's life.
// Procedural low-poly, zero downloaded assets. Three.js + Vite.

import * as THREE from 'three';
import './style.css';

/* ----------------------------------------------------------------------------
 * Palette — warm sepia, brass, aged leather, lamp-light
 * ------------------------------------------------------------------------- */
const C = {
  ink: 0x140d07,
  fog: 0x17100a,
  wood: 0x3a2616,
  woodDk: 0x241608,
  woodHi: 0x5a3d22,
  brass: 0xc79a4e,
  brassHi: 0xeccb84,
  paper: 0xe9ddc2,
  lamp: 0xffcb82,
  lampCore: 0xfff1d4,
  stone: 0x564433,
  // leather book-spine tones for the shelves
  spines: [0x7c3b2e, 0x3f5640, 0x355a6e, 0x8a6a2e, 0x5a3c5e, 0x2f4858, 0x9a7b3a, 0x6e2f2a, 0x4a3b2a, 0x864d2a],
};

/* ----------------------------------------------------------------------------
 * Content — the walkable autobiography. Each entry is a lit book on the shelves.
 * Everything personal lives here: names, one-liners, links, accents. Edit freely.
 * order = the sequence you meet them walking the ring (publica.la sits opposite
 * the entrance, glowing across the abyss).
 * ------------------------------------------------------------------------- */
function hexToRgba(hex, a) {
  const h = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  return `rgba(${(h >> 16) & 255}, ${(h >> 8) & 255}, ${h & 255}, ${a})`;
}

const BOOKS = [
  { name: 'pablo laurino', emoji: '👋', kind: 'quién soy',
    text: 'construí publica.la durante más de una década. hoy vivo inventando cosas nuevas. buenos aires, roma, scicli, cascais — las ciudades que llevo conmigo.',
    url: 'mailto:plaurino@publica.la', linkLabel: 'escribime', accent: '#e9ddc2' },
  { name: 'rd3', emoji: '📣', kind: 'el comienzo',
    text: 'mi primera agencia de marketing. acá empezó todo.',
    url: null, accent: '#d98a4a' },
  { name: 'mandarino', emoji: '汉', kind: 'proyecto',
    text: 'aprender mandarín como si fuera una historia, no una tarea.',
    url: 'https://publicala.github.io/mandarino/pitch/', accent: '#e0a93b' },
  { name: 'corpus', emoji: '📖', kind: 'proyecto',
    text: 'comprensión lectora con ia, adentro de los libros mismos.',
    url: 'https://corpus.la', accent: '#5b8fb0' },
  { name: 'invest like a girl', emoji: '💸', kind: 'proyecto',
    text: 'educación financiera para mujeres, en brasil.',
    url: 'https://www.investlikeagirl.com.br', accent: '#cc6688' },
  { name: 'perfo', emoji: '📊', kind: 'proyecto',
    text: 'performance reviews que no le arruinan la semana a nadie.',
    url: 'https://perforeview.com', accent: '#6f9e6a' },
  { name: 'publica.la', emoji: '📚', kind: 'lo más grande que construí', hero: true,
    text: 'la empresa que construí durante más de 10 años: una plataforma de publishing digital que usan editoriales de todo el mundo.',
    url: 'https://publica.la', accent: '#e6c45c' },
  { name: 'gufo', emoji: '🦉', kind: 'proyecto',
    text: 'búsqueda instantánea para encontrar el libro dentro del catálogo.',
    url: null, accent: '#9c7bd1' },
  { name: 'fridgechef', emoji: '🍳', kind: 'proyecto',
    text: 'decime qué hay en la heladera y te digo qué cocinar.',
    url: null, accent: '#c45b4a' },
  { name: "bib's crew", emoji: '☕', kind: 'proyecto',
    text: 'el café que estamos comprando, contado para inversores.',
    url: null, accent: '#b5763b' },
  { name: 'buenos aires', emoji: '🏙️', kind: 'casa · 0 km',
    text: 'caballito. la ciudad donde todo esto pasa.',
    url: null, accent: '#74b6db' },
  { name: 'roma', emoji: '🏛️', kind: 'un lugar · 11.100 km',
    text: 'la ciudad eterna. piedra dorada, pinos y el sol cayendo bajo.',
    url: null, accent: '#c46a3f' },
  { name: 'scicli', emoji: '⛪', kind: 'un lugar · 11.500 km',
    text: 'el sur profundo de sicilia. barroco color miel y el mar ahí nomás.',
    url: null, accent: '#d9b768' },
  { name: 'cascais', emoji: '🌊', kind: 'un lugar · 9.900 km',
    text: 'el atlántico portugués. luz blanca, viento de mar y olas.',
    url: null, accent: '#3f8aa0' },
  { name: 'los míos', emoji: '🤍', kind: 'familia',
    text: 'lo que sostiene todo lo demás.',
    url: null, accent: '#e0b48a' },
];

/* ----------------------------------------------------------------------------
 * Library geometry constants (world units ≈ metres)
 * ------------------------------------------------------------------------- */
const RI = 8.4; // inner radius — edge of the central well / railing
const RO = 14.5; // outer radius — the bookshelf wall
const RB = 13.4; // radius at which the lit "life" books sit
const LEVEL_H = 6; // height of one gallery level
const EYE = 1.7;
const LV_UP = 9; // gallery levels visible above the player
const LV_DN = 8; // gallery levels visible below
const WALK_IN = RI + 1.0; // player clamp (inner)
const WALK_OUT = RO - 1.1; // player clamp (outer)
const BAYS = 12; // shelf bays / pilasters per level

/* ----------------------------------------------------------------------------
 * Renderer / scene / camera
 * ------------------------------------------------------------------------- */
const canvas = document.getElementById('scene');
const isCoarse = matchMedia('(pointer: coarse)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !isCoarse, powerPreference: 'high-performance' });
} catch (e) {
  webglFailed();
  throw e;
}
if (!renderer || !renderer.getContext()) {
  webglFailed();
  throw new Error('WebGL unavailable');
}

renderer.setPixelRatio(Math.min(devicePixelRatio, isCoarse ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.fog);
scene.fog = new THREE.FogExp2(C.fog, 0.019);

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 600);
camera.position.set(0, 40, 0.01);

function webglFailed() {
  document.getElementById('intro')?.classList.add('hidden');
  document.getElementById('fallback')?.classList.remove('hidden');
}

/* ----------------------------------------------------------------------------
 * Lighting — warm ambient + the oculus key + a few lamp point-lights
 * ------------------------------------------------------------------------- */
function addLighting() {
  scene.add(new THREE.HemisphereLight(0xffcf94, 0x140d06, 0.55));
  scene.add(new THREE.AmbientLight(0x6a4a26, 0.6));

  // soft key falling down the central shaft (from the oculus)
  const key = new THREE.DirectionalLight(0xffe6b6, 0.7);
  key.position.set(6, 60, 6);
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);

  // a handful of warm lamp point-lights around the player's level
  const n = isCoarse ? 4 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = new THREE.PointLight(C.lamp, 26, 26, 2.0);
    p.position.set(Math.cos(a) * (RO - 1.2), LEVEL_H * 0.58, Math.sin(a) * (RO - 1.2));
    scene.add(p);
  }
  // a glow welling up from far below (lights the lower galleries down the shaft)
  const under = new THREE.PointLight(0xc78a36, 60, 140, 1.5);
  under.position.set(0, -LV_DN * LEVEL_H * 0.55, 0);
  scene.add(under);
}

/* ----------------------------------------------------------------------------
 * Bookshelf texture — rows of leather spines (tiles around every level)
 * ------------------------------------------------------------------------- */
const hx = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

function makeBooksTexture() {
  const w = 1024;
  const h = 512;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const x = cv.getContext('2d');
  x.fillStyle = hx(C.woodDk);
  x.fillRect(0, 0, w, h);
  const shelves = 4;
  const sh = h / shelves;
  for (let s = 0; s < shelves; s++) {
    const y0 = s * sh;
    // shelf back shadow
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.fillRect(0, y0, w, sh);
    // books standing on the shelf
    let bx = 4 + Math.random() * 8;
    while (bx < w - 10) {
      const bw = 9 + Math.random() * 20;
      const bh = sh * (0.62 + Math.random() * 0.3);
      const by = y0 + sh - bh - sh * 0.06;
      const col = C.spines[(Math.random() * C.spines.length) | 0];
      x.fillStyle = hx(col);
      x.fillRect(bx, by, bw - 2, bh);
      // highlight + shadow edges
      x.fillStyle = 'rgba(255,255,255,0.08)';
      x.fillRect(bx, by, 2, bh);
      x.fillStyle = 'rgba(0,0,0,0.28)';
      x.fillRect(bx + bw - 4, by, 2, bh);
      // a faint gold title band
      if (bw > 14 && Math.random() > 0.4) {
        x.fillStyle = hexToRgba(C.brassHi, 0.5);
        x.fillRect(bx + 2, by + bh * 0.32, bw - 6, 2.5);
      }
      bx += bw;
    }
    // the wooden shelf board
    x.fillStyle = hx(C.woodHi);
    x.fillRect(0, y0 + sh - sh * 0.05, w, sh * 0.05);
    x.fillStyle = 'rgba(0,0,0,0.4)';
    x.fillRect(0, y0 + sh - 2, w, 2);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(13, 1);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

/* ----------------------------------------------------------------------------
 * The library — stacked gallery levels around an open central shaft
 * ------------------------------------------------------------------------- */
function levelYs() {
  const ys = [];
  for (let k = -LV_DN; k <= LV_UP; k++) ys.push(k * LEVEL_H);
  return ys;
}

function addLibrary() {
  const ys = levelYs();
  const L = ys.length;
  const d = new THREE.Object3D();

  // ---- floors (annular rings; the open centre is the shaft) ----
  const floorGeo = new THREE.RingGeometry(RI, RO + 0.6, 64, 1);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({ color: C.woodDk, roughness: 0.55, metalness: 0.12 });
  const floors = new THREE.InstancedMesh(floorGeo, floorMat, L);
  ys.forEach((y, i) => {
    d.position.set(0, y, 0);
    d.rotation.set(0, 0, 0);
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    floors.setMatrixAt(i, d.matrix);
  });
  floors.instanceMatrix.needsUpdate = true;
  scene.add(floors);

  // ---- bookshelf wall (a tube per level, seen from the inside) ----
  const wallGeo = new THREE.CylinderGeometry(RO, RO, LEVEL_H, 64, 1, true);
  const wallMat = new THREE.MeshStandardMaterial({
    map: makeBooksTexture(), roughness: 0.92, metalness: 0.0, side: THREE.BackSide,
  });
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, L);
  ys.forEach((y, i) => {
    d.position.set(0, y + LEVEL_H / 2, 0);
    d.rotation.set(0, 0, 0);
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    walls.setMatrixAt(i, d.matrix);
  });
  walls.instanceMatrix.needsUpdate = true;
  scene.add(walls);

  // ---- pilasters (vertical columns dividing the bays) ----
  const pilGeo = new THREE.BoxGeometry(0.5, LEVEL_H, 0.42);
  const pilMat = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.8, flatShading: true });
  const pilasters = new THREE.InstancedMesh(pilGeo, pilMat, L * BAYS);
  let pi = 0;
  ys.forEach((y) => {
    for (let j = 0; j < BAYS; j++) {
      const a = (j / BAYS) * Math.PI * 2;
      d.position.set(Math.cos(a) * (RO - 0.25), y + LEVEL_H / 2, Math.sin(a) * (RO - 0.25));
      d.rotation.set(0, -a, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      pilasters.setMatrixAt(pi++, d.matrix);
    }
  });
  pilasters.instanceMatrix.needsUpdate = true;
  scene.add(pilasters);

  // ---- railings around the well (one torus per level) ----
  const railGeo = new THREE.TorusGeometry(RI, 0.08, 8, 80);
  railGeo.rotateX(Math.PI / 2);
  const railMat = new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.4, metalness: 0.7 });
  const rails = new THREE.InstancedMesh(railGeo, railMat, L);
  ys.forEach((y, i) => {
    d.position.set(0, y + 1.05, 0);
    d.rotation.set(0, 0, 0);
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    rails.setMatrixAt(i, d.matrix);
  });
  rails.instanceMatrix.needsUpdate = true;
  scene.add(rails);

  // ---- lamp sconces (emissive; these are the lights receding into the fog) ----
  const lampGeo = new THREE.SphereGeometry(0.2, 10, 8);
  const lampMat = new THREE.MeshStandardMaterial({ color: C.lampCore, emissive: C.lamp, emissiveIntensity: 2.3 });
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, L * BAYS);
  let li = 0;
  ys.forEach((y) => {
    for (let j = 0; j < BAYS; j++) {
      const a = (j / BAYS) * Math.PI * 2 + Math.PI / BAYS;
      d.position.set(Math.cos(a) * (RO - 0.7), y + LEVEL_H * 0.62, Math.sin(a) * (RO - 0.7));
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
      d.updateMatrix();
      lamps.setMatrixAt(li++, d.matrix);
    }
  });
  lamps.instanceMatrix.needsUpdate = true;
  scene.add(lamps);

  // ---- balusters under the railing on the player's level ----
  const balGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6);
  const balMat = new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.5, metalness: 0.6 });
  const NB = 60;
  const balusters = new THREE.InstancedMesh(balGeo, balMat, NB);
  for (let i = 0; i < NB; i++) {
    const a = (i / NB) * Math.PI * 2;
    d.position.set(Math.cos(a) * RI, 0.55, Math.sin(a) * RI);
    d.rotation.set(0, 0, 0);
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    balusters.setMatrixAt(i, d.matrix);
  }
  balusters.instanceMatrix.needsUpdate = true;
  scene.add(balusters);

  // ---- a brass inlay ring at the well's edge on the player floor ----
  const inlay = new THREE.Mesh(
    new THREE.TorusGeometry(RI, 0.12, 8, 80),
    new THREE.MeshStandardMaterial({ color: C.brassHi, roughness: 0.3, metalness: 0.85 })
  );
  inlay.rotation.x = Math.PI / 2;
  inlay.position.y = 0.02;
  scene.add(inlay);

  // ---- the oculus glow far above + an abyss glow far below ----
  const oculus = new THREE.Mesh(
    new THREE.CircleGeometry(RI * 0.92, 48),
    new THREE.MeshBasicMaterial({ color: 0xffe9c0, fog: true, transparent: true, opacity: 0.92 })
  );
  oculus.rotation.x = Math.PI / 2;
  oculus.position.y = LV_UP * LEVEL_H + 3;
  scene.add(oculus);
  const abyss = new THREE.Mesh(
    new THREE.CircleGeometry(RI * 0.95, 48),
    new THREE.MeshBasicMaterial({ color: 0xc78a3a, fog: true, transparent: true, opacity: 0.95 })
  );
  abyss.rotation.x = -Math.PI / 2;
  abyss.position.y = -LV_DN * LEVEL_H - 2;
  scene.add(abyss);
}

/* ----------------------------------------------------------------------------
 * Text plaques (book labels, signage) — readable from both sides
 * ------------------------------------------------------------------------- */
function makeLabelTexture(text, opts = {}) {
  const { fg = '#f0e6cf', bg = '#1c130a', border = hexToRgba(C.brass, 0.85), family = 'ui-monospace, "SF Mono", Menlo, monospace', weight = '600' } = opts;
  const fontPx = 60;
  let cv = document.createElement('canvas');
  let ctx = cv.getContext('2d');
  ctx.font = `${weight} ${fontPx}px ${family}`;
  const tw = ctx.measureText(text).width;
  cv.width = Math.max(96, Math.ceil(tw + 84));
  cv.height = 128;
  ctx = cv.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, cv.width - 8, cv.height - 8);
  }
  ctx.font = `${weight} ${fontPx}px ${family}`;
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 3);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { tex, aspect: cv.width / cv.height };
}

function makePlaque(text, height, opts = {}) {
  const { tex, aspect } = makeLabelTexture(text, opts);
  const mat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.5, metalness: opts.metalness ?? 0.2, side: THREE.FrontSide, transparent: true,
  });
  const geo = new THREE.PlaneGeometry(height * aspect, height);
  // two single-sided faces back-to-back so the label reads from BOTH sides
  const front = new THREE.Mesh(geo, mat);
  const back = new THREE.Mesh(geo, mat);
  back.rotation.y = Math.PI;
  front.add(back);
  return front;
}

// a book cover: dark leather, a glowing accent border + a cream title.
// used as both map and emissiveMap, so the border + title glow (the colour is
// the book's identity) while the leather stays dark — readable near and far.
function makeBookCover(name, accentHex) {
  const w = 512;
  const h = 720;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const x = cv.getContext('2d');
  x.fillStyle = '#241509';
  x.fillRect(0, 0, w, h);
  x.strokeStyle = accentHex;
  x.lineWidth = 16;
  x.strokeRect(36, 36, w - 72, h - 72);
  x.lineWidth = 4;
  x.strokeRect(62, 62, w - 124, h - 124);
  x.fillStyle = '#f4ead0';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const words = name.split(' ');
  const size = words.length > 2 ? 78 : 96;
  x.font = `700 ${size}px Georgia, "Times New Roman", serif`;
  const lines = [];
  let line = '';
  for (const wd of words) {
    const t = line ? line + ' ' + wd : wd;
    if (x.measureText(t).width > w - 160 && line) {
      lines.push(line);
      line = wd;
    } else line = t;
  }
  if (line) lines.push(line);
  const lh = size * 1.16;
  lines.forEach((ln, i) => x.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * lh));
  x.fillStyle = accentHex;
  x.beginPath();
  x.arc(w / 2, h - 120, 8, 0, Math.PI * 2);
  x.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

/* ----------------------------------------------------------------------------
 * The lit "life" books — one per BOOKS entry, glowing on the shelves
 * ------------------------------------------------------------------------- */
const glowBooks = [];

function addLifeBooks() {
  const n = BOOKS.length;
  // leave a gap at the entrance angle (0) so the player doesn't spawn inside a book
  const span = Math.PI * 2 * (1 - 1 / (n + 2));
  const start = (Math.PI * 2) / (n + 2);

  BOOKS.forEach((b, i) => {
    const a = start + (i / (n - 1)) * span;
    const hero = !!b.hero;
    const accent = new THREE.Color(b.accent);
    const g = new THREE.Group();

    // a book whose cover shows its title set in glowing light (emissive map),
    // facing the viewer — reads as a lit, titled book up close and from afar.
    const bw = hero ? 1.5 : 1.1;
    const bh = hero ? 2.05 : 1.55;
    const coverTex = makeBookCover(b.name, b.accent);
    // unlit + tone-map-exempt so the cover shows exactly as drawn (the cream
    // title + accent border read crisply, near and far). two back-to-back faces
    // so it reads correctly (not mirrored) from the reader's side.
    // group local +Z points toward the well/reader (Object3D.lookAt orients +Z
    // at the target). so the cover faces +Z (no rotation) and is the frontmost
    // element; the body box sits behind it toward the shelf.
    const coverMat = new THREE.MeshBasicMaterial({ map: coverTex, side: THREE.FrontSide, toneMapped: false, fog: true });
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), coverMat);
    cover.position.z = 0.26; // frontmost, facing the reader
    g.add(cover);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(bw + 0.06, bh + 0.06, 0.5),
      new THREE.MeshStandardMaterial({ color: accent.clone().multiplyScalar(0.3), roughness: 0.75 })
    );
    body.position.z = -0.12; // behind the cover, extending back toward the shelf
    g.add(body);

    // a soft additive rim-glow behind the book + a point light pooling below
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(bw * 2.2, bh * 1.7),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    halo.position.z = -0.32; // behind the book, glowing around its edges
    g.add(halo);
    const pl = new THREE.PointLight(b.accent, hero ? 9 : 5, hero ? 11 : 6.5, 2);
    pl.position.set(0, -0.4, 0.6); // pooling in front of / below the book
    g.add(pl);

    if (hero) {
      const lectern = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.5, 0.12, 1.1), new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.4, metalness: 0.7 }));
      lectern.position.set(0, -(bh / 2 + 0.12), 0); // centred under the book, visible to the reader
      g.add(lectern);
    }

    g.position.set(Math.cos(a) * RB, EYE + (hero ? 0.25 : 0.0), Math.sin(a) * RB);
    g.lookAt(0, g.position.y, 0); // the glowing cover faces the centre / the walker
    scene.add(g);

    glowBooks.push({ g, base: g.position.y, phase: i * 1.3, halo, haloBase: halo.material.opacity });
    registerInteractable(Math.cos(a) * (RB - 0.4), Math.sin(a) * (RB - 0.4), hero ? 4.2 : 3.3, {
      kind: b.kind, name: b.name, text: b.text, emoji: b.emoji, url: b.url, accent: b.accent, linkLabel: b.linkLabel,
    });
  });
}

/* ----------------------------------------------------------------------------
 * Floating books drifting in the shaft + dust motes in the lamplight
 * ------------------------------------------------------------------------- */
const floaters = [];
function addFloatingBooks() {
  const n = isCoarse ? 5 : 9;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2.5 + Math.random() * 4.5;
    const tone = C.spines[(Math.random() * C.spines.length) | 0];
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.0, 0.18),
      new THREE.MeshStandardMaterial({ color: tone, roughness: 0.7, flatShading: true })
    );
    book.position.set(Math.cos(a) * r, -10 + Math.random() * 28, Math.sin(a) * r);
    book.rotation.set(Math.random(), Math.random() * 6, Math.random());
    scene.add(book);
    floaters.push({ g: book, spin: (Math.random() - 0.5) * 0.3, bob: 0.3 + Math.random() * 0.5, phase: Math.random() * 6, baseY: book.position.y });
  }
}

let motes = null;
function addMotes() {
  const n = isCoarse ? 120 : 240;
  const pos = new Float32Array(n * 3);
  const data = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = RI + Math.random() * (RO - RI);
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = -4 + Math.random() * 10;
    pos[i * 3 + 2] = Math.sin(a) * r;
    data.push({ vy: 0.12 + Math.random() * 0.25, sw: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.28 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const cx = cv.getContext('2d');
  const grd = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,228,170,0.9)');
  grd.addColorStop(1, 'rgba(255,200,120,0)');
  cx.fillStyle = grd;
  cx.fillRect(0, 0, 32, 32);
  const mat = new THREE.PointsMaterial({ size: 0.13, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0.8, color: 0xffd9a0, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  motes = { pts, pos, data, n };
}
function updateMotes(dt, t) {
  if (!motes) return;
  const { pos, data, n } = motes;
  for (let i = 0; i < n; i++) {
    pos[i * 3 + 1] += data[i].vy * dt;
    pos[i * 3] += Math.sin(t * data[i].sw + data[i].ph) * dt * 0.18;
    if (pos[i * 3 + 1] > 7) {
      const a = Math.random() * Math.PI * 2;
      const r = RI + Math.random() * (RO - RI);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = -5;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
  }
  motes.pts.geometry.attributes.position.needsUpdate = true;
}

/* ----------------------------------------------------------------------------
 * Proximity placards (projects / cities / family — the lit books)
 * ------------------------------------------------------------------------- */
const interactables = [];
function registerInteractable(x, z, r, data) {
  interactables.push({ x, z, r, leaveR: r + 2.4, data });
}

const cardEl = document.getElementById('card');
let activeIt = null;

function showCard(d) {
  const accent = d.accent || '#cdb9f2';
  cardEl.style.setProperty('--accent', accent);
  document.getElementById('cardEmoji').textContent = d.emoji || '•';
  document.getElementById('cardKicker').textContent = d.kind || '';
  document.getElementById('cardName').textContent = d.name || '';
  document.getElementById('cardText').textContent = d.text || '';
  const link = document.getElementById('cardLink');
  if (d.url) {
    link.href = d.url;
    link.innerHTML = `${d.linkLabel || 'abrir'} <span aria-hidden="true">→</span>`;
    const h = parseInt(accent.replace('#', ''), 16);
    const lum = (0.299 * ((h >> 16) & 255) + 0.587 * ((h >> 8) & 255) + 0.114 * (h & 255)) / 255;
    link.style.color = lum > 0.62 ? '#1c130a' : '#f0e6cf';
    link.classList.remove('hidden');
  } else {
    link.classList.add('hidden');
  }
  cardEl.classList.remove('hidden');
  const chip = document.getElementById('placeChip');
  if (chip) chip.textContent = `📖 ${d.name || 'la biblioteca'}`;
}
function hideCard() {
  cardEl.classList.add('hidden');
  const chip = document.getElementById('placeChip');
  if (chip) chip.textContent = '📖 la biblioteca';
}

function updateProximity() {
  if (!controls.active) return;
  const px = camera.position.x;
  const pz = camera.position.z;
  let best = null;
  let bestD = Infinity;
  for (const it of interactables) {
    const dd = Math.hypot(px - it.x, pz - it.z);
    const limit = activeIt === it ? it.leaveR : it.r;
    if (dd < limit && dd < bestD) {
      best = it;
      bestD = dd;
    }
  }
  if (best) {
    if (activeIt !== best) {
      activeIt = best;
      showCard(best.data);
    }
  } else if (activeIt) {
    activeIt = null;
    hideCard();
  }
}

/* ----------------------------------------------------------------------------
 * Build the world
 * ------------------------------------------------------------------------- */
function buildWorld() {
  addLighting();
  addLibrary();
  addLifeBooks();
  addFloatingBooks();
  addMotes();
}

/* ----------------------------------------------------------------------------
 * First-person controller — drag-to-look, WASD/arrows, touch hold-to-walk.
 * Bounded to the annular balcony (can't fall in the well or walk through shelves).
 * ------------------------------------------------------------------------- */
const controls = {
  yaw: Math.PI / 2, // look toward the centre / across the well
  pitch: -0.08,
  keys: new Set(),
  lookDX: 0,
  lookDY: 0,
  touchWalk: false,
  vel: new THREE.Vector3(),
  bob: 0,
  active: false,
  SENS: 0.0028,
  SPEED: 5.6,
  PITCH_MIN: -0.7,
  PITCH_MAX: 0.62,
};

function bindControls() {
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    controls.keys.add(e.code);
  });
  addEventListener('keyup', (e) => controls.keys.delete(e.code));
  addEventListener('blur', () => controls.keys.clear());

  let dragId = null;
  let lx = 0;
  let ly = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (dragId !== null) return;
    dragId = e.pointerId;
    lx = e.clientX;
    ly = e.clientY;
    if (e.pointerType === 'touch') controls.touchWalk = true;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dragId) return;
    controls.lookDX += e.clientX - lx;
    controls.lookDY += e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
  });
  const end = (e) => {
    if (e.pointerId !== dragId) return;
    dragId = null;
    controls.touchWalk = false;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function updateControls(dt) {
  const c = controls;
  c.yaw -= c.lookDX * c.SENS;
  c.pitch -= c.lookDY * c.SENS;
  c.pitch = Math.max(c.PITCH_MIN, Math.min(c.PITCH_MAX, c.pitch));
  c.lookDX = 0;
  c.lookDY = 0;
  camera.quaternion.setFromEuler(new THREE.Euler(c.pitch, c.yaw, 0, 'YXZ'));

  if (!c.active) return;

  let fwd = 0;
  let strafe = 0;
  if (c.keys.has('KeyW') || c.keys.has('ArrowUp')) fwd += 1;
  if (c.keys.has('KeyS') || c.keys.has('ArrowDown')) fwd -= 1;
  if (c.keys.has('KeyD') || c.keys.has('ArrowRight')) strafe += 1;
  if (c.keys.has('KeyA') || c.keys.has('ArrowLeft')) strafe -= 1;
  if (c.touchWalk) fwd += 1;

  const fx = -Math.sin(c.yaw);
  const fz = -Math.cos(c.yaw);
  const rx = Math.cos(c.yaw);
  const rz = -Math.sin(c.yaw);
  const target = new THREE.Vector3(fx * fwd + rx * strafe, 0, fz * fwd + rz * strafe);
  if (target.lengthSq() > 1) target.normalize();
  target.multiplyScalar(c.SPEED);

  const a = 1 - Math.exp(-12 * dt);
  c.vel.lerp(target, a);

  const p = camera.position;
  p.x += c.vel.x * dt;
  p.z += c.vel.z * dt;

  // keep the player on the annular balcony (off the well, off the shelves)
  const r = Math.hypot(p.x, p.z) || 1e-4;
  if (r < WALK_IN) {
    p.x = (p.x / r) * WALK_IN;
    p.z = (p.z / r) * WALK_IN;
  } else if (r > WALK_OUT) {
    p.x = (p.x / r) * WALK_OUT;
    p.z = (p.z / r) * WALK_OUT;
  }

  const moving = c.vel.lengthSq() > 0.3;
  if (moving) c.bob += dt * 8;
  p.y = EYE + (moving ? Math.sin(c.bob) * 0.05 : 0);
}

/* ----------------------------------------------------------------------------
 * Ambient audio — hushed library: a warm low drone + soft page turns, reverbed
 * ------------------------------------------------------------------------- */
const audio = { ctx: null, master: null, on: false, pageTimer: null };

function makeImpulse(ctx, seconds, decay) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function startAudio() {
  if (audio.ctx) {
    audio.ctx.resume();
    return;
  }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  audio.ctx = ctx;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  audio.master = master;

  // roomy reverb for the cavernous library
  const verb = ctx.createConvolver();
  verb.buffer = makeImpulse(ctx, 3.2, 2.6);
  const verbGain = ctx.createGain();
  verbGain.gain.value = 0.5;
  verb.connect(verbGain).connect(master);

  // warm low drone (two detuned low tones through a lowpass)
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;
  lp.connect(master);
  lp.connect(verb);
  [55, 55.4, 82.5, 110].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.14;
    o.connect(g).connect(lp);
    o.start();
  });
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 90;
  lfo.connect(lfoG).connect(lp.frequency);
  lfo.start();

  // occasional soft page turn / whisper (filtered noise burst → reverb)
  const page = () => {
    if (!audio.on || !audio.ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = makeImpulse(ctx, 0.4, 1.2);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200 + Math.random() * 2600;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.04, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    n.connect(bp).connect(g);
    g.connect(verb);
    g.connect(master);
    n.start(t);
    n.stop(t + 0.45);
    audio.pageTimer = setTimeout(page, 2600 + Math.random() * 6000);
  };
  audio.pageTimer = setTimeout(page, 1800);
}

function setAudio(on) {
  audio.on = on;
  if (on) startAudio();
  if (audio.master && audio.ctx) {
    audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
    audio.master.gain.linearRampToValueAtTime(on ? 0.26 : 0.0, audio.ctx.currentTime + 0.6);
  }
  const btn = document.getElementById('sound');
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? '♪ sonido' : '♪ mudo';
}

/* ----------------------------------------------------------------------------
 * Loop
 * ------------------------------------------------------------------------- */
const timer = new THREE.Timer();
timer.connect(document);

function tick() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  if (cine.playing) updateIntro();
  else updateControls(dt);
  const t = timer.getElapsed();

  // breathe the books' glow + slowly drift the floating volumes
  for (const b of glowBooks) {
    b.halo.material.opacity = b.haloBase + Math.sin(t * 1.4 + b.phase) * 0.05;
    b.g.position.y = b.base + Math.sin(t * 0.6 + b.phase) * 0.04;
  }
  for (const f of floaters) {
    f.g.rotation.y += f.spin * dt;
    f.g.rotation.x += f.spin * dt * 0.4;
    f.g.position.y = f.baseY + Math.sin(t * 0.4 + f.phase) * f.bob;
  }
  updateMotes(dt, t);
  updateProximity();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ----------------------------------------------------------------------------
 * Resize
 * ------------------------------------------------------------------------- */
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, isCoarse ? 1.5 : 2));
}
addEventListener('resize', onResize);
addEventListener('orientationchange', () => setTimeout(onResize, 250));

/* ----------------------------------------------------------------------------
 * Cinematic entrance — a slow descent through the infinite shaft into the gallery
 * ------------------------------------------------------------------------- */
const SPAWN = { pos: new THREE.Vector3(WALK_OUT - 1.0, EYE, 0), yaw: Math.PI / 2, pitch: -0.08 };
const cine = {
  playing: false,
  start: 0,
  dur: 5.2,
  topY: 40,
  turns: 3, // full spiral turns on the way down (ends at the spawn angle)
  _up: new THREE.Vector3(0, 1, 0),
  _m: new THREE.Matrix4(),
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function lookQuat(pos, target) {
  cine._m.lookAt(pos, target, cine._up);
  return new THREE.Quaternion().setFromRotationMatrix(cine._m);
}

function introPose(p) {
  const u = easeInOut(p);
  const ang = u * cine.turns * Math.PI * 2; // 3 turns → ends at angle 0 (spawn)
  const rad = 1 + u * (SPAWN.pos.x - 1);
  const y = cine.topY + u * (EYE - cine.topY);
  const pos = new THREE.Vector3(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
  // look down the plunging shaft early, ease to the across-the-well view at the end
  const downQuat = lookQuat(pos, new THREE.Vector3(0, y - 16, 0));
  const spawnQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(SPAWN.pitch, SPAWN.yaw, 0, 'YXZ'));
  const blend = THREE.MathUtils.smoothstep(p, 0.62, 1);
  return { pos, quat: downQuat.slerp(spawnQuat, blend) };
}

function updateIntro() {
  const p = Math.min((performance.now() - cine.start) / 1000 / cine.dur, 1);
  const { pos, quat } = introPose(p);
  camera.position.copy(pos);
  camera.quaternion.copy(quat);
  if (p >= 1) finishIntro();
}

function startIntro() {
  cine.playing = true;
  cine.start = performance.now();
  controls.active = false;
  document.getElementById('cinematic').classList.remove('hidden');
}

function finishIntro() {
  if (!cine.playing) return;
  cine.playing = false;
  camera.position.copy(SPAWN.pos);
  controls.yaw = SPAWN.yaw;
  controls.pitch = SPAWN.pitch;
  controls.active = true;
  document.getElementById('cinematic').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  setTimeout(() => document.querySelector('.hint')?.classList.add('fade'), 9000);
}

// pause the intro clock if the tab is hidden mid-descent
let cineHiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (!cine.playing) return;
  if (document.hidden) cineHiddenAt = performance.now();
  else if (cineHiddenAt) {
    cine.start += performance.now() - cineHiddenAt;
    cineHiddenAt = 0;
  }
});

/* ----------------------------------------------------------------------------
 * Intro gate + boot
 * ------------------------------------------------------------------------- */
function enterScene() {
  if (controls.active || cine.playing) return;
  const intro = document.getElementById('intro');
  intro.classList.add('go');
  setTimeout(() => intro.remove(), 1100);
  setAudio(true);
  // motion-sensitive visitors skip the descent and arrive in the gallery
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    camera.position.copy(SPAWN.pos);
    controls.yaw = SPAWN.yaw;
    controls.pitch = SPAWN.pitch;
    controls.active = true;
    document.getElementById('hud').classList.remove('hidden');
    setTimeout(() => document.querySelector('.hint')?.classList.add('fade'), 9000);
    return;
  }
  startIntro();
}

function boot() {
  buildWorld();
  bindControls();
  updateControls(0);
  requestAnimationFrame(tick);
  window.__park = { camera, controls }; // tinkering hook

  const enterBtn = document.getElementById('enter');
  const loadline = document.getElementById('loadline');
  loadline.textContent = 'la biblioteca está abierta.';
  enterBtn.disabled = false;
  enterBtn.addEventListener('click', enterScene);
  addEventListener('keydown', (e) => {
    if ((e.code === 'Enter' || e.code === 'Space') && !controls.active && !cine.playing) enterScene();
    if (e.code === 'Escape' && cine.playing) finishIntro();
  });
  document.getElementById('skip').addEventListener('click', finishIntro);
  document.getElementById('cinematic').addEventListener('pointerdown', finishIntro);
  document.getElementById('sound').addEventListener('click', () => setAudio(!audio.on));
}

document.getElementById('enter').disabled = true;
boot();
