# IUT de Bordeaux

> Fiche ouverte le 2026-09-16 par le relevé public du lot 1 de
> [7-B](../phase-7/7-b-nouveaux-campus.md) ; moitié authentifiée mesurée le 2026-11-10 sur le compte
> prêté (`.env`), au lot 3 de la [prochaine version](../prochaine-version.md). Volontaire crédité : à
> demander (`credits` reste vide d'ici là).
>
> **Verdict : publiable en données, servi sans rien coller par la release qui suit.** L'export iCal
> existe ici aussi, et il ne demande aucun type de source nouveau. Publiée seule, la ligne sert déjà les
> versions installées : l'étudiant y colle son lien, guidé par l'aide du catalogue. La release qui suit
> ajoute la lecture du lien sur le compte et des intitulés de cours lisibles ; ces deux morceaux sont du
> code, et c'est pour eux seuls qu'il faut une release.

## Identité
- Nom complet : **IUT de Bordeaux** ; nom court : **IUT Bordeaux** (12 caractères)
- Code : **`bordeaux-iut`**, définitif (il cloisonne le trousseau et les réglages)
- Commune : **Gradignan** (siège, 15 rue Naudet) ; campus de regroupement : `Gradignan`
- Alias : IUT, IUT Bordeaux, IUT de Bordeaux, BUT, DUT, Gradignan, Bastide, Bordeaux-Bastide, Agen,
  Périgueux — proposés, pas encore confrontés à un sondage d'étudiants
- Logo : à demander au service communication (`logo_url` nul : l'écran prend son repli)

## Emploi du temps
- **PRONOTE Campus 2026.4.7.2**, `https://pronote.iut.u-bordeaux.fr`. La racine est une page publique
  « Choix des espaces » ; `/etudiant` passe par le CAS de l'université.
- **Export iCal présent** : un bouton du bandeau de l'espace étudiant ouvre « Export au format iCal »,
  avec un téléchargement ponctuel et une **adresse d'abonnement** « mise à jour en temps réel ».
- Forme de l'adresse : `https://pronote.iut.u-bordeaux.fr/Telechargements/ical/<nom>.ics?version=…&icalsecurise=…&param=…`.
  Le nom du fichier porte le nom de l'étudiant ; l'adresse est **stable** d'une session à l'autre. Elle
  ne s'écrit nulle part, seule sa forme.
- Le calendrier : l'année entière, un `SUMMARY` qui empile « Matière - Type - Enseignants - Mémo », une
  description à champs nommés, onze journées entières ; `X-WR-CALNAME` porte le nom et la **date de
  naissance** du porteur. Détail et fragilités : [sources-externes.md](../sources-externes.md#10-pronote-campus--ladresse-dabonnement-lue-sur-le-compte).
- Le Celcat de l'université déclare 96 groupes `BUTD*` qui ne portent que des vacances (2026-09-16) :
  l'IUT n'y est pas.

## Bâtiments
**Aucun code de bâtiment ne se lit.** PRONOTE écrit `203  BUT3B`, `107`, `Amphi 2`, `SC GMP`,
`Salle de Controle GC` : un numéro, parfois un nom de promotion, jamais un bâtiment, et les quatre
sites ont des salles du même numéro. La ligne déclare donc `salles: {"reconnaissance": false}` — pas de
carte sur la fiche d'un cours plutôt qu'une carte fausse — et `salles_libres` nul : aucun inventaire
d'occupation public, et celui du Collège ST montrerait Talence à un étudiant d'Agen.

| Site | Adresse | Latitude | Longitude | Source |
|---|---|---|---|---|
| Gradignan (siège) | 15 rue Naudet, 33175 Gradignan | 44.79124 | -0.60930 | relevé du 2026-09-16 |
| Bordeaux-Bastide | avenue Abadie, 33100 Bordeaux | 44.84477 | -0.55777 | OpenStreetMap, nœud « IUT », 2026-11-10 |
| Agen | avenue Michel Serres, 47000 Agen | 44.18395 | 0.62560 | OpenStreetMap, **la voie** et non le bâtiment, 2026-11-10 |
| Périgueux | rond-point Suzanne Noël, 24019 Périgueux | 45.19608 | 0.71867 | relevé du 2026-09-16 |

Ces coordonnées ne servent à rien dans l'application tant que les salles ne nomment pas leur site ;
elles sont là pour le jour où un référentiel de salles existera.

## Bibliothèques et restaurants
- Bibliothèques : les deux points de balayage de Bordeaux (le point « Talence / Pessac / Gradignan »
  couvre le siège, « Bordeaux Centre » la Bastide), et la position de l'étudiant en plus. Aucune
  bibliothèque de l'IUT sur Affluences (2026-09-16) ; Agen et Périgueux ne rendaient aucun site
  (2026-08-08).
- Restaurants : Croustillant, région CROUS **1**, qui porte « Crous market' de l'iut ».

## Services de l'ENT
**Le portail de l'Université de Bordeaux, mesuré et non supposé**, sur le compte prêté : même CAS,
même `mondossierweb` aux mêmes libellés, même annuaire (six UE déclarées, au format `9aaa999a`), même
ReNARD (trois certificats), même chronologie Moodle par le SSO de l'IdP. La ligne nomme donc
`ukit.portail.bordeaux.*` et les portes de `bordeaux`.

Une réserve, et une fausse alerte :
- **Apogée était en maintenance** le 2026-11-10 : `notes` et `examens` n'ont pas pu être ouverts. Ils
  sont verrouillés « Bientôt disponible » dans la grille, exactement comme au Collège ST ;
- au poste, le webmail du compte prêté s'ouvrait sur l'interface moderne de Zimbra (`/modern/`), où le
  Blueprint de la messagerie ne trouve pas son compteur. **Sur l'appareil, il passe** (1 135 non lus,
  9 s) : c'était le navigateur sans fenêtre de la mesure, pas le compte. Rien à corriger.

## Ce qui a été écrit
- [`ukit.portail.bordeaux-iut.edt.lien`](../../blueprints/portails/ukit-portail-bordeaux-iut-edt-lien.blueprint.json),
  qui lit l'adresse d'abonnement dans l'espace étudiant (la touche Entrée et non un clic, un `href`
  relatif et non le champ à copier : sa description dit pourquoi) ;
- le mécanisme qui la range comme un lien collé, et le Planning qui invite à se connecter
  ([planning.md](../features/planning.md#le-lien-lu-sur-le-compte)) ;
- la projection des descriptions à champs nommés, qui clôt le défaut des intitulés d'un iCalendar collé
  ([defauts-fonctionnels.md](../defauts-fonctionnels.md)) ;
- ce que le banc a fait corriger : les journées entières en bandeau, la fin de l'accueil qui montre
  la journée d'un abonnement, le bouton « Lien » de la barre, la relecture du lien au lancement, son
  oubli à la déconnexion ;
- la ligne de catalogue (`supabase/etablissements.sql`), recopiée dans le socle, son Blueprint dans
  `BUNDLED`, et la sonde `pronote-bordeaux-iut` (page publique, sans compte).

**Ce que Bordeaux Montaigne en réutilise**, même produit : le mécanisme entier, sans une ligne ; la
projection des champs nommés ; dans le Blueprint, tout ce qui suit la connexion. Restent à écrire son
bloc de connexion (CAS distinct, `sso.u-bordeaux-montaigne.fr`) et ses `vars` (`flaubert2`), puis
`edt.abonnement.blueprint_lien` sur sa ligne.

## Vérifié au banc

Le 2026-11-10, sur `ukit` (Android 15), compte prêté, sans rien publier (la ligne est au socle) :

| Parcours | Résultat |
|---|---|
| Accueil, compte passé | l'étape « colle ton lien » n'existe pas ; le Planning invite à se connecter et mène au formulaire |
| Connexion depuis le Planning | vérification, dossier, lien lu en 20 s par le moteur embarqué (`press` Entrée, pas de bandeau), calendrier en 3 s |
| Accueil, connexion à l'étape du compte | l'étape du lien sautée ; la fin montre « Aujourd'hui, un cours. » |
| Journée, semaine | la matière en titre, `TD` / `DS` en pastille, `Salle 203 BUT3B`, un enseignant par ligne ; fériés et vacances en bandeau, sur chaque jour |
| Fiche d'un cours | « Il reste 11 séances de TD », « Il reste 4 séances de DS » : recomptés sur l'export, égaux |
| Scolarité | prénom, Moodle, messagerie, le certificat de scolarité rangé seul, ENT |
| Campus | annonces, restaurants (région 1), bibliothèques ; pas de salles libres, comme décidé |
| Lien oublié puis relance | la session chaude du lancement relit le lien (10,7 s), le Planning se remplit seul |
| Bascule IUT → Collège ST → IUT | compte et lien cloisonnés, retrouvés sans ressaisie, aucun run de portail |
| Déconnexion | session CAS fermée ; compte et lien « Non connecté » ; le Planning réinvite à se connecter |
| Hors ligne | cache daté avec son bandeau ; un jour non lu dit « Service indisponible » et Réessayer |
| Thèmes | sombre et clair |

Rejoués ensuite sans régression : le Collège ST par l'accueil (groupe `INF501A1`, propositions d'UE,
Planning, fiche et séances restantes, semaine, Scolarité) et Bordeaux INP (connexion, emploi du temps
personnel proposé, Planning ADE, fiche et carte), puis « Autre campus ».

Ce que le banc ne joue pas, à juger sur l'iPhone : la touche Entrée envoyée par l'agent dans
WKWebView (le seul geste propre à ce Blueprint) ; le bandeau « Information » de PRONOTE, jamais vu au
banc ; la relecture du lien au lancement sur iOS, où l'arrière-plan coupe les sessions plus tôt.

## Ce qui se fait sans compte, et ce qui ne se fait pas

Le verdict demandé : élément par élément, ce qui aurait pu se faire à l'aveugle.

| Élément | Sans compte ? | Pourquoi |
|---|---|---|
| Nom, code, commune, sites, adresses | oui | site de l'IUT, OpenStreetMap |
| Le logiciel d'emploi du temps | oui | la page publique de PRONOTE se nomme |
| Le piège des groupes `BUTD*` du Celcat | oui | l'inventaire et le calendrier Celcat sont publics |
| Bibliothèques, restaurants, sonde | oui | Affluences, Croustillant et la page publique de PRONOTE |
| Le portail partagé | **présumé** sans, **prouvé** avec | le rebond vers `cas.u-bordeaux.fr` se voit sans compte ; que le dossier, ReNARD et Moodle d'un étudiant de l'IUT répondent comme ceux du Collège ST, non |
| L'existence de l'export iCal | non | c'est un réglage d'établissement, derrière le CAS ; Montaigne ne prouvait rien pour l'IUT |
| La façon de lire l'adresse | non | qu'un clic soit ignoré et la touche acceptée, que l'adresse soit une propriété et non un attribut, que l'espace mette 24 s à se construire : rien de cela ne se lit sans piloter la page |
| La forme du calendrier | non | intitulés empilés, champs nommés, salles sans bâtiment, date de naissance dans l'en-tête : tout est dans un fichier personnel |
| Les bâtiments et le motif de salle | non | c'est la forme du calendrier qui a montré qu'il n'y en a pas |

**Ce qu'il faut donc demander aux volontaires des autres campus.** Quand l'emploi du temps est derrière
l'authentification, le compte prêté est **indispensable** pour lire le lien tout seul : la mécanique de
la page ne se devine pas. Sans compte, on peut encore publier le campus en lien collé, à condition que le
volontaire fasse deux gestes qu'il peut faire seul et sans rien transmettre de secret : dire si son
espace propose « Export au format iCal » (une capture de la boîte, l'adresse masquée), et recopier trois
intitulés de cours et trois salles tels qu'ils s'affichent. C'est ce qui décide du motif de salle et de
la projection des intitulés. Quand le campus partage le portail de l'université, le compte ne sert plus
à écrire, il sert à **vérifier** : ici, que dossier, ReNARD, Moodle et messagerie d'un étudiant de l'IUT répondent comme
ceux du Collège ST, ce qu'aucune mesure publique ne disait.

## Ce qui reste
1. Publier, dans l'ordre : le Blueprint, puis la ligne ([prochaine-version.md](../prochaine-version.md#lot-3--les-deux-campus)).
   Juger d'abord sur l'iPhone la touche Entrée dans WKWebView.
2. Rouvrir `notes` et `examens` quand Apogée sortira de maintenance, sur le compte prêté.
3. Demander le logo au service communication, et au prêteur s'il veut être crédité.
4. Confronter les alias à quelques étudiants de l'IUT.
5. Demander au campus si ses bibliothèques peuvent rejoindre Affluences.
