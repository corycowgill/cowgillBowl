// ── Particle Effects Manager ──
// Lightweight particle bursts for tackles, touchdowns, first downs, etc.
// Uses Phaser graphics circles instead of particle emitters for simplicity.

export default class ParticleEffects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  // Dirt/dust burst on tackles
  tackleDust(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const size = 1.5 + Math.random() * 2;
      const colors = [0x8B7355, 0x6B5B3B, 0x9B8B6B, 0x5B4B2B];
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        size, colors[Math.floor(Math.random() * colors.length)], 0.5 + Math.random() * 0.3);
    }
  }

  // Confetti burst on touchdowns
  tdConfetti(x, y) {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff, 0xff8800];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 100;
      const size = 1.5 + Math.random() * 2.5;
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 40,
        size, colors[Math.floor(Math.random() * colors.length)], 1.0 + Math.random() * 0.8);
    }
  }

  // Spark burst on big hits / sacks
  hitSpark(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 80;
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        1 + Math.random() * 1.5, 0xffffaa, 0.25 + Math.random() * 0.15);
    }
  }

  // Green first-down marker flash
  firstDownFlash(x, y) {
    for (let i = 0; i < 6; i++) {
      this._spawn(x, y + (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20, -20 - Math.random() * 30,
        2 + Math.random() * 2, 0x00ff44, 0.5 + Math.random() * 0.3);
    }
  }

  // Kick impact puff
  kickPuff(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 20 + Math.random() * 40;
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        2 + Math.random() * 2, 0xaaddaa, 0.4 + Math.random() * 0.2);
    }
  }

  _spawn(x, y, vx, vy, size, color, life) {
    const gfx = this.scene.add.circle(x, y, size, color, 0.9);
    gfx.setDepth(15);
    this.particles.push({ gfx, vx, vy, life, maxLife: life, size });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.gfx.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.vy += 60 * dt; // gravity
      p.vx *= 0.98;
      const alpha = p.life / p.maxLife;
      p.gfx.setAlpha(alpha);
      p.gfx.setScale(0.5 + alpha * 0.5);
    }
  }
}
