import * as THREE from 'three';

type FaceSpec = {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  normal: THREE.Vector3;
  u: THREE.Vector3;
  v: THREE.Vector3;
};

const OUTER = 1;
const CORNER_CHOP = 0.42;
const FACE_INSET = 0.15;
const FACE_CUT = 0.16;
const LAYER_GAP = 0.014;
const PIP_RADIUS = 0.12;
const PIP_OFFSET = 0.34;

const WHITE = 0xffffff;
const BEVEL = 0xf1f1f1;
const CORNER = 0xd4dbe0;
const PIP = 0x050505;
const EPS = 1e-5;

const FACE_SPECS: FaceSpec[] = [
  { value: 1, normal: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
  { value: 6, normal: new THREE.Vector3(0, 0, -1), u: new THREE.Vector3(-1, 0, 0), v: new THREE.Vector3(0, 1, 0) },
  { value: 3, normal: new THREE.Vector3(1, 0, 0), u: new THREE.Vector3(0, 0, -1), v: new THREE.Vector3(0, 1, 0) },
  { value: 4, normal: new THREE.Vector3(-1, 0, 0), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(0, 1, 0) },
  { value: 5, normal: new THREE.Vector3(0, -1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1) },
  { value: 2, normal: new THREE.Vector3(0, 1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1) },
];

function material(color: number, roughness = 0.78): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

type ClipPlane = {
  normal: THREE.Vector3;
  constant: number;
  materialIndex: 0 | 1;
};

function det3(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
  return a.x * (b.y * c.z - b.z * c.y) - a.y * (b.x * c.z - b.z * c.x) + a.z * (b.x * c.y - b.y * c.x);
}

function intersectPlanes(a: ClipPlane, b: ClipPlane, c: ClipPlane): THREE.Vector3 | null {
  const det = det3(a.normal, b.normal, c.normal);
  if (Math.abs(det) < EPS) return null;
  const termA = b.normal.clone().cross(c.normal).multiplyScalar(a.constant);
  const termB = c.normal.clone().cross(a.normal).multiplyScalar(b.constant);
  const termC = a.normal.clone().cross(b.normal).multiplyScalar(c.constant);
  return termA.add(termB).add(termC).multiplyScalar(1 / det);
}

function containsPoint(points: THREE.Vector3[], point: THREE.Vector3): boolean {
  return points.some((p) => p.distanceToSquared(point) < EPS * EPS * 16);
}

function pointInside(point: THREE.Vector3, planes: ClipPlane[]): boolean {
  return planes.every((plane) => plane.normal.dot(point) <= plane.constant + EPS);
}

function sortFacePoints(points: THREE.Vector3[], normal: THREE.Vector3): THREE.Vector3[] {
  const center = points.reduce((acc, point) => acc.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
  const helper = Math.abs(normal.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const axisA = helper.clone().cross(normal).normalize();
  const axisB = normal.clone().cross(axisA).normalize();
  return [...points].sort((pa, pb) => {
    const da = pa.clone().sub(center);
    const db = pb.clone().sub(center);
    return Math.atan2(da.dot(axisB), da.dot(axisA)) - Math.atan2(db.dot(axisB), db.dot(axisA));
  });
}

function solidDiceBody(bevelMat: THREE.Material, cornerMat: THREE.Material): THREE.Mesh {
  const planes: ClipPlane[] = [
    { normal: new THREE.Vector3(1, 0, 0), constant: OUTER, materialIndex: 0 },
    { normal: new THREE.Vector3(-1, 0, 0), constant: OUTER, materialIndex: 0 },
    { normal: new THREE.Vector3(0, 1, 0), constant: OUTER, materialIndex: 0 },
    { normal: new THREE.Vector3(0, -1, 0), constant: OUTER, materialIndex: 0 },
    { normal: new THREE.Vector3(0, 0, 1), constant: OUTER, materialIndex: 0 },
    { normal: new THREE.Vector3(0, 0, -1), constant: OUTER, materialIndex: 0 },
  ];
  ([-1, 1] as const).forEach((sx) => {
    ([-1, 1] as const).forEach((sy) => {
      ([-1, 1] as const).forEach((sz) => {
        planes.push({
          normal: new THREE.Vector3(sx, sy, sz).normalize(),
          constant: (3 - CORNER_CHOP) / Math.sqrt(3),
          materialIndex: 1,
        });
      });
    });
  });

  const vertices: THREE.Vector3[] = [];
  const facePoints = new Map<number, THREE.Vector3[]>();
  for (let i = 0; i < planes.length; i += 1) facePoints.set(i, []);

  for (let i = 0; i < planes.length - 2; i += 1) {
    for (let j = i + 1; j < planes.length - 1; j += 1) {
      for (let k = j + 1; k < planes.length; k += 1) {
        const point = intersectPlanes(planes[i], planes[j], planes[k]);
        if (!point || !pointInside(point, planes)) continue;
        if (!containsPoint(vertices, point)) vertices.push(point);
        [i, j, k].forEach((idx) => {
          const list = facePoints.get(idx);
          if (list && !containsPoint(list, point)) list.push(point);
        });
      }
    }
  }

  const positions: number[] = [];
  const indices: number[] = [];
  const materialIndices: number[] = [];
  facePoints.forEach((points, planeIndex) => {
    if (points.length < 3) return;
    const sorted = sortFacePoints(points, planes[planeIndex].normal);
    const base = positions.length / 3;
    sorted.forEach((point) => positions.push(point.x, point.y, point.z));
    for (let i = 1; i < sorted.length - 1; i += 1) {
      indices.push(base, base + i, base + i + 1);
      materialIndices.push(planes[planeIndex].materialIndex);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.clearGroups();
  materialIndices.forEach((materialIndex, faceIndex) => {
    geometry.addGroup(faceIndex * 3, 3, materialIndex);
  });
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, [bevelMat, cornerMat]);
}

function pointOnFace(face: FaceSpec, a: number, b: number, depth = OUTER): THREE.Vector3 {
  return face.normal.clone().multiplyScalar(depth).add(face.u.clone().multiplyScalar(a)).add(face.v.clone().multiplyScalar(b));
}

function facePanelPoints(face: FaceSpec, half: number, cut: number, depth = OUTER): THREE.Vector3[] {
  return [
    pointOnFace(face, -half + cut, -half, depth),
    pointOnFace(face, half - cut, -half, depth),
    pointOnFace(face, half, -half + cut, depth),
    pointOnFace(face, half, half - cut, depth),
    pointOnFace(face, half - cut, half, depth),
    pointOnFace(face, -half + cut, half, depth),
    pointOnFace(face, -half, half - cut, depth),
    pointOnFace(face, -half, -half + cut, depth),
  ];
}

function polygonMesh(points: THREE.Vector3[], mat: THREE.Material): THREE.Mesh {
  const vertices: number[] = [];
  points.forEach((p) => vertices.push(p.x, p.y, p.z));
  const indices: number[] = [];
  for (let i = 1; i < points.length - 1; i += 1) {
    indices.push(0, i, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, mat);
}

function pipPositions(value: FaceSpec['value']): Array<[number, number]> {
  const d = PIP_OFFSET;
  switch (value) {
    case 1:
      return [[0, 0]];
    case 2:
      return [
        [-d, d],
        [d, -d],
      ];
    case 3:
      return [
        [-d, d],
        [0, 0],
        [d, -d],
      ];
    case 4:
      return [
        [-d, d],
        [d, d],
        [-d, -d],
        [d, -d],
      ];
    case 5:
      return [
        [-d, d],
        [d, d],
        [0, 0],
        [-d, -d],
        [d, -d],
      ];
    case 6:
      return [
        [-d, d],
        [d, d],
        [-d, 0],
        [d, 0],
        [-d, -d],
        [d, -d],
      ];
  }
}

function pipMesh(face: FaceSpec, a: number, b: number, mat: THREE.Material): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(PIP_RADIUS, 40);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.copy(pointOnFace(face, a, b, OUTER + LAYER_GAP * 4));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), face.normal);
  return mesh;
}

export function createDiceMesh(): THREE.Group {
  const group = new THREE.Group();
  const whiteMat = material(WHITE, 0.7);
  const bevelMat = material(BEVEL, 0.82);
  const cornerMat = material(CORNER, 0.86);
  const pipMat = material(PIP, 0.55);

  group.add(solidDiceBody(bevelMat, cornerMat));
  FACE_SPECS.forEach((face) => {
    group.add(polygonMesh(facePanelPoints(face, OUTER - FACE_INSET, FACE_CUT, OUTER + LAYER_GAP * 2), whiteMat));
    pipPositions(face.value).forEach(([a, b]) => group.add(pipMesh(face, a, b, pipMat)));
  });

  return group;
}
