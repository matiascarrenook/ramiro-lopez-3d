import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const [, , src, out, hide] = process.argv;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
await page.setViewport({ width: 640, height: 640, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
const url = `http://127.0.0.1:4173/_view.html?src=${encodeURIComponent(src)}&hide=${encodeURIComponent(hide || "")}`;
await page.goto(url, { waitUntil: "load", timeout: 60000 });
let done = false;
for (let i = 0; i < 150; i++) {
  const s = await page.evaluate(() => ({ d: window.__done, e: window.__err }));
  if (s.e) { console.log("LOAD ERR:", s.e); break; }
  if (s.d) { done = true; break; }
  await new Promise((r) => setTimeout(r, 2000));
}
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: out });
console.log("saved", out, "done=" + done);
await browser.close();
