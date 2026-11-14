/**
 * GLSL del tunel. Sin luces en tiempo real ni postprocesado: la iluminacion de
 * paredes, techo y suelo se calcula de forma analitica a partir de la posicion
 * (los marcos LED se repiten cada `uSpacing` metros), y el resplandor del neon
 * son planos aditivos. Asi el coste por pixel es bajo y estable en movil.
 */

const FOG = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uTime;

float fogAmount(float dist) {
  return 1.0 - exp(-uFogDensity * dist);
}
`

/** Luz que los LED vuelcan sobre las superficies del tunel. */
const LIGHTING = /* glsl */ `
#define PALN 4
uniform vec3 uPalL[PALN];
uniform vec3 uPalR[PALN];
uniform float uZ0;
uniform float uSpacing;
uniform float uFrames;
uniform float uHalfW;
uniform float uH;
uniform float uLightGain;
uniform float uStripX;
uniform vec3 uStripColor;
uniform vec2 uStripZ;
uniform vec3 uBarColor;
uniform vec3 uBarPos;
uniform float uBarHalf;

vec3 palL(float k) { return uPalL[int(mod(k + 0.5, float(PALN)))]; }
vec3 palR(float k) { return uPalR[int(mod(k + 0.5, float(PALN)))]; }

// Nucleo cercano intenso + cola larga y suave.
float fall(float d2) {
  return 1.0 / (1.0 + d2 * 3.0) + 0.07 / (1.0 + d2 * 0.22);
}

// Onda lenta que recorre el tunel: los LED "respiran".
float pulse(float k) {
  return 0.92 + 0.08 * sin(k * 0.9 - uTime * 1.6);
}

vec3 frameLight(vec3 P) {
  float k0 = floor((uZ0 - P.z) / uSpacing + 0.5);
  float mx = clamp(P.x / (2.0 * uHalfW) + 0.5, 0.0, 1.0);
  float xl = P.x + uHalfW;
  float xr = uHalfW - P.x;
  float yt = uH - P.y;
  vec3 acc = vec3(0.0);
  for (int i = -1; i <= 1; i++) {
    float k = k0 + float(i);
    float on = step(-0.5, k) * step(k, uFrames - 0.5);
    float dz = P.z - (uZ0 - k * uSpacing);
    float dz2 = dz * dz;
    float win = 1.0 - smoothstep(0.85 * uSpacing, 1.5 * uSpacing, abs(dz));
    vec3 cL = palL(k);
    vec3 cR = palR(k);
    vec3 cT = mix(cL, cR, mx);
    acc += on * win * pulse(k) * (
      cL * fall(xl * xl + dz2) +
      cR * fall(xr * xr + dz2) +
      cT * fall(yt * yt + dz2)
    );
  }
  return acc;
}

vec3 stripLight(vec3 P) {
  float inZ = smoothstep(uStripZ.y - 1.0, uStripZ.y + 1.0, P.z) *
    (1.0 - smoothstep(uStripZ.x - 1.0, uStripZ.x + 1.0, P.z));
  float dl = P.x + uStripX;
  float dr = P.x - uStripX;
  float y2 = P.y * P.y;
  return uStripColor * inZ * 0.55 * (fall((dl * dl + y2) * 1.8) + fall((dr * dr + y2) * 1.8));
}

vec3 barLight(vec3 P) {
  float dz = P.z - uBarPos.z;
  float dy = P.y - uBarPos.y;
  float dx = max(abs(P.x) - uBarHalf, 0.0);
  float d2 = dz * dz + dy * dy + dx * dx;
  return uBarColor * (1.2 / (1.0 + d2 * 1.3) + 0.22 / (1.0 + d2 * 0.07));
}

vec3 sceneLight(vec3 P) {
  return uLightGain * (frameLight(P) + stripLight(P) + barLight(P));
}
`

/* ----------------------------- Tubos LED ----------------------------- */

export const TUBE_VERTEX = /* glsl */ `
attribute vec3 aColorA;
attribute vec3 aColorB;
attribute float aPhase;
uniform float uPixelWorld;
uniform float uMinPx;
uniform float uTime;
varying vec3 vColor;
varying vec3 vLocal;
varying float vDist;
varying float vGain;

void main() {
  vec4 center = modelMatrix * instanceMatrix * vec4(position.x, 0.0, 0.0, 1.0);
  float dist = distance(center.xyz, cameraPosition);
  // Grosor minimo en pantalla: a lo lejos el tubo no baja de ~1.5 px, asi no
  // parpadea ni desaparece al avanzar.
  float thickness = length(instanceMatrix[1].xyz);
  float grow = max(1.0, uMinPx * uPixelWorld * dist / thickness);
  vec3 p = position;
  p.yz *= grow;
  vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vLocal = position;
  vColor = mix(aColorA, aColorB, position.x + 0.5);
  vDist = dist;
  vGain = (0.92 + 0.08 * sin(aPhase * 0.9 - uTime * 1.6)) / mix(1.0, grow, 0.35);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const TUBE_FRAGMENT = /* glsl */ `
${FOG}
varying vec3 vColor;
varying vec3 vLocal;
varying float vDist;
varying float vGain;

void main() {
  float across = min(abs(vLocal.y), abs(vLocal.z)) * 2.0;
  float core = 1.0 - across * across;
  vec3 col = mix(vColor * 1.55, vec3(1.0), 0.6 * core * core * core) * vGain;
  col = mix(col, uFogColor, fogAmount(vDist) * 0.6);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

/* --------------------------- Halos del neon --------------------------- */

export const HALO_VERTEX = /* glsl */ `
attribute vec3 aColorA;
attribute vec3 aColorB;
attribute float aPhase;
attribute float aGain;
attribute float aCore;
attribute vec2 aSize;
uniform float uHaloSpread;
uniform float uTime;
varying vec2 vUv;
varying vec3 vColor;
varying float vDist;
varying float vGain;
varying float vCore;
varying vec2 vSize;

void main() {
  vec4 center = modelMatrix * instanceMatrix * vec4(position.x, 0.0, 0.0, 1.0);
  float dist = distance(center.xyz, cameraPosition);
  // La niebla dispersa la luz: cuanto mas lejos, mas ancho el resplandor.
  vec3 p = position;
  p.y *= 1.0 + dist * uHaloSpread;
  vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vUv = uv;
  vColor = mix(aColorA, aColorB, uv.x);
  vDist = dist;
  vGain = aGain * (0.9 + 0.1 * sin(aPhase * 0.9 - uTime * 1.6));
  vCore = aCore;
  vSize = aSize;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const HALO_FRAGMENT = /* glsl */ `
${FOG}
uniform float uHaloGain;
varying vec2 vUv;
varying vec3 vColor;
varying float vDist;
varying float vGain;
varying float vCore;
varying vec2 vSize;

void main() {
  // Distancia al tubo en forma de capsula: el resplandor envuelve tambien
  // los extremos en vez de cortarse en un rectangulo.
  vec2 p = vec2((vUv.x - 0.5) * (vSize.x + vSize.y), (vUv.y - 0.5) * vSize.y);
  float along = max(abs(p.x) - vSize.x * 0.5, 0.0);
  float v = min(length(vec2(along, p.y)) / (vSize.y * 0.5), 1.0);
  float glow = exp(-v * v * 7.0) * 0.26 + exp(-v * v * 80.0) * 0.45 * vCore;
  glow *= smoothstep(1.0, 0.5, v);
  float fog = fogAmount(vDist);
  vec3 col = vColor * glow * vGain * uHaloGain * (1.0 - fog * 0.86);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

/* ------------------------- Resplandor del fondo ------------------------ */

export const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
varying float vDist;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vUv = uv;
  vDist = distance(world.xyz, cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const GLOW_FRAGMENT = /* glsl */ `
${FOG}
uniform vec3 uGlowA;
uniform vec3 uGlowB;
uniform float uGlowGain;
varying vec2 vUv;
varying float vDist;

void main() {
  vec2 q = (vUv - 0.5) * 2.0;
  float r2 = dot(q, q);
  float g = exp(-r2 * 3.2) * 0.75 + exp(-r2 * 14.0) * 0.6;
  g *= smoothstep(1.0, 0.55, sqrt(r2));
  vec3 col = mix(uGlowA, uGlowB, smoothstep(-0.6, 0.6, q.x)) * g * uGlowGain;
  col *= 1.0 - fogAmount(vDist) * 0.35;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

/* ----------------------- Paredes, techo y tarima ----------------------- */

export const SURFACE_VERTEX = /* glsl */ `
uniform float uNormalSign;
varying vec3 vWorld;
varying vec3 vN;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal) * uNormalSign;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const SHELL_FRAGMENT = /* glsl */ `
${FOG}
${LIGHTING}
uniform sampler2D uNoise;
uniform vec2 uPanel;
uniform float uAmbient;
uniform float uStreak;
uniform float uAlbedo;
varying vec3 vWorld;
varying vec3 vN;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 P = vWorld;
  vec3 N = normalize(vN);
  vec3 d = P - cameraPosition;
  float dist = length(d);
  vec3 light = uAmbient + sceneLight(P);
  vec3 col;

  if (abs(N.x) > 0.5) {
    // Paredes laterales: paneles oscuros satinados.
    vec2 g = vec2(P.z / uPanel.x, P.y / uPanel.y);
    vec2 cell = fract(g);
    vec2 fw = fwidth(g) * 1.5 + 0.012;
    float seam =
      smoothstep(0.0, fw.x, cell.x) * smoothstep(0.0, fw.x, 1.0 - cell.x) *
      smoothstep(0.0, fw.y, cell.y) * smoothstep(0.0, fw.y, 1.0 - cell.y);
    float r = hash21(floor(g) + (N.x > 0.0 ? 17.0 : 3.0));
    float grain = texture2D(uNoise, vec2(P.z, P.y) * 0.21).r;
    vec3 albedo = vec3(0.020, 0.021, 0.034) * uAlbedo * (0.5 + 0.7 * r) * (0.7 + 0.6 * grain);
    col = albedo * light * mix(0.22, 1.0, seam);

    // Reflejo especular de los tubos de la pared de enfrente: se calcula
    // donde el rayo reflejado cruza el plano opuesto y el marco mas cercano.
    float s = (2.0 * uHalfW) / max(abs(d.x), 0.05);
    float zh = P.z + d.z * s;
    float yh = P.y + d.y * s;
    float kf = (uZ0 - zh) / uSpacing;
    float k = floor(kf + 0.5);
    float dzh = (kf - k) * uSpacing;
    float on = step(-0.5, k) * step(k, uFrames - 0.5) * smoothstep(0.0, 0.6, yh) * smoothstep(uH, uH - 0.6, yh);
    float path = dist * (1.0 + s);
    float w = 0.09 + path * 0.011 * (1.4 - r);
    float streak = exp(-(dzh * dzh) / (w * w)) * (0.09 / w);
    vec3 cOpp = N.x > 0.0 ? palR(k) : palL(k);
    float fres = 0.05 + 0.95 * pow(1.0 - abs(dot(d / dist, N)), 3.0);
    col += cOpp * streak * on * (0.35 + 0.65 * r) * fres * uStreak * seam * exp(-uFogDensity * path * 0.5);
  } else if (abs(N.y) > 0.5) {
    // Techo y tapa de la tarima: mate.
    float grain = texture2D(uNoise, P.xz * 0.19).r;
    vec3 albedo = vec3(0.014, 0.015, 0.024) * uAlbedo * (0.65 + 0.7 * grain);
    col = albedo * light;
  } else {
    // Pared del fondo y frontales.
    vec2 g = vec2(P.x / uPanel.x, P.y / uPanel.y);
    vec2 cell = fract(g);
    vec2 fw = fwidth(g) * 1.5 + 0.012;
    float seam =
      smoothstep(0.0, fw.x, cell.x) * smoothstep(0.0, fw.x, 1.0 - cell.x) *
      smoothstep(0.0, fw.y, cell.y) * smoothstep(0.0, fw.y, 1.0 - cell.y);
    float r = hash21(floor(g) + 41.0);
    vec3 albedo = vec3(0.015, 0.016, 0.027) * uAlbedo * (0.65 + 0.5 * r);
    col = albedo * light * mix(0.5, 1.0, seam);
  }

  col = mix(col, uFogColor, fogAmount(dist));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

/* ------------------------------- Suelo -------------------------------- */

export const FLOOR_FRAGMENT = /* glsl */ `
${FOG}
${LIGHTING}
uniform sampler2D uNoise;
uniform sampler2D uReflection;
uniform vec2 uResolution;
uniform float uAmbient;
uniform float uReflGain;
uniform float uReflLod;
varying vec3 vWorld;
varying vec3 vN;

void main() {
  vec3 P = vWorld;
  vec3 toCam = cameraPosition - P;
  float dist = length(toCam);
  vec3 V = toCam / dist;

  // Asfalto mojado: charcos (reflejo nitido) y zonas humedas (reflejo roto).
  vec4 n1 = texture2D(uNoise, P.xz * 0.085);
  vec4 n2 = texture2D(uNoise, P.xz * 0.36 + vec2(0.37, 0.11));
  vec4 n3 = texture2D(uNoise, P.xz * 1.7 + vec2(0.13, 0.71));
  float wet = smoothstep(0.36, 0.64, n1.g * 0.7 + n2.g * 0.3);
  float rough = clamp(mix(0.6, 0.05, wet) + (n3.r - 0.5) * 0.16 * (1.0 - wet), 0.0, 1.0);
  vec2 bump = (n2.ba - 0.5) * mix(1.0, 0.22, wet) + (n3.ba - 0.5) * 0.55 * (1.0 - wet);

  // El reflejo se renderiza con la misma camara y la escena espejada, asi que
  // basta con leerlo en la posicion de pantalla del propio fragmento.
  vec2 uv = gl_FragCoord.xy / uResolution;
  float persp = 1.0 / (1.0 + dist * 0.14);
  vec2 warp = bump * vec2(0.022, 0.085) * persp;
  float lod = rough * uReflLod;
  vec3 refl = textureLod(uReflection, uv + warp, lod).rgb;
  // Estela vertical tipica de las luces sobre suelo mojado.
  refl += textureLod(uReflection, uv + warp + vec2(0.0, 0.040 * persp), lod + 1.2).rgb * 0.55;
  refl += textureLod(uReflection, uv + warp - vec2(0.0, 0.032 * persp), lod + 1.2).rgb * 0.40;
  refl /= 1.95;

  float fres = 0.035 + 0.965 * pow(1.0 - max(V.y, 0.0), 4.0);
  float mirror = mix(0.32, 1.0, wet) * mix(0.3, 1.0, fres);

  vec3 albedo = vec3(0.012, 0.013, 0.020) * (0.45 + 1.1 * n3.r) * mix(1.0, 0.35, wet);
  vec3 col = albedo * (uAmbient + sceneLight(P)) + refl * mirror * uReflGain;

  col = mix(col, uFogColor, fogAmount(dist));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

/* -------------------------------- Humo -------------------------------- */

export const SMOKE_VERTEX = /* glsl */ `
attribute float aSeed;
attribute vec3 aColorA;
attribute vec3 aColorB;
varying vec2 vUv;
varying float vSeed;
varying vec3 vColorA;
varying vec3 vColorB;
varying float vDist;

void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vUv = uv;
  vSeed = aSeed;
  vColorA = aColorA;
  vColorB = aColorB;
  vDist = distance(world.xyz, cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const SMOKE_FRAGMENT = /* glsl */ `
${FOG}
uniform sampler2D uNoise;
uniform float uSmokeGain;
varying vec2 vUv;
varying float vSeed;
varying vec3 vColorA;
varying vec3 vColorB;
varying float vDist;

void main() {
  vec2 q = vec2(vUv.x * 1.25 + vSeed * 7.31 + uTime * 0.010, vUv.y * 0.5 + vSeed * 3.17 - uTime * 0.004);
  float n = texture2D(uNoise, q).r;
  float m = texture2D(uNoise, q * 2.6 + vec2(-uTime * 0.013, 0.2)).r;
  float dens = smoothstep(0.38, 0.9, n * 0.65 + m * 0.35);
  float low = pow(1.0 - vUv.y, 1.7) * smoothstep(0.0, 0.16, vUv.y);
  low *= smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
  // Se desvanece al acercarse la camara para no "atravesar" un plano.
  float near = smoothstep(1.2, 6.5, vDist);
  float far = 1.0 - fogAmount(vDist) * 0.6;
  vec3 tint = mix(vColorA, vColorB, smoothstep(0.15, 0.85, vUv.x));
  vec3 col = tint * dens * low * near * far * uSmokeGain;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

/* -------------------------------- Polvo -------------------------------- */

export const DUST_VERTEX = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uDustSize;
varying float vAlpha;

void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.11 + aSeed * 40.0) * 0.25;
  p.y += sin(uTime * 0.07 + aSeed * 71.0) * 0.2;
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  gl_PointSize = clamp(uDustSize / max(depth, 0.1), 1.0, 16.0);
  vAlpha = smoothstep(0.4, 2.2, depth) * (1.0 - smoothstep(22.0, 55.0, depth)) * (0.35 + 0.65 * fract(aSeed * 13.7));
  gl_Position = projectionMatrix * mv;
}
`

export const DUST_FRAGMENT = /* glsl */ `
uniform vec3 uDustColor;
varying float vAlpha;

void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, r) * vAlpha;
  gl_FragColor = vec4(uDustColor * a, 1.0);
  #include <colorspace_fragment>
}
`
