# 7-M — Le site

> **Cadre, pas encore spécification.** Aucune publication de l'application : dépôt `UKit-website`, publié
> par Cloudflare Pages à chaque poussée sur `main`. Décidé le 2026-09-14 ([mise à
> plat](7-mise-a-plat.md)) : le site `ukit-bordeaux.fr` se refond **après
> [7-I](7-i-releve-et-vocabulaire.md)**, quand la direction artistique de l'application est fixée, et
> devient l'endroit que l'application ouvre pour ce qui n'a pas sa place dans un binaire.

> **Amendé le 2026-09-24 : la refonte part de l'Épure** ([identite.md](../identite.md)), l'identité née le
> 2026-09-23 pour les slides de Disrupt Campus, que le site porte à l'intensité « forte ». Elle interroge
> trois points de la direction ci-dessous, qui se tranchent à l'ouverture avec [7-I](7-i-releve-et-vocabulaire.md) :
> la police (Geist dans l'Épure, celle du système ici), les formes (des cercles dans l'Épure, des carrés
> arrondis ici) et le thème (l'Épure n'existe qu'en sombre).

> **Refonte publiée le 2026-11-18, et l'amendement du 2026-09-24 retiré : le site ne part pas de
> l'Épure, il prend le style de l'application.** Ce qui a été fait, ce qui s'écarte du cadre ci-dessous
> et ce qui reste : [la refonte](#la-refonte-publiée-le-2026-11-18).

## La refonte, publiée le 2026-11-18

Faite du 16 au 18 novembre sur le dépôt `UKit-website`, publiée par la poussée sur `main` du 18
(`88517e9`). Elle a commencé sur l'Épure (`568ef74`) et l'a quittée le jour même pour le style de
l'application (`9422475`) ; le propriétaire du produit a confirmé ce choix le 2026-11-24. La règle
qu'en tire le site, ses valeurs et sa façon de prendre les captures sont dans son
[README](https://github.com/KAE-Lab/UKit-website#le-style--celui-de-lapplication) ; ce document ne les
répète pas.

**Ce que la refonte a fait** : l'accueil devient la fiche produit de l'application, un module par
onglet relevé sur la 6.3.1 au banc ; les mentions légales (l'association KAE Lab comme éditeur) ; la
confidentialité du site ; une page introuvable. Tailwind et les particules sortent, le CSS s'écrit à la
main.

**Où elle s'écarte du cadre**, chaque fois au profit de l'application :

| Le cadre ci-dessous | Le site publié | Pourquoi |
|---|---|---|
| la direction de l'Épure, à l'intensité « forte » ([identite.md](../identite.md#les-intensités)) | le premier écran de l'accueil de l'application ([`VitrineDAccueil.tsx`](../../src/features/Onboarding/components/VitrineDAccueil.tsx)), ses cartes, ses icônes au trait | une personne qui passe du site à l'application ne change pas d'univers ; c'est la direction du cadre, sans l'Épure entre les deux |
| les deux thèmes | **sombre seulement**, sur les valeurs du thème sombre de l'application | aucune raison écrite à la refonte ; l'accueil de l'application tient les deux thèmes, et un thème clair du site reste à décider |
| Geist pour le site | la police du système | celle de l'application, sans police à télécharger |
| Vite et Tailwind ; tsParticles à rejuger | Vite et du CSS écrit à la main ; plus de particules | quelques pages ne justifient pas Tailwind, et un fond qui s'anime ne dit pas ce que dit l'application |
| des captures par Playwright | les captures de l'application prises au banc Android à la géométrie de l'iPhone 13 Pro | le site montre l'application, pas lui-même |
| une confidentialité générée depuis `PRIVACY.md` | une page écrite pour le site seul, qui renvoie à `PRIVACY.md` pour l'application | le site ne garde rien ; la page générée reste à faire, ci-dessous |

**Ce qui reste**, et que la 6.4 attend ([7-L](7-l-la-boucle.md)) : la page d'une annonce `/a/<id>` et sa
fonction, les deux fichiers des liens universels, les pages Aide, Nouveautés (générée depuis
`CHANGELOG.md`), Soutenir ([7-N](7-n-le-soutien.md)) et Merci, et la confidentialité générée depuis
`PRIVACY.md`. Leur conception, plus bas, tient toujours ; seule leur apparence suit désormais le site
publié.

## L'écart mesuré le 2026-09-15

Le site est soigné, et il ne parle pas la langue de l'application. Relevé dans le dépôt `UKit-website` :

| | Le site | L'application ([theme.md](../theme.md)) |
|---|---|---|
| Formes | `rounded-full` à huit endroits — boutons, badges, pilules | des carrés arrondis ; `radius.pill` réservé aux pastilles et aux compteurs |
| Couleur | deux tokens, `#007AFF` et `#5E5CE6`, et quatre dégradés de l'un à l'autre | la palette système d'Apple, sans dégradé de marque |
| Thème | clair seulement, aucune variante sombre | clair et sombre, à égalité |
| Police | la pile par défaut de Tailwind | celle du système, une seule |
| Confidentialité | aucune page : un lien vers `PRIVACY.md` sur GitHub | — |
| Fond | des particules animées (tsParticles) | aucun fond aujourd'hui ; des fonds statiques pré-rendus par écran en 6.3 |

## La direction

**Le site parle comme l'application** : ses tokens, ses carrés arrondis, sa police système, ses deux
thèmes, et le fond statique que la 6.3 aura choisi. Une personne qui passe de l'un à l'autre ne doit pas
changer d'univers. Et **le site porte ce qu'un binaire ne doit pas porter** : ce qui change sans release,
ce qui se lit hors de l'application, et ce que les stores imposent de tenir dehors.

## Les pages

| Page | Adresse | Source | Ouverte depuis l'application |
|---|---|---|---|
| Accueil | `/` | le site | — |
| Télécharger | `/download.html` | le site | — |
| Engagement | `/engagement.html` | le site ; citée par le formulaire, **son adresse ne change pas** | depuis le formulaire |
| **Confidentialité** | `/confidentialite` | **générée** depuis `PRIVACY.md` du dépôt de l'application | oui, par `services.confidentialite` |
| **Soutenir** | `/soutenir` | le site et HelloAsso ([7-N](7-n-le-soutien.md)) | oui, **dans le navigateur du système** |
| **Merci** | `/merci` | les crédits : contributeurs, volontaires de campus, donateurs qui l'ont accepté | — |
| **Aide** | `/aide` | le site | oui, par `services.aide` |
| **Nouveautés** | `/nouveautes` | **générée** depuis `CHANGELOG.md` | oui, par `services.nouveautes` |
| **Une annonce** | `/a/<id>` | une fonction de Cloudflare Pages, qui lit la base | par le partage ([7-L](7-l-la-boucle.md#le-partage-dune-annonce)) |

### Une seule source pour la confidentialité et les nouveautés

`PRIVACY.md` et `CHANGELOG.md` vivent dans le dépôt de l'application : c'est là qu'ils se relisent et se
versionnent avec le code. Le site les **lit à la construction**, depuis la branche `main` du dépôt public,
et les rend en HTML ; **une lecture qui échoue fait échouer la construction**, plutôt que de publier une
page vide. Une modification de l'un des deux sur `main` déclenche la reconstruction du site par un
*deploy hook* de Cloudflare Pages, appelé par un workflow du dépôt de l'application. Recopier le texte à
la main créerait deux politiques de confidentialité, dont une finirait fausse.

### La page d'une annonce

L'aperçu d'un lien dans une conversation — WhatsApp, Instagram, Messenger — se construit à partir des
balises **Open Graph** de la page, lues par un robot qui n'exécute pas de JavaScript. Une page statique
qui chargerait l'annonce dans le navigateur n'aurait donc **aucun aperçu**, et c'est l'aperçu qui fait
circuler une affiche.

`/a/<id>` est donc une **fonction de Cloudflare Pages** : elle lit l'annonce publiée avec la clé
publiable — la politique de lecture cache déjà l'inactif, l'expiré, le brouillon et le programmé —, pose
le titre, l'accroche et le visuel dans les balises, met la réponse en cache quelques minutes, et rend une
page qui propose « Ouvrir dans UKit » ou « Télécharger UKit ». Une annonce introuvable rend une page
« cette annonce n'est plus en ligne », pas une erreur.

### Les liens universels

- `/.well-known/apple-app-site-association` : du JSON **sans extension**, servi en `application/json` par
  le fichier `_headers` de Cloudflare Pages, qui associe les chemins `/a/*` à l'application iOS
  `com.bordeaux.ukit` ; l'identifiant d'équipe Apple se relève dans le compte développeur.
- `/.well-known/assetlinks.json` : le paquet Android `com.bordeaux1.emplois` et l'**empreinte SHA-256 de la
  clé de signature de Google Play**, celle que montre la console Play, pas celle d'un build local.
- Côté application, en [7-L](7-l-la-boucle.md) : `associatedDomains` et le filtre d'intention
  vérifié, dans `app.config.ts`.

## La technique

- **Vite et Tailwind restent** : quelques pages de plus ne justifient pas un framework. Tailwind reçoit
  les tokens de l'application en variables, et les utilitaires de forme ronde sortent du vocabulaire du
  site.
- **Les fonctions de Cloudflare Pages** servent la page d'annonce, et rien d'autre.
- **tsParticles se rejuge à la refonte**, face aux fonds statiques de l'application : un fond qui s'anime
  au chargement ne dit pas la même chose qu'un fond posé.
- **Les captures** se font par Playwright, bureau et téléphone, dans les deux thèmes, comme le 2026-09-07.

## Dépendances

- **[7-I](7-i-releve-et-vocabulaire.md)**, pour la direction artistique.
- [7-N](7-n-le-soutien.md), pour la page Soutenir.
- **[7-L](7-l-la-boucle.md)**, côté application, pour ouvrir les pages et suivre les liens universels.

## Limites écrites

- **Le site est public, la console ne l'est pas** : aucune page du site ne lit autre chose que ce que la
  clé publiable laisse lire.
- **Une page générée depuis le dépôt de l'application** n'est à jour qu'à la construction suivante du
  site.
