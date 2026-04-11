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
import BlockingSystem from '../systems/BlockingSystem.js';
import HUD from '../ui/HUD.js';
import PlayCallUI from '../ui/PlayCallUI.js';
import MobileControls from '../ui/MobileControls.js';
import GamepadManager from '../ui/GamepadManager.js';
import SoundManager from '../ui/SoundManager.js';
import ParticleEffects from '../ui/ParticleEffects.js';

const State = {
  COIN_TOSS: 'coin_toss',
  KICKOFF_SETUP: 'kickoff_setup',
  KICKOFF_LIVE: 'kickoff_live',
  KICKOFF_RETURN: 'kickoff_return',
  PLAY_CALL: 'play_call',
  PRE_SNAP: 'pre_snap',
  LIVE_PLAY: 'live_play',
  PLAY_DEAD: 'play_dead',
  PAT_CALL: 'pat_call',
  PAT_LIVE: 'pat_live',
  FG_AIM: 'fg_aim',
  FG_LIVE: 'fg_live',
  PUNT_KICK: 'punt_kick',
  PUNT_RETURN: 'punt_return',
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
    this.blocking = new BlockingSystem();

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
    this.field.setTeams(this.homeTeam, this.awayTeam, this.match.homeGoingRight);

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
    this.sound_mgr = new SoundManager();
    this.particles = new ParticleEffects(this);

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
    // Home team receives first. Set possession to home so that after the
    // kickoff return, home is on offense. In startKickoff(), defensePlayers
    // (away) kick, offensePlayers (home) receive — correct.
    this.match.possession = 'home';
    this.hud.showMessage('COIN TOSS — ' + this.homeTeam.city + ' receives!', 1.5);
  }

  startKickoff() {
    this.state = State.KICKOFF_SETUP;
    this.stateTimer = 0.5;
    this.match.phase = 'kickoff';

    const goingRight = this.match.offenseGoingRight;
    const centerY = fieldCenterY();

    // Kicking team (defense of receiving team) lines up at 35
    const kickingPlayers = this.defensePlayers;
    const receivingPlayers = this.offensePlayers;

    const kickX = yardToPx(35, !goingRight);
    kickingPlayers.forEach((p, i) => {
      p.setPosition(kickX + (i % 2 === 0 ? -5 : 5), centerY + (i - 5) * 22);
      p.goingRight = !goingRight;
      p.stop();
      p.resetAnim();
    });

    // Receiving team lines up deep — pick the fastest player as the returner
    const recvX = yardToPx(8, goingRight);
    let bestSpeed = 0;
    this.kickReturner = null;
    receivingPlayers.forEach((p, i) => {
      p.setPosition(recvX + (i % 3) * 12, centerY + (i - 5) * 22);
      p.goingRight = goingRight;
      p.stop();
      p.resetAnim();
      if (p.data.spd > bestSpeed) { bestSpeed = p.data.spd; this.kickReturner = p; }
    });

    this.ball.placeAt(kickX, centerY);
    this.kickPower = 0;
    this.kickCharging = false;
    this._kickMeterGfx = this._kickMeterGfx || this.add.graphics().setScrollFactor(0).setDepth(200);
    this._kickMeterGfx.clear();

    this.hud.showMessage('KICKOFF — Hold SPACE to charge, release to kick!', 1.5);
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
    this.field.drawBallSpot(losX);
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

    // 4th down decision for human offense
    if (this.humanOnOffense && this.match.down === 4) {
      this._show4thDownMenu();
      return;
    }

    if (this.humanOnOffense) {
      const humanTeam = this.humanSide === 'home' ? this.homeTeam : this.awayTeam;
      this.playCallUI.setTeamColor(humanTeam.colors.primary);
      this.playCallUI.show(this.offensePlaybook.offense, false, (play) => {
        this.currentPlay = play;
        this.currentDefPlay = this.ai.pickDefensivePlay(this.defensePlaybook, this.match);
        this.startPreSnap();
      });
    } else {
      const humanTeam = this.humanSide === 'home' ? this.homeTeam : this.awayTeam;
      this.playCallUI.setTeamColor(humanTeam.colors.primary);
      this.currentPlay = this.ai.pickOffensivePlay(this.offensePlaybook, this.match);
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
    this.sound_mgr.snap();
    this.passThrown = false;
    this.selectedReceiverIdx = 0;
    this.passTarget = null;

    // Reset all player animations and blocking state for new play
    this.homePlayers.forEach(p => p.resetAnim());
    this.awayPlayers.forEach(p => p.resetAnim());
    this.blocking.reset([...this.homePlayers, ...this.awayPlayers]);

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
    this.state = State.PUNT_KICK;
    this.kickPower = 0;
    this.kickCharging = false;
    this._kickMeterGfx = this._kickMeterGfx || this.add.graphics().setScrollFactor(0).setDepth(200);
    this._kickMeterGfx.clear();

    if (!this.humanOnOffense) {
      // AI punts with decent power, then return phase
      this.kickPower = 0.6 + Math.random() * 0.25;
      this.executePunt();
    } else {
      this.hud.showMessage('PUNT — Hold SPACE to charge, release to kick!', 1.5);
    }
  }

  updatePuntKick(dt) {
    if (!this.kickCharging && this._actionJustPressed()) {
      this.kickCharging = true;
      this.kickPower = 0;
    }
    if (this.kickCharging) {
      this.kickPower += dt * 1.2;
      if (this.kickPower >= 1) this.kickPower = 1;
      this._drawKickMeter(this.kickPower, 'PUNT');
      if (!this._actionHeld()) {
        this.executePunt();
      }
    }
  }

  executePunt() {
    if (this._kickMeterGfx) this._kickMeterGfx.clear();
    this.kickCharging = false;
    this.sound_mgr.kick();

    const puntYards = 20 + Math.floor(this.kickPower * 45);
    const oldYard = this.match.ballYardLine;

    // Switch possession for the return
    this.match.changePossession();
    const newYard = Math.max(3, Math.min(97, 100 - oldYard - puntYards));
    this.match.ballYardLine = newYard;

    const goingRight = this.match.offenseGoingRight;
    const landX = yardToPx(newYard, goingRight);

    // Pick a returner (fastest offensive player)
    let bestSpeed = 0;
    this.kickReturner = null;
    this.offensePlayers.forEach(p => {
      if (p.data.spd > bestSpeed) { bestSpeed = p.data.spd; this.kickReturner = p; }
    });

    if (this.kickReturner) {
      this.kickReturner.setPosition(landX, fieldCenterY());
      this.ball.placeAt(landX, fieldCenterY());
      this.ball.attachTo(this.kickReturner);
      this.ballCarrier = this.kickReturner;

      const humanReceiving = this.match.possession === this.humanSide;
      if (humanReceiving) {
        this.kickReturner.setControlled(true);
      }
    }

    this.hud.showMessage('PUNT ' + puntYards + ' yds — Return it!', 1.5);
    this.state = State.PUNT_RETURN;
    this.match.isClockRunning = true;
    this.match.down = 1;
    this.match.yardsToGo = 10;
    this.field.clearOverlays();
  }

  updatePuntReturn(dt) {
    // Reuse the same logic as kickoff return
    this.updateKickoffReturn(dt);
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
      this.state = State.PLAY_DEAD;
      this.stateTimer = 2.5;
      if (made) {
        this.match.scoreFieldGoal();
        this.hud.showMessage('FIELD GOAL IS GOOD! ' + dist + ' yards', 2);
        this.afterTDKickoff = true; // scoring team kicks off
      } else {
        // NFL: defense takes over at the spot of the kick
        this.match.changePossession();
        this.hud.showMessage('FIELD GOAL MISSED! ' + dist + ' yards', 2);
        this.afterMissedFG = true;
      }
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

    // Stop all players, clear blocks, trigger down animation
    this.homePlayers.forEach(p => { p.stop(); p.setControlled(false); });
    this.awayPlayers.forEach(p => { p.stop(); p.setControlled(false); });
    this.blocking.reset([...this.homePlayers, ...this.awayPlayers]);
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
      this._flashScreen(0xffff00, 400);
      this._shakeScreen(0.008, 300);
      this.sound_mgr.touchdown();
      this.stateTimer = 3;
      this.afterTD = true;
      if (this.ballCarrier) {
        this.ballCarrier.playCelebrateAnim();
        this.particles.tdConfetti(this.ballCarrier.sprite.x, this.ballCarrier.sprite.y);
      }
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
      this.sound_mgr.firstDown();
      if (this.ballCarrier) {
        this.particles.firstDownFlash(this.ballCarrier.sprite.x, this.ballCarrier.sprite.y);
      }
      message += ' — FIRST DOWN!';
    }

    const yardText = yardsGained >= 0 ? '+' + Math.round(yardsGained) : '' + Math.round(yardsGained);
    this.hud.showMessage((message || 'Gain of ' + yardText + ' yards') + ' | ' + this.match.getDownText(), 1.8);
    this.field.clearOverlays();
  }

  handleInterception(interceptor) {
    this.hud.showMessage('INTERCEPTED by #' + interceptor.data.num + '!', 2);
    this._flashScreen(0xff0000, 300);
    this._shakeScreen(0.006, 200);
    this.sound_mgr.turnover();
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

    // ESC toggles stats overlay
    if (Phaser.Input.Keyboard.JustDown(this.cursors.esc) || this.gamepad.startJustPressed) {
      this._toggleStats();
      if (this._statsUI) return; // paused while stats are showing
    }
    if (this._statsUI) return; // block all updates while stats overlay is open

    // Update all player visuals
    this.homePlayers.forEach(p => p.update(dt));
    this.awayPlayers.forEach(p => p.update(dt));
    this.ball.update(dt);
    this.particles.update(dt);

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

      case State.KICKOFF_RETURN:
        this.updateKickoffReturn(dt);
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
            // Scoring team kicks off: possession is still the scoring team,
            // so they kick and the OTHER team receives.
            const receiver = this.match.possession === 'home' ? 'away' : 'home';
            this.match.setupKickoff(receiver);
            this.startKickoff();
          } else if (this.afterSafety) {
            this.afterSafety = false;
            // Team that gave up the safety (on offense when pushed back)
            // must kick from their own 20. Possession is still theirs.
            this.match.setupAfterSafety();
            this.startKickoff();
          } else if (this.afterPuntNoReturn) {
            // Punt already handled possession change during executePunt;
            // just go to play call for the receiving team.
            this.afterPuntNoReturn = false;
            this.startPlayCall();
          } else if (this.afterMissedFG) {
            // NFL rule: defense takes over at the spot of the kick
            this.afterMissedFG = false;
            this.startPlayCall();
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

      case State.PUNT_KICK:
        this.updatePuntKick(dt);
        break;

      case State.PUNT_RETURN:
        this.updatePuntReturn(dt);
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

  _drawKickMeter(power, label) {
    const g = this._kickMeterGfx;
    g.clear();
    const cx = 480, cy = 500, barW = 200, barH = 14;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(cx - barW / 2 - 4, cy - barH / 2 - 4, barW + 8, barH + 8);
    g.fillStyle(0x444444, 1);
    g.fillRect(cx - barW / 2, cy - barH / 2, barW, barH);
    const col = power < 0.5 ? 0x00cc00 : power < 0.8 ? 0xcccc00 : 0xff3300;
    g.fillStyle(col, 1);
    g.fillRect(cx - barW / 2, cy - barH / 2, barW * power, barH);
    // sweet-spot marker at 70-85%
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(cx - barW / 2 + barW * 0.7, cy - barH / 2, barW * 0.15, barH);
  }

  updateKickoff(dt) {
    if (!this.kickCharging && this._actionJustPressed()) {
      this.kickCharging = true;
      this.kickPower = 0;
    }

    if (this.kickCharging) {
      this.kickPower += dt * 1.0;
      if (this.kickPower >= 1) this.kickPower = 1;
      this._drawKickMeter(this.kickPower, 'KICK');

      if (!this._actionHeld()) {
        this.executeKickoff();
      }
    }
  }

  executeKickoff() {
    this._kickMeterGfx.clear();
    this.kickCharging = false;
    this.sound_mgr.kick();
    this.particles.kickPuff(this.ball.sprite.x, this.ball.sprite.y);

    const goingRight = this.match.offenseGoingRight;
    const kickYards = 25 + Math.floor(this.kickPower * 50);

    // NFL touchback: if the kick reaches the end zone (100+ yards from
    // kicking team's 35 = 65+ kick yards), ball placed at the 25-yard line
    if (kickYards >= 65) {
      this.match.ballYardLine = 25;
      this.match.down = 1;
      this.match.yardsToGo = 10;
      this.hud.showMessage('TOUCHBACK — Ball at the 25', 1.8);
      this.homePlayers.forEach(p => p.stop());
      this.awayPlayers.forEach(p => p.stop());
      this.state = State.PLAY_DEAD;
      this.stateTimer = 1.8;
      return;
    }

    // Ball lands at this yard (from receiving team's perspective)
    const landYard = Math.max(2, Math.min(95, kickYards));
    const recvYard = 100 - landYard;
    const landX = yardToPx(recvYard, goingRight);
    this.ball.placeAt(landX, fieldCenterY());

    if (this.kickReturner) {
      this.kickReturner.setPosition(landX, fieldCenterY());
      this.ball.attachTo(this.kickReturner);
      this.ballCarrier = this.kickReturner;
      const humanReceiving = this.match.possession === this.humanSide;
      if (humanReceiving) {
        this.kickReturner.setControlled(true);
      }
    }

    this.match.ballYardLine = recvYard;
    this.hud.showMessage('KICK RETURN! Run it back!', 1.5);
    this.state = State.KICKOFF_RETURN;
    this.match.isClockRunning = true;
  }

  updateKickoffReturn(dt) {
    if (!this.ballCarrier) {
      this.endKickReturn();
      return;
    }

    const goingRight = this.match.offenseGoingRight;
    const humanReceiving = this.match.possession === this.humanSide;

    // Human or AI controls the returner
    if (humanReceiving) {
      const { mx, my } = this._readMoveInput();
      this._applyMove(this.ballCarrier, mx, my);
    } else {
      this.ai.moveCarrier(this.ballCarrier, this.defensePlayers, goingRight, dt);
    }

    // AI defenders pursue
    this.ai.updateDefenders(this.defensePlayers, this.ballCarrier, this.ball, dt);

    // Tackle check
    const freeDefenders = this.defensePlayers.filter(d => !d.engaged);
    const results = this.tackleResolver.checkProximity(this.ballCarrier, freeDefenders);
    for (const r of results) {
      if (r.result === 'tackle' || r.result === 'stumble' || r.result === 'fumble') {
        this.endKickReturn();
        return;
      }
    }

    // Touchdown check
    if (this.executor.isInEndZone(this.ballCarrier.sprite.x, goingRight)) {
      this.match.scoreTouchdown();
      this.hud.showMessage('KICK RETURN TOUCHDOWN!', 2.5);
      this._flashScreen(0xffff00, 400);
      this._shakeScreen(0.008, 300);
      this.sound_mgr.touchdown();
      this.ballCarrier.playCelebrateAnim();
      this.particles.tdConfetti(this.ballCarrier.sprite.x, this.ballCarrier.sprite.y);
      this.homePlayers.forEach(p => p.stop());
      this.awayPlayers.forEach(p => p.stop());
      this.state = State.PLAY_DEAD;
      this.stateTimer = 3;
      this.afterTD = true;
      return;
    }

    // Out of bounds
    if (this.executor.isOutOfBounds(this.ballCarrier.sprite.x, this.ballCarrier.sprite.y)) {
      this.endKickReturn();
      return;
    }
  }

  endKickReturn() {
    const goingRight = this.match.offenseGoingRight;
    if (this.ballCarrier) {
      const yardsGained = this.executor.pxToYardsFromLOS(
        this.ballCarrier.sprite.x, this.match.ballYardLine, goingRight
      );
      this.match.ballYardLine = Math.max(1, Math.min(99, this.match.ballYardLine + yardsGained));
    }
    this.match.down = 1;
    this.match.yardsToGo = 10;
    this.homePlayers.forEach(p => { p.stop(); p.setControlled(false); });
    this.awayPlayers.forEach(p => { p.stop(); p.setControlled(false); });
    this.blocking.reset([...this.homePlayers, ...this.awayPlayers]);
    this.field.clearOverlays();
    this.hud.showMessage('Tackled at the ' + this.match.getFieldPositionText(), 1.5);
    this.state = State.PLAY_DEAD;
    this.stateTimer = 1.8;
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
    this.ai.updateOffense(this.offensePlayers, this.defensePlayers, this.currentPlay, this.ball, dt);

    // Resolve blocking engagements (locks up blockers and defenders)
    this.blocking.update(this.offensePlayers, this.defensePlayers, dt);

    // Check tackles on ball carrier — engaged defenders can't tackle
    if (this.ballCarrier) {
      const freeDefenders = this.defensePlayers.filter(d => !d.engaged);
      const results = this.tackleResolver.checkProximity(this.ballCarrier, freeDefenders);
      for (const r of results) {
        if (r.result === 'fumble') {
          this.ball.makeFumble();
          this.handleFumble(this.ballCarrier);
          return;
        }
        if (r.result === 'tackle' || r.result === 'stumble') {
          r.defender.playTackleAnim();
          this._shakeScreen(0.004, 120);
          this.sound_mgr.hit(0.6);
          this.sound_mgr.whistle();
          this.particles.tackleDust(this.ballCarrier.sprite.x, this.ballCarrier.sprite.y);
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

    // Check pass completion — draw ball trail while in air
    if (this.passThrown && this.ball.inAir) {
      if (!this._ballTrail) {
        this._ballTrail = this.add.graphics().setDepth(4);
      }
      this._ballTrail.clear();
      this._ballTrail.lineStyle(1.5, 0xffffff, 0.3);
      if (this.passTarget) {
        this._ballTrail.lineBetween(
          this.ball.sprite.x, this.ball.sprite.y,
          this.passTarget.sprite.x, this.passTarget.sprite.y
        );
      }
    } else if (this.passThrown && !this.ball.inAir && !this.ball.held) {
      if (this._ballTrail) this._ballTrail.clear();
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
        // Incomplete — ball drops to ground
        this.ball.makeFumble(); // reuse loose-ball bounce for visual
        this.ball.airVx = 0;
        this.ball.airVy = 15; // gentle drop
        this.hud.showMessage('INCOMPLETE!', 1.5);
        this.sound_mgr.incomplete();
        this.sound_mgr.whistle();
        this.match.isClockRunning = false; // NFL: clock stops on incompletion
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
        this.blocking.reset([...this.homePlayers, ...this.awayPlayers]);
        return;
      }
    }

    // If QB hasn't thrown and is sacked
    if (!this.passThrown && this.currentPlay && this.currentPlay.type === 'pass' && this.ballCarrier === this.qb) {
      const freeRushers = this.defensePlayers.filter(d => !d.engaged);
      const results = this.tackleResolver.checkProximity(this.qb, freeRushers);
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
            this._shakeScreen(0.007, 200);
            this.sound_mgr.hit(0.9);
            this.sound_mgr.whistle();
            this.particles.hitSpark(this.qb.sprite.x, this.qb.sprite.y);
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
        this.ballCarrier.followRoute();
      }

      // JUKE MOVE: press J/B while running to do a quick lateral cut
      if (this._passJustPressed() && this.ballCarrier.currentSpeed > 10) {
        const bc = this.ballCarrier;
        const jukeDir = my > 0 ? 1 : my < 0 ? -1 : (Math.random() < 0.5 ? 1 : -1);
        const jukeSpd = attrToSpeed(bc.data.agi) * 1.5;
        bc.sprite.body.setVelocity(
          bc.sprite.body.velocity.x * 0.6,
          jukeDir * jukeSpd
        );
        this.sound_mgr.click();
        this._jukeCooldown = 0.4;
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
    this._kickMeterGfx = this._kickMeterGfx || this.add.graphics().setScrollFactor(0).setDepth(200);

    if (this.fgSwinging) {
      this.fgAngle += dt * 3;
      const aim = Math.sin(this.fgAngle);
      // Draw aim indicator — a moving arrow/bar
      this._kickMeterGfx.clear();
      const cx = 480, cy = 490, barW = 160, barH = 10;
      this._kickMeterGfx.fillStyle(0x000000, 0.6);
      this._kickMeterGfx.fillRect(cx - barW / 2 - 4, cy - barH / 2 - 4, barW + 8, barH + 8);
      this._kickMeterGfx.fillStyle(0x444444, 1);
      this._kickMeterGfx.fillRect(cx - barW / 2, cy - barH / 2, barW, barH);
      // Sweet spot in center
      this._kickMeterGfx.fillStyle(0xffffff, 0.3);
      this._kickMeterGfx.fillRect(cx - 20, cy - barH / 2, 40, barH);
      // Moving marker
      const markerX = cx + aim * (barW / 2);
      this._kickMeterGfx.fillStyle(0xff3300, 1);
      this._kickMeterGfx.fillRect(markerX - 3, cy - barH / 2 - 2, 6, barH + 4);
      this.hud.showMessage('AIM — Press SPACE to lock', 0.05);

      if (this._actionJustPressed()) {
        this.fgSwinging = false;
        this.kickCharging = true;
        this.kickPower = 0;
        this.fgAimValue = aim;
      }
    } else if (this.kickCharging) {
      this.kickPower += dt * 1.5;
      if (this.kickPower > 1) this.kickPower = 1;
      this._drawKickMeter(this.kickPower, 'FG POWER');

      if (!this._actionHeld()) {
        // Evaluate FG
        const dist = 100 - this.match.ballYardLine + 17;
        const aimOk = Math.abs(this.fgAimValue) < 0.4;
        const powerOk = this.kickPower > 0.5 && this.kickPower < 0.95;
        const distOk = dist <= 55;
        const made = aimOk && powerOk && distOk;

        this.field.clearOverlays();
        if (this._kickMeterGfx) this._kickMeterGfx.clear();
        this.state = State.PLAY_DEAD;
        this.stateTimer = 2.5;
        this.kickCharging = false;

        if (made) {
          this.match.scoreFieldGoal();
          this.hud.showMessage('FIELD GOAL IS GOOD! ' + dist + ' yards!', 2.5);
          this._flashScreen(0x00ff00, 300);
          this.sound_mgr.fieldGoalGood();
          this.afterTDKickoff = true;
        } else {
          // NFL: defense takes over at the spot of the kick
          this.match.changePossession();
          this.hud.showMessage('FIELD GOAL MISSED! ' + dist + ' yards', 2);
          this.afterMissedFG = true;
        }
      }
    }
  }

  // ── Pause / Stats Overlay ──
  _toggleStats() {
    if (this._statsUI) {
      this._statsUI.destroy();
      this._statsUI = null;
      return;
    }
    const w = 960, h = 540;
    this._statsUI = this.add.container(0, 0).setScrollFactor(0).setDepth(250);
    this._statsUI.add(this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.85));

    this._statsUI.add(this.add.text(w / 2, 30, 'GAME STATS', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5));

    const m = this.match;
    const col1 = w / 2 - 100, col2 = w / 2 + 100;
    const ss = { fontFamily: 'monospace', fontSize: '11px', color: '#cccccc' };
    const sh = { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold' };

    this._statsUI.add(this.add.text(col1, 55, this.homeTeam.abbr, sh).setOrigin(0.5, 0));
    this._statsUI.add(this.add.text(col2, 55, this.awayTeam.abbr, sh).setOrigin(0.5, 0));

    const stats = [
      ['Score', m.homeScore, m.awayScore],
      ['Pass Yards', m.stats.home.passYds, m.stats.away.passYds],
      ['Rush Yards', m.stats.home.rushYds, m.stats.away.rushYds],
      ['Pass TDs', m.stats.home.passTD, m.stats.away.passTD],
      ['Rush TDs', m.stats.home.rushTD, m.stats.away.rushTD],
      ['INTs Thrown', m.stats.home.ints, m.stats.away.ints],
      ['Fumbles', m.stats.home.fumbles, m.stats.away.fumbles],
      ['Sacks', m.stats.home.sacks, m.stats.away.sacks],
      ['1st Downs', m.stats.home.firstDowns, m.stats.away.firstDowns],
    ];
    stats.forEach(([label, hv, av], i) => {
      const y = 80 + i * 20;
      this._statsUI.add(this.add.text(col1, y, '' + hv, ss).setOrigin(0.5, 0));
      this._statsUI.add(this.add.text(w / 2, y, label, { ...ss, color: '#888888' }).setOrigin(0.5, 0));
      this._statsUI.add(this.add.text(col2, y, '' + av, ss).setOrigin(0.5, 0));
    });

    this._statsUI.add(this.add.text(w / 2, h - 30, 'Press ESC to close', {
      fontFamily: 'monospace', fontSize: '10px', color: '#555555',
    }).setOrigin(0.5));
  }

  // ── 4th Down Decision UI ──
  _show4thDownMenu() {
    const w = 960, h = 540;
    this._4thUI = this.add.container(0, 0).setScrollFactor(0).setDepth(160);

    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    this._4thUI.add(bg);

    const title = this.add.text(w / 2, h * 0.25, '4TH DOWN — WHAT DO YOU WANT TO DO?', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._4thUI.add(title);

    const dist = this.match.getDownText();
    const pos = this.match.getFieldPositionText();
    const info = this.add.text(w / 2, h * 0.32, `${dist}  |  ${pos}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5);
    this._4thUI.add(info);

    const fgDist = 100 - this.match.ballYardLine + 17;
    const canFG = fgDist <= 55;

    const options = [
      { label: 'GO FOR IT', color: 0x994400, action: () => this._4thDownChoice('go') },
      { label: 'PUNT', color: 0x224466, action: () => this._4thDownChoice('punt') },
    ];
    if (canFG) {
      options.push({
        label: `FIELD GOAL (${fgDist} yds)`,
        color: 0x226622,
        action: () => this._4thDownChoice('fg'),
      });
    }

    options.forEach((opt, i) => {
      const bx = w / 2 + (i - (options.length - 1) / 2) * 170;
      const by = h * 0.48;
      const btn = this.add.rectangle(bx, by, 155, 45, opt.color, 1)
        .setStrokeStyle(2, 0x888888)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(bx, by, opt.label, {
        fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      btn.on('pointerdown', opt.action);
      this._4thUI.add([btn, txt]);
    });

    // Keyboard shortcuts
    this._4thKeys = {
      go: this.input.keyboard.once('keydown-ONE', () => this._4thDownChoice('go')),
      punt: this.input.keyboard.once('keydown-TWO', () => this._4thDownChoice('punt')),
    };
    if (canFG) {
      this._4thKeys.fg = this.input.keyboard.once('keydown-THREE', () => this._4thDownChoice('fg'));
    }
  }

  _4thDownChoice(choice) {
    if (this._4thUI) { this._4thUI.destroy(); this._4thUI = null; }
    this.sound_mgr.click();
    if (choice === 'punt') {
      this.startPunt();
    } else if (choice === 'fg') {
      this.startFGAim();
    } else {
      // Go for it — show normal play call
      this.playCallUI.show(this.offensePlaybook.offense, false, (play) => {
        this.currentPlay = play;
        this.currentDefPlay = this.ai.pickDefensivePlay(this.defensePlaybook, this.match);
        this.startPreSnap();
      });
    }
  }

  // ── Screen effects ──
  _flashScreen(color, durationMs) {
    this.cameras.main.flash(durationMs || 200, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff, true);
  }

  _shakeScreen(intensity, durationMs) {
    this.cameras.main.shake(durationMs || 150, intensity || 0.005, true);
  }

  updateCamera(dt) {
    // Static camera — full field always visible.
  }

  shutdown() {
    this.homePlayers.forEach(p => p.destroy());
    this.awayPlayers.forEach(p => p.destroy());
  }
}
