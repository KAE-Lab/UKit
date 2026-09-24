"""Reconstruit le logo UKit en geometrie exacte a partir des cotes mesurees sur le PNG.

Les mesures reperent le centre des pixels (convention de skimage) ; le rendu SVG
repere leurs bords, d'ou la translation d'un demi-pixel posee sur le trace.

Le logo n'existait qu'en PNG (850 x 343, assets/icons/logo.png) : ce module en est la version
vectorielle, et `python reconstruire.py` reecrit docs/identite/logo-ukit.svg et sa variante d'une
seule couleur. Chaque cote vient d'un ajustement sur le contour sous-pixel (droites, cercles, Bezier de
la queue du t) ; les rayons des conges, d'une mesure de la distance du sommet au contour,
arrondis quand plusieurs coins du meme dessin donnent la meme valeur a 0,5 px pres.
"""
from pathlib import Path

import numpy as np

from geometrie import conge, droite, f, horizontale, intersection, polygone_arrondi, verticale


class Chemin:
    def __init__(self):
        self.morceaux = []

    def m(self, p):
        self.morceaux.append('M' + f(p))

    def l(self, p):
        self.morceaux.append('L' + f(p))

    def arc(self, r, balayage, p, grand=0):
        self.morceaux.append(f'A{r:.3f} {r:.3f} 0 {grand} {balayage} {f(p)}')

    def bezier(self, c1, c2, p):
        self.morceaux.append(f'C{f(c1)} {f(c2)} {f(p)}')

    def conge(self, precedent, sommet, suivant, r):
        t1, t2, b = conge(precedent, sommet, suivant, r)
        self.l(t1)
        self.arc(r, b, t2)

    def ferme(self):
        return ''.join(self.morceaux) + 'Z'


def point_bezier(c, t):
    return (1 - t) ** 3 * c[0] + 3 * (1 - t) ** 2 * t * c[1] + 3 * (1 - t) * t ** 2 * c[2] + t ** 3 * c[3]


def coupe_bezier(c, t):
    """De Casteljau : les deux moities de la courbe au parametre t."""
    a, b, cc, d = c
    ab, bc, cd = a + (b - a) * t, b + (cc - b) * t, cc + (d - cc) * t
    abc, bcd = ab + (bc - ab) * t, bc + (cd - bc) * t
    m = abc + (bcd - abc) * t
    return np.array([a, ab, abc, m]), np.array([m, bcd, cd, d])


def parametre_a_distance(c, extremite, distance):
    """Parametre ou la courbe est a la distance donnee de son extremite (0 ou 1)."""
    ts = np.linspace(0, 1, 4001)
    pts = np.array([point_bezier(c, t) for t in ts])
    ref = c[3] if extremite == 1 else c[0]
    d = np.hypot(*(pts - ref).T)
    ordre = ts[::-1] if extremite == 1 else ts
    dd = d[::-1] if extremite == 1 else d
    return ordre[np.argmax(dd >= distance)]


# ---- Cotes mesurees ---------------------------------------------------------------
HAUT, BAS = 0.18, 341.98

# U
U_EXT_G, U_INT_G, U_INT_D, U_EXT_D = 44.47, 92.36, 231.30, 278.65
U_EXT_C = ((U_EXT_G + U_EXT_D) / 2, 224.80)
U_EXT_R = (U_EXT_D - U_EXT_G) / 2
U_INT_C = ((U_INT_G + U_INT_D) / 2, 224.90)
U_INT_R = (U_INT_D - U_INT_G) / 2
U_POINTE = 0.34
U_DRAPEAU_HAUT = droite((38.46, 13.47), 160.74)
U_DRAPEAU_BAS = droite((21.47, 48.03), 19.60)

# K
K_G, K_D = 340.37, 387.80
K_BRAS_G = droite((432.44, 65.94), 120.39)
K_BRAS_D = droite((475.84, 80.83), 119.90)
K_JAMBE_G = droite((433.65, 270.85), 62.26)
K_JAMBE_D = droite((481.92, 257.09), 60.06)

# i
I_G, I_D, I_HAUT, I_BAS = 568.84, 611.40, 85.60, 342.09
I_POINT = (590.17, 25.64, 25.51)

# t
T_G, T_D, T_HAUT = 685.94, 728.58, 17.32
T_BARRE_HAUT, T_BARRE_BAS, T_BARRE_G, T_BARRE_D = 85.60, 119.60, 651.64, 805.67
T_COUPE = droite((839.60, 303.40), 57.31)

# La queue du t : deux Bezier par bord, ajustees sur le contour sous-pixel. Leurs neuf parametres sont
# ceux de queue() : le depart sur le fut, les deux poignees et le bas de la courbe, l'angle d'arrivee
# et la position de la fin le long de la coupe.
QUEUE_INTERIEURE = (239.93386568977988, 36.781376504574396, 30.957653343589616, 787.9792236015395,
                    300.7094799032821, 18.124681667417807, 14.689080362759787, -0.38227037508775635,
                    -19.70398942685433)
QUEUE_EXTERIEURE = (246.28700565370886, 56.644800043660375, 49.380901992657, 780.3588259019805,
                    341.9388149779467, 31.123539958884137, 21.941319144776255, -0.5198188581470724,
                    19.396940472954192)

# Rayons des conges (px du PNG). Majuscules : 5,6 ; minuscules : 3,3 ; creux de la barre du t : 6.
R_MAJ, R_MIN, R_BARRE, R_CREUX_T = 5.6, 3.3, 3.7, 6.0


def lettre_u():
    haut = horizontale(HAUT)
    a = intersection(U_DRAPEAU_HAUT, haut)
    b = np.array([U_INT_G, HAUT])
    c = np.array([U_INT_G, U_INT_C[1]])
    d = np.array([U_INT_D, U_INT_C[1]])
    e = np.array([U_INT_D, HAUT])
    ff = np.array([U_EXT_D, HAUT])
    g = np.array([U_EXT_D, U_EXT_C[1]])
    h = np.array([U_EXT_G, U_EXT_C[1]])
    i = intersection(U_DRAPEAU_BAS, verticale(U_EXT_G))
    j = intersection(U_DRAPEAU_BAS, verticale(U_POINTE))
    k = intersection(U_DRAPEAU_HAUT, verticale(U_POINTE))

    ch = Chemin()
    # On part du point de tangence qui suit le raccord drapeau / sommet du fut.
    _, depart, _ = conge(k, a, b, 10.0)
    ch.m(depart)
    ch.conge(a, b, c, 1.2)
    ch.l(c)
    fond_int = np.array([U_INT_C[0], U_INT_C[1] + U_INT_R])
    ch.arc(U_INT_R, 0, fond_int)
    ch.arc(U_INT_R, 0, d)
    ch.conge(d, e, ff, R_MAJ)
    ch.conge(e, ff, g, R_MAJ)
    ch.l(g)
    fond_ext = np.array([U_EXT_C[0], U_EXT_C[1] + U_EXT_R])
    ch.arc(U_EXT_R, 1, fond_ext)
    ch.arc(U_EXT_R, 1, h)
    ch.conge(h, i, j, 2.3)
    ch.conge(i, j, k, 2.3)
    ch.conge(j, k, a, 1.5)
    ch.conge(k, a, b, 10.0)
    return ch.ferme()


def lettre_k():
    haut, bas = horizontale(HAUT), horizontale(BAS)
    fd = verticale(K_D)
    sommets = [
        (K_G, HAUT, R_MAJ),
        (K_D, HAUT, R_MAJ),
        (*intersection(K_BRAS_G, fd), 4.0),
        (*intersection(K_BRAS_G, haut), 9.6),
        (*intersection(K_BRAS_D, haut), 3.8),
        (*intersection(K_BRAS_D, K_JAMBE_D), 15.2),
        (*intersection(K_JAMBE_D, bas), 2.1),
        (*intersection(K_JAMBE_G, bas), 7.8),
        (*intersection(K_JAMBE_G, fd), 3.5),
        (K_D, BAS, R_MAJ),
        (K_G, BAS, R_MAJ),
    ]
    return polygone_arrondi(sommets)


def lettre_i():
    fut = polygone_arrondi([(I_G, I_HAUT, R_MIN), (I_D, I_HAUT, R_MIN), (I_D, I_BAS, R_MIN), (I_G, I_BAS, R_MIN)])
    cx, cy, r = I_POINT
    point = (f'M{cx - r:.3f} {cy:.3f}A{r:.3f} {r:.3f} 0 1 1 {cx + r:.3f} {cy:.3f}'
             f'A{r:.3f} {r:.3f} 0 1 1 {cx - r:.3f} {cy:.3f}Z')
    return fut + point


def queue(parametres, x_fut):
    y0, a1, a2, xb, yb, a3, a4, phi, s = parametres
    p, u = T_COUPE
    fin = p + s * u
    s1 = np.array([[x_fut, y0], [x_fut, y0 + a1], [xb - a2, yb], [xb, yb]])
    s2 = np.array([[xb, yb], [xb + a3, yb], fin - a4 * np.array([np.cos(phi), np.sin(phi)]), fin])
    return s1, s2


def lettre_t():
    interieur = queue(QUEUE_INTERIEURE, T_D)
    exterieur = queue(QUEUE_EXTERIEURE, T_G)
    _, dir_coupe = T_COUPE
    r_coupe = 2.0

    t1, t2 = np.array([T_G, T_HAUT]), np.array([T_D, T_HAUT])
    t3, t4 = np.array([T_D, T_BARRE_HAUT]), np.array([T_BARRE_D, T_BARRE_HAUT])
    t5, t6 = np.array([T_BARRE_D, T_BARRE_BAS]), np.array([T_D, T_BARRE_BAS])
    t9, t10 = np.array([T_G, T_BARRE_BAS]), np.array([T_BARRE_G, T_BARRE_BAS])
    t11, t12 = np.array([T_BARRE_G, T_BARRE_HAUT]), np.array([T_G, T_BARRE_HAUT])

    ch = Chemin()
    _, depart, _ = conge(t12, t1, t2, R_MIN)
    ch.m(depart)
    ch.conge(t1, t2, t3, R_MIN)
    ch.conge(t2, t3, t4, R_CREUX_T)
    ch.conge(t3, t4, t5, R_BARRE)
    ch.conge(t4, t5, t6, R_BARRE)
    ch.conge(t5, t6, interieur[0][0], R_CREUX_T)
    ch.l(interieur[0][0])
    ch.bezier(interieur[0][1], interieur[0][2], interieur[0][3])

    # Coin interieur de la coupe : la courbe arrive, la coupe repart vers l'exterieur.
    s2 = interieur[1]
    fin_i = s2[3]
    arrivee = (s2[3] - s2[2]) / np.linalg.norm(s2[3] - s2[2])
    angle = np.arccos(np.clip(-arrivee @ dir_coupe, -1, 1))
    recul = r_coupe / np.tan(angle / 2)
    tc = parametre_a_distance(s2, 1, recul)
    garde, _ = coupe_bezier(s2, tc)
    ch.bezier(garde[1], garde[2], garde[3])
    b = 1 if arrivee[0] * dir_coupe[1] - arrivee[1] * dir_coupe[0] > 0 else 0
    ch.arc(r_coupe, b, fin_i + dir_coupe * recul)

    # Coin exterieur : la coupe arrive, la courbe exterieure repart a rebours.
    s2e = exterieur[1]
    fin_e = s2e[3]
    depart_courbe = -(s2e[3] - s2e[2]) / np.linalg.norm(s2e[3] - s2e[2])
    angle = np.arccos(np.clip(-dir_coupe @ depart_courbe, -1, 1))
    recul = r_coupe / np.tan(angle / 2)
    ch.l(fin_e - dir_coupe * recul)
    tc = parametre_a_distance(s2e, 1, recul)
    garde, _ = coupe_bezier(s2e, tc)
    b = 1 if dir_coupe[0] * depart_courbe[1] - dir_coupe[1] * depart_courbe[0] > 0 else 0
    ch.arc(r_coupe, b, garde[3])
    ch.bezier(garde[2], garde[1], garde[0])
    s1e = exterieur[0]
    ch.bezier(s1e[2], s1e[1], s1e[0])

    ch.conge(s1e[0], t9, t10, R_CREUX_T)
    ch.conge(t9, t10, t11, R_BARRE)
    ch.conge(t10, t11, t12, R_BARRE)
    ch.conge(t11, t12, t1, R_CREUX_T)
    ch.conge(t12, t1, t2, R_MIN)
    return ch.ferme()


def svg(chemin, remplissage):
    angle = np.radians(21.07)
    debut, fin = 11.0, 906.0
    x1, y1 = debut * np.cos(angle), debut * np.sin(angle)
    x2, y2 = fin * np.cos(angle), fin * np.sin(angle)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 343">
  <defs>
    <linearGradient id="ukit" gradientUnits="userSpaceOnUse" x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}">
      <stop offset="0.32" stop-color="#007AFF"/>
      <stop offset="0.78" stop-color="#5E5CE6"/>
    </linearGradient>
  </defs>
  <path fill="{remplissage}" transform="translate(0.5 0.5)" d="{chemin}"/>
</svg>
'''


if __name__ == '__main__':
    identite = Path(__file__).resolve().parents[2] / 'docs' / 'identite'
    chemin = lettre_u() + lettre_k() + lettre_i() + lettre_t()
    (identite / 'logo-ukit.svg').write_text(svg(chemin, 'url(#ukit)'))
    (identite / 'logo-ukit-plein.svg').write_text(svg(chemin, 'currentColor'))
