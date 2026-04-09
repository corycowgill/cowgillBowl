// ── Xbox / Generic Gamepad Support ──
// Maps standard gamepad layout (Xbox, PS, generic) to game actions.
// Uses the Gamepad API directly since Phaser's gamepad support needs
// manual polling anyway.
//
// Xbox mapping (standard layout):
//   Left stick: move           Buttons[12-15]: D-pad
//   A (0): action/snap/tackle  B (1): pass/switch
//   X (2): sprint              Y (3): unused
//   LB (4): cycle left         RB (5): cycle right
//   Start (9): pause/menu

const DEADZONE = 0.2;

export default class GamepadManager {
  constructor() {
    this._prevButtons = new Array(17).fill(false);
    this._currButtons = new Array(17).fill(false);
    this.axes = { x: 0, y: 0 };
    this.connected = false;

    // Listen for connect/disconnect
    window.addEventListener('gamepadconnected', (e) => {
      this.connected = true;
      console.log('Gamepad connected:', e.gamepad.id);
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.connected = false;
    });
  }

  // Call once per frame to snapshot button states
  poll() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const pad of gamepads) {
      if (pad && pad.connected) { gp = pad; break; }
    }
    if (!gp) {
      this.connected = false;
      this.axes.x = 0;
      this.axes.y = 0;
      return;
    }
    this.connected = true;

    // Copy previous → save for justPressed detection
    for (let i = 0; i < this._currButtons.length; i++) {
      this._prevButtons[i] = this._currButtons[i];
    }

    // Read buttons
    for (let i = 0; i < gp.buttons.length && i < this._currButtons.length; i++) {
      this._currButtons[i] = gp.buttons[i].pressed;
    }

    // Read left stick
    let lx = gp.axes[0] || 0;
    let ly = gp.axes[1] || 0;
    if (Math.abs(lx) < DEADZONE) lx = 0;
    if (Math.abs(ly) < DEADZONE) ly = 0;

    // Also read D-pad (buttons 12=up, 13=down, 14=left, 15=right)
    if (this._currButtons[14]) lx = -1;  // D-pad left
    if (this._currButtons[15]) lx = 1;   // D-pad right
    if (this._currButtons[12]) ly = -1;  // D-pad up
    if (this._currButtons[13]) ly = 1;   // D-pad down

    this.axes.x = lx;
    this.axes.y = ly;
  }

  // Button held down this frame
  isDown(btn) { return this._currButtons[btn] || false; }

  // Button pressed this frame (was up last frame)
  justPressed(btn) {
    return this._currButtons[btn] && !this._prevButtons[btn];
  }

  // ── Mapped game actions ──

  // Movement (left stick + D-pad)
  get moveX() { return this.axes.x; }
  get moveY() { return this.axes.y; }

  // A button = action (snap, throw, tackle dive, confirm)
  get actionDown() { return this.isDown(0); }
  get actionJustPressed() { return this.justPressed(0); }

  // B button = pass/switch defender/cancel
  get passJustPressed() { return this.justPressed(1); }

  // X button = sprint
  get sprintDown() { return this.isDown(2); }

  // Y button = alternate action (not used yet)
  get altJustPressed() { return this.justPressed(3); }

  // RB = cycle right (receivers, menus)
  get cycleRightJustPressed() { return this.justPressed(5); }

  // LB = cycle left
  get cycleLeftJustPressed() { return this.justPressed(4); }

  // Start = menu/pause
  get startJustPressed() { return this.justPressed(9); }

  // Any face button (for "press to continue" prompts)
  get anyFaceJustPressed() {
    return this.justPressed(0) || this.justPressed(1) || this.justPressed(2) || this.justPressed(3);
  }
}
