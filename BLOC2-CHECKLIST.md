# ✅ BLOC 2 — Checklist de conformité au référentiel

> **Modalité officielle :** dossier écrit — le candidat remet le **code source** et la
> **documentation associée**. Ce fichier vérifie, livrable par livrable exigé par la fiche
> RNCP 39583, où chaque élément se trouve dans le projet.

| Livrable exigé par la fiche | ✔ | Où le trouver |
|---|---|---|
| Le protocole de déploiement continu | ✔ | Dossier §« Protocole de déploiement continu » + diagramme d6 + `.github/workflows/ci.yml` (déclencheurs) |
| Les critères de qualité et de performance | ✔ | Dossier §C2.1.1 tableau « Critères de qualité et de performance » |
| Le protocole d'intégration continue | ✔ | Dossier §C2.1.2 + diagramme d5 + `.github/workflows/ci.yml` (4 jobs) |
| Une architecture logicielle structurée permettant la maintenabilité | ✔ | Dossier §C2.2.1 + diagramme d1 + code : `api/src/domain` / `repositories` / `app.js` (hexagonal vérifiable) |
| Une présentation d'un des prototypes réalisés | ✔ | Dossier §C2.2.1 + `web/index.html` + `docs/prototype-standalone.html` |
| L'utilisation de frameworks et des paradigmes de développement | ✔ | Dossier § justification des choix + GUIDE-COMPLET §2 (ports & adapters, Strategy, composition root, DI) |
| Un jeu de tests unitaires couvrant une fonctionnalité demandée | ✔ | `api/tests/` — 42 tests ; exemple bout-en-bout : signalement (validation → quota 429 → +10 pts → broadcast room) |
| Les mesures de sécurité mises en œuvre | ✔ | Dossier §C2.2.3 (OWASP Top 10:2025 + RGPD) + code : guard JWT, bcrypt, requêtes paramétrées, headers, quota |
| Les actions pour l'accès aux personnes en situation de handicap | ✔ | Dossier § Accessibilité (RGAA/WCAG/RAAM) + front : aria-*, Semantics prévus Flutter, info jamais portée par la seule couleur |
| L'historique des différentes versions | ✔ | Dossier §C2.2.4 + **`CHANGELOG.md`** (racine) + tags Git à créer au push (`v1.0.0-bloc2`) |
| La dernière version du logiciel fonctionnel, fiable et viable | ✔ | Le dépôt lui-même : `docker compose up` → app complète ; 40/42 tests |
| Le cahier de recettes | ✔ | Dossier §C2.3.1 — 23 scénarios RF/RT/RS/RA |
| Le plan de correction des bogues | ✔ | Dossier §C2.3.2 — registre B-01→B-07 qualifié, corrigé, prouvé |
| Le manuel de déploiement | ✔ | Dossier §C2.4.1 + `README.md` + `PROMPT-VSCODE.md` |
| Le manuel d'utilisation | ✔ | Dossier § Manuel d'utilisation (profils utilisateur/VE-PMR/modérateur/admin) |
| Le manuel de mise à jour | ✔ | Dossier § Manuel de mise à jour (dépendances, schéma, fournisseurs, rollback) |

## Actions restantes avant remise (les seules !)

1. ✅ Fait : page de garde personnalisée (Omar Madjidi · Omarovic42).
2. Pousser sur GitHub → CI verte → insérer les **captures réelles** aux emplacements
   orange « 📷 Capture à insérer » (guide dans le README, section captures).
3. Créer le tag `git tag v1.0.0-bloc2 && git push --tags`.

Fichiers du bloc : `WhereToPark-Dossier-Bloc2-RNCP39583.docx` · `diagrammes/` ·
`generateurs/` (pour régénérer le dossier après insertion de ton nom).
