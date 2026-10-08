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
  const W = 150, H = 78;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const lines = [];
  for (let y = 0; y < H; y++) {
    let line = "";
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const R = d[i], G = d[i + 1], B = d[i + 2];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      let ch = " ";
      if (R < 35 && G < 35 && B < 35) ch = "@";
      else if (mn > 205 && mx - mn < 22) ch = "W";
      else if (B >= R && B > G && B - R > 18) ch = "i";
      else if (R > 105 && R - B > 45 && G > 45) ch = "o";
      else if (mx - mn < 26) ch = ".";
      else ch = "?";
      line += ch;
    }
    lines.push(line);
  }
  return lines.join("\n");
}, b64);
console.log("legend: @=black W=white i=indigo o=orange .=gray(bg) ?=other");
console.log(result);
await browser.close();
