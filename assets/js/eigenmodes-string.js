/* ==========================================================================
   1D eigenvalue problem: the vibrating string with fixed ends.
   -u'' = lambda * u,  u(0) = u(L) = 0
   Eigenfunctions u_n(x) = sin(n*pi*x/L), eigenvalues lambda_n = (n*pi/L)^2.
   Animated as a standing wave u_n(x,t) = sin(n*pi*x/L) * cos(omega_n * t).
   ========================================================================== */

(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const L = 10;
  const PLOT = { left: 40, right: 760, mid: 130, ampPx: 95 };
  const SAMPLES = 140;
  const OMEGA_UNIT = 1.1;

  function initStringMode(svgId, readoutPrefix, controls) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    const curve = svg.querySelector(".em-curve");
    const gridLayer = svg.querySelector(".em-grid");
    const nodesLayer = svg.querySelector(".em-nodes");
    const slider = document.getElementById(controls.sliderId);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function readout(name) {
      return document.getElementById(readoutPrefix + "-" + name);
    }

    let n = Number(slider.value);
    let t = 0;

    function drawStaticGrid() {
      gridLayer.innerHTML = "";
      const axis = document.createElementNS(NS, "line");
      axis.setAttribute("x1", PLOT.left);
      axis.setAttribute("x2", PLOT.right);
      axis.setAttribute("y1", PLOT.mid);
      axis.setAttribute("y2", PLOT.mid);
      axis.setAttribute("class", "rg-axis");
      gridLayer.appendChild(axis);

      [PLOT.mid - PLOT.ampPx, PLOT.mid + PLOT.ampPx].forEach((y) => {
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", PLOT.left);
        line.setAttribute("x2", PLOT.right);
        line.setAttribute("y1", y);
        line.setAttribute("y2", y);
        line.setAttribute("class", "rg-gridline");
        gridLayer.appendChild(line);
      });
    }

    function updateNodes() {
      nodesLayer.innerHTML = "";
      for (let k = 0; k <= n; k++) {
        const x = (k / n) * L;
        const sx = PLOT.left + (x / L) * (PLOT.right - PLOT.left);
        const dot = document.createElementNS(NS, "circle");
        dot.setAttribute("cx", sx);
        dot.setAttribute("cy", PLOT.mid);
        dot.setAttribute("r", 4);
        dot.setAttribute("class", "em-node");
        nodesLayer.appendChild(dot);
      }
    }

    function frame() {
      const omega = n * OMEGA_UNIT;
      const envelope = reduceMotion ? 1 : Math.cos(omega * t);
      let d = "";
      for (let i = 0; i <= SAMPLES; i++) {
        const x = (i / SAMPLES) * L;
        const sx = PLOT.left + (x / L) * (PLOT.right - PLOT.left);
        const u = Math.sin((n * Math.PI * x) / L) * envelope;
        const sy = PLOT.mid - u * PLOT.ampPx;
        d += (i === 0 ? "M " : "L ") + sx.toFixed(1) + " " + sy.toFixed(1) + " ";
      }
      curve.setAttribute("d", d);

      if (readout("n")) readout("n").textContent = String(n);
      if (readout("lambda")) readout("lambda").textContent = (((n * Math.PI) / L) ** 2).toFixed(3);
      if (readout("omega")) readout("omega").textContent = omega.toFixed(3);

      if (!reduceMotion) t += 1 / 60;
      requestAnimationFrame(frame);
    }

    slider.addEventListener("input", () => {
      n = Number(slider.value);
      updateNodes();
    });

    drawStaticGrid();
    updateNodes();
    requestAnimationFrame(frame);
  }

  window.initStringMode = initStringMode;
})();
