"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from "geojson";
import {
  Color,
  Mesh,
  MeshPhongMaterial,
  Texture,
  SphereGeometry,
  TextureLoader
} from "three";
import countriesTopo from "world-atlas/countries-110m.json";
import { countryByIso3, iso3ByCcn3 } from "@/lib/countries";
import { CountryMetrics, LayerMode } from "@/lib/types";
import { getLayerValue } from "@/lib/metrics";

type Globe3DProps = {
  metrics: CountryMetrics[];
  layerMode: LayerMode;
  selectedIso3: string | null;
  highlightedIso3: string[];
  onSelect: (iso3: string) => void;
  onHover: (iso3: string | null) => void;
};

type CountryFeatureProps = {
  iso3: string;
  name: string;
};

type CountryFeature = Feature<Polygon | MultiPolygon, CountryFeatureProps>;
type OrbitControlsLike = {
  autoRotate: boolean;
  autoRotateSpeed: number;
  enableDamping: boolean;
  dampingFactor: number;
};
type GlobeRenderApi = {
  scene: () => { add: (obj: Mesh) => void; remove: (obj: Mesh) => void };
  controls: () => OrbitControlsLike;
};

const palette = {
  neutral: "#32516a",
  low: "#4f96d0",
  mid: "#f2a73d",
  high: "#f07a24",
  critical: "#eb5b17",
  selected: "#ffd397",
  highlight: "#ff9e3d"
};

function colorByValue(mode: LayerMode, value: number): string {
  if (mode === "coverage") {
    if (value >= 80) return "#4f96d0";
    if (value >= 60) return "#77b2df";
    if (value >= 40) return "#f2a73d";
    if (value > 0) return "#f07a24";
    return palette.neutral;
  }

  if (value >= 80) return palette.critical;
  if (value >= 60) return palette.high;
  if (value >= 40) return palette.mid;
  if (value > 0) return palette.low;
  return palette.neutral;
}

export default function Globe3D({
  metrics,
  layerMode,
  selectedIso3,
  highlightedIso3,
  onSelect,
  onHover
}: Globe3DProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const [globeReady, setGlobeReady] = useState(false);

  const countriesByIso = useMemo(() => {
    return countryByIso3;
  }, []);

  const earthMaterial = useMemo(() => {
    const material = new MeshPhongMaterial({
      shininess: 13,
      specular: new Color("#4f6b82"),
      emissive: new Color("#0a1218"),
      emissiveIntensity: 0.06
    });
    material.bumpScale = 5;
    return material;
  }, []);

  const metricByIso = useMemo(() => new Map(metrics.map((row) => [row.iso3, row])), [metrics]);

  const countriesGeoJson = useMemo(() => {
    const topo = countriesTopo as unknown as {
      objects: { countries: unknown };
    };
    const extracted = feature(topo as never, topo.objects.countries as never) as unknown;

    if (
      !extracted ||
      typeof extracted !== "object" ||
      !("features" in extracted) ||
      !Array.isArray((extracted as FeatureCollection).features)
    ) {
      return [] as CountryFeature[];
    }

    const mapped = (extracted as FeatureCollection<Polygon | MultiPolygon>).features
      .map((shape) => {
        const numericId = String(shape.id ?? "").padStart(3, "0");
        const iso3 = iso3ByCcn3.get(numericId);
        if (!iso3) return null;
        const lookup = countryByIso3.get(iso3);
        if (!lookup) return null;

        return {
          ...shape,
          properties: {
            iso3: lookup.iso3,
            name: lookup.name
          }
        } as CountryFeature;
      })
      .filter((item): item is CountryFeature => Boolean(item));

    return mapped;
  }, []);

  useEffect(() => {
    if (!selectedIso3) return;
    const country = countriesByIso.get(selectedIso3);
    if (!country?.latlng) return;

    const [lat, lng] = country.latlng;
    globeRef.current?.pointOfView(
      {
        lat,
        lng,
        altitude: 1.8
      },
      900
    );
  }, [countriesByIso, selectedIso3]);

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;

    const update = () => {
      setSize({
        width: Math.max(320, Math.round(element.clientWidth)),
        height: Math.max(320, Math.round(element.clientHeight))
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const textureLoader = new TextureLoader();
    let disposed = false;
    let waterTexture: Texture | undefined;

    textureLoader.load("//unpkg.com/three-globe/example/img/earth-water.png", (map) => {
      if (disposed) {
        map.dispose();
        return;
      }
      waterTexture = map;
      map.anisotropy = 8;
      earthMaterial.specularMap = map;
      earthMaterial.needsUpdate = true;
    });

    return () => {
      disposed = true;
      waterTexture?.dispose();
      earthMaterial.specularMap = null;
      earthMaterial.dispose();
    };
  }, [earthMaterial]);

  useEffect(() => {
    if (!globeReady) return;
    const globeApi = globeRef.current as unknown as GlobeRenderApi | undefined;
    if (!globeApi) return;

    const controls = globeApi.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const textureLoader = new TextureLoader();
    const cloudsTexture = textureLoader.load("//unpkg.com/three-globe/example/img/earth-clouds.png");
    const cloudsMaterial = new MeshPhongMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    const cloudsMesh = new Mesh(new SphereGeometry(100.6, 75, 75), cloudsMaterial);

    const scene = globeApi.scene();
    scene.add(cloudsMesh);

    let frameId = 0;
    const animateClouds = () => {
      cloudsMesh.rotation.y += 0.00055;
      frameId = requestAnimationFrame(animateClouds);
    };
    animateClouds();

    return () => {
      cancelAnimationFrame(frameId);
      scene.remove(cloudsMesh);
      cloudsMesh.geometry.dispose();
      cloudsMaterial.map?.dispose();
      cloudsMaterial.dispose();
    };
  }, [globeReady]);

  return (
    <div className="globe-canvas" ref={containerRef}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        globeMaterial={earthMaterial}
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="#9ecbff"
        atmosphereAltitude={0.17}
        onGlobeReady={() => setGlobeReady(true)}
        polygonsData={countriesGeoJson}
        polygonAltitude={(featureObj) => {
          const feature = featureObj as CountryFeature;
          const iso3 = feature.properties.iso3;
          if (selectedIso3 === iso3) return 0.03;
          if (highlightedIso3.includes(iso3)) return 0.022;
          return 0.008;
        }}
        polygonCapColor={(featureObj) => {
          const feature = featureObj as CountryFeature;
          const iso3 = feature.properties.iso3;
          const metric = metricByIso.get(iso3);
          const value = metric ? getLayerValue(metric, layerMode) : 0;
          if (selectedIso3 === iso3) return palette.selected;
          if (highlightedIso3.includes(iso3)) return palette.highlight;
          return colorByValue(layerMode, value);
        }}
        polygonSideColor={() => "rgba(14, 36, 52, 0.88)"}
        polygonStrokeColor={() => "#0d2436"}
        polygonsTransitionDuration={350}
        onPolygonClick={(featureObj) => {
          const feature = featureObj as CountryFeature;
          const iso3 = feature.properties.iso3;
          if (iso3) onSelect(iso3);
        }}
        onPolygonHover={(featureObj) => {
          if (!featureObj) {
            onHover(null);
            return;
          }
          const feature = featureObj as CountryFeature;
          const iso3 = feature.properties.iso3;
          onHover(iso3 ?? null);
        }}
      />
    </div>
  );
}
