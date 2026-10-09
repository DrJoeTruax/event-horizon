/* ---------------------------------------------------------------- blackbody */
function cie(l) {
  const g = (x, m, s1, s2) => { const t = (x - m) / (x < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
  return [
    1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
    0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
    1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
  ];
}
const CMF = []; for (let l = 380; l <= 780; l += 5) CMF.push([l, cie(l)]);
function bbRGB(T) {
  let X = 0, Y = 0, Z = 0;
  for (const [l, c] of CMF) {
    const b = Math.pow(l * 1e-3, -5) / (Math.exp(1.4387769e7 / (l * T)) - 1);
    X += b * c[0]; Y += b * c[1]; Z += b * c[2];
  }
  return [
    Math.max(0, 3.2406 * X - 1.5372 * Y - 0.4986 * Z),
    Math.max(0, -0.9689 * X + 1.8758 * Y + 0.0415 * Z),
    Math.max(0, 0.0557 * X - 0.2040 * Y + 1.0570 * Z),
  ];
}
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const Y_REF = lum(bbRGB(6500));
const bbLum = (T) => lum(bbRGB(T)) / Y_REF;
function buildBBTable() {
  const N = 512, data = new Float32Array(N * 4);
  const a = Math.log(300), b = Math.log(100000);
  for (let i = 0; i < N; i++) {
    const T = Math.exp(a + (b - a) * i / (N - 1));
    const c = bbRGB(T), Y = Math.max(lum(c), 1e-300);
    data[i * 4] = c[0] / Y; data[i * 4 + 1] = c[1] / Y; data[i * 4 + 2] = c[2] / Y;
    data[i * 4 + 3] = Math.max(Math.log(Y / Y_REF), -80);
  }
  return data;
}
function diskTemp(r, rin) { return Math.pow(3 / r, 0.75) * Math.pow(Math.max(1 - Math.sqrt(rin / r), 0), 0.25) / 0.48807; }

