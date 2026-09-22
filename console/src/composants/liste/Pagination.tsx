import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import type { EtatDeTable } from '../../lib/requete';
import { Bouton } from '../ui/Bouton';
import { TAILLES_DE_PAGE } from './etatUrl';

export function Pagination({ etat, poser, total }: { readonly etat: EtatDeTable; readonly poser: (etat: EtatDeTable) => void; readonly total: number | null }) {
    const { pageIndex, pageSize } = etat.pagination;
    const pages = total === null ? null : Math.max(1, Math.ceil(total / pageSize));
    const aller = (index: number) => poser({ ...etat, pagination: { pageIndex: index, pageSize } });
    const changerTaille = (taille: number) => poser({ ...etat, pagination: { pageIndex: 0, pageSize: taille } });
    const derniere = pages === null ? pageIndex : pages - 1;
    return (
        <nav className="pagination" aria-label="Pagination">
            <label>
                Par page{' '}
                <select value={pageSize} onChange={(e) => changerTaille(Number(e.target.value))} aria-label="Lignes par page">
                    {TAILLES_DE_PAGE.map((taille) => <option key={taille} value={taille}>{taille}</option>)}
                </select>
            </label>
            <span className="espace" />
            <span>{pages === null ? `page ${pageIndex + 1}` : `page ${pageIndex + 1} sur ${pages}`}</span>
            <Bouton variante="discret" compact aria-label="Première page" disabled={pageIndex === 0} onClick={() => aller(0)} icone={<ChevronsLeft className="icone" />} />
            <Bouton variante="discret" compact aria-label="Page précédente" disabled={pageIndex === 0} onClick={() => aller(pageIndex - 1)} icone={<ChevronLeft className="icone" />} />
            <Bouton variante="discret" compact aria-label="Page suivante" disabled={pageIndex >= derniere} onClick={() => aller(pageIndex + 1)} icone={<ChevronRight className="icone" />} />
            <Bouton variante="discret" compact aria-label="Dernière page" disabled={pageIndex >= derniere} onClick={() => aller(derniere)} icone={<ChevronsRight className="icone" />} />
        </nav>
    );
}
