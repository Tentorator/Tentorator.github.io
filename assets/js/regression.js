/* ==========================================================================
   Interactive linear least-squares regression graph.
   Click empty space to add a point, drag existing points to move them.
   Regression line and readouts recompute live via the closed-form
   normal equations.
   ========================================================================== */

(function () {
  "use strict";

  const DOMAIN = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const PLOT = { left: 60, right: 780, top: 20, bottom: 460 };
  const NS = "http://www.w3.org/2000/svg";

  const SEED_POINTS = [
    { x: 1, y: 2.2 },
    { x: 2.5, y: 3.4 },
    { x: 3.5, y: 3.9 },
    { x: 5, y: 5.6 },
    { x: 6.5, y: 6.1 },
    { x: 8, y: 7.8 },
    { x: 9, y: 8.4 },
  ];

  function dataToSvg(x, y) {
    const sx =
      PLOT.left + ((x - DOMAIN.minX) / (DOMAIN.maxX - DOMAIN.minX)) * (PLOT.right - PLOT.left);
    const sy =
      PLOT.bottom - ((y - DOMAIN.minY) / (DOMAIN.maxY - DOMAIN.minY)) * (PLOT.bottom - PLOT.top);
    return { sx, sy };
  }

  function svgToData(sx, sy) {
    const x =
      DOMAIN.minX + ((sx - PLOT.left) / (PLOT.right - PLOT.left)) * (DOMAIN.maxX - DOMAIN.minX);
    const y =
      DOMAIN.minY + ((PLOT.bottom - sy) / (PLOT.bottom - PLOT.top)) * (DOMAIN.maxY - DOMAIN.minY);
    return {
      x: Math.min(DOMAIN.maxX, Math.max(DOMAIN.minX, x)),
      y: Math.min(DOMAIN.maxY, Math.max(DOMAIN.minY, y)),
    };
  }

  function clientToSvgPoint(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    const local = pt.matrixTransform(ctm.inverse());
    return { sx: local.x, sy: local.y };
  }

  function computeRegression(points) {
    const n = points.length;
    if (n < 2) {
      return null;
    }
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) {
      return null;
    }
    const m = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - m * sumX) / n;

    const meanY = sumY / n;
    let sse = 0;
    let sst = 0;
    for (const p of points) {
      const predicted = m * p.x + b;
      sse += (p.y - predicted) ** 2;
      sst += (p.y - meanY) ** 2;
    }
    const r2 = sst === 0 ? 1 : 1 - sse / sst;

    return { n, m, b, sse, r2 };
  }

  function initRegressionGraph(svgId, readoutPrefix, controls) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    let points = SEED_POINTS.map((p) => ({ ...p }));
    let draggingIndex = null;

    const gridLayer = svg.querySelector(".rg-grid");
    const lineLayer = svg.querySelector(".rg-line");
    const pointsLayer = svg.querySelector(".rg-points");
    const placeholder = svg.querySelector(".rg-placeholder");

    function readout(name) {
      return document.getElementById(readoutPrefix + "-" + name);
    }

    function drawGrid() {
      gridLayer.innerHTML = "";
      for (let x = DOMAIN.minX; x <= DOMAIN.maxX; x += 1) {
        const { sx } = dataToSvg(x, 0);
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", sx);
        line.setAttribute("x2", sx);
        line.setAttribute("y1", PLOT.top);
        line.setAttribute("y2", PLOT.bottom);
        line.setAttribute("class", x === 0 ? "rg-axis" : "rg-gridline");
        gridLayer.appendChild(line);
      }
      for (let y = DOMAIN.minY; y <= DOMAIN.maxY; y += 1) {
        const { sy } = dataToSvg(0, y);
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", PLOT.left);
        line.setAttribute("x2", PLOT.right);
        line.setAttribute("y1", sy);
        line.setAttribute("y2", sy);
        line.setAttribute("class", y === 0 ? "rg-axis" : "rg-gridline");
        gridLayer.appendChild(line);
      }
    }

    function render() {
      const result = computeRegression(points);

      lineLayer.innerHTML = "";
      if (result) {
        const yAtMin = result.m * DOMAIN.minX + result.b;
        const yAtMax = result.m * DOMAIN.maxX + result.b;
        const p1 = dataToSvg(DOMAIN.minX, yAtMin);
        const p2 = dataToSvg(DOMAIN.maxX, yAtMax);
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", p1.sx);
        line.setAttribute("y1", p1.sy);
        line.setAttribute("x2", p2.sx);
        line.setAttribute("y2", p2.sy);
        line.setAttribute("class", "rg-regression-line");
        lineLayer.appendChild(line);
      }

      pointsLayer.innerHTML = "";
      points.forEach((p, i) => {
        const { sx, sy } = dataToSvg(p.x, p.y);

        const hit = document.createElementNS(NS, "circle");
        hit.setAttribute("cx", sx);
        hit.setAttribute("cy", sy);
        hit.setAttribute("r", 16);
        hit.setAttribute("class", "rg-point-hit");
        hit.dataset.index = String(i);
        pointsLayer.appendChild(hit);

        const dot = document.createElementNS(NS, "circle");
        dot.setAttribute("cx", sx);
        dot.setAttribute("cy", sy);
        dot.setAttribute("r", 7);
        dot.setAttribute("class", "rg-point" + (i === draggingIndex ? " rg-point--active" : ""));
        dot.dataset.index = String(i);
        pointsLayer.appendChild(dot);
      });

      if (placeholder) {
        placeholder.style.display = points.length < 2 ? "block" : "none";
      }

      if (readout("n")) readout("n").textContent = String(points.length);
      if (result) {
        if (readout("m")) readout("m").textContent = result.m.toFixed(3);
        if (readout("b")) readout("b").textContent = result.b.toFixed(3);
        if (readout("r2")) readout("r2").textContent = result.r2.toFixed(3);
        if (readout("sse")) readout("sse").textContent = result.sse.toFixed(3);
      } else {
        ["m", "b", "r2", "sse"].forEach((key) => {
          if (readout(key)) readout(key).textContent = "—";
        });
      }
    }

    function indexFromEvent(evt) {
      const target = evt.target;
      if (target && target.dataset && target.dataset.index !== undefined) {
        return Number(target.dataset.index);
      }
      return null;
    }

    svg.addEventListener("pointerdown", (evt) => {
      const idx = indexFromEvent(evt);
      if (idx !== null) {
        draggingIndex = idx;
        svg.setPointerCapture(evt.pointerId);
        render();
        evt.preventDefault();
        return;
      }
      const { sx, sy } = clientToSvgPoint(svg, evt.clientX, evt.clientY);
      if (sx < PLOT.left || sx > PLOT.right || sy < PLOT.top || sy > PLOT.bottom) return;
      const { x, y } = svgToData(sx, sy);
      points.push({ x, y });
      render();
    });

    svg.addEventListener("pointermove", (evt) => {
      if (draggingIndex === null) return;
      const { sx, sy } = clientToSvgPoint(svg, evt.clientX, evt.clientY);
      const clampedSx = Math.min(PLOT.right, Math.max(PLOT.left, sx));
      const clampedSy = Math.min(PLOT.bottom, Math.max(PLOT.top, sy));
      points[draggingIndex] = svgToData(clampedSx, clampedSy);
      render();
    });

    function endDrag(evt) {
      if (draggingIndex === null) return;
      draggingIndex = null;
      render();
    }

    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);

    svg.addEventListener("dblclick", (evt) => {
      const idx = indexFromEvent(evt);
      if (idx !== null) {
        points.splice(idx, 1);
        render();
      }
    });

    if (controls && controls.loadExampleId) {
      const btn = document.getElementById(controls.loadExampleId);
      if (btn) {
        btn.addEventListener("click", () => {
          points = SEED_POINTS.map((p) => ({ ...p }));
          render();
        });
      }
    }

    if (controls && controls.clearId) {
      const btn = document.getElementById(controls.clearId);
      if (btn) {
        btn.addEventListener("click", () => {
          points = [];
          render();
        });
      }
    }

    drawGrid();
    render();
  }

  window.initRegressionGraph = initRegressionGraph;
})();
