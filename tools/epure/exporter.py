"""Exporte les deux slides temoins de l'Epure : un PNG en 4K par slide, et le PDF au format 16:9.

Depuis ce dossier : python exporter.py ; tout s'ecrit dans sortie/, que Git ignore.

Le PDF est fait d'images pleine page : il se projette a l'identique sur n'importe quel poste,
sans dependre des polices installees. Les PNG servent a qui insere les slides dans un autre
diaporama.
"""
import os
from pathlib import Path

import img2pdf
from PIL import Image
from playwright.sync_api import sync_playwright

import charte as ch
import diapo1
import diapo2
import figures

ICI = Path(__file__).resolve().parent
SORTIE = ICI / 'sortie'
PDF = SORTIE / 'UKit - Disrupt Campus 2027.pdf'
PNG = SORTIE / 'UKit - slide {}.png'
# Le format 16:9 de PowerPoint : 13,333 x 7,5 pouces, ou la 4K tient a 288 dpi.
FORMAT = img2pdf.get_layout_fun((img2pdf.in_to_pt(13.3333), img2pdf.in_to_pt(7.5)))
# Le titre et l'auteur que le lecteur PDF affiche a l'ouverture, a la place du nom du fichier.
METADONNEES = {'title': 'UKit · Disrupt Campus 2027', 'author': 'KAE Lab'}


def main():
    # Les pages chargent leurs polices, leurs dessins et leurs icones depuis ce dossier.
    os.chdir(ICI)
    figures.ecrire()
    images = []
    with sync_playwright() as p:
        navigateur = p.chromium.launch()
        onglet = navigateur.new_page(viewport={'width': ch.LARGEUR, 'height': ch.HAUTEUR}, device_scale_factor=2)
        for numero, diapo in ((1, diapo1), (2, diapo2)):
            html = ICI / f'slide-{numero}.html'
            html.write_text(diapo.page())
            onglet.goto(html.as_uri())
            # Les polices doivent etre chargees avant la capture, sinon c'est le repli qui s'imprime.
            onglet.evaluate('document.fonts.ready')
            cible = Path(str(PNG).format(numero))
            cible.parent.mkdir(parents=True, exist_ok=True)
            onglet.screenshot(path=cible)
            Image.open(cible).convert('RGB').save(cible, optimize=True)
            images.append(str(cible))
        navigateur.close()
    PDF.write_bytes(img2pdf.convert(images, layout_fun=FORMAT, **METADONNEES))


if __name__ == '__main__':
    main()
