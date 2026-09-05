/**
 * Le verrou du moteur navigateur : il y a **une** WebView montee, donc **un** run Act II a la fois.
 *
 * Ce module etait une variable de `ScolariteSession`. Il en est sorti quand les widgets ont commence
 * a partager le moteur, et il gagne aujourd'hui une **priorite** parce que le partage a fini par
 * casser quelque chose de visible.
 *
 * ## Ce qui s'est passe, et qu'il ne faut pas repayer
 *
 * Mesure sur appareil le 2026-08-29, apres l'ajout du rangement automatique du certificat :
 *
 * ```
 * ukit.portail.bordeaux.messagerie : blocked [LOGIN_FAILED]
 * ukit.portail.verification : un run navigateur est deja en cours (ukit.portail.bordeaux.moodle)
 * ukit.portail.verification : un run navigateur est deja en cours (ukit.portail.bordeaux.moodle)
 * ```
 *
 * Deux defauts distincts, et le second existait avant sans se voir :
 *
 *   1. **une session refusee parce qu'un widget occupait le moteur.** La regle d'origine — « une
 *      session qui trouve le moteur pris est une erreur de programmation » — etait vraie quand les
 *      sessions etaient seules a jouer. Elle est devenue fausse le jour ou des lectures d'arriere-plan
 *      ont partage la vue : un etudiant qui appuie sur « Se connecter » se faisait refuser parce
 *      qu'une chronologie Moodle se rafraichissait. **Un geste de l'utilisateur passe toujours
 *      devant une lecture d'arriere-plan** ;
 *   2. **la deconnexion ne passait pas par ce verrou du tout.** Elle appelait le moteur en direct,
 *      donc elle pouvait naviguer la vue partagee vers la page de deconnexion du CAS **pendant**
 *      qu'un widget s'y authentifiait. Le widget voyait alors le panneau d'erreur du CAS et rendait
 *      `LOGIN_FAILED` sur des identifiants parfaitement valides — la pire forme du defaut, une erreur
 *      qui accuse l'utilisateur.
 *
 * ## Les deux priorites
 *
 *   - **`session`** : un geste de l'utilisateur — se connecter, se deconnecter, actualiser son
 *     dossier. Elle **prend la main** : une lecture d'arriere-plan en cours est abandonnee, et le
 *     moteur lui revient. Elle n'est refusee que par **une autre session**, ce qui reste une erreur de
 *     programmation et doit rester bruyant ;
 *   - **`arriere-plan`** : les widgets, le certificat. Elles attendent leur tour et se laissent
 *     interrompre sans rien dire. Un run abandonne rend un echec `cancelled`, deja marque `silent` :
 *     l'ecran garde la derniere valeur connue et la prochaine occasion reessaiera.
 *
 * Abandonner plutot que faire patienter est deliberé : une lecture d'arriere-plan n'a **rien** a
 * rattraper — elle se rejoue au prochain retour au premier plan — alors qu'un geste qui attend vingt
 * secondes derriere un run que personne n'a demande se lit comme une application bloquee.
 *
 * Voir docs/features/scolarite.md.
 */

/** Qui a le droit de passer devant qui. */
export type PrioriteMoteur = 'session' | 'arriere-plan';

interface Reservation {
    readonly nom: string;
    readonly priorite: PrioriteMoteur;
    /** Demande au run en cours de s'arreter. Sans effet sur un run qui ignore son signal. */
    readonly abandonner: () => void;
}

let enCours: Reservation | null = null;

/**
 * Le run en vol, reduit a une promesse qui ne rejette jamais.
 *
 * `catch` des la pose et non au moment d'attendre : une promesse rejetee que personne n'observe
 * encore remonte en rejet non gere, et sur un appareil ca s'affiche a l'ecran en developpement.
 */
let enVol: Promise<unknown> = Promise.resolve();

export type ResultatMoteur<T> =
    | { readonly ok: true; readonly valeur: T }
    | { readonly ok: false; readonly occupePar: string };

/**
 * Ce que le verrou attend d'un signal d'annulation.
 *
 * La forme du moteur (`AbortSignalLike`) plutot que `AbortSignal` : les deux abonnements y sont
 * **facultatifs**, et un `AbortSignal` du navigateur satisfait cette forme. L'exiger complet
 * refuserait les signaux que les appelants passent deja au moteur.
 */
export interface SignalAnnulable {
    readonly aborted: boolean;
    addEventListener?: (type: 'abort', ecouteur: () => void) => void;
    removeEventListener?: (type: 'abort', ecouteur: () => void) => void;
}

export interface OptionsMoteur {
    /** Par defaut `arriere-plan` : ce qui ne le dit pas n'est pas un geste de l'utilisateur. */
    readonly priorite?: PrioriteMoteur;
    /** L'annulation de l'appelant. Elle s'ajoute a celle que le verrou peut declencher. */
    readonly signal?: SignalAnnulable;
}

/**
 * Combien de fois une session retente apres avoir laisse la place a une lecture d'arriere-plan.
 *
 * Une seule tentative ne suffit pas : deux lectures peuvent attendre derriere le meme run, et celle
 * qui se reveille la premiere prendrait le moteur sous le nez de la session. Trois tours couvrent la
 * file reelle — quatre widgets et un certificat n'y sont jamais tous a la fois — sans jamais boucler.
 *
 * Exporte depuis le 2026-09-04 : `fermerSessionDistante` nomme ce chiffre quand elle rapporte
 * qu'elle n'a pas obtenu le moteur, pour qu'un lecteur du journal sache combien elle a insiste.
 */
export const TOURS_DE_SESSION = 3;

/**
 * Pose la reservation **et** lance la tache, sans rendre la main entre les deux.
 *
 * Tout ce corps s'execute jusqu'au premier `await` de `tache` sans repasser par la boucle
 * d'evenements : c'est ce qui garantit qu'aucune autre reservation ne s'intercale entre le test
 * `enCours === null` de l'appelant et la pose ci-dessous.
 */
function reserverEtJouer<T>(
    nom: string,
    priorite: PrioriteMoteur,
    tache: (signal: AbortSignal) => Promise<T>,
    appelant: SignalAnnulable | undefined,
): Promise<T> {
    const controleur = new AbortController();
    const relayer = () => controleur.abort();
    appelant?.addEventListener?.('abort', relayer);
    if (appelant?.aborted === true) controleur.abort();

    enCours = { nom, priorite, abandonner: () => controleur.abort() };
    const promesse = (async () => {
        try {
            return await tache(controleur.signal);
        } finally {
            appelant?.removeEventListener?.('abort', relayer);
            enCours = null;
        }
    })();
    enVol = promesse.catch(() => undefined);
    return promesse;
}

/**
 * Joue *tache* avec le moteur reserve sous *nom*.
 *
 * `tache` recoit un `AbortSignal` : c'est **lui** qu'il faut transmettre au moteur, et non celui de
 * l'appelant. Il porte les deux annulations — celle de l'appelant, et celle qu'une session declenche
 * en prenant la main.
 *
 * ## Pourquoi le test et la reservation sont dans la meme boucle
 *
 * L'attente et la reservation etaient deux etapes separees par un `await` : une session attendait son
 * tour dans `attendreSonTour`, en sortait des qu'elle voyait le moteur libre, **puis** testait
 * `enCours` — un tour de micro-taches plus tard. Une lecture d'arriere-plan qui patientait sur le
 * meme `enVol`, inscrite avant elle donc reveillee avant elle, reservait pendant ce tour ; la session
 * se reveillait sur un moteur repris et rendait `{ ok: false }`.
 *
 * Mesure sur appareil le 2026-09-04 : « Se deconnecter » pendant le rafraichissement des widgets
 * interrompait bien la lecture en cours — la ligne « prend la main » etait la — mais **le Blueprint de
 * deconnexion n'etait jamais joue**, aucune ligne de chrono ne l'attestait, et le widget suivant
 * reussissait a sa place. Le ticket CAS restait valide cote serveur : « Se deconnecter » effacait le
 * trousseau en laissant le navigateur integre authentifie au compte qu'on venait de quitter
 * (docs/defauts-fonctionnels.md).
 *
 * Chaque tour teste **et** reserve dans le meme instant ; une session en fait quatre, une lecture un
 * seul. Rien d'autre ne change de politique.
 */
export async function surLeNavigateur<T>(
    nom: string,
    tache: (signal: AbortSignal) => Promise<T>,
    options: OptionsMoteur = {},
): Promise<ResultatMoteur<T>> {
    const priorite = options.priorite ?? 'arriere-plan';
    // Une lecture d'arriere-plan attend **un** tour : celui du run en vol. Si un autre lui passe
    // devant, elle renonce — elle n'a rien a rattraper et se rejouera. Une session insiste.
    const tours = priorite === 'session' ? TOURS_DE_SESSION : 1;

    for (let tour = 0; tour <= tours; tour += 1) {
        // Le test et la pose, dans le meme tour de boucle d'evenements : c'est la ligne qui ferme la
        // course du 2026-09-04.
        if (enCours === null) {
            return { ok: true, valeur: await reserverEtJouer(nom, priorite, tache, options.signal) };
        }

        const occupant = enCours;
        if (tour === tours) return { ok: false, occupePar: occupant.nom };

        if (priorite === 'arriere-plan') {
            await enVol;
            continue;
        }

        // Face a **une autre session**, une session renonce tout de suite : deux sessions
        // concurrentes restent une erreur de programmation, et l'interrompre masquerait le defaut au
        // lieu de le montrer.
        if (occupant.priorite === 'session') return { ok: false, occupePar: occupant.nom };

        console.log(`[moteur] ${nom} prend la main sur ${occupant.nom}`);
        occupant.abandonner();
        await enVol;
    }

    // Inatteignable : la boucle rend au dernier tour. La ligne existe pour le type de retour.
    return { ok: false, occupePar: runEnCours() ?? nom };
}

/** Le nom du run en cours, pour un message qui nomme le conflit plutot qu'une piece absente. */
export function runEnCours(): string | null {
    return enCours?.nom ?? null;
}
