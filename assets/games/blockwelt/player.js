/**
 * Spielerbewegung nach den Regeln des Vorbilds (20 Ticks pro Sekunde).
 *
 * Die Zahlen unten sind keine Schaetzung, sondern die dokumentierten Konstanten:
 *   Schwerkraft 0,08 Bloecke/Tick², Luftwiderstand 0,98, Sprungimpuls 0,42,
 *   Bodenreibung 0,6 x 0,91, Gehtempo 0,1 (Sprint 0,13), Eingabefaktor 0,98.
 * Daraus ergeben sich ohne weiteres Zutun 4,317 m/s beim Gehen, 5,612 m/s beim
 * Sprinten und eine Sprunghoehe von knapp 1,25 Bloecken – tools/blockwelt-pruefen.mjs
 * rechnet das nach.
 */

export const TPS = 20;
export const HALF = 0.3; // halbe Breite der Hitbox
export const HEIGHT = 1.8;
const EPS = 1e-7;

export class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.flying = false;
    this.sprinting = false;
    this.sneaking = false;
    this.inWater = false;
    this.headInWater = false;
    this.fallDistance = 0;
    this.jumpCooldown = 0;
    /** Wird nach einer Landung auf den Schaden (in Halbherzen) gesetzt, sonst 0. */
    this.landedDamage = 0;
  }

  get eyeHeight() {
    return this.sneaking ? 1.54 : 1.62;
  }

  teleport(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = this.vy = this.vz = 0;
    this.fallDistance = 0;
  }

  /** Blickrichtung (normiert). yaw 0 schaut nach -z, positiver yaw dreht nach links. */
  forward() {
    const cp = Math.cos(this.pitch);
    return [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp];
  }

  /* --------------------------------------------------------- Kollision -- */

  /** Verschiebt die Hitbox entlang einer Achse und kuerzt den Weg an festen Bloecken. */
  clipAxis(world, axis, d) {
    if (d === 0) return 0;
    const min = [this.x - HALF, this.y, this.z - HALF];
    const max = [this.x + HALF, this.y + HEIGHT, this.z + HALF];
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

  /** Bewegt mit Kollision in der Reihenfolge Y, X, Z. Liefert, wo es angestossen ist. */
  move(world, dx, dy, dz) {
    const hit = { x: false, y: false, z: false };

    // Beim Schleichen nicht ueber die Kante laufen.
    if (this.sneaking && this.onGround && !this.flying) {
      const supported = (ox, oz) => {
        const px = this.x,
          pz = this.z;
        this.x += ox;
        this.z += oz;
        const free = this.clipAxis(world, 1, -0.6) === -0.6;
        this.x = px;
        this.z = pz;
        return !free;
      };
      const step = 0.05;
      while (dx !== 0 && !supported(dx, 0))
        dx = Math.abs(dx) < step ? 0 : dx - Math.sign(dx) * step;
      while (dz !== 0 && !supported(0, dz))
        dz = Math.abs(dz) < step ? 0 : dz - Math.sign(dz) * step;
      while (dx !== 0 && dz !== 0 && !supported(dx, dz)) {
        dx = Math.abs(dx) < step ? 0 : dx - Math.sign(dx) * step;
        dz = Math.abs(dz) < step ? 0 : dz - Math.sign(dz) * step;
      }
    }

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

  /* -------------------------------------------------------------- Tick -- */

  /**
   * Ein Spieltick. `input`: forward/strafe in {-1,0,1}, jump, sneak, sprint (bool).
   * `creative` erlaubt Fliegen (Umschalten macht der Aufrufer ueber `flying`).
   */
  tick(world, input) {
    this.landedDamage = 0;
    const fx = Math.floor(this.x);
    const fz = Math.floor(this.z);
    this.inWater =
      world.isWater(fx, Math.floor(this.y + 0.4), fz) ||
      world.isWater(fx, Math.floor(this.y + 1.2), fz);
    this.headInWater = world.isWater(fx, Math.floor(this.y + this.eyeHeight), fz);

    this.sneaking = !!input.sneak && !this.flying;
    let mf = input.forward * 0.98;
    let ms = input.strafe * 0.98;
    if (this.sneaking) {
      mf *= 0.3;
      ms *= 0.3;
    }

    // Sprinten endet, sobald man nicht mehr vorwaerts laeuft.
    if (input.forward <= 0 || this.sneaking) this.sprinting = false;
    else if (input.sprint) this.sprinting = true;

    if (this.jumpCooldown > 0) this.jumpCooldown--;

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const accelerate = (a) => {
      let len = Math.sqrt(mf * mf + ms * ms);
      if (len < 0.01) return;
      const k = a / Math.max(len, 1);
      this.vx += -sin * mf * k + cos * ms * k;
      this.vz += -cos * mf * k - sin * ms * k;
    };

    if (this.flying) {
      accelerate(this.sprinting ? 0.1 : 0.05);
      if (input.jump) this.vy += 0.15;
      if (input.sneak) this.vy -= 0.15;
    } else if (this.inWater) {
      accelerate(0.02);
      if (input.jump) this.vy += 0.04;
    } else {
      const base = this.sprinting ? 0.13 : 0.1;
      accelerate(this.onGround ? base : this.sprinting ? 0.026 : 0.02);
      if (input.jump && this.onGround && this.jumpCooldown === 0) {
        this.vy = 0.42;
        this.jumpCooldown = 10;
        if (this.sprinting) {
          this.vx += -sin * 0.2;
          this.vz += -cos * 0.2;
        }
      }
    }

    const wasOnGround = this.onGround;
    const { hit, dy } = this.move(world, this.vx, this.vy, this.vz);
    if (hit.x) this.vx = 0;
    if (hit.z) this.vz = 0;
    if ((hit.x || hit.z) && !input.forward) this.sprinting = false;

    // Aufsetzen / Kopfstoss.
    this.onGround = hit.y && this.vy < 0;
    if (hit.y) this.vy = 0;

    // Sturzschaden: je Block ueber 3 Bloecken Fallhoehe ein Lebenspunkt (= halbes Herz).
    if (this.inWater || this.flying) this.fallDistance = 0;
    else if (dy < 0) this.fallDistance -= dy;
    if (this.onGround) {
      const dmg = Math.ceil(this.fallDistance - 3 - 1e-6);
      if (dmg > 0) this.landedDamage = dmg;
      this.fallDistance = 0;
    }

    // Reibung und Schwerkraft nach der Bewegung.
    if (this.flying) {
      this.vx *= 0.91;
      this.vz *= 0.91;
      this.vy *= 0.6;
      if (this.onGround) this.flying = false;
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
  }
}
