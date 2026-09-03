#!/usr/bin/env python3
"""Les sondes du matin : joue chaque source, ecrit son etat dans la base, ouvre ou ferme une issue au
changement.

    python sondes/jouer.py                 # ce que fait le workflow
    python sondes/jouer.py --dry-run       # joue tout, n'ecrit rien, n'ouvre rien
    python sondes/jouer.py --source celcat # une seule source
    python sondes/jouer.py --casser cas-bordeaux --dry-run   # fausse l'adresse d'une source : 127.0.0.1:4

Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (la table `sondes` ne s'ecrit qu'avec la cle de
service ; le catalogue se lit avec elle aussi), GITHUB_TOKEN + GITHUB_REPOSITORY (les issues),
SONDES_ASSIGNEE (le compte a prevenir — l'organisation n'est pas une personne).

Sortie 0 quand chaque sonde a rendu un verdict, panne comprise — l'issue est le signal ; 1 quand une
sonde n'a pas pu se prononcer (Blueprint invalide, moteur absent, plantage) : la ligne de cette source
reste intacte, aucune issue ne s'ouvre, et c'est le workflow qui passe au rouge.

Voir sondes/README.md et docs/pilotage.md.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sonde import base, catalogue, github, manifeste, moteur  # noqa: E402
from sonde.verdict import Verdict, erreur_de_sonde  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
ADRESSE_CASSEE = "http://127.0.0.1:4"


def charger_definitions() -> list[dict[str, Any]]:
    return json.loads((RACINE / "sondes" / "sondes.json").read_text(encoding="utf-8"))["sources"]


def jouer_une(definition: dict[str, Any], config: dict[str, str], casser: bool) -> Verdict:
    if definition.get("natif") == "manifeste":
        return manifeste.verifier(ADRESSE_CASSEE if casser else config["SUPABASE_URL"])

    try:
        code = definition.get("catalogue", {}).get("etablissement")
        etablissement = catalogue.lire_etablissement(config["SUPABASE_URL"], config["SUPABASE_SERVICE_ROLE_KEY"], code) if code else None
        entrees = catalogue.resoudre_entrees(definition, etablissement, dt.date.today())
    except Exception as exc:  # noqa: BLE001 - des entrees introuvables sont une erreur de sonde, pas une panne
        return erreur_de_sonde(f"entrées introuvables : {exc}")

    if casser:
        entrees[definition["casser"]] = ADRESSE_CASSEE
    return moteur.jouer(RACINE / definition["blueprint"], entrees)


def transitions(depot: github.Depot, definitions: list[dict[str, Any]], verdicts: dict[str, Verdict], precedents: dict[str, dict[str, Any]]) -> None:
    depot.assurer_label()
    ouvertes = depot.issues_ouvertes()
    for definition in definitions:
        source, libelle = definition["source"], definition["libelle"]
        verdict = verdicts[source]
        issue = ouvertes.get(source)
        if verdict.erreur_de_sonde:
            continue
        if verdict.etat == "panne" and issue is None:
            numero = depot.ouvrir(source, libelle, verdict)
            print(f"  issue #{numero} ouverte pour {source}")
        elif verdict.etat == "panne" and issue is not None:
            precedent = (precedents.get(source) or {}).get("detail") or {}
            if precedent.get("message") != verdict.message:
                depot.commenter(int(issue["number"]), f"Toujours en panne, autrement :\n\n{github.corps_issue(source, libelle, verdict)}")
                print(f"  issue #{issue['number']} commentee pour {source}")
        elif verdict.etat == "ok" and issue is not None:
            depot.commenter(int(issue["number"]), "La source répond de nouveau : la sonde du matin la voit en `ok`.")
            depot.fermer(int(issue["number"]))
            print(f"  issue #{issue['number']} fermee pour {source}")


def main() -> int:
    parseur = argparse.ArgumentParser(description="Les sondes du matin de UKit.")
    parseur.add_argument("--dry-run", action="store_true", help="joue tout, n'ecrit rien, n'ouvre rien")
    parseur.add_argument("--source", help="ne joue que cette source")
    parseur.add_argument("--casser", help="fausse l'adresse de cette source (127.0.0.1:4) pour verifier la chaine")
    args = parseur.parse_args()

    config = {nom: os.environ.get(nom, "") for nom in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GITHUB_TOKEN", "GITHUB_REPOSITORY", "SONDES_ASSIGNEE")}
    if not config["SUPABASE_URL"] or not config["SUPABASE_SERVICE_ROLE_KEY"]:
        print("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis", file=sys.stderr)
        return 1

    definitions = [d for d in charger_definitions() if args.source is None or d["source"] == args.source]
    if not definitions:
        print(f"aucune source nommée {args.source}", file=sys.stderr)
        return 1

    verdicts: dict[str, Verdict] = {}
    for definition in definitions:
        source = definition["source"]
        verdict = jouer_une(definition, config, casser=args.casser == source)
        verdicts[source] = verdict
        etiquette = "ERREUR DE SONDE" if verdict.erreur_de_sonde else verdict.etat.upper()
        print(f"{etiquette:16} {source:18} {verdict.duree_ms or 0:6} ms  {verdict.message or ''}"[:200])

    if args.dry_run:
        print("dry-run : rien n’est écrit, aucune issue n’est ouverte")
        return 1 if any(v.erreur_de_sonde for v in verdicts.values()) else 0

    precedents = base.lire_etats(config["SUPABASE_URL"], config["SUPABASE_SERVICE_ROLE_KEY"])
    maintenant = dt.datetime.now(dt.timezone.utc)
    for source, verdict in verdicts.items():
        if verdict.erreur_de_sonde:
            continue
        base.ecrire_etat(config["SUPABASE_URL"], config["SUPABASE_SERVICE_ROLE_KEY"], base.ligne_a_ecrire(source, verdict, precedents.get(source), maintenant))

    if config["GITHUB_TOKEN"] and config["GITHUB_REPOSITORY"]:
        transitions(github.Depot(config["GITHUB_REPOSITORY"], config["GITHUB_TOKEN"], config["SONDES_ASSIGNEE"] or None), definitions, verdicts, precedents)
    else:
        print("sans GITHUB_TOKEN : aucune issue")

    return 1 if any(v.erreur_de_sonde for v in verdicts.values()) else 0


if __name__ == "__main__":
    sys.exit(main())
