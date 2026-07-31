# Identité réseau (proxy)

**Statut : implémenté et branché dans les deux moteurs (Vector et Continuum).** Couche transverse,
orthogonale aux Acts, activée par `options.proxy` dans le Blueprint. No-op par défaut (aucun proxy),
donc le comportement historique est strictement inchangé quand elle n'est pas demandée. Là où la
[discrétion (stealth)](stealth.md) masque l'empreinte **navigateur**, cette couche rend le bot
invisible **au niveau réseau** : elle route le trafic par un proxy, fait tourner l'IP de sortie,
empêche la fuite WebRTC de l'IP réelle, aligne la géographie de l'empreinte sur l'IP de sortie, et —
pour Vector — peut imiter la poignée de main TLS d'un vrai navigateur (JA3/JA4).

Décodée par [`network/`](../src/aetherius/network/) (`resolve_identity`) et injectée dans les deux
drivers : [`VectorDriver`](../src/aetherius/acts/vector/driver.py) (httpx / curl_cffi) et
[`BrowserSession`](../src/aetherius/acts/continuum/browser.py) (Playwright).

## Pourquoi une option de premier niveau

Le proxy est une option **top-level** (`options.proxy`), pas un facet de `options.stealth` : c'est la
seule forme qui atteint **aussi** Vector, la couche stealth ne touchant que le navigateur. La cohérence
géo relie ensuite l'IP de sortie au profil d'empreinte (Continuum). Les identifiants du proxy ne sont
**jamais** écrits dans le Blueprint : on les passe par `{{ secrets.x }}` (voir [secrets](secrets.md)).

## Activation

Deux formes, validées par le schéma ([`contracts/blueprint.schema.json`](../contracts/blueprint.schema.json)) :

```json
"options": { "proxy": "http://user:pass@host:8080" }        // chaine : une URL de proxy
"options": { "proxy": "{{ secrets.proxy_url }}" }            // ... rendue depuis un secret (recommande)
"options": { "proxy": {                                      // objet : controle fin
  "url": "{{ secrets.proxy_url }}",     // proxy unique (ou gateway rotatif)
  "pool": ["socks5://a:1080", "socks5://b:1080"],   // ... ou une liste a faire tourner (exclusif de url)
  "rotate": "per_run",                  // "per_run" | "round_robin" | "random" | "sticky"
  "geo": "FR",                          // pays de l'IP de sortie (ISO 3166-1 alpha-2)
  "impersonate": "chrome"               // impersonation TLS Vector (JA3/JA4) ; true = chrome
} }
```

Schémas d'URL supportés : `http`, `https`, `socks5` (`scheme://[user:pass@]host:port`, port
obligatoire). Une forme invalide (schéma inconnu, port manquant, clé inconnue, pays hors table) échoue
à la résolution avec une `BlueprintValidationError` claire — jamais de dégradation silencieuse.

### Défaut global (sans éditer le Blueprint)

Pour router n'importe quel Blueprint sans le modifier, définir un défaut d'environnement (préfixe
`AETHERIUS_`, voir [`config/settings.py`](../src/aetherius/config/settings.py)) :

```bash
export AETHERIUS_PROXY_URL="http://user:pass@host:8080"
# ou un pool (liste JSON) + une strategie :
export AETHERIUS_PROXY_POOL='["socks5://a:1080","socks5://b:1080"]'
export AETHERIUS_PROXY_ROTATE="sticky"
```

`options.proxy` du Blueprint l'emporte toujours sur le défaut d'environnement.

## Rotation de l'IP

Le proxy est **lié une fois par run** : httpx construit son client une fois et Playwright fixe le
proxy au lancement du contexte. La rotation joue donc **d'un run à l'autre**, pas en cours de run.

| Stratégie | Comportement | Persistance |
|-----------|--------------|-------------|
| `per_run` (défaut) | Un tirage aléatoire à chaque run (l'IP change d'un run à l'autre pour un pool > 1). | Aucune |
| `random` | Idem, explicite. | Aucune |
| `round_robin` | Parcours cyclique du pool au sein d'un même processus. | Curseur en mémoire |
| `sticky` | Même proxy pour une clé donnée (hash stable) : un Blueprint voit toujours la même IP. | Aucune (déterministe) |

La clé de stickiness (`run_key`) est aujourd'hui le **nom du Blueprint** : une finesse par-schedule
s'appuiera sur le [store (Jalon A)](store.md) et la rotation séquentielle inter-run persistée est une
évolution documentée. Un **gateway rotatif** (le fournisseur change l'IP derrière une seule URL) est
simplement un pool d'un seul élément : la rotation est alors côté fournisseur.

## Anti-fuite WebRTC (Continuum)

Même derrière un proxy, Chromium peut révéler l'IP locale/publique réelle par les candidats ICE
WebRTC — ce qui **annulerait** le proxy. Dès qu'un proxy est actif, `BrowserSession` applique donc
**deux** leviers ensemble (voir [`stealth/fingerprint/webrtc.py`](../src/aetherius/stealth/fingerprint/webrtc.py)) :

1. un **flag de lancement** Chromium (`--force-webrtc-ip-handling-policy=disable_non_proxied_udp`) qui
   interdit l'UDP non-proxifié ;
2. un **init-script** qui enveloppe `RTCPeerConnection` pour filtrer les candidats `typ host` /
   `typ srflx` / mDNS `.local` avant que les scripts de page ne les lisent.

Cette protection est indépendante de `options.stealth` : elle s'active avec le proxy, pas avec la
discrétion.

## Cohérence géo (Continuum)

Une IP de sortie française présentée avec une timezone `America/New_York` est un signal flagrant.
Quand `options.proxy.geo` porte un code pays, `geo_hint(country)`
([`network/geo.py`](../src/aetherius/network/geo.py)) fournit timezone / locale / langues cohérentes,
et le profil d'empreinte est dérivé pour coller (les champs correspondants du profil sont écrasés) :

- avec un profil d'empreinte actif (`options.stealth.fingerprint`), timezone, locale **et**
  `navigator.languages` suivent la géo ;
- sans profil d'empreinte, la timezone et la locale du contexte Playwright sont tout de même alignées
  sur le pays.

La table de pays est **curée** (une quinzaine d'entrées), pas issue d'une base GeoIP en ligne (hors
périmètre) : le pays vient de la configuration du proxy. Un pays hors table échoue clairement.

## Impersonation TLS (Vector)

La poignée de main TLS de httpx a une empreinte (JA3/JA4) reconnaissable ; face à Cloudflare/Akamai,
cela suffit parfois à faire bloquer une requête. `options.proxy.impersonate` bascule Vector sur un
transport [`curl_cffi`](../src/aetherius/acts/vector/impersonate.py) qui rejoue le ClientHello d'un
vrai navigateur. Réservé à **Vector** : Continuum a déjà un vrai TLS Chromium.

L'impersonation vit dans l'extra optionnel `[network]` (`pip install "aetherius[network]"`) et est
importée paresseusement ; sans elle, la demander lève une `DependencyError` claire. Le SOCKS5 côté
httpx (Vector sans impersonation) exige le même extra (`socksio`) ; côté curl_cffi et Playwright, le
SOCKS5 est intégré.

## Sécurité

- **Aucun identifiant dans le Blueprint.** Toujours passer le proxy par `{{ secrets.x }}` (ou le
  défaut d'environnement). Les journaux n'affichent qu'une forme masquée (`ProxySpec.redacted()`).
- **Le proxy sans anti-fuite WebRTC ne protège pas.** Les deux sont liés côté navigateur, par
  conception.
- **Ne jamais présenter une géo incohérente.** Renseigner `geo` quand l'IP de sortie a un pays connu.

## Limites connues

- Rotation **par run** uniquement (pas en cours de run) ; une rotation à la volée demanderait de
  reconstruire le transport (ou relancer le contexte navigateur).
- Stickiness **par Blueprint** (pas encore par-schedule) et `round_robin` **en mémoire** (pas de
  séquence inter-run persistée) — tant que le store ne porte pas l'état de rotation.
- Pas de **registre de pools nommés** : un pool s'exprime inline (`pool: [...]`) ou via le défaut
  d'environnement.
- Le chemin **impersonation** n'applique pas la stratégie d'auth pluggable de Vector (non câblée
  depuis les Blueprints aujourd'hui) ; utiliser des en-têtes explicites si besoin.
- **SOCKS5 avec authentification** n'est pas supporté côté Playwright (limitation Playwright) ; il
  l'est côté Vector.
- **Vérification bout-en-bout encore à jouer (À FAIRE).** Le mécanisme est couvert par les tests
  unitaires, mais le run réel avec un vrai proxy (routage, absence de fuite WebRTC, cohérence géo,
  impersonation TLS) n'a pas encore été fait faute de proxy. À réaliser avant de s'appuyer sur cette
  couche sur une cible réelle — checklist ci-dessous (« Tester l'identité réseau »).

## Tester l'identité réseau

Les tests unitaires (`tests/unit/network/`, `tests/unit/stealth/fingerprint/test_webrtc.py`) couvrent
le parsing, la rotation, la géo, la résolution d'identité, la garde SOCKS5 et le patch WebRTC sans
aucune I/O. La vérification de bout en bout demande un **vrai proxy**, à faire à la main :

1. Renseigner `.env` : `AETHERIUS_SECRET_PROXY_URL="http://user:pass@host:port"` (voir
   [secrets](secrets.md)).
2. Vector : `aetherius run examples/vector/ip-echo-proxy.blueprint.json` — la sortie `exit_ip` doit
   être l'IP du proxy, pas la réelle.
3. Continuum : un Blueprint navigateur avec `options.proxy` + `options.stealth` sur un service de
   diagnostic (par ex. browserleaks) — l'IP de sortie est celle du proxy, **aucune** fuite WebRTC de
   l'IP réelle, et la timezone est cohérente avec `geo`.
4. Rotation : deux runs d'un Blueprint avec un `pool` — l'IP diffère d'un run à l'autre.
5. Impersonation : `pip install "aetherius[network]"`, puis un run Vector avec `impersonate: "chrome"`
   sort avec un JA3/JA4 de Chrome ; sans l'extra, la demande lève une `DependencyError`.
