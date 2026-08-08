# Sources de données externes

Inventaire complet de ce que UKit va chercher à l'extérieur. C'est la surface la plus fragile du
projet : ces sources appartiennent à des tiers, aucune n'offre de contrat versionné, et plusieurs
sont consommées par extraction de page plutôt que par API. Ce document doit contenir assez de détail
pour rejouer chaque appel sans lire le code.

**Il n'existe aucun intermédiaire entre l'application et ces sources** : chacune est jointe
directement depuis l'appareil. Voir [donnees-et-persistance.md](donnees-et-persistance.md) pour ce
qui est conservé localement.

Notre [base de publication](backend.md) n'est pas dans cet inventaire, et c'est délibéré : elle
porte notre propre contenu, elle ne relaie aucune de ces sources, et rien de ce qui est écrit ici —
fragilité, extraction, contrat non versionné — ne s'y applique. Ce document reste celui des sources
**tierces**.

> **Migration en cours.** La [Phase 6](phase-6/README.md) déplace la façon d'atteindre ces sources
> depuis le code vers des [Blueprints](blueprints.md) : ce document reste **le** document à lire
> avant toute intervention réseau, et il gagne, source par source, le nom du Blueprint qui la porte
> et ce qui est resté applicatif. Ce qui est décrit ci-dessous est l'état du code ; chaque jalon de
> migration met à jour la section concernée.

## Vue d'ensemble

| # | Source | Rôle | Authentification | Fragilité |
|---|---|---|---|---|
| 1 | Celcat (`ukit.kbdev.io`) | emplois du temps, groupes, salles | aucune | moyenne — API interne non documentée |
| 2 | CAS / ENT Université de Bordeaux | identité étudiant, messagerie | identifiants universitaires | **élevée** — extraction de pages HTML |
| 3 | Affluences | bibliothèques, affluence, horaires | aucune (en-têtes imités) | moyenne — API privée d'une application web. **Trois Blueprints** depuis [6-D](phase-6/6-d-campus.md) |
| 4 | Croustillant | restaurants CROUS et menus | aucune | faible — API publique documentée. **Deux Blueprints** depuis [6-D](phase-6/6-d-campus.md) |
| 5 | ~~jsDelivr / `ukit-data`~~ | ~~annonces de vie étudiante~~ | — | **sortie de l'inventaire** — passée en base au jalon [6-B](phase-6/6-b-supabase.md) |
| 6 | GitHub raw | fichier de version applicative | aucune | faible |
| 7 | CDN de rendu de carte | tuiles OpenStreetMap, bibliothèque Leaflet | aucune | faible |

## 1. Celcat — emplois du temps

Serveur de planning de l'université, exposé derrière `https://ukit.kbdev.io/Home/`. Constantes dans
[`urls.ts`](../src/shared/constants/urls.ts) (`WebApiURL`). Deux consommateurs :
[`PlanningApiService`](../src/features/Planning/services/PlanningApiService.ts) pour les groupes,
[`CampusApiService`](../src/features/Campus/services/CampusApiService.ts) pour les salles.

### Lister des ressources

```http
GET https://ukit.kbdev.io/Home/ReadResourceListItems
    ?searchTerm=_&pageSize=10000&resType=<103|102>
```

`resType` sélectionne la famille de ressources : **103 = groupes d'étudiants**, **102 = salles**.
Réponse : `{ results: [{ id, text, ... }] }`.

- Groupes — on ne garde que `id`, on écarte les identifiants de moins de 3 caractères, on trie
  alphabétiquement.
- Salles — on garde `{ id, name: text }` pour les entrées dont `text` fait plus de 2 caractères.

### Récupérer un calendrier

```http
POST https://ukit.kbdev.io/Home/GetCalendarData
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: application/json

start=YYYY-MM-DD&end=YYYY-MM-DD&resType=103&calView=agendaDay
&federationIds[]=<identifiant>&colourScheme=3
```

Points à respecter, tous appris à l'usage :

- Le corps est **encodé en formulaire**, jamais en JSON. `qs.stringify(data, { arrayFormat: 'repeat' })`
  produit `federationIds[]=A&federationIds[]=B` — c'est la forme attendue pour interroger plusieurs
  ressources d'un coup (plusieurs groupes favoris, ou toutes les salles d'un bâtiment).
- `calView` vaut `agendaDay` ou `agendaWeek` selon la fenêtre demandée. `resType` doit correspondre à
  la famille des identifiants passés.
- `colourScheme=3` détermine la palette renvoyée dans `backgroundColor` ; c'est cette couleur qui
  colore les cartes de cours dans l'application.
- `end` est **exclusif** : pour une journée on envoie le lendemain, et on refiltre côté client sur la
  date exacte (le serveur renvoie des débordements).

### Forme d'un événement

```ts
interface RawPlanningEvent {
    id: string;
    eventCategory: string;      // "CM", "TD", "TP", "Examen", "Vacances"…
    start: string;              // ISO
    end: string;                // ISO
    backgroundColor: string;
    description: string;        // HTML échappé, multi-lignes
    modules: string[] | null;   // intitulés de matière
}
```

### Transformation appliquée

`PlanningApiService.parseEvent` produit un `PlanningEvent` applicatif :

1. Les événements de catégorie `Vacances` sont **écartés** systématiquement.
2. Le sujet vient du premier élément de `modules` ; si `modules` est `null`, on retombe sur
   `eventCategory`.
3. `description` est nettoyée par
   [`formatDescription`](../src/shared/utils/formatUtils.ts) : suppression des `\r` et des `<br />`,
   remplacement de quatre sauts de ligne consécutifs par `;`, puis décodage des entités HTML. Les
   lignes qui répètent la catégorie ou le sujet sont retirées.
4. Le **séparateur de description dépend de la vue** : `;` pour le jour et la synchronisation
   calendrier, `\n` pour la semaine. Cette différence est délibérée — le serveur ne formate pas la
   description de la même façon selon `calView`.
5. Le code d'UE est extrait du sujet par l'expression `([0-9][A-Z0-9]+) (.+)` : `4TIN301U Algorithmique`
   devient `UE = "4TIN301U"`, `subject = "Algorithmique"`. C'est ce code qui alimente les filtres.
6. Le tri est double : heure de début, puis sujet alphabétique **après retrait du code d'UE**.

### Gestion d'erreur

Toutes les méthodes renvoient `null` en cas d'échec (statut non-200, exception réseau, réponse vide).
Aucune exception ne remonte à l'appelant.

### Fragilité

L'API n'est pas documentée publiquement et le domaine `ukit.kbdev.io` est un point d'entrée dédié.
Les constantes `resType`, `calView` et `colourScheme` sont des valeurs magiques : un changement côté
serveur se traduirait par une réponse vide, pas par une erreur explicite.

## 2. CAS / ENT Université de Bordeaux — identité et messagerie

La source la plus fragile : il n'y a **pas d'API**. UKit ouvre une WebView invisible, se connecte au
CAS, puis extrait les informations des pages rendues.

Implémentation : [`ScolariteWebSession.tsx`](../src/features/Scolarite/components/ScolariteWebSession.tsx)
(la session), [`CredentialsContext.tsx`](../src/features/Scolarite/services/CredentialsContext.tsx)
(l'état). Parcours utilisateur détaillé dans [features/scolarite.md](features/scolarite.md).

### Hôtes traversés

| Hôte | Rôle |
|---|---|
| `cas.u-bordeaux.fr` | authentification centralisée |
| `ent.u-bordeaux.fr` / `intranet.u-bordeaux.fr` | portail — prénom de l'étudiant |
| `mondossierweb.u-bordeaux.fr` | dossier administratif — numéro étudiant, INE, mail, date de naissance |
| `webmel.u-bordeaux.fr` | messagerie — nombre de messages non lus |
| `apogee.u-bordeaux.fr` | notes et résultats — atteignable via le navigateur intégré, non extrait |

### Enchaînement

La WebView démarre sur `https://ent.u-bordeaux.fr`, ce qui provoque une redirection vers le CAS. Une
machine à états portée par `phaseRef` pilote la suite, en réagissant à l'URL de chaque fin de
chargement :

```text
mode "cold" (premier login) :  login → ent → dossier → mail → done
mode "hot"  (lancements suivants) :  login → mail → done
```

Le mode est choisi par `CredentialsContext` : `hot` si des données froides sont déjà en SecureStore,
`cold` sinon. Le mode `hot` évite de re-parcourir des pages lourdes à chaque lancement.

### Étape 1 — connexion CAS

Script injecté sur `cas.u-bordeaux.fr` :

- si `#msg.success` est présent, la session est déjà ouverte : redirection vers l'ENT ;
- si `.alert-danger`, `#msg.errors` ou `.errors` contient du texte, un événement `LOGIN_FAILED` est
  émis ;
- sinon, remplissage de `#username` et `#password`, puis clic sur le bouton de soumission
  (`input[type=submit]`, `button[type=submit]` ou `.btn-submit`), avec repli sur `form#fm1.submit()`.

Les identifiants sont injectés via `JSON.stringify` pour échapper correctement les caractères
spéciaux du mot de passe.

### Étape 2 — prénom depuis l'ENT

Cinq sélecteurs sont essayés dans l'ordre (`.text-brand.home-title-alt`, `.home-title-alt`,
`[class*="home-title-alt"]`, `.home-hero-title .text-brand`, `[class*="hero-title"] [class*="brand"]`),
avec un dernier recours par expression régulière sur le texte de la page
(`/(?:Bonjour|Bonsoir)[\s,]*([A-Za-zÀ-ž'-]{2,26})\s*!/`). Le résultat n'est retenu que s'il fait moins
de 40 caractères.

Le portail étant rendu progressivement, un `MutationObserver` réessaie jusqu'à obtenir une valeur,
avec un plafond de **18 s** au-delà duquel un prénom vide est émis plutôt que de bloquer la session.

### Étape 3 — dossier administratif

La page est une application GWT. Le hash `#!etatCivilView` est restauré s'il a été perdu pendant la
redirection CAS, puis quatre champs sont lus **par identifiant DOM positionnel** :

| Identifiant | Donnée |
|---|---|
| `gwt-uid-41` | numéro étudiant |
| `gwt-uid-43` | INE |
| `gwt-uid-47` | adresse mail |
| `gwt-uid-51` | date de naissance |

Même mécanisme d'observation, plafond de **20 s**, après quoi les valeurs disponibles sont émises même
incomplètes (accompagnées d'un événement de débogage).

> Ces identifiants sont attribués par GWT selon l'ordre de construction du DOM. Toute modification de
> la page côté université les décale silencieusement : l'extraction renverra alors des champs vides ou
> mélangés, sans erreur. C'est la fragilité la plus sérieuse du projet.

### Étape 4 — messagerie

Lecture de `#zti__main_Mail__2_textCell`, dont le texte a la forme `Réception (760)`. Le nombre est
extrait par `/\((\d+)\)/` ; l'absence de parenthèses est interprétée comme zéro non lu. Plafond de
**18 s**, après quoi `unreadCount: null` est émis.

### Événements remontés

La WebView communique avec React par `window.ReactNativeWebView.postMessage` :

| Type | Charge utile | Effet |
|---|---|---|
| `LOGIN_SUCCESS` | — | validation des identifiants, écriture en SecureStore |
| `LOGIN_FAILED` | — | rejet, session interrompue |
| `PROGRESS` | `step` : `connecting`, `profile`, `dossier`, `mailbox` | avancement affiché |
| `ENT_DATA` | `firstName` | fusion dans les données froides |
| `DOSSIER_DATA` | `studentNumber`, `ine`, `emailAddress`, `dateOfBirth` | fusion + écriture en SecureStore |
| `MAILBOX_DATA` | `unreadCount` | données chaudes, fin de session |
| `DEBUG` | `message` | journalisé uniquement si `__DEV__` |

Un garde-fou global de **60 s** (`SESSION_TIMEOUT_MS`) clôt la session si elle n'a pas abouti.

### Configuration de la WebView

`incognito` (aucune persistance de cookie entre sessions), `javaScriptEnabled`, `domStorageEnabled`,
`originWhitelist: ['*']`, et un **user-agent de Chrome desktop** — nécessaire pour obtenir la version
desktop de la messagerie, la version mobile n'exposant pas le même DOM. La vue est positionnée hors
écran (`left: -width - 200`, `opacity: 0`, `pointerEvents="none"`) : elle travaille sans être visible.

### Ce qui n'est jamais fait

Les identifiants ne sont **jamais** envoyés ailleurs qu'au CAS de l'université, ne transitent par
aucun serveur tiers, et sont stockés uniquement en SecureStore chiffré.

## 3. Affluences — bibliothèques universitaires

API privée de l'application web `affluences.com`. **Migrée en Blueprints** au jalon
[6-D](phase-6/6-d-campus.md) : [`LibraryService.ts`](../src/features/Campus/services/LibraryService.ts)
n'émet plus de requête, il joue trois Blueprints et travaille la donnée reçue.

| Appel | Blueprint | Ce qui est resté applicatif |
|---|---|---|
| découverte des sites autour d'**un** point | [`ukit.campus.bibliotheques`](../blueprints/ukit-campus-bibliotheques.blueprint.json) | le balayage en douze points, le dédoublonnage, le filtre de catégorie, Haversine, le tri |
| affluence en direct | [`ukit.campus.bibliotheque-affluence`](../blueprints/ukit-campus-bibliotheque-affluence.blueprint.json) | le choix entre `percentage` et `occupancy`, la couleur et le libellé d'état |
| horaires d'une semaine | [`ukit.campus.bibliotheque-horaires`](../blueprints/ukit-campus-bibliotheque-horaires.blueprint.json) | la sélection du jour affiché, le défilement |

Tous les appels portent les mêmes en-têtes, qui imitent le client web officiel :

```http
Accept: application/json, text/plain, */*
Accept-Language: fr
x-service-name: website
Origin: https://affluences.com
Referer: https://affluences.com/
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

### Découverte des sites

```http
POST https://api.affluences.com/app/v3/sites/map
Content-Type: application/json

{ "latitude": <lat>, "longitude": <lng> }
```

L'endpoint ne renvoie que les sites proches du point demandé. Pour couvrir toute la région, le service
joue **douze runs concurrents** : la position réelle de l'utilisateur, plus onze points fixes
(Bordeaux centre, campus Talence/Pessac/Gradignan, Pau, La Rochelle, Limoges, Poitiers,
Bayonne/Anglet, Périgueux, Agen, Angoulême, Niort). Les résultats sont dédoublonnés par `site.id`.

De tout cela, **une seule chose est descendue dans le Blueprint** : la requête. La liste des douze
points est une décision produit (quelles villes on couvre), pas une propriété de la source ; le filtre
de catégorie demanderait d'indexer une liste dans un prédicat, ce que la grammaire refuse des deux
côtés et volontairement ; et Haversine est du calcul, qui n'entre pas dans un Blueprint.

Seuls les sites dont `categories` contient l'identifiant **1** ou **20** sont retenus : ce sont les
catégories de bibliothèques classiques et universitaires. Le Blueprint extrait donc
`$.categories[*].id`, et l'application filtre.

> **Piège d'arité.** Un chemin d'extraction qui ne correspond à rien rend `null`, une seule
> correspondance rend **la valeur**, plusieurs rendent **la liste**. Tous les sites de la région
> n'ayant qu'une catégorie, l'extraction rend `20` et **jamais** `[20]` : c'est le cas nominal, pas
> le cas limite. `commeListe`
> ([`LibraryMapping.ts`](../src/features/Campus/services/LibraryMapping.ts)) normalise, et un test
> le verrouille.

La distance renvoyée par l'API (`estimated_distance`, relative au point de balayage) est **recalculée**
depuis la position réelle par une formule de Haversine ; elle ne sert de repli que si les coordonnées
du site manquent.

**Un point de balayage muet n'emporte plus les autres.** Les onze qui ont répondu s'affichent, et un
bandeau dit que la couverture est incomplète. Zéro réponse reste un échec plein.

### Affluence en temps réel

```http
GET https://api.affluences.com/app/v4/sites/{slug}/live-data
```

On en extrait `status.isOpen`, `status.closingAt`, `status.openingText`, et **les deux** chemins de
taux d'occupation — `liveAttendance.percentage` et `liveAttendance.occupancy`, dont les deux formes
existent selon les sites. Le choix de l'un ou de l'autre reste applicatif : un `??` n'est pas
exprimable dans une spécification d'extraction.

Un site fermé rend `liveAttendance: null` : les deux chemins ne correspondent alors à rien, et
l'extraction rend `null`. C'est un **résultat**, pas une absence de réponse. Un slug inconnu, lui,
rend un statut 404 que `expect` refuse : l'échec est rangé en `rejected`.

### Horaires

```http
GET https://api.affluences.com/app/v4/sites/{slug}/timetables?weekOffset=<n>
```

`weekOffset` vaut 0 pour la semaine courante, et se décale pour naviguer — un **entier signé**, passé
par `params` et donc encodé par le moteur. La réponse est utilisée telle quelle (`data.entries`), sous
le contrat `TimetableEntry` : le Blueprint fait descendre le sous-arbre `openingHours` sans le mettre
à plat, parce qu'une journée porte des **paires** ouverture/fermeture et que `fields` ne sait rendre
que des champs plats.

### Fragilité

API non publique : ni contrat, ni versionnement annoncé, ni garantie de disponibilité pour un client
tiers. Les identifiants de catégorie (1 et 20) restent une **constante applicative**. Le nom d'en-tête
`x-service-name`, l'`Origin`, le `Referer` et l'agent utilisateur sont des valeurs observées, pas
documentées — et c'est exactement pourquoi elles ont désormais leur place dans un fichier corrigeable
à distance plutôt que dans un binaire en attente de publication.

## 4. Croustillant — restaurants CROUS

API publique communautaire (`https://api.croustillant.menu/v1`). C'est la source la plus saine du
lot : publique, stable, versionnée dans son chemin. **Migrée en Blueprints** au jalon
[6-D](phase-6/6-d-campus.md) : [`CrousService.ts`](../src/features/Campus/services/CrousService.ts)
n'émet plus de requête.

| Appel | Blueprint | Ce qui est resté applicatif |
|---|---|---|
| `GET /regions/1/restaurants` | [`ukit.campus.restaurants`](../blueprints/ukit-campus-restaurants.blueprint.json) | Haversine, le tri, la lecture des horaires, l'URL de visuel |
| `GET /restaurants/{code}/menu` | [`ukit.campus.restaurant-menu`](../blueprints/ukit-campus-restaurant-menu.blueprint.json) | la relecture de la date, le regroupement midi/soir, les libellés de repli |
| `GET /restaurants/{code}/preview` | *aucun* — c'est une URL construite, posée dans une balise image, jamais une requête que le service émet |

Traitement appliqué :

- les établissements de `type.code === 4` sont écartés par un **prédicat `where`** dans le Blueprint
  (catégorie non pertinente pour l'application) — 12 des 41 établissements de la région ;
- `horaires` est aplati en une chaîne jointe par ` | `, avec repli sur `UNSPECIFIED_HOURS` ;
- la distance est calculée par Haversine quand la position de l'utilisateur est connue, puis la liste
  est triée du plus proche au plus lointain ;
- **la date reçue est convertie** : l'API renvoie `DD-MM-YYYY`, l'application manipule `YYYY-MM-DD`.
  Cette conversion-là reste applicative, et ce n'est pas un oubli : les filtres de date du moteur
  **produisent** un format attendu par une source, ils refusent d'en interpréter un ;
- les repas sont regroupés par `type` (`midi` / `soir`), chaque catégorie devenant
  `{ name: libelle, dishes: [libelle…] }`. Le sous-arbre `repas` descend du Blueprint **tel quel** :
  un jour porte des services, qui portent des catégories, qui portent des plats, et la grammaire de
  `fields` est plate.

> **`horaires` n'est plus un tableau.** La source le sert désormais comme une **chaîne JSON**
> (`"[\"du lundi au vendredi\", \"12h-13h45\"]"`). Le test `Array.isArray` d'origine était donc faux
> pour les 41 restaurants, et l'application affichait « horaires non spécifiés » partout. Mesuré et
> corrigé au jalon [6-D](phase-6/6-d-campus.md) : les deux formes sont acceptées, une troisième
> retombe sur le libellé.

> **Plus de la moitié des restaurants rendent `404` sur `/menu`.** 24 des 41, dont 8 que
> l'application affiche. Ce n'est pas une panne, c'est « ce restaurant ne publie pas de menu » — donc
> le Blueprint ne porte **pas** d'`expect`, et un step `assert` accepte 200 **ou** 404 en refusant
> tout le reste. Un `expect: {status: 200}` aurait transformé un état vide fréquent en message
> d'erreur.

Le site du fournisseur est crédité dans l'écran À propos (`URL.CROUSTILLANT_WEBSITE`).

## 5. jsDelivr — données éditoriales (sortie de l'inventaire)

> **Cette source n'en est plus une.** Les annonces de vie étudiante sont lues dans la table
> `annonces` de notre [base de publication](backend.md) depuis le jalon
> [6-B](phase-6/6-b-supabase.md), et le dépôt `KAE-Lab/ukit-data` **cesse d'être écrit**. Le contrat,
> la façon de publier et les chemins dégradés sont décrits dans
> [features/campus-vie-etudiante.md](features/campus-vie-etudiante.md).
>
> La section est conservée parce que le dépôt n'est **pas supprimé** : il continue de servir les
> visuels référencés par les versions de l'application déjà installées, qui ne se mettent pas à jour
> toutes seules.

Ce que le dépôt sert encore, et qui n'est plus lu par le code actuel :

```http
GET https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/annonces.json
GET https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/images/…
```

> **Le dernier lien est coupé.** Le champ `image` de [`locations.json`](../assets/locations.json)
> pointait encore vers ce dépôt ; il est repointé sur le bucket `media` au jalon
> [6-D](phase-6/6-d-campus.md), avec la table `batiments` qui surcouche désormais le fichier. Le
> fichier embarqué reste le socle hors ligne du référentiel — c'est le distant qui le met à jour, et
> jamais l'inverse.

Le Blueprint [`ukit.campus.annonces`](../blueprints/ukit-campus-annonces.blueprint.json), qui portait
cette source au jalon [6-A](phase-6/6-a-socle.md), reste dans le dépôt comme témoin du format. Il
n'est plus joué.

## 6. GitHub raw — version applicative

```http
GET https://raw.githubusercontent.com/KAE-Lab/UKit/master/VERSION
```

Comparée à la version du manifeste Expo par `UpdateAlert`
([`AppUI.tsx`](../src/shared/ui/AppUI.tsx)) pour proposer une mise à jour vers le store. Voir
[plateforme.md](plateforme.md) — ce mécanisme est actuellement inactif.

## 7. Rendu cartographique

`MapScreen` charge dans une WebView une page HTML qui référence :

- `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css` et `leaflet.js` ;
- les tuiles `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
  (fond CartoDB Voyager, données OpenStreetMap).

Détails et raison de ce choix dans [cartographie.md](cartographie.md).

## Modèle d'erreur commun

Les services non migrés ne propagent aucune exception. Les conventions de repli sont :

| Service | Valeur en cas d'échec |
|---|---|
| `PlanningApiService`, `CampusApiService` | `null` |

C'est un choix cohérent avec le fonctionnement hors ligne (l'appelant retombe sur le cache ou sur un
état vide), mais il a une conséquence : **une panne du fournisseur et une réponse légitimement vide
sont indistinguables**. Un écran affichant « aucun résultat » peut donc masquer une source
indisponible. Toute évolution de ce modèle doit être décidée globalement, pas service par service.

C'est exactement ce que fait la [Phase 6](phase-6/README.md), et c'est son changement le plus
structurant : un échec devient **typé** et rangé dans une famille d'écran — source en panne, réponse
inattendue, contenu introuvable, identifiants manquants, échec nommé par le Blueprint — et une liste
vide redevient une liste vide. Le tableau ci-dessus rétrécit source par source, au rythme de la
migration ([blueprints.md](blueprints.md#les-erreurs-cessent-dêtre-avalées)).

**`BdeService` en est sorti pour de bon** au jalon [6-B](phase-6/6-b-supabase.md), et il sert de
gabarit aux suivants. Son échec n'est plus seulement journalisé : il est **rendu** à l'appelant
(`{ ok: false, failure }`), et l'écran de vie étudiante l'affiche — message de la famille, et bouton
Réessayer quand réessayer peut réparer quelque chose. Le repli qui masquait tout a été retiré en même
temps ; c'est lui qui rendait la distinction invisible.

**`CrousService` et `LibraryService` en sont sortis** au jalon [6-D](phase-6/6-d-campus.md), sur le
même gabarit. Leurs cinq méthodes rendent une union `{ ok: true, … } | { ok: false, failure }` ; les
types de données (`CrousRestaurant`, `CrousDayMenu`, `LibraryInfo`, `AffluencesData`,
`TimetableEntry`) n'ont **pas** bougé. Une nuance de plus y apparaît, propre au balayage en douze
points : une couverture **partielle** n'est ni un succès muet ni un échec, elle se dit par un bandeau
au-dessus de la liste.

La forme du résultat est calquée sur `BlueprintRun` du socle, délibérément : qu'une donnée vienne
d'un Blueprint ou d'une table, l'écran voit la même grammaire d'échec.

## Vérifier

Pour chaque source touchée par un changement, jouer le chemin nominal **et** le chemin dégradé :

- Mode avion : l'écran doit afficher le cache daté (planning) ou un état explicite (Campus).
- Source injoignable : couper le réseau après le lancement, naviguer, vérifier l'absence de plantage.
- Session universitaire : tester un mot de passe erroné (`LOGIN_FAILED` attendu) et un compte valide
  sans données froides (parcours `cold` complet).

Pour une source **migrée en Blueprint**, il y a mieux que le mode avion, et c'est la démonstration du
dispositif : modifier le fichier de [`blueprints/`](../blueprints/) — un hôte en `.invalid`, un
`expect` impossible, un chemin d'extraction faux — produit chacune des familles d'échec à la demande,
sans toucher à la connectivité de l'appareil ni casser Metro. `npm run parity` couvre le nominal en
quelques secondes et sur les vraies sources ; c'est le chemin dégradé qui mérite l'appareil.
