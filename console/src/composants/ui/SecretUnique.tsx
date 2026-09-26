/**
 * Un secret montre une seule fois (jalon 7-H) : le mot de passe provisoire d'un membre de l'equipe. Il
 * ne vit que dans ce dialogue — ni l'URL, ni un cache, ni le journal ne le portent — et le fermer
 * l'oublie. Il se lit en grand, groupe par quatre, pour se dicter ; « Copier » le met dans le
 * presse-papiers pour qui le transmet par un autre moyen.
 *
 * Comme la confirmation, le dialogue garde son contenu pendant le fondu de fermeture : sinon il se
 * viderait sous les yeux, le temps de l'animation (Confirmation.tsx).
 */

import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import type { Secret } from '../../schema/descripteurs';
import { Bouton } from './Bouton';

export function SecretUnique({ secret, fermer }: { readonly secret: Secret | null; readonly fermer: () => void }) {
    const [affiche, setAffiche] = useState<Secret | null>(secret);
    const [copie, setCopie] = useState(false);
    // Le secret du dialogue suit celui qu'on lui donne, et survit a sa fermeture le temps du fondu.
    if (secret !== null && secret !== affiche) {
        setAffiche(secret);
        setCopie(false);
    }

    const copier = async () => {
        if (affiche === null) return;
        try {
            await navigator.clipboard.writeText(affiche.valeur);
            setCopie(true);
        } catch {
            setCopie(false);
        }
    };

    return (
        <AlertDialog.Root open={secret !== null} onOpenChange={(ouvert) => { if (!ouvert) fermer(); }}>
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="voile" />
                <AlertDialog.Popup className="dialogue">
                    <AlertDialog.Title render={<h2 />}>{affiche?.titre}</AlertDialog.Title>
                    <output className="secret" aria-label="Mot de passe provisoire">{affiche?.valeur}</output>
                    <AlertDialog.Description render={<p className="description" />}>{affiche?.consigne}</AlertDialog.Description>
                    <div className="boutons fin">
                        <Bouton variante="tonal" onClick={() => { void copier(); }} icone={copie ? <Check className="icone" aria-hidden="true" /> : <Copy className="icone" aria-hidden="true" />}>
                            {copie ? 'Copié' : 'Copier'}
                        </Bouton>
                        <Bouton variante="plein" onClick={fermer} autoFocus>C’est noté</Bouton>
                    </div>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
