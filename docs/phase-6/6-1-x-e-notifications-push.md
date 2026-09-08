# 6.1.x-E — Les messages de service en notification push

> **Jalon livré (code, base, fonction déployée, console, documentation) le 2026-09-08, et vérifié
> sur iPhone le jour même** : une notification publiée depuis la console est arrivée sur un appareil
> réel, application fermée, et l'a ouverte sur la feuille du message. La clé APNs était déjà en
> place — EAS l'avait créée avec le build de développement. Reste la moitié Android, groupée à
> [Z](6-1-x-z-sortie.md).** La fonction a été **sondée de bout en bout** le jour même avec un éditeur jetable :
> un appel anonyme est refusé (403), un message ciblé `ios` avec deux faux jetons (un iOS, un
> Android) vise **un** appareil, Expo déclare le faux jeton mort et la fonction le retire, le
> message est marqué notifié, un second appel est refusé (409), le journal porte l'insertion et la
> mise à jour. Tout a été effacé après. Décidé le 2026-09-08 contre le report écrit la veille dans
> [6.1.x-D](6-1-x-d-calendriers-du-telephone.md#reporté-à-la-version-suivante--les-messages-en-notification) :
> le propriétaire du produit veut l'essayer dans cette version. Les quatre questions que l'analyse
> posait ont été tranchées en séance, et sont ci-dessous. Portes : `tsc` vert, ESLint à zéro,
> 671 tests, console typée, les deux fonctions SQL sondées par l'API anonyme.
>
> **La première écriture de l'application vers la base.** Jusqu'ici, la base ne recevait rien de
> l'appareil, par construction. Un push exige un jeton par appareil, et cibler avant d'envoyer
> exige de savoir à qui il appartient. Ce jalon est donc d'abord une décision de vie privée, écrite
> dans [PRIVACY.md](../../PRIVACY.md) avant d'être du code.

## La direction

L'application sait parler à ses utilisateurs par un bandeau, une feuille et une pastille — quand
elle est ouverte. Un incident, une annonce importante, un « mets à jour » doivent pouvoir **réveiller
le téléphone**, chez tout le monde, tout de suite. C'est du push, par le service d'Expo, et rien
d'autre ne le fait : la notification locale posée par la tâche de fond n'atteint une application
fermée que quand le système la réveille, jamais à la seconde.

## Les quatre décisions (2026-09-08)

| Question | Décision | Pourquoi |
|---|---|---|
| Ce que la base apprend d'un appareil | **le jeton, et ce qu'il faut pour cibler** : campus, version, plateforme, statut de testeur (auto-déclaré) | sans cela, le ciblage ne peut pas s'appliquer *avant* d'envoyer, et un push atteindrait des téléphones où le message ne s'afficherait pas |
| L'activation | **actif par défaut**, un interrupteur « Messages de service en notification » dans la section Notifications ; le couper **retire** le jeton de la base | c'est la portée « chez tout le monde » qui est voulue ; la donnée est pseudonyme et s'efface d'un geste |
| Qui envoie | **une Edge Function Supabase** (`supabase/functions/notifier`), appelée par un bouton « Notifier » de la console avec la session de l'éditeur | l'API push d'Expo ne répond pas aux navigateurs (pas d'en-tête CORS, mesuré le 2026-09-08) ; une fonction lit les tickets et élague les jetons morts, ce qu'un envoi en aveugle ne ferait pas |
| Le test | **un build de développement** (`eas build --profile development`) | Expo Go ne porte plus les notifications distantes depuis le SDK 53 |

## Ce qui est fait

### La base

- **`jetons_push`** ([schema.sql](../../supabase/schema.sql)) : `jeton` (clé, forme
  `ExponentPushToken[…]` vérifiée par un `check`), `plateforme`, `etablissement`, `version`,
  `testeur`, `maj_le`. Rien d'autre, par décision.
- **Deux fonctions `security definer`** ([fonctions.sql](../../supabase/fonctions.sql)) :
  `deposer_jeton` (un `upsert` sur le jeton) et `retirer_jeton`. **L'application n'écrit pas la
  table** : `anon` n'y a aucun privilège — ni lecture (les jetons ne s'énumèrent pas), ni écriture
  directe. Les éditeurs la lisent depuis la console ([policies.sql](../../supabase/policies.sql)).
- `service_messages` gagne `notifie_le` et `notifies` : envoyé une fois, jamais deux, et le nombre
  d'appareils visés — une trace, pas une preuve de réception.

### La fonction d'envoi

[`supabase/functions/notifier/index.ts`](../../supabase/functions/notifier/index.ts), Deno :
vérifie que la session appelante est un éditeur (la table `editeurs` ne rend à un compte que sa
propre ligne), charge le message, refuse s'il est inactif, expiré ou déjà notifié, **cible** les
jetons par la même règle que l'appareil, envoie par lots de cent, lit les tickets, retire les jetons
`DeviceNotRegistered`, marque le message. La règle de ciblage est **recopiée** dans
[`regles.ts`](../../supabase/functions/notifier/regles.ts) — Deno exige des extensions explicites
et ne lit pas le `tsconfig` — et un test de la racine
([`regles.test.ts`](../../supabase/functions/notifier/regles.test.ts)) vérifie qu'elle rend la même
réponse que `shared/ciblage` sur une matrice de lignes et d'appareils.

### L'appareil

- [`shared/push/inscription.ts`](../../src/shared/push/inscription.ts), pur et testé : la forme d'un
  jeton, l'égalité de deux inscriptions, l'échéance du redépôt (sept jours, pour que `maj_le` dise
  qu'un appareil vit encore).
- [`shared/push/index.ts`](../../src/shared/push/index.ts) : `deposerLeJeton` — le réglage, un vrai
  appareil hors Expo Go, la permission **lue** (jamais demandée ici), le jeton par
  `getExpoPushTokenAsync`, le contexte de ciblage, et la fonction SQL si la mémoire `push@1` dit que
  quelque chose a changé ; `retirerLeJeton` pour l'interrupteur. Appelé par l'**entretien** à chaque
  lancement et retour au premier plan, hors de son échéance de douze heures, et sur l'événement du
  réglage et du campus.
- [`shared/push/reception.ts`](../../src/shared/push/reception.ts) : ouvrir la notification mène à
  la **feuille du message** — la réponse à une notification pendant que l'application vit, et celle
  qui l'a lancée. Le message se marque vu à « Compris », pas à la réception. Le canal Android
  `messages-de-service` y est créé, en importance **haute**.

  Il s'appelait `default` et naissait en importance `DEFAULT` : la notification sonnait et se rangeait
  dans le volet, mais **ne surgissait pas par-dessus l'écran** — « je reçois la notif, mais pas en
  mode push », mesuré sur Android le 2026-09-08. **L'importance d'un canal est figée à sa création**
  et Android ignore toute modification ultérieure, ce qui protège le choix de l'utilisateur : monter
  la valeur n'aurait rien changé sur un appareil qui portait déjà le canal. Il a donc fallu un
  **identifiant neuf**, et l'ancien est supprimé pour ne pas traîner dans les réglages du système.
  Son nom et sa description y sont désormais lisibles — « Messages de service » —, ce qui permet de
  couper ces messages sans couper les rappels de cours. L'identifiant doit rester d'accord avec celui
  qu'envoie la fonction : **changer l'un oblige à redéployer l'autre**, faute de quoi la notification
  retombe sur le canal d'Expo et perd sa hauteur.
- Le réglage `messagesEnNotification` dans `SettingsManager`, la rangée dans la section
  Notifications, le bloc « push » du panneau Testeur (état, jeton abrégé, dépôt, retrait).
- Le texte de [PRIVACY.md](../../PRIVACY.md), point 4 quater, et la promesse du README amendée.

### La console

Un bouton **Notifier** sur un message existant — un geste hors écriture, le premier : le descripteur
gagne des `actions`, avec confirmation — ; les colonnes « Notifié le » et « Appareils visés » en
lecture seule ; une page **Jetons push** dans « Suivre », lue seulement : le parc, par plateforme,
campus, version.

## Décisions et pièges

- **Le statut de testeur est auto-déclaré par l'appareil.** La base ne peut pas le vérifier sans
  recevoir l'identifiant d'installation, qui ne quitte jamais le téléphone. Un appareil qui se
  dirait testeur à tort recevrait un message d'audience `testeurs` : faible enjeu, limite écrite.
- **Un jeton inconnu muni de la clé publiable peut déposer une ligne.** Le `check` sur la forme
  borne ce qui entre ; un envoi élague ce qui est mort. Un flot de faux jetons coûterait des
  tickets en erreur, pas des notifications.
- **`Schema` de supabase-js résout à `never` sur le schéma du dépôt** — mesuré ce jour : `from`
  accepte déjà n'importe quelle chaîne, `rpc` devient intypable. Les `interface` de lignes n'ont
  pas de signature d'index. L'appel passe par un adaptateur typé par `Args` ; typer le client entier
  est un chantier à part ([backend.md](../backend.md#ce-quil-faut-savoir-avant-dêtre-surpris)).
- **L'API push d'Expo répond aux navigateurs sans en-tête CORS** : mesuré par `OPTIONS` et `POST`
  depuis l'origine de la console. D'où la fonction.
- **Sous Expo Go, `expo-notifications` ne s'importe pas sur Android.** Son émetteur de jetons lève
  au lieu d'avertir — un `throw` sur Android, un `console.warn` sur iOS — et l'exception remonte au
  chargement des modules : l'application ne démarre plus du tout. Mesuré sur Android le 2026-09-08,
  en confiant le test à un second testeur. Le module se charge donc en **import dynamique**, après la
  garde `isRunningInExpoGo()`, et la réception n'arme rien sous Expo Go. La leçon dépasse ce jalon :
  une garde qui protège un **appel** ne protège pas un **import**, et sur Android la différence est
  entre une capacité absente et une application morte.
- **La permission n'est jamais demandée par le dépôt** : elle l'est par l'interrupteur des rappels
  ou celui des messages, dans les Réglages, comme toutes les permissions du dépôt
  ([plateforme.md](../plateforme.md#permissions)).
- **Une notification ouverte passe devant la règle de présentation** : le message se montre en
  feuille même déjà vu, même si un incident plus pressant existe. C'est ce que l'utilisateur a
  touché.

## Dépendances

[6.1.x-D](6-1-x-d-calendriers-du-telephone.md) — le ciblage par plateforme, que la fonction
applique.

## Plan de test sur appareil

Sur le **build de développement** (jamais Expo Go), Metro lancé sur le poste.

1. **Le dépôt.** Lancer, accepter la permission de notifications si elle est demandée ; À propos,
   sept touchers, Testeur : « push : depose », le jeton abrégé, le campus et la version. Dans la
   console, page Jetons push : la ligne. Relancer : « inchange ».
2. **L'envoi.** Console, Messages, un `info` enregistré, « Notifier », confirmer : la réponse dit
   « 1 appareil visé, 1 accepté » ; « Notifié le » se remplit ; l'application **fermée**, la
   notification arrive en quelques secondes. La toucher : l'application s'ouvre sur la feuille du
   message ; « Compris » le marque vu.
3. **Une fois.** « Notifier » à nouveau : refusé, « déjà notifié ».
4. **Le ciblage.** Un message `plateformes = {android}` notifié : la réponse dit « 0 appareil
   visé », rien n'arrive. Un message `audience = testeurs` : arrive si l'appareil est testeur.
5. **L'interrupteur.** Réglages, Notifications, couper « Messages de service en notification » : la
   page Jetons push ne montre plus la ligne ; un envoi vise 0 appareil. Rallumer : la ligne revient.
6. **Le campus.** Basculer d'établissement : la ligne change de campus sans relance.
7. **L'application ouverte.** Un envoi pendant que l'application est au premier plan : la
   notification s'affiche (le gestionnaire l'y autorise) et, au retour au premier plan, le message
   se présente aussi par la règle habituelle.
8. **Le chemin dégradé.** Permission refusée dans les réglages du système : Testeur dit
   « sans-permission », rien n'est déposé, aucune erreur. Sous Expo Go : « expo-go ».

## Ce que la vérification sur iPhone a corrigé (2026-09-08)

**Le protocole est joué et clos : huit points sur huit, et les deux corrections revérifiées dans la
foulée** — la colonne Campus de la page Jetons push suit la bascule d'établissement sans relance, la
rangée et son interrupteur tiennent dans la carte, et une **installation neuve demande la permission
d'elle-même**, sans toucher aucun interrupteur. Six points étaient passés du premier coup ; deux ont
produit une correction, ci-dessous.

**La permission n'était jamais demandée, et le défaut est plus ancien que ce jalon.** Les deux
interrupteurs de notification sont actifs par défaut ; aucun code ne demandait la permission tant
qu'on n'en touchait pas un. Il fallait éteindre puis rallumer pour que l'invite système paraisse —
autrement dit, **personne ne recevait de rappel de cours** non plus, depuis toujours, sauf à avoir
joué avec l'interrupteur. L'entretien la demande désormais une fois, quand elle n'a jamais été
demandée, jamais pendant l'accueil et jamais après un refus ; la fin du parcours d'accueil est le
premier instant où elle peut paraître. La règle « au moment de l'usage » de
[plateforme.md](../plateforme.md#permissions) porte maintenant son exception, avec sa raison.

**La demande paraît tôt, et c'est voulu** : l'abonnement à la fin du parcours d'accueil la déclenche
dès que celui-ci se termine, donc à la première ouverture utile de l'application. Sur une
installation neuve menée rapidement, elle se lit comme une invite « au lancement » ; c'est le premier
instant où elle est acceptable, et le seul qui garantisse qu'elle soit vue.

**Un libellé long poussait l'interrupteur hors de la carte.** `SettingsButton` interdisait au
libellé de céder — décision juste face à une **valeur texte**, qui l'écrasait jusqu'à une lettre par
ligne. Face à un **interrupteur**, dont la largeur est fixe, la règle s'inverse : rien ne peut
écraser le libellé, et un libellé qui ne cède pas déborde. Il prend désormais l'espace restant, et
le libellé de la rangée est raccourci à « Messages de service » — le sous-texte porte le détail.

Les six autres points, tels que mesurés : la notification arrive application fermée et l'ouvre sur la
feuille ; un second envoi est refusé (« déjà notifié ») ; un message ciblé `android` vise zéro
appareil ; l'interrupteur coupé aussi ; la notification s'affiche également application ouverte ; et
avec la permission refusée, le message reste visible **dans** l'application — bandeau et feuille —
sans notification système, ce qui est exactement la répartition voulue entre les deux canaux.

## Ce que la relecture de la branche a corrigé (2026-09-08)

Une revue adversariale du travail non commité, avant release, a trouvé **neuf défauts**. Les cinq qui
comptaient touchaient tous la fonction d'envoi ou la réception, et aucun n'était visible sur un
appareil de test — ils demandaient un parc, une panne ou deux onglets.

1. **Un message était marqué envoyé même quand rien n'était parti.** Le marquage suivait la boucle
   d'envoi sans regarder son résultat : une panne passagère d'Expo, et le message devenait
   définitivement non renvoyable — le bouton disparaît, la fonction répond 409. Pour un incident,
   c'est exactement le cas où l'on veut réessayer. La fonction **réserve** désormais le message avant
   d'envoyer et **rend sa réservation** si aucune notification n'est partie.
2. **La réservation corrige aussi le double envoi.** La lecture et l'écriture encadraient tout
   l'envoi : deux onglets de la console, ou deux éditeurs, notifiaient le parc deux fois. Le
   `update` conditionnel ne laisse passer que le premier.
3. **Les jetons étaient lus sans pagination.** PostgREST borne ses réponses ; au-delà de ce plafond,
   le reste du parc n'aurait jamais été notifié, sans une ligne d'erreur nulle part. Lecture page par
   page, dans un ordre stable.
4. **La feuille demandée par une notification perdait contre la règle de présentation.** Un incident
   non lu en attente, et toucher la notification d'une information ouvrait la feuille de l'incident ;
   la demande était consommée et perdue. Ce que l'utilisateur touche passe maintenant devant, et la
   demande n'est pas consommée pendant le parcours d'accueil, où rien ne s'affiche.
5. **Un message d'erreur d'Expo cite le jeton qu'il refuse** : il est nettoyé avant de remonter à la
   console, et les erreurs sont dédupliquées.

Quatre autres, plus petits, dans la même passe : la vue semaine restait sur son écran d'échec quand
on cochait un calendrier (elle n'a pas de relecture au focus) ; `shouldShowAlert` est déprécié et
avertissait à chaque notification reçue au premier plan ; et **les deux interrupteurs de
notification s'allumaient même quand la permission venait d'être refusée** — un interrupteur allumé
qui ne peut rien recevoir ment, ils renoncent et le disent. Le dernier point est antérieur au jalon.

La revue a par ailleurs **validé** ce qui portait le plus de risque : les projections du Planning sur
des entrées réelles des deux plateformes, l'égalité des deux copies de la règle de ciblage, le
chargement dynamique du module de notifications, et l'absence de régression sur la synchronisation
et les rappels.

## Limites écrites

- **Rien ne se teste sous Expo Go** : chaque itération demande un build de développement.
- **Android demande des identifiants FCM** sur EAS (un compte de service Firebase) ; à poser à la
  vérification Android de [Z](6-1-x-z-sortie.md).
- **La réception n'est pas prouvée.** `notifies` compte les appareils visés, les tickets disent ce
  qu'Expo a accepté, pas ce qui a été affiché.
- **Le corps de la notification est la première ligne du message**, bornée à 180 caractères.
- **Un message ne se notifie qu'une fois, et ça ne se rattrape pas** : la console le dit avant.
- **Le push ne remplace pas les messages dans l'application**, et ne le fera pas : une notification
  est éphémère et suppose une permission ; le bandeau, la feuille et la pastille d'incident sont le
  seul canal qui atteint **tout le monde**, persiste tant que le message dure, et fonctionne hors
  ligne depuis le cache. Le push est une **porte d'entrée** vers la feuille, pas un canal parallèle —
  c'est pour cela qu'il l'ouvre au lieu d'afficher son propre texte.
