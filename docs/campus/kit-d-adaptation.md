# Le kit d'adaptation d'un campus

> **Pour l'équipe, pas pour les développeurs.** Écrit le 2026-09-14. Adapter un campus, c'est deux
> moitiés : une **moitié publique** — ce que n'importe qui trouve sur les sites de l'université, sans
> compte et sans code — et une **moitié authentifiée** — le portail étudiant, qui se lit avec un compte
> prêté et s'écrit en Blueprints. Ce kit permet de faire toute la première moitié. La méthode complète,
> côté développement, est dans [adaptation-campus.md](../adaptation-campus.md).

## Les règles, avant tout

- **Ne jamais saisir d'identifiants universitaires** — les siens ou ceux de quelqu'un d'autre — pour
  collecter quoi que ce soit : tout ce que ce kit demande se trouve sans se connecter.
- **Ne jamais recevoir les identifiants d'un volontaire.** Ils vont directement au développeur, par le
  canal qu'il indique ; jamais dans un groupe de discussion, un document partagé ou un courriel collectif.
- **Ne jamais partager un lien d'emploi du temps personnel** : un lien d'abonnement iCalendar copié
  depuis un compte étudiant donne l'emploi du temps de cette personne à quiconque l'a. Seuls les liens
  publics comptent ici.
- **Les photos se prennent, elles ne se copient pas** : une photo de bâtiment publiée dans l'application
  doit être la nôtre. Un logo s'utilise avec l'accord du service communication de l'université.

## Ce qu'il faut collecter

### 1. L'identité

| À relever | Où | Forme | Exemple, Collège ST |
|---|---|---|---|
| le nom complet | le site de l'université | tel qu'il est écrit | Collège Sciences et Technologies |
| un nom court, qui tient sur un bouton | l'usage | quinze caractères au plus | Collège ST |
| la commune du campus | le site | la commune, pas la métropole | Talence |
| le logo | le service communication | SVG, ou PNG transparent d'au moins 512 px | — |
| **les mots des étudiants** | un rapide sondage autour de soi | une liste : les noms qu'on taperait pour chercher le campus | Talence, fac de sciences, Sciences et Techno |

### 2. L'emploi du temps

C'est la question qui décide de tout : **un campus dont l'emploi du temps n'est ni un Celcat ni un export
iCalendar demande une release** ([campus/README.md](README.md#ce-qui-exige-une-release)).

**Identifier le logiciel**, depuis la page d'emploi du temps publique de la composante :

| Si l'adresse ou la page contient… | C'est probablement… |
|---|---|
| `celcat`, ou un chemin en `/calendar` | Celcat |
| `ade`, ou un chemin en `direct/` | ADE |
| `hyperplanning`, ou `hplanning` | HyperPlanning |
| un lien en `.ics`, ou les mots « s'abonner », « exporter », « iCal » | un export iCalendar |

**Relever** : l'adresse de la page publique, le logiciel, et s'il existe **un export iCalendar public** —
sans connexion — par groupe ou par formation.

### 3. Les bâtiments

Un bâtiment sert à deux choses : **placer un cours sur la carte**, et **les salles libres** s'il est en
accès libre.

| À relever | Forme | Exemple |
|---|---|---|
| le **code**, **exactement** comme l'emploi du temps l'écrit dans le nom d'une salle | le préfixe du nom de salle | `A28` dans « A28/Salle 001 » |
| le nom | tel qu'il est affiché sur place | CREMI |
| les coordonnées | latitude et longitude en degrés décimaux — un clic droit sur la carte d'OpenStreetMap ou de Google Maps les donne | 44.807755, -0.597381 |
| l'**accès libre** pour travailler | oui ou non | oui |
| les **horaires d'ouverture**, jour par jour | lundi = 1 … dimanche = 7 ; un jour fermé ne s'écrit pas | 1 à 5 : 07:45 à 22:00 ; 6 : 07:45 à 18:00 |
| une **photo** | prise par l'équipe, en paysage | — |
| **la façon dont un nom de salle s'écrit** | trois exemples copiés de l'emploi du temps | « A22/Amphi B », « A29/Salle 105 » |

Les horaires et la photo ne comptent que pour un bâtiment en accès libre. Les trois exemples de noms de
salle servent au développeur à écrire le **motif de reconnaissance** des salles du campus.

### 4. Les bibliothèques

- Chercher chaque bibliothèque du campus dans **Affluences**, sur son site ou dans son application : si
  elle y figure, UKit saura montrer son affluence et ses horaires.
- Relever **un point central** du campus, en latitude et longitude : c'est autour de lui que
  l'application cherche les bibliothèques.
- Noter celles qui **n'y figurent pas** : elles n'apparaîtront pas, et c'est une chose à dire au campus.

### 5. Les restaurants universitaires

- Vérifier sur **croustillant.menu** que les restaurants du campus y figurent.
- Noter la région CROUS qui les porte : le développeur en déduit le numéro que l'application utilise
  (celle de Bordeaux vaut `1`).

### 6. Les services de l'ENT

Les adresses des portes, **copiées depuis la page d'accueil de l'ENT, sans se connecter** :

| Service | Exemple, Université de Bordeaux |
|---|---|
| l'ENT | `https://intranet.u-bordeaux.fr` |
| la messagerie | `https://webmel.u-bordeaux.fr` |
| la page de connexion (CAS) | `https://cas.u-bordeaux.fr` |
| Moodle | `https://moodle.u-bordeaux.fr` |
| la scolarité, les notes, les examens | `https://apogee.u-bordeaux.fr` |

**Si deux campus ont la même page de connexion, l'écrire** : c'est le signe qu'ils partagent un portail,
et que la moitié authentifiée ira beaucoup plus vite.

## Le modèle de fiche

À copier dans `docs/campus/<code>.md` à l'ouverture de la session : le développeur crée le fichier,
l'équipe le remplit.

```markdown
# <Nom du campus>

> Fiche ouverte le <date>. Compte prêté : oui ou non, reçu le <date> par le développeur.
> Volontaire crédité : <prénom ou pseudonyme>, ou « ne souhaite pas l'être ».

## Identité
- Nom complet :
- Nom court :
- Commune :
- Logo : <fichier ou lien, et l'accord du service communication>
- Mots des étudiants :

## Emploi du temps
- Page publique :
- Logiciel :
- Export iCalendar public : oui ou non, <adresse type, sans identifiant personnel>

## Bâtiments
| Code | Nom | Latitude | Longitude | Accès libre | Horaires | Photo |
|---|---|---|---|---|---|---|

Trois noms de salle copiés de l'emploi du temps :
-
-
-

## Bibliothèques
- Point central : <latitude, longitude>
- Sur Affluences :
- Absentes d'Affluences :

## Restaurants
- Sur Croustillant : oui ou non
- Région CROUS :

## Services de l'ENT
- ENT :
- Messagerie :
- Page de connexion :
- Moodle :
- Scolarité, notes, examens :

## Ce qui reste (rempli par le développeur)
```

## Ce qui reste aux développeurs

- lire les exports d'emploi du temps et, s'il le faut, écrire les Blueprints qui les jouent ;
- écrire le motif de reconnaissance des salles depuis les trois exemples ;
- publier les bâtiments dans la table `batiments`, et les photos dans le bucket ;
- écrire les Blueprints du portail, et les vérifier sur le compte prêté **et sur un téléphone** ;
- publier dans l'ordre — les Blueprints, puis la ligne de catalogue —, ajouter le campus aux sondes du
  matin, et **créditer** le volontaire s'il le souhaite ;
- tenir la fiche à jour jusqu'à la fin.
