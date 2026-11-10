# La prochaine version

> Ouvert le 2026-11-10. Remplace, pour cette version, le découpage en jalons de
> [phase-7](phase-7/README.md) : trois lots menés l'un après l'autre sur la branche
> `prochaine-version`, un seul agent à la fois. Le numéro se décide à la sortie.

## Ce qu'elle contient

Le code de la 6.3 tel qu'il est sur `main`, plus trois lots. Les grosses fonctions interactives
(signalements, sondages, attente au restaurant) et les comptes sont **hors de cette version**.

| Lot | Contenu | État |
|---|---|---|
| 1. Zéro défaut | les défauts signalés par le formulaire, le registre ouvert, puis un audit par parcours au banc | joué le 2026-11-10 : 18 entrées corrigées au registre, 9 restent ouvertes avec leur raison, quatre parcours non joués (liste ci-dessous) |
| 2. Petites fonctions | ce qui s'ajoute sans décision d'architecture | à ouvrir |
| 3. Deux campus | IUT de Bordeaux, puis Bordeaux Montaigne, sur les comptes prêtés du `.env` | à ouvrir |

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
- [ ] liste des groupes vide hors ligne : non rejouée au lot 1 (vérifiée le 2026-11-08)

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
- [ ] Scolarité en anglais et en espagnol : non jouée

**Campus**
- [x] tableau de bord, position refusée puis accordée — `ukit` S C, `ukit-a8` C es
- [x] restaurants et menu du jour — `ukit` C, `ukit-a8` C
- [x] bibliothèques et fiche — `ukit` C ; `ukit-a8` : tableau de bord seulement
- [x] annonces et fiche — `ukit` C ; `ukit-a8` : tableau de bord seulement
- [x] salles libres, fiche d'un bâtiment, hors ligne — `ukit` S

**Réglages**
- [x] établissement : bascule et retour (favoris, filtres, session retrouvés) — `ukit` S
- [x] langue (fr, en, es) et apparence (clair, sombre), à chaud — `ukit`, `ukit-a8`
- [x] filtres : liste, compteur, ajout et retrait par la proposition — `ukit` S ; [ ] ajout manuel d'un code : non joué
- [x] agenda : permission, cible, lecture seule, UKit supprimé, échec dit — `ukit` S
- [x] notifications — `ukit` C
- [x] à propos, menu de développement — `ukit-a8` S
- [x] réinitialisation — `ukit-a8` C es
- [ ] calendriers du téléphone : la rangée seulement, l'écran de choix n'a pas été ouvert

**Ce que le banc ne joue pas, à juger sur l'iPhone** : VoiceOver sur la WebView enveloppée, les
icônes devenues décor et les boutons nommés ; la modale des propositions et son dialogue d'annulation
(zones sûres, clavier) ; la synchronisation vers un calendrier iCloud ou Google en lecture seule,
et la recréation du calendrier « UKit » (iOS exige une source) ; le toast du trousseau qui refuse
l'écriture (Keychain) ; la WebView enveloppée de `pointerEvents="none"` sur WKWebView, qui doit
toujours jouer les parcours (connexion, widgets) ; le passage de minuit l'application ouverte ; la
bascule de langue à chaud sur le ruban des jours.

## Lot 2 : les petites fonctions retenues

- « Il reste N TD ce semestre » sur la fiche d'un cours, calculé sur l'année déjà lue.
- Un raccourci vers Appliphase parmi les services de la Scolarité, si le catalogue le porte sans
  toucher au code d'un établissement.
- Ce que le lot 1 aura fait remonter et qui relève d'une fonction plutôt que d'un défaut.

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
