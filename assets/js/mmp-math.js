/* ==========================================================================
   Shared numerics for the MMP I section: associated Legendre functions,
   real spherical harmonics, and Bessel functions of the first kind.
   Plain global (window.MMPMath) so it can be used from classic scripts
   and ES modules alike.
   ========================================================================== */

(function () {
  "use strict";

  function factorial(n) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  // Associated Legendre function P_l^m(x), l >= m >= 0, via the standard
  // upward recurrence (Condon-Shortley phase included).
  function assocLegendre(l, m, x) {
    let pmm = 1.0;
    if (m > 0) {
      const somx2 = Math.sqrt((1 - x) * (1 + x));
      let fact = 1.0;
      for (let i = 1; i <= m; i++) {
        pmm *= -fact * somx2;
        fact += 2.0;
      }
    }
    if (l === m) return pmm;
    let pmmp1 = x * (2 * m + 1) * pmm;
    if (l === m + 1) return pmmp1;
    let pll = 0;
    for (let ll = m + 2; ll <= l; ll++) {
      pll = (x * (2 * ll - 1) * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
      pmm = pmmp1;
      pmmp1 = pll;
    }
    return pll;
  }

  // Real, orthonormalized spherical harmonic Y_l^m(theta, phi).
  // theta = polar angle [0, pi], phi = azimuthal angle [0, 2*pi).
  function realSphericalHarmonic(l, m, theta, phi) {
    const absM = Math.abs(m);
    const x = Math.cos(theta);
    const p = assocLegendre(l, absM, x);
    const norm = Math.sqrt(
      ((2 * l + 1) / (4 * Math.PI)) * (factorial(l - absM) / factorial(l + absM))
    );
    if (m === 0) return norm * p;
    if (m > 0) return Math.SQRT2 * norm * p * Math.cos(m * phi);
    return Math.SQRT2 * norm * p * Math.sin(absM * phi);
  }

  // Bessel function of the first kind, J_m(x), via power series.
  // Accurate enough for the argument range needed here (x <~ 20).
  function besselJ(m, x) {
    if (x === 0) return m === 0 ? 1 : 0;
    const halfX = x / 2;
    let term = Math.pow(halfX, m) / factorial(m);
    let sum = term;
    for (let k = 1; k <= 50; k++) {
      term *= -(halfX * halfX) / (k * (k + m));
      sum += term;
      if (k > 5 && Math.abs(term) < 1e-14 * Math.abs(sum)) break;
    }
    return sum;
  }

  // First few positive zeros of J_m, m = 0..3 (standard tabulated constants).
  const besselZeros = {
    0: [2.404825558, 5.520078110, 8.653727913, 11.791534439],
    1: [3.831705970, 7.015586670, 10.173468135, 13.323691933],
    2: [5.135622302, 8.417244140, 11.619841173, 14.795951782],
    3: [6.380161896, 9.761023130, 13.015200722, 16.223466160],
  };

  window.MMPMath = {
    factorial,
    assocLegendre,
    realSphericalHarmonic,
    besselJ,
    besselZeros,
  };
})();
