"use client";

import { useEffect, useRef } from "react";

// 經典 Perlin noise（x、y、時間），用來做看不見的風場和陣風。
function createNoise(seed: number) {
  const perm = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, index) => index);
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number, z: number) => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  // 回傳 0 到 1，跟 p5.js 的 noise() 用法一樣。
  return function noise(x: number, y: number, z: number) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;
    const value = lerp(
      lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(
        lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
        v,
      ),
      w,
    );
    return (value + 1) / 2;
  };
}

const LEVELS = 15;

// 15 種明亮度：從純白到淡灰。白的在和紙上像光點，灰的像帶陰影的雪，混在一起才看得出是雪。
function makeSprites() {
  return Array.from({ length: LEVELS }, (_, index) => {
    const t = index / (LEVELS - 1);
    const r = Math.round(255 - (255 - 176) * t);
    const g = Math.round(255 - (255 - 170) * t);
    const b = Math.round(255 - (255 - 162) * t);
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const ctx = sprite.getContext("2d")!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, `rgb(${r} ${g} ${b} / 1)`);
    gradient.addColorStop(0.45, `rgb(${r} ${g} ${b} / 0.75)`);
    gradient.addColorStop(1, `rgb(${r} ${g} ${b} / 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return sprite;
  });
}

// depth 越大越近：越大顆、越亮、落得越快、被風吹得越遠。
type Flake = { x: number; y: number; depth: number; size: number; level: number; phase: number };

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const noise = createNoise(20261109);
    const sprites = makeSprites();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];
    let frame = 0;
    let last = 0;

    const makeFlake = (anywhere: boolean): Flake => {
      const depth = Math.pow(Math.random(), 1.6);
      return {
        x: Math.random() * (width + 200) - 100,
        y: anywhere ? Math.random() * height : -10 - Math.random() * 40,
        depth,
        size: 1.2 + depth * 4.2,
        level: Math.floor(Math.random() * LEVELS),
        phase: Math.random() * Math.PI * 2,
      };
    };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(1600, Math.max(320, (width * height) / 900)));
      flakes = Array.from({ length: count }, () => makeFlake(true));
    }

    function draw(time: number, dt: number) {
      ctx!.clearRect(0, 0, width, height);
      const t = time * 0.00008;
      // 整體的風：大部分時間是往右下的微風，偶爾一陣陣變強或轉弱。
      const gust = 0.25 + noise(t * 2, 3.7, 0) * 0.9;

      for (const flake of flakes) {
        // 看不見的流場讓每片雪局部打轉、飄盪，不會整齊劃一地落下。
        const angle = noise(flake.x * 0.0022, flake.y * 0.0022, t) * Math.PI * 4;
        const drift = 0.3 + flake.depth * 0.9;
        flake.phase += 0.012 * dt;
        flake.x += (gust * drift + Math.cos(angle) * 0.35 + Math.sin(flake.phase) * 0.18) * dt;
        flake.y += (0.22 + flake.depth * 0.75 + Math.sin(angle) * 0.18) * dt;

        if (flake.y > height + 12 || flake.x > width + 110 || flake.x < -110) {
          Object.assign(flake, makeFlake(false));
          if (flake.x > width) flake.x -= width + 100;
        }

        ctx!.globalAlpha = 0.28 + flake.depth * 0.55;
        const size = flake.size * 2;
        ctx!.drawImage(sprites[flake.level], flake.x - size / 2, flake.y - size / 2, size, size);
      }
      ctx!.globalAlpha = 1;
    }

    resize();

    if (reduceMotion) {
      draw(0, 0);
      return;
    }

    function loop(time: number) {
      // 以 60fps 為基準換算，螢幕更新率不同時速度也一致。
      const dt = last ? Math.min(3, (time - last) / 16.7) : 1;
      last = time;
      draw(time, dt);
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      // 手機捲動時網址列伸縮也會觸發 resize，只有尺寸明顯改變才重設。
      resizeTimer = window.setTimeout(() => {
        if (window.innerWidth !== width || Math.abs(window.innerHeight - height) > 160) resize();
      }, 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 size-full" />;
}
