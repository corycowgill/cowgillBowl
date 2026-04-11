import Phaser from 'phaser';

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

    const winner = this.homeScore > this.awayScore ? this.homeTeam : this.awayTeam;
    const loser = this.homeScore > this.awayScore ? this.awayTeam : this.homeTeam;

    // ── Background gradient in winner's color ──
    const bg = this.add.graphics();
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const wc = winner.colors.primary;
      const r = Math.floor(((wc >> 16) & 0xff) * 0.15 * (1 - t));
      const gv = Math.floor(((wc >> 8) & 0xff) * 0.15 * (1 - t));
      const b = Math.floor((wc & 0xff) * 0.15 * (1 - t));
      bg.fillStyle((r << 16) | (gv << 8) | b, 1);
      bg.fillRect(0, i, w, 1);
    }

    // ── Confetti particles ──
    for (let i = 0; i < 30; i++) {
      const colors = [winner.colors.primary, winner.colors.accent, 0xffffff, 0xffcc00];
      const dot = this.add.circle(
        Math.random() * w, Math.random() * h * 0.6,
        1.5 + Math.random() * 2,
        colors[Math.floor(Math.random() * colors.length)],
        0.3 + Math.random() * 0.4
      );
      this.tweens.add({
        targets: dot, y: dot.y + 30 + Math.random() * 40, alpha: 0,
        duration: 2000 + Math.random() * 3000, repeat: -1, ease: 'Sine.easeIn',
      });
    }

    // ── "FINAL" header ──
    this.add.text(w / 2, 25, 'FINAL', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888888', letterSpacing: 4,
    }).setOrigin(0.5);

    // ── Winner banner ──
    const bannerY = 55;
    this.add.rectangle(w / 2, bannerY, w - 60, 40, winner.colors.primary, 0.4)
      .setStrokeStyle(1, 0xffffff, 0.2);
    const winText = this.add.text(w / 2, bannerY, winner.city + ' ' + winner.name + ' WIN!', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffcc00',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: winText, scale: 1.05, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Scoreboard ──
    const scoreY = 95;
    // Home side
    this.add.rectangle(w / 2 - 70, scoreY, 100, 35, this.homeTeam.colors.primary, 0.5);
    this.add.text(w / 2 - 70, scoreY - 8, this.homeTeam.abbr, {
      fontFamily: 'monospace', fontSize: '11px', color: '#cccccc', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(w / 2 - 70, scoreY + 8, '' + this.homeScore, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Divider
    this.add.text(w / 2, scoreY, '—', {
      fontFamily: 'monospace', fontSize: '16px', color: '#666666',
    }).setOrigin(0.5);

    // Away side
    this.add.rectangle(w / 2 + 70, scoreY, 100, 35, this.awayTeam.colors.primary, 0.5);
    this.add.text(w / 2 + 70, scoreY - 8, this.awayTeam.abbr, {
      fontFamily: 'monospace', fontSize: '11px', color: '#cccccc', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(w / 2 + 70, scoreY + 8, '' + this.awayScore, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── Stats table ──
    const statY = 135;
    const stats = this.stats;
    const leftX = w / 2 - 105;
    const rightX = w / 2 + 105;
    const ss = { fontFamily: 'monospace', fontSize: '10px', color: '#cccccc' };
    const sl = { fontFamily: 'monospace', fontSize: '10px', color: '#666666' };

    // Divider line
    const dg = this.add.graphics();
    dg.lineStyle(1, 0x444444, 0.5);
    dg.lineBetween(leftX - 30, statY - 5, rightX + 30, statY - 5);

    const statLabels = [
      ['Pass Yards', 'passYds'], ['Rush Yards', 'rushYds'],
      ['Pass TDs', 'passTD'], ['Rush TDs', 'rushTD'],
      ['Interceptions', 'ints'], ['Fumbles', 'fumbles'],
      ['Sacks', 'sacks'], ['First Downs', 'firstDowns'],
    ];

    statLabels.forEach(([label, key], i) => {
      const y = statY + i * 18;
      const hv = stats.home[key] || 0;
      const av = stats.away[key] || 0;
      // Highlight the better team's stat
      const hColor = hv > av ? '#ffffff' : '#888888';
      const aColor = av > hv ? '#ffffff' : '#888888';
      this.add.text(leftX, y, '' + hv, { ...ss, color: hColor }).setOrigin(1, 0);
      this.add.text(w / 2, y, label, sl).setOrigin(0.5, 0);
      this.add.text(rightX, y, '' + av, { ...ss, color: aColor }).setOrigin(0, 0);
    });

    // ── Action buttons ──
    const btnY = h - 45;
    const mkBtn = (x, label, color, stroke, fn) => {
      const btn = this.add.rectangle(x, btnY, 155, 38, color, 1)
        .setStrokeStyle(2, stroke).setInteractive({ useHandCursor: true });
      this.add.text(x, btnY, label, {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setAlpha(0.8));
      btn.on('pointerout', () => btn.setAlpha(1));
      btn.on('pointerdown', fn);
      return btn;
    };

    const rematchBtn = mkBtn(w / 2 - 90, 'REMATCH', 0x224422, 0x44aa44, () => {
      this.scene.start('Game', {
        mode: this.gameMode, homeTeam: this.homeTeam, awayTeam: this.awayTeam,
        humanSide: 'home', seasonMgr: this.seasonMgr,
      });
    });

    const continueLabel = this.seasonMgr ? 'CONTINUE SEASON' : 'MAIN MENU';
    mkBtn(w / 2 + 90, continueLabel, 0x333344, 0x6666aa, () => {
      if (this.seasonMgr) {
        this.seasonMgr.recordResult(this.homeTeam.abbr, this.awayTeam.abbr, this.homeScore, this.awayScore);
        this.seasonMgr.simulateOtherGames(this.homeTeam.abbr, this.awayTeam.abbr);
        this.seasonMgr.advanceWeek();
        this.scene.start('Season', { seasonMgr: this.seasonMgr });
      } else {
        this.scene.start('Menu');
      }
    });

    // ── Keyboard hints ──
    this.add.text(w / 2, h - 12, 'SPACE = Rematch  |  ESC = Continue', {
      fontFamily: 'monospace', fontSize: '8px', color: '#444444',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => rematchBtn.emit('pointerdown'));
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.seasonMgr) {
        this.seasonMgr.recordResult(this.homeTeam.abbr, this.awayTeam.abbr, this.homeScore, this.awayScore);
        this.seasonMgr.simulateOtherGames(this.homeTeam.abbr, this.awayTeam.abbr);
        this.seasonMgr.advanceWeek();
        this.scene.start('Season', { seasonMgr: this.seasonMgr });
      } else {
        this.scene.start('Menu');
      }
    });
  }
}
