# 6-A — Le socle moteur

> Brancher le moteur, poser la façade partagée, et migrer **une** source pour prouver la chaîne
> complète. Aucun gain visible pour l'utilisateur : c'est la fondation des sept jalons suivants.

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
"@aetherius/engine": "^0.5.1",
"@aetherius/react-native": "^0.5.1",
```

Rien d'autre. `react-native-webview`, `expo-secure-store` et `@react-native-async-storage/async-storage`
sont **déjà** des dépendances du projet, et ce sont les seules pièces de plateforme que les paquets
réclament — ils les déclarent en `peerDependencies` et ne les importent jamais eux-mêmes. Aucun
module natif nouveau, donc aucun changement de
[`app.config.ts`](../../app.config.ts) côté plugins, et le développement reste possible dans Expo Go.

> **À faire en premier, avant toute ligne de code.** Vérifier que Metro résout les deux paquets :
> ils sont en **ESM avec un champ `exports`**, ce que Metro d'Expo SDK 54 gère, mais c'est le seul
> risque du jalon qui ne se découvre qu'à l'exécution. Un `import { Aetherius } from
> "@aetherius/react-native"` qui rend `undefined` dans l'application se diagnostique en trente
> secondes le premier jour et en une soirée le troisième.

La publication des paquets sur npm est un préalable **côté Aetherius** : voir
[6-h-livraison-finale.md](6-h-livraison-finale.md#dépendances) pour la discipline de version, et
vérifier la disponibilité du scope avant de s'y engager.

### Le socle — `src/shared/aetherius/`

| Fichier | Rôle |
|---|---|
| [`client.ts`](../../src/shared/aetherius/client.ts) | la façade partagée, instanciée une fois. `client.run(blueprint, { inputs, onEvent })` |
| [`secrets.ts`](../../src/shared/aetherius/secrets.ts) | le `SecretResolver` de UKit, adossé à `SecureStoreService` |
| [`registry.ts`](../../src/shared/aetherius/registry.ts) | le registre : socle embarqué seul à ce jalon, surcouche distante en 6-C |
| [`failures.ts`](../../src/shared/aetherius/failures.ts) | `describeFailure` traduit en familles d'écran et en clés de traduction |
| [`runBlueprint.ts`](../../src/shared/aetherius/runBlueprint.ts) | l'appel type : résoudre le Blueprint, le jouer, rendre un résultat ou un échec décrit |

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
<AetheriusConfirm />
```

Les deux vivent **avec l'application, pas avec un run** : la WebView cachée sert tous les Blueprints
Act II successivement, et le modal de confirmation doit exister au moment où une question est posée.
Le point de montage naturel est
[`rootContainer.tsx`](../../src/shared/navigation/rootContainer.tsx), à côté de
[`ModMenu`](../../src/shared/ui/ModMenu.tsx) — même durée de vie, même raison.

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

`describeFailure` range un échec dans huit familles. `failures.ts` les traduit en ce que l'écran doit
faire, et en clés de traduction dans les trois dictionnaires :

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

### La source pilote

Le Blueprint [`ukit-campus-annonces`](../../blueprints/ukit-campus-annonces.blueprint.json) est déjà
écrit et vérifié. `BdeService.fetchAnnonces` devient :

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

1. Les deux paquets sont installés, résolus par Metro, et l'application démarre sur un appareil.
2. `src/shared/aetherius/` est complet et documenté ; la façade, le resolver et le registre ont
   leurs tests unitaires.
3. La WebView et le modal sont montés une fois, et leur présence ne change rien au démarrage
   (mesurer : le temps d'apparition ne doit pas bouger — le socle actuel charge les managers **avant**
   le premier rendu, on ne lui ajoute pas une WebView bloquante).
4. `fetchAnnonces` passe par le moteur, avec repli, et l'écran de vie étudiante est identique.
5. `npm run parity` est vert sur le cas des annonces.
6. Les clés de traduction du modèle d'erreur existent dans `fr`, `en` et `es`.
7. `npx tsc --noEmit` et `npx eslint .` sans régression sur la base de référence.
8. Documentation : cette spécification à jour, [blueprints.md](../blueprints.md) créé,
   [architecture.md](../architecture.md) et [sources-externes.md](../sources-externes.md) amendés,
   « État des lieux » du README et CHANGELOG.

## Plan de test

**Sous Node**, avant l'appareil : `npm run parity` — les deux implémentations rendent la même liste
d'annonces, champ par champ, dans le même ordre.

**Sur appareil**, le parcours nominal puis les quatre chemins dégradés, qui doivent produire quatre
résultats **distincts** :

| Sonde | Comment | Attendu |
|---|---|---|
| Nominal | ouvrir l'onglet Campus | les annonces publiées, identiques à avant |
| Hors ligne | mode avion | `unavailable` — pas une liste vide |
| Source qui répond mal | pointer `vars.cdn` sur une URL rendant un 404 | `rejected` |
| Contenu inattendu | pointer sur un JSON valide sans le champ attendu | `data` |
| Liste légitimement vide | désactiver toutes les annonces à la source | **succès**, liste vide, aucun message d'erreur |

La dernière ligne est celle qui compte le plus : c'est elle qui prouve que le modèle d'erreur ne se
contente pas de renommer l'ancien comportement.

## Limites écrites

- **Aucun gain utilisateur à ce jalon.** C'est attendu. Le premier gain visible arrive en 6-C.
- **Le repli sur l'ancien code double temporairement le chemin des annonces.** Il est retiré en
  [6-H](6-h-livraison-finale.md), pas avant, et pas plus tard.
- **Le masquage des secrets se fait par valeur.** Un secret d'un ou deux caractères masquerait ces
  caractères partout dans les messages. C'est visible, et plus honnête qu'un masquage qui cesserait
  silencieusement de protéger sous un seuil.
- **La parité compare des sorties, pas des comportements.** Elle ne dit rien du cache, de la
  concurrence ni de l'affichage : ces trois-là restent du ressort de la vérification manuelle.
