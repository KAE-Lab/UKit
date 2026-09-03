# Les Blueprints embarqués

Les fichiers d'instructions joués par le moteur Aetherius. C'est la **source de vérité** : ils sont
relus en revue, versionnés avec le code qui les consomme, importés dans le binaire par
[`index.ts`](index.ts), et publiés vers la base par `npm run blueprints:publish`.

| Fichier | Rôle |
|---|---|
| `*.blueprint.json` | les documents eux-mêmes, **embarqués** dans le binaire |
| [`ukit-edt-abonnement.blueprint.json`](ukit-edt-abonnement.blueprint.json) | le **repli universel** (jalon 6-J) : le calendrier d'un lien collé par l'étudiant. Embarqué et **hors du préfixe `ukit.portail.`**, parce qu'il n'appartient à aucun établissement |
| [`portails/`](portails/) | les portails d'établissements, rangés par établissement : publiés d'abord, embarqués à la release suivante — `index.ts` dit lesquels le sont |
| [`index.ts`](index.ts) | le socle embarqué : les noms, la table `BUNDLED`, le périmètre des secrets |
| [`versions.json`](versions.json) | la **version** de chaque document, et son `min_engine` s'il en a un |

`versions.json` existe parce que le script de publication est un module Node : il ne sait pas lire
`index.ts`. Les deux côtés lisent donc le même fichier de données, et une version recopiée à la main
ne peut pas diverger de celle qui est embarquée.

Ce que ces fichiers portent, comment on en écrit un et comment on publie une correction :
[docs/blueprints.md](../docs/blueprints.md).

## Provenance

Les fichiers d'origine viennent du jalon 3-G d'Aetherius, où ils ont été écrits contre nos vraies
sources, joués sur les deux moteurs et vérifiés sur un téléphone. Ce sont des fichiers **mesurés**, et
les retoucher sans raison mesurée reviendrait à perdre ce qui les rend fiables.

La règle est donc : **on ne les retouche pas par confort, on les corrige quand le branchement révèle
un manque** — et la correction s'accompagne d'une montée de version.

| Fichier | Correction | Version | Jalon |
|---|---|---|---|
| `ukit-campus-annonces` | extraction de `long_desc`, que la fiche affiche et que le fichier oubliait ; `assert` sur la présence du tableau `annonces` | 1 → **2** | [6-A](../docs/phase-6/6-a-socle.md) |
| `ukit-campus-restaurants` | réduit au **seul** appel de liste, `assert` de forme, extraction de `horaires` | 1 → **2** | [6-D](../docs/phase-6/6-d-campus.md) |
| `ukit-celcat-semaine` | réduit au **seul** appel de semaine ; `federationIds[]` prend une liste, borne de fin à `add_days(6)`, filtre `Vacances` **retiré** du fichier, `taille_de_page` remise à 10000 | 1 → **2** | [6-E](../docs/phase-6/6-e-planning.md) |
| `ukit-scolarite-sso` → `ukit-scolarite-dossier` | **renommé** (`sso` nommait un mécanisme, `dossier` nomme l'appel) ; pause de 8 s après le clic, garde `#loginErrorsPanel`, `assert` étendu aux **cinq** libellés voisins, plafond de connexion 45 s → 30 s | **1** (nom neuf) | [6-F](../docs/phase-6/6-f-scolarite.md) |
| `ukit-scolarite-messagerie` | garde `#loginErrorsPanel` : un mot de passe refusé doit se nommer `LOGIN_FAILED`, pas `MESSAGERIE_INDISPONIBLE` | 1 → **2** | [6-F](../docs/phase-6/6-f-scolarite.md) |
| `ukit-scolarite-messagerie` | **aucun changement de contenu** : les versions 3 et 4 ont été brûlées à jouer la sonde de livraison sur le bucket de production — une v3 volontairement cassée, puis la v4 qui la répare, l'appareil n'ayant jamais été réinstallé entre les deux. Le fichier de la v4 est identique à celui de la v2 | 2 → **4** | [6-F](../docs/phase-6/6-f-scolarite.md) |
| les six `ukit-celcat-*` | l'hôte et le code d'inventaire quittent les `vars` pour devenir des **entrées**, alimentées par la ligne de catalogue de l'établissement. Les valeurs par défaut restent celles de Bordeaux, ce qui garde chaque fichier jouable seul | +1 chacun | [6-G](../docs/phase-6/6-g-etablissements.md) |
| `ukit-scolarite-*` → `ukit-portail-bordeaux-*` | **renommés** sous le préfixe réservé, et leurs secrets deviennent `portail_user` / `portail_pass` — neutres vis-à-vis de l'établissement, sans quoi chaque nouvelle université aurait exigé une release pour un nom de secret | **1** (noms neufs) | [6-G](../docs/phase-6/6-g-etablissements.md) |
| `ukit-portail-bordeaux-documents` | **nouveau** : ReNARD, le service de documents étudiants de Bordeaux. C'est le premier fichier du dépôt qui rapporte un **binaire** — pas en l'écrivant, ce qu'aucun Act ne sait faire, mais en le renvoyant en base64 depuis la page elle-même (`evaluate`). Ce que ça borne : 4 Mo, refus explicite au-delà. Ce que ça évite : ponter le magasin de cookies natif, puisque la requête part du document | **1** (fichier neuf) | session du 2026-08-29 |
| `ukit-portail-bordeaux-inp-dossier` | l'attente de la page Coordonnées passe de 20 à 30 s, alignée sur les deux attentes de première page. Mesuré sur appareil : une WebView hors écran étrangle ses timers, la première page passait sous les 30 s et la deuxième échouait deux fois à 20 s — quand le même parcours en local rend cette page en 794 ms. Chaque navigation PC-Scol redémarre le client Vaadin | 6 → **7** | session du 2026-08-29 |
| `ukit-portail-bordeaux-inp-edt` et `-edt-annee` | **nouveaux** : l'export iCalendar anonyme d'ADE, hors socle. Ce sont les premiers fichiers du dépôt à déclarer un `min_engine` (`0.5.4`), parce que leur extraction `from: "text"` n'existe pas avant | **1** (fichiers neufs) | [6-I](../docs/phase-6/6-i-planning-universel.md) |
| `ukit-portail-bordeaux-inp-edt` | **aucun changement de contenu** : les versions 2 et 3 ont été brûlées à jouer les chemins dégradés sur l'appareil — un hôte pointé sur `127.0.0.1:1`, puis un `expect.status` à `418`. Le fichier de la v4 est identique à celui de la v1. Même mécanique qu'au jalon 6-F sur `ukit-scolarite-messagerie` : une sonde de livraison consomme des versions, et c'est le prix de la vérifier en production plutôt que de la supposer | 1 → **4** | [6-I](../docs/phase-6/6-i-planning-universel.md) |

Le second ajout du jalon 6-A mérite d'être connu avant d'écrire le suivant : sans lui, une réponse
valide dont la clé attendue a disparu rend un **succès à liste vide**, indistinguable d'une liste
légitimement vide.
Voir [docs/blueprints.md](../docs/blueprints.md#affirmer-la-forme-pour-que--rien-trouvé--ne-se-confonde-pas-avec--rien-à-trouver-).

Deux corrections du jalon 6-E méritent la même attention, parce qu'elles vont **contre** le fichier de
référence :

- **le filtre `Vacances` est sorti du Blueprint.** Le fichier 3-G l'exprimait en `where`, ce qui est
  parfaitement légal — mais le service refiltre de toute façon sur la date exacte, et deux filtres
  pour une même liste rendent un comportement inexplicable trois mois plus tard. Surtout, la recherche
  de salles libres a *besoin* des `Vacances` : ce sont elles qui déclarent un bâtiment fermé. **Un
  filtre, un endroit** ;
- **`taille_de_page` était à 50**, contre 10000 dans le code. Un fichier de démonstration n'a pas
  besoin des 2 945 groupes ; l'application, si.

Ils sont un point de départ démontré, pas le jeu final :

| Fichier repris | Ce qu'il est devenu, ou deviendra | Jalon |
|---|---|---|
| `ukit-campus-annonces` | **plus joué** ; conservé comme témoin du format — la source est passée en base | [6-A](../docs/phase-6/6-a-socle.md), [6-B](../docs/phase-6/6-b-supabase.md) |
| `ukit-campus-restaurants` | **fait** : découpé en `restaurants` et `restaurant-menu` | [6-D](../docs/phase-6/6-d-campus.md) |
| `ukit-campus-affluence` | **fait** : remplacé par `bibliotheques`, `bibliotheque-affluence` et `bibliotheque-horaires` ; le fichier d'origine est supprimé | [6-D](../docs/phase-6/6-d-campus.md) |
| `ukit-celcat-semaine` | **fait** : découpé en `groupes`, `jour`, `semaine`, `annee`, `salles`, `occupation` | [6-E](../docs/phase-6/6-e-planning.md) |
| `ukit-scolarite-sso` | **fait** : renommé `ukit.scolarite.dossier` (6-F) puis `ukit.portail.bordeaux.dossier` (6-G) | [6-F](../docs/phase-6/6-f-scolarite.md), [6-G](../docs/phase-6/6-g-etablissements.md) |
| `ukit-scolarite-messagerie` | **fait** : renommé `ukit.portail.bordeaux.messagerie` (6-G), puis devenu **un widget parmi quatre** — il a un frère à l'INP et un voisin Moodle, et ses sorties portent en plus les noms génériques du contrat de widget | [6-F](../docs/phase-6/6-f-scolarite.md), [6-G](../docs/phase-6/6-g-etablissements.md) |

La règle qui explique ce tableau : **un Blueprint par appel réellement joué par l'application**, pas
un par source. Les fichiers d'origine regroupent plusieurs requêtes parce qu'ils devaient démontrer
une chaîne en une exécution ; l'application, elle, les appelle à des moments différents, pour des
écrans différents.

### Un fichier supprimé ne se retire pas du bucket

Le manifeste est régénéré depuis ce dossier : une entrée qui en disparaît ramène simplement son
Blueprint au socle embarqué sur les appareils qui la connaissaient. L'objet, lui, **reste** dans le
bucket — le script ne supprime rien. C'est sans conséquence (plus aucun manifeste ne le désigne, et
l'appareil ne lit que ce que le manifeste nomme) et c'est délibéré : supprimer un objet référencé par
un manifeste encore en cache quelque part serait le seul geste vraiment irréversible du dispositif.

## Convention de nommage

`<domaine>.<tache>`, en minuscules, sans accent :

```
ukit.campus.restaurants
ukit.campus.bibliotheque-affluence
ukit.celcat.semaine
ukit.portail.bordeaux.dossier
```

Le préfixe `ukit.portail.` est **réservé** : c'est le seul sous lequel un manifeste distant peut
ajouter un Blueprint que l'application n'embarque pas ([6-G](../docs/phase-6/6-g-etablissements.md)).
Ne pas l'utiliser pour autre chose.

Un portail vit dans [`portails/`](portails/). Il arrive **hors socle** — [`index.ts`](index.ts) ne
l'importe pas, il n'existe que par le manifeste — puis la release suivante l'embarque, parce que le
binaire n'embarque un établissement que s'il embarque de quoi le jouer, et que le socle du catalogue
embarque depuis la 6.1 tous les établissements publiés à la date de la release
(`src/shared/etablissements/socle.ts`, dont un test exige que chaque Blueprint nommé soit dans
`BUNDLED`). Le dossier ne dit donc plus s'il est embarqué : `index.ts` le dit, et le script de
publication l'y lit pour l'annoncer.

Le script y applique une garde de plus : un fichier de ce dossier dont le nom n'est pas couvert par le
préfixe **arrête la publication** — publier un fichier que l'appareil ignorera ensuite en silence est
le genre de panne qu'on cherche une soirée.

Le nom du fichier reprend le nom du Blueprint, points remplacés par des tirets, suivi de
`.blueprint.json`.

## Deux règles qui ne se négocient pas

- **Aucun identifiant dans un fichier.** Les secrets sont **déclarés** (`secrets`) et fournis au
  runtime par le trousseau de l'appareil. Un fichier de ce dossier est publié sur un CDN public.
- **La version s'incrémente dans [`versions.json`](versions.json) à chaque correction publiée.** Le
  distant ne gagne que s'il est strictement plus récent que l'embarqué ; une correction publiée sans
  montée de version n'atteint jamais un appareil, et le panneau de diagnostic du menu de
  développement est le seul endroit où ça se voit.
