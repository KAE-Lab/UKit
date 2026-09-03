### Politique de Confidentialité et de Protection des Données - UKit Bordeaux

L'application UKit Bordeaux est gérée et maintenue par l'organisation étudiante **KAE Lab**. Nous plaçons le respect de votre vie privée au cœur de notre application. Cette politique explique en détail quelles données sont utilisées, comment elles le sont, et confirme notre engagement à ne collecter aucune donnée personnelle.

**1. Données personnelles et d'identification**
L'application ne collecte, ne stocke, ni ne transmet aucune donnée personnelle nominative (nom, prénom, adresse e-mail, numéro de téléphone, identifiants étudiants). L'utilisation de l'intégralité de l'application se fait sans aucune création de compte.

**2. Utilisation du Calendrier de l'appareil (Autorisations iOS / Android)**
*   **Pourquoi nous le demandons :** UKit Bordeaux propose une fonctionnalité optionnelle permettant de synchroniser votre emploi du temps universitaire (ex: "Cours de Mathématiques à 8h00") directement avec le calendrier personnel de votre appareil.
*   **Utilisation des données :** L'application a besoin de lire la liste de vos calendriers existants afin que vous puissiez choisir le calendrier de destination via les Paramètres. Ensuite, elle écrit les événements de cours dans ce calendrier précis. 
*   **Confidentialité garantie :** Toutes les opérations de lecture et d'écriture du calendrier sont effectuées **exclusivement en local sur votre appareil**. Aucune donnée de votre calendrier personnel n'est envoyée vers notre base de publication (voir le point 5), vers KAE Lab, ou vers un quelconque serveur tiers.

**3. Géolocalisation**
*   **Pourquoi nous la demandons :** Votre position géographique (si vous l'autorisez) est utilisée uniquement pour calculer la distance entre vous et les restaurants universitaires (CROUS) ou les bibliothèques (BU) les plus proches. 
*   **Confidentialité garantie :** Cette donnée est traitée instantanément et localement sur l'appareil. Nous ne conservons aucun historique de position et vos coordonnées GPS ne quittent jamais votre téléphone.

**4. Sauvegarde locale des préférences (App Storage)**
UKit mémorise vos choix (langue préférée, favoris de groupes de TD/TP, identifiant du calendrier sélectionné pour la synchronisation, etc.) pour améliorer votre expérience utilisateur. Ces préférences sont stockées de manière robuste via votre système d'exploitation avec l'outil de mémoire locale et ne sont jamais téléversées : notre base de publication (point 5) ne reçoit **aucune** écriture de l'application, par construction.

**4 ter. L'identifiant d'installation**
À sa première ouverture, l'application tire au hasard un identifiant (un UUID) qu'elle garde dans le trousseau de votre appareil. Il ne sert qu'à une chose : savoir si cet appareil fait partie des quelques téléphones de l'équipe qui voient les annonces et les messages en avant-première. **Il ne quitte jamais l'appareil** — l'application télécharge la courte liste des appareils enregistrés et compare chez elle. Il n'est lié ni à votre personne, ni à votre compte universitaire, ni à votre téléphone (ce n'est pas un identifiant publicitaire ni un numéro de série), et il ne s'affiche qu'à votre demande, dans un menu de développement.

**4 bis. Documents que vous rangez dans l'onglet Scolarité**
Les pièces que vous ajoutez vous-même (certificats de scolarité, attestations, etc.) **restent sur l'appareil, dans l'espace privé de l'application, et ne sont envoyées nulle part.** Cet espace est isolé des autres applications par votre système d'exploitation, et couvert par le chiffrement de l'appareil lorsque celui-ci est verrouillé. Nous n'écrivons pas « chiffrés par UKit » : une clé qui vivrait à côté du fichier ne protégerait de rien, et le véritable rempart est celui de votre système.

Ces fichiers ne sont **jamais téléversés**, ni vers notre base de publication, ni vers un tiers. L'application ne les récupère pas non plus automatiquement depuis votre portail universitaire : vous les ajoutez vous-même. Ouvrir une pièce passe par la feuille de partage de votre système — si vous y choisissez une destination distante, c'est votre décision, pas la nôtre. Supprimer une pièce dans l'application la supprime de l'appareil ; désinstaller l'application les supprime toutes.

**5. Appels réseau et services tiers**
Afin de vous fournir des informations actualisées, UKit Bordeaux effectue des requêtes anonymisées vers les services suivants :
*   **API UKit :** Pour télécharger les emplois du temps des groupes que vous avez sélectionnés (requêtes anonymes basées sur le code du groupe).
*   **Croustillant :** Pour synchroniser les menus des restaurants universitaires. 
*   **Affluence :** Pour récupérer le taux d'occupation des bibliothèques en temps réel.
*   **OpenStreetMap :** Utilisé pour afficher le fond de carte concernant la localisation des campus universitaires. 
*   **Base de publication UKit :** Pour récupérer le contenu que nous publions — annonces de vie étudiante, messages de service, référentiel des bâtiments, catalogue des établissements, et les fichiers d'instructions qui décrivent comment interroger les sources ci-dessus. Ces requêtes sont **en lecture seule et anonymes** : elles ne portent ni identifiant d'appareil, ni compte, ni donnée vous concernant, et rien ne nous est envoyé. Les contenus réservés à certains campus ou à certaines versions de l'application sont **triés sur votre appareil**, pas par la base : elle ne sait ni quel campus vous avez choisi, ni quelle version vous utilisez. L'application fonctionne sans cette base : tout ce qu'elle publie existe déjà dans l'application installée, et n'y est que mis à jour.

**Vos identifiants universitaires :** ils sont chiffrés par le trousseau de votre système d'exploitation, ne sont envoyés **qu'au service d'authentification de votre université**, et ne transitent par aucun intermédiaire — ni notre base de publication, ni un service tiers. C'est la raison pour laquelle l'application se connecte directement depuis votre appareil plutôt que de déléguer cette connexion à un service distant.

**Diagnostic et suivi de bugs :** Aucun outil de suivi (tracking), d'analyse de comportement, ou de diagnostic de crash (comme Sentry ou Firebase Analytics) n'est actif dans le code source de l'application, assurant un total anonymat lors de l'utilisation.

**6. Conservation des données**
Puisqu'aucune donnée de télémétrie ou de profil n'est collectée, aucune information vous concernant n'est conservée après utilisation de l'application. Notre base de publication ne porte que du contenu que **nous** publions, et n'a aucune table où une donnée d'utilisateur pourrait être écrite.

**7. Contact**
Pour toute question relative à cette politique de confidentialité ou au fonctionnement de notre code open-source, vous pouvez nous contacter à l'adresse : **contact@kaelab.dev** ou consulter le code source sur notre GitHub public.
