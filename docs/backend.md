# La base : Supabase

UKit s'appuie sur un projet **Supabase** pour publier ce qu'il publie : les
[Blueprints](blueprints.md), le contenu éditorial, les référentiels et le catalogue des
établissements.

> **État actuel.** Le projet existe, son schéma et ses politiques sont appliqués, ses deux buckets
> sont créés, **les annonces de vie étudiante y sont lues** depuis le jalon
> [6-B](phase-6/6-b-supabase.md), **le bucket de livraison sert les Blueprints et leur manifeste**
> depuis le jalon [6-C](phase-6/6-c-livraison.md), et **le référentiel des bâtiments surcouche le
> fichier embarqué** depuis le jalon [6-D](phase-6/6-d-campus.md), et **le catalogue des
> établissements pilote l'interface** depuis le jalon [6-G](phase-6/6-g-etablissements.md) — c'est
> lui qui porte le second établissement, ajouté sans release —, et **les messages de service sont
> lus, ciblés et journalisés** depuis le jalon [6.1-B](phase-6/6-1-b-pilotage-a-distance.md)
> ([pilotage.md](pilotage.md)). Ce qui est écrit ici avant d'exister est marqué comme tel.

## Ce que la base est, et ce qu'elle n'est pas

**Elle est un point de publication.** Ce qu'elle porte, c'est ce que l'équipe publie : des fichiers
d'instructions, des annonces, des coordonnées de bâtiments, une liste d'universités.

**Elle n'est pas un intermédiaire.** Aucune requête vers une source universitaire ne passe par elle,
aucun identifiant ne la traverse, aucune donnée personnelle n'y est écrite. L'application fonctionne
sans jamais la joindre : chaque chose qu'elle publie a un **socle embarqué** dans le binaire, et la
base ne fait que le mettre à jour.

**Une écriture, depuis [6.1.x-E](phase-6/6-1-x-e-notifications-push.md), et une seule** : le jeton
push d'un appareil, avec ce qu'il faut pour le cibler — campus, version, plateforme, statut de
testeur —, par deux fonctions `security definer` et jamais par la table. Pseudonyme, effacé par
l'interrupteur des Réglages, dit dans [PRIVACY.md](../PRIVACY.md). Tout le reste de cette page
tient : la base ne relaie rien, et l'application vit sans elle.

C'est ce qui permet au [README](../README.md) de continuer à promettre ce qu'il promettait : aucun
compte n'est requis, et rien de ce qui appartient à l'utilisateur ne quitte son appareil. Le moteur
est embarqué précisément pour ça — un moteur hébergé aurait fait sortir toutes les requêtes d'une
seule adresse et fait transiter les identifiants CAS par une machine tierce.

## Le projet et ses clés

Plan **Pro** depuis le 2026-09-14 (gratuit jusque-là), un seul projet en région européenne, pas de
préproduction — une correction publiée est une correction en production. C'est acceptable pour du contenu ; pour les Blueprints, c'est
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
`dotenv` — en silence, `config({ quiet: true })`, depuis la version 17 qui annonce chaque chargement — pour `SENTRY_DSN`. `.env.example` documente les noms ; pour les builds, les variables
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
| `annonces` | contenu éditorial de vie étudiante ; depuis [7-C](phase-7/7-c-economie-et-socle.md#6-les-colonnes-additives) : `type`, `emplacements`, `ajustement`, `focale`, `priorite`, `epinglee`, `creneaux`, `statut`, `blurhash`, `partenaire`, `check (couleur <> 4)`, et la politique de lecture filtre `statut = 'publiee' and publiee_le <= now()` — invisibles pour l'application jusqu'à la 6.3, **écrites par la console depuis [7-F](phase-7/7-f-console-annonces.md)**, qui tient les formes des `jsonb` : `focale` `{ x, y }` en fractions de l'image, le point que le recadrage garde visible — `object-position` en pourcentages, pas un centre ; `creneaux` `[{ jours, de, a }]` avec les jours en ISO (1 = lundi, 7 = dimanche) et les heures `HH:MM` de Paris, début inclus, fin exclue, une plage qui passe minuit acceptée ; `partenaire` `{ nom, logo_url, lien }`, nul quand tout est vide, le logo dans `partenaires/` du bucket à 400 px, exposées par la console en 7-F | [`BdeService`](../src/features/Campus/services/BdeService.ts) | **6-B** | — |
| `batiments` | coordonnées, horaires, accès libre, visuel | [`shared/locations`](../src/shared/locations/index.ts) | **6-D** | [`assets/locations.json`](../assets/locations.json) |
| `visuels` | la photo d'un contenu, quand celle de sa source est fausse ou absente | [`shared/visuels`](../src/shared/visuels/index.ts) | passe de finition | *aucun* — le socle, c'est l'image de la source |
| `etablissements` | catalogue des universités et de leurs portails ; depuis 7-C : `credits`, `campus`, `alias` (portés par la base et `etablissements.sql`, lus en 6.3), et les gabarits `services.formulaire` / `services.formulaire_campus` | l'onboarding et les réglages | **6-G** | les lignes publiées à la date de la release — une copie, vérifiée par un test (6.1-A) |
| `app_release` | version courante et minimale par plateforme, lien de store | rien aujourd'hui | — | — |
| `service_messages` | les messages de service — information, avertissement, incident — et leur ciblage | [`shared/messages`](../src/shared/messages/index.ts) | **6.1-B** | *aucun* — un cache (`messages@1`) |
| `jetons_push` | **écrite par l'application** (6.1.x-E) : un jeton push par appareil, campus, version, plateforme, testeur — par `deposer_jeton` / `retirer_jeton`, jamais par la table | la fonction `notifier` (service), la console (éditeurs) | **6.1.x-E** | — |
| `testeurs` | les appareils qui voient l'audience `testeurs` ; l'application n'en lit que la colonne `id` | [`shared/testeur`](../src/shared/testeur/statut.ts) | **6.1-B** | *aucun* — « non » par défaut |
| `sondes` | l'état de chaque source tierce, mesuré chaque matin | la console ; l'application pas encore | 6.1-B | — |
| `journal` | la trace de chaque écriture dans une table publiable : avant, après, qui, quand | la console seule | 6.1-B | — |
| `editeurs` | les e-mails autorisés à écrire depuis la console ; depuis 7-C : `role` (`admin`, `redacteur`, `lecteur`) et `etablissements`, la donnée seule, les politiques en [7-H](phase-7/7-h-console-roles.md) | les politiques | 6.1-B | — |
| `retours` | ce que les utilisateurs écrivent dans le formulaire, importé toutes les 72 heures depuis la feuille de réponses | la console seule | [6.1.x-C](phase-6/6-1-x-c-retours.md) | — |
| `salutations` | le mot du haut de l'onglet Scolarité, quand une règle publiée doit passer devant le socle embarqué — voir [scolarite.md](features/scolarite.md#la-salutation-est-une-règle-pas-une-condition) |
| `blueprints` | index de livraison : nom, version, chemin, empreinte, moteur minimal, `desactive` | le script de publication | **6-C** | [`blueprints/`](../blueprints/) |

`batiments` est **lue depuis le jalon [6-D](phase-6/6-d-campus.md)**, par
[`shared/locations`](../src/shared/locations/index.ts), et elle est une **surcouche** :
`assets/locations.json` reste le socle, la table le corrige **champ par champ**. Une colonne nulle
n'efface donc jamais une valeur embarquée — c'est ce qui permet de publier une ligne partielle pour
corriger un seul horaire sans risquer de faire disparaître une carte. Un code absent du fichier est en
revanche **ajouté** : contrairement aux Blueprints, un bâtiment n'est pas de la donnée exécutable,
c'est une coordonnée.

Le rafraîchissement suit le même rythme que la livraison des Blueprints — démarrage et retour au
premier plan, jamais dans le chemin d'un rendu — et son résultat est mis en cache local pour que la
dernière correction connue survive au mode hors ligne
([donnees-et-persistance.md](donnees-et-persistance.md)).

`visuels` est la seule table qui ne surcouche pas notre propre donnée : elle surcouche celle des
**autres**. Toutes les images de Campus viennent d'une source tierce — la route de prévisualisation de
Croustillant, la galerie d'Affluences — et jusqu'à cette table, une photo fausse ou absente l'était
pour tout le monde jusqu'au prochain passage en boutique. C'est-à-dire, en pratique, pour toujours.

Elle n'a **aucun socle embarqué**, et c'est la décision qui gouverne tout le reste : *le socle d'un
visuel, c'est l'image que la source publie déjà*. Une table vide, absente ou injoignable laisse donc
l'application exactement dans l'état qui était le sien avant — ce qui la rend intégralement
retirable, et ce qu'un socle de photos embarquées interdirait.

La clé est composée : `(domaine, cle)`. Le domaine est fermé — `crous`, `bibliotheque`, `batiment`,
`annonce` — et porté par un `check`, parce que c'est la seule faute de publication qui serait
autrement **parfaitement silencieuse** : une faute de frappe donne une ligne valide, un visuel
inchangé, et aucun moyen de savoir pourquoi. La clé, elle, est l'identifiant du contenu **chez sa
source** : le code Croustillant d'un restaurant, l'id Affluences d'un site, le code d'un bâtiment,
l'`id` de la ligne `annonces`.

`image_url` porte **trois** états, et les aplatir ferait perdre le seul moyen de retirer une image :

| Ce que la base porte | Ce que l'application fait |
|---|---|
| aucune ligne, ou `null` | rien : la photo de la source est servie, comme avant |
| une URL | elle remplace celle de la source, pour tout le monde |
| la chaîne vide `''` | aucune image : l'écran affiche son visuel de repli embarqué |

C'est la même distinction que celle qui sépare `batiments` d'`etablissements` — là-bas un nul veut
dire « je ne corrige pas ce champ », ici il veut dire la même chose, et c'est le **vide** qui porte
l'effacement. Il fallait un troisième état parce qu'une URL vide n'est pas une URL : dire « cette
photo est fausse, n'en montre aucune » n'a aucune autre façon de s'écrire.

Une lecture qui aboutit **remplace** la surcouche entière plutôt que de la fusionner. C'est ce qui
fait qu'une ligne retirée rend son visuel à la source, sans avoir à publier une correction de la
correction.

La résolution vit dans les **services**, jamais dans les modules de projection, qui restent purs et
couverts par des tests : [`CrousService`](../src/features/Campus/services/CrousService.ts),
[`LibraryService`](../src/features/Campus/services/LibraryService.ts),
[`BdeService`](../src/features/Campus/services/BdeService.ts) et, pour les bâtiments,
[`CampusDataManager.getBuildingList`](../src/features/Campus/services/CampusDataManager.ts). Ce
dernier applique la règle **à la lecture** et non à la reconstruction, ce qui n'est pas un détail : la
liste des bâtiments est mise en cache sept jours, et l'appliquer en amont figerait une photo pour une
semaine — exactement ce que cette table existe pour supprimer.

> **Limite connue, mesurée sur appareil, et arbitrée en 6.1-C.** Un visuel corrigé pendant que
> l'application tourne arrive sur les **écrans de liste**, qui se montent à neuf, mais **pas sur les
> carrousels du tableau de bord Campus**, qui gardent l'état chargé à leur montage : l'onglet ne se
> démonte jamais. La politique est désormais écrite
> ([campus.md](features/campus.md#le-tableau-de-bord)) : les sources tierces ne se rejouent pas au
> retour au premier plan — quatre appels réseau silencieux par bascule d'application seraient un
> arbitrage produit — mais un **tirer-pour-rafraîchir** les relit à la demande, et c'est là qu'un
> visuel corrigé atteint les carrousels. Les annonces, elles, se relisent au retour.

> **Limite connue.** Un visuel de domaine `batiment` est indexé par un code (`A28`), et un code n'a de
> sens que chez l'établissement qui le publie. Deux universités qui partageraient un code
> partageraient la correction. Aucune ligne de ce domaine n'existe aujourd'hui, et le jour où elle
> existera, la clé deviendra `<établissement>/<code>` — pas avant : le mécanisme se juge sur ce qu'il
> corrige, pas sur ce qu'il pourrait avoir à corriger.

`etablissements` est **lue depuis le jalon [6-G](phase-6/6-g-etablissements.md)**, par
[`shared/etablissements`](../src/shared/etablissements/index.ts), et elle **remplace** — à l'inverse
de `batiments`, qui corrige champ par champ. La différence est de sens et il ne faut pas l'aplatir :
là-bas un nul veut dire « je ne corrige pas ce champ » et ne doit donc rien effacer ; ici il veut dire
« ce service n'existe pas » et doit gagner. Sans ça, on ne pourrait jamais **retirer** une messagerie
devenue inextractible. Corollaire : une ligne s'écrit **entière**, et
[`supabase/etablissements.sql`](../supabase/etablissements.sql) est faite pour ça.

Le jalon [6-I](phase-6/6-i-planning-universel.md) lui a ajouté deux colonnes, et toutes deux disent
**ce qui existe**, jamais quoi faire :

| Colonne | Ce qu'elle porte | `null` veut dire |
|---|---|---|
| `edt` | l'emploi du temps par export iCalendar : les deux noms de Blueprint, les paramètres propres à l'année (`projet`), et le référentiel `nom → index de ressource` | cet établissement n'a pas d'export iCalendar |
| `salles` | comment lire un code de bâtiment dans un libellé de salle : les séparateurs, le motif, et le rang de la première ligne où chercher | le comportement historique de Celcat |
| `salles_libres` | le serveur d'inventaire des salles **emprunté** à un autre établissement, quand les étudiants sont sur le même campus | celui de l'établissement fait l'affaire |

Le jalon [6-J](phase-6/6-j-compte-et-sources-par-etablissement.md) en ajoute une, et enrichit `edt`
d'un sous-objet — même règle, toujours **ce qui existe** :

| Colonne | Ce qu'elle porte | `null` veut dire |
|---|---|---|
| `crous_region` | la région CROUS de Croustillant, jusque-là une constante du Blueprint | pas de restaurants : la section disparaît |
| `edt.abonnement` | *cet établissement publie un export iCal à s'abonner*, plus un libellé d'aide facultatif | pas d'abonnement à proposer |
| `salles.reconnaissance: false` | *cet établissement n'a pas de référentiel de lieux* — à distinguer d'une colonne **absente**, qui vaut le comportement bordelais | — |

La session du 2026-08-28 ajoute `portail_widgets`, et celle du 2026-08-29 `portail_documents` — même
règle encore, toujours **ce qui existe** :

| Colonne | Ce qu'elle porte | `null` (ou vide) veut dire |
|---|---|---|
| `portail_widgets` | les Blueprints qui remplissent les **compteurs** de l'onglet Scolarité, indexés par point de service, avec leur péremption facultative | aucun widget rempli ici : les rangées s'affichent quand même et ouvrent leur porte |
| `portail_documents` | le Blueprint qui rapporte le **certificat de scolarité** | on ne sait pas aller le chercher ici — le cas général, et il ne signale rien |

Deux colonnes et non une seule entrée de plus dans `portail_widgets`, parce que ce n'en est pas un :
un widget rend un **compteur** qu'une rangée affiche, `portail_documents` rend un **fichier** qu'on
écrit sur l'appareil. Les mélanger aurait fait passer un document par une machinerie qui ne connaît
que des nombres.

> **Ajouter une colonne, c'est trois gestes, et en oublier un ne casse rien de visible.** La colonne
> dans `schema.sql`, la valeur dans les trois lignes de `etablissements.sql`, **et son nom dans la
> constante `COLONNES`** de [`shared/etablissements/index.ts`](../src/shared/etablissements/index.ts).
> Le troisième a été oublié deux fois : `logo_url` (corrigé le 2026-08-28) et `nom_court` (corrigé le
> 2026-08-29, découvert en ajoutant `portail_documents`). Le symptôme ne ressemble pas à une colonne
> manquante : comme une ligne publiée **remplace**, la valeur ne reste pas à ce qu'elle était — elle
> disparaît. « Collège ST » était redevenu « Collège Sciences et Technologies » partout où la place
> manque, et rien n'échouait. La vérification tient en une requête :
>
> ```sql
> select column_name from information_schema.columns
>  where table_name = 'etablissements' order by ordinal_position;
> ```
>
> comparée à `COLONNES`. À faire à chaque ajout, avant de publier.
>
> **Et la version du cache s'incrémente APRÈS que la base porte la colonne ET ses valeurs — jamais
> entre les deux.** Mesuré le 2026-08-29 sur `portail_documents` : la colonne a été créée (nulle
> partout) quelques minutes avant que la ligne de Bordeaux ne reçoive sa valeur, et un appareil qui a
> rafraîchi dans cette fenêtre a mis en cache un établissement dont le champ vaut `null` — une entrée
> de surcouche **remplace** le socle, donc le socle correct ne reprenait jamais la main. Le symptôme
> ne ressemblait pas à sa cause : « pas de source publiée ici » sur l'établissement qui en publie une.

`edt.abonnement` ne nomme **aucun** Blueprint, et c'est délibéré : le fichier qui le joue est unique,
embarqué, et le même pour tout le monde. Le catalogue dit que l'abonnement existe, le code relu sait
quoi jouer — la ligne de 6-G tenue à la lettre.

C'est aussi ce jalon qui ajoute la ligne **`autre`**, « Mon université n'est pas dans la liste » : elle
n'est pas une université, c'est **l'absence d'université portée, rendue utilisable**. Voir
[`supabase/README.md`](../supabase/README.md).

`edt.params` loge le projet ADE **à côté** du référentiel, et ce n'est pas un rangement arbitraire :
les deux se périment à la même date — la rentrée — et les séparer ferait de chaque rentrée deux
publications au lieu d'une.

Un motif de salle est la seule donnée de cette base que l'application **exécute**. Il est compilé une
fois, mis en cache, appliqué à des chaînes courtes et gardé par un `try/catch` qui retombe sur le
comportement historique ; la vraie limite reste celle de toute la phase, à savoir que l'accès au
projet Supabase est un accès de production.

Le socle embarqué du catalogue ne porte qu'**un** établissement, l'historique. C'est délibéré : le
binaire n'embarque que ce dont il embarque aussi les Blueprints, et un second établissement inscrit
dans le binaire détruirait la preuve que le mécanisme d'ajout fonctionne.

La politique de lecture filtre `actif` **côté serveur** : un établissement retiré disparaît de la
liste sans une ligne de code applicatif. L'appareil de quelqu'un qui l'avait choisi, lui, continue sur
ce qu'il en sait et **le dit** — basculer quelqu'un d'office au milieu de son année serait pire que
le prévenir.

`app_release` est créée vide, et rien ne la lit : il n'existe aucun écran de mise à jour dans
l'application. `service_messages`, créée vide au même jalon pour la même raison, a trouvé son lecteur
au jalon [6.1-B](phase-6/6-1-b-pilotage-a-distance.md) — et quatre colonnes de ciblage avec lui,
partagées avec `annonces` : `audience`, `etablissements`, `version_min`, `version_max` ; une
cinquième, `plateformes`, depuis [6.1.x-D](phase-6/6-1-x-d-calendriers-du-telephone.md). **Le
ciblage se filtre sur l'appareil**, jamais ici : la base ne sait ni quel campus a été choisi, ni
quelle version tourne, ni sur quelle plateforme, ni si l'appareil est un testeur ([pilotage.md](pilotage.md)).

`testeurs` a une particularité de lecture : le rôle public ne voit que sa colonne `id`, par un
privilège de colonne, et l'application compare l'identifiant de son trousseau à cette liste **chez
elle**. Elle ne l'envoie jamais — la requête est la même pour tout le monde, ce qui garde vraie la
phrase de [PRIVACY.md](../PRIVACY.md) sur des requêtes anonymes. Les noms restent privés.

La table `blueprints` n'est **pas lue par l'application** : l'appareil lit `manifest.json` dans le
bucket, et la table n'a d'ailleurs aucune politique de lecture pour `anon`. Elle sert deux choses au
publieur — la trace de ce qui est en ligne, et la colonne `desactive`, qui est la surface d'édition
du premier interrupteur d'arrêt ([blueprints.md](blueprints.md#revenir-en-arrière)).

`retours` est la seule table dont le contenu **vient des utilisateurs** — copié par nous, jamais écrit
par l'application ([PRIVACY.md](../PRIVACY.md), point 5 bis). Sa clé primaire est l'identifiant
stable de la réponse, une empreinte calculée par l'importeur ([pilotage.md](pilotage.md#les-retours)),
et l'écriture se fait en `on conflict do nothing` : le dédoublonnage est une propriété du schéma, et
une ligne reclassée garde son état au passage suivant. Aucune politique de lecture pour `anon`, et la
lecture lui est même **révoquée** — sans ça, RLS lui rendrait une liste vide plutôt qu'un refus. Les
éditeurs la lisent et la modifient par un **privilège de colonne** : `nature`, `etat`, `note`, et
rien d'autre — la réponse reste ce qui a été dit, même par erreur de saisie dans la console.

Deux buckets :

| Bucket | Contenu | Accès |
|---|---|---|
| `blueprints` | les six fichiers d'instructions et `manifest.json` | lecture publique |
| `media` | visuels publiés : annonces (`annonces/`), bâtiments (`batiments/`), établissements (`etablissements/`), contenus (`restaurants/`, `bibliotheques/`) — tous servis avec un **`cache-control` d'un an** depuis [7-A](phase-7/7-a-bande-passante.md) | lecture publique |

**Rien de tout cela ne porte de logique métier.** Pas de fonction qui calcule, pas de vue qui
calcule. Ce qui se calcule se calcule dans l'application, où c'est typé, relu et vérifié. La base
porte de la donnée — et, depuis le jalon 6.1-B, **deux gardes** qui ne calculent rien pour l'écran :
`private.est_editeur()`, qui dit qui a le droit d'écrire, et le déclencheur `journal`, qui trace ce qui
a été écrit ([`supabase/fonctions.sql`](../supabase/fonctions.sql)). Les deux vivent dans un schéma
que l'API n'expose pas, s'exécutent avec les droits de leur propriétaire (`security definer`, chemin
de recherche vide, noms qualifiés — les trois précautions que la documentation de Supabase impose), et
sont des politiques d'accès exprimées en SQL. Une troisième fonction qui calculerait quelque chose pour
l'écran serait la première entorse, et elle se refuse.

## Les politiques d'accès

Source : [`supabase/policies.sql`](../supabase/policies.sql).

RLS est activé sur **toutes** les tables, y compris celles qui n'ont rien de sensible : une table
sans politique est une table qu'on oubliera de protéger le jour où elle en aura besoin.

- **Lecture publique** pour le rôle `anon`, restreinte aux lignes publiées. Une annonce inactive ou
  expirée ne sort pas de la base — elle n'est pas filtrée côté application. Le filtre applicatif
  existe quand même, pour la donnée qui vient du cache local.
- **Aucune écriture** pour `anon`. Sans exception — ni par politique, ni par privilège : les grants
  d'écriture lui sont révoqués sur tout le schéma, parce qu'une politique s'oublie ouverte là où un
  privilège révoqué ne se rouvre pas par accident.
- **Écriture par `service_role`** : le script de publication et les sondes, avec la clé secrète.
- **Écriture par un compte authentifié dont l'e-mail figure dans `editeurs`** — la console web, depuis
  le jalon [6.1-B](phase-6/6-1-b-pilotage-a-distance.md). Un compte se connecte avec Supabase Auth ;
  chaque politique d'écriture demande `private.est_editeur()`. Un compte sans ligne dans `editeurs`
  se connecte et ne peut rien écrire. `blueprints` n'a pas de politique d'écriture : les Blueprints
  restent au script, qui les valide avec le moteur ([blueprints.md](blueprints.md)). Les inscriptions
  libres sont désactivées dans les réglages du projet, et le compte se crée depuis le poste du
  publieur ([`supabase/README.md`](../supabase/README.md)).
- **Lecture et reclassement des retours par les éditeurs**, bornés à trois colonnes par un privilège
  de colonne ; ni création ni suppression depuis la console, les lignes sont importées
  ([pilotage.md](pilotage.md#les-retours)).

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

Annonces, messages de service, testeurs, visuels, établissements, salutations, bâtiments : depuis la
**console web** du jalon 6.1-B ([pilotage.md](pilotage.md)), ou depuis le Studio Supabase, qui passe
par les mêmes politiques et les mêmes déclencheurs. Une annonce se désactive par un booléen, sans
release et sans commit — c'était déjà vrai avec le dépôt `ukit-data`, ça reste vrai, avec en plus
une date, un auteur et une trace dans le journal.

Deux gestes suffisent à retirer une annonce, et ils ne sont pas équivalents : `active = false` la
retire **maintenant**, `expire_le` la fait disparaître d'elle-même à échéance. Les deux sont
appliqués par la politique de lecture, donc une annonce retirée ne sort pas de la base — elle n'est
pas filtrée côté application.

**`expire_le` peut rester vide** : une annonce sans date n'expire jamais. La politique la laisse
passer et l'application l'affiche.

Les visuels vont dans le bucket `media`, sous `annonces/`, `batiments/`, `etablissements/`,
`restaurants/` ou `bibliotheques/`, et l'URL publique se colle dans `image_url`.

**Un visuel posé à la main porte un `cache-control` d'un an** (`max-age=31536000`) — sans quoi il
recrée le gaspillage que [7-A](phase-7/7-a-bande-passante.md) a corrigé. La console le fait
d'elle-même, et compresse l'image au passage ; depuis le Studio, c'est un champ à remplir. Le
ré-encodage d'un objet existant se rejoue par `npm run media:compresser`
([`tools/media/`](../tools/media/)), qui ne touche que ce qui ne porte pas déjà l'en-tête.

**Remplacer la photo d'un contenu servi par une source tierce** — un restaurant, une bibliothèque, un
bâtiment, une annonce — se fait par la table `visuels`, une ligne par contenu :

```sql
-- Remplacer la photo du Resto U de l'Amazone (code Croustillant 21).
insert into public.visuels (domaine, cle, image_url)
values ('crous', '21', 'https://<projet>.supabase.co/storage/v1/object/public/media/restaurants/amazone.jpg')
on conflict (domaine, cle) do update set image_url = excluded.image_url, maj_le = now();

-- Retirer une photo fausse sans en fournir d'autre : l'ecran reprend son visuel embarque.
insert into public.visuels (domaine, cle, image_url) values ('crous', '21', '')
on conflict (domaine, cle) do update set image_url = '', maj_le = now();

-- Rendre son visuel a la source.
delete from public.visuels where domaine = 'crous' and cle = '21';
```

La clé est celle du contenu **chez sa source**. Un restaurant la porte dans l'URL de son image
actuelle (`.../restaurants/21/preview`), un bâtiment est son code (`A28`), une annonce est l'`id` de
sa ligne. Une bibliothèque fait exception et c'est le seul cas qui demande une commande : son
identifiant Affluences est un UUID que **rien dans l'application n'affiche**, et son image porte un
hachage sans rapport avec lui — [`supabase/README.md`](../supabase/README.md#publier-un-visuel) donne
la requête qui les liste.

Le changement arrive sur les appareils au **prochain retour au premier plan**, comme les Blueprints
et le référentiel des lieux. Aucune release, aucun redémarrage.

### Les visuels et leur rendu

La base ne stocke que des adresses d'**origine** — `/storage/v1/object/public/…` dans `annonces.image_url`,
`annonces.images`, `visuels.image_url`, `batiments.image_url`, `etablissements.logo_url` — et c'est
l'application qui les transforme au moment d'afficher, par les **transformations d'image** du plan Pro
(`/storage/v1/render/image/public/…?width=&quality=`, [`rendu.ts`](../src/shared/visuels/rendu.ts)) :
la largeur affichée arrondie à un palier (320, 480, 640, 960, 1280, 1600, 2000), une qualité par
surface, `resize=contain` — sans lui le service recadre à la hauteur d'origine, un logo de 1280 × 448
demandé en 480 revenait en 480 × 448, coupé des deux côtés —, la requête `?v=N` conservée. Publier une adresse de rendu dans la base figerait une largeur
dans la donnée, et les versions antérieures à la 6.2.2 ne sauraient qu'en faire. Si le rendu échoue,
l'application rejoue l'adresse d'origine, puis son repli. Mesuré le 2026-09-21 : la photo du Resto U
de l'Amazone, 156 668 octets à l'origine, sort à **52 359 octets** en 640 px qualité 70 (640 × 361),
en cache un an et `HIT` au second appel. Les transformations se facturent au-delà de cent images d'origine par mois ;
les paliers servent le taux de HIT du CDN et la vitesse.

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
  production ; un projet de préproduction dormant réveillera un jour quelqu'un à tort. Le plan Pro, en
  place depuis le 2026-09-14, ne met pas le projet de production en pause ; la remarque vaut pour tout
  projet gratuit à côté de lui.
- **Le cache HTTP des plateformes est contourné** par le client de livraison (paramètre d'unicité et
  `Cache-Control: no-cache`). Sans cela, iOS et Android peuvent servir un vieux manifeste pendant une
  durée que personne ne contrôle — c'est-à-dire un interrupteur d'arrêt qui n'arrête rien.
- **Une correction est en production immédiatement.** Il n'y a pas d'étape intermédiaire ; c'est
  l'interrupteur d'arrêt qui joue ce rôle, pas un environnement de recette.
- **Trois adresses du bucket vivent dans le binaire**, et pas seulement en base :
  [`assets/locations.json`](../assets/locations.json) porte celle du CRÉMI,
  [`socle.ts`](../src/shared/etablissements/socle.ts) celles des deux logos. Le parc installé les
  demande **sans `?v=N`** et ne peut pas recevoir une adresse bumpée. Conséquence, depuis que ces
  objets portent un cache d'un an ([7-A](phase-7/7-a-bande-passante.md)) : **on ne les remplace plus
  en place.** Le jour où l'un d'eux doit changer, il se publie sous un **nouveau nom** et la
  **surcouche en base** — `batiments.image_url`, `etablissements.logo_url` — porte la nouvelle
  adresse, qui gagne sur le socle embarqué.
- **La connexion directe à la base est en IPv6 seule**, et le CLI ne trouve plus le projet lié de
  septembre (`LegacyProjectNotLinkedError`) : depuis un poste sans IPv6, `psql` passe par le *session
  pooler* de la région du projet, **`aws-0-eu-west-2.pooler.supabase.com`**, utilisateur
  `postgres.<référence>` (mesuré le 2026-09-16), et les commandes de migration du CLI prennent
  `--project-ref <référence>` plutôt que `--linked` ([`supabase/README.md`](../supabase/README.md#migrations)).
- **La purge du CDN prend environ une minute.** Mesuré le 2026-09-16 : juste après un téléversement,
  une adresse nue peut encore servir l'ancien objet avec l'ancien en-tête. L'adresse versionnée est
  une autre clé de cache et rend le nouvel objet tout de suite. Ne pas conclure d'un premier `curl`.
- **`@supabase/supabase-js` embarque Realtime, Storage et Functions** ; l'application n'en utilise
  aucun, la console appelle une Function depuis 6.1.x-E. C'est le coût assumé de la décision 5 de la
  phase — deux façons de parler à la même base seraient pires qu'une trop grosse.
- **Le client de l'application n'est pas typé par `Database`**, mesuré le 2026-09-08 : le schéma de
  [`types.ts`](../src/shared/supabase/types.ts) ne satisfait pas la contrainte `GenericSchema` de
  supabase-js 2.109 — ses lignes sont des `interface`, sans signature d'index —, et `Schema` y
  résout à `never` : `from` accepte n'importe quelle chaîne, `rpc` refuse tout. Les types restent
  vrais comme **documentation**, et le dépôt du jeton push passe par un adaptateur typé par `Args`.
  Typer le client entier ferait remonter les projections de `select` et se traite à part.

### Les limites du plan

> **Le projet est en Pro depuis le 2026-09-14.** Le passage a suivi l'avertissement *Fair Use* de
> Supabase et une mesure : l'egress en cache avait atteint **10,041 Go** pour un quota de 5
> ([7-A](phase-7/7-a-bande-passante.md#ce-qui-a-été-mesuré-le-2026-09-14)). Le tableau d'origine,
> relevé le 2026-08-08 sur le plan gratuit, est gardé plus bas : la décision qu'il portait s'est révélée
> fausse, et l'erreur mérite de rester lisible.

Relevées le 2026-09-14 sur la page tarifaire de Supabase ; elles bougent, et ce tableau vaut d'être
revérifié avant de s'en servir pour décider.

| Limite | Pro | Au-delà |
|---|---|---|
| Egress | 250 Go par mois | 0,09 $ le Go |
| Egress en cache, servi par le CDN | 250 Go par mois | 0,03 $ le Go |
| Stockage de fichiers | 100 Go | 0,0213 $ le Go |
| Transformations d'image | 100 images d'origine par mois | 5 $ les 1 000 |
| Sauvegardes | quotidiennes, gardées 7 jours | — |
| Mise en pause | jamais | — |
| Prix | à partir de 25 $ par mois, 10 $ de crédits de calcul inclus | — |

**La phrase de décision d'origine était fausse.** Elle disait : « La bande passante est celle qui se
rapprochera la première, et le calcul est simple : un visuel d'annonce de 200 Ko servi à chaque
ouverture de l'onglet Campus. Quand on s'en approchera, la réponse est un cache applicatif des annonces,
pas un plan payant. » Le diagnostic était juste — c'est bien la bande passante, et bien les images —, la
réponse ne l'était pas, pour deux raisons mesurées :

- **ce ne sont pas les annonces qui pesaient, ce sont toutes les images**, photos de restaurants
  comprises, servies en `no-cache` et affichées par un composant sans cache disque ; un cache des seules
  annonces n'aurait rien changé à l'essentiel ;
- **le plan gratuit n'avait aucune sauvegarde**, et la base porte désormais ce qu'on ne sait pas
  reconstruire : le catalogue publié, le journal, les retours des utilisateurs.

Le Pro est donc pris, **et** le gaspillage se corrige quand même, par
[7-A](phase-7/7-a-bande-passante.md) et [7-C](phase-7/7-c-economie-et-socle.md) : les objets re-encodés
et servis avec un cache d'un an, et côté application `expo-image` et les URL de rendu. Le forfait des
étudiants et la vitesse ne dépendent pas du quota.

Le tableau d'origine, relevé le 2026-08-08 :

| Limite | Plan gratuit | Notre usage d'alors |
|---|---|---|
| Taille de base | 500 Mo | quelques milliers de lignes de texte |
| Stockage de fichiers | 1 Go | les visuels des annonces, quelques centaines de Ko |
| Bande passante sortante | 5 Go/mois (+ 5 Go de cache) | **la seule à surveiller** : elle grandit avec le parc, pas avec le contenu |
| Utilisateurs actifs mensuels | 50 000 | sans objet — aucun compte |
| Projets actifs | 2 | un seul, et c'est aussi pourquoi il n'y a pas de préproduction |

## Ce qui est prévu, et pas encore appliqué

> **Prévu le 2026-09-14.** Le modèle de données qu'entraînent les décisions de la
> [phase 7](phase-7/README.md), tenu en un seul endroit pour que les jalons qui les appliquent n'en
> écrivent pas plusieurs versions. Chaque ligne rejoint le tableau du schéma, plus haut, le jour où
> son jalon l'applique — et sort d'ici : les colonnes d'`annonces`, d'`editeurs` et d'`etablissements`
> sont en base depuis [7-C](phase-7/7-c-economie-et-socle.md#6-les-colonnes-additives), le 2026-09-17.

Tout est **additif** et s'applique par **migrations numérotées**
([7-C](phase-7/7-c-economie-et-socle.md#5-le-socle-du-dépôt)) : aucune colonne ne se retire avant
que le parc ait migré.

| Table | Colonnes et objets | Jalon |
|---|---|---|
| `annonces` | `notifiee_le` et `notifies` | [7-L](phase-7/7-l-la-boucle.md) |
| `editeurs` | `private.peut_publier(etabs)` et les politiques qui lisent `role` et `etablissements` (la donnée est en base depuis 7-C) | [7-H](phase-7/7-h-console-roles.md) |
| `etablissements` | ce qui **lit** `credits`, `campus` et `alias` — `COLONNES`, `types.ts`, `catalogue.ts`, `socle.ts` et la version du cache —, une fois que la base porte colonne **et** valeurs (elles y sont depuis 7-C) | [7-I](phase-7/7-i-releve-et-vocabulaire.md) |
| `evenements_connus`, `mesures` | les compteurs anonymes et leur vocabulaire fermé ; RPC `compter(lots jsonb)` ; pas de journal ; purge à treize mois ([mesure.md](mesure.md)) | [7-D](phase-7/7-d-la-mesure.md) |
| `jetons_push` | `annonces boolean` (défaut faux) : l'accord pour les annonces en notification | [7-L](phase-7/7-l-la-boucle.md) |
| `retours` | `source` (`formulaire` ou `app` ; défaut `formulaire`), `installation` (nul sauf accord) ; RPC `deposer_retour` | [7-L](phase-7/7-l-la-boucle.md) |
| `soutien` | `(campus, jour, montant, repas)`, agrégée, lecture publique | [7-N](phase-7/7-n-le-soutien.md) |
| bucket `media` | *fait le 2026-09-22 par [7-E](phase-7/7-e-console-socle.md)* : ce que la console téléverse se nomme `<dossier>/<identifiant court>-<slug>.webp`, avec un cache d'un an et son blurhash dans `annonces.blurhash` ; `?v=N` reste la règle de remplacement de ce qui est posé à la main ([`tools/media/versionner.mjs`](../tools/media/versionner.mjs)), et les objets déjà en ligne gardent leur nom | — |

## Migrations

Depuis [7-C](phase-7/7-c-economie-et-socle.md#5-le-socle-du-dépôt), le schéma évolue par les
**migrations numérotées** du CLI de Supabase, dans [`supabase/migrations/`](../supabase/migrations/) :
c'est le registre de ce que la production porte, et la base le prouve par sa table d'historique. La
ligne de base (`20260914000000_ligne_de_base.sql`, la concaténation de `schema.sql`, `fonctions.sql` et
`policies.sql`) a été **marquée appliquée sans être jouée** ; les trois fichiers restent la **vue
lisible** de l'état, mise à jour dans le même commit que chaque migration, et `etablissements.sql`
reste un fichier de **donnée**, rejoué par `psql` après la migration qui crée ses colonnes. La
procédure et ses pièges sont dans [`supabase/README.md`](../supabase/README.md#migrations).

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
