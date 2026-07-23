// Test de performance k6 — endpoints de santé et de lecture critiques.
// Seuils bloquants (échec du job CI si dépassés) :
//   · p95 < 200 ms   · taux d'erreur < 1 %
// Exécution locale :  k6 run api/tests/perf/health-load.js
// En CI : job "performance" (voir .github/workflows/ci.yml)
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:5000';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 20 },  // montée en charge
        { duration: '20s', target: 20 },  // palier
        { duration: '5s',  target: 0 },   // redescente
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],   // p95 < 200 ms
    http_req_failed:   ['rate<0.01'],   // erreurs < 1 %
  },
};

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, { 'health 200': r => r.status === 200, 'health ok': r => r.json('status') === 'ok' });

  const spots = http.get(`${BASE}/v1/spots?lat=45.4397&lng=4.3872&radius=2000`);
  check(spots, { 'spots 200': r => r.status === 200 });

  const pred = http.get(`${BASE}/v1/predictions?lat=45.4397&lng=4.3872`);
  check(pred, { 'prediction 200': r => r.status === 200, 'bornée': r => { const p = r.json('probability'); return p >= 0 && p <= 100; } });

  sleep(0.3);
}
