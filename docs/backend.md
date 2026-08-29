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
> lui qui porte le second établissement, ajouté sans release. Ce qui est écrit ici avant d'exister
> est marqué comme tel.

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
| `batiments` | coordonnées, horaires, accès libre, visuel | [`shared/locations`](../src/shared/locations/index.ts) | **6-D** | [`assets/locations.json`](../assets/locations.json) |
| `visuels` | la photo d'un contenu, quand celle de sa source est fausse ou absente | [`shared/visuels`](../src/shared/visuels/index.ts) | passe de finition | *aucun* — le socle, c'est l'image de la source |
| `etablissements` | catalogue des universités et de leurs portails | l'onboarding et les réglages | **6-G** | l'établissement historique |
| `app_release` | version courante et minimale par plateforme, lien de store | rien aujourd'hui | — | — |
| `service_messages` | bandeau de service : maintenance, incident | rien aujourd'hui | — | — |
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

> **Limite connue, mesurée sur appareil.** Un visuel corrigé pendant que l'application tourne arrive
> sur les **écrans de liste**, qui se montent à neuf, mais **pas sur les carrousels du tableau de bord
> Campus**, qui gardent l'état chargé à leur montage : l'onglet ne se démonte jamais et leur effet ne
> se rejoue que sur un changement de position ou un nouvel essai
> ([`useCrousRestaurants.ts`](../src/features/Campus/hooks/useCrousRestaurants.ts)). La correction y
> apparaît au lancement suivant. La cause est antérieure aux visuels — c'est celle qui a produit le
> défaut du filtre corrigé pendant la passe de finition — et la corriger demande de décider de la
> politique de rafraîchissement du tableau de bord entier, pas d'une photo : rejouer quatre appels
> réseau à chaque retour au premier plan est un arbitrage produit, qui appartient à la session
> d'écran du tableau de bord.

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
| `media` | visuels publiés : annonces (`annonces/`), bâtiments (`batiments/`), contenus (`restaurants/`, `bibliotheques/`) | lecture publique |

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

Les visuels vont dans le bucket `media`, sous `annonces/`, `batiments/`, `restaurants/` ou
`bibliotheques/`, et l'URL publique se colle dans `image_url`.

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
