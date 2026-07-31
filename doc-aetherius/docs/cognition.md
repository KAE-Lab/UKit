# Substrat de cognition — perception, providers, cible unifiée

Le substrat de cognition est la fondation partagée des Acts cognitifs (Oracle III, Phantom IV) :
la machinerie qui permet à Aetherius de **voir** une page (perception), d'en **raisonner**
(fournisseur de cognition, Claude par défaut) et d'**agir par coordonnées à travers la
discrétion**. Introduit par le Jalon 2-A ([spécification](phase-2/2-a-cognition.md)) ; seul, il
n'apporte aucune capacité utilisateur — Oracle (2-B) et Phantom (2-C) le consomment.

Implémentation : [`src/aetherius/acts/_cognition/`](../src/aetherius/acts/_cognition/),
[`src/aetherius/acts/_perception.py`](../src/aetherius/acts/_perception.py),
[`src/aetherius/core/runtime/selector.py`](../src/aetherius/core/runtime/selector.py),
[`src/aetherius/models/registry.py`](../src/aetherius/models/registry.py).

## Les trois rôles, ségrégés

Un fournisseur de cognition remplit jusqu'à trois rôles distincts
([`provider.py`](../src/aetherius/acts/_cognition/provider.py)) — trois protocoles, pas une
méthode fourre-tout, pour qu'un provider partiel reste possible :

| Rôle | Méthode | Qui le consomme |
|------|---------|-----------------|
| `Grounder` | `locate(perception, description) -> GroundResult` | Oracle (ciblage `{vision}`), Phantom |
| `Extractor` | `read(perception, description, schema=...) -> Any` | Oracle (action `read`, extraction sémantique), Phantom |
| `Planner` | `plan(goal, constraints, perception, memory)` | Phantom (boucle percevoir→raisonner→agir) |

`GroundResult` = une `Box` (rectangle dans le viewport) + une `confidence` (0..1).

## Résolution du provider : `vision.provider` / `vision.model`

Le champ `vision` du Blueprint configure la cognition ; `resolve_provider`
([`models/registry.py`](../src/aetherius/models/registry.py)) le résout en provider :

```json
"vision": { "provider": "claude", "model": "claude-opus-4-8" }
```

- **`provider`** choisit le *backend* : `claude` (défaut, extra `[cognition]`) ou `local`
  (extra `[vision]`, détecteur ONNX/VLM sur la machine). Autre valeur → `CognitionError`.
- **`model`** nomme le *modèle*, pas le backend : un id Anthropic pour Claude (défaut :
  `claude-opus-4-8`), un nom d'asset local `nom@version` pour le grounder local.
- Champ `vision` absent → Claude avec le modèle par défaut. Le schéma JSON du Blueprint autorise
  déjà ces sous-champs (`additionalProperties: true`) : **aucun changement de contrat**.

Le provider **local** n'implémente que le grounding : `read`/`plan` lèvent une `CognitionError`
explicite (décision de conception : `resolve_provider` renvoie toujours un `CognitionProvider`
complet au sens du typage, les rôles non portés échouent en erreur typée plutôt qu'en
`AttributeError`). Son inférence réelle et le cache d'assets sous `models/store/` arrivent avec le
chemin local (Jalon 2-B+) ; l'entraînement reste une piste avancée (`training/`).

Le rôle `Planner` est porté par le `ClaudeProvider` depuis le Jalon 2-C : `plan` délègue à
[`planning.py`](../src/aetherius/acts/_cognition/planning.py), qui expose au modèle un vocabulaire
d'outils restreint (tool use forcé `tool_choice: any`, ciblage vision uniquement, plus `finish`/
`abort`) et renvoie un step concret ou un marqueur terminal. Détails et table des outils :
[docs/acts/phantom.md](acts/phantom.md).

### Clé API (chemin Claude)

Le `ClaudeProvider` utilise la chaîne standard du SDK Anthropic : la variable d'environnement
`ANTHROPIC_API_KEY`, qui peut vivre dans le `.env` local git-ignoré (chargé une seule fois par le
même mécanisme que les secrets, voir [docs/secrets.md](secrets.md)). Ce n'est **pas** un secret de
Blueprint (`AETHERIUS_SECRET_*`) : c'est une clé du moteur, jamais référencée dans un fichier
d'instructions.

## Perception : voir la page en pixels CSS

`capture(page, include_dom=False)` ([`_perception.py`](../src/aetherius/acts/_perception.py))
fige une page **déjà ouverte** par un Act navigateur en une `Perception` : screenshot PNG du
viewport, géométrie, URL, et DOM sérialisé sur demande. La perception ne lance jamais son propre
navigateur — Oracle et Phantom réutilisent la `BrowserSession` de Continuum.

**Invariant de repère : 1 pixel d'image = 1 pixel CSS.** Le screenshot est pris avec
`scale="css"`, donc les boîtes rendues par un grounder sur l'image tombent directement dans le
repère de `page.mouse` — aucun calcul de device-pixel-ratio nulle part. Si l'image dépasse la
limite haute résolution du modèle (2576 px de bord long), elle est réduite côté client via
`pillow` et la boîte retournée est remise à l'échelle : l'appelant reçoit toujours des pixels CSS
du viewport. (Laisser le serveur redimensionner casserait silencieusement la correspondance des
coordonnées.)

## Le grounding Claude, en un appel structuré

`ClaudeProvider.locate` envoie le screenshot + la description en langage naturel, et **force un
tool use** (`report_element`, schéma strict `{x, y, width, height, confidence}`) : la réponse
revient structurée, jamais parsée dans de la prose. Un appel par cible, sans thinking ni
température — le flux Oracle reste déterministe et peu coûteux. `read` suit le même chemin
(`report_data`) : avec un `schema` JSON fourni, il devient l'`input_schema` du tool et la réponse
épouse cette forme ; sans schéma, une valeur JSON libre est renvoyée. Une réponse sans tool call
(refus, par exemple) lève `CognitionError` ; l'extra manquant lève `DependencyError` (le correctif
— installer `[cognition]` — reste explicite).

## Cible unifiée : `Target`

Une action (`click`, `type`, `wait_for`, …) vise soit un **sélecteur DOM** (résolu par Continuum),
soit une **description vision** (résolue par un Grounder). `Target.from_step` lit les deux formes
du Blueprint :

```json
{ "action": "click", "selector": "#submit" }
{ "action": "click", "target": { "vision": "the Post button" } }
```

La forme imbriquée `target: {selector, selector_type}` est aussi acceptée. Un step ambigu
(sélecteur **et** vision) ou sans cible lève `ActionError` — les deux sont des erreurs d'écriture,
signalées clairement. `Box.center` donne le point de clic d'une boîte groundée.

## Clic par coordonnées à travers la discrétion

La façade [`HumanInput`](../src/aetherius/stealth/humanizer/input.py) gagne le chemin coordonnées
que les Acts cognitifs pilotent :

- `click_at(x, y)` — souris humanisée active : trajet par rejeu de geste + timing d'appui humain
  (mêmes primitives que le clic par locator) ; sinon : `page.mouse.click(x, y)` simple. La
  dégradation par feature est la même que pour le reste de la façade.
- `type_at(x, y, text)` — clique le point pour donner le focus, puis saisit le texte (humanisé si
  le clavier l'est).

Le placement **off-center** dans l'élément reste la responsabilité de l'appelant : lui connaît la
`Box`, `click_at` ne connaît que le point (Oracle choisit un point dans la bande 30–70 % de la
boîte groundée — `oracle/locator.py::point_in_box`). La façade offre aussi `hover_at(x, y)`
(survol par coordonnées, même dégradation par feature).

## Extras

```bash
pip install aetherius[cognition]   # défaut Oracle+Phantom : anthropic + pillow (absorbe l'ancien [agent])
pip install aetherius[vision]      # optionnel : grounder local ONNX/VLM (onnxruntime, opencv)
```

`import aetherius` reste léger : `anthropic` et `PIL` ne sont importés que dans les méthodes des
providers, jamais au chargement (gardé par `tests/unit/test_public_api.py`).

## Limites connues (voulues)

- **Le ciblage `{vision}` et l'action `read` sont câblés depuis le Jalon 2-B** : Oracle (Act III)
  les consomme — seuil de confiance, point off-center et sémantique des sorties sont documentés
  dans [docs/acts/oracle.md](acts/oracle.md). Le `plan` de Claude est livré au Jalon 2-C et
  consommé par Phantom (Act IV) — voir [docs/acts/phantom.md](acts/phantom.md).
- **Grounder local** : interface en place (`vision.provider: "local"`), inférence différée ;
  `models/store/` est réservé à ses assets.
- **`read` avec schéma** : le schéma doit décrire un objet JSON (c'est l'`input_schema` d'un tool).

## Tester le substrat

```bash
pytest tests/unit/core/runtime/test_selector.py tests/unit/models tests/unit/acts/cognition  # cœur, sans extras
pip install -e ".[cognition]" && pytest -m cognition        # appels Claude mockés (aucun réseau)
pip install -e ".[browser]"   && pytest tests/integration/test_cognition_substrate.py  # Chromium réel
```

Le dernier vérifie sur un vrai Chromium que `capture` rend bien des pixels CSS et qu'un
`click_at`/`type_at` par coordonnées atterrit à travers le humanizer.
