# 6.1.x-C — Les retours entrent quelque part

> **Jalon livré le 2026-09-07, par publication et sans build.** Le schéma est appliqué, les 22
> réponses de la feuille sont importées (22 nouvelles, puis **0 au rejeu**, journal inchangé), la page
> Retours est dans la console, le cron est écrit, `PRIVACY.md` et `CONTRIBUTING.md` disent le reste.
> Ce qui a changé entre le texte et la livraison est en fin de document, et l'essentiel tient en une
> phrase : **la source est la feuille liée au formulaire, lue par son lien**, et la clé d'un retour est
> une empreinte de la réponse, parce que rien chez Google n'en fournit une. Le sous-chantier du site
> (page d'engagement, mise au niveau du dépôt `UKit-website`) est décidé le même jour.
>
> **Le jalon qui donne une destination à ce que les utilisateurs écrivent.** Le formulaire existe
> depuis la sortie de la 6.0, il a produit ses seize premières réponses, et **rien dans le projet ne
> sait les recevoir** : pas de documentation, pas de convention de rangement, pas de boucle vers le
> registre des défauts. Les références R1…R5 et C6 renvoient à la
> [mise à plat](6-2-mise-a-plat.md).
>
> **Ne touche pas l'application.** Ce jalon peut démarrer le jour même, en parallèle de
> [6.1.x-A](6-1-x-a-montee-du-socle.md), et sa livraison ne demande aucune release.

## La direction

Le formulaire vit aujourd'hui comme **donnée de catalogue** — `services.adaptation` — et c'est tout
ce que le dépôt en sait. Il est pourtant déjà la destination de trois chemins de l'application : la
pastille d'état de service, le teaser de campus non relié (`ModaleCampusNonRelie`) et le bouton
« Demander » d'un état vide. Autrement dit, **le canal est en place et personne ne relève le
courrier.**

Le principe retenu : les retours vivent **dans la base et se lisent dans la console**, pas dans le
dépôt. Le dépôt ne gagne qu'un script d'import et une page de documentation. C'est le même choix que
pour les annonces, les messages de service et les sondes — la console est déjà l'endroit où le
propriétaire du produit lit ce qui vient de dehors.

## Ce qui est à faire

### La table `retours` (R1, R2)

Sur le modèle des autres tables de [backend.md](../backend.md) : déclarée dans
`supabase/schema.sql`, politiques dans `supabase/policies.sql`, **aucune politique d'écriture
publique** — l'écriture vient de l'intégration continue par la clé de service, comme
`content:import` et les sondes.

**La clé primaire est l'identifiant stable de la réponse**, et c'est la décision de conception du
jalon : le formulaire se relit **en entier** à chaque passage, donc sans clé stable chaque relecture
recréerait les mêmes lignes. En écrivant en `on conflict do nothing`, le dédoublonnage devient une
propriété du schéma et non une heuristique de script — un retour déjà rangé reste rangé, avec l'état
que le propriétaire du produit lui a donné.

Colonnes attendues : l'identifiant, l'horodatage, la **nature** (`bug`, `fonctionnalité`, `campus`,
`autre`), le campus demandé le cas échéant, l'appareil, la version, le texte, le contact s'il a été
laissé, et un **état** (`nouveau`, `traité`, `refusé`, `en attente`).

> **Rappel de la règle des trois gestes** : toute colonne nouvelle se pose dans `schema.sql`, dans
> les valeurs, et dans la liste de colonnes du lecteur. Elle ne vaut pas ici — cette table n'est pas
> lue par l'application — mais elle vaudra pour la colonne `credits` du
> [chantier campus](../adaptation-campus.md).

### L'importeur (R2)

`tools/retours/importer.mjs`, calqué sur `tools/import-ukit-data.mjs` :

- il lit **soit** `--fichier <csv>` — le geste manuel d'aujourd'hui, celui qui marchera toujours —
  **soit** `RETOURS_CSV_URL`, l'adresse de la feuille de réponses publiée au format CSV ;
- il normalise chaque ligne : nature, horodatage, campus, appareil, version, texte ;
- il passe le texte libre à un **nettoyage**. Rien dans ce formulaire ne demande d'identité, mais un
  texte libre peut en porter, et une réponse rangée en base y reste ;
- il écrit en une seule passe, et rend un compte : combien lues, combien nouvelles.

### La page « Retours » dans la console (R1, R3)

La console sait déjà afficher n'importe quelle table par descripteur —
`console/src/schema/tables.ts`, plus la liste et le formulaire génériques. Un descripteur de plus
suffit : les colonnes de liste, l'état modifiable, et l'avertissement qui rappelle que ces lignes
sont **importées** et qu'une modification du texte serait perdue au prochain passage. Les écritures
sont journalisées par les déclencheurs existants.

### Le cron (R3)

`.github/workflows/retours.yml`, calqué sur `.github/workflows/sondes.yml` :

- **toutes les 72 heures** ; `SUPABASE_SERVICE_ROLE_KEY` est déjà un secret du dépôt ;
- **il n'ouvre aucune issue et ne commite rien.** Décision explicite : les sondes ouvrent des issues
  parce qu'une source cassée est un incident ; un retour d'utilisateur n'en est pas un, et une issue
  par avis noierait le signal des sondes ;
- **il ne s'arme que si `RETOURS_CSV_URL` existe**, donc il reste réversible sans toucher au code ;
- un `workflow_dispatch` avec un `dry_run`, comme les sondes.

### Le formulaire (C6, R4)

Trois gestes hors code, à faire ensemble :

1. **un champ de contact facultatif**, formulé comme un service et non comme une collecte —
   *« laisse ton adresse si tu veux qu'on te réponde, ou qu'on t'aide à faire adapter ton campus »* ;
2. **une section de volontariat** pour qui demande un campus, avec le lien vers la page
   d'engagement du [chantier campus](../adaptation-campus.md) ;
3. **`PRIVACY.md` dit ce que le formulaire collecte.** La page décrit aujourd'hui ce que fait
   l'application ; le formulaire est un service tiers, et il va gagner une adresse. À écrire **en
   même temps** que le champ, pas après.

### La boucle vers le registre

Un retour qui décrit un défaut devient une entrée de
[`defauts-fonctionnels.md`](../defauts-fonctionnels.md), **écrite à la main**, comme aujourd'hui. Le
registre des retours ne le remplace pas : il enregistre ce qui a été dit, pas ce qu'on en a compris.
`CONTRIBUTING.md` gagne le geste, et `.gitignore` la ligne qui écarte les exports bruts.

## Décisions et pièges

- **Le `CHANGELOG` n'a pas de section « Non publié »** alors que `CONTRIBUTING.md:159` l'exige
  (R5). À rouvrir ici, puisque c'est le premier jalon de la 6.1.x à écrire.
- **Publier une feuille de réponses la rend lisible par qui a l'adresse.** L'adresse n'est pas
  devinable et le formulaire ne demande pas d'identité, mais la décision reste au propriétaire du
  produit : sans `RETOURS_CSV_URL`, l'importeur fonctionne en manuel et rien n'est publié.
- **RLS sans politique rend une liste vide, pas un refus** — piège de 6.1-B, à revérifier ici en
  jouant les frontières avec un compte jetable.
- **Le trigger du journal doit être `security definer`** ; les fonctions vivent dans le schéma
  `private`.

## Dépendances

Aucune. Ce jalon ne touche pas l'application.

## Plan de test

Pas de protocole appareil — rien n'est embarqué. Les vérifications sont ailleurs :

1. **Un import à blanc** (`--dry-run`) sur l'export du 2026-09-06 : seize lignes lues, seize
   nouvelles. Le jeu d'essai est `tools/retours/exports/formulaire-2026-09-06.csv` — **non
   versionné** (`.gitignore`) : ce sont des réponses libres d'utilisateurs, et le dépôt est public.
2. **Le même import rejoué** : seize lues, **zéro nouvelle**. C'est le test du dédoublonnage, et
   c'est le seul qui compte vraiment.
3. **Un import après modification d'un état dans la console** : l'état survit au passage suivant.
4. **Les politiques**, jouées aux frontières avec un compte jetable : lecture refusée en anonyme,
   écriture refusée sans droits, écriture et ligne de journal avec.
5. **Le cron en dispatch manuel**, une fois, avant de le laisser courir.

## Limites écrites

- **Un formulaire n'est pas un canal de support.** On lit, on range, on corrige — on ne répond pas
  systématiquement, et le champ de contact ne promet pas de réponse. Le texte du formulaire doit
  éviter de le laisser croire.
- **La nature d'un retour est devinée à l'import.** Une réponse qui coche « suggérer une
  fonctionnalité » pour signaler un bug sera rangée de travers ; c'est au propriétaire du produit de
  la reclasser dans la console, et la colonne est faite pour ça.
- **Rien ne mesure la satisfaction.** Ce jalon range ce qui arrive ; il ne va rien chercher.

## Écarts constatés à la livraison

Mesurés le 2026-09-07. Le texte ci-dessus est laissé tel qu'il a été écrit.

- **Le jalon n'est pas celui de la notification.** En le cadrant, le propriétaire du produit a
  demandé ce qu'il apportait par rapport au réglage de base de Google — un mail par réponse, une
  feuille qui se remplit seule, lisible par un `curl`. Réponse écrite dans
  [pilotage.md](../pilotage.md#les-retours) : **l'état et la trace**, une forme normalisée, un seul
  endroit, l'indépendance. La clé stable et le dédoublonnage sont un coût de la copie, pas une valeur.
- **La source est la feuille liée, par son lien**, et non « la feuille publiée au format CSV » : une
  feuille partagée « à toute personne disposant du lien » se lit sans compte à son adresse d'export,
  et `RETOURS_CSV_URL` accepte le lien de partage. Le fichier n'est plus qu'un repli.
- **Ni la feuille ni le formulaire n'exposent d'identifiant de réponse.** La clé est une empreinte :
  l'instant en UTC et les **cellules non vides**, triées par question. « Toutes les cellules » aurait
  recréé les seize premières lignes le jour où le formulaire gagne ses deux colonnes. Limite écrite :
  renommer une question, ou retoucher une cellule, recrée la ligne.
- **Les deux exports de Google ne s'accordent pas à la seconde près** : `9:13:21 AM GMT+3` dans le
  fichier de l'interface, `8:13:22` en heure de Paris par l'adresse d'export, sur six réponses sur
  seize. L'adresse d'export est donc canonique, et l'ancien export du 2026-09-06 ne sert plus que de
  jeu d'essai au parseur. Les sauts de ligne dans une cellule diffèrent aussi ; ils sont normalisés.
- **La nature se reclasse dans la console**, comme les limites le promettaient — ce qui demandait
  que le privilège de colonne couvre `nature` avec `etat` et `note`.
- **Deux colonnes de plus que la liste** : `volontaire` (la case de la section de volontariat) et
  `reponses`, la réponse entière en JSON ; et `note`, ce que le propriétaire du produit en a fait.
- **Le journal copie la ligne entière, contact compris** : effacer un retour, c'est aussi effacer sa
  trace, et la procédure est écrite dans [`supabase/README.md`](../../supabase/README.md#effacer-un-retour).
- **Le journal d'un workflow de dépôt public est public** : l'importeur n'imprime jamais une réponse.
- **Un secret ne se lit pas dans un `if:` de job** : c'est le script qui se désarme, en succès.
- **`0 6 */3 * *` n'est pas exactement 72 heures** (fin de mois) ; sans conséquence, l'import est
  idempotent.
- **Le `CHANGELOG` avait déjà sa section « Non publié »** (R5), rouverte par 6.1.x-B.
- **La page d'engagement va sur le site**, `ukit-bordeaux.fr`, pas sur les GitHub Pages de la
  console ; `adaptation-campus.md` est amendé. Le dépôt du site est mis au niveau documentaire
  d'UKit dans le même mouvement, sans toucher à son style.
- **`main` est avancé en avance rapide sur `v6.1.x`** le jour même — un workflow planifié ne tourne
  que sur la branche par défaut, et la console ne se déploie que depuis elle. La spec disait « aucune
  release » ; c'est vrai, mais il fallait une fusion.
- **Les politiques aux frontières** : `anon` refusé (42501, la lecture lui est révoquée — sans ça,
  RLS rend une liste vide), un compte sans droits lit une liste vide et son `PATCH` ne touche rien, un
  éditeur reclasse et sa trace porte son e-mail, et un `PATCH` sur `texte` est refusé par le privilège
  de colonne.
