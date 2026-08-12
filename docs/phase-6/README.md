# Phase 6 — Le comportement devient de la donnée

UKit atteint sept sources tierces, et **la façon de les atteindre est compilée dans le binaire** :
les URLs, les constantes magiques, les filtres, les sélecteurs, et les 323 lignes de WebView cachée
pilotée par du JavaScript injecté qui portent la session universitaire. Quand une source change, il
faut éditer du code, construire, publier, et attendre une revue de store — pour un identifiant DOM
qui a bougé d'une ligne.

Cette phase remplace cette couche par des **Blueprints** joués par le moteur embarqué
[Aetherius](../../docs-aetherius/README.md), et lui donne le dos qui lui manquait : une base
**Supabase** qui porte ces Blueprints, le contenu éditorial, le référentiel des lieux et le catalogue
des établissements.

À la fin, corriger une source ou ajouter une université est **une publication de données**, pas une
release.

## Pourquoi maintenant

Trois raisons, et aucune n'est une préférence de style.

1. **Le délai de correction est le vrai défaut du projet.** Les identifiants du dossier
   administratif sont attribués par GWT selon l'ordre de construction du DOM
   ([sources-externes.md](../sources-externes.md#étape-3--dossier-administratif)) : une refonte côté
   université les décale silencieusement, et l'application affiche alors des champs vides ou
   mélangés. Aujourd'hui, le correctif met des jours à atteindre les utilisateurs. Il devrait mettre
   des minutes.
2. **Le moteur existe, et il a déjà été mesuré sur nos sources.** La Phase 3 d'Aetherius est
   terminée, et son dernier jalon a porté **six sources de UKit** en Blueprints, joués sur les deux
   moteurs et vérifiés sur un vrai téléphone. Nous ne partons pas d'une intention : nous partons de
   fichiers qui tournent.
3. **Le multi-établissement est impossible sans ça.** Ajouter le portail d'une seconde université
   veut dire, aujourd'hui, ajouter une machine à états dans un composant. Chaque fac coûterait une
   release, et chaque fac cassée en coûterait une autre.

Et une raison qu'on découvre en écrivant les Blueprints : le port **retire un serveur de
l'architecture**. Le relais `ukit.kbdev.io` existe parce qu'une page web ne peut pas appeler un
autre domaine sans son accord — une requête émise nativement depuis l'appareil n'y est pas soumise.
Le Blueprint vise `celcat.u-bordeaux.fr` directement.

## Décisions d'architecture

| # | Décision | Choix retenu |
|---|----------|--------------|
| 1 | Moteur embarqué, pas de daemon | Les requêtes partent **de l'appareil de l'utilisateur**, avec sa connexion et ses identifiants. Un moteur hébergé ferait sortir tout le trafic d'une seule IP et ferait transiter les identifiants CAS par une machine tierce — ce que la page « Aucun serveur » du README promettait exactement de ne pas faire. La promesse survit à la lettre. |
| 2 | Distribution des paquets | `@aetherius/engine` et `@aetherius/react-native` sont **publiés sur npm** et consommés comme des dépendances versionnées ordinaires. Un lien `file:` vers un dépôt voisin marche sur un poste et nulle part ailleurs — ni en CI, ni sur un build EAS. |
| 3 | Frontière Blueprint / applicatif | Un Blueprint décrit **ce qu'on demande à une source et ce qu'on en retient**. Le cache, l'internationalisation, l'heure courante, la position et tout calcul restent applicatifs. Cette frontière n'est pas administrative : un Blueprint qui aurait besoin de l'heure cesserait d'être rejouable à l'identique, et c'est justement ce qui le rend vérifiable. Écrite dans [blueprints.md](../blueprints.md). |
| 4 | Un dos, et il est mince | Supabase porte de la **donnée de configuration et du contenu éditorial**, pas de la logique. Aucune donnée personnelle n'y va, aucun compte n'est requis pour utiliser l'application. La base est un point de publication, pas un intermédiaire : si elle tombe, l'application tourne sur son socle embarqué. |
| 5 | Accès à la base | `@supabase/supabase-js`, dès le jalon 6-B. Les lectures publiques pourraient passer par des Blueprints Act I, mais les écritures, l'authentification et les politiques RLS de la partie sociale à venir ne se bricolent pas sur `fetch` — et deux façons de parler à la même base seraient pires qu'une. |
| 6 | Source de vérité des Blueprints | Le dépôt UKit, dans [`blueprints/`](../../blueprints/). Ce sont **nos** fichiers : ils se relisent en revue, se versionnent avec le code qui les consomme, et un script les publie vers la base. Aetherius garde ses copies comme documentation de son jalon 3-G ; les deux jeux divergeront, et c'est normal. |
| 7 | Le socle embarqué n'est jamais optionnel | Chaque Blueprint livré est **importé dans le binaire**. Le distant n'est qu'une surcouche qui le met à jour. Une application doit fonctionner au premier lancement, hors ligne, sans avoir jamais contacté quoi que ce soit. |
| 8 | Ajouter un établissement sans release | Le registre d'Aetherius refuse, par construction, qu'un manifeste distant **ajoute** un Blueprint absent du binaire. C'est la bonne règle pour corriger, et la mauvaise pour étendre. Elle est levée par un jalon côté Aetherius (**3-H**), en opt-in, bornée à un préfixe de noms réservé et au périmètre de secrets de l'application. |
| 9 | Migration incrémentale, derrière les signatures | Une source à la fois, **derrière la signature typée existante** du service. Les écrans ne doivent pas apprendre qu'il y a un moteur derrière, sinon la migration cesse d'être réversible. L'ancien code reste en repli le temps de comparer, puis il est **retiré** — un repli qu'on ne retire jamais devient deux implémentations à maintenir. |
| 10 | Vérification | Un **harnais de parité** rejoue chaque Blueprint sous Node et compare sa sortie au service historique. C'est la seule preuve rejouable que la bascule ne change rien pour l'utilisateur ; la vérification manuelle sur appareil reste obligatoire par-dessus. |

### Ce qui change de nature

| Aujourd'hui | Après |
|---|---|
| `resType: '103'` dispersé dans deux services | une `var` nommée, dans un fichier |
| `qs.stringify(data, { arrayFormat: 'repeat' })` | l'encodage du moteur, identique à l'octet près sur les deux implémentations |
| 176 lignes de JavaScript en gabarits de chaîne | un vocabulaire d'actions fermé, validé **avant** le run |
| un mot de passe interpolé entre apostrophes | des paramètres encodés en JSON, jamais concaténés dans une source |
| `catch { return null }` | huit familles d'échec, dont une seule veut dire « réessayer » |
| trois `MutationObserver` recopiés avec trois plafonds | une auto-attente, un `timeout_ms`, un `fail:CODE` |
| une correction = une release | une correction = une publication de fichier |

Et ce qui **ne change pas**, parce que ce sont les bonnes réponses actuelles : les caches et leur
péremption, les trois dictionnaires de traduction, le calcul des distances et des tris, la
reconstruction des bâtiments, le verrou biométrique, le stockage chiffré.

## Périmètre

| Capacité | Dans la phase | Note |
|---|:---:|---|
| Annonces de vie étudiante | oui | jalon 6-A (pilote), puis 6-B (source Supabase) |
| Restaurants CROUS et menus | oui | jalon 6-D |
| Bibliothèques : découverte, affluence, horaires | oui | jalon 6-D |
| Référentiel des bâtiments | oui | jalon 6-D — le fichier embarqué reste le socle hors ligne |
| Emplois du temps, groupes, salles | oui | jalon 6-E, en visant Celcat directement |
| Session universitaire (CAS, dossier, messagerie) | oui | jalon 6-F — le morceau qui justifie la phase |
| Sélection d'établissement, second portail | oui | jalon 6-G |
| Version applicative et messages de service | oui | jalon 6-B |
| Cartographie (Leaflet, tuiles) | non | ce n'est pas une source de données, c'est un rendu |
| Notifications, calendrier système, tâche de fond | non | l'application les possède déjà, et bien |
| Partie sociale (comptes, contenus utilisateurs) | non | hors phase. La base l'accueillera sans refonte : c'est tout ce qu'on en fait aujourd'hui |

## Comment les trois pièces cohabitent

```
   Aetherius (depot voisin)              UKit (ce depot)              Supabase
   ------------------------              ---------------              --------
   @aetherius/engine        ──npm──►  src/shared/aetherius/   ──►  bucket blueprints/
   @aetherius/react-native             la facade, le registre,        manifest.json
   le moteur, fixe                     les secrets, les erreurs       + les fichiers
                                                  │
   contracts/ = la grammaire                      │                  tables
   des Blueprints                       blueprints/*.json  ──publie──►  annonces
                                        le socle embarque             etablissements
                                                  │                   batiments
                                        src/features/*/services/      app_release
                                        les signatures inchangees
                                                  │
                                        les ecrans, qui ne savent rien de tout ca
```

Trois responsabilités, trois rythmes : le moteur bouge rarement et se met à jour par une release ;
les Blueprints bougent quand une source change et se publient à chaud ; les écrans ne bougent que
pour des raisons de produit.

## Les jalons et leur ordre

Chaque jalon fait l'objet d'une **spécification autonome**, au même format que les phases
d'Aetherius : ce qui est livré, les décisions et les pièges, la définition de « terminé », le plan
de test, et les limites écrites.

```
6-A Socle moteur  ──►  6-B Base Supabase  ──►  6-C Livraison des Blueprints
                                                        │
                          ┌─────────────────────────────┤
                          ▼                             ▼
                6-D Act I : campus          6-E Act I : planning
                          └──────────────┬──────────────┘
                                         ▼
                              6-F Act II : scolarite
                                         ▼
                       6-G Multi-etablissement   (depend d'Aetherius 3-H)
                                         ▼
                6-I Emploi du temps universel  (spec ouverte, depend d'Aetherius)
                6-J Le compte d'abord           (spec ouverte, decision produit)
                                         ▼
                       6-H Retrait du legacy et livraison
```

| Jalon | Spécification | Dépend de | Résumé |
|---|---|---|---|
| 6-A | [6-a-socle.md](6-a-socle.md) | — | Les paquets en dépendance, la façade partagée, la WebView et le modal montés une fois, les secrets sur les clés existantes, le modèle d'erreur traduit en écrans. Source pilote : les annonces, derrière la signature inchangée de `BdeService`. Harnais de parité posé. |
| 6-B | [6-b-supabase.md](6-b-supabase.md) | 6-A | Le projet, le schéma, les politiques RLS, les buckets, les clés. Le contenu de `ukit-data` déménage. Les annonces quittent jsDelivr. |
| 6-C | [6-c-livraison.md](6-c-livraison.md) | 6-B | Le registre branché sur le manifeste, le rafraîchissement hors du chemin critique, l'interrupteur d'arrêt, le script de publication et l'écran de diagnostic. **C'est ici que le gain devient réel.** |
| 6-D | [6-d-campus.md](6-d-campus.md) | 6-C | CROUS, bibliothèques, référentiel des bâtiments. Le jalon qui établit la frontière : ce qui descend, ce qui reste. |
| 6-E | [6-e-planning.md](6-e-planning.md) | 6-C | Emplois du temps, groupes, salles. Bascule directe sur Celcat, retrait du relais. La source la plus critique de l'application, et la seule qui doit survivre hors ligne. |
| 6-F | [6-f-scolarite.md](6-f-scolarite.md) | 6-D, 6-E | La WebView cachée devient deux Blueprints. Le morceau qui justifie la phase, et le plus exigeant à vérifier. |
| 6-G | [6-g-etablissements.md](6-g-etablissements.md) | 6-F, Aetherius 3-H | Le catalogue des établissements pilote l'interface, les Blueprints sont namespacés, un second portail réel est livré. |
| 6-I | [6-i-planning-universel.md](6-i-planning-universel.md) | 6-G, **Aetherius 3-I** (spécifié) | **Spécification ouverte.** L'emploi du temps par export iCal, pour les universités qui ne sont pas sur un Celcat ouvert — c'est-à-dire presque toutes. Née de 6-G, qui a livré un établissement sans planning. |
| 6-J | [6-j-compte-et-sources-par-etablissement.md](6-j-compte-et-sources-par-etablissement.md) | 6-G | **Spécification ouverte.** Proposer le compte universitaire dès l'accueil, et accepter que la place du compte dans le parcours **dépende de l'établissement**. Née de la campagne de 6-G sur appareil : l'application n'a qu'une forme, celle de Bordeaux. |
| 6-H | [6-h-livraison-finale.md](6-h-livraison-finale.md) | 6-G | Les replis sont retirés, les dépendances mortes sortent, la documentation est close, la version part. |

**Ordre recommandé :** séquentiel, sauf 6-D et 6-E qui sont indépendants l'un de l'autre. Deux
avertissements de charge : **6-F** est le jalon le plus volumineux et le seul dont la vérification
exige un compte universitaire réel et plusieurs passes sur appareil ; **6-G** dépend d'un jalon
écrit dans l'autre dépôt, à traiter avant d'y arriver.

L'ordre des sources n'est pas arbitraire — il va du plus sûr au plus engageant : un fichier statique,
puis des API avec en-têtes, puis une API à l'encodage exigeant, et **en dernier** le parcours
authentifiant, celui qui demande d'avoir confiance dans tout le reste.

## Implémenter un jalon

Un jalon se traite en suivant sa **spécification** et la
[« Définition de terminé »](../../CONTRIBUTING.md#définition-de--terminé-) du `CONTRIBUTING.md`.
Trois adaptations propres à cette phase :

- **La parité fait partie de la porte.** Une source migrée arrive avec son cas dans
  [`tools/parity/`](../../tools/parity/README.md), et il doit être vert : le Blueprint et le service
  historique rendent la même chose sur des données réelles. C'est ce qui autorise à retirer le repli.
- **Le point « flux vérifié à la main » se joue sur un appareil**, pas dans un terminal, et il
  comprend toujours les **chemins dégradés** : mode avion, source qui répond un statut inattendu,
  identifiants faux, sélecteur devenu introuvable. Chacun doit produire un écran **différent**. S'ils
  produisent tous « aucun résultat », le jalon n'a rien apporté.
- **Un jalon se termine par l'amendement de sa propre spécification.** La bannière « Jalon livré », et
  les endroits où la réalité a corrigé le texte. Se vérifie par `git diff --stat docs/phase-6/` avant
  de commiter : une spécification restée intacte ne se distingue pas d'une spécification dont
  l'amendement a été perdu — c'est arrivé à [6-C](6-c-livraison.md), dont le commit de livraison n'a
  jamais touché le fichier, et qui n'a été relu qu'au jalon 6-E.
- **Un jalon qui touche un Blueprint touche la documentation de sa source.** L'inventaire
  [sources-externes.md](../sources-externes.md) reste le document qu'on lit avant toute intervention
  réseau ; il doit dire, pour chaque source, quel Blueprint la porte et ce qui est resté applicatif.

> **Note de portée.** Rien de ce qui touche au **vocabulaire des Blueprints** n'est de notre
> ressort : c'est le contrat d'Aetherius, et un manque se traite là-bas, pas par un contournement
> ici. Un premier écart était prévu et il est écrit : le jalon **3-H** du dépôt voisin, dont dépend
> 6-G — il est livré. Un **second** est apparu en livrant 6-G, exactement comme la note l'annonçait :
> l'extraction ne sait pas rendre un corps de réponse en texte brut, ce qui met un export iCal hors
> de portée d'un Blueprint. Il a sa spécification ici, [6-I](6-i-planning-universel.md), et le manque
> a la sienne là-bas : `docs/phase-3/3-i-extraction-texte.md`, à livrer **avant** de commencer 6-I. Le jalon 3-G en avait trouvé huit en portant nos sources : c'est le
> résultat normal d'un port réel, pas un accident.
