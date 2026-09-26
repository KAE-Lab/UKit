"""Les traces de conception : les traits, cotes et etiquettes laisses visibles sur les slides.

Un seul code des traits : le pointille pour la geometrie (construction, guides), le trait
plein pour les relations et les cotes, le cercle pour un noeud, la croix pour un repere.
"""
import math
from contextlib import contextmanager
from pathlib import Path

import charte as ch

ICI = Path(__file__).resolve().parent
TRAIT = 'rgba(244,244,247,.42)'
NOEUD = 'rgba(244,244,247,.85)'
# Les traces purement decoratives passent en retrait, pour ne jamais peser autant que le contenu.
DECOR = 0.65


class Calque:
    """Un calque SVG plein cadre pour les traits, et des elements HTML pour les etiquettes.

    Ce qui se dessine dans un bloc `with calque.decor():` part sur le plan decoratif, rendu en
    retrait ; le reste, qui porte une information, reste a pleine intensite.
    """

    def __init__(self):
        self.svg = []
        self.html = []
        self.svg_decor = []
        self.html_decor = []
        self._decor = False

    @contextmanager
    def decor(self):
        self._decor = True
        try:
            yield self
        finally:
            self._decor = False

    def _traits(self):
        return self.svg_decor if self._decor else self.svg

    def _etiquettes(self):
        return self.html_decor if self._decor else self.html

    def fil(self, *points, pointille=False, opacite=None):
        trace = ' '.join(f'{x:.1f},{y:.1f}' for x, y in points)
        style = ' stroke-dasharray="3 5"' if pointille else ''
        couleur = f' stroke="rgba(244,244,247,{opacite})"' if opacite else ''
        self._traits().append(f'<polyline points="{trace}"{style}{couleur}/>')

    def noeud(self, x, y, r=4.5):
        self._traits().append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{ch.PAPIER}" stroke="{NOEUD}"/>')

    def point(self, x, y, r=2.6):
        self._traits().append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{ch.ENCRE}" stroke="none"/>')

    def arc(self, cx, cy, r, a0, a1, opacite=None):
        x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
        x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
        grand = 1 if abs(a1 - a0) > math.pi else 0
        couleur = f' stroke="rgba(244,244,247,{opacite})"' if opacite else ''
        self._traits().append(f'<path d="M{x0:.1f} {y0:.1f} A{r} {r} 0 {grand} 1 {x1:.1f} {y1:.1f}"{couleur}/>')

    def croix(self, x, y, demi=9):
        self.fil((x - demi, y), (x + demi, y))
        self.fil((x, y - demi), (x, y + demi))

    def texte(self, x, y, contenu, classe='m', droite=False):
        ancre = f'right:{ch.LARGEUR - x:.0f}px' if droite else f'left:{x:.0f}px'
        self._etiquettes().append(f'<div class="a {classe}" style="{ancre};top:{y:.0f}px">{contenu}</div>')

    def centre(self, x, y, contenu, classe='m'):
        self._etiquettes().append(f'<div class="a {classe}" style="left:{x:.0f}px;top:{y:.0f}px;'
                                  f'transform:translateX(-50%)">{contenu}</div>')

    def trace(self, element):
        """Un element SVG deja ecrit, sur le plan courant."""
        self._traits().append(element)

    def rendu(self):
        return (f'<svg class="a" style="left:0;top:0" width="{ch.LARGEUR}" height="{ch.HAUTEUR}"><g fill="none" '
                f'stroke="{TRAIT}" stroke-width="1"><g opacity="{DECOR}">{"".join(self.svg_decor)}</g>'
                f'{"".join(self.svg)}</g></svg>'
                f'<div style="opacity:{DECOR}">{"".join(self.html_decor)}</div>' + ''.join(self.html))


def icone(nom, taille=20, trait=1.6):
    """Une icone Lucide au trait, recoloree a l'encre de la charte."""
    source = (ICI / 'icones' / f'{nom}.svg').read_text()
    debut = source.index('>', source.index('<svg')) + 1
    return (f'<svg width="{taille}" height="{taille}" viewBox="0 0 24 24" fill="none" stroke="{ch.ENCRE}" '
            f'stroke-width="{trait}" stroke-linecap="round" stroke-linejoin="round">'
            f'{source[debut:source.index("</svg>")]}</svg>')


def stations(c, icones, rayon=19):
    """Une icone par colonne, dans un cercle pose sur l'horizon : chaque colonne devient une station."""
    for nom, x in zip(icones, ch.BLOCS):
        c.trace(f'<circle cx="{x + rayon}" cy="{ch.HORIZON}" r="{rayon}" fill="{ch.PAPIER}" '
                f'stroke="rgba(244,244,247,.5)"/>')
        c.html.append(f'<div class="a" style="left:{x + rayon - 10}px;top:{ch.HORIZON - 10}px">{icone(nom)}</div>')


def etiquette(c, i, x, texte):
    """L'etiquette d'une colonne : son numero dans sa teinte, puis son nom en chasse fixe."""
    c.texte(x, ch.ETIQUETTE_Y, f'<span style="color:{ch.TEINTES[i]}">0{i + 1}</span>&nbsp;&nbsp;{texte}')


def plan_de_page(c):
    """Le plan commun aux deux slides : les colonnes de la grille, les marges cotees, la croix de l'horizon."""
    for x in (ch.MARGE, ch.BLOCS[1], ch.BLOCS[2], ch.LARGEUR - ch.MARGE):
        c.fil((x, 744), (x, 986), pointille=True, opacite=.22)
    for x0, x1 in ((0, ch.MARGE), (ch.LARGEUR - ch.MARGE, ch.LARGEUR)):
        c.fil((x0, 1050), (x1, 1050), opacite=.35)
        c.fil((x0 + .5, 1044), (x0 + .5, 1056), opacite=.35)
        c.fil((x1 - .5, 1044), (x1 - .5, 1056), opacite=.35)
        c.centre((x0 + x1) / 2, 1030, str(ch.MARGE))
    # A gauche, c'est la premiere station qui marque le bout de l'horizon.
    c.croix(ch.LARGEUR - ch.MARGE, ch.HORIZON)
