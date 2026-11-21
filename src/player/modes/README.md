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

## HUD and Controls integration (optional plugin fields, read by src/ui/ui.js)
- label: name shown in the HUD mode bar and the Controls sheet (default: the mode name, capitalised).
- icon: an icon name from src/ui/icons.js (e.g. 'scooter', 'hoverboard', 'horse', 'hook', 'skate', 'car', 'drone') or a full inline `<svg ...>` string (24x24, stroke="currentColor").
- hint: one short line for the Controls sheet, also shown as a notice if canEnter() refuses (e.g. 'Walk up to a parked Lime and press G').
- hidden: true keeps a mode out of the HUD mode bar and the Controls sheet.
- tool: true for always-on abilities that are not modes (e.g. a grappling hook): listed under Controls, not in the mode bar.
Plugins with a key, label or icon appear in the mode bar automatically (clicking a segment calls player.setMode); no UI changes needed.
Grappling hook (grapple.js, mode 'grapple'): hold Q or right mouse in walk, bike or any plugin mode. A plugin can set `grapple: false` to switch it off in its mode. When a swing lands, the player is returned to the mode they fired from (via setMode, so canEnter still applies). For the HUD it sets label, icon (an inline SVG string that uses currentColor) and hint (one line of help text).
