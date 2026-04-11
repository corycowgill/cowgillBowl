import { FIELD_TOP, FIELD_WIDTH_PX } from '../config.js';

export default class Football {
  constructor(scene) {
    this.scene = scene;
    // Ball shadow
    this.shadow = scene.add.ellipse(0, 0, 10, 5, 0x000000, 0.3);
    this.shadow.setDepth(4);
    this.shadow.setVisible(false);
    // Ball body — brown with white lace stripe
    this.sprite = scene.add.ellipse(0, 0, 10, 7, 0x8B4513);
    this.sprite.setDepth(5);
    this.sprite.setVisible(false);
    // Lace detail
    this.lace = scene.add.rectangle(0, 0, 5, 1, 0xffffff, 0.7);
    this.lace.setDepth(6);
    this.lace.setVisible(false);
    // In-air glow ring
    this.glow = scene.add.circle(0, 0, 8, 0xffff88, 0);
    this.glow.setDepth(4);
    this.held = true;
    this.holder = null;
    this.inAir = false;
    this.airTarget = null;
    this.airSpeed = 0;
    this.airVx = 0;
    this.airVy = 0;
    this.loose = false;
  }

  attachTo(playerEntity) {
    this.held = true;
    this.holder = playerEntity;
    this.inAir = false;
    this.loose = false;
    this.sprite.setVisible(true);
  }

  throwTo(targetX, targetY, speed) {
    this.held = false;
    this.holder = null;
    this.inAir = true;
    this.loose = false;
    this.sprite.setVisible(true);
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) { this.inAir = false; return; }
    this.airVx = (dx / dist) * speed;
    this.airVy = (dy / dist) * speed;
    this.airTarget = { x: targetX, y: targetY };
    this.airSpeed = speed;
  }

  makeFumble() {
    this.held = false;
    this.holder = null;
    this.inAir = false;
    this.loose = true;
    this.sprite.setVisible(true);
    this.airVx = (Math.random() - 0.5) * 100;
    this.airVy = (Math.random() - 0.5) * 100;
  }

  _syncExtras() {
    this.shadow.x = this.sprite.x + 2;
    this.shadow.y = this.sprite.y + 6;
    this.shadow.setVisible(this.sprite.visible);
    this.lace.x = this.sprite.x;
    this.lace.y = this.sprite.y;
    this.lace.setVisible(this.sprite.visible);
    // Glow when in air
    this.glow.x = this.sprite.x;
    this.glow.y = this.sprite.y;
    if (this.inAir) {
      this.glow.setAlpha(0.2 + Math.sin(Date.now() * 0.01) * 0.1);
    } else {
      this.glow.setAlpha(0);
    }
  }

  update(dt) {
    if (this.held && this.holder) {
      const off = this.holder.goingRight ? 8 : -8;
      this.sprite.x = this.holder.sprite.x + off;
      this.sprite.y = this.holder.sprite.y;
      this._syncExtras();
      return;
    }
    if (this.inAir) {
      this.sprite.x += this.airVx * dt;
      this.sprite.y += this.airVy * dt;
      if (this.airTarget) {
        const dx = this.airTarget.x - this.sprite.x;
        const dy = this.airTarget.y - this.sprite.y;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          this.sprite.x = this.airTarget.x;
          this.sprite.y = this.airTarget.y;
          this.inAir = false;
          this.airTarget = null;
        }
      }
    }
    if (this.loose) {
      this.sprite.x += this.airVx * dt;
      this.sprite.y += this.airVy * dt;
      this.airVx *= 0.96;
      this.airVy *= 0.96;
      const minY = FIELD_TOP, maxY = FIELD_TOP + FIELD_WIDTH_PX;
      if (this.sprite.y < minY || this.sprite.y > maxY) {
        this.airVy = -this.airVy * 0.5;
        this.sprite.y = Math.max(minY, Math.min(maxY, this.sprite.y));
      }
    }
    this._syncExtras();
  }

  placeAt(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.held = false;
    this.holder = null;
    this.inAir = false;
    this.loose = false;
    this.airVx = 0;
    this.airVy = 0;
    this.sprite.setVisible(true);
    this._syncExtras();
  }

  hide() {
    this.sprite.setVisible(false);
    this.shadow.setVisible(false);
    this.lace.setVisible(false);
    this.glow.setAlpha(0);
  }
}
