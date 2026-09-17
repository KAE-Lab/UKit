"""La sonde de la requete groupee (jalon 7-C, section 3 b), jouee a la main par la facade Python du moteur.

    python sondes/mesures/occupation_groupee.py --jours 2026-09-22 2027-01-06 2026-10-27
    python sondes/mesures/occupation_groupee.py --trouver-examens 2026-12-01 2027-01-31

Pour un batiment (A28 par defaut) : la liste des salles, puis, par journee, `ukit.celcat.occupation`
joue une fois avec tous les identifiants et une fois par salle ; la comparaison (comparaison.py) dit si
le nom de salle porte par la description suffit a reattribuer chaque evenement. Le verdict s'ecrit dans
docs/features/campus-salles-libres.md.

Le moteur est importe paresseusement, comme dans sonde/moteur.py : les tests de la comparaison
tournent sans lui. Environnement : le venv d'Aetherius, ou `pip install aetherius==0.5.9`.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from mesures.comparaison import Bilan, Evenement, Salle, comparer, verdict  # noqa: E402

RACINE = Path(__file__).resolve().parents[2]
BLUEPRINTS = RACINE / "blueprints"
DOMAINE = "https://celcat.u-bordeaux.fr/calendar"
PAUSE_S = 0.4
MOTIF_EXAMEN = re.compile(r"examen|partiel|contr[oô]le|\bds\b|[eé]preuve", re.IGNORECASE)


def jouer(nom: str, entrees: dict) -> dict:
    from aetherius import Aetherius  # noqa: PLC0415 - le pre-vol et les tests tournent sans le moteur

    resultat = Aetherius().run(str(BLUEPRINTS / f"{nom}.blueprint.json"), inputs=entrees)
    if getattr(resultat, "status", None) != "success":
        raise RuntimeError(f"{nom} : {getattr(resultat, 'status', '?')} — {getattr(resultat, 'error', None)}")
    return resultat.outputs


def salles_du_batiment(domaine: str, batiment: str) -> list[Salle]:
    """La regle d'extractBuildingsFromRooms : mot entier d'abord, inclusion en repli, hors « en attente »."""
    brutes = jouer("ukit-celcat-salles", {"domaine": domaine, "res_type": "102", "recherche": "_"})["salles"]
    motif = re.compile(rf"\b{re.escape(batiment)}\b", re.IGNORECASE)
    salles = []
    for brute in brutes:
        libelle = str(brute.get("libelle", ""))
        if "en attente" in libelle.lower():
            continue
        if motif.search(libelle) or batiment in libelle:
            salles.append(Salle(str(brute.get("id", "")), libelle))
    return salles


def evenements(domaine: str, salles: list[str], jour: str) -> list[Evenement]:
    brutes = jouer("ukit-celcat-occupation", {"domaine": domaine, "res_type": "102", "salles": salles, "jour": jour})["evenements"]
    liste = []
    for brute in brutes:
        description = str(brute.get("description") or "")
        vacances = str(brute.get("categorie") or "") == "Vacances" or "vacances" in description.lower()
        liste.append(Evenement(str(brute.get("id", "")), description, vacances))
    return liste


def mesurer(domaine: str, salles: list[Salle], jour: str) -> Bilan:
    groupe = evenements(domaine, [salle.id for salle in salles], jour)
    individuels = {}
    for salle in salles:
        time.sleep(PAUSE_S)
        individuels[salle.id] = evenements(domaine, [salle.id], jour)
    return comparer(jour, groupe, individuels, salles)


def trouver_examens(domaine: str, salles: list[Salle], de: str, a: str) -> list[tuple[str, int, int]]:
    """Les jours ouvres de la plage dont des evenements ressemblent a des examens : (jour, examens, total)."""
    debut, fin = dt.date.fromisoformat(de), dt.date.fromisoformat(a)
    ids = [salle.id for salle in salles]
    trouves = []
    jour = debut
    while jour <= fin:
        if jour.weekday() < 5:
            liste = evenements(domaine, ids, jour.isoformat())
            n = sum(1 for e in liste if MOTIF_EXAMEN.search(e.description))
            if n:
                trouves.append((jour.isoformat(), n, len(liste)))
            time.sleep(PAUSE_S)
        jour += dt.timedelta(days=1)
    return sorted(trouves, key=lambda t: -t[1])


def imprimer(bilan: Bilan) -> None:
    print(f"\n{bilan.jour} : {bilan.total} evenement(s) dans le run groupe")
    print(f"  identifiants identiques : {bilan.ids_identiques}"
          + ("" if bilan.ids_identiques else f" (manquants {bilan.manquants_dans_le_groupe}, en trop {bilan.en_trop_dans_le_groupe})"))
    print(f"  zero ou une salle nommee : {bilan.zero_ou_une_salle}/{bilan.total} ({bilan.part_zero_ou_une:.1%}) ; multi-salles : {bilan.multi_salles}")
    print(f"  sans salle hors vacances : {len(bilan.sans_salle_hors_vacances)} {bilan.sans_salle_hors_vacances[:5]}")
    print(f"  attributions justes : {bilan.attributions_justes} ; fausses : {len(bilan.attributions_fausses)} {bilan.attributions_fausses[:5]}")
    print(f"  multi-salles absents d'un run individuel : {len(bilan.multi_absents)} {bilan.multi_absents[:5]}")


def main() -> int:
    parseur = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parseur.add_argument("--batiment", default="A28")
    parseur.add_argument("--domaine", default=DOMAINE)
    parseur.add_argument("--jours", nargs="*", default=[], help="les journees a mesurer, AAAA-MM-JJ")
    parseur.add_argument("--trouver-examens", nargs=2, metavar=("DE", "A"), help="lister les jours d'examens d'une plage, puis sortir")
    parseur.add_argument("--json", action="store_true", help="ecrire les bilans en JSON sur la sortie standard")
    args = parseur.parse_args()

    salles = salles_du_batiment(args.domaine, args.batiment)
    print(f"{len(salles)} salle(s) pour {args.batiment} : {', '.join(salle.libelle for salle in salles)}")
    if not salles:
        return 2

    if args.trouver_examens:
        for jour, n, total in trouver_examens(args.domaine, salles, *args.trouver_examens):
            print(f"  {jour} : {n} evenement(s) d'examen sur {total}")
        return 0

    bilans = [mesurer(args.domaine, salles, jour) for jour in args.jours]
    for bilan in bilans:
        imprimer(bilan)
    tient, raisons = verdict(bilans)
    print("\nVERDICT :", "le critere tient, la requete groupee peut passer en 6.3" if tient else "le critere ne tient pas")
    for raison in raisons:
        print("  -", raison)
    if args.json:
        print(json.dumps([bilan.__dict__ for bilan in bilans], ensure_ascii=False, indent=1))
    return 0 if tient else 2


if __name__ == "__main__":
    sys.exit(main())
