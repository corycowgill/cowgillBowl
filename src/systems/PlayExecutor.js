import {
  YARD_PX, FIELD_LEFT, FIELD_TOP, FIELD_WIDTH_PX, END_ZONE_PX,
  PASS_SPEED, PASS_WOBBLE, CATCH_RADIUS, INT_BASE_CHANCE,
  yardToPx, fieldCenterY,
} from '../config.js';
import { OFFENSIVE_FORMATIONS, DEFENSIVE_FORMATIONS, getRouteWaypoints } from '../data/plays.js';

export default class PlayExecutor {
  constructor(scene) {
    this.scene = scene;
  }

  // Place offensive players in formation
  alignOffense(players, play, losYard, goingRight) {
    const formation = OFFENSIVE_FORMATIONS[play.formation] || OFFENSIVE_FORMATIONS.IForm;
    const losX = yardToPx(losYard, goingRight);
    const centerY = fieldCenterY();
    const dir = goingRight ? 1 : -1;

    const assignments = {};
    players.forEach((p, i) => {
      if (i < formation.length) {
        const [role, relX, relY] = formation[i];
        const x = losX + relX * YARD_PX * dir;
        const y = centerY + relY * YARD_PX;
        p.setPosition(x, y);
        p.assignedRole = role;
        p.goingRight = goingRight;
        p.stop();
        assignments[role] = p;
      }
    });
    return assignments;
  }

  // Place defensive players
  alignDefense(players, defPlay, losYard, goingRight) {
    const formation = DEFENSIVE_FORMATIONS[defPlay.formation] || DEFENSIVE_FORMATIONS['4-3'];
    const losX = yardToPx(losYard, goingRight);
    const centerY = fieldCenterY();
    const dir = goingRight ? 1 : -1;

    const assignments = {};
    players.forEach((p, i) => {
      if (i < formation.length) {
        const [role, relX, relY] = formation[i];
        const x = losX + relX * YARD_PX * dir;
        const y = centerY + relY * YARD_PX;
        p.setPosition(x, y);
        p.assignedRole = role;
        p.goingRight = !goingRight; // defense faces opposite
        p.stop();
        assignments[role] = p;
      }
    });
    return assignments;
  }

  // Build routes for receivers after snap
  buildReceiverRoutes(assignments, play, losYard, goingRight) {
    const receivers = [];
    const dir = goingRight ? 1 : -1;
    for (const [role, routeKey] of Object.entries(play.routes || {})) {
      const player = assignments[role];
      if (!player) continue;
      const waypoints = getRouteWaypoints(routeKey);
      const worldWaypoints = waypoints.map(([dx, dy]) => ({
        x: player.homeX + dx * YARD_PX * dir,
        y: player.homeY + dy * YARD_PX,
      }));
      player.setRoute(worldWaypoints);
      receivers.push(player);
    }
    return receivers;
  }

  // Build run path for ball carrier
  buildRunPath(carrier, play, goingRight) {
    if (!play.runPath || play.runPath.length === 0) return;
    const dir = goingRight ? 1 : -1;
    const waypoints = play.runPath.map(([dx, dy]) => ({
      x: carrier.homeX + dx * YARD_PX * dir,
      y: carrier.homeY + dy * YARD_PX,
    }));
    carrier.setRoute(waypoints);
  }

  // Set up blocking assignments. All OL are blockers; FB/TE/HB join on
  // run plays if they're not the ball carrier.
  setupBlocking(offAssignments, defAssignments, play) {
    const linemen = ['C', 'LG', 'RG', 'LT', 'RT'];
    const helpers = ['FB', 'TE', 'TE1', 'TE2'];
    const isRun = play && play.type === 'run';
    const carrierRole = play && play.carrier;

    for (const role of linemen) {
      const blocker = offAssignments[role];
      if (!blocker) continue;
      blocker.isBlocking = true;
      blocker.isBlocker = true;
      blocker.engaged = null;
      blocker.engageTime = 0;
    }

    if (isRun) {
      for (const role of helpers) {
        const blocker = offAssignments[role];
        if (!blocker || role === carrierRole) continue;
        blocker.isBlocking = true;
        blocker.isBlocker = true;
        blocker.engaged = null;
        blocker.engageTime = 0;
      }
    }
  }

  // Check if a pass is catchable
  evaluateCatch(receiver, ball, defenders) {
    const dist = receiver.distToXY(ball.sprite.x, ball.sprite.y);
    if (dist > CATCH_RADIUS) return { caught: false, intercepted: false };

    // Check for nearby defenders
    let contested = false;
    let closestDef = null;
    let closestDefDist = Infinity;
    for (const def of defenders) {
      const dd = def.distToXY(ball.sprite.x, ball.sprite.y);
      if (dd < CATCH_RADIUS * 1.5) {
        contested = true;
        if (dd < closestDefDist) { closestDefDist = dd; closestDef = def; }
      }
    }

    if (!contested) {
      // Uncontested catch
      const catchChance = 0.7 + (receiver.data.cat / 99) * 0.28;
      return { caught: Math.random() < catchChance, intercepted: false };
    }

    // Contested catch
    const offSkill = receiver.data.cat;
    const defSkill = closestDef ? closestDef.data.cov : 50;
    const catchChance = 0.3 + ((offSkill - defSkill) / 200);
    const intChance = INT_BASE_CHANCE + ((defSkill - offSkill) / 300);

    const roll = Math.random();
    if (roll < intChance) {
      return { caught: false, intercepted: true, interceptor: closestDef };
    }
    if (roll < intChance + catchChance) {
      return { caught: true, intercepted: false };
    }
    return { caught: false, intercepted: false }; // incomplete
  }

  // Check if ball is out of bounds
  isOutOfBounds(x, y) {
    return y < FIELD_TOP || y > FIELD_TOP + FIELD_WIDTH_PX;
  }

  // Check if in end zone
  isInEndZone(x, goingRight) {
    if (goingRight) {
      return x >= FIELD_LEFT + END_ZONE_PX + YARD_PX * 100;
    }
    return x <= FIELD_LEFT + END_ZONE_PX;
  }

  // Convert pixel X position to yard gained from LOS
  pxToYardsFromLOS(px, losYard, goingRight) {
    const losPx = yardToPx(losYard, goingRight);
    const diffPx = goingRight ? (px - losPx) : (losPx - px);
    return diffPx / YARD_PX;
  }
}
