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
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const canvas = document.createElement("canvas");
      const supportsContext = Boolean(
        window.WebGLRenderingContext &&
          (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
      setWebglSupported(supportsContext);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  useEffect(() => {
    if (!webglSupported) return;

    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
    }

    globeRef.current?.pointOfView({ lat: 14, lng: 18, altitude: 2.1 });
  }, [webglSupported]);

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
    <section className="landing-card" id="monitor">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="m-0 text-2xl font-semibold sm:text-3xl">Live Global Pulse</h2>
          <p className="landing-body mt-1">
            Country-level watchboard with rotating signal markers for rapid situational awareness.
          </p>
        </div>
        <span className="landing-chip">
          Mock Signals
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div
          ref={containerRef}
          className="h-[320px] w-full overflow-hidden rounded-xl border border-[#2b4e66] bg-[#08131d] sm:h-[360px]"
        >
          {webglSupported ? (
            <Globe
              ref={globeRef}
              width={size.width}
              height={size.height}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundColor="rgba(0,0,0,0)"
              pointsData={hotspots}
              pointColor={() => "#f0b25d"}
              pointAltitude={(d) => (d as Hotspot).size}
              pointRadius={0.35}
              pointResolution={12}
              ringsData={rings}
              ringColor={() => "#ffd194"}
              ringMaxRadius={(d) => (d as { maxR: number }).maxR}
              ringPropagationSpeed={(d) => (d as { propagationSpeed: number }).propagationSpeed}
              ringRepeatPeriod={(d) => (d as { repeatPeriod: number }).repeatPeriod}
              enablePointerInteraction={false}
            />
          ) : (
            <div className="grid h-full place-items-center p-5 text-center">
              <div>
                <p className="m-0 text-sm font-semibold text-[#eaf3f8]">3D map unavailable</p>
                <p className="mt-2 text-xs text-[#adc3d3]">
                  WebGL is not available in this runtime. Live signal summaries remain accessible.
                </p>
              </div>
            </div>
          )}
        </div>
        <aside className="landing-card-muted p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-[#b4c6d3]">
            Active monitors
          </h3>
          <ul className="m-0 mt-3 grid list-none gap-2 p-0">
            {hotspots.map((spot) => (
              <li key={spot.label} className="rounded-lg border border-[#2e4b61] bg-[#111f2c] p-3">
                <p className="m-0 text-sm font-semibold">{spot.label}</p>
                <p className="m-0 pt-1 text-xs text-[#9fb7c7]">
                  Lat {spot.lat.toFixed(2)} | Lng {spot.lng.toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
