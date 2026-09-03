"""Le verdict d'une sonde : ce que le moteur a rendu, range en deux mots et un detail.

Mesure dans le moteur (docs/phase-6/6-1-b-pilotage-a-distance.md) : `RunEngine.run` avale toute
`AetheriusError` en `Result(status=failed, error=str)` — la classe de l'exception est perdue — et
une etape nommee (`on_timeout: "fail:CODE"`) prefixe son message par `CODE: ` en position fixe.
Le verdict se lit donc sur l'etape qui a echoue, son code et son message ; la famille n'est
qu'informative, deduite du texte.

Ce qui decide, c'est la distinction **panne de source** / **erreur de sonde** : un Blueprint invalide,
une dependance absente ou un plantage du runner n'est pas une panne — la ligne de la source reste
intacte, aucune issue ne s'ouvre, et le workflow passe au rouge. Sans cette distinction, un runner
casse ouvrirait six issues un matin.

Pur : aucun import du moteur, pour que test_verdict.py tourne avant meme l'installation.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any

CODE = re.compile(r"^([A-Z][A-Z0-9_]+): ")
FLUX = ("for_each", "if", "repeat")
# Les signatures d'une source injoignable, chez httpx (Act I) et chez Chromium (Act II).
RESEAU = (
    "net::ERR_",
    "ECONNREFUSED",
    "Connection refused",
    "getaddrinfo",
    "ENOTFOUND",
    "Name or service not known",
    "the source is unreachable",
    "Transport error",
    "Request timed out",
    "retry attempts failed",
)


@dataclass(frozen=True)
class Verdict:
    etat: str  # "ok" | "panne"
    erreur_de_sonde: bool = False
    etape: str | None = None
    action: str | None = None
    code: str | None = None
    famille: str | None = None
    message: str | None = None
    duree_ms: int | None = None
    run_id: str | None = None

    def detail(self) -> dict[str, Any]:
        """Ce qui va dans `sondes.detail` : tout sauf l'etat lui-meme, sans les vides."""
        return {
            cle: valeur
            for cle, valeur in asdict(self).items()
            if cle not in ("etat", "erreur_de_sonde") and valeur is not None
        }


def code_du_message(message: str) -> str | None:
    correspondance = CODE.match(message)
    return correspondance.group(1) if correspondance else None


def est_reseau(message: str) -> bool:
    return any(signature in message for signature in RESEAU)


def famille_du_message(message: str) -> str:
    """La famille du moteur embarque, reconstruite depuis le texte — informative, jamais decisive."""
    if "<assert>" in message:
        return "data"
    if message.startswith("Expected HTTP"):
        return "rejected"
    if est_reseau(message):
        return "unavailable"
    if code_du_message(message) is not None:
        return "blocked"
    return "data"


def _statut(objet: Any) -> str:
    valeur = getattr(objet, "status", None)
    return str(getattr(valeur, "value", valeur))


def classer_resultat(result: Any) -> Verdict:
    """Un `Result` du moteur — ou n'importe quel objet de meme forme — en verdict."""
    duree = int(getattr(result, "duration_ms", 0) or 0)
    run_id = getattr(result, "run_id", None)
    if _statut(result) == "success":
        return Verdict("ok", duree_ms=duree, run_id=run_id)

    echouee = next(
        (etape for etape in getattr(result, "step_results", []) if _statut(etape) == "failed" and etape.action not in FLUX),
        None,
    )
    message = (echouee.error if echouee is not None and echouee.error else getattr(result, "error", None)) or "sans détail"
    return Verdict(
        "panne",
        etape=getattr(echouee, "step_id", None),
        action=getattr(echouee, "action", None),
        code=code_du_message(message),
        famille=famille_du_message(message),
        message=message[:600],
        duree_ms=duree,
        run_id=run_id,
    )


def _noms(exc: BaseException) -> set[str]:
    return {classe.__name__ for classe in type(exc).__mro__}


def classer_exception(exc: BaseException, duree_ms: int) -> Verdict:
    """Une exception sortie de `Aetherius().run` : panne de source si sa cause est reseau, erreur de sonde sinon."""
    noms = _noms(exc)
    cause = getattr(exc, "cause", None)
    texte = str(cause) if cause is not None else str(exc)
    reseau = est_reseau(texte) or (cause is not None and "NetworkError" in _noms(cause)) or "NetworkError" in noms
    if reseau:
        return Verdict("panne", famille="unavailable", message=texte[:600], duree_ms=duree_ms)
    return Verdict(
        "panne",
        erreur_de_sonde=True,
        famille="engine" if "RunError" in noms else "blueprint",
        message=f"{type(exc).__name__}: {texte}"[:600],
        duree_ms=duree_ms,
    )


def erreur_de_sonde(message: str) -> Verdict:
    return Verdict("panne", erreur_de_sonde=True, famille="blueprint", message=message[:600])
