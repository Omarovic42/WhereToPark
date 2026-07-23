// Composition root : l'app reçoit ses dépendances (repo, broadcaster) — injection de dépendances.
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const client = require('prom-client');
const { computeReliability } = require('./domain/reliability');
const { predict } = require('./domain/prediction');
const { validateReport, canReport, zoneOf, POINTS } = require('./domain/reportPolicy');
const { classifyStreetTags } = require('./domain/streetParking');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function createApp(options) {
  const { repo, broadcast = () => {} } = options;
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '100kb' }));

  // ── Observabilité (Prometheus) ──
  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry });
  const httpDuration = new client.Histogram({
    name: 'wtp_http_request_duration_seconds', help: 'HTTP request duration',
    labelNames: ['method', 'route', 'status'], registers: [registry],
  });
  const reportsCounter = new client.Counter({
    name: 'wtp_reports_total', help: 'Total community reports', labelNames: ['type'], registers: [registry],
  });
  app.use((req, res, next) => {
    const end = httpDuration.startTimer();
    res.on('finish', () => end({ method: req.method, route: req.path.split('/').slice(0, 3).join('/'), status: res.statusCode }));
    next();
  });

  // ── En-têtes durcis (OWASP A02/A05) ──
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');
    next();
  });

  // ── Auth middleware (guard JWT) ──
  const auth = (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'token manquant' });
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch { return res.status(401).json({ error: 'token invalide ou expiré' }); }
  };

  // ── Santé & métriques ──
  app.get('/health', (req, res) => res.json({
    status: 'ok', service: 'wheretopark-api', version: '1.0.0',
    repo: repo.kind, uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString(),
  }));
  // Configuration runtime consommée par le front : permet de basculer les
  // services externes (itinéraires, tuiles) vers des instances auto-hébergées
  // sans rebuild — simple variable d'environnement (cf. docker-compose.selfhost.yml).
  app.get('/v1/config', (req, res) => res.json({
    osrmUrl: process.env.OSRM_URL || null,
    tileUrl: process.env.TILE_URL || null,
  }));
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  // ── Auth ──
  app.post('/v1/auth/register', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'email invalide' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'mot de passe : 8 caractères minimum' });
    try {
      const user = await repo.createUser({ email, passwordHash: await bcrypt.hash(password, 10) });
      return res.status(201).json({ user });
    } catch (e) {
      if (e.code === 'CONFLICT') return res.status(409).json({ error: e.message });
      throw e;
    }
  });
  app.post('/v1/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    const user = email ? await repo.findUserByEmail(email) : null;
    if (!user || !(await bcrypt.compare(password || '', user.password_hash)))
      return res.status(401).json({ error: 'identifiants invalides' });
    const accessToken = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
    return res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role, points: user.points } });
  });

  // RGPD — droit à l'effacement (art. 17) : suppression du compte ET de tous
  // ses signalements en une opération, authentifiée par le token de l'intéressé.
  app.delete('/v1/auth/me', auth, async (req, res) => {
    const ok = await repo.deleteUser(req.user.sub);
    if (!ok) return res.status(404).json({ error: 'compte introuvable' });
    return res.json({ deleted: true, message: 'Compte et signalements associés supprimés définitivement.' });
  });

  // ── Signalements ──
  app.post('/v1/reports', auth, async (req, res) => {
    const { type, lat, lng } = req.body || {};
    const v = validateReport({ type, lat, lng });
    if (!v.valid) return res.status(400).json({ errors: v.errors });
    const recentCount = await repo.recentReportCount(req.user.sub);
    if (!canReport({ recentCount })) return res.status(429).json({ error: 'quota de signalements atteint, réessayez plus tard' });
    const report = await repo.createReport({ user_id: req.user.sub, type, lat, lng });
    const points = await repo.addPoints(req.user.sub, POINTS.report);
    reportsCounter.inc({ type });
    const payload = { ...report, reliability: computeReliability({ confirmations: 0, ageMinutes: 0 }) };
    broadcast(zoneOf(lat, lng), 'report:new', payload); // diffusion room geohash (cf. B-01)
    return res.status(201).json({ report: payload, points });
  });
  app.post('/v1/reports/:id/confirm', auth, async (req, res) => {
    const r = await repo.confirmReport(req.params.id);
    if (!r) return res.status(404).json({ error: 'signalement introuvable' });
    const points = await repo.addPoints(req.user.sub, POINTS.confirm);
    const ageMinutes = (Date.now() - new Date(r.created_at).getTime()) / 60000;
    const payload = { ...r, reliability: computeReliability({ confirmations: r.confirmations, denials: r.denials, ageMinutes }) };
    broadcast(zoneOf(r.lat, r.lng), 'report:confirmed', payload);
    return res.json({ report: payload, points });
  });

  // ── Places & parkings à proximité ──
  app.get('/v1/spots', async (req, res) => {
    const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ error: 'lat et lng requis' });
    const radiusM = Math.min(parseInt(req.query.radius || '1500', 10), 5000);
    const [reports, parkings] = await Promise.all([
      repo.reportsNear({ lat, lng, radiusM }),
      repo.parkingsNear({ lat, lng, radiusM: Math.max(radiusM, 3000) }),
    ]);
    const enriched = reports.map(r => ({
      ...r, reliability: computeReliability({
        confirmations: r.confirmations, denials: r.denials,
        ageMinutes: (Date.now() - new Date(r.created_at).getTime()) / 60000,
      }),
    })).filter(r => r.reliability > 0);
    return res.json({ reports: enriched, parkings, zone: zoneOf(lat, lng) });
  });

  // ── Parkings mondiaux (proxy Overpass/OSM avec cache — port DataProvider) ──
  // Le fetcher est injectable pour les tests ; en production, cache mémoire 10 min
  // par zone pour respecter la politique d'usage d'Overpass.
  const osmCache = new Map();
  const osmEndpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  const osmFetcher = options.osmFetcher || (async (query) => {
    let lastError = null;
    const body = new URLSearchParams({ data: query }).toString();
    for (const endpoint of osmEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept': 'application/json',
            'User-Agent': 'WhereToPark/1.0 (+https://github.com/Omarovic42/wheretopark)',
          },
        });
        if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
        return res.json();
      } catch (e) {
        console.error('Overpass fetch failed:', endpoint, e.message || e);
        lastError = e;
      }
    }
    throw lastError || new Error('Tous les miroirs Overpass ont échoué');
  });
  app.get('/v1/osm/parkings', async (req, res) => {
    const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ error: 'lat et lng requis' });
    const radiusM = Math.min(parseInt(req.query.radius || '1500', 10), 3000);
    const key = `${lat.toFixed(2)}|${lng.toFixed(2)}|${radiusM}`;
    const hit = osmCache.get(key);
    if (hit && Date.now() - hit.at < 10 * 60000) return res.json({ ...hit.data, cached: true });
    try {
      const q = `[out:json][timeout:20];(node["amenity"="parking"](around:${radiusM},${lat},${lng});way["amenity"="parking"](around:${radiusM},${lat},${lng}););out center tags 120;way[~"^parking:(lane:|left|right|both)"~"."](around:${radiusM},${lat},${lng});out geom tags 90;`;
      const raw = await osmFetcher(q);
      const parkings = [], streets = [];
      (raw.elements || []).forEach(e => {
        const t = e.tags || {};
        if (e.geometry && !t.amenity) {                 // stationnement en voirie
          const condition = classifyStreetTags(t);
          if (condition) streets.push({
            id: 'osm-' + e.type + e.id, condition, name: t.name || null,
            points: e.geometry.map(g => [g.lat, g.lon]),
          });
          return;
        }
        const plat = e.lat ?? (e.center && e.center.lat), plng = e.lon ?? (e.center && e.center.lon);
        if (plat == null || plng == null) return;
        parkings.push({
          id: 'osm-' + e.type + e.id, lat: plat, lng: plng,
          name: t.name || 'Parking', capacity: t.capacity ? parseInt(t.capacity, 10) : null,
          fee: t.fee || null, type: t.parking || null,
          covered: t.parking === 'underground' || t.parking === 'multi-storey' || t.covered === 'yes',
          pmr: t['capacity:disabled'] ? parseInt(t['capacity:disabled'], 10) : 0,
          operator: t.operator || null,
        });
      });
      const data = { parkings, streets, source: 'openstreetmap-overpass', count: parkings.length, streetCount: streets.length };
      osmCache.set(key, { at: Date.now(), data });
      return res.json({ ...data, cached: false });
    } catch (e) {
      console.error('OSM proxy error:', e);
      return res.status(502).json({ error: e.message || 'source de données parkings indisponible' });
    }
  });

  // ── Prédiction ──
  app.get('/v1/predictions', async (req, res) => {
    const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ error: 'lat et lng requis' });
    const reports = await repo.reportsNear({ lat, lng, radiusM: 1500 });
    const freeCount = reports.filter(r => r.type === 'free').length;
    const out = predict({ hour: new Date().getHours(), freeCount, totalCount: reports.length });
    return res.json({ ...out, zone: zoneOf(lat, lng), sample: reports.length });
  });

  // ── Front web statique ──
  app.use(express.static(path.join(__dirname, '..', '..', 'web')));

  // ── Gestion centralisée des erreurs (OWASP A10) ──
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(JSON.stringify({ level: 'error', msg: err.message, path: req.path }));
    res.status(500).json({ error: 'erreur interne' });
  });

  return app;
}

module.exports = { createApp, JWT_SECRET };
