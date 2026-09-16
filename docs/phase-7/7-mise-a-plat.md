# Phase 7 — Mise à plat, après la sortie de la 6.2.1

> **Statut : décisions prises les 2026-09-14 et 15**, en séance, et découpées en jalons dans le
> [README de la phase](README.md). Le document garde la trace du raisonnement ; l'état des jalons se lit
> dans le README.

## 1. Ce qui est arrivé en deux jours

Le 2026-09-13, la 6.2.1 sort sur GitHub. Le lendemain, deux événements arrivent ensemble.

**L'avertissement *Fair Use* de Supabase.** Le tableau Usage relevé le 2026-09-14 donne 10,041 Go d'egress
en cache pour un quota de 5, soit 201 %, et un délai de grâce jusqu'au 13 octobre. Les causes se mesurent
dans l'heure : les visuels du bucket `media` sont servis en `no-cache`, une photo de restaurant pèse
499 Ko, le visuel « UKit fait peau neuve » est un PNG de 416 Ko, et l'application les affiche par le
`Image` de React Native, sans cache disque. Et la base de production, en plan gratuit, n'a aucune
sauvegarde. Le détail est dans [7-A](7-a-bande-passante.md#ce-qui-a-été-mesuré-le-2026-09-14).

**La panne de Celcat.** Le serveur de l'université tombe le 14 septembre. L'application n'y est pour rien
et ne le martèle pas, mais la lecture du code montre un rythme nominal lourd : une requête d'occupation
par salle à chaque ouverture de la fiche d'un bâtiment, et une relecture du Planning à chaque retour sur
l'onglet ([7-C](7-c-economie-et-socle.md#3-létiquette-envers-celcat)).

Trois faits s'y ajoutent. Une équipe non technique rejoint le projet en janvier 2027, dans le programme
Disrupt Campus. Trois comptes de campus sont prêtés. Et la console, conçue pour une personne, montre ses
limites : « Lecture… » qui reste affiché après une erreur, une page blanche pendant la vérification de
session, aucune pagination ([7-E](7-e-console-socle.md#les-défauts-mesurés)).

## 2. Les questions, et leurs réponses

Les questions ont été tranchées en séance. Elles sont conservées avec leur réponse, parce que c'est la
réponse qui explique la forme des jalons.

| # | Question | Réponse | Jalons |
|---|---|---|---|
| 1 | Passer en Pro, ou mesurer un mois avant de payer ? | **Le Pro maintenant**, à condition qu'il ne ferme aucune perspective de statistiques — il n'en ferme aucune. Le gaspillage se corrige quand même, pour le forfait des étudiants et pour la vitesse. | 7-A, 7-C |
| 2 | Soumettre la 6.2.1 seule aux stores ? | **Non** : elle part dans une 6.2.2 courte, suivie d'une 6.2.3 courte, avant la refonte. | 7-C, 7-D |
| 3 | Mesurer l'usage : un service tiers ou nos compteurs, et quand ? | **Nos compteurs anonymes**, dans la base, sans identifiant, avec un interrupteur ; **dans la 6.2.3**, pour que la refonte ait une ligne de base. | 7-D, 7-G |
| 4 | Verrouiller un thème ? | **Non** : les deux thèmes à égalité, tant qu'aucun chiffre ne le justifie. | 7-I, 7-J |
| 5 | Les cartes d'annonce : carrées, ou en 4:5 ? | **4:5** ; l'image couvre le cadre autour d'un point focal, et « contenir sur fond flou » reste une option par annonce. | 7-C, 7-F, 7-I |
| 6 | La rotation des annonces : locale, ou pilotée ? | **Les paramètres en base**, l'algorithme dans l'application, pur et testé. | 7-C, 7-F, 7-I |
| 7 | Des cartes « bon plan » et partenaire, jusque dans les restaurants ? | **Oui, en données dès la 6.2.2** : un `type` et des `emplacements` ; le rendu en 6.3. | 7-C, 7-I |
| 8 | Trois campus : regroupés sous leur université, ou une ligne chacun ? | **Une ligne par campus**, même quand le portail est partagé ; le regroupement est un libellé. | 7-B |
| 9 | La console : des retouches, ou une refonte ? Et les rôles, quand ? | **Une refonte**, sur des bibliothèques standard, sans release ; **les rôles en données d'abord**, leur interface ensuite. | 7-E à 7-H |
| 10 | Le formulaire : Google Forms, ou un formulaire à nous ? | **Google Forms, pré-rempli**, dès la 6.2.2 ; un formulaire natif relié à la base en 6.4. | 7-C, 7-L |
| 11 | Les dons ? | **HelloAsso, hors de l'application**, par le navigateur du système, avec des paliers libellés en repas CROUS et une jauge par campus. | 7-N |
| 12 | Le site ? | **Refondu après la direction artistique de la 6.3**, dans la langue de l'application. | 7-M |
| 13 | Les touches créatives ? | **Les quatre** : les cartes d'erreur illustrées, un mini-jeu pendant la connexion universitaire, un tirer-pour-rafraîchir signature, des états vides dans la voix éditoriale. | 7-I, 7-J |

## 3. Ce que la lecture du code a corrigé

La conception a été relue contre le code, à la révision `aced97d`. Cinq points du plan en sont sortis
corrigés :

- **les dix-huit requêtes d'occupation partent de la fiche d'un bâtiment**, pas du tableau de bord ;
- **les transformations d'image n'existent qu'en Pro** : l'application doit savoir retomber sur l'adresse
  d'origine ;
- **`expo-image` est un module natif** : il impose des builds neufs, et les correctifs Expo reportés se
  prennent dans le même geste ;
- **un lien `forms.gle` ne se pré-remplit pas** : le catalogue porte l'adresse longue du formulaire, dont la
  structure se lit sur sa page publique ;
- **les en-têtes de cache se mesurent en `GET`** : une requête `HEAD` répond toujours `no-cache`, et elle
  avait fait conclure à tort, le 2026-09-14, que le CDN ignorait la métadonnée des objets.

## 4. L'ordre, puis son assouplissement

**Le 2026-09-14**, le plan proposait trois pistes en parallèle : une publication, la console, un campus.
Refusé : une seule personne vérifie et commite, et deux travaux ouverts laissent deux branches à moitié
vérifiées. **Un seul jalon à la fois.**

**Le 2026-09-15**, l'équipe du programme Disrupt Campus confirme qu'elle ne commence qu'en janvier 2027.
Ce qui la sert — la console au-delà de son socle, les statistiques, les rôles — n'a qu'à être prêt à son
arrivée. Les campus montent : c'est la première demande des utilisateurs, et les comptes prêtés sont
disponibles.

**Le soir même**, les étudiants volontaires viennent seulement d'être recontactés : les campus avanceront
à leur rythme. L'ordre devient une recommandation, les dépendances la seule contrainte, et le travail se
découpe en jalons de phase, sur le système qui a porté la phase 6.

## 5. Le plan

- [7-A](7-a-bande-passante.md) — la bande passante, sans release.
- [7-B](7-b-nouveaux-campus.md) — trois nouveaux campus, un lot chacun après le relevé public.
- [7-C](7-c-economie-et-socle.md) — économie et socle, publié en 6.2.2.
- [7-D](7-d-la-mesure.md) — la mesure, publiée en 6.2.3.
- [7-E](7-e-console-socle.md), [7-F](7-f-console-annonces.md), [7-G](7-g-console-statistiques.md),
  [7-H](7-h-console-roles.md) — la console, sans release, complète avant janvier 2027.
- [7-I](7-i-releve-et-vocabulaire.md), [7-J](7-j-ecrans.md), [7-K](7-k-sortie-6-3.md) — le mouvement,
  publié en 6.3.
- [7-L](7-l-la-boucle.md) — la boucle, publiée en 6.4.
- [7-M](7-m-le-site.md) et [7-N](7-n-le-soutien.md) — le site et le soutien.
- [7-Z](7-z-cloture.md) — la clôture de la phase.
