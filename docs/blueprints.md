# Les Blueprints

Un **Blueprint** est un fichier JSON déclaratif qui décrit comment atteindre une source distante et
ce qu'on en retient. UKit ne l'interprète pas lui-même : il le confie au moteur
[Aetherius](../docs-aetherius/README.md), embarqué dans l'application.

C'est ce qui remplace, depuis la [Phase 6](phase-6/README.md), les services `axios` écrits à la main
et la WebView cachée pilotée par du JavaScript injecté. Le bénéfice tient en une phrase : **une
source qui change se corrige par une publication de fichier, pas par une release.**

Ce document dit où vivent ces fichiers, ce qu'on y met, ce qu'on n'y met pas, et comment on en publie
un. La grammaire elle-même — les actions disponibles, les expressions, l'extraction — est documentée
chez Aetherius ; elle n'est pas recopiée ici, parce qu'une copie périmée est pire que pas de copie.

## Où ils vivent

| Endroit | Rôle |
|---|---|
| [`blueprints/`](../blueprints/) | **la source de vérité.** Les fichiers sont relus en revue, versionnés avec le code qui les consomme, et importés dans le binaire |
| [`blueprints/index.ts`](../blueprints/index.ts) | le **socle embarqué** : la table des noms et des versions livrées avec l'application |
| Bucket `blueprints` de Supabase | la **surcouche distante** : les mêmes fichiers, plus récents, publiés entre deux releases |

Le socle embarqué n'est jamais optionnel. Une application doit fonctionner au premier lancement, hors
ligne, sans avoir jamais contacté le réseau ; le distant ne fait que le mettre à jour.

## Ce qui descend dans un Blueprint, et ce qui n'y descend pas

La frontière n'est pas administrative, elle est **fonctionnelle** : un Blueprint décrit ce qu'on
demande à une source et ce qu'on en retient. Tout ce qui a besoin de l'heure courante, de la position
de l'utilisateur, de l'état des écrans ou de la langue choisie n'a pas ces informations — et ne doit
pas les avoir, sinon le fichier cesse d'être rejouable à l'identique, donc vérifiable.

| Ce qui devient un Blueprint | Ce qui reste du code applicatif |
|---|---|
| L'URL, la méthode, les en-têtes, l'encodage du corps | Le cache et sa péremption |
| Les constantes du protocole distant (`resType`, `colourScheme`) | La persistance, le trousseau, l'état |
| La sélection et le nommage des données extraites | L'internationalisation |
| Le filtrage exprimable **sur un seul élément** | Le calcul : distances, tris, agrégats, dédoublonnage |
| Le parcours d'authentification et les attentes | Le rendu, la navigation, la logique métier |
| L'agent utilisateur quand il décide de la page servie | Toute décision produit (quelles villes, quelles catégories) |

Quatre limites reviennent souvent, et il vaut mieux les connaître avant de buter dessus :

- **pas d'heure courante dans un prédicat.** Une règle de péremption (`expires_at > maintenant`) reste
  applicative. Ce n'est pas un manque : la même donnée peut alors être affichée grisée plutôt que
  masquée, ce qu'un filtre d'extraction interdirait ;
- **pas d'indexation dans un filtre.** « L'un des éléments de cette liste vaut X » n'est pas
  exprimable. On extrait le champ et on filtre côté application ;
- **pas de reformatage d'une date reçue.** Les filtres de date lisent `YYYY-MM-DD` et refusent le
  reste : ils servent à *produire* un format attendu par une source, pas à en interpréter un ;
- **pas de calcul.** Il faudrait le réimplémenter à l'identique dans deux moteurs.

## L'échelle : un Blueprint par appel, pas par source

Un Blueprint correspond à **un appel que l'application joue réellement**, pas à une source ni à un
enchaînement de pages. Trois conséquences :

- une liste de restaurants et le menu d'un restaurant sont deux fichiers : ils sont demandés par deux
  écrans, à deux moments ;
- le parcours universitaire *froid* et le parcours *chaud* sont deux fichiers, parce que l'application
  distingue déjà les deux — un fichier de douze steps que personne ne joue d'un bloc ne démontre
  rien ;
- un fichier qui rend plusieurs choses « puisqu'on y est » couple deux écrans : une panne de l'un
  emporte l'autre.

## Les erreurs cessent d'être avalées

Avant la Phase 6, tous les services renvoyaient `null` ou `[]` en cas d'échec : une panne du
fournisseur et une réponse légitimement vide étaient **indistinguables**, et un écran « aucun
résultat » pouvait masquer une source morte.

Un Blueprint échoue, et `describeFailure` range l'échec dans une famille d'écran
([`src/shared/aetherius/failures.ts`](../src/shared/aetherius/failures.ts)) :

| Ce qui s'est passé | Famille | Ce que l'application affiche |
|---|---|---|
| Réseau injoignable, délai dépassé | `unavailable` | « Service indisponible », avec Réessayer |
| Statut inattendu (`expect`) | `rejected` | « Réponse inattendue » — la source a changé |
| Sélecteur ou extraction sans correspondance | `data` | « Contenu introuvable » — Blueprint à corriger |
| Échec **nommé** par le Blueprint (`fail:CODE`) | `blocked` | le message du cas, tel quel |
| Secret ou entrée absente | `config` | « Saisis tes identifiants » |
| Run annulé | `cancelled` | rien |

Et son pendant : **une liste vide n'est pas une erreur.** Un run réussi dont les sorties portent une
liste vide a réellement trouvé une liste vide.

Tant qu'un écran n'est pas branché sur une famille, elle reste observable : `reportFailure` écrit une
ligne nommant le Blueprint et la famille. C'est ce qui rend les chemins dégradés distinguables sur un
appareil avant même que l'interface les distingue.

### Affirmer la forme, pour que « rien trouvé » ne se confonde pas avec « rien à trouver »

Une extraction qui ne correspond à rien rend **une liste vide**, pas une erreur. C'est le bon
comportement — une source peut légitimement ne rien avoir — mais il ouvre un angle mort : si la
réponse change de forme au point que le chemin d'extraction ne correspond plus, le run **réussit**
avec zéro élément, et l'écran affiche « aucun résultat » pour une source cassée.

Le remède est déclaratif et tient en un step :

```jsonc
{ "id": "forme", "action": "assert",
  "condition": "{{ steps.annonces.racine | length > 0 }}",
  "message": "la reponse ne porte pas de tableau 'annonces'" }
```

en extrayant à côté la **racine** attendue (`{ "from": "json", "path": "$.annonces" }`) : elle
correspond une fois si la clé existe — même vide — et zéro fois si elle a disparu. L'échec est rangé
en `rejected`. Un Blueprint dont l'extraction peut légitimement être vide devrait porter cette
assertion ; celui des annonces l'a gagnée au jalon [6-A](phase-6/6-a-socle.md), après mesure.

## Écrire un Blueprint

1. **Inventorier la source d'abord**, dans [sources-externes.md](sources-externes.md) : l'URL exacte,
   la méthode, les en-têtes indispensables, la forme du corps, les constantes **et leur
   signification**, les règles de filtrage, et ce que le code fait de la réponse. L'écrire révèle
   déjà la moitié du travail — les constantes qu'on ne sait plus justifier, les filtres dupliqués,
   les erreurs avalées.
2. **Demander pourquoi on passe par là.** Un relais, un proxy « CORS », une fonction qui ne fait que
   retransmettre : la contrainte qui l'a fait naître est souvent celle d'un navigateur, et une
   requête émise nativement depuis l'appareil n'y est pas soumise. C'est ainsi que le relais Celcat
   est sorti de l'architecture.
3. **Écrire le fichier**, nommé `<domaine>.<tache>` (`ukit.campus.restaurants`,
   `ukit.portail.bordeaux.dossier`), avec ses `inputs` typés, ses `vars` nommées, et `expect` sur les
   statuts attendus.
4. **Le jouer avec le moteur Python**, depuis un poste, avant de toucher à l'application. C'est là
   qu'on itère : le cycle est de quelques secondes.
5. **Écrire son cas de parité** dans [`tools/parity/`](../tools/parity/README.md) et le rendre vert
   contre le service historique.
6. **Le jouer sur un appareil**, chemins dégradés compris.

Les identifiants ne sont **jamais** dans un fichier. Ils sont déclarés (`secrets`) et fournis au
runtime par le trousseau de l'appareil.

## Publier une correction

Deux gestes, et le second n'est pas optionnel :

```bash
# 1. corriger le fichier dans blueprints/ et incrementer sa version
# 2. publier : valide, televerse, recalcule les empreintes, regenere le manifeste
npm run blueprints:publish
```

Le manifeste est un **artefact généré**, jamais un fichier qu'on édite. Une empreinte écrite à la
main est périmée dès la première correction, et un manifeste dont l'empreinte ment est exactement ce
que l'appareil rejette : on passerait la soirée à déboguer une garde qui fonctionne.

La correction arrive sur les appareils au rafraîchissement suivant — au démarrage, ou au retour au
premier plan. Le distant ne gagne que s'il est **plus récent, entier et valide**.

### Revenir en arrière

| Geste | Qui | Effet |
|---|---|---|
| `disabled` sur une entrée du manifeste, ou entrée retirée | le publieur | l'embarqué reprend la main au rafraîchissement suivant |
| Bouton « revenir à l'embarqué » du menu de développement | l'application | purge la surcouche tout de suite, sans réseau |
| `disabled` à la racine du manifeste | le publieur | **tout** revient à l'embarqué |

### Quand une correction « n'arrive pas »

Les causes se ressemblent toutes vues de l'écran principal. L'écran de diagnostic du menu de
développement répond en trois secondes : version pas strictement supérieure, empreinte fausse, entrée
désactivée, moteur minimal trop élevé, document refusé à la validation, ou simplement pas encore
rafraîchi.

## Ce qu'un Blueprint distant ne peut pas faire

Un Blueprint est de la **donnée exécutable**, et il est traité comme tel :

- il ne peut **déclarer** que les secrets que l'application lui ouvre ;
- il ne peut pas **ajouter** un nom que l'application n'embarque pas — sauf sous le préfixe
  `ukit.portail.`, explicitement ouvert pour le multi-établissement
  ([6-G](phase-6/6-g-etablissements.md)) ;
- il ne peut pas exécuter de code : le moteur embarqué n'évalue rien dynamiquement, par construction ;
- il est validé **entièrement** avant d'atteindre le cache, donc avant d'atteindre un run.

Ce qui n'est **pas** couvert et doit rester su : un publieur compromis. Qui contrôle la publication
peut livrer un Blueprint qui envoie les secrets déjà autorisés où il veut. L'accès au projet Supabase
est un accès de production.

## Les fragilités : celles qui disparaissent, celles qui restent

| Avant | Après |
|---|---|
| Constantes magiques disséminées | `vars` nommées, en un seul endroit |
| Parsing par expression régulière | `as: number`, champs nommés — ou explicitement applicatif |
| Erreurs avalées (`catch { return null }`) | Erreurs typées, familles d'écran |
| JavaScript injecté non typé | Vocabulaire d'actions fermé, validé avant le run |
| Identifiants interpolés dans une source de script | Paramètres encodés en JSON, jamais concaténés |
| Attente recopiée par script, trois plafonds | Une auto-attente, un `timeout_ms`, un `fail:CODE` |
| **Sélecteurs positionnels** (`#gwt-uid-41`) | **Toujours positionnels** |

La dernière ligne est celle qu'il ne faut pas maquiller. Les identifiants du dossier administratif
sont attribués par le framework de la page selon l'ordre de construction du DOM : une modification
côté université les décale silencieusement. La migration ne les rend **pas** robustes. Ce qu'elle
change est ailleurs, et c'est déjà beaucoup : ils deviennent une ligne de données corrigeable à
distance en quelques minutes, au lieu d'une constante compilée en attente de publication.

Et le format déclaratif permet un filet que le code d'origine n'avait pas : lire le **libellé voisin**
et l'affirmer, pour qu'un décalage devienne un échec nommé au lieu d'une donnée fausse.

## Vérifier

```bash
npm test                    # le socle : resolution des secrets, registre, modele d'erreur
npm run parity              # rejoue les Blueprints sous Node, compare aux services historiques
```

La question n'est pas « est-ce que ça tourne » mais « est-ce que ça rend **la même chose** ». Puis le
chemin dégradé, qui est celui qu'on ne teste jamais et qui décide de l'expérience réelle : mode
avion, source qui répond un statut inattendu, identifiants faux, sélecteur devenu introuvable. Chacun
doit produire un écran **différent**. S'ils produisent tous « aucun résultat », la migration n'a rien
apporté.

## Documentation associée

| Sujet | Document |
|---|---|
| Le cadrage de la migration, jalon par jalon | [phase-6/README.md](phase-6/README.md) |
| L'inventaire des sources et leur Blueprint | [sources-externes.md](sources-externes.md) |
| La base qui les publie | [backend.md](backend.md) |
| Le moteur, sa grammaire, ses limites | [../docs-aetherius/README.md](../docs-aetherius/README.md) |
