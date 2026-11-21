// Movement-mode plugins. Each plugin file exports install(player, ctx) and calls player.registerMode(name, plugin).
// ctx = { scene, physics, audio, ui, THREE, camera }. Add one import + one call per plugin below.
import { install as installScooters } from './scooter.js';
import { install as installHoverboard } from './hoverboard.js';
export function installModes(player, ctx) {
  // e.g. import('./scooter.js').then((m) => m.install(player, ctx));
  installScooters(player, ctx); // Lime / Veo shared e-scooters: E (or U) near a parked one
  installHoverboard(player, ctx); // X: hoverboard
}
