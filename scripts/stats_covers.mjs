import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const targets = [];
for (const arg of process.argv.slice(2)) {
  if (fs.statSync(arg).isDirectory()) {
    for (const f of fs.readdirSync(arg).filter((x) => x.endsWith(".png"))) targets.push(path.join(arg, f));
  } else targets.push(arg);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setContent("<canvas id=c></canvas>");

async function stats(file) {
  const b64 = fs.readFileSync(file).toString("base64");
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = "data:image/png;base64," + data;
    await img.decode();
    const c = document.getElementById("c");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const lums = [];
    let sat = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 7) {
      const R = d[i], G = d[i + 1], B = d[i + 2];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      if (mx <= 12) continue;
      lums.push(0.2126 * R + 0.7152 * G + 0.0722 * B);
      sat += mx === 0 ? 0 : (mx - mn) / mx;
      n++;
    }
    if (!n) return { n: 0 };
    lums.sort((a, b) => a - b);
    const p = (q) => Math.round(lums[Math.min(lums.length - 1, Math.floor(q * lums.length))]);
    const below = (t) => +((lums.filter((v) => v < t).length / n) * 100).toFixed(1);
    const above = (t) => +((lums.filter((v) => v > t).length / n) * 100).toFixed(1);
    const mean = Math.round(lums.reduce((a, b) => a + b, 0) / n);
    return { n, mean, p05: p(0.05), p50: p(0.5), p95: p(0.95), dark: below(60), mid: above(60) - above(230), bright: above(230), sat: +(sat / n).toFixed(4) };
  }, b64);
}

console.log("file".padEnd(24), "n%   mean  p05  p50  p95 | <60%  >230%  sat");
for (const f of targets) {
  const s = await stats(f);
  if (!s.n) { console.log(path.basename(f).padEnd(24), "sin pixeles"); continue; }
  console.log(
    path.basename(f).replace("cover-", "").replace(".png", "").padEnd(24),
    `${String(s.n).padStart(5)} ${String(s.mean).padStart(5)} ${String(s.p05).padStart(4)} ${String(s.p50).padStart(4)} ${String(s.p95).padStart(4)} | ${String(s.dark).padStart(5)} ${String(s.bright).padStart(6)} ${s.sat}`
  );
}
await browser.close();
