"use client";

import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { DesignConfig } from "@/lib/schema/config";
import { getPart } from "@/lib/catalog";
import { getPose } from "./poses";
import { EquippedPart } from "./EquippedPart";

/**
 * Placeholder parametric humanoid with an elephant-head placeholder for
 * Ganesh (kickoff: primitives are explicitly allowed for the BODY — catalog
 * parts, by contrast, are always GLBs loaded from meshUrl). Sliders drive
 * group scales/rotations ("morphs"); poses drive joint-group rotations
 * ("bones"); hand groups are the sockets catalog parts attach to.
 */

interface GaneshModelProps {
  config: DesignConfig;
  /** Enable zone-click coloring (Color tab). */
  colorPick?: boolean;
  onZoneClick?: (zoneKey: string) => void;
}

type BodyZone = "skin" | "tusk" | "eyes" | "mukut";

export function GaneshModel({ config, colorPick = false, onZoneClick }: GaneshModelProps) {
  const { face, body, form } = config;
  const pose = getPose(config.pose);

  const materials = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ roughness: 0.75 }),
      tusk: new THREE.MeshStandardMaterial({ roughness: 0.5 }),
      eyes: new THREE.MeshStandardMaterial({ roughness: 0.35 }),
      mukut: new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.6 }),
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

  // -- derived morph factors ------------------------------------------------
  const scale = 0.86 + 0.28 * body.height; // overall height
  const bs = 0.9 + 0.5 * body.weight; // belly/torso fullness
  const limb = 0.85 + 0.4 * body.weight; // limb thickness
  const earScale = 0.75 + 0.55 * face.earSize;
  const eyeOpen = 0.3 + 0.7 * face.eyeOpen;
  const browTilt = (face.browTilt - 0.5) * 0.7;
  const curlDir = (face.trunkCurl - 0.5) * 2; // -1 (left) .. 1 (right)
  const tuskLen = 0.6 + 0.8 * face.tuskLength;

  const seated = form === "seated";
  const hipY = seated ? 0.64 : 1.0;
  const bellyY = hipY + 0.3;
  const chestY = hipY + 0.62;
  const shoulderY = hipY + 0.76;
  const headY = hipY + 1.06;

  const vastraLowerId = config.parts.vastraLower ?? null;
  const vastraUpperId = config.parts.vastraUpper ?? null;

  const partColors = config.colors;
  const partZoneClick = colorPick ? onZoneClick : undefined;

  // -- reusable sub-assemblies ----------------------------------------------

  const arm = (side: "R" | "L", pair: 1 | 2) => {
    const slotId = `hand${side}${pair}`;
    if (pair === 2 && body.armCount !== 4) return null;
    const sideSign = side === "R" ? -1 : 1; // R = viewer left (+x is deity's left)
    const armPose = pose[`arm${side}${pair}` as const];
    const shoulderPos: [number, number, number] =
      pair === 1
        ? [sideSign * 0.3, shoulderY, 0.04]
        : [sideSign * 0.26, shoulderY - 0.07, -0.14];
    const itemId = config.parts[slotId] ?? null;
    const itemPart = itemId ? getPart(itemId) : null;
    return (
      <group key={slotId} position={shoulderPos} rotation={armPose.shoulder}>
        {/* upper arm along -Y */}
        <mesh
          position={[0, -0.17, 0]}
          material={materials.skin}
          onPointerDown={pick("skin")}
          castShadow
        >
          <cylinderGeometry args={[0.055 * limb, 0.062 * limb, 0.34, 12]} />
        </mesh>
        <group position={[0, -0.34, 0]} rotation={armPose.elbow}>
          <mesh
            position={[0, -0.14, 0]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <cylinderGeometry args={[0.045 * limb, 0.055 * limb, 0.3, 12]} />
          </mesh>
          {/* palm socket — catalog parts attach here, +Y up out of the fist */}
          <group position={[0, -0.34, 0.01]}>
            <mesh material={materials.skin} onPointerDown={pick("skin")} castShadow>
              <sphereGeometry args={[0.075 * limb, 12, 10]} />
            </mesh>
            {itemPart && (
              <Suspense fallback={null}>
                <group position={[0, 0.01, 0.03]}>
                  <EquippedPart
                    part={itemPart}
                    colors={partColors}
                    onZoneClick={partZoneClick}
                  />
                </group>
              </Suspense>
            )}
          </group>
        </group>
      </group>
    );
  };

  const trunk = useMemo(() => {
    const segments = 5;
    let node: JSX.Element = (
      <mesh position={[0, -0.06, 0]} material={materials.skin} castShadow>
        <sphereGeometry args={[0.032, 10, 8]} />
      </mesh>
    );
    for (let i = segments - 1; i >= 0; i--) {
      const rTop = 0.058 - i * 0.006;
      const rBottom = 0.052 - i * 0.006;
      const rotX = i === 0 ? 0.3 : 0.1 - i * 0.02;
      const rotZ = curlDir * (0.12 + i * 0.16);
      node = (
        <group
          key={i}
          position={i === 0 ? [0, -0.03, 0.19] : [0, -0.13, 0.015]}
          rotation={[rotX, 0, rotZ]}
        >
          <mesh position={[0, -0.065, 0]} material={materials.skin} castShadow>
            <cylinderGeometry args={[rBottom, rTop, 0.14, 10]} />
          </mesh>
          {node}
        </group>
      );
    }
    return node;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curlDir, materials.skin]);

  const legs = seated ? (
    <group>
      {/* crossed-leg approximation (lalitasana placeholder) */}
      {([-1, 1] as const).map((s) => (
        <group key={s}>
          <mesh
            position={[s * 0.2, hipY - 0.28, 0.12]}
            rotation={[1.25, 0, -s * 0.55]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <cylinderGeometry args={[0.085 * limb, 0.1 * limb, 0.42, 12]} />
          </mesh>
          <mesh
            position={[s * 0.1, hipY - 0.45, 0.3]}
            rotation={[1.5, 0, s * 1.15]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <cylinderGeometry args={[0.06 * limb, 0.075 * limb, 0.4, 12]} />
          </mesh>
          <mesh
            position={[s * 0.3, hipY - 0.5, 0.34]}
            scale={[1, 0.5, 1.6]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <sphereGeometry args={[0.075, 10, 8]} />
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
            <mesh
              position={[0, -(hipY - 0.05) / 2, 0]}
              material={materials.skin}
              onPointerDown={pick("skin")}
              castShadow
            >
              <cylinderGeometry args={[0.085 * limb, 0.1 * limb, hipY - 0.05, 14]} />
            </mesh>
            <mesh
              position={[0.01 * s, -(hipY - 0.05), 0.07]}
              scale={[1, 0.5, 1.8]}
              material={materials.skin}
              onPointerDown={pick("skin")}
              castShadow
            >
              <sphereGeometry args={[0.09, 12, 10]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );

  return (
    <group scale={scale} rotation={[0, 0, pose.rootTilt]}>
      {legs}

      {/* belly + chest */}
      <mesh
        position={[0, bellyY, 0.02]}
        scale={[1.12 * bs, 1.0 * bs * 0.95, 1.0 * bs]}
        material={materials.skin}
        onPointerDown={pick("skin")}
        castShadow
      >
        <sphereGeometry args={[0.34, 24, 20]} />
      </mesh>
      <mesh
        position={[0, chestY, 0]}
        scale={[1.1, 0.95, 0.95]}
        material={materials.skin}
        onPointerDown={pick("skin")}
        castShadow
      >
        <sphereGeometry args={[0.24 * (0.9 + 0.3 * body.weight), 20, 16]} />
      </mesh>
      {/* neck */}
      <mesh position={[0, shoulderY + 0.1, 0]} material={materials.skin} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.18, 12]} />
      </mesh>

      {/* vastra (attire) — GLB parts on body sockets */}
      {vastraLowerId && getPart(vastraLowerId) && (
        <Suspense fallback={null}>
          <group
            position={[0, hipY + 0.14, 0]}
            scale={seated ? [1.08 * bs, 0.55, 1.08 * bs] : [bs, 1, bs]}
          >
            <EquippedPart
              part={getPart(vastraLowerId)!}
              colors={partColors}
              onZoneClick={partZoneClick}
            />
          </group>
        </Suspense>
      )}
      {vastraUpperId && getPart(vastraUpperId) && (
        <Suspense fallback={null}>
          <group position={[0, chestY + 0.02, 0]} scale={[bs, 1, bs]}>
            <EquippedPart
              part={getPart(vastraUpperId)!}
              colors={partColors}
              onZoneClick={partZoneClick}
            />
          </group>
        </Suspense>
      )}

      {/* arms */}
      {arm("R", 1)}
      {arm("L", 1)}
      {arm("R", 2)}
      {arm("L", 2)}

      {/* head */}
      <group position={[0, headY, 0]} rotation={[0, 0, pose.headTilt]}>
        <mesh material={materials.skin} onPointerDown={pick("skin")} castShadow>
          <sphereGeometry args={[0.24, 24, 20]} />
        </mesh>

        {/* ears */}
        {([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[s * 0.25, 0.03, -0.02]}
            rotation={[0, 0, s * -0.15]}
            scale={[0.28 * earScale, earScale, 0.6 * earScale]}
            material={materials.skin}
            onPointerDown={pick("skin")}
            castShadow
          >
            <sphereGeometry args={[0.2, 14, 12]} />
          </mesh>
        ))}

        {/* eyes (0 = meditative half-closed) + brows */}
        {([-1, 1] as const).map((s) => (
          <group key={s}>
            <mesh
              position={[s * 0.085, 0.055, 0.2]}
              scale={[1, eyeOpen, 0.6]}
              material={materials.eyes}
              onPointerDown={pick("eyes")}
            >
              <sphereGeometry args={[0.028, 10, 8]} />
            </mesh>
            <mesh
              position={[s * 0.09, 0.115, 0.205]}
              rotation={[0, 0, -s * browTilt]}
              material={materials.eyes}
              onPointerDown={pick("eyes")}
            >
              <boxGeometry args={[0.09, 0.014, 0.02]} />
            </mesh>
          </group>
        ))}

        {/* smile — arc peeking from behind the trunk */}
        <mesh
          position={[0, -0.1, 0.16]}
          rotation={[0.35, 0, Math.PI + (Math.PI * (0.25 + 0.4 * face.smile)) / 2]}
          material={materials.eyes}
        >
          <torusGeometry args={[0.1, 0.008, 8, 24, Math.PI * (0.25 + 0.4 * face.smile)]} />
        </mesh>

        {/* trunk */}
        {trunk}

        {/* tusks — the deity's right tusk is short (Ekadanta iconography) */}
        {([-1, 1] as const).map((s) => {
          const isDeityRight = s === -1; // deity's right = viewer's left (-x)
          const len = 0.24 * tuskLen * (isDeityRight ? 0.45 : 1);
          return (
            <mesh
              key={s}
              position={[s * 0.08, -0.12, 0.16]}
              rotation={[2.55, 0, s * -0.25]}
              material={materials.tusk}
              onPointerDown={pick("tusk")}
              castShadow
            >
              <coneGeometry args={[0.032, len, 10]} />
            </mesh>
          );
        })}

        {/* mukut (crown) */}
        <group position={[0, 0.22, 0]} rotation={[-0.08, 0, 0]}>
          <mesh material={materials.mukut} onPointerDown={pick("mukut")} castShadow>
            <coneGeometry args={[0.16, 0.3, 20]} />
          </mesh>
          <mesh position={[0, -0.13, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.mukut} onPointerDown={pick("mukut")}>
            <torusGeometry args={[0.165, 0.025, 10, 24]} />
          </mesh>
          <mesh position={[0, 0.17, 0]} material={materials.mukut} onPointerDown={pick("mukut")}>
            <sphereGeometry args={[0.035, 10, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
