# Journal des versions — WhereToPark
Format : [Keep a Changelog](https://keepachangelog.com/fr/) · Versionnage sémantique.
Chaque version = un tag Git ; les correctifs référencent le registre d'anomalies (B-xx).

## [1.1.2] — correctif affichage
### Corrigé
- Retrait du panneau « Affichage clair » (thème blanc) qui masquait les valeurs
  (texte blanc sur fond blanc) et forçait un thème inadapté. L'application revient
  au thème sombre par défaut ; les données (probabilité, ETA, parkings, signalements)
  restent affichées dans le panneau latéral droit.

## [1.1.1] — robustesse données & accessibilité visuelle
### Ajouté
- Failover Overpass sur trois miroirs (overpass-api.de, lz4, kumi.systems) avec
  journalisation — le proxy /v1/osm/parkings bascule automatiquement en cas d'échec.
- Front : `API_BASE` adaptatif (fonctionne aussi en ouverture directe file://).
- Chargement des parkings via le proxy API (cache + failover) plutôt qu'appel direct
  à Overpass depuis le navigateur.

## [1.1.0] — pack production & conformité
### Ajouté
- Production HTTPS : `docker-compose.prod.yml` (nginx reverse proxy + certbot
  Let's Encrypt, HSTS, WebSocket) + `deploy/nginx.conf.template`.
- Déploiement continu : `.github/workflows/cd.yml` (workflow_run après CI verte sur
  main → image GHCR immuable par SHA → déploiement SSH avec approbation manuelle).
- RGPD : droit à l'effacement — `DELETE /v1/auth/me` (compte + signalements), adapters
  memory et postgres (CASCADE), 2 tests (42 au total).
- Pages légales servies par l'app (`web/legal.html` : CGU + politique de
  confidentialité) + liens footer + consentement explicite avant géolocalisation.
- Dossier Bloc 4 au format Word (charte du Bloc 2) ; guides
  `docs/DEPLOIEMENT-PRODUCTION.md` et `docs/commercialisation/COMMERCIALISATION.md`.

## [1.0.0] — version présentée au jury (tag `v1.0.0-bloc2`)
### Ajouté
- Test de charge k6 réel (`api/tests/perf/health-load.js`) + job CI `performance` à
  seuils bloquants (p95 < 200 ms, erreurs < 1 %) — mesure de référence : p95 = 3,4 ms.
- Réalignement du dossier Bloc 2 sur le pipeline réellement exécuté (jobs Flutter et
  SonarQube explicitement marqués « cible Bloc 3 »).
- Auto-hébergement OSRM : `docker-compose.selfhost.yml`, `scripts/osrm-prepare.sh`,
  bascule dynamique via `GET /v1/config` (front + 2 tests).
- Dependabot (npm, actions, docker) — processus de mise à jour des dépendances (BC04).
- Documentation : GUIDE-COMPLET, PROMPT-VSCODE, découpage docs/ par blocs RNCP.

## [0.9.0] — voirie mondiale
### Ajouté
- Stationnement en voirie OSM : requête Overpass étendue (`out geom`), classification
  des deux schémas de tags (`parking:lane:*` legacy et `parking:left/right/both`),
  rendu polylignes colorées par condition + légende ; module de domaine
  `streetParking.js` (6 tests) ; segments normalisés dans le proxy `/v1/osm/parkings`.

## [0.8.0] — données mondiales réelles
### Ajouté
- Parkings mondiaux OpenStreetMap (Overpass) avec cache par zone et debounce.
- Recherche mondiale Nominatim ; itinéraires routiers réels OSRM ; géolocalisation.
- Proxy API `/v1/osm/parkings` (fetcher injectable, cache 10 min, 502 maîtrisé).
- Identité visuelle : logo (header, favicon), couverture du dossier.

## [0.7.0] — industrialisation
### Ajouté
- Dockerfile multi-stage non-root + HEALTHCHECK ; docker-compose (API + PostGIS,
  init SQL automatique) ; CI GitHub Actions 4 jobs (audit bloquant, gitleaks,
  tests, build + smoke test) ; métriques Prometheus `/metrics`.
### Corrigé
- **B-05 (critique)** : CD déclenchée en parallèle de la CI → passage à `workflow_run`
  conditionné au succès de la CI.
- **B-07 (critique)** : divergence du serveur → images immuables par SHA + rollback Helm.

## [0.6.0] — recette & durcissement
### Corrigé
- **B-02 (majeur)** : score de fiabilité figé → décroissance temporelle + test.
- **B-03 (majeur)** : doublons de marqueurs au zoom → déduplication par id.
- **B-04 (majeur)** : prédiction > 100 % → bornage strict 0–100 + test sur 24 h.
- **B-06 (mineur)** : carte claire la nuit → thème sombre par défaut.

## [0.5.0] — prédiction & gamification
### Ajouté
- Heuristique de prédiction v1 (heure + densité, port PredictionEngine) ; points,
  niveaux, confirmations (+5), signalements (+10).

## [0.3.0] — cœur communautaire
### Ajouté
- Auth JWT (bcrypt), signalements géolocalisés, quota anti-spam 12/10 min,
  score de fiabilité, diffusion Socket.IO par rooms geohash, adapter PostGIS
  (ST_DWithin + GIST), migration `db/001_init.sql`.
### Corrigé
- **B-01 (critique)** : diffusion à toute la ville → rooms geohash niveau 6
  (fiche de consignation complète : docs/bloc4-maintenance).

## [0.1.0] — fondations
### Ajouté
- Monorepo, architecture hexagonale (domaine pur / adapters / composition root),
  repository mémoire, premiers tests, prototype carte.
