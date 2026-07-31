# Phase 2 — Autonomie & Contrôle

Dernière grande phase du projet, après la **Phase 1** (socle réutilisable, Acts I–II) et la
**Phase 1.5** (socle opérationnel : planification, alertes, réactivité, furtivité réseau/empreinte),
toutes deux **livrées** (v0.3.0). La Phase 2 apporte les **Acts cognitifs** (III/IV) et rend le bot à
la fois **plus autonome** et **plus pilotable**.

## Pourquoi ce cadrage (et pourquoi il a changé)

Le squelette d'origine cadrait la Phase 2 comme « livrer Act III (Oracle) + Act IV (Phantom) », avec
un Oracle reposant sur un **modèle de vision ONNX entraîné par tâche**. Après avoir construit les deux
premiers Acts et le socle opérationnel, trois constats rendent ce cadrage obsolète :

1. **Entraîner un ONNX par tâche est un mauvais ROI en 2026.** La capacité qu'Oracle visait —
   « localiser un élément par description quand les sélecteurs lâchent » — se fait aujourd'hui mieux
   et **sans entraînement** par *grounding VLM* : un modèle vision-langage rend des coordonnées à
   partir d'une capture + une description en langage naturel.
2. **Oracle et Phantom ne sont pas deux moteurs distincts** mais deux points sur un même axe
   d'autonomie. Ils partagent ~90 % de la machinerie (navigateur + stealth de Continuum, perception
   écran+DOM+a11y, appel modèle). Seul diffère *qui décide l'action suivante* : le Blueprint (Oracle,
   flux scripté, ciblage par vision) ou le planner (Phantom, objectif non scripté).
3. Les idées **« switch d'Act inter-tâches »**, **« self-healing par fallback d'Act »**,
   **« extraction sémantique en langage naturel »** et **« human-in-the-loop »** ne sont pas des
   features isolées : ce sont les expressions d'un **substrat de cognition partagé** + d'une
   **composition d'Acts par step** + d'un **plan de contrôle humain**.

## Décisions d'architecture

| # | Décision | Choix retenu |
|---|----------|--------------|
| 1 | Sort d'Oracle (Act III) | **Distinct mais redéfini VLM.** Grounding vision/langage naturel, **pas d'entraînement obligatoire**. Modèle local branchable derrière la même interface ; l'entraînement custom (`training/`) devient un **upgrade optionnel**. Oracle garde sa raison d'être face à Phantom : flux **scripté + déterministe + peu coûteux** (un appel de grounding par step ciblé) quand seuls les sélecteurs sont fragiles. |
| 2 | Fournisseur de cognition par défaut | **Claude** (grounding + planner), SDK `anthropic`. Provider **local/open branchable** derrière la même interface — même philosophie que la couche stealth (« rejeu par défaut, ML optionnel »). |
| 3 | Périmètre | **Large : « Autonomie & Contrôle ».** Acts cognitifs (III/IV) + composition multi-Act + self-healing + extraction sémantique + human-in-the-loop. |
| 4 | Modèle human-in-the-loop | **Attente bloquante + timeout.** Le run reste vivant et « garé » (navigateur compris) jusqu'à la décision. Pas de suspend/resume persistant (irréaliste avec une page Playwright vivante). |

Tout reste **léger** et fidèle aux invariants du projet : `import aetherius` ne tire aucune dépendance
IA au niveau module (les SDK `anthropic`/`onnxruntime` sont importés paresseusement dans les Acts,
comme Playwright l'est déjà) ; les contrats restent la source de vérité ; le dictionnaire d'actions
reste la table unique ; chaque fichier de logique reste sous ~300 lignes.

## Le substrat de cognition (cœur de la phase)

Les Acts II/III/IV deviennent **trois stratégies au-dessus d'un unique substrat** navigateur +
stealth + perception + cognition. Ils ne diffèrent que par (a) comment la *cible* d'un step est
résolue et (b) qui décide le *prochain* step.

```
                         ┌──────────────────────────────────────────────┐
                         │   Substrat partagé (Jalon 2-A)                │
                         │   BrowserSession + Stealth (Continuum)        │
                         │   Perception : screenshot + DOM + a11y        │
                         │   CognitionProvider : Grounder / Extractor /  │
                         │                       Planner (Claude défaut) │
                         └───────────────┬──────────────────────────────┘
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                 │
  Act II Continuum              Act III Oracle (2-B)             Act IV Phantom (2-C)
  cible = sélecteur CSS/XPath   cible = {vision:"desc"} → coords  objectif = goal/constraints
  steps scriptés                steps scriptés                    steps décidés par le planner
  (déjà livré)                  + extraction sémantique           boucle percevoir→raisonner→agir

        └──────────── Composition multi-Act par step + self-healing (2-D) ──────────────┘
                     (act par step, fallback II→III→IV, un seul navigateur partagé)

   Human-in-the-loop (2-E) — orthogonal : action `confirm`, run « garé » jusqu'à décision,
   via console / API daemon / réponse de notification.
```

- **Interface `CognitionProvider`** (`src/aetherius/acts/_cognition/`), ségrégée en trois rôles :
  `Grounder.locate` (description → coordonnées), `Extractor.read` (description → données),
  `Planner.plan` (objectif → prochaine action). Implémentation par défaut `ClaudeProvider` ;
  implémentation locale optionnelle (`LocalGrounder`, ONNX/VLM) derrière la même interface.
- **Modèle de cible unifié** (`src/aetherius/core/runtime/selector.py`) : un `Target` qui abstrait
  `{selector, selector_type}` (résolu par Continuum) **et** `{vision:"description"}` (résolu par le
  Grounder). La même action (`click`, `type`, `wait_for`) se lit à l'identique quel que soit l'Act.
- **Clic par coordonnées à travers le stealth** : la façade `HumanInput` gagne `click_at(x, y)` /
  `type_at(...)` (la primitive coordonnées existe déjà une couche en dessous,
  `HumanMouse.move_to(x, y)`).

## Les jalons et leur ordre

Chaque jalon fait l'objet d'une **spécification autonome** (même format que la Phase 1.5). Le
squelette (stubs d'interface documentés + contrats existants) est déjà en place ; chaque
spécification décrit ce qu'il reste à implémenter, sa « Définition de terminé », son plan de test et
son exemple exécutable.

```
2-A Substrat cognition ──┬──► 2-B Oracle (III) + extraction sémantique ──┐
                         └──► 2-C Phantom (IV) ─────────────────────────┤
                                                                        ├──► 2-D Multi-Act + self-healing
2-E Human-in-the-loop  [orthogonal, à tout moment] ──────────────────────┘
```

| Jalon | Spécification | Dépend de | Résumé |
|-------|---------------|-----------|--------|
| 2-A | [2-a-cognition.md](2-a-cognition.md) | — (Act II) | **Livré.** Substrat perception + cognition (`CognitionProvider`, `Target` unifié, `HumanInput.click_at`, résolution de provider). Fondation de 2-B et 2-C. Doc : [docs/cognition.md](../cognition.md). |
| 2-B | [2-b-oracle.md](2-b-oracle.md) | 2-A | **Livré.** Act III Oracle runnable : ciblage `{vision}` sur click/type/upload/hover/wait_for + action `read` (extraction sémantique) ; `OracleDriver` étend Continuum (un seul navigateur, une seule discrétion). Doc : [docs/acts/oracle.md](../acts/oracle.md). |
| 2-C | [2-c-phantom.md](2-c-phantom.md) | 2-A | **Livré.** Act IV Phantom runnable : agent orienté objectif (`goal`/`constraints`, `options.agent.max_steps`), boucle percevoir→raisonner→agir, planner Claude ; `PhantomDriver` étend Oracle. Doc : [docs/acts/phantom.md](../acts/phantom.md). |
| 2-D | [2-d-composition.md](2-d-composition.md) | 2-B, 2-C | **Livré.** `act` par step (hérité dans les branches, validé contre l'act effectif) + self-healing (`describe` + chaîne `fallback` : rejeu vision Oracle, micro-objectif Phantom borné), un seul navigateur partagé par subsomption des drivers. Doc : [docs/composition.md](../composition.md). |
| 2-E | [2-e-human-in-loop.md](2-e-human-in-loop.md) | 1.5-A, 1.5-C, daemon | **Livré.** Action `confirm` : run garé (attente bloquante + timeout obligatoire, `on_timeout` défaut reject) jusqu'à décision humaine via **quatre surfaces** (console `ConfirmModal`, CLI stdin, API `POST /v1/runs/{id}/decisions`, boutons ntfy) ; piste d'audit `approvals`. Orthogonal aux Acts. Doc : [docs/human-in-the-loop.md](../human-in-the-loop.md). |

**Ordre recommandé :** 2-A, puis 2-B, puis 2-C (2-C réutilise le grounder/extracteur de 2-B), puis
2-D (a besoin de ≥2 Acts navigateur pour switcher). 2-E est **orthogonal** : indépendant des Acts, il
peut être traité à tout moment (y compris en premier), car il ne dépend que des primitives de la
Phase 1.5 (store, notify) et du daemon.

## Extras & dépendances

Le chemin par défaut (Claude) et le chemin local optionnel sont deux extras distincts (en place
depuis le Jalon 2-A) :

- `[cognition]` = `anthropic`, `pillow` — **le défaut** partagé Oracle+Phantom (screenshots + appel
  VLM/planner). Absorbe l'ancien extra `[agent]`.
- `[vision]` = `onnxruntime`, `opencv-python-headless`, `numpy`, `pillow` — **conservé**, mais
  repositionné comme le **grounder local optionnel** (plus « la façon dont Oracle marche »).

## Implémenter un jalon

Un jalon se traite en suivant sa **spécification** et la
[« Définition de terminé »](../../CONTRIBUTING.md#définition-de--terminé-) de `CONTRIBUTING.md`.
Chaque spécification pointe vers les stubs en place et les fichiers à toucher ; le squelette compile
déjà (`make check` vert). L'implémentation d'un jalon inclut sa doc `docs/<feature>.md` définitive,
son exemple exécutable et ses tests miroir, puis bascule sa case dans le
[README](../../README.md), section « État d'avancement ».

> **Note de portée du squelette.** Tout ce qui toucherait la table des `capabilities`, les contrats
> (`contracts/*.json|yaml`), l'enum `EventType`, `IMPLEMENTED_ACTS` ou le dispatch d'un driver est
> **différé au jalon concerné** (sinon les tests anti-drift et de contrats cassent). Le squelette
> posé aujourd'hui reste au niveau **interface + documentation**.
