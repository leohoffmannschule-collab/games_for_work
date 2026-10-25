/**
 * Wuerfel-Modelle der Wesen und ihre Animation (Beine schwingen, Kopf folgt dem
 * Blick, Zombies strecken die Arme vor, Umkippen beim Tod). Reine Geometrie ohne
 * DOM; die Texturen zeichnet atlas.js in der Reihenfolge von ENTITY_TILES.
 *
 * Masse in Pixeln (1/16 Block), Ursprung = Mitte zwischen den Fuessen, vorn = -z.
 */

export const ENTITY_TILES = [
  'pig_skin',
  'pig_face',
  'pig_snout',
  'cow_hide',
  'cow_face',
  'horn',
  'wool',
  'sheep_face',
  'sheep_skin',
  'zombie_skin',
  'zombie_face',
  'zombie_shirt',
  'zombie_arm',
  'zombie_pants',
];
export const ENTITY_COLS = 4;
export const ENTITY_FLOATS = 8; // x y z u v r g b

const T = (name) => ENTITY_TILES.indexOf(name);
const part = (box, pivot, role, front, other = front) => ({
  box,
  pivot,
  role,
  front: T(front),
  other: T(other),
});

export const MODELS = {
  schwein: [
    part([-5, 6, -8, 5, 14, 8], [0, 10, 0], 'body', 'pig_skin'),
    part([-4, 8, -14, 4, 16, -6], [0, 12, -6], 'head', 'pig_face', 'pig_skin'),
    part([-2, 9, -15, 2, 12, -14], [0, 12, -6], 'head', 'pig_snout'),
    part([-5, 0, -7, -1, 6, -3], [-3, 6, -5], 'leg0', 'pig_skin'),
    part([1, 0, -7, 5, 6, -3], [3, 6, -5], 'leg1', 'pig_skin'),
    part([-5, 0, 3, -1, 6, 7], [-3, 6, 5], 'leg1', 'pig_skin'),
    part([1, 0, 3, 5, 6, 7], [3, 6, 5], 'leg0', 'pig_skin'),
  ],
  kuh: [
    part([-6, 12, -9, 6, 22, 9], [0, 17, 0], 'body', 'cow_hide'),
    part([-4, 16, -15, 4, 24, -9], [0, 20, -9], 'head', 'cow_face', 'cow_hide'),
    part([-5, 23, -12, -4, 26, -11], [0, 20, -9], 'head', 'horn'),
    part([4, 23, -12, 5, 26, -11], [0, 20, -9], 'head', 'horn'),
    part([-6, 0, -8, -2, 12, -4], [-4, 12, -6], 'leg0', 'cow_hide'),
    part([2, 0, -8, 6, 12, -4], [4, 12, -6], 'leg1', 'cow_hide'),
    part([-6, 0, 5, -2, 12, 9], [-4, 12, 7], 'leg1', 'cow_hide'),
    part([2, 0, 5, 6, 12, 9], [4, 12, 7], 'leg0', 'cow_hide'),
  ],
  schaf: [
    part([-5, 10, -8, 5, 20, 8], [0, 15, 0], 'body', 'wool'),
    part([-3, 14, -14, 3, 20, -6], [0, 17, -6], 'head', 'sheep_face', 'wool'),
    part([-5, 0, -7, -1, 10, -3], [-3, 10, -5], 'leg0', 'sheep_skin'),
    part([1, 0, -7, 5, 10, -3], [3, 10, -5], 'leg1', 'sheep_skin'),
    part([-5, 0, 3, -1, 10, 7], [-3, 10, 5], 'leg1', 'sheep_skin'),
    part([1, 0, 3, 5, 10, 7], [3, 10, 5], 'leg0', 'sheep_skin'),
  ],
  zombie: [
    part([-4, 12, -2, 4, 24, 2], [0, 18, 0], 'body', 'zombie_shirt'),
    part([-4, 24, -4, 4, 32, 4], [0, 24, 0], 'head', 'zombie_face', 'zombie_skin'),
    part([-8, 12, -2, -4, 24, 2], [-6, 22, 0], 'arm', 'zombie_arm'),
    part([4, 12, -2, 8, 24, 2], [6, 22, 0], 'arm', 'zombie_arm'),
    part([-4, 0, -2, 0, 12, 2], [-2, 12, 0], 'leg0', 'zombie_pants'),
    part([0, 0, -2, 4, 12, 2], [2, 12, 0], 'leg1', 'zombie_pants'),
  ],
};

/** Flaechen eines Quaders wie im Mesher (Ecken gegen den Uhrzeigersinn von aussen). */
const FACES = [
  {
    n: [1, 0, 0],
    c: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    n: [-1, 0, 0],
    c: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    n: [0, 1, 0],
    c: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    n: [0, -1, 0],
    c: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    n: [0, 0, 1],
    c: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    n: [0, 0, -1],
    c: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    front: true,
  },
];
const UV = [
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];
const ORDER = [0, 1, 2, 0, 2, 3];

const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const lerpAngle = (a, b, t) => a + wrap(b - a) * t;

// Zwei Lichtquellen wie bei Wesen im Vorbild, damit die Koerper Form bekommen.
const L0 = [0.2, 1, -0.7].map((v, _, a) => v / Math.hypot(...a));
const L1 = [-0.2, 1, 0.7].map((v, _, a) => v / Math.hypot(...a));
function faceShade(n) {
  const d0 = Math.max(0, n[0] * L0[0] + n[1] * L0[1] + n[2] * L0[2]);
  const d1 = Math.max(0, n[0] * L1[0] + n[1] * L1[1] + n[2] * L1[2]);
  return Math.min(1, 0.5 + 0.5 * (d0 + d1));
}

/** Dreht v um die X-, dann die Y-Achse (Winkel in Bogenmass). */
function rotXY(v, pitch, yaw) {
  let [x, y, z] = v;
  if (pitch) {
    const c = Math.cos(pitch);
    const s = Math.sin(pitch);
    [y, z] = [y * c - z * s, y * s + z * c];
  }
  if (yaw) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    [x, z] = [x * c + z * s, -x * s + z * c];
  }
  return [x, y, z];
}

function rotZ(v, a) {
  if (!a) return v;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

/** Wachsender Puffer fuer die Ecken aller Wesen eines Bildes. */
export class EntityBuffer {
  constructor() {
    this.a = new Float32Array(8192);
    this.n = 0;
  }
  reset() {
    this.n = 0;
  }
  push(x, y, z, u, v, r, g, b) {
    if (this.n + ENTITY_FLOATS > this.a.length) {
      const next = new Float32Array(this.a.length * 2);
      next.set(this.a);
      this.a = next;
    }
    const a = this.a;
    let i = this.n;
    a[i++] = x;
    a[i++] = y;
    a[i++] = z;
    a[i++] = u;
    a[i++] = v;
    a[i++] = r;
    a[i++] = g;
    a[i++] = b;
    this.n = i;
  }
  get vertices() {
    return this.n / ENTITY_FLOATS;
  }
}

/**
 * Haengt ein Wesen an den Puffer an.
 * @param color [r, g, b] Grundhelligkeit (Licht am Standort, Faerbung bei Treffern)
 * @param cam   Kameraposition; alles wird relativ dazu ausgegeben
 */
export function addMob(buf, mob, alpha, cam, color) {
  const parts = MODELS[mob.kind];
  if (!parts) return;
  const p = mob.prev;
  const x = lerp(p.x, mob.x, alpha) - cam.x;
  const y = lerp(p.y, mob.y, alpha) - cam.y;
  const z = lerp(p.z, mob.z, alpha) - cam.z;
  const bodyYaw = lerpAngle(p.bodyYaw, mob.bodyYaw, alpha);
  const swingPhase = lerp(p.limbSwing, mob.limbSwing, alpha);
  const amount = lerp(p.limbAmount, mob.limbAmount, alpha);
  const swing = Math.cos(swingPhase * 0.6662) * 1.4 * amount;
  const headYaw = Math.max(-1.3, Math.min(1.3, wrap(mob.headYaw - bodyYaw)));
  const headPitch = mob.headPitch || 0;
  let roll = 0;
  if (mob.dead) {
    const f = Math.sqrt(Math.max(0, ((mob.deathTime + alpha - 1) / 20) * 1.6));
    roll = Math.min(1, f) * (Math.PI / 2);
  }
  const unit = 1 / 16;

  for (const pt of parts) {
    let pitch = 0;
    let yaw = 0;
    if (pt.role === 'head') {
      pitch = headPitch;
      yaw = headYaw;
    } else if (pt.role === 'leg0') pitch = swing;
    else if (pt.role === 'leg1') pitch = -swing;
    else if (pt.role === 'arm') pitch = Math.PI / 2 - 0.1 + Math.sin(mob.age * 0.09) * 0.05;

    const [x0, y0, z0, x1, y1, z1] = pt.box;
    const piv = pt.pivot;
    const place = (c) => {
      const local = [
        x0 + c[0] * (x1 - x0) - piv[0],
        y0 + c[1] * (y1 - y0) - piv[1],
        z0 + c[2] * (z1 - z0) - piv[2],
      ];
      const r = rotXY(local, pitch, yaw);
      let v = [(r[0] + piv[0]) * unit, (r[1] + piv[1]) * unit, (r[2] + piv[2]) * unit];
      v = rotZ(v, roll);
      return rotXY(v, 0, bodyYaw);
    };
    for (const f of FACES) {
      const n = rotXY(rotZ(rotXY(f.n, pitch, yaw), roll), 0, bodyYaw);
      const s = faceShade(n);
      const tile = f.front ? pt.front : pt.other;
      const tu = (tile % ENTITY_COLS) / ENTITY_COLS;
      const tv = Math.floor(tile / ENTITY_COLS) / ENTITY_COLS;
      const span = 1 / ENTITY_COLS;
      for (const k of ORDER) {
        const v = place(f.c[k]);
        buf.push(
          x + v[0],
          y + v[1],
          z + v[2],
          tu + UV[k][0] * span * 0.995 + span * 0.0025,
          tv + UV[k][1] * span * 0.995 + span * 0.0025,
          color[0] * s,
          color[1] * s,
          color[2] * s,
        );
      }
    }
  }
}
