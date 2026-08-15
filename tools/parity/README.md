# Le harnais de parité

Une migration ne se juge pas sur « est-ce que ça tourne » mais sur **« est-ce que ça rend la même
chose »**. Ce harnais rejoue un Blueprint sous Node avec `@aetherius/engine` et compare sa sortie à
celle du service historique, sur la source réelle.

```bash
npm run parity                 # tous les cas
npm run parity -- annonces     # un seul
```

C'est ce qui autorise à retirer un repli ([6-Z](../../docs/phase-6/6-z-livraison-finale.md)). Sans
lui, « ça marche » veut dire « je n'ai pas vu la différence ».

## Pourquoi sous Node, et pas dans l'application

`@aetherius/engine` est neutre plateforme : le même moteur, le même code, hors appareil. Le cycle est
de quelques secondes au lieu de quelques minutes, et il n'y a rien à simuler.

Un cas joue le moteur nu (`RunEngine`) et non la façade `Aetherius` : celle-ci vit dans
`@aetherius/react-native` et n'est pas jouable sous Node. C'est la seule différence avec ce que fait
l'application, et elle ne porte ni la requête, ni l'extraction, ni les expressions — ce que la parité
compare, donc, est bien joué par le même code.

Ce que ça ne couvre pas, et qui reste de la vérification manuelle : la WebView (Act II vit dans le
paquet React Native), le cache, la concurrence, et l'affichage. Un cas de parité vert et un écran
cassé sont parfaitement compatibles.

## Pas de réponses enregistrées

On interroge la **vraie** source. Un harnais qui rejoue des réponses enregistrées prouve seulement
que notre parseur est d'accord avec lui-même — or ce qu'on veut savoir, c'est si les deux chemins
lisent la même source de la même façon.

Conséquence assumée : un cas peut échouer parce que la source est en panne. C'est une information,
pas un faux positif ; c'est même la seule façon d'apprendre qu'une source a changé avant que les
utilisateurs ne le fassent.

## Écrire un cas

Un fichier `<source>.parity.mjs` par appel migré. Il expose deux fonctions et rien d'autre :

| Fonction | Rôle |
|---|---|
| `viaBlueprint()` | joue le Blueprint et rend la donnée **au format applicatif**, transformations comprises |
| `viaLegacy()` | joue l'ancien chemin, tel qu'il était avant la migration |

La comparaison porte sur la donnée **après** transformation applicative — c'est ce que l'écran voit,
et c'est donc la seule égalité qui compte. Comparer les réponses brutes ferait échouer un cas pour
une clé renommée qui n'a jamais atteint personne.

### Comparer aussi ce qu'on envoie

Depuis le jalon [6-E](../../docs/phase-6/6-e-planning.md), un cas peut comparer le **corps de la
requête** en plus de la sortie. `jouerEnCapturant()` rejoue le Blueprint avec le `fetch` de l'hôte
remplacé par un espion, et `comparerCorps()` confronte l'octet réellement émis à ce que produisait
`qs.stringify(data, { arrayFormat: 'repeat' })`.

Ça n'existe pas par goût de la symétrie : `federationIds[]` est une clé **répétable**, et un corps qui
différerait d'un caractère ne lèverait rien — la requête part, le serveur répond autre chose, et le
Blueprint a l'air de marcher partout sauf là où ça compte. Capturer la vraie requête plutôt que
réimplémenter l'encodeur est ce qui distingue une preuve d'un accord avec soi-même.

**Un écart est normalisé, un seul, et il est mesuré.** `qs` sort en RFC3986 (une espace devient
`%20`), l'encodeur du moteur reproduit `quote_plus` de Python (une espace devient `+`). Partout
ailleurs les deux coïncident au caractère près, `!'()*~` compris. Les deux formes ont été postées au
serveur de l'université le 2026-08-09, sur un identifiant de salle porteur d'espaces, d'accents, d'un
point et d'une barre oblique : même statut, même réponse au SHA-256 près. La comparaison porte donc
sur la séquence de paires **décodées**, ce qui garde l'ordre des clés, la répétition et chaque octet
des valeurs.

### Plusieurs sous-cas, et les vides qui comptent

`agreger()` met plusieurs sondes dans une seule liste comparable, chacune ouverte par une ligne de
résumé portant son **nombre d'éléments**. Sans elle, un sous-cas légitimement vide — un dimanche, une
semaine de vacances — ne serait représenté par rien, et une régression qui le viderait passerait
inaperçue.

La projection (`project`) doit couvrir **tous** les champs que les écrans lisent, pas un échantillon
lisible. Le premier cas l'a appris à ses dépens : le Blueprint des annonces n'extrayait pas
`long_desc`, que la fiche affiche, et une projection sur trois champs n'aurait rien vu.

Trois pièges rencontrés, à traiter dans le cas plutôt qu'à découvrir :

- **l'arité de l'extraction** : un chemin qui ne correspond à rien rend `null`, une seule
  correspondance rend **la valeur**, plusieurs rendent **la liste**. Un site à une seule catégorie
  rend `20`, pas `[20]` ;
- **l'ordre** : quand le tri est applicatif, comparer après tri ; quand il vient de la source,
  comparer avant ;
- **les dates** : ne comparer que ce qui ne dépend pas de l'instant. Un cas qui échoue à minuit n'est
  pas un cas.

## Un cas sans chemin historique

`ical-inp` est le premier cas dont la source **n'avait jamais été portée** : il n'y a pas d'« avant »
à comparer. Le second chemin est donc ce que la spécification [6-I](../../docs/phase-6/6-i-planning-universel.md)
demande — *le même jour, lu par l'iCal et lu par l'export brut*. Les deux lectures vivent côte à côte
dans le fichier : `viaBlueprint` joue le Blueprint puis lit avec **`ical.js`**, `viaLegacy` va
chercher la même réponse et la lit avec un analyseur **écrit à la main**, sans partager une ligne.

Ce que ça prouve n'est pas « on lit comme avant », mais **la bibliothèque et notre lecture ne se
trompent pas ensemble** : le pliage de lignes RFC 5545, les échappements, l'ancre du code de module et
les dates sont refaits par un autre chemin. Le mapper livré, lui, est verrouillé par
`IcsMapping.test.ts` sur des corps mesurés et sans réseau — les deux portes se complètent, aucune ne
remplace l'autre.

Deux champs sont exclus de la projection, et pour la raison prévue par la règle ci-dessous : `color`
et `toFilter` **n'existent pas dans la source**. Le premier est dérivé de la matière par l'application,
le second dépend du groupe demandé. Les comparer ne confronterait qu'une empreinte à elle-même.

## Ce qui n'a pas de cas de parité

Le parcours universitaire ([6-F](../../docs/phase-6/6-f-scolarite.md)). Il demanderait des
identifiants réels dans un harnais, et on ne met pas d'identifiants réels dans un harnais. Sa
vérification est manuelle, sur appareil, avec un compte de test, et son plan est écrit dans sa
spécification.

## Un champ peut être exclu, mais jamais en silence

La règle reste « la projection couvre tous les champs que les écrans lisent ». Il existe une
exception, et elle a un coût qu'il faut payer explicitement : quand la migration **corrige** un
défaut, les deux chemins cessent légitimement de rendre la même chose sur ce champ.

Le cas se traite alors ainsi, et pas autrement : le champ sort de `project()`, **avec un commentaire
qui le nomme, dit pourquoi, et renvoie à la documentation de la source**. Un champ écarté sans
justification écrite est un défaut caché ; un champ comparé alors qu'on l'a volontairement changé est
une porte rouge qu'on apprendra à ignorer.

Un seul champ est dans ce cas aujourd'hui : `opening` de `crous-restaurants` — voir
[campus-crous.md](../../docs/features/campus-crous.md).

## Un hôte peut changer, et celui-là a changé

Les six cas Celcat font viser **`celcat.u-bordeaux.fr` aux deux chemins**, alors que le service
historique visait le relais `ukit.kbdev.io`. Ce n'est pas une commodité : le relais répond **522**
depuis trois sondes du 2026-08-09, il est tombé. Le pointer ici rendrait six cas rouges en permanence
pour une raison qui n'est pas celle qu'on veut mesurer.

Ce que la parité isole reste exactement ce que la migration change : l'encodage du moteur contre `qs`,
et l'extraction déclarative contre le parsing à la main. Que la bascule d'hôte fonctionne est établi
ailleurs, par la mesure directe consignée dans
[sources-externes.md](../../docs/sources-externes.md#1-celcat--emplois-du-temps).

## État

| Cas | Source | Jalon |
|---|---|---|
| [`crous-restaurants`](crous-restaurants.parity.mjs) | Croustillant — la liste régionale | [6-D](../../docs/phase-6/6-d-campus.md) |
| [`crous-menu`](crous-menu.parity.mjs) | Croustillant — les menus, dont deux restaurants en `404` | [6-D](../../docs/phase-6/6-d-campus.md) |
| [`bu-sites`](bu-sites.parity.mjs) | Affluences — un point de balayage | [6-D](../../docs/phase-6/6-d-campus.md) |
| [`bu-affluence`](bu-affluence.parity.mjs) | Affluences — deux sites, ouvert et fermé | [6-D](../../docs/phase-6/6-d-campus.md) |
| [`bu-horaires`](bu-horaires.parity.mjs) | Affluences — semaine courante et semaine décalée | [6-D](../../docs/phase-6/6-d-campus.md) |
| [`celcat-groupes`](celcat-groupes.parity.mjs) | Celcat — les ~2 900 groupes, élément par élément | [6-E](../../docs/phase-6/6-e-planning.md) |
| [`celcat-salles`](celcat-salles.parity.mjs) | Celcat — les 283 salles, **et** les bâtiments reconstruits | [6-E](../../docs/phase-6/6-e-planning.md) |
| [`celcat-jour`](celcat-jour.parity.mjs) | Celcat — jour ordinaire, jour de vacances, jour sans cours, agrégé à deux et trois groupes | [6-E](../../docs/phase-6/6-e-planning.md) |
| [`celcat-semaine`](celcat-semaine.parity.mjs) | Celcat — semaine complète, semaine de vacances, semaine à cheval sur deux mois | [6-E](../../docs/phase-6/6-e-planning.md) |
| [`celcat-annee`](celcat-annee.parity.mjs) | Celcat — les deux positions de la bascule d'année scolaire | [6-E](../../docs/phase-6/6-e-planning.md) |
| [`celcat-occupation`](celcat-occupation.parity.mjs) | Celcat — trois salles du CREMI, jour ordinaire et jour de vacances | [6-E](../../docs/phase-6/6-e-planning.md) |
| [`ical-inp`](ical-inp.parity.mjs) | ADE — jour ordinaire, jour sans cours, semaine complète, agrégat à deux ressources | [6-I](../../docs/phase-6/6-i-planning-universel.md) |

[`commun.mjs`](commun.mjs) n'est pas un cas : il porte le harnais partagé — jouer un Blueprint avec le
moteur nu, capturer ce qu'il a émis, les en-têtes imités du chemin historique, les libellés de repli.
Il ne porte **aucune** projection, et c'est délibéré : chaque cas recopie la sienne des deux côtés.

[`celcat-commun.mjs`](celcat-commun.mjs) est la seule exception, et elle est bornée : quatre cas
partagent la traduction d'un cours, écrite **deux fois côte à côte** — celle du chemin migré, celle du
chemin historique. Ce que la règle interdit est d'importer le **service**, parce qu'un cas qui suit
les évolutions du code qu'il vérifie ne vérifie plus rien. Ici les deux copies vivent dans le harnais,
elles sont figées, et les recopier trois fois n'aurait fait que trois occasions de n'en corriger
qu'une.

Le harnais a été posé au jalon [6-A](../../docs/phase-6/6-a-socle.md) avec le cas `annonces`, qui a
servi de gabarit ; ce cas est sorti au jalon [6-B](../../docs/phase-6/6-b-supabase.md) avec la
bascule de la source vers la [base de publication](../../docs/backend.md). Il est récupérable par
`git show f9e4a9b:tools/parity/annonces.parity.mjs`.

`npm run parity` sans aucun cas **réussit** en le disant : un harnais vide entre deux jalons de
migration ne doit pas rougir une porte de qualité. Un filtre explicite qui ne désigne rien
(`npm run parity -- typo`) reste un échec, parce que c'est une faute de frappe.

Le gabarit d'un cas reste écrit ci-dessus : `NAME`, `viaBlueprint()`, `viaLegacy()` et
`project(item)`.
