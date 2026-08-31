# 6-A — Le socle moteur

> Brancher le moteur, poser la façade partagée, et migrer **une** source pour prouver la chaîne
> complète. Aucun gain visible pour l'utilisateur : c'est la fondation des sept jalons suivants.

> **Jalon livré.** Ce document a été amendé à la livraison : ce qui suit décrit ce qui est en place,
> et les trois endroits où la réalité a corrigé la spécification sont signalés par « Corrigé à la
> livraison ».

## Objectif

À la fin du jalon, l'application embarque le moteur Aetherius, sait jouer un Blueprint depuis
n'importe quel service, sait traduire un échec en écran, et **une source réelle passe déjà par
là** — les annonces de vie étudiante, derrière la signature inchangée de
[`BdeService.fetchAnnonces`](../../src/features/Campus/services/BdeService.ts).

Le choix de la source pilote n'est pas neutre : c'est la plus simple du lot (un fichier statique, une
requête, un filtre déclaratif), donc celle dont l'échec ne peut venir que du socle qu'on est en train
de poser.

## Ce qui est livré

### Les dépendances

```jsonc
// package.json
"@aetherius/engine": "^0.5.2",
"@aetherius/react-native": "^0.5.2",

// devDependencies
"vitest": "^3"
```

`react-native-webview`, `expo-secure-store` et `@react-native-async-storage/async-storage` sont
**déjà** des dépendances du projet, et ce sont les seules pièces de plateforme que les paquets
réclament — ils les déclarent en `peerDependencies` et ne les importent jamais eux-mêmes. Aucun
module natif nouveau, donc aucun changement de
[`app.config.ts`](../../app.config.ts) côté plugins, et le développement reste possible dans Expo Go.

`vitest` est le seul ajout hors moteur, et il porte les tests du socle : le pourquoi de ce choix est
en bas de page.

> **Corrigé à la livraison — la résolution ESM ne demande rien.** Les deux paquets sont en ESM avec
> un champ `exports`, et c'était le risque annoncé du jalon. Il n'existe pas :
> `unstable_enablePackageExports` vaut **`true` par défaut** dans Metro 0.83
> (`metro-config/src/defaults/index.js`), qu'Expo SDK 54 ne surcharge pas. **Aucun `metro.config.js`
> n'a été créé.** La vérification est faite sur un vrai bundle plutôt que sur une lecture de
> configuration : `npx expo export --platform android` produit un `.hbc` où l'on retrouve le code du
> moteur, l'agent injecté de la WebView et le nom du Blueprint. Si un jour la résolution échoue, le
> repli tient en une ligne — un `metro.config.js` qui pose le drapeau explicitement, comme le fait
> l'application de démonstration d'Aetherius.

Les deux paquets sont publiés sur npm en **0.5.2** (le jalon 3-H d'Aetherius y est). Discipline de
version : [6-z-livraison-finale.md](6-z-livraison-finale.md#dépendances).

### Le socle — `src/shared/aetherius/`

| Fichier | Rôle |
|---|---|
| [`client.ts`](../../src/shared/aetherius/client.ts) | la façade partagée, instanciée une fois. `client.run(blueprint, { inputs, onEvent })` |
| [`secrets.ts`](../../src/shared/aetherius/secrets.ts) | le `SecretResolver` de UKit, adossé à `SecureStoreService` |
| [`registry.ts`](../../src/shared/aetherius/registry.ts) | le registre : socle embarqué seul à ce jalon, surcouche distante en 6-C |
| [`failures.ts`](../../src/shared/aetherius/failures.ts) | `describeFailure` traduit en familles d'écran et en clés de traduction |
| [`runBlueprint.ts`](../../src/shared/aetherius/runBlueprint.ts) | l'appel type : résoudre le Blueprint, le jouer, rendre un résultat ou un échec décrit |
| [`index.ts`](../../src/shared/aetherius/index.ts) | la porte d'entrée : un service importe d'ici, jamais des paquets |
| `*.test.ts` | les tests du resolver, du registre et du modèle d'erreur, colocalisés |

Deux choix de conception rendent trois de ces cinq fichiers jouables **hors appareil**, et ils valent
mieux que la testabilité qui les a motivés :

- `failures.ts` importe `describeFailure` du **moteur** (`@aetherius/engine`) et non du paquet React
  Native qui le re-exporte. Le modèle d'erreur ne dépend d'aucune plateforme, et l'import le dit.
- `ukitSecrets(store)` **reçoit** son magasin au lieu de l'importer. Le trousseau est un fait de
  plateforme, la projection `bordeaux_user` → `username` n'en est pas un. `client.ts` branche le vrai
  `SecureStoreService` — et reste le seul fichier du socle à toucher `expo-secure-store` et React
  Native.

Une contrainte de typage à connaître avant d'écrire le premier service des jalons suivants :
`BlueprintRun` se teste avec **`run.ok === false`**, jamais avec `!run.ok`.
[`tsconfig.json`](../../tsconfig.json) étend `expo/tsconfig.base` **sans activer `strict`**, et sans
`strictNullChecks` TypeScript ne restreint pas une union discriminée sur la simple véracité du
discriminant ; le compilateur répond alors « Property 'failure' does not exist ».

**Les secrets méritent leur fichier.** L'adaptateur fourni par le paquet (`keychainSecrets`) traduit
un nom de secret en clé de trousseau et lit une chaîne. UKit stocke ses identifiants autrement :
[`SecureStoreService`](../../src/shared/services/SecureStoreService.ts) écrit un **objet JSON unique**
sous `UKIT_CAS_CREDENTIALS`. Le resolver de UKit lit donc ce document et en projette les champs
(`bordeaux_user` → `username`, `bordeaux_pass` → `password`). Renommer les clés du trousseau pour
plaire à une bibliothèque serait exactement la migration qu'une bibliothèque n'a pas à imposer — et
elle déconnecterait tous les utilisateurs déjà installés.

Trois invariants à ne pas perdre en route, tous garantis par le paquet et à ne pas contourner :

- seuls les secrets **déclarés** par le Blueprint sont demandés au resolver ;
- une valeur passée à `run` gagne sur celle du trousseau ;
- aucune valeur résolue ne franchit la frontière des journaux — le masquage est actif par défaut, et
  `redact: false` n'a de sens qu'en déboguant le moteur lui-même.

### Le montage, une fois pour toute l'application

```tsx
// rootContainer.tsx
<AetheriusWebView />
<AetheriusConfirm approveLabel={Translator.get('CONFIRM')} rejectLabel={Translator.get('CANCEL')} />
```

Les deux vivent **avec l'application, pas avec un run** : la WebView cachée sert tous les Blueprints
Act II successivement, et le modal de confirmation doit exister au moment où une question est posée.
Le point de montage est [`rootContainer.tsx`](../../src/shared/navigation/rootContainer.tsx), à côté
de [`ModMenu`](../../src/shared/ui/ModMenu.tsx) — même durée de vie, même raison.

Le montage ne coûte rien au démarrage : la WebView **ne crée sa vue native qu'au premier run
navigateur**, pas au montage. Une application qui ne joue que des Blueprints Act I ne porte jamais de
processus web caché.

Les libellés du modal viennent du `Translator` : ceux du paquet sont en dur, et l'invariant « aucune
chaîne visible en dur » de UKit ne souffre pas d'exception parce qu'elle vient d'une bibliothèque.
**Son habillage, lui, est encore celui du paquet** — la palette de la Console Aetherius, qui dénote
dans UKit. Il est aligné sur les tokens au jalon [6-F](6-f-scolarite.md), premier jalon où un
`confirm` existe réellement : aucun Blueprint embarqué n'en déclare aujourd'hui, donc le styler
maintenant reviendrait à livrer un écran que personne ne peut voir ni vérifier. La prop `render` est
prévue pour ça.

Conséquence à connaître avant de s'en étonner : **personne qui écoute = pas de question posée**. Un
`confirm` dans un run lancé alors qu'aucun modal n'est monté applique immédiatement sa politique de
délai, c'est-à-dire un refus. C'est voulu : garer un run cinq minutes devant un écran qui ne
montrera jamais rien serait un blocage sans cause visible.

### Le modèle d'erreur, et c'est le vrai livrable

Tous les services de UKit renvoient aujourd'hui `null` ou `[]` en cas d'échec, et leur propre
documentation le dit : « une panne du fournisseur et une réponse légitimement vide sont
indistinguables » ([sources-externes.md](../sources-externes.md#modèle-derreur-commun)). Un écran
« aucun résultat » peut donc masquer une source morte, et c'est un défaut d'expérience, pas une
subtilité d'architecture.

`describeFailure` range un échec dans neuf familles. `failures.ts` les traduit en ce que l'écran doit
faire, et en clés de traduction dans les trois dictionnaires — la clé y est typée `TranslationKey`,
donc leur présence dans `fr`, `en` et `es` est vérifiée par le compilateur, pas par une relecture :

| `kind` | Ce que ça veut dire | Ce que l'écran fait |
|---|---|---|
| `unavailable` | la source est en panne ou injoignable | « Service indisponible », bouton Réessayer |
| `rejected` | la source a répondu autre chose que ce qu'on attendait | « Réponse inattendue » — la source a changé |
| `data` | la page ou la réponse n'est plus celle que le Blueprint décrit | « Contenu introuvable » — Blueprint à corriger |
| `blocked` | échec **nommé** par le Blueprint (`fail:LOGIN_FAILED`) | le message du cas, tel quel |
| `config` | une entrée ou un secret manque | « Saisis tes identifiants » — pas une panne |
| `blueprint` | le fichier est faux ou non portable | ne pas réessayer, remonter |
| `cancelled` | l'utilisateur est parti | ne rien afficher |
| `unsupported` | une pièce de plateforme manque | ne devrait jamais arriver en production |
| `engine` | un bug | remonter, ne pas masquer |

Et son pendant, qui est la moitié du sujet : **une liste vide n'est pas une erreur**. Un run réussi
dont les sorties portent une liste vide a réellement trouvé une liste vide.

Les neuf familles ne demandent pas neuf écrans. Ce jalon en livre le **classement** et les chaînes ;
chaque jalon de migration branche ensuite ses écrans dessus, en commençant par distinguer les trois
qui comptent pour l'utilisateur : « c'est cassé chez eux », « c'est cassé chez nous », « il te
manque quelque chose ».

Tant qu'aucun écran n'est branché, la famille reste observable par une ligne de journal :
`reportFailure(nom, échec)` écrit `[aetherius] ukit.campus.annonces : unavailable — …`. C'est ce qui
rend les chemins dégradés distinguables les uns des autres sur un appareil dès ce jalon.

**Un écart assumé avec le moteur, et un seul.** Le paquet marque `rejected` comme *reessayable* ; la
table de UKit dit l'inverse. Le moteur parle d'un statut HTTP qui peut être transitoire, UKit parle
d'une source qui a changé de contrat : rejouer la même requête redonnera la même réponse, et un
bouton Réessayer qui ne répare rien est pire qu'aucun bouton. Un test verrouille l'écart pour qu'on
ne le « corrige » pas par mégarde.

### La source pilote

Le Blueprint [`ukit-campus-annonces`](../../blueprints/ukit-campus-annonces.blueprint.json) venait du
jalon 3-G d'Aetherius. Le brancher a révélé deux manques, et le fichier est passé en **version 2** —
c'est le résultat normal d'un premier port réel, pas un accident.

> **Corrigé à la livraison — deux ajouts au Blueprint.**
>
> 1. **`desc_longue: "$.long_desc"`.** Le fichier d'origine n'extrayait pas ce champ, que la fiche
>    d'annonce affiche ([`BdeDetailsScreen.tsx`](../../src/features/Campus/Bde/BdeDetailsScreen.tsx)).
>    Le brancher tel quel aurait vidé la description longue sans rien casser de visible ailleurs :
>    exactement le genre de régression que la règle 1 ci-dessous existe pour empêcher.
> 2. **Un step `assert` sur la présence du tableau `annonces`.** Sans lui, une réponse JSON valide
>    dont la clé a disparu produit un **succès à liste vide**, indistinguable d'une liste
>    légitimement vide — le défaut même que ce jalon prétend supprimer. L'`assert` le range en
>    `rejected`. C'est le filet que [blueprints.md](../blueprints.md) recommande déjà : affirmer ce
>    qu'on attend pour qu'un décalage devienne un échec au lieu d'une donnée fausse.

`BdeService.fetchAnnonces` devient :

```ts
// La signature ne bouge pas : les ecrans ne savent pas ce qui se passe derriere.
async function fetchAnnonces(): Promise<BdeAnnonce[]> { … }
```

Trois règles rendent la bascule réversible, et ce sont elles qu'il faut respecter, pas la brièveté du
résultat :

1. **La signature typée existante ne bouge pas.** Ni le type de retour, ni la sémantique de l'échec
   vue par l'appelant, tant que l'écran n'a pas été adapté.
2. **L'ancien code reste en repli**, jusqu'à ce que la parité soit verte sur des données réelles.
3. **Le filtre d'expiration reste applicatif.** `is_active` descend dans le Blueprint parce qu'il
   tient dans une expression ; `expires_at > maintenant` ne descend pas, parce qu'un prédicat
   d'extraction ne connaît que son élément, jamais l'heure de l'appareil. Ce n'est pas un manque :
   la même donnée peut ainsi être affichée grisée plutôt que masquée, ce qu'un filtre côté
   extraction interdirait.

### Le harnais de parité

[`tools/parity/`](../../tools/parity/README.md) rejoue un Blueprint sous Node avec
`@aetherius/engine` et compare sa sortie à celle du service historique, sur la source réelle.
`npm run parity` les joue tous. Le premier cas est celui des annonces, et il sert de gabarit aux
suivants.

Il n'y a pas de simulacre : on interroge la vraie source. Un harnais qui rejoue des réponses
enregistrées prouverait que notre parseur est d'accord avec lui-même.

Le cas joue le moteur neutre (`RunEngine`) et non la façade `Aetherius` : celle-ci vit dans le paquet
React Native et n'est pas jouable sous Node. C'est la seule différence avec ce que fait
l'application, et elle ne porte ni la requête ni l'extraction.

### Les tests unitaires

Le dépôt n'avait aucun harnais de test avant ce jalon. Il en gagne un, **borné au socle** :
`npm test` joue les tests colocalisés de `src/shared/aetherius/`.

> **Corrigé à la livraison — `vitest` plutôt que `node --test`.** Le plan initial visait le runner
> natif de Node avec `tsx`, pour n'ajouter qu'une dépendance. Il ne marche pas ici, et la raison
> mérite d'être écrite : `package.json` n'a pas `"type": "module"`, donc `tsx` charge tout `.ts`
> en **CommonJS**, et un module CommonJS ne peut pas `require()` `@aetherius/engine`, dont le champ
> `exports` ne déclare que la condition `import` (Node 20 ne sait pas non plus `require()` un ESM).
> Renommer les fichiers en `.mts` ne change rien : ce sont les modules *testés* qui restent en `.ts`.
> Les seules issues étaient de passer tout le projet en ESM — ce que `babel.config.js` et
> `commitlint.config.js` interdisent — ou d'utiliser un lanceur qui résout la condition `import`
> quel que soit le format du projet. `vitest` fait exactement cela, sans fichier de configuration.

Ce qui est testé est ce qui porte de la **logique UKit** : la projection des secrets, la résolution
du registre, et la table du modèle d'erreur. `client.ts` et `runBlueprint.ts` importent React Native
et ne sont pas jouables sous Node ; leur comportement appartient à la suite de tests du paquet, et
c'est une limite assumée, pas un oubli. La preuve de bout en bout reste `npm run parity`.

## Décisions et pièges

- **Un seul client pour toute l'application.** Instancier une façade par service multiplierait les
  resolvers de secrets et, surtout, les prétendants à la WebView unique. Le socle expose un
  singleton.
- **Le registre existe dès ce jalon, même sans distant.** Les services appellent
  `registry.resolve(nom)` et non un `import` direct — sinon le jalon 6-C devrait repasser sur chaque
  appelant. À ce stade la résolution rend toujours l'embarqué ; c'est un détail d'implémentation,
  pas d'interface.
- **La résolution ne touche jamais au réseau**, jamais. Un run n'attend pas un CDN pour savoir quoi
  jouer. Cette règle vaut d'être écrite ici parce qu'elle sera tentante à violer en 6-C.
- **Ne pas encore toucher aux écrans.** L'écran des annonces continue d'afficher ce qu'il affiche.
  Le jalon prouve la chaîne, il ne change pas l'expérience.

## Définition de « terminé »

1. **fait** — les deux paquets sont installés, résolus par Metro (vérifié sur un bundle réel, voir
   plus haut), et l'application démarre sur appareil.
2. **fait** — `src/shared/aetherius/` est complet et documenté ; le resolver, le registre et le
   modèle d'erreur ont leurs tests unitaires. La façade est la limite écrite ci-dessus.
3. **fait** — la WebView et le modal sont montés une fois, et le démarrage n'en porte rien : la vue
   native n'est créée qu'au premier run navigateur, et aucun Blueprint embarqué n'en est un
   aujourd'hui. Vérifié sur appareil, y compris la durée du splash : elle est **antérieure à ce
   jalon**, reproduite à l'identique sur `master`, et sa cause est ailleurs
   ([features/scolarite.md](../features/scolarite.md#limites-connues)).
4. **fait** — `fetchAnnonces` passe par le moteur, avec repli, et l'écran de vie étudiante est
   identique.
5. **fait** — `npm run parity` est vert sur le cas des annonces.
6. **fait** — les clés de traduction du modèle d'erreur existent dans `fr`, `en` et `es`, et le
   typage les impose.
7. **fait** — `npx tsc --noEmit` rend les 3 erreurs héritées, `npx eslint .` les 11 warnings
   hérités : base de référence intacte.
8. **fait** — documentation.

## Plan de test

**Sous Node**, avant l'appareil :

```bash
npm test              # le socle : resolver, registre, modele d'erreur
npm run parity        # les deux implementations rendent la meme liste, champ par champ
```

**Sur appareil**, le parcours nominal puis les chemins dégradés, qui doivent produire des résultats
**distincts**. La famille se lit dans le journal (`reportFailure`), puisqu'aucun écran n'y est
encore branché.

| Sonde | Comment | Attendu | État |
|---|---|---|---|
| Nominal | ouvrir l'onglet Campus | les annonces publiées, identiques à avant, description longue comprise | **joué sur appareil** |
| Source injoignable | `vars.cdn` sur `https://cdn.invalid` | `unavailable` | **joué sur appareil** |
| Source qui répond mal | `url` sur une adresse rendant un 404 | `rejected` | **joué sur appareil** |
| Clé attendue disparue | `url` sur un JSON valide **sans** la clé `annonces` | `rejected` — c'est l'`assert` de forme | **joué sur appareil** |
| Contenu inattendu | `url` sur une réponse **non-JSON** servie en 200 | `data` | **joué sur appareil** |
| Liste légitimement vide | passer le prédicat à `item.is_active == false` | **succès**, liste vide, aucune ligne de journal | **joué sur appareil** |

**Le mode avion n'est pas la bonne sonde**, et c'est une leçon à garder pour les jalons suivants :
couper la connexion d'un appareil de développement casse aussi Metro. Le moteur enveloppe *toute*
défaillance de transport en `NetworkError` — DNS mort, connexion refusée, ou le
`TypeError: Network request failed` de React Native — donc pointer `vars.cdn` sur le TLD réservé
`https://cdn.invalid` (RFC 2606, ne résout sur aucun réseau) produit exactement la même famille, en
une ligne et sans toucher à la connectivité.

Pour éprouver l'écran vide plutôt que la seule famille, il faut aussi détourner l'URL du repli dans
[`BdeService.ts`](../../src/features/Campus/services/BdeService.ts) : tant qu'il existe, une panne du
Blueprint reste invisible à l'écran, par construction.

**Le contraste qui valide le jalon** est la comparaison des deux dernières lignes : elles produisent
la *même* section vide, mais l'une journalise `unavailable` et l'autre ne journalise rien. « La
source est morte » et « la source va bien, elle n'a rien » étaient strictement indiscernables avant
cette phase.

> **Corrigé à la livraison — la sonde « contenu inattendu ».** La spécification annonçait `data`
> pour « un JSON valide sans le champ attendu ». C'est faux, et le mesurer valait mieux que le
> croire : un chemin d'extraction qui ne correspond à rien rend une liste vide, donc un **succès**.
> La sonde a été scindée en deux, et chacune tombe dans une famille réelle : clé disparue →
> `rejected` (grâce à l'`assert` ajouté au Blueprint), réponse illisible → `data` (l'extraction ne
> peut pas analyser le corps). C'est cette mesure qui a motivé l'`assert`.

La dernière ligne du tableau est celle qui compte le plus : c'est elle qui prouve que le modèle
d'erreur ne se contente pas de renommer l'ancien comportement.

## Limites écrites

- **Aucun gain utilisateur à ce jalon.** C'est attendu. Le premier gain visible arrive en 6-C.
- **Le repli sur l'ancien code double temporairement le chemin des annonces.** Il est retiré en
  [6-Z](6-z-livraison-finale.md), pas avant, et pas plus tard.
- **Le masquage des secrets se fait par valeur.** Un secret d'un ou deux caractères masquerait ces
  caractères partout dans les messages. C'est visible, et plus honnête qu'un masquage qui cesserait
  silencieusement de protéger sous un seuil.
- **La parité compare des sorties, pas des comportements.** Elle ne dit rien du cache, de la
  concurrence ni de l'affichage : ces trois-là restent du ressort de la vérification manuelle.
- **La façade n'a pas de test unitaire côté UKit.** Elle importe React Native ; son comportement est
  couvert par la suite du paquet, et par la parité de bout en bout.
- **Le modal de confirmation porte encore l'habillage du paquet.** Seuls ses libellés sont traduits.
  Aucun Blueprint embarqué ne déclare de `confirm`, donc il ne s'affiche jamais aujourd'hui ; il est
  aligné sur les tokens en [6-F](6-f-scolarite.md).
- **Le modèle d'erreur n'atteint aucun écran.** Il est livré, traduit et testé, mais seul le journal
  l'expose. C'est le sujet des jalons de migration, écran par écran.
