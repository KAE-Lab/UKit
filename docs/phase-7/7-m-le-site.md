# 7-M — Le site

> **Cadre, pas encore spécification.** Aucune publication de l'application : dépôt `UKit-website`, publié
> par Cloudflare Pages à chaque poussée sur `main`. Décidé le 2026-09-14 ([mise à
> plat](7-mise-a-plat.md)) : le site `ukit-bordeaux.fr` se refond **après
> [7-I](7-i-releve-et-vocabulaire.md)**, quand la direction artistique de l'application est fixée, et
> devient l'endroit que l'application ouvre pour ce qui n'a pas sa place dans un binaire.

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
