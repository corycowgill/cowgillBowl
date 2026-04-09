import Phaser from 'phaser';
import { TEAMS } from '../data/teams.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) {
    this.homeTeam = data.homeTeam;
    this.awayTeam = data.awayTeam;
    this.homeScore = data.homeScore;
    this.awayScore = data.awayScore;
    this.stats = data.stats;
    this.gameMode = data.mode;
    this.seasonMgr = data.seasonMgr;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a0a);

    const winner = this.homeScore > this.awayScore ? this.homeTeam : this.awayTeam;
    const winScore = Math.max(this.homeScore, this.awayScore);
    const loseScore = Math.min(this.homeScore, this.awayScore);

    this.add.text(w / 2, 40, 'FINAL', {
      fontFamily: 'monospace', fontSize: '16px', color: '#888888',
    }).setOrigin(0.5);

    this.add.text(w / 2, 70, winner.city + ' ' + winner.name + ' WIN!', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Scoreboard
    const scoreY = 110;
    this.add.text(w / 2 - 80, scoreY, this.homeTeam.abbr, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(w / 2, scoreY, this.homeScore + ' - ' + this.awayScore, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(w / 2 + 80, scoreY, this.awayTeam.abbr, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stats
    const statY = 155;
    const stats = this.stats;
    const leftX = w / 2 - 100;
    const rightX = w / 2 + 100;
    const ss = { fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa' };

    const statLabels = [
      ['Pass Yards', 'passYds'],
      ['Rush Yards', 'rushYds'],
      ['Pass TDs', 'passTD'],
      ['Rush TDs', 'rushTD'],
      ['Interceptions', 'ints'],
      ['Fumbles', 'fumbles'],
      ['Sacks', 'sacks'],
      ['First Downs', 'firstDowns'],
    ];

    statLabels.forEach(([label, key], i) => {
      const y = statY + i * 20;
      this.add.text(leftX, y, '' + (stats.home[key] || 0), ss).setOrigin(1, 0);
      this.add.text(w / 2, y, label, { ...ss, color: '#666666' }).setOrigin(0.5, 0);
      this.add.text(rightX, y, '' + (stats.away[key] || 0), ss).setOrigin(0, 0);
    });

    // Buttons
    const btnY = h - 60;
    const rematchBtn = this.add.rectangle(w / 2 - 90, btnY, 150, 40, 0x224422)
      .setStrokeStyle(2, 0x44aa44).setInteractive({ useHandCursor: true });
    this.add.text(w / 2 - 90, btnY, 'REMATCH', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    rematchBtn.on('pointerdown', () => {
      this.scene.start('Game', {
        mode: this.gameMode,
        homeTeam: this.homeTeam,
        awayTeam: this.awayTeam,
        humanSide: 'home',
        seasonMgr: this.seasonMgr,
      });
    });

    const menuBtn = this.add.rectangle(w / 2 + 90, btnY, 150, 40, 0x442222)
      .setStrokeStyle(2, 0xaa4444).setInteractive({ useHandCursor: true });
    this.add.text(w / 2 + 90, btnY, 'MAIN MENU', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    menuBtn.on('pointerdown', () => {
      if (this.seasonMgr) {
        this.seasonMgr.recordResult(
          this.homeTeam.abbr, this.awayTeam.abbr,
          this.homeScore, this.awayScore
        );
        this.seasonMgr.simulateOtherGames(this.homeTeam.abbr, this.awayTeam.abbr);
        this.seasonMgr.advanceWeek();
        this.scene.start('Season', { seasonMgr: this.seasonMgr });
      } else {
        this.scene.start('Menu');
      }
    });

    // Keyboard
    this.input.keyboard.on('keydown-SPACE', () => {
      rematchBtn.emit('pointerdown');
    });
    this.input.keyboard.on('keydown-ESC', () => {
      menuBtn.emit('pointerdown');
    });
  }
}
