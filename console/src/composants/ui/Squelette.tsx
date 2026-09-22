/**
 * Les squelettes : la forme de ce qu'on attend, a sa hauteur. Une liste qui charge montre des
 * lignes ; une carte, des blocs. Rien ne saute quand le contenu arrive.
 */

export function SqueletteTexte({ largeur = '60%' }: { readonly largeur?: string }) {
    return <div className="squelette texte" style={{ width: largeur }} aria-hidden="true" />;
}

export function SqueletteBloc({ hauteur = 96 }: { readonly hauteur?: number }) {
    return <div className="squelette bloc" style={{ height: hauteur }} aria-hidden="true" />;
}

/** Des lignes de tableau squelettes, dans le corps d'une table qui a deja son en-tete. */
export function SqueletteDeLignes({ lignes, colonnes }: { readonly lignes: number; readonly colonnes: number }) {
    return (
        <tbody aria-busy="true" aria-label="Lecture en cours">
            {Array.from({ length: lignes }, (_, i) => (
                <tr key={i}>
                    {Array.from({ length: colonnes }, (_, j) => (
                        <td key={j}><div className="squelette" style={{ width: `${45 + ((i * 7 + j * 13) % 40)}%` }} /></td>
                    ))}
                </tr>
            ))}
        </tbody>
    );
}
