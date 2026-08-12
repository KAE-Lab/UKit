# 6-G — Le multi-établissement

> **Jalon livré** — 2026-08-10. Le catalogue est en base et pilote l'interface, les Blueprints de
> portail vivent sous `ukit.portail.`, le registre est configuré en opt-in avec son préfixe et son
> périmètre de secrets, et **Bordeaux INP est en ligne — ajouté sans release**, son portail écrit et
> joué contre un compte étudiant réel. Les écarts entre ce texte et ce que la mesure a imposé sont
> rassemblés dans [Écarts constatés](#écarts-constatés), en bas de page.

> Ajouter une université devient une ligne en base et un Blueprint publié. C'est le gain produit que
> les six jalons précédents rendent possible.

## Objectif

Le catalogue des établissements vit en base et pilote l'interface. Les Blueprints de portail sont
namespacés par établissement, et le registre sait en **ajouter** à distance — la seule garde
d'Aetherius qu'il faut lever, en opt-in et bornée. Un second portail réel est livré et vérifié.

## Dépendance : le jalon 3-H d'Aetherius

Le registre refuse, par construction, qu'un manifeste distant ajoute un Blueprint absent du binaire.
La raison est bonne : elle garantit un repli hors ligne **pour chaque** Blueprint, et elle empêche un
manifeste compromis d'introduire du comportement que personne n'a relu.

Elle ne tient plus dès qu'on veut étendre plutôt que corriger. Un portail que l'application n'a
jamais livré n'a **pas** de repli hors ligne à préserver — il n'existe pas encore pour l'utilisateur.
La seconde raison, elle, reste entière, et c'est pourquoi la levée est encadrée :

- **opt-in** : l'application demande explicitement cette capacité ;
- **bornée par un préfixe de noms réservé** (`ukit.portail.`) : rien d'autre ne peut apparaître ;
- **bornée par le périmètre de secrets** de l'application : un portail ajouté à distance ne peut
  déclarer que les secrets que l'application sait fournir, c'est-à-dire les identifiants
  universitaires, et rien d'autre ;
- **soumise aux mêmes gardes** que le reste : validation complète, empreinte, `min_engine`, act
  portable.

La spécification vit dans le dépôt voisin : `docs/phase-3/3-h-portails.md`. **Elle doit être livrée
avant de commencer ce jalon** — c'est la seule dépendance inter-dépôt de la phase, et la traiter en
retard ferait attendre tout le jalon.

Ce que cela change au modèle de menace est écrit là-bas, et se résume ici : un publieur compromis
pouvait déjà livrer un Blueprint malveillant sous un nom existant. Pouvoir en ajouter un ne change
pas la nature du risque, seulement le nombre de portes — et le périmètre de secrets reste la vraie
limite du rayon.

## Ce qui est livré

### Le catalogue

La table `etablissements` posée en [6-B](6-b-supabase.md) est remplie et branchée :

| Colonne | Rôle |
|---|---|
| `code` | identifiant court, celui qui compose les noms de Blueprints (`bordeaux`, …) |
| `nom`, `ville`, `logo_url` | ce que l'écran affiche |
| `actif` | un établissement se retire sans release |
| `portail_dossier`, `portail_messagerie` | les noms des Blueprints à jouer, ou `null` si l'établissement n'a pas ce service |
| `libelles` | les intitulés propres à l'établissement (« numéro étudiant », « INE », …) |
| `celcat_domaine`, `celcat_res_types` | ce qui fait varier les Blueprints d'emploi du temps |
| `bibliotheques_points` | les points de balayage des BU, qui étaient une liste en dur |
| `services` | les adresses ouvertes par le navigateur intégré (ENT, webmail, CAS, Apogée) |
| `ordre` | l'ordre d'affichage ; le nom départage à valeur égale |

L'écran de sélection lit cette table, avec le socle embarqué en repli — même modèle que partout
ailleurs dans la phase : **au premier lancement, hors ligne, l'établissement historique doit être
sélectionnable.**

Les lignes vivent dans [`supabase/etablissements.sql`](../../supabase/etablissements.sql), rejouable
comme le schéma. Une ligne s'écrit **entière** : côté application elle *remplace* l'entrée au lieu de
la fusionner champ par champ, à l'inverse de `batiments`. La différence est de sens — là-bas un nul
veut dire « je ne touche pas à ce champ », ici il veut dire « ce service n'existe pas », et il doit
donc gagner. Sans cela, on ne pourrait jamais **retirer** une messagerie devenue inextractible.

### Les Blueprints namespacés

`ukit.scolarite.dossier` devient `ukit.portail.bordeaux.dossier`. Les Blueprints d'emploi du temps
et de campus suivent la même règle **quand ils varient par établissement** ; ceux qui n'en dépendent
pas (Croustillant est national, Affluences aussi) gardent leur nom.

Le préfixe n'est pas cosmétique : c'est lui que le registre autorise à s'étendre, et c'est donc lui
qui définit ce qu'un manifeste peut ajouter.

**Celcat n'a pas été namespacé, et c'est le premier écart.** Ce qui varie d'une université à l'autre
n'y est pas le *parcours* mais deux **valeurs** — l'hôte et les codes d'inventaire. Les six fichiers
`ukit.celcat.*` les reçoivent donc en **entrées**, alimentées par la ligne de catalogue, et restent un
seul jeu. Les dupliquer par établissement aurait multiplié six fichiers identiques à deux chaînes
près, c'est-à-dire six occasions de n'en corriger que cinq. Les valeurs par défaut restent celles de
Bordeaux, ce qui garde chaque fichier jouable seul depuis un poste.

Les portails, eux, sont bien un par établissement : rien n'y est générique, et le second l'a prouvé
plutôt que supposé (voir [Écarts constatés](#écarts-constatés)).

Les fichiers **hors socle** vivent dans [`blueprints/portails/`](../../blueprints/portails/), que
`blueprints/index.ts` n'importe pas. Le dossier rend la différence visible à la racine du dépôt, et
le script de publication y applique une garde de plus : un fichier hors socle **doit** être sous le
préfixe réservé, sinon la publication s'arrête. C'est la garde symétrique de celle de l'appareil —
publier un fichier que le registre ignorera est une erreur qu'il vaut mieux voir dans un terminal.

### Le parcours utilisateur

- **Onboarding** : le choix de l'établissement gagne son écran, **juste avant celui des groupes**
  qu'il conditionne. Ce texte annonçait la première position, avant le thème et la langue ; l'ordre a
  été corrigé en jouant le parcours (voir [Écarts constatés](#écarts-constatés)).
  [`WelcomeScreen`](../../src/features/Onboarding/WelcomeScreen.tsx) gagne un écran, et l'étape des
  groupes disparaît quand l'université n'a pas d'emploi du temps.
- **Réglages** : on peut changer d'établissement. Le changement purge les caches liés (groupes,
  bâtiments, planning) et déconnecte la session universitaire — mêler les données de deux facs serait
  pire que de tout redemander.
- **Migration silencieuse** : une installation existante est réputée `bordeaux`. Aucun écran, aucune
  question. Le code de migration vit à côté de celui de `groupName` → `favoriteGroups`, dans
  [`AppCore.tsx`](../../src/shared/services/AppCore.tsx), et il reste tant que des installations
  anciennes peuvent être mises à jour.

### Le second portail

Un établissement réel, choisi pour ce qu'il apprend et pas pour sa facilité, est ajouté **par
publication seule** : une ligne en base, deux Blueprints publiés, aucune release.

C'est la seule preuve que le mécanisme tient. Un multi-établissement vérifié avec un second
établissement fictif ne prouve rien : les portails universitaires se ressemblent en surface et
divergent partout où ça compte.

**C'est Bordeaux INP**, et il a tenu la promesse de cette phrase au-delà de ce qu'on en attendait.
Un seul Blueprint et non deux, et trois divergences mesurées le 2026-08-10 contre un compte étudiant
réel :

| | Université de Bordeaux | Bordeaux INP |
|---|---|---|
| CAS | Apereo, `input[type=submit]` | Apereo, **`<button id="submitBtn">`** — le sélecteur du premier ne correspond à rien ici |
| Panneau d'erreur | `#loginErrorsPanel` | **le même**, absent de la page propre, présent dès le refus |
| Dossier | `mondossierweb` **GWT** d'Apogée, identifiants positionnels `#gwt-uid-NN` | `mondossierweb` **Vaadin** de PC-Scol, chaque couple dans un `.text-label`, désignable **par son libellé** |
| Messagerie | webmail derrière le CAS, extractible | webmail derrière **SAML** → `portail_messagerie` à `null` |
| Emploi du temps | Celcat interrogeable sans authentification | ADE, non porté → `celcat_domaine` à `null` |
| Identité | `PRÉNOM NOM` en un champ | nom et prénom **séparés**, recomposés par le fichier |
| INE | lu | **absent du dossier** — champ vide, et c'est une limite écrite |

Deux conséquences qui valent d'être retenues. La première : **le second portail est structurellement
moins fragile que le premier**, et ce n'est pas notre mérite — c'est une propriété du produit d'en
face. La seconde : **c'est la sortie qui est le contrat.** Les deux fichiers rendent exactement les
mêmes cinq champs, `ScolariteMapping` n'a pas bougé d'une ligne, et l'application ne sait toujours pas
qu'il existe deux portails.

Un détail mesuré, parce qu'il coûterait une soirée à qui le redécouvrirait : le sélecteur
`:text-is("Nom de famille")` correspond au texte **source**, alors que l'extraction rend le texte
**affiché**, mis en capitales par la feuille de style. L'`assert` compare donc à `NOM DE FAMILLE` et
le sélecteur à `Nom de famille`, dans le même fichier.

## Décisions et pièges

- **Ce qui varie par établissement est une donnée, pas une branche.** Aucun `if (etablissement ===
  'bordeaux')` dans le code applicatif. Ce qui diffère vit dans le Blueprint ou dans la ligne de
  catalogue ; si quelque chose ne peut pas y vivre, c'est le signe qu'il manque une colonne, pas
  qu'il faut une condition.
- **Un établissement peut n'avoir qu'une partie des services.** Une fac sans messagerie extractible
  est un cas normal : le champ vaut `null`, l'écran n'affiche pas la carte. Prévoir l'absence dès le
  premier jour coûte moins cher que de la découvrir au second établissement.
- **Les libellés d'écran restent traduits, les libellés de données viennent du catalogue.** « Numéro
  étudiant » est une chaîne de `Translator` ; le fait qu'une fac appelle ça autrement est une donnée
  de catalogue. Confondre les deux ramènerait des chaînes en dur.
- **Les douze points de balayage des bibliothèques** peuvent rejoindre le catalogue ici — ils sont
  aujourd'hui une liste régionale en dur, ce qui est exactement le genre de constante qui devient
  fausse au second établissement.
- **Ne pas ouvrir le préfixe plus que nécessaire.** `ukit.portail.` et rien d'autre. Un préfixe
  généreux (`ukit.`) rendrait toutes les sources de l'application remplaçables à distance, ce qui est
  précisément ce que la garde d'origine évite.
- **Un service absent n'est pas une panne, et les deux ne s'affichent pas pareil.** C'est la
  distinction que le jalon ajoute au modèle d'erreur : `serviceAbsent()` rend un échec de famille
  `config`, non réessayable, qui porte **son propre message**
  ([`failures.ts`](../../src/shared/aetherius/failures.ts)). « Cette université n'est pas encore
  reliée » et « le portail ne répond pas » appellent deux gestes opposés de la part d'un étudiant ;
  les confondre annulerait le bénéfice de toute la phase sur le seul écran qui compte.
- **Le nom d'une université ne se traduit pas.** Il vient du catalogue et s'affiche tel quel, dans les
  trois langues. Ce sont les libellés d'écran — « Établissement », « Changer d'établissement ? » — qui
  passent par `Translator`.

## Définition de « terminé »

1. ✅ Le jalon 3-H d'Aetherius est livré, publié, et **0.5.3 est épinglé** dans `package.json`.
2. ✅ Le catalogue est rempli et appliqué, les Blueprints sont namespacés, le registre est configuré
   en opt-in avec son préfixe et son périmètre de secrets.
3. ✅ L'écran de sélection existe, à l'accueil et dans les réglages ; le changement purge ce qu'il
   faut purger et laisse ce qui vient de sources nationales.
4. ✅ Une installation existante passe la mise à jour **sans rien remarquer**, session comprise : les
   clés du trousseau n'ont pas bougé, et l'absence de code vaut `bordeaux`.
5. ✅ Un second établissement réel fonctionne, **ajouté sans release**, son portail écrit et joué
   contre un compte étudiant réel — reste à voir arriver la ligne sur un appareil (plan de test).
6. ✅ Un Blueprint hors préfixe, publié au manifeste, est **ignoré** — figé par
   [`delivery.test.ts`](../../src/shared/aetherius/delivery.test.ts), à rejouer sur appareil.
7. ✅ `npx tsc --noEmit` (3 erreurs, base inchangée), `npx eslint .` (11 warnings, base inchangée),
   `npm test` (161), `npm run parity` (11 cas) — tous à leur référence.
8. ✅ Documentation : [scolarite.md](../features/scolarite.md), [onboarding.md](../features/onboarding.md),
   [settings.md](../features/settings.md), [planning.md](../features/planning.md),
   [campus-bibliotheques.md](../features/campus-bibliotheques.md), [backend.md](../backend.md),
   [blueprints.md](../blueprints.md), [sources-externes.md](../sources-externes.md),
   [donnees-et-persistance.md](../donnees-et-persistance.md), [architecture.md](../architecture.md),
   [qualite.md](../qualite.md), `blueprints/README.md`, `supabase/README.md`, le README et le
   CHANGELOG ; plus la spécification ouverte [6-I](6-i-planning-universel.md).
9. ✅ **La campagne sur appareil**, ci-dessous, jouée les 2026-08-10 et 2026-08-11 sur iPhone avec
   deux comptes universitaires réels. Les treize sondes sont passées ; les **huit défauts** qu'elle a
   trouvés sont corrigés et consignés dans [Écarts constatés](#écarts-constatés).

## Plan de test

**Pas de mode avion** : il coupe aussi Metro. Trois outils le remplacent, et ils sont plus précis —
ils distinguent une famille d'échec d'une autre :

- pour dégrader **notre base** : vider `SUPABASE_URL` dans `.env` et relancer Expo (`-c`) ;
- pour dégrader une **source** : pointer un `vars.*` du Blueprint sur `https://127.0.0.1:1/` et
  republier — une adresse qui *refuse*, pas un nom qui ne résout pas ([scolarite.md](../features/scolarite.md#limites-connues)) ;
- le **panneau Blueprints** du menu de développement (sept tapes sur le numéro de version dans
  *À propos*) : version, origine et raison, par Blueprint.

| # | Sonde | Attendu |
|---|---|---|
| 1 | Nouvelle installation | choix de l'établissement en deuxième étape, liste depuis la base |
| 2 | Nouvelle installation, `SUPABASE_URL` vidé | l'établissement historique **seul**, proposé depuis le socle. Ni erreur ni liste vide |
| 3 | Mise à jour d'une installation existante | aucune question, `bordeaux` conservé, groupes et session **intacts** |
| 4 | Changement d'établissement | confirmation annonçant l'effacement, puis caches purgés, session déconnectée, groupes rechargés |
| 5 | Login sur le second portail, compte réel | parcours froid complet, identité affichée |
| 6 | Établissement sans messagerie | l'écran **n'affiche pas la carte**, aucun échec |
| 7 | Établissement sans emploi du temps | le Planning **le dit**, sans bouton Réessayer ; l'accueil saute l'étape des groupes |
| 8 | Second établissement ajouté par publication | apparaît après retour au premier plan, **sans réinstaller** ; son Blueprint passe à « distant » dans le panneau |
| 9 | Blueprint publié **hors** préfixe `ukit.portail.` | ignoré, raison lisible dans le panneau, rien en cache |
| 10 | Blueprint de portail déclarant un secret hors périmètre | **refusé avant le cache**, et distinct du cas 9 (`rejected` contre `ignored`) |
| 11 | Établissement désactivé en base | disparaît de la liste ; un appareil qui l'avait choisi garde son socle **et est prévenu** |
| 12 | Portail pointé sur `127.0.0.1:1` | « le portail ne répond pas », **avec** Réessayer |
| 13 | Mot de passe faux sur le second portail | `LOGIN_FAILED`, message distinct du cas 12, **aucun identifiant écrit** |

Les cas **2, 4, 6, 7, 9, 10, 12 et 13** doivent produire **huit écrans différents**. S'ils convergent
vers « aucun résultat », le jalon n'a rien apporté — c'est le critère de la phase, pas une formule.

## Écarts constatés

Huit, et ils vont dans trois directions : la mesure a simplifié ce que le texte compliquait, la
campagne sur appareil a révélé **huit défauts** — dont un antérieur au jalon que le jalon rendait faux
—, et l'ensemble a ouvert une question de produit que le texte n'avait pas vue et qui a désormais sa
propre spécification, [6-J](6-j-compte-et-sources-par-etablissement.md).

La leçon de méthode, si on n'en retient qu'une : **le second établissement devait être réel.** Sept
des huit défauts venaient de ce que l'application n'avait qu'une forme, celle de Bordeaux, et aucun
n'était atteignable par un test. Un multi-établissement vérifié avec une fac inventée aurait été vert
de bout en bout.

1. **Celcat n'est pas namespacé** — il est *paramétré*. Ce qui varie n'est pas le parcours mais deux
   valeurs, et le catalogue les porte. Six fichiers restent six fichiers. Voir
   [Les Blueprints namespacés](#les-blueprints-namespacés).
2. **Le second portail est un seul Blueprint, pas deux.** Bordeaux INP n'a pas de messagerie
   extractible : `portail_messagerie` vaut `null`, l'écran n'affiche pas la ligne, et rien n'échoue.
   La spécification prévoyait ce cas — elle ne prévoyait pas qu'il tomberait dès le second
   établissement, ce qui est plutôt une bonne nouvelle pour la solidité du modèle.
3. **L'établissement n'est pas la première étape de l'accueil**, contrairement à ce que ce document
   annonçait. Il vient après le thème et la langue, et avant les groupes. L'argument d'origine — « il
   conditionne tout le reste » — ne concerne en réalité que l'étape des groupes ; demander à quelqu'un
   de choisir son université dans une langue qu'il n'a pas encore choisie mettait la charge au mauvais
   endroit. Décidé en jouant le parcours sur appareil.
4. **Trois colonnes ont été ajoutées au schéma** : `celcat_res_types` (annoncée dans le tableau mais
   absente du schéma posé en 6-B), `bibliotheques_points` (les douze points de balayage, que les
   « Décisions et pièges » proposaient de rapatrier) et `services` — celle-ci n'était pas prévue. Les
   quatre adresses du navigateur intégré (`ent`, `email`, `cas`, `apogee`) étaient le **dernier hôte
   bordelais compilé dans un écran** : les laisser en dur aurait envoyé un étudiant de l'INP sur le
   portail de Bordeaux.
5. **Le modèle d'erreur gagne un constructeur**, `serviceAbsent()`. Aucune famille du moteur ne
   décrit « ce service n'existe pas ici » — et c'est normal, puisqu'aucun run n'est parti.
6. **La réinitialisation ne déconnectait pas la session universitaire** — trouvé sur appareil, à la
   quatrième sonde. Le défaut est antérieur au jalon : `resetSettings` n'avait jamais touché au
   trousseau, et ce n'était pas grave tant que l'application ne connaissait qu'une université. Il le
   devient dès que la réinitialisation rouvre un parcours d'accueil qui **redemande l'établissement** :
   on pouvait repartir sur une autre fac en restant connecté au portail de la précédente, c'est-à-dire
   exactement ce que ce jalon existe pour empêcher. La réinitialisation passe désormais par la même
   purge que le changement d'établissement — deux gestes qui effacent la même chose ne doivent pas
   avoir deux définitions de « la même chose ». La purge a déménagé dans
   [`purge.ts`](../../src/shared/etablissements/purge.ts) pour qu'`AppCore` puisse l'appeler sans tirer
   le client de la base sur le chemin de démarrage.
7. **Huit défauts trouvés sur appareil, et corrigés dans le jalon.** Aucun n'était visible autrement :
   ils demandaient tous un second établissement réel, sur un vrai téléphone. Ils se rangent en trois
   familles.

   *Ce qui n'avait qu'une forme, celle de Bordeaux :*
   - le **Planning** affichait « ton planning est vide, cherche un groupe » au lieu de dire l'absence
     d'emploi du temps. Une université sans Celcat n'a **jamais** de groupes favoris : l'état vide
     gagnait donc toujours, avec un bouton menant à une recherche qui ne peut rien trouver. L'ordre
     des branches est inversé ;
   - la section **salles libres** restait affichée : elle se reconstruit depuis les salles du même
     serveur, elle disparaît donc avec lui.

   *Ce qui ne se propageait pas :*
   - le changement d'établissement ne touchait pas les **écrans déjà montés** — au retour à Bordeaux,
     la section des salles libres restait masquée. Le code passe désormais par `AppContext`, à côté du
     thème et des groupes favoris ;
   - la **session universitaire survivait en mémoire**. Le trousseau était bien vidé, mais le provider
     de scolarité est monté au-dessus de toute la pile : il ne se démonte pas à la bascule, et
     l'onglet affichait encore le prénom de l'étudiant de l'autre université. C'est la pire forme du
     défaut que cette phase supprime — une donnée fausse qui a l'air juste ;
   - la **réinitialisation ne déconnectait pas** la session. Le défaut est antérieur au jalon —
     `resetSettings` n'avait jamais touché au trousseau — et sans gravité tant qu'il n'y avait qu'une
     université. Il le devient dès que la réinitialisation rouvre un accueil qui redemande
     l'établissement. Les deux gestes passent maintenant par la même purge ;
   - l'**avertissement de retrait** n'apparaissait qu'au premier geste provoquant un rendu par
     ailleurs — ouvrir la modale. Le rafraîchissement du catalogue ne déclenchait rien. `AppContext`
     porte donc une **révision du catalogue**, bousculée uniquement quand la base publie autre chose :
     la bousculer à chaque retour au premier plan repeindrait l'application pour rien.

   *Ce qui basculait quelqu'un en silence — la famille la plus grave :*
   - un établissement retiré de la base **disparaissait aussi du cache**. Il cessait de résoudre,
     `getEtablissementActif` retombait sur le socle historique, et l'application posait quelqu'un sur
     une autre université sans un mot. Le rafraîchissement **reporte** désormais l'établissement actif
     depuis le cache précédent quand la base ne le publie plus. Et parce que ce report ne joue qu'au
     rafraîchissement suivant — un cache perdu le laisse sans objet —, `etablissementRetire()` couvre
     **les deux causes** : reporté, ou irrésoluble. Le repli reste possible, il n'est plus muet.

   *Et le plus cher, qui n'appartient à aucune des trois :*
   - **le portail INP échouait sur l'appareil alors qu'il passait depuis un poste.** Ses sélecteurs
     utilisaient `:text-is()` et `:nth-match()`, **propriétaires à Playwright** : le moteur Python les
     accepte, le moteur embarqué résout par `document.querySelectorAll` et les rejette comme CSS
     invalide. Le run passait le CAS puis mourait à l'extraction, avec un message sans rapport avec la
     cause. Réécrit en **XPath**, seul langage de sélection que les deux moteurs partagent, et un test
     refuse désormais ces pseudo-classes dans n'importe quel Blueprint du dépôt.

8. **L'emploi du temps du second établissement reste vide**, et c'est le point ouvert. L'INP est sur
   ADE ; son export iCal anonyme existe et a été sondé (220 événements sur une semaine), mais le
   porter demande une capacité que le moteur n'a pas encore — l'extraction ne connaît que `json` et
   `html`, et un `http.request` ne publie pas son corps brut. Le sujet a sa propre spécification :
   [6-I — L'emploi du temps universel](6-i-planning-universel.md), qui dépend d'un jalon à écrire chez
   Aetherius. En attendant, l'onglet Planning **dit** l'absence au lieu d'échouer, et l'accueil saute
   l'étape des groupes.

## Limites écrites

- **Ajouter un établissement reste un travail d'auteur.** Le mécanisme supprime la release, pas
  l'écriture des Blueprints ni leur vérification sur un compte réel de cette université. Sans compte,
  on ne peut pas livrer un portail — et le prétendre serait mentir aux étudiants concernés.
- **Un portail ajouté à distance n'a pas de repli hors ligne** avant d'avoir été résolu une fois.
  C'est la contrepartie assumée de la levée de garde, et elle est sans conséquence : un portail qu'on
  n'a jamais joué n'a rien à quoi retomber.
- **Le périmètre de secrets est le même pour tous les portails.** Un établissement qui exigerait un
  troisième identifiant demanderait une release. C'est voulu : c'est la garde qui empêche un
  manifeste compromis de réclamer le trousseau.
- **Le catalogue ne porte pas de logique.** Un établissement dont le parcours ne rentre pas dans la
  forme prévue demande un Blueprint de plus, pas une colonne de plus.
- **Un établissement sans emploi du temps reste un établissement amputé.** Le dire proprement vaut
  mieux que d'échouer, mais UKit est d'abord une application de planning : tant que
  [6-I](6-i-planning-universel.md) n'est pas livré, Bordeaux INP n'a que sa scolarité et son campus.
  C'est écrit ici plutôt que masqué par un écran optimiste.
- **Le numéro étudiant de l'INP est lu par position** dans le bandeau latéral, faute d'un libellé pour
  l'ancrer. C'est la seule fragilité positionnelle du second portail, et l'`assert` sur les libellés
  de l'état-civil est ce qui la garde : un décalage du bandeau accompagnerait une refonte de la page,
  donc des libellés.
- **Aucune parité automatisée pour un portail**, pas plus qu'au jalon 6-F : elle demanderait des
  identifiants réels dans un harnais. La vérification reste manuelle, sur un compte réel, et elle est
  décrite dans [scolarite.md](../features/scolarite.md#vérifier).
