"""Les issues GitHub : une par source en panne, ouverte au changement d'etat, fermee au retour.

C'est la notification : l'application GitHub sur le telephone previent d'une issue assignee, sans
autre service. Le label `sonde` est cree s'il manque — l'API ignore en silence un label inexistant
a la creation d'une issue. Le marqueur `<!-- sonde:<source> -->` dans le corps est ce qui relie une
issue a sa source d'un run a l'autre.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any

from .verdict import Verdict

LABEL = "sonde"
MARQUEUR = re.compile(r"<!-- sonde:([a-z0-9-]+) -->")
DELAI_S = 30


class Depot:
    def __init__(self, nom: str, jeton: str, assignee: str | None = None) -> None:
        self.nom = nom
        self.jeton = jeton
        self.assignee = assignee

    def _api(self, chemin: str, methode: str = "GET", corps: Any = None) -> Any:
        requete = urllib.request.Request(
            f"https://api.github.com/repos/{self.nom}/{chemin}",
            method=methode,
            headers={
                "Authorization": f"Bearer {self.jeton}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
                "User-Agent": "ukit-sondes",
            },
            data=None if corps is None else json.dumps(corps).encode("utf-8"),
        )
        try:
            with urllib.request.urlopen(requete, timeout=DELAI_S) as reponse:
                texte = reponse.read().decode("utf-8")
        except urllib.error.HTTPError as erreur:
            if erreur.code == 422 and methode == "POST" and chemin == "labels":
                return None  # le label existe deja
            raise
        return json.loads(texte) if texte else None

    def assurer_label(self) -> None:
        self._api("labels", "POST", {"name": LABEL, "color": "d73a4a", "description": "Une source tierce vue en panne par les sondes du matin"})

    def issues_ouvertes(self) -> dict[str, dict[str, Any]]:
        issues = self._api(f"issues?labels={LABEL}&state=open&per_page=100") or []
        par_source: dict[str, dict[str, Any]] = {}
        for issue in issues:
            correspondance = MARQUEUR.search(issue.get("body") or "")
            if correspondance:
                par_source[correspondance.group(1)] = issue
        return par_source

    def ouvrir(self, source: str, libelle: str, verdict: Verdict) -> int:
        corps = {
            "title": f"[sonde] {libelle} en panne",
            "body": corps_issue(source, libelle, verdict),
            "labels": [LABEL],
        }
        if self.assignee:
            corps["assignees"] = [self.assignee]
        return int(self._api("issues", "POST", corps)["number"])

    def commenter(self, numero: int, texte: str) -> None:
        self._api(f"issues/{numero}/comments", "POST", {"body": texte})

    def fermer(self, numero: int) -> None:
        self._api(f"issues/{numero}", "PATCH", {"state": "closed", "state_reason": "completed"})


def corps_issue(source: str, libelle: str, verdict: Verdict) -> str:
    detail = "\n".join(f"- **{cle}** : `{valeur}`" for cle, valeur in verdict.detail().items())
    return (
        f"La sonde du matin voit **{libelle}** en panne.\n\n{detail}\n\n"
        "Les sondes tournent depuis un runner GitHub (adresse américaine) ; une source qui filtre par pays "
        "peut passer en panne ici sans l’être en France. Cette issue se ferme d’elle-même au retour de la source.\n\n"
        f"<!-- sonde:{source} -->"
    )
