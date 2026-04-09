import { TACKLE_RADIUS, FUMBLE_BASE_CHANCE } from '../config.js';

// Resolves contact outcomes between ball carrier and defenders
export default class TackleResolver {
  resolve(carrier, defender) {
    const carrierMom = (carrier.data.spd + carrier.data.str) / 2;
    const defenderPow = (defender.data.tkl + defender.data.str) / 2;
    const breakChance = (carrierMom - defenderPow + 20) / 100;
    const roll = Math.random();

    if (roll < 0.02 + FUMBLE_BASE_CHANCE * (defenderPow / 80)) {
      return { result: 'fumble', breakTackle: false };
    }
    if (roll < breakChance * 0.5) {
      return { result: 'broken', breakTackle: true };
    }
    if (roll < breakChance * 0.7) {
      return { result: 'stumble', breakTackle: false };
    }
    return { result: 'tackle', breakTackle: false };
  }

  checkProximity(carrier, defenders) {
    const results = [];
    for (const def of defenders) {
      const dist = carrier.distTo(def);
      if (dist < TACKLE_RADIUS) {
        results.push({ defender: def, ...this.resolve(carrier, def) });
      }
    }
    return results;
  }
}
