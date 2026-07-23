// Domaine pur : prédiction de la probabilité de trouver une place.
// Heuristique v1 (heure + densité de signalements libres) — le port PredictionEngine
// permet de brancher le service ML Python sans toucher au métier (pattern Strategy).

function predict({ hour, freeCount = 0, totalCount = 0 }) {
  if (hour < 0 || hour > 23) throw new RangeError('hour must be 0-23');
  const freeRatio = totalCount > 0 ? freeCount / totalCount : 0.5;
  let p = 55 + freeRatio * 45;
  if (hour >= 9 && hour <= 11) p -= 12;      // pointe du matin
  if (hour >= 17 && hour <= 19) p -= 20;     // pointe du soir
  if (hour >= 21 || hour <= 6) p += 10;      // nuit
  const probability = Math.max(0, Math.min(100, Math.round(p))); // bornage strict (cf. anomalie B-04)
  const etaMinutes = Math.max(1, Math.round((100 - probability) / 9));
  return { probability, etaMinutes };
}

module.exports = { predict };
