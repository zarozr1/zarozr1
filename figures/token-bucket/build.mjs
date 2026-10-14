// Token bucket rate limiter as a ball dispenser. Run: node build.mjs [--light]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";
import { CAPACITY, POCKETS, RATES } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");

const WIDTH = 640;
const HEIGHT = 440;

// ---- world plan (units ≈ 1 mm) ----
const PLATE = { x: -128, y: -50, w: 252, d: 104, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const Y0 = -12; // the line the balls travel along: feeder, magazine, spill cup

const BALL = 4.5;
const RAIL_R = 0.8;
const RAIL_GAP = 3; // rails sit ±3 either side of the ball's path
const SIT = Math.sqrt((BALL + RAIL_R) ** 2 - RAIL_GAP ** 2); // ball centre above rail axis

// magazine (the bucket)
const MX = 0;
const SHOE = { x: MX - 14, y: Y0 - 14, w: 28, d: 28, r: 2.5 };
const CAGE = 8.5; // half width of the cage frames
const POST = 7.4; // corner posts
const FRAME_T = 2;
// chute rail axis height at the magazine, and the ball rolling on it
const CHUTE_END_AXIS = 92;
const ROLL_Z = CHUTE_END_AXIS + SIT;
const TOP_BALL = ROLL_Z - 2 * BALL; // the 8th ball's centre: an arriving ball just grazes it
const SLOT0 = TOP_BALL - (CAPACITY - 1) * 2 * BALL; // bottom ball centre
const SHOE_TOP = SLOT0 - BALL;
const CAGE_BOTTOM = SHOE_TOP + 9;
const CAGE_TOP = CHUTE_END_AXIS - RAIL_R; // top frame top: the rails rest on it
const slotZ = (index) => SLOT0 + index * 2 * BALL;

// feeder
const FX = -86;
const PILLAR_TOP = 74;
const MOTOR = { x: FX - 15, y: Y0 - 12, w: 30, d: 24, r: 2 };
const MOTOR_TOP = 98;
const GEAR_TOP = 108;
const STATOR_TOP = 111;
const ROTOR_TOP = 115;
const ROTOR_R = 24;
const POCKET_R = 15.5;
const POCKET_Z = ROTOR_TOP; // a ball sits half sunk in its pocket
const HOPPER_ANGLE = (225 * Math.PI) / 180;
const HOPPER = [FX + 12.5 * Math.cos(HOPPER_ANGLE), Y0 + 12.5 * Math.sin(HOPPER_ANGLE)];
const HOPPER_R = 8.5;
const HOPPER_TOP = 140;
const SPOUT = [FX + POCKET_R, Y0];
const SPOUT_BOTTOM = 104;
const CHUTE_START = [FX + POCKET_R, SPOUT_BOTTOM - BALL - SIT];
const CHUTE_END_X = MX - CAGE;

// overflow and spill cup
const CUP = [96, Y0];
const CUP_R = 11;
const CUP_TOP = 18;
const SPILL_FROM = [MX + CAGE, CHUTE_END_AXIS - 1.5];
const SPILL_TO = [CUP[0] - CUP_R + 2.5, CUP_TOP + 6];

// output ramp and tray (served requests)
const RAMP_FROM = [Y0 + 14, SHOE_TOP - SIT + 0.2];
const TRAY = [MX, 38];
const TRAY_R = 9;
const TRAY_TOP = 9;
const RAMP_TO = [TRAY[1] - TRAY_R + 2, TRAY_TOP + 2.5];

// request button and the solenoid that works the pusher
const BUTTON = [62, 34];
const SOL = { x: MX - 7, y: Y0 - 30, w: 14, d: 14, r: 2 };
const SOL_Z = SHOE_TOP - 6;

// reject flag: pivot on the shoe's +x face
const FLAG_PIVOT = [SHOE.x + SHOE.w + 0.6, Y0 + 8, SHOE_TOP - 6];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [HOPPER[0], HOPPER[1], HOPPER_TOP + 4], [FX + ROTOR_R, Y0, ROTOR_TOP], [CUP[0] + CUP_R, CUP[1], CUP_TOP]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: Number(process.env.AZ || 55) },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const byDepth = (points) => [...points].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v) => Math.hypot(v[0], v[1], v[2]);
const rod = (a, b, r, style = { tone: "mid" }) => {
  const v = sub(b, a);
  return S(G.disc(0, len(v), r, G.frameAlong(a, v), P, { steps: 20 }), style);
};
const vDisc = (x, y, r, z0, z1, style) => S(k.cylinder(x, y, r, z0, z1 - z0, P, r > 12 ? 64 : 32), style);

// ---- base ----
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the front left
  const rule = { x: -112, y: PLATE.y + PLATE.d - 15, w: 96, d: 7, r: 1 };
  out.push(S(k.slabOf(rule, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(rule.x + 4, rule.x + rule.w - 4, 4, 5, rule.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([rule.x + 2, rule.y + 3.5, 0.6]), at([rule.x + rule.w - 2, rule.y + 3.5, 0.6])], { size: 0.45 }));
  // label plate front right
  const label = { x: 78, y: 22, w: 32, d: 18, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  [[6, 22], [6, 16], [6, 19]].forEach(([from, length], index) => {
    const y = label.y + 5 + index * 4;
    out.push(L(k.lineOnTop([label.x + from, y], [label.x + from + length, y], 0.8, P), { tone: "lo", free: true }));
  });
  out.push(D([at([label.x + 3, label.y + 3, 0.8]), at([label.x + label.w - 3, label.y + label.d - 3, 0.8])], { size: 0.4 }));
  // terminal block at the back, where the motor and solenoid leads land
  const block = { x: -40, y: PLATE.y + 8, w: 22, d: 9, r: 1 };
  out.push(S(k.slabOf(block, 0, 4, P, 3, 0.4), { tone: "mid" }));
  const studs = [-35, -29, -23].map((x) => [x, block.y + 4.5]);
  studs.forEach(([x, y]) => out.push(S(k.cylinder(x, y, 1.4, 4, 1.2, P, 16), { tone: "mid", crease: "none" })));
  out.push(D(studs.map(([x, y]) => at([x, y, 5.2])), { size: 0.45, tone: "hi" }));
  return out.join("");
}

// wires drawn on the base, landing on the terminal studs
function wires() {
  const out = [];
  const stud = (x) => at([x, PLATE.y + 12.5, 5.2]);
  // motor lead: from the motor's back face down the pillar side to the block
  out.push(k.wireSvg(at([FX + 1.5, Y0 - 4.2, PILLAR_TOP]), stud(-35), { via: [at([FX + 1.5, Y0 - 4.6, 3.2]), at([FX + 1.5, Y0 - 9.2, 0]), at([-35, Y0 - 9.2, 0])], tone: "lo", size: 0.9 }));
  // solenoid lead to the block
  out.push(k.wireSvg(at([SOL.x + 3, SOL.y, SOL_Z + 3]), stud(-23), { via: [at([SOL.x + 3, SOL.y - 2, 0]), at([-23, SOL.y - 2, 0])], tone: "lo", size: 0.9 }));
  return out.join("");
}

// ---- feeder: pillar, motor, gearbox, stator, rotor (rebuilt live), hopper ----
function feederLow() {
  const out = [];
  out.push(vDisc(FX, Y0, 9, 0, 3, { tone: "lo" }));
  out.push(D([0, 1, 2, 3].map((i) => at([FX + 7 * Math.cos(i * Math.PI / 2 + 0.6), Y0 + 7 * Math.sin(i * Math.PI / 2 + 0.6), 3])), { size: 0.45 }));
  out.push(S(k.cylinder(FX, Y0, 4.4, 3, PILLAR_TOP - 3, P, 28), { tone: "mid", crease: "none" }));
  out.push(L([24, 50].map((z) => k.sideArc(FX, Y0, 4.4, z, P, 16)).join(""), { tone: "faint" }));
  out.push(S(k.slabOf(MOTOR, PILLAR_TOP, MOTOR_TOP - PILLAR_TOP, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(MOTOR, PILLAR_TOP + 6, P, 4), { tone: "faint" }) }));
  // cooling slots on the motor's +x face (closed slots, no loose ends)
  for (let i = 0; i < 4; i++) {
    const z = PILLAR_TOP + 10 + i * 3;
    const x = MOTOR.x + MOTOR.w + 0.05;
    const slot = [[x, MOTOR.y + 6, z], [x, MOTOR.y + 18, z], [x, MOTOR.y + 18, z + 1.2], [x, MOTOR.y + 6, z + 1.2]].map(at);
    out.push(L(k.pathOf(slot, true), { tone: "lo" }));
  }
  out.push(D([[MOTOR.x + 3, MOTOR.y + 3], [MOTOR.x + MOTOR.w - 3, MOTOR.y + 3], [MOTOR.x + 3, MOTOR.y + MOTOR.d - 3], [MOTOR.x + MOTOR.w - 3, MOTOR.y + MOTOR.d - 3]].map(([x, y]) => at([x, y, MOTOR_TOP])), { size: 0.45 }));
  // rate knob on the motor's front (+y) face
  const knobAt = [FX + 7, MOTOR.y + MOTOR.d, PILLAR_TOP + 12];
  out.push(rod(knobAt, [knobAt[0], knobAt[1] + 1.4, knobAt[2]], 6.2, { tone: "lo" }));
  out.push(rod([knobAt[0], knobAt[1] + 1.4, knobAt[2]], [knobAt[0], knobAt[1] + 5, knobAt[2]], 5, { tone: "mid" }));
  const KF = G.frameAlong([knobAt[0], knobAt[1] + 1.4, knobAt[2]], [0, 1, 0]);
  out.push(L(G.ribsOf(KF, 0.4, 3.2, 5, 30, P, { least: 0.15 }), { tone: "lo" }));
  // rate marks on the face around the knob: one dot per rate step
  const face = (angle, r) => [knobAt[0] + r * Math.sin(angle), knobAt[1] + 0.05, knobAt[2] + r * Math.cos(angle)];
  out.push(D(RATES.map((_, i) => at(face(rateAngle(i), 8))), { size: 0.45, tone: "hi" }));
  // gearbox and stator
  out.push(S(k.cylinder(FX, Y0, 9, MOTOR_TOP, GEAR_TOP - MOTOR_TOP, P, 40, 0.5), { tone: "mid", inner: L(k.sideArc(FX, Y0, 9, MOTOR_TOP + 4, P, 24), { tone: "faint" }) }));
  return out.join("");
}

function rateAngle(index) {
  return -1.6 + (3.2 * index) / (RATES.length - 1);
}

function spout() {
  const out = [];
  out.push(S(k.cylinder(SPOUT[0], SPOUT[1], BALL + 1.4, SPOUT_BOTTOM, STATOR_TOP - 3 - SPOUT_BOTTOM, P, 32), { tone: "mid" }));
  out.push(L(k.sideArc(SPOUT[0], SPOUT[1], BALL + 1.4, SPOUT_BOTTOM + 2, P, 20), { tone: "faint" }));
  return out.join("");
}

function stator() {
  const out = [];
  out.push(S(k.cylinder(FX, Y0, ROTOR_R + 3, STATOR_TOP - 3, 3, P, 72, 0.6), { tone: "mid" }));
  out.push(D(Array.from({ length: 10 }, (_, i) => i * 0.628 + 0.3).filter((a) => Math.cos(a - (38 * Math.PI) / 180) > -0.2).map((a) => at([FX + (ROTOR_R + 1.6) * Math.cos(a), Y0 + (ROTOR_R + 1.6) * Math.sin(a), STATOR_TOP])), { size: 0.45 }));
  return out.join("");
}

function rotorStatic() {
  // the plate itself is round, so turning it changes nothing but its pockets and mark
  const out = [];
  out.push(S(k.cylinder(FX, Y0, ROTOR_R, STATOR_TOP, ROTOR_TOP - STATOR_TOP, P, 72, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(FX, Y0, ROTOR_R - 2.6, ROTOR_TOP, P, 72), { tone: "faint" }));
  return out.join("");
}

function hub() {
  const out = [];
  out.push(S(k.cylinder(FX, Y0, 5, ROTOR_TOP, 2.4, P, 28, 0.4), { tone: "mid" }));
  out.push(D([at([FX, Y0, ROTOR_TOP + 2.4])], { size: 0.6, tone: "hi" }));
  return out.join("");
}

function hopper() {
  const out = [];
  const [x, y] = HOPPER;
  // bracket from the stator rim up to the hopper's clamp band
  const out_ = [FX + (ROTOR_R + 1.6) * Math.cos(HOPPER_ANGLE), Y0 + (ROTOR_R + 1.6) * Math.sin(HOPPER_ANGLE)];
  out.push(S(k.cylinder(out_[0], out_[1], 1.6, STATOR_TOP, 128 - STATOR_TOP, P, 16), { tone: "mid", crease: "none" }));
  out.push(rod([out_[0], out_[1], 125], [x, y, 125], 1.2, { tone: "mid" }));
  out.push(S(k.cylinder(x, y, HOPPER_R - 1.5, ROTOR_TOP + 0.4, 4, P, 40), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, HOPPER_R, ROTOR_TOP + 4.4, HOPPER_TOP - ROTOR_TOP - 4.4, P, 48, 0.6), { tone: "mid", inner: L([ROTOR_TOP + 10, 124, 126, HOPPER_TOP - 6].map((z) => k.sideArc(x, y, HOPPER_R, z, P, 28)).join(""), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, HOPPER_R + 1, HOPPER_TOP, 2, P, 48, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.4, HOPPER_TOP + 2, 2.6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(x, y, 2.4, HOPPER_TOP + 2, HOPPER_TOP + 4.6, 14, P), { tone: "lo" }));
  return out.join("");
}

// ---- chute and rails ----
const chuteA = [CHUTE_START[0], Y0, CHUTE_START[1]];
const chuteB = [CHUTE_END_X, Y0, CHUTE_END_AXIS];
const spillA = [SPILL_FROM[0], Y0, SPILL_FROM[1]];
const spillB = [SPILL_TO[0], Y0, SPILL_TO[1]];
const rampA = [MX, RAMP_FROM[0], RAMP_FROM[1]];
const rampB = [MX, RAMP_TO[0], RAMP_TO[1]];
const offsetBy = (p, d) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]];
const towards = towardSign();
function towardSign() {
  const [vx, vy] = k.towardViewer(P);
  return { y: Math.sign(vy) || 1, x: Math.sign(vx) || 1 };
}
// rails along x: the far rail has the smaller y when the viewer looks from +y
const farY = [0, -RAIL_GAP * towards.y, 0];
const nearY = [0, RAIL_GAP * towards.y, 0];
const farX = [-RAIL_GAP * towards.x, 0, 0];
const nearX = [RAIL_GAP * towards.x, 0, 0];

function chuteSupport() {
  const out = [];
  const x = -44;
  const t = (x - chuteA[0]) / (chuteB[0] - chuteA[0]);
  const z = chuteA[2] + t * (chuteB[2] - chuteA[2]) - RAIL_R;
  out.push(vDisc(x, Y0, 5, 0, 2, { tone: "lo" }));
  out.push(S(k.cylinder(x, Y0, 1.8, 2, z - 3 - 2, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: x - 2, y: Y0 - RAIL_GAP - 2, w: 4, d: 2 * RAIL_GAP + 4, r: 0.8 }, z - 3, 3, P, 3), { tone: "mid" }));
  return out.join("");
}

function spillSupport() {
  const out = [];
  const x = 50;
  const t = (x - spillA[0]) / (spillB[0] - spillA[0]);
  const z = spillA[2] + t * (spillB[2] - spillA[2]) - RAIL_R;
  out.push(vDisc(x, Y0, 5, 0, 2, { tone: "lo" }));
  out.push(S(k.cylinder(x, Y0, 1.8, 2, z - 3 - 2, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf({ x: x - 2, y: Y0 - RAIL_GAP - 2, w: 4, d: 2 * RAIL_GAP + 4, r: 0.8 }, z - 3, 3, P, 3), { tone: "mid" }));
  return out.join("");
}

// ---- magazine ----
function solenoid() {
  const out = [];
  out.push(S(k.slabOf(SOL, 0, SOL_Z - 4, P, 3, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf(k.insetPlan(SOL, -1), SOL_Z - 4, 2, P, 3), { tone: "mid" }));
  const coilA = [MX, SOL.y + 1, SOL_Z + 3];
  out.push(rod(coilA, [MX, SOL.y + SOL.d - 1, SOL_Z + 3], 5.4, { tone: "mid" }));
  const F = G.frameAlong(coilA, [0, 1, 0]);
  out.push(L(G.ribsOf(F, 0.6, SOL.d - 2.6, 5.4, 26, P, { least: 0.2 }), { tone: "faint" }));
  out.push(rod([MX, SOL.y + SOL.d - 1, SOL_Z + 3], [MX, SOL.y + SOL.d + 1, SOL_Z + 3], 3.4, { tone: "mid" }));
  return out.join("");
}

function pusher() {
  // built at rest; the live code slides it along +y
  const a = [MX, SOL.y + SOL.d + 1, SOL_Z + 3];
  const b = [MX, SHOE.y + 5, SOL_Z + 3];
  return rod(a, b, 1.6, { tone: "hi" }) + rod(b, [MX, SHOE.y + 7.5, SOL_Z + 3], 3.2, { tone: "hi" });
}

function shoe() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(SHOE, 0, 1, P)}"/>`);
  out.push(S(k.slabOf(SHOE, 0, SHOE_TOP, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(SHOE, 4, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(SHOE, 2.6), SHOE_TOP, P, 3), { tone: "faint" }));
  out.push(D([[SHOE.x + 2.4, SHOE.y + 2.4], [SHOE.x + SHOE.w - 2.4, SHOE.y + 2.4], [SHOE.x + 2.4, SHOE.y + SHOE.d - 2.4], [SHOE.x + SHOE.w - 2.4, SHOE.y + SHOE.d - 2.4]].map(([x, y]) => at([x, y, SHOE_TOP])), { size: 0.45 }));
  return out.join("");
}

function cheeks(which) {
  // two side cheeks either side of the bottom ball's lane, and the cage foot frame
  const out = [];
  const far = towards.x > 0 ? -1 : 1;
  const side = which === "far" ? far : -far;
  const x0 = side < 0 ? MX - CAGE : MX + CAGE - 3;
  out.push(S(k.slabOf({ x: x0, y: Y0 - CAGE, w: 3, d: 2 * CAGE, r: 0.8 }, SHOE_TOP, CAGE_BOTTOM - SHOE_TOP, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}

// square frame of four bars around the cage, split into far and near halves
function frameBars(z, h, half) {
  const c = CAGE;
  const bars = [
    { x: MX - c, y: Y0 - c, w: 2 * c, d: FRAME_T, r: 0.5, mid: [MX, Y0 - c] },
    { x: MX - c, y: Y0 + c - FRAME_T, w: 2 * c, d: FRAME_T, r: 0.5, mid: [MX, Y0 + c] },
    { x: MX - c, y: Y0 - c, w: FRAME_T, d: 2 * c, r: 0.5, mid: [MX - c, Y0] },
    { x: MX + c - FRAME_T, y: Y0 - c, w: FRAME_T, d: 2 * c, r: 0.5, mid: [MX + c, Y0] },
  ].sort((a, b) => depth(...a.mid) - depth(...b.mid));
  const pick = half === "far" ? bars.slice(0, 2) : bars.slice(2);
  return pick.map((bar) => S(k.slabOf(bar, z, h, P, 2, 0.3), { tone: "mid" })).join("");
}

function posts(half) {
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [MX + sx * POST, Y0 + sy * POST]);
  const sorted = byDepth(corners);
  const pick = half === "far" ? sorted.slice(0, 2) : sorted.slice(2);
  return pick.map(([x, y]) => S(k.cylinder(x, y, 1.1, CAGE_BOTTOM + FRAME_T, CAGE_TOP - FRAME_T - CAGE_BOTTOM - FRAME_T, P, 14), { tone: "mid", crease: "none" })).join("");
}

// capacity scale: a strip standing on the shoe beside the cage, one tick per token
function scale() {
  const out = [];
  const strip = { x: MX - CAGE - 5.2, y: Y0 + 2, w: 5, d: 1.8, r: 0.4 };
  const top = CAGE_TOP - 4;
  out.push(S(k.slabOf(strip, SHOE_TOP, top - SHOE_TOP, P, 2), { tone: "lo" }));
  const fy = strip.y + strip.d;
  const edge = strip.x + strip.w;
  const minor = [], major = [];
  for (let i = 1; i <= CAPACITY; i++) {
    const z = SHOE_TOP + i * 2 * BALL;
    (i % 4 === 0 ? major : minor).push(k.segment([edge, fy, z], [edge - (i % 4 === 0 ? 3.4 : 2), fy, z], P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(D([at([strip.x + strip.w / 2, strip.y + strip.d / 2, top])], { size: 0.4 }));
  return out.join("");
}

// ---- spill cup and tray ----
function cup(x, y, r, top, tone = "mid") {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: x - r, y: y - r, w: 2 * r, d: 2 * r, r }, 0, 1, P)}"/>`);
  out.push(S(k.cylinder(x, y, r, 0, top, P, 56, 0.6), { tone, inner: L(k.sideArc(x, y, r, 3, P, 32), { tone: "faint" }) }));
  // the opening: a dark well inside the rim
  out.push(`<path class="tb-well" d="${k.onTop(k.circleRing(x, y, r - 1.4, 56), top, P, true)}"/>`);
  out.push(L(k.ring(x, y, r - 1.4, top, P, 56), { tone: "lo" }));
  return out.join("");
}

// ---- request button ----
function button() {
  const out = [];
  const [x, y] = BUTTON;
  const plan = { x: x - 9, y: y - 7, w: 18, d: 14, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, 0, 1, P)}"/>`);
  out.push(S(k.slabOf(plan, 0, 5, P, 4, 0.6), { tone: "mid" }));
  out.push(D([[plan.x + 2.4, plan.y + 2.4], [plan.x + plan.w - 2.4, plan.y + plan.d - 2.4]].map(([px, py]) => at([px, py, 5])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 5.2, 5, 1.2, P, 32), { tone: "lo" }));
  return out.join("");
}

function buttonCap() {
  const [x, y] = BUTTON;
  return S(k.cylinder(x, y, 4, 6.2, 2.6, P, 32, 0.4), { tone: "hi" });
}

function buttonWire() {
  // from the button's back face, along the plate, to the solenoid's side
  const [x, y] = BUTTON;
  return k.wireSvg(at([x - 4, y - 7, 2.5]), at([SOL.x + SOL.w, SOL.y + 7, 3]), { via: [at([x - 4, y - 9, 0]), at([x - 4, SOL.y + 7, 0]), at([SOL.x + SOL.w + 2, SOL.y + 7, 0])], tone: "lo", size: 0.9 });
}

// reject flag pivot boss
function flagBoss() {
  const [x, y, z] = FLAG_PIVOT;
  return rod([SHOE.x + SHOE.w, y, z], [x + 0.8, y, z], 2.2, { tone: "mid" });
}

// ---- ball: one sphere drawn at the origin and moved ----
const ballSvg = S(G.sphereOf([0, 0, 0], BALL, P, { steps: 40 }), { tone: "hi" });
const POOL = 36;
const pool = Array.from({ length: POOL }, (_, i) => `<g data-ball="${i}" style="display:none">${ballSvg}</g>`).join("");

const layer = (name) => `<g data-slot="${name}"></g>`;

const body = [
  base(),
  wires(),
  feederLow(),
  // the chute's far rail, its balls, its near rail, then the spout that hides a ball as it drops out
  rod(offsetBy(chuteA, farY), offsetBy(chuteB, farY), RAIL_R),
  layer("chute"),
  rod(offsetBy(chuteA, nearY), offsetBy(chuteB, nearY), RAIL_R),
  chuteSupport(),
  spout(),
  stator(),
  rotorStatic(),
  `<path data-part="pockets" class="iso-line" data-tone="lo" d=""/>`,
  `<path data-part="mark" class="iso-line" data-tone="mid" d=""/>`,
  layer("under-hopper"),
  hopper(),
  layer("pockets"),
  hub(),
  // magazine
  solenoid(),
  `<g data-part="pusher">${pusher()}</g>`,
  shoe(),
  scale(),
  cheeks("far"),
  frameBars(CAGE_BOTTOM, FRAME_T, "far"),
  posts("far"),
  frameBars(57, 1.4, "far"),
  frameBars(CAGE_TOP - FRAME_T, FRAME_T, "far"),
  layer("magazine"),
  cheeks("near"),
  frameBars(CAGE_BOTTOM, FRAME_T, "near"),
  posts("near"),
  frameBars(57, 1.4, "near"),
  frameBars(CAGE_TOP - FRAME_T, FRAME_T, "near"),
  layer("air"),
  flagBoss(),
  `<g data-part="flag"><path class="iso-fill" d=""/><path class="iso-top" d=""/><path class="iso-line iso-edge" data-tone="mid" d=""/></g>`,
  // spill: rails, support, cup
  rod(offsetBy(spillA, farY), offsetBy(spillB, farY), RAIL_R),
  layer("spill"),
  rod(offsetBy(spillA, nearY), offsetBy(spillB, nearY), RAIL_R),
  spillSupport(),
  cup(CUP[0], CUP[1], CUP_R, CUP_TOP),
  layer("cup"),
  // output ramp and tray
  rod(offsetBy(rampA, farX), offsetBy(rampB, farX), RAIL_R),
  layer("ramp"),
  rod(offsetBy(rampA, nearX), offsetBy(rampB, nearX), RAIL_R),
  cup(TRAY[0], TRAY[1], TRAY_R, TRAY_TOP),
  layer("tray"),
  buttonWire(),
  button(),
  `<g data-part="cap">${buttonCap()}</g>`,
  `<path data-part="knob" class="iso-line" data-tone="hi" d="" style="stroke-width:1"/>`,
  `<defs>${pool}</defs>`,
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A token bucket rate limiter built as a ball dispenser. A motor turns a pocket plate under a hopper, dropping one ball down a chute into an upright magazine at the refill rate. The magazine holds eight balls; a ball that arrives when it is full rolls over the top and off into a spill cup. Each request fires a solenoid that pushes the bottom ball out to a tray; when the magazine is empty a red flag rises instead and the request is refused.",
  body,
});

const CSS = `
.tb-well { fill: var(--anatomy-paper); stroke: none; }
.iso[data-theme="dark"] .tb-well { fill: color-mix(in srgb, var(--anatomy-paper) 70%, black); }
.iso[data-theme="light"] .tb-well { fill: color-mix(in srgb, var(--anatomy-paper) 88%, black); }
.tb-stage { touch-action: pan-y; cursor: pointer; user-select: none; -webkit-user-select: none; outline: none; }
.tb-stage:focus-visible { outline: 1px solid var(--anatomy-muted); outline-offset: 6px; }
.tb-stage svg { display: block; width: 100%; height: auto; }
[data-part="flag"] .iso-fill { fill: var(--tb-flag); }
[data-part="flag"] .iso-top { fill: var(--tb-flag-top); }
.iso { --tb-flag: #c8473d; --tb-flag-top: #e0675c; }
.iso[data-theme="light"] { --tb-flag: #d5524a; --tb-flag-top: #ea7d74; }
`;

const consts = {
  P, BALL, SIT, Y0, MX, FX, CAGE, CAPACITY, POCKETS, RATES, SLOT0, ROLL_Z, CAGE_TOP, SHOE_TOP, ROTOR_R, POCKET_R, POCKET_Z, ROTOR_TOP,
  HOPPER_ANGLE, SPOUT, SPOUT_BOTTOM, chuteA, chuteB, spillA, spillB, rampA, rampB, CUP, CUP_TOP, TRAY, TRAY_TOP, FLAG_PIVOT, BUTTON,
  KNOB: [FX + 7, MOTOR.y + MOTOR.d + 5, PILLAR_TOP + 12], RATE_ANGLES: RATES.map((_, i) => rateAngle(i)), PUSH: 9.5,
};
const live = `const C = ${JSON.stringify(consts)};\n` + strip("model.mjs") + "\n" + strip("live.js");

const page = k.plateHtml({
  fig: "Fig 1",
  title: "Token bucket",
  hint: "Click to send requests · ↑ ↓ refill rate",
  readout: "4 / 8 tokens · refill 1.5/s",
  keys: [
    { mark: "lit", label: "Tokens waiting in the bucket, one ball each" },
    { mark: "raised", label: "Pocket plate: one ball per tick of the refill rate" },
    { mark: "red", label: "Flag: a request refused because the bucket was empty" },
  ],
  caption:
    "A token bucket holds up to 8 tokens and gains them at a fixed refill rate; a token that arrives when the bucket is full is lost. Every request spends one token, so a burst of up to 8 passes at once, and after that requests pass only as fast as the refill rate. Click once for a request, hold for a burst.",
  body: `<div class="iso-stage tb-stage" tabindex="0" role="group" aria-label="Token bucket. Click, Space or Enter sends a request; hold to send a burst. Up and Down arrows change the refill rate.">${svg}</div><div class="tb-live" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></div>`,
});

const html = k.pageHtml({ title: "Token bucket rate limiter", theme, body: page, script: strip("kit/iso-kit.mjs") + "\n" + live, width: 700 }).replace("</style>", CSS + "</style>");
const name = theme === "light" ? "token-bucket-light.html" : "token-bucket.html";
writeFileSync(join(HERE, name), html);
console.log("wrote", name);
