"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { PartDef } from "@/lib/catalog/types";

interface EquippedPartProps {
  part: PartDef;
  colors: Record<string, string>;
  onZoneClick?: (zoneKey: string) => void;
  /** Called with the mesh bounding-box top (used by base parts). */
  onMeasured?: (topY: number) => void;
}

/**
 * The one and only part renderer. It knows nothing about specific parts:
 * it loads whatever GLB the catalog row points at (lazily, on equip),
 * recolors zone meshes by name, and reports clicks. Swapping placeholder
 * assets for artist GLBs therefore requires zero changes here.
 */
export function EquippedPart({ part, colors, onZoneClick, onMeasured }: EquippedPartProps) {
  const { scene } = useGLTF(part.meshUrl);

  // Clone per instance (the same part may sit in two hands) and give every
  // mesh its own material so zone recoloring never bleeds across instances.
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = (obj.material as THREE.Material).clone();
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  useEffect(() => {
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const hex = colors[`${part.id}:${obj.name}`];
        const material = obj.material as THREE.MeshStandardMaterial;
        if (hex && material.color) material.color.set(hex);
      }
    });
  }, [cloned, colors, part.id]);

  useEffect(() => {
    if (!onMeasured) return;
    const box = new THREE.Box3().setFromObject(cloned);
    onMeasured(box.max.y);
  }, [cloned, onMeasured]);

  const handleClick = onZoneClick
    ? (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const zone = e.object.name;
        if (zone) onZoneClick(`${part.id}:${zone}`);
      }
    : undefined;

  return <primitive object={cloned} onPointerDown={handleClick} />;
}
