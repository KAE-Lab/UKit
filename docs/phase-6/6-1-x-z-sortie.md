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
dans le Planning et le ciblage par plateforme, [E](6-1-x-e-notifications-push.md) les messages de
service en notification push — d'abord reportés, finalement livrés le 2026-09-08.

Elle reste attribuable : rien de visuel n'y bouge, et ce qui y bouge est nommé jalon par jalon. Les
publications de B (les deux Blueprints de dossier) et de C partent **avant** le workflow.

## La vérification Android, en une fois

**Décision du 2026-09-07** : le second testeur n'est pas disponible à chaque jalon. Chaque jalon
vérifie sur iPhone, **note ici ce qu'il laisse à Android**, et Android se joue une fois, à la fin,
avant le workflow. La liste s'allonge à chaque jalon ; rien ne s'en retire sans avoir été joué.

| Jalon | À vérifier sur Android |
|---|---|
| [A](6-1-x-a-montee-du-socle.md) | *fait le 2026-09-06* — ouverture sous l'Expo Go du store, parcours froid, navigation, clavier des filtres d'UE |
| [B](6-1-x-b-signalements.md) | ~~le ruban des jours et les carrousels du Planning **sans le glissement entre onglets**~~ *(joué le 2026-09-08 — bloqués au premier essai : `gestureEnabled` de la pile capturait le geste horizontal sur Android ; corrigé, revérifié)* ; ~~la page Scolarité sans compte, portes et documents~~ *(joué)* ; l'entretien au retour au premier plan et « Oublier l'échéance » puis relance ; les identifiants du navigateur (mémoriser, remplir, oublier) ; les filtres d'UE sur **`4TRN901S`** — `MI601A`, sur lequel la règle a été mesurée en 2025-2026, ne porte plus que des vacances cette année ; le groupe de remplacement a été trouvé le 2026-09-08 en sondant le serveur, et il est meilleur : il porte les trois formes à la fois, des cours à `4TRNN01U` seul, d'autres à `4TRNN02U` seul, et **onze cours qui portent les deux** (les vendredis 9h30–12h30 à partir du 2 octobre) ; la fiche du compte en échec |
| [C](6-1-x-c-retours.md) | ~~depuis la pastille d'état de service, ouvrir le formulaire, toucher le lien de la page d'engagement : il s'ouvre par-dessus dans l'application, et « retour » retrouve le formulaire intact~~ *(joué le 2026-09-08 — échouait des deux côtés pour trois causes empilées, voir [defauts-fonctionnels.md](../defauts-fonctionnels.md) ; corrigé, revérifié sur les deux plateformes)* ; puis l'ENT depuis la Scolarité : ses liens restent dans la vue intégrée (la seule ligne de code applicatif du jalon — le reste est livré par publication, et la console et le cron vivent depuis `main`, avancé le 2026-09-07) |
| [D](6-1-x-d-calendriers-du-telephone.md) | *livré le 2026-09-07, partiellement joué sur Android le 2026-09-08* — la lecture des calendriers a d'abord rendu **zéro événement** : l'éditeur du système écrivait dans un autre calendrier que celui demandé, l'application adopte désormais celui où l'événement a réellement atterri. Reste à jouer : **une journée entière** tient sur son seul jour (datée en UTC à fin exclusive, règle déduite des sources natives, jamais mesurée) et un événement de trois jours couvre les trois ; l'événement à cheval sur minuit apparaît sur les deux jours après refiltrage (`getEventsAsync` ne rend que ce qui tient dans l'intervalle) ; le « + » ouvre l'éditeur du système **et l'événement n'apparaît qu'après la fermeture de l'éditeur**, pas à son ouverture (`startNewActivityTask: false`) ; « Ouvrir dans le calendrier » sur un rendez-vous récurrent ; l'écran des calendriers du téléphone, par source, avec la couleur ; un message ciblé `android` visible, un message ciblé `ios` invisible, une annonce de même |
| [E](6-1-x-e-notifications-push.md) | *protocole iPhone clos 8/8 le 2026-09-08* — sur un build Android avec les identifiants FCM posés sur EAS : ~~le dépôt du jeton~~ *(joué — la ligne `android` est en base)*, ~~une notification reçue application fermée~~ *(joué — reçue alors que le testeur faisait autre chose)* ; reste : qu'elle **ouvre la feuille**, le canal « Messages de service » visible dans les réglages de notification du système, et une notification qui **surgit** par-dessus l'écran (le canal naissait en importance `DEFAULT`, corrigé le 2026-09-08 — exige de redéployer la fonction), l'interrupteur qui retire la ligne |
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

**Décidé le 2026-09-08 : `6.2.0`.** Le CHANGELOG a tranché à lui seul — la version ajoute les
messages de service en notification push, les calendriers du téléphone dans le Planning et le
ciblage par plateforme, en plus de la Scolarité sans compte et des retours en base. Trois capacités
nouvelles : c'est une mineure, et un numéro de correction l'aurait sous-décrite. *Un numéro décrit ce
qui est sorti, pas ce qui était prévu.*

La conséquence était connue en décidant : **le mouvement de l'interface, planifié sous le numéro 6.2,
devient la 6.3**, et le contenu la 6.4. Les documents de plan gardent leurs noms de fichier, qui sont
leurs adresses ; le renumérotage est consigné dans le [README de phase](README.md).

`package.json`, `app.config.ts` et `VERSION` se mettent d'accord au moment du tag, jamais avant
([plateforme.md](../plateforme.md#les-numéros-de-version)).

**Le tag est le lancement**, et pas seulement une étiquette : `.github/workflows/release.yml` se
déclenche sur `v*` et construit, publie et **soumet** aux deux stores. Il ne se pose donc qu'une fois
la vérification Android ci-dessus jouée en entier.

## Ce qui vient après

**La 6.3 reste la version du mouvement** — 6.2 quand elle a été décidée, renumérotée le 2026-09-08 —,
telle que le
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
  second testeur qu'on n'a pas à chaque jalon, et c'est accepté. **Ce que ça a coûté, le 2026-09-08,
  mérite d'être écrit** : la passe Android a trouvé sept défauts, dont trois qu'aucun test iPhone ne
  pouvait voir — les listes horizontales bloquées par un geste de navigation, les liens du formulaire
  confiés au navigateur du système, la barre d'onglets collée à la barre système —, un quatrième que
  seuls de vieux appareils révèlent — l'autorité de certification des facs, absente d'Android avant
  mi-2021, qui tue **toute** la moitié universitaire de l'application —, et un cinquième qui touchait
  les deux plateformes sans que personne l'ait vu, le teaser qu'un flou ne masquait pas. La leçon
  n'est pas « il fallait Android plus tôt » — le second testeur n'était pas disponible — mais que
  **le rendu et le réseau sont les deux domaines où une plateforme ne dit rien de l'autre**.
- **Deux correctifs Expo sortis le jour même n'ont pas été pris** : `expo` 57.0.21 et
  `expo-calendar` 57.0.3, publiés pendant la passe Android — `expo-doctor` passait 21/21 à 15h45 et
  20/21 à 16h30 sans qu'une ligne du dépôt ait bougé. Toute la vérification de la journée a été
  jouée sur les versions installées, et monter `expo-calendar` sous une version dont la capacité
  phare est justement les calendriers du téléphone demanderait de tout rejouer. À prendre au début
  de la 6.3, pas à la fin de celle-ci.
- **Le push iOS n'a pas été vérifié de bout en bout depuis la console.** La chaîne est prouvée saine
  — un envoi direct est arrivé sur l'iPhone, avec un reçu `ok` d'Expo —, le code déployé, le ciblage
  et la charge utile sont vérifiés un par un, et Android fonctionne. Reste un envoi depuis la console
  qui arrive sur iPhone : la clé APNs venait d'être assignée, et Apple limite le renouvellement du
  jeton de fournisseur d'une clé neuve. À rejouer sur le build de production, avec la même clé.
