# Le kit de l'Épure

Le code qui produit l'Épure, l'identité visuelle de UKit : le logo redessiné en géométrie exacte, et les
deux slides qui ont présenté UKit au programme Disrupt Campus, ses premiers témoins. L'identité elle-même,
ses règles et son histoire sont dans [docs/identite.md](../../docs/identite.md).

Le kit reproduit les témoins **au pixel près** : `python exporter.py` redonne exactement
[docs/identite/temoin-slide-1.png](../../docs/identite/temoin-slide-1.png) et
[temoin-slide-2.png](../../docs/identite/temoin-slide-2.png).

## Jouer

Python 3.12, dans un environnement virtuel, depuis ce dossier :

```bash
python -m pip install -r requirements.txt
python -m playwright install chromium

python exporter.py        # les deux slides en PNG 4K et le PDF 16:9, dans sortie/
python reconstruire.py    # le logo vectoriel : docs/identite/logo-ukit.svg et sa variante d'une couleur
```

`sortie/` et les fichiers que l'export régénère à chaque passage (les dessins des figures, le logo en
verre, la police du titre, les pages HTML rendues) ne se versionnent pas : le `.gitignore` de la racine
les écarte.

## Ce que contient ce dossier

| Fichier | Rôle |
|---|---|
| `charte.py` | la grille, la palette, les polices, le cadre commun aux slides, et la règle des lignes de pied |
| `traces.py` | les traces de conception : traits, cotes, étiquettes, icônes posées sur l'horizon ; le décor rendu en retrait à 65 % |
| `figures.py` | le logo en verre, l'écho qui construit Fig. 01 (le U) et Fig. 02 (le ?), et la police du titre : Geist 600 aux contours fusionnés |
| `diapo1.py`, `diapo2.py` | les deux compositions témoins |
| `reconstruire.py`, `geometrie.py` | le logo UKit en géométrie exacte, mesuré sur le PNG d'origine (99,5 % de recouvrement) |
| `exporter.py` | le rendu en 4K par Chromium, puis le PDF |
| `polices/` | Geist et Geist Mono, sous licence SIL Open Font License ([OFL.txt](polices/OFL.txt)) |
| `icones/` | six icônes de [Lucide](https://lucide.dev), sous licence ISC ([LICENSE](icones/LICENSE)) |
| `kaelab.png` | le monogramme de KAE Lab, pour le cadre |

## Réutiliser le kit

Une nouvelle composition — une affiche, une slide, un visuel pour le site — s'écrit comme `diapo1.py` :
elle prend la grille et les couleurs dans `charte.py`, dessine ses traces avec un `Calque` de `traces.py`
en rangeant le décor dans `with calque.decor():`, et pose ses figures depuis `figures.py`. Les règles à
tenir sont celles de [docs/identite.md](../../docs/identite.md#les-règles-de-facture).
