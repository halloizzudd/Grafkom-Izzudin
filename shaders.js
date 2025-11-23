// Vertex shader: position, normal, model/view/proj transforms
const vs_lit = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
uniform mat3 uNormalMat;

varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vColor;

void main(){
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vPos = worldPos.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  vColor = aColor;
  gl_Position = uProj * uView * worldPos;
}
`;

// Fragment shader: simple Blinn-Phong with ambient + rim (for better silhouette)
const fs_lit = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vColor;

uniform vec3 uEye;
uniform vec3 uLightDir;
uniform vec3 uAmbient;

void main(){
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uEye - vPos);
  vec3 H = normalize(L + V);

  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), 32.0);

  // rim lighting for glow
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);

  vec3 color = vColor * (uAmbient + diff * 0.9) + vec3(1.0)*spec*0.35 + vec3(0.2,0.25,0.6)*rim*0.35;
  gl_FragColor = vec4(color, 1.0);
}
`;

// Simple shader for star points (no lighting)
const vs_point = `
attribute vec3 aPosition;
uniform mat4 uView;
uniform mat4 uProj;
uniform float uPointSize;
void main(){
  gl_Position = uProj * uView * vec4(aPosition, 1.0);
  gl_PointSize = uPointSize;
}
`;
const fs_point = `
precision mediump float;
uniform vec3 uColor;
void main(){
  // soft circular point
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p,p);
  if(r > 1.0) discard;
  float alpha = smoothstep(1.0, 0.1, r);
  gl_FragColor = vec4(uColor, alpha);
}
`;
