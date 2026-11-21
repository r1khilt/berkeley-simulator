import * as THREE from 'three';
export const info = { id: '_example', name: 'Example box', replaces: [] };
export function build({ M, boxUV, groundAt }) {
  const g = new THREE.Group();
  const geo = boxUV(new THREE.BoxGeometry(10, 20, 10).translate(0, 10, 0));
  g.add(new THREE.Mesh(geo, M.ashlar));
  return { object3d: g, colliders: [{ type: 'box', min: [-5, 0, -5], max: [5, 20, 5] }] };
}
