/**
 * La page du compte : qui est connecte, ce que son role lui permet, changer son mot de passe, se
 * deconnecter.
 */

import { BookOpen, LogOut } from 'lucide-react';

import { Bouton } from '../composants/ui/Bouton';
import { Encart } from '../composants/ui/Encart';
import { SqueletteTexte } from '../composants/ui/Squelette';
import { GUIDE_DE_LA_CONSOLE } from '../lib/liens';
import { useEtablissements } from '../requetes/useEtablissements';
import { supabase } from '../supabase';
import { phraseDesDroits } from './droits';
import { FormulaireMotDePasse } from './FormulaireMotDePasse';
import type { Session } from './session';
import { seDeconnecter } from './useSession';

async function changer(motDePasse: string): Promise<string | null> {
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    return error === null ? null : error.message;
}

export function Compte({ session }: { readonly session: Session }) {
    const { etablissements } = useEtablissements();
    const nomDe = (code: string) => etablissements.find((e) => e.code === code)?.nom ?? code;
    const droits = session.droits;

    return (
        <>
            <div className="entete-page"><div><h1>Compte</h1><p className="sous-titre">Qui est connecté, et ce que son rôle lui permet.</p></div></div>
            <div className="carte">
                <h2>{session.email}</h2>
                <div className="place-encart">
                    {droits === undefined ? <SqueletteTexte largeur="50%" /> : <Encart ton={droits === null ? 'erreur' : 'ok'}>{phraseDesDroits(droits, nomDe)}</Encart>}
                </div>
                <div className="boutons">
                    <a className="bouton tonal" href={GUIDE_DE_LA_CONSOLE} target="_blank" rel="noreferrer"><span className="contenu-bouton"><BookOpen className="icone" aria-hidden="true" />Le guide de la console</span></a>
                    <Bouton variante="discret" onClick={() => { void seDeconnecter(); }} icone={<LogOut className="icone" aria-hidden="true" />}>Se déconnecter</Bouton>
                </div>
            </div>
            <FormulaireMotDePasse titre="Changer le mot de passe" bouton="Changer" poser={changer} succes="Mot de passe changé." />
        </>
    );
}
