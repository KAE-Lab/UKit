"""Les entrees d'une sonde, lues dans le catalogue publie plutot que figees dans sondes.json.

Le projet ADE change a chaque rentree, une adresse de CAS peut bouger : si les sondes portaient
leurs propres copies, chaque publication du catalogue produirait une fausse panne le lendemain.
Elles lisent donc la meme ligne que l'application, et cassent avec elle, pas a cote d'elle.
"""

from __future__ import annotations

import datetime as dt
import json
import urllib.parse
import urllib.request
from typing import Any

DELAI_S = 30


def lire_etablissement(base_url: str, cle: str, code: str) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}/rest/v1/etablissements?code=eq.{urllib.parse.quote(code)}&select=services,edt"
    requete = urllib.request.Request(url, headers={"apikey": cle, "Authorization": f"Bearer {cle}", "User-Agent": "ukit-sondes"})
    with urllib.request.urlopen(requete, timeout=DELAI_S) as reponse:
        lignes = json.loads(reponse.read())
    if not lignes:
        raise KeyError(f"etablissement inconnu du catalogue : {code}")
    return lignes[0]


def valeur(objet: Any, chemin: str) -> Any:
    """`edt.groupes.0.ressource` dans un objet JSON. Leve si le chemin ne mene nulle part."""
    courant = objet
    for segment in chemin.split("."):
        if isinstance(courant, list):
            courant = courant[int(segment)]
        elif isinstance(courant, dict):
            courant = courant[segment]
        else:
            raise KeyError(chemin)
    return courant


def resoudre_entrees(
    definition: dict[str, Any],
    etablissement: dict[str, Any] | None,
    aujourd_hui: dt.date,
) -> dict[str, str]:
    """Les entrees d'un Blueprint : litterales, calculees (`$aujourd_hui`), ou lues dans le catalogue. Pur."""
    calculees = {
        "$aujourd_hui": aujourd_hui.isoformat(),
        "$dans_7_jours": (aujourd_hui + dt.timedelta(days=7)).isoformat(),
    }
    entrees: dict[str, str] = {}
    for nom, brut in definition.get("entrees", {}).items():
        entrees[nom] = calculees.get(brut, brut) if isinstance(brut, str) else str(brut)

    catalogue = dict(definition.get("catalogue", {}))
    catalogue.pop("etablissement", None)
    if catalogue and etablissement is None:
        raise KeyError("des entrees viennent du catalogue mais aucun etablissement n'a ete lu")
    for nom, chemin in catalogue.items():
        entrees[nom] = str(valeur(etablissement, chemin))

    for nom in definition.get("encoder", []):
        if nom in entrees:
            entrees[nom] = urllib.parse.quote(entrees[nom], safe="")
    return entrees
