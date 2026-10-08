import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const dirA = process.argv[2];
const dirB = process.argv[3];

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
    let r = 0, g = 0, bl = 0, sat = 0, lum = 0, n = 0;
    let mr = 0, mg = 0, mb = 0, msat = 0, mlum = 0, mn = 0;
    for (let i = 0; i < d.length; i += 4 * 7) {
      const R = d[i], G = d[i + 1], B = d[i + 2];
      r += R; g += G; bl += B; n++;
      const mx = Math.max(R, G, B), mn2 = Math.min(R, G, B);
      sat += mx === 0 ? 0 : (mx - mn2) / mx;
      lum += 0.2126 * R + 0.7152 * G + 0.0722 * B;
      if (mx > 12) {
        mr += R; mg += G; mb += B; mn++;
        msat += (mx - mn2) / mx;
        mlum += 0.2126 * R + 0.7152 * G + 0.0722 * B;
      }
    }
    return {
      w: img.width, h: img.height,
      r: +(r / n).toFixed(1), g: +(g / n).toFixed(1), b: +(bl / n).toFixed(1),
      sat: +(sat / n).toFixed(4), lum: +(lum / n).toFixed(1),
      // solo píxeles del modelo (cubertura aislada)
      mr: +(mr / mn).toFixed(1), mg: +(mg / mn).toFixed(1), mb: +(mb / mn).toFixed(1),
      msat: +(msat / mn).toFixed(4), mlum: +(mlum / mn).toFixed(1), cover: +(mn / n * 100).toFixed(1),
    };
  }, b64);
}

const files = fs.readdirSync(dirA).filter((f) => f.endsWith(".png"));
console.log("file".padEnd(26), "BEFORE lum/sat/rgb".padEnd(30), "AFTER lum/sat/rgb");
for (const f of files) {
  const a = await stats(path.join(dirA, f));
  const bPath = path.join(dirB, f);
  if (!fs.existsSync(bPath)) {
    console.log(f.padEnd(26), `${a.lum}/${a.sat}`.padEnd(30), "missing");
    continue;
  }
  const b = await stats(bPath);
  console.log(
    f.replace("cover-", "").replace(".png", "").padEnd(26),
    `${a.mlum}/${a.msat}/${a.mr},${a.mg},${a.mb}/${a.cover}%`.padEnd(34),
    `${b.mlum}/${b.msat}/${b.mr},${b.mg},${b.mb}/${b.cover}%`
  );
}
await browser.close();