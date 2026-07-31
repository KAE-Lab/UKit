# Plugins : actions custom et canaux de notification

Le mécanisme d'extension d'Aetherius (Phase 1.5, Jalon E) : un paquet Python tiers ajoute des
**actions** de Blueprint et des **canaux de notification** sans forker le cœur. Deux groupes
d'entry-points, deux registres, une surface d'import unique (`aetherius.plugins`) :

| Groupe d'entry-points | Registre | Enregistrement |
|-----------------------|----------|----------------|
| `aetherius.actions` | `core/actions/registry.py` | `@register_action(spec)` |
| `aetherius.notify_channels` | `notify/registry.py` | `@register_channel(kind, target_key=...)` |

Les canaux built-in (`webhook`, `discord`, `telegram`, `ntfy`) passent par **la même couture**
(`register_channel`) : ils sont les premières « extensions » du système — un plugin n'a aucun
traitement de faveur en moins.

## Écrire une action

Un handler d'action a **exactement la signature de dispatch des drivers** — aucune couche
d'adaptation entre un plugin et un handler built-in :

```python
from typing import Any, Callable

from aetherius.plugins import (
    ActionSpec, EventBus, ParamSpec, RunContext, StepModel, register_action,
)

SPEC = ActionSpec(
    "monplugin.slugify",                       # nom exposé aux Blueprints
    "Turn any text into a URL-safe slug.",     # résumé affiché par le Studio
    params=(
        ParamSpec("value", "string", required=True, help="Text to slugify."),
    ),
)

@register_action(SPEC)
def slugify(
    step: StepModel,
    ctx: RunContext,
    bus: EventBus,
    renderer: Callable[[Any], Any],
) -> dict[str, Any]:
    value = str(renderer(step.extra_fields.get("value", "")))
    ...
    return {"slug": slug}      # disponible ensuite via {{ steps.<id>.slug }}
```

- **La spec est obligatoire** : c'est elle qui rend l'action visible du Blueprint Studio
  (formulaire généré, aperçu validé) et du validator — l'invariant « registre = source, catalogue =
  projection » vaut aussi pour les plugins.
- **Les paramètres du step** arrivent bruts dans `step.extra_fields` ; passer chaque valeur par
  `renderer(...)` pour résoudre les templates `{{ }}` (inputs, secrets, steps précédents).
- **Nommage** : préfixer par un namespace (`monplugin.action`). L'enregistrement **refuse** un nom
  déjà pris — par une action built-in ou par un autre plugin — pour qu'un conflit soit un échec
  de chargement explicite, jamais un shadowing silencieux.
- **Act-agnostique par conception** : la table de capacités (`core/actions/base.py`) reste la
  source de vérité *statique* des Acts ; une action plugin est **hors table**, validée
  dynamiquement (enregistrée = acceptée sur tout Act) et dispatchée en repli, *après* le `match`
  built-in du driver. Un handler qui dépend de l'Act lit `ctx.blueprint.act`. C'est un choix
  assumé : ne pas figer les Acts d'un tiers dans le cœur, au prix d'une validation moins stricte
  pour ces actions-là.

## Écrire un canal de notification

Un canal est n'importe quel objet exposant `send(notification)` (protocole structurel
`NotificationChannel`) ; le registre associe un **kind** à une **factory** :

```python
from typing import Mapping

from aetherius.plugins import Notification, NotificationChannel, register_channel, require

class LogFileChannel:
    def __init__(self, path: str) -> None:
        self._path = path

    def send(self, notification: Notification) -> None:
        ...   # une exception ici est contenue par dispatch(), jamais fatale au run

@register_channel("logfile", target_key="path")
def build(config: Mapping[str, str]) -> NotificationChannel:
    return LogFileChannel(require(config, "logfile", "path"))
```

- `target_key` déclare la clé de config que le raccourci `target` de l'action `notify` remplit
  (voir [docs/notifications.md](notifications.md)) ; l'omettre pour un canal multi-clés.
- `require(config, kind, key)` lève une `NotificationError` claire si une clé manque.
- Le kind apparaît automatiquement partout où les canaux sont listés : validation des schedules,
  formulaire de la Console, action `notify`.

## Déclarer les entry-points

Dans le `pyproject.toml` du plugin, chaque entry-point cible un module dont **l'import réalise
l'enregistrement** (décorateurs au niveau module — la même mécanique que les canaux built-in).
Le nom de l'entry-point (`demo =`) n'est qu'une étiquette de log :

```toml
[project.entry-points."aetherius.actions"]
demo = "aetherius_plugin_demo"

[project.entry-points."aetherius.notify_channels"]
demo = "aetherius_plugin_demo"
```

Un même module peut fournir les deux (l'import est mis en cache, le double chargement est un no-op).

## Le chargement

`aetherius.plugins.load_plugins()` découvre et importe les deux groupes. Il est **idempotent**
(appels suivants no-op) et appelé au démarrage par toutes les surfaces :

- la **CLI** (callback racine : `run`, `validate`, `schedule`, la Console) ;
- le **daemon** (lifespan FastAPI, avant le scheduler — les plugins chargés sont loggés) ;
- le **moteur** (`RunEngine.run`, avant validation) — l'usage bibliothèque in-process est donc
  couvert sans rien faire.

Seul cas à la main : un consommateur bibliothèque qui n'exécute rien (builder/catalogue seul)
appelle `load_plugins()` lui-même.

## Isolation des pannes et collisions

- **Un plugin qui lève au chargement n'empêche jamais le démarrage** : l'entry-point est loggé
  (`aetherius.plugins`, niveau warning) et sauté ; les autres plugins chargent normalement.
- **Les built-ins sont prioritaires** : `load_plugins` enregistre les canaux built-in avant tout
  entry-point, et les gardes de collision des deux registres refusent un nom déjà pris — le plugin
  en conflit est celui qui est sauté, avec un message qui le nomme.

## Confiance et limites

- **Charger un plugin, c'est exécuter son code Python** au chargement comme au runtime : il n'y a
  **pas de sandbox**. N'installer que des paquets de confiance — le mécanisme s'adresse à du code
  que l'utilisateur possède ou audite.
- Pas de chargement à chaud : un plugin installé/retiré est pris en compte au prochain démarrage
  du processus (CLI, daemon).
- Pas de marketplace ni de gestion de versions de plugins — hors périmètre.
- Une action plugin n'apparaît pas dans `contracts/blueprint.schema.json` (le champ `action` y est
  une chaîne libre) : la validation fine reste dynamique, côté registre.

## Tester le plugin d'exemple

Le plugin de démonstration ([examples/plugins/](../examples/plugins/)) fournit l'action
`demo.slugify` et le canal `logfile`, plus un Blueprint zéro réseau qui les enchaîne :

```bash
pip install -e examples/plugins/aetherius-plugin-demo
aetherius validate examples/plugins/demo-notify.blueprint.json
aetherius run examples/plugins/demo-notify.blueprint.json
# outputs.slug = "aetherius-per-nubes-ad-aethera", delivered = true,
# et la ligne d'alerte est ajoutée à ./aetherius-demo-notifications.log
```

Sans le plugin installé, le même `run` échoue à la validation avec un message clair (action
inconnue) — le comportement attendu. Dans la Console, `demo.slugify` apparaît dans le catalogue du
Studio et `logfile` dans les canaux d'alerte des schedules.

**Développement du cœur** : désinstaller le plugin (`pip uninstall aetherius-plugin-demo`) avant
`make check` — les tests d'intégration démarrent le vrai moteur, qui découvrirait le plugin
réellement installé.
