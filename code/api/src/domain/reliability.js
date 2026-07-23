// Domaine pur : aucun framework, aucune I/O — testable en isolation (architecture hexagonale).
// Score de fiabilité d'un signalement : borné 0–100, renforcé par les confirmations,
// affaibli par les infirmations, décroissant avec le temps.

const CONFIRM_BONUS = 8;
const DENY_MALUS = 15;
const DECAY_PER_MIN = 1.2; // un signalement non confirmé perd de la valeur
const BASE = 70;

function computeReliability({ confirmations = 0, denials = 0, ageMinutes = 0 }) {
  const raw = BASE + confirmations * CONFIRM_BONUS - denials * DENY_MALUS - ageMinutes * DECAY_PER_MIN;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function isExpired({ confirmations = 0, ageMinutes = 0 }) {
  // Un signalement expire quand son score retombe à 0 sans soutien communautaire.
  return computeReliability({ confirmations, denials: 0, ageMinutes }) === 0 && confirmations === 0;
}

module.exports = { computeReliability, isExpired, BASE, CONFIRM_BONUS, DENY_MALUS, DECAY_PER_MIN };
