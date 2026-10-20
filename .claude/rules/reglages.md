---
paths:
  - "src/features/Settings/**"
  - "src/shared/services/AppCore.tsx"
  - "src/shared/services/entretien.ts"
  - "src/shared/services/CalendarSyncHelpers.ts"
  - "src/shared/services/NotificationService.ts"
  - "src/shared/services/reglagesParEtablissement.ts"
  - "src/shared/etablissements/{bascule,purge,comptes,lienEdt}.ts"
  - "src/shared/ui/{ChoixEtablissement,Interrupteur,Curseur}.tsx"
---
# Réglages

- Ne pas garder en `state` ce qui se dérive du contexte ou du catalogue (nom d'établissement : calculé au rendu) : un état local fige l'ancien campus quand la bascule vient d'ailleurs.
- Restaurer thème et langue à chaque chargement, même accueil inachevé, et initialiser l'état d'écran depuis le manager, pas `fr` ou `light` (mode sombre perdu, clignotement). `saveSettings` n'écrit rien avant `_chargementTermine` : la restauration notifie en chemin et sauvegardait des favoris vides. `AppCore.tsx` est au plafond des 400 lignes ESLint : rien n'y entre.
- Basculer d'établissement par `basculerEtablissement` seul, purge AVANT sélection (après, un écran rechargé réécrit ce qu'on efface) ; propager aux écrans montés (`AppContext`) et faire oublier puis relire la session au contexte de scolarité. Toute donnée liée à un établissement : choisir cloisonnée ou purgée et l'inscrire dans `purge.ts` (la liste de la bascule diffère de celle de la réinitialisation). Confirmer l'établissement actif ferme sans avertir.
- Réinitialiser = même purge + trousseau + favoris nationaux + calendriers affichés + mesure remise active, attendue AVANT `setFirstLoad(true)` (une session en mémoire réécrirait) ; l'identifiant d'installation survit.
- `reglagesParEtablissement.ts` lit les trois formes persistées historiques (groupName, liste, table), testées sous Node : une migration fautive perd les favoris sans bruit.
- Relire « Compte universitaire » et « Lien de l'emploi du temps » à chaque retour sur l'écran (le trousseau n'émet aucun événement) ; le compte est masqué si `portailPublie()` est faux.
- Rappels : reconstruction complète, 20 au plus (iOS 64), depuis le cache de la semaine jamais le réseau, par `replanifierDepuisLeCache` (filtres d'UE), délai écrit au relâcher du `Curseur`. La permission de notification est demandée une fois par l'entretien ; les interrupteurs de rappels et de messages la redemandent à l'allumage et renoncent si elle est refusée.
- Synchro agenda : filtrer par `coursASynchroniser`, jamais `poserLesUE` (il mute `subject`, titre de l'événement) ; année universitaire (1er août au 1er août) bornée par le service et passée en entrée du Blueprint `ukit.celcat.annee` (aucun `confirm`, `timeout_ms` 60 s) ; un échec laisse l'agenda inchangé et se persiste (`calendarSyncAttempt`) ; l'interrupteur éteint retire ce qui a été écrit (`purgeCalendarEvents`, confirmation à l'extinction seulement). « Forcer » dit ce qui manque, jamais muet. `expo-calendar/legacy` seulement.
- Écran `Filters` poussé (pas une modale) : croix = vrai bouton, désabonnement de `PlanningDataManager` au démontage, `KeyboardAvoidingView` en `padding`. Calendriers du téléphone : écran (la modale `SettingsChoicePopup` est mono-sélection), opt-in, liste relue au focus, cible de synchro jamais proposée, non purgés à la bascule.
- Dialogues : tous les styles viennent de `theme.settings.popup` (règle `ui-theme`). `Interrupteur` piloté (poignée = valeur passée) ; `Curseur` : libellé au cran, écriture au relâcher (`notify` persiste à chaque émission).
- « Statistiques anonymes » : règle `mesure` (actif par défaut, couper vide la file). À propos : y créditer toute nouvelle source de données tierce (`urls.ts`) ; les contrôles dessinés ignorent les réglages d'accessibilité du système (prix d'une apparence unique).
- Vérifier à la main : langue (interface ET dates) ; statistiques off (file à zéro, rien dans `mesures` après arrière-plan) ; filtre sur `4TRN901S` puis « Forcer » (l'agenda perd ces cours) ; HORS LIGNE + forcer (date du succès gardée ET échec dit, éteindre/rallumer l'efface) ; installation neuve (l'invite de notification paraît seule à la fin de l'accueil, un refus ne revient pas) ; réinitialiser (accueil ET Scolarité redemandent les identifiants) ; six modales d'affilée (même rayon, rembourrage, boutons).
