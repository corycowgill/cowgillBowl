// ── Field Dimensions ──
export const YARD_PX = 12;
export const FIELD_YARDS = 100;
export const END_ZONE_YARDS = 10;
export const FIELD_WIDTH_YARDS = 53.33;

export const FIELD_LENGTH_PX = FIELD_YARDS * YARD_PX;           // 1200
export const END_ZONE_PX = END_ZONE_YARDS * YARD_PX;            // 120
export const TOTAL_FIELD_PX = FIELD_LENGTH_PX + END_ZONE_PX * 2; // 1440
export const FIELD_WIDTH_PX = Math.round(FIELD_WIDTH_YARDS * YARD_PX); // 640

export const FIELD_LEFT = 80;   // left padding
export const FIELD_TOP = 55;    // top padding
export const WORLD_W = TOTAL_FIELD_PX + FIELD_LEFT * 2;  // 1600
export const WORLD_H = FIELD_WIDTH_PX + FIELD_TOP * 2;   // 750

// ── Player ──
export const PLAYER_RADIUS = 10;
export const PLAYER_LABEL_SIZE = 9;

// ── Speed (pixels/sec) ──
export const BASE_SPEED = 120;
export const SPEED_RANGE = 200;   // attr 0→100 maps to BASE..BASE+RANGE
export const SPRINT_MULT = 1.30;

// ── Match ──
export const QUARTER_SECONDS = 300;   // 5 min
export const PLAY_CLOCK = 25;
export const QUARTERS = 4;
export const DOWNS_FOR_FIRST = 4;
export const YARDS_FOR_FIRST = 10;

// ── Scoring ──
export const SCORE_TD = 6;
export const SCORE_PAT = 1;
export const SCORE_FG = 3;
export const SCORE_SAFETY = 2;
export const SCORE_TWO_PT = 2;

// ── Gameplay tuning ──
export const PASS_SPEED = 450;          // px/sec
export const PASS_WOBBLE = 0.04;        // radians of random deviation
export const CATCH_RADIUS = 28;         // px – receiver must be within this of ball
export const TACKLE_RADIUS = 16;        // px – overlap to trigger tackle check
export const FUMBLE_BASE_CHANCE = 0.03; // base chance on big hits
export const INT_BASE_CHANCE = 0.08;    // base interception chance when contested

// ── AI ──
export const AI_REACTION_MS = 250;
export const AI_PURSUIT_WEIGHT = 0.7;

// ── Camera ──
export const CAM_LERP = 0.08;
export const CAM_ZOOM_DESKTOP = 1.4;
export const CAM_ZOOM_MOBILE = 1.7;

// ── Clock speed during play (seconds of game time per real second) ──
export const CLOCK_SPEED_LIVE = 3;      // clock runs 3× during live play
export const CLOCK_SPEED_DEAD = 6;      // clock runs 6× between plays

// ── Colors ──
export const FIELD_GREEN = 0x2d8c3c;
export const FIELD_DARK = 0x267332;
export const END_ZONE_COLOR = 0x1a5c28;
export const LINE_COLOR = 0xffffff;
export const YARD_NUM_COLOR = '#ffffff';
export const HASH_COLOR = 0xcccccc;

// ── UI ──
export const HUD_BG = 0x111111;
export const HUD_HEIGHT = 48;

// Helper: convert yard line (0=own end zone, 100=opp end zone) to px X
export function yardToPx(yardLine, offenseGoingRight = true) {
  if (offenseGoingRight) {
    return FIELD_LEFT + END_ZONE_PX + yardLine * YARD_PX;
  }
  return FIELD_LEFT + END_ZONE_PX + (FIELD_YARDS - yardLine) * YARD_PX;
}

// Helper: px X to yard line
export function pxToYard(px, offenseGoingRight = true) {
  const raw = (px - FIELD_LEFT - END_ZONE_PX) / YARD_PX;
  return offenseGoingRight ? raw : FIELD_YARDS - raw;
}

// Helper: center of field width in px
export function fieldCenterY() {
  return FIELD_TOP + FIELD_WIDTH_PX / 2;
}

// Helper: player speed in px/sec from attribute (0-99)
export function attrToSpeed(speedAttr) {
  return BASE_SPEED + (speedAttr / 99) * SPEED_RANGE;
}

// Detect mobile
export function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
}
