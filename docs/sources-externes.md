# Sources de données externes

Inventaire de ce que UKit va chercher à l'extérieur : la surface la plus fragile du projet. Ces sources appartiennent à des tiers, aucune n'offre de contrat
versionné, plusieurs sont consommées par extraction de page plutôt que par API. À lire avant toute intervention réseau. Chaque source est jointe **directement
depuis l'appareil** par un Blueprint de `blueprints/` (tous embarqués ; la version publiée l'emporte si elle est strictement supérieure). Le fichier dit l'hôte,
les en-têtes, les sélecteurs et les durées ; ce document garde ce qu'il ne dit pas : mesures, pièges, ce qui reste applicatif. Notre base de publication est
hors périmètre.

Sources, authentification et fragilité : Celcat (sans authentification ; API interne non documentée), CAS / ENT de l'Université de Bordeaux et de Bordeaux INP
(identifiants universitaires ; pages HTML ancrées par libellé), Affluences (sans authentification, en-têtes imités ; API privée d'une application web),
Croustillant (sans authentification ; API publique, version dans le chemin, la plus saine), ADE (export anonyme ; index positionnels et projet annuel),
n'importe quel export iCalendar (le lien est le secret, gardé dans le trousseau ; fragilité inconnue par construction). S'y ajoutent le rendu cartographique
(section 7) et deux anciennes sources sorties de l'inventaire, jsDelivr et GitHub raw (section 8).

## 1. Celcat — emplois du temps

`https://celcat.u-bordeaux.fr/calendar`, six Blueprints : `ukit.celcat.groupes` et `.salles` (listes), `.jour`, `.semaine`, `.annee` (plage annuelle de la
synchronisation calendrier), `.occupation`. L'hôte et les `resType` sont des entrées du catalogue (`celcat_domaine`, `celcat_res_types`), Bordeaux par défaut.

**Pas de relais, mesuré le 2026-08-09.** Le relais `ukit.kbdev.io` n'existait que parce qu'une page web ne peut pas appeler un autre domaine ; une requête
native n'y est pas soumise. Trois conditions, qu'un changement côté université invaliderait sans prévenir : le serveur ne filtre **ni sur `Origin`, ni sur
`Referer`, ni sur l'`User-Agent`** (envoyés faux ou vides, toujours `200`) ; il répond en **0,6 s** sur une liste et **2,3 s** pour une année entière (216 Ko,
334 événements) ; il accepte `federationIds[]` répété. Les Blueprints envoient `User-Agent: UKit (+https://github.com/KAE-Lab/UKit; contact@kaelab.dev)` (sans
version), pour que l'administrateur puisse nous écrire ; que le `fetch` natif d'Expo le laisse partir se vérifie sur chaque build dans le panneau Blueprints du
menu de développement ([`echo.ts`](../src/shared/aetherius/echo.ts)). Repli si l'université filtre : republier les Blueprints avec un autre `domaine`. Aucun
contrat : un changement se traduira plutôt par une réponse vide que par une erreur explicite.

Liste : `GET /Home/ReadResourceListItems?searchTerm=_&pageSize=10000&resType=<103|102>` (**103 = groupes d'étudiants, 102 = salles**), réponse `{ results: [{
id, text, … }] }`, environ 2 945 groupes et 283 salles ; un `assert` sur `results` évite qu'une clé disparue rende un succès à liste vide. Calendrier : `POST
/Home/GetCalendarData`, corps `start=YYYY-MM-DD&end=YYYY-MM-DD&resType=103&calView=agendaDay&federationIds[]=<id>&colourScheme=3` (`Content-Type:
application/x-www-form-urlencoded; charset=UTF-8`).

- Corps **encodé en formulaire**, jamais en JSON. `federationIds[]` est une clé littérale **répétable** (plusieurs groupes favoris, ou plusieurs salles),
  répétée par l'encodeur du moteur. Celui-ci encode l'espace en `+`, l'ancien `qs` en `%20` : sans effet, les deux formes postées le 2026-08-09 sur un
  identifiant de salle à espaces, accents, point et barre oblique ont donné même réponse au SHA-256 près ([harnais de parité](../tools/parity/README.md)).
- `calView` vaut `agendaDay` (jour, occupation) ou `agendaWeek` (semaine, année) ; `colourScheme=3` fixe `backgroundColor`. `end` est **exclusif** : une journée
  envoie le lendemain, une semaine lundi + 6, soit le dimanche (six jours affichés, du lundi au samedi). **Le serveur déborde** : une journée demandée un
  dimanche renvoie les cours du lundi, et un événement de vacances s'étale sur plusieurs jours.

Un événement porte `id`, `eventCategory` (`Cours`, `TD`, `TP`, `Examen`, `Vacances`…), `start` et `end` (ISO sans fuseau), `backgroundColor`, `description`
(HTML échappé), `modules` (`null` sur les vacances) et `sites` (`["Bâtiment A28"]`). **`sites` est la donnée fiable pour placer un cours sur une carte** : la
fiche le lit avant toute heuristique sur la description, qui échouait en silence quand elle était vide ou décalée. Pièges mesurés sur une année complète :

- **`end` est nul** sur les `Vacances` : `moment(null)` est invalide, `moment(undefined)` vaudrait *maintenant*.
- **`modules` et `sites` traversent l'arité de l'extraction** : zéro correspondance rend `null`, une seule rend **la valeur**, plusieurs la liste. Un cours à un
  module ou un bâtiment (cas dominant) rend donc une chaîne, jamais un tableau ; `sitesDuCours` et `modulesDuCours` normalisent.
- **`modules` et la description ne s'écrivent pas pareil** (2026-08-22) : `"4TIN606U  Histoire…"` a **deux espaces** là où la description n'en a qu'une. La
  ligne n'était pas reconnue comme répétition du sujet et tout glissait d'un rang (la « ligne de salle » devenait l'enseignant).
- **Certains groupes servent le code nu** (2026-09-08, master Génie Logiciel : `4TGL902U`) et mettent l'intitulé dans la description. Sans code d'UE, les
  filtres d'UE ne filtraient rien : `completerLesModules` reprend la ligne de description qui commence par le code.
- **La description est formatée à l'identique en vue jour et en vue semaine** (`\r\n\r\n<br />\r\n\r\n`, réduit à des `;` par `formatDescription`). Le
  séparateur est donc `;` partout : découper la semaine sur `\n` ne rendait qu'un champ, écarté en entier (ni salle, ni enseignant, ni semaines).

**Occupation d'un bâtiment en un appel.** `ukit.celcat.occupation` interroge toutes les salles d'un bâtiment, mais **la réponse ne dit pas pour quelle ressource
elle rend un événement** : la description nomme la salle, en entités HTML (`CREMI - B&#226;t. A28 Salle 005`), et toutes celles d'un cours multi-salles. Sonde
du 2026-09-17 ([`occupation_groupee.py`](../sondes/mesures/occupation_groupee.py)) : mêmes identifiants d'événement qu'en dix-sept appels, attribution par le
nom juste à 100 % (109 attributions). Les `Vacances` ne nomment aucune salle et sont rendues pour chaque salle interrogée. Fragilité : une description qui
cesserait de nommer sa salle la ferait passer pour libre.

**Ce qui reste applicatif** (`PlanningApiMapping`, `PlanningAssembly`, `CampusApiMapping`, `attributionOccupation`), parce qu'un calcul dans un Blueprint serait
à réimplémenter dans les deux moteurs et que l'heure courante le rendrait non rejouable :

- Le rejet des `Vacances` et le refiltrage sur la date, en un seul endroit : la recherche de salles libres a *besoin* des `Vacances` (bâtiment fermé).
- Le sujet (premier `modules`, repli sur `eventCategory`) ; la liste entière est conservée (`PlanningEvent.modules`), un cours pouvant porter plusieurs codes
  d'UE (français et anglais) que le filtre utilise tous.
- Le nettoyage de la description (lignes répétant la catégorie ou **l'un des modules** retirées) et le code d'UE, motif `[0-9][A-Z0-9]*[A-Z][A-Z0-9]*` suivi
  d'une espace : **au moins une lettre**, sinon `2025-2026 - …` devient une UE `2026` (titres ADE, seize matières d'un groupe, 2026-08-15).
- Le tri (heure, puis sujet **sans le code d'UE**), la semaine en six jours, le lundi d'un numéro ISO, la bascule d'année scolaire au 1er août.

## 2. CAS / ENT Université de Bordeaux — identité et messagerie

La source la plus fragile : **pas d'API**. Un navigateur masqué (Blueprints de portail, acte `continuum`) se connecte au CAS puis extrait les pages rendues.
Quatre Blueprints `ukit.portail.bordeaux.*` (noms fournis par le catalogue) : `.dossier` (parcours froid), `.messagerie`, `.moodle` (chronologie), `.documents`
(ReNARD), plus `ukit.portail.verification` (preuve du couple par `renew=true`) et `.deconnexion`, génériques. Messagerie, Moodle et documents sont des widgets
rafraîchis à part (`rafraichirWidgets`) ; il n'y a plus de parcours « chaud », le parcours froid joue le dossier, précédé de la vérification quand le couple
vient d'être saisi. Restent applicatifs : le trousseau, la projection `identité → prénom`, « pas de parenthèse = zéro non lu », le verrou biométrique
(`CredentialsContext`, `ScolariteMapping`). Les widgets rendent `repere` / `nombre` / `detail` ; la messagerie émet aussi `boite_de_reception` / `non_lus`
(versions installées).

Hôtes, tous en `u-bordeaux.fr` : `cas.`, `mondossierweb.`, `intranet.` (annuaire), `webmel.` (Zimbra), `idp-ubx.` puis `moodle.`, `renard.` (documents) et
`apogee.` (notes `?srv=RE01`, examens `RE02` : navigateur intégré seulement, non extrait). `ent.` n'est plus traversé : chaque Blueprint ouvre directement son
service, qui rebondit sur le CAS avec son paramètre `service=`. Chacun attend « le formulaire ou la page utile » (échec nommé `CAS_INDISPONIBLE` et ses
variantes), demande par `extract #username as: count` s'il y a un formulaire et ne joue la connexion (`fill`, clic, pause, garde `#loginErrorsPanel`, `emit
LOGIN_SUCCESS` qui autorise l'écriture des identifiants) que dans ce cas : la connexion est **persistante** (`persist: true`, le ticket CAS va dans le magasin
partagé de la plateforme, le navigateur intégré s'ouvre authentifié, `ukit.portail.deconnexion` doit invalider le CAS), et avec un ticket vivant le CAS renvoie
droit au service, sans formulaire. Les identifiants ne vont qu'au CAS de l'université, sont stockés en SecureStore et transmis au moteur par message corrélé,
jamais dans un script.

**Ce que l'enchaînement a de contre-intuitif.**

- **Une opération injectée n'est sûre après un `navigate` que si celui-ci atterrit sur son document final.** Un service qui rebondit demande une pause (4 s)
  avant la première opération. Mesuré sur Android le 2026-09-04 : sans pause, `bordeaux.dossier` a échoué en 31 990 ms, soit l'échéance de l'appelant (20 000 +
  2 000 + 50 %) et non le plafond du `wait_for` : l'opération s'était perdue, le document intermédiaire étant remplacé sans que la vue le signale.
  `verification`, qui navigue droit sur le CAS, n'en a jamais eu besoin.
- **La pause après le clic** (4 s, 5 s pour Zimbra et Moodle) : une opération émise pendant la cascade d'authentification se perd en silence (limite du moteur).
  La cascade tient en 0,5 à 1,3 s au poste ; 4 s en laissent trois à quatre fois autant à un téléphone en cellulaire.
- **`#loginErrorsPanel`** est **absent** de la page propre et **présent** dès que le CAS refuse (2026-08-09) ; `#msg2` et `.errors` existent vides et ne
  discriminent rien. Sans cette garde, un mot de passe faux coûte le plafond du sélecteur suivant : 41 s mesurées contre 13 s.
- **`wait_for` attend `visible` par défaut**, or une donnée repliée n'est jamais visible (l'annuaire, accordéon fermé, a expiré à 25 s en `visible`, contre 23
  ms en `attached`). Un sélecteur qui ne matche rien rend `detached` vrai immédiatement : sonder le gabarit de chargement de Moodle par sa *classe* répondait en
  10 ms sans rien prouver (c'est une valeur de `data-region`).
- **Une union d'attente doit énumérer tous les états de la page** : `bordeaux-inp.messagerie` en a trois (formulaire, consentement Shibboleth, boîte) ; avec
  deux, elle a brûlé ses 20 000 ms.
- **`wait_for` porte un sélecteur CSS, jamais un XPath** : le moteur embarqué lit `selector_type` sur cette action, le moteur Python non. Même piège pour les
  pseudo-classes Playwright (`:text-is()`, `:nth-match()`). Le moteur embarqué refuse aussi un clic ambigu : un sélecteur de `click` doit matcher exactement un
  élément.
- **Une lecture facultative descend en `as: "list"` ou dans un bloc `optional`, jamais derrière un `when`** : un step sauté n'enregistre aucune sortie et le
  `outputs` qui le référence lève en `StrictUndefined`. Les bonus utilisent `wait` et non `wait_for` (un timeout ferait céder le bloc), et **une lecture bonus
  perdue ne fait aucun bruit** : à 500 ms, *Parcours* de l'INP rendait `formation_libelle` vide et le run se déclarait réussi, d'où les pauses de 6 s conservées
  (*Parcours* rend en 2,3 s, l'arbre ADE en 2,8 s).

**Mesures du 2026-09-04** (pauses aveugles de 60 s en tout, calées sur un pire cas supposé). Parcours froid de Bordeaux au poste filaire : 43,0 s avant, 19,9 s
après. Sur Android (Expo Go, wifi eduroam du campus) : **14,1 s à Bordeaux et 25,3 s à Bordeaux INP**, widgets entre 4,4 et 9,8 s, mot de passe faux en 7,2 s
(~20 avant), source injoignable en 24 s (~36 avant), relancement servi par le cache en 691 ms. Pas de mesure en cellulaire (la marge de 4 s couvre ce cas).

**Dossier de Bordeaux.** Le portail est un **Vaadin 8** (thème Valo ; client compilé par GWT, d'où les `gwt-uid-NN`). Les champs sont ancrés par leur libellé en
XPath (`Dossier`, `NNE` pour l'INE, `Prénom et Nom`, `Email`, `Date de naissance`) depuis le 2026-08-25 (11 libellés testés, 11 nœuds uniques) : un décalage du
DOM ne rend plus la mauvaise valeur, il fait échouer l'extraction. **Piège** : une ligne de `v-formlayout` porte **trois** cellules (légende, erreur, contenu),
donc `following-sibling::td[1]` tombe sur la cellule d'erreur, vide. L'`assert` ne garde que le cas non couvert, un libellé au-dessus d'une valeur vide. La
formation vient de la vue *Inscriptions*, dont le menu est fait de `div[role=button]` qu'on **clique** (application à état serveur) : la première ligne est
l'inscription courante, le tableau est virtualisé (seule la première ligne est acquise) et elle porte un glyphe FontAwesome collé au libellé (`M1
Informatique\uf002`, zone d'usage privé Unicode) que la projection retire.

**Messagerie.** `#zti__main_Mail__2_textCell` rend `Réception (789)` ; `as: "number"` en extrait le premier nombre et le libellé brut descend aussi, car il
distingue une boîte sans parenthèse (zéro non lu) d'une lecture qui n'a rien trouvé. Le **user-agent de Chrome desktop** (`options.stealth.user_agent`) est
porteur : avec un UA mobile, le service rend `/modern/`, où le compteur n'existe pas.

**Moodle.** Le chemin par `/login/index.php` (SP, page de découverte) tuait la WebView Android en production (2026-08-31) alors qu'il passait au poste. L'entrée
est le SSO initié par l'IdP, dont `target` désigne `/auth/shibboleth/index.php`, la page qui transforme l'assertion en connexion Moodle (sans elle : authentifié
côté SP, déconnecté côté Moodle). `/Shibboleth.sso/Login?entityID=` reste mort (2026-08-28). Chronologie : sélecteurs du gabarit Moodle (4.5 et 5.0).

**Documents** (mesures du 2026-08-29). L'adresse d'une pièce ReNARD est déterministe (`/document/<base64>/lang`, sans UUID ni horodatage), l'identité vient du
cookie, la pièce est un vrai PDF servi par une simple requête. La requête part de la page (`evaluate`) ; le contenu revient en base64 par le pont, ce qui borne
la pièce à 4 Mo. On navigue d'abord sur la racine : le retour du CAS OAuth y pointe.

**Ce que l'application distingue.** CAS injoignable : `unavailable`, avec Réessayer. Échec nommé par le Blueprint : `blocked`, avec un libellé précis pour
`CAS_INDISPONIBLE`, `MESSAGERIE_INDISPONIBLE` et tout code en `_INDISPONIBLE(S)` (`estCodeDeServiceIndisponible`, née de `MOODLE_INDISPONIBLE` affiché «
Connexion interrompue »), `LOGIN_FAILED` n'étant pas réessayable. Libellés décalés (`assert`) : `rejected`, rien n'est écrit. Sélecteur introuvable : `data`.

## 3. Affluences — bibliothèques universitaires

API privée de l'application web `affluences.com`, trois Blueprints (`LibraryService`) : `ukit.campus.bibliotheques`, `.bibliotheque-affluence`,
`.bibliotheque-horaires`. Les en-têtes (`x-service-name: website`, `Origin` et `Referer` à `https://affluences.com`, `Accept-Language: fr`, `User-Agent`
Mozilla) imitent le client web : observés, pas documentés. Aucun contrat.

- **Découverte** : `POST https://api.affluences.com/app/v3/sites/map` avec `{ "latitude", "longitude" }`, qui ne renvoie que les sites proches du point. Le
  service joue **un run concurrent par point de balayage** : la position de l'utilisateur (toujours le premier) plus les `bibliotheques_points` du catalogue,
  deux pour Bordeaux depuis le 2026-09-03 (onze avant : mesure du 2026-08-08, Bordeaux Centre et Talence/Pessac voient les mêmes 8 sites, cinq points n'en
  rendaient aucun, quatre villes portaient six sites que personne d'autre ne voyait). Un point muet n'emporte pas les autres (bandeau de couverture incomplète)
  ; zéro réponse = échec.
- **Reste applicatif** : le balayage (décision produit), le filtre de catégorie (la grammaire refuse d'indexer une liste dans un prédicat), Haversine et le tri.
  Sont retenus les sites dont `categories` contient **1** ou **20** (`CATEGORIES_BU`). Son `estimated_distance` (relative au point de balayage) n'est qu'un
  repli.
- **Piège d'arité** : chaque site de la région n'ayant qu'une catégorie, `$.categories[*].id` rend `20` et jamais `[20]` : c'est le cas nominal. `commeListe`
  (`LibraryMapping`) normalise, un test le verrouille.
- **Affluence** (`GET /app/v4/sites/{slug}/live-data`) : le taux existe sous deux chemins selon les sites, `liveAttendance.percentage` et `.occupancy`, au choix
  applicatif. Un site fermé rend `liveAttendance: null`, un **résultat** et non une absence de réponse ; un slug inconnu rend 404, refusé par `expect`.
- **Horaires** (`GET /app/v4/sites/{slug}/timetables?weekOffset=<n>`, entier signé, 0 = semaine courante) : le sous-arbre `openingHours` descend tel quel, car
  une journée porte des **paires** ouverture/fermeture que `fields`, plat, ne sait pas rendre.

## 4. Croustillant — restaurants CROUS

API publique communautaire, `https://api.croustillant.menu/v1`, la source la plus saine. Deux Blueprints (`CrousService`) : `ukit.campus.restaurants` (`GET
/regions/{region}/restaurants`) et `ukit.campus.restaurant-menu` (`GET /restaurants/{code}/menu`) ; `/restaurants/{code}/preview` n'en a pas, c'est une URL
posée dans une balise image. La région vient du catalogue (`crous_region`, `1` pour Bordeaux) ; `null` n'est pas une panne.

- Les établissements de `type.code === 4` sont écartés par un `where` du Blueprint (12 des 41 de la région).
- **`horaires` est une chaîne JSON** (`"[\"du lundi au vendredi\", \"12h-13h45\"]"`) et non un tableau : le test `Array.isArray` d'origine affichait « horaires
  non spécifiés » pour les 41. Les deux formes sont acceptées, une troisième retombe sur `UNSPECIFIED_HOURS`.
- **La date reçue est `DD-MM-YYYY`**, l'application manipule `YYYY-MM-DD` : conversion applicative (les filtres de date du moteur produisent un format attendu
  par une source, ils n'en interprètent pas). Restent aussi applicatifs : Haversine et tri, regroupement des repas par `type` (`midi` / `soir`) ; `repas`
  descend tel quel (`fields` est plat).
- **Plus de la moitié des restaurants rendent `404` sur `/menu`** (24 des 41, dont 8 affichés) : « ce restaurant ne publie pas de menu », pas une panne. Le
  Blueprint n'a donc pas d'`expect` : un `assert` accepte 200 **ou** 404, sinon un état vide fréquent deviendrait un message d'erreur.

## 5. Bordeaux INP — le second portail

Ajouté sans release (une ligne dans `etablissements`, Blueprints sous le préfixe réservé `ukit.portail.`), aujourd'hui embarqué : `.dossier`, `.messagerie`,
`.documents` ([`blueprints/portails/`](../blueprints/portails/)), plus les deux d'ADE. Mêmes sorties que Bordeaux (la sortie est le contrat).

- `cas.bordeaux-inp.fr` : Apereo thème MDC, soumission par **`<button id="submitBtn">`** (Bordeaux : `input[type=submit]`), `#loginErrorsPanel` identique.
  `sso.bordeaux-inp.fr` : SAML, son IdP **délègue au CAS** (2026-08-28). `partage.bordeaux-inp.fr/mail` : Zimbra, **le même produit que `webmel`**, même
  sélecteur, avec une page de consentement Shibboleth à la première autorisation.
- `mondossierweb.bordeaux-inp.fr` : **Vaadin 14+ (PC-Scol)**, vraies routes, ancrage par libellé. `/` : nom et prénom séparés, naissance, numéro étudiant ;
  `/coordonnees` : mail ; `/acces` : bac, primo-inscriptions et **INE** (pas dans l'état-civil) ; `/inscriptions` : onglet *Parcours*, une carte par année (la
  formation). `ade.bordeaux-inp.fr/direct/myplanning.jsp` : arbre de ressources **sous authentification** (section 6).
- **Fragilité** : le numéro étudiant est lu par position dans le bandeau latéral (`(//vaadin-vertical-layout[@slot='drawer']//label)[2]`), faute de libellé.
  Filet : l'`assert` sur les trois libellés de l'état-civil.
- **Casse** (mesuré le 2026-08-10) : XPath lit le texte **source** (`Nom de famille`), l'extraction rend le texte **affiché**, mis en capitales par la feuille
  de style (`NOM DE FAMILLE`) : sélecteur et `assert` comparent donc deux formes, volontairement. Dans *Parcours*, les libellés apparaissent autant de fois que
  d'années : l'indexation `[1]` vise la carte (la première est l'année courante).
- **Ce qu'on ne porte pas** (sonde du 2026-08-25) : l'onglet *Documentation* est un lien externe vers une aide de l'ENT. Les PDF des cartes *Parcours*
  (certificat, attestation de paiement, relevés) ont une URL à UUID **et** horodatage régénérés à chaque rendu : des portes, jamais des données stockables.
- Les lectures *Accès*, *Parcours* et arbre ADE sont des bonus en blocs `optional` : leur échec laisse le run en `partial`, identité lue (2026-09-04 : une
  identité perdue pour un INE).

## Ce que les sondes surveillent

Un workflow joue chaque matin (05:00 UTC) une sonde par source **sans identifiant** et ouvre une issue GitHub quand une source tombe
([`sondes/README.md`](../sondes/README.md), [`sondes.json`](../sondes/sondes.json)) ; les entrées qui changent (CAS, projet ADE) sont lues au catalogue.

| Source | Sonde | Ce qu'elle prouve |
|---|---|---|
| Celcat | `ukit.celcat.groupes` de l'application | la liste des groupes rend plus de zéro entrée |
| CAS de Bordeaux et de Bordeaux INP | `ukit.sonde.cas` | la page de connexion sert son formulaire (`renew=true`) |
| Moodle de Bordeaux | `ukit.sonde.moodle` | l'adresse Unsolicited SSO de l'IdP atteint le formulaire du CAS |
| ADE de Bordeaux INP | `ukit.portail.bordeaux-inp.edt` de l'application | l'export d'une ressource se lit comme un calendrier |
| Base de publication | native | le manifeste se lit et ses empreintes correspondent (vide, il est sain) |
| Affluences, Croustillant, OpenFreeMap | **aucune** | un écran dit leur panne et aucune ne porte de connexion ; en ajouter une est une ligne de `sondes.json` |

Elles prouvent qu'un formulaire est atteignable, pas que le dossier derrière marche ; elles voient une panne, pas une lenteur.

## 6. ADE — emploi du temps par export iCalendar

Export d'abonnement du produit ADE : sur vingt universités sondées, aucune instance Celcat anonyme hors Bordeaux, alors que presque tous les produits exportent
en iCal (RFC 5545).

`https://ade.bordeaux-inp.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?resources=<index>[,<index>…]&projectId=<n>&calType=ical&firstDate=AAAA-MM-JJ&lastDate=AAAA-MM-JJ`,
`Accept: text/calendar`.

Deux Blueprints (`PlanningIcalSource`) : `ukit.portail.bordeaux-inp.edt` (plage, vues jour et semaine) et `.edt.annee` (même requête sur l'année, `timeout_ms`
60 s). Ils exigent un moteur ≥ 0.5.4 (`versions.json` : l'extraction `from: "text"` n'existe pas avant). `resources` (**index positionnels** dans l'arbre des
ressources du projet) vient du référentiel de la colonne `edt` du catalogue ; `projectId` (le projet ADE, c'est-à-dire l'**année universitaire**) de
`edt.params.projet` ; `firstDate` / `lastDate` sont **inclusives** et calculées par le service.

**Mesures du 2026-08-15.**

- **`resources` est un index, pas un identifiant ADE** : `resources=1` rend la racine (tout l'établissement, cinq écoles, 3156 événements sur l'année) et
  l'identifiant interne lu dans un UID ne rend rien. L'index est stable à l'intérieur d'un projet, et un projet est annuel : plusieurs coexistent (`2025-2026`
  est le vivant, `projectId=1`). `resources` accepte une liste : le planning agrégé des favoris tient en **une** requête.
- **`DTSTART` est en UTC honnête** (un même créneau est servi `07:30Z` en septembre, `08:30Z` en novembre : 09:30 à Paris). `(Exporté le:…)` porte l'horodatage
  de la requête et change à chaque appel (retiré par la projection). `LOCATION` porte parfois plusieurs salles (virgule échappée), souvent aucune.
- La description suit `[commentaire…] <CODE-MODULE> <TYPE> <GROUPE…> [MATIÈRE] <ENSEIGNANT…> (Exporté le:…)`, **sans position fixe** (le commentaire de tête
  tient zéro à deux lignes). L'ancre est le **code de module** (`^[A-Z]{3}\d-[A-Z0-9]{5}$`), le type est la ligne qui le suit.

Reste applicatif : dépliage RFC 5545 par **`ical.js`**, projection sur `PlanningEvent` (`IcsMapping`), référentiel des groupes, plages, tri. **Fragilité** : le
format est normalisé, le point faible est le **référentiel** (rien dans la source ne nomme un index), relevé par
[`tools/releve-ade.mjs`](../tools/releve-ade.mjs), publié dans la colonne `edt` et à rejouer à chaque rentrée. Un favori qui ne résout plus produit un message
dédié, pas une journée vide.

**Accès anonyme coupé du 2026-08-25 au 2026-08-28.** L'export répondait `HTTP 500` (`com.adesoft.errors.InvalidLogin`) alors que le serveur était debout (racine
`200`, `myplanning.jsp` `302` vers le CAS) : le compte anonyme d'ADE avait été désactivé ou son mot de passe expiré au changement de projet. Ni les dates ni le
projet n'étaient en cause (quatre `projectId` sur trois plages : douze `500`). Rétabli sans intervention de notre part ; le harnais de parité l'avait signalé
(deux cas rouges, cause externe : ne pas « réparer » en déplaçant les dates).

**L'arbre authentifié (2026-08-24).** `myplanning.jsp`, ouvert sous le CAS, rend un arbre portant les **vrais identifiants** ADE (`Direct Planning Tree_2467`
ENSEIRB-MATMECA, `2475` ENSMAC…), dans le même espace que `resources` : l'export anonyme les accepte.

- ADE présélectionne **la fiche de l'étudiant connecté** : son identifiant personnel se lit sans recherche et l'export anonyme rend **son** emploi du temps. Cet
  identifiant est aussi sensible qu'un lien d'abonnement nominatif.
- Tous les nœuds ne portent pas d'événements (chez ENSEIRB, les cours sont accrochés aux étudiants et aux groupes, pas aux promotions) : un nœud publié sans
  sondage resterait vide toute l'année. Une seule semaine ne prouve rien : `2469` (IIETE3) rend 0 événement la semaine du 12 janvier et 47 sur trois semaines
  réparties dans l'année (d'où trois semaines au relevé).
- L'arbre donne des noms d'école, le balayage anonyme des index sans école. `tools/releve-ade.mjs --ecoles 2467=ENSEIRB-MATMECA,…` les relie **par mesure**
  (identifiants d'événements) et rend la **part** de cours de chaque index dans l'école : l'index `61` n'a que 2 de ses 11 cours chez ENSEIRB, une mutualisation
  et non une appartenance. Préfixer sans cette mesure publierait l'emploi du temps d'une école sous le nom d'une autre.

**Export iCalendar libre.** Repli universel : `ukit.edt.abonnement` (hors préfixe `ukit.portail.`, il n'appartient à aucun établissement) joue le lien que
l'étudiant colle, **verbatim et sans bornes** (30 s). Le lien est le secret et vit dans le trousseau. Le découpage par date est applicatif.

## 7. Rendu cartographique

[`EmbeddedMap`](../src/shared/map/EmbeddedMap.tsx) charge dans une WebView une page qui référence
`https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.{css,js}` et le style `https://tiles.openfreemap.org/styles/positron` (données OpenStreetMap, sans clé,
autorisé en production). L'attribution reste affichée : la politique d'usage des données l'exige.

## 8. Anciennes sources : jsDelivr / `ukit-data` et GitHub raw

Les annonces sont lues dans la table `annonces` de notre base de publication ; le code ne lit plus jsDelivr, sans repli (il servirait du contenu périmé et
masquerait les pannes). Le dépôt `KAE-Lab/ukit-data` n'est plus écrit mais n'est pas supprimé : il sert encore les visuels
(`cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/images/…`) des versions déjà installées.
[`ukit.campus.annonces`](../blueprints/ukit-campus-annonces.blueprint.json) reste embarqué comme témoin du format, sans être joué. De même, `UpdateAlert` ne lit
plus le fichier `VERSION` de GitHub raw mais la table `app_release` : l'ancienne adresse visait une branche `master` renommée depuis, et le contrôle échouait en
silence.

## Modèle d'erreur commun

Tous les services de données rendent `{ ok: true, … }` ou `{ ok: false, failure }` (on teste `resultat.ok === false`). L'échec est **typé** et rangé dans une
famille d'écran (source en panne, réponse inattendue, contenu introuvable, identifiants manquants, échec nommé par le Blueprint) : source injoignable, statut
inattendu et journée vide légitime donnent trois écrans différents. Une **couverture partielle** (point de balayage muet, favori ADE périmé) n'est ni un succès
muet ni un échec : elle se dit par un bandeau au-dessus de la liste. Les défauts connus sont dans [`defauts-fonctionnels.md`](defauts-fonctionnels.md).

## Vérifier

Pour chaque source touchée, jouer le chemin nominal **et** le chemin dégradé : mode avion (cache daté du planning, état explicite de Campus), réseau coupé après
le lancement, portail avec un mot de passe erroné (`LOGIN_FAILED` attendu) puis avec un compte valide sans données froides (parcours froid complet). Modifier un
fichier de [`blueprints/`](../blueprints/) (hôte en `.invalid`, `expect` impossible, chemin d'extraction faux) produit chaque famille d'échec sans toucher à la
connectivité. `npm run parity` couvre le nominal sur les vraies sources ; le chemin dégradé mérite l'appareil.

