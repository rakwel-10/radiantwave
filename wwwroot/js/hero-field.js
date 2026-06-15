/* ============================================================
   Radiant Wave — Hero 3D Signal Field (Three.js)
   Thousands of glowing nodes connected by luminous lines, with
   energy pulses flowing right → left. Starts in an angled /
   near-isometric view and rotates toward front-facing as the
   user scrolls. Decorative, non-interactive.
   ============================================================ */
import * as THREE from "three";

const canvas = document.getElementById("hero-canvas");
if (canvas) init();

function init() {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const host = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060d, 0.045);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
  camera.position.set(0, 0.6, 13.5);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  scene.add(group);

  // ---- Field dimensions ----
  const RX = 12, RY = 7, RZ = 5;
  const COUNT = window.innerWidth < 760 ? 800 : 1500;

  // node positions + colours (cyan → blue → purple → magenta across X)
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const tmp = new THREE.Color();
  const nodes = [];
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 2 * RX;
    const y = (Math.random() - 0.5) * 2 * RY;
    const z = (Math.random() - 0.5) * 2 * RZ;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const t = (x + RX) / (2 * RX);
    tmp.setHSL(0.52 + t * 0.34 + (Math.random() - 0.5) * 0.05, 0.85, 0.6);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    nodes.push({ x, y, z });
  }

  // ---- Glowing nodes (Points) ----
  const sprite = makeSprite();
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.16, map: sprite, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  group.add(new THREE.Points(pGeo, pMat));

  // ---- Luminous connections (LineSegments) ----
  const linePos = [];
  const lineCol = [];
  const THRESH = 1.85, MAXDEG = 4, MAXSEG = 4200;
  const deg = new Int8Array(COUNT);
  outer:
  for (let i = 0; i < COUNT; i++) {
    if (deg[i] >= MAXDEG) continue;
    for (let j = i + 1; j < COUNT; j++) {
      if (deg[j] >= MAXDEG) continue;
      const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dy * dy + dz * dz < THRESH * THRESH) {
        linePos.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
        lineCol.push(col[i * 3], col[i * 3 + 1], col[i * 3 + 2], col[j * 3], col[j * 3 + 1], col[j * 3 + 2]);
        deg[i]++; deg[j]++;
        if (linePos.length / 6 >= MAXSEG) break outer;
        if (deg[i] >= MAXDEG) break;
      }
    }
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  lGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineCol, 3));
  const lMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.LineSegments(lGeo, lMat));

  // ---- Energy pulses flowing right → left ----
  const PCOUNT = window.innerWidth < 760 ? 26 : 48;
  const pulsePos = new Float32Array(PCOUNT * 3);
  const pulses = [];
  for (let i = 0; i < PCOUNT; i++) {
    const p = { x: (Math.random() - 0.5) * 2 * RX, y: (Math.random() - 0.5) * 2 * RY, z: (Math.random() - 0.5) * 2 * RZ, sp: 0.04 + Math.random() * 0.06 };
    pulses.push(p);
    pulsePos[i * 3] = p.x; pulsePos[i * 3 + 1] = p.y; pulsePos[i * 3 + 2] = p.z;
  }
  const puGeo = new THREE.BufferGeometry();
  puGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
  const puMat = new THREE.PointsMaterial({ size: 0.5, map: sprite, color: 0xbfeaff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  group.add(new THREE.Points(puGeo, puMat));

  // ---- Orientation: angled start → front-facing on scroll ----
  const START_Y = -0.72, START_X = -0.14; // ~ 320°, slightly elevated
  let curY = START_Y, curX = START_X, t = 0;

  function scrollProgress() {
    const h = host.offsetHeight || window.innerHeight;
    return Math.min(1, Math.max(0, (window.scrollY || window.pageYOffset || 0) / h));
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  function frame() {
    t += reduceMotion ? 0.002 : 0.006;
    const p = scrollProgress();
    const e = p * p * (3 - 2 * p); // smoothstep
    const targetY = START_Y * (1 - e) + Math.sin(t * 0.5) * 0.04 * (1 - e);
    const targetX = START_X * (1 - e);
    curY += (targetY - curY) * 0.06;
    curX += (targetX - curX) * 0.06;
    group.rotation.y = curY;
    group.rotation.x = curX;

    // pulses drift right → left, wrap
    if (!reduceMotion) {
      for (let i = 0; i < PCOUNT; i++) {
        const pl = pulses[i];
        pl.x -= pl.sp;
        if (pl.x < -RX) { pl.x = RX; pl.y = (Math.random() - 0.5) * 2 * RY; pl.z = (Math.random() - 0.5) * 2 * RZ; }
        pulsePos[i * 3] = pl.x; pulsePos[i * 3 + 1] = pl.y; pulsePos[i * 3 + 2] = pl.z;
      }
      puGeo.attributes.position.needsUpdate = true;
      puMat.opacity = 0.8 + Math.sin(t * 2) * 0.15;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function makeSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.85)");
  g.addColorStop(0.5, "rgba(190,225,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
