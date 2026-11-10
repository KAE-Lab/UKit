# La prochaine version

> Ouvert le 2026-11-10. Remplace, pour cette version, le découpage en jalons de
> [phase-7](phase-7/README.md) : trois lots menés l'un après l'autre sur la branche
> `prochaine-version`, un seul agent à la fois. Le numéro se décide à la sortie.

## Ce qu'elle contient

Le code de la 6.3 tel qu'il est sur `main`, plus trois lots. Les grosses fonctions interactives
(signalements, sondages, attente au restaurant) et les comptes sont **hors de cette version**.

| Lot | Contenu | État |
|---|---|---|
| 1. Zéro défaut | les défauts signalés par le formulaire, le registre ouvert, puis un audit par parcours au banc | ouvert le 2026-11-10 |
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
