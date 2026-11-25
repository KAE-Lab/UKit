# Lot 8 — Les amis (7.1, premier lot)

> **Ouvert le 2026-11-25**, sur la branche `v7.1`, créée depuis `prochaine-version` (`066350d5`, la 7.0
> livrée et pas encore sortie) : la 7.0 sort telle quelle. Le partage de l'emploi du temps et les
> créneaux communs, sans compte, par un lien ou un code QR. Le cadre est celui du
> [plan de la phase](README.md#les-décisions) (« Amis ») et de sa
> [vie privée](README.md#ce-que-les-spécifications-devront-tenir) : l'instantané dans le fragment du lien,
> rien côté serveur, les calendriers du téléphone exclus, jamais de lien d'abonnement partagé. Cette
> spécification ne les rouvre pas. Les créneaux communs prolongent les trous de la journée du
> [lot 6](6-intelligence.md). Les liens universels sont le lot suivant de la 7.1.

## La direction

Deux étudiants veulent savoir quand ils sont libres en même temps. L'un montre un code QR, l'autre le
vise avec l'appareil photo du téléphone ; ou le lien part par la feuille de partage. L'application de
l'ami ouvre le lien, range l'ami, et montre deux choses : son emploi du temps de la semaine, en lecture,
et « Libres ensemble », les créneaux où les deux sont libres, jour par jour, avec, aujourd'hui, le trou
de midi commun et ses restaurants, ceux du lot 6.

Rien ne passe par un serveur. Le lien porte tout ce qu'il faut dans son fragment (`#`), qu'un
navigateur n'envoie jamais : la page du site qui le reçoit ne voit que `/ami`. Ce qui part dépend de la
source, pas d'un choix : un emploi du temps **public** part par ses codes de groupe, que l'ami relit
lui-même ; un emploi du temps **personnel** part en **instantané**, ses créneaux occupés de deux
semaines, sans intitulés.

## Ce qui est à faire

### 1. Ce qui se partage

[`PlanningDesAmis.preparerLePartage`](../../src/features/Amis/services/PlanningDesAmis.ts) :

- **Une source publique, des groupes publics** (Celcat, le référentiel iCalendar d'ADE) : les codes des
  groupes favoris et les filtres d'UE de l'étudiant, pour que l'ami ne voie pas les options qu'il ne
  suit pas. L'ami relit le même emploi du temps public, à jour, intitulés et salles compris.
- **Un emploi du temps personnel** : un lien d'abonnement (IUT, Montaigne, tout campus par collage),
  ou un favori qui est le groupe personnel lu dans le dossier de l'INP
  ([`edtPersonnel.ts`](../../src/shared/etablissements/edtPersonnel.ts)). Il part en **instantané** :
  les créneaux occupés des quatorze jours qui commencent le jour du partage, fondus, arrondis vers
  l'extérieur aux cinq minutes, **sans intitulé, sans salle, sans rien d'autre que des heures**. Un
  seul favori personnel fait partir toute la vue en instantané : un instantané sans intitulé ne
  dévoile rien des autres groupes.
- **Jamais** : le lien d'abonnement, l'identifiant personnel d'ADE, les calendriers du téléphone, les
  événements du campus ajoutés. Il n'existe pas de clé pour eux dans le lien, et la lecture qui nourrit
  l'instantané (`fetchCalendarWeek`) ne lit que la source : la fusion avec le téléphone se fait plus
  loin, dans le Planning. Les journées entières (vacances, fériés de l'export PRONOTE) et les cours
  masqués par un filtre n'occupent pas.
- **Le prénom** que l'étudiant choisit de montrer, facultatif, trente caractères au plus ; il se garde
  sur l'appareil pour le partage suivant.

### 2. Le lien

[`lienAmi.ts`](../../src/features/Amis/services/lienAmi.ts) (pur) écrit et lit
`https://ukit-bordeaux.fr/ami#v=1&e=<établissement>&n=<prénom>&…`, chaque valeur encodée pour URL :

| Clé | Contenu |
|---|---|
| `v` | la version de la forme, 1 ; une version plus récente se dit « mets à jour UKit », pas « lien cassé » |
| `e` | le code de l'établissement |
| `n` | le prénom, facultatif |
| `g`, `f` | les groupes, puis les filtres d'UE, séparés par des virgules |
| `d`, `o` | le premier jour de l'instantané (`AAAAMMJJ`), puis ses créneaux en base64 pour URL |

**La forme compacte de l'instantané**
([`instantane.ts`](../../src/features/Amis/services/instantane.ts)) : trois octets par créneau,
`jour << 18 | début << 9 | durée`, le jour de 0 à 13, le début et la durée en pas de cinq minutes.
**Mesurée** (`lienAmi.test.ts`) : 68 caractères pour deux groupes de l'Université de Bordeaux ; 152 pour
vingt créneaux ; **232 pour deux semaines chargées**, quarante créneaux, soit un code QR de version 11
(61 modules) au niveau de correction M (`codeQr.test.ts`), qu'un appareil photo lit sur un écran de
téléphone.

La lecture refuse sans rien montrer à moitié : une clé répétée, des groupes et un instantané à la fois,
un caractère de contrôle, plus de dix groupes, plus de deux cents créneaux, un jour, un début ou une
durée hors bornes, une date impossible, un fragment de plus de deux mille caractères. L'adresse du site
(avec ou sans `.html`, celle des liens universels à venir) et le schéma de l'application se lisent ;
toute autre adresse est ignorée, celle du build de développement comprise.

### 3. Le transport

- **Le code QR** se génère sur l'appareil ([`CodeQr`](../../src/features/Amis/components/CodeQr.tsx)) :
  [`lean-qr`](https://www.npmjs.com/package/lean-qr) 2.7.4 pour la matrice — 7 Ko, sans dépendance, MIT,
  publié le 2026-09-07 —, et `react-native-svg`, déjà là, pour la dessiner. Noir sur blanc dans les deux
  thèmes, la zone de silence de quatre modules autour.
- **La feuille de partage du système** (`Share` de React Native) et la copie du lien
  (`expo-clipboard`, déjà là).
- **Le schéma de l'application** : `ukit-bordeaux://` ([`app.config.ts`](../../app.config.ts)),
  `ukit-bordeaux-dev://` pour le build de développement, qui ne dispute pas le lien à l'application du
  store sur le même téléphone. Une nouveauté native : le binaire de la 7.1 le déclare.
- **La page `/ami` du site** (dépôt `UKit-website`) : elle lit le fragment **dans le navigateur
  seulement**, pour poser l'adresse du bouton « Ouvrir dans UKit » (`ukit-bordeaux://ami#…`), et propose
  les deux stores. Aucune requête ne part avec le fragment : le site n'a ni mesure d'audience, ni
  script tiers, et un navigateur n'envoie jamais le fragment, ni dans la requête ni dans le `Referer`.
  L'ouverture se fait d'un toucher : ouvrir un schéma sans geste échoue en silence sur Android, et
  Safari affiche une erreur quand l'application n'est pas installée, qui est justement le cas où la
  page sert.
- **La réception** ([`EcouteDesLiensDAmis`](../../src/features/Amis/components/EcouteDesLiensDAmis.tsx)) :
  le lien de lancement, lu une fois par session JavaScript, et tout lien reçu application ouverte, une
  fois l'accueil passé, ouvrent l'écran « Nouvel ami ».

### 4. Ce que l'ami voit

- **La liste** ([`AmisScreen`](../../src/features/Amis/screens/AmisScreen.tsx)), ouverte depuis le
  Planning par le bouton de l'en-tête : « Partager mon emploi du temps », puis un ami par rangée, ses
  groupes ou la fin de son instantané à droite, « Expiré » passé ses deux semaines.
- **Nouvel ami** ([`AjoutAmiScreen`](../../src/features/Amis/screens/AjoutAmiScreen.tsx)) : ce que porte
  le lien, le prénom sous lequel le ranger (celui du lien, modifiable), « Ajouter ». Un ami du même
  prénom, à la casse et aux accents près, est **remplacé** : un nouveau lien de Léa remplace l'ancien.
- **L'ami** ([`AmiScreen`](../../src/features/Amis/screens/AmiScreen.tsx)) : cette semaine ou la
  suivante ; « Libres ensemble », une carte de la surface de la carte du jour, un jour par rangée et ses
  créneaux en chiffres, la fourchette et le couteau sur un créneau de midi ; aujourd'hui, le trou de
  midi commun avec ses restaurants (`Midi` du lot 6, tel quel) ; puis son emploi du temps dans l'agenda
  de la vue semaine, en lecture, sans fiche : un instantané n'y montre que des plages « Occupé », et
  seulement les jours qu'il couvre.

### 5. Les créneaux communs

[`creneauxCommuns.ts`](../../src/features/Amis/services/creneauxCommuns.ts) (pur) :

- **Un créneau commun** est un moment où les deux sont libres pendant la journée de cours de l'un ou de
  l'autre — du premier cours qui commence au dernier qui finit, les deux emplois du temps réunis —, de
  45 minutes ou plus (`TROU_MINIMAL`, le seuil d'un trou du lot 6). **Sans ami, c'est exactement un trou
  de sa propre journée** : un test le vérifie sur quatre journées. Avec un ami, c'est aussi le déjeuner
  après son dernier cours du matin, quand l'autre attend le sien de l'après-midi. Avant le premier
  cours et après le dernier des deux, personne n'est sur le campus : rien ne s'y propose, et un jour où
  aucun n'a cours n'en a aucun.
- **À partir d'aujourd'hui** : un jour passé ne sert à rien ; aujourd'hui ne garde que ce qui reste
  d'un créneau, s'il en reste 45 minutes.
- **Un jour hors de l'instantané** de l'ami est inconnu, pas libre : il ne se calcule pas.
- **Midi** : la part d'un créneau commun entre 11 h 30 et 14 h, de 45 minutes ou plus, celle du lot 6.
  Aujourd'hui seulement, elle reçoit les restaurants du lot 6 (`useOuManger`), autour du bâtiment du
  premier cours qui suit le créneau, le sien d'abord, celui de l'ami à défaut (des groupes publics
  seulement : un instantané n'a pas de salle).
- **Ses heures à soi** sont celles de ses favoris, filtres d'UE appliqués, lues comme la vue semaine du
  Planning, son cache en repli hors ligne ; ni le téléphone ni les événements du campus (limite écrite).

### 6. L'oubli

- **Un ami vit sur ce téléphone seulement** (`AsyncStorage`, clé `ukit.amis`) : son prénom, son
  établissement, ses groupes ou son instantané, la date d'ajout. Les semaines relues par ses groupes ne
  se gardent qu'en mémoire, le temps de l'écran.
- **Le retirer l'efface entièrement**, après confirmation ; rien ne reste ailleurs, puisque rien n'est
  jamais parti. La réinitialisation des Réglages oublie la liste et le prénom gardé.
- **Un instantané expiré se dit** : « Expiré » dans la liste, « Partage expiré » sur sa page, avec la
  date et l'invitation à demander un nouveau lien ; un lien expiré reçu ne s'ajoute pas.

## Décisions et pièges

- **La source décide de la forme, pas l'étudiant.** Un choix « groupes ou instantané » demanderait de
  comprendre ce qu'est un lien d'abonnement ; la règle du plan tient en une ligne de code, et elle ne
  peut pas laisser partir un secret par erreur.
- **Le schéma porte le nom du domaine** (`ukit-bordeaux`), plutôt que « ukit », trop court pour être
  propre à l'application.
- **Le lien se range sous sa propre forme** : la liste garde le fragment de chaque ami et le relit par
  le même lecteur que les liens reçus. Un seul format à valider, et une entrée abîmée s'écarte sans
  emporter les autres.
- **Un ami d'un autre établissement** se relit à la source du sien :
  [`sourcePubliqueDe`](../../src/shared/etablissements/edt.ts) prend l'établissement en paramètre, et ne
  porte jamais le groupe personnel, que seule `sourceEdt()` fusionne. `fetchSemainePublique` partage le
  code de `fetchCalendarWeek`.
- **Le prénom identifie l'ami** sur ce téléphone, pas un identifiant tiré par celui qui partage : un
  identifiant dans le lien relierait deux partages d'une même personne chez tous ceux qui les reçoivent.
- **Les heures sont locales** : un instantané écrit des heures de Paris, et deux téléphones dans un autre
  fuseau liraient un décalage (limite écrite).

## Définition de « terminé »

- les services purs testés : l'encodage et le décodage, l'expiration, la liste, les créneaux communs et
  leur accord avec les trous du lot 6, la taille du lien ; `tsc`, ESLint à zéro, `npm test`, la console
  construite (`src/shared` bouge), `expo export` des deux plateformes (le schéma et `lean-qr`) ;
- les quatre écrans en français, anglais et espagnol, dans les deux thèmes ;
- la page `/ami` publiée et vérifiée en ligne ;
- un build de développement Android avec le schéma, et le banc joué (`ukit`, Android 15) : partager
  depuis un groupe Celcat public et depuis un emploi du temps personnel simulé, ouvrir le lien par le
  schéma, voir l'ami et les créneaux communs ;
- la relecture du diff, application et site ;
- les documents : ce fichier, l'[état](README.md#létat), `PRIVACY.md`, le CHANGELOG,
  [planning.md](../features/planning.md).

## Plan de test

1. **Par `npm test`** : le lien (aller-retour, schéma, adresses étrangères, version, seize formes
   abîmées, ce qu'il ne porte jamais, le prénom, la taille) ; l'instantané (fusion, arrondi, ce qu'il
   écarte, la forme compacte et ses refus, l'expiration, le changement d'heure) ; les créneaux communs
   (entre deux cours, le déjeuner, les bornes, 45 minutes, les cours superposés, l'accord avec les trous
   du lot 6, la semaine à partir d'aujourd'hui, le cours qui suit) ; la liste (relecture, entrée abîmée,
   remplacement par le prénom, borne, retrait, expiration, verdict d'un lien reçu) ; la source publique
   d'un autre établissement, sans le groupe personnel.
2. **Sur le banc** : un groupe Celcat public en favori, partager, ouvrir le lien par
   `adb shell am start` sur le schéma, ajouter, voir l'ami ; un emploi du temps personnel simulé, ouvrir
   un instantané ; les deux thèmes, le français et une autre langue ; un lien abîmé et un lien expiré.
3. **La page du site** : le lien sur le téléphone sans l'application (les stores), puis le bouton qui
   ouvre l'application ; le fragment absent des requêtes.

## Limites écrites

- **Pas de lecteur de code dans l'application** : l'appareil photo du système lit le code et ouvre le
  lien. Sans lui (un vieil Android sans lecture de QR dans l'appareil photo), le lien passe par la
  feuille de partage.
- **Le lien ouvre l'application par la page du site** : un toucher sur « Ouvrir dans UKit ». Les liens
  universels, qui l'ouvriraient directement, sont le lot suivant de la 7.1.
- **Un étudiant qui installe l'application depuis le lien** le retouche après l'accueil : le lien ne
  survit pas à l'installation.
- **Ses heures à soi ne comptent ni le téléphone ni les événements du campus** : un rendez-vous noté
  dans l'agenda ne retire pas un créneau commun. Ils restent sur l'appareil, mais les lire demande la
  permission du calendrier sur cet écran ; à rejuger à l'usage.
- **Les créneaux communs ne paraissent pas dans la carte du jour** du Planning : ce serait relire les
  emplois du temps de tous ses amis à chaque ouverture de l'onglet. Ils vivent sur la page de chaque ami.
- **Un ami par ses groupes ne se lit pas hors ligne** : rien de lui n'est gardé sur disque, pour que le
  retirer efface tout.
- **Un instantané ne bouge pas** : un cours déplacé après le partage ne s'y voit pas ; il faut un
  nouveau lien, au plus tard à son expiration.
- **Les heures sont celles de Paris** : deux téléphones dans un autre fuseau liraient un décalage.
- **Un ami reconnaît l'autre par son prénom** : deux amis du même prénom se remplacent ; il faut les
  ranger sous deux prénoms distincts.
