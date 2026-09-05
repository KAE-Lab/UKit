# Changelog

Toutes les évolutions notables du projet sont consignées ici. Le format s'inspire de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versionnage suit
[SemVer](https://semver.org/lang/fr/).

Ce fichier a été ouvert avec le socle de documentation : les versions antérieures à `5.6.1` ne sont
pas détaillées rétrospectivement. Leur contenu reste consultable dans les
[Releases GitHub](https://github.com/KAE-Lab/UKit/releases) et dans l'historique Git.

## [Non publié]

La consolidation de la v6 ([docs/phase-6/6-1-mise-a-plat.md](docs/phase-6/6-1-mise-a-plat.md)) : ce que
la première soirée en production a montré de fragile, réparé avant tout contenu nouveau.

### Ajouté

- **Les chargements disent ce qu'ils attendent** (6.1-E). « Ton emploi du temps arrive… »,
  « Recherche des salles libres… », « Le portail se charge… » — et une seconde ligne après quatre
  secondes quand le serveur d'une université traîne, pour qu'une attente longue cesse de ressembler à
  une panne.
- **Le contenu apparaît en fondu** là où il remplaçait un indicateur d'un seul coup : les valeurs des
  widgets de la Scolarité, le premier emploi du temps affiché.
- **Les interrupteurs et le curseur des Réglages sont dessinés par l'application**, identiques sur
  iPhone et Android, avec retour haptique. Le curseur de délai se règle aussi au lecteur d'écran.
- **On passe d'un onglet à l'autre en glissant** entre la Scolarité et les Réglages. Le Planning et
  le Campus gardent leurs gestes : leur contenu glisse déjà.

### Corrigé

- **Le premier parcours froid de Bordeaux INP n'échoue plus** (6.1-E). Il tombait à chaque fois, et
  seul un réessai fonctionnait : une source parfaitement disponible se présentait comme injoignable.
  La cause n'était ni dans cette application ni dans ses fichiers d'instructions, mais dans le
  moteur — une WebView cachée l'était aussi pour le navigateur du système, qui cessait alors de
  donner à la page de quoi finir une cascade d'authentification. Corrigé chez Aetherius, dont
  l'application consomme désormais la version **0.5.7**.
- **Et une lecture du dossier de Bordeaux INP perdait son résultat en silence.** Des quatre lectures
  complémentaires du dossier, une seule enchaînait sans la pause de protection que les trois autres
  portent : l'opération partait pendant que la page changeait encore, et n'obtenait jamais de
  réponse. Le parcours mourait alors à quatre-vingt-dix-sept pour cent, après avoir pourtant lu
  l'identité.
- **« Se déconnecter » ferme bien la session côté université** (6.1-E). Quand un widget se
  rafraîchissait au même moment, le geste effaçait le compte sur l'appareil **en laissant le
  navigateur intégré connecté** : la déconnexion n'obtenait jamais le moteur, et rien ne le disait.
  Elle l'obtient maintenant, et un échec se voit.
- **Réessayer après une connexion à moitié échouée garde la page** (6.1-E). L'écran de chargement
  reprenait tout l'espace au moment précis où l'on essayait de réparer.
- **L'onglet Réglages suit le changement de campus** fait depuis la Scolarité (6.1-E) : il affichait
  encore le nom de l'établissement quitté.
- **Le contenu publié atteint les écrans déjà montés** (6.1-C). Un signal partagé dit le vrai retour
  au premier plan — après un passage en arrière-plan, pas après un centre de contrôle tiré ni une
  invite Face ID — et sur ce signal les annonces se relisent, le Planning recalcule « Aujourd'hui »
  quand la date a changé, et les widgets de la scolarité ne se rejouent plus une seconde fois juste
  après la biométrie.
- **La permission calendrier ne bascule plus la synchronisation.** Ouvrir les Réglages sans
  permission la demandait, puis allumait la synchronisation si elle était accordée — ou ouvrait la
  modale d'extinction si elle l'était déjà. L'état reste ce qu'il était, et accorder la permission
  dans les réglages du système suffit au retour.
- **La synchronisation porte le planning agrégé**, pas le premier favori seul, et un échec de
  « Forcer une synchronisation » se dit par un toast. Les titres de notification de cours sont
  traduits, et la section Notifications dit son plafond de vingt.
- **Réinitialiser efface aussi les favoris et filtres du Campus** : quelqu'un qui efface tout
  s'attend à ce que tout parte. La bascule d'établissement, elle, les garde.
- **Un seul cache pour la liste des groupes.** L'écran de recherche tenait le sien, sans expiration
  et jamais invalidé au changement d'établissement ; il lit celui du manager, daté.
- **La vue semaine ne recalcule plus ses filtres à chaque rendu**, et les rappels de cours suivent les
  filtres d'UE dans les deux vues.
- **La première section de la recherche de groupes est bleue en sombre**, comme en clair : l'index 0
  de la palette portait la valeur de l'index 4.
- **L'étape des groupes de l'accueil dit pourquoi elle est vide** — une installation hors ligne
  voyait une carte muette qui invitait à « affiner » — et propose de réessayer ; les abonnements du
  parcours sont résiliés au démontage.
- **La section des salles libres du tableau de bord propose « Réessayer »**, comme les trois autres.
- **Le trousseau n'est lu qu'une fois au lancement.** Le chrono de 6.1-C a vu une seconde lecture
  quarante secondes après le premier rendu, que rien n'avait demandée ; un parcours froid aurait pu
  être relancé par-dessus lui-même.
- **Une tuile en échec garde sa taille** (6.1-A). Un widget en panne basculait la paire entière en
  rangées, et la page changeait de forme sous les yeux de l'utilisateur. La tuile dit désormais deux
  mots — « Indisponible », « À ressaisir », « Erreur » — et une feuille au toucher porte la phrase et
  le geste : **relancer ce seul widget**, ou ressaisir ses identifiants.
- **Un code de Blueprint inconnu n'est plus une « connexion interrompue ».** Tout code en
  `_INDISPONIBLE` se présente comme un service injoignable, réessayable — par une règle, pas par une
  table qu'on oublie d'étendre à chaque widget.
- **Une seule vue du chargement.** Se connecter depuis l'onglet Scolarité passait du formulaire à
  l'écran de chargement plein au dixième pas ; le formulaire garde la page jusqu'au dernier, comme la
  fiche du compte le faisait déjà.
- **Le premier jour montre tous les établissements.** Le socle embarque les trois établissements
  publiés — Blueprints de Bordeaux INP compris —, l'accueil se relit à l'arrivée du catalogue, et
  l'étape établissement attend sa première réponse, quatre secondes au plus, avec un chargement qui
  dit ce qu'il attend. Une installation hors ligne voit le socle, désormais complet.
- **Face ID est confirmé** sur l'iPhone de production ; le registre des défauts le coche.
- **Se déconnecter depuis la fiche du compte ramène à l'onglet**, qui est le formulaire de connexion :
  on ne tombait plus sur deux formulaires empilés.
- **Un campus non relié a sa page** dans l'onglet Scolarité — un état vide, la demande de campus, un
  bouton pour corriger son choix — au lieu d'un onglet voilé qu'on atteignait quand même par le
  formulaire ; c'est le bouton Compte de la barre qui porte le voile.
- **Actualiser son dossier ne vide plus l'onglet.** Le dossier précédent reste affiché, la barre se
  pose en encart en tête de page, et revenir sur l'onglet pendant l'actualisation ne retombe plus sur
  l'écran de chargement plein. « Réessayer » relance le dossier après un échec.
- **À l'accueil, une connexion lancée bloque « Suivant » et le retour** jusqu'à son terme : un échec se
  lit sur place, un succès avance tout seul. « Tu es d'un autre campus ? » est un bouton tonal sous le
  bouton de connexion, désactivé avec lui, plutôt qu'un lien à côté de « Plus tard ». Et l'étape des groupes
  porte son cadre clavier : le clavier ne recouvre plus les groupes trouvés.

### Ajouté

- **Tirer-pour-rafraîchir sur le tableau de bord Campus** (6.1-C) : les quatre sources se relisent à
  la demande, sans faire clignoter les carrousels — la seule relecture des sources tierces, décidée
  plutôt qu'un rejeu silencieux à chaque retour au premier plan.
- **Des messages de service, sans release** (6.1-B). Une information se montre en bandeau flottant
  en haut de l'écran, un avertissement et un incident en feuille ; l'incident reste rappelé tant
  qu'il dure par la **pastille d'état de service** — un « i » à droite du grand titre de chaque
  onglet, gris quand tout va bien, rouge en incident. Grise, elle ouvre « Rien à signaler » et le lien
  du formulaire ; rouge, elle rouvre la feuille. Lus au démarrage et au retour au premier plan, mémorisés « vus »
  par appareil — un message fermé ne revient pas —, mis en cache pour se montrer dès le lancement.
  La table existait depuis le jalon 6-B, vide et sans lecteur.
- **Les messages et les annonces se ciblent** : un campus, une fenêtre de versions de l'application
  (« la 6.1 est disponible » ne s'affiche qu'à qui ne l'a pas), et une **audience** — `testeurs`
  pour regarder un contenu sur son téléphone avant de l'envoyer à tout le monde. Le tri se fait sur
  l'appareil ; la base ne sait rien de lui.
- **Un identifiant d'installation**, tiré une fois et gardé au trousseau, qui ne sert qu'à dire si
  l'appareil est un testeur — et qui ne quitte jamais le téléphone : l'application lit la liste des
  appareils enregistrés et compare chez elle. Il s'affiche dans un nouvel onglet *Testeur* du menu
  de développement, avec deux gestes qui rendent le canal vérifiable sans relancer : relire les
  messages, oublier les vus.
- **Une console web de pilotage** (6.1-B), sur GitHub Pages : publier une annonce, un message de
  service, un testeur, un visuel, une ligne de catalogue sans requête SQL — une liste et un
  formulaire génériques par table, les avertissements que chaque table mérite, le visuel téléversé
  avec son adresse versionnée, l'état des sources, le journal filtrable et exportable. Un compte
  Supabase Auth dont l'e-mail figure dans `editeurs` ; les Blueprints restent au script.
- **Des sondes chaque matin** (6.1-B) : un workflow joue chaque source tierce sans identifiant —
  Celcat, les deux CAS, la chaîne SSO de Moodle, l'export ADE, le manifeste de publication et ses
  empreintes —, écrit son état dans la base, et ouvre une issue GitHub quand une source tombe, la
  ferme quand elle revient. Le relais mort tout un été et le Moodle cassé le soir de la sortie
  auraient été vus le matin même.
- **Un journal en base** : chaque écriture dans une table publiable — depuis la console, un script,
  le Studio ou psql — laisse l'avant, l'après, qui et quand, par un déclencheur que rien ne
  contourne. Avec lui, les deux premières gardes de la base, dans un schéma que l'API n'expose pas :
  qui est éditeur, et la trace. Les politiques d'écriture pour un compte authentifié listé dans
  `editeurs` arrivent en même temps, pour la console.
- **« Tu es d'un autre campus ? »** sous le formulaire de connexion, dans l'onglet comme à l'accueil :
  le choix d'établissement, la même bascule que les Réglages.
- **Le PDF s'affiche dans l'application sur Android**, dessiné par pdf.js embarqué dans la vue —
  fichiers statiques, aucun module natif, Expo Go reste utilisable. Un document trop lourd ou une
  WebView trop ancienne retombent sur la feuille de partage, et le disent.

### Modifié

- **Les portails universitaires répondent deux à trois fois plus vite** (6.1-D). Les neuf Blueprints
  de portail portaient 60 s de pauses fixes, écrites à la main faute de mesure. Elles ont été
  chronométrées : l'attente d'ouverture est devenue une attente conditionnelle — « le formulaire, ou
  la page utile » —, la chronologie Moodle attend que son gabarit de chargement cède, et les pauses
  qui restent sont calées sur ce qu'on a relevé. Sur appareil, un widget passe de 24-29 s à
  **4,4-9,8 s**, le parcours froid de Bordeaux **de 43,0 s à 14,1 s**, celui de Bordeaux INP **de
  48,2 s à 25,3 s**, et un mot de passe faux se dit en **7,2 s** au lieu d'une vingtaine. Les sorties
  sont identiques, champ pour champ. Deux pauses de l'INP n'ont pas bougé : leurs vues rendent
  réellement en 2,3 et 2,8 s, et les raccourcir vidait des lectures sans produire le moindre échec.
  **C'est une publication** — les appareils déjà en 6.0 en profitent sans mise à jour.
- Le dialogue informatif (`Dialogue`), la modale « Bientôt » et le choix d'établissement
  (`ChoixEtablissement`) remontent dans `shared/ui` ; la bascule d'établissement est un service partagé.
- Le socle du catalogue vit dans son propre fichier de données, et un test le compare aux lignes SQL
  publiées ; le fichier SQL redit ce que la base porte réellement (la porte Moodle par SSO initié par
  l'IdP, Talence pour les deux campus, « Autre campus »).
- `pdfjs-dist` en devDependency, `metro.config.js` déclare `txt` en asset, `npm run pdfjs:vendor`
  recopie la bibliothèque.
- Le menu de développement gagne une **réinitialisation complète** — trousseau, documents, caches,
  puis rechargement — pour voir ce qu'un tout nouvel étudiant voit.
- Le panneau **Blueprints** du menu de développement dit combien de temps un run a pris, et chaque
  run écrit le détail de ses steps dans la console sous `__DEV__` : mesurer une lenteur ne demande
  plus un poste.

- **Trois requêtes de découverte des bibliothèques au lieu de douze** (6.1-C) : la position de
  l'étudiant et deux points bordelais. Les six sites exclusifs de Pau, La Rochelle, Limoges et
  Bayonne sortent de la liste par défaut — le périmètre est bordelais, et un étudiant qui s'y trouve
  les garde par sa position. Les points sont une donnée de catalogue, à republier.
- **La position est résolue une fois pour tout le Campus**, partagée cinq minutes entre le tableau de
  bord et les listes ; la distance à vol d'oiseau vit dans un module pur testé.
- **L'outillage à zéro écart** : ESLint sans avertissement (35 traités un par un), `expo-doctor`
  sans écart (sept paquets réalignés, `.expo/` ignoré), `setup-java@v5` dans le workflow de release,
  `StyleWelcome` et `WelcomeButton` supprimés — deux cents lignes de styles que plus rien ne montait.
- **La réinitialisation complète du menu de développement garde ses simulations** — HORS LIGNE, date
  — le temps de la relance : c'est en HORS LIGNE qu'on veut voir ce qu'un nouvel étudiant sans réseau
  voit.

## [6.0.0] - 2026-08-31

Le plus gros ensemble de changements depuis la reprise du projet : quatre fonctionnalités majeures,
une refonte complète de l'architecture, puis une refonte visuelle intégrale. Pour l'utilisateur,
l'essentiel tient en une ligne : **les pannes deviennent lisibles, et les corrections arrivent sans
mise à jour.** La phase ne rend pas les sources fiables — elle rend leurs pannes honnêtes et leurs
réparations rapides.

### Ajouté

- **L'onglet Scolarité est « tout ou rien » sans compte.** Il ne montre plus ses documents sous une
  invitation à se connecter : un onglet qui porte une seule section sous un encart se lit moins bien
  qu'un onglet franchement vide, qui ne propose qu'une chose.


- **Connexion et progression sur une seule page.** Le formulaire ne cède plus la place à un écran
  d'attente : son bandeau reste et sa carte passe des champs à la barre. Un échec revient là où la
  saisie a eu lieu, sans retour en arrière.


- **L'écran d'attente du premier login est refait** : une barre, un pourcentage et **une seule ligne**
  qui se remplace, au lieu de quatre étapes dont trois grisées. La question qu'on se pose en attendant
  n'est pas « quelle étape » mais « combien de temps encore » — et on ne peut agir sur aucune d'elles.
  La barre anime toujours depuis sa position courante : une étape rapide l'accélère au lieu de la
  faire sauter.


- **Une barre de progression sur le parcours froid.** Elle avance en continu vers l'étape en cours
  plutôt que par paliers : une barre qui passerait quinze secondes immobile à 75 % serait pire que pas
  de barre. Elle ne peut jamais annoncer une étape terminée avant qu'elle le soit.

- **Le logo de l'établissement sur l'écran de connexion**, avec repli sur l'icône générique quand
  aucun logo n'est publié, qu'il ne se charge pas, ou qu'on est hors ligne au premier lancement.

- **Un nom court par établissement.** « Collège ST » là où la place manque, « Collège Sciences et
  Technologies » dans l'écran de choix — le seul endroit où il faut reconnaître une fac qu'on ne
  connaît pas encore.


- **Le navigateur intégré s'ouvre déjà connecté.** C'était l'une des promesses de garder des
  identifiants enregistrés, et elle n'était pas tenue : ouvrir l'ENT, Moodle ou le webmail retombait
  sur un formulaire. La cause n'était pas où on la cherchait — le moteur ouvrait sa WebView en
  **incognito**, donc le ticket CAS que la session venait d'obtenir était *jeté* trois secondes plus
  tard. Il est désormais conservé et partagé, et **le mot de passe cesse d'être injecté dans une
  page** pour le cas courant. En contrepartie obligatoire, **se déconnecter ferme aussi la session
  côté serveur** : sans ça, le geste effacerait le trousseau en laissant un navigateur authentifié.

- **Le numéro étudiant, l'INE et l'adresse universitaire se copient d'un geste**, dans l'écran du
  compte. Ce sont exactement les trois chaînes qu'on redemande à un étudiant et qu'il ne retient pas.

- **Le bouton de la barre d'onglets s'appelle « Compte », plus « Déconnexion ».** Cet écran ne sert
  plus à partir : il porte l'état civil, l'INE, les identifiants, la formation et la date de dernière
  lecture. Le nommer par le plus destructeur de ses trois gestes dissuadait d'y aller pour consulter.
  Le tableau de bord, lui, se recentre sur **les services**.

- **Un campus non pris en charge le dit, et propose de le demander.** L'état empruntait la grammaire
  d'une panne — « le portail ne répond pas » — là où il n'y a jamais eu de portail. C'est un état
  vide avec une action, dont l'adresse vient du catalogue : ouvrir un établissement est une
  publication, pas une release.


- **L'onglet Scolarité a été refait, et il commence par dire quelque chose.** Il n'affichait qu'une
  salutation et une ligne de messagerie ; chez un établissement sans portail publié, il n'affichait
  *rien*. C'est la première session d'écran du volet 2 de la Phase 6, et elle a commencé par
  **sonder les deux dossiers universitaires** plutôt que par un habillage — la page n'avait pas un
  problème de mise en page, elle n'avait pas de contenu.

  - **Trois sections, de trois natures différentes**, et c'est ce qui les empêche de se ressembler :
    *ton dossier* (ce que l'application sait), *tes services* (ce qu'on peut ouvrir), *tes documents*
    (ce qu'on a rangé) ;
  - **la formation courante s'affiche**, lue des deux côtés — la vue *Inscriptions* à Bordeaux, la
    vue *Parcours* à Bordeaux INP — avec son année ;
  - **« Tes documents » : des pièces rangées sur l'appareil**, qui fonctionnent **sans compte**.
    Certificats de scolarité, attestations : elles restent dans l'espace privé de l'application et ne
    sont envoyées nulle part ([PRIVACY.md](PRIVACY.md)). C'est ce qui rend enfin l'onglet utile à qui
    ne se connecte pas — et vivant pour « Autre université », où il était entièrement mort ;
  - **la messagerie a perdu la section qu'elle avait pour elle seule.** Un en-tête au-dessus d'une
    unique rangée était une grammaire de plus. Elle vit dans *tes services*, parce que c'est ce
    qu'elle est : une porte qui porte en plus un compteur ;
  - **les états ne prennent plus l'écran.** Pas de portail, pas de compte, échec : ce sont désormais
    des encarts en tête de page, et le reste de la page continue dessous. Seul le parcours froid
    reste plein écran, parce qu'il est transitoire ;
  - **le verrou biométrique ne s'arme que s'il y a quelque chose à garder** — c'est-à-dire un compte
    enregistré. Demander une empreinte pour atteindre ses propres fichiers serait un péage sans
    serrure derrière.

- **La fragilité la plus sérieuse du projet a disparu.** Les cinq champs du dossier de Bordeaux
  étaient lus par identifiant DOM **positionnel** (`gwt-uid-41`, `-43`…), attribués selon l'ordre de
  construction de la page : une refonte côté université les décalait silencieusement. La sonde a
  montré que chaque champ porte sa légende, et l'ancrage par libellé a été vérifié hors ligne sur le
  DOM capturé — **11 libellés testés, 11 nœuds uniques**. Un décalage ne peut plus rendre *la
  mauvaise valeur* : il ne rend plus *rien*, et l'extraction échoue bruyamment.

- **L'INE de Bordeaux INP existe.** La documentation affirmait le contraire ; il est simplement sous
  un onglet que le Blueprint ne visitait pas. Le champ est désormais rempli des deux côtés.


- **Les dialogues, les états et les boutons ne parlent plus qu'une langue.** Neuf modales, six écrans
  d'état vide ou d'erreur et quatre formes de bouton se sont alignés sur un vocabulaire unique. Le
  détail est dans [docs/theme.md](docs/theme.md) ; ce qui change à l'usage :

  - **les dialogues sont recadrés.** Le conteneur était trop rond et trop serré (`radius.xl`,
    `space.md`), les boutons trop gros pour leur libellé — 150 de large et 52 de haut sous un texte de
    16. Ils passent en `radius.lg`, `space.lg` de rembourrage, titre d'un cran au-dessus, et deux
    boutons mi-largeur de 48 de haut. Et **un titre de dialogue ne se crie plus** : cinq popups sur
    sept le mettaient en majuscules, deux non ;
  - **un état vide se pose enfin au même endroit sur tous les écrans.** Le bloc était partagé depuis
    le jalon 6-K, mais son hôte ne l'était pas : six écrans calculaient leur propre centrage, l'un en
    ne compensant que le haut (bloc trop bas), l'autre que le bas (bloc trop haut), un troisième avec
    `+ 65` au lieu de `+ 70`. Un composant partagé décide désormais, et il **ancre le bloc sous
    l'en-tête** plutôt que de le centrer : centrer demanderait de connaître ce qui occupe le bas de
    chaque écran — barre d'onglets, barre de recherche flottante, ou rien — et c'est précisément ce
    calcul qui produisait des messages « légèrement en dessous du milieu » ;
  - **un état vide a une masse.** Icône dans un carré arrondi, **titre** obligatoire, message à mesure
    courte, action. C'était un glyphe gris et une ligne unique étirée sur toute la largeur, ce qui
    donnait à ces écrans leur air de vide bizarre ;
  - **la couleur dit maintenant ce que les mots disaient seuls.** Une source en panne et une
    université qui ne publie pas d'emploi du temps portaient le même carré gris : la distinction que
    toute la Phase 6 a établie — ce qui est cassé contre ce qui est absent — ne se lisait qu'en toutes
    lettres. Le carré est rouge pâle pour une panne, gris pour une absence ;
  - **un état vide de recherche propose de tout réafficher.** La sortie existait — retirer le filtre —
    mais elle était cachée derrière l'icône de l'en-tête, et rien, dans un écran vide, ne disait qu'un
    filtre en était la cause ;
  - **un échec dit ce qui s'est passé avant de dire quoi faire.** « Service indisponible » en titre,
    « Vérifie ta connexion, puis réessaie » en message, au lieu d'une phrase unique ;
  - **trois boutons transparents disparaissent.** Dans les réglages du compte, actualiser, ressaisir
    et se déconnecter étaient de simples cadres à fond transparent — la couleur du fond de page. Ils
    prennent le fond gris de la barre d'onglets, et c'est **le libellé** qui porte le sens : bleu pour
    les deux premiers, rouge pour la déconnexion. Même recette que le bouton « Réserver » d'une
    bibliothèque ;
  - **la barre de recherche de Campus existe.** Elle avait la couleur d'un fond, donc elle ne se
    voyait pas ; elle est maintenant posée **sur** la liste, avec un dégradé qui amortit le
    défilement — un dégradé qui part du fond à opacité nulle et non de `transparent`, lequel traverse
    du noir et salissait le thème clair. Et elle **disparaît quand il n'y a rien à chercher** — une source en panne ou une
    liste vide n'ont pas besoin d'un champ de recherche. Elle reste tant qu'une requête est saisie,
    sans quoi on serait enfermé avec un texte qu'on ne peut plus effacer.

- **Le mode sombre choisi à la configuration s'applique tout de suite** (issue #13). Le choisir pendant
  le parcours d'accueil laissait l'application en clair jusqu'au redémarrage suivant. La préférence
  était pourtant bien enregistrée, ce qui rendait le symptôme déroutant : deux causes se combinaient —
  les réglages n'étaient pas relus tant que le parcours n'était pas terminé, et le parcours reposait le
  thème du système à chaque ouverture, écrasant le choix. Il suffisait qu'Android récupère la mémoire
  pendant la configuration pour le déclencher.

- **Changer d'université ne déconnecte plus.** La bascule effaçait les identifiants et le dossier,
  alors que les groupes favoris, les filtres et les liens d'abonnement, eux, survivaient : un seul
  élément qui saute quand tout le reste tient ressemble à un défaut, pas à une règle. La raison
  d'origine était pourtant juste — le nom d'un étudiant d'une fac ne doit pas s'afficher sous une
  autre. C'est le remède qui ne l'était pas : la session est maintenant **cloisonnée** par
  établissement, comme les liens d'abonnement l'étaient déjà. On ne lit jamais que le compte de la fac
  active, donc rien ne se mélange, et un aller-retour retrouve sa session. Les identifiants déjà
  enregistrés sont convertis au premier lancement — sans quoi la correction aurait déconnecté tout le
  monde une fois, ce qu'elle existe précisément pour éviter.

- **Une fiche de cours a enfin sa carte.** Ouvrir un cours donné au bâtiment A28 n'affichait aucun
  plan, alors que ce bâtiment est au référentiel avec ses coordonnées — sans message, sans erreur,
  comme si la localisation était inconnue. Le symptôme était unique, les causes étaient **deux** : la
  vue semaine ne produisait aucune description, donc aucune ligne de salle à lire ; et une double
  espace dans le champ `modules` de la source décalait d'un rang la ligne où la salle est cherchée,
  qui devenait le nom de l'enseignant. Le correctif ne répare ni l'une ni l'autre heuristique : il
  cesse de deviner. Celcat **déclare** ses bâtiments dans un champ que rien n'extrayait, et c'est
  désormais lui qu'on lit en premier.

- **La vue semaine du planning affiche sa description.** Groupes, enseignant, salle et semaines y
  étaient vides depuis toujours, par un découpage sur le mauvais séparateur. C'est le seul endroit de
  cette passe où des pixels bougent, et c'est assumé : ces lignes ressemblent maintenant à celles de
  la vue jour.

- **Face ID est tenté avant le code, sur iPhone.** L'onglet Scolarité et la révélation du mot de passe
  demandaient directement le code de l'appareil, alors que l'empreinte se déclenchait normalement sur
  Android : la politique demandée à iOS l'autorisait à court-circuiter la biométrie. Les deux appels
  demandent maintenant la biométrie seule d'abord, puis le code en repli — **sauf si la personne a
  annulé**, auquel cas rien ne s'enchaîne : lui ouvrir le clavier du code serait une seconde demande
  qu'elle n'a pas faite. Au passage, un appareil sans aucun verrou ne pouvait plus jamais ouvrir cet
  onglet — toute demande échouait, et le bouton « Réessayer » ne pouvait pas marcher.

- **Un filtre d'UE s'affiche avec le nom du cours, plus seulement son code.** `4TIN606U` ne se relie
  à une matière qu'en ouvrant son emploi du temps : vérifier ce qu'on avait filtré était fastidieux.
  Le nom **existait déjà** dans la donnée — l'extraction le capturait et le jetait. La recherche porte
  aussi sur le nom, et le code seul reste affiché pour une UE qu'aucun planning chargé ne connaît. Au
  passage, l'indexation gardait une règle corrigée ailleurs il y a deux jalons : un titre commençant
  par une année entrait dans la liste comme une UE fantôme `2026`.

- **La connexion universitaire propose ce qu'elle a trouvé, au lieu de le garder pour elle.** Une
  connexion traverse des pages qui en savent bien plus que l'état civil : à Bordeaux l'annuaire liste
  les **UE auxquelles on est inscrit**, à Bordeaux INP l'agenda **présélectionne sa propre fiche**,
  c'est-à-dire son emploi du temps personnel. Les deux étaient sous nos yeux sans être lues. Un
  dialogue les propose désormais — les UE qu'on **ne suit pas** deviennent des filtres, l'emploi du
  temps devient un groupe favori — et **rien ne s'applique sans qu'on ait dit oui** : deviner juste
  dans le dos de quelqu'un reste deviner dans son dos, et une proposition fausse lui serait
  indétectable. Ce sont les UE **non suivies** qui sont proposées, et c'est tout le sujet : un filtre
  masque, donc pré-remplir avec les siennes aurait caché ses propres cours et vidé son planning sans
  rien expliquer.

- **N'importe quelle photo servie par une source tierce se corrige depuis la base.** Les images des
  restaurants, des bibliothèques et des bâtiments viennent d'un fournisseur : une photo fausse, ou
  absente, l'était pour tout le monde jusqu'au prochain passage en boutique. Une table `visuels`
  permet désormais d'en remplacer une par une ligne — reçue au retour au premier plan, sans release et
  sans redémarrage. Trois écritures, trois effets : une URL remplace, la chaîne vide dit « celle-ci est
  fausse, n'en montre aucune » et rend la main au visuel embarqué, et retirer la ligne rend son image à
  la source. Elle n'a **aucun socle embarqué**, et c'est ce qui la rend intégralement retirable : sans
  ligne, l'application affiche exactement ce qu'elle affichait avant. Voir
  [docs/backend.md](docs/backend.md).

- **Une section vide du tableau de bord Campus dit pourquoi, et propose un geste.** Un carrousel sans
  carte n'affichait rien du tout sous son en-tête, ce qui se lit comme une application cassée. Il
  distingue maintenant trois causes et trois sorties : un filtre qui masque tout (« Tout afficher »),
  une source en panne (renvoi vers l'écran dédié, où l'explication vit), et une absence légitime.

- **Le filtre d'une liste Campus remonte enfin au tableau de bord.** Le changer depuis l'écran de
  liste ne changeait rien sur l'accueil : ses carrousels restaient sur la valeur lue au lancement de
  l'application, définitivement. Le hook lisait le stockage une seule fois, au montage — ce qui suffit
  à une liste qui se remonte à chaque ouverture, mais pas à un onglet qui ne se démonte jamais.

- **La section des salles libres avalait l'échec de sa source**, alors que l'écran dédié le montre
  depuis le jalon 6-K : une source morte y devenait un carrousel vide.

- **Deux gestes du compte demandent maintenant confirmation**, et pas seulement celui qui détruit.
  « Actualiser mon dossier » rejoue une connexion universitaire complète : plusieurs secondes d'écran
  de progression, sans retour possible une fois lancée. Son explication vit dans le dialogue, au
  moment de décider, plutôt qu'en ligne d'aide sous le bouton — que personne ne lisait, et qui cassait
  le rythme des trois actions de l'écran.

- **L'écran du compte s'appelait « Se déconnecter »**, alors qu'il montre le profil, le dossier, les
  identifiants et trois actions. Il prend le nom de la ligne qui l'ouvre. Au passage, le libellé du
  prénom y était **écrit en dur, en français**, sur un écran qui s'affiche dans les trois langues.

- **Les cartes des quatre sections Campus ont de nouveau la même hauteur.** Les horaires d'un
  restaurant sont une phrase libre du fournisseur : affichée sur deux lignes, elle rendait la carte
  d'un restaurant plus haute que celle d'une bibliothèque. Elle se coupe désormais à une ligne, et se
  lit **en entier en pied de l'écran du menu, mise en forme**. La source ne déclare aucune structure
  mais elle en publie une — sur les 81 lignes des quarante-et-un restaurants de la région, 36 sont de
  la forme « NOM : créneau », 25 des portées de jours, 20 des créneaux nus ou des phrases. Chacune a
  désormais sa mise en page ; ce qui n'est pas reconnu s'affiche tel quel.

- **Le statut d'une bibliothèque fermée redevient une ligne d'une seule couleur.** Le jalon 6-K avait
  passé la précision du fournisseur (« Ouvre demain à 09:00 ») en gris pour la distinguer du libellé
  traduit ; la distinction ne se décodait pas et les deux moitiés se lisaient comme deux fragments
  collés. Ce qui comptait dans ce jalon reste acquis : le service ne concatène plus une chaîne
  traduite et une donnée distante.

- **L'application tutoie, partout.** Vingt et une chaînes françaises héritées vouvoyaient quand tout
  ce qui a été écrit depuis le multi-établissement tutoyait, et le mélange se voyait exactement là où
  on regarde : les confirmations et les états vides. Les confirmations perdent au passage leur
  « Êtes-vous sûr de vouloir… », qui n'ajoutait rien.

- **Le code mort a été retiré, et une règle empêche qu'il revienne.** Soixante-cinq variables et
  imports inutilisés dans trente et un fichiers, deux palettes Material complètes que plus rien ne
  lisait, et cinq composants ou fonctions exportés que rien n'atteignait — dont un séparateur visuel
  dont le trait était un `<View />` vide. Un export mort n'est pas neutre : il fait croire à une
  capacité, et il faut l'enquêter avant d'oser le supprimer.

- **Une seule police, celle du système.** Montserrat était demandée quarante-cinq fois, mais
  seulement dans les titres, les en-têtes de section et la Scolarité — **jamais dans le contenu**, ni
  les cartes de cours ni les listes Campus. Et la graisse des titres n'était même pas chargée : elle
  retombait en silence sur la police système. Ce n'était donc pas un système « police de titrage +
  police d'interface », c'était un résidu, et il se voyait dès qu'on le rendait vraiment.

  Elle est retirée — code, chargement et dépendance. La hiérarchie tient désormais entièrement à la
  taille et à la graisse, comme iOS la construit, et l'application paraît native sur les deux
  plateformes au lieu de dénoter sur les deux.

- **Une source de salles libres en panne le dit.** C'était le dernier écran de Campus où une panne
  devenait « Aucun bâtiment trouvé », c'est-à-dire le message d'une réponse légitimement vide — le
  défaut exact que la Phase 6 revendiquait d'avoir supprimé partout. L'échec remonte, et **seulement
  quand il n'y a aucune donnée** : un cache peuplé survit à un rafraîchissement raté.

- **Un mot de passe changé à l'université ne mène plus à une impasse.** L'échec proposait de
  réessayer, ce qui ne pouvait pas marcher, ou rien du tout. Il propose maintenant de **ressaisir**,
  et la ligne de messagerie qui affiche « identifiants incorrects » y mène aussi quand on la touche —
  c'est le cas le plus fréquent, puisqu'un mot de passe change après une première connexion réussie.

  **Et ressaisir ne déconnecte plus.** L'écran du compte porte le formulaire, sans effacer l'identité
  déjà lue ni obliger à retaper l'identifiant. Le dossier universitaire peut aussi être **actualisé**
  de là, là où il fallait auparavant tout effacer pour relancer le parcours complet.

- **Les libellés qui s'affichaient en clé brute sont traduits.** Huit endroits de l'application
  affichaient littéralement `SEARCH_BU_CITY`, `NO_RESULTS_FOUND` ou `OPEN_LIBRARIES` — dont le message
  d'état vide des listes Campus. Les treize clés manquantes sont dans les trois dictionnaires, et
  surtout : **les transtypages qui les masquaient au compilateur sont retirés**, ainsi que les
  trente-huit replis `|| 'texte français'` qui portaient tous sur des clés existantes et ne se
  déclenchaient jamais. Le prochain oubli ne compilera pas.

- **Les popups de confirmation rejoignent la direction artistique de l'application.** Elles portaient
  deux boutons gris identiques que seule la couleur du texte distinguait, un vocabulaire antérieur à
  la palette actuelle. Confirmer est désormais un bouton plein — le même que Réessayer — et **détruire
  est un bouton rouge** : « Réinitialiser l'application » et « Ajouter au calendrier » ne peuvent pas
  se présenter de la même façon.

- **Les états vides ne parlent plus quatre dialectes.** Le Planning avait les siens, en trois
  exemplaires et trois tailles d'icône, à côté de celui que partageaient déjà les écrans Campus. Tout
  passe par un seul composant, avec deux dispositions : dans une liste, ou en plein écran.

- **Un texte de source distante ne se colle plus à un libellé traduit.** L'état d'une bibliothèque
  fermée affichait « Closed - Ouvre demain à 09:00 » : notre mot, puis leur phrase, soudés. La
  précision reste — c'est l'information utile — mais à côté, en texte secondaire.

- **Un socle visuel, extrait de l'application plutôt qu'inventé.** L'application avait la dette
  visuelle de sa reprise : la même carte écrite six fois, le même en-tête de section quatre fois, la
  même pastille de distance huit fois, et **aucune couleur sémantique** — d'où des verts et des
  oranges Material qui traînaient en dur à côté d'une palette Apple. Neuf composants partagés
  remontent dans `shared/ui/`, chacun **relevé au moins deux fois** avant d'être extrait, et les
  écrans de référence les consomment au lieu de les recopier.

  Les tokens gagnent une échelle de succès, avertissement, danger et neutre, déclinée dans les deux
  thèmes, plus les deux pas qui manquaient à l'échelle existante. Rien n'a été dessiné : les teintes
  sont celles que la palette portait déjà, et les pas ceux que le code écrivait en dur.

- **Une règle qui refuse les valeurs de style en dur.** « Aucune couleur, aucun espacement, aucun
  rayon littéral » était écrit dans le README depuis toujours, et n'était appliqué par rien : le
  dépôt en portait 195. `ukit/no-style-literals` les signale et — c'est ce qui compte — **nomme le
  token de remplacement**, parce qu'un avertissement qui n'indique pas la sortie finit désactivé.
  Elle arrive en `warn` : ses avertissements restants sont la liste de travail des refontes d'écran
  à venir, pas une dette diffuse.

  Un test empêche la table d'échelles de la règle de dériver de celle du thème — c'est le genre de
  désynchronisation qui ne casse rien et qu'on ne voit jamais.

- **Un inventaire visuel mesuré**, et une liste de défauts fonctionnels tenue à part. Le premier
  compte au lieu de juger ; la seconde existe pour qu'une session de refonte ne confonde jamais un
  écran laid avec un écran cassé. Elle ouvre avec quatre entrées, dont deux trouvées en mesurant :
  les salles libres n'ont **aucun état d'erreur** — une source en panne y affiche « aucun bâtiment
  trouvé » —, et la police des titres, demandée 22 fois, **n'est jamais chargée**.

- **Le compte universitaire proposé dès l'accueil.** Une étape dédiée, juste après le choix de
  l'établissement, **sautable** par un lien « Plus tard » et **rappelée** dans les Réglages par une
  ligne qui dit si le compte est connecté. Elle disparaît chez une université qui ne publie aucun
  portail — on ne pose pas une question sans réponse. C'est le formulaire de l'onglet Scolarité, tel
  quel : le contexte de session est monté au-dessus de tout le reste précisément pour qu'il n'existe
  qu'un seul chemin vers le trousseau.

- **L'emploi du temps par lien d'abonnement collé.** Une université qui publie un export iCal — ADE,
  Hyperplanning, uPortal — devient utilisable en collant son lien : l'application le vérifie en le
  jouant pour de vrai, dit combien de cours elle y a trouvés, et le range dans le trousseau. C'est le
  **repli universel** de la phase, et il ne coûte rien à ajouter : un seul Blueprint embarqué,
  `ukit.edt.abonnement`, joue n'importe quel lien. Il le demande **sans bornes de dates**, parce que
  tous les produits n'acceptent pas de paramètres, et le découpage par jour et par semaine se fait
  dans l'application — un cas de parité prouve contre la vraie source que les deux découpes rendent
  exactement les mêmes cours.

- **« Mon université n'est pas dans la liste ».** La conséquence directe du point précédent : une ligne
  de catalogue, pas une ligne de code. Un étudiant d'une fac bordelaise que nous n'avons pas portée
  colle son lien et obtient **son planning, les restaurants, les bibliothèques et les salles libres**.
  Il perd la Scolarité — on ne connaît pas son ENT — et la carte des cours, faute de connaître le
  format de ses salles : afficher un bâtiment bordelais pour une salle inconnue serait une carte
  fausse, ce qui est pire qu'une carte absente.

- **Un onglet Planning qui propose le geste au lieu de s'excuser.** « Cette université n'a pas d'emploi
  du temps » et « elle en a un, il te manque un geste » sont désormais deux écrans différents, parce
  qu'ils appellent deux gestes opposés. Le second porte un bouton.

- **Des groupes favoris par établissement.** Changer d'université range ceux qu'on quitte et ressort
  ceux qu'on retrouve, au lieu de tout effacer : revenir à sa fac d'origine y retrouve ses groupes et
  ses filtres d'UE. La règle « les données de deux facs ne se mélangent pas » n'est pas assouplie — à
  tout instant, seuls les favoris de l'établissement actif sont en jeu ; elle interdisait le mélange,
  pas la mémoire. Le cache de planning, la session universitaire et les cours du calendrier restent
  purgés à chaque bascule.

- **Éteindre la synchronisation calendrier retire les cours qu'elle avait écrits.** L'interrupteur
  n'arrêtait que les passages suivants : les événements déjà posés restaient dans l'agenda personnel,
  sans aucun moyen de les enlever depuis l'application — alors que le nettoyage existait déjà et
  n'était appelé qu'en changeant de calendrier cible. L'extinction demande désormais une confirmation,
  puisqu'elle touche un agenda que d'autres applications lisent.

  **Changer d'université les retire aussi.** C'était le même oubli, en plus silencieux : après une
  bascule les groupes favoris sont purgés, donc plus aucune synchronisation ne peut tourner, et les
  cours de la fac précédente restaient dans l'agenda indéfiniment — pendant que l'application
  annonçait que tout avait été effacé. La confirmation de changement d'établissement le dit désormais
  dans les trois langues.

- **L'emploi du temps universel** (jalon [6-I](docs/phase-6/6-i-planning-universel.md)).
  **Bordeaux INP a un emploi du temps**, par l'**export iCalendar** de son serveur ADE — et l'écran est
  celui de Bordeaux au pixel près : aucun composant n'a été modifié pour ça.

  C'est la réponse à un constat mesuré : un balayage de vingt universités françaises n'a trouvé
  **aucune** instance Celcat interrogeable sans authentification hors Bordeaux, alors que presque tous
  les produits d'emploi du temps savent exporter en iCal (RFC 5545). Porter chaque produit un par un
  serait sans fin ; lire un format normalisé ne l'est pas.

  Ce qui rend l'ajout possible sans release : le catalogue déclare **ce qui existe** — les deux
  Blueprints à jouer, le projet ADE de l'année, le référentiel `groupe → ressource`, et la façon de
  lire un code de bâtiment dans une salle. Les quatre signatures du service de planning n'ont pas
  bougé d'une lettre, et les Blueprints vivent sous le préfixe réservé `ukit.portail.`.

  Trois décisions valent d'être connues. **La couleur d'un cours est dérivée de sa matière** — un
  iCalendar n'en porte aucune — par une empreinte stable qui choisit l'une des huit teintes que
  l'application utilise déjà : même cours, même couleur toute l'année, et Bordeaux ne change pas.
  **La reconnaissance de salle est devenue une donnée d'établissement** : elle était une expression
  bordelaise en dur, et aucune salle de l'INP ne lui correspondait. **Le référentiel des groupes est
  un relevé d'auteur**, scripté (`tools/releve-ade.mjs`) et rejouable à chaque rentrée, parce qu'ADE
  n'expose aucun arbre de ressources anonyme.

  Treize groupes sur les cinq écoles de l'INP, dix bâtiments relevés sur OpenStreetMap, un cas de
  parité épinglé sur une semaine passée fixe, et 51 tests de plus.

  **La campagne sur appareil a corrigé trois choses**, dont deux qu'aucun terminal ne montrait :
  l'icône d'une ligne de description était assignée par sa **position** — juste avec Celcat, fausse
  avec un iCalendar, où la salle portait l'icône « groupe » —, et la palette dérivée contenait une
  teinte neutre qui faisait passer un cours sur sept pour un cours sans couleur. La troisième est une
  décision produit : **la recherche de salles libres est ouverte à Bordeaux INP**, qui emprunte
  l'inventaire de l'Université de Bordeaux — ses écoles sont sur le même campus, à deux cents mètres
  des bâtiments concernés.

  Elle a aussi corrigé un cinquième point, invisible sur un cours ordinaire : une **année en tête de
  titre** — `2025-2026 - Les rencontres du Réseau d'Écoute` — était prise pour un code d'unité
  d'enseignement, ce qui amputait le titre et affichait `2026` en en-tête de fiche. Seize matières
  d'un seul groupe étaient dans ce cas. Un code d'UE exige désormais au moins une lettre.

  Elle a enfin révélé un défaut **antérieur au jalon** : changer d'université n'effaçait pas les
  groupes favoris ni les filtres d'UE, alors que la réinitialisation le faisait — et que la
  documentation l'annonçait depuis le jalon 6-G. Il n'avait aucun symptôme tant que le second
  établissement n'avait pas d'emploi du temps ; dès qu'il en a eu un, l'onglet Planning annonçait
  « ce groupe n'existe plus » pour un groupe qui existe, à l'université qu'on venait de quitter.

- **Le multi-établissement** (jalon [6-G](docs/phase-6/6-g-etablissements.md)). UKit n'est plus une
  application mono-université : le **catalogue des établissements** vit dans la
  [base de publication](docs/backend.md) et pilote l'interface. Ajouter une université est désormais
  **une ligne en base et un fichier publié** — pas une release, pas une revue de store.

  **Bordeaux INP est en ligne, et il est arrivé sans release.** Son portail a été écrit et joué contre
  un compte étudiant réel, et il n'a presque rien en commun avec celui de Bordeaux : même produit CAS
  mais un `<button>` là où l'autre a un `<input>`, `mondossierweb` en Vaadin (PC-Scol) là où l'autre
  est en GWT (Apogée), champs ancrés **par leur libellé** au lieu d'identifiants positionnels, pas
  d'INE, pas de messagerie extractible. Ce qui ne change pas, c'est la **sortie** : les deux fichiers
  rendent les mêmes cinq champs, et aucun écran n'a appris qu'il existe deux portails.

  **Un service absent cesse d'être une panne.** Une université sans messagerie extractible ne montre
  simplement pas la carte ; une université sans emploi du temps interrogeable l'affiche en toutes
  lettres au lieu d'échouer, et l'accueil saute l'étape des groupes. C'est un nouveau constructeur du
  modèle d'erreur (`serviceAbsent`), parce qu'aucune famille du moteur ne décrivait « ce service
  n'existe pas ici » — et pour cause : aucun run ne part.

  **Le registre sait maintenant *ajouter*, et rien de plus.** La garde levée par le jalon 3-H
  d'Aetherius est activée en opt-in, bornée au préfixe réservé `ukit.portail.` et au périmètre de
  secrets de l'application. Un nom hors préfixe est ignoré, un portail qui réclamerait un secret hors
  périmètre est refusé **avant** le cache, et retirer la capacité désinstalle ce qu'elle avait laissé
  entrer — dix cas de test le figent.

  Au passage, trois constantes bordelaises quittent le binaire : l'hôte Celcat et ses codes
  d'inventaire (devenus des **entrées** des six Blueprints d'emploi du temps), les onze points de
  balayage des bibliothèques, et les quatre adresses du navigateur intégré — le dernier hôte de
  Bordeaux compilé dans un écran.

- **Le choix de l'établissement** à l'accueil et dans les réglages. Changer
  d'établissement demande une confirmation qui **annonce ce qui sera effacé** — groupes favoris,
  planning en cache, session universitaire — puis purge ce qui appartenait à l'université quittée. Les
  favoris de restaurants et de bibliothèques restent : ces sources-là sont nationales.

  Le parcours de premier lancement passe à cinq étapes : thème et langue, puis l'établissement, puis
  les groupes qu'il conditionne — et cette dernière **disparaît** quand l'université ne publie pas
  d'emploi du temps.

- **La phase 6 gagne un second volet : la refonte visuelle**
  ([6-K](docs/phase-6/6-k-socle-visuel.md)). Une phase correspond à une version, et rien ne part sur
  les stores tant que l'application n'est pas présentable : le volet 1 l'a rendue **corrigeable**, le
  volet 2 la rend **montrable**. Le socle visuel y est **extrait** des écrans qui font déjà référence
  — Planning, la barre d'onglets, le tableau de bord Campus, les listes CROUS et bibliothèques — et
  non inventé, ce qui garantit que le travail déjà fait ne bouge pas. Les écrans restants — annonces,
  scolarité, réglages — se reprennent ensuite **en sessions**, hors jalon : la beauté d'un écran n'a
  pas de définition de « terminé », alors qu'un composant, une règle et une capture identique en ont
  une. Au passage, `6-H` devient **`6-Z`** : le jalon de clôture doit rester le dernier quel que soit
  le nombre de jalons ajoutés, et un dossier trié par nom se lit alors dans l'ordre d'exécution.

- **Une spécification ouverte pour l'emploi du temps universel**
  ([6-I](docs/phase-6/6-i-planning-universel.md)). Le second établissement n'a pas de planning dans
  UKit, et ce n'est pas un oubli : presque aucune université française n'expose un Celcat ouvert. La
  voie mesurée est l'export **iCal**, qui existe partout — elle demande une capacité que le moteur n'a
  pas encore, et le document dit laquelle et pourquoi elle ne se contourne pas ici.

- **La session universitaire jouée par le moteur** (jalon
  [6-F](docs/phase-6/6-f-scolarite.md)). `ScolariteWebSession.tsx` est **supprimé** : 323 lignes de
  WebView cachée pilotée par du JavaScript en gabarits de chaîne, quatre scripts déclenchés selon
  l'URL de fin de chargement, trois `MutationObserver` avec trois plafonds différents et un garde-fou
  global de 60 s deviennent deux [Blueprints](docs/blueprints.md) — `ukit.scolarite.dossier` pour le
  parcours froid, `ukit.scolarite.messagerie` pour le parcours chaud.

  **Les identifiants ne traversent plus la source d'un script.** Ils sont encodés en JSON et
  transmis par une communication corrélée avec l'agent injecté : un mot de passe contenant une
  apostrophe ne peut plus casser le remplissage, par construction. Le même défaut existait dans le
  remplissage automatique du **navigateur intégré**, hors périmètre du jalon mais corrigé au passage.

  **Un décalage des sélecteurs GWT devient une erreur, plus une donnée fausse.** Les cinq libellés
  voisins du dossier sont lus et affirmés ; s'ils bougent, la session échoue avec un message
  explicite et **rien n'est écrit** dans le trousseau. C'est le seul endroit où la version migrée est
  franchement meilleure que l'originale, et elle ne le doit qu'au fait que la description est de la
  donnée. Le libellé `Prénom et Nom` rend d'ailleurs un service de plus : c'est lui qui autorise à
  prendre le premier mot de l'identité comme prénom, la lecture du prénom sur l'ENT ayant disparu
  avec la page qui la portait.

  **Les échecs se distinguent enfin.** Identifiants refusés, portail injoignable, messagerie muette,
  libellés décalés et sélecteur introuvable produisent cinq écrans différents au lieu d'un onglet qui
  restait sur son dernier état. Un mot de passe faux est nommé en **13 s** au lieu de 41, grâce à une
  garde sur le panneau d'erreur du CAS — mesurée, parce que les deux sélecteurs que le code d'origine
  interrogeait (`#msg.success`, `#msg.errors`) ne correspondaient **plus à rien** depuis un moment,
  sans que rien ne le signale.

  **Une session à la fois, et elle ne survit pas à l'écran qui l'a demandée** : la seconde demande
  est refusée explicitement, l'application qui passe en arrière-plan annule le run — et reprend au
  retour —, et une session annulée n'écrit rien, ce qui évite qu'une déconnexion en cours de route
  remette dans le trousseau l'identité qu'elle vient d'effacer.

  **Un portail muet propose de réessayer**, alors que sa famille d'échec ne le prévoit pas. C'est une
  décision d'écran prise après mesure : sur un appareil, une source injoignable n'est **jamais**
  rangée en « service indisponible », donc le bouton n'apparaissait sur aucune panne réseau. La
  limite est celle du moteur et elle est écrite ; l'application en corrige la conséquence pour les
  deux codes qui décrivent un service absent, et laisse un refus d'identifiants sans bouton — rejouer
  le même mot de passe donnerait le même refus.

  **Vérifié sur iPhone**, parcours froid et chaud, avec les chemins dégradés joués un par un et
  produisant chacun un écran distinct. La livraison à chaud a été jouée en conditions réelles sur le
  bucket de production : une version volontairement cassée publiée, reçue et jouée par l'appareil,
  puis la correction publiée et reçue — **sans que rien ne soit réinstallé entre les deux**.

  Ce qui **ne change pas** : le verrou biométrique, le stockage chiffré, le navigateur intégré, la
  distinction froid/chaud, et la promesse que les identifiants ne vont qu'au CAS de l'université.

- **L'emploi du temps joué par le moteur, et un serveur en moins** (jalon
  [6-E](docs/phase-6/6-e-planning.md)). `PlanningApiService` et `CampusApiService` n'émettent plus
  aucune requête : six [Blueprints](docs/blueprints.md) portent les six appels que l'application joue
  réellement — la liste des groupes, une journée, une semaine, la plage annuelle de synchronisation,
  la liste des salles, l'occupation d'un bâtiment. `axios` et `qs` disparaissent des deux services et
  de `ScheduleList`.

  **Le relais `ukit.kbdev.io` sort de l'architecture.** Il existait parce qu'une page web ne peut pas
  appeler un autre domaine sans son accord, et que l'application était une WebView ; une requête
  émise nativement depuis l'appareil n'y est pas soumise. Les Blueprints visent
  `celcat.u-bordeaux.fr` directement — un serveur à héberger, à payer et à surveiller en moins. Trois
  conditions ont été mesurées avant de basculer et sont consignées dans
  [sources-externes.md](docs/sources-externes.md) : le serveur ne filtre ni sur `Origin`, ni sur
  `Referer`, ni sur l'`User-Agent`.

  **Et le relais était déjà tombé.** Il répondait `522` à chacune des trois sondes du jour de la
  bascule : le planning des utilisateurs sans cache était en panne. Ce jalon est donc autant une
  réparation qu'une migration.

  Vérifié sur iPhone : vue jour et semaine identiques, planning agrégé, synchronisation calendrier
  sans doublon, et les trois familles d'échec produisant trois écrans distincts. Captures dans
  [docs/features/planning.md](docs/features/planning.md). Deux points restent **non vérifiés** et sont
  écrits comme tels : la tâche de fond application fermée, et le réseau Wi-Fi (les sondes ont été
  jouées en 4G) — voir [6-e-planning.md](docs/phase-6/6-e-planning.md).

  **Le cache n'a pas bougé d'un octet.** Il enveloppe l'appel, avant comme après — c'est ce qui rend
  la bascule invisible sur la seule fonctionnalité que l'application promet de faire marcher hors
  ligne, et c'est aussi ce qui permettrait de la défaire.

  Ce qui reste applicatif est écrit, et ce n'est pas rien : le rejet des vacances *et* le refiltrage
  sur la date exacte — **un filtre, un endroit**, contrairement au fichier de référence qui les
  dédoublait —, le nettoyage des descriptions, l'extraction du code d'UE, le tri double, le découpage
  de la semaine, et les calculs de plage qui ont besoin de l'heure courante.

- **Un interrupteur « hors ligne » dans le menu de développement.** Il coupe le réseau de
  l'**application** — `isConnected()` et le `fetch` du moteur — sans toucher à celui de l'appareil,
  donc sans perdre Metro. Le mode avion, lui, coupe la session de développement : en pratique on
  finissait par ne pas tester le chemin dégradé, celui qui décide de l'expérience réelle. Les deux
  volets sont nécessaires — sans le second, les écrans Campus ne verraient rien, ils ne consultent
  pas `NetInfo`. Ne couvre pas la WebView de l'Act II, ce qui est écrit.
  [docs/qualite.md](docs/qualite.md)

- **Le planning distingue enfin ses échecs** (jalon [6-E](docs/phase-6/6-e-planning.md)). Une source
  injoignable affiche « Service indisponible » avec Réessayer, une réponse inattendue le dit sans
  proposer de rejouer, et une journée légitimement vide garde sa carte « pas de cours ». Un échec
  réseau sans cache **laissait auparavant l'indicateur de chargement tourner indéfiniment** ; il
  produit désormais un écran nommé. Le bandeau de cache daté, lui, est inchangé.

- **Les sources de campus jouées par le moteur** (jalon [6-D](docs/phase-6/6-d-campus.md)).
  `CrousService` et `LibraryService` n'émettent plus aucune requête : cinq
  [Blueprints](docs/blueprints.md) portent les cinq appels que l'application joue réellement —
  restaurants, menu d'un restaurant, sites d'un point de balayage, affluence, horaires d'une semaine.
  Les URLs, les en-têtes imités du client web Affluences et les constantes de protocole deviennent des
  fichiers corrigeables à distance ; `axios`, `qs` et `fetch` disparaissent des deux services.

  **La frontière s'écrit ici, en pratique.** Le balayage géographique en douze points reste
  applicatif, et pour trois raisons dont aucune n'est un manque du moteur : la liste des villes
  couvertes est une décision produit, le filtre de catégorie demanderait d'indexer une liste dans un
  prédicat — refusé par les deux moteurs, volontairement — et Haversine est du calcul, qu'il faudrait
  sinon réimplémenter à l'identique deux fois.

  **Les écrans distinguent enfin les échecs.** Une source injoignable affiche « Service
  indisponible » avec Réessayer, une réponse inattendue le dit sans proposer de rejouer, et une liste
  légitimement vide garde son état vide. Trois écrans différents là où il n'y en avait qu'un.

  Et une nuance que l'ancien code ne savait pas exprimer : **une couverture partielle se dit**. Deux
  points de balayage muets sur douze n'emportent plus les dix autres — la liste s'affiche, avec un
  bandeau qui signale qu'elle est peut-être incomplète.

- **Le référentiel des bâtiments gagne sa surcouche distante** (jalon
  [6-D](docs/phase-6/6-d-campus.md)). `assets/locations.json` reste le socle embarqué — l'application
  doit être complète hors ligne et au premier lancement — et la table `batiments` le corrige **champ
  par champ**, sans jamais écraser une valeur avec du vide. Un horaire faux, une coordonnée décalée ou
  un visuel à remplacer se corrigent désormais sans release, ce qui est le défaut le plus banal de ce
  référentiel.

- **La livraison des Blueprints** (jalon [6-C](docs/phase-6/6-c-livraison.md)). C'est le jalon où la
  phase commence à payer : **corriger une source devient une publication de fichier, pas une
  release**. Le registre résout chaque [Blueprint](docs/blueprints.md) entre le socle embarqué dans
  le binaire et une surcouche publiée sur la base ; `npm run blueprints:publish` valide, téléverse,
  calcule les empreintes et régénère le manifeste, et la correction atteint les appareils au retour
  au premier plan suivant.

  Les deux propriétés qui décident du reste : la résolution **ne touche jamais au réseau** — un run
  n'attend pas un CDN pour savoir quoi jouer — et le rafraîchissement **ne lève jamais**, il rend un
  rapport. Un point de publication en panne ne devient pas une application en panne.

  Un Blueprint distant est de la donnée exécutable, et il est traité comme telle : empreinte SHA-256
  revérifiée à **chaque lecture**, validation complète avant mise en cache, périmètre de secrets
  fermé, version strictement supérieure, et un nom absent du binaire reste refusé. Ces neuf gardes
  sont couvertes par des tests unitaires jouant le vrai registre.

  Et parce qu'un mécanisme de déploiement sans retour arrière n'en est pas un, trois interrupteurs
  d'arrêt : `--desactiver` ou `--arret` côté publieur, un bouton « Embarqué » dans l'application, et
  `BLUEPRINTS_REMOTE=false` à la construction. Le menu de développement gagne un onglet
  **Blueprints** qui dit, pour chacun, sa version, son origine et la raison du dernier
  rafraîchissement — la question « pourquoi ma correction n'arrive pas » se répond en trois secondes.

- **La base de publication, et les annonces qui y passent** (jalon
  [6-B](docs/phase-6/6-b-supabase.md)). UKit a désormais un dos : un projet Supabase mince, dont le
  schéma et les politiques d'accès vivent dans [`supabase/`](supabase/) et s'appliquent depuis ces
  fichiers. Les annonces de vie étudiante y sont lues, visuels compris ; le dépôt `ukit-data` servi
  par jsDelivr cesse d'être écrit, et son repli est retiré. Le référentiel des 73 bâtiments y est
  migré mais pas encore lu — c'est le jalon 6-D qui le branchera.

  Ce que la base **ne** change **pas** mérite d'être dit aussi clairement : aucun compte n'est
  requis, aucune donnée personnelle ne la traverse, et l'application démarre et s'utilise
  entièrement sans jamais la joindre. C'est un point de publication, pas un intermédiaire — le
  [README](README.md) et [PRIVACY](PRIVACY.md) sont reformulés dans ce sens.

  Et le gain visible, enfin : **le modèle d'erreur atteint son premier écran**. Une panne de la
  source affiche « Service indisponible » et un bouton Réessayer, là où elle produisait une liste
  vide indistinguable d'une absence d'annonces ; le carrousel du tableau de bord ne disparaît plus
  en silence. Le bouton n'apparaît que si réessayer peut réparer quelque chose. Au passage, une
  annonce sans date d'expiration ne disparaît plus de l'écran — la base la publie, le code la
  masquait.

- **Le socle du moteur Aetherius et la première source migrée** (jalon
  [6-A](docs/phase-6/6-a-socle.md)). L'application embarque `@aetherius/engine` et
  `@aetherius/react-native`, sait jouer un [Blueprint](docs/blueprints.md) depuis n'importe quel
  service, et **les annonces de vie étudiante y passent déjà**, derrière la signature inchangée de
  `BdeService.fetchAnnonces` — l'ancien chemin reste en repli jusqu'au jalon 6-Z. Rien ne change
  pour l'utilisateur : c'est la fondation des sept jalons suivants.

  Le vrai apport est le **modèle d'erreur**. Les services rendaient `null` ou `[]`, ce qui rendait
  une panne du fournisseur et une réponse légitimement vide indistinguables ; un échec est désormais
  rangé dans l'une des neuf familles du moteur, traduite en message dans les trois dictionnaires.
  Le Blueprint des annonces a gagné au passage l'extraction de la description longue, qu'il oubliait,
  et une assertion sur la forme de la réponse — sans elle, une clé disparue produirait un succès à
  liste vide.
- **Un premier harnais de test automatisé**, borné au socle du moteur : `npm test`
  ([vitest](https://vitest.dev)) couvre la résolution des secrets, le registre de Blueprints et la
  table du modèle d'erreur. `npm run parity` rejoue le Blueprint des annonces contre la vraie source
  et le compare au service historique. [docs/qualite.md](docs/qualite.md)
- **Cadrage et squelette de la Phase 6** — la façon d'atteindre les sources distantes va quitter le
  binaire pour devenir des [Blueprints](docs/blueprints.md) joués par le moteur Aetherius embarqué,
  publiés depuis une base et corrigeables sans release. Ce changement pose la documentation de phase
  ([docs/phase-6/](docs/phase-6/README.md), huit jalons spécifiés), les deux documents transverses
  ([blueprints.md](docs/blueprints.md), [backend.md](docs/backend.md)), le socle de code
  (`src/shared/aetherius/`, `src/shared/supabase/`), les six Blueprints de référence dans
  [`blueprints/`](blueprints/), le schéma et les politiques de la base ([`supabase/`](supabase/)) et
  le [harnais de parité](tools/parity/README.md).
- **Onglet Campus et son tableau de bord** — quatre sections indépendantes (annonces, restaurants,
  bibliothèques, salles libres) au-dessus d'un socle de liste commun : recherche, filtres persistés,
  favoris, tri par distance, états vides. La position de l'utilisateur est résolue une seule fois pour
  tout l'onglet. [docs/features/campus.md](docs/features/campus.md)
- **Détecteur de salles libres** — reconstruction des bâtiments depuis les salles Celcat, croisement
  avec les horaires d'ouverture déclarés dans `locations.json`, et calcul des créneaux libres par
  heure avec leur durée de disponibilité.
  [docs/features/campus-salles-libres.md](docs/features/campus-salles-libres.md)
- **Recherche et filtres** sur les listes de restaurants et de bibliothèques, avec persistance du
  filtre choisi, propagée aux sections du tableau de bord.
- **Annonces de vie étudiante** — contenu éditorial publiable sans mise à jour de l'application, avec
  activation et date d'expiration. Servi à l'origine depuis le dépôt `ukit-data` via jsDelivr, puis
  depuis la [base de publication](docs/backend.md) au jalon 6-B.
  [docs/features/campus-vie-etudiante.md](docs/features/campus-vie-etudiante.md)
- **Onglet Scolarité** — connexion au compte universitaire par CAS dans une WebView invisible,
  récupération de l'identité de l'étudiant au premier login puis rafraîchissement léger de la
  messagerie aux lancements suivants, verrou biométrique, et navigateur intégré avec remplissage
  automatique du formulaire de connexion. Identifiants et données personnelles stockés chiffrés, sans
  jamais quitter l'appareil. [docs/features/scolarite.md](docs/features/scolarite.md)
- **Rappels de cours** — notification programmée avant chaque cours du planning favori, avec délai
  réglable, reconstruction complète à chaque planification et plafond de vingt rappels pour rester
  sous la limite du système. [docs/features/settings.md](docs/features/settings.md)
- **Nouvelle navigation** — quatre onglets avec barre personnalisée, bouton d'action contextuel selon
  l'onglet actif, et animation d'en-tête au défilement centralisée dans des helpers partagés.
  [docs/navigation.md](docs/navigation.md)
- **Nouveau parcours de planning** — fusion des vues jour et semaine dans un écran unique avec bascule
  de mode, curseur de dates couvrant l'année scolaire, et carrousel pour les cours simultanés.
  [docs/features/planning.md](docs/features/planning.md)
- **Écran Réglages refondu** — sections thématiques, modales de langue, de filtres d'UE, de choix de
  calendrier et de réinitialisation.
- **Socle de documentation** — [README](README.md) comme document maître,
  [CONTRIBUTING](CONTRIBUTING.md) portant la définition de « terminé », et [`docs/`](docs/) détaillant
  architecture, conventions, navigation, persistance, sources externes, thème, i18n, cartographie,
  plateforme, qualité, plus une documentation par domaine fonctionnel.

### Corrigé

- **Se connecter échouait sur « impossible de vérifier tes identifiants », avec les bons
  identifiants.** La vérification reposait sur une déduction — *si un formulaire apparaît, c'est que
  le CAS a accepté* — qui cesse d'être vraie dès que la session persiste. Fermer la session du CAS
  avant de valider ne suffisait pas : le service garde son propre cookie, mesuré. La preuve est
  désormais **demandée** au CAS (`renew=true`), qui redemande les identifiants même si un ticket vit.

- **Le logo de l'établissement manquait sur l'écran de connexion.** Il ne vivait que dans la ligne
  publiée, appliquée en asynchrone au lancement : un écran monté avant elle gardait le repli.


- **La biométrie était demandée une fois de trop, et pas là où il aurait fallu.** Le drapeau « déjà
  authentifié » vivait dans un composant qui se démonte à chaque parcours froid : on redemandait une
  empreinte après chaque actualisation du dossier. Il vit désormais au niveau du module — ce que
  « une fois par lancement » voulait dire. Au passage, la fiche du compte, atteignable depuis les
  Réglages, s'ouvrait **sans rien demander** alors qu'elle montre plus que l'onglet gardé : elle
  partage maintenant la même porte.

- **Se connecter pouvait échouer sur « impossible de vérifier tes identifiants » avec les bons
  identifiants.** La fermeture de la session distante était refusée en silence quand un run tournait
  encore ; la session CAS restait donc ouverte, aucun formulaire n'apparaissait, et rien ne prouvait
  les identifiants. Le moteur est désormais libéré — et **attendu** — avant ce geste.


- **Actualiser son dossier pouvait être refusé sans que rien ne le dise.** Demander une actualisation
  pendant le parcours du lancement se heurtait à la règle « une seule session à la fois » : le bouton
  paraissait mort, et le refus n'existait que dans le terminal. Une demande portée par un geste passe
  désormais devant une session de fond.

- **Le formulaire de connexion perdait la page à mi-parcours.** Le CAS accepte au dixième step sur
  vingt, donc les identifiants sont posés bien avant la fin : la condition qui gardait le formulaire
  retombait à faux et l'écran basculait d'un coup. Il garde la page jusqu'au terme.


- **L'écran du compte se refermait tout seul, et pour deux raisons différentes.** À la déconnexion, il
  attendait la fermeture de la session distante — quelques secondes — puis se refermait *pendant qu'on
  retapait ses identifiants*. À la connexion, il se refermait à mi-parcours, parce que le CAS accepte
  au dixième step sur vingt alors que le dossier reste à lire. Il ne se referme plus : l'écran montre
  déjà la suite.

- **Une validation d'identifiants pouvait rester en attente indéfiniment**, et se faire résoudre par un
  run ultérieur — ce qui refermait l'écran au milieu d'un rafraîchissement. Elle se solde désormais à
  la fin de chaque run.


- **Le logo de l'établissement était minuscule et illisible en thème sombre.** Un logo d'université
  est un logotype large — mesuré à 2,86:1 pour l'Université de Bordeaux — et il était posé dans le
  carré prévu pour une icône. Il a désormais son propre gabarit, et un fond blanc dans les deux
  thèmes, comme le logo de UKit sur la page À propos.

- **Fermer l'écran du compte après un geste long ne fait plus crier le navigateur.** Valider des
  identifiants rejoue une connexion complète : entre l'appui et la fin, on a le temps de quitter
  l'écran soi-même, et la fermeture différée tentait alors de dépiler un écran déjà parti.


- **Le gel à l'ouverture d'un service venait de la synchronisation des cookies, et il s'aggravait.**
  `sharedCookiesEnabled` ne sert pas à partager entre vues web — elles partagent déjà le même magasin —
  mais à y recopier celui des requêtes natives : **tous** les cookies de l'application, un par un,
  chacun avec un aller-retour, **sur la file principale**. Plus on ouvrait de services, plus le magasin
  grossissait, plus le gel durait. L'option est retirée ; la pré-authentification, elle, ne dépendait
  pas d'elle. Une première tentative avait déplacé le montage après l'animation d'écran : ça ne
  faisait que rallonger l'attente, parce que déplacer un coût n'est pas le supprimer.

- **Le script injecté changeait en pleine charge de page.** Il dépend du trousseau, lu en asynchrone :
  la vue se montait avec un script provisoire, remplacé une fraction de seconde plus tard. On attend
  désormais la réponse du trousseau — locale et rapide — avant de monter.

- **Le titre de l'écran du compte ne tenait pas.** « Compte universitaire » était tronqué ; il dit
  « Compte », comme le bouton qui y mène.


- **Ouvrir un service figeait l'application une demi-seconde.** Créer la vue web native et lancer sa
  première navigation se produisait **pendant** l'animation de poussée de l'écran : les deux se
  disputaient la même frame. La vue ne se monte plus qu'une fois l'animation terminée. Le symptôme
  s'est vu quand le reste est devenu rapide — il était noyé dans l'attente d'authentification tant
  qu'il fallait se connecter à chaque fois.

- **Une valeur longue écrasait son libellé dans les réglages.** « Institution » s'affichait à la
  verticale, une lettre par ligne, dès que le nom de l'établissement était long. Ce n'était pas un
  problème de longueur mais de gabarit : le libellé portait `flex: 1` et la valeur n'avait aucune
  contrainte. La valeur cède et se tronque désormais, ce qui vaut pour **toutes** les lignes de
  réglage, pas seulement celle-là.

- **Un dernier disque a rejoint la signature de forme.** La surface d'icône de l'écran de progression
  était un cercle, là où toutes les surfaces de 40 points de l'application sont des carrés arrondis.


- **Le compteur de messages non lus a cessé de fonctionner, et c'était la rançon du succès.** Depuis
  que la session persiste, le CAS n'affiche plus de formulaire — le Blueprint attendait un champ qui
  n'apparaîtrait jamais et abandonnait au bout de 20 s. Les trois parcours de portail demandent
  maintenant à la page s'il y a un formulaire avant de jouer le bloc de connexion. Le parcours chaud
  y gagne **15 secondes**, qui étaient une pause d'après-clic qu'on ne clique plus.

- **Une revalidation d'identifiants pouvait enregistrer un mot de passe faux.** Le même changement
  l'a révélé : avec une session ouverte, « Ressaisir mes identifiants » traversait sans que le CAS
  vérifie quoi que ce soit, et le couple était écrit comme s'il avait été accepté. L'application ferme
  désormais la session avant toute revalidation, et l'événement qui autorise l'écriture n'est émis que
  si le CAS s'est réellement prononcé.


- **La porte ENT menait dans le vide, et depuis longtemps.** `ent.u-bordeaux.fr` ne résout plus :
  ouvrir l'ENT depuis l'application rendait `A server with the specified hostname could not be found`,
  **y compris sur la version en production**. Le portail vit sur `intranet.u-bordeaux.fr`. Corrigé par
  une publication de catalogue, sans release — et la description du Blueprint du dossier l'écrivait
  déjà noir sur blanc, mais l'écran était resté sur l'ancien nom.

- **Moodle demandait de choisir son établissement dans une liste de 56.** Sa page d'entrée n'est pas
  une connexion mais une page de découverte Shibboleth, qu'aucune session ne dispense de remplir. Elle
  est franchie automatiquement, et le choix est mémorisé pour la session. Côté Bordeaux INP il n'y a
  pas de page de ce genre : Moodle y part droit sur le CAS, donc la session suffit.


- **Le remplissage automatique du formulaire CAS ne marchait pas, pour deux raisons indépendantes.**
  Son hôte était écrit en dur (`cas.u-bordeaux.fr`), donc il n'avait **jamais** fonctionné pour un
  étudiant de Bordeaux INP ; et sa détection d'erreur cherchait `.errors`, qui **existe déjà vide**
  sur la page de connexion propre — le script concluait qu'une erreur était affichée et sautait le
  remplissage. Les deux sont corrigés, mais le sujet a surtout changé de nature : le navigateur
  s'ouvre désormais déjà connecté, et ce script n'est plus qu'un filet pour un ticket expiré.


- **L'établissement s'appelle « Collège Sciences et Technologies »**, plus « Université de Bordeaux ».
  Le périmètre réellement porté est celui du collège — c'est son Celcat qu'on interroge, ses bâtiments
  qu'on référence, ses groupes qu'on propose. Annoncer l'université entière promettait des formations
  que l'application ne sert pas. **Seul le nom change** : le code d'établissement, qui partitionne le
  trousseau, les réglages et les favoris, ne bouge pas — personne n'est déconnecté ni ne perd ses
  groupes.

- **`username` ne s'affiche plus deux fois** dans l'écran du compte. La même valeur figurait sous le
  même libellé dans « Profil » et dans « Identifiants », sur un écran qui tient sur une hauteur.


- **Deux exports morts de l'onglet Scolarité sont supprimés.** `ApogeeCard.tsx` était défini et monté
  nulle part, et le point d'entrée `apogee` du navigateur intégré n'était atteint par aucun appel de
  navigation : la carte d'accès aux notes existait dans le code sans exister à l'écran. Une rangée
  générique pilotée par le catalogue la remplace — *un export mort fait croire à une capacité*.


- **Le catalogue en cache ne rend plus de valeurs absentes.** Il garde des établissements **déjà
  projetés** : un champ ajouté par une mise à jour restait donc vide sur les appareils qui avaient déjà
  un cache. Le symptôme était une requête `…/regions/None/restaurants` et des restaurants introuvables ;
  la même cause aurait fait croire à un abonnement d'emploi du temps là où il n'y en a pas.

- **L'écran du compte propose de se connecter au lieu d'afficher une fiche vide.** Il supposait qu'on
  y arrivait connecté — vrai tant qu'on n'y accédait que depuis l'onglet Scolarité, faux depuis que les
  Réglages y mènent : on y trouvait six tirets et un bouton « Se déconnecter » sans rien à déconnecter.

- **Le bouton de connexion ne reste plus figé à l'accueil.** La session partait bien et allait au bout,
  mais l'indicateur ne retombait jamais : le formulaire comptait sur le tableau de bord pour le
  remplacer, ce qui n'arrive pas pendant le parcours d'accueil.

- **La liste des groupes suit enfin l'établissement.** Elle était purgée sur le disque mais survivait
  **en mémoire** : choisir Bordeaux INP à l'accueil proposait les six cents groupes de Bordeaux, et le
  favori retenu produisait ensuite « ce groupe n'existe plus » — pour un groupe qui existe
  parfaitement, à l'université qu'on venait de quitter.

- **Le démarrage ne demande plus les groupes à la mauvaise université.** Les listes étaient chargées
  **avant** que le code d'établissement persisté ne soit restauré : un étudiant de Bordeaux INP dont le
  cache avait expiré voyait partir une requête vers le serveur de Bordeaux, dont la réponse écrasait sa
  liste. Le cache durant une semaine, le défaut n'était visible qu'un jour sur sept.

- **L'accueil ne propose plus un tri par année qui ne trie rien.** Les pastilles année/semestre
  reposent sur une convention de nommage propre à Celcat Bordeaux ; depuis que Bordeaux INP a un emploi
  du temps, ses treize groupes n'en rencontraient aucune et la liste restait vide. Elles ne s'affichent
  plus que pour la source qui les justifie — treize entrées se lisent d'un coup d'œil.

- **La Scolarité ne demande plus un mot de passe à qui ne peut pas s'en servir.** Un établissement sans
  portail affichait un formulaire de connexion qui ne pouvait mener nulle part, parce que la branche
  « pas de compte » était testée en premier et gagnait toujours. L'écran dit maintenant que
  l'université n'est pas encore reliée.

- **Le Planning dit l'absence d'emploi du temps au lieu de réclamer des groupes favoris.** Une
  université sans serveur interrogeable n'a jamais de groupes favoris : l'écran « ton planning est
  vide, cherche un groupe » gagnait donc toujours, avec un bouton menant à une recherche qui ne peut
  rien trouver. La **section « salles libres »** disparaît pour la même raison — elle se reconstruit
  depuis les salles du même serveur.

- **Un Blueprint ne peut plus s'appuyer sur un sélecteur qu'un seul moteur comprend.** Le portail du
  second établissement avait été écrit avec `:text-is()` et `:nth-match()` : ces pseudo-classes
  appartiennent à **Playwright**, donc au moteur Python qui sert à mettre un fichier au point depuis un
  poste. Le moteur embarqué résout par `document.querySelectorAll` et les rejette comme CSS invalide —
  le run passait le CAS puis mourait à l'extraction, avec un message sans rapport avec la cause.
  Réécrit en **XPath**, seul langage de sélection que les deux moteurs partagent, et un test refuse
  désormais ces pseudo-classes dans n'importe quel Blueprint du dépôt.

- **Un établissement retiré du catalogue ne bascule plus personne en silence.** Il disparaissait aussi
  du cache : il cessait de résoudre, l'application retombait sur l'établissement historique, et posait
  quelqu'un sur une autre université sans un mot. Le rafraîchissement **reporte** désormais
  l'établissement sélectionné depuis le cache quand la base ne le publie plus — il continue de
  fonctionner — et l'avertissement couvre aussi le cas où le cache l'a perdu, où le repli reste la
  seule issue mais cesse d'être muet.

- **Changer d'établissement se propage enfin aux écrans déjà ouverts.** Le code de l'université passe
  par `AppContext`, à côté du thème et des groupes favoris : sans ça, un onglet monté gardait l'état de
  l'établissement précédent — la section des salles libres restait masquée après un retour à Bordeaux.
  Le contexte de scolarité oublie en plus ce qu'il garde **en mémoire** : le trousseau était vidé, mais
  l'onglet affichait encore le prénom de l'étudiant de l'autre fac.

- **La réinitialisation déconnecte enfin la session universitaire.** `resetSettings` n'avait jamais
  touché au trousseau — sans conséquence tant que l'application ne connaissait qu'une université, mais
  faux dès que la réinitialisation rouvre un parcours d'accueil qui **redemande l'établissement** : on
  pouvait repartir sur une autre fac en restant connecté au portail de la précédente. Elle passe
  désormais par la même purge que le changement d'établissement. Trouvé sur appareil, pendant la
  campagne de vérification du jalon 6-G.

### Ajouté (vie étudiante)

- **Une annonce peut porter une galerie et un lieu.** La colonne `images` (tableau d'URLs) affiche
  ses visuels sous la description, chacun à son ratio ; `lat`/`lng` termine la fiche par la même
  carte « S'y rendre » que les fiches de restaurant et de BU. Les deux sont facultatives et omises
  proprement. Le bouton d'action d'un lien web ouvre désormais le **navigateur intégré** au lieu de
  quitter l'application. La fiche elle-même quitte le texte brut : émetteur en pastille partagée,
  accroche en ligne d'information — elle débordait de l'écran en pastille étirée — et ses gouttières
  s'alignent sur celles des boutons et du reste de l'application : le texte flottait plus près du
  bord que tout le monde. Et la description devient un **mini-langage publiable**, rendu dans le
  vocabulaire des fiches : `# icone|Titre` fait une tête de section colorée avec son icône (le carré
  teinté des fiches resto/BU), `- ` fait une puce comme les plats d'un menu, et la colonne
  `couleur` donne à l'annonce son **identité** — la pastille d'émetteur (sur la fiche comme sur les
  cartes du campus), l'accroche en pastille assortie multi-ligne, et le départ du cycle des couleurs
  de sections. Un BDE structure et colore son annonce sans release.
  [docs/features/campus-vie-etudiante.md](docs/features/campus-vie-etudiante.md)

- **La fiche d'un bâtiment porte sa carte.** La section « S'y rendre » arrive aussi dans les salles
  libres, en pied de liste, avec la tête de section verte de la disponibilité — et toutes les pages
  de détail s'appellent désormais « Détails », le nom du lieu vivant dans leur bandeau. L'état
  « Bâtiment fermé » prend le même bloc d'état que la journée sans cours du Planning : même nature
  d'information, même rendu.

- **Les tuiles de la grille Scolarité portent leur silhouette.** Une grande enveloppe, un grand
  dossier, un livre ouvert en filigrane à ~6 % d'opacité, rognés par le coin bas droit —
  l'identité en transparence, le geste posé par le logo d'établissement, devenu un composant du
  socle (`GlypheFiligrane`) avec ses règles d'usage consignées dans les décisions durables.

### Corrigé

- **Les pieds d'action flottent, dans le vocabulaire de la barre de recherche.** Le bouton d'une
  annonce et la réservation d'une BU deviennent des objets posés sur le contenu — ombre partagée,
  dégradé d'amortissement au-dessus, comme la recherche des listes Campus — portés par un composant
  du socle (`PiedFlottant`) et une règle écrite : une action qui survole le contenu parle comme la
  barre de recherche, un bandeau fixe reste opaque. Le fond des flottants est la **fumée** — un flou
  progressif teinté du fond de page, jamais opaque : la bande pleine cachait tout sous le bouton et
  rien au-dessus, et l'agrandir aurait posé un nuage noir en thème sombre. Le gabarit est unifié
  dans les deux sens : la barre de recherche prend la hauteur du bouton primaire (50), le dégagement
  du bord des pieds d'action — elle rasait l'indicateur d'accueil — et la même fumée. Sa transition
  est une **fumée de flou** : un flou plein masqué par un dégradé (`MaskedView`) — le flou lui-même
  s'estompe continûment, sans jamais avoir de bord — sous un léger voile de lisibilité (~35 %). Cinq
  formes essayées (bande opaque, bande floue, flou par tranches, voile de teinte, flou masqué) :
  seule la dernière montre le contenu flouté sans frontière ni nuage. Android, qui ne sait pas
  masquer un flou natif, reçoit le flou plein sous le voile. [docs/theme.md](docs/theme.md)

- **Les cartes retrouvent un beau fond, réellement gratuit.** CARTO a mis ses fonds sans clé sous
  filigrane « API key required » ; les tuiles standard d'OSM, publiques, sont trop chargées pour une
  bannière de fiche. Les cartes passent sur **OpenFreeMap** — le style Positron (celui de CARTO,
  passé en open source), sans clé, autorisé en production — rendu par MapLibre GL à la place de
  Leaflet, marqueurs identiques, et l'attribution redevient visible : la politique d'usage des
  données OSM l'exige. OpenFreeMap rejoint les crédits de l'écran À propos.
  [docs/cartographie.md](docs/cartographie.md)

- **Les groupes favoris ne disparaissent plus au hasard des redémarrages.** La restauration des
  réglages notifiait en chemin (la langue avant les favoris), et la sauvegarde déclenchée écrasait
  alors le stockage avec des favoris vides — perdus au démarrage suivant si aucun réglage ne
  notifiait ensuite. L'écriture des réglages est désormais verrouillée jusqu'à la fin du chargement.
  [docs/donnees-et-persistance.md](docs/donnees-et-persistance.md)

### Modifié

- **La barre d'onglets parle comme les flottants, et Campus gagne son bouton mystère.** La fumée des
  pieds d'action s'installe derrière la barre d'onglets — elle survole le contenu, elle parle donc
  pareil. Et l'emplacement d'action de l'onglet Campus, le seul vide des quatre, devient un teaser :
  contenu flouté, cadenas, modale « Bientôt disponible » — la capacité arrivera sans que la barre
  change de forme. Les trois boutons d'action existants, écrits en trois copies, deviennent un
  composant.

- **La recherche arrive sur les annonces, et gagne un seuil partout.** La grille des annonces se
  cherche par titre, émetteur et accroche. Et la barre n'apparaît plus qu'à partir de quatre
  éléments (huit pour la grille, qui en range deux par rangée) : chercher parmi trois cartes
  n'apporte rien, et sa fumée flottait sur un aplat nu. Une requête saisie garde toujours la barre.
  Au passage, le champ du choix de groupes prend le gabarit commun (hauteur 50), et les titres de
  sous-pages passent en 18 demi-gras, la métrique des barres d'iOS — un 22 gras claquait seul sur un
  fond profond, un titre de barre n'est pas un titre de page.

- **Les notes et les examens deviennent un teaser assumé.** Les deux rangées sans contenu de rentrée
  passent sous un flou (`expo-blur`), un cadenas au centre ; les toucher ouvre une modale
  « Bientôt disponible », qui garde un lien discret vers le service quand l'établissement en déclare
  un. Le déclencheur est la donnée — un widget sans Blueprint publié — donc le jour où la partie 2 de
  la v6 publie la source, le flou tombe sans mise à jour.
  [docs/features/scolarite.md](docs/features/scolarite.md)

- **Le logo de l'établissement devient un filigrane.** Monochrome, sans fond ni filet — l'usage
  « niveaux de gris » d'un kit de marque —, plus grand que l'ancienne vignette sur carré blanc qui
  flottait en thème sombre, et centré sur la hauteur du bloc titre + accueil + date, ce qui l'ancre
  au texte. Sa taille se calcule du **ratio mesuré** du logo : une hauteur commune égalise la masse
  visuelle entre un logotype étiré et un logo trapu. Le titre reste « Scolarité » : la salutation a
  été le titre le temps d'un essai, défait le jour même — un titre au contenu variable casse sa
  ligne au premier prénom composé. Et la **fraîcheur** (« mis à jour il y a 12 min ») quitte
  l'en-tête pour la droite de l'intertitre « En un coup d'œil » : elle qualifie le cache des widgets,
  pas la page.

- **Le violet redevient la couleur d'action, partout.** Les titres de sous-pages passent en neutre —
  un titre en couleur d'action se lit comme un bouton — et les deux fiches qui surchargeaient le leur
  en violet ne le font plus. Les catégories d'un menu (« Entrées »…) deviennent des intertitres en
  petites capitales, et les sections des fiches de restaurant et de BU gagnent **une couleur par
  section** (déjeuner solaire, dîner nocturne, horaires, « S'y rendre ») — la palette du Planning et
  de la grille Scolarité, au lieu d'un accent employé partout. L'écran des filtres efface son titre
  au défilement, comme les autres. Et une journée sans cours s'illustre de **confettis** : c'est une
  bonne nouvelle, l'icône sourit, le texte ne change pas.
  [docs/theme.md](docs/theme.md), [docs/features/campus-crous.md](docs/features/campus-crous.md)

- **Les filtres d'UE ont leur écran, et les modales de choix parlent la langue de l'application.**
  Les filtres quittent leur modale plein écran — une sous-page qui ne disait pas son nom — pour un
  écran poussé au vocabulaire des Réglages, où retirer un filtre est une **croix visible** au lieu
  d'un appui long qu'aucun signe n'annonçait ; le champ se vide après l'ajout, et un abonnement qui
  s'empilait à chaque ouverture est défait. Les choix de langue, de calendrier et d'établissement
  remplacent leurs ronds à cocher par des **options à la forme des boutons** — contour au repos, fond
  teinté une fois choisie — suivies d'un bouton Confirmer : toucher prépare, Confirmer applique.
  L'établissement garde son avertissement de purge, après Confirmer seulement. La modale des
  propositions d'après-connexion aligne ses espacements au passage.
  [docs/features/settings.md](docs/features/settings.md)

- **La page Scolarité respire.** Deux intertitres en petites capitales — « En un coup d'œil », « Tes
  services » — séparent les flux des portes, le chiffre d'une tuile et son unité partagent une même
  ligne de base (« **790** non lus ») au lieu de s'empiler dans un carré trop haut, le milieu des
  tuiles se centre au lieu de laisser un trou
  quand il n'y a pas de chiffre, les unités s'accordent (« 1 non lu », « 1 document »), le logo
  d'établissement gagne un filet qui l'ancre en thème sombre, et la salutation revient à
  l'essentiel : « Bonjour » de 4 h à 19 h, « Bonsoir » ensuite, l'anniversaire par-dessus tout — les
  variantes de circonstance restent possibles par une règle publiée.
  [docs/features/scolarite.md](docs/features/scolarite.md)

- **La carte d'un restaurant ou d'une BU vit dans sa fiche.** Elle était un écran à part, derrière un
  bouton d'en-tête facile à ne jamais découvrir ; elle est désormais une section « S'y rendre » en
  pied de fiche, en bannière, comme la fiche de cours l'a toujours fait. L'écran carte plein-page et
  ses boutons disparaissent — le plan externe s'ouvre depuis le bouton posé sur la carte. Au passage,
  le rendu Leaflet écrit deux fois (fiche de cours, écran carte) devient un composant unique, et la
  fiche d'un restaurant ne charge plus son menu deux fois à l'ouverture.
  [docs/cartographie.md](docs/cartographie.md)

- **Les annonces prennent le format de leurs visuels : l'affiche.** Les communications associatives
  sont des carrés 1:1, pas des photos paysage — les cartes affichent désormais le visuel carré et
  plein cadre, avec un pied minimal (titre, émetteur en pastille) : l'affiche porte déjà la date, le
  lieu et le tarif, l'accroche ne les répète plus que sur la fiche. Une affiche n'est **jamais
  recadrée** : entière, sur un fond flou tiré d'elle-même quand son format n'est pas exactement
  carré. Le carrousel du tableau de bord montre environ deux affiches au lieu d'une, la liste
  complète devient une **grille de deux colonnes**, et la fiche épouse le ratio du visuel au lieu de
  le réduire dans un bandeau paysage.
  [docs/features/campus-vie-etudiante.md](docs/features/campus-vie-etudiante.md)

- **Les Blueprints de portail sont renommés** `ukit.portail.bordeaux.*`, et leurs secrets deviennent
  `portail_user` / `portail_pass` — neutres vis-à-vis de l'établissement, sans quoi chaque nouvelle
  université aurait exigé une release rien que pour un nom de secret. **Les clés du trousseau n'ont
  pas bougé : personne n'est déconnecté.** Une installation existante passe la mise à jour sans rien
  remarquer, son établissement étant réputé `bordeaux`.

- **Migration TypeScript intégrale** — plus aucun fichier `.js` ou `.jsx` dans `src/` : i18n,
  navigation, services, thème, composants d'interface, modules Planning, Campus, Scolarité, Settings
  et Onboarding, ainsi que les fichiers racine.
- **Nouvelle architecture de dossiers** — découpage par **domaine de navigation** (`src/features/`)
  au lieu du découpage par type technique, avec un `src/shared/` réservé au réellement transverse.
  Chaque feature porte ses écrans, composants, hooks et services.
  [docs/architecture.md](docs/architecture.md)
- **`DataService` éclaté** en services dédiés par domaine : accès Celcat côté planning et côté salles,
  managers observables séparés pour les groupes et les bâtiments.
- **Le rendu d'un échec de source est remonté dans `shared/ui/`** sous le nom `SourceFailureNotice` :
  le planning en avait besoin, et une dépendance croisée entre deux dossiers de `features/` est ce que
  l'architecture demande d'éviter. Les écrans Campus qui l'importaient sous son ancien nom ne changent
  pas.
- **Les deux pièces « calendrier système » sont sorties d'`AppCore`** vers
  [`CalendarSyncHelpers.ts`](src/shared/services/CalendarSyncHelpers.ts) : le fichier franchissait la
  limite de 400 lignes que le projet s'impose, et ce sont deux fonctions sans état.
- **Règles ESLint d'architecture** ajoutées comme garde-fous : taille de fichier, taille de fonction,
  profondeur d'imbrication, complexité cyclomatique, interdiction de `any`.
  [docs/qualite.md](docs/qualite.md)
- **Suppression de tous les types `any`** hérités de la migration, hors onze occurrences résiduelles
  signalées en avertissement.
- **Les salles libres sont sectionnées par étage**, du plus bas au plus haut : la question qu'on se
  pose devant la liste n'est pas « quelle salle » mais « combien de marches ». L'étage se déduit du
  chiffre des centaines du numéro de salle — 003 au rez-de-chaussée, 103 au premier — convention
  valable pour tout bâtiment du campus ; les salles sans numéro ferment la marche dans « Autres
  salles ». Dans chaque étage, le tri par durée reste.
- **Sur un campus non relié, l'onglet Scolarité devient un teaser — et le bouton Groupes aussi.**
  L'icône passe sous le voile flouté à cadenas — le vocabulaire du bouton mystérieux de Campus — et
  le toucher ouvre une modale dédiée dont l'action mène au formulaire de demande de campus. Le bouton
  Groupes suit le même sort quand l'emploi du temps passe par un lien personnel : la recherche n'a
  rien à chercher dans un inventaire qui n'existe pas. L'adresse du formulaire vient du catalogue
  (`services.adaptation`), comme celle de l'état vide : la publier ou la changer reste une
  publication, pas une release. La ligne « Autre université » du catalogue devient « Autre campus » —
  c'est la commune du campus qui compte dans toute l'application, pas l'institution.
- **Passe éditoriale sur le français.** Le tutoiement ne reste que là où l'application s'adresse
  vraiment à l'utilisateur — questions d'accueil, gestes demandés, permissions — et les tournures
  impersonnelles reprennent le reste ; les majuscules à l'anglaise disparaissent (« Vie étudiante »,
  « Salles libres ») ; les modales de teaser disent seulement que ça arrive, sans justifier ; les
  abréviations « sync. » redeviennent des mots. Les messages qui désignaient « cette université »
  alors qu'ils peuvent s'afficher sur « Autre campus » — où aucune université n'est désignée — sont
  reformulés en neutre : l'invitation à coller le lien iCal parle du lien, plus d'une fac fantôme.
  L'anglais et l'espagnol ne suivent que là où le sens a changé.
- **La fiche d'annonce devient un article, la carte sans visuel une affiche typographique.** La
  première vraie annonce longue — le patch note de la v6 — a mis quatre défauts sous les yeux, tous
  défaits : le cycle de couleurs balayait la palette entière sur sept sections, rouge de danger
  compris — toutes les têtes prennent désormais la couleur d'identité de l'annonce ; chaque bloc de
  texte vivait dans une carte grise bordée et la fiche se lisait comme un tableau de bord de widgets
  — le texte se pose sur le fond, les têtes colorées suffisent à structurer ; l'accroche en pastille
  empilait deux capsules identiques sous le titre et son icône la faisait passer pour un
  avertissement — c'est un chapeau maintenant, teinté, posé nu ; et la carte sans visuel était un
  carré de vide autour d'un pictogramme gris — l'accroche y est rendue en grande typographie sur
  fond teinté, façon carte d'Apple News, et sans accroche l'icône reste mais grande et teintée.
  L'ensemble prend la grammaire d'article : l'émetteur devient un **kicker** — petites capitales
  grises au-dessus du titre, sur la carte comme sur la fiche — à la place de la pastille colorée,
  du bruit répété sur les cartes et une capsule jumelle de l'accroche sur la fiche ; le titre de
  fiche passe en corps d'affiche avec le filigrane signature derrière le héros (permis là : une
  surface unique) ; le paragraphe d'ouverture est un lead, plus grand que le corps, et le blanc
  entre sections fait les chapitres. Le mini-langage gagne l'**exergue** (`> phrase`) — le
  pull-quote de presse, la citation en grand sur un filet teinté, ce qui casse la linéarité d'un
  long texte sans image — les **sous-puces** sur deux niveaux (`--`, `---`), indentées au signe
  dégressif, nées du premier vrai patch note qui listait des sections et leurs détails — le
  **transition** (`= phrase`), l'emphase moyenne entre le paragraphe et l'exergue : la phrase en
  plus grand sous un court trait teinté, le crosshead de presse (deux formes essayées et défaites :
  le surligneur à fond teinté faisait étiquette, la bascule à droite ne passait pas à la lecture) —
  le pied de lettre gagne la **plume en filigrane**, le geste de la Scolarité permis là parce que
  c'est un moment unique, pas un élément répété — la **signature** (`~ nom`),
  alignée à droite et teintée comme la fin d'une lettre — et l'article se clôt sur une marque de
  fin, le point teinté des colonnes de presse, qui s'efface quand une signature termine le texte :
  un nom qui signe est déjà une fin. Et une règle d'ensemble unifie les emphases (les premières
  formes se lisaient comme un brouillon de styles) : **les textes ne jouent que sur la taille et la
  graisse, la couleur vit dans de petits éléments** — l'exergue garde son filet teinté à gauche
  mais son texte passe à la couleur du thème, la transition garde son trait court, le chapeau passe
  au gris du « deck » de presse, et le guillemet en filigrane est défait avec le texte teinté. Le
  corps gagne le **gras en ligne** (`**mots**` dans un paragraphe ou une puce) : appuyer un mot
  sans changer de registre.
- **Les visuels d'une annonce s'ouvrent en plein écran.** Toucher l'affiche ou une image de la
  galerie ouvre une visionneuse — pincer pour zoomer, balayer pour fermer, toutes les images de la
  fiche à la suite. Le composant est partagé (`VisionneuseImages`, façade au-dessus de
  `react-native-image-viewing`) : les cartes des restaurants et autres visuels pourront s'y
  brancher sans réimporter la bibliothèque.
- **Un créneau à plusieurs cours ne notifie que le cours consulté.** Chaque cours d'un groupe
  superposé partait en notification — plusieurs à la même minute. Le filtre regroupe par
  chevauchement comme l'écran, et retient le cours que le carrousel a mémorisé — une mémoire rendue
  **réellement solide** : persistée (elle survit aux fermetures et redémarrages), resynchronisée
  après son chargement (montés avant la lecture du stockage — au rechargement Metro, toujours — les
  carrousels partaient de zéro), à **clé canonique sans date** (le choix se projette sur tous les
  jours au même créneau, quel que soit l'ordre dans lequel le serveur sert les cours), et au
  souvenir par **empreinte du cours** plutôt que par rang — un rang pointait un autre cours dès que
  l'ordre changeait, et la matière seule confondait deux TD parallèles d'une même UE : le choix
  retombait toujours sur le premier des deux, un faux état de base qu'aucun swipe ne déplaçait.
  L'empreinte ajoute la description et se cherche en deux temps, exacte puis matière seule — une
  salle qui change ne perd pas le souvenir. Les notifications attendent ce chargement avant de
  filtrer.
- **L'onglet Scolarité sans compte porte le grand titre des onglets** — posé exactement comme ceux
  de Campus et des Réglages — et son formulaire passe en bandeau compact : deux « Scolarité » à
  l'écran se seraient répété.
- **La modale de filtres des listes Campus rejoint le dialecte des Réglages.** Ses ronds à cocher
  étaient le dernier vestige de l'ancien style de choix, effacé partout ailleurs à la refonte : les
  options prennent la forme des boutons de l'application, coche à droite, emplacement réservé. Pas
  de bouton Confirmer, et c'est un choix — un filtre s'applique et se voit immédiatement derrière la
  modale. Les filtres des restaurants se renomment au passage : « Restaurants » et « Crous Market’ »
  — le nom de l'enseigne, invariable, pas de pluriel à inventer.
- **Un bâtiment fermé dit « Fermé ».** Le badge des cartes de salles libres empruntait le « Fermée »
  des bibliothèques, féminin à tort ici.
- **Les sections Campus perdent « universitaires »** : « Restaurants » et « Bibliothèques » — dans
  l'onglet Campus, le périmètre est évident, et les sous-pages portaient déjà les formes courtes. Le
  mot ne survit que là où il précise : les états vides, le descripteur de type d'une fiche, le compte
  et la session universitaires. Et « Vie étudiante » devient **« Annonces »** : le nom administratif
  ne disait pas le contenu, et toute la grammaire de la section — recherche, états vides, fiches —
  parlait déjà d'annonces.
- **La rangée « Lien iCal » des Réglages retrouve son icône.** `event-note` n'existe pas chez
  MaterialCommunityIcons et rendait un point d'interrogation ; la rangée prend `calendar-import`,
  l'icône de la page qu'elle ouvre. L'état vide du Planning qui attend le lien la prend aussi : le
  nuage barré dit « source injoignable », faux quand rien n'est en panne — il manque un geste, et
  l'icône est celle du geste, la même aux trois endroits du parcours.
- **Un libellé de bouton de dialogue ne se plie plus jamais sur deux lignes.** « Demander mon
  campus », plié en deux, faisait grandir son bouton et déséquilibrait la rangée. Toutes les modales
  posent désormais les mêmes props sur leurs libellés (`propsLibelleBouton`, une seule ligne qui
  rétrécit légèrement quand la place manque), et la modale du campus emploie la forme courte
  « Demander » — son titre porte déjà le contexte.
- **Le logo du formulaire de connexion passe en filigrane**, comme l'en-tête du tableau de bord :
  silhouette monochrome sans fond ni filet, en plus grand (64 points contre 44) — ici le logo est le
  héros du bandeau, pas une signature de coin. La vignette blanche à filet était devenue la dernière
  du dépôt.

### Corrigé

- **La spécification du jalon [6-C](docs/phase-6/6-c-livraison.md) décrivait moins que ce qui avait
  été livré.** Son commit de livraison ne l'avait pas touchée : le panneau de diagnostic y était
  attribué au mauvais fichier, annoncé avec deux boutons au lieu de trois — celui qui joue un
  Blueprint manquait, alors que c'est lui qui rend le parcours de correction vérifiable — et la table
  des gardes en listait cinq contre dix réellement couvertes par les tests. Corrigé contre le code, et
  l'anomalie est écrite en tête du document plutôt que gommée. Une ligne de checklist a été ajoutée au
  [CONTRIBUTING](CONTRIBUTING.md) : une spécification restée intacte est indiscernable d'une
  spécification dont l'amendement a été écrasé, donc elle se vérifie par `git diff`, pas de mémoire.
- **Le splash attendait deux appels réseau avant de s'effacer.** `PlanningDataManager.loadData()` et
  `CampusDataManager.loadData()` sont attendus par [`App.tsx`](App.tsx) et allaient chercher leur
  liste sur le réseau dès que le cache de sept jours avait expiré. Tant que le relais Celcat
  répondait `522` après vingt secondes, l'application restait donc figée jusqu'à quarante secondes au
  démarrage — une fois tous les sept jours, ce qui rendait le symptôme apparemment aléatoire. Les deux
  managers servent désormais leur cache immédiatement et rafraîchissent **sans bloquer** ; étant
  observables, la liste fraîche atteint les écrans dès qu'elle arrive. Le passage à
  `celcat.u-bordeaux.fr` avait masqué le symptôme, il ne l'avait pas corrigé.
- **Le sélecteur de date du menu de développement était invisible en thème clair sur iOS.**
  `DateTimePicker` ne recevait pas `themeVariant` : il suivait l'apparence du **système** et non celle
  de l'application, donc un iPhone en mode sombre affichait du texte blanc sur le fond clair du menu.
- **La simulation temporelle ne s'appliquait qu'à la moitié de l'application.** Elle remplace
  `moment.now`, donc tout ce qui date par `new Date()` lui échappait : les salles libres retenaient le
  vrai jour d'ouverture — un bâtiment restait fermé quel que soit le jour simulé — et la péremption
  des annonces ignorait l'heure simulée. Les cinq sites concernés datent désormais par `moment()`. La
  règle est écrite dans [qualite.md](docs/qualite.md) : le code applicatif date par `moment()`, jamais
  par `new Date()`.
- **Le jeton d'annulation du planning n'annulait rien.** `ScheduleList` créait un
  `axios.CancelToken`, le stockait et l'annulait au démontage — sans jamais le transmettre à un
  appel, que `PlanningApiService` n'acceptait pas. Une réponse tardive pouvait donc écrire dans
  l'état d'un composant démonté. Le moteur accepte un `AbortSignal` : l'annulation fonctionne, et le
  dernier composant qui importait une bibliothèque réseau ne le fait plus.
- **Une synchronisation calendrier en échec laissait l'indicateur tourner pour toujours.** Le retour
  anticipé oubliait de rabaisser le drapeau `isSynchronizingCalendar`, et l'écran de réglages ne
  pouvait plus distinguer un échec d'une synchro sans fin.
- **Les horaires des restaurants CROUS étaient invisibles.** La source a cessé de servir `horaires`
  comme un tableau pour le servir comme une chaîne JSON ; le test `Array.isArray` était donc faux
  pour les 41 établissements de la région, et l'écran affichait « horaires non spécifiés » partout.
  Les deux formes sont désormais acceptées. Défaut trouvé en mesurant la source pour écrire son
  Blueprint, pas à la relecture.
- **Une réponse de menu sans date vidait le menu entier.** La normalisation appelait `.includes()`
  avant de vérifier que la valeur n'était pas nulle ; l'exception était rattrapée par le service, qui
  rendait alors une liste vide sans rien signaler.
- **Un restaurant qui ne publie aucun menu n'est plus confondu avec une panne.** 24 des 41
  établissements répondent `404` sur cette route, ce qui veut dire « rien à publier » : le Blueprint
  l'accepte explicitement et refuse tout autre statut.
- Comptage des cours dans la vue semaine.
- Doublons de notifications lors de replanifications successives.
- Apparence de la section active de la barre de navigation sur Android.
- Erreurs de typage introduites par la migration TypeScript.
- **L'icône de « Forcer la synchronisation » partait dans tous les sens.** Deux défauts empilés :
  l'animation visait `360` là où l'interpolation attendait la borne `1` — un tour par milliseconde
  environ — et, le rythme corrigé, la rotation pivotait autour du coin haut gauche et non du centre.
  L'animation maison est retirée : pendant la synchronisation, l'icône cède la place à l'indicateur
  d'activité natif, le vocabulaire des tuiles Scolarité en lecture. Au repos, le glyphe passe à la
  variante MaterialIcons, droite — celle de MaterialCommunityIcons est dessinée en diagonale et
  semblait figée de travers.
- **Deux surfaces dérogeaient à la gouttière de 16 points.** Les cases de salles libres et la case
  d'horaire des fiches de bibliothèque cumulaient la marge cachée de `course.card` avec celle de
  leur conteneur : rentrées de 32 points du bord là où toute l'application se tient à 16.
- **Les cours superposés ne laissent plus de trou sous les cartes courtes.** Dans le carrousel des
  cours au même créneau, la rangée prend la hauteur du contenu le plus haut ; une carte plus courte,
  calée en haut, laissait le fond de page apparaître sous elle. Les hauteurs convergent désormais par
  le **gabarit** — une ligne par texte, titre compris, coupée en points de suspension ; l'UE et le
  détail du cours portent l'intitulé complet — et la carte s'étire sur le reliquat. Trois formes ont
  été essayées et défaites : l'étirement seul déplaçait le vide dans la carte, deux lignes de titre
  bornées laissaient une ligne d'écart, deux lignes étirées traînaient un blanc sous les titres
  courts. Et
  l'espace réservé sous le contenu pour l'indicateur de pages — qui rendait les cartes du carrousel
  plus hautes que les cartes seules — est remplacé par une règle à la ligne : la dernière ligne
  d'infos laisse le coin droit à l'indicateur.
- **Une synchronisation de calendrier qui échoue le dit, et ne peut plus geler le bouton.** Les
  écritures dans le calendrier système peuvent échouer (permission retirée, calendrier supprimé) et
  aucune n'était rattrapée : l'indicateur tournait alors indéfiniment, sans issue. Le drapeau retombe
  désormais quoi qu'il arrive, et la pastille d'état des Réglages passe en avertissement — « La
  dernière synchronisation a échoué » — au lieu de laisser l'échec muet, indiscernable d'un bouton
  cassé. L'écriture d'un passage complet rejoint `CalendarSyncHelpers`, comme les autres pièces sans
  état du calendrier.
- **La vérification Android a payé** (2026-08-31, appareil réel) : la fumée des flottants y devient
  un dégradé franc de la teinte du fond — le flou plein tranchait le contenu d'un bord supérieur
  net, le masque dégradé étant iOS seulement ; le pied du parcours d'accueil (bouton et pagination)
  se masque pendant la frappe — le clavier rétrécissait la fenêtre et le pied absolu remontait sur
  le contenu ; la ligne d'état de synchronisation ne se coupe plus au bord (il lui manquait de quoi
  se plier) ; l'étape de connexion de l'accueil n'avance plus **avant la fin** du parcours froid —
  la preuve des identifiants résout tôt, et l'échec éventuel du reste s'affichait sur la page
  suivante ; l'onglet Scolarité ne montre plus une grille à moitié vide quand le parcours froid a
  échoué sans laisser de dossier — l'encart d'échec porte la page seul ; une annonce publiant
  deux fois le même visuel ne duplique plus les clés de sa galerie ni sa visionneuse ; le formulaire
  de connexion devient défilable sous le clavier Android (`height`, comme l'accueil) ; les titres en
  gras des états vides ne se tronquent plus (« Journée libre » amputé — un arrondi de mesure connu
  des Text bold Android) ; et après une connexion à l'accueil qui a réglé l'emploi du temps par les
  propositions du dossier, l'étape du choix de groupe est sautée — demander un groupe que le dossier
  vient de choisir n'avait pas de sens. L'application **impose sa typographie** : l'échelle de
  police du système n'agrandit plus les textes — sur un Android réglé en grande police, tous les
  conteneurs mesurés pour l'échelle 1 tronquaient (« Plus tard » amputé en « Plus »). Le clavier
  passe en `padding` sur les deux plateformes : il prend physiquement sa place et le contenu se
  dégage au-dessus, le comportement iOS voulu partout — et la barre de recherche des listes écoute
  enfin le clavier Android — c'est le `KeyboardAvoidingView` qui la soulève, et il était sans
  comportement sur Android. Les textes centrés tirent désormais leur largeur du **parent**
  (`alignSelf: stretch`) et plus de leur propre mesure : les polices système de certains
  constructeurs (OnePlus, Oppo) mentent à la mesure de texte et le dernier mot passait sur une ligne
  invisible — « Aucun cours ce », « Plus tard » amputé en « Plus » — même avec la police par défaut.
  États vides, bandeau et lien du formulaire de connexion, formulaire iCal, modale du navigateur
  sécurisé, écrans d'accueil : balayage complet des textes centrés, tous traités ; la règle est
  écrite dans App.tsx, avec l'avertissement qu'aucun figeage global de police n'existe. La barre de
  progression du login envoyait sa fin à zéro au lieu de 100 % — le formulaire ne transmettait pas
  `terminee` — et elle se vidait avant de disparaître. Le pied du parcours d'accueil vit hors du
  cadre clavier sur les deux plateformes : immobile, le clavier le recouvre naturellement — dans le
  cadre, il suivait chaque micro-cycle du clavier et flashait, à travers le clavier translucide
  d'iOS au changement de champ comme par-dessus la saisie Android. Une **connexion interactive vaut
  franchissement de la porte biométrique** : la fiche du compte est gardée, et elle demandait un
  visage à qui venait de prouver le mot de passe — le formulaire marque désormais la porte franchie
  pour la session. Le dégagement du haut des étapes compte et lien iCal défile **avec** le
  contenu : posé sur le conteneur, il découpait le défilement à sa ligne derrière une bande de la
  couleur du fond. Le grand titre de l'onglet Scolarité déconnecté **fond au défilement** comme
  celui des Réglages — seul cas où il surplombe un contenu défilant, il restait planté sur le
  formulaire. Le clavier de l'accueil n'a
  qu'un **seul cadre, celui du formulaire** (connexion comme lien iCal, `padding` sur les deux
  plateformes) et le parcours n'en a aucun : deux cadres imbriqués faisaient osciller le contenu
  sur iOS, et le cadre posé au parcours seul ne dégageait pas la saisie — le clavier recouvrait
  les champs. Et la carte du formulaire reste en mode progression jusqu'à l'avancée de l'étape : les
  champs remplis réapparaissaient une fraction de seconde entre la fin de la barre et la
  confirmation de fin. La barre de progression **ne recule jamais** : un parcours enchaîne
  plusieurs phases et le statut repasse par un terminal entre deux — la fin l'envoyait à 100 %,
  puis la phase suivante la ramenait vers son plafond, un recul de quelques points visible juste
  avant l'avancée. Les deux champs du formulaire alignent leurs traits iOS (`textContentType`) et
  s'enchaînent à la touche « suivant » sans rendre le clavier — iOS reconstruisait le clavier au
  changement de champ, un clignotement visible à travers un clavier translucide. Et les
  **bascules de structure se fondent** (`adoucirLaTransition`, 220 ms) : changement
  d'établissement — surtout vers ou depuis « Autre campus », où rangées et onglets entiers
  apparaissent, et où l'adoucissement se pose après la purge, sans quoi la fermeture de la modale
  le consommait avant la réorganisation qu'il visait —, étapes du parcours d'accueil, connexion et
  déconnexion du compte ; la règle d'usage est écrite dans `shared/ui/transitions.ts` — les
  bascules de structure seulement, jamais les frappes ni les défilements. L'avancement de l'étape de connexion se lit sur
  l'état de session lui-même, et le terminal se **confirme** avant de conclure : le parcours froid
  enchaîne plusieurs phases et le statut repasse par « fini » entre deux — partir au premier faisait
  sauter l'étape pendant que la suite tournait. Et la vue d'un groupe cherché réserve au-dessus de sa
  barre Aujourd'hui/Semaine l'espace standard des sous-pages : les boutons retour et favori frôlaient
  les boutons du dessous.
- **Les notifications de cours ne peuvent plus partir en double.** Chaque programmation annule tout
  puis reprogramme, et trois appelants pouvaient s'entrelacer — les deux vues du planning chargent
  en même temps au lancement : annule, annule, programme tout, programme tout, et chaque cours
  notifiait deux fois. Les passages se suivent désormais dans une file ; l'état final est celui du
  dernier appel.
- **L'onglet Scolarité sans compte EST le formulaire de connexion.** L'état vide « connecte ton
  compte » obligeait un tap de plus vers exactement la même page ; l'onglet la montre directement,
  sans en-tête collant — le bandeau du formulaire porte déjà le titre, posé dans le vide. L'en-tête
  collant reste au tableau de bord, qui a un dossier à saluer.
- **Un cours sans heure de fin ne fait plus échouer la synchronisation entière.** C'était la cause
  du gel ci-dessus, démasquée par lui : Celcat sert des cours sans fin, la projection porte alors
  `end: null`, et le repli de la projection calendrier posait « maintenant » à la place — la fin
  passait avant le début de tout cours futur, et le calendrier système refusait l'écriture
  (« The start date must be before the end date »). Un événement non bornable ne se pose plus : les
  autres passent, et lui tombe dans la purge de fin de passage s'il avait déjà été posé.
- **Le libellé de l'onglet sélectionné ne passe plus en gras.** Sur iOS, la graisse changeait avec la
  sélection : le libellé s'élargissait d'un ou deux points et le rang tressaillait à chaque
  changement d'onglet. La couleur porte l'état à elle seule.
- **Le champ du lien iCal remplit sa case.** Un champ `multiline` cale son texte en haut : l'URL
  d'une ligne flottait contre le bord supérieur d'une case de 50 points, en plus petit que tous les
  autres champs de l'application. Le rembourrage centre désormais la ligne exactement, à la taille
  des champs du formulaire de connexion. Et la sous-page s'appelle « Lien iCal » — l'ancien titre se
  faisait couper par la barre de navigation.
- **La première section de l'onglet Scolarité collait à l'en-tête.** La page ouvrait avec l'écart
  interne de la grille (8 points) là où ses deux sections s'espacent de 24 ; le premier intertitre
  paraissait rogné par le filet. C'est l'écart inter-sections qui fait loi.
- **Les deux établissements bordelais annonçaient « Bordeaux » sous leur nom** dans le choix de
  l'accueil. Si cette ligne est la commune du campus, c'est **Talence** pour les deux. Corrigé dans
  la donnée publiée et dans le socle embarqué du catalogue.

### Retiré

- `CrousMenu`, `CrousMenuCategory` et `CrousDish` : trois interfaces qu'aucun écran ne lisait, et le
  champ `CrousRestaurant.menus` qui n'était jamais rempli.
- Le Blueprint de référence `ukit.campus.affluence`, remplacé par les trois documents que les écrans
  demandent réellement.
- `ERROR_WITH_CODE` et `ERROR_WITH_MESSAGE` des trois dictionnaires : leur seul lecteur reniflait la
  forme d'une erreur `axios` pour deviner ce qui s'était passé. La famille d'échec le dit mieux, et
  avec un message par cas.
- `WebApiURL` de [`urls.ts`](src/shared/constants/urls.ts) : le domaine du relais Celcat et ses trois
  routes, avec leurs deux derniers lecteurs. L'adresse de la source vit désormais dans les
  Blueprints, donc corrigeable sans release.
- `axios` et `qs` de `PlanningApiService`, `CampusApiService` et `ScheduleList`. Les deux paquets
  restent installés : `AppUI` interroge encore le fichier de version distant, et `qs` sert au harnais
  de parité pour comparer l'encodage historique.
- Fichiers de journalisation d'erreurs laissés dans le dépôt.

## [5.6.1] - 2026-04-13

Dernière version publiée sur les stores.

## [5.6.0] - 2026-04-03

## [5.5.2] - 2026-04-02

## [5.5.0] - 2026-03-23

## [5.4.0] - 2026-03-08

## [5.3.0] - 2026-03-01

## [5.2.0] - 2026-02-28

## [5.1.0] - 2026-02-27

## [5.0.0] - 2026-02-23

Première version de la reprise du projet par KAE Lab, à partir de UKit 4.1.2.
