// Spieker Aquatics Complex — duplicate OSM entry (relation r/1734952, tagged building=yes over the open-air pool).
// The pool, deck and stands are modelled once in spieker-aquatics-complex.js (w/109191199). This module only exists to
// suppress the procedural building the engine would otherwise extrude from the relation on top of the water.
import * as THREE from 'three';

export const info = {
  id: 'spieker-aquatics-complex-1734952',
  name: 'Spieker Aquatics Complex',
  subtitle: 'Cal swimming, diving & water polo',
  blurb: 'Home pool of Cal swimming and water polo: an outdoor 50-metre competition pool with spectator stands, next to the Recreational Sports Facility.',
  replaces: ['r/1734952'],
};

export async function build() {
  const object3d = new THREE.Group(); object3d.name = 'spieker-aquatics-complex-1734952 (suppressed duplicate)';
  return { object3d, colliders: [], walkables: [] };
}
