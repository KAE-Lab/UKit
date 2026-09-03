"""Le verdict, les empreintes, les entrees et la ligne a ecrire : ce qui decide, verifie sans moteur.

    python -m unittest discover -s sondes
"""

from __future__ import annotations

import datetime as dt
import hashlib
import unittest
from types import SimpleNamespace

from sonde.base import ligne_a_ecrire
from sonde.catalogue import resoudre_entrees, valeur
from sonde.manifeste import comparer_empreintes
from sonde.verdict import Verdict, classer_exception, classer_resultat, famille_du_message


def etape(step_id, action, status, error=None):
    return SimpleNamespace(step_id=step_id, action=action, status=status, error=error)


def resultat(status, steps=(), error=None):
    return SimpleNamespace(status=status, step_results=list(steps), error=error, duration_ms=1234.5, run_id="run-1")


class Reseau(Exception):
    pass


class NetworkError(Exception):
    pass


class RunError(Exception):
    def __init__(self, message, cause):
        super().__init__(message)
        self.cause = cause


class BlueprintValidationError(Exception):
    pass


class TestVerdict(unittest.TestCase):
    def test_un_succes_est_ok(self):
        verdict = classer_resultat(resultat("success"))
        self.assertEqual(verdict.etat, "ok")
        self.assertEqual(verdict.duree_ms, 1234)
        self.assertEqual(verdict.detail(), {"duree_ms": 1234, "run_id": "run-1"})

    def test_une_etape_nommee_donne_son_code(self):
        verdict = classer_resultat(resultat("failed", [etape("nav", "navigate", "success"), etape("porte", "wait_for", "failed", "CAS_INDISPONIBLE: wait_for timed out for selector '#username'")]))
        self.assertEqual((verdict.etat, verdict.etape, verdict.action, verdict.code, verdict.famille), ("panne", "porte", "wait_for", "CAS_INDISPONIBLE", "blocked"))
        self.assertFalse(verdict.erreur_de_sonde)

    def test_une_etape_de_flux_ne_masque_pas_la_vraie(self):
        verdict = classer_resultat(resultat("failed", [etape("boucle", "for_each", "failed", "nested"), etape("http", "http.request", "failed", "Expected HTTP 200, got 503 — https://x")]))
        self.assertEqual((verdict.etape, verdict.famille), ("http", "rejected"))

    def test_les_familles_se_lisent_dans_le_texte(self):
        self.assertEqual(famille_du_message("Expected HTTP 1, got 0 — <assert>\nla reponse ne porte pas de tableau"), "data")
        self.assertEqual(famille_du_message("Transport error: [Errno -2] Name or service not known"), "unavailable")
        self.assertEqual(famille_du_message("navigate: the source is unreachable (http://127.0.0.1:4/) — net::ERR_CONNECTION_REFUSED"), "unavailable")
        self.assertEqual(famille_du_message("wait_for: the page never matched what the Blueprint expects"), "data")

    def test_une_exception_reseau_est_une_panne_de_source(self):
        verdict = classer_exception(RunError("Unexpected error", cause=Reseau("net::ERR_NAME_NOT_RESOLVED")), 10)
        self.assertEqual((verdict.etat, verdict.erreur_de_sonde, verdict.famille), ("panne", False, "unavailable"))
        verdict = classer_exception(NetworkError("Transport error: refused"), 10)
        self.assertEqual((verdict.etat, verdict.erreur_de_sonde), ("panne", False))

    def test_une_exception_du_runner_est_une_erreur_de_sonde(self):
        verdict = classer_exception(BlueprintValidationError("Missing required input 'cas'"), 10)
        self.assertTrue(verdict.erreur_de_sonde)
        verdict = classer_exception(RunError("Unexpected error", cause=KeyError("boum")), 10)
        self.assertTrue(verdict.erreur_de_sonde)
        self.assertEqual(verdict.famille, "engine")


class TestManifeste(unittest.TestCase):
    def test_les_empreintes_se_comparent_sur_les_octets_servis(self):
        contenu = b'{"name": "x"}'
        manifeste = {"blueprints": {
            "bon": {"url": "https://x/bon.json", "sha256": hashlib.sha256(contenu).hexdigest()},
            "faux": {"url": "https://x/faux.json", "sha256": "0" * 64},
            "absent": {"url": "https://x/absent.json", "sha256": "1" * 64},
            "incomplet": {"url": "https://x/i.json"},
        }}

        def lire(url):
            if url.endswith("absent.json"):
                raise OSError("404")
            return contenu

        ecarts = comparer_empreintes(manifeste, lire)
        self.assertEqual(len(ecarts), 3)
        self.assertTrue(any(e.startswith("faux") for e in ecarts))
        self.assertTrue(any(e.startswith("absent") for e in ecarts))
        self.assertTrue(any(e.startswith("incomplet") for e in ecarts))

    def test_une_adresse_relative_se_resout_contre_le_manifeste(self):
        vues = []

        def lire(url):
            vues.append(url)
            return b"x"

        comparer_empreintes({"blueprints": {"a": {"url": "a.blueprint.json", "sha256": hashlib.sha256(b"x").hexdigest()}}}, lire, base="https://p.supabase.co/storage/v1/object/public/blueprints/manifest.json")
        self.assertEqual(vues, ["https://p.supabase.co/storage/v1/object/public/blueprints/a.blueprint.json"])


class TestEntrees(unittest.TestCase):
    ETABLISSEMENT = {"services": {"cas": "https://cas.exemple.fr", "ent": "https://ent.exemple.fr/"}, "edt": {"params": {"projet": "1"}, "groupes": [{"nom": "A", "ressource": "2"}]}}

    def test_les_entrees_viennent_du_catalogue_et_du_calendrier(self):
        definition = {"entrees": {"debut": "$aujourd_hui", "fin": "$dans_7_jours"}, "catalogue": {"etablissement": "x", "projet": "edt.params.projet", "ressources": "edt.groupes.0.ressource"}}
        entrees = resoudre_entrees(definition, self.ETABLISSEMENT, dt.date(2026, 9, 3))
        self.assertEqual(entrees, {"debut": "2026-09-03", "fin": "2026-09-10", "projet": "1", "ressources": "2"})

    def test_un_service_s_encode_pour_la_chaine_de_requete(self):
        definition = {"catalogue": {"etablissement": "x", "cas": "services.cas", "service": "services.ent"}, "encoder": ["service"]}
        entrees = resoudre_entrees(definition, self.ETABLISSEMENT, dt.date(2026, 9, 3))
        self.assertEqual(entrees["service"], "https%3A%2F%2Fent.exemple.fr%2F")
        self.assertEqual(entrees["cas"], "https://cas.exemple.fr")

    def test_un_chemin_introuvable_leve(self):
        with self.assertRaises((KeyError, IndexError)):
            valeur(self.ETABLISSEMENT, "edt.groupes.9.ressource")


class TestLigne(unittest.TestCase):
    def test_change_le_ne_bouge_que_si_l_etat_change(self):
        maintenant = dt.datetime(2026, 9, 3, 5, 0, tzinfo=dt.timezone.utc)
        precedente = {"etat": "ok", "change_le": "2026-08-01T05:00:00+00:00"}
        meme = ligne_a_ecrire("celcat", Verdict("ok"), precedente, maintenant)
        self.assertEqual(meme["change_le"], "2026-08-01T05:00:00+00:00")
        self.assertEqual(meme["mesure_le"], maintenant.isoformat())
        change = ligne_a_ecrire("celcat", Verdict("panne", message="x"), precedente, maintenant)
        self.assertEqual(change["change_le"], maintenant.isoformat())
        premiere = ligne_a_ecrire("celcat", Verdict("ok"), None, maintenant)
        self.assertEqual(premiere["change_le"], maintenant.isoformat())


if __name__ == "__main__":
    unittest.main()
