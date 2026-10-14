// Live code for the token bucket figure. Inlined after the kit and model.mjs; C holds build constants.
const P = C.P;
const TAU = Math.PI * 2;
const PITCH = TAU / C.POCKETS;
const G_ACC = 520; // world units / s², slowed gravity so a drop is easy to follow
const stage = document.querySelector(".tb-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const announce = document.querySelector(".tb-live");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const slot = (name) => svg.querySelector(`[data-slot="${name}"]`);
const pocketsPath = svg.querySelector('[data-part="pockets"]');
const markPath = svg.querySelector('[data-part="mark"]');
const pusher = svg.querySelector('[data-part="pusher"]');
const cap = svg.querySelector('[data-part="cap"]');
const knob = svg.querySelector('[data-part="knob"]');
const flag = svg.querySelector('[data-part="flag"]');
const [flagFill, , flagEdge] = flag.children;
flag.children[1].remove();

const state = bucketOf(1.5, 4);
let rateIndex = C.RATES.indexOf(1.5);
let turns = 0; // pockets the plate has turned through, in total
let refills = 0;
const pool = [...svg.querySelectorAll("[data-ball]")];
const free = pool.slice(C.POCKETS);
const pocketBalls = pool.slice(0, C.POCKETS);
const moving = [];
const stack = []; // balls in the magazine, bottom first
let push = { at: 0, t: 1 };
let press = { t: 1 };
let flagUp = { at: 0, rate: 0, hold: 0 };

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const onRail = (a, b, t) => { const p = lerp(a, b, t); p[2] += C.SIT; return p; };
const slotZ = (index) => C.SLOT0 + index * 2 * C.BALL;
const railLength = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const CHUTE_LEN = railLength(C.chuteA, C.chuteB);
const SPILL_LEN = railLength(C.spillA, C.spillB);
const RAMP_LEN = railLength(C.rampA, C.rampB);

function place(ball, point, opacity = 1) {
  ball.el.setAttribute("transform", translateAlong(P, point));
  const o = opacity >= 0.999 ? "" : opacity.toFixed(2);
  if (ball.el.style.opacity !== o) ball.el.style.opacity = o;
}
function moveTo(ball, name, first = false) {
  if (ball.slot === name) return;
  ball.slot = name;
  const target = slot(name);
  if (first) target.insertBefore(ball.el, target.firstChild); else target.appendChild(ball.el);
}
function lit(ball, on) {
  const solid = ball.el.firstElementChild;
  if (on) solid.setAttribute("data-lit", ""); else solid.removeAttribute("data-lit");
}
function spawn(phase, extra) {
  const el = free.pop();
  if (!el) return null;
  el.style.display = "";
  const ball = { el, phase, t: 0, v: 0, slot: null, ...extra };
  moving.push(ball);
  return ball;
}
function retire(ball) {
  ball.el.style.display = "none";
  ball.el.style.opacity = "";
  lit(ball, false);
  svg.querySelector("defs").appendChild(ball.el);
  free.push(ball.el);
  moving.splice(moving.indexOf(ball), 1);
}

// seed the magazine with the starting tokens
for (let i = 0; i < state.tokens; i++) {
  const ball = spawn("stack", { z: slotZ(i), vz: 0 });
  stack.push(ball);
  lit(ball, true);
  moveTo(ball, "magazine");
  place(ball, [C.MX, C.Y0, ball.z]);
}

// ---- the pocket plate ----
const pocketAngle = (i) => (((i * PITCH - turns * PITCH) % TAU) + TAU) % TAU;
const pocketPoint = (angle, r = C.POCKET_R) => [C.FX + r * Math.cos(angle), C.Y0 + r * Math.sin(angle)];
let lastOrder = "";
function drawPlate() {
  const rings = [];
  for (let i = 0; i < C.POCKETS; i++) {
    const [x, y] = pocketPoint(pocketAngle(i));
    rings.push(ring(x, y, C.BALL + 0.5, C.ROTOR_TOP, P, 20));
  }
  pocketsPath.setAttribute("d", rings.join(""));
  const markAngle = pocketAngle(0) + PITCH / 2;
  markPath.setAttribute("d", lineOnTop(pocketPoint(markAngle, C.ROTOR_R - 4.6), pocketPoint(markAngle, C.ROTOR_R - 0.6), C.ROTOR_TOP, P));
  const shown = [];
  pocketBalls.forEach((el, i) => {
    const angle = pocketAngle(i);
    const full = angle > 0.02 && angle <= C.HOPPER_ANGLE + 0.001;
    el.style.display = full ? "" : "none";
    if (!full) return;
    const [x, y] = pocketPoint(angle);
    el.setAttribute("transform", translateAlong(P, [x, y, C.POCKET_Z]));
    const under = angle > C.HOPPER_ANGLE - 0.95;
    shown.push({ el, under, d: depthOf([x, y, 0], P) });
  });
  const order = shown.sort((a, b) => a.d - b.d).map((b) => (b.under ? "u" : "p") + pocketBalls.indexOf(b.el)).join();
  if (order !== lastOrder) {
    lastOrder = order;
    for (const b of shown) slot(b.under ? "under-hopper" : "pockets").appendChild(b.el);
  }
}

// ---- requests ----
function sendRequest() {
  press.t = 0;
  if (request(state)) {
    const ball = stack.shift();
    stack.forEach((b, index) => (b.index = index));
    ball.phase = "out";
    ball.t = 0;
    ball.from = ball.z;
    push.t = 0;
    lit(ball, false);
  } else {
    flagUp.hold = 0.9;
  }
  say();
}

// ---- motion of every loose ball ----
function step(ball, dt, calm) {
  switch (ball.phase) {
    case "drop": {
      // falls out of the pocket, through the plate and the spout, onto the chute
      ball.vz += G_ACC * dt;
      ball.z -= ball.vz * dt;
      const floor = C.chuteA[2] + C.SIT;
      if (ball.z <= floor || calm) { ball.z = floor; ball.phase = "chute"; ball.t = 0; ball.v = ball.vz * 0.15; }
      place(ball, [C.SPOUT[0], C.Y0, ball.z]);
      break;
    }
    case "chute": {
      ball.v += G_ACC * 0.5 * dt; // rolling down a gentle slope, slowed for reading
      ball.v = Math.min(ball.v, 95);
      ball.t += (ball.v * dt) / CHUTE_LEN;
      if (calm) ball.t = 1;
      if (ball.t >= 1) {
        ball.t = 1;
        if (arrive(state)) {
          ball.phase = "fall";
          ball.index = stack.length;
          stack.push(ball);
          ball.x = C.chuteB[0];
          ball.z = C.ROLL_Z;
          ball.vz = 0;
          ball.vx = ball.v;
          moveTo(ball, "air");
          lit(ball, true);
        } else {
          ball.phase = "over";
          ball.x = C.chuteB[0];
          moveTo(ball, "air");
        }
        say();
      }
      if (ball.phase === "chute") place(ball, onRail(C.chuteA, C.chuteB, ball.t));
      break;
    }
    case "over": {
      // rolls across the top ball and onto the spill rails
      ball.x += ball.v * dt;
      if (ball.x >= C.spillA[0] || calm) { ball.phase = "spill"; ball.t = 0; moveTo(ball, "spill"); }
      else place(ball, [ball.x, C.Y0, C.ROLL_Z]);
      if (ball.phase !== "spill") break;
    }
    // falls through
    case "spill": {
      ball.v += G_ACC * 0.6 * dt;
      ball.t += (ball.v * dt) / SPILL_LEN;
      if (ball.t >= 1 || calm) { ball.phase = "sink"; ball.z = C.spillB[2] + C.SIT; ball.vz = 0; moveTo(ball, "cup"); }
      else { place(ball, onRail(C.spillA, C.spillB, ball.t)); break; }
    }
    // falls through
    case "sink": {
      ball.vz += G_ACC * dt;
      ball.z -= ball.vz * dt;
      const x = C.CUP[0] - 1.5;
      const fade = Math.max(0, Math.min(1, (ball.z - (C.CUP_TOP - 2 * C.BALL)) / (2 * C.BALL)));
      if (fade <= 0 || calm) { retire(ball); break; }
      place(ball, [x, C.Y0, ball.z], fade);
      break;
    }
    case "fall":
    case "stack": {
      // in the magazine: carried over the opening, then down to its slot
      if (ball.phase === "fall") {
        ball.x = Math.min(C.MX, ball.x + ball.vx * dt);
        if (ball.z - C.BALL < C.ROLL_Z - C.BALL - 0.5) moveTo(ball, "magazine");
      }
      const target = slotZ(ball.index);
      if (calm) { ball.z = target; ball.vz = 0; ball.x = C.MX; }
      if (ball.z > target + 0.01) {
        ball.vz += G_ACC * dt;
        ball.z = Math.max(target, ball.z - ball.vz * dt);
        if (ball.z === target) ball.vz = 0;
      }
      if (ball.phase === "fall" && ball.x >= C.MX && ball.z === target) ball.phase = "stack";
      place(ball, [ball.phase === "fall" ? ball.x : C.MX, C.Y0, ball.z]);
      // keep magazine children bottom first so higher balls paint over lower ones
      break;
    }
    case "out": {
      // pushed out of the shoe along +y, then down the ramp into the tray
      ball.t += dt / 0.16;
      if (calm) ball.t = 1;
      const y = C.Y0 + (C.rampA[1] - C.Y0) * Math.min(1, ball.t);
      if (y > C.Y0 + C.CAGE + C.BALL) moveTo(ball, "ramp");
      if (ball.t >= 1) { ball.phase = "ramp"; ball.t = 0; ball.v = 30; moveTo(ball, "ramp"); }
      else { place(ball, [C.MX, y, ball.from + (C.rampA[2] + C.SIT - ball.from) * Math.min(1, ball.t)]); break; }
    }
    // falls through
    case "ramp": {
      ball.v += G_ACC * 0.5 * dt;
      ball.t += (ball.v * dt) / RAMP_LEN;
      if (ball.t >= 1 || calm) { ball.phase = "tray"; ball.z = C.rampB[2] + C.SIT; ball.vz = 0; moveTo(ball, "tray"); }
      else { place(ball, onRail(C.rampA, C.rampB, ball.t)); break; }
    }
    // falls through
    case "tray": {
      ball.vz += G_ACC * dt;
      ball.z -= ball.vz * dt;
      const fade = Math.max(0, Math.min(1, (ball.z - (C.TRAY_TOP - 2 * C.BALL)) / (2 * C.BALL)));
      if (fade <= 0 || calm) { retire(ball); break; }
      place(ball, [C.TRAY[0], C.TRAY[1] - 1.5, ball.z], fade);
      break;
    }
  }
}

function sortMagazine() {
  const host = slot("magazine");
  const want = stack.filter((b) => b.slot === "magazine");
  const now = [...host.children];
  if (want.length === now.length && want.every((b, i) => b.el === now[i])) return;
  want.forEach((b) => host.appendChild(b.el));
}

// ---- the flag, the pusher, the button and the knob ----
function drawFlag() {
  const phi = flagUp.at * Math.PI / 2;
  const dir = [0, -Math.cos(phi), Math.sin(phi)];
  const nor = [0, Math.sin(phi), Math.cos(phi)];
  const [px, py, pz] = C.FLAG_PIVOT;
  const pt = (s, t) => iso([px, py + dir[1] * s + nor[1] * t, pz + dir[2] * s + nor[2] * t], P);
  const outline = pathOf([pt(-1.2, -0.7), pt(14, -0.7), pt(14, 5.4), pt(8, 5.4), pt(8, 0.7), pt(-1.2, 0.7)], true);
  flagFill.setAttribute("d", outline);
  flagEdge.setAttribute("d", outline);
}
function drawKnob(angle) {
  const [x, y, z] = C.KNOB;
  knob.setAttribute("d", segment([x, y, z], [x + 4.2 * Math.sin(angle), y, z + 4.2 * Math.cos(angle)], P));
}
let knobAngle = C.RATE_ANGLES[rateIndex];

function say() {
  const text = `${state.tokens}/${C.CAPACITY} tokens · ${state.rate}/s · ${state.passed} passed · ${state.refused} refused`;
  if (readout.textContent !== text) readout.textContent = text;
}
function setRate(index) {
  rateIndex = Math.max(0, Math.min(C.RATES.length - 1, index));
  state.rate = C.RATES[rateIndex];
  announce.textContent = `Refill rate ${state.rate} tokens per second`;
  say();
}

// ---- tour: a burst that empties the bucket, then a steady trickle ----
const TOUR = [];
for (let i = 0; i < 10; i++) TOUR.push(3.2 + i * 0.14); // a burst of 10 against a full-ish bucket
for (let i = 0; i < 6; i++) TOUR.push(6.4 + i * 0.9); // a steady trickle near the refill rate
const TOUR_LENGTH = 12.5;
let touring = !still.matches, clock = 0, tourNext = 0, idleTimer = 0;
let holding = false, holdClock = 0;

let frame = 0, last = 0, visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  // refill: the plate turns one pocket per token
  const dropped = refill(state, dt);
  refills += dropped;
  turns = refills + state.phase;
  for (let i = 0; i < dropped; i++) {
    const ball = spawn("drop", { z: C.POCKET_Z, vz: 0 });
    if (ball) { moveTo(ball, "chute"); place(ball, [C.SPOUT[0], C.Y0, ball.z]); }
  }
  if (touring) {
    clock += dt;
    if (clock >= TOUR_LENGTH) { clock -= TOUR_LENGTH; tourNext = 0; }
    while (tourNext < TOUR.length && clock >= TOUR[tourNext]) { tourNext++; sendRequest(); }
  }
  if (holding) {
    holdClock += dt;
    while (holdClock >= 0.14) { holdClock -= 0.14; sendRequest(); }
  }
  drawPlate();
  for (const ball of [...moving]) step(ball, dt, calm);
  sortMagazine();
  // pusher: out and back
  push.t = Math.min(1, push.t + dt / 0.2);
  const stroke = Math.sin(Math.PI * push.t) * C.PUSH;
  pusher.setAttribute("transform", translateAlong(P, [0, stroke, 0]));
  press.t = Math.min(1, press.t + dt / 0.18);
  cap.setAttribute("transform", translateAlong(P, [0, 0, -1.6 * Math.sin(Math.PI * press.t)]));
  // flag: a spring toward up while held, then back down
  flagUp.hold = Math.max(0, flagUp.hold - dt);
  const want = flagUp.hold > 0 ? 1 : 0;
  if (calm) { flagUp.at = want; flagUp.rate = 0; }
  else for (let i = 0; i < 4; i++) { flagUp.rate += ((want - flagUp.at) * 260 - flagUp.rate * 22) * dt / 4; flagUp.at += flagUp.rate * dt / 4; }
  drawFlag();
  const targetAngle = C.RATE_ANGLES[rateIndex];
  knobAngle = calm ? targetAngle : knobAngle + (targetAngle - knobAngle) * (1 - Math.exp(-dt / 0.2));
  drawKnob(knobAngle);
  say();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);

const pauseTour = () => {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; tourNext = 0; }, 3600);
};
stage.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  pauseTour();
  stage.setPointerCapture(event.pointerId);
  sendRequest();
  holding = true;
  holdClock = -0.25; // a short pause before a held press turns into a burst
});
const release = () => { holding = false; pauseTour(); };
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (event) => {
  let handled = true;
  if (event.key === " " || event.key === "Enter") { sendRequest(); }
  else if (event.key === "ArrowUp" || event.key === "ArrowRight") setRate(rateIndex + 1);
  else if (event.key === "ArrowDown" || event.key === "ArrowLeft") setRate(rateIndex - 1);
  else if (event.key === "Home") setRate(0);
  else if (event.key === "End") setRate(C.RATES.length - 1);
  else handled = false;
  if (handled) { event.preventDefault(); pauseTour(); }
});
still.addEventListener?.("change", () => { if (still.matches) touring = false; });
drawPlate();
drawFlag();
drawKnob(knobAngle);
say();
