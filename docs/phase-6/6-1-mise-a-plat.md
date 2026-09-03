# v6.1 — Mise à plat, deux jours après la sortie

> **Statut : décisions prises le 2026-09-02**, les neuf questions tranchées en conversation, et
> les jalons spécifiés dans [6.1-A](6-1-a-robustesse-scolarite.md), [B](6-1-b-pilotage-a-distance.md),
> [C](6-1-c-passe-de-code.md), [D](6-1-d-publication.md), [E](6-1-e-finitions-interface.md) et
> [Z](6-1-z-sortie.md). Le document reste tel qu'il a été écrit : c'est la trace du raisonnement.
>
> **Écrit le 2026-09-02.** Ce document croise ce que le propriétaire
> du produit a observé après la sortie de la v6.0 avec tout ce que le dépôt avait noté en chemin —
> limites écrites des jalons, limites connues des fonctionnalités, registre des défauts, et les
> leçons de la soirée de release. Il pose les questions avant de figer un plan ; les jalons qui en
> sortiront auront chacun leur spécification, au format habituel.

## 1. Quelle version ?

La v6.1 avait été définie le 2026-08-30 comme « les capacités qui attendent le contenu de la
rentrée » — mise en avant des annonces, compléments INP, notes et résultats. Deux jours après la
sortie, le besoin réel est autre : **consolider**. La v6.0 a été sortie vite pour tenir la rentrée,
et la soirée de release a montré où elle était fragile — la partie scolarité et tout ce qui touche
aux établissements.

Proposition : **la prochaine version est la 6.1, et elle est la consolidation de la v6.** Ce n'est
pas une entorse à la numérotation : un `6.0.x` se réserve à un correctif isolé, or cette version
ajoute des capacités (messages à distance, annonces par établissement, invitation à changer de
campus) en plus de corriger. Les chantiers dépendant du contenu (notes et résultats, mise en avant
des annonces) glissent en **6.2** — ils n'ont toujours pas leur contenu, et rien ne change à leur
raison d'attendre. Les compléments INP sont à part : ils dépendent d'un compte, pas d'un calendrier,
et rentrent en 6.1 si le compte est disponible (question 8).

## 2. L'inventaire croisé

Chaque ligne porte sa source — **[K]** observation du 2026-09-02, **[R]** leçon de la soirée de
release, **[D]** limite écrite dans la documentation — et sa nature : **release** (du code) ou
**publication** (de la donnée, sans release).

### 2.1 Scolarité et établissements — le cœur fragile

| # | Constat | Diagnostic | Nature | Proposition |
|---|---|---|---|---|
| S1 | **Un widget qui échoue casse la mise en page** [K] | C'est une décision de `GrilleScolarite`, pas un accident : *« un échec bascule la paire entière en rangées »*, parce qu'une tuile de 140 pt ne peut pas écrire « Identifiants incorrects » sans tronquer. Le soir de la release, l'échec Moodle a donc transformé la messagerie en rangée aussi — la page a changé de forme sous les yeux de l'utilisateur. | release | La tuile **garde sa taille et porte son état d'échec** : icône, deux mots (« Indisponible », « À ressaisir »), et le détail au toucher — sur la fiche du compte pour un refus d'identifiants, dans une feuille pour une panne. La grille ne bouge plus jamais. Décision de design à prendre (question 2). |
| S2 | **Le message d'échec Moodle était faux** [R] | Le run échouait sur `fail:MOODLE_INDISPONIBLE`, un code que `ScolariteMapping` ne connaît pas ; le repli de la famille `blocked` a affiché « La connexion a été interrompue avant la fin », qui décrit autre chose. | release | Tout code de Blueprint en `*_INDISPONIBLE` se présente en « service indisponible », **réessayable** — la règle plutôt qu'une table qu'on oublie d'étendre à chaque widget. |
| S3 | **La connexion depuis l'onglet change de page en plein chargement** [K][R] | `validateAndSave` pose `credentials` au dixième pas ; `ScolariteDashboard` bascule alors de la branche « formulaire avec barre » à la branche « écran de chargement plein » : deux vues pour le même run. | release | Une seule vue du chargement : la branche formulaire tient jusqu'à la fin de la session (même garde que l'accueil), l'écran plein n'est que pour un parcours lancé sans formulaire. |
| S4 | **Un ami sur iPhone n'a vu que le Collège ST à l'accueil** [K] | Cause trouvée. **Le socle embarqué ne contient que Bordeaux** (`catalogue.ts`, une seule entrée) : Bordeaux INP et « Autre campus » n'existent que par publication. Sur une **installation neuve**, le cache est vide, le rafraîchissement part en asynchrone après le premier rendu, et `useWelcomeState` fige la liste au montage — il ne s'abonne qu'au changement d'établissement, pas à l'arrivée du catalogue (le commentaire prétend le contraire). La liste reste donc au socle. Kylian et Angy, eux, avaient le cache d'une installation précédente : `resetSettings` ne le vide pas. | release | Trois gestes : **le socle embarque tout ce qui est publié à la date de la release** (les Blueprints INP le sont déjà — la règle « le binaire n'embarque un établissement que s'il embarque de quoi le jouer » est satisfaite) ; l'accueil **se réabonne à l'arrivée du catalogue** ; et l'étape établissement **attend le premier rafraîchissement** avec un court délai plafonné, plutôt que d'afficher une liste qu'on sait incomplète. |
| S5 | **Un étudiant venu de la v5 ne sait pas qu'il doit changer de campus** [K] | Il n'a pas revu l'accueil ; l'onglet Scolarité lui montre le formulaire de Bordeaux sans autre indice que le logo. | release | Sous le formulaire, une ligne discrète — *« Tu es d'un autre campus ? »* — qui ouvre le choix d'établissement (`SettingsInstitutionPopup`, à remonter dans `shared/ui` puisqu'il gagne un second hôte). À l'accueil comme dans l'onglet. |
| S6 | **La cascade WAYF de `/login/index.php` tue la WebView sur Android** [R] | Contournée par publication (SSO initié par l'IdP, Blueprint v2). La cause exacte n'est pas connue : ENT et Chrome passent, seul ce chemin casse, sur ce téléphone. | diagnostic | Une session `adb logcat` sur un Android, chemin `/login/index.php` dans la porte. Sans urgence : plus rien n'emprunte ce chemin. Le résultat s'écrit dans `sources-externes.md`. |
| S7 | **Les widgets mettent une minute à se remplir** [K] | Attentes fixes conservatrices (Moodle 6+15+5 s, messagerie 15 s) et runs sérialisés en priorité arrière-plan. Le parcours froid dure 46 s à Bordeaux [D]. | publication | Remplacer les sommeils fixes par des `wait_for` sur l'état réel des pages, **avec des mesures de rentrée** (un parcours froid par établissement, chronométré). Gain réaliste : de ~33 s à ~12-15 s par widget. |
| S8 | **Une source injoignable n'est jamais `unavailable` sur appareil** [D] | Limite du moteur (une connexion refusée rend une page d'erreur, la navigation « réussit ») ; UKit corrige la conséquence pour deux codes seulement. | moteur | Se traite chez Aetherius (`docs/embedded.md` y porte le défaut). À relancer, pas à contourner davantage ici — S2 couvre déjà la présentation. |
| S9 | **Face ID fonctionne sur le build** [K] | Confirmé sur l'iPhone de production le 2026-09-02, comme le registre le demandait. | doc | Cocher l'entrée de `defauts-fonctionnels.md`, retirer le « à confirmer », et prendre la capture `scolarite-biometrie.png` différée depuis 6-K. |
| S10 | **Le PDF ne s'ouvre pas dans l'application sur Android** [K][R] | Le moteur WebView d'Android n'a aucune visionneuse PDF ; le rendu est iOS-only par construction, la doc le dit [D]. | release | pdf.js embarqué dans la vue (aucune dépendance native, donc compatible Expo Go) — ou assumer la feuille de partage comme la doc le fait déjà. Question 5. |
| S11 | **Compléments du portail INP** [D] | Attendaient un compte actif à la rentrée. | publication + release | Si le compte de Damien est disponible : messagerie INP déjà là, reste documents (attestation de paiement, relevés) et un widget de plus s'il existe. Question 8. |
| S12 | **Les autres documents ne sont pas ouverts** [D] | Chez ReNARD, quatre catégories de plus ; chez l'INP, la page `/inscriptions`. « Ouvrir sera une publication, pas une release. » | publication | À faire dès qu'un dossier réel porte ces pièces — c'est du contenu de rentrée, disponible maintenant. |
| S13 | **La session rallonge le splash à chaque lancement** [D] | Comportement antérieur à la Phase 6, reproduit à l'identique. | release | À mesurer d'abord : si la session part avant le premier rendu, la différer d'un tick est peut-être tout ce qu'il faut. |
| S14 | **La ligne de messagerie ne propose pas de réessayer** [D] | Choix d'écran (la rangée ouvre déjà le webmail). | — | Résolu de fait par S1 si la tuile porte l'échec et le toucher mène au détail. |

### 2.2 Publication et pilotage à distance

| # | Constat | Diagnostic | Nature | Proposition |
|---|---|---|---|---|
| P1 | **Des messages à tous, ou à un établissement, sans release** [K] | La table `service_messages` **existe déjà** (niveau, titre, corps, actif, expiration) — elle a été prévue au jalon 6-B comme « bandeau de service » et **aucun écran ne la lit**. | release, puis publication | Le consommateur : au lancement et au retour au premier plan, un message actif non encore vu s'affiche — **bandeau** pour `info`, **feuille modale** pour `avertissement` et `incident`. Colonnes à ajouter : `etablissements` (liste de codes, vide = tous) et une clé stable pour mémoriser « vu » sur l'appareil. Après la 6.1, une annonce de mise à jour ou d'incident est une ligne de table. Question 3. |
| P2 | **Des annonces visibles seulement pour certains campus** [K][D] | Nommé et non ouvert au jalon 6-J : *« filtrer la table `annonces` par établissement est un sujet distinct »*. La table n'a pas de colonne pour ça. | release, puis publication | Colonne `etablissements` (vide = tous), filtre côté application sur le code actif. Les versions antérieures ignorent la colonne et voient tout — acceptable, et c'est fini au premier parc migré. |
| P3 | **Comment publier sans requêtes SQL** [K] | Aujourd'hui : SQL à la main ou par l'agent. Le script `publish-blueprints.mjs` couvre les Blueprints, rien ne couvre les annonces et les messages. | outillage | Trois niveaux, question 4 : **le Studio Supabase** (déjà là : éditeur de table avec formulaires, bucket avec glisser-déposer — zéro code) ; **un petit outil en ligne de commande** `tools/publier-annonce.mjs` (un fichier Markdown avec en-tête → ligne + image téléversée, URL versionnée automatiquement) ; **une console web** d'administration, seulement si la cadence le justifie. Un menu caché **dans l'application** est exclu : il faudrait y embarquer une clé d'écriture, et une clé dans un binaire est publique. |
| P4 | **Remplacer un visuel ne se propage pas** [R] | Les images sont mises en cache par URL ; le fichier seul ne change rien aux appareils déjà passés. | procédure | Règle : chaque remplacement bumpe l'URL (`?v=N`). L'outil de P3 le fait tout seul. À écrire dans `campus-vie-etudiante.md` § Publier. |
| P5 | **Mise en avant des annonces par créneaux** [D] | Toujours sans contenu pour la calibrer. | — | Reste en 6.2. |
| P6 | **Surveiller les sources avant que les étudiants ne le fassent** [R] | Le relais est mort un été entier sans qu'on le sache ; Moodle a cassé le soir de la release. Le daemon Aetherius a un ordonnanceur et des canaux de notification. | outillage | Un `schedule` par source critique (Celcat liste des groupes, chaîne SSO Moodle, CAS, ADE) qui joue une sonde chaque matin et **notifie au changement** d'état. Ce n'est pas du code d'application ; c'est ce qui manquait le 18 août. Question 7. |

### 2.3 Le reste de l'application — la passe de consolidation

Ce que la documentation porte déjà comme limites connues, trié par ce qu'il coûte de laisser.

| # | Domaine | Constat [D] | Proposition |
|---|---|---|---|
| G1 | Réglages | Ouvrir l'écran sans permission calendrier **bascule** la synchronisation au lieu de la laisser telle quelle ; `syncCalendar` peut laisser l'indicateur tourner jusqu'au redémarrage ; aucun retour d'erreur de synchronisation. | Trois défauts de comportement : à corriger, ils sont visibles. |
| G2 | Réglages | Titres de notification en français en dur ; vingt notifications au plus sur la seule semaine en cache ; `resetSettings` laisse les favoris Campus. | i18n à corriger ; le plafond et le reset sont des décisions à prendre et à écrire. |
| G3 | Planning | Deux caches concurrents pour la liste des groupes ; la synchronisation ne porte que le premier favori ; `computeScheduleWeek` recalculé à chaque rendu. | Le premier est une dette qui finira par mordre ; le second est un vrai manque pour qui agrège deux groupes ; le troisième est de la performance mesurable. |
| G4 | Planning | Deux couleurs de `sectionsHeaders` identiques en sombre. | Coquille probable, une ligne, mais elle change un rendu : à faire dans une session qui regarde le Planning. |
| G5 | Campus | Sections du tableau de bord sans état d'erreur distinct de l'état vide ; position résolue deux fois ; `getDistanceInKm` dupliquée trois fois ; quatre chargements concurrents au montage. | L'état d'erreur est un vrai trou (la Phase 6 revendique de l'avoir supprimé) ; le reste est du nettoyage à faire en passant. |
| G6 | Campus | Bibliothèques : douze requêtes de découverte à chaque ouverture, dont les mesures montrent que deux points suffisent pour Bordeaux. | Réduire le balayage **est** un changement de produit, mais les mesures existent : à trancher. |
| G7 | Accueil | Aucune vérification que la liste des groupes est chargée (installation hors ligne : étape vide sans explication) ; abonnements jamais résiliés ; jeu de styles distinct des deux thèmes. | Le premier rejoint S4 (le premier lancement doit savoir attendre) ; les deux autres sont de la dette d'accueil. |
| G8 | Thème | Les styles composés de `Theme.ts` ne sont pas typés (1 100 lignes) — contourné une fois par un transtypage. | Une fois pour toutes, dans une session dédiée, ou jamais : pas en effet de bord. |
| G9 | Visuel | Apparitions en fondu aux coutures de chargement ; évaluation Material 3 pour les contrôles Android. | Restent 6.1 si la passe visuelle a le temps ; sinon 6.2. Le fondu a déjà son composant décrit dans le README de phase. |
| G10 | Outillage | Sept paquets Expo avec un patch de retard (`expo-doctor`) ; `setup-java@v4` déprécié dans le workflow ; 35 avertissements ESLint en base. | `npx expo install --fix`, v5, et une passe pour ramener la base à zéro — c'est la définition même d'une version de consolidation. |
| G11 | Doc | Le README de phase et 6-Z décrivent une v6.1 qui n'est plus celle-ci. | À amender avec la décision de la question 1. |

### 2.4 Hors code : la réponse au commentaire App Store

Le commentaire du 18 août (deux étoiles, sur la **5.6.1**) reproche à une « refonte IA » une
recherche de groupes qui plante et un chargement infini. **Les faits, tels que le dépôt les porte :**

- l'emploi du temps passait par un **serveur relais**, `ukit.kbdev.io`, introduit le **21 septembre
  2018** (commit « Update URL in the App & Configured Proxy »). Il existait parce que l'application
  était alors une page web dans une WebView, et qu'une page web ne peut pas appeler un autre domaine
  sans son accord — le relais servait d'intermédiaire. L'application est devenue native depuis
  longtemps, le relais est resté ;
- ce relais **est tombé pendant l'été** : les trois sondes du 2026-08-09 ont reçu un `522` Cloudflare
  après vingt secondes — le serveur derrière ne répondait plus. Toute lecture de Celcat (liste des
  groupes, journée, semaine) attendait donc dans le vide : c'est exactement « charge à l'infini au
  lieu d'afficher l'emploi du temps » ;
- la refonte n'était **pas publiée** le 18 août (sortie le 31). Elle est précisément ce qui a
  supprimé le relais : les Blueprints interrogent `celcat.u-bordeaux.fr` directement, après avoir
  mesuré que le serveur ne filtre ni `Origin`, ni `Referer`, ni `User-Agent`.

Le commentaire attribue donc à la refonte le défaut qu'elle a corrigé. La réponse est dans la
conversation qui a produit ce document ; la doc n'a pas à la porter.

## 3. Les questions à trancher

1. **La version.** 6.1 = consolidation, 6.2 = contenu (notes, mise en avant). D'accord ?
2. **L'échec d'un widget.** Une tuile qui garde sa taille et dit l'échec en deux mots, détail au
   toucher — ou des rangées permanentes, sans jamais de bascule ? La première option garde la grille
   de la session Scolarité ; la seconde renonce aux tuiles.
3. **Les messages à distance.** Bandeau pour l'information, modale pour l'incident ; mémorisé « vu »
   par appareil ; ciblable par établissement. Faut-il aussi un ciblage par **version** (« mettez à
   jour ») — c'est le cas d'usage le plus probable et il coûte une colonne de plus ?
4. **Publier sans SQL.** Studio Supabase tout de suite (rien à construire), un outil en ligne de
   commande pour les annonces et les messages (une soirée), une console web plus tard si la cadence
   le demande. Le menu caché dans l'application est exclu pour une raison de sécurité, pas de goût.
5. **Le PDF Android.** pdf.js dans la vue, ou la feuille de partage assumée ? La doc défend la
   seconde ; l'usage réel a montré que « lecture indisponible » se lit comme une panne.
6. **La passe générale.** Le tableau 2.3 propose de corriger G1, G2 (i18n), G5 (état d'erreur), G10,
   et de **décider** G3, G6, G7 ; G4 et G8 attendent une session qui les regarde. Trop ? Pas assez ?
7. **La surveillance des sources** par l'ordonnanceur Aetherius : oui, et vers quel canal ?
8. **Le compte INP** : disponible pour une session de compléments, ou pas encore ?
9. **La suite du contenu par publication** (S7, S12) se fait **avant** la 6.1 : elle n'attend pas
   de release. On la commence dès que les mesures de rentrée sont prises ?

## 4. Le plan proposé, si les réponses sont celles attendues

```
   6.1-A  Robustesse scolarité      S1 S2 S3 S4 S5 S9 (S10 selon Q5)
   6.1-B  Pilotage a distance        P1 P2 P3 P4
   6.1-C  Passe de consolidation     G1 G2 G5 G10 + les decisions G3 G6 G7
   6.1-D  Contenu et publication     S7 S11 S12 P6 — en parallele, sans attendre la release
   6.1-Z  Sortie                     protocole de release ecrit (profil, workflow, URL versionnees)
```

Chaque jalon reçoit sa spécification avant d'être ouvert, avec ses mesures, sa définition de
« terminé » et ses limites écrites — comme les précédents. L'ordre A → B → C est celui du risque :
ce qui a cassé en production d'abord, ce qui évite la prochaine panne ensuite, le nettoyage en
dernier. D court en parallèle parce qu'il ne dépend d'aucun build.
