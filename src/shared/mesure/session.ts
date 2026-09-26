/**
 * Une session de mesure : ce qu'une ouverture de l'application — ou un vrai retour au premier plan —
 * commence, et ce qu'elle dedoublonne.
 *
 * Une impression d'annonce se compte une fois par session : deux passages devant la meme carte n'en
 * font qu'une (docs/mesure.md). La session ne porte rien d'autre — ni duree, ni parcours : relier deux
 * instants du meme appareil est precisement ce que la mesure refuse.
 *
 * Pur : la couture (index.ts) decide quand une session commence.
 */

export interface Session {
    /** Les annonces dont l'impression a deja ete comptee dans cette session. */
    readonly impressions: Set<string>;
}

export function nouvelleSession(): Session {
    return { impressions: new Set() };
}

/** Les identifiants pas encore vus dans la session, marques au passage ; sans doublon, dans l'ordre recu. */
export function impressionsNouvelles(session: Session, ids: readonly string[]): string[] {
    const nouvelles: string[] = [];
    for (const id of ids) {
        if (session.impressions.has(id)) continue;
        session.impressions.add(id);
        nouvelles.push(id);
    }
    return nouvelles;
}
