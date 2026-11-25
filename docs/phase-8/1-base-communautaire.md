# Lot 1 — La base communautaire

> **Livré le 2026-11-25** (base, fonction, module, sans écran), sur `prochaine-version`, pour la 7.0.
> La migration `20261125020000_communaute.sql` est **en production**, recettée d'abord en transaction
> annulée sur la production (quatre-vingt-six vérifications), puis rejouée sans elle une fois appliquée ; la
> production est identique à la vue lisible, empreinte comparée. La fonction `communaute` est
> **déployée** et sondée par l'API publique ([plan de test](#plan-de-test)). Le build de
> développement Android (`183d6bbb-edfc-42fb-934c-7039b2deba23`) porte `@expo/app-integrity` ; le banc
> a joué le chemin dégradé. **Reste** : le chemin attesté sur un iPhone et sur la piste de test
> interne ([le protocole](#le-protocole-sur-téléphone)), et Play Integrity, que Kylian configure
> ([ce qu'il faut créer](#ce-que-kylian-doit-créer-pour-play-integrity)) — d'ici là, aucune
> contribution Android ne compte.

> **Ouvert le 2026-11-25.** Le socle de tout ce que les lots 2 à 4 font écrire aux étudiants :
> l'identité d'un appareil attesté, une seule porte d'écriture, les plafonds, la réputation, le modèle
> d'état d'un lieu, la lecture du jour. Aucun écran : les lots suivants s'en chargent. Le cadre est
> celui du [plan de la phase](README.md#ce-que-les-spécifications-devront-tenir), que cette
> spécification ne rouvre pas.

## La direction

Un étudiant qui signale « fermé » ou « ça attend » parle à tous les autres. Sans compte, la seule
chose qui sépare sa voix d'un script est l'appareil : un iPhone dont Apple atteste l'application,
un Android dont Google Play atteste l'application et l'intégrité. Tout ce qui s'écrit passe donc
par **une fonction qui vérifie cette attestation**, puis par **une fonction SQL réservée au
`service_role`** qui juge les plafonds et le poids de la voix. La base garde la confiance —
plafonds, réputation, poids —, que l'appareil ne peut pas s'accorder ; l'appareil calcule l'état
d'un lieu, que la base ne calcule pas ([backend.md](../backend.md#ce-que-la-base-est-et-ce-quelle-nest-pas)).
Et la lecture reste anonyme : tous les signalements du jour, triés sur l'appareil.

## Ce qui est à faire

### 1. Le modèle de données

Une migration, [`20261125020000_communaute.sql`](../../supabase/migrations/20261125020000_communaute.sql),
additive : cinq tables neuves, une table de configuration, trois portes réservées au `service_role`,
une purge horaire, des politiques.

| Table | Ce qu'elle porte |
|---|---|
| `sujets` | le vocabulaire fermé : un sujet (`restaurant.ferme`), sa nature (`signalement` ou `vote`), son domaine (ce que désigne la cible), sa famille de durée, ses valeurs permises (une liste, ou une forme pour un choix lu ailleurs, comme un plat du menu) ; les lots 2 à 4 y ajoutent leurs lignes par migration |
| `appareils` | la clé serveur, sa nature (`app_attest` ou `secret`), la plateforme, la clé publique et l'environnement App Attest, le compteur des assertions, la réputation, la dernière attestation, le blocage |
| `signalements` | une voix sur une cible : sujet, cible, valeur, fin (pour un état daté), poids, statut (`active`, `remplacee`, `masquee`), création, borne de validité, version de ligne, appareil, première confirmation |
| `votes` | un bulletin par appareil, sujet et cible (sondages, « moi aussi »), **sans identifiant** : le bulletin porte un HMAC de la clé de l'appareil, du sujet et de la cible, sous une clé que la fonction seule détient — de quoi refuser un second bulletin, rien pour relier deux votes ni un vote à un appareil, comme le plan le veut pour la boîte à idées ; aucune lecture publique avant le lot 4 |
| `empreintes_ip` | par empreinte d'adresse et par jour de Paris : les demandes, les verdicts Play Integrity demandés à Google, les contributions non attestées |
| `private.reglages_communaute` | les plafonds, seuils, poids et durées, hors de l'API et hors du dépôt |

La cible d'un signalement est l'identifiant du lieu **chez sa source**, comme pour `visuels` : le code
Croustillant d'un restaurant, l'identifiant Affluences d'une bibliothèque, `<établissement>/<code>`
pour un bâtiment — la [limite de `visuels`](../backend.md#le-schéma) (un code n'a de sens que chez son
établissement) est réglée ici dès le départ.

### 2. Le parcours d'une écriture

1. L'application demande un **défi** à la fonction [`communaute`](../../supabase/functions/communaute/index.ts) :
   l'instant, seize octets de hasard, leur HMAC. Il ne s'écrit nulle part et vaut cinq minutes.
2. Elle écrit le **texte exact** de sa contribution — le défi, sa clé serveur, le sujet, la cible, la
   valeur, la fin, `essai` ([`serialiserDonnees`](../../src/shared/communaute/donnees.ts)).
3. Elle le **prouve** : sur iOS, une assertion App Attest de ce texte ; sur Android, un jeton Play
   Integrity dont le `requestHash` est le SHA-256 de ce texte ; sinon, rien.
4. La fonction vérifie le défi et le lien entre la clé annoncée et le texte ; elle **compte
   l'adresse** (`public.admettre`) avant toute vérification coûteuse — un jeton Play Integrity ne part
   chez Google que sous le plafond des verdicts de l'adresse —, puis vérifie la preuve, en tire
   `atteste`, et appelle `public.contribuer` avec la clé de service.
5. `contribuer` applique au non attesté le plafond de son adresse puis celui de tout le parc, avant de
   créer quoi que ce soit, verrouille l'appareil, fait monter son compteur, juge le blocage, son plafond, le
   poids, puis — sauf en essai — le vocabulaire ; elle écrit, remplace la voix précédente du même
   appareil sur le même sujet et la même cible, et crédite la réputation des voix concordantes. Un
   interblocage entre deux contributions qui se confirment l'une l'autre se rejoue une fois.
6. La réponse est rangée ([`lireResultat`](../../src/shared/communaute/donnees.ts)) : acceptée, refusée
   (définitif), à refaire (la clé App Attest à réenregistrer, une fois), en échec (à rejouer).

`essai` joue les étapes 1 à 5 jusqu'au poids, sans rien publier ni créer d'appareil : le menu de
développement s'en sert pour juger le chemin sans écran, et le protocole sur téléphone pour juger
l'attestation.

### 3. La clé serveur d'un appareil

- **iOS avec App Attest** : l'identifiant de la clé attestée, l'empreinte SHA-256 de sa clé publique.
  La clé naît dans la Secure Enclave, s'atteste une fois (`enregistrer`), puis signe chaque
  contribution ; elle ne survit ni à une réinstallation ni à une restauration.
- **Android, et un iPhone sans App Attest** : l'empreinte SHA-256 d'un secret de 32 octets tiré sur
  l'appareil, gardé au trousseau (`UKIT_COMMUNAUTE_SECRET`), envoyé avec chaque contribution. La base
  ne garde que l'empreinte. Une marque d'installation dans AsyncStorage le fait remplacer après une
  réinstallation, même sur iOS où le trousseau survit à la désinstallation. Le jeton Play Integrity
  est lié à ce secret par le texte qu'il atteste : il ne se transporte pas d'une clé à une autre.
- **Jamais l'identifiant d'installation**, que [PRIVACY.md](../../PRIVACY.md) garde sur l'appareil.
- Une réinstallation fait une autre clé : la réputation repart de zéro, comme le plan le veut.

### 4. L'attestation et son repli

**App Attest**, d'après « Validating apps that connect to your server » d'Apple, dans
[`appattest.ts`](../../supabase/functions/communaute/appattest.ts). À l'enregistrement : la chaîne
jusqu'à la racine « Apple App Attestation Root CA », épinglée, chaque certificat dans sa période ; le
nonce `SHA-256(authData ‖ SHA-256(défi))` dans l'extension `1.2.840.113635.100.8.2` ; l'identifiant
de la clé égal à l'empreinte de son point public ; `rpIdHash` égal à l'empreinte de
`<équipe>.com.bordeaux.ukit` ou de `<équipe>.com.bordeaux.ukit.dev` ; un compteur à zéro ; l'AAGUID
de production ou de développement. À chaque contribution : la signature ECDSA sur le nonce, l'application,
un compteur qui dépasse le dernier accepté — la base refait cette comparaison sous verrou.

**Play Integrity**, demande standard : le jeton déchiffré par `decodeIntegrityToken` avec le compte de
service ([`google.ts`](../../supabase/functions/communaute/google.ts)), puis
[`evaluerVerdict`](../../supabase/functions/communaute/regles.ts) : le paquet du store, le `requestHash`
attendu, un verdict de moins de cinq minutes, `PLAY_RECOGNIZED` et `MEETS_DEVICE_INTEGRITY`. Un jeton
rejoué revient de Google avec des verdicts vides : il tombe en « non attesté ».

**Le repli.** Une contribution non attestée — un émulateur, un build de développement Android, un
appareil sans services Google ou dont Google refuse l'intégrité, Google injoignable ou son plafond de
verdicts atteint, aucun compte de service — **passe**, sous un plafond bas par appareil, un plafond par
adresse et un plafond de tout le parc par jour, avec un poids nul : elle s'affiche en retrait, ne compte
jamais comme voix, ne confirme rien et n'est confirmée par rien. Un verdict Play Integrity négatif se
replie ainsi, parce qu'un vrai téléphone peut l'obtenir ; une preuve App Attest **fausse** — une
assertion qui ne vérifie pas, une attestation refusée — est refusée, parce qu'aucun iPhone honnête ne la
produit.

### 5. Les plafonds et la réputation

Des mécanismes ; les valeurs vivent dans `private.reglages_communaute`, posées hors du dépôt
([supabase/README.md](../../supabase/README.md#la-communauté)). Une clé absente fait échouer
l'écriture au lieu de la laisser sans borne.

- **Par appareil et par jour** (signalements et votes) : `plafond_appareil_atteste`, et
  `plafond_appareil_non_atteste`, bas.
- **Pour tout le parc non attesté, par jour** : `plafond_non_attestes_jour` — un flot venu de
  nombreuses adresses ne noie pas l'écran.
- **Par adresse et par jour** : `plafond_ip_jour`, haut — un amphi sort par une seule adresse ;
  `plafond_ip_non_attestes_jour`, pour qu'une seule adresse ne vide pas le plafond du parc ;
  `plafond_verdicts_ip_jour`, pour qu'un script n'épuise pas le quota Play Integrity de tout le parc.
- **La réputation** : un point quand une voix attestée est confirmée par la voix attestée concordante
  d'un autre appareil, **un point par jour au plus** — « souvent confirmé » veut dire confirmé des jours
  différents, et deux appareils qui se confirment en boucle n'y gagnent qu'un point par jour chacun. Un
  appareil est **fiable** quand sa réputation atteint `seuil_fiable` et qu'il a au moins
  `anciennete_fiable_jours` : sa voix pèse deux. Un vote ne pèse jamais plus d'une voix.
- **Les durées** : un signalement du jour vaut jusqu'à minuit à Paris, un daté jusqu'au soir de sa
  fin (au plus `fin_max_jours`), un direct `duree_direct_minutes`, une correction
  `duree_correction_jours` au plus, avant sa validation par la console (lot 2).

### 6. L'état d'un lieu

[`etat.ts`](../../src/shared/communaute/etat.ts), pur, partagé avec la console. Pour un sujet sur une
cible : seules comptent les voix (attestées, actives, valables) ; la première établit l'état ; une
contraire le rend **incertain** ; la deuxième contraire, ou une seule d'un appareil fiable, le fait
basculer vers **la plus récente** ; une voix d'accord confirme et remet le compte à zéro. La
**confiance** baisse de moitié à chaque demi-vie de la famille depuis la dernière voix d'accord ; un
état qui dure, vieux d'une heure ou incertain, demande « toujours vrai ? » — une réponse est une voix
de plus, oui ou contraire. Le direct a sa durée d'écran, jamais au-delà de sa borne en base. Un
**message officiel** de la console sur le lieu prime ; l'état de la communauté reste calculé à côté.
Le « pour le plaisir » au classement — le plat recommandé — se compte au lot 2, sur les mêmes voix.

### 7. La lecture par l'application

`lireLesSignalementsDuJour` lit **tous** les signalements valables aujourd'hui, tous lieux confondus,
et l'application les trie : la base ne sait ni quel lieu l'étudiant regarde ni quel campus il a
choisi — la promesse de [PRIVACY.md](../../PRIVACY.md) (point 5) tient. Pas de filtre par campus non
plus pour une autre raison : un restaurant de Talence sert les trois établissements. La lecture ne
redemande que ce qui a bougé depuis la précédente — le curseur `maj_le`, avec deux minutes de
recouvrement — et garde le jour de Paris en cache (`communaute-signalements@1`) pour le hors-ligne.

### 8. Les durées de conservation

| Donnée | Durée | Comment |
|---|---|---|
| un signalement | trente jours après sa fin | la tâche horaire `communaute-purge` (pg_cron) |
| un appareil, sa réputation | douze mois après sa dernière contribution, s'il ne porte plus rien | idem |
| l'empreinte d'une adresse | son jour de Paris, effacée dans l'heure qui suit minuit : vingt-quatre heures au plus pour une empreinte du matin, vingt-cinq pour une de minuit | idem ; calculée sous une clé du jour tirée du secret de la fonction, deux jours ne se relient pas pour qui ne détient pas ce secret |
| un défi | jamais stocké | — |
| un vote | fixée au lot 4, avec les sondages | aucun vote n'existe avant ; il ne porte de toute façon aucun identifiant |

### 9. Ce que les documents du lot 7 devront dire

`PRIVACY.md` : la contribution (sujet, cible, valeur, heure) publiée sans l'appareil ; la clé serveur
et sa nature, le secret au trousseau, jamais l'identifiant d'installation ; la réputation et le poids
d'une voix ; les durées ci-dessus ; l'empreinte d'adresse, salée et changée chaque jour ; les demandes
d'attestation qu'Apple (App Attest) et Google (Play Integrity) reçoivent ; la lecture anonyme de tous
les signalements du jour. Le point 5 (« rien ne nous est envoyé hormis… ») et le point 6 s'amendent.
Les **règles de la communauté** : le vocabulaire fermé, les plafonds et le blocage d'un appareil
(sans les valeurs), la réputation et ce qu'elle change, le signalement d'un abus (règlement sur les
services numériques, art. 14 et 16). Les fiches des stores : *App Privacy* et *Data safety* gagnent
le contenu publié par l'utilisateur et l'identifiant d'appareil propre à l'application.

## Décisions et pièges

- **`verify_jwt = false`** pour `communaute` ([config.toml](../../supabase/config.toml)) : la clé
  publiable (`sb_publishable_…`) n'est pas un JWT, et la vérifier n'ajouterait rien. La porte, c'est
  l'attestation, le défi, les plafonds.
- **La purge est une tâche horaire de pg_cron**, et non un geste à la main comme celles du journal et
  de la mesure : ce sont des données d'étudiants, et la durée promise ne doit dépendre ni d'un geste
  oublié ni d'une écriture qui vienne la déclencher. L'extension s'active par la migration, éprouvée en
  transaction annulée.
- **L'adresse se compte avant Google** : `admettre` passe avant le déchiffrement d'un jeton, qui coûte
  au quota de tout le parc ; sans cela, un script envoyant de faux jetons l'épuiserait d'une adresse.
- **Les votes ne portent aucun identifiant** : le plan le demande pour la boîte à idées, et un sondage
  n'en a pas plus besoin. Le jeton de vote suffit à « un vote par appareil ». Changer
  `COMMUNAUTE_SECRET` pendant un sondage rouvrirait le vote : ne pas le faire.
- **Un défi sans état**, signé par la fonction : aucune table, aucune écriture pour en obtenir un. Le
  rejeu se ferme ailleurs — le compteur App Attest sous verrou, la protection de Google pour Play
  Integrity, la voix unique par appareil, sujet et cible.
- **L'iPhone lève le drapeau AT dans ses assertions** sans y joindre de clé (37 octets, mesuré sur la
  fixture iOS 14.3) : la lecture des données d'authentification dépend de la nature du message.
- **Le module d'Expo hache le défi** : l'appareil signe `SHA-256(utf8(texte))`, et le serveur refait
  ce hachage sur le texte reçu. Le module se charge à la demande : un build sans lui n'atteste rien,
  sans planter au lancement.
- **Aucun droit App Attest ajouté** à `app.config.ts` : sans lui, un build signé en développement
  vise l'environnement de développement d'App Attest, et TestFlight comme l'App Store la production
  (documentation d'Apple, droit `appattest-environment`). Le serveur accepte les deux.
- **Le build de développement Android n'atteste jamais** : son paquet `.dev` n'est pas sur Google
  Play. Le chemin attesté se juge sur la piste de test interne.
- **`maj_le` ne bouge qu'avec le statut** : une confirmation, invisible au public, ne renvoie pas la
  ligne à tout le parc.
- **Les paquets de la fonction se résolvent deux fois** — `deno.json` en production, `node_modules`
  sous vitest — et [`deno-imports.test.ts`](../../supabase/functions/communaute/deno-imports.test.ts)
  garde les versions égales. `cborg` 7.0.0, `@peculiar/x509` 3.1.0 et `reflect-metadata` 0.2.2, que
  la seconde exige, sont des dépendances de développement : rien n'en part dans l'application.
- **La base garde la confiance, pas l'état** : plafonds, réputation et poids sont des gardes, comme
  `est_editeur()` ; aucune fonction ne calcule ce que l'écran affiche.
- **Les dates d'un appareil ne disent que le jour**, et celle d'un vote le jour de Paris : une heure
  exacte, écrite dans la même transaction qu'un vote, relierait le vote à l'appareil pour qui lit la
  console.
- **Une seule voix vivante par appareil**, sujet et cible : la suivante remplace la précédente. C'est
  ce qui permet au modèle de compter des voix sans connaître les appareils.

## Ce que les deux relectures ont corrigé

Une relecture du diff entier avant toute application, puis une contre-relecture des corrections :
aucun bloquant, sept défauts importants, tous corrigés avant la poussée.

- **Le quota Play Integrity s'épuisait d'une adresse** : le jeton partait chez Google avant tout
  plafond. `admettre` compte désormais l'adresse d'abord, et les verdicts à part.
- **Le plafond du parc non attesté se vidait d'une adresse**, un secret neuf par requête : un plafond
  par adresse passe avant, et un refus ne crée plus d'appareil.
- **La réputation se gagnait en boucle**, chaque republication remettant une ligne neuve à confirmer :
  un point par auteur et par jour au plus.
- **Les votes portaient la clé de l'appareil**, contre le plan : un jeton HMAC la remplace.
- **L'empreinte d'adresse survivait à une semaine sans écriture**, et la documentation disait une clé du
  jour qui n'existait pas : la tâche horaire de pg_cron, et une vraie clé du jour.
- **L'adresse venait peut-être d'un en-tête forgeable** : mesuré après le déploiement, un
  `X-Forwarded-For` ou un `X-Real-IP` forgés tombent sur la même empreinte, qui n'est pas celle
  d'« inconnue » — la plateforme pose l'adresse, le client ne la choisit pas. Les trois en-têtes de
  Cloudflare forgés ensemble sont refusés en amont (403).
- **Un vote se reliait à son appareil par l'heure** (introduit par la correction des votes) : les dates
  d'un appareil et d'un vote ne disent plus que le jour.

Et des mineurs : une garde qui laissait passer un champ absent, la pagination par décalage, le secret
d'iOS qui survivait à la réinstallation, une demande de minuit qui échouait, un crédit doublé par une
course, des commentaires et des phrases de documentation inexacts.

## Définition de « terminé »

- la migration en production, recettée d'abord en transaction annulée sur la production ;
- la fonction déployée, ses secrets posés ; un appel non attesté borné, une écriture d'`anon` refusée,
  mesurés par l'API publique ;
- le module de l'application, le modèle d'état testé, le bloc du menu de développement ;
- `tsc`, ESLint à zéro, `npm test`, la console construite, `expo export` des deux plateformes, la
  vérification de la fonction par Deno ;
- le build de développement Android installé sur le banc, le chemin dégradé joué ;
- les documents : ce fichier, [backend.md](../backend.md), [supabase/README.md](../../supabase/README.md),
  [donnees-et-persistance.md](../donnees-et-persistance.md), le registre ;
- le protocole sur téléphone écrit, et la liste de ce que Kylian doit créer pour Play Integrity.

## Plan de test

1. **En SQL, dans une transaction annulée sur la production**
   ([`recettes/communaute.sql`](../../supabase/recettes/communaute.sql)) : `anon` et un compte
   authentifié n'appellent aucune porte et n'écrivent dans aucune table ; une forme fausse ou un champ
   absent qui lèvent ; le poids nul du non attesté, ses trois plafonds — appareil, adresse, parc —, et
   aucun appareil créé par un refus ; le plafond des verdicts par adresse ; la voix attestée, sa
   confirmation, le crédit d'un point par jour au plus même en boucle, le poids deux du fiable ; le
   remplacement et le curseur ; l'enregistrement App Attest, le compteur rejoué ; le vocabulaire, la
   valeur, la forme, la fin ; le vote unique, sans clé d'appareil ; l'essai qui n'écrit rien ; le
   blocage ; le plafond par adresse ; la purge horaire et sa planification ; un réglage absent qui fait
   échouer ; la lecture publique sans l'appareil ni la confirmation, ni ligne d'hier ; l'éditeur qui lit
   tout, l'admin qui compte les appareils sans leur clé. Puis la vue lisible rejouée de même : l'état
   obtenu est identique à celui de la migration (une empreinte des colonnes, contraintes, index,
   politiques, privilèges, fonctions, déclencheurs et de la tâche planifiée).
2. **Par `npm test`** : la vérification App Attest sur l'attestation et l'assertion d'un vrai iPhone
   (fixture enregistrée), et sur une chaîne fabriquée pour la production ; le client Google sans
   réseau ; la frontière de la fonction, le défi, l'empreinte, le verdict sur la réponse de la
   documentation ; le modèle d'état règle par règle ; le cache et le résultat.
3. **Par l'API publique, après le déploiement** : un défi ; un essai non attesté (poids 0) ; un
   enregistrement à l'attestation fausse refusé ; une écriture directe d'`anon` dans les tables, et un
   appel des portes en RPC, refusés ; la lecture publique sans `appareil` ; l'adresse forgée sans effet.
4. **Sur le banc** (`ukit`, Android 15) : l'application démarre ; le menu de développement montre
   « aucune » attestation, l'essai rend « non attesté · poids 0 », la lecture du jour répond.

*Joué le 2026-11-25.* La recette SQL, quatre-vingt-six vérifications conformes en transaction annulée avec la
migration, puis sans elle une fois appliquée ; la vue lisible rejouée de même donne le même état (cent
quarante éléments, même empreinte), et la production aussi. `npm test` : 1 503 tests. Par l'API : le
défi, l'essai non attesté (200, poids 0), un sujet inconnu (422), le secret d'un autre appareil (401
`cle`), un défi forgé (401), une attestation fausse (401 — la fonction déployée charge donc ses
bibliothèques), une clé App Attest inconnue (409), les trois portes en RPC et les cinq tables en
écriture refusées à la clé publiable (42501), `select=appareil` et `select=*` refusés, la lecture
nommée rendant `[]`, `appareils` et `empreintes_ip` illisibles. Les sondes ont laissé en base un
appareil à secret (le sujet inconnu, qui crée l'appareil avant de juger le vocabulaire) et trois
empreintes du jour, effacées par la purge de la nuit suivante. Sur le banc, avec le build
`183d6bbb` : avant le déploiement, l'essai rendait « echec · defi » et la lecture « cache » sans
planter, le module natif absent d'un ancien build aussi ; après, « essai · non attesté · poids 0 » et
« ok · 0 signalements » ; réseau coupé, « echec · defi » et « cache ».
5. **Sur téléphone** : [le protocole](#le-protocole-sur-téléphone).

## Le protocole sur téléphone

**iPhone**, build de développement « UKit Dev » refait après ce lot, le module étant natif
(`npx eas-cli build -p ios --profile development`, avec la clé App Store Connect du poste,
[plateforme.md](../plateforme.md#le-build-de-développement--les-quatre-choses-qui-se-perdent)) :
1. Réglages → À propos → sept touchers sur la version → la bulle « UKit » → onglet Testeur, et
   faire défiler jusqu'au bloc « Communauté ». Attendu : « attestation : App Attest · clé à
   enregistrer ».
2. Toucher « Essai d'envoi ». Attendu, en quelques secondes : « essai · attesté · poids 1 », puis
   « App Attest · clé enregistrée ». Échec : « non attesté » (la clé n'a pas été enregistrée : lire le
   journal de la fonction, la raison y est) ou « échec · … ».
3. Toucher de nouveau « Essai d'envoi » : même résultat, sans nouvel enregistrement.
4. Dans le Studio, `select nature, environnement, compteur from appareils order by cree_le desc limit 1;`
   — attendu `app_attest`, `developpement`, un compteur de 2.

**Android**, sur un build de la piste de test interne installé depuis Google Play, une fois Play
Integrity configuré ([ci-dessous](#ce-que-kylian-doit-créer-pour-play-integrity)) : mêmes gestes ;
attendu « Play Integrity », puis « essai · attesté · poids 1 ». « non attesté » sur un appareil
certifié veut dire un verdict refusé : la raison est dans le journal de la fonction.

## Ce que Kylian doit créer pour Play Integrity

Tant que ce n'est pas fait, **aucune contribution Android ne compte** : elles passent en retrait.

1. **Google Cloud** : un projet — celui de Firebase, déjà lié à l'application, convient —, où
   l'**API Play Integrity** s'active (*APIs and services* → *Enable APIs and services*).
2. **Play Console** → UKit → *Protected with Play* → Play Integrity API → *Get started* → **Link
   Cloud project**, ce projet. Le lien ouvre le relèvement du quota et les verdicts facultatifs.
3. **Le numéro du projet** (pas son identifiant) dans `.env` et dans les variables EAS des trois
   environnements, sous `PLAY_INTEGRITY_PROJET`, en visibilité *plaintext* : un numéro, pas un
   secret. L'application le lit à la construction : un build de la piste de test interne le porte.
4. **Un compte de service** dans ce même projet, et sa clé JSON. La documentation de Google ne lui
   demande rien d'autre que d'appartenir au projet lié.
5. **Le secret de la fonction** :
   `npx --yes supabase@2.117.0 secrets set --project-ref owiksddeqcyyifnmpyqm PLAY_INTEGRITY_COMPTE_DE_SERVICE="$(cat cle.json)"`,
   puis effacer le fichier du poste. Aucun redéploiement : la fonction lit ses secrets au démarrage
   d'une instance.
6. **Le quota** : 10 000 préparations de jeton et 10 000 déchiffrements par jour par défaut
   (developer.android.com, « Set up »). Chaque contribution Android en coûte un de chaque ; à
   comparer à la croissance visée avant la sortie, et à faire relever par le formulaire de la Play
   Console (jusqu'à une semaine de délai).

Un build de production fait ensuite la preuve, sur la piste de test interne.

## Limites écrites

- **Une personne, plusieurs clés** : réinstaller — ou la remise à zéro complète du menu de
  développement, qui en tient lieu —, ou tirer un nouveau secret, fait un autre appareil attesté, sans
  réputation. Deux voix contraires d'une même personne peuvent ainsi faire basculer un
  état. Les plafonds par adresse et par jour, la réputation qui demande du temps, la modération et le
  blocage (lot 2) bornent l'abus ; Play Integrity a un rappel d'appareil (*device recall*) qui le
  fermerait mieux, à évaluer après la sortie.
- **La réputation ne fait que monter** dans ce lot ; la modération (lot 2) la retire et bloque.
- **La lecture publique montre les voix remplacées et masquées**, avec leur statut, pour que la
  lecture incrémentale apprenne qu'elles ne comptent plus. Deux conséquences : l'heure d'un remplacement
  relie deux voix successives du même appareil sur un même sujet et une même cible, ce jour-là ; une
  voix masquée reste lisible avec sa valeur. Le lot 2 décide si masquer efface la valeur publique.
- **Une clé App Attest remplacée** après un échec laisse sa dernière voix vivante jusqu'à son
  expiration : ce jour-là, le même iPhone peut avoir deux voix sur un même sujet et une même cible.
- **Un plafond du parc se dépasse de peu** : deux contributions simultanées d'appareils différents se
  comptent sans verrou commun. De même, deux confirmations simultanées de deux voix différentes d'un
  même auteur peuvent lui valoir deux points le même jour.
- **L'assemblage de la fonction** (`index.ts` : l'ordre de l'admission, le verdict sous plafond, le
  jeton de vote, la reprise d'un interblocage) n'a pas de test unitaire, Deno n'étant pas joué par
  `npm test` ; il se juge par les sondes de l'API publique après chaque déploiement.
- **Une lecture qui trouverait plus de mille lignes au même instant** s'arrêterait à la première page :
  aucune écriture de la fonction n'en produit, une ligne par transaction.
- **Le reçu App Attest** et sa mesure de risque ne sont pas lus.
- **Une contribution non attestée passe** : c'est le plan. Le plafond de tout le parc la borne, et son
  poids nul l'empêche de rien changer.
