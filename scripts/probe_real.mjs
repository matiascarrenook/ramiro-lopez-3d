import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });
await page.goto("http://127.0.0.1:4173/", { waitUntil: "load", timeout: 60000 });
let ok = false;
for (let i = 0; i < 90; i++) {
  const s = await page.evaluate(() => { const v = document.querySelector("#hero-viewer"); return { has: !!v, loaded: v ? v.loaded : false }; });
  if (s.loaded) { ok = true; break; }
  await new Promise((r) => setTimeout(r, 1500));
}
console.log("hero loaded:", ok);
await new Promise((r) => setTimeout(r, 1500));
const info = await page.evaluate(async () => {
  const v = document.querySelector("#hero-viewer");
  if (!v) return { err: "no viewer" };
  let url = v.toDataURL("image/png");
  if (url && typeof url.then === "function") url = await url;
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let n = 0, sum = 0, max = 0, model = 0;
  const cat = { black: 0, orange: 0, indigo: 0, white: 0, other: 0 };
  for (let i = 0; i < d.length; i += 16) {
    const R = d[i], G = d[i + 1], B = d[i + 2];
    n++; sum += R + G + B; max = Math.max(max, R, G, B);
    if (R < 40 && G < 40 && B < 40) continue;
    model++;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    if (mx < 55) cat.black++;
    else if (R > 120 && R - B > 50 && G > 60) cat.orange++;
    else if (B >= R && B - R > 20) cat.indigo++;
    else if (mn > 170) cat.white++;
    else cat.other++;
  }
  const pct = (x) => (model ? Math.round((x / model) * 100) : 0);
  return { w: img.width, h: img.height, model, mean: Math.round(sum / n / 3), max, colors: { black: pct(cat.black), orange: pct(cat.orange), indigo: pct(cat.indigo), white: pct(cat.white), other: pct(cat.other) } };
});
console.log("MODEL-VIEWER render:", JSON.stringify(info));
await browser.close();
