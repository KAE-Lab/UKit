# Onboarding — premier lancement

Le parcours d'accueil, joué une seule fois : il choisit le thème, la langue et le premier groupe
favori, pour que l'application soit immédiatement utile à la première ouverture du planning.

Implémentation : un fichier unique,
[`WelcomeScreen.tsx`](../../src/features/Onboarding/WelcomeScreen.tsx).

## Déclenchement

`RootContainer` ([`rootContainer.tsx`](../../src/shared/navigation/rootContainer.tsx)) rend le
parcours **à la place du `NavigationContainer`** tant que `SettingsManager.isFirstLoad()` est vrai.
L'onboarding vit donc **hors de toute navigation** : pas de pile, pas d'en-tête, pas d'onglets. Il
gère ses propres étapes par un simple compteur d'état.

Le drapeau `firstload` est persisté sous sa propre clé AsyncStorage, distincte de `settings`. Il est
remis à vrai par la réinitialisation depuis [Réglages](settings.md).

## Les quatre étapes

| Étape | Contenu | Effet |
|---|---|---|
| 1 | Logo, souhait de bienvenue | — |
| 2 | Choix du thème (clair / sombre) et de la langue (fr / en / es) | `SettingsManager.setTheme` / `setLanguage`, appliqués **en direct** |
| 3 | Année, semestre, recherche et sélection de groupes | `SettingsManager.addFavoriteGroup` / `removeFavoriteGroup` |
| 4 | Confirmation | `setFirstLoad(false)` sur « Terminer » |

Un bouton retour apparaît à partir de l'étape 2 ; une pagination en bas indique la progression.

> **Capture attendue** — `onboarding-bienvenue.png` : l'étape 1, logo et accroche.
>
> **Capture attendue** — `onboarding-preferences.png` : l'étape 2, sélection du thème et de la langue.
>
> **Capture attendue** — `onboarding-fin.png` : l'étape 4, confirmation avant l'entrée dans l'application.

Chaque choix est appliqué **immédiatement**, pas à la fin : sélectionner le mode sombre à l'étape 2
repeint l'écran en cours. L'utilisateur voit ce qu'il choisit. Il n'y a donc pas d'état à valider —
seul `firstload` reste à basculer.

## Valeurs par défaut

Au montage, le parcours s'aligne sur l'appareil :

```ts
SettingsManager.setLanguage(languageFromDevice());        // fr / es / en
SettingsManager.setTheme(SettingsManager.getAutomaticTheme());  // Appearance.getColorScheme()
```

Un utilisateur qui traverse le parcours sans rien toucher obtient donc déjà la langue et le thème de
son téléphone.

## Sélection du groupe

C'est l'étape la plus élaborée. La liste complète des groupes vient de
`PlanningDataManager.getGroupList()`, chargée au démarrage
([donnees-et-persistance.md](../donnees-et-persistance.md)), et le parcours s'abonne à l'événement
`groupList` pour se mettre à jour si le chargement se termine après l'affichage.

Le filtrage combine trois critères : **année**, **semestre** et **texte saisi**. Année et semestre
sont traduits en fragments d'identifiants par une table locale :

```ts
filterSeason = {
  autumn: { L1: ['10', 'MIASHS1'], L2: ['30', 'MIASHS3'], L3: ['50', 'MIASHS5'],
            M1: ['M1', '70'],      M2: ['M2', '90'],      AUTRE: [''] },
  spring: { L1: ['20', 'MIASHS2'], L2: ['40', 'MIASHS4'], L3: ['60', 'MIASHS6'],
            M1: ['M1', '80'],      M2: ['M2', '000', '001', '002', '003', '004'], AUTRE: [''] },
}
```

Un groupe est retenu si son nom contient **l'un** des fragments de la combinaison choisie **et** le
texte saisi. Le choix `AUTRE` porte le fragment vide, donc ne filtre que sur le texte.

L'affichage est plafonné à **10 résultats** ; au-delà, un message indique combien sont masqués et
invite à préciser la recherche.

> **Capture attendue** — `onboarding-groupes.png` : l'étape 3, avec une année et un semestre
> sélectionnés et une liste de groupes filtrée.

## Décisions de conception

**Hors navigation, volontairement.** Le parcours ne doit pas pouvoir être quitté par un geste de
retour ni apparaître dans un historique. Le rendre à la place du conteneur de navigation est le moyen
le plus simple d'y parvenir.

**Application immédiate des choix.** Voir le thème changer sous ses doigts vaut mieux qu'un aperçu.
Le corollaire est qu'abandonner le parcours en cours de route laisse les réglages déjà appliqués —
sans conséquence, puisque `firstload` reste vrai et que le parcours recommence.

**Les identifiants de groupe encodent l'année et le semestre.** La table `filterSeason` exploite cette
convention de nommage Celcat pour éviter à l'étudiant de parcourir plusieurs centaines de groupes. Ce
n'est pas un contrat : c'est une heuristique locale (voir les limites).

**Plusieurs groupes sélectionnables dès l'accueil.** L'étape 3 ajoute ou retire des favoris, elle
n'en choisit pas un seul : le planning agrégé est disponible immédiatement après l'accueil.

## Vérifier

Le parcours ne se rejoue pas spontanément. Deux moyens de le retrouver : **Réglages → Réinitialiser
l'application**, ou réinstaller l'application.

- Traverser les quatre étapes sans rien changer : la langue et le thème doivent correspondre à ceux du
  téléphone.
- À l'étape 2, changer thème et langue : l'écran doit se mettre à jour immédiatement.
- À l'étape 3, choisir une année et un semestre : la liste doit se réduire ; saisir du texte : elle
  doit se réduire encore ; dépasser 10 résultats : le message de résultats masqués doit apparaître.
- Sélectionner deux groupes puis terminer : le planning doit s'ouvrir sur l'agrégation des deux.
- Terminer sans choisir de groupe : le planning doit afficher son état vide, sans blocage.
- Utiliser le bouton retour à chaque étape.

## Limites connues

- **La table `filterSeason` est spécifique à des conventions de nommage observées.** Un changement de
  nomenclature côté université fait renvoyer des listes vides pour les combinaisons concernées, sans
  erreur visible. Le choix `AUTRE` reste le contournement.
- **Aucune vérification que la liste des groupes est chargée.** Si le chargement du démarrage a
  échoué (première installation hors ligne), l'étape 3 est vide sans expliquer pourquoi.
- **Les abonnements ne sont jamais résiliés** : le `useEffect` de montage appelle `on(...)` sans
  fonction de nettoyage. Le composant étant démonté définitivement à la fin du parcours, les
  rappels restent enregistrés dans les managers pour la durée de la session.
- **Le parcours utilise `StyleWelcome`**, un jeu de styles distinct des deux thèmes
  ([theme.md](../theme.md)), ce qui le rend moins homogène avec le reste de l'application.
- **Un fichier de 302 lignes** contenant les quatre étapes, la table de filtrage et la logique de
  navigation.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`WelcomeScreen.tsx`](../../src/features/Onboarding/WelcomeScreen.tsx) | parcours complet : les quatre étapes, valeurs par défaut système, filtrage des groupes, bascule de `firstload` |
