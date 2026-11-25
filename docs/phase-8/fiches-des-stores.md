# Les fiches de confidentialité des stores, pour la 7.0

> **Préparé le 2026-11-25** (lot 7). Le contenu exact à saisir dans App Store Connect (*App Privacy*)
> et dans la Play Console (*Data safety*) pour la 7.0, par rapport à ce qui est déclaré depuis la 6.3.1
> ([7-D](../phase-7/7-d-la-mesure.md), [7-K](../phase-7/7-k-sortie-6-3.md)). Les définitions viennent des
> pages des deux stores, lues ce jour-là : « App privacy details on the App Store » (Apple) et « Provide
> information for Google Play's Data safety section » (Google). La politique à laquelle les deux fiches
> renvoient est [PRIVACY.md](../../PRIVACY.md), sur `main` à la sortie. **Aucune n'est saisie** : c'est
> au propriétaire de le faire, au moment dit plus bas.

## Quand saisir

- **Play Console** : avec l'envoi de la 7.0 en examen, dans la même session. Une fiche *Data safety*
  modifiée passe en examen avec la version.
- **App Store Connect** : juste avant d'envoyer la 7.0 en examen. Une réponse *App Privacy* se publie
  sans mise à jour de l'application et vaut aussitôt pour la version en ligne ; déclarer un jour plus tôt
  ce que la 6.3 ne collecte pas encore ne trompe personne, l'inverse si.
- **L'adresse de la politique** reste `https://github.com/KAE-Lab/UKit/blob/main/PRIVACY.md` : elle
  montrera le texte de la 7.0 dès que `main` avance à la sortie. Vérifier qu'elle l'a fait avant de
  publier la fiche d'Apple.

## Ce qui change, en une table

| Donnée de la 7.0 | D'où elle vient | App Store (*App Privacy*) | Google Play (*Data safety*) |
|---|---|---|---|
| les compteurs de la mesure | 7-D, inchangés | Usage Data → Product Interaction, *not linked* | App activity → App interactions |
| la clé de l'appareil, l'empreinte d'adresse IP du jour, le jeton de notification | lot 1 ; 6.1.x-E | **Identifiers → Device ID**, *linked* | **Device or other IDs** |
| les signalements | lot 2 | **User Content → Other User Content**, *linked* | **App activity → Other user-generated content** |
| les votes (sondages, « moi aussi ») | lots 3 et 4 | compris dans Other User Content | **App activity → Other actions** |
| le texte d'un retour, les réponses | lot 3 | **User Content → Customer Support**, *linked* | compris dans Other user-generated content |
| les captures d'un retour | lot 3 | **User Content → Photos or Videos**, *linked* | **Photos and videos → Photos** |
| le contexte d'un retour (version, appareil, système, échecs de source) | lot 3 | **Diagnostics → Other Diagnostic Data**, *linked* | **App info and performance → Diagnostics** |
| l'adresse d'un volontaire | lot 3 (et l'ancien formulaire) | **Contact Info → Email Address**, *linked* | **Personal info → Email address** |
| la position, le calendrier, les documents, les identifiants universitaires, la carte du jour | — | rien : traité sur l'appareil, jamais envoyé | rien, pour la même raison |

Les choix qui ne vont pas de soi, et leur raison :

- **« Linked to you » partout sauf la mesure.** Apple tient pour liée toute donnée rattachée à un
  appareil, et toute donnée personnelle au sens du droit applicable. Un signalement porte la clé de son
  appareil en base ; un retour peut porter une adresse et du texte libre. La mesure seule est
  dé-identifiée avant l'envoi, et reste *not linked*.
- **La clé de l'appareil est un *Device ID***, pas un *User ID* : elle désigne une installation, sans
  compte. L'empreinte d'adresse IP, gardée vingt-quatre heures pour les plafonds, se déclare au même
  titre : Apple demande de déclarer l'adresse selon son usage, et elle n'est pas jetée à la fin de la
  requête. Le jeton de notification, gardé en base depuis 6.1.x-E, n'avait pas de ligne : il entre ici.
- **Rien n'est « partagé »** (*shared*) au sens de Google : Supabase (la base), Expo (les
  notifications) et Google lui-même pour Play Integrity traitent pour le compte de KAE Lab, ce que la
  page de Google exclut du partage. App Attest est un service d'Apple : Apple ne demande pas de déclarer
  ce qu'il collecte lui-même.
- **Aucun suivi** (*tracking*) : aucune donnée ne se relie à des données de tiers pour la publicité, ni
  ne part chez un courtier.
- **Tout est facultatif** (*optional*) côté Google : la mesure et les notifications se coupent d'un
  interrupteur, et le reste ne part que d'un geste (contribuer, écrire). Apple n'a pas cette case :
  rien de la communauté ne remplit ses critères de déclaration facultative (une collecte rare, hors de
  la fonction principale) ; tout se déclare.
- **Le retour en *Customer Support*** chez Apple (« données produites par l'utilisateur pendant une
  demande d'assistance »), et en *Other user-generated content* chez Google (« open-ended
  responses ») plutôt qu'en *Messages*, que Google réserve à la messagerie et au chat.

## App Store Connect, *App Privacy*

App Store Connect → Apps → UKit → *App Privacy* (barre latérale).

1. **Privacy Policy** : l'adresse ci-dessus, inchangée. Vérifier qu'elle montre le texte de la 7.0.
2. **Data Types** → *Edit*. À « Do you or your third-party partners collect data from this app? » :
   **Yes, we collect data from this app** (inchangé).
3. Cocher, en plus de **Usage Data → Product Interaction** déjà coché :
   - **Contact Info** → *Email Address* ;
   - **User Content** → *Photos or Videos*, *Customer Support*, *Other User Content* ;
   - **Identifiers** → *Device ID* ;
   - **Diagnostics** → *Other Diagnostic Data*.

   Ne rien cocher d'autre : ni *Location* (la position ne quitte pas le téléphone), ni *User ID*, ni
   *Crash Data*, ni *Search History*. *Save*.
4. Pour chaque type, *Set Up*, trois questions à l'écran : les finalités, le lien à l'identité, le
   suivi.

| Type | Finalités à cocher | Linked to the user? | Used for tracking? |
|---|---|---|---|
| Product Interaction | **Analytics** | **No** (inchangé) | No |
| Email Address | **App Functionality** | **Yes** | No |
| Photos or Videos | **App Functionality** | **Yes** | No |
| Customer Support | **App Functionality** | **Yes** | No |
| Other User Content | **App Functionality** | **Yes** | No |
| Device ID | **App Functionality** | **Yes** | No |
| Other Diagnostic Data | **App Functionality** | **Yes** | No |

   *App Functionality* est la finalité qu'Apple donne à l'assistance, à la prévention de la fraude et
   aux mesures de sécurité, ce que font la clé, l'empreinte et le contexte d'un retour. Ne cocher ni
   *Analytics* pour ces types (seule la mesure sert à compter), ni *Product Personalization* (la carte
   du jour se calcule sur le téléphone), ni aucune publicité.
5. *Publish*. Attendu sur la fiche publique : « Data Used to Track You » absent ; « Data Linked to
   You » : Contact Info, User Content, Identifiers, Diagnostics ; « Data Not Linked to You » : Usage
   Data.

## Play Console, *Data safety*

Play Console → UKit → *Policy and programs* → *App content* → *Data safety* → *Manage*. Le formulaire
s'ouvre sur les réponses de la 6.3.1.

1. **Overview** : *Next*.
2. **Data collection and security** :
   - « Does your app collect or share any of the required user data types? » : **Yes** (inchangé).
   - « Is all of the user data collected by your app encrypted in transit? » : **Yes**. Tout ce qui
     part va en HTTPS (la base, la fonction, Expo, Google).
   - « Do you provide a way for users to request that their data is deleted? » : **Yes**. Le
     mécanisme est l'adresse contact@kaelab.dev, que [PRIVACY.md](../../PRIVACY.md) donne (points 5
     bis et 7). Si le formulaire demande une adresse web pour la suppression, donner celle de la
     politique.
   - Les badges (*Families*, *Independent security review*) : non. *Next*.
3. **Data types**, cocher, en plus de **App activity → App interactions** déjà coché :
   - **Personal info** → *Email address* ;
   - **Photos and videos** → *Photos* ;
   - **App activity** → *Other user-generated content*, *Other actions* ;
   - **App info and performance** → *Diagnostics* ;
   - **Device or other IDs** → *Device or other IDs*.

   Ne rien cocher d'autre : ni *Location*, ni *Calendar*, ni *Files and docs*, ni *Messages*. *Next*.
4. **Data usage and handling**, pour chaque type, les mêmes questions :

| Type | Collected / Shared | Processed ephemerally? | Required or optional | Purposes |
|---|---|---|---|---|
| App interactions | **Collected** (inchangé) | No | **Optional** | **Analytics** |
| Email address | **Collected** | No | **Optional** | **App functionality** |
| Photos | **Collected** | No | **Optional** | **App functionality** |
| Other user-generated content | **Collected** | No | **Optional** | **App functionality** |
| Other actions | **Collected** | No | **Optional** | **App functionality** |
| Diagnostics | **Collected** | No | **Optional** | **Analytics** |
| Device or other IDs | **Collected** | No | **Optional** | **App functionality**, **Fraud prevention, security, and compliance** |

   *Shared* reste décoché partout. *Diagnostics* va en *Analytics* parce que Google y range le
   diagnostic des bugs ; c'est l'usage du contexte d'un retour.
5. **Preview** : la fiche publique doit dire « No data shared with third parties », « Data is encrypted
   in transit », « You can request that data be deleted », et lister les sept types collectés. *Save*,
   puis envoyer avec la 7.0.

## Ce qu'un juriste doit relire

Aucun avis juridique n'est écrit à ce jour ([le plan](README.md#ce-que-les-spécifications-devront-tenir)).
Avant la sortie de la 7.0, à faire relire avec [PRIVACY.md](../../PRIVACY.md) et
[la page des règles](https://ukit-bordeaux.fr/communaute) :

- **Les bases légales** de chaque traitement (RGPD, art. 6) : PRIVACY.md n'en nomme aucune. Les
  candidates : l'intérêt légitime pour les plafonds, l'empreinte d'adresse et la réputation ;
  l'exécution du service ou le consentement pour les contributions et les retours ; le consentement
  pour la réponse dans l'application, déjà recueilli par une case décochée.
- **Le responsable de traitement** : KAE Lab, association ; son adresse postale, que les mentions
  légales du site portent, n'est pas dans PRIVACY.md.
- **La durée de conservation d'un retour** : « tant qu'il sert à améliorer l'application » n'est pas
  une durée. Une durée chiffrée (par exemple, douze mois après la clôture) demanderait une purge de
  plus, hors du lot 7.
- **Les droits sur des données pseudonymes** : KAE Lab ne sait pas relier une clé d'appareil à une
  personne, donc ne peut pas retrouver « ses » signalements. PRIVACY.md le dit ; à confirmer que cela
  suffit (RGPD, art. 11).
- **Les transferts hors de l'Union** : Supabase (la région du projet), Expo, Apple et Google. La région
  de la base et les clauses des sous-traitants sont à vérifier et à nommer.
- **Les règles de la communauté** face au règlement sur les services numériques (art. 14, 16 et 17) et
  à l'App Review d'Apple (1.2) : le rappel « d'un toucher » à la première contribution suffit-il, ou
  faut-il une acceptation explicite.
- **Les deux fiches** ci-dessus, en particulier *linked* pour la clé d'appareil et l'absence de
  partage pour Play Integrity.
