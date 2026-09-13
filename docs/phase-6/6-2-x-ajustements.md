# 6.2.x — Les ajustements d'après sortie

> **Jalon livré (code, documentation, tests) le 2026-09-11, vérifié sur les deux appareils en trois
> tours jusqu'au 2026-09-13, sorti en 6.2.1** — portes vertes : `tsc`, ESLint à zéro, 703 tests,
> `expo export` sur les deux plateformes. Le tableau ci-dessous porte ce qui a été joué, et ce qui
> ne l'a pas été. Les deux Android et les deux iPhone se
> réenregistrent une fois comme testeurs (lot 6). `expo-doctor` signale des correctifs Expo parus
> depuis la 6.2.0 (`expo` 57.0.22 et vingt-deux modules) — non pris, comme 6.1.x-Z l'avait décidé.
>
> **Premier tour sur iPhone et Galaxy A8 le 2026-09-11** : lots 1, 3 et 5 validés sur iPhone (le
> glissement « parfait ») ; sur l'A8 le glissement tient sur Campus, un coup rapide sur le ruban des
> jours passait aux onglets (corrigé, à rejouer) ; les ombres Android restaient plus lourdes
> (opacité ramenée de ×2 à ×1,25, à comparer) ; le lot 2 attendait une carte et non un bouton (fait,
> géocodeur du système) ; le menu de développement ne défilait pas et cachait la réinitialisation
> complète (fait). Sous Expo Go, l'A8 n'atteint pas Celcat — le binaire n'est pas le nôtre — : le
> ruban des jours suffit pour le geste, un build de développement Android règle le reste.
>
> **Second tour le 2026-09-13** : le geste sur les pages est abandonné pour la barre (ci-dessus) ; le
> lieu d'un rendez-vous manquait dans la rangée de l'emploi du temps (fait) ; les ombres sont « beaucoup
> plus proches », captures à venir ; réinitialisation complète : même identifiant sur iPhone, mais le
> bouton **ne fait rien sur l'A8** (marche sur un Android récent) — à diagnostiquer sur les lignes
> `[reinitialisation]` de Metro. Pas de build Android : les rendez-vous du téléphone tiennent lieu
> d'emploi du temps de test.
>
> **Troisième tour le 2026-09-13** : le glissement sur la barre est « parfait » sur les deux appareils,
> les listes horizontales avec ; le lieu paraît dans la rangée ; ombres jugées négligeablement
> différentes (rendu d'OS, opacité Android alignée sur iOS) ; la réinitialisation complète efface
> bien sur l'A8 mais ne recharge pas — elle le dit désormais et demande une relance ; nouveau défaut
> Android corrigé : le visuel par défaut des cartes Campus clignotait sous le doigt
> (`VisuelAvecRepli`, [theme.md](../theme.md#les-décisions-durables)).

> **Un seul jalon, en lots.** La 6.2.0 est sortie le 2026-09-08 ; ce qui reste est petit, et il
> n'y a pas de quoi ouvrir un jalon par sujet. Décidé le 2026-09-11, sur la branche `v6.2.x` ; le
> numéro se décide à la fin, quand on saura ce qui est sorti — la 6.3 reste réservée au mouvement
> de l'interface ([README](README.md#la-v6-part-en-deux-temps--puis-trois)).

## Ce que la production a confirmé

Trois choses qu'on ne pouvait vérifier qu'en production le sont, et la documentation le dit
désormais ([plateforme.md](../plateforme.md), [6.1.x-E](6-1-x-e-notifications-push.md),
[6.1.x-Z](6-1-x-z-sortie.md), [pilotage.md](../pilotage.md), [registre des défauts](../defauts-fonctionnels.md)) :

- **les racines de certification embarquées** rendent toute la moitié universitaire à un Galaxy A8
  de 2018 ;
- **la permission de notification** paraît à la première ouverture après installation **comme après
  mise à jour**, sur les deux plateformes ;
- **le push** arrive en production des deux côtés. Le silence iOS pendant les tests était une
  limitation d'Apple/Expo après trop d'envois rapprochés, pas un défaut.

## Le second appareil est permanent

Le propriétaire du produit a désormais **un iPhone 13 Pro et un Galaxy A8 de 2018** (Android 9,
API 28, petit écran) sur le poste. La règle de 6.1.x-Z — *Android se vérifie en une fois, à la fin*
— est caduque : **chaque lot se vérifie sur les deux appareils avant d'ouvrir le suivant**, et c'est
écrit dans la [définition de terminé](../../CONTRIBUTING.md#définition-de--terminé-) et dans
[qualite.md](../qualite.md#vérification-manuelle). Ce jalon est le premier à la jouer.

## Les lots

| Lot | Ce qui change | Origine |
|---|---|---|
| 0 | la documentation dit ce qui est confirmé et les nouvelles conditions de test | — |
| 1 | **la synchronisation du calendrier applique les filtres d'UE**, et les rappels reprogrammés depuis les Réglages aussi | le formulaire, vérifié |
| 2 | **le lieu d'un rendez-vous du téléphone** est un champ à part, avec « S'y rendre » vers l'application de plans | le propriétaire du produit |
| 3 | **« Réserver » de la BU** devient une action principale, et s'ouvre dans la vue intégrée — le seul lien de l'application qui partait dans le navigateur du système | le formulaire : quelqu'un a demandé une fonction qui existait |
| 4 | **les ombres Android** passent en `boxShadow`, dosées comme iOS, sans `elevation` ; ce qui rend aussi **les boutons d'en-tête** aux vieux Android dans Groupes et le planning d'un groupe | mesuré sur le Galaxy A8 |
| 5 | **le glissement entre onglets** revient, par un geste de `react-native-gesture-handler` posé **sur la barre d'onglets** — la seule surface sans liste horizontale — et non par un pager ni par un geste sur les pages | retiré en 6.1.x-B faute de réponse au conflit de gestes ; la réponse est de ne pas l'avoir |
| 6 | **l'identifiant testeur** est dérivé d'une graine d'appareil que l'application ne crée ni n'efface : il survit à la désinstallation, à « Réinitialiser » et à la réinitialisation complète | les deux testeurs se réenregistraient sans cesse |
| 7 | clôture : CHANGELOG, registre, captures, numéro | — |

Les décisions de conception de chaque lot — et ce qu'elles écartent — sont dans le plan de la
séance du 2026-09-11 et se retrouvent dans la documentation de chaque partie touchée.

## Ce qui se vérifie, sur chaque appareil

À cocher lot par lot ; une case ne se coche qu'après avoir été jouée sur **cet** appareil.

| Lot | Ce qui se joue | iPhone 13 Pro | Galaxy A8 |
|---|---|---|---|
| 1 | filtrer une UE d'un groupe favori à plusieurs UE (`4TRN901S`), forcer une synchro : l'agenda perd ces cours et garde ceux dont une UE reste ; retirer le filtre, ils reviennent ; changer un filtre sans forcer : la ligne d'état porte une tentative `filtres` ; rallumer les rappels : aucun rappel d'UE filtrée | joué le 2026-09-11 | non joué : Celcat inaccessible sous Expo Go (binaire), à jouer sur le build de production |
| 2 | un rendez-vous perso avec lieu : la fiche le montre avec l'icône de lieu et « S'y rendre » ouvre les plans dessus ; sans lieu, pas de bouton ; les notes restent dans la description ; **et** une journée entière tient sur son seul jour | joué le 2026-09-13 | joué le 2026-09-13 |
| 3 | le pied « Réserver » est rempli en primaire, au rythme du pied de l'annonce ; il ouvre Affluences dans la vue intégrée, la connexion et la réservation s'y font, « retour » revient à la fiche ; le pied ne couvre pas la carte en bas du défilement | joué le 2026-09-11 | non joué sur l’A8 (validé sur iPhone ; la vue intégrée est la même que celle du formulaire, jouée sur Android en 6.2.0) |
| 4 | Groupes et planning d'un groupe : retour, étoile et filtre visibles, clair et sombre ; ombres douces partout, aucune surface noire ; défilement fluide de la liste des groupes et d'une semaine chargée ; **iPhone : zéro pixel bougé** sur les écrans de référence | joué le 2026-09-13, captures comparées | joué le 2026-09-13 : en-têtes visibles, ombres proches d’iOS, flash du visuel corrigé |
| 5 | les dix points du protocole du lot (glisser entre les quatre onglets ; ruban des jours et carrousels intacts, y compris en butée ; diagonales ; curseur et interrupteurs des Réglages ; dix allers-retours rapides) | joué le 2026-09-13, sur la barre | joué le 2026-09-13, sur la barre ; listes horizontales intactes |
| 6 | même identifiant après « Réinitialiser », après réinitialisation complète, après désinstallation-réinstallation, après « Effacer les données » (Android) ; jeton push déposé avec `testeur` vrai ; Expo Go donne un autre identifiant (attendu) | joué le 2026-09-13 : même identifiant après réinitialisation complète | joué le 2026-09-13 : même identifiant ; l’appareil ne recharge pas seul, le message le dit |

## Limites écrites

- **Le glissement se fait sur la barre d'onglets, et la page bascule au relâcher.** Deux tours sur
  l'A8 ont défait le geste sur les pages : un coup rapide sur le ruban des jours passait aux onglets,
  puis, la liste rendue active dès le toucher, le défilement se coupait net dès que le doigt la
  quittait et le Campus ne défilait plus qu'entre ses carrousels. Décision du propriétaire du produit
  le 2026-09-13 : le geste sur la barre, la seule surface du bas sans liste horizontale.
- **Un lieu en texte libre n'a de carte que si le géocodeur du système le situe** (demandé par le
  propriétaire du produit au premier tour, contre le plan initial) ; sinon le bouton vers les plans.
  Sur Android, seulement si la permission de localisation a déjà été accordée au Campus.
- **iOS n'offre aucun identifiant d'appareil qui survive à une désinstallation** hors trousseau ; le
  trousseau est ce qu'il y a de plus stable, et l'application ne le réécrit plus jamais.
- **En dessous de l'API 28 (Android 7 et 8), `boxShadow` ne se dessine pas** : pas d'ombre, rien
  d'autre ne change.
