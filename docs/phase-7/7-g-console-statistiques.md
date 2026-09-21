# 7-G — Les statistiques

> **Spécification, ouverte le 2026-09-14, pas encore livrée.** Aucune publication. Le troisième des quatre
> jalons de la console, sur le socle de [7-E](7-e-console-socle.md) : lire la mesure posée par
> [7-D](7-d-la-mesure.md). Il s'ouvre quand la 6.3, qui porte la mesure depuis le 2026-09-21, est en
> production depuis deux semaines — avant, les courbes n'auraient rien à dire.

## La direction

Une mesure n'a de valeur que lue. 7-G donne à chacun des trois lecteurs de
[mesure.md](../mesure.md#les-trois-lecteurs) la page qui répond à sa question, et à l'équipe le document
qu'elle remet à un partenaire.

## Ce qui est à faire

### Les pages

| Page | Ce qu'elle montre | Lecteur |
|---|---|---|
| **Vue d'ensemble** | le parc actif par campus, version et plateforme (`jetons_push`) ; les sessions par jour et par campus ; les onglets vus ; la part de chaque version dans le parc | équipe, 6.3 |
| **Annonces** | pour une annonce et une période : impressions, ouvertures, actions, et les deux taux ; le classement des annonces de la période ; la comparaison par campus | équipe |
| **Sources** | les échecs de source dans le temps, par hôte et par famille, posés contre l'état des sondes du matin | pilotage |
| **Réglages** | la part des thèmes, des langues, de la synchronisation et des notifications | 6.3 |

Des graphiques en **Recharts**, sobres : une courbe, un histogramme, un tableau. Une période se choisit
une fois et vaut pour toutes les pages ; les appareils testeurs sont **exclus par défaut**, et une bascule
les réintègre.

### Le rapport partenaire

Pour une annonce, ou pour toutes les annonces d'un partenaire, sur une période : les impressions, les
ouvertures, les actions et les taux, par campus et par semaine, avec la définition de chaque chiffre
écrite en bas de page. **Exportable en CSV**, et imprimable en PDF par la feuille d'impression du
navigateur — une mise en page d'impression dédiée, pas une bibliothèque de plus.

### Le calcul

**Les agrégats se calculent dans la console**, à partir des lignes de `mesures` que les éditeurs lisent.
C'est la règle de la base : ni vue ni fonction qui calcule ([backend.md](../backend.md#le-schéma)). Le
volume le permet — quelques centaines à quelques milliers de lignes par jour à l'échelle du parc
actuel — ; les lectures se paginent par `.range()`, et une période longue se charge par tranches. Le jour
où le volume ne le permet plus, la question se rouvre, avec sa mesure.

### Les petites cases

**Aucune case sous cinq ne s'affiche** : elle devient « moins de 5 », et le rapport partenaire regroupe
les campus trop petits en « autres campus ». La règle vient de [mesure.md](../mesure.md#les-petites-cases),
et elle vaut pour l'export comme pour l'écran.

## Décisions et pièges

- **Les versions antérieures à la 6.3 ne comptent rien** : une courbe de sessions commence avec son
  adoption, et monte d'abord parce que le parc se met à jour. La vue d'ensemble pose à côté la part de
  la 6.3 dans le parc, pour que personne ne lise une croissance là où il y a une mise à jour.
- **Un taux sur un petit dénominateur ne veut rien dire** : sous vingt impressions, il s'affiche grisé.
- **Les impressions sont dédoublonnées par session**, pas par personne : un étudiant qui ouvre
  l'application trois fois dans la journée voit trois fois la carte.

## Dépendances

[7-E](7-e-console-socle.md) ; [7-D](7-d-la-mesure.md), en production depuis deux semaines.

## Plan de test

1. **L'exactitude.** Pour une annonce et une semaine, chaque chiffre de la page égal à une requête SQL
   faite à la main ([mesure.md](../mesure.md#lire-les-chiffres)).
2. **Les petites cases.** Un campus à moins de cinq sessions : « moins de 5 » à l'écran et dans l'export.
3. **Les testeurs.** Des sessions jouées sur un appareil enregistré : absentes par défaut, présentes avec
   la bascule.
4. **L'export.** Le CSV s'ouvre dans un tableur, accents intacts ; l'impression tient sur des pages
   lisibles.

## Limites écrites

- **Les chiffres commencent avec la 6.3**, et sous-comptent tant que le parc n'a pas migré.
- **Le parc actif est celui qui garde les notifications**, donc un minorant
  ([mesure.md](../mesure.md#lire-les-chiffres)).
