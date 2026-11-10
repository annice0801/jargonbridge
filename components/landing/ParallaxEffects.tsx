"use client";

import { useEffect } from "react";

// 用法：
// data-parallax="0.2"             依元素與視窗中心的距離位移，正值較慢（像在遠處），負值較快
// data-parallax-anchor="top"      改以頁面頂端為基準，首屏構圖才會和設計完全一致
// data-reveal                     進入畫面時淡入
export function ParallaxEffects() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    root.classList.add("motion-ready");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]")).map((el) => ({
      el,
      speed: Number(el.dataset.parallax) || 0,
      fromTop: el.dataset.parallaxAnchor === "top",
      center: 0,
    }));

    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const middle = window.scrollY + viewport / 2;
      // 小螢幕位移太大會像畫面在滑動，依寬度縮小幅度。
      const width = window.innerWidth;
      const scale = width < 640 ? 0.45 : width < 1024 ? 0.7 : 1;
      for (const item of items) {
        if (Math.abs(middle - item.center) > viewport * 2 && !item.fromTop) continue;
        const distance = item.fromTop ? window.scrollY : middle - item.center;
        item.el.style.transform = `translate3d(0, ${(distance * item.speed * scale).toFixed(1)}px, 0)`;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // 量測時先拿掉位移，基準點才不會被目前的視差影響。
    const measure = () => {
      for (const item of items) {
        item.el.style.transform = "";
        const rect = item.el.getBoundingClientRect();
        item.center = rect.top + window.scrollY + rect.height / 2;
      }
      update();
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      revealObserver.disconnect();
      root.classList.remove("motion-ready");
      for (const item of items) item.el.style.transform = "";
    };
  }, []);

  return null;
}
