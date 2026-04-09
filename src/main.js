import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import TeamSelectScene from './scenes/TeamSelectScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import SeasonScene from './scenes/SeasonScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 540,
  backgroundColor: '#111111',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, TeamSelectScene, GameScene, GameOverScene, SeasonScene],
};

const game = new Phaser.Game(config);
