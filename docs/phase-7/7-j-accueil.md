# 7-J, l'accueil refait : la vitrine vivante

Demande du propriétaire (2026-11-06) : l'accueil « est passé à la trappe » alors que c'est le moment
d'en mettre plein les yeux et de mettre en confiance. Trois directions montrées en planche (A la
vitrine vivante, B l'Épure en mouvement, C la typographie expressive) ; **A choisie le 2026-11-07**.

## La direction

L'accueil montre l'app avant de poser une question, et chaque réponse se voit tout de suite.

- **L'arrivée** : de vraies cartes de UKit (prochain cours, restaurant, bibliothèque) flottent en
  relief sur une lueur aux couleurs du logo ; un titre en deux tons ; une ligne d'origine vraie.
- **Les questions** : la question en grand titre, à gauche, sans carte qui l'enveloppe ; les
  réponses en tuiles qu'on touche ; un aperçu qui suit la réponse (le thème repeint un vrai planning).
- **Le compte** : ce que deviennent les identifiants, dit en tête, une fois.
- **La fin** : le planning du jour du groupe choisi se construit sous les yeux.
- **Le cadre** : une ligne de progression fine en haut, au dégradé du logo, à la place des points du
  bas ; le bouton plein de l'app (`ActionButton`) ; un fondu sous le pied.

Références : Revolut (une carte d'interface réelle qui flotte), Apple Météo (le fond vit, les cartes
passent dessus), Flighty (les heures en gros chiffres). Ce qui ne bouge pas : les décisions de
[onboarding.md](../features/onboarding.md#décisions-de-conception) (hors navigation, application
immédiate, session bloquante, contenu sous le pied).

## Les écrans

- [x] le cadre : progression en haut, bouton plein, fondu du pied, retour
- [x] l'arrivée, la vitrine
- [x] le thème et la langue, avec l'aperçu
- [x] l'établissement
- [x] le compte, et sa session (barre, jeu)
- [x] l'emploi du temps : les groupes (et la liste qui passait sous le bouton)
- [x] le lien iCal : le formulaire partagé, descendu sous l'en-tête du parcours
- [x] la fin, le planning qui se construit

Chaque lot se vérifie au banc dans les deux thèmes avant son commit ; l'accueil se rejoue par
`pm clear` sur le banc (données de test).

Retouches après l'essai sur iPhone (2026-11-08) : le slogan à la place de la ligne d'origine ; le
contenu passe sous la ligne de progression en fondu, comme sous les titres (`FonduDeBord`, la ligne
remontée juste sous la barre d'état) ; les exemples sont de vraies données des sources, dans les
cartes simplifiées. Vérifié en sombre et en clair, au format de l'iPhone 15 du banc et de l'A8.

Vérifié au banc le 2026-11-07 : chaque écran en sombre et en clair sur `ukit`, l'arrivée, le thème
et l'établissement au format de l'A8 (`ukit-a8`), où le badge « Cours magistral » de la vitrine
coupait « Algorithmique » en plein mot (passé à « CM »). Piège du banc : `pm clear` efface aussi les
réglages du client de développement, et le rechargement à chaud s'y retrouve coupé ; relancer
l'application à froid après chaque changement. Non vu : l'iPhone.
