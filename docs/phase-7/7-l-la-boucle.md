# 7-L — La boucle

> **Cadre, pas encore spécification.** Publication : **6.4**. Renommée le 2026-09-14
> ([mise à plat](7-mise-a-plat.md)) : cette version s'appelait « le contenu » et rangeait ce qui attendait
> des annonces réelles et des dossiers remplis. Elle ferme désormais **la boucle** entre l'application,
> l'équipe et les utilisateurs. Ce document pose la direction et ce qui reste à trancher ; chaque partie se
> spécifie à l'ouverture, après la sortie de la 6.3 ([7-K](7-k-sortie-6-3.md)).

## La direction

Après la 6.2.3 ([7-D](7-d-la-mesure.md)), l'équipe sait ce qui est vu ; après la 6.3, l'application sait se
montrer. Ce qui manque, c'est le chemin du retour. Un étudiant qui veut dire quelque chose passe par
Google Forms, dans une vue intégrée ; une annonce importante ne réveille personne ; une affiche ne
circule pas hors de l'application ; et le site n'est qu'une vitrine. La 6.4 relie les quatre.

## Ce qui est à faire

### Un formulaire de retour natif

- Un écran dans l'application — un bug, une idée, une demande de campus —, relié à la table `retours`
  qui existe déjà ([6.1.x-C](../phase-6/6-1-x-c-retours.md)), avec une colonne `source` qui vaut `app`.
- L'écriture passe par une RPC bornée, `deposer_retour`, `security definer`, sur le modèle de
  `compter` : longueurs bornées, nature dans une liste fermée, campus, version et plateforme remplis
  par l'application, jamais par la personne.
- L'identifiant d'installation n'est joint **que si** la personne coche « on peut me répondre dans
  l'application » ; l'adresse e-mail reste le contact facultatif, comme dans le formulaire.
- La clé d'un retour est une empreinte SHA-256 (`retours.id`, `check ^[0-9a-f]{64}$`) : un retour
  natif prend l'empreinte de son contenu, de son instant et d'un sel tiré au hasard.
- **Google Forms reste tant qu'il sert** : la page d'engagement et le recrutement des volontaires de
  campus y vivent. Le critère de retrait s'écrit à l'ouverture.

### Les annonces en notification

- Un interrupteur « Annonces en notification », **éteint par défaut** : les règles d'Apple interdisent
  la notification promotionnelle sans un consentement explicite recueilli dans l'application, et une
  façon de le retirer (App Store Review Guidelines, section 4.5).
- `jetons_push` gagne un booléen `annonces`, déposé par `deposer_jeton` ; la fonction `notifier`
  ([pilotage.md](../pilotage.md#les-messages-en-notification-push)) apprend les annonces et ne vise
  que les jetons qui les ont acceptées ; `annonces.notifiee_le` et `annonces.notifies` en gardent la
  trace — une fois, jamais deux, comme pour les messages de service.
- Le bouton « Notifier » d'une annonce vit dans l'éditeur de la console ([7-F](7-f-console-annonces.md)),
  réservé à un rôle qui en a le droit ([7-H](7-h-console-roles.md)).

### Le partage d'une annonce

- La feuille de partage du système, depuis la fiche d'une annonce, avec l'adresse
  `https://ukit-bordeaux.fr/a/<id>`.
- Cette adresse est une page **du site**, qui lit l'annonce publiée avec la clé publiable et pose ses
  balises Open Graph : c'est l'aperçu dans une conversation WhatsApp, Instagram ou Messenger qui fait
  circuler une affiche ([7-M](7-m-le-site.md#la-page-dune-annonce)).
- Les **liens universels** ouvrent cette adresse dans l'application quand elle est installée :
  `associatedDomains` côté iOS, un filtre d'intention vérifié côté Android, et les deux fichiers de
  `/.well-known/` servis par le site.
- *Piège déjà visible* : [`BdeDetailsScreen`](../../src/features/Campus/Bde/BdeDetailsScreen.tsx) reçoit
  l'annonce entière par les paramètres de navigation et ne charge rien. Ouvrir une annonce par son `id`
  demande un chemin de lecture par identifiant, avec son état de chargement et son état « annonce
  expirée ou introuvable ».

### Les pages du site dans l'application

- Aide, nouveautés, confidentialité, soutenir : des adresses portées par `services` du catalogue —
  `services.aide`, `services.nouveautes`, `services.confidentialite`, `services.soutien` —, donc
  remplaçables sans release.
- Toutes s'ouvrent dans la vue intégrée, **sauf « Soutenir »**, qui s'ouvre dans le navigateur du
  système : c'est la règle des stores pour une collecte de fonds
  ([7-N](7-n-le-soutien.md#les-règles-des-stores)).
- `LEGAL_NOTICE` ([`urls.ts`](../../src/shared/constants/urls.ts)) pointe aujourd'hui `PRIVACY.md` sur
  GitHub ; il pointera la page de confidentialité du site.

### L'alerte de mise à jour, telle qu'elle est

`UpdateAlert` ([`AppUI.tsx`](../../src/shared/ui/AppUI.tsx)) lit déjà `app_release`, et la console
publie la ligne (page « Version publiée »). Elle reste telle quelle : aucun écran dédié n'est
nécessaire, et renseigner la ligne fait partie du protocole de sortie de chaque version.

## À trancher avant ouverture

- **La protection contre le flot**, pour la RPC de retour : sans compte, rien ne prouve qu'un dépôt
  vient d'un vrai appareil. Des longueurs bornées suffisent-elles, ou faut-il une fonction qui limite
  par adresse IP le temps d'une journée, sans rien en garder ?
- **Notes et résultats**, **compléments du portail Bordeaux INP et documents supplémentaires**,
  **l'affichage d'un calendrier externe dans le Planning** — demandé le 2026-09-03 ; les calendriers du
  téléphone sont livrés depuis [6.1.x-D](../phase-6/6-1-x-d-calendriers-du-telephone.md) : rangés ici
  depuis la [mise à plat du 2026-09-02](../phase-6/6-1-mise-a-plat.md), chacun se juge à l'ouverture, sur
  du contenu mesuré.
- **Deux évaluations reportées** : les onglets natifs par `@expo/ui`, et le typage de `Theme.ts`
  ([defauts-fonctionnels.md](../defauts-fonctionnels.md#les-styles-composés-du-thème-ne-sont-pas-typés)).
- **La mise en avant des annonces par créneaux n'est plus ici** : ses paramètres entrent en base avec
  [7-C](7-c-economie-et-socle.md#6-les-colonnes-additives), et l'ordre est rendu par l'application dès
  [7-I](7-i-releve-et-vocabulaire.md).

## Dépendances

- La 6.3, sortie.
- Le site refondu ([7-M](7-m-le-site.md)), pour la page d'annonce, les liens universels et les pages
  ouvertes dans l'application.
- La console : l'éditeur d'annonces ([7-F](7-f-console-annonces.md)) et les rôles
  ([7-H](7-h-console-roles.md)), pour la notification d'une annonce.

## Limites écrites

- **Une notification d'annonce n'atteint que qui l'a demandée**, par construction : c'est un canal plus
  étroit que les messages de service, et c'est voulu.
- **Un lien universel se vérifie sur un build signé et associé au domaine**, jamais sous Expo Go.
