# Scolarité — session universitaire

L'onglet qui relie l'application au système d'information de l'université : connexion au compte
étudiant, récupération de l'identité, compteur de messages non lus, et navigateur intégré vers les
services universitaires.

C'est le module le plus sensible du projet — il manipule des identifiants — et le plus fragile — il
n'existe **aucune API**, tout passe par extraction de pages. Détail complet des hôtes, sélecteurs et
délais : section 2 de [sources-externes.md](../sources-externes.md).

## Parcours utilisateur

1. **Sans compte enregistré** : un écran de connexion demande identifiant et mot de passe
   universitaires, avec une explication de ce qui sera fait de ces données.
2. **Première connexion** (parcours « froid ») : un écran de progression détaille les étapes —
   connexion, profil, dossier, messagerie. Il dure une dizaine de secondes.
3. **Lancements suivants** (parcours « chaud ») : les données d'identité sont déjà stockées, seule la
   messagerie est rafraîchie. L'écran s'affiche immédiatement.
4. **Verrou biométrique** : à chaque prise de focus de l'onglet, une authentification locale est
   demandée avant d'afficher les données. Une seule fois par session d'application.
5. Le tableau de bord affiche une salutation personnalisée, la date, un indicateur d'anniversaire, et
   la ligne de messagerie avec le nombre de messages non lus. La toucher ouvre le webmail dans le
   navigateur intégré.
6. Le bouton d'action de la barre d'onglets mène aux réglages du compte : informations enregistrées,
   déconnexion.

> Toutes les captures de cet onglet se prennent avec un **compte de test**, ou après floutage : elles
> ne doivent montrer ni nom, ni numéro étudiant, ni INE, ni adresse mail, ni contenu de messagerie
> réels.
>
> **Capture attendue** — `scolarite-login.png` : l'écran de connexion universitaire.
>
> **Capture attendue** — `scolarite-progression.png` : l'écran de progression du parcours froid, en
> cours d'étape.
>
> **Capture attendue** — `scolarite-biometrie.png` : le verrou biométrique, avec son bouton de reprise
> après refus.
>
> **Capture attendue** — `scolarite-dashboard.png` : la salutation et la ligne de messagerie.
>
> **Capture attendue** — `scolarite-compte.png` : les réglages du compte et la déconnexion.

## Architecture

```text
CredentialsProvider                     englobe toute la pile de navigation
  ├─ useCredentialsSession()            tout l'état de la session
  │    ├─ SecureStore : identifiants + données froides
  │    ├─ machine à états : idle → connecting → scraping → done | error
  │    └─ garde-fou de 60 s
  └─ <ScolariteWebSession />            WebView invisible, montée en permanence
       ├─ script CAS         → LOGIN_SUCCESS | LOGIN_FAILED
       ├─ script ENT         → ENT_DATA      (prénom)
       ├─ script dossier     → DOSSIER_DATA  (numéro, INE, mail, naissance)
       └─ script webmail     → MAILBOX_DATA  (non lus)

ScolariteDashboard                      consomme useCredentials()
  ├─ pas de compte     → ScolariteLoginView
  ├─ parcours froid    → ScolariteLoadingScreen
  └─ sinon             → BiometryGate > GreetingBlock + MailboxRow
```

Le provider est monté **au-dessus de la pile entière** ([navigation.md](../navigation.md)) : la
session démarre au lancement de l'application, pas à l'ouverture de l'onglet, pour que les données
soient prêtes quand l'utilisateur y arrive.

## Données froides et données chaudes

La distinction structure tout le module :

| | Données froides | Données chaudes |
|---|---|---|
| Contenu | prénom, numéro étudiant, INE, adresse mail, date de naissance | nombre de messages non lus |
| Stabilité | ne changent pas d'une année sur l'autre | changent en permanence |
| Stockage | SecureStore (`UKIT_COLD_DATA`) | mémoire seulement |
| Récupération | une seule fois, au premier login | à chaque lancement |

C'est ce qui permet le mode « chaud » : trois pages lourdes évitées à chaque démarrage. Le mode est
choisi automatiquement à l'initialisation — `hot` si des données froides existent, `cold` sinon — et
forcé à `cold` lors d'un nouveau login.

## États de session

```ts
scrapeStatus   : 'idle' | 'connecting' | 'scraping' | 'done' | 'error'
scrapeProgress : 'connecting' | 'profile' | 'dossier' | 'mailbox' | null
```

`scrapeStatus` pilote l'affichage global, `scrapeProgress` alimente l'écran de progression. Un
garde-fou de **60 s** clôt toute session bloquée : s'il y avait une validation en attente, elle est
rejetée avec une erreur réseau ; sinon la session est simplement marquée `done` avec les données
obtenues.

## Validation d'un couple identifiant / mot de passe

`validateAndSave(username, password)` retourne une promesse résolue par l'événement de la WebView :

1. la promesse est stockée dans une référence (`validationResolver`) avec le couple candidat ;
2. une session `cold` démarre avec ces identifiants ;
3. sur `LOGIN_SUCCESS`, les identifiants sont écrits en SecureStore et la promesse résout
   `{ success: true }` ;
4. sur `LOGIN_FAILED`, la promesse résout `{ success: false, error }` et la session est abandonnée ;
5. sans réponse, le garde-fou de 60 s rejette avec une erreur réseau.

Les identifiants ne sont **jamais écrits avant confirmation** par le CAS : un mot de passe erroné ne
laisse aucune trace.

## Le navigateur intégré

[`WebBrowserScreen.tsx`](../../src/features/Scolarite/screens/WebBrowserScreen.tsx) est une WebView
plein écran avec une barre d'action flottante glissable (retour, avant, rechargement, ouverture
externe, fermeture), pilotée par un geste Reanimated.

Quatre points d'entrée nommés :

| `entrypoint` | Destination |
|---|---|
| `ent` | `https://ent.u-bordeaux.fr` |
| `email` | `https://webmel.u-bordeaux.fr` |
| `cas` | `https://cas.u-bordeaux.fr` |
| `apogee` | `https://apogee.u-bordeaux.fr` |

À défaut, le paramètre `href` est utilisé, sinon le site public de UKit.

**Remplissage automatique du formulaire CAS** : `getCASInjectedScript` scrute la page toutes les
100 ms (50 tentatives, soit 5 s). Si des identifiants sont enregistrés et qu'aucune erreur n'est
affichée, il remplit et soumet. Sinon, il pose un écouteur sur la soumission du formulaire pour
**proposer d'enregistrer** les identifiants saisis à la main — une modale s'affiche alors, sauf si le
couple est déjà celui en mémoire.

Le retour matériel Android est intercepté : il navigue dans l'historique de la WebView avant de
quitter l'écran, et le geste de retour de la pile est désactivé tant qu'un historique existe.

> **Capture attendue** — `scolarite-navigateur.png` : le navigateur intégré et sa barre d'action
> flottante.

## Sécurité

- Les identifiants vivent **uniquement** en SecureStore, chiffré par le trousseau de l'OS.
- Ils ne transitent par **aucun serveur tiers** : la WebView les injecte directement dans le
  formulaire du CAS de l'université.
- La WebView de session est en mode `incognito` : aucun cookie ne persiste entre deux sessions.
- Les données personnelles récupérées ne quittent jamais l'appareil.
- L'accès à l'onglet est protégé par `BiometryGate` (`expo-local-authentication`), avec repli sur le
  code de l'appareil (`disableDeviceFallback: false`).
- La déconnexion supprime les deux clés SecureStore et remet tout l'état à zéro.

## Décisions de conception

**Une WebView invisible plutôt qu'un client HTTP.** Le CAS repose sur des redirections, des cookies de
session et du JavaScript ; les pages cibles sont rendues côté client (GWT pour le dossier, framework
propriétaire pour le webmail). Un client HTTP devrait réimplémenter un navigateur. La WebView est le
choix pragmatique.

**Un user-agent de Chrome desktop.** Le webmail sert un DOM différent aux mobiles, dans lequel le
compteur de messages n'est pas exposé au même endroit. Ne pas modifier cet en-tête sans revérifier
l'extraction.

**Les extractions sont patientes, pas bloquantes.** Chaque script tente une lecture immédiate, puis
installe un `MutationObserver`, puis abandonne au bout de 18 ou 20 s en émettant une valeur vide.
Une page qui ne se charge pas dégrade l'affichage, elle ne gèle jamais la session.

**Le verrou biométrique n'est demandé qu'une fois par session d'application**
(`authPassedRef`, une référence qui survit aux rendus). Le redemander à chaque focus d'onglet serait
inutilisable.

**`sessionKey` force le remontage de la WebView.** Incrémenter cette clé recrée entièrement la vue :
c'est le seul moyen fiable de repartir d'une session propre après un échec ou un changement de compte.

## Vérifier

- **Premier login** : saisir des identifiants valides, vérifier que l'écran de progression parcourt
  les quatre étapes et que le prénom, le numéro étudiant et le compteur de messages s'affichent.
- **Identifiants erronés** : vérifier le message d'erreur, l'absence d'enregistrement, et la
  possibilité de réessayer.
- **Relancer l'application** : le parcours doit être « chaud » — affichage immédiat, seule la
  messagerie se rafraîchit.
- **Verrou biométrique** : quitter l'onglet et y revenir dans la même session — aucune nouvelle
  demande ; relancer l'application — la demande revient. Refuser l'authentification : le bouton de
  reprise doit s'afficher.
- **Navigateur intégré** : ouvrir le webmail depuis la ligne de messagerie ; le formulaire CAS doit se
  remplir seul.
- **Déconnexion** : vérifier que l'écran de connexion revient et qu'aucune donnée ne subsiste.
- **Hors ligne** : lancer l'application en mode avion avec un compte enregistré — le garde-fou de
  60 s doit clore la session sans bloquer l'onglet.

## Limites connues

- **Les identifiants GWT du dossier sont positionnels** (`gwt-uid-41`, `-43`, `-47`, `-51`). Toute
  modification de la page côté université décale silencieusement l'extraction : les champs
  deviennent vides ou mélangés, sans erreur. C'est la fragilité la plus sérieuse du projet.
- **Les sélecteurs de l'ENT et du webmail sont tout aussi exposés**, avec seulement des replis
  partiels (recherche par expression régulière pour le prénom, aucun pour le compteur de messages).
- **Le mot de passe est interpolé dans une chaîne de script** dans
  [`WebBrowserComponents.tsx`](../../src/features/Scolarite/components/WebBrowserComponents.tsx),
  entre apostrophes simples et sans échappement — contrairement à
  [`ScolariteWebSession.tsx`](../../src/features/Scolarite/components/ScolariteWebSession.tsx) qui
  utilise `JSON.stringify`. Un mot de passe contenant une apostrophe casse le script de remplissage
  automatique du navigateur intégré.
- **Le compteur de messages est une chaîne**, pas un nombre : `unreadCount` reste tel qu'extrait.
- **`ScolariteWebSession` est un fichier de 323 lignes** dont l'essentiel est du JavaScript injecté
  sous forme de gabarits de chaîne — non typé, non vérifiable par le compilateur.
- **[`ApogeeCard.tsx`](../../src/features/Scolarite/components/cards/ApogeeCard.tsx) n'est importé
  nulle part** : la carte d'accès aux notes existe mais n'est pas branchée au tableau de bord.
- **Le point d'entrée `apogee` du navigateur intégré n'est atteint par aucun appel** de navigation.
- **Aucune reprise automatique après échec** : un `LOGIN_FAILED` laisse l'onglet sur son dernier état
  jusqu'à une action de l'utilisateur.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| [`services/CredentialsContext.tsx`](../../src/features/Scolarite/services/CredentialsContext.tsx) | contexte et état de session : chargement SecureStore, machine à états, validation, déconnexion |
| [`components/ScolariteWebSession.tsx`](../../src/features/Scolarite/components/ScolariteWebSession.tsx) | WebView invisible : scripts CAS et d'extraction, enchaînement des phases, événements |
| [`screens/ScolariteDashboard.tsx`](../../src/features/Scolarite/screens/ScolariteDashboard.tsx) | écran d'onglet : aiguillage entre connexion, chargement et tableau de bord |
| [`screens/CredentialsSettingsScreen.tsx`](../../src/features/Scolarite/screens/CredentialsSettingsScreen.tsx) | réglages du compte : informations enregistrées, déconnexion |
| [`screens/WebBrowserScreen.tsx`](../../src/features/Scolarite/screens/WebBrowserScreen.tsx) | navigateur intégré : points d'entrée, historique, retour matériel, enregistrement d'identifiants |
| [`components/WebBrowserComponents.tsx`](../../src/features/Scolarite/components/WebBrowserComponents.tsx) | barre d'action flottante, modale d'enregistrement, script de remplissage CAS |
| [`components/ScolariteLoginView.tsx`](../../src/features/Scolarite/components/ScolariteLoginView.tsx) | formulaire de connexion et explication du traitement des données |
| [`components/ScolariteLoadingScreen.tsx`](../../src/features/Scolarite/components/ScolariteLoadingScreen.tsx) | écran de progression du parcours froid, étape par étape |
| [`components/BiometryGate.tsx`](../../src/features/Scolarite/components/BiometryGate.tsx) | verrou biométrique, une demande par session d'application |
| [`components/GreetingBlock.tsx`](../../src/features/Scolarite/components/GreetingBlock.tsx) | salutation, date du jour, détection d'anniversaire |
| [`components/MailboxRow.tsx`](../../src/features/Scolarite/components/MailboxRow.tsx) | ligne de messagerie avec compteur de non-lus et état de chargement |
| [`components/cards/ApogeeCard.tsx`](../../src/features/Scolarite/components/cards/ApogeeCard.tsx) | carte d'accès aux résultats — définie, non branchée |
