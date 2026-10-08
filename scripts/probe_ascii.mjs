import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.goto("http://127.0.0.1:4173/", { waitUntil: "load", timeout: 60000 });
await new Promise((r) => setTimeout(r, 9000));
await page.evaluate(() => {
  const st = document.createElement("style");
  st.textContent = "#hero-viewer canvas, #hero-viewer { background:#808080 !important; }";
  document.head.appendChild(st);
});
await new Promise((r) => setTimeout(r, 1200));
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
      const R = d[i], G = d[i + 1], B = d[i + 2];
      const mn = Math.min(R, G, B), lum = (R + G + B) / 3;
      const isBg = Math.abs(R - 128) < 22 && Math.abs(G - 128) < 22 && Math.abs(B - 128) < 22;
      let ch = " ";
      if (isBg) ch = " ";
      else if (lum < 45) ch = "#";
      else if (mn > 150) ch = "W";
      else if (B >= R && B - R > 18) ch = "i";
      else if (R > 110 && R - B > 45 && G > 55) ch = "o";
      else ch = "-";
      grid[y][x] = ch;
    }
  }
  return grid.map((row) => row.join("")).join("\n");
}, b64);
console.log("=== OUR VIEWER (hero, GRAY bg) ===");
console.log("legend: #=dark/black i=indigo o=orange W=white -=gray-obj/bg");
console.log(ascii);
await browser.close();
