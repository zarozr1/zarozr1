// Usage: node render.js preview  -> stills at key times
//        node render.js full     -> pipes all frames to ffmpeg (silent video)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { spawn } = require('child_process');
const path = require('path');

const FPS = 25, DUR = 65.5;
const mode = process.argv[2] || 'preview';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'scenes.html'));
  await page.evaluate(() => document.fonts.ready);

  const draw = async (t) => {
    await page.evaluate((t) => window.render(t), t);
    // wait for the background frame image to decode
    await page.evaluate(() => {
      const img = document.getElementById('shot');
      return img.style.display === 'none' || img.complete ? null : img.decode().catch(() => {});
    });
  };

  if (mode === 'preview') {
    const times = [2.5, 7.5, 15, 24.5, 36.5, 43.5, 51, 57.5, 63.5];
    for (const t of times) {
      await draw(t);
      await page.screenshot({ path: path.join(__dirname, 'preview', `t${t}.jpg`), type: 'jpeg', quality: 80 });
    }
  } else {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', path.join(__dirname, 'video_silent.mp4')],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const total = Math.round(DUR * FPS);
    for (let i = 0; i < total; i++) {
      await draw(i / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 250 === 0) console.log(`frame ${i}/${total}`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
  }
  await browser.close();
})();
