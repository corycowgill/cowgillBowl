import { HUD_BG, HUD_HEIGHT, WORLD_W } from '../config.js';

export default class HUD {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);

    const cam = scene.cameras.main;
    const w = cam.width;

    // Background bar
    this.bg = scene.add.rectangle(w / 2, HUD_HEIGHT / 2, w, HUD_HEIGHT, HUD_BG, 0.85);
    this.container.add(this.bg);

    const ts = { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' };
    const tsSmall = { fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa' };

    // Home team
    this.homeLabel = scene.add.text(10, 6, 'HOME', { ...ts, fontStyle: 'bold' });
    this.homeScore = scene.add.text(10, 24, '0', tsSmall);

    // Away team
    this.awayLabel = scene.add.text(w - 10, 6, 'AWAY', { ...ts, fontStyle: 'bold' }).setOrigin(1, 0);
    this.awayScore = scene.add.text(w - 10, 24, '0', tsSmall).setOrigin(1, 0);

    // Center info
    this.quarterText = scene.add.text(w / 2, 4, 'Q1', ts).setOrigin(0.5, 0);
    this.clockText = scene.add.text(w / 2, 20, '5:00', { ...ts, fontSize: '16px', color: '#ffcc00' }).setOrigin(0.5, 0);

    // Down and distance
    this.downText = scene.add.text(w / 2 - 120, 14, '1st & 10', tsSmall).setOrigin(0.5, 0);

    // Field position
    this.fieldPosText = scene.add.text(w / 2 + 120, 14, 'OWN 25', tsSmall).setOrigin(0.5, 0);

    // Possession indicator
    this.possCircle = scene.add.circle(w / 2 - 180, HUD_HEIGHT / 2, 5, 0xffff00);

    // Timeouts
    this.homeTOText = scene.add.text(100, 24, 'TO: 3', { ...tsSmall, fontSize: '9px' });
    this.awayTOText = scene.add.text(w - 100, 24, 'TO: 3', { ...tsSmall, fontSize: '9px' }).setOrigin(1, 0);

    // Message overlay
    this.messageText = scene.add.text(w / 2, 100, '', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffff00',
      stroke: '#000000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.messageTimer = 0;

    this.container.add([
      this.homeLabel, this.homeScore,
      this.awayLabel, this.awayScore,
      this.quarterText, this.clockText,
      this.downText, this.fieldPosText,
      this.possCircle,
      this.homeTOText, this.awayTOText,
    ]);
  }

  update(match, homeTeam, awayTeam, dt) {
    this.homeLabel.setText(homeTeam.abbr);
    this.homeScore.setText('' + match.homeScore);
    this.awayLabel.setText(awayTeam.abbr);
    this.awayScore.setText('' + match.awayScore);
    this.quarterText.setText('Q' + match.quarter);
    this.clockText.setText(match.formatClock());
    this.downText.setText(match.getDownText());
    this.fieldPosText.setText(match.getFieldPositionText());
    this.homeTOText.setText('TO: ' + match.homeTimeouts);
    this.awayTOText.setText('TO: ' + match.awayTimeouts);

    // Possession indicator color
    const possColor = match.possession === 'home' ? homeTeam.colors.primary : awayTeam.colors.primary;
    this.possCircle.setFillStyle(possColor);

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
