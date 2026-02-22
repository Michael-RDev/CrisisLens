"use client";

import { useEffect, useRef, useState } from "react";

type ParallaxOffset = {
  x: number;
  y: number;
};

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPrefersReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}

export function useParallax(intensity = 16) {
  const ref = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    function updateFromPointer(clientX: number, clientY: number) {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const nx = ((clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      const ny = ((clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      setOffset({
        x: Math.max(-1, Math.min(1, nx)) * intensity,
        y: Math.max(-1, Math.min(1, ny)) * intensity
      });
    }

    function onMove(event: PointerEvent) {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        updateFromPointer(event.clientX, event.clientY);
      });
    }

    function onLeave() {
      setOffset({ x: 0, y: 0 });
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [intensity, prefersReducedMotion]);

  return { ref, offset, prefersReducedMotion };
}
