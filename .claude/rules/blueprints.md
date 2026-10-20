---
paths:
  - "blueprints/**"
  - "src/shared/aetherius/**"
  - "tools/publish-blueprints.mjs"
  - "tools/parity/**"
  - "sondes/**"
---
# Blueprints et moteur Aetherius

Un Blueprint (JSON) dit ce qu'on demande à une source TIERCE et ce qu'on en retient ; le moteur Aetherius embarqué le joue. Nos propres tables ne passent jamais par un Blueprint (voir règle `supabase`).

## Frontière
- Un Blueprint par appel réellement joué par l'app, pas par source : une panne n'emporte pas un autre écran.
- N'y descendent JAMAIS : cache et péremption, persistance, i18n, calcul (distances, tris, agrégats, dédoublonnage), heure courante, rendu, décision produit. Le fichier cesserait d'être rejouable à l'identique. Pas d'heure courante dans un prédicat, pas d'indexation dans un filtre, `fields` plat, pas de reformatage de date reçue. Un filtre, un endroit.
- Toute borne qui dépend de l'heure se passe en ENTRÉE du Blueprint. Ne pas filtrer `Vacances` : les salles libres s'en servent pour fermer un bâtiment.
- Défaut du moteur : le corriger chez Aetherius (dépôt `github.com/kln-mltre/Aetherius` : format dans `docs/blueprint-schema.md`, moteur embarqué dans `docs/embedded.md` ; spécification et conformance), jamais le contourner ici. Moteur borné à `^0.5.10` (`package.json`) et verrouillé par `package-lock.json` ; une montée de moteur est un changement à part, avec parité.

## Écrire
- Échec rangé par famille : `unavailable` (réseau), `rejected` (statut inattendu), `data` (sélecteur sans correspondance), `blocked` (`fail:CODE`), `config` (secret absent), `cancelled`. Une liste vide n'est pas une erreur : deux écrans différents. Les services rendent `{ ok: true, … } | { ok: false, failure }`, jamais `null`.
- Extraction pouvant être vide : `assert` sur la RACINE attendue ; si la réponse EST le tableau (Celcat), `expect.status` seul, dit dans la `description`. `expect.status` n'accepte qu'un entier : un 404 normal se nomme par `assert … == 200 or == 404`.
- Extraction `[*]` : 0 correspondance = null, 1 = la valeur, n = liste ; le scalaire est le cas nominal (`categories` → `20`). Normaliser côté appelant (`commeListe`, `sitesDuCours`).
- Sélecteurs en CSS standard ou XPath, jamais de pseudo-classe Playwright (`:text-is`, `:has-text`, `:nth-match`) : le moteur embarqué les rejette comme CSS invalide alors que le moteur Python les lit, l'échec n'apparaît que sur appareil ; `src/shared/aetherius/delivery.test.ts` refuse ces pseudo-classes dans les sélecteurs (une `description` peut les nommer). Ancrer sur le libellé, jamais sur `gwt-uid-NN`. Sélecteur sur le texte source, `assert` sur le texte affiché (capitales CSS).
- Attentes : `wait_for` attend `visible` par défaut (`attached` pour un contenu replié) ; un sélecteur introuvable rend `detached` vrai d'emblée. Après un `navigate` qui rebondit (service puis CAS) ou une soumission : pause de 4 à 8 s puis `wait_for` sur l'UNION de toutes les issues. Un plafond bas coûte plus qu'une attente longue. Donner un `timeout_ms` court à `extract` (minuteurs ralentis dans une WebView hors écran).
- Lecture « bonus » : bloc `optional` (moteur 0.5.8, `min_engine`), sorties en `| default([])` ; valider une pause raccourcie en comparant les SORTIES, pas le statut.
- Jamais d'identifiant dans un fichier (CDN public) : `secrets` déclarés, fournis par le trousseau ; seuls `portail_user` et `portail_pass` (`ALLOWED_SECRETS`). `failure.detail` porte le corps d'un `expect` raté (dossier, nom, INE) : borner ce chemin avant tout rapporteur de crash.
- Nom `<domaine>.<tache>` en minuscules sans accent ; le préfixe `ukit.portail.` est réservé aux portails d'établissement. Le Blueprint d'essai (écho) se joue inline (`aetherius/echo.ts`), jamais dans `blueprints/` : le script publie tout le dossier.

## Publier
- Incrémenter la version dans `versions.json` (lu par le script Node ET l'app), puis `npm run blueprints:publish` ; sans montée, la correction n'atteint aucun appareil. Une correction s'applique au run SUIVANT, pas à l'écran déjà monté.
- Le manifeste est généré, jamais édité, écrit EN DERNIER ; il n'annonce que ce qui bat le socle du dernier tag `vX.Y.Z` (vide après une sortie = sain). Correctif à chaud depuis `main`. Le script ne supprime jamais un objet du bucket.
- `resolve()` n'ouvre jamais le réseau ; `refresh()` ne lève jamais (démarrage et retour au premier plan). Surcouche vérifiée : SHA-256 revérifié à chaque lecture, version strictement supérieure, `min_engine`, périmètre de secrets, manifeste malformé refusé EN ENTIER.
- Retours arrière : `--desactiver` (fait DISPARAÎTRE un Blueprint absent du binaire), `--arret`, bouton « Embarqué » (non durable), `BLUEPRINTS_REMOTE=false` à la construction. Revenir en arrière = republier l'ancien contenu.
- Un panneau de diagnostic muet (gris) n'est pas une erreur (ambre) : ne pas conclure qu'une correction n'est pas arrivée.

## Moteur et disjoncteur
- Un seul client Aetherius, un seul run navigateur à la fois (une WebView), aucun `confirm` sans écran. Le disjoncteur est par hôte et ne coupe que les runs `origine: 'automatique'` (3 échecs `unavailable` consécutifs) ; un geste de l'utilisateur passe toujours. Ne relever le palier qu'après un refroidissement écoulé. Journaliser l'hôte seul, jamais l'adresse entière.
- `observateurs.ts` reste pur ; `runBlueprint` n'importe jamais la mesure ; un run court-circuité n'est pas signalé.
- La durée d'un échec dit lequel : plafond atteint = page muette ; plafond + 2 s + 50 % = opération perdue. Lire le chrono (`[chrono]`, `__DEV__`) avant d'affirmer une lenteur.
- Tester sous vitest seul (tsx ne `require()` pas l'ESM d'`@aetherius/engine`) ; `vitest.config.ts` importe en dur `…/dist/delivery/index.js`.
- Sondes : sans identifiants, entrées tirées du catalogue publié ; panne de source (issue) ≠ erreur de sonde (workflow rouge).
