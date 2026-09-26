# La mesure

> **Livré par le jalon [7-D](phase-7/7-d-la-mesure.md) le 2026-09-21, sur la branche `v6.3`, publié en
> 6.3.** Décidé le 2026-09-14 ([mise à plat de la phase 7](phase-7/7-mise-a-plat.md)), prévu en 6.2.3
> jusqu'au 2026-09-21, jour où la version courte a été retirée du plan. Le code vit dans
> [`src/shared/mesure/`](../src/shared/mesure/index.ts), la base dans
> [`supabase/schema.sql`](../supabase/schema.sql) et [`fonctions.sql`](../supabase/fonctions.sql) ; ce
> document s'amende à chaque événement ajouté.

Ce que UKit compte de son usage, pourquoi, et ce qu'il refuse de compter. La mesure sert trois
lecteurs, et un compteur qui n'en sert aucun n'a pas sa place ici.

## Le principe : des nombres, jamais des personnes

Ce qui part de l'appareil est un **compteur** : un événement, une clé courte, un jour — ou une heure —,
un campus, une version, une plateforme, un booléen « testeur », et un nombre. Rien d'autre.

- **Aucun identifiant** : ni celui de l'installation ([pilotage.md](pilotage.md#laudience-testeurs)),
  ni le jeton de notification, ni le compte universitaire.
- **Aucun contenu saisi** : pas une recherche, pas un nom de groupe, pas un texte.
- **Aucun horodatage plus fin que l'heure**, et le jour seulement pour ce qui touche un contenu précis,
  comme une annonce.
- **Aucun recoupement** : une ligne de `mesures` ne se relie à aucune autre table qui décrirait un
  appareil.

C'est la promesse de la [base de publication](backend.md#ce-que-la-base-est-et-ce-quelle-nest-pas),
étendue : la base apprend combien, jamais qui.

## Les trois lecteurs

| Lecteur | Ce qu'il lit | Où |
|---|---|---|
| **La 6.3** | les sessions, les onglets, les ouvertures, les thèmes, avant et après la refonte | la sortie de la 6.3, [7-K](phase-7/7-k-sortie-6-3.md) |
| **L'équipe** | l'entonnoir d'une annonce — vue, ouverte, action —, par campus et par période | la console, [7-G](phase-7/7-g-console-statistiques.md), et le rapport partenaire |
| **Le pilotage** | les échecs de source dans le temps, face aux sondes du matin | la page Sources de la console |

## La règle : une mesure s'ajoute avec son pourquoi et son lecteur

Ajouter un événement, c'est quatre gestes, dans le même commit :

1. l'entrée dans `EVENEMENTS` de `src/shared/mesure/vocabulaire.ts`, avec sa granularité et le format
   de sa clé ;
2. une migration qui l'insère dans `evenements_connus` — sans elle, la base l'ignore et le compte en
   `rejetes` ;
3. `migration.test.ts` vert, qui compare les deux ;
4. une ligne dans le tableau ci-dessous, **avec son lecteur**. Un événement sans lecteur ne s'ajoute
   pas.

Retirer un événement se fait dans l'autre sens : le vocabulaire de l'application d'abord ; la ligne de
`evenements_connus` reste tant que des versions installées l'envoient.

## Le vocabulaire

| Événement | Clé | Granularité | Ce qu'il dit | Lecteur |
|---|---|---|---|---|
| `session` | — | heure | une ouverture, ou un vrai retour au premier plan | 6.3, équipe |
| `onglet.vu` | `planning`, `campus`, `scolarite`, `reglages` | heure | l'onglet affiché | 6.3 |
| `annonce.impression` | l'`id` de l'annonce | jour | la carte visible à 50 % pendant une seconde, une fois par session | équipe, rapport partenaire |
| `annonce.ouverture` | l'`id` | jour | la fiche ouverte | équipe |
| `annonce.action` | l'`id` | jour | le bouton d'action touché | équipe |
| `resto.ouverture` | le code Croustillant | jour | la fiche d'un restaurant | équipe, 6.3 |
| `bu.ouverture` | l'identifiant Affluences | jour | la fiche d'une bibliothèque | équipe, 6.3 |
| `salles.ouverture` | l'identifiant du bâtiment dans le référentiel des lieux (`bat_a28`, pas le code affiché `A28`) | jour | la fiche des salles libres | 6.3 |
| `planning.jour`, `planning.semaine` | — | jour | la vue affichée | 6.3 |
| `scolarite.connexion` | `ok`, `echec` | jour | une connexion universitaire aboutie ou refusée | pilotage |
| `source.echec` | `<hôte>:<famille>` | heure | une source qui n'a pas répondu, par famille d'échec | pilotage |
| `reglage.theme` | `light`, `dark` | jour | le thème, compté une fois par session | 6.3 — les deux thèmes à égalité se jugent sur ce chiffre |
| `reglage.langue` | `fr`, `en`, `es` | jour | la langue | 6.3 |
| `reglage.synchro` | `on`, `off` | jour | la synchronisation du calendrier | pilotage |
| `reglage.notifications` | `rappels:on`, `rappels:off`, `messages:on`, `messages:off` | jour | les deux interrupteurs de notification | pilotage |

## Ce qu'on refuse de compter

- un identifiant, quel qu'il soit, ou une empreinte qui en tiendrait lieu ;
- une recherche, un nom de groupe, une UE, un texte saisi ;
- une position, même approximative ;
- une durée de session : elle demanderait de relier deux instants du même appareil ;
- un parcours — « a vu A, puis B » —, pour la même raison ;
- ce qui dépend du dossier universitaire : formation, notes, documents.

## Lire les chiffres

**Le parc actif**, le dénominateur, se lit dans `jetons_push`, redéposé tous les sept jours par chaque
appareil qui garde les notifications actives :

```sql
select etablissement, version, plateforme, count(*) as appareils
  from public.jetons_push
 where maj_le > now() - interval '14 days' and not testeur
 group by 1, 2, 3
 order by appareils desc;
```

Il sous-compte : un appareil qui a coupé les notifications, ou refusé leur permission, n'y est pas.

**Une annonce**, sur une période :

```sql
select evenement, sum(n) as total
  from public.mesures
 where cle = '<id de l annonce>' and not testeur
   and jour between '2026-10-01' and '2026-10-31'
 group by evenement;
```

Le taux d'ouverture est `annonce.ouverture` sur `annonce.impression`, le taux d'action `annonce.action`
sur `annonce.ouverture`. Une impression se compte une fois par session : deux passages devant la carte
dans la même session n'en font qu'une.

**Les sessions**, par jour et par campus :

```sql
select jour, campus, sum(n) as sessions
  from public.mesures
 where evenement = 'session' and not testeur
 group by 1, 2
 order by 1 desc, 3 desc;
```

## Les petites cases

Un compteur par jour, campus, version et plateforme peut ne compter qu'un seul appareil — un campus à
trois étudiants, une version que deux personnes n'ont pas mise à jour. **La console n'affiche jamais une
case sous cinq** : elle écrit « moins de 5 » et regroupe. Une requête faite à la main n'a pas ce
garde-fou, et son résultat ne sort pas de l'équipe.

## La conservation

Treize mois, puis supprimés. La purge est une requête écrite dans
[`supabase/README.md`](../supabase/README.md), jouée à la main tant que le volume ne justifie pas mieux.

## L'interrupteur

« Statistiques anonymes », dans les Réglages, actif par défaut. Le couper arrête le comptage et vide la
file locale ; rien de ce qui a été compté avant ne part. [PRIVACY.md](../PRIVACY.md) le dit au point
4 quinquies, à partir de la 6.3.

## Limites connues

- **Rien avant la 6.3** : les versions antérieures ne comptent rien, et la refonte n'a donc pas de ligne
  de base ; ses chiffres sont la première.
- **La file se perd** si Android tue l'application sans passer par l'arrière-plan — et le Galaxy A8,
  sous Android 9, passe bien par `background` même à une fermeture depuis les applications récentes
  (protocole du 2026-09-22). Après un lot accepté, la file s'écrit tout de suite sur le disque ; une
  fermeture dans les quelques millisecondes de cette écriture ferait repartir le lot une fois.
- **Le statut de testeur est auto-déclaré**, comme celui du jeton de notification.
- **Ce n'est pas un rapport de plantage** : un échec de source n'est pas un plantage, et un plantage ne
  laisse aucune ligne ici.
- **Une impression se juge dans sa liste, pas dans la page.** Sur le tableau de bord Campus, le
  carrousel des annonces est une liste horizontale dans une page qui défile : une carte compte quand
  elle est dans la fenêtre du carrousel, même si la page est défilée plus bas. La section est la
  première de la page ; l'écart est borné, et la grille de l'écran Annonces, elle, est exacte.
- **Une réponse perdue peut compter deux fois.** La file n'est soustraite qu'à la réponse de la base,
  et la base ne porte pas d'idempotence par lot, par choix de simplicité : un lot accepté dont la
  réponse n'est jamais revenue est renvoyé.
- **Un compteur au-delà de mille en un seul envoi est rejeté** par la base, et il ne se représente
  pas : la ligne est perdue, comptée dans `rejetes`. Aucun geste ne l'atteint en pratique.
