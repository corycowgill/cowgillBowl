import Phaser from 'phaser';
import {
  WORLD_W, WORLD_H, FIELD_LEFT, FIELD_TOP, FIELD_WIDTH_PX, END_ZONE_PX,
  YARD_PX, FIELD_LENGTH_PX, PASS_SPEED, CATCH_RADIUS, TACKLE_RADIUS,
  CAM_LERP, CAM_ZOOM_DESKTOP, CAM_ZOOM_MOBILE,
  yardToPx, pxToYard, fieldCenterY, attrToSpeed, isMobile,
} from '../config.js';
import { buildPlaybook } from '../data/plays.js';
import { getPositionGroup } from '../data/teams.js';
import FieldRenderer from '../entities/FieldRenderer.js';
import PlayerEntity from '../entities/PlayerEntity.js';
import Football from '../entities/Football.js';
import MatchManager from '../systems/MatchManager.js';
import PlayExecutor from '../systems/PlayExecutor.js';
import TackleResolver from '../systems/TackleResolver.js';
import AIController from '../systems/AIController.js';
import HUD from '../ui/HUD.js';
import PlayCallUI from '../ui/PlayCallUI.js';
import MobileControls from '../ui/MobileControls.js';
import GamepadManager from '../ui/GamepadManager.js';

const State = {
  COIN_TOSS: 'coin_toss',
  KICKOFF_SETUP: 'kickoff_setup',
  KICKOFF_LIVE: 'kickoff_live',
  PLAY_CALL: 'play_call',
  PRE_SNAP: 'pre_snap',
  LIVE_PLAY: 'live_play',
  PLAY_DEAD: 'play_dead',
  PAT_CALL: 'pat_call',
  PAT_LIVE: 'pat_live',
  FG_AIM: 'fg_aim',
  FG_LIVE: 'fg_live',
  PUNT_LIVE: 'punt_live',
  QUARTER_END: 'quarter_end',
  HALFTIME: 'halftime',
  GAME_OVER: 'game_over',
};

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.homeTeam = data.homeTeam;
    this.awayTeam = data.awayTeam;
    this.humanSide = data.humanSide || 'home';
    this.gameMode = data.mode || 'quick';
    this.seasonMgr = data.seasonMgr || null;
  }

  create() {
    // Systems
    this.match = new MatchManager();
    this.executor = new PlayExecutor(this);
    this.tackleResolver = new TackleResolver();
    this.ai = new AIController();

    // Playbooks
    this.homePlaybook = buildPlaybook(this.homeTeam.abbr);
    this.awayPlaybook = buildPlaybook(this.awayTeam.abbr);

    // World bounds
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Camera — static, no zoom, no scroll.
    // Field is sized to match the 960×540 viewport exactly.
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setZoom(1);
    cam.setScroll(0, 0);

    // Field
    this.field = new FieldRenderer(this);

    // Football
    this.ball = new Football(this);

    // Players
    this.homePlayers = [];
    this.awayPlayers = [];
    this.createPlayers();

    // UI
    this.hud = new HUD(this);
    this.playCallUI = new PlayCallUI(this);
    this.mobileControls = new MobileControls(this);

    // Input
    this.cursors = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D',
      space: 'SPACE', j: 'J', k: 'K',
      esc: 'ESC',
    });
    this.gamepad = new GamepadManager();

    // Play state
    this.state = State.COIN_TOSS;
    this.stateTimer = 0;
    this.currentPlay = null;
    this.currentDefPlay = null;
    this.offAssignments = {};
    this.defAssignments = {};
    this.receivers = [];
    this.ballCarrier = null;
    this.qb = null;
    this.passThrown = false;
    this.passTarget = null;
    this.selectedReceiverIdx = 0;
    this.controlledDefender = null;
    this.kickPower = 0;
    this.kickCharging = false;
    this.fgAngle = 0;
    this.fgSwinging = true;
    this.playResultTimer = 0;

    // Start
    this.startCoinToss();
  }

  createPlayers() {
    const homeOff = getPositionGroup(this.homeTeam, 'offense');
    const homeDef = getPositionGroup(this.homeTeam, 'defense');
    const awayOff = getPositionGroup(this.awayTeam, 'offense');
    const awayDef = getPositionGroup(this.awayTeam, 'defense');

    // We need 11 players per side. Fill from roster.
    const pickEleven = (roster) => {
      const selected = [];
      const positions = ['QB','HB','FB','WR','WR','TE','OL','OL','OL','OL','OL'];
      const defPositions = ['DL','DL','DL','DL','LB','LB','LB','CB','CB','S','S'];
      // Just take first 11 from roster (offense + defense combined), prioritizing starters
      const sorted = [...roster].sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0));
      return sorted.slice(0, 11);
    };

    const createTeamPlayers = (team, arr, isOffense) => {
      const eleven = pickEleven(team.roster);
      eleven.forEach(data => {
        const pe = new PlayerEntity(this, data, team.colors.primary, isOffense, team.abbr);
        pe.setPosition(WORLD_W / 2, WORLD_H / 2); // will be repositioned
        arr.push(pe);
      });
    };

    createTeamPlayers(this.homeTeam, this.homePlayers, true);
    createTeamPlayers(this.awayTeam, this.awayPlayers, false);
  }

  get humanOnOffense() {
    return this.match.possession === this.humanSide;
  }

  get offensePlayers() {
    return this.match.possession === 'home' ? this.homePlayers : this.awayPlayers;
  }

  get defensePlayers() {
    return this.match.possession === 'home' ? this.awayPlayers : this.homePlayers;
  }

  get offenseTeam() {
    return this.match.possession === 'home' ? this.homeTeam : this.awayTeam;
  }

  get defenseTeam() {
    return this.match.possession === 'home' ? this.awayTeam : this.homeTeam;
  }

  get offensePlaybook() {
    return this.match.possession === 'home' ? this.homePlaybook : this.awayPlaybook;
  }

  get defensePlaybook() {
    return this.match.possession === 'home' ? this.awayPlaybook : this.homePlaybook;
  }

  startCoinToss() {
    this.state = State.COIN_TOSS;
    this.stateTimer = 1.5;
    // Home team receives first
    this.match.possession = 'away'; // away kicks off
    this.hud.showMessage('COIN TOSS — ' + this.homeTeam.city + ' receives!', 1.5);
  }

  startKickoff() {
    this.state = State.KICKOFF_SETUP;
    this.stateTimer = 0.5;
    this.match.phase = 'kickoff';

    const goingRight = this.match.offenseGoingRight;
    const losYard = 35; // kickoff from 35 for kicking team

    // Place kicking team (current offense side since possession not yet flipped)
    const kickingPlayers = this.defensePlayers; // defense is kicking
    const receivingPlayers = this.offensePlayers;

    // Kicking team lines up at 35
    const kickX = yardToPx(35, !goingRight);
    const centerY = fieldCenterY();
    kickingPlayers.forEach((p, i) => {
      p.setPosition(kickX + (i % 2 === 0 ? -5 : 5), centerY + (i - 5) * 25);
      p.goingRight = !goingRight;
      p.stop();
    });

    // Receiving team lines up deep
    const recvX = yardToPx(5, goingRight);
    receivingPlayers.forEach((p, i) => {
      p.setPosition(recvX + (i % 3) * 15, centerY + (i - 5) * 25);
      p.goingRight = goingRight;
      p.stop();
    });

    // Ball at kicker position
    this.ball.placeAt(kickX, centerY);
    this.kickPower = 0;
    this.kickCharging = false;

    this.hud.showMessage('KICKOFF — Press SPACE to kick!', 1.5);
  }

  startPlayCall() {
    this.state = State.PLAY_CALL;
    this.passThrown = false;
    this.passTarget = null;
    this.ballCarrier = null;

    // Draw LOS and first down line
    const goingRight = this.match.offenseGoingRight;
    const losX = yardToPx(this.match.ballYardLine, goingRight);
    this.field.drawLOS(losX);
    const fdYard = Math.min(this.match.ballYardLine + this.match.yardsToGo, 100);
    const fdX = yardToPx(fdYard, goingRight);
    this.field.drawFirstDownLine(fdX);

    // Check if AI should punt or FG on 4th down
    if (!this.humanOnOffense) {
      if (this.ai.shouldAttemptFG(this.match)) {
        this.startFGAim();
        return;
      }
      if (this.ai.shouldPunt(this.match)) {
        this.startPunt();
        return;
      }
    }

    if (this.humanOnOffense) {
      // Human picks offense
      this.playCallUI.show(this.offensePlaybook.offense, false, (play) => {
        this.currentPlay = play;
        // AI picks defense
        this.currentDefPlay = this.ai.pickDefensivePlay(this.defensePlaybook, this.match);
        this.startPreSnap();
      });
    } else {
      // AI picks offense
      this.currentPlay = this.ai.pickOffensivePlay(this.offensePlaybook, this.match);
      // Human picks defense
      this.playCallUI.show(this.defensePlaybook.defense, true, (defPlay) => {
        this.currentDefPlay = defPlay;
        this.startPreSnap();
      });
    }
  }

  startPreSnap() {
    this.state = State.PRE_SNAP;
    this.stateTimer = 0.8;

    const goingRight = this.match.offenseGoingRight;

    // Align offense
    this.offAssignments = this.executor.alignOffense(
      this.offensePlayers, this.currentPlay, this.match.ballYardLine, goingRight
    );

    // Align defense
    this.defAssignments = this.executor.alignDefense(
      this.defensePlayers, this.currentDefPlay, this.match.ballYardLine, goingRight
    );

    // Camera is static — full field always visible, no centering needed.
    this.match.isClockRunning = false;
  }

  snapBall() {
    this.state = State.LIVE_PLAY;
    this.match.isClockRunning = true;
    this.passThrown = false;
    this.selectedReceiverIdx = 0;
    this.passTarget = null;

    // Reset all player animations for new play
    this.homePlayers.forEach(p => p.resetAnim());
    this.awayPlayers.forEach(p => p.resetAnim());

    const goingRight = this.match.offenseGoingRight;

    // Find QB
    this.qb = this.offAssignments['QB'] || this.offensePlayers[0];

    if (this.currentPlay.type === 'run') {
      // Hand off to carrier
      const carrierRole = this.currentPlay.carrier || 'HB';
      this.ballCarrier = this.offAssignments[carrierRole] || this.qb;
      this.ball.attachTo(this.ballCarrier);
      this.executor.buildRunPath(this.ballCarrier, this.currentPlay, goingRight);

      if (this.humanOnOffense) {
        this.ballCarrier.setControlled(true);
      }
    } else {
      // Pass play - QB holds ball
      this.ballCarrier = this.qb;
      this.ball.attachTo(this.qb);
      // Build receiver routes
      this.receivers = this.executor.buildReceiverRoutes(
        this.offAssignments, this.currentPlay, this.match.ballYardLine, goingRight
      );

      if (this.humanOnOffense) {
        this.qb.setControlled(true);
      }
    }

    // Set up blocking
    this.executor.setupBlocking(this.offAssignments, this.defAssignments, this.currentPlay);

    // Defense: if human, select a defender
    if (!this.humanOnOffense) {
      this.selectNearestDefender();
    }
  }

  selectNearestDefender() {
    // Select the LB or safety closest to ball
    let best = null;
    let bestDist = Infinity;
    for (const p of this.defensePlayers) {
      if (p.data.pos === 'LB' || p.data.pos === 'S' || p.data.pos === 'CB') {
        const d = this.ballCarrier ? p.distTo(this.ballCarrier) : 9999;
        if (d < bestDist) { bestDist = d; best = p; }
      }
    }
    if (best) {
      this.defensePlayers.forEach(p => p.setControlled(false));
      best.setControlled(true);
      this.controlledDefender = best;
    }
  }

  switchDefender() {
    // Tecmo-style: switch to the defender nearest the ball carrier
    // (but not the one currently controlled)
    const current = this.controlledDefender;
    let best = null;
    let bestDist = Infinity;
    const targetX = this.ballCarrier ? this.ballCarrier.sprite.x : this.ball.sprite.x;
    const targetY = this.ballCarrier ? this.ballCarrier.sprite.y : this.ball.sprite.y;

    for (const p of this.defensePlayers) {
      if (p === current) continue;
      const dx = p.sprite.x - targetX;
      const dy = p.sprite.y - targetY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = p; }
    }

    if (best) {
      if (current) current.setControlled(false);
      best.setControlled(true);
      this.controlledDefender = best;
    }
  }

  throwPass() {
    if (this.passThrown || !this.qb) return;
    if (this.receivers.length === 0) return;

    const target = this.receivers[this.selectedReceiverIdx % this.receivers.length];
    if (!target) return;

    this.passThrown = true;
    this.passTarget = target;

    // Lead the receiver slightly
    const leadX = target.sprite.x + target.sprite.body.velocity.x * 0.4;
    const leadY = target.sprite.y + target.sprite.body.velocity.y * 0.4;

    this.ball.throwTo(leadX, leadY, PASS_SPEED);
    this.qb.setControlled(false);
    this.ballCarrier = null;
  }

  startPunt() {
    this.state = State.PUNT_LIVE;
    this.stateTimer = 0;
    this.kickPower = 0;
    this.kickCharging = true;

    if (!this.humanOnOffense) {
      // AI punts automatically
      this.kickPower = 0.6 + Math.random() * 0.3;
      this.executePunt();
    } else {
      this.hud.showMessage('PUNT — Hold SPACE to set power!', 1.5);
    }
  }

  executePunt() {
    const goingRight = this.match.offenseGoingRight;
    const puntYards = 25 + Math.floor(this.kickPower * 40);
    this.match.changePossession();
    this.match.ballYardLine = Math.max(5, Math.min(95, 100 - (this.match.ballYardLine) + puntYards));

    // Reset for new possession
    this.match.down = 1;
    this.match.yardsToGo = 10;

    this.field.clearOverlays();
    this.hud.showMessage('PUNT — ' + puntYards + ' yards', 1.5);
    this.state = State.PLAY_DEAD;
    this.stateTimer = 2;
  }

  startFGAim() {
    this.state = State.FG_AIM;
    this.fgAngle = 0;
    this.fgSwinging = true;
    this.kickPower = 0;
    this.kickCharging = false;

    const dist = 100 - this.match.ballYardLine + 17; // FG distance

    if (!this.humanOnOffense) {
      // AI kicks
      const accuracy = 0.5 + Math.random() * 0.4;
      const made = dist <= 50 && accuracy > 0.35;
      if (made) {
        this.match.scoreFieldGoal();
        this.hud.showMessage('FIELD GOAL IS GOOD! ' + dist + ' yards', 2);
      } else {
        this.hud.showMessage('FIELD GOAL MISSED! ' + dist + ' yards', 2);
      }
      this.state = State.PLAY_DEAD;
      this.stateTimer = 2.5;
      this.afterFGOrPunt = true;
      return;
    }

    this.hud.showMessage('FIELD GOAL — Press SPACE to set aim, then power!', 2);
  }

  startPAT() {
    this.match.setupAfterTouchdown();
    this.state = State.PAT_CALL;
    this.stateTimer = 0;

    if (this.humanOnOffense) {
      this.hud.showMessage('EXTRA POINT — Press SPACE', 1.5);
    } else {
      // AI auto-kicks PAT
      const made = Math.random() < 0.94;
      if (made) {
        this.match.scorePAT();
        this.hud.showMessage('EXTRA POINT — GOOD!', 1.5);
      } else {
        this.hud.showMessage('EXTRA POINT — MISSED!', 1.5);
      }
      this.state = State.PLAY_DEAD;
      this.stateTimer = 2;
      this.afterTDKickoff = true;
    }
  }

  handlePlayDead(yardsGained, resultText) {
    this.state = State.PLAY_DEAD;
    this.stateTimer = 2;
    this.match.isClockRunning = false;

    // Stop all players and trigger down animation
    this.homePlayers.forEach(p => { p.stop(); p.setControlled(false); });
    this.awayPlayers.forEach(p => { p.stop(); p.setControlled(false); });
    if (this._recvIndicator) this._recvIndicator.clear();
    if (this.ballCarrier) this.ballCarrier.playDownAnim();

    const result = this.match.advanceBall(yardsGained);

    let message = resultText || '';

    if (result === 'touchdown') {
      const team = this.offenseTeam;
      this.match.scoreTouchdown();
      if (this.currentPlay && this.currentPlay.type === 'pass') {
        this.match.stats[this.match.possession].passTD++;
      } else {
        this.match.stats[this.match.possession].rushTD++;
      }
      message = 'TOUCHDOWN ' + team.city + '!';
      this.hud.showMessage(message, 2.5);
      this.stateTimer = 3;
      this.afterTD = true;
      // Celebrate animation for the scorer
      if (this.ballCarrier) this.ballCarrier.playCelebrateAnim();
      this.offensePlayers.forEach(p => p.playCelebrateAnim());
      return;
    }

    if (result === 'safety') {
      this.match.scoreSafety();
      message = 'SAFETY!';
      this.hud.showMessage(message, 2);
      this.afterSafety = true;
      return;
    }

    if (result === 'turnover_on_downs') {
      this.match.changePossession();
      message = 'TURNOVER ON DOWNS!';
      this.hud.showMessage(message, 2);
      this.field.clearOverlays();
      return;
    }

    if (result === 'first_down') {
      message += ' — FIRST DOWN!';
    }

    const yardText = yardsGained >= 0 ? '+' + Math.round(yardsGained) : '' + Math.round(yardsGained);
    this.hud.showMessage((message || 'Gain of ' + yardText + ' yards') + ' | ' + this.match.getDownText(), 1.8);
    this.field.clearOverlays();
  }

  handleInterception(interceptor) {
    this.hud.showMessage('INTERCEPTED by #' + interceptor.data.num + '!', 2);
    this.match.stats[this.match.possession].ints++;
    this.match.changePossession();
    this.field.clearOverlays();

    this.state = State.PLAY_DEAD;
    this.stateTimer = 2.5;
    this.homePlayers.forEach(p => { p.stop(); p.setControlled(false); });
    this.awayPlayers.forEach(p => { p.stop(); p.setControlled(false); });
  }

  handleFumble(carrier) {
    this.match.stats[this.match.possession].fumbles++;
    // 50% chance defense recovers
    if (Math.random() < 0.5) {
      const goingRight = this.match.offenseGoingRight;
      const yardsGained = this.executor.pxToYardsFromLOS(
        carrier.sprite.x, this.match.ballYardLine, goingRight
      );
      this.match.advanceBall(yardsGained);
      this.match.changePossession();
      this.hud.showMessage('FUMBLE — Defense recovers!', 2);
    } else {
      const goingRight = this.match.offenseGoingRight;
      const yardsGained = this.executor.pxToYardsFromLOS(
        carrier.sprite.x, this.match.ballYardLine, goingRight
      );
      this.match.advanceBall(yardsGained);
      this.hud.showMessage('FUMBLE — Offense recovers!', 2);
    }
    this.field.clearOverlays();
    this.state = State.PLAY_DEAD;
    this.stateTimer = 2.5;
    this.homePlayers.forEach(p => { p.stop(); p.setControlled(false); });
    this.awayPlayers.forEach(p => { p.stop(); p.setControlled(false); });
  }

  endQuarter() {
    this.state = State.QUARTER_END;
    this.stateTimer = 2;
    const result = this.match.nextQuarter();
    if (result === 'gameover') {
      this.state = State.GAME_OVER;
      this.stateTimer = 3;
      this.hud.showMessage('GAME OVER!', 3);
    } else if (result === 'halftime_kickoff') {
      this.hud.showMessage('HALFTIME', 2);
      this.state = State.HALFTIME;
      this.stateTimer = 3;
    } else {
      this.hud.showMessage('END OF QUARTER ' + (this.match.quarter - 1), 2);
    }
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Poll gamepad every frame
    this.gamepad.poll();

    // Update all player visuals
    this.homePlayers.forEach(p => p.update(dt));
    this.awayPlayers.forEach(p => p.update(dt));
    this.ball.update(dt);

    // Tick clock
    const clockResult = this.match.tickClock(dt, this.state === State.LIVE_PLAY);
    if (clockResult === 'quarter_end' && this.state === State.LIVE_PLAY) {
      this.endQuarter();
      return;
    }

    // Update HUD
    this.hud.update(this.match, this.homeTeam, this.awayTeam, dt);

    // State machine
    switch (this.state) {
      case State.COIN_TOSS:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.startKickoff();
        break;

      case State.KICKOFF_SETUP:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = State.KICKOFF_LIVE;
          this.kickCharging = false;
          this.kickPower = 0;
        }
        break;

      case State.KICKOFF_LIVE:
        this.updateKickoff(dt);
        break;

      case State.PLAY_CALL:
        this.updatePlayCallInput();
        break;

      case State.PRE_SNAP:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          if (this.humanOnOffense) {
            const isPass = this.currentPlay && this.currentPlay.type === 'pass';
            this.hud.showMessage(isPass ? 'SPACE=snap  then  J=cycle  SPACE=throw' : 'SPACE=snap  then  Arrows=run  K=sprint', 0.05);
            if (this._actionJustPressed()) {
              this.snapBall();
            }
          } else {
            this.hud.showMessage('J=switch defender  SPACE=dive tackle  K=sprint', 0.05);
            this.stateTimer -= dt;
            if (this.stateTimer <= -0.5) this.snapBall();
          }
        }
        break;

      case State.LIVE_PLAY:
        this.updateLivePlay(dt);
        break;

      case State.PLAY_DEAD:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          if (this.afterTD) {
            this.afterTD = false;
            this.startPAT();
          } else if (this.afterTDKickoff) {
            this.afterTDKickoff = false;
            this.match.setupKickoff(this.match.possession === 'home' ? 'away' : 'home');
            this.match.changePossession();
            this.startKickoff();
          } else if (this.afterSafety) {
            this.afterSafety = false;
            this.match.setupAfterSafety();
            this.startKickoff();
          } else if (this.afterFGOrPunt) {
            this.afterFGOrPunt = false;
            this.match.setupKickoff(this.match.possession === 'home' ? 'away' : 'home');
            this.match.changePossession();
            this.startKickoff();
          } else {
            this.startPlayCall();
          }
        }
        break;

      case State.PAT_CALL:
        if (this._actionJustPressed()) {
          const made = Math.random() < 0.94;
          if (made) {
            this.match.scorePAT();
            this.hud.showMessage('EXTRA POINT — GOOD!', 1.5);
          } else {
            this.hud.showMessage('EXTRA POINT — NO GOOD!', 1.5);
          }
          this.state = State.PLAY_DEAD;
          this.stateTimer = 2;
          this.afterTDKickoff = true;
        }
        break;

      case State.FG_AIM:
        this.updateFGAim(dt);
        break;

      case State.PUNT_LIVE:
        this.updatePuntInput(dt);
        break;

      case State.QUARTER_END:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.startPlayCall();
        }
        break;

      case State.HALFTIME:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          // Second half kickoff
          this.match.setupKickoff(this.match.possession === 'home' ? 'away' : 'home');
          this.startKickoff();
        }
        break;

      case State.GAME_OVER:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.scene.start('GameOver', {
            homeTeam: this.homeTeam,
            awayTeam: this.awayTeam,
            homeScore: this.match.homeScore,
            awayScore: this.match.awayScore,
            stats: this.match.stats,
            mode: this.gameMode,
            seasonMgr: this.seasonMgr,
          });
        }
        break;
    }

    // Camera follow
    this.updateCamera(dt);
  }

  updateKickoff(dt) {
    if (!this.kickCharging && (this._actionJustPressed())) {
      this.kickCharging = true;
      this.kickPower = 0;
    }

    if (this.kickCharging) {
      this.kickPower += dt * 1.2;
      if (this.kickPower >= 1) this.kickPower = 1;

      if (!this._actionHeld()) {
        // Kick released
        this.executeKickoff();
      }
    }

    // Show power bar
    if (this.kickCharging) {
      this.hud.showMessage('KICK POWER: ' + Math.round(this.kickPower * 100) + '%', 0.1);
    }
  }

  executeKickoff() {
    const goingRight = this.match.offenseGoingRight;
    const kickYards = 30 + Math.floor(this.kickPower * 45);
    this.match.ballYardLine = Math.max(5, Math.min(95, kickYards));
    this.match.down = 1;
    this.match.yardsToGo = 10;

    this.field.clearOverlays();
    this.hud.showMessage('Kickoff — returned to the ' + this.match.getFieldPositionText(), 2);

    this.state = State.PLAY_DEAD;
    this.stateTimer = 2;
    this.kickCharging = false;
  }

  updatePlayCallInput() {
    if (!this.playCallUI.isVisible) return;
    const gp = this.gamepad;
    // Keyboard + gamepad D-pad/stick navigation
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.cursors.d) || gp.justPressed(15) || gp.cycleRightJustPressed) {
      this.playCallUI.moveSelection(1, 0);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.cursors.a) || gp.justPressed(14) || gp.cycleLeftJustPressed) {
      this.playCallUI.moveSelection(-1, 0);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.cursors.s) || gp.justPressed(13)) {
      this.playCallUI.moveSelection(0, 1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.w) || gp.justPressed(12)) {
      this.playCallUI.moveSelection(0, -1);
    }
    if (this._actionJustPressed()) {
      this.playCallUI.confirmSelection();
    }
  }

  updateLivePlay(dt) {
    const goingRight = this.match.offenseGoingRight;

    if (this.humanOnOffense) {
      this.updateHumanOffense(dt);
    } else {
      this.updateAIOffense(dt);
    }

    if (!this.humanOnOffense) {
      this.updateHumanDefense(dt);
    } else {
      // AI defense
      this.ai.updateDefenders(this.defensePlayers, this.ballCarrier, this.ball, dt);
    }

    // AI manages non-controlled offense players
    this.ai.updateOffense(this.offensePlayers, this.currentPlay, this.ball, dt);

    // Check tackles on ball carrier
    if (this.ballCarrier) {
      const results = this.tackleResolver.checkProximity(this.ballCarrier, this.defensePlayers);
      for (const r of results) {
        if (r.result === 'fumble') {
          this.ball.makeFumble();
          this.handleFumble(this.ballCarrier);
          return;
        }
        if (r.result === 'tackle' || r.result === 'stumble') {
          r.defender.playTackleAnim();
          const yardsGained = this.executor.pxToYardsFromLOS(
            this.ballCarrier.sprite.x, this.match.ballYardLine, goingRight
          );
          const yardStr = Math.round(yardsGained);
          this.handlePlayDead(yardsGained, yardStr >= 0 ? 'Tackled for ' + yardStr + ' yards' : 'Loss of ' + Math.abs(yardStr) + ' yards');
          return;
        }
        // broken tackle - carrier keeps going
      }

      // Check if ball carrier is in end zone (touchdown)
      if (this.executor.isInEndZone(this.ballCarrier.sprite.x, goingRight)) {
        this.handlePlayDead(100 - this.match.ballYardLine);
        return;
      }

      // Check out of bounds
      if (this.executor.isOutOfBounds(this.ballCarrier.sprite.x, this.ballCarrier.sprite.y)) {
        const yardsGained = this.executor.pxToYardsFromLOS(
          this.ballCarrier.sprite.x, this.match.ballYardLine, goingRight
        );
        this.handlePlayDead(yardsGained, 'Out of bounds');
        return;
      }
    }

    // Check pass completion
    if (this.passThrown && this.ball.inAir) {
      // Check if ball arrived at target area
      // nothing to do while in air
    } else if (this.passThrown && !this.ball.inAir && !this.ball.held) {
      // Ball has arrived at target
      const catchResult = this.executor.evaluateCatch(
        this.passTarget, this.ball, this.defensePlayers
      );
      if (catchResult.caught) {
        this.passTarget.playCatchAnim();
        this.ballCarrier = this.passTarget;
        this.ball.attachTo(this.passTarget);
        if (this.humanOnOffense) {
          this.passTarget.setControlled(true);
          this.qb.setControlled(false);
        }
        this.passThrown = false;
        // Track pass yards
        const yardsFromLOS = this.executor.pxToYardsFromLOS(
          this.passTarget.sprite.x, this.match.ballYardLine, goingRight
        );
        this.match.stats[this.match.possession].passYds += Math.max(0, yardsFromLOS);
      } else if (catchResult.intercepted) {
        this.handleInterception(catchResult.interceptor);
        return;
      } else {
        // Incomplete
        this.hud.showMessage('INCOMPLETE!', 1.5);
        this.state = State.PLAY_DEAD;
        this.stateTimer = 1.5;
        this.match.down++;
        if (this.match.down > 4) {
          this.match.changePossession();
          this.hud.showMessage('TURNOVER ON DOWNS!', 2);
          this.field.clearOverlays();
        }
        this.homePlayers.forEach(p => { p.stop(); p.setControlled(false); });
        this.awayPlayers.forEach(p => { p.stop(); p.setControlled(false); });
        return;
      }
    }

    // If QB hasn't thrown and is sacked
    if (!this.passThrown && this.currentPlay && this.currentPlay.type === 'pass' && this.ballCarrier === this.qb) {
      const results = this.tackleResolver.checkProximity(this.qb, this.defensePlayers);
      for (const r of results) {
        if (r.result === 'tackle' || r.result === 'stumble' || r.result === 'fumble') {
          const yardsGained = this.executor.pxToYardsFromLOS(
            this.qb.sprite.x, this.match.ballYardLine, goingRight
          );
          this.match.stats[this.match.possession].sacks++;
          if (r.result === 'fumble') {
            this.ball.makeFumble();
            this.handleFumble(this.qb);
          } else {
            this.handlePlayDead(yardsGained, 'SACKED!');
          }
          return;
        }
      }
    }
  }

  // ── Unified input helpers (keyboard + gamepad + mobile) ──
  _readMoveInput() {
    let mx = 0, my = 0;
    // Keyboard
    if (this.cursors.left.isDown || this.cursors.a.isDown) mx = -1;
    if (this.cursors.right.isDown || this.cursors.d.isDown) mx = 1;
    if (this.cursors.up.isDown || this.cursors.w.isDown) my = -1;
    if (this.cursors.down.isDown || this.cursors.s.isDown) my = 1;
    // Gamepad (left stick + D-pad)
    const gp = this.gamepad;
    if (gp.connected) {
      if (Math.abs(gp.moveX) > 0.1 || Math.abs(gp.moveY) > 0.1) {
        mx = gp.moveX;
        my = gp.moveY;
      }
    }
    // Mobile joystick
    if (this.mobileControls.enabled) {
      if (Math.abs(this.mobileControls.moveX) > 0.1 || Math.abs(this.mobileControls.moveY) > 0.1) {
        mx = this.mobileControls.moveX;
        my = this.mobileControls.moveY;
      }
    }
    return { mx, my };
  }

  _actionJustPressed() {
    return Phaser.Input.Keyboard.JustDown(this.cursors.space)
      || this.gamepad.actionJustPressed
      || this.mobileControls.consumeAction();
  }

  _passJustPressed() {
    return Phaser.Input.Keyboard.JustDown(this.cursors.j)
      || this.gamepad.passJustPressed
      || this.mobileControls.consumePass();
  }

  _sprintDown() {
    return this.cursors.k.isDown
      || this.gamepad.sprintDown
      || this.mobileControls.sprintPressed;
  }

  _actionHeld() {
    return this.cursors.space.isDown || this.gamepad.actionDown;
  }

  // ── Apply movement to a controlled player ──
  _applyMove(player, mx, my) {
    const sprint = this._sprintDown();
    player.isSprinting = sprint;
    if (mx !== 0 || my !== 0) {
      const spd = attrToSpeed(player.data.spd) * (sprint ? 1.3 : 1);
      const len = Math.sqrt(mx * mx + my * my);
      player.sprite.body.setVelocity((mx / len) * spd, (my / len) * spd);
    } else {
      player.sprite.body.setVelocity(0, 0);
    }
  }

  // ── Draw receiver target arrow above the currently selected receiver ──
  _drawReceiverIndicator() {
    if (!this._recvIndicator) {
      this._recvIndicator = this.add.graphics();
      this._recvIndicator.setDepth(200);
    }
    this._recvIndicator.clear();

    if (!this.humanOnOffense) return;
    if (this.passThrown) return;
    if (!this.receivers || this.receivers.length === 0) return;
    if (this.currentPlay && this.currentPlay.type !== 'pass') return;

    const target = this.receivers[this.selectedReceiverIdx % this.receivers.length];
    if (!target) return;

    const tx = target.sprite.x;
    const ty = target.sprite.y - 28;

    // Pulsing arrow
    const pulse = Math.sin(this.time.now * 0.008) * 3;
    this._recvIndicator.fillStyle(0x00ff00, 0.9);
    this._recvIndicator.fillTriangle(tx - 6, ty - 4 + pulse, tx + 6, ty - 4 + pulse, tx, ty + 5 + pulse);
    this._recvIndicator.fillStyle(0x00ff00, 0.6);
    this._recvIndicator.fillCircle(tx, ty + 8 + pulse, 3);
  }

  // ══════════════════════════════════════════════
  //  HUMAN OFFENSE — Tecmo-style
  // ══════════════════════════════════════════════
  updateHumanOffense(dt) {
    const { mx, my } = this._readMoveInput();
    const isPassPlay = this.currentPlay && this.currentPlay.type === 'pass';

    // ── PASS PLAY: control QB until throw, then control receiver ──
    if (isPassPlay && !this.passThrown) {
      // QB is controlled
      this.qb.setControlled(true);
      this._applyMove(this.qb, mx, my);

      // J / PASS button = cycle receiver target
      if (this._passJustPressed()) {
        this.selectedReceiverIdx = (this.selectedReceiverIdx + 1) % Math.max(1, this.receivers.length);
      }

      // SPACE / ACT button = throw to highlighted receiver
      if (this._actionJustPressed()) {
        this.throwPass();
      }

      // Draw the receiver target indicator
      this._drawReceiverIndicator();
      return;
    }

    // ── After catch on pass play: control the receiver who caught it ──
    if (isPassPlay && this.passThrown && this.ballCarrier && this.ballCarrier !== this.qb) {
      this.qb.setControlled(false);
      this.ballCarrier.setControlled(true);
      this._applyMove(this.ballCarrier, mx, my);
      if (this._recvIndicator) this._recvIndicator.clear();
      return;
    }

    // ── RUN PLAY: control the ball carrier ──
    if (this.ballCarrier) {
      this.ballCarrier.setControlled(true);
      if (mx !== 0 || my !== 0) {
        this._applyMove(this.ballCarrier, mx, my);
      } else {
        // If no input, auto-run the designed play route
        this.ballCarrier.followRoute();
      }
    }

    if (this._recvIndicator) this._recvIndicator.clear();
  }

  // ══════════════════════════════════════════════
  //  HUMAN DEFENSE — Tecmo-style
  // ══════════════════════════════════════════════
  updateHumanDefense(dt) {
    const controlled = this.controlledDefender;
    if (!controlled) { this.selectNearestDefender(); return; }

    const { mx, my } = this._readMoveInput();

    // Move the controlled defender
    this._applyMove(controlled, mx, my);

    // J / PASS button = switch to defender nearest to the ball carrier
    if (this._passJustPressed()) {
      this.switchDefender();
    }

    // SPACE / ACT button = dive tackle (burst toward ball carrier)
    if (this._actionJustPressed()) {
      if (this.ballCarrier) {
        // Lunge toward the ball carrier
        const dx = this.ballCarrier.sprite.x - controlled.sprite.x;
        const dy = this.ballCarrier.sprite.y - controlled.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 120) {
          const burstSpd = attrToSpeed(controlled.data.spd) * 1.8;
          controlled.sprite.body.setVelocity((dx / dist) * burstSpd, (dy / dist) * burstSpd);
          controlled.playTackleAnim();
        }
      }
    }

    // AI handles all other (non-controlled) defenders
    const otherDefs = this.defensePlayers.filter(p => !p.controlled);
    this.ai.updateDefenders(otherDefs, this.ballCarrier, this.ball, dt);
  }

  updateAIOffense(dt) {
    // AI controls the ball carrier and QB
    if (this.ballCarrier && this.currentPlay) {
      if (this.currentPlay.type === 'run') {
        this.ai.moveCarrier(this.ballCarrier, this.defensePlayers, this.match.offenseGoingRight, dt);
      } else if (this.currentPlay.type === 'pass' && !this.passThrown) {
        // QB AI: look for open receiver, throw after delay
        this.qbTimer = (this.qbTimer || 0) + dt;
        if (this.qbTimer > 1.2) {
          const target = this.ai.pickPassTarget(this.receivers, this.defensePlayers, this.qb);
          if (target) {
            this.passTarget = target;
            this.selectedReceiverIdx = this.receivers.indexOf(target);
            this.throwPass();
          }
          this.qbTimer = 0;
        }
        // QB drops back
        const goingRight = this.match.offenseGoingRight;
        const dropBackX = this.qb.homeX + (goingRight ? -30 : 30);
        this.qb.moveToward(dropBackX, this.qb.homeY, 0.6);
      } else if (this.passThrown && this.ballCarrier) {
        // After catch, AI runs with ball
        this.ai.moveCarrier(this.ballCarrier, this.defensePlayers, this.match.offenseGoingRight, dt);
      }
    }
  }

  updateFGAim(dt) {
    if (this.fgSwinging) {
      this.fgAngle += dt * 3;
      const aim = Math.sin(this.fgAngle);
      this.hud.showMessage('AIM: ' + (aim > 0 ? 'RIGHT' : 'LEFT') + ' | Press SPACE', 0.05);

      if (this._actionJustPressed()) {
        this.fgSwinging = false;
        this.kickCharging = true;
        this.kickPower = 0;
        this.fgAimValue = aim;
      }
    } else if (this.kickCharging) {
      this.kickPower += dt * 1.5;
      if (this.kickPower > 1) this.kickPower = 1;
      this.hud.showMessage('POWER: ' + Math.round(this.kickPower * 100) + '% | Release SPACE', 0.05);

      if (!this._actionHeld()) {
        // Evaluate FG
        const dist = 100 - this.match.ballYardLine + 17;
        const aimOk = Math.abs(this.fgAimValue) < 0.4;
        const powerOk = this.kickPower > 0.5 && this.kickPower < 0.95;
        const distOk = dist <= 55;
        const made = aimOk && powerOk && distOk;

        if (made) {
          this.match.scoreFieldGoal();
          this.hud.showMessage('FIELD GOAL IS GOOD! ' + dist + ' yards!', 2.5);
        } else {
          this.hud.showMessage('FIELD GOAL MISSED! ' + dist + ' yards', 2);
          this.match.changePossession();
        }
        this.field.clearOverlays();
        this.state = State.PLAY_DEAD;
        this.stateTimer = 2.5;
        this.afterFGOrPunt = true;
        this.kickCharging = false;
      }
    }
  }

  updatePuntInput(dt) {
    if (this.kickCharging) {
      this.kickPower += dt * 1.5;
      if (this.kickPower > 1) this.kickPower = 1;
      this.hud.showMessage('PUNT POWER: ' + Math.round(this.kickPower * 100) + '%', 0.05);

      if (!this._actionHeld()) {
        this.executePunt();
      }
    } else if (this._actionJustPressed()) {
      this.kickCharging = true;
      this.kickPower = 0;
    }
  }

  updateCamera(dt) {
    // Static camera — field is sized to fit the viewport exactly, so
    // the entire field (both sidelines and both end zones) is always visible.
    // No scrolling or zoom needed.
  }

  shutdown() {
    this.homePlayers.forEach(p => p.destroy());
    this.awayPlayers.forEach(p => p.destroy());
  }
}
