/**
 * WebGL2-Renderer: Gelaende, Wasser, Himmel (Sonne, Mond, Sterne), Blockumriss.
 *
 * Alle Koordinaten werden relativ zur Kamera an die Grafikkarte gegeben. So bleiben
 * die Floats auch weit weg vom Ursprung genau – sonst wackelt das Bild.
 */

import { CS, CH } from './world.js';
import { FLOATS, meshChunk } from './mesher.js';
import { buildAtlas } from './atlas.js';

/* ------------------------------------------------------------- Matrizen -- */

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}

/** Spaltenweise Multiplikation a * b. */
function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
}

/** Nur die Drehung der Kamera (ohne Verschiebung). */
function viewRotation(yaw, pitch) {
  const cp = Math.cos(pitch);
  const f = [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
  // right = f x up(0,1,0)
  let r = [-f[2], 0, f[0]];
  const rl = Math.hypot(r[0], r[2]) || 1;
  r = [r[0] / rl, 0, r[2] / rl];
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  // Zeilen: right, up, -forward.
  return new Float32Array([
    r[0],
    u[0],
    -f[0],
    0,
    r[1],
    u[1],
    -f[1],
    0,
    r[2],
    u[2],
    -f[2],
    0,
    0,
    0,
    0,
    1,
  ]);
}

function rotZ(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

/** Sechs Frustum-Ebenen aus einer Clip-Matrix. */
function frustumPlanes(m) {
  const row = (i) => [m[i], m[i + 4], m[i + 8], m[i + 12]];
  const r0 = row(0);
  const r1 = row(1);
  const r2 = row(2);
  const r3 = row(3);
  const add = (a, b, s) => a.map((v, i) => v + s * b[i]);
  return [
    add(r3, r0, 1),
    add(r3, r0, -1),
    add(r3, r1, 1),
    add(r3, r1, -1),
    add(r3, r2, 1),
    add(r3, r2, -1),
  ];
}

function boxVisible(planes, min, max) {
  for (const p of planes) {
    const x = p[0] > 0 ? max[0] : min[0];
    const y = p[1] > 0 ? max[1] : min[1];
    const z = p[2] > 0 ? max[2] : min[2];
    if (p[0] * x + p[1] * y + p[2] * z + p[3] < 0) return false;
  }
  return true;
}

/* -------------------------------------------------------------- Shader -- */

const TERRAIN_VS = `#version 300 es
in vec3 a_pos; in vec2 a_uv; in vec2 a_light;
uniform mat4 u_vp; uniform vec3 u_off;
out vec2 v_uv; out vec2 v_light; out float v_dist;
void main() {
  vec3 p = a_pos + u_off;
  gl_Position = u_vp * vec4(p, 1.0);
  v_uv = a_uv; v_light = a_light; v_dist = length(p);
}`;

const TERRAIN_FS = `#version 300 es
precision highp float;
in vec2 v_uv; in vec2 v_light; in float v_dist;
uniform sampler2D u_tex;
uniform float u_day; uniform vec3 u_fog; uniform vec2 u_fogRange;
out vec4 o;
void main() {
  vec4 t = texture(u_tex, v_uv);
  if (t.a < 0.05) discard;
  float lit = v_light.y > 1.5 ? 1.0 : mix(0.16, 1.0, v_light.y * u_day);
  vec3 tint = mix(vec3(0.55, 0.65, 1.0), vec3(1.0), u_day);
  vec3 c = t.rgb * v_light.x * lit * (v_light.y > 1.5 ? vec3(1.0) : tint);
  float f = clamp((v_dist - u_fogRange.x) / (u_fogRange.y - u_fogRange.x), 0.0, 1.0);
  o = vec4(mix(c, u_fog, f), t.a);
}`;

const FLAT_VS = `#version 300 es
in vec3 a_pos;
uniform mat4 u_vp; uniform vec3 u_off; uniform float u_size;
void main() { gl_Position = u_vp * vec4(a_pos + u_off, 1.0); gl_PointSize = u_size; }`;

const FLAT_FS = `#version 300 es
precision mediump float;
uniform vec4 u_color; out vec4 o;
void main() { o = u_color; }`;

const SKY_VS = `#version 300 es
in vec3 a_pos; in vec2 a_uv;
uniform mat4 u_vp; out vec2 v_uv;
void main() { gl_Position = u_vp * vec4(a_pos, 1.0); v_uv = a_uv; }`;

const SKY_FS = `#version 300 es
precision mediump float;
in vec2 v_uv; uniform sampler2D u_tex; uniform float u_alpha; out vec4 o;
void main() { vec4 t = texture(u_tex, v_uv); o = vec4(t.rgb, t.a * u_alpha); }`;

function program(gl, vs, fs) {
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const uniforms = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    uniforms[info.name] = gl.getUniformLocation(p, info.name);
  }
  return { p, u: uniforms };
}

/* ------------------------------------------------------------ Himmel -- */

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Tageszeit (0..23999, 0 = Sonnenaufgang) -> Licht, Himmelsfarbe, Sonnenrichtung. */
export function skyState(time) {
  const a = (time / 24000) * Math.PI * 2;
  const s = Math.sin(a);
  const day = smooth(-0.14, 0.22, s);
  const dusk = Math.max(0, 1 - Math.abs(s) / 0.28);
  const night = [0.025, 0.035, 0.09];
  const noon = [0.47, 0.66, 1.0];
  const glow = [0.95, 0.52, 0.34];
  const col = [0, 1, 2].map((i) => lerp(lerp(night[i], noon[i], day), glow[i], dusk * 0.45));
  const dir = [Math.cos(a), Math.sin(a), 0.25];
  const l = Math.hypot(...dir);
  return {
    angle: a,
    day: 0.14 + 0.86 * day,
    nightness: 1 - day,
    color: col,
    sun: dir.map((v) => v / l),
  };
}

function makeSunTexture(gl, kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  if (kind === 'sun') {
    g.fillStyle = '#fff7c2';
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#ffe36b';
    g.fillRect(0, 0, 16, 2);
    g.fillRect(0, 14, 16, 2);
    g.fillRect(0, 0, 2, 16);
    g.fillRect(14, 0, 2, 16);
  } else {
    g.fillStyle = '#dfe5ee';
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#b3bccb';
    for (const [x, y, w, h] of [
      [3, 3, 4, 3],
      [9, 7, 4, 4],
      [4, 10, 3, 3],
    ])
      g.fillRect(x, y, w, h);
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/* ---------------------------------------------------------- Renderer -- */

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return null;

  const terrain = program(gl, TERRAIN_VS, TERRAIN_FS);
  const flat = program(gl, FLAT_VS, FLAT_FS);
  const skyProg = program(gl, SKY_VS, SKY_FS);

  // Atlas.
  const atlasTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buildAtlas());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const sunTex = makeSunTexture(gl, 'sun');
  const moonTex = makeSunTexture(gl, 'moon');

  // Terrain-VAOs werden pro Chunk angelegt.
  const terrainLoc = {
    pos: gl.getAttribLocation(terrain.p, 'a_pos'),
    uv: gl.getAttribLocation(terrain.p, 'a_uv'),
    light: gl.getAttribLocation(terrain.p, 'a_light'),
  };

  function uploadMesh(data) {
    if (!data.length) return null;
    const vao = gl.createVertexArray();
    const buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const stride = FLOATS * 4;
    gl.enableVertexAttribArray(terrainLoc.pos);
    gl.vertexAttribPointer(terrainLoc.pos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(terrainLoc.uv);
    gl.vertexAttribPointer(terrainLoc.uv, 2, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(terrainLoc.light);
    gl.vertexAttribPointer(terrainLoc.light, 2, gl.FLOAT, false, stride, 20);
    gl.bindVertexArray(null);
    return { vao, buf, count: data.length / FLOATS };
  }

  function freeMesh(m) {
    if (!m) return;
    for (const part of [m.solid, m.water]) {
      if (!part) continue;
      gl.deleteVertexArray(part.vao);
      gl.deleteBuffer(part.buf);
    }
  }

  /** Kleine geteilte Puffer fuer Linien, Wuerfel und Sterne. */
  const flatLoc = gl.getAttribLocation(flat.p, 'a_pos');
  const makeFlat = (data, usage = gl.STATIC_DRAW) => {
    const vao = gl.createVertexArray();
    const buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.enableVertexAttribArray(flatLoc);
    gl.vertexAttribPointer(flatLoc, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return { vao, buf };
  };

  const E = 0.003;
  const cubeLines = [];
  const cubeTris = [];
  {
    const c = [];
    for (let i = 0; i < 8; i++)
      c.push([
        (i & 1) * (1 + 2 * E) - E,
        ((i >> 1) & 1) * (1 + 2 * E) - E,
        ((i >> 2) & 1) * (1 + 2 * E) - E,
      ]);
    for (const [a, b] of [
      [0, 1],
      [2, 3],
      [4, 5],
      [6, 7],
      [0, 2],
      [1, 3],
      [4, 6],
      [5, 7],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ])
      cubeLines.push(...c[a], ...c[b]);
    for (const q of [
      [0, 1, 3, 2],
      [4, 6, 7, 5],
      [0, 4, 5, 1],
      [2, 3, 7, 6],
      [0, 2, 6, 4],
      [1, 5, 7, 3],
    ]) {
      for (const i of [0, 1, 2, 0, 2, 3]) cubeTris.push(...c[q[i]]);
    }
  }
  const linesBuf = makeFlat(new Float32Array(cubeLines));
  const trisBuf = makeFlat(new Float32Array(cubeTris));

  // Sterne: gleichmaessig auf der Kugel verteilt.
  const starData = [];
  let seed = 12345;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 380; i++) {
    const z = rnd() * 2 - 1;
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    starData.push(Math.cos(a) * r * 100, Math.sin(a) * r * 100, z * 100);
  }
  const stars = makeFlat(new Float32Array(starData));

  const quad = makeSkyQuad();
  function makeSkyQuad() {
    const vao = gl.createVertexArray();
    const buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, 30 * 4, gl.DYNAMIC_DRAW);
    const pos = gl.getAttribLocation(skyProg.p, 'a_pos');
    const uv = gl.getAttribLocation(skyProg.p, 'a_uv');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    gl.bindVertexArray(null);
    return { vao, buf };
  }

  function drawBody(dir, size, tex, vp) {
    // Unter dem Horizont blenden Sonne und Mond aus, damit sie nicht durch die Ferne scheinen.
    const alpha = smooth(-0.12, 0.04, dir[1]);
    if (alpha <= 0) return;
    // Basis senkrecht zur Richtung.
    let r = [dir[1], -dir[0], 0]; // dir x (0,0,1)
    const rl = Math.hypot(r[0], r[1]) || 1;
    r = r.map((v) => v / rl);
    const u = [
      dir[1] * r[2] - dir[2] * r[1],
      dir[2] * r[0] - dir[0] * r[2],
      dir[0] * r[1] - dir[1] * r[0],
    ];
    const c = dir.map((v) => v * 100);
    const p = (a, b) => [
      c[0] + r[0] * a * size + u[0] * b * size,
      c[1] + r[1] * a * size + u[1] * b * size,
      c[2] + r[2] * a * size + u[2] * b * size,
    ];
    const v = [p(-1, -1), p(1, -1), p(1, 1), p(-1, 1)];
    const uvs = [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ];
    const data = [];
    for (const i of [0, 1, 2, 0, 2, 3]) data.push(...v[i], ...uvs[i]);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(data));
    gl.uniformMatrix4fv(skyProg.u.u_vp, false, vp);
    gl.uniform1f(skyProg.u.u_alpha, alpha);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.bindVertexArray(quad.vao);
    gl.disable(gl.CULL_FACE);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  let proj = null;
  let projKey = '';
  const stats = { drawn: 0, meshed: 0, verts: 0 };

  return {
    gl,
    stats,

    resize(w, h) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    },

    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },

    freeChunk(chunk) {
      freeMesh(chunk.mesh);
      chunk.mesh = null;
    },

    /** Baut veraltete Chunk-Netze neu, hoechstens `maxMs` Millisekunden lang. */
    buildMeshes(world, wanted, maxMs) {
      const t0 = performance.now();
      let built = 0;
      for (const { cx, cz } of wanted) {
        const c = world.getChunk(cx, cz);
        if (!c || !c.ready || !c.dirty) continue;
        let ok = true;
        for (let dz = -1; dz <= 1 && ok; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const n = world.getChunk(cx + dx, cz + dz);
            if (!n || !n.ready) {
              ok = false;
              break;
            }
          }
        }
        if (!ok) continue;
        const data = meshChunk(world, c);
        freeMesh(c.mesh);
        c.mesh = { solid: uploadMesh(data.solid), water: uploadMesh(data.water) };
        c.dirty = false;
        built++;
        if (performance.now() - t0 > maxMs) break;
      }
      return built;
    },

    /**
     * Zeichnet ein Bild.
     * @param view {x,y,z,yaw,pitch,fov}  Kameraposition (Auge) und Blick
     * @param opts {sky, renderDistance, underwater, target, breakProgress}
     */
    draw(world, view, opts) {
      const { sky, underwater } = opts;
      const w = canvas.width;
      const h = canvas.height;
      const key = `${w}x${h}x${view.fov}`;
      if (key !== projKey) {
        proj = perspective((view.fov * Math.PI) / 180, w / h, 0.05, 900);
        projKey = key;
      }
      const vp = mul(proj, viewRotation(view.yaw, view.pitch));
      const planes = frustumPlanes(vp);

      const fogColor = underwater
        ? [0.1, 0.22, 0.5].map((v) => v * (0.4 + 0.6 * sky.day))
        : sky.color;
      const far = opts.renderDistance * CS;
      const fogRange = underwater ? [0, 22] : [far * 0.55, far - 6];

      gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);

      // Sterne, Sonne, Mond (ohne Tiefentest, ganz hinten).
      if (!underwater) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        if (sky.nightness > 0.05) {
          gl.useProgram(flat.p);
          gl.uniformMatrix4fv(flat.u.u_vp, false, mul(vp, rotZ(sky.angle)));
          gl.uniform3f(flat.u.u_off, 0, 0, 0);
          gl.uniform1f(flat.u.u_size, 2);
          const a = Math.max(0, sky.nightness - 0.3) * 1.4;
          gl.uniform4f(flat.u.u_color, 1, 1, 0.95, Math.min(1, a));
          gl.bindVertexArray(stars.vao);
          gl.drawArrays(gl.POINTS, 0, starData.length / 3);
        }
        gl.useProgram(skyProg.p);
        gl.uniform1i(skyProg.u.u_tex, 0);
        gl.activeTexture(gl.TEXTURE0);
        drawBody(sky.sun, 12, sunTex, vp);
        drawBody(
          sky.sun.map((v) => -v),
          10,
          moonTex,
          vp,
        );
        gl.disable(gl.BLEND);
      }

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      gl.useProgram(terrain.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.uniform1i(terrain.u.u_tex, 0);
      gl.uniformMatrix4fv(terrain.u.u_vp, false, vp);
      gl.uniform1f(terrain.u.u_day, sky.day);
      gl.uniform3f(terrain.u.u_fog, fogColor[0], fogColor[1], fogColor[2]);
      gl.uniform2f(terrain.u.u_fogRange, fogRange[0], fogRange[1]);

      // Sichtbare Chunks, von nah nach fern.
      const visible = [];
      for (const c of world.chunks.values()) {
        if (!c.mesh) continue;
        const ox = c.cx * CS - view.x;
        const oz = c.cz * CS - view.z;
        const oy = -view.y;
        if (!boxVisible(planes, [ox, oy, oz], [ox + CS, oy + CH, oz + CS])) continue;
        visible.push({ c, ox, oy, oz, d: ox * ox + oz * oz });
      }
      visible.sort((a, b) => a.d - b.d);

      let verts = 0;
      for (const v of visible) {
        const part = v.c.mesh.solid;
        if (!part) continue;
        gl.uniform3f(terrain.u.u_off, v.ox, v.oy, v.oz);
        gl.bindVertexArray(part.vao);
        gl.drawArrays(gl.TRIANGLES, 0, part.count);
        verts += part.count;
      }

      // Wasser: von fern nach nah, durchscheinend.
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.CULL_FACE);
      for (let i = visible.length - 1; i >= 0; i--) {
        const v = visible[i];
        const part = v.c.mesh.water;
        if (!part) continue;
        gl.uniform3f(terrain.u.u_off, v.ox, v.oy, v.oz);
        gl.bindVertexArray(part.vao);
        gl.drawArrays(gl.TRIANGLES, 0, part.count);
      }

      // Umriss und Risse am anvisierten Block.
      const t = opts.target;
      if (t) {
        gl.useProgram(flat.p);
        gl.uniformMatrix4fv(flat.u.u_vp, false, vp);
        gl.uniform3f(flat.u.u_off, t.x - view.x, t.y - view.y, t.z - view.z);
        if (opts.breakProgress > 0) {
          gl.uniform4f(flat.u.u_color, 0, 0, 0, 0.55 * opts.breakProgress);
          gl.bindVertexArray(trisBuf.vao);
          gl.drawArrays(gl.TRIANGLES, 0, 36);
        }
        gl.uniform4f(flat.u.u_color, 0, 0, 0, 0.7);
        gl.bindVertexArray(linesBuf.vao);
        gl.drawArrays(gl.LINES, 0, 24);
      }
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);

      stats.drawn = visible.length;
      stats.verts = verts;
    },
  };
}
