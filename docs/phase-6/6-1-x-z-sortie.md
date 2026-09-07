# 6.1.x-Z — Sortie de la 6.1.x

> **Une version qui devait ne rien montrer, et qui montre un peu.** Elle est partie le 2026-09-06
> comme une 6.1.1 courte — le socle monté, la synchronisation corrigée, les retours branchés. Le
> soir même, le but a changé : *se débarrasser d'un maximum de demandes* avant la 6.2. Elle porte
> donc des capacités — la Scolarité sans compte, les calendriers du téléphone, le ciblage par
> plateforme — et son **numéro se décide à la fin**, quand on saura ce
> qu'elle contient : `6.1.1` si c'est une correction, `6.2` n'est pas à prendre (c'est le mouvement),
> donc vraisemblablement une mineure d'un autre nom. La branche s'appelle `v6.1.x` pour cette raison.

## Ce qui sort

La version **6.1.x** : [A](6-1-x-a-montee-du-socle.md) la montée du socle,
[B](6-1-x-b-signalements.md) ce qui a été signalé, [C](6-1-x-c-retours.md) les retours — livré par
publication, sans build —, [D](6-1-x-d-calendriers-du-telephone.md) les calendriers du téléphone
dans le Planning et le ciblage par plateforme — les messages en notification, en vrai push,
attendent la version suivante.

Elle reste attribuable : rien de visuel n'y bouge, et ce qui y bouge est nommé jalon par jalon. Les
publications de B (les deux Blueprints de dossier) et de C partent **avant** le workflow.

## La vérification Android, en une fois

**Décision du 2026-09-07** : le second testeur n'est pas disponible à chaque jalon. Chaque jalon
vérifie sur iPhone, **note ici ce qu'il laisse à Android**, et Android se joue une fois, à la fin,
avant le workflow. La liste s'allonge à chaque jalon ; rien ne s'en retire sans avoir été joué.

| Jalon | À vérifier sur Android |
|---|---|
| [A](6-1-x-a-montee-du-socle.md) | *fait le 2026-09-06* — ouverture sous l'Expo Go du store, parcours froid, navigation, clavier des filtres d'UE |
| [B](6-1-x-b-signalements.md) | le ruban des jours et les carrousels du Planning **sans le glissement entre onglets** (le défaut qui l'a fait retirer était Android) ; la page Scolarité sans compte, portes et documents ; l'entretien au retour au premier plan et « Oublier l'échéance » puis relance ; les identifiants du navigateur (mémoriser, remplir, oublier) ; les filtres d'UE sur `MI601A` ; la fiche du compte en échec |
| [D](6-1-x-d-calendriers-du-telephone.md) | *à compléter à sa livraison* — au moins : `getEventsAsync` ne rend que ce qui tient dans l'intervalle sur Android, l'événement à cheval sur minuit doit apparaître sur les deux jours après refiltrage ; le « + » ouvre l'éditeur du système ; un message ciblé `android` visible, un message ciblé `ios` invisible |
| Z | la tâche de fond sur build : `adb shell dumpsys jobscheduler` liste `ukit-entretien`, et la mesure de 24 heures |

## Le protocole

Celui de [6.1-Z](6-1-z-sortie.md), joué tel quel — il a été écrit une fois pour toutes. Quatre points
lui sont propres cette fois :

1. **Les identifiants EAS se revérifient avant le workflow.** Une montée de SDK touche la
   configuration native ; le profil de provisionnement iOS avait déjà coûté une soirée le 31 août.
2. **La vérification Android groupée** ci-dessus se joue sur un build de développement Android, en
   entier, avant le workflow.
3. **Le test sur build compte double.** TestFlight et la piste interne du Play, sur les deux
   plateformes, avec le protocole appareil de [A](6-1-x-a-montee-du-socle.md) joué en entier — pas un
   survol.
4. **La mesure de 24 heures de [B](6-1-x-b-signalements.md) doit être faite sur un build de
   production**, pas seulement sur un build de développement : les tâches de fond ne sont pas
   ordonnancées pareil, et **sous Expo Go elles n'existent pas**. La ligne d'état des Réglages et le
   bloc Entretien du menu de développement en sont l'instrument — la dernière tentative porte son
   origine (`tache`, `lancement`, `premier-plan`, `activation`) et son heure.

## Le numéro

À décider ici, au moment de poser le tag, en relisant le CHANGELOG « Non publié » : ce que la version
ajoute décide de son nom. `package.json`, `app.config.ts` et `VERSION` se mettent d'accord à ce
moment-là, jamais avant ([plateforme.md](../plateforme.md#les-numéros-de-version)).

## Ce qui vient après

**La 6.2 reste la version du mouvement**, telle que le
[README de phase](README.md#la-v6-part-en-deux-temps--puis-trois) l'a définie le 2026-09-04. Elle
s'ouvre par [son relevé](6-2-a-releve-et-vocabulaire.md), et la boucle d'itération que cette
version-ci restaure est ce qui la rend jouable.

**Le [chantier campus](../adaptation-campus.md) court en parallèle**, hors version : il ne demande
aucune release.

## Limites écrites

- **Les notes de version diront plus que prévu.** Une correction attendue, deux capacités, et le
  silence sur le socle. C'est ce que la version est devenue, et il vaut mieux l'écrire.
- **Une montée de socle ne se rejoue pas.** Si elle passe mal en production, le retour arrière est
  une release, pas une publication — c'est la seule partie de ce plan qui ne se corrige pas à chaud.
- **Android n'a été vu qu'à la fin.** Un défaut trouvé alors se corrige alors ; c'est le prix d'un
  second testeur qu'on n'a pas à chaque jalon, et c'est accepté.
