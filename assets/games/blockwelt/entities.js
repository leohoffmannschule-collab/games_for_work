/**
 * Koerper mit Physik (Spieler und Wesen teilen sich dieselben Regeln), dazu Tiere
 * und Zombies mit einfacher Verhaltenslogik, Spawnen und Kampf.
 *
 * Bewegung nach Vorbild: Schwerkraft 0,08, Luftwiderstand 0,98, Sprung 0,42,
 * Bodenreibung 0,6 x 0,91; im Wasser 0,8 Daempfung und 0,02 Abtrieb. Wesen
 * beschleunigen mit Tempo x 0,98 x Tempo (Schwein 0,25, Kuh 0,2, Schaf und Zombie
 * 0,23). Treffer stossen mit 0,4 zurueck; nach einem Treffer sind Spieler und Wesen
 * 10 Ticks lang nur durch staerkere Schlaege verletzbar.
 */

import { PORK, BEEF, MUTTON, ROTTEN_FLESH } from './items.js';
import { WOOL, GRASS } from './blocks.js';

export const TPS = 20;
const EPS = 1e-7;

/* --------------------------------------------------------------- Koerper -- */

export class Body {
  constructor(width, height) {
    this.half = width / 2;
    this.height = height;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.inWater = false;
    this.headInWater = false;
    this.collidedH = false;
    this.fallDistance = 0;
    this.jumpCooldown = 0;
    this.jumped = false;
    /** Nach einer Landung der Sturzschaden (in Lebenspunkten), sonst 0. */
    this.landedDamage = 0;
    // Treffer: Unverwundbarkeit nach Vorbild.
    this.health = 20;
    this.invuln = 0;
    this.lastHurt = 0;
    this.hurtTime = 0;
  }

  get eyeHeight() {
    return this.height * 0.85;
  }

  teleport(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = this.vy = this.vz = 0;
    this.fallDistance = 0;
  }

  /** Verschiebt die Hitbox entlang einer Achse und kuerzt den Weg an festen Bloecken. */
  clipAxis(world, axis, d) {
    if (d === 0) return 0;
    const h = this.half;
    const min = [this.x - h, this.y, this.z - h];
    const max = [this.x + h, this.y + this.height, this.z + h];
    const lo = min.map((v) => Math.floor(v + EPS));
    const hi = max.map((v) => Math.floor(v - EPS));
    if (d > 0) hi[axis] = Math.floor(max[axis] + d - EPS);
    else lo[axis] = Math.floor(min[axis] + d + EPS);

    let result = d;
    for (let ix = lo[0]; ix <= hi[0]; ix++) {
      for (let iy = lo[1]; iy <= hi[1]; iy++) {
        for (let iz = lo[2]; iz <= hi[2]; iz++) {
          if (!world.solidAt(ix, iy, iz)) continue;
          const cell = [ix, iy, iz];
          if (d > 0) {
            if (cell[axis] >= max[axis] - EPS) result = Math.min(result, cell[axis] - max[axis]);
          } else if (cell[axis] + 1 <= min[axis] + EPS) {
            result = Math.max(result, cell[axis] + 1 - min[axis]);
          }
        }
      }
    }
    return result;
  }

  /**
   * Bewegt mit Kollision in der Reihenfolge Y, X, Z. Mit `edgeGuard` geht es nicht
   * ueber Kanten hinaus (Schleichen).
   */
  move(world, dx, dy, dz, edgeGuard = false) {
    if (edgeGuard) {
      const supported = (ox, oz) => {
        const px = this.x;
        const pz = this.z;
        this.x += ox;
        this.z += oz;
        const free = this.clipAxis(world, 1, -0.6) === -0.6;
        this.x = px;
        this.z = pz;
        return !free;
      };
      const step = 0.05;
      const shrink = (v) => (Math.abs(v) < step ? 0 : v - Math.sign(v) * step);
      while (dx !== 0 && !supported(dx, 0)) dx = shrink(dx);
      while (dz !== 0 && !supported(0, dz)) dz = shrink(dz);
      while (dx !== 0 && dz !== 0 && !supported(dx, dz)) {
        dx = shrink(dx);
        dz = shrink(dz);
      }
    }
    const hit = { x: false, y: false, z: false };
    const ry = this.clipAxis(world, 1, dy);
    hit.y = ry !== dy;
    this.y += ry;
    const rx = this.clipAxis(world, 0, dx);
    hit.x = rx !== dx;
    this.x += rx;
    const rz = this.clipAxis(world, 2, dz);
    hit.z = rz !== dz;
    this.z += rz;
    return { hit, dy: ry };
  }

  /** Wasserstand pruefen und von der Stroemung mitziehen lassen. */
  updateFluids(world) {
    const fx = Math.floor(this.x);
    const fz = Math.floor(this.z);
    const feet = Math.floor(this.y + 0.4);
    const body = Math.floor(this.y + Math.min(1.2, this.height * 0.66));
    this.inWater = world.isWater(fx, feet, fz) || world.isWater(fx, body, fz);
    this.headInWater = world.isWater(fx, Math.floor(this.y + this.eyeHeight), fz);
    if (this.inWater && world.flowAt) {
      const f = world.flowAt(fx, world.isWater(fx, feet, fz) ? feet : body, fz);
      this.vx += f[0] * 0.014;
      this.vz += f[1] * 0.014;
    }
  }

  /**
   * Gemeinsame Bewegungsphysik. mf/ms: Eingabe vorwaerts/seitwaerts (schon mit 0,98
   * malgenommen), o.ground/o.air: Beschleunigung am Boden bzw. in der Luft.
   */
  travel(world, mf, ms, jump, o) {
    this.landedDamage = 0;
    this.jumped = false;
    if (this.jumpCooldown > 0) this.jumpCooldown--;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const accelerate = (a) => {
      const len = Math.sqrt(mf * mf + ms * ms);
      if (len < 0.01) return;
      const k = a / Math.max(len, 1);
      this.vx += -sin * mf * k + cos * ms * k;
      this.vz += -cos * mf * k - sin * ms * k;
    };

    if (o.flying) {
      accelerate(o.ground);
      if (o.flyUp) this.vy += 0.15;
      if (o.flyDown) this.vy -= 0.15;
    } else if (this.inWater) {
      accelerate(0.02);
      if (jump) this.vy += 0.04;
    } else {
      accelerate(this.onGround ? o.ground : o.air);
      if (jump && this.onGround && this.jumpCooldown === 0) {
        this.vy = 0.42;
        this.jumpCooldown = 10;
        this.jumped = true;
        if (o.sprinting) {
          this.vx += -sin * 0.2;
          this.vz += -cos * 0.2;
        }
      }
    }

    const wasOnGround = this.onGround;
    const { hit, dy } = this.move(
      world,
      this.vx,
      this.vy,
      this.vz,
      !!o.edgeGuard && this.onGround && !o.flying,
    );
    this.collidedH = hit.x || hit.z;
    if (hit.x) this.vx = 0;
    if (hit.z) this.vz = 0;

    // Aufsetzen / Kopfstoss.
    this.onGround = hit.y && this.vy < 0;
    if (hit.y) this.vy = 0;

    // Sturzschaden: je Block ueber 3 Bloecken Fallhoehe ein Lebenspunkt (= halbes Herz).
    if (this.inWater || o.flying) this.fallDistance = 0;
    else if (dy < 0) this.fallDistance -= dy;
    if (this.onGround) {
      const dmg = Math.ceil(this.fallDistance - 3 - 1e-6);
      if (dmg > 0) this.landedDamage = dmg;
      this.fallDistance = 0;
    }

    // Reibung und Schwerkraft nach der Bewegung.
    if (o.flying) {
      this.vx *= 0.91;
      this.vz *= 0.91;
      this.vy *= 0.6;
    } else if (this.inWater) {
      this.vx *= 0.8;
      this.vz *= 0.8;
      this.vy = this.vy * 0.8 - 0.02;
    } else {
      const slip = wasOnGround ? 0.546 : 0.91;
      this.vy = (this.vy - 0.08) * 0.98;
      this.vx *= slip;
      this.vz *= slip;
    }
    return hit;
  }

  /**
   * Schaden mit Unverwundbarkeit nach Vorbild: 20 Ticks nach einem Treffer zaehlt in
   * der ersten Haelfte nur, was ueber den letzten Treffer hinausgeht.
   * Gibt den tatsaechlich abgezogenen Schaden zurueck.
   */
  applyDamage(amount) {
    if (this.health <= 0 || amount <= 0) return 0;
    if (this.invuln > 10) {
      if (amount <= this.lastHurt) return 0;
      const extra = amount - this.lastHurt;
      this.lastHurt = amount;
      amount = extra;
    } else {
      this.lastHurt = amount;
      this.invuln = 20;
      this.hurtTime = 10;
    }
    this.health = Math.max(0, this.health - amount);
    return amount;
  }

  /** Rueckstoss weg von (fromX, fromZ), Staerke 0,4 wie im Vorbild. */
  knockback(fromX, fromZ, strength = 0.4) {
    let dx = this.x - fromX;
    let dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    this.vx = this.vx / 2 + dx * strength;
    this.vz = this.vz / 2 + dz * strength;
    if (this.onGround) this.vy = Math.min(0.4, this.vy / 2 + 0.4);
  }

  /** Strahl gegen die Hitbox; liefert den Abstand oder null. */
  hitByRay(ox, oy, oz, dx, dy, dz, maxDist) {
    const h = this.half;
    const b = [this.x - h, this.y, this.z - h, this.x + h, this.y + this.height, this.z + h];
    let tmin = 0;
    let tmax = maxDist;
    const o = [ox, oy, oz];
    const d = [dx, dy, dz];
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-12) {
        if (o[a] < b[a] || o[a] > b[a + 3]) return null;
        continue;
      }
      let t1 = (b[a] - o[a]) / d[a];
      let t2 = (b[a + 3] - o[a]) / d[a];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
    return tmin;
  }
}

/* ----------------------------------------------------------------- Wesen -- */

export const SPECIES = {
  schwein: {
    name: 'Schwein',
    width: 0.9,
    height: 0.9,
    health: 10,
    speed: 0.25,
    panic: 1.25,
    drops: [[PORK, 1, 3]],
  },
  kuh: {
    name: 'Kuh',
    width: 0.9,
    height: 1.4,
    health: 10,
    speed: 0.2,
    panic: 2.0,
    drops: [[BEEF, 1, 3]],
  },
  schaf: {
    name: 'Schaf',
    width: 0.9,
    height: 1.3,
    health: 8,
    speed: 0.23,
    panic: 1.25,
    drops: [
      [MUTTON, 1, 2],
      [WOOL, 1, 1],
    ],
  },
  zombie: {
    name: 'Zombie',
    width: 0.6,
    height: 1.95,
    health: 20,
    speed: 0.23,
    hostile: true,
    damage: 3,
    follow: 35,
    drops: [[ROTTEN_FLESH, 0, 2]],
  },
};
export const ANIMALS = ['schwein', 'kuh', 'schaf'];

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
function turnTowards(from, to, max) {
  const d = wrapAngle(to - from);
  return from + Math.max(-max, Math.min(max, d));
}

let nextId = 1;

export class Mob extends Body {
  constructor(kind, x, y, z, rnd = Math.random) {
    const s = SPECIES[kind];
    super(s.width, s.height);
    this.id = nextId++;
    this.kind = kind;
    this.species = s;
    this.health = s.health;
    this.teleport(x, y, z);
    this.yaw = rnd() * Math.PI * 2;
    this.bodyYaw = this.yaw;
    this.headYaw = this.yaw;
    this.headPitch = 0;
    this.limbSwing = 0;
    this.limbAmount = 0;
    this.dead = false;
    this.deathTime = 0;
    this.goal = null;
    this.panic = 0;
    this.target = null;
    this.attackCooldown = 0;
    this.burning = 0;
    this.age = 0;
    this.savePrev();
  }

  savePrev() {
    this.prev = {
      x: this.x,
      y: this.y,
      z: this.z,
      bodyYaw: this.bodyYaw,
      limbSwing: this.limbSwing,
      limbAmount: this.limbAmount,
    };
  }

  /**
   * Treffer durch einen Angreifer (oder null bei Sturz/Feuer).
   * Tiere fliehen danach, Zombies nehmen den Angreifer ins Visier.
   */
  hurt(amount, attacker = null) {
    if (this.dead) return 0;
    const done = this.applyDamage(amount);
    if (!done) return 0;
    if (attacker) {
      this.knockback(attacker.x, attacker.z);
      if (this.species.hostile) this.target = attacker;
      else {
        this.panic = 60;
        this.goal = null;
      }
    }
    if (this.health <= 0) {
      this.dead = true;
      this.deathTime = 0;
      this.goal = null;
    }
    return done;
  }

  /** Zufaelliges Ziel in der Naehe, moeglichst nicht im Wasser. */
  pickGoal(world, range, speed, rnd, ticks = 100) {
    for (let tries = 0; tries < 4; tries++) {
      const gx = this.x + (rnd() * 2 - 1) * range;
      const gz = this.z + (rnd() * 2 - 1) * range;
      const top = world.surfaceY(Math.floor(gx), Math.floor(gz));
      if (world.isWater(Math.floor(gx), top + 1, Math.floor(gz))) continue;
      if (Math.abs(top + 1 - this.y) > 6) continue;
      return { x: gx, z: gz, speed, ticks };
    }
    return null;
  }

  /** Verhalten: liefert ein Bewegungsziel { x, z, speed } oder null. */
  think(world, env) {
    const s = this.species;
    const rnd = env.rnd;
    if (s.hostile) {
      const p = env.player;
      const valid = (t) =>
        t &&
        t === p &&
        env.targetable &&
        Math.hypot(t.x - this.x, t.y - this.y, t.z - this.z) < s.follow;
      if (this.target && !valid(this.target)) this.target = null;
      if (!this.target && this.age % 10 === 0 && valid(p)) {
        const d = Math.hypot(p.x - this.x, p.z - this.z);
        if (
          d < 16 &&
          world.canSee(this.x, this.y + this.eyeHeight, this.z, p.x, p.y + p.eyeHeight, p.z)
        ) {
          this.target = p;
        }
      }
      if (this.target) {
        const t = this.target;
        const d2 = (t.x - this.x) ** 2 + (t.y - this.y) ** 2 + (t.z - this.z) ** 2;
        // Reichweite nach Vorbild: (Breite x 2)^2 + Breite des Ziels.
        const reach = (this.half * 4) ** 2 + t.half * 2;
        this.lookAt(t.x, t.y + t.eyeHeight, t.z);
        if (d2 <= reach && this.attackCooldown === 0) {
          this.attackCooldown = 20;
          env.attack(this, t);
        }
        return { x: t.x, z: t.z, speed: s.speed };
      }
    }

    if (this.panic > 0) {
      this.panic--;
      if (!this.goal || this.goal.ticks-- <= 0 || this.reached(this.goal)) {
        this.goal = this.pickGoal(world, 5, s.speed * s.panic, rnd, 40);
      }
      return this.goal;
    }
    if (this.goal) {
      if (this.goal.ticks-- <= 0 || this.reached(this.goal)) this.goal = null;
      else return this.goal;
    }
    if (rnd() < 1 / 120) this.goal = this.pickGoal(world, 10, s.speed, rnd);
    // Gelegentlich den Kopf drehen.
    if (rnd() < 0.02) this.headYaw = this.bodyYaw + (rnd() * 2 - 1) * 1.2;
    return null;
  }

  reached(goal) {
    return Math.hypot(goal.x - this.x, goal.z - this.z) < 0.8;
  }

  lookAt(x, y, z) {
    const dx = x - this.x;
    const dz = z - this.z;
    this.headYaw = Math.atan2(-dx, -dz);
    const dy = y - (this.y + this.eyeHeight);
    this.headPitch = Math.max(-0.8, Math.min(0.8, Math.atan2(dy, Math.hypot(dx, dz))));
  }

  tick(world, env) {
    this.savePrev();
    this.age++;
    if (this.hurtTime > 0) this.hurtTime--;
    if (this.invuln > 0) this.invuln--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    this.updateFluids(world);

    let forward = 0;
    let jump = false;
    if (!this.dead) {
      const goal = this.think(world, env);
      if (goal) {
        const dx = goal.x - this.x;
        const dz = goal.z - this.z;
        if (dx * dx + dz * dz > 0.04) {
          // Drehen hoechstens 90 Grad pro Tick, wie die Bewegungssteuerung im Vorbild.
          this.yaw = turnTowards(this.yaw, Math.atan2(-dx, -dz), Math.PI / 2);
          forward = goal.speed;
          if (!this.target) this.headYaw = this.yaw;
        }
        if (this.collidedH && this.onGround) jump = true;
      }
      if (this.inWater && env.rnd() < 0.8) jump = true; // oben bleiben
    } else {
      this.deathTime++;
    }

    const px = this.x;
    const pz = this.z;
    this.travel(world, forward * 0.98, 0, jump, { ground: forward, air: 0.02 });

    // Laufanimation wie im Vorbild.
    const moved = Math.min(1, Math.hypot(this.x - px, this.z - pz) * 4);
    this.limbAmount += (moved - this.limbAmount) * 0.4;
    this.limbSwing += this.limbAmount;
    this.bodyYaw = turnTowards(this.bodyYaw, this.yaw, 0.35);

    if (!this.dead) {
      if (this.landedDamage) this.hurt(this.landedDamage);
      // Zombies fangen im Sonnenlicht Feuer.
      if (this.species.hostile && env.isDay && !this.inWater) {
        if (
          world.canSeeSky(
            Math.floor(this.x),
            Math.floor(this.y + this.eyeHeight),
            Math.floor(this.z),
          )
        ) {
          if (env.rnd() < 0.04) this.burning = Math.max(this.burning, 160);
        }
      }
      if (this.inWater) this.burning = 0;
      if (this.burning > 0) {
        this.burning--;
        if (this.burning % 20 === 0) this.hurt(1);
      }
    }
  }
}

/* -------------------------------------------------------------- Verwalter -- */

/**
 * Haelt alle Wesen, laesst sie spawnen und verschwinden. `env` beim Tick:
 * { player, targetable, isDay, night, monsters, rnd, attack(mob, target),
 *   despawn (Abstand), loadedLight(x, y, z) -> {sky, block} | null }
 */
export class MobManager {
  constructor() {
    this.list = [];
    this.ticks = 0;
  }

  get passiveCount() {
    return this.list.filter((m) => !m.species.hostile && !m.dead).length;
  }

  get hostileCount() {
    return this.list.filter((m) => m.species.hostile && !m.dead).length;
  }

  tick(world, env) {
    this.ticks++;
    for (const m of this.list) m.tick(world, env);
    this.separate(env.player);

    const p = env.player;
    this.list = this.list.filter((m) => {
      if (m.dead && m.deathTime >= 20) return false;
      const far = Math.hypot(m.x - p.x, m.z - p.z) > env.despawn;
      return !far && world.isLoaded(Math.floor(m.x), Math.floor(m.z));
    });

    if (this.ticks % 100 === 1 && this.passiveCount < 10) this.spawnAnimals(world, env);
    if (env.monsters && this.ticks % 20 === 0 && this.hostileCount < 8)
      this.spawnMonster(world, env);
  }

  /** Ueberlappende Koerper sanft auseinanderschieben (wie im Vorbild). */
  separate(player) {
    const bodies = [player, ...this.list.filter((m) => !m.dead)];
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        if (Math.abs(dx) >= a.half + b.half || Math.abs(dz) >= a.half + b.half) continue;
        if (a.y >= b.y + b.height || b.y >= a.y + a.height) continue;
        let d = Math.max(Math.abs(dx), Math.abs(dz));
        if (d < 0.01) continue;
        d = Math.sqrt(d);
        dx /= d;
        dz /= d;
        const f = Math.min(1, 1 / d) * 0.05;
        dx *= f;
        dz *= f;
        a.vx -= dx;
        a.vz -= dz;
        b.vx += dx;
        b.vz += dz;
      }
    }
  }

  /** Zufaelliger Punkt in einem Ring um den Spieler. */
  ringPoint(env, min, max) {
    const a = env.rnd() * Math.PI * 2;
    const r = min + env.rnd() * (max - min);
    return [Math.floor(env.player.x + Math.cos(a) * r), Math.floor(env.player.z + Math.sin(a) * r)];
  }

  free(world, x, y, z) {
    return !world.solidAt(x, y, z) && !world.solidAt(x, y + 1, z) && !world.isWater(x, y, z);
  }

  spawnAnimals(world, env, tries = 1) {
    for (let t = 0; t < tries; t++) {
      const [x, z] = this.ringPoint(env, 20, Math.max(24, env.despawn - 16));
      if (!world.isLoaded(x, z)) continue;
      const kind = ANIMALS[Math.floor(env.rnd() * ANIMALS.length)];
      const group = 2 + Math.floor(env.rnd() * 3);
      for (let k = 0; k < group; k++) {
        const gx = x + Math.floor(env.rnd() * 5) - 2;
        const gz = z + Math.floor(env.rnd() * 5) - 2;
        if (!world.isLoaded(gx, gz)) continue;
        const top = world.surfaceY(gx, gz);
        if (world.getBlock(gx, top, gz) !== GRASS || !this.free(world, gx, top + 1, gz)) continue;
        this.list.push(new Mob(kind, gx + 0.5, top + 1, gz + 0.5, env.rnd));
      }
    }
  }

  spawnMonster(world, env) {
    const [x, z] = this.ringPoint(env, 24, Math.max(28, Math.min(48, env.despawn - 8)));
    if (!world.isLoaded(x, z)) return;
    const top = world.surfaceY(x, z);
    // Halb an der Oberflaeche, halb in Hoehlen.
    let y = top + 1;
    if (env.rnd() < 0.5) {
      y = 2 + Math.floor(env.rnd() * Math.max(1, top - 4));
      if (!world.solidAt(x, y - 1, z)) return;
    }
    if (!this.free(world, x, y, z) || !world.solidAt(x, y - 1, z)) return;
    const light = env.loadedLight(x, y, z);
    if (!light || light.block > 0) return;
    if (light.sky > 0 && !env.night) return;
    this.list.push(new Mob('zombie', x + 0.5, y, z + 0.5, env.rnd));
  }

  clear() {
    this.list = [];
  }
}

/** Beute eines toten Wesens als Liste von [Item, Anzahl]. */
export function mobDrops(mob, rnd = Math.random) {
  const out = [];
  for (const [id, min, max] of mob.species.drops) {
    const n = min + Math.floor(rnd() * (max - min + 1));
    if (n > 0) out.push([id, n]);
  }
  return out;
}
