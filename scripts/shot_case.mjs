import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const SLUG = process.argv[2] || "mazinger";
const OUT = process.argv[3] || "case_shot.png";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args:
    process.env.GL === "gpu"
      ? ["--no-sandbox", "--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"]
      : ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
await page.goto(`${BASE}/?model=/models/${SLUG}.glb`, { waitUntil: "domcontentloaded", timeout: 60000 });

// clic en la tarjeta con ese título
const clicked = await page.evaluate((slug) => {
  const titles = [...document.querySelectorAll("#cases-grid article h3")];
  const el = titles.find((h) => h.textContent.trim().toLowerCase() === slug);
  if (!el) return false;
  el.closest("article").click();
  return true;
}, SLUG.toLowerCase());

if (!clicked) {
  console.log("card not found");
  await browser.close();
  process.exit(1);
}

await page.waitForFunction(
  () => window.__caseLoaded === true || window.__caseError === true,
  { timeout: 300000, polling: 500 }
);
const err = await page.evaluate(() => window.__caseError === true);
if (err) console.log("case viewer ERROR");

await new Promise((r) => setTimeout(r, 1500));

const el = await page.$("#case-viewer");
await el.screenshot({ path: OUT });

const heroShot = OUT.replace(/cover-mazinger|\.png$/g, "").replace(/\.png$/, "").trim();
const OUT_HERO = OUT.replace(/\.png$/, "") + "_hero.png";
const heroEl = await page.$("#hero-viewer");
if (heroEl) await heroEl.screenshot({ path: OUT_HERO });

const info = await page.evaluate(() => ({
  caseExp: document.getElementById("case-viewer")?.dataset.exposure,
  caseLight: document.getElementById("case-viewer")?.dataset.lighting,
  heroExp: document.getElementById("hero-viewer")?.dataset.exposure,
}));
console.log("MODAL exposure =", info.caseExp, "| lighting =", info.caseLight, "| HERO exposure =", info.heroExp);
console.log("shot ->", OUT, fs.statSync(OUT).size, "bytes");
if (fs.existsSync(OUT_HERO)) console.log("shot ->", OUT_HERO, fs.statSync(OUT_HERO).size, "bytes");

await browser.close();