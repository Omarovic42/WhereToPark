const { computeReliability, isExpired } = require('../src/domain/reliability');
const { predict } = require('../src/domain/prediction');
const { validateReport, canReport, zoneOf, MAX_REPORTS_PER_10MIN } = require('../src/domain/reportPolicy');

describe('ReliabilityScore (domaine)', () => {
  test('score de base à la création', () => {
    expect(computeReliability({ confirmations: 0, denials: 0, ageMinutes: 0 })).toBe(70);
  });
  test('les confirmations augmentent le score, borné à 100', () => {
    expect(computeReliability({ confirmations: 2, ageMinutes: 0 })).toBe(86);
    expect(computeReliability({ confirmations: 20, ageMinutes: 0 })).toBe(100);
  });
  test('les infirmations diminuent le score, borné à 0', () => {
    expect(computeReliability({ denials: 2, ageMinutes: 0 })).toBe(40);
    expect(computeReliability({ denials: 10, ageMinutes: 0 })).toBe(0);
  });
  test('décroissance temporelle (cf. anomalie B-02)', () => {
    const fresh = computeReliability({ ageMinutes: 0 });
    const old = computeReliability({ ageMinutes: 30 });
    expect(old).toBeLessThan(fresh);
  });
  test('expiration sans soutien communautaire', () => {
    expect(isExpired({ confirmations: 0, ageMinutes: 120 })).toBe(true);
    expect(isExpired({ confirmations: 3, ageMinutes: 120 })).toBe(false);
  });
});

describe('PredictionEngine (domaine)', () => {
  test('probabilité toujours bornée 0–100 (cf. anomalie B-04)', () => {
    for (let h = 0; h < 24; h++) {
      const { probability } = predict({ hour: h, freeCount: 100, totalCount: 100 });
      expect(probability).toBeGreaterThanOrEqual(0);
      expect(probability).toBeLessThanOrEqual(100);
    }
  });
  test('heure invalide rejetée', () => {
    expect(() => predict({ hour: 25 })).toThrow(RangeError);
  });
  test('heure de pointe du soir réduit la probabilité', () => {
    const night = predict({ hour: 23, freeCount: 5, totalCount: 10 }).probability;
    const rush = predict({ hour: 18, freeCount: 5, totalCount: 10 }).probability;
    expect(rush).toBeLessThan(night);
  });
  test('ETA strictement positif', () => {
    expect(predict({ hour: 18, freeCount: 0, totalCount: 10 }).etaMinutes).toBeGreaterThan(0);
  });
});

describe('ReportPolicy (domaine)', () => {
  test('signalement valide accepté', () => {
    expect(validateReport({ type: 'free', lat: 45.44, lng: 4.39 }).valid).toBe(true);
  });
  test('type inconnu et coordonnées hors bornes refusés', () => {
    expect(validateReport({ type: 'ufo', lat: 45, lng: 4 }).valid).toBe(false);
    expect(validateReport({ type: 'free', lat: 95, lng: 4 }).valid).toBe(false);
    expect(validateReport({ type: 'free', lat: 45, lng: 999 }).valid).toBe(false);
  });
  test('quota anti-spam (cf. RS-02)', () => {
    expect(canReport({ recentCount: 0 })).toBe(true);
    expect(canReport({ recentCount: MAX_REPORTS_PER_10MIN })).toBe(false);
  });
  test('zoneOf : geohash stable et discriminant', () => {
    expect(zoneOf(45.4397, 4.3872)).toBe(zoneOf(45.4397, 4.3872));
    expect(zoneOf(45.4397, 4.3872)).not.toBe(zoneOf(48.8566, 2.3522));
    expect(zoneOf(45.4397, 4.3872)).toHaveLength(6);
  });
});

const { classifyStreetTags } = require('../src/domain/streetParking');
describe('StreetParkingPolicy (voirie — schémas OSM legacy et actuel)', () => {
  test('schéma legacy : parallèle + condition ticket → payant', () => {
    expect(classifyStreetTags({ 'parking:lane:right': 'parallel', 'parking:condition:right': 'ticket' })).toBe('paid');
  });
  test('schéma actuel : lane + fee=no → gratuit', () => {
    expect(classifyStreetTags({ 'parking:both': 'lane', 'parking:both:fee': 'no' })).toBe('free');
  });
  test('zone bleue (disque) prioritaire', () => {
    expect(classifyStreetTags({ 'parking:lane:left': 'parallel', 'parking:condition:left': 'disc' })).toBe('disc');
  });
  test('résidents / privé', () => {
    expect(classifyStreetTags({ 'parking:right': 'street_side', 'parking:right:access': 'residents' })).toBe('residents');
  });
  test('stationnement interdit → null', () => {
    expect(classifyStreetTags({ 'parking:lane:both': 'no_parking' })).toBe(null);
    expect(classifyStreetTags({ 'parking:both': 'no' })).toBe(null);
  });
  test('autorisé sans condition renseignée → unknown', () => {
    expect(classifyStreetTags({ 'parking:lane:right': 'parallel' })).toBe('unknown');
  });
});
