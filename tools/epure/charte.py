"""La charte des deux slides : la grille, la palette, les polices et le cadre qu'elles partagent.

Les deux slides sont deux instances du meme cadre : la ligne de tete (KAE Lab, Disrupt Campus),
le pied (l'adresse du site, la pagination), l'horizon et la rangee de trois colonnes dessous.
Seule la zone haute change d'une slide a l'autre.
"""

LARGEUR, HAUTEUR = 1920, 1080
MARGE = 56
# Grille de douze colonnes ; chaque bloc de la rangee en prend quatre.
GOUTTIERE = 32
COLONNE = (LARGEUR - 2 * MARGE - 11 * GOUTTIERE) / 12
BLOCS = [round(MARGE + k * 4 * (COLONNE + GOUTTIERE)) for k in range(3)]
LARGEUR_BLOC = round(4 * COLONNE + 3 * GOUTTIERE)
# Le filet de la ligne de tete, et l'horizon qui separe la zone haute de la rangee.
LIGNE_TETE, HORIZON = 68, 770
# La rangee : l'etiquette, le texte, puis la donnee en chasse fixe.
ETIQUETTE_Y, TEXTE_Y, DONNEE_Y = 798, 838, 928

PAPIER, ENCRE, GRIS, ESTOMPE = '#0B0B12', '#F4F4F7', '#A0A0AC', '#6E6E7B'
# ESTOMPE, le gris des mots de liaison (3,9:1) : ils s'effacent derriere les mots cles. Un gris plus
# clair tenait mieux en salle tres eclairee, mais leur redonnait trop de poids sur un bon ecran.
FILET = 'rgba(244,244,247,.16)'
# Les deux couleurs du logo, et leur milieu pris en OKLab pour un pas regulier a l'oeil.
TEINTES = ['#007AFF', '#456BF2', '#5E5CE6']

# Les lettres rondes de Geist (o, b, e, a, u) descendent de 12 unites sous la ligne de base, pour
# paraitre aussi hautes que les droites. Une ligne de construction passe sous ce depassement, avec
# un jeu de 2 px : elle souligne le texte sans jamais couper une lettre.
DEPASSEMENT, JEU = 12 / 1000, 2


def pied(base, taille, arete=0.0):
    """La ligne de construction sous un texte pose sur la ligne de base `base`."""
    return base + DEPASSEMENT * taille + arete / 2 + JEU

CSS = f'''
@font-face{{font-family:Geist;src:url(polices/Geist[wght].ttf);font-weight:100 900}}
@font-face{{font-family:'Geist Mono';src:url(polices/GeistMono[wght].ttf);font-weight:100 900}}
html,body{{margin:0;width:{LARGEUR}px;height:{HAUTEUR}px;overflow:hidden;background:{PAPIER};color:{ENCRE};
  font-family:Geist,sans-serif;-webkit-font-smoothing:antialiased;font-kerning:normal}}
.a{{position:absolute}}
/* Geist n'a pas l'espace fine insecable : on la dessine. */
.f{{display:inline-block;width:.17em}}
.cap{{font-size:17px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;line-height:1}}
.cadre{{position:absolute;left:{MARGE}px;right:{MARGE}px;display:flex;align-items:center;gap:24px}}
.cadre .trait{{flex:1;height:1px;background:{FILET}}}
.cadre .second{{color:{GRIS}}}
.marque{{display:flex;align-items:center;gap:12px}}
.marque img{{width:24px;height:24px;filter:brightness(0) invert(1)}}
.horizon{{position:absolute;left:{MARGE}px;right:{MARGE}px;top:{HORIZON}px;height:1px;background:{FILET}}}
/* Deux tons : l'essentiel en clair, les mots de liaison estompes. */
.deux-tons{{color:{ESTOMPE}}}
.deux-tons b,.deux-tons em{{color:{ENCRE};font-weight:inherit;font-style:normal}}
/* Les legendes de figure, et les traces en chasse fixe. */
.legende{{font-size:17px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;line-height:1;color:{GRIS}}}
.legende b{{color:{ENCRE};font-weight:600}}
.m{{font-family:'Geist Mono',monospace;font-size:14px;line-height:1;letter-spacing:.01em;color:{GRIS};
  white-space:nowrap;font-variant-numeric:tabular-nums}}
.m b{{color:{ENCRE};font-weight:500}}
'''


def cadre(numero):
    """La ligne de tete, le pied et l'horizon, identiques sur les deux slides."""
    tete = (f'<div class="cadre" style="top:{MARGE}px">'
            '<span class="cap marque"><img src="kaelab.png" alt="">KAE Lab</span>'
            '<span class="trait"></span><span class="cap">Disrupt Campus 2027</span></div>')
    pied = (f'<div class="cadre" style="bottom:{MARGE}px"><span class="cap second">ukit-bordeaux.fr</span>'
            f'<span class="trait"></span><span class="cap second">{numero} / 02</span></div>')
    return tete + pied + '<div class="horizon"></div>'


def page(corps, css=''):
    return (f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>{CSS}{css}</style></head>'
            f'<body>{corps}</body></html>')
