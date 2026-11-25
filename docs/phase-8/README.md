# Phase 8 — La communauté

> **Ouverte le 2026-11-24, le jour de l'envoi de la 6.3.2**, par une mise à plat menée le même jour avec
> le propriétaire du produit. Elle reprend ce qui restait ouvert de la [phase 7](../phase-7/README.md),
> close ce jour-là, et se découpe en lots, comme [la prochaine version](../prochaine-version.md) de la
> 6.3 : un lot à la fois, sa spécification écrite à son ouverture. Publications prévues : **7.0**,
> **7.1**, **7.2**.

La phase 7 a fait de UKit un produit : économe, mesuré, refait, ouvert à de nouveaux campus. Ses
utilisateurs écrivent déjà, par le formulaire ; il leur manque une réponse, et de pouvoir se parler
entre eux. La phase 8 fait vivre l'application par sa communauté, et grandir cette communauté : des
étudiants qui signalent ce qu'ils voient, qui votent, qui se retrouvent entre deux cours, et une
application qui croise ce qu'elle sait déjà pour devancer leurs questions. Sans compte, et sans rien
envoyer de plus que ce que l'étudiant choisit de publier ou de joindre.

## Pourquoi maintenant

- **La 6.3 est sortie** (6.3.1 en ligne au 2026-11-18, 6.3.2 envoyée le 2026-11-24) : l'interface est
  refaite, la mesure tourne ([la ligne de base](../phase-7/7-k-sortie-6-3.md#la-ligne-de-base)), deux
  nouveaux campus sont publiés. Rien de la phase 8 n'attend autre chose qu'elle.
- **La console ne lit pas la mesure.** Elle montre le parc actif, rien de `mesures` : 7-G n'a jamais
  été livré. Et une application où les étudiants publient demande une modération que la console n'a
  pas.
- **Le retour passe encore par Google Forms**, dans une vue intégrée, sans capture d'écran possible
  sans compte Google, et sans réponse qui revienne dans l'application.

## Les décisions

Prises le 2026-11-24. Les seuils, les plafonds et les poids qu'elles citent vivent en configuration,
hors de la documentation publique, qui ne décrit que les mécanismes.

| Sujet | Décision |
|---|---|
| Comptes | **Reportés** ; tout repose sur l'identité de l'appareil. Le raisonnement : [6-J](../phase-6/6-j-compte-et-sources-par-etablissement.md#une-précision-de-vocabulaire-parce-quelle-prête-à-confusion). |
| Réseau social | Chat, photos, profils : **quand l'application comptera de l'ordre de 10 000 utilisateurs**, une base assez large pour qu'il vive. |
| Identité de l'appareil | **App Attest et Play Integrity**, par [`@expo/app-integrity`](https://docs.expo.dev/versions/v57.0.0/sdk/app-integrity/) (alpha, version épinglée), vérifiés par une Edge Function. Plafonds par appareil, et un plafond haut par adresse IP sur la journée. Une écriture non attestée peut s'afficher, en retrait, mais **ne compte jamais comme voix** et ne gagne pas de réputation. |
| Signalements | Sur des lieux en nombre fini : **restaurants, bibliothèques, bâtiments**. Des types proposés par l'application, **aucun texte libre**, en deux familles : ce qui dure et le direct ([type par type](#les-signalements-type-par-type)). Un signalement pour le plaisir par catégorie, d'abord le **plat recommandé** du menu du jour. Un signalement ne remplace jamais l'information officielle en silence : il s'affiche à côté, et la console peut le promouvoir. |
| État d'un lieu | Un état établi tient jusqu'à une voix contraire, qui le fait passer en **incertain** ; la **deuxième** voix contraire, ou une seule d'un appareil fiable, le fait basculer. Entre deux états établis, **le plus récent l'emporte**, pas le plus voté. La confiance baisse avec le temps ; qui ouvre la fiche d'un état vieux d'une heure se voit demander « toujours vrai ? » ; un message officiel publié depuis la console passe devant. Une **réputation sans compte** : un appareil souvent confirmé pèse plus. |
| Attente au RU | Un signalement direct à **trois niveaux**, chacun avec son mot et sa couleur. La question « Ça attend ? » ne vient qu'aux heures du service lues dans la source, à l'ouverture de la fiche du RU, et, si la position est accordée, seulement à proximité, calculée sur l'appareil. |
| Signalements sur les cours | **Écartés.** Trop peu d'utilisateurs par cours pour confirmer, et la même expérience pour toutes les sources. La **détection des changements** (salle, heure, cours disparu entre deux lectures) vaut pour toutes. |
| Sondages | Dans une annonce, publiés depuis la console ; un vote par appareil, les résultats après le vote ; **jamais sur un sujet politique**. |
| Événements | L'annonce d'événement gagne une date, des heures et un lieu. **« Ajouter à mon planning »** ajoute cet événement ; après le premier ajout, l'application propose une fois l'**abonnement** aux événements du campus, aussi réglable dans les Réglages, **désactivé par défaut**. Un événement s'affiche comme un calendrier du téléphone ([6.1.x-D](../phase-6/6-1-x-d-calendriers-du-telephone.md)), jamais comme un cours, et se masque un par un ; la synchronisation vers l'agenda emporte les événements ajoutés un par un, pas l'abonnement. |
| Ligne éditoriale | UKit est un outil, **neutre sur le fond**. Une annonce d'événement dit les faits — quoi, quand, où, qui l'organise —, jamais l'appel ; l'université et toutes les organisations étudiantes y ont le même droit. La règle s'écrit dans le [guide de l'équipe](../guide-console.md). |
| L'intelligence | Des liens entre les flux que l'application lit déjà, **calculés sur le téléphone**, sans service tiers : où manger entre deux cours, le trajet serré (les coordonnées du référentiel, pas d'itinéraire), où travailler pendant un trou, les échéances face aux trous, les changements détectés, une fermeture face aux cours du jour, la journée en une carte. |
| Amis | Le partage d'emploi du temps et les **créneaux communs**, sans compte, par un lien ou un code QR : les codes de groupe pour les sources publiques ; pour un emploi du temps personnel, un instantané des créneaux occupés sans intitulés, valable deux semaines. Les calendriers du téléphone n'y entrent pas, et un lien d'abonnement ne se partage jamais. |
| Formulaire de retour | **Natif**, relié à `retours` ([7-L](../phase-7/7-l-la-boucle.md#un-formulaire-de-retour-natif)) : le contexte joint, montré avant l'envoi et retirable bloc par bloc ; le parcours récent de la session ; les **captures d'écran**, et la capture prise dans l'application qui propose de signaler (iOS, Android 14 et plus) ; la **réponse dans l'application**, sur accord, que l'étudiant ne peut pas manquer ; les **problèmes connus** montrés avant d'envoyer un bug ; la **demande de campus guidée**, qui porte aussi le volontariat ; le brouillon gardé hors ligne et envoyé au retour du réseau. Chaque carte d'erreur de l'application mène au formulaire, son erreur jointe. |
| Boîte à idées | **Publique** : le propriétaire publie les idées retenues, reformulées, et chacun vote. Elle prolonge la case « idée » du formulaire, qui la montre avant l'envoi. Sur une idée publiée comme sur un problème connu, deux gestes : **« moi aussi »**, un vote par appareil, et **« moi aussi, et j'ajoute un détail »**, qui ouvre le formulaire relié à cet élément ; le détail arrive dans la console, rangé dessous, et le propriétaire en reprend ce qui améliore la formulation publique. Pour un bug, chaque « moi aussi » joint son contexte, et dit quels appareils sont touchés ; à la sortie du correctif ou de l'idée, ceux qui l'ont soutenue l'apprennent. Aucun texte libre n'y paraît. |
| Notation | La fiche native du système (`expo-store-review`), sans quitter l'application, après un usage réussi et **jamais après une question d'avis** ; le système en borne l'affichage. La rangée « Noter UKit » des Réglages ouvre directement la page d'avis du store. |
| Conditions d'utilisation | **Aucun écran d'acceptation au lancement.** L'obligation est d'informer : `PRIVACY.md`, les mentions légales, et des **règles de la communauté** publiées sur le site, dès que des étudiants publient des signalements ([ce qu'elles doivent tenir](#ce-que-les-spécifications-devront-tenir)). Elles se rappellent **une fois, d'un toucher**, à la première contribution. |
| Console | **Refaite** dans le style de l'application et du site, avec les statistiques de 7-G, **avant la 7.0** (lot 0). Les pages qui lisent des données de la 7.0 — modération des signalements, des appareils et des sondages, retours enrichis et leurs réponses, événements, boîte à idées — arrivent avec le lot de la 7.0 qui crée ces données, sur `main` avant la sortie de l'application. |
| Supabase | **Le Pro reste.** Le plan gratuit tiendrait la base et le stockage, pas l'egress de l'API avec la croissance visée, et il retire les sauvegardes quotidiennes. |

## Les signalements, type par type

Quatre durées, et aucune à saisir, sauf la date de fin d'un état daté.

| Lieu | Type | Famille | Durée |
|---|---|---|---|
| Restaurant | fermé aujourd'hui ; un service fermé (self, cafétéria) ; menu faux ou absent | dure | du jour : jusqu'au soir, puis « pas d'info » |
| Restaurant | fermé jusqu'au… | dure | daté : jusqu'à sa date |
| Restaurant | horaires faux, avec les bons horaires saisis service par service | dure | correction : jusqu'au changement de la source ou sa validation dans la console |
| Restaurant | attente (fluide, ça attend, très long) ; plus de place assise ; Izly en panne | direct | 20 à 30 min |
| Restaurant | le plat recommandé, choisi dans le menu du jour | pour le plaisir | du jour |
| Bibliothèque | fermée aujourd'hui ; un étage ou une salle fermé | dure | du jour |
| Bibliothèque | fermée jusqu'au… ; horaires faux | dure | daté ; correction |
| Bibliothèque | calme, ou ça papote | pour le plaisir | direct |
| Bâtiment | accès bloqué ; fermé ; chauffage ou Wi-Fi en panne | dure | du jour |
| Bâtiment | fermé jusqu'au… (travaux) | dure | daté |

Le remplissage d'une bibliothèque reste celui d'Affluences quand elle y est : aucun signalement ne le
remplace.

## Ce qui n'est pas dans la phase

| Idée | Quand | Pourquoi pas maintenant |
|---|---|---|
| Comptes, réseau social | vers 10 000 utilisateurs | ci-dessus |
| Signalements sur les cours | non | ci-dessus |
| Profil pour le personnel | avec l'université | deux retours le demandent ; il suppose un dialogue avec l'établissement |
| Carte étudiante dans l'application | non | une application ne peut pas émuler la carte ; un écran « ma carte » ou la carte dématérialisée officielle se rediscutent avec l'université |
| Notes et résultats, compléments du portail de Bordeaux INP, calendrier externe dans le Planning ([7-L](../phase-7/7-l-la-boucle.md#à-trancher-avant-ouverture)) | à rejuger après la 7.2 | aucun ne sert la communauté ; chacun se juge sur du contenu mesuré |
| Victoire ([7-B](../phase-7/7-b-nouveaux-campus.md), lot 3) | au rythme des comptes prêtés | aucun compte prêté |
| Le soutien ([7-N](../phase-7/7-n-le-soutien.md)) | avec l'équipe, à partir de janvier 2027 | hors code |
| La dette : onglets natifs `@expo/ui`, typage de `Theme.ts`, icônes, TypeScript strict, `moment` et les cinq paquets non maintenus, visionneuse maison | quand elle mord | rien ne la rend urgente |

## Les publications

| Publication | Contenu | Condition de sortie |
|---|---|---|
| **Lot 0, sans release** | la console refaite dans le style de UKit ; les statistiques de 7-G ; la lecture des échecs de connexion universitaire et de source contre les sondes ; les vérifications de 7-Z (egress du Pro, sauvegardes actives, sondes) | la console refaite en ligne, et ses pages prêtes à accueillir celles de la 7.0 |
| **7.0** | côté console, avec chaque lot qui crée ses données : la modération, les retours enrichis, les événements, la boîte à idées ; côté application : la base communautaire (appareil attesté, plafonds, états et durées) ; le formulaire natif ; les signalements des restaurants, des bibliothèques et des bâtiments, l'attente au RU et le plat recommandé ; les sondages ; les événements dans le Planning ; la boîte à idées et la notation ; où manger, les changements détectés, la journée en une carte. Dans le même binaire, ce qui attend un build natif ([registre](../defauts-fonctionnels.md)) : la barre de navigation d'Android 9, et les fonctionnalités matérielles que le manifeste exige et que Google Play signale, à déclarer `required="false"` | les documents à jour ([ce que les spécifications devront tenir](#ce-que-les-spécifications-devront-tenir)) ; les règles de la communauté publiées ; le passage sur iPhone, points de 7-J compris |
| **7.1** | les amis (partage d'emploi du temps, créneaux communs) ; le partage d'une annonce avec les liens universels et les pages du site qu'il demande ([7-M](../phase-7/7-m-le-site.md#la-refonte-publiée-le-2026-11-18)) ; les annonces en notification sur consentement | la 7.0 en production |
| **7.2** | le reste de l'intelligence : le trajet serré, où travailler, les échéances face aux trous, une fermeture face aux cours du jour | la 7.1 en production |

**La bascule du formulaire** se fait quand la 7.0 est en ligne sur **les deux** stores, pas avant :
sinon un étudiant sur iPhone lirait « Mets à jour » sans mise à jour à installer. Les trois adresses
que lisent les anciennes versions — `services.formulaire`, `services.formulaire_campus` et
`services.adaptation` ([`formulaireDeRetours.ts`](../../src/shared/navigation/formulaireDeRetours.ts)) —
pointent alors vers une page du site « Mets à jour UKit pour nous écrire », qui garde un lien vers
l'ancien formulaire. L'import de [`tools/retours`](../../tools/retours/) continue jusqu'à la fermeture
du formulaire, quand les versions d'avant la 7.0 passent sous 5 % du parc ; la feuille s'archive
alors hors du dépôt.

## Ce que les spécifications devront tenir

**Sécurité.**
- **Une écriture passe par une Edge Function** qui vérifie l'attestation, puis appelle une fonction
  réservée au `service_role`. Aucune fonction d'écriture de la phase n'est appelable par `anon`, à
  l'inverse de `compter` : ce serait contourner l'attestation.
- **La clé serveur d'un appareil** est la clé attestée par App Attest sur iOS ; sur Android, un secret
  tiré sur l'appareil et lié à chaque attestation Play Integrity, qui ne donne aucun identifiant.
  Jamais l'identifiant d'installation : `PRIVACY.md` promet qu'il reste sur l'appareil, et l'audience
  `testeurs` l'expose. Une réinstallation remet la réputation à zéro.
- **L'adresse IP** ne se compte que par une empreinte salée, gardée vingt-quatre heures, sous un
  plafond haut : un amphi entier sort par la même adresse.
- **Le banc ne joue que le chemin dégradé** : un émulateur échoue à l'intégrité de l'appareil, et un
  build de développement n'est pas reconnu par Google Play. Le chemin attesté se juge sur un build de
  la piste de test interne et sur l'iPhone (App Attest ne marche pas sur le simulateur). Le serveur
  accepte l'environnement de développement d'App Attest comme celui de production. Le quota quotidien
  de Play Integrity se vérifie avant la sortie, contre la croissance visée.

**Vie privée.**
- **Ce qui part du parcours récent** : des noms d'écran, rien d'autre — ni groupe, ni recherche, ni
  intitulé de cours, que [mesure.md](../mesure.md#ce-quon-refuse-de-compter) refuse aussi.
- **L'erreur jointe à un retour** : l'hôte et la famille d'échec, comme `source.echec`, jamais une
  adresse complète, qui peut porter un lien d'abonnement.
- **Les captures** : envoyées par une URL signée, rangées dans un espace privé, lisibles par les seuls
  admins comme l'adresse d'un retour, supprimées après la clôture du retour, à une durée écrite. La
  capture détectée ne donne pas l'image : l'application refait celle de son propre écran, sans
  permission de galerie, et ne propose de signaler qu'une fois par jour au plus, avec « ne plus
  proposer ».
- **La réponse dans l'application** : l'appareil la lit par une clé secrète propre au retour, tirée
  sur l'appareil, jamais par un identifiant public.
- **L'instantané partagé entre amis** voyage dans le fragment du lien (`#`), que les journaux de
  l'hébergeur ne voient pas ; rien n'est stocké côté serveur.
- **Les votes de la boîte à idées** se gardent sur l'appareil, qui compare au statut publié pour
  annoncer la sortie d'une idée : aucun vote ne porte d'identifiant.
- **Les durées de conservation** des signalements, des votes et de la réputation, des données
  pseudonymes liées à un lieu et à une heure, s'écrivent dans `PRIVACY.md`, avec l'empreinte d'adresse
  IP gardée vingt-quatre heures et les demandes d'attestation qu'Apple et Google reçoivent.
- **À la sortie de la 7.0**, les documents qui promettent l'inverse s'amendent ensemble :
  `PRIVACY.md` et les deux fiches de confidentialité des stores ; « Rien de vous ne transite » du
  [README](../../README.md) ; le chemin d'écriture de [backend.md](../backend.md) ; et
  [mesure.md](../mesure.md), dont la promesse « combien, jamais qui » reste celle de la mesure seule.

**Juridique.** Sans avis juridique écrit à ce jour ; à faire relire par un juriste avant la sortie de
la 7.0.
- Les règles de la communauté disent les restrictions et la modération, réputation d'appareil
  comprise (règlement sur les services numériques, art. 14) ; un signalement abusif se signale
  (art. 16), et une restriction se motive quand un contact existe (art. 17).
- L'App Review d'Apple (1.2, contenu généré par les utilisateurs) demande de filtrer, de signaler et
  de bloquer ; ses rejets exigent parfois une acceptation explicite de conditions. Le rappel « d'un
  toucher » à la première contribution en tient lieu si elle est demandée.

## Ce que la phase reprend de la phase 7

| Reste de la phase 7 | Où il va |
|---|---|
| [7-G](../phase-7/7-g-console-statistiques.md) Les statistiques | le lot 0 |
| [7-L](../phase-7/7-l-la-boucle.md) La boucle | le formulaire natif en 7.0 ; les annonces en notification, le partage et les pages du site dans l'application en 7.1 ; la protection contre le flot, tranchée par l'appareil attesté ; ses sujets à trancher, hors de la phase |
| [7-M](../phase-7/7-m-le-site.md) Le site | sa refonte est publiée ; la page de bascule du formulaire et les règles de la communauté en 7.0 ; la page d'une annonce, les liens universels et les pages ouvertes par l'application en 7.1 |
| [7-N](../phase-7/7-n-le-soutien.md) Le soutien | inchangé, avec l'équipe |
| [7-B](../phase-7/7-b-nouveaux-campus.md), lots 2 et 4 : les prêteurs à créditer | hors code, à demander |
| [7-J](../phase-7/7-j-ecrans.md), les points iPhone non jugés | le passage sur iPhone de la 7.0 |
| [7-D](../phase-7/7-d-la-mesure.md), la fiche *App Privacy* non relue | relue avec sa mise à jour, à la 7.0 |
| [7-K](../phase-7/7-k-sortie-6-3.md), le relevé final | **abandonné** : la 6.3 est sortie sur l'audit par parcours, et un relevé fait après coup ne déciderait plus rien |
| [7-Z](../phase-7/7-z-cloture.md) La clôture | remplacée par cette mise à plat ; ses vérifications vont au lot 0 |

## Implémenter un lot

- **Un lot à la fois.** Le lot 0 se fait sur `main`, d'où la console se déploie, comme dans la phase 7
  ; les lots de l'application sur la branche `prochaine-version`, qui porte la 7.0, et `main` avancée
  à chaque sortie.
- **La spécification s'écrit à l'ouverture du lot**, au format des jalons de la phase 7 : la direction,
  ce qui est à faire, les décisions et les pièges, la définition de « terminé », le plan de test, les
  limites écrites. Elle vit dans ce dossier.
- **Le banc Android** juge chaque parcours ([qualite.md](../qualite.md#le-banc-android)) ; l'iPhone,
  avant chaque sortie.
- **Toute écriture nouvelle vers la base** se recette en transaction annulée, comme les rôles de
  [7-H](../phase-7/7-h-console-roles.md).
- **Un défaut rencontré hors du lot** va au [registre](../defauts-fonctionnels.md).

## L'état

| Lot | État |
|---|---|
| 0. La console | **livré le 2026-11-25**, en ligne sur https://kae-lab.github.io/UKit/ ([spécification](0-console.md)) |
| 7.0 | **ouverte le 2026-11-25**, en sept lots, ci-dessous |
| 7.1 | **ouverte le 2026-11-25** sur la branche `v7.1`, créée depuis `prochaine-version` (`066350d5`) : la 7.0 sort telle quelle ; ci-dessous |
| 7.2 | à ouvrir, après la 7.1 |

La 7.0 se découpe en lots, chacun avec sa spécification, sur `prochaine-version` ; une page de la
console qui lit les données d'un lot part sur `main` avec lui.

| Lot de la 7.0 | Contenu | État |
|---|---|---|
| 1. La base communautaire | l'appareil attesté (App Attest, Play Integrity), la fonction `communaute`, les plafonds, la réputation, le modèle d'état d'un lieu, la lecture du jour ; aucun écran | **livré le 2026-11-25** : base en production, fonction déployée, banc joué ; reste le chemin attesté sur téléphone et la configuration de Play Integrity ([spécification](1-base-communautaire.md)) |
| 2. Les signalements | restaurants, bibliothèques, bâtiments, l'attente au RU, le plat recommandé ; la modération dans la console | **livré le 2026-11-25** : base en production, page Signalements en ligne, « Sur place » sur les trois fiches, banc joué ; reste le chemin attesté (lot 1) et la page des règles (lot 7) ([spécification](2-signalements.md)) |
| 3. Le formulaire natif | relié à `retours`, par la même porte attestée | **livré le 2026-11-25** : base en production, fonction déployée, pages Retours et Problèmes connus en ligne, page de bascule publiée sur le site, banc joué ; reste la bascule à la sortie de la 7.0 et le chemin attesté (lot 1) ([spécification](3-formulaire.md)) |
| 4. Sondages, boîte à idées et notation | les votes du lot 1, la fiche native du système | **livré le 2026-11-25** : base en production, fonction redéployée, sondage dans l'éditeur, page Idées et section Communauté en ligne, fiche, boîte à idées et « Noter UKit » joués au banc ; reste la fiche de notation sur la piste de test interne et le chemin attesté (lot 1) ([spécification](4-sondages-idees-notation.md)) |
| 5. Les événements dans le Planning | l'annonce datée, « Ajouter à mon planning », l'abonnement | **livré le 2026-11-25** : base en production, champs de l'événement et aperçu dans la console en ligne, fiche, Planning, retrait, abonnement et synchronisation joués au banc ; reste le passage sur iPhone ([spécification](5-evenements.md)) |
| 6. L'intelligence | où manger, les changements détectés, la journée en une carte | **livré le 2026-11-25** : la carte du jour, midi et les changements dans le Planning, banc joué sauf le week-end ; reste le passage sur iPhone ([spécification](6-intelligence.md)) |
| 7. Le natif, les documents, les règles | la barre de navigation d'Android 9, les fonctionnalités matérielles déclarées pour Google Play ; `PRIVACY.md`, les fiches des stores, le README ; les règles de la communauté publiées | **livré le 2026-11-25** : la barre suit le thème et les deux fonctionnalités sont facultatives (build de développement `f843dc86`, `aapt2` et banc joués, [registre](../defauts-fonctionnels.md)) ; `PRIVACY.md`, README, [backend.md](../backend.md), [mesure.md](../mesure.md) et le [CHANGELOG](../../CHANGELOG.md) à jour ; les règles publiées sur https://ukit-bordeaux.fr/communaute ; reste la saisie des [fiches des stores](fiches-des-stores.md) et la relecture juridique |

**La recette d'ensemble**, jouée le 2026-11-25 sur `b3e460a7`, les sept lots ensemble : **rien ne casse
entre deux lots**. Portes vertes (1 730 tests, console, `expo export` des deux plateformes). Au banc,
build `f843dc86` : `ukit` d'une installation neuve à la Scolarité connectée, Planning (carte du jour,
midi, semaine, événement ajouté, abonnement, fiche et retrait), Campus (Sur place, rappel des règles,
signalement non vérifié, sondage, bibliothèque, bâtiment), retours (formulaire, réponse en tête au
lancement, Mes retours, boîte à idées), hors ligne, les deux thèmes, en français puis par sondage en
anglais et en espagnol ; `ukit-a8` hors WebView, la barre de navigation dans les deux thèmes. Le
démarrage n'a pas bougé : trois lancements à froid sur le même build, le JavaScript de la 6.3.2 puis
celui de la 7.0, premier rendu à 456–496 ms contre 469–488 ms, conteneur racine à 913–982 ms contre
947–989 ms. Un défaut de la 7.0 corrigé (la feuille « Signaler » ouvrait le choix d'un plat hors de la
vue sur l'A8) ; quatre relevés au [registre](../defauts-fonctionnels.md), aucun bloquant : trois antérieurs
ou non reproduits, et une limite du correctif de la barre d'Android 9 sous une fenêtre modale. Le build iOS de développement `2575da3b` est prêt, et l'essai sur iPhone a sa liste :
[essai-iphone-7-0.md](essai-iphone-7-0.md).

**Ce qui reste avant la sortie de la 7.0**, les sept lots livrés :

- **L'essai sur iPhone**, d'une demi-heure : [la liste](essai-iphone-7-0.md).
- **Le chemin attesté**, jamais joué : App Attest sur un iPhone (build de développement `2575da3b`, prêt), Play
  Integrity configuré par Kylian puis joué sur un build de la piste de test interne
  ([lot 1](1-base-communautaire.md#le-protocole-sur-téléphone)), et son quota comparé à la croissance
  visée. D'ici là, aucune contribution Android ne compte.
- **Le passage sur iPhone** de toute la 7.0, points de 7-J compris : les lots 2 à 6 n'y ont jamais
  été vus.
- **Les appareils réels Android** : la barre de navigation sur un Android à trois boutons (le Galaxy
  A8), la fiche de notation sur la piste de test interne.
- **La relecture juridique** de `PRIVACY.md`, des règles et des fiches
  ([ce qu'un juriste doit relire](fiches-des-stores.md#ce-quun-juriste-doit-relire)).
- **Le numéro de version** (`version` d'[`app.config.ts`](../../app.config.ts) dit encore 6.3.2) et la
  section « Non publié » du CHANGELOG datée, au moment de la release.
- **À l'envoi** : `PRIVACY.md` porté sur `main` avant l'examen, les deux fiches saisies, puis, la 7.0
  en ligne sur les deux stores, la [bascule du formulaire](3-formulaire.md).

La 7.1 se découpe en lots sur `v7.1`, chacun avec sa spécification ; les numéros suivent ceux de la 7.0.

| Lot de la 7.1 | Contenu | État |
|---|---|---|
| 8. Les amis | le partage d'emploi du temps par un lien ou un code QR, sans compte ; les créneaux communs ; la page `/ami` du site | **livré le 2026-11-25** : la page `/ami` en ligne, build de développement Android `c7cb8900` (le schéma), banc joué ; reste le passage sur iPhone et le rejeu du lien de lancement sur Android, natif, avec le lot 9 ([spécification](8-amis.md)) |
| 9. Le partage d'une annonce | les liens universels, les pages du site qu'il demande | à ouvrir |
| 10. Les annonces en notification | sur consentement | à ouvrir |
