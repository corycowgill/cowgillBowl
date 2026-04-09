import Phaser from 'phaser';
import SeasonManager from '../systems/SeasonManager.js';
import { TEAMS, TEAM_MAP } from '../data/teams.js';

export default class SeasonScene extends Phaser.Scene {
  constructor() { super('Season'); }

  init(data) {
    if (data.seasonMgr) {
      this.seasonMgr = data.seasonMgr;
    } else if (data.playerTeam) {
      this.seasonMgr = new SeasonManager();
      this.seasonMgr.playerTeam = data.playerTeam;
    }
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const mgr = this.seasonMgr;

    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);

    if (mgr.isSeasonOver()) {
      this.showSeasonEnd(w, h);
      return;
    }

    // Header
    this.add.text(w / 2, 20, 'COWGILL BOWL — SEASON MODE', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(w / 2, 42, 'Week ' + mgr.week + ' of ' + mgr.totalWeeks, {
      fontFamily: 'monospace', fontSize: '12px', color: '#888888',
    }).setOrigin(0.5);

    // Standings (left side)
    this.add.text(20, 65, 'STANDINGS', {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa', fontStyle: 'bold',
    });

    const standings = mgr.getStandingsSorted();
    const ss = { fontFamily: 'monospace', fontSize: '10px', color: '#cccccc' };
    standings.forEach((s, i) => {
      const team = TEAM_MAP[s.abbr];
      const isPlayer = s.abbr === mgr.playerTeam;
      const color = isPlayer ? '#ffcc00' : '#cccccc';
      this.add.text(20, 82 + i * 16, `${i + 1}. ${s.abbr} ${s.wins}-${s.losses} (PF:${s.pf} PA:${s.pa})`, {
        ...ss, color,
      });
    });

    // This week's matchup (right side)
    const game = mgr.getPlayerGame();
    if (game) {
      const homeTeam = TEAM_MAP[game.home];
      const awayTeam = TEAM_MAP[game.away];

      this.add.text(w / 2 + 40, 65, 'THIS WEEK', {
        fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa', fontStyle: 'bold',
      });

      this.add.text(w / 2 + 40, 90, `${homeTeam.city} ${homeTeam.name}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      });
      this.add.text(w / 2 + 40, 108, 'vs', {
        fontFamily: 'monospace', fontSize: '11px', color: '#666666',
      });
      this.add.text(w / 2 + 40, 124, `${awayTeam.city} ${awayTeam.name}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
      });

      // Play button
      const playBtn = this.add.rectangle(w / 2 + 120, 170, 180, 45, 0x224422)
        .setStrokeStyle(2, 0x44aa44)
        .setInteractive({ useHandCursor: true });
      this.add.text(w / 2 + 120, 170, 'PLAY GAME', {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

      playBtn.on('pointerdown', () => {
        this.scene.start('Game', {
          mode: 'season',
          homeTeam: TEAM_MAP[game.home],
          awayTeam: TEAM_MAP[game.away],
          humanSide: game.home === mgr.playerTeam ? 'home' : 'away',
          seasonMgr: mgr,
        });
      });

      this.input.keyboard.on('keydown-SPACE', () => playBtn.emit('pointerdown'));
    }

    // Recent results
    const recentResults = mgr.results.slice(-6);
    if (recentResults.length > 0) {
      this.add.text(w / 2 + 40, 220, 'RECENT RESULTS', {
        fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa', fontStyle: 'bold',
      });
      recentResults.forEach((r, i) => {
        this.add.text(w / 2 + 40, 238 + i * 14, `Wk${r.week}: ${r.home} ${r.homeScore} - ${r.awayScore} ${r.away}`, {
          fontFamily: 'monospace', fontSize: '9px', color: '#888888',
        });
      });
    }

    // Back to menu
    const backBtn = this.add.text(w / 2, h - 25, 'ESC — Back to Menu', {
      fontFamily: 'monospace', fontSize: '10px', color: '#555555',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('Menu'));
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Menu'));
  }

  showSeasonEnd(w, h) {
    const standings = this.seasonMgr.getStandingsSorted();
    const champion = standings[0];
    const teamData = TEAM_MAP[champion.abbr];

    this.add.text(w / 2, 40, 'SEASON COMPLETE', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(w / 2, 80, `CHAMPION: ${teamData.city} ${teamData.name}`, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(w / 2, 105, `Record: ${champion.wins}-${champion.losses}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Full standings
    standings.forEach((s, i) => {
      const isPlayer = s.abbr === this.seasonMgr.playerTeam;
      this.add.text(w / 2, 140 + i * 18, `${i + 1}. ${s.abbr}  ${s.wins}-${s.losses}  PF:${s.pf}  PA:${s.pa}`, {
        fontFamily: 'monospace', fontSize: '11px',
        color: isPlayer ? '#ffcc00' : '#cccccc',
      }).setOrigin(0.5);
    });

    const menuBtn = this.add.rectangle(w / 2, h - 50, 200, 45, 0x442222)
      .setStrokeStyle(2, 0xaa4444).setInteractive({ useHandCursor: true });
    this.add.text(w / 2, h - 50, 'MAIN MENU', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    menuBtn.on('pointerdown', () => this.scene.start('Menu'));
    this.input.keyboard.on('keydown-SPACE', () => this.scene.start('Menu'));
  }
}
