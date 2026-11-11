# Université Bordeaux Montaigne

> Fiche ouverte le 2026-09-16 par le relevé public du lot 1 de [7-B](../phase-7/7-b-nouveaux-campus.md) ;
> moitié authentifiée mesurée le 2026-11-11 sur le compte prêté (`.env`), au lot 3 de la
> [prochaine version](../prochaine-version.md). Volontaire crédité : à demander (`credits` reste vide).
>
> **Verdict : un établissement entier, servi sans rien coller, par cinq Blueprints écrits pour lui et
> les deux génériques du CAS.** Publiée seule, la ligne sert déjà les versions installées en lien collé ; la
> lecture du lien, le dossier sans dossier de scolarité et les intitulés PRONOTE propres viennent avec
> la release qui suit. Le compte prêté était indispensable à tout ce qui fait la différence.

## Identité
- Nom : **Bordeaux Montaigne** (nom officiel court, règle du [README](README.md#comment-se-nomme-un-campus)) ;
  nom court : **Montaigne** ; code **`bordeaux-montaigne`**, définitif
- Commune : **Pessac** (domaine universitaire, esplanade des Antilles) ; campus de regroupement : `Pessac`
- Alias : Montaigne, Bordeaux Montaigne, Université Bordeaux Montaigne, UBM, Bordeaux 3, Bordeaux III,
  Pessac, Lettres, Langues — proposés, pas encore confrontés à des étudiants
- Logo : à demander au service communication (`logo_url` nul : l'écran prend son repli)

## Ce que l'étudiant a, et où cela vit

Rien n'est partagé avec l'Université de Bordeaux. Tout passe par un seul CAS, et c'est la seule surface
publique : la sonde `cas-bordeaux-montaigne` la surveille. Détail des hôtes et des sélecteurs :
[sources-externes.md](../sources-externes.md#11-université-bordeaux-montaigne--le-troisième-portail).

| Service | Hôte, produit | Dans UKit |
|---|---|---|
| Connexion | `sso.u-bordeaux-montaigne.fr/cas`, Apereo au thème MDC (`#submitBtn`, `#loginErrorsPanel`), comme l'INP | `ukit.portail.verification` et `.deconnexion`, génériques |
| Dossier | **aucun dossier de scolarité en ligne** : le profil d'e-campus porte le nom, l'adresse `etu.` et l'INE ; la page des relevés, l'inscription | `ukit.portail.bordeaux-montaigne.dossier` |
| Plateforme pédagogique | **e-campus**, un Moodle authentifié par le CAS en direct | `.moodle`, widget « Rien à rendre » |
| Messagerie | **Carbonio** (`carbonio.`, par `carb-cas.`) | `.messagerie`, widget des non lus |
| Documents | le certificat de scolarité, un PDF à adresse fixe (`intranet/certificats_etudiant/certificat.php`) | `.documents` |
| Notes | les relevés en ligne (`intranet/relevesDeNotesEtudiant`) | une porte, rangée « Bientôt disponible » comme au Collège ST |
| Examens | aucune porte trouvée | rangée « Bientôt disponible », sans porte |
| ENT | aucun portail à rangées : l'espace étudiant public `etu.` en tient lieu, la racine de l'intranet est une page de test du serveur | la rangée ENT ouvre `etu.` |
| Emploi du temps | PRONOTE Campus 2026.5 (`flaubert2.`, alias `hyperplanning.`) | `.edt.lien`, puis le repli universel |

**Ce qu'aucune page ne donne** : le numéro étudiant (seulement dans le PDF du certificat) et la date
de naissance. La fiche du compte les dit « — ».

**La déconnexion du CAS ne ferme que PRONOTE.** Mesuré : après `/cas/logout`, e-campus, Carbonio et les
certificats gardent leur session de service ; PRONOTE redemande le CAS. C'est la limite déjà écrite pour
`mondossierweb` ([scolarite.md](../features/scolarite.md#le-pendant-obligatoire--la-déconnexion-ferme-la-session-distante)),
et c'est ce qui garde entier le contrôle `lienDuMemeCompte` du lien.

## Emploi du temps
- L'adresse d'abonnement se lit après la connexion, par la touche Entrée sur `i.icon_ical`, comme à
  l'IUT. Forme : `https://flaubert2.u-bordeaux-montaigne.fr/Telechargements/ical/Edt_<NOM>.ics?version=…&icalsecurise=<96>&param=<36>`.
  Elle ne s'écrit nulle part, seule sa forme.
- L'export (mesuré sur 143 événements, du 2 septembre au 24 juillet) diffère de celui de l'IUT : aucun
  `Type`, une clé `TD` qui porte le groupe, des annulations en clé seule et longue
  (`Rattrapage (Annulation du …) :`), des motifs d'annulation (`Fermeture des bâtiments`, `Cours
  déplacé`), un groupe de CM répété autant de fois que de TD réunis, un `X-WR-CALNAME` qui porte le
  nom, la date de naissance et les groupes du porteur (aucun écran ne le lit). Ce que la projection en
  fait : [planning.md](../features/planning.md#ce-que-licalendar-donne-et-ce-quil-ne-donne-pas).
- Sans `Type`, ni pastille ni « il reste N séances » : compter par matière seule mêlerait CM et TD.

## Bâtiments
PRONOTE écrit le bâtiment : `G 306`, `F 011`, `E 208 informatique`, `MOD 002`, ou un amphithéâtre avec
son code (`Amphi Pina Bausch (C200)`, `Amphi Olympe de Gouges (B400)`), ou son seul nom (`Amphi CIROT`,
`Amphi N°1`). La ligne porte un motif qui en tire le code, et quatorze bâtiments relevés sur OpenStreetMap
(A à G, I, J, K, `MOD`, `B400`, `C200`, `CIROT`) sont dans le socle des lieux et dans
[`batiments-bordeaux-montaigne.sql`](../../supabase/batiments-bordeaux-montaigne.sql), qui dit les sources
et les limites : **H** est écarté (deux bâtiments d'OSM portent ce nom), `Amphi N°1` n'a pas de carte.
Pas de salles libres : aucun inventaire d'occupation public.

## Bibliothèques et restaurants
- Les deux points de balayage de Bordeaux : celui de Talence / Pessac couvre la **BU Rigoberta Menchú**
  et la **BU Droit-Lettres**, toutes deux sur Affluences (vérifié au banc, fiche complète).
- Restaurants : Croustillant, région CROUS **1**.

## Vérifié au banc

Le 2026-11-11, sur `ukit` (Android 15), compte prêté, sans rien publier (la ligne est au socle) :

| Parcours | Résultat |
|---|---|
| Accueil | Bordeaux Montaigne, Pessac, à sa place ; groupé sous « Pessac » dans les Réglages |
| Mot de passe faux (identifiant inexistant) | « Vérifie le nom d'utilisateur et le mot de passe. », en 15 s ; une **seconde** tentative cédait en « portail lent » : corrigé (vérification 4), voir plus bas |
| Connexion à l'accueil | vérification 9,9 s, dossier 9,3 s, lien lu 25,9 s et accepté ; la fin montre les cours du lendemain |
| Planning | jour, semaine, férié en bandeau, motif d'annulation en information, enseignants en personne, salle en épingle, titre sans code ni tiret |
| Fiche d'un cours | une salle du bâtiment G et son marqueur **G** sur le bâtiment ; pas de séances restantes (pas de type) |
| Scolarité | prénom, e-campus « Rien à rendre », messagerie au compte mesuré à la source, « 1 document », Notes et Examens « Bientôt disponible », ENT |
| Portes | Carbonio et e-campus s'ouvrent connectés ; le certificat s'affiche dans le lecteur ; Notes ouvre les relevés |
| Fiche du compte | prénom, formation (lecture bonus), INE, adresse ; numéro étudiant et naissance « — » ; Actualiser ne soumet aucun mot de passe |
| Campus | annonces, restaurants, bibliothèques ; pas de salles libres (teaser) |
| Bascule Montaigne → Collège ST → Montaigne | compte et lien cloisonnés, retrouvés sans ressaisie ni run de portail |
| Déconnexion | session CAS fermée (4,6 s) ; compte et lien « Non connecté » ; le Planning réinvite à se connecter |
| Hors ligne | jour en cache avec son bandeau daté ; semaine jamais lue « Service indisponible » et Réessayer ; Scolarité en cache |
| Thèmes, langues | sombre et clair ; français, anglais, espagnol |

Rejoués ensuite sans régression, compte réel de chacun : l'IUT (vérification 4, lien PRONOTE relu,
pastilles et « Il reste 11 séances de TD » inchangés), Bordeaux INP (connexion, emploi du temps
personnel proposé, carte `EB`), le Collège ST (connexion, `INF501A1`, carte `A21`).

**Corrigé en chemin**, chacun avec son test et sa trace au [registre](../defauts-fonctionnels.md) : un tiers
des cours PRONOTE de Montaigne sur l'intitulé empilé ; l'icône d'un motif d'annulation et d'un
enseignant sans capitales ; le tiret en tête du titre ; et, pour **tous** les établissements, la
tentative qui suit un mot de passe refusé.

**À juger sur l'iPhone** : la touche Entrée dans WKWebView sur PRONOTE (même geste qu'à l'IUT) ; Carbonio,
application lourde, dans la vue cachée et dans le navigateur intégré ; le détour de la vérification 4
dans WKWebView ; le PDF du certificat dans le lecteur iOS.

## Ce qui se fait sans compte, et ce qui ne se fait pas

| Élément | Sans compte ? | Pourquoi |
|---|---|---|
| Nom, code, commune, alias, bibliothèques, restaurants | oui | site de l'université, Affluences, Croustillant |
| Le CAS et son thème, le refus d'un mot de passe | oui | la page est publique ; un identifiant inexistant montre le panneau d'erreur |
| La carte des services et leurs adresses | **en partie** | le site public nomme certificats, relevés, Carbonio, e-campus, PRONOTE ; qu'il n'existe **aucun** dossier de scolarité, non |
| Les bâtiments | **en partie** | OSM les place ; seul l'export dit qu'une salle s'écrit `G 306` et que l'amphi donne son code |
| Le logiciel d'emploi du temps | oui | la page d'erreur de `flaubert2` se nomme |
| La lecture du lien PRONOTE | **réutilisée**, pas devinée | la mécanique de l'IUT tient ; vérifier qu'elle tient ici demandait le compte |
| Le dossier | non | où se lisent un nom et un INE, dans quel ordre le prénom, que l'adresse du profil est la bonne |
| Les widgets et le certificat | non | sélecteurs de Carbonio, chronologie d'e-campus, forme du PDF |
| La forme du calendrier | non | annulations, motifs, absence de `Type` : trois défauts d'affichage qu'aucune mesure publique ne montrait |
| Ce que ferme la déconnexion | non | il faut une session pour voir qui la garde |

**Comparé à l'IUT.** L'IUT partageait le portail de l'université : le compte y servait surtout à
**vérifier**, et à percer un seul mécanisme nouveau, la lecture du lien. Ici le compte a servi à
**écrire** cinq Blueprints et à découvrir l'architecture même du portail — l'absence de dossier, le
profil d'e-campus qui en tient lieu, la page des relevés capricieuse. Sans compte, on aurait pu publier
Montaigne en lien collé et en portes ouvertes, ce que la ligne fait déjà pour les versions installées ;
on n'aurait pas pu lui donner une Scolarité.

**Ce qu'il faut donc demander au prochain établissement entier** : le compte, sans alternative, pour
la Scolarité. Pour l'emploi du temps seul, les deux gestes du verdict de l'IUT suffisent toujours
(la boîte d'export en capture, trois intitulés et trois salles recopiés) — à condition d'ajouter
**un cours annulé ou déplacé** aux exemples : c'est là que l'export de Montaigne cachait ses défauts.

## Ce qui reste
1. Publier, dans l'ordre de [prochaine-version.md](../prochaine-version.md#bordeaux-montaigne-joué-le-2026-11-11) :
   les Blueprints, la ligne, les bâtiments. Juger d'abord sur l'iPhone la liste ci-dessus.
2. Demander le logo au service communication, et au prêteur s'il veut être crédité.
3. Confronter les alias à quelques étudiants de Montaigne.
4. Le bâtiment **H** et l'`Amphi N°1` : un relevé sur place dirait lequel des deux H d'OSM est le bon.
5. Les motifs d'annulation de PRONOTE se lisent comme une information ; dire « annulé » demanderait un
   champ que l'export ne porte pas. À rouvrir avec un exemple de cours annulé confirmé.
6. Signaler à Aetherius la navigation qui recharge au lieu de charger
   ([registre](../defauts-fonctionnels.md)).
