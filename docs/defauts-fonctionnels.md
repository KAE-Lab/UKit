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

*Aucun.* Les quatre défauts ouverts par le jalon 6-K ont été corrigés le 2026-08-16, et deux autres
levés en vérifiant la passe de finition l'ont été le 2026-08-21 ; ils sont plus bas, sous
[Corrigés](#corrigés). Une session d'écran qui en rencontre un nouveau l'inscrit ici.

## Limites connues, qui ne sont pas des défauts

- **La précision horaire d'une bibliothèque fermée reste en français.** Le fournisseur ne publie
  qu'une phrase libre (`openingText`), jamais une heure structurée : impossible de la localiser. Elle
  n'est plus **soudée** au statut traduit depuis le jalon 6-K — elle s'affiche à côté, en texte
  secondaire — mais elle reste dans sa langue. À reprendre le jour où la source publiera une heure.

## Corrigés

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
