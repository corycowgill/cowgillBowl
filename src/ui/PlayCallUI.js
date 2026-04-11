import { getRouteWaypoints } from '../data/plays.js';

export default class PlayCallUI {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(150);
    this.container.setVisible(false);
    this.plays = [];
    this.selectedIndex = 0;
    this.playButtons = [];
    this.onSelect = null;
    this.isDefense = false;
    this.titleText = null;
    this.teamColor = 0x333333;
    this.headerText = null;
  }

  setTeamColor(color) {
    this.teamColor = color || 0x333333;
  }

  show(plays, isDefense, onSelect) {
    this.plays = plays;
    this.isDefense = isDefense;
    this.onSelect = onSelect;
    this.selectedIndex = 0;
    this.container.removeAll(true);
    this.playButtons = [];

    const cam = this.scene.cameras.main;
    const w = cam.width;
    const h = cam.height;

    // Backdrop with team color tint
    const backdrop = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75);
    this.container.add(backdrop);
    // Team color accent bar at top
    const accentBar = this.scene.add.rectangle(w / 2, 52, w - 40, 4, this.teamColor, 0.6);
    this.container.add(accentBar);

    // Title
    const title = isDefense ? 'DEFENSIVE CALL' : 'OFFENSIVE PLAY';
    this.titleText = this.scene.add.text(w / 2, 62, title, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
    this.container.add(this.titleText);

    // Instructions
    this.headerText = this.scene.add.text(w / 2, 85, 'Arrow Keys + SPACE to select  |  Tap to select', {
      fontFamily: 'monospace', fontSize: '10px', color: '#888888',
    }).setOrigin(0.5);
    this.container.add(this.headerText);

    // Play buttons in a grid
    const cols = isDefense ? 3 : 4;
    const rows = Math.ceil(plays.length / cols);
    const btnW = 160;
    const btnH = 55;
    const gapX = 12;
    const gapY = 10;
    const startX = w / 2 - ((cols * (btnW + gapX)) - gapX) / 2;
    const startY = 110;

    plays.forEach((play, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gapX) + btnW / 2;
      const y = startY + row * (btnH + gapY) + btnH / 2;

      const bg = this.scene.add.rectangle(x, y, btnW, btnH, 0x333333, 1)
        .setStrokeStyle(2, 0x666666);

      // Mini route diagram for offensive plays
      const routeGfx = this.scene.add.graphics();
      if (!isDefense && play.type) {
        this._drawMiniPlay(routeGfx, x, y, play, btnW, btnH);
      }

      const nameText = this.scene.add.text(x, y - 12, play.name, {
        fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);
      const typeLabel = play.type || play.style || '';
      const typeText = this.scene.add.text(x, y + 16, typeLabel.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '8px', color: '#aaaaaa',
      }).setOrigin(0.5);

      // Click/tap support
      bg.setInteractive();
      bg.on('pointerdown', () => {
        this.selectedIndex = i;
        this.confirmSelection();
      });

      this.container.add([bg, routeGfx, nameText, typeText]);
      this.playButtons.push({ bg, nameText, typeText, routeGfx });
    });

    this.updateSelection();
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
    this.container.removeAll(true);
    this.playButtons = [];
  }

  updateSelection() {
    this.playButtons.forEach((btn, i) => {
      if (i === this.selectedIndex) {
        btn.bg.setStrokeStyle(2, this.teamColor || 0x00ff00);
        btn.bg.setFillStyle(0x3a3a3a);
        btn.bg.setAlpha(1);
      } else {
        btn.bg.setStrokeStyle(1, 0x555555);
        btn.bg.setFillStyle(0x222222);
        btn.bg.setAlpha(0.85);
      }
    });
  }

  moveSelection(dx, dy) {
    const cols = this.isDefense ? 3 : 4;
    const rows = Math.ceil(this.plays.length / cols);
    let col = this.selectedIndex % cols;
    let row = Math.floor(this.selectedIndex / cols);

    col = Math.max(0, Math.min(cols - 1, col + dx));
    row = Math.max(0, Math.min(rows - 1, row + dy));

    const newIdx = row * cols + col;
    if (newIdx < this.plays.length) {
      this.selectedIndex = newIdx;
      this.updateSelection();
    }
  }

  confirmSelection() {
    if (this.onSelect && this.selectedIndex < this.plays.length) {
      const play = this.plays[this.selectedIndex];
      this.hide();
      this.onSelect(play);
    }
  }

  // Draw a tiny route diagram inside the play button
  _drawMiniPlay(gfx, cx, cy, play, bw, bh) {
    const s = 1.2; // scale
    const losX = cx - bw * 0.15;
    // LOS line
    gfx.lineStyle(1, 0x666666, 0.5);
    gfx.lineBetween(losX, cy - bh * 0.35, losX, cy + bh * 0.35);

    // OL dots
    for (let i = -2; i <= 2; i++) {
      gfx.fillStyle(0x888888, 0.5);
      gfx.fillCircle(losX, cy + i * 5, 1.5);
    }

    if (play.type === 'run' && play.runPath && play.runPath.length > 0) {
      // Draw run path as an arrow
      gfx.lineStyle(1.5, 0x00cc00, 0.7);
      let px = losX - 6, py = cy;
      gfx.beginPath();
      gfx.moveTo(px, py);
      play.runPath.forEach(([dx, dy]) => {
        px = px + dx * s;
        py = py + dy * s;
        gfx.lineTo(px, py);
      });
      gfx.strokePath();
      gfx.fillStyle(0x00cc00, 0.8);
      gfx.fillCircle(px, py, 2);
    }

    if (play.type === 'pass' && play.routes) {
      const routeColors = [0x00aaff, 0xff8800, 0x00ff88, 0xff44ff];
      let ri = 0;
      for (const [role, routeKey] of Object.entries(play.routes)) {
        const wps = getRouteWaypoints(routeKey);
        const col = routeColors[ri % routeColors.length];
        ri++;
        // Start position depends on role
        let sx = losX, sy = cy;
        if (role.includes('WR') || role.includes('TE')) {
          sy = cy + (ri % 2 === 0 ? -14 : 14);
        } else {
          sy = cy + (ri % 2 === 0 ? -5 : 5);
          sx = losX - 8;
        }
        gfx.lineStyle(1, col, 0.6);
        gfx.beginPath();
        gfx.moveTo(sx, sy);
        let ex = sx, ey = sy;
        wps.forEach(([dx, dy]) => {
          ex = ex + dx * s;
          ey = ey + dy * s;
          gfx.lineTo(ex, ey);
        });
        gfx.strokePath();
        gfx.fillStyle(col, 0.8);
        gfx.fillCircle(ex, ey, 1.5);
      }
    }
  }

  get isVisible() {
    return this.container.visible;
  }
}
