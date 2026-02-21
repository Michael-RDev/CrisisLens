"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from "geojson";
import countriesTopo from "world-atlas/countries-110m.json";
import worldCountries from "world-countries";
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

type CountryLookup = {
  ccn3?: string;
  cca3: string;
  latlng?: [number, number];
  name?: { common?: string };
};

type CountryFeatureProps = {
  iso3: string;
  name: string;
};

type CountryFeature = Feature<Polygon | MultiPolygon, CountryFeatureProps>;

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

  const countriesByIso = useMemo(() => {
    const map = new Map<string, CountryLookup>();
    for (const country of worldCountries as CountryLookup[]) {
      map.set(country.cca3, country);
    }
    return map;
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
        const lookup = (worldCountries as CountryLookup[]).find((country) => country.ccn3 === numericId);
        if (!lookup?.cca3) return null;

        return {
          ...shape,
          properties: {
            iso3: lookup.cca3,
            name: lookup.name?.common ?? lookup.cca3
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

  return (
    <div className="globe-canvas" ref={containerRef}>
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
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
