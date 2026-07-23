const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryRepo } = require('../src/repositories/memory');

function makeApp() {
  const events = [];
  const app = createApp({
    repo: createMemoryRepo({ seed: true }),
    broadcast: (zone, event, payload) => events.push({ zone, event, payload }),
  });
  return { app, events };
}

async function authToken(app) {
  await request(app).post('/v1/auth/register').send({ email: 'omar@test.dev', password: 'S3curePass!' });
  const res = await request(app).post('/v1/auth/login').send({ email: 'omar@test.dev', password: 'S3curePass!' });
  return res.body.accessToken;
}

describe('API — santé et observabilité (RT-01 / RT-02)', () => {
  test('GET /health → status ok', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('wheretopark-api');
  });
  test('GET /metrics → métriques Prometheus', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('wtp_http_request_duration_seconds');
  });
});

describe('API — authentification (RF-01 / RF-02 / RS-01)', () => {
  test('inscription puis connexion valide', async () => {
    const { app } = makeApp();
    const reg = await request(app).post('/v1/auth/register').send({ email: 'a@b.co', password: 'password123' });
    expect(reg.status).toBe(201);
    const login = await request(app).post('/v1/auth/login').send({ email: 'a@b.co', password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeDefined();
  });
  test('mot de passe trop court refusé', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/v1/auth/register').send({ email: 'a@b.co', password: 'short' });
    expect(res.status).toBe(400);
  });
  test('email déjà utilisé → 409', async () => {
    const { app } = makeApp();
    await request(app).post('/v1/auth/register').send({ email: 'dup@b.co', password: 'password123' });
    const res = await request(app).post('/v1/auth/register').send({ email: 'dup@b.co', password: 'password123' });
    expect(res.status).toBe(409);
  });
  test('mauvais mot de passe → 401', async () => {
    const { app } = makeApp();
    await request(app).post('/v1/auth/register').send({ email: 'a@b.co', password: 'password123' });
    const res = await request(app).post('/v1/auth/login').send({ email: 'a@b.co', password: 'wrongpass!' });
    expect(res.status).toBe(401);
  });
  test('route protégée sans token → 401 (RS-01)', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/v1/reports').send({ type: 'free', lat: 45.44, lng: 4.39 });
    expect(res.status).toBe(401);
  });
});

describe('API — signalements temps réel (RF-04 / RF-05 / RS-02)', () => {
  test('création → 201, +10 points, diffusion room geohash', async () => {
    const { app, events } = makeApp();
    const token = await authToken(app);
    const res = await request(app).post('/v1/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'free', lat: 45.4397, lng: 4.3872 });
    expect(res.status).toBe(201);
    expect(res.body.points).toBe(10);
    expect(res.body.report.reliability).toBe(70);
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('report:new');
    expect(events[0].zone).toHaveLength(6);
  });
  test('type invalide → 400', async () => {
    const { app } = makeApp();
    const token = await authToken(app);
    const res = await request(app).post('/v1/reports')
      .set('Authorization', `Bearer ${token}`).send({ type: 'ufo', lat: 45.44, lng: 4.39 });
    expect(res.status).toBe(400);
  });
  test('quota anti-spam → 429 (RS-02)', async () => {
    const { app } = makeApp();
    const token = await authToken(app);
    let last;
    for (let i = 0; i < 13; i++) {
      last = await request(app).post('/v1/reports')
        .set('Authorization', `Bearer ${token}`).send({ type: 'free', lat: 45.44, lng: 4.39 });
    }
    expect(last.status).toBe(429);
  });
  test('confirmation → score renforcé, +5 points (RF-05)', async () => {
    const { app } = makeApp();
    const token = await authToken(app);
    const created = await request(app).post('/v1/reports')
      .set('Authorization', `Bearer ${token}`).send({ type: 'free', lat: 45.44, lng: 4.39 });
    const res = await request(app).post(`/v1/reports/${created.body.report.id}/confirm`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.report.reliability).toBeGreaterThanOrEqual(70);
    expect(res.body.points).toBe(15);
  });
});

describe('API — carte et prédiction (RF-03 / RF-07)', () => {
  test('GET /v1/spots renvoie signalements enrichis + parkings + zone', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/v1/spots?lat=45.4397&lng=4.3872');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reports)).toBe(true);
    expect(res.body.parkings.length).toBeGreaterThan(0);
    res.body.reports.forEach(r => {
      expect(r.reliability).toBeGreaterThan(0);
      expect(r.reliability).toBeLessThanOrEqual(100);
    });
  });
  test('paramètres manquants → 400', async () => {
    const { app } = makeApp();
    expect((await request(app).get('/v1/spots')).status).toBe(400);
  });
  test('GET /v1/predictions → probabilité bornée et ETA positif', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/v1/predictions?lat=45.4397&lng=4.3872');
    expect(res.status).toBe(200);
    expect(res.body.probability).toBeGreaterThanOrEqual(0);
    expect(res.body.probability).toBeLessThanOrEqual(100);
    expect(res.body.etaMinutes).toBeGreaterThan(0);
  });
});

describe('API — parkings mondiaux OSM (proxy DataProvider)', () => {
  const fakeOverpass = async () => ({
    elements: [
      { type: 'way', id: 1, center: { lat: 45.44, lon: 4.39 },
        tags: { amenity: 'parking', name: 'Parking Test', capacity: '120', fee: 'no', parking: 'underground', 'capacity:disabled': '4' } },
      { type: 'node', id: 2, lat: 45.441, lon: 4.391, tags: { amenity: 'parking' } },
      { type: 'way', id: 3, geometry: [{ lat: 45.442, lon: 4.392 }, { lat: 45.443, lon: 4.393 }],
        tags: { name: 'Rue des Essais', 'parking:lane:right': 'parallel', 'parking:condition:right': 'ticket' } },
    ],
  });
  function osmApp(fetcher = fakeOverpass) {
    return createApp({ repo: createMemoryRepo({ seed: false }), osmFetcher: fetcher });
  }
  test('normalisation des tags OSM (capacité, gratuit, souterrain, PMR)', async () => {
    const res = await request(osmApp()).get('/v1/osm/parkings?lat=45.44&lng=4.39');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('openstreetmap-overpass');
    expect(res.body.count).toBe(2);
    const p = res.body.parkings[0];
    expect(p).toMatchObject({ name: 'Parking Test', capacity: 120, fee: 'no', covered: true, pmr: 4 });
  });
  test('segments de voirie normalisés avec condition et géométrie', async () => {
    const res = await request(osmApp()).get('/v1/osm/parkings?lat=45.44&lng=4.39');
    expect(res.body.streetCount).toBe(1);
    const st = res.body.streets[0];
    expect(st).toMatchObject({ name: 'Rue des Essais', condition: 'paid' });
    expect(st.points).toHaveLength(2);
  });
  test('cache 10 min : le second appel ne réinterroge pas Overpass', async () => {
    let calls = 0;
    const app = osmApp(async () => { calls++; return fakeOverpass(); });
    await request(app).get('/v1/osm/parkings?lat=45.44&lng=4.39');
    const second = await request(app).get('/v1/osm/parkings?lat=45.44&lng=4.39');
    expect(calls).toBe(1);
    expect(second.body.cached).toBe(true);
  });
  test('source indisponible → 502 maîtrisé', async () => {
    const app = osmApp(async () => { throw new Error('down'); });
    const res = await request(app).get('/v1/osm/parkings?lat=45.44&lng=4.39');
    expect(res.status).toBe(502);
  });
  test('paramètres manquants → 400', async () => {
    expect((await request(osmApp()).get('/v1/osm/parkings')).status).toBe(400);
  });
});

describe('API — configuration runtime des services auto-hébergés', () => {
  afterEach(() => { delete process.env.OSRM_URL; delete process.env.TILE_URL; });
  test('sans variables → valeurs nulles (repli sur les services publics)', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/v1/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ osrmUrl: null, tileUrl: null });
  });
  test('OSRM_URL défini → exposé au front (docker-compose.selfhost.yml)', async () => {
    process.env.OSRM_URL = 'http://localhost:5001';
    const { app } = makeApp();
    const res = await request(app).get('/v1/config');
    expect(res.body.osrmUrl).toBe('http://localhost:5001');
  });
});

describe('API — RGPD : droit à l\'effacement (DELETE /v1/auth/me)', () => {
  test('suppression du compte : 200, puis login impossible et signalements purgés', async () => {
    const { app } = makeApp();
    const token = await authToken(app);
    await request(app).post('/v1/reports')
      .set('Authorization', `Bearer ${token}`).send({ type: 'free', lat: 45.44, lng: 4.39 });
    const del = await request(app).delete('/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);
    const relogin = await request(app).post('/v1/auth/login').send({ email: 'omar@test.dev', password: 'S3curePass!' });
    expect(relogin.status).toBe(401);
    const spots = await request(app).get('/v1/spots?lat=45.44&lng=4.39');
    expect(spots.body.reports.some(r => r.type === 'free' && r.user_id !== 'seed')).toBe(false);
  });
  test('sans token → 401', async () => {
    const { app } = makeApp();
    expect((await request(app).delete('/v1/auth/me')).status).toBe(401);
  });
});
