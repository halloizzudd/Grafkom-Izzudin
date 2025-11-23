"use strict";

// ==========================================
// 1. INITIALIZATION & MATH HELPER (NO LIBS)
// ==========================================
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

if (!gl) { alert("WebGL not supported"); throw new Error("No WebGL"); }

// Helper Matematika Matriks sederhana (karena tidak boleh pakai gl-matrix)
const M4 = {
  perspective: (fov, aspect, near, far) => {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, (2 * far * near) * nf, 0
    ];
  },
  identity: () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
  translate: (m, tx, ty, tz) => {
    const dst = [...m];
    dst[12] = m[0]*tx + m[4]*ty + m[8]*tz + m[12];
    dst[13] = m[1]*tx + m[5]*ty + m[9]*tz + m[13];
    dst[14] = m[2]*tx + m[6]*ty + m[10]*tz + m[14];
    dst[15] = m[3]*tx + m[7]*ty + m[11]*tz + m[15];
    return dst;
  },
  rotateY: (m, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const mv0=m[0], mv4=m[4], mv8=m[8];
    const mv2=m[2], mv6=m[6], mv10=m[10];
    const dst = [...m];
    dst[0] = c*mv0 + s*mv2;  dst[4] = c*mv4 + s*mv6;  dst[8] = c*mv8 + s*mv10;
    dst[2] = c*mv2 - s*mv0;  dst[6] = c*mv6 - s*mv4;  dst[10]= c*mv10- s*mv8;
    return dst;
  },
  rotateX: (m, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const mv1=m[1], mv5=m[5], mv9=m[9];
    const mv2=m[2], mv6=m[6], mv10=m[10];
    const dst = [...m];
    dst[1] = c*mv1 - s*mv2;  dst[5] = c*mv5 - s*mv6;  dst[9] = c*mv9 - s*mv10;
    dst[2] = c*mv2 + s*mv1;  dst[6] = c*mv6 + s*mv5;  dst[10]= c*mv10+ s*mv9;
    return dst;
  },
  multiply: (a, b) => {
    const dst = [];
    for(let i=0; i<16; i++) {
      const r = i % 4, c = Math.floor(i/4)*4;
      dst[i] = b[r]*a[c] + b[r+4]*a[c+1] + b[r+8]*a[c+2] + b[r+12]*a[c+3];
    }
    return dst;
  },
  // Menghitung Normal Matrix (Inverse Transpose dari 3x3 kiri atas)
  normalMat3: (m4) => {
    const a00=m4[0], a01=m4[1], a02=m4[2];
    const a10=m4[4], a11=m4[5], a12=m4[6];
    const a20=m4[8], a21=m4[9], a22=m4[10];
    const b01=a22*a11-a12*a21, b11=-a22*a10+a12*a20, b21=a21*a10-a11*a20;
    const det = a00*b01 + a01*b11 + a02*b21;
    if(!det) return [0,0,0,0,0,0,0,0,0];
    const idet = 1.0/det;
    return [
       b01*idet, (-a22*a01+a02*a21)*idet, (a12*a01-a02*a11)*idet,
       b11*idet, (a22*a00-a02*a20)*idet, (-a12*a00+a02*a10)*idet,
       b21*idet, (-a21*a00+a01*a20)*idet, (a11*a00-a01*a10)*idet
    ];
  }
};

// ==========================================
// 2. SHADER SETUP
// ==========================================
function createShader(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s); return null;
  }
  return s;
}

// Menggunakan variabel vs_lit dan fs_lit dari file shaders.js
const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vs_lit));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fs_lit));
gl.linkProgram(program);
gl.useProgram(program);

// Ambil lokasi attribute & uniform
const locs = {
  aPos: gl.getAttribLocation(program, "aPosition"),
  aNor: gl.getAttribLocation(program, "aNormal"),
  aCol: gl.getAttribLocation(program, "aColor"),
  uModel: gl.getUniformLocation(program, "uModel"),
  uView: gl.getUniformLocation(program, "uView"),
  uProj: gl.getUniformLocation(program, "uProj"),
  uNorm: gl.getUniformLocation(program, "uNormalMat"),
  uEye: gl.getUniformLocation(program, "uEye"),
  uLight: gl.getUniformLocation(program, "uLightDir"),
  uAmb: gl.getUniformLocation(program, "uAmbient")
};

// ==========================================
// 3. GEOMETRY GENERATION (Menggunakan glyph.js)
// ==========================================

// Generate Huruf I
const meshI_parts = [
  extrudePolygon(outlines.I_top, 0.4, [1.0, 0.7, 0.28]), // Orange Atas
  extrudePolygon(outlines.I_bot, 0.4, [1.0, 0.7, 0.28])  // Orange Bawah
];
const meshI = mergeMeshes(meshI_parts);

// Generate Huruf Z
const meshZ_parts = [
  extrudePolygon(outlines.Z_top, 0.4, [0.2, 0.9, 0.6]),
  extrudePolygon(outlines.Z_diag, 0.4, [0.2, 0.9, 0.6]),
  extrudePolygon(outlines.Z_bot, 0.4, [0.2, 0.9, 0.6])
];
const meshZ = mergeMeshes(meshZ_parts);

// Generate Angka 3
const mesh3_parts = [
  extrudePolygon(outlines['3_top'], 0.4, [0.4, 0.3, 1.0]),
  extrudePolygon(outlines['3_mid'], 0.4, [0.4, 0.3, 1.0]),
  extrudePolygon(outlines['3_bot'], 0.4, [0.4, 0.3, 1.0])
];
const mesh3 = mergeMeshes(mesh3_parts);

// Gabung SEMUA menjadi satu mesh besar agar draw call efisien
// Kita geser posisi vertex secara manual sebelum merge agar layoutnya rapi
function transformMesh(mesh, tx, ty) {
  for(let i=0; i<mesh.positions.length; i+=3) {
    mesh.positions[i] += tx;
    mesh.positions[i+1] += ty;
  }
  return mesh;
}

// Layout: I di kiri (-1.2), z di tengah (0), 3 di kanan (1.2)
transformMesh(meshI, -1.2, 0);
transformMesh(meshZ, -0.1, 0); // sedikit geser karena Z lebar
transformMesh(mesh3, 1.1, 0);

const finalMesh = mergeMeshes([meshI, meshZ, mesh3]);

// ==========================================
// 4. BUFFERING
// ==========================================
function createBuffer(data, type) {
  const buf = gl.createBuffer();
  gl.bindBuffer(type, buf);
  gl.bufferData(type, data, gl.STATIC_DRAW);
  return buf;
}

const posBuf = createBuffer(finalMesh.positions, gl.ARRAY_BUFFER);
const norBuf = createBuffer(finalMesh.normals, gl.ARRAY_BUFFER);
const colBuf = createBuffer(finalMesh.colors, gl.ARRAY_BUFFER);
const idxBuf = createBuffer(finalMesh.indices, gl.ELEMENT_ARRAY_BUFFER);
const indexCount = finalMesh.indices.length;

// ==========================================
// 5. INTERACTION STATE
// ==========================================
let state = {
  rotX: 0,
  rotY: 0,
  zoom: -4.5,
  dragging: false,
  lastX: 0,
  lastY: 0
};

canvas.addEventListener("mousedown", e => {
  state.dragging = true;
  state.lastX = e.clientX;
  state.lastY = e.clientY;
});
window.addEventListener("mouseup", () => state.dragging = false);
canvas.addEventListener("mousemove", e => {
  if(!state.dragging) return;
  const dx = e.clientX - state.lastX;
  const dy = e.clientY - state.lastY;
  state.rotY += dx * 0.01;
  state.rotX += dy * 0.01;
  state.lastX = e.clientX;
  state.lastY = e.clientY;
});
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  state.zoom += e.deltaY * 0.002;
  state.zoom = Math.min(-2, Math.max(-10, state.zoom));
});
canvas.addEventListener("dblclick", () => {
  state.rotX = 0; state.rotY = 0; state.zoom = -4.5;
});

// ==========================================
// 6. RENDER LOOP
// ==========================================
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

function render(time) {
  // Responsive canvas
  if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  gl.clearColor(0, 0, 0, 0); // Transparan agar background CSS terlihat
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // 1. Matrix Setup
  const aspect = canvas.width / canvas.height;
  const proj = M4.perspective(45 * Math.PI/180, aspect, 0.1, 100);
  
  // Kamera
  const view = M4.translate(M4.identity(), 0, 0, state.zoom);
  
  // Model Rotate (Global scene rotation)
  let model = M4.identity();
  model = M4.rotateX(model, state.rotX);
  model = M4.rotateY(model, state.rotY + time * 0.0005); // Sedikit auto-rotate

  // Normal Matrix
  const normMat = M4.normalMat3(model);

  // 2. Set Uniforms
  gl.uniformMatrix4fv(locs.uProj, false, proj);
  gl.uniformMatrix4fv(locs.uView, false, view);
  gl.uniformMatrix4fv(locs.uModel, false, model);
  gl.uniformMatrix3fv(locs.uNorm, false, normMat);
  
  gl.uniform3f(locs.uEye, 0, 0, -state.zoom); // Posisi mata relatif sederhana
  gl.uniform3f(locs.uLight, 0.5, 0.8, 1.0);   // Arah cahaya
  gl.uniform3f(locs.uAmb, 0.2, 0.2, 0.25);    // Ambient light

  // 3. Bind Attributes & Draw
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.vertexAttribPointer(locs.aPos, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(locs.aPos);

  gl.bindBuffer(gl.ARRAY_BUFFER, norBuf);
  gl.vertexAttribPointer(locs.aNor, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(locs.aNor);

  gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
  gl.vertexAttribPointer(locs.aCol, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(locs.aCol);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);