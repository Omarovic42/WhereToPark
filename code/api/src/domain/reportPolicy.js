// Domaine pur : règles métier des signalements.
const TYPES = ['free', 'busy', 'leave', 'full', 'control', 'blue_zone'];
const MAX_REPORTS_PER_10MIN = 12; // anti-spam / anti-faux signalements (cf. RS-02)
const POINTS = { report: 10, confirm: 5 };

function validateReport({ type, lat, lng }) {
  const errors = [];
  if (!TYPES.includes(type)) errors.push(`type invalide (attendu : ${TYPES.join(', ')})`);
  if (typeof lat !== 'number' || lat < -90 || lat > 90) errors.push('lat invalide (-90..90)');
  if (typeof lng !== 'number' || lng < -180 || lng > 180) errors.push('lng invalide (-180..180)');
  return { valid: errors.length === 0, errors };
}

function canReport({ recentCount }) {
  return recentCount < MAX_REPORTS_PER_10MIN;
}

// geohash simplifié (précision ~1,2 km au niveau 6) pour les rooms Socket.IO (cf. anomalie B-01)
function zoneOf(lat, lng, precision = 6) {
  const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latR = [-90, 90], lngR = [-180, 180], bit = 0, ch = 0, even = true, hash = '';
  while (hash.length < precision) {
    if (even) {
      const mid = (lngR[0] + lngR[1]) / 2;
      if (lng >= mid) { ch = (ch << 1) + 1; lngR[0] = mid; } else { ch <<= 1; lngR[1] = mid; }
    } else {
      const mid = (latR[0] + latR[1]) / 2;
      if (lat >= mid) { ch = (ch << 1) + 1; latR[0] = mid; } else { ch <<= 1; latR[1] = mid; }
    }
    even = !even;
    if (++bit === 5) { hash += chars[ch]; bit = 0; ch = 0; }
  }
  return hash;
}

module.exports = { TYPES, MAX_REPORTS_PER_10MIN, POINTS, validateReport, canReport, zoneOf };
