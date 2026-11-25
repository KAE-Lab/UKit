# Lot 4 — Sondages, boîte à idées et notation

> **Livré le 2026-11-25** : la migration `20261125070000_sondages_idees.sql` est **en production**,
> recettée en transaction annulée avec les recettes des lots 1 à 3 rejouées, puis rejouée sans elle ; la
> production et la vue lisible à la même empreinte ; la fonction `communaute` redéployée ; la console en
> ligne depuis `main` (#48) ; la fiche, la boîte à idées et « Noter UKit » joués au banc. **Reste** : la
> fiche de notation native et le chemin attesté, sur la piste de test interne et l'iPhone.

> **Ouvert le 2026-11-25**, sur `prochaine-version` pour la 7.0 ; la console sur `feat/console-communaute`,
> fusionnée dans `main`. Trois gestes que l'étudiant fait sans écrire : voter dans une annonce, soutenir
> une idée, noter l'application. Le cadre est celui du [plan de la phase](README.md#les-décisions), du
> [lot 1](1-base-communautaire.md) (les votes) et du [lot 3](3-formulaire.md) (les problèmes connus, dont
> la boîte à idées reprend le mécanisme), que cette spécification ne rouvre pas.

## La direction

Un vote, un soutien, une note : chacun tient en un toucher, et aucun ne porte d'identifiant. Le
sondage vit dans la fiche de l'annonce, sous le récit, comme une liste de choix que le toucher
transforme en résultats : un trait et un chiffre par choix, pas de graphique. La boîte à idées est la
page des problèmes connus tournée vers l'avant : ce que l'équipe a retenu, reformulé, avec son
statut, et les deux mêmes gestes. La notation ne se demande pas : le système la propose, rarement,
après qu'un menu a été lu.

## Ce qui est à faire

### 1. Les sondages

- **Le modèle** : une colonne `annonces.sondage` (jsonb), `{ question, choix: [{ id, libelle }], clos_le }`,
  bornée par `private.sondage_valide` — une question de 4 à 140 caractères, deux à six choix de 1 à
  60 caractères aux identifiants distincts (`^[a-z0-9]{1,8}$`), une clôture datée
  ([migration](../../supabase/migrations/20261125070000_sondages_idees.sql)). La colonne vit avec
  l'annonce : elle se publie, se programme, se cible et s'archive avec elle, et une ancienne version
  de l'application l'ignore.
- **Le vote** : sujet `sondage.choix` du lot 1, cible l'annonce, valeur l'identifiant du choix ; un
  bulletin par appareil et par sondage (le jeton de vote), définitif. `contribuer` juge désormais la
  cible d'un vote (`private.juger_vote`) : une annonce visible, un sondage ouvert, un choix qui existe.
- **Les résultats** : `public.resultats_sondage(annonce)`, lisible par `anon`, ne compte que les voix
  attestées et ne rend que des parts : un choix sous cinq voix est masqué, et les cases masquées se
  regroupent — tant que leur somme reste sous cinq, la plus petite case visible les rejoint, sans quoi
  la case masquée se lirait par soustraction des parts visibles ; un sondage où tout se masque ne rend
  rien ; le total ne se dit que lorsque aucune case n'est masquée ([mesure.md](../mesure.md#les-petites-cases)).
  Une case masquée se lit « Peu de voix » : « moins de 5 » serait faux pour la case visible qui la rejoint.
- **L'écran** : sous le récit de la fiche ([`SondageDAnnonce`](../../src/features/Campus/Bde/SondageDAnnonce.tsx),
  la logique dans [`useSondage`](../../src/features/Campus/Bde/useSondage.ts)) : la question, les choix
  en rangées ; après le vote, ou à la clôture, chaque rangée porte un trait proportionnel et sa part,
  le choix de l'appareil coché. L'appareil se souvient de son choix (`sondages-votes@1`) : rien d'autre
  ne le dit. Un sondage clos montre ses résultats à tous.
- **La console** : un champ « Sondage » dans l'éditeur d'annonces (question, choix, clôture), le rappel
  de la règle, et les résultats sous l'aperçu, relus de la ligne enregistrée — voix attestées par choix,
  protégées comme toute case de la console (`proteger`), non attestées à part. Un choix neuf tire un
  identifiant au hasard : il ne reprend jamais les voix d'un choix retiré.
- **La ligne éditoriale** : jamais sur un sujet politique ; écrite dans le [guide de l'équipe](../guide-console.md#ce-qui-ne-se-fait-jamais),
  rappelée dans l'aide du champ.

### 2. La boîte à idées

- **Le modèle** : `idees`, au gabarit de `problemes_connus` — titre, détail, statut (`brouillon`,
  `proposee`, `en_cours`, `livree`, `close`), la version qui la livre. L'application lit tout sauf
  `brouillon` et `close` ; un admin écrit.
- **« Moi aussi »** : sujet `idee.moi_aussi`, valeur `oui` — rien sur l'appareil, contrairement à un bug.
  `juger_vote` exige une idée proposée ou en cours.
- **« Moi aussi, et j'ajoute un détail »** : le formulaire, nature idée, rangé sous l'idée
  (`retours.idee`, posé par `deposer_retour` et la fonction `communaute`) ; la console le montre dessous.
- **Le mécanisme commun** : la liste, son cache et les votes gardés sur l'appareil vivent dans
  [`suivis.ts`](../../src/shared/retours/suivis.ts), qui sert les problèmes connus et les idées ; la
  liste à gestes est [`ElementsSuivis`](../../src/features/Retours/components/ElementsSuivis.tsx) ; dans
  la console, le panneau « Ce qu'en disent les étudiants » est le même pour les deux pages.
- **L'écran** : « Boîte à idées » dans les Réglages, sous « Nous écrire » ; la case « idée » du
  formulaire montre les idées avant d'écrire, comme la case « problème » montre les problèmes connus.
- **La sortie d'une idée** : l'appareil compare ses soutiens aux statuts publiés, au lancement et au
  retour au premier plan, au plus toutes les six heures et seulement s'il en a donné ; une idée soutenue
  passée `livree` s'annonce une fois, par un dialogue en tête (`idees-annoncees@1`), après la réponse de
  l'équipe s'il y en a une — un dialogue à la fois. « Mets à jour » ne s'y lit que sur une version plus
  ancienne que celle qui livre.

### 3. La notation

- **La fiche native** : `expo-store-review` 57.0.3 (la version du SDK 57, vérifiée le 2026-11-25).
  Un usage réussi est un menu de restaurant lu ou une fiche de bibliothèque ouverte ; la demande part
  en quittant cette fiche, quand l'appareil compte au moins quatre jours d'usage réussi, que la
  dernière demande date de plus de cent vingt jours, et qu'aucune question d'avis — un vote, un
  « moi aussi », un retour, une réponse à « Sur place » — n'a été posée ce jour-là ([`notation.ts`](../../src/shared/notation/index.ts)).
  Le système borne encore l'affichage (trois fois par an sur iOS, un quota non publié sur Android).
- **« Noter UKit »** dans les Réglages, groupe « Retours », avec « Nous écrire » et la boîte à idées : la
  page d'écriture d'un avis sur l'App Store (`action=write-review`), la fiche Google Play sur Android (l'application
  Play, sinon sa page web), ouvertes hors de l'application. Sans base de publication, le groupe ne porte
  qu'elle.

## Décisions et pièges

- **Le sondage est une colonne de l'annonce**, pas une table : il n'existe pas sans elle, se lit dans
  la même requête, et suit son cycle de vie et son ciblage sans politique de plus.
- **La cible d'un vote se juge dans la base**, par `juger_vote` appelée depuis `contribuer`, réécrite
  à l'identique hors de ce bloc (empreinte comparée à la production) : un vote sur un sondage clos ou un
  choix inventé ne s'écrit pas, même par un appel direct de la fonction. Les problèmes connus n'y
  entrent pas : la recette du lot 3 vote sur un problème fictif, et durcir son vote est hors du lot.
- **Les voix non attestées ne comptent pas** dans les résultats publics (le plan) : au banc, un sondage
  reste « pas encore assez de voix ». La console les montre à part.
- **Les résultats ne se cachent pas avant le vote côté serveur** : un vote ne porte aucun identifiant,
  la base ne sait pas qui a voté. L'écran ne les montre qu'après ; l'API les rend à qui les demande.
- **Changer les choix après les premières voix** les fausse : un choix retiré perd ses voix, un choix
  renommé garde les siennes. L'aide du champ le dit.
- **Une question d'avis bloque la notation du jour** : la règle de Google interdit de la demander juste
  après une question sur l'avis de l'étudiant ; le jour entier est plus simple et plus sûr qu'une durée.
- **La carte d'une annonce ne change pas** : le plan de 7-I ne lui laisse pas de place sans surcharge ;
  le sondage se découvre dans la fiche.
- **Les votes se purgent douze mois après leur jour** (`votes-purge`, quotidienne) : la durée que le
  lot 1 laissait au lot 4.

## Ce que les relectures ont corrigé

Une relecture de la base avant l'application, une de l'application et de la console avant la
publication : un bloquant, six importants, corrigés.

- **Une petite case se lisait par soustraction des parts** : masquer le total ne suffisait pas, d'où
  le regroupement des cases masquées (bloquant, avant la mise en production).
- **Une clôture impossible** (un 30 février) passait le `check` puis faisait échouer chaque vote en
  503 : la garde la refuse.
- **Un choix neuf reprenait les voix d'un choix retiré** dans la console, par la première lettre libre.
- **La fiche de notation pouvait suivre une réponse à « Sur place »** : c'est une question d'avis.
- **Deux dialogues pouvaient s'empiler** au lancement — iOS n'en montre qu'un.
- **Les résultats de la console suivaient la saisie**, pas la base.
- Et des mineurs : une idée livrée sans version, un détail rangé sous une idée et un problème à la
  fois, `juger_vote` sans besoin de `security definer`, un vote sur un choix changé lu comme une panne,
  « Mets à jour » à qui est déjà à jour, deux choix de même libellé.

## Définition de « terminé »

- la migration recettée en transaction annulée sur la production, avec les recettes des lots 1 et 3
  rejouées, appliquée, la recette rejouée sans elle ; la fonction `communaute` déployée ;
- la fiche, la boîte à idées et la notation en trois langues, deux thèmes ; `tsc`, ESLint à zéro,
  `npm test`, la console construite, `expo export` des deux plateformes, `deno check` ;
- la console en ligne depuis `main` : le sondage dans l'éditeur, la page Idées, la section Communauté ;
- le build de développement Android au banc, chaque parcours joué ; les essais effacés de la production.

## Plan de test

1. **En SQL, en transaction annulée sur la production** ([`recettes/sondages_idees.sql`](../../supabase/recettes/sondages_idees.sql)) :
   la forme du sondage ; le vote accepté, unique, refusé sur un sondage clos, un choix inconnu, une
   annonce archivée ou sans sondage ; les résultats sous cinq et au-dessus, les non attestés exclus, le
   total masqué ; `idees` lue par `anon` sans brouillon ni close, écrite par un admin, refusée à un
   lecteur ; « moi aussi » sur une idée, refusé sur une idée close ; le détail relié, et sans lien pour
   une idée close ; la purge planifiée. Puis les recettes des lots 1 et 3, rejouées sur la migration.
2. **Par `npm test`** : la lecture du sondage et des résultats, la cadence de la notation, la liste des
   idées et l'annonce de leur sortie (application) ; l'idée d'un retour (fonction) ; le champ et ses
   refus (console).
3. **Par l'API publique, après le déploiement** : `resultats_sondage` lisible, `idees` sans brouillon, un
   vote non attesté sur un sondage, refusé une seconde fois.
4. **Sur le banc** (`ukit`, Android 15) : une annonce d'essai en audience `testeurs` avec un sondage, le
   vote, les résultats (voix attestées semées), la clôture ; la boîte à idées, « Moi aussi », « Ajouter
   un détail », l'idée livrée annoncée ; « Noter UKit » ; en clair et en sombre, en français et en
   espagnol.
5. **Dans la console locale**, un compte jetable : composer un sondage, ses refus, ses résultats ;
   publier, reformuler, livrer une idée, ses « moi aussi » et ses détails ; la section Communauté ; à
   1 440 et 390 pixels.

*Joué le 2026-11-25.* La recette SQL, quarante vérifications conformes en transaction annulée avec la
migration, puis sans elle une fois appliquée ; les recettes des lots 1 (86), 2 (45) et 3 (78) rejouées
sur la migration ; `contribuer` et `deposer_retour` comparées à la production, seuls les blocs du lot 4
diffèrent ; la vue lisible et la production à la même empreinte. Par l'API publique : `resultats_sondage`
lisible, `idees` sans brouillon, l'écriture d'`idees` et de `votes` et l'appel de `juger_vote` refusés à
la clé publiable. `npm test` : 1 630 tests ; `expo export` des deux plateformes ; le build `85739de7`
(APK `ukit-dev-2026-11-25-store-review.apk`).

Sur le banc (`ukit`), en clair et en français puis en sombre et en espagnol, une annonce d'essai en
audience `testeurs` : le sondage avant le vote, le vote (arrivé non attesté, exclu des résultats), les
résultats de vingt voix attestées semées, le choix coché ; la boîte à idées, « Moi aussi » (« Soutenue »),
« Ajouter un détail » et le retour rangé sous l'idée dans la console ; l'idée passée livrée, annoncée au
retour au premier plan ; « Noter UKit », qui ouvre la fiche Play dans le navigateur, l'émulateur n'ayant
pas Google Play. Le banc a fait corriger : « En cours » répété sous le titre de son groupe, « Signalé »
sur une idée, la sortie d'une idée tue sur l'écran de la boîte, la date de clôture sans « de » en
espagnol. Dans la console locale (compte jetable admin, supprimé de l'authentification et d'`editeurs`) :
le sondage dans l'éditeur et ses résultats, la page Idées et ses détails, la section Communauté. Les
essais (annonce, votes, idées, retour, testeur, lignes du journal) sont effacés de la production ; une
ligne d'`appareils` du jour, celle de l'émulateur, servait déjà aux lots précédents et reste à la purge.

## Limites écrites

- **Le chemin attesté n'est pas joué au banc** (lot 1) : les votes du banc arrivent non attestés et ne
  comptent pas.
- **Les résultats sont lisibles avant le vote** par qui appelle l'API, et à chaque appel : les relever
  à chaque voix nouvelle dit ce qu'a choisi le dernier votant, sans dire qui il est.
- **Un sondage remplacé dans la même annonce garde les bulletins de l'ancien** : le jeton de vote tient à
  l'annonce. Un nouveau sondage se publie dans une nouvelle annonce.
- **Les votes se purgent à douze mois** : une idée proposée depuis plus d'un an perd ses premiers
  « moi aussi », et un appareil peut alors revoter.
- **Hors ligne et sans cache**, la boîte à idées dit « aucune idée publiée ».
- **La fiche de notation native n'est pas jouée au banc** : l'émulateur n'a pas Google Play.
- **Une réinstallation oublie les votes de l'appareil** : il peut revoter (une autre clé), et ne sera
  pas prévenu de la sortie d'une idée soutenue avant.
- **La fiche de notation ne se voit pas sur un build de développement Android** : Google Play ne la
  montre qu'à une application installée depuis le store ; elle se juge sur la piste de test interne.
- **Le vote d'un problème connu n'est pas jugé** sur sa cible (le lot 3) : `juger_vote` laisse passer
  `probleme.moi_aussi`, dont la recette vote sur un problème fictif.
- **Les idées et les sondages sont en français**, comme les annonces.
