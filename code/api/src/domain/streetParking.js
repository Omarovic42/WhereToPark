// Domaine pur : classification d'un segment de voirie selon les deux schémas OSM
// (legacy parking:lane:* / parking:condition:* et schéma actuel parking:left|right|both).
// Retourne la condition de stationnement ('free'|'paid'|'disc'|'residents'|'unknown')
// ou null si le stationnement n'est pas autorisé sur le segment.
const FORBIDDEN = /^(no|no_parking|no_stopping|none|separate)$/;

function classifyStreetTags(t = {}) {
  let allowed = false, cond = null;
  for (const side of ['left', 'right', 'both']) {
    const lane = t[`parking:lane:${side}`] || t[`parking:${side}`];
    if (lane && !FORBIDDEN.test(lane)) allowed = true;
    const c = t[`parking:condition:${side}`] || t[`parking:condition:${side}:default`];
    const fee = t[`parking:${side}:fee`];
    const acc = t[`parking:${side}:access`];
    if (c === 'disc' || t[`parking:${side}:restriction`] === 'disc') cond = 'disc';
    else if (c === 'residents' || acc === 'residents' || acc === 'private') cond = cond ?? 'residents';
    else if (c === 'free' || fee === 'no') cond = cond ?? 'free';
    else if (c === 'ticket' || fee === 'yes') cond = cond ?? 'paid';
  }
  return allowed ? (cond || 'unknown') : null;
}

module.exports = { classifyStreetTags };
