---
paths:
  - "src/shared/mesure/**"
  - "src/shared/push/**"
  - "src/shared/testeur/**"
  - "supabase/migrations/**"
  - "PRIVACY.md"
  - "docs/mesure.md"
---
# Mesure anonyme et vie privée

- Des nombres, jamais des personnes : aucun identifiant, aucun contenu saisi, rien de plus fin que l'heure (jour pour la plupart, heure pour sessions, onglets, échecs de source), aucun recoupement. Refusés : durée de session et parcours (relier deux instants), position, recherche, groupe, UE, dossier universitaire, SDK tiers, rapport de crash tiers (`source.echec` suffit).
- Ajouter un événement = quatre gestes dans le même commit : `EVENEMENTS` (`vocabulaire.ts`), migration dans `evenements_connus` (la vue de `schema.sql` suit ; sinon l'événement est ignoré et compté dans `rejetes`), `migration.test.ts`, ligne du vocabulaire de `docs/mesure.md` AVEC son lecteur (sans lecteur, l'événement ne s'ajoute pas). Retirer : l'application d'abord.
- Envoi groupé au passage en arrière-plan et à l'entretien, jamais au démarrage ; file bornée à 500 ; compteur hors [1, 1000] rejeté sans reprise ; pas d'idempotence par lot (un double compte est assumé). Android peut ne pas émettre `background` (perte acceptée).
- L'interrupteur « Statistiques anonymes » vit dans `shared/mesure/reglage.ts` (`useMesureActive`), pas dans `SettingsManager` : actif par défaut, et couper vide aussi la file. `reinitialiserLaMesure` s'importe de `reglage.ts`, jamais de l'index (cycle avec `AppCore`).
- Garder à `viewabilityConfig` et `onViewableItemsChanged` leur identité (constantes de module, `useRef`) : React Native lève « Changing viewabilityConfig on the fly ».
- La console n'affiche jamais une case de moins de 5 ; le parc actif se lit dans `jetons_push` (testeurs exclus), un minorant. `testeur` est auto-déclaré : l'audience est un filtre d'affichage, pas une confidentialité.
- `PRIVACY.md` (4 quater push, 4 quinquies mesure, 5 bis retours) et les fiches App Privacy et Data safety des stores changent avant le code de toute nouvelle collecte. Conservation 13 mois.
- Le contact d'un retour reste dans la colonne `contact`, lue par un admin au clic ; textes libres masqués (adresses, numéros). Un lien d'abonnement iCalendar est un secret personnel : jamais d'adresse entière dans un journal.
