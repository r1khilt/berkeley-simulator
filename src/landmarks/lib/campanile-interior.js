// Sather Tower interior for the elevator ride (r4-campanile): the ground-floor lobby (2023 refresh: warm walls, welcome desk,
// history displays, admission sign), the elevator with its operator's cab and dial indicator, the seventh-floor landing
// with the two glass cases (north clock motor; Bacon Hall's 1881 hour-strike machinery), the 38 steps up to the
// observation deck, and the hollow carillonist's cabin the stairs arrive in. Facts: visit.berkeley.edu (elevator + 38
// steps, lobby displays, bag check, prices), Clocks page (glass cases on the seventh-floor landing), Berkeleyside 2015
// (elevator operator). All in the tower frame (u east-ish, v south-ish, north face at -v); the caller flushes with F.
import * as THREE from 'three';
import { boxMM, boxC } from './campanile-kit.js';

export const LIFT = { u: 0, v: 3.0, hw: 0.85, hd: 0.7, h: 2.3, door: 0.5, shaft: [-1.1, 2.1, 1.1, 3.85] }; // cab centre + shaft footprint
export const STEP = { rise: 0.18, run: 0.25, n1: 19, n2: 19 };

// small canvas sign helper
function signTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// Interior surfaces are lit only by the tower's own lamps: black albedo + emissive ("baked" light), so the sun and the shadow
// maps can never leak into the closed shaft (a lit material here picked up tree shadows and shadow acne).
const glow = (hex, k = 0.8, name = '', map = null) => { const m = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9, metalness: 0 }); m.emissive = new THREE.Color(hex).multiplyScalar(k); if (map) m.emissiveMap = map; m.name = name; return m; };

// Builds static interior geometry into `main`/`fine` (frame space) and animated parts under `fg` (a group carrying the
// tower frame). k = { HW0, DECK_Y, FL (lobby floor), TL (landing floor), CEIL (lobby ceiling), doorY1 }
export function buildInterior(M, B, fg, k) {
  const { inner: main, innerFine: fine, outer } = B;   // interior-only buckets (hidden from afar) + exterior-visible bucket
  const { HW0, DECK_Y, FL, TL, CEIL } = k;
  const LW = 3.85;                                        // inner half-width of the shaft at both levels
  const paperTex = signTex(256, 256, (g, w, h) => {      // 2023 refresh: wallpapered walls
    g.fillStyle = '#e8e1d2'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,50,98,0.10)'; g.lineWidth = 3;
    for (let i = -h; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
    g.fillStyle = 'rgba(253,181,21,0.25)'; for (let y = 16; y < h; y += 32) for (let x = (y / 32) % 2 ? 0 : 16; x < w; x += 32) g.fillRect(x - 2, y - 2, 4, 4);
  });
  paperTex.wrapS = paperTex.wrapT = THREE.RepeatWrapping;
  const paperM = glow(0xffffff, 0.78, 'campanileWallpaper', paperTex);
  const floorM = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.3, metalness: 0, emissive: 0xb8b2a6 }); floorM.name = 'campanileLobbyFloor';   // polished stone: keeps a sheen
  if (M.marble.map) { floorM.emissiveMap = M.marble.map; }
  const ceilM = glow(0xf2efe8, 0.82, 'campanileCeiling');
  const lightM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff1d0, emissiveIntensity: 1.05, roughness: 0.6 }); lightM.name = 'campanileLight';
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a060, metalness: 0.9, roughness: 0.3, emissive: 0x3c2a10 }); brass.name = 'campanileBrass';
  const plasterM = glow(0xd9d3c7, 0.7, 'campanilePlaster');
  const stairM = glow(0xbdb8ae, 0.62, 'campanileStair', M.concrete.map || null);
  const cabWood = glow(0x8a5a32, 0.75, 'campanileCabWood', M.wood.map || null);
  const darkWood = glow(0x4a2e1a, 0.7, 'campanileDarkWood', M.woodDark.map || null);
  const graniteIn = glow(0x8e8c88, 0.7, 'campanileWainscot', M.graniteDark.map || null);
  const bronzeIn = glow(0x5a4128, 0.85, 'campanileHallDoor'); bronzeIn.metalness = 0.0; bronzeIn.roughness = 0.4;
  const ironIn = glow(0x26282a, 1.0, 'campanileRail');
  const glassM = new THREE.MeshStandardMaterial({ color: 0xd6e4e6, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false }); glassM.name = 'campanileCaseGlass';
  const ironM = M.iron, blue = glow(0x003262, 0.25, 'campanileCalBlue'), gold = glow(0xfdb515, 0.3, 'campanileCalGold');
  const S = LIFT.shaft;
  const wall = (u0, v0, u1, v1, y0, y1, mat) => main.add(mat, boxMM(u0, y0, v0, u1, y1, v1));

  // ================= ground-floor lobby =================
  main.add(floorM, boxMM(-LW, FL - 0.3, -LW, LW, FL, LW));
  main.add(floorM, boxMM(-1.2, FL - 0.3, -4.32, 1.2, FL, -LW));                             // door passage floor
  main.add(ceilM, boxMM(-LW, CEIL, -LW, LW, CEIL + 0.25, LW));
  for (const [u, v] of [[-2, -2], [2, -2], [-2, 0.5], [2, 0.5]]) main.add(lightM, new THREE.CylinderGeometry(0.28, 0.28, 0.04, 20).translate(u, CEIL - 0.02, v), { uv: 'keep' });
  // walls: granite wainscot + wallpaper above; the north wall keeps the door passage open
  for (const [y0, y1, mat] of [[FL, FL + 1.0, graniteIn], [FL + 1.0, CEIL, paperM]]) {
    wall(-LW - 0.1, LW, LW + 0.1, LW + 0.1, y0, y1, mat);                                    // south
    wall(-LW - 0.1, -LW, -LW, LW, y0, y1, mat);                                              // west
    wall(LW, -LW, LW + 0.1, LW, y0, y1, mat);                                                // east
    wall(-LW - 0.1, -LW - 0.1, -1.3, -LW, y0, y1, mat); wall(1.3, -LW - 0.1, LW + 0.1, -LW, y0, y1, mat); // north, either side of the door
  }
  wall(-1.3, -LW - 0.1, 1.3, -LW, k.doorY1 + 0.1, CEIL, paperM);                             // over the door passage
  // door passage reveals (between the bronze leaves at v=-4.30 and the lobby)
  main.add(M.granite, boxMM(-1.3, FL, -4.32, -1.2, k.doorY1, -LW)); main.add(M.granite, boxMM(1.2, FL, -4.32, 1.3, k.doorY1, -LW));
  main.add(M.granite, boxMM(-1.3, k.doorY1, -4.32, 1.3, k.doorY1 + 0.1, -LW));
  // elevator shaft enclosure (bronze-framed door, dial indicator above)
  main.add(graniteIn, boxMM(S[0], FL, S[1], -LIFT.door, FL + 2.5, S[1] + 0.12)); main.add(graniteIn, boxMM(LIFT.door, FL, S[1], S[2], FL + 2.5, S[1] + 0.12));
  main.add(paperM, boxMM(S[0], FL + 2.5, S[1], S[2], CEIL, S[1] + 0.12)); main.add(graniteIn, boxMM(-LIFT.door, FL + 2.18, S[1], LIFT.door, FL + 2.5, S[1] + 0.12));
  main.add(paperM, boxMM(S[0], FL, S[1], S[0] + 0.1, CEIL, LW)); main.add(paperM, boxMM(S[2] - 0.1, FL, S[1], S[2], CEIL, LW));
  main.add(brass, boxMM(-LIFT.door - 0.08, FL, S[1] - 0.04, -LIFT.door, FL + 2.26, S[1])); main.add(brass, boxMM(LIFT.door, FL, S[1] - 0.04, LIFT.door + 0.08, FL + 2.26, S[1]));
  main.add(brass, boxMM(-LIFT.door - 0.08, FL + 2.18, S[1] - 0.04, LIFT.door + 0.08, FL + 2.26, S[1]));
  // dial floor indicator over the door (L, 1-7): a brass half-dial with a pointer the director turns
  const dialTex = signTex(256, 140, (g, w, h) => {
    g.fillStyle = '#2a2116'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8b46a'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h - 12, 108, Math.PI, 0); g.stroke();
    g.fillStyle = '#f0d9a0'; g.font = 'bold 22px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['L', '1', '2', '3', '4', '5', '6', '7'].forEach((s, i) => { const a = Math.PI - (i / 7) * Math.PI; g.fillText(s, w / 2 + Math.cos(a) * 88, h - 12 - Math.sin(a) * 88); });
  });
  const dialM = new THREE.MeshStandardMaterial({ map: dialTex, emissive: 0xffffff, emissiveMap: dialTex, emissiveIntensity: 0.35, roughness: 0.5 }); dialM.name = 'campanileLiftDial';
  const dialY = FL + 2.62;
  main.add(dialM, new THREE.PlaneGeometry(0.62, 0.34).rotateY(Math.PI).translate(0, dialY, S[1] - 0.01), { uv: 'keep' });
  const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.008).translate(0, 0.065, 0), brass); pointer.position.set(0, dialY - 0.14, S[1] - 0.02); pointer.name = 'campanile-lift-pointer'; fg.add(pointer);
  // landing (hall) doors: two bronze leaves that part to the sides, just behind the opening
  const hallDoors = (y) => [-1, 1].map((sx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.515, 2.16, 0.04), bronzeIn); m.position.set(sx * 0.25, y + 1.08, S[1] + 0.07); m.userData.sx = sx; m.castShadow = false; fg.add(m); return m; });
  const lobbyDoors = hallDoors(FL);
  // welcome desk (2023) and the bag check, west side
  main.add(cabWood, boxMM(-3.35, FL, -1.2, -2.0, FL + 1.02, 1.5));
  main.add(blue, boxMM(-2.0, FL + 0.08, -1.15, -1.97, FL + 0.98, 1.45));
  main.add(gold, boxMM(-1.99, FL + 0.82, -1.15, -1.96, FL + 0.86, 1.45));
  main.add(M.wood, boxMM(-3.4, FL + 1.02, -1.25, -1.93, FL + 1.07, 1.55));
  main.add(cabWood, boxMM(-LW, FL, 1.8, -2.4, FL + 2.0, 3.6));                             // bag-check cubbies
  for (let i = 0; i < 4; i++) main.add(darkWood, boxMM(-2.42, FL + 0.2 + i * 0.45, 1.85, -2.39, FL + 0.55 + i * 0.45, 3.55));
  // history displays (east wall) + the admission sign by the lift
  const panel = (lines, accent, draw) => signTex(512, 700, (g, w, h) => {
    g.fillStyle = '#f6f2e9'; g.fillRect(0, 0, w, h); g.fillStyle = accent; g.fillRect(0, 0, w, 120);
    g.fillStyle = '#fff'; g.font = 'bold 44px Georgia'; g.textAlign = 'left'; g.fillText(lines[0], 32, 78);
    g.fillStyle = '#25303a'; g.font = '30px Georgia'; lines.slice(1).forEach((s, i) => g.fillText(s, 32, 190 + i * 52));
    g.strokeStyle = '#c9c1b0'; g.lineWidth = 4; g.strokeRect(32, 470, w - 64, 190); g.fillStyle = '#dfe6ea'; g.fillRect(36, 474, w - 72, 182);
    g.fillStyle = accent; g.globalAlpha = 0.85; draw && draw(g, w);
    g.globalAlpha = 1;
  });
  const towerArt = (g, w) => { const x = w / 2; g.fillRect(x - 14, 520, 28, 130); g.fillRect(x - 17, 505, 34, 16); g.beginPath(); g.moveTo(x - 15, 505); g.lineTo(x, 478); g.lineTo(x + 15, 505); g.fill(); g.fillRect(36, 645, w - 72, 11); };
  const bellArt = (g, w) => { for (const [x, r] of [[150, 40], [250, 30], [335, 22], [400, 16]]) { g.beginPath(); g.moveTo(x - r, 600); g.quadraticCurveTo(x - r * 0.8, 600 - r * 1.6, x, 600 - r * 1.7); g.quadraticCurveTo(x + r * 0.8, 600 - r * 1.6, x + r, 600); g.closePath(); g.fill(); } };
  const clockArt = (g, w) => { const x = w / 2, y = 565, R = 70; g.lineWidth = 6; g.strokeStyle = g.fillStyle; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(x + Math.sin(a) * 58 - 3, y - Math.cos(a) * 58 - 3, 6, 6); } g.lineWidth = 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y - 22); g.moveTo(x, y); g.lineTo(x - 8, y - 55); g.stroke(); };
  const panels = [
    panel(['Sather Tower', 'Gift of Jane K. Sather', 'John Galen Howard, 1914', '307 feet of granite', 'Opened to the public 1916'], '#003262', (g, w) => towerArt(g, w)),
    panel(['The Carillon', '61 bells, G2 to G7', 'Great Bear Bell: 10,500 lb', 'First rung Nov. 3, 1917', 'Recitals 7:50, 12:00, 6:00'], '#3b7ea1', (g, w) => bellArt(g, w)),
    panel(['The Clocks', 'Four 17-foot dials', 'Bronze numerals', 'Hands of Sitka spruce', 'Hour strike 8 am to 10 pm'], '#00553a', (g, w) => clockArt(g, w)),
  ];
  panels.forEach((t, i) => { const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.28, roughness: 0.7 }); m.name = 'campanilePanel' + i;
    main.add(m, new THREE.PlaneGeometry(1.0, 1.37).rotateY(-Math.PI / 2).translate(LW - 0.02, FL + 1.75, -2.2 + i * 1.45), { uv: 'keep' }); });
  const priceTex = signTex(512, 512, (g, w, h) => {
    g.fillStyle = '#003262'; g.fillRect(0, 0, w, h); g.fillStyle = '#fdb515'; g.fillRect(0, 118, w, 6);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 40px Georgia'; g.fillText('OBSERVATION', w / 2, 58); g.fillText('PLATFORM', w / 2, 102);
    g.font = '27px Georgia'; ['Elevator + 38 steps', '', 'General admission  $6', 'Seniors, youth, CAA  $5', 'UC Berkeley students,', 'faculty & staff with', 'Cal 1 Card  FREE'].forEach((s, i) => g.fillText(s, w / 2, 172 + i * 44));
  });
  const priceM = new THREE.MeshStandardMaterial({ map: priceTex, emissive: 0xffffff, emissiveMap: priceTex, emissiveIntensity: 0.3, roughness: 0.6 }); priceM.name = 'campanilePrice';
  main.add(priceM, new THREE.PlaneGeometry(0.8, 0.8).rotateY(Math.PI).translate(-1.75, FL + 1.55, S[1] - 0.01), { uv: 'keep' });
  // brass stanchions with a velvet rope guiding the queue to the lift
  const rope = new THREE.MeshStandardMaterial({ color: 0x7a1d22, roughness: 0.8, emissive: 0x1a0505 }); rope.name = 'campanileRope';
  for (const [u, v] of [[-1.25, 0.9], [-1.25, -0.6], [1.25, 0.9], [1.25, -0.6]]) {
    fine.add(brass, new THREE.CylinderGeometry(0.03, 0.03, 0.95, 10).translate(u, FL + 0.48, v), { smooth: true });
    fine.add(brass, new THREE.CylinderGeometry(0.16, 0.18, 0.04, 14).translate(u, FL + 0.02, v), { smooth: true });
    fine.add(brass, new THREE.SphereGeometry(0.045, 10, 8).translate(u, FL + 0.98, v), { smooth: true });
  }
  for (const sx of [-1.25, 1.25]) fine.add(rope, new THREE.CylinderGeometry(0.018, 0.018, 1.5, 6).rotateX(Math.PI / 2).translate(sx, FL + 0.86, 0.15), { smooth: true });

  // ================= elevator cab (moves with the ride) =================
  const cab = new THREE.Group(); cab.name = 'campanile-lift-cab'; fg.add(cab);
  const C = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = false; cab.add(m); return m; };
  const { hw, hd, h } = LIFT;
  C(boxMM(-hw - 0.05, -0.12, -hd - 0.05, hw + 0.05, 0, hd + 0.05), darkWood);              // floor
  C(boxMM(-hw - 0.05, h, -hd - 0.05, hw + 0.05, h + 0.08, hd + 0.05), ceilM);
  C(boxC(0, h - 0.02, 0.1, 0.9, 0.03, 0.6), lightM);
  C(boxMM(-hw - 0.05, 0, hd, hw + 0.05, h, hd + 0.05), cabWood);                            // back wall
  C(boxMM(-hw - 0.05, 0, -hd, -hw, h, hd), cabWood); C(boxMM(hw, 0, -hd, hw + 0.05, h, hd), cabWood);
  C(boxMM(-hw - 0.05, 0, -hd - 0.05, -LIFT.door, h, -hd), cabWood); C(boxMM(LIFT.door, 0, -hd - 0.05, hw + 0.05, h, -hd), cabWood);
  C(boxMM(-LIFT.door, 2.12, -hd - 0.05, LIFT.door, h, -hd), cabWood);
  for (const z of [-0.2, 0.35]) for (const sx of [-1, 1]) C(boxMM(sx * hw - 0.02, 0.9, z, sx * hw + 0.02, 2.1, z + 0.02), darkWood); // panel mouldings
  C(new THREE.CylinderGeometry(0.02, 0.02, 2 * hw - 0.1, 8).rotateZ(Math.PI / 2).translate(0, 0.95, hd - 0.07), brass);
  for (const sx of [-1, 1]) C(new THREE.CylinderGeometry(0.02, 0.02, 2 * hd - 0.2, 8).rotateX(Math.PI / 2).translate(sx * (hw - 0.07), 0.95, 0), brass);
  C(boxC(hw - 0.12, 1.25, -hd + 0.03, 0.16, 0.5, 0.02), brass);                              // operator's panel
  for (let i = 0; i < 8; i++) C(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10).rotateX(Math.PI / 2).translate(hw - 0.12, 1.06 + i * 0.05, -hd + 0.045), i === 7 ? lightM : darkWood);
  C(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14).translate(-hw + 0.25, 0.62, hd - 0.28), darkWood); // operator's stool
  C(new THREE.CylinderGeometry(0.025, 0.03, 0.6, 8).translate(-hw + 0.25, 0.3, hd - 0.28), brass);
  const cabDoorTex = signTex(128, 256, (g, w, h) => { g.fillStyle = '#b08850'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6e5028'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h * 0.45); g.strokeRect(14, h * 0.5, w - 28, h * 0.45); g.fillStyle = '#3a2a14'; g.fillRect(w - 4, 0, 4, h); });
  const cabDoorM = glow(0xffffff, 0.75, 'campanileCabDoor', cabDoorTex);
  const cabIndTex = signTex(128, 64, (g) => { g.fillStyle = '#120d08'; g.fillRect(0, 0, 128, 64); });
  const cabInd = C(new THREE.PlaneGeometry(0.3, 0.15).translate(0, 2.26, -hd + 0.02), new THREE.MeshBasicMaterial({ map: cabIndTex, toneMapped: false }));
  cabInd.name = 'campanile-lift-indicator';
  let shown = '';
  const setFloor = (label) => { if (label === shown) return; shown = label; const c = cabIndTex.image, g = c.getContext('2d'); g.fillStyle = '#120d08'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#ffb347'; g.font = 'bold 44px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 64, 34); cabIndTex.needsUpdate = true; };
  setFloor('L');
  const cabDoors = [-1, 1].map((sx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.515, 2.12, 0.03), cabDoorM); m.position.set(sx * 0.25, 1.06, -hd - 0.02); m.userData.sx = sx; m.castShadow = false; cab.add(m); return m; });
  cab.position.set(LIFT.u, FL, LIFT.v);

  // ================= seventh-floor landing =================
  main.add(stairM, boxMM(-LW, TL - 0.3, -LW, LW, TL, LW));
  for (const [u0, v0, u1, v1] of [[-LW - 0.1, LW, LW + 0.1, LW + 0.1], [-LW - 0.1, -LW - 0.1, LW + 0.1, -LW], [-LW - 0.1, -LW, -LW, LW], [LW, -LW, LW + 0.1, LW]]) wall(u0, v0, u1, v1, TL, DECK_Y - 0.3, plasterM);
  for (const [u, v] of [[-2.4, -1.2], [-2.4, 2.0]]) main.add(lightM, new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16).translate(u, DECK_Y - 0.33, v), { uv: 'keep' });
  // plastered ceiling under the deck slab, around the stair well
  for (const [u0, v0, u1, v1] of [[-LW, -LW, LW, -1.37], [-LW, 1.45, LW, LW], [-LW, -1.37, -0.55, 1.45], [0.55, -1.37, LW, 1.45]]) main.add(ceilM, boxMM(u0, DECK_Y - 0.33, v0, u1, DECK_Y - 0.3, v1));
  main.add(lightM, boxC(1.0, 57.0, -LW + 0.06, 0.5, 0.25, 0.04));                              // wall light over the landing
  // lift enclosure up here
  main.add(plasterM, boxMM(S[0], TL, S[1], -LIFT.door, DECK_Y - 0.3, S[1] + 0.12)); main.add(plasterM, boxMM(LIFT.door, TL, S[1], S[2], DECK_Y - 0.3, S[1] + 0.12));
  main.add(plasterM, boxMM(-LIFT.door, TL + 2.18, S[1], LIFT.door, DECK_Y - 0.3, S[1] + 0.12));
  main.add(plasterM, boxMM(S[0], TL, S[1], S[0] + 0.1, DECK_Y - 0.3, LW)); main.add(plasterM, boxMM(S[2] - 0.1, TL, S[1], S[2], DECK_Y - 0.3, LW));
  main.add(brass, boxMM(-LIFT.door - 0.06, TL, S[1] - 0.03, -LIFT.door, TL + 2.24, S[1])); main.add(brass, boxMM(LIFT.door, TL, S[1] - 0.03, LIFT.door + 0.06, TL + 2.24, S[1]));
  main.add(brass, boxMM(-LIFT.door - 0.06, TL + 2.18, S[1] - 0.03, LIFT.door + 0.06, TL + 2.24, S[1]));
  const topDoors = hallDoors(TL);
  // the clock drive shafts come through the walls at the dial centres; the north one's motor sits in the small glass case
  const caseBox = (u0, v0, u1, v1, y0, y1) => {
    main.add(darkWood, boxMM(u0 - 0.05, TL, v0 - 0.05, u1 + 0.05, y0, v1 + 0.05));
    fine.add(glassM, boxMM(u0, y0, v0, u1, y1, v1), { uv: 'keep' });
    main.add(brass, boxMM(u0 - 0.03, y1, v0 - 0.03, u1 + 0.03, y1 + 0.04, v1 + 0.03));
    for (const [a, b] of [[u0, v0], [u1, v0], [u0, v1], [u1, v1]]) main.add(brass, boxMM(a - 0.02, y0, b - 0.02, a + 0.02, y1, b + 0.02));
  };
  caseBox(-0.45, -LW + 0.05, 0.45, -LW + 0.65, TL + 0.25, TL + 1.05);
  main.add(blue, boxMM(-0.25, TL + 0.25, -LW + 0.15, 0.25, TL + 0.6, -LW + 0.5));             // motor
  main.add(brass, new THREE.CylinderGeometry(0.11, 0.11, 0.05, 20).rotateX(Math.PI / 2).translate(0, TL + 0.75, -LW + 0.4), { smooth: true });
  main.add(ironM, new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8).rotateX(Math.PI / 2).translate(0, TL + 0.75, -LW + 0.25), { smooth: true });
  for (const [u, v, ry] of [[LW - 0.2, -1.8, Math.PI / 2], [-LW + 0.2, 0, Math.PI / 2]]) { const g = new THREE.BoxGeometry(0.4, 0.35, 0.3); g.rotateY(ry); main.add(ironM, g.translate(u, TL + 0.45, v)); }
  // Bacon Hall's 1881 hour-strike machinery (here since 1925) at the foot of the stairs
  const CA = [1.3, -0.3, 2.55, 1.1];
  caseBox(CA[0], CA[1], CA[2], CA[3], TL + 0.35, TL + 2.0);
  const cx = (CA[0] + CA[2]) / 2, cz = (CA[1] + CA[3]) / 2;
  const frameM = M.blackPaint || ironM;
  for (const sz of [-0.42, 0.42]) {
    main.add(frameM, boxMM(cx - 0.45, TL + 0.4, cz + sz - 0.03, cx + 0.45, TL + 0.46, cz + sz + 0.03)); main.add(frameM, boxMM(cx - 0.45, TL + 1.6, cz + sz - 0.03, cx + 0.45, TL + 1.66, cz + sz + 0.03));
    for (const sx of [-0.42, 0.42]) main.add(frameM, boxMM(cx + sx - 0.03, TL + 0.4, cz + sz - 0.03, cx + sx + 0.03, TL + 1.66, cz + sz + 0.03));
  }
  for (const [y, rr, x] of [[0.85, 0.26, -0.12], [1.18, 0.17, 0.2], [1.38, 0.1, -0.2], [0.7, 0.12, 0.25]]) {
    main.add(brass, new THREE.CylinderGeometry(rr, rr, 0.03, 28).rotateX(Math.PI / 2).translate(cx + x, TL + y, cz), { smooth: true });
    main.add(ironM, new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8).rotateX(Math.PI / 2).translate(cx + x, TL + y, cz), { smooth: true });
  }
  main.add(ironM, new THREE.CylinderGeometry(0.08, 0.08, 0.7, 14).rotateX(Math.PI / 2).translate(cx, TL + 0.62, cz), { smooth: true }); // weight drum
  main.add(ironM, boxC(cx + 0.1, TL + 1.5, cz, 0.7, 0.04, 0.05));                               // strike lever
  // ---- the 38 steps: flight 1 north along the east wall, a landing, flight 2 south through the middle into the cabin
  const r = STEP.rise, d = STEP.run, F1u = [2.75, LW], F1v0 = 1.45, F2u = [-0.55, 0.55], LAND = TL + STEP.n1 * r;
  const F2v0 = F1v0 - STEP.n1 * d;                                                           // landing edge (-3.30)
  for (let i = 0; i < STEP.n1; i++) main.add(stairM, boxMM(F1u[0], TL + i * r - 0.12, F1v0 - (i + 1) * d, F1u[1], TL + (i + 1) * r, F1v0 - i * d));
  main.add(stairM, boxMM(F2u[0], LAND - 0.25, -LW, LW, LAND, F2v0));                          // landing
  for (let i = 0; i < STEP.n2; i++) main.add(stairM, boxMM(F2u[0], LAND + i * r - 0.12, F2v0 + i * d, F2u[1], LAND + (i + 1) * r, F2v0 + (i + 1) * d));
  // steel handrails (flight 1 open side, both sides of flight 2) and a stringer under flight 2
  const rail = (a, b) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), dd = vb.clone().sub(va); const g = new THREE.CylinderGeometry(0.022, 0.022, dd.length(), 8); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dd.normalize())); fine.add(ironIn, g.translate((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2), { smooth: true }); };
  rail([F1u[0] + 0.04, TL + 0.95, F1v0], [F1u[0] + 0.04, LAND + 0.95, F2v0]);
  for (let i = 0; i <= STEP.n1; i += 3) fine.add(ironIn, boxC(F1u[0] + 0.04, TL + i * r + 0.47, F1v0 - i * d, 0.03, 0.95, 0.03));
  for (const u of [F2u[0] - 0.04, F2u[1] + 0.04]) {
    rail([u, LAND + 0.95, F2v0], [u, DECK_Y + 0.95, F2v0 + STEP.n2 * d]);
    for (let i = 0; i <= STEP.n2; i += 3) fine.add(ironIn, boxC(u, LAND + i * r + 0.47, F2v0 + i * d, 0.03, 0.95, 0.03));
  }
  main.add(ironIn, new THREE.BoxGeometry(0.08, 0.3, Math.hypot(STEP.n2 * d, STEP.n2 * r)).rotateX(-Math.atan2(r, d)).translate(0, (LAND + DECK_Y) / 2 - 0.35, F2v0 + STEP.n2 * d / 2));

  // ================= carillonist's cabin (hollow; the stairs arrive inside it) =================
  const CW = 1.45, CH = 63.3;
  outer.add(M.woodDark, boxMM(-CW, DECK_Y, -CW, -CW + 0.08, CH, CW)); outer.add(M.woodDark, boxMM(CW - 0.08, DECK_Y, -CW, CW, CH, CW));
  outer.add(M.woodDark, boxMM(-CW, DECK_Y, -CW, CW, CH, -CW + 0.08));
  outer.add(M.woodDark, boxMM(-CW, DECK_Y, CW - 0.08, -0.45, CH, CW)); outer.add(M.woodDark, boxMM(0.45, DECK_Y, CW - 0.08, CW, CH, CW));
  outer.add(M.woodDark, boxMM(-0.45, DECK_Y + 2.1, CW - 0.08, 0.45, CH, CW));
  main.add(cabWood, boxMM(-CW + 0.08, CH - 0.05, -CW + 0.08, CW - 0.08, CH, CW - 0.08));
  main.add(lightM, boxC(0, CH - 0.07, 0, 0.5, 0.03, 0.5));
  main.add(cabWood, boxMM(-CW + 0.08, DECK_Y - 0.05, -CW + 0.08, F2u[0], DECK_Y + 0.01, CW - 0.08));   // floor beside the stair well
  main.add(cabWood, boxMM(F2u[1], DECK_Y - 0.05, -CW + 0.08, CW - 0.08, DECK_Y + 0.01, CW - 0.08));
  for (const u of [F2u[0] - 0.02, F2u[1] + 0.02]) fine.add(ironIn, boxMM(u - 0.02, DECK_Y + 0.95, -CW + 0.1, u + 0.02, DECK_Y + 1.0, 0.9));
  // baton clavier along the west wall (its batons go down while the carillon plays: see `clavier`)
  main.add(darkWood, boxMM(-CW + 0.08, DECK_Y, -1.2, -CW + 0.5, DECK_Y + 0.78, 1.2));
  const batonGeo = new THREE.BoxGeometry(0.3, 0.024, 0.024).translate(0.15, 0, 0);
  const clavier = new THREE.InstancedMesh(batonGeo, M.wood, 61); clavier.name = 'campanile-clavier';
  const batonBase = [];
  for (let i = 0; i < 61; i++) { const sharp = [1, 3, 6, 8, 10].includes((i + 7) % 12); const m = new THREE.Matrix4().makeTranslation(-CW + 0.48, DECK_Y + (sharp ? 0.98 : 0.86), -1.17 + i * 0.039); batonBase.push(m); clavier.setMatrixAt(i, m); }
  clavier.castShadow = false; clavier.frustumCulled = false; fg.add(clavier);
  main.add(darkWood, boxMM(-CW + 0.95, DECK_Y, -0.6, -CW + 1.25, DECK_Y + 0.48, 0.6));           // bench
  for (const v of [-1.22, 1.22]) main.add(darkWood, boxMM(-CW + 0.08, DECK_Y, v - 0.03, -CW + 0.82, DECK_Y + 1.15, v + 0.03)); // keyboard cheeks
  main.add(darkWood, boxMM(-CW + 0.08, DECK_Y + 1.05, -1.22, -CW + 0.3, DECK_Y + 1.6, 1.22));          // music desk
  for (let i = 0; i < 26; i++) main.add(cabWood, boxMM(-CW + 0.5, DECK_Y + 0.08, -1.15 + i * 0.09, -CW + 0.95, DECK_Y + 0.14, -1.1 + i * 0.09)); // pedal keys
  // gameplay (frame space): lobby walls as solid rectangles and the floor; the caller converts them with rectPoly
  const lobby = {
    walls: [
      [-HW0 - 0.3, -HW0 - 0.3, -1.25, -LW], [1.25, -HW0 - 0.3, HW0 + 0.3, -LW], [-HW0 - 0.3, LW, HW0 + 0.3, HW0 + 0.3],
      [-HW0 - 0.3, -LW, -LW, LW], [LW, -LW, HW0 + 0.3, LW], [S[0], S[1], S[2], LW], [-3.4, -1.25, -1.93, 1.55], [-LW, 1.8, -2.4, 3.6],
    ],
    floor: [[-LW, -LW, LW, LW], [-1.2, -HW0 - 0.45, 1.2, -LW + 0.01]],
  };
  const doorsAt = (leaves, open) => { for (const m of leaves) m.position.x = m.userData.sx * (0.25 + 0.5 * open); };
  return {
    cab, cabDoors, lobbyDoors, topDoors, pointer, setFloor, clavier, batonBase, lobby,
    setDoors(level, open) { doorsAt(level === 'top' ? topDoors : lobbyDoors, open); for (const m of cabDoors) m.position.x = m.userData.sx * (0.25 + 0.49 * open); },
    path: { F1u: (F1u[0] + F1u[1]) / 2, F1v0, F2v0, LAND, LW, CW },
  };
}
