/**
 * La fonction des contributions de la communaute (phase 8, lot 1 de la 7.0) : la seule porte par
 * laquelle l'application ecrit un signalement ou un vote (docs/phase-8/1-base-communautaire.md).
 *
 * Trois actions, toutes en POST, appelees avec la cle publiable :
 *   - `defi` rend un defi frais, signe par la fonction, que rien ne garde ;
 *   - `enregistrer` verifie l'attestation App Attest d'une cle (iOS) et l'enregistre ;
 *   - `contribuer` verifie ce que l'appareil a signe — l'assertion App Attest, ou le verdict Play
 *     Integrity dechiffre par Google — puis appelle `public.contribuer` avec la cle de service, qui
 *     juge les plafonds, le vocabulaire et le poids. Une contribution sans attestation passe, sous un
 *     plafond bas et sans jamais compter : l'attestation decide du poids, pas de l'acces.
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
    adresseDuClient, clesDeLaFonction, depuisHexPostgres, egaux, empreinteDAdresse, empreinteDeDemande, evaluerVerdict,
    jourDeParis, LIMITES, lireDefi, lireDemande, lireDonnees, nouveauDefi, sha256, statutDuRefus, utf8, versHex,
    type Demande, type Plateforme,
} from './regles.ts';

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
type Enregistrer = Extract<Demande, { action: 'enregistrer' }>;
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

async function appelerLaBase(fonction: 'enregistrer_appareil' | 'contribuer', p: Record<string, unknown>): Promise<ResultatSql> {
    const { data, error } = await service().rpc(fonction, { p });
    if (error !== null) throw new Error(`${fonction} : ${error.message}`);
    return data as ResultatSql;
}

async function enregistrer(d: Enregistrer, req: Request, maintenant: number): Promise<Response> {
    if (CLES === null) return indisponible('non_configuree');
    if (APPLICATIONS.length === 0) return indisponible('app_attest_non_configure');
    if (await lireDefi(CLES.defi, d.defi, maintenant) !== 'valide') return refuser('defi');
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
        empreinte_ip: await empreinteDeLaDemande(CLES.ip, req, maintenant),
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

async function contribuer(d: Contribuer, req: Request, maintenant: number): Promise<Response> {
    if (CLES === null) return indisponible('non_configuree');
    const lues = lireDonnees(d.donnees);
    if (lues.ok === false) return refuser(lues.raison);
    const donnees = lues.valeur;
    if (await lireDefi(CLES.defi, donnees.defi, maintenant) !== 'valide') return refuser('defi');

    // La cle serveur, et son lien avec ce qui a ete signe ou fait attester : une preuve ne se
    // transporte pas d'un appareil a un autre.
    const cle = d.appareil.nature === 'app_attest' ? d.appareil.cle : await sha256(d.appareil.secret);
    if (!egaux(cle, donnees.cle)) return refuser('cle');

    let atteste = false;
    let compteur: number | null = null;
    let plateforme: Plateforme;
    if (d.appareil.nature === 'app_attest') {
        plateforme = 'ios';
        if (APPLICATIONS.length === 0) return indisponible('app_attest_non_configure');
        const preuve = d.preuve as { assertion: Uint8Array<ArrayBuffer> };
        const { data: ligne, error } = await service().from('appareils')
            .select('cle_publique, compteur').eq('cle', `\\x${versHex(cle)}`).eq('nature', 'app_attest').maybeSingle();
        if (error !== null) throw new Error(`appareils : ${error.message}`);
        const clePublique = depuisHexPostgres(ligne?.cle_publique);
        if (ligne === null || clePublique === null) return refuser('appareil_inconnu');
        try {
            compteur = (await verifierAssertion({
                assertion: preuve.assertion, clientData: utf8(d.donnees), clePublique, applications: APPLICATIONS, compteurConnu: Number(ligne.compteur),
            })).compteur;
            atteste = true;
        } catch (erreur) {
            if (!(erreur instanceof RefusAppAttest)) throw erreur;
            console.warn(`[communaute] assertion refusee : ${erreur.raison}`);
            return refuser(erreur.raison === 'compteur' ? 'compteur_rejoue' : 'assertion');
        }
    } else {
        plateforme = d.appareil.plateforme;
        if (plateforme === 'android' && d.preuve !== null && 'jeton' in d.preuve) {
            atteste = await verdictAndroid(d.preuve.jeton, d.donnees, maintenant);
        }
    }

    const r = await appelerLaBase('contribuer', {
        appareil: { cle: versHex(cle), nature: d.appareil.nature, plateforme, atteste, compteur },
        empreinte_ip: await empreinteDeLaDemande(CLES.ip, req, maintenant),
        contribution: donnees.contribution,
        essai: donnees.essai,
    });
    if (r.statut === 'refusee') return refuser(r.raison ?? 'refusee');
    return reponse(200, { ...r, atteste });
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
        return await contribuer(d, req, maintenant);
    } catch (erreur) {
        // Une base injoignable ou un reglage absent : l'application rejouera plus tard.
        console.error(`[communaute] ${message(erreur)}`);
        return indisponible('base');
    }
});
