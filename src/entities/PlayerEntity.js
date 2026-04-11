import { PLAYER_RADIUS, PLAYER_LABEL_SIZE, attrToSpeed, SPRINT_MULT } from '../config.js';
import SpriteGenerator from '../sprites/SpriteGenerator.js';

const SPRITE_SCALE = 1.25; // scale up the 20x24 pixel art for the 8 px/yd field

export default class PlayerEntity {
  constructor(scene, data, teamColor, isOffense, teamAbbr) {
    this.scene = scene;
    this.data = data;
    this.teamColor = teamColor;
    this.teamAbbr = teamAbbr || '';
    this.isOffense = isOffense;
    this.goingRight = true;
    this.controlled = false;
    this.assignedRole = '';
    this.route = null;
    this.routeIdx = 0;
    this.isBlocking = false;
    this.blockTarget = null;
    this.isBlocker = false;      // true for OL/FB — eligible to engage blocks
    this.engaged = null;         // the player currently locked up with me (mutual)
    this.engageTime = 0;
    this.isSprinting = false;
    this.maxSpeed = attrToSpeed(data.spd);
    this.currentSpeed = 0;
    this.currentAnim = 'idle';

    // Jersey number label
    this.label = scene.add.text(0, 0, '' + data.num, {
      fontFamily: 'monospace', fontSize: PLAYER_LABEL_SIZE + 'px',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12);

    // Animated sprite (replaces the old circle)
    const textureKey = `player_${teamAbbr}`;
    const hasTexture = scene.textures.exists(textureKey);

    if (hasTexture) {
      this.sprite = scene.add.sprite(0, 0, textureKey, 0);
      this.sprite.setScale(SPRITE_SCALE);
      this.sprite.setDepth(10);
      scene.physics.add.existing(this.sprite);
      this.sprite.body.setSize(SpriteGenerator.FRAME_W * 0.5, SpriteGenerator.FRAME_H * 0.5);
      this.sprite.body.setOffset(SpriteGenerator.FRAME_W * 0.25, SpriteGenerator.FRAME_H * 0.35);
      this.sprite.body.setCollideWorldBounds(false);
      // Start idle animation
      this.playAnim('idle');
    } else {
      // Fallback: circle (if sprites not generated yet)
      this.sprite = scene.add.circle(0, 0, PLAYER_RADIUS, teamColor);
      scene.physics.add.existing(this.sprite);
      this.sprite.body.setCircle(PLAYER_RADIUS);
      this.sprite.body.setCollideWorldBounds(false);
      this.sprite.setDepth(10);
      this.useFallback = true;
    }

    this.sprite.entity = this;

    // Selection ring (drawn around controlled player)
    this.ring = scene.add.graphics();
    this.ring.setDepth(11);

    // Star indicator
    this.starGfx = null;
    if (data.star) {
      this.starGfx = scene.add.graphics();
      this.starGfx.setDepth(11);
    }

    this.homeX = 0;
    this.homeY = 0;
  }

  playAnim(name) {
    if (this.useFallback) return;
    if (this.currentAnim === name) return;
    const key = SpriteGenerator.animKey(this.teamAbbr, name);
    if (this.scene.anims.exists(key)) {
      this.sprite.play(key, true);
      this.currentAnim = name;
    }
  }

  setPosition(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.homeX = x;
    this.homeY = y;
  }

  setControlled(val) { this.controlled = val; }

  update(dt) {
    // Label above sprite
    this.label.x = this.sprite.x;
    this.label.y = this.sprite.y - (this.useFallback ? PLAYER_RADIUS + 6 : SpriteGenerator.FRAME_H * SPRITE_SCALE * 0.45);

    // Flip sprite based on movement direction
    if (!this.useFallback) {
      if (this.sprite.body.velocity.x < -10) {
        this.sprite.setFlipX(true);
      } else if (this.sprite.body.velocity.x > 10) {
        this.sprite.setFlipX(false);
      }

      // One-shot animations auto-expire after a short duration so players
      // don't freeze in 'tackle'/'down'/'catch'/'celebrate' forever.
      const isOneShot = this.currentAnim === 'tackle' || this.currentAnim === 'down'
        || this.currentAnim === 'catch' || this.currentAnim === 'celebrate';
      if (isOneShot) {
        this._oneShotTimer = (this._oneShotTimer || 0) + dt;
        if (this._oneShotTimer > 0.6) {
          this._oneShotTimer = 0;
          this.currentAnim = ''; // allow transition below
        }
      }

      // Choose animation based on velocity
      if (!isOneShot || this.currentAnim === '') {
        const speed = Math.abs(this.sprite.body.velocity.x) + Math.abs(this.sprite.body.velocity.y);
        if (speed > 15) {
          this.playAnim('run');
        } else {
          this.playAnim('idle');
        }
      }
    }

    // Selection ring
    this.ring.clear();
    if (this.controlled) {
      this.ring.lineStyle(2, 0xffffff, 1);
      this.ring.strokeCircle(this.sprite.x, this.sprite.y, this.useFallback ? PLAYER_RADIUS + 3 : 18);
    }

    // Star indicator
    if (this.starGfx) {
      this.starGfx.clear();
      this.starGfx.lineStyle(1, 0xffff00, 0.8);
      this.starGfx.strokeCircle(this.sprite.x, this.sprite.y, this.useFallback ? PLAYER_RADIUS + 1 : 16);
    }

    // Fallback circle rendering
    if (this.useFallback) {
      // The circle is already rendered by Phaser; no extra work needed
    }
  }

  moveToward(tx, ty, speedMult) {
    speedMult = speedMult || 1;
    const dx = tx - this.sprite.x;
    const dy = ty - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) { this.sprite.body.setVelocity(0, 0); this.currentSpeed = 0; return true; }
    const spd = this.maxSpeed * speedMult * (this.isSprinting ? SPRINT_MULT : 1);
    this.currentSpeed = spd;
    this.sprite.body.setVelocity((dx / dist) * spd, (dy / dist) * spd);
    return false;
  }

  followRoute() {
    if (!this.route || this.routeIdx >= this.route.length) {
      this.sprite.body.setVelocity(0, 0);
      return true;
    }
    const wp = this.route[this.routeIdx];
    if (this.moveToward(wp.x, wp.y)) this.routeIdx++;
    return this.routeIdx >= this.route.length;
  }

  stop() {
    this.sprite.body.setVelocity(0, 0);
    this.currentSpeed = 0;
    this.isSprinting = false;
  }

  setRoute(waypoints) { this.route = waypoints; this.routeIdx = 0; }

  distTo(other) {
    const dx = this.sprite.x - other.sprite.x;
    const dy = this.sprite.y - other.sprite.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distToXY(x, y) {
    const dx = this.sprite.x - x;
    const dy = this.sprite.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Trigger one-shot animations
  playCatchAnim() { this.playAnim('catch'); }
  playTackleAnim() { this.playAnim('tackle'); }
  playDownAnim() { this.playAnim('down'); }
  playCelebrateAnim() { this.playAnim('celebrate'); }

  resetAnim() {
    this.currentAnim = '';
    this.playAnim('idle');
  }

  destroy() {
    this.sprite.destroy();
    this.label.destroy();
    this.ring.destroy();
    if (this.starGfx) this.starGfx.destroy();
  }
}
