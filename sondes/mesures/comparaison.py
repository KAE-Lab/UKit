"""La comparaison d'un run d'occupation groupe avec les runs par salle : pure, testee.

La question du jalon 7-C : la reponse de Celcat ne porte pas l'identifiant de la ressource
interrogee, mais la description d'un evenement nomme sa salle. Si le nom suffit a reattribuer chaque
evenement, la requete groupee remplacera les dix-huit requetes par salle en 6.3.

Le critere, sur trois journees : les memes identifiants d'evenement des deux cotes ; au moins 99 %
des evenements attribuables a zero ou une salle ; aucun evenement sans salle hors vacances ; une
attribution par le nom juste a 100 % ; les cours multi-salles presents dans chacun des runs
individuels concernes.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Salle:
    id: str
    libelle: str


@dataclass(frozen=True)
class Evenement:
    id: str
    description: str
    vacances: bool


@dataclass
class Bilan:
    jour: str
    total: int = 0
    ids_identiques: bool = True
    manquants_dans_le_groupe: list[str] = field(default_factory=list)
    en_trop_dans_le_groupe: list[str] = field(default_factory=list)
    zero_ou_une_salle: int = 0
    sans_salle_hors_vacances: list[str] = field(default_factory=list)
    multi_salles: int = 0
    attributions_justes: int = 0
    attributions_fausses: list[str] = field(default_factory=list)
    multi_absents: list[str] = field(default_factory=list)

    @property
    def part_zero_ou_une(self) -> float:
        return 1.0 if self.total == 0 else self.zero_ou_une_salle / self.total

    @property
    def tient(self) -> bool:
        return (
            self.ids_identiques
            and self.part_zero_ou_une >= 0.99
            and not self.sans_salle_hors_vacances
            and not self.attributions_fausses
            and not self.multi_absents
        )


def formes_du_libelle(libelle: str) -> tuple[str, ...]:
    """Les formes sous lesquelles une description peut nommer une salle : le libelle entier, puis sans sa parenthese."""
    entier = " ".join(libelle.split()).lower()
    sans_parenthese = re.sub(r"\s*\([^)]*\)\s*$", "", entier).strip()
    formes = [entier]
    if sans_parenthese and sans_parenthese != entier:
        formes.append(sans_parenthese)
    return tuple(formes)


def salles_nommees(description: str, salles: list[Salle]) -> list[Salle]:
    """Les salles dont une forme du libelle apparait dans la description.

    Celcat ecrit la description en HTML : entites (`B&#226;t.`), retours a la ligne et `<br />`. Elle
    est decodee et ramenee a des espaces simples avant la comparaison, comme le libelle.
    """
    texte = " ".join(html.unescape(description).split()).lower()
    trouvees = []
    for salle in salles:
        if any(forme and forme in texte for forme in formes_du_libelle(salle.libelle)):
            trouvees.append(salle)
    return trouvees


def comparer(jour: str, groupe: list[Evenement], individuels: dict[str, list[Evenement]], salles: list[Salle]) -> Bilan:
    bilan = Bilan(jour=jour, total=len(groupe))
    ids_groupe = {evenement.id for evenement in groupe}
    ids_individuels = {evenement.id for liste in individuels.values() for evenement in liste}
    bilan.manquants_dans_le_groupe = sorted(ids_individuels - ids_groupe)
    bilan.en_trop_dans_le_groupe = sorted(ids_groupe - ids_individuels)
    bilan.ids_identiques = not bilan.manquants_dans_le_groupe and not bilan.en_trop_dans_le_groupe

    salles_par_evenement: dict[str, set[str]] = {}
    for salle_id, liste in individuels.items():
        for evenement in liste:
            salles_par_evenement.setdefault(evenement.id, set()).add(salle_id)

    for evenement in groupe:
        nommees = salles_nommees(evenement.description, salles)
        if len(nommees) <= 1:
            bilan.zero_ou_une_salle += 1
        else:
            bilan.multi_salles += 1
        if not nommees:
            if not evenement.vacances:
                bilan.sans_salle_hors_vacances.append(evenement.id)
            continue
        attendues = salles_par_evenement.get(evenement.id, set())
        for salle in nommees:
            if salle.id in attendues:
                bilan.attributions_justes += 1
            elif len(nommees) == 1:
                bilan.attributions_fausses.append(evenement.id)
            else:
                bilan.multi_absents.append(f"{evenement.id}@{salle.id}")
    return bilan


def verdict(bilans: list[Bilan]) -> tuple[bool, list[str]]:
    raisons = []
    for bilan in bilans:
        if not bilan.ids_identiques:
            raisons.append(f"{bilan.jour} : identifiants differents ({len(bilan.manquants_dans_le_groupe)} manquants, {len(bilan.en_trop_dans_le_groupe)} en trop)")
        if bilan.part_zero_ou_une < 0.99:
            raisons.append(f"{bilan.jour} : {bilan.part_zero_ou_une:.1%} d'evenements a zero ou une salle")
        if bilan.sans_salle_hors_vacances:
            raisons.append(f"{bilan.jour} : {len(bilan.sans_salle_hors_vacances)} evenement(s) sans salle hors vacances")
        if bilan.attributions_fausses:
            raisons.append(f"{bilan.jour} : {len(bilan.attributions_fausses)} attribution(s) fausse(s)")
        if bilan.multi_absents:
            raisons.append(f"{bilan.jour} : {len(bilan.multi_absents)} cours multi-salles absent(s) d'un run individuel")
    return (not raisons, raisons)
