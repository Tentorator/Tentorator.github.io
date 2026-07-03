/* ==========================================================================
   Rotatable 3D viewer for an STL mesh, used on the landing page to show
   off a terrain model from every angle (drag to orbit, scroll/pinch to
   zoom). Camera auto-frames the model's bounding box on load.
   ========================================================================== */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

export function createTerrainViewer(container, stlUrl) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030303);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(1, 1.2, 0.8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9c00, 0.5);
  rim.position.set(-1, -0.5, -1);
  scene.add(rim);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight || w;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const loadingEl = document.createElement("p");
  loadingEl.className = "lcars-viewer-status";
  loadingEl.textContent = "Lade 3D-Modell …";
  container.appendChild(loadingEl);

  const loader = new STLLoader();
  loader.load(
    stlUrl,
    (geometry) => {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const center = new THREE.Vector3();
      box.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      const material = new THREE.MeshStandardMaterial({
        color: 0x99ccff,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const dist = maxDim * 1.6;
      camera.position.set(dist * 0.6, dist * 0.5, dist * 0.6);
      camera.near = maxDim / 100;
      camera.far = maxDim * 20;
      camera.updateProjectionMatrix();
      controls.minDistance = maxDim * 0.3;
      controls.maxDistance = maxDim * 4;
      controls.target.set(0, 0, 0);

      loadingEl.remove();
    },
    undefined,
    () => {
      loadingEl.textContent = "3D-Modell konnte nicht geladen werden.";
    }
  );

  let running = true;
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return {
    dispose() {
      running = false;
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}
