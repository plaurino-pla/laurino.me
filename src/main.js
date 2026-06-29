// laurino.me — una caminata por el Parque Centenario
// First-person walkable 3D scene. Procedural low-poly, zero downloaded assets.
// Inspired by malamud.ar. Three.js + Vite.

import * as THREE from 'three';
import './style.css';

/* ----------------------------------------------------------------------------
 * Palette  (November golden-hour, jacarandás in bloom — researched)
 * ------------------------------------------------------------------------- */
const C = {
  skyTop: 0x7fa8c9,
  skyHorizon: 0xf4d8b0,
  sun: 0xffe3b0,
  haze: 0xd9c9c4,
  cityFar: 0xa7a0ae,

  grassSun: 0x8fb857,
  grassMid: 0x6e9e45,
  grassShade: 0x3f6b3e,

  path: 0xc9a876,
  pathEdge: 0xa8855b,

  waterSurf: 0x5e8c8a,
  waterDeep: 0x3c5e5e,
  waterHi: 0xbfd8ce,

  leafSun: 0x7ca64a,
  leafMid: 0x56823b,
  leafShade: 0x2f5232,
  jacaSun: 0x9c7bd1,
  jacaCore: 0x6e4fa8,
  petal: 0xb79bd8,
  tipaGold: 0xe8c45c,
  trunk: 0x8a6b4a,
  trunkDk: 0x4e3b2a,

  stone: 0xcfc6b4,
  stoneShade: 0x9a917f,
  museum: 0xd8c29a,
  museumShade: 0xa8916c,
  roof: 0x7a5b43,
  bronze: 0x6e9c86, // verdigris

  feriaRed: 0xc45b4a,
  feriaBlue: 0x5b8fb0,
  feriaOchre: 0xe0a93b,

  lampGlow: 0xffd27a,
  birdLight: 0xf2eee6,
  iron: 0x21241f,
};

/* ----------------------------------------------------------------------------
 * Park geometry constants (world units ≈ metres)
 * ------------------------------------------------------------------------- */
const PARK_R = 92; // grass disc radius
const WALK_R = 89; // player clamp radius
const LAKE = { x: 0, z: 0, r: 24 }; // lagoon (collision circle)
const GROUND = 248; // ground plane size
const EYE = 1.7;

// landmark footprints — used both to keep trees away and to block the player
const OBSTACLES = [
  { x: 0, z: -78, r: 25 }, // museum (wide)
  { x: -48, z: -64, r: 16 }, // amphitheatre
  { x: -74, z: 6, r: 9 }, // observatory
  { x: 60, z: 30, r: 6 }, // calesita
  { x: 44, z: 42, r: 3.4 }, // La Aurora monument
  { x: 0, z: -25, r: 2.6 }, // Victoria Alada
  { x: -22, z: 46, r: 3 }, // Buenos Aires — obelisco
  { x: -58, z: 30, r: 3 }, // Roma — column
  { x: -38, z: 64, r: 3.2 }, // Scicli — campanile
  { x: 60, z: 4, r: 3 }, // Cascais — lighthouse
  { x: 40, z: 50, r: 4 }, // rd3 — atelier
];

const isOnWater = (x, z) =>
  (x - LAKE.x) ** 2 + (z - LAKE.z) ** 2 < (LAKE.r + 5) ** 2;
const inObstacle = (x, z, pad = 2) =>
  OBSTACLES.some((o) => (x - o.x) ** 2 + (z - o.z) ** 2 < (o.r + pad) ** 2);

// the 8 radial spoke angles (must match the painted path wheel)
const SPOKES = Array.from({ length: 8 }, (_, k) => (k / 8) * Math.PI * 2 + Math.PI / 8);
function nearPath(x, z) {
  const r = Math.hypot(x, z);
  if (Math.abs(r - 84) < 5.5) return true; // outer ring
  if (Math.abs(r - 31) < 5.5) return true; // inner (lake) ring
  if (Math.abs(x) < 8) return true; // central N–S avenue (the hero axis)
  if (r > 31 && r < 84) {
    const ang = Math.atan2(z, x);
    for (const sa of SPOKES) {
      let d = Math.abs(ang - sa);
      d = Math.min(d, Math.PI * 2 - d);
      if (d * r < 4) return true;
    }
  }
  return false;
}

/* ----------------------------------------------------------------------------
 * Content — the walkable portrait (projects, the institution, who I am, family)
 * Everything personal lives here: names, one-liners, links, accents. Edit freely.
 * ------------------------------------------------------------------------- */
function hexToRgba(hex, a) {
  const h = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  return `rgba(${(h >> 16) & 255}, ${(h >> 8) & 255}, ${h & 255}, ${a})`;
}

// the feria stalls along the entrance promenade — each one is a project.
// slot = side R(+x)/L(-x) + row 0..3 (row 0 is nearest the entrance).
const PROJECTS = [
  { slot: 'R0', name: 'mandarino', emoji: '汉', kind: 'proyecto',
    text: 'aprender mandarín como si fuera una historia, no una tarea.',
    url: 'https://publicala.github.io/mandarino/pitch/', accent: '#e0a93b' },
  { slot: 'L0', name: 'corpus', emoji: '📖', kind: 'proyecto',
    text: 'comprensión lectora con ia, adentro de los libros mismos.',
    url: 'https://corpus.la', accent: '#5b8fb0' },
  { slot: 'R1', name: 'invest like a girl', emoji: '💸', kind: 'proyecto',
    text: 'educación financiera para mujeres, en brasil.',
    url: 'https://www.investlikeagirl.com.br', accent: '#cc6688' },
  { slot: 'L1', name: 'perfo', emoji: '📊', kind: 'proyecto',
    text: 'performance reviews que no le arruinan la semana a nadie.',
    url: 'https://perforeview.com', accent: '#6f9e6a' },
  { slot: 'R2', name: 'gufo', emoji: '🦉', kind: 'proyecto',
    text: 'búsqueda instantánea para encontrar el libro dentro del catálogo.',
    url: null, accent: '#9c7bd1' },
  { slot: 'L2', name: 'fridgechef', emoji: '🍳', kind: 'proyecto',
    text: 'decime qué hay en la heladera y te digo qué cocinar.',
    url: null, accent: '#c45b4a' },
  { slot: 'R3', name: "bib's crew", emoji: '☕', kind: 'proyecto',
    text: 'el café que estamos comprando, contado para inversores.',
    url: null, accent: '#b5763b' },
  { slot: 'L3', name: 'este parque', emoji: '🌳', kind: 'hecho a mano',
    text: 'lo que estás caminando: three.js, cero assets, todo geometría.',
    url: 'https://github.com/plaurino-pla/laurino.me', linkLabel: 'ver el código', accent: '#8fb857' },
];

// promenade rows (z descending = farther from the entrance), x offset
const STALL_X = 6.8;
const STALL_Z = [49.5, 44, 38.5, 33];

// the museum = the magnum opus; the observatory = who I am; warm tone for family
const INSTITUTION = {
  name: 'publica.la', emoji: '📚', kind: 'lo más grande que construí',
  text: 'la empresa que construí durante más de 10 años: una plataforma de publishing digital que usan editoriales de todo el mundo.',
  url: 'https://publica.la', accent: '#d8c29a',
};
const ABOUT = {
  name: 'pablo laurino', emoji: '👋', kind: 'quién soy',
  text: 'construí publica.la durante más de una década. hoy vivo inventando cosas nuevas, a la vuelta de este parque. buenos aires, roma, scicli, cascais — las ciudades que llevo conmigo.',
  url: 'mailto:plaurino@publica.la', linkLabel: 'escribime', accent: '#cdb9f2',
};
const FAMILY_ACCENT = '#e0b48a';

// rd3 — where the whole story started (a small atelier near the entrance)
const RD3 = {
  name: 'rd3', emoji: '📣', kind: 'mi primera agencia', x: 40, z: 50, accent: '#d98a4a',
  text: 'mi primera agencia de marketing. acá empezó todo.', url: null,
};

// the cities of my life — each one a small monument you can walk up to.
// (copy is evocative-of-the-place; swap in your own story.)
const PLACES = [
  { name: 'buenos aires', km: 'casa · 0 km', x: -22, z: 46, accent: '#74b6db', emoji: '🏙️', kind: 'casa',
    text: 'caballito. estás parado, justo ahora, en el parque de mi barrio.' },
  { name: 'roma', km: '11.100 km', x: -58, z: 30, accent: '#c46a3f', emoji: '🏛️', kind: 'un lugar',
    text: 'la ciudad eterna. piedra dorada, pinos y el sol cayendo bajo.' },
  { name: 'scicli', km: '11.500 km', x: -38, z: 64, accent: '#d9b768', emoji: '⛪', kind: 'un lugar',
    text: 'el sur profundo de sicilia. barroco color miel y el mar ahí nomás.' },
  { name: 'cascais', km: '9.900 km', x: 60, z: 4, accent: '#3f8aa0', emoji: '🌊', kind: 'un lugar',
    text: 'el atlántico portugués. luz blanca, viento de mar y olas.' },
];

/* ----------------------------------------------------------------------------
 * Renderer / scene / camera
 * ------------------------------------------------------------------------- */
const canvas = document.getElementById('scene');
const isCoarse = matchMedia('(pointer: coarse)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isCoarse,
    powerPreference: 'high-performance',
  });
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
renderer.shadowMap.enabled = !isCoarse;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.skyHorizon);
scene.fog = new THREE.FogExp2(C.haze, 0.0052);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 700);
camera.position.set(0, EYE, 54);

function webglFailed() {
  document.getElementById('intro')?.classList.add('hidden');
  document.getElementById('fallback')?.classList.remove('hidden');
}

/* ----------------------------------------------------------------------------
 * Lighting  (warm low sun + cool sky/ground bounce)
 * ------------------------------------------------------------------------- */
function addLighting() {
  const hemi = new THREE.HemisphereLight(0xcdeaff, 0x5e7d49, 1.25);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(C.sun, 2.3);
  sun.position.set(60, 48, 70); // behind the viewer → front-lit hero vista, long shadows
  sun.castShadow = !isCoarse;
  if (!isCoarse) {
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.near = 1;
    s.far = 320;
    s.left = s.bottom = -120;
    s.right = s.top = 120;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
  }
  scene.add(sun);

  // warm fill from the opposite side so shadow faces aren't dead
  const fill = new THREE.DirectionalLight(0xead8ff, 0.25);
  fill.position.set(-40, 30, 50);
  scene.add(fill);
}

/* ----------------------------------------------------------------------------
 * Sky dome (vertex gradient) + a soft sun disc
 * ------------------------------------------------------------------------- */
function addSky() {
  const top = new THREE.Color(C.skyTop);
  const bot = new THREE.Color(C.skyHorizon);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(480, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: top }, bottom: { value: bot } },
      vertexShader: `varying float h;
        void main(){ h = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying float h; uniform vec3 top; uniform vec3 bottom;
        void main(){
          float t = smoothstep(-0.05, 0.55, h);
          gl_FragColor = vec4(mix(bottom, top, t), 1.0);
        }`,
    })
  );
  scene.add(sky);

  // glowing sun near the directional light direction
  const sunSprite = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2d2, fog: false, transparent: true, opacity: 0.9 })
  );
  sunSprite.position.set(150, 120, 230);
  sunSprite.lookAt(0, EYE, 54);
  scene.add(sunSprite);

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(60, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe6b0, fog: false, transparent: true, opacity: 0.22 })
  );
  halo.position.copy(sunSprite.position);
  halo.lookAt(0, EYE, 54);
  scene.add(halo);
}

/* ----------------------------------------------------------------------------
 * Ground — one canvas-painted "map" (grass, the radial path wheel, lakebed,
 * jacaranda petal patches, the surrounding avenue ring). Zero network bytes.
 * ------------------------------------------------------------------------- */
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const W2C = (v, S) => ((v + GROUND / 2) / GROUND) * S; // world->canvas

function makeGroundTexture() {
  const S = 2048;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const x = cv.getContext('2d');
  const cx = S / 2;
  const px = (GROUND / S); // metres per canvas pixel (inverse used via scale)
  const R = (m) => (m / GROUND) * S; // metres -> canvas px radius

  // base: pavement/city grey outside the park
  x.fillStyle = '#9a958c';
  x.fillRect(0, 0, S, S);

  // surrounding avenue ring (asphalt) just outside the park
  x.beginPath();
  x.arc(cx, cx, R(PARK_R + 7), 0, Math.PI * 2);
  x.fillStyle = '#6f6b64';
  x.fill();

  // grass disc
  x.beginPath();
  x.arc(cx, cx, R(PARK_R), 0, Math.PI * 2);
  x.fillStyle = hex(C.grassMid);
  x.fill();
  x.save();
  x.clip();

  // grass mottling
  for (let i = 0; i < 2600; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * R(PARK_R);
    const gx = cx + Math.cos(a) * r;
    const gy = cx + Math.sin(a) * r;
    const rad = 6 + Math.random() * 26;
    x.fillStyle = Math.random() > 0.5 ? hex(C.grassSun) : hex(C.grassShade);
    x.globalAlpha = 0.05 + Math.random() * 0.12;
    x.beginPath();
    x.arc(gx, gy, rad, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;

  // ---- path wheel: outer ring, lake ring, radial spokes ----
  const drawRing = (rm, wm, color) => {
    x.beginPath();
    x.arc(cx, cx, R(rm), 0, Math.PI * 2);
    x.lineWidth = R(wm);
    x.strokeStyle = color;
    x.stroke();
  };
  const drawSpoke = (ang, r0, r1, wm, color) => {
    x.beginPath();
    x.moveTo(cx + Math.cos(ang) * R(r0), cx + Math.sin(ang) * R(r0));
    x.lineTo(cx + Math.cos(ang) * R(r1), cx + Math.sin(ang) * R(r1));
    x.lineWidth = R(wm);
    x.lineCap = 'round';
    x.strokeStyle = color;
    x.stroke();
  };

  // edges first (slightly wider darker), then fill
  drawRing(84, 6.4, hex(C.pathEdge));
  drawRing(84, 5, hex(C.path));
  drawRing(31, 6, hex(C.pathEdge));
  drawRing(31, 4.6, hex(C.path));

  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const wide = Math.abs(Math.sin(ang) - 1) < 0.2; // +z promenade wider
    const w = wide ? 7.5 : 4.4;
    drawSpoke(ang, 31, 84, w + 1.4, hex(C.pathEdge));
    drawSpoke(ang, 31, 84, w, hex(C.path));
  }
  // main promenade straight toward +Z (spawn entrance)
  drawSpoke(Math.PI / 2, 31, 90, 9.5, hex(C.pathEdge));
  drawSpoke(Math.PI / 2, 31, 90, 8, hex(C.path));

  // jacaranda petal patches scattered on the grass
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 33 + Math.random() * (PARK_R - 36);
    const gx = cx + Math.cos(a) * R(r);
    const gy = cx + Math.sin(a) * R(r);
    x.fillStyle = hex(C.petal);
    x.globalAlpha = 0.18 + Math.random() * 0.22;
    x.beginPath();
    x.ellipse(gx, gy, 8 + Math.random() * 22, 6 + Math.random() * 16, Math.random() * 6, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;

  // lakebed (the animated water plane sits just above this)
  x.beginPath();
  x.ellipse(cx + R(LAKE.x), cx + R(LAKE.z), R(LAKE.r * 1.14), R(LAKE.r * 0.92), 0.3, 0, Math.PI * 2);
  x.fillStyle = hex(C.waterDeep);
  x.fill();

  x.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function addGround() {
  const geo = new THREE.PlaneGeometry(GROUND, GROUND, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ map: makeGroundTexture(), roughness: 1 });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  scene.add(ground);
}

/* ----------------------------------------------------------------------------
 * Lagoon — animated water + biological island + a small fountain + waterfowl
 * ------------------------------------------------------------------------- */
const waterUniforms = { uTime: { value: 0 } };
const birds = [];

function addLagoon() {
  const geo = new THREE.CircleGeometry(LAKE.r + 1.5, 64);
  geo.rotateX(-Math.PI / 2);
  geo.scale(1.14, 1, 0.92);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(C.waterSurf),
    roughness: 0.18,
    metalness: 0.1,
    transparent: true,
    opacity: 0.86,
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = waterUniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         float wv(vec3 p){
           return sin(p.x*0.5 + uTime*1.1)*0.12
                + sin(p.z*0.8 + uTime*1.5)*0.08
                + sin((p.x+p.z)*0.35 + uTime*0.7)*0.05;
         }`
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += wv(position);');
  };
  const water = new THREE.Mesh(geo, mat);
  water.rotation.y = 0.3;
  water.position.set(LAKE.x, 0.08, LAKE.z);
  scene.add(water);

  // biological island
  const island = new THREE.Mesh(
    new THREE.SphereGeometry(5.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: C.grassShade, roughness: 1, flatShading: true })
  );
  island.scale.set(1, 0.34, 1.2);
  island.position.set(7, 0.05, -5);
  island.castShadow = island.receiveShadow = true;
  scene.add(island);
  // reeds
  const reedMat = new THREE.MeshStandardMaterial({ color: 0x6f7e3a, roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 5;
    const reed = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4 + Math.random(), 4), reedMat);
    reed.position.set(7 + Math.cos(a) * r, 0.7, -5 + Math.sin(a) * r);
    scene.add(reed);
  }

  // small fountain basin near the centre
  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.6, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.9 })
  );
  basin.position.set(-6, 0.25, 6);
  basin.castShadow = true;
  scene.add(basin);
  const jet = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 2.6, 10, 1, true),
    new THREE.MeshStandardMaterial({ color: C.waterHi, transparent: true, opacity: 0.5, roughness: 0.2 })
  );
  jet.position.set(-6, 1.7, 6);
  scene.add(jet);

  // waterfowl (ducks/swans) — little floating bodies that bob & drift
  const duckBody = new THREE.SphereGeometry(0.45, 8, 6);
  for (let i = 0; i < 9; i++) {
    const swan = i < 3;
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      duckBody,
      new THREE.MeshStandardMaterial({
        color: swan ? C.birdLight : 0x6b5a44,
        roughness: 1,
        flatShading: true,
      })
    );
    body.scale.set(1.3, 0.8, 1);
    g.add(body);
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.16, swan ? 1.1 : 0.5, 5),
      body.material
    );
    neck.position.set(0.45, swan ? 0.5 : 0.28, 0);
    neck.rotation.z = swan ? -0.5 : -0.7;
    g.add(neck);
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * (LAKE.r - 8);
    g.position.set(LAKE.x + Math.cos(a) * r, 0.45, LAKE.z + Math.sin(a) * r * 0.85);
    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
    birds.push({ g, base: g.position.clone(), spd: 0.2 + Math.random() * 0.3, phase: Math.random() * 10, rad: r });
  }
}

/* ----------------------------------------------------------------------------
 * Victoria Alada — the bronze winged-victory statue at the lake's edge (hero)
 * ------------------------------------------------------------------------- */
function addVictoriaAlada() {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: C.bronze, roughness: 0.5, metalness: 0.55, flatShading: true });
  const stone = new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.9 });

  // plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3, 3.4), stone);
  plinth.position.y = 1.5;
  plinth.castShadow = plinth.receiveShadow = true;
  g.add(plinth);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 2.4), bronze);
  cap.position.y = 3.2;
  g.add(cap);

  // the world-sphere she stands on
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), bronze);
  sphere.position.y = 4.4;
  g.add(sphere);

  // body
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 2.4, 8), bronze);
  torso.position.y = 6.4;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), bronze);
  head.position.y = 7.9;
  g.add(head);

  // arm raised + arm with laurel
  const armUp = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.2, 6), bronze);
  armUp.position.set(0.5, 7.7, 0);
  armUp.rotation.z = -0.9;
  g.add(armUp);
  const armDn = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.8, 6), bronze);
  armDn.position.set(-0.6, 6.3, 0.2);
  armDn.rotation.z = 0.6;
  g.add(armDn);

  // wings — two thin angled triangular shells
  const wingGeo = new THREE.ConeGeometry(1.1, 3.4, 4);
  wingGeo.scale(0.25, 1, 1);
  [1, -1].forEach((s) => {
    const w = new THREE.Mesh(wingGeo, bronze);
    w.position.set(0, 6.9, -0.5 * 1);
    w.rotation.set(0.5, 0, s * 0.5);
    w.position.x = s * 0.4;
    w.castShadow = true;
    g.add(w);
  });

  g.position.set(0, 0, -25);
  scene.add(g);
}

/* ----------------------------------------------------------------------------
 * Buildings — museum (MACN), amphitheatre, observatory dome, calesita
 * ------------------------------------------------------------------------- */
function facadeTexture(base, win, rows, cols, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const x = cv.getContext('2d');
  x.fillStyle = hex(base);
  x.fillRect(0, 0, w, h);
  // subtle vertical pilaster shading
  for (let i = 0; i < cols + 1; i++) {
    x.fillStyle = 'rgba(0,0,0,0.06)';
    x.fillRect((i / cols) * w - 2, 0, 4, h);
  }
  // windows
  const mx = w * 0.09, my = h * 0.16;
  const cw = (w - mx * 2) / cols, ch = (h - my * 2) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = mx + c * cw + cw * 0.22;
      const wy = my + r * ch + ch * 0.18;
      x.fillStyle = hex(win);
      x.fillRect(wx, wy, cw * 0.56, ch * 0.64);
      x.fillStyle = 'rgba(255,255,255,0.18)';
      x.fillRect(wx, wy, cw * 0.56, ch * 0.14);
    }
  }
  // cornice
  x.fillStyle = hex(C.roof);
  x.fillRect(0, 0, w, h * 0.08);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function addMuseum() {
  const g = new THREE.Group();
  const tex = facadeTexture(C.museum, 0x5a5446, 3, 11, 1024, 320);
  const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.95 });
  const side = new THREE.MeshStandardMaterial({ color: C.museumShade, roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ color: C.roof, roughness: 1 });

  const mkBlock = (w, h, d, fx) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [
      side, side, roofMat, side, fx, fx,
    ]);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  // central body (taller) + two wings
  const central = mkBlock(26, 17, 16, mat);
  central.position.set(0, 8.5, 0);
  g.add(central);
  [-1, 1].forEach((s) => {
    const wing = mkBlock(16, 13, 14, new THREE.MeshStandardMaterial({ map: facadeTexture(C.museum, 0x5a5446, 2, 7, 768, 256), roughness: 0.95 }));
    wing.position.set(s * 20, 6.5, 1);
    g.add(wing);
  });
  // pediment + entrance portico
  const ped = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 1.2), roofMat);
  ped.position.set(0, 18, 8.2);
  g.add(ped);
  const colMat = new THREE.MeshStandardMaterial({ color: C.museum, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 12, 10), colMat);
    col.position.set(-6.5 + i * 2.6, 6, 8.4);
    col.castShadow = true;
    g.add(col);
  }
  // steps
  for (let i = 0; i < 4; i++) {
    const st = new THREE.Mesh(
      new THREE.BoxGeometry(18 - i * 1.5, 0.4, 2 - i * 0.3),
      new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.95 })
    );
    st.position.set(0, 0.2 + i * 0.4, 9.2 + i * 0.8);
    st.receiveShadow = true;
    g.add(st);
  }

  // publica.la — the institution, lettered across the facade, facing the park
  const pubSign = makePlaque('publica.la', 1.5, {
    bg: '#2b2620', fg: '#f1e9d8', family: 'Georgia, "Times New Roman", serif', weight: '700',
    border: hexToRgba('#d8c29a', 0.85), metalness: 0.2,
  });
  pubSign.position.set(0, 13.6, 8.95);
  g.add(pubSign);

  g.position.set(0, 0, -78);
  scene.add(g);
  registerInteractable(0, -55, 11, INSTITUTION);
}

function addAmphitheatre() {
  const g = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({ color: C.stoneShade, roughness: 1, flatShading: true });
  // stepped seating bank — a lathed stepped profile over a partial arc
  const prof = [];
  let pr = 7;
  let py = 0;
  for (let i = 0; i < 9; i++) {
    prof.push(new THREE.Vector2(pr, py)); // tread inner
    pr += 2.0;
    prof.push(new THREE.Vector2(pr, py)); // tread outer
    py += 0.8;
    prof.push(new THREE.Vector2(pr, py)); // riser up
  }
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(prof, 40, Math.PI * 0.12, Math.PI * 0.76),
    concrete
  );
  bowl.castShadow = bowl.receiveShadow = true;
  g.add(bowl);
  // stage
  const stage = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 7, 1, 28, 1, false, Math.PI * 0.1, Math.PI * 0.8),
    new THREE.MeshStandardMaterial({ color: 0x6a5440, roughness: 0.9 })
  );
  stage.position.y = 0.5;
  stage.receiveShadow = true;
  g.add(stage);
  // back wall
  const back = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 1), concrete);
  back.position.set(0, 3.5, -7);
  back.castShadow = true;
  g.add(back);
  const anfiSign = makePlaque('anfiteatro', 1.3, { bg: '#3c4a33', fg: '#ece6d2', family: 'ui-monospace, monospace', weight: '600' });
  anfiSign.position.set(0, 5.4, -6.4);
  g.add(anfiSign);
  // lighting truss
  const trussMat = new THREE.MeshStandardMaterial({ color: C.iron, roughness: 0.7, metalness: 0.4 });
  [-7, 7].forEach((sx) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 0.4), trussMat);
    post.position.set(sx, 4.5, -2);
    g.add(post);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, 0.4), trussMat);
  beam.position.set(0, 9, -2);
  g.add(beam);
  for (let i = 0; i < 5; i++) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x222, emissive: 0xfff0c0, emissiveIntensity: 0.6 })
    );
    lamp.position.set(-6 + i * 3, 8.7, -2);
    g.add(lamp);
  }

  g.position.set(-48, 0, -64);
  g.rotation.y = 0.7;
  scene.add(g);
}

function addObservatory() {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xddd6c8, roughness: 0.95 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), wall);
  base.position.y = 4;
  base.castShadow = base.receiveShadow = true;
  g.add(base);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 2, 20), wall);
  drum.position.y = 9;
  drum.castShadow = true;
  g.add(drum);
  // hemispherical dome (the recognizable element)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xb9bec4, roughness: 0.5, metalness: 0.5, flatShading: true })
  );
  dome.position.y = 10;
  dome.castShadow = true;
  g.add(dome);
  // observation slit
  const slit = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 4.4, 4.6),
    new THREE.MeshStandardMaterial({ color: 0x14181c })
  );
  slit.position.set(0, 11.6, 0);
  g.add(slit);
  // a few windows
  for (let i = 0; i < 4; i++) {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x5a5446 })
    );
    win.position.set(-3 + i * 2, 4.5, 5.05);
    g.add(win);
  }
  // the historic refractor telescope, angled up through the slit
  const scope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.42, 5.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.4, metalness: 0.4 })
  );
  scope.position.set(0, 10.6, 0.4);
  scope.rotation.set(0.7, 0, 0.15);
  scope.castShadow = true;
  g.add(scope);
  // nameplate
  const sign = makePlaque('observatorio', 1.1, { bg: '#26303a', fg: '#dfe6ec', family: 'ui-monospace, monospace', weight: '600' });
  sign.position.set(0, 6.6, 5.06);
  g.add(sign);
  g.position.set(-74, 0, 6);
  g.rotation.y = Math.atan2(74, -6); // entrance/dome/scope face the park centre
  scene.add(g);
  registerInteractable(-66, 6, 9, ABOUT); // the observatory = who I am
}

function addCalesita() {
  const g = new THREE.Group();
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.5, 20),
    new THREE.MeshStandardMaterial({ color: 0xb5563f, roughness: 0.8 })
  );
  platform.position.y = 0.5;
  platform.castShadow = platform.receiveShadow = true;
  g.add(platform);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 5, 10),
    new THREE.MeshStandardMaterial({ color: 0xe8c45c, metalness: 0.3, roughness: 0.5 })
  );
  pole.position.y = 3;
  g.add(pole);
  // striped conical roof
  const roofTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 64;
    const x = cv.getContext('2d');
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? '#d24b3e' : '#f4ecd8';
      x.fillRect((i / 16) * 256, 0, 256 / 16, 64);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4.8, 2.6, 16),
    new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.8 })
  );
  roof.position.y = 6.3;
  roof.castShadow = true;
  g.add(roof);
  // little horses
  const spinner = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const horse = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1, 1.4),
      new THREE.MeshStandardMaterial({ color: [0xf2d06b, 0xe07a5f, 0x8fb6d6, 0xf4ecd8][i % 4], roughness: 0.7 })
    );
    horse.position.set(Math.cos(a) * 3, 1.6, Math.sin(a) * 3);
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6 })
    );
    bar.position.set(Math.cos(a) * 3, 2.4, Math.sin(a) * 3);
    spinner.add(horse, bar);
  }
  g.add(spinner);
  // festive rim lights around the roof
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0c0, emissiveIntensity: 1.2 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), rimMat);
    bulb.position.set(Math.cos(a) * 4.7, 5.1, Math.sin(a) * 4.7);
    g.add(bulb);
  }
  // name banner — "calesita de Almendra" (for the niece), facing the park
  const banner = new THREE.Group();
  [-2.2, 2.2].forEach((sx) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 0.9 })
    );
    post.position.set(sx, 1.8, 0);
    banner.add(post);
  });
  const board = makePlaque('calesita de Almendra', 0.62, {
    bg: '#d24b3e',
    fg: '#fff4e0',
    weight: '700',
    border: 'rgba(255,255,255,0.5)',
  });
  board.position.set(0, 3.5, 0);
  banner.add(board);
  const dirYaw = Math.atan2(-60, -30); // toward the park centre
  banner.position.set(Math.sin(dirYaw) * 7, 0, Math.cos(dirYaw) * 7);
  banner.rotation.y = dirYaw;
  banner.traverse((m) => (m.castShadow = true));
  g.add(banner);

  g.position.set(60, 0, 30);
  scene.add(g);
  calesitaSpinner = spinner;
  addKite(66, 37);
  registerInteractable(60, 30, 8, {
    kind: 'familia', name: 'almendra', emoji: '🎠',
    text: 'la calesita del parque es de ella.', url: null, accent: FAMILY_ACCENT,
  });
}
let calesitaSpinner = null;

function addAurora() {
  // "La Aurora" — a tall spiralled marble monument (stylised as a stacked column)
  const g = new THREE.Group();
  const marble = new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.8, flatShading: true });
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 2, 12), marble);
  pedestal.position.y = 1;
  pedestal.castShadow = pedestal.receiveShadow = true;
  g.add(pedestal);
  for (let i = 0; i < 4; i++) {
    const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.7 - i * 0.12, 0.95 - i * 0.12, 2.2, 8), marble);
    fig.position.y = 3 + i * 1.9;
    fig.rotation.y = i * 0.7;
    fig.position.x = Math.sin(i * 1.4) * 0.3;
    fig.castShadow = true;
    g.add(fig);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), marble);
  crown.position.y = 11;
  g.add(crown);
  g.position.set(44, 0, 42);
  scene.add(g);
}

function addCurieBust() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: C.stoneShade, roughness: 0.95 });
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.2), stone);
  ped.position.y = 1.1;
  ped.castShadow = true;
  g.add(ped);
  const bust = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), stone);
  bust.scale.set(1, 1.2, 0.9);
  bust.position.y = 2.7;
  g.add(bust);
  g.position.set(-30, 0, -36);
  scene.add(g);
}

/* ----------------------------------------------------------------------------
 * Trees — instanced low-poly (jacarandá violet, tipa gold-green, plain greens)
 * ------------------------------------------------------------------------- */
function addTrees(count = 320) {
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.32, 1, 5);
  trunkGeo.translate(0, 0.5, 0);
  const leafGeo = new THREE.IcosahedronGeometry(1, 0); // 20 faces, low-poly

  const trunkMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });

  // two canopy layers per tree for a fuller silhouette → allocate 2x
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count * 2);
  trunks.castShadow = leaves.castShadow = true;
  trunks.receiveShadow = leaves.receiveShadow = true;

  const greens = [C.leafSun, C.leafMid, C.leafSun, C.tipaGold];
  let ti = 0;
  let li = 0;
  let tries = 0;
  while (ti < count && tries < count * 40) {
    tries++;
    const a = Math.random() * Math.PI * 2;
    // trees live only in the outer green belt — keep the lake & paths open
    const r = 34 + Math.sqrt(Math.random()) * (PARK_R - 37);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (isOnWater(x, z) || inObstacle(x, z, 3) || nearPath(x, z)) continue;

    const trunkH = 3.6 + Math.random() * 2.8;
    const yaw = Math.random() * Math.PI * 2;

    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(1, trunkH, 1);
    dummy.updateMatrix();
    trunks.setMatrixAt(ti, dummy.matrix);

    // species: ~30% jacarandá (violet), rest greens/tipa-gold
    const roll = Math.random();
    const base = roll < 0.3 ? C.jacaSun : greens[(Math.random() * greens.length) | 0];

    const canopyR = 2.2 + Math.random() * 1.8;
    // two stacked canopy blobs (upper a touch brighter, lower a touch darker)
    for (let l = 0; l < 2; l++) {
      const cr = canopyR * (l === 0 ? 1 : 0.72);
      dummy.position.set(x, trunkH + cr * 0.5 + l * cr * 0.7, z);
      dummy.rotation.set(Math.random() * 0.35, yaw + l, Math.random() * 0.35);
      dummy.scale.set(cr, cr * 0.92, cr);
      dummy.updateMatrix();
      leaves.setMatrixAt(li, dummy.matrix);
      col.set(base).offsetHSL(0, 0, (l === 1 ? 0.05 : -0.02) + (Math.random() - 0.5) * 0.05);
      leaves.setColorAt(li, col);
      li++;
    }
    col.set(Math.random() < 0.5 ? C.trunk : C.trunkDk);
    trunks.setColorAt(ti, col);
    ti++;
  }
  trunks.count = ti;
  leaves.count = li;
  trunks.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
  trunks.instanceColor.needsUpdate = leaves.instanceColor.needsUpdate = true;
  scene.add(trunks, leaves);
}

/* ----------------------------------------------------------------------------
 * Park furniture — farolas (lamps), benches, feria stalls, pergola
 * ------------------------------------------------------------------------- */
const glowGlobes = [];

function addLamps() {
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, 5, 8);
  poleGeo.translate(0, 2.5, 0);
  const poleMat = new THREE.MeshStandardMaterial({ color: C.iron, roughness: 0.6, metalness: 0.3 });
  const globeGeo = new THREE.SphereGeometry(0.35, 10, 8);
  const globeMat = new THREE.MeshStandardMaterial({
    color: 0xfff4d8,
    emissive: C.lampGlow,
    emissiveIntensity: 1.4,
  });

  const spots = [];
  // lamps along the two ring paths
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    spots.push([Math.cos(a) * 84, Math.sin(a) * 84]);
  }
  for (let k = 0; k < 12; k++) {
    // half-step phase so no lamp lands dead-centre on the spawn sightline
    const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
    spots.push([Math.cos(a) * 31, Math.sin(a) * 31]);
  }
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, spots.length);
  poles.castShadow = true;
  const globes = new THREE.InstancedMesh(globeGeo, globeMat, spots.length);
  const d = new THREE.Object3D();
  spots.forEach(([x, z], i) => {
    d.position.set(x, 0, z);
    d.updateMatrix();
    poles.setMatrixAt(i, d.matrix);
    d.position.set(x, 5.1, z);
    d.updateMatrix();
    globes.setMatrixAt(i, d.matrix);
  });
  poles.instanceMatrix.needsUpdate = globes.instanceMatrix.needsUpdate = true;
  scene.add(poles, globes);
}

function addBenches() {
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x3c5e3a, roughness: 0.9 });
  const ironMat = new THREE.MeshStandardMaterial({ color: C.iron, roughness: 0.6 });
  const mk = (x, z, rot) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), slatMat);
    seat.position.y = 0.55;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.1), slatMat);
    back.position.set(0, 0.85, -0.28);
    [-0.9, 0.9].forEach((sx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.6), ironMat);
      leg.position.set(sx, 0.27, 0);
      g.add(leg);
    });
    g.add(seat, back);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.traverse((m) => (m.castShadow = true));
    scene.add(g);
  };
  // benches facing the lake along the inner ring
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    mk(Math.cos(a) * 34, Math.sin(a) * 34, -a + Math.PI / 2);
  }
}

const STALL_ACCENTS = [C.feriaRed, C.feriaBlue, C.feriaOchre, 0xf4ecd8, 0x6f9e6a];

// a feria stall that is a project — accent canopy + a hanging name banner + a placard
function addProjectStall(x, z, rot, p) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.9, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 1 })
  );
  legs.position.y = 0.45;
  g.add(legs);
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.14, 1.9),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(p.accent), roughness: 0.8 })
  );
  canopy.position.y = 2.25;
  g.add(canopy);
  [-1.25, 1.25].forEach((sx) =>
    [-0.78, 0.78].forEach((sz) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.35, 5),
        new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
      );
      post.position.set(sx, 1.57, sz);
      g.add(post);
    })
  );
  for (let i = 0; i < 5; i++) {
    const goods = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.25, 0.5),
      new THREE.MeshStandardMaterial({ color: STALL_ACCENTS[(i * 2) % STALL_ACCENTS.length], roughness: 0.9 })
    );
    goods.position.set(-0.9 + i * 0.42, 1.05, 0);
    g.add(goods);
  }
  // hanging name banner, facing the central walkway (local +z)
  const banner = makePlaque(p.name, 0.46, {
    bg: '#23201a',
    fg: '#f4f1e8',
    family: 'ui-monospace, "SF Mono", Menlo, monospace',
    weight: '700',
    border: hexToRgba(p.accent, 0.95),
    metalness: 0.15,
  });
  banner.position.set(0, 2.82, 0.96);
  g.add(banner);

  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.traverse((m) => (m.castShadow = true));
  scene.add(g);

  registerInteractable(x, z, 6.4, {
    kind: p.kind, name: p.name, text: p.text,
    emoji: p.emoji, url: p.url, accent: p.accent, linkLabel: p.linkLabel,
  });
}

function addFeria() {
  // the entrance promenade: every stall is one of my projects
  PROJECTS.forEach((p) => {
    const side = p.slot[0] === 'R' ? 1 : -1;
    const row = +p.slot[1];
    const x = side * STALL_X;
    const z = STALL_Z[row];
    const rot = side > 0 ? -Math.PI / 2 : Math.PI / 2; // banner faces the walkway
    addProjectStall(x, z, rot, p);
  });

  // a generic feria arc along the outer ring (east) for ambiance
  const mkStall = (x, z, rot, color) => {
    const g = new THREE.Group();
    const legs = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.2), new THREE.MeshStandardMaterial({ color: 0x6a5a3a, roughness: 1 }));
    legs.position.y = 0.45;
    g.add(legs);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.8), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    canopy.position.y = 2.2;
    g.add(canopy);
    [-1.2, 1.2].forEach((sx) =>
      [-0.7, 0.7].forEach((sz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 5), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
        post.position.set(sx, 1.55, sz);
        g.add(post);
      })
    );
    for (let i = 0; i < 5; i++) {
      const goods = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: STALL_ACCENTS[(Math.random() * STALL_ACCENTS.length) | 0], roughness: 0.9 }));
      goods.position.set(-0.9 + i * 0.42, 1.05, 0);
      g.add(goods);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.traverse((m) => (m.castShadow = true));
    scene.add(g);
  };
  for (let k = 0; k < 8; k++) {
    const a = -0.3 + k * 0.16;
    mkStall(Math.cos(a) * 78, Math.sin(a) * 78, -a, STALL_ACCENTS[k % STALL_ACCENTS.length]);
  }
}

function addPergola() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 1 });
  for (let i = 0; i < 5; i++) {
    [-2, 2].forEach((sx) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), wood);
      post.position.set(sx, 1.6, -8 + i * 4);
      post.castShadow = true;
      g.add(post);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 0.3), wood);
    beam.position.set(0, 3.2, -8 + i * 4);
    g.add(beam);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 17), wood);
  ridge.position.set(0, 3.4, 0);
  g.add(ridge);
  g.position.set(40, 0, -14);
  g.rotation.y = -0.4;
  scene.add(g);
}

/* ----------------------------------------------------------------------------
 * City backdrop — desaturated blocks beyond the park, melting into the haze
 * ------------------------------------------------------------------------- */
function addCity() {
  const mat = new THREE.MeshStandardMaterial({ color: C.cityFar, roughness: 1, flatShading: true });
  const winTex = facadeTexture(C.cityFar, 0x8d8893, 6, 5, 256, 320);
  const winMat = new THREE.MeshStandardMaterial({ map: winTex, color: C.cityFar, roughness: 1 });
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + Math.random() * 0.05;
    const r = 108 + Math.random() * 26;
    const h = 9 + Math.random() * 26;
    const w = 7 + Math.random() * 8;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), Math.random() < 0.6 ? winMat : mat);
    b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    b.rotation.y = a;
    scene.add(b);
  }
}

/* ----------------------------------------------------------------------------
 * Text labels, people, signage + hidden family dedications (the easter eggs)
 * ------------------------------------------------------------------------- */
function makeLabelTexture(text, opts = {}) {
  const {
    fg = '#2b2620',
    bg = '#c6a25e',
    border = 'rgba(0,0,0,0.22)',
    family = 'Georgia, "Times New Roman", serif',
    weight = '600',
  } = opts;
  const fontPx = 62;
  let cv = document.createElement('canvas');
  let ctx = cv.getContext('2d');
  ctx.font = `${weight} ${fontPx}px ${family}`;
  const tw = ctx.measureText(text).width;
  cv.width = Math.max(96, Math.ceil(tw + 92));
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
    map: tex,
    roughness: 0.45,
    metalness: opts.metalness ?? 0.35,
    side: THREE.FrontSide,
  });
  const geo = new THREE.PlaneGeometry(height * aspect, height);
  // two single-sided faces back-to-back so the label reads correctly from BOTH
  // sides (a single DoubleSide plane shows mirrored glyphs from behind).
  const front = new THREE.Mesh(geo, mat);
  const back = new THREE.Mesh(geo, mat);
  back.rotation.y = Math.PI;
  front.add(back);
  return front;
}

const SKIN = [0xc89a6a, 0xe0b48a, 0x9c6f4a, 0xd6a87f];
const HAIR = [0x2a2018, 0x4e3b2a, 0x141414, 0x6b5a3a, 0x8a8a8a];
const SHIRT = [0x9c5b4a, 0x4a6f9e, 0x3f7d5a, 0xd9a23b, 0x7a5b9e, 0xcc6688, 0x556070, 0xb5483b];
const pick = (a) => a[(Math.random() * a.length) | 0];

function makePerson(opts = {}) {
  const { s = 1, shirt = pick(SHIRT), pants = 0x39424f, skin = pick(SKIN), hair = pick(HAIR) } = opts;
  const g = new THREE.Group();
  const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.3), M(pants));
  legs.position.y = 0.45;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.32), M(shirt));
  torso.position.y = 1.22;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), M(skin));
  head.position.y = 1.78;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(hair));
  cap.position.y = 1.82;
  [-1, 1].forEach((sx) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.66, 0.15), M(shirt));
    arm.position.set(sx * 0.33, 1.2, 0);
    g.add(arm);
  });
  g.add(legs, torso, head, cap);
  g.scale.setScalar(s);
  g.traverse((m) => (m.castShadow = true));
  return g;
}

function makeSeatedPerson(opts = {}) {
  const { s = 1, shirt = pick(SHIRT), pants = 0x39424f, skin = pick(SKIN), hair = pick(HAIR) } = opts;
  const g = new THREE.Group();
  const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true });
  const Y = 0.55;
  const thighs = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.6), M(pants));
  thighs.position.set(0, Y + 0.12, 0.2);
  const shins = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.55, 0.2), M(pants));
  shins.position.set(0, 0.3, 0.48);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.6, 0.3), M(shirt));
  torso.position.set(0, Y + 0.5, -0.06);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), M(skin));
  head.position.set(0, Y + 0.95, -0.06);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(hair));
  cap.position.set(0, Y + 0.99, -0.06);
  g.add(thighs, shins, torso, head, cap);
  g.scale.setScalar(s);
  g.traverse((m) => (m.castShadow = true));
  return g;
}

const peopleWalkers = [];
function addPeople() {
  const place = (p, x, z, yaw = Math.random() * Math.PI * 2) => {
    p.position.set(x, 0, z);
    p.rotation.y = yaw;
    scene.add(p);
  };
  // strollers walking the lake loop (animated)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const p = makePerson();
    p.position.set(Math.cos(a) * 31, 0, Math.sin(a) * 31);
    scene.add(p);
    peopleWalkers.push({ g: p, R: 31, a, spd: (i % 2 ? 1 : -1) * (0.12 + Math.random() * 0.06) });
  }
  // a few standing near the feria / museum / promenade — kept off the stall
  // columns (x = ±6.8) and the central walkway so they never block a project
  place(makePerson(), -12, 34, -1.0);
  place(makePerson(), 12, 39, 2.2);
  place(makePerson(), 11, 52, -2.0);
  place(makePerson(), -3, -16, 0); // by the lake, looking at the statue
  place(makePerson(), 5, -52, 0.4); // near the museum steps
  // seated folks on the lakeside benches (matches addBenches ring r34)
  [0, 4, 7].forEach((k) => {
    const a = (k / 10) * Math.PI * 2;
    place(makeSeatedPerson(), Math.cos(a) * 34, Math.sin(a) * 34, -a + Math.PI / 2);
  });
  // kids near the calesita
  place(makePerson({ s: 0.72 }), 54, 33, -1);
  place(makePerson({ s: 0.66 }), 57, 26, 2);
}

// the family easter eggs: five lakeside dedication benches with name plaques
function addDedicationBench(name, angle, radius = 39) {
  const g = new THREE.Group();
  const slat = new THREE.MeshStandardMaterial({ color: 0x3c5e3a, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: C.iron, roughness: 0.6 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.6), slat);
  seat.position.y = 0.55;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.1), slat);
  back.position.set(0, 0.86, -0.28);
  g.add(seat, back);
  [-1, 1].forEach((sx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.6), iron);
    leg.position.set(sx * 1, 0.27, 0);
    g.add(leg);
  });
  // brass dedication plaque on the backrest, facing the lakeside path
  const plaque = makePlaque(name, 0.18, { bg: '#b8893b', fg: '#23201a', metalness: 0.55, border: 'rgba(0,0,0,0.3)' });
  plaque.position.set(0, 0.95, -0.2);
  g.add(plaque);
  g.traverse((m) => (m.castShadow = true));
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(-x, -z); // seat (and plaque) face the lake / the loop path
  scene.add(g);
  registerInteractable(x, z, 4.8, {
    kind: 'familia', name, emoji: '🌸',
    text: 'un banco con su nombre, mirando el lago.', url: null, accent: FAMILY_ACCENT,
  });
}

function addDedications() {
  const D = Math.PI / 180;
  addDedicationBench('Daniel Laurino', 200 * D);
  addDedicationBench('Beatriz Rosa Assenza Parisi', 250 * D);
  addDedicationBench('Pachi Laurino', 320 * D);
  addDedicationBench('Andrés Laurino', 25 * D);
  addDedicationBench('María Paula Laurino', 135 * D);
}

function addSignpost(x, z, yaw, lines, opts = {}) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, 3.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x5b4a36, roughness: 0.9 })
  );
  post.position.y = 1.7;
  post.castShadow = true;
  g.add(post);
  lines.forEach((t, i) => {
    const b = makePlaque(t, opts.size || 0.36, {
      bg: '#3c4a33',
      fg: '#ece6d2',
      family: 'ui-monospace, "SF Mono", Menlo, monospace',
      weight: '600',
      border: 'rgba(255,255,255,0.16)',
      metalness: 0.1,
    });
    b.position.set(0, 2.85 - i * 0.52, 0.08);
    b.castShadow = true;
    g.add(b);
  });
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  scene.add(g);
}

function addSignposts() {
  // wayfinding at the entrance, facing the visitor (who looks -Z)
  addSignpost(9.5, 49, 0, [
    '↑  el lago · publica.la',
    '←  observatorio · quién soy',
    'calesita de Almendra  →',
  ]);
  // publica.la nameplate across the lake
  addSignpost(7, -60, 0, ['publica.la'], { size: 0.72 });
}

function addPier() {
  // a small wooden embarcadero at the lake's south edge
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6f5536, roughness: 0.95, flatShading: true });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 12), wood);
  deck.position.set(0, 0.5, 0);
  g.add(deck);
  for (let i = 0; i < 6; i++) {
    [-1.1, 1.1].forEach((sx) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), wood);
      post.position.set(sx, 0.0, -5 + i * 2);
      g.add(post);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 11.5), wood);
      rail.position.set(sx, 0.95, 0);
      g.add(rail);
    });
  }
  // the hidden heart plaque — for the whole family
  const heart = makePlaque('para los Laurino  ♥', 0.24, { bg: '#7a5b9e', fg: '#fff', border: 'rgba(255,255,255,0.3)', metalness: 0.2 });
  heart.position.set(0, 1.25, 5.5); // shore end, facing whoever walks up
  g.add(heart);
  g.traverse((m) => (m.castShadow = true));
  g.position.set(13, 0, 19); // edge → out over the water
  g.rotation.y = 0.2;
  scene.add(g);
  registerInteractable(13, 19, 5.5, {
    kind: 'familia', name: 'para los Laurino', emoji: '♥',
    text: 'el muelle es para toda la familia.', url: null, accent: FAMILY_ACCENT,
  });
}

let kite = null;
function addKite(x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.7),
    new THREE.MeshStandardMaterial({ color: 0xe2483b, side: THREE.DoubleSide, roughness: 0.6 })
  );
  body.rotation.z = Math.PI / 4;
  g.add(body);
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xf4d06b, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const bow = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.16), tailMat);
    bow.position.set(0, -1.05 - i * 0.42, 0);
    bow.rotation.z = (i % 2 ? 1 : -1) * 0.5;
    g.add(bow);
  }
  g.position.set(x, 15, z);
  scene.add(g);
  kite = { g, base: new THREE.Vector3(x, 15, z) };
}

/* ----------------------------------------------------------------------------
 * Walkable portrait — proximity placards (projects, institution, places, family)
 * ------------------------------------------------------------------------- */
const interactables = [];
function registerInteractable(x, z, r, data) {
  interactables.push({ x, z, r, leaveR: r + 2.6, data });
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
    // dark ink on light accents, paper on dark — keep the pill legible either way
    const h = parseInt(accent.replace('#', ''), 16);
    const lum = (0.299 * ((h >> 16) & 255) + 0.587 * ((h >> 8) & 255) + 0.114 * (h & 255)) / 255;
    link.style.color = lum > 0.62 ? '#1c2118' : '#f4f1e8';
    link.classList.remove('hidden');
  } else {
    link.classList.add('hidden');
  }
  cardEl.classList.remove('hidden');
  const chip = document.getElementById('placeChip');
  if (chip) chip.textContent = `📍 ${d.name || 'parque centenario'}`;
}
function hideCard() {
  cardEl.classList.add('hidden');
  const chip = document.getElementById('placeChip');
  if (chip) chip.textContent = '📍 parque centenario';
}

function updateProximity() {
  if (!controls.active) return;
  const px = camera.position.x;
  const pz = camera.position.z;
  let best = null;
  let bestD = Infinity;
  for (const it of interactables) {
    const d = Math.hypot(px - it.x, pz - it.z);
    const limit = activeIt === it ? it.leaveR : it.r; // hysteresis
    if (d < limit && d < bestD) {
      best = it;
      bestD = d;
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
 * Drifting jacaranda petals — cheap Points, respawn at the top
 * ------------------------------------------------------------------------- */
let petals = null;
function addPetals() {
  const n = isCoarse ? 90 : 170;
  const pos = new Float32Array(n * 3);
  const data = [];
  const R = 64;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * R;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 20;
    pos[i * 3 + 2] = Math.sin(a) * r;
    data.push({ vy: 0.5 + Math.random() * 0.7, sw: 0.4 + Math.random() * 0.8, ph: Math.random() * 6.28 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const cx = cv.getContext('2d');
  const grd = cx.createRadialGradient(32, 30, 1, 32, 32, 30);
  grd.addColorStop(0, 'rgba(204,180,234,0.95)');
  grd.addColorStop(1, 'rgba(141,123,216,0)');
  cx.fillStyle = grd;
  cx.beginPath();
  cx.ellipse(32, 32, 30, 22, 0, 0, Math.PI * 2);
  cx.fill();
  const sprite = new THREE.CanvasTexture(cv);
  const mat = new THREE.PointsMaterial({
    size: 0.95, map: sprite, transparent: true, depthWrite: false, opacity: 0.8, color: 0xcab8e8,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  petals = { pts, pos, data, n };
}
function updatePetals(dt, t) {
  if (!petals) return;
  const { pos, data, n } = petals;
  for (let i = 0; i < n; i++) {
    pos[i * 3 + 1] -= data[i].vy * dt;
    pos[i * 3] += Math.sin(t * data[i].sw + data[i].ph) * dt * 0.5;
    if (pos[i * 3 + 1] < 0.15) {
      // respawn at the top, re-randomized within the disc so the slow x-drift
      // doesn't let petals migrate out of the park over a long session
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 64;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 18 + Math.random() * 3;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
  }
  petals.pts.geometry.attributes.position.needsUpdate = true;
}

/* ----------------------------------------------------------------------------
 * The cities of my life — low-poly monuments (Buenos Aires, Roma, Scicli, Cascais)
 * ------------------------------------------------------------------------- */
function monObelisco() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xeceee9, roughness: 0.85, flatShading: true });
  const base = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 3), white);
  base.position.y = 0.7;
  g.add(base);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 13, 4), white);
  shaft.rotation.y = Math.PI / 4;
  shaft.position.y = 7.4;
  g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 4), white);
  tip.rotation.y = Math.PI / 4;
  tip.position.y = 14.7;
  g.add(tip);
  return g;
}
function monColumn() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0xd9cdb0, roughness: 0.9, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0xb8a988, roughness: 0.9, flatShading: true });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 2.6), stone);
  plinth.position.y = 0.5;
  g.add(plinth);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.6, 16), stone);
  drum.position.y = 1.3;
  g.add(drum);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.95, 9, 18), stone);
  shaft.position.y = 6.1;
  g.add(shaft);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.85, 0.8, 16), stone);
  cap.position.y = 11;
  g.add(cap);
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 2.2), stone);
  abacus.position.y = 11.6;
  g.add(abacus);
  const frag = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 1.2), dark);
  frag.position.set(0.2, 12.2, 0);
  frag.rotation.z = 0.12;
  g.add(frag);
  return g;
}
function monCampanile() {
  const g = new THREE.Group();
  const honey = new THREE.MeshStandardMaterial({ color: 0xe6d29a, roughness: 0.92, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3026 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 9, 3.4), honey);
  body.position.y = 4.5;
  g.add(body);
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3, 2.8), honey);
  belfry.position.y = 10.5;
  g.add(belfry);
  [[0, 1.45], [0, -1.45], [1.45, 0], [-1.45, 0]].forEach(([ox, oz]) => {
    const arch = new THREE.Mesh(new THREE.BoxGeometry(oz ? 1.2 : 0.2, 1.8, oz ? 0.2 : 1.2), dark);
    arch.position.set(ox, 10.6, oz);
    g.add(arch);
  });
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 3.2), honey);
  cornice.position.y = 12.2;
  g.add(cornice);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xbfae7e, roughness: 0.6, metalness: 0.2, flatShading: true })
  );
  dome.position.y = 12.4;
  g.add(dome);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 6), dark);
  finial.position.y = 13.7;
  g.add(finial);
  return g;
}
function monLighthouse() {
  const g = new THREE.Group();
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 256;
  const cx = cv.getContext('2d');
  for (let i = 0; i < 8; i++) {
    cx.fillStyle = i % 2 ? '#d23b34' : '#f3efe6';
    cx.fillRect(0, (i / 8) * 256, 64, 256 / 8);
  }
  const stripe = new THREE.CanvasTexture(cv);
  stripe.colorSpace = THREE.SRGBColorSpace;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 10, 18), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.85 }));
  tower.position.y = 5;
  g.add(tower);
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.6, 18), new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.6 }));
  gallery.position.y = 10.3;
  g.add(gallery);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.8, 12), new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.3, metalness: 0.3 }));
  lantern.position.y = 11.5;
  g.add(lantern);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff3cf, emissive: 0xffe08a, emissiveIntensity: 1.6 }));
  light.position.y = 11.5;
  g.add(light);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.4, 14), new THREE.MeshStandardMaterial({ color: 0x2a2f33, roughness: 0.6, flatShading: true }));
  cap.position.y = 13.1;
  g.add(cap);
  return g;
}

function addPlaces() {
  const builders = { 'buenos aires': monObelisco, roma: monColumn, scicli: monCampanile, cascais: monLighthouse };
  PLACES.forEach((pl) => {
    const g = (builders[pl.name] || monColumn)();
    // a little marker post + plaque in front, facing the walker
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 0.9 })
    );
    post.position.set(0, 0.55, 2.35);
    g.add(post);
    const plaque = makePlaque(`${pl.name} · ${pl.km}`, 0.4, {
      bg: '#2b2620', fg: '#f1e9d8', family: 'ui-monospace, Menlo, monospace', weight: '600',
      border: hexToRgba(pl.accent, 0.85), metalness: 0.2,
    });
    plaque.position.set(0, 1.25, 2.4);
    g.add(plaque);
    g.position.set(pl.x, 0, pl.z);
    g.rotation.y = Math.atan2(-pl.x, -pl.z); // face the park centre / the walker
    g.traverse((m) => (m.castShadow = true));
    scene.add(g);
    registerInteractable(pl.x, pl.z, 6.2, {
      kind: pl.kind, name: pl.name, text: pl.text, emoji: pl.emoji, url: null, accent: pl.accent,
    });
  });
}

/* ----------------------------------------------------------------------------
 * rd3 — the first marketing agency, where it all started (a small atelier)
 * ------------------------------------------------------------------------- */
function addRd3() {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xe7d9c4, roughness: 0.95 });
  const trim = new THREE.MeshStandardMaterial({ color: new THREE.Color(RD3.accent), roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 4.2, 5), wall);
  body.position.y = 2.1;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, 5.4), trim);
  roof.position.y = 4.3;
  g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x4a3a2a }));
  door.position.set(-1.3, 1.2, 2.51);
  g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 0.1), new THREE.MeshStandardMaterial({ color: 0x7fa8b8, roughness: 0.3, metalness: 0.2 }));
  win.position.set(1.2, 2.1, 2.51);
  g.add(win);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.12, 1.1), trim);
  awning.position.set(0, 3.0, 3.0);
  awning.rotation.x = 0.18;
  g.add(awning);
  const sign = makePlaque('rd3', 0.8, {
    bg: '#23201a', fg: '#f4f1e8', family: 'ui-monospace, Menlo, monospace', weight: '700',
    border: hexToRgba(RD3.accent, 0.95), metalness: 0.2,
  });
  sign.position.set(0, 3.72, 2.55);
  g.add(sign);
  g.position.set(RD3.x, 0, RD3.z);
  g.rotation.y = Math.atan2(-RD3.x, -RD3.z);
  g.traverse((m) => (m.castShadow = true));
  scene.add(g);
  registerInteractable(RD3.x, RD3.z, 6.5, {
    kind: RD3.kind, name: RD3.name, text: RD3.text, emoji: RD3.emoji, url: RD3.url, accent: RD3.accent,
  });
}

/* ----------------------------------------------------------------------------
 * Build the world
 * ------------------------------------------------------------------------- */
function buildWorld() {
  addLighting();
  addSky();
  addGround();
  addCity();
  addLagoon();
  addVictoriaAlada();
  addMuseum();
  addAmphitheatre();
  addObservatory();
  addCalesita();
  addAurora();
  addCurieBust();
  addRd3();
  addPlaces();
  addTrees();
  addLamps();
  addBenches();
  addFeria();
  addPergola();
  addPier();
  addSignposts();
  addDedications();
  addPeople();
  addPetals();
}

/* ----------------------------------------------------------------------------
 * First-person controller — malamud feel: drag-to-look (held), WASD/arrows,
 * touch = hold-to-walk + drag-look, head-bob, bounds + obstacle repel.
 * ------------------------------------------------------------------------- */
const controls = {
  yaw: 0, // look down -Z, toward the lagoon / Victoria Alada / museum
  pitch: -0.06,
  keys: new Set(),
  lookDX: 0,
  lookDY: 0,
  touchWalk: false,
  vel: new THREE.Vector3(),
  bob: 0,
  active: false,
  SENS: 0.0028,
  SPEED: 7.2,
  PITCH_MIN: -0.62,
  PITCH_MAX: 0.5,
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
  // look
  c.yaw -= c.lookDX * c.SENS;
  c.pitch -= c.lookDY * c.SENS;
  c.pitch = Math.max(c.PITCH_MIN, Math.min(c.PITCH_MAX, c.pitch));
  c.lookDX = 0;
  c.lookDY = 0;
  const e = new THREE.Euler(c.pitch, c.yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(e);

  if (!c.active) return;

  // move intent (yaw-only, level walking)
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

  // clamp to park disc
  const d = Math.hypot(p.x, p.z);
  if (d > WALK_R) {
    p.x = (p.x / d) * WALK_R;
    p.z = (p.z / d) * WALK_R;
  }
  // repel from lake + buildings
  const repel = (cx, cz, r) => {
    const dx = p.x - cx;
    const dz = p.z - cz;
    const dd = Math.hypot(dx, dz);
    if (dd < r && dd > 1e-4) {
      p.x = cx + (dx / dd) * r;
      p.z = cz + (dz / dd) * r;
    }
  };
  repel(LAKE.x, LAKE.z, LAKE.r + 1.5);
  OBSTACLES.forEach((o) => repel(o.x, o.z, o.r));

  // head-bob while moving
  const moving = c.vel.lengthSq() > 0.4;
  if (moving) c.bob += dt * 9;
  p.y = EYE + (moving ? Math.sin(c.bob) * 0.06 : 0);
}

/* ----------------------------------------------------------------------------
 * Ambient audio — zero-byte WebAudio: warm pad + breeze + occasional birds
 * ------------------------------------------------------------------------- */
const audio = { ctx: null, master: null, on: false, birdTimer: null };

function startAudio() {
  if (audio.ctx) {
    audio.ctx.resume();
    return;
  }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  audio.ctx = ctx;
  const master = ctx.createGain();
  master.gain.value = 0.0;
  master.connect(ctx.destination);
  audio.master = master;

  // pad: detuned sines through a lowpass
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 520;
  lp.connect(master);
  [98, 98.7, 147, 196].forEach((f) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    o.connect(g).connect(lp);
    o.start();
  });
  // slow LFO on the filter for movement
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 180;
  lfo.connect(lfoG).connect(lp.frequency);
  lfo.start();

  // breeze: filtered noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 0.6;
  const ng = ctx.createGain();
  ng.gain.value = 0.04;
  noise.connect(bp).connect(ng).connect(master);
  noise.start();

  // birds: schedule soft chirps
  const chirp = () => {
    if (!audio.on || !audio.ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    const f0 = 1800 + Math.random() * 1400;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * (1.3 + Math.random() * 0.4), t + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = Math.random() * 2 - 1;
      o.connect(g).connect(pan).connect(master);
    } else {
      o.connect(g).connect(master);
    }
    o.start(t);
    o.stop(t + 0.2);
    // double chirp sometimes
    if (Math.random() < 0.5) {
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(f0 * 1.1, t + 0.16);
      o2.frequency.exponentialRampToValueAtTime(f0 * 1.4, t + 0.22);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, t + 0.16);
      g2.gain.linearRampToValueAtTime(0.05, t + 0.18);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o2.connect(g2).connect(master);
      o2.start(t + 0.16);
      o2.stop(t + 0.34);
    }
    audio.birdTimer = setTimeout(chirp, 1500 + Math.random() * 5000);
  };
  audio.birdTimer = setTimeout(chirp, 1200);
}

function setAudio(on) {
  audio.on = on;
  if (on) startAudio();
  if (audio.master && audio.ctx) {
    audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
    audio.master.gain.linearRampToValueAtTime(on ? 0.22 : 0.0, audio.ctx.currentTime + 0.6);
  }
  const btn = document.getElementById('sound');
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? '♪ sonido' : '♪ mudo';
}

/* ----------------------------------------------------------------------------
 * Loop
 * ------------------------------------------------------------------------- */
const timer = new THREE.Timer();
timer.connect(document); // zero the delta while the tab is hidden (no jump on return)
function tick() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  if (cine.playing) updateIntro();
  else updateControls(dt);
  const t = timer.getElapsed();
  waterUniforms.uTime.value = t;
  if (calesitaSpinner) calesitaSpinner.rotation.y += dt * 0.25;
  // strollers walking the lake loop
  for (const w of peopleWalkers) {
    w.a += w.spd * dt * 0.1;
    w.g.position.set(Math.cos(w.a) * w.R, Math.sin(t * 8 + w.a * 50) * 0.03, Math.sin(w.a) * w.R);
    w.g.rotation.y = -w.a + (w.spd > 0 ? 0 : Math.PI);
  }
  // the kite drifting over the calesita
  if (kite) {
    kite.g.position.y = kite.base.y + Math.sin(t * 0.8) * 0.7;
    kite.g.position.x = kite.base.x + Math.sin(t * 0.5) * 1.3;
    kite.g.rotation.z = Math.PI / 4 + Math.sin(t * 0.7) * 0.12;
  }
  // drift waterfowl gently around the lake
  for (const b of birds) {
    b.phase += dt * b.spd;
    b.g.position.x = b.base.x + Math.cos(b.phase) * 1.4;
    b.g.position.z = b.base.z + Math.sin(b.phase * 0.8) * 1.4;
    b.g.position.y = 0.45 + Math.sin(b.phase * 2) * 0.04;
    b.g.rotation.y = -b.phase;
  }
  updatePetals(dt, t);
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
 * Cinematic entrance — an aerial orbit of the park, then a dive into first person
 * ------------------------------------------------------------------------- */
const SPAWN = { pos: new THREE.Vector3(0, EYE, 54), yaw: 0, pitch: -0.06 };
const cine = {
  playing: false,
  t: 0,
  dur: 4.8,
  center: new THREE.Vector3(0, 5, 0),
  R: 74,
  hi: 98,
  ho: 70,
  a0: 2.75,
  a1: Math.PI / 2,
  orbit: 0.6, // fraction of the run spent orbiting before the dive
  _up: new THREE.Vector3(0, 1, 0),
  _m: new THREE.Matrix4(),
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function lookQuat(pos, target) {
  cine._m.lookAt(pos, target, cine._up);
  return new THREE.Quaternion().setFromRotationMatrix(cine._m);
}

function introPose(p) {
  if (p < cine.orbit) {
    const u = easeInOut(p / cine.orbit);
    const ang = cine.a0 + (cine.a1 - cine.a0) * u;
    const h = cine.hi + (cine.ho - cine.hi) * u;
    const pos = new THREE.Vector3(Math.cos(ang) * cine.R, h, Math.sin(ang) * cine.R);
    return { pos, quat: lookQuat(pos, cine.center) };
  }
  const u = easeInOut((p - cine.orbit) / (1 - cine.orbit));
  const aerialPos = new THREE.Vector3(Math.cos(cine.a1) * cine.R, cine.ho, Math.sin(cine.a1) * cine.R);
  const aerialQuat = lookQuat(aerialPos, cine.center);
  const spawnQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(SPAWN.pitch, SPAWN.yaw, 0, 'YXZ'));
  return {
    pos: aerialPos.clone().lerp(SPAWN.pos, u),
    quat: aerialQuat.clone().slerp(spawnQuat, u),
  };
}

function updateIntro() {
  // wall-clock driven so the run is a constant 4.8s at any frame rate
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
  // hand the camera to the player exactly where the dive ended
  camera.position.copy(SPAWN.pos);
  controls.yaw = SPAWN.yaw;
  controls.pitch = SPAWN.pitch;
  controls.active = true;
  document.getElementById('cinematic').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  // auto-hide the verbose control hint after ~9s (malamud behaviour)
  setTimeout(() => document.querySelector('.hint')?.classList.add('fade'), 9000);
}

// if the tab is hidden mid-intro, pause the wall-clock so the aerial reveal
// isn't silently used up — the visitor still gets the full drop on return.
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
  // motion-sensitive visitors skip the swooping aerial dive entirely
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
  // set the camera's initial orientation
  updateControls(0);
  requestAnimationFrame(tick);
  // tinkering hook (open the console and move the camera around)
  window.__park = { camera, controls };

  const enterBtn = document.getElementById('enter');
  const loadline = document.getElementById('loadline');
  loadline.textContent = 'el parque está listo.';
  enterBtn.disabled = false;
  enterBtn.addEventListener('click', enterScene);
  addEventListener('keydown', (e) => {
    if ((e.code === 'Enter' || e.code === 'Space') && !controls.active && !cine.playing) enterScene();
    if (e.code === 'Escape' && cine.playing) finishIntro();
  });

  document.getElementById('skip').addEventListener('click', finishIntro);
  // tap anywhere on the cinematic overlay to skip (the only escape hatch on touch)
  document.getElementById('cinematic').addEventListener('pointerdown', finishIntro);
  document.getElementById('sound').addEventListener('click', () => setAudio(!audio.on));
}

// guard: disable the enter button until boot finishes
document.getElementById('enter').disabled = true;
boot();
