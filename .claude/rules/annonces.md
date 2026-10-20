---
paths:
  - "src/shared/annonces/**"
  - "src/features/Campus/Bde/**"
  - "src/features/Campus/services/Bde*.ts"
  - "src/features/Campus/Dashboard/**"
  - "console/src/pages/Annonces/**"
---
# Annonces et cartes d'annonce

- `shared/annonces/{grammaire,carte,ordre}.ts` et `shared/theme/palettes.ts` sont la source UNIQUE de l'application et de l'aperçu de la console : l'application est la référence, une logique réécrite côté console ferait mentir l'aperçu. L'état d'une annonce (Visible, Programmée, Inactive, Expirée, Brouillon, Archivée) se calcule dans `console/src/schema/tables/etatDAnnonce.ts` seul.
- Le contrat d'écran garde ses noms anglais (`BdeAnnonce`) sur des colonnes françaises : ne pas renommer. Grammaire de description : `# Titre`, `# icone|Titre`, `-`/`--`/`---`, `>` exergue, `**gras**`, `=` transition, `~` signature ; icône inconnue = `?`.
- Les annonces se lisent directement dans notre base par `BdeService` (pas de Blueprint). La politique de lecture protège la donnée (actif, publié, non expiré) ; un filtre applicatif (`estValide`, au `maintenant()` de l'application) double l'affichage. Ciblage (`audience`, `etablissements`, `version_min/max`) trié sur l'appareil. Aucun cache : relecture au vrai retour au premier plan ; sans base l'application s'utilise entièrement, rien à publier = section absente sans message.
- Ordre : filtrer (péremption + ciblage) AVANT `ordonner()` et au même `maintenant()` ; épinglées, puis score de créneau et priorité, puis rotation déterministe (tri par identifiant, décalage « heure modulo taille du groupe », aucun tirage). Créneaux en jours ISO 1 à 7, heure de Paris par `Intl` avec repli local (à vérifier sous Hermes). L'ordre ne change qu'à l'heure pleine ; un tableau de bord resté ouvert relit au retour au premier plan et au tirer.
- Carte v2 : cadre 4:5, l'image couvre autour d'une focale (`contentPosition` en pourcentages, défaut `{x:0.5, y:0.3}`), « contenir sur fond flou » (flou 16) en option par annonce ; une affiche ne se recadre jamais, sans visuel pas de cadre, fiche bornée 3:4 à 16:9. Badge de type sauf pour l'événement. Carte spéciale en tête du carrousel de son emplacement, au gabarit de l'hôte (même largeur et hauteur que ses voisines), jamais seule, 4:5 dans annonces et grille ; elle compte une impression. Toucher une carte partenaire ouvre la fiche.
- `expire_le` vide = n'expire jamais, date illisible = masquée, `active=false` retire immédiatement. Une annonce programmée est une `publiee` dont `publiee_le` est futur (pas un 4e statut). Archiver plutôt que supprimer.
- Couleur d'identité = index de `sectionsHeaders` (l'index 4 évité), une couleur par annonce ; émetteur en kicker.
- Visuels : ne publier que l'adresse d'origine (le rendu se calcule dans `shared/visuels/rendu.ts`, paliers de largeur, qualité 70/80/85), téléverser en WebP (1080 affiche, 1200 photo) avec `cache-control` d'un an. Les lieux n'ont pas de blurhash (seule `annonces` porte la colonne).
- Liens de bouton : `https://`, `mailto:` ou `tel:` seulement. Police d'icônes de la console identique à celle de l'app (`@mdi/font`).
