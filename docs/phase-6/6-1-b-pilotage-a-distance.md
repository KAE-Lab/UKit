# 6.1-B — Pilotage à distance : messages, audiences, console, sondes

> **Jalon livré le 2026-09-03** — code, tests et documentation, en trois lots vérifiés l'un après
> l'autre : le schéma et l'application (B1, les neuf étapes du protocole jouées sur iPhone réel), la
> console (B2, politiques vérifiées avec un compte jetable, puis le compte du propriétaire créé et une
> écriture journalisée depuis la console en local), les sondes (B3, six sondes en `ok` en local et une
> adresse faussée en panne ; le premier run sur GitHub et l'issue de test suivent la fusion). Les écarts entre ce texte et ce
> qui a été livré sont dans [Écarts constatés](#écarts-constatés), en bas : le texte au-dessus reste
> tel qu'il a été écrit.
>
> **Le jalon qui évite la prochaine panne — ou la rend visible le matin même.** Il donne au
> propriétaire du produit ce que la soirée de release a montré qu'il lui manquait : parler aux
> utilisateurs sans release, publier sans requête SQL, et savoir avant eux qu'une source a changé.
> Références P1…P6 de la [mise à plat](6-1-mise-a-plat.md).

## La direction

La v6 a rendu le comportement **corrigeable** à distance ; ce jalon le rend **pilotable**. Trois
capacités, une seule architecture : la base Supabase reste la source, les politiques RLS restent la
frontière de sécurité, et tout ce qui écrit passe par un compte authentifié dont chaque geste est
journalisé en base.

## Ce qui est livré

### Le schéma

```sql
-- service_messages : le consommateur existe enfin, et le ciblage avec lui
alter table service_messages add column cle           text unique not null;   -- memoire « vu »
alter table service_messages add column audience      text not null default 'tous'
    check (audience in ('tous', 'testeurs'));
alter table service_messages add column etablissements text[];                 -- null = tous
alter table service_messages add column version_min   text;                    -- semver inclusif
alter table service_messages add column version_max   text;

-- annonces : le meme ciblage
alter table annonces add column audience       text not null default 'tous' check (...);
alter table annonces add column etablissements text[];
alter table annonces add column version_min    text;
alter table annonces add column version_max    text;

create table testeurs (id text primary key, nom text not null, cree_le timestamptz default now());
create table sondes   (source text primary key, etat text not null, detail jsonb,
                       mesure_le timestamptz not null, change_le timestamptz not null);
create table journal  (id bigserial primary key, table_name text, operation text, ligne_id text,
                       avant jsonb, apres jsonb, par text, quand timestamptz default now());
```

Le **journal est écrit par des triggers Postgres** sur chaque table publiable (annonces,
service_messages, etablissements, visuels, salutations, batiments, testeurs) : avant, après, qui
(`auth.email()`), quand. Il ne peut pas être contourné par la console, ni par un script, ni par le
Studio. Il s'exporte en un fichier JSON depuis la console — c'est le fichier à remettre quand
quelque chose a mal tourné.

**Les politiques** : lecture anonyme sur ce que l'application lit (messages, annonces, testeurs,
sondes) ; écriture réservée à l'utilisateur authentifié dont l'e-mail figure dans une table
`editeurs` (une ligne : le propriétaire). Ni le Studio ni la console ne changent cette règle.

### L'audience « testeurs »

L'application génère à sa première ouverture un **identifiant d'installation** (UUID, trousseau),
qui ne sert qu'à ça. Dans *À propos*, sept touchers sur le numéro de version l'affichent,
copiable. Un identifiant enregistré dans `testeurs` voit les contenus d'audience `testeurs`.
Aucun secret dans le binaire, aucun build particulier, révocable en supprimant une ligne.

### Les messages de service

Un service `MessagesDeService` lit les messages actifs au lancement et au retour au premier plan,
retient ceux qui visent l'audience, l'établissement actif et la version de l'application (comparée
en semver), et écarte ceux déjà vus (`cle` dans un ensemble persisté). La présentation suit le
niveau :

| Niveau | Première fois | Ensuite, tant qu'actif |
|---|---|---|
| `info` | bandeau en haut, fermable | plus rien |
| `avertissement` | feuille modale, fermable | plus rien |
| `incident` | feuille modale | **un bandeau discret** à chaque lancement, jusqu'à `actif = false` ou expiration |

La distinction est celle de la question 3 de la mise à plat : une information se lit une fois ; un
incident en cours doit rester visible sans redevenir une modale à chaque ouverture.

### Les annonces par campus et par version

`BdeService` filtre sur `audience`, `etablissements` et la fenêtre de version. Les versions
antérieures ignorent les colonnes et voient tout : c'est acceptable, et ça cesse dès que le parc a
migré.

### La console web

Un dossier `console/` dans le dépôt — Vite, React, `supabase-js`, aucune autre dépendance —
déployé sur GitHub Pages par un workflow à chaque poussée sur `master`. Interface **volontairement
rudimentaire** : une liste, un formulaire, un bouton, par table. Pages :

| Page | Ce qu'elle fait |
|---|---|
| Sources | l'état des sondes du matin, et depuis quand |
| Annonces | créer, modifier, désactiver ; téléverser l'image (URL versionnée automatiquement, P4) ; audience, campus, versions |
| Messages | même chose pour `service_messages` |
| Testeurs | la liste des appareils, avec un nom |
| Visuels, Établissements, Salutations, Bâtiments | édition des lignes, avec l'avertissement « une ligne s'écrit entière » là où il s'applique |
| Journal | consulter, filtrer, **exporter en JSON** |

Authentification par Supabase Auth, e-mail et mot de passe ; le compte est créé au jalon par
l'API d'administration, avec un lien de définition du mot de passe. La console n'embarque que la
clé `anon`, publique par conception.

**Les Blueprints restent hors de la console**, et c'est une décision : ils sont versionnés dans le
dépôt, validés par le moteur, rejoués par la parité et publiés par `publish-blueprints.mjs`. Une
console qui les éditerait à la main détruirait ces garanties.

### Les sondes en cron

Un workflow GitHub `sondes.yml`, chaque matin à 7 h (Europe/Paris), installe le moteur Aetherius
et Chromium, joue les sondes du dossier `sondes/` et compare à l'état enregistré :

| Source | Ce que la sonde prouve, sans identifiant |
|---|---|
| Celcat | la liste des groupes rend plus de zéro entrée |
| CAS | la page de connexion sert son formulaire |
| Moodle | la chaîne SSO initiée par l'IdP atteint le formulaire CAS |
| ADE | l'export d'une ressource se lit comme un calendrier |
| Base de publication | le manifeste des Blueprints se lit et ses empreintes correspondent |

Les résultats s'écrivent dans `sondes` (clé de service en secret GitHub). **Au changement d'état**,
le workflow ouvre ou met à jour une **issue GitHub** — la notification arrive sur le téléphone par
l'application GitHub, sans autre service. La console montre la même chose en page d'accueil.

## Décisions et pièges

- **Les sondes n'ont pas d'identifiants.** Elles prouvent qu'un formulaire est atteignable, pas
  qu'il se passe. Un mot de passe dans les secrets GitHub serait un secret de plus pour un gain
  faible : les pannes de l'été auraient toutes été vues sans lui.
- **La clé `anon` dans une page publique n'est pas une fuite** : elle l'est déjà dans le binaire,
  et les politiques RLS sont la frontière. La clé de service, elle, ne va que dans les secrets de
  CI et le script de publication, comme avant.
- **« Vu » est par appareil, pas par compte** : il n'y a pas de compte. Réinstaller revoit les
  messages actifs, et c'est correct.
- **Le journal peut grossir.** Une purge après un an suffit ; elle est écrite, pas automatisée.
- **Le Studio Supabase reste utilisable** en parallèle : il passe par les mêmes politiques et les
  mêmes triggers.

## Dépendances

- 6.1-A pour l'identifiant d'installation (même service de trousseau) et pour le partage du choix
  d'établissement.
- Le moteur Aetherius installable dans un runner GitHub (`pip install` depuis le dépôt, Chromium
  par Playwright).

## Plan de test

| # | Geste | Attendu |
|---|---|---|
| 1 | Publier un message `info` d'audience `testeurs` | visible sur un appareil enregistré, invisible sur un autre |
| 2 | Publier un `incident`, relancer l'application trois fois | modale une fois, bandeau ensuite ; disparaît quand désactivé |
| 3 | Message avec `version_max = 6.0.0` | invisible sur la 6.1 |
| 4 | Annonce ciblée `bordeaux-inp` | invisible chez un étudiant de Bordeaux |
| 5 | Depuis la console, remplacer l'image d'une annonce | nouvelle URL versionnée, l'image change sur un appareil déjà passé |
| 6 | Toute écriture depuis la console | une ligne de journal avec avant/après et l'e-mail |
| 7 | Casser volontairement une sonde (adresse fausse) | issue GitHub ouverte le matin suivant, page Sources en rouge |
| 8 | Écrire avec un compte non listé dans `editeurs` | refusé par la politique |

## Limites écrites

- **Le ciblage par version compare des versions d'application**, pas des builds : deux builds de
  la même version sont indiscernables.
- **Les sondes tournent depuis une adresse américaine** (runners GitHub). Une source qui filtrerait
  par pays passerait en panne le matin sans l'être en France — à lire dans le détail de la sonde.
- **Une issue GitHub est une notification pauvre.** Si la fréquence des alertes le justifie, un
  webhook Discord se branche au même endroit du workflow.
- **La console n'est pas hors ligne, ni collaborative** : un éditeur, une session.

## Écarts constatés

Ce que la carte du code, puis l'appareil, ont corrigé dans le texte ci-dessus.

- **L'identifiant d'installation vit dans un panneau du ModMenu**, pas derrière les sept touchers :
  ce geste ouvrait déjà le ModMenu, présent en production, et un second geste caché aurait été un
  geste de plus à retenir. Le panneau *Testeur* porte aussi « Relire les messages » et « Oublier les
  vus », sans lesquels chaque cas du plan de test coûtait un redémarrage.
- **`testeurs.id` est un `uuid`**, pas un `text` : la console colle un identifiant lu sur un écran,
  et le type refuse une coquille. Et **l'appareil n'envoie jamais son identifiant** : le rôle public
  ne lit que la colonne `id` (un privilège de colonne, les noms restent privés), l'application compare
  chez elle. L'audience est un filtre d'affichage, pas une confidentialité : les identifiants sont
  énumérables, opaques, et usurper un testeur demanderait d'écrire le trousseau d'un appareil.
- **L'UUID vient d'`expo-modules-core`** (`uuid.v4()`, déjà dans chaque build), pas d'un module natif
  de plus : Expo Go est resté utilisable pour vérifier le jalon.
- **Les messages ont un cache** (`messages@1`), à la différence des annonces : sans lui, le rappel
  d'un incident disparaissait au premier lancement hors ligne et pendant la seconde qui précède la
  réponse de la base. Les « vus » ne s'élaguent que contre une lecture réseau réussie.
- **La mémoire « vu » n'était pas relue au démarrage** — trouvé sur appareil : trois messages fermés
  revenaient à chaque vraie relance. Corrigé, et une écriture ne peut plus précéder la lecture.
- **Le rappel d'un incident n'est pas un bandeau discret** : il cachait le grand titre des onglets
  (retour d'appareil). C'est la **pastille d'état de service**, toujours présente à droite du grand
  titre des quatre onglets, au gabarit des boutons d'en-tête — grise quand tout va bien et elle ouvre
  alors « Rien à signaler » avec le lien du formulaire (`services.adaptation`, dans le navigateur
  intégré) ; rouge en incident et elle rouvre la feuille. Le bandeau flottant ne sert qu'aux
  informations, au gabarit des en-têtes. Un écran poussé ne montre pas la pastille.
- **Une chose à la fois pour ce qui se lit** (modale ou bandeau), mais la pastille coexiste : un
  incident ne cesse pas d'être en cours parce qu'une information arrive.
- **Pas de message pendant le parcours d'accueil**, et **une seule langue** par message — décisions
  du 2026-09-02/03.
- **Une version d'application illisible ignore les bornes** (fail open) : un incident ne doit jamais
  être caché par un défaut de forme de notre côté ; la base garantit la forme des bornes par un `check`.
- **Les fonctions vivent dans un schéma `private`**, `security definer`, chemin de recherche vide,
  dans un fichier `fonctions.sql` appliqué **entre** le schéma et les politiques — et **le
  déclencheur du journal doit être `security definer`** : sans cela, l'éditeur, qui n'a pas de
  politique d'écriture sur `journal` et ne doit pas en avoir, voyait chaque écriture refusée sur la
  trace qui la suit. `auth.jwt() ->> 'email'` plutôt qu'`auth.email()`. Le journal couvre aussi
  `app_release`. Les grants d'écriture d'`anon` sont révoqués sur tout le schéma, et sa lecture de
  `journal` et `editeurs` aussi — une RLS sans politique rend une liste vide, pas un refus.
- **Deux doctrines de `supabase/` sont réécrites** : « pas de fonction, pas de déclencheur » et
  « aucune politique d'écriture, jamais ». La base porte de la donnée et deux gardes.
- **Le compte éditeur se crée par script** (`tools/console/editeur.mjs`, mot de passe en variable),
  pas par lien d'invitation : aucune configuration de redirection à faire dans le tableau de bord, et
  pas de courriel sortant. `--sans-droits` crée le compte du test #8. Les inscriptions libres sont
  désactivées à la main.
- **La console est sobre et soignée**, pas rudimentaire en finition : une liste et un formulaire
  génériques pilotés par un descripteur par table, CSS maison, clair et sombre. Elle ne réimporte pas
  les types de l'application : les descripteurs sont son schéma. Elle porte aussi la page *Version
  publiée* (`app_release`), que le protocole de sortie renseigne. `SUPABASE_URL` et
  `SUPABASE_ANON_KEY` sont des **variables** de dépôt, la clé de service seule est un secret.
- **Le runner des sondes est en Python** : la ligne de commande du moteur n'a pas de sortie lisible
  par une machine, et sa façade en mémoire rend un résultat typé. Mesuré : le moteur avale toute
  erreur en un texte et seule l'étape nommée garde son code — le verdict se lit sur l'étape, et il
  distingue **panne de source** (issue, workflow vert) d'**erreur de sonde** (rien, workflow rouge).
- **La sonde de la base de publication est native**, en Python : vérifier les empreintes est du
  calcul. Quatre Blueprints et une vérification. Les adresses du manifeste sont relatives à lui, et
  la sonde les résout comme l'appareil.
- **Les entrées des sondes viennent du catalogue publié** (CAS, ENT, projet ADE, première ressource),
  pas de `sondes.json` : sinon chaque rentrée produirait une fausse panne le lendemain.
- **Le workflow des sondes prend `casser` en entrée** : fausser l'adresse d'une source
  (`127.0.0.1:4`) prouve la chaîne d'issue sans attendre une vraie panne.
- **Un défaut hors périmètre, inscrit au registre pour 6.1-C** : les écrans déjà montés ne se
  relisent pas au retour au premier plan — annonces, carrousel du tableau de bord, et le
  « Aujourd'hui » du Planning après une nuit en arrière-plan (mesuré en production le 2 septembre).
