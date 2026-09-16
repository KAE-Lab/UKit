# 7-A — La bande passante

> **Jalon livré le 2026-09-16.** Ouvert le 2026-09-14. Aucune publication : le jalon s'est joué sur le
> bucket et la base, et l'application 6.2.1 en profite sans mise à jour. Né de l'avertissement
> *Fair Use* de Supabase ([mise à plat](7-mise-a-plat.md)).
>
> **Le résultat en une ligne : 1 268 892 octets de visuels sont devenus 299 000, soit −76 %, et tout
> le bucket porte désormais un cache d'un an.** Ce que la réalité a corrigé du texte ci-dessous est
> écrit dans [Ce qui a été fait](#ce-qui-a-été-fait-le-2026-09-16) ; le second relevé du tableau Usage
> est attendu le 2026-09-23.

## La direction

L'egress en cache — ce que le CDN sert depuis le stockage — pesait **sept fois** l'egress de toute la
base. Les visuels sont servis en `no-cache`, à 400 ou 500 Ko l'unité, par un composant qui ne garde rien
sur disque : chaque ouverture de l'onglet Campus les redemande, chaque installation les retélécharge,
chaque remplacement (`?v=N`) les fait retélécharger à tout le parc.

Le Pro, souscrit le soir même, lève l'urgence du quota : 250 Go d'egress en cache au lieu de 5. Il ne
règle ni le forfait des étudiants, ni la vitesse. Et la 6.2.1, comme les versions d'avant, continuera de
demander les objets d'origine pendant des semaines, le temps que le parc se mette à jour : c'est donc
**sur les objets eux-mêmes** qu'il faut agir, avant même le code de [7-C](7-c-economie-et-socle.md).

## Ce qui a été mesuré le 2026-09-14

**Le tableau Usage de Supabase**, relevé par le propriétaire du produit sur la période de facturation en
cours :

| Mesure | Valeur | Quota du plan gratuit |
|---|---|---|
| Cached Egress | **10,041 Go** | 5 Go — 201 % |
| Egress | 1,371 Go | 5 Go — 27 % |
| Database Size | 0,028 Go | 0,5 Go |
| Storage Size | 0,001 Go | 1 Go — *valeur douteuse : les objets du bucket pèsent davantage* |
| Monthly Active Users | 7 | — *ce sont les comptes de la console, pas les étudiants* |
| Edge Function Invocations | 34 | — |

**Les objets servis**, en-têtes relevés par `curl -I`, c'est-à-dire en `HEAD` — lire la note sous le
tableau :

| Objet | Poids | `cache-control` | `cf-cache-status` |
|---|---|---|---|
| `media/restaurants/amazone.jpg` | 498 585 octets | `no-cache` | `REVALIDATED` |
| `media/annonces/ukit-v6.png?v=2` (un PNG) | 415 655 octets | `no-cache` | `MISS` |
| `media/annonces/campulsations-24-septembre.jpg` | 164 284 octets | `no-cache` | `REVALIDATED` |
| `blueprints/manifest.json` | 5 855 octets | `no-cache` | `MISS` — *voulu* ([backend.md](../backend.md#ce-quil-faut-savoir-avant-dêtre-surpris)) |

> **Relu en `GET` le 2026-09-15.** Une requête `HEAD` sur `/object/public/` répond **toujours**
> `no-cache`, avec `MISS` ou `REVALIDATED`, quel que soit l'objet : c'est un artefact de la méthode, pas un
> état de l'objet. En `GET` — ce que fait l'application —, ces mêmes objets sortent du cache du CDN
> (`HIT`) et gardent bien `cache-control: no-cache` : le constat tient pour eux. En revanche, un objet
> téléversé avec `cache-control: max-age=31536000` rend `public, max-age=31536000` en `GET`.

**Après la souscription du Pro, le soir même** :
`…/storage/v1/render/image/public/media/annonces/campulsations-24-septembre.jpg?width=640&quality=75`
répond `200`, `image/jpeg`, **124 104 octets**, `cache-control: max-age=31536000`, `MISS` puis **`HIT`**
au second appel ; la même adresse suivie de `&v=3` est acceptée à l'identique. L'objet d'origine, relu en
`GET` le 2026-09-15, rend `public, max-age=31536000` — il avait été téléversé avec cet en-tête le
2026-09-14 —, quand les objets plus anciens (`amazone.jpg`, `ukit-v6.png`, les logos, les bâtiments)
rendent `no-cache`, en `GET` aussi. Donc : **les transformations d'image et le Smart CDN sont actifs, le
CDN respecte la métadonnée de chaque objet, et ce sont les objets anciens qui portent `no-cache`.**

## Ce qui a été fait, le 2026-09-16

### L'inventaire réel du bucket, que personne n'avait dressé

Douze objets, cinq dossiers — dont `etablissements/`, que la liste des dossiers de
[backend.md](../backend.md) ne citait pas.

| Objet | Dimensions | Avant | Après | `cache-control` avant |
|---|---|---|---|---|
| `restaurants/amazone.jpg` | 1999×1126 | 498 585 o | **156 668 o (−69 %)** | `no-cache` |
| `annonces/ukit-v6.png` | 1080×1080 | 415 655 o | **24 196 o (−94 %)** | `no-cache` |
| `annonces/ukit.png` | 1200×630 | 187 502 o | **26 032 o (−86 %)** | `no-cache` |
| `batiments/cremi.jpg` | 1024×768 | 88 143 o | **54 304 o (−38 %)** | `no-cache` |
| `annonces/campulsations2025.jpg` | 500×624 | 79 007 o | **37 800 o (−52 %)** | `no-cache` |
| `etablissements/bordeaux.webp` | 1280×448 | 20 324 o | *inchangés* | `no-cache` |
| `etablissements/bordeaux-inp.webp` | 1280×759 | 16 604 o | *inchangés* | `no-cache` |
| `annonces/d3d4d4a9-trois-campus.webp` | 1080×1080 | 172 794 o | *intouché* | déjà un an |
| `annonces/campulsations-24/25/26-septembre.jpg` | 864×1080 | 480 227 o | *intouchés* | déjà un an |
| `annonces/campulsations-2026.jpg` | 901×509 | 103 390 o | *intouché* | déjà un an — **et cité par aucune ligne** |

### L'outil, et les trois règles qu'il applique

[`tools/media/`](../../tools/media/) — `npm run media:compresser`, `-- --dry-run` pour le plan seul.
`sharp` est entré en dépendance de développement. La partie qui décide est pure et testée
([`plan.mjs`](../../tools/media/plan.mjs), 16 tests), celle qui parle au réseau ne l'est pas : la
découpe de [`tools/retours/`](../../tools/retours/).

| Règle | Pourquoi, mesuré |
|---|---|
| un objet qui porte **déjà un an** est ignoré | le retoucher coûterait un `?v=N` sur la seule annonce active pour 11 Ko. C'est aussi ce qui rend le script rejouable à vide |
| un objet **déjà en WebP** est reposé, pas ré-encodé | les deux logos **grossissent** au ré-encodage (+17 % et +31 %) : WebP serrés, canal alpha qu'un ré-encodage détruirait |
| tout le reste est **ré-encodé** en WebP q75, borné à 1080 px (affiche) ou 1200 px (photo) | les gains du tableau ci-dessus |

Plus une garde d'exécution que la spécification ne demandait pas : **si le rendu ressort plus lourd
que l'original, l'original est reposé**. Elle n'a pas servi sur ces douze objets, et elle rend le
script sûr pour un objet qu'on n'aura pas mesuré d'avance.

### Ce que la réalité a corrigé

1. **Trois adresses du bucket vivent dans le binaire, pas seulement en base**, et la spécification ne
   les citait pas : [`assets/locations.json`](../../assets/locations.json) pour le CRÉMI,
   [`src/shared/etablissements/socle.ts`](../../src/shared/etablissements/socle.ts) pour les deux
   logos, doublées dans [`supabase/etablissements.sql`](../../supabase/etablissements.sql). Le parc
   6.2.1 les porte **sans `?v=N`** et ne peut pas les recevoir bumpées : elles ont donc gardé leur
   chemin, et c'est l'`ETag` qui leur a porté les nouveaux octets.
2. **Une cinquième colonne porte une adresse du bucket** : `etablissements.logo_url`, absente de la
   liste de l'étape 4. Elle est chargée à chaque affichage de l'en-tête Scolarité.
3. **Le `?v=N` n'est parti que là où les octets ont changé** — cinq objets, cinq lignes :
   `annonces.image_url` (trois lignes, dont une galerie `images`), `visuels.image_url`,
   `batiments.image_url`. Les deux logos, reposés à l'identique, n'avaient rien à faire recharger :
   une adresse bumpée pour rien ferait retélécharger tout le parc.
4. **La purge du CDN n'est pas instantanée.** Mesuré juste après la passe : une adresse **nue** peut
   servir l'ancien objet, en `no-cache`, pendant environ une minute — deux des quatre sondées étaient
   encore périmées au premier passage, toutes correctes au second. L'adresse **versionnée**, elle, est
   une autre clé de cache et rend le nouvel objet immédiatement. Ne pas conclure d'un premier `curl`.
5. **Un objet re-encodé garde son extension d'origine** : `restaurants/amazone.jpg` sert désormais du
   `image/webp`. C'est le `Content-Type` qui porte le format, jamais l'extension — et le chemin ne
   pouvait pas changer (point 1). [7-E](7-e-console-socle.md) renommera l'ensemble en `.webp` quand il
   posera le nommage unique.
6. **La console téléversait un logo dans `media/logos/`** alors que les deux logos réels vivent dans
   `media/etablissements/` ([`tables.ts`](../../console/src/schema/tables.ts)). Corrigé au passage.

### L'étape 6, soldée : les six lectures publiées ne pèsent rien

Octets réellement transférés, clé `anon`, `Accept-Encoding: gzip` :

| Lecture | gzip | brut |
|---|---|---|
| `batiments` (8 colonnes, 73 lignes) | **1 599 o** | 16 313 o |
| `etablissements` (20 colonnes, 3 lignes) | 1 181 o | 4 042 o |
| `annonces` | 1 015 o | 1 749 o |
| `visuels` | 180 o | 186 o |
| `testeurs?select=id` | 104 o | 96 o |
| `service_messages` | 2 o | 2 o |

`content-encoding: gzip` partout où la réponse n'est pas vide. **La plus lourde des six pèse 1,6 Ko
sur le fil** : il n'y a rien à réduire, et la fréquence ne bouge pas — c'est elle qui fait arriver une
correction. Une seule colonne inutile a été relevée (`batiments.nom`, demandée et jamais projetée) et
délibérément laissée : le gain serait de quelques octets, et ce n'est pas le périmètre.

### L'étape 5, le pipeline de la console

[`televerser.ts`](../../console/src/lib/televerser.ts) : `cacheControl` passe de `'3600'` à
`'31536000'`, et l'image est **redimensionnée et compressée dans le navigateur** avant l'envoi
(`browser-image-compression`, WebP q75, 1080 px pour une affiche, 1200 px pour une photo). Un échec de
compression téléverse le fichier d'origine plutôt que de perdre le geste de l'éditeur.

Restent à [7-E](7-e-console-socle.md), et c'est écrit là-bas : le **nom d'objet unique**, le
**blurhash** — qui n'a aucune colonne où atterrir avant que [7-C](7-c-economie-et-socle.md) ne la
pose — et l'**aperçu au ratio réel**.

### Les relevés du tableau Usage

**Le cycle de facturation a redémarré le 14 septembre avec le Pro**, et c'est le piège de lecture de
ce jalon : les 10,041 Go de l'avertissement appartiennent au **cycle du plan gratuit**, qui est clos.
Comparer un chiffre du nouveau cycle à celui-là ne voudrait rien dire. On compare donc des **débits
journaliers**, à l'intérieur du cycle Pro.

| Relevé | Cached Egress | Egress | Storage | Transformations d'image |
|---|---|---|---|---|
| **2026-09-14**, fin du cycle gratuit | 10,041 Go — *201 % d'un quota de 5* | 1,371 Go | 0,001 Go | — |
| **2026-09-16**, cycle Pro (14 sept – 14 oct), **~1 h après la passe** | **2,578 / 250 Go (1 %)** | 0,362 / 250 Go | 0,002 / 100 Go | **0 / 100** |
| **2026-09-23**, une semaine après | *à relever* | | | |

Ce que le relevé du 16 établit, et ce qu'il n'établit pas :

- **Il n'établit rien sur l'effet de la passe** : il a été pris une heure après elle. C'est le point de
  départ, pas le résultat.
- **Le débit de départ est d'environ 1 Go par jour d'egress en cache** — 2,578 Go en deux jours et
  demi de cycle. À ce rythme, le relevé du 2026-09-23, neuf jours de cycle, donnerait **environ 9 Go**.
  C'est le chiffre à battre, et il est falsifiable.
- **L'alarme est éteinte** : « You have not exceeded your Pro Plan quota in this billing cycle ».
- **Les transformations d'image sont à 0 sur 100** : l'application n'en demande aucune aujourd'hui, et
  l'allocation mensuelle est donc intacte pour [7-C](7-c-economie-et-socle.md), qui les introduira.
- Le reste du panneau, relevé pour que ce tableau se suffise à lui-même : **1 invocation** de fonction
  *edge* sur 2 000 000, **0 utilisateur actif mensuel** (0 SSO, 0 tiers) — ce sont les comptes de la
  console, et le cycle vient de repartir —, **0 connexion Realtime**, **0 événement de *log drain***,
  et **37 heures de calcul, 0,50 $**. Aucune de ces lignes ne concerne ce jalon.

> **Ne pas attendre un effondrement.** Les visuels pèsent quatre fois moins et le CDN les garde un an,
> mais le `Image` de la 6.2.1 n'a toujours **aucun cache disque** : chaque ouverture de l'onglet Campus
> les redemande, simplement bien plus légers. La part qui reste est exactement celle que
> [7-C](7-c-economie-et-socle.md) doit gagner avec `expo-image`. Et la semaine portera d'abord une
> **bosse** : cinq adresses bumpées, que le parc installé relit une fois.

## Ce qui est à faire

> **Le texte d'origine, gardé tel qu'il a été écrit le 2026-09-14.** Les étapes 3 à 6 sont faites — ce
> qu'elles ont donné, et les six endroits où elles ont corrigé ce texte, sont au-dessus dans
> [Ce qui a été fait](#ce-qui-a-été-fait-le-2026-09-16). Ne restent que le second relevé Usage
> (étape 7) et la constatation des sauvegardes (étape 2).

1. **Relever le tableau Usage** : egress par service, en cache et hors cache. *Fait le 2026-09-14,
   ci-dessus* ; il se relève de nouveau à chaque étape.
2. **Vérifier le Pro.** *Transformations d'image et Smart CDN vérifiés le 2026-09-14.* Reste à constater
   les sauvegardes quotidiennes dans le tableau de bord du projet. À connaître : cent images d'origine
   transformées par mois sont incluses, puis cinq dollars les mille.
3. **Re-encoder le média existant.** Un script `tools/media/compresser.mjs`, avec `sharp` en dépendance de
   développement, ou le venv Python d'Aetherius, dont la recette est déjà mesurée : une affiche de
   1081 × 1351 à 437 Ko devient 864 × 1080, JPEG qualité 68, `optimize`, `progressive`, **160 Ko**, et le
   plus petit texte de la programmation reste net. Cibles : affiches à 1080 px sur le grand côté, photos
   de restaurant et de bâtiment à 1200 px, en WebP qualité 75, ou JPEG 72 si un appareil de test refuse
   le WebP. Le PNG « UKit fait peau neuve » devient un JPEG ou un WebP.
4. **Re-téléverser au même chemin, avec un `cache-control` d'un an** (`max-age=31536000`), puis bumper
   `?v=N` partout où l'adresse est écrite : `annonces.image_url`, `annonces.images`, `visuels.image_url`,
   `batiments.image_url`, selon la règle de remplacement existante
   ([campus-vie-etudiante.md](../features/campus-vie-etudiante.md#publier-une-annonce)). Storage n'expose
   pas de mise à jour des seules métadonnées : un objet qu'on ne re-encode pas se re-téléverse à octets
   identiques, avec son nouvel en-tête. **Cette passe suffit** : vérifié le 2026-09-15 en `GET`, un objet
   téléversé avec cet en-tête le rend et sort du cache du CDN, comme la miniature de l'annonce « Trois
   campus en route » et les affiches de Campulsations.
5. **Commencer le pipeline de téléversement de la console** : redimensionner et compresser dans le
   navigateur, calculer un `blurhash`, nommer l'objet `<dossier>/<identifiant court>-<slug>.webp`, un
   `cacheControl` d'un an au lieu de `'3600'` ([`televerser.ts:31`](../../console/src/lib/televerser.ts)).
   Il est **livré par [7-E](7-e-console-socle.md#le-téléversement)**, mais il se commence ici : sans lui,
   chaque visuel publié ensuite recrée le problème.
6. **Vérifier les six lectures publiées** du conteneur racine
   ([`rootContainer.tsx`](../../src/shared/navigation/rootContainer.tsx), au démarrage et au retour au
   premier plan) : poids des réponses et `content-encoding`, gzip attendu. Si `batiments` ou
   `etablissements` pèsent lourd, réduire les colonnes lues, jamais la fréquence : c'est la fréquence qui
   fait arriver une correction.
7. **Relever le tableau Usage une semaine après**, et l'écrire ici.

## Décisions et pièges

- **On mesure en `GET`** (`curl -s -o /dev/null -D -`), **jamais en `HEAD`**, qui répond toujours
  `no-cache` : la conclusion inverse, tirée le 2026-09-14, venait de là.
- **Le même chemin, pas un nouveau nom.** Les adresses que le parc installé connaît restent valides, et le
  `?v=N` bumpé force leur relecture une seule fois.
- **Un objet ancien se re-téléverse** : Storage ne modifie pas une métadonnée seule.
- **La livraison se constate une semaine après la passe**, au second relevé du tableau Usage. Cette
  attente ne retient pas l'ouverture du jalon suivant : il n'y a plus rien à faire, seulement à relever.
- **Le CDN met environ une minute à purger une adresse nue** (constaté le 2026-09-16) : un `curl`
  joué dans la foulée d'un téléversement peut rendre l'ancien objet, avec l'ancien en-tête. L'adresse
  versionnée, elle, est correcte tout de suite.
- **Une adresse citée par le socle embarqué ne peut plus être bumpée** : `assets/locations.json` et
  `socle.ts` sont dans le binaire du parc installé. Corollaire, écrit dans
  [backend.md](../backend.md#ce-quil-faut-savoir-avant-dêtre-surpris) : le jour où l'un de ces objets
  devra changer, la correction passe par la **surcouche en base** — `batiments.image_url`,
  `etablissements.logo_url` — avec une adresse bumpée, qui gagne sur le socle.
- **Le `?v=N` ne part que si les octets ont changé.** Bumper une adresse dont l'objet est identique
  ferait retélécharger tout le parc pour rien.

## Dépendances

Aucune. Le Pro est souscrit depuis le 2026-09-14.

## Définition de « terminé »

- [x] Un objet re-téléversé répond, en `GET`, `public, max-age=31536000`, et `HIT` au second appel.
  *Vérifié le 2026-09-16 sur les neuf objets touchés, adresses nues et versionnées.*
- [x] L'application 6.2.1 affiche toujours tous les visuels, adresses bumpées, sur les deux appareils.
  *Vérifié le 2026-09-16 sur l'iPhone 13 Pro et le Galaxy A8 : le bâtiment **A28** et le Resto U de
  l'**Amazone** — les deux objets devenus du WebP sous une extension `.jpg` — s'affichent des deux
  côtés, et l'annonce s'ouvre, se lit et se zoome dans la visionneuse. **Le WebP servi sous une
  extension `.jpg` est donc décodé par les deux plateformes**, y compris un Android 9 : le repli JPEG
  q72 prévu n'a pas servi.*
- [ ] L'egress en cache quotidien baisse dans le tableau Usage, relevé une semaine après.
  *Point de départ posé le 2026-09-16 : ~1 Go/jour, soit ~9 Go projetés au 2026-09-23 si rien ne
  change. C'est la seule case encore ouverte du jalon.*
- [x] Cette spécification porte les deux relevés, et le README de la phase la ligne « livré ».

## Plan de test

1. [x] `curl -s -o /dev/null -D -` deux fois sur trois objets re-téléversés : `cache-control` d'un an,
   `MISS` puis `HIT`. *Joué le 2026-09-16 sur neuf objets, adresses nues et versionnées. Et il a fallu
   s'y reprendre : la purge du CDN prend environ une minute (voir les pièges).*
2. [x] Sur l'iPhone 13 Pro et le Galaxy A8, en 6.2.1 : l'onglet Campus, la fiche d'un restaurant, une
   annonce avec sa galerie ; aucun visuel manquant, aucun visuel ancien. *Joué le 2026-09-16 : la
   carte et la fiche du Resto U de l'Amazone, la fiche du bâtiment **A28**, l'annonce en miniature
   puis ouverte et zoomée dans la visionneuse — tout est net des deux côtés.*

   **Les deux appareils n'avaient qu'une chose à trancher, et ils l'ont tranchée** : `amazone.jpg` et
   `cremi.jpg` servent du `image/webp` sous une extension `.jpg`, et les deux plateformes le décodent
   — le `Content-Type` fait foi, l'extension n'est qu'un nom. Les **deux logos** de l'en-tête Scolarité
   ont été regardés dans la foulée et s'affichent des deux côtés : c'était attendu — leurs octets sont
   strictement identiques, seul leur en-tête a changé — et le constater ferme le cas du
   re-téléversement « pour la métadonnée seule ». Le chemin dégradé, lui, n'avait rien à dire :
   **aucune ligne de code de l'application n'a bougé** dans ce jalon.
3. [x] Un objet sans ligne qui le cite, s'il en reste, relu en `GET`. *Il en reste un,
   `annonces/campulsations-2026.jpg` : il portait déjà un cache d'un an, il a donc été ignoré, et
   l'inventaire des douze objets montre que la passe n'en a oublié aucun autre.*
4. [x] Le poids et le `content-encoding` des six lectures publiées, relevés et écrits ici. *Fait : la
   plus lourde pèse 1,6 Ko sur le fil, rien à réduire.*
5. [ ] Le tableau Usage, relevé avant et une semaine après, sur une période comparable. *Premier relevé
   du cycle Pro pris le 2026-09-16 — 2,578 Go d'egress en cache, soit ~1 Go/jour ; second relevé
   attendu le 2026-09-23, à comparer en **débit journalier** et non en total, le cycle ayant redémarré
   le 14 septembre.*

## Limites écrites

- **Ce qui se téléverse à la main avant [7-E](7-e-console-socle.md)** doit l'être avec l'en-tête d'un an,
  sinon il recrée le problème.
- **Le parc installé relit une fois les adresses bumpées** : la baisse de l'egress se lit après ce pic.
- **Le Pro reste une marge, pas une solution** : sans le cache disque de [7-C](7-c-economie-et-socle.md),
  chaque nouvelle installation retélécharge tout.
