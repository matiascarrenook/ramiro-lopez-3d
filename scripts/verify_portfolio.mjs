import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.setViewport({ width: 1280, height: 900 });
await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60000 });

const cards = await page.$$eval("#cases-grid article h3", (els) => els.map((e) => e.textContent.trim()));
console.log("cards:", cards.length, JSON.stringify(cards));

const covers = await page.$$eval("#cases-grid article img", (imgs) =>
  imgs.map((i) => ({ src: i.getAttribute("src"), w: i.naturalWidth, complete: i.complete }))
);
covers.forEach((c) => console.log("cover", c.src, "naturalW=" + c.w, c.complete ? "loaded" : "PENDING"));

console.log("console errors:", errors.length);
errors.forEach((e) => console.log("  -", e));

await browser.close();
