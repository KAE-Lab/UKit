# 6-J — Le compte d'abord, et des sources qui varient par établissement

> **Jalon livré** — 2026-08-16. Le compte universitaire se propose **dès l'accueil**, en étape sautable
> et rappelée ; l'absence de portail se **dit** au lieu d'afficher un formulaire inutile ; et
> l'emploi du temps accepte un **lien d'abonnement collé**, joué par un Blueprint unique et embarqué —
> le premier chemin de la phase qui ajoute une source **sans qu'on écrive quoi que ce soit**. La ligne
> `autre` du catalogue en tire la conséquence : *« Mon université n'est pas dans la liste »* rend
> l'application utilisable pour une fac bordelaise non portée. Les quatre questions que ce texte
> laissait ouvertes sont tranchées ci-dessous, et les écarts entre ce qui était prévu et ce que la
> mesure a imposé sont rassemblés dans [Écarts constatés](#écarts-constatés), en bas de page.

## Ce que le second établissement a appris

6-G a rendu le multi-établissement possible : le catalogue pilote l'interface, un portail s'ajoute
sans release. Mais il a aussi montré que **l'application n'a qu'une forme**, celle de l'Université de
Bordeaux, et que cette forme ne convient pas à tout le monde.

Constaté en jouant Bordeaux INP sur appareil :

- l'onglet **Planning** est le premier écran de l'application, et il n'a rien à montrer pour un
  établissement dont on n'a pas porté l'emploi du temps. 6-G le dit proprement au lieu d'échouer,
  mais « proprement » veut dire ici une phrase d'excuse à l'ouverture ;
- le **compte universitaire** est présenté comme une fonctionnalité parmi quatre, alors qu'il est la
  seule porte vers les données personnelles — et, pour beaucoup d'établissements, la seule porte vers
  l'emploi du temps ;
- **ce qui existe varie d'une fac à l'autre**, et pas seulement en présence ou en absence : chez l'une
  l'emploi du temps est public et le compte optionnel, chez l'autre il n'y a d'emploi du temps que
  derrière une authentification ou un lien d'abonnement personnel.

La conclusion n'est pas un correctif : c'est que **la place du compte dans le parcours dépend de
l'établissement**, et que l'application ne sait pas encore exprimer ça.

## La direction

**Proposer la connexion au compte pendant l'accueil, juste après le choix de l'établissement** — sans
la rendre bloquante. Puis, dans l'application, traiter l'absence de compte comme 6-G traite déjà
l'absence de service : les parties qui en dépendent se **disent** indisponibles au lieu d'échouer, avec
un chemin de sortie clair.

Pour l'emploi du temps, **le catalogue décide**, et il y a désormais quatre états — c'est
[`sourceEdt()`](../../src/shared/etablissements/edt.ts) qui les porte, dans une union **totale** qui ne
rend plus jamais `null` :

| L'établissement publie | `sourceEdt().kind` | Ce que l'accueil propose | Ce que l'application joue |
|---|---|---|---|
| un serveur interrogeable sans compte (Bordeaux) | `celcat` | le choix des groupes, avec tri par année | les six Blueprints Celcat |
| un référentiel relevé (Bordeaux INP) | `ical` | le choix des groupes, **sans** tri par année | l'iCal borné ([6-I](6-i-planning-universel.md)) |
| un export d'abonnement, lien posé | `abonnement` | rien de plus à demander | `ukit.edt.abonnement` |
| un export d'abonnement, aucun lien | `lien-attendu` | « colle ton lien » | — |
| rien d'extractible | `aucun` | rien — et l'onglet le dit | — |

**L'ordre de préférence va du plus automatique au plus manuel**, et il compte : Celcat gagne parce
qu'un serveur interrogeable a une liste vivante ; le référentiel ensuite, parce qu'un étudiant y
choisit encore son groupe ; l'abonnement en dernier, parce qu'il coûte un geste.

Le lien collé à la main est le **repli universel** : il marche partout où l'établissement offre un
export, sans que nous ayons rien à porter. Il coûte un geste que personne n'a envie de faire, donc il
n'est pas le chemin principal — il est celui qui existe toujours.

**Un seul Blueprint le porte, et il est embarqué.** Il n'est pas sous `ukit.portail.` parce qu'il
n'appartient à aucun établissement : un fichier par université l'aurait rendu aussi coûteux que ce
qu'il remplace, et c'est exactement ce qu'il existe pour éviter. Il demande le lien **verbatim, sans
bornes de dates** — ADE les accepte, d'autres produits figent la fenêtre à l'export — et le filtrage
par date est donc applicatif. Le [cas de parité](../../tools/parity/ical-abonnement.parity.mjs) prouve
que les deux découpes rendent exactement les mêmes cours.

## Les quatre questions, et ce qui a été tranché

1. **Le compte à l'accueil est-il une étape ou une invitation ?** → **La troisième forme**, celle que
   ce texte pressentait : une étape **dédiée, sautable et rappelée**. Elle vient juste après
   l'établissement et avant l'emploi du temps ; « Plus tard » est un lien discret et non un second
   bouton, parce que les deux gestes n'ont pas le même poids. Le rappel vit dans les
   [Réglages](../features/settings.md) — une ligne « Compte universitaire » qui dit *connecté* ou
   *non connecté*. L'étape **disparaît** chez un établissement qui ne publie aucun portail : on ne
   pose pas une question sans réponse, règle héritée de 6-G.

   **L'ordre a été décidé pour les autres facs, pas pour Bordeaux.** Le compte ne sert pas à obtenir
   l'emploi du temps bordelais ; chez beaucoup d'universités, il *est* la porte. Le demander après
   aurait posé la question dans le mauvais sens, et l'application n'a eu qu'une forme trop longtemps.

2. **Un lien iCal est-il un réglage ou un secret ?** → **Un secret**, sans hésitation : un lien
   d'abonnement personnel ouvre un emploi du temps nominatif **sans demander d'identifiant**. Il vaut
   donc un mot de passe et se range avec eux, dans `expo-secure-store`
   ([`SecureStoreService`](../../src/shared/services/SecureStoreService.ts), clé `UKIT_EDT_LIENS`).

   Une conséquence que le texte n'avait pas vue : il est **cloisonné par établissement, pas effacé**
   à la bascule. C'est la correction du jalon 6-I appliquée d'avance — *la règle est que les données de
   deux facs ne se mélangent pas, pas qu'il faille les oublier* — et faire recoller un lien à chaque
   aller-retour aurait été une punition sans raison. La réinitialisation, elle, les efface tous.

3. **Que devient l'onglet Planning quand il n'a rien ?** → **Un état vide actionnable**, et la
   distinction est le cœur du jalon : *« cette université n'a pas d'emploi du temps »* et *« elle en a
   un, il te manque un geste »* sont deux écrans, parce qu'ils appellent deux gestes opposés. Le second
   porte un bouton, le premier n'en a aucun. L'application **n'ouvre pas sur un autre onglet** : faire
   varier la navigation d'une fac à l'autre aurait été le contraire de ce que cette phase cherche.

4. **Jusqu'où le catalogue décrit-il un parcours ?** → Il gagne **trois faits, aucun quoi-faire** :
   « cet établissement publie un abonnement iCal » (`edt.abonnement`), « sa région CROUS est *n* »
   (`crous_region`), « il n'a pas de référentiel de salles » (`salles.reconnaissance: false`). Les
   trois répondent à *ce qui existe*. Le *quoi faire* reste un Blueprint unique et embarqué,
   `ukit.edt.abonnement`, que le catalogue ne nomme même pas — il n'appartient à aucun établissement.

   Le seul champ qui frôle la ligne est `edt.abonnement.aide` (« ADE → Exporter mon agenda »). Il la
   respecte : c'est un **libellé de donnée**, affiché tel quel comme le nom d'une université, pas une
   instruction interprétée.

## Ce que 6-G a déjà posé, et qui reste valable

- un service absent se **dit** au lieu d'échouer, avec son propre message (`serviceAbsent`) ;
- l'accueil sait déjà **omettre une étape** selon l'établissement — le mécanisme existe, il ne demande
  qu'à porter d'autres cas ;
- les écrans qui dépendent d'un service disparaissent au lieu de rester en erreur permanente : la
  ligne de messagerie, la section des salles libres ;
- le portail d'un établissement est un fichier publiable, donc ajouter une université reste une
  publication.

Ce jalon ne défait rien de tout ça. Il déplace une décision de produit — *quand demande-t-on le
compte* — que 6-G a rendue visible sans avoir à la trancher.

## Ce qui a été livré

1. ✅ **Le compte à l'accueil.** [`CredentialsProvider`](../../src/features/Scolarite/services/CredentialsContext.tsx)
   a remonté de `StackNavigator` vers [`rootContainer.tsx`](../../src/shared/navigation/rootContainer.tsx),
   au-dessus des deux branches — c'est ce qui permet à l'accueil d'utiliser **le formulaire de l'onglet
   Scolarité**, avec sa sortie « Plus tard », plutôt qu'un second chemin vers le trousseau.
2. ✅ **L'absence de portail se dit.** Le tableau de bord teste `portailDisponible` **avant**
   `!credentials` : un établissement sans portail n'a jamais d'identifiants enregistrés, donc la
   branche « pas de compte » gagnait toujours et proposait un formulaire qui ne menait nulle part.
   Même inversion de branches que celle du Planning en 6-G.
3. ✅ **Le lien d'abonnement**, de bout en bout : le Blueprint
   [`ukit.edt.abonnement`](../../blueprints/ukit-edt-abonnement.blueprint.json), le trousseau cloisonné
   ([`lienEdt.ts`](../../src/shared/etablissements/lienEdt.ts)), le formulaire partagé
   ([`LienEdtForm.tsx`](../../src/features/Planning/components/LienEdtForm.tsx)) atteignable depuis
   l'accueil, l'état vide du Planning et les Réglages, et le filtrage par date dans
   [`IcsMapping.ts`](../../src/features/Planning/services/IcsMapping.ts).
4. ✅ **La ligne `autre`** du catalogue, et les deux corrections qu'elle a imposées : la région CROUS
   devient une donnée (`crous_region`), et la reconnaissance de salle se **désactive**
   (`salles.reconnaissance: false`) — un libellé étranger capturerait sinon un code bordelais existant
   et afficherait le mauvais bâtiment.
5. ✅ **Trois défauts de forme bordelaise**, trouvés en lisant le code et corrigés — voir
   [Écarts constatés](#écarts-constatés), points 1 à 3.
6. ✅ `npx tsc --noEmit` (3 erreurs, base inchangée), `npx eslint .` (11 warnings, base inchangée),
   `npm test` (**262**, contre 234), `npm run parity` (**13 cas**, contre 12).
7. ✅ **La campagne sur appareil**, ci-dessous — la seule porte qu'un terminal ne peut pas franchir, et
   elle l'a prouvé. **Les vingt sondes sont passées**, sur iPhone, avec un compte universitaire réel et
   la base de production. Elle a trouvé **quatre défauts**, tous corrigés et consignés dans
   [Écarts constatés](#écarts-constatés) (points 0 à 3) : trois d'entre eux cassaient l'application
   pendant que les 262 tests et les 13 cas de parité étaient verts.

## Écarts constatés

Dix. Trois sont des défauts **trouvés en lisant le code** — tous de la famille « l'application n'a
qu'une forme, celle de Bordeaux », que 6-G et 6-I avaient déjà rencontrée sous d'autres visages —, deux
sont des décisions que le texte n'avait pas anticipées, un est une règle d'architecture que le jalon a
dû amender plutôt que contourner, et **quatre viennent de la campagne sur appareil**. Aucun de ces
quatre n'était atteignable depuis un terminal : les 262 tests et les 13 cas de parité étaient verts
pendant que trois d'entre eux cassaient l'application.

0. **Le cache du catalogue garde des objets déjà projetés, et personne ne l'avait écrit.** C'est le
   défaut le plus instructif de la campagne, et il n'appartient pas vraiment à ce jalon — il attendait
   depuis 6-I. `etablissements@1` ne stocke pas des lignes de la base : il stocke des `Etablissement`
   **projetés**. Ajouter un champ à la projection ne remplit donc pas rétroactivement ce qui est déjà
   en cache, et l'application lit `undefined` là où elle attend une valeur ou `null`.

   Le symptôme mesuré : `crousRegion` valait `undefined`, il est parti tel quel dans les entrées du
   run, et le moteur l'a rendu **`None`** — l'application a demandé
   `/regions/None/restaurants` et Croustillant a répondu 404. Un `None` dans une URL est la signature
   d'une valeur absente traversant un rendu d'expression, et c'est ce qui a permis de remonter jusqu'à
   la cause en une lecture.

   Deux autres champs étaient dans le même cas sans que ça se voie encore : `edtAbonnement`, dont
   l'`undefined` passe le test `!== null` et aurait fait croire à un abonnement là où il n'y en a pas,
   et **`sallesLibres`, qui traînait depuis 6-I** — ce jalon avait ajouté trois colonnes sans toucher à
   la version de la clé.

   Deux ceintures plutôt qu'une, parce que la première dépend qu'on y pense : la clé passe à
   `etablissements@2`, **et** les accesseurs normalisent `undefined` vers `null`. La règle est écrite
   là où on la lira — *ajouter un champ à `Etablissement`, c'est incrémenter cette version*.

1. **Le bouton de connexion restait figé sur « Connexion… » à l'accueil.** La session allait pourtant
   au bout : l'onglet Scolarité affichait tout correctement après coup. En cas de succès,
   `ScolariteLoginView` ne retombait simplement **jamais** de son état de soumission — et c'était juste
   tant qu'il n'avait qu'un appelant, le tableau de bord, qui se redessine dès que le contexte pose
   `credentials` et fait disparaître l'écran avec lui. À l'accueil, rien ne le remplace.

   C'est le prix exact du partage de composant décidé à l'écart 6, et il vaut d'être noté : **réutiliser
   un écran, c'est hériter de ses hypothèses implicites**. Celle-ci n'était écrite nulle part, sinon
   dans un commentaire qui disait « le dashboard remplace cet écran automatiquement ». L'indicateur
   retombe désormais explicitement, et `onSuccess` porte la suite quand l'appelant en a une.

2. **L'écran des identifiants affichait une fiche vide au lieu d'un formulaire.** Six tirets et un
   bouton « Se déconnecter » qui n'avait rien à déconnecter. Le défaut est **antérieur au jalon** —
   l'écran a toujours supposé qu'on y arrivait connecté, ce qui était vrai tant que son seul chemin
   était le bouton d'action de l'onglet Scolarité, lequel n'existe qu'après une session. La ligne des
   Réglages ajoutée ici le rend atteignable à tout moment, donc le jalon rend faux un écran qui ne
   l'était pas : même schéma exact que la réinitialisation au jalon 6-G.

3. **Un cache de catalogue périmé fait disparaître les établissements publiés, et c'est voulu.** La
   conséquence de l'écart 0 qu'il faut connaître avant de tester : la bascule en `@2` jette les caches
   précédents, donc tant que `supabase/schema.sql` n'a pas ajouté `crous_region`, la lecture du
   catalogue **échoue entièrement** — la colonne est nommée dans le `select` — et l'application repart
   sur son socle embarqué, c'est-à-dire l'Université de Bordeaux seule. Ce n'est pas une régression,
   c'est le repli documenté depuis 6-B ; mais il rend l'ordre de déploiement **obligatoire** : le
   schéma d'abord, le catalogue ensuite, l'application enfin.

   Corollaire ajouté au code, là où il se lira : la liste `COLONNES` de
   [`index.ts`](../../src/shared/etablissements/index.ts) porte désormais la règle. Elle a d'ailleurs
   attrapé un défaut à elle seule pendant la relecture — `crous_region` y manquait, donc la colonne
   n'aurait jamais été lue même une fois publiée.

1. **La liste des groupes ne suivait pas l'établissement, et c'est le plus grave.**
   [`PlanningDataManager`](../../src/features/Planning/services/PlanningDataManager.ts) ne s'abonnait à
   rien : `changerEtablissement` purgeait la clé disque, mais `_groupList` gardait **en mémoire** les
   six cents groupes de Bordeaux. Choisir Bordeaux INP à l'accueil proposait donc des groupes
   bordelais, et le favori retenu produisait « ce groupe n'existe plus » sur l'onglet Planning.

   C'est la troisième fois que ce défaut se présente dans la phase — après les favoris (6-I) et la
   session en mémoire (6-G) — et la forme est toujours la même : **un état qui survit à une bascule que
   personne ne lui a annoncée**. Le manager tient sa donnée, il tient donc son invalidation.

2. **Le démarrage chargeait les managers avant les réglages.** Même défaut, un cran plus tôt :
   `PlanningDataManager.loadData()` courait **avant** `SettingsManager.loadSettings()`, donc avant que
   le code d'établissement persisté ne soit restauré. Un étudiant de l'INP dont le cache avait expiré
   voyait partir une requête vers le serveur de Bordeaux, dont la réponse écrasait sa liste. Invisible
   six jours sur sept — le cache dure une semaine —, ce qui l'a laissé vivre. L'ordre est corrigé dans
   [`App.tsx`](../../App.tsx).

3. **Le tri année/semestre de l'accueil était une convention Celcat bordelaise en dur.** Depuis 6-I,
   l'étape des groupes s'affiche pour Bordeaux INP, dont les treize entrées s'appellent `ENSC 2A GR1` :
   aucun fragment de la table ne les atteignait, et la liste restait vide sauf en choisissant « AUTRE ».
   Le tri ne s'affiche donc plus que pour la source qui le justifie. La vraie question n'était pas
   *quelle table de filtrage* mais **cette liste est-elle trop longue pour être parcourue** : Celcat en
   publie plusieurs centaines, un référentiel en compte treize.

4. **Le formulaire de lien est un composant, pas un écran** — et c'est une contrainte, pas un goût. Le
   parcours d'accueil est rendu **à la place** du conteneur de navigation : il ne peut pousser aucun
   écran de pile. Le même formulaire sert donc trois endroits, et `onDone` est tout ce qui les
   distingue.

5. **Un calendrier valide mais vide n'est pas un refus**, et le texte ne posait pas la question. La
   vérification aurait pu rejeter un lien qui ne rend aucun cours — c'est le signe le plus courant d'un
   mauvais collage. Mais **en août**, c'est le cas ordinaire, et c'est justement le moment où un
   étudiant qui arrive à Bordeaux installe l'application. Refuser aurait cassé le parcours de la
   personne que ce produit vise. L'écran le **dit** et l'enregistre quand même — le compte de cours
   reste affiché, ce qui apprend quelque chose au lieu de laisser devant un planning vide.

6. **La règle « aucune dépendance croisée entre features » a été amendée, pas contournée.** L'accueil
   importe désormais `ScolariteLoginView` et `LienEdtForm`. L'alternative — recopier les deux
   formulaires — aurait créé **deux chemins vers le même trousseau**, qui divergent à la première
   correction. [architecture.md](../architecture.md#dépendances-entre-features) les documente, avec la
   règle qui a servi à trancher : *on partage un composant quand le dupliquer créerait deux chemins vers
   le même état persistant.* L'occasion a aussi révélé qu'une troisième dépendance existait déjà,
   `Onboarding → PlanningDataManager`, **non documentée** — elle l'est maintenant.

## Dépendances

[6-I](6-i-planning-universel.md) pour la voie iCal. Ce jalon se **coupait en deux**, et les deux
moitiés ont été livrées ensemble :

- **« proposer le compte universitaire à l'accueil »** ne dépendait de rien ;
- **« colle ton lien iCal »** n'avait aucun sens tant que l'application ne savait pas lire un iCal.

C'est aussi la raison pour laquelle ce jalon vient **après** 6-I dans l'ordre de la phase, alors que sa
première moitié pouvait techniquement passer avant.

**Ce qui n'est pas livré, et pourquoi.** *Aller chercher le lien tout seul sur l'ENT* est la suite
naturelle, et elle vient après : c'est un Blueprint **Act II par établissement** — chaque ENT a son
CAS, ses pages, son DOM —, c'est-à-dire le « travail d'auteur » que 6-G écrit déjà comme limite. Elle
est de plus **impossible par construction pour `autre`** : on ne connaît pas l'ENT d'une université
qu'on n'a pas au catalogue. Et aucun des deux établissements portés n'en a besoin — Bordeaux a Celcat,
l'INP a un export anonyme — donc l'écrire aujourd'hui produirait une capacité invérifiable, ce que
cette phase refuse.

Elle se branchera **sans refactor** : le catalogue nommera `edt.abonnement.blueprint_lien`, le run
écrira dans le même emplacement de trousseau que la saisie manuelle, et tout ce qui est en aval — le
service, le cache, les écrans — est déjà écrit pour ne pas savoir d'où vient le lien.

## Une précision de vocabulaire, parce qu'elle prête à confusion

Le « compte » de ce jalon est le **compte universitaire** — les identifiants CAS que l'application
détient déjà et garde dans le trousseau. Ce n'est **pas** un compte UKit : aucun serveur, aucune
inscription, rien de nouveau qui transite, et la politique de confidentialité ne bouge pas.

Un compte UKit — pour une partie sociale — est un sujet distinct, hors de la phase 6, et il n'est pas
spécifié. Deux choses valent d'être écrites ici pour le jour où il le sera, parce qu'elles ne coûtent
rien maintenant et qu'elles coûteraient un refactor plus tard :

- **la preuve d'être étudiant est locale, donc non vérifiable par un serveur.** Le portail se joue sur
  l'appareil et n'en rapporte aucun artefact signé ; annoncer un numéro étudiant à la base serait
  trivialement falsifiable, la clé publiable étant publique par conception. La réponse vérifiable est
  l'**adresse institutionnelle** — que le portail lit déjà — confirmée par un code envoyé par courriel ;
- **faire vérifier les identifiants CAS par le serveur est exclu**, quelle que soit la commodité : ça
  détruirait la promesse qui justifie que le moteur soit embarqué plutôt qu'hébergé
  ([PRIVACY.md](../../PRIVACY.md)).

Ce jalon, lui, ne fait ni l'un ni l'autre : il déplace seulement le moment où l'on demande les
identifiants universitaires.

## Plan de test sur appareil

**Pas de mode avion** : il coupe aussi Metro. Trois outils le remplacent, et ils sont plus précis —
vider `SUPABASE_URL` dans `.env` puis relancer Expo (`-c`), pointer une entrée de Blueprint sur
`https://127.0.0.1:1/` (une adresse qui *refuse*, pas un nom qui ne résout pas), et le menu de
développement (sept tapes sur le numéro de version dans *À propos*) avec son interrupteur **HORS
LIGNE** et son panneau **Blueprints**.

Les sondes sont ordonnées pour minimiser les réinitialisations : 1→5 sur une installation neuve,
6→11 en naviguant, 12→20 en dégradant.

| # | Marche à suivre | Attendu |
|---|---|---|
| 1 | Réglages → Réinitialiser, puis traverser l'accueil sur **Bordeaux** | **6 écrans** : intro, préférences, établissement, **compte**, groupes, fin. La pagination affiche 6 points |
| 2 | À l'étape compte, toucher **« Plus tard »** | On passe à l'étape des groupes. Aucun échec, aucune alerte |
| 3 | Refaire l'accueil, à l'étape compte saisir un **vrai compte Bordeaux** | « Connexion… », puis l'étape suivante arrive en **~13 s**. La lecture du dossier continue derrière |
| 4 | Terminer, ouvrir l'onglet **Scolarité** | Le prénom et le numéro étudiant sont là **sans nouvelle connexion** |
| 5 | Réglages | Une ligne « Compte universitaire » dit **Connecté** |
| 6 | Réinitialiser, choisir **Bordeaux INP**, avancer d'un écran | L'étape des groupes montre les **13 groupes de l'INP**, **jamais** des groupes bordelais, et **sans pastilles année/semestre** — la sonde des écarts 1 et 3 |
| 7 | Sélectionner `ENSC 2A GR1`, terminer, Planning au **18/11/2025** | 5 cours à 08:00, 09:30, 11:00, 14:00, 15:30 — inchangé depuis 6-I |
| 8 | Réglages → Bordeaux INP, onglet **Scolarité** | Le formulaire s'affiche (l'INP a un dossier), et **aucune ligne de messagerie** après connexion |
| 9 | Réglages → **« Mon université n'est pas dans la liste »**, onglet Planning | **« Colle ton lien d'emploi du temps »** avec un bouton — pas la phrase d'excuse |
| 10 | Coller l'URL ADE anonyme de l'INP (`anonymous_cal.jsp?resources=7&projectId=1&calType=ical&firstDate=…&lastDate=…`) | « Calendrier reconnu : N cours. », bouton **Terminer** |
| 11 | Planning, vue jour au **18/11/2025**, puis vue semaine du **17/11/2025** | **Les mêmes cours que la sonde 7**, aux mêmes heures — la preuve que le filtrage applicatif vaut les bornes serveur |
| 12 | Onglet **Campus** en « Autre » | Restaurants, bibliothèques **et salles libres présents** — ceux de Bordeaux, et ils sont justes. Seule la Scolarité manque |
| 13 | Fiche d'un cours dont la salle est `CD-O204` | Fiche correcte, **aucune carte** — pas une carte fausse |
| 14 | Onglet **Scolarité** en « Autre » | « Cette université n'est pas encore reliée à UKit », **sans formulaire** et sans bouton Réessayer |
| 15 | Réglages → Bordeaux INP, puis re-basculer sur « Autre » | Le lien collé est **toujours là** : cloisonné, pas effacé |
| 16 | Coller un lien manifestement faux (`https://example.com/`) | Refus explicite « ce lien ne rend pas un calendrier », **rien d'enregistré** |
| 17 | Coller `https://127.0.0.1:1/agenda.ics` | « Service indisponible », **avec** Réessayer — écran distinct du 16 |
| 18 | Coller une URL ADE valide sur une **semaine sans cours** | « Ce calendrier ne porte aucun cours » — enregistré quand même, écran distinct des 16 et 17 |
| 19 | Interrupteur **HORS LIGNE**, revenir sur un jour déjà consulté en « Autre » | Le cache daté et son bandeau, comme pour les deux autres sources |
| 20 | Réglages → Réinitialiser | Le lien **et** la session ont disparu ; l'accueil repart sur Bordeaux |

Les sondes **9, 12, 14, 16, 17, 18 et 19** doivent produire **sept écrans différents**. S'ils
convergent vers « aucun résultat », le jalon n'a rien apporté — c'est le critère de la phase, pas une
formule.

> **Capture attendue** — `onboarding-compte.png` : l'étape du compte universitaire, avec « Plus tard ».
>
> **Capture attendue** — `planning-lien-attendu.png` : l'onglet Planning proposant de coller un lien.
>
> **Capture attendue** — `lien-edt-saisie.png` : l'écran de saisie, après une vérification réussie.
>
> **Capture attendue** — `scolarite-non-reliee.png` : la Scolarité d'un établissement sans portail.

## Limites écrites

- **La récupération automatique du lien n'existe pas.** Un Blueprint par ENT, un compte réel par
  établissement — et rien pour `autre`, dont on ne connaît pas l'ENT. L'emplacement de trousseau est
  prêt, le reste ne demande aucun refactor.
- **« Autre » suppose une fac du secteur bordelais.** Sa région CROUS, ses points de balayage et son
  inventaire de salles libres sont ceux de l'Université de Bordeaux, et l'écran ne le dit pas. C'est
  exact tant que le périmètre du produit est bordelais ([README](../../README.md)) ; le jour où il ne
  l'est plus, les trois colonnes existent déjà pour porter la vérité — c'est le but de les avoir
  sorties du code ici.
- **« Autre » n'a pas de carte de cours.** La reconnaissance de salle est désactivée faute de connaître
  le format de ses libellés. C'est un choix contre le pire : une carte fausse est pire qu'une carte
  vide.
- **Les annonces de vie étudiante restent les nôtres, donc bordelaises.** Filtrer la table `annonces`
  par établissement est un sujet distinct, nommé et non ouvert.
- **Un lien collé sans bornes coûte un téléchargement de tout ce que la source publie.** Un cache en
  mémoire de cinq minutes l'amortit dans une session ; il ne le supprime pas. Le délai est court
  volontairement — servir une salle déplacée pendant une heure serait pire que de retélécharger.
- **La vérification d'un lien ne prouve pas qu'il est le bon.** Elle prouve qu'il rend un calendrier.
  Un lien valide pointant l'agenda de quelqu'un d'autre passerait, et aucune vérification côté
  application ne peut le savoir.
- **Un export iCal est une photo, pas une API** (limite héritée de 6-I) : pas d'identifiant stable de
  groupe, et des champs utiles en texte libre dans `DESCRIPTION`. La sonde 19 l'a montré en grand : le
  calendrier de Google glisse dans la description d'un jour férié une phrase de réglage — « Pour
  masquer les journées d'observance, accédez à Paramètres Google Agenda… » — qui s'affiche telle quelle
  dans la fiche. On ne peut pas filtrer ce qu'on ne connaît pas.
- **Un événement « journée entière » s'affiche `00:00 - 00:00`.** L'application n'a pas cette notion :
  son contrat porte une heure de début et une heure de fin, parce qu'aucune des deux sources portées
  n'en produit. Un lien collé, lui, peut en contenir — vacances, journées d'examen, jours fériés — et
  la sonde 19 en a affiché 209. C'est lisible et ce n'est pas faux, mais ça se lit mal, et **c'est le
  seul point de la campagne qui appelle un correctif plutôt qu'une phrase**. Il n'est pas fait ici :
  aucun établissement porté n'émet ce cas, et le traiter demande une décision d'affichage qui appartient
  au volet visuel ([6-K](6-k-socle-visuel.md)).
- **L'icône d'une ligne de description retombe sur son défaut chez une source inconnue.**
  `CourseAnnotations` déduit l'icône du contenu — une salle contre le référentiel, un code de module
  contre son motif — et une source étrangère ne correspond à aucun des deux. « Jour férié » hérite donc
  de l'icône « groupe ». Cosmétique, et sans réponse générale : deviner mieux demanderait de connaître
  la source, ce que le repli universel exclut par construction.
