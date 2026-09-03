# 6.1-E — Finitions d'interface

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
