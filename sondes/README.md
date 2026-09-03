# Les sondes du matin

Chaque matin à 7 h (heure de Paris ; 6 h en hiver — le cron de GitHub est en UTC), un workflow
installe le moteur Aetherius et Chromium, joue une sonde par source tierce **sans aucun identifiant**,
écrit l'état dans la table `sondes`, et ouvre — ou ferme — une issue GitHub quand il change. La
notification arrive sur le téléphone par l'application GitHub, sans autre service. La console
([`console/`](../console/README.md)) montre la même chose en page Sources.

C'est ce qui manquait le 18 août 2026 : le relais Celcat est mort un été entier sans que personne ne
le sache, et Moodle a cassé le soir de la sortie de la 6.0. Voir [docs/pilotage.md](../docs/pilotage.md).

| Source | Sonde | Ce qu'elle prouve, sans identifiant |
|---|---|---|
| `celcat` | [`ukit.celcat.groupes`](../blueprints/ukit-celcat-groupes.blueprint.json), le Blueprint de l'application | la liste des groupes rend plus de zéro entrée |
| `cas-bordeaux`, `cas-bordeaux-inp` | [`ukit.sonde.cas`](cas.blueprint.json) | la page de connexion sert son formulaire (`renew=true` le garantit) |
| `moodle-bordeaux` | [`ukit.sonde.moodle`](moodle.blueprint.json) | la chaîne SSO initiée par l'IdP atteint le formulaire du CAS |
| `ade-bordeaux-inp` | [`ukit.portail.bordeaux-inp.edt`](../blueprints/portails/ukit-portail-bordeaux-inp-edt.blueprint.json), le Blueprint de l'application | l'export d'une ressource se lit comme un calendrier |
| `publication` | native, [`sonde/manifeste.py`](sonde/manifeste.py) | le manifeste se lit, et chaque fichier servi porte l'empreinte qu'il annonce |

Les entrées qui peuvent changer — l'adresse d'un CAS, l'ENT qui lui sert de `service`, le projet
ADE de l'année, la première ressource du référentiel — sont **lues dans le catalogue publié**
([`sondes.json`](sondes.json), clé `catalogue`), la même ligne que l'application. Sinon chaque
rentrée produirait une fausse panne le lendemain.

## Jouer en local

Avec le venv d'Aetherius (ou `pip install -r sondes/requirements.txt` puis
`python -m playwright install chromium`), et `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` dans le `.env` :

```bash
set -a && source .env && set +a
python sondes/jouer.py --dry-run                              # joue tout, n'écrit rien, n'ouvre rien
python sondes/jouer.py --dry-run --source celcat              # une seule
python sondes/jouer.py --dry-run --source cas-bordeaux --casser cas-bordeaux   # 127.0.0.1:4 : le chemin « injoignable »
python -m unittest discover -s sondes                        # le verdict, sans moteur
```

## Panne de source, erreur de sonde

Le verdict ([`sonde/verdict.py`](sonde/verdict.py)) distingue deux choses que le moteur ne distingue
pas pour nous. Mesuré : `RunEngine.run` avale toute erreur du moteur en `Result(status=failed, error=str)`
— la classe est perdue — et une étape nommée (`on_timeout: "fail:CODE"`) préfixe son message par `CODE:`.
Le verdict se lit donc sur **l'étape qui a échoué**, son code et son message ; la famille n'est
qu'informative.

- **Panne de source** : un run qui échoue, ou une exception dont la cause est réseau. La ligne est
  écrite, `change_le` bouge si l'état change, une issue s'ouvre. Le workflow reste **vert**.
- **Erreur de sonde** : un Blueprint invalide, une entrée introuvable, une dépendance absente, un
  plantage. La ligne reste intacte, aucune issue, et le workflow passe au **rouge**. Sans cette
  distinction, un runner cassé ouvrirait six issues un matin.

Un Blueprint avec `options.debug: true` est refusé avant d'être joué : hors debug le run est
headless, avec debug il lance un Chromium visible et attend — dans un runner sans écran, une sonde
qui pend puis meurt sans rien mesurer.

## Sur GitHub, une fois

- le secret `SUPABASE_SERVICE_ROLE_KEY` (la table `sondes` ne s'écrit qu'avec la clé de service) ;
- les variables `SUPABASE_URL` (partagée avec la console) et `SONDES_ASSIGNEE` (le compte GitHub à
  prévenir : l'organisation n'est pas une personne, et sans assignation la notification sur le
  téléphone n'est pas garantie) ;
- le label `sonde` est créé par le runner s'il manque.

Pour vérifier la chaîne sans attendre le matin : *Actions → Sondes → Run workflow*, `casser` =
`cas-bordeaux` → une issue s'ouvre ; puis un run normal → elle se ferme.

## Limites écrites

- **Les sondes tournent depuis une adresse américaine** (runners GitHub). Une source qui filtrerait
  par pays passerait en panne le matin sans l'être en France — le corps de l'issue le rappelle.
- **Elles prouvent qu'un formulaire est atteignable, pas qu'il se passe.** Un mot de passe dans les
  secrets serait un secret de plus pour un gain faible : les pannes de l'été auraient toutes été vues
  sans lui.
- **Une issue est une notification pauvre.** Si la fréquence le justifie, un webhook Discord se
  branche au même endroit (`sonde/github.py`).
- **Elles voient une panne, pas une lenteur** : un portail qui ralentit passe, jusqu'au plafond de
  son `wait_for`.
