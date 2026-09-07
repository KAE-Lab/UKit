# Adapter un nouveau campus

Comment UKit passe d'une demande — *« mon campus n'est pas dans la liste »* — à un établissement qui
marche. **Ce chantier est hors version** : rien de ce qui suit n'exige de release, et Bordeaux INP a
été mis en ligne comme ça, sans en passer par une ([6-G](phase-6/6-g-etablissements.md)).

Ce document répond à la première demande des utilisateurs. Sur les seize premières réponses du
formulaire, **neuf demandent un campus** — voir la [mise à plat](phase-6/6-2-mise-a-plat.md) § 2.3.

## Ce que la mesure du 2026-09-06 a établi

Trois faits, et ils décident de tout le reste.

**Deux demandes sur neuf portent sur un campus déjà servi.** L'établissement s'appelle « Collège
Sciences et Technologies » dans la liste, et l'autre « Bordeaux INP ». Un étudiant de Talence ou de
l'Enseirb ne s'y reconnaît pas et remplit le formulaire pour demander ce qu'il a déjà. C'est un
défaut de nommage, et il se corrige par une publication.

**Le serveur Celcat de Bordeaux ne porte qu'un seul collège.** Mesure sur l'inventaire public
(`ReadResourceListItems?searchTerm=_&pageSize=10000&resType=103`) : 2 954 groupes, préfixes INF, SV,
PHY, CHI, SPI, SSE, BG, MIASHS, MEC, EEA, IMA — et **zéro** groupe Droit, AES, Santé, Psycho, Socio,
Odonto, Pharma, INSPE. Carreire, Montesquieu, la Victoire et l'INSPE ont donc une **autre** source
d'emploi du temps, qu'il faut trouver.

**Mais leur portail, lui, est déjà écrit** : ces composantes partagent le CAS
(`cas.u-bordeaux.fr`), `mondossierweb`, le Moodle par SSO non sollicité, Apogée et le webmail. La
ligne `bordeaux` les décrit déjà.

> **Et ça ne vaut pas vérification.** Bordeaux INP avait un compte réel, et il a quand même fallu
> **huit défauts trouvés sur appareil** pour que son portail marche — dont deux `mondossierweb`
> différents sous le même nom. Un intranet partagé ne dit rien des écrans. La règle de
> [6-G](phase-6/6-g-etablissements.md) tient : *« ajouter un établissement reste un travail
> d'auteur. Le mécanisme supprime la release, pas l'écriture des Blueprints ni leur vérification sur
> un compte réel. »*

## Le principe : un compte prêté, et le travail se fait seul

**Ce n'est pas une posture nouvelle.** `PORTAIL_BORDEAUX_INP_*`, dans le `.env` gitignoré, est déjà
un compte prêté par une connaissance, et c'est ce qui a rendu le jalon 6-G possible. On formalise ce
qui a marché.

Une boucle collaborative avait été envisagée le 2026-09-06 — le volontaire joue le parcours, envoie
un rapport de run, on publie un correctif de Blueprint à chaud, il rejoue — puis **rejetée** : trop
lente, et elle demande au volontaire un engagement dans la durée que le prêt d'un accès ne demande
pas. Ne pas la reproposer sans raison nouvelle.

## La marche à suivre

### 1. Se reconnaître *(immédiat, publication)*

Renommer les lignes de catalogue avec les mots que les étudiants emploient, et dire quels campus sont
couverts là où l'établissement se choisit.

> **Le code `bordeaux` ne bouge pas.** Il partitionne le trousseau, les réglages et les favoris : le
> renommer déconnecterait tout le parc installé. Seul le libellé change.

Et rendre visible ce qui existe déjà : la ligne `autre` porte `edt.abonnement`, donc **n'importe qui
peut coller son lien iCal** dans [`LienEdtForm`](../src/features/Planning/components/LienEdtForm.tsx)
et avoir son emploi du temps aujourd'hui. Presque tous les produits de planning savent exporter en
iCal — c'est le constat qui a ouvert [6-I](phase-6/6-i-planning-universel.md). C'est la réponse
immédiate à qui vient de demander son campus.

### 2. Recruter *(immédiat, hors code)*

Par une **section du formulaire existant**. Le formulaire demande déjà « Quel campus aimerais-tu
adapter » ; on y branche une case à cocher et le contact facultatif, avec le lien vers la page
d'engagement. Les libellés sont **exacts** — l'importeur des retours reconnaît les questions par leur
libellé ([`tools/retours/projection.mjs`](../tools/retours/projection.mjs)), et ne renommer aucune
question existante est la règle :

- dans la section finale, commune à toutes les branches, une réponse courte facultative :
  *« Ton adresse e-mail, si tu veux qu'on te réponde (facultatif) »* ;
- dans la branche « Demander un campus », une case à cocher unique :
  *« Serais-tu prêt·e à prêter un accès pour adapter ton campus ? »* —
  *« Oui, j'ai lu la page d'engagement et on peut me contacter »*, le lien vers la page dans le
  titre ou la description, au choix.

Google Forms ne sait pas rendre une question obligatoire selon une autre réponse. Pour exiger
l'adresse d'un volontaire : faire suivre l'option « Oui » d'une section qui pose **la même question
d'adresse, avec le même libellé, en obligatoire**. La feuille gagne une seconde colonne du même
nom, et l'importeur prend la première non vide.

Tout est déjà câblé : la pastille d'état de service, `ModaleCampusNonRelie` et le bouton
« Demander » d'un état vide pointent **tous** sur ce formulaire, par `services.adaptation` du
catalogue. Voir [6.1.x-C](phase-6/6-1-x-c-retours.md).

### 3. La page d'engagement *(écrite le 2026-09-07)*

Publiée sur le site, **[ukit-bordeaux.fr/engagement.html](https://ukit-bordeaux.fr/engagement.html)**
(dépôt `UKit-website`, un push sur `main` publie) — l'adresse publique qu'un volontaire peut lire,
versionnée, datée, et citable par un lien depuis le formulaire comme depuis une conversation. Elle
avait d'abord été prévue à côté de la console, sur GitHub Pages ; l'adresse d'un outil
d'administration n'était pas la bonne pour une page qu'on donne à lire.

Elle dit, en toutes lettres :

- **ce qui est demandé** : les identifiants du portail de son université ;
- **ce qui en est fait** : rejouer les parcours de lecture pour écrire et vérifier les Blueprints de
  son établissement ;
- **combien de temps** : pendant l'adaptation, **et ensuite** — pour corriger un défaut et pour
  vérifier qu'un ajout ne casse rien. C'est le vrai besoin, donc c'est ce que la page doit dire. Un
  accord qui prétendrait couvrir deux semaines alors que l'accès sert un an ne vaudrait rien ;
- **ce qui n'est jamais fait** : aucune écriture sur son compte, aucun stockage hors d'un fichier
  local non versionné, aucune transmission à qui que ce soit ;
- **que le mot de passe temporaire est à son choix** — elle peut le changer avant, le donner, le
  rechanger après, ou ne rien changer du tout ;
- **que changer son mot de passe révoque tout**, à tout moment, sans prévenir et sans rien demander ;
- **que la surveillance quotidienne ne l'utilise pas** : les [sondes](../sondes/README.md) jouent
  les sources sans identifiants (étape 8), donc l'accès prêté ne sert qu'à ce qui est authentifié.

### 4. Le prêt

`PORTAIL_<CODE>_USER` et `PORTAIL_<CODE>_PASS` dans le `.env` **gitignoré**, exactement comme
`PORTAIL_BORDEAUX_INP_*`. Rappel de [blueprints.md](blueprints.md) : un seul couple peut porter les
noms `portail_user` / `portail_pass` à la fois, et les identifiants se passent explicitement à
`aetherius run`.

### 5. Mesurer, écrire, mettre au point

D'abord ce qui est **public**, et qui se mesure depuis n'importe quel poste : la source d'emploi du
temps de la composante, les bâtiments, les points de balayage des bibliothèques, le motif de
reconnaissance des salles, la région CROUS. Documenter dans
[sources-externes.md](sources-externes.md), comme le demande `CONTRIBUTING.md`.

Puis les Blueprints de portail, sous le préfixe réservé `ukit.portail.`, dans `blueprints/portails/`
— vérifiés sur le compte prêté **et sur appareil**. C'est là, et nulle part ailleurs, que Bordeaux
INP avait trouvé ses huit défauts.

> **`:text-is()`, `:has-text()` et `:nth-match()` sont propriétaires à Playwright.** Un Blueprint mis
> au point avec le moteur Python passe, puis échoue sur l'appareil, avec un message sans rapport.
> **XPath est le seul langage de sélection que les deux moteurs partagent** — un test du dépôt
> refuse les autres.

### 6. Créditer, si la personne le veut

Une colonne `credits` sur la ligne de catalogue de son campus — donc **publiable et retirable sans
release** — plus les crédits du `README.md` et l'écran À propos. Prénom ou pseudonyme, à son choix.

> Ajouter cette colonne, c'est les **trois gestes** : `supabase/schema.sql`, la valeur dans **toutes**
> les lignes de `supabase/etablissements.sql`, et le nom dans `COLONNES` de
> [`src/shared/etablissements/index.ts`](../src/shared/etablissements/index.ts). En oublier un
> efface des données en silence.

### 7. Publier, dans l'ordre

1. **Les Blueprints d'abord** (`npm run blueprints:publish`), la ligne de catalogue **ensuite**. Une
   ligne qui nomme un Blueprint non publié fait échouer le parcours d'un étudiant sur une erreur que
   personne ne sait lire.
2. **Une ligne de catalogue remplace, elle ne fusionne pas.** Oublier une colonne ne laisse pas la
   valeur d'avant : **elle la supprime**. C'est ce qui a effacé le logo de Bordeaux pendant des
   semaines. Une ligne s'écrit entière.
3. `batiments`, à l'inverse, **fusionne champ par champ** — un nul y veut dire « je ne corrige pas ce
   champ ».

### 8. Surveiller sans le compte

Ajouter les sources critiques du nouveau campus à `sondes/sondes.json`. Les sondes quotidiennes les
jouent **sans identifiants** et ouvrent une issue au changement d'état : c'est ce qui borne le besoin
de garder l'accès prêté, et c'est un argument à mettre dans la page d'engagement.

### 9. À la release suivante

Refléter la ligne dans [`socle.ts`](../src/shared/etablissements/socle.ts) et ajouter les Blueprints
du portail à `BUNDLED` de [`blueprints/index.ts`](../blueprints/index.ts). **Deux tests l'exigent** :
le binaire n'embarque un établissement que s'il embarque de quoi le jouer.

## Ce qui est écarté, et pourquoi

- **La boucle collaborative** (rapport de run partagé par le volontaire, correctif publié à chaud,
  rejeu) : envisagée puis rejetée le 2026-09-06. Trop lente pour les deux parties.
- **Écrire quoi que ce soit vers la base depuis l'application** : `PRIVACY.md` affirme que la base
  *« ne reçoit aucune écriture de l'application, par construction »*, et rien de ce chantier ne
  l'entame.
- **Publier un campus « en cours d'adaptation »** — une ligne dont les colonnes `portail_*` sont
  nulles, qui tomberait sur le teaser déjà en place. **Possible, mais pas retenu pour l'instant** :
  tant que la moitié publique n'est pas mesurée (étape 5), un étudiant qui choisirait son campus
  n'obtiendrait presque rien. À rouvrir campus par campus.

## L'état des demandes

| Campus | Statut |
|---|---|
| Talence, Enseirb-Matmeca | **déjà couverts** — étape 1 |
| Carreire, Sciences humaines, AES, Droit, INSPE | composantes de l'Université de Bordeaux : portail déjà écrit, emploi du temps et géographie à mesurer, **vérification par un compte de cette composante à obtenir** |
| Université Bordeaux Montaigne | **le seul établissement réellement nouveau** demandé : CAS distinct, ENT distinct, Blueprints à écrire de zéro |
