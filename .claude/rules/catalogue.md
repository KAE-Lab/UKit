---
paths:
  - "src/shared/etablissements/**"
  - "src/shared/locations/**"
  - "src/features/Onboarding/**"
  - "supabase/etablissements.sql"
  - "blueprints/portails/**"
  - "tools/catalogue/**"
  - "docs/campus/**"
---
# Catalogue des établissements et campus

- Jamais `if (etablissement === …)` : ce qui varie vit dans un Blueprint ou une colonne de catalogue ; code absent = `bordeaux`. Le code d'un établissement est DÉFINITIF (il partitionne trousseau, réglages et favoris) ; ne pas traduire le nom d'une université.
- Une ligne par campus, même à portail partagé (colonnes `credits`, `campus`, `alias`). Nom par nature : université ou école = nom court officiel, composante = nom officiel, site = « Campus » + lieu ; les mots des étudiants vont dans `alias` ; `nom_court` 15 caractères au plus. Un nouveau type de source d'emploi du temps exige une release.
- Une ligne publiée remplace le socle (`null` = service inexistant) : l'écrire entière (une colonne oubliée efface la valeur, le logo de Bordeaux a disparu des semaines). `batiments` fusionne champ par champ (`null` n'écrase rien, un code absent est ajouté). `visuels` : absent = photo de la source, URL = remplace, `''` = aucune image.
- Colonne nouvelle d'`Etablissement` : `schema.sql`, valeur dans TOUTES les lignes de `etablissements.sql`, `COLONNES` de `index.ts`, type de ligne de `shared/supabase/types.ts`, puis clé de cache `etablissements@N` incrémentée APRÈS que la base porte colonne ET valeurs (un `null` mis en cache n'est jamais corrigé). Ordre de déploiement : règle globale `supabase-sql` (ajouter avant de retirer). En oublier un fait disparaître la valeur sans erreur.
- `socle.ts` = ce qui est publié à la release (un test le compare à `etablissements.sql`). Le registre n'accepte d'AJOUTER un Blueprint absent du binaire que sous `ukit.portail.` ET dans le périmètre de secrets.
- Établissement retiré du catalogue : ne basculer personne, reporter la sélection depuis le cache précédent et prévenir (`etablissementRetire()`).
- Données de deux facs : ne se mélangent pas, ne s'oublient pas. Trousseau indexé par code ; la bascule purge groupes, planning, bâtiments par un seul chemin (`purge.ts`, `basculerEtablissement`), PAS les favoris nationaux CROUS et BU ; la réinitialisation purge tout sauf l'identifiant d'installation. Managers APRÈS les réglages au démarrage.
- Adresses de service (`services`) : Moodle Bordeaux = SSO initié par l'IdP (jamais `/login/index.php`, dont la cascade WAYF a tué une WebView Android), Moodle INP = racine, ENT = `intranet.u-bordeaux.fr` ; une porte non déclarée n'est pas affichée. Formulaire de retours : `services.formulaire` et `services.formulaire_campus` (adresse longue, `forms.gle` ne se pré-remplit pas) ; laisser `services.adaptation` intact ; ne renommer aucune question (l'importeur les reconnaît par libellé).
- Salles : segment tel quel avant le motif (`A5bis` ≠ `A5`), motif de la base sous `try/catch`, rien pour « Autre ». Un bâtiment se corrige par la table `batiments` sans release ; un ajout durable va dans `assets/locations.json` avec EXACTEMENT le code que Celcat écrit, puis report en table.
- Accueil : établissement après thème et langue, avant les groupes, compte juste après (sautable). On ne pose pas une question sans réponse : l'étape disparaît chez une université qui n'a pas la ressource.
- Ajouter un campus sans release : ligne de catalogue + Blueprints `ukit.portail.*` + `sondes/sondes.json` ; publier les Blueprints (`npm run blueprints:publish`) AVANT la ligne. Établir la source d'emploi du temps par les ÉVÉNEMENTS d'un semestre, pas par l'inventaire (96 groupes de l'IUT n'ont que des `Vacances`). IUT et Montaigne sont sous PRONOTE (lien d'abonnement iCal collé), Victoire sous ADE derrière CAS. Ne livrer un établissement que sur un compte RÉEL prêté (7 défauts sur 8 venaient d'une forme unique), identifiants dans `PORTAIL_<CODE>_USER` et `_PASS` du `.env` ; seule l'équipe de développement les reçoit.
- Page d'engagement du compte prêté : durée pendant et après l'adaptation, mot de passe changeable, révocation à tout moment, sondes sans identifiants ; crédit par prénom ou pseudonyme (`credits`, retirable sans release). Procédure détaillée : `docs/adaptation-campus.md`.
