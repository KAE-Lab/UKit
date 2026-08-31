/**
 * La memoire des carrousels de cours superposes : quel cours l'etudiant a laisse sous ses yeux.
 *
 * Deux decisions la rendent solide, et elles se testent ici parce qu'elles sont pures :
 *
 * **La cle est canonique et sans date.** Elle se construit de l'heure de debut et de la liste
 * TRIEE des matieres du groupe — pas du premier cours servi : l'ordre d'arrivee du serveur peut
 * changer d'un jour a l'autre, et une cle qui en dependait faisait perdre le souvenir. Sans date,
 * le choix se **projette** sur tous les jours au meme creneau avec les memes matieres — le TD
 * choisi le lundi vaut pour tous les lundis, et pour le jeudi identique.
 *
 * **Le souvenir est une empreinte du cours choisi, pas un rang.** Un rang pointait un autre cours
 * des que l'ordre changeait. Et la matiere seule ne suffit pas : deux TD paralleles d'une meme UE
 * portent le MEME intitule — memorise par matiere, le choix retombait toujours sur le premier des
 * deux, un faux « etat de base » que plus aucun swipe ne pouvait deplacer (constate sur appareil
 * le 2026-08-31). L'empreinte ajoute la description (groupe de TD, enseignant) ; elle se cherche
 * en deux temps — exacte d'abord, matiere seule en repli, parce qu'une description peut bouger
 * d'un jour a l'autre (la salle y vit) — et sans correspondance, le premier cours.
 */

export interface CoursDeGroupe {
    readonly starttime: string;
    readonly subject: string;
    readonly description?: string;
}

export function cleDeGroupe(groupe: readonly CoursDeGroupe[]): string {
    const matieres = groupe.map((cours) => cours.subject).slice().sort().join(';');
    return `${groupe[0]?.starttime ?? ''}|${matieres}`;
}

export function empreinteDeCours(cours: CoursDeGroupe): string {
    return `${cours.subject}|${cours.description ?? ''}`;
}

export function indexDuSouvenir(groupe: readonly CoursDeGroupe[], souvenir: string | undefined): number {
    if (souvenir === undefined) return 0;
    const exact = groupe.findIndex((cours) => empreinteDeCours(cours) === souvenir);
    if (exact !== -1) return exact;
    const matiere = souvenir.split('|')[0];
    const parMatiere = groupe.findIndex((cours) => cours.subject === matiere);
    return parMatiere === -1 ? 0 : parMatiere;
}
