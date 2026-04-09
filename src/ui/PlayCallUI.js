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
    this.headerText = null;
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

    // Backdrop
    const backdrop = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    this.container.add(backdrop);

    // Title
    const title = isDefense ? 'DEFENSIVE CALL' : 'OFFENSIVE PLAY';
    this.titleText = this.scene.add.text(w / 2, 60, title, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
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
      const nameText = this.scene.add.text(x, y - 8, play.name, {
        fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const typeLabel = play.type || play.style || '';
      const typeText = this.scene.add.text(x, y + 10, typeLabel.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '9px', color: '#aaaaaa',
      }).setOrigin(0.5);

      // Click/tap support
      bg.setInteractive();
      bg.on('pointerdown', () => {
        this.selectedIndex = i;
        this.confirmSelection();
      });

      this.container.add([bg, nameText, typeText]);
      this.playButtons.push({ bg, nameText, typeText });
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
        btn.bg.setStrokeStyle(2, 0x00ff00);
        btn.bg.setFillStyle(0x445544);
      } else {
        btn.bg.setStrokeStyle(2, 0x666666);
        btn.bg.setFillStyle(0x333333);
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

  get isVisible() {
    return this.container.visible;
  }
}
