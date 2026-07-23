// Adapter "memory" du port Repository : utilisé par les tests (CI sans secret)
// et par le mode démo si DATABASE_URL est absent. Même interface que l'adapter Postgres.
const crypto = require('crypto');

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function createMemoryRepo({ seed = true } = {}) {
  const users = new Map();
  const reports = [];
  const parkings = seed ? [
    { id: 'p1', name: "Parking Hôtel de Ville", lat: 45.4402, lng: 4.3866, capacity: 420, free_count: 37, price_cents: 180, tags: ['covered', 'secure', 'ev'] },
    { id: 'p2', name: 'Parking Châteaucreux', lat: 45.4433, lng: 4.3997, capacity: 640, free_count: 158, price_cents: 140, tags: ['covered', 'ev', 'moto'] },
    { id: 'p3', name: 'Parking Ursules', lat: 45.4363, lng: 4.3901, capacity: 520, free_count: 0, price_cents: 200, tags: ['covered', 'secure', 'pmr', 'ev'] },
  ] : [];
  if (seed) {
    for (let i = 0; i < 20; i++) reports.push({
      id: crypto.randomUUID(), user_id: 'seed', type: Math.random() < 0.55 ? 'free' : 'busy',
      lat: 45.4397 + (Math.random() - 0.5) * 0.014, lng: 4.3872 + (Math.random() - 0.5) * 0.02,
      confirmations: Math.floor(Math.random() * 3), denials: 0, created_at: new Date(Date.now() - Math.random() * 15 * 60000),
    });
  }
  return {
    kind: 'memory',
    async createUser({ email, passwordHash }) {
      if ([...users.values()].some(u => u.email === email)) { const e = new Error('email déjà utilisé'); e.code = 'CONFLICT'; throw e; }
      const u = { id: crypto.randomUUID(), email, password_hash: passwordHash, role: 'user', points: 0, created_at: new Date() };
      users.set(u.id, u); return { id: u.id, email: u.email, role: u.role, points: u.points };
    },
    async findUserByEmail(email) { return [...users.values()].find(u => u.email === email) || null; },
    async addPoints(userId, n) { const u = users.get(userId); if (u) u.points += n; return u ? u.points : null; },
    async deleteUser(userId) {
      const existed = users.delete(userId);
      for (let i = reports.length - 1; i >= 0; i--) if (reports[i].user_id === userId) reports.splice(i, 1);
      return existed;
    },
    async createReport(r) { const rec = { id: crypto.randomUUID(), confirmations: 0, denials: 0, created_at: new Date(), ...r }; reports.push(rec); return rec; },
    async confirmReport(id) { const r = reports.find(x => x.id === id); if (!r) return null; r.confirmations += 1; return r; },
    async recentReportCount(userId, minutes = 10) {
      const since = Date.now() - minutes * 60000;
      return reports.filter(r => r.user_id === userId && r.created_at.getTime() > since).length;
    },
    async reportsNear({ lat, lng, radiusM = 1500 }) {
      return reports.filter(r => haversineM(lat, lng, r.lat, r.lng) <= radiusM);
    },
    async parkingsNear({ lat, lng, radiusM = 3000 }) {
      return parkings.filter(p => haversineM(lat, lng, p.lat, p.lng) <= radiusM);
    },
  };
}

module.exports = { createMemoryRepo };
