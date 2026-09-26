/**
 * La galerie d'une annonce : plusieurs fichiers televerses d'un coup, chacun compresse, nomme et
 * cache un an par le meme pipeline que le visuel principal ; puis reordonnee par glisser-deposer
 * — a la souris, ou au clavier (espace, fleches, espace), la console se parcourt entiere au clavier.
 * Remplace le tableau JSON d'adresses que l'editeur tapait a la main.
 */

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Upload, X } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';

import { messageDErreur } from '../../../lib/erreurs';
import type { ChampProps } from './types';

const KO = 1024;

function Vignette({ url, rang, desactive, onRetirer }: { readonly url: string; readonly rang: number; readonly desactive: boolean; readonly onRetirer: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url, disabled: desactive });
    return (
        <li ref={setNodeRef} className={`galerie-vignette ${isDragging ? 'en-vol' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
            <img src={url} alt={`Image ${rang + 1}`} loading="lazy" />
            <button type="button" className="poignee" aria-label={`Déplacer l’image ${rang + 1}`} disabled={desactive} {...attributes} {...listeners}>
                <GripVertical className="icone" aria-hidden="true" />
            </button>
            <button type="button" className="retrait" aria-label={`Retirer l’image ${rang + 1}`} disabled={desactive} onClick={onRetirer}>
                <X className="icone" aria-hidden="true" />
            </button>
            <span className="rang">{rang + 1}</span>
        </li>
    );
}

/** Le bilan d'un lot : ce qui est parti, ce qui a echoue, sans perdre ce qui a reussi. */
export function bilanDeLot(reussis: number, octets: number, echecs: readonly string[]): { readonly ton: 'ok' | 'erreur'; readonly texte: string } {
    const partie = reussis === 0 ? '' : `${reussis} image${reussis > 1 ? 's' : ''} téléversée${reussis > 1 ? 's' : ''} (${Math.round(octets / KO)} Ko)`;
    if (echecs.length === 0) return { ton: 'ok', texte: `${partie}.` };
    return { ton: 'erreur', texte: `${partie === '' ? '' : `${partie} ; `}${echecs.length} refusée${echecs.length > 1 ? 's' : ''} : ${echecs[0] ?? ''}` };
}

export function ChampGalerie({ champ, id, saisie, onChange, desactive }: ChampProps) {
    const [enCours, setEnCours] = useState(false);
    const [retour, setRetour] = useState<{ readonly ton: 'ok' | 'erreur'; readonly texte: string } | null>(null);
    const urls = Array.isArray(saisie) ? saisie.filter((url): url is string => typeof url === 'string') : [];
    const dossier = champ.type.type === 'galerie' ? champ.type.dossier : 'annonces';
    const capteurs = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const choisir = async (evenement: ChangeEvent<HTMLInputElement>) => {
        const fichiers = Array.from(evenement.target.files ?? []);
        evenement.target.value = '';
        if (fichiers.length === 0) return;
        setEnCours(true);
        setRetour(null);
        try {
            const { televerser } = await import('../../../lib/televerser');
            // Chaque fichier part de son cote : un refus n'annule pas les autres, et l'ordre de la galerie est celui du choix.
            const resultats = await Promise.allSettled(fichiers.map((fichier) => televerser(dossier, fichier)));
            const reussis = resultats.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
            const echecs = resultats.flatMap((r) => (r.status === 'rejected' ? [messageDErreur(r.reason)] : []));
            if (reussis.length > 0) onChange([...urls, ...reussis.map((r) => r.url)]);
            setRetour(bilanDeLot(reussis.length, reussis.reduce((somme, r) => somme + r.octets, 0), echecs));
        } finally {
            setEnCours(false);
        }
    };

    const finDeGlisser = (evenement: DragEndEvent) => {
        const { active, over } = evenement;
        if (over === null || active.id === over.id) return;
        onChange(arrayMove(urls, urls.indexOf(String(active.id)), urls.indexOf(String(over.id))));
    };

    return (
        <div className="galerie">
            {urls.length > 0 ? (
                <DndContext sensors={capteurs} collisionDetection={closestCenter} onDragEnd={finDeGlisser}>
                    <SortableContext items={urls} strategy={rectSortingStrategy}>
                        <ul className="galerie-liste">
                            {urls.map((url, rang) => <Vignette key={url} url={url} rang={rang} desactive={desactive} onRetirer={() => onChange(urls.filter((u) => u !== url))} />)}
                        </ul>
                    </SortableContext>
                </DndContext>
            ) : null}
            <div className="boutons">
                <label className={`bouton tonal ${desactive || enCours ? 'attente' : ''}`} htmlFor={id}>
                    <span className="contenu-bouton"><Upload className="icone" aria-hidden="true" />{enCours ? 'Téléversement…' : 'Téléverser des images'}</span>
                    <input id={id} type="file" accept="image/*" multiple hidden disabled={desactive || enCours} onChange={(evenement) => { void choisir(evenement); }} />
                </label>
                <span className="petit secondaire">Plusieurs fichiers d’un coup ; glisser pour réordonner.</span>
            </div>
            {retour !== null ? <span className={retour.ton === 'erreur' ? 'erreur' : 'petit secondaire'} role={retour.ton === 'erreur' ? 'alert' : 'status'}>{retour.texte}</span> : null}
        </div>
    );
}
