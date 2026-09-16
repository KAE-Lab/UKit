# IUT de Bordeaux

> Fiche ouverte le 2026-09-16, par le relevé public du lot 1 de
> [7-B](../phase-7/7-b-nouveaux-campus.md). Compte prêté : annoncé le 2026-09-14, **pas encore reçu**.
> Volontaire crédité : à demander.
>
> **Verdict : sans code, sous réserve d'une vérification.** L'emploi du temps est **PRONOTE Campus** —
> ni Celcat, ni export iCalendar *public*. Mais PRONOTE donne à l'étudiant connecté une **adresse
> d'abonnement iCalendar**, et ce chemin est **prouvé de bout en bout** : sur
> [Bordeaux Montaigne](bordeaux-montaigne.md#lexport-icalendar-existe-et-il-change-le-verdict), **même
> produit**, l'adresse collée dans l'application affiche les cours sur l'appareil, le 2026-09-16.
> **Il ne reste donc qu'une chose à confirmer ici** : que l'IUT n'a pas désactivé l'export — c'est un
> réglage d'établissement, et le seul écart possible entre deux serveurs du même produit.

## Identité
- Nom complet : **IUT de Bordeaux**
- Nom court : **IUT Bordeaux**
- Commune : **Gradignan** (siège, 15 rue Naudet, 33175) — l'IUT a **quatre sites** : Agen
  (Campus Michel Serres), Bordeaux-Bastide, Gradignan, Périgueux (Campus Périgord)
- Logo : à demander au service communication
- Mots des étudiants : *à collecter* — proposés : « IUT », « IUT Bordeaux », « Gradignan », « BUT »
- Code proposé : **`bordeaux-iut`** — **confirmé**, aucun conflit avec le catalogue publié
  (`bordeaux`, `bordeaux-inp`, `autre`)

En quelques chiffres, d'après son site : 16 départements de formation, 4 sites, environ 4 000
étudiants.

## Emploi du temps
- Page publique : **aucune**
- Logiciel : **PRONOTE Campus** — `https://pronote.iut.u-bordeaux.fr`, titre de page
  « PRONOTE Campus - IUT de BORDEAUX »
- Export iCalendar public : **non**
- Ancienne adresse : `hyperplanning.iut.u-bordeaux.fr` **redirige en 301** vers `pronote.iut…` —
  l'IUT a changé de logiciel et gardé l'ancien nom en résidu DNS

## Bâtiments

*Non collectés : sans emploi du temps lisible, on ne sait pas encore **comment** une salle s'écrit,
et c'est cette écriture qui décide du code d'un bâtiment.* Les quatre sites, pour la suite :

| Site | Adresse | Latitude | Longitude |
|---|---|---|---|
| Gradignan (siège) | 15 rue Naudet, 33175 Gradignan | 44.79124 | -0.60930 |
| Périgueux | Rond-point Suzanne Noël, 24019 Périgueux | 45.19608 | 0.71867 |
| Agen | Avenue Michel Serres, 47000 Agen | *à relever* | *à relever* |
| Bordeaux-Bastide | *à relever* | *à relever* | *à relever* |

Trois noms de salle copiés de l'emploi du temps :
- *à relever avec le compte prêté*

## Bibliothèques
- Point central : **44.79124, -0.60930** (Gradignan)
- Sur Affluences : **aucune bibliothèque universitaire de l'IUT** dans le jeu régional rendu par
  `sites/map`. La *Médiathèque Jean Vautrin* de Gradignan y figure, mais elle est **municipale** et
  n'a pas sa place dans une liste de BU
- Absentes d'Affluences : la ou les bibliothèques de l'IUT, s'il en existe — **à dire au campus**

## Restaurants
- Sur Croustillant : **oui**
- Région CROUS : **1 (Bordeaux)** — le point de l'IUT y est nommé `23 | Crous market' de l'iut`

## Services de l'ENT
- ENT : `https://intranet.u-bordeaux.fr` — **l'intranet unifié de l'université**
- Intranet historique de l'IUT : `https://intranet.iut.u-bordeaux.fr/main/doku.php`, un DokuWiki
  toujours en ligne, derrière le même CAS
- Messagerie : `https://webmel.u-bordeaux.fr` *(celle de l'Université de Bordeaux, à confirmer)*
- Page de connexion : **`https://cas.u-bordeaux.fr`** — **la même que `bordeaux`**
- Moodle : `https://moodle.u-bordeaux.fr` *(à confirmer)*
- Scolarité, notes, examens : `https://apogee.u-bordeaux.fr` *(à confirmer)*

**L'IUT partage le portail de l'Université de Bordeaux.** Mesuré : `intranet.iut.u-bordeaux.fr`
répond `302` vers `https://cas.u-bordeaux.fr/cas/login?service=…&gateway=true`. La ligne de catalogue
pourra donc référencer `ukit.portail.bordeaux.*` sans rien dupliquer — sous réserve de la
vérification sur compte réel, que [6-G](../phase-6/6-g-etablissements.md) a rendue obligatoire.

## Ce que la mesure du 2026-09-16 a établi

**L'emploi du temps n'est pas dans le Celcat de Bordeaux, et la preuve est plus fine qu'une absence.**
Les 96 groupes `BUTD*` (`BUTD1A1` … `BUTD2F8`) **existent** dans l'inventaire public
(`ReadResourceListItems`, `resType=103`, 2 958 groupes). Mais interrogés sur tout le semestre
(`GetCalendarData`, 2026-09-01 → 2026-12-20), ils rendent **8 événements chacun, tous de catégorie
`Vacances`**, sans salle et sans site — là où le témoin `INF1CIA1`, du Collège ST, rend **32
événements réels**, avec leurs salles (`A22/Salle 109`, `CREMI - Bât. A28`).

Autrement dit : **le Celcat déclare les groupes de l'IUT et ne publie que leur calendrier de
vacances.** C'est un piège de méthode à retenir — lire l'inventaire des groupes aurait fait conclure
que l'IUT est couvert.

L'inventaire des salles le confirme : 286 salles, préfixes `A21`, `A22`, `CREMI`, `IMA`, `A29`… —
**la géographie de Talence**, avec une seule mention hors campus (un amphithéâtre de Carreire).

## Ce qui reste (rempli par le développeur)

1. **Confirmer l'export iCal sur le compte prêté** — le premier geste, et le seul qui décide du coût
   de ce campus. Sur Montaigne, même produit, la boîte « Export au format iCal » de l'espace étudiant
   donne une adresse d'abonnement. Si elle est là ici aussi, l'IUT est utilisable **sans une ligne de
   code** ; si l'établissement l'a désactivée, PRONOTE redevient un troisième type de source, qui
   exige une release ([README](README.md#ce-qui-exige-une-release)).
2. Relever les bâtiments, leurs codes **tels que PRONOTE les écrit**, et le motif de reconnaissance.
3. Les coordonnées des sites d'Agen et de Bordeaux-Bastide.
4. Confirmer les adresses de services, et la réutilisation des Blueprints `ukit.portail.bordeaux.*`.
5. Demander au campus si ses bibliothèques peuvent rejoindre Affluences.
