/**
 * Homepage intro: a 3D Dalian Yingbo crest rises from below while a gold star drops from
 * above, both settle, the star sparkles, then the page reveals the club name and ENTER.
 *
 * Assets (public/intro/): crest-face.webp (artwork, alpha-masked), crest-normal.webp
 * (relief normal map derived from the artwork), shield.json (outline traced from it).
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export interface IntroHooks {
  /** logo has settled: reveal the club name */
  onLogoSettled(): void;
  /** every animation finished: show ENTER */
  onComplete(): void;
  /** screen-space y (px) just below the crest, for laying out the HTML text */
  onLayout(belowCrestPx: number): void;
}

export interface IntroController {
  /** play the exit transition; resolves when finished */
  exit(): Promise<void>;
  dispose(): void;
}

// ------------------------------------------------------------------ tuning

const CREST_H = 3.2;
const CREST_DEPTH = 0.16;
const BEVEL_T = 0.05;
const BEVEL_S = 0.045;
const STAR_R = 0.42;
const STAR_GAP = 0.78; // crest top -> star centre

const T_LOGO = [0.0, 3.0];   // start, end (s)
const T_STAR = [0.55, 3.35];
const T_SPARK = [3.35, 4.9];
const T_DONE = 4.7;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const phase = (t: number, [a, b]: number[]) => clamp01((t - a) / (b - a));

// ------------------------------------------------------------------ builders

async function loadOutline(): Promise<{ shape: THREE.Shape; w: number; h: number }> {
  const res = await fetch("/intro/shield.json");
  const { aspect, points } = (await res.json()) as { aspect: number; points: [number, number][] };
  const h = CREST_H;
  const w = h * aspect;
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => {
    const X = (x - 0.5) * w;
    const Y = (0.5 - y) * h;
    i === 0 ? shape.moveTo(X, Y) : shape.lineTo(X, Y);
  });
  shape.closePath();
  return { shape, w, h };
}

function faceUVs(geo: THREE.BufferGeometry, w: number, h: number) {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function buildCrest(shape: THREE.Shape, w: number, h: number, face: THREE.Texture, normal: THREE.Texture) {
  const group = new THREE.Group();

  // silver body with bevelled rim
  const body = new THREE.ExtrudeGeometry(shape, {
    depth: CREST_DEPTH, bevelEnabled: true, bevelThickness: BEVEL_T, bevelSize: BEVEL_S,
    bevelSegments: 6, curveSegments: 1,
  });
  body.translate(0, 0, -CREST_DEPTH / 2);
  const silver = new THREE.MeshPhysicalMaterial({
    color: 0xd9dee6, metalness: 1, roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.15,
  });
  const bodyMesh = new THREE.Mesh(body, silver);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // enamel face carrying the crest artwork + relief normal map
  const frontZ = CREST_DEPTH / 2 + BEVEL_T + 0.002;
  const faceGeo = new THREE.ShapeGeometry(shape, 1);
  faceUVs(faceGeo, w, h);
  const faceMat = new THREE.MeshPhysicalMaterial({
    map: face, normalMap: normal, normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.5, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.12,
    envMapIntensity: 0.45, transparent: true, alphaTest: 0.05,
  });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.z = frontZ;
  group.add(faceMesh);

  // brushed navy back plate
  const backGeo = new THREE.ShapeGeometry(shape, 1);
  const backMat = new THREE.MeshPhysicalMaterial({ color: 0x14306c, metalness: 0.7, roughness: 0.32, clearcoat: 0.6 });
  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.rotation.y = Math.PI;
  backMesh.position.z = -frontZ;
  group.add(backMesh);

  return group;
}

/** Faceted five-point star: every arm is a pyramid, like a cast metal badge star. */
function buildStar() {
  const outer = STAR_R, inner = STAR_R * 0.42, front = STAR_R * 0.36, back = STAR_R * 0.18;
  const ring: THREE.Vector3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    ring.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  const apexF = new THREE.Vector3(0, 0, front);
  const apexB = new THREE.Vector3(0, 0, -back);
  const v: number[] = [];
  for (let i = 0; i < 10; i++) {
    const p = ring[i], q = ring[(i + 1) % 10];
    v.push(apexF.x, apexF.y, apexF.z, p.x, p.y, p.z, q.x, q.y, q.z);
    v.push(apexB.x, apexB.y, apexB.z, q.x, q.y, q.z, p.x, p.y, p.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals(); // non-indexed -> crisp facets
  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xf0c868, metalness: 1, roughness: 0.16, clearcoat: 0.4, clearcoatRoughness: 0.1,
    emissive: 0x6a4a10, emissiveIntensity: 0,
  });
  const mesh = new THREE.Mesh(geo, gold);
  mesh.castShadow = true;
  return { mesh, material: gold, tips: ring.filter((_, i) => i % 2 === 0) };
}

function glintTexture() {
  const s = 256, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const mid = s / 2;
  const radial = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
  radial.addColorStop(0, "rgba(255,255,255,1)");
  radial.addColorStop(0.08, "rgba(255,244,210,0.95)");
  radial.addColorStop(0.25, "rgba(255,206,110,0.35)");
  radial.addColorStop(1, "rgba(255,190,80,0)");
  g.fillStyle = radial;
  g.fillRect(0, 0, s, s);
  // four-point flare rays
  g.globalCompositeOperation = "lighter";
  for (const [len, wid, rot] of [[mid, 3, 0], [mid, 3, Math.PI / 2], [mid * 0.55, 2, Math.PI / 4], [mid * 0.55, 2, -Math.PI / 4]]) {
    g.save();
    g.translate(mid, mid);
    g.rotate(rot);
    const lg = g.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0, "rgba(255,220,150,0)");
    lg.addColorStop(0.5, "rgba(255,255,255,0.95)");
    lg.addColorStop(1, "rgba(255,220,150,0)");
    g.fillStyle = lg;
    g.fillRect(-len, -wid / 2, len * 2, wid);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function haloTexture() {
  const s = 256, c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, "rgba(255,214,120,0.55)");
  r.addColorStop(0.35, "rgba(232,180,35,0.18)");
  r.addColorStop(1, "rgba(232,180,35,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ------------------------------------------------------------------ main

export async function startIntro(
  canvas: HTMLCanvasElement,
  hooks: IntroHooks,
  opts: { reducedMotion: boolean; freezeAt?: number | null },
): Promise<IntroController> {
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 600;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.75 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the crest's navy/white true to the artwork
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // assets
  const loader = new THREE.TextureLoader();
  const [outline, face, normal] = await Promise.all([
    loadOutline(),
    loader.loadAsync("/intro/crest-face.webp"),
    loader.loadAsync("/intro/crest-normal.webp"),
  ]);
  face.colorSpace = THREE.SRGBColorSpace;
  face.anisotropy = renderer.capabilities.getMaxAnisotropy();
  normal.anisotropy = face.anisotropy;

  const crest = buildCrest(outline.shape, outline.w, outline.h, face, normal);
  const crestRig = new THREE.Group(); // position/rotation animated on the rig, idle sway on crest
  crestRig.add(crest);
  scene.add(crestRig);

  const star = buildStar();
  const starRig = new THREE.Group();
  starRig.add(star.mesh);
  scene.add(starRig);
  const starY = CREST_H / 2 + STAR_GAP;

  // glow + glints live with the star (not rotating)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  halo.scale.setScalar(STAR_R * 6);
  halo.position.set(0, starY, -0.3);
  scene.add(halo);

  const glintTex = glintTexture();
  const glintSpots = [new THREE.Vector3(0, 0, STAR_R * 0.4), ...star.tips.map((p) => p.clone().multiplyScalar(0.92).setZ(0.05))];
  const glints = glintSpots.map((p, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.position.copy(p).add(new THREE.Vector3(0, starY, 0.25));
    s.userData = { delay: i === 0 ? 0 : 0.18 + i * 0.13, size: i === 0 ? STAR_R * 3.4 : STAR_R * 1.5 };
    scene.add(s);
    return s;
  });

  // fine golden dust burst
  const N = mobile ? 40 : 70;
  const dustPos = new Float32Array(N * 3), dustVel: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, (Math.random() - 0.5) * 0.5).normalize();
    dustVel.push(dir.multiplyScalar(0.6 + Math.random() * 1.2));
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ map: glintTex, size: 0.09, color: 0xffd98a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, sizeAttenuation: true });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.position.set(0, starY, 0.2);
  scene.add(dust);

  // lights
  const key = new THREE.DirectionalLight(0xfff4e6, 1.7);
  key.position.set(-3.5, 5, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6f9bff, 1.6);
  rim.position.set(4, 3, -4);
  scene.add(rim);
  const sweep = new THREE.PointLight(0xffffff, 0, 9, 1.6); // specular sweep across the crest
  scene.add(sweep);
  const starLight = new THREE.PointLight(0xffc860, 0, 4, 2); // star glow spilling onto the crest
  starLight.position.set(0, starY, 0.8);
  scene.add(starLight);

  // backdrop that only catches shadows (colour comes from the CSS background)
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.ShadowMaterial({ opacity: 0.3 }));
  backdrop.position.z = -1.4;
  backdrop.receiveShadow = true;
  scene.add(backdrop);

  // ---------------------------------------------------------------- layout
  const contentTop = starY + STAR_R;
  const contentBottom = -CREST_H / 2 - BEVEL_S;
  function layout() {
    const wpx = canvas.clientWidth || window.innerWidth;
    const hpx = canvas.clientHeight || window.innerHeight;
    renderer.setSize(wpx, hpx, false);
    camera.aspect = wpx / hpx;
    const span = contentTop - contentBottom;
    const portrait = camera.aspect < 0.8;
    const hv = Math.max(span / (portrait ? 0.56 : 0.6), (outline.w + 0.6) / (camera.aspect * 0.78));
    const dist = hv / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const cy = contentTop + 0.08 * hv - hv / 2;
    camera.position.set(0, cy, dist);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
    const below = new THREE.Vector3(0, contentBottom, 0).project(camera);
    hooks.onLayout(((1 - below.y) / 2) * hpx);
  }
  layout();
  window.addEventListener("resize", layout);

  // subtle pointer parallax once settled
  const pointer = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer);

  // ---------------------------------------------------------------- timeline
  const clock = new THREE.Clock();
  let t = opts.reducedMotion ? T_SPARK[1] + 0.5 : 0;
  let settledFired = false, doneFired = false;
  let exiting = false, exitT = 0, exitResolve: (() => void) | null = null;
  let raf = 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    // follow real time so the sequence keeps its pacing at any frame rate; only clamp
    // big stalls (e.g. returning to a background tab)
    const dt = Math.min(clock.getDelta(), 0.25);
    t = opts.freezeAt != null ? opts.freezeAt : t + dt;

    // crest: rises from below, spinning, decelerating into place
    const pl = phase(t, T_LOGO);
    crestRig.position.y = THREE.MathUtils.lerp(-7.5, 0, easeOutCubic(pl));
    crestRig.rotation.y = -Math.PI * 2 * (1 - easeOutCubic(pl));
    crestRig.rotation.x = 0.45 * (1 - easeOutCubic(pl));

    // star: drops from above, spinning faster, settles above the crest
    const ps = phase(t, T_STAR);
    starRig.position.y = THREE.MathUtils.lerp(starY + 7, starY, easeOutCubic(ps));
    star.mesh.rotation.y = Math.PI * 4 * (1 - easeOutCubic(ps));
    star.mesh.rotation.z = 0.6 * (1 - easeOutCubic(ps));

    // light sweep across the crest as it lands
    const sw = phase(t, [2.3, 3.6]);
    sweep.intensity = Math.sin(sw * Math.PI) * 7;
    sweep.position.set(THREE.MathUtils.lerp(-3, 3, easeInOutCubic(sw)), THREE.MathUtils.lerp(1.6, -1.2, sw), 2.2);

    // sparkle
    const sp = phase(t, T_SPARK);
    const pulse = sp > 0 && sp < 1 ? Math.sin(sp * Math.PI) : 0;
    star.material.emissiveIntensity = pulse * 1.4;
    starLight.intensity = pulse * 6;
    const idle = sp >= 1 ? 0.5 + 0.5 * Math.sin(t * 1.6) : 0;
    (halo.material as THREE.SpriteMaterial).opacity = Math.max(pulse, idle * 0.45) * (sp > 0 ? 1 : 0);
    halo.scale.setScalar(STAR_R * (5 + pulse * 2.5));
    const local = (t - T_SPARK[0]);
    glints.forEach((g, i) => {
      const k = clamp01((local - g.userData.delay) / 0.7);
      const flash = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
      // after the main sparkle, tips twinkle now and then
      const twinkle = sp >= 1 ? Math.pow(Math.max(0, Math.sin(t * 1.3 + i * 2.1)), 24) * 0.8 : 0;
      const o = Math.max(flash, twinkle);
      (g.material as THREE.SpriteMaterial).opacity = o;
      (g.material as THREE.SpriteMaterial).rotation = t * 0.6 + i;
      g.scale.setScalar(g.userData.size * (0.4 + o * 0.8));
    });
    const dk = clamp01((t - T_SPARK[0] - 0.1) / 1.4);
    dustMat.opacity = dk > 0 && dk < 1 ? (1 - dk) * 0.9 : 0;
    for (let i = 0; i < N; i++) {
      const d = easeOutCubic(dk);
      dustPos[i * 3] = dustVel[i].x * d;
      dustPos[i * 3 + 1] = dustVel[i].y * d - dk * dk * 0.25;
      dustPos[i * 3 + 2] = dustVel[i].z * d;
    }
    dustGeo.attributes.position.needsUpdate = true;

    // idle: gentle float + pointer parallax
    if (pl >= 1) {
      const f = clamp01((t - T_LOGO[1]) / 1.2);
      crest.rotation.y = THREE.MathUtils.lerp(crest.rotation.y, (Math.sin(t * 0.5) * 0.06 + pointer.x * 0.18) * f, 0.06);
      crest.rotation.x = THREE.MathUtils.lerp(crest.rotation.x, (pointer.y * 0.1) * f, 0.06);
      crest.position.y = Math.sin(t * 0.9) * 0.03 * f;
      star.mesh.rotation.y += sp >= 1 ? dt * 0.35 : 0;
      starRig.position.y = starY + Math.sin(t * 0.9 + 0.6) * 0.04 * f;
    }

    if (!settledFired && pl >= 1) { settledFired = true; hooks.onLogoSettled(); }
    if (!doneFired && t >= T_DONE) { doneFired = true; hooks.onComplete(); }

    // exit: camera pushes in while the scene lifts and fades (overlay fade is CSS)
    if (exiting) {
      exitT += dt;
      const e = easeInOutCubic(clamp01(exitT / 1.0));
      camera.position.z -= dt * 6 * e;
      crestRig.scale.setScalar(1 + e * 0.25);
      starRig.position.y += dt * 2 * e;
      if (exitT >= 1.0 && exitResolve) { exitResolve(); exitResolve = null; }
    }

    renderer.render(scene, camera);
  }
  frame();

  return {
    exit() {
      exiting = true;
      return new Promise((r) => (exitResolve = r));
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", layout);
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mat) => {
          Object.values(mat).forEach((v) => v instanceof THREE.Texture && v.dispose());
          mat.dispose();
        });
      });
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
