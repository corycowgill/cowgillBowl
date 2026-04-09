import Phaser from 'phaser';
import { TEAMS } from '../data/teams.js';
import SeasonManager from '../systems/SeasonManager.js';
import GamepadManager from '../ui/GamepadManager.js';

export default class TeamSelectScene extends Phaser.Scene {
  constructor() { super('TeamSelect'); }

  init(data) {
    this.gameMode = data.mode || 'quick';
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x111111);

    this.add.text(w / 2, 30, 'SELECT YOUR TEAM', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.selectedIdx = 0;
    this.teamButtons = [];

    // Grid of teams
    const cols = 4;
    const btnW = 150;
    const btnH = 60;
    const gapX = 12;
    const gapY = 10;
    const startX = w / 2 - ((cols * (btnW + gapX)) - gapX) / 2 + btnW / 2;
    const startY = 70;

    TEAMS.forEach((team, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gapX);
      const y = startY + row * (btnH + gapY) + btnH / 2;

      const bg = this.add.rectangle(x, y, btnW, btnH, team.colors.primary, 0.8)
        .setStrokeStyle(2, 0x666666)
        .setInteractive({ useHandCursor: true });

      const cityText = this.add.text(x, y - 10, team.city, {
        fontFamily: 'monospace', fontSize: '10px', color: '#cccccc',
      }).setOrigin(0.5);
      const nameText = this.add.text(x, y + 8, team.name, {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      bg.on('pointerover', () => { bg.setStrokeStyle(3, 0x00ff00); });
      bg.on('pointerout', () => {
        bg.setStrokeStyle(i === this.selectedIdx ? 3 : 2, i === this.selectedIdx ? 0x00ff00 : 0x666666);
      });
      bg.on('pointerdown', () => {
        this.selectedIdx = i;
        this.selectTeam(i);
      });

      this.teamButtons.push({ bg, cityText, nameText });
    });

    // Team info panel
    this.infoText = this.add.text(w / 2, h - 80, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa', align: 'center',
    }).setOrigin(0.5);

    this.starsText = this.add.text(w / 2, h - 50, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffff00', align: 'center',
    }).setOrigin(0.5);

    this.updateInfo();

    // Keyboard + gamepad
    this.cursors = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      enter: 'SPACE', a: 'A', d: 'D', w: 'W', s: 'S',
    });
    this.gamepad = new GamepadManager();
  }

  updateInfo() {
    const team = TEAMS[this.selectedIdx];
    this.infoText.setText(`${team.city} ${team.name} — ${team.identity}`);
    const stars = team.roster.filter(p => p.star).map(p => `#${p.num} ${p.name} (${p.pos})`);
    this.starsText.setText('Stars: ' + (stars.join(', ') || 'None'));

    this.teamButtons.forEach((btn, i) => {
      btn.bg.setStrokeStyle(i === this.selectedIdx ? 3 : 2, i === this.selectedIdx ? 0x00ff00 : 0x666666);
    });
  }

  selectTeam(idx) {
    const playerTeam = TEAMS[idx];

    if (this.gameMode === 'season') {
      const mgr = new SeasonManager();
      mgr.playerTeam = playerTeam.abbr;
      this.scene.start('Season', { seasonMgr: mgr });
      return;
    }

    // Quick play: random opponent
    let oppIdx;
    do { oppIdx = Math.floor(Math.random() * TEAMS.length); } while (oppIdx === idx);
    const oppTeam = TEAMS[oppIdx];

    this.scene.start('Game', {
      mode: this.gameMode,
      homeTeam: playerTeam,
      awayTeam: oppTeam,
      humanSide: 'home',
    });
  }

  update() {
    this.gamepad.poll();
    const gp = this.gamepad;
    const cols = 4;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.cursors.d) || gp.justPressed(15)) {
      this.selectedIdx = Math.min(this.selectedIdx + 1, TEAMS.length - 1);
      this.updateInfo();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.cursors.a) || gp.justPressed(14)) {
      this.selectedIdx = Math.max(this.selectedIdx - 1, 0);
      this.updateInfo();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.cursors.s) || gp.justPressed(13)) {
      this.selectedIdx = Math.min(this.selectedIdx + cols, TEAMS.length - 1);
      this.updateInfo();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.w) || gp.justPressed(12)) {
      this.selectedIdx = Math.max(this.selectedIdx - cols, 0);
      this.updateInfo();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.enter) || gp.actionJustPressed) {
      this.selectTeam(this.selectedIdx);
    }
  }
}
