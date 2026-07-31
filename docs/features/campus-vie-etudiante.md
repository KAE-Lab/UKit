# Campus — vie étudiante

Annonces éditoriales : événements associatifs, communications de BDE, informations ponctuelles. C'est
le seul contenu de l'application **rédigé par l'équipe** plutôt que récupéré d'un système
universitaire.

Socle commun : [campus.md](campus.md). Source de données : jsDelivr / `ukit-data`, section 5 de
[sources-externes.md](../sources-externes.md).

## Parcours utilisateur

1. La section du tableau de bord présente les annonces actives en carrousel horizontal — c'est la
   première section, en haut de l'onglet.
2. « Voir tout » ouvre la liste complète.
3. Toucher une annonce ouvre sa fiche : visuel, titre, émetteur, étiquette d'information, description
   longue, et bouton d'action ouvrant un lien externe.

> **Capture attendue** — `annonces-liste.png` : la liste des annonces actives.
>
> **Capture attendue** — `annonce-detail.png` : une fiche complète, avec émetteur, étiquette et bouton
> d'action.

## Flux de données

```text
BdeSection / BdeScreen
  └─ BdeService.fetchAnnonces()
       ├─ GET https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/annonces.json
       └─ filtre : is_active === true ET expires_at > maintenant
  └─ CampusCard → navigation vers BdeDetail

BdeDetailsScreen (params : annonce)
  └─ rendu direct de l'objet reçu, aucun appel réseau
  └─ Linking.openURL(cta_link) sur le bouton d'action
```

La fiche ne recharge rien : l'annonce complète transite par les paramètres de navigation. C'est
possible parce que la charge utile est petite et déjà entièrement chargée par la liste.

## Contrat

```ts
interface BdeAnnonce {
    id: string;
    is_active: boolean;
    expires_at: string;     // date ISO
    title: string;
    issuer_name: string;    // association ou service émetteur
    image_url?: string;
    info_label?: string;    // étiquette courte : date, lieu, tarif
    long_desc?: string;
    cta_text?: string;      // libellé du bouton d'action
    cta_link?: string;      // URL ouverte au clic
}
```

## Publier une annonce

Le contenu vit dans le dépôt `KAE-Lab/ukit-data`, branche `main`, fichier `annonces.json`. Ajouter
une entrée au tableau `annonces` la rend visible **sans publier de nouvelle version de
l'application** : jsDelivr sert la branche directement.

Deux garde-fous côté application : `is_active` permet de retirer une annonce immédiatement, et
`expires_at` la fait disparaître d'elle-même à échéance. Les deux conditions doivent être satisfaites
pour qu'elle s'affiche.

Le même dépôt héberge les visuels référencés par `image_url` et par les bâtiments de
[`locations.json`](../../assets/locations.json).

## Décisions de conception

**Un fichier statique sur CDN plutôt qu'un service.** Le besoin est de publier quelques annonces par
mois : un dépôt Git servi par jsDelivr offre l'historique, la révision par PR et la diffusion
mondiale, sans infrastructure à maintenir. C'est la seule brique éditoriale de l'application.

**Le filtrage temporel est côté client.** Le CDN sert le même fichier à tous ; c'est l'application qui
décide de ce qui est encore valide. Une annonce expirée reste donc dans le fichier — utile pour
l'historique — sans être affichée.

**La fiche est purement présentationnelle.** Aucun état, aucun chargement : elle rend l'objet reçu et
sort tôt (`if (!annonce) return null`) si le paramètre manque.

## Vérifier

- Ouvrir l'onglet Campus : la section annonces doit être en tête et peuplée.
- Ouvrir la liste complète puis une fiche : visuel, émetteur, étiquette et description doivent
  s'afficher ; le bouton d'action doit ouvrir le lien dans le navigateur système.
- Ouvrir une annonce sans `image_url`, sans `info_label` ou sans `cta_link` : la fiche doit rester
  correcte, les éléments absents simplement omis.
- Passer `is_active` à `false` ou reculer `expires_at` dans le fichier de données : l'annonce doit
  disparaître au rechargement suivant.
- Mode avion : la section doit afficher son état vide sans plantage.

## Limites connues

- **Le message d'état vide s'affiche en majuscules brutes** (`NO_RESULTS`) — voir
  [i18n.md](../i18n.md). Le repli `|| 'Aucune annonce'` qui l'accompagne ne se déclenche jamais.
- **Aucun cache** : l'absence de réseau vide la section, même si des annonces ont été vues juste
  avant.
- **Aucune validation du contenu distant.** Un `annonces.json` malformé fait échouer l'analyse ; le
  service rattrape l'erreur et renvoie une liste vide, donc la panne est silencieuse.
- **`expires_at` est comparé en heure locale de l'appareil**, sans fuseau explicite.
- **La fiche n'a pas d'état d'erreur** : un paramètre manquant produit un écran vide.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`Bde/BdeScreen.tsx`](../../src/features/Campus/Bde/BdeScreen.tsx) | liste complète des annonces actives |
| [`Bde/BdeDetailsScreen.tsx`](../../src/features/Campus/Bde/BdeDetailsScreen.tsx) | fiche d'une annonce : visuel, métadonnées, description, bouton d'action |
| [`services/BdeService.ts`](../../src/features/Campus/services/BdeService.ts) | récupération et filtrage des annonces, contrat `BdeAnnonce` |
