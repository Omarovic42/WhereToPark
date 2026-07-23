# Manuel de déploiement — WhereToPark

## 1. Prérequis

| Scénario | Prérequis |
|---|---|
| Mode démo (sans base) | Node.js ≥ 20 (22 recommandé), npm |
| Stack complète | Docker + Docker Compose v2 |
| Itinéraires auto-hébergés | Docker + ~2 Go disque (données routières) |

## 2. Déploiement local — mode démo (2 commandes)

```bash
cd code/api && npm install && npm start
```
→ http://localhost:5000 (API + front). Sans `DATABASE_URL`, l'API bascule sur le
repository mémoire seedé : idéal pour tester et pour la CI. Vérification :
`curl http://localhost:5000/health` → `"status":"ok","repo":"memory"`.

## 3. Déploiement complet — Docker Compose

```bash
cd code
cp .env.example .env        # définir POSTGRES_PASSWORD et JWT_SECRET (forts)
docker compose up --build -d
```
Services : `db` (PostgreSQL 16 + PostGIS, schéma `db/001_init.sql` appliqué
automatiquement au premier démarrage, healthcheck pg_isready) et `api` (démarre
après que la base est saine ; healthcheck /health intégré à l'image).
Vérifications : `docker compose ps` (tous *healthy*), `/health` → `"repo":"postgres"`.
Arrêt : `docker compose down` (les données persistent dans le volume `pgdata`).

## 4. Services externes auto-hébergés (production)

Le serveur OSRM public est un serveur de démonstration ; en production :
```bash
bash scripts/osrm-prepare.sh    # une fois : télécharge + prétraite les données (Rhône-Alpes par défaut)
docker compose -f docker-compose.yml -f docker-compose.selfhost.yml up -d
```
Le front lit `GET /v1/config` au démarrage : `OSRM_URL` défini → itinéraires calculés
par votre serveur (port 5001) ; même mécanique pour des tuiles via `TILE_URL`.
Autre région : `bash scripts/osrm-prepare.sh https://download.geofabrik.de/europe/france-latest.osm.pbf`.

## 5. Variables d'environnement

Voir le tableau complet dans `README-BLOC2.md` §Variables d'environnement.
Règles : `.env` jamais commité (`.gitignore`) ; en CI, aucun secret réel n'est
nécessaire (tests sans base, build d'image sans secret) ; en production, secrets
injectés par la plateforme (GitHub Environments / Secret Manager).

## 6. Chaîne de déploiement continu

Toute modification suit : branche → Pull Request → **CI 5 jobs obligatoirement verte**
(audit dépendances bloquant, gitleaks, 40 tests, k6 à seuils bloquants, build Docker +
smoke test) → merge `preprod` → validation → merge `main` → déploiement. Le
déploiement production cible (cloud) est progressif (canary) avec retour arrière en
une commande — protocole détaillé dans le dossier, section « Protocole de déploiement
continu ».

## 7. Vérifications post-déploiement (checklist)

- [ ] `GET /health` → 200, `status:ok`, bon `repo`
- [ ] `GET /metrics` → métriques Prometheus exposées
- [ ] Front : badge « ● API connectée », carte qui charge des parkings
- [ ] Créer un compte de test → signalement → +10 pts → visible sur un 2ᵉ client
- [ ] `GET /v1/config` → URLs des services auto-hébergés si configurés
- [ ] Logs `docker compose logs api` : JSON structurés, aucune erreur au boot
