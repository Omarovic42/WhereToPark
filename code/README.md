# WhereToPark 🅿️ — Le Waze du stationnement

Plateforme communautaire de stationnement : **parkings référencés dans le monde entier**
(OpenStreetMap/Overpass — équivalent open-data de Parkopedia), recherche d'adresse mondiale
(Nominatim), **itinéraires routiers réels** (OSRM), signalements géolocalisés temps réel,
score de fiabilité communautaire, IA prédictive, gamification.
**Projet support des Blocs 2, 3 et 4 — Titre RNCP 39583 « Expert en Développement Logiciel ».**

## 📚 Par où commencer

| Fichier | Contenu |
|---|---|
| **`PROMPT-VSCODE.md`** | Prompt à coller dans l'assistant IA de VS Code pour tout lancer et tout valider + aide-mémoire des commandes + dépannage |
| **`docs/GUIDE-COMPLET.md`** | Explication détaillée de tout : chaque fichier de code, l'architecture, les diagrammes, les 42 tests, la CI/CD, et les questions probables du jury |
| **`docs/REFERENTIEL-RNCP39583.md`** | La fiche officielle synthétisée : prérequis + les 4 blocs, et un livrable prêt pour chacun (`docs/bloc1…bloc4`) |
| **`CHANGELOG.md`** | Journal des versions (exigence BC04), retraçant les jalons et les correctifs B-01→B-07 |
| **`docs/TRACES-IA-ET-REPONSES.md`** | 🔒 Document personnel (à ne PAS déposer) : inventaire des traces d'outillage IA et réponses à préparer pour le jury |
| **`docs/blocX-.../PROMPT-BLOCX.md`** | 🔒 Personnels (à ne PAS déposer) : un prompt d'assistant IA par bloc — conformité, captures, personnalisation, répétition avec jury simulé |

## Ouvrir dans VS Code

Ouvrir ce dossier dans VS Code (`Fichier → Ouvrir le dossier`). Tout est préconfiguré :
- **Ctrl+Maj+B** → démarre l'API en mode démo (sans base) → http://localhost:5000
- **Terminal → Exécuter la tâche** → `🧪 Tests (38)`, `🐳 Docker : tout démarrer`, `📄 Régénérer le dossier Word`
- **F5** → débogueur sur l'API ou sur les tests Jest
- `api/requests.http` → tester chaque endpoint en un clic (extension REST Client recommandée à l'installation)

## Structure du projet

```
wheretopark/
├── api/                  # Backend Express + Socket.IO (architecture hexagonale)
│   ├── src/domain/       #   cœur métier pur : fiabilité, prédiction, policy, voirie
│   ├── src/repositories/ #   adapters : memory (tests/démo) · postgres (PostGIS)
│   ├── tests/            #   42 tests Jest/Supertest (sans base ni secret)
│   └── requests.http     #   tests manuels des endpoints (REST Client)
├── web/                  # Front carte mondiale (OSM/Overpass · Nominatim · OSRM)
├── db/                   # Migration SQL PostGIS + données de démo
├── assets/               # Logo (transparent, favicon, HD)
├── docs/                     # 📚 DÉCOUPÉ SELON LES 4 BLOCS RNCP 39583
│   ├── REFERENTIEL-RNCP39583.md      # synthèse fiche officielle : prérequis + 4 blocs
│   ├── bloc1-cadrage/                # BC01 (soutenance) : cadrage complet + plan de slides
│   ├── bloc2-developpement/          # BC02 (dossier écrit) : Word 27 p. + diagrammes + générateurs + checklist
│   ├── bloc3-pilotage/               # BC03 (soutenance) : pilotage + script de démo jury
│   ├── bloc4-maintenance/            # BC04 (dossier écrit) : supervision, anomalies, maintenance
│   ├── GUIDE-COMPLET.md              # explication détaillée de tout le code
│   └── prototype-standalone.html     # démo autonome double-cliquable
├── .vscode/              # tâches, débogueur, extensions recommandées
├── .github/workflows/    # CI GitHub Actions (audit, gitleaks, tests, Docker)
├── docker-compose.yml    # API + PostGIS en une commande
└── .env.example          # variables d'environnement (à copier en .env)
```

## Démarrage en 2 commandes (Docker)

```bash
cp .env.example .env        # puis éditer les secrets
docker compose up --build   # → http://localhost:5000
```

- `db` : PostgreSQL 16 + PostGIS, schéma et données de démo appliqués automatiquement (`db/001_init.sql`)
- `api` : API + Socket.IO + front web servis sur le port 5000

## Démarrage sans Docker (mode démo)

```bash
cd api && npm ci && npm start   # sans DATABASE_URL → repository mémoire seedé
```

Le front (`web/index.html`) détecte automatiquement l'API : badge **● API connectée**
(temps réel via Socket.IO) ou **démo autonome** (simulation locale).

## Tests

```bash
cd api && npm test              # 42 tests (domaine + intégration), sans base ni secret
npm run test:coverage           # rapport lcov dans api/coverage/
k6 run tests/perf/health-load.js  # test de charge (seuils p95<200ms, err<1%) — API démarrée
```

## Architecture (hexagonale)

```
api/src/
├── domain/          # cœur métier PUR (aucun framework) : reliability, prediction, reportPolicy
├── repositories/    # adapters du port Repository : memory (tests/démo) · postgres (PostGIS)
├── app.js           # composition root : Express + injection des dépendances
└── server.js        # bootstrap : HTTP + Socket.IO (rooms geohash)
```

Règles métier testées en isolation ; l'adapter PostGIS utilise exclusivement des
requêtes paramétrées (`ST_DWithin` + index GIST).

## API

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | /health | — | Healthcheck |
| GET | /metrics | — | Métriques Prometheus |
| POST | /v1/auth/register | — | Inscription (bcrypt) |
| POST | /v1/auth/login | — | Connexion → JWT 15 min |
| POST | /v1/reports | JWT | Signalement (quota anti-spam 12/10 min) |
| POST | /v1/reports/:id/confirm | JWT | Confirmation → score renforcé, +5 pts |
| GET | /v1/spots?lat&lng&radius | — | Signalements + parkings à proximité |
| GET | /v1/predictions?lat&lng | — | Probabilité + ETA (borné 0–100) |
| GET | /v1/osm/parkings?lat&lng&radius | — | Parkings + segments de voirie OSM normalisés (cache 10 min) |

Socket.IO : `zone:join(geohash6)` puis événements `report:new`, `report:confirmed`
diffusés uniquement à la room de la zone.

## CI (GitHub Actions)

`.github/workflows/ci.yml` — 5 jobs : **security-checks** (npm audit bloquant + gitleaks)
→ **api-validation** (42 tests + couverture) → **performance** (k6, seuils bloquants p95<200ms)
→ **docker-build** (image + smoke test /health) → **ci-passed**. Build reproductible **sans secret réel**.

## Obtenir les captures du dossier Bloc 2 (10 min)

1. Créer le dépôt GitHub, pousser ce code → l'onglet **Actions** affiche la CI verte
   *(capture « Graph GitHub Actions »)*.
2. Créer les branches `develop` / `preprod` / `main` + une PR → *(captures branches & PR)*.
3. `docker compose up` → `docker ps` *(capture conteneurs)* ; ouvrir
   `http://localhost:5000/health` et `/metrics` *(captures supervision)*.
4. Ouvrir `http://localhost:5000` → captures de la carte, d'un signalement,
   du panneau prédiction, des filtres.
5. `cd api && npm run test:coverage` → ouvrir `coverage/lcov-report/index.html`
   *(capture couverture)*.

## Mise en production HTTPS + déploiement continu

```bash
export DOMAIN=mondomaine.fr EMAIL=admin@mondomaine.fr
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d   # nginx + certbot
```
Guide complet : `docs/DEPLOIEMENT-PRODUCTION.md`. Le workflow `cd.yml` déploie
automatiquement **après CI verte sur main** (image GHCR par SHA, approbation manuelle
possible). RGPD intégré : pages légales sur `/legal.html`, consentement géolocalisation,
droit à l'effacement `DELETE /v1/auth/me`. Commercialisation :
`docs/commercialisation/COMMERCIALISATION.md`.

## Auto-hébergement des services externes (production)

Le serveur OSRM public est un serveur de **démonstration** : pour la production, tout
s'auto-héberge — livré clé en main :

```bash
bash scripts/osrm-prepare.sh          # télécharge + prétraite les données routières (1 fois)
docker compose -f docker-compose.yml -f docker-compose.selfhost.yml up -d
```

Le front interroge `GET /v1/config` au démarrage : si `OSRM_URL` est défini, les
itinéraires sont calculés par **ton** serveur OSRM (port 5001) ; sinon repli sur le
serveur public. Même mécanique pour des tuiles auto-hébergées via `TILE_URL`.
Changer de région : `bash scripts/osrm-prepare.sh https://download.geofabrik.de/europe/france-latest.osm.pbf`.

## Sources de données réelles

| Source | Usage | Accès |
|---|---|---|
| OpenStreetMap / Overpass | Parkings monde entier + stationnement en voirie (gratuit/payant/zone bleue/résidents, schémas parking:lane et parking:left/right/both) | Ouvert — direct navigateur + proxy API avec cache |
| Nominatim | Géocodage mondial de la recherche | Ouvert |
| OSRM | Calcul d'itinéraires routiers réels | Ouvert — **auto-hébergeable en 2 commandes** (livré : `docker-compose.selfhost.yml` + `scripts/osrm-prepare.sh`) |
| Parkopedia / partenaires | Alternative commerciale (tarifs live, disponibilité capteurs) | Branchable via le port DataProvider (nouvel adapter, zéro impact métier) |

## Prochaines étapes (Blocs 3 & 4)

- Déploiement cloud managé (Cloud Run / GKE) via workflow `cd.yml` (workflow_run après CI)
- Application Flutter consommant la même API
- Service ML Python derrière le port PredictionEngine
- Stripe (réservations parkings partenaires) + back-office municipal
