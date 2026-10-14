# Token bucket figure

An interactive isometric figure that explains a token bucket rate limiter as a ball dispenser.

- A motor turns a pocket plate under a hopper. One ball (one token) drops down the chute per tick of the refill rate.
- The upright magazine is the bucket. It holds 8 balls. A ball that arrives when it is full rolls over the top into the spill cup.
- Each request fires a solenoid that pushes the bottom ball out to the tray. When the magazine is empty, the red flag rises and the request is refused.

Open `token-bucket.html` (dark) or `token-bucket-light.html` (light) in a browser. Click to send a request, hold for a burst, and use the arrow keys to change the refill rate.

To rebuild after editing `build.mjs`, `live.js` or `model.mjs`:

```sh
node build.mjs
node build.mjs --light
```

`model.mjs` is the token bucket itself and drives every number and motion on the page. The drawing kit in `kit/` is copied from the MIT-licensed Anatomy skill (see `kit/LICENSE`).
