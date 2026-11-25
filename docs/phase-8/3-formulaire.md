# Lot 3 — Le formulaire de retour natif

> **Ouvert le 2026-11-25**, sur `prochaine-version` pour la 7.0 ; la console sur `feat/console-retours`,
> fusionnée dans `main`. Un écran natif remplace le formulaire Google pour un bug, une idée, une
> demande de campus ; la réponse revient dans l'application. Le cadre est celui du
> [plan de la phase](README.md#les-décisions) et du [lot 1](1-base-communautaire.md), que cette
> spécification ne rouvre pas.

## La direction

Quelqu'un qui écrit veut être lu, et parfois répondu. L'écran est une page de réglage du gabarit de
7-J — des groupes encadrés, des rangées, un seul paragraphe en tête — parce que c'est ce que
l'application sait déjà dire sobrement. Tout ce qui part avec le message se voit avant l'envoi, tel
qu'il partira, et se retire d'un interrupteur. La réponse ne demande ni compte ni adresse : une clé
tirée sur le téléphone suffit à la lire, et l'étudiant ne peut pas la manquer.

## Ce qui est à faire

### 1. L'écran

[`RetourScreen`](../../src/features/Retours/RetourScreen.tsx), la logique dans
[`useFormulaireDeRetour`](../../src/features/Retours/useFormulaireDeRetour.ts) :

- **la nature**, trois choix cochés : un problème (`bug`), une idée (`fonctionnalite`), demander mon
  campus (`campus`) ;
- **les problèmes connus**, avant d'écrire un bug : « Moi aussi » et « Ajouter un détail » (§ 4) ;
- **le texte**, 2 000 caractères ; pour un campus, son nom, ce qui manque, et le volontariat (§ 5) ;
- **trois captures** au plus, choisies dans la galerie par le sélecteur du système, compressées en
  JPEG (1 080 px de large, sous un mégaoctet) ;
- **ce qui part avec**, en blocs : la version, l'appareil et son système, l'établissement, la langue
  et le thème, l'onglet de départ, le réseau, l'erreur de la carte d'où l'on vient, les derniers
  échecs de source (hôte, famille, il y a combien de minutes), les écrans parcourus (des noms de
  route, rien d'autre). Chaque bloc montre sa valeur exacte et se coupe ([`contexte.ts`](../../src/shared/retours/contexte.ts)) ;
- **« Recevoir la réponse ici »**, éteint par défaut : l'accord se donne, il ne se présume pas ;
- un paragraphe en tête dit ce qui part et ce que deviennent les captures ; aucun pied n'explique un
  contrôle (review du 2026-11-06).

Le brouillon (nature, texte, campus, adresse) survit à la fermeture de l'écran ; un détail sur un
problème connu, une capture détectée ou une carte d'erreur ouvrent un autre sujet et ne le touchent pas.

### 2. L'écriture, par la base communautaire

La fonction `communaute` gagne `deposer`, sur le chemin de `contribuer` : le même défi, le même lien
entre la clé annoncée et le texte signé, l'adresse comptée d'abord, la même preuve — assertion App
Attest ou verdict Play Integrity —, puis `public.deposer_retour`, réservée au `service_role`
([migration](../../supabase/migrations/20261125040000_retours_natifs.sql)). L'application signe par le
même envoi que ses contributions ([`envoyerSigne`](../../src/shared/communaute/index.ts)), dans la
même file. La fonction relit le texte signé champ par champ ([`retours.ts`](../../supabase/functions/communaute/retours.ts)),
masque les adresses et les numéros du texte libre comme l'import du formulaire, et rend une URL de
téléversement signée par capture annoncée.

`deposer_retour` retrouve d'abord un dépôt déjà écrit par son identifiant (`depot`, tiré sur
l'appareil) : un dépôt rejoué — la réponse perdue en route, l'application tuée pendant un
téléversement — rend sa ligne sans rien compter, au lieu d'un doublon ou d'une clé de réponse en
double. Puis il borne le non attesté par adresse (le compteur des contributions) et pour tout le
parc, refuse un appareil bloqué et un compteur App Attest rejoué, compte le plafond du jour de
l'appareil, juge les longueurs et la branche du campus, et écrit la ligne de `retours` avec
`source = 'app'`. Trois réglages nouveaux, hors du dépôt : `plafond_retours_appareil`,
`plafond_retours_non_atteste`, `plafond_retours_non_attestes_jour`.

**Un retour ne porte pas la clé de l'appareil.** Relier une clé à une adresse de volontaire relierait
aussi ses signalements à une personne. Le plafond se compte sur un jeton du jour — un HMAC de la clé
par la fonction —, dans `private.retours_par_appareil`, que la tâche horaire vide le lendemain.

### 3. La réponse, et ce qui l'annonce

Avec l'accord, l'appareil tire 32 octets, garde la clé et n'envoie que son empreinte SHA-256
(`retours.cle_reponse`, qu'aucun compte ne lit dans la table ; le journal, lu par les seuls admins,
la copie avec la ligne, et elle n'ouvre rien sans la clé). Un admin répond depuis la console
(`retours_reponses`, refusée à un retour sans accord) et change l'état. L'appareil relit par
`lire_mes_retours(clés)` : l'état, la clôture et les réponses, rien d'autre, ni identifiant ni texte.
La fonction refuse le GET (`request.method`) : une clé ne passe jamais dans une adresse.
`volatile` ne suffisait pas, PostgREST l'appelait en GET dans une transaction en lecture seule —
mesuré après le déploiement, d'où la seconde migration, `20261125050000_lecture_par_cle_en_post.sql`.

La relecture se fait à l'ouverture de « Mes retours », et au plus toutes les six heures par
l'entretien (lancement, premier plan, tâche de fond). Une réponse neuve :

- **en arrière-plan**, une notification locale, si les notifications sont accordées ;
- **à l'ouverture suivante**, en tête, un dialogue avec la réponse et « Voir mes retours »
  ([`RetoursHote`](../../src/features/Retours/RetoursHote.tsx)), que la notification ait été touchée
  ou balayée ;
- **un point plein** sur l'onglet des Réglages et le nombre sur la rangée « Mes retours », tant
  qu'elle n'a pas été vue ;
- **« Mes retours »** ([écran](../../src/features/Retours/MesRetoursScreen.tsx)) : chaque envoi, son
  statut en un mot — en attente du réseau, reçu, en cours, traité, clos, non envoyé, sans suivi — et
  ses réponses, « Nouvelle réponse » à l'accent pour celles qui arrivent.

### 4. Les problèmes connus

`problemes_connus` : un titre, un détail, un statut (`brouillon`, `publie`, `corrige`, `clos`), les
plateformes touchées, la version qui corrige. L'application lit ce qui est publié et corrigé depuis
moins d'un mois, pour sa plateforme, et garde la dernière liste pour le hors-ligne.

- **« Moi aussi »** est un vote du lot 1, sujet `probleme.moi_aussi`, un par appareil : sa valeur dit
  la plateforme, le modèle, le système et la version (`android|Pixel 7|Android 15|7.0.0`), la forme
  que le sujet exige, et aucun identifiant. L'appareil se souvient de ses votes (`problemes-votes@1`).
- **« Ajouter un détail »** rouvre le formulaire rangé sous le problème (`retours.probleme`) ; la
  console le montre dessous. Un problème retiré entre-temps laisse le détail arriver sans lien.

### 5. La demande de campus

Le nom du campus, ce qui manque, puis « Aider à l'adapter » : ce que le volontariat demande, le lien
vers [la page d'engagement](https://ukit-bordeaux.fr/engagement) (`URL.ENGAGEMENT_CAMPUS`), ouverte
dans le navigateur intégré, et l'adresse, obligatoire pour un volontaire et refusée sans lui. Elle va
dans `retours.contact`, que seul un admin lit (`contact_du_retour`).

### 6. Les captures

Un espace privé, `retours`, JPEG seulement, un mégaoctet au plus, lu par un admin seul (une URL signée
de la console) ; personne n'y écrit en direct : l'appareil téléverse par l'URL signée que rend
`deposer`. **Effacées trente jours après la clôture**, et au plus tard un an après l'envoi : la tâche
horaire `retours-purge` appelle, quand il y en a de dues, l'action `purger` de la fonction (pg_net),
qui efface par l'API de stockage — une suppression dans `storage.objects` est refusée et laisserait les
fichiers —, puis `captures_purgees_le`. `clos_le` suit l'état, posé par un déclencheur.

**La capture détectée** (iOS, Android 14 et plus) : le système prévient sans donner l'image, et
l'application refait celle de son propre écran ([`captures.ts`](../../src/shared/retours/captures.ts)).
Une carte au gabarit du bandeau propose « Signaler », au plus une fois par jour, avec « Ne plus
proposer », qui se rouvre dans Réglages, Confidentialité.

### 7. La boîte d'envoi

Un retour entre d'abord dans la boîte (`retours-a-envoyer@1`), ses captures recopiées dans le
répertoire privé, puis part. Sans réseau ou base injoignable, il attend et repart au retour du réseau
(NetInfo) ou au prochain entretien, un dépôt à la fois, sous le même identifiant de dépôt. Un plafond
du jour le garde aussi, jusqu'au lendemain — chaque essai compte à l'adresse —, et le toast dit qu'il
partira plus tard ; tout autre refus est définitif et se dit. Un dépôt rejoué après la clôture ne
redemande pas ses captures. Une capture se téléverse sous son rang (`<id>/<n>.jpg`), qu'une URL manquante ne décale pas,
et se remplace si elle est rejouée.

### 8. Les portes

Réglages (« Nous écrire », « Mes retours ») ; la pastille d'état de chaque onglet ; la demande de campus
de la barre et de la Scolarité ; chaque carte d'erreur qui dit une panne (`SourceFailureNotice`, ton
`danger`), son erreur jointe — la famille, et l'hôte du dernier échec de cette famille dans la session ;
la proposition après une capture. Sans base de publication dans le binaire, les portes retombent sur
le formulaire du catalogue.

## La bascule du formulaire

À la sortie de la 7.0 sur **les deux** stores, pas avant, et sans release :

1. publier la page du site `https://ukit-bordeaux.fr/mets-a-jour` (dépôt `UKit-website`, faite au
   lot 3) : « Mets à jour UKit pour nous écrire », les deux stores, et « Écrire quand même » vers le
   formulaire Google ;
2. pointer les trois adresses que lisent les versions d'avant la 7.0 — `services.formulaire`,
   `services.formulaire_campus` et `services.adaptation` — vers cette page, par la console
   (Établissements) ou `etablissements.sql` ; la 7.0 ne les lit plus que sans base ;
3. garder l'import de [`tools/retours`](../../tools/retours/) et son workflow jusqu'à la fermeture du
   formulaire, quand les versions d'avant la 7.0 passent sous 5 % du parc (Statistiques) ;
4. alors : fermer le formulaire aux réponses, un dernier import, archiver la feuille hors du dépôt
   (le Drive de l'association), retirer `RETOURS_CSV_URL` des secrets. Les lignes importées restent.

## Décisions et pièges

- **Une seule porte d'écriture**, la fonction `communaute`, plutôt qu'une fonction sœur : le défi, la
  preuve, l'admission et la file sont les mêmes ; seuls le texte signé et la porte SQL changent.
- **La lecture par clé en RPC anonyme**, pas par la fonction : elle ne coûte pas d'invocation, ne lit
  qu'une empreinte, et une clé de 256 bits ne se devine pas.
- **L'accord de réponse est éteint par défaut**, et l'adresse e-mail ne vit que dans le volontariat : la
  réponse dans l'application la remplace pour un bug ou une idée.
- **Le statut que l'étudiant voit est `etat`** : `nouveau` se lit « Reçu », `en_attente` « En cours »,
  `traite` « Traité », `refuse` « Clos ». Seules les réponses font une pastille ; un changement d'état
  se lit dans « Mes retours ».
- **Aucune permission de galerie ni d'appareil photo** : `READ_MEDIA_IMAGES`, que le module de capture
  déclare pour Android 13, `CAMERA` et `RECORD_AUDIO` sortent du manifeste ([app.config.ts](../../app.config.ts)) ;
  `READ_EXTERNAL_STORAGE`, déjà déclarée jusqu'à Android 12 par `expo-file-system` et `expo-image`,
  n'est jamais demandée. Sur iOS, PHPicker n'en demande pas : aucune phrase d'usage n'est posée.
- **Les dépendances** (SDK 57, vérifiées le 2026-11-25) : `expo-image-picker` 57.0.22,
  `expo-image-manipulator` 57.0.23, `expo-screen-capture` 57.0.4, `react-native-view-shot` 5.1.0 —
  ce dernier, la page `captureRef` de la documentation d'Expo. Chacune se charge à la demande : un
  build qui ne la porte pas n'a pas la fonction, sans planter.
- **Le parcours note `getCurrentRoute().name`**, jamais ses paramètres : un nom de groupe vit dans les
  paramètres de `Group`, pas dans son nom ([`journalDeSession.ts`](../../src/shared/retours/journalDeSession.ts)).
- **`GroupeDeReglages` remonte dans `shared/ui`** : les pages de retour en sont, et une feature n'en
  importe pas une autre ([architecture.md](../architecture.md)).
- **Les contraintes neuves de `retours` vivent sur leur colonne** (`add column if not exists … check`) :
  la vue lisible se rejoue sans erreur, et l'empreinte de la migration et de la vue est la même.
- **L'URL de la fonction est écrite dans la tâche horaire** : un seul projet, dont la référence est
  déjà publique (supabase/README.md) ; l'action `purger` n'efface que ce que la base désigne, et
  compte l'adresse comme le reste : un appel en boucle bute sur son plafond.
- **Lu, annoncé, notifié se notent par l'instant de la dernière réponse**, pas par un nombre : une
  réponse retirée puis une autre publiée feraient le même compte, et la seconde passerait inaperçue.
- **L'écran refait après une capture s'efface** s'il n'est pas signalé, et les captures du cache avec
  le formulaire qui se ferme : elles peuvent montrer une note ou un message.
- **Le texte se masque, puis se borne de nouveau** : un numéro masqué allonge le texte, qui ne doit
  pas être refusé après avoir été admis.

## Ce que les documents du lot 7 devront dire

`PRIVACY.md`, point 5 bis réécrit : le formulaire dans l'application ; ce qui part (texte, blocs
laissés joints, captures) ; les captures lues par les seuls admins et effacées trente jours après la
clôture ; la clé de réponse tirée sur l'appareil, son empreinte seule en base ; l'adresse du seul
volontaire ; le « moi aussi » et ce qu'il joint ; la notification locale. Les fiches des stores :
*App Privacy* et *Data safety* gagnent les messages et les photos envoyés par l'utilisateur.

## Définition de « terminé »

- la migration recettée en transaction annulée sur la production, appliquée, la recette rejouée, la
  vue lisible à la même empreinte ; la fonction déployée, sondée par l'API publique ;
- l'écran, « Mes retours » et les portes en trois langues, deux thèmes ; `tsc`, ESLint à zéro,
  `npm test`, la console construite, `expo export` des deux plateformes, `deno check` ;
- la page Retours et les problèmes connus en ligne depuis `main`, la recette des droits jouée ;
- la page de bascule du site publiée ;
- le build de développement Android au banc, chaque parcours joué ; les essais effacés de la
  production.

## Plan de test

1. **En SQL, en transaction annulée sur la production** ([`recettes/retours.sql`](../../supabase/recettes/retours.sql)) :
   aucune écriture d'`anon` ni d'un compte ; le dépôt, sa ligne et ses colonnes ; les trois plafonds
   et celui de l'adresse ; l'appareil bloqué, l'App Attest inconnu, le compteur rejoué ; douze contenus
   refusés ; le volontaire et son adresse ; un problème inconnu ou en brouillon sans lien ; la
   publication par un admin, refusée à un lecteur, lue par `anon` sans brouillon ; « moi aussi », unique,
   à la forme exigée ; les colonnes lues par l'équipe sans la clé ni l'adresse ; la réponse, refusée à un
   lecteur et à un retour sans accord ; la lecture par clé, sans identifiant ni texte, refusée en GET ; la
   clôture datée puis retirée ; le dépôt rejoué, avant et après la clôture ; la purge due, marquée une fois ; les jetons d'hier effacés ; la tâche
   planifiée ; l'espace privé, lu par un admin seul.
2. **Par `npm test`** : le texte signé et ses refus, le contexte, le masquage (fonction) ; les blocs, le
   parcours, les échecs, la boîte, la lecture fondue, ce qui reste à lire, « moi aussi », la cadence de
   la proposition (application).
3. **Par l'API publique, après le déploiement** : `deposer_retour` et les tables refusées à la clé
   publiable ; un dépôt non attesté, son URL de capture, le téléversement, la lecture par clé.
4. **Sur le banc** (`ukit`, Android 15) : chaque nature, les problèmes connus, une capture, les blocs
   coupés, l'envoi hors ligne puis au retour du réseau, une réponse semée et son annonce, « Mes
   retours », une carte d'erreur, la capture détectée ; en clair et en sombre, en français et en
   espagnol.
5. **Dans la console locale**, un compte jetable : la liste des deux sources, la fiche native, ses
   captures, répondre, changer l'état ; publier, reformuler, clore un problème, ses « moi aussi » et ses
   détails ; à 1 440 et 390 pixels.

## Limites écrites

- **Le chemin attesté n'est pas joué au banc** (lot 1) : les retours du banc arrivent non attestés.
- **Une réinstallation ou une réinitialisation perd les clés** : les retours d'avant ne se relisent
  plus ; l'équipe peut encore répondre, la réponse ne parvient plus.
- **L'étudiant ne répond pas à une réponse** : il écrit un nouveau retour.
- **Les problèmes connus sont en français**, comme les annonces : la console publie une langue.
- **L'hôte d'une carte d'erreur est deviné** : celui du dernier échec de la même famille dans la
  session, absent s'il n'y en a pas ; la carte ne connaît que la famille.
- **Une capture qui ne se téléverse pas** laisse le retour arrivé sans elle, et le toast le dit ; elle
  ne se rejoue pas.
- **La capture détectée n'existe pas avant Android 14** : il faudrait lire la galerie.
- **Effacer un retour** demande d'effacer ses captures d'abord, par l'API de stockage
  ([supabase/README.md](../../supabase/README.md#effacer-un-retour)).
