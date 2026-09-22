# Phase 7 — De l'application au produit

> **Ouverte le 2026-09-14, au lendemain de la 6.2.1.** Décidée par la [mise à plat](7-mise-a-plat.md)
> des 14 et 15 septembre, et découpée en jalons et en lots comme la [phase 6](../phase-6/README.md),
> dont ce README prend la suite et reprend la forme.

La phase 6 a rendu UKit **corrigeable** sans release, puis **montrable**. La phase 7 en fait un
**produit** : une application économe envers sa base comme envers les serveurs des universités, qui
mesure son usage sans suivre personne, qui s'étend à de nouveaux campus, qu'une équipe pilote depuis la
console, qui bouge comme les meilleures applications, et qui ferme la boucle avec ceux qui l'utilisent.

## Pourquoi maintenant

Cinq faits, arrivés en deux jours.

1. **La 6.2.1 est sortie le 2026-09-13 sur GitHub, pas aux stores.** Depuis la rentrée : la 6.0 le 31
   août, la 6.1 le 6 septembre, la 6.2.0 le 8, la 6.2.1 le 13. Elle attend une publication qui la porte.
   *Corrigé le 2026-09-21 : c'était faux. Le workflow de release du 13 au soir a construit et soumis les
   deux stores, et huit jours plus tard 85 % du parc à notifications tournait en 6.2.1 (`jetons_push`,
   2 126 appareils). La 6.2.2 n'a donc pas « porté » la 6.2.1 ; elle a sorti l'économie et le socle.*
2. **Supabase a envoyé un avertissement *Fair Use*.** L'egress en cache avait atteint 10,041 Go pour un
   quota de 5, avec un délai de grâce jusqu'au 13 octobre 2026. Les visuels du bucket `media` étaient
   servis en `no-cache`, à 400 ou 500 Ko l'unité, par un composant sans cache disque, et la base de
   production n'avait **aucune sauvegarde**. Le plan Pro a été souscrit le soir même ; le gaspillage se
   corrige quand même ([7-A](7-a-bande-passante.md)).
   *Corrigé le 2026-09-21 : les visuels n'étaient qu'un dixième de cet egress. Les neuf autres étaient
   la livraison des Blueprints, que le registre téléchargeait en entier à chaque rafraîchissement pour
   la rejeter — [7-A, lot 2](7-a-bande-passante.md#lot-2--la-livraison-des-blueprints-le-2026-09-21).*
3. **Celcat est tombé le 14 septembre**, par le serveur de l'université. L'application ne le martèle pas
   en panne, mais son rythme nominal est lourd : une requête d'occupation par salle à chaque ouverture de
   la fiche d'un bâtiment, dix-huit pour l'A28, et une relecture du Planning à chaque retour sur l'onglet
   ([7-C](7-c-economie-et-socle.md)).
4. **Une équipe non technique arrive en janvier 2027**, dans le cadre du programme Disrupt Campus, pour la
   communication, les partenariats et les subventions. La console devient un outil d'équipe, les
   annonces un support de partenariat, et les statistiques la monnaie de ces partenariats.
5. **Trois comptes de campus vont être prêtés** : IUT de Bordeaux, Victoire, Bordeaux Montaigne. Le
   catalogue les accueille sans release tant que leur emploi du temps est un Celcat ou un export
   iCalendar ([7-B](7-b-nouveaux-campus.md)).

## Les décisions

Prises le 2026-09-14. Leur raisonnement, question par question, est dans la
[mise à plat](7-mise-a-plat.md#2-les-questions-et-leurs-réponses).

| Sujet | Décision |
|---|---|
| Supabase | **Pro maintenant** : sauvegardes quotidiennes, transformations d'image, Smart CDN. Le gaspillage se corrige quand même, pour le forfait des étudiants et pour la vitesse. Mesure avant et après dans le tableau Usage. |
| Stores | Pas de soumission de la 6.2.1 seule : elle part dans une **6.2.2 courte**, puis une **6.2.3 courte** avant la 6.3. Cadence normale : une soumission toutes les deux à quatre semaines. *Amendé le 2026-09-21 : la 6.2.1 était en fait déjà soumise, et la 6.2.3 n'existe plus — après la 6.2.2, tout part dans la 6.3 ([les publications](#les-publications)).* |
| Statistiques | **Compteurs anonymes maison** dans Supabase, sans identifiant d'appareil, interrupteur de retrait. **Client dans la 6.2.3**, avant la refonte, pour avoir une ligne de base. Tableaux dans la console ensuite. *Amendé le 2026-09-21 : client dans la 6.3, en premier sur sa branche ; pas de ligne de base avant la refonte, ses chiffres sont la première.* |
| Thème | **Les deux thèmes à égalité.** Aucun verrou tant qu'aucun chiffre ne le justifie ; chaque écran de la 6.3 se juge dans les deux. |
| Cartes d'annonce | Cadre **4:5**. Par défaut l'image **couvre** le cadre autour d'un **point focal** choisi dans la console ; « contenir sur fond flou » reste une option par annonce. Un seul gabarit, deux largeurs. |
| Rotation | Paramètres en base (épinglage, priorité, créneaux), **algorithme dans l'application**, pur et testé, rotation déterministe par heure ; la console montre « l'ordre vu à telle heure ». |
| Cartes spéciales | `type` (événement, info, bon plan, partenaire) et `emplacements` (annonces, restaurants, bibliothèques, salles) posés en données dès la 6.2.2, rendus en 6.3. |
| Campus | **Une ligne par campus**, même quand le portail est partagé : les Blueprints se référencent par nom, rien n'est dupliqué. Trois colonnes à ajouter : `credits`, `campus`, `alias`. |
| Console | Grosse passe **sans release**, sur un socle standard (TanStack Query et Table, react-hook-form et zod, primitives sans style, Recharts, compression d'image dans le navigateur). **Rôles** : la donnée dès la 6.2.2, l'interface avant l'arrivée de l'équipe. |
| Formulaire | Google Forms reste, **pré-rempli** dès la 6.2.2 ; le catalogue porte l'adresse longue du formulaire, un lien `forms.gle` ne se pré-remplit pas. Formulaire natif relié à la base en 6.4. |
| Dons | **HelloAsso**, paliers libellés en repas CROUS, champ campus pour la jauge, page « Où va l'argent » sur le site, entrée dans l'application par une adresse de service du catalogue. Règle des stores : le don se collecte **hors de l'application**, dans le navigateur du système (Apple 3.2.2 iv ; Google exempte les dons à but non lucratif). |
| Site | Refonte **après la direction artistique de la 6.3** ; pages ouvertes par l'application dans sa vue intégrée. |
| Touche créative | Cartes d'erreur illustrées au gabarit des cartes, mini-jeu pendant la connexion universitaire, tirer-pour-rafraîchir signature, états vides dans la voix éditoriale. |

Le modèle de données que ces décisions entraînent, tout additif et appliqué par migrations numérotées,
est tenu en un seul endroit : [backend.md](../backend.md#ce-qui-est-prévu-et-pas-encore-appliqué).

## Ce qui n'est pas dans la phase

| Idée | Quand | Pourquoi pas maintenant |
|---|---|---|
| Compteur QR pour partenaires commerciaux | après la 6.4 | devient possible avec le chemin d'écriture bornée de la mesure ; attend un partenaire réel |
| Publier un campus « en cours d'adaptation » | campus par campus | écarté tant que la moitié publique n'est pas mesurée |
| Comptes UKit | reporté, raisonnement dans [6-J](../phase-6/6-j-compte-et-sources-par-etablissement.md) | ne pas construire est le choix qui ne se refactore pas |
| Onglets natifs `@expo/ui`, typage de `Theme.ts`, migration `@expo/vector-icons` (41 fichiers), TypeScript strict, remplacement de `moment` et des cinq paquets non maintenus, visionneuse maison | à part, après la 6.3 | de la dette, à solder quand elle mord |
| Préproduction Supabase (branching Pro) | quand [7-H](7-h-console-roles.md) ouvre la console à d'autres | une base, un compte : acceptable tant qu'un seul éditeur publie |
| Relais-cache Celcat | jamais, sauf demande de l'université | un serveur, une adresse unique, contre la promesse « aucun serveur » ; `vars.domaine` reste publiable en repli |
| Rapport de crash tiers | non | des compteurs à nous (`source.echec`) plutôt qu'un SDK ; à rouvrir si un crash silencieux nous échappe |
| Visuels et captures des stores refaits, textes « Quoi de neuf » | [7-K](7-k-sortie-6-3.md), avec l'équipe | c'est de la communication |

## Les publications

| Publication | Contenu | Jalons | Condition de sortie |
|---|---|---|---|
| **6.2.2** | **économie et socle**, sortie le 2026-09-21 : une version courte, rendue économe envers la base et envers Celcat, et le dépôt rendu sûr pour la suite | [7-C](7-c-economie-et-socle.md) | des builds de développement neufs sur les deux appareils, l'egress mesuré avant et après, l'intégration continue verte sur `main` |
| **6.3** | **la mesure, puis le mouvement de l'interface** — la mesure : des compteurs anonymes, sans identifiant, avec un interrupteur, dans cette version depuis le 2026-09-21 ; le mouvement, décidé le 2026-09-04, cadré le 2026-09-06, complété le 2026-09-14 : squelettes, ressorts, transitions, fonds par écran, cartes d'annonce v2, cartes d'erreur au gabarit, mini-jeu de la connexion, tirer-pour-rafraîchir, les deux thèmes à égalité. Visée : **octobre 2026** | [7-D](7-d-la-mesure.md), [7-I](7-i-releve-et-vocabulaire.md), [7-J](7-j-ecrans.md), [7-K](7-k-sortie-6-3.md) | le relevé final contre le relevé initial ; `mesures` se remplit en production, `PRIVACY.md` et les fiches des stores à jour |
| **6.4** | **la boucle** : un formulaire de retour natif, les annonces en notification sur consentement, le partage d'une annonce et les liens universels, les pages du site dans l'application ; et les sujets reportés, à trancher à l'ouverture | [7-L](7-l-la-boucle.md) | la 6.3 sortie ; le contenu existe et permet de vérifier |

> **Amendé le 2026-09-21, à la sortie de la 6.2.2 : la 6.2.3 n'existe plus.** La mesure
> ([7-D](7-d-la-mesure.md)) part dans la 6.3, avec le mouvement. Ce qui l'a décidé : à deux ou trois
> semaines d'écart, une ligne de base prise pendant la rentrée ne se compare pas à des semaines de
> Toussaint, et ses chiffres seraient arrivés quand la refonte est déjà dessinée ; une version courte de
> plus coûtait un cycle de stores pour trois semaines de données. La conséquence est acceptée : **la
> mesure commence avec la 6.3**, sans « avant » ; ses premiers chiffres sont la ligne de base de la 6.4
> et des campus. Ce que la version courte protégeait se garde autrement : les fiches *App Privacy* et
> *Data safety* se remplissent dans les consoles avant la sortie, sans build ; la RPC de la mesure se
> révoque en SQL si le tableau Usage bouge ; [7-G](7-g-console-statistiques.md) s'ouvre deux semaines
> après la 6.3. La 6.3 vise **octobre 2026** : 7-D se joue en premier sur `v6.3`, une **date de gel** se
> pose à l'ouverture de 7-I, et ce qui n'est pas prêt ce jour-là sort du périmètre plutôt que de
> repousser la version. Le numéro 6.2.3 reste libre pour un correctif urgent de la 6.2.2, sans la mesure.

> **Une phase n'est plus une version.** La phase 6 portait la version 6, puis l'a sortie en plusieurs
> publications. La phase 7 commence sur la ligne 6 : ses publications gardent les numéros décidés le
> 2026-09-14, et chacun se confirme à la sortie, comme depuis le renumérotage du 2026-09-08 — un numéro
> décrit ce qui est sorti. La phase décrit le travail, le numéro ce qui part sur les stores.

## Les jalons et leur ordre

Chaque jalon fait l'objet d'une **spécification autonome**, au format de la phase 6 : la direction, ce qui
est à faire, les décisions et les pièges, les dépendances, la définition de « terminé », le plan de test
et les limites écrites. Un jalon dont les parties se livrent à des moments différents — un campus quand
son compte est prêté, un écran quand sa session est close — se découpe en **lots**, cochés chacun dans
[l'état](#létat) ; un jalon qui se livre d'un bloc garde ses parties en sections de sa spécification.

```
   SANS RELEASE — LE PARC INSTALLE EN PROFITE TEL QUEL

                    7-A la bande passante : le media re-encode, un cache d'un an
                        lot 2 : le manifeste reduit au socle sorti, le registre qui juge avant de telecharger
                    7-B lot 1 : le releve public des trois campus, sans compte ni code

   6.2.2 — ECONOMIE ET SOCLE

                    7-C 1 le socle natif : expo-image, builds neufs
                        2 les images : URL de rendu du Pro, repli sur l'origine
                        3 l'etiquette envers Celcat : cache d'occupation, disjoncteur,
                          fraicheur du Planning, User-Agent
                        4 le formulaire pre-rempli
                        5 le socle du depot : CI, Dependabot, migrations numerotees
                        6 les colonnes additives

   LA CONSOLE — SANS RELEASE, COMPLETE AVANT JANVIER 2027

                    7-E le socle ──► 7-F les annonces       (apres les migrations de 7-C)
                                ──► 7-G les statistiques   (deux semaines apres la 6.3)
                    7-E et 7-F  ──► 7-H les roles et l'equipe

   6.3 — LA MESURE ET LE MOUVEMENT

                    7-D compteurs anonymes, interrupteur, jamais de reseau au demarrage   (en premier sur la branche)
                    7-I releve, vocabulaire, ecran fondateur : le tableau de bord Campus
                    7-J les ecrans, un lot par ecran : 1 Planning  2 Scolarite  3 Reglages
                    7-K sortie : releve final contre releve initial, les premiers chiffres poses

   LES CAMPUS, QUAND L'APPLICATION SAIT LES ACCUEILLIR (apres la 6.3)

                    7-B lots 2 IUT de Bordeaux   3 Victoire   4 Bordeaux Montaigne
                        au rythme des comptes pretes

   6.4 — LA BOUCLE

                    7-L formulaire natif, annonces en notification, partage, pages du site

   AUTOUR DE L'APPLICATION

                    7-M le site (apres 7-I)    7-N le soutien (hors code, avec l'equipe)

   CLOTURE

                    7-Z la verification de la phase
```

| Jalon | Spécification | Publication | Dépend de | Résumé |
|---|---|---|---|---|
| 7-A | [7-a-bande-passante.md](7-a-bande-passante.md) | aucune | — | Re-encoder le média, le re-téléverser avec un cache d'un an, mesurer l'egress avant et après. Le parc installé en profite sans mise à jour. Lot 2 : le manifeste des Blueprints réduit au socle sorti, et le registre qui juge avant de télécharger. |
| 7-B | [7-b-nouveaux-campus.md](7-b-nouveaux-campus.md) | aucune ; la publication suivante embarque chaque campus | lot 1 : aucune ; lots 2 à 4 : la 6.3 en production ([7-K](7-k-sortie-6-3.md)) et un compte prêté | Le relevé public des trois campus, puis l'IUT de Bordeaux, Victoire et Bordeaux Montaigne, un lot chacun, sur le protocole d'[adaptation-campus.md](../adaptation-campus.md). Les lots qui publient attendent que l'application sache accueillir un campus (décision du 2026-09-16). |
| 7-C | [7-c-economie-et-socle.md](7-c-economie-et-socle.md) | 6.2.2 | 7-A | `expo-image` et les URL de rendu avec repli, le cache d'occupation, le disjoncteur, la fraîcheur du Planning, le `User-Agent` de Celcat, le formulaire pré-rempli ; l'intégration continue, Dependabot, les migrations numérotées et les colonnes additives. |
| 7-D | [7-d-la-mesure.md](7-d-la-mesure.md) | 6.3, en premier sur sa branche | 7-C | Des compteurs anonymes, une file locale, une RPC bornée, un interrupteur, jamais de réseau au démarrage ; `PRIVACY.md` et les fiches des stores. |
| 7-E | [7-e-console-socle.md](7-e-console-socle.md) | aucune | — ; mieux après 7-A | Le socle standard de la console et sa règle, les défauts mesurés, des listes filtrées et paginées, la page Retours, le tableau de bord, le téléversement compressé. |
| 7-F | [7-f-console-annonces.md](7-f-console-annonces.md) | aucune | 7-E ; les migrations de 7-C | L'éditeur d'annonces v2 avec l'aperçu du téléphone, le point focal, les types, le statut, la programmation et l'ordre vu à une heure donnée. |
| 7-G | [7-g-console-statistiques.md](7-g-console-statistiques.md) | aucune | 7-E ; 7-D en production depuis deux semaines | Les tableaux de la mesure, l'entonnoir d'une annonce, le rapport partenaire. |
| 7-H | [7-h-console-roles.md](7-h-console-roles.md) | aucune | 7-E, 7-F ; les colonnes de 7-C | Qui peut quoi, par campus ; l'invitation sans script ; le verrou contre l'écrasement. Prêt avant janvier 2027. |
| 7-I | [7-i-releve-et-vocabulaire.md](7-i-releve-et-vocabulaire.md) | 6.3 | 7-C, 7-D, 7-F | Le relevé de ce qui saute, le vocabulaire du mouvement, et l'écran fondateur : le tableau de bord Campus. |
| 7-J | [7-j-ecrans.md](7-j-ecrans.md) | 6.3 | 7-I | Le Planning, la Scolarité, les Réglages : un lot par écran, mené en session. |
| 7-K | [7-k-sortie-6-3.md](7-k-sortie-6-3.md) | 6.3 | 7-I, 7-J | Le relevé final contre le relevé initial, les captures dans les deux thèmes, les premiers chiffres de la mesure posés en ligne de base. |
| 7-L | [7-l-la-boucle.md](7-l-la-boucle.md) | 6.4 | 7-K ; 7-M ; 7-F et 7-H | Le formulaire natif, les annonces en notification, le partage, les pages du site dans l'application. |
| 7-M | [7-m-le-site.md](7-m-le-site.md) | aucune ; dépôt `UKit-website` | 7-I | Le site refondu sur les tokens de l'application, sa confidentialité générée, ses pages et ses liens universels. |
| 7-N | [7-n-le-soutien.md](7-n-le-soutien.md) | aucune ; hors code | 7-M ; l'équipe | HelloAsso, la page « Où va l'argent », la jauge par campus. |
| 7-Z | [7-z-cloture.md](7-z-cloture.md) | — | tout | La vérification de la phase, et la mise à plat de la suivante. |

**Ordre :** un seul jalon ouvert à la fois, et un jalon s'ouvre dès que ses dépendances sont livrées.
L'ordre recommandé est celui des lettres, à une exception, décidée le 2026-09-16 : **les lots 2 à 4 de
7-B, ceux qui publient un campus, passent après la sortie de la 6.3** ([7-K](7-k-sortie-6-3.md)). Un
campus publié avant elle arriverait dans une liste plate, sans regroupement ni alias, et sur des sources
que [7-C](7-c-economie-et-socle.md) n'a pas encore ménagées : l'application doit d'abord savoir
l'accueillir. Le **lot 1**, le relevé public, ne demande ni compte ni code et s'ouvre quand on veut ; si
son verdict montre qu'un campus demande du code, ce code entre dans la publication qui suit le relevé.
Les lots de campus avancent ensuite au rythme des comptes prêtés.

### L'état

| Jalon ou lot | État |
|---|---|
| 7-A La bande passante | **lot 1 livré le 2026-09-16** — 1 268 892 o de visuels devenus 299 000 (−76 %), tout le bucket en cache d'un an ; **lot 2 livré le 2026-09-21** — l'egress était à 90 % la livraison des Blueprints : manifeste réduit au socle sorti, publié, et le registre corrigé en `@aetherius/react-native` 0.5.10 ; relevés des journaux le 2026-09-23 et le 2026-09-30 |
| 7-B, lot 1 : le relevé public des trois campus | **livré le 2026-09-16** — trois fiches, trois verdicts, trois codes confirmés, la règle de nommage tranchée. **Aucun des trois n'est un Celcat**, mais l'IUT et Montaigne tournent sous **PRONOTE Campus**, dont l'**adresse d'abonnement iCalendar** rend leur emploi du temps publiable **sans une ligne de code** — collée dans l'application, elle **affiche les cours sur l'appareil**, vérifié pour Montaigne |
| 7-B, lot 2 : IUT de Bordeaux | à ouvrir, après la 6.3 |
| 7-B, lot 3 : Victoire | à ouvrir, après la 6.3 |
| 7-B, lot 4 : Bordeaux Montaigne | à ouvrir, après la 6.3 |
| 7-C Économie et socle | **livré le 2026-09-17** — code, base et publication sur la branche `v6.2.2` : `expo-image` et les rendus, le cache d'occupation, le disjoncteur, la fraîcheur du Planning, le `User-Agent`, le formulaire pré-rempli, la CI, Dependabot, les migrations et les colonnes ; la sonde a mesuré la requête groupée viable pour la 6.3. Protocole joué sur les deux appareils le 2026-09-21 ; **sortie en 6.2.2 le 2026-09-21** ; reste l'egress avant/après, relevés du 23 et du 30 septembre |
| 7-D La mesure | à ouvrir |
| 7-E Le socle de la console | **livré le 2026-09-22** — sur `main`, sans release : TanStack Query et Table v9, react-hook-form et zod, Base UI, lucide, blurhash ; les quatorze défauts corrigés ; des listes triées, filtrées, cherchées et paginées dont l'URL porte l'état, un filtre global par campus ; la page Retours avec ses compteurs, le tableau de bord d'accueil, le téléversement à nom unique ; 74 tests ; captures dans les deux thèmes ; **reste** le protocole « plateformes » sur les deux appareils |
| 7-F Les annonces dans la console | à ouvrir |
| 7-G Les statistiques | à ouvrir |
| 7-H Les rôles et l'équipe | à ouvrir |
| 7-I Le relevé et le vocabulaire du mouvement | à ouvrir |
| 7-J, lot 1 : le Planning | à ouvrir |
| 7-J, lot 2 : la Scolarité | à ouvrir |
| 7-J, lot 3 : les Réglages | à ouvrir |
| 7-K Sortie de la 6.3 | à ouvrir |
| 7-L La boucle | à ouvrir |
| 7-M Le site | à ouvrir |
| 7-N Le soutien | à ouvrir |
| 7-Z Clôture de la phase | à ouvrir |

Un jalon ouvert porte « ouvert le AAAA-MM-JJ », un jalon livré « livré le AAAA-MM-JJ », et sa
spécification porte alors la bannière de livraison.

## Implémenter un jalon

Un jalon se traite en suivant sa **spécification** et la
[« Définition de terminé »](../../CONTRIBUTING.md#définition-de--terminé-) du `CONTRIBUTING.md`, comme en
[phase 6](../phase-6/README.md#implémenter-un-jalon). Ce que la phase 7 y ajoute :

- **Un seul jalon, ou un seul lot, ouvert à la fois.** Une seule personne vérifie sur les deux appareils et
  commite ; deux jalons ouverts se disputeraient ce temps, et laisseraient deux branches à moitié
  vérifiées. L'ouverture et la livraison s'écrivent dans [l'état](#létat).
- **Les dépendances sont la seule contrainte d'ordre.** L'ordre des lettres est une recommandation.
- **Les deux appareils sont permanents** : tout ce qui touche l'application se vérifie sur l'iPhone 13 Pro
  et sur le Galaxy A8.
- **Un jalon se termine par l'amendement de sa spécification** : la bannière de livraison, les endroits où
  la réalité a corrigé le texte, et la ligne de l'état. Se vérifie par `git diff --stat docs/phase-7/`
  avant de commiter.
- **Les identifiants prêtés vivent dans le `.env` gitignoré**, sous `PORTAIL_<CODE>_USER` et
  `PORTAIL_<CODE>_PASS`, et nulle part ailleurs.
- **Une publication embarque les campus publiés avant elle**, comme
  l'[étape 9](../adaptation-campus.md#9-à-la-release-suivante) le demande.
- **Les portes** : l'intégration continue sur chaque branche dès 7-C, `tsc`, ESLint à zéro, les tests,
  `expo export` sur les deux plateformes ; et l'egress relu dans le tableau Usage de Supabase après chaque
  publication.
- **Ce qui se juge se tranche en session.** Les lots d'écran de 7-J se mènent comme les sessions du volet 2
  de la phase 6 ([ce qui n'est pas un jalon](../phase-6/README.md#ce-qui-nest-pas-un-jalon-et-pourquoi)) :
  un lot se coche quand sa session est close.

## Les branches

Les jalons d'une publication se jouent **sur une branche par version** — `v6.2.2`, `v6.3`, `v6.4` —,
créée depuis `main` à jour, et `main` est avancé en avance rapide à la sortie. Ce qui n'a pas de
code d'application **se fait sur `main`** : 7-A, 7-B et la console, de 7-E à 7-H. La console se déploie
depuis `main`, et un campus est une publication de données. Le site vit dans son propre dépôt,
`UKit-website`.

La branche `v6.3`, qui ne portait que les documents de cette phase, a été renommée puis fusionnée dans
`main` le 2026-09-15 : elle se recrée depuis `main` à l'ouverture de 7-I.

## La clôture

[7-Z](7-z-cloture.md) vérifie la phase entière, et ce qui reste ouvre la mise à plat de la suivante.
