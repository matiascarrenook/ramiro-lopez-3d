import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "C:\\Users\\matias\\Downloads\\carrucel";
const DEST = process.argv[2] || "public/img/gallery";

const map = {
  "Carrusel betty": "betty",
  "Carrusel mazinger": "mazinger",
  "Carrusel parka": "parka",
  "Carrusel starffire": "starfire",
  "Carrusel zareck": "zareck",
};

fs.mkdirSync(DEST, { recursive: true });

for (const [folder, slug] of Object.entries(map)) {
  const dir = path.join(SRC, folder);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .sort();
  let i = 0;
  for (const f of files) {
    i++;
    const out = path.join(DEST, `${slug}-seq-${String(i).padStart(2, "0")}.webp`);
    await sharp(path.join(dir, f))
      .resize(1280, null, { withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(out);
  }
  console.log(`${slug}: ${i} frames -> ${DEST}`);
}

// Renombrar la secuencia existente de "The Maxx" a "maxx-render"
for (let i = 1; i <= 16; i++) {
  const from = path.join(DEST, `the-maxx-seq-${String(i).padStart(2, "0")}.webp`);
  const to = path.join(DEST, `maxx-render-seq-${String(i).padStart(2, "0")}.webp`);
  if (fs.existsSync(from)) fs.renameSync(from, to);
}
console.log("maxx-render-seq renombrado");
