# Manuel d'utilisation — WhereToPark

## 1. Premiers pas

Ouvrir l'application (http://localhost:5000 ou le prototype standalone). Le badge en
haut à gauche indique le mode : **● API connectée** (fonctions complètes, temps réel)
ou **démo autonome** (simulation locale, aucune donnée envoyée).

En mode connecté, un compte de démonstration éphémère est créé automatiquement pour la
session. En production, l'inscription se fait par e-mail + mot de passe (8 caractères
minimum) ; la connexion délivre une session sécurisée de 15 minutes renouvelée
automatiquement.

## 2. Trouver une place

- **Rechercher une destination** : champ « Où allez-vous ? » — n'importe quelle
  adresse ou ville du monde. La carte s'y déplace.
- **Se localiser** : bouton 📍 (autorisation de localisation demandée par le
  navigateur — refusable, l'app reste utilisable).
- **Lire la carte** :
  - Marqueurs **P** : parkings référencés (bleu = surface, bleu marine = couvert/
    souterrain, **⚡** turquoise = borne de recharge). Cliquer → capacité, tarif,
    places PMR, opérateur.
  - **Lignes colorées** le long des rues : stationnement en voirie — vert = gratuit,
    bleu = payant, orange pointillé = zone bleue (disque), violet = résidents
    (légende dans le panneau latéral).
  - **Points ronds** : signalements de la communauté (vert = place libre,
    rouge = occupée, flèche = départ imminent…), avec leur **score de fiabilité**.
- **Zoomer à au moins le niveau ville** : les données de la zone se chargent
  automatiquement au déplacement de la carte (~1 s).

## 3. Panneau « IA prédictive »

Affiche la **probabilité de trouver une place** dans la zone visible et le **temps de
recherche estimé**, recalculés selon l'heure et la densité de signalements « libre ».
Vert > 70 % · orange 40-70 % · rouge < 40 %, avec un conseil contextuel.

## 4. Contribuer (et gagner des points)

| Action | Comment | Récompense |
|---|---|---|
| Signaler (place libre, occupée, départ imminent, parking complet, contrôle, zone bleue) | Boutons du panneau « Signaler à la communauté » | **+10 points** |
| Confirmer le signalement d'un autre | Popup du signalement → « 👍 Confirmer » | **+5 points** |

Chaque tranche de 100 points fait gagner un niveau (⭐ en haut à droite).
**Règles de qualité** : un signalement naît avec 70 % de fiabilité, monte avec les
confirmations, descend avec le temps et les infirmations ; il disparaît de la carte
quand sa fiabilité tombe à zéro. Limite anti-abus : 12 signalements par 10 minutes.

## 5. Filtres intelligents

Chips du panneau latéral : **Gratuit** (parkings `fee=no` + voirie gratuite),
**Couvert/souterrain**, **PMR ♿**, **Recharge ⚡**, **En surface**. Combinables ;
les filtres s'appliquent aux attributs réels des données OpenStreetMap.

## 6. S'y rendre

Popup d'un parking ou d'un segment de voirie → **« 🧭 Itinéraire réel »** : tracé
routier qui suit les rues, avec distance (km) et durée (min). Un nouvel itinéraire
remplace le précédent.

## 7. Fil d'activité temps réel

Les derniers signalements de **votre zone** apparaissent dans le panneau (et sur la
carte en < 1 s en mode connecté). Bouton « Confirmer » directement depuis le fil.

## 8. Accessibilité

Navigation clavier complète (Tab, contour de focus visible), libellés vocalisés pour
lecteurs d'écran sur toutes les actions, fil d'activité annoncé poliment (aria-live),
états jamais portés par la seule couleur (icônes + textes), animations réduites si le
système le demande (prefers-reduced-motion), thème sombre par défaut.

## 9. Problèmes courants

| Symptôme | Explication / solution |
|---|---|
| « zoomez pour charger les parkings » | Vue trop large : zoomer au niveau d'un quartier |
| Zone sans parkings affichés | Zone peu cartographiée dans OpenStreetMap (fréquent en rural) — élargir le rayon ou contribuer sur openstreetmap.org |
| « Overpass indisponible » | Source de données momentanément saturée : réessayer en déplaçant la carte |
| Badge « démo autonome » inattendu | L'API n'est pas joignable : vérifier http://localhost:5000/health |
| Itinéraire en ligne droite pointillée | Service d'itinéraires injoignable : mode dégradé, réessayer |
