"""La slide 2 : la problematique, Fig. 02, et les trois livrables de l'etude.

Elle se compose comme la slide 1 : un titre en grand la ou la slide 1 pose son logo, et dans la meme
matiere que lui ; une ligne en chasse fixe dessous ; la question sur deux tiers ; la figure a droite,
a la meme place et a la meme echelle que le U. Un tronc part du << ? >> de la question et se divise
vers les trois livrables : la question se resout en trois reponses.
"""
import charte as ch
import figures as fg
import traces as tr

# Le titre : le haut de ses capitales s'aligne sur le haut du logo de la slide 1.
TITRE_TAILLE, TITRE_CAPITALES = 112, 150
# Geist : ascendante 1005, descendante 295 et capitales 710 pour 1000. Sur une ligne haute d'un
# corps, la ligne de base tombe a 0,855 corps du haut de la ligne, les capitales a 0,145.
TITRE_HAUT = TITRE_CAPITALES - 0.145 * TITRE_TAILLE
TITRE_BASE = TITRE_HAUT + 0.855 * TITRE_TAILLE
TITRE = 'Problématique'
# L'arete du verre, comme sur le logo de la slide 1.
ARETE = 1.6
# Sa largeur a 112 px, mesuree dans Chromium.
TITRE_LARGEUR = 727

# Chaque mot renvoie a un master inscrit au programme Disrupt Campus.
FILIERES = '<b>filières</b> · économie · entrepreneuriat · droit · marketing · sociologie'
FILIERES_Y = 268

TAILLE, INTERLIGNE, HAUT = 48, 57, 300
BASES = [HAUT + (INTERLIGNE - 1.3 * TAILLE) / 2 + 1.005 * TAILLE + i * INTERLIGNE for i in range(6)]
COLONNE_DROITE = 1230
# La derniere ligne, « auprès des administrations universitaires ? », mesure 898 px ;
# le point d'interrogation est centre 13 px avant sa fin.
Q_X, Q_BAS = ch.MARGE + 898 - 13, BASES[-1] + 16
BUS = 700

FIG_X, FIG_H = ch.BLOCS[2], 560
FIG_Y = ch.HORIZON - FIG_H


def renvoi(i):
    return f'<sup class="renvoi" style="color:{ch.TEINTES[i]}">0{i + 1}</sup>'


# Retours a la ligne poses a la main : aucune expression cle n'est coupee, et chaque levier porte
# le renvoi de la colonne qui lui repond.
QUESTION = (
    'Quelle stratégie de développement concevoir pour<br>'
    '<b>pérenniser UKit</b> sur les campus bordelais, en faisant<br>'
    f'de son <em class="a1">modèle économique</em>{renvoi(0)} '
    f'et de son <em class="a2">cadre légal</em>{renvoi(1)}<br>'
    f'les leviers pour systématiser l’<em class="a3">acquisition utilisateur</em>{renvoi(2)}<br>'
    'et établir un positionnement d’<b>acteur légitime</b><br>'
    'auprès des administrations universitaires<span class="f"></span>?'
)

LIVRABLES = [
    ('livrable.modele', 'Modèle économique', 'Un modèle chiffré et réaliste pour atteindre l’autosuffisance.'),
    ('livrable.audit', 'Cadre légal',
     'Un audit et un plan d’action pour sécuriser les relations institutionnelles.'),
    ('livrable.feuille-de-route', 'Acquisition', 'Une feuille de route prête à être déployée sur les campus.'),
]
ICONES = ('coins', 'scale', 'user-plus')

CSS = f'''
@font-face{{font-family:'Geist Titre';src:url({fg.FICHIER_POLICE_TITRE});font-weight:600}}
.question{{left:{ch.MARGE}px;top:{HAUT}px;font-size:{TAILLE}px;font-weight:470;letter-spacing:-.03em;
  line-height:{INTERLIGNE}px;white-space:nowrap}}
.question b,.question em{{font-weight:600}}
.a1{{color:{ch.TEINTES[0]} !important}} .a2{{color:{ch.TEINTES[1]} !important}} .a3{{color:{ch.TEINTES[2]} !important}}
.renvoi{{font-family:'Geist Mono',monospace;font-size:17px;font-weight:500;letter-spacing:0;vertical-align:0;
  line-height:0;position:relative;top:-23px;margin-left:5px}}
.livrable{{font-size:40px;font-weight:600;letter-spacing:-.03em;line-height:42px}}
.detail{{font-size:26px;font-weight:450;line-height:36px;color:{ch.GRIS};width:{ch.LARGEUR_BLOC - 40}px;
  white-space:normal}}
'''


def titre():
    """Le titre dans la matiere du logo : le degrade rempli a 42 %, et son arete nette.

    Il pese ainsi en haut de la slide 2 ce que le logo pese en haut de la slide 1.
    """
    base = TITRE_BASE - TITRE_HAUT
    return (f'<svg class="a" style="left:{ch.MARGE}px;top:{TITRE_HAUT:.1f}px;overflow:visible" width="760" '
            f'height="{TITRE_TAILLE}"><defs><linearGradient id="verre" x1="0" y1="0" x2="1" y2=".38">'
            f'<stop offset=".32" stop-color="#007AFF"/><stop offset=".78" stop-color="#5E5CE6"/>'
            f'</linearGradient></defs>'
            f'<text x="0" y="{base:.1f}" font-family="Geist Titre" font-weight="600" font-size="{TITRE_TAILLE}" '
            f'letter-spacing="{-0.04 * TITRE_TAILLE:.2f}" fill="url(#verre)" fill-opacity=".42" stroke="url(#verre)" '
            f'stroke-width="{ARETE}">{TITRE}</text></svg>')


def plan_du_titre(c):
    """La ligne de pied et la ligne de capitales du titre, et sa fiche typographique."""
    fin = ch.MARGE + TITRE_LARGEUR
    y = ch.pied(TITRE_BASE, TITRE_TAILLE, arete=ARETE)
    c.fil((ch.MARGE, y), (fin + 26, y), opacite=.32)
    c.fil((ch.MARGE, TITRE_CAPITALES), (fin + 26, TITRE_CAPITALES), pointille=True, opacite=.28)
    c.texte(fin + 38, y - 7, f'geist 600 · {TITRE_TAILLE} / {TITRE_TAILLE}')


def plan_de_la_question(c):
    """Les lignes de pied de la question dans sa colonne, et sa fiche typographique."""
    for base in BASES:
        y = ch.pied(base, TAILLE)
        c.fil((ch.MARGE, y), (COLONNE_DROITE, y), opacite=.14)
    c.texte(COLONNE_DROITE, ch.pied(BASES[-1], TAILLE) - 20, f'geist 470 · {TAILLE} / {INTERLIGNE}', 'm', droite=True)


def cote_de_la_hauteur(c):
    """La hauteur du « ? » : 343, celle du U et du logo. Les deux figures sont construites a la meme hauteur."""
    s = FIG_H / fg.vue(fg.BOITE_Q)[1]
    haut, bas = FIG_Y + 1.5 * s, FIG_Y + (fg.HAUTEUR_U + 1.5) * s
    x, milieu = FIG_X - 21, (haut + bas) / 2
    c.fil((x, haut), (x, milieu - 16))
    c.fil((x, milieu + 16), (x, bas))
    for y in (haut, bas):
        c.fil((x - 7, y), (x + 7, y))
    c.centre(x, milieu - 7, f'{fg.HAUTEUR_U:.0f}')


def decomposition(c):
    """Le tronc part du « ? » de la question, puis se divise vers les trois stations de l'horizon."""
    centres = [x + 19 for x in ch.BLOCS]
    haut_des_stations = ch.HORIZON - 19
    c.point(Q_X, Q_BAS)
    c.fil((Q_X, Q_BAS), (Q_X, BUS))
    c.fil((centres[0], BUS), (centres[2], BUS))
    for x in centres:
        c.fil((x, BUS), (x, haut_des_stations))
        c.point(x, BUS)
    c.point(Q_X, BUS)
    c.texte(Q_X + 14, BUS - 26, '1 question · 3 livrables')


def page():
    c = tr.Calque()
    with c.decor():
        plan_du_titre(c)
        plan_de_la_question(c)
        tr.plan_de_page(c)
        cote_de_la_hauteur(c)
    c.texte(ch.MARGE, FILIERES_Y, FILIERES)
    tr.stations(c, ICONES)
    for i, (x, (etiquette, _, _)) in enumerate(zip(ch.BLOCS, LIVRABLES)):
        tr.etiquette(c, i, x, etiquette)
    decomposition(c)
    livrables = ''.join(
        f'<div class="a livrable" style="left:{x}px;top:830px">{nom}</div>'
        f'<div class="a detail" style="left:{x}px;top:884px">{detail}</div>'
        for x, (_, nom, detail) in zip(ch.BLOCS, LIVRABLES))
    corps = (ch.cadre('02') + c.rendu()
             + titre()
             + f'<div class="a question deux-tons">{QUESTION}</div>'
             + livrables
             + f'<img class="a" src="{fg.FICHIER_Q}" alt="" style="left:{FIG_X}px;top:{FIG_Y}px;height:{FIG_H}px">'
             + f'<div class="a legende" style="left:{FIG_X}px;top:{FIG_Y - 44}px">Fig. 02 · <b>Le ?</b></div>')
    return ch.page(corps, CSS)
