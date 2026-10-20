# Décisions d'architecture et de produit

Le POURQUOI des choix non évidents : contraintes externes, options rejetées, pièges mesurés. À consulter par mot-clé (`grep -n -i "<mot>" docs/decisions.md`) avant de refaire ou de « corriger » un choix, sans lire en entier. Une décision remplacée est supprimée ou réécrite ici, pas annotée. `[non livré]` = décidé, pas encore codé. Le détail des jalons livrés est dans git (tag `doc-v1`).

Index. Architecture : perimetre-bordelais, moteur-embarque, frontiere-blueprint, echec-type, base-de-publication, livraison-blueprints, demarrage-sans-reseau, cloisonnement-par-etablissement, expo-et-build-de-dev, carte-maplibre. Données et sources : etiquette-universites, occupation-groupee, catalogue-une-ligne-par-campus, campus-par-compte-prete, edt-sources-ordonnees, salles-libres-emprunt, calendriers-telephone, entretien-synchro-agenda, filtres-ue-complement, session-portail, parite-source-reelle, sondes-quotidiennes. Base, console, mesure : egress-plan-pro, medias-origine-rendu, depot-ci-migrations, pilotage-console, console-socle, roles-dans-la-base, push-expo, retours-en-base, mesure-anonyme, ciblage-appareil, annonces-lecture-directe, annonces-cycle-de-vie, carte-annonce-v2. Design : socle-visuel, ombres-sans-elevation, fumee-de-flou, teaser-masque, bandeau-flottant, etat-plein-ecran-ancre, attente-et-couture, glissement-onglets, accueil-hors-navigation, identite-epure, mouvement-6-3. Méthode et non livré : publications-sans-dates, changelog-genere, statistiques-console, dons-helloasso, boucle-6-4, site-ukit-bordeaux, options-ecartees.

## Architecture

### perimetre-bordelais : UKit vise les facs de Bordeaux, pas la France
Sans cette phrase on conçoit pour la France entière et on paie des généralisations que personne n'a demandées. La région CROUS, les points de balayage des bibliothèques et l'inventaire des salles restent bordelais MAIS sont des données de catalogue, jamais des constantes : une donnée se corrige par publication, une constante demande une release (onze constantes bordelaises ont dû être déterrées une à une en 6-G). Souveraineté : aucune dépendance payante, cartes libres. Rien de vous ne transite : aucun compte UKit, tout reste sur l'appareil.

### moteur-embarque : sources tierces jouées depuis l'appareil, relais supprimé
Le relais `ukit.kbdev.io` n'existait que parce qu'une WebView web ne peut appeler un autre domaine (mort en 522 l'été 2026). `@aetherius/engine` et `react-native` sont embarqués, publiés sur npm, versions verrouillées par `package-lock.json`. Rejeté : moteur hébergé (tout le trafic d'une adresse IP et les identifiants CAS chez un tiers), lien `file:` (ni CI ni EAS). Conséquence : pas de compte UKit ; Celcat ne filtre ni Origin, ni Referer, ni User-Agent (mesuré le 2026-08-09), tolérance révocable sans préavis (réponse vide, pas erreur), repli = republier `vars.domaine`. Relais-cache Celcat : « jamais, sauf demande de l'université ».

### frontiere-blueprint : ce qui descend dans un Blueprint
Un Blueprint dit ce qu'on demande à une source tierce et ce qu'on en retient. Restent applicatifs : cache, i18n, heure, position, calculs (Haversine, tris), balayage, filtre d'expiration, libellés. Pourquoi : un Blueprint qui lit l'heure n'est plus rejouable donc plus vérifiable ; un calcul serait à réimplémenter à l'identique dans deux moteurs. Migration source par source derrière la signature typée : repli, puis RETRAIT.

### echec-type : un échec de source est typé, jamais `null`
Avec `null`, une panne du fournisseur et une réponse légitimement vide étaient indistinguables. Les services rendent `{ ok: true, … } | { ok: false, failure }`, calqué sur `BlueprintRun` ; la famille d'échec décide de l'écran. Couverture partielle (balayage BU) = bandeau, ni succès muet ni échec. Un modèle d'erreur se change globalement, pas service par service.

### base-de-publication : Supabase mince, point de publication et non dorsale
Rien ne permettait de publier, dater ou désactiver sans commit. La base porte ce que l'équipe publie (Blueprints, annonces, messages, référentiels, catalogue) ; le socle embarqué n'est jamais optionnel (premier lancement hors ligne). Nos tables se lisent avec supabase-js, jamais via Blueprint (indirection inutile, schéma et application changent ensemble). Chaque contenu publié = socle + surcouche, réductible au socle ; la sémantique remplace ou champ par champ est propre à chaque table. « Base et bucket injoignables, tout marche sur le socle » est la sonde la plus importante. Préproduction évaluée (7-H) et écartée.

### livraison-blueprints : surcouche distante vérifiée sur socle embarqué
Registre = socle + surcouche : SHA-256 revérifié à chaque lecture, version strictement supérieure, `min_engine`, nom publié = nom déclaré, périmètre de secrets, manifeste malformé refusé EN ENTIER. Un run qui attend le réseau échoue quand le réseau est mauvais, donc `resolve()` n'ouvre jamais le réseau. Pas de signature (TLS) : un publieur compromis n'est pas couvert, le périmètre de secrets limite le rayon. Le manifeste n'annonce que ce qui bat le socle du dernier tag (jusqu'à `@aetherius/react-native` 0.5.9 le registre téléchargeait avant de juger : 2,2 Go par jour, neuf dixièmes de l'egress).

### demarrage-sans-reseau : le splash n'attend aucune source
Des chargements séquentiels bloquants figeaient le démarrage (40 s quand le relais répondait 522). Les managers servent le cache et rafraîchissent sans attendre. Rejeté : un verrou anti-doublon. Conséquence : un écran très rapide peut doubler une requête.

### cloisonnement-par-etablissement : ne pas mélanger, ne pas oublier
Tout ce qui est propre à une fac vit dans une table par code d'établissement dont seule l'entrée active est lue (favoris, filtres d'UE, lien d'abonnement, session, widgets, propositions, id ADE, documents). La bascule ne purge que le non rejouable (groupes, caches de planning, bâtiments, cours écrits dans l'agenda) ; seule la réinitialisation efface tout. Rejeté : effacer à la bascule (reconnexion à chaque aller-retour), tout garder sans cloisonner (le planning butait sur des groupes d'une autre fac). Favoris CROUS et BU (sources nationales) gardés à la bascule. Une doc qui annonce une purge absente du code a coûté deux jalons.

### expo-et-build-de-dev : rester sur Expo, builds de développement, SDK isolé
Le 2026-09-04 l'Expo Go des stores est passé au SDK 57 (UKit 54), iOS sans retour arrière. On développe sur `eas build --profile development` (mêmes identifiants que le store ; chaque montée de SDK a son jalon, avant tout travail visuel : un pixel qui bouge doit avoir une cause). Quitter Expo rejeté : ce qui a coincé est Expo Go, pas le cadre ; les stores imposent une API cible que seule la montée de SDK donne. Les racines HARICA 2021 sont embarquées pour toutes les connexions Android (limiter par domaine exigerait une release par campus ; GEANT TCS sert toute l'université française) ; `expo >= 57.0.17` (fuite mémoire Hermes sur worklets).

### carte-maplibre : WebView MapLibre + OpenFreeMap, jamais `react-native-maps`
`react-native-maps` impose Google Maps sur Android (clé, quota facturable, traçage) ; les tuiles CARTO « gratuites » sont passées sous filigrane le 2026-08-30 ; les tuiles OSM standard sont trop chargées. Positron d'OpenFreeMap : sans clé, autorisé en production, aucune position envoyée à un tiers publicitaire. Carte vide hors ligne ou sans WebGL, sans erreur ; cartes dans les fiches seulement.

## Données et sources

### etiquette-universites : économe et nommé envers Celcat
La panne Celcat du 2026-09-14 (côté université) a montré un rythme nominal lourd. Cache d'occupation par bâtiment et par jour (10 min), disjoncteur par hôte pour les seuls runs automatiques (3 échecs, 30 s / 2 min / 10 min, en mémoire), fraîcheur de 60 s du Planning, `User-Agent` nommant UKit sans numéro de version (un fichier publié se périmerait). Conséquence : une occupation modifiée n'est visible qu'au terme du cache (accepté).

### occupation-groupee : un run par bâtiment, attribution par le nom de salle
La fiche de l'A28 jouait dix-sept runs (pas dix-huit). La réponse groupée ne dit pas à quelle salle appartient un événement : attribution par le NOM de salle de la description (entités HTML décodées), `Vacances` rendus à toutes les salles pour que la fermeture tienne. Sonde du 2026-09-17 sur trois journées : mêmes identifiants d'événements qu'en dix-sept appels, 109 attributions justes ; la clause « 99 % à zéro ou une salle » supposait un cours multi-salles inattribuable, il est attribuable à chacune. Fragilité : le texte. Un run groupé en échec ne met rien en cache.

### catalogue-une-ligne-par-campus : unité de ciblage, de source, de géographie, de trousseau
Un portail partagé ne dit rien des écrans (INP : huit défauts sur appareil) ; deux demandes de campus sur neuf visaient un campus déjà servi dont le libellé était méconnaissable. Une ligne par campus même à portail partagé, Blueprints référencés par nom, code choisi une fois, nom par nature. Ajouter une université est une ligne en base et des fichiers publiés, sans release ; sans compte réel d'une composante rien ne se livre (un intranet partagé ne vaut pas vérification).

### campus-par-compte-prete : adapter seul, sur un compte prêté
Neuf des seize premières réponses demandaient un campus. Travail seul sur un compte prêté, encadré par une page d'engagement (sur le site) ; recrutement par une section du formulaire ; volontaire reconnu s'il le souhaite. Rejeté : la boucle collaborative (le volontaire joue, envoie un rapport de run, correctif à chaud, rejoue) : trop lente, engagement durable, ne pas la reproposer sans raison nouvelle ; publier un campus « en cours d'adaptation » tant que sa moitié publique n'est pas mesurée. Lots 2 à 4 de 7-B (IUT de Bordeaux, Victoire, Bordeaux Montaigne) après la 6.3 en production, un à la fois, Montaigne en dernier [non livré].

### edt-sources-ordonnees : le catalogue choisit la source d'emploi du temps
Celcat ouvert est l'exception (collège Sciences et Technologies seul ; aucune autre instance ouverte sur vingt universités) mais tout produit exporte en iCal. `sourceEdt()` = union totale `celcat > ical (référentiel relevé) > abonnement (lien collé) > lien-attendu > aucun`, même contrat `PlanningEvent` (écrans inchangés). Le lien collé est le repli universel : UN Blueprint embarqué `ukit.edt.abonnement` hors `ukit.portail.`, demandé verbatim sans bornes, filtrage par date applicatif (tous les produits n'acceptent pas de plage). Rejeté : un connecteur ou un Blueprint par université, récupérer le lien sur l'ENT (travail d'auteur par fac, invérifiable). « Pas d'emploi du temps ici » (aucun bouton) ≠ « il te manque un geste » (coller son lien).

### salles-libres-emprunt : inventaire de salles emprunté, éligibilité à nous
L'INP est sur ADE (pas d'inventaire Celcat) mais ses écoles sont à Talence, à 200 m des bâtiments listés : la colonne `salles_libres` pointe l'inventaire d'un autre établissement. Celcat sait quelles salles existent, seule l'équipe sait lesquelles sont libres d'accès (`freeAccess`). Rejeté : refuser la fonction à l'INP.

### calendriers-telephone : lecture seule, jamais d'édition
Les calendriers cochés dans les Réglages s'affichent dans le Planning des favoris, mêlés aux cours ; Celcat reste la vérité des cours, l'agenda celle des rendez-vous. Le « + » ouvre l'éditeur du système. Rejeté : éditeur maison, synchronisation d'édition (un cours modifié serait réécrasé sans explication), cache (périmé hors ligne), exclure les événements « disponible » (anniversaires, fériés : voulus). Lecture locale, `PRIVACY.md` inchangé.

### entretien-synchro-agenda : l'ouverture est la garantie, la tâche de fond un bonus
La synchro automatique ne partait jamais (deux signalements) : tâche jamais réarmée, `expo-background-fetch` déprécié, aucune tâche de fond sous Expo Go, iOS accorde la tâche quand il veut. L'entretien (synchro + rappels) se joue au lancement, au retour au premier plan, au changement de favori, et par `expo-background-task`. « Une capacité qu'on peut activer et pas désactiver est un aller simple » : éteindre retire ce qui a été écrit. Rejeté : tâche seule, purge de l'agenda sur source injoignable.

### filtres-ue-complement : proposer de masquer le complément, jamais les UE de l'étudiant
Un filtre d'UE MASQUE alors que le dossier livre les UE où l'étudiant est inscrit. La connexion propose de masquer le COMPLÉMENT (UE du groupe où il n'est pas inscrit), proposition gardée au trousseau (`UKIT_PROPOSITIONS`, cloisonnée) jusqu'à ce qu'il tranche, car le planning est vide tout l'été. Pré-remplir avec ses UE viderait le planning sans explication ; liste positive inversée rejetée.

### session-portail : session de portail persistée, preuve par `renew`
Ouvrir l'ENT, Moodle ou le webmail retombait sur un formulaire (WebView incognito par défaut). Blueprints de portail en `session.persist: true`, cookies partagés ; preuve des identifiants par `ukit.portail.verification` (`renew=true`), jamais déduite de l'apparition d'un formulaire ; déconnexion locale d'abord puis `/logout` du CAS. Fermer le CAS ne ferme pas les services déjà ouverts (assumé).

### parite-source-reelle : parité contre la vraie source, sans réponses enregistrées
« Ça tourne » ne prouve pas qu'une migration rend la même chose. Des enregistrements prouveraient que notre parseur s'accorde avec lui-même. Porte locale (ni WebView, ni cache, ni concurrence, ni affichage) ; un cas rouge peut être une panne de source. Rejeté : identifiants réels dans un harnais.

### sondes-quotidiennes : panne de source distincte de l'erreur de sonde
Le relais Celcat est resté mort tout un été sans que personne le sache. Chaque matin (05:00 UTC) une sonde par source tierce, sans identifiants (un secret de plus pour un gain faible), écrit la table `sondes` et ouvre ou ferme une issue ; panne de source = workflow vert, erreur de sonde = rouge sans issue. Limite : runners américains, une source qui filtre par pays donne une fausse panne.

## Base, console, mesure

### egress-plan-pro : Pro souscrit, cause réelle corrigée à la source
Avertissement Fair Use (10,041 Go d'egress en cache pour un quota de 5, grâce jusqu'au 2026-10-13) : les visuels n'en étaient qu'un dixième, la livraison des Blueprints neuf. Pro (sauvegardes quotidiennes, transformations d'image, 250 Go) ET correction : manifeste réduit, registre qui juge avant de télécharger, cache d'un an. Rejeté : espacer les relectures publiées (la fréquence fait arriver les corrections), mesurer un mois avant de payer. Publier un Blueprint AVANT la sortie qui l'exclut du manifeste.

### medias-origine-rendu : adresses d'origine en base, rendu calculé à l'affichage
Les transformations d'image n'existent qu'en Pro et se facturent par image d'ORIGINE. Les colonnes gardent l'origine, l'app dérive le rendu (`urlDeRendu` pur, paliers, repli en trois temps, `expo-image`). Une adresse de rendu en base figerait largeur et qualité pour des versions qui n'en feraient rien. Objets ré-encodés WebP au MÊME chemin avec cache d'un an ; Storage ne modifie pas une métadonnée seule. Les adresses du binaire ne sont plus bumpables, d'où la surcouche en base.

### depot-ci-migrations : CI sur toutes les branches, migrations numérotées
`verifier.yml` sur toute poussée ; la protection de `main` exige les trois vérifications SANS pull request (avance rapide d'un commit déjà vérifié). `supabase/migrations/` = registre, `schema.sql`, `fonctions.sql`, `policies.sql` = vue lisible, `etablissements.sql` = donnée. CLI Supabase par `npx --yes`, jamais en dépendance. Deux branches qui migrent la même base poussent depuis un dossier portant l'union des migrations (registres d'accord depuis la fusion du 2026-09-26).

### pilotage-console : piloter à distance par une console, jamais par l'application
Console web (clé publiable seule), écriture réservée aux éditeurs authentifiés, tout journalisé par déclencheurs `security definer`. Blueprints hors console. Rejeté : menu caché dans l'app (une clé d'écriture dans un binaire est publique), sondes avec mot de passe, une issue par retour utilisateur, webhook Discord tant que la fréquence ne le justifie pas.

### console-socle : refonte standard de la console, sans release
TanStack Query et Table v9 (mode serveur), react-hook-form et zod, Base UI (maintenance plus récente que Radix, un paquet à 5 dépendances contre 7 à 22 par primitive), lucide, `browser-image-compression`, `blurhash`, CSS maison en tokens, routeur maison d'environ 70 lignes dont l'URL porte l'état. Rejeté : kit complet (MUI, Ant : impose son apparence), framework (page statique sans serveur à nous), édition des Blueprints, édition hors ligne.

### roles-dans-la-base : trois rôles décidés par les politiques, sans préproduction
Admin (tout), rédacteur (annonces des campus de `editeurs.etablissements`, seulement si TOUS les établissements ciblés sont les siens ; « tous » réservé à l'admin ou au rédacteur sans borne), lecteur. La clé publiable est publique : masquer un bouton ne protège rien. Trois fermetures trouvées à la lecture : l'adresse d'un retour avait trois copies, les jetons push sont une clé de la production, `[]` valait « tous ». Invitation par la fonction `editeurs` avec mot de passe provisoire (16 signes, montré une fois) faute de serveur d'envoi. Préproduction écartée (environ 10 $ par mois hors plafond) : migrations essayées en transaction annulée, comptes jetables, audience `testeurs` ; à rouvrir si une deuxième personne écrit du SQL.

### push-expo : messages de service en push, écriture bornée de l'appareil
Un incident doit réveiller le téléphone. Jeton et de quoi cibler (campus, version, plateforme, testeur) déposés par `deposer_jeton`, actif par défaut ; l'interrupteur RETIRE le jeton ; envoi par Edge Function `notifier` depuis la console (l'API push d'Expo n'a pas de CORS). Rejeté : notification locale par tâche de fond (jamais à la seconde), push silencieux à tous + tri par l'appareil. `PRIVACY.md` amendé avant le code ; un message ne se notifie qu'une fois ; le push est une PORTE vers la feuille, pas un canal parallèle.

### retours-en-base : les retours d'utilisateurs vivent dans la base
Table `retours` alimentée par importeur et cron (72 h) depuis la feuille liée au formulaire ; clé = empreinte de la réponse (rien chez Google ne fournit d'id). Un bug devient une entrée de `docs/defauts-fonctionnels.md` écrite à la main ; un retour n'est pas un incident (le cron n'ouvre aucune issue). Google Forms reste, pré-rempli (adresse longue, jamais le campus demandé, l'accord du volontaire ni les courriels), formulaire natif en 6.4 [non livré].

### mesure-anonyme : compter sans suivre
Pour juger la refonte, les annonces, les sources : compteurs dans la base (RPC `compter`, vocabulaire fermé `evenements_connus`), sans identifiant ; jour (heure pour sessions, onglets, échecs) × campus × version × plateforme × `testeur` ; interrupteur actif par défaut (mesure d'audience exemptée de consentement, 13 mois) [à relire avec l'équipe avant la sortie]. Rejeté : SDK tiers, rapport de crash tiers, ligne de base d'avant la refonte. Un événement inconnu est ignoré et compté (`rejetes`), non rejeté : un vieux client doit pouvoir vider sa file. Fiches : App Privacy (Product Interaction, Analytics, non liée, sans tracking), Data safety (App interactions, non partagée, facultative), à remplir dans les consoles avant la sortie.

### ciblage-appareil : la base ne sait rien de l'appareil
Le filtre se fait sur l'appareil par un module pur ; le statut testeur se compare chez l'appareil (il n'envoie jamais son identifiant). La requête reste identique pour tous (`PRIVACY.md`). Conséquence : statut auto-déclaré, audience = filtre d'affichage, pas confidentialité.

### annonces-lecture-directe : annonces lues dans notre base, pas par Blueprint
Un Blueprint sert une source tierce dont on ne contrôle ni le format ni la disponibilité ; ici schéma et application changent ensemble et l'indirection coûterait un aller-retour par correction. Rejeté : renommer le contrat d'écran avec la source.

### annonces-cycle-de-vie : colonnes additives, programmation, archive, ordre
Colonnes additives dès la 6.2.2 (`type`, `emplacements`, `ajustement`, `focale`, `priorite`, `epinglee`, `creneaux`, `statut`, `blurhash`, `partenaire`). Une annonce programmée est une `publiee` dont `publiee_le` est futur (cachée par la politique de lecture pour TOUT le parc). Archiver plutôt que supprimer (trace et chiffres). Paramètres d'ordre en base, algorithme pur `ordre.ts` dans l'application : appareils et console rendent le même ordre à la même heure.

### carte-annonce-v2 : cadre 4:5 autour d'une focale, cartes spéciales au gabarit de l'hôte
Cadre 4:5 (remplace le 1:1 du 2026-08-30), l'image couvre autour d'une focale choisie dans la console. « Un seul gabarit, deux largeurs » est devenu « une seule carte, deux cadres » le 2026-09-26 : la règle « les cartes d'une section ont la même hauteur » l'emporte sur l'aperçu de la console, qui dessinait la carte spéciale entre des voisines fictives 4:5. Aucun événement de mesure nouveau.

## Design

### socle-visuel : vocabulaire extrait de l'existant, imposé par une règle ESLint
Trois chantiers d'écran produiraient trois dialectes. On NOMME l'échelle des écrans de référence plutôt que d'en inventer une (tokens, composants `shared/ui`, `no-style-literals`, recette d'écran). « Une règle écrite dans un document ne tient pas » (53 couleurs et 142 valeurs en dur avant la règle). Aucun entre-deux (pas de verre approximatif), contrôles dessinés, flou iOS / dégradé opaque Android. Police du système (Montserrat n'habillait que titres et Scolarité : un résidu ; Geist refusé pour l'app, listes denses). Carrés arrondis (cercle ou pilule « parce que ça fait moderne » rejetés ; une piste d'interrupteur en carré arrondi se lirait comme un bouton à deux états). Extraire fige aussi les défauts (prix choisi).

### ombres-sans-elevation : ombres par plateforme
Sur Android `elevation` dessine une ombre dure ET décide de l'ordre de dessin (elle prime sur `zIndex`) : un bandeau à `elevation: 2` recouvrait l'en-tête transparent, boutons compris (Galaxy A8, 2026-09-11). iOS garde `shadow*`, Android reçoit un `boxShadow` calibré (RN 0.86, rendu dès l'API 28, aucune ombre en dessous), résolu dans `Theme.ts` d'après `ombres.ts`.

### fumee-de-flou : les objets flottants du bas posent sur une « fumée »
Cinq formes essayées les 2026-08-30 et 31, la dernière retenue : flou plein masqué par un dégradé (`MaskedView`) + voile du fond d'environ 35 % sur iOS ; sur Android, dégradé quasi opaque de la teinte du fond (le flou plein tranchait le contenu). Rejetés : bande opaque (nuage plein), bande floue (frontière), flou par tranches, voile de teinte seul, matériau translucide sur les pieds d'action (deux traitements pour un rôle). Zone sûre du bas : iPhone reprend 15 points, Android respecte la zone entière avec dégagement d'au moins `md`.

### teaser-masque : un contenu à rendre illisible se retire du rendu
Mesuré sur appareil le 2026-09-08 : `expo-blur` croissant (aucun effet sur Android au SDK 57 faute de `blurTarget`), voile dense, opacité réduite et texte `transparent` laissent le contenu lisible ou dépassent. Le `Text` ne porte qu'une espace (hauteur exacte), le libellé passe en `accessibilityLabel` (un teaser est un effet visuel, pas un secret).

### bandeau-flottant : un bandeau flotte, un état durable s'installe dans la rangée du titre
Un bandeau inséré fait sauter le contenu, un toast du bas ne se ferme pas. Le bandeau de service est une carte flottante sous la barre d'état qui ne déplace aucun écran ; ce qui doit rester visible est `PastilleService` à droite de la rangée du titre (grise quand tout va bien, rouge en incident). Un rappel d'incident en bandeau permanent cachait le grand titre.

### etat-plein-ecran-ancre : un état plein écran s'ancre en haut
Six écrans calaient chacun leur état. `ScreenState` seul décide : distance fixe `space.xxl` sous l'en-tête. Centrer exige de savoir ce qui occupe le bas (barre d'onglets, barre de recherche flottante de 80 pt, rien) ; deux tentatives donnaient « légèrement sous le milieu », la pire position. Ne pas retenter le centrage.

### attente-et-couture : attente sans forme après 300 ms, fondu seul à chaque couture
Un indicateur qui apparaît puis disparaît en quelques dizaines de ms se lit moins bien que rien. Rejeté : durée minimale d'affichage (ralentirait le contenu), fondu seulement si l'indicateur a paru, glissement de 8 pt (`FadeInDown` a fait perdre son texte à un jour libre sur iPhone), pulsation d'opacité du squelette. Pas d'`ApparitionEnFondu` là où `Card` fond déjà (deux animations sur les mêmes pixels). Le seuil de 300 ms ne vaut plus que pour les indicateurs sans forme : les squelettes de la 6.3 paraissent tout de suite.

### glissement-onglets : le geste entre onglets vit sur la barre
Planning et Campus sont pleins de listes horizontales. `createMaterialTopTabNavigator` en bas (6.1-E) : `ViewPager2` intercepte le toucher avant ses enfants. Un `Pan` par scène avec priorité des listes (6.2.x) : la liste n'est « active » qu'après son seuil natif, ou coupe le défilement dès que le doigt la quitte (Galaxy A8). `useGlissementDeBarre` : activé après 10 pt de course horizontale sur la barre.

### accueil-hors-navigation : le parcours d'accueil remplace la navigation
Joué une fois (thème, langue, établissement, compte, emploi du temps) ; rendu à la place du `NavigationContainer` tant que `isFirstLoad()`. Un formulaire de connexion propre à l'accueil serait un deuxième chemin vers le trousseau : `CredentialsProvider` est remonté au-dessus des deux branches. L'ordre des étapes a été mesuré en jouant le parcours (établissement avant les groupes, constaté).

### identite-epure : l'Épure, identité de la marque, dosée par support
Née les 22 et 23 septembre 2026 pour les slides de Disrupt Campus (douze tours de planches, une variable à la fois). Traces de conception visibles, logo en verre, Geist, fond `#0B0B12`. L'application garde carré arrondi et police du système (tranché le 2026-09-26) ; elle en prend des moments, jamais des traces sur les écrans de travail. Rejeté : logo pleine largeur, écho sur le logo ou les chiffres, tirer-pour-rafraîchir maison.

### mouvement-6-3 : vocabulaire du mouvement et écran fondateur Campus (7-I, ouvert)
Converger l'écran fondateur seul ; squelettes à la structure de la carte ; cartes d'erreur au gabarit exact ; `tokens.mouvement` ; fonds par écran = images statiques pré-estompées, une par onglet et par thème, Campus d'abord [`FondDEcran` non livré] ; transitions de pile par défaut ; spinner système. Rejeté : geste maison de tirer-pour-rafraîchir (Android sans progression), élément partagé (drapeau natif désactivé dans Reanimated 4.5, pile en JavaScript), blurhash des lieux (hors 6.3). Méthode : choisir sur planche, options côte à côte, avant de coder. Aucune porte automatique pour le mouvement. Voix éditoriale, mini-jeu pendant la connexion universitaire (14 à 26 s) : voir l'objectif 7-J [non livré].

## Méthode et non livré

### publications-sans-dates : une version sort quand ses jalons sont livrés
Pas de 6.2.3 (numéro libre pour un correctif urgent) ; la mesure part avec la 6.3 sans ligne de base (une base de rentrée ne se compare pas à des semaines de Toussaint) ; aucune date visée ni gel, seulement des dates constatées. Cadence des stores : une soumission toutes les deux à quatre semaines. Un seul jalon ou lot ouvert à la fois (une personne vérifie sur deux appareils et commite) ; les dépendances sont la seule contrainte d'ordre. Branches : une par version (`v6.3`, `v6.4`) depuis `main` à jour ; console, campus et bucket se font sur `main`.

### changelog-genere : `CHANGELOG.md` conservé, généré depuis les commits à chaque publication
La page Nouveautés du site (7-M, `/nouveautes`) se génère à la construction depuis le `CHANGELOG.md` de `main`, lu dans le dépôt public : une lecture qui échoue fait échouer la construction, et une modification sur `main` relance le site par un *deploy hook* appelé depuis un workflow de ce dépôt [non livré]. Le fichier reste donc à la racine, sous ce nom. Il est désormais à générer depuis les commits (Conventional Commits, vérifiés par commitlint) au moment de la publication d'une version (`git cliff` s'il est installé, sinon au même format) : groupé en Nouveautés, Corrections, Performances et Ruptures, sans `chore`, `ci`, `test` ni `docs` internes, il dit ce qui change pour l'utilisateur. Rejeté : le retirer (le site perdrait sa source, ou les notes se recopieraient à la main dans un second endroit) ; le tenir à la main à chaque changement (journal interne qui doublonne git). Les entrées déjà écrites restent telles quelles.

### statistiques-console : agrégats dans la console, petites cases masquées [non livré, 7-G]
Agrégats calculés dans la console depuis `mesures` (ni vue ni fonction) ; aucune case sous 5 (« moins de 5 », campus regroupés en « autres campus », écran ET export) ; taux grisé sous 20 impressions ; testeurs exclus ; impressions dédoublonnées par session ; rapport partenaire en CSV et feuille d'impression. S'ouvre deux semaines après la 6.3 en production.

### dons-helloasso : le don se collecte hors de l'application, rien n'est débloqué [non livré, 7-N]
HelloAsso ; don collecté sur le site, navigateur du système, jamais la vue intégrée (Apple 3.2.2 iv ; Google exempte les dons exonérés d'impôt) ; un don ne débloque rien (Apple 3.1.1) ; vocabulaire « soutenir l'association », jamais « acheter » ni « premium » ; paliers en repas CROUS. Entrée « Soutenir » des Réglages seulement si `services.soutien` existe, aucune autre surface. Jauge par campus sans nom, moins de 5 dons regroupés ; table `soutien(campus, jour, montant, repas)`.

### boucle-6-4 : formulaire natif, annonces en notification, partage, pages du site [non livré, 7-L]
Formulaire natif vers `retours` (`source='app'`) par RPC bornée `deposer_retour` (`security definer`, calquée sur `compter`), identifiant d'installation joint seulement si la case est cochée ; annonces en notification éteintes par défaut (Apple 4.5 : consentement explicite dans l'app), `jetons_push.annonces`, `annonces.notifiee_le` ; partage `https://ukit-bordeaux.fr/a/<id>` et liens universels (vérifiés sur un build signé, jamais Expo Go) ; pages du site par `services.aide|nouveautes|confidentialite|soutien`. Piège : `BdeDetailsScreen` reçoit l'annonce par paramètres de navigation (ouvrir par id exige une lecture par id et un état « introuvable »). Ouvert : protection contre le flot de la RPC.

### site-ukit-bordeaux : site refondu après 7-I, pages générées depuis l'application [non livré, 7-M]
Dépôt `UKit-website` (Cloudflare Pages). Confidentialité et nouveautés générées à la construction depuis `PRIVACY.md` et `CHANGELOG.md` de `main` (deux politiques de confidentialité sinon) : le `CHANGELOG.md` reste donc à la racine (voir `changelog-genere`). `/a/<id>` = fonction Pages (les robots d'aperçu n'exécutent pas JavaScript) ; `apple-app-site-association` servi en `application/json`, `assetlinks.json` avec l'empreinte de la clé de signature de Google Play. Ouvert : police, formes et thème du site face à l'Épure.

### options-ecartees : sujets écartés ou reportés, à rouvrir quand ils mordent
Comptes UKit (« ne pas construire est le choix qui ne se refactore pas ») ; compteur QR pour partenaires commerciaux (après la 6.4, attend un partenaire réel) ; dette soldée à part après la 6.3 : onglets `@expo/ui`, typage de `Theme.ts`, migration `@expo/vector-icons` (41 fichiers), TypeScript strict, remplacement de `moment` et de cinq paquets non maintenus, visionneuse maison. Une dette se solde quand elle mord.
