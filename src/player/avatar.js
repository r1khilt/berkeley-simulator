// Procedural student avatar (faces -z) with walk/run/idle/jump/bike animation, plus a rideable bike.
// r5-avatar: what you SEE is now a skinned, mocap-animated person (avatar-body.js) built from the same people pipeline as the
// NPCs. The procedural figure below stays as an invisible proxy rig (av.p): mode plugins (scooter, hoverboard, horse,
// grapple) keep posing it and the body retargets that pose. ?avatar=old shows the old figure again.
import * as THREE from 'three';
import { PlayerBody, loadPlayerClips, scalePelvis } from './avatar-body.js';
const AV_QS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const SKINNED = AV_QS.get('avatar') !== 'old';
const mats = {};
function mat(hex, rough = 0.8, metal = 0) { const k = hex + ':' + rough + ':' + metal; return mats[k] || (mats[k] = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal })); }
function capsule(r, len, m, seg = 8) { const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 4, seg); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, m); }
function box(w, h, d, m, r = 0) { const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1); return new THREE.Mesh(g, m); }
export const LOOKS = {
  skin: ['#f1c9a5', '#e0ac85', '#c68863', '#9a6440', '#6e4428', '#4a2d1a'],
  hair: ['#1d1611', '#3b2a1e', '#6b4a2b', '#a8753d', '#d8b46a', '#8e3b22', '#bdbdbd'],
  top: ['#003262', '#fdb515', '#0f2d52', '#7a1f2b', '#2d5a3d', '#e9e4da', '#222428', '#c4482e'],
  pants: ['#2b3a52', '#1d1f24', '#6b6255', '#3b4e3a', '#9a8f7a', '#4a3a2e'],
  hairStyle: ['short', 'long', 'bun', 'cap', 'buzz'],
};
const isUnder = (o, top) => { for (let p = o; p; p = p.parent) if (p === top) return true; return false; };
export class Avatar {
  constructor(look = {}) {
    this.look = Object.assign({ skin: 1, hair: 1, top: 0, pants: 0, hairStyle: 0, backpack: true }, look);
    this.root = new THREE.Group(); this.root.name = 'avatar';
    this.build();
    this.phase = 0; this.blend = { walk: 0, run: 0, air: 0, bike: 0 }; this.pedal = 0;
    // r5-avatar: skinned body (async); the proxy figure shows until it is ready
    this.body = null; this._setup = null; this._finSeen = false; this.onBody = null;
    if (SKINNED) this._loadBody().catch((e) => console.warn('player body failed, keeping the procedural avatar', e));
  }
  // r5-avatar: main.js hands over its material setup (CSM shadows, contact AO) for the async body
  set setup(fn) { this._setup = fn; if (fn && this.body) fn(this.body.root); }
  get setup() { return this._setup; }
  async _loadBody() {
    const [{ loadPeopleAssets }, { Character }, life] = await Promise.all([import('../people/assets.js'), import('../people/character.js'), import('../life/people.js')]);
    const [A, extra] = await Promise.all([loadPeopleAssets(), loadPlayerClips()]);
    A.palette = A.palette || { SKIN: life.SKIN, HAIR: life.HAIR, SHOE: life.SHOE };
    this._people = { A, extra, Character, life };
    this._buildBody();
  }
  _buildBody() {
    const { A, extra, Character } = this._people; const sex = this.look.sex === 'f' ? 'f' : 'm';
    if (this.body && this.body.sex === sex) { this._dress(); return; }
    if (this.body) { this.root.remove(this.body.root); this.body = null; }
    const ch = new Character(A, sex, true);
    const k = A.bodies[sex].legLen / (0.4003 + 0.4295); const fitted = {}; for (const [n, c] of Object.entries(extra)) fitted[n] = scalePelvis(c, k);
    this.body = new PlayerBody(ch, fitted); this.body.sex = sex; this.root.add(this.body.root);
    this._dress(); this._showProxy(false);
    if (this._setup) this._setup(this.body.root);
    if (typeof window !== 'undefined' && window.BSIM) window.BSIM.avatarBody = this.body;
    this.onBody && this.onBody(this.body);
  }
  // the player's look as a campus-life crowd look (people/character.js expands it into garments, shoes and hair)
  _dress() {
    const L = this.look, life = this._people.life, c = this.body.c;
    const lin = (hex) => { const col = new THREE.Color(hex); return [col.r, col.g, col.b]; }; // THREE.Color is linear
    const HS = { short: 1, long: 2, bun: 4, cap: 6, buzz: 0 };
    const look = { fem: L.sex === 'f' ? 1 : 0, skin: L.skin | 0, hairC: [0, 1, 2, 3, 4, 6, 5][L.hair | 0] ?? 1, hair: HS[LOOKS.hairStyle[L.hairStyle | 0]] ?? 1,
      top: lin(LOOKS.top[L.top | 0]), bot: lin(LOOKS.pants[L.pants | 0]), shoe: 0, flags: life.FLAG.SLEEVE | life.FLAG.PANTS | (L.backpack ? life.FLAG.BACKPACK : 0), h: 1, w: 1 };
    c.setLook(look, 0, L.seed ?? 0.11);
  }
  _showProxy(on) { this.root.traverse((o) => { if (o.isMesh && !(this.body && isUnder(o, this.body.root))) o.visible = on; }); }
  // r5-avatar: called by the controller after mode plugins have posed the proxy (player.js update)
  finalize(dt, player) {
    this._finSeen = true; if (!this.body) return;
    this.body.update(dt, { mode: player.mode, onGround: player.onGround, airTime: player.airTime, proxy: this.p, avRoot: this.root, player, view: player.view });
  }
  build() {
    const L = this.look; for (const o of [...this.root.children]) if (!(this.body && o === this.body.root)) this.root.remove(o); // r5-avatar: keep the skinned body
    const skin = mat(LOOKS.skin[L.skin]), hair = mat(LOOKS.hair[L.hair], 0.6), top = mat(LOOKS.top[L.top], 0.9), pants = mat(LOOKS.pants[L.pants], 0.9), shoe = mat('#e8e6e0', 0.7), shoeSole = mat('#2a2a2a', 0.9);
    const g = (name, parent, x, y, z) => { const o = new THREE.Group(); o.name = name; o.position.set(x, y, z); parent.add(o); return o; };
    const P = this.p = {};
    P.hips = g('hips', this.root, 0, 0.94, 0);
    const pelvis = box(0.32, 0.16, 0.2, pants); pelvis.position.y = -0.02; P.hips.add(pelvis);
    P.spine = g('spine', P.hips, 0, 0.06, 0);
    const torso = capsule(0.17, 0.52, top, 10); torso.scale.set(1.08, 1, 0.66); torso.position.y = 0.52; P.spine.add(torso);
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.045, 6, 14), top); hood.rotation.x = Math.PI / 2; hood.position.set(0, 0.5, 0.03); P.spine.add(hood);
    P.neck = g('neck', P.spine, 0, 0.52, 0);
    const neck = capsule(0.05, 0.1, skin); neck.position.y = 0.08; P.neck.add(neck);
    P.head = g('head', P.neck, 0, 0.1, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.112, 16, 12), skin); head.scale.set(0.92, 1.05, 1); head.position.y = 0.1; P.head.add(head);
    const eyeM = mat('#1a1a1a', 0.3); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), eyeM); e.position.set(0.038 * s, 0.115, -0.1); P.head.add(e); }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 5), skin); nose.rotation.x = -Math.PI / 2; nose.position.set(0, 0.09, -0.115); P.head.add(nose);
    const hs = LOOKS.hairStyle[L.hairStyle];
    if (hs !== 'buzz') { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hs === 'cap' ? mat('#003262', 0.7) : hair); cap.position.y = 0.115; cap.rotation.x = -0.12; P.head.add(cap); }
    else { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.116, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hair); cap.position.y = 0.11; P.head.add(cap); }
    if (hs === 'long') { const l = box(0.2, 0.26, 0.08, hair); l.position.set(0, 0.02, 0.07); P.head.add(l); }
    if (hs === 'bun') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), hair); b.position.set(0, 0.2, 0.08); P.head.add(b); }
    if (hs === 'cap') { const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.012, 14, 1, false, 0, Math.PI), mat('#003262', 0.7)); brim.rotation.y = Math.PI; brim.position.set(0, 0.14, -0.1); brim.scale.set(1, 1, 1.3); P.head.add(brim);
      const logo = box(0.05, 0.035, 0.005, mat('#fdb515', 0.5)); logo.position.set(0, 0.19, -0.105); P.head.add(logo); }
    for (const s of [-1, 1]) {
      const sh = g('shoulder' + s, P.spine, 0.22 * s, 0.47, 0);
      const ua = capsule(0.055, 0.3, top); sh.add(ua);
      const el = g('elbow' + s, sh, 0, -0.3, 0); const la = capsule(0.045, 0.27, top); el.add(la);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skin); hand.position.y = -0.3; hand.scale.set(0.8, 1.1, 0.6); el.add(hand);
      P['sh' + s] = sh; P['el' + s] = el;
      const hip = g('hip' + s, P.hips, 0.095 * s, -0.04, 0);
      const th = capsule(0.07, 0.45, pants); hip.add(th);
      const kn = g('knee' + s, hip, 0, -0.45, 0); const sn = capsule(0.055, 0.44, pants); kn.add(sn);
      const ft = g('foot' + s, kn, 0, -0.44, 0); const f = box(0.1, 0.07, 0.24, shoe); f.position.set(0, -0.02, -0.06); ft.add(f); const so = box(0.105, 0.025, 0.25, shoeSole); so.position.set(0, -0.06, -0.06); ft.add(so);
      P['hip' + s] = hip; P['kn' + s] = kn; P['ft' + s] = ft;
    }
    if (L.backpack) { const bp = box(0.3, 0.38, 0.14, mat('#2a3440', 0.85)); bp.position.set(0, 0.32, 0.17); P.spine.add(bp); const strap = box(0.32, 0.03, 0.02, mat('#1a1f26')); strap.position.set(0, 0.48, 0.1); P.spine.add(strap); }
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  setLook(l) { Object.assign(this.look, l); this.build(); if (this.body) { this._showProxy(false); this._buildBody(); } }
  // speed m/s, onGround, mode ('walk'|'bike'|'fly'), dt
  animate(dt, speed, onGround, mode) {
    if (this.body && !this._finSeen) this.body.update(dt, { mode, onGround, airTime: onGround ? 0 : 1, proxy: this.p, avRoot: this.root, player: null }); // r5-avatar
    const P = this.p; const t = (k, v) => { this.blend[k] += (v - this.blend[k]) * Math.min(1, dt * 8); };
    t('bike', mode === 'bike' ? 1 : 0); t('air', !onGround && mode !== 'bike' ? 1 : 0);
    const run = Math.min(1, Math.max(0, (speed - 4.5) / 3)); const walk = Math.min(1, speed / 1.5);
    t('walk', walk); t('run', run);
    const freq = 1.6 + speed * 0.28; this.phase += dt * freq * Math.PI * 2 * (mode === 'bike' ? 0 : 1);
    const b = this.blend; const ph = this.phase; const s = Math.sin(ph), c = Math.cos(ph);
    const amp = (0.45 + 0.35 * b.run) * b.walk * (1 - b.air) * (1 - b.bike);
    const idle = Math.sin(performance.now() * 0.0018) * 0.02 * (1 - b.walk);
    P.hips.position.y = 0.94 + Math.abs(s) * 0.05 * b.walk * (1 - b.bike) - 0.03 * b.run - 0.12 * b.bike;
    P.spine.rotation.x = -0.12 * b.run - 0.05 * b.walk + idle - 0.45 * b.bike;
    P.spine.rotation.y = s * 0.12 * b.walk * (1 - b.bike);
    P.head.rotation.x = 0.1 * b.run + 0.35 * b.bike;
    // r4-people: limb x-rotations use the rig's real convention (avatar faces -z, so +x swings a hanging limb
    // FORWARD). The old cycle assumed the opposite, which bent knees and elbows backwards and pointed the
    // bike/jump thighs behind the body. Knees now flex the shin back, elbows flex the forearm forward.
    for (const sd of [-1, 1]) {
      const ss = sd === 1 ? s : -s; const cc = sd === 1 ? c : -c;
      // legs: thigh swings with the phase; the knee flexes during swing (thigh moving forward), ~0 in stance
      let hipX = ss * amp, knee = Math.max(0, cc) * (0.55 + 0.75 * b.run) * b.walk * (1 - b.bike) + 0.06 * b.walk * (1 - b.bike);
      // air pose: knees tucked up (thighs forward, shins back), slightly asymmetric
      hipX = hipX * (1 - b.air) + (0.55 + sd * 0.15) * b.air; knee = knee * (1 - b.air) + 0.95 * b.air;
      // bike pose: hip and knee flex together as the pedal comes over the top
      const pa = this.pedal + (sd === 1 ? 0 : Math.PI);
      const bikeHip = 1.05 + Math.sin(pa) * 0.36, bikeKnee = 1.35 + Math.sin(pa - 0.35) * 0.42;
      P['hip' + sd].rotation.x = hipX * (1 - b.bike) + bikeHip * b.bike;
      P['kn' + sd].rotation.x = -(knee * (1 - b.bike) + bikeKnee * b.bike);
      // foot: partly cancels the shin's tilt so the sole stays near level (toes dip a little in swing)
      P['ft' + sd].rotation.x = knee * 0.45 * (1 - b.bike) + (bikeKnee - bikeHip + 0.05) * 0.8 * b.bike;
      // arms: swing opposite the same-side leg; forward reach on the bike, up/forward in the air
      const armAmp = (0.32 + 0.5 * b.run) * b.walk * (1 - b.bike) * (1 - b.air);
      P['sh' + sd].rotation.x = -ss * armAmp + 0.08 * b.run * (1 - b.bike) + 0.85 * b.bike + 0.35 * b.air;
      P['sh' + sd].rotation.z = sd * (0.08 + 0.4 * b.air) * (1 - b.bike) + sd * 0.12 * b.bike;
      // elbows flex the forearm forward: relaxed in a walk, ~90 degrees when running
      P['el' + sd].rotation.x = (0.22 + 0.12 * b.walk + 1.05 * b.run) * (1 - b.bike) * (1 - b.air) + 0.45 * b.bike + 0.5 * b.air;
    }
  }
}
export class Bike {
  constructor() {
    this.root = new THREE.Group(); this.root.name = 'bike';
    const frame = mat('#003262', 0.4, 0.3), dark = mat('#1b1c1e', 0.6, 0.2), chrome = mat('#b9bdc2', 0.25, 0.9), tire = mat('#141414', 0.9), gold = mat('#fdb515', 0.4, 0.2);
    const tube = (a, b, r, m) => { const d = new THREE.Vector3().subVectors(b, a); const g = new THREE.CylinderGeometry(r, r, d.length(), 8); const me = new THREE.Mesh(g, m); me.position.copy(a).addScaledVector(d, 0.5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); this.root.add(me); return me; };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    // local: forward is -z. wheels at z=+0.52 (rear) and -0.52 (front)
    const R = 0.34;
    this.wheels = [];
    for (const z of [0.52, -0.52]) {
      const w = new THREE.Group(); w.position.set(0, R, z);
      const t = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022, 8, 32), tire); t.rotation.y = Math.PI / 2; w.add(t);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.03, 0.008, 6, 32), chrome); rim.rotation.y = Math.PI / 2; w.add(rim);
      for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 2 * (R - 0.03), 4), chrome); sp.rotation.x = (k / 8) * Math.PI; w.add(sp); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 10), chrome); hub.rotation.z = Math.PI / 2; w.add(hub);
      this.root.add(w); this.wheels.push(w);
    }
    const bb = V(0, 0.3, 0.05), seat = V(0, 0.78, 0.22), head = V(0, 0.8, -0.38), rear = V(0, R, 0.52), front = V(0, R, -0.52);
    tube(bb, seat, 0.018, frame); tube(seat, head, 0.016, frame); tube(bb, head, 0.02, frame);
    tube(bb, rear, 0.012, frame); tube(seat.clone().add(V(0, -0.05, 0)), rear, 0.011, frame);
    tube(head, front, 0.015, chrome); tube(head, head.clone().add(V(0, 0.12, 0.02)), 0.014, chrome);
    tube(V(-0.24, 0.94, -0.36), V(0.24, 0.94, -0.36), 0.012, dark);
    tube(seat, seat.clone().add(V(0, 0.08, 0)), 0.012, chrome);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.26), dark); saddle.position.copy(seat).add(V(0, 0.1, 0.02)); this.root.add(saddle);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.26), mat('#3a3a3a', 0.6, 0.5)); basket.position.set(0, 0.85, -0.62); this.root.add(basket);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.005), gold); plate.position.set(0, 0.86, -0.755); this.root.add(plate);
    this.crank = new THREE.Group(); this.crank.position.copy(bb); this.root.add(this.crank);
    for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.03), chrome); arm.position.set(0.07 * s, s * 0.085, 0); this.crank.add(arm); const ped = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.06), dark); ped.position.set(0.1 * s, s * 0.17, 0); this.crank.add(ped); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 20), chrome); ring.rotation.y = Math.PI / 2; ring.position.x = 0.05; this.crank.add(ring);
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  animate(dist, pedalAngle) { for (const w of this.wheels) w.rotation.x = -dist / 0.34; this.crank.rotation.x = -pedalAngle; }
}
