import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text()); });
await page.goto("http://127.0.0.1:4173/", { waitUntil: "load", timeout: 60000 });
await new Promise((r) => setTimeout(r, 12000));
const state = await page.evaluate(() => {
  const c = document.querySelector("#hero-viewer canvas");
  return { hasCanvas: !!c, w: c?.width, h: c?.height };
});
console.log("viewer state:", JSON.stringify(state));
const el = await page.$("#hero-viewer");
if (el) {
  const b64 = await el.screenshot({ encoding: "base64" });
  const info = await page.evaluate(async (data) => {
    const img = new Image(); img.src = "data:image/png;base64," + data; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0, sum = 0, model = 0; const cat = { black: 0, orange: 0, indigo: 0, white: 0, other: 0 };
    for (let i = 0; i < d.length; i += 16) {
      const R = d[i], G = d[i + 1], B = d[i + 2]; n++; sum += R + G + B;
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
    return { w: img.width, h: img.height, model, mean: Math.round(sum / n / 3), colors: { black: pct(cat.black), orange: pct(cat.orange), indigo: pct(cat.indigo), white: pct(cat.white), other: pct(cat.other) } };
  }, b64);
  console.log("THREE render:", JSON.stringify(info));
}
await browser.close();
