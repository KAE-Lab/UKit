# 7-A — La bande passante

> **Spécification, ouverte le 2026-09-14, pas encore livrée.** Aucune publication : le jalon se joue sur
> le bucket et la base, et l'application 6.2.1 en profite sans mise à jour. Né de l'avertissement
> *Fair Use* de Supabase ([mise à plat](7-mise-a-plat.md)).

## La direction

L'egress en cache — ce que le CDN sert depuis le stockage — pesait **sept fois** l'egress de toute la
base. Les visuels sont servis en `no-cache`, à 400 ou 500 Ko l'unité, par un composant qui ne garde rien
sur disque : chaque ouverture de l'onglet Campus les redemande, chaque installation les retélécharge,
chaque remplacement (`?v=N`) les fait retélécharger à tout le parc.

Le Pro, souscrit le soir même, lève l'urgence du quota : 250 Go d'egress en cache au lieu de 5. Il ne
règle ni le forfait des étudiants, ni la vitesse. Et la 6.2.1, comme les versions d'avant, continuera de
demander les objets d'origine pendant des semaines, le temps que le parc se mette à jour : c'est donc
**sur les objets eux-mêmes** qu'il faut agir, avant même le code de [7-C](7-c-economie-et-socle.md).

## Ce qui a été mesuré le 2026-09-14

**Le tableau Usage de Supabase**, relevé par le propriétaire du produit sur la période de facturation en
cours :

| Mesure | Valeur | Quota du plan gratuit |
|---|---|---|
| Cached Egress | **10,041 Go** | 5 Go — 201 % |
| Egress | 1,371 Go | 5 Go — 27 % |
| Database Size | 0,028 Go | 0,5 Go |
| Storage Size | 0,001 Go | 1 Go — *valeur douteuse : les objets du bucket pèsent davantage* |
| Monthly Active Users | 7 | — *ce sont les comptes de la console, pas les étudiants* |
| Edge Function Invocations | 34 | — |

**Les objets servis**, en-têtes relevés par `curl -I`, c'est-à-dire en `HEAD` — lire la note sous le
tableau :

| Objet | Poids | `cache-control` | `cf-cache-status` |
|---|---|---|---|
| `media/restaurants/amazone.jpg` | 498 585 octets | `no-cache` | `REVALIDATED` |
| `media/annonces/ukit-v6.png?v=2` (un PNG) | 415 655 octets | `no-cache` | `MISS` |
| `media/annonces/campulsations-24-septembre.jpg` | 164 284 octets | `no-cache` | `REVALIDATED` |
| `blueprints/manifest.json` | 5 855 octets | `no-cache` | `MISS` — *voulu* ([backend.md](../backend.md#ce-quil-faut-savoir-avant-dêtre-surpris)) |

> **Relu en `GET` le 2026-09-15.** Une requête `HEAD` sur `/object/public/` répond **toujours**
> `no-cache`, avec `MISS` ou `REVALIDATED`, quel que soit l'objet : c'est un artefact de la méthode, pas un
> état de l'objet. En `GET` — ce que fait l'application —, ces mêmes objets sortent du cache du CDN
> (`HIT`) et gardent bien `cache-control: no-cache` : le constat tient pour eux. En revanche, un objet
> téléversé avec `cache-control: max-age=31536000` rend `public, max-age=31536000` en `GET`.

**Après la souscription du Pro, le soir même** :
`…/storage/v1/render/image/public/media/annonces/campulsations-24-septembre.jpg?width=640&quality=75`
répond `200`, `image/jpeg`, **124 104 octets**, `cache-control: max-age=31536000`, `MISS` puis **`HIT`**
au second appel ; la même adresse suivie de `&v=3` est acceptée à l'identique. L'objet d'origine, relu en
`GET` le 2026-09-15, rend `public, max-age=31536000` — il avait été téléversé avec cet en-tête le
2026-09-14 —, quand les objets plus anciens (`amazone.jpg`, `ukit-v6.png`, les logos, les bâtiments)
rendent `no-cache`, en `GET` aussi. Donc : **les transformations d'image et le Smart CDN sont actifs, le
CDN respecte la métadonnée de chaque objet, et ce sont les objets anciens qui portent `no-cache`.**

## Ce qui est à faire

1. **Relever le tableau Usage** : egress par service, en cache et hors cache. *Fait le 2026-09-14,
   ci-dessus* ; il se relève de nouveau à chaque étape.
2. **Vérifier le Pro.** *Transformations d'image et Smart CDN vérifiés le 2026-09-14.* Reste à constater
   les sauvegardes quotidiennes dans le tableau de bord du projet. À connaître : cent images d'origine
   transformées par mois sont incluses, puis cinq dollars les mille.
3. **Re-encoder le média existant.** Un script `tools/media/compresser.mjs`, avec `sharp` en dépendance de
   développement, ou le venv Python d'Aetherius, dont la recette est déjà mesurée : une affiche de
   1081 × 1351 à 437 Ko devient 864 × 1080, JPEG qualité 68, `optimize`, `progressive`, **160 Ko**, et le
   plus petit texte de la programmation reste net. Cibles : affiches à 1080 px sur le grand côté, photos
   de restaurant et de bâtiment à 1200 px, en WebP qualité 75, ou JPEG 72 si un appareil de test refuse
   le WebP. Le PNG « UKit fait peau neuve » devient un JPEG ou un WebP.
4. **Re-téléverser au même chemin, avec un `cache-control` d'un an** (`max-age=31536000`), puis bumper
   `?v=N` partout où l'adresse est écrite : `annonces.image_url`, `annonces.images`, `visuels.image_url`,
   `batiments.image_url`, selon la règle de remplacement existante
   ([campus-vie-etudiante.md](../features/campus-vie-etudiante.md#publier-une-annonce)). Storage n'expose
   pas de mise à jour des seules métadonnées : un objet qu'on ne re-encode pas se re-téléverse à octets
   identiques, avec son nouvel en-tête. **Cette passe suffit** : vérifié le 2026-09-15 en `GET`, un objet
   téléversé avec cet en-tête le rend et sort du cache du CDN, comme la miniature de l'annonce « Trois
   campus en route » et les affiches de Campulsations.
5. **Commencer le pipeline de téléversement de la console** : redimensionner et compresser dans le
   navigateur, calculer un `blurhash`, nommer l'objet `<dossier>/<identifiant court>-<slug>.webp`, un
   `cacheControl` d'un an au lieu de `'3600'` ([`televerser.ts:31`](../../console/src/lib/televerser.ts)).
   Il est **livré par [7-E](7-e-console-socle.md#le-téléversement)**, mais il se commence ici : sans lui,
   chaque visuel publié ensuite recrée le problème.
6. **Vérifier les six lectures publiées** du conteneur racine
   ([`rootContainer.tsx`](../../src/shared/navigation/rootContainer.tsx), au démarrage et au retour au
   premier plan) : poids des réponses et `content-encoding`, gzip attendu. Si `batiments` ou
   `etablissements` pèsent lourd, réduire les colonnes lues, jamais la fréquence : c'est la fréquence qui
   fait arriver une correction.
7. **Relever le tableau Usage une semaine après**, et l'écrire ici.

## Décisions et pièges

- **On mesure en `GET`** (`curl -s -o /dev/null -D -`), **jamais en `HEAD`**, qui répond toujours
  `no-cache` : la conclusion inverse, tirée le 2026-09-14, venait de là.
- **Le même chemin, pas un nouveau nom.** Les adresses que le parc installé connaît restent valides, et le
  `?v=N` bumpé force leur relecture une seule fois.
- **Un objet ancien se re-téléverse** : Storage ne modifie pas une métadonnée seule.
- **La livraison se constate une semaine après la passe**, au second relevé du tableau Usage. Cette
  attente ne retient pas l'ouverture du jalon suivant : il n'y a plus rien à faire, seulement à relever.

## Dépendances

Aucune. Le Pro est souscrit depuis le 2026-09-14.

## Définition de « terminé »

- Un objet re-téléversé répond, en `GET`, `public, max-age=31536000`, et `HIT` au second appel.
- L'application 6.2.1 affiche toujours tous les visuels, adresses bumpées, sur les deux appareils.
- L'egress en cache quotidien baisse dans le tableau Usage, relevé une semaine après.
- Cette spécification porte les deux relevés, et le README de la phase la ligne « livré ».

## Plan de test

1. `curl -s -o /dev/null -D -` deux fois sur trois objets re-téléversés : `cache-control` d'un an, `MISS`
   puis `HIT`.
2. Sur l'iPhone 13 Pro et le Galaxy A8, en 6.2.1 : l'onglet Campus, la fiche d'un restaurant, une annonce
   avec sa galerie ; aucun visuel manquant, aucun visuel ancien.
3. Un objet sans ligne qui le cite, s'il en reste, relu en `GET` : il garde `no-cache`, et la passe n'en a
   pas oublié d'autre.
4. Le poids et le `content-encoding` des six lectures publiées, relevés et écrits ici.
5. Le tableau Usage, relevé avant et une semaine après, sur une période comparable.

## Limites écrites

- **Ce qui se téléverse à la main avant [7-E](7-e-console-socle.md)** doit l'être avec l'en-tête d'un an,
  sinon il recrée le problème.
- **Le parc installé relit une fois les adresses bumpées** : la baisse de l'egress se lit après ce pic.
- **Le Pro reste une marge, pas une solution** : sans le cache disque de [7-C](7-c-economie-et-socle.md),
  chaque nouvelle installation retélécharge tout.
