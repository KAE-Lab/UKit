/**
 * L'adresse laissee dans un retour (jalon 7-H) : la seule copie de l'adresse, que la base ne laisse lire
 * a aucun compte de la console, et que public.contact_du_retour() rend a un admin. Elle ne s'affiche
 * qu'au clic, meme pour lui : une capture de la fiche ne la montre pas par defaut, et PRIVACY.md promet
 * qu'elle n'est transmise a personne.
 */

import { Eye, EyeOff, Mail } from 'lucide-react';
import { useState } from 'react';

import { estAdmin } from '../../auth/droits';
import { useDroits } from '../../auth/session';
import { Bouton } from '../../composants/ui/Bouton';
import { messageDErreur, traduire } from '../../lib/erreurs';
import { supabase } from '../../supabase';

async function lireContact(id: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('contact_du_retour', { p_id: id });
    if (error !== null) throw traduire(error);
    return typeof data === 'string' && data !== '' ? data : null;
}

type Etat = { readonly etat: 'masquee' } | { readonly etat: 'lecture' } | { readonly etat: 'montree'; readonly contact: string | null } | { readonly etat: 'erreur'; readonly texte: string };

/** Une adresse e-mail s'ouvre dans la messagerie ; le reste — un contact qui n'en est pas une — se lit tel quel. */
function Adresse({ contact }: { readonly contact: string | null }) {
    if (contact === null) return <span className="secondaire">Aucune adresse laissée.</span>;
    if (!contact.includes('@')) return <span className="mono">{contact}</span>;
    return <a href={`mailto:${contact}`}><Mail className="icone" aria-hidden="true" /> {contact}</a>;
}

export function ContactDuRetour({ id }: { readonly id: string }) {
    const droits = useDroits();
    const [etat, setEtat] = useState<Etat>({ etat: 'masquee' });
    if (droits === undefined) return null;
    if (!estAdmin(droits)) {
        return <p className="secondaire petit">L’adresse laissée, quand il y en a une, ne se lit que par un admin.</p>;
    }

    const montrer = async () => {
        setEtat({ etat: 'lecture' });
        try {
            setEtat({ etat: 'montree', contact: await lireContact(id) });
        } catch (echec) {
            setEtat({ etat: 'erreur', texte: messageDErreur(echec) });
        }
    };

    return (
        <div className="contact-du-retour">
            <span className="intitule">Adresse laissée</span>
            {etat.etat === 'montree' ? (
                <span className="valeur">
                    <Adresse contact={etat.contact} />
                    <Bouton variante="discret" compact onClick={() => setEtat({ etat: 'masquee' })} icone={<EyeOff className="icone" aria-hidden="true" />}>Masquer</Bouton>
                </span>
            ) : (
                <span className="valeur">
                    <Bouton variante="tonal" compact enAttente={etat.etat === 'lecture'} onClick={() => { void montrer(); }} icone={<Eye className="icone" aria-hidden="true" />}>Afficher l’adresse</Bouton>
                    {etat.etat === 'erreur' ? <span className="erreur-en-ligne">{etat.texte}</span> : null}
                </span>
            )}
        </div>
    );
}
