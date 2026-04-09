// ── Field Dimensions ──
// Sized so the entire field (sideline to sideline, end zone to end zone)
// fits exactly inside the 960×540 viewport with the HUD at top.
export const YARD_PX = 8;
export const FIELD_YARDS = 100;
export const END_ZONE_YARDS = 10;
export const FIELD_WIDTH_YARDS = 53.33;

export const FIELD_LENGTH_PX = FIELD_YARDS * YARD_PX;           // 800
export const END_ZONE_PX = END_ZONE_YARDS * YARD_PX;            // 80
export const TOTAL_FIELD_PX = FIELD_LENGTH_PX + END_ZONE_PX * 2; // 960 — matches viewport width
export const FIELD_WIDTH_PX = Math.round(FIELD_WIDTH_YARDS * YARD_PX); // 427

export const FIELD_LEFT = 0;    // no horizontal padding — field fills viewport
export const FIELD_TOP = 58;    // below 48px HUD with a little breathing room
export const WORLD_W = TOTAL_FIELD_PX;                       // 960
export const WORLD_H = FIELD_TOP + FIELD_WIDTH_PX + 55;      // 540

// ── Player ──
export const PLAYER_RADIUS = 9;
export const PLAYER_LABEL_SIZE = 9;

// ── Speed (pixels/sec) ──
// Scaled down from the previous 12 px/yard field (~0.67×)
export const BASE_SPEED = 80;
export const SPEED_RANGE = 135;
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
export const PASS_SPEED = 320;          // px/sec (scaled for smaller field)
export const PASS_WOBBLE = 0.04;
export const CATCH_RADIUS = 24;
export const TACKLE_RADIUS = 14;
export const FUMBLE_BASE_CHANCE = 0.03;
export const INT_BASE_CHANCE = 0.08;

// ── AI ──
export const AI_REACTION_MS = 250;
export const AI_PURSUIT_WEIGHT = 0.7;

// ── Camera ──
// With the field sized to fit the viewport, zoom is 1.0 and the camera
// is static (no follow). Full field always visible.
export const CAM_LERP = 0.08;
export const CAM_ZOOM_DESKTOP = 1.0;
export const CAM_ZOOM_MOBILE = 1.0;

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
  if (/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|webOS|BlackBerry/i.test(navigator.userAgent)) return true;
  if ('ontouchstart' in window) return true;
  if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
  // iPad with desktop UA
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 0) return true;
  return false;
}
