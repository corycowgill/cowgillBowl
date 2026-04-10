import { AI_REACTION_MS, AI_PURSUIT_WEIGHT, TACKLE_RADIUS } from '../config.js';

export default class AIController {
  constructor() {
    this.reactionTimer = 0;
    this.lastDecision = 0;
  }

  // Pick an offensive play based on game situation
  pickOffensivePlay(playbook, match) {
    const { down, yardsToGo, ballYardLine, clockSeconds, quarter } = match;
    const plays = playbook.offense;
    const weights = plays.map(p => {
      let w = 1;
      // Favor runs on short yardage
      if (yardsToGo <= 3 && p.type === 'run') w += 3;
      // Favor passes on long yardage
      if (yardsToGo > 7 && p.type === 'pass') w += 2;
      // Red zone: more runs and short passes
      if (ballYardLine > 80 && p.type === 'run') w += 1;
      // Late game, losing: more passes
      if (quarter >= 3 && clockSeconds < 120) w += p.type === 'pass' ? 2 : 0;
      // 4th down: pick carefully
      if (down === 4 && yardsToGo > 3) w += p.type === 'pass' ? 3 : 0;
      // First down: balanced
      if (down === 1) w += 1;
      // Add some randomness
      w += Math.random() * 2;
      return w;
    });

    let bestIdx = 0;
    for (let i = 1; i < weights.length; i++) {
      if (weights[i] > weights[bestIdx]) bestIdx = i;
    }
    return plays[bestIdx];
  }

  // Pick a defensive play
  pickDefensivePlay(playbook, match) {
    const { down, yardsToGo } = match;
    const plays = playbook.defense;
    const weights = plays.map(p => {
      let w = 1;
      if (yardsToGo > 7 && p.style === 'zone') w += 2;
      if (yardsToGo <= 3 && p.blitz) w += 2;
      if (down >= 3 && yardsToGo > 5 && p.style === 'zone') w += 1;
      if (p.name === 'Prevent' && down < 4) w -= 2;
      w += Math.random() * 2;
      return w;
    });
    let bestIdx = 0;
    for (let i = 1; i < weights.length; i++) {
      if (weights[i] > weights[bestIdx]) bestIdx = i;
    }
    return plays[bestIdx];
  }

  // Should AI punt on 4th down?
  shouldPunt(match) {
    if (match.down !== 4) return false;
    if (match.ballYardLine > 60) return false;  // go for it in enemy territory
    if (match.yardsToGo <= 2 && match.ballYardLine > 40) return false;
    return true;
  }

  // Should AI try a field goal?
  shouldAttemptFG(match) {
    if (match.down !== 4) return false;
    return match.ballYardLine >= 55; // ~45 yard FG or shorter
  }

  // Update AI-controlled defenders during live play
  updateDefenders(defenders, ballCarrier, ball, dt) {
    this.reactionTimer += dt * 1000;
    if (this.reactionTimer < AI_REACTION_MS) return;
    this.reactionTimer = 0;

    if (!ballCarrier && !ball) return;

    const targetX = ballCarrier ? ballCarrier.sprite.x : ball.sprite.x;
    const targetY = ballCarrier ? ballCarrier.sprite.y : ball.sprite.y;

    for (const def of defenders) {
      if (def.controlled) continue; // human-controlled
      if (def.engaged) continue;    // locked up by a blocker — can't pursue

      // Pursuit logic: run toward where the carrier will be
      const predX = targetX + (ballCarrier ? ballCarrier.sprite.body.velocity.x * 0.3 : 0);
      const predY = targetY + (ballCarrier ? ballCarrier.sprite.body.velocity.y * 0.3 : 0);

      const pursueX = def.sprite.x + (predX - def.sprite.x) * AI_PURSUIT_WEIGHT;
      const pursueY = def.sprite.y + (predY - def.sprite.y) * AI_PURSUIT_WEIGHT;

      def.moveToward(pursueX + (predX - pursueX), pursueY + (predY - pursueY), 0.92);
    }
  }

  // Update AI-controlled offensive players (blocking, routes)
  updateOffense(offPlayers, defPlayers, play, ball, dt) {
    for (const p of offPlayers) {
      if (p.controlled) continue;

      // Blockers: if engaged, the BlockingSystem holds the position. If not,
      // hunt the nearest threatening defender to engage.
      if (p.isBlocker) {
        if (p.engaged) continue;
        let nearest = null;
        let nearDist = Infinity;
        for (const def of defPlayers) {
          if (def.engaged) continue;
          const d = p.distTo(def);
          if (d < nearDist) { nearDist = d; nearest = def; }
        }
        if (nearest) {
          p.moveToward(nearest.sprite.x, nearest.sprite.y, 0.85);
        }
        continue;
      }

      if (p.route) {
        p.followRoute();
      }
    }
  }

  // AI QB decisions during pass play
  pickPassTarget(receivers, defenders, qb) {
    if (receivers.length === 0) return null;

    let best = null;
    let bestScore = -Infinity;

    for (const rec of receivers) {
      let score = 0;
      // Distance from QB (prefer medium range)
      const distToQB = rec.distTo(qb);
      if (distToQB > 30 && distToQB < 300) score += 3;
      if (distToQB > 300) score += 1; // deep ball, more risky

      // Openness: how far from nearest defender
      let nearestDef = Infinity;
      for (const def of defenders) {
        const d = rec.distTo(def);
        if (d < nearestDef) nearestDef = d;
      }
      score += nearestDef * 0.05;

      // Receiver skill bonus
      score += rec.data.cat * 0.02;

      // Add randomness for variety
      score += Math.random() * 2;

      if (score > bestScore) { bestScore = score; best = rec; }
    }

    return best;
  }

  // AI ball carrier movement (runs)
  moveCarrier(carrier, defenders, goingRight, dt) {
    if (carrier.controlled) return;

    // Find the biggest gap
    const dir = goingRight ? 1 : -1;
    let bestY = carrier.sprite.y;
    let bestScore = -Infinity;

    // Check a few lanes
    for (let yOff = -80; yOff <= 80; yOff += 40) {
      const testY = carrier.sprite.y + yOff;
      let laneDanger = 0;
      for (const def of defenders) {
        const dx = Math.abs(def.sprite.x - carrier.sprite.x);
        const dy = Math.abs(def.sprite.y - testY);
        if (dx < 100 && dy < 40) laneDanger += (100 - dx) * 0.01;
      }
      const score = -laneDanger + Math.random() * 0.5;
      if (score > bestScore) { bestScore = score; bestY = testY; }
    }

    const targetX = carrier.sprite.x + dir * 80;
    carrier.moveToward(targetX, bestY);
  }
}
