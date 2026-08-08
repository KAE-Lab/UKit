# La base : Supabase

UKit s'appuie sur un projet **Supabase** pour publier ce qu'il publie : les
[Blueprints](blueprints.md), le contenu éditorial, les référentiels et le catalogue des
établissements.

> **État actuel.** Le projet existe, son schéma et ses politiques sont appliqués, ses deux buckets
> sont créés, **les annonces de vie étudiante y sont lues** depuis le jalon
> [6-B](phase-6/6-b-supabase.md), et **le bucket de livraison sert les six Blueprints et leur
> manifeste** depuis le jalon [6-C](phase-6/6-c-livraison.md). Le référentiel des bâtiments est
> peuplé mais pas encore lu par l'application (jalon [6-D](phase-6/6-d-campus.md)) ; le catalogue des
> établissements est rempli et branché au jalon [6-G](phase-6/6-g-etablissements.md). Ce qui est
> écrit ici avant d'exister est marqué comme tel.

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

Plan gratuit, un seul projet en région européenne, pas de préproduction — une correction publiée est
une correction en production. C'est acceptable pour du contenu ; pour les Blueprints, c'est
l'interrupteur d'arrêt qui rattrape ([6-C](phase-6/6-c-livraison.md)).

La procédure de création et d'application du schéma est dans
[`supabase/README.md`](../supabase/README.md).

| Clé | Où elle vit | Ce qu'elle peut |
|---|---|---|
| `anon` | dans le binaire, via [`app.config.ts`](../app.config.ts) → `extra` | exactement ce que les politiques autorisent : lire le contenu publié |
| `service_role` | secret de CI et poste du publieur, **jamais** dans l'application | tout, politiques contournées |

Une troisième variable passe par le même chemin sans être une clé : `BLUEPRINTS_REMOTE`. À `false`,
elle fait ignorer durablement la surcouche publiée — le troisième interrupteur d'arrêt, le seul qui
se pose à la construction du binaire ([blueprints.md](blueprints.md#revenir-en-arrière)).

La clé `anon` est **publique par conception** : elle est lisible dans n'importe quel binaire. Ce n'est
pas un secret mal gardé, c'est un identifiant. La frontière de sécurité, ce sont les politiques.

Les deux valeurs arrivent par l'environnement — [`app.config.ts`](../app.config.ts) charge déjà
`dotenv/config` pour `SENTRY_DSN`. `.env.example` documente les noms ; pour les builds, les variables
EAS portent les valeurs sur les trois environnements (`production`, `preview`, `development`), en
visibilité **plaintext** — la clé publiable est un identifiant, pas un secret, et la ranger comme tel
brouillerait la seule distinction qui compte ici. Commande :
[`supabase/README.md`](../supabase/README.md).

**Une conséquence à connaître** : `app.config.ts` lit l'environnement au moment où il construit la
configuration, pas à l'exécution. Changer `.env` demande donc un redémarrage du serveur de
développement (`npx expo start -c`), pas un simple rechargement — c'est ce qui rend les sondes de
chemin dégradé un peu lentes, et ce qui explique qu'on les regroupe.

> **La clé `service_role` est la clé de la production.** Qui la détient peut publier un Blueprint que
> tous les appareils joueront. Elle ne circule pas, elle ne s'écrit pas dans un fichier versionné, et
> l'accès au projet se traite comme un accès de production — parce que c'en est un.

## Le schéma

Source : [`supabase/schema.sql`](../supabase/schema.sql). Il s'applique depuis le fichier, jamais
depuis l'interface web : ce qui est fait à la main n'est pas reproductible.

| Table | Contenu | Lue par | Depuis | Socle embarqué |
|---|---|---|---|---|
| `annonces` | contenu éditorial de vie étudiante | [`BdeService`](../src/features/Campus/services/BdeService.ts) | **6-B** | — |
| `batiments` | coordonnées, horaires, accès libre, visuel | `CampusDataManager` | 6-D | [`assets/locations.json`](../assets/locations.json) |
| `etablissements` | catalogue des universités et de leurs portails | l'onboarding et les réglages | 6-G | l'établissement historique |
| `app_release` | version courante et minimale par plateforme, lien de store | rien aujourd'hui | — | — |
| `service_messages` | bandeau de service : maintenance, incident | rien aujourd'hui | — | — |
| `blueprints` | index de livraison : nom, version, chemin, empreinte, moteur minimal, `desactive` | le script de publication | **6-C** | [`blueprints/`](../blueprints/) |

`batiments` est **peuplée depuis le jalon 6-B mais lue par personne** : ses 73 lignes viennent de
`locations.json`, et l'application continue de lire le fichier embarqué. La surcouche est branchée en
6-D, où elle a un écran pour la montrer.

`app_release` et `service_messages` sont créées vides, et rien ne les lit : il n'existe aucun écran
de mise à jour ni de bandeau de service dans l'application. Les créer maintenant coûte deux tables et
évite une migration le jour où ces écrans arriveront ; les remplir sans écran ne servirait personne.

La table `blueprints` n'est **pas lue par l'application** : l'appareil lit `manifest.json` dans le
bucket, et la table n'a d'ailleurs aucune politique de lecture pour `anon`. Elle sert deux choses au
publieur — la trace de ce qui est en ligne, et la colonne `desactive`, qui est la surface d'édition
du premier interrupteur d'arrêt ([blueprints.md](blueprints.md#revenir-en-arrière)).

Deux buckets :

| Bucket | Contenu | Accès |
|---|---|---|
| `blueprints` | les six fichiers d'instructions et `manifest.json` | lecture publique |
| `media` | visuels des annonces (`annonces/`) et des bâtiments (`batiments/`) | lecture publique |

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

Un client `anon` unique, dans [`src/shared/supabase/`](../src/shared/supabase/), construit **au
premier usage** et non à l'import. Aucun service ne construit le sien.

| Fichier | Rôle |
|---|---|
| [`client.ts`](../src/shared/supabase/client.ts) | la configuration lue dans `extra`, et le client paresseux |
| [`types.ts`](../src/shared/supabase/types.ts) | les tables telles que la base les rend, et le type `Database` |
| [`failures.ts`](../src/shared/supabase/failures.ts) | une erreur de lecture rangée dans une famille d'écran |
| [`index.ts`](../src/shared/supabase/index.ts) | la porte d'entrée : un service importe d'ici |

**La paresse n'est pas un détail de style.** Instancier au chargement du module mettrait la base sur
le chemin de démarrage de l'application, ce que ce dos promet exactement de ne pas faire.

Et une conséquence mesurée plutôt que supposée : `createClient` construit un client Realtime au
passage, et **celui-ci lève** si l'hôte ne fournit pas de `WebSocket` — constaté sous Node 20, alors
que rien dans UKit n'utilise Realtime. React Native en fournit un, donc le cas ne se produit pas sur
appareil ; la construction est tout de même gardée, parce qu'une exception sur le chemin de démarrage
donnerait un écran blanc là où le comportement attendu est de continuer sans la base.

### Le modèle d'erreur

Une lecture ratée est traduite dans le **même vocabulaire** que les échecs du moteur
([`shared/aetherius/failures.ts`](../src/shared/aetherius/failures.ts)) : un écran branché sur
`UkitFailure` n'a pas à savoir si la donnée venait d'un Blueprint ou d'une table.

| Cas | Famille | Conséquence à l'écran |
|---|---|---|
| clés absentes du binaire, transport mort, projet injoignable | `unavailable` | « Service indisponible », bouton Réessayer |
| clé invalide (401), refus de politique (42501) | `unavailable` | idem — l'utilisateur n'a aucune prise |
| table ou colonne absente (`PGRST205`, `42703`, …) | `rejected` | « Réponse inattendue » — le schéma a bougé, **pas** de bouton |

Une clé fausse ne tombe volontairement **pas** en `config` : cette famille affiche « Saisis tes
identifiants », ce qui serait un mensonge — l'utilisateur n'a rien à saisir et aucune prise sur une
clé compilée dans le binaire. La vérité part dans le journal (`[supabase] annonces : … `), où elle
sert quelqu'un qui peut agir.

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

Deux gestes suffisent à retirer une annonce, et ils ne sont pas équivalents : `active = false` la
retire **maintenant**, `expire_le` la fait disparaître d'elle-même à échéance. Les deux sont
appliqués par la politique de lecture, donc une annonce retirée ne sort pas de la base — elle n'est
pas filtrée côté application.

**`expire_le` peut rester vide** : une annonce sans date n'expire jamais. La politique la laisse
passer et l'application l'affiche.

Les visuels vont dans le bucket `media`, sous `annonces/` ou `batiments/`, et l'URL publique se colle
dans `image_url`.

### Des Blueprints

```bash
npm run blueprints:publish              # publier l'etat du depot
npm run blueprints:publish -- --dry-run # montrer le plan, sans rien televerser
```

Le script valide chaque fichier avec le moteur, téléverse ceux dont l'empreinte a changé, met la
table à jour et régénère le manifeste **en dernier**. Rejoué à vide, il ne change rien : c'est ce qui
rend un manifeste périmé visible en une commande. Détail, gardes et retours en arrière :
[blueprints.md](blueprints.md#publier-une-correction).

## Ce qu'il faut savoir avant d'être surpris

- **Le plan gratuit met un projet en pause après une semaine sans requête.** Sans conséquence en
  production ; un projet de préproduction dormant réveillera un jour quelqu'un à tort.
- **Le cache HTTP des plateformes est contourné** par le client de livraison (paramètre d'unicité et
  `Cache-Control: no-cache`). Sans cela, iOS et Android peuvent servir un vieux manifeste pendant une
  durée que personne ne contrôle — c'est-à-dire un interrupteur d'arrêt qui n'arrête rien.
- **Une correction est en production immédiatement.** Il n'y a pas d'étape intermédiaire ; c'est
  l'interrupteur d'arrêt qui joue ce rôle, pas un environnement de recette.
- **`@supabase/supabase-js` embarque Realtime, Storage et Functions**, dont UKit n'utilise
  aucun. C'est le coût assumé de la décision 5 de la phase — deux façons de parler à la même base
  seraient pires qu'une trop grosse.

### Les limites du plan gratuit

Relevées le 2026-08-08 ; elles bougent, et ce tableau vaut d'être revérifié avant de s'en servir pour
décider.

| Limite | Plan gratuit | Notre usage |
|---|---|---|
| Taille de base | 500 Mo | quelques milliers de lignes de texte |
| Stockage de fichiers | 1 Go | les visuels des annonces, quelques centaines de Ko |
| Bande passante sortante | 5 Go/mois (+ 5 Go de cache) | **la seule à surveiller** : elle grandit avec le parc, pas avec le contenu |
| Utilisateurs actifs mensuels | 50 000 | sans objet — aucun compte |
| Projets actifs | 2 | un seul, et c'est aussi pourquoi il n'y a pas de préproduction |

La bande passante est celle qui se rapprochera la première, et le calcul est simple : un visuel
d'annonce de 200 Ko servi à chaque ouverture de l'onglet Campus. Quand on s'en approchera, la réponse
est un cache applicatif des annonces, pas un plan payant.

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
