# La base : Supabase

UKit s'appuie sur un projet **Supabase** pour publier ce qu'il publie : les
[Blueprints](blueprints.md), le contenu éditorial, les référentiels et le catalogue des
établissements.

> **État actuel.** Ce document est la référence du dos applicatif introduit par la
> [Phase 6](phase-6/README.md). Le projet et son schéma sont créés au jalon
> [6-B](phase-6/6-b-supabase.md) ; le bucket de livraison et son manifeste au jalon
> [6-C](phase-6/6-c-livraison.md) ; le catalogue des établissements est rempli et branché au jalon
> [6-G](phase-6/6-g-etablissements.md). Ce qui est écrit ici avant d'exister est marqué comme tel.

## Ce que la base est, et ce qu'elle n'est pas

**Elle est un point de publication.** Ce qu'elle porte, c'est ce que l'équipe publie : des fichiers
d'instructions, des annonces, des coordonnées de bâtiments, une liste d'universités.

**Elle n'est pas un intermédiaire.** Aucune requête vers une source universitaire ne passe par elle,
aucun identifiant ne la traverse, aucune donnée personnelle n'y est écrite. L'application fonctionne
sans jamais la joindre : chaque chose qu'elle publie a un **socle embarqué** dans le binaire, et la
base ne fait que le mettre à jour.

C'est ce qui permet au [README](../README.md) de continuer à promettre ce qu'il promettait : aucun
compte n'est requis, et rien de ce qui appartient à l'utilisateur ne quitte son appareil. Le moteur
est embarqué précisément pour ça — un moteur hébergé aurait fait sortir toutes les requêtes d'une
seule adresse et fait transiter les identifiants CAS par une machine tierce.

## Le projet et ses clés

Plan gratuit, un seul projet, pas de préproduction — une correction publiée est une correction en
production. C'est acceptable pour du contenu ; pour les Blueprints, c'est l'interrupteur d'arrêt qui
rattrape ([6-C](phase-6/6-c-livraison.md)).

| Clé | Où elle vit | Ce qu'elle peut |
|---|---|---|
| `anon` | dans le binaire, via [`app.config.ts`](../app.config.ts) → `extra` | exactement ce que les politiques autorisent : lire le contenu publié |
| `service_role` | secret de CI et poste du publieur, **jamais** dans l'application | tout, politiques contournées |

La clé `anon` est **publique par conception** : elle est lisible dans n'importe quel binaire. Ce n'est
pas un secret mal gardé, c'est un identifiant. La frontière de sécurité, ce sont les politiques.

Les deux valeurs arrivent par l'environnement — [`app.config.ts`](../app.config.ts) charge déjà
`dotenv/config` pour `SENTRY_DSN`. `.env.example` documente les noms, les secrets EAS portent les
valeurs pour les builds.

> **La clé `service_role` est la clé de la production.** Qui la détient peut publier un Blueprint que
> tous les appareils joueront. Elle ne circule pas, elle ne s'écrit pas dans un fichier versionné, et
> l'accès au projet se traite comme un accès de production — parce que c'en est un.

## Le schéma

Source : [`supabase/schema.sql`](../supabase/schema.sql). Il s'applique depuis le fichier, jamais
depuis l'interface web : ce qui est fait à la main n'est pas reproductible.

| Table | Contenu | Lue par | Socle embarqué |
|---|---|---|---|
| `annonces` | contenu éditorial de vie étudiante | `BdeService` | — |
| `batiments` | coordonnées, horaires, accès libre, visuel | `CampusDataManager` | [`assets/locations.json`](../assets/locations.json) |
| `etablissements` | catalogue des universités et de leurs portails | l'onboarding et les réglages | l'établissement historique |
| `app_release` | version courante et minimale par plateforme, lien de store | `UpdateAlert` | — |
| `service_messages` | bandeau de service : maintenance, incident | l'écran d'accueil | — |
| `blueprints` | index de livraison : nom, version, chemin, empreinte, moteur minimal | le script de publication | [`blueprints/`](../blueprints/) |

Deux buckets :

| Bucket | Contenu | Accès |
|---|---|---|
| `blueprints` | les fichiers d'instructions et `manifest.json` | lecture publique |
| `media` | visuels des annonces et des bâtiments | lecture publique |

**Rien de tout cela ne porte de logique.** Pas de fonction, pas de déclencheur métier, pas de vue qui
calcule. Ce qui se calcule se calcule dans l'application, où c'est typé, relu et vérifié. La base
porte de la donnée.

## Les politiques d'accès

Source : [`supabase/policies.sql`](../supabase/policies.sql).

RLS est activé sur **toutes** les tables, y compris celles qui n'ont rien de sensible : une table
sans politique est une table qu'on oubliera de protéger le jour où elle en aura besoin.

- **Lecture publique** pour le rôle `anon`, restreinte aux lignes publiées. Une annonce inactive ou
  expirée ne sort pas de la base — elle n'est pas filtrée côté application. Le filtre applicatif
  existe quand même, pour la donnée qui vient du cache local.
- **Aucune écriture** pour `anon`. Sans exception.
- **Écriture par `service_role`** uniquement : le script de publication et la console
  d'administration.

Le jour où la partie sociale arrivera, elle ajoutera ses tables et ses politiques adossées à
`auth.uid()`. Rien de ce qui est écrit ici ne devra être défait.

## Le client applicatif

Un client `anon` unique, dans [`src/shared/supabase/`](../src/shared/supabase/), instancié au niveau
module. Aucun service ne construit le sien.

**La base se lit depuis un service, jamais depuis un composant** — la même règle que le réseau depuis
toujours ([architecture.md](architecture.md#les-couches)). Elle vaut d'être posée maintenant, tant
qu'il n'y a qu'un appelant.

### Pourquoi pas un Blueprint pour lire notre propre base

Un Blueprint sert à parler à une source **tierce** dont on ne contrôle ni le format ni la
disponibilité, et qu'on veut pouvoir corriger sans release. Pour notre propre table, l'indirection
n'achèterait rien — nous changeons le schéma et l'application dans le même mouvement — et coûterait
un aller-retour de plus à chaque correction.

## Publier

### Du contenu

Annonces, bâtiments, établissements, messages de service : depuis la console d'administration de
Supabase. Une annonce se désactive par un booléen, sans release et sans commit — c'était déjà vrai
avec le dépôt `ukit-data`, ça reste vrai, avec en plus une date, un auteur et une trace.

### Des Blueprints

```bash
npm run blueprints:publish
```

Le script valide, téléverse, calcule les empreintes, met la table à jour et régénère le manifeste.
Détail et retours en arrière : [blueprints.md](blueprints.md#publier-une-correction).

## Ce qu'il faut savoir avant d'être surpris

- **Le plan gratuit met un projet en pause après une semaine sans requête.** Sans conséquence en
  production ; un projet de préproduction dormant réveillera un jour quelqu'un à tort.
- **Le cache HTTP des plateformes est contourné** par le client de livraison (paramètre d'unicité et
  `Cache-Control: no-cache`). Sans cela, iOS et Android peuvent servir un vieux manifeste pendant une
  durée que personne ne contrôle — c'est-à-dire un interrupteur d'arrêt qui n'arrête rien.
- **Les limites du plan gratuit sont larges pour notre usage** (du texte et quelques visuels) mais
  elles existent : taille de base, stockage, bande passante, requêtes. À relever quand on s'en
  approchera, avec la décision qui va avec.
- **Une correction est en production immédiatement.** Il n'y a pas d'étape intermédiaire ; c'est
  l'interrupteur d'arrêt qui joue ce rôle, pas un environnement de recette.

## Migrations

Le schéma évolue par fichiers versionnés dans [`supabase/`](../supabase/), appliqués dans l'ordre.
Une évolution qui casserait une version d'application encore installée n'en est pas une : le parc ne
se vide pas d'un coup, et une colonne retirée trop tôt casse des installations qu'on n'a pas
comptées. Ajouter avant de retirer, toujours.

## Documentation associée

| Sujet | Document |
|---|---|
| Les fichiers d'instructions et leur publication | [blueprints.md](blueprints.md) |
| Ce que l'application conserve localement | [donnees-et-persistance.md](donnees-et-persistance.md) |
| L'inventaire des sources distantes | [sources-externes.md](sources-externes.md) |
| Le cadrage de la phase qui introduit la base | [phase-6/README.md](phase-6/README.md) |
