/**
 * La rangee des filtres, au-dessus de tout ce qu'elle regle (7-G) : la periode — un prereglage, un pas
 * en arriere ou en avant de sa propre duree, ou une plage choisie —, et la bascule des testeurs. Le
 * campus est celui du filtre global, dans la barre du haut.
 */

import { Popover } from '@base-ui/react/popover';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Bouton } from '../../composants/ui/Bouton';
import { Segments } from '../../composants/ui/Segments';
import { Selecteur } from '../../composants/ui/Selecteur';
import {
    decaler, derniersJours, duree, DUREE_MAXIMALE, estUnJour, jourLocal, libelleDePeriode, poserPeriode, PREREGLAGES, type Periode, type Prereglage,
} from '../../stats/periode';
import { poserParams, type Choix } from './choix';

const PLAGE = 'plage';

function ChoixDePlage({ periode, appliquer }: { readonly periode: Periode; readonly appliquer: (p: Periode) => void }) {
    const [ouvert, setOuvert] = useState(false);
    const [du, setDu] = useState(periode.du);
    const [au, setAu] = useState(periode.au);
    const [erreur, setErreur] = useState<string | null>(null);
    const aujourdhui = jourLocal(new Date());
    const ouvrir = (oui: boolean) => {
        if (oui) { setDu(periode.du); setAu(periode.au); setErreur(null); }
        setOuvert(oui);
    };
    const valider = (evenement: FormEvent) => {
        evenement.preventDefault();
        if (!estUnJour(du) || !estUnJour(au)) return setErreur('Deux dates complètes, du premier au dernier jour.');
        if (du > au) return setErreur('Le dernier jour précède le premier.');
        if (duree({ du, au }) > DUREE_MAXIMALE) return setErreur('Treize mois au plus : au-delà, les mesures sont purgées.');
        appliquer({ du, au });
        return setOuvert(false);
    };
    return (
        <Popover.Root open={ouvert} onOpenChange={ouvrir}>
            <Popover.Trigger className="bouton discret compact" aria-label="Choisir les dates"><CalendarRange className="icone" aria-hidden="true" />Dates</Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="start" className="selecteur-positionneur">
                    <Popover.Popup className="menu-popup choix-de-plage">
                        <form onSubmit={valider} noValidate>
                            <div className="champ"><label htmlFor="plage-du">Du</label><input id="plage-du" type="date" value={du} max={aujourdhui} onChange={(e) => setDu(e.target.value)} /></div>
                            <div className="champ"><label htmlFor="plage-au">Au</label><input id="plage-au" type="date" value={au} max={aujourdhui} onChange={(e) => setAu(e.target.value)} /></div>
                            {erreur === null ? null : <p className="erreur-en-ligne" role="alert">{erreur}</p>}
                            <Bouton variante="plein" compact type="submit">Appliquer</Bouton>
                        </form>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

export function Filtres({ choix }: { readonly choix: Choix }) {
    const { periode } = choix;
    const n = duree(periode);
    const hier = decaler(jourLocal(new Date()), -1);
    const poser = (suite: { readonly prereglage: Prereglage } | { readonly periode: Periode }) => poserParams(choix, (params) => poserPeriode(params, suite));
    const options = [
        ...PREREGLAGES.map((p) => ({ valeur: p.valeur as string, libelle: p.libelle })),
        ...(choix.prereglage === null ? [{ valeur: PLAGE, libelle: libelleDePeriode(periode) }] : []),
    ];
    const suivante = { du: decaler(periode.du, n), au: decaler(periode.au, n) };
    return (
        <div className="filtres-stats">
            <div className="periode">
                <Selecteur
                    valeur={choix.prereglage ?? PLAGE}
                    options={options}
                    onChange={(v) => { if (v !== PLAGE) poser({ prereglage: v as Prereglage }); }}
                    etiquette="Période"
                    Icone={CalendarRange}
                />
                <Bouton variante="discret" compact icone={<ChevronLeft className="icone" aria-hidden="true" />} aria-label="Période précédente" title="Période précédente" onClick={() => poser({ periode: choix.precedente })} />
                <Bouton
                    variante="discret" compact icone={<ChevronRight className="icone" aria-hidden="true" />} aria-label="Période suivante" title="Période suivante"
                    disabled={periode.au >= hier}
                    onClick={() => poser({ periode: suivante.au > hier ? derniersJours(n, new Date()) : suivante })}
                />
                <ChoixDePlage periode={periode} appliquer={(p) => poser({ periode: p })} />
            </div>
            <Segments
                valeur={choix.filtre.testeurs ? 'avec' : 'sans'}
                options={[{ valeur: 'sans', libelle: 'Sans testeurs' }, { valeur: 'avec', libelle: 'Avec testeurs' }]}
                onChange={(v) => poserParams(choix, (params) => { if (v === 'avec') params.set('testeurs', '1'); else params.delete('testeurs'); })}
                etiquette="Appareils testeurs"
            />
        </div>
    );
}
