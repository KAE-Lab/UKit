/**
 * Le formulaire de retours s'ouvre dans le navigateur integre, et un lien qu'il porte — la page
 * d'engagement du chantier campus — doit s'ouvrir **dehors**, dans le navigateur du telephone.
 *
 * Sans ca, le lien remplace le formulaire dans la vue, et « retour » recharge Google Forms, qui
 * repart de zero : une personne qui va lire la page d'engagement perd ce qu'elle a ecrit (mesure le
 * 2026-09-07). La regle est par domaines, et non par type de navigation, parce qu'Android ne sait
 * pas distinguer un clic d'une redirection : la vue garde ce qui est chez Google — `forms.gle`
 * redirige vers `docs.google.com`, et le formulaire charge ses ressources chez `gstatic.com` —, et
 * confie tout autre domaine au systeme. Les portails universitaires ne posent pas ce parametre :
 * eux changent de domaine legitimement, du CAS a l'ENT, et gardent leur comportement.
 */

/** Les domaines qui restent dans la vue quand le formulaire est ouvert. */
export const DOMAINES_DU_FORMULAIRE: readonly string[] = ['google.com', 'forms.gle', 'gstatic.com', 'googleusercontent.com'];

export interface ParametresDuFormulaire {
    readonly href: string;
    readonly domainesInternes: readonly string[];
}

/** Les parametres de la route `WebBrowser` pour ouvrir le formulaire — les trois appelants passent ici. */
export function parametresDuFormulaire(href: string): ParametresDuFormulaire {
    return { href, domainesInternes: DOMAINES_DU_FORMULAIRE };
}

const HOTE = /^https?:\/\/([^/:?#]+)/i;

/**
 * Une adresse reste-t-elle dans la vue ? Oui si son hote est l'un des domaines, ou un sous-domaine
 * de l'un d'eux. Une adresse sans hote lisible reste : la vue sait deja quoi faire d'`about:blank`.
 */
export function resteDansLaVue(url: string, domaines: readonly string[]): boolean {
    const hote = HOTE.exec(url)?.[1]?.toLowerCase();
    if (hote === undefined) return true;
    return domaines.some((domaine) => hote === domaine || hote.endsWith(`.${domaine}`));
}
