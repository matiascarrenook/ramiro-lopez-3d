import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = process.argv[2] || "public/img";

const slugs = process.argv.length > 3
  ? process.argv.slice(3)
  : ["zareck", "mazinger", "betty-boop", "parka", "starfire"];
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args:
    process.env.GL === "gpu"
      ? ["--no-sandbox", "--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"]
      : ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1500, deviceScaleFactor: 2 });

const gpuInfo = await page.evaluate(() => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  if (!gl) return "SIN WEBGL";
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
});
console.log("GPU:", gpuInfo);

for (const item of slugs) {
  const [slug, modelFile = slug] = item.split(":");
  const url = `${BASE}/?model=/models/${modelFile}.glb${process.env.EXP ? `&exp=${process.env.EXP}` : ""}`;
  const outFile = path.join(OUT, `cover-${slug}.png`);
  process.stdout.write(`cover ${slug} ... `);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => window.__viewerLoaded === true || window.__viewerError === true, {
      timeout: 180000,
      polling: 500,
    });
    const errored = await page.evaluate(() => window.__viewerError === true);
    if (errored) {
      console.log("ERROR loading model");
      continue;
    }
    await new Promise((r) => setTimeout(r, 1200));
    const el = await page.$("#hero-viewer");
    await el.screenshot({ path: outFile });
    const kb = (fs.statSync(outFile).size / 1024).toFixed(0);
    console.log(`ok (${kb} KB)`);
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }
}

await browser.close();
