"""Jouer un Blueprint de sonde par la facade du moteur, et en rendre un verdict.

Le pre-vol refuse `options.debug: true` : hors debug le run est headless, avec debug il lance un
Chromium visible et attend — dans un runner sans ecran, c'est une sonde qui pend trente secondes puis
meurt sans rien mesurer. Le JSON se lit directement : pas besoin du moteur pour ca.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

from .verdict import Verdict, classer_exception, classer_resultat, erreur_de_sonde


def verifier_prealables(chemin: Path) -> Verdict | None:
    try:
        document = json.loads(chemin.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return erreur_de_sonde(f"{chemin} illisible : {exc}")
    if document.get("options", {}).get("debug") is True:
        return erreur_de_sonde(f"{chemin} porte options.debug: true — un runner sans ecran ne peut pas le jouer")
    return None


def jouer(chemin: Path, entrees: dict[str, str]) -> Verdict:
    refus = verifier_prealables(chemin)
    if refus is not None:
        return refus

    from aetherius import Aetherius  # noqa: PLC0415 - importe ici pour que le pre-vol tourne sans le moteur

    debut = time.monotonic()
    try:
        resultat = Aetherius().run(str(chemin), inputs=entrees)
    except Exception as exc:  # noqa: BLE001 - c'est le verdict qui decide de la nature de l'exception
        return classer_exception(exc, int((time.monotonic() - debut) * 1000))
    return classer_resultat(resultat)
