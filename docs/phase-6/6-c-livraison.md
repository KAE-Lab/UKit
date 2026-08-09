# 6-C — La livraison des Blueprints

> Le jalon où la phase commence à payer : corriger une source cassée devient une publication de
> fichier, pas une release.

> **Jalon livré — spécification amendée après coup.** Contrairement aux autres jalons de la phase, ce
> document n'a **pas** été mis à jour au moment de sa livraison : le commit `3943076` ne l'a pas
> touché. Il a été relu et corrigé plus tard, au jalon [6-E](6-e-planning.md), contre le code
> réellement livré — trois sections décrivaient une chose plus petite que ce qui a été construit. On
> ne sait pas si l'amendement d'origine a été écrit puis perdu (un fichier restauré à son contenu
> initial est indiscernable d'un fichier jamais modifié) ou s'il n'a jamais existé. Ce qui suit est
> aligné sur le code ; ce qui manque en revanche, et ne se reconstitue pas, c'est le récit de ce qui
> a surpris pendant la livraison. La référence opérationnelle, elle, est
> [blueprints.md](../blueprints.md) et elle est à jour.

## Objectif

Le registre résout chaque Blueprint entre un **socle embarqué** dans le binaire et une **surcouche
distante** vérifiée, servie par la base. Publier une correction prend deux gestes et atteint tous les
utilisateurs au rafraîchissement suivant. Trois interrupteurs permettent de revenir en arrière.

## Pourquoi c'est le jalon pivot

Jusqu'ici un Blueprint arrivait par un `import` : il était figé dans le binaire, donc exactement
aussi rigide que le code qu'il remplace. Sans ce jalon, les cinq suivants n'apportent qu'un
changement de style d'écriture.

Après ce jalon, chaque source migrée devient corrigeable à chaud — et c'est ce qui rend l'ordre de la
phase logique : on branche la livraison **avant** de migrer les sources fragiles, pas après.

## Ce qui est livré

### Le registre, branché

```ts
new BlueprintRegistry({
  bundled: BUNDLED,                        // blueprints/index.ts
  manifest: `${STORAGE_URL}/blueprints/manifest.json`,
  cache: AsyncStorage,                     // sa surface satisfait l'interface telle quelle
});
```

Le magasin de cache est **injecté** : AsyncStorage est déjà une dépendance du projet et sa surface
convient sans adaptateur.

### Le manifeste, généré

Le manifeste est un **artefact**, jamais un fichier qu'on édite. La table `blueprints` de la base est
la surface d'édition ; [`tools/publish-blueprints.mjs`](../../tools/publish-blueprints.mjs) fait le
reste :

1. valide chaque fichier de [`blueprints/`](../../blueprints/) contre le moteur — un Blueprint
   invalide ne doit pas atteindre le bucket, encore moins un appareil ;
2. téléverse ceux qui ont changé dans le bucket `blueprints` ;
3. calcule l'empreinte SHA-256 du **texte servi** ;
4. met la table à jour et régénère `manifest.json`.

L'empreinte se calcule par script parce qu'une empreinte écrite à la main est périmée dès la première
correction — et un manifeste dont l'empreinte ment est précisément ce que l'appareil rejette. On
passerait la soirée à déboguer une garde qui fonctionne.

### Le rafraîchissement, hors du chemin critique

Deux règles, et elles sont la raison d'être du découpage :

- **`resolve()` ne touche jamais au réseau.** Elle lit le cache local. Un run n'attend pas la base
  pour savoir quoi jouer.
- **`refresh()` ne lève jamais.** Elle rend un rapport. Un point de publication en panne ne doit pas
  devenir une application en panne.

Deux déclencheurs : au démarrage, et au retour au premier plan —
[`rootContainer.tsx`](../../src/shared/navigation/rootContainer.tsx) écoute déjà `AppState` pour
recharger les calendriers, le point d'accroche existe.

### Les gardes, et ce qu'elles couvrent

Un Blueprint distant est de la **donnée exécutable**. Le paquet les applique, ce jalon consiste à ne
pas les affaiblir en les configurant :

| Garde | Effet |
|---|---|
| Validation complète avant mise en cache | un document invalide ou non portable n'atteint jamais un run |
| Empreinte SHA-256, revérifiée **à chaque lecture** | un cache local n'est pas plus digne de confiance qu'un CDN |
| Fichier modifié après la publication du manifeste | refusé — l'empreinte du manifeste fait foi, pas celle du fichier servi |
| Périmètre des secrets (`allowedSecrets`) | un Blueprint distant ne peut pas réclamer le trousseau |
| `min_engine` | un Blueprint écrit pour un moteur plus récent est ignoré, sans erreur visible |
| Version strictement supérieure | le distant ne gagne que s'il est plus récent que l'embarqué |
| Nom publié différent du nom déclaré | refusé : on ne livre pas un Blueprint à la place d'un autre |
| Manifeste malformé | refusé **en entier** — un manifeste partiel s'interprète toujours vers le socle |
| Bucket injoignable | l'application reste sur son socle, sans erreur visible |
| Cache local corrompu | purgé, sans plantage |

*Table alignée à l'amendement sur les cas réellement couverts par
[`delivery.test.ts`](../../src/shared/aetherius/delivery.test.ts) — la version initiale de ce document
en listait cinq.*

Ce qui **n'est pas** couvert, et doit rester écrit : un publieur compromis. Qui contrôle la
publication peut livrer un Blueprint qui envoie les secrets *déjà autorisés* où il veut. Le périmètre
limite le rayon de l'incendie, il ne l'éteint pas. Conséquences pratiques : la clé `service_role`
n'est jamais dans un poste partagé, et l'accès au projet Supabase se traite comme un accès de
production — parce que c'en est un.

### Les interrupteurs d'arrêt

| Geste | Qui | Effet |
|---|---|---|
| `npm run blueprints:publish -- --desactiver <nom>`, ou une entrée retirée du manifeste | le publieur | l'embarqué reprend la main sur ce Blueprint, au rafraîchissement suivant |
| `npm run blueprints:publish -- --arret` | le publieur | **tout** revient à l'embarqué. Le geste inverse est une publication ordinaire |
| Bouton **Embarque** du panneau de diagnostic | l'application | purge la surcouche tout de suite, sans réseau. Non durable : un rafraîchissement peut la ramener |
| `BLUEPRINTS_REMOTE=false` à la construction | l'application | la surcouche est ignorée durablement, **sans être détruite** |

Un mécanisme de déploiement sans mécanisme de retour arrière n'en est pas un.

### L'écran de diagnostic

Livré comme un onglet du [menu de développement](../../src/shared/ui/ModMenu.tsx), dans son propre
fichier [`ModMenuBlueprints.tsx`](../../src/shared/ui/ModMenuBlueprints.tsx) : pour chaque Blueprint,
son nom, sa version, son **origine** (embarqué ou distant), et le rapport du dernier rafraîchissement
(succès, ignoré et pourquoi, refusé et pourquoi). Plus **trois** boutons — ce document n'en annonçait
que deux :

| Bouton | Ce qu'il fait |
|---|---|
| **Rafraichir** | relit le manifeste tout de suite, au lieu d'attendre le retour au premier plan |
| **Embarque** | purge la surcouche, sans réseau |
| **jouer**, par ligne | exécute le Blueprint et montre son résultat |

Le troisième est celui qui rend le parcours de correction vérifiable de bout en bout : voir une ligne
passer à « distant » prouve que le document publié est en place, le jouer prouve qu'il s'exécute. Il
n'apparaît que sur les Blueprints qui n'ont **rien à demander** — aucune entrée obligatoire sans
valeur par défaut — et surtout **rien à engager** : un parcours déclarant des `secrets` n'est pas
jouable depuis ce panneau, parce que vérifier une livraison ne justifie pas une tentative de connexion
réelle sur le compte de l'utilisateur.

![Le panneau de livraison : le rapport du dernier rafraîchissement, une ligne par Blueprint avec sa version, son origine et la raison retenue, et le résultat d'un run joué depuis le panneau](../screenshots/modmenu-blueprints.png)

L'état de repos est celui de la capture : le bucket sert exactement ce que le binaire embarque, donc
chaque entrée est `ignored`. C'est ce qu'on doit voir quand il n'y a **rien à corriger** — et non un
panneau vide, qui ne dirait pas la différence avec un manifeste jamais lu.

Ce n'est pas du confort. Quand une correction publiée « n'arrive pas », les causes possibles sont
nombreuses et se ressemblent toutes vues de l'écran principal : version pas supérieure, empreinte
fausse, entrée désactivée, `min_engine` trop haut, réponse servie depuis un cache. L'écran répond en
trois secondes à une question qui, sans lui, coûte une soirée.

## Décisions et pièges

- **Le cache HTTP de la plateforme est contourné par le client** (paramètre d'unicité et
  `Cache-Control: no-cache`). Ce n'est pas de la superstition : `fetch` passe par les caches système
  d'iOS et d'Android, et un hébergement statique leur laisse inventer une fraîcheur heuristique. Un
  manifeste servi depuis un cache, c'est un interrupteur d'arrêt qui n'arrête rien.
- **Le versionnage des Blueprints est volontairement pauvre** : une chaîne numérique pointée, sans
  pré-release ni métadonnées. Une comparaison qu'un publieur fait de tête vaut mieux qu'une
  grammaire dont il devine les coins.
- **Le manifeste décrit l'état voulu, pas un différentiel.** Une entrée qui en disparaît ramène son
  Blueprint à la version embarquée. L'interprétation la plus sûre d'un manifeste partiel est
  toujours le socle.
- **Un nom absent du socle est ignoré**, et c'est la limite qui motivera le jalon
  [6-G](6-g-etablissements.md). Ne pas essayer de la contourner ici.
- **Ne pas rafraîchir avant chaque run.** La tentation est forte et elle ruine la propriété
  principale : un run qui attend le réseau pour savoir quoi jouer est un run qui échoue quand le
  réseau est mauvais, c'est-à-dire exactement quand l'utilisateur en a besoin.

## Définition de « terminé »

1. Le registre résout entre socle et surcouche, sur AsyncStorage, avec ses tests unitaires.
2. `refresh()` est appelée au démarrage et au retour au premier plan, jamais dans le chemin d'un run.
3. `tools/publish-blueprints.mjs` valide, téléverse, calcule les empreintes et régénère le manifeste.
   Un manifeste périmé se voit en jouant le script à vide : il ne doit rien changer.
4. L'écran de diagnostic existe et dit la vérité.
5. Le **parcours complet de correction** a été joué en réel : casser volontairement un Blueprint
   embarqué, publier sa correction, la voir arriver sur un appareil **sans réinstaller**.
6. Les trois interrupteurs d'arrêt sont vérifiés, un par un.
7. `npx tsc --noEmit`, `npx eslint .`, `npm run parity` verts.
8. Documentation : [blueprints.md](../blueprints.md) gagne la procédure de publication,
   [backend.md](../backend.md) le bucket et la table, CHANGELOG.

## Plan de test

Le parcours de correction, d'abord, parce que c'est la raison d'être du jalon :

```bash
# 1. corriger le Blueprint dans blueprints/, incrementer sa version
# 2. publier
npm run blueprints:publish
# 3. sur l'appareil : mettre l'application en arriere-plan, revenir, rejouer l'ecran
```

Puis les sondes qui vérifient que les gardes mordent — chacune doit **conserver l'embarqué** et le
dire dans le diagnostic :

| Sonde | Attendu |
|---|---|
| Empreinte volontairement fausse dans le manifeste | entrée refusée, embarqué conservé |
| Fichier modifié après publication du manifeste | idem |
| Version distante inférieure ou égale à l'embarquée | ignorée |
| `min_engine` supérieur au moteur installé | ignorée, silencieusement |
| Manifeste malformé (clé inconnue, type inattendu) | manifeste **entier** refusé, rien n'est remplacé |
| Blueprint distant déclarant un secret hors périmètre | refusé avant le cache |
| Blueprint distant invalide au schéma | refusé avant le cache |
| Bucket injoignable, mode avion | l'application tourne sur son socle, aucun message d'erreur |
| Cache local corrompu à la main | entrée purgée, repli sur l'embarqué, sans plantage |

## Limites écrites

- **Un nom absent du binaire ne peut pas être ajouté à distance.** C'est une garde, pas un bug ; elle
  est levée en opt-in au jalon [6-G](6-g-etablissements.md) via le jalon 3-H d'Aetherius.
- **Le cache tient dans un document unique**, sous une seule clé. Un document illisible fait perdre
  la surcouche **entière** et l'application retombe sur son socle. C'est le sens du repli, et c'est
  préférable à un index qui pourrait se contredire.
- **Publier reste un geste manuel.** Pas de chaîne d'intégration continue pour les Blueprints à ce
  stade ; le script est le contrat. Une automatisation viendrait après avoir constaté qu'on publie
  souvent.
- **Il n'y a pas de signature d'auteur.** L'authenticité du transport est déléguée à TLS. Une
  signature serait la réponse au publieur compromis, et elle demanderait une gestion de clés qu'un
  bucket ne fournit pas.
