"use client";

import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { DesignConfig } from "@/lib/schema/config";
import { getPart } from "@/lib/catalog";
import { getPose } from "./poses";
import { EquippedPart } from "./EquippedPart";

/**
 * Placeholder parametric Krishna. Same rig conventions as GaneshModel
 * (hand sockets, vastra sockets, pose joints) with a human head, a peacock
 * feather (mor pankh) on the mukut, and a tribhanga stance for the
 * Murlidhar form. Ganesh-only morphs (trunkCurl/tuskLength) are ignored —
 * the Face tab hides them via the deity's faceSliders list.
 */

interface KrishnaModelProps {
  config: DesignConfig;
  colorPick?: boolean;
  onZoneClick?: (zoneKey: string) => void;
}

type BodyZone = "skin" | "eyes" | "mukut" | "feather";

export function KrishnaModel({ config, colorPick = false, onZoneClick }: KrishnaModelProps) {
  const { face, body, form } = config;
  const pose = getPose(config.pose);

  const materials = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
      eyes: new THREE.MeshStandardMaterial({ roughness: 0.35 }),
      mukut: new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.6 }),
      feather: new THREE.MeshStandardMaterial({ roughness: 0.55 }),
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
  const bs = 0.8 + 0.35 * body.weight; // slimmer torso than Ganesh
  const limb = 0.85 + 0.35 * body.weight;
  const earScale = 0.7 + 0.5 * face.earSize;
  const eyeOpen = 0.3 + 0.7 * face.eyeOpen;
  const browTilt = (face.browTilt - 0.5) * 0.7;

  const seated = form === "seated";
  const tribhanga = !seated; // murlidhar standing = triple-bend stance
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
        ? [sideSign * 0.27, shoulderY, 0.04]
        : [sideSign * 0.23, shoulderY - 0.07, -0.13];
    const itemId = config.parts[slotId] ?? null;
    const itemPart = itemId ? getPart(itemId) : null;
    return (
      <group key={slotId} position={shoulderPos} rotation={armPose.shoulder}>
        <mesh position={[0, -0.17, 0]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
          <cylinderGeometry args={[0.05 * limb, 0.057 * limb, 0.34, 12]} />
        </mesh>
        <group position={[0, -0.34, 0]} rotation={armPose.elbow}>
          <mesh position={[0, -0.14, 0]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
            <cylinderGeometry args={[0.042 * limb, 0.05 * limb, 0.3, 12]} />
          </mesh>
          <group position={[0, -0.33, 0.01]}>
            <mesh material={materials.skin} onPointerDown={pick("skin")} castShadow>
              <sphereGeometry args={[0.068 * limb, 12, 10]} />
            </mesh>
            {itemPart && (
              <Suspense fallback={null}>
                <group position={[0, 0.01, 0.03]} rotation={itemId === "bansuri" ? [0, 0, Math.PI / 2.4] : [0, 0, 0]}>
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
            position={[s * 0.19, hipY - 0.28, 0.12]}
            rotation={[1.25, 0, -s * 0.55]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <cylinderGeometry args={[0.08 * limb, 0.095 * limb, 0.42, 12]} />
          </mesh>
          <mesh
            position={[s * 0.1, hipY - 0.45, 0.3]}
            rotation={[1.5, 0, s * 1.15]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <cylinderGeometry args={[0.055 * limb, 0.07 * limb, 0.4, 12]} />
          </mesh>
          <mesh
            position={[s * 0.29, hipY - 0.5, 0.34]}
            scale={[1, 0.5, 1.6]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <sphereGeometry args={[0.07, 10, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  ) : (
    <group>
      {/* tribhanga: weight on the right leg, left leg crossed at the ankle */}
      <group position={[-0.13, hipY, 0]}>
        <mesh position={[0, -(hipY - 0.05) / 2, 0]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
          <cylinderGeometry args={[0.075 * limb, 0.09 * limb, hipY - 0.05, 14]} />
        </mesh>
        <mesh position={[-0.01, -(hipY - 0.05), 0.07]} scale={[1, 0.5, 1.8]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
          <sphereGeometry args={[0.08, 12, 10]} />
        </mesh>
      </group>
      <group position={[0.12, hipY, 0]} rotation={[0.12, 0, tribhanga ? 0.35 : 0]}>
        <mesh position={[0, -(hipY - 0.12) / 2, 0]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
          <cylinderGeometry args={[0.075 * limb, 0.085 * limb, hipY - 0.12, 14]} />
        </mesh>
        {/* toe-down crossed foot */}
        <mesh position={[0.03, -(hipY - 0.1), 0.05]} rotation={[0.7, 0, 0]} scale={[1, 0.5, 1.7]} material={materials.skin} onPointerDown={pick("skin")} castShadow>
          <sphereGeometry args={[0.075, 12, 10]} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group scale={scale} rotation={[0, 0, pose.rootTilt + (tribhanga ? 0.06 : 0)]}>
      {legs}

      {/* torso — slimmer than Ganesh, slight tribhanga counter-bend */}
      <group rotation={[0, 0, tribhanga ? -0.08 : 0]}>
        <mesh
          position={[0, hipY + 0.28, 0.01]}
          scale={[1.05 * bs, 1.15, 0.9 * bs]}
          material={materials.skin}
          onPointerDown={pick("skin")}
          castShadow
        >
          <sphereGeometry args={[0.26, 22, 18]} />
        </mesh>
        <mesh
          position={[0, chestY, 0]}
          scale={[1.15, 1.0, 0.95]}
          material={materials.skin}
          onPointerDown={pick("skin")}
          castShadow
        >
          <sphereGeometry args={[0.23 * (0.9 + 0.25 * body.weight), 20, 16]} />
        </mesh>
        <mesh position={[0, shoulderY + 0.1, 0]} material={materials.skin} castShadow>
          <cylinderGeometry args={[0.09, 0.12, 0.18, 12]} />
        </mesh>

        {vastraLowerId && getPart(vastraLowerId) && (
          <Suspense fallback={null}>
            <group
              position={[0, hipY + 0.12, 0]}
              scale={seated ? [0.95 * bs, 0.55, 0.95 * bs] : [0.88 * bs, 1, 0.88 * bs]}
            >
              <EquippedPart part={getPart(vastraLowerId)!} colors={partColors} onZoneClick={partZoneClick} />
            </group>
          </Suspense>
        )}
        {vastraUpperId && getPart(vastraUpperId) && (
          <Suspense fallback={null}>
            <group position={[0, chestY + 0.02, 0]} scale={[0.9 * bs, 1, 0.9 * bs]}>
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

          {/* small human ears with kundal hint */}
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

          {/* eyes + brows */}
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

          {/* nose + smiling mouth */}
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

          {/* mukut with mor pankh */}
          <group position={[0, 0.2, 0]} rotation={[-0.06, 0, 0]}>
            <mesh material={materials.mukut} onPointerDown={pick("mukut")} castShadow>
              <coneGeometry args={[0.14, 0.24, 20]} />
            </mesh>
            <mesh position={[0, -0.11, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.mukut} onPointerDown={pick("mukut")}>
              <torusGeometry args={[0.15, 0.022, 10, 24]} />
            </mesh>
            {/* peacock feather: flattened ellipsoid + eye spot */}
            <group position={[0.07, 0.2, -0.01]} rotation={[0, 0, -0.45]}>
              <mesh scale={[0.55, 1, 0.2]} material={materials.feather} onPointerDown={pick("feather")} castShadow>
                <sphereGeometry args={[0.09, 12, 10]} />
              </mesh>
              <mesh position={[0, 0.02, 0.05]} material={materials.mukut} onPointerDown={pick("feather")}>
                <sphereGeometry args={[0.028, 8, 8]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
