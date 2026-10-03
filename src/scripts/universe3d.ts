/**
 * src/scripts/universe3d.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * 星穹档案 · Three.js 3D 星穹背景（全页沉浸层）
 *   - 万级星点（自定义 ShaderMaterial：尺寸衰减 + 呼吸闪烁 + 三色温）
 *   - 星云精灵（canvas 径向渐变贴图，加色混合，缓慢漂移）
 *   - 3D 流星（条纹精灵 + 屏幕空间旋转），承接 window.__meteorShower 彩蛋
 *   - 滚动驱动相机在星海中穿行 + 鼠标视差（阻尼平滑）
 *   - UnrealBloom 辉光后期；隐藏页暂停渲染；WebGL 失败由调用方降级 2D 星野
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

interface Meteor {
  sprite: THREE.Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  bright: boolean;
}

/** 径向柔光贴图（星云 / 星点光晕用） */
function makeRadialTexture(inner: string, outer: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 水平流星条纹贴图（右端亮头，向左渐隐尾迹） */
function makeStreakTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 32;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.72, 'rgba(255,244,214,0.55)');
  grad.addColorStop(0.97, 'rgba(255,252,240,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // 竖向柔边
  const fade = g.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.5, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = fade;
  g.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function initUniverse3D(): boolean {
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;
  const isMobile = window.innerWidth < 768;

  // ── 渲染器 ────────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.className = 'bg-universe';
  canvas.setAttribute('aria-hidden', 'true');
  const host = document.getElementById('bg-stars')?.parentElement ?? document.body;
  host.insertBefore(canvas, document.getElementById('bg-stars') ?? null);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    canvas.remove();
    return false;
  }
  // 输出端会对清屏色做 linear→sRGB 编码（encode(#060a14) 会显示成灰蓝雾），
  // 因此传入预解码的线性值，使最终显示色与页面底色 #060a14 一致
  renderer.setClearColor(0x000102, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(W(), H());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, W() / H(), 0.1, 720);
  camera.position.set(0, 0, 55);

  // ── 星点云（自定义着色器：闪烁 + 尺寸衰减）─────────────────────────────────
  const STAR_COUNT = isMobile ? 4200 : 9600;
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const phases = new Float32Array(STAR_COUNT);

  // 三色温：蓝白 / 暖金 / 星青（少量暮紫）
  const PALETTE: [number, number, number][] = [
    [0.87, 0.91, 1.0],
    [0.9, 0.82, 0.62],
    [0.54, 0.86, 0.91],
    [0.62, 0.55, 0.97],
  ];
  for (let i = 0; i < STAR_COUNT; i++) {
    const spread = 0.55 + Math.random() * 0.45;
    positions[i * 3] = (Math.random() - 0.5) * 300 * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 210 * spread;
    positions[i * 3 + 2] = -240 + Math.random() * 285;
    const pick = Math.random();
    const c =
      pick < 0.58 ? PALETTE[0] : pick < 0.8 ? PALETTE[1] : pick < 0.95 ? PALETTE[2] : PALETTE[3];
    const dim = 0.38 + Math.random() * 0.42;
    colors[i * 3] = c[0] * dim;
    colors[i * 3 + 1] = c[1] * dim;
    colors[i * 3 + 2] = c[2] * dim;
    sizes[i] = Math.random() < 0.028 ? 2.1 + Math.random() * 1.3 : 0.45 + Math.random() * 1.15;
    phases[i] = Math.random();
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uReveal: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vColor = aColor;
        vTw = 0.66 + 0.34 * sin(uTime * (0.5 + aPhase * 1.7) + aPhase * 6.2831);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (165.0 / max(1.0, -mv.z)) * (0.72 + 0.5 * vTw);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        float r = length(gl_PointCoord - vec2(0.5)) * 2.0;
        float alpha = smoothstep(1.0, 0.12, r);
        gl_FragColor = vec4(vColor, alpha * (0.42 + 0.42 * vTw) * uReveal);
      }
    `,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ── 星云精灵 ──────────────────────────────────────────────────────────────
  interface Nebula {
    sprite: THREE.Sprite;
    base: THREE.Vector3;
    amp: number;
    speed: number;
    phase: number;
    baseOpacity: number;
  }
  const nebulae: Nebula[] = [];
  // 低饱和深空云气：宽而淡，退到景深处，只作氛围衬底
  const nebulaDefs: { color: string; opacity: number; scale: number }[] = [
    { color: 'rgba(96, 110, 190, 0.13)', opacity: 0.2, scale: 430 },
    { color: 'rgba(138, 219, 232, 0.08)', opacity: 0.16, scale: 380 },
    { color: 'rgba(230, 201, 143, 0.07)', opacity: 0.15, scale: 410 },
    { color: 'rgba(157, 140, 248, 0.09)', opacity: 0.14, scale: 470 },
  ];
  for (const def of nebulaDefs) {
    const tex = makeRadialTexture(def.color, 'rgba(0,0,0,0)');
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    const base = new THREE.Vector3(
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 130,
      -310 + Math.random() * 170,
    );
    sprite.position.copy(base);
    sprite.scale.setScalar(def.scale);
    scene.add(sprite);
    nebulae.push({
      sprite,
      base,
      amp: 5 + Math.random() * 8,
      speed: 0.04 + Math.random() * 0.06,
      phase: Math.random() * Math.PI * 2,
      baseOpacity: def.opacity,
    });
  }

  // ── 流星（条纹精灵池）────────────────────────────────────────────────────
  const streakTex = makeStreakTexture();
  const meteors: Meteor[] = [];
  const spawnMeteor = (bright = false, burstX?: number) => {
    const mat = new THREE.SpriteMaterial({
      map: streakTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      rotation: 0,
    });
    const sprite = new THREE.Sprite(mat);
    const x = burstX ?? (Math.random() - 0.5) * 220;
    sprite.position.set(x, 45 + Math.random() * 60, -70 + Math.random() * 75);
    const s = bright ? 1.5 : 1;
    sprite.scale.set(52 * s, 2.4 * s, 1);
    scene.add(sprite);
    meteors.push({
      sprite,
      vx: -(26 + Math.random() * 22),
      vy: -(15 + Math.random() * 11),
      life: 0,
      max: 1.7 + Math.random() * 1.1,
      bright,
    });
  };

  // 彩蛋钩子：页脚星星 / 游戏破纪录 → 流星雨（与 2D 版同契约）
  (window as unknown as { __meteorShower?: () => void }).__meteorShower = () => {
    for (let i = 0; i < 30; i++) {
      window.setTimeout(() => spawnMeteor(true, (Math.random() - 0.5) * 240), i * 95);
    }
  };

  let nextMeteor = 6 + Math.random() * 6;

  // ── Bloom 后期（高阈值：只有最亮的星与流星头部微微发光）───────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(W(), H()),
    isMobile ? 0.34 : 0.42,
    0.5,
    0.62,
  );
  composer.addPass(bloom);

  // ── 交互输入（滚动穿行 + 鼠标视差）────────────────────────────────────────
  const mouse = { x: 0, y: 0 };
  let scrollProgress = 0;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };
  const onMouseMove = (e: MouseEvent) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  onScroll();

  const onResize = () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
    composer.setSize(W(), H());
    bloom.resolution.set(W(), H());
  };
  window.addEventListener('resize', onResize);

  // ── 主循环 ────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let raf = 0;
  let running = true;
  let camZ = 55;
  // 动画时间全部由 dt 累计（确定性驱动：rAF 主循环与同步 step 钩子共用）
  let elapsed = 0;

  /** 单帧推进 + 渲染（主循环与同步钩子共用） */
  const stepAndRender = (dt: number) => {
    elapsed += dt;
    const t = elapsed;

    // 入场揭示：2.6s 平滑淡入，避免整片星空突兀砸出
    const rv = Math.min(1, t / 2.6);
    const reveal = rv * rv * (3 - 2 * rv);

    // 相机沿滚动深度缓缓穿行，鼠标视差收敛到若有似无
    const targetZ = 55 - scrollProgress * 118;
    camZ += (targetZ - camZ) * Math.min(1, dt * 1.7);
    camera.position.x += (mouse.x * 8 - camera.position.x) * Math.min(1, dt * 1.3);
    camera.position.y += (-mouse.y * 5 - camera.position.y) * Math.min(1, dt * 1.3);
    camera.position.z = camZ;
    camera.lookAt(camera.position.x * 0.3, camera.position.y * 0.3, camZ - 90);

    // 星点闪烁 / 星云漂移（云气随揭示浮现）
    starMat.uniforms.uTime.value = t;
    starMat.uniforms.uReveal.value = reveal;
    stars.rotation.z = t * 0.0018;
    for (const n of nebulae) {
      n.sprite.position.x = n.base.x + Math.sin(t * n.speed + n.phase) * n.amp;
      n.sprite.position.y = n.base.y + Math.cos(t * n.speed * 0.8 + n.phase) * n.amp * 0.6;
      n.sprite.material.opacity = n.baseOpacity * reveal;
    }

    // 自然流星（入场完成后才偶尔出现）
    if (t > nextMeteor && reveal > 0.85 && meteors.length < 3) {
      spawnMeteor();
      nextMeteor = t + 7 + Math.random() * 8;
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life += dt;
      m.sprite.position.x += m.vx * dt;
      m.sprite.position.y += m.vy * dt;
      const k = m.life / m.max;
      m.sprite.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * (m.bright ? 0.8 : 0.55);
      m.sprite.material.rotation = Math.atan2(m.vy, m.vx);
      if (m.life >= m.max) {
        scene.remove(m.sprite);
        m.sprite.material.map = null;
        m.sprite.material.dispose();
        meteors.splice(i, 1);
      }
    }

    composer.render();
  };

  const frame = () => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    stepAndRender(Math.min(0.05, Math.max(0, clock.getDelta())));
  };

  // 同步驱动钩子：无 rAF 环境（离屏节流/自检）下推进与验证渲染管线
  (window as unknown as { __universe3D?: unknown }).__universe3D = {
    step: (dt: number) => stepAndRender(Math.max(0, Math.min(0.1, dt || 0.016))),
    spawnMeteor: (bright?: boolean) => spawnMeteor(!!bright),
    camZ: () => camZ,
  };

  // 页面隐藏暂停渲染，可见时恢复
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      clock.getDelta(); // 丢弃挂起时长，避免回来跳帧
      raf = requestAnimationFrame(frame);
    }
  });

  raf = requestAnimationFrame(frame);
  // 画布层随揭示淡入（CSS 过渡兜底，与着色器 reveal 叠加更柔和）
  canvas.classList.add('is-on');
  return true;
}
