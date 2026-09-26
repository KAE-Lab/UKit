"""Outils de geometrie plane pour reconstruire le logo : droites, intersections, conges."""
import numpy as np


def droite(point, angle_deg):
    a = np.radians(angle_deg)
    return np.array(point, float), np.array([np.cos(a), np.sin(a)])


def verticale(x):
    return droite((x, 0.0), 90)


def horizontale(y):
    return droite((0.0, y), 0)


def intersection(d1, d2):
    (p, u), (q, v) = d1, d2
    m = np.column_stack([u, -v])
    t, _ = np.linalg.solve(m, q - p)
    return p + t * u


def conge(precedent, sommet, suivant, rayon):
    """Points de tangence et sens de l'arc qui arrondit l'angle au sommet.

    Le sens se lit dans un repere a y descendant : un virage a droite a l'ecran
    donne un arc horaire, donc le drapeau de balayage SVG a 1.
    """
    precedent, sommet, suivant = (np.asarray(v, float) for v in (precedent, sommet, suivant))
    u = precedent - sommet
    v = suivant - sommet
    u /= np.linalg.norm(u)
    v /= np.linalg.norm(v)
    angle = np.arccos(np.clip(u @ v, -1, 1))
    recul = rayon / np.tan(angle / 2)
    entree, sortie = -u, v
    balayage = 1 if entree[0] * sortie[1] - entree[1] * sortie[0] > 0 else 0
    return sommet + u * recul, sommet + v * recul, balayage


def f(p):
    return f'{p[0]:.3f} {p[1]:.3f}'


def polygone_arrondi(sommets):
    """Chemin ferme d'un polygone dont chaque sommet (x, y, rayon) porte son conge."""
    n = len(sommets)
    morceaux = []
    for k in range(n):
        p0 = sommets[k - 1][:2]
        p1, r = sommets[k][:2], sommets[k][2]
        p2 = sommets[(k + 1) % n][:2]
        if r <= 0:
            morceaux.append(('L', p1))
            continue
        t1, t2, b = conge(p0, p1, p2, r)
        morceaux.append(('L', t1))
        morceaux.append(('A', (r, b, t2)))
    chemin = []
    for i, (cmd, val) in enumerate(morceaux):
        if cmd == 'L':
            chemin.append(('M' if i == 0 else 'L') + f(val))
        else:
            r, b, t2 = val
            chemin.append(f'A{r:.3f} {r:.3f} 0 0 {b} {f(t2)}')
    return ''.join(chemin) + 'Z'
