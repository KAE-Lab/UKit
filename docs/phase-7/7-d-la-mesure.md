# 7-D — La mesure

> **Jalon livré (code, base, documentation) le 2026-09-21, sur la branche `v6.3`**, en premier, avant
> les lots du mouvement ([7-I](7-i-releve-et-vocabulaire.md), [7-J](7-j-ecrans.md)). La migration
> `20260921233000_mesures.sql` est **poussée en production** et la RPC **sondée par l'API anonyme** :
> un événement inconnu est ignoré et compté (`rejetes: 1`, aucune ligne), un lot de 201 est refusé,
> un lot qui n'est pas un tableau aussi, `mesures` et `evenements_connus` ne se lisent pas (42501), un
> lot valide rejoué incrémente `n` sans ligne en double, un jour à J−15, un `n` nul et une version
> illisible sont rejetés dans un lot dont la ligne valide passe ; les lignes de sonde ont été effacées.
> Portes : `tsc` vert, ESLint à zéro, 790 tests (quatre fichiers de plus). **Protocole joué sur les deux
> appareils le 2026-09-22**, Metro lu en direct et la base interrogée après chaque envoi : les huit
> points passent sur l'iPhone, et l'Android a trouvé un défaut, corrigé le jour même — la file
> soustraite après un lot accepté ne s'écrivait qu'une seconde plus tard, et une fermeture depuis les
> applications récentes dans cette seconde la faisait repartir. **Reste** : les fiches *App Privacy* et
> *Data safety* dans les consoles, avant la sortie. Ce que la mise en œuvre et le protocole ont corrigé
> est en fin de document.
>
> Publication : **6.3**, décidé le 2026-09-21 à la sortie de la 6.2.2 — la 6.2.3 n'existe plus
> ([README de la phase](README.md#les-publications)). Des compteurs anonymes, pour que l'équipe qui
> arrive — communication, partenariats, subventions — ait des chiffres à la sortie. La refonte n'a donc
> **pas de ligne de base** : la mesure commence avec elle, et ses premiers chiffres sont ceux auxquels la
> 6.4 et les campus se compareront. Le document de référence durable est [mesure.md](../mesure.md) ;
> celui-ci dit comment on l'a livré.
>
> **La seconde écriture de l'application vers la base**, après le jeton de notification de
> [6.1.x-E](../phase-6/6-1-x-e-notifications-push.md). Comme elle, c'est d'abord une décision de vie privée,
> écrite dans [PRIVACY.md](../../PRIVACY.md) avant d'être du code.

## La direction

UKit ne sait rien de son usage. Combien d'étudiants ouvrent l'application un jour de semaine, sur quel
campus, quel onglet ils regardent, si une annonce est vue et si son bouton sert : aucune de ces
questions n'a de réponse, et trois jalons en ont besoin tout de suite — la 6.3, qui doit pouvoir
dire si le mouvement a changé quelque chose ; la console, dont le tableau de bord n'a rien à montrer ;
et l'équipe, qui ne vend pas un emplacement qu'elle ne mesure pas.

Le parti est celui de toute la phase : **mesurer sans suivre**. Des nombres, jamais des personnes.
Aucun identifiant ne quitte l'appareil, aucun contenu saisi n'est compté, aucun horodatage n'est plus
fin que l'heure.

## Les décisions (2026-09-14)

| Question | Décision | Pourquoi |
|---|---|---|
| Un service tiers ou nos compteurs | **nos compteurs**, dans la base de publication | un SDK tiers ajoute un sous-traitant à `PRIVACY.md`, un identifiant de session et un quota d'événements ; la base, la console et le chemin d'écriture bornée existent déjà ([6.1.x-E](../phase-6/6-1-x-e-notifications-push.md)) |
| Quand | **dans la 6.2.3, avant la refonte**. *Amendé le 2026-09-21 : **dans la 6.3**, en premier sur sa branche* | une refonte mesurée après coup n'a rien à quoi se comparer. *Le 2026-09-21 : à trois semaines d'écart, la comparaison n'aurait rien dit, et une version courte de plus coûtait un cycle de stores pour trois semaines de données* |
| Consentement | **opt-out** : un interrupteur « Statistiques anonymes », actif par défaut | le cadre retenu est celui que la CNIL applique à la mesure d'audience exemptée de consentement — finalité limitée à la mesure, statistiques anonymes, aucun recoupement, conservation bornée, information et droit de s'y opposer. À relire avec l'équipe avant la sortie |
| Granularité | le **jour**, l'**heure** pour les sessions, les onglets et les échecs de source ; le campus, la version, la plateforme | assez pour lire un usage, pas assez pour suivre quelqu'un |
| Envoi | **groupé**, au passage en arrière-plan et à l'entretien ; **jamais au démarrage** | le démarrage ne dépend pas de la base ([backend.md](../backend.md#le-client-applicatif)) |

## Ce qui est fait

### La base

Une migration, `supabase/migrations/…_mesures.sql`, et sa vue lisible dans `schema.sql`,
`fonctions.sql` et `policies.sql`.

```sql
create table if not exists public.evenements_connus (
    evenement   text primary key,
    description text
);

create table if not exists public.mesures (
    jour       date        not null,
    heure      smallint    not null default -1 check (heure between -1 and 23),  -- -1 : le jour entier
    evenement  text        not null references public.evenements_connus (evenement),
    cle        text        not null default '' check (char_length(cle) <= 64),
    campus     text        not null default '' check (char_length(campus) <= 32),
    version    text        not null check (version ~ '^\d+\.\d+\.\d+$'),
    plateforme text        not null check (plateforme in ('ios', 'android')),
    testeur    boolean     not null default false,
    n          integer     not null default 0 check (n >= 0),
    maj_le     timestamptz not null default now(),
    primary key (jour, heure, evenement, cle, campus, version, plateforme, testeur)
);
```

**La colonne `testeur` est ajoutée à la rédaction de cette spécification** (2026-09-15) ; le plan ne la
portait pas. Sans elle, les premières semaines — faible volume, beaucoup d'essais sur les appareils de
l'équipe, des annonces d'audience `testeurs` — seraient mesurées avec le bruit de l'équipe dedans, sans
moyen de l'en retirer. C'est le booléen que le jeton de notification porte déjà, auto-déclaré, avec la
même limite.

**`compter(lots jsonb) returns jsonb`**, `security definer`, `set search_path = ''`, sur le modèle de
`deposer_jeton` ([`fonctions.sql`](../../supabase/fonctions.sql)) :

- **refuse** le lot entier s'il n'est pas un tableau, ou s'il dépasse **200** éléments ;
- **ignore et compte** (`rejetes`) chaque élément dont l'événement n'est pas dans `evenements_connus`,
  dont `n` sort de [1, 1000], dont le jour sort de [aujourd'hui − 14 jours, demain], dont la clé est
  trop longue ou la forme fausse ;
- sinon `insert … on conflict (…) do update set n = mesures.n + excluded.n, maj_le = now()` ;
- rend `{"comptes": k, "rejetes": r}`, le tout dans une transaction.

*Ignorer plutôt que rejeter* : un vieux client qui porterait un événement retiré du vocabulaire doit
pouvoir vider sa file, sinon il la renverrait pour toujours. `revoke execute … from public`,
`grant execute … to anon, authenticated`.

**Les politiques** : RLS sur les deux tables ; aucun privilège pour `anon` ; lecture pour les éditeurs
par `private.est_editeur()`. **Pas de déclencheur `journal`** : le journal trace ce que l'équipe publie,
pas ce que le parc compte, et le volume le noierait. **La purge** s'écrit dans
[`supabase/README.md`](../../supabase/README.md), non automatisée :
`delete from public.mesures where jour < current_date - interval '13 months'`.

L'adaptateur `appeler<F>()` de [`push/index.ts:43`](../../src/shared/push/index.ts) remonte dans
`src/shared/supabase/rpc.ts`, partagé par le push et la mesure ; `types.ts` déclare `compter`.

### Le client, `src/shared/mesure/`

| Fichier | Nature | Contenu |
|---|---|---|
| `vocabulaire.ts` | pur | `EVENEMENTS`, le vocabulaire fermé, avec la granularité de chacun et le validateur de sa clé ; `type Evenement` ; `cleValide` |
| `file.ts` | pur | une ligne `{ jour, heure, evenement, cle, campus, version, plateforme, testeur, n }` ; la fusion par clé ; la lecture défensive de `mesures@1` ; les lots de 200 ; la borne de 500 lignes, les jours les plus anciens partant d'abord ; `soustraire` après un envoi ; `jourEtHeure(date)` en heure locale |
| `session.ts` | pur | une session, et le dédoublonnage de ses impressions |
| `reglage.ts` | couture | l'interrupteur, sa clé `mesure-reglage@1`, ses abonnés |
| `index.ts` | couture | `compter(evenement, cle?)` synchrone, écriture différée ; `compterImpressions` ; `armerLaMesure` ; `envoyerLesMesures` ; `viderLaFile` ; l'état pour le menu de développement |

Tests : les trois modules purs, et **`migration.test.ts`**, qui lit la migration et vérifie que ses
`values` de `evenements_connus` égalent les clés d'`EVENEMENTS` — la même garantie que
[`regles.test.ts`](../../supabase/functions/notifier/regles.test.ts) pour le ciblage recopié. L'heure et
le contexte sont **reçus en paramètre** par les modules purs, comme `Temps.ts` le fait pour l'heure ; le
fuseau `Europe/Paris` de `vitest.config.ts` fixe `jourEtHeure`.

**Le vocabulaire v1**, avec ses lecteurs, est dans [mesure.md](../mesure.md#le-vocabulaire) : `session`,
`onglet.vu`, `annonce.impression`, `annonce.ouverture`, `annonce.action`, `resto.ouverture`,
`bu.ouverture`, `salles.ouverture`, `planning.jour`, `planning.semaine`, `scolarite.connexion`,
`source.echec`, `reglage.theme`, `reglage.langue`, `reglage.synchro`, `reglage.notifications`.

### L'armement

`armerLaMesure()` s'appelle dans [`App.tsx`](../../App.tsx), après `armerLEntretien()` (ligne 97), sans
`await` :

- au lancement et à chaque **vrai** retour au premier plan : une nouvelle session, et l'état des quatre
  réglages compté une fois ;
- au **passage en arrière-plan** : l'envoi. [`premierPlan.ts`](../../src/shared/services/premierPlan.ts)
  gagne `onPassageEnArrierePlan(abonne)`, un second jeu d'abonnés prévenus quand `AppState` émet
  `background` — sur le même abonnement système, qui voit déjà l'état brut ;
- à l'entretien, **sauf** d'origine `lancement` : l'envoi aussi, ajouté au bilan de
  [`entretien.ts`](../../src/shared/services/entretien.ts) ;
- par `onEchecDeRun`, que la 6.2.2 pose
  ([observateurs](7-c-economie-et-socle.md#3-létiquette-envers-celcat)) : `source.echec`, clé
  `<hôte>:<famille>`.

**Jamais de réseau au démarrage.** Et rien n'est compté si la plateforme est inconnue ou la version
illisible, ce que [`contexteDeCiblage()`](../../src/shared/ciblage/contexte.ts) dit déjà.

### Les points de comptage

| Événement | Où |
|---|---|
| `onglet.vu` | `screenListeners` (`focus`) sur le `Tab.Navigator` de [`MainTabNavigator.tsx`](../../src/shared/navigation/MainTabNavigator.tsx), ligne 349 |
| `annonce.impression` | `onViewableItemsChanged` et `viewabilityConfig` — 50 % visibles pendant une seconde — passés par [`CarrouselDeSection`](../../src/features/Campus/Dashboard/components/CarrouselDeSection.tsx) et [`CampusListLayout`](../../src/features/Campus/components/CampusListLayout.tsx), fournis par [`BdeSection`](../../src/features/Campus/Dashboard/components/BdeSection.tsx) et [`BdeScreen`](../../src/features/Campus/Bde/BdeScreen.tsx) ; dédoublonnés par session |
| `annonce.ouverture`, `annonce.action` | [`BdeDetailsScreen`](../../src/features/Campus/Bde/BdeDetailsScreen.tsx) : au montage, et dans `handlePressCTA` |
| `resto.ouverture`, `bu.ouverture`, `salles.ouverture` | au montage de [`CrousMenuScreen`](../../src/features/Campus/Crous/CrousMenuScreen.tsx), [`LibraryDetailsScreen`](../../src/features/Campus/Library/LibraryDetailsScreen.tsx) et [`FreeRoomDetailsScreen`](../../src/features/Campus/FreeRoom/FreeRoomDetailsScreen.tsx) |
| `planning.jour`, `planning.semaine` | [`DayView`](../../src/features/Planning/views/DayView.tsx) : au montage, et dans `onSwitchToDay` et `onSwitchToWeek` (lignes 353-354) |
| `scolarite.connexion` | [`ScolariteSession.ts`](../../src/features/Scolarite/services/ScolariteSession.ts), autour de `jouer()` : `ok` sur `LOGIN_SUCCESS` (ligne 130), `echec` sur `LOGIN_FAILED` |

`DayView` est à 369 lignes effectives sur 400 : chaque appel y tient en une ligne, la logique reste dans
le module.

### Le réglage

**Un interrupteur « Statistiques anonymes », actif par défaut**, dans une section « Confidentialité »
des Réglages ([`SettingsSections.tsx`](../../src/features/Settings/components/SettingsSections.tsx)). Le
couper **vide la file locale** : rien de ce qui a été compté avant ne part. La réinitialisation le remet
actif.

*Décision de mise en œuvre, prise à la rédaction* : **le réglage vit dans le module de mesure**
(`reglage.ts`), pas dans `SettingsManager`. [`AppCore.tsx`](../../src/shared/services/AppCore.tsx) est à
**397 lignes effectives sur 400** (mesuré le 2026-09-15), et un réglage de plus y coûte une dizaine de
lignes ; surtout, un module qui porte sa donnée, son réglage et sa purge **se retire d'un bloc**, comme
la table `visuels`. `resetSettings` appelle `reinitialiserLaMesure()`, en une ligne.

Clés des trois dictionnaires ([i18n.md](../i18n.md)) : `PRIVACY_SECTION`, `ANONYMOUS_STATS`,
`ANONYMOUS_STATS_DESC`. Un panneau `ModMenuMesure.tsx` dans le menu de développement : la taille de la
file, le dernier envoi, « Envoyer », « Vider ».

### La confidentialité et les stores

**`PRIVACY.md` gagne un point 4 quinquies.** Texte proposé, dans le ton du document, et sans tiret
cadratin — la règle de la voix éditoriale pour tout ce que lisent les utilisateurs :

> **4 quinquies. Les statistiques d'usage anonymes**
> Pour savoir ce qui sert et ce qui ne sert pas, l'application compte quelques gestes : une ouverture,
> un onglet affiché, une annonce vue ou ouverte, un restaurant consulté, une source universitaire qui
> n'a pas répondu. Ce qui part vers notre base de publication, ce sont **des nombres**, regroupés par
> jour (par heure pour les ouvertures), par campus, par version de l'application et par plateforme, et
> selon que l'appareil fait partie des testeurs ou non. **Aucun identifiant** : ni celui de l'appareil,
> ni le jeton de notification, ni votre compte universitaire, ni rien de ce que vous écrivez. Ces nombres
> partent quand l'application passe en arrière-plan, jamais à son ouverture.
> L'interrupteur **« Statistiques anonymes »** des Réglages est allumé par défaut ; le couper arrête le
> comptage et efface ce qui attendait d'être envoyé. Les nombres sont conservés **treize mois**, puis
> supprimés. Comme pour toute requête, l'adresse IP de l'appareil transite jusqu'à notre hébergeur, dont
> les journaux techniques la gardent le temps de leur rétention ; nous ne la stockons pas.

Les points 5 (« Diagnostic et suivi de bugs ») et 6 (« Conservation des données ») sont amendés : aucun
outil de suivi tiers, des compteurs à nous, décrits au point 4 quinquies.

**Les fiches des stores** : App Store, *App Privacy*, « Usage Data → Product Interaction », finalité
*Analytics*, **not linked to you**, pas de *tracking*. Google Play, *Data safety*, « App activity → App
interactions », collectée, **non partagée**, **facultative**, finalité *Analytics*.

### Le dénominateur, qui existe déjà

La table `jetons_push` est redéposée tous les sept jours par chaque appareil qui garde les notifications
actives ([pilotage.md](../pilotage.md#les-messages-en-notification-push)) : elle donne **le parc actif**
par campus, version et plateforme, sans une ligne de code. C'est le dénominateur des taux ;
[mesure.md](../mesure.md#lire-les-chiffres) donne la requête.

### La documentation

[mesure.md](../mesure.md), écrit par la mise à plat et amendé à la livraison ;
[pilotage.md](../pilotage.md) ; [backend.md](../backend.md), « la seconde écriture de l'application » ;
[donnees-et-persistance.md](../donnees-et-persistance.md#clés-asyncstorage), `mesures@1` et
`mesure-reglage@1` ; [settings.md](../features/settings.md) ; `supabase/README.md`, la purge ;
`CHANGELOG.md`.

## Décisions et pièges

- **`viewabilityConfig` et `onViewableItemsChanged` gardent leur identité** : React Native lève
  « Changing viewabilityConfig on the fly is not supported ». Constantes de module et `useRef`.
- **Android ne garantit pas `background`** quand on ferme l'application depuis les applications
  récentes : la file part à la session suivante. Perte acceptée, écrite.
- **Le cycle d'import** : la mesure s'abonne aux échecs par `observateurs.ts` ; `runBlueprint`
  n'importe jamais la mesure.
- **`resultat.error` de supabase-js se teste explicitement**, et `n` reste un entier.
- **`mesures` n'est pas une table publiable** : pas de journal, pas d'écriture depuis la console.
- **Le statut de testeur est auto-déclaré**, comme pour le jeton : un appareil qui se dirait testeur à
  tort sortirait de la mesure « hors équipe ».

## Dépendances

[7-C](7-c-economie-et-socle.md) : `observateurs.ts`, les migrations numérotées, `verifier.yml`.

Si le campus Bordeaux Montaigne est en ligne à la sortie, la 6.3 l'**embarque**, comme
l'[étape 9](../adaptation-campus.md#9-à-la-release-suivante) le demande
([l'ordre de la phase](README.md#les-jalons-et-leur-ordre)).

## Plan de test

Sur un build de développement, les deux appareils.

1. **Le lancement.** Le panneau Mesure montre `session` et les quatre `reglage.*` ; les journaux du
   projet ne montrent **aucun** appel `compter` à l'heure du lancement.
2. **Les impressions.** Faire défiler lentement le carrousel : une impression par annonce ; revenir en
   arrière : pas de seconde ; retour au premier plan : nouvelle session, les impressions recomptent.
3. **L'envoi.** Passer en arrière-plan : `select * from public.mesures order by maj_le desc limit 20`
   montre des lignes agrégées ; recommencer : `n` s'incrémente, aucune ligne en double.
4. **L'interrupteur.** Le couper : file vide, rien n'arrive après un passage en arrière-plan. Le
   rallumer : le comptage reprend.
5. **Hors ligne.** `SUPABASE_URL=https://127.0.0.1:1` : la file grossit et reste bornée à 500 lignes ;
   base rendue, elle se vide à l'entretien du retour.
6. **La RPC.** Par `curl` avec la clé publiable : un événement inconnu rend `rejetes: 1` et aucune
   ligne ; un lot de 201 est refusé ; un `select` sur `mesures` est refusé.
7. **Les testeurs.** Sur un appareil enregistré testeur, les lignes portent `testeur = true`.
8. **L'egress.** Le coût d'un envoi, quelques kilo-octets, ne se voit pas dans le tableau Usage.

## Ce que la mise en œuvre a corrigé (2026-09-21)

Le texte ci-dessus est celui de la spécification ; la réalité l'a corrigé en huit endroits, et le code
fait foi.

1. **La RPC s'appelle `compter(p_lots jsonb)`**, avec le préfixe `p_` de `deposer_jeton` — la
   spécification écrivait `lots`. En `plpgsql`, chaque élément est jugé dans son propre sous-bloc
   `begin … exception when others` : une date illisible ou un `n` non entier ne fait pas échouer le
   lot, l'élément est compté dans `rejetes`.
2. **Les impressions passent par un hook**, `useImpressionsDAnnonces()` de
   [`impressions.ts`](../../src/shared/mesure/impressions.ts), et non par un simple couple de props :
   React Native ne rappelle pas `onViewableItemsChanged` quand l'ensemble visible n'a pas changé, donc
   « retour au premier plan : les impressions recomptent » (plan de test, point 2) serait faux sans un
   registre de ce que chaque liste **focalisée** montre, recompté à chaque session. `CarrouselDeSection`
   et `CampusListLayout` gagnent les deux props, comme prévu ; `BdeSection` et `BdeScreen` les
   reçoivent du hook. Limite écrite : sur le tableau de bord, la visibilité se juge dans le carrousel,
   pas dans la page ([mesure.md](../mesure.md#limites-connues)).
3. **`reinitialiserLaMesure()` vit dans `reglage.ts`**, et `AppCore` l'importe de là, jamais de
   l'index — l'index importe `AppCore` pour lire les quatre réglages, l'inverse bouclerait. AppCore
   passe de 398 à **400** lignes effectives, la limite incluse. Réinitialiser remet l'interrupteur
   actif ; la file n'est pas vidée — elle l'a été si l'interrupteur était coupé.
4. **La section Confidentialité est autonome** : `ConfidentialiteSection` lit et écrit le réglage par
   le hook `useMesureActive()` ; `SettingsScreen`, à 373 lignes effectives, ne gagne qu'une ligne de
   JSX. Placée après Notifications, avant Lancement — décision de Kylian, à côté de l'autre chose qui
   quitte l'appareil.
5. **Le panneau du menu de développement est un bloc**, `ModMenuMesure.tsx`, au bas de l'onglet
   Testeur, à côté du jeton push : la barre n'a pas la place d'un sixième onglet.
6. **`migration.test.ts` vérifie un sous-ensemble, pas une égalité** : chaque clé d'`EVENEMENTS` est
   insérée par une migration, et la vue lisible `schema.sql` porte le même ensemble que l'union des
   migrations — parce qu'un événement retiré du vocabulaire garde sa ligne (règle de
   [mesure.md](../mesure.md#la-règle--une-mesure-sajoute-avec-son-pourquoi-et-son-lecteur)). Le
   format est contraint : un tuple `('evenement', 'description'),` par ligne.
7. **Les routes des onglets** sont `PlanningTab`, `CampusTab`, `ScolariteTab`, `SettingsTab` ; la table
   `ONGLETS` de `vocabulaire.ts` les traduit en `planning`, `campus`, `scolarite`, `reglages`, et le
   focus initial compte l'onglet du lancement. `LOGIN_FAILED` n'est pas un événement du flux mais un
   échec nommé : `echec` se compte dans `jouer()` par `demandeUneRessaisie(run.failure)`.
8. **L'envoi est sérialisé** — un seul en cours, comme l'entretien —, par lots dans l'ordre, arrêt au
   premier échec, et la file est soustraite à chaque lot accepté, **lignes rejetées comprises** : une
   ligne que la base refuse ne se représente pas. Une réponse perdue après un lot accepté compte deux
   fois — pas d'idempotence côté base, par choix de simplicité ; limite écrite. L'horloge est la
   réelle, pas l'heure simulable : une mesure est une trace (règle de `Temps.ts`).

Et deux précisions sans écart : `package.json` reste en 6.2.2 sur la branche, le numéro se pose à la
sortie — les lignes de test portent `6.2.2` et `testeur = true` ; la file s'écrit sur le disque au plus
une fois par seconde, pas seulement au passage en arrière-plan, parce qu'Android peut tuer sans lui.

## Ce que le protocole sur appareil a corrigé (2026-09-22)

Joué avec Metro lu depuis le poste et la base interrogée après chaque envoi, iPhone 13 Pro puis
Galaxy A8, huit annonces de test ciblées `testeurs` insérées le temps du protocole puis supprimées.

- **L'iPhone, huit points sur huit.** Le lancement compte la session, les quatre réglages, `planning.jour`
  et `onglet.vu planning`, sans envoi ; les impressions comptent une fois par carte et par session, et
  se recomptent au retour au premier plan pour les cartes encore à l'écran — mais pas quand on revient
  sur un autre onglet, la garde de focus tient ; les fiches, le bouton d'action et les vues du Planning
  comptent ; l'arrière-plan envoie, l'entretien du retour envoie, la base agrège sans doublon ;
  l'interrupteur coupé vide la file, `envoi inactif`, rien n'arrive, et rallumé le comptage reprend ;
  hors ligne (`SUPABASE_URL=https://127.0.0.1:1`), `envoi echec`, la file grossit, survit à une
  fermeture (11 lignes avant et après, les comptés de 20 à 29 par fusion), et part d'un coup quand la
  base revient. La seconde carte d'un carrousel, visible à un tiers, ne compte pas : le seuil de 50 %
  fait ce qu'il dit.
- **L'Android, et son défaut.** Le `background` d'Android 9 est émis même à la fermeture depuis les
  applications récentes ; `source.echec` a compté de lui-même l'expiration du widget du dossier
  (`ukit.portail.bordeaux-inp.dossier:blocked`, le nom du Blueprint tenant lieu d'hôte). Mais après
  l'envoi de trois lignes à cette fermeture, la relance en montrait treize au lieu de dix : la file
  soustraite en mémoire ne s'écrivait sur le disque qu'une seconde plus tard, et la fermeture est tombée
  dans cette seconde. **Corrigé** : après un lot accepté, la file s'écrit tout de suite
  ([`index.ts`](../../src/shared/mesure/index.ts)). La fenêtre qui reste est celle de l'écriture
  elle-même, quelques millisecondes.
- **La clé des salles libres** est l'identifiant du référentiel, `bat_a28`, pas le code affiché ;
  [mesure.md](../mesure.md#le-vocabulaire) le dit.
- **Les lignes du protocole**, toutes en version `6.2.2`, ont été effacées à la fin : seuls les builds
  de développement envoient sous ce numéro, et les premiers chiffres doivent être ceux de la 6.3.

## Limites écrites

- **Rien n'est compté par les versions antérieures à la 6.3** : les chiffres commencent avec son
  adoption, sans ligne de base d'avant la refonte ; le parc entier se lit par `jetons_push`.
- **Une case trop petite rend un compteur attribuable** — un campus à trois étudiants, une heure
  creuse. La console n'affiche jamais une case sous cinq ([7-G](7-g-console-statistiques.md)).
- **Une fermeture brutale sur Android perd la file de la session.**
- **La mesure n'est pas un rapport de plantage** : `source.echec` dit qu'une source n'a pas répondu, pas
  que l'application a planté.
- **L'adresse IP transite** jusqu'à l'hébergeur, comme pour toute requête ; nous ne la stockons pas.
