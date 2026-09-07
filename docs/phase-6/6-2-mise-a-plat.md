# v6.1.x puis v6.2 — Mise à plat, après la sortie de la 6.1

> **Statut : décisions prises le 2026-09-06**, en conversation, et les jalons spécifiés dans
> [6.1.x-A](6-1-x-a-montee-du-socle.md), [B](6-1-x-b-signalements.md),
> [C](6-1-x-c-retours.md), [Z](6-1-x-z-sortie.md), puis [6.2-A](6-2-a-releve-et-vocabulaire.md),
> [B](6-2-b-ecrans.md), [Z](6-2-z-sortie.md). Le document reste tel qu'il a été écrit : c'est la
> trace du raisonnement.
>
> **Écrit le 2026-09-06**, le jour où la 6.1 atteint son point de sortie. Il croise trois choses qui
> arrivent en même temps — une plateforme qui a bougé sous l'application, les seize premières
> réponses du formulaire, et une version visuelle déjà nommée mais pas encore cadrée — et il tranche
> ce qui va dans quelle publication. Comme la [mise à plat de la 6.1](6-1-mise-a-plat.md), il pose
> les questions avant de figer un plan.

## 1. Deux versions, pas une

La [6.2 était déjà nommée](README.md) le 2026-09-04 : *« une version entière pour le mouvement de
l'interface »*. Deux jours plus tard, deux chantiers étrangers au mouvement se présentent en même
temps, et aucun des deux ne peut attendre la fin d'un travail visuel qui se compte en semaines :

- **la plateforme a bougé sous l'application** — l'Expo Go des stores est passé en SDK 57 le
  2026-09-04, l'application est en SDK 54, et **iOS n'a aucun chemin de repli** ;
- **le défaut le plus signalé par les utilisateurs n'est pas corrigé**, et sa correction propre
  passe justement par cette montée.

Proposition, retenue : **une 6.1.x courte d'abord, la 6.2 ensuite.**

La 6.1.x ne montre rien de nouveau : elle monte le socle, corrige ce qui a été signalé, et branche
l'entrée des retours. Son intérêt est d'être **attribuable** — si quelque chose casse après elle,
c'est la montée, et rien d'autre. Mêler cinq minors de React Native à une refonte du mouvement
rendrait chaque pixel qui bouge inexplicable, et c'est exactement la raison pour laquelle le projet
sépare déjà les défauts fonctionnels des sessions d'écran.

Le numéro est juste : la 6.1.x n'ajoute **aucune capacité**. Elle corrige, et elle change une
fondation que personne ne voit.

> **Amendé le soir même.** En cadrant B, le propriétaire du produit a redéfini le but de la
> version : *se débarrasser d'un maximum de demandes* avant la 6.2. Deux capacités y entrent donc —
> la Scolarité sans compte (dans B) et les calendriers du téléphone ([D](6-1-x-d-calendriers-du-telephone.md)).
> La version reste attribuable : aucune n'est visuelle. Le 2026-09-07, deux de plus — le ciblage par
> plateforme (fusionné dans [D](6-1-x-d-calendriers-du-telephone.md)) et, reporté à la version suivante, le push —, et le numéro cesse
> d'être « 6.1.1 » : la branche s'appelle `v6.1.x`, le numéro se décide à la sortie.

## 2. L'inventaire croisé

Chaque ligne porte sa source — **[F]** réponse au formulaire du 2026-09-06, **[M]** mesure faite le
2026-09-06, **[D]** limite écrite dans la documentation, **[K]** observation du propriétaire du
produit — et sa nature : **release** (du code), **publication** (de la donnée, sans release), ou
**hors code**.

### 2.1 La plateforme

| # | Constat | Diagnostic | Nature | Proposition |
|---|---|---|---|---|
| T1 | **L'Expo Go des stores ne sait plus ouvrir le projet** [D] | Il est passé en SDK 57 le 2026-09-04 ; l'application est en SDK 54. Android peut encore charger l'APK `Expo-Go-54.0.8` depuis `expo/expo-go-releases` ; **iOS n'a aucun chemin de repli**, donc un build de développement est aujourd'hui obligatoire pour itérer sur iPhone. | release | La montée 54 → 57, déjà décidée et déjà renvoyée « à son propre jalon, après la 6.1 » par [plateforme.md](../plateforme.md). C'est **6.1.x-A**, et c'est ce qui rend la boucle courte à la version suivante. |
| T2 | **Hermes v1 fait enfler la mémoire des applications qui importent `react-native-worklets`** [M] | Régression introduite au SDK 56, corrigée par `expo@57.0.17` (React Native 0.86.3). L'application importe `reanimated` **et** `worklets`. | release | Épingler **`expo >= 57.0.17`**, pas `^57.0.0` nu. C'est une contrainte, pas une préférence. |
| T3 | **Le greffon Babel de Reanimated a déménagé** [M] | `babel.config.js` déclare `react-native-reanimated/plugin` ; en amont, c'est devenu un alias de `react-native-worklets/plugin`. | release | À changer au moment de la montée, et à vérifier par `npx expo export` sur les deux plateformes — la seule porte qui prouve le passage des directives `'worklet'`. |
| T4 | **Edge-to-edge devient obligatoire, et deux commentaires portent l'hypothèse SDK 54** [M] | `newArchEnabled` et `edgeToEdgeEnabled` sortent du schéma de configuration ; Android 16+ impose l'edge-to-edge. Deux endroits du code raisonnent dessus : [`LienEdtForm.tsx:174`](../../src/features/Planning/components/LienEdtForm.tsx) et [`ScolariteLoginView.tsx:338`](../../src/features/Scolarite/components/ScolariteLoginView.tsx). | release | Les deux hypothèses se revérifient sur appareil Android, pas en lecture. |
| T5 | **Le `npm ci` de la console est cassé** [M] | `console/package.json` déclare `vite ^8.2.2` quand `console/package-lock.json` porte 7.3.6 : l'installation propre ne peut pas satisfaire la plage. Le déploiement Pages passe encore parce qu'il a été lancé avant la divergence. | release | À réaligner dans la passe d'outillage de 6.1.x-A. C'est un défaut latent : il casse au prochain `npm ci`, pas avant. |
| T6 | **La version de Node dit trois choses différentes** [M] | `README.md:185` et `CONTRIBUTING.md:9` disent « Node.js 18+ », les workflows disent 22, la chaîne Aetherius dit 20 — et la release v6.0.0 avait justement échoué à l'installation sous Node 20. | release | Un `.nvmrc` et un `engines`, et les trois textes réalignés. Une version d'outil qui se lit à trois endroits différents finit toujours par en contredire un. |
| T7 | **La dette d'outillage n'a jamais été soldée** [M][D] | `prettier ^1.14.2` (huit ans ; `.prettierrc` porte `jsxBracketSameLine`, retiré en 3.x) ; `dotenv ^10` ; `ts-node` en dépendance **de production** ; **aucun `typescript` déclaré** — `npm run typecheck` s'appuie sur une résolution transitive ; `eslint ^10` face à `typescript-eslint ^8` ; `react-native-webview` et `datetimepicker` en `^` là où Expo épingle exact ; `sondes/requirements.txt` en `aetherius==0.5.5` contre `^0.5.9` côté application ; `versionCode` divergent dans `app.config.ts` (551 racine, 542 Android) ; `.babelrc.old` mort. | release | Tout se solde **au même endroit** : une montée de socle est le seul moment où l'on relit ses dépendances de toute façon. Le faire à part coûterait une seconde campagne de vérification. |
| T8 | **Cinq paquets JS non maintenus vont franchir cinq minors de React Native** [M] | `react-native-collapsible`, `react-native-image-viewing`, `react-native-textinput-effects`, `react-native-root-toast`, `prop-types`. Aucun n'est piloté par Expo, donc aucun n'est couvert par `expo install --fix`. | release | À réévaluer un par un pendant la montée, et à remplacer seulement s'ils cassent — pas par principe. |

### 2.2 Ce qui a été signalé

| # | Constat | Diagnostic | Nature | Proposition |
|---|---|---|---|---|
| B1 | **La synchronisation automatique ne part jamais** [F]×2 | Deux signalements indépendants, deux plateformes : un Pixel 3 (« auto sync doesn't work… it always says that the last sync is failed from yesterday ») et un iPhone 16 en 6.0.0 (« elle ne se fait pas seule, je dois forcer »). **La 6.1 ne l'a pas corrigé** : elle a corrigé *ce que* la synchro synchronise et *ce qu'elle dit* quand elle échoue, jamais *le fait qu'elle parte*. [settings.md](../features/settings.md) porte d'ailleurs la limite écrite : *« non vérifié à ce jour : la tâche de fond application fermée »*. | release | Voir B2 pour la cause probable. Et surtout : **une mesure**, sans quoi le correctif sera invérifiable. |
| B2 | **`expo-background-fetch` est déprécié depuis le SDK 53** [M] | Le module repose sur des API de plateforme elles-mêmes dépréciées, ne reçoit plus de correctifs, et sera retiré. Son successeur `expo-background-task` s'appuie sur `WorkManager` (Android) et `BGTaskScheduler` (iOS). L'API est quasi identique — seul le paramètre d'options de `registerTaskAsync` bouge. | release | La migration est **la** correction candidate de B1, et elle explique l'ordre : 6.1.x-B vient après 6.1.x-A. |
| B3 | **Le drapeau d'échec paraît collant** [F] | « last sync failed from yesterday » survit à l'extinction puis au rallumage de l'option. `_lastSyncFailed` / `_lastSyncDate` vivent dans [`AppCore.tsx`](../../src/shared/services/AppCore.tsx). | release | À traiter comme un défaut **distinct** de B1 tant que la mesure n'a pas prouvé qu'il n'en est qu'un symptôme. |
| B4 | **« Où est la page courriel »** [F] | Un enseignant-chercheur. La porte existe pourtant : `services.email` vaut `https://webmel.u-bordeaux.fr` dans la ligne `bordeaux`. Elle vit derrière l'onglet Scolarité, donc derrière une connexion étudiante. | release | Défaut de **découverte**, pas de fonctionnalité. |
| B5 | **Afficher un calendrier externe dans le Planning** [F] | Demande explicite (« mettre mes sessions de travail personnel et tout avoir au même endroit »). `expo-calendar` est déjà là et l'application **écrit** déjà dans le calendrier système ; lire dans l'autre sens est du même ordre de travail. | release | ~~**6.3.**~~ **Reclassé le 2026-09-06 en [6.1.x-D](6-1-x-d-calendriers-du-telephone.md)** : le propriétaire du produit veut *se débarrasser d'un maximum de demandes* avant la 6.2. Répond aussi à « ajouter mes propres événements », par l'éditeur du système. |
| B6 | **Deux entrées ouvertes du registre tombent dans ce périmètre** [D] | [`defauts-fonctionnels.md`](../defauts-fonctionnels.md) : la fiche du compte affiche six tirets sans lire `sessionFailure` (le remède est déjà écrit, `EncartSession` en `variant="card"`), et les trois lectures bonus du dossier INP sont précédées d'un `navigate` non gardé. | release | Deux corrections courtes, à prendre pendant qu'on est dans ces fichiers. |
| B7 | **La barre du parcours froid paraît se figer vers 30 %** [D] | Ouverte au registre le 2026-09-06. Le palier « connexion » plafonne à 34 % pour 18 secondes annoncées ; depuis [6.1-D](6-1-d-publication.md) l'étape en dure 26. | release | **6.2**, pas ici : rangé pour la version visuelle sur décision du propriétaire du produit — *« c'est du rythme, pas du comportement »*. |
| B9 | **Un cours à plusieurs UE disparaît dès qu'une seule est filtrée** [F] *(mail du 2026-09-06, après la mise à plat)* | Mesuré sur Celcat : `MI601A` porte dix-neuf événements à plusieurs modules sur l'année, dont le même cours sous son code français et son code anglais. La projection ne gardait que le premier module. | release | **6.1.x-B** : la liste entière est gardée, un cours reste tant qu'une de ses UE n'est pas filtrée. |
| B10 | **« Tenter une synchro à chaque ouverture »** [K] *(2026-09-06, après la mise à plat)* | Le code lui donne raison : la tâche de fond n'était jamais réarmée au lancement. | release | **6.1.x-B** : l'entretien — synchro et rappels — au lancement, au retour au premier plan, quand les favoris changent ; la tâche de fond devient un bonus. |
| B8 | **Le reliquat du backlog 6.0.1** [K] | Diagnostic WebView/WAYF Android par `adb logcat` ; visionneuse PDF Android ; les 18 runs de `ukit.celcat.occupation` du tableau de bord, un par bâtiment. | — | Les deux premiers restent au backlog. Le troisième part en **6.2** : la refonte du tableau de bord le rencontrera de toute façon. |

### 2.3 Les campus demandés

Neuf des seize réponses demandent un campus. C'est de loin la première demande, et la mesure du
2026-09-06 en change la lecture.

| Demandé | × | Réalité |
|---|---|---|
| Carreire | **3** | Université de Bordeaux, santé |
| Talence | 1 | **le campus déjà couvert** |
| Enseirb-Matmeca | 1 | **école de Bordeaux INP, déjà couverte** |
| Sciences humaines | 1 | Université de Bordeaux |
| AES | 1 | Université de Bordeaux |
| « Bordeaux Montaigne Montesquieu droit » | 1 | Université de Bordeaux (droit) et/ou Bordeaux Montaigne |
| INSPE | 1 | composante de l'Université de Bordeaux |

| # | Constat | Diagnostic | Nature | Proposition |
|---|---|---|---|---|
| C1 | **Deux demandes sur neuf portent sur un campus déjà servi** [F] | L'établissement s'appelle « Collège Sciences et Technologies » dans la liste, et l'autre « Bordeaux INP ». Un étudiant de Talence ou de l'Enseirb ne s'y reconnaît pas, et remplit le formulaire pour demander ce qu'il a déjà. | publication | Renommer avec les mots que les étudiants emploient, et dire quels campus sont couverts là où l'établissement se choisit. **Le code `bordeaux` ne bouge pas** : il partitionne le trousseau, les réglages et les favoris. |
| C2 | **« Autre campus » donne déjà un emploi du temps à n'importe qui, et personne ne le sait** [K][D] | La ligne `autre` porte `edt.abonnement` : un lien iCal collé dans [`LienEdtForm`](../../src/features/Planning/components/LienEdtForm.tsx) suffit. Presque tous les produits de planning savent exporter en iCal — c'est le constat qui a ouvert [6-I](6-i-planning-universel.md). | publication | Le rendre visible. C'est la réponse immédiate à qui vient de demander son campus. |
| C3 | **Le Celcat de Bordeaux ne porte que le collège Sciences et Technologies** [M] | Mesure du 2026-09-06 sur l'inventaire public (`ReadResourceListItems?searchTerm=_&pageSize=10000&resType=103`) : 2 954 groupes, préfixes INF, SV, PHY, CHI, SPI, SSE, BG, MIASHS, MEC, EEA, IMA — et **zéro** groupe Droit, AES, Santé, Psycho, Socio, Odonto, Pharma, INSPE. | mesure | Carreire, Droit, AES, SHS et l'INSPE ont donc une **autre** source d'emploi du temps, à trouver. C'est le vrai travail, et il est public. |
| C4 | **Mais leur portail, lui, est déjà écrit** [M] | Ces composantes partagent le CAS (`cas.u-bordeaux.fr`), `mondossierweb`, le Moodle par SSO non sollicité, Apogée et le webmail : la ligne `bordeaux` les décrit déjà. | — | **Et ça ne vaut pas vérification.** Bordeaux INP avait un compte réel et il a quand même fallu **huit défauts trouvés sur appareil** ([6-G](6-g-etablissements.md)) ; un intranet partagé ne dit rien des écrans. Voir C5. |
| C5 | **Sans compte de cette composante, on ne peut rien livrer** [D] | Règle écrite de [6-G](6-g-etablissements.md) : *« ajouter un établissement reste un travail d'auteur. Le mécanisme supprime la release, pas l'écriture des Blueprints ni leur vérification sur un compte réel »*. | hors code | **Un compte prêté, et le travail se fait seul.** Ce n'est pas une posture nouvelle : `PORTAIL_BORDEAUX_INP_*` du `.env` gitignoré est déjà un compte prêté. On formalise ce qui a marché — voir [adaptation-campus.md](../adaptation-campus.md). |
| C6 | **Les neuf demandeurs sont injoignables** [F] | Le formulaire ne demande aucun contact. Les personnes les plus motivées à voir leur campus adapté sont précisément celles qu'on ne peut pas rappeler. | hors code | Un champ de contact **facultatif** et une section de volontariat dans le formulaire existant. Tout est déjà câblé : la pastille d'état de service, `ModaleCampusNonRelie` et le bouton « Demander » pointent tous sur ce formulaire par `services.adaptation`. |

### 2.4 Les retours eux-mêmes

| # | Constat | Diagnostic | Nature | Proposition |
|---|---|---|---|---|
| R1 | **Le formulaire n'existe nulle part dans le dépôt** [M] | Il vit comme **donnée de catalogue** (`services.adaptation`), et c'est tout : aucune documentation, aucune convention de rangement, aucune boucle vers le registre des défauts. L'export du jour traînait à la racine du dépôt ; il est désormais rangé en `tools/retours/exports/formulaire-2026-09-06.csv`, **non versionné** — ce sont des réponses libres d'utilisateurs, et le dépôt est public. | publication + outillage | Une table `retours`, un importeur, une page dans la console. |
| R2 | **Un import répété ne doit jamais dupliquer** [K] | Le formulaire se relit **en entier** à chaque passage : sans clé stable, chaque relecture recréerait les seize mêmes lignes. | outillage | La clé primaire **est** l'identifiant stable de la réponse, et l'écriture se fait en `on conflict do nothing`. Le dédoublonnage est alors une propriété du schéma, pas une heuristique de script. |
| R3 | **Aucune ouverture d'issue automatique** [K] | Décision explicite : les sondes ouvrent des issues parce qu'une source cassée est un incident ; un retour d'utilisateur n'en est pas un. | — | Le cron réimporte, et c'est tout. La lecture se fait dans la console, là où le reste se lit déjà. |
| R4 | **`PRIVACY.md` ne dit pas ce que le formulaire collecte** [M] | La page décrit ce que l'application fait ; le formulaire est un service tiers, et il va gagner un champ de contact. | hors code | À écrire en même temps que le champ, pas après. |
| R5 | **Le `CHANGELOG` n'a pas de section « Non publié »** [M] | `CONTRIBUTING.md:159` l'exige pourtant. La 6.1.0 est en tête. | doc | À rouvrir au premier jalon. |

## 3. Les mesures du 2026-09-06

Trois choses ont été mesurées le jour de cette mise à plat, et elles portent des décisions :

- **L'inventaire Celcat est celui d'un seul collège** (C3). 2 954 groupes, aucun hors sciences et
  technologies. La conséquence est que « même université » ne veut pas dire « même emploi du
  temps », et que l'adaptation des composantes de Bordeaux est un vrai travail, pas une copie.
- **L'Expo Go des stores est en SDK 57**, l'application en 54, et le repli iOS n'existe pas (T1).
- **Deux réponses de campus sur neuf portent sur un campus déjà couvert** (C1). C'est le seul
  chiffre de cette mise à plat qui mesure une erreur de nommage plutôt qu'un manque de capacité.

## 4. Les questions, et leurs réponses

Contrairement à la [mise à plat de la 6.1](6-1-mise-a-plat.md), les questions ont été tranchées dans
la conversation même qui a produit ce document. Elles sont conservées avec leur réponse, parce que
c'est la réponse qui explique la forme des jalons.

1. **Le découpage.** Une 6.1.x courte (socle, signalements, retours) puis la 6.2 pour le mouvement
   seul — plutôt que tout dans la 6.2. → **Retenu.** Les utilisateurs qui ont signalé le défaut sont
   servis vite, et une régression de la montée reste attribuable à la montée.
2. **La direction visuelle.** Trois choses sont prises à la référence : les **fonds par écran**, la
   **mise en scène du contenu**, les **transitions d'écran**. → **Retenu.** En revanche
   [theme.md](../theme.md) **garde** « aucune forme ronde, tout est carré arrondi » et « une seule
   police, celle du système » : la référence en fait autrement, l'identité de l'application ne suit
   pas. La règle *« un chargement bref ne montre rien »* (seuil 300 ms), elle, **est réécrite** — les
   squelettes de contenu la contredisent par construction, et la 6.2 les demande.
3. **L'écran fondateur du vocabulaire.** → **Le tableau de bord Campus** : le plus simple à adapter
   et le plus varié en états — quatre sources tierces, carrousels, tuiles, chargements indépendants,
   échecs partiels. Tout le vocabulaire y passe en une fois. Les autres écrans suivent, un par
   session, parce qu'ils sont de natures différentes.
4. **Les campus.** Une boucle collaborative avait été proposée d'abord — le volontaire joue, envoie
   un rapport de run, on publie un correctif à chaud, il rejoue. → **Rejetée** : trop lente, et elle
   demande au volontaire un engagement dans la durée que le prêt d'un accès ne demande pas. Le
   travail se fait **seul, avec un compte prêté**, encadré par une page d'engagement. Ne pas
   reproposer la boucle sans raison nouvelle.
5. **Le rapport de run vers la base.** → **Non.** `PRIVACY.md` garde sa phrase : *« la base ne reçoit
   aucune écriture de l'application, par construction »*. Rien de ce plan ne l'entame.
6. **Où vivent les retours.** → **Dans la base, lus dans la console.** Le dépôt ne gagne qu'un script
   d'import et une page de documentation. Un bug qui devient une correction continue d'être écrit **à
   la main** dans [`defauts-fonctionnels.md`](../defauts-fonctionnels.md).
7. **Le recrutement des volontaires.** → **Une section du formulaire existant**, plutôt qu'un campus
   publié en « en cours d'adaptation ». Publier une ligne de catalogue dont les colonnes `portail_*`
   sont nulles reste **possible** — le teaser existe — mais tant que la moitié publique n'est pas
   mesurée, un étudiant de Carreire qui choisirait son campus n'obtiendrait presque rien. À rouvrir
   campus par campus.
8. **La reconnaissance du volontaire.** → **Oui, s'il le souhaite** : prénom ou pseudo, sur la ligne
   de catalogue de son campus (donc publiable et retirable sans release), plus les crédits du
   `README.md` et l'écran À propos.

## 5. Le plan

```
   6.1.x-A  Montee du socle          T1 T2 T3 T4 T5 T6 T7 T8
   6.1.x-B  Ce qui a ete signale     B1 B2 B3 B4 B6 B9 B10
   6.1.x-C  Les retours              R1 R2 R3 R4 C6 — sans build, en parallele
   6.1.x-D  Calendriers du telephone B5 — ajoute le 2026-09-06, code apres B
            + ciblage par plateforme  ajoute le 2026-09-07 et fusionne ici (le push est reporte)
   6.1.x-Z  Sortie — Android verifie en une fois, numero decide a la fin

   6.2-A    Releve et vocabulaire    l'ecran fondateur : le tableau de bord Campus
   6.2-B    Les ecrans               S1 Planning, S2 Scolarite, S3 Reglages (+ B7, B8)
   6.2-Z    Sortie

   campus   en continu, hors version C1 C2 C3 C4 C5 — voir docs/adaptation-campus.md
```

L'ordre de la 6.1.x est celui de la dépendance, pas du risque : **B dépend de A** parce que la
correction propre du défaut le plus signalé passe par un module que seule la montée apporte. **C ne
dépend de rien** — il ne touche pas l'application — et peut donc commencer le jour même.

La 6.2 n'est cadrée qu'au niveau de **sa méthode**, et c'est délibéré : sa direction précise se
tranche sur des captures posées côte à côte, et son détail au moment du relevé. Ses trois
spécifications sont donc des cadres, à compléter avant ouverture — pas des jalons prêts à jouer.

Chaque jalon reçoit sa spécification avant d'être ouvert, avec ses mesures, sa définition de
« terminé » et ses limites écrites, comme les précédents.
