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

## Ce que la page doit montrer

> **Décidé le 2026-08-13, pour la v6.** L'onglet ne montre aujourd'hui qu'une salutation et une ligne
> de messagerie — le reste de l'écran est vide. Cette section dit ce qu'il portera, et sert de cadrage
> à la session de refonte du volet 2 ([6-K](../phase-6/6-k-socle-visuel.md)). Elle décrit une **première
> version assumée**, pas un état final : ce qui manque est écrit plus bas plutôt que promis.

### Trois natures, trois sections — et ne pas les mélanger

L'erreur qui guette cet écran est d'aligner six tuiles qui se ressemblent alors qu'elles ne font pas
la même chose. Une grille de widgets indifférenciés se lit comme un brouillon ; trois sections dont
l'intention est nommée se lisent comme une décision.

| Section | Nature | Ce qui la remplit |
|---|---|---|
| **Mon compte** | ce que l'application **sait** de l'étudiant | des données extraites par Blueprint — donc qui peuvent manquer, échouer, ou être absentes chez un établissement |
| **Mes services** | ce que l'étudiant peut **ouvrir** | des portes vers le navigateur intégré : aucune extraction, aucune panne possible |
| **Mes documents** | ce que l'étudiant a **rangé** | des fichiers locaux, qui n'ont rien à voir avec le portail |

### Mon compte

- **L'identité** — prénom, numéro étudiant, et le reste du dossier. Ces quatre champs sont **déjà lus**
  au parcours froid et ne s'affichent aujourd'hui que dans l'écran des identifiants ; les remonter ici
  ne coûte aucun Blueprint. Une ligne discrète plutôt qu'une grande carte : un numéro étudiant se
  regarde une fois par an.
- **La messagerie** — le nombre de messages non lus, et l'ouverture du webmail au toucher. Elle existe
  déjà ; c'est le **modèle** de ce qu'est une ligne qui porte à la fois une donnée et une porte.
  Elle **disparaît** chez un établissement sans messagerie extractible, sans le moindre échec affiché
  (voir [Un établissement peut n'avoir qu'une partie des services](#un-établissement-peut-navoir-quune-partie-des-services)).

### Mes services

Des portes, et rien d'autre : elles ouvrent le [navigateur intégré](#le-navigateur-intégré) sur une
adresse. Elles ne peuvent pas échouer, elles ne demandent aucun Blueprint, et elles **viennent toutes
du catalogue** — colonne `services`, posée au jalon [6-G](../phase-6/6-g-etablissements.md).

| Porte | Bordeaux | Bordeaux INP |
|---|---|---|
| **ENT** | `ent.u-bordeaux.fr` | `ent.bordeaux-inp.fr` |
| **Apogée** | `apogee.u-bordeaux.fr` | — *(l'INP est sur PC-Scol)* |
| **Moodle** | `moodle.u-bordeaux.fr` | `moodle.bordeaux-inp.fr` |
| **Webmail** | `webmel.u-bordeaux.fr` | — *(SAML, non extractible)* |

Les deux plateformes Moodle ont été vérifiées le 2026-08-13 — « Plateforme pédagogique de l'université
de Bordeaux » et « Moodle Bordeaux INP » — et ajoutées au catalogue.

Conséquence à retenir, parce qu'elle décide de la manière de trancher : **ajouter ou retirer une porte
est une ligne en base**, pas une release. Le doute sur Moodle — un étudiant qui a l'application
officielle n'a pas besoin d'une WebView — se règle donc en la mettant, puis en la retirant si elle ne
sert pas. Une réserve honnête : l'application ne portant **aucun outil de mesure d'usage**
([PRIVACY.md](../../PRIVACY.md)), cette décision se prendra en demandant à des étudiants, pas en
lisant une statistique.

Un établissement qui ne déclare pas une adresse **n'affiche pas la porte**, et Bordeaux INP en est le
cas réel : ni webmail extractible, ni Apogée. La grille de portes se construit donc **depuis le
catalogue**, jamais depuis une liste écrite dans l'écran :

```ts
import { serviceEtablissement } from '../../shared/etablissements';

const adresse = serviceEtablissement('moodle');   // string | null
// null  →  la porte ne s'affiche pas. Pas de tuile morte, pas de message d'erreur.
```

C'est la même règle que la ligne de messagerie et que la section des salles libres : **ce qui n'existe
pas chez cet établissement disparaît**, il ne s'affiche pas en panne. Un écran qui déclarerait quatre
tuiles en dur enverrait un étudiant de l'INP sur l'Apogée de Bordeaux — le défaut exact que le jalon
6-G a corrigé sur ces mêmes adresses.

### Mes documents

Un endroit où l'étudiant range ses certificats de scolarité, attestations et autres pièces, pour les
avoir **hors ligne** et les retrouver sans fouiller.

C'est la seule partie de l'onglet qui **fonctionne sans compte**, et c'est un argument suffisant pour
la livrer : aujourd'hui, la Scolarité ne sert à rien à qui ne se connecte pas.

**Une correction à faire dès maintenant sur le stockage**, parce que la formulation naturelle est
fausse et qu'elle finirait dans la politique de confidentialité : ces fichiers **ne peuvent pas** aller
dans le trousseau. `expo-secure-store` est fait pour de petites valeurs — quelques kilo-octets — et
refuserait un PDF. Ils vont dans le **répertoire privé de l'application**
(`expo-file-system`, à ajouter en dépendance), qui est isolé des autres applications et couvert par le
chiffrement de l'appareil quand celui-ci est verrouillé.

La formulation exacte, à reprendre telle quelle dans la politique : *les documents restent sur
l'appareil, dans l'espace privé de l'application, et ne sont envoyés nulle part.* Écrire « chiffrés par
UKit » serait faux — une clé qui vivrait à côté du fichier ne protège de rien, et le vrai rempart est
celui de l'OS.

Pour la v6, **l'étudiant ajoute ses documents lui-même**. Les récupérer automatiquement depuis le
portail est hors de portée aujourd'hui : le dossier de Bordeaux INP a bien un onglet « Documentation »,
mais un Blueprint ne sait pas **télécharger un fichier binaire** — Act II n'écrit pas de fichier, et
l'extraction texte livrée au jalon 3-I d'Aetherius ne rend que du texte décodé. Ce serait un manque à
traiter dans le dépôt voisin, pas ici.

### Ce qui n'y est pas, et pourquoi

- **Les notes.** Elles sont probablement ce qu'un étudiant vient chercher, et c'est justement pour ça
  qu'elles ne s'improvisent pas : chez Bordeaux elles vivent sur Apogée, un hôte séparé ; chez Bordeaux
  INP, l'onglet « Parcours » du dossier est le candidat, mais son contenu n'a pas été regardé. En v6,
  la **porte Apogée** les couvre. Le jour où on les extrait, ce sera un Blueprint par établissement —
  publiable sans release — et un bloc de plus dans « Mon compte », qui, lui, demandera une version.
- **Le calendrier des examens.** Même raison, en plus net : il n'est pas vérifiable en août, et il est
  une sous-partie d'Apogée. Concevoir un bloc pour un contenu qu'on n'a jamais vu est exactement la
  façon de devoir le refaire. Il passe par la porte Apogée en v6, et devient un sujet à part quand les
  calendriers sont publiés et qu'on peut les lire pour de vrai.

Ces deux reports ont la même logique, et elle vaut d'être retenue : **une porte est un engagement
tenable tout de suite ; un bloc de données est un engagement qu'il faut pouvoir vérifier.**

### Ce que cette page ne demande pas comme machinerie

Rien, ou presque — et c'est le bénéfice direct du jalon 6-G. Chaque variation est déjà portée :

- un service absent **se dit** ou disparaît, sans échec (`serviceAbsent`, `messagerieDisponible`) ;
- les adresses des portes viennent du catalogue, donc changent sans release ;
- le verrou biométrique, le stockage chiffré des identifiants et le navigateur intégré existent.

Ce qui reste à ajouter est **`expo-file-system`** et l'écran de documents. Le reste est de la mise en
page.

La capture `scolarite-dashboard.png`, volontairement différée plus haut, se prend **après** cette
refonte : c'est précisément l'écran dont l'habillage devait changer.

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
  ├─ aucun portail publié    → SourceFailureNotice (PORTAIL_ABSENT)
  ├─ pas de compte           → ScolariteLoginView
  ├─ parcours froid en cours → ScolariteLoadingScreen
  ├─ échec sans identité     → SourceFailureNotice
  └─ sinon                   → BiometryGate > GreetingBlock + MailboxRow
```

**L'absence de portail passe devant l'absence de compte**, et l'ordre n'est pas indifférent — c'est le
même raisonnement que l'onglet Planning au jalon 6-G, appliqué ici au jalon 6-J. Un établissement qui
ne publie aucun portail n'a **jamais** d'identifiants enregistrés : la branche « pas de compte »
gagnait donc toujours, et proposait un formulaire de connexion qui ne pouvait mener nulle part. C'est
la condition pour qu'une université sans portail soit utilisable plutôt que menteuse.

Il n'y a **plus de WebView propre à cet onglet** : les deux Blueprints sont joués dans la WebView
unique montée par [`rootContainer.tsx`](../../src/shared/navigation/rootContainer.tsx), qui ne crée
sa vue native qu'au premier run navigateur et la libère à la fin.

Le provider est monté **au-dessus de la pile entière** ([navigation.md](../navigation.md)) : la
session démarre au lancement de l'application, pas à l'ouverture de l'onglet, pour que les données
soient prêtes quand l'utilisateur y arrive.

## Deux Blueprints, pas un

| Blueprint | Quand | Ce qu'il rend |
|---|---|---|
| [`ukit.portail.bordeaux.dossier`](../../blueprints/ukit-portail-bordeaux-dossier.blueprint.json) | premier login | numéro étudiant, INE, identité, adresse mail, date de naissance |
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
| Dossier | `mondossierweb` **GWT**, `#gwt-uid-NN` positionnels | `mondossierweb` **Vaadin**, couples ancrés **par leur libellé** |
| Identité | `PRÉNOM NOM` en un champ | nom et prénom séparés, recomposés par le fichier |
| INE | lu | absent du dossier |
| Durée du parcours froid | ~40 s | ~12 s |

Ce que ça établit, et qui vaut pour tous les portails à venir : **c'est la sortie qui est le
contrat.** Les deux fichiers rendent les mêmes cinq champs, `ScolariteMapping` n'a pas bougé d'une
ligne, et les écrans ne savent toujours pas qu'il existe deux portails.

## Données froides et données chaudes

| | Données froides | Données chaudes |
|---|---|---|
| Contenu | prénom, numéro étudiant, INE, adresse mail, date de naissance | nombre de messages non lus |
| Stabilité | ne changent pas d'une année sur l'autre | changent en permanence |
| Stockage | SecureStore (`UKIT_COLD_DATA`) | mémoire seulement |
| Récupération | une seule fois, au premier login | à chaque lancement |

C'est ce qui permet le mode « chaud » : une page lourde évitée à chaque démarrage. Le mode est
choisi automatiquement à l'initialisation — `hot` si des données froides existent, `cold` sinon — et
forcé à `cold` lors d'un nouveau login.

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

## Le filet que le code d'origine n'avait pas

Les identifiants GWT du dossier sont attribués selon l'ordre de construction du DOM. La migration ne
les rend **pas** robustes. Ce qu'elle ajoute, c'est la lecture des **cinq libellés voisins** et leur
assertion :

```json
{ "action": "assert",
  "condition": "{{ steps.dossier.libelle_numero == 'Dossier' and … }}" }
```

Un décalage devient un **échec nommé** au lieu d'une donnée fausse écrite dans le trousseau. Le
libellé `Prénom et Nom` sert deux fois : il garde l'extraction, et c'est lui qui autorise à prendre
le premier mot de l'identité comme prénom — sans lui, l'ordre serait une supposition, et une
supposition sur un nom propre s'affiche en toutes lettres sur le tableau de bord.

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

**Remplissage automatique du formulaire CAS** : `getCASInjectedScript` scrute la page toutes les
100 ms (50 tentatives, soit 5 s). Si des identifiants sont enregistrés et qu'aucune erreur n'est
affichée, il remplit et soumet. Sinon, il pose un écouteur sur la soumission du formulaire pour
**proposer d'enregistrer** les identifiants saisis à la main.

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
- L'accès à l'onglet est protégé par `BiometryGate` (`expo-local-authentication`), avec repli sur le
  code de l'appareil. Son écran de garde a pris le vocabulaire partagé : il affichait un **cadenas
  emoji** de 48 points et un `#fff` en dur sur son bouton — deux règles du dépôt enfreintes au même
  endroit, et un rendu qui variait avec la police d'emoji du système.
- La déconnexion coupe la session en cours **avant** de supprimer les deux clés SecureStore.

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

- **Les sélecteurs restent positionnels** (`gwt-uid-41`, `-43`, `-45`, `-47`, `-51`). Ils ne sont pas
  devenus robustes : ils sont devenus une **ligne de données corrigeable à distance**, et un décalage
  produit désormais un échec nommé au lieu d'une donnée fausse. C'est déjà beaucoup, et ce n'est pas
  la même chose.
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
- **Apogée n'est pas extrait**, pas plus qu'avant : il reste accessible par le navigateur intégré —
  et c'est lui qui couvre les notes et le calendrier des examens en v6, faute d'avoir pu les lire.
- **Les documents étudiants ne se récupèrent pas tout seuls.** Un Blueprint ne sait pas télécharger un
  fichier binaire : Act II n'écrit pas de fichier, et l'extraction texte du jalon 3-I ne rend que du
  texte décodé. L'étudiant ajoute donc ses pièces lui-même ; l'automatiser demanderait une capacité
  de plus dans le dépôt voisin.
- **Le numéro étudiant de Bordeaux INP est lu par position** dans le bandeau latéral, faute d'un
  libellé pour l'ancrer — la seule fragilité positionnelle de ce portail. L'`assert` sur les libellés
  de l'état-civil est ce qui la garde : un décalage du bandeau accompagnerait une refonte de la page,
  donc de ces libellés.
- **Bordeaux INP ne rend pas d'INE** : son dossier ne l'expose pas. Le champ reste vide plutôt que
  d'être inventé.
- **Pas de parité automatisée** pour ce module, et c'est assumé : elle demanderait des identifiants
  réels dans un harnais.
- **Un échec de connexion depuis l'accueil ne se voit qu'après coup.** Le formulaire affiche bien son
  message d'erreur, mais « Plus tard » et un succès mènent au même écran suivant : quelqu'un qui
  avance sans lire n'apprend qu'en ouvrant l'onglet Scolarité que sa session n'est pas partie. C'est le
  prix de ne pas bloquer l'accueil sur une panne de portail, et c'est le bon arbitrage — mais il est
  écrit ici plutôt que découvert.
- **[`ApogeeCard.tsx`](../../src/features/Scolarite/components/cards/ApogeeCard.tsx) n'est importé
  nulle part** : la carte d'accès aux notes existe mais n'est pas branchée au tableau de bord.
- **Le point d'entrée `apogee` du navigateur intégré n'est atteint par aucun appel** de navigation.
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
| [`screens/ScolariteDashboard.tsx`](../../src/features/Scolarite/screens/ScolariteDashboard.tsx) | écran d'onglet : aiguillage entre connexion, chargement, échec et tableau de bord |
| [`screens/CredentialsSettingsScreen.tsx`](../../src/features/Scolarite/screens/CredentialsSettingsScreen.tsx) | réglages du compte : informations enregistrées, déconnexion — et, **sans compte, le formulaire de connexion** plutôt qu'une fiche vide |
| [`screens/WebBrowserScreen.tsx`](../../src/features/Scolarite/screens/WebBrowserScreen.tsx) | navigateur intégré : points d'entrée, historique, retour matériel, enregistrement d'identifiants |
| [`components/WebBrowserComponents.tsx`](../../src/features/Scolarite/components/WebBrowserComponents.tsx) | barre d'action flottante, modale d'enregistrement, script de remplissage CAS |
| [`components/ScolariteLoginView.tsx`](../../src/features/Scolarite/components/ScolariteLoginView.tsx) | formulaire de connexion et explication du traitement des données. Partagé avec le [parcours d'accueil](onboarding.md), où il porte en plus une sortie « Plus tard » ([architecture.md](../architecture.md#dépendances-entre-features)) |
| [`components/ScolariteLoadingScreen.tsx`](../../src/features/Scolarite/components/ScolariteLoadingScreen.tsx) | écran de progression du parcours froid, étape par étape |
| [`components/BiometryGate.tsx`](../../src/features/Scolarite/components/BiometryGate.tsx) | verrou biométrique, une demande par session d'application |
| [`components/GreetingBlock.tsx`](../../src/features/Scolarite/components/GreetingBlock.tsx) | salutation, date du jour, détection d'anniversaire |
| [`components/MailboxRow.tsx`](../../src/features/Scolarite/components/MailboxRow.tsx) | ligne de messagerie : compteur de non-lus, chargement, et échec du parcours chaud |
| [`components/cards/ApogeeCard.tsx`](../../src/features/Scolarite/components/cards/ApogeeCard.tsx) | carte d'accès aux résultats — définie, non branchée |
