# 📦 RENDU BLOC 2 — Concevoir et développer des applications logicielles
### Projet WhereToPark · RNCP 39583 · Candidat : Omar Madjidi

## Contenu de ce rendu

| Élément | Fichier / dossier |
|---|---|
| **Dossier écrit** (les 16 livrables exigés) | `WhereToPark-Dossier-Bloc2-RNCP39583.docx` |
| **Code source complet** | `code/` (api, web, db, docker, CI, scripts) |
| **Prototype testable** (3 façons, voir ci-dessous) | `prototype-standalone.html` + `code/` |
| Manuel d'utilisation | `MANUEL-UTILISATION.md` |
| Manuel de déploiement | `MANUEL-DEPLOIEMENT.md` |
| Manuel de mise à jour | `MANUEL-MISE-A-JOUR.md` |
| Conformité livrable par livrable | `BLOC2-CHECKLIST.md` |
| Diagrammes du dossier | `diagrammes/` |

## 🧪 Tester le prototype — 3 façons, de la plus simple à la plus complète

**1. Double-clic (0 installation)** — ouvrir `prototype-standalone.html` dans un
navigateur. Mode démo autonome : carte mondiale, parkings réels OpenStreetMap,
recherche d'adresse (Nominatim), itinéraires réels (OSRM), signalements simulés.
*Nécessite uniquement une connexion internet pour la carte et les données.*

**2. API en mode démo (Node 20+, 2 commandes)** :
```bash
cd code/api && npm install && npm start     # → http://localhost:5000
```
Version complète connectée : authentification JWT, signalements persistés (mémoire),
temps réel Socket.IO, gamification, métriques Prometheus. Badge « ● API connectée ».

**3. Stack complète (Docker, production-like)** :
```bash
cd code && cp .env.example .env && docker compose up --build   # → http://localhost:5000
```
API + base PostgreSQL/PostGIS (schéma et données de démo appliqués automatiquement).

**Tests automatisés :** `cd code/api && npm test` → **42 tests verts**, sans base ni
secret. Test de charge : `k6 run tests/perf/health-load.js` (API démarrée) — seuils
p95 < 200 ms / erreurs < 1 % (mesure de référence : p95 = 3,4 ms).

## 📱 Concernant l'APK

Il n'y a **pas d'APK dans ce rendu**, et c'est un choix assumé et documenté :
l'application mobile Flutter est la **cible du Bloc 3** (elle consommera la même API,
déjà prête : endpoints REST + Socket.IO + proxy OSM). La fiche RNCP 39583 exige pour
le BC02 « le code source d'un logiciel et la documentation associée » — le logiciel
livré ici est l'application web complète, testable par les 3 moyens ci-dessus.

## 🏗 Architecture en bref (détail dans le dossier)

**Back (`code/api/`)** — Node.js 22 / Express + Socket.IO, architecture hexagonale :
- `src/domain/` : métier pur, testé en isolation (score de fiabilité, prédiction
  bornée, politique de signalement + quota anti-spam, classification voirie OSM)
- `src/repositories/` : port Repository avec 2 adapters — `memory` (démo/tests) et
  `postgres` (PostGIS : `ST_DWithin` + index GIST, requêtes 100 % paramétrées)
- `src/app.js` : composition root (injection), guards JWT, en-têtes durcis,
  métriques Prometheus, gestion d'erreurs centralisée
- `src/server.js` : bootstrap HTTP + rooms Socket.IO par geohash

**Front (`code/web/`)** — un fichier `index.html` sans étape de build (servi
statiquement par l'API) : Leaflet, données mondiales Overpass/OSM (parkings + voirie,
cache par zone), Nominatim, OSRM, bascule automatique live/démo, accessibilité ARIA.

**Build** — le back n'a pas d'étape de compilation (JavaScript exécuté par Node) ;
le « build » du projet est l'**image Docker** (`code/api/Dockerfile`, multi-stage,
non-root, healthcheck) construite et smoke-testée par la CI (`code/.github/workflows/ci.yml`, 5 jobs).

## 🔐 Variables d'environnement

Modèle fourni : `code/.env.example` (à copier en `.env`, jamais commité).

| Variable | Rôle | Défaut / exemple |
|---|---|---|
| `PORT` | Port d'écoute de l'API | `5000` |
| `DATABASE_URL` | Connexion PostGIS ; **absente → mode démo** (repo mémoire) | `postgres://wtp:***@localhost:5432/wheretopark` |
| `POSTGRES_PASSWORD` | Mot de passe injecté par docker-compose | à définir |
| `JWT_SECRET` | Signature des tokens (⚠ à changer, 64 caractères aléatoires) | à définir |
| `CORS_ORIGIN` | Origine autorisée du front | `*` en dev |
| `OSRM_URL` | Itinéraires auto-hébergés (exposé au front via `/v1/config`) | `http://localhost:5001` |
| `TILE_URL` | Tuiles cartographiques auto-hébergées (optionnel) | — |

## 🔗 Dépôt et preuves
- Dépôt Git : `https://github.com/Omarovic42/wheretopark` — CI verte exigée avant fusion
  (branch protection), tag de la version rendue : `v1.0.0-bloc2`.
