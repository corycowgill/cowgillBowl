import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // No external assets needed for graybox prototype
    // All visuals are procedurally drawn
    this.scene.start('Menu');
  }
}
