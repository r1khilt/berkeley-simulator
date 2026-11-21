# Movement-mode plugin API (src/player/player.js)
player.registerMode(name, plugin). Plugin fields, all optional except update:
- key: KeyboardEvent.code that toggles this mode (e.g. 'KeyH'). Avoid W A S D Space Shift C E B F V M T H Escape.
- canEnter(player) -> bool: refuse entering (e.g. not near a parked scooter).
- enter(player) / exit(player, nextMode)
- update(player, dt, inp, fwd, right) -> speed (m/s). Own player.pos / player.vel / player.yaw. inp = {f, s, sprint, up, down}.
  Use player._groundMove(dt, inp, true) for ground-following + wall collision, or player.ph.groundAt / resolve / rayWall directly.
- always(player, dt, inp, fwd, right): runs every frame in every mode (e.g. a grappling hook usable while walking).
- pose(player, avatar, dt): adjust avatar after the default animation (riding pose, etc.).
- onKey(e, player), onMouse(e, player, down)
player.camera, player.camDistT, player.view ('third'|'first') are available for camera tweaks.
Register in src/player/modes/index.js (one import + one install call per plugin).
