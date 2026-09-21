"""La sonde de la base de publication : le manifeste se lit, et ses empreintes correspondent.

Native — en Python, sans Blueprint — parce qu'un Blueprint ne ferait que la moitie du travail :
lire le manifeste est une requete, mais verifier que chaque fichier servi porte l'empreinte que le
manifeste annonce est du calcul, et c'est ce calcul que l'appareil fait a chaque lecture
(docs/blueprints.md). Une empreinte qui ment est exactement ce que l'appareil rejette.
"""

from __future__ import annotations

import hashlib
import json
import time
import urllib.parse
import urllib.request
from collections.abc import Callable

from .verdict import Verdict

CHEMIN = "storage/v1/object/public/blueprints/manifest.json"
FORMAT = "1"
DELAI_S = 30
# Trois lectures avant de conclure : depuis le runner, le CDN a rendu « Connection reset by peer » sur
# deux fichiers de dix-huit, deux matins de suite, et la source repondait (issue #25, 2026-09-18).
TENTATIVES = 3
PAUSE_S = 1.5
MARQUE_ILLISIBLE = "illisible"


def _lire(url: str) -> bytes:
    # `?t=` et `no-cache` : le bucket est servi par un CDN, et lire un manifeste perime ici ferait
    # croire a une base saine — meme regle que tools/blueprints/base.mjs.
    separateur = "&" if "?" in url else "?"
    derniere: Exception | None = None
    for tentative in range(TENTATIVES):
        requete = urllib.request.Request(
            f"{url}{separateur}t={int(time.time() * 1000)}",
            headers={"Cache-Control": "no-cache, no-store", "Pragma": "no-cache", "User-Agent": "ukit-sondes"},
        )
        try:
            with urllib.request.urlopen(requete, timeout=DELAI_S) as reponse:
                return reponse.read()
        except Exception as exc:  # noqa: BLE001 - un reset ou un delai : on reessaie, le verdict vient apres
            derniere = exc
            if tentative + 1 < TENTATIVES:
                time.sleep(PAUSE_S * (tentative + 1))
    assert derniere is not None
    raise derniere


def comparer_empreintes(manifeste: dict, lire: Callable[[str], bytes], base: str = "") -> list[str]:
    """Les noms dont le fichier servi ne porte pas l'empreinte annoncee, ou ne se lit pas.

    Les adresses du manifeste sont **relatives** a son propre emplacement, et c'est ainsi que
    l'appareil les resout (src/shared/aetherius/delivery.ts) : la sonde fait pareil. Pur : le lecteur
    est injecte.
    """
    ecarts: list[str] = []
    for nom, entree in manifeste.get("blueprints", {}).items():
        url = entree.get("url") if isinstance(entree, dict) else None
        attendue = entree.get("sha256") if isinstance(entree, dict) else None
        if not isinstance(url, str) or not isinstance(attendue, str):
            ecarts.append(f"{nom} (entrée incomplète)")
            continue
        try:
            reelle = hashlib.sha256(lire(urllib.parse.urljoin(base, url))).hexdigest()
        except Exception as exc:  # noqa: BLE001 - un fichier illisible est un ecart, pas un plantage
            ecarts.append(f"{nom} ({MARQUE_ILLISIBLE} : {exc})")
            continue
        if reelle != attendue:
            ecarts.append(f"{nom} (empreinte {reelle[:12]}… au lieu de {attendue[:12]}…)")
    return ecarts


def verifier(base_url: str, lire: Callable[[str], bytes] = _lire) -> Verdict:
    debut = time.monotonic()
    url = f"{base_url.rstrip('/')}/{CHEMIN}"
    try:
        manifeste = json.loads(lire(url))
    except Exception as exc:  # noqa: BLE001 - toute lecture ratee est une panne de la base, pas de la sonde
        return Verdict("panne", etape="manifeste", famille="unavailable", message=f"manifeste illisible : {exc}"[:600],
                       duree_ms=int((time.monotonic() - debut) * 1000))

    duree = lambda: int((time.monotonic() - debut) * 1000)  # noqa: E731
    if not isinstance(manifeste, dict) or str(manifeste.get("manifest")) != FORMAT:
        return Verdict("panne", etape="manifeste", famille="rejected", message="le manifeste n’a pas la forme attendue (manifest != \"1\")", duree_ms=duree())
    if not isinstance(manifeste.get("blueprints"), dict) or len(manifeste["blueprints"]) == 0:
        return Verdict("panne", etape="manifeste", famille="data", message="le manifeste ne nomme aucun Blueprint", duree_ms=duree())

    ecarts = comparer_empreintes(manifeste, lire, base=url)
    if ecarts:
        # Des fichiers qui ne se lisent pas, sans aucune empreinte fausse : c'est le transport qui a
        # lache, pas la publication — la meme famille que le manifeste injoignable.
        famille = "unavailable" if all(MARQUE_ILLISIBLE in ecart for ecart in ecarts) else "data"
        return Verdict("panne", etape="empreintes", famille=famille, message="; ".join(ecarts)[:600], duree_ms=duree())
    return Verdict("ok", duree_ms=duree())
