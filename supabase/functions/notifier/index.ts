/**
 * La fonction d'envoi des messages de service en notification push (jalon 6.1.x-E).
 *
 * Appelee par la console, avec la session d'un editeur : elle cible les jetons deposes par les
 * appareils (la meme regle que sur l'appareil, `regles.ts`), envoie par lots de cent a l'API push
 * d'Expo, lit les tickets, elague les jetons que le service declare morts, et marque le message
 * notifie — une fois, jamais deux. Elle tourne avec la cle de service, qui ne sort jamais d'ici.
 *
 * Elle vit ici et non dans la console parce que l'API d'Expo ne repond pas aux navigateurs (pas
 * d'en-tete CORS, mesure le 2026-09-08), et parce que les jetons n'ont pas a transiter par un
 * onglet de navigateur.
 *
 *     npx supabase functions deploy notifier --project-ref <ref>
 *
 * Voir docs/pilotage.md et supabase/README.md.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

import { estCible, projeterCiblage, type Appareil } from './regles.ts';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
const TAILLE_DE_LOT = 100;
/** La page de lecture des jetons. PostgREST plafonne ses reponses ; sans pagination, le parc au-dela
 *  de ce nombre n'aurait jamais ete notifie, **en silence**. */
const TAILLE_DE_PAGE = 1000;
const LONGUEUR_CORPS = 180;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reponse(statut: number, corps: Record<string, unknown>): Response {
    return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

interface Jeton {
    jeton: string;
    plateforme: string;
    etablissement: string;
    version: string;
    testeur: boolean;
}

interface Ticket {
    status: 'ok' | 'error';
    message?: string;
    details?: { error?: string };
}

/** L'e-mail de la session appelante est-il un editeur ? La table ne lui rend que sa propre ligne (policies.sql). */
async function estEditeur(autorisation: string): Promise<boolean> {
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: autorisation } },
    });
    const { data, error } = await client.from('editeurs').select('email').limit(1);
    return error === null && Array.isArray(data) && data.length === 1;
}

function appareil(jeton: Jeton): Appareil {
    return {
        testeur: jeton.testeur === true,
        etablissement: jeton.etablissement,
        version: jeton.version,
        plateforme: jeton.plateforme === 'ios' || jeton.plateforme === 'android' ? jeton.plateforme : 'inconnue',
    };
}

/**
 * Tous les jetons, page par page et dans un ordre stable.
 *
 * `select()` sans bornes rend au plus ce que le projet autorise — mille lignes par defaut — sans
 * erreur ni indication : au-dela, une partie du parc n'aurait simplement jamais recu la notification.
 * L'ordre explicite est ce qui garantit qu'aucune ligne n'est sautee entre deux pages.
 */
async function tousLesJetons(service: ReturnType<typeof createClient>): Promise<Jeton[]> {
    const tous: Jeton[] = [];
    for (let debut = 0; ; debut += TAILLE_DE_PAGE) {
        const { data, error } = await service
            .from('jetons_push')
            .select('jeton, plateforme, etablissement, version, testeur')
            .order('jeton')
            .range(debut, debut + TAILLE_DE_PAGE - 1);
        if (error !== null) throw new Error(error.message);
        const page = (data ?? []) as Jeton[];
        tous.push(...page);
        if (page.length < TAILLE_DE_PAGE) return tous;
    }
}

/** Un message d'erreur d'Expo cite le jeton qu'il refuse : il ne remonte pas tel quel a la console. */
function sansJeton(message: string): string {
    return message.replace(/ExponentPushToken\[[^\]]*\]/g, 'un jeton');
}

function corpsDeNotification(corps: unknown): string | undefined {
    if (typeof corps !== 'string') return undefined;
    const ligne = corps.trim().split('\n')[0]?.trim() ?? '';
    if (ligne === '') return undefined;
    return ligne.length > LONGUEUR_CORPS ? ligne.slice(0, LONGUEUR_CORPS - 1) + '…' : ligne;
}

async function envoyer(lot: string[], titre: string, corps: string | undefined, donnees: Record<string, string>): Promise<Ticket[]> {
    // `channelId` doit nommer le canal que l'application cree (shared/push/reception.ts) : un canal
    // inconnu de l'appareil retombe sur celui d'Expo, en importance par defaut, et la notification ne
    // surgit alors plus par-dessus l'ecran. Android seul le lit ; iOS l'ignore.
    const messages = lot.map((to) => ({ to, title: titre, body: corps, data: donnees, sound: 'default', priority: 'high', channelId: 'messages-de-service' }));
    const r = await fetch(EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
    });
    if (!r.ok) throw new Error(`Expo push ${r.status}`);
    const json = await r.json() as { data?: Ticket[] };
    return Array.isArray(json.data) ? json.data : [];
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return reponse(405, { erreur: 'POST attendu' });

    const autorisation = req.headers.get('Authorization') ?? '';
    if (!(await estEditeur(autorisation))) return reponse(403, { erreur: 'Réservé aux éditeurs.' });

    const { id } = await req.json().catch(() => ({})) as { id?: unknown };
    if (typeof id !== 'string' || id === '') return reponse(400, { erreur: 'Identifiant de message manquant.' });

    const service = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: message, error: erreurMessage } = await service.from('service_messages').select('*').eq('id', id).maybeSingle();
    if (erreurMessage !== null) return reponse(500, { erreur: erreurMessage.message });
    if (message === null) return reponse(404, { erreur: 'Message introuvable.' });
    if (message.actif !== true) return reponse(409, { erreur: 'Le message est inactif : rien à notifier.' });
    if (typeof message.expire_le === 'string' && new Date(message.expire_le).getTime() < Date.now()) {
        return reponse(409, { erreur: 'Le message est expiré : rien à notifier.' });
    }

    /*
     * **La reservation precede l'envoi**, et c'est elle qui tient la promesse « une fois, jamais
     * deux ». La lire puis l'ecrire apres l'envoi laissait toute la duree de l'envoi entre les deux :
     * deux onglets de la console, ou deux editeurs, notifiaient le parc deux fois. Ici, le second
     * appel ne trouve plus de ligne a reserver et s'arrete.
     *
     * Elle se **rend** si rien n'est parti (plus bas) : un incident ne doit pas etre condamne au
     * silence par une panne passagere du service d'envoi.
     */
    const { data: reserve, error: erreurReservation } = await service
        .from('service_messages')
        .update({ notifie_le: new Date().toISOString() })
        .eq('id', id)
        .is('notifie_le', null)
        .select('id');
    if (erreurReservation !== null) return reponse(500, { erreur: erreurReservation.message });
    if (reserve === null || reserve.length === 0) {
        return reponse(409, { erreur: `Déjà notifié le ${message.notifie_le}. Un message ne se notifie qu’une fois.` });
    }

    const rendreLaReservation = () => service.from('service_messages').update({ notifie_le: null, notifies: null }).eq('id', id);

    let jetons: Jeton[];
    try {
        jetons = await tousLesJetons(service);
    } catch (erreur) {
        await rendreLaReservation();
        return reponse(500, { erreur: erreur instanceof Error ? erreur.message : String(erreur) });
    }

    const ciblage = projeterCiblage(message as Record<string, unknown>);
    const vises = jetons.filter((j) => estCible(ciblage, appareil(j))).map((j) => j.jeton);

    const morts: string[] = [];
    let envoyes = 0;
    const erreurs: string[] = [];
    const donnees = { cle: String(message.cle), id: String(message.id) };
    for (let debut = 0; debut < vises.length; debut += TAILLE_DE_LOT) {
        const lot = vises.slice(debut, debut + TAILLE_DE_LOT);
        try {
            const tickets = await envoyer(lot, String(message.titre), corpsDeNotification(message.corps), donnees);
            tickets.forEach((ticket, index) => {
                if (ticket.status === 'ok') { envoyes += 1; return; }
                if (ticket.details?.error === 'DeviceNotRegistered') morts.push(lot[index]);
                else erreurs.push(sansJeton(ticket.message ?? ticket.details?.error ?? 'erreur inconnue'));
            });
        } catch (erreur) {
            erreurs.push(sansJeton(erreur instanceof Error ? erreur.message : String(erreur)));
        }
    }

    if (morts.length > 0) await service.from('jetons_push').delete().in('jeton', morts);

    const distinctes = [...new Set(erreurs)].slice(0, 5);
    // Rien n'est parti : la reservation se rend, et le message reste notifiable. Le cas comprend
    // « aucun appareil vise » — un ciblage a corriger, pas un envoi a condamner.
    if (envoyes === 0) {
        await rendreLaReservation();
        return reponse(200, {
            vises: vises.length, envoyes: 0, retires: morts.length, erreurs: distinctes, renvoyable: true,
        });
    }

    await service.from('service_messages').update({ notifies: vises.length }).eq('id', id);
    return reponse(200, { vises: vises.length, envoyes, retires: morts.length, erreurs: distinctes });
});
