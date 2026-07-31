# Cartographie

UKit affiche des cartes **sans aucune dépendance cartographique native ni service propriétaire** :
une WebView rend une page Leaflet autonome, sur des tuiles issues d'OpenStreetMap.

Implémentation : [`src/shared/map/MapScreen.tsx`](../src/shared/map/MapScreen.tsx), route
`Geolocation` ([navigation.md](navigation.md)).

## Pourquoi ce choix

`react-native-maps` impose Google Maps sur Android, donc une clé d'API, un quota facturable et le
traçage associé. Le remplacement par Leaflet et OpenStreetMap rend l'application indépendante de tout
fournisseur payant et évite d'envoyer la position de l'étudiant à un tiers publicitaire. C'est une
décision structurante du projet : **ne pas réintroduire `react-native-maps`**, même ponctuellement.

## Fonctionnement

`generateMapHtml(lat, lng, title, theme)` produit une page HTML complète, injectée dans la WebView
via `source={{ html }}`. La page :

- charge Leaflet 1.9.4 depuis `unpkg.com` (CSS et JS) ;
- instancie une carte centrée sur le point demandé au niveau de zoom 16, contrôles de zoom désactivés ;
- ajoute la couche de tuiles `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
  (fond CartoDB Voyager, données OpenStreetMap), `maxZoom: 19` ;
- pose un marqueur `L.divIcon` dessiné en HTML : une étiquette portant le titre, colorée avec
  `theme.primary`, surmontant une flèche SVG. `iconAnchor: [50, 45]` aligne la pointe sur la
  coordonnée exacte ;
- masque le contrôle d'attribution par CSS.

Le thème de l'application est injecté dans le HTML généré : la carte suit donc le mode clair ou
sombre pour son fond et la couleur du marqueur.

La WebView est rendue avec `scrollEnabled={false}` — le défilement appartient à Leaflet, pas au
document — sous un bandeau opaque de la hauteur de la zone sûre, puisque l'en-tête de cet écran est
transparent.

> **Capture attendue** — `carte.png` : l'écran carte sur un bâtiment du campus, marqueur étiqueté au
> thème de l'application.

## Résolution d'une position

`MapScreen` accepte deux formes de paramètre `location` :

| Forme | Origine | Résolution |
|---|---|---|
| `{ lat, lng }` ou `{ lat, lon }` | restaurants CROUS, bibliothèques | utilisée telle quelle |
| `string` | description de salle issue de Celcat | la partie avant `/` est cherchée comme clé dans `locations.json` |

Les deux noms `lng` et `lon` sont acceptés parce que les fournisseurs ne s'accordent pas :
Croustillant renvoie `lon`, Affluences et `locations.json` utilisent `lng`.

Un bouton d'en-tête ouvre le point dans l'application de cartes du système, via
`URL.MAP + search/?api=1&query=<lat>,<lng>`.

## `assets/locations.json`

Référentiel local des bâtiments du campus : **73 entrées**, indexées par leur code de bâtiment
(`A0`, `A28`, `B18`…).

```json
{
  "A28": {
    "lat": 44.807755,
    "lng": -0.597381,
    "freeAccess": true,
    "image": "https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/images/cremi.jpg",
    "schedule": {
      "1": { "open": "07:45", "close": "22:00" },
      "6": { "open": "07:45", "close": "18:00" }
    }
  }
}
```

| Champ | Présence | Rôle |
|---|---|---|
| `lat`, `lng` | 73 / 73 | coordonnées du bâtiment |
| `freeAccess` | 1 / 73 | le bâtiment est éligible aux [salles libres](features/campus-salles-libres.md) |
| `image` | 1 / 73 | visuel affiché sur la fiche du bâtiment |
| `schedule` | 1 / 73 | horaires d'ouverture, indexés par jour ISO (`1` = lundi … `7` = dimanche) ; un jour absent signifie fermé |

Les trois derniers champs n'ont de sens que pour un bâtiment en accès libre : ils sont donc renseignés
uniquement là où `freeAccess` est vrai.

## Extraction d'un lieu depuis un cours

[`AppCore.tsx`](../src/shared/services/AppCore.tsx) expose deux fonctions qui font le lien entre les
descriptions Celcat et le référentiel :

- **`getLocations(str)`** — découpe la description sur ` | `, prend pour chaque segment la partie
  avant `/`, retire les espaces, et retourne les bâtiments trouvés. Format visé :
  `A28/Salle 001 | A22/Amphi B`.
- **`getLocationsInText(str)`** — repli : cherche le premier motif `lettre majuscule + chiffres`
  (`/([A-Z][0-9]+)/im`) n'importe où dans le texte. Utilisé quand la description ne suit pas le format
  attendu.

Un code introuvable dans `locations.json` est silencieusement ignoré : le cours s'affiche alors sans
bouton de localisation.

## Ajouter un bâtiment

1. Relever les coordonnées (latitude, longitude en degrés décimaux, WGS 84).
2. Ajouter l'entrée dans `assets/locations.json`, **avec exactement le code utilisé par Celcat** dans
   les descriptions de cours — c'est cette clé qui fait la correspondance.
3. Pour un bâtiment en accès libre, ajouter `freeAccess`, `image` et `schedule` complet. Le bâtiment
   apparaîtra automatiquement dans les salles libres au prochain rafraîchissement de la liste (cache
   de 7 jours, voir [donnees-et-persistance.md](donnees-et-persistance.md)).

## Vérifier

- Ouvrir un cours localisé, toucher le bouton carte : le marqueur doit porter le bon libellé et se
  situer sur le bon bâtiment.
- Basculer en mode sombre et rouvrir la carte : fond et marqueur doivent suivre le thème.
- Depuis une fiche de restaurant ou de BU, vérifier que le bouton carte de l'en-tête ouvre le bon
  point.

## Limites connues

- **Leaflet est chargé depuis un CDN.** Sans connexion, la carte reste vide : la page HTML est locale,
  mais la bibliothèque et les tuiles ne le sont pas.
- **`locations.json` est figé dans le binaire.** Ajouter un bâtiment exige une publication de
  l'application.
- **La correspondance dépend du format de description Celcat.** Un changement de format côté serveur
  fait disparaître les boutons de localisation sans erreur visible.
- **[`OpenMapButton.tsx`](../src/shared/ui/OpenMapButton.tsx) n'est importé nulle part.** Le bouton
  d'ouverture de carte réellement utilisé est défini dans
  [`StackNavigator.tsx`](../src/shared/navigation/StackNavigator.tsx) ; ce composant est du code non
  atteint.
