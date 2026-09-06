# 6.1.1-A — La montée du socle

> **Le jalon qui rend l'outil de travail.** L'Expo Go des stores est passé en SDK 57 le 2026-09-04 ;
> l'application est en SDK 54, et **iOS n'a aucun chemin de repli**. Ce jalon monte le socle,
> restaure la boucle courte sur les deux plateformes, et solde au passage toute la dette d'outillage
> — parce qu'une montée de socle est le seul moment où l'on relit ses dépendances de toute façon.
>
> Les références T1…T8 renvoient à la [mise à plat](6-2-mise-a-plat.md). La décision de faire ce
> saut « dans son propre jalon, après la 6.1 » date du 2026-09-04 et vit dans
> [plateforme.md](../plateforme.md#le-saut-de-sdk).

## La direction

**Expo 54 → 57**, c'est-à-dire React Native 0.81.5 → **0.86.3**, React 19.1 → 19.2, et environ
quarante et une dépendances de plateforme qui bougent ensemble. Rien de visible pour l'utilisateur,
sauf ce que le jalon suivant corrigera.

Trois raisons, dans l'ordre de force :

1. **La boucle d'itération est cassée côté iOS.** Tout le travail visuel de la 6.2 se fait à l'œil
   sur un appareil ; sans Expo Go, chaque idée coûte un build EAS.
2. **Le moteur d'animation change sous les pieds.** Écrire le mouvement sur React Native 0.81 puis
   tout rejuger sur 0.86, c'est payer le travail deux fois.
3. **Un travail visuel doit rester attribuable.** Si la montée et le mouvement arrivent ensemble, un
   pixel qui bouge n'a plus de cause identifiable — c'est la règle que le projet applique déjà entre
   [défauts fonctionnels](../defauts-fonctionnels.md) et sessions d'écran.

## Ce qui est à faire

### La montée elle-même (T1, T2, T3, T4)

- `npx expo install expo@^57.0.0 --fix`, puis `npx expo-doctor@latest`. La liste de référence des
  versions attendues est `https://api.expo.dev/v2/sdks/57/native-modules`.
- **Épingler `expo >= 57.0.17`**, pas `^57.0.0` nu (T2) : c'est cette version qui corrige la
  régression mémoire de Hermes v1 sur `react-native-worklets` et `react-native-reanimated`, que
  l'application importe tous les deux. Ce n'est pas une préférence, c'est une contrainte.
- `babel.config.js` : `react-native-reanimated/plugin` devient `react-native-worklets/plugin` (T3).
- `newArchEnabled` et `edgeToEdgeEnabled` sortent du schéma de configuration ; l'edge-to-edge devient
  obligatoire sur Android 16+. Les deux endroits qui raisonnent sur l'edge-to-edge « SDK 54 » se
  revérifient **sur appareil**, pas en lecture (T4) :
  [`LienEdtForm.tsx:174`](../../src/features/Planning/components/LienEdtForm.tsx) et
  [`ScolariteLoginView.tsx:338`](../../src/features/Scolarite/components/ScolariteLoginView.tsx).
- `eas update` exige désormais `--environment` ; Xcode 26 est le minimum.

### La dette d'outillage (T5, T6, T7)

Tout au même endroit, parce que le faire à part coûterait une seconde campagne de vérification.

| Point | État | À faire |
|---|---|---|
| `console/package.json` | déclare `vite ^8.2.2`, le lockfile porte 7.3.6 — **`npm ci --prefix console` est cassé** | réaligner, et vérifier par un `npm ci` propre |
| Node | « 18+ » dans `README.md:185` et `CONTRIBUTING.md:9`, 22 dans les workflows, 20 côté Aetherius | un `.nvmrc`, un `engines`, et les trois textes réalignés |
| `prettier` | `^1.14.2`, huit ans ; `.prettierrc` porte `jsxBracketSameLine`, retiré en 3.x | monter, ou retirer — il n'est câblé sur aucune porte |
| `typescript` | **non déclaré** ; `npm run typecheck` s'appuie sur une résolution transitive | déclarer explicitement |
| `ts-node` | en dépendance **de production** | passer en `devDependencies` |
| `dotenv` | `^10` (courant : 17) | monter |
| `eslint` / `typescript-eslint` | `^10` face à `^8` | vérifier la compatibilité annoncée, monter si besoin |
| `react-native-webview`, `@react-native-community/datetimepicker` | en `^` là où Expo épingle exact | épingler comme Expo |
| `sondes/requirements.txt` | `aetherius[browser]==0.5.5` contre `^0.5.9` côté application | aligner |
| `app.config.ts` | `versionCode` divergent : 551 à la racine, 542 sous `android` | une seule valeur — et EAS gère les numéros à distance (`appVersionSource: remote`) |
| `.babelrc.old` | mort depuis la migration | supprimer |
| branche principale | `master`, et un **tag** `master` homonyme rend `git push origin master` ambigu | renommer en `main`, supprimer le tag — voir ci-dessous |

### La branche principale devient `main`

Deux choses distinctes, à faire ensemble parce qu'elles se gênent l'une l'autre.

**Le tag `master`.** Il pointe `f69e3f6` (`ci: manual tag dispatch`, 2026-02-27) et rend
`git push origin master` ambigu — d'où la règle `refs/heads/master` apprise en 6.1-B. Une **release
GitHub publiée y est attachée** (« Release master », un asset) : supprimer le tag seul la laisserait
orpheline, donc la release part d'abord. Le commit visé est dans l'historique de la branche, rien
n'est perdu.

**Le renommage.** Vérifié le 2026-09-06, ce qui le touche est court :

- `.github/workflows/console.yml` porte `branches: [master]` — **le seul workflow qui nomme la
  branche**. `release.yml` pousse sur `${{ github.ref }}`, celui du dispatch : il est déjà
  agnostique.
- [`urls.ts`](../../src/shared/constants/urls.ts) expose `blob/master/PRIVACY.md` **aux
  utilisateurs**. C'est le seul point qui survit au renommage : les 6.0 et 6.1 déjà installées
  gardent cette adresse, et ne continuent de l'ouvrir que par la redirection que GitHub maintient
  pour une branche renommée.
- Quatre mentions vivantes dans la documentation (`plateforme.md`, `pilotage.md`,
  `console/README.md`, [6-1-z](6-1-z-sortie.md)) ; celles des jalons passés restent telles quelles,
  elles racontent ce qui était vrai.
- Le réglage de branche par défaut côté GitHub, puis `git branch -m`, `git fetch --prune`,
  `git branch -u origin/main`, `git remote set-head origin -a`.

> **Le mode de panne qui a déjà mordu ne s'applique plus.** Le contrôle de mise à jour lisait
> `raw.githubusercontent.com/.../master/VERSION` et **est mort en silence** au précédent renommage de
> branche — `raw` ne suit pas les redirections. Vérifié le 2026-09-06 : **plus aucun code du dépôt ne
> lit `raw.githubusercontent`**, le contrôle passe par la table `app_release` depuis
> [6-Z](6-z-livraison-finale.md). C'est ce qui rend le renommage possible aujourd'hui et ne l'était
> pas avant.

### Les paquets qui ne sont pas pilotés par Expo (T8)

`react-native-collapsible`, `react-native-image-viewing`, `react-native-textinput-effects`,
`react-native-root-toast`, `prop-types` : aucun n'est couvert par `expo install --fix`, et tous vont
franchir cinq minors de React Native d'un coup. À réévaluer un par un, et à remplacer **seulement
s'ils cassent** — pas par principe.

### Le voisin

`@aetherius/react-native` ne déclare **aucune borne haute** sur `react-native`, donc rien n'empêche
la montée du point de vue du manifeste. Deux points à vérifier tout de même :

- son pilote WebView sur React Native 0.86, sur appareil réel ;
- `vitest.config.ts` importe **en dur**
  `node_modules/@aetherius/react-native/dist/delivery/index.js` — un couplage à la disposition
  interne du paquet, qui casserait sans bruit à sa prochaine restructuration.

### Écrire la procédure

[plateforme.md](../plateforme.md) gagne une section « monter de SDK » : ce qui a été fait, dans quel
ordre, ce qui a surpris. Sans elle, le prochain saut se redécouvre entièrement.

## Décisions et pièges

- **`npx expo install --fix` sort en erreur après avoir écrit `package.json`** : il veut ajouter les
  greffons `expo-asset` et `expo-font` à une configuration TypeScript dynamique, ce qu'il ne sait
  pas faire. **Les versions sont posées, l'erreur est bénigne** — c'est déjà écrit dans
  [plateforme.md](../plateforme.md), ne pas la rejouer trois fois en croyant à un échec.
- **`expo-doctor` exige `.expo/` dans `.gitignore`**, pas `.expo/*`.
- **`tsc` et Metro ne partagent pas leur couche TypeScript** : un code qui compile chez l'un peut
  échouer chez l'autre. C'est la raison pour laquelle `npx expo export` est une porte, et pas un
  confort.
- **On reste sur Expo.** La question a été posée et tranchée le 2026-09-04 ; ce jalon ne la rouvre
  pas.

## Dépendances

Aucune. Ce jalon ouvre la 6.1.1. [6.1.1-C](6-1-1-c-retours.md) peut courir en parallèle : il ne
touche pas l'application.

## Plan de test sur appareil

La montée ne se vérifie pas en lisant un `git diff`. **Les deux plateformes, avec des builds de
développement neufs**, c'est la condition écrite dans [plateforme.md](../plateforme.md).

1. **Builds de développement neufs**, iOS *et* Android — la montée change la configuration native,
   donc les anciens sont périmés par construction.
2. **L'Expo Go des stores rouvre le projet.** C'est la moitié de la raison d'être du jalon : si ce
   point échoue, le jalon n'a pas atteint son but, quelles que soient les portes vertes.
3. **Le parcours froid complet**, sur les deux établissements, sur les deux plateformes : c'est le
   chemin qui traverse le plus de modules natifs à la fois (WebView, trousseau, biométrie).
4. **L'edge-to-edge Android** sur les deux écrans qui raisonnaient dessus (T4), et le clavier :
   les événements `keyboardWill*` n'existent pas sur Android, et tout `KeyboardAvoidingView` doit
   porter un `behavior` explicite depuis l'edge-to-edge.
5. **Les animations existantes** — les cartes qui fondent, les en-têtes qui fondent au scroll, les
   deux contrôles dessinés des Réglages, le glissement entre onglets — parce que la couche worklets
   a bougé.
6. **La carte, le PDF, la visionneuse d'images, les toasts** : les quatre consommateurs des paquets
   non maintenus de T8.

## Portes

Celles du projet, sans en ajouter : `npx tsc --noEmit`, `npx eslint .` à **zéro**, `npm test`
(562 au départ), `npm run parity` (13/13), `npx expo-doctor` (18/18), et **`npx expo export` sur les
deux plateformes** — la seule porte qui prouve la résolution des modules natifs et le passage des
directives `'worklet'` par Babel.

## Limites écrites

- **Une montée de socle ne se voit pas**, et pourtant elle est ce qui peut le plus casser. Les notes
  de version n'auront rien à en dire ; le CHANGELOG, si.
- **Les paquets non maintenus de T8 restent une dette**, même s'ils survivent à ce saut. Survivre à
  0.86 ne dit rien de 0.90.
- **Rien ici ne garantit le prochain saut.** La procédure écrite le rend moins cher, pas gratuit :
  l'Expo Go des stores continuera d'avancer sans nous prévenir.
