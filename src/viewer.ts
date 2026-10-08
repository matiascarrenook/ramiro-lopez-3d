import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export const DEFAULT_EXPOSURE = 0.26;
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
  box(5, 3, [9, 8.6, 8], [4.5, 5.5, 3.5]);   // key
  box(6, 4, [1.6, 1.8, 2.4], [-5.5, 2.5, -1]); // fill frío
  box(9, 2.5, [4, 4, 4.4], [0, 3.5, -7]);      // rim
  box(2.5, 2.5, [14, 13, 12], [-2.5, -1, 6]);  // highlight chico y brillante
  box(12, 12, [0.25, 0.25, 0.3], [0, -6, 0]);  // piso
  return s;
}

export type ViewerHandle = {
  load(url: string, exposure?: number, lightingArg?: number, roughnessArg?: number, metalnessArg?: number, envArg?: number, saturationArg?: number, hdriArg?: string, contrastArg?: boolean): void;
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
};

export function createViewer(container: HTMLElement, options: ViewerOptions = {}): ViewerHandle {
  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options.exposure ?? DEFAULT_EXPOSURE;
  renderer.setSize(width, height);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
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
  let hdriRT: THREE.WebGLRenderTarget | null = null;

  const BASE_LIGHTS = { hemi: 1.1, key: 2.2, rim: 1.1, fill: 0.7 };
  const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a4a, BASE_LIGHTS.hemi);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, BASE_LIGHTS.key);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, BASE_LIGHTS.rim);
  rim.position.set(-4, 2, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, BASE_LIGHTS.fill);
  fill.position.set(0, -3, 2);
  scene.add(fill);
  const contour = new THREE.DirectionalLight(0xffffff, 0);
  contour.position.set(-6, 3, 1);
  scene.add(contour); // luz de contraste: raking light en ángulo para marcar relieves

  const GROUND_CONTRAST = { hemi: 0.5, key: 1.0, rim: 0.9, fill: 0.4, contour: 2.8 };

  let lighting = options.lighting ?? DEFAULT_LIGHTING;
  let roughLimit = options.roughness ?? MAX_METAL_ROUGHNESS;
  let metalTarget = options.metalness;
  let envInt = options.envIntensity ?? ENV_INTENSITY;
  let saturation = options.saturation ?? 1;

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
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.autoRotate = options.autoRotate ?? true;
  controls.autoRotateSpeed = options.autoRotateSpeed ?? 1.4;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI - 0.15;

  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  let current: THREE.Object3D | null = null;

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
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    const radius = Math.max(size.length() * 0.5, 0.001);
    const fov = (camera.fov * Math.PI) / 180;
    const dist = (radius / Math.sin(fov / 2)) * 1.15;

    camera.near = Math.max(dist / 100, 0.001);
    camera.far = dist * 100;
    camera.position.set(0, size.y * 0.06, dist);
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);

    controls.target.set(0, 0, 0);
    controls.minDistance = radius * 0.8;
    controls.maxDistance = radius * 6;
    controls.update();
  }

  function load(url: string, exposure?: number, lightingArg?: number, roughnessArg?: number, metalnessArg?: number, envArg?: number, saturationArg?: number, hdriArg?: string, contrastArg?: boolean) {
    url = resolveAsset(url) ?? "";
    hdriArg = resolveAsset(hdriArg);
    if (typeof exposure === "number") renderer.toneMappingExposure = exposure;
    if (contrastArg === true) applyContrast(lightingArg ?? DEFAULT_LIGHTING);
    else if (typeof lightingArg === "number") applyLighting(lightingArg);
    if (typeof roughnessArg === "number") roughLimit = roughnessArg;
    if (typeof metalnessArg === "number") metalTarget = metalnessArg;
    if (typeof envArg === "number") envInt = envArg;
    if (typeof saturationArg === "number") saturation = saturationArg;
    if (hdriRT) {
      hdriRT.dispose();
      hdriRT = null;
    }
    if (typeof hdriArg === "string" && hdriArg) {
      new RGBELoader().load(
        hdriArg,
        (hdr) => {
          hdriRT = pmrem.fromEquirectangular(hdr);
          scene.environment = hdriRT.texture;
          hdr.dispose();
        },
        undefined,
        () => scene.environment = defaultEnv,
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
        const model = gltf.scene;
        model.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.frustumCulled = false;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && (mat as any).isMeshStandardMaterial) {
            mat.side = THREE.DoubleSide;
            mat.envMapIntensity = envInt;
            if (mat.metalness >= 0.5 && mat.roughness > roughLimit) mat.roughness = roughLimit;
            if (typeof metalTarget === "number") mat.metalness = metalTarget;
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
        scene.add(model);
        current = model;
        frameModel(model);
        container.dispatchEvent(new CustomEvent("viewer-loaded"));
      },
      (e) => {
        container.dispatchEvent(
          new CustomEvent("viewer-progress", {
            detail: e.total ? e.loaded / e.total : 0,
          })
        );
      },
      () => container.dispatchEvent(new CustomEvent("viewer-error")),
    );
  }

  let raf = 0;
  function animate() {
    raf = requestAnimationFrame(animate);
    controls.update();
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
