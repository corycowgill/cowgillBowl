import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a1a0a);

    // Title
    this.add.text(w / 2, h * 0.18, 'COWGILL BOWL', {
      fontFamily: 'monospace', fontSize: '42px', color: '#ffcc00',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // Tagline
    this.add.text(w / 2, h * 0.28, 'Every Down a Showdown', {
      fontFamily: 'monospace', fontSize: '14px', color: '#88aa88',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Menu options
    const options = [
      { label: 'QUICK PLAY', scene: 'TeamSelect', data: { mode: 'quick' } },
      { label: 'SEASON MODE', scene: 'TeamSelect', data: { mode: 'season' } },
    ];

    options.forEach((opt, i) => {
      const y = h * 0.45 + i * 60;
      const bg = this.add.rectangle(w / 2, y, 260, 45, 0x224422, 1)
        .setStrokeStyle(2, 0x44aa44)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(w / 2, y, opt.label, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      bg.on('pointerover', () => { bg.setFillStyle(0x336633); });
      bg.on('pointerout', () => { bg.setFillStyle(0x224422); });
      bg.on('pointerdown', () => {
        this.scene.start(opt.scene, opt.data);
      });
    });

    // Controls help
    this.add.text(w / 2, h - 60, 'Controls: Arrows/WASD move | SPACE snap/tackle | J pass/switch | K sprint', {
      fontFamily: 'monospace', fontSize: '9px', color: '#555555',
    }).setOrigin(0.5);

    this.add.text(w / 2, h - 40, 'Mobile: Virtual joystick + action buttons', {
      fontFamily: 'monospace', fontSize: '9px', color: '#555555',
    }).setOrigin(0.5);

    // Keyboard nav
    this.selectedIdx = 0;
    this.menuOptions = options;
    this.cursors = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', enter: 'SPACE',
      w: 'W', s: 'S',
    });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.cursors.s)) {
      this.selectedIdx = Math.min(this.selectedIdx + 1, this.menuOptions.length - 1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.w)) {
      this.selectedIdx = Math.max(this.selectedIdx - 1, 0);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.enter)) {
      const opt = this.menuOptions[this.selectedIdx];
      this.scene.start(opt.scene, opt.data);
    }
  }
}
