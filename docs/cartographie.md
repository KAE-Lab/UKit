# Cartographie

UKit affiche des cartes **sans aucune dépendance cartographique native ni service propriétaire** :
une WebView rend une page MapLibre GL autonome, sur le style Positron servi par OpenFreeMap —
données OpenStreetMap, sans clé d'API, autorisé en production.

Implémentation : [`src/shared/map/EmbeddedMap.tsx`](../src/shared/map/EmbeddedMap.tsx), un composant
embarqué **dans les fiches** — cours ([planning.md](features/planning.md)), restaurant et
bibliothèque (via [`CampusMapSection`](../src/features/Campus/components/CampusMapSection.tsx),
[campus.md](features/campus.md)). Il n'y a plus d'écran carte dédié : il n'était atteignable que par
deux boutons d'en-tête, c'est-à-dire une capacité cachée, et la fiche de cours montrait déjà la
sienne dans la page. L'écran `Geolocation`/`MapScreen` a été retiré avec ses boutons le 2026-08-30.

## Pourquoi ce choix

`react-native-maps` impose Google Maps sur Android, donc une clé d'API, un quota facturable et le
traçage associé. Le rendu libre en WebView rend l'application indépendante de tout fournisseur
payant et évite d'envoyer la position de l'étudiant à un tiers publicitaire. C'est une décision
structurante du projet : **ne pas réintroduire `react-native-maps`**, même ponctuellement.

**L'histoire du fond de carte vaut d'être retenue**, parce qu'elle s'est déjà répétée : les tuiles
CartoDB Voyager sans clé — jolies, « gratuites » — sont passées sous un filigrane « API key
required » le 2026-08-30. Elles n'étaient gratuites que par tolérance. Les tuiles standard d'OSM,
réellement publiques, ont un style trop chargé pour une bannière de fiche. Le point d'arrivée est
**OpenFreeMap** : un service sans clé ni inscription, explicitement autorisé en production, qui sert
**Positron** — le style épuré dessiné par CARTO, passé en open source. C'est du vectoriel, d'où
**MapLibre GL** (chargé du CDN comme Leaflet l'était) à la place de Leaflet.

## Fonctionnement

`generateMapHtml(markers, theme, zoom)` produit une page HTML complète, injectée dans la WebView via
`source={{ html }}`. La page :

- charge MapLibre GL 4.7.1 depuis `unpkg.com` (CSS et JS) ;
- instancie une carte sur le style `https://tiles.openfreemap.org/styles/positron`, centrée sur le
  **premier marqueur** — l'appelant exprime son zoom en niveaux Leaflet (16 par défaut, 17 sur la
  fiche de cours) et le générateur retranche le cran d'écart de MapLibre, pour que la bascule de
  moteur ne change le cadrage d'aucune fiche ;
- désactive la rotation et l'inclinaison : une bannière de fiche se déplace et se zoome, elle ne se
  penche pas ;
- agrandit les libellés du style d'un cinquième au chargement, couche par couche et sous garde :
  Positron est calibré pour un grand écran, et ses noms de rues devenaient illisibles dans une
  bannière de fiche — qui est aussi passée un cran plus près (`zoom={17}` dans `CampusMapSection`) ;
- pose un `maplibregl.Marker` à élément HTML par entrée : la même étiquette qu'avant la bascule —
  titre sur fond `theme.primary`, flèche SVG — ancrée par sa pointe (`anchor: 'bottom'`) ; un cours
  peut en poser plusieurs, une fiche de campus n'en pose qu'un ;
- garde **l'attribution accessible**, repliée derrière son bouton d'information au chargement : la
  politique d'usage des données OSM demande une attribution atteignable, pas une bande dépliée sur
  une bannière de 180 points — le CSS qui la masquait entièrement, lui, est retiré.

Le thème de l'application est injecté dans le HTML généré : la carte suit donc le mode clair ou
sombre pour son fond et la couleur du marqueur.

La WebView est rendue avec `scrollEnabled={false}` — le défilement appartient à la carte, pas au
document. Le composant remplit son parent : c'est l'appelant qui décide la hauteur (pleine hauteur
restante sous la fiche de cours, bannière de 180 points dans une fiche de campus) et qui porte la
surface — rayon, filet, ombre.

Un bouton posé sur la carte ouvre le point dans l'application de cartes du système, via
`URL.MAP + search/?api=1&query=<lat>,<lng>` — le geste secondaire vit sur la carte, plus dans un
en-tête.

Les coordonnées arrivent toujours en `{ lat, lng }` : c'est la convention de l'application
(référentiel, bibliothèques), et le `lon` de Croustillant est traduit **à la frontière**, au moment
de naviguer vers la fiche du restaurant. L'ancien écran acceptait les deux noms, ce qui répandait la
dualité chez tous ses appelants.

> **Capture attendue** — `fiche-carte.png` : la section « S'y rendre » d'une fiche de restaurant,
> marqueur étiqueté au thème de l'application.

## Le référentiel des bâtiments

**73 entrées**, indexées par leur code de bâtiment (`A0`, `A28`, `B18`…). Il a deux sources et un
seul gagnant : [`assets/locations.json`](../assets/locations.json) est le **socle embarqué**, et la
table `batiments` de la [base de publication](backend.md) le **surcouche** champ par champ depuis le
jalon [6-D](phase-6/6-d-campus.md).

Le code ne lit ni l'un ni l'autre directement : il passe par
[`shared/locations/referentiel.ts`](../src/shared/locations/referentiel.ts), dont les accesseurs
`getBuildingRef(code)` et `allBuildingRefs()` sont **synchrones** — quatre appelants lisent ce
référentiel pendant un rendu, et rien ici n'a de raison d'attendre le réseau.

```json
{
  "A28": {
    "lat": 44.807755,
    "lng": -0.597381,
    "freeAccess": true,
    "image": "https://<projet>.supabase.co/storage/v1/object/public/media/batiments/cremi.jpg",
    "schedule": {
      "1": { "open": "07:45", "close": "22:00" },
      "6": { "open": "07:45", "close": "18:00" }
    }
  }
}
```

| Champ | Présence | Colonne | Rôle |
|---|---|---|---|
| `lat`, `lng` | 73 / 73 | `latitude`, `longitude` | coordonnées du bâtiment |
| `freeAccess` | 1 / 73 | `acces_libre` | le bâtiment est éligible aux [salles libres](features/campus-salles-libres.md) |
| `image` | 1 / 73 | `image_url` | visuel affiché sur la fiche du bâtiment |
| `schedule` | 1 / 73 | `horaires` | horaires d'ouverture, indexés par jour ISO (`1` = lundi … `7` = dimanche) ; un jour absent signifie fermé |
| `campus` | 0 / 73 | `campus` | libellé de campus ; à défaut, `Talence` |

Les quatre derniers champs n'ont de sens que pour un bâtiment en accès libre : ils sont donc
renseignés uniquement là où `freeAccess` est vrai.

### Comment la surcouche s'applique

Champ par champ, et **jamais** en écrasant avec du vide : une colonne nulle laisse la valeur
embarquée en place. C'est ce qui permet de publier une ligne partielle — corriger un seul horaire —
sans risquer de faire disparaître une carte, et c'est verrouillé par un test
([`referentiel.test.ts`](../src/shared/locations/referentiel.test.ts)).

| Situation | Résultat |
|---|---|
| La table est joignable | ses valeurs non nulles gagnent, les autres champs restent ceux du fichier |
| Un code n'est que dans la table | il est **ajouté** — un bâtiment est une coordonnée, pas de la donnée exécutable |
| Un code n'est que dans le fichier | il reste tel quel |
| La table est injoignable | la dernière surcouche connue (cache local), sinon le fichier seul |
| Aucune base configurée | le fichier seul, et l'application est complète |

## Extraction d'un lieu depuis un cours

[`AppCore.tsx`](../src/shared/services/AppCore.tsx) expose trois fonctions qui font le lien entre un
cours et le référentiel. **La première est la seule qui lise une donnée ; les deux autres devinent**,
et l'ordre d'essai de la fiche de cours suit exactement cette hiérarchie :

- **`lieuxDesSites(sites)`** — les bâtiments que la source **déclare** (`Bâtiment A28`), réduits au
  code par le même format d'établissement que les libellés de salle. Extrait des Blueprints Celcat
  depuis le 2026-08-22 ; absent d'un export iCalendar, où les replis reprennent la main.

- **`getLocations(str)`** — découpe la description sur ` | `, prend pour chaque segment la partie
  avant `/`, retire les espaces, et retourne les bâtiments trouvés. Format visé :
  `A28/Salle 001 | A22/Amphi B`.
- **`getLocationsInText(str)`** — repli : cherche le premier motif `lettre majuscule + chiffres`
  (`/([A-Z][0-9]+)/im`) n'importe où dans le texte. Utilisé quand la description ne suit pas le format
  attendu.

Un code introuvable dans `locations.json` est silencieusement ignoré : le cours s'affiche alors sans
bouton de localisation. C'est voulu — **une carte fausse est pire qu'une carte vide** — mais c'est
aussi ce qui rendait les deux causes de cartes manquantes invisibles pendant des mois
([features/planning.md](features/planning.md#décisions-de-conception)).

## Ajouter ou corriger un bâtiment

Deux chemins, et il faut choisir le bon :

**Une correction urgente — un horaire faux, une coordonnée décalée, un visuel remplacé — passe par la
table `batiments`**, et arrive sur les appareils au rafraîchissement suivant, sans release. C'est le
défaut le plus banal du référentiel, et c'est exactement ce que la surcouche du jalon
[6-D](phase-6/6-d-campus.md) existe pour réparer.

**Un ajout durable passe par le fichier embarqué**, parce que le socle doit rester complet hors ligne
et au premier lancement :

1. Relever les coordonnées (latitude, longitude en degrés décimaux, WGS 84).
2. Ajouter l'entrée dans `assets/locations.json`, **avec exactement le code utilisé par Celcat** dans
   les descriptions de cours — c'est cette clé qui fait la correspondance.
3. Pour un bâtiment en accès libre, ajouter `freeAccess`, `image` et `schedule` complet. Le bâtiment
   apparaîtra automatiquement dans les salles libres au prochain rafraîchissement de la liste (cache
   de 7 jours, voir [donnees-et-persistance.md](donnees-et-persistance.md)).
4. Reporter l'entrée dans la table, pour que les deux ne divergent pas.

## Vérifier

- Ouvrir un cours localisé : la carte est dans la fiche, le marqueur porte le bon libellé et se situe
  sur le bon bâtiment.
- Ouvrir une fiche de restaurant puis une fiche de BU : la section « S'y rendre » est en pied de
  page, centrée sur le bon point — et absente si le lieu n'a pas de coordonnées, sans carte vide.
- Basculer en mode sombre et rouvrir une fiche : fond et marqueur doivent suivre le thème.
- Toucher le bouton posé sur la carte : le point s'ouvre dans l'application de cartes du système.

## Limites connues

- **MapLibre est chargé depuis un CDN.** Sans connexion, la carte reste vide : la page HTML est
  locale, mais la bibliothèque et les tuiles ne le sont pas. Le rendu est en WebGL — un appareil ou
  une WebView qui ne le porte pas laisse la carte vide, sans erreur.
- **Le socle embarqué est figé dans le binaire**, mais il n'est plus seul : depuis le jalon
  [6-D](phase-6/6-d-campus.md), la table `batiments` le corrige et peut même y ajouter un lieu sans
  release. Ce qui exige toujours une publication de l'application, c'est de garantir qu'un nouveau
  bâtiment est visible **hors ligne et au premier lancement**.
- **La correspondance dépend du format de description Celcat.** Un changement de format côté serveur
  fait disparaître les boutons de localisation sans erreur visible.
- **Une carte dans un défilement capture le geste vertical** : commencer à faire défiler la page le
  doigt posé sur la bannière déplace la carte, pas la page. C'est le comportement de la fiche de
  cours depuis toujours, et la bannière de 180 points le rend peu gênant.
