import puppeteer from "puppeteer-core";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });

for (const w of [390, 768, 1280]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 820, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 800));

  const base = await page.evaluate(() => {
    const grid = document.getElementById("cases-grid");
    const cs = getComputedStyle(grid);
    const cols = cs.gridTemplateColumns.split(" ").filter(Boolean).length;
    const card = grid.querySelector("article");
    const thumb = card?.querySelector(".thumb-brutal");
    const tr = thumb?.getBoundingClientRect();
    const cr = card?.getBoundingClientRect();
    const logo = document.querySelector("header img");
    const lr = logo?.getBoundingClientRect();
    const btn = document.querySelector("header .btn-brutal");
    const br = btn?.getBoundingClientRect();
    return {
      cols,
      cardW: Math.round(cr?.width || 0),
      thumb: tr ? `${Math.round(tr.width)}x${Math.round(tr.height)}` : "none",
      logoW: Math.round(lr?.width || 0),
      headerBtn: br ? `${Math.round(br.width)}x${Math.round(br.height)}` : "none",
      headerRight: br ? Math.round(br.right) : 0,
    };
  });
  console.log(`[${w}] cols=${base.cols} card=${base.cardW} thumb=${base.thumb} logo=${base.logoW} headerBtn=${base.headerBtn} right=${base.headerRight}`);

  // open modal
  await page.evaluate(() => document.querySelector("#cases-grid article")?.click());
  await new Promise((r) => setTimeout(r, 800));
  const mod = await page.evaluate(() => {
    const dlg = document.getElementById("case-modal");
    const viewer = document.getElementById("case-viewer");
    const panel = document.getElementById("info-panel");
    const vr = viewer?.getBoundingClientRect();
    const pr = panel?.getBoundingClientRect();
    return {
      open: dlg.open,
      scrollW: dlg.scrollWidth,
      vw: window.innerWidth,
      viewerH: Math.round(vr?.height || 0),
      panelH: Math.round(pr?.height || 0),
    };
  });
  console.log(`      modal open=${mod.open} scrollW=${mod.scrollW}/${mod.vw} viewerH=${mod.viewerH} panelH=${mod.panelH}`);
  await page.close();
}
await browser.close();
