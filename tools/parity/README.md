# Le harnais de parité

Une migration ne se juge pas sur « est-ce que ça tourne » mais sur **« est-ce que ça rend la même
chose »**. Ce harnais rejoue un Blueprint sous Node avec `@aetherius/engine` et compare sa sortie à
celle du service historique, sur la source réelle.

```bash
npm run parity                 # tous les cas
npm run parity -- annonces     # un seul
```

C'est ce qui autorise à retirer un repli ([6-H](../../docs/phase-6/6-h-livraison-finale.md)). Sans
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

## Ce qui n'a pas de cas de parité

Le parcours universitaire ([6-F](../../docs/phase-6/6-f-scolarite.md)). Il demanderait des
identifiants réels dans un harnais, et on ne met pas d'identifiants réels dans un harnais. Sa
vérification est manuelle, sur appareil, avec un compte de test, et son plan est écrit dans sa
spécification.

## État

| Cas | Source | Jalon |
|---|---|---|
| `annonces` | jsDelivr / `ukit-data` | [6-A](../../docs/phase-6/6-a-socle.md) |

Le harnais a été posé au jalon 6-A avec son premier cas, qui sert de gabarit aux suivants. Chaque
jalon de migration ajoute les siens.
