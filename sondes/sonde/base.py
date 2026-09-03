"""La table `sondes` : lire les etats d'hier, ecrire ceux d'aujourd'hui.

`change_le` ne bouge que quand l'etat change : c'est le « depuis quand » de la page Sources. Une
ligne s'ecrit par `merge-duplicates`, donc le runner est rejouable ; une erreur de sonde n'ecrit
rien — la ligne dit alors la derniere mesure honnete, pas un plantage.
"""

from __future__ import annotations

import datetime as dt
import json
import urllib.request
from typing import Any

from .verdict import Verdict

DELAI_S = 30


def _requete(base_url: str, cle: str, chemin: str, methode: str = "GET", corps: Any = None, prefer: str | None = None) -> Any:
    entetes = {"apikey": cle, "Authorization": f"Bearer {cle}", "Content-Type": "application/json", "User-Agent": "ukit-sondes"}
    if prefer is not None:
        entetes["Prefer"] = prefer
    requete = urllib.request.Request(
        f"{base_url.rstrip('/')}/rest/v1/{chemin}",
        method=methode,
        headers=entetes,
        data=None if corps is None else json.dumps(corps).encode("utf-8"),
    )
    with urllib.request.urlopen(requete, timeout=DELAI_S) as reponse:
        texte = reponse.read().decode("utf-8")
    return json.loads(texte) if texte else None


def lire_etats(base_url: str, cle: str) -> dict[str, dict[str, Any]]:
    lignes = _requete(base_url, cle, "sondes?select=source,etat,detail,mesure_le,change_le") or []
    return {ligne["source"]: ligne for ligne in lignes}


def ligne_a_ecrire(source: str, verdict: Verdict, precedente: dict[str, Any] | None, maintenant: dt.datetime) -> dict[str, Any]:
    """La ligne telle qu'elle part : `change_le` conserve si l'etat n'a pas change. Pur."""
    instant = maintenant.isoformat()
    inchange = precedente is not None and precedente.get("etat") == verdict.etat
    return {
        "source": source,
        "etat": verdict.etat,
        "detail": verdict.detail(),
        "mesure_le": instant,
        "change_le": precedente["change_le"] if inchange and precedente is not None else instant,
    }


def ecrire_etat(base_url: str, cle: str, ligne: dict[str, Any]) -> None:
    _requete(base_url, cle, "sondes", "POST", ligne, prefer="resolution=merge-duplicates,return=minimal")
