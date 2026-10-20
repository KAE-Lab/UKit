---
paths:
  - "blueprints/**"
  - "sondes/*.blueprint.json"
  - "src/features/*/services/**"
  - "src/shared/aetherius/**"
  - "tools/releve-ade.mjs"
---
# Sources tierces (savoir rétro-ingénieré)

Les API ci-dessous n'ont aucun contrat : les en-têtes sont imités et observés. Détail des endpoints et des mesures datées : `docs/sources-externes.md`, à lire avant toute intervention touchant au réseau.

## Celcat (emplois du temps, salles)
- Nommer chaque appel : `vars.user_agent` = `UKit (+https://github.com/KAE-Lab/UKit; contact@kaelab.dev)`, sans version (politesse envers un service public). Celcat ne filtre ni Origin, ni Referer, ni User-Agent : cette tolérance peut changer sans préavis (réponse vide, pas erreur).
- `GetCalendarData` se poste en formulaire (jamais JSON), `federationIds[]` répété ; `resType` 103 = groupes, 102 = salles ; `colourScheme=3` ; `end` est exclusif (jour = lendemain, semaine = lundi + 6, soit le dimanche ; l'appli n'affiche que lundi à samedi) ; le serveur déborde, refiltrer la date côté appli.
- Garder TOUS les `modules` d'un cours (plusieurs codes d'UE) ; séparer la description par `;` pour toutes les vues ; placer un cours par `sites` avant toute heuristique de description (code inconnu = pas de bouton, une carte fausse est pire qu'une carte vide). `end` nul pour `Vacances` : `moment(null)` est invalide, `moment(undefined)` vaut maintenant.
- Occupation groupée : un appel par bâtiment, attribution par le NOM de salle de la description (entités HTML décodées), `Vacances` rendus à toutes les salles ; fragilité = le texte, une description qui cesse de nommer sa salle la fait passer pour libre. « Salle 10 » reçoit « Salle 101 » : re-sonder avant d'ouvrir un autre bâtiment.
- Celcat de Bordeaux ne sert qu'un collège (Sciences et Technologies, Talence) ; aucune autre instance ouverte sur vingt universités.

## Portails (CAS, dossier, messagerie)
- Ancrer les champs du dossier par libellé (XPath `v-formlayout-captioncell`), jamais `following-sibling::td[1]` (la 2e cellule est l'erreur, vide). Un décalage doit échouer bruyamment.
- Lecture facultative en `as: "list"`, jamais derrière `when`, précédée d'un `wait` : un step sauté n'enregistre aucune sortie (`StrictUndefined`).
- Garde `#loginErrorsPanel` après la pause ; mot de passe faux : 13 s au lieu de 41. Ne pas raccourcir les pauses de 6 s des vues bonus INP : à 500 ms `formation_libelle` et `edt_ressource` sortent vides et le run se déclare réussi.
- Messagerie : UA Chrome desktop (`options.stealth.user_agent`), un UA mobile sert `/modern/` sans compteur ; garder le libellé brut à côté du nombre (pas de parenthèse = 0 non lu). Formation : première ligne seule, glyphe FontAwesome retiré, ne jamais stocker les PDF du portail.
- Identifiants écrits au trousseau après `emit LOGIN_SUCCESS` seulement, passés au moteur comme secrets, envoyés au seul CAS de l'université.

## Affluences, Croustillant
- Affluences : API privée sans contrat. Balayage applicatif (position de l'étudiant + `bibliotheques_points` du catalogue), distance recalculée (Haversine), un point muet n'emporte pas les autres (bandeau de couverture partielle).
- Croustillant : 404 sur `/menu` = pas de menu publié (24 restaurants sur 41), donc `assert` 200 OU 404 ; `type.code 4` écarté ; `horaires` en tableau OU chaîne JSON ; dates `DD-MM-YYYY` converties côté appli ; fournisseur crédité dans À propos (toute nouvelle source publique y est créditée).

## ADE et iCalendar
- `resources` = index positionnels, `projectId` = année universitaire : relever à chaque rentrée (`node tools/releve-ade.mjs --projet <n>`) sur trois semaines réparties et relier index et école par la part d'événements communs. Une semaine ne prouve rien ; préfixer sans mesure publie l'emploi du temps d'une autre école. L'export ADE anonyme rend l'emploi du temps du porteur de l'identifiant : secret.
- iCal avec `ical.js`, `DTSTART` en UTC (07:30Z en septembre, 08:30Z en novembre), retirer `(Exporté le:…)`, ancrer sur le code de module ; les champs de description n'ont pas de position fixe. `IcsMapping` est réglé sur l'export ADE-INP et dégrade les autres émetteurs.
