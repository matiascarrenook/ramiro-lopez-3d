import fs from "node:fs";
import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const path = process.argv[2];
const b64 = fs.readFileSync(path).toString("base64");
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setContent("<canvas id='c'></canvas>");
const result = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const W = 110, H = 55;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const lines = [];
  let n = 0, sum = 0;
  const cat = { black: 0, orange: 0, indigo: 0, white: 0, gray: 0, other: 0 };
  for (let y = 0; y < H; y++) {
    let line = "";
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const R = d[i], G = d[i + 1], B = d[i + 2];
      n++; sum += R + G + B;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      let ch = " ";
      if (R < 40 && G < 40 && B < 40) { ch = " "; cat.black++; }
      else if (mn > 200 && mx - mn < 25) { ch = "W"; cat.white++; }
      else if (B >= R && B > G && B - R > 20) { ch = "i"; cat.indigo++; }
      else if (R > 110 && R - B > 50 && G > 50) { ch = "o"; cat.orange++; }
      else if (mx - mn < 30) { ch = "."; cat.gray++; }
      else { ch = "?"; cat.other++; }
      line += ch;
    }
    lines.push(line);
  }
  return { lines: lines.join("\n"), mean: Math.round(sum / n / 3), cat, w: img.width, h: img.height };
}, b64);
console.log("image size:", result.w, "x", result.h, " mean:", result.mean);
console.log("counts:", JSON.stringify(result.cat));
console.log("legend: W=white i=indigo/bluish o=orange .=gray space=black ?=other");
console.log(result.lines);
await browser.close();
