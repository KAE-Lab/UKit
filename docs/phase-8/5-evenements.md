# Lot 5 — Les événements dans le Planning

> **Ouvert le 2026-11-25**, sur `prochaine-version` pour la 7.0 ; la console sur
> `feat/console-evenements`, fusionnée dans `main`. Une annonce d'événement gagne une date, des heures et
> un lieu ; l'étudiant l'ajoute à son planning d'un toucher, ou suit tous les événements de son campus.
> Le cadre est celui du [plan de la phase](README.md#les-décisions) (« Événements », « Ligne
> éditoriale ») et de [6.1.x-D](../phase-6/6-1-x-d-calendriers-du-telephone.md), dont l'affichage est
> repris tel quel ; cette spécification ne les rouvre pas.

## La direction

Un événement du campus est un rendez-vous de plus dans la journée, pas un cours : il s'affiche **comme
un calendrier du téléphone**, avec la même projection, les mêmes règles de jour et de minuit, et la
couleur de UKit, celle de son calendrier dans l'agenda. La fiche de l'annonce dit les faits sous le
titre, en trois rangées — le jour, les heures, le lieu — puis porte un seul geste, « Ajouter à mon
planning », qui se défait de même. Tout ce que l'étudiant choisit reste sur son téléphone : la base ne
sait ni qui a ajouté un événement, ni qui le suit, ni qui l'a masqué.

## Ce qui est à faire

### 1. Le modèle

- **Trois colonnes de `annonces`**, nullables : `evenement_debut` et `evenement_fin` (`timestamptz`),
  `evenement_lieu` (`text`), gardées par `annonces_evenement_check` — les trois ensemble ou aucune, une
  fin après le début et au plus vingt-quatre heures plus tard (une date et deux heures, une soirée
  pouvant passer minuit), un lieu de 2 à 120 caractères
  ([migration](../../supabase/migrations/20261125080000_evenements.sql)). Additive : toutes les lignes
  existantes ont les trois nulles, et une ancienne version de l'application, qui nomme ses colonnes,
  les ignore.
- **Les droits sont ceux de la table** : qui lit une annonce lit son événement, qui l'écrit l'écrit.
  Aucune écriture nouvelle, aucune ouverte à `anon`.
- **La lecture** : [`shared/annonces/evenement.ts`](../../src/shared/annonces/evenement.ts), partagé avec
  la console, rend `{ debut, fin, lieu }` sur une annonce de type `evenement` seulement — comme le
  partenaire, l'événement survit à un changement de type pour qu'on puisse le retirer — et `null` hors
  de la forme que la base exige.

### 2. La fiche de l'annonce

- Sous le titre et l'accroche, avant le récit : le jour (« Jeudi 3 décembre », dans la grammaire de
  chaque langue), les heures, le lieu, en rangées d'une carte au gabarit du sondage
  ([`EvenementDAnnonce`](../../src/features/Campus/Bde/EvenementDAnnonce.tsx)).
- **« Ajouter à mon planning »**, un bouton tonal ; ajouté, il devient « Retirer de mon planning ». Il
  dit l'ajout un par un, pas la visibilité : un événement que l'abonnement montre déjà s'ajoute encore,
  pour partir dans l'agenda synchronisé. Un événement fini ne s'ajoute plus : le bouton disparaît.
- **La proposition d'abonnement**, une fois, après le premier ajout : un dialogue du système, « Suivre
  les événements du campus ? », « Pas maintenant » ou « Les afficher ». Fermer sans répondre vaut « Pas
  maintenant » ; la proposition ne revient jamais, le réglage reste dans les Réglages.

### 3. Le Planning

- **Un événement s'affiche comme un calendrier du téléphone** : il passe par `TelephoneMapping` avec le
  marqueur `source: 'telephone'`, donc hors des filtres d'UE, des rappels, de l'appui long « ajouter au
  calendrier » et de l'indexation des UE, en vue jour et semaine, et il compte parmi ce qu'un jour a à
  montrer — « Journée libre » ne le cache pas. `annonce` dit d'où il vient, et `point` porte le lieu de
  l'annonce quand elle en publie un.
- **La lecture** se fait au plus toutes les demi-heures, au montage du Planning, au focus et au retour
  au premier plan, et seulement s'il y a quelque chose à suivre — l'abonnement, ou un événement ajouté
  qui n'est pas fini ([`BdeService.fetchEvenements`](../../src/features/Campus/services/BdeService.ts),
  une requête légère, sans récit ni visuel). Le Planning se remêle ensuite sans réseau, comme pour le
  téléphone.
- **Sa fiche** : ni « Ouvrir dans le calendrier » ni géocodage — « Amphi A22 » ne se devine pas — mais
  la carte du point de l'annonce s'il y en a un, « S'y rendre » sinon, et **« Retirer de mon
  planning »**.
- **Le masquage, un par un** : depuis la fiche de l'annonce ou celle du Planning, le même geste retire un
  événement ajouté et cache un événement de l'abonnement. Ajouter un événement masqué le rend visible.

### 4. Ce qui suit la console

Une lecture réussie réconcilie ce que l'appareil garde
([`reconcilier`](../../src/shared/evenements/evenements.ts)) :

- **un événement modifié** — l'heure, le lieu, le titre — reprend ceux de son annonce ;
- **un événement annulé** — l'annonce archivée, désactivée, retirée de ce campus, ou ses trois champs
  vidés — quitte le Planning et, au passage suivant de la synchronisation, l'agenda, s'il est à venir ;
- **un événement fini** dont l'annonce a expiré reste, puis s'oublie un an après sa fin — au
  chargement du magasin aussi, sans attendre une lecture.

Un échec de lecture ne retire rien : un événement ajouté ne disparaît jamais sur la foi d'une base
injoignable.

### 5. L'abonnement et le réglage

- **« Événements du campus »**, un interrupteur dans la page Agenda des Réglages, groupe « Dans le
  planning », **désactivé par défaut**, hors de la permission de l'agenda : le Planning montre les
  événements sans elle.
- L'abonnement montre les événements que l'appareil voit dans le Campus — le même ciblage par
  audience, campus, version et plateforme.

### 6. La synchronisation vers l'agenda

- Les événements **ajoutés un par un** suivent les cours dans le passage de la synchronisation
  ([`avecLesEvenementsDuCampus`](../../src/shared/services/CalendarSyncHelpers.ts)), sous l'identifiant
  `annonce:<id>` dans `previousSyncData` : la purge d'un passage retire ce qui a été masqué ou annulé, et
  le Planning ne les relit pas en double. **Ceux de l'abonnement n'y vont pas.** Le lieu devient le lieu
  de l'événement de l'agenda.
- **L'entretien repasse quand l'agenda change**, origine `evenements` : un ajout, un retrait, une
  annonce déplacée ou annulée — et seulement alors, par une signature de ce que l'agenda doit porter :
  une relecture qui ne change rien ne resynchronise pas. Le disjoncteur la traite en automatique : une
  relecture des annonces la déclenche autant qu'un geste, et elle n'a pas à forcer une source en panne.

### 7. La console

- **Un groupe « Événement »** dans l'éditeur d'annonces, sous le contenu : début, fin, lieu, proposé à
  une annonce de type événement (ou qui en porte déjà un), et refusé avant la base quand il est
  incomplet, à l'envers, trop long ou son lieu hors des bornes — les messages viennent du module
  partagé.
- **L'aperçu** de la fiche montre le bloc et le bouton tels que l'application les rend, et s'y cale
  quand on édite ces champs.
- **La ligne éditoriale** est rappelée dans l'aide du champ « Début ».

### 8. La ligne éditoriale

Écrite dans le [guide de l'équipe](../guide-console.md#ce-qui-ne-se-fait-jamais) : une annonce
d'événement dit les faits — quoi, quand, où, qui l'organise —, jamais l'appel ; l'université et toutes
les organisations étudiantes y ont le même droit ; UKit reste un outil, neutre sur le fond.

## Décisions et pièges

- **Trois colonnes, pas un `jsonb`** comme le sondage : trois valeurs scalaires, que `timestamptz` type
  déjà ; la garde tient en un `check`, et la console les saisit avec ses champs de date ordinaires.
- **La garde porte la forme, pas le type** : exiger `type = 'evenement'` ferait échouer l'enregistrement
  d'une annonce dont on change le type. L'application et l'aperçu ne lisent l'événement que sur ce type.
- **`source: 'telephone'` plutôt qu'une source de plus** : c'est la décision du plan (« comme un
  calendrier du téléphone »), et c'est ce qui garantit, sans toucher aux endroits qui le lisent (rappels,
  carte, fiche, fusion), qu'un événement ne devient jamais un cours — ni rappel, ni filtre, ni appui long. `annonce` le
  distingue là où il le faut : la fiche.
- **L'appareil garde un instantané** de chaque événement suivi, et la dernière lecture des événements
  publiés (`evenements-planning@1`) : le Planning les montre hors ligne, et la lecture des annonces ne
  bloque jamais son chargement.
- **Le Planning lit la base, la fiche non** : sans la lecture du Planning, un événement modifié dans la
  console ne se reflèterait que chez qui rouvre l'annonce. Une demi-heure de fraîcheur, et rien à lire
  sans rien à suivre : un étudiant qui n'ajoute rien ne coûte rien de plus.
- **Le module s'importe à la demande** depuis `AppCore` (synchronisation, réinitialisation) : `AppCore`
  ne tire jamais la base à son import, et le module la tire par `BdeService`. Les écrans et l'entretien
  l'importent directement.
- **La réinitialisation oublie tout** : ajouts, masques, abonnement, proposition, comme une
  réinstallation.
- **Une bascule d'établissement ne purge rien** : la lecture suivante retire d'elle-même les événements
  à venir que le nouveau campus ne voit pas.

## Ce que la relecture et le banc ont corrigé

Une relecture du diff avant la mise en production, et le banc : un bloquant, cinq importants ou visibles
à l'écran, corrigés.

- **Le magasin rejouait l'état du premier chargement** : la promesse de lecture gardait sa valeur, et
  chaque geste repartait d'elle — deux ajouts s'écrasaient, la proposition revenait (bloquant, avant la
  mise en production). Le magasin a désormais ses tests, stockage et base remplacés.
- **L'invitation à choisir un groupe cachait l'événement** d'un étudiant sans groupe ni calendrier coché :
  elle ne paraît plus que si le jour n'a rien à montrer (`aDuContenu`).
- **La vue semaine intitulait le lendemain d'une soirée comme la veille** : le jour se datait par le
  début de son premier élément, celui de la veille pour un événement à cheval sur minuit. Un événement du
  téléphone ou du campus ne date plus son jour — le défaut valait pour le téléphone depuis 6.1.x-D.
- **Le compte de la vue semaine disait « 2 cours »** pour deux événements : il ne compte que les cours,
  et se tait sur un jour qui n'a que des événements.
- **Un événement de l'abonnement ne pouvait pas partir dans l'agenda** : le bouton de la fiche disait
  « Retirer » dès qu'il était visible. Il dit l'ajout.
- Et des mineurs : la synchronisation déclenchée par une relecture passe le disjoncteur en automatique ;
  un ajout vieux d'un an s'oublie au chargement, sans attendre une lecture ; le lieu se compte en
  caractères, comme `char_length` ; l'aperçu de la console retire le bouton d'un événement fini ; le
  guide dit qu'un changement de type annule aussi l'événement.

## Définition de « terminé »

- la migration recettée en transaction annulée sur la production, appliquée, la recette rejouée sans
  elle ;
- la fiche, le Planning (jour et semaine), le masquage, la proposition, le réglage et la
  synchronisation en trois langues, deux thèmes ; `tsc`, ESLint à zéro, `npm test`, la console
  construite ;
- la console en ligne depuis `main` : le groupe « Événement » et son aperçu ;
- le build de développement Android au banc, chaque parcours joué ; les essais effacés de la
  production.

## Plan de test

1. **En SQL, en transaction annulée sur la production** ([`recettes/evenements.sql`](../../supabase/recettes/evenements.sql)) :
   la forme (neuf refus, quatre acceptations, dont une soirée qui passe minuit et vingt-quatre heures
   pile, et une annonce d'information datée) ; `anon` lit l'événement d'une annonce publiée, jamais d'un
   brouillon, et n'écrit rien ; un lecteur ne modifie rien ; un admin date, retire, et se voit refuser
   une fin égale au début ; la modification au journal.
2. **Par `npm test`** : la forme lue et les refus de la console ; l'ajout, le masquage, l'abonnement
   désactivé par défaut, la proposition unique, la réconciliation (modifié, annulé, fini, oublié) ; ce
   qui s'affiche un jour donné, minuit compris ; ce qui part vers l'agenda ; la jonction par jour ; le
   magasin, stockage et base remplacés — deux gestes qui se suivent sans s'effacer, l'état qui survit à
   un redémarrage, un échec de lecture qui ne retire rien, l'agenda prévenu seulement quand il change ;
   l'aperçu de la console.
3. **Sur le banc** (`ukit`, Android 15) : une annonce d'essai en audience `testeurs` ; « Ajouter à mon
   planning », la proposition, le Planning jour et semaine, la fiche et « Retirer de mon planning », le
   réglage ; une modification puis une annulation dans la base, reflétées ; la synchronisation vers un
   calendrier de l'émulateur ; en clair et en français, en sombre et dans une autre langue.
4. **Dans la console locale**, un compte jetable : le groupe « Événement », ses refus, son aperçu.

## Limites écrites

- **Un événement tient en vingt-quatre heures** : une semaine d'intégration se publie en plusieurs
  annonces, ou sans date.
- **La fiche du Planning ne rouvre pas l'annonce** : elle ne garde que l'instantané, pas le récit ni le
  visuel.
- **Un événement modifié ou annulé se reflète à la lecture suivante** — au plus une demi-heure, à
  l'ouverture du Planning —, et dans l'agenda au passage suivant de la synchronisation.
- **La synchronisation suit celle des cours** : sans groupe favori, ou si la source des cours échoue,
  aucun passage n'a lieu, et les événements ajoutés n'arrivent pas dans l'agenda.
- **Une annonce qui expire avant la fin de son événement l'annule** chez ceux qui l'ont ajouté. Le guide
  le dit.
- **Un masque s'oublie quand l'événement quitte la lecture** : republié plus tard, il réapparaît dans
  l'abonnement.
- **Les heures se lisent à l'heure du téléphone** : un étudiant hors de France voit l'heure de son
  fuseau, comme pour les cours.
- **Le texte des annonces est en français**, comme les annonces.
