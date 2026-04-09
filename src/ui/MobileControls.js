import { isMobile } from '../config.js';

export default class MobileControls {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(120);

    // Enable on any touch device
    this.enabled = isMobile() || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    this.moveX = 0;
    this.moveY = 0;
    this.actionPressed = false;
    this.passPressed = false;
    this.sprintPressed = false;

    // Track which pointer is on the joystick
    this._joyPointerId = null;

    if (this.enabled) {
      this.createControls();
    }
  }

  createControls() {
    const w = 960;  // fixed game resolution
    const h = 540;

    // ── Virtual Joystick (left side) ──
    const joyX = 100;
    const joyY = h - 110;
    const joyRadius = 60;
    const joyKnobRadius = 25;

    this.joyBase = this.scene.add.circle(joyX, joyY, joyRadius, 0x333333, 0.35);
    this.joyKnob = this.scene.add.circle(joyX, joyY, joyKnobRadius, 0x999999, 0.55);
    this.joyBase.setStrokeStyle(2, 0x555555, 0.5);
    this.container.add([this.joyBase, this.joyKnob]);

    this.joyBaseX = joyX;
    this.joyBaseY = joyY;
    this.joyRadius = joyRadius;

    // Use Phaser's multi-touch pointer tracking
    this.scene.input.addPointer(2); // support up to 3 simultaneous touches

    // Track joystick per-pointer
    this.scene.input.on('pointerdown', (pointer) => {
      // If touch is on left half of screen, treat as joystick
      if (pointer.x < w * 0.4 && this._joyPointerId === null) {
        this._joyPointerId = pointer.id;
        this._updateJoystick(pointer);
      }
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (pointer.id === this._joyPointerId && pointer.isDown) {
        this._updateJoystick(pointer);
      }
    });

    this.scene.input.on('pointerup', (pointer) => {
      if (pointer.id === this._joyPointerId) {
        this._joyPointerId = null;
        this.joyKnob.x = this.joyBaseX;
        this.joyKnob.y = this.joyBaseY;
        this.moveX = 0;
        this.moveY = 0;
      }
    });

    // ── Action Buttons (right side) ──
    const btnSize = 40;
    const btnX = w - 90;
    const btnY = h - 150;

    // Action/Snap/Tackle button (green, biggest)
    this.actionBtn = this._createButton(btnX, btnY, btnSize + 5, 0x00aa00, 'ACT');
    this.actionBtn.bg.on('pointerdown', () => { this.actionPressed = true; });
    this.actionBtn.bg.on('pointerup', () => { this.actionPressed = false; });
    this.actionBtn.bg.on('pointerout', () => { this.actionPressed = false; });

    // Pass/Switch button (blue)
    this.passBtn = this._createButton(btnX - 70, btnY + 15, btnSize, 0x0066cc, 'PASS');
    this.passBtn.bg.on('pointerdown', () => { this.passPressed = true; });
    this.passBtn.bg.on('pointerup', () => { this.passPressed = false; });
    this.passBtn.bg.on('pointerout', () => { this.passPressed = false; });

    // Sprint button (orange)
    this.sprintBtn = this._createButton(btnX, btnY + 80, btnSize, 0xcc6600, 'RUN');
    this.sprintBtn.bg.on('pointerdown', () => { this.sprintPressed = true; });
    this.sprintBtn.bg.on('pointerup', () => { this.sprintPressed = false; });
    this.sprintBtn.bg.on('pointerout', () => { this.sprintPressed = false; });

    // Labels for context
    this._contextLabel = this.scene.add.text(w / 2, h - 20, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#666666', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(121);
  }

  _updateJoystick(pointer) {
    const dx = pointer.x - this.joyBaseX;
    const dy = pointer.y - this.joyBaseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampDist = Math.min(dist, this.joyRadius);
    const angle = Math.atan2(dy, dx);

    this.joyKnob.x = this.joyBaseX + Math.cos(angle) * clampDist;
    this.joyKnob.y = this.joyBaseY + Math.sin(angle) * clampDist;

    // Only register movement if dragged past a small dead zone
    if (dist > 8) {
      this.moveX = (Math.cos(angle) * clampDist) / this.joyRadius;
      this.moveY = (Math.sin(angle) * clampDist) / this.joyRadius;
    } else {
      this.moveX = 0;
      this.moveY = 0;
    }
  }

  _createButton(x, y, size, color, label) {
    const bg = this.scene.add.circle(x, y, size, color, 0.45)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setInteractive();
    const txt = this.scene.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add([bg, txt]);
    return { bg, txt };
  }

  setContextHint(text) {
    if (this._contextLabel) this._contextLabel.setText(text);
  }

  show() { this.container.setVisible(true); }
  hide() { this.container.setVisible(false); }

  consumeAction() {
    const v = this.actionPressed;
    this.actionPressed = false;
    return v;
  }

  consumePass() {
    const v = this.passPressed;
    this.passPressed = false;
    return v;
  }
}
