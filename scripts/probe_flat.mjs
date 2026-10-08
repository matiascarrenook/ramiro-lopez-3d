import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.goto("http://127.0.0.1:4173/", { waitUntil: "load", timeout: 60000 });
await new Promise((r) => setTimeout(r, 9000));
const info = await page.evaluate(() => {
  const c = document.querySelector("#hero-viewer");
  const m = c && c.__model;
  if (!m) return { ok: false };
  let n = 0;
  m.traverse((o) => {
    if (o.isMesh && o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mt of mats) { mt.vertexColors = false; if (mt.color) mt.color.set(0xcccccc); mt.needsUpdate = true; }
      n++;
    }
  });
  return { ok: true, meshes: n };
});
console.log("flat-material applied:", JSON.stringify(info));
await new Promise((r) => setTimeout(r, 1500));
const el = await page.$("#hero-viewer");
const b64 = await el.screenshot({ encoding: "base64" });
const ascii = await page.evaluate(async (data) => {
  const img = new Image(); img.src = "data:image/png;base64," + data; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const W = 100, H = 50;
  const grid = Array.from({ length: H }, () => new Array(W).fill(" "));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = Math.floor((x / W) * c.width), sy = Math.floor((y / H) * c.height);
      const i = (sy * c.width + sx) * 4;
      const R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3];
      const lum = (R + G + B) / 3;
      let ch = " ";
      if (A < 20) ch = " ";
      else if (lum > 120) ch = "#";
      else if (lum > 55) ch = "+";
      else if (lum > 25) ch = ".";
      else ch = " ";
      grid[y][x] = ch;
    }
  }
  return grid.map((row) => row.join("")).join("\n");
}, b64);
console.log("=== OUR VIEWER flat gray material (silhouette) ===");
console.log(ascii);
await browser.close();
