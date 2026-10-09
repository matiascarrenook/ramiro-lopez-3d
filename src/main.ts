import "./styles.css";
import { cases, type CaseItem } from "./data/cases";
import { createViewer, type ViewerHandle } from "./viewer";

const asset = (p?: string) =>
  !p ? "" : /^(https?:)?\/\//.test(p) ? p : import.meta.env.BASE_URL.replace(/\/$/, "") + "/" + p.replace(/^\//, "");

const casesGrid = document.getElementById("cases-grid") as HTMLDivElement;
const yearEl = document.getElementById("year") as HTMLSpanElement;

const caseModal = document.getElementById("case-modal") as HTMLDialogElement;
const closeModalBtn = document.getElementById("close-modal") as HTMLButtonElement;
const closeModalBottomBtn = document.getElementById("close-modal-bottom") as HTMLButtonElement;
const toggleInfoBtn = document.getElementById("toggle-info") as HTMLButtonElement;
const infoPanel = document.getElementById("info-panel") as HTMLElement;
const prevCaseBtn = document.getElementById("prev-case") as HTMLButtonElement;
const nextCaseBtn = document.getElementById("next-case") as HTMLButtonElement;

const modalTitle = document.getElementById("modal-title") as HTMLHeadingElement;
const modalTags = document.getElementById("modal-tags") as HTMLParagraphElement;
const modalDescription = document.getElementById("modal-description") as HTMLParagraphElement;
const modalYear = document.getElementById("modal-year") as HTMLElement;
const modalSoftware = document.getElementById("modal-software") as HTMLElement;
const modalFocus = document.getElementById("modal-focus") as HTMLElement;

const gallerySection = document.getElementById("gallery-section") as HTMLDivElement;
const galleryGrid = document.getElementById("gallery-grid") as HTMLDivElement;
const galleryCount = document.getElementById("gallery-count") as HTMLSpanElement;

const linksSection = document.getElementById("links-section") as HTMLDivElement;
const linksList = document.getElementById("links-list") as HTMLDivElement;

const caseContainer = document.getElementById("case-viewer") as HTMLDivElement | null;
const casePlaceholder = document.getElementById("case-placeholder") as HTMLDivElement;

const heroContainer = document.getElementById("hero-viewer") as HTMLDivElement | null;
const heroPlaceholder = document.getElementById("hero-placeholder") as HTMLDivElement;
const heroProgress = document.getElementById("hero-progress") as HTMLDivElement | null;
const heroProgressText = document.getElementById("hero-progress-text") as HTMLSpanElement | null;
const caseProgress = document.getElementById("case-progress") as HTMLDivElement | null;
const caseProgressText = document.getElementById("case-progress-text") as HTMLSpanElement | null;

const mobileCarousel = document.getElementById("mobile-carousel") as HTMLDivElement | null;
const carouselImg = document.getElementById("carousel-img") as HTMLImageElement | null;
const carouselPrev = document.getElementById("carousel-prev") as HTMLButtonElement | null;
const carouselNext = document.getElementById("carousel-next") as HTMLButtonElement | null;
const carouselDots = document.getElementById("carousel-dots") as HTMLDivElement | null;

function setProgress(bar: HTMLDivElement | null, textEl: HTMLSpanElement | null, ratio: number) {
  if (!bar) return;
  const pct = Math.min(100, Math.round(ratio * 100));
  bar.style.width = pct + "%";
  if (textEl) textEl.textContent = `${pct}%`;
}

let heroViewer: ViewerHandle | null = null;
let caseViewer: ViewerHandle | null = null;

let currentCaseIndex = 0;
let infoOpen = true;

const MAXX_SEQ = Array.from({ length: 16 }, (_, i) => `/img/gallery/the-maxx-seq-${String(i + 1).padStart(2, "0")}.webp`);
let carouselIdx = 0;
let carouselTimer: number | null = null;

yearEl.textContent = new Date().getFullYear().toString();

function getIconClass(icon?: string) {
  switch (icon) {
    case "artstation":
      return "bi bi-box-arrow-up-right";
    case "behance":
      return "bi bi-box-arrow-up-right";
    case "instagram":
      return "bi bi-instagram";
    case "sketchfab":
      return "bi bi-box-arrow-up-right";
    case "website":
      return "bi bi-globe2";
    default:
      return "bi bi-link-45deg";
  }
}

function renderCases() {
  casesGrid.innerHTML = "";

  cases.forEach((c, index) => {
    const card = document.createElement("article");
    card.className = "case-brutal group";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Abrir ${c.title}`);

    card.innerHTML = `
      <div class="thumb-brutal aspect-[4/5]">
        <img
          src="${asset(c.coverImage)}"
          alt="${c.title}"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div class="mt-5 flex flex-col gap-2 sm:mt-6">
        <div class="flex flex-wrap items-center gap-2">
          ${c.tags
            .slice(0, 3)
            .map(
              (t) =>
                `<span class="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-white/70">${t}</span>`
            )
            .join("")}
        </div>
        <div class="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 class="font-display text-balance text-2xl tracking-tight sm:text-3xl">
              ${c.title}
            </h3>
            <p class="mt-1 text-sm text-white/60">${c.category} · ${c.year}</p>
          </div>
          <div class="mt-2 flex items-center gap-2 text-sm text-white/80 sm:mt-0">
            Ver caso
            <i class="bi bi-arrow-right transition-transform group-hover:translate-x-0.5"></i>
          </div>
        </div>
      </div>
    `;

    const open = () => openCase(index);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });

    // Precarga bajo interacción: al pasar el mouse o tocar, el modelo queda en caché.
    let preloaded = false;
    const prefetch = () => {
      if (preloaded) return;
      preloaded = true;
      try {
        fetch(asset(c.modelUrl), { mode: "cors", priority: "low" }).catch(() => (preloaded = false));
      } catch {}
    };
    card.addEventListener("mouseenter", prefetch, { once: true });
    card.addEventListener("touchstart", prefetch, { once: true });
    card.addEventListener("focusin", prefetch, { once: true });

    casesGrid.appendChild(card);
  });
}

function hideHeroPlaceholder() {
  if (!heroPlaceholder) return;
  heroPlaceholder.classList.add("opacity-0", "pointer-events-none", "transition-opacity", "duration-500");
  setTimeout(() => heroPlaceholder?.remove(), 600);
}

function setHeroModel() {
  const heroCase = cases.find((c) => (c as any).hero) || cases[0];
  if (!heroContainer) return;

  const override = new URLSearchParams(location.search).get("model");
  const url = override || heroCase?.modelUrl;
  if (!url) return;

  if (override) document.body.classList.add("shot-mode");

  const sourceCase = (override ? cases.find((c) => c.modelUrl === override) : undefined) ?? heroCase;
  const COVER_EXPOSURE = 0.5;
  // ?exp= permite barrer exposiciones de portada sin recompilar
  const expParam = Number(new URLSearchParams(location.search).get("exp"));
  const coverExposure = override
    ? expParam > 0
      ? expParam
      : (sourceCase?.coverExposure ?? COVER_EXPOSURE)
    : sourceCase?.exposure;

  heroViewer = createViewer(heroContainer, {
    autoRotate: !override,
    exposure: coverExposure,
    lighting: sourceCase?.lighting,
    roughness: sourceCase?.roughness,
    metalness: sourceCase?.metalness,
    envIntensity: sourceCase?.envIntensity,
    saturation: sourceCase?.saturation,
  });
  heroContainer.addEventListener("viewer-loaded", hideHeroPlaceholder, { once: true });
  heroContainer.addEventListener("viewer-error", hideHeroPlaceholder, { once: true });
  heroContainer.addEventListener("viewer-progress", ((e: Event) => {
    setProgress(heroProgress, heroProgressText, (e as CustomEvent).detail ?? 0);
  }) as EventListener);
  heroContainer.addEventListener("viewer-loaded", () => { (window as any).__viewerLoaded = true; }, { once: true });
  heroContainer.addEventListener("viewer-error", () => { (window as any).__viewerError = true; }, { once: true });
  heroViewer.load(url, coverExposure, sourceCase?.lighting, sourceCase?.roughness, sourceCase?.metalness, sourceCase?.envIntensity, sourceCase?.saturation, sourceCase?.hdri, sourceCase?.contrast);
}

function openCase(index: number) {
  currentCaseIndex = index;
  const c = cases[currentCaseIndex];
  if (!c) return;

  // Rellenar info
  modalTitle.textContent = c.title;
  modalTags.textContent = [...c.tags, c.category].join(" · ");
  modalDescription.textContent = c.description;
  modalYear.textContent = c.year.toString();
  modalSoftware.textContent = c.software.join(" · ");
  modalFocus.textContent = c.focus || "Diseño orgánico";

  // Galería
  if (c.gallery && c.gallery.length > 0) {
    gallerySection.classList.remove("hidden");
    galleryCount.textContent = `${c.gallery.length} imagen${c.gallery.length === 1 ? "" : "es"}`;
    galleryGrid.innerHTML = "";

    c.gallery.forEach((img: any) => {
      const item =
        typeof img === "string"
          ? { src: img, thumbnail: img, alt: c.title }
          : img && typeof img === "object"
            ? {
                src: img.src || img.full || img.thumbnail || "",
                thumbnail: img.thumbnail || img.src || img.full || "",
                alt: img.alt ?? c.title,
              }
            : { src: "", thumbnail: "", alt: c.title };
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-brutal group overflow-hidden";
      const thumbSrc = asset(item.thumbnail || item.src);
      const fullSrc = asset(item.src || item.thumbnail);
      btn.innerHTML = `
        <img
          src="${thumbSrc}"
          alt="${item.alt ?? c.title}"
          loading="lazy"
          decoding="async"
          class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div class="absolute inset-0 bg-bg/20 group-hover:bg-bg/10 transition-colors"></div>
        <div class="absolute bottom-1 right-1 rounded-full bg-bg/90 border border-white/15 px-1.5 py-0.5 text-[10px] backdrop-blur">
          <i class="bi bi-arrows-fullscreen"></i>
        </div>
      `;
      btn.addEventListener("click", () => {
        if (fullSrc) window.open(fullSrc, "_blank", "noopener,noreferrer");
      });
      galleryGrid.appendChild(btn);
    });
  } else {
    gallerySection.classList.add("hidden");
    galleryGrid.innerHTML = "";
  }

  // Enlaces
  if (c.links && c.links.length > 0) {
    linksSection.classList.remove("hidden");
    linksList.innerHTML = "";

    c.links.forEach((l: any) => {
      const a = document.createElement("a");
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className =
        "group inline-flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm backdrop-blur transition-colors hover:bg-white/10 focus-ring";
      a.innerHTML = `
        <span class="flex items-center gap-2">
          <i class="${getIconClass(l.icon)} text-primary"></i>
          ${l.label}
        </span>
        <i class="bi bi-arrow-up-right opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"></i>
      `;
      linksList.appendChild(a);
    });
  } else {
    linksSection.classList.add("hidden");
    linksList.innerHTML = "";
  }

  // Mostrar placeholder mientras carga el modelo
  casePlaceholder.style.display = "grid";
  casePlaceholder.classList.remove("opacity-0", "pointer-events-none");
  setProgress(caseProgress, caseProgressText, 0);

  // Navegación
  prevCaseBtn.disabled = currentCaseIndex === 0;
  nextCaseBtn.disabled = currentCaseIndex === cases.length - 1;

  // Abrir modal antes de cargar, para que el contenedor ya tenga tamaño
  if (!caseModal.open) {
    caseModal.showModal();
    document.body.style.overflow = "hidden";
  }

  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches;

  // Carousel for mobile - The Maxx
  if (mobileCarousel) mobileCarousel.classList.add("hidden");
  if (carouselTimer !== null) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }

  if (isMobileUA && c.title === "The Maxx") {
    if (mobileCarousel) {
      mobileCarousel.classList.remove("hidden");
      caseContainer?.style.setProperty("display", "none");
      casePlaceholder.style.display = "none";
    }
    carouselIdx = 0;
    if (carouselDots) {
      carouselDots.innerHTML = "";
      MAXX_SEQ.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.className = "h-1.5 w-1.5 rounded-full border border-white/40 " + (i === 0 ? "bg-white" : "bg-white/30");
        dot.setAttribute("aria-label", `Frame ${i + 1}`);
        dot.addEventListener("click", () => {
          carouselIdx = i;
          updateCarousel();
          if (carouselTimer !== null) {
            clearInterval(carouselTimer);
            carouselTimer = null;
          }
        });
        carouselDots.appendChild(dot);
      });
    }
    const updateCarousel = () => {
      if (!carouselImg) return;
      carouselImg.src = asset(MAXX_SEQ[carouselIdx]);
      if (carouselDots) {
        Array.from(carouselDots.children).forEach((d, i) => {
          (d as HTMLElement).className = "h-1.5 w-1.5 rounded-full border border-white/40 " + (i === carouselIdx ? "bg-white" : "bg-white/30");
        });
      }
    };
    updateCarousel();
    if (carouselPrev) {
      carouselPrev.onclick = () => {
        carouselIdx = (carouselIdx - 1 + MAXX_SEQ.length) % MAXX_SEQ.length;
        updateCarousel();
        if (carouselTimer !== null) {
          clearInterval(carouselTimer);
          carouselTimer = null;
        }
      };
    }
    if (carouselNext) {
      carouselNext.onclick = () => {
        carouselIdx = (carouselIdx + 1) % MAXX_SEQ.length;
        updateCarousel();
        if (carouselTimer !== null) {
          clearInterval(carouselTimer);
          carouselTimer = null;
        }
      };
    }
    carouselTimer = window.setInterval(() => {
      carouselIdx = (carouselIdx + 1) % MAXX_SEQ.length;
      updateCarousel();
    }, 180);
    return;
  }

  if (caseContainer) caseContainer.style.removeProperty("display");
  if (!caseViewer && caseContainer) {
    caseViewer = createViewer(caseContainer, { autoRotate: !isMobileUA, autoRotateSpeed: isMobileUA ? 0.6 : 1.2, exposure: c.exposure, lighting: c.lighting, roughness: c.roughness, metalness: c.metalness, envIntensity: c.envIntensity, saturation: c.saturation });
    caseContainer.addEventListener("viewer-loaded", handleCaseLoad);
    caseContainer.addEventListener("viewer-error", handleCaseError);
  }
  caseContainer?.addEventListener("viewer-progress", caseOnProgress);
  caseViewer?.load(c.modelUrl, c.exposure, c.lighting, c.roughness, c.metalness, c.envIntensity, c.saturation, c.hdri, c.contrast);
}

function handleCaseLoad() {
  (window as any).__caseLoaded = true;
  casePlaceholder.classList.add("opacity-0", "pointer-events-none", "transition-opacity", "duration-500");
  setTimeout(() => {
    casePlaceholder.style.display = "none";
  }, 600);
}

function caseOnProgress(e: Event) {
  setProgress(caseProgress, caseProgressText, (e as CustomEvent).detail ?? 0);
}

function handleCaseError() {
  casePlaceholder.classList.add("opacity-0", "pointer-events-none", "transition-opacity", "duration-500");
  setTimeout(() => {
    casePlaceholder.style.display = "none";
  }, 600);
}

function closeCase() {
  if (caseModal.open) {
    caseModal.close();
  }
  document.body.style.overflow = "";
  // Reset placeholder visible para próxima apertura
  casePlaceholder.style.display = "grid";
  casePlaceholder.classList.remove("opacity-0", "pointer-events-none");
}

function toggleInfo() {
  infoOpen = !infoOpen;
  infoPanel.style.display = infoOpen ? "" : "none";
  toggleInfoBtn.setAttribute("aria-expanded", String(infoOpen));
  toggleInfoBtn.innerHTML = infoOpen
    ? `<i class="bi bi-info-circle"></i><span class="hidden sm:inline">Info</span>`
    : `<i class="bi bi-info-circle"></i><span class="hidden sm:inline">Mostrar info</span>`;
}

function prevCase() {
  if (currentCaseIndex > 0) {
    openCase(currentCaseIndex - 1);
  }
}

function nextCase() {
  if (currentCaseIndex < cases.length - 1) {
    openCase(currentCaseIndex + 1);
  }
}

// Eventos
closeModalBtn?.addEventListener("click", closeCase);
closeModalBottomBtn?.addEventListener("click", closeCase);
toggleInfoBtn?.addEventListener("click", toggleInfo);
prevCaseBtn?.addEventListener("click", prevCase);
nextCaseBtn?.addEventListener("click", nextCase);

caseModal?.addEventListener("click", (e) => {
  const dialogDimensions = caseModal.getBoundingClientRect();
  if (
    (e as MouseEvent).clientX < dialogDimensions.left ||
    (e as MouseEvent).clientX > dialogDimensions.right ||
    (e as MouseEvent).clientY < dialogDimensions.top ||
    (e as MouseEvent).clientY > dialogDimensions.bottom
  ) {
    closeCase();
  }
});

caseModal.addEventListener("close", () => {
  document.body.style.overflow = "";
});

document.addEventListener("keydown", (e) => {
  if (!caseModal.open) return;
  if (e.key === "Escape") {
    closeCase();
  }
  if (e.key === "ArrowLeft") {
    prevCase();
  }
  if (e.key === "ArrowRight") {
    nextCase();
  }
  if (e.key === "i" || e.key === "I") {
    toggleInfo();
  }
});

// Init
renderCases();
setHeroModel();

// Precarga solo bajo interacción (hover/touch) para no pesar la carga inicial.
