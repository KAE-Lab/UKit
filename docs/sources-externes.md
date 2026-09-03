# Sources de données externes

Inventaire complet de ce que UKit va chercher à l'extérieur. C'est la surface la plus fragile du
projet : ces sources appartiennent à des tiers, aucune n'offre de contrat versionné, et plusieurs
sont consommées par extraction de page plutôt que par API. Ce document doit contenir assez de détail
pour rejouer chaque appel sans lire le code.

**Il n'existe aucun intermédiaire entre l'application et ces sources** : chacune est jointe
directement depuis l'appareil. Voir [donnees-et-persistance.md](donnees-et-persistance.md) pour ce
qui est conservé localement.

Notre [base de publication](backend.md) n'est pas dans cet inventaire, et c'est délibéré : elle
porte notre propre contenu, elle ne relaie aucune de ces sources, et rien de ce qui est écrit ici —
fragilité, extraction, contrat non versionné — ne s'y applique. Ce document reste celui des sources
**tierces**.

> **Migration en cours.** La [Phase 6](phase-6/README.md) déplace la façon d'atteindre ces sources
> depuis le code vers des [Blueprints](blueprints.md) : ce document reste **le** document à lire
> avant toute intervention réseau, et il gagne, source par source, le nom du Blueprint qui la porte
> et ce qui est resté applicatif. Ce qui est décrit ci-dessous est l'état du code ; chaque jalon de
> migration met à jour la section concernée.

## Vue d'ensemble

| # | Source | Rôle | Authentification | Fragilité |
|---|---|---|---|---|
| 1 | Celcat (`celcat.u-bordeaux.fr`) | emplois du temps, groupes, salles | aucune | moyenne — API interne non documentée. **Six Blueprints** depuis [6-E](phase-6/6-e-planning.md), et le relais `ukit.kbdev.io` est sorti de l'architecture |
| 2 | CAS / ENT Université de Bordeaux | identité étudiant, formation, messagerie | identifiants universitaires | **moyenne** — extraction de pages HTML, mais **ancrées par libellé** depuis le 2026-08-25 : les sélecteurs positionnels ont disparu. **Deux Blueprints** depuis [6-F](phase-6/6-f-scolarite.md) |
| 3 | Affluences | bibliothèques, affluence, horaires | aucune (en-têtes imités) | moyenne — API privée d'une application web. **Trois Blueprints** depuis [6-D](phase-6/6-d-campus.md) |
| 4 | Croustillant | restaurants CROUS et menus | aucune | faible — API publique documentée. **Deux Blueprints** depuis [6-D](phase-6/6-d-campus.md) |
| 5 | ~~jsDelivr / `ukit-data`~~ | ~~annonces de vie étudiante~~ | — | **sortie de l'inventaire** — passée en base au jalon [6-B](phase-6/6-b-supabase.md) |
| 6 | GitHub raw | fichier de version applicative | aucune | faible |
| 7 | CDN de rendu de carte | tuiles OpenFreeMap, bibliothèque MapLibre GL | aucune | faible |
| 8 | ADE (`ade.bordeaux-inp.fr`) | emploi du temps, par export iCalendar | aucune | moyenne — export anonyme, mais **index de ressource positionnels et projet annuel**. **Deux Blueprints** depuis [6-I](phase-6/6-i-planning-universel.md) |
| 9 | **N'importe quel export iCalendar**, à l'adresse que l'étudiant colle | emploi du temps | le lien **est** le secret (trousseau) | inconnue par construction — c'est le [repli universel](phase-6/6-j-compte-et-sources-par-etablissement.md) de 6-J. Un Blueprint unique, [`ukit.edt.abonnement`](../blueprints/ukit-edt-abonnement.blueprint.json), demande le lien **verbatim et sans bornes** ; le découpage par date est applicatif, parce que tous les produits n'acceptent pas de paramètres de plage |

## 1. Celcat — emplois du temps

Serveur de planning de l'université, joint **directement** sur `https://celcat.u-bordeaux.fr/calendar`
depuis le jalon [6-E](phase-6/6-e-planning.md). Six [Blueprints](blueprints.md) le portent, un par
appel réellement joué :

| Blueprint | Appel | Consommateur |
|---|---|---|
| `ukit.celcat.groupes` | la liste des groupes d'étudiants (`resType` 103) | [`PlanningApiService`](../src/features/Planning/services/PlanningApiService.ts) |
| `ukit.celcat.jour` | les cours d'une journée, pour un ou plusieurs groupes | idem |
| `ukit.celcat.semaine` | les cours d'une semaine | idem |
| `ukit.celcat.annee` | la plage annuelle de la synchronisation calendrier | idem |
| `ukit.celcat.salles` | la liste des salles (`resType` 102) | [`CampusApiService`](../src/features/Campus/services/CampusApiService.ts) |
| `ukit.celcat.occupation` | l'occupation de salles sur une journée | idem |

### Le relais est sorti de l'architecture

L'application passait par `https://ukit.kbdev.io/Home/`, un point d'entrée dédié. Il existait pour
une seule raison : une page web ne peut pas appeler un autre domaine sans son accord, et
l'application était une WebView. **Une requête émise nativement depuis l'appareil n'y est pas
soumise**, donc le relais n'a plus d'objet — un serveur à héberger, à payer et à surveiller en moins.

Trois conditions ont été mesurées avant de basculer, le **2026-08-09**, et elles sont notées ici
parce qu'un changement côté université les invaliderait sans prévenir :

- le serveur ne filtre **ni sur `Origin`, ni sur `Referer`, ni sur l'`User-Agent`** : les trois ont
  été envoyés faux ou vides, la réponse reste `200` ;
- il répond en **0,6 s** sur une liste, **2,3 s** pour une année entière (216 Ko, 334 événements) ;
- il accepte `federationIds[]` répété, donc l'interrogation multi-ressources en une requête.

> **Le relais était déjà tombé au moment de la bascule.** Les trois sondes de ce jour-là ont reçu un
> **522 (Cloudflare)** après vingt secondes, à chaque essai. Le planning des utilisateurs sans cache
> était donc en panne, et le jalon 6-E est autant une réparation qu'une migration.

Le repli reste gratuit et n'exige pas de release : `vars.domaine` peut redevenir le relais par une
**publication de Blueprint**. L'extinction définitive du relais est une décision de
[6-Z](phase-6/6-z-livraison-finale.md), après observation.

### Lister des ressources

```http
GET https://celcat.u-bordeaux.fr/calendar/Home/ReadResourceListItems
    ?searchTerm=_&pageSize=10000&resType=<103|102>
```

`resType` sélectionne la famille de ressources : **103 = groupes d'étudiants**, **102 = salles**.
Réponse : `{ results: [{ id, text, ... }] }`. Environ 2 945 groupes et 283 salles.

Les deux Blueprints portent un `assert` sur la présence du tableau `results` : sans lui, une réponse
dont la clé aurait disparu rendrait un **succès à liste vide**, indistinguable d'une liste
légitimement vide ([blueprints.md](blueprints.md#affirmer-la-forme-pour-que--rien-trouvé--ne-se-confonde-pas-avec--rien-à-trouver-)).

### Récupérer un calendrier

```http
POST https://celcat.u-bordeaux.fr/calendar/Home/GetCalendarData
Pragma: no-cache
Cache-Control: no-cache
Accept: application/json
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

start=YYYY-MM-DD&end=YYYY-MM-DD&resType=103&calView=agendaDay
&federationIds[]=<identifiant>&colourScheme=3
```

Points à respecter, tous appris à l'usage :

- Le corps est **encodé en formulaire**, jamais en JSON. `federationIds[]` est une clé littérale
  **répétable** : `federationIds[]=A&federationIds[]=B` interroge deux ressources en une requête
  (plusieurs groupes favoris, ou plusieurs salles). Le Blueprint le déclare en entrée `array`, et
  l'encodeur du moteur répète la clé — c'est ce que faisait `qs.stringify(data, { arrayFormat: 'repeat' })`.
- **Une nuance d'encodage subsiste, et elle est sans effet.** `qs` sortait en RFC3986 (une espace
  devient `%20`), l'encodeur du moteur reproduit `quote_plus` de Python (une espace devient `+`).
  Partout ailleurs les deux coïncident au caractère près, `!'()*~` compris. Les deux formes ont été
  postées le 2026-08-09 sur un identifiant de salle porteur d'espaces, d'accents, d'un point et d'une
  barre oblique : même statut, même réponse au SHA-256 près. Le
  [harnais de parité](../tools/parity/README.md) compare le corps réellement émis, cet écart
  normalisé et lui seul.
- `Connection: keep-alive` figurait dans les en-têtes du code d'origine ; c'est un en-tête **interdit
  à `fetch`**, il n'a jamais traversé, et il a été retiré.
- `calView` vaut `agendaDay` ou `agendaWeek` selon la fenêtre demandée. `resType` doit correspondre à
  la famille des identifiants passés.
- `colourScheme=3` détermine la palette renvoyée dans `backgroundColor` ; c'est cette couleur qui
  colore les cartes de cours dans l'application.
- `end` est **exclusif**. Une journée envoie donc le lendemain (`{{ inputs.jour | add_days(1) }}`), et
  une semaine envoie le **samedi** (`add_days(6)`) : l'application n'affiche que six jours, du lundi
  au samedi.
- **Le serveur déborde.** Une journée demandée un dimanche renvoie les cours du lundi ; un événement
  de vacances s'étale sur plusieurs jours. Le refiltrage sur la date exacte reste donc applicatif.

### Forme d'un événement

```ts
interface EvenementCelcat {
    id: string;
    eventCategory: string;      // "Cours", "TD", "TP", "Examen", "Vacances"…
    start: string;              // ISO, sans fuseau
    end: string | null;         // null sur les evenements en journee entiere
    backgroundColor: string;
    description: string;        // HTML echappe, multi-lignes
    modules: string[] | null;   // intitules de matiere, null sur les vacances
    sites: string[] | null;     // batiments declares : ["Bâtiment A28"]
}
```

**`sites` est la donnée fiable pour placer un cours sur une carte**, et elle a longtemps été ignorée :
la fiche de cours devinait le bâtiment en cherchant un code de salle dans la description, ce qui
échouait silencieusement dès que la description était vide ou décalée d'une ligne. Le champ est
extrait depuis la correction du 2026-08-22 (`$.sites[*]`) et la fiche le lit **avant** toute
heuristique. Il porte le libellé complet — `Bâtiment A28` — que la reconnaissance de salle réduit au
code par le motif de l'établissement, sans qu'aucune règle nouvelle soit inventée pour lui.

Trois pièges mesurés sur une année complète de données :

- **`end` est nul** sur les événements `Vacances`, servis en journée entière. La valeur descend telle
  quelle jusqu'à `moment(null)`, qui est une date **invalide** — et non `moment(undefined)`, qui
  vaudrait *maintenant*.
- **`modules` traverse l'arité de l'extraction.** Un chemin `$.modules[*]` qui ne correspond à rien
  rend `null`, une seule correspondance rend **la valeur**, plusieurs rendent la liste. Un cours à un
  module rend donc une chaîne, jamais un tableau d'un élément. Corollaire : un `modules: []` serait
  indistinguable d'un `modules: null` — le cas n'existe pas dans une année de données, et le sujet
  retombe sur la catégorie plutôt que de rester indéfini.
- **`sites` traverse la même arité**, et c'est le cas dominant : un cours nomme presque toujours un
  seul bâtiment, donc `$.sites[*]` rend presque toujours une **chaîne**. Un code écrit « évidemment »
  pour une liste ne traiterait donc jamais le cas normal. `sitesDuCours` ramène les deux formes à une
  liste, et le harnais de parité compare l'extraction à une lecture directe du champ brut.
- **`modules` et la description ne s'écrivent pas pareil.** Mesuré le 2026-08-22 :
  `modules` rend `"4TIN606U  Histoire et Epistémologie de l'Optimisation"` avec **deux espaces**, là
  où la description n'en a qu'une. La ligne du module n'était donc pas reconnue comme une répétition
  du sujet, elle restait dans la description, et tout le reste glissait d'un rang : la « ligne de
  salle » devenait le nom de l'enseignant. C'est la seconde cause des cartes manquantes, et `sites`
  la rend sans objet.

### Ce qui reste applicatif, et ce n'est pas rien

La frontière est celle de [blueprints.md](blueprints.md#ce-qui-descend-dans-un-blueprint-et-ce-qui-ny-descend-pas) :
le Blueprint décrit la requête et ce qu'on en retient, le reste est du calcul. Vit donc dans
[`PlanningApiMapping`](../src/features/Planning/services/PlanningApiMapping.ts) et
[`CampusApiMapping`](../src/features/Campus/services/CampusApiMapping.ts) :

1. Le rejet des événements `Vacances` **et** le refiltrage sur la date exacte. Le fichier de
   référence d'Aetherius filtrait `Vacances` dans le Blueprint ; on ne l'a pas suivi. **Un filtre, un
   endroit** — et surtout, la recherche de salles libres a *besoin* des `Vacances` : ce sont elles qui
   déclarent un bâtiment fermé.
2. Le sujet, tiré du premier `modules`, avec repli sur `eventCategory`.
3. Le nettoyage de la description par [`formatDescription`](../src/shared/utils/formatUtils.ts) :
   suppression des `\r` et des `<br />`, remplacement de quatre sauts de ligne consécutifs par `;`,
   décodage des entités HTML, puis retrait des lignes qui répètent la catégorie ou le sujet.
4. Le séparateur de description est `;` pour **toutes** les vues. Il a longtemps été `\n` pour la
   semaine, au nom d'un formatage différent selon `calView` — justification mesurée fausse au jalon
   6-E, puis conservée parce que la corriger déplaçait des pixels. Elle l'est depuis le 2026-08-22 :
   le serveur formate à l'identique dans les deux vues, `formatDescription` réduit cela à des `;`, et
   découper sur `\n` ne rendait qu'un champ — porteur de la catégorie, donc écarté en entier. La vue
   semaine n'affichait donc **ni salle, ni enseignant, ni semaines**.
5. Le code d'UE, extrait du sujet par `([0-9][A-Z0-9]+) (.+)` : `4TIN301U Algorithmique` devient
   `UE = "4TIN301U"`, `subject = "Algorithmique"`. C'est lui qui alimente les filtres.
6. Le tri double : heure de début, puis sujet alphabétique **après retrait du code d'UE**.
7. Le découpage de la semaine en six jours et le calcul des horodatages ; le calcul du lundi depuis un
   numéro de semaine ISO et la bascule d'année scolaire au 1er août, qui ont besoin de l'heure
   courante et n'ont donc rien à faire dans un fichier rejouable.
8. La reconstruction des bâtiments à partir des salles, par correspondance textuelle avec le
   référentiel ([features/campus-salles-libres.md](features/campus-salles-libres.md)).
9. La réduction d'un `sites` (`Bâtiment A28`) à un code du référentiel, par le format de salle de
   l'établissement ([cartographie.md](cartographie.md#extraction-dun-lieu-depuis-un-cours)).

### Gestion d'erreur

Les six appels rendent désormais `{ ok: true, … }` ou `{ ok: false, failure }`, et la famille d'échec
décide de l'écran ([blueprints.md](blueprints.md#les-erreurs-cessent-dêtre-avalées)). Une source
injoignable, une réponse au statut inattendu et une journée légitimement vide produisent **trois
écrans différents** — ce n'était pas le cas avant, où tout rendait `null`.

Le cache de repli hors ligne, lui, n'a pas bougé : il enveloppe l'appel, avant comme après.

### Fragilité

L'API n'est pas documentée publiquement et n'offre aucun contrat. `resType`, `calView` et
`colourScheme` sont désormais des `vars` nommées, en un seul endroit et corrigeables sans release —
elles ne sont pas devenues **garanties** pour autant. Un changement côté Celcat se traduira toujours
par une réponse vide plutôt que par une erreur explicite ; `expect` transforme au moins un statut
inattendu en échec nommé, et l'`assert` des deux listes rattrape une clé disparue.

## 2. CAS / ENT Université de Bordeaux — identité et messagerie

La source la plus fragile : il n'y a **pas d'API**. UKit ouvre une WebView cachée, se connecte au
CAS, puis extrait les informations des pages rendues.

**Migrée en Blueprints** au jalon [6-F](phase-6/6-f-scolarite.md) : les 323 lignes de WebView pilotée
par du JavaScript injecté ont disparu, et deux fichiers portent les deux parcours que l'application
joue réellement.

| Parcours | Blueprint | Ce qui est resté applicatif |
|---|---|---|
| froid — premier login | [`ukit.portail.bordeaux.dossier`](../blueprints/ukit-portail-bordeaux-dossier.blueprint.json) | le trousseau, le choix froid/chaud, la projection `identité → prénom`, l'affichage |
| chaud — chaque lancement | [`ukit.portail.bordeaux.messagerie`](../blueprints/ukit-portail-bordeaux-messagerie.blueprint.json) | la décision « pas de parenthèse = zéro non lu », le verrou biométrique |

**Namespacés au jalon [6-G](phase-6/6-g-etablissements.md)** : le nom porte désormais le code de
l'établissement, parce que rien de ce fichier n'est générique. Les noms à jouer viennent du catalogue,
et un second établissement apporte les siens — voir la section 8.

Implémentation applicative : [`ScolariteSession.ts`](../src/features/Scolarite/services/ScolariteSession.ts)
(la séquence), [`CredentialsContext.tsx`](../src/features/Scolarite/services/CredentialsContext.tsx)
(l'état), [`ScolariteMapping.ts`](../src/features/Scolarite/services/ScolariteMapping.ts) (la
projection). Parcours utilisateur détaillé dans [features/scolarite.md](features/scolarite.md).

### Hôtes traversés

| Hôte | Rôle |
|---|---|
| `cas.u-bordeaux.fr` | authentification centralisée |
| `ent.u-bordeaux.fr` / `intranet.u-bordeaux.fr` | portail — prénom de l'étudiant |
| `mondossierweb.u-bordeaux.fr` | dossier administratif — numéro étudiant, INE, mail, date de naissance |
| `webmel.u-bordeaux.fr` | messagerie — nombre de messages non lus |
| `apogee.u-bordeaux.fr` | notes et résultats — atteignable via le navigateur intégré, non extrait. Deux services nommés par l'intranet : `?srv=RE01` (résultats) et `?srv=RE02` (calendrier des examens) |
| `moodle.u-bordeaux.fr` | plateforme pédagogique — **chronologie extraite** depuis le 2026-08-28. Entrée par `/login/index.php`, qui mène au WAYF de `idp-ubx`, lequel délègue au CAS |

`ent.u-bordeaux.fr` **n'est plus traversé par la session** : chaque Blueprint ouvre directement son
service, qui rebondit lui-même sur le CAS avec son paramètre `service=`. Le portail reste une
destination du navigateur intégré, rien de plus. C'est ce qui rend le parcours plus court, et ce qui
le fait survivre à une refonte de la page d'accueil.

### Enchaînement, tel que les fichiers le décrivent

Les deux Blueprints ont la même forme, et chaque step y est une décision qu'on peut relire :

```text
navigate <service>                        le service redirige vers le CAS
wait_for #username        20 s            fail:CAS_INDISPONIBLE
fill     #username / #password            secrets portail_user / portail_pass
click    input[type=submit]                (Bordeaux ; l'INP sert un #submitBtn)
wait     8 s (dossier) / 15 s (messagerie)   laisser la cascade d'authentification arriver
wait_for #loginErrorsPanel  detached, 2 s    fail:LOGIN_FAILED
wait_for <cible CSS>      30 s            fail:LOGIN_FAILED | MESSAGERIE_INDISPONIBLE
emit     LOGIN_SUCCESS                    c'est ce qui autorise a ecrire les identifiants
extract  … par libelle     5 s            une lecture n'a rien a attendre
assert   les champs critiques ne sont pas vides    dossier seulement

  puis, pour le dossier seul — des BONUS qui ne doivent jamais emporter la connexion :

click/navigate <vue>                      Inscriptions (Bordeaux) | /acces et /inscriptions (INP)
wait     6 s                              `wait` et non `wait_for` : un timeout ferait echouer le run
extract  … as: list                       zero correspondance rend [], jamais une levee
```

Cinq de ces lignes sont contre-intuitives et **mesurées**, pas supposées :

- **la pause après le clic.** L'authentification unifiée enchaîne plusieurs sauts, puis le client pose
  son propre fragment ; une opération émise pendant cette cascade **se perd en silence** sur un
  appareil. C'est une limite du moteur, écrite chez lui, et le contournement est visible dans le
  fichier plutôt que déguisé en délai généreux ;
- **la garde `#loginErrorsPanel`.** Ce panneau est **absent** de la page de connexion propre et
  **présent** dès que le CAS refuse (mesuré le 2026-08-09). `#msg2` et `.errors`, eux, existent déjà
  vides avec une boîte de hauteur nulle : ils ne discriminent rien. Sans cette garde, un mot de passe
  faux coûte le plafond entier du sélecteur suivant — **41 s mesurées, contre 13 s avec** ;
- **le `timeout_ms` court de l'`extract`.** Un `extract` réarme sa propre auto-attente ; sur un
  téléphone, les minuteurs d'une WebView hors écran sont ralentis alors que l'appelant compte en temps
  réel. Un budget court garantit que la page réponde avant l'appelant, donc qu'un échec soit lisible
  au lieu d'être un silence rapporté comme « la page a changé ».

- **`wait_for` porte un sélecteur CSS, jamais un XPath.** Le moteur embarqué lit `selector_type` sur
  cette action, le moteur Python **non** : il passe le sélecteur à `page.locator()` tel quel. Un
  XPath y marcherait donc sur un poste et nulle part ailleurs — la même classe de piège que les
  pseudo-classes Playwright du jalon 6-G ;
- **une lecture facultative descend en `as: "list"`, jamais derrière un `when`.** Un step gardé par
  `when` est *sauté*, et un step sauté **n'enregistre aucune sortie** : le bloc `outputs` qui le
  référence lève alors en `StrictUndefined`, ce qui fait échouer le run entier — exactement ce que la
  garde prétendait éviter. `as: "list"` rend `[]` et ne lève jamais.

Et un garde-fou qui vaut pour toute action d'interaction : **le moteur embarqué refuse un clic
ambigu** là où Playwright prend le premier. Tout sélecteur de `click` doit matcher **exactement un**
élément, et ça se mesure avant d'écrire le fichier.

Au passage, la migration a trouvé du **code mort** dans le script d'origine : il testait `#msg.success`
et `#msg.errors`, or **il n'existe aucun `#msg`** sur ce CAS. Ces deux branches ne matchaient plus
rien, et personne ne pouvait le savoir.

### Le dossier administratif

**Le portail est un Vaadin 8** (thème Valo), et non « une application GWT » comme ce document
l'affirmait : le moteur *client* de Vaadin 8 est compilé par GWT, ce qui explique les `gwt-uid-NN` —
mais le produit, sa structure et ses libellés sont ceux de Vaadin. La confusion masquait sa symétrie
avec le portail de l'INP, qui est un Vaadin d'une génération plus récente.

**Les champs sont ancrés par leur libellé** depuis le 2026-08-25. Chaque couple vit dans une ligne de
`v-formlayout` qui porte sa légende :

```
//tr[contains(@class,'v-formlayout-row')]
   [td[contains(@class,'v-formlayout-captioncell')][normalize-space()="NNE"]]
   /td[contains(@class,'v-formlayout-contentcell')]
```

| Libellé d'ancrage | Donnée |
|---|---|
| `Dossier` | numéro étudiant |
| `NNE` | INE |
| `Prénom et Nom` | identité complète |
| `Email` | adresse mail |
| `Date de naissance` | date de naissance |

> **La fragilité la plus sérieuse du projet a disparu.** Les cinq `#gwt-uid-41/43/45/47/51` étaient
> attribués selon l'ordre de construction du DOM : une refonte de page les décalait *silencieusement*,
> et l'application affichait alors des champs mélangés. L'ancrage par libellé a été vérifié hors
> ligne sur le DOM capturé — **11 libellés testés, 11 nœuds uniques** — et un décalage ne peut plus
> rendre la mauvaise valeur : il ne rend plus rien, et l'extraction échoue bruyamment.

**Le piège, avant de « simplifier » ces XPath** : une ligne de `v-formlayout` porte **trois** cellules
— légende, **erreur**, contenu. Un `following-sibling::td[1]` tombe sur la cellule d'erreur, vide.

L'`assert` a maigri en conséquence : les libellés n'ont plus à être lus puisqu'ils *sont* les
sélecteurs. Il ne garde que ce que l'ancrage ne couvre pas — un libellé présent au-dessus d'une
valeur **vide**, qui écrirait un dossier creux dans le trousseau. Le libellé `Prénom et Nom` sert
toujours deux fois : il ancre l'extraction, et c'est lui qui autorise à prendre le premier mot de
l'identité comme prénom.

### La formation

Le menu du portail porte six entrées, ancrables **par leur libellé** — ce ne sont pas des liens mais
des `div[role=button]` d'une application à état serveur, donc on les **clique** :

| Entrée | Ce qu'elle porte | Extraite ? |
|---|---|---|
| Etat-civil | l'identité, la nationalité, le bac | **oui** |
| Informations annuelles | boursier, salarié, aménagement d'étude | non — les trois champs sont vides sur le compte sondé |
| Adresses | adresse annuelle et fixe | non — sans usage sur un tableau de bord |
| **Inscriptions** | `Année · Composante · Filière`, une ligne par année | **oui**, la première ligne |
| **Notes & résultats** | diplômes et étapes, puis le détail par UE derrière un clic | pas encore — session à part |
| Aide | — | non |

Trois mesures gouvernent l'extraction de la formation :

- **la première ligne est l'inscription courante** : la source trie par année décroissante ;
- **le tableau est virtualisé** — 3 à 5 lignes rendues selon la hauteur de la fenêtre. On ne lit donc
  que la première, la seule dont la présence soit acquise ;
- **la ligne courante porte un glyphe FontAwesome collé à son libellé** (`M1 Informatique\uf002`). Il
  vit dans la zone d'usage privé d'Unicode et se retire applicativement, où rien de légitime ne
  s'écrit.

Corollaire de « partir du service » : la lecture du prénom sur l'ENT — cinq sélecteurs en cascade plus
une expression régulière — **n'a plus de page où se faire**, et n'existe plus. L'identité vient du
dossier.

### La messagerie

Lecture de `#zti__main_Mail__2_textCell`, dont le texte a la forme `Réception (789)`. L'expression
régulière `/\((\d+)\)/` a disparu : `as: "number"` extrait le premier nombre du libellé et rend un
**entier**, identiquement sur les deux moteurs. Le libellé brut descend en sortie à côté du nombre,
parce que c'est lui qui permet de distinguer une boîte sans parenthèse (zéro non lu) d'une lecture qui
n'a rien trouvé.

Le **user-agent de Chrome desktop** est déclaré dans les deux fichiers (`options.stealth.user_agent`)
et il est porteur : avec un UA mobile, ce service rend `/modern/`, un DOM entièrement différent où le
sélecteur du compteur **n'existe pas**. C'est la seule bribe de discrétion du périmètre embarqué, et
elle est passée d'une constante compilée à une ligne de donnée corrigeable.

### Ce que l'application distingue désormais

| Ce qui s'est passé | Famille | Ce que l'écran affiche |
|---|---|---|
| CAS injoignable, réseau coupé | `unavailable` | « Service indisponible », avec Réessayer |
| `fail:CAS_INDISPONIBLE` | `blocked` | « Le portail de l'université ne répond pas » |
| `fail:LOGIN_FAILED` | `blocked` | « Identifiants incorrects » |
| `fail:MESSAGERIE_INDISPONIBLE` | `blocked` | « La messagerie n'a pas répondu » — distinct de l'échec de login |
| libellés décalés (`assert`) | `rejected` | « Réponse inattendue » — **et rien n'est écrit** |
| sélecteur introuvable | `data` | « Contenu introuvable » — Blueprint à corriger |

### Ce qui n'est jamais fait

Les identifiants ne sont **jamais** envoyés ailleurs qu'au CAS de l'université, ne transitent par
aucun serveur tiers, et sont stockés uniquement en SecureStore chiffré. Ils ne traversent pas non plus
la **source d'un script** : le moteur les encode en JSON et les transmet par une communication
corrélée avec l'agent injecté, ce qui rend impossible par construction la classe de bug où un mot de
passe contenant une apostrophe casse le remplissage.

## 3. Affluences — bibliothèques universitaires

API privée de l'application web `affluences.com`. **Migrée en Blueprints** au jalon
[6-D](phase-6/6-d-campus.md) : [`LibraryService.ts`](../src/features/Campus/services/LibraryService.ts)
n'émet plus de requête, il joue trois Blueprints et travaille la donnée reçue.

| Appel | Blueprint | Ce qui est resté applicatif |
|---|---|---|
| découverte des sites autour d'**un** point | [`ukit.campus.bibliotheques`](../blueprints/ukit-campus-bibliotheques.blueprint.json) | le balayage en douze points, le dédoublonnage, le filtre de catégorie, Haversine, le tri |
| affluence en direct | [`ukit.campus.bibliotheque-affluence`](../blueprints/ukit-campus-bibliotheque-affluence.blueprint.json) | le choix entre `percentage` et `occupancy`, la couleur et le libellé d'état |
| horaires d'une semaine | [`ukit.campus.bibliotheque-horaires`](../blueprints/ukit-campus-bibliotheque-horaires.blueprint.json) | la sélection du jour affiché, le défilement |

Tous les appels portent les mêmes en-têtes, qui imitent le client web officiel :

```http
Accept: application/json, text/plain, */*
Accept-Language: fr
x-service-name: website
Origin: https://affluences.com
Referer: https://affluences.com/
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

### Découverte des sites

```http
POST https://api.affluences.com/app/v3/sites/map
Content-Type: application/json

{ "latitude": <lat>, "longitude": <lng> }
```

L'endpoint ne renvoie que les sites proches du point demandé. Pour couvrir toute la région, le service
joue **douze runs concurrents** : la position réelle de l'utilisateur, plus onze points fixes
(Bordeaux centre, campus Talence/Pessac/Gradignan, Pau, La Rochelle, Limoges, Poitiers,
Bayonne/Anglet, Périgueux, Agen, Angoulême, Niort). Les résultats sont dédoublonnés par `site.id`.

De tout cela, **une seule chose est descendue dans le Blueprint** : la requête. La liste des douze
points est une décision produit (quelles villes on couvre), pas une propriété de la source ; le filtre
de catégorie demanderait d'indexer une liste dans un prédicat, ce que la grammaire refuse des deux
côtés et volontairement ; et Haversine est du calcul, qui n'entre pas dans un Blueprint.

Seuls les sites dont `categories` contient l'identifiant **1** ou **20** sont retenus : ce sont les
catégories de bibliothèques classiques et universitaires. Le Blueprint extrait donc
`$.categories[*].id`, et l'application filtre.

> **Piège d'arité.** Un chemin d'extraction qui ne correspond à rien rend `null`, une seule
> correspondance rend **la valeur**, plusieurs rendent **la liste**. Tous les sites de la région
> n'ayant qu'une catégorie, l'extraction rend `20` et **jamais** `[20]` : c'est le cas nominal, pas
> le cas limite. `commeListe`
> ([`LibraryMapping.ts`](../src/features/Campus/services/LibraryMapping.ts)) normalise, et un test
> le verrouille.

La distance renvoyée par l'API (`estimated_distance`, relative au point de balayage) est **recalculée**
depuis la position réelle par une formule de Haversine ; elle ne sert de repli que si les coordonnées
du site manquent.

**Un point de balayage muet n'emporte plus les autres.** Les onze qui ont répondu s'affichent, et un
bandeau dit que la couverture est incomplète. Zéro réponse reste un échec plein.

### Affluence en temps réel

```http
GET https://api.affluences.com/app/v4/sites/{slug}/live-data
```

On en extrait `status.isOpen`, `status.closingAt`, `status.openingText`, et **les deux** chemins de
taux d'occupation — `liveAttendance.percentage` et `liveAttendance.occupancy`, dont les deux formes
existent selon les sites. Le choix de l'un ou de l'autre reste applicatif : un `??` n'est pas
exprimable dans une spécification d'extraction.

Un site fermé rend `liveAttendance: null` : les deux chemins ne correspondent alors à rien, et
l'extraction rend `null`. C'est un **résultat**, pas une absence de réponse. Un slug inconnu, lui,
rend un statut 404 que `expect` refuse : l'échec est rangé en `rejected`.

### Horaires

```http
GET https://api.affluences.com/app/v4/sites/{slug}/timetables?weekOffset=<n>
```

`weekOffset` vaut 0 pour la semaine courante, et se décale pour naviguer — un **entier signé**, passé
par `params` et donc encodé par le moteur. La réponse est utilisée telle quelle (`data.entries`), sous
le contrat `TimetableEntry` : le Blueprint fait descendre le sous-arbre `openingHours` sans le mettre
à plat, parce qu'une journée porte des **paires** ouverture/fermeture et que `fields` ne sait rendre
que des champs plats.

### Fragilité

API non publique : ni contrat, ni versionnement annoncé, ni garantie de disponibilité pour un client
tiers. Les identifiants de catégorie (1 et 20) restent une **constante applicative**. Le nom d'en-tête
`x-service-name`, l'`Origin`, le `Referer` et l'agent utilisateur sont des valeurs observées, pas
documentées — et c'est exactement pourquoi elles ont désormais leur place dans un fichier corrigeable
à distance plutôt que dans un binaire en attente de publication.

## 4. Croustillant — restaurants CROUS

API publique communautaire (`https://api.croustillant.menu/v1`). C'est la source la plus saine du
lot : publique, stable, versionnée dans son chemin. **Migrée en Blueprints** au jalon
[6-D](phase-6/6-d-campus.md) : [`CrousService.ts`](../src/features/Campus/services/CrousService.ts)
n'émet plus de requête.

| Appel | Blueprint | Ce qui est resté applicatif |
|---|---|---|
| `GET /regions/{region}/restaurants` | [`ukit.campus.restaurants`](../blueprints/ukit-campus-restaurants.blueprint.json) | Haversine, le tri, la lecture des horaires, l'URL de visuel. **La région vient du catalogue** depuis [6-J](phase-6/6-j-compte-et-sources-par-etablissement.md) (colonne `crous_region`) : elle vaut toujours 1, mais c'est une donnée corrigeable et non plus une constante de fichier |
| `GET /restaurants/{code}/menu` | [`ukit.campus.restaurant-menu`](../blueprints/ukit-campus-restaurant-menu.blueprint.json) | la relecture de la date, le regroupement midi/soir, les libellés de repli |
| `GET /restaurants/{code}/preview` | *aucun* — c'est une URL construite, posée dans une balise image, jamais une requête que le service émet |

Traitement appliqué :

- les établissements de `type.code === 4` sont écartés par un **prédicat `where`** dans le Blueprint
  (catégorie non pertinente pour l'application) — 12 des 41 établissements de la région ;
- `horaires` est aplati en une chaîne jointe par ` | `, avec repli sur `UNSPECIFIED_HOURS` ;
- la distance est calculée par Haversine quand la position de l'utilisateur est connue, puis la liste
  est triée du plus proche au plus lointain ;
- **la date reçue est convertie** : l'API renvoie `DD-MM-YYYY`, l'application manipule `YYYY-MM-DD`.
  Cette conversion-là reste applicative, et ce n'est pas un oubli : les filtres de date du moteur
  **produisent** un format attendu par une source, ils refusent d'en interpréter un ;
- les repas sont regroupés par `type` (`midi` / `soir`), chaque catégorie devenant
  `{ name: libelle, dishes: [libelle…] }`. Le sous-arbre `repas` descend du Blueprint **tel quel** :
  un jour porte des services, qui portent des catégories, qui portent des plats, et la grammaire de
  `fields` est plate.

> **`horaires` n'est plus un tableau.** La source le sert désormais comme une **chaîne JSON**
> (`"[\"du lundi au vendredi\", \"12h-13h45\"]"`). Le test `Array.isArray` d'origine était donc faux
> pour les 41 restaurants, et l'application affichait « horaires non spécifiés » partout. Mesuré et
> corrigé au jalon [6-D](phase-6/6-d-campus.md) : les deux formes sont acceptées, une troisième
> retombe sur le libellé.

> **Plus de la moitié des restaurants rendent `404` sur `/menu`.** 24 des 41, dont 8 que
> l'application affiche. Ce n'est pas une panne, c'est « ce restaurant ne publie pas de menu » — donc
> le Blueprint ne porte **pas** d'`expect`, et un step `assert` accepte 200 **ou** 404 en refusant
> tout le reste. Un `expect: {status: 200}` aurait transformé un état vide fréquent en message
> d'erreur.

Le site du fournisseur est crédité dans l'écran À propos (`URL.CROUSTILLANT_WEBSITE`).

## 5. jsDelivr — données éditoriales (sortie de l'inventaire)

> **Cette source n'en est plus une.** Les annonces de vie étudiante sont lues dans la table
> `annonces` de notre [base de publication](backend.md) depuis le jalon
> [6-B](phase-6/6-b-supabase.md), et le dépôt `KAE-Lab/ukit-data` **cesse d'être écrit**. Le contrat,
> la façon de publier et les chemins dégradés sont décrits dans
> [features/campus-vie-etudiante.md](features/campus-vie-etudiante.md).
>
> La section est conservée parce que le dépôt n'est **pas supprimé** : il continue de servir les
> visuels référencés par les versions de l'application déjà installées, qui ne se mettent pas à jour
> toutes seules.

Ce que le dépôt sert encore, et qui n'est plus lu par le code actuel :

```http
GET https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/annonces.json
GET https://cdn.jsdelivr.net/gh/KAE-Lab/ukit-data@main/images/…
```

> **Le dernier lien est coupé.** Le champ `image` de [`locations.json`](../assets/locations.json)
> pointait encore vers ce dépôt ; il est repointé sur le bucket `media` au jalon
> [6-D](phase-6/6-d-campus.md), avec la table `batiments` qui surcouche désormais le fichier. Le
> fichier embarqué reste le socle hors ligne du référentiel — c'est le distant qui le met à jour, et
> jamais l'inverse.

Le Blueprint [`ukit.campus.annonces`](../blueprints/ukit-campus-annonces.blueprint.json), qui portait
cette source au jalon [6-A](phase-6/6-a-socle.md), reste dans le dépôt comme témoin du format. Il
n'est plus joué.

## 6. GitHub raw — version applicative

```http
GET https://raw.githubusercontent.com/KAE-Lab/UKit/master/VERSION
```

Comparée à la version du manifeste Expo par `UpdateAlert`
([`AppUI.tsx`](../src/shared/ui/AppUI.tsx)) pour proposer une mise à jour vers le store. Voir
[plateforme.md](plateforme.md) — ce mécanisme est actuellement inactif.

## 6 bis. Bordeaux INP — le second portail

Ajouté au jalon [6-G](phase-6/6-g-etablissements.md), **sans release** : une ligne dans
`etablissements` et un Blueprint publié sous le préfixe réservé.

| Hôte | Rôle |
|---|---|
| `cas.bordeaux-inp.fr` | authentification centralisée |
| `mondossierweb.bordeaux-inp.fr` | dossier administratif — nom, prénom, date de naissance, numéro étudiant |
| `mondossierweb.bordeaux-inp.fr/coordonnees` | adresse électronique de l'établissement |
| `mondossierweb.bordeaux-inp.fr/acces` | le bac, les primo-inscriptions, et **l'INE** |
| `mondossierweb.bordeaux-inp.fr/inscriptions` | l'onglet « Parcours » — **la formation courante**, une carte par année |
| `ade.bordeaux-inp.fr/direct/myplanning.jsp` | l'arbre de ressources **sous authentification** — il présélectionne la fiche de l'étudiant, donc son emploi du temps personnel (section 8) |
| `sso.bordeaux-inp.fr` | SAML — son IdP **délègue au CAS**, mesuré le 2026-08-28 |
| `partage.bordeaux-inp.fr/mail` | messagerie (Zimbra « Partage ») — **le même produit que `webmel`**, donc le même sélecteur ; une page de consentement Shibboleth s'intercale à la première autorisation |
| `ade.bordeaux-inp.fr` | emploi du temps, par export iCalendar — **porté** au jalon [6-I](phase-6/6-i-planning-universel.md), section 8 |

Un seul Blueprint,
[`ukit.portail.bordeaux-inp.dossier`](../blueprints/portails/ukit-portail-bordeaux-inp-dossier.blueprint.json),
et il n'est **pas embarqué** dans le binaire : il arrive par le manifeste.

### Ce qui diverge de Bordeaux, et qui est mesuré

| | Université de Bordeaux | Bordeaux INP |
|---|---|---|
| Produit CAS | Apereo, thème classique | Apereo, thème MDC |
| Soumission | `input[type=submit]` | **`<button id="submitBtn">`** |
| Panneau d'erreur | `#loginErrorsPanel` | **le même** |
| Produit du dossier | `mondossierweb` **Vaadin 8** (thème Valo) | `mondossierweb` **Vaadin 14+** (PC-Scol) |
| Ancrage des champs | **par libellé**, en XPath *(depuis le 2026-08-25)* | **par libellé**, en XPath |
| Navigation entre vues | on **clique** un menu à état serveur | de vraies routes (`/acces`, `/inscriptions`) |
| Identité | `PRÉNOM NOM` en un champ | nom et prénom séparés |
| INE | état civil | **onglet Accès** — voir ci-dessous |
| Formation | vue *Inscriptions*, un tableau | vue *Parcours*, une carte par année |
| Messagerie | derrière le CAS | derrière SAML, **qui délègue au CAS** — même Zimbra, un consentement en plus |
| Durée du parcours froid | ~46 s | ~24 s |

**Fragilité connue** : le numéro étudiant est lu par position dans le bandeau latéral
(`:nth-match(vaadin-vertical-layout[slot=drawer] label, 2)`), faute d'un libellé pour l'ancrer. Le
filet est l'`assert` sur les trois libellés de l'état-civil — un décalage du bandeau accompagnerait une
refonte de la page, donc de ces libellés.

**Piège de sélecteur, mesuré le 2026-08-10** : `:text-is()` correspond au texte **source**
(`Nom de famille`), alors que l'extraction rend le texte **affiché**, mis en capitales par la feuille
de style (`NOM DE FAMILLE`). Le même fichier compare donc aux deux formes, et ce n'est pas une
étourderie.

### Ce que la sonde du 2026-08-25 a ajouté, et corrigé

Deux vues du menu n'avaient jamais été ouvertes. Elles portent chacune une donnée que ce document
déclarait absente :

| Vue | Route | Ce qu'on en lit |
|---|---|---|
| **Accès** | `/acces` | `Code INE`, l'année et la mention du bac, les primo-inscriptions |
| **Parcours** | `/inscriptions` | une carte par année : `Formation`, `Période`, `Régime d'inscription`, `Statut de l'inscription`, `Statut du paiement`, `Statut des pièces justificatives` |

> **« Bordeaux INP ne rend pas d'INE » était faux.** Il n'est pas dans l'état civil mais sous
> l'onglet *Accès*, que le Blueprint ne visitait pas. Le champ est désormais rempli des deux côtés.

> **« Documentation » n'est pas un onglet de documents.** C'est un **lien externe** vers une page
> d'aide de l'ENT. Les vrais PDF — certificat de scolarité, attestation de paiement, relevés de notes
> — sont des liens dans les cartes de *Parcours*, mais leur URL porte un UUID **et** un horodatage
> régénérés à chaque rendu de page : ils ne sont pas rejouables, donc pas stockables. Ce sont des
> portes, jamais des données.

Trois précautions, mesurées et non supposées :

- **la première carte de *Parcours* est l'année courante**, et les libellés apparaissent autant de
  fois qu'il y a d'années. Un XPath par libellé seul rendrait deux nœuds : l'indexation `[1]` est
  donc nécessaire, et elle vise la carte et non le libellé ;
- **les libellés se lisent dans leur casse source** (`Code INE`, `Régime d'inscription`), alors que
  l'extraction rend le texte affiché en capitales — le même piège qu'en 2026-08-10, sur de nouvelles
  vues ;
- **plusieurs libellés portent une apostrophe**, donc le XPath s'écrit en **guillemets doubles**,
  sans quoi il ne compile pas.

**Les deux lectures sont des bonus, et elles descendent en `as: "list"`.** C'est ce qui les empêche
d'emporter la connexion : une liste vide ne lève jamais, là où un `as: "text"` sur un nœud absent
fait échouer le run — et perdre l'identité pour un INE serait un mauvais marché. Un `when` aurait été
pire : **un step sauté n'enregistre aucune sortie**, donc le bloc `outputs` qui le référence lèverait
en `StrictUndefined`.

## Ce que les sondes surveillent

Depuis le jalon [6.1-B](phase-6/6-1-b-pilotage-a-distance.md), un workflow joue chaque matin une sonde
par source **sans identifiant** et ouvre une issue GitHub quand une source tombe
([`sondes/README.md`](../sondes/README.md), [pilotage.md](pilotage.md)). Ce qu'il surveille, et ce
qu'il ne surveille pas :

| Source | Sonde | Ce qu'elle prouve |
|---|---|---|
| Celcat | le Blueprint `ukit.celcat.groupes` de l'application | la liste des groupes rend plus de zéro entrée |
| CAS de Bordeaux, CAS de Bordeaux INP | `ukit.sonde.cas` | la page de connexion sert son formulaire (`renew=true`) |
| Moodle de Bordeaux, chaîne SSO | `ukit.sonde.moodle` | l'adresse Unsolicited SSO de l'IdP atteint le formulaire du CAS |
| ADE de Bordeaux INP | le Blueprint `ukit.portail.bordeaux-inp.edt` de l'application | l'export d'une ressource se lit comme un calendrier |
| La base de publication | native | le manifeste se lit et ses empreintes correspondent |
| Affluences, Croustillant, OpenFreeMap | **aucune** | ces sources ont un écran qui dit leur panne, et aucune ne porte de session ; en ajouter une est une ligne dans `sondes/sondes.json` |

Les sondes prouvent qu'un formulaire est atteignable, pas qu'il se passe — le dossier d'un étudiant
peut casser derrière un CAS qui répond. Elles voient une panne, pas une lenteur.

## 7. Rendu cartographique

[`EmbeddedMap`](../src/shared/map/EmbeddedMap.tsx) charge dans une WebView une page HTML qui
référence :

- `https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css` et `maplibre-gl.js` ;
- le style vectoriel `https://tiles.openfreemap.org/styles/positron` (OpenFreeMap : données
  OpenStreetMap, sans clé, autorisé en production ; attribution affichée — la politique d'usage des
  données l'exige).

Détails et raison de ce choix dans [cartographie.md](cartographie.md).

## 8. ADE — emploi du temps par export iCalendar

L'export d'abonnement du produit ADE, joint **directement** depuis l'appareil. C'est la réponse au
constat qui a ouvert le jalon [6-I](phase-6/6-i-planning-universel.md) : un balayage de vingt
universités françaises n'a trouvé **aucune** instance Celcat interrogeable sans authentification hors
Bordeaux, alors que presque tous les produits savent exporter en iCal (RFC 5545).

```
GET https://ade.bordeaux-inp.fr/jsp/custom/modules/plannings/anonymous_cal.jsp
    ?resources=<index>[,<index>…]
    &projectId=<n>
    &calType=ical
    &firstDate=AAAA-MM-JJ
    &lastDate=AAAA-MM-JJ
Accept: text/calendar
```

| Blueprint | Ce qu'il joue | Consommé par |
|---|---|---|
| [`ukit.portail.bordeaux-inp.edt`](../blueprints/portails/ukit-portail-bordeaux-inp-edt.blueprint.json) | une plage de dates : la vue jour et la vue semaine | [`PlanningIcalSource`](../src/features/Planning/services/PlanningIcalSource.ts) |
| [`ukit.portail.bordeaux-inp.edt.annee`](../blueprints/portails/ukit-portail-bordeaux-inp-edt-annee.blueprint.json) | la même requête sur l'année, `timeout_ms` à 60 s | idem |

Ni l'un ni l'autre n'est **embarqué** : ils vivent sous le préfixe réservé `ukit.portail.` et arrivent
par le manifeste, comme le portail du même établissement. Ils déclarent `min_engine: "0.5.4"` — leur
extraction `from: "text"` n'existe pas avant.

### Les constantes, et leur signification

| Paramètre | Sens | D'où il vient |
|---|---|---|
| `resources` | **index positionnels** dans l'arbre des ressources du projet, séparés par des virgules | le référentiel de la colonne `edt` du catalogue |
| `projectId` | le projet ADE, c'est-à-dire l'**année universitaire** | `edt.params.projet` du catalogue |
| `calType` | `ical` — le seul format qui nous intéresse | `vars` du Blueprint |
| `firstDate` / `lastDate` | les bornes, **inclusives** | calculées par le service (heure courante) |

### Ce que la mesure du 2026-08-15 a établi

- **`resources` n'est pas un identifiant ADE mais un index.** `resources=1` rend la racine de l'arbre
  — tout l'établissement, cinq écoles, 3156 événements sur l'année — et l'identifiant interne lu dans
  un UID ne rend rien. L'index est stable *à l'intérieur* d'un projet, et un projet est annuel ;
- **plusieurs projets coexistent**, et leurs noms sont lisibles dans les UID : `2025-2026` (le vivant,
  `projectId=1`), `NEPASTOUCHER2526_SAUV`, `2526_POUR_ESUP`, `TMP2526`. `projectId=2` est une
  quasi-coquille vide — 54 événements sur l'année ;
- **les bornes sont inclusives** et `resources` accepte une liste : le planning agrégé des favoris
  tient en **une** requête, comme `federationIds[]` chez Celcat ;
- **`DTSTART` est en UTC honnête** : le même créneau hebdomadaire est servi `07:30Z` en septembre et
  `08:30Z` en novembre, soit 09:30 à Paris les deux fois ;
- **`(Exporté le:…)` porte l'horodatage de la requête** et change à chaque appel. Il est retiré par la
  projection ;
- **`LOCATION` peut porter plusieurs salles**, séparées par une virgule échappée RFC 5545, et est
  souvent vide.

### La forme du corps

```
BEGIN:VEVENT
DTSTART:20251118T083000Z
DTEND:20251118T095000Z
SUMMARY:Traitement du signal
LOCATION:CC-S112
DESCRIPTION:\n\nCOG7-SCFTS\nTD\n2A GR1\nTraitement du signal\nFARR
 ELL Flora\n(Exporté le:15/08/2026 17:12)\n
UID:ADE60323032352d323032362d3831392d302d3132
END:VEVENT
```

La description suit la forme
`[commentaire…] <CODE-MODULE> <TYPE> <GROUPE…> [MATIÈRE] <ENSEIGNANT…> (Exporté le:…)`, et **les
champs ne sont pas à position fixe** : le bloc de commentaire de tête tient zéro, une ou deux lignes.
L'ancre est le **code de module** (`^[A-Z]{3}\d-[A-Z0-9]{5}$`) ; le type est la ligne qui le suit.

### Ce qui reste applicatif

Le dépliage de lignes et le déshabillage RFC 5545 sont confiés à **`ical.js`** ; la projection sur
`PlanningEvent` vit dans [`IcsMapping`](../src/features/Planning/services/IcsMapping.ts). Le
référentiel des groupes, le calcul des plages, le tri et le découpage de la semaine restent
applicatifs — ce sont des calculs, et un calcul dans un Blueprint devrait être réimplémenté à
l'identique dans les deux moteurs.

### L'accès anonyme a été coupé quelques jours — mesuré les 2026-08-25 et 2026-08-28

```
GET .../anonymous_cal.jsp?resources=7&projectId=1&calType=ical&firstDate=…&lastDate=…
→ HTTP 500
   org.apache.jasper.JasperException: com.adesoft.errors.InvalidLogin: Invalid login.
```

**Le serveur est debout** — sa racine rend `200`, `myplanning.jsp` rend `302` vers le CAS. C'est
l'export **anonyme** qui refuse, et le message ne laisse pas de doute sur la cause : le compte
anonyme d'ADE a été désactivé, ou son mot de passe a expiré au changement de projet.

Ce n'est **pas** une question de dates ni de projet : les quatre `projectId` connus ont été essayés
sur trois plages, dont l'année écoulée qui fonctionnait en août — **douze combinaisons, douze `500`**.

> **Rétabli le 2026-08-28**, sans intervention de notre part : les deux cas de parité iCal sont
> repassés au vert d'eux-mêmes. La panne aura duré quelques jours.

Ce que l'épisode a établi, et qui vaut d'être gardé :

- **le harnais de parité a fait exactement son travail.** Deux cas rouges, une cause externe, et
  l'information est arrivée avant que des utilisateurs la remontent : *« un cas peut échouer parce
  que la source est en panne. C'est une information »*
  ([tools/parity/README.md](../tools/parity/README.md)). La tentation était de « réparer » les cas en
  déplaçant leurs dates — ça aurait masqué la panne ;
- **ce n'était ni les dates ni le projet.** Les quatre `projectId` connus ont été essayés sur trois
  plages, dont l'année écoulée qui fonctionnait la veille : **douze combinaisons, douze `500`**. Le
  message d'erreur, lui, nommait la cause sans ambiguïté ;
- **le remède appartenait à l'établissement**, et il a été appliqué chez lui. Si ça recommence, la
  piste sérieuse est `myplanning.jsp` sous CAS, que le Blueprint de dossier traverse déjà.

### Fragilité connue

Le point faible n'est pas le format, qui est normalisé, mais **le référentiel** : rien dans la source
ne nomme un index. Il est relevé par [`tools/releve-ade.mjs`](../tools/releve-ade.mjs), publié dans la
colonne `edt`, et se rejoue à chaque rentrée. Un groupe favori qui ne résout plus produit un message
dédié plutôt qu'une journée vide.

### L'arbre authentifié, et ce qu'il change au relevé (2026-08-24)

`myplanning.jsp`, ouvert **sous le CAS**, rend un arbre de ressources qui porte les **vrais
identifiants** ADE et leurs noms : `Direct Planning Tree_2467` pour ENSEIRB-MATMECA, `2475` pour
ENSMAC, `2492` pour ENSTBB… Ces identifiants vivent dans le même espace que `resources` — l'export
anonyme les accepte tels quels.

Trois choses en découlent, et aucune n'est théorique :

- **ADE présélectionne la fiche de l'étudiant connecté.** Son identifiant personnel se lit donc sans
  aucune recherche, et l'export anonyme rend **son** emploi du temps. C'est ce qui rend l'identifiant
  aussi sensible qu'un lien d'abonnement nominatif
  ([scolarite.md](features/scolarite.md#lidentifiant-ade-vaut-un-secret)) ;
- **tous les nœuds de l'arbre ne portent pas d'événements.** Chez ENSEIRB, les cours sont accrochés
  aux étudiants et aux groupes, pas aux promotions. Publier un nœud d'arbre sans l'avoir sondé
  donnerait un groupe qui s'affiche, se choisit, et reste vide toute l'année ;
- **une seule semaine ne prouve rien.** `2469` (IIETE3) rend 0 événement sur la semaine du 12 janvier
  et 47 sur trois semaines réparties dans l'année. C'était déjà la raison d'être des trois semaines
  du relevé ; c'est mesuré une seconde fois, sur un autre cas.

L'arbre donne des **noms d'école**, le balayage anonyme donne des **index de groupe** sans nom d'école
(`1A GR3`, `T2`, `MAT-1A`). `tools/releve-ade.mjs --ecoles 2467=ENSEIRB-MATMECA,…` relie les deux par
**mesure** : il compare les identifiants d'événements et rend, pour chaque index, l'école qui porte
ses cours et la **part** que ça représente. La part compte — l'index `61` n'a que 2 de ses 11 cours
dans ENSEIRB, ce qui est une mutualisation et non une appartenance. Préfixer un groupe sans cette
mesure publierait l'emploi du temps d'une école sous le nom d'une autre.

## Modèle d'erreur commun

Les services non migrés ne propagent aucune exception. Les conventions de repli sont :

| Service | Valeur en cas d'échec |
|---|---|
| `PlanningApiService`, `CampusApiService` | `null` |

C'est un choix cohérent avec le fonctionnement hors ligne (l'appelant retombe sur le cache ou sur un
état vide), mais il a une conséquence : **une panne du fournisseur et une réponse légitimement vide
sont indistinguables**. Un écran affichant « aucun résultat » peut donc masquer une source
indisponible. Toute évolution de ce modèle doit être décidée globalement, pas service par service.

C'est exactement ce que fait la [Phase 6](phase-6/README.md), et c'est son changement le plus
structurant : un échec devient **typé** et rangé dans une famille d'écran — source en panne, réponse
inattendue, contenu introuvable, identifiants manquants, échec nommé par le Blueprint — et une liste
vide redevient une liste vide. Le tableau ci-dessus rétrécit source par source, au rythme de la
migration ([blueprints.md](blueprints.md#les-erreurs-cessent-dêtre-avalées)).

**`BdeService` en est sorti pour de bon** au jalon [6-B](phase-6/6-b-supabase.md), et il sert de
gabarit aux suivants. Son échec n'est plus seulement journalisé : il est **rendu** à l'appelant
(`{ ok: false, failure }`), et l'écran de vie étudiante l'affiche — message de la famille, et bouton
Réessayer quand réessayer peut réparer quelque chose. Le repli qui masquait tout a été retiré en même
temps ; c'est lui qui rendait la distinction invisible.

**`CrousService` et `LibraryService` en sont sortis** au jalon [6-D](phase-6/6-d-campus.md), sur le
même gabarit. Leurs cinq méthodes rendent une union `{ ok: true, … } | { ok: false, failure }` ; les
types de données (`CrousRestaurant`, `CrousDayMenu`, `LibraryInfo`, `AffluencesData`,
`TimetableEntry`) n'ont **pas** bougé. Une nuance de plus y apparaît, propre au balayage en douze
points : une couverture **partielle** n'est ni un succès muet ni un échec, elle se dit par un bandeau
au-dessus de la liste.

La forme du résultat est calquée sur `BlueprintRun` du socle, délibérément : qu'une donnée vienne
d'un Blueprint ou d'une table, l'écran voit la même grammaire d'échec.

## Vérifier

Pour chaque source touchée par un changement, jouer le chemin nominal **et** le chemin dégradé :

- Mode avion : l'écran doit afficher le cache daté (planning) ou un état explicite (Campus).
- Source injoignable : couper le réseau après le lancement, naviguer, vérifier l'absence de plantage.
- Session universitaire : tester un mot de passe erroné (`LOGIN_FAILED` attendu) et un compte valide
  sans données froides (parcours `cold` complet).

Pour une source **migrée en Blueprint**, il y a mieux que le mode avion, et c'est la démonstration du
dispositif : modifier le fichier de [`blueprints/`](../blueprints/) — un hôte en `.invalid`, un
`expect` impossible, un chemin d'extraction faux — produit chacune des familles d'échec à la demande,
sans toucher à la connectivité de l'appareil ni casser Metro. `npm run parity` couvre le nominal en
quelques secondes et sur les vraies sources ; c'est le chemin dégradé qui mérite l'appareil.
