// Adapter PostGIS du port Repository : requêtes paramétrées (anti-injection, OWASP A05),
// géospatial via ST_DWithin + index GIST. Interface identique à l'adapter mémoire.
const { Pool } = require('pg');

function createPostgresRepo(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  return {
    kind: 'postgres',
    pool,
    async createUser({ email, passwordHash }) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id, email, role, points`,
          [email, passwordHash]);
        return rows[0];
      } catch (err) {
        if (err.code === '23505') { const e = new Error('email déjà utilisé'); e.code = 'CONFLICT'; throw e; }
        throw err;
      }
    },
    async findUserByEmail(email) {
      const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
      return rows[0] || null;
    },
    async deleteUser(userId) {
      const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
      return rowCount > 0; // reports supprimés par ON DELETE CASCADE (droit à l'effacement RGPD)
    },
    async addPoints(userId, n) {
      const { rows } = await pool.query(`UPDATE users SET points = points + $2 WHERE id = $1 RETURNING points`, [userId, n]);
      return rows[0] ? rows[0].points : null;
    },
    async createReport({ user_id, type, lat, lng }) {
      const { rows } = await pool.query(
        `INSERT INTO reports (user_id, type, geom)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
         RETURNING id, user_id, type, ST_Y(geom) AS lat, ST_X(geom) AS lng, confirmations, denials, created_at`,
        [user_id, type, lng, lat]);
      return rows[0];
    },
    async confirmReport(id) {
      const { rows } = await pool.query(
        `UPDATE reports SET confirmations = confirmations + 1 WHERE id = $1
         RETURNING id, type, ST_Y(geom) AS lat, ST_X(geom) AS lng, confirmations, denials, created_at`, [id]);
      return rows[0] || null;
    },
    async recentReportCount(userId, minutes = 10) {
      const { rows } = await pool.query(
        `SELECT count(*)::int AS n FROM reports WHERE user_id = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
        [userId, String(minutes)]);
      return rows[0].n;
    },
    async reportsNear({ lat, lng, radiusM = 1500 }) {
      const { rows } = await pool.query(
        `SELECT id, user_id, type, ST_Y(geom) AS lat, ST_X(geom) AS lng, confirmations, denials, created_at
         FROM reports
         WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($2, $1),4326)::geography, $3)
           AND created_at > now() - interval '2 hours'`,
        [lat, lng, radiusM]);
      return rows;
    },
    async parkingsNear({ lat, lng, radiusM = 3000 }) {
      const { rows } = await pool.query(
        `SELECT id, name, ST_Y(geom) AS lat, ST_X(geom) AS lng, capacity, free_count, price_cents, tags
         FROM parkings
         WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($2, $1),4326)::geography, $3)`,
        [lat, lng, radiusM]);
      return rows;
    },
  };
}

module.exports = { createPostgresRepo };
