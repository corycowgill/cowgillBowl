// ── Cowgill Bowl Playbook Data ──
// Positions are relative offsets from the line of scrimmage (LOS).
// X is forward (positive = toward opponent end zone), Y is lateral (0 = center).
// For offense, positive X = downfield. For defense, negative X = toward offense.

// ── Formation Templates ──
// Each entry: [positionLabel, relX, relY]  (in yards)
export const OFFENSIVE_FORMATIONS = {
  IForm: [
    ['C',   0,   0],
    ['LG', 0,  -1.5],
    ['RG', 0,   1.5],
    ['LT', 0,  -3],
    ['RT', 0,   3],
    ['QB', -2,  0],
    ['HB', -4,  0],
    ['FB', -3,  0],
    ['WR1', 0, -12],
    ['WR2', 0,  12],
    ['TE',  0,  4.5],
  ],
  Shotgun: [
    ['C',   0,   0],
    ['LG', 0,  -1.5],
    ['RG', 0,   1.5],
    ['LT', 0,  -3],
    ['RT', 0,   3],
    ['QB', -4,  0],
    ['HB', -4, -2],
    ['WR1', 0, -15],
    ['WR2', 0,  15],
    ['WR3', 0, -8],
    ['TE',  0,  4.5],
  ],
  Spread: [
    ['C',   0,   0],
    ['LG', 0,  -1.5],
    ['RG', 0,   1.5],
    ['LT', 0,  -3],
    ['RT', 0,   3],
    ['QB', -4,  0],
    ['HB', -4, -2],
    ['WR1', 0, -18],
    ['WR2', 0,  18],
    ['WR3', 0, -10],
    ['WR4', 0,  10],
  ],
  SingleBack: [
    ['C',   0,   0],
    ['LG', 0,  -1.5],
    ['RG', 0,   1.5],
    ['LT', 0,  -3],
    ['RT', 0,   3],
    ['QB', -2,  0],
    ['HB', -4,  0],
    ['WR1', 0, -15],
    ['WR2', 0,  15],
    ['TE1', 0,  4.5],
    ['TE2', 0, -4.5],
  ],
  Goal: [
    ['C',   0,   0],
    ['LG', 0,  -1.5],
    ['RG', 0,   1.5],
    ['LT', 0,  -3],
    ['RT', 0,   3],
    ['QB', -2,  0],
    ['HB', -3, -1],
    ['FB', -3,  1],
    ['TE1', 0,  4.5],
    ['TE2', 0, -4.5],
    ['WR1', 0, -12],
  ],
};

export const DEFENSIVE_FORMATIONS = {
  '4-3': [
    ['DT1', 1,  -1],
    ['DT2', 1,   1],
    ['DE1', 1,  -3.5],
    ['DE2', 1,   3.5],
    ['LB1', 3,  -4],
    ['LB2', 3,   0],
    ['LB3', 3,   4],
    ['CB1', 3, -14],
    ['CB2', 3,  14],
    ['SS',  7,   3],
    ['FS',  10,  0],
  ],
  '3-4': [
    ['DT',  1,   0],
    ['DE1', 1,  -3],
    ['DE2', 1,   3],
    ['LB1', 3,  -6],
    ['LB2', 3,  -2],
    ['LB3', 3,   2],
    ['LB4', 3,   6],
    ['CB1', 3, -14],
    ['CB2', 3,  14],
    ['SS',  7,   3],
    ['FS',  10,  0],
  ],
  Nickel: [
    ['DT1', 1,  -1],
    ['DT2', 1,   1],
    ['DE1', 1,  -3.5],
    ['DE2', 1,   3.5],
    ['LB1', 3,  -2],
    ['LB2', 3,   2],
    ['CB1', 3, -14],
    ['CB2', 3,  14],
    ['NCB', 4,  -7],
    ['SS',  7,   4],
    ['FS',  10,  0],
  ],
  Dime: [
    ['DT1', 1,  -1],
    ['DT2', 1,   1],
    ['DE1', 1,  -3.5],
    ['DE2', 1,   3.5],
    ['LB',  3,   0],
    ['CB1', 3, -14],
    ['CB2', 3,  14],
    ['NCB1',4, -7],
    ['NCB2',4,  7],
    ['SS',  7,   3],
    ['FS',  10,  0],
  ],
};

// ── Route types ──
// Each route is an array of waypoints [dx, dy] in yards relative to start position.
// The receiver runs to each waypoint in order.
const ROUTES = {
  slant:       [[5, 0], [10, -5]],
  slantOut:    [[5, 0], [10, 5]],
  out:         [[8, 0], [8, 8]],
  in:          [[8, 0], [8, -8]],
  post:        [[12, 0], [25, -8]],
  corner:      [[12, 0], [25, 8]],
  go:          [[35, 0]],
  curl:        [[10, 0], [8, 0]],
  flat:        [[2, 5]],
  flatLeft:    [[2, -5]],
  screen:      [[-2, -3], [0, -6]],
  drag:        [[3, 0], [3, -15]],
  seam:        [[20, 0]],
  hitch:       [[6, 0], [5, 0]],
  wheel:       [[2, 4], [20, 6]],
  swing:       [[0, -5], [5, -8]],
  swingRight:  [[0, 5], [5, 8]],
};

// ── OFFENSIVE PLAYS ──
// type: 'run' | 'pass'
// formation: key into OFFENSIVE_FORMATIONS
// carrier: position label that carries the ball (run) or '' (pass)
// routes: { positionLabel: routeKey } for receivers
// runPath: [dx,dy] waypoints for the ball carrier on run plays
// blockDir: general blocking direction for linemen ('left'|'right'|'center')

export const BASE_OFFENSIVE_PLAYS = [
  {
    name: 'HB Dive',
    type: 'run',
    formation: 'IForm',
    carrier: 'HB',
    runPath: [[3, 0], [8, 0]],
    blockDir: 'center',
    routes: {},
  },
  {
    name: 'HB Sweep',
    type: 'run',
    formation: 'IForm',
    carrier: 'HB',
    runPath: [[0, -6], [5, -8], [15, -6]],
    blockDir: 'left',
    routes: {},
  },
  {
    name: 'Counter Run',
    type: 'run',
    formation: 'SingleBack',
    carrier: 'HB',
    runPath: [[1, 3], [4, 5], [10, 3]],
    blockDir: 'right',
    routes: {},
  },
  {
    name: 'QB Sneak',
    type: 'run',
    formation: 'IForm',
    carrier: 'QB',
    runPath: [[4, 0]],
    blockDir: 'center',
    routes: {},
  },
  {
    name: 'Short Pass',
    type: 'pass',
    formation: 'Shotgun',
    carrier: '',
    runPath: [],
    blockDir: 'center',
    routes: { WR1: 'slant', WR2: 'out', WR3: 'hitch', TE: 'flat' },
  },
  {
    name: 'Deep Pass',
    type: 'pass',
    formation: 'Shotgun',
    carrier: '',
    runPath: [],
    blockDir: 'center',
    routes: { WR1: 'go', WR2: 'post', WR3: 'curl', HB: 'flat' },
  },
  {
    name: 'Play Action',
    type: 'pass',
    formation: 'IForm',
    carrier: '',
    runPath: [],
    blockDir: 'center',
    fakeCarrier: 'HB',
    routes: { WR1: 'post', WR2: 'corner', TE: 'seam' },
  },
  {
    name: 'Screen Pass',
    type: 'pass',
    formation: 'Shotgun',
    carrier: '',
    runPath: [],
    blockDir: 'center',
    routes: { HB: 'screen', WR1: 'go', WR2: 'go', WR3: 'slant' },
  },
];

// ── DEFENSIVE PLAYS ──
export const BASE_DEFENSIVE_PLAYS = [
  {
    name: 'Cover 2',
    formation: '4-3',
    style: 'zone',
    blitz: false,
    zones: { CB1: 'flatLeft', CB2: 'flat', SS: 'deepHalf', FS: 'deepHalf', LB1: 'hookLeft', LB2: 'middle', LB3: 'hookRight' },
  },
  {
    name: 'Cover 3',
    formation: '4-3',
    style: 'zone',
    blitz: false,
    zones: { CB1: 'deepThird', CB2: 'deepThird', FS: 'deepThird', SS: 'flat', LB1: 'hookLeft', LB2: 'middle', LB3: 'hookRight' },
  },
  {
    name: 'Man Cover 1',
    formation: '4-3',
    style: 'man',
    blitz: false,
    zones: { FS: 'centerField' },
  },
  {
    name: 'Blitz',
    formation: '4-3',
    style: 'man',
    blitz: true,
    blitzers: ['LB1', 'LB2'],
    zones: { FS: 'centerField' },
  },
  {
    name: 'Nickel Zone',
    formation: 'Nickel',
    style: 'zone',
    blitz: false,
    zones: { CB1: 'deepThird', CB2: 'deepThird', NCB: 'slotZone', SS: 'flat', FS: 'deepThird', LB1: 'hookLeft', LB2: 'hookRight' },
  },
  {
    name: 'Prevent',
    formation: 'Dime',
    style: 'zone',
    blitz: false,
    zones: { CB1: 'deepQuarter', CB2: 'deepQuarter', NCB1: 'deepQuarter', NCB2: 'deepQuarter', SS: 'middle', FS: 'deepHalf', LB: 'middle' },
  },
];

// ── Signature Plays per Team ──
export const SIGNATURE_PLAYS = {
  CHI: [
    { name: 'Power Sweep', type: 'run', formation: 'IForm', carrier: 'HB', runPath: [[0, -4], [3, -8], [12, -6], [20, -3]], blockDir: 'left', routes: {} },
    { name: 'Lakefront Blitz', defense: true, formation: '3-4', style: 'man', blitz: true, blitzers: ['LB1', 'LB2', 'LB3'], zones: { FS: 'centerField' } },
  ],
  NYK: [
    { name: 'Empire Slant', type: 'pass', formation: 'Shotgun', carrier: '', runPath: [], blockDir: 'center', routes: { WR1: 'slant', WR2: 'slant', WR3: 'drag', HB: 'flat' } },
    { name: 'Midnight Cover', defense: true, formation: 'Nickel', style: 'zone', blitz: false, zones: { CB1: 'deepThird', CB2: 'deepThird', NCB: 'slotZone', SS: 'flat', FS: 'deepThird', LB1: 'middle', LB2: 'hookRight' } },
  ],
  LAX: [
    { name: 'Sunset Bomb', type: 'pass', formation: 'Spread', carrier: '', runPath: [], blockDir: 'center', routes: { WR1: 'go', WR2: 'go', WR3: 'post', WR4: 'corner' } },
    { name: 'Hollywood Reverse', type: 'run', formation: 'Shotgun', carrier: 'WR3', runPath: [[-2, -3], [0, -10], [15, -8]], blockDir: 'left', routes: {} },
  ],
  DAL: [
    { name: 'Longhorn Counter', type: 'run', formation: 'IForm', carrier: 'HB', runPath: [[1, 4], [5, 6], [12, 4]], blockDir: 'right', routes: {} },
    { name: 'Outlaw Pressure', defense: true, formation: '3-4', style: 'man', blitz: true, blitzers: ['LB2', 'LB3'], zones: { FS: 'centerField', SS: 'flat' } },
  ],
  MIA: [
    { name: 'Coastal Jet', type: 'run', formation: 'Spread', carrier: 'HB', runPath: [[0, -8], [8, -12], [18, -8]], blockDir: 'left', routes: {} },
    { name: 'Heat Wave Zone', defense: true, formation: 'Nickel', style: 'zone', blitz: false, zones: { CB1: 'deepHalf', CB2: 'deepHalf', NCB: 'flat', SS: 'slotZone', FS: 'deepThird', LB1: 'hookLeft', LB2: 'hookRight' } },
  ],
  SEA: [
    { name: 'Needle Storm', type: 'pass', formation: 'Shotgun', carrier: '', runPath: [], blockDir: 'center', routes: { WR1: 'in', WR2: 'curl', WR3: 'drag', HB: 'swing' } },
    { name: 'Sound Blitz', defense: true, formation: '4-3', style: 'man', blitz: true, blitzers: ['LB1', 'LB3'], zones: { FS: 'centerField', SS: 'deepHalf' } },
  ],
  BOS: [
    { name: 'Harbor Mesh', type: 'pass', formation: 'Shotgun', carrier: '', runPath: [], blockDir: 'center', routes: { WR1: 'drag', WR3: 'drag', WR2: 'hitch', HB: 'flat' } },
    { name: 'Guardian Front', defense: true, formation: '3-4', style: 'zone', blitz: false, zones: { LB1: 'hookLeft', LB2: 'middle', LB3: 'hookRight', LB4: 'flat', CB1: 'deepThird', CB2: 'deepThird', FS: 'deepThird' } },
  ],
  ATL: [
    { name: 'Blaze Go', type: 'pass', formation: 'Spread', carrier: '', runPath: [], blockDir: 'center', routes: { WR1: 'go', WR2: 'corner', WR3: 'post', WR4: 'go' } },
    { name: 'Peach State Pursuit', defense: true, formation: '4-3', style: 'man', blitz: true, blitzers: ['LB1'], zones: { FS: 'centerField', SS: 'deepHalf' } },
  ],
  DEN: [
    { name: 'Summit Shot', type: 'pass', formation: 'Shotgun', carrier: '', runPath: [], blockDir: 'center', routes: { WR1: 'go', WR2: 'post', WR3: 'seam', HB: 'swingRight' } },
    { name: 'Mile High Crush', defense: true, formation: '4-3', style: 'man', blitz: true, blitzers: ['LB2', 'LB3'], zones: { FS: 'centerField' } },
  ],
  SFO: [
    { name: 'Bay Option', type: 'run', formation: 'Shotgun', carrier: 'HB', runPath: [[2, -3], [6, -5], [12, -3]], blockDir: 'left', routes: { WR1: 'slant' } },
    { name: 'Golden Shell', defense: true, formation: 'Nickel', style: 'zone', blitz: false, zones: { CB1: 'deepThird', CB2: 'deepThird', NCB: 'flat', FS: 'deepThird', SS: 'hookRight', LB1: 'middle', LB2: 'hookLeft' } },
  ],
  DET: [
    { name: 'Iron Dive', type: 'run', formation: 'Goal', carrier: 'HB', runPath: [[4, 0], [8, 0]], blockDir: 'center', routes: {} },
    { name: 'Motor Rush', defense: true, formation: '3-4', style: 'man', blitz: true, blitzers: ['LB1', 'LB4'], zones: { FS: 'centerField', SS: 'deepHalf' } },
  ],
  HOU: [
    { name: 'Comet Rollout', type: 'pass', formation: 'Shotgun', carrier: '', runPath: [], blockDir: 'right', qbRollout: [2, 5], routes: { WR1: 'corner', WR2: 'go', WR3: 'out', HB: 'flat' } },
    { name: 'Orbit Shot', defense: true, formation: '4-3', style: 'zone', blitz: true, blitzers: ['LB1'], zones: { CB1: 'deepHalf', CB2: 'deepHalf', FS: 'deepThird', SS: 'flat', LB2: 'middle', LB3: 'hookRight' } },
  ],
};

// ── Lookup helper ──
export function getRouteWaypoints(routeName) {
  return ROUTES[routeName] || [[8, 0]];
}

// Build a full playbook for a team (8 offense + 6 defense + 2 signature)
export function buildPlaybook(teamAbbr) {
  const sig = SIGNATURE_PLAYS[teamAbbr] || [];
  const sigOff = sig.filter(p => !p.defense);
  const sigDef = sig.filter(p => p.defense);

  const offense = [...BASE_OFFENSIVE_PLAYS, ...sigOff];
  const defense = [...BASE_DEFENSIVE_PLAYS, ...sigDef];

  return { offense, defense };
}
