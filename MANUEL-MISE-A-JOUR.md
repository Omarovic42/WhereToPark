# Manuel de mise à jour — WhereToPark

## 1. Mise à jour des dépendances (processus outillé)

**Surveillance automatique** : Dependabot (`.github/dependabot.yml`) scanne chaque
lundi les dépendances npm, les actions GitHub et les images Docker, et ouvre des PR
(mineurs/patch regroupés). **Chaque PR rejoue l'intégralité de la CI** (audit, tests,
k6, build) : rien ne se met à jour sans preuve.

**Décision selon le type de version** :
| Type | Procédure |
|---|---|
| Patch | Fusion après CI verte |
| Mineur | CI verte + vérification manuelle de la fonctionnalité concernée |
| **Majeur** | Branche d'essai, lecture du changelog amont, exécution du cahier de recettes, fusion planifiée en sprint |

**Vulnérabilités** : `npm audit --audit-level=high` est bloquant en CI. CVE sans
correctif amont → override npm temporaire documenté dans `CHANGELOG.md` + ticket de
suivi.

## 2. Mise à jour de l'application (nouvelle version)

1. Développer sur branche → PR → CI verte → merge `preprod` → validation → `main`.
2. Mettre à jour `CHANGELOG.md` (fonctionnalités, correctifs B-xx référencés).
3. Taguer : `git tag vX.Y.Z && git push --tags`.
4. Déployer (cf. Manuel de déploiement §6) ; images Docker immuables par SHA.
5. Vérifications post-déploiement (checklist du manuel de déploiement).

## 3. Mise à jour du schéma de base de données

Migrations SQL versionnées dans `db/` (ordre numérique : `001_init.sql`, `002_….sql`).
Règles : migrations **additives d'abord** (ajouter avant de supprimer, en deux
versions) pour rester compatible pendant le déploiement progressif ; toute migration
testée sur préproduction avec un dump de production anonymisé ; sauvegarde avant
migration en production.

## 4. Mise à jour des données et fournisseurs externes

- **OSRM auto-hébergé** : re-télécharger l'extrait et relancer
  `bash scripts/osrm-prepare.sh` (recommandé : mensuel), puis redémarrer le service.
- **Changer de fournisseur** (ex. brancher Parkopedia) : écrire un nouvel adapter du
  port DataProvider — aucun impact sur le domaine ni sur les clients.
- **Bascule d'URL de service** : variables `OSRM_URL` / `TILE_URL` + redémarrage API ;
  le front suit via `/v1/config`, sans rebuild.

## 5. Retour arrière (rollback)

- Application : redéployer l'image du SHA précédent (`docker compose` : re-taguer ;
  cloud : `helm rollback` / révision précédente) — < 5 minutes.
- Base : les migrations additives rendent le rollback applicatif sûr ; sinon restaurer
  la sauvegarde prise avant migration.
- Consigner l'incident dans le registre d'anomalies (processus du Bloc 4).
