import puppeteer from "puppeteer-core";
import fs from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const SLUG = process.argv[2] || "mazinger";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
page.on("console", (m) => {
  const t = m.text();
  if (/shader|glsl|error|program|uniform/i.test(t)) console.log("[console]", t.slice(0, 500));
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 500)));
await page.goto(`${BASE}/?model=/models/${SLUG}.glb`, { waitUntil: "domcontentloaded", timeout: 120000 });
const ok = await page.waitForFunction(
  () => window.__viewerLoaded === true || window.__viewerError === true,
  { timeout: 300000, polling: 500 }
).then(() => true).catch(() => false);
console.log("hero loaded:", ok, "| error:", await page.evaluate(() => window.__viewerError === true));
await new Promise((r) => setTimeout(r, 4000));
await browser.close();