/**
 * La fonction de l'equipe (jalon 7-H) : inviter quelqu'un dans la console, lui donner un nouveau mot de
 * passe provisoire, ou le revoquer. Appelee par la page Equipe, avec la session d'un admin.
 *
 * Elle vit ici et non dans la console parce que creer, changer ou supprimer un compte demande la cle de
 * service, qui ne va jamais dans un navigateur. Mais elle n'ecrit la table `editeurs` qu'avec la session
 * de l'admin qui appelle : les politiques s'appliquent — la garde du dernier admin comprise —, et le
 * journal porte son nom (supabase/policies.sql, supabase/fonctions.sql).
 *
 * Tant que le projet n'a pas de serveur d'envoi de courriels a lui, l'invitation ne part pas par
 * courriel : le compte nait avec un mot de passe provisoire, rendu une seule fois a l'admin, qui le
 * transmet de vive voix, et la console exige de le changer a la premiere connexion. Il n'est ecrit ni
 * dans le journal ni dans un log.
 *
 *     npx --yes supabase functions deploy editeurs --project-ref <ref> --use-api
 *
 * Voir docs/pilotage.md et supabase/README.md.
 */

import type { SupabaseClient, User } from 'jsr:@supabase/supabase-js@2';

import { appelant, CORS, reponse, service, type Appelant } from '../_shared/index.ts';
import { lireDemande, motDePasseProvisoire, OCTETS_DU_MOT_DE_PASSE, type Demande } from './regles.ts';

/** La page de lecture des comptes : l'API d'administration n'a pas de recherche par adresse. */
const PAGE_DE_COMPTES = 1000;

type Invitation = Extract<Demande, { action: 'inviter' }>;

async function trouverCompte(admin: SupabaseClient, email: string): Promise<User | null> {
    for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_DE_COMPTES });
        if (error !== null) throw new Error(error.message);
        const trouve = data.users.find((compte) => compte.email?.toLowerCase() === email);
        if (trouve !== undefined) return trouve;
        if (data.users.length < PAGE_DE_COMPTES) return null;
    }
}

/**
 * Pose un mot de passe provisoire sur le compte de `email`, et le cree s'il n'existe pas. Le drapeau
 * `mot_de_passe_provisoire` est ce que la console lit pour exiger un mot de passe choisi.
 */
async function poserMotDePasseProvisoire(admin: SupabaseClient, email: string): Promise<{ readonly motDePasse: string; readonly compteCree: User | null }> {
    const motDePasse = motDePasseProvisoire(crypto.getRandomValues(new Uint8Array(OCTETS_DU_MOT_DE_PASSE)));
    const existant = await trouverCompte(admin, email);
    if (existant === null) {
        const { data, error } = await admin.auth.admin.createUser({
            email, password: motDePasse, email_confirm: true, user_metadata: { mot_de_passe_provisoire: true },
        });
        if (error !== null || data.user === null) throw new Error(`Compte non créé : ${error?.message ?? 'réponse vide'}`);
        return { motDePasse, compteCree: data.user };
    }
    const { error } = await admin.auth.admin.updateUserById(existant.id, {
        password: motDePasse, user_metadata: { ...existant.user_metadata, mot_de_passe_provisoire: true },
    });
    if (error !== null) throw new Error(`Mot de passe non remplacé : ${error.message}`);
    return { motDePasse, compteCree: null };
}

/**
 * La ligne d'abord, avec la session de l'admin : les politiques et les contraintes jugent avant que rien
 * ne touche l'authentification. Puis le compte ; s'il ne se cree pas, la ligne se retire — et le journal
 * garde les deux gestes, ce qui est la verite.
 */
async function inviter(qui: Appelant, admin: SupabaseClient, demande: Invitation): Promise<Response> {
    const { data: ligne, error } = await qui.client
        .from('editeurs')
        .insert({ email: demande.email, role: demande.role, etablissements: demande.etablissements, provisoire_le: new Date().toISOString() })
        .select()
        .single();
    if (error !== null) {
        const deja = error.code === '23505';
        return reponse(deja ? 409 : 400, {
            erreur: deja ? `${demande.email} est déjà dans l’équipe : change son rôle, ou donne-lui un nouveau mot de passe provisoire.` : error.message,
        });
    }
    try {
        const { motDePasse } = await poserMotDePasseProvisoire(admin, demande.email);
        return reponse(200, { ligne, motDePasse });
    } catch (erreur) {
        await qui.client.from('editeurs').delete().eq('email', demande.email);
        return reponse(500, { erreur: erreur instanceof Error ? erreur.message : String(erreur) });
    }
}

/** La trace d'abord — `provisoire_le`, ecrite au nom de l'admin —, puis le mot de passe. */
async function reinitialiser(qui: Appelant, admin: SupabaseClient, email: string): Promise<Response> {
    const { data: lignes, error } = await qui.client
        .from('editeurs')
        .update({ provisoire_le: new Date().toISOString() })
        .eq('email', email)
        .select();
    if (error !== null) return reponse(400, { erreur: error.message });
    if (lignes.length === 0) return reponse(404, { erreur: `${email} n’est pas dans l’équipe.` });
    const { motDePasse } = await poserMotDePasseProvisoire(admin, email);
    return reponse(200, { ligne: lignes[0], motDePasse });
}

/**
 * La ligne d'abord : les droits sont coupes des qu'elle est supprimee, a la requete suivante. Puis le
 * compte, pour qu'aucun compte dormant ne garde un mot de passe ; le journal garde l'adresse. La garde du
 * dernier admin refuse la premiere etape, et rien ne se fait.
 */
async function revoquer(qui: Appelant, admin: SupabaseClient, email: string): Promise<Response> {
    const { data: lignes, error } = await qui.client.from('editeurs').delete().eq('email', email).select('email');
    if (error !== null) return reponse(409, { erreur: error.message });
    if (lignes.length === 0) return reponse(404, { erreur: `${email} n’est pas dans l’équipe.` });
    const compte = await trouverCompte(admin, email);
    if (compte === null) return reponse(200, { revoque: true, compteSupprime: false });
    const { error: erreurDeCompte } = await admin.auth.admin.deleteUser(compte.id);
    if (erreurDeCompte !== null) {
        return reponse(200, { revoque: true, compteSupprime: false, avertissement: `Droits retirés ; le compte n’a pas pu être supprimé : ${erreurDeCompte.message}` });
    }
    return reponse(200, { revoque: true, compteSupprime: true });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return reponse(405, { erreur: 'POST attendu' });

    try {
        const qui = await appelant(req.headers.get('Authorization') ?? '');
        if (qui === null || qui.role !== 'admin') return reponse(403, { erreur: 'Réservé aux admins.' });

        const { data: catalogue, error } = await qui.client.from('etablissements').select('code');
        if (error !== null) return reponse(500, { erreur: error.message });
        const corps = await req.json().catch(() => null);
        const demande = lireDemande(corps, (catalogue ?? []).map((etablissement) => String(etablissement.code)));
        if ('erreur' in demande) return reponse(400, { erreur: demande.erreur });

        const admin = service();
        switch (demande.action) {
            case 'inviter': return await inviter(qui, admin, demande);
            case 'reinitialiser': return await reinitialiser(qui, admin, demande.email);
            case 'revoquer': return await revoquer(qui, admin, demande.email);
        }
    } catch (erreur) {
        return reponse(500, { erreur: erreur instanceof Error ? erreur.message : String(erreur) });
    }
});
