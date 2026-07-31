# Conventions de code

Ce document décrit comment le code de UKit est écrit, pour qu'une contribution se fonde dans
l'existant. Les règles de contribution (workflow, définition de terminé) sont dans
[CONTRIBUTING.md](../CONTRIBUTING.md) ; l'organisation générale dans
[architecture.md](architecture.md).

## Anatomie d'un module feature

Un dossier de [`src/features/`](../src/features/) suit toujours la même structure. Les
sous-dossiers absents sont ceux dont le module n'a pas besoin — on ne crée pas un dossier vide.

```text
features/<Domaine>/
  screens/      écrans routés dans un navigateur (un fichier = une route)
  components/   composants d'affichage, propres au domaine
  hooks/        logique réutilisable dans le domaine (état, effets, calculs)
  services/     accès aux sources distantes et gestion de cache
  views/        vue composite orchestrant plusieurs sous-vues (rare : uniquement Planning)
```

Répartition des responsabilités :

- **Un écran** compose, branche la navigation et lit le thème. Il ne calcule pas et n'appelle pas le
  réseau lui-même.
- **Un hook** porte la logique : chargement, transformation, état dérivé. C'est là que va le code
  qui ferait grossir un écran. Exemple de référence :
  [`useFreeRoomsData.ts`](../src/features/Campus/FreeRoom/hooks/useFreeRoomsData.ts), qui sort
  entièrement le calcul des créneaux libres de l'écran.
- **Un service** parle au réseau et rien d'autre. Il expose des fonctions typées, ne connaît ni React
  ni la navigation, et renvoie des structures propres à l'application (jamais la réponse brute du
  fournisseur).
- **Un composant** reçoit ses données par props et son thème par prop `theme`. Un composant qui va
  chercher ses propres données est un signal de mauvais découpage — sauf pour les sections du
  dashboard Campus, où c'est assumé (voir [features/campus.md](features/campus.md)).

## Composants

- **Fonctions et hooks par défaut.** Les composants à classe existants
  ([`ScheduleList`](../src/features/Planning/components/ScheduleList.tsx),
  [`CourseRow`](../src/features/Planning/components/CourseRow.tsx),
  [`ModMenu`](../src/shared/ui/ModMenu.tsx), les écrans `Settings` et `GroupSelection`) sont
  antérieurs et conservés tels quels : ils fonctionnent, on ne les réécrit pas sans raison. Tout
  nouveau composant est une fonction.
- **Les styles** sont soit un `StyleSheet.create` en bas de fichier, soit un objet inline construit à
  partir des tokens. Les deux formes coexistent ; suivre celle du fichier qu'on modifie.
- **Le thème** se lit via `useContext(AppContext)` puis `style.Theme[themeName]`, ou se reçoit en
  prop `theme` quand le composant est purement présentational. Voir [theme.md](theme.md).

## TypeScript

- Interfaces exportées pour les props publiques d'un composant réutilisé
  (`export interface XxxProps`), inline pour un composant local.
- Les contrats de données distantes sont déclarés **dans le service qui les produit**, jamais dupliqués
  côté écran : `PlanningEvent` vit dans
  [`PlanningApiService.ts`](../src/features/Planning/services/PlanningApiService.ts), `CrousRestaurant`
  dans [`CrousService.ts`](../src/features/Campus/services/CrousService.ts), etc.
- Deux formes d'import de type coexistent : l'import nommé classique et l'import inline
  (`import('../services/X').Type`). L'inline est utilisé pour éviter des imports circulaires ou du
  bruit en tête de fichier ; les deux sont acceptées.
- `any` est proscrit (`@typescript-eslint/no-explicit-any` en `warn`). Les rares occurrences
  restantes sont des dettes ponctuelles dans
  [`ScheduleList.tsx`](../src/features/Planning/components/ScheduleList.tsx) et
  [`CampusListLayout.tsx`](../src/features/Campus/components/CampusListLayout.tsx) : ne pas en
  ajouter, les réduire quand on passe à proximité.
- Le typage strict de l'application se vérifie par `npx tsc --noEmit` ([qualite.md](qualite.md)).

## Nommage

| Élément | Convention | Exemple |
|---|---|---|
| Fichier de composant | PascalCase, extension `.tsx` | `CourseRow.tsx` |
| Fichier de service | PascalCase suffixé `Service` | `CrousService.ts` |
| Fichier de hook | camelCase préfixé `use` | `useFreeRoomsData.ts` |
| Écran routé | PascalCase suffixé `Screen` | `LibraryScreen.tsx` |
| Clé de traduction | SCREAMING_SNAKE_CASE | `NO_BU_NEARBY` |
| Clé de stockage | snake_case ou camelCase selon l'existant | `crous_favorites`, `groupList` |

## Commentaires

Sobres, en français, et orientés **pourquoi**. Un commentaire qui paraphrase la ligne suivante est du
bruit ; un commentaire qui explique une contrainte externe ou un choix non évident a sa place :

```ts
// Sécurité pour l'OS : si le temps calculé est trop proche ou dans le passé
if (realTriggerTime.getTime() <= Date.now() + 1000) {
```

Les séparateurs de section en commentaire (`// ─── SERVICE ───`) sont un usage établi dans les
fichiers longs ; les conserver quand on édite un fichier qui en utilise. **Aucun emoji** dans le code,
les commentaires ou les logs.

## Journalisation

- `console.warn` pour une anomalie rattrapée (cache illisible, extraction échouée).
- `console.error` pour un échec de service qui laisse l'utilisateur sans donnée.
- Les messages destinés au débogage d'une session sont gardés par `__DEV__` — voir
  [`CredentialsContext.tsx`](../src/features/Scolarite/services/CredentialsContext.tsx).

## Ajouter une source distante

Le chemin attendu, dans l'ordre :

1. Déclarer l'URL dans [`shared/constants/urls.ts`](../src/shared/constants/urls.ts) si elle est
   transverse, ou dans le service lui-même si elle est propre au domaine (usage actuel des services
   Campus).
2. Écrire le service dans `features/<Domaine>/services/`, avec ses interfaces de contrat, sa gestion
   d'erreur par valeur de repli, et sa transformation vers des structures applicatives.
3. Décider de la stratégie de cache et la documenter dans
   [donnees-et-persistance.md](donnees-et-persistance.md).
4. Ajouter l'entrée correspondante dans [sources-externes.md](sources-externes.md) : endpoint, forme
   de la réponse, parsing, fragilité connue.

## Ajouter un écran

1. Créer l'écran dans `features/<Domaine>/screens/`.
2. Déclarer la route et ses paramètres dans `RootStackParamList`
   ([`StackNavigator.tsx`](../src/shared/navigation/StackNavigator.tsx)), puis l'entrée
   `Stack.Screen` avec son `NavBarHelper`.
3. Traduire le titre dans les trois dictionnaires.
4. Documenter la route dans [navigation.md](navigation.md) et l'écran dans la doc de sa feature.
