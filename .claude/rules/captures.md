---
paths:
  - "docs/screenshots/**"
---
# Captures d'écran

- Nom `<domaine>-<ecran>.png` (minuscules, tirets) ; console : préfixe `console-` et sous-dossier `docs/screenshots/console/`. PNG portrait, thème clair par défaut (`-dark` pour le sombre ; les deux captures `planning-groupes-sombre-*` disent `sombre`, ne pas l'imiter), largeur d'appareil sans redimensionnement ni cadre de téléphone. L'application se capture à la main (aucun outillage) ; la console par navigateur piloté (Playwright, Chromium 1280 px, thème sombre émulé), compte jetable supprimé après.
- Refonte d'écran : capturer l'état AVANT tout code (`-avant`, `-avant-dark`, `-android`), puis `-apres` ; à la livraison `-apres` prend le nom sans suffixe. Comparer côte à côte : c'est la seule preuve qu'une extraction n'a pas redessiné en silence.
- Écrans à données personnelles (Scolarité, messagerie) : compte de test ou floutage ; une capture a déjà dû être retirée du dépôt public.
- Un écran visiblement modifié reprend sa capture dans le MÊME changement, sous le même nom (une capture périmée trompe plus qu'une absence). Écran dépendant de l'heure ou d'une panne : menu flottant de simulation temporelle et interrupteur HORS LIGNE du menu de développement.
