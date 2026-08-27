# Scolarité — session universitaire

L'onglet qui relie l'application au système d'information de l'université : connexion au compte
étudiant, récupération de l'identité, compteur de messages non lus, et navigateur intégré vers les
services universitaires.

C'est le module le plus sensible du projet — il manipule des identifiants — et le plus fragile — il
n'existe **aucune API**, tout passe par extraction de pages. Depuis le jalon
[6-F](../phase-6/6-f-scolarite.md), ce parcours n'est plus du code : ce sont deux
[Blueprints](../blueprints.md) joués par le moteur embarqué. Détail des hôtes, sélecteurs et délais :
section 2 de [sources-externes.md](../sources-externes.md).

## Parcours utilisateur

0. **Proposé dès l'accueil** depuis le jalon
   [6-J](../phase-6/6-j-compte-et-sources-par-etablissement.md) : le parcours de premier lancement
   porte une étape « compte universitaire », juste après le choix de l'établissement. C'est **le même
   formulaire** que celui de cet onglet — le contexte de session est monté au-dessus de toute
   l'application précisément pour qu'il n'existe qu'un seul chemin vers le trousseau. Elle est
   **sautable** (« Plus tard ») et **rappelée** dans les [Réglages](settings.md).
1. **Sans compte enregistré** : un écran de connexion demande identifiant et mot de passe
   universitaires, avec une explication de ce qui sera fait de ces données.
2. **Première connexion** (parcours « froid ») : un écran de progression détaille les étapes —
   connexion, profil, dossier, messagerie. Il dure une **quarantaine de secondes**, dont 23 s de
   pauses déclarées : elles ne sont pas du confort, elles sont la condition pour que les deux
   cascades d'authentification arrivent avant qu'on interroge la page (voir
   [Décisions de conception](#décisions-de-conception)).
3. **Lancements suivants** (parcours « chaud ») : les données d'identité sont déjà stockées, seule la
   messagerie est rafraîchie. L'écran s'affiche immédiatement.
4. **Verrou biométrique** : à chaque prise de focus de l'onglet, une authentification locale est
   demandée avant d'afficher les données. Une seule fois par session d'application.
5. Le tableau de bord affiche une salutation personnalisée, la date, un indicateur d'anniversaire, et
   la ligne de messagerie avec le nombre de messages non lus. La toucher ouvre le webmail dans le
   navigateur intégré.
6. Le bouton d'action de la barre d'onglets mène aux réglages du compte : informations enregistrées,
   déconnexion.

> Toutes les captures de cet onglet se prennent avec un **compte de test**, ou après floutage : elles
> ne doivent montrer ni nom, ni numéro étudiant, ni INE, ni adresse mail, ni contenu de messagerie
> réels.
>
> **Capture attendue** — `scolarite-login.png` : l'écran de connexion universitaire.
>
> **Trois captures différées, volontairement** — `scolarite-dashboard.png`, `scolarite-biometrie.png`
> et `scolarite-compte.png`. Elles montrent des écrans dont l'habillage doit changer prochainement, et
> une capture périmée renseigne moins bien qu'une absence signalée. Les quatre autres, ci-dessous,
> illustrent ce que le jalon 6-F a réellement changé et n'ont pas cette fragilité.

![L'écran de connexion universitaire, avant toute saisie](../screenshots/scolarite-login.png)

![Le parcours froid en cours : les trois premières étapes validées, la messagerie en attente](../screenshots/scolarite-progression.png)

Et les deux échecs, qui ne se ressemblent pas et ne doivent pas se ressembler — un refus
d'identifiants se corrige en retapant son mot de passe, un portail muet se corrige en attendant :

![Le refus d'identifiants, affiché sous le formulaire de connexion](../screenshots/scolarite-login-echec.png)

![L'échec de session : le portail ne répond pas, avec son bouton Réessayer](../screenshots/scolarite-echec.png)

## Ce que la page montre

> **Décidé le 2026-08-13, livré le 2026-08-25** par la première session d'écran du volet 2. Avant
> elle, l'onglet ne montrait qu'une salutation et une ligne de messagerie — le reste était vide, et
> chez un établissement sans portail publié il n'y avait *rien du tout*.

### Trois natures, trois sections — et ne pas les mélanger

L'erreur qui guettait cet écran était d'aligner six tuiles qui se ressemblent alors qu'elles ne font
pas la même chose. Une grille de widgets indifférenciés se lit comme un brouillon ; trois sections
dont l'intention est nommée se lisent comme une décision.

| Section | Nature | Ce qui la remplit |
|---|---|---|
| **Ton dossier** | ce que l'application **sait** | des données extraites par Blueprint — donc qui peuvent manquer, échouer, ou être absentes chez un établissement |
| **Tes services** | ce que l'étudiant peut **ouvrir** | des portes vers le navigateur intégré : aucune extraction, aucune panne possible |
| **Tes documents** | ce que l'étudiant a **rangé** | des fichiers locaux, qui n'ont rien à voir avec le portail |

### Ton dossier

Trois rangées, et **aucune n'est une porte** : c'est l'en-tête de section qui porte le chevron et
mène à la fiche complète. C'est la règle du dépôt appliquée — *une information se lit, elle ne se
déclenche pas* — et ça évite trois cibles qui mèneraient toutes au même écran.

**Une seule rangée : la formation courante** — son intitulé, son année, et l'intitulé long en
sous-titre. Lue dans *Inscriptions* à Bordeaux, dans *Parcours* à l'INP.

**Le numéro étudiant et la fraîcheur ont quitté cet écran**, et ce n'est pas un allègement
cosmétique : le tableau de bord est **dédié aux services**, et l'écran du compte est devenu l'endroit
où l'on va chercher une information d'état civil — c'est ce que dit son bouton de barre d'onglets,
« Compte » et non plus « Déconnexion ». Le numéro s'y **copie d'un geste** ; la fraîcheur y vit à
côté du bouton qui la corrige, ce qui la rend actionnable au lieu d'informative.

Faute de formation lue — une entrée de trousseau écrite par une version antérieure — la section
**disparaît entièrement** plutôt que d'afficher un en-tête au-dessus du vide.

### Tes services

Des portes, et rien d'autre : elles ouvrent le [navigateur intégré](#le-navigateur-intégré) sur une
adresse. Elles ne peuvent pas échouer, elles ne demandent aucun Blueprint, et elles **viennent toutes
du catalogue** — colonne `services`, posée au jalon [6-G](../phase-6/6-g-etablissements.md).

| Porte | Bordeaux | Bordeaux INP |
|---|---|---|
| **Webmail** *(rangée à compteur)* | `webmel.u-bordeaux.fr` | — *(SAML, non extractible)* |
| **ENT** | `ent.u-bordeaux.fr` | `ent.bordeaux-inp.fr` |
| **Moodle** | `moodle.u-bordeaux.fr` | `moodle.bordeaux-inp.fr` |
| **Apogée** | `apogee.u-bordeaux.fr` | — *(l'INP est sur PC-Scol)* |

**La messagerie a perdu la section qu'elle avait pour elle seule.** Un en-tête « MESSAGERIE » au-dessus
d'une unique rangée était une grammaire de plus, et il disparaissait en entier chez un établissement
sans webmail extractible. Elle vit maintenant ici, parce que c'est ce qu'elle est : une porte, qui
porte en plus un compteur. Elle **garde sa forme de rangée pleine largeur**, et ce n'est pas
cosmétique — c'est elle qui lui permet d'afficher l'échec du parcours chaud et de mener à la
ressaisie quand les identifiants sont refusés, deux comportements gagnés au jalon 6-K qu'une tuile
rendrait illisibles.

Un établissement qui ne déclare pas une adresse **n'affiche pas la porte**. La grille se construit
donc **depuis le catalogue**, jamais depuis une liste écrite dans l'écran :

```ts
import { serviceEtablissement } from '../../shared/etablissements';

const adresse = serviceEtablissement('moodle');   // string | null
// null  →  la porte ne s'affiche pas. Pas de tuile morte, pas de message d'erreur.
```

Deux limites documentées meurent ici : `ApogeeCard.tsx` était **défini et monté nulle part**, et le
point d'entrée `apogee` n'était atteint par **aucun appel** de navigation. La carte est supprimée, et
une rangée générique pilotée par le catalogue la remplace — *un export mort fait croire à une
capacité*.

### Tes documents

Un endroit où l'étudiant range ses certificats de scolarité, attestations et autres pièces, pour les
avoir **hors ligne** et les retrouver sans fouiller.

Elle fonctionne **techniquement** sans compte — ce sont des fichiers locaux — mais elle ne s'affiche
pas sans compte, et c'est un arbitrage du propriétaire du produit du 2026-08-27, contraire au premier.

La première version la rendait sans condition, pour une raison qui tenait : l'onglet ne servait à rien
à qui ne se connectait pas, et rien du tout chez un établissement sans portail. À l'usage, un onglet
qui montre **une seule section sous un encart d'invitation** se lit moins bien qu'un onglet
franchement vide, qui ne propose qu'une chose — se connecter. C'est **tout ou rien**.

La conséquence est assumée : chez « Autre université », l'onglet redit qu'il n'est pas pris en charge
et s'arrête là.

Ces fichiers vont dans le **répertoire privé de l'application** (`expo-file-system`), isolé des
autres applications et couvert par le chiffrement de l'appareil quand celui-ci est verrouillé. **Pas
dans le trousseau** : `expo-secure-store` est fait pour de petites valeurs — quelques kilo-octets —
et refuserait un PDF.

La formulation exacte, reprise telle quelle dans [PRIVACY.md](../../PRIVACY.md) : *les documents
restent sur l'appareil, dans l'espace privé de l'application, et ne sont envoyés nulle part.* Écrire
« chiffrés par UKit » serait faux — une clé qui vivrait à côté du fichier ne protège de rien, et le
vrai rempart est celui de l'OS.

**Le répertoire est la liste.** Aucun index JSON n'est tenu en parallèle : ce serait deux vérités à
réconcilier — un fichier supprimé par le système, un index qui le mentionne encore — pour ne gagner
que des métadonnées que `info()` donne déjà.

Trois dépendances : `expo-file-system` (le répertoire), `expo-document-picker` (importer),
`expo-sharing` (ouvrir dans une autre application — afficher un PDF soi-même demanderait une
dépendance de rendu pour refaire, moins bien, ce que le système fait déjà).

**L'étudiant ajoute ses pièces lui-même**, et c'est une limite écrite. Voir
[Ce qui n'est pas récupérable](#ce-qui-nest-pas-récupérable-et-pourquoi).

### L'aiguillage s'est inversé, et c'est le changement structurant

L'écran rendait un état **plein écran** et rien d'autre dès que la session n'était pas nominale.
Depuis que les documents existent — locaux, sans compte, sans portail — cacher toute la page derrière
un écran d'erreur rendrait l'onglet mort pour exactement ceux à qui il sert le plus.

| Situation | Avant | Après |
|---|---|---|
| Aucun portail publié | `PORTAIL_ABSENT` plein écran | **« Campus non pris en charge »**, avec une action de demande |
| Aucun compte | `ScolariteLoginView` plein écran | une invitation à connecter, **et rien d'autre** |
| Échec bloquant | `SourceFailureNotice` plein écran | l'encart d'échec en tête, **puis les documents** |
| **Parcours froid en cours** | plein écran | **inchangé** |

La dernière ligne est délibérée : le parcours froid est *transitoire*, et une page qui se remplirait
sous un indicateur de progression ferait sauter le contenu à chaque étape franchie.

**Le verrou biométrique suit la même logique** : il ne s'arme que lorsqu'un compte est enregistré.
Sans compte il n'y a rien à protéger dans cet onglet — l'identité n'a pas été lue — et demander une
empreinte pour atteindre ses propres fichiers serait un péage sans serrure derrière.

### Le tableau de bord est dédié aux services

La formation y a vécu une journée, puis elle a rejoint l'écran du compte. C'est une information d'état
civil : on la consulte, on n'agit pas dessus — et la garder sur le tableau de bord obligeait à poser un
en-tête de section au-dessus d'une **rangée unique**. Le tableau de bord se réduit donc à la
salutation, l'encart d'état, les services et les documents.

**L'écran du compte est devenu le lieu de ce qu'on va chercher**, et son bouton de barre d'onglets le
dit : « Compte », plus « Déconnexion ». Il porte l'état civil, la formation, l'INE, les identifiants,
la date de dernière lecture, et les trois gestes.

### Trois chaînes se copient, et ce sont les bonnes

Le numéro étudiant, l'INE et l'adresse universitaire portent un bouton de copie. Ce sont exactement
les chaînes qu'on redemande à un étudiant et qu'il ne retient pas — inscription en bibliothèque,
feuille d'examen, formulaire administratif. Le bouton **ne s'affiche que s'il y a quelque chose à
copier** : une icône au-dessus d'un tiret proposerait un geste sans effet. Le retour est un toast,
parce qu'un presse-papiers est invisible : sans confirmation, rien ne distingue « copié » de « rien ne
s'est passé ».

### La progression s'affiche là où le geste est fait

« Actualiser mon dossier » rejouait un parcours froid puis **fermait l'écran**. Le run se déroulait
bien — il n'est annulé qu'au passage en arrière-plan, jamais par un changement d'écran — mais **rien
ne le montrait** en dehors de l'onglet Scolarité, seul endroit qui rendait l'écran de progression.
Depuis les Réglages, on revenait donc aux Réglages et le geste paraissait sans effet, jusqu'à ce qu'on
ouvre l'onglet et qu'on découvre une progression qui semblait commencer à cet instant.

L'écran du compte rend maintenant la progression lui-même et **ne se ferme plus**. L'autre remède
envisagé — renvoyer l'utilisateur vers l'onglet Scolarité — corrigeait le symptôme en *déplaçant la
personne* : on touche une ligne dans les Réglages et on se retrouve dans un autre onglet.

### Le formulaire ne cède plus la place à l'écran d'attente

Se connecter faisait défiler deux pages : le formulaire, puis un écran de progression, puis la fiche.
Chacune paraissait à moitié vide, et l'enchaînement se lisait comme une application qui hésite —
d'autant qu'un échec obligeait à revenir en arrière pour retrouver ses champs.

**Le formulaire porte donc sa propre progression** : le bandeau — logo, titre, phrase — reste, et
seule la carte passe des champs à la barre. Une page qui se transforme se lit comme une suite, et un
échec revient **là où la saisie a eu lieu**, sans qu'aucun écran ne soit rejoué en sens inverse.
Le bloc est partagé ([`BlocProgression`](../../src/features/Scolarite/components/ScolariteLoadingScreen.tsx)) :
l'écran plein n'en est qu'un second hôte.

**L'ordre de l'aiguillage est le sujet**, et il a dû être inversé : l'écran plein était testé *avant*
le formulaire, donc il le supplantait dès que la session partait — on retombait sur deux pages qui se
remplacent. Ce qui reste à l'écran plein est le parcours froid qu'on n'a **pas** demandé depuis un
formulaire : au lancement, ou sur « Actualiser mon dossier ». Il n'y a alors aucune page à garder.

### Une seule règle : la page se transforme, elle ne se remplace pas

Elle vaut désormais partout sur l'écran du compte, et il n'y a **plus aucun chargement plein écran**
sur cet écran :

| Situation | Ce qui change | Ce qui reste |
|---|---|---|
| Connexion en cours | la carte passe des champs à la barre | le bandeau : logo, titre, phrase |
| Actualisation du dossier | les trois actions cèdent la place à la barre | la fiche : état civil, dossier, identifiants |

Actualiser prenait l'écran entier : on perdait de vue ce qu'on était en train d'actualiser, et le
retour de la fiche se lisait comme un changement de page. Les trois actions n'ont de toute façon aucun
sens pendant un run — c'est exactement l'espace à leur prendre.

**Un piège dans le premier cas, et il n'est pas évident.** `LOGIN_SUCCESS` est émis au dixième step
sur vingt : les identifiants sont posés **dès que le CAS accepte**, donc `credentials` cesse d'être nul
*en plein run*. La condition qui gardait le formulaire retombait à faux à mi-parcours, et l'écran
basculait d'un coup. Le formulaire signale donc à son hôte qu'une session part **de lui**
(`onDebut`), et garde la page jusqu'au terme — échec compris, puisque c'est là que son message doit
s'afficher.

### Le moteur se libère avant un geste qui doit pouvoir jouer

`fermerSessionDistante` appelle le moteur **directement**, sans passer par le verrou d'un run — donc
sans être mise en file, mais aussi sans être protégée : lancée pendant un run, elle est refusée par le
moteur et **avale son échec**.

L'enchaînement qui en découlait valait d'être démonté, parce que le symptôme ne ressemblait pas à sa
cause : la session CAS restait ouverte, le parcours suivant ne voyait donc **aucun formulaire**, donc
`LOGIN_SUCCESS` n'était pas émis, donc la validation se soldait en *« impossible de vérifier tes
identifiants »* — sur des identifiants pourtant justes.

`validateAndSave` **libère le moteur d'abord**, puis ferme la session distante, puis relance. Et
« libérer » veut dire *attendre* : annuler ne rend pas le verrou tout de suite, l'abandon se propage
au run dont le `finally` le rend au tour suivant. Repartir aussitôt faisait refuser la nouvelle
session par ce verrou-là.

Ce n'est **pas** la file d'attente que le module refuse : on ne met pas deux demandes concurrentes en
attente l'une de l'autre, on laisse celle qu'on vient d'annuler finir de mourir.

### Une demande explicite passe devant une session de fond

« Une seule session à la fois » reste vrai, mais le refus sec traitait de la même façon deux choses
différentes : un double appui accidentel, et quelqu'un qui demande « actualise mon dossier » pendant
que le parcours chaud du lancement tourne encore. Le second se faisait refuser **en silence à
l'écran**, avec pour seule trace un avertissement dans le terminal — le bouton paraissait mort.

Une session portée par un **geste** — actualiser, valider des identifiants — remplace donc celle qui
court. Le refus reste pour tout le reste.

Deux précautions que ce remplacement impose, et qui ne se devinent pas :

- **la remise à `null` de la session est synchrone.** Le `finally` du run remplacé ne s'exécute qu'au
  tour suivant, et sa garde `=== controleur` l'empêche d'effacer la session qui vient d'arriver ;
- **un run remplacé ne solde pas la validation de celui qui l'a remplacé.** Sans cette garde, l'écran
  afficherait une erreur réseau sur une session qui se déroule parfaitement.

### L'écran ne se referme plus tout seul, et c'était deux bugs

Il se refermait après un `await`, ce qui supposait que la personne y était encore. Elle ne l'était
plus, pour deux raisons indépendantes :

- **à la déconnexion**, `logout` attend la fermeture de la session distante — quelques secondes.
  L'interface, elle, s'est mise à jour bien avant : le formulaire est déjà affiché, et l'écran se
  refermait **pendant qu'on retapait ses identifiants** ;
- **à la connexion**, `LOGIN_SUCCESS` est émis au **dixième step sur vingt**. Le CAS a accepté, mais
  le dossier, la formation et l'annuaire restent à lire : la promesse se résolvait à mi-parcours, et
  l'écran se refermait avec dix secondes de run devant lui.

Rester est aussi le bon comportement en soi : l'aiguillage de cet écran montre déjà la suite — la
progression, puis la fiche, ou le formulaire après une déconnexion. Il n'y a rien à fuir.

### Une validation en attente se solde toujours

`finirValidation` n'était appelé que sur `LOGIN_SUCCESS` ou sur un échec. Depuis que l'`emit` est
conditionnel, **un run qui va au bout sans formulaire ne résolvait plus rien** : la promesse restait
pendante et la référence armée, si bien que le `LOGIN_SUCCESS` d'un run *ultérieur* la résolvait.

Elle se solde désormais à la fin de chaque run, et en **échec** quand le CAS ne s'est pas prononcé :
sans formulaire, les identifiants n'ont été vérifiés par personne et n'ont donc pas été écrits —
annoncer un succès afficherait « connecté » sur un trousseau vide.

### L'écran d'attente : une barre, un pourcentage, une ligne

La liste d'étapes cochées était **plus informative**, et c'est justement ce qui la rendait mal adaptée
ici : **on ne peut agir sur aucune de ces étapes.** « Récupération du dossier étudiant » ne dit rien
d'utilisable à quelqu'un qui ne peut qu'attendre ; ce qu'il veut savoir, c'est *combien de temps
encore*. Une liste de tâches sert quand on peut intervenir, ou quand les étapes veulent dire quelque
chose pour celui qui regarde — ce n'est ni l'un ni l'autre. La ligne unique dit la même chose sans
étaler quatre lignes dont trois sont grisées.

**La barre ne saute jamais.** Une première version posait un *plancher* au changement d'étape : elle
bondissait d'un coup, et les étapes quasi instantanées rendaient le saut très visible. Elle anime
maintenant **toujours depuis sa position courante** vers le plafond de l'étape — un changement d'étape
ne fait que changer la cible, jamais la position. Une étape qui passe en une seconde accélère la barre
au lieu de la téléporter.

Elle est portée par une `Animated.Value` : elle avance à la fréquence de l'écran, pas à celle des
mises à jour d'état. La version d'avant se rafraîchissait quatre fois par seconde, ce qui suffit à se
voir. Le pourcentage, lui, passe par un écouteur arrondi à l'entier — au plus cent mises à jour sur
tout le parcours, là où suivre la valeur brute en rendrait des milliers pour un texte qui ne change
pas.

**Ce qu'elle s'autorise et ce qu'elle s'interdit.** Elle s'autorise à *lisser* : les durées sont
estimées, donc elle avance sans savoir exactement où elle en est. Elle s'interdit les deux choses qui
en feraient un mensonge — elle ne **recule** jamais, et elle n'atteint jamais le plafond d'une étape
qui n'est pas finie. Les paliers ne sont pas équidistants, et c'est mesuré : la connexion et la
messagerie portent les deux pauses d'authentification, le profil est instantané.

### Le logo de l'établissement

Le catalogue porte une colonne `logo_url` depuis le jalon 6-G, et **elle n'était lue nulle part** : la
plomberie existait, la donnée manquait. Le formulaire de connexion l'affiche désormais.

**Deux gabarits, parce que ce sont deux objets différents.** Un logo d'université est un *logotype* :
large, plus proche du mot que du pictogramme. Mesuré le 2026-08-27, l'Université de Bordeaux est en
**2,86:1** et Bordeaux INP en **1,69:1** — posés dans le carré de 72 prévu pour une icône, ils se
réduisaient à 49 points de large sur 17 de haut, un timbre au milieu d'un grand carré blanc. Le
conteneur est donc **large quand il porte un logo** et carré quand il porte l'icône de repli.

**Fond blanc dans les deux thèmes**, comme le logo de UKit sur la page À propos. Un logo publié est
fourni détouré sur transparent et dessiné pour du blanc : sur le fond de page en thème sombre, il
devient illisible. Le teinter serait pire — ça ferait varier les couleurs d'une marque qu'on ne
possède pas. Le rembourrage est **le nôtre** : les fichiers sont détourés à ras du tracé, sans marge.

Le **repli sur l'icône générique** couvre les trois cas : aucun logo publié, un logo qui ne se charge
pas, et le premier lancement hors ligne. Le formulaire reste utilisable dans les trois, ce qui est la
seule chose qui compte à cet endroit.

Un logo peut servir **plusieurs établissements** : celui de l'Université de Bordeaux vaut pour le
Collège Sciences et Technologies et vaudra pour les autres campus qui en dépendent. C'est pourquoi
`logo_url` est une colonne par établissement et non un fichier par code — plusieurs lignes pointent
sur le même objet sans le dupliquer.

### Un campus non porté n'est pas une panne

L'état d'un établissement sans portail publié empruntait la grammaire d'échec
(`SourceFailureNotice`) : il disait « le portail ne répond pas » là où il n'y a **jamais eu** de
portail à joindre. C'est désormais un **état vide**, avec ce qu'un état vide doit porter — une
**action**, jamais un bouton Réessayer qui n'aurait rien à rejouer.

L'action ouvre un formulaire de demande, et **son adresse vient du catalogue** (`services.adaptation`)
: ajouter ou changer ce lien est une publication, pas une release. Sans lien publié, le message reste
et l'action disparaît — mieux vaut dire honnêtement « pas encore » que proposer une porte fermée.

### Ce qui n'est pas récupérable, et pourquoi

- **Les documents du portail ne se téléchargent pas.** Un Blueprint ne sait pas écrire un fichier
  binaire : l'Act II n'en écrit pas, et l'extraction texte du jalon 3-I ne rend que du texte décodé.
  La sonde du 2026-08-25 a de plus montré que les PDF de Bordeaux INP — certificat de scolarité,
  attestation de paiement, relevés de notes — portent une URL dont l'UUID **et** l'horodatage sont
  régénérés à chaque rendu de page : même téléchargeables, ils ne seraient pas rejouables. Ce sont
  des **portes**, jamais des données.
- **Les notes ne sont pas encore extraites**, et elles le seront : la sonde du 2026-08-25 les a
  trouvées **des deux côtés** (voir [Ce que la sonde a corrigé](#ce-que-la-sonde-du-2026-08-25-a-corrigé)).
  Elles font l'objet de leur propre session : ce n'est pas une rangée mais un écran — résultats par
  année, détail par UE derrière un clic, échelles `/20` et `/200` qui cohabitent, hiérarchie
  BCC → UE → CC/EX portée par l'indentation du libellé. Les mêler à une session de refonte l'aurait
  rendue invérifiable. En attendant, la **porte Apogée** les couvre à Bordeaux.

## Architecture

```text
CredentialsProvider                     englobe toute la pile de navigation
  ├─ useCredentialsSession()            l'état : trousseau, mode, progression, échec
  ├─ useChargementInitial()             ce que le trousseau porte, puis la session qui va avec
  ├─ useCycleDeVieSession()             annule en arrière-plan, reprend au retour
  └─ ScolariteSession.deroulerSession() la séquence de runs
       ├─ froid : ukit.scolarite.dossier  → identité complète
       └─ les deux : ukit.scolarite.messagerie → non lus

ScolariteDashboard                      consomme useCredentials()
  ├─ parcours froid en cours → ScolariteLoadingScreen        (le seul etat plein ecran)
  └─ sinon                   → [BiometryGate si compte] > PageScolarite
                                  ├─ GreetingBlock          (si une identite est lue)
                                  ├─ EncartSession          (portail absent / pas de compte / echec)
                                  ├─ DossierSection         (formation, numero, fraicheur)
                                  ├─ ServicesSection        (messagerie + portes du catalogue)
                                  └─ DocumentsSection       (local — toujours, sans condition)
```

**L'absence de portail passe devant l'absence de compte** dans `EncartSession`, et l'ordre n'est pas
indifférent — c'est le même raisonnement que l'onglet Planning au jalon 6-G, appliqué ici au jalon
6-J. Un établissement qui ne publie aucun portail n'a **jamais** d'identifiants enregistrés : la
branche « pas de compte » gagnait donc toujours, et proposait un formulaire de connexion qui ne
pouvait mener nulle part. C'est la condition pour qu'une université sans portail soit utilisable
plutôt que menteuse.

Ce qui a changé, c'est que ces états ne **prennent plus l'écran** : ce sont des encarts, et les
documents restent atteignables dessous (voir [L'aiguillage s'est inversé](#laiguillage-sest-inversé-et-cest-le-changement-structurant)).

Il n'y a **plus de WebView propre à cet onglet** : les deux Blueprints sont joués dans la WebView
unique montée par [`rootContainer.tsx`](../../src/shared/navigation/rootContainer.tsx), qui ne crée
sa vue native qu'au premier run navigateur et la libère à la fin.

Le provider est monté **au-dessus de la pile entière** ([navigation.md](../navigation.md)) : la
session démarre au lancement de l'application, pas à l'ouverture de l'onglet, pour que les données
soient prêtes quand l'utilisateur y arrive.

## Deux Blueprints, pas un

| Blueprint | Quand | Ce qu'il rend |
|---|---|---|
| [`ukit.portail.bordeaux.dossier`](../../blueprints/ukit-portail-bordeaux-dossier.blueprint.json) | premier login | numéro étudiant, INE, identité, adresse mail, date de naissance, **formation**, appartenances d'annuaire |
| [`ukit.portail.bordeaux.messagerie`](../../blueprints/ukit-portail-bordeaux-messagerie.blueprint.json) | chaque lancement, et fin du parcours froid | nombre de messages non lus |

**Les noms viennent du catalogue**, plus de constantes, depuis le jalon
[6-G](../phase-6/6-g-etablissements.md) : ils sont propres à l'établissement sélectionné, et un
établissement ajouté à distance apporte les siens. Un champ à `null` n'est pas une panne mais un
**service absent** — voir [Un établissement peut n'avoir qu'une partie des services](#un-établissement-peut-navoir-quune-partie-des-services).

Le découpage suit **les parcours de l'application, pas les pages** : chacun ouvre son service, qui
rebondit lui-même sur l'authentification unifiée. Chacun se rejoue seul, et une panne de l'un
n'emporte pas l'autre — une messagerie injoignable n'efface pas le dossier qui vient d'être lu.

Chaque fichier part **du service et non du portail**. Le code d'origine ouvrait `ent.u-bordeaux.fr`
puis naviguait de page en page en injectant `window.location.href` ; les Blueprints ouvrent
directement `mondossierweb` ou `webmel`, qui redirigent vers le CAS avec leur paramètre `service=` et
reviennent au bon endroit, fragment compris. Corollaire assumé : **la lecture du prénom sur l'ENT
n'a plus de page où se faire.** Le dossier administratif porte l'identité complète, c'est de là
qu'elle vient désormais.

## Un établissement peut n'avoir qu'une partie des services

Le cas n'est pas théorique : **Bordeaux INP**, le second établissement du catalogue, n'a pas de
messagerie extractible — son webmail passe par SAML et non par le CAS. `portail_messagerie` vaut donc
`null`, et trois choses en découlent :

- la session **saute** le run de messagerie au lieu d'échouer : une fac sans webmail lisible doit
  donner une session complète, pas une erreur à chaque lancement ;
- le tableau de bord **n'affiche pas la carte** (`messagerieDisponible`, lu à chaque rendu pour qu'une
  bascule d'établissement le fasse disparaître tout de suite). Une carte en panne permanente pour un
  service inexistant serait un mensonge répété ;
- le seul cas qui échoue est celui où l'établissement ne publie **rien** : il n'y a alors pas de
  session à dérouler, et le dire est le bon comportement (`PORTAIL_ABSENT`).

Le pendant côté message : `serviceAbsent()` rend un échec de famille `config`, non réessayable, qui
porte **son propre libellé** — « Cette université n'est pas encore reliée à UKit », et non « le portail
ne répond pas ». Les deux appellent des gestes opposés de la part d'un étudiant.

## Deux portails, une seule sortie

Le portail de Bordeaux INP a été écrit au jalon 6-G contre un compte étudiant réel, et il ne ressemble
au premier que par sa forme :

| | Université de Bordeaux | Bordeaux INP |
|---|---|---|
| Soumission du CAS | `input[type=submit]` | **`<button id="submitBtn">`** |
| Panneau d'erreur | `#loginErrorsPanel` | **le même** |
| Dossier | `mondossierweb` **Vaadin 8** (thème Valo) | `mondossierweb` **Vaadin 14+** (PC-Scol) |
| Ancrage des champs | **par leur libellé** *(depuis le 2026-08-25)* | **par leur libellé** |
| Navigation entre vues | on **clique** un menu à état serveur | de vraies routes (`/acces`, `/inscriptions`) |
| Identité | `PRÉNOM NOM` en un champ | nom et prénom séparés, recomposés par le fichier |
| INE | état civil | **onglet Accès** |
| Formation | vue *Inscriptions*, un tableau | vue *Parcours*, une carte par année |
| Durée du parcours froid | ~46 s | ~24 s |

Ce que ça établit, et qui vaut pour tous les portails à venir : **c'est la sortie qui est le
contrat.** Les deux fichiers rendent les mêmes champs, et les écrans ne savent toujours pas qu'il
existe deux portails.

Une nuance est apparue en ajoutant la formation, et elle vaut d'être écrite : **les deux portails ne
rendent pas la même *forme*.** Une lecture obligatoire descend en `as: "text"`, qui lève si le nœud
manque ; une lecture **bonus** descend en `as: "list"`, qui rend `[]` et ne lève jamais. L'INE en est
l'illustration — obligatoire à Bordeaux, facultatif à l'INP où il vit sur un onglet à part.
`premierTexte` ramène les deux à une chaîne, dans le seul module qui en a le droit. Normaliser là
plutôt que dans les fichiers évite d'imposer à un portail la fragilité de l'autre.

## Données froides et données chaudes

| | Données froides | Données chaudes |
|---|---|---|
| Contenu | prénom, numéro étudiant, INE, adresse mail, date de naissance, **formation et son année**, **date de lecture** | nombre de messages non lus |
| Stabilité | ne changent pas d'une année sur l'autre | changent en permanence |
| Stockage | SecureStore (`UKIT_COLD_DATA`) | mémoire seulement |
| Récupération | une seule fois, au premier login | à chaque lancement |

C'est ce qui permet le mode « chaud » : une page lourde évitée à chaque démarrage. Le mode est
choisi automatiquement à l'initialisation — `hot` si des données froides existent, `cold` sinon — et
forcé à `cold` lors d'un nouveau login.

**Les quatre champs ajoutés le 2026-08-25 sont facultatifs dans le type**, et le compilateur le dit :
une entrée de trousseau écrite par une version antérieure ne les porte pas. Les déclarer obligatoires
ferait mentir le type sur des données qui existent déjà sur les appareils, et l'écran afficherait un
libellé vide au lieu de faire disparaître sa ligne. **Personne n'est déconnecté par cet ajout** : les
clés historiques n'ont pas bougé, et un dossier ancien se complète au prochain « Actualiser ».

La **date de lecture** est posée par l'appelant (`ScolariteSession`), jamais lue dans la projection :
`ScolariteMapping` ne connaît ni l'heure ni la plateforme, et c'est ce qui le garde rejouable sous
vitest.

## États de session

```ts
scrapeStatus   : 'idle' | 'connecting' | 'scraping' | 'done' | 'error'
scrapeProgress : 'connecting' | 'profile' | 'dossier' | 'mailbox' | null
sessionFailure : UkitFailure | null
```

Les trois vivent dans **un seul état** ([`CredentialsContext.tsx`](../../src/features/Scolarite/services/CredentialsContext.tsx)) :
ils changent toujours ensemble, et trois `useState` séparés laissaient possibles un statut qui avance
sans que la progression suive, ou un échec qui reste affiché après une reprise.

La progression ne vient plus de messages postés à la main : elle est **lue dans le flux d'événements
du run**. `LOGIN_SUCCESS`, que le Blueprint émet explicitement, fait passer à l'étape *profil* ; le
`step_started` du step nommé `dossier` fait passer à l'étape *dossier* ; le run de messagerie porte
la dernière.

Le garde-fou global de 60 s **a disparu**. Chaque attente porte son propre `timeout_ms` dans le
fichier, et `runBlueprint` ne lève jamais : une promesse qui ne se résout pas n'est plus possible.

## Deux écritures, deux déclencheurs

C'est la distinction à ne pas confondre, et le jalon 6-F la rend possible :

- **les identifiants** s'écrivent sur `LOGIN_SUCCESS`, l'événement que le Blueprint émet quand le CAS
  a accepté. C'est la preuve qu'ils sont bons ; un mot de passe erroné ne laisse donc aucune trace ;
- **les données froides** ne s'écrivent que si le run va au bout, `assert` compris. Un décalage des
  identifiants GWT fait échouer l'assertion, et **rien d'incorrect n'atteint le trousseau**.

`validateAndSave(username, password)` retourne une promesse résolue par le flux du run. Le couple
candidat n'étant pas encore dans `SecureStore`, il est passé **à l'appel** (`RunBlueprintOptions.secrets`,
qui gagne sur le resolver) plutôt qu'écrit d'abord : l'écrire pour que le resolver le trouve
romprait exactement la promesse ci-dessus.

## Une session à la fois

Il y a une WebView montée, donc **un run navigateur à la fois**. Une seconde demande est refusée
**explicitement et bruyamment**, jamais mise en file : une file cacherait une seconde session
derrière un délai inexpliqué. La garde est posée deux fois — dans le contexte et dans
[`ScolariteSession.ts`](../../src/features/Scolarite/services/ScolariteSession.ts) — et c'est voulu :
celle du contexte attrape le geste utilisateur, celle du service attrape l'erreur de programmation.

L'**annulation** est le pendant : la session est coupée quand l'application passe en arrière-plan et
au démontage du provider, sans quoi une WebView cachée survivrait à l'écran qui l'a demandée. Sur
`background` seulement, jamais sur `inactive` — iOS émet `inactive` pour l'invite biométrique de cet
onglet, et couper là serait absurde. Au retour au premier plan, une session qu'on a soi-même annulée
**reprend** ; un échec réel, lui, ne se rejoue pas tout seul.

**Changer d'établissement déconnecte, y compris en mémoire.** `changerEtablissement` vide le
trousseau, mais le provider est monté au-dessus de toute la pile : il ne se démonte pas, et son état
survivait à la bascule — l'onglet affichait le prénom de l'étudiant de l'autre université avec un
trousseau pourtant vide, c'est-à-dire la pire forme du défaut que cette phase supprime : une donnée
fausse qui a l'air juste. Le contexte s'abonne donc à l'événement `etablissement` et oublie **ce qu'il
garde**, sans retoucher au magasin — le refaire ici ferait dépendre la correction de l'ordre des
abonnements. Trouvé sur appareil au jalon 6-G.

Une session annulée **n'écrit rien**. Le cas qui l'impose n'est pas théorique : une déconnexion
pendant la session remettrait dans le trousseau l'identité que `logout` vient d'effacer.

## Ce que la sonde du 2026-08-25 a corrigé

Une sonde de reconnaissance a ouvert les deux dossiers avec des comptes réels — 5 connexions côté
Bordeaux, **2** côté INP dont le compte est prêté — et dumpé leur DOM pour l'analyser hors ligne.
Elle a corrigé **trois affirmations de cette documentation** et supprimé la fragilité que la Phase 6
désignait comme la plus sérieuse du projet.

### Les deux portails sont des Vaadin

Ce document opposait « `mondossierweb` **GWT** » à « `mondossierweb` **Vaadin** ». C'est inexact, et
ça masquait leur symétrie : Bordeaux est un **Vaadin 8** (thème Valo) dont le moteur client est
*compilé par GWT* — d'où les `gwt-uid-NN` — et l'INP un **Vaadin 14+** en composants web. Même
famille, deux générations.

### Les sélecteurs positionnels ont disparu

Les cinq `#gwt-uid-41/43/45/47/51` étaient attribués selon l'ordre de construction du DOM, et ce
document les appelait *« la fragilité la plus sérieuse du projet »*. Ils n'existent plus : chaque
champ vit dans une ligne de `v-formlayout` qui **porte sa légende**, exactement comme chez l'INP.

```
//tr[contains(@class,'v-formlayout-row')]
   [td[contains(@class,'v-formlayout-captioncell')][normalize-space()="NNE"]]
   /td[contains(@class,'v-formlayout-contentcell')]
```

Vérifié hors ligne sur le DOM capturé : **11 libellés testés, 11 nœuds uniques.** Un décalage du DOM
ne peut donc plus rendre *la mauvaise valeur* — il ne rend plus *rien*, et l'extraction échoue
bruyamment.

**Le piège, à connaître avant de « simplifier » ces XPath** : une ligne porte **trois** cellules —
légende, **erreur**, contenu. Un `following-sibling::td[1]` tombe sur la cellule d'erreur, vide.
C'est ce qui a fait échouer le premier essai de la sonde.

**L'`assert` a maigri en conséquence.** Les cinq libellés voisins n'ont plus à être lus puisqu'ils
*sont* les sélecteurs. Il ne garde que le cas qu'un ancrage par libellé ne couvre pas : un libellé
présent au-dessus d'une valeur **vide**, qui écrirait un dossier creux dans le trousseau.

Et l'attente qui prouve la connexion a suivi : `#gwt-uid-41` cède la place à
`td.v-formlayout-contentcell`. En CSS et non en XPath, parce que `wait_for` ne lit pas
`selector_type` côté moteur Python — c'est le dernier identifiant positionnel à quitter le chemin
critique.

### L'INE de Bordeaux INP existe

Ce document écrivait : *« Bordeaux INP ne rend pas d'INE : son dossier ne l'expose pas. »* Faux. Il
est sous l'onglet **Accès**, libellé `Code INE`, que le Blueprint ne visitait pas. Le champ est
désormais rempli des deux côtés.

### « Documentation » n'est pas un onglet de documents

Ce document écrivait que *« le dossier de Bordeaux INP a bien un onglet "Documentation" »*, en
supposant des fichiers. C'est un **lien externe** vers une page d'aide de l'ENT. Les vrais PDF sont
dans *Parcours*, et ils ne sont pas stockables — voir
[Ce qui n'est pas récupérable](#ce-qui-nest-pas-récupérable-et-pourquoi).

### Deux garde-fous appris en écrivant ces Blueprints

Ils ne se devinent pas à la relecture, et chacun coûte un run entier :

- **un step gardé par `when` n'enregistre aucune sortie**, donc le bloc `outputs` qui le référence
  lève en `StrictUndefined`. Une lecture facultative se protège par `as: "list"` — qui rend `[]` et
  ne lève jamais — et non par une garde ;
- **le moteur embarqué refuse un clic ambigu** là où Playwright prend le premier. Tout sélecteur de
  `click` doit matcher **exactement un** élément, et ça se mesure.

## Le navigateur intégré s'ouvre déjà authentifié

**Décidé et mesuré le 2026-08-25.** C'était l'une des promesses de garder des identifiants
enregistrés, et elle n'était pas tenue : ouvrir l'ENT, Moodle ou le webmail retombait sur un
formulaire de connexion, que le script injecte remplissait en interrogeant la page toutes les
100 ms.

**La cause n'était pas là où on la cherchait, et le remède n'est pas un Blueprint de plus.** Le
moteur ouvre sa WebView en **incognito** — `options.session.persist` vaut `false` par défaut — donc
le ticket CAS que le parcours vient d'obtenir est *jeté* à la fin du run. Il y avait une session
valide, elle était détruite trois secondes plus tard.

Deux lignes suffisent, et elles vont par paire :

| Où | Quoi | Pourquoi |
|---|---|---|
| les trois Blueprints de portail | `options.session.persist: true` | le ticket survit au run et atterrit dans le magasin de cookies de la plateforme |
| [`WebBrowserScreen`](../../src/features/Scolarite/screens/WebBrowserScreen.tsx) | `sharedCookiesEnabled`, `thirdPartyCookiesEnabled` | sur iOS, `WKWebView` n'utilise le magasin partagé que si on le demande — sans ça, l'écran repartirait d'un magasin vide malgré une session ouverte à côté |

**C'est un gain de sécurité, pas une concession.** Le mot de passe cesse d'être injecté dans une page
pour le cas courant. Le script de remplissage **reste** et n'est pas redondant : un ticket CAS expire,
et c'est lui qui rattrape ce cas-là.

### La connexion est devenue conditionnelle, et il le fallait

Persister la session a immédiatement cassé le parcours chaud, et le symptôme était trompeur :

```
ukit.portail.bordeaux.messagerie : blocked [CAS_INDISPONIBLE]
  — wait_for timed out for selector "#username"
```

**C'est la preuve que ça marche.** Avec une session vivante, le CAS reconnaît le ticket et renvoie
*directement* au service : il n'affiche **aucun formulaire**, donc attendre `#username` échoue après
20 s d'attente inutile. Les trois Blueprints de portail demandent désormais à la page s'il y a un
formulaire — `as: "count"`, qui ne lève jamais — et ne jouent le bloc de connexion que dans ce cas.

| Branche | Ce qui se joue | Code d'échec de la cible |
|---|---|---|
| `formulaire > 0` | remplissage, clic, pause d'après-clic, garde `#loginErrorsPanel` | `LOGIN_FAILED` / `MESSAGERIE_INDISPONIBLE` |
| `formulaire == 0` | rien — on est déjà passé | **`CAS_INDISPONIBLE`** : ni formulaire ni cible veut dire que le portail n'a rien rendu |

Deux gains au passage : la pause d'après-clic — **15 s** sur la messagerie — n'est plus payée quand on
n'a pas eu à s'authentifier ; et la distinction de diagnostic que la phase a mis sept jalons à
construire est préservée au lieu d'être aplatie sur un seul code.

**La sonde d'attente vaut 6 s et non 3.** La mesure du 2026-08-24 donne **2834 ms pour la seule
navigation** depuis un poste filaire, et c'est le meilleur cas. Sous-estimer ce délai ferait conclure
« pas de formulaire » à une page qui allait en afficher un.

### Le piège que cette garde a révélé : une revalidation pouvait écrire un mot de passe faux

`LOGIN_SUCCESS` est ce qui autorise l'application à écrire les identifiants dans le trousseau — il
veut dire *« le CAS a accepté ce couple »*. Avec une session vivante, le run traverse **sans que le
CAS ait rien vérifié** : l'émettre là ferait enregistrer un mot de passe faux comme s'il était bon.

Le cas n'est pas théorique, c'est exactement celui de **« Ressaisir mes identifiants »** : quelqu'un
dont le mot de passe a changé tape le nouveau, une session de l'ancien est encore ouverte, et rien ne
distingue le succès de l'inertie.

Deux moitiés, et il faut les deux :

- l'`emit` est **gardé sur la branche du formulaire** — il ne se produit que si le CAS s'est
  réellement prononcé ;
- `validateAndSave` **ferme la session distante avant de lancer le run**, de sorte que le formulaire
  apparaisse et que la garde soit vraie. `finally` et non `then` : une fermeture qui échoue ne doit
  pas empêcher quelqu'un de se reconnecter.

**Les deux branches sont vérifiées contre le portail réel** (2026-08-27) : au premier passage la sonde
compte `1` formulaire et la connexion se joue ; au second, session vivante, elle compte `0`, aucune
étape de connexion ne s'exécute, et la boîte est relue sans reconnexion.

### Prouver un couple d'identifiants ne se déduit pas, ça se demande

C'est la correction la plus instructive de la session, parce qu'elle a démoli une déduction qui
paraissait solide : *si le parcours traverse un formulaire, c'est que le CAS a accepté.*

Elle est fausse dès que la session persiste. On a d'abord cru pouvoir la sauver en fermant la session
distante avant toute validation — puisque sans session, le formulaire réapparaît. **Mesuré le
2026-08-27, ça ne marche pas** : le CAS répond « Logout successful », et revenir sur `mondossierweb`
passe quand même **sans formulaire**. Le service garde son **propre** cookie de session, que la
déconnexion du CAS ne touche pas.

Le parcours traversait donc sans que personne ne se prononce, `LOGIN_SUCCESS` n'était pas émis, et
l'application soldait la validation en *« impossible de vérifier tes identifiants »* — sur des
identifiants justes.

La réponse est un paramètre du protocole, pas un contournement :
[`ukit.portail.verification`](../../blueprints/ukit-portail-verification.blueprint.json) demande au
CAS `renew=true`, ce qui le fait **redemander les identifiants même si un ticket vit**. La preuve
cesse d'être déduite d'une absence de session pour devenir demandée.

| | Avant | Après |
|---|---|---|
| Comment on prouve | on espère qu'un formulaire apparaisse | on **exige** qu'il apparaisse |
| Si une session vit | rien n'est prouvé, et on l'ignore | le CAS redemande quand même |
| Mauvais mot de passe | dépend du chemin | `LOGIN_FAILED`, toujours |

Vérifié contre le portail réel, les deux cas, **avec une session vivante** : bon mot de passe →
`LOGIN_SUCCESS` ; mauvais → `LOGIN_FAILED`, aucun émis.

Le fichier est **générique et embarqué** : `/login` est le chemin d'Apereo — Bordeaux le sert sous
`/cas` et y redirige en 308, l'INP à la racine — et les deux entrées viennent du catalogue. Une
précaution y est écrite : le `service` arrive **déjà encodé**, parce que le filtre `urlencode` existe
côté moteur Python et **pas** côté moteur embarqué. L'employer dans le fichier marcherait depuis un
poste et nulle part ailleurs — la même classe de piège que les pseudo-classes de Playwright au jalon
6-G.

### Le pendant obligatoire : la déconnexion ferme la session distante

Persister une session sans savoir la fermer serait une régression, pas une fonctionnalité : « se
déconnecter » effacerait le trousseau **en laissant un navigateur intégré authentifié** au compte
qu'on vient de retirer.

[`ukit.portail.deconnexion`](../../blueprints/ukit-portail-deconnexion.blueprint.json) navigue vers
`{{ inputs.cas }}/logout`. Trois choix s'y expliquent :

- **viser le CAS plutôt que supprimer un cookie local** : le serveur invalide le ticket pour de bon,
  là où une suppression locale laisse une session vivante qu'un autre client pourrait reprendre — et
  ça ne coûte aucune dépendance de plus ;
- **le fichier est générique et embarqué**, malgré son préfixe `ukit.portail.` : `/logout` est le
  chemin d'Apereo CAS, le même produit chez les deux établissements, et la racine arrive **en
  entrée** depuis le catalogue. Il ne déclare **aucun secret** : il n'a rien à authentifier ;
- **il s'exécute après l'effacement local, et il ne lève jamais.** L'inverse laisserait quelqu'un dont
  le portail ne répond pas *toujours connecté localement* — c'est-à-dire un bouton « Se déconnecter »
  qui ne déconnecte pas.

> **Limite mesurée le 2026-08-27, et elle vaut d'être écrite plutôt que découverte.** Fermer la
> session **du CAS** ne ferme pas celle **des services** déjà ouverts : `mondossierweb` garde son
> propre cookie, et le navigateur intégré peut donc encore l'atteindre après une déconnexion. Le
> ticket est bien invalidé — un service qu'on n'a pas encore ouvert redemandera une authentification —
> mais ceux qui l'étaient survivent.
>
> Fermer aussi les sessions de service demanderait soit de vider les cookies du navigateur, ce que ni
> le moteur ni ce dépôt n'exposent, soit de visiter la déconnexion propre à chaque service, ce qui
> serait une donnée de plus par établissement. Aucune des deux n'est faite ici, et la validation
> d'identifiants **ne repose plus dessus** depuis qu'elle demande `renew=true`.

## Le navigateur intégré

[`WebBrowserScreen.tsx`](../../src/features/Scolarite/screens/WebBrowserScreen.tsx) est une WebView
plein écran avec une barre d'action flottante glissable (retour, avant, rechargement, ouverture
externe, fermeture), pilotée par un geste Reanimated. **Ce n'est pas du scraping** : l'utilisateur la
pilote, elle ne devient pas un Blueprint.

Quatre points d'entrée nommés :

| `entrypoint` | Destination |
|---|---|
| `ent` | l'ENT de l'établissement |
| `email` | son webmail |
| `cas` | son authentification unifiée |
| `apogee` | ses résultats |

Les quatre adresses **viennent du catalogue** (colonne `services`) depuis le jalon
[6-G](../phase-6/6-g-etablissements.md). Elles étaient en dur ici, et c'était le dernier hôte
bordelais compilé dans un écran : un étudiant d'une autre fac s'y serait retrouvé sur le portail de
Bordeaux. Un point d'entrée que l'établissement ne déclare pas retombe sur le site de UKit — le repli
qui existait déjà pour un paramètre absent.

**Le script injecté franchit deux pages, et elles ne se ressemblent pas.**
`getPortalInjectedScript` scrute la page toutes les 100 ms (50 tentatives, soit 5 s).

**1. Le formulaire du CAS.** Si des identifiants sont enregistrés et qu'aucun refus n'est affiché, il
remplit et soumet. Sinon, il pose un écouteur sur la soumission pour **proposer d'enregistrer** les
identifiants saisis à la main.

**Ce n'est plus le chemin principal** depuis que la session persiste : le navigateur s'ouvre
normalement déjà authentifié, et cette branche ne voit même pas la page. Elle reste pour ce qu'une
session ne couvre pas — **un ticket CAS expiré**. C'est un filet, pas la règle.

**2. La page de choix d'établissement.** Moodle à Bordeaux ne passe pas par le CAS mais par
**Shibboleth**, et sa page d'entrée est une page de *découverte* : une liste de **56 établissements**
dans laquelle il faut trouver le sien avant que la moindre authentification commence. Une session
persistée n'y change rien — ce n'est pas une connexion, c'est un aiguillage — et c'est pourquoi cette
branche existe. Elle coche au passage « se souvenir pour cette session », sans quoi la page revient à
chaque service.

Elle **ne tape aucun secret** : elle choisit une entrée dans une liste et soumet. Sa garde est donc
**structurelle** plutôt que fondée sur l'URL, ce qui la rend portable à un autre WAYF : le select
`#userIdPSelection` doit exister **et** contenir exactement l'identité publiée pour cet
établissement. Sans identité publiée, elle ne fait rien — on ne devine pas la fac de quelqu'un dans
une liste de 56.

| | Identité Shibboleth | Parcours de Moodle |
|---|---|---|
| Bordeaux | `https://idp-ubx.u-bordeaux.fr/idp/shibboleth` | page WAYF, puis l'IdP |
| Bordeaux INP | `https://sso.bordeaux-inp.fr/idp/shibboleth` | **pas de WAYF** — droit sur son CAS avec `gateway=true`, donc la session persistée suffit |

L'identité vit dans le catalogue (`services.idp_shibboleth`) et **n'est pas une porte** : rien ne
s'ouvre à cette adresse. C'est ce que la page attend qu'on lui désigne.

Trois défauts y ont été corrigés le 2026-08-25, et aucun ne se voyait à la relecture :

- **la porte ENT menait à un hôte qui n'existe plus.** `ent.u-bordeaux.fr` **ne résout pas** —
  `NSURLErrorDomain -1003`, « A server with the specified hostname could not be found », à chaque
  ouverture et **y compris en production**. Le portail vit sur `intranet.u-bordeaux.fr`, qui rebondit
  sur le CAS avec son paramètre `service`. Le Blueprint du dossier visait déjà cet hôte pour
  l'annuaire, et sa propre description écrivait que *« l'hôte du portail historique ne résout plus »*
  — l'écran, lui, était resté sur l'ancien nom. Corrigé **par une publication de catalogue** ;

- **l'hôte était écrit en dur.** La garde testait `cas.u-bordeaux.fr`, donc le remplissage n'a
  **jamais** fonctionné pour un étudiant de Bordeaux INP, dont le CAS est `cas.bordeaux-inp.fr`.
  C'était le dernier hôte bordelais compilé dans un écran, du même genre que les onze que le jalon
  6-G a déterrés ; la racine vient désormais du catalogue ;
- **la détection d'erreur ne discriminait rien, et empêchait le remplissage.** Le script cherchait
  `.alert-danger`, `#msg.errors` et `.errors`. Or la mesure du 2026-08-09 dit deux choses : **il
  n'existe aucun `#msg`** sur ce CAS, et **`.errors` existe déjà vide** sur la page propre. Le
  troisième sélecteur répondait donc *toujours* — le script concluait « une erreur est affichée »,
  sautait le remplissage, et se contentait de poser son écouteur. Le seul nœud mesuré comme
  discriminant est `#loginErrorsPanel`, celui que les Blueprints emploient depuis 6-F.

Les identifiants y passent par `JSON.stringify` depuis le jalon 6-F : ils étaient interpolés entre
apostrophes simples, donc un mot de passe contenant `'` cassait le script — pas l'authentification,
**le script**, silencieusement. C'est la même classe de bug que la session supprime par construction,
et cet écran la portait aussi.

Le retour matériel Android est intercepté : il navigue dans l'historique de la WebView avant de
quitter l'écran, et le geste de retour de la pile est désactivé tant qu'un historique existe.

> **Capture attendue** — `scolarite-navigateur.png` : le navigateur intégré et sa barre d'action
> flottante.

## Sécurité

- Les identifiants vivent **uniquement** en SecureStore, chiffré par le trousseau de l'OS.
- Ils ne transitent par **aucun serveur tiers** : le moteur est embarqué, les requêtes partent de
  l'appareil, et seul le CAS de l'université les voit.
- Ils ne traversent **jamais la source d'un script** : le moteur les encode en JSON et les transmet
  par une communication corrélée avec l'agent injecté.
- Un Blueprint ne peut déclarer que les secrets que l'application lui ouvre
  (`ALLOWED_SECRETS`, [blueprints/index.ts](../../blueprints/index.ts)) — y compris un Blueprint
  publié à distance, **y compris un portail que l'application n'embarque pas**. C'est la borne du
  jalon 6-G : le préfixe décide de ce qui peut arriver, le périmètre de secrets décide de ce que ça
  peut réclamer. Les deux noms sont neutres vis-à-vis de l'établissement (`portail_user` /
  `portail_pass`) ; les **clés du trousseau, elles, n'ont pas bougé**, et personne n'a été déconnecté
  par le renommage.
- Les valeurs résolues sont **masquées** dans les événements et les messages d'échec.
- Les données personnelles récupérées ne quittent jamais l'appareil.
- L'accès à l'onglet est protégé par `BiometryGate`, avec repli sur le code de l'appareil. Son écran
  de garde a pris le vocabulaire partagé : il affichait un **cadenas emoji** de 48 points et un `#fff`
  en dur sur son bouton — deux règles du dépôt enfreintes au même endroit, et un rendu qui variait
  avec la police d'emoji du système.
- La déconnexion coupe la session en cours **avant** de supprimer les deux clés SecureStore.

## Où la biométrie est demandée, et où elle ne l'est pas

Audité le 2026-08-27, après deux incohérences trouvées à l'usage.

| Endroit | Demande ? | Pourquoi |
|---|:---:|---|
| L'onglet Scolarité | **oui**, une fois par lancement | il montre l'identité et la messagerie |
| La fiche du compte | **oui**, la **même** porte | elle montre davantage : INE, date de naissance, état civil, identifiants |
| Le formulaire de connexion | non | il n'y a rien à protéger avant d'avoir lu quoi que ce soit |
| L'écran de progression | non | transitoire, et il ne montre rien |
| Un établissement sans portail | non | il n'y a pas de compte |
| Révéler le mot de passe | **oui, à chaque fois** | c'est le seul geste qui dévoile un secret, et il ne se mutualise pas |

**Deux corrections, et la seconde fermait un contournement.**

`authPassedRef` était un `useRef` **dans** le composant : il survit aux rendus, pas aux
**démontages**. Or cette porte se démonte tout le temps — le tableau de bord la retire dès qu'un
parcours froid prend l'écran, et la remonte après. On redemandait donc une empreinte après chaque
actualisation du dossier, à quelqu'un qu'on venait d'identifier. Le drapeau vit désormais **au niveau
du module**, ce qui est ce que « une fois par session d'application » voulait dire depuis le début.

Et un module survit aussi d'un écran à l'autre, ce qui est le second effet voulu : **la fiche du
compte partage la porte du tableau de bord.** Elle s'ouvrait sans rien demander depuis les Réglages —
en montrant plus que l'onglet gardé — ce qui faisait du verrou un théâtre qu'il suffisait de
contourner par un autre chemin. Franchir l'une ouvre l'autre : on ne paie pas une seconde demande,
on ferme une porte dérobée.

## La biométrie se demande en deux temps

Sur iPhone, l'application demandait le **code de l'appareil sans jamais tenter Face ID**, alors que
l'empreinte se déclenchait normalement sur Android. Les deux appels — la porte de l'onglet et la
révélation du mot de passe — passaient `disableDeviceFallback: false`, ce qui demande à iOS la
politique `deviceOwnerAuthentication` : celle qui **autorise** le système à court-circuiter la
biométrie. C'est une décision d'iOS, pas un défaut de la bibliothèque, et aucune option ne la rend
prévisible.

[`shared/biometrie`](../../src/shared/biometrie/index.ts) demande donc les deux politiques dans
l'ordre : `disableDeviceFallback: true` d'abord — `deviceOwnerAuthenticationWithBiometrics`, où iOS ne
peut plus court-circuiter — puis, sur échec, une seconde demande **avec** le repli, pour que le code
reste atteignable.

**Deux temps ne veut pas dire deux fenêtres imposées.** Quelqu'un qui appuie sur *Annuler* a décidé :
lui ouvrir aussitôt le clavier du code serait une seconde demande qu'il n'a pas faite, c'est-à-dire
exactement le comportement qu'on reproche à iOS dans l'autre sens. C'est
[`doitProposerLeCode`](../../src/shared/biometrie/decision.ts) qui tient cette frontière, et elle vit
dans un fichier **sans aucune dépendance** pour être vérifiable sans appareil : `expo-local-authentication`
tire `react-native`, donc tout module qui l'importe est injouable sous Node.

| Ce que rend `error` | Ce qu'on fait |
|---|---|
| `user_cancel`, `app_cancel`, `system_cancel` | **rien** : la personne, l'application ou le système a interrompu |
| `user_fallback` | le code — c'est le cas nominal, « Utiliser le code » |
| `authentication_failed`, `lockout` | le code : le visage n'a pas été reconnu, ou le système n'accepte plus que lui |
| `not_enrolled`, `passcode_not_set`, `not_available` | le code : rien n'est enrôlé, ou Face ID est refusé à l'application |
| `timeout`, `unable_to_process`, `no_space`, `invalid_context`, `unknown` | le code : la biométrie n'a pas pu se prononcer |

| `missing_usage_description` | le code : `NSFaceIDUsageDescription` manque à l'`Info.plist` du conteneur qui exécute |

> **Attention en lisant d'anciennes notes** : `biometry_not_available` et `biometry_lockout`, qui
> circulent dans la documentation d'iOS et dans les versions anciennes de la bibliothèque,
> **n'existent pas** en version 17. Ce sont `not_available` et `lockout`.

Un code ajouté à la **déclaration** de la bibliothèque casse la compilation plutôt que de tomber en
silence dans le repli par défaut : `index.ts` affecte le `error` de la bibliothèque dans un champ du
type recopié. Ce garde a une limite, et elle a servi dès la première campagne de sonde : il ne voit
que la déclaration. `missing_usage_description` est émis par la couche **native** et n'est pas dans le
`.d.ts` de la version 17 — mesuré sur iPhone le 2026-08-22. **Ce qu'une sonde rapporte prime sur ce
qu'un type déclare.**

### Le verdict de la première campagne, et ce qu'il ne dit pas

Mesuré sur iPhone le 2026-08-22, sous Expo Go : `matériel` et `enrôlé` sont vrais, et le premier temps
échoue immédiatement sur **`missing_usage_description`** — sans ouvrir la moindre fenêtre. Le code
natif l'explique : sur la politique biométrique seule, si la clé d'usage manque, il **résout l'échec
sans jamais appeler `evaluatePolicy`**, parce qu'appeler planterait. C'est exactement pour ça qu'on ne
voit jamais Face ID essayer.

Le cas ne se produit **que** sur `disableDeviceFallback: true`. Avec le repli, la bibliothèque va
directement à `deviceOwnerAuthentication`, qui présente le code : c'est pourquoi le symptôme d'origine
n'avait pas d'explication visible.

**Ce verdict ne dit rien de l'application réelle.** Le conteneur qui exécute est Expo Go, avec son
propre `Info.plist`. Celui de UKit porte la clé, par **deux** chemins vérifiés dans
[`app.config.ts`](../../app.config.ts) — `ios.infoPlist.NSFaceIDUsageDescription` et l'option
`faceIDPermission` du greffon `expo-local-authentication`. La confirmation demande donc un
`eas build --profile development` ; le correctif, lui, est celui que ce verdict appelle.

**Un appareil sans aucun verrou ouvre la porte**, et c'est une décision. Sans code ni biométrie,
aucune demande ne peut jamais aboutir : l'écran d'avant montrait un bouton « Réessayer » qui ne pouvait
pas marcher, et l'onglet devenait inatteignable pour toujours. Cette porte est un verrou
**d'interface** — le trousseau, lui, n'exige pas d'authentification
([`SecureStoreService`](../../src/shared/services/SecureStoreService.ts)) — donc bloquer ne protégeait
rien que l'appareil ne laisse déjà voir. Le jour où `requireAuthentication` sera posé sur SecureStore,
cette décision devra être rouverte.

Le menu de développement porte un panneau **Biométrie** qui affiche les capacités de l'appareil et le
`{success, error, warning}` **brut** des deux politiques, jouables côte à côte : le symptôme ne
distingue pas ses causes, et sans ce panneau on corrige à l'aveugle ([qualite.md](../qualite.md)).

## Les trois gestes du compte, et pourquoi ils ne se ressemblent pas

L'écran du compte propose d'**actualiser** le dossier, de **ressaisir** ses identifiants et de **se
déconnecter**. L'ordre porte du sens — actualiser ne perd rien, ressaisir ne perd que le mot de passe
gardé, se déconnecter efface tout — et depuis la passe de finition, l'habillage le porte aussi : les
deux premiers sont `tonal`, le troisième `destructive`
([theme.md](../theme.md#les-décisions-durables)).

Les trois étaient auparavant de simples **cadres à fond transparent**, distingués par la seule couleur
de leur filet. C'était le seul endroit de l'application où une action ne portait pas de surface, et
sur le fond de page ils disparaissaient : rien ne disait lequel des trois coûtait quelque chose.

**Deux des trois demandent une confirmation**, et pas pour la même raison. La déconnexion parce
qu'elle efface le trousseau et l'identité déjà lue ; l'actualisation parce qu'elle **rejoue une
connexion complète** — plusieurs secondes d'écran de progression, sans retour possible une fois
lancée. Le coût n'est pas toujours une destruction ([theme.md](../theme.md#les-décisions-durables)).
L'explication du geste vit dans ce dialogue, au moment de décider, et non en ligne d'aide sous le
bouton : personne ne la lisait, et elle cassait le rythme des trois actions.

Deux défauts de cet écran, relevés sur capture, valaient d'être corrigés en même temps : il
s'intitulait **« Se déconnecter »** alors qu'il montre le profil, le dossier, les identifiants *et*
trois actions — il prend le nom de la ligne qui l'ouvre, « Compte universitaire » — et le libellé du
prénom était **écrit en dur, en français**, sur un écran qui s'affiche dans les trois langues. Sa
ligne disparaît désormais faute de donnée, au lieu d'afficher un libellé vide avec son filet.

## Ce que la connexion trouve en plus, et qu'elle propose

Une connexion universitaire traverse des pages qui en savent bien plus que l'état civil. Deux
lectures s'ajoutent au dossier depuis le 2026-08-24, une par établissement, et **aucune des deux ne
s'applique toute seule** :

| Établissement | Ce que la page porte | Ce qu'on en fait |
|---|---|---|
| Université de Bordeaux | les **appartenances** de l'annuaire, dont les UE inscrites | pré-remplir les filtres |
| Bordeaux INP | la fiche que **ADE présélectionne**, c'est-à-dire l'emploi du temps personnel | le proposer comme groupe |

### Le piège du filtre, et pourquoi on pré-remplit le complément

Un filtre d'UE **masque** : `CourseManager.filterCourse` rend `false` quand la liste contient le code
du cours. Pré-remplir cette liste avec les UE **inscrites** cacherait donc à l'étudiant exactement
ses propres cours — le planning se viderait, et rien ne dirait pourquoi. Ce qu'on propose est le
**complément** : les UE que le planning du groupe porte et auxquelles il n'est pas inscrit.

Inverser le filtre en liste positive a été envisagé puis écarté. Il y a deux intentions distinctes —
*« cette UE n'est pas la mienne »*, qui est un fait du dossier, et *« cette UE est la mienne mais je
ne veux pas la voir »*, qui est une décision personnelle — et une liste unique ne peut pas porter les
deux. Pré-remplir garde le geste manuel identique dans les deux sens, ne migre aucune donnée
persistée, et laisse la refonte des réglages libre de ses choix.

### Le moment, qui n'appartient à aucun écran

Le parcours d'accueil demande le compte **avant** le groupe (`intro > préférences > établissement >
compte > edt`) : à la fin de la lecture du dossier, il n'existe encore aucun planning, donc aucune UE
à comparer. La question attend donc que le planning ait livré ses UE, et
[`PropositionsDecision`](../../src/features/Scolarite/services/PropositionsDecision.ts) a trois
réponses et non deux — `rien`, `attendre`, `demander`. Confondre les deux premières ferait taire la
proposition pour toujours, au moment précis où elle est la plus utile.

L'emploi du temps personnel, lui, ne dépend d'aucun planning : c'est **lui** qui remplit l'étape des
groupes, et l'attendre serait circulaire. Quand les deux sont là, on ne demande **qu'une fois**, avec
tout ce qu'il y a à demander : deux dialogues à la suite pour une même lecture se lisent comme un
défaut.

La modale est donc rendue par `rootContainer`, à côté du menu flottant : elle doit pouvoir apparaître
pendant le parcours d'accueil — qui est rendu *à la place* de la navigation — comme au-dessus de
n'importe quel onglet. Aucun écran ne la porte, donc aucun écran n'a besoin de savoir qu'elle existe.

### L'identifiant ADE vaut un secret

L'export anonyme d'ADE accepte **n'importe quel** identifiant de ressource et rend l'emploi du temps
correspondant, sans authentification : mesuré le 2026-08-22, `anonymous_cal.jsp?resources=4087` rend
le planning nominatif d'un étudiant. Deux conséquences, et les deux sont écrites dans le code :

- la lecture **refuse un identifiant qui n'est pas un nombre** plutôt que de proposer une valeur
  douteuse — un identifiant mal lu afficherait, sans la moindre erreur, le planning de quelqu'un
  d'autre ;
- il vit au **trousseau**, cloisonné par établissement comme le lien d'abonnement et la session, et
  la réinitialisation seule l'efface.

Il est ensuite **fusionné au référentiel du catalogue** par `sourceEdt()`, en tête de liste : le
groupe personnel se résout alors comme un autre, et ni les services, ni les écrans, ni les favoris
n'apprennent qu'il existe ([planning.md](planning.md#lemploi-du-temps-personnel)).

### Le portail de l'INP n'est pas embarqué : sans publication, il ne change pas

`ukit.portail.bordeaux.dossier` est **dans le binaire** ; `ukit.portail.bordeaux-inp.dossier` ne l'est
pas — il vit sous le préfixe réservé et arrive **uniquement par le manifeste**
([6-G](../phase-6/6-g-etablissements.md)). C'est la règle de la phase, et elle a une conséquence
pratique qui se paie une fois par jalon si on l'oublie : **modifier le fichier de l'INP dans le dépôt
ne change rien sur l'appareil.** Tant que la publication n'a pas eu lieu, le téléphone joue la version
publiée, qui ne connaît pas les sorties qu'on vient d'ajouter — et la fonctionnalité paraît morte
alors qu'elle n'a jamais été livrée.

Bordeaux n'a pas ce problème : l'embarqué gagne tant que le publié n'est pas d'une version
strictement supérieure, donc une correction locale s'y teste au rechargement.

### La proposition d'UE ne se contente pas de ce qui a été affiché

La liste des UE rencontrées (`PlanningDataManager.getAvailableUEs`) ne se remplit qu'**à mesure qu'on
affiche des journées**, et elle repart vide à chaque lancement — elle n'est pas persistée. S'en
contenter rendait la proposition **partielle par construction** : on aurait proposé de masquer une UE
étrangère aujourd'hui, une autre la semaine suivante. Masquer un tiers de ce qu'il fallait est pire
que ne rien masquer, parce que l'étudiant croit le ménage fait.

Mesuré le 2026-08-24 sur `INF601A5` : le **lundi 12 janvier** ne porte que 4 UE, toutes suivies par
l'étudiant — complément vide, donc aucune question, à juste titre. Il faut la **semaine** entière pour
voir apparaître `4TIN606U` et `4TTVP32U`, les deux seules qu'il ne suit pas.

Quand une proposition d'UE attend, l'écran demande donc **une fois** l'année entière du groupe, par le
run qui sert déjà la synchronisation calendrier (`fetchCalendarForSynchronization`), et verse le
résultat par la porte ordinaire — ce qui profite aussi à la liste de suggestions des réglages. Un
échec ne se dit pas : on retombe sur ce que l'écran a déjà chargé.

### La sonde, parce qu'« aucun dialogue » n'est pas un symptôme

Quatre situations produisent le même écran — aucune question — et ne se distinguent pas à l'œil :
l'annuaire n'a rien rendu, l'étudiant suit toutes les UE de son planning, le planning n'est pas encore
chargé, ou la proposition a déjà été appliquée. Le menu flottant porte donc un panneau **Dossier**
([`ModMenuPropositions`](../../src/shared/ui/ModMenuPropositions.tsx)) qui lit une trace posée à
**chaque** calcul de décision, y compris quand il n'y a rien à demander. Il donne l'arbre en entier :

| Ce que le panneau dit | Ce que ça veut dire |
|---|---|
| *aucune lecture depuis le démarrage* | aucun parcours froid n'a eu lieu — « Actualiser le dossier » en rejoue un |
| `UE inscrites lues : 0` | la lecture de l'annuaire est revenue vide : la page n'était pas arrivée, ou elle a changé |
| `décision : attendre` | le planning n'a pas encore livré ses UE — ouvrir l'onglet Planning |
| `décision : rien`, complément 0 | il n'y a réellement rien à proposer |
| `décision : demander` | le dialogue doit être à l'écran |

C'est la leçon de la campagne biométrique, appliquée avant d'en payer le prix une seconde fois : une
sonde doit garder la trace de **chaque** étape, pas seulement du verdict final.

**Le piège que cette sonde a été écrite pour rendre visible est réel.** La lecture de l'annuaire est
un bonus qui ne doit jamais faire échouer la connexion, donc elle utilise `wait` et `as: "list"` — ni
l'un ni l'autre ne peut échouer. Le revers est qu'elle dégrade **en silence** : une page pas encore
arrivée rend une liste vide, indistinguable d'un compte sans UE. L'attente était de 1500 ms ; la
navigation vers l'annuaire, mesurée depuis un poste filaire le 2026-08-24, prend à elle seule
**2834 ms**, et un moteur de WebView peut de surcroît rendre la main à la fin d'une redirection
intermédiaire du SSO. Elle est passée à 6000 ms.

### Ce qui attend une réponse est gardé — et pourquoi la décision inverse était fausse

La première version ne persistait rien : une proposition vivait le temps de la session qui avait lu le
dossier, une nouvelle lecture la reproposait, et l'écart — fermer l'application entre la lecture et le
premier chargement du planning — paraissait étroit.

**Il ne l'est pas, et c'est une mesure qui l'a montré.** Les UE à masquer se calculent contre le
planning du groupe, or le planning d'une université est **vide tout l'été** : mesuré le 2026-08-24 sur
le groupe `INF601A5`, 33 cours la semaine du 12 janvier, **zéro** les semaines du 24 août et du
14 septembre. C'est exactement la période où l'on installe l'application. Quelqu'un qui se connecte en
août lit donc son dossier alors qu'il n'y a rien à comparer — et sans persistance, la proposition
était perdue au prochain démarrage, **définitivement**, puisque les lancements suivants sont des
parcours *chauds* qui ne relisent pas le dossier.

Ce qui attend une réponse est donc gardé au trousseau
([`PropositionsEnAttente`](../../src/features/Scolarite/services/PropositionsEnAttente.ts), clé
`UKIT_PROPOSITIONS`), cloisonné par établissement comme le reste. Trois règles, et elles suffisent :

- une entrée disparaît quand l'étudiant a **tranché** — accepté ou refusé — et pas avant ;
- elle est **redécidée** à chaque lancement contre le planning et les filtres du moment : une
  proposition qui n'a plus lieu d'être ne s'affiche pas, elle s'éteint toute seule. C'est ce qui
  répond au risque qui avait motivé l'inverse — voir ressurgir six mois plus tard une proposition
  périmée ;
- la **déconnexion** l'efface : ce qui attendait appartenait à ce compte, et le garder poserait la
  question au suivant avec les UE du précédent. Un changement d'établissement, lui, n'y touche pas —
  chaque fac garde la sienne.

## Décisions de conception

**Une WebView plutôt qu'un client HTTP.** Le CAS repose sur des redirections, des cookies de session
et du JavaScript ; les pages cibles sont rendues côté client (GWT pour le dossier, framework
propriétaire pour le webmail). Un client HTTP devrait réimplémenter un navigateur.

**Un user-agent de Chrome desktop**, déclaré dans les deux fichiers. Le webmail sert `/modern/` aux
UA mobiles, un DOM entièrement différent où le sélecteur du compteur **n'existe pas**. Ce n'est pas
un raffinement, c'est ce qui rend la page atteignable depuis un téléphone.

**Une pause explicite après le clic de soumission**, 8 s pour le dossier et 15 s pour la messagerie.
L'authentification unifiée enchaîne plusieurs sauts, puis le client pose son propre fragment, et
**une opération émise pendant cette cascade se perd en silence** sur un appareil. C'est un
contournement d'une limite du moteur, écrit dans le fichier plutôt que déguisé en délai généreux —
un contournement qu'on peut lire est un contournement qu'on saura retirer.

**Une lecture qui suit une attente porte un délai court** (5 s). Elle n'a rien à attendre : sa
présence vient d'être prouvée. Un budget court garantit que la page réponde avant l'appelant, donc
qu'un échec reste lisible au lieu d'être un silence rapporté comme « la page a changé ».

**Une garde sur `#loginErrorsPanel`** juste après la pause. Ce panneau est absent de la page de
connexion propre et présent dès que le CAS refuse — mesuré, contrairement à `#msg2` et `.errors` qui
existent déjà vides. Sans elle, un mot de passe faux coûterait le plafond entier du sélecteur
suivant : **41 s mesurées, contre 13 s avec**. Elle est posée *après* la pause, donc hors de la
cascade de navigations, ce qui est ce qui la rend sûre.

**Le verrou biométrique n'est demandé qu'une fois par session d'application** (`authPassedRef`, une
référence qui survit aux rendus). Le redemander à chaque focus d'onglet serait inutilisable. Il
protège l'accès à l'écran, pas la session : les deux sont indépendants et doivent le rester.

## Vérifier

Les sondes se jouent **sur appareil**, avec un compte universitaire réel, et le chemin dégradé fait
partie de la définition de « terminé ». **Pas de mode avion** : il coupe aussi Metro. On dégrade en
pointant le Blueprint embarqué sur un hôte injoignable puis en rechargeant, ce qui est d'ailleurs
plus précis — ça distingue `unavailable` de `rejected` et de `data`.

- **Premier login** : l'écran de progression parcourt les quatre étapes ; le prénom, le numéro
  étudiant et le compteur de messages s'affichent.
- **Relancer l'application** : parcours « chaud », affichage immédiat, seule la messagerie se
  rafraîchit.
- **Mot de passe contenant `'`, `"` et `^`** : fonctionne. C'est la sonde du jalon.
- **Identifiants erronés** : message clair, aucun enregistrement, possibilité de réessayer.
- **Sélecteur GWT volontairement faux** : l'`assert` déclenche, et **rien d'identitaire n'est écrit**.
- **Sélecteur du compteur faux** : échec `MESSAGERIE_INDISPONIBLE`, distinct de l'échec de login.
- **`vars.dossier` sur `https://127.0.0.1:1/`** : « Le portail de l'université ne répond pas », **avec**
  Réessayer. Une adresse qui refuse la connexion, pas un nom qui ne résout pas — voir les limites.
- **Arrière-plan pendant la session** : pas de WebView orpheline ; la session reprend au retour.
- **Deux sessions coup sur coup** : la seconde est refusée, la première va au bout.
- **Correction publiée** : `npm run blueprints:publish` après avoir corrigé un sélecteur — la session
  repart sans réinstaller l'application.
- **Formation** : après un parcours froid, la rangée « Formation » porte l'intitulé de l'inscription
  courante et son année, **des deux côtés**. Un dossier lu avant le 2026-08-25 ne la porte pas : c'est
  le comportement voulu, et « Actualiser mon dossier » la fait apparaître.
- **Libellé déplacé** : changer `Prénom et Nom` en `Prénom et Nom X` dans le Blueprint embarqué —
  l'extraction doit **échouer bruyamment** (`data`, « Contenu introuvable ») et non écrire une valeur
  décalée. C'est la sonde qui remplace l'ancien test de décalage GWT.
- **Valeur vide sous un libellé présent** : l'`assert` déclenche, et **rien n'atteint le trousseau**.
- **Documents** : ajouter une pièce, la rouvrir, la supprimer ; relancer l'application, elle est
  toujours là. Ajouter **deux fois le même nom** — la seconde est suffixée, la première n'est pas
  écrasée.
- **Documents sans compte** : se déconnecter — la section reste, et aucune biométrie n'est demandée.
- **Documents chez « Autre université »** : basculer dessus — l'encart dit que l'université n'est pas
  reliée, **et les documents restent en dessous**. C'est la sonde de cette session : avant, l'onglet
  était entièrement mort pour ces étudiants.
- **Verrou biométrique** : quitter l'onglet et y revenir dans la même session — aucune nouvelle
  demande ; relancer l'application — la demande revient.
- **Navigateur intégré** : ouvrir le webmail depuis la ligne de messagerie ; le formulaire CAS doit se
  remplir seul.
- **Déconnexion** : l'écran de connexion revient, aucune donnée ne subsiste.
- **Établissement sans portail** : basculer sur « Mon université n'est pas dans la liste » — l'onglet
  doit dire « Cette université n'est pas encore reliée à UKit », **sans formulaire** et sans bouton
  Réessayer. C'est la sonde du jalon 6-J.
- **Second établissement** : basculer sur Bordeaux INP dans les réglages, se connecter avec un compte
  de cette école — le parcours froid va au bout en une douzaine de secondes, l'identité s'affiche, et
  **aucune ligne de messagerie n'apparaît**. Puis revenir à Bordeaux : la session est à refaire, ce
  qui est le comportement voulu.

## Deux impasses fermées au jalon 6-K

- **Un mot de passe changé à l'université** produisait un `LOGIN_FAILED`, à juste titre non
  réessayable — mais l'écran de connexion n'apparaît que si le trousseau est **vide**, et il ne
  l'était pas. Deux chemins mènent désormais au formulaire, parce qu'il y a deux façons de tomber
  dans l'impasse : l'écran d'échec plein porte une **action** « Ressaisir mes identifiants », et la
  **ligne de messagerie** — le seul endroit où l'échec se montre quand une identité a déjà été lue,
  `echecBloquant` exigeant `coldData === null` — y mène aussi quand on la touche. La condition vit
  dans [`demandeUneRessaisie`](../../src/features/Scolarite/services/ScolariteMapping.ts), à côté de
  la table des codes du portail.
- **Ressaisir ne déconnecte pas.** L'écran du compte s'ouvre en mode `ressaisie`, ou porte un bouton
  dédié. Vider le trousseau effacerait aussi l'identité déjà lue et obligerait à retaper
  l'identifiant, pour un mot de passe qui a changé tout seul.
- **Le mode de session se déduisait** de la présence des données froides, sans moyen de forcer :
  rafraîchir une identité périmée obligeait à se déconnecter. `rafraichirDossier()` relance un
  parcours froid depuis l'écran du compte, et n'efface les données froides **que si la session
  démarre** — sinon on les perdrait pour rien.

Les deux sont consignées dans [defauts-fonctionnels.md](../defauts-fonctionnels.md).

## Limites connues

- **Le parcours froid s'est allongé** — d'environ 40 s à 46 s à Bordeaux, de 12 s à 24 s à l'INP.
  C'est le prix de la formation et, à l'INP, de l'INE : chaque vue de plus est une navigation et une
  pause de 6 s, calibrée pour un téléphone en cellulaire et non pour un poste filaire. Le délai n'est
  payé **qu'au premier login**, et les lancements suivants sont des parcours chauds.
- **Un mot de passe faux coûte environ 13 s.** Le script d'origine lisait le message d'erreur du CAS
  en deux secondes. Descendre plus bas demanderait d'interroger la page pendant la cascade de
  navigations qui suit la soumission — là où une opération se perd en silence, ce qui mettrait le
  chemin **nominal** en risque pour améliorer le chemin d'erreur.
- **Une source injoignable n'est jamais rangée en `unavailable`**, et c'est une limite du moteur
  mesurée sur appareil. Une adresse qui **refuse la connexion** fait rendre à iOS sa propre page
  d'erreur : l'agent s'y injecte et s'annonce, donc la navigation « réussit », et c'est l'attente
  suivante qui échoue — en `blocked`, avec le nom que le Blueprint lui a donné. Un nom qui **ne
  résout pas** ne produit aucun document, et le run retombe en `engine`, c'est-à-dire « un problème
  de notre côté » affiché à quelqu'un dont le portail est simplement en panne.

  L'application corrige la conséquence, pas la cause : `CAS_INDISPONIBLE` et
  `MESSAGERIE_INDISPONIBLE` sont déclarés **réessayables** dans
  [`ScolariteMapping.ts`](../../src/features/Scolarite/services/ScolariteMapping.ts), alors que leur
  famille ne l'est pas. Un portail muet répondra peut-être dans dix secondes, et lui refuser un
  bouton Réessayer serait faux ; `LOGIN_FAILED`, lui, reste non réessayable, parce que rejouer le
  même mot de passe donnera le même refus. Le cas `engine`, en revanche, **reste sans bouton** — il
  faudrait pour cela que le moteur distingue « aucun document » de « bug interne », et c'est chez lui
  que ça se traite, pas ici ([note de portée de la Phase 6](../phase-6/README.md)). Le défaut est
  ouvert et documenté chez Aetherius, avec sa reproduction et sa direction de correctif, dans la
  section « Limites connues » de `docs/embedded.md` — il se corrigera par une **release du moteur**,
  pas par une publication de Blueprint.
- **La ligne de messagerie ne propose pas de réessayer.** Elle *dit* l'échec ; la reprise se fait au
  retour au premier plan ou au lancement suivant. Un bouton de plus sur une rangée qui ouvre déjà le
  webmail au toucher rendrait la cible ambiguë.
- **Le parcours chaud dure une vingtaine de secondes**, dont 15 s de pause fixe imposée par la
  cascade d'authentification du webmail. Le compteur de messages arrive donc après l'ouverture de
  l'onglet, pas avec elle.
- **Un prénom composé de deux prénoms n'en montre que le premier.** C'est le bon résultat pour une
  salutation ; l'état civil complet reste visible dans les réglages du compte.
- **Le compteur peut valoir `null`.** `as: "number"` rend un entier ou rien ; un libellé sans
  parenthèses vaut `0`, une boîte absente vaut « on ne sait pas ». Les deux ne s'affichent pas
  pareil, et le test [`ScolariteMapping.test.ts`](../../src/features/Scolarite/services/ScolariteMapping.test.ts)
  fige la distinction.
- **Les notes ne sont pas extraites, et ce n'est plus faute de savoir où elles sont.** La sonde du
  2026-08-25 les a trouvées des deux côtés, dans `mondossierweb` — la porte Apogée les couvre en
  attendant, à Bordeaux. Elles font l'objet de leur propre session, pour une raison de vérifiabilité
  et non de difficulté ([Ce qui n'est pas récupérable](#ce-qui-nest-pas-récupérable-et-pourquoi)).
- **Les documents étudiants ne se récupèrent pas tout seuls**, et deux obstacles s'ajoutent au lieu
  de s'annuler : un Blueprint ne sait pas écrire un fichier binaire, **et** les PDF que Bordeaux INP
  publie portent une URL régénérée à chaque rendu de page. Lever le premier ne suffirait donc pas.
- **Une pièce ajoutée s'ouvre par la feuille de partage du système**, pas dans l'application. Afficher
  un PDF soi-même demanderait une dépendance de rendu pour refaire, moins bien, ce que le système
  fait déjà. Le fichier ne quitte pas l'appareil tant que l'utilisateur ne choisit pas une
  destination distante — ce que la feuille lui permet, et qui est sa décision.
- **Rien ne borne le volume des documents.** Ni nombre, ni taille totale : le répertoire privé de
  l'application est compté dans son stockage, et une pièce oubliée le reste. Un garde-fou demanderait
  de décider quoi supprimer à la place de l'utilisateur.
- **Le numéro étudiant de Bordeaux INP est lu par position** dans le bandeau latéral, faute d'un
  libellé pour l'ancrer — la seule fragilité positionnelle de ce portail. L'`assert` sur les libellés
  de l'état-civil est ce qui la garde : un décalage du bandeau accompagnerait une refonte de la page,
  donc de ces libellés.
- **Pas de parité automatisée** pour ce module, et c'est assumé : elle demanderait des identifiants
  réels dans un harnais.
- **Un échec de connexion depuis l'accueil ne se voit qu'après coup.** Le formulaire affiche bien son
  message d'erreur, mais « Plus tard » et un succès mènent au même écran suivant : quelqu'un qui
  avance sans lire n'apprend qu'en ouvrant l'onglet Scolarité que sa session n'est pas partie. C'est le
  prix de ne pas bloquer l'accueil sur une panne de portail, et c'est le bon arbitrage — mais il est
  écrit ici plutôt que découvert.
- **La session rallonge le splash de démarrage.** `CredentialsProvider` enveloppe toute la pile
  ([`StackNavigator.tsx`](../../src/shared/navigation/StackNavigator.tsx)) et lance la session dès
  que le trousseau a rendu des identifiants, donc **à chaque lancement**. Le comportement est
  antérieur à la Phase 6 et reproduit à l'identique sur `master` ; le jalon 6-F change **comment** la
  session tourne, pas **quand** elle démarre. Le raccourcir demande de retarder la session jusqu'à la
  fin du splash, ou de la déclencher à l'entrée dans l'onglet — une décision de produit (on perdrait
  le compteur de messages à jour dès l'ouverture), pas un correctif technique.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`services/CredentialsContext.tsx`](../../src/features/Scolarite/services/CredentialsContext.tsx) | contexte et état de session : trousseau, mode froid/chaud, progression, échec, annulation |
| [`services/ScolariteSession.ts`](../../src/features/Scolarite/services/ScolariteSession.ts) | la séquence de runs : quels Blueprints, dans quel ordre, et le verrou d'un run navigateur à la fois |
| [`services/ScolariteMapping.ts`](../../src/features/Scolarite/services/ScolariteMapping.ts) | la projection des sorties vers les écrans, et la table des échecs nommés |
| [`services/ScolariteMapping.test.ts`](../../src/features/Scolarite/services/ScolariteMapping.test.ts) | ce que cette projection doit tenir |
| [`services/PropositionsDossier.ts`](../../src/features/Scolarite/services/PropositionsDossier.ts) | ce que le dossier a livré en plus de l'identité : UE inscrites, emploi du temps personnel |
| [`services/PropositionsDecision.ts`](../../src/features/Scolarite/services/PropositionsDecision.ts) | ce qu'on en demande, et **quand** — le complément des UE, jamais les UE inscrites |
| [`components/PropositionsModal.tsx`](../../src/features/Scolarite/components/PropositionsModal.tsx) | la confirmation, rendue par `rootContainer` pour exister aussi pendant l'accueil |
| [`screens/ScolariteDashboard.tsx`](../../src/features/Scolarite/screens/ScolariteDashboard.tsx) | écran d'onglet : aiguillage entre connexion, chargement, échec et tableau de bord |
| [`screens/CredentialsSettingsScreen.tsx`](../../src/features/Scolarite/screens/CredentialsSettingsScreen.tsx) | réglages du compte : informations enregistrées, déconnexion — et, **sans compte, le formulaire de connexion** plutôt qu'une fiche vide |
| [`screens/WebBrowserScreen.tsx`](../../src/features/Scolarite/screens/WebBrowserScreen.tsx) | navigateur intégré : points d'entrée, historique, retour matériel, enregistrement d'identifiants |
| [`components/WebBrowserComponents.tsx`](../../src/features/Scolarite/components/WebBrowserComponents.tsx) | barre d'action flottante, modale d'enregistrement, et le script injecté : formulaire CAS **et** page de choix d'établissement |
| [`components/ScolariteLoginView.tsx`](../../src/features/Scolarite/components/ScolariteLoginView.tsx) | formulaire de connexion et explication du traitement des données. Partagé avec le [parcours d'accueil](onboarding.md), où il porte en plus une sortie « Plus tard » ([architecture.md](../architecture.md#dépendances-entre-features)) |
| [`components/ScolariteLoadingScreen.tsx`](../../src/features/Scolarite/components/ScolariteLoadingScreen.tsx) | écran de progression du parcours froid, étape par étape |
| [`components/BiometryGate.tsx`](../../src/features/Scolarite/components/BiometryGate.tsx) | verrou biométrique, une demande par session d'application |
| [`shared/biometrie/decision.ts`](../../src/shared/biometrie/decision.ts) | après un échec, propose-t-on le code ? Sans dépendance, donc jouable sous Node |
| [`shared/biometrie/index.ts`](../../src/shared/biometrie/index.ts) | la séquence en deux temps, les capacités de l'appareil, et la politique d'avant pour la sonde |
| [`components/GreetingBlock.tsx`](../../src/features/Scolarite/components/GreetingBlock.tsx) | salutation, date du jour, détection d'anniversaire |
| [`components/MailboxRow.tsx`](../../src/features/Scolarite/components/MailboxRow.tsx) | ligne de messagerie : compteur de non-lus, chargement, et échec du parcours chaud |
| [`components/PageScolarite.tsx`](../../src/features/Scolarite/components/PageScolarite.tsx) | le corps défilant : l'encart d'état, puis les trois sections |
| [`components/EncartSession.tsx`](../../src/features/Scolarite/components/EncartSession.tsx) | l'état de la session **en tête de page** : portail absent, pas de compte, échec |
| [`components/DossierSection.tsx`](../../src/features/Scolarite/components/DossierSection.tsx) | « Ton dossier » : formation, numéro étudiant, fraîcheur de la lecture |
| [`components/ServicesSection.tsx`](../../src/features/Scolarite/components/ServicesSection.tsx) | « Tes services » : la messagerie et les portes, toutes issues du catalogue |
| [`components/DocumentsSection.tsx`](../../src/features/Scolarite/components/DocumentsSection.tsx) | « Tes documents » : la liste locale, l'ajout, la suppression |
| [`components/LigneScolarite.tsx`](../../src/features/Scolarite/components/LigneScolarite.tsx) | le vocabulaire de rangées de l'onglet : un groupe encadré, ses lignes, son compteur |
| [`components/ConfirmationScolarite.tsx`](../../src/features/Scolarite/components/ConfirmationScolarite.tsx) | le dialogue de confirmation, partagé par les trois gestes qui en demandent un |
| [`services/DocumentsService.ts`](../../src/features/Scolarite/services/DocumentsService.ts) | les pièces locales : lister, ajouter, supprimer — dans le répertoire privé de l'application |
| [`hooks/useDocuments.ts`](../../src/features/Scolarite/hooks/useDocuments.ts) | leur état d'écran, relu **au focus** et non au montage — l'onglet ne se démonte jamais |
