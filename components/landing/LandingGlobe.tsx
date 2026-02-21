"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type Hotspot = {
  lat: number;
  lng: number;
  size: number;
  label: string;
};

const hotspots: Hotspot[] = [
  { lat: 15.3694, lng: 44.191, size: 0.42, label: "YEM signal" },
  { lat: 9.145, lng: 40.4897, size: 0.34, label: "ETH signal" },
  { lat: 6.877, lng: 31.307, size: 0.38, label: "SSD signal" },
  { lat: 33.9391, lng: 67.71, size: 0.33, label: "AFG signal" },
  { lat: 34.8021, lng: 38.9968, size: 0.29, label: "SYR signal" }
];

export function LandingGlobe() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 960, height: 380 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
    }

    globeRef.current?.pointOfView({ lat: 14, lng: 18, altitude: 2.1 });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const resize = () => {
      setSize({
        width: Math.max(320, Math.round(el.clientWidth)),
        height: Math.max(280, Math.round(el.clientHeight))
      });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rings = useMemo(
    () =>
      hotspots.map((spot) => ({
        ...spot,
        maxR: 6 + spot.size * 7,
        propagationSpeed: 0.7 + spot.size * 0.4,
        repeatPeriod: 1400
      })),
    []
  );

  return (
    <section className="rounded-2xl border border-[#2e4f63] bg-[#10202d] p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="m-0 text-2xl font-semibold">Live Global Pulse</h2>
          <p className="mt-1 text-sm text-[#9db7c8]">
            Decorative operations globe for quick situational context on landing.
          </p>
        </div>
        <span className="rounded-full border border-[#3c5f77] bg-[rgba(10,26,39,0.8)] px-3 py-1 text-xs text-[#c9dbea]">
          Mock Signals
        </span>
      </div>

      <div ref={containerRef} className="h-[320px] w-full overflow-hidden rounded-xl border border-[#2b4e66] bg-[#08131d]">
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          pointsData={hotspots}
          pointColor={() => "#f2a73d"}
          pointAltitude={(d) => (d as Hotspot).size}
          pointRadius={0.35}
          pointResolution={12}
          ringsData={rings}
          ringColor={() => "#ffb86f"}
          ringMaxRadius={(d) => (d as { maxR: number }).maxR}
          ringPropagationSpeed={(d) => (d as { propagationSpeed: number }).propagationSpeed}
          ringRepeatPeriod={(d) => (d as { repeatPeriod: number }).repeatPeriod}
          enablePointerInteraction={false}
        />
      </div>
    </section>
  );
}
