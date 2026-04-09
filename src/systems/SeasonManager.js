import { TEAMS } from '../data/teams.js';

export default class SeasonManager {
  constructor() {
    this.teams = TEAMS.map(t => t.abbr);
    this.week = 1;
    this.totalWeeks = 12;
    this.schedule = [];
    this.standings = {};
    this.results = [];
    this.playerTeam = null;
    this.init();
  }

  init() {
    this.standings = {};
    this.teams.forEach(t => {
      this.standings[t] = { wins: 0, losses: 0, pf: 0, pa: 0 };
    });
    this.schedule = this.generateSchedule();
    this.results = [];
    this.week = 1;
  }

  generateSchedule() {
    const schedule = [];
    const teams = [...this.teams];
    for (let week = 1; week <= this.totalWeeks; week++) {
      const games = [];
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          games.push({ home: shuffled[i], away: shuffled[i + 1] });
        }
      }
      schedule.push({ week, games });
    }
    return schedule;
  }

  getCurrentWeekGames() {
    if (this.week > this.totalWeeks) return [];
    return this.schedule[this.week - 1].games;
  }

  getPlayerGame() {
    const games = this.getCurrentWeekGames();
    return games.find(g => g.home === this.playerTeam || g.away === this.playerTeam);
  }

  recordResult(home, away, homeScore, awayScore) {
    this.results.push({ week: this.week, home, away, homeScore, awayScore });
    if (homeScore > awayScore) {
      this.standings[home].wins++;
      this.standings[away].losses++;
    } else {
      this.standings[away].wins++;
      this.standings[home].losses++;
    }
    this.standings[home].pf += homeScore;
    this.standings[home].pa += awayScore;
    this.standings[away].pf += awayScore;
    this.standings[away].pa += homeScore;
  }

  simulateOtherGames(playerHome, playerAway) {
    const games = this.getCurrentWeekGames();
    for (const game of games) {
      if (game.home === playerHome && game.away === playerAway) continue;
      if (game.away === playerHome && game.home === playerAway) continue;
      // Simulate a simple score
      const hs = Math.floor(Math.random() * 28) + 7;
      const as = Math.floor(Math.random() * 28) + 7;
      this.recordResult(game.home, game.away, hs, as === hs ? as + 3 : as);
    }
  }

  advanceWeek() {
    this.week++;
  }

  getStandingsSorted() {
    return Object.entries(this.standings)
      .map(([abbr, s]) => ({ abbr, ...s }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.pf - b.pa) - (a.pf - a.pa);
      });
  }

  isSeasonOver() {
    return this.week > this.totalWeeks;
  }

  getTeamData(abbr) {
    return TEAMS.find(t => t.abbr === abbr);
  }
}
