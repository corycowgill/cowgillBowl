import { isMobile } from '../config.js';

export default class MobileControls {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(120);
    this.enabled = isMobile();

    this.moveX = 0;
    this.moveY = 0;
    this.actionPressed = false;
    this.passPressed = false;
    this.sprintPressed = false;

    if (this.enabled) {
      this.createControls();
    }
  }

  createControls() {
    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Virtual joystick (left side)
    const joyX = 80;
    const joyY = h - 90;
    const joyRadius = 50;
    const joyKnobRadius = 20;

    this.joyBase = this.scene.add.circle(joyX, joyY, joyRadius, 0x333333, 0.4);
    this.joyKnob = this.scene.add.circle(joyX, joyY, joyKnobRadius, 0x888888, 0.6);
    this.joyBase.setInteractive();
    this.container.add([this.joyBase, this.joyKnob]);

    this.joyBaseX = joyX;
    this.joyBaseY = joyY;

    // Joystick drag
    this.scene.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      const dx = pointer.x - this.joyBaseX;
      const dy = pointer.y - this.joyBaseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > joyRadius * 2) return; // too far from joystick

      const clampDist = Math.min(dist, joyRadius);
      const angle = Math.atan2(dy, dx);
      this.joyKnob.x = this.joyBaseX + Math.cos(angle) * clampDist;
      this.joyKnob.y = this.joyBaseY + Math.sin(angle) * clampDist;
      this.moveX = (Math.cos(angle) * clampDist) / joyRadius;
      this.moveY = (Math.sin(angle) * clampDist) / joyRadius;
    });

    this.scene.input.on('pointerup', () => {
      this.joyKnob.x = this.joyBaseX;
      this.joyKnob.y = this.joyBaseY;
      this.moveX = 0;
      this.moveY = 0;
      this.actionPressed = false;
      this.passPressed = false;
      this.sprintPressed = false;
    });

    // Action button (right side)
    const btnSize = 35;
    const btnX = w - 70;
    const btnY = h - 120;

    this.actionBtn = this.createButton(btnX, btnY, btnSize, 0x00aa00, 'A');
    this.actionBtn.bg.on('pointerdown', () => { this.actionPressed = true; });
    this.actionBtn.bg.on('pointerup', () => { this.actionPressed = false; });

    // Pass/Switch button
    this.passBtn = this.createButton(btnX - 55, btnY + 20, btnSize, 0x0066cc, 'P');
    this.passBtn.bg.on('pointerdown', () => { this.passPressed = true; });
    this.passBtn.bg.on('pointerup', () => { this.passPressed = false; });

    // Sprint button
    this.sprintBtn = this.createButton(btnX + 10, btnY + 55, btnSize, 0xcc6600, 'S');
    this.sprintBtn.bg.on('pointerdown', () => { this.sprintPressed = true; });
    this.sprintBtn.bg.on('pointerup', () => { this.sprintPressed = false; });
  }

  createButton(x, y, size, color, label) {
    const bg = this.scene.add.circle(x, y, size, color, 0.5).setInteractive();
    const txt = this.scene.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add([bg, txt]);
    return { bg, txt };
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
