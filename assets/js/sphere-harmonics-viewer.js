/* ==========================================================================
   Interactive 3D viewer for real spherical harmonics Y_l^m(theta, phi).
   Two display modes:
     - "sphere": constant radius, surface coloured by the value of Y
       (the classical textbook picture of a Kugelfunktion)
     - "lobes": radius proportional to |Y| ("orbital lobe" shape)
   Built on three.js (loaded via CDN import map), reused for both the
   flagship visualiser and the compact comparison panel.
   ========================================================================== */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const POS_COLOR = new THREE.Color(0xff9c00); // lcars-orange
const NEG_COLOR = new THREE.Color(0x9999ff); // lcars-blue
const ZERO_COLOR = new THREE.Color(0x121212);

function buildGeometry(l, m, mode, thetaSegments, phiSegments) {
  const positions = [];
  const colors = [];
  const indices = [];

  const values = [];
  let maxAbs = 1e-9;

  for (let i = 0; i <= thetaSegments; i++) {
    const theta = (i / thetaSegments) * Math.PI;
    const row = [];
    for (let j = 0; j <= phiSegments; j++) {
      const phi = (j / phiSegments) * Math.PI * 2;
      const y = window.MMPMath.realSphericalHarmonic(l, m, theta, phi);
      row.push(y);
      if (Math.abs(y) > maxAbs) maxAbs = Math.abs(y);
    }
    values.push(row);
  }

  for (let i = 0; i <= thetaSegments; i++) {
    const theta = (i / thetaSegments) * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    for (let j = 0; j <= phiSegments; j++) {
      const phi = (j / phiSegments) * Math.PI * 2;
      const yVal = values[i][j];
      const t = Math.max(-1, Math.min(1, yVal / maxAbs));

      const radius = mode === "lobes" ? 0.35 + 0.9 * Math.abs(t) : 1.0;

      const dirX = sinT * Math.cos(phi);
      const dirY = cosT;
      const dirZ = sinT * Math.sin(phi);

      positions.push(dirX * radius, dirY * radius, dirZ * radius);

      const c = ZERO_COLOR.clone();
      if (t >= 0) c.lerp(POS_COLOR, t);
      else c.lerp(NEG_COLOR, -t);
      colors.push(c.r, c.g, c.b);
    }
  }

  const cols = phiSegments + 1;
  for (let i = 0; i < thetaSegments; i++) {
    for (let j = 0; j < phiSegments; j++) {
      const a = i * cols + j;
      const b = a + cols;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, maxAbs };
}

export function createSphericalHarmonicsViewer(container, options) {
  const opts = Object.assign({ resolution: 72, interactive: true }, options || {});

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030303);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(2.4, 1.6, 2.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enabled = opts.interactive;
  controls.autoRotate = false;
  controls.minDistance = 1.2;
  controls.maxDistance = 8;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9999ff, 0.4);
  rim.position.set(-3, -2, -2);
  scene.add(rim);

  let mesh = null;

  function setMode(l, m, mode) {
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    const thetaSeg = Math.round(opts.resolution * 0.66);
    const phiSeg = opts.resolution;
    const { geometry } = buildGeometry(l, m, mode, thetaSeg, phiSeg);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.05,
    });
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  }

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

  let running = true;
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return {
    setMode,
    dispose() {
      running = false;
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}
