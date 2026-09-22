/**
 * L'apercu d'une annonce : le telephone dans la console. Il suit la saisie, dans le theme clair ou
 * sombre au choix, et montre la carte aux deux largeurs ou elle vit — le carrousel du tableau de
 * bord et la cellule de la grille —, la fiche, et les cartes speciales dans le carrousel qui les
 * accueille. En tete, l'etat que la saisie donnera : visible, programmee, brouillon…
 *
 * C'est une approximation, et il le dit : un rendu web d'un ecran React Native ne tombe pas au
 * pixel pres, et la carte v2 qu'il dessine est celle que la 6.3 rendra — le telephone d'aujourd'hui
 * montre encore l'affiche 1:1 entiere. La verification finale reste le telephone, en audience
 * « testeurs ».
 */

import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

import type { Ligne } from '../../../supabase';
import { Pastille } from '../../../composants/ui/Pastille';
import { etatDAnnonce } from '../etat';
import { Carte, CarteVoisine } from './Carte';
import { Fiche } from './Fiche';
import { annonceDApercu, emplacementsSpeciaux, LARGEUR_CARROUSEL, LARGEUR_CELLULE, LARGEUR_TELEPHONE, teinteDe } from './modele';
import { paletteDe, variablesDApercu, type ThemeDApercu } from './palette';

function Ecran({ titre, children }: { readonly titre: string; readonly children: React.ReactNode }) {
    return (
        <section className="ap-ecran">
            <h3 className="ap-ecran-titre">{titre}</h3>
            <div className="ap-telephone" style={{ width: LARGEUR_TELEPHONE }}>{children}</div>
        </section>
    );
}

export function Apercu({ valeurs }: { readonly valeurs: Ligne }) {
    const [theme, setTheme] = useState<ThemeDApercu>('light');
    const annonce = annonceDApercu(valeurs);
    const teinte = teinteDe(annonce.couleur, paletteDe(theme));
    const etat = etatDAnnonce(valeurs, new Date());
    const speciaux = emplacementsSpeciaux(annonce.emplacements);

    return (
        <div className={`apercu theme-${theme}`} style={variablesDApercu(theme)}>
            <div className="apercu-entete">
                <div className="apercu-etat">
                    <Pastille ton={etat.ton} point>{etat.libelle}</Pastille>
                    {etat.phrase !== null ? <span className="petit secondaire">{etat.phrase}</span> : null}
                </div>
                <div className="bascule" role="radiogroup" aria-label="Thème de l’aperçu">
                    <button type="button" role="radio" aria-checked={theme === 'light'} className={`segment ${theme === 'light' ? 'actif' : ''}`} onClick={() => setTheme('light')}><Sun className="icone" aria-hidden="true" /> Clair</button>
                    <button type="button" role="radio" aria-checked={theme === 'dark'} className={`segment ${theme === 'dark' ? 'actif' : ''}`} onClick={() => setTheme('dark')}><Moon className="icone" aria-hidden="true" /> Sombre</button>
                </div>
            </div>
            <p className="petit secondaire apercu-note">
                Approximation : police, ombres et arrondis diffèrent, et cette carte 4:5 est celle que la 6.3 rendra — aujourd’hui le téléphone montre l’affiche 1:1 entière. La vérification finale reste le téléphone, en audience « testeurs ».
            </p>

            <Ecran titre="Tableau de bord — le carrousel">
                <div className="ap-carrousel">
                    <Carte annonce={annonce} largeur={LARGEUR_CARROUSEL} teinte={teinte} />
                    <CarteVoisine largeur={LARGEUR_CARROUSEL} />
                </div>
            </Ecran>

            <Ecran titre="Liste complète — la grille">
                <div className="ap-grille">
                    <Carte annonce={annonce} largeur={LARGEUR_CELLULE} teinte={teinte} />
                    <CarteVoisine largeur={LARGEUR_CELLULE} />
                </div>
            </Ecran>

            {speciaux.map((emplacement) => (
                <Ecran key={emplacement.code} titre={`Carrousel ${emplacement.libelle} — carte spéciale, rendue à partir de la 6.3`}>
                    <div className="ap-carrousel">
                        <CarteVoisine largeur={LARGEUR_CARROUSEL} />
                        <Carte annonce={annonce} largeur={LARGEUR_CARROUSEL} teinte={teinte} />
                        <CarteVoisine largeur={LARGEUR_CARROUSEL} />
                    </div>
                </Ecran>
            ))}

            <Ecran titre="La fiche">
                <Fiche annonce={annonce} teinte={teinte} />
            </Ecran>
        </div>
    );
}
