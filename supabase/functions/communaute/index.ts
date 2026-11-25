/**
 * La fonction des contributions de la communaute (phase 8, lot 1 de la 7.0) : la seule porte par
 * laquelle l'application ecrit un signalement ou un vote (docs/phase-8/1-base-communautaire.md).
 *
 * Cinq actions, toutes en POST, appelees avec la cle publiable :
 *   - `defi` rend un defi frais, signe par la fonction, que rien ne garde ;
 *   - `enregistrer` verifie l'attestation App Attest d'une cle (iOS) et l'enregistre ;
 *   - `contribuer` verifie ce que l'appareil a signe — l'assertion App Attest, ou le verdict Play
 *     Integrity dechiffre par Google — puis appelle `public.contribuer` avec la cle de service, qui
 *     juge les plafonds, le vocabulaire et le poids. Une contribution sans attestation passe, sous un
 *     plafond bas et sans jamais compter : l'attestation decide du poids, pas de l'acces ;
 *   - `deposer` (lot 3) fait de meme pour un retour natif, puis `public.deposer_retour`, et rend une URL
 *     de televersement signee par capture annoncee (docs/phase-8/3-formulaire.md) ;
 *   - `purger` efface les captures que la base designe (`public.captures_a_purger`), par l'API de
 *     stockage ; la tache horaire de la base l'appelle quand il y en a.
 *
 * La passerelle ne verifie pas de JWT (`verify_jwt = false`, config.toml) : la cle publiable n'en est
 * pas un, et la verifier n'ajouterait rien — elle est dans chaque binaire. La securite de cette porte
 * est l'attestation, le defi et les plafonds de la base. Aucune adresse, aucun secret, aucun jeton
 * n'est ecrit dans un journal : seulement les raisons d'un refus.
 *
 * Secrets de la fonction : `COMMUNAUTE_SECRET` (obligatoire : les defis et les empreintes d'adresse),
 * `APPLE_EQUIPE` (l'identifiant d'equipe, sans lequel aucune cle App Attest ne s'enregistre),
 * `PLAY_INTEGRITY_COMPTE_DE_SERVICE` (le JSON du compte de service, sans lequel Android reste non
 * atteste). `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` viennent de la plateforme.
 *
 *     npx --yes supabase@2.117.0 functions deploy communaute --project-ref <ref> --use-api --no-verify-jwt
 */

import { reponse, service } from '../_shared/index.ts';
import { RefusAppAttest, verifierAssertion, verifierAttestation } from './appattest.ts';
import { dechiffrerLeJeton, jetonDAcces, lireCompteDeService, type Transport } from './google.ts';
import {
    adresseDuClient, clesDeLaFonction, depuisBase64, depuisHexPostgres, egaux, empreinteDAdresse, empreinteDeDemande, evaluerVerdict,
    jetonDeVote, jourDeParis, LIMITES, lireDefi, lireDemande, lireDonnees, nouveauDefi, sha256, statutDuRefus, utf8, versHex,
    type Demande, type Plateforme,
} from './regles.ts';
import { cheminDeCapture, lireDonneesDeRetour, masquer } from './retours.ts';

/** Le paquet du store : le seul que Google Play reconnait, donc le seul qu'un verdict peut attester. */
const PAQUET_ANDROID = 'com.bordeaux1.emplois';
/** L'application du store et le build de developpement, que seule l'equipe peut signer. */
const BUNDLES_IOS = ['com.bordeaux.ukit', 'com.bordeaux.ukit.dev'];

const CLES = await clesDeLaFonction(Deno.env.get('COMMUNAUTE_SECRET'));
const EQUIPE = (Deno.env.get('APPLE_EQUIPE') ?? '').trim();
const APPLICATIONS = /^[A-Z0-9]{10}$/.test(EQUIPE) ? BUNDLES_IOS.map((bundle) => `${EQUIPE}.${bundle}`) : [];
const COMPTE_GOOGLE = lireCompteDeService(Deno.env.get('PLAY_INTEGRITY_COMPTE_DE_SERVICE'));

const transport: Transport = (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });

type Contribuer = Extract<Demande, { action: 'contribuer' }>;
type Deposer = Extract<Demande, { action: 'deposer' }>;
type Enregistrer = Extract<Demande, { action: 'enregistrer' }>;
/** L'espace prive des captures (migration 20261125040000_retours_natifs.sql). */
const ESPACE_DES_CAPTURES = 'retours';
interface ResultatSql { readonly statut: string; readonly raison?: string; readonly [cle: string]: unknown }

function refuser(raison: string): Response {
    return reponse(statutDuRefus(raison), { statut: 'refusee', raison });
}

function indisponible(raison: string): Response {
    return reponse(503, { statut: 'indisponible', raison });
}

function message(erreur: unknown): string {
    return erreur instanceof Error ? erreur.message : String(erreur);
}

async function empreinteDeLaDemande(cleIp: Uint8Array<ArrayBuffer>, req: Request, maintenant: number): Promise<string> {
    return versHex(await empreinteDAdresse(cleIp, adresseDuClient(req.headers), jourDeParis(new Date(maintenant))));
}

interface Admission {
    readonly admis: boolean;
    /** Un jeton Play Integrity peut partir chez Google : le plafond des verdicts de l'adresse le permet. */
    readonly verdict: boolean;
}

/**
 * L'appel d'une porte de la base. Un interblocage (40P01) se rejoue une fois : deux contributions
 * simultanees qui se confirment l'une l'autre verrouillent les deux appareils dans l'ordre inverse, et
 * Postgres en annule une — entierement, compteur compris, donc la rejouer telle quelle est sur.
 */
async function appelerLaBase(fonction: 'admettre' | 'enregistrer_appareil' | 'contribuer' | 'deposer_retour', p: Record<string, unknown>): Promise<ResultatSql> {
    for (let essai = 0; ; essai++) {
        const { data, error } = await service().rpc(fonction, { p });
        if (error === null) return data as ResultatSql;
        if (error.code !== '40P01' || essai > 0) throw new Error(`${fonction} : ${error.message}`);
    }
}

/** L'adresse comptee, avant tout le reste et avant Google (`public.admettre`). */
async function admettre(empreinte: string, verdict: boolean): Promise<Admission> {
    const r = await appelerLaBase('admettre', { empreinte_ip: empreinte, verdict });
    return { admis: r.admis === true, verdict: r.verdict === true };
}

async function enregistrer(d: Enregistrer, req: Request, maintenant: number): Promise<Response> {
    if (CLES === null) return indisponible('non_configuree');
    if (APPLICATIONS.length === 0) return indisponible('app_attest_non_configure');
    if (await lireDefi(CLES.defi, d.defi, maintenant) !== 'valide') return refuser('defi');
    if (!(await admettre(await empreinteDeLaDemande(CLES.ip, req, maintenant), false)).admis) return refuser('plafond_ip');
    let verifiee: Awaited<ReturnType<typeof verifierAttestation>>;
    try {
        verifiee = await verifierAttestation({ attestation: d.attestation, clientData: utf8(d.defi), cle: d.cle, applications: APPLICATIONS, maintenant: new Date(maintenant) });
    } catch (erreur) {
        if (!(erreur instanceof RefusAppAttest)) throw erreur;
        console.warn(`[communaute] attestation refusee : ${erreur.raison}`);
        return refuser('attestation');
    }
    const r = await appelerLaBase('enregistrer_appareil', {
        cle: versHex(d.cle),
        cle_publique: versHex(verifiee.clePublique),
        environnement: verifiee.environnement,
    });
    if (r.statut === 'refusee') return refuser(r.raison ?? 'refusee');
    return reponse(200, { statut: r.statut, environnement: verifiee.environnement });
}

/** Le verdict d'un jeton Play Integrity ; Google injoignable vaut « non atteste », jamais un refus. */
async function verdictAndroid(jeton: string, donnees: string, maintenant: number): Promise<boolean> {
    if (COMPTE_GOOGLE === null) return false;
    try {
        const acces = await jetonDAcces(COMPTE_GOOGLE, maintenant, transport);
        const dechiffre = await dechiffrerLeJeton(PAQUET_ANDROID, jeton, acces, transport);
        const verdict = evaluerVerdict(dechiffre, { paquet: PAQUET_ANDROID, requestHash: await empreinteDeDemande(donnees), maintenantMs: maintenant });
        if (!verdict.atteste) console.warn(`[communaute] verdict Play Integrity : ${verdict.raison}`);
        return verdict.atteste;
    } catch (erreur) {
        console.warn(`[communaute] Play Integrity injoignable : ${message(erreur)}`);
        return false;
    }
}

/** Ce que la preuve d'un appareil etablit : de quoi appeler une porte de la base. */
interface Prouve {
    readonly cle: Uint8Array<ArrayBuffer>;
    readonly atteste: boolean;
    readonly compteur: number | null;
    readonly plateforme: Plateforme;
    readonly empreinte: string;
}

/**
 * La moitie commune a une contribution et a un retour : le defi, le lien entre la cle annoncee et le
 * texte signe, l'adresse comptee, puis la preuve — l'assertion App Attest, ou le verdict Play Integrity.
 */
async function prouver(d: Contribuer | Deposer, defi: string, cleSignee: Uint8Array, req: Request, maintenant: number): Promise<Prouve | Response> {
    if (CLES === null) return indisponible('non_configuree');
    if (await lireDefi(CLES.defi, defi, maintenant) !== 'valide') return refuser('defi');

    // La cle serveur, et son lien avec ce qui a ete signe ou fait attester : une preuve ne se
    // transporte pas d'un appareil a un autre.
    const cle = d.appareil.nature === 'app_attest' ? d.appareil.cle : await sha256(d.appareil.secret);
    if (!egaux(cle, cleSignee)) return refuser('cle');

    // L'adresse, comptee avant toute verification couteuse : un jeton Play Integrity ne part chez
    // Google que si le plafond des verdicts de l'adresse le permet — le quota est celui du parc.
    const empreinte = await empreinteDeLaDemande(CLES.ip, req, maintenant);
    const jeton = d.appareil.nature === 'secret' && d.appareil.plateforme === 'android' && d.preuve !== null && 'jeton' in d.preuve
        ? d.preuve.jeton : null;
    const admission = await admettre(empreinte, jeton !== null && COMPTE_GOOGLE !== null);
    if (!admission.admis) return refuser('plafond_ip');

    if (d.appareil.nature === 'secret') {
        const atteste = jeton !== null && admission.verdict ? await verdictAndroid(jeton, d.donnees, maintenant) : false;
        return { cle, atteste, compteur: null, plateforme: d.appareil.plateforme, empreinte };
    }
    if (APPLICATIONS.length === 0) return indisponible('app_attest_non_configure');
    const preuve = d.preuve as { assertion: Uint8Array<ArrayBuffer> };
    const { data: ligne, error } = await service().from('appareils')
        .select('cle_publique, compteur').eq('cle', `\\x${versHex(cle)}`).eq('nature', 'app_attest').maybeSingle();
    if (error !== null) throw new Error(`appareils : ${error.message}`);
    const clePublique = depuisHexPostgres(ligne?.cle_publique);
    if (ligne === null || clePublique === null) return refuser('appareil_inconnu');
    try {
        const { compteur } = await verifierAssertion({
            assertion: preuve.assertion, clientData: utf8(d.donnees), clePublique, applications: APPLICATIONS, compteurConnu: Number(ligne.compteur),
        });
        return { cle, atteste: true, compteur, plateforme: 'ios', empreinte };
    } catch (erreur) {
        if (!(erreur instanceof RefusAppAttest)) throw erreur;
        console.warn(`[communaute] assertion refusee : ${erreur.raison}`);
        return refuser(erreur.raison === 'compteur' ? 'compteur_rejoue' : 'assertion');
    }
}

async function contribuer(d: Contribuer, req: Request, maintenant: number): Promise<Response> {
    if (CLES === null) return indisponible('non_configuree');
    const lues = lireDonnees(d.donnees);
    if (lues.ok === false) return refuser(lues.raison);
    const donnees = lues.valeur;
    const prouve = await prouver(d, donnees.defi, donnees.cle, req, maintenant);
    if (prouve instanceof Response) return prouve;

    const r = await appelerLaBase('contribuer', {
        appareil: { cle: versHex(prouve.cle), nature: d.appareil.nature, plateforme: prouve.plateforme, atteste: prouve.atteste, compteur: prouve.compteur },
        empreinte_ip: prouve.empreinte,
        jeton_de_vote: versHex(await jetonDeVote(CLES.vote, prouve.cle, donnees.contribution.sujet, donnees.contribution.cible)),
        contribution: donnees.contribution,
        essai: donnees.essai,
    });
    if (r.statut === 'refusee') return refuser(r.raison ?? 'refusee');
    return reponse(200, { ...r, atteste: prouve.atteste });
}

/**
 * Un retour : la preuve comme pour une contribution, le texte masque, la ligne ecrite par la base, puis
 * une URL de televersement signee par capture annoncee — l'appareil y depose ses JPEG, l'espace reste
 * illisible a tout autre que les admins. Une URL qui ne se cree pas laisse le retour arrive, sans elle.
 */
async function deposer(d: Deposer, req: Request, maintenant: number): Promise<Response> {
    if (CLES === null) return indisponible('non_configuree');
    const lues = lireDonneesDeRetour(d.donnees);
    if (lues.ok === false) return refuser(lues.raison);
    const { defi, retour } = lues.valeur;
    const cleSignee = depuisBase64(lues.valeur.cle);
    if (cleSignee === null || cleSignee.length !== 32) return refuser('donnees');
    const prouve = await prouver(d, defi, cleSignee, req, maintenant);
    if (prouve instanceof Response) return prouve;

    const r = await appelerLaBase('deposer_retour', {
        appareil: { cle: versHex(prouve.cle), nature: d.appareil.nature, plateforme: prouve.plateforme, atteste: prouve.atteste, compteur: prouve.compteur },
        empreinte_ip: prouve.empreinte,
        // Le jeton du jour de l'appareil : son plafond de retours, sans que le retour porte sa cle.
        jeton: versHex(await jetonDeVote(CLES.vote, prouve.cle, 'retour', jourDeParis(new Date(maintenant)))),
        retour: {
            depot: retour.depot, nature: retour.nature, texte: masquer(retour.texte), campus: retour.campus, volontaire: retour.volontaire,
            contact: retour.contact, probleme: retour.probleme, idee: retour.idee, contexte: retour.contexte, captures: retour.captures,
            cle_reponse: retour.cleReponse,
        },
    });
    if (r.statut === 'refusee') return refuser(r.raison ?? 'refusee');
    const id = typeof r.id === 'string' ? r.id : '';
    // Le nombre que la base a garde : un depot rejoue rend les URL de son premier depot, et une capture
    // deja arrivee se remplace (`upsert`), le temps de l'URL, par celui qui la detient seul.
    const captures = typeof r.captures === 'number' ? r.captures : retour.captures;
    const envois: { chemin: string; jeton: string }[] = [];
    for (let rang = 1; rang <= captures && id !== ''; rang++) {
        const { data, error } = await service().storage.from(ESPACE_DES_CAPTURES).createSignedUploadUrl(cheminDeCapture(id, rang), { upsert: true });
        if (error !== null || data === null) {
            console.warn(`[communaute] URL de capture non creee : ${error?.message ?? 'vide'}`);
            continue;
        }
        envois.push({ chemin: data.path, jeton: data.token });
    }
    return reponse(200, { statut: 'acceptee', atteste: prouve.atteste, envois });
}

/**
 * Les captures dues, effacees par l'API de stockage, dossier par dossier, puis marquees. Un dossier
 * qui echoue reste du, et repart a l'heure suivante.
 */
async function purger(req: Request, maintenant: number): Promise<Response> {
    // Publique — la tache horaire de la base l'appelle sans secret —, elle compte l'adresse comme le
    // reste : un appel en boucle bute sur le plafond de l'adresse, et ne lance pas les listages du stockage.
    if (CLES === null) return indisponible('non_configuree');
    if (!(await admettre(await empreinteDeLaDemande(CLES.ip, req, maintenant), false)).admis) return refuser('plafond_ip');
    const base = service();
    const { data: ids, error } = await base.rpc('captures_a_purger');
    if (error !== null) throw new Error(`captures_a_purger : ${error.message}`);
    const purges: string[] = [];
    for (const id of (Array.isArray(ids) ? ids : []) as unknown[]) {
        if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) continue;
        const espace = base.storage.from(ESPACE_DES_CAPTURES);
        const { data: fichiers, error: erreurDeListe } = await espace.list(id);
        if (erreurDeListe !== null) continue;
        const chemins = (fichiers ?? []).map((f) => `${id}/${f.name}`);
        if (chemins.length > 0 && (await espace.remove(chemins)).error !== null) continue;
        purges.push(id);
    }
    if (purges.length > 0) {
        const { error: erreurDeMarque } = await base.rpc('captures_purgees', { p_ids: purges });
        if (erreurDeMarque !== null) throw new Error(`captures_purgees : ${erreurDeMarque.message}`);
    }
    return reponse(200, { statut: 'purgee', retours: purges.length });
}

Deno.serve(async (req) => {
    if (req.method !== 'POST') return reponse(405, { statut: 'refusee', raison: 'methode' });
    if (Number(req.headers.get('content-length') ?? '0') > LIMITES.corps) return refuser('forme');
    const texte = await req.text();
    if (texte.length > LIMITES.corps) return refuser('forme');
    let corps: unknown;
    try {
        corps = JSON.parse(texte);
    } catch {
        return refuser('forme');
    }
    const demande = lireDemande(corps);
    if (demande.ok === false) return refuser(demande.raison);

    const maintenant = Date.now();
    try {
        const d = demande.valeur;
        if (d.action === 'defi') {
            if (CLES === null) return indisponible('non_configuree');
            return reponse(200, { defi: await nouveauDefi(CLES.defi, maintenant, crypto.getRandomValues(new Uint8Array(16))) });
        }
        if (d.action === 'enregistrer') return await enregistrer(d, req, maintenant);
        if (d.action === 'deposer') return await deposer(d, req, maintenant);
        if (d.action === 'purger') return await purger(req, maintenant);
        return await contribuer(d, req, maintenant);
    } catch (erreur) {
        // Une base injoignable ou un reglage absent : l'application rejouera plus tard.
        console.error(`[communaute] ${message(erreur)}`);
        return indisponible('base');
    }
});
