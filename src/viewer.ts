import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export const DEFAULT_EXPOSURE = 0.55;
export const DEFAULT_LIGHTING = 0.5;
export const ENV_INTENSITY = 1.6; // reflejos del entorno: lo que hace que el metal parezca metal
export const MAX_METAL_ROUGHNESS = 0.3; // techo de rugosidad para metales (venían en 0.6-0.9: no reflejaban nada)

// Resuelve rutas absolutas del proyecto a la subcarpeta de despliegue (base de Vite)
function resolveAsset(p?: string) {
  if (!p) return p;
  if (/^(https?:)?\/\//.test(p)) return p;
  return import.meta.env.BASE_URL.replace(/\/$/, "") + "/" + p.replace(/^\//, "");
}

// Estudio oscuro con cajas de luz: fondo negro + highlights duros.
// RoomEnvironment (sala blanca) dejaba los metales como plástico blanco.
// Tres luces: azul a la izquierda, blanca al centro, naranja cálida a la derecha.
function studioEnvironment(): THREE.Scene {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x000000);
  const box = (w: number, h: number, rgb: [number, number, number], pos: [number, number, number]) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    mat.color.setRGB(rgb[0], rgb[1], rgb[2]);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  box(5, 4, [0, 0.08, 6], [-6.5, 4.5, 1.5]); // azul puro (izquierda arriba)
  box(7, 5, [5.5, 5.4, 5.2], [0, 6.5, 3]); // blanca tenue (centro arriba)
  box(5, 4, [6, 0.7, 0], [6.5, 4.5, 1.5]); // naranja puro (derecha arriba)
  box(12, 12, [0.25, 0.25, 0.3], [0, -6, 0]); // piso
  return s;
}

// Gradiente de bandas para cel-shading (3 pasos: sombra, medio, luz).
function toonGradientMap(): THREE.DataTexture {
  const steps = new Uint8Array([80, 170, 255]);
  const tex = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

// Contorno por "hull": copia de la malla con caras traseras negras y vértices
// empujados hacia afuera a lo largo de su normal. El desplazamiento se hace en
// espacio de vista y escala con la distancia, así el grosor es constante en
// pantalla sin importar la escala propia de cada nodo (Blender usa 0.06-0.6).
function outlineMaterial(): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
  (mat as any).userData = { outline: true };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = { value: (mat as any).userData.size ?? 0.01 };
    shader.vertexShader = "uniform float uOutline;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `vec4 mvPosition = vec4(transformed, 1.0);
       mvPosition = modelViewMatrix * mvPosition;
       vec3 _vn = normalize(normalMatrix * objectNormal);
       mvPosition.xyz += _vn * uOutline * -mvPosition.z;
       gl_Position = projectionMatrix * mvPosition;`
    );
  };
  mat.customProgramCacheKey = () => "outline";
  return mat;
}

export type ViewerHandle = {
  load(url: string, exposure?: number, lightingArg?: number, roughnessArg?: number, metalnessArg?: number, envArg?: number, saturationArg?: number, hdriArg?: string, contrastArg?: boolean, spinCenterArg?: [number, number, number], toonArg?: boolean): void;
  dispose(): void;
};

type ViewerOptions = {
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  exposure?: number;
  lighting?: number;
  roughness?: number; // techo de rugosidad de los metales de este caso
  metalness?: number; // reemplaza metalness de los materiales (metal pintado ~0.6)
  envIntensity?: number; // intensidad de reflejos de este caso (default 1.6)
  saturation?: number; // 1 = pleno, 0.85 = levemente desaturado
  hdri?: string; // ruta a un HDRI .hdr que reemplaza al estudio procedural
  contrast?: boolean; // iluminación direccional en ángulo que marca relieve y contornos del modelado
  spinCenter?: [number, number, number]; // centro de giro propio (si no, se usa el centro del bbox)
  toon?: boolean; // cel-shading: convierte materiales unlit a MeshToonMaterial + contorno negro
};

export function createViewer(container: HTMLElement, options: ViewerOptions = {}): ViewerHandle {
  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile && window.devicePixelRatio <= 1.5,
    alpha: true,
    powerPreference: isMobile ? "low-power" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 0.85 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.exposure ?? DEFAULT_EXPOSURE;
  renderer.setSize(width, height);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.userSelect = "none";
  renderer.domElement.draggable = false;
  container.style.userSelect = "none";
  container.addEventListener("dragstart", (e) => e.preventDefault());
  container.appendChild(renderer.domElement);

  renderer.domElement.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      container.dispatchEvent(new CustomEvent("viewer-error"));
    },
    { once: true }
  );

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 10000);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const defaultEnv = pmrem.fromScene(studioEnvironment(), 0.04).texture;
  scene.environment = defaultEnv;
  const _envQuat = new THREE.Quaternion();
  const _panRight = new THREE.Vector3();
  const _panUp = new THREE.Vector3();
  let hdriRT: THREE.WebGLRenderTarget | null = null;

  // La blanca se mantiene tenue para que azul/naranja dominen los reflejos de color.
  const BASE_LIGHTS = { hemi: 0.5, key: 0.9, rim: 2.1, fill: 1.7 };
  const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a4a, BASE_LIGHTS.hemi);
  scene.add(hemi);
  // Direcciones de las luces relativas a la CÁMARA: azul siempre a la izquierda de
  // pantalla, naranja a la derecha y blanca al centro, sin importar cómo gire el modelo.
  const CAM_LIGHT_DIRS: { light: THREE.DirectionalLight; dir: THREE.Vector3 }[] = [];
  const key = new THREE.DirectionalLight(0xffffff, BASE_LIGHTS.key);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff2e00, BASE_LIGHTS.rim);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x0040ff, BASE_LIGHTS.fill);
  scene.add(fill);
  const contour = new THREE.DirectionalLight(0xffffff, 0);
  scene.add(contour); // luz de contraste: raking light en ángulo para marcar relieves

  function setCamSpaceLights() {
    const defs: [THREE.DirectionalLight, [number, number, number]][] = [
      [key, [0, 0.55, 1]], // blanca al centro (frente/arriba)
      [rim, [0.55, 0.35, 0.7]], // naranja a la derecha de pantalla
      [fill, [-0.55, 0.35, 0.7]], // azul a la izquierda de pantalla
      [contour, [0, 0.5, -1]], // contraste detrás
    ];
    CAM_LIGHT_DIRS.length = 0;
    for (const [light, d] of defs) {
      const dir = new THREE.Vector3(d[0], d[1], d[2]).applyQuaternion(camera.quaternion).normalize();
      CAM_LIGHT_DIRS.push({ light, dir });
      light.position.copy(dir);
    }
  }

  const GROUND_CONTRAST = { hemi: 0.35, key: 0.6, rim: 1.8, fill: 0.9, contour: 2.2 };

  let lighting = options.lighting ?? DEFAULT_LIGHTING;
  let roughLimit = options.roughness ?? MAX_METAL_ROUGHNESS;
  let metalTarget = options.metalness;
  let envInt = options.envIntensity ?? ENV_INTENSITY;
  let saturation = options.saturation ?? 1;
  let spinCenter: [number, number, number] | undefined;
  let toonMode = false;

  function applyLighting(scale: number) {
    lighting = scale;
    hemi.intensity = BASE_LIGHTS.hemi * scale;
    key.intensity = BASE_LIGHTS.key * scale;
    rim.intensity = BASE_LIGHTS.rim * scale;
    fill.intensity = BASE_LIGHTS.fill * scale;
    contour.intensity = 0;
  }
  function applyContrast(scale: number) {
    lighting = scale;
    hemi.intensity = GROUND_CONTRAST.hemi * scale;
    key.intensity = GROUND_CONTRAST.key * scale;
    rim.intensity = GROUND_CONTRAST.rim * scale;
    fill.intensity = GROUND_CONTRAST.fill * scale;
    contour.intensity = GROUND_CONTRAST.contour * scale;
  }
  applyLighting(lighting);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = isMobile ? 0.12 : 0.08;
  controls.enablePan = false; // el pan lo manejo aparte, moviendo el modelo
  controls.autoRotate = false; // el giro lo hace el modelo, no la cámara: las luces quedan fijas
  const spinSpeed = options.autoRotateSpeed ?? (isMobile ? 0.3 : 0.5);
  const SPIN_DEG_PER_S = 9 * spinSpeed; // velocidad del giro en grados/segundo (independiente de los FPS)
  const autoSpin = options.autoRotate ?? true;
  let userInteracting = false;
  let spinResumeAt = 0; // timestamp hasta el que el giro queda frenado tras soltar
  const SPIN_RESUME_MS = 2000;
  let spinFactor = 1; // arranque suave del giro al reanudar
  controls.addEventListener("start", () => { userInteracting = true; });
  controls.addEventListener("end", () => {
    userInteracting = false;
    spinResumeAt = performance.now() + SPIN_RESUME_MS;
  });
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI - 0.15;

  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  let current: THREE.Object3D | null = null;
  let loadToken = 0;

  // Pan manual: desplaza el modelo por la pantalla (boton derecho/medio o Shift+izq).
  // Es un arrastre normal: mientras el boton esta presionado, no cuenta como orbita.
  {
    const el = renderer.domElement;
    let panning = false;
    let lastX = 0;
    let lastY = 0;
    const panAt = (e: PointerEvent) => {
      if (!current) return;
      const rect = el.getBoundingClientRect();
      const worldPerPx =
        (2 * Math.tan(((camera.fov * Math.PI) / 180) / 2) * camera.position.distanceTo(controls.target)) /
        rect.height;
      const dx = (e.clientX - lastX) * worldPerPx;
      const dy = (e.clientY - lastY) * worldPerPx;
      _panRight.setFromMatrixColumn(camera.matrix, 0);
      _panUp.setFromMatrixColumn(camera.matrix, 1);
      current.position.addScaledVector(_panRight, dx);
      current.position.addScaledVector(_panUp, -dy);
    };
    el.addEventListener("pointerdown", (e) => {
      const isPan = e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey);
      if (!isPan) return;
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
    }, { capture: true });
    document.addEventListener("pointermove", (e) => {
      if (!panning) return;
      panAt(e);
      lastX = e.clientX;
      lastY = e.clientY;
    }, { capture: true });
    const stop = () => { panning = false; };
    document.addEventListener("pointerup", stop, { capture: true });
    document.addEventListener("pointercancel", stop, { capture: true });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function disposeObject(root: THREE.Object3D) {
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }

  function frameModel(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const look = box.getCenter(new THREE.Vector3());

    const radius = Math.max(size.length() * 0.5, 0.001);
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (radius / Math.sin(fov / 2)) * 1.15;

    camera.near = Math.max(dist / 100, 0.001);
    camera.far = dist * 100;
    camera.position.set(look.x, look.y + size.y * 0.06, look.z + dist);
    camera.updateProjectionMatrix();
    camera.lookAt(look);

    controls.target.copy(look);
    controls.minDistance = radius * 1.7;
    controls.maxDistance = radius * 6;
    controls.update();
  }

  function load(url: string, exposure?: number, lightingArg?: number, roughnessArg?: number, metalnessArg?: number, envArg?: number, saturationArg?: number, hdriArg?: string, contrastArg?: boolean, spinCenterArg?: [number, number, number], toonArg?: boolean) {
    const token = ++loadToken;
    toonMode = !!toonArg;
    url = resolveAsset(url) ?? "";
    hdriArg = resolveAsset(hdriArg);
    spinCenter = spinCenterArg;
    if (typeof exposure === "number") renderer.toneMappingExposure = exposure;
    else renderer.toneMappingExposure = DEFAULT_EXPOSURE;
    if (contrastArg === true) applyContrast(lightingArg ?? DEFAULT_LIGHTING);
    else applyLighting(lightingArg ?? DEFAULT_LIGHTING);
    if (typeof roughnessArg === "number") roughLimit = roughnessArg;
    else roughLimit = MAX_METAL_ROUGHNESS;
    if (typeof metalnessArg === "number") metalTarget = metalnessArg;
    else metalTarget = undefined;
    if (typeof envArg === "number") envInt = envArg;
    else envInt = ENV_INTENSITY;
    if (typeof saturationArg === "number") saturation = saturationArg;
    else saturation = 1;
    if (hdriRT) {
      hdriRT.dispose();
      hdriRT = null;
    }
    if (typeof hdriArg === "string" && hdriArg) {
      new RGBELoader().load(
        hdriArg,
        (hdr) => {
          if (token !== loadToken) {
            hdr.dispose();
            return;
          }
          hdriRT = pmrem.fromEquirectangular(hdr);
          scene.environment = hdriRT.texture;
          hdr.dispose();
        },
        undefined,
        () => {
          if (token === loadToken) scene.environment = defaultEnv;
        },
      );
    } else {
      scene.environment = defaultEnv;
    }
    container.dataset.exposure = String(renderer.toneMappingExposure);
    container.dataset.lighting = String(lighting);
    container.dataset.roughness = String(roughLimit);
    container.dataset.metalness = String(metalTarget ?? "");
    container.dataset.envInt = String(envInt);
    container.dataset.saturation = String(saturation);
    if (current) {
      scene.remove(current);
      disposeObject(current);
      current = null;
    }
    loader.load(
      url,
      (gltf) => {
        // Si ya se pidió otro caso mientras cargaba, descartar este modelo
        if (token !== loadToken) {
          disposeObject(gltf.scene);
          return;
        }
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const toonGradMap = toonMode ? toonGradientMap() : null;
        model.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mat0 = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          if (mat0 && (mat0 as any).userData?.outline) return; // no recursar sobre los contornos
          mesh.frustumCulled = false;
          const orig = mesh.material as THREE.Material | THREE.Material[];
          // Cel-shading: los materiales unlit (KHR_materials_unlit) planos se convierten a
          // MeshToonMaterial con bandas de luz, y se les agrega un contorno negro.
          const toToon = (m: THREE.Material): THREE.Material => {
            if (!(m as any).isMeshBasicMaterial) return m;
            const basic = m as THREE.MeshBasicMaterial;
            const toon = new THREE.MeshToonMaterial({
              color: basic.color ? basic.color.clone() : new THREE.Color(0xffffff),
              map: basic.map ?? null,
              gradientMap: toonGradMap!,
              vertexColors: !!mesh.geometry.getAttribute("color"),
              side: THREE.DoubleSide,
            });
            return toon;
          };
          if (toonMode) {
            const first = Array.isArray(orig) ? orig[0] : orig;
            if (first && (first as any).isMeshBasicMaterial && mesh.parent) {
              const om = outlineMaterial();
              (om as any).userData.size = 0.02;
              om.needsUpdate = true;
              const oMesh = new THREE.Mesh(mesh.geometry, om);
              oMesh.frustumCulled = false;
              oMesh.matrixAutoUpdate = false;
              oMesh.matrix.copy(mesh.matrix);
              mesh.parent.add(oMesh);
            }
          }
          mesh.material = toonMode
            ? Array.isArray(orig)
              ? orig.map(toToon)
              : toToon(orig)
            : orig;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && (mat as any).isMeshStandardMaterial) {
            mat.side = THREE.DoubleSide;
            mat.envMapIntensity = envInt;
            if (mat.metalness >= 0.5 && mat.roughness > roughLimit) mat.roughness = roughLimit;
            if (typeof metalTarget === "number") {
              mat.metalness = metalTarget;
              if (metalTarget <= 0.05) {
                const phys = mat as unknown as { clearcoat?: number; transmission?: number };
                if (phys.clearcoat !== undefined) phys.clearcoat = 0;
                if (phys.transmission !== undefined) phys.transmission = 0;
              }
            }
            mat.vertexColors = !!mesh.geometry.getAttribute("color");
            mat.needsUpdate = true;
if (saturation !== 1) {
                const v = saturation;
                (mat as any).onBeforeCompile = (shader: any) => {
                  shader.uniforms.uDesat = { value: v };
                  shader.fragmentShader = "uniform float uDesat;\n" + shader.fragmentShader;
                  shader.fragmentShader = shader.fragmentShader.replace(
                    "#include <opaque_fragment>",
                    `vec3 _desat_lum = vec3(dot(outgoingLight.rgb, vec3(0.299, 0.587, 0.114)));
                    outgoingLight.rgb = mix(_desat_lum, outgoingLight.rgb, uDesat);
                    #include <opaque_fragment>`
                  );
                };
                (mat as any).customProgramCacheKey = () => `desat-${v}`;
              }
          } else if (mat) {
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
          }
        });
        // Centrar el modelo en el origen del pivote para que el giro sea sobre su centro absoluto
        const pivot = new THREE.Group();
        model.position.set(0, 0, 0);
        model.updateMatrixWorld(true);
        const center = spinCenter
          ? new THREE.Vector3(spinCenter[0], spinCenter[1], spinCenter[2])
          : box.getCenter(new THREE.Vector3());
        model.position.copy(center).negate();
        pivot.add(model);
        pivot.updateMatrixWorld(true);
        scene.add(pivot);
        current = pivot;
        pivot.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) mesh.frustumCulled = true;
        });
        frameModel(pivot);
        container.dispatchEvent(new CustomEvent("viewer-loaded"));
      },
      (e) => {
        if (token !== loadToken) return;
        container.dispatchEvent(
          new CustomEvent("viewer-progress", {
            detail: e.total ? e.loaded / e.total : 0,
          })
        );
      },
      () => {
        if (token === loadToken) container.dispatchEvent(new CustomEvent("viewer-error"));
      },
    );
  }

  let raf = 0;
  let _lastT = performance.now();
  function animate() {
    raf = requestAnimationFrame(animate);
    const t = performance.now();
    const dt = Math.min((t - _lastT) / 1000, 0.1); // segundos, acotado
    _lastT = t;
    controls.update();
    // Giro automatico: se frena 2s tras soltar y reanuda acelerando suave.
    const canSpin = autoSpin && !userInteracting && t >= spinResumeAt;
    if (canSpin && current) {
      spinFactor = Math.min(1, spinFactor + dt * 0.8);
      current.rotation.y += THREE.MathUtils.degToRad(SPIN_DEG_PER_S) * dt * spinFactor;
    } else {
      spinFactor = 0;
    }
    setCamSpaceLights();
    // El entorno (IBL) queda anclado a la camara: mismas cajas azul/blanca/naranja
    // a la izquierda/centro/derecha de pantalla, sin girar con el modelo.
    if (scene.environment === defaultEnv) {
      _envQuat.copy(camera.quaternion).invert();
      scene.environmentRotation.setFromQuaternion(_envQuat);
    }
    renderer.render(scene, camera);
  }
  animate();

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  return {
    load,
    dispose() {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      controls.dispose();
      if (current) disposeObject(current);
      if (hdriRT) hdriRT.dispose();
      scene.environment?.dispose();
      defaultEnv.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
