# La prochaine version

> Ouvert le 2026-11-10. Remplace, pour cette version, le découpage en jalons de
> [phase-7](phase-7/README.md) : trois lots menés l'un après l'autre sur la branche
> `prochaine-version`, un seul agent à la fois. Le numéro se décide à la sortie.

## Ce qu'elle contient

Le code de la 6.3 tel qu'il est sur `main`, plus trois lots. Les grosses fonctions interactives
(signalements, sondages, attente au restaurant) et les comptes sont **hors de cette version**.

| Lot | Contenu | État |
|---|---|---|
| 1. Zéro défaut | les défauts signalés par le formulaire, le registre ouvert, puis un audit par parcours au banc | joué le 2026-11-10 : 18 entrées corrigées au registre, 9 restent ouvertes avec leur raison ; les quatre parcours restants joués au lot 2, le même jour (liste ci-dessous) |
| 2. Petites fonctions | ce qui s'ajoute sans décision d'architecture | joué le 2026-11-10 : « il reste N TD » livré, Appliphase reporté (raison ci-dessous), 7 entrées corrigées au registre (11 défauts croisés en jouant l'audit), 1 consignée |
| 3. Deux campus | IUT de Bordeaux, puis Bordeaux Montaigne, sur les comptes prêtés du `.env` | IUT joué le 2026-11-10 : vérifié au banc, publication préparée, non publiée ([fiche](campus/bordeaux-iut.md)) ; passe de corrections jouée le même soir ([ci-dessous](#la-passe-de-corrections-davant-montaigne)) ; Montaigne à ouvrir |

## Ce que « zéro défaut » veut dire ici

Un objectif ne se vérifie pas, une liste si. Le lot 1 est fini quand :

- chaque défaut **ouvert** de [defauts-fonctionnels.md](defauts-fonctionnels.md) est corrigé, ou
  porte la raison écrite pour laquelle il ne peut pas l'être (un compte manquant, une information
  attendue d'un utilisateur) ;
- chaque parcours de la liste d'audit a été joué au banc Android, dans les deux thèmes, sur
  `ukit` et `ukit-a8`, et ce qu'il a révélé est corrigé ou consigné ;
- les portes de [CLAUDE.md](../CLAUDE.md) sont vertes.

iOS n'est pas au banc : le lot rend la liste de ce qui reste à juger sur l'iPhone.

## Lot 1 : les défauts connus à l'ouverture

Venus des retours du formulaire, triés le 2026-11-10 :

1. **Les « UE non suivies » s'acceptent en lot** et peuvent masquer un vrai cours
   (`PropositionsModal.tsx`, `PropositionsDecision.ts`). À faire : un choix UE par UE, la raison de
   la proposition dite, et le chemin pour revenir en arrière montré après l'acceptation.
2. **« Journée libre » tout le semestre** quand le groupe favori n'a plus de cours (registre,
   2026-09-17).
3. **Un portail lent s'annonce « Le problème vient de UKit »** (registre, 2026-11-06). Deux retours
   sur la messagerie lente ou inaccessible y ressemblent.
4. **L'échec d'une synchronisation de l'agenda ne dit pas sa raison** à l'utilisateur ; elle n'est
   lisible que dans le menu de développement. Aucun contrôle de `allowsModifications` avant
   l'écriture (`CalendarSyncHelpers.ts`).
5. **Cours du matin absents le jour même**, deux retours sur Android 16 : aucune cause trouvée à la
   lecture du code. À reproduire au banc, sur Celcat et sur un lien d'abonnement.
6. **Liste des groupes vide sur Android 8.0**, un retour : à reproduire sur `ukit-a8`.
7. Le reste du registre ouvert : la barre de navigation d'Android 9, le parcours froid de l'INP sur
   appareil lent, l'étudiant de l'INP sans emploi du temps personnel, le bâtiment dont l'occupation
   échoue affiché libre, les intitulés d'un iCalendar collé.

Ne peut pas se corriger sans compte : l'emploi du temps nominatif du premier semestre de L1.

### La liste d'audit

Chaque parcours se joue au banc, sur `ukit` (Android 15) et sur `ukit-a8` (Android 9) sauf ceux de
la WebView, que `ukit` juge seul (la WebView de `ukit-a8` date de 2018). Coché : joué, avec
l'appareil, le thème (S sombre, C clair) et la langue (fr, en, es) de la passe. Non coché : pas joué
au 2026-11-10, avec ce qui manque. Ce que la passe a révélé est au [registre](defauts-fonctionnels.md),
daté du 2026-11-10 ; ce que le banc ne joue pas est en fin de section.

**Premier lancement et accueil**
- [x] installation neuve, langue et thème du système lus — `ukit` S fr, `ukit-a8` S fr
- [x] vitrine, préférences, établissement (Collège ST, INP, Autre campus) — `ukit` S, `ukit-a8` S
- [x] compte : connexion Bordeaux — `ukit` S ; passer sans compte — `ukit-a8` S
- [x] groupes : année, semestre, recherche sans année — `ukit` S, `ukit-a8` S (après réinitialisation)
- [x] fin du parcours, permission de notification — `ukit` S, `ukit-a8` C
- [x] liste des groupes vide hors ligne : « Service indisponible » et Réessayer, puis la liste au retour du réseau — `ukit-a8` S, au lot 2

**Planning**
- [x] jour : frise, pause, repère de l'heure, jour vide — `ukit` S C fr en es, `ukit-a8` S C fr es
- [x] semaine, dont la 53e de 2026 — `ukit` S
- [x] « Aujourd'hui » après un saut de nuit, en arrière-plan (`ukit-a8`, `ukit`) et au premier plan (`ukit`)
- [x] groupe éteint (« Rien depuis des semaines ») et jour férié — `ukit` S
- [x] hors ligne avec cache — `ukit-a8` S
- [x] lien d'abonnement collé, lien de travers — `ukit-a8` S
- [x] emploi du temps personnel de l'INP — `ukit` S
- [x] fiche d'un cours — `ukit` C ; le bouton de filtre de la fiche n'a pas été touché (caché par le bouton « Tools » du build de développement)
- [x] recherche de groupes, planning d'un autre groupe — `ukit` S C

**Scolarité** (WebView : `ukit` seul)
- [x] connexion, parcours froid, dossier, widgets — Bordeaux et INP, S
- [x] propositions : UE une par une, annulation, emploi du temps de l'INP — S
- [x] actualiser le dossier, ressaisir, réseau bridé — S
- [x] fiche du compte, révélation du mot de passe — S
- [x] ENT dans le navigateur intégré, liste des documents, lecteur — C
- [x] déconnexion — C
- [x] Scolarité en anglais et en espagnol : connexion, tableau, documents, fiche du compte, actualisation hors ligne — S, au lot 2

**Campus**
- [x] tableau de bord, position refusée puis accordée — `ukit` S C, `ukit-a8` C es
- [x] restaurants et menu du jour — `ukit` C, `ukit-a8` C
- [x] bibliothèques et fiche — `ukit` C ; `ukit-a8` C, liste et fiche, au lot 2 (la carte de la fiche reste grise : WebView de 2018)
- [x] annonces et fiche — `ukit` C ; `ukit-a8` C, liste et fiche jusqu'au bas du texte, au lot 2
- [x] salles libres, fiche d'un bâtiment, hors ligne — `ukit` S

**Réglages**
- [x] établissement : bascule et retour (favoris, filtres, session retrouvés) — `ukit` S
- [x] langue (fr, en, es) et apparence (clair, sombre), à chaud — `ukit`, `ukit-a8`
- [x] filtres : liste, compteur, ajout et retrait par la proposition — `ukit` S ; ajout manuel d'un code (minuscules, doublon, texte libre, touche Entrée) — `ukit` S, le 2026-11-10 au lot 2
- [x] agenda : permission, cible, lecture seule, UKit supprimé, échec dit — `ukit` S
- [x] notifications — `ukit` C
- [x] à propos, menu de développement — `ukit-a8` S
- [x] réinitialisation — `ukit-a8` C es
- [x] calendriers du téléphone : écran de choix, un calendrier coché puis décoché, son événement au Planning et sa fiche — `ukit` S, au lot 2

**Ce que le banc ne joue pas, à juger sur l'iPhone** : VoiceOver sur la WebView enveloppée, les
icônes devenues décor et les boutons nommés ; la modale des propositions et son dialogue d'annulation
(zones sûres, clavier) ; la synchronisation vers un calendrier iCloud ou Google en lecture seule,
et la recréation du calendrier « UKit » (iOS exige une source) ; le toast du trousseau qui refuse
l'écriture (Keychain) ; la WebView enveloppée de `pointerEvents="none"` sur WKWebView, qui doit
toujours jouer les parcours (connexion, widgets) ; le passage de minuit l'application ouverte ; la
bascule de langue à chaud sur le ruban des jours.

## Lot 2 : les petites fonctions retenues

- [x] « Il reste N TD ce semestre » sur la fiche d'un cours, calculé sur l'année déjà lue — livré le
  2026-11-10 ; ce qui identifie un enseignement, et quand la ligne se tait :
  [planning.md](features/planning.md#les-séances-restantes-sur-la-fiche-dun-cours). Vérifié sur
  `ukit` contre le champ des semaines de Celcat, S et C, fr en es.
- [ ] Un raccourci vers Appliphase parmi les services de la Scolarité, si le catalogue le porte sans
  toucher au code d'un établissement — **reporté le 2026-11-10**, pour deux raisons. L'adresse
  officielle n'a pas été trouvée : aucune page publique de l'université ne nomme Appliphase (recherche
  du 2026-11-10 ; les documents de la cellule PHASE citent le service et ses recrutements, pas l'outil),
  et une adresse ne se devine pas. Et ce n'est pas qu'une ligne de catalogue : la grille de la
  Scolarité n'affiche pas les `services` de l'établissement en liste, ses rangées (ENT, Moodle,
  messagerie, notes, examens) sont écrites dans
  [`GrilleScolarite`](../src/features/Scolarite/components/GrilleScolarite.tsx) ; une porte de plus
  demande une rangée, un libellé et une icône. Ce qu'il faut obtenir : l'adresse exacte, d'un étudiant
  recruté par PHASE ou de la cellule ; elle atterrira dans `services` de `bordeaux`
  ([`socle.ts`](../src/shared/etablissements/socle.ts) et la ligne publiée du catalogue), et la rangée
  dans la grille.
- Ce que le lot 1 aura fait remonter et qui relève d'une fonction plutôt que d'un défaut : rien
  au-delà du registre. Les défauts croisés en jouant les quatre derniers parcours sont au
  [registre](defauts-fonctionnels.md), datés du 2026-11-10 « pendant le lot 2 ».

Écarté de cette version : les créneaux communs avec un ami et l'alerte de cours déplacé, qui
demandent chacun un écran à dessiner ; la synchronisation en arrière-plan.

## Lot 3 : les deux campus

Le protocole est celui d'[adaptation-campus.md](adaptation-campus.md), les fiches sont dans
[campus/](campus/README.md). Deux choses propres à cette version :

- **l'emploi du temps doit arriver sans lien à coller** : le Blueprint du portail lit l'adresse
  d'abonnement après la connexion (`edt.abonnement.blueprint_lien`, prévu dans
  [6-J](phase-6/6-j-compte-et-sources-par-etablissement.md)) ;
- **un verdict à rendre pour l'IUT** : ce qui aurait pu se faire sans le compte prêté, et ce qui
  ne le pouvait pas. Il décide de ce qu'on demande aux volontaires des autres campus.

### L'IUT de Bordeaux, joué le 2026-11-10

Mesures, vérification au banc et verdict « avec ou sans compte » : [la fiche](campus/bordeaux-iut.md).
Le mécanisme du lien lu sur le compte : [planning.md](features/planning.md#le-lien-lu-sur-le-compte).

### La passe de corrections d'avant Montaigne

Jouée le 2026-11-10 au soir : des défauts du registre, chacun prouvé au banc et décrit dans son
entrée.

- **La première connexion universitaire** cédait en « Portail lent » sur une WebView froide :
  `ukit.portail.verification` version 3 lit sa preuve sur la page du CAS, sans `service`. Première
  tentative réussie au Collège ST, à l'IUT et à l'INP.
- **Sans position, aucune distance**, un ordre par nom, et la permission refusée ne se redemande plus
  (décision du propriétaire, [campus.md](features/campus.md#usecampuslocation) amendé). Croisés au
  passage : les distances écrites dans le cache partagé des bâtiments, un nom entre parenthèses rangé
  en tête.

**À publier, avec le reste** : `ukit.portail.verification` 3, depuis `main` (étape 3 ci-dessous ; le
manifeste publié est vide, lu le 2026-11-10 : la version 3 bat le socle du dernier tag et sera
annoncée). Sans publication, la correction arrive avec la release.

**À juger sur l'iPhone** :

- la première connexion sur un iPhone neuf (WKWebView, la page de succès du CAS) ;
- la permission de position refusée puis accordée dans Réglages (iOS ne repose jamais la question),
  et un nom de lieu entre parenthèses trié sous Hermes iOS ;

**Pour Bordeaux Montaigne**, même produit : le mécanisme et la projection des intitulés PRONOTE servent
tels quels. Il reste à écrire son portail de zéro (CAS distinct), et dans une copie du Blueprint
`ukit.portail.bordeaux-iut.edt.lien`, le bloc de connexion et les `vars` (`flaubert2`) ; puis à nommer
ce Blueprint dans `edt.abonnement.blueprint_lien` de sa ligne.

**La publication, préparée et non faite.** Elle se fait après relecture, dans cet ordre :

1. juger sur l'iPhone la touche Entrée de l'agent dans WKWebView (le seul geste propre au Blueprint) ;
2. amener sur `main` le Blueprint et son entrée de `versions.json` — la fusion de cette branche, ou
   le commit qui les ajoute : un manifeste se publie depuis `main`
   ([blueprints.md](blueprints.md#ce-que-le-manifeste-annonce)) ;
3. depuis `main`, `npm run blueprints:publish -- --dry-run`, qui doit annoncer
   `ukit.portail.bordeaux-iut.edt.lien` 1 (hors socle) et `ukit.portail.verification` 3, puis
   `npm run blueprints:publish` ;
4. la ligne de catalogue **seule**, jamais le fichier entier, qui réécrirait les trois autres lignes
   et ce que la console y a changé :
   ```bash
   awk '/^-- IUT de Bordeaux/{f=1} f; f && /alias *= excluded.alias;/{exit}' supabase/etablissements.sql > /tmp/bordeaux-iut.sql
   psql -h aws-0-eu-west-2.pooler.supabase.com -p 5432 -U postgres.$REF -d postgres -v ON_ERROR_STOP=1 -f /tmp/bordeaux-iut.sql
   ```
5. vérifier la lecture : `select code, edt from etablissements where code = 'bordeaux-iut';` ;
6. la sonde `pronote-bordeaux-iut` part avec `main`, rien à faire de plus.

Les binaires installés liront la ligne sans lire le lien (`blueprint_lien` leur est inconnu) : ils
proposeront de coller, avec l'aide du catalogue, et afficheront les intitulés PRONOTE empilés. La
lecture du lien, les intitulés et les journées entières arrivent avec la release qui suit.
