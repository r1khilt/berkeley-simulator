// Movement-mode plugins. Each plugin file exports install(player, ctx) and calls player.registerMode(name, plugin).
// ctx = { scene, physics, audio, ui, THREE, camera }. Add one import + one call per plugin below.
export function installModes(player, ctx) {
  // e.g. import('./scooter.js').then((m) => m.install(player, ctx));
  import('./grapple.js').then((m) => m.install(player, ctx)); // grappling hook: Q / right mouse (see grapple.js)
  import('./horse.js').then((m) => m.install(player, ctx)); // rideable horse (Y), hitched at Faculty Glade
}
