"use client";

import { useEffect, useRef, useState } from "react";

type BlackHoleBackgroundProps = {
  className?: string;
};

type Star = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  driftX: number;
  driftY: number;
  phase: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createStars(width: number, height: number): Star[] {
  const area = width * height;
  const count = clamp(Math.floor(area / 7000), 150, 350);
  const random = mulberry32(Math.floor(width * 13 + height * 17 + count * 23));
  const stars: Star[] = [];

  for (let index = 0; index < count; index += 1) {
    stars.push({
      x: random() * width,
      y: random() * height,
      size: 0.45 + random() * 1.35,
      alpha: 0.16 + random() * 0.36,
      driftX: (random() - 0.5) * 0.018,
      driftY: (random() - 0.5) * 0.014,
      phase: random() * Math.PI * 2
    });
  }

  return stars;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPrefersReducedMotion(media.matches);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

export function BlackHoleBackground({ className }: BlackHoleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dimensions = { width: 0, height: 0 };

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);

      dimensions.width = width;
      dimensions.height = height;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      starsRef.current = createStars(width, height);
    };

    const draw = (timeMs: number) => {
      const { width, height } = dimensions;
      if (!width || !height) return;

      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.64;
      const horizonY = cy;
      const horizonRadius = clamp(Math.min(width, height) * 0.1, 60, 130);
      const t = timeMs * 0.001;

      // Starfield with mild gravitational lensing warp.
      for (const star of starsRef.current) {
        const baseX = (star.x + t * 22 * star.driftX + width * 2) % width;
        const baseY = (star.y + t * 22 * star.driftY + height * 2) % height;

        const dx = baseX - cx;
        const dy = baseY - cy;
        const d2 = dx * dx + dy * dy;
        const dist = Math.sqrt(d2) + 0.0001;

        // Small tangential warp near center to imply gravitational lensing.
        const deflection = 2800 / (d2 + 42000);
        const tx = -dy / dist;
        const ty = dx / dist;

        const warpedX = baseX + tx * deflection * 8;
        const warpedY = baseY + ty * deflection * 8;

        const twinkle = 0.9 + 0.1 * Math.sin(t * 0.45 + star.phase);
        ctx.globalAlpha = star.alpha * twinkle;
        ctx.fillStyle = "#d9e8f4";
        ctx.beginPath();
        ctx.arc(warpedX, warpedY, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Soft lensing glow.
      const glow = ctx.createRadialGradient(cx, cy, horizonRadius * 0.85, cx, cy, horizonRadius * 1.55);
      glow.addColorStop(0, "rgba(74, 138, 173, 0.00)");
      glow.addColorStop(0.52, "rgba(94, 180, 226, 0.34)");
      glow.addColorStop(0.78, "rgba(72, 142, 186, 0.16)");
      glow.addColorStop(1, "rgba(22, 44, 62, 0.00)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, horizonRadius * 1.65, 0, Math.PI * 2);
      ctx.fill();

      const outerGlow = ctx.createRadialGradient(cx, cy, horizonRadius * 1.45, cx, cy, horizonRadius * 2.9);
      outerGlow.addColorStop(0, "rgba(89, 153, 191, 0.10)");
      outerGlow.addColorStop(1, "rgba(9, 18, 29, 0)");
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, horizonRadius * 3.05, 0, Math.PI * 2);
      ctx.fill();

      // Accretion disk: thin, rotating, subtle turbulence.
      const rotation = t * 0.34; // ~18.5s per revolution
      const diskRx = horizonRadius * 4.6;
      const diskRy = horizonRadius * 0.42;
      const segments = 120;

      ctx.save();
      ctx.translate(cx, horizonY);
      ctx.rotate(rotation);

      for (let index = 0; index < segments; index += 1) {
        const a0 = (index / segments) * Math.PI * 2;
        const a1 = ((index + 1) / segments) * Math.PI * 2;
        const centerAngle = (a0 + a1) * 0.5;

        const x0 = Math.cos(a0) * diskRx;
        const y0 = Math.sin(a0) * diskRy;
        const x1 = Math.cos(a1) * diskRx;
        const y1 = Math.sin(a1) * diskRy;

        const turbulence =
          0.58 +
          0.26 * Math.sin(centerAngle * 3.7 + t * 0.9) +
          0.16 * Math.sin(centerAngle * 8.2 - t * 0.6);

        const doppler = 0.68 + 0.32 * (Math.cos(centerAngle) * 0.5 + 0.5);
        const alpha = clamp(0.05 + turbulence * doppler * 0.2, 0.05, 0.28);

        ctx.strokeStyle = `rgba(125, 191, 226, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 0.7 + turbulence * 1.15;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.restore();

      // Horizon beam, calm and broad (not a neon streak).
      const beam = ctx.createLinearGradient(0, 0, width, 0);
      beam.addColorStop(0, "rgba(129, 196, 236, 0)");
      beam.addColorStop(0.22, "rgba(132, 203, 246, 0.30)");
      beam.addColorStop(0.5, "rgba(173, 226, 255, 0.62)");
      beam.addColorStop(0.78, "rgba(132, 203, 246, 0.30)");
      beam.addColorStop(1, "rgba(129, 196, 236, 0)");
      ctx.fillStyle = beam;
      ctx.fillRect(0, horizonY - 1.3, width, 2.6);

      const beamBloom = ctx.createLinearGradient(0, 0, width, 0);
      beamBloom.addColorStop(0, "rgba(119, 182, 220, 0)");
      beamBloom.addColorStop(0.5, "rgba(136, 208, 250, 0.26)");
      beamBloom.addColorStop(1, "rgba(119, 182, 220, 0)");
      ctx.fillStyle = beamBloom;
      ctx.fillRect(0, horizonY - 12, width, 24);

      // True black event horizon at center.
      ctx.fillStyle = "#02050a";
      ctx.beginPath();
      ctx.arc(cx, cy, horizonRadius * 0.92, 0, Math.PI * 2);
      ctx.fill();

      // Inner ring hint for lens boundary (very subtle).
      ctx.strokeStyle = "rgba(163, 220, 250, 0.28)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, horizonRadius * 0.98, 0, Math.PI * 2);
      ctx.stroke();

      // Edge vignette for readability.
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        Math.min(width, height) * 0.18,
        width * 0.5,
        height * 0.45,
        Math.max(width, height) * 0.78
      );
      vignette.addColorStop(0, "rgba(5, 14, 22, 0)");
      vignette.addColorStop(1, "rgba(3, 10, 18, 0.56)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };

    const renderFrame = (timeMs: number) => {
      draw(timeMs);
      if (!reducedMotion) {
        rafRef.current = requestAnimationFrame(renderFrame);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapper);

    if (reducedMotion) {
      draw(0);
    } else {
      rafRef.current = requestAnimationFrame(renderFrame);
    }

    return () => {
      resizeObserver.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [reducedMotion]);

  return (
    <div
      ref={wrapperRef}
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className ?? ""}`}
      aria-hidden
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
