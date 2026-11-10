# UKit

Application Expo (SDK 57, React Native 0.86) pour iOS et Android ; la console d'administration vit dans `console/`.

## Où lire l'état

- Ce qui est livré et ce qui reste : [docs/phase-7/README.md](docs/phase-7/README.md#létat).
- Les défauts connus, à consigner plutôt qu'à corriger hors périmètre : [docs/defauts-fonctionnels.md](docs/defauts-fonctionnels.md).
- Conventions, définition de « terminé » : [CONTRIBUTING.md](CONTRIBUTING.md). Une branche par version (`v6.3` en cours), `main` avancée à la sortie.

## Portes

```bash
npx tsc --noEmit && npx eslint . && npm test
npm run parity                                       # si un Blueprint ou une source bouge
npm --prefix console run build                       # si src/shared bouge : la console le partage
npx expo export --platform android && npx expo export --platform ios   # si une dépendance native bouge
```

## Vérifier sur le banc Android, sans téléphone

Mode d'emploi complet et limites : [docs/qualite.md](docs/qualite.md#le-banc-android).

```bash
tools/appareil/banc.sh demarrer ukit-a8              # Android 9 au format de l'A8 ; `ukit` = Android 15
npx expo start --dev-client --port 8081              # en arrière-plan, journal dans un fichier
tools/appareil/banc.sh ouvrir
tools/appareil/banc.sh capture <fichier.png>         # puis lire l'image
~/Android/Sdk/cmdline-tools/latest/bin/android layout --flat                 # arbre d'écran en JSON
~/Android/Sdk/cmdline-tools/latest/bin/android input tap 'text=/^Suivant$/'  # forme exacte : `text=` seul est une sous-chaîne
```

- Le build de développement est dans `~/Android/builds/` et s'installe une fois (`banc.sh installer`). Il ne se refait que si une dépendance native change : `npx eas-cli build -p android --profile development --non-interactive --no-wait`, puis télécharger l'artefact sans attendre (EAS les expire).
- Les parcours de WebView (Scolarité, connexion universitaire) se jugent sur `ukit` : la WebView de `ukit-a8` date de 2018.
- Les identifiants des portails et de l'ENT sont dans `.env` (`PORTAIL_*`, `ENT_*`) : les charger dans la commande même (`set -a; . ./.env; set +a`), ne jamais les afficher.
- En fin de session : `banc.sh arreter` et Metro arrêté. Un seul émulateur à la fois (3,5 Go).
- iOS n'est pas sur le banc : relire dans le diff les familles qui cassent sur iOS seul (qualite.md), et laisser le passage iPhone à la release.
