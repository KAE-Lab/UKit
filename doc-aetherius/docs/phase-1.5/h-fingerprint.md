# Jalon H — Durcissement de l'empreinte

**Statut : livré.** [`hardening.py`](../../src/aetherius/stealth/fingerprint/hardening.py) durcit
Canvas/Audio/polices/UA-CH/écran/WebGL2 (init script injecté après le profil dans Continuum) et
[`headers.py`](../../src/aetherius/stealth/fingerprint/headers.py) donne à Vector une identité
d'en-têtes par défaut ; le tout dérivé du `FingerprintProfile` actif. Documentation de référence :
[docs/stealth.md](../stealth.md). Ce document conserve la spécification d'origine (objectif, périmètre,
décisions de conception) pour la traçabilité.

## Objectif

Fermer les trous d'empreinte que le profil actuel laisse à découvert, pour tenir face aux systèmes
anti-bot qui recoupent plusieurs signaux. Le profil `chrome-desktop` couvre déjà
UA/viewport/locale/timezone/platform/cœurs/mémoire/WebGL1/languages ; il reste des signaux à forte
valeur non masqués.

## Périmètre

**Inclus (non couverts aujourd'hui) :** Canvas et AudioContext (bruit stable par profil), énumération
des polices, client hints (`Sec-CH-UA` / `navigator.userAgentData`) alignés sur l'UA,
dimensions d'écran / `devicePixelRatio`, WebGL2 ; et **une identité d'en-têtes HTTP pour Vector**
(qui n'a aucun traitement stealth aujourd'hui).
**Exclu / déjà ailleurs :** WebRTC et API Geolocation sont dans le **Jalon G** (indispensables au
proxy) ; l'échantillonnage d'empreintes par ML reste une évolution future (stub
`stealth/ml/fingerprint_model.py`).

## Interfaces et fichiers

Déjà en place (à implémenter) :

- [`stealth/fingerprint/hardening.py`](../../src/aetherius/stealth/fingerprint/hardening.py) —
  `hardening_init_script(profile)` : l'init script combiné (Canvas/Audio/polices/UA-CH/écran/WebGL2),
  cohérent avec le `FingerprintProfile` actif.
- [`stealth/fingerprint/headers.py`](../../src/aetherius/stealth/fingerprint/headers.py) —
  `http_headers(profile)` : en-têtes par défaut (UA, client hints, Accept-Language) pour Vector.

À faire (branchements) :

- **Continuum** : injecter `hardening_init_script(profile)` dans
  [`browser.py::_apply_stealth`](../../src/aetherius/acts/continuum/browser.py) **après** le profil
  (`init_script()`), pour que les patches restent cohérents avec l'identité de base.
- **Vector** : appliquer `http_headers(profile)` comme en-têtes par défaut dans le driver/client
  ([`vector/driver.py`](../../src/aetherius/acts/vector/driver.py),
  [`vector/client.py`](../../src/aetherius/acts/vector/client.py)) — sans écraser les en-têtes
  explicites du Blueprint. Ceci implique de faire enfin lire `options.stealth` (ou une forme réduite)
  par Vector, ou d'exposer un profil par défaut.
- **Profil** : enrichir [`FingerprintProfile`](../../src/aetherius/stealth/fingerprint/profile.py)
  (champs manquants : WebGL2, `screen`/`devicePixelRatio`, `Sec-CH-UA`) et **lever la limite « UA-CH
  drift »** documentée en tête du module (`profile.py:9-11`).

## Points de conception

- **Cohérence avant tout.** Un signal masqué mais incohérent (canvas parfaitement propre, UA-CH qui
  contredit l'UA) est un tell **pire** que l'absence de masque. Chaque override est dérivé du profil,
  pas ajouté au hasard — le principe déjà énoncé dans `profile.py`.
- **Bruit stable, pas aléatoire à chaque appel.** Canvas/Audio doivent renvoyer un bruit **déterministe
  par profil/session** : un fingerprint qui change à chaque lecture est lui-même détectable.
- **UA-CH = le gros morceau.** `Sec-CH-UA`, `Sec-CH-UA-Platform`, `navigator.userAgentData` doivent
  s'accorder avec l'UA hérité — c'est la faille explicitement notée aujourd'hui.
- **Vector gagne une identité.** Donner un UA + client hints par défaut à Vector supprime la signature
  « client HTTP nu », sans casser les Blueprints qui fixent déjà leurs en-têtes.

## Plan de test

- Unitaires : `hardening_init_script(profile)` produit un JS cohérent avec le profil (valeurs
  d'écran/WebGL2 dérivées du profil) ; `http_headers(profile)` renvoie UA + `Sec-CH-UA` +
  `Accept-Language` accordés.
- Intégration (marker `browser`) : sur une page de test, canvas/audio renvoient un bruit **stable**
  entre deux lectures du même run ; `navigator.userAgentData` s'accorde avec l'UA. Skip propre sans
  l'extra `[browser]`.

## Exemple exécutable à livrer

Un Blueprint `examples/continuum/` qui ouvre une page de test d'empreinte (ou un endpoint qui renvoie
les en-têtes/`navigator.userAgentData`) et **extrait** les signaux, démontrant qu'ils sont cohérents ;
et un exemple `examples/vector/` montrant les en-têtes par défaut appliqués. Zéro configuration si
possible (endpoint public), sinon `description` explicite.

## Définition de terminé

Les 6 points de [CONTRIBUTING](../../CONTRIBUTING.md#définition-de--terminé-) ; doc `docs/stealth.md`
complétée (nouveaux signaux, cohérence, limites restantes) ; `make check` vert ; un run passé au
crible d'un testeur d'empreinte à la main (canvas/audio/UA-CH cohérents, pas de régression sur les
runs sans stealth).

## Critères d'acceptation

Canvas, AudioContext, polices, UA-CH, dimensions d'écran et WebGL2 sont masqués **de façon cohérente**
avec le profil ; Vector envoie des en-têtes crédibles par défaut ; la limite « UA-CH drift » de
`profile.py` est levée ; aucune régression quand `stealth` est `off`.

## Dépendances

Indépendant de A–F. Complète le **Jalon G** (WebRTC/géo y sont déjà) ; ordre conseillé : G puis H.
