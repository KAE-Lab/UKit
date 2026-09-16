# 7-H — Les rôles et l'équipe

> **Spécification, ouverte le 2026-09-14, pas encore livrée.** Aucune publication. Le dernier des quatre
> jalons de la console, sur le socle de [7-E](7-e-console-socle.md) : ouvrir la console à une équipe sans
> lui donner les clés de la production. Il se livre avant l'arrivée de l'équipe, en janvier 2027 ; la
> donnée — `editeurs.role` et `editeurs.etablissements` — est posée dès
> [7-C](7-c-economie-et-socle.md#6-les-colonnes-additives).

## La direction

Aujourd'hui, un compte est éditeur ou ne l'est pas, et un éditeur peut tout : publier un incident à tout
le parc, retirer un établissement, notifier. C'est juste pour une personne. Pour une équipe — quelqu'un
qui publie les annonces d'un BDE, un relais par campus, quelqu'un qui prépare un dossier de subvention et
ne doit rien casser —, il faut dire **qui peut quoi, et où**, dans la base elle-même, là où la console ne
peut pas se tromper.

## Les rôles

| Rôle | Peut | Ne peut pas |
|---|---|---|
| **admin** | tout ce que la console permet aujourd'hui : messages de service et notification, établissements, bâtiments, visuels, testeurs, version publiée, retours avec leur contact, et les éditeurs eux-mêmes | — |
| **redacteur** | créer, modifier, programmer et archiver les **annonces** des campus qui lui sont confiés ; téléverser leurs visuels ; lire les statistiques, et les retours sans leur contact | publier un message de service, notifier, toucher au catalogue, aux bâtiments, aux visuels des sources, aux testeurs, aux éditeurs |
| **lecteur** | lire les statistiques, les annonces, les sources et le rapport partenaire | écrire quoi que ce soit |

**Un rédacteur borné à des campus** (`editeurs.etablissements` non nul) ne publie que des annonces dont
**tous** les établissements ciblés sont les siens ; une annonce ciblée « tous les campus »
(`etablissements` nul) reste le fait d'un admin ou d'un rédacteur sans borne.

## Ce qui est à faire

### Les politiques

- `private.role_editeur()` rend le rôle du compte connecté, ou rien ; `private.est_editeur()` reste vrai
  pour les trois rôles, parce que la lecture leur est commune.
- `private.peut_publier(etablissements text[])` : vrai pour un admin ; pour un rédacteur, vrai si sa
  borne est nulle, ou si la liste ciblée est non nulle et incluse dans sa borne.
- Les politiques d'écriture se réécrivent table par table : `annonces` par `peut_publier` en `using`
  **et** en `with check` — l'ancienne ligne comme la nouvelle, sans quoi un rédacteur pourrait déplacer
  une annonce d'un campus qui n'est pas le sien vers le sien —, tout le reste réservé à l'admin ; le
  bucket `media` ouvert à l'admin et au rédacteur.
- **Le contact d'un retour devient réservé à l'admin.** Un privilège de colonne ne distingue pas deux
  rôles applicatifs qui partagent le rôle `authenticated` de la base : `select (contact)` lui est donc
  **révoqué**, et une fonction `contact_du_retour(id)`, `security definer`, ne rend l'adresse qu'à un
  admin. [PRIVACY.md](../../PRIVACY.md) promet que l'adresse « n'est transmise à personne » ; une équipe
  qui grandit rend la promesse plus exigeante, pas moins.
- Le journal garde `par` : chaque écriture reste attribuée à son compte.

### L'invitation, sans script

Aujourd'hui, un compte se crée depuis le poste du publieur, avec la clé de service
([`tools/console/editeur.mjs`](../../tools/console/editeur.mjs)). Une fonction de la base, `editeurs`,
appelée par un admin depuis une page « Équipe » :

- crée le compte et sa ligne dans `editeurs`, avec son rôle et sa borne ;
- **l'invitation par courriel demande un serveur d'envoi à nous** : l'envoi fourni par défaut par
  Supabase est limité et fait pour les essais. Tant qu'il n'est pas configuré — une adresse de
  l'association fera l'affaire —, la fonction crée le compte avec **un mot de passe temporaire**, que
  l'admin transmet de vive voix, et la console **exige de le changer** à la première connexion ;
- change un rôle ou une borne, ou **révoque** : la ligne d'`editeurs` supprimée, les écritures sont
  refusées à la requête suivante.

Le script reste, pour réparer un compte admin depuis le poste.

### Le verrou contre l'écrasement

« Le dernier enregistrement gagne » ([pilotage.md](../pilotage.md#limites-connues)) tient pour un
éditeur, pas pour deux qui ouvrent la même annonce. `annonces` et `service_messages` gagnent une colonne
`maj_le`, tenue par un déclencheur ; la console enregistre avec `update … where maj_le = <la valeur
lue>`, et une modification qui ne touche aucune ligne se dit : « modifiée entre-temps par quelqu'un
d'autre », avec le choix de recharger. *Décidé à la rédaction de cette spécification* : c'est le plus
petit mécanisme qui rend la console sûre à plusieurs.

### La documentation pour l'équipe

[pilotage.md](../pilotage.md) est réécrit pour ceux qui publient sans être développeurs : qui peut quoi ;
publier et programmer une annonce ; la vérifier sur son téléphone en audience `testeurs` ; lire ses
chiffres ; et ce qui ne se fait jamais — supprimer au lieu d'archiver, partager une capture de retour qui
montre une adresse.

## Décisions et pièges

- **Les rôles vivent dans la base, pas dans la console.** Masquer un bouton ne protège rien : la clé
  publiable est publique, et une requête faite à la main passe outre l'interface. Seule la politique
  décide ; la console ne fait que refléter.
- **Un rédacteur borné face à une annonce « tous campus »** : la règle d'inclusion refuse, et c'est
  voulu — publier à tout le parc est un geste d'admin.
- **Le serveur d'envoi de courriels** est un prérequis de l'invitation par lien ; le mot de passe
  temporaire n'est qu'un repli.
- **Une préproduction** — les branches de base du plan Pro — devient raisonnable quand d'autres que le
  propriétaire du produit publient ; elle s'évalue à l'ouverture de ce jalon
  ([ce qui n'est pas dans la phase](README.md#ce-qui-nest-pas-dans-la-phase)).

## Dépendances

[7-E](7-e-console-socle.md), [7-F](7-f-console-annonces.md) ; les colonnes de
[7-C](7-c-economie-et-socle.md#6-les-colonnes-additives) ; et il doit être prêt avant l'arrivée de
l'équipe, en janvier 2027.

## Plan de test

Trois comptes jetables — un admin, un rédacteur borné à `bordeaux`, un lecteur —, joués **par l'API**
avec la clé publiable, pas seulement dans la console :

1. le rédacteur crée une annonce ciblée `{bordeaux}` : acceptée ; ciblée `{bordeaux-inp}` : refusée
   (42501) ; « tous campus » : refusée ;
2. le rédacteur modifie une annonce `{bordeaux-inp}` créée par l'admin : refusé ; il tente d'en changer
   la cible vers `{bordeaux}` : refusé ;
3. le rédacteur publie un message de service : refusé ; le lecteur écrit n'importe où : refusé ;
4. le rédacteur lit un retour : oui, sans `contact` ; l'admin appelle `contact_du_retour` : l'adresse ;
5. deux onglets ouvrent la même annonce, les deux enregistrent : le second lit « modifiée entre-temps » ;
6. l'admin révoque le rédacteur : sa prochaine écriture est refusée ;
7. le journal attribue chaque écriture au bon compte.

Les comptes sont supprimés après, comme au jalon [6.1.x-C](../phase-6/6-1-x-c-retours.md).

## Limites écrites

- **La borne par campus porte sur les annonces seulement** : les messages de service restent un geste
  d'admin.
- **Un rédacteur voit toutes les annonces**, même hors de ses campus : la lecture est commune, seule
  l'écriture est bornée.
- **Le mot de passe temporaire transite hors de l'outil** tant que l'envoi de courriels n'est pas
  configuré.
