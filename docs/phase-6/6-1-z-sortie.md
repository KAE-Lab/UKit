# 6.1-Z — Sortie de la 6.1

> **La clôture, et le protocole de release écrit une fois pour toutes.** La soirée du 31 août a
> appris cinq choses en cinq heures ; ce document est là pour qu'aucune ne se réapprenne.

## Ce qui sort

La version **6.1.0**, « la consolidation de la v6 » : les jalons [A](6-1-a-robustesse-scolarite.md),
[B](6-1-b-pilotage-a-distance.md), [C](6-1-c-passe-de-code.md), [E](6-1-e-finitions-interface.md)
livrés et vérifiés ; [D](6-1-d-publication.md) livré par publication, avant.

## Le protocole de release

1. **Le socle est à jour de ce qui est publié** : établissements, Blueprints (`versions.json` et
   manifeste concordent), visuels. Le test de divergence de 6.1-A est vert.
2. **Versions** : `package.json` et `app.config.ts` portent le numéro ; le CHANGELOG a sa section
   datée ; `app_release` en base porte la version et le lien des stores.
3. **Portes** : `tsc`, ESLint à zéro, la suite unitaire, la parité, `expo-doctor` sans écart.
4. **Identifiants EAS** : un `eas credentials -p ios` **avant** le workflow si une capacité iOS a
   été ajoutée (le profil de provisionnement du 31 août ne portait pas les notifications).
5. **Le workflow** « Mobile App Release » en dispatch, `build_production: true`, depuis `master`.
6. **Test sur build** avant la production : TestFlight et la piste interne du Play, avec un
   message de service d'audience `testeurs` comme premier test réel du canal.
7. **Notes de review** inchangées (compte universitaire infournissable), notes de version dans la
   voix éditoriale, captures si un écran de la fiche a changé.
8. **Après la mise en ligne** : un message de service `info` ciblé `version_max` de la version
   précédente — « la 6.1 est disponible » — plutôt qu'une annonce.

## Ce qui vient après

**La 6.2 est une version entière consacrée au mouvement de l'interface**, décidée le 2026-09-04 en
vérifiant [6.1-E](6-1-e-finitions-interface.md) : ce jalon a rendu l'application correcte, il ne l'a
pas rendue fluide, et le second travail n'est pas la suite du premier. Voir le
[README de phase](README.md#la-v6-part-en-deux-temps--puis-trois).

**La 6.3 porte ce qui attend le contenu** : notes et résultats, mise en avant des annonces par
créneaux, compléments INP et documents supplémentaires — tout ce qui demande un dossier rempli et des
annonces réelles. Plus les deux évaluations reportées : onglets natifs / `@expo/ui`, et le typage de
`Theme.ts`.

## Limites écrites

- **Une consolidation ne se voit pas.** Les notes de version de la 6.1 devront dire ce qui change
  pour l'utilisateur — les messages, les campus, les chargements qui parlent — et pas le nettoyage.
- **Le protocole est une liste, pas une automatisation.** L'automatiser viendrait après avoir
  constaté qu'on le joue souvent.
