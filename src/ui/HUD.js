import { HUD_BG, HUD_HEIGHT } from '../config.js';

function hexStr(c) {
  return '#' + (c & 0xffffff).toString(16).padStart(6, '0');
}

export default class HUD {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);

    const w = 960;

    // Background bar
    this.bg = scene.add.rectangle(w / 2, HUD_HEIGHT / 2, w, HUD_HEIGHT, HUD_BG, 0.9);
    this.container.add(this.bg);

    const ts = { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff' };

    // ── Home team block (left) ──
    this.homeBg = scene.add.rectangle(60, HUD_HEIGHT / 2, 120, HUD_HEIGHT - 4, 0x333333, 0.6);
    this.homeLabel = scene.add.text(60, 8, 'HOME', {
      ...ts, fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.homeScore = scene.add.text(60, 26, '0', {
      ...ts, fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0);
    this.homeTOText = scene.add.text(118, 36, '', {
      fontFamily: 'monospace', fontSize: '8px', color: '#888888',
    }).setOrigin(1, 0);

    // ── Away team block (right) ──
    this.awayBg = scene.add.rectangle(w - 60, HUD_HEIGHT / 2, 120, HUD_HEIGHT - 4, 0x333333, 0.6);
    this.awayLabel = scene.add.text(w - 60, 8, 'AWAY', {
      ...ts, fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.awayScore = scene.add.text(w - 60, 26, '0', {
      ...ts, fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0);
    this.awayTOText = scene.add.text(w - 118 + 118, 36, '', {
      fontFamily: 'monospace', fontSize: '8px', color: '#888888',
    }).setOrigin(1, 0);

    // ── Center: clock + quarter ──
    this.quarterText = scene.add.text(w / 2, 4, 'Q1', {
      ...ts, fontSize: '11px', color: '#999999',
    }).setOrigin(0.5, 0);
    this.clockText = scene.add.text(w / 2, 17, '5:00', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // ── Down & distance (left of center) ──
    this.downText = scene.add.text(w / 2 - 110, 10, '1st & 10', {
      fontFamily: 'monospace', fontSize: '12px', color: '#cccccc', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.fieldPosText = scene.add.text(w / 2 - 110, 28, 'OWN 25', {
      fontFamily: 'monospace', fontSize: '10px', color: '#888888',
    }).setOrigin(0.5, 0);

    // ── Possession arrow (right of center) ──
    this.possArrow = scene.add.text(w / 2 + 110, 16, '', {
      fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Message overlay
    this.messageText = scene.add.text(w / 2, 100, '', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffff00',
      stroke: '#000000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.messageTimer = 0;

    this.container.add([
      this.homeBg, this.homeLabel, this.homeScore, this.homeTOText,
      this.awayBg, this.awayLabel, this.awayScore, this.awayTOText,
      this.quarterText, this.clockText,
      this.downText, this.fieldPosText,
      this.possArrow,
    ]);
  }

  update(match, homeTeam, awayTeam, dt) {
    // Team labels + colors
    this.homeLabel.setText(homeTeam.abbr);
    this.homeScore.setText('' + match.homeScore);
    this.homeBg.setFillStyle(homeTeam.colors.primary, 0.55);
    this.homeTOText.setText('\u25cf'.repeat(match.homeTimeouts));

    this.awayLabel.setText(awayTeam.abbr);
    this.awayScore.setText('' + match.awayScore);
    this.awayBg.setFillStyle(awayTeam.colors.primary, 0.55);
    this.awayTOText.setText('\u25cf'.repeat(match.awayTimeouts));

    this.quarterText.setText('Q' + match.quarter);
    this.clockText.setText(match.formatClock());
    this.downText.setText(match.getDownText());
    this.fieldPosText.setText(match.getFieldPositionText());

    // Possession arrow points toward the team with the ball
    const possHome = match.possession === 'home';
    this.possArrow.setText(possHome ? '\u25c0' : '\u25b6');
    this.possArrow.setColor(hexStr(possHome ? homeTeam.colors.primary : awayTeam.colors.primary));

    // Flash clock when under 2 minutes
    if (match.clockSeconds <= 120 && (match.quarter === 2 || match.quarter === 4)) {
      this.clockText.setColor(Math.floor(Date.now() / 500) % 2 ? '#ff3300' : '#ffcc00');
    } else {
      this.clockText.setColor('#ffcc00');
    }

    // Message fade
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.messageText.setText('');
      }
    }
  }

  showMessage(text, duration) {
    this.messageText.setText(text);
    this.messageTimer = duration || 2;
  }

  destroy() {
    this.container.destroy();
    this.messageText.destroy();
  }
}
