# UKit

Application mobile (React Native, Expo, TypeScript) « kit de survie » des étudiants de Bordeaux : emploi du temps, restauration, bibliothèques, salles libres, scolarité. Toutes les facs de Bordeaux, pas la France : ce qui est bordelais est une donnée de catalogue, jamais une constante de code. Aucun compte UKit, rien de personnel ne quitte l'appareil ; l'application vit sans jamais joindre la base. Dépôt public.
Autour : base de publication Supabase (`supabase/`), console web de pilotage (`console/`, Vite), sondes quotidiennes (`sondes/`, Python), moteur Aetherius embarqué qui joue les Blueprints (`blueprints/`, instructions JSON des sources tierces). Parc de test permanent : iPhone 13 Pro et Galaxy A8 (Android 9).

## Commandes
```
npm start                                   # expo start ; build de développement EAS
npm run typecheck                           # tsc --noEmit
npm run lint -- --max-warnings=0            # base de référence : zéro avertissement (comme la CI)
npm test                                    # vitest, tests de la console compris
npm run console:build                       # strict puis vite ; exige SUPABASE_URL et SUPABASE_ANON_KEY
python -m unittest discover -s sondes       # tests des sondes
npm run parity                              # Blueprints rejoués sur les vraies sources : local seulement, jamais en CI
npx expo export --platform ios              # puis --platform android : local seulement
npm run blueprints:publish | pdfjs:vendor | retours:import | media:compresser | console:dev | console:editeur
```
La CI (`.github/workflows/verifier.yml`) joue typecheck, lint, test, la construction de la console et les sondes ; ni la parité ni l'export. Commits vérifiés par commitlint (hook `commit-msg`, `@commitlint/config-conventional`).

## Règle globale à charger
- `~/.claude/rules/react-native-expo.md` vaut pour tout `src/` (ses `paths:` ne visent que la configuration, `_layout.tsx` et les fichiers `.ios`/`.android`/`.native`) : la lire avant tout changement visible ou de plateforme.

## Invariants et pièges
- Réseau : une source tierce passe par un Blueprint demandé au registre ; nos tables passent par le client unique `src/shared/supabase/`, jamais par un Blueprint.
- Un établissement = un code, définitif : il partitionne trousseau, réglages et favoris. Toute donnée propre à un établissement est cloisonnée par code ou purgée à la bascule, et inscrite dans `src/shared/etablissements/purge.ts`. Un état qui survit à une bascule est une donnée fausse qui a l'air juste.
- Heure de la logique métier : `maintenant()` (`src/shared/services/Temps.ts`) ou `moment()`, jamais `new Date()` : la simulation temporelle du menu flottant ne déplace que `moment`.
- Identifiants universitaires, lien d'abonnement iCalendar et identifiant ADE valent un mot de passe : trousseau seulement (`SecureStoreService`), jamais un log, un fichier, une capture.
- Chaîne visible : `Translator.get('CLE')`, clé présente dans `src/shared/i18n/{fr,en,es}.ts`.
- Cartographie : MapLibre et OpenFreeMap seulement (`react-native-maps` imposerait Google Maps sur Android).
- Un défaut du moteur Aetherius se corrige chez Aetherius (spécification et conformance), pas par un contournement ici.
- `PRIVACY.md` est un engagement public : toute nouvelle collecte, écriture vers la base ou service tiers s'y décrit avant le code.
- Seuil ESLint `max-lines` à 400 (`eslint.config.mjs`) : garde-fou transitoire. La cible reste 300 lignes ; un fichier neuf ou découpé vise 300.
- Défaut fonctionnel trouvé hors périmètre : une entrée dans `docs/defauts-fonctionnels.md` (chemin cité par le code et par la console, ne pas le renommer).
- `CHANGELOG.md` se génère depuis les commits à la publication (`/release`), ne s'écrit pas à la main en cours de jalon : le site en tire sa page Nouveautés (décision `changelog-genere`).

## Git, versions et publication
- Une branche par version (`v6.3`, puis `v6.4`) porte les jalons de l'application ; console, catalogue des campus et bucket se publient depuis `main`.
- Un tag `v*` lance `release.yml` : APK de préversion et Release GitHub, sans soumission aux stores. La construction de production et la soumission ne partent que par un lancement manuel du même workflow (`build_production`).
- Sources de version à aligner : `package.json`, `version` d'`app.config.ts`, `VERSION`. `android.versionCode` est inopérant (`appVersionSource: remote`).
- Ne jamais toucher au dépôt `KAE-Lab/ukit-data` (des versions installées y lisent encore des visuels) ni au paquet Android `com.bordeaux1.emplois` (continuité de la fiche Play Store).

## Jalons
- Spécification : jalons de la phase 7. Celle d'un jalon non encore ouvert se lit par `git show doc-v1:docs/phase-7/<fichier>.md` ; son résumé est dans `docs/decisions.md` (`[non livré]`).
- Fiche courte d'un jalon ouvert : `docs/objectifs/<id>.md` (but, critères, hors périmètre, protocole de test sur téléphone), supprimée à la livraison. Aucun générateur de statut ni tableau d'état : l'état se lit dans git et dans ces fiches.

## Où lire, à la demande
- `.claude/rules/*.md` se chargent seules selon les fichiers touchés.
- `docs/decisions.md` : identifiants en slug (`### moteur-embarque :`), chercher par mot-clé.
- `docs/sources-externes.md` avant toute intervention réseau, section de la source concernée seulement.
- `supabase/README.md` (exploitation de la base), `docs/adaptation-campus.md` et `docs/campus/` (ajouter un campus), `PRIVACY.md`. `docs/guide-console.md` est le guide de l'équipe, pas une référence de code.
- L'ancienne documentation (jalons livrés, cartes, références par domaine) : `git show doc-v1:<chemin>`. Ne pas la reconstruire.
