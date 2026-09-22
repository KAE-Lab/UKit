/**
 * La grammaire de la description d'une annonce : le mini-langage publiable, rendu en arbre.
 *
 * Un paragraphe nu ne donne pas envie d'etre lu, et un simple encadre n'y changeait rien : ce qui
 * aiguille dans le reste de l'application, ce sont les **tetes de section colorees** (l'icone dans
 * son carre teinte des fiches de restaurant et de BU) et les **lignes a puce** des menus. La
 * description parle donc cette langue-la — et comme tout vient du texte publie, un BDE peut
 * structurer et colorer son annonce **sans release**.
 *
 * Ce module est **pur** et partage (jalon 7-F) : l'application le dessine en React Native
 * (`features/Campus/Bde/DescriptionAnnonce.tsx`), la console de pilotage dessine le meme arbre en
 * HTML pour son apercu. Une seule source pour le decoupage, sans quoi l'apercu finirait par montrer
 * une fiche que l'application ne rend pas. Aucun import de plateforme, jamais.
 *
 * ## La grammaire (une ligne = une regle, tout le reste est du texte)
 *
 *   | ligne             | rendu |
 *   |-------------------|-------|
 *   | `# Titre`         | une section : tete coloree, icone par defaut |
 *   | `# icone\|Titre`  | idem, avec l'icone MaterialCommunityIcons nommee (`calendar-check`, `map-marker`…) |
 *   | `- element`       | une puce, rendue comme les plats d'un menu |
 *   | `-- element`      | une sous-puce, indentee, au point plus discret |
 *   | `--- element`     | un troisieme niveau, au tiret — la profondeur s'arrete la |
 *   | `> phrase`        | une exergue : la citation en grand, filet teinte a gauche — le pull-quote de presse |
 *   | `= phrase`        | une transition : la phrase en plus grand sous un court trait teinte — le crosshead |
 *   | `~ nom`           | une signature : alignee a droite, teintee — la fin d'une lettre |
 *   | ligne vide        | separation de paragraphes |
 *
 * Et dans le corps — paragraphes et puces — `**mots**` passent en gras : le seul enrichissement en
 * ligne, pour appuyer un mot sans changer de registre. Une exergue, une transition ou une signature
 * ne portent pas de gras : elles sont deja une emphase.
 *
 * L'article se clot sur une marque de fin (le point teinte des colonnes de presse) — sauf quand une
 * signature termine le texte : un nom qui signe est deja une fin, deux marqueurs se disputeraient
 * la derniere ligne. Cette regle est de la **structure**, pas du dessin : l'arbre la porte.
 *
 * Une icone inconnue rend le glyphe `?` de la famille — visible a la relecture de l'annonce, donc
 * corrigeable a la publication, jamais un plantage.
 *
 * ## Une annonce, une couleur
 *
 * Toutes les tetes prennent la couleur d'identite de l'annonce (`couleur` en base) — celle de
 * l'accroche et de l'affiche typographique. Le **cycle** de palette a ete essaye et defait
 * (2026-08-31) : sur une annonce longue il balayait la palette entiere, sept sections sept couleurs,
 * et le rouge — la couleur de danger de l'application — tombait sur des contenus neutres. L'index 4
 * reste interdit, comme partout : il duplique le 0 en theme sombre.
 *
 * ## Le texte se pose sur le fond, pas dans des cartes
 *
 * La carte grise autour de chaque contenu de section a ete essayee et defaite (2026-08-31) : sur
 * une annonce longue, l'empilement de rectangles bordes se lisait comme un tableau de bord de
 * widgets, pas comme un texte. Les tetes colorees suffisent a structurer — c'est une page qui se
 * lit, la grammaire est celle d'un article.
 *
 * Voir docs/features/campus-vie-etudiante.md.
 */

/**
 * Les index utilisables de `sectionsHeaders`. Le 4 en est absent depuis qu'il doublait le 0 en sombre
 * (coquille corrigee en 6.1-C) ; la palette n'est pas rejouee apres coup, une annonce garde sa teinte.
 */
export const PALETTE: readonly number[] = [0, 1, 2, 3, 5];

/** L'icone d'une tete de section qui n'en nomme pas. */
export const ICONE_PAR_DEFAUT = 'text-box-outline';

export type NiveauDePuce = 1 | 2 | 3;

export type ElementDeBloc =
    | { readonly type: 'paragraphe'; readonly texte: string }
    | { readonly type: 'puce'; readonly texte: string; readonly niveau: NiveauDePuce }
    | { readonly type: 'exergue'; readonly texte: string }
    | { readonly type: 'transition'; readonly texte: string }
    | { readonly type: 'signature'; readonly texte: string };

export interface BlocAnnonce {
    readonly titre: string | null;
    readonly icone: string | null;
    readonly contenu: readonly ElementDeBloc[];
}

/** Un segment de texte de corps : en gras, ou non. */
export interface SegmentDeTexte {
    readonly gras: boolean;
    readonly texte: string;
}

/** Ce qu'un moteur de rendu recoit : les blocs, et si la marque de fin doit s'effacer. */
export interface ArbreDeDescription {
    readonly blocs: readonly BlocAnnonce[];
    /** Une signature clot le texte : la marque de fin s'efface devant elle. */
    readonly signatureClot: boolean;
}

/** La couleur des sections : l'identite de l'annonce, validee contre la palette (4 interdit). */
export function couleurDIdentite(depart: number | undefined): number {
    return depart !== undefined && PALETTE.includes(depart) ? depart : 0;
}

/** `icone|Titre` ou `Titre` seul : le pipe separe, il ne s'ecrit pas dans un intitule. */
export function lireTitre(brut: string): { readonly titre: string; readonly icone: string | null } {
    const separateur = brut.indexOf('|');
    if (separateur === -1) return { titre: brut.trim(), icone: null };
    return { titre: brut.slice(separateur + 1).trim(), icone: brut.slice(0, separateur).trim() || null };
}

/** Les regles a prefixe simple — une ligne, un type. Les titres et les puces ont leur analyse. */
const REGLES_DE_LIGNE = [
    { prefixe: '> ', type: 'exergue' },
    { prefixe: '= ', type: 'transition' },
    { prefixe: '~ ', type: 'signature' },
] as const;

type RegleDeLigne = (typeof REGLES_DE_LIGNE)[number];

function regleDeLigne(ligne: string): RegleDeLigne | null {
    return REGLES_DE_LIGNE.find((regle) => ligne.startsWith(regle.prefixe)) ?? null;
}

/** Le nombre de tirets fait la profondeur — le plus long se teste en premier. */
function niveauDePuce(ligne: string): NiveauDePuce | null {
    if (ligne.startsWith('--- ')) return 3;
    if (ligne.startsWith('-- ')) return 2;
    if (ligne.startsWith('- ')) return 1;
    return null;
}

interface BlocEnCours {
    titre: string | null;
    icone: string | null;
    contenu: ElementDeBloc[];
}

/**
 * Decoupe la description en blocs. Le tampon de paragraphe se vide a chaque puce, ligne vide, titre
 * ou fin — c'est ce qui permet de melanger librement paragraphes et puces dans une meme section.
 * Le premier bloc n'a pas de titre : c'est le lead, quand il a un contenu.
 */
export function decouperEnBlocs(texte: string): BlocAnnonce[] {
    const blocs: BlocEnCours[] = [];
    let courant: BlocEnCours = { titre: null, icone: null, contenu: [] };
    blocs.push(courant);
    let tampon: string[] = [];

    const vider = () => {
        const paragraphe = tampon.join('\n').trim();
        if (paragraphe !== '') courant.contenu.push({ type: 'paragraphe', texte: paragraphe });
        tampon = [];
    };

    for (const ligne of texte.split('\n')) {
        const niveau = niveauDePuce(ligne);
        const regle = regleDeLigne(ligne);
        if (ligne.startsWith('# ')) {
            vider();
            courant = { ...lireTitre(ligne.slice(2)), contenu: [] };
            blocs.push(courant);
        } else if (niveau !== null) {
            vider();
            const puce = ligne.slice(niveau + 1).trim();
            if (puce !== '') courant.contenu.push({ type: 'puce', texte: puce, niveau });
        } else if (regle !== null) {
            vider();
            const contenu = ligne.slice(regle.prefixe.length).trim();
            if (contenu !== '') courant.contenu.push({ type: regle.type, texte: contenu });
        } else if (ligne.trim() === '') {
            vider();
        } else {
            tampon.push(ligne);
        }
    }
    vider();

    return blocs.filter((bloc) => bloc.titre !== null || bloc.contenu.length > 0);
}

/**
 * Le gras en ligne : `**mots**` dans un texte de corps. Non gourmand : deux marqueurs ne se
 * cherchent pas a travers un paragraphe entier.
 */
export function segmentsDeTexte(texte: string): SegmentDeTexte[] {
    const segments: SegmentDeTexte[] = [];
    const motif = /\*\*(.+?)\*\*/g;
    let curseur = 0;
    for (let trouve = motif.exec(texte); trouve !== null; trouve = motif.exec(texte)) {
        if (trouve.index > curseur) segments.push({ gras: false, texte: texte.slice(curseur, trouve.index) });
        segments.push({ gras: true, texte: trouve[1] ?? '' });
        curseur = trouve.index + trouve[0].length;
    }
    if (curseur < texte.length) segments.push({ gras: false, texte: texte.slice(curseur) });
    return segments;
}

/** Le premier bloc sans titre est le lead : le paragraphe d'ouverture, en plus grand que le corps. */
export function estLeLead(index: number, bloc: BlocAnnonce): boolean {
    return index === 0 && bloc.titre === null;
}

/** Le bloc qui porte la signature est le pied de la lettre : une surface unique par annonce. */
export function porteLaSignature(bloc: BlocAnnonce): boolean {
    return bloc.contenu.some((element) => element.type === 'signature');
}

/** L'arbre complet : les blocs, et la regle de la marque de fin. */
export function arbreDeDescription(texte: string): ArbreDeDescription {
    const blocs = decouperEnBlocs(texte);
    const dernierBloc = blocs[blocs.length - 1];
    const dernierElement = dernierBloc?.contenu[dernierBloc.contenu.length - 1];
    return { blocs, signatureClot: dernierElement?.type === 'signature' };
}
