"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { geoContains } from "d3-geo";
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
type GeoPov = { lat: number; lng: number; altitude: number };
type SmoothedHand = { x: number; y: number; pinch: number };
type HandCursorState = {
  x: number;
  y: number;
  active: boolean;
  iso3: string | null;
  country: string | null;
};

const HAND_TASKS_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const HAND_MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const HAND_POSITION_SMOOTHING = 0.28;
const PINCH_SMOOTHING = 0.35;
const ROTATE_DEADZONE = 0.004;
const PINCH_DEADZONE = 0.0025;
const PINCH_SELECT_THRESHOLD = 0.045;
const PINCH_RELEASE_THRESHOLD = 0.062;
const BASE_ROTATE_GAIN_X = 165;
const BASE_ROTATE_GAIN_Y = 115;
const BASE_ZOOM_GAIN = 6.2;

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeLng(value: number): number {
  if (value > 180) return value - 360;
  if (value < -180) return value + 360;
  return value;
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
  const handVideoRef = useRef<HTMLVideoElement | null>(null);
  const handModelRef = useRef<HandLandmarker | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const handLoopRef = useRef<number | null>(null);
  const prevWristRef = useRef<{ x: number; y: number } | null>(null);
  const prevPinchRef = useRef<number | null>(null);
  const smoothedHandRef = useRef<SmoothedHand | null>(null);
  const handPovRef = useRef<GeoPov | null>(null);
  const handStatusRef = useRef("Camera control is off.");
  const pinchSelectArmedRef = useRef(true);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const [globeReady, setGlobeReady] = useState(false);
  const [handControlEnabled, setHandControlEnabled] = useState(false);
  const [handStatus, setHandStatus] = useState("Camera control is off.");
  const [handSensitivity, setHandSensitivity] = useState(2.6);
  const [handCursor, setHandCursor] = useState<HandCursorState>({
    x: 0,
    y: 0,
    active: false,
    iso3: null,
    country: null
  });

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
    controlsRef.current = controls;
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
      controlsRef.current = null;
    };
  }, [globeReady]);

  const setHandStatusSafely = useCallback((status: string) => {
    if (handStatusRef.current === status) return;
    handStatusRef.current = status;
    setHandStatus(status);
  }, []);

  const countryAtScreenPoint = useCallback(
    (screenX: number, screenY: number): { iso3: string; country: string } | null => {
      const globePoint = globeRef.current?.toGlobeCoords(screenX, screenY);
      if (!globePoint) return null;

      for (const feature of countriesGeoJson) {
        if (geoContains(feature as never, [globePoint.lng, globePoint.lat])) {
          return {
            iso3: feature.properties.iso3,
            country: feature.properties.name
          };
        }
      }
      return null;
    },
    [countriesGeoJson]
  );

  const stopHandControl = useCallback(
    (status = "Camera control is off.") => {
      if (handLoopRef.current !== null) {
        cancelAnimationFrame(handLoopRef.current);
        handLoopRef.current = null;
      }

      const video = handVideoRef.current;
      if (video) {
        video.pause();
        video.srcObject = null;
        handVideoRef.current = null;
      }

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }

      prevWristRef.current = null;
      prevPinchRef.current = null;
      smoothedHandRef.current = null;
      handPovRef.current = null;
      pinchSelectArmedRef.current = true;
      if (controlsRef.current) controlsRef.current.autoRotate = true;

      setHandControlEnabled(false);
      setHandCursor({
        x: 0,
        y: 0,
        active: false,
        iso3: null,
        country: null
      });
      onHover(null);
      setHandStatusSafely(status);
    },
    [onHover, setHandStatusSafely]
  );

  const runHandLoop = useCallback(() => {
    const model = handModelRef.current;
    const video = handVideoRef.current;
    if (!model || !video || video.readyState < 2) {
      handLoopRef.current = requestAnimationFrame(runHandLoop);
      return;
    }

    const detection = model.detectForVideo(video, performance.now());
    const primaryHand = detection.landmarks?.[0];
    if (!primaryHand || !primaryHand[0] || !primaryHand[4] || !primaryHand[8]) {
      prevWristRef.current = null;
      prevPinchRef.current = null;
      pinchSelectArmedRef.current = true;
      setHandCursor((prev) =>
        prev.active ? { x: 0, y: 0, active: false, iso3: null, country: null } : prev
      );
      onHover(null);
      setHandStatusSafely("No hand detected. Hold one hand in frame.");
      handLoopRef.current = requestAnimationFrame(runHandLoop);
      return;
    }

    const wrist = primaryHand[0];
    const thumbTip = primaryHand[4];
    const indexTip = primaryHand[8];
    const middleMcp = primaryHand[9] ?? wrist;
    const rawCenter = {
      x: (wrist.x + indexTip.x + middleMcp.x) / 3,
      y: (wrist.y + indexTip.y + middleMcp.y) / 3
    };
    const rawPinchDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    const prevSmoothed = smoothedHandRef.current;
    const smoothed: SmoothedHand = prevSmoothed
      ? {
          x: prevSmoothed.x + (rawCenter.x - prevSmoothed.x) * HAND_POSITION_SMOOTHING,
          y: prevSmoothed.y + (rawCenter.y - prevSmoothed.y) * HAND_POSITION_SMOOTHING,
          pinch: prevSmoothed.pinch + (rawPinchDistance - prevSmoothed.pinch) * PINCH_SMOOTHING
        }
      : {
          x: rawCenter.x,
          y: rawCenter.y,
          pinch: rawPinchDistance
        };
    smoothedHandRef.current = smoothed;

    const currentPov = handPovRef.current ?? globeRef.current?.pointOfView();
    if (currentPov) {
      handPovRef.current = {
        lat: currentPov.lat,
        lng: currentPov.lng,
        altitude: currentPov.altitude
      };
    }
    if (!handPovRef.current) {
      handLoopRef.current = requestAnimationFrame(runHandLoop);
      return;
    }

    const prevWrist = prevWristRef.current;
    if (prevWrist) {
      const dx = smoothed.x - prevWrist.x;
      const dy = smoothed.y - prevWrist.y;
      const rotateDeadzone = ROTATE_DEADZONE / Math.max(handSensitivity * 0.85, 1);
      const moveX = Math.abs(dx) > rotateDeadzone ? dx : 0;
      const moveY = Math.abs(dy) > rotateDeadzone ? dy : 0;

      handPovRef.current.lng = normalizeLng(
        handPovRef.current.lng - moveX * BASE_ROTATE_GAIN_X * handSensitivity
      );
      handPovRef.current.lat = clamp(
        handPovRef.current.lat + moveY * BASE_ROTATE_GAIN_Y * handSensitivity,
        -80,
        80
      );
    }
    prevWristRef.current = { x: smoothed.x, y: smoothed.y };

    const cursorX = clamp((1 - smoothed.x) * size.width, 0, size.width);
    const cursorY = clamp(smoothed.y * size.height, 0, size.height);
    const hoveredCountry = countryAtScreenPoint(cursorX, cursorY);

    setHandCursor((prev) => {
      const nextIso3 = hoveredCountry?.iso3 ?? null;
      const nextCountry = hoveredCountry?.country ?? null;
      if (
        prev.active &&
        Math.abs(prev.x - cursorX) < 0.8 &&
        Math.abs(prev.y - cursorY) < 0.8 &&
        prev.iso3 === nextIso3
      ) {
        return prev;
      }
      return { x: cursorX, y: cursorY, active: true, iso3: nextIso3, country: nextCountry };
    });
    onHover(hoveredCountry?.iso3 ?? null);

    const prevPinch = prevPinchRef.current;
    const pinchDistance = smoothed.pinch;
    if (prevPinch !== null && pinchDistance > PINCH_RELEASE_THRESHOLD) {
      const pinchDelta = smoothed.pinch - prevPinch;
      const zoomDelta = Math.abs(pinchDelta) > PINCH_DEADZONE ? pinchDelta : 0;
      handPovRef.current.altitude = clamp(
        handPovRef.current.altitude + zoomDelta * BASE_ZOOM_GAIN * Math.max(1, handSensitivity * 0.85),
        1.05,
        3.7
      );
    }

    if (pinchDistance < PINCH_SELECT_THRESHOLD && pinchSelectArmedRef.current) {
      pinchSelectArmedRef.current = false;
      if (hoveredCountry?.iso3) {
        onSelect(hoveredCountry.iso3);
        setHandStatusSafely(`Selected ${hoveredCountry.country} (${hoveredCountry.iso3})`);
      }
    } else if (pinchDistance > PINCH_RELEASE_THRESHOLD) {
      pinchSelectArmedRef.current = true;
    }
    prevPinchRef.current = pinchDistance;

    globeRef.current?.pointOfView(handPovRef.current, 45);
    setHandStatusSafely(
      hoveredCountry?.iso3
        ? `Target: ${hoveredCountry.country} (${hoveredCountry.iso3}) | Pinch to select`
        : "Tracking hand: move to rotate. Pinch in/out to zoom. Pinch closed to select target."
    );
    handLoopRef.current = requestAnimationFrame(runHandLoop);
  }, [countryAtScreenPoint, handSensitivity, onHover, onSelect, setHandStatusSafely, size.height, size.width]);

  const getCameraPermissionState = useCallback(async (): Promise<PermissionState | "unknown"> => {
    if (!navigator.permissions?.query) return "unknown";
    try {
      const status = await navigator.permissions.query({
        name: "camera" as PermissionName
      });
      return status.state;
    } catch {
      return "unknown";
    }
  }, []);

  const startHandControl = useCallback(async () => {
    try {
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        stopHandControl("Camera requires HTTPS or localhost. Open the app on localhost or use HTTPS.");
        return;
      }
      const permissionState = await getCameraPermissionState();
      if (permissionState === "denied") {
        stopHandControl(
          "Camera blocked by browser/OS. On macOS: System Settings > Privacy & Security > Camera > enable Chrome, then reload."
        );
        return;
      }

      setHandStatusSafely("Requesting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      cameraStreamRef.current = stream;
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      handVideoRef.current = video;

      setHandStatusSafely("Loading hand-tracking model...");
      if (!handModelRef.current) {
        const vision = await FilesetResolver.forVisionTasks(HAND_TASKS_WASM_URL);
        handModelRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: HAND_MODEL_ASSET_URL },
          numHands: 1,
          minHandDetectionConfidence: 0.72,
          minTrackingConfidence: 0.7,
          minHandPresenceConfidence: 0.62,
          runningMode: "VIDEO"
        });
      }

      if (controlsRef.current) controlsRef.current.autoRotate = false;
      setHandControlEnabled(true);
      setHandStatusSafely("Tracking hand: move hand to rotate, pinch thumb+index to zoom.");
      handLoopRef.current = requestAnimationFrame(runHandLoop);
    } catch (error) {
      const reason =
        error instanceof DOMException
          ? error.name === "NotAllowedError"
            ? "Camera access blocked. Allow Chrome camera access in macOS and in site settings, then retry."
            : error.name === "NotFoundError"
              ? "No camera found. Connect a webcam and retry."
              : error.name === "NotReadableError"
                ? "Camera is busy in another app. Close Zoom/FaceTime/Teams and retry."
                : "Camera initialization failed. Retry after checking permissions."
          : "Camera initialization failed. Retry after checking permissions.";
      stopHandControl(reason);
    }
  }, [getCameraPermissionState, runHandLoop, setHandStatusSafely, stopHandControl]);

  function toggleHandControl() {
    if (handControlEnabled) {
      stopHandControl();
      return;
    }
    void startHandControl();
  }

  useEffect(() => {
    return () => stopHandControl();
  }, [stopHandControl]);

  return (
    <div className="globe-canvas" ref={containerRef}>
      <div className="globe-hands-overlay">
        <button type="button" onClick={toggleHandControl} className="globe-hands-toggle">
          {handControlEnabled ? "Stop Hand Control" : "Start Hand Control"}
        </button>
        <p>{handStatus}</p>
        <p>
          Controls: move hand to rotate globe, pinch in/out to zoom, pinch closed to select country
          under cursor.
        </p>
        <label className="globe-hands-sensitivity" htmlFor="hand-sensitivity">
          Sensitivity: {handSensitivity.toFixed(1)}x
        </label>
        <input
          id="hand-sensitivity"
          type="range"
          min={1.2}
          max={5}
          step={0.1}
          value={handSensitivity}
          onChange={(event) => setHandSensitivity(Number(event.target.value))}
        />
      </div>
      {handControlEnabled && handCursor.active ? (
        <div
          className="globe-hand-cursor"
          style={{ transform: `translate(${handCursor.x}px, ${handCursor.y}px)` }}
          aria-hidden
        >
          <span />
          {handCursor.iso3 ? (
            <small>
              {handCursor.country} ({handCursor.iso3})
            </small>
          ) : (
            <small>No country target</small>
          )}
        </div>
      ) : null}
      {handControlEnabled ? (
        <div className="globe-hand-hint" aria-hidden>
          <span>Hand Active</span>
          <span>Cursor tracks your hand</span>
        </div>
      ) : null}
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
