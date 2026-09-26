/**
 * L'apercu d'une annonce : le telephone dans la console, dans un panneau a lui — a la hauteur de la
 * fenetre, avec son propre defilement — pour qu'on le regarde en ecrivant, sans descendre au bas du
 * formulaire (retour du 2026-09-23 : les deux partageaient le meme defilement, a des hauteurs
 * differentes, et voir la description demandait d'aller-retour entre le bas de la page et le champ).
 *
 * Deux vues, en onglets : **la carte**, aux deux largeurs ou elle vit — le carrousel du tableau de
 * bord et la cellule de la grille — et dans les carrousels ou elle est speciale ; **la fiche**, a la
 * taille d'un ecran de telephone. L'apercu **suit le champ qu'on edite** : le visuel montre la carte,
 * la description montre la fiche calee sur la section du curseur — le geste de l'editeur de themes de
 * Shopify. Un onglet choisi a la main reste choisi jusqu'au champ suivant.
 *
 * C'est une approximation, et il le dit : un rendu web d'un ecran React Native ne tombe pas au pixel
 * pres, et la carte 4:5 qu'il dessine est celle que la 6.3 rendra.
 */

import { Tabs } from '@base-ui/react/tabs';
import { Moon, Newspaper, Sun, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';

import { blocDeLaLigne } from '../../../../../src/shared/annonces/grammaire';
import type { Activite } from '../../../composants/formulaire/Formulaire';
import type { Ligne } from '../../../supabase';
import { Carte, CarteVoisine } from './Carte';
import { Fiche } from './Fiche';
import { annonceDApercu, emplacementsSpeciaux, LARGEUR_CARROUSEL, LARGEUR_CELLULE, teinteDe, vueDuChamp, zoneDuChamp, type Vue } from './modele';
import { paletteDe, variablesDApercu, type ThemeDApercu } from './palette';

function Ecran({ titre, children }: { readonly titre: string; readonly children: React.ReactNode }) {
    return (
        <section className="ap-ecran">
            <h3 className="ap-ecran-titre">{titre}</h3>
            <div className="ap-telephone">{children}</div>
        </section>
    );
}

/** La vue suit le champ qui prend le focus ; un onglet choisi a la main tient jusqu'au suivant. */
function useVue(champ: string | null): readonly [Vue, (vue: Vue) => void] {
    const [vue, setVue] = useState<Vue>('carte');
    const cible = champ === null ? null : vueDuChamp(champ);
    useEffect(() => { if (cible !== null) setVue(cible); }, [cible, champ]);
    return [vue, setVue];
}

export function Apercu({ valeurs, activite }: { readonly valeurs: Ligne; readonly activite: Activite }) {
    const [theme, setTheme] = useState<ThemeDApercu>('light');
    const [vue, setVue] = useVue(activite.champ);
    const annonce = annonceDApercu(valeurs);
    const teinte = teinteDe(annonce.couleur, paletteDe(theme));
    const speciaux = emplacementsSpeciaux(annonce.emplacements);
    const zone = activite.champ === null ? null : zoneDuChamp(activite.champ);
    const sectionActive = zone === 'description' && activite.ligne !== null && annonce.description !== null
        ? blocDeLaLigne(String(valeurs.description ?? ''), activite.ligne)
        : null;

    return (
        <Tabs.Root className={`apercu theme-${theme}`} style={variablesDApercu(theme)} value={vue} onValueChange={(valeur) => setVue(valeur === 'fiche' ? 'fiche' : 'carte')}>
            <div className="apercu-entete">
                <Tabs.List className="bascule" aria-label="Vue de l’aperçu">
                    <Tabs.Tab value="carte" className="segment"><WalletCards className="icone" aria-hidden="true" />Carte</Tabs.Tab>
                    <Tabs.Tab value="fiche" className="segment"><Newspaper className="icone" aria-hidden="true" />Fiche</Tabs.Tab>
                </Tabs.List>
                <div className="bascule" role="radiogroup" aria-label="Thème de l’aperçu">
                    <button type="button" role="radio" aria-checked={theme === 'light'} className={`segment ${theme === 'light' ? 'actif' : ''}`} onClick={() => setTheme('light')}><Sun className="icone" aria-hidden="true" />Clair</button>
                    <button type="button" role="radio" aria-checked={theme === 'dark'} className={`segment ${theme === 'dark' ? 'actif' : ''}`} onClick={() => setTheme('dark')}><Moon className="icone" aria-hidden="true" />Sombre</button>
                </div>
            </div>
            <p className="petit secondaire apercu-note">
                Approximation du téléphone : police, ombres et arrondis diffèrent. Cette carte 4:5 est celle de la 6.3 ; aujourd’hui, le téléphone montre l’affiche 1:1 entière.
            </p>
            <Tabs.Panel value="carte" className="apercu-vue">
                <Ecran titre="Tableau de bord, le carrousel">
                    <div className="ap-carrousel">
                        <Carte annonce={annonce} largeur={LARGEUR_CARROUSEL} teinte={teinte} />
                        <CarteVoisine largeur={LARGEUR_CARROUSEL} />
                    </div>
                </Ecran>
                <Ecran titre="Liste complète, la grille">
                    <div className="ap-grille">
                        <Carte annonce={annonce} largeur={LARGEUR_CELLULE} teinte={teinte} />
                        <CarteVoisine largeur={LARGEUR_CELLULE} />
                    </div>
                </Ecran>
                {speciaux.map((emplacement) => (
                    <Ecran key={emplacement.code} titre={`Carrousel ${emplacement.libelle}, carte spéciale rendue à partir de la 6.3`}>
                        <div className="ap-carrousel">
                            <CarteVoisine largeur={LARGEUR_CARROUSEL} />
                            <Carte annonce={annonce} largeur={LARGEUR_CARROUSEL} teinte={teinte} />
                            <CarteVoisine largeur={LARGEUR_CARROUSEL} />
                        </div>
                    </Ecran>
                ))}
            </Tabs.Panel>
            <Tabs.Panel value="fiche" className="apercu-vue vue-fiche">
                <div className="ap-telephone plein">
                    <Fiche annonce={annonce} teinte={teinte} zone={zone} sectionActive={sectionActive} />
                </div>
            </Tabs.Panel>
        </Tabs.Root>
    );
}
