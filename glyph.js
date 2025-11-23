// Simple glyph outlines in local 2D space (x,y). Each outline is CCW.
const outlines = {
  // Huruf I: Dipecah jadi 2 bagian (Atas & Bawah) agar tidak bolong
  I_top: [
    [-0.20, 0.45], [ 0.20, 0.45],  // Top bar width
    [ 0.20, 0.25], [ 0.06, 0.00],  // Neck inward
    [-0.06, 0.00], [-0.20, 0.25]   // Back to top
  ],
  I_bot: [
    [ 0.06, 0.00], [ 0.20,-0.25],  // Neck outward
    [ 0.20,-0.45], [-0.20,-0.45],  // Bottom bar
    [-0.20,-0.25], [-0.06, 0.00]   // Back to center
  ],

  // Huruf Z: 3 Bagian (Top, Diagonal, Bottom)
  Z_top:  [[-0.4, 0.35], [ 0.4, 0.35], [ 0.4, 0.20], [-0.4, 0.20]],
  Z_diag: [[ 0.25,0.20], [ 0.4, 0.20], [-0.25,-0.20],[-0.4,-0.20]], // Dipertebal
  Z_bot:  [[-0.4,-0.20], [ 0.4,-0.20], [ 0.4,-0.35], [-0.4,-0.35]],

  // Angka 3: 3 Bagian
  '3_top': [[-0.1, 0.35], [ 0.35, 0.35], [ 0.35, 0.18], [-0.05, 0.18]],
  '3_mid': [[ 0.05, 0.18], [ 0.35, 0.18], [ 0.35,-0.18], [ 0.05,-0.18]],
  '3_bot': [[-0.1,-0.35], [ 0.35,-0.35], [ 0.35,-0.18], [-0.05,-0.18]]
};

// Extrude a simple polygon outline into a thin mesh (front/back + sides).
// For our simple convex-ish polygons fan triangulation is acceptable.
function extrudePolygon(outline, depth, colorRGB){
  const verts = [], normals = [], cols = [], inds = [];
  // centroid
  let cx=0, cy=0;
  for(const p of outline){ cx += p[0]; cy += p[1]; }
  cx /= outline.length; cy /= outline.length;
  const half = depth/2;

  // front face (z = +half)
  const base = verts.length/3;
  for(const p of outline){ verts.push(p[0], p[1], half); normals.push(0,0,1); cols.push(colorRGB[0],colorRGB[1],colorRGB[2]) }
  verts.push(cx,cy,half); normals.push(0,0,1); cols.push(colorRGB[0],colorRGB[1],colorRGB[2]);
  const center = base + outline.length;
  for(let i=0;i<outline.length;i++){
    const a = base + i, b = base + ((i+1)%outline.length);
    inds.push(a,b,center);
  }

  // back face (z = -half)
  const baseb = verts.length/3;
  for(const p of outline){ verts.push(p[0], p[1], -half); normals.push(0,0,-1); cols.push(colorRGB[0]*0.9,colorRGB[1]*0.9,colorRGB[2]*0.9) }
  verts.push(cx,cy,-half); normals.push(0,0,-1); cols.push(colorRGB[0]*0.9,colorRGB[1]*0.9,colorRGB[2]*0.9);
  const centerb = baseb + outline.length;
  for(let i=0;i<outline.length;i++){
    const a = baseb + i, b = baseb + ((i+1)%outline.length);
    inds.push(b,a,centerb);
  }

  // sides
  for(let i=0;i<outline.length;i++){
    const p1 = outline[i], p2 = outline[(i+1)%outline.length];
    const idx = verts.length/3;
    verts.push(p1[0],p1[1],half);
    verts.push(p2[0],p2[1],half);
    verts.push(p2[0],p2[1],-half);
    verts.push(p1[0],p1[1],-half);
    // normal for side
    const ux = p2[0]-p1[0], uy = p2[1]-p1[1];
    let nx = uy, ny = -ux; const nlen = Math.hypot(nx,ny)||1; nx/=nlen; ny/=nlen;
    for(let k=0;k<4;k++){ normals.push(nx,ny,0); cols.push(colorRGB[0]*0.92,colorRGB[1]*0.92,colorRGB[2]*0.92) }
    inds.push(idx, idx+1, idx+2, idx, idx+2, idx+3);
  }

  return {
    positions: new Float32Array(verts),
    normals: new Float32Array(normals),
    colors: new Float32Array(cols),
    indices: new Uint16Array(inds)
  };
}

// Helper: merge multiple meshes (concat buffers, reindex)
function mergeMeshes(meshes){
  let pos = [], nor = [], col = [], idx = [];
  let offset = 0;
  for(const m of meshes){
    for(let i=0;i<m.positions.length;i++) pos.push(m.positions[i]);
    for(let i=0;i<m.normals.length;i++) nor.push(m.normals[i]);
    for(let i=0;i<m.colors.length;i++) col.push(m.colors[i]);
    for(let i=0;i<m.indices.length;i++) idx.push(m.indices[i] + offset);
    offset += m.positions.length/3;
  }
  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(nor),
    colors: new Float32Array(col),
    indices: new Uint16Array(idx)
  };
}
