"""Les figures des slides : le logo en verre, et l'echo qui construit Fig. 01 (le U) et Fig. 02 (le ?).

L'echo repete un contour 40 fois en profondeur, chaque copie un peu plus loin, un peu plus pale,
et teintee le long du degrade du logo. Les deux figures partagent les memes reglages pour se
repondre a l'identique d'une slide a l'autre.
"""
from pathlib import Path

import numpy as np
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.removeOverlaps import removeOverlaps
from fontTools.varLib.instancer import instantiateVariableFont

import reconstruire as rc

ICI = Path(__file__).resolve().parent
DEGRADE = ('#007AFF', '#5E5CE6')
COPIES, PAS = 40, (5.0, 3.2)
# La hauteur du U dans le dessin du logo : le point d'interrogation est mis a la meme.
HAUTEUR_U = 343.0
# La boite du U : son contour tient dans 279 x 343 unites, 3 de plus laissent passer le trait.
BOITE_U = (282.0, 346.0)

FICHIER_LOGO, FICHIER_U, FICHIER_Q = 'ukit-logo-verre.svg', 'fig01-u.svg', 'fig02-question.svg'
FICHIER_POLICE_TITRE = 'polices/Geist-600-titre.ttf'


def geist(graisse):
    """Geist a une graisse fixe, contours fusionnes.

    La police variable dessine certaines lettres en contours superposes (la barre du t sur son fut) :
    invisible au remplissage, mais un trait d'arete les ferait tous apparaitre.
    """
    police = instantiateVariableFont(TTFont(ICI / 'polices' / 'Geist[wght].ttf'), {'wght': graisse})
    removeOverlaps(police)
    return police


def logo_verre():
    """Le logo remplit a 42 % de son degrade, avec son arete nette : il reste plein, sans eblouir."""
    chemin = rc.lettre_u() + rc.lettre_k() + rc.lettre_i() + rc.lettre_t()
    trait = 'stroke="url(#ukit)" stroke-width="1.6" vector-effect="non-scaling-stroke"'
    return rc.svg(chemin, 'url(#ukit)').replace(
        '<path fill="url(#ukit)"', f'<path fill="url(#ukit)" fill-opacity="0.42" {trait}')


def melange(t):
    a = np.array([int(DEGRADE[0][i:i + 2], 16) for i in (1, 3, 5)], float)
    b = np.array([int(DEGRADE[1][i:i + 2], 16) for i in (1, 3, 5)], float)
    return '#%02X%02X%02X' % tuple(np.round(a + (b - a) * t).astype(int))


def vue(boite):
    """La taille du dessin d'un echo : sa boite, plus la profondeur des copies et la marge du trait."""
    dx, dy = PAS
    return boite[0] + dx * (COPIES - 1) + 3, boite[1] + dy * (COPIES - 1) + 3


def echo(chemin, boite, trait=1.2, fondu=(1.0, 0.1)):
    """Le contour repete en profondeur : la face avant nette, le fond qui s'efface.

    Les copies se dessinent du fond vers l'avant, pour que la face avant passe par-dessus.
    """
    dx, dy = PAS
    traits = []
    for k in reversed(range(COPIES)):
        t = k / (COPIES - 1)
        opacite = fondu[0] + (fondu[1] - fondu[0]) * t
        traits.append(f'<path d="{chemin}" transform="translate({dx * k + 1.5:.2f} {dy * k + 1.5:.2f})" '
                      f'fill="none" stroke="{melange(t)}" stroke-opacity="{opacite:.3f}" stroke-width="{trait}" '
                      f'vector-effect="non-scaling-stroke"/>')
    largeur, hauteur = vue(boite)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largeur:.1f} {hauteur:.1f}">'
            + ''.join(traits) + '</svg>')


def glyphe(caractere, graisse=600):
    """Le contour d'un glyphe de Geist, y descendant, haut a 0 et mis a la hauteur du U."""
    police = geist(graisse)
    jeu = police.getGlyphSet()
    nom = police.getBestCmap()[ord(caractere)]
    bornes = BoundsPen(jeu)
    jeu[nom].draw(bornes)
    x0, y0, x1, y1 = bornes.bounds
    k = HAUTEUR_U / (y1 - y0)
    stylo = SVGPathPen(jeu)
    jeu[nom].draw(TransformPen(stylo, (k, 0, 0, -k, -x0 * k, y1 * k)))
    return stylo.getCommands(), (x1 - x0) * k


CHEMIN_Q, LARGEUR_Q = glyphe('?')
BOITE_Q = (LARGEUR_Q, HAUTEUR_U)


def ecrire():
    """Ecrit les dessins et la police du titre que les slides chargent, a cote d'elles."""
    geist(600).save(ICI / FICHIER_POLICE_TITRE)
    (ICI / FICHIER_LOGO).write_text(logo_verre())
    (ICI / FICHIER_U).write_text(echo(rc.lettre_u(), BOITE_U))
    (ICI / FICHIER_Q).write_text(echo(CHEMIN_Q, BOITE_Q))
