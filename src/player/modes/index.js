// Movement-mode plugins. Each plugin file exports install(player, ctx) and calls player.registerMode(name, plugin).
// ctx = { scene, physics, audio, ui, THREE, camera }. Add one import + one call per plugin below.
import { install as installScooters } from './scooter.js';
import { install as installHoverboard } from './hoverboard.js';
export function installModes(player, ctx) {
  if (typeof location !== 'undefined' && /[?&]noride\b/.test(location.search)) return; // debug: ?noride disables ride plugins
  // e.g. import('./scooter.js').then((m) => m.install(player, ctx));
  import('./grapple.js').then((m) => m.install(player, ctx)); // grappling hook: Q / right mouse (see grapple.js)
  import('./horse.js').then((m) => m.install(player, ctx)); // rideable horse (Y), hitched at Faculty Glade
  installScooters(player, ctx); // Lime / Veo shared e-scooters: E (or U) near a parked one
  installHoverboard(player, ctx); // X: hoverboard
}
