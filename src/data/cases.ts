export interface CaseItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  year: number;
  description: string;
  tags: string[];
  software: string[];
  focus: string;
  exposure?: number;
  coverExposure?: number;
  lighting?: number;
  roughness?: number;
  metalness?: number;
  envIntensity?: number;
  saturation?: number;
  modelUrl: string;
  coverImage: string;
  hdri?: string;
  contrast?: boolean;
  gallery?: string[];
  carousel?: string[];
  links?: Array<{ label: string; url: string; icon: string }>;
}

const seq = (slug: string, count: number) =>
  Array.from(
    { length: count },
    (_, i) => `/img/gallery/${slug}-seq-${String(i + 1).padStart(2, "0")}.webp`
  );

export const cases: CaseItem[] = [
  {
    id: "01",
    title: "The Maxx",
    slug: "the-maxx",
    category: "Personaje",
    year: 2026,
    description:
      "Escultura de cabeza con enfoque orgánico. Estudio de volúmenes fluidos, transiciones suaves entre masas y presencia escultórica con lectura clara desde cualquier ángulo.",
    tags: ["Personaje", "Escultura", "Busto"],
    software: ["Blender", "ZBrush"],
    focus: "Carácter y detalle",
    coverExposure: 0.6,
    modelUrl: "/models/the-maxx-head.glb",
    coverImage: "/img/cover-the-maxx.png",
    gallery: [
      "/img/gallery/the-maxx-01.webp",
      "/img/gallery/the-maxx-02.webp",
      "/img/gallery/the-maxx-03.webp",
    ],
    links: [
      { label: "Blender", url: "https://www.blender.org/", icon: "bi-box" },
      { label: "ZBrush", url: "https://pixologic.com/", icon: "bi-brush" },
    ],
  },
  {
    id: "02",
    title: "Maxx Render",
    slug: "maxx-render",
    category: "Personaje",
    year: 2026,
    description:
      "Versión render de The Maxx a cuerpo completo. Masas rotundas, silueta reconocible y lectura limpia desde cualquier ángulo, con el modelado optimizado para llevar la pieza del screen a la impresión 3D.",
    tags: ["Personaje", "Render", "Cuerpo completo"],
    software: ["Blender", "ZBrush"],
    focus: "Carácter y volumen",
    modelUrl: "/models/maxx-render.glb",
    coverImage: "/img/cover-maxx-render.png",
    carousel: seq("maxx-render", 16),
    links: [
      { label: "Blender", url: "https://www.blender.org/", icon: "bi-box" },
      { label: "ZBrush", url: "https://pixologic.com/", icon: "bi-brush" },
    ],
  },
  {
    id: "03",
    title: "Zareck",
    slug: "zareck",
    category: "Personaje",
    year: 2026,
    description:
      "Personaje orgánico. Modelado anatómico estilizado y expresivo, pensado para render estático y exploración interactiva en 3D.",
    tags: ["Personaje", "Anatomía", "Estilizado"],
    software: ["Blender", "ZBrush"],
    focus: "Diseño orgánico",
    metalness: 0.25,
    roughness: 0.97,
    envIntensity: 0.38,
    saturation: 0.61,
    modelUrl: "/models/zareck.glb",
    coverImage: "/img/cover-zareck.png",
    carousel: seq("zareck", 16),
    links: [
      { label: "Blender", url: "https://www.blender.org/", icon: "bi-box" },
      { label: "ZBrush", url: "https://pixologic.com/", icon: "bi-brush" },
    ],
  },
  {
    id: "04",
    title: "Mazinger",
    slug: "mazinger",
    category: "Mecha",
    year: 2026,
    description:
      "Mecha con diseño agresivo. Superficies metálicas detalladas, formas geométricas marcadas y armado pensado para exhibición.",
    tags: ["Mecha", "Robot", "Hard Surface"],
    software: ["Blender", "ZBrush"],
    focus: "Volumen y estructura",
    roughness: 0.45,
    metalness: 0.6,
    envIntensity: 0.9,
    saturation: 0.7,
    modelUrl: "/models/mazinger.glb",
    coverImage: "/img/cover-mazinger.png",
    carousel: seq("mazinger", 16),
    links: [
      { label: "Blender", url: "https://www.blender.org/", icon: "bi-box" },
      { label: "ZBrush", url: "https://pixologic.com/", icon: "bi-brush" },
    ],
  },
  {
    id: "05",
    title: "Betty Boop",
    slug: "betty-boop",
    category: "Personaje",
    year: 2026,
    description:
      "Revisión estilizada de un ícono del cartoon. Silueta clara y formas redondeadas, presentada como escena completa lista para orbitar. El archivo original no conserva color por vértice.",
    tags: ["Personaje", "Cartoon", "Escena"],
    software: ["Blender", "ZBrush"],
    focus: "Personaje 3D",
    metalness: 0.0,
    roughness: 0.9995,
    envIntensity: 0.01,
    saturation: 0.62,
    hdri: "/hdri/studio_small_08_1k.hdr",
    contrast: true,
    modelUrl: "/models/betty-boop.glb",
    coverImage: "/img/cover-betty-boop.png",
    carousel: seq("betty", 10),
    links: [
      { label: "Blender", url: "https://www.blender.org/", icon: "bi-box" },
      { label: "ZBrush", url: "https://pixologic.com/", icon: "bi-brush" },
    ],
  },
  {
    id: "06",
    title: "Parka",
    slug: "parka",
    category: "Personaje",
    year: 2026,
    description:
      "Personaje contemporáneo. Diseño de vestuario, texturas y estudio de silueta en escena completa lista para orbitar.",
    tags: ["Personaje", "Vestuario", "Escena"],
    software: ["Blender", "ZBrush"],
    focus: "Vestuario y volumen",
    metalness: 0.0,
    roughness: 0.9995,
    envIntensity: 0.01,
    hdri: "/hdri/studio_small_08_1k.hdr",
    contrast: true,
    modelUrl: "/models/parka.glb",
    coverImage: "/img/cover-parka.png",
    carousel: seq("parka", 10),
    links: [
      { label: "Blender", url: "https://www.blender.org/", icon: "bi-box" },
      { label: "ZBrush", url: "https://pixologic.com/", icon: "bi-brush" },
    ],
  },
  {
    id: "07",
    title: "Starfire",
    slug: "starfire",
    category: "Personaje",
    year: 2026,
    description:
      "Personaje de energía y color. Estudio de proporciones donde el cabello funciona como una masa fluida, integrado en una escena completa lista para orbitar.",
    tags: ["Personaje", "Escena", "Formas Fluidas"],
    software: ["Blender", "ZBrush"],
    focus: "Personaje 3D",
    metalness: 0.0,
    roughness: 0.9995,
    envIntensity: 0.01,
    saturation: 0.62,
    hdri: "/hdri/studio_small_08_1k.hdr",
    contrast: true,
    modelUrl: "/models/starfire.glb",
    coverImage: "/img/cover-starfire.png",
    carousel: seq("starfire", 16),
    links: [
      { label: "Blender", url: "https://www.blender.org/", icon: "bi-box" },
      { label: "ZBrush", url: "https://pixologic.com/", icon: "bi-brush" },
    ],
  },
];
