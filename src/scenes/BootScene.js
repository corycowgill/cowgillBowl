import Phaser from 'phaser';
import { TEAMS } from '../data/teams.js';
import SpriteGenerator from '../sprites/SpriteGenerator.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // Show loading text
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const loadText = this.add.text(w / 2, h / 2, 'Generating sprites...', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffcc00',
    }).setOrigin(0.5);

    // Generate all team spritesheets (procedural pixel art)
    this.time.delayedCall(50, () => {
      SpriteGenerator.generate(this, TEAMS);
      loadText.setText('Ready!');
      this.time.delayedCall(200, () => {
        this.scene.start('Menu');
      });
    });
  }
}
