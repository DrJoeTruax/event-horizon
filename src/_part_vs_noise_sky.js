const VS = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const NOISE = `
vec3 hg(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0; }
vec3 hu(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float gnoise(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hg(i), f);
  float b = dot(hg(i + vec3(1,0,0)), f - vec3(1,0,0));
  float c = dot(hg(i + vec3(0,1,0)), f - vec3(0,1,0));
  float d = dot(hg(i + vec3(1,1,0)), f - vec3(1,1,0));
  float e = dot(hg(i + vec3(0,0,1)), f - vec3(0,0,1));
  float g = dot(hg(i + vec3(1,0,1)), f - vec3(1,0,1));
  float h = dot(hg(i + vec3(0,1,1)), f - vec3(0,1,1));
  float k = dot(hg(i + vec3(1,1,1)), f - vec3(1,1,1));
  return mix(mix(mix(a, b, w.x), mix(c, d, w.x), w.y), mix(mix(e, g, w.x), mix(h, k, w.x), w.y), w.z);
}
float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * gnoise(p); p = p * 2.02 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s * 1.6; }
`;

const SKY_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform int uFace;
${NOISE}
vec3 faceDir(int f, vec2 uv){
  float sc = uv.x * 2.0 - 1.0, tc = uv.y * 2.0 - 1.0;
  if (f == 0) return vec3(1.0, -tc, -sc);
  if (f == 1) return vec3(-1.0, -tc, sc);
  if (f == 2) return vec3(sc, 1.0, tc);
  if (f == 3) return vec3(sc, -1.0, -tc);
  if (f == 4) return vec3(sc, -tc, 1.0);
  return vec3(-sc, -tc, -1.0);
}
vec3 skyCol(vec3 d){
  vec3 pole = normalize(vec3(-0.38, 0.86, 0.34));
  vec3 g0 = normalize(vec3(0.25, 0.1, -1.0));
  vec3 gc = normalize(g0 - pole * dot(g0, pole));
  float lat = dot(d, pole);
  vec3 dp = d - pole * lat;
  float lon = acos(clamp(dot(dp / max(length(dp), 1e-5), gc), -1.0, 1.0));
  float core = exp(-lat * lat / (2.0 * 0.075 * 0.075));
  float band = exp(-lat * lat / (2.0 * 0.21 * 0.21));
  float bulge = exp(-lon * lon / (2.0 * 0.5 * 0.5)) * exp(-lat * lat / (2.0 * 0.15 * 0.15));
  float lonFall = 0.35 + 0.65 * exp(-lon * lon / (2.0 * 1.3 * 1.3));
  float n1 = fbm(d * 3.0 + 1.3) * 0.5 + 0.5;
  float n2 = fbm(d * 8.0 + 5.1) * 0.5 + 0.5;
  float n3 = fbm(d * 26.0 + 9.7) * 0.5 + 0.5;
  float clouds = (core * 1.3 + band * 0.32) * lonFall * (0.3 + 1.4 * n1 * n2) * (0.5 + 1.0 * n3);
  clouds += bulge * 1.7 * (0.55 + 0.7 * n2);
  float dn = fbm(d * 6.0 + 17.0) * 0.5 + 0.5;
  float off = lat - 0.014 * sin(lon * 7.0);
  float dust = smoothstep(0.42, 0.7, dn) * exp(-off * off / (2.0 * 0.045 * 0.045));
  dust = max(dust, 0.7 * smoothstep(0.52, 0.8, fbm(d * 15.0 + 3.0) * 0.5 + 0.5) * core);
  vec3 warm = vec3(1.0, 0.78, 0.56), cool = vec3(0.70, 0.79, 1.0);
  vec3 c = mix(cool, warm, clamp(bulge * 1.5 + 0.2, 0.0, 1.0)) * clouds * (1.0 - 0.88 * dust);
  float neb = pow(max(fbm(d * 5.0 + 41.0) * 0.5 + 0.5 - 0.6, 0.0) * 3.2, 2.0) * band;
  c += vec3(1.0, 0.30, 0.36) * neb * 0.8;
  c += vec3(0.55, 0.6, 0.78) * 0.035;
  return c * 0.05;
}
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec3 d = normalize(faceDir(uFace, vUv));
  vec3 c = skyCol(d);
  vec3 e = (log2(max(c, vec3(1e-7))) + 16.0) / 18.0;
  e += (h12(gl_FragCoord.xy + float(uFace) * 37.0) - 0.5) / 255.0;
  o = vec4(clamp(e, 0.0, 1.0), 1.0);
}`;

