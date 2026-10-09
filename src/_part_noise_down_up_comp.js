const NOISE_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
${NOISE}
void main(){
  float a = vUv.x * 6.2831853, r = vUv.y * 32.0;
  vec3 p = vec3(cos(a) * 1.8, sin(a) * 1.8, r * 1.3);
  float s = 0.0, amp = 0.6;
  for (int i = 0; i < 4; i++){ s += amp * gnoise(p); p = p * vec3(2.0, 2.0, 2.4) + vec3(3.1, 1.7, 5.3); amp *= 0.55; }
  float fine = gnoise(vec3(cos(a) * 0.9, sin(a) * 0.9, r * 10.0));
  o = vec4(clamp(s * 0.45 + 0.5, 0.0, 1.0), clamp(fine * 0.6 + 0.5, 0.0, 1.0), 0.0, 1.0);
}`;

const DOWN_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uTexel; uniform int uFirst;
vec3 S(vec2 d){ return texture(uSrc, vUv + d * uTexel).rgb; }
float kw(vec3 c){ return 1.0 / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722))); }
void main(){
  vec3 a = S(vec2(-2, 2)), b = S(vec2(0, 2)), c = S(vec2(2, 2));
  vec3 d = S(vec2(-2, 0)), e = S(vec2(0, 0)), f = S(vec2(2, 0));
  vec3 g = S(vec2(-2, -2)), h = S(vec2(0, -2)), i = S(vec2(2, -2));
  vec3 j = S(vec2(-1, 1)), k = S(vec2(1, 1)), l = S(vec2(-1, -1)), m = S(vec2(1, -1));
  vec3 r;
  if (uFirst == 1){
    vec3 g0 = (j + k + l + m) * 0.25, g1 = (a + b + d + e) * 0.25, g2 = (b + c + e + f) * 0.25, g3 = (d + e + g + h) * 0.25, g4 = (e + f + h + i) * 0.25;
    float w0 = kw(g0) * 0.5, w1 = kw(g1) * 0.125, w2 = kw(g2) * 0.125, w3 = kw(g3) * 0.125, w4 = kw(g4) * 0.125;
    r = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else {
    r = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  o = vec4(max(r, 0.0), 1.0);
}`;

const UP_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uTexel;
void main(){
  vec2 t = uTexel;
  vec3 s = texture(uSrc, vUv).rgb * 4.0;
  s += (texture(uSrc, vUv + vec2(-t.x, 0.0)).rgb + texture(uSrc, vUv + vec2(t.x, 0.0)).rgb + texture(uSrc, vUv + vec2(0.0, -t.y)).rgb + texture(uSrc, vUv + vec2(0.0, t.y)).rgb) * 2.0;
  s += texture(uSrc, vUv - t).rgb + texture(uSrc, vUv + t).rgb + texture(uSrc, vUv + vec2(-t.x, t.y)).rgb + texture(uSrc, vUv + vec2(t.x, -t.y)).rgb;
  o = vec4(s / 16.0, 1.0);
}`;

const COMP_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uScene, uBloom;
uniform float uExposure, uBloomAmt, uHdr, uTime;
const mat3 ACESIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
const mat3 ACESOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec3 c = texture(uScene, vUv).rgb;
  if (uHdr < 0.5) c = c * c * 16.0;
  else c = mix(c, texture(uBloom, vUv).rgb / 6.0, uBloomAmt);
  c *= uExposure;
  vec2 q = vUv - 0.5;
  c *= 1.0 - 0.45 * dot(q, q);
  vec3 ca = ACESOut * rrt(ACESIn * c);
  float L = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-6);
  vec3 lt = ACESOut * rrt(ACESIn * vec3(L));
  vec3 cl = c * (lt.g / L);
  c = mix(ca, cl / max(1.0, max(cl.r, max(cl.g, cl.b))), 0.62);
  c = srgb(clamp(c, 0.0, 1.0));
  c += (h12(gl_FragCoord.xy + fract(uTime * 0.37) * 911.0) - 0.5) / 255.0;
  o = vec4(c, 1.0);
}`;

