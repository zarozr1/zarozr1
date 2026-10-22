// The token bucket the figure animates. Pure: no DOM, no time source.
// One ball is one token. The pocket plate meters them in at RATE per second
// (one pocket per token), the magazine holds at most CAPACITY, and a ball that
// arrives at a full magazine rolls off into the spill cup. Each request takes
// one ball if there is one, and is refused if there is none.

export const CAPACITY = 8;
export const POCKETS = 8;
export const RATES = [0.5, 1, 1.5, 2, 3, 4];

export function bucketOf(rate = 1.5, tokens = 4) {
  return { rate, tokens, phase: 0, passed: 0, refused: 0, spilled: 0 };
}

// Advance the refill. Returns how many balls left the plate in this step.
export function refill(state, dt) {
  state.phase += state.rate * dt;
  const whole = Math.floor(state.phase);
  state.phase -= whole;
  return whole;
}

// A ball reaches the top of the magazine: it becomes a token, or spills.
export function arrive(state) {
  if (state.tokens < CAPACITY) {
    state.tokens += 1;
    return true;
  }
  state.spilled += 1;
  return false;
}

// A request asks for one token.
export function request(state) {
  if (state.tokens >= 1) {
    state.tokens -= 1;
    state.passed += 1;
    return true;
  }
  state.refused += 1;
  return false;
}
