# 7-E — Le socle de la console

> **Jalon livré le 2026-09-22** — le socle, les quatorze défauts, les listes, la page Retours, le tableau
> de bord, le téléversement, les tests, la documentation et les captures ; ouvert le 2026-09-22 sur la
> branche `feat/console-socle`, depuis `main`. Le [plan de test](#plan-de-test) a été joué sur la console
> locale par un navigateur piloté (Playwright), avec deux comptes jetables, puis sur la console déployée ;
> le [protocole « plateformes »](#le-protocole--plateformes-) se joue avec le propriétaire du produit sur
> les deux appareils. Ce que la réalité a corrigé du texte ci-dessous est dans
> [Ce que la réalité a corrigé](#ce-que-la-réalité-a-corrigé-le-2026-09-22).
>
> **Spécification, ouverte le 2026-09-14.** Aucune publication : la console se déploie
> depuis `main` à chaque poussée qui la touche. Le premier des quatre jalons de la console, avant les
> annonces ([7-F](7-f-console-annonces.md)), les statistiques ([7-G](7-g-console-statistiques.md)) et les
> rôles ([7-H](7-h-console-roles.md)), tous livrés avant l'arrivée de l'équipe, en janvier 2027. Il pose le
> socle et la règle que les trois suivants appliquent.

## La direction

La console de pilotage ([`console/`](../../console/), en ligne sur `https://kae-lab.github.io/UKit/`) a été
livrée en 6.1-B « volontairement rudimentaire en périmètre, pas en finition »
([pilotage.md](../pilotage.md#la-console-web)). Elle devient l'outil d'une équipe.

Ce jalon n'ajoute pas une page de plus : il change la façon dont **toutes** sont construites, puis rend
les pages existantes justes et rapides. Après lui, un éditeur trouve une ligne en deux gestes, voit
toujours la même mise en page quoi qu'il arrive au réseau, et sait ce qu'il a le droit de faire avant
d'essayer.

## Pourquoi une grosse passe

Trois raisons, mesurées.

**Elle ment par endroits.** Une lecture en échec laisse « Lecture… » affiché pour toujours sous la bannière
d'erreur ; la vérification de session montre une page blanche ; un compte sans droits voit des listes vides
qui se lisent comme des tables vides ; aucune liste n'est paginée, et le plafond de la base tronquerait en
silence. Le relevé complet, ligne par ligne, est dans [les défauts mesurés](#les-défauts-mesurés).

**Elle n'aide pas à travailler.** Ni filtre, ni recherche, ni tri : trouver l'annonce d'un campus demande de
lire toute la table. Les retours du formulaire sont une liste plate, sans le moindre compteur. Une annonce
se publie en remplissant des cases, sans voir ce qu'elle donnera sur un téléphone. Et un visuel téléversé
part tel quel, sans compression, sous un nom qui peut écraser celui d'une autre annonce.

**Elle va avoir d'autres utilisateurs.** Une équipe non technique arrive — communication, partenariats,
subventions, dans le cadre du programme Disrupt Campus —, et la console devient l'endroit où elle publie.
Un seul niveau d'éditeur, un compte créé par un script et « le dernier enregistrement gagne » ne tiennent
pas à plusieurs.

## La règle transverse

> **Un chargement ou une erreur ne déplace jamais la mise en page.**

Une liste qui charge montre des lignes squelettes à la hauteur des lignes qu'elle attend ; une erreur prend
la place de ce qu'elle remplace, à la même hauteur ; un encart d'avertissement a sa place réservée ; un
bouton garde sa largeur pendant son action. C'est la règle que la 6.3 pose dans l'application
([7-I](7-i-releve-et-vocabulaire.md)), et pour la même raison : une interface qui saute sous le doigt fait
cliquer au mauvais endroit.

## Le socle retenu

Des bibliothèques standard et légères plutôt que du code maison, chacune pour un problème que la console a
déjà :

| Bibliothèque | Le problème qu'elle règle |
|---|---|
| **TanStack Query** | les états de chargement et d'erreur écrits à la main dans chaque page — c'est d'eux que vient « Lecture… » persistant — ; le cache, et l'invalidation après une écriture |
| **TanStack Table** | le tri, les filtres et la pagination, sans imposer de style : la peau reste la nôtre |
| **react-hook-form** et **zod** | l'état et la validation des formulaires ; les conversions pures de [`conversion.ts`](../../console/src/schema/conversion.ts) deviennent des schémas, et restent testées |
| **des primitives sans style** | un menu déroulant, un dialogue, des onglets, des cases, accessibles au clavier. Radix Primitives ou Base UI, choisies le premier jour du jalon sur un critère écrit : maintenance active, accessibilité du menu déroulant et du dialogue, poids |
| **Recharts** | les graphiques des statistiques, en [7-G](7-g-console-statistiques.md) |
| **`browser-image-compression`** et **`blurhash`** | redimensionner et compresser un visuel avant son téléversement, et calculer son placeholder |

## Ce qui ne change pas

- **Vite, React, `supabase-js`, GitHub Pages**, la clé publiable seule dans le navigateur, et les politiques
  de la base comme frontière.
- **La CSS maison, comme peau** : structurée en tokens d'espacement, de typographie et de couleur, pour que
  la console garde sa langue sobre. Pas de kit d'interface complet.
- **Les Blueprints restent hors de la console**, pour les raisons de
  [pilotage.md](../pilotage.md#la-console-web).
- **Le descripteur par table** reste l'idée directrice : il dit les colonnes et ce qu'il faut savoir avant
  d'écrire. Les pages qui méritent mieux qu'une liste générique — Tableau de bord, Retours, Annonces,
  Statistiques — ont la leur.
- **Le journal**, écrit par la base, que rien ne contourne.

## Ce que la réalité a corrigé, le 2026-09-22

Les endroits où l'exécution a amendé le texte des sections suivantes — annoncés, jamais cachés.

**Le socle.**

- **Les primitives sont Base UI** (`@base-ui/react` 1.8.0), sur le critère écrit et mesuré le premier
  jour : dernière publication le 2026-09-04 (Radix : le 2026-07-31), un seul paquet à cinq dépendances
  là où Radix en met de sept à vingt-deux par primitive, un dialogue et un menu accessibles au clavier
  des deux côtés. La console en prend le dialogue de confirmation (`AlertDialog`, qui remplace chaque
  `window.confirm`) et le menu de navigation sous 800 px.
- **TanStack Table est en version 9** (9.2.4, sortie le 2026-08-04), pas 8 : `useTable`, des fonctions
  enregistrées explicitement (`tableFeatures`), et sa documentation embarquée dans le paquet
  (`node_modules/@tanstack/react-table/skills/`). Le mode serveur est le seul employé : `manualSorting`,
  `manualFiltering`, `manualPagination`, `rowCount`.
- **Une seule politique de reprise.** Mesuré : `postgrest-js` 2.114 rejoue lui-même trois fois un échec
  réseau (1 s, 2 s, 4 s) avant de le rendre, et TanStack Query rejouait par-dessus — une base coupée
  mettait quinze secondes à se dire, devant un squelette. Le client est créé avec `db.retry: false` ;
  la reprise est celle de TanStack Query, une fois, après une seconde
  ([`supabase.ts`](../../console/src/supabase.ts), [`requetes/client.ts`](../../console/src/requetes/client.ts)).
- **L'URL porte l'état.** `#/annonces/<clé>` ouvre une ligne, `#/annonces/nouveau` une ligne neuve, et
  `#/annonces?q=soirée&page=2&tri=titre.desc&f.audience=testeurs` retient la recherche, la page, le tri
  et les filtres — d'où le retour à la liste qui garde ses filtres, le rechargement fidèle, et une entrée
  du journal qui s'ouvre à `#/journal/<numéro>` ([`routeur.ts`](../../console/src/routeur.ts),
  [`liste/etatUrl.ts`](../../console/src/composants/liste/etatUrl.ts), pur et testé). Le routeur maison
  reste : une quarantaine de lignes.
- **La CI installe la console dans le job « application »** (`npm ci --prefix console`) : les tests de
  la console sont joués par le vitest de la racine, et ses modules purs importent désormais `zod`, qui
  ne se résout que depuis `console/node_modules`. Les tests de la console ne sont typés par personne —
  la racine exclut `console/`, la console exclut ses tests — : inchangé, et écrit ici comme limite.
- **Le test de cohérence a trouvé trois erreurs le jour de sa naissance** : la clé `id` des annonces et
  des messages, et `visuels.maj_le`, étaient citées sans être des champs. Elles sont désormais des champs
  en lecture seule, et le test couvre aussi le descripteur du journal.

**Les défauts.**

- **Aucune migration n'était due.** Le `check` de la couleur 4 (défaut 8) existe depuis
  [7-C](7-c-economie-et-socle.md#6-les-colonnes-additives) ; la base n'interdit **que** le 4, et c'est
  la liste de la console qui borne 0 à 3 et 5. `blurhash` n'existe que sur `annonces` : le pipeline le
  calcule à chaque téléversement et ne le pose que là, par la colonne sœur que le descripteur nomme.
- **Le cas `plateformes = '{tv}'` du plan de test est impossible** : la base borne la colonne par un
  `check` depuis 6.1.x-D. Le cas joué à sa place est `couleur = 7`, que la base accepte : la liste
  montre la valeur marquée, le formulaire la propose « (valeur inconnue) », l'enregistrement la refuse
  en la nommant, et un autre choix s'enregistre. Même mécanisme pour une plateforme ou un code de campus
  inconnus, qui se montrent cochés, marqués, et se décochent.
- **Le filtre global par campus ne couvre que ce qui porte un code** — annonces et messages par leur
  ciblage (les contenus « tous campus » restent visibles), jetons push par `etablissement`. Décidé le
  2026-09-22 : `batiments.campus` est un libellé (« Talence », « Bordeaux INP — ENSC ») et
  `retours.campus` est le campus *demandé* dans le formulaire (« Inspe »), pas l'établissement de qui
  écrit ; les deux gardent un filtre par page sur leur colonne. Une colonne `retours.etablissement`,
  remplie par l'importeur depuis la question « Établissement » du formulaire (2026-09-21), est un lot
  ultérieur de l'importeur.
- **La place réservée des encarts** a une hauteur minimale d'une ligne ; un retour plus long défile
  dedans, borné à 120 px, plutôt que de pousser la page (défaut 11).
- **La bannière « lecture seule »** ne paraît que quand les droits sont résolus à faux : elle apparaît
  une fois, au chargement, jamais au fil de l'usage.
- **`versionnerUrl.ts` est supprimé** avec son test : plus rien ne bumpe `?v=N` depuis la console. La
  règle reste celle de ce qui est posé à la main, par `tools/media/versionner.mjs`.
- **Le squelette d'une liste** compte au plus dix lignes, ou la taille de page, ou le total connu.

**Les pages.**

- **La page Retours** propose « Ouverts » dans son filtre d'état — c'est la vue par défaut, levée d'un
  geste —, et son filtre par campus demandé tire ses valeurs des lignes elles-mêmes.
- **Le tableau de bord** lit le parc sur `jetons_push` en trois pages de mille (2 176 lignes le
  2026-09-22), et applique la règle des petites cases de [mesure.md](../mesure.md#les-petites-cases).
- **Les captures sont prises par un navigateur piloté**, pas à la main : la console est une page web,
  et Playwright émule le thème sombre. La convention `console-<page>[-dark].png` et le dossier
  [`docs/screenshots/console/`](../screenshots/console/) sont ajoutés au
  [README des captures](../screenshots/README.md) ; la règle « à la main » reste celle de l'application.

## Les défauts mesurés

Relevés dans le code le 2026-09-14, à la révision `aced97d`. Tous se corrigent dans ce jalon.

| # | Où | Ce qui se passe |
|---|---|---|
| 1 | [`pages/Ressource.tsx:60`](../../console/src/pages/Ressource.tsx), [`Journal.tsx:113`](../../console/src/pages/Journal.tsx), [`Sources.tsx:49`](../../console/src/pages/Sources.tsx) | une lecture en échec pose l'erreur mais laisse la liste à `null` : **« Lecture… » reste affiché pour toujours**, sous la bannière d'erreur |
| 2 | [`App.tsx:29`](../../console/src/App.tsx) | la vérification de session rend `null` : une **page entièrement blanche**, sans logo ni texte |
| 3 | [`composants/Liste.tsx:78`](../../console/src/composants/Liste.tsx) | un compte sans droits voit les tables réservées **vides**, pas refusées — la politique rend zéro ligne —, et l'état vide lui dit que « la première se crée avec le bouton en haut » |
| 4 | [`lib/base.ts:35`](../../console/src/lib/base.ts) | `select('*')` sans limite ni pagination : au-delà du plafond de la base, **la liste est tronquée en silence** |
| 5 | [`schema/conversion.ts:233`](../../console/src/schema/conversion.ts) | une valeur d'énumération posée hors console — `plateformes = '{tv}'` par `psql` — rend la ligne **impossible à enregistrer**, avec un message sur un champ dont l'interface ne montre rien d'anormal |
| 6 | [`composants/Champs.tsx:74-79`](../../console/src/composants/Champs.tsx) | un code d'établissement absent du catalogue est **invisible** dans les cases, et réécrit tel quel à l'enregistrement |
| 7 | [`lib/televerser.ts:15-38`](../../console/src/lib/televerser.ts) | le nom d'objet vient du nom du fichier, et le téléversement écrase (`upsert: true`) : **deux annonces qui téléversent `affiche.jpg` partagent le même objet**, et la seconde repart de `?v=1` ; aucune compression ; `cacheControl: '3600'` |
| 8 | [`schema/tables.ts:47`](../../console/src/schema/tables.ts) | la couleur 4 n'est interdite que par la console ; la base l'accepte ([`schema.sql:40`](../../supabase/schema.sql)) |
| 9 | [`composants/Formulaire.tsx:81`](../../console/src/composants/Formulaire.tsx) | pendant une action, **tous** les boutons d'action affichent « Envoi… », pas seulement celui qu'on a pressé |
| 10 | [`composants/Formulaire.tsx:78`](../../console/src/composants/Formulaire.tsx) | « Retour à la liste » **perd les saisies** sans rien demander |
| 11 | [`pages/Ressource.tsx:56-57`](../../console/src/pages/Ressource.tsx), [`composants/Formulaire.tsx:74-77`](../../console/src/composants/Formulaire.tsx) | les encarts d'erreur et d'avertissement s'insèrent dans le flux et **poussent la page** ; les boutons changent de largeur en changeant de libellé |
| 12 | [`pages/Journal.tsx:89`](../../console/src/pages/Journal.tsx) | le filtre par table ne propose que les tables qui ont un descripteur : ni `sondes`, ni `journal` |
| 13 | [`composants/Liste.tsx:87`](../../console/src/composants/Liste.tsx), [`styles.css`](../../console/src/styles.css) | une ligne ne s'ouvre qu'à la souris ; boutons et liens n'ont **aucun style de focus** ; un seul attribut d'accessibilité dans toute la console |
| 14 | [`styles.css:89`](../../console/src/styles.css) | sous 800 px, la navigation devient treize liens à plat, sections masquées |

## Ce qui est à faire

### Le socle technique

- **TanStack Query** pour toute lecture et toute écriture : une requête par ressource, invalidée après une
  écriture. Ses états remplacent les `useState` écrits à la main, ce qui supprime le défaut 1 par
  construction.
- **TanStack Table** pour les listes, en mode **serveur** : tri, filtres et pagination traduits en requête —
  `.order`, `.eq`, `.ilike`, `.range(debut, fin)` avec `count: 'exact'` —, jamais tout charger pour trier
  dans le navigateur.
- **react-hook-form et zod** : le schéma d'un formulaire se dérive du descripteur ; les conversions de
  `conversion.ts` deviennent des transformations zod et gardent leurs tests.
- **Les primitives sans style**, choisies le premier jour sur le critère du [socle
  retenu](#le-socle-retenu).
- **Des tokens CSS** pour les espacements, les tailles de texte, les rayons et les durées — aujourd'hui
  écrits à la main dans `styles.css` —, un style de focus visible partout, une `ErrorBoundary` à la racine,
  et **une seule famille d'icônes** (`lucide-react`) : la console n'en a aucune, et un tri, un filtre ou un
  état se lisent mieux avec une.

### Les états qui ne déplacent rien

| État | Rendu |
|---|---|
| session en vérification | la coque de la console, navigation comprise, et un squelette de contenu — jamais une page blanche |
| liste en chargement | des lignes squelettes, à la hauteur des lignes attendues |
| liste en échec | la table garde sa hauteur ; l'erreur prend la place des lignes, avec « Réessayer » |
| compte sans droits | **« Lecture seule : ce compte n'est pas éditeur »** en tête de chaque page qui écrit, et les boutons d'écriture désactivés — plus jamais une table vide qui ressemble à une table vide |
| enregistrement ou action | seul le bouton pressé passe en attente, à largeur fixe |
| encart d'erreur ou d'avertissement | une place réservée sous l'en-tête, qui ne pousse rien |
| formulaire modifié qu'on quitte | une confirmation |

### Les listes

- **Un filtre global par campus**, dans l'en-tête, retenu d'une page à l'autre : il filtre toute ressource
  qui porte un ciblage d'établissement ou un code de campus — annonces, messages, retours, bâtiments.
- **Des filtres par page** — actif ou non, audience, niveau, état —, **une recherche** sur les champs texte,
  **des colonnes triables**, **la pagination** avec le nombre total.
- Une valeur d'énumération inconnue **s'affiche** telle quelle, marquée, et se corrige d'un geste
  (défaut 5) ; un code d'établissement inconnu aussi (défaut 6).
- La couleur 4 est refusée par la base elle-même, par le `check` de
  [7-C](7-c-economie-et-socle.md#6-les-colonnes-additives) ; si ce jalon passe avant, il pose ce `check`
  dans sa propre migration (défaut 8).

### La page Retours

- **La vue par défaut montre les retours ouverts** — `nouveau` et `en attente` : c'est la question qu'on se
  pose en ouvrant la page.
- **Des compteurs** en tête : par état, par nature, par campus, et par semaine sur les huit dernières.
- **Des filtres** sur les mêmes axes, et la recherche sur le texte.
- **`reponses` rendu en questions et réponses** lisibles, à la place du JSON brut ; le reste de la ligne en
  lecture seule, comme la base l'impose (`grant update (nature, etat, note)`).

### Le tableau de bord d'accueil

La page d'arrivée, à la place de « Sources » :

- **le parc actif**, par campus, version et plateforme, compté sur `jetons_push` — redéposés tous les sept
  jours ([mesure.md](../mesure.md#lire-les-chiffres)) ; la politique « jetons lisibles par les éditeurs »
  existe déjà ;
- **l'état des sources**, depuis `sondes` ;
- **les retours ouverts**, et les plus récents ;
- **les annonces actives et programmées** — ces dernières après les migrations de 7-C.

### Le téléversement

Le pipeline commencé par [7-A](7-a-bande-passante.md) :

- redimensionnement et compression **dans le navigateur**, avant l'envoi : 1080 px sur le grand côté pour
  une affiche, 1200 px pour une photo, WebP qualité 75 ;
- le **blurhash** calculé, et posé dans la ligne quand la table porte la colonne ;
- un nom d'objet **unique** — `<dossier>/<identifiant court>-<slug>.webp` — : plus aucun objet n'en écrase
  un autre ;
- `cacheControl: '31536000'` ;
- un aperçu **au ratio réel** de l'image, et non plus une vignette recadrée en carré.

Remplacer une image reste possible : le nouveau fichier prend un nouveau nom, donc une nouvelle adresse, et
la règle `?v=N` devient inutile pour ce que la console téléverse. Elle reste la règle pour ce qui est posé à
la main.

### Le journal et les sources

- Le filtre par table du journal propose **toutes** les tables journalisées (défaut 12).
- La page Sources garde les sondes, et réserve la place des échecs que [7-D](7-d-la-mesure.md) mesurera
  (`source.echec`) ; [7-G](7-g-console-statistiques.md) la remplit.

### Le protocole « plateformes »

Le propriétaire du produit a observé qu'un message sans plateforme cochée n'atteignait qu'une des deux.
**Le code dit le contraire** : aucune case cochée écrit `null`
([`conversion.ts:228-235`](../../console/src/schema/conversion.ts)), que l'application et la fonction
d'envoi lisent comme « les deux » ([`ciblage.ts:79-89`](../../src/shared/ciblage/ciblage.ts)), tests à
l'appui des deux côtés. L'observation vient donc d'ailleurs — l'audience `testeurs`, une borne de version,
un appareil non enregistré —, et elle se **reproduit** avant de se corriger :

1. un `info` sans plateforme, audience `tous`, sans borne de version : visible sur l'iPhone **et** sur le
   Galaxy A8 ;
2. le même en audience `testeurs` : visible seulement sur les appareils enregistrés — vérifier les deux dans
   le panneau Testeur ;
3. `{ios}`, puis `{android}` : chacun sur son seul appareil ;
4. une borne `version_max` à la version précédente : invisible partout.

Le résultat s'écrit ici. Si un cas contredit le code, c'est un défaut, et il s'inscrit au
[registre](../defauts-fonctionnels.md).

*Résultat :* **à jouer avec le propriétaire du produit**, sur la console déployée, les quatre messages
publiés en `audience` voulue puis retirés — écrit ici à la fin de la session.

### Les tests

- **La cohérence des descripteurs** : chaque colonne listée existe parmi les champs, chaque clé désigne des
  champs réels — aujourd'hui, un nom erroné s'affiche en silence.
- Les schémas zod dérivés des conversions, avec les cas des tests actuels.
- La traduction des erreurs de la base (`lib/base.ts`).
- Le nom d'objet unique, et le calcul des dimensions de compression.

## Décisions et pièges

- **`count: 'exact'` a un coût** sur une grosse table : acceptable pour `journal` et `retours` à leur
  volume ; à revoir si une table dépasse quelques dizaines de milliers de lignes.
- **Le filtre global par campus se retient en local** (`localStorage`) : c'est une préférence de poste, pas
  une donnée.
- **Les tests de la console s'exécutent depuis la racine**, et `console/tsconfig.json` les exclut
  ([console/README.md](../../console/README.md#comment-elle-est-faite)).
- **Le relevé des défauts date du 2026-09-14** : une ligne citée peut avoir bougé ; c'est le symptôme qui
  fait foi.
- **Les descripteurs restent des données pures** : l'action « Notifier » charge la fonction d'envoi par
  un import paresseux, parce que le client de la base s'instancie à l'import et que les tests de
  cohérence chargent les descripteurs hors navigateur.
- **Le pipeline de téléversement se charge à la demande** (compression, blurhash) : 55 Ko que seul un
  éditeur qui téléverse attend.

## Dépendances

Aucune. Le pipeline de téléversement termine celui que [7-A](7-a-bande-passante.md) a commencé ; la page
Sources gagne sa seconde moitié en [7-G](7-g-console-statistiques.md).

## La vérification des quatre jalons de la console

- **`npm test`** à la racine joue les tests de la console, comme aujourd'hui ; chaque jalon ajoute les
  siens.
- **La construction** (`npm run console:build`) est une porte, et le workflow `verifier.yml` de
  [7-C](7-c-economie-et-socle.md#5-le-socle-du-dépôt) la rejoue sur chaque branche.
- **Un protocole sur la console déployée**, avec deux comptes jetables — un éditeur, un compte sans
  droits —, qui rejoue les frontières déjà écrites dans [6.1-B](../phase-6/6-1-b-pilotage-a-distance.md)
  et [6.1.x-C](../phase-6/6-1-x-c-retours.md), et celles des rôles en [7-H](7-h-console-roles.md) ; les
  comptes sont supprimés après.
- **Des captures** de chaque page reprise, dans `docs/screenshots/console/`, en clair et en sombre.

## Plan de test

Sur la console construite localement, puis déployée.

*Joué le 2026-09-22 sur la console locale, par un navigateur piloté (Playwright, Chromium, dans les
deux thèmes), avec deux comptes jetables — `recette.editeur.7e` et `recette.sansdroits.7e` —,
supprimés après. Aucune erreur de console dans les deux thèmes. Point par point :*

1. *La base coupée (`route.abort` sur `/rest/v1/`) : l'erreur prend la place des lignes avec
   « Réessayer », les quatre cartes du tableau de bord passent en erreur et chacune se relit seule ;
   au rechargement, la coque paraît avant la session.*
2. *Le compte sans droits : « Lecture seule » en tête des annonces, des messages, des retours, des
   testeurs, aucun bouton d'écriture actif.*
3. *Le tri sur le titre (`?tri=titre`, `aria-sort`), le filtre d'audience, la recherche, le retour à
   la liste avec les mêmes paramètres ; le campus `bordeaux-inp` retenu après rechargement ; le
   journal en pages de cent : 240 lignes, la page 3 en rend 40.*
4. *`couleur = 7` à la place de `{tv}` (voir plus haut) : montrée, refusée en la nommant, corrigée en
   `2`, relue en base.*
5. *Deux annonces de test téléversent la même `affiche.jpg` de **6,6 Mo** (2400 × 3000) : deux objets
   distincts (`annonces/82639546-affiche.webp`, `annonces/123afa1b-affiche.webp`), **119 112 octets**
   chacun, `image/webp`, `cache-control: public, max-age=31536000`, blurhash posé dans la ligne ; lignes
   et objets supprimés après.*
6. *Les compteurs : 53 retours, 53 « nouveau », par nature 10 / 9 / 24 / 10 — égaux au décompte de
   la table par l'API.*
7. *Le protocole « plateformes » : avec le propriétaire du produit, sur les appareils.*
8. *Une ligne s'ouvre à « Entrée » ; la tabulation visite la navigation, les filtres, les en-têtes de
   tri, les lignes et les boutons, focus visible ; un formulaire modifié qu'on quitte demande
   confirmation, « Annuler » garde la page, « Quitter » revient à la liste.*

1. **Les états.** Couper le réseau du navigateur sur chaque page : la mise en page ne bouge pas, l'erreur
   prend la place du contenu, « Réessayer » relit. Recharger : jamais de page blanche.
2. **Le compte sans droits** (`npm run console:editeur -- --email … --sans-droits`) : chaque page qui écrit
   dit « lecture seule », aucun bouton d'écriture n'est actif.
3. **Les listes.** Le filtre de campus sur les annonces, les messages, les retours ; une recherche ; un
   tri ; la page 2 d'un journal de plus de cent lignes, avec le total juste.
4. **Les valeurs inconnues.** `plateformes = '{tv}'` posé par `psql` sur un message de test : la valeur se
   voit, se corrige, s'enregistre.
5. **Le téléversement.** Deux annonces de test téléversent chacune un fichier nommé `affiche.jpg` de 3 Mo :
   deux objets distincts, chacun sous 250 Ko, `cache-control` d'un an, blurhash posé.
6. **Les retours.** La vue des retours ouverts par défaut ; les compteurs égaux à une requête SQL faite à la
   main.
7. **Le protocole « plateformes »**, sur les deux appareils.
8. **Le clavier.** Toute la console se parcourt à la tabulation, focus visible, et une ligne s'ouvre à
   « Entrée ».

## Ce qui est écarté

- **Un kit d'interface complet** (MUI, Ant Design) : il imposerait son apparence, et la console perdrait la
  sobriété qui la rend lisible.
- **Un framework applicatif** (Next.js, Remix) : la console est une page statique qui parle à une base ; un
  serveur à nous n'achèterait rien.
- **L'édition des Blueprints**, pour les raisons déjà écrites.
- **L'édition hors ligne** : une console de publication qui publie hors ligne publierait n'importe quand.

## Limites écrites

- **La console reste un outil d'une personne à la fois** : le verrou contre l'écrasement arrive en
  [7-H](7-h-console-roles.md).
- **L'aperçu d'une annonce n'est pas encore là** : c'est [7-F](7-f-console-annonces.md).
- **Les objets déjà en ligne gardent leur nom** : seul ce qui est téléversé après ce jalon suit la nouvelle
  règle.
