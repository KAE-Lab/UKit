---
paths:
  - "src/features/Campus/**"
  - "blueprints/ukit-campus-*.blueprint.json"
  - "blueprints/ukit-celcat-salles.blueprint.json"
  - "blueprints/ukit-celcat-occupation.blueprint.json"
---
# Campus (tableau de bord, restaurants, bibliothèques, salles libres)

- Tout nouvel écran de liste passe par `CampusListLayout` ; recherche flottante seulement au-delà de `seuilRecherche` (4 ; 8 pour la grille d'annonces) ou si une requête est saisie ; dalle opaque HORS du `KeyboardAvoidingView`.
- L'onglet ne se démonte jamais : lire au focus (`useFavorites`, `useSavedFilter`), clé jamais écrite = valeur par défaut. Annonces relues au vrai retour au premier plan, sources tierces au tirer seulement (quatre appels à chaque bascule d'application = arbitrage produit).
- Section vide = pourquoi + geste : filtre → « Tout afficher » ; échec → carte en panne au gabarit, Réessayer seulement si la famille est réessayable (`failures.ts`), sinon « Voir tout » ; rien → aucun geste. Aucune donnée en cache sauf la liste des bâtiments (7 jours) et l'occupation des salles (10 min, plus bas) ; un carrousel qui garde ses restaurants hors ligne n'est pas un cache (état monté). Une section sans source pour l'établissement disparaît (région CROUS, inventaire de salles).
- Distance recalculée localement (Haversine ; celle du fournisseur est relative à son point) ; tri favoris puis distance dans un `useMemo` avant filtrage ; position partagée 5 min, repli Talence (44.8048, −0.5954) jamais mis en cache. Cartes de section de même hauteur : horaires du fournisseur sur UNE ligne. Un campus ne se devine pas : un bâtiment inconnu n'est pas placé.
- CROUS : un restaurant sans menu n'est pas une panne (404 sur `/menu`) ; filtres « Resto U » et « Crous Market » = sous-chaînes du titre (« resto u » ou « crous cafet » ; « crous market » ou « crous moovy market ») (un renommage du fournisseur les vide en silence) ; `crous_region` vient du catalogue, sans région la section disparaît ; toute ligne d'horaires inconnue retombe en phrase.
- Bibliothèques : balayage applicatif, position de l'étudiant TOUJOURS premier point + `bibliotheques_points` du catalogue (2 pour Bordeaux, 3 runs) ; points muets → bandeau de couverture partielle + Réessayer, zéro réponse = échec plein. Catégories `id` 1 ou 20 = constante applicative ; `getLibraryStatus` seule source de couleur (taux inconnu = « de la place »). « Réserver » = action principale, page Affluences dans la vue `WebBrowser`.
- Salles libres : éligibilité = notre référentiel (`freeAccess`, embarqué puis surcouche `batiments`), jamais Celcat ; la colonne `salles_libres` du catalogue peut pointer l'inventaire d'un autre établissement (INP → UB, bâtiments INP publiés `acces_libre = false`). Étage = chiffre des centaines du nom NETTOYÉ, jamais `fullName` ; sans numéro → « Autres salles » ; créneau de moins de 15 min écarté.
- Occupation : un run par bâtiment, cache `occupation@1:<bâtiment>:<jour>` de 10 minutes (occupation éditoriale, plus petit créneau 15 min), un lot entièrement en échec n'est jamais mis en cache (`estCachable`), `TimeMockService` purge le préfixe. Un run groupé en échec vide le bâtiment pour cette ouverture (limite assumée : bâtiment affiché entièrement libre, voir `docs/defauts-fonctionnels.md`). `CampusDataManager` n'écoute pas la bascule : liste en mémoire refaite au lancement ou au tirer.
- Vérifier : un filtre qui ne laisse rien → « Tout afficher » repeuple le carrousel au retour ; liste hors ligne ≠ recherche sans résultat (teinte rouge pâle / grise) ; clavier ouvert, deux thèmes : aucune zone découverte.
