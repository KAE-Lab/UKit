# 6.1-E — Finitions d'interface

> **Jalon livré le 2026-09-04** — code, tests et documentation ; la vérification sur appareil suit le
> plan de test ci-dessous, sur les **deux** plateformes (leçon de [6.1-D](6-1-d-publication.md)). Les
> écarts entre ce texte et ce qui a été livré sont dans [Écarts constatés](#écarts-constatés), en
> bas : le texte au-dessus reste tel qu'il a été écrit.
>
> Portes vertes : `tsc`, `npx eslint .` à **zéro**, **562 tests** (550 + 12), parité 13/13,
> `expo-doctor` 18/18 — et, ce jalon touchant au natif, **le paquet est construit pour les deux
> plateformes** (`npx expo export`, 7,07 Mo Android et 7,04 Mo iOS). Cette porte-là n'est pas
> décorative ici : `tsc` et Metro ne partagent pas leur couche TypeScript
> ([qualite.md](../qualite.md)), et c'est le paquet — pas le typage — qui prouve que les trois
> modules ajoutés se résolvent, que les directives `'worklet'` passent Babel, et qu'aucun import du
> slider ou de `bottom-tabs` ne survit.

> **Le jalon des détails qui séparent « ça bugue » de « ça charge ».** Tout ce qui suit est
> fastidieux et ne demande aucune décision en cours de route — c'est précisément pourquoi il se
> fait en une passe, écran par écran, avec un inventaire au départ et une capture à l'arrivée.

## La direction

Trois décisions, prises le 2026-09-02, cadrent la passe :

1. **Aucun entre-deux.** Un rendu qui imite le système sans être le système fait amateur. Donc pas
   de « verre » approximatif, pas de composant natif à moitié habillé.
2. **Nos propres contrôles, sur les deux plateformes.** Le `Switch` et le `Slider` natifs d'Android
   ont l'air d'un autre âge à côté de ceux d'iOS 26 ; plutôt que de courir après deux systèmes,
   l'application dessine les siens — une seule apparence, celle du socle visuel 6-K, sur les deux
   plateformes. L'évaluation Material 3 du backlog est close par cette décision.
3. **Les surfaces flottantes gardent leur traitement actuel** (flou sur iOS, dégradé opaque sur
   Android, décision de la vérification Android). Les onglets natifs et `@expo/ui` sont notés pour
   la 6.2, quand ils auront mûri ; ils changeraient la navigation, pas une finition.

## Ce qu'il faut ramasser en chemin — trois défauts trouvés le 2026-09-04

Ils viennent de la vérification appareil du jalon [6.1-D](6-1-d-publication.md) et sont détaillés au
[registre](../defauts-fonctionnels.md). Ils entrent ici plutôt que dans une session à part **parce
qu'ils vivent dans les fichiers que cette passe ouvre de toute façon** — l'inventaire des indicateurs
et celui des contrôles les désignent tous les trois. Les traiter séparément ferait rouvrir les mêmes
écrans deux fois.

| Défaut | Où | Ce qu'il partage avec cette passe |
|---|---|---|
| **Le réessai ramène l'écran de chargement plein** — la garde de [6.1-A](6-1-a-robustesse-scolarite.md) ne retient la page que pour une session partie du *formulaire*, pas pour un réessai lancé depuis l'encart d'échec | `ScolariteDashboard`, `useSessionDepuisLeFormulaire` | `ScolariteLoginView`, `TuileScolarite` et `WidgetRow` sont dans les onze fichiers à indicateur |
| **La tuile d'établissement des Réglages reste sur l'ancien campus** — l'état est local à l'écran, alors que `SettingsManager` émet déjà son événement | `SettingsScreen` | **le même fichier** que le `Switch` et le `Slider` à redessiner |
| **« Se déconnecter » ne ferme pas la session distante quand un widget tourne** — la réservation du moteur est refusée et personne ne le dit | `fermerSessionDistante`, `MoteurNavigateur` | la fiche du compte, dont les états de chargement sont dans le périmètre |

Deux des trois ont la **même cause de fond**, et c'est le contrôle à faire en les corrigeant :
[6.1-A](6-1-a-robustesse-scolarite.md) a donné un **second hôte** à un geste — le choix
d'établissement, le réessai de session — en remontant le composant partagé dans `shared/ui` **sans
rendre observable l'état qui l'entoure**. Chaque fois qu'un geste gagne un second point d'entrée, la
question à se poser est : *et l'état, il suit ?*

## Ce qui est livré

### Les chargements parlent

Un composant `ChargementPleinePage` — indicateur, une phrase, et une seconde ligne qui n'apparaît
qu'après quatre secondes (« Le serveur de l'université est lent ce matin ») — remplace chaque
`ActivityIndicator` pleine page. Inventaire au départ (onze fichiers en portent un) ; chaque
remplacement porte sa phrase, dans les trois dictionnaires :

| Écran | La phrase |
|---|---|
| Planning, premier chargement | « Ton emploi du temps arrive… » |
| Salles libres | « On cherche les salles libres… » |
| Listes Campus (restos, BU) | « On regarde ce qui est ouvert… » |
| Documents | « On ouvre la pièce… » |
| Navigateur intégré | « Le portail se charge… » |
| Étape groupes de l'accueil | « On récupère la liste des groupes… » |

### Les apparitions en fondu

Un composant `ApparitionEnFondu` (opacité et léger glissement, 200 ms) posé à chaque couture où un
écran passe de « chargement » à « contenu » : widgets Scolarité, listes et sections Campus, premier
rendu du Planning. Pas d'interrupteur global — `LayoutAnimation` fondrait aussi les frappes et les
défilements — et la règle d'usage de `shared/ui/transitions.ts` reste : les bascules de structure
seulement.

### Les contrôles dessinés

`Interrupteur` et `Curseur` dans `shared/ui`, dessinés avec Reanimated (déjà en dépendance) :
piste, poignée, course animée, retour haptique léger, jetons de couleur des deux thèmes, états
désactivés, accessibilité (`role`, `accessibilityState`). Ils remplacent les deux usages du
`Switch` natif et le `@react-native-community/slider` des Réglages ; la dépendance du slider sort.

### Le glissement entre onglets

Le navigateur d'onglets passe par un pager (`react-native-pager-view`) ; la barre flottante reste
la même. Le glissement est **activé par écran** : Planning et Campus, dont le contenu glisse déjà
horizontalement (jours, carrousels), le désactivent ; Scolarité et Réglages l'acceptent. Un
conflit de gestes constaté sur appareil est un motif de retrait, écrit dans les limites.

## Plan de test

Chaque écran de l'inventaire, dans les deux thèmes, sur les deux plateformes : le chargement
parle, le contenu apparaît en fondu, les contrôles répondent au doigt et à l'accessibilité, le
glissement entre onglets ne vole aucun geste aux carrousels.

## Limites écrites

- **Les contrôles dessinés ne suivent pas le système.** Une personne qui a réglé son téléphone
  pour des contrôles plus grands ne les verra pas grandir ; c'est le prix d'une apparence unique.
- **Le glissement entre onglets peut être retiré** si les gestes se battent : la barre flottante
  reste la navigation de référence.
- **Le fondu n'accélère rien.** Il rend le temps d'attente lisible, il ne le raccourcit pas —
  c'est [6.1-D](6-1-d-publication.md) qui le raccourcit.

## Écarts constatés

Ce que la carte du code a corrigé dans le texte ci-dessus, et les décisions prises en chemin.

**L'inventaire des onze fichiers était juste, sa lecture ne l'était pas.** Onze fichiers portent bien
un `ActivityIndicator`, mais **cinq seulement occupent l'écran**, dont `LoadingState` lui-même. Les
six autres sont des indicateurs **en ligne** qui restent : le bouton de connexion, celui du lien
d'emploi du temps, le coin d'une tuile, la droite d'une rangée, le bouton de réglage en cours de
synchronisation. Ils ne se remplacent pas — un bouton n'a pas de phrase à dire, il a un libellé.

**`ChargementPleinePage` est un composant à part, et `LoadingState` a perdu sa variante plein
écran.** Le texte disait « remplace chaque `ActivityIndicator` pleine page » sans dire où vivrait le
remplaçant. Une variante de plus sur `LoadingState` aurait reproduit exactement le défaut qu'on
corrigeait : la phrase y était **possible depuis 6.1-A**, donc facultative, donc absente des trois
sites plein écran. Elle est maintenant **obligatoire dans le type**, comme le titre d'`EmptyState` —
c'est le compilateur qui garantit qu'aucun écran n'en oublie, pas une liste à cocher.

**Le registre des phrases est impersonnel**, décision du propriétaire du produit le 2026-09-04. Les
phrases du tableau ci-dessus disaient « On cherche… », « On regarde… » ; or
[i18n.md](../i18n.md#le-ton-deuxième-règle--lapplication-ne-parle-pas-delle-à-la-première-personne)
tranche depuis le 2026-08-29 que l'application ne parle jamais d'elle à la première personne. Une clé
de 6.1-A avait déjà glissé (« On récupère la liste des établissements… ») : elle est **réalignée** au
passage, et sa voisine `GROUPS_LOADING` était déjà impersonnelle.

**Deux phrases de patience, pas une.** `LOADING_PATIENCE` par défaut, et
`LOADING_PATIENCE_UNIVERSITY` pour ce qui dépend d'un serveur d'université — le Planning, le portail,
la liste des groupes. Dire « le serveur de l'université est lent » devant un menu de restaurant
accuserait la mauvaise source.

**Le fondu ne se pose pas sur les listes ni les sections Campus**, contrairement au texte, et c'est
mesuré plutôt que jugé : leurs cartes passent toutes par [`Card`](../../src/shared/ui/Card.tsx), qui
**fond déjà à l'entrée** (`FadeIn`, depuis 6-K). Envelopper le conteneur aurait empilé deux
animations sur les mêmes pixels — l'entre-deux que la direction 1 de ce jalon refuse. Le fondu va
donc là où il manquait vraiment : les **valeurs de widgets** (tuile et rangée, sur la nature de
l'état) et le **premier rendu du Planning**, dont les cartes de cours n'ont aucune animation
d'entrée. Le Planning ne fond qu'**une fois par montage** : fondre à chaque changement de jour ferait
clignoter l'écran le plus utilisé de l'application.

**La piste de l'interrupteur est une pilule, et c'est une exception écrite.** La règle des formes
réserve `radius.pill` « à ce qui compte ». Un interrupteur n'est pas une **surface** — il n'héberge
aucun contenu —, c'est un indicateur à remplissage, de la famille de `ProgressBar`, où la couleur
*est* la valeur. Le rayon se **calcule** (`hauteur / 2`), comme celui d'une jauge. La décision est
dans [theme.md](../theme.md#les-décisions-durables) pour qu'une session ne la défasse pas.

**L'interrupteur s'actionne par un appui, pas par un glissement**, et trois raisons le décident :
l'extinction de la synchronisation calendrier ouvre une **confirmation** au lieu de basculer, donc
une poignée qu'on ferait glisser devrait revenir en arrière ; l'écran Réglages **accepte le
glissement d'onglet** livré par ce même jalon, et deux gestes horizontaux s'y disputeraient le doigt ;
et les lecteurs d'écran activent par un appui. Corollaire : le contrôle est **piloté** — la poignée
suit la prop, jamais l'appui — et le retour haptique acquitte le **geste**, pas la transition de la
valeur, sinon la confirmation d'une modale ferait vibrer un interrupteur que personne n'a touché.

**Un seul jeton de thème a été ajouté**, `settings.switchThumb`, partagé par les deux contrôles. Le
texte annonçait aussi des couleurs d'état désactivé : le dépôt dit « désactivé » par la
**transparence** (la rangée de réglage, le bouton de navigation), et un jeton de plus aurait ouvert un
second vocabulaire. Le curseur ne prend pas non plus `theme.primary` / `theme.border` comme le
faisait le slider natif : les deux contrôles partagent **un neutre, un actif, une poignée**, et ces
trois-là vivent dans `settings`.

**Le navigateur d'onglets est un `createMaterialTopTabNavigator`**, ce que le texte ne pouvait pas
dire : `react-native-pager-view` est le moteur de pager, mais React Navigation ne l'expose qu'à
travers ce navigateur-là (via `react-native-tab-view`). `tabBarPosition: 'bottom'` garde la barre en
bas, `CustomTabBar` est inchangé — elle est positionnée en absolu, donc elle survole le pager comme
elle survolait le conteneur d'onglets. Trois options ont dû changer de nom (`headerShown` disparaît,
`tabBarIcon` perd son `size`, `tabBarTestID` devient `tabBarButtonTestID`), et
**`animationEnabled: false` est obligatoire** : animé, un appui d'onglet *traverse* les pages
intermédiaires que `lazy` n'a pas montées, et l'on verrait deux fonds vides défiler. Le glissement au
doigt, lui, reste animé nativement.

**`@react-navigation/bottom-tabs` sort avec le slider.** Il n'était importé que par le navigateur
d'onglets.

**Les neuf pixels hors échelle de 6.1-C sont arbitrés ici**, sur décision du propriétaire du produit
le 2026-09-04 — le texte ne les nommait pas, et deux commentaires du code renvoyaient pourtant à ce
jalon. Huit passent à l'échelle, un est **examiné et conservé**. Voir
[Les neuf pixels](#les-neuf-pixels-hors-échelle) ci-dessous.

**Trois seuils ESLint ont été franchis en chemin, et chacun a produit un découpage plutôt qu'une
désactivation** : `rafraichirWidgets` a sorti son application de résultat (`appliquer`) et son
prédicat d'abandon, `useWidgets` a sorti la tenue de ses valeurs (`useValeursDeWidgets` : ce qui
**sait** contre ce qui **décide**), `CampusListLayout` a sorti son état d'attente
(`AttenteDeLaListe`), comme `Surcouches` avant lui.

**Un piège de compilation vaut d'être noté** : lu deux fois autour d'un `await`, TypeScript affine
`signal.aborted` à partir du premier test et déclare le second inutile — alors que c'est précisément
pendant cette attente que l'abandon arrive. La lecture passe donc par une fonction nommée.

## Ce que la vérification sur appareil a ajouté

Deux retours du 2026-09-04, tous deux devenus des règles plutôt que des retouches.

**Un chargement bref ne montre rien.** Le premier essai posait l'indicateur dès la première
milliseconde d'attente : sur un changement de jour du Planning, qui prend quelques dizaines de
millisecondes, il apparaissait et disparaissait aussitôt — *« ça fait comme un flash pas très
agréable »*. C'est juste, et c'est une convention connue : en deçà d'un dixième de seconde une
réponse est perçue comme **instantanée**, et un indicateur n'a donc rien à dire avant que l'attente ne
devienne perceptible. **300 ms de silence** avant tout indicateur, dans les deux composants
d'attente ([`indicateurRetarde.ts`](../../src/shared/ui/indicateurRetarde.ts)).

L'autre moitié de cette convention — garder l'indicateur un temps **minimum** une fois montré, pour
qu'il ne clignote pas non plus en sortant — est **écartée**, et c'est la décision qui vaut d'être
écrite : elle retarderait l'arrivée du contenu, c'est-à-dire qu'elle rendrait l'application plus lente
pour qu'elle en ait l'air moins, un jalon après que [6.1-D](6-1-d-publication.md) a passé une campagne
à retirer des secondes. Le clignotement de sortie se traite sans rien ralentir : l'indicateur
**apparaît en fondu**, donc une apparition de cinquante millisecondes n'atteint jamais sa pleine
opacité.

**La poignée des contrôles se détachait mal en thème clair.** Blanche sur une piste gris clair, avec
l'ombre `shadow.sm` calibrée pour une carte sur fond de page, elle se fondait. La situation n'est pas
la même — une poignée se détache d'une **surface colorée qui porte la valeur**, pas d'un fond neutre —
et l'ombre est donc plus marquée, nommée une fois pour les deux contrôles
([`controles.ts`](../../src/shared/ui/controles.ts)), sa couleur restant celle des tokens.

**Le glissement a été ouvert aux quatre onglets**, alors que la spécification le réservait à la
Scolarité et aux Réglages. La restriction supposait un conflit avec les gestes horizontaux du
Planning et du Campus ; l'appareil a démenti : une liste horizontale **consomme** le geste qui
commence sur elle, et le pager ne reçoit que ce qu'elle laisse passer. Restreindre coûtait donc plus
que ça ne protégeait — un geste qui marche sur deux onglets sur quatre s'apprend comme un défaut, pas
comme une règle.

**Et il a révélé un défaut ancien du Planning.** Revenir sur l'onglet déclenche un rafraîchissement
qui vidait la journée avant de la redessiner **identique**. Le défaut existait depuis toujours ; un
changement d'onglet instantané ne laissait simplement pas le temps de le voir, là où un glissement
montre la page d'arrivée **pendant** le geste. L'écran ne se vide plus que lorsque le chargement porte
sur autre chose — un autre jour, un autre groupe —, et une relecture de la même clé garde son contenu
sans indicateur ni fondu ([planning.md](../features/planning.md)).

Deux autres retours d'appareil ont été traités : la **poignée** des contrôles se fondait sur une piste
gris clair en thème clair (ombre plus marquée, nommée une fois pour les deux contrôles), et le
**spinner du tirer-pour-rafraîchir** disparaissait sur fond noir — il prenait `fontSecondary`, qui
vaut la même valeur dans les deux thèmes. Défaut préexistant, corrigé ici parce qu'il tombait sous les
yeux.

**Deux défauts visuels de la Scolarité ont été trouvés en vérifiant le réessai**, et le second était
caché par le premier. L'en-tête à bandeau posait le titre, la pastille d'état et le filigrane **sur
une même ligne** quand il n'y avait pas de dossier ; en les séparant, on voit que le filigrane
**sautait** de la ligne du titre à celle de la salutation au moment où la lecture aboutissait. La
règle qui ferme les deux : **le bandeau n'existe que pour une page qui a un dossier à saluer**, le
titre flotte sinon, du gabarit de Campus et des Réglages. La branche « sans dossier » de l'en-tête à
bandeau devient inatteignable et disparaît — un défaut de rendu qu'on supprime en supprimant l'état
qui le produisait.

**Et la grille des widgets revenait vide sous la barre du réessai** : relancer efface l'échec, donc la
condition qui la masquait repassait. Une session qui court sans dossier n'a toujours rien à montrer.

**Et la vérification a trouvé un défaut qui n'était pas dans ce dépôt.** Le premier parcours froid de
Bordeaux INP échouait systématiquement, le réessai passait. Deux sondes l'ont cerné **sans rien
publier** — l'interrupteur de livraison sert exactement à ça : jouer le socle embarqué, modifié en
local, sur l'appareil. La première a écarté le plafond d'attente, la seconde a montré que le même
parcours passait dès que la WebView était rendue visible. Une WebView cachée l'était aussi pour
WebKit, qui cessait de donner à la page de quoi finir sa cascade SSO. Corrigé dans le moteur
(Aetherius 0.5.7 — la 0.5.6 laissait la vue *derrière* le contenu, donc occultée, donc toujours
ralentie ; elle a été publiée sur un faux positif de session chaude, et le registre le raconte). Une
**seconde panne se cachait derrière la première** et n'est apparue qu'une fois celle-ci levée : la
première des quatre lectures complémentaires du dossier INP n'avait pas la pause de protection que
ses trois sœurs portent, et son opération se perdait. L'hypothèse de départ — les navigations bonus —
était **fausse sur la cause première** :
le chrono par pas de [6.1-D](6-1-d-publication.md) l'a dit en une ligne. Détail au
[registre](../defauts-fonctionnels.md).

## Les neuf pixels hors échelle

Ils venaient de la passe [6.1-C](6-1-c-passe-de-code.md), qui les avait désactivés localement en
écrivant chaque fois la même phrase : *« écart mesuré à l'inventaire visuel, hors échelle assumé, la
passe ne déplace pas un pixel »*. C'est ce jalon qui les arbitre.

| Où | Avant | Après |
|---|---|---|
| les trois calages de l'en-tête ([`NavHelpers`](../../src/shared/navigation/NavHelpers.tsx)) | `paddingTop: 10` | `space.sm` (8) |
| le libellé d'onglet ([`MainTabNavigator`](../../src/shared/navigation/MainTabNavigator.tsx)) | `fontSize: 10` | `fontSize.xs` (12) |
| le bouton de tiroir ([`Button`](../../src/shared/ui/Button.tsx)) | `paddingVertical: 3` | `space.xs` (4) |
| la barre du navigateur intégré | `marginHorizontal: 5` | `space.xs` (4) |
| la pastille des cours simultanés | `paddingHorizontal: 6` | `space.sm` (8) |
| l'interligne des plats, et l'écart icône → texte d'un menu | `6` deux fois | `space.xs` (4) |
| l'étoile de favori des cartes Campus | `marginLeft: 6` | `space.xs` (4) |
| le calage optique d'une icône de fiche de cours | `marginTop: 1` | **conservé** |

Le dernier n'est pas une exception de confort : ce n'est pas un espacement mais un **calage optique**
sur la ligne de base d'un texte, aucun pas d'échelle ne lui correspond, et l'arrondir à 0 ou à 4
décalerait l'icône visiblement. Sa désactivation locale reste, avec cette raison écrite.

Les trois « 6 » du menu et de l'étoile ferment au passage la divergence **3.5** de
[l'inventaire visuel](../inventaire-visuel.md) — l'écart icône → texte valait tantôt 4, tantôt 6, et
l'inventaire laissait la question à « une session d'écran ». C'est 4.

Il ne reste plus dans `src/` que **deux** désactivations de la règle de style : celle-ci, et une
valeur calculée `(50 - 22) / 2` dans le formulaire de lien.

## Les trois défauts, et ce que leur correction a appris

**Le réessai ne ramène plus l'écran plein** — et le drapeau a changé de nom, parce qu'il portait le
mauvais concept. `useSessionDepuisLeFormulaire` est devenu
[`useSessionDemandeeIci`](../../src/features/Scolarite/hooks/useSessionDemandeeIci.ts) et rend une
**origine** (`formulaire` ou `page`) au lieu d'un booléen : la règle voulue n'a jamais été « la
session vient du formulaire » mais « la session vient d'un geste de l'utilisateur **sur cet
écran** ». Le geste s'annonce dans le `onPress` de « Réessayer », **jamais dans `retrySession`** : un
parcours froid repart aussi tout seul au retour au premier plan après une annulation, et cette
reprise-là n'est pas un geste — elle doit garder l'écran plein, qui est le bon rendu quand il n'y a
rien à préserver.

La fiche du compte, second hôte de la même garde, **n'avait pas le trou** : elle n'a aucune branche
plein écran, sa progression se pose en carte à la place des trois boutons. Le registre gagne en
revanche une entrée : elle ne dit **pas** l'échec d'un parcours froid — six tirets et rien qui
explique — parce qu'elle ne lit pas `sessionFailure`.

**La tuile d'établissement des Réglages** : `institutionName` **sort de l'état** au lieu de gagner un
abonnement. L'écran suit déjà `AppContext.etablissement`, donc il se rend à nouveau à chaque bascule,
et ses trois voisins de la même section (`etablissementRetire`, `sourceEdt`, `lienEdtActif`) se
calculaient déjà au rendu. Un abonnement de plus aurait recréé le même risque un champ plus loin ;
supprimer l'état rend le défaut **impossible à réintroduire**.

**« Se déconnecter » sous contention** : la cause est plus précise que le registre ne pouvait le dire,
et elle tient en une frontière d'`await`. `attendreSonTour` sortait dès qu'elle voyait le moteur
libre, **puis** `surLeNavigateur` testait `enCours` — un tour de micro-tâches plus tard. Une lecture
d'arrière-plan qui patientait sur le même run, inscrite avant la session donc réveillée avant elle,
réservait pendant ce tour. La session se réveillait sur un moteur repris et rendait `{ ok: false }`
**sans avoir jamais joué son Blueprint** : exactement la trace du 2026-09-04, une seule ligne « prend
la main », le widget suivant réussi, et aucun chrono pour la déconnexion.

Le test **et** la réservation tiennent désormais dans le même tour de boucle, et un test le
verrouille — il échoue sur l'implémentation d'avant, ce qui est la seule façon de savoir qu'il décrit
bien le défaut. Trois autres pièces complètent la garantie : la **série de widgets est annulable**
(un `AbortController` par série, que le runner lit déjà), la déconnexion **l'arrête et attend sa
mort** avant de réserver — abandonner ne rend le verrou qu'au `finally` du run, un tour plus tard —,
et `fermerSessionDistante` **dit ce qu'elle n'a pas fait** : quatre issues nommées, dont
`MOTEUR_OCCUPE`, qui sépare enfin « le portail n'a pas répondu » (acceptable) de « on n'a même pas
essayé » (inacceptable).

Deux gardes ont été ajoutées au runner en chemin, et elles valent au-delà de ce défaut : **rien n'est
appliqué après un abandon**. Un run qui franchit son dernier pas une milliseconde avant l'abandon rend
`ok: true`, et sans elles la valeur d'un compte qu'on vient d'effacer se réécrivait dans le trousseau
— ce que `deleteWidgets` existe précisément pour empêcher. Le chaînage du certificat est gardé de la
même façon : une série **interrompue** ne l'enchaîne plus.
