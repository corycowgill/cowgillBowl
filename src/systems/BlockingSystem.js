// ── Blocking Engagement System ──
// Resolves lineman blocks as physical engagements. When a blocker gets
// within range of an unengaged defender, both players "lock up" — their
// velocities are dramatically reduced, the blocker slowly drives the
// defender back, and each frame there's a small roll for the defender
// to shed the block based on pass rush vs blocker strength.

const ENGAGE_RADIUS = 22;      // px — how close blocker must be to engage
const HOLD_DIST = 14;          // px — target separation while locked up
const BASE_SHED_PER_SEC = 0.35; // rolls per second when evenly matched
const BLOCKER_DRIVE_PX_PER_SEC = 6; // how fast the blocker drives the defender back
const MAX_ENGAGE_TIME = 5;     // seconds — blockers tire out eventually

export default class BlockingSystem {
  update(offPlayers, defPlayers, dt) {
    // ── 1. Maintain existing engagements ──
    for (const def of defPlayers) {
      const blocker = def.engaged;
      if (!blocker) continue;
      // Validate engagement is still mutual and close enough
      if (blocker.engaged !== def) { def.engaged = null; continue; }
      const dist = def.distTo(blocker);
      if (dist > ENGAGE_RADIUS * 2.2) {
        def.engaged = null;
        blocker.engaged = null;
        continue;
      }

      // Tick engagement time
      def.engageTime = (def.engageTime || 0) + dt;

      // Roll to shed the block
      const blockPower = blocker.data.str;
      const rushPower = (def.data.prs + def.data.str * 0.6) / 1.3;
      const diff = rushPower - blockPower;
      let shedChance = BASE_SHED_PER_SEC + diff / 150;
      // Fatigue: blockers can't hold forever
      if (def.engageTime > MAX_ENGAGE_TIME) shedChance += 0.5;
      shedChance = Math.max(0.05, shedChance);

      if (Math.random() < shedChance * dt) {
        def.engaged = null;
        blocker.engaged = null;
        def.engageTime = 0;
        continue;
      }

      // Engaged: clamp positions to HOLD_DIST apart along the LOS axis
      const dir = blocker.goingRight ? 1 : -1;
      const targetX = blocker.sprite.x + dir * HOLD_DIST;
      const targetY = blocker.sprite.y;

      // Drive the defender toward the hold position (+ slight drive back)
      const dx = targetX - def.sprite.x + dir * BLOCKER_DRIVE_PX_PER_SEC * dt;
      const dy = targetY - def.sprite.y;
      def.sprite.x += dx * 0.35;
      def.sprite.y += dy * 0.35;

      // Heavily dampen both players' velocities
      def.sprite.body.setVelocity(
        def.sprite.body.velocity.x * 0.15,
        def.sprite.body.velocity.y * 0.15
      );
      blocker.sprite.body.setVelocity(
        blocker.sprite.body.velocity.x * 0.25,
        blocker.sprite.body.velocity.y * 0.25
      );
    }

    // ── 2. Look for new engagements ──
    const blockers = offPlayers.filter(p => p.isBlocker && !p.engaged);
    for (const blocker of blockers) {
      let best = null;
      let bestDist = Infinity;
      for (const def of defPlayers) {
        if (def.engaged) continue;
        const d = blocker.distTo(def);
        if (d < ENGAGE_RADIUS && d < bestDist) {
          bestDist = d;
          best = def;
        }
      }
      if (best) {
        blocker.engaged = best;
        best.engaged = blocker;
        best.engageTime = 0;
      }
    }
  }

  // Call at the end of every play to clear all engagements
  reset(allPlayers) {
    allPlayers.forEach(p => {
      p.engaged = null;
      p.engageTime = 0;
    });
  }
}
