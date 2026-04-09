import { PLAYER_RADIUS, PLAYER_LABEL_SIZE, attrToSpeed, SPRINT_MULT } from '../config.js';

export default class PlayerEntity {
  constructor(scene, data, teamColor, isOffense) {
    this.scene = scene;
    this.data = data;
    this.teamColor = teamColor;
    this.isOffense = isOffense;
    this.goingRight = true;
    this.controlled = false;
    this.assignedRole = '';
    this.route = null;
    this.routeIdx = 0;
    this.isBlocking = false;
    this.blockTarget = null;
    this.isSprinting = false;
    this.maxSpeed = attrToSpeed(data.spd);
    this.currentSpeed = 0;

    this.gfx = scene.add.graphics();
    this.label = scene.add.text(0, 0, '' + data.num, {
      fontFamily: 'monospace', fontSize: PLAYER_LABEL_SIZE + 'px',
      color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12);

    this.sprite = scene.add.circle(0, 0, PLAYER_RADIUS, teamColor);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCircle(PLAYER_RADIUS);
    this.sprite.body.setCollideWorldBounds(false);
    this.sprite.setDepth(10);
    this.sprite.entity = this;

    this.homeX = 0;
    this.homeY = 0;
  }

  setPosition(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.homeX = x;
    this.homeY = y;
  }

  setControlled(val) { this.controlled = val; }

  update(dt) {
    this.label.x = this.sprite.x;
    this.label.y = this.sprite.y - PLAYER_RADIUS - 6;
    this.gfx.clear();
    this.gfx.fillStyle(this.teamColor, 1);
    this.gfx.fillCircle(0, 0, PLAYER_RADIUS);
    if (this.controlled) {
      this.gfx.lineStyle(2, 0xffffff, 1);
      this.gfx.strokeCircle(0, 0, PLAYER_RADIUS + 3);
    }
    if (this.data.star) {
      this.gfx.lineStyle(1, 0xffff00, 0.8);
      this.gfx.strokeCircle(0, 0, PLAYER_RADIUS + 1);
    }
    this.gfx.x = this.sprite.x;
    this.gfx.y = this.sprite.y;
    this.gfx.setDepth(11);
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

  stop() { this.sprite.body.setVelocity(0, 0); this.currentSpeed = 0; this.isSprinting = false; }

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

  destroy() { this.sprite.destroy(); this.gfx.destroy(); this.label.destroy(); }
}
