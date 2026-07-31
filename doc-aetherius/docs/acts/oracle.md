# Act III — Oracle (ciblage vision + discrétion)

**Statut : livré** (Phase 2, [Jalon 2-B](../phase-2/2-b-oracle.md)). Quand les sélecteurs sont
fragiles, absents ou piégés, Oracle **regarde l'écran** : un modèle vision-langage (VLM — Claude par
défaut) localise la cible décrite en **langage naturel** sur une capture, et Aetherius **agit par
coordonnées à travers la couche de discrétion**. Le flux reste **scripté et déterministe** — Oracle
ne décide rien, seule la *résolution de cible* est déléguée au modèle (un appel de grounding par
step ciblé) — c'est ce qui le distingue de Phantom (agent complet, Jalon 2-C).

> **Redéfinition Phase 2.** Le plan d'origine reposait sur un **petit modèle ONNX entraîné par
> tâche**. Ce n'est plus le chemin par défaut : le grounding se fait par **VLM** (Claude), sans
> entraînement. Un **grounder local** (ONNX/VLM) reste branchable derrière la même interface
> `Grounder`, comme upgrade **optionnel** (voir [`training/`](../../training/README.md)). Décision
> et cadrage : [docs/phase-2/README.md](../phase-2/README.md).

Depuis le Jalon 2-D, le ciblage vision d'Oracle sert aussi hors d'un Blueprint `oracle` : un step
peut passer `act: "oracle"` dans un run Continuum, et le **self-healing** rejoue par vision un
step au sélecteur cassé (`describe` + `fallback`) — voir [docs/composition.md](../composition.md).

## Le principe

Un Blueprint `act: "oracle"` est un Blueprint Continuum dont certains steps ciblent par
**description** au lieu de sélecteur :

```json
{ "action": "click", "target": { "vision": "the Post button" } }
{ "action": "click", "selector": "#submit" }
```

- **Cibles par description** : `click`, `type`, `upload`, `hover` et `wait_for` acceptent
  `target: {vision: "..."}`. Le `Grounder` du [substrat de cognition](../cognition.md) rend une
  `Box` en pixels CSS ; Aetherius agit sur un point **off-center** (bande 30–70 % de la boîte,
  jamais le centre exact) via la façade `HumanInput` — gestes rejoués et timing humain si la
  discrétion est active, opérations souris brutes sinon (même dégradation par feature que le reste
  du stealth).
- **Extraction sémantique** : l'action `read` lit des données décrites en langage naturel —
  la brique « donner une info directement humaine ». Voir ci-dessous.
- **Un seul navigateur, une seule discrétion** : `OracleDriver` **étend** le driver Continuum —
  même `BrowserSession`, même stealth, même proxy, même sessions persistantes. Tout step sans cible
  vision (navigate, extract, screenshot, un `click` à sélecteur…) suit le chemin Continuum à
  l'identique. C'est ce qui rend la composition multi-Act (Jalon 2-D) possible sans multiplier les
  navigateurs.

## Actions et paramètres vision

| Step | Comportement |
|------|--------------|
| `click` + `target: {vision}` | Grounde la description, clique un point off-center de la boîte (`HumanInput.click_at`). |
| `hover` + `target: {vision}` | Amène le curseur sur le point (`hover_at`), sans cliquer. |
| `type` + `target: {vision}` | Clique le point pour donner le focus puis saisit `text` sans effacer (`type_at`). |
| `upload` + `target: {vision}` | Clique le contrôle décrit et alimente le **file chooser** que ce clic ouvre avec `file`. |
| `wait_for` + `target: {vision}` | **Sonde** l'écran (capture + grounding) jusqu'à ce que l'élément soit vu avec assez de confiance, ou `timeout_ms` (défaut `options.timeout_ms`/30 s). `on_timeout: "fail:CODE"` fonctionne comme en Continuum. |
| `read` | Extraction sémantique (voir ci-dessous). |

Paramètre commun : `min_confidence` (défaut **0.5**). En dessous de ce seuil, le grounding échoue en
`CognitionError` explicite (« l'élément n'est probablement pas à l'écran ») plutôt que de cliquer un
point quasi aléatoire ; pour `wait_for`, une confiance sous le seuil signifie « pas encore là » et
la sonde continue. Un step peut l'ajuster : `{"action": "click", "target": {"vision": "…"},
"min_confidence": 0.3}`.

Chaque grounding réussi émet un événement `progress` (niveau debug) portant la boîte résolue —
utile pour comprendre *où* Oracle a vu la cible.

### Recherche par défilement (scan)

Par défaut, une cible vision qui n'est pas vue dans le viewport courant déclenche un **scan** :
Oracle fait défiler la page viewport par viewport (scroll humanisé si la discrétion est active,
molette brute sinon) et re-grounde à chaque coup d'œil — le réflexe d'une personne qui cherche un
élément. Un run parti en milieu de page remonte en haut une fois le bas atteint, pour couvrir
toute la page. Chaque coup d'œil coûte **un appel de grounding**, plafonné à **8** au total ;
l'échec final indique le nombre de coups d'œil et la meilleure confiance observée. Une cible
visible d'emblée coûte exactement un appel, comme sans scan. `"scan": false` épingle le step au
viewport courant (un seul appel, aucun défilement) — pour forcer l'économie ou quand la cible est
garantie visible.

`wait_for` (vision) et `read` restent bornés au **viewport courant** : `wait_for` attend une
*apparition* (par définition à l'écran, et le scan multiplierait le coût de chaque sonde), et
`read` n'a pas de signal « non trouvé » qui dirait quand défiler — placer un `scroll` explicite
avant si la donnée vit plus bas.

**Coût et cadence.** Un step ciblé visible = **un** appel modèle ; un scan = un appel par coup
d'œil (borné à 8). `wait_for` par vision sonde toutes les ~2,5 s, soit un appel de grounding
**par sonde** — dimensionner `timeout_ms` en conséquence (préférer un `wait_for` à sélecteur
quand le DOM est fiable, il est gratuit).

## L'action `read` (extraction sémantique)

```json
{
  "id": "form",
  "action": "read",
  "vision": "the labels of the login form fields and the text of the submit button",
  "schema": {
    "type": "object",
    "properties": {
      "field_labels": { "type": "array", "items": { "type": "string" } },
      "submit_text": { "type": "string" }
    },
    "required": ["field_labels", "submit_text"]
  }
}
```

- **Avec `schema`** (un JSON Schema d'**objet** — c'est l'`input_schema` d'un tool Anthropic) : la
  réponse épouse cette forme et ses champs deviennent directement les sorties du step
  (`{{ steps.form.field_labels }}`).
- **Sans `schema`** : une valeur JSON libre est renvoyée sous la clé fixe `data`
  (`{{ steps.x.data }}`).

## Configuration `vision`

```json
"vision": { "provider": "claude", "model": "claude-opus-4-8" }
```

Champ optionnel (absent → Claude avec le modèle par défaut). `provider` choisit le backend
(`claude`, extra `[cognition]` ; ou `local`, extra `[vision]`), `model` nomme le modèle. Résolution
et clé API (`ANTHROPIC_API_KEY`, `.env` supporté — une clé du **moteur**, jamais un secret de
Blueprint) : [docs/cognition.md](../cognition.md).

## Installation

```bash
pip install "aetherius[cognition,browser]" && playwright install chromium
```

`[cognition]` porte le grounding par défaut (Claude) ; `[browser]` le navigateur qu'Oracle réutilise.
Le grounder local optionnel (`[vision]`) reste une interface sans inférence à ce jour.

## Modules

[`src/aetherius/acts/oracle/`](../../src/aetherius/acts/oracle/) — `driver.py` (`OracleDriver`,
étend le driver Continuum : intercepte les cibles vision et `read`, délègue tout le reste),
`locator.py` (`Target` vision → `Box` : seuil de confiance + choix du point off-center),
`scan.py` (recherche par défilement bornée), `perception.py`/`model.py` (seams du substrat). Le substrat partagé vit dans
[`acts/_cognition/`](../../src/aetherius/acts/_cognition/) et
[`acts/_perception.py`](../../src/aetherius/acts/_perception.py).

## Limites connues (voulues)

- **`upload` par vision suppose un file chooser** : le clic sur le contrôle décrit doit ouvrir le
  dialogue de fichier natif. Un input caché sans dialogue se cible par sélecteur (chemin Continuum).
- **`read` avec `schema` exige un objet** JSON (contrainte du tool use forcé) ; sans schéma, la
  valeur arrive sous `data`.
- **`fill` ne prend pas de cible vision** (il exige l'effacement préalable du champ, sémantique de
  locator) : utiliser `type` pour saisir au point groundé, ou `fill` à sélecteur.
- **`wait_for` et `read` ne scannent pas** : bornés au viewport courant (voir « Recherche par
  défilement ») — un `scroll` explicite les précède si nécessaire.
- **Grounder local** : interface en place (`vision.provider: "local"`), inférence non implémentée —
  le chemin par défaut est Claude ; l'entraînement custom reste la piste avancée de `training/`.
- **Une capture par grounding** : la perception n'est pas mise en cache entre deux steps (la page
  bouge) ; c'est le prix de la fiabilité, pas un bug de performance.

## Notes de conception

- **Déterminisme d'abord** : Oracle exécute les steps dans l'ordre, sans boucle d'agent ; seule la
  résolution de cible passe par le modèle. Auditable, reproductible, coût borné par le nombre de
  steps ciblés.
- **Le seuil vit dans `locator.py`**, pas dans le provider : un même `GroundResult` est une réussite
  pour `wait_for` (confiance haute) ou un « pas encore » (confiance basse), selon l'appelant.
- **L'off-center est le job du driver** (`point_in_box`), pas de `click_at` : seule la couche qui
  connaît la `Box` peut choisir un point dedans (décision du Jalon 2-A).

## Recorder *(à venir)*

Plutôt que l'annotation de screenshots, la voie moderne est la **désignation en langage naturel** :
décrire la cible, laisser le VLM la localiser — branchée comme un backend recorder (cf.
[docs/recorder.md](../recorder.md#recorder--les-acts)).

## Tester Act III

Exemples réels, zéro config (pages publiques autorisées), exécutables dès que `ANTHROPIC_API_KEY`
est posée (env ou `.env`) :

```bash
pip install -e ".[cognition,browser]" && playwright install chromium
aetherius run examples/oracle/quotes-vision-demo.blueprint.json      # clic + wait_for + read par vision
aetherius run examples/oracle/books-scan-below-fold.blueprint.json   # cible hors viewport -> scan
```

… ou depuis la Console (`aetherius` → Library → Run). Le premier clique le lien « Login » désigné
en langage naturel, attend le formulaire par vision, puis `read` les labels en sortie structurée.
Le second cible un livre **sous la ligne de flottaison** : Oracle défile pour le trouver. Le
gabarit TikTok (`examples/oracle/tiktok-upload.blueprint.json`) reste **non exécutable** tel quel
(compte/secrets requis) : c'est la référence de format du cas fondateur.

Sondes réalistes jouées à la livraison (voir
[docs/testing.md](../testing.md#sondes-réalistes)) : désambiguïsation d'une couverture précise
parmi la grille dense de `books.toscrape.com` (succès, données du bon produit relues en aval) ;
cible réelle hors viewport (échec **propre** `confidence 0.00 < 0.50` avant le scan — c'est cette
sonde qui a motivé la recherche par défilement, qui la fait désormais réussir).

Suite automatisée :

```bash
pytest tests/unit/acts/oracle                       # mapping vision + boucle de scan, fakes, sans navigateur (CI de base)
pytest tests/integration/test_oracle_run.py        # runs complets sur vrai Chromium, provider fake (marker browser)
```

Le premier niveau tourne sans aucun extra ; le second exige `[browser]` mais **pas** `[cognition]`
(le provider est fake : c'est le câblage moteur → driver → navigateur — scan compris — qui est
prouvé, sans réseau).
