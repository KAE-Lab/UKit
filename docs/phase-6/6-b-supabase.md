# 6-B — La base Supabase

> Donner à UKit le dos qui lui manquait : un point de publication pour les Blueprints, le contenu
> éditorial, le référentiel des lieux et le catalogue des établissements. Mince par construction.

> **Jalon livré.** Ce document a été amendé à la livraison : ce qui suit décrit ce qui est en place,
> et les endroits où la réalité a corrigé la spécification sont signalés par « Corrigé à la
> livraison ».

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

> **Corrigé à la livraison — les buckets se créent en SQL.** La spécification les laissait à la
> console (« les deux se créent depuis la console ou la CLI »), ce qui contredisait la règle du même
> fichier : *tout s'applique depuis les fichiers, jamais depuis l'interface web*. Un
> `insert into storage.buckets … on conflict do update` fait le travail et se relit en revue.
>
> Dans la foulée, `policies.sql` a gagné un `drop policy if exists` devant chaque `create policy` :
> Postgres n'a pas de `create policy if not exists`, et un fichier qu'on ne peut appliquer qu'une
> seule fois n'est pas reproductible — c'est exactement ce que ce dossier existe pour éviter. Les
> deux fichiers ont été rejoués pour le vérifier.

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

> **Corrigé à la livraison — le client est paresseux, et gardé.** « Instancié au niveau module »
> aurait mis la base sur le chemin de démarrage de l'application, ce que ce jalon promet exactement
> de ne pas faire. Il est donc construit au premier usage, comme la façade du moteur.
>
> Et une mesure valait mieux qu'une supposition : `createClient` construit un client **Realtime** au
> passage, et celui-ci **lève** si l'hôte ne fournit pas de `WebSocket` — constaté sous Node 20,
> alors que rien dans UKit n'utilise Realtime. React Native en fournit un, donc le cas ne se produit
> pas sur appareil ; la construction est tout de même enveloppée, parce qu'une exception sur le
> chemin de démarrage donnerait un écran blanc là où le comportement attendu est de continuer sans
> la base. Le repli est celui qui existait déjà : `null`, donc le socle embarqué.
>
> Deux autres écarts, plus petits. Les types du schéma restent **écrits à la main** plutôt que
> générés par la CLI Supabase : six tables que nous écrivons nous-mêmes, dans le même dépôt, relues
> dans le même commit que le schéma, ne justifient pas une dépendance permanente — la commande de
> vérification ponctuelle est notée dans [`supabase/README.md`](../../supabase/README.md). Et le type
> racine `Database` déclare `Insert` et `Update` à `never` : la frontière des politiques, exprimée au
> compilateur, de sorte qu'un `insert` depuis l'application ne compile pas.
>
> **Aucun polyfill d'URL n'a été nécessaire.** Expo SDK 54 fournit `URL` par son runtime « winter »
> (`node_modules/expo/src/winter/url.ts`), et `react-native-url-polyfill` n'a pas lieu d'être.
> Vérifié comme au jalon 6-A : sur un bundle réel (`npx expo export --platform android`), où l'on
> retrouve le code du client, le nom de la table et la liste des colonnes, puis sur appareil.

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

> **Corrigé à la livraison — le repli jsDelivr part maintenant, pas en 6-Z, et l'écran change.**
> Les « limites écrites » du jalon 6-A annonçaient le retrait du repli en 6-Z. Le garder ici aurait
> eu deux conséquences : servir du contenu d'un dépôt qu'on cesse d'écrire, et surtout **masquer
> toute panne** — ce qui rendait injouable la sonde « base injoignable → écran de repli, pas une
> liste vide » du plan de test ci-dessous. Le repli est donc retiré avec la bascule, en même temps
> que le cas de parité, et la source des annonces est migrée pour de bon.
>
> Conséquence assumée : `fetchAnnonces` **change de signature** et rend une union
> `{ ok: true, annonces } | { ok: false, failure }`, calquée sur `BlueprintRun`. La règle du jalon
> 6-A subordonnait l'immobilité de la signature à celle de l'écran ; ici l'écran est adapté dans le
> même changement, donc la condition tombe. C'est le **premier écran branché sur le modèle
> d'erreur** livré en 6-A, et il sert de gabarit aux jalons suivants.
>
> Une conséquence de plus, celle-là non prévue : le carrousel du tableau de bord et la liste
> complète portaient la même machinerie de chargement. Elle est sortie dans un hook,
> [`useBdeAnnonces`](../../src/features/Campus/hooks/useBdeAnnonces.ts), plutôt que d'être écrite
> deux fois.

> **Corrigé à la livraison — une annonce sans expiration disparaissait.** `expire_le` est nullable
> et la politique de lecture laisse passer `expire_le is null`, mais le filtre applicatif comparait
> `new Date('')`, toujours faux : la base aurait publié une annonce que l'écran aurait masquée. Le
> défaut est antérieur au jalon et n'avait jamais pu se manifester, le fichier jsDelivr portant
> toujours une date. Corrigé, et verrouillé par un test — une date *illisible*, en revanche, écarte
> toujours l'annonce.

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

1. **fait** — le projet existe (plan gratuit, région européenne) ; le schéma, les politiques et les
   deux buckets sont appliqués depuis les fichiers du dépôt avec `psql`, et les deux fichiers ont
   été rejoués pour prouver qu'ils sont reproductibles. Procédure :
   [`supabase/README.md`](../../supabase/README.md).
2. **fait** — les clés sont dans l'environnement, `.env.example` documente les quatre noms (dont les
   deux qui ne vont jamais dans l'application), et les variables EAS sont posées sur les trois
   environnements (`production`, `preview`, `development`) en visibilité **plaintext** : la clé
   publiable est publique par conception, et la ranger en secret contredirait ce que ce document
   affirme. Procédure : [`supabase/README.md`](../../supabase/README.md).
3. **fait** — les 2 annonces, les 3 visuels et les 73 bâtiments sont en base, par
   [`tools/import-ukit-data.mjs`](../../tools/import-ukit-data.mjs), gardé pour mémoire. Les
   `image_url` des annonces pointent vers le bucket `media`.
4. **fait** — `BdeService` lit la base. L'écran nominal est identique, expiration comprise ; le
   chemin dégradé, lui, change délibérément (voir « Corrigé à la livraison » plus haut).
5. **fait, joué** — `POST /rest/v1/annonces` avec la clé publiable rend
   `42501 : new row violates row-level security policy`, en `curl` et via la bibliothèque.
6. **fait** — base de référence intacte : 3 erreurs `tsc` héritées, 11 warnings `eslint` hérités.
   `npm test` vert (40 tests), `npm run parity` vert et vide.
7. **fait** — documentation.

## Plan de test

**Sous Node et depuis le poste**, avant l'appareil :

```bash
npx tsc --noEmit && npx eslint .   # base de reference intacte
npm test                            # projection, peremption, tables d'erreurs
npm run parity                      # vert et vide
npx expo export --platform android  # supabase-js resolu par Metro, sur un bundle reel
```

**Sur appareil**, le nominal puis les chemins dégradés, qui doivent produire des écrans
**différents**.

| Sonde | Comment | Attendu | État |
|---|---|---|---|
| Nominal | onglet Campus | les mêmes annonces qu'avant la bascule, visuels servis par Storage | **joué sur appareil** |
| Fiche complète | ouvrir une annonce | visuel, émetteur, étiquette, **description longue**, bouton d'action | **joué sur appareil** |
| Fiche sans action | ouvrir une annonce dont les `cta` sont vides | fiche correcte, bouton simplement absent | **joué sur appareil** |
| Annonce désactivée | `active = false` en base | disparaît au rechargement, sans release | **joué sur appareil** |
| Annonce expirée | reculer `expire_le` | absente **de la réponse**, pas seulement de l'écran | **joué sur appareil** |
| Annonce sans échéance | `expire_le = null` | **visible** — le correctif de `estValide` | **joué sur appareil** |
| Rien à publier | toutes les annonces à `active = false` | section absente, **aucun** message d'erreur | **joué sur appareil** |
| Base injoignable | `SUPABASE_URL` sur un hôte `.invalid` | « Service indisponible » + Réessayer, autres onglets normaux | **joué sur appareil** |
| Sans base du tout | vider les deux variables | l'application démarre et s'utilise **entièrement** | **joué sur appareil** |
| Clé fausse | altérer `SUPABASE_ANON_KEY` | famille `unavailable` | **joué depuis le poste** (voir plus bas) |
| Table absente | interroger une table qui n'existe pas | famille `rejected`, pas de bouton Réessayer | **joué depuis le poste** |
| Écriture avec la clé publiable | `curl` et bibliothèque | refusée — `42501` | **joué depuis le poste** |

Les trois dernières se jouent depuis le poste plutôt que sur appareil, et c'est un choix : elles
vérifient un **classement de famille**, pas un rendu. « Clé fausse » produit exactement l'écran de
« base injoignable » — la faire rejouer sur appareil aurait coûté un redémarrage complet pour
reproduire un écran déjà vu. Les trois sont mesurées avec la vraie bibliothèque contre le vrai projet.

> **Corrigé à la livraison — trois sondes fusionnées en une.** « Annonce désactivée », « annonce
> expirée » et « annonce sans échéance » demandaient trois allers-retours avec l'appareil pour deux
> écrans identiques. Elles ont été jouées **en une seule recharge**, en montant un état où chaque cas
> a une issue distincte et lisible : deux annonces de sonde ajoutées en base, l'une expirée (doit
> être absente), l'autre sans échéance (doit être visible, et première dans le tri). La réponse REST
> brute a été relevée en parallèle — elle ne portait que les deux lignes attendues, ce qui prouve que
> l'écart vient bien de la **politique**, pas d'un filtre applicatif.

Deux lignes portent le jalon. « Sans base du tout » vérifie sa promesse : la base est un point de
publication, pas un intermédiaire — si l'application ne démarre pas sans elle, le jalon est raté. Et
le **contraste** entre « base injoignable » et « rien à publier » vérifie l'autre moitié : les deux
produisaient le même écran vide avant cette phase, et ils doivent maintenant se distinguer à l'œil.

> **Corrigé à la livraison — un défaut d'interface trouvé par la capture.** Le bouton Réessayer
> portait son libellé et son icône en `theme.accentFont`, pris pour « texte sur fond accent ». C'est
> en réalité le **rouge destructif** des messages d'erreur (`#FF3B30` / `#FF453A`, utilisé par
> `ScolariteLoginView`) : à l'écran, orange sur le violet du bouton. Corrigé en `theme.lightFont`,
> le seul token blanc des deux thèmes — jusque-là défini mais utilisé nulle part, ce qui explique
> qu'il ait été manqué. Repéré sur la capture de la sonde, pas à la relecture.

> **Corrigé à la livraison — le mode avion n'est pas la bonne sonde**, et la leçon est celle du
> jalon 6-A : couper la connexion d'un appareil de développement casse aussi Metro. Pointer
> `SUPABASE_URL` sur le TLD réservé `.invalid` (RFC 2606, ne résout sur aucun réseau) produit la
> même famille sans toucher à la connectivité. Après toute bascule de `.env`, redémarrer avec
> `npx expo start -c` : `app.config.ts` lit l'environnement au moment de la configuration, pas à
> l'exécution.

## Limites écrites

- **Le plan gratuit a des limites de taille et de bande passante.** Elles sont larges pour notre
  usage (du texte et quelques visuels), mais elles existent : les chiffres du jour sont notés dans
  [backend.md](../backend.md), avec ce qu'on fera si on s'en approche. La bande passante est la seule
  à surveiller — elle grandit avec le parc, pas avec le contenu.
- **Il n'y a pas de préproduction.** Un seul projet, et donc une correction publiée est une
  correction en production. C'est acceptable pour du contenu ; ça ne le sera plus pour les Blueprints,
  d'où l'interrupteur d'arrêt du jalon [6-C](6-c-livraison.md).
- **Aucune donnée utilisateur n'est en base**, et rien dans ce jalon ne prépare l'inverse au-delà de
  politiques qui ne gênent pas. La partie sociale reste une phase à part entière.
- **Aucun cache d'annonces.** Le texte ci-dessus mentionne le filtre applicatif « quand la donnée
  vient du cache local » : ce cache n'existe pas, et ce jalon ne l'introduit pas. Le filtre est
  conservé parce qu'il sera juste le jour où il existera, et parce qu'il est ce qui permettra
  d'afficher une annonce expirée en grisé plutôt que masquée. Conséquence : hors ligne, la section
  est vide — mais elle dit désormais **pourquoi**.
- **`batiments` est peuplée et lue par personne.** L'application lit toujours le fichier embarqué ;
  la surcouche est branchée en [6-D](6-d-campus.md), avec l'écran qui la montre.
- **`app_release` et `service_messages` sont créées vides.** Le tableau de périmètre de la phase
  range « version applicative et messages de service » en 6-B ; la définition de « terminé » de ce
  jalon ne cite que `BdeService`, et c'est elle qui a tranché. Aucun `UpdateAlert` n'existe dans le
  code — le mécanisme de version est mort depuis longtemps — et les brancher demande deux capacités
  d'interface entières. Les tables existent pour que ce jalon-là n'ait pas de migration à faire.
- **`@supabase/supabase-js` embarque Realtime, Storage et Functions**, dont aucun n'est utilisé.
  C'est le coût de la décision 5 de la phase, assumé : deux façons de parler à la même base seraient
  pires qu'une bibliothèque trop grosse.
