import {
  FIELD_LEFT, FIELD_TOP, FIELD_LENGTH_PX, FIELD_WIDTH_PX, END_ZONE_PX,
  TOTAL_FIELD_PX, YARD_PX, FIELD_GREEN, FIELD_DARK, END_ZONE_COLOR,
  LINE_COLOR, HASH_COLOR, YARD_NUM_COLOR,
} from '../config.js';

export default class FieldRenderer {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  draw() {
    const g = this.graphics;
    g.clear();
    const fl = FIELD_LEFT, ft = FIELD_TOP, fw = FIELD_WIDTH_PX, ez = END_ZONE_PX;

    // Yard stripes
    for (let y = 0; y < 100; y++) {
      const color = y % 10 < 5 ? FIELD_GREEN : FIELD_DARK;
      g.fillStyle(color, 1);
      g.fillRect(fl + ez + y * YARD_PX, ft, YARD_PX, fw);
    }

    // End zones
    g.fillStyle(END_ZONE_COLOR, 1);
    g.fillRect(fl, ft, ez, fw);
    g.fillRect(fl + ez + FIELD_LENGTH_PX, ft, ez, fw);

    // Border
    g.lineStyle(2, LINE_COLOR, 1);
    g.strokeRect(fl, ft, TOTAL_FIELD_PX, fw);

    // 5-yard lines
    g.lineStyle(1, LINE_COLOR, 0.6);
    for (let y = 5; y < 100; y += 5) {
      const x = fl + ez + y * YARD_PX;
      g.lineBetween(x, ft, x, ft + fw);
    }

    // Hash marks
    const hashInset = fw * 0.3;
    g.lineStyle(1, HASH_COLOR, 0.3);
    for (let y = 1; y < 100; y++) {
      if (y % 5 === 0) continue;
      const x = fl + ez + y * YARD_PX;
      g.lineBetween(x, ft + hashInset - 4, x, ft + hashInset + 4);
      g.lineBetween(x, ft + fw - hashInset - 4, x, ft + fw - hashInset + 4);
    }

    // Yard numbers
    const style = { fontFamily: 'monospace', fontSize: '10px', color: YARD_NUM_COLOR };
    for (let y = 10; y <= 90; y += 10) {
      const label = y <= 50 ? y : 100 - y;
      const x = fl + ez + y * YARD_PX;
      this.scene.add.text(x, ft + 8, label, style).setOrigin(0.5, 0);
      this.scene.add.text(x, ft + fw - 16, label, style).setOrigin(0.5, 0);
    }

    // End zone text
    const ezStyle = { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold', align: 'center' };
    this.scene.add.text(fl + ez / 2, ft + fw / 2, 'END\nZONE', ezStyle).setOrigin(0.5);
    this.scene.add.text(fl + ez + FIELD_LENGTH_PX + ez / 2, ft + fw / 2, 'END\nZONE', ezStyle).setOrigin(0.5);

    // Goal lines
    g.lineStyle(3, 0xffff00, 0.7);
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
