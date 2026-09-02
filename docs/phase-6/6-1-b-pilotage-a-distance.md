# 6.1-B — Pilotage à distance : messages, audiences, console, sondes

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
