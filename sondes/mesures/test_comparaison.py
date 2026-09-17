"""Les tests de la comparaison, sans moteur : python -m unittest discover -s sondes"""

import unittest

from mesures.comparaison import Evenement, Salle, comparer, formes_du_libelle, salles_nommees, verdict

A101 = Salle("1", "A28 - Salle 101 (CREMI)")
A102 = Salle("2", "A28 - Salle 102")


class FormesDuLibelle(unittest.TestCase):
    def test_entier_puis_sans_parenthese(self):
        self.assertEqual(formes_du_libelle("A28 - Salle 101 (CREMI)"), ("a28 - salle 101 (cremi)", "a28 - salle 101"))
        self.assertEqual(formes_du_libelle("A28 - Salle 102"), ("a28 - salle 102",))


class SallesNommees(unittest.TestCase):
    def test_reconnait_les_deux_formes_et_ignore_le_reste(self):
        self.assertEqual(salles_nommees("Cours\n\nA28 - Salle 101", [A101, A102]), [A101])
        self.assertEqual(salles_nommees("TP a28 - salle 101 (CREMI) et A28 - Salle 102", [A101, A102]), [A101, A102])
        self.assertEqual(salles_nommees("Amphi A", [A101, A102]), [])

    def test_decode_les_entites_html_et_les_sauts_de_ligne_de_celcat(self):
        bat = Salle("5", "CREMI - Bât. A28 Salle 005 (CREMI - Bât. A28 Salle 005)")
        description = "TD Machine\r\n\r\n<br />\r\n\r\nINF1CIB1\r\n\r\n<br />\r\n\r\nCREMI - B&#226;t. A28 Salle 005\r\n"
        self.assertEqual(salles_nommees(description, [bat, A101]), [bat])


class Comparer(unittest.TestCase):
    def test_un_jour_qui_tient(self):
        e1 = Evenement("e1", "Cours A28 - Salle 101", False)
        e2 = Evenement("e2", "TP A28 - Salle 101 / A28 - Salle 102", False)
        bilan = comparer("2026-09-22", [e1, e2], {"1": [e1, e2], "2": [e2]}, [A101, A102])
        self.assertTrue(bilan.ids_identiques)
        self.assertEqual(bilan.multi_salles, 1)
        self.assertEqual(bilan.attributions_justes, 3)
        self.assertEqual(bilan.part_zero_ou_une, 0.5)
        self.assertFalse(bilan.tient)  # 50 % de multi-salles : la part de 99 % ne tient pas
        ok, raisons = verdict([bilan])
        self.assertFalse(ok)
        self.assertEqual(len(raisons), 1)

    def test_les_defauts_sont_nommes(self):
        e1 = Evenement("e1", "Cours A28 - Salle 102", False)
        e3 = Evenement("e3", "Reunion", False)
        vac = Evenement("v", "Vacances", True)
        bilan = comparer("j", [e1, e3, vac], {"1": [e1], "2": [Evenement("e9", "x", False)]}, [A101, A102])
        self.assertFalse(bilan.ids_identiques)
        self.assertEqual(bilan.manquants_dans_le_groupe, ["e9"])
        self.assertEqual(bilan.en_trop_dans_le_groupe, ["e3", "v"])
        self.assertEqual(bilan.attributions_fausses, ["e1"])
        self.assertEqual(bilan.sans_salle_hors_vacances, ["e3"])
        self.assertFalse(bilan.tient)


if __name__ == "__main__":
    unittest.main()
