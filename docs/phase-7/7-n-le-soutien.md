# 7-N — Le soutien

> **Cadre, hors code, délégué à l'équipe.** Aucune publication. Décidé le 2026-09-14
> ([mise à plat](7-mise-a-plat.md)). Ce document prépare le terrain pour que recevoir des dons soit, le jour
> venu, une affaire de mise en place et non de conception. Rien ici ne demande de release une fois l'entrée
> « Soutenir » livrée par [7-J](7-j-ecrans.md).

## Pourquoi

UKit coûte peu, et ce peu est réel : le plan Pro de la base, à partir de 25 dollars par mois ; le compte
développeur Apple, 99 dollars par an ; le compte Google Play ; le nom de domaine. Des subventions et des
partenariats viendront peut-être ; les dons ne s'y opposent pas, ils s'y ajoutent, et la page qui dit où
va l'argent sert aux trois.

## Les règles des stores

Elles décident de l'architecture, et elles se lisent mot à mot :

- **Apple**, *App Store Review Guidelines*, 3.2.2 (iv), pour une application qui n'est pas celle d'un
  organisme approuvé par Apple : « Apps that seek to raise money for such causes must be free on the App
  Store and may only collect funds outside of the app, such as via Safari or SMS. »
- **Google Play**, politique des paiements : les « tax exempt donations » font partie des paiements pour
  lesquels la facturation de Google Play ne s'applique pas.

Trois conséquences, qui ne se négocient pas :

1. **Le don se fait hors de l'application**, sur le site, **dans le navigateur du système** — jamais dans
   la vue intégrée, qui compterait comme une collecte dans l'application.
2. **Un don ne débloque rien dans l'application** : ni fonction, ni badge, ni thème, ni mention sur un
   écran. Un avantage numérique lié à un paiement est un achat intégré aux yeux d'Apple (3.1.1), et le
   don basculerait dans sa facturation. Les donateurs se remercient **sur le site**.
3. **Le vocabulaire dit « soutenir l'association »**, jamais « acheter », « débloquer » ou « premium ».

À préparer pour la première soumission qui contient l'entrée « Soutenir » : une note à l'équipe de revue
d'Apple, qui explique que KAE Lab est une association étudiante et que le don se fait sur son site. Et à
vérifier par l'équipe : si les dons ouvrent droit à une réduction d'impôt — seuls les organismes
d'intérêt général le peuvent —, ce qui change la façon d'en parler, pas l'architecture.

## HelloAsso

Le service retenu, pour trois raisons :

- **il ne coûte rien à l'association** : il se finance par une contribution que le donateur choisit, ou
  non, de laisser au moment de payer, et l'association reçoit le don entier ;
- **il est fait pour les associations françaises** : formulaire de don, cagnotte, adhésion, et le
  versement sur le compte bancaire de l'association ;
- **il a une API**, qui permet de lire les dons pour la jauge.

À vérifier par l'équipe à l'ouverture du compte : les pièces demandées à l'association, le délai de
versement, et la génération des reçus fiscaux si l'association y a droit.

## Les repas CROUS comme unité

Un don se montre **en repas** : un repas vaut un euro, en référence au repas à 1 € du CROUS. « 12 repas »
parle davantage à un étudiant que « 12 € », et le dit dans sa langue. La conversion est une **donnée de la
page**, pas une constante : si le tarif change, elle change avec lui. Les paliers du formulaire se nomment
en repas — 3, 5, 10, 20 —, et le montant en euros reste écrit à côté : on ne cache jamais ce qu'on paie.

## Le campus, et le jeu

Le formulaire demande **le campus** du donateur, en champ facultatif. La page Soutenir montre une **jauge
par campus**, en repas : un jeu bienveillant, pas un classement de personnes. Trois garde-fous :

- **aucun nom** dans la jauge, seulement des totaux par campus ;
- **les petits campus ne sont pas écrasés** : la jauge se lit aussi rapportée au nombre d'étudiants
  actifs du campus, que la mesure donne ([mesure.md](../mesure.md#lire-les-chiffres)) ;
- **un campus sous cinq dons s'affiche regroupé**, comme les petites cases de la mesure.

## La jauge

- Un **importeur**, sur le modèle de celui des retours ([`tools/retours/`](../../tools/retours/)) : un cron
  qui lit les dons par l'API de HelloAsso, avec les identifiants de l'association en secret de la CI, et
  n'écrit que des **agrégats**.
- Une table `soutien(campus, jour, montant, repas)`, lisible par tous — c'est un total, pas une liste de
  donateurs — et écrite par la seule clé de service
  ([backend.md](../backend.md#ce-qui-est-prévu-et-pas-encore-appliqué)).
- Les données des donateurs **restent chez HelloAsso** ; la base n'en reçoit rien.

## Remercier

- **Les donateurs** : la page Merci du site ([7-M](7-m-le-site.md#les-pages)), pour ceux qui ont accepté d'y
  figurer, sous le nom qu'ils ont choisi.
- **Les contributeurs et les volontaires de campus** : la même page, et **l'application aussi** — l'écran
  À propos et la colonne `credits` du catalogue ([campus/README.md](../campus/README.md)). Là, aucun argent
  n'est en jeu, et la règle des stores ne s'applique pas.

## L'entrée dans l'application

- Une rangée « Soutenir » dans les Réglages, livrée par le lot Réglages de [7-J](7-j-ecrans.md),
  **qui n'apparaît que si `services.soutien` existe** dans le catalogue : publier l'adresse l'allume, la
  retirer l'éteint, sans release.
- Elle ouvre **le navigateur du système** (`Linking.openURL`), jamais la vue intégrée.
- Aucune autre surface : pas de bannière, pas de relance, pas de notification. Un don se propose, il ne se
  sollicite pas.

## Qui fait quoi

| Geste | Qui |
|---|---|
| ouvrir le compte HelloAsso, créer le formulaire, écrire la page « Où va l'argent » | l'équipe |
| vérifier le droit aux reçus fiscaux | l'équipe |
| les pages Soutenir et Merci du site | le jalon du site ([7-M](7-m-le-site.md)) |
| l'importeur de la jauge et la table `soutien` | un développeur, en une session |
| la rangée « Soutenir » de l'application | le lot Réglages de [7-J](7-j-ecrans.md) |
| publier `services.soutien` | l'équipe, depuis la console, avec un admin ([7-H](7-h-console-roles.md)) |

## Limites écrites

- **La revue d'Apple reste une décision humaine** : une application qui renvoie vers un don hors
  d'elle-même peut être interrogée, et la note de revue est là pour y répondre.
- **La jauge n'est qu'un total** : elle ne dit pas qui a donné, et ne le dira pas.
- **Rien n'est dû au donateur dans l'application**, par construction, et la page Soutenir le dit.
