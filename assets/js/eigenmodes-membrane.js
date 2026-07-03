/* ==========================================================================
   2D eigenvalue problem: the circular drum membrane, fixed rim.
   -Delta u = lambda * u  on the unit disk, u = 0 on the boundary.
   Separation of variables gives u_mk(r,phi) = J_m(j_mk * r) * cos(m*phi),
   eigenvalues lambda_mk = j_mk^2, where j_mk is the k-th zero of J_m.
   The static spatial field is cached; only a global time envelope
   cos(omega*t) is recomputed per animation frame.
   ========================================================================== */

(function () {
  "use strict";

  const POS = [255, 156, 0]; // lcars-orange
  const NEG = [153, 153, 255]; // lcars-blue
  const ZERO = [18, 18, 18];
  const OMEGA_UNIT = 0.55;

  function lerpColor(t) {
    const c = t >= 0 ? POS : NEG;
    const a = Math.min(1, Math.abs(t));
    return [
      Math.round(ZERO[0] + (c[0] - ZERO[0]) * a),
      Math.round(ZERO[1] + (c[1] - ZERO[1]) * a),
      Math.round(ZERO[2] + (c[2] - ZERO[2]) * a),
    ];
  }

  function initMembraneMode(canvasId, readoutPrefix, controls) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 4;

    const mSlider = document.getElementById(controls.mSliderId);
    const kSlider = document.getElementById(controls.kSliderId);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function readout(name) {
      return document.getElementById(readoutPrefix + "-" + name);
    }

    let field = null; // cached normalized amplitude per pixel, or null outside disk
    let m = Number(mSlider.value);
    let k = Number(kSlider.value);
    let t = 0;
    let jmk = 1;

    const imageData = ctx.createImageData(size, size);

    function rebuildField() {
      m = Number(mSlider.value);
      k = Number(kSlider.value);
      jmk = window.MMPMath.besselZeros[m][k - 1];

      field = new Float32Array(size * size);
      let maxAbs = 1e-9;
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const dx = (px - cx) / R;
          const dy = (py - cy) / R;
          const r = Math.sqrt(dx * dx + dy * dy);
          const idx = py * size + px;
          if (r > 1) {
            field[idx] = NaN;
            continue;
          }
          const phi = Math.atan2(dy, dx);
          const val = window.MMPMath.besselJ(m, jmk * r) * Math.cos(m * phi);
          field[idx] = val;
          if (Math.abs(val) > maxAbs) maxAbs = Math.abs(val);
        }
      }
      for (let i = 0; i < field.length; i++) {
        if (!Number.isNaN(field[i])) field[i] /= maxAbs;
      }

      if (readout("m")) readout("m").textContent = String(m);
      if (readout("k")) readout("k").textContent = String(k);
      if (readout("lambda")) readout("lambda").textContent = (jmk * jmk).toFixed(3);
      if (readout("omega")) readout("omega").textContent = (jmk * OMEGA_UNIT).toFixed(3);
    }

    function paint() {
      const envelope = reduceMotion ? 1 : Math.cos(jmk * OMEGA_UNIT * t);
      const data = imageData.data;
      for (let i = 0; i < field.length; i++) {
        const v = field[i];
        const off = i * 4;
        if (Number.isNaN(v)) {
          data[off] = 3;
          data[off + 1] = 3;
          data[off + 2] = 3;
          data[off + 3] = 255;
          continue;
        }
        const [r, g, b] = lerpColor(v * envelope);
        data[off] = r;
        data[off + 1] = g;
        data[off + 2] = b;
        data[off + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    function frame() {
      paint();
      if (!reduceMotion) t += 1 / 60;
      requestAnimationFrame(frame);
    }

    mSlider.addEventListener("input", () => {
      const maxK = window.MMPMath.besselZeros[Number(mSlider.value)].length;
      if (Number(kSlider.value) > maxK) kSlider.value = String(maxK);
      rebuildField();
    });
    kSlider.addEventListener("input", rebuildField);

    rebuildField();
    requestAnimationFrame(frame);
  }

  window.initMembraneMode = initMembraneMode;
})();
