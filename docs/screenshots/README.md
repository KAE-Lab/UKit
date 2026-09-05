# Captures d'écran

Les images illustrant la documentation vivent dans ce dossier. Elles sont prises **à la main** sur un
appareil ou un émulateur : le projet ne dispose d'aucun outillage de capture automatique, et une
application React Native n'a pas de mode de rendu sans écran.

Les emplacements attendus sont **répartis dans les documents eux-mêmes**, au point où l'illustration
sert le propos. Ce fichier ne porte que la convention et l'inventaire de suivi.

## Convention

- **Nom** : `<domaine>-<ecran>.png`, en minuscules, mots séparés par des tirets.
- **Format** : PNG, appareil en **mode portrait**, thème **clair** par défaut. Une variante sombre se
  suffixe `-dark`.
- **Largeur** : celle de l'appareil, sans redimensionnement ; pas de cadre de téléphone ajouté.
- **Contenu** : données réalistes mais **anonymes**. Aucune capture ne doit montrer un nom, un numéro
  étudiant, un INE, une adresse mail ou un contenu de messagerie réels — l'onglet Scolarité se
  photographie avec un compte de test ou après floutage.

## Déposer une capture

Chaque emplacement attendu est marqué dans la documentation par une ligne de ce type :

```markdown
> **Capture attendue** — `planning-jour.png` : la vue jour avec le curseur de dates.
```

Déposer le fichier dans ce dossier, puis **remplacer cette ligne** par l'image et sa légende :

```markdown
![La vue jour, avec le curseur de dates](../screenshots/planning-jour.png)
```

Le chemin est `../screenshots/…` depuis `docs/features/`, `screenshots/…` depuis `docs/`.

## Prendre une capture

```bash
npx expo start        # puis a (Android), i (iOS), ou Expo Go sur un appareil
```

- **Android** : `adb exec-out screencap -p > docs/screenshots/<nom>.png`
- **iOS (simulateur)** : `xcrun simctl io booted screenshot docs/screenshots/<nom>.png`
- **Appareil physique** : capture système, puis transfert dans ce dossier.

Pour les écrans dépendant de l'heure (salles libres, menu du jour, rappels), le menu flottant de
simulation temporelle permet de se placer au bon moment — voir [qualite.md](../qualite.md).

## Inventaire

Suivi des emplacements marqués dans la documentation. Les captures **essentielles** couvrent un écran
entier ; les **complémentaires** documentent un état particulier (vide, hors ligne, modale) et
peuvent attendre.

### Onboarding — [features/onboarding.md](../features/onboarding.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `onboarding-bienvenue.png` | étape 1, logo et accroche | essentielle |
| `onboarding-etablissement.png` | étape 3, la liste des universités | **prise** |
| `onboarding-compte.png` | étape 4, le compte universitaire et sa sortie « Plus tard » (jalon 6-J) | attendue |
| `onboarding-preferences.png` | étape 2, choix du thème et de la langue | essentielle |
| `onboarding-groupes.png` | étape 4, année, semestre et recherche de groupe | essentielle |
| `onboarding-fin.png` | étape 5, confirmation | complémentaire |

### Finitions d'interface — [phase-6/6-1-e-finitions-interface.md](../phase-6/6-1-e-finitions-interface.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `chargement-parlant.png` | un chargement pleine page avec sa phrase, et la seconde ligne après quatre secondes | essentielle |
| `reglages-controles.png` | la section Notifications : l'interrupteur dessiné et le curseur de délai, dans les deux thèmes | essentielle |
| `navigation-glissement.png` | le passage Scolarité → Réglages au doigt, barre flottante visible | complémentaire |

### Planning — [features/planning.md](../features/planning.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `planning-jour.png` | vue jour, curseur de dates, journée chargée | **prise** |
| `planning-semaine.png` | vue semaine, sections repliables | essentielle |
| `planning-groupes.png` | recherche de groupes, sections alphabétiques | essentielle |
| `planning-cours-detail.png` | fiche d'un cours avec sa carte | essentielle |
| `planning-cours-simultanes.png` | carrousel de cours qui se chevauchent | complémentaire |
| `planning-hors-ligne.png` | bandeau de données en cache daté | **prise** — produite avec l'interrupteur **hors ligne** du menu de développement, sans mode avion ([qualite.md](../qualite.md)) |
| `planning-echec.png` | l'échec d'une source : message de la famille et bouton Réessayer | **prise** — même interrupteur |
| `planning-groupes-sombre-avant.png` · `planning-groupes-sombre-apres.png` | la première section de la recherche de groupes en sombre, avant et après la correction de l'index 0 de `sectionsHeaders` ([6.1-C](../phase-6/6-1-c-passe-de-code.md)) | **prises** — le couple avant/après d'un rendu qui change |
| `planning-lien-attendu.png` | l'onglet Planning proposant de coller un lien d'abonnement (jalon 6-J) | attendue |
| `lien-edt-saisie.png` | l'écran de saisie du lien, après une vérification réussie | attendue |
| `scolarite-non-reliee.png` | la Scolarité d'un établissement sans portail : le message, sans formulaire | attendue |
| `planning-vide.png` | état vide, aucun groupe favori | complémentaire |

### Campus — [features/campus.md](../features/campus.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `campus-dashboard.png` | tableau de bord, quatre sections | essentielle — la comparaison avant / après du jalon 6-K a été faite **hors dépôt** ; le fichier reste à déposer |
| `campus-liste-filtres.png` | modale de filtres du socle de liste | complémentaire |
| `campus-liste-vide.png` | état vide d'une liste filtrée | complémentaire |

### Campus — restaurants · [features/campus-crous.md](../features/campus-crous.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `crous-liste.png` | liste des restaurants avec distances **et horaires** | **livrée** |
| `crous-menu.png` | menu d'un restaurant, midi et soir | **à reprendre** (6-K : icône végétarien) |
| `crous-menu-absent.png` | restaurant qui ne publie pas de menu — l'état vide, à contraster avec l'état d'échec | **livrée** |

### Campus — bibliothèques · [features/campus-bibliotheques.md](../features/campus-bibliotheques.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `bu-liste.png` | liste avec pastilles d'affluence | **à reprendre** (6-K : teintes d'affluence) |
| `bu-detail.png` | fiche, jauge d'affluence et horaires | **à reprendre** (6-K : teintes d'affluence) |
| `bu-couverture-partielle.png` | le bandeau de couverture partielle au-dessus d'une liste réelle — la seule interface que le jalon 6-D ajoute | **à reprendre** (6-K : teintes d'affluence des cartes) |

### Campus — salles libres · [features/campus-salles-libres.md](../features/campus-salles-libres.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `salles-libres-liste.png` | liste des bâtiments en accès libre | essentielle |
| `salles-libres-detail.png` | sélecteur d'heure et créneaux disponibles | essentielle |
| `salles-libres-ferme.png` | état fermé (hors horaires ou vacances) | complémentaire |

### Campus — vie étudiante · [features/campus-vie-etudiante.md](../features/campus-vie-etudiante.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `annonces-liste.png` | liste des annonces actives | essentielle |
| `annonce-detail.png` | fiche d'une annonce avec bouton d'action | essentielle |
| `annonces-erreur.png` | la liste en échec : service indisponible et bouton Réessayer — **déposée** (jalon 6-B) | essentielle |

### Scolarité — [features/scolarite.md](../features/scolarite.md)

Toutes les captures de cette section exigent un compte de test ou un floutage.

| Fichier | Contenu | Priorité |
|---|---|---|
| `scolarite-login.png` | écran de connexion universitaire | **à reprendre** (6-K : retrait de Montserrat) |
| `scolarite-dashboard.png` | salutation et ligne de messagerie — **différée** : l'habillage de ces écrans doit changer, et une capture périmée renseigne moins bien qu'une absence signalée | essentielle |
| `scolarite-progression.png` | écran de progression du parcours froid | **à reprendre** (6-K : retrait de Montserrat) |
| `scolarite-echec.png` | un échec de session nommé, message et bouton Réessayer — l'écran que le module n'avait pas avant le jalon 6-F — **déposée** | essentielle |
| `scolarite-login-echec.png` | le refus d'identifiants sur le formulaire, distinct de l'échec de session | **à reprendre** (6-K : retrait de Montserrat) |
| `scolarite-biometrie.png` | l'invite Face ID à l'ouverture de l'onglet, sur un build — **déposée** (6.1-A, 2026-09-02) | complémentaire |
| `scolarite-compte.png` | réglages du compte et déconnexion — **différée** (idem) | complémentaire |
| `scolarite-navigateur.png` | navigateur intégré et sa barre flottante | complémentaire |

> La première version de `scolarite-echec.png` montrait un identifiant universitaire réel et a été
> retirée. C'est le piège de cette section : on teste avec son propre compte, donc on capture son
> propre compte. Un identifiant de connexion est une donnée personnelle au même titre qu'un nom.

### Réglages — [features/settings.md](../features/settings.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `reglages.png` | écran complet, sections déployées | essentielle |
| `reglages-apropos.png` | écran À propos | essentielle |
| `reglages-filtres.png` | modale de gestion des filtres d'UE | complémentaire |
| `reglages-calendrier.png` | modale de choix du calendrier | complémentaire |
| `reglages-langue.png` | modale de langue | complémentaire |
| `reglages-etablissement.png` | modale d'établissement : la liste, puis la confirmation | **à reprendre** (6-K : boutons de confirmation pleins) |

### Pilotage — [pilotage.md](../pilotage.md)

| Fichier | Contenu | Priorité |
|---|---|---|
| `pilotage-bandeau-info.png` | le bandeau flottant d'une information, sous la barre d'état, par-dessus le tableau de bord Campus | attendue |
| `pilotage-incident.png` | la pastille d'état de service en rouge, à droite du grand titre d'un onglet | attendue |

### Socle

| Fichier | Contenu | Document | Priorité |
|---|---|---|---|
| `navigation-tabbar.png` | barre d'onglets et bouton d'action contextuel | [navigation.md](../navigation.md) | essentielle |
| `theme-clair-sombre.png` | un même écran dans les deux thèmes | [theme.md](../theme.md) | essentielle |
| `carte.png` | écran carte, marqueur au thème de l'application | [cartographie.md](../cartographie.md) | essentielle |
| `modmenu.png` | menu flottant de simulation temporelle | [qualite.md](../qualite.md) | complémentaire |
| `modmenu-blueprints.png` | panneau de livraison : origine, version et raison par Blueprint | [blueprints.md](../blueprints.md) | **à reprendre** (6-K : teintes du menu) |

## Sept captures que le jalon 6-K a périmées

Le socle visuel a changé quatre choses **visibles** sur des écrans déjà photographiés : les teintes
d'affluence des bibliothèques (Material → Apple), l'icône « végétarien » du Crous, les boutons de
confirmation des modales (gris → plein), et le retrait de Montserrat — qui ne rendait que dans la
Scolarité, la seule graisse chargée y vivant.

`bu-liste` · `bu-detail` · `bu-couverture-partielle` · `crous-menu` · `scolarite-login` ·
`scolarite-progression` · `scolarite-login-echec` · `reglages-etablissement` · `modmenu-blueprints`

Elles restent dans le dépôt en attendant : les remplacer demande un appareil, et une capture absente
renseigne moins bien qu'une capture datée dont on sait qu'elle l'est. **Mais elles sont marquées, et
c'est ce qui compte** — le tableau ci-dessus les porte en « à reprendre ».

Celles qui **n'ont pas bougé**, vérifiées : `planning-jour`, `planning-echec`, `planning-hors-ligne`,
`crous-liste`, `crous-menu-absent`, `annonces-erreur`, `onboarding-etablissement`, `scolarite-echec`.

## Mettre à jour

Une capture périmée est plus trompeuse que pas de capture. Après une évolution visible d'un écran,
reprendre l'image concernée dans le même changement, en conservant son nom de fichier — les documents
qui la référencent n'ont alors rien à modifier.

## Le cas particulier d'une refonte visuelle

Une session qui refait un écran, ou un jalon qui touche au socle visuel, se vérifie par une **capture
avant et une capture après**, comparées côte à côte. C'est la seule preuve qu'une extraction n'a pas
redessiné en silence — et le jalon [6-K](../phase-6/6-k-socle-visuel.md) en a fait sa définition de
« terminé ».

Prendre l'image **avant** de commencer : une fois le code changé, elle n'est plus reproductible. Les
captures déjà déposées ici jouent ce rôle pour les écrans qu'elles couvrent ; pour les autres, la
capture « avant » est le premier geste de la session.
