# 6-F — Act II : la session universitaire

> Le morceau qui justifie la phase. 323 lignes de WebView cachée pilotée par du JavaScript injecté
> deviennent deux Blueprints, et la fragilité la plus sérieuse du projet devient corrigeable en
> quelques minutes.

## Objectif

[`ScolariteWebSession.tsx`](../../src/features/Scolarite/components/ScolariteWebSession.tsx)
disparaît. Le parcours d'authentification et l'extraction des données étudiant sont décrits par deux
Blueprints, joués dans la WebView unique montée par le socle. La machine à états, les quatre scripts
injectés, les trois `MutationObserver` recopiés et le garde-fou global de 60 s sont remplacés par du
vocabulaire déclaratif.

Ce qui **ne change pas** : le verrou biométrique, le stockage chiffré, le navigateur intégré vers
l'ENT et Apogée, la distinction froid/chaud, et la promesse que les identifiants ne vont qu'au CAS de
l'université.

## Pourquoi c'est le jalon le plus rentable, et le dernier

Le plus rentable, parce que c'est là que se concentre tout ce que la phase existe pour supprimer :

| Ce qu'il y a aujourd'hui | Ce que ça coûte |
|---|---|
| ~176 lignes de JavaScript en gabarits de chaîne | non typé, invérifiable par le compilateur |
| `passwordInput.value = '${password}'` | **un mot de passe contenant une apostrophe casse le script** — pas l'authentification, le script, silencieusement |
| quatre scripts déclenchés selon l'URL de fin de chargement | une machine à états dans un composant |
| trois `MutationObserver` avec trois plafonds (18 s, 20 s, 18 s) | trois comportements légèrement différents pour le même besoin |
| `#gwt-uid-41`, `#gwt-uid-43`, `#gwt-uid-47`, `#gwt-uid-51` | des identifiants positionnels compilés dans le binaire |
| cinq sélecteurs essayés en cascade pour un prénom, plus une expression régulière | du code écrit pour survivre à ce qu'on ne contrôle pas |

Le dernier, parce qu'il demande d'avoir confiance dans tout le reste : le socle, le modèle d'erreur,
la livraison, et la façon dont on vérifie. Le migrer en premier aurait mis un parcours
authentifiant derrière une chaîne jamais éprouvée.

## Ce qui est livré

### Deux Blueprints, pas un

| Blueprint | Quand | Ce qu'il rend |
|---|---|---|
| `ukit.scolarite.dossier` | premier login (parcours *froid*) | numéro étudiant, INE, identité, adresse mail, date de naissance |
| `ukit.scolarite.messagerie` | à chaque lancement (parcours *chaud*) | nombre de messages non lus |

Le composant d'origine enchaîne quatre pages dans une seule session. La traduction fidèle serait un
Blueprint de douze steps — et ce serait une erreur. L'application **distingue déjà** deux parcours
(`sessionMode` vaut `cold` ou `hot` dans
[`CredentialsContext`](../../src/features/Scolarite/services/CredentialsContext.tsx)), et chaque
service rebondit lui-même sur l'authentification unifiée. Deux Blueprints correspondent à ce que
l'application demande vraiment : chacun se rejoue seul, et une panne de l'un n'emporte pas l'autre.

**Découper selon les parcours de l'application, pas selon les pages.**

### Partir du service, pas du portail

Le code d'origine ouvre `https://ent.u-bordeaux.fr`, subit la redirection CAS, puis navigue de page
en page en injectant `window.location.href`. Le Blueprint ouvre **directement** le service voulu :

```json
{ "action": "navigate", "url": "{{ vars.dossier }}" }
```

Le service redirige vers le CAS avec son paramètre `service=`, et la redirection de retour ramène à
la bonne page, fragment compris. C'est plus court, plus robuste, et ça survit à ce qui est déjà
arrivé : l'hôte du portail historique **ne résout plus**. Un parcours qui dépend d'une page d'accueil
dépend de la page la plus susceptible d'être refondue.

Corollaire : la lecture du prénom sur l'ENT — cinq sélecteurs en cascade plus une expression
régulière — n'a **plus de page où se faire**. Le dossier administratif porte l'identité complète ;
c'est de là qu'on la lit désormais.

### Les identifiants ne traversent plus une source de script

```json
{ "action": "fill", "selector": "#username", "value": "{{ secrets.bordeaux_user }}" },
{ "action": "fill", "selector": "#password", "value": "{{ secrets.bordeaux_pass }}" },
{ "action": "click", "selector": "input[type=submit]" }
```

Les paramètres sont **encodés en JSON** et transmis par une communication corrélée avec l'agent
injecté ; aucun n'entre jamais dans la source d'un script. La classe de bug de l'apostrophe devient
impossible par construction, et ce n'est pas un gain théorique : c'est celui qu'on n'aurait jamais
diagnostiqué depuis un rapport d'utilisateur.

Les secrets viennent du resolver posé en [6-A](6-a-socle.md), qui lit le document unique de
`SecureStore`. Ils ne sont pas passés à l'appel : le Blueprint les **déclare**, le resolver les
fournit, et le masquage les retire de tout événement et de tout message d'erreur.

### L'attente est écrite une fois, et l'échec porte un nom

```json
{ "action": "wait_for", "selector": "#gwt-uid-41", "timeout_ms": 45000,
  "on_timeout": "fail:LOGIN_FAILED" }
```

Un échec **nommé** par le Blueprint remonte à l'application comme tel, et l'écran branche dessus au
lieu de deviner. Les trois plafonds recopiés et le garde-fou global de 60 s deviennent des délais
déclarés par step.

Un corollaire non évident, découvert sur appareil et qu'il ne faut pas redécouvrir : **une lecture
qui suit une attente porte un délai court**. Un `extract` réarme sa propre auto-attente ; sur un
téléphone, les minuteurs d'une WebView hors écran sont ralentis alors que l'appelant compte en temps
réel. Si l'élément a disparu entre les deux steps, l'échec devient un *silence* rapporté comme « la
page a changé ». Une lecture n'a rien à attendre : sa présence vient d'être prouvée.

```json
{ "id": "dossier", "action": "extract", "timeout_ms": 5000, "outputs": { … } }
```

Et l'autre corollaire, tout aussi contre-intuitif : **si un clic déclenche une redirection en chaîne,
laisser la cascade arriver** par une pause explicite. L'authentification unifiée enchaîne plusieurs
sauts, puis le client pose son propre fragment ; l'opération émise pendant la cascade se perd. Écrire
la pause dans le fichier plutôt que la déguiser en délai généreux — un contournement qu'on peut lire
est un contournement qu'on saura retirer.

### Le filet que le code d'origine n'avait pas

Les identifiants GWT sont attribués selon l'ordre de construction du DOM. La migration ne les rend
**pas** robustes. Ce qu'elle ajoute, c'est la possibilité de lire **le libellé voisin** et de
l'affirmer :

```json
{ "action": "assert",
  "condition": "{{ steps.dossier.libelle_numero == 'Dossier' and steps.dossier.libelle_ine == 'NNE' }}",
  "message": "Les libelles du dossier ont bouge : les identifiants sont positionnels, donc les valeurs lues ne sont plus celles qu'on croit." }
```

Un décalage devient un **échec nommé** au lieu d'une donnée fausse écrite dans le trousseau. C'est le
seul endroit du jalon où la version migrée est franchement meilleure que l'originale, et elle ne le
doit qu'au fait que la description est de la donnée.

### L'agent utilisateur porte du sens

`options.stealth.user_agent` est la seule bribe de discrétion du périmètre embarqué, et elle décide
de la page servie :

| Agent utilisateur | URL servie par la messagerie | Le sélecteur attendu |
|---|---|---|
| Chrome desktop | `/mail#1` | présent |
| Safari iOS | `/modern/` | **absent** — DOM entièrement différent |

C'est exactement ce que fait la WebView actuelle, en dur. Ça devient une ligne de donnée corrigeable.

### Ce que devient `CredentialsContext`

Le contexte garde son rôle — état de session, choix froid/chaud, écriture en `SecureStore`,
progression affichée — mais cesse de piloter une machine à états par messages. Les sept types
d'événements (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `PROGRESS`, `ENT_DATA`, `DOSSIER_DATA`,
`MAILBOX_DATA`, `DEBUG`) sont remplacés par : le flux d'événements du run pour la progression, les
`outputs` pour les données, et le modèle d'erreur pour l'échec.

`LOGIN_SUCCESS` survit tel quel : le Blueprint l'émet explicitement (`emit`), parce que c'est ce qui
déclenche l'écriture des identifiants validés.

## Décisions et pièges

- **Un seul run Act II à la fois.** Il y a une WebView montée, donc un run navigateur à la fois ; le
  second est **refusé bruyamment**, pas mis en file. C'est délibéré côté moteur, et c'est une
  contrainte à respecter côté application : la session ne doit pas pouvoir être lancée deux fois
  (rafraîchissement pendant un login, retour au premier plan pendant une session).
- **Le verrou biométrique ne bouge pas.** Il protège l'accès à l'écran, pas la session ; les deux
  sont indépendants et doivent le rester.
- **Le navigateur intégré n'est pas concerné.** `WebBrowserScreen` est une WebView **visible** que
  l'utilisateur pilote, avec remplissage automatique du formulaire. Ce n'est pas du scraping, ça ne
  devient pas un Blueprint.
- **Le mode debug rend la WebView visible.** C'est l'outil du jalon : quand un step échoue, on
  regarde la page plutôt que d'ajouter des journaux.
- **Quand un diagnostic patine, demander à la page de se décrire.** Cesser d'interroger la donnée
  qu'on veut et lire l'URL, le titre et le nombre de nœuds coûte un run et élimine trois hypothèses.
  Quatre passes sur appareil ont été nécessaires, côté Aetherius, pour nommer un défaut dont le
  symptôme (« la page a changé ») ne ressemblait pas à sa cause.

## Définition de « terminé »

1. Les deux Blueprints existent, sont publiés, et sont joués par `CredentialsContext`.
2. `ScolariteWebSession.tsx` est **supprimé**, pas neutralisé.
3. Les parcours froid et chaud fonctionnent, avec la même progression affichée qu'avant.
4. Un mot de passe contenant une apostrophe, un guillemet et un accent circonflexe **fonctionne** —
   c'est la sonde qui prouve le gain principal.
5. Un mot de passe faux produit `LOGIN_FAILED` et l'écran correspondant, pas un délai de 60 s.
6. `npx tsc --noEmit` et `npx eslint .` sans régression.
7. Documentation : [scolarite.md](../features/scolarite.md) réécrit,
   [sources-externes.md](../sources-externes.md) section CAS/ENT réécrite, CHANGELOG.

La parité automatisée **n'est pas exigible** ici : elle demanderait des identifiants réels dans un
harnais. La vérification est manuelle, avec un compte de test, et elle est décrite ci-dessous.

## Plan de test

Toutes les sondes se jouent **sur appareil**, avec un compte universitaire réel, et deux fois : une
fois en parcours froid (trousseau vidé), une fois en parcours chaud.

| Sonde | Attendu |
|---|---|
| Premier login, compte valide | identité complète, écriture en `SecureStore`, écran identique à avant |
| Lancement suivant | parcours chaud, compteur de messages, plus rapide qu'avant |
| **Mot de passe avec apostrophe, guillemet, accent** | fonctionne — la sonde du jalon |
| Mot de passe faux | `LOGIN_FAILED`, message clair, pas d'attente de 60 s |
| Compte valide sans messagerie active | échec **nommé** distinct de l'échec de login |
| Mode avion pendant la session | `unavailable`, pas « la page a changé » |
| Sélecteur GWT volontairement faux dans le Blueprint | l'`assert` déclenche, message explicite, **rien n'est écrit** en `SecureStore` |
| Correction publiée d'un sélecteur | la session repart sans réinstaller l'application |
| Application mise en arrière-plan pendant la session | pas de WebView orpheline ; le run est annulé ou termine proprement |
| Deux sessions lancées coup sur coup | la seconde est refusée explicitement, la première va au bout |

L'avant-dernière ligne et la dernière sont celles qu'on oublie et qui décident de l'expérience
réelle : une WebView cachée qui survit à l'écran qui l'a demandée est le défaut classique de ce
motif.

L'avant-avant-dernière — publier une correction de sélecteur et la voir arriver — est **la
démonstration de toute la phase**. Elle mérite d'être jouée devant témoin.

## Limites écrites

- **Les sélecteurs restent positionnels.** Ils ne deviennent pas robustes ; ils deviennent une ligne
  de données corrigeable à distance, et un décalage devient un échec nommé au lieu d'une donnée
  fausse. C'est déjà beaucoup, et ce n'est pas la même chose.
- **Une opération émise pendant un enchaînement de navigations se perd** sur appareil. Le
  contournement est une pause explicite après le clic ; la limite est celle du moteur, écrite chez
  lui, et le contournement est visible dans le fichier.
- **Apogée n'est pas extrait**, pas plus qu'avant : il reste accessible par le navigateur intégré.
- **Pas de parité automatisée** pour ce jalon. C'est la conséquence assumée de ne jamais mettre
  d'identifiants réels dans un harnais.
