# L'histoire de UKit

> D'où vient l'application, tournant par tournant. Ce qui change d'une version à l'autre est dans le
> [CHANGELOG](../CHANGELOG.md), et la façon dont le travail se mène, dans les phases
> ([phase 6](phase-6/README.md), [phase 7](phase-7/README.md)) : un chapitre s'ajoute ici à un tournant, pas
> à une version. Les dates viennent de l'historique Git, des stores et des archives du web ; quand une
> archive ne donne qu'une date au plus tard, c'est écrit.

UKit est plus vieux que son dépôt. Il est né en 2012, sous un autre nom : un site d'emplois du temps fait
par un étudiant de Bordeaux 1.

| Quand | Le tournant |
|---|---|
| 2012 | « Emplois du temps de Bordeaux I », un site fait par un étudiant |
| 2015 | « Emplois du temps Bordeaux », l'application Android, sur la fiche du Play Store que UKit occupe encore |
| 2017 | le code d'aujourd'hui : edtBordeaux, puis USmart, puis UKit |
| 2018 | UKit Bordeaux sur l'App Store |
| 2021 | le renouveau, et la version 4 |
| 2023 | le dernier commit de kb-dev |
| Hiver 2025-2026 | la transmission à KAE Lab |
| Printemps 2026 | la version 5 : les restaurants et les bibliothèques rejoignent l'emploi du temps |
| Été 2026 | Aetherius, puis la version 6 : le comportement de l'application devient de la donnée |
| Rentrée 2026 | Disrupt Campus, et l'Épure |

## 2012 : un site d'étudiant

Jean — HackJack sur GitHub — met en ligne, sur son site `hackjack.info/et`, les **« Emplois du temps de
Bordeaux I »** : la liste des groupes de l'université, et pour chacun l'emploi du temps du jour, celui de
la semaine, et le lien vers l'emploi du temps officiel. La page est en ligne **au plus tard le 12 septembre
2012**, date de sa première capture dans les archives du web.

## 2015 : l'application Android

Au plus tard en mai 2015, le même site propose de télécharger **« Emplois du temps Bordeaux »**, son
application Android. Sa fiche du Play Store la présente comme « les emplois du temps de l'Université de
Bordeaux - Collège Sciences et Technologies (ex Bordeaux 1) sur Android. Application non-officielle
développée par un étudiant » ; en novembre 2015, elle compte déjà **entre 1 000 et 5 000
téléchargements**. Son code est publié sur GitHub le 31 août 2015.

Son identifiant, `com.bordeaux1.emplois`, est **toujours celui de UKit** sur Android
([app.config.ts](../app.config.ts)) : c'est la même fiche du Play Store, depuis dix ans.

## 2017 : UKit

Le 3 juillet 2017, Jean ouvre le dépôt de l'application d'aujourd'hui, écrite en React Native avec Expo,
sous le nom d'**edtBordeaux**. Elle devient **USmart** le 15 septembre, puis **UKit** deux jours plus tard.
Le projet est porté par kb-dev, l'organisation de ses créateurs ; Florian (AamuLumi) rejoint le code en
2018.

## 2018 : l'App Store

**UKit Bordeaux** sort sur l'App Store le **1er septembre 2018** : l'application existe désormais sur les
deux plateformes.

## 2021 : le renouveau

Après deux années calmes, 2021 est l'année la plus active de kb-dev. Thomas (thclmnt) monte Expo 41 en juin
et signe plus d'une centaine de commits dans l'année ; Florian passe l'application en **version 4** le
27 août ; en septembre, Gogotron ajoute l'espagnol et Clément (Shapeqs) corrige les filtres.

## 2022 à 2025 : la veille

Quelques correctifs, jusqu'à la 4.1.2. Le dernier commit de kb-dev date du **11 septembre 2023** ; le dépôt
d'origine, [kb-dev-lab/UKit](https://github.com/kb-dev-lab/UKit), est aujourd'hui archivé. En 2024 et en
2025, aucun commit : l'application reste sur les stores, telle quelle.

## Hiver 2025-2026 : la transmission

Pendant les vacances de Noël 2025, Angy forke UKit pour en corriger quelques bugs et s'en faire sa propre
version Android. Jean lui propose alors de **reprendre le relais**. Nous saisissons l'occasion à deux :
UKit passe à **KAE Lab**, notre organisation, et son code rejoint
[KAE-Lab/UKit](https://github.com/KAE-Lab/UKit) le **20 février 2026**.

## Printemps 2026 : la version 5

La **5.0.0** sort le 23 février 2026 : l'application remise à jour, sur un Expo récent. Dans la foulée, la
version 5 fait de UKit plus qu'un emploi du temps : **les restaurants du CROUS et leurs menus**, puis **les
bibliothèques et leur affluence en temps réel** rejoignent l'application, et s'affinent jusqu'en avril —
cartes illustrées, favoris, filtres —, avec une politique de confidentialité.

## Été 2026 : Aetherius, puis la version 6

L'été est celui d'**[Aetherius](https://github.com/kln-mltre/Aetherius)**, un moteur d'automatisation, puis
de la **version 6**, qui s'appuie dessus : les sources de l'application deviennent des Blueprints, joués par
le moteur embarqué et publiés depuis une base. Corriger une source ou ajouter une université devient une
publication de données, plus une mise à jour : Bordeaux INP entre ainsi dans l'application sans release. La
**6.0** sort le 31 août 2026, et quatre publications la prolongent en septembre
([phase 6](phase-6/README.md)).

En parallèle, après un jury en juin, nous obtenons le **statut national d'étudiant-entrepreneur** pour
l'année 2026-2027, auprès de l'[UBee Lab](https://ubeelab.u-bordeaux.fr/), l'incubateur étudiant de
l'université de Bordeaux : UKit devient aussi un projet entrepreneurial.

## Rentrée 2026 : Disrupt Campus

Ce statut nous ouvre le programme
[Disrupt Campus](https://www.u-bordeaux.fr/formation/enrichir-et-valoriser-son-parcours/disrupt-campus)
de l'université de Bordeaux, avec le soutien de l'UBee Lab : de janvier à juin 2027, une équipe
d'étudiants de master travaille sur le modèle économique de UKit, son cadre légal et son acquisition. Pour
présenter le projet aux étudiants du programme, le 24 septembre, naît **l'Épure**, la première identité
visuelle de UKit ([identite.md](identite.md)).

À cette rentrée, **plus de 2 000 étudiants** utilisent l'application, dans deux établissements — le
Collège Sciences et Technologies de l'université de Bordeaux et Bordeaux INP —, et trois autres campus sont
en préparation ([phase 7](phase-7/README.md)).

La suite s'écrira ici, au fil de l'année.

## Sources

- le site de 2012 : [capture du 12 septembre 2012](https://web.archive.org/web/20120912033032/http://hackjack.info:80/et/)
- l'application Android proposée sur le site : [capture du 22 mai 2015](https://web.archive.org/web/20150522003633/http://hackjack.info/et/)
- la fiche du Play Store en 2015 : [capture du 8 novembre 2015](https://web.archive.org/web/20151108130326/https://play.google.com/store/apps/details?id=com.bordeaux1.emplois)
- le code de l'application Android : [HackJack-101/EdT-Bordeaux-Android](https://github.com/HackJack-101/EdT-Bordeaux-Android)
- le dépôt de kb-dev : [kb-dev-lab/UKit](https://github.com/kb-dev-lab/UKit), et l'historique Git de ce dépôt, qui le prolonge
- la fiche de l'App Store : [UKit Bordeaux](https://apps.apple.com/app/id1394708917), sortie initiale le 1er septembre 2018
