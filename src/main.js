import Phaser from 'phaser';
import { WORLD_W, WORLD_H, isMobile } from './config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import TeamSelectScene from './scenes/TeamSelectScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import SeasonScene from './scenes/SeasonScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: isMobile() ? window.innerWidth : 960,
  height: isMobile() ? window.innerHeight : 540,
  backgroundColor: '#111111',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
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
