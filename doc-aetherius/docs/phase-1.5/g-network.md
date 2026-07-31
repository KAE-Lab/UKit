# Jalon G — Identité réseau (proxy & rotation)

**Statut : livré.** L'option `options.proxy` route les deux moteurs (Vector httpx/curl_cffi, Continuum
Playwright), avec rotation d'IP par run, anti-fuite WebRTC, cohérence géo et impersonation TLS.
Documentation de référence : [docs/network.md](../network.md). Ce document conserve la spécification
d'origine (objectif, périmètre, décisions de conception) pour la traçabilité.

## Objectif

Rendre le bot invisible **au niveau réseau**, pas seulement au niveau de l'empreinte navigateur :
router le trafic par un proxy, faire tourner l'IP de sortie, et empêcher toute fuite de l'IP réelle.
La couche stealth actuelle masque l'empreinte (côté navigateur seulement) mais l'IP reste à nu, et
aucune notion de proxy n'existe.

## Périmètre

**Inclus.** Support proxy pour **les deux moteurs** (Vector/httpx et Continuum/Playwright ;
HTTP/HTTPS/SOCKS5), rotation par run depuis un pool (+ gateway rotatif + sticky-session),
**prévention de la fuite WebRTC**, **cohérence géo** (timezone/locale/Accept-Language alignés sur
l'IP de sortie), et **impersonation TLS** (curl_cffi) pour Vector contre le fingerprinting JA3/JA4.
**Exclu.** La géolocalisation en ligne d'une IP (pas de base GeoIP embarquée : la géo vient d'un
indice de pays porté par la config du proxy) ; la rotation par requête / à la volée en cours de run
(le proxy est lié une fois par run dans les deux moteurs — voir Points de conception).

## Décision : une option `options.proxy` de premier niveau

Le proxy est une **option top-level** (`options.proxy`), pas un facet de `options.stealth` : c'est la
seule forme qui atteint **aussi** Vector, la couche stealth ne touchant aujourd'hui que le navigateur.
La cohérence géo relie ensuite l'IP de sortie au profil d'empreinte (Continuum). Un proxy peut être
fourni en clair, en `{{ secrets.x }}`, ou par un défaut/pool global.

## Interfaces et fichiers

Déjà en place (à implémenter) — module `network/` :

- [`network/proxy.py`](../../src/aetherius/network/proxy.py) — `ProxySpec`
  (`scheme`/`host`/`port`/`username`/`password`) + `parse_proxy(url)` ; `for_httpx()`,
  `for_playwright()`, `redacted()`.
- [`network/pool.py`](../../src/aetherius/network/pool.py) — `RotationStrategy`
  (`per_run`/`round_robin`/`random`/`sticky`) + `ProxyPool.select(key)`.
- [`network/geo.py`](../../src/aetherius/network/geo.py) — `GeoHint`
  (`country`/`timezone_id`/`locale`/`languages`) + `geo_hint(country)`.
- [`network/identity.py`](../../src/aetherius/network/identity.py) — `NetworkIdentity`
  (`proxy`, `geo`, `impersonate`) + `resolve_identity(options.proxy, run_key=…)`.
- [`network/transport.py`](../../src/aetherius/network/transport.py) — `httpx_proxy_kwargs(identity)`
  + `impersonation_available()`.
- [`stealth/fingerprint/webrtc.py`](../../src/aetherius/stealth/fingerprint/webrtc.py) —
  `WEBRTC_LAUNCH_FLAGS` (`--force-webrtc-ip-handling-policy=disable_non_proxied_udp`) +
  `webrtc_leak_patch()` (init script).

À faire (branchements) :

- **Option `options.proxy`** : la déclarer dans [`core/blueprint/models.py`](../../src/aetherius/core/blueprint/models.py)
  (`Options`, `extra="forbid"`) **et** dans [`contracts/blueprint.schema.json`](../../contracts/blueprint.schema.json)
  (`options`, `additionalProperties: false`) — une chaîne (URL/secret/nom de pool) ou un objet
  (`{ url|pool, rotate, geo, impersonate }`). Garder `tests/contracts/` vert.
- **Vector** : lire l'option/pool dans [`VectorDriver.setup`](../../src/aetherius/acts/vector/driver.py)
  et passer un `proxy=` à `VectorClient`, injecté dans `httpx.Client(...)`
  ([`vector/client.py:55`](../../src/aetherius/acts/vector/client.py#L55)). Impersonation TLS →
  transport `curl_cffi` (extra `[network]`, import paresseux, `DependencyError` clair si absent).
- **Continuum** : passer le proxy Playwright et `WEBRTC_LAUNCH_FLAGS` au lancement, appliquer
  `webrtc_leak_patch()` en init script, et dériver le profil d'empreinte pour coller à la géo dans
  [`continuum/browser.py`](../../src/aetherius/acts/continuum/browser.py) (proxy dans
  `_context_options`/launch `80-91`, scripts dans `_apply_stealth` `162-170`).
- **Défaut global** : proxy/pool par défaut dans [`config/settings.py`](../../src/aetherius/config/settings.py)
  (`AETHERIUS_PROXY_URL` / liste), pour router n'importe quel Blueprint sans l'éditer.
- **Secrets** : credentials via `{{ secrets.x }}` ou `ctx.secrets` (jamais stockés) —
  [`config/secrets.py`](../../src/aetherius/config/secrets.py).
- **Dépendances** : l'extra `[network]` (`socksio` + `curl_cffi`) est déjà déclaré dans
  `pyproject.toml` ; ajouter `curl_cffi.*` / `socksio.*` aux overrides `ignore_missing_imports` de
  mypy quand ils sont réellement importés.

## Points de conception

- **Le proxy est lié une fois par run.** httpx construit son client une fois (`client.py:55`) et
  Playwright fixe le proxy au lancement/contexte : la rotation **par run** est le mode propre par
  défaut. Une rotation par requête/à-la-volée exigerait de reconstruire le transport (ou relancer le
  contexte navigateur) en cours de run — hors périmètre initial, à documenter comme évolution.
- **Anti-fuite obligatoire avec un proxy navigateur.** Sans `WEBRTC_LAUNCH_FLAGS` + patch, Chromium
  révèle l'IP réelle par WebRTC : le proxy ne sert alors à rien. Les deux vont ensemble.
- **Cohérence géo.** La timezone est aujourd'hui une constante (`America/New_York`) : quand un proxy
  porte un indice de pays, dériver timezone/locale/Accept-Language cohérents (via `geo_hint`) et les
  appliquer au profil. Ne jamais présenter une IP FR avec une timezone US.
- **Impersonation TLS = Vector seulement.** Continuum a déjà un vrai TLS Chromium. `curl_cffi` couvre
  le cas Vector face à Cloudflare/Akamai (JA3/JA4) ; réservé à l'extra `[network]`.
- **Légèreté.** Proxy HTTP/HTTPS = zéro dépendance ; SOCKS5 et impersonation = extra optionnel,
  importé paresseusement. `import aetherius` reste léger.

## Plan de test

- Unitaires purs (CI de base) : `parse_proxy`/`ProxySpec` (rendu httpx + Playwright, redaction),
  `ProxyPool.select` par stratégie (round-robin déterministe, sticky par clé), `resolve_identity`
  (ordre option → défaut → aucun), `geo_hint`, `httpx_proxy_kwargs`.
- Intégration légère : un serveur proxy local factice reçoit bien le trafic Vector ; côté Continuum
  (marker `browser`), vérifier l'absence de fuite WebRTC (`webrtc_leak_patch` neutralise les
  candidats locaux) — skip propre sans l'extra `[browser]`.

## Exemple exécutable à livrer

Un Blueprint `examples/vector/` qui interroge un service d'écho d'IP (ex. `https://api.ipify.org` ou
`httpbin.org/ip`) **à travers un proxy** défini en `{{ secrets.proxy_url }}` (via `.env`), montrant
que l'IP vue est celle du proxy. `description` explicite (nécessite un proxy).

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-) ; doc `docs/network.md`
(option `options.proxy`, rotation, WebRTC, géo, impersonation, sécurité, limites) ; `make check`
vert ; un vrai run routé par un proxy vérifié à la main (IP de sortie confirmée, pas de fuite WebRTC
côté navigateur).

## Critères d'acceptation

Un run (Vector et Continuum) routé par un proxy sort bien avec l'IP du proxy ; la rotation par run
change d'IP d'un run à l'autre ; le navigateur ne fuit pas l'IP réelle (WebRTC) et présente une
timezone cohérente avec la géo ; l'impersonation TLS est disponible pour Vector avec l'extra
`[network]` ; les credentials ne sont jamais écrits dans le Blueprint.

## Dépendances

Indépendant de A–F. La rotation par run se marie au **scheduler (Jalon D)** pour le cas fil rouge
(surveiller un stock sans faire bloquer l'IP du schedule) ; la stickiness inter-run peut s'appuyer sur
le **store (Jalon A)**. Aucune de ces deux n'est bloquante pour livrer G en autonomie.
