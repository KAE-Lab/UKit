# 6.1.1-Z — Sortie de la 6.1.1

> **Une sortie qui ne montre rien.** La 6.1.1 monte le socle, corrige la synchronisation automatique
> et branche l'entrée des retours. Son intérêt est d'être **attribuable** : si quelque chose casse
> après elle, c'est la montée.

## Ce qui sort

La version **6.1.1** : [A](6-1-1-a-montee-du-socle.md) la montée du socle,
[B](6-1-1-b-signalements.md) ce qui a été signalé, [C](6-1-1-c-retours.md) les retours — ce dernier
livré par publication, avant.

Le numéro est juste : **aucune capacité n'est ajoutée**. La version corrige, et change une fondation
que personne ne voit.

## Le protocole

Celui de [6.1-Z](6-1-z-sortie.md), joué tel quel — il a été écrit une fois pour toutes. Trois points
lui sont propres cette fois :

1. **Les identifiants EAS se revérifient avant le workflow.** Une montée de SDK touche la
   configuration native ; le profil de provisionnement iOS avait déjà coûté une soirée le 31 août.
2. **Le test sur build compte double.** TestFlight et la piste interne du Play, sur les deux
   plateformes, avec le protocole appareil de 6.1.1-A joué en entier — pas un survol.
3. **La mesure de 24 heures de 6.1.1-B doit être faite sur un build de production**, pas seulement
   sur un build de développement : les tâches de fond ne sont pas ordonnancées pareil.

## Ce qui vient après

**La 6.2 reste la version du mouvement**, telle que le
[README de phase](README.md#la-v6-part-en-deux-temps--puis-trois) l'a définie le 2026-09-04. Elle
s'ouvre par [son relevé](6-2-a-releve-et-vocabulaire.md), et la boucle d'itération que cette
version-ci restaure est ce qui la rend jouable.

**Le [chantier campus](../adaptation-campus.md) court en parallèle**, hors version : il ne demande
aucune release.

## Limites écrites

- **Les notes de version n'auront presque rien à dire.** Une correction attendue, et le silence sur
  le reste. C'est normal, et il vaut mieux l'écrire que d'inventer une nouveauté.
- **Une montée de socle ne se rejoue pas.** Si elle passe mal en production, le retour arrière est
  une release, pas une publication — c'est la seule partie de ce plan qui ne se corrige pas à chaud.
