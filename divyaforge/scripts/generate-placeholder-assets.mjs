/**
 * Placeholder part-asset generator.
 *
 * Builds simple, respectful parametric geometry for every M0 catalog part and
 * writes real binary glTF (.glb) files to public/assets/parts/. Each color
 * zone is a separate named mesh node (name === zone id) so the runtime can
 * recolor zones generically. Replacing these with artist-made GLBs requires
 * only swapping files (same authoring conventions) — no code changes.
 *
 * Authoring conventions (document for artists):
 * - Units: scene units; the figure is ~2.2 units tall.
 * - hand items: origin at the grip point, item extends along local +Y.
 * - vastraLower: origin at the waistline, cloth hangs toward -Y.
 * - vastraUpper: origin at chest center.
 * - base: origin at bottom center; the figure is placed on the mesh's
 *   bounding-box top automatically (any base height works).
 * - One mesh per color zone, mesh name === catalog colorZones[].id.
 *
 * Usage: node scripts/generate-placeholder-assets.mjs
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PARTS = join(ROOT, "public/assets/parts");
const OUT_THUMBS = join(ROOT, "public/assets/thumbs");
mkdirSync(OUT_PARTS, { recursive: true });
mkdirSync(OUT_THUMBS, { recursive: true });

const catalog = JSON.parse(
  readFileSync(join(ROOT, "src/lib/catalog/data/catalog.json"), "utf8"),
);

/* ---------------------------------------------------------------- GLB writer */

function stripToPositionNormal(geometry) {
  const g = geometry.index ? geometry : geometry.toNonIndexed();
  for (const key of Object.keys(g.attributes)) {
    if (key !== "position" && key !== "normal") g.deleteAttribute(key);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/** nodes: [{ name, geometry, color, metallic?, roughness? }] -> GLB Buffer */
function buildGlb(nodes) {
  const json = {
    asset: { version: "2.0", generator: "divyaforge-placeholder-gen" },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes: [],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
  };
  const binParts = [];
  let byteOffset = 0;

  function addBufferView(typedArray) {
    const pad = (4 - (byteOffset % 4)) % 4;
    if (pad) {
      binParts.push(new Uint8Array(pad));
      byteOffset += pad;
    }
    const bytes = new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength,
    );
    binParts.push(bytes);
    json.bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.byteLength });
    byteOffset += bytes.byteLength;
    return json.bufferViews.length - 1;
  }

  nodes.forEach((spec, i) => {
    const g = stripToPositionNormal(spec.geometry);
    const pos = g.attributes.position;
    const nrm = g.attributes.normal;
    let index = g.index;
    if (!index) {
      const arr =
        pos.count > 65535
          ? new Uint32Array(pos.count)
          : new Uint16Array(pos.count);
      for (let k = 0; k < pos.count; k++) arr[k] = k;
      index = new THREE.BufferAttribute(arr, 1);
    }

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < pos.count; k++) {
      for (let c = 0; c < 3; c++) {
        const v = pos.array[k * 3 + c];
        if (v < min[c]) min[c] = v;
        if (v > max[c]) max[c] = v;
      }
    }

    const posAccessor = json.accessors.length;
    json.accessors.push({
      bufferView: addBufferView(new Float32Array(pos.array)),
      componentType: 5126,
      count: pos.count,
      type: "VEC3",
      min,
      max,
    });
    const nrmAccessor = json.accessors.length;
    json.accessors.push({
      bufferView: addBufferView(new Float32Array(nrm.array)),
      componentType: 5126,
      count: nrm.count,
      type: "VEC3",
    });
    const idxArray =
      index.array instanceof Uint32Array
        ? new Uint32Array(index.array)
        : new Uint16Array(index.array);
    const idxAccessor = json.accessors.length;
    json.accessors.push({
      bufferView: addBufferView(idxArray),
      componentType: idxArray instanceof Uint32Array ? 5125 : 5123,
      count: index.count,
      type: "SCALAR",
    });

    const color = new THREE.Color(spec.color).convertSRGBToLinear();
    json.materials.push({
      name: `${spec.name}-mat`,
      pbrMetallicRoughness: {
        baseColorFactor: [color.r, color.g, color.b, 1],
        metallicFactor: spec.metallic ?? 0.05,
        roughnessFactor: spec.roughness ?? 0.85,
      },
    });
    json.meshes.push({
      name: spec.name,
      primitives: [
        {
          attributes: { POSITION: posAccessor, NORMAL: nrmAccessor },
          indices: idxAccessor,
          material: i,
        },
      ],
    });
    json.nodes.push({ name: spec.name, mesh: i });
  });

  const binPad = (4 - (byteOffset % 4)) % 4;
  if (binPad) {
    binParts.push(new Uint8Array(binPad));
    byteOffset += binPad;
  }
  json.buffers.push({ byteLength: byteOffset });

  let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  if (jsonPad) {
    const padded = new Uint8Array(jsonBytes.length + jsonPad);
    padded.set(jsonBytes);
    padded.fill(0x20, jsonBytes.length); // pad JSON chunk with spaces
    jsonBytes = padded;
  }

  const total = 12 + 8 + jsonBytes.length + 8 + byteOffset;
  const out = Buffer.alloc(total);
  let o = 0;
  out.writeUInt32LE(0x46546c67, o); o += 4; // magic "glTF"
  out.writeUInt32LE(2, o); o += 4;
  out.writeUInt32LE(total, o); o += 4;
  out.writeUInt32LE(jsonBytes.length, o); o += 4;
  out.writeUInt32LE(0x4e4f534a, o); o += 4; // "JSON"
  Buffer.from(jsonBytes).copy(out, o); o += jsonBytes.length;
  out.writeUInt32LE(byteOffset, o); o += 4;
  out.writeUInt32LE(0x004e4942, o); o += 4; // "BIN\0"
  for (const part of binParts) {
    Buffer.from(part.buffer, part.byteOffset, part.byteLength).copy(out, o);
    o += part.byteLength;
  }
  return out;
}

/* ------------------------------------------------------------ part geometry */

const lathe = (points, segments = 40) =>
  new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments);

function pleatedSkirt(rTop, rBottom, height, pleats = 10, depth = 0.018) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, height, 64, 8, true);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const theta = Math.atan2(z, x);
    const r = Math.hypot(x, z);
    const bump = Math.abs(Math.sin(theta * pleats)) * depth;
    const nr = r + bump;
    pos.setX(i, Math.cos(theta) * nr);
    pos.setZ(i, Math.sin(theta) * nr);
  }
  g.computeVertexNormals();
  g.translate(0, -height / 2, 0); // waist at y=0, hem at -height
  return g;
}

function petalRing(count, ringR, petalScale, y, tiltOut = Math.PI / 3) {
  const petals = [];
  for (let i = 0; i < count; i++) {
    const p = new THREE.SphereGeometry(1, 12, 10);
    p.scale(...petalScale);
    p.rotateX(tiltOut);
    const a = (i / count) * Math.PI * 2;
    p.rotateY(-a);
    p.translate(Math.cos(a + Math.PI / 2) * 0, 0, 0); // rotate-then-place below
    const m = new THREE.Matrix4().makeTranslation(
      Math.cos(a) * ringR, y, Math.sin(a) * ringR,
    );
    // orient each petal to face outward from the ring center
    const q = new THREE.Matrix4().makeRotationY(-a + Math.PI / 2);
    p.applyMatrix4(new THREE.Matrix4().multiplyMatrices(m, q));
    petals.push(p);
  }
  return mergeGeometries(petals);
}

function buildPart(id) {
  switch (id) {
    case "dhoti-classic": {
      const cloth = lathe([
        [0.345, 0.02], [0.36, -0.02], [0.40, -0.28], [0.43, -0.52], [0.465, -0.76],
      ]);
      const border = new THREE.TorusGeometry(0.465, 0.022, 10, 48);
      border.rotateX(Math.PI / 2);
      border.translate(0, -0.76, 0);
      return [
        { name: "cloth", geometry: cloth },
        { name: "border", geometry: border, metallic: 0.6, roughness: 0.4 },
      ];
    }
    case "dhoti-pitambar": {
      const cloth = pleatedSkirt(0.355, 0.45, 0.78);
      const border = new THREE.TorusGeometry(0.455, 0.024, 10, 48);
      border.rotateX(Math.PI / 2);
      border.translate(0, -0.775, 0);
      return [
        { name: "cloth", geometry: cloth },
        { name: "border", geometry: border, metallic: 0.6, roughness: 0.4 },
      ];
    }
    case "angavastram": {
      const sash = new THREE.TorusGeometry(0.42, 0.05, 12, 48, Math.PI * 1.35);
      sash.rotateZ(Math.PI * 0.55);
      sash.rotateY(0.35);
      sash.rotateX(0.25);
      return [{ name: "cloth", geometry: sash }];
    }
    case "modak": {
      const sweet = lathe([
        [0.002, -0.055], [0.075, -0.05], [0.105, -0.015], [0.10, 0.02],
        [0.065, 0.055], [0.028, 0.095], [0.006, 0.13], [0.001, 0.135],
      ], 32);
      sweet.translate(0, 0.06, 0); // rest in the palm
      return [{ name: "sweet", geometry: sweet }];
    }
    case "ankusha": {
      const handle = new THREE.CylinderGeometry(0.022, 0.026, 0.55, 16);
      handle.translate(0, 0.11, 0); // grip at origin
      const spike = new THREE.ConeGeometry(0.035, 0.14, 16);
      spike.translate(0, 0.45, 0);
      const hook = new THREE.TorusGeometry(0.07, 0.017, 10, 24, Math.PI * 1.25);
      hook.rotateZ(-Math.PI * 0.15);
      hook.translate(0.055, 0.36, 0);
      const metal = mergeGeometries([spike, hook]);
      return [
        { name: "handle", geometry: handle, roughness: 0.7 },
        { name: "metal", geometry: metal, metallic: 0.8, roughness: 0.3 },
      ];
    }
    case "pasha": {
      const loop = new THREE.TorusGeometry(0.13, 0.02, 12, 36);
      loop.rotateY(Math.PI / 2);
      loop.translate(0, 0.24, 0);
      const grip = new THREE.CylinderGeometry(0.02, 0.02, 0.14, 12);
      grip.translate(0, 0.07, 0);
      const knot = new THREE.SphereGeometry(0.032, 12, 10);
      knot.translate(0, 0.125, 0);
      return [{ name: "rope", geometry: mergeGeometries([loop, grip, knot]) }];
    }
    case "lotus-flower": {
      const stem = new THREE.CylinderGeometry(0.014, 0.017, 0.42, 10);
      stem.translate(0, 0.21, 0);
      const bud = new THREE.SphereGeometry(0.055, 14, 12);
      bud.translate(0, 0.47, 0);
      const petals = petalRing(8, 0.07, [0.032, 0.085, 0.05], 0.46, Math.PI / 4.2);
      return [
        { name: "stem", geometry: stem },
        { name: "petals", geometry: mergeGeometries([bud, petals]) },
      ];
    }
    case "lotus-peetha": {
      const seat = lathe([
        [0.66, 0.0], [0.68, 0.05], [0.60, 0.10], [0.50, 0.13],
        [0.47, 0.22], [0.50, 0.30], [0.0, 0.30],
      ], 48);
      const petals = petalRing(14, 0.56, [0.09, 0.05, 0.19], 0.13, Math.PI / 2.4);
      return [
        { name: "seat", geometry: seat, roughness: 0.6 },
        { name: "petals", geometry: petals },
      ];
    }
    case "square-peetha": {
      const stone = new THREE.BoxGeometry(1.35, 0.18, 1.35);
      stone.translate(0, 0.09, 0);
      const foot = new THREE.BoxGeometry(1.46, 0.05, 1.46);
      foot.translate(0, 0.025, 0);
      const trim = new THREE.BoxGeometry(1.2, 0.06, 1.2);
      trim.translate(0, 0.21, 0);
      return [
        { name: "stone", geometry: mergeGeometries([stone, foot]), roughness: 0.75 },
        { name: "trim", geometry: trim, metallic: 0.5, roughness: 0.45 },
      ];
    }
    default:
      throw new Error(`No placeholder geometry defined for part "${id}"`);
  }
}

/* -------------------------------------------------------------- thumbnails */

function thumbnailSvg(part) {
  const zone = (i) => part.colorZones[Math.min(i, part.colorZones.length - 1)].defaultColor;
  const shapes = {
    "dhoti-classic": `<path d="M22 14 h20 l6 34 h-32 z" fill="${zone(0)}"/><rect x="14" y="46" width="36" height="5" rx="2" fill="${zone(1)}"/>`,
    "dhoti-pitambar": `<path d="M22 14 h20 l6 34 h-32 z" fill="${zone(0)}"/><path d="M27 14 l3 34 M32 14 l0 34 M37 14 l-3 34" stroke="#00000022" fill="none"/><rect x="14" y="46" width="36" height="5" rx="2" fill="${zone(1)}"/>`,
    angavastram: `<path d="M16 12 q22 10 30 40" stroke="${zone(0)}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
    modak: `<path d="M32 12 q4 10 12 16 q6 5 6 12 a18 12 0 0 1 -36 0 q0 -7 6 -12 q8 -6 12 -16 z" fill="${zone(0)}"/>`,
    ankusha: `<rect x="29" y="20" width="5" height="32" rx="2" fill="${zone(0)}"/><path d="M31 20 q0 -10 14 -6" stroke="${zone(1)}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M31 22 l0 -12" stroke="${zone(1)}" stroke-width="5" stroke-linecap="round"/>`,
    pasha: `<circle cx="32" cy="26" r="13" stroke="${zone(0)}" stroke-width="6" fill="none"/><rect x="29" y="38" width="6" height="14" rx="3" fill="${zone(0)}"/>`,
    "lotus-flower": `<rect x="30.5" y="30" width="3" height="22" rx="1.5" fill="${zone(1)}"/><g fill="${zone(0)}"><ellipse cx="32" cy="18" rx="5" ry="10"/><ellipse cx="22" cy="21" rx="5" ry="9" transform="rotate(-30 22 21)"/><ellipse cx="42" cy="21" rx="5" ry="9" transform="rotate(30 42 21)"/></g>`,
    "lotus-peetha": `<ellipse cx="32" cy="40" rx="24" ry="9" fill="${zone(1)}"/><g fill="${zone(0)}"><ellipse cx="14" cy="34" rx="4" ry="7" transform="rotate(-35 14 34)"/><ellipse cx="23" cy="31" rx="4" ry="8" transform="rotate(-15 23 31)"/><ellipse cx="32" cy="30" rx="4" ry="8"/><ellipse cx="41" cy="31" rx="4" ry="8" transform="rotate(15 41 31)"/><ellipse cx="50" cy="34" rx="4" ry="7" transform="rotate(35 50 34)"/></g>`,
    "square-peetha": `<rect x="10" y="30" width="44" height="14" rx="2" fill="${zone(0)}"/><rect x="14" y="24" width="36" height="6" rx="2" fill="${zone(1)}"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="12" fill="#F8F3EA"/>${shapes[part.id] ?? ""}</svg>\n`;
}

/* ------------------------------------------------------------------- main */

let totalBytes = 0;
for (const part of catalog.parts) {
  const specs = buildPart(part.id).map((s) => ({
    ...s,
    color:
      part.colorZones.find((z) => z.id === s.name)?.defaultColor ?? "#CCCCCC",
  }));
  const zoneIds = new Set(part.colorZones.map((z) => z.id));
  const meshIds = new Set(specs.map((s) => s.name));
  for (const z of zoneIds) {
    if (!meshIds.has(z)) throw new Error(`${part.id}: zone "${z}" has no mesh`);
  }
  for (const m of meshIds) {
    if (!zoneIds.has(m)) throw new Error(`${part.id}: mesh "${m}" not in colorZones`);
  }
  const glb = buildGlb(specs);
  writeFileSync(join(OUT_PARTS, `${part.id}.glb`), glb);
  writeFileSync(join(OUT_THUMBS, `${part.id}.svg`), thumbnailSvg(part));
  totalBytes += glb.length;
  console.log(`${part.id}.glb  ${(glb.length / 1024).toFixed(1)} KB`);
}
console.log(`\n${catalog.parts.length} parts, ${(totalBytes / 1024).toFixed(1)} KB total`);
