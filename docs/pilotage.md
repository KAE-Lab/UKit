# Le pilotage à distance

Ce que le propriétaire du produit peut faire **sans release** depuis le jalon
[6.1-B](phase-6/6-1-b-pilotage-a-distance.md) : parler aux utilisateurs, cibler ce qu'il publie,
publier sans requête SQL, et savoir avant eux qu'une source a changé. Quatre capacités, une seule
architecture — la [base de publication](backend.md) reste la source, ses politiques restent la
frontière, et tout ce qui s'y écrit laisse une trace.

| Capacité | Où | Livrée |
|---|---|---|
| Les **messages de service** — information, avertissement, incident — et l'**audience testeurs** | l'application | 6.1-B, lot B1 |
| Les **annonces ciblées** par campus, par version, par audience | l'application | 6.1-B, lot B1 |
| Le **journal** de tout ce qui s'écrit | la base | 6.1-B, lot B1 |
| La **console web** | `console/` | 6.1-B, lot B2 |
| Les **sondes** du matin | `sondes/` | 6.1-B, lot B3 |

## Les messages de service

Un message de service est une ligne de la table `service_messages` : un niveau, un titre, un corps,
et à qui il s'adresse. L'application les lit au démarrage et à chaque retour au premier plan, avec les
cinq autres surcouches publiées ([`rootContainer.tsx`](../src/shared/navigation/rootContainer.tsx)),
retient ceux qui la concernent, et les montre selon leur niveau :

| Niveau | La première fois | Ensuite, tant qu'il est actif |
|---|---|---|
| `info` | un **bandeau** flottant en haut, fermable ; le toucher ouvre le détail | plus rien |
| `avertissement` | une **feuille modale**, « Compris » | plus rien |
| `incident` | une feuille modale | la **pastille d'état de service** des onglets passe au rouge tant qu'il dure, et rouvre la feuille au toucher — jusqu'à `actif = false` ou expiration |

La distinction est celle de la [mise à plat](phase-6/6-1-mise-a-plat.md) : une information se lit
une fois ; un incident en cours doit rester visible sans redevenir une modale à chaque ouverture.

> **Capture attendue** — `pilotage-bandeau-info.png` : le bandeau flottant d'une information, sous
> la barre d'état, par-dessus le tableau de bord Campus.

> **Capture attendue** — `pilotage-incident.png` : la pastille d'état de service en rouge, à droite du
> grand titre de l'onglet Campus, et la feuille « Rien à signaler » quand elle est grise.

### Une chose à la fois

La règle de présentation vit dans un seul module pur et testé,
[`presentation.ts`](../src/shared/messages/presentation.ts). Pour ce qui se lit, elle rend **au plus
une modale ou un bandeau** : l'incident passe avant l'avertissement, qui passe avant l'information,
et le plus récent avant le plus ancien. Le suivant vient à la fermeture — l'hôte
([`MessagesDeServiceHote.tsx`](../src/shared/messages/MessagesDeServiceHote.tsx)) rejoue la règle à
chaque changement : une lecture, une fermeture, un changement d'établissement, la simulation de date.

Le **rappel** d'un incident déjà lu est à part : il a sa propre place et coexiste avec le bandeau et
la modale — un incident ne cesse pas d'être en cours parce qu'une information arrive. Cette place est
la **pastille d'état de service** ([`PastilleService.tsx`](../src/shared/messages/PastilleService.tsx)) :
un « i » au gabarit des boutons d'en-tête, à droite du grand titre de chaque onglet, **toujours là** —
gris quand tout va bien, rouge quand un incident est en cours. Grise, elle ouvre une feuille « Rien à
signaler » avec le lien du formulaire commun (avis, bugs, demandes — `services.adaptation` du
catalogue) : quelqu'un qui a trouvé un bug le cherche précisément là. Rouge, elle rouvre la feuille de
l'incident. Chaque en-tête la pose à côté de son titre, comme il pose son titre : c'est ce qui l'aligne
avec lui et lui évite toute collision avec ce que la rangée porte déjà. Les deux premières versions —
un rappel qui n'existait que pendant l'incident, puis un bandeau permanent qui cachait le titre — ont
été défaites sur appareil le 2026-09-03 : une pastille toujours présente n'inquiète pas, sa couleur
informe.

### « Vu » est par appareil, et se marque à la fermeture

L'appareil garde les **clés** des messages qu'il a fermés (`messages-vus@1`,
[donnees-et-persistance.md](donnees-et-persistance.md)). La clé, `cle`, est stable d'une
republication à l'autre — corriger une faute dans un message ne le refait pas apparaître ; un message
différent sous une autre clé, si. Il n'y a pas de compte : réinstaller ou réinitialiser revoit les
messages actifs, et c'est correct.

« Vu » se marque à la **fermeture** — la croix du bandeau, le bouton de la feuille — jamais à
l'affichage : un bandeau qu'on n'a pas eu le temps de lire avant de quitter l'application revient.

La mémoire ne s'élague que contre une **lecture réseau réussie**, jamais contre le cache : un cache en
retard ferait revenir un message déjà fermé.

### Le cache, et ce qu'il fait hors ligne

Les messages sont mis en cache (`messages@1`), comme les salutations, et à la différence des annonces.
Sans cache, « un rappel d'incident à chaque lancement » disparaîtrait au premier lancement hors ligne,
et pendant la seconde qui précède la réponse de la base. Le filtre `actif` / `expire_le` se rejoue
localement sur le cache, avec l'heure de l'application (`maintenant()`, donc simulable).

Il n'y a **pas de socle embarqué**, et c'est normal : un message de service est par nature ce qu'on
ne connaissait pas à la construction du binaire. Sans base et sans cache, il n'y a rien à dire.

### Pendant l'accueil, rien

L'hôte est inactif tant que le parcours d'accueil n'est pas terminé : rien ne doit l'interrompre, et
l'établissement n'y est pas encore choisi.

## Le ciblage : audience, campus, version

Les messages **et** les annonces portent les quatre mêmes colonnes, projetées et filtrées par un
module pur commun, [`shared/ciblage/`](../src/shared/ciblage/ciblage.ts) :

| Colonne | Ce qu'elle dit | `null` |
|---|---|---|
| `audience` | `tous`, ou `testeurs` — les appareils enregistrés (ci-dessous) | — (`tous` par défaut) |
| `etablissements` | les codes du catalogue qui voient le contenu | tous les campus (un tableau vide aussi) |
| `version_min`, `version_max` | la fenêtre de versions de l'application, bornes incluses, en `X.Y.Z` | pas de borne |

**Le filtre est sur l'appareil, pas dans la base.** La base ne sait ni quel campus a été choisi, ni
quelle version tourne, ni si l'appareil est un testeur — et c'est voulu : l'appareil ne lui dit rien
de lui. Les écrans, eux, ignorent qu'un filtre existe : `BdeService` rend une liste déjà triée.

Le cas d'usage qui a justifié la colonne de version est le message de mise à jour : un `info` avec
`version_max` à la version précédente — « la 6.1 est disponible » — et il disparaît de lui-même chez
qui a mis à jour ([6.1-Z](phase-6/6-1-z-sortie.md)).

Trois règles de bord, et leur sens :

- **une audience inconnue cache** — une troisième audience publiée avant que le parc ne la connaisse
  existe pour restreindre, pas pour montrer ; c'est l'inverse des salutations, où une condition
  illisible se relâche ;
- **une version d'application illisible ignore les bornes** — un incident ne doit jamais être caché
  par un défaut de forme de notre côté ; la base garantit la forme des bornes par un `check` ;
- **les versions antérieures voient tout** — elles ne lisent pas ces colonnes. Acceptable, et fini
  dès que le parc a migré.

## L'audience testeurs

À sa première ouverture, l'application tire un **identifiant d'installation** (un UUID, dans le
trousseau, `UKIT_INSTALLATION_ID`) qui ne sert qu'à ça. Il s'affiche dans le panneau **Testeur** du
menu de développement — sept touchers sur la version, dans À propos ([qualite.md](qualite.md)) —, se
copie d'un bouton, et se recopie dans la table `testeurs` avec un nom. Dès lors, l'appareil voit les
contenus d'audience `testeurs` : c'est ce qui permet d'essayer un message ou une annonce sur son
téléphone avant de l'envoyer à tout le monde, sans secret dans le binaire ni build particulier.
Révoquer un testeur est une ligne supprimée.

**L'appareil n'envoie jamais son identifiant.** Il lit la liste des identifiants enregistrés — la
colonne `id` de `testeurs`, la seule que la base laisse lire au rôle public — et compare chez lui
([`shared/testeur/`](../src/shared/testeur/statut.ts)). La requête est la même pour tout le monde,
et c'est ce qui garde vraie la phrase de [PRIVACY.md](../PRIVACY.md) sur des requêtes anonymes. La
réponse est mise en cache (`testeur@1`) avec l'identifiant qu'elle concernait.

L'identifiant **survit à « Réinitialiser »** des Réglages — un testeur qui remet ses réglages à zéro
reste testeur — et seule la réinitialisation complète du menu de développement l'efface. Sur iOS, le
trousseau survit aussi à une désinstallation.

## Les annonces ciblées

`BdeService` lit les quatre colonnes de ciblage et écarte ce qui ne concerne pas l'appareil, exactement
comme il écarte les annonces expirées. Une annonce d'audience `testeurs` est le brouillon qu'on
regarde sur son téléphone avant de passer l'audience à `tous` ; une annonce ciblée `bordeaux-inp`
n'apparaît pas chez un étudiant de Bordeaux. Rien ne change pour les écrans
([campus-vie-etudiante.md](features/campus-vie-etudiante.md)).

## Le journal

Tout ce qui s'écrit dans une table publiable — annonces, messages, établissements, visuels,
salutations, bâtiments, testeurs, version de l'application — laisse une ligne dans `journal` : la
table, l'opération, la clé de la ligne, l'avant, l'après, **qui** (l'e-mail de l'éditeur, ou
`service_role` pour un script, ou `postgres` pour psql), quand. C'est un déclencheur qui l'écrit
([`supabase/fonctions.sql`](../supabase/fonctions.sql)) : ni la console, ni un script, ni le Studio ne
peuvent l'éviter ni le forger. C'est le fichier à remettre quand quelque chose a mal tourné.

Sa purge est écrite dans [`supabase/README.md`](../supabase/README.md) et n'est pas automatisée.

## La console web

Un dossier [`console/`](../console/) du dépôt — Vite, React, `supabase-js`, et rien d'autre —
déployé sur GitHub Pages à chaque poussée sur `master` qui le touche, à l'adresse
`https://kae-lab.github.io/UKit/`. Volontairement rudimentaire en périmètre, pas en finition : une
liste et un formulaire par table, et deux pages de lecture.

| Page | Ce qu'elle fait |
|---|---|
| Sources | l'état des sondes du matin, et depuis quand |
| Journal | consulter, filtrer par table et par opération, **exporter en JSON** |
| Annonces | créer, modifier, désactiver ; téléverser le visuel, dont l'adresse est versionnée d'elle-même (`?v=N`) ; audience, campus, versions |
| Messages de service | la même chose pour `service_messages` ; la clé est proposée depuis le titre |
| Testeurs | les appareils qui voient l'audience `testeurs`, avec un nom |
| Visuels, Établissements, Salutations, Bâtiments, Version publiée | l'édition des lignes, avec l'avertissement que chaque table mérite — « une ligne s'écrit entière », les trois états d'un visuel, un champ vide qui ne corrige rien |
| Compte | qui est connecté, ses droits, changer son mot de passe |

**La liste et le formulaire sont génériques** : un descripteur par table
([`console/src/schema/tables.ts`](../console/src/schema/tables.ts)) dit les colonnes, leur type de
saisie, la clé, et ce qu'il faut savoir avant d'écrire. Les conversions entre la saisie et la ligne —
le vide qui devient nul sauf là où il est une valeur, une version qui refuse de partir hors forme, un
JSON illisible qui ne part pas — sont pures et jouées par `npm test`.

**L'authentification** est celle de Supabase, e-mail et mot de passe. La console n'embarque que la
clé publiable, publique par conception ; ce qui lui permet d'écrire est la session d'un compte dont
l'e-mail figure dans la table `editeurs`. Un compte qui n'y est pas se connecte, lit ce que la
console montre, et voit chaque écriture refusée — la page Compte le dit avant qu'il n'essaie. Le
compte se crée et se répare depuis le poste du publieur, avec la clé de service
(`npm run console:editeur`, [`supabase/README.md`](../supabase/README.md)) ; les inscriptions libres
sont désactivées dans le projet.

**Les Blueprints restent hors de la console**, et c'est une décision : ils sont versionnés dans le
dépôt, validés par le moteur, rejoués par la parité et publiés par `npm run blueprints:publish`.
Une console qui les éditerait à la main détruirait ces garanties.

Vérifié le 2026-09-03 avec un compte jetable : sans ligne dans `editeurs`, l'insertion est refusée
(42501) et la table `editeurs` se lit vide ; avec la ligne, l'insertion passe, le compte lit sa
propre ligne et toutes les lignes de la table — inactives comprises —, la suppression aussi, et le
journal porte son e-mail. Lancer, construire, déployer : [`console/README.md`](../console/README.md).

## Les sondes

Chaque matin à 7 h (heure de Paris), [`.github/workflows/sondes.yml`](../.github/workflows/sondes.yml)
installe le moteur Aetherius et Chromium dans un runner GitHub, joue une sonde par source tierce
**sans aucun identifiant**, écrit l'état dans la table `sondes`, et ouvre — ou ferme — une issue
GitHub quand il change. La notification arrive sur le téléphone par l'application GitHub ; la console
montre la même chose en page Sources.

| Source | Ce que la sonde prouve |
|---|---|
| Celcat | la liste des groupes rend plus de zéro entrée — le Blueprint de l'application, joué tel quel |
| CAS de Bordeaux, CAS de Bordeaux INP | la page de connexion sert son formulaire (`renew=true` le garantit) |
| Moodle de Bordeaux | la chaîne SSO initiée par l'IdP atteint le formulaire du CAS — ce qui a cassé le soir de la sortie de la 6.0 |
| ADE de Bordeaux INP | l'export d'une ressource se lit comme un calendrier — le Blueprint de l'application |
| La base de publication | le manifeste se lit, et chaque fichier servi porte l'empreinte qu'il annonce — vérification native, en Python |

Quatre Blueprints et une vérification native : hasher les fichiers servis est du calcul, pas une
requête. Les entrées qui bougent — l'adresse d'un CAS, le projet ADE de l'année, la première
ressource — sont lues dans le catalogue publié, la même ligne que l'application.

Le runner est en Python ([`sondes/jouer.py`](../sondes/jouer.py)), par la façade en mémoire du
moteur : la ligne de commande n'a pas de sortie lisible par une machine. Et il distingue ce que le
moteur ne distingue pas pour nous — **panne de source** (la ligne s'écrit, une issue s'ouvre, le
workflow reste vert) et **erreur de sonde** (rien ne s'écrit, aucune issue, le workflow passe au
rouge). Mesuré : le moteur avale toute erreur en un texte, et seule l'étape nommée garde son code ;
le verdict se lit donc sur l'étape qui a échoué. Vérifié le 2026-09-03 : six sondes en `ok` en sept
secondes, et une adresse faussée (`127.0.0.1:4`) rend une panne « source injoignable », pas une
erreur de sonde. Le reste — jouer en local, les réglages à poser sur GitHub, les limites — est dans
[`sondes/README.md`](../sondes/README.md).

## Vérifier

Le canal se vérifie **sans relancer** l'application, grâce au panneau Testeur : « Relire les
messages » rejoue la lecture et la présentation, « Oublier les vus » fait revenir ce qui a été fermé.
Les lignes se publient depuis la console (lot B2) ou, en attendant, par `psql`.

| # | Geste | Attendu |
|---|---|---|
| 1 | À propos → sept touchers → onglet Testeur | l'identifiant, copiable ; « non enregistré » |
| 2 | Insérer l'identifiant dans `testeurs`, « Vérifier » | « testeur » |
| 3 | Un `info` d'audience `testeurs`, puis retour au premier plan | bandeau flottant ; toucher → feuille ; croix → disparaît et ne revient pas ; invisible sur un appareil non enregistré |
| 4 | Un `avertissement` d'audience `tous` | feuille modale une fois, « Compris » ; plus rien ensuite |
| 5 | Un `incident` ; relancer trois fois ; puis `actif = false` | modale une fois, puis la pastille des onglets en rouge dès le lancement ; le toucher rouvre la feuille ; redevient grise au retour au premier plan après désactivation, et ouvre alors « Rien à signaler » avec le lien du formulaire |
| 6 | Un message avec `version_max = '5.9.9'` ; puis `version_min` à la version courante | invisible ; visible |
| 7 | Une annonce `etablissements = '{bordeaux-inp}'` ; une annonce d'audience `testeurs` | invisible à Bordeaux, visible après bascule ; visible sur le seul appareil enregistré |
| 8 | Hors ligne (`SUPABASE_URL=https://127.0.0.1:1`, `expo start -c`) avec un incident en cache ; puis après « Oublier les vus » et cache vidé | le bandeau, depuis le cache ; puis rien, aucune erreur, `[messages]` en `warn` dans Metro |
| 9 | Réglages → Réinitialiser ; puis réinitialisation complète du menu de développement | l'identifiant survit au premier, change après le second |

**Joué sur iPhone réel le 2026-09-03**, les neuf étapes : le statut de testeur, le bandeau
d'information (visible sur le seul appareil enregistré), la feuille d'avertissement une fois, la feuille
d'incident puis la pastille rouge, la fenêtre de versions dans les deux sens, l'annonce ciblée sur un
autre campus (disparue au Collège ST, revenue à l'INP), le hors-ligne avec l'incident en cache puis
rien après la réinitialisation complète, et l'identifiant qui survit à « Réinitialiser » — les
messages fermés, eux, reviennent alors, comme prévu — et change après la réinitialisation complète.
Deux défauts trouvés et corrigés en chemin : la mémoire « vu » qui n'était pas relue au démarrage, et
le rappel d'incident qui cachait le titre.

Les trois chemins dégradés produisent trois écrans différents, comme la
[définition de « terminé »](../CONTRIBUTING.md) l'exige : hors ligne avec un incident en cache, le
bandeau ; hors ligne sans cache, rien ; une colonne absente de la base, rien et une ligne
`[supabase] service_messages : rejected — …` dans le journal de l'appareil.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`shared/ciblage/ciblage.ts`](../src/shared/ciblage/ciblage.ts) | le ciblage d'un contenu publié : projection défensive des quatre colonnes, et la règle « cet appareil doit-il le voir ? » — pur |
| [`shared/ciblage/versions.ts`](../src/shared/ciblage/versions.ts) | le comparateur de versions `X.Y.Z`, et la fenêtre inclusive — pur |
| [`shared/ciblage/contexte.ts`](../src/shared/ciblage/contexte.ts) | ce que l'appareil sait de lui-même : établissement actif, version, statut de testeur |
| [`shared/ciblage/ciblage.test.ts`](../src/shared/ciblage/ciblage.test.ts) · [`versions.test.ts`](../src/shared/ciblage/versions.test.ts) | la règle et le comparateur, joués par `npm test` |
| [`shared/messages/projection.ts`](../src/shared/messages/projection.ts) | le contrat d'un message et sa projection depuis la ligne, la péremption — pur |
| [`shared/messages/presentation.ts`](../src/shared/messages/presentation.ts) | la règle de présentation : une modale ou un bandeau, une chose à la fois — pur |
| [`shared/messages/vus.ts`](../src/shared/messages/vus.ts) | la mémoire « vu », son élagage, son oubli |
| [`shared/messages/index.ts`](../src/shared/messages/index.ts) | la couture : cache, lecture de la table, abonnés |
| [`shared/messages/MessagesDeServiceHote.tsx`](../src/shared/messages/MessagesDeServiceHote.tsx) | l'hôte monté par le conteneur racine : rejoue la règle, rend le bandeau d'information ou la feuille |
| [`shared/messages/PastilleService.tsx`](../src/shared/messages/PastilleService.tsx) | la pastille d'état de service, posée par chaque en-tête d'onglet à droite de son titre : grise et « Rien à signaler » avec le formulaire, rouge et la feuille de l'incident |
| [`shared/messages/projection.test.ts`](../src/shared/messages/projection.test.ts) · [`presentation.test.ts`](../src/shared/messages/presentation.test.ts) | joués par `npm test` |
| [`shared/testeur/identifiant.ts`](../src/shared/testeur/identifiant.ts) | l'identifiant d'installation : créé une fois, mémoïsé, jamais envoyé |
| [`shared/testeur/statut.ts`](../src/shared/testeur/statut.ts) | « cet appareil est-il un testeur ? » : cache, lecture de la colonne `id`, comparaison locale |
| [`shared/ui/Bandeau.tsx`](../src/shared/ui/Bandeau.tsx) | le bandeau flottant d'une information, la seule forme de bandeau de l'application ([theme.md](theme.md#les-décisions-durables)) |
| [`shared/ui/ModMenuTesteur.tsx`](../src/shared/ui/ModMenuTesteur.tsx) | le panneau Testeur du menu de développement |
| [`supabase/fonctions.sql`](../supabase/fonctions.sql) | qui est éditeur, et le journal par déclencheurs |
| [`console/`](../console/) | la console web : descripteurs, liste et formulaire génériques, pages Sources et Journal ([`console/README.md`](../console/README.md)) |
| [`tools/console/editeur.mjs`](../tools/console/editeur.mjs) | créer le compte éditeur, remplacer son mot de passe, donner ou retirer les droits |
| [`.github/workflows/console.yml`](../.github/workflows/console.yml) | construire et déployer la console sur GitHub Pages |
| [`sondes/`](../sondes/) | les sondes du matin : deux Blueprints, le runner Python et son verdict, ses tests ([`sondes/README.md`](../sondes/README.md)) |
| [`.github/workflows/sondes.yml`](../.github/workflows/sondes.yml) | jouer les sondes chaque matin, écrire `sondes`, ouvrir ou fermer l'issue |

## Limites connues

- **Un message est écrit en une seule langue.** Un utilisateur en anglais ou en espagnol le lit tel
  quel. Les salutations ont une table par langue ; un message de service s'écrit vite, en français,
  pour un public bordelais — la différence est assumée.
- **L'audience est un filtre d'affichage, pas une confidentialité.** Les identifiants des testeurs
  sont énumérables par quiconque a la clé publique ; ce sont des UUID aléatoires, et usurper un
  testeur demanderait d'écrire le trousseau d'un appareil.
- **Le ciblage par version compare des versions d'application**, pas des builds : deux builds de la
  même version sont indiscernables.
- **Hors ligne sans cache, un incident ne se voit pas** : la première lecture doit avoir eu lieu.
- **La pastille d'état de service vit dans les en-têtes des quatre onglets** — Planning agrégé,
  Campus, Scolarité dans ses trois états, Réglages. Un écran poussé, ou le Planning d'un groupe
  cherché, ne la montre pas ; on y revient en changeant d'onglet.
- **Grise ne veut pas dire mesuré** : la pastille dit qu'aucun incident n'a été publié, pas que les
  sources répondent. Le jour où elle lira la table `sondes`, elle le dira d'elle-même.
- **Les sondes tournent depuis une adresse américaine** et prouvent qu'un formulaire est
  atteignable, pas qu'il se passe ; elles voient une panne, pas une lenteur ([`sondes/README.md`](../sondes/README.md)).
- **La console n'est ni hors ligne, ni collaborative** : un éditeur, une session, et le dernier
  enregistrement gagne. Le journal dit qui a écrit quoi.
- **Une annonce ciblée, ou rendue à tous, n'atteint un écran déjà monté qu'au lancement suivant** :
  la lecture se fait au montage de la liste et du tableau de bord, pas au retour au premier plan.
  Les messages de service, eux, arrivent au retour. Défaut inscrit au registre, à corriger dans
  [6.1-C](phase-6/6-1-c-passe-de-code.md) ([defauts-fonctionnels.md](defauts-fonctionnels.md)).
- **Un message désactivé pendant que l'appareil est hors ligne** reste dans le cache jusqu'à la
  lecture suivante ; son expiration, elle, est honorée localement.
