"use client";

import { Suspense, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { DesignConfig } from "@/lib/schema/config";
import { getPart } from "@/lib/catalog";
import { useBuilderStore } from "@/store/builderStore";
import { GaneshModel } from "./GaneshModel";
import { EquippedPart } from "./EquippedPart";

/**
 * The 3D stage. Touch: one-finger rotate, two-finger pan/zoom (OrbitControls
 * defaults). Mouse: LMB rotate, wheel zoom, RMB pan. No external HDRs or
 * textures — everything renders from lights, so first load stays tiny.
 */

interface ModelRigProps {
  config: DesignConfig;
  colorPick?: boolean;
  onZoneClick?: (zoneKey: string) => void;
  baseTopY: number;
  onBaseMeasured?: (topY: number) => void;
}

/** Base part at the origin + figure standing on top of it. */
export function ModelRig({
  config, colorPick, onZoneClick, baseTopY, onBaseMeasured,
}: ModelRigProps) {
  const basePart = config.parts.base ? getPart(config.parts.base) : null;
  return (
    <group>
      {basePart && (
        <Suspense fallback={null}>
          <EquippedPart
            part={basePart}
            colors={config.colors}
            onZoneClick={colorPick ? onZoneClick : undefined}
            onMeasured={onBaseMeasured}
          />
        </Suspense>
      )}
      <group position={[0, basePart ? baseTopY : 0, 0]}>
        <GaneshModel config={config} colorPick={colorPick} onZoneClick={onZoneClick} />
      </group>
    </group>
  );
}

function Lights() {
  return (
    <>
      <hemisphereLight args={["#fff6e8", "#8c7455", 0.85]} />
      <directionalLight
        position={[3.5, 6, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-4, 3, -3]} intensity={0.5} color="#ffe0b8" />
    </>
  );
}

interface BuilderCanvasProps {
  config: DesignConfig;
  /** read-only share view disables zone clicking but keeps orbit controls */
  interactive?: boolean;
}

export default function BuilderCanvas({ config, interactive = true }: BuilderCanvasProps) {
  const activeTab = useBuilderStore((s) => s.activeTab);
  const baseTopY = useBuilderStore((s) => s.baseTopY);
  const setBaseTopY = useBuilderStore((s) => s.setBaseTopY);
  const setSelectedZone = useBuilderStore((s) => s.setSelectedZone);
  const setActiveTab = useBuilderStore((s) => s.setActiveTab);
  const setGlCanvas = useBuilderStore((s) => s.setGlCanvas);

  const colorPick = interactive && activeTab === "color";

  const onZoneClick = useCallback(
    (zoneKey: string) => {
      setSelectedZone(zoneKey);
      setActiveTab("color");
    },
    [setSelectedZone, setActiveTab],
  );

  // No base equipped -> figure back on the ground plane.
  const hasBase = Boolean(config.parts.base);
  useEffect(() => {
    if (!hasBase) setBaseTopY(0);
  }, [hasBase, setBaseTopY]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2.2, 2.1, 4.6], fov: 40 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => {
        if (interactive) setGlCanvas(gl.domElement);
      }}
      className="touch-none"
    >
      <color attach="background" args={["#F8F3EA"]} />
      <fog attach="fog" args={["#F8F3EA", 12, 22]} />
      <Lights />
      <Suspense fallback={null}>
        <ModelRig
          config={config}
          colorPick={colorPick}
          onZoneClick={onZoneClick}
          baseTopY={baseTopY}
          onBaseMeasured={setBaseTopY}
        />
      </Suspense>
      <ContactShadows position={[0, -0.005, 0]} opacity={0.35} scale={6} blur={2.2} far={3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#EFE6D6" />
      </mesh>
      <OrbitControls
        target={[0, 1.25, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.6}
        maxDistance={9}
        maxPolarAngle={Math.PI * 0.52}
        makeDefault
      />
    </Canvas>
  );
}
