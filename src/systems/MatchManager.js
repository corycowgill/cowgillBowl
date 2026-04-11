import {
  QUARTER_SECONDS, QUARTERS, DOWNS_FOR_FIRST, YARDS_FOR_FIRST,
  SCORE_TD, SCORE_PAT, SCORE_FG, SCORE_SAFETY, CLOCK_SPEED_LIVE, CLOCK_SPEED_DEAD,
} from '../config.js';

// Manages score, downs, clock, possession, and field position
export default class MatchManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.homeScore = 0;
    this.awayScore = 0;
    this.quarter = 1;
    this.clockSeconds = QUARTER_SECONDS;
    this.playClock = 25;
    this.down = 1;
    this.yardsToGo = YARDS_FOR_FIRST;
    this.ballYardLine = 25;     // 0-100, 0=own endzone, 100=opp endzone
    this.possession = 'home';   // 'home' | 'away'
    this.homeTimeouts = 3;
    this.awayTimeouts = 3;
    this.isClockRunning = false;
    this.phase = 'kickoff';     // kickoff, play, pat, halftime, gameover
    this.lastPlayResult = '';
    this.homeGoingRight = true;

    // Stats
    this.stats = {
      home: { passYds: 0, rushYds: 0, passTD: 0, rushTD: 0, ints: 0, fumbles: 0, sacks: 0, firstDowns: 0 },
      away: { passYds: 0, rushYds: 0, passTD: 0, rushTD: 0, ints: 0, fumbles: 0, sacks: 0, firstDowns: 0 },
    };
  }

  get offenseGoingRight() {
    return (this.possession === 'home') === this.homeGoingRight;
  }

  get currentTimeouts() {
    return this.possession === 'home' ? this.homeTimeouts : this.awayTimeouts;
  }

  useTimeout() {
    if (this.possession === 'home' && this.homeTimeouts > 0) {
      this.homeTimeouts--;
      return true;
    }
    if (this.possession === 'away' && this.awayTimeouts > 0) {
      this.awayTimeouts--;
      return true;
    }
    return false;
  }

  tickClock(dt, isLive) {
    if (!this.isClockRunning) return;
    const rate = isLive ? CLOCK_SPEED_LIVE : CLOCK_SPEED_DEAD;
    this.clockSeconds -= dt * rate;
    if (this.clockSeconds <= 0) {
      this.clockSeconds = 0;
      this.isClockRunning = false;
      return 'quarter_end';
    }
    return null;
  }

  formatClock() {
    const m = Math.floor(this.clockSeconds / 60);
    const s = Math.floor(this.clockSeconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  advanceBall(yardsGained) {
    this.ballYardLine += yardsGained;
    this.yardsToGo -= yardsGained;

    // Touchdown
    if (this.ballYardLine >= 100) {
      this.ballYardLine = 100;
      return 'touchdown';
    }

    // Safety (pushed into own endzone)
    if (this.ballYardLine <= 0) {
      this.ballYardLine = 0;
      return 'safety';
    }

    // First down
    if (this.yardsToGo <= 0) {
      this.down = 1;
      this.yardsToGo = YARDS_FOR_FIRST;
      if (this.ballYardLine + YARDS_FOR_FIRST > 100) {
        this.yardsToGo = 100 - this.ballYardLine;
      }
      this.stats[this.possession].firstDowns++;
      return 'first_down';
    }

    // Next down
    this.down++;
    if (this.down > DOWNS_FOR_FIRST) {
      return 'turnover_on_downs';
    }
    return 'next_down';
  }

  scoreTouchdown() {
    if (this.possession === 'home') this.homeScore += SCORE_TD;
    else this.awayScore += SCORE_TD;
  }

  scoreFieldGoal() {
    if (this.possession === 'home') this.homeScore += SCORE_FG;
    else this.awayScore += SCORE_FG;
  }

  scorePAT() {
    if (this.possession === 'home') this.homeScore += SCORE_PAT;
    else this.awayScore += SCORE_PAT;
  }

  scoreSafety() {
    // Safety scores for the DEFENSE
    if (this.possession === 'home') this.awayScore += SCORE_SAFETY;
    else this.homeScore += SCORE_SAFETY;
  }

  changePossession() {
    this.possession = this.possession === 'home' ? 'away' : 'home';
    this.ballYardLine = 100 - this.ballYardLine;
    this.down = 1;
    this.yardsToGo = YARDS_FOR_FIRST;
  }

  setupKickoff(receivingTeam) {
    this.possession = receivingTeam;
    this.ballYardLine = 25; // will be set by kickoff result
    this.down = 1;
    this.yardsToGo = YARDS_FOR_FIRST;
    this.phase = 'kickoff';
  }

  setupAfterTouchdown() {
    // NFL: PAT from the 15-yard line (snap to the 2-yard line)
    // In our system, 98 = 2 yards from the opponent's end zone
    this.ballYardLine = 98;
    this.down = 1;
    this.yardsToGo = 2;
    this.phase = 'pat';
  }

  setupAfterSafety() {
    // Team that was scored on kicks from own 20
    this.ballYardLine = 20;
    this.phase = 'kickoff';
  }

  nextQuarter() {
    this.quarter++;
    if (this.quarter > QUARTERS) {
      this.phase = 'gameover';
      return 'gameover';
    }
    this.clockSeconds = QUARTER_SECONDS;
    if (this.quarter === 3) {
      // Halftime - swap sides
      this.homeGoingRight = !this.homeGoingRight;
      this.homeTimeouts = 3;
      this.awayTimeouts = 3;
      return 'halftime_kickoff';
    }
    return 'continue';
  }

  getDownText() {
    const ordinal = ['', '1st', '2nd', '3rd', '4th'];
    if (this.down > 4) return '4th';
    return `${ordinal[this.down]} & ${this.yardsToGo}`;
  }

  getFieldPositionText() {
    if (this.ballYardLine === 50) return '50';
    if (this.ballYardLine < 50) return `OWN ${this.ballYardLine}`;
    return `OPP ${100 - this.ballYardLine}`;
  }
}
