/**
 * Der Spieler: Bewegung (gemeinsame Physik aus entities.js) plus Ueberleben –
 * Hunger, Saettigung, Erschoepfung, Luft unter Wasser und Heilung.
 *
 * Bewegung nach den dokumentierten Konstanten des Vorbilds (20 Ticks pro Sekunde):
 *   Schwerkraft 0,08 Bloecke/Tick², Luftwiderstand 0,98, Sprungimpuls 0,42,
 *   Bodenreibung 0,6 x 0,91, Gehtempo 0,1 (Sprint 0,13), Eingabefaktor 0,98.
 * Daraus ergeben sich 4,317 m/s beim Gehen, 5,612 m/s beim Sprinten und eine
 * Sprunghoehe von knapp 1,25 Bloecken – tools/blockwelt-pruefen.mjs rechnet das nach.
 *
 * Hunger wie im Vorbild (ab Version 1.11, Schwierigkeit "normal"): Erschoepfung
 * entsteht beim Sprinten (0,1 je Meter), Springen (0,05, mit Sprint 0,2), Schwimmen
 * (0,01 je Meter), Abbauen (0,005), Angreifen (0,1) und durch Treffer (0,1). Alle 4
 * Punkte sinkt erst die Saettigung, dann der Hunger um 1. Bei vollem Hunger heilt
 * man schnell, ab 18 alle 4 Sekunden; bei 0 verhungert man bis auf ein halbes Herz.
 */

import { Body, TPS } from './entities.js';

export { TPS };
export const HALF = 0.3; // halbe Breite der Hitbox
export const HEIGHT = 1.8;
export const MAX_AIR = 300;

export class Player extends Body {
  constructor() {
    super(0.6, 1.8);
    this.flying = false;
    this.sprinting = false;
    this.sneaking = false;
    this.moved = 0;
    this.resetStats();
  }

  resetStats() {
    this.health = 20;
    this.food = 20;
    this.saturation = 5;
    this.exhaustion = 0;
    this.foodTimer = 0;
    this.air = MAX_AIR;
    this.invuln = 0;
    this.lastHurt = 0;
    this.hurtTime = 0;
    this.cause = '';
  }

  get eyeHeight() {
    return this.sneaking ? 1.54 : 1.62;
  }

  /** Blickrichtung (normiert). yaw 0 schaut nach -z, positiver yaw dreht nach links. */
  forward() {
    const cp = Math.cos(this.pitch);
    return [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp];
  }

  /**
   * Ein Spieltick. `input`: forward/strafe in -1..1, jump, sneak, sprint (bool),
   * noSprint (zu hungrig zum Sprinten).
   */
  tick(world, input) {
    this.updateFluids(world);
    this.sneaking = !!input.sneak && !this.flying;
    let mf = input.forward * 0.98;
    let ms = input.strafe * 0.98;
    if (this.sneaking) {
      mf *= 0.3;
      ms *= 0.3;
    }

    // Sprinten endet, sobald man nicht mehr vorwaerts laeuft.
    if (input.forward <= 0 || this.sneaking || input.noSprint) this.sprinting = false;
    else if (input.sprint) this.sprinting = true;

    const px = this.x;
    const pz = this.z;
    const sprint = this.sprinting;
    this.travel(world, mf, ms, !!input.jump, {
      ground: this.flying ? (sprint ? 0.1 : 0.05) : sprint ? 0.13 : 0.1,
      air: sprint ? 0.026 : 0.02,
      flying: this.flying,
      sprinting: sprint,
      edgeGuard: this.sneaking,
      flyUp: input.jump,
      flyDown: input.sneak,
    });
    if (this.collidedH && !input.forward) this.sprinting = false;
    if (this.flying && this.onGround) this.flying = false;
    this.moved = Math.hypot(this.x - px, this.z - pz);
  }

  exhaust(v) {
    this.exhaustion = Math.min(40, this.exhaustion + v);
  }

  heal(v) {
    if (this.health > 0) this.health = Math.min(20, this.health + v);
  }

  /** Schaden mit Ursache (fuer die Todesmeldung). Gibt den abgezogenen Wert zurueck. */
  hurt(amount, cause) {
    const done = this.applyDamage(amount);
    if (done) {
      this.exhaust(0.1);
      this.cause = cause;
    }
    return done;
  }

  /** Essen: Hunger steigt, Saettigung hoechstens bis zum Hungerwert. */
  eat(food, saturation) {
    this.food = Math.min(20, this.food + food);
    this.saturation = Math.min(this.food, this.saturation + saturation);
  }

  get canSprint() {
    return this.food > 6;
  }

  /** Hunger, Luft und Sturz fuer einen Tick im Ueberlebensmodus. */
  survivalTick() {
    if (this.invuln > 0) this.invuln--;
    if (this.hurtTime > 0) this.hurtTime--;

    if (this.inWater) this.exhaust(0.01 * this.moved);
    else if (this.onGround && this.sprinting) this.exhaust(0.1 * this.moved);
    if (this.jumped) this.exhaust(this.sprinting ? 0.2 : 0.05);

    while (this.exhaustion >= 4) {
      this.exhaustion -= 4;
      if (this.saturation > 0) this.saturation = Math.max(0, this.saturation - 1);
      else this.food = Math.max(0, this.food - 1);
    }

    if (this.health > 0) {
      if (this.food >= 20 && this.saturation > 0 && this.health < 20) {
        if (++this.foodTimer >= 10) {
          const s = Math.min(this.saturation, 6);
          this.heal(s / 6);
          this.exhaust(s);
          this.foodTimer = 0;
        }
      } else if (this.food >= 18 && this.health < 20) {
        if (++this.foodTimer >= 80) {
          this.heal(1);
          this.exhaust(6);
          this.foodTimer = 0;
        }
      } else if (this.food <= 0) {
        if (++this.foodTimer >= 80) {
          if (this.health > 1) this.hurt(1, 'hunger');
          this.foodTimer = 0;
        }
      } else {
        this.foodTimer = 0;
      }
    }

    // Luft: 15 Sekunden, danach 2 Schaden pro Sekunde.
    if (this.headInWater) {
      this.air--;
      if (this.air <= -20) {
        this.air = 0;
        this.hurt(2, 'wasser');
      }
    } else {
      this.air = Math.min(MAX_AIR, this.air + 4);
    }

    if (this.landedDamage) this.hurt(this.landedDamage, 'sturz');
  }
}
