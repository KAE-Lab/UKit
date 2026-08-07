# 6-B — La base Supabase

> Donner à UKit le dos qui lui manquait : un point de publication pour les Blueprints, le contenu
> éditorial, le référentiel des lieux et le catalogue des établissements. Mince par construction.

## Objectif

Un projet Supabase existe, son schéma est appliqué, ses politiques d'accès sont écrites, et
l'application le lit. Le contenu servi aujourd'hui par le dépôt `ukit-data` derrière jsDelivr
déménage, et les annonces deviennent la première fonctionnalité alimentée par la base.

## Pourquoi une base, alors que le README promettait de n'en avoir aucune

Le principe « aucun serveur » du [README](../../README.md) répondait à une vraie question : ne pas
faire transiter les données de l'utilisateur par une machine tierce. Ce principe **survit
intégralement**, et c'est même pour lui qu'on a choisi un moteur *embarqué* plutôt qu'un moteur
hébergé.

Ce qui change est autre chose : nous n'avions **aucun endroit où publier**. Les annonces vivent dans
un dépôt GitHub servi par un CDN, ce qui marche mais ne se relit pas, ne se date pas, ne se
désactive pas sans commit, et n'accepte qu'un seul auteur — celui qui a les droits d'écriture sur le
dépôt. Le référentiel des bâtiments est un fichier embarqué : un horaire faux attend une release.

La formulation honnête, celle qui remplace « aucun serveur » dans le README :

> Aucun compte n'est requis, aucune donnée personnelle ne quitte l'appareil, et l'application
> fonctionne sans jamais joindre notre base. Ce que la base porte, c'est **ce que nous publions** :
> des Blueprints, du contenu éditorial, des référentiels.

Ce sont deux promesses distinctes, et la seconde n'affaiblit pas la première.

## Ce qui est livré

### Le projet et ses clés

Plan gratuit. Deux clés, et il faut savoir laquelle est laquelle :

| Clé | Où elle vit | Ce qu'elle peut |
|---|---|---|
| `anon` | dans le binaire, via [`app.config.ts`](../../app.config.ts) → `extra` | exactement ce que les politiques RLS autorisent, c'est-à-dire lire le contenu publié |
| `service_role` | **jamais** dans l'application — secret de CI et poste du publieur | tout, RLS contourné. C'est la clé du script de publication |

La clé `anon` est publique **par conception** : elle est lisible dans n'importe quel binaire
d'application, chez Supabase comme ailleurs. Ce n'est pas un secret mal gardé, c'est un identifiant.
La frontière de sécurité, ce sont les politiques ; les traiter comme un détail serait l'erreur du
jalon.

Les deux valeurs arrivent par l'environnement, comme `SENTRY_DSN` aujourd'hui — `app.config.ts`
charge déjà `dotenv/config`. Un `.env.example` documente les noms, et les secrets EAS portent les
valeurs pour les builds.

### Le schéma — [`supabase/schema.sql`](../../supabase/schema.sql)

| Table | Contenu | Remplace |
|---|---|---|
| `annonces` | contenu éditorial de vie étudiante : titre, émetteur, visuel, appel à l'action, activation, expiration | `ukit-data/annonces.json` sur jsDelivr |
| `batiments` | référentiel des lieux : coordonnées, horaires d'ouverture, accès libre, visuel | [`assets/locations.json`](../../assets/locations.json), qui reste le socle hors ligne |
| `etablissements` | catalogue des universités : code, nom, visuel, Blueprints associés, activation | rien — la fac est en dur aujourd'hui. Créée ici, remplie et branchée en [6-G](6-g-etablissements.md) |
| `app_release` | version courante et version minimale par plateforme, lien de store, message | la lecture du fichier `VERSION` sur GitHub raw, mécanisme aujourd'hui inactif |
| `service_messages` | bandeau de service : maintenance, incident, information datée | rien |
| `blueprints` | l'index de livraison : nom, version, chemin, empreinte, moteur minimal, désactivation | rien — c'est la matière du manifeste du jalon [6-C](6-c-livraison.md) |

Deux buckets de stockage : `blueprints` (les fichiers et le manifeste) et `media` (les visuels des
annonces et des bâtiments, aujourd'hui servis par jsDelivr).

### Les politiques — [`supabase/policies.sql`](../../supabase/policies.sql)

RLS activé sur **toutes** les tables, sans exception, y compris celles qui n'ont rien de sensible :
une table sans politique est une table qu'on oubliera de protéger le jour où elle en aura besoin.

- Lecture publique pour le rôle `anon`, **restreinte aux lignes publiées** — une annonce inactive ou
  expirée ne sort pas de la base, elle n'est pas filtrée côté application ;
- aucune écriture pour `anon`, aucune exception ;
- écriture par `service_role` uniquement, c'est-à-dire par le script de publication et la console
  d'administration.

Le jour où la partie sociale arrivera, elle ajoutera ses tables et ses politiques adossées à
`auth.uid()`. Rien de ce qui est écrit ici ne devra être défait — c'est tout ce qu'on attend de ce
jalon sur ce sujet.

### Le client — `src/shared/supabase/`

Un client `anon` unique, instancié au niveau module, plus les types du schéma. Aucun service ne
construit son propre client.

Et une règle qui vaut d'être posée maintenant, tant qu'il n'y a qu'un appelant : **la base se lit
depuis un service, jamais depuis un composant** — même règle que le réseau depuis toujours
([architecture.md](../architecture.md#les-couches)).

### La migration du contenu

Un script d'import unique, jouable une fois et gardé pour mémoire : les annonces de `ukit-data`, les
73 bâtiments de `locations.json`, les visuels vers le bucket `media`. Les URLs d'images des annonces
migrées pointent alors vers Storage.

Le dépôt `ukit-data` n'est pas supprimé : il reste la source des visuels référencés par des versions
déjà installées de l'application. Il cesse simplement d'être écrit.

### Les annonces basculent

`BdeService` lit désormais la table plutôt que le fichier CDN. Le Blueprint
[`ukit-campus-annonces`](../../blueprints/ukit-campus-annonces.blueprint.json) posé en
[6-A](6-a-socle.md) n'est plus le chemin de production pour cette source — et c'est une décision, pas
un renoncement :

> **Ce qui vient de notre base se lit avec le client de notre base.** Un Blueprint sert à parler à
> une source **tierce** dont on ne contrôle ni le format ni la disponibilité. Pour notre propre
> table, l'indirection n'achèterait rien — nous pouvons changer le schéma et l'application dans le
> même mouvement — et coûterait un aller-retour de plus à chaque correction.

Le Blueprint reste dans [`blueprints/`](../../blueprints/) : il a servi de pilote au jalon 6-A, il
documente le format historique, et il redeviendra utile le jour où une source éditoriale tierce
apparaîtra. Sa parité est retirée du harnais avec la bascule, pas avant.

## Décisions et pièges

- **Le plan gratuit met un projet en pause après une semaine sans requête.** Sans conséquence en
  production, mais un projet de préproduction dormant réveillera un jour quelqu'un à tort. À écrire
  dans [backend.md](../backend.md), pas à découvrir.
- **La péremption des annonces est filtrée en base**, par la politique, et **aussi** en application.
  Ce n'est pas de la redondance inutile : la politique protège la donnée, le filtre applicatif
  protège l'affichage quand la donnée vient du cache local.
- **Le référentiel des bâtiments a deux sources et un seul gagnant.** Le fichier embarqué est le
  socle ; la table est une surcouche, appliquée quand elle est joignable. Exactement le même modèle
  que la livraison des Blueprints, pour la même raison : l'application doit démarrer hors ligne au
  premier lancement.
- **Ne pas mettre de logique en base.** Pas de fonction, pas de déclencheur métier, pas de vue qui
  calcule. Ce qui se calcule se calcule dans l'application, où c'est typé, relu et testé. La base
  porte de la donnée.

## Définition de « terminé »

1. Le projet existe, le schéma et les politiques sont appliqués depuis les fichiers du dépôt — pas
   depuis l'interface web, sinon rien n'est reproductible.
2. Les clés sont dans l'environnement, un `.env.example` les documente, les secrets EAS sont posés.
3. Le contenu de `ukit-data` est migré, visuels compris, et vérifié à l'écran.
4. `BdeService` lit la base ; l'écran de vie étudiante est identique, expiration comprise.
5. Une tentative d'écriture avec la clé `anon` **échoue** — vérifiée, pas supposée.
6. `npx tsc --noEmit` et `npx eslint .` sans régression.
7. Documentation : [backend.md](../backend.md) écrit (schéma, politiques, procédure), README et
   PRIVACY corrigés sur le principe « aucun serveur »,
   [donnees-et-persistance.md](../donnees-et-persistance.md) amendé, CHANGELOG.

## Plan de test

| Sonde | Attendu |
|---|---|
| Écran de vie étudiante, nominal | les mêmes annonces qu'avant la bascule |
| Annonce désactivée en base | disparaît au rechargement, sans release |
| Annonce expirée | absente — et vérifier qu'elle est absente **de la réponse**, pas seulement de l'écran |
| Mode avion | `unavailable`, écran de repli — pas une liste vide |
| Écriture avec la clé `anon`, depuis un client de test | refusée par RLS |
| Projet volontairement injoignable (clé fausse) | l'application démarre, les autres onglets fonctionnent |

La dernière sonde est celle qui vérifie la promesse du jalon : la base est un point de publication,
pas un intermédiaire. Si l'application ne démarre pas sans elle, le jalon est raté.

## Limites écrites

- **Le plan gratuit a des limites de taille et de bande passante.** Elles sont larges pour notre
  usage (du texte et quelques visuels), mais elles existent : les chiffres du jour sont notés dans
  [backend.md](../backend.md), avec ce qu'on fera si on s'en approche.
- **Il n'y a pas de préproduction.** Un seul projet, et donc une correction publiée est une
  correction en production. C'est acceptable pour du contenu ; ça ne le sera plus pour les Blueprints,
  d'où l'interrupteur d'arrêt du jalon [6-C](6-c-livraison.md).
- **Aucune donnée utilisateur n'est en base**, et rien dans ce jalon ne prépare l'inverse au-delà de
  politiques qui ne gênent pas. La partie sociale reste une phase à part entière.
