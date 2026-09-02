# 6.1-D — Publication : ce qui se fait sans attendre la release

> **Le jalon parallèle.** Il ne dépend d'aucun build et commence dès que les mesures existent. Ses
> livrables sont des publications — Blueprints et lignes de catalogue — et une règle de procédure.
> Références S7 et P4 de la [mise à plat](6-1-mise-a-plat.md).

## La direction

La lenteur perçue des widgets (une minute au lancement) et du parcours froid (46 s à Bordeaux)
vient des **attentes fixes** des Blueprints, calées sur le portail le plus lent : 6 s pour laisser
une cascade se décider, 15 s après une soumission, 5 s avant de lire une chronologie. Elles ont
été justes le jour où elles ont été mesurées, et elles paient le pire cas à chaque run.

Un `wait_for` fait ce que le propriétaire du produit a décrit comme « rapide d'abord, lent en
repli » : il attend l'état réel de la page, pas plus, avec un plafond. C'est le même run, sans
double tentative.

## Ce qui est livré

### Des mesures avant des chiffres

Pour chaque établissement et chaque Blueprint de portail, un parcours froid et un parcours chaud
chronométrés **sur appareil, en cellulaire**, avec le temps réel de chaque cascade : arrivée sur le
CAS, retour vers le service, rendu de la page utile. Les chiffres s'écrivent dans
[`sources-externes.md`](../sources-externes.md), à côté des conditions déjà mesurées.

### Les Blueprints resserrés

Dans `ukit.portail.bordeaux.moodle`, `.messagerie`, `.dossier` et leurs pendants INP : chaque
`wait` fixe qui précède une lecture devient un `wait_for` sur un sélecteur de la page attendue,
avec un plafond au double de la mesure la plus lente. Les attentes qui suivent une soumission —
là où le moteur perd une opération émise pendant une cascade (limite écrite en 6-F) — gardent une
pause courte **puis** un `wait_for` : la pause protège l'opération, l'attente conditionnelle rend le
temps.

Chaque fichier est rejoué au poste (`aetherius run`, identifiants du `.env`) avant publication,
puis confirmé sur un appareil des deux établissements. Objectif écrit : un widget en **12 à 15 s**
à froid, un parcours froid Bordeaux **sous 30 s**.

### La règle des visuels (P4)

Remplacer une image publiée exige de changer son URL (`?v=N`) : les appareils mettent les images
en cache par adresse. La règle s'écrit dans [`campus-vie-etudiante.md`](../features/campus-vie-etudiante.md)
§ Publier ; la console de [6.1-B](6-1-b-pilotage-a-distance.md) l'applique d'elle-même.

## Décisions et pièges

- **Un plafond trop bas coûte plus qu'une attente trop longue.** Un `wait_for` qui expire fait
  échouer le run ; une pause de trop ne coûte que des secondes. Les plafonds sont larges, et les
  mesures sont là pour qu'ils le soient sans excès.
- **Une publication se fait à une heure creuse**, et l'ancienne version reste dans l'historique du
  bucket : revenir en arrière est une republication.

## Limites écrites

- **Les mesures datent.** Un portail qui ralentit à la rentrée suivante rend les plafonds faux ;
  les sondes de 6.1-B voient une panne, pas une lenteur. Une re-mesure par rentrée est le prix.
- **Le parcours froid ne descendra pas sous la somme de ses cascades.** Trois authentifications
  successives restent trois authentifications.
