import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const widths = [320, 360, 390, 414, 768, 1024, 1440];
for (const w of widths) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 800, deviceScaleFactor: 1 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const res = await page.evaluate(() => {
    const vw = window.innerWidth;
    const de = document.documentElement;
    const over = [];
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > vw + 1 || r.left < -1) {
        over.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || "").slice(0, 55), l: Math.round(r.left), r: Math.round(r.right) });
      }
    });
    return { vw, scrollW: de.scrollWidth, bodyScrollW: document.body.scrollWidth, over: over.slice(0, 12) };
  });
  console.log(`--- width ${w}: scrollW=${res.scrollW} body=${res.bodyScrollW}`);
  for (const o of res.over) console.log(`   OVERFLOW ${o.tag}.${o.cls} [${o.l},${o.r}]`);
  if (errs.length) console.log("   errors: " + errs.join(" | "));
  await page.close();
}
await browser.close();
