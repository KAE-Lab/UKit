# Défauts fonctionnels connus

Liste **vivante** des défauts de comportement rencontrés en chemin. Ils ne sont pas du goût : ils se
corrigent, se testent et se cochent comme n'importe quel correctif.

> **Pourquoi ce document est séparé de [l'inventaire visuel](inventaire-visuel.md).** L'inventaire est
> une mesure datée qui ne bouge plus ; cette liste-ci se coche et s'allonge. Et surtout : mélanger un
> défaut fonctionnel à de l'esthétique dans une session de refonte rend la session **invérifiable** —
> on ne sait plus dire quand elle est finie, et c'est la moitié facile qui se fait.
>
> Une session d'écran qui rencontre un défaut fonctionnel l'ajoute **ici** et ne le corrige pas au
> passage, sauf s'il tombe exactement dans son périmètre. La règle est écrite dans
> [CONTRIBUTING.md](../CONTRIBUTING.md#un-travail-visuel-nest-pas-documenté-au-même-endroit).

Ouvert par le jalon [6-K](phase-6/6-k-socle-visuel.md) le 2026-08-16. Le jalon les a **inventoriés**
pour qu'aucune session ne les confonde avec du visuel ; ils ont été corrigés dans la foulée, sur
décision du propriétaire du produit — éponger la dette avant d'ouvrir les sessions d'écran plutôt que
de la leur laisser en travers.

## Ouverts

Les deux suivants ont été **rencontrés** par la session d'écran Scolarité du 2026-08-25, et
volontairement **pas corrigés** : ni l'un ni l'autre ne tombe dans son périmètre, et les traiter en
passant aurait rendu la session invérifiable
([CONTRIBUTING.md](../CONTRIBUTING.md#un-travail-visuel-nest-pas-documenté-au-même-endroit)).

### ~~La date du bloc de salutation est en français, en dur~~ — corrigé le 2026-08-28

`GreetingBlock` portait ses propres tableaux `DAYS` et `MONTHS` en français et composait
« Bonjour »/« Bonsoir » hors de `Translator` : un utilisateur anglophone lisait « Lundi 25 août » sous
une interface traduite.

La date passe par `moment().format('dddd D MMMM')`, donc par la locale que `Translator` pose déjà. Et
la salutation elle-même n'est plus une condition dans un composant mais une **table de règles**
(`features/Scolarite/salutations/`), dont le socle est traduit comme le reste — voir
[La salutation](features/scolarite.md#la-salutation-est-une-règle-pas-une-condition).

Le format de date change, donc le rendu de référence de ce bloc change : c'était la raison qui
retenait le correctif, et elle a été levée en même temps que le bloc était repris de fond en comble.

### ~~Deux écrans poussés démarrent sous la barre de navigation~~ — corrigé le 2026-08-29

`LienEdtScreen` et `DocumentsScreen` posaient leur contenu à `insets.top` seulement, alors que
l'en-tête de l'application est **transparent** et que le contenu glisse dessous : le titre et l'icône
du formulaire se chevauchaient. Deux causes distinctes, et il valait mieux les nommer :

- `LienEdtForm` ajoutait son propre espacement à une valeur qui ne comptait que l'encoche. Il est
  partagé avec le parcours d'accueil, qui n'a **pas** d'en-tête — c'est donc à l'appelant de savoir,
  et la marge lui est désormais passée déjà calculée (`HEADER_OFFSET` pour l'écran, `space.md` pour
  l'accueil) ;
- `DocumentsScreen` traitait `headerPadding` comme un nombre. `withStaticHeader` rend un **objet de
  style** `{ paddingTop, paddingBottom }` : posé dans `paddingTop`, il était ignoré. Il s'étale
  maintenant dans le style, comme le font `AboutScreen` et `CourseScreen`.

La leçon vaut pour le prochain écran poussé : `HEADER_OFFSET` est la seule valeur juste, et
`withStaticHeader` la donne déjà — encore faut-il l'appliquer telle qu'elle est rendue.

### ~~Le bouton de filtre était agrandi de 14 % en permanence~~ — corrigé le 2026-08-29

`NavBarHelper` animait les boutons d'en-tête par une mise à l'échelle `1.14 → 1` au défilement. La
décision de retirer ce rétrécissement avait été prise, mais elle n'avait été appliquée qu'à moitié :
[`useCampusListHeader`](../src/features/Campus/components/hooks/useCampusListHeader.tsx) posait son
propre `headerRight` — qui **remplace** celui de `NavBarHelper` — et en gardait une copie dont le repli
était la **valeur statique 1,14**.

Le bouton de filtre des écrans Campus restait donc agrandi de 14 %, seul de sa barre, sans jamais
s'animer. La mécanique est retirée des deux endroits ; il ne reste que le cadre de hauteur fixe qui
aligne les boutons sur le titre.

La leçon : un `navigation.setOptions({ headerRight })` **écrase** l'habillage de `NavBarHelper`. Ce
qui y est recopié doit être retiré au même moment que l'original, sinon la copie survit à l'intention.

### ~~Le logo d'établissement ne s'est jamais affiché~~ — corrigé le 2026-08-29

Les fichiers étaient bien dans le bucket (`media/etablissements/*.webp`, servis en 200), le socle
portait l'adresse, et l'écran de connexion montrait pourtant **l'icône de repli** depuis le jour de la
publication.

La cause est la règle du catalogue elle-même : **une ligne publiée remplace, elle ne corrige pas**
(`projeterEtablissement`). `logo_url` valait `null` dans les lignes publiées, donc l'adresse du socle
était effacée au premier rafraîchissement — et le repli faisait son travail, silencieusement.

Le piège est propre à cette règle, et il vaut pour toute colonne : **oublier une colonne dans une
ligne publiée ne laisse pas la valeur d'avant, elle la supprime.** Une ligne de catalogue s'écrit
entière, ce que `supabase/etablissements.sql` disait déjà — il fallait l'appliquer.

### ~~Les quatre toasts de l'application étaient muets~~ — corrigé le 2026-08-29

`react-native-root-toast` déclare `RootSiblingParent` **obligatoire au-dessus de React Native 0.62**,
et l'application est en 0.81. L'enveloppe était absente de `App.tsx` : `Toast.show` ne levait pas, il
ne rendait simplement rien.

Trois des quatre messages concernés annoncent un **échec** — un document qu'on n'a pas pu ajouter, des
réglages illisibles, une absence de réseau. Ils n'ont donc jamais été vus. Trouvé en cherchant pourquoi
la confirmation de copie de l'écran du compte ne s'affichait pas.

La confirmation de copie, elle, ne repasse **pas** par un toast : même réparé, il apparaît en bas de
l'écran, loin du doigt, et derrière la barre d'onglets flottante. L'icône devient une coche verte —
là où l'œil est déjà.

### ~~Les boutons d'en-tête avaient cinq tailles~~ — corrigé le 2026-08-29

Le bouton retour valait 50 × 50 avec une icône de 28, les quatre autres 45 × 45 avec des icônes de 24
ou de 26 selon l'endroit. **L'écart ne se voyait pas**, et la raison mérite d'être écrite :
`NavBarHelper` appliquait à tous les boutons latéraux une mise à l'échelle animée dont la valeur au
repos était `1.14` — et 45 × 1,14 fait **51**, c'est-à-dire la taille du bouton retour.

Cette animation ne décorait donc pas, elle **compensait une divergence**. La retirer a rendu l'écart
visible d'un coup : les boutons ont paru rapetisser alors qu'ils prenaient enfin leur taille déclarée.

Un composant unique porte désormais la taille :
[`shared/ui/HeaderButton`](../src/shared/ui/HeaderButton.tsx), 50 × 50, icône 26. Seule la flèche de
retour garde 28 — un glyphe plus léger paraît plus petit à taille égale, et c'est un écart **optique**,
pas une divergence oubliée.

### Deux couleurs de `sectionsHeaders` sont identiques en thème sombre

`theme.sectionsHeaders` porte six teintes catégorielles. En thème **clair**, l'index 0 vaut `#007AFF`
et l'index 4 `#5856D6` — deux couleurs distinctes. En thème **sombre**, les deux valent `#5E5CE6`.

La palette n'y offre donc que **cinq** couleurs distinctes au lieu de six, et deux sections de la
recherche de groupes (Planning) peuvent partager la même en mode sombre. La grille de Scolarité évite
l'index 4 pour cette raison.

C'est vraisemblablement une coquille : la variante sombre du bleu système est `#0A84FF`, et c'est ce
qu'on attendrait à l'index 0. Non corrigé ici — la correction change un rendu du Planning, ce qui est
une décision à prendre pour cet écran-là, pas un effet de bord de celui-ci.

### Les styles composés du thème ne sont pas typés

[`Theme.ts`](../src/shared/theme/Theme.ts) n'emploie pas `StyleSheet.create` : ses styles composés
sont des objets littéraux, donc TypeScript élargit `justifyContent: 'center'` en `string`, qui n'est
plus assignable à un `ViewStyle`. Les appelants historiques ne le voyaient pas parce que leur prop
`theme` n'était pas typée ; le problème **apparaît dès qu'un composant l'est**, ce qui est le sens de
la marche.

Contourné localement et **une seule fois**, dans
[`ConfirmationScolarite.tsx`](../src/features/Scolarite/components/ConfirmationScolarite.tsx), par un
transtypage commenté. Le corriger à la source demanderait de retyper un fichier de données de
1 100 lignes — hors du périmètre d'une session d'écran, et à faire une fois pour toutes plutôt que
trois fois à moitié.

## Limites connues, qui ne sont pas des défauts

- **La précision horaire d'une bibliothèque fermée reste en français.** Le fournisseur ne publie
  qu'une phrase libre (`openingText`), jamais une heure structurée : impossible de la localiser. Elle
  n'est plus **soudée** au statut traduit depuis le jalon 6-K — elle s'affiche à côté, en texte
  secondaire — mais elle reste dans sa langue. À reprendre le jour où la source publiera une heure.

## Corrigés

Les quatre défauts ouverts par le jalon 6-K ont été corrigés le 2026-08-16, deux autres levés en
vérifiant la passe de finition l'ont été le 2026-08-21, et les deux que cette passe visait
explicitement l'ont été le 2026-08-22.

### Le mode sombre choisi à la configuration ne s'appliquait qu'au redémarrage suivant — *corrigé le 2026-08-22*

Signalé par un utilisateur sur la v5.6.1 (Pixel 8, GrapheneOS) : choisir le mode sombre pendant le
parcours d'accueil laissait l'application en clair, et il fallait la redémarrer pour que le choix
prenne. La préférence était pourtant bien enregistrée — c'est ce qui rendait le symptôme déroutant.

**Deux causes, qui se combinaient**, et corriger l'une aurait laissé l'autre :

- **`loadSettings` ne restaurait rien tant que le parcours n'était pas terminé.** Un `return` anticipé
  sur `firstload` sautait le thème et la langue avec le reste. Le raisonnement se défend pour les
  groupes favoris ou l'établissement — ils se choisissent *dans* le parcours, les restaurer par-dessus
  répondrait à sa place — mais pas pour des préférences d'affichage, qui n'attendent pas qu'un
  parcours soit fini pour valoir ;
- **le parcours reposait les valeurs de l'appareil à chaque montage.** Son effet de montage appelait
  `setTheme(getAutomaticTheme())` sans condition : rouvrir l'application au milieu de la configuration
  écrasait donc le choix par le thème du système. Sur un téléphone au thème clair, retour au clair.

Un parcours interrompu n'a rien d'exceptionnel : il suffit qu'Android réclame la mémoire, ce qui est
fréquent sur les systèmes qui gèrent l'arrière-plan agressivement — le rapport vient précisément d'un
appareil de ce genre.

Les préférences d'affichage se restaurent désormais **toujours**, le reste restant réservé à un
parcours terminé ; et les valeurs de l'appareil ne sont posées que lorsque **rien n'a jamais été
écrit**. L'état initial de l'écran part du gestionnaire au lieu de `fr`/`light` en dur, sans quoi un
parcours repris clignoterait en clair le temps d'un rendu.

### Changer d'établissement déconnectait le compte universitaire — *corrigé le 2026-08-22*

Basculer d'une fac à l'autre effaçait les identifiants **et** le dossier froid du trousseau : revenir
à son établissement d'origine obligeait à se reconnecter. Signalé à l'usage.

**Ce n'était pas une régression, mais une décision du jalon [6-G](phase-6/6-g-etablissements.md)**,
prise pour une bonne raison : les identifiants et l'identité appartiennent au portail quitté, et les
garder afficherait le nom d'un étudiant d'une fac sous le nom d'une autre.

Le remède, lui, était le mauvais — et le dépôt avait déjà tranché ce dilemme deux fois. Les groupes
favoris au 6-I, puis les liens d'abonnement au 6-J, ont reçu la correction inverse, et sa
justification était écrite dans le fichier même qui effaçait la session : *« effacer répond à la
mauvaise question, la règle est que les données de deux facs ne se **mélangent** pas, pas qu'il faille
les oublier »*. Un seul élément qui saute quand tout le reste survit ressemble à un défaut, pas à une
règle.

La session est donc **cloisonnée** ([`comptes.ts`](../src/shared/etablissements/comptes.ts)) : le
trousseau porte une table indexée par code d'établissement, on ne lit jamais que l'entrée de
l'établissement actif — donc rien ne se mélange — et un retour retrouve sa session. La déconnexion
explicite ne retire que l'entrée courante ; seule la réinitialisation efface tout.

Deux pièges valaient d'être traités plutôt que découverts. **La conversion** : sans elle, la
correction aurait déconnecté tout le parc installé le jour de sa mise à jour, produisant une fois
exactement le défaut qu'elle supprime. Les clés d'avant sont donc lues une dernière fois, rangées sous
l'établissement sélectionné, puis supprimées — dans cet ordre, une interruption entre les deux ferait
perdre la session. **Et la mémoire** : le contexte de scolarité est monté au-dessus de toute la pile
et ne se démonte jamais. Il oubliait déjà la session au changement, ce qui suffisait tant que la
bascule vidait le magasin ; il doit maintenant **relire** celle de la fac d'arrivée, sans quoi on
redemanderait une connexion là où l'on est déjà connecté.

### Une fiche de cours n'avait pas de carte, pour deux raisons différentes — *corrigé le 2026-08-22*

Ouvrir un cours donné dans le bâtiment `A28` n'affichait **aucune carte**, alors que ce bâtiment est
au référentiel avec ses coordonnées. Aucun message, aucune erreur : la fiche s'affichait simplement
sans son plan, comme si la localisation était inconnue.

Rejoué sur les vraies données Celcat (groupe `INF601A5`, semaine du 2026-01-12), le symptôme unique
avait **deux causes indépendantes**, et corriger l'une aurait laissé l'autre :

- **la vue semaine ne produisait aucune description.** Le serveur formate à l'identique dans les deux
  vues (`\r\n\r\n<br />\r\n\r\n`), `formatDescription` réduit cela à des `;`, et `projeterCours`
  découpait la semaine sur `\n` : il n'en sortait qu'un champ, porteur de la catégorie, donc écarté en
  entier. Plus de ligne de salle, donc plus de carte — ni enseignant, ni semaines. C'était écrit comme
  limite connue et **verrouillé par un test**, au motif que le corriger déplacerait des pixels ;
- **une double espace dans `modules`.** La source rend `"4TIN606U  Histoire et Epistémologie de
  l'Optimisation"` avec deux espaces là où la description n'en a qu'une. La ligne du module n'était
  donc pas reconnue comme une répétition du sujet, elle restait dans la description, et tout glissait
  d'un rang : la « ligne de salle » cherchée au rang 2 devenait le nom de l'enseignant.

Le correctif ne répare aucune des deux heuristiques : il cesse de deviner. **Celcat publie un champ
`sites`** (`["Bâtiment A28"]`) que rien n'extrayait, et c'est la donnée fiable. Les trois Blueprints
de cours l'extraient désormais, la fiche le lit **avant** toute heuristique, et le séparateur passe à
`;` pour toutes les vues — ce qui rend au passage sa description à la vue semaine.

Le test qui « verrouillait » la vue semaine ne vérifiait d'ailleurs pas ce qu'il annonçait : il
passait le séparateur **à la main**, donc il décrivait la fonction et non la vue. Il passait encore
après le changement. Il porte maintenant sur `decouperSemaine`, seul chemin réel.

### Sur iPhone, Face ID n'était jamais tenté — *corrigé le 2026-08-22, à confirmer sur un build*

L'onglet Scolarité et la révélation du mot de passe demandaient directement le **code de l'appareil**,
sans jamais proposer Face ID, alors que l'empreinte se déclenchait normalement sur Android.

Les deux appels passaient `disableDeviceFallback: false`, ce qui demande à iOS la politique
`deviceOwnerAuthentication` — celle qui **autorise** le système à court-circuiter la biométrie. Ce
n'est pas un défaut de la bibliothèque, et aucune option ne rend ce choix prévisible.

Les deux appels vivent désormais dans [`shared/biometrie`](../src/shared/biometrie/index.ts), qui
demande les deux politiques dans l'ordre : biométrie seule d'abord, puis le code en repli — sauf
lorsque la personne a **annulé**, cas où enchaîner reproduirait le défaut dans l'autre sens.

Au passage, un appareil **sans aucun verrou** ne pouvait plus jamais ouvrir cet onglet : toute demande
échouait et l'écran proposait un « Réessayer » qui ne pouvait pas marcher. La porte s'ouvre maintenant
dans ce cas, ce qui est défendable parce qu'elle est un verrou d'interface — le trousseau, lui,
n'exige pas d'authentification.

**La cause est mesurée, et elle est celle qu'on redoutait.** Sonde sur iPhone le 2026-08-22, sous
Expo Go : matériel et enrôlement sont vrais, et le premier temps échoue sur
**`missing_usage_description`** — `NSFaceIDUsageDescription` manque à l'`Info.plist` du conteneur qui
exécute. La couche native résout alors l'échec **sans jamais appeler `evaluatePolicy`**, donc sans
ouvrir la moindre fenêtre : voilà pourquoi personne n'a jamais vu Face ID essayer.

Le conteneur, sous Expo Go, est Expo Go. Celui de UKit porte la clé par deux chemins vérifiés dans
`app.config.ts` — `ios.infoPlist` et l'option `faceIDPermission` du greffon. **La confirmation demande
un `eas build --profile development`** ; le correctif, lui, est exactement celui que ce verdict appelle.

Deux choses trouvées en chemin. La sonde elle-même était fautive : `demander()` **jetait l'erreur du
premier temps** dès que le code finissait par réussir, c'est-à-dire au moment précis où on la
cherchait — la première campagne n'a donc rien pu apprendre. Et `missing_usage_description` **n'est pas
dans le type publié** par la bibliothèque, seulement dans sa couche native : le garde de compilation
qui protège l'union ne voit que la déclaration, pas ce qui est réellement émis.

### Le filtre d'une liste Campus ne remontait jamais au tableau de bord — *corrigé le 2026-08-21*

Changer le filtre des restaurants ou des bibliothèques depuis l'écran de liste ne changeait **rien**
sur le tableau de bord : ses carrousels restaient sur la valeur lue au lancement de l'application,
définitivement — passer en arrière-plan et revenir n'y changeait rien non plus. Constaté sur appareil,
et le symptôme visible était pire que la cause : deux sections vides sous leur en-tête, ce qui se lit
comme une application cassée.

`useSavedFilter` lisait `AsyncStorage` **une seule fois**, dans un `useEffect` dont la dépendance ne
bouge jamais. Deux écrans lisent la même clé — le tableau de bord et la liste complète — et chacun en
a sa propre instance, sans rien entre elles. Une lecture au montage suffisait à la liste, qui se
remonte à chaque ouverture ; elle ne suffisait pas au tableau de bord, qui est un **onglet et ne se
démonte jamais**.

Il lit désormais au `useFocusEffect`, exactement comme
[`useFavorites`](../src/features/Campus/hooks/useFavorites.ts) juste à côté — qui résout le même
problème depuis toujours, et qui est la raison pour laquelle une étoile posée depuis la liste, elle,
était bien à jour au retour. Le rapprochement est ce qui a désigné la cause : deux hooks voisins, une
seule bonne réponse, et un seul des deux l'avait.

**Et une clé jamais écrite rend maintenant la valeur par défaut** au lieu de conserver la dernière
lue : sans ça, le geste « Tout afficher » n'aurait pas survécu à un retour d'écran.

### La section des salles libres avalait l'échec de sa source — *corrigé le 2026-08-21*

`CampusDataManager.fetchBuildingList()` **rend** un `UkitFailure` depuis le jalon 6-K, et
`FreeRoomScreen` le passe à son écran. La **section** du tableau de bord, elle, appelait la même
fonction en ignorant sa valeur de retour : une source morte y devenait un carrousel vide. C'est le
défaut que la Phase 6 revendique d'avoir supprimé, resté dans le seul appelant qu'on n'avait pas
regardé. L'échec n'est retenu que s'il ne reste rien à montrer — un cache peuplé survit à un
rafraîchissement raté, même règle que l'écran.

### Un mot de passe changé à l'université menait à une impasse — *corrigé le 2026-08-16*

`LOGIN_FAILED` reste **non réessayable**, et le raisonnement était juste : rejouer le même mot de
passe donnera le même refus. Mais l'écran de connexion n'apparaissait que si le trousseau était
**vide** — quelqu'un dont le mot de passe avait changé voyait une erreur définitive, sans formulaire,
et devait deviner qu'il fallait passer par les Réglages.

L'échec porte désormais une **action** — « Ressaisir mes identifiants » — et pas un bouton Réessayer.
C'est la distinction que `NoticeAction` portait déjà depuis le jalon 6-J : *réessayer répare une
panne, une action répare une absence*, et un mot de passe périmé est une absence. La condition est
dans [`demandeUneRessaisie`](../src/features/Scolarite/services/ScolariteMapping.ts), à côté de la
table des codes du portail.

**Une première version de ce correctif n'en couvrait que la moitié**, et c'est instructif :
`echecBloquant` exige `coldData === null`. Quand une identité a déjà été lue — le cas le plus
fréquent, puisqu'un mot de passe change *après* une première connexion réussie — le tableau de bord
s'affiche normalement et l'échec se réfugie dans la **ligne de messagerie**, où l'écran plein
n'apparaît jamais. L'impasse restait entière de ce côté-là.

Les deux chemins mènent maintenant au formulaire : l'écran d'échec par son action, et la ligne de
messagerie par son `onPress` — quand elle dit « identifiants incorrects », la toucher doit mener à
les corriger, pas ouvrir une boîte à laquelle on n'a plus accès.

**Et le formulaire est atteignable sans se déconnecter.** L'action ouvre l'écran du compte en mode
ressaisie (`CredentialsSettings` avec `ressaisie: true`), et un bouton « Ressaisir mes identifiants »
y vit en permanence. Passer par la déconnexion effacerait aussi l'identité déjà lue et obligerait à
retaper l'identifiant, pour un mot de passe qui a changé tout seul.

### On ne pouvait pas relancer un parcours froid — *corrigé le 2026-08-16*

Le mode se déduisait de la présence des données froides. `rafraichirDossier()` le force, et vit dans
l'écran du compte, à côté de la déconnexion qu'il remplace. Les données froides ne sont effacées
**que si la session démarre** — même précaution que `validateAndSave`, sinon on les perdrait pour
rien.

### Les salles libres n'avaient pas d'état d'erreur — *corrigé le 2026-08-16*

`CampusDataManager.fetchBuildingList()` avalait l'échec par un `return` nu, alors que
`CampusApiService.fetchRoomList()` le rendait déjà. Il le **remonte** maintenant, et l'écran le passe
à `CampusListLayout` — mais **seulement quand il n'y a aucune donnée** : un cache peuplé survit à un
rafraîchissement raté, sinon une liste complète se présenterait comme une panne.

C'était le dernier endroit de Campus où une source morte devenait une liste vide.

### La police des titres n'était pas chargée — *corrigé le 2026-08-16*

[`App.tsx`](../App.tsx) ne chargeait que `Montserrat_500Medium`, alors que le code demandait
`Montserrat_600SemiBold` **23 fois** — tous les grands titres de page et tous les en-têtes de
section — et `Montserrat_700Bold` une fois. React Native retombait en silence sur la police système :
la typographie affichée n'était pas celle que le code décrivait.

Corrigé **en sens inverse**, et c'est la bonne réponse. Charger les trois graisses a rendu le défaut
visible : la police ne vivait que dans les titres et les en-têtes, jamais dans le contenu, et le
mélange sautait aux yeux dès qu'il rendait vraiment. Montserrat a donc été **retirée entièrement** —
code, chargement, dépendance — et l'application est en police système, où la hiérarchie tient à la
taille et à la graisse. La décision et ses raisons sont dans
[theme.md](theme.md#les-décisions-durables).

C'est le seul de ces correctifs qui change le rendu, et il le change partout à la fois : c'est
pourquoi le jalon 6-K l'avait laissé de côté plutôt que de le traiter en effet de bord.

### Huit libellés Campus s'affichaient en clé brute à l'écran — *corrigé le 2026-08-16*

Le README annonçait « treize libellés d'écrans Campus restent non traduits ». La formulation était
trop douce : huit n'avaient aucun repli, et `Translator.get` rendait alors la clé elle-même —
`SEARCH_BU_CITY` dans une barre de recherche, `NO_RESULTS_FOUND` comme message d'état vide.

Les treize clés sont dans les trois dictionnaires, **et les casts `as Parameters<typeof
Translator.get>[0]` qui les masquaient sont retirés** : le cast existait précisément parce que la clé
n'était pas dans le type, donc il faisait taire le seul mécanisme qui aurait détecté l'oubli. Sans
lui, la quatorzième ne compilera pas.

Les **38 replis en dur** (`|| 'Aucun bâtiment trouvé'`) sont retirés en même temps : ils portaient
tous sur des clés qui existent, donc ne se déclenchaient jamais, et masquaient d'avance le prochain
oubli — en français, quelle que soit la langue choisie.
