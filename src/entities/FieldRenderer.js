import {
  FIELD_LEFT, FIELD_TOP, FIELD_LENGTH_PX, FIELD_WIDTH_PX, END_ZONE_PX,
  TOTAL_FIELD_PX, YARD_PX, FIELD_GREEN, FIELD_DARK, END_ZONE_COLOR,
  LINE_COLOR, HASH_COLOR, YARD_NUM_COLOR,
  SIDELINE_COLOR, CROWD_COLOR_1, CROWD_COLOR_2,
} from '../config.js';

export default class FieldRenderer {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.homeTeam = null;
    this.awayTeam = null;
    this._extras = [];
  }

  setTeams(homeTeam, awayTeam, homeGoingRight) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.homeGoingRight = homeGoingRight;
    this.draw();
  }

  draw() {
    const g = this.graphics;
    g.clear();
    this._extras.forEach(t => t.destroy());
    this._extras = [];

    const fl = FIELD_LEFT, ft = FIELD_TOP, fw = FIELD_WIDTH_PX, ez = END_ZONE_PX;
    const totalW = TOTAL_FIELD_PX;

    // ── Crowd/stadium strips above and below field ──
    // Top crowd
    for (let i = 0; i < ft; i += 4) {
      const c = i % 8 < 4 ? CROWD_COLOR_1 : CROWD_COLOR_2;
      g.fillStyle(c, 1);
      g.fillRect(0, i, 960, 4);
    }
    // Bottom crowd
    const botStart = ft + fw;
    for (let i = botStart; i < 540; i += 4) {
      const c = i % 8 < 4 ? CROWD_COLOR_1 : CROWD_COLOR_2;
      g.fillStyle(c, 1);
      g.fillRect(0, i, 960, 4);
    }

    // Crowd dots (simulated spectators)
    for (let i = 0; i < 300; i++) {
      const cx = Math.random() * 960;
      const cy = Math.random() < 0.5
        ? Math.random() * (ft - 6) + 2
        : botStart + 4 + Math.random() * (540 - botStart - 8);
      const colors = [0x884444, 0x448844, 0x444488, 0xaaaa44, 0xaa4488, 0x44aaaa, 0xcccccc, 0xff6644];
      g.fillStyle(colors[Math.floor(Math.random() * colors.length)], 0.4 + Math.random() * 0.3);
      g.fillCircle(cx, cy, 1.5 + Math.random() * 1);
    }

    // ── Sideline strips ──
    g.fillStyle(SIDELINE_COLOR, 1);
    g.fillRect(fl, ft - 3, totalW, 3);           // top sideline strip
    g.fillRect(fl, ft + fw, totalW, 3);           // bottom sideline strip

    // Sideline text
    const sideStyle = { fontFamily: 'monospace', fontSize: '6px', color: '#336633' };
    for (let y = 10; y <= 90; y += 10) {
      const x = fl + ez + y * YARD_PX;
      this._extras.push(this.scene.add.text(x, ft - 8, y <= 50 ? y : 100 - y, sideStyle).setOrigin(0.5, 1));
    }

    // ── Field surface with yard stripes ──
    for (let y = 0; y < 100; y++) {
      const color = y % 10 < 5 ? FIELD_GREEN : FIELD_DARK;
      g.fillStyle(color, 1);
      g.fillRect(fl + ez + y * YARD_PX, ft, YARD_PX, fw);
    }

    // Subtle mow pattern (diagonal lines on every other 5-yard zone)
    g.lineStyle(1, 0xffffff, 0.02);
    for (let y = 0; y < 100; y += 10) {
      for (let i = 0; i < fw; i += 6) {
        const x = fl + ez + y * YARD_PX;
        g.lineBetween(x, ft + i, x + 5 * YARD_PX, ft + i + 10);
      }
    }

    // ── End zones ──
    const leftTeam = this.homeGoingRight ? this.awayTeam : this.homeTeam;
    const rightTeam = this.homeGoingRight ? this.homeTeam : this.awayTeam;
    const leftColor = leftTeam ? leftTeam.colors.primary : END_ZONE_COLOR;
    const rightColor = rightTeam ? rightTeam.colors.primary : END_ZONE_COLOR;

    g.fillStyle(leftColor, 1);
    g.fillRect(fl, ft, ez, fw);
    g.fillStyle(rightColor, 1);
    g.fillRect(fl + ez + FIELD_LENGTH_PX, ft, ez, fw);

    // End zone diagonal stripes
    g.lineStyle(1, 0xffffff, 0.06);
    for (let i = -30; i < 50; i++) {
      g.lineBetween(fl + i * 6, ft, fl + i * 6 + fw * 0.3, ft + fw);
      g.lineBetween(fl + ez + FIELD_LENGTH_PX + i * 6, ft, fl + ez + FIELD_LENGTH_PX + i * 6 + fw * 0.3, ft + fw);
    }

    // End zone team names (large, bold)
    const ezStyle = {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
      fontStyle: 'bold', align: 'center', stroke: '#000000', strokeThickness: 3,
    };
    const leftName = leftTeam ? leftTeam.name.toUpperCase() : 'END ZONE';
    const rightName = rightTeam ? rightTeam.name.toUpperCase() : 'END ZONE';
    this._extras.push(
      this.scene.add.text(fl + ez / 2, ft + fw / 2 - 6, leftName, ezStyle).setOrigin(0.5)
    );
    this._extras.push(
      this.scene.add.text(fl + ez + FIELD_LENGTH_PX + ez / 2, ft + fw / 2 - 6, rightName, ezStyle).setOrigin(0.5)
    );
    // City name below team name
    const cityStyle = { ...ezStyle, fontSize: '7px', strokeThickness: 2 };
    if (leftTeam) {
      this._extras.push(
        this.scene.add.text(fl + ez / 2, ft + fw / 2 + 8, leftTeam.city.toUpperCase(), cityStyle).setOrigin(0.5)
      );
    }
    if (rightTeam) {
      this._extras.push(
        this.scene.add.text(fl + ez + FIELD_LENGTH_PX + ez / 2, ft + fw / 2 + 8, rightTeam.city.toUpperCase(), cityStyle).setOrigin(0.5)
      );
    }

    // ── Field border (thick white line) ──
    g.lineStyle(2, LINE_COLOR, 0.9);
    g.strokeRect(fl, ft, totalW, fw);

    // ── 5-yard lines ──
    g.lineStyle(1, LINE_COLOR, 0.5);
    for (let y = 5; y < 100; y += 5) {
      const x = fl + ez + y * YARD_PX;
      g.lineBetween(x, ft, x, ft + fw);
    }

    // ── Hash marks ──
    const hashInset = fw * 0.3;
    g.lineStyle(1, HASH_COLOR, 0.25);
    for (let y = 1; y < 100; y++) {
      if (y % 5 === 0) continue;
      const x = fl + ez + y * YARD_PX;
      g.lineBetween(x, ft + hashInset - 3, x, ft + hashInset + 3);
      g.lineBetween(x, ft + fw - hashInset - 3, x, ft + fw - hashInset + 3);
    }

    // ── Yard numbers (rendered inside the field) ──
    const ynStyle = { fontFamily: 'monospace', fontSize: '9px', color: YARD_NUM_COLOR, fontStyle: 'bold' };
    for (let y = 10; y <= 90; y += 10) {
      const label = y <= 50 ? y : 100 - y;
      const x = fl + ez + y * YARD_PX;
      this._extras.push(this.scene.add.text(x, ft + 10, label, ynStyle).setOrigin(0.5, 0).setAlpha(0.5));
      this._extras.push(this.scene.add.text(x, ft + fw - 18, label, ynStyle).setOrigin(0.5, 0).setAlpha(0.5));
    }

    // ── Goal lines (bright yellow) ──
    g.lineStyle(3, 0xffcc00, 0.8);
    g.lineBetween(fl + ez, ft, fl + ez, ft + fw);
    g.lineBetween(fl + ez + FIELD_LENGTH_PX, ft, fl + ez + FIELD_LENGTH_PX, ft + fw);

    g.setDepth(-1);
  }

  drawLOS(scrimmageX) {
    if (this._losLine) this._losLine.destroy();
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0x00aaff, 0.8);
    g.lineBetween(scrimmageX, FIELD_TOP, scrimmageX, FIELD_TOP + FIELD_WIDTH_PX);
    g.setDepth(0);
    this._losLine = g;
  }

  drawFirstDownLine(firstDownX) {
    if (this._fdLine) this._fdLine.destroy();
    const g = this.scene.add.graphics();
    g.lineStyle(2, 0xffff00, 0.7);
    g.lineBetween(firstDownX, FIELD_TOP, firstDownX, FIELD_TOP + FIELD_WIDTH_PX);
    g.setDepth(0);
    this._fdLine = g;
  }

  clearOverlays() {
    if (this._losLine) { this._losLine.destroy(); this._losLine = null; }
    if (this._fdLine) { this._fdLine.destroy(); this._fdLine = null; }
  }
}
