/**
 * Gallery landing stage: three featured photos stacked vertically that bend like paper while
 * they travel (wheel, drag or swipe), snapping to one at a time, with pixelated photos drifting
 * at different depths around them. One world unit = one CSS pixel at z = 0.
 */
import * as THREE from "three";

export interface Slide { src: string; width: number; height: number }
export interface StageHooks {
  onActive(index: number): void;                  // the slide that is (or is becoming) centred
  onLayout(captionTop: number, frameWidth: number): void; // px from viewport top, under the active frame
  onOpen(index: number): void;                    // click/tap/Enter on the active frame
  onHover(over: boolean): void;
}
export interface StageOptions { reducedMotion: boolean; topInset: () => number }

const NAVY = new THREE.Color("#050d24");

const slideVert = /* glsl */ `
  uniform float uBend;     // velocity-driven curl, signed
  uniform float uOffset;   // distance from the centre slot, in slides (signed)
  uniform vec2 uSize;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    float ny = p.y / (uSize.y * 0.5);
    float nx = p.x / (uSize.x * 0.5);
    // a sheet of paper: curls along its height with speed and as it leaves the centre
    float curl = uBend + clamp(uOffset, -1.5, 1.5) * 0.55;
    p.z -= curl * sign(ny) * ny * ny * uSize.y * 0.22;
    p.z -= abs(uBend) * nx * nx * uSize.x * 0.10;
    p.z += abs(uBend) * sin(ny * 3.14159) * uSize.y * 0.03;
    vShade = 1.0 - min(0.45, abs(curl) * ny * ny * 0.5);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const slideFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uImage;     // image px
  uniform vec2 uSize;      // frame px
  uniform float uBend;
  uniform float uOffset;
  uniform float uZoom;     // 1 = cover, <1 zooms in (hover)
  uniform float uDim;      // 0 active .. 1 fully navy
  uniform float uAlpha;
  uniform float uReady;    // texture loaded
  uniform vec3 uNavy;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    // object-fit: cover, plus a little vertical parallax inside the frame
    vec2 r = uSize / uImage;
    float s = max(r.x, r.y);
    vec2 scale = (uSize / (uImage * s)) * uZoom;
    vec2 uv = (vUv - 0.5) * scale + 0.5;
    uv.y += uOffset * 0.06 * scale.y;
    float split = uBend * 0.012;
    vec3 col = vec3(
      texture2D(uTex, uv + vec2(0.0, split)).r,
      texture2D(uTex, uv).g,
      texture2D(uTex, uv - vec2(0.0, split)).b
    );
    col = mix(uNavy * 1.6, col, uReady);
    col *= vShade;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, mix(uNavy, vec3(lum) * 0.55 + uNavy * 0.6, 0.55), uDim);
    gl_FragColor = vec4(col, uAlpha);
    #include <colorspace_fragment>
  }
`;

const ghostFrag = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uImage;
  uniform vec2 uSize;
  uniform float uCells;    // mosaic resolution across the short side
  uniform float uAlpha;
  uniform float uReady;
  uniform vec3 uNavy;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 r = uSize / uImage;
    float s = max(r.x, r.y);
    vec2 uv = (vUv - 0.5) * (uSize / (uImage * s)) + 0.5;
    vec2 cells = vec2(uCells * uSize.x / min(uSize.x, uSize.y), uCells * uSize.y / min(uSize.x, uSize.y));
    vec2 q = (floor(vUv * cells) + 0.5) / cells;
    vec2 quv = (q - 0.5) * (uSize / (uImage * s)) + 0.5;
    vec3 col = texture2D(uTex, quv).rgb;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(lum), 0.35);
    float scan = 0.85 + 0.15 * step(0.5, fract(vUv.y * cells.y * 0.5 + uTime * 0.2));
    col = mix(uNavy, col, 0.75) * scan;
    gl_FragColor = vec4(col, uAlpha * uReady);
    #include <colorspace_fragment>
  }
`;

const ghostVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

interface Ghost { mesh: THREE.Mesh; base: THREE.Vector3; speed: number; phase: number; rot: number }

export function startStage(canvas: HTMLCanvasElement, slides: Slide[], ghosts: Slide[], hooks: StageHooks, opts: StageOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 10, 6000);
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const loadTex = (src: string, onReady: () => void) => {
    const tex = loader.load(src, () => onReady());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, maxAniso);
    return tex;
  };

  // ---------------------------------------------------------------- featured slides
  const geo = new THREE.PlaneGeometry(1, 1, 24, 48);
  const meshes = slides.map((s) => {
    const uniforms = {
      uTex: { value: null as THREE.Texture | null }, uImage: { value: new THREE.Vector2(s.width, s.height) },
      uSize: { value: new THREE.Vector2(1, 1) }, uBend: { value: 0 }, uOffset: { value: 0 }, uZoom: { value: 1 },
      uDim: { value: 0 }, uAlpha: { value: 1 }, uReady: { value: 0 }, uNavy: { value: NAVY },
    };
    uniforms.uTex.value = loadTex(s.src, () => { uniforms.uReady.value = 1; dirty = true; });
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: slideVert, fragmentShader: slideFrag, transparent: true });
    const mesh = new THREE.Mesh(geo.clone(), mat);
    scene.add(mesh);
    return mesh;
  });

  // ---------------------------------------------------------------- drifting ghosts
  const ghostList: Ghost[] = [];
  const ghostGeo = new THREE.PlaneGeometry(1, 1);
  const time = { value: 0 };
  ghosts.forEach((g, i) => {
    const uniforms = {
      uTex: { value: null as THREE.Texture | null }, uImage: { value: new THREE.Vector2(g.width, g.height) },
      uSize: { value: new THREE.Vector2(1, 1) }, uCells: { value: 26 + (i % 3) * 10 }, uAlpha: { value: 0.5 },
      uReady: { value: 0 }, uNavy: { value: NAVY }, uTime: time,
    };
    // ghosts load after the featured photos so they never compete with them
    setTimeout(() => { uniforms.uTex.value = loadTex(g.src, () => { uniforms.uReady.value = 1; }); }, 600 + i * 120);
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: ghostVert, fragmentShader: ghostFrag, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(ghostGeo, mat);
    mesh.renderOrder = -1;
    scene.add(mesh);
    ghostList.push({ mesh, base: new THREE.Vector3(), speed: 0.35 + ((i * 37) % 10) / 14, phase: i * 1.7, rot: (((i * 53) % 9) - 4) * 0.06 });
  });

  // ---------------------------------------------------------------- layout
  let vw = 1, vh = 1, frameW = 1, frameH = 1, spacing = 1, centreY = 0;
  function layout() {
    vw = canvas.clientWidth; vh = canvas.clientHeight;
    const mobile = vw < 700;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.position.z = (vh / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.updateProjectionMatrix();

    const top = opts.topInset();
    const avail = vh - top;
    frameH = Math.min(avail * (mobile ? 0.56 : 0.6), (vw * (mobile ? 0.74 : 0.5)) * 1.25);
    frameW = frameH * 0.8;
    spacing = frameH * 1.18;
    centreY = -(top / 2) + avail * 0.06;     // visual centre of the area under the header, nudged up for the caption
    meshes.forEach((m) => {
      m.scale.set(frameW, frameH, 1);
      (m.material as THREE.ShaderMaterial).uniforms.uSize.value.set(frameW, frameH);
    });

    // scatter ghosts around the frame, never on top of it
    const golden = 2.39996;
    ghostList.forEach((g, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const w = (mobile ? 70 : 120) + ((i * 41) % 5) * (mobile ? 14 : 26);
      const aspect = 0.72 + ((i * 29) % 6) * 0.12;
      g.mesh.scale.set(w, w * aspect, 1);
      (g.mesh.material as THREE.ShaderMaterial).uniforms.uSize.value.set(w, w * aspect);
      const lane = frameW / 2 + w * 0.4 + ((i * 67) % 4) * (vw * 0.07);
      g.base.set(side * Math.min(lane, vw / 2 + w * 0.1), ((i * golden) % 1 - 0.5) * vh * 1.6, -250 - ((i * 113) % 7) * 120);
    });
    const captionTop = vh / 2 - centreY + frameH / 2;
    hooks.onLayout(captionTop, frameW);
    dirty = true;
  }

  // ---------------------------------------------------------------- motion state
  const n = slides.length;
  let target = 0, current = 0, bend = 0, anchor = 0, active = -1;
  let hover = 0, hoverTarget = 0, tiltX = 0, tiltY = 0, pointerNX = 0, pointerNY = 0;
  let idleTimer = 0, dirty = true;
  const clampT = (v: number) => Math.max(-0.35, Math.min(n - 1 + 0.35, v));
  const snap = (flick = 0) => {
    const moved = target - anchor;
    let to = anchor;
    if (Math.abs(moved) > 0.12 || Math.abs(flick) > 0.6) to = anchor + Math.sign(Math.abs(moved) > 0.12 ? moved : flick) * Math.max(1, Math.round(Math.abs(moved)));
    target = Math.max(0, Math.min(n - 1, to));
    anchor = target;
  };
  const go = (i: number) => { target = anchor = Math.max(0, Math.min(n - 1, i)); };

  // wheel / trackpad
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const dy = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 16 : 1);
    target = clampT(target + dy * 0.0028);
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => snap(), 140);
  };

  // drag / swipe
  let dragging = false, dragStartY = 0, dragStartT = 0, lastY = 0, lastTime = 0, flickV = 0, travel = 0;
  const onDown = (e: PointerEvent) => {
    dragging = true; travel = 0; flickV = 0;
    dragStartY = lastY = e.clientY; dragStartT = target; lastTime = performance.now();
    anchor = Math.round(target);
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointerNX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    if (dragging) {
      const now = performance.now();
      travel = Math.max(travel, Math.abs(e.clientY - dragStartY));
      flickV = ((lastY - e.clientY) / spacing) / Math.max(1, now - lastTime) * 1000;
      lastY = e.clientY; lastTime = now;
      target = clampT(dragStartT + (dragStartY - e.clientY) / spacing * 1.2);
    }
    updateHover(e.clientX, e.clientY);
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (travel < 6) {
      target = anchor;
      const hit = pick(e.clientX, e.clientY);
      if (hit === Math.round(current)) hooks.onOpen(hit);
      else if (hit >= 0) go(hit);
    } else snap(flickV);
  };
  const onLeave = () => { hoverTarget = 0; pointerNX = pointerNY = 0; hooks.onHover(false); };

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(x: number, y: number) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? meshes.indexOf(hit.object as (typeof meshes)[number]) : -1;
  }
  function updateHover(x: number, y: number) {
    const over = !dragging && pick(x, y) === Math.round(current) && Math.abs(current - Math.round(current)) < 0.1;
    if (over !== (hoverTarget === 1)) hooks.onHover(over);
    hoverTarget = over ? 1 : 0;
  }

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  layout();

  // ---------------------------------------------------------------- loop
  const clock = new THREE.Clock();
  let raf = 0, intro = opts.reducedMotion ? 1 : 0;
  const ease = (x: number) => 1 - Math.pow(1 - x, 4);
  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.25);
    time.value += dt;
    const k = opts.reducedMotion ? 14 : 5.5;
    const prev = current;
    current += (target - current) * (1 - Math.exp(-dt * k));
    if (Math.abs(target - current) < 0.0005) current = target;
    const vel = (current - prev) / Math.max(dt, 1e-4);
    const bendTarget = opts.reducedMotion ? 0 : THREE.MathUtils.clamp(vel * 0.16, -0.75, 0.75);
    bend += (bendTarget - bend) * (1 - Math.exp(-dt * 8));
    hover += (hoverTarget - hover) * (1 - Math.exp(-dt * 7));
    tiltX += (pointerNY * 0.06 * hover - tiltX) * (1 - Math.exp(-dt * 6));
    tiltY += (pointerNX * 0.09 * hover - tiltY) * (1 - Math.exp(-dt * 6));
    if (intro < 1) intro = Math.min(1, intro + dt / 1.6);
    const ie = ease(intro);

    const nowActive = Math.max(0, Math.min(n - 1, Math.round(current)));
    if (nowActive !== active) { active = nowActive; hooks.onActive(active); }

    meshes.forEach((m, i) => {
      const off = i - current;
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      const abs = Math.abs(off);
      // entrance: slides rise in from below, curled
      const introOff = (1 - ie) * 1.6;
      m.position.set(0, centreY - (off + introOff) * spacing, -abs * frameH * 0.45);
      m.rotation.set(-off * 0.28 + (i === active ? tiltX : 0), i === active ? tiltY : 0, off * 0.02);
      const sc = 1 - Math.min(abs, 1.5) * 0.12 + (i === active ? hover * 0.025 : 0);
      m.scale.set(frameW * sc, frameH * sc, 1);
      u.uBend.value = bend + (1 - ie) * 0.6;
      u.uOffset.value = off + introOff;
      u.uDim.value = Math.min(1, abs * 0.85);
      u.uAlpha.value = Math.max(0, 1 - abs * 0.62) * Math.min(1, ie * 1.5);
      u.uZoom.value = 1 - (i === active ? hover * 0.05 : 0);
      m.visible = u.uAlpha.value > 0.01;
    });

    ghostList.forEach((g) => {
      const span = vh * 1.8;
      let y = g.base.y + current * spacing * g.speed + Math.sin(time.value * 0.25 + g.phase) * 14;
      y = ((y + span / 2) % span + span) % span - span / 2;
      g.mesh.position.set(g.base.x + Math.cos(time.value * 0.2 + g.phase) * 10, centreY + y, g.base.z);
      g.mesh.rotation.set(0, 0, g.rot + bend * 0.15 * g.speed);
      (g.mesh.material as THREE.ShaderMaterial).uniforms.uAlpha.value = 0.42 * Math.min(1, ie * 1.2);
    });

    renderer.render(scene, camera);
    dirty = false;
  }
  frame();

  return {
    go,
    step(d: number) { go(Math.round(target) + d); },
    get active() { return active; },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("wheel", onWheel);
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.ShaderMaterial | undefined;
        if (mat) { mat.uniforms?.uTex?.value?.dispose?.(); mat.dispose(); }
      });
    },
  };
}
