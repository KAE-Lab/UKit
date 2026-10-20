---
paths:
  - "src/**/*.tsx"
  - "src/shared/theme/**"
  - "src/shared/ui/**"
  - "src/shared/visuels/**"
---
# UI et thème

Le vocabulaire visuel existe déjà : lire `src/shared/theme/` et `src/shared/ui/` avant d'écrire et n'employer que lui. Un motif qui apparaît une deuxième fois remonte dans `shared/ui/` ; un composant d'un seul écran reste chez lui.

## Recette d'écran (tout écran créé ou repris)
1. En-tête par `withHeaderAnimation` (écran qui défile) ou `withStaticHeader`, jamais de `headerPadding` maison ; marges de page `space.md`.
2. Quatre états distincts : chargement, vide (`EmptyState`, propose l'action qui existe, jamais « Réessayer »), erreur (`SourceFailureNotice`), couverture partielle (`CampusPartialNotice`). Un état plein écran passe par `ScreenState`, ancré en haut sous l'en-tête et jamais centré, avec `HEADER_OFFSET` et `TAB_BAR_HEIGHT` importés (jamais 70 ou 75 recopiés).
3. Cible tactile d'une icône de 22 : `hitSlop`.
4. Rejouer dans les deux thèmes, sur les deux appareils du parc : l'ombre et l'ordre de dessin y diffèrent.
5. `npx eslint <fichier>` sans nouvel avertissement, aucune forme ronde.
6. Capture « avant » prise AVANT le premier changement de code (plus reproductible ensuite), puis « après ».

## Forme et tokens
- Surfaces en carrés arrondis : carte `radius.xl`, conteneur, encart et surface d'icône `lg`, le reste `md`. `radius.pill` seulement pour point d'état, compteur, jauge, piste de contrôle. Un bouton rond, un champ en pilule ou une icône dans un disque dénotent, et ESLint ne les voit pas. Copier un gabarit existant.
- Une seule police, celle du système ; hiérarchie par taille et graisse, aucune `fontFamily`. Geist est réservée au site et à la communication.
- Aucune valeur de style littérale (`ukit/no-style-literals` nomme le token). `tokens.ts`, `palettes.ts`, `ombres.ts` restent purs, sans import `react-native` à l'exécution (`ombres.ts` n'importe qu'un type) ; `palettes.ts` est lu par l'aperçu de la console.
- Jamais `elevation` (ombre dure et ordre de dessin sur Android : un bandeau recouvrait l'en-tête sur le Galaxy A8). Ombres par `...tokens.shadow.*` ou `ombre({ y, flou, opacite })`.
- Libellé sur fond `primary` = `lightFont` ; `accentFont` est le rouge destructif. `` `${theme.primary}15` `` n'est pas `theme.primarySoft` en sombre : ne pas « corriger ».
- Un service rend un `SemanticTone`, jamais un hexadécimal (il ignore le thème actif). Durées et ressort viennent de `tokens.mouvement`, que le linter ne voit pas.
- Carte = `Card` (`xl`, `shadow.md`), sans largeur ni marges propres. Cartes d'un carrousel de même hauteur : texte libre coupé à `numberOfLines`, complet sur le détail.
- `SectionHeader` (`fontSize.xl` gras) pour un tableau de bord ; le libellé gris en capitales est réservé au groupe de lignes d'un écran poussé. La couleur d'action dit « touchable » : elle ne titre pas.
- Image distante : `VisuelAvecRepli`, repli seulement si l'image manque ou échoue. `expo-image` : `cachePolicy` `memory-disk`, `contentFit` en prop, adresse de rendu aux dimensions (`visuels/rendu.ts`) avec repli sur l'origine.
- Icônes par `Icon` (deux familles Material aux glyphes non équivalents). `Interrupteur` et `Curseur` sont dessinés, jamais `Switch` ou `Slider` natifs : pilotés par la prop, haptique sur le geste, désactivé = transparence.

## Dialogues et actions
- Modale : seul `theme.settings.popup`, aucun style local ; choix = option-bouton (jamais rond à cocher), toucher prépare et Confirmer applique ; titre jamais en majuscules.
- Confirmation = bouton plein `popup.buttonMain` ; `buttonDestructive` seulement pour ce qui retire sans retour (extinction de la synchro, réinitialisation), pas pour changer d'établissement. Confirmer aussi un geste coûteux non destructif, en y mettant l'explication.
- Action hors dialogue (`ActionButton`) : `filled` = action principale (celle d'une fiche : `PiedDAction`) ; `tonal` et `destructive` partagent le fond `greyBackground`, seul le libellé change. Libellé sur 1 ligne à 320 pt : raccourcir dans les trois dictionnaires (l'espagnol décide) avant de toucher au bouton.
- Échec transitoire d'un geste de fichier = toast `ErrorAlert`, ni état d'écran ni dialogue. Une information se lit dans la page, jamais derrière un bouton.

## Attente et mouvement
- Indicateur sans forme (`ChargementPleinePage`, `LoadingState`) : rien pendant 300 ms puis fondu ; jamais de durée minimale. `Squelette` (forme connue) paraît tout de suite, bâti avec les composants du contenu en mode `masque` : hauteur égale par construction, aucune constante.
- Entre chargement et contenu : fondu seul de 200 ms (`tokens.mouvement.couture`) à chaque couture, jamais de glissement (`FadeInDown` de Reanimated 4.5 a fait perdre son texte sur iPhone). Pas d'élément partagé : la pile est en JavaScript.
- Lire les données (source, favoris, filtre) AVANT le premier rendu : aucune section ne change de hauteur entre squelette, contenu et panne, aucun reflux. Cascade de 40 ms par rang sur 4 rangs ; un seul ressort ; carte pressée = échelle 0,97, pas d'opacité.
- Tout nouveau mouvement en Reanimated avec `tokens.mouvement` ; `Animated` historique toléré jusqu'à la reprise de l'écran. « Réduire les animations » coupe cascades et pulsations (boucle : `useReducedMotion`).
- Tirer-pour-rafraîchir = contrôle du système (Android intercepte le geste, aucune progression).
- Une tuile ou une section garde sa taille quelle que soit sa source : échec en deux mots + feuille (`CarteEnPanne` au gabarit), « Réessayer » seulement si `failures.ts` le justifie.
- Un teaser masque en retirant le contenu du rendu : flou et `transparent` ne cachent rien sur Android.
- Objets flottants du bas (barre de recherche, pieds d'action, barre d'onglets) : objet posé sur `FondDePiedFlottant` ; un bandeau de service est une carte flottante qui ne déplace aucun écran ; l'état durable vit dans `PastilleService`.
- Thème : conserver `Appearance.setColorScheme` (alertes, clavier et sélecteurs de date suivent sinon le téléphone) ; barre de statut Android et fond du splash restent en dur dans `app.config.ts`.
- Préférences de référence (`docs/references/`) : tirer d'une capture un principe, jamais un rendu ; laisser les boutons ronds, la fonte propre, les encarts promo.
