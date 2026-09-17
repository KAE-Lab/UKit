/**
 * Le formulaire de retours s'ouvre dans le navigateur integre, et un lien qu'il porte — la page
 * d'engagement du chantier campus — doit s'ouvrir **par-dessus**, dans une seconde instance du
 * navigateur, pas a la place du formulaire.
 *
 * Sans ca, le lien remplace le formulaire dans la vue, et « retour » recharge Google Forms, qui
 * repart de zero : une personne qui va lire la page d'engagement perd ce qu'elle a ecrit (mesure le
 * 2026-09-07). Avec, le formulaire reste monte en dessous, et « retour » le retrouve la ou il en
 * etait. La regle est par domaines, et non par type de navigation, parce qu'Android ne sait pas
 * distinguer un clic d'une redirection : la vue garde ce qui est chez Google — `forms.gle` redirige
 * vers `docs.google.com`, et le formulaire charge ses ressources chez `gstatic.com` —, et empile
 * tout autre domaine. Les portails universitaires ne posent pas ce parametre : eux changent de
 * domaine legitimement, du CAS a l'ENT, et gardent leur comportement.
 *
 * **Le redirecteur de Google est defait avant que la regle s'applique**, et c'est ce qui manquait.
 * Google Forms ne pose jamais l'adresse ecrite dans le formulaire : il la remplace par
 * `https://www.google.com/url?q=<adresse>&sa=D...`, qui est chez `google.com` — donc « interne »
 * pour une regle qui ne regarde que l'hote. La vue du formulaire naviguait alors vers le
 * redirecteur, qui la renvoyait aussitot dehors : le formulaire etait perdu **avant** que la regle
 * ait eu son mot a dire, et « retour » le rechargeait vide. On lit donc la destination reelle
 * d'abord, et c'est elle qu'on juge (mesure le 2026-09-08 sur iPhone et sur Android).
 *
 * **Le formulaire est pre-rempli depuis 7-C.** Le catalogue publie l'adresse longue du formulaire en
 * gabarit — `?usp=pp_url&entry.408146347={onglet}&…` — et `remplirGabarit` y met ce que l'application
 * sait : l'onglet d'ou l'on vient, l'appareil, le systeme, la version. Les numeros d'entree vivent
 * dans le catalogue, pas ici : un numero change quand une question est supprimee puis recreee, et
 * ecrit dans le binaire il demanderait une release.
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

export type ValeursDuGabarit = Readonly<Record<string, string | null | undefined>>;

/** Un parametre de requete dont la valeur entiere est `{cle}` : le seul qui soit un gabarit. */
const PARAMETRE_GABARIT = /^\{(\w+)\}$/;

/**
 * Remplit un gabarit d'adresse : chaque `{cle}` d'un parametre de requete devient sa valeur encodee ;
 * un parametre dont la valeur manque est retire en entier — pas de `&` orphelin, pas de champ vide
 * envoye a Google — ; tout autre parametre est recopie tel quel, et un gabarit sans accolade reste
 * intact. Manipulation de chaines, pas de `URL` : le module se joue sous Node comme sous Hermes.
 */
export function remplirGabarit(gabarit: string, valeurs: ValeursDuGabarit): string {
    const debut = gabarit.indexOf('?');
    if (debut < 0) return gabarit;
    const fin = gabarit.indexOf('#', debut);
    const requete = fin < 0 ? gabarit.slice(debut + 1) : gabarit.slice(debut + 1, fin);
    const fragment = fin < 0 ? '' : gabarit.slice(fin);

    const couples: string[] = [];
    for (const couple of requete.split('&')) {
        const separateur = couple.indexOf('=');
        const cle = separateur < 0 ? undefined : PARAMETRE_GABARIT.exec(couple.slice(separateur + 1))?.[1];
        if (cle === undefined) {
            if (couple !== '') couples.push(couple);
            continue;
        }
        const valeur = valeurs[cle];
        if (typeof valeur !== 'string' || valeur === '') continue;
        couples.push(`${couple.slice(0, separateur)}=${encodeURIComponent(valeur)}`);
    }
    return gabarit.slice(0, debut) + (couples.length === 0 ? '' : `?${couples.join('&')}`) + fragment;
}

/** Le redirecteur de Google : `/url` chez `google.com`, la destination dans `q` ou dans `url`. */
const REDIRECTEUR = /^https?:\/\/(?:[^/:?#]*\.)?google\.[^/:?#]+\/url\?/i;

/**
 * La destination reelle d'une adresse : celle qu'un redirecteur transporte, ou l'adresse elle-meme.
 *
 * Elle ne suit qu'un seul saut et ne reconnait que le redirecteur de Google : deviner qu'une adresse
 * quelconque en enveloppe une autre ouvrirait la porte a des redirections imaginees. Un parametre
 * illisible ou qui n'est pas une adresse `http` rend l'adresse d'origine — mieux vaut juger le
 * redirecteur que de suivre n'importe quoi.
 */
export function destinationReelle(url: string): string {
    if (!REDIRECTEUR.test(url)) return url;
    const requete = url.slice(url.indexOf('?') + 1);
    for (const couple of requete.split('&')) {
        const separateur = couple.indexOf('=');
        if (separateur < 0) continue;
        const nom = couple.slice(0, separateur);
        if (nom !== 'q' && nom !== 'url') continue;
        try {
            const valeur = decodeURIComponent(couple.slice(separateur + 1).replace(/\+/g, ' '));
            if (/^https?:\/\//i.test(valeur)) return valeur;
        } catch {
            // Un pourcentage mal forme : on garde le redirecteur, qui est un domaine connu.
        }
    }
    return url;
}

/**
 * Une adresse reste-t-elle dans la vue ? Oui si l'hote de sa **destination reelle** est l'un des
 * domaines, ou un sous-domaine de l'un d'eux ; sinon elle s'ouvre par-dessus. Une adresse sans hote
 * lisible reste : la vue sait deja quoi faire d'`about:blank`.
 */
export function resteDansLaVue(url: string, domaines: readonly string[]): boolean {
    const hote = HOTE.exec(destinationReelle(url))?.[1]?.toLowerCase();
    if (hote === undefined) return true;
    return domaines.some((domaine) => hote === domaine || hote.endsWith(`.${domaine}`));
}
