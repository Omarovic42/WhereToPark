#!/usr/bin/env bash
# ═══ Préparation des données OSRM auto-hébergées (une seule fois) ═══
# Télécharge un extrait OpenStreetMap (Geofabrik) puis le pré-traite
# avec la chaîne officielle OSRM (extract → partition → customize).
# Durée : ~5 à 15 min pour une région, davantage pour un pays entier.
#
# Usage :
#   bash scripts/osrm-prepare.sh                       # Rhône-Alpes (défaut)
#   bash scripts/osrm-prepare.sh <url-geofabrik.pbf>   # autre région/pays
set -euo pipefail
REGION_URL="${1:-https://download.geofabrik.de/europe/france/rhone-alpes-latest.osm.pbf}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/osrm-data"
mkdir -p "$DIR"

if [ ! -f "$DIR/region.osm.pbf" ]; then
  echo "▸ Téléchargement de l'extrait OSM : $REGION_URL"
  curl -L --fail "$REGION_URL" -o "$DIR/region.osm.pbf"
else
  echo "▸ Extrait déjà présent : $DIR/region.osm.pbf"
fi

run() { docker run --rm -t -v "$DIR:/data" osrm/osrm-backend:latest "$@"; }
echo "▸ osrm-extract (profil voiture)…" && run osrm-extract  -p /opt/car.lua /data/region.osm.pbf
echo "▸ osrm-partition…"                && run osrm-partition /data/region.osrm
echo "▸ osrm-customize…"               && run osrm-customize /data/region.osrm

echo ""
echo "✅ Données OSRM prêtes dans osrm-data/"
echo "   Démarrer : docker compose -f docker-compose.yml -f docker-compose.selfhost.yml up -d"
echo "   Tester   : curl 'http://localhost:5001/route/v1/driving/4.3872,45.4397;4.3997,45.4433'"
