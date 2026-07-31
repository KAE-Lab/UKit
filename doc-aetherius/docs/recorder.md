# Recorder & création de Blueprints

**Statut : implémenté et opérationnel** — recorders **Continuum** (Act II, DOM) et **Vector** (Act I,
réseau), plus le gesture recorder. Extra `[browser]` requis (Playwright) ; sans lui, une
`DependencyError` claire donne la commande d'installation, jamais un `ImportError` brut. Le cœur du
recorder — synthèse de sélecteurs, transformations, segmentation de gestes — est **pur** et couvert
par la CI de base (sans navigateur).

Trois voies de création (voir aussi le [README](../README.md)) :

1. **Blueprint Studio** — création **et édition** guidées dans la Console (`console/screens/builder/`),
   sans JSON. S'appuie sur le module headless [`builder/`](../src/aetherius/builder/). Voir
   [docs/builder.md](builder.md). Complémentaire du recorder : on enregistre une base par
   démonstration, puis on l'affine dans le Studio (Library → touche `e`).
2. **Recorder** — par démonstration : navigateur visible, on capture une démo et on émet un Blueprint
   minimal. Ce que l'on capture dépend de l'Act (voir ci-dessous). Décrit ci-dessous.
3. **JSON à la main** — contrôle total, validé contre le schéma.

## Recorder & les Acts

Le recorder n'est **pas** lié à un seul Act : c'est une **coquille commune** (navigateur, overlay,
cycle de vie) et un **backend par Act**, derrière une interface unique — le miroir du pattern des
drivers d'Act (interchangeables derrière `ActDriver`, cf. [architecture.md](architecture.md)).

Architecture ([`recorder/`](../src/aetherius/recorder/)) :

- [`base.py`](../src/aetherius/recorder/base.py) — `RecorderBackend` (Protocol : `init_scripts`,
  `attach`, `result`), `RecordingResult`, et le **registre** `act → backend` (`get_recorder`,
  `recorder_acts`). Unique source de vérité des Acts enregistrables.
- [`session.py`](../src/aetherius/recorder/session.py) — `RecordingSession` **générique** : possède
  le navigateur et le pump, expose bindings/hooks au backend. Aucune logique d'Act.
- backends : [`continuum_backend.py`](../src/aetherius/recorder/continuum_backend.py) (DOM),
  [`vector_backend.py`](../src/aetherius/recorder/vector_backend.py) (réseau).

| Act | Recorder | Capture | Émet |
|-----|----------|---------|------|
| **I — Vector** | ✅ | appels réseau (fetch/XHR/doc JSON) | `http.request` + extraction JSONPath |
| **II — Continuum** | ✅ | interactions DOM + picks overlay | `navigate`/`click`/`fill`/… + `extract` |
| **III — Oracle** | *(à venir)* | **désignation en langage naturel** (décrire la cible, le VLM la localise — cf. [docs/acts/oracle.md](acts/oracle.md)) | cibles `target: {vision}` |
| **IV — Phantom** | *(à venir)* | démonstration → `goal` | `goal`/`constraints` |

Choix de l'Act **à la main** : `aetherius record … --act vector` (défaut `continuum`), ou le sélecteur
d'Act de la Console. Demander un Act sans backend (Oracle/Phantom) lève une `RecorderError` claire
(« jalon en attente »), jamais un échec obscur — même logique honnête que les écrans en attente.

## Prise en main (Console)

`aetherius` → **Recorder**. On choisit l'Act, on renseigne un nom et une URL de départ, puis
**Start** : un navigateur visible s'ouvre.

![L'écran Recorder : choix de l'Act, nom, URL de départ, toggle secrets](screenshots/recorder.svg)

1. **Choisir l'Act** (Continuum pour le DOM, Vector pour l'API) et laisser la bascule *credentials →
   secrets* active (les champs de login deviennent des `{{ secrets.x }}`, jamais capturés en clair).
2. **Start** → réaliser la tâche dans le navigateur (Continuum : cliquer/remplir + désigner les
   données via le menu flottant ; Vector : déclencher les appels réseau à observer).
3. **Fermer la fenêtre** (ou **Stop**) → le Blueprint est assemblé, relu par le loader canonique, et
   sauvegardé dans `./blueprints`. Les actions capturées défilent en direct dans le journal, et le
   Blueprint produit s'affiche à la fin.

Ensuite, on affine dans le **Blueprint Studio** (Library → touche `e`) — voir
[builder.md](builder.md). Les captures sont générées par `make screenshots`.

## Continuum recorder (Act II — DOM)

Modules : [`recorder/`](../src/aetherius/recorder/) —
`selector_synth.py` (politique de sélecteurs, pure), `_selector_js.py` (primitives DOM partagées :
candidats, unicité, sélecteur de groupe, sélecteur relatif), `_capture_js.py` (capture d'actions),
`_overlay_js.py` (le menu flottant), `capture.py` (cycle de vie du navigateur, `RecordingSession`),
`_transform.py` (transformation pure événements → steps/secrets/inputs/outputs), `blueprint_recorder.py`
(orchestration + assemblage), `_playwright.py` (import paresseux + boucle de pump partagée).

### Fonctionnement

Le recorder ouvre un Chromium **visible**, où l'utilisateur réalise la tâche. Un script injecté
(`add_init_script`, réinstallé à chaque navigation et sur toute nouvelle page) écoute les vrais
événements DOM d'une démonstration — `click`, `change`, `Enter` — et remonte, pour chacun, un
descripteur JSON au binding `__aetherius_capture` exposé côté Python. Les navigations de haut niveau
sont captées via l'événement `framenavigated` de Playwright.

La **séparation des responsabilités** est la même que dans la couche de discrétion (calcul pur vs
application au navigateur) :

- **In-page (JS)** : le seul endroit qui peut appeler `CSS.escape` et **mesurer l'unicité** d'un
  sélecteur contre le DOM vivant (`querySelectorAll(sel).length === 1`). Il ne remonte que des
  *faits* : les sélecteurs candidats et, pour chacun, s'il est unique.
- **En Python (pur, testable sans navigateur)** :
  - [`selector_synth.py`](../src/aetherius/recorder/selector_synth.py) applique la **politique de
    priorité** : `data-testid`/`-test`/`-cy`/`-qa` → `id` → `name` → `aria-label` → `role` → classe
    unique → texte visible (pour les cliquables, `selector_type: "text"`) → chemin CSS positionnel
    (repli). Le premier candidat **unique** dans cet ordre gagne. Un sélecteur ancré sur l'intention
    survit bien mieux à une évolution du site qu'un `div > div:nth-child(3)` fragile.
  - [`_transform.py`](../src/aetherius/recorder/_transform.py) transforme les événements en steps
    `navigate`/`click`/`fill`/`select`/`press`/`wait_for`/`extract`, et produit secrets, `inputs` et
    `outputs` ; [`blueprint_recorder.py`](../src/aetherius/recorder/blueprint_recorder.py) assemble le
    Blueprint minimal ordonné.

### Le menu flottant : sélectionner les données à scraper

Piloter le site ne suffit pas à finaliser un Blueprint de scraping : il faut aussi **désigner les
données**. Un **menu flottant** ([`_overlay_js.py`](../src/aetherius/recorder/_overlay_js.py)),
injecté comme l'overlay de debug mais **isolé en Shadow DOM** (le CSS de la page ne peut pas le
casser, ni l'inverse), s'affiche en haut à droite du navigateur. Tant qu'un de ses modes est actif, la
capture d'actions se met en retrait (`window.__aeRecorderPicking`) : on désigne, on ne clique pas.

- **Pick data** — clic sur un élément → un panneau demande le nom, le type (`text`/`number`/`html`/
  `attr`, auto-deviné : un nombre → `number`, une `<img>` → `attr src`, un `<a>` → `attr href`) et une
  case « tous les éléments qui matchent » (→ liste). Produit une entrée du step `extract`.
- **Pick table** — clic sur l'élément répétitif (le conteneur), puis sur chaque champ à l'intérieur
  (nom + type). Le sélecteur du conteneur (`each`) matche **tous** les frères (classe partagée) et
  chaque champ est un sélecteur **relatif** au conteneur. Produit un `extract` de type records
  (liste d'objets).
- **Wait for** — clic sur un élément à attendre → step `wait_for` (indispensable avant d'extraire une
  liste rendue en JS). Comme c'est une vérification de présence, un sélecteur de groupe (classe) est
  préféré à un chemin positionnel.
- **Make input** — clic sur un champ déjà rempli → il devient `{{ inputs.<nom> }}` (et est ajouté aux
  `inputs`), rendant le Blueprint réutilisable au lieu d'être figé sur une valeur. Le `type`/`format`
  de l'input est **inféré du type HTML** du champ (`number` → `number`, `date` → `string`+`format: date`,
  `email`/`url` → `format` correspondant, sinon `string`). Sans effet sur un secret.
- **Finish** — clôt la session (sans devoir fermer la fenêtre).

Les picks consécutifs se **coalescent** dans un seul step `extract` (`id: "data"`) ; une action entre
deux picks ouvre un nouveau step. Chaque sortie alimente le bloc `outputs` du Blueprint
(`{{ steps.data.<nom> }}`). Les formes d'`extract` produites (`as: "list"`, `each`/`fields`) sont
documentées côté moteur dans [docs/acts/continuum.md](acts/continuum.md#extraction-dom).

### Credentials → secrets

Un login demandé au recorder ne doit **jamais** écrire d'identifiant en clair dans le fichier. Deux
règles :

- un champ **`type=password`** devient un `{{ secrets.<nom> }}` ; sa valeur n'est **jamais capturée**
  (le script injecté ne l'envoie pas, il n'émet qu'un marqueur `redacted`) ;
- avec l'heuristique credentials (activée par défaut), un champ **username/login/email** (détecté par
  `name`/`autocomplete`) devient aussi un secret. `--no-secrets` (CLI) ou la bascule de la Console
  garde ces champs littéraux — le password, lui, reste toujours un secret.

Le nom du secret est dérivé du `name` du champ (`password`, `username`, …), unique et stable.

### Autres décisions de conception

- **Coalescence des `fill`.** Plusieurs éditions successives du même champ sont fusionnées en un seul
  `fill` avec la valeur finale (on écoute `change`, pas chaque frappe).
- **Clic sur un lien → `navigate`.** Un clic sur un `<a href>` menant à une URL réelle est enregistré
  comme un `navigate` vers cette URL, **pas** comme un clic : rejouer une URL stable est bien plus
  robuste que rejouer un sélecteur de lien fragile. On peut donc « naviguer normalement » en cliquant
  des liens pour atteindre la page cible, le Blueprint reste solide. Les boutons/`submit` (login,
  actions JS) restent des `click` — eux n'ont pas d'URL reproductible.
- **Dédup de navigation.** Une navigation qui suit immédiatement un `click`/`press` a été provoquée
  par lui : elle est **omise** (le clic l'implique déjà). Seule la navigation initiale, une navigation
  manuelle (barre d'adresse) et les clics-liens ci-dessus produisent des `navigate`.
- **Validation canonique.** Chaque fichier produit est **relu** par `load_blueprint` +
  `validate_for_act` avant d'être rendu : le recorder ne peut retourner qu'un Blueprint schéma-valide
  et exécutable, ou échouer bruyamment.
- **Sauvegarde.** Le Blueprint est écrit dans `./blueprints/<nom>.blueprint.json` (le dossier que la
  Library découvre, voir [`library_scan.py`](../src/aetherius/console/screens/library_scan.py)), donc
  il apparaît immédiatement dans la Console.

### Usage

Console (`aetherius` → Recorder) : renseigner un nom et une URL de départ, cliquer **Start** ; le
navigateur s'ouvre, la démonstration se fait, et fermer la fenêtre (ou **Stop**) sauvegarde. Les
actions capturées défilent en direct dans le journal d'événements (même pattern `Sink → EventLog`
que les runs, voir [docs/console.md](console.md)) et le Blueprint produit s'affiche à la fin.

CLI :

```bash
aetherius record quotes.login --url https://quotes.toscrape.com/login
# demontrez la tache, fermez la fenetre -> blueprints/quotes.login.blueprint.json
```

Exemples committés, **vraies sorties du recorder** (rejouables) :
[`quotes-recorded-login`](../examples/continuum/quotes-recorded-login.blueprint.json) (login → secrets)
et [`quotes-recorded-scrape`](../examples/continuum/quotes-recorded-scrape.blueprint.json)
(`wait_for` + records `{text, author}` + liste de tags via le menu flottant).

### Limites connues

- **Navigateur visible = pas de headless.** Le recorder ouvre une fenêtre : il ne tourne pas dans un
  job CI headless (les tests d'intégration injectent donc les mêmes scripts dans un Chromium headless
  et pilotent la démonstration via Playwright).
- **Dédup de navigation heuristique.** La règle « navigation après un clic = implicite » couvre le cas
  courant (login → tableau de bord) ; un multi-page complexe peut demander un ajustement manuel du
  Blueprint après coup.
- **Boutons sans hook stable.** Un `<input type=submit>` sans `id`/`name`/`data-testid`/texte tombe
  sur un chemin CSS positionnel (unique mais plus fragile) — c'est ce que la page offre. L'exemple
  ci-dessus l'illustre honnêtement.
- **Pas de flux conditionnel.** Le recorder produit une séquence linéaire ; `when`/`if`/`for_each`
  (exécutés depuis le jalon 1.5-B) s'ajoutent à la main après coup.
- **Records non imbriqués.** Un tableau extrait une valeur simple par champ ; une **liste dans une
  ligne** (ex. les tags de chaque citation) n'est pas capturée en un geste — extraire la liste
  globale à part, ou éditer le Blueprint. Le sélecteur `each` s'appuie sur une **classe partagée** par
  les frères ; une liste sans classe commune peut demander un ajustement manuel.

## Vector recorder (Act I — réseau)

Pour l'API, pas de sélecteurs DOM : on **observe le trafic**. Le script injecté
([`_vector_js.py`](../src/aetherius/recorder/_vector_js.py)) patche `fetch`/`XMLHttpRequest` (et
traite un **document JSON** — naviguer droit vers une URL d'API — comme une requête). Un panneau
flottant liste les réponses **JSON** ; on en choisit une, puis on pique les données à extraire depuis
un **résumé structuré** de la réponse : un tableau racine → « Extract N records » (champs scalaires
auto-détectés) ; un objet → une puce par clé (valeur scalaire → champ simple, valeur tableau →
records). Symétrique du pick DOM, sans écrire de JSONPath à la main.

[`vector_backend.py`](../src/aetherius/recorder/vector_backend.py) transforme chaque pick en un step
`http.request` (méthode, URL, corps `form`/`json` reconstitué, `expect.status`) avec une extraction
`{ "from": "json", "path": …, "fields"? }` — la forme que le [driver Vector](acts/vector.md#extraction)
exécute. Les picks sur la **même requête** se coalescent en un step ; les `outputs` sont dérivés.

**Secrets d'auth** (analogue réseau de credentials→secrets) : les en-têtes sensibles
(`Authorization`, `Cookie`, `X-Api-Key`, …) deviennent `{{ secrets.x }}` dans `headers` — exprimable
directement, sans toucher à `auth.py`, et jamais stocké en clair. Les en-têtes de bruit (User-Agent,
Accept, …) sont écartés ; `Content-Type` est conservé quand il y a un corps.

Exemple committé, **vraie sortie** du Vector recorder (rejouable sans navigateur, c'est du Vector) :
[`examples/vector/jsonplaceholder-users-recorded`](../examples/vector/jsonplaceholder-users-recorded.blueprint.json).

```bash
aetherius record jsonplaceholder.users --url https://jsonplaceholder.typicode.com/users --act vector
```

**Limites connues** : v1 cible surtout les **réponses JSON** ; le résumé structuré s'arrête à un
niveau (un tableau imbriqué profond ou une auth par cookies multi-étapes peut demander un ajustement
manuel). L'auth par token via en-tête est couverte (→ secret) ; l'auth par formulaire de login
(CAS-like) reste à câbler via `auth.py`.

## Gesture recorder

[`recorder/gesture_recorder.py`](../src/aetherius/recorder/gesture_recorder.py) capture des traces de
souris humaines réelles pour enrichir la bibliothèque de gestes de la discrétion.

Un script injecté (`_gesture_js.py`) streame des échantillons `[x, y, t]` (bufferisés puis flushés
par timer et à chaque clic, pour ne pas marteler le binding). La fonction **pure** `segment_gestures`
découpe ces échantillons en gestes *visés* — le mouvement menant jusqu'à un clic, aussi coupé sur les
pauses longues — et rebase chacun en **offsets relatifs** `[dx, dy, t]` depuis son origine, le format
exact de [`stealth/gestures/library.py`](../src/aetherius/stealth/gestures/library.py). Les gestes
dégénérés (trop courts) sont écartés. `merge_into_library` fusionne les traces dans le fichier cible
**sans détruire** l'existant et marque `meta.source: "recorded-human"`.

Cette bibliothèque est **source-agnostique** ([docs/stealth.md](stealth.md)) : le seed synthétique
(`meta.source: "synthetic-seed"`), les traces réelles du gesture recorder et de futures traces IA
coexistent derrière la même interface. Le humanizer ne change pas d'une ligne.

CLI :

```bash
aetherius record-gestures        # bougez/cliquez naturellement, fermez la fenetre pour sauver
aetherius record-gestures --out chemin/vers/lib.json   # cible un fichier separe (non destructif)
```

## Tester

Cœur pur (CI de base, sans navigateur) :

```bash
make test    # tests/unit/recorder/ : synthese de selecteurs, transformation, segmentation
```

Intégration (vrai Chromium, marker `browser`) :

```bash
pip install -e ".[browser,dev]" && playwright install chromium
make test-browser    # tests/integration/test_recorder_run.py : capture reelle + Blueprint valide
```

À la main, le flux complet (fenêtre visible) :

```bash
# login : demontrer, fermer la fenetre
aetherius record quotes.login --url https://quotes.toscrape.com/login
aetherius run blueprints/quotes.login.blueprint.json --secret username=x --secret password=y

# scraping : dans le menu flottant -> Wait for une citation, puis Pick table (texte, auteur), Done, Finish
aetherius record quotes.scrape --url https://quotes.toscrape.com
aetherius run blueprints/quotes.scrape.blueprint.json

# API (Vector) : le panneau liste les reponses JSON -> pick -> Extract records
aetherius record api.users --url https://jsonplaceholder.typicode.com/users --act vector
aetherius run blueprints/api.users.blueprint.json
```
