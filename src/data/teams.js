// ── Cowgill Bowl – Team & Roster Data ──
// Each team: abbr, city, name, colors, roster of 16 players
// Attributes 1-99 scale

function p(num, name, pos, attrs) {
  return { num, name, pos, ...attrs };
}

// Default attribute template
function qb(num, name, o) {
  return p(num, name, 'QB', { spd: 65, acc: 65, agi: 60, str: 55, thPow: 80, thAcc: 80, cat: 30, car: 50, tkl: 20, cov: 15, prs: 15, sta: 80, ...o });
}
function hb(num, name, o) {
  return p(num, name, 'HB', { spd: 82, acc: 85, agi: 80, str: 60, thPow: 15, thAcc: 15, cat: 55, car: 80, tkl: 25, cov: 15, prs: 15, sta: 78, ...o });
}
function fb(num, name, o) {
  return p(num, name, 'FB', { spd: 60, acc: 62, agi: 50, str: 78, thPow: 10, thAcc: 10, cat: 45, car: 65, tkl: 55, cov: 10, prs: 30, sta: 82, ...o });
}
function wr(num, name, o) {
  return p(num, name, 'WR', { spd: 88, acc: 87, agi: 82, str: 45, thPow: 10, thAcc: 10, cat: 82, car: 55, tkl: 20, cov: 15, prs: 10, sta: 75, ...o });
}
function te(num, name, o) {
  return p(num, name, 'TE', { spd: 68, acc: 70, agi: 55, str: 72, thPow: 10, thAcc: 10, cat: 70, car: 55, tkl: 40, cov: 15, prs: 25, sta: 78, ...o });
}
function ol(num, name, o) {
  return p(num, name, 'OL', { spd: 40, acc: 42, agi: 35, str: 88, thPow: 5, thAcc: 5, cat: 10, car: 20, tkl: 55, cov: 5, prs: 30, sta: 85, ...o });
}
function dl(num, name, o) {
  return p(num, name, 'DL', { spd: 55, acc: 60, agi: 50, str: 85, thPow: 5, thAcc: 5, cat: 15, car: 15, tkl: 80, cov: 15, prs: 82, sta: 82, ...o });
}
function lb(num, name, o) {
  return p(num, name, 'LB', { spd: 70, acc: 72, agi: 65, str: 75, thPow: 5, thAcc: 5, cat: 30, car: 15, tkl: 82, cov: 50, prs: 60, sta: 80, ...o });
}
function cb(num, name, o) {
  return p(num, name, 'CB', { spd: 88, acc: 87, agi: 82, str: 42, thPow: 5, thAcc: 5, cat: 60, car: 20, tkl: 50, cov: 82, prs: 15, sta: 76, ...o });
}
function sf(num, name, o) {
  return p(num, name, 'S', { spd: 82, acc: 80, agi: 72, str: 55, thPow: 5, thAcc: 5, cat: 55, car: 20, tkl: 70, cov: 75, prs: 30, sta: 78, ...o });
}
function k(num, name, o) {
  return p(num, name, 'K', { spd: 45, acc: 45, agi: 40, str: 50, thPow: 90, thAcc: 88, cat: 15, car: 15, tkl: 15, cov: 5, prs: 5, sta: 70, ...o });
}

export const TEAMS = [
  {
    abbr: 'CHI', city: 'Chicago', name: 'Crushers',
    colors: { primary: 0xCC3300, secondary: 0x222222, accent: 0xFFAA00 },
    identity: 'Power running, punishing defense',
    roster: [
      qb(7, 'Dak Morrow', { thPow: 78, thAcc: 75, spd: 60 }),
      hb(22, 'Malik Thunder', { spd: 78, str: 80, car: 88, star: true }),
      fb(34, 'Bo Kensington', {}),
      wr(81, 'Ty Spears', { spd: 83, cat: 78 }),
      wr(85, 'Devon Lake', { spd: 80, cat: 76 }),
      te(88, 'Gus Hendricks', { str: 78, cat: 72 }),
      ol(72, 'Marcus Wall', { str: 92 }), ol(65, 'Ray Tanaka', { str: 90 }),
      ol(55, 'Ivan Cross', { str: 88 }), ol(74, 'Andre Block', { str: 89 }),
      ol(78, 'Darnell Ford', { str: 91 }),
      dl(91, 'Koa Manu', { prs: 86, tkl: 84 }),
      lb(52, 'Jax Harmon', { tkl: 90, spd: 74, star: true }),
      lb(56, 'Carlos Vega', { tkl: 85 }),
      cb(24, 'Terrell Quick', { cov: 78 }),
      sf(29, 'Andre Miles', { tkl: 75, cov: 72 }),
      k(3, 'Pete Novak', {}),
    ],
  },
  {
    abbr: 'NYK', city: 'New York', name: 'Knights',
    colors: { primary: 0x003399, secondary: 0xCCCCCC, accent: 0xFFFFFF },
    identity: 'Balanced offense, strong situational passing',
    roster: [
      qb(12, 'Eli Stratton', { thAcc: 90, thPow: 82, star: true }),
      hb(28, 'Dante Hill', { spd: 80, agi: 78 }),
      fb(45, 'Mike Trenton', {}),
      wr(80, 'Jay Cunningham', { cat: 90, spd: 82, star: true }),
      wr(13, 'Ricky Flores', { spd: 85, cat: 80 }),
      te(84, 'Sam Brighton', { cat: 75, str: 70 }),
      ol(71, 'Owen Steele', { str: 87 }), ol(64, 'Pat Romano', { str: 86 }),
      ol(57, 'Derek Marsh', { str: 85 }), ol(75, 'Lee Chung', { str: 86 }),
      ol(79, 'Bill Graves', { str: 88 }),
      dl(93, 'Kwame Burton', { prs: 80 }),
      lb(54, 'Nick Torres', { tkl: 78, cov: 55 }),
      lb(51, 'Paul Andersen', { tkl: 76 }),
      cb(21, 'Chris Lockwood', { cov: 85, spd: 90, star: true }),
      sf(31, 'Jamal Price', { cov: 78, tkl: 72 }),
      k(1, 'Aidan Cole', {}),
    ],
  },
  {
    abbr: 'LAX', city: 'Los Angeles', name: 'Stars',
    colors: { primary: 0xFFCC00, secondary: 0x660099, accent: 0xFFFFFF },
    identity: 'Speed, vertical passing, flashy playmakers',
    roster: [
      qb(9, 'Blaze Ryker', { thPow: 88, spd: 72, agi: 70, star: true }),
      hb(23, 'Zion Wells', { spd: 92, agi: 88, car: 72 }),
      fb(44, 'Tom Briggs', {}),
      wr(1, 'Jet Morrison', { spd: 96, agi: 90, cat: 85, star: true }),
      wr(11, 'Darius Lane', { spd: 92, cat: 82 }),
      te(89, 'Ryan Kellner', { spd: 72, cat: 68 }),
      ol(76, 'Chad Gruber', { str: 84 }), ol(63, 'Nate Rivas', { str: 82 }),
      ol(53, 'Jake Mooney', { str: 80 }), ol(77, 'Victor Lam', { str: 83 }),
      ol(73, 'Earl Dixon', { str: 82 }),
      dl(95, 'Trent Okafor', { prs: 76, tkl: 72 }),
      lb(50, 'Brett Lawson', { tkl: 74, spd: 72 }),
      lb(58, 'Marco Silva', { tkl: 70 }),
      cb(26, 'Leon Drake', { cov: 76, spd: 89 }),
      sf(33, 'Calvin Frost', { cov: 70, tkl: 65 }),
      k(5, 'Sergio Vidal', {}),
    ],
  },
  {
    abbr: 'DAL', city: 'Dallas', name: 'Outlaws',
    colors: { primary: 0x884400, secondary: 0xDDCCAA, accent: 0xCC0000 },
    identity: 'Efficient offense and strong line play',
    roster: [
      qb(14, 'Cole Brennan', { thAcc: 84, thPow: 80 }),
      hb(30, 'Travis Kane', { spd: 80, str: 72, car: 82 }),
      fb(40, 'Jesse Bullock', { str: 82 }),
      wr(82, 'Anton Ford', { cat: 80, spd: 84 }),
      wr(17, 'Cody West', { cat: 78, spd: 80 }),
      te(87, 'Luke Dawson', { str: 76, cat: 74, star: true }),
      ol(70, 'Hank Mueller', { str: 94, star: true }), ol(66, 'Rick Santos', { str: 92 }),
      ol(54, 'Pete Davis', { str: 90 }), ol(76, 'Al Henderson', { str: 91 }),
      ol(79, 'Wayne Chen', { str: 90 }),
      dl(92, 'Dexter Nash', { prs: 82, str: 86 }),
      lb(55, 'Grant Harlow', { tkl: 80, cov: 52 }),
      lb(49, 'Wade Simmons', { tkl: 78 }),
      cb(20, 'Ray Combs', { cov: 74, spd: 82 }),
      sf(27, 'Sean Pruitt', { cov: 70, tkl: 68 }),
      k(4, 'Tyler Knox', {}),
    ],
  },
  {
    abbr: 'MIA', city: 'Miami', name: 'Cyclones',
    colors: { primary: 0x00BBCC, secondary: 0xFF6600, accent: 0xFFFFFF },
    identity: 'Speed and spread offense',
    roster: [
      qb(2, 'Rico Vega', { spd: 78, agi: 75, thAcc: 78 }),
      hb(25, 'Flash Delaney', { spd: 94, agi: 90, car: 70, star: true }),
      fb(46, 'Chuck Nolan', {}),
      wr(10, 'Tre Malone', { spd: 93, cat: 80, agi: 86 }),
      wr(15, 'Kai Ortega', { spd: 90, cat: 78 }),
      te(86, 'Phil Corbin', { spd: 70, cat: 66 }),
      ol(69, 'Dan Moody', { str: 82 }), ol(62, 'Luis Parra', { str: 80 }),
      ol(56, 'Nick Hale', { str: 78 }), ol(74, 'Tim Grant', { str: 80 }),
      ol(77, 'Russ Taft', { str: 79 }),
      dl(97, 'Jerome Battle', { prs: 78 }),
      lb(53, 'Kyle Vickers', { tkl: 74, spd: 76 }),
      lb(48, 'Leo Marsh', { tkl: 72 }),
      cb(22, 'Deon Pace', { cov: 80, spd: 91, star: true }),
      sf(36, 'Reggie Thorn', { cov: 74, tkl: 66 }),
      k(8, 'Marco Reyes', {}),
    ],
  },
  {
    abbr: 'SEA', city: 'Seattle', name: 'Stormhawks',
    colors: { primary: 0x225533, secondary: 0x99AAAA, accent: 0xAADDCC },
    identity: 'Defense-first, field-position football',
    roster: [
      qb(16, 'Aaron Locke', { thAcc: 76, thPow: 76, spd: 62 }),
      hb(32, 'Shane Porter', { spd: 78, car: 78, str: 68 }),
      fb(38, 'Brock Haney', { str: 80 }),
      wr(83, 'Doug Raines', { cat: 76, spd: 82 }),
      wr(19, 'Corey Wynn', { cat: 74, spd: 80 }),
      te(85, 'AJ Kemp', { str: 74, cat: 72 }),
      ol(73, 'Earl Voss', { str: 86 }), ol(67, 'Jim Novak', { str: 85 }),
      ol(59, 'Cal Reeves', { str: 84 }), ol(75, 'Troy Inman', { str: 86 }),
      ol(78, 'Ben Casper', { str: 85 }),
      dl(90, 'Sione Tua', { prs: 90, tkl: 84, star: true }),
      lb(52, 'Micah Ridge', { tkl: 86, cov: 58, star: true }),
      lb(57, 'Nate Forrest', { tkl: 82, prs: 65 }),
      cb(23, 'Will Nance', { cov: 84, spd: 88 }),
      sf(35, 'Keith Draper', { cov: 82, tkl: 78, star: true }),
      k(6, 'Ollie Swann', { thPow: 92 }),
    ],
  },
  {
    abbr: 'BOS', city: 'Boston', name: 'Guardians',
    colors: { primary: 0x0044AA, secondary: 0xBB0000, accent: 0xFFFFFF },
    identity: 'Discipline, short passing, field control',
    roster: [
      qb(18, 'Nolan Grey', { thAcc: 92, thPow: 72, spd: 55, star: true }),
      hb(26, 'Finn McCarthy', { spd: 76, car: 76, agi: 74 }),
      fb(42, 'Rex Dunbar', { str: 78 }),
      wr(87, 'Ian Prescott', { cat: 84, spd: 78 }),
      wr(14, 'Tommy Lane', { cat: 82, spd: 76 }),
      te(83, 'Brian Moss', { cat: 78, str: 72, star: true }),
      ol(71, 'Doug Platt', { str: 88 }), ol(68, 'Steve Roth', { str: 86 }),
      ol(60, 'Chris Kern', { str: 85 }), ol(74, 'Jeff Ling', { str: 87 }),
      ol(79, 'Art Bauer', { str: 86 }),
      dl(96, 'Vince Holt', { prs: 78, tkl: 80 }),
      lb(51, 'Derek Slade', { tkl: 82, cov: 56 }),
      lb(59, 'Ron Healey', { tkl: 80 }),
      cb(25, 'Marcus Webb', { cov: 80, spd: 86 }),
      sf(30, 'Tom Riggs', { cov: 76, tkl: 74 }),
      k(2, 'Hugh Barker', { thPow: 88 }),
    ],
  },
  {
    abbr: 'ATL', city: 'Atlanta', name: 'Blaze',
    colors: { primary: 0xDD2200, secondary: 0xFF8800, accent: 0x000000 },
    identity: 'Aggressive offense and fast defense',
    roster: [
      qb(4, 'Marcus Flint', { thPow: 84, spd: 70, agi: 68 }),
      hb(21, 'Javon Rush', { spd: 90, agi: 86, car: 68, star: true }),
      fb(47, 'Trey Burden', {}),
      wr(88, 'Kelvin Hawk', { spd: 92, cat: 84, star: true }),
      wr(16, 'Dre Patterson', { spd: 88, cat: 78 }),
      te(84, 'Wes Cobb', { cat: 70, spd: 68 }),
      ol(70, 'Lane Stokes', { str: 84 }), ol(61, 'Ben Upshaw', { str: 82 }),
      ol(55, 'Jay Pitts', { str: 80 }), ol(76, 'Ed Sharpe', { str: 83 }),
      ol(73, 'Will Crane', { str: 82 }),
      dl(94, 'Damon Cage', { prs: 84, spd: 62 }),
      lb(50, 'Troy Blanton', { tkl: 78, spd: 76, star: true }),
      lb(58, 'Owen Riggs', { tkl: 74 }),
      cb(27, 'Jaelen Pace', { cov: 78, spd: 90 }),
      sf(34, 'Corey Lang', { cov: 72, tkl: 68 }),
      k(9, 'Nico Brandt', {}),
    ],
  },
  {
    abbr: 'DEN', city: 'Denver', name: 'Peaks',
    colors: { primary: 0x3355AA, secondary: 0xFF6600, accent: 0xFFFFFF },
    identity: 'Strong arm passing and altitude-themed pace',
    roster: [
      qb(10, 'Ridge Callahan', { thPow: 94, thAcc: 80, spd: 58, star: true }),
      hb(33, 'Will Timber', { spd: 78, car: 76 }),
      fb(41, 'Kurt Benson', { str: 76 }),
      wr(80, 'Lance Skyler', { spd: 90, cat: 82, star: true }),
      wr(18, 'Cory Ashe', { spd: 86, cat: 78 }),
      te(86, 'Mark Yoder', { cat: 72, str: 74 }),
      ol(72, 'Glen Roper', { str: 86 }), ol(66, 'Sam Trudeau', { str: 84 }),
      ol(58, 'Mike Pond', { str: 83 }), ol(77, 'Hal Grimes', { str: 85 }),
      ol(74, 'Dave Linton', { str: 84 }),
      dl(91, 'Knox Barrett', { prs: 80, tkl: 78 }),
      lb(53, 'Chase Fielding', { tkl: 78, cov: 54 }),
      lb(56, 'Lee Goddard', { tkl: 76 }),
      cb(22, 'Ty Ramsey', { cov: 72, spd: 84 }),
      sf(28, 'Quinn Hale', { cov: 68, tkl: 72 }),
      k(7, 'Axel Stone', { thPow: 94, star: true }),
    ],
  },
  {
    abbr: 'SFO', city: 'San Francisco', name: 'Gold',
    colors: { primary: 0xCC8800, secondary: 0x880000, accent: 0xFFFFFF },
    identity: 'Balanced west-coast rhythm offense',
    roster: [
      qb(8, 'Quinn Harlow', { thAcc: 86, thPow: 78, spd: 64, star: true }),
      hb(29, 'Alvin Cruz', { spd: 84, agi: 82, car: 78 }),
      fb(39, 'Greg Poole', { str: 76 }),
      wr(82, 'Troy Yamada', { cat: 86, spd: 84, agi: 84, star: true }),
      wr(12, 'Oscar Dunn', { cat: 80, spd: 82 }),
      te(85, 'Cliff Rhodes', { cat: 76, str: 72, spd: 70 }),
      ol(75, 'George Pak', { str: 88 }), ol(64, 'Rob Estrada', { str: 86 }),
      ol(57, 'Ian Lowe', { str: 85 }), ol(73, 'Phil Nash', { str: 87 }),
      ol(78, 'Don Mack', { str: 86 }),
      dl(93, 'Ray Obi', { prs: 80, tkl: 78 }),
      lb(54, 'Van Cooper', { tkl: 80, cov: 60, agi: 68 }),
      lb(51, 'Neil Pratt', { tkl: 78, cov: 58 }),
      cb(20, 'Amos Quick', { cov: 82, spd: 88, star: true }),
      sf(32, 'Lyle Barr', { cov: 76, tkl: 72 }),
      k(6, 'Kent Fields', {}),
    ],
  },
  {
    abbr: 'DET', city: 'Detroit', name: 'Iron',
    colors: { primary: 0x555555, secondary: 0x0066CC, accent: 0xDDDDDD },
    identity: 'Physical trench football',
    roster: [
      qb(15, 'Hank Dayton', { thPow: 76, thAcc: 74, str: 65 }),
      hb(24, 'Earl Briggs', { spd: 76, str: 76, car: 84, star: true }),
      fb(36, 'Tank Murray', { str: 86, star: true }),
      wr(81, 'Pete Salter', { cat: 74, spd: 78 }),
      wr(19, 'Ron Vickers', { cat: 72, spd: 76 }),
      te(88, 'Cal Dugan', { str: 80, cat: 70 }),
      ol(71, 'Bull Kramer', { str: 96, star: true }), ol(63, 'Art Stone', { str: 94 }),
      ol(56, 'Max Bolt', { str: 92 }), ol(77, 'Ray Phelps', { str: 93 }),
      ol(74, 'Ed Grange', { str: 92 }),
      dl(98, 'Bruno Koss', { prs: 88, tkl: 86, str: 90, star: true }),
      lb(52, 'Lou Winters', { tkl: 84, str: 78 }),
      lb(59, 'Sam Gentry', { tkl: 80 }),
      cb(25, 'Myles Shore', { cov: 72, spd: 80 }),
      sf(31, 'Vince Pryor', { cov: 68, tkl: 74 }),
      k(3, 'Chip Adler', {}),
    ],
  },
  {
    abbr: 'HOU', city: 'Houston', name: 'Comets',
    colors: { primary: 0x000066, secondary: 0xFF3300, accent: 0xFFCC00 },
    identity: 'Explosive offense, risky defense',
    roster: [
      qb(6, 'Ace Dawkins', { thPow: 86, spd: 80, agi: 78, star: true }),
      hb(20, 'Leon Bolt', { spd: 88, agi: 84, car: 72 }),
      fb(43, 'Wade Goins', {}),
      wr(11, 'Skyler Moon', { spd: 90, cat: 82, star: true }),
      wr(17, 'Derek Voss', { spd: 88, cat: 78 }),
      te(84, 'Chris Faulk', { cat: 72, spd: 70 }),
      ol(72, 'Beau Pruitt', { str: 84 }), ol(65, 'Hank Solis', { str: 82 }),
      ol(54, 'Drew Odom', { str: 80 }), ol(76, 'Kent Bragg', { str: 83 }),
      ol(79, 'Joel Nix', { str: 82 }),
      dl(99, 'Dre Blackmon', { prs: 82, spd: 60 }),
      lb(55, 'Ray Stallings', { tkl: 76, spd: 74 }),
      lb(48, 'Ty Wilburn', { tkl: 72 }),
      cb(23, 'Noel Banks', { cov: 74, spd: 86 }),
      sf(37, 'Cliff Yates', { cov: 70, tkl: 64 }),
      k(1, 'Santos Lima', {}),
    ],
  },
];

// Quick lookup by abbreviation
export const TEAM_MAP = {};
TEAMS.forEach(t => { TEAM_MAP[t.abbr] = t; });

// Get players by position group for a team
export function getPositionGroup(team, group) {
  const groups = {
    offense: ['QB','HB','FB','WR','TE','OL'],
    defense: ['DL','LB','CB','S'],
    special: ['K'],
  };
  const positions = groups[group] || [group];
  return team.roster.filter(p => positions.includes(p.pos));
}

// Get star players
export function getStars(team) {
  return team.roster.filter(p => p.star);
}
