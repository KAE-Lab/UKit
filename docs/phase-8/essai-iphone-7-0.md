# L'essai de la 7.0 sur iPhone

Tout ce que les sept lots ont laissé « à juger sur l'iPhone », en une passe d'une demi-heure, dans
l'ordre d'un parcours. Écrit par la [recette d'ensemble](README.md#létat) du 2026-11-25. Chaque point :
l'écran et le geste, puis **ok** (ce qui prouve la réussite) et **ko** (ce qui prouve l'échec). Un ko se
note avec l'heure, il se consigne au [registre](../defauts-fonctionnels.md).

## 0. Préparer (cinq minutes, une fois)

1. **Installer « UKit Dev »** : sur l'iPhone, ouvrir dans Safari la page du build iOS
   `2575da3b-aeb6-4584-b269-10b9f8cd2c14`
   (https://expo.dev/accounts/kaelab/projects/Ukit/builds/2575da3b-aeb6-4584-b269-10b9f8cd2c14),
   **Install**. Si iOS le demande : *Réglages → Confidentialité et sécurité → Mode développeur*, puis
   redémarrer. **ok** : « UKit Dev » à côté de l'application du store. **ko** : « impossible
   d'installer » — le profil ne porte pas l'appareil ; refaire le build avec
   `--refresh-ad-hoc-provisioning-profile` ([plateforme.md](../plateforme.md#le-build-de-développement--les-quatre-choses-qui-se-perdent)).
2. **Servir le JavaScript** depuis le poste, sur `prochaine-version` :
   `npx expo start --dev-client --port 8081` (ajouter `--tunnel` si le Wi-Fi isole les appareils), puis
   ouvrir le projet dans UKit Dev.
3. **Faire de l'iPhone un testeur** : UKit Dev → Réglages → À propos → sept touchers sur la version →
   bulle « UKit » → onglet Testeur → **Copier** ; dans la console, ajouter l'identifiant aux testeurs.
   Le build de développement a son propre identifiant : celui de l'application du store ne vaut pas.
4. **Dans la console**, audience **Les testeurs seulement** : une annonce datée d'aujourd'hui (une heure
   dans la soirée, un lieu) ; une seconde avec un sondage à deux choix. Les effacer à la fin.

## 1. Accueil et première connexion

- **Première connexion juste après l'installation** — accueil → Collège ST → identifiants de Bordeaux →
  Se connecter, sans relancer l'application avant. **ok** : « Connecté » en une vingtaine de secondes.
  **ko** : « Le portail de l'université ne répond pas » trois fois de suite, puis réussite après avoir
  tué et relancé l'application — le défaut vu une fois au banc ([registre](../defauts-fonctionnels.md#la-première-connexion-après-une-installation-peut-ne-jamais-aboutir-sur-le-banc--relevé-par-la-recette-densemble-de-la-70-le-2026-11-25-non-reproduit)).
- **Le tracé de l'accueil et les zones sûres** (7-J), au passage : le cercle et la coche de la fin se
  tracent ; rien sous l'encoche ni sous la barre d'accueil.

## 2. L'appareil attesté (lot 1)

Le [protocole du lot 1](1-base-communautaire.md#le-protocole-sur-téléphone), en entier :
- Testeur → bloc « Communauté ». **ok** : « attestation : App Attest · clé à enregistrer ».
- **Essai d'envoi**. **ok** : « essai · attesté · poids 1 », puis « App Attest · clé enregistrée ».
  **ko** : « non attesté » ou « échec · … » — le journal de la fonction `communaute` dit pourquoi.
- **Essai d'envoi** une seconde fois. **ok** : même résultat, sans nouvel enregistrement.
- Dans le Studio : `select nature, environnement, compteur from appareils order by cree_le desc limit 1;`
  **ok** : `app_attest`, `developpement`, `2`.

## 3. Planning (lots 5 et 6)

- **La carte du jour** en tête du Planning. **ok** : l'heure du premier et du dernier cours, la jauge
  avec le trait de l'heure, « Midi » et deux restaurants avec leur distance au bâtiment, dans les deux
  thèmes. **ko** : carte rognée, ombre absente, texte sous la barre d'état.
- **L'événement** — Campus → l'annonce datée → **Ajouter à mon planning**. **ok** : l'`Alert` iOS
  « Suivre les événements du campus ? », deux boutons, puis l'événement dans le Planning jour et
  semaine, sa fiche avec **Retirer de mon planning**. **ko** : pas de dialogue, ou un dialogue qui ne se
  ferme pas.
- **La synchronisation** (si l'agenda est activé) : l'événement ajouté arrive dans le calendrier
  « UKit » de l'app Calendrier, avec son lieu ; **Retirer** l'en enlève au passage suivant. **ko** : il
  n'arrive pas, ou les événements de l'abonnement y arrivent aussi.

## 4. Campus (lots 2 et 4)

- **Sur place d'un restaurant** — une fiche de RU → **Signaler**. **ok** : la feuille, puis, à la
  première contribution, le rappel des règles dans la feuille, **Compris**, le toast « non vérifié » si
  l'attestation a échoué, rien sinon. **ko** : la feuille se ferme sans rappel, ou deux fenêtres
  s'empilent.
- **Les sélecteurs dans la feuille** — **Horaires faux**, puis une heure ; **Fermé plusieurs jours**, puis
  la date. **ok** : la roue d'iOS s'ouvre **dans** la feuille, « Confirmer » la referme, la valeur
  s'inscrit dans la puce. **ko** : la roue sous le clavier, hors de l'écran, ou qui ne se referme pas.
- **Recommander un plat**, dernier choix de la liste. **ok** : la liste défile seule jusqu'aux plats
  (correctif de la recette). **ko** : rien de nouveau à l'écran, « Envoyer » éteint.
- **« Ça attend ? »** aux heures du service, position accordée, à proximité d'un RU. **ok** : la
  question, trois puces, un toucher envoie. **ko** : absente à côté d'un RU ouvert.
- **Le sondage** de l'annonce de test : voter. **ok** : la coche, « Pas encore assez de voix ». Au
  passage, sans risque : une bibliothèque et un bâtiment montrent **Sur place**, et les cartes ont leur
  ombre (7-J).

## 5. Retours (lots 3 et 4)

- **Nous écrire** — Réglages → Nous écrire, un problème, le clavier ouvert. **ok** : le champ reste
  visible au-dessus du clavier, les blocs « Joint au message » se coupent un à un. **ko** : le champ
  sous le clavier, ou le bas de l'écran inaccessible.
- **Ajouter une capture** — **ok** : le sélecteur de photos d'iOS, **sans** demande de permission ; la
  vignette jointe. **ko** : une demande d'accès à la photothèque.
- **La capture détectée** — dans UKit Dev, prendre une capture d'écran (côté + volume). **ok** : la carte
  « Signaler » sous la barre d'état, qui se retire seule ; **Signaler** ouvre le formulaire avec l'écran
  de UKit joint. **ko** : rien, ou la capture du système jointe.
- **La réponse en tête** — envoyer un retour avec **Recevoir la réponse ici**, y répondre depuis la
  console, tuer et relancer UKit Dev. **ok** : le dialogue « Réponse de l'équipe » une fois le splash
  fini, puis « Mes retours » et « Nouvelle réponse ». **ko** : dialogue absent, ou posé sur le logo du
  splash et figé (au banc, il apparaît pendant le fondu du splash).
- **Deux annonces au même lancement** (lot 4) — en plus de la réponse, une idée soutenue passée
  **livrée** dans la console, puis relancer. **ok** : la réponse, puis l'idée, l'une après l'autre.
  **ko** : une seule des deux, jamais l'autre.
- **Boîte à idées** et **Noter UKit** — **Moi aussi** sur une idée. **ok** : « Soutenue ». **Noter UKit** :
  la page d'écriture d'un avis de l'App Store s'ouvre. **ko** : la fiche de l'application sans le
  formulaire d'avis.

## 6. Le reste, sans risque, en une minute

Sombre puis clair, français puis anglais et espagnol sur le Planning et une fiche de RU (rien de coupé,
« ¿Hay cola? ») ; le glissement entre onglets ; la barre d'état lisible dans les deux thèmes.

## Après

Effacer, dans la console, les annonces de test, le retour et sa réponse ; ôter l'iPhone des testeurs si
besoin. Rapporter les ko, avec l'heure, pour le registre.
