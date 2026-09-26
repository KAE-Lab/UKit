"""La slide 1 : le logo et son plan de construction, le slogan, Fig. 01, et trois faits sur UKit.

Toutes les cotes sont mesurees sur le logo reconstruit (reconstruire.py) : le degrade et ses deux
arrets, le grand cercle du U, le point du i, l'angle du K, l'angle de l'extrusion de Fig. 01.
"""
import math

import charte as ch
import figures as fg
import geometrie as geo
import reconstruire as rc
import traces as tr

# Le logo, en haut a gauche : 860 px pour les 850 unites de son dessin.
LOGO_X, LOGO_Y, LOGO_L = ch.MARGE, 150, 860
K = LOGO_L / 850
COTE_Y = round(LOGO_Y + 343 * K + 29)

# Fig. 01, le U : bord gauche sur la troisieme colonne, pied sur l'horizon.
U_X, U_H = ch.BLOCS[2], 560
U_Y = ch.HORIZON - U_H
S_U = U_H / fg.vue(fg.BOITE_U)[1]
DIRECTION = math.atan2(fg.PAS[1], fg.PAS[0])
D = (math.cos(DIRECTION), math.sin(DIRECTION))

SLOGAN = 'Le <b>kit de survie</b><br>pour l’<b>étudiant bordelais</b>.'
SLOGAN_TAILLE, SLOGAN_INTERLIGNE = 66, 72
# Ce que contient le kit : la ligne dit ce que fait l'application a qui ne la connait pas.
CONTENU = '<b>contenu du kit</b> · emploi du temps · scolarité · restos u · bibliothèques · salles libres'
CONTENU_Y = 720
# Metriques de Geist a 66 px (ascendante 1005, capitales 710, pour 1000) : les lignes du slogan.
BASES, CAPITALES, FINS = (619.4, 691.4), (572.5, 644.5), (491, 767)

FAITS = [
    ('origine.talence', 'Conçu au <b>Collège Sciences<br>et Technologies</b>.', '44.81° n · 0.60° o'),
    ('usage.etudiants', '<b>Plus de 2<span class="f"></span>000 étudiants</b><br>l’utilisent déjà.',
     'ios · android'),
    # Le site « Emplois du temps de Bordeaux I » est en ligne en 2012 ; le depot devient UKit en 2017.
    ('historique.2012', '<b>Depuis 2012</b>,<br>de promo en promo.', '<b>2012</b> edt bordeaux i · <b>2017</b> ukit'),
]
ICONES = ('map-pin', 'users', 'history')

CSS = f'''
.slogan{{left:{ch.MARGE}px;top:560px;font-size:{SLOGAN_TAILLE}px;font-weight:560;letter-spacing:-.038em;
  line-height:{SLOGAN_INTERLIGNE}px}}
.fait{{font-size:30px;font-weight:480;line-height:40px;letter-spacing:-.006em}}
'''


def logo_pt(vx, vy):
    """Un point du dessin du logo en coordonnees de la slide."""
    return LOGO_X + vx * K, LOGO_Y + vy * K


def u_pt(vx, vy):
    """Un point du dessin de Fig. 01 en coordonnees de la slide."""
    return U_X + vx * S_U, U_Y + vy * S_U


DRAPEAU = u_pt(1.84, 28.3)      # la pointe du drapeau du U, face avant
COIN = u_pt(280.15, 1.68)       # le coin haut droit du fut droit, face avant
FACE = u_pt(45.97, 151.5)       # le flanc gauche de la face avant


def construction_du_u(c):
    """Les aretes de l'extrusion prolongees jusqu'au filet de tete, et l'angle qu'elles y font."""
    jonctions = []
    for px, py in (DRAPEAU, COIN):
        x0 = px - D[0] * (py - ch.LIGNE_TETE) / D[1]
        t_bord = (ch.LARGEUR - ch.MARGE - px) / D[0]
        c.fil((x0, ch.LIGNE_TETE), (px + D[0] * t_bord, py + D[1] * t_bord), pointille=True)
        c.point(x0, ch.LIGNE_TETE)
        jonctions.append(x0)
    c.noeud(*DRAPEAU, r=3.5)
    c.arc(jonctions[0], ch.LIGNE_TETE, 64, 0, DIRECTION)
    c.texte(jonctions[0] + 78, ch.LIGNE_TETE + 16, f'{math.degrees(DIRECTION):.1f}°'.replace('.', ','), 'legende')


def cote_du_logo(c):
    """La cote du logo, reliee a la face avant de Fig. 01 : le U sort du logo."""
    x0, x1 = LOGO_X, LOGO_X + LOGO_L
    xm = (x0 + x1) / 2
    c.fil((x0, COTE_Y), (xm - 106, COTE_Y))
    c.fil((xm + 106, COTE_Y), (x1, COTE_Y))
    for x in (x0, x1):
        c.fil((x, COTE_Y - 7), (x, COTE_Y + 7))
    c.centre(xm, COTE_Y - 7, 'ukit.svg · 850 × 343')
    coude = FACE[0] - D[0] * (COTE_Y - FACE[1]) / D[1]
    c.fil((x1, COTE_Y), (coude, COTE_Y), FACE)
    c.noeud(*FACE)


def plan_du_logo(c):
    """Le degrade et ses arrets, le grand cercle du U, le point du i et l'angle du K."""
    y = 118
    c.fil((LOGO_X, y), (LOGO_X + LOGO_L, y), opacite=.3)
    c.texte(LOGO_X, y - 26, 'dégradé · 21°')
    for part, hexa, x_logo in ((32, '#007AFF', 318.7), (78, '#5E5CE6', 760.0)):
        x = LOGO_X + x_logo * K
        c.trace(f'<rect x="{x - 4:.1f}" y="{y - 4}" width="8" height="8" fill="{hexa}" stroke="none"/>')
        c.texte(x - 4, y - 26, f'{hexa.lower()} · {part} %')

    cx, cy = logo_pt(161.56 + .5, 224.80 + .5)
    rayon = 117.09 * K
    c.trace(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{rayon:.1f}" stroke-dasharray="3 5"/>')
    c.croix(cx, cy, demi=6)
    bout = (cx + rayon * math.cos(math.pi / 4), cy + rayon * math.sin(math.pi / 4))
    c.fil((cx, cy), bout, opacite=.3)
    c.texte(bout[0] + 10, bout[1] - 4, 'r 117')

    cx, cy = logo_pt(590.17 + .5, 25.64 + .5)
    r = 25.51 * K
    c.fil((cx - r, cy), (cx + r, cy), opacite=.55)
    c.croix(cx, cy, demi=4)
    c.texte(cx + r + 10, cy - 7, 'ø 51')

    vx, vy = logo_pt(*(v + .5 for v in geo.intersection(rc.K_BRAS_D, rc.K_JAMBE_D)))
    c.arc(vx, vy, 42, math.radians(-60.1), math.radians(60.06), opacite=.5)
    c.texte(vx + 52, vy - 7, '120°')


def plan_du_slogan(c):
    """Sous chaque ligne du slogan sa ligne de pied, au-dessus sa ligne de capitales, et sa fiche typographique."""
    for base, capitale, fin in zip(BASES, CAPITALES, FINS):
        y = ch.pied(base, SLOGAN_TAILLE)
        c.fil((ch.MARGE, y), (fin + 26, y), opacite=.32)
        c.fil((ch.MARGE, capitale), (fin + 26, capitale), pointille=True, opacite=.28)
    c.texte(FINS[0] + 38, ch.pied(BASES[0], SLOGAN_TAILLE) - 7,
            f'geist 560 · {SLOGAN_TAILLE} / {SLOGAN_INTERLIGNE}')


def page():
    c = tr.Calque()
    with c.decor():
        construction_du_u(c)
        cote_du_logo(c)
        plan_du_logo(c)
        tr.plan_de_page(c)
        plan_du_slogan(c)
    c.texte(ch.MARGE, CONTENU_Y, CONTENU)
    tr.stations(c, ICONES)
    for i, (x, (etiquette, fait, donnee)) in enumerate(zip(ch.BLOCS, FAITS)):
        tr.etiquette(c, i, x, etiquette)
        c.texte(x, ch.TEXTE_Y, fait, 'fait deux-tons')
        c.texte(x, ch.DONNEE_Y, donnee)
    corps = (ch.cadre('01')
             + f'<img class="a" src="{fg.FICHIER_LOGO}" alt="UKit" '
             f'style="left:{LOGO_X}px;top:{LOGO_Y}px;width:{LOGO_L}px">'
             + f'<div class="a slogan deux-tons">{SLOGAN}</div>'
             + f'<img class="a" src="{fg.FICHIER_U}" alt="" style="left:{U_X}px;top:{U_Y}px;height:{U_H}px">'
             + f'<div class="a legende" style="left:{U_X}px;top:{U_Y - 44}px">Fig. 01 · <b>Le U</b></div>'
             + c.rendu())
    return ch.page(corps, CSS)
