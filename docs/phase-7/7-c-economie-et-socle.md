# 7-C — Économie et socle

> **Jalon livré le 2026-09-17** — le code, la base, la publication du catalogue et des Blueprints, la
> documentation ; ouvert le 2026-09-16 sur la branche `v6.2.2`. Restent au propriétaire du produit, et
> cochés dans la [définition de « terminé »](#définition-de--terminé-) quand ils le seront : les deux
> builds de développement et le [protocole](#plan-de-test) en neuf points, la règle de protection de
> `main`, le tri des alertes restantes, et l'egress relevé avant et après. Ce que la réalité a corrigé
> du texte ci-dessous est dans [Ce que la réalité a corrigé](#ce-que-la-réalité-a-corrigé-le-2026-09-17).
>
> **Spécification ouverte le 2026-09-14.** Publication : **6.2.2**. Née de la
> [mise à plat](7-mise-a-plat.md), le jour où deux choses sont arrivées ensemble : l'avertissement
> *Fair Use* de Supabase et une panne de Celcat. La **6.2.1** ne part pas seule aux stores ; elle part dans
> cette version courte, qui rend l'application **économe** — envers notre base comme envers les serveurs
> des universités — et le dépôt **sûr pour les jalons qui vont s'y succéder**. Deux à trois semaines,
> périmètre fermé.
>
> **Le bucket et le cache des objets relèvent de [7-A](7-a-bande-passante.md)**, sans release : ce jalon-ci
> porte le code.
>
> **Conception relue contre le code** à la révision `aced97d` (6.2.1). Les endroits où la lecture du code a
> corrigé le plan sont marqués *corrigé à la lecture du code* : ce sont eux qui valent le plus.

## La direction

L'application coûte trop cher dans deux directions, et aucune ne se voit à l'écran.

**Vers notre base, par ses images.** L'egress en cache — ce que le CDN sert depuis le stockage —
pèse **sept fois** l'egress de toute la base. Les visuels sont servis en `no-cache`, à 400 ou 500 Ko
l'unité, par un composant qui ne garde rien sur disque : chaque ouverture de l'onglet Campus les
redemande, chaque installation les retélécharge, chaque remplacement (`?v=N`) les fait
retélécharger à tout le parc.

**Vers les universités, par son rythme.** La fiche d'un bâtiment joue une requête d'occupation par
salle à chaque ouverture — dix-huit pour l'A28 —, et le Planning refait sa requête à chaque retour
sur l'onglet. Rien de cela n'a causé la panne du 14 septembre, qui vient du serveur de l'université ;
mais une application qui interroge un service public se doit d'être économe, de s'arrêter quand il
tombe, et de se nommer.

**Et le dépôt n'est pas prêt pour la suite** : aucune vérification ne tourne sur une branche, le
schéma s'applique à la main par `psql`, et une quinzaine de jalons vont s'y succéder avant qu'une équipe
n'y publie en janvier.

Le Pro, souscrit le soir même, lève l'urgence du quota — 250 Go d'egress en cache au lieu de 5. Il
ne règle ni le forfait des étudiants, ni la vitesse, ni la politesse envers Celcat. Cette version
fait les trois, et se mesure avant et après.

## Ce qui a été mesuré

Le tableau Usage de Supabase, les en-têtes des objets du bucket et les transformations du Pro, relevés le
2026-09-14, sont dans [7-A](7-a-bande-passante.md#ce-qui-a-été-mesuré-le-2026-09-14), qui agit sur les
objets. Côté application, **`expo-image` n'est pas une dépendance** : toutes les images passent par le
`Image` de React Native, qui n'a ni cache disque réglable, ni placeholder, ni transition.

## Ce que la réalité a corrigé, le 2026-09-17

Les endroits où l'exécution a amendé le texte des sections suivantes — annoncés, jamais cachés.

**Les images (section 2).**

- **Quatre cartes passent par `VisuelAvecRepli`, pas deux** : `LibrarySectionCard` et `CrousSectionCard`
  aussi, avec le même `resizeMode` dans le style. Même traitement.
- **Le repli local passe aussi par le `Image` d'`expo-image`**, sans transition : un seul composant,
  une seule sémantique `contentFit`. Les `require` des écrans listés — démarrage, menu de développement,
  accueil, À propos — restent sur React Native.
- **`expo-image` est en `~57.0.5`**, pas `~57.0.4` : c'est ce qu'`expo` 57.0.23 épingle, une fois les
  vingt-deux modules montés. `npx expo install --fix` sort en code 1 sur un avertissement — il ne sait
  pas écrire les greffons dans `app.config.ts`, qui est dynamique — sans rien laisser en plan.
- **`resize=contain` dans chaque adresse de rendu** (2026-09-21, trouvé par le propriétaire du produit sur
  l'iPhone : les logos d'établissement coupés des deux côtés). Le mode par défaut du service est
  `cover` : avec la seule largeur, il garde la hauteur d'origine et recadre — le logo UB 1280 × 448
  demandé en 480 revenait en 480 × 448, l'affiche 1080 × 1080 en 960 perdait 60 px de chaque côté. Avec
  `contain`, 480 × 168 et 960 × 960 ; une image plus petite que le palier n'est pas agrandie.
- **La carte d'annonce dont ni le rendu ni l'origine ne répondent** retombe sur l'affiche typographique,
  comme sans image, au lieu d'un carré gris.
- **`DUREE_MS` d'`ApparitionEnFondu` est devenue `DUREE_FONDU_MS`, exportée** : la transition des images
  la reprend au lieu de dupliquer 200.
- **Les paliers ne bornent pas la facture** : Supabase facture par image d'**origine** transformée (cent
  incluses, puis cinq dollars les mille), pas par variante. Ils servent le taux de HIT du CDN et la
  vitesse, ce qui suffit à les justifier. Mesuré : `amazone.jpg`, 156 668 octets à l'origine, sort à
  **52 359** en 640 px qualité 70 avec `resize=contain` (96 010 recadré sans lui), `MISS` puis `HIT`.

**L'étiquette envers Celcat (section 3).**

- **Le cache d'occupation porte un `ok` par salle** : un lot partiel est mis en cache, et seules les
  salles en échec sont rejouées dans la fenêtre — sinon une salle qui n'avait pas répondu passait pour
  libre toute la journée pendant dix minutes. Un lot entièrement en échec n'est pas mis en cache, comme
  écrit.
- **La sonde** ([`sondes/mesures/occupation_groupee.py`](../../sondes/mesures/occupation_groupee.py)),
  jouée sur les dix-sept salles de l'A28 et trois journées — le mardi 2026-09-22 (84 événements), la
  journée d'examens du 2027-01-11 (10, trouvée en sondant les titres de décembre et janvier) et le mardi
  2026-10-27 des vacances (4) — rend un verdict **nuancé** : identifiants identiques, chaque description
  nomme sa salle (en entités HTML, `B&#226;t.`, ce qui avait d'abord fait conclure le contraire),
  attribution juste à 100 % (109 attributions, 0 fausse), multi-salles présents dans chaque run
  individuel ; mais « au moins 99 % d'événements attribuables à zéro ou une salle » **ne tient pas**
  (98,8 % le mardi, 0 % le jour d'examens, où chaque épreuve occupe plusieurs salles). Le critère
  supposait qu'un cours multi-salles serait inattribuable ; il est attribuable à chacune de ses salles.
  La règle actuelle reste derrière le cache, comme écrit ; la requête groupée est viable pour la 6.3 à
  condition d'attribuer un événement à toutes les salles nommées — écrit dans
  [campus-salles-libres.md](../features/campus-salles-libres.md#décisions-de-conception).
- **`origineDuRun` ne rend `automatique` que pour `lancement`, `premier-plan` et `tache`** — ceux que
  cette section nomme. `activation`, `favoris` et `filtres` suivent un geste à une seconde près, et
  `sonde` est le bouton du menu de développement, qui doit passer pour sonder le circuit.
- **Un run court-circuité n'est pas signalé aux observateurs** : il n'y a pas eu de run, et la mesure de
  7-D compterait des dizaines d'échecs fictifs par minute.
- **Le palier ne monte qu'après un refroidissement écoulé** (2026-09-21, en préparant le protocole) :
  la spec faisait monter le palier à tout échec d'un geste pendant l'ouverture, et les dix-sept runs
  parallèles d'une fiche de bâtiment auraient porté l'hôte d'un coup à dix minutes. Un échec pendant la
  fenêtre la réarme au même palier ; c'est l'échec d'après, la sonde du circuit à demi ouvert, qui monte.
- **Un retour au premier plan ne joue aucun run de l'Act I** : l'entretien n'est dû que toutes les douze
  heures, le Planning hors ligne sert son cache sans run, les widgets sont de l'Act II. Le point 4 du
  protocole se joue donc par la fiche d'un bâtiment (qui ouvre l'hôte) puis « Oublier l'échéance » du
  bloc Entretien et un retour au premier plan (le run automatique ne part pas) ; et le point 1
  « relancer hors ligne » par le bloc **Images** du menu de développement, qui vide le cache
  d'`expo-image` — un build de développement ne se relance pas sans Metro — et la ligne
  `[visuels] disk` de Metro.
- **`[disjoncteur]` journalise l'hôte seul**, jamais l'adresse entière : un lien d'abonnement iCalendar
  est un secret personnel. Les lignes d'ouverture et de fermeture sont des `console.warn` non gardés par
  `__DEV__` — elles doivent se lire sur un build — ; le court-circuit lui-même l'est.
- **`npm run parity -- celcat` ne désigne rien** : le filtre nomme un cas (`celcat-jour`), pas une
  famille. La parité entière a été rejouée, verte sur ses treize cas.
- **L'écho** vit dans `src/shared/aetherius/echo.ts`, un document inline joué par un bouton `__DEV__`
  du panneau Blueprints — `blueprints/` est publié en entier par le script, et le registre ne résout
  que des noms.

**Le formulaire (section 4).**

- **`ScolariteDashboard.ouvrirLien` contournait `parametresDuFormulaire`** : depuis la page Scolarité
  d'un campus non relié — et depuis une rangée de widget, par `GrilleScolarite` —, la page d'engagement
  remplaçait le formulaire au lieu de s'ouvrir par-dessus. Corrigé par la couture commune.
- **PRIVACY.md, 5 bis**, dit désormais que l'application pré-remplit l'appareil, le système, la version
  et l'onglet, et qu'ils partent vers Google à l'ouverture du formulaire.
- **Le catalogue publié remplace le socle** : les gabarits n'existent sur un appareil qu'une fois
  `etablissements.sql` rejoué — fait le 2026-09-17, après `db push`, dans cet ordre.

**Le socle du dépôt (sections 5 et 6).**

- **Le CLI ne trouvait plus le projet lié** (`LegacyProjectNotLinkedError` : le lien de septembre,
  `supabase/.temp/linked-project.json`, n'est plus la forme attendue) : `--project-ref` remplace
  `--linked` pour `repair`, `list` et `push`, et `psql` vise le *session pooler* de la région du projet,
  `aws-0-eu-west-2.pooler.supabase.com`, l'hôte direct n'ayant qu'une adresse IPv6
  ([`supabase/README.md`](../../supabase/README.md#migrations)).
- **`ajustement = 'contenir'` sur les lignes existantes, sans `update`** : la colonne est ajoutée avec
  le défaut `contenir`, puis son défaut passe à `couvrir` — même résultat, aucune ligne de `journal`
  attribuée à l'utilisateur SQL, et `schema.sql` ne porte que le défaut final.
- **`sharp`** (devDependency de 7-A) rejoint le groupe `outillage` de Dependabot.
- **Le tri des alertes** : `npm audit fix` sans `--force` a ramené 35 vulnérabilités (1 critique,
  10 hautes, 21 modérées, 3 basses ; 55 avis, les 52 de GitHub) à **15 modérées**, toutes derrière un
  majeur épinglé par le SDK (`expo`, `expo-splash-screen`, `expo-sharing`, `datetimepicker`) ou
  `vitest` 3 → 4 : elles attendent la montée du socle, politique écrite dans
  [plateforme.md](../plateforme.md#la-politique-des-alertes-de-sécurité). Les rejeter sur GitHub avec
  ce motif est un geste du propriétaire du produit.
- **`dist/` entre dans `.gitignore`** : `npx expo export` l'écrit à la racine et seul `console/dist/`
  était ignoré.
- **Node 22** est installé par `nvm` sur le poste (sans changer le défaut) : `eas-cli` l'exige, et
  `.nvmrc` le disait déjà.
- **Les docs** : `qualite.md` disait « trois workflows » pour quatre (cinq avec `verifier.yml`) ; la
  branche s'est renommée `v6.2.2`, comme le README de phase le prévoit.

## Ce qui est à faire

### 1. Le socle natif, d'abord

`expo-image` est un module natif : il impose des **builds de développement neufs** sur l'iPhone et
sur le Galaxy A8 avant toute vérification. Tant qu'à refaire les builds, les **correctifs Expo
reportés** se prennent dans le même geste — `expo` 57.0.22 et vingt-deux modules, signalés par
`expo-doctor` depuis la 6.2.0 et laissés de côté par décision
([6-2-x-ajustements.md](../phase-6/6-2-x-ajustements.md)).

```bash
npx expo install expo-image          # ~57.0.4, la version que le SDK 57 épingle
npx expo install --fix
npx expo-doctor@latest
npx expo export --platform ios && npx expo export --platform android
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile development --platform android
```

C'est l'étape qui ouvre le jalon : tout le reste se vérifie sur ces builds.

### 2. Les images

**Une URL de rendu, pure et testée** — `src/shared/visuels/rendu.ts`, à côté de
[`referentiel.ts`](../../src/shared/visuels/referentiel.ts), qui l'est déjà :

```ts
export interface OptionsDeRendu { readonly largeur: number; readonly qualite: number }
export const PALIERS_DE_LARGEUR = [320, 480, 640, 960, 1280, 1600, 2000] as const;
export function palierDeLargeur(pixels: number): number;
export function urlDeRendu(url: string | null | undefined, options: OptionsDeRendu): string | null | undefined;
```

- une adresse qui n'est pas une chaîne est rendue telle quelle ; une adresse d'une autre origine —
  Croustillant, Affluences — est **intacte** ;
- `/storage/v1/object/public/` devient `/storage/v1/render/image/public/`, la requête existante est
  **conservée** (`?v=2` → `?v=2&width=640&quality=75`), et une adresse déjà rendue ne se retransforme
  pas ;
- la largeur demandée est un **palier** — la largeur en points multipliée par `PixelRatio.get()`,
  arrondie au palier supérieur. Sans paliers, chaque taille d'écran créerait sa propre variante chez
  le CDN, et chacune compterait comme une transformation ;
- la qualité est bornée entre 20 et 100 ;
- manipulation de chaînes, pas de `URL` : le module se joue sous Node comme sous Hermes.

Test `rendu.test.ts` : adresse Supabase avec et sans `?v=N`, autre origine, idempotence, `null` et
`undefined`, bornes de qualité, paliers.

**Un repli en trois temps** — `src/shared/ui/useSourceRendue.ts` : `useSourceRendue(uri, { largeur,
qualite })` rend `{ source, onError }`. La première erreur sur l'adresse **rendue** rejoue l'adresse
**d'origine** ; la seconde laisse le composant afficher son repli. *Corrigé à la lecture du code* :
une transformation peut échouer — un format ou un poids hors des limites du service, un plan qui
changerait un jour — et sans ce temps intermédiaire, la panne d'un service accessoire viderait des
cartes dont l'image existe.

**`expo-image` partout où une image distante s'affiche**, avec `cachePolicy="memory-disk"`,
`transition={200}` — la durée d'[`ApparitionEnFondu`](../../src/shared/ui/ApparitionEnFondu.tsx) —,
`contentFit` et `recyclingKey`. Un `resizeMode` posé dans un style n'existe plus : il devient la prop
`contentFit`.

| Fichier | Ce qui change | Piège |
|---|---|---|
| [`VisuelAvecRepli.tsx`](../../src/shared/ui/VisuelAvecRepli.tsx) | `Image` d'`expo-image`, par `useSourceRendue` ; props `contentFit` (défaut `cover`) et `largeur` ; `recyclingKey={uri}` | **une seule image rendue à la fois** : la règle « le repli remplace, jamais dessous » ([theme.md](../theme.md#les-décisions-durables)) tient telle quelle — le repli local n'a pas de transition, l'image distante en a une |
| [`CampusCard.tsx`](../../src/features/Campus/components/CampusCard.tsx), [`FreeRoomSectionCard.tsx`](../../src/features/Campus/Dashboard/components/FreeRoomSectionCard.tsx) | `resizeMode` du style → `contentFit="cover"`, et la largeur transmise | le fond gris reste sur le conteneur |
| [`BdeAnnonceCard.tsx`](../../src/features/Campus/Bde/BdeAnnonceCard.tsx) | deux `Image` d'`expo-image` sur la **même** source rendue : la copie floutée (`blurRadius={16}`, `cover`) et l'affiche (`contain`) ; `recyclingKey={annonce.id}` ; la transition sur l'affiche seule | une seule requête réseau pour les deux : le cache disque est partagé |
| [`BdeDetailsScreen.tsx`](../../src/features/Campus/Bde/BdeDetailsScreen.tsx) | `useImageRatio` et son `Image.getSize` disparaissent : le cadre lit `onLoad`, qui rend `source.width` et `source.height`, borné entre 3:4 et 16:9 comme avant, ratio initial 1 | le cadre change de ratio au chargement, exactement comme il le faisait à la mesure |
| [`LogoEtablissement.tsx`](../../src/features/Scolarite/components/LogoEtablissement.tsx) | `Image.getSize` → `onLoad` ; en filigrane, l'image se pose dans sa boîte plafond à opacité nulle jusqu'à la mesure, puis prend sa largeur exacte | « rien tant que le ratio n'est pas mesuré » reste vrai à l'œil |
| [`VisionneuseImages.tsx`](../../src/shared/ui/VisionneuseImages.tsx) | **gardée** — `react-native-image-viewing` —, alimentée en adresses rendues à 1600 px, qualité 85 | elle affiche par le `Image` de React Native, donc hors du cache d'`expo-image` ; une visionneuse maison est un sujet de la 6.3 ([7-J](7-j-ecrans.md)) |

| Surface | Largeur demandée | Qualité |
|---|---|---|
| carte d'annonce — carrousel (0,6 × écran) et grille | la largeur de la carte | 70 |
| cartes Campus et de bâtiment | la largeur de la carte | 70 |
| fiche d'annonce et sa galerie | la largeur d'écran moins les marges | 80 |
| visionneuse plein écran | 1600 | 85 |
| logo d'établissement | la largeur du logo | 80 |

Les ressources **locales** (`require`) restent sur le `Image` de React Native — l'écran de démarrage
d'`App.tsx`, le menu de développement, l'accueil, l'écran À propos : elles ne coûtent rien et n'ont
rien à y gagner.

### 2 bis. Le visuel publié ne change pas de règle

Aucune colonne ne change de sens : `image_url`, `images` et la table `visuels` portent toujours des
adresses **d'origine**, et c'est l'application qui les transforme au moment de les afficher. Publier
une adresse de rendu dans la base figerait une largeur et une qualité dans la donnée, et les
versions antérieures à la 6.2.2 ne sauraient pas quoi en faire.

### 3. L'étiquette envers Celcat

**(a) Un cache d'occupation par bâtiment et par jour.** *Corrigé à la lecture du code* : les
dix-huit runs de `ukit.celcat.occupation` ne partent pas du tableau de bord, comme la
[mise à plat](../phase-6/6-2-mise-a-plat.md) et [7-J](7-j-ecrans.md) l'écrivaient, mais de la **fiche d'un
bâtiment** — [`useFreeRoomsData.ts:61-78`](../../src/features/Campus/FreeRoom/hooks/useFreeRoomsData.ts),
dont le seul hôte est [`FreeRoomDetailsScreen`](../../src/features/Campus/FreeRoom/FreeRoomDetailsScreen.tsx) —,
**une requête par salle, à chaque ouverture**. Le tableau de bord ne joue que la liste des salles, en
cache sept jours.

- `src/features/Campus/services/occupationCache.ts`, pur, sur le modèle de
  [`groupListCache.ts`](../../src/features/Planning/services/groupListCache.ts) :
  `TTL_OCCUPATION_MS` à dix minutes, clé `occupation@1:<bâtiment>:<jour>`, `lireOccupation(brut)`
  défensif, `estFraiche(cache, maintenant)`.
- `src/features/Campus/services/OccupationService.ts`, la couture : mémoire, puis `AsyncStorage` si
  frais, sinon les runs par salle et l'écriture. **Un lot où toutes les salles échouent n'est pas mis
  en cache** : un cache vide masquerait une panne pendant dix minutes.
- `useFreeRoomsData.loadSchedules` appelle le service au lieu de son `Promise.all` ;
  `calculateFreeRooms` ne bouge pas.
- Le préfixe `occupation@1:` rejoint la purge de
  [`TimeMockService`](../../src/shared/services/TimeMockService.ts) : une date simulée ne doit pas
  relire l'occupation réelle.

Dix minutes, parce que l'occupation d'une salle est **éditoriale** — elle ne bouge pas dans l'heure —,
que le plus petit créneau affiché dure quinze minutes, et que le gaspillage mesuré est le va-et-vient
tableau de bord, fiche, retour, fiche, dans la même minute.

**(b) Une sonde, pour décider de la requête groupée.**
[campus-salles-libres.md](../features/campus-salles-libres.md#décisions-de-conception) justifie une
requête par salle : la réponse ne porte pas l'identifiant de la ressource interrogée. C'est peut-être
contournable — la description d'un événement nomme sa salle —, et ça se **mesure** avant de se
décider. `sondes/mesures/occupation_groupee.py`, joué à la main par la façade Python du moteur, comme
[`sondes/sonde/moteur.py`](../../sondes/sonde/moteur.py) :

1. `ukit.celcat.salles`, puis les salles dont le libellé contient `A28` — la règle de
   `extractBuildingsFromRooms` ;
2. pour **trois journées** — un mardi ordinaire, une journée d'examens, une journée de vacances —,
   `ukit.celcat.occupation` joué **une fois avec les dix-huit identifiants**, puis **dix-huit fois
   avec un seul** ;
3. comparer : les mêmes identifiants d'événement des deux côtés ; pour chaque événement du run
   groupé, le nombre de noms de salle retrouvés dans sa description ; l'attribution par le nom contre
   la salle dont le run individuel l'a rendu ; les cours multi-salles présents dans chacun des runs
   individuels concernés.

**Critère** : sur les trois journées, identifiants identiques, au moins 99 % d'événements attribuables
à zéro ou une salle, **aucun** événement sans salle hors vacances, et attribution juste à 100 %. Si
le critère tient, la requête groupée passe en 6.3 ; sinon la règle actuelle reste, derrière le cache.
Le résultat s'écrit dans campus-salles-libres.md, section « Décisions de conception ».

**(c) Un disjoncteur par hôte, pour les runs que personne n'a demandés.**

- `src/shared/aetherius/disjoncteur.ts`, pur et testé : `type Origine = 'utilisateur' | 'automatique'` ;
  seuil de **trois** échecs `unavailable` consécutifs par hôte ; refroidissements croissants de
  **30 s, 2 min, 10 min**, plafonnés ; un succès referme ; un échec d'une autre famille — `rejected`,
  `data` — ne compte pas, ce n'est pas une panne de transport. L'hôte se déduit du run :
  `inputs.domaine`, puis `inputs.lien`, puis `vars.domaine`, `vars.api`, l'adresse du premier pas, et
  à défaut le nom du Blueprint.
- [`runBlueprint.ts`](../../src/shared/aetherius/runBlueprint.ts) gagne `options.origine`, **défaut
  `utilisateur`** : aucun appelant existant ne change de comportement tant qu'il n'est pas étiqueté.
  Un run automatique sur un hôte ouvert rend un échec `unavailable` **ordinaire**, sans requête, et
  chaque écran fait ce qu'il fait déjà d'une source en panne : le Planning sert son cache daté, une
  section garde son contenu. Un geste de l'utilisateur — « Réessayer », tirer-pour-rafraîchir —
  **passe toujours**, et l'échec qu'il rencontre fait monter le palier.
- `src/shared/aetherius/observateurs.ts`, pur : `onEchecDeRun(abonne)` et `signalerEchec(…)`, appelé
  par `runBlueprint` sur tout échec non silencieux. *Corrigé à la lecture du code* : c'est le point
  de branchement de la mesure de [7-D](7-d-la-mesure.md), et il doit être un registre pur —
  `AppCore` importe `PlanningApiService`, qui importe `runBlueprint` ; si `runBlueprint` importait la
  mesure, qui lit un réglage, le cycle serait fermé.
- Sont étiquetés `automatique` : le rechargement au focus et le repli de `relireTelephone` du Planning
  ([`ScheduleList.tsx`](../../src/features/Planning/components/ScheduleList.tsx)) ; la
  replanification des rappels et la synchronisation d'origine `lancement`, `premier-plan` ou `tache`
  dans [`entretien.ts`](../../src/shared/services/entretien.ts), par une fonction pure
  `origineDuRun` ajoutée à [`calendrier/tentative.ts`](../../src/shared/services/calendrier/tentative.ts)
  et testée ; le retour au premier plan des widgets
  ([`useWidgets.ts`](../../src/features/Scolarite/widgets/useWidgets.ts), puis
  [`runner.ts`](../../src/features/Scolarite/widgets/runner.ts)) ; les rechargements de listes au
  cache expiré (`PlanningDataManager.loadData`, `CampusDataManager.loadData`). `PlanningRunOptions`
  porte l'origine jusqu'à [`PlanningIcalSource.ts`](../../src/features/Planning/services/PlanningIcalSource.ts).
- Un panneau `ModMenuDisjoncteur.tsx` dans le menu de développement, sur le modèle de
  [`ModMenuEntretien.tsx`](../../src/shared/ui/ModMenuEntretien.tsx) : les hôtes, leurs échecs,
  « ouvert jusqu'à », et « Réarmer ».

Le disjoncteur couvre l'**Act I** — Celcat, Croustillant, Affluences, les exports iCalendar. Il ne
couvre ni les lectures de la base, qui passent par `supabase-js`, ni les portails de l'Act II, où un
hôte injoignable rend `blocked` ou `engine` et non `unavailable`
([qualite.md](../qualite.md#couper-le-réseau-sans-couper-lappareil)).

**(d) Une fenêtre de fraîcheur de 60 s sur le Planning.** `src/features/Planning/services/fraicheur.ts`,
pur : `relectureInutile(derniere, cle, maintenant)`. Dans `ScheduleList`, un run d'origine
`automatique` sur une clé relue depuis moins de soixante secondes ne part pas ; la dernière lecture
n'est notée que sur une réponse fraîche, jamais sur un repli de cache. L'affichage ne change pas.
`ScheduleList` est à **368 lignes effectives sur les 400** de `max-lines` (mesuré le 2026-09-15) : la
règle vit dans le module pur, la classe n'en porte que l'appel. La vraie politique
*stale-while-revalidate* — le jour affiché depuis le cache tout de suite, le réseau derrière — se voit
à l'écran, et appartient donc au lot Planning de [7-J](7-j-ecrans.md).

**(e) Un `User-Agent` qui nous nomme.** Les six `blueprints/ukit-celcat-*.blueprint.json` gagnent
`vars.user_agent = "UKit (+https://github.com/KAE-Lab/UKit; contact@kaelab.dev)"` et l'en-tête
`"User-Agent": "{{ vars.user_agent }}"`, sans numéro de version — un fichier publié se périmerait.
Version +1 dans [`versions.json`](../../blueprints/versions.json), publication par
`npm run blueprints:publish`, une ligne dans [sources-externes.md](../sources-externes.md#1-celcat--emplois-du-temps).
Le moteur passe les en-têtes tels quels — un Blueprint Affluences pose déjà le sien
([`ukit-campus-bibliotheques.blueprint.json:36`](../../blueprints/ukit-campus-bibliotheques.blueprint.json)) ;
ce qui reste à prouver, c'est que le `fetch` natif d'Expo le laisse partir : un Blueprint d'écho, non
versionné, joué sur les deux builds de développement. S'il ne part pas, `EXPO_PUBLIC_USE_RN_FETCH=1`
à la construction, écrit dans [plateforme.md](../plateforme.md). La parité compare les corps, pas les
en-têtes : elle ne bouge pas.

### 4. Le formulaire pré-rempli

L'application ouvrira le formulaire de retours avec ce qu'elle sait déjà : l'appareil, le système, la
version, l'onglet d'où l'on vient, et la bonne réponse cochée à la première question selon la porte
empruntée. Moins de questions pour qui signale un bug, et des colonnes fiables pour l'importeur des
retours.

**Rien n'est à demander au propriétaire du produit.** La page publique d'un formulaire Google embarque
sa structure (`FB_PUBLIC_LOAD_DATA_`) : le numéro d'entrée de chaque question et l'intitulé exact de
chaque option. Relevée le 2026-09-15, sur l'adresse longue
`https://docs.google.com/forms/d/e/1FAIpQLScLRZZ5VD3__Zq8pIXuezfacCvSzBHAALHyKq98iM2LzQ6rUg/viewform` :

| Question | Section | Type et options | Entrée | Ce que l'application y met |
|---|---|---|---|---|
| Pourquoi viens-tu? | première page | choix unique : `Suggérer une fonctionnalité`, `Signaler un bug`, `Demander un campus`, `Rien` | `entry.82564016` | `Demander un campus` depuis la modale d'un campus non relié et la page Scolarité non reliée ; rien depuis la pastille |
| Sur quelle section de l'application le bug se trouve? | Bug | choix unique : `Planning`, `Campus`, `Scolarité`, `Settings`, `Onboarding` | `entry.408146347` | l'onglet dont on a touché la pastille ; Réglages s'écrit `Settings` |
| Appareil | Bug | réponse courte | `entry.403643659` | `Device.modelName` (expo-device, déjà une dépendance) |
| Version d'Android/iOS | Bug | réponse courte | `entry.558675343` | `Device.osName` et `Device.osVersion` : « iOS 18.5 », « Android 9 » |
| Version de l'application | Bug | réponse courte | `entry.1090115049` | `versionApplication()` de [`contexte.ts`](../../src/shared/ciblage/contexte.ts) |

**Ce qui ne se pré-remplit jamais** : le campus demandé (`entry.2002067266` — l'application ne connaît
que le campus choisi, qui est justement le mauvais), l'accord du volontaire (`entry.1882068119`, un
consentement), les adresses e-mail, et le petit sondage.

**Les numéros vivent dans le catalogue, pas dans le code.** Un numéro d'entrée change quand une question
est supprimée puis recréée : écrit dans le binaire, il demanderait une release. Il s'écrit donc dans
`services` du catalogue, sous deux clés nouvelles qui sont des **gabarits** :

- `services.formulaire`, pour la pastille grise : l'adresse longue suivie de
  `?usp=pp_url&entry.408146347={onglet}&entry.403643659={appareil}&entry.558675343={systeme}&entry.1090115049={version}` ;
- `services.formulaire_campus`, pour la modale d'un campus non relié et la page Scolarité non reliée :
  l'adresse longue suivie de `?usp=pp_url&entry.82564016=Demander%20un%20campus`.

**`services.adaptation` ne change pas** : les versions installées l'ouvrent telle quelle, et un gabarit y
ferait apparaître `{version}` en toutes lettres dans leurs formulaires. Une 6.2.2 lit le gabarit s'il
existe, et retombe sur `services.adaptation` sinon.

- `remplirGabarit(gabarit, valeurs)` rejoint [`liensDuFormulaire.ts`](../../src/shared/navigation/liensDuFormulaire.ts),
  pur et déjà testé : chaque `{clé}` devient sa valeur encodée (`encodeURIComponent`), un paramètre dont
  la valeur manque est retiré en entier, un gabarit sans accolade reste intact. Les domaines internes et
  `destinationReelle` ne bougent pas : l'adresse longue est chez Google.
- Une couture, `src/shared/navigation/formulaireDeRetours.ts`, rassemble les valeurs — l'onglet, passé
  par la pastille ; l'appareil et le système, par expo-device ; la version, par `contexte.ts` — et
  choisit la clé selon la porte. Les trois appelants passent par elle :
  [`PastilleService.tsx`](../../src/shared/messages/PastilleService.tsx), `ModaleCampusNonRelie` dans
  [`MainTabNavigator.tsx`](../../src/shared/navigation/MainTabNavigator.tsx), et
  [`CampusNonRelie.tsx`](../../src/features/Scolarite/components/CampusNonRelie.tsx) par
  `ScolariteDashboard`.
- Les deux clés s'écrivent dans les trois lignes de [`etablissements.sql`](../../supabase/etablissements.sql)
  **et** dans [`socle.ts`](../../src/shared/etablissements/socle.ts) — le test de divergence l'exige —, et se
  publient avant la sortie : les versions antérieures les ignorent.
- Tests ajoutés à `liensDuFormulaire.test.ts` : substitution et encodage (espaces, accents), valeur
  absente, gabarit sans paramètre, `resteDansLaVue` sur l'adresse obtenue.
- **À vérifier une fois sur appareil** : une valeur pré-remplie dans une section que la personne ne
  visite pas — les champs du bug quand elle choisit « Suggérer une fonctionnalité » — ne doit pas partir
  avec sa réponse.

Les libellés des questions ne changent pas : l'importeur les reconnaît par leur libellé
([pilotage.md](../pilotage.md#les-retours)).

### 5. Le socle du dépôt

**L'intégration continue** — `.github/workflows/verifier.yml`, déclenché sur **toute pull request et
toute poussée, sur toutes les branches** : une avance rapide de `main` porte alors un commit déjà
vérifié sur sa branche de version.

| Tâche | Ce qu'elle joue |
|---|---|
| `application` | Node 22, `npm ci` avec `HUSKY: 0`, `npm run typecheck`, `npm run lint -- --max-warnings=0` — la base est zéro ([qualite.md](../qualite.md#base-de-référence)) —, `npm test` |
| `console` | `npm ci --prefix console`, `npm --prefix console run build` avec les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` déjà posées pour [`console.yml`](../../.github/workflows/console.yml) — la construction échoue sans elles |
| `sondes` | Python 3.12, `python -m unittest discover -s sondes` |

**La protection de `main`**, posée par le propriétaire du produit une fois le workflow en place :
*Settings → Rules → Rulesets*, une règle sur `main` qui **exige les trois vérifications**. Sans
« pull request obligatoire » : `main` avance en avance rapide depuis les branches de version, et
GitHub accepte une poussée directe dont le commit a déjà passé ses vérifications sur une autre
branche. C'est ce qui rend fausse la limite « un code qui ne compile pas peut être fusionné »
([qualite.md](../qualite.md#limites-connues)).

**Dependabot** — `.github/dependabot.yml`, hebdomadaire, le lundi matin :

| Écosystème | Groupes | Ignoré, et pourquoi |
|---|---|---|
| npm, racine | `outillage` (ESLint, typescript-eslint, vitest, prettier, husky, commitlint, commitizen, dotenv, qs, pdfjs-dist — ce dernier impose `npm run pdfjs:vendor`), `supabase` (`@supabase/*`), `aetherius` (`@aetherius/*`) | ce que le SDK épingle — `expo*`, `@expo/*`, `react`, `react-native*`, `@react-native-*`, `@react-navigation/*`, `babel-preset-expo`, `typescript`, `@types/react` — : ils se prennent à la montée du socle, jamais un par un |
| npm, `console/` | un groupe | — |
| GitHub Actions | un groupe | — |
| pip, `sondes/` | — | `aetherius` : sa version suit celle de `@aetherius/engine`, 0.5.9 des deux côtés, et se monte à la main, ensemble |

Les **alertes de sécurité** restent individuelles. La politique s'écrit dans
[plateforme.md](../plateforme.md#monter-de-sdk) : une alerte critique ou haute dont le correctif est
transitif part en `npm audit fix`, sans `--force`, dans une PR `chore(deps)` qui passe les portes et
`expo export` ; un correctif qui touche un paquet épinglé par le SDK attend la **montée du socle**,
une fois par version. Les alertes que GitHub signalait à la sortie de la 6.2.1 — cinquante-trois, dont une
critique — se trient dans ce jalon.

**Les migrations numérotées.** Le schéma s'applique aujourd'hui à la main, par `psql`, depuis trois
fichiers rejouables : ça tient pour un publieur qui a tout en tête, pas pour une suite de jalons
qui ajoutent chacun leurs colonnes. Le CLI de Supabase — v2.117.0,
déjà lié au projet dans `supabase/.temp/` —, par `npx --yes supabase`, jamais en dépendance :

1. **La ligne de base** : `supabase/migrations/20260914000000_ligne_de_base.sql`, la concaténation
   commentée de `schema.sql`, `fonctions.sql` et `policies.sql`, **marquée appliquée sans être
   jouée** — `npx --yes supabase migration repair --status applied 20260914000000 --linked` —, puis
   `migration list --linked` et `db push --linked --dry-run` ne doivent rien proposer. `db pull` et
   `db diff` passent par un conteneur Docker ; le dépôt a évité jusqu'ici d'en dépendre — la fonction
   d'envoi se déploie avec `--use-api` —, et la ligne de base n'en a pas besoin : les trois fichiers
   sont déjà rejouables.
2. **Ensuite** : `migration new <nom>`, le fichier, `db push --linked` par la connexion directe
   (`SUPABASE_DB_PASSWORD`).
3. **La source de vérité devient `supabase/migrations/`** : c'est le registre de ce que la production
   porte, et la base le prouve par sa table d'historique. `schema.sql`, `fonctions.sql` et
   `policies.sql` restent la **vue lisible** de l'état, mise à jour dans le même commit que la
   migration. `etablissements.sql` reste un fichier de **donnée**, rejoué par `psql` après la
   migration qui crée ses colonnes.

La section « Migrations » de [`supabase/README.md`](../../supabase/README.md#migrations), qui décrit une
convention `NNN-description.sql` jamais employée, est réécrite ; [backend.md](../backend.md#migrations)
renvoie vers elle.

### 6. Les colonnes additives

Trois migrations, écrites et poussées dans ce jalon **parce que la console et les campus en ont besoin
avant la 6.3**, et invisibles pour l'application installée.

**`annonces`** — `…_annonces_publication.sql` :

| Colonne | Type et défaut | Sens |
|---|---|---|
| `type` | `text not null default 'evenement'`, check `evenement`, `info`, `bon_plan`, `partenaire` | la nature de la carte, et ses badges en 6.3 |
| `emplacements` | `text[] not null default '{annonces}'`, check inclus dans `annonces`, `restaurants`, `bibliotheques`, `salles` | les carrousels où la carte s'insère |
| `ajustement` | `text not null default 'couvrir'`, check `couvrir`, `contenir` | l'image couvre le cadre 4:5 autour de sa focale, ou s'y contient sur fond flou |
| `focale` | `jsonb not null default '{"x": 0.5, "y": 0.3}'` | le point gardé au centre du recadrage, en fractions de l'image |
| `priorite` | `integer not null default 0` | le poids dans l'ordre |
| `epinglee` | `boolean not null default false` | en tête, avant toute rotation |
| `creneaux` | `jsonb`, nul | les plages de mise en avant : `[{"jours": [1, 2, 3], "de": "11:00", "a": "14:00"}]` |
| `statut` | `text not null default 'publiee'`, check `brouillon`, `publiee`, `archivee` | le cycle de vie ; une annonce **programmée** est une annonce `publiee` dont `publiee_le` est à venir |
| `blurhash` | `text`, nul | le placeholder, calculé au téléversement |
| `partenaire` | `jsonb`, nul | `{"nom", "logo_url", "lien"}` |

Plus un `check (couleur is null or couleur <> 4)` — l'interdit n'existe aujourd'hui que dans la console
([`tables.ts:47`](../../console/src/schema/tables.ts)) —, précédé d'une vérification qu'aucune ligne ne
porte le 4. Et la **politique de lecture** :

```sql
drop policy if exists "annonces publiees lisibles" on public.annonces;
create policy "annonces publiees lisibles" on public.annonces for select to anon
    using (active and statut = 'publiee' and publiee_le <= now()
           and (expire_le is null or expire_le > now()));
create index if not exists annonces_publication_v2_idx
    on public.annonces (statut, active, publiee_le desc);
```

Deux décisions de mise en œuvre, prises à la rédaction de cette spécification :

- **Les lignes existantes reçoivent `ajustement = 'contenir'`**, dans la migration. Elles ont été
  composées pour la règle d'avant — une affiche jamais recadrée — et la 6.3, qui lira la colonne, les
  recadrerait sinon. Toute ligne nouvelle prend le défaut décidé, `couvrir`.
- **La politique filtre enfin `publiee_le`** : une annonce datée dans le futur était visible tout de
  suite ([`policies.sql:54`](../../supabase/policies.sql)). Elle disparaît désormais pour **tout le
  parc**, versions anciennes comprises, puisque le filtre est dans la base — c'est l'intention :
  pouvoir programmer une annonce.

**Aucune version installée ne casse** : [`BdeService`](../../src/features/Campus/services/BdeService.ts)
nomme ses colonnes (`COLONNES`), et la projection ignore l'inconnu. Et **la console actuelle ne touche
pas les colonnes nouvelles** : [`enregistrer`](../../console/src/lib/base.ts) n'écrit que les champs
éditables de son descripteur. Elle les exposera en [7-F](7-f-console-annonces.md).

**`editeurs`** — `…_editeurs_roles.sql` : `role text not null default 'admin'`, check `admin`,
`redacteur`, `lecteur` ; `etablissements text[]`, nul pour « tous ». Les comptes existants deviennent
`admin`. `private.est_editeur()` ne change pas : les politiques qui lisent le rôle relèvent de
[7-H](7-h-console-roles.md).

**`etablissements`** — `…_etablissements_credits_campus_alias.sql` : `credits jsonb`
(`[{"nom", "role", "lien"}]`), `campus text` (le libellé qui regroupe, et qui remplacera les « Talence »
écrits en dur), `alias text[] not null default '{}'` (les mots des étudiants, pour la recherche). **La
règle des trois gestes est scindée**, et c'est voulu ([backend.md](../backend.md#le-schéma)) : dans ce
jalon, la colonne en base, puis ses valeurs dans les trois lignes de `etablissements.sql` — dans cet
ordre, `db push` avant `psql -f` ; **en 6.3 seulement**, ce qui la lit — `COLONNES`, `types.ts`,
`catalogue.ts`, `socle.ts`, et la version du cache —, une fois que la base porte colonne **et** valeurs
(piège mesuré le 2026-08-29).

## Décisions et pièges

- **`expo-image` est natif** : builds de développement neufs sur les deux appareils. Il fait partie
  d'Expo Go, qui peut servir à un essai rapide, jamais à la vérification.
- **Le Galaxy A8 (API 28)** : `blurRadius` et `transition` à vérifier sans clignotement sous le doigt —
  le défaut corrigé en 6.2.1 ([theme.md](../theme.md#les-décisions-durables)).
- **Les transformations se facturent** au-delà de cent images d'origine par mois : les paliers de
  largeur existent aussi pour ça.
- **Le disjoncteur vit en mémoire** : un redémarrage le réarme.
- **Sans `strictNullChecks`** : `run.ok === false`, et `origine ?? 'utilisateur'`, jamais `||`.
- **`max-lines`**, lignes effectives mesurées le 2026-09-15 sur 400 : `ScheduleList` 368, `DayView` 369,
  `AppCore` **397**, `MainTabNavigator` 375, `SettingsScreen` 373, `entretien` 219, `useFreeRoomsData`
  133, `runBlueprint` 47. La logique nouvelle va dans des modules purs ; `AppCore` n'a plus la place de
  rien.
- **La parité** (`npm run parity`) doit rester verte après la montée de version des six Blueprints
  Celcat.
- **Le parc ne se met pas à jour d'un coup** : les versions antérieures demandent les objets d'origine
  pendant des semaines. C'est [7-A](7-a-bande-passante.md) qui les protège, pas ce code.

## Dépendances

- La [mise à plat](7-mise-a-plat.md), qui a écrit ce document.
- **[7-A](7-a-bande-passante.md)**, pour la donnée : le code se développe sans lui, mais l'egress ne
  se mesure qu'avec des objets re-encodés.
- Le propriétaire du produit, pour deux gestes : la protection de `main`, et le tri des alertes
  Dependabot. Le lien pré-rempli du formulaire n'est plus nécessaire : sa structure se lit sur la page
  publique.
- **Aucun campus n'est attendu** : depuis le 2026-09-16, les lots qui publient un campus passent après la
  6.3 ([l'ordre de la phase](README.md#les-jalons-et-leur-ordre)). Si le relevé public de
  [7-B](7-b-nouveaux-campus.md) a lieu avant cette sortie et montre qu'un campus demande du code, ce code
  entre dans la publication qui suit le relevé — celle-ci si elle n'est pas encore partie, et alors la
  6.2.2 embarque ce campus comme l'[étape 9](../adaptation-campus.md#9-à-la-release-suivante) l'exige.

## Définition de « terminé »

Celle du [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-), plus :

- [x] `npx tsc --noEmit`, `npx eslint . --max-warnings=0`, `npm test` (760 tests), `npx expo-doctor`
  (21/21), `npx expo export` sur les deux plateformes — *joués le 2026-09-17 sur le code final*.
- [ ] `verifier.yml` vert sur la branche `v6.2.2` — *à la première poussée de la branche*.
- [x] `npm run parity` verte — *treize cas, le 2026-09-17, après la montée des six Blueprints Celcat,
  publiés dans la foulée*.
- [x] `migration list` montre la ligne de base et les trois migrations — *le 2026-09-17, par
  `--project-ref` ; `db push` appliqué, `etablissements.sql` rejoué, colonnes, politique, index,
  contraintes et gabarits relus dans la base*.
- [x] Le protocole ci-dessous joué sur les deux appareils, sur des builds de développement neufs — *le
  2026-09-21, iPhone 13 Pro en entier, Galaxy A8 en parcours court ; deux défauts trouvés et corrigés
  en séance (les rendus recadrés, le palier qui montait d'un coup), un inscrit au registre*.
- [ ] L'egress relevé avant et après.
- [x] Cette spécification amendée — bannière de livraison, écarts constatés.

## Plan de test

Sur les **builds de développement neufs**, iPhone 13 Pro et Galaxy A8, Metro lancé sur le poste.

*Ce que le poste a pu vérifier le 2026-09-17, avant les appareils* : le rendu d'image sort du CDN en
cache d'un an, `MISS` puis `HIT` (point 1) ; l'historique des migrations porte la ligne de base et les
trois migrations, et `verifier.yml` et `dependabot.yml` sont en place (point 8) ; la clé publiable ne
voit plus que l'annonce active, la politique filtrant `statut` et `publiee_le` (point 9 — les trois
annonces de test d'audience `testeurs` restent à jouer depuis la console et l'appareil). Les points 1 à
7 se jouent sur les appareils.

*Joué le 2026-09-21*, Metro lu depuis le poste pendant que le propriétaire du produit jouait, un point à
la fois. **iPhone 13 Pro**, tout : 23 visuels en `none` à la première ouverture, nos trois en rendu au
bon palier, les vingt tiers intacts ; 23 en `disk` à la relance ; le fondu, le ratio de la fiche, la
visionneuse ; le rendu cassé à la main rejoue l'origine ; 17 runs d'occupation puis zéro et la ligne
`[salles] … cache` ; le disjoncteur ouvert au troisième échec, 34 échecs réarmés au même palier, le run
automatique de l'entretien non joué, la sonde d'après le refroidissement montée à 2 min, un geste passé
pendant l'ouverture, refermé au premier succès ; le Planning : un `chargement automatique` après plus
d'une minute, deux `relecture inutile` dans la minute ; l'écho « le nôtre » ; le formulaire pré-rempli
sur les trois portes, la page d'engagement par-dessus ; trois annonces de test, seule la normale
visible, la programmée apparue à son heure au retour au premier plan, puis supprimées. **Galaxy A8** :
aucun flash sous le doigt, `disk` à la relance, 17 runs puis zéro, l'écho « le nôtre », le formulaire,
le disjoncteur ouvert après la date simulée. Ce qui n'a pas été joué : « relancer hors ligne » (un
build de développement ne se relance pas sans Metro ; le `disk` de Metro en tient lieu) et le repli
final des deux temps, le Wi-Fi étant resté allumé sous le mode avion — le repli est le composant
d'avant, inchangé, et le second temps est prouvé par le rendu cassé.

1. **Les images.** Onglet Campus, carrousel d'annonces, grille, fiche, visionneuse : fondu de 200 ms,
   jamais de repli sous l'image, une affiche non carrée entière sur son fond flou. Réseau ralenti : le
   gris, puis l'image. Relancer hors ligne : les visuels déjà vus restent, depuis le cache disque.
2. **Le repli.** `SUPABASE_URL=https://127.0.0.1:1` et `npx expo start -c` : le repli de chaque carte.
   Une adresse de rendu cassée à la main : l'image d'origine reprend.
3. **Les salles libres.** Ouvrir la fiche de l'A28, revenir, la rouvrir dans les dix minutes :
   **aucune** ligne `[chrono] ukit.celcat.occupation` dans Metro. Après dix minutes : dix-huit. Date
   simulée : de nouvelles lignes, la clé porte le jour.
4. **Le disjoncteur.** Interrupteur *Hors ligne* du menu de développement, trois retours au premier
   plan : `[disjoncteur] … ouvert`, et le panneau le montre. « Réessayer » part quand même — une ligne
   `[chrono]`. Réseau rendu, un geste réussi : refermé.
5. **Le Planning.** Quitter l'onglet et y revenir dans les soixante secondes : aucun run. Après : un
   run. L'affichage ne bouge pas dans les deux cas ; tirer et « Réessayer » partent toujours.
6. **Le `User-Agent`.** Le Blueprint d'écho, joué depuis le panneau Blueprints sur chaque build :
   l'en-tête arrive.
7. **Le formulaire.** Depuis la pastille grise, la modale d'un campus non relié et la page Scolarité
   non reliée : le formulaire s'ouvre avec l'appareil, le système et la version remplis, la section cochée
   sur l'onglet de la pastille, et « Demander un campus » cochée depuis les deux portes du campus ; la page
   d'engagement s'ouvre toujours par-dessus.
8. **Le socle.** Une PR jouet fait tourner `verifier.yml` ; une erreur de typage volontaire le fait
   rougir ; `dependabot.yml` apparaît valide dans *Insights → Dependency graph → Dependabot* ;
   `migration list --linked` montre la ligne de base appliquée.
9. **La politique des annonces.** Trois annonces d'audience `testeurs` : une en `brouillon`, une dont
   `publiee_le` est dans une heure, une normale. Seule la troisième paraît ; la deuxième paraît à son
   heure.

**L'egress**, en dernier : le tableau Usage relevé sur trois jours avant l'installation des builds,
puis trois jours après, avec un scénario fixe joué sur les deux appareils — dix ouvertures de l'onglet
Campus, trois fiches, une visionneuse, cinq bascules d'application ; dans les journaux du projet, les
requêtes `/render/image/` comptées contre `/object/public/`. Attendu : les octets par ouverture de
Campus divisés au moins par trois — 499 Ko devient autour de 120 Ko à 960 px en qualité 70 — et
**aucune** requête d'image au retour au premier plan.

## Limites écrites

- **Le disjoncteur ne se souvient de rien** après un redémarrage, et ne couvre ni la base ni l'Act II.
- **Une occupation modifiée dans les dix minutes** ne se voit qu'au terme du cache. L'occupation est
  éditoriale ; l'écart est accepté.
- **La visionneuse plein écran reste hors du cache d'`expo-image`** : une descente par ouverture, à
  1600 px.
- **Les versions installées avant la 6.2.2 demandent toujours les objets d'origine** : leur egress ne
  baisse que par [7-A](7-a-bande-passante.md).
- **Le pré-remplissage dépend des numéros de question de Google** : recréer une question change son
  numéro, et le champ arrive vide, sans erreur. Le gabarit du catalogue se corrige alors par une
  publication, et la règle s'écrit dans pilotage.md à la livraison, à côté de celle des libellés.
