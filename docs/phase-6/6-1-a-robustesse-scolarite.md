# 6.1-A — Robustesse de la scolarité

> **Jalon livré le 2026-09-02** — code, tests et documentation ; la vérification sur appareil suit le
> plan de test ci-dessous. Les écarts entre ce texte et ce qui a été livré sont dans
> [Écarts constatés](#écarts-constatés), en bas : le texte au-dessus reste tel qu'il a été écrit.
>
> **Le jalon qui répare ce qui a cassé en production.** Tout ce qui suit a été vu sur un appareil
> réel entre la soirée de release et le 2026-09-02 ; rien n'est théorique. Les références S1…S10
> renvoient à la [mise à plat](6-1-mise-a-plat.md).

## La direction

La partie scolarité est le cœur fragile de l'application, et la fragilité n'est pas là où on la
cherchait. Les Blueprints ont tenu ; c'est **l'écran** qui a amplifié une panne de widget en page
cassée, un message faux, une bascule de vue en plein chargement, et une liste d'établissements
incomplète le premier jour. Ce jalon rend l'écran **indifférent à la panne** : une source qui tombe
change deux mots dans une tuile, jamais la forme de la page.

## Ce qui est livré

### La tuile porte son échec (S1, S14)

La grille ne bascule plus jamais en rangées. `EtatRangee` gagne une nature `echec`, et
`WidgetTile` la rend **à la même taille** : l'icône du service, deux mots, rien d'autre.

| Famille d'échec | Les deux mots | Au toucher |
|---|---|---|
| refus d'identifiants (`LOGIN_FAILED`) | « À ressaisir » | la fiche du compte en mode ressaisie |
| service absent (`*_INDISPONIBLE`, `unavailable`) | « Indisponible » | une feuille : le message complet, **« Relancer »** ce seul widget |
| tout le reste (`rejected`, `data`, `engine`) | « Erreur » | une feuille : le message complet, « Réessayer » si la famille le permet |

La feuille est celle qui existe déjà pour les rangées mystérieuses (`ModaleBientot`), généralisée
en `FeuilleDeWidget`. **Relancer un seul widget** est nouveau : `runner.ts` expose la lecture d'un
point isolé, avec la même réservation du navigateur que le rafraîchissement global.

La bascule paire-en-rangées et son commentaire disparaissent de `GrilleScolarite`. La règle
inverse s'écrit à leur place : *une tuile ne change pas de taille, quoi qu'il arrive à sa source*.

### Un code inconnu n'est plus une « connexion interrompue » (S2)

`ScolariteMapping` applique une **règle** avant sa table : un code de Blueprint qui se termine par
`_INDISPONIBLE` se présente comme un service absent, réessayable. `MOODLE_INDISPONIBLE` y entre
sans ligne dédiée, et le prochain widget aussi. Le repli de la famille `blocked` ne sert plus qu'aux
codes qui ne disent rien de leur nature. Test unitaire : un code inventé en `_INDISPONIBLE` rend le
titre et le message de service absent, et `retryable: true`.

### Une seule vue du chargement (S3)

`ScolariteDashboard` ne bascule plus vers l'écran de chargement plein quand `credentials` arrive au
dixième pas d'une session **lancée depuis le formulaire**. Le formulaire signale son départ
(`onDebut` existe déjà) ; l'onglet tient la branche formulaire jusqu'à la fin de la session, avec
la même garde de fin que l'accueil. L'écran plein reste réservé aux parcours lancés sans
formulaire — au lancement, ou sur « Actualiser mon dossier ».

### Le premier jour montre tous les établissements (S4)

Trois gestes, parce que la cause avait trois étages :

1. **Le socle embarque tout ce qui est publié à la date de la release.** `catalogue.ts` porte
   Bordeaux INP et « Autre campus » en plus de Bordeaux, copiés des lignes publiées. La règle
   « le binaire n'embarque un établissement que s'il embarque de quoi le jouer » est satisfaite :
   les Blueprints INP sont dans `blueprints/` depuis 6-G. Un test compare le socle aux lignes de
   `supabase/etablissements.sql` pour qu'ils ne divergent plus en silence.
2. **L'accueil se réabonne à l'arrivée du catalogue.** `refreshEtablissements` notifie
   (`SettingsManager.emit('catalogue')`) quand la surcouche change ; `useWelcomeState` recalcule
   sa liste sur cet événement, et le commentaire qui prétendait qu'il le faisait déjà est remplacé
   par le code qui le fait.
3. **L'étape établissement sait attendre.** À la première ouverture, elle affiche un chargement
   parlant tant que le premier rafraîchissement n'a pas répondu, avec un plafond de quatre
   secondes — après quoi la liste connue s'affiche, et se complète si le réseau revient. Une
   installation hors ligne voit le socle, qui est désormais complet.

### « Tu es d'un autre campus ? » (S5)

Sous le formulaire de connexion, dans l'onglet comme à l'accueil, une ligne discrète ouvre le choix
d'établissement. `SettingsInstitutionPopup` remonte dans `shared/ui/ChoixEtablissement` puisqu'il
gagne un second hôte, et la bascule elle-même (`changerEtablissement` puis `setEtablissement`,
aujourd'hui dans `SettingsScreen.setInstitution`) devient un service partagé — les Réglages
l'appellent aussi. À l'accueil, le lien ramène à l'étape établissement.

### Le PDF dans l'application, sur Android (S10)

`DocumentViewerScreen` rend les PDF **sur les deux plateformes** : iOS garde son rendu natif ;
Android charge **pdf.js** embarqué (bibliothèque et worker dans `assets/pdfjs/`, servis à la
WebView en local) qui dessine chaque page dans un canevas — défilement vertical, pincement pour
zoomer. Le document ne quitte pas l'appareil. Si un fichier dépasse ce que la WebView accepte, le
repli est l'écran actuel avec la feuille de partage, et il le dit.

### Face ID est confirmé (S9)

L'entrée « à confirmer sur un build » de [`defauts-fonctionnels.md`](../defauts-fonctionnels.md)
est cochée avec la date du 2026-09-02 ; la capture `scolarite-biometrie.png`, différée depuis 6-K,
est prise.

## Décisions et pièges

- **Deux mots, pas une phrase.** La tuile a 140 pt ; c'est la contrainte qui avait justifié la
  bascule en rangées. La feuille au toucher porte la phrase — la tuile n'a qu'à dire qu'il y a
  quelque chose à lire.
- **Relancer un widget ne relance pas la session.** Un refus d'identifiants ne se relance pas ; la
  tuile mène à la ressaisie. Seules les familles réessayables ont le bouton.
- **Le socle est une copie, pas une référence.** Publier une ligne continue de remplacer le socle
  entièrement (règle de 6-G, piège du logo). Le test de divergence est là pour qu'on y pense à
  chaque release, pas pour le remplacer.
- **pdf.js est un essai assumé.** Si le rendu d'un vrai certificat déçoit — police, lenteur,
  mémoire — le repli reste, et la décision s'écrit dans les limites.

## Dépendances

- Aucune release du moteur. Le cas `engine` sans bouton (S8) reste chez Aetherius.
- pdf.js en dépendance de production (fichiers statiques, pas de module natif : Expo Go reste
  utilisable).

## Plan de test sur appareil

| # | Geste | Attendu |
|---|---|---|
| 1 | Publier un Blueprint de widget volontairement cassé, ouvrir l'onglet | la tuile dit « Erreur » à sa taille ; la messagerie reste une tuile |
| 2 | Toucher la tuile | la feuille montre le message ; « Réessayer » relit ce widget seul |
| 3 | Republier le Blueprint corrigé, relancer depuis la feuille | la tuile se remplit sans rechargement de l'onglet |
| 4 | Se connecter depuis l'onglet avec un compte réel | une seule vue de chargement, du premier au dernier pas |
| 5 | Installation neuve, réseau normal | l'étape établissement propose les trois choix |
| 6 | Installation neuve, mode avion | l'étape propose les trois choix depuis le socle |
| 7 | Compte Bordeaux actif, toucher « Tu es d'un autre campus ? », choisir l'INP | même bascule que depuis les Réglages ; retour à Bordeaux retrouve la session |
| 8 | Android, ouvrir un certificat PDF | rendu dans l'application, zoom, partage toujours possible |

## Limites écrites

- **Le socle se périme à chaque publication d'établissement** : un campus ajouté après la release
  n'est dans le socle qu'à la suivante. Entre les deux, il arrive par le rafraîchissement — que
  l'accueil sait maintenant attendre.
- **La feuille d'échec ne diagnostique pas.** Elle montre le message du moteur ; un `engine` reste
  « un problème de notre côté » sans bouton.
- **pdf.js n'annote pas, ne signe pas, ne remplit pas de formulaire.** C'est une visionneuse.

## Écarts constatés

Ce que la carte du code a corrigé dans le texte ci-dessus, et les décisions prises en chemin.

- **Les Blueprints INP n'étaient pas embarqués.** « Ils sont dans `blueprints/` depuis 6-G »
  confondait le dossier et le binaire : les cinq fichiers de `blueprints/portails/` n'existaient que
  par le manifeste. Ils sont désormais importés par `blueprints/index.ts`, **sans quitter leur
  dossier** — qui change de sens (« rangés par établissement ; embarqué ou non se lit dans
  `index.ts` ») — et un test de `socle.test.ts` exige que tout Blueprint nommé par le socle soit dans
  `BUNDLED`. Le script de publication lit `index.ts` pour annoncer « embarqué » ou « hors socle ».
- **`ville`** : le socle disait « Talence », la ligne publiée « Bordeaux ». Talence des deux côtés —
  la commune du campus, comme le socle le raisonnait — et `supabase/etablissements.sql` corrigé. **À
  rejouer en base par `psql`** : sans cette publication, le parc voit encore « Bordeaux », la ligne
  publiée remplaçant le socle.
- **`SettingsManager.emit('catalogue')` n'existe pas** — l'API est `on` / `unsubscribe` / `notify`, et
  `notify` écrit les réglages à chaque appel. Le canal « le catalogue a changé » existait déjà
  (`AppContext.catalogue`) ; ce qui manquait est un signal « le premier rafraîchissement a répondu »,
  parce qu'un rafraîchissement qui aboutit sans changement ne bouscule rien
  (`shared/etablissements/premierRafraichissement.ts`).
- **Le socle est sorti de `catalogue.ts`** (`socle.ts`) : trois établissements y auraient porté le
  fichier au-delà de la limite de lignes. Le test de divergence passe par un petit lecteur de
  littéraux SQL (`tools/catalogue/etablissementsSql.ts`), lui-même testé.
- **La tuile fait 120 points, pas 140** — décision du 2026-08-30 que ce texte n'avait pas suivie.
- **L'icône de la tuile en échec est `iconeEchec`** (l'enveloppe barrée, le livre barré), pas
  « l'icône du service » : la définition la portait déjà pour la rangée, et un échec change de signe,
  pas seulement de mot.
- **La règle `_INDISPONIBLE` passe après la table**, pas avant : CAS et messagerie gardent leur
  libellé précis (« ta boîte n'a pas répondu, mais ta connexion a fonctionné »), la règle couvre le
  reste avec deux clés nouvelles (« Service injoignable »), plutôt que les clés de la famille
  `unavailable`, qui accusent la connexion.
- **`config` dit « Erreur »**, pas « À ressaisir » : un code qu'on ne sait pas lire ne doit pas envoyer
  d'office vers la ressaisie ; sa feuille propose le lien.
- **« Relancer » partout sauf `engine` et `LOGIN_FAILED`** — décision du 2026-09-02 : le tableau
  disait « si la famille le permet », mais le plan de test relance un Blueprint cassé (`data`) et
  attend que la tuile se remplisse après republication. Rejouer un widget est gratuit ; `engine` reste
  sans bouton, la limite écrite tient.
- **La feuille n'affiche pas le `detail` du moteur** : c'est un message technique, journalisé par
  ailleurs — « la feuille ne diagnostique pas » se prend à la lettre.
- **La primitive de dialogue s'appelle `Dialogue`** (le mot du dépôt), dans `shared/ui`, et la
  feuille de widget la compose ; la modale « Bientôt » y a suivi, ayant deux hôtes de deux domaines.
- **`LoadingState` gagne une phrase** ; le composant `ChargementPleinePage` reste à 6.1-E.
- **pdf.js** : `pdfjs-dist` en devDependency épinglée, deux fichiers copiés tels quels en `.txt` par
  `npm run pdfjs:vendor`, `metro.config.js` déclare l'extension, la page est assemblée inline et
  importe la bibliothèque depuis un Blob ; pas de rendu paresseux au premier essai, limite de six
  mégaoctets, chien de garde de quinze secondes. Le lecteur a été découpé — l'écran compose, un hook
  décide — pour tenir les seuils ESLint.
- **Un hook appelé après un retour anticipé** dans `ScolariteDashboard` a été remonté au passage.
- **La carte des fichiers de `scolarite.md`** listait trois fichiers qui n'existent plus et en omettait
  un ; corrigée.

### Retours d'appareil du 2026-09-02 au soir

- **Le fichier SQL ne disait pas ce que la base porte.** Comparé aux lignes publiées (lecture
  anonyme), il divergeait sur quatre valeurs — la porte Moodle de Bordeaux (le SSO initié par l'IdP,
  publié à chaud le 31 août), la ville de l'INP (Talence), le nom et le nom court de « Autre campus »
  — et Talence était déjà en base pour le Collège ST. Le fichier et le socle ont été alignés sur la
  base ; **aucune publication n'est nécessaire**, et le test de divergence garde désormais les deux.
- **Se déconnecter depuis la fiche du compte** laissait deux formulaires empilés : la fiche revient
  en arrière avant d'attendre la fermeture de la session distante.
- **« Tu es d'un autre campus ? » vers « Autre campus »** menait au tableau de bord avec un encart :
  l'onglet a désormais sa page (`CampusNonRelie`, logo de UKit en filigrane, demande de campus, lien
  de retour), l'onglet n'est plus voilé dans la barre, et c'est le bouton Compte qui porte le voile.
- **Le rendu pdf.js est une image** : le pincement pixellise au-delà de deux fois la densité de
  l'écran. Limite écrite ; redessiner à l'échelle du zoom est la suite si un certificat le réclame.
- **L'interrupteur Hors ligne du menu de développement ne coupe pas les widgets** : ils sont joués
  dans la WebView (Act II), qu'il ne couvre pas — c'est écrit dans `qualite.md`. La sonde d'un
  widget en échec se fait en cassant le Blueprint embarqué et en rechargeant Metro.
- **Actualiser le dossier vidait l'onglet** : revenir sur Scolarité pendant l'actualisation retombait
  sur l'écran de chargement plein. Le dossier reste affiché, la barre se pose en encart, et
  « Réessayer » relance le dossier après un échec — le plein écran n'est plus que pour un parcours
  froid sans dossier.
- **La page du campus non relié est un état vide**, pas un bandeau au logo de UKit : le logo y a été
  posé à la place de celui de l'établissement, à la demande, puis défait le jour même — un logotype
  en tête d'un « pas encore » se lisait comme une signature déplacée. Le lien de changement de campus
  est un bouton tonal — ici, et sous le bouton de connexion du formulaire, désactivé avec lui —
  parce qu'un texte nu sous une phrase flottait « dans le vide », et qu'en tête il paraissait
  déplacé.
- **Deux retours de la seconde sonde** : « Suivant » restait bloqué après une connexion réussie (le
  formulaire se démontait sans solder son état) ; le clavier recouvrait les groupes trouvés à l'étape
  de l'emploi du temps (l'étape porte désormais son cadre clavier, comme le compte et le lien).
- **L'attente de la liste des établissements ne se voit pas sur un bon réseau**, même après une
  réinitialisation complète : la base répond pendant l'étape d'introduction, bien avant la troisième
  étape. C'est un filet pour un réseau lent, pas un écran du parcours nominal.
- **« Suivant » et le retour de l'accueil sont bloqués** tant que la connexion lancée depuis le
  formulaire tourne ; la limite « un échec ne se voit qu'après coup » disparaît. **« Tu es d'un autre
  campus ? »** passe sous le bouton de connexion, désactivé avec lui.
- **Réinitialisation complète** dans le menu de développement : l'étape établissement ne peut pas
  montrer son attente après un simple « Réinitialiser » — le cache et le signal du premier
  rafraîchissement survivent tant que le JavaScript n'est pas relancé.
- **Le lecteur d'image sur iPhone** peut garder son état de zoom si on quitte en plein pincement :
  limite écrite, non corrigée.
