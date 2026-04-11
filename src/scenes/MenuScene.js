import Phaser from 'phaser';
import GamepadManager from '../ui/GamepadManager.js';
import { TEAMS } from '../data/teams.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // ── Dark gradient background ──
    const bg = this.add.graphics();
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const r = Math.floor(8 + t * 12);
      const g2 = Math.floor(16 + t * 8);
      const b = Math.floor(8 + t * 16);
      bg.fillStyle((r << 16) | (g2 << 8) | b, 1);
      bg.fillRect(0, i, w, 1);
    }

    // ── Decorative field lines in background ──
    const fieldGfx = this.add.graphics();
    fieldGfx.lineStyle(1, 0x224422, 0.15);
    for (let x = 80; x < w; x += 48) {
      fieldGfx.lineBetween(x, h * 0.35, x, h * 0.95);
    }
    fieldGfx.lineStyle(1, 0x224422, 0.1);
    fieldGfx.lineBetween(80, h * 0.65, w - 80, h * 0.65);

    // ── Floating team color dots in background ──
    for (let i = 0; i < 40; i++) {
      const team = TEAMS[Math.floor(Math.random() * TEAMS.length)];
      const dot = this.add.circle(
        Math.random() * w,
        Math.random() * h,
        2 + Math.random() * 3,
        team.colors.primary,
        0.08 + Math.random() * 0.08
      );
      this.tweens.add({
        targets: dot,
        y: dot.y + 15 + Math.random() * 20,
        alpha: 0.02,
        duration: 3000 + Math.random() * 4000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ── Title with shadow ──
    this.add.text(w / 2 + 2, h * 0.16 + 2, 'COWGILL BOWL', {
      fontFamily: 'monospace', fontSize: '44px', color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.4);

    this.add.text(w / 2, h * 0.16, 'COWGILL BOWL', {
      fontFamily: 'monospace', fontSize: '44px', color: '#ffcc00',
      fontStyle: 'bold', stroke: '#553300', strokeThickness: 3,
    }).setOrigin(0.5);

    // ── Tagline ──
    const tagline = this.add.text(w / 2, h * 0.26, 'Every Down a Showdown', {
      fontFamily: 'monospace', fontSize: '13px', color: '#88aa88',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: tagline, alpha: 0.4, duration: 2000, yoyo: true, repeat: -1,
    });

    // ── Decorative line under title ──
    const line = this.add.graphics();
    line.lineStyle(1, 0xffcc00, 0.3);
    line.lineBetween(w / 2 - 120, h * 0.30, w / 2 + 120, h * 0.30);

    // ── Menu buttons ──
    const options = [
      { label: 'QUICK PLAY', desc: 'Pick a team, play one game', scene: 'TeamSelect', data: { mode: 'quick' } },
      { label: 'SEASON MODE', desc: '12-week season with standings', scene: 'TeamSelect', data: { mode: 'season' } },
    ];

    this.menuBgs = [];
    options.forEach((opt, i) => {
      const y = h * 0.42 + i * 65;
      const mbg = this.add.rectangle(w / 2, y, 280, 50, 0x1a2a1a, 1)
        .setStrokeStyle(2, 0x44aa44)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(w / 2, y - 6, opt.label, {
        fontFamily: 'monospace', fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const desc = this.add.text(w / 2, y + 12, opt.desc, {
        fontFamily: 'monospace', fontSize: '9px', color: '#668866',
      }).setOrigin(0.5);

      mbg.on('pointerover', () => { mbg.setFillStyle(0x2a3a2a); mbg.setStrokeStyle(2, 0x66cc66); });
      mbg.on('pointerout', () => { mbg.setFillStyle(0x1a2a1a); mbg.setStrokeStyle(2, 0x44aa44); });
      mbg.on('pointerdown', () => { this.scene.start(opt.scene, opt.data); });
      this.menuBgs.push(mbg);
    });

    // ── Controls help ──
    const cs = { fontFamily: 'monospace', fontSize: '8px', color: '#444444' };
    this.add.text(w / 2, h - 55, 'Keyboard: Arrows/WASD  |  SPACE snap/tackle  |  J pass/switch  |  K sprint  |  ESC stats', cs).setOrigin(0.5);
    this.add.text(w / 2, h - 42, 'Xbox: Stick/D-pad  |  A action  |  B pass/switch  |  X sprint  |  Start stats', cs).setOrigin(0.5);
    this.add.text(w / 2, h - 29, 'Mobile: Joystick + ACT/PASS/RUN buttons', cs).setOrigin(0.5);

    // ── Version ──
    this.add.text(w - 8, h - 8, 'v1.0', {
      fontFamily: 'monospace', fontSize: '8px', color: '#333333',
    }).setOrigin(1, 1);

    // Keyboard + gamepad nav
    this.selectedIdx = 0;
    this.menuOptions = options;
    this.cursors = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', enter: 'SPACE', w: 'W', s: 'S',
    });
    this.gamepad = new GamepadManager();
    this._updateMenuHighlight();
  }

  _updateMenuHighlight() {
    this.menuBgs.forEach((bg, i) => {
      if (i === this.selectedIdx) {
        bg.setFillStyle(0x2a3a2a);
        bg.setStrokeStyle(2, 0x66cc66);
      } else {
        bg.setFillStyle(0x1a2a1a);
        bg.setStrokeStyle(2, 0x44aa44);
      }
    });
  }

  update() {
    this.gamepad.poll();
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.cursors.s) || this.gamepad.justPressed(13)) {
      this.selectedIdx = Math.min(this.selectedIdx + 1, this.menuOptions.length - 1);
      this._updateMenuHighlight();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.w) || this.gamepad.justPressed(12)) {
      this.selectedIdx = Math.max(this.selectedIdx - 1, 0);
      this._updateMenuHighlight();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.enter) || this.gamepad.actionJustPressed) {
      const opt = this.menuOptions[this.selectedIdx];
      this.scene.start(opt.scene, opt.data);
    }
  }
}
