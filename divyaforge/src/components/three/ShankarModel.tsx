"use client";

import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { DesignConfig } from "@/lib/schema/config";
import { getPart } from "@/lib/catalog";
import { getPose } from "./poses";
import { EquippedPart } from "./EquippedPart";

/**
 * Placeholder parametric Shankar (Shiva). Same rig conventions as the other
 * placeholder bodies; distinctives: grey-blue skin default, jata (matted
 * hair) crown with the chandra crescent, and a third eye. Padmasana form
 * reuses the crossed-leg seated rig.
 */

interface ShankarModelProps {
  config: DesignConfig;
  colorPick?: boolean;
  onZoneClick?: (zoneKey: string) => void;
}

type BodyZone = "skin" | "eyes" | "jata" | "chandra";

export function ShankarModel({ config, colorPick = false, onZoneClick }: ShankarModelProps) {
  const { face, body, form } = config;
  const pose = getPose(config.pose);

  const materials = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
      eyes: new THREE.MeshStandardMaterial({ roughness: 0.35 }),
      jata: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      chandra: new THREE.MeshStandardMaterial({ roughness: 0.3 }),
    }),
    [],
  );
  useEffect(() => {
    for (const zone of Object.keys(materials) as BodyZone[]) {
      const hex = config.colors[`body:${zone}`];
      if (hex) materials[zone].color.set(hex);
    }
  }, [config.colors, materials]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  const pick = (zone: BodyZone) =>
    colorPick && onZoneClick
      ? (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onZoneClick(`body:${zone}`);
        }
      : undefined;

  const scale = 0.9 + 0.3 * body.height;
  const bs = 0.85 + 0.35 * body.weight;
  const limb = 0.88 + 0.35 * body.weight;
  const earScale = 0.7 + 0.5 * face.earSize;
  const eyeOpen = 0.3 + 0.7 * face.eyeOpen;
  const browTilt = (face.browTilt - 0.5) * 0.7;

  const seated = form !== "standing"; // padmasana default
  const hipY = seated ? 0.64 : 1.02;
  const chestY = hipY + 0.6;
  const shoulderY = hipY + 0.76;
  const headY = hipY + 1.08;

  const vastraLowerId = config.parts.vastraLower ?? null;
  const vastraUpperId = config.parts.vastraUpper ?? null;
  const partColors = config.colors;
  const partZoneClick = colorPick ? onZoneClick : undefined;

  const arm = (side: "R" | "L", pair: 1 | 2) => {
    const slotId = `hand${side}${pair}`;
    if (pair === 2 && body.armCount !== 4) return null;
    const sideSign = side === "R" ? -1 : 1;
    const armPose = pose[`arm${side}${pair}` as const];
    const shoulderPos: [number, number, number] =
      pair === 1
        ? [sideSign * 0.29, shoulderY, 0.04]
        : [sideSign * 0.25, shoulderY - 0.07, -0.13];
    const itemId = config.parts[slotId] ?? null;
    const itemPart = itemId ? getPart(itemId) : null;
    return (
      <group key={slotId} position={shoulderPos} rotation={armPose.shoulder}>
        <mesh position={[0, -0.17, 0]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
          <cylinderGeometry args={[0.053 * limb, 0.06 * limb, 0.34, 12]} />
        </mesh>
        <group position={[0, -0.34, 0]} rotation={armPose.elbow}>
          <mesh position={[0, -0.14, 0]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
            <cylinderGeometry args={[0.044 * limb, 0.053 * limb, 0.3, 12]} />
          </mesh>
          <group position={[0, -0.33, 0.01]}>
            <mesh material={materials.skin} onPointerDown={pick("skin")} castShadow>
              <sphereGeometry args={[0.07 * limb, 12, 10]} />
            </mesh>
            {itemPart && (
              <Suspense fallback={null}>
                <group position={[0, 0.01, 0.03]}>
                  <EquippedPart part={itemPart} colors={partColors} onZoneClick={partZoneClick} />
                </group>
              </Suspense>
            )}
          </group>
        </group>
      </group>
    );
  };

  const legs = seated ? (
    <group>
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh
            position={[s * 0.2, hipY - 0.28, 0.12]}
            rotation={[1.25, 0, -s * 0.55]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <cylinderGeometry args={[0.082 * limb, 0.098 * limb, 0.42, 12]} />
          </mesh>
          <mesh
            position={[s * 0.1, hipY - 0.45, 0.3]}
            rotation={[1.5, 0, s * 1.15]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <cylinderGeometry args={[0.058 * limb, 0.072 * limb, 0.4, 12]} />
          </mesh>
          <mesh
            position={[s * 0.29, hipY - 0.5, 0.34]}
            scale={[1, 0.5, 1.6]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <sphereGeometry args={[0.072, 10, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  ) : (
    <group>
      {([-1, 1] as const).map((s) => {
        const lift = s === 1 ? pose.legLiftL : 0;
        return (
          <group key={s} position={[s * 0.14, hipY, 0]} rotation={[-lift, 0, 0]}>
            <mesh position={[0, -(hipY - 0.05) / 2, 0]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
              <cylinderGeometry args={[0.08 * limb, 0.095 * limb, hipY - 0.05, 14]} />
            </mesh>
            <mesh position={[0.01 * s, -(hipY - 0.05), 0.07]} scale={[1, 0.5, 1.8]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
              <sphereGeometry args={[0.085, 12, 10]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );

  return (
    <group scale={scale} rotation={[0, 0, pose.rootTilt]}>
      {legs}

      <mesh
        position={[0, hipY + 0.28, 0.01]}
        scale={[1.1 * bs, 1.15, 0.92 * bs]}
        material={materials.skin}
        onPointerDown={pick("skin")}
        castShadow
      >
        <sphereGeometry args={[0.27, 22, 18]} />
      </mesh>
      <mesh
        position={[0, chestY, 0]}
        scale={[1.18, 1.0, 0.95]}
        material={materials.skin}
        onPointerDown={pick("skin")}
        castShadow
      >
        <sphereGeometry args={[0.24 * (0.9 + 0.25 * body.weight), 20, 16]} />
      </mesh>
      <mesh position={[0, shoulderY + 0.1, 0]} material={materials.skin} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 0.18, 12]} />
      </mesh>

      {vastraLowerId && getPart(vastraLowerId) && (
        <Suspense fallback={null}>
          <group
            position={[0, hipY + 0.12, 0]}
            scale={seated ? [0.98 * bs, 0.55, 0.98 * bs] : [0.9 * bs, 1, 0.9 * bs]}
          >
            <EquippedPart part={getPart(vastraLowerId)!} colors={partColors} onZoneClick={partZoneClick} />
          </group>
        </Suspense>
      )}
      {vastraUpperId && getPart(vastraUpperId) && (
        <Suspense fallback={null}>
          <group position={[0, chestY + 0.02, 0]} scale={[0.92 * bs, 1, 0.92 * bs]}>
            <EquippedPart part={getPart(vastraUpperId)!} colors={partColors} onZoneClick={partZoneClick} />
          </group>
        </Suspense>
      )}

      {arm("R", 1)}
      {arm("L", 1)}
      {arm("R", 2)}
      {arm("L", 2)}

      {/* head */}
      <group position={[0, headY, 0]} rotation={[0, 0, pose.headTilt]}>
        <mesh material={materials.skin} onPointerDown={pick("skin")} castShadow>
          <sphereGeometry args={[0.21, 24, 20]} />
        </mesh>

        {([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[s * 0.2, -0.01, 0]}
            scale={[0.35 * earScale, earScale * 0.6, 0.5 * earScale]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <sphereGeometry args={[0.09, 10, 8]} />
          </mesh>
        ))}

        {([-1, 1] as const).map((s) => (
          <group key={s}>
            <mesh
              position={[s * 0.075, 0.035, 0.175]}
              scale={[1, eyeOpen, 0.6]}
              material={materials.eyes}
              onPointerDown={pick("eyes")}
            >
              <sphereGeometry args={[0.026, 10, 8]} />
            </mesh>
            <mesh
              position={[s * 0.08, 0.09, 0.185]}
              rotation={[0, 0, -s * browTilt]}
              material={materials.eyes}
              onPointerDown={pick("eyes")}
            >
              <boxGeometry args={[0.08, 0.013, 0.02]} />
            </mesh>
          </group>
        ))}

        {/* third eye — vertical, on the forehead */}
        <mesh position={[0, 0.1, 0.195]} scale={[0.45, 1, 0.6]} material={materials.eyes} onPointerDown={pick("eyes")}>
          <sphereGeometry args={[0.026, 10, 8]} />
        </mesh>

        <mesh position={[0, -0.02, 0.2]} rotation={[0.5, 0, 0]} material={materials.skin}>
          <coneGeometry args={[0.02, 0.06, 8]} />
        </mesh>
        <mesh
          position={[0, -0.08, 0.175]}
          rotation={[0.3, 0, Math.PI + (Math.PI * (0.25 + 0.4 * face.smile)) / 2]}
          material={materials.eyes}
        >
          <torusGeometry args={[0.055, 0.007, 8, 24, Math.PI * (0.25 + 0.4 * face.smile)]} />
        </mesh>

        {/* jata (matted-hair crown) with the chandra crescent */}
        <group position={[0, 0.19, -0.01]} rotation={[-0.05, 0, 0]}>
          <mesh material={materials.jata} onPointerDown={pick("jata")} castShadow>
            <coneGeometry args={[0.15, 0.3, 14]} />
          </mesh>
          <mesh position={[0, 0.16, 0]} material={materials.jata} onPointerDown={pick("jata")}>
            <sphereGeometry args={[0.05, 10, 8]} />
          </mesh>
          <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.jata} onPointerDown={pick("jata")}>
            <torusGeometry args={[0.155, 0.03, 8, 20]} />
          </mesh>
          <mesh
            position={[0.11, 0.08, 0.06]}
            rotation={[0.2, 0.5, -0.6]}
            material={materials.chandra}
            onPointerDown={pick("chandra")}
          >
            <torusGeometry args={[0.05, 0.013, 8, 20, Math.PI * 1.1]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
