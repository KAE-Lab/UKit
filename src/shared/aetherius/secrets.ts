/**
 * La resolution des secrets, cote UKit.
 *
 * C'est la raison d'etre du moteur **embarque** prise a la lettre : UKit detient les identifiants
 * universitaires de son utilisateur, et ils ne doivent aller qu'au CAS de son universite. Ils ne
 * quittent pas le trousseau de l'appareil, et aucune machine tierce ne les voit passer.
 *
 * Le paquet fournit un adaptateur trousseau (`keychainSecrets`) qui traduit un nom de secret en cle
 * de magasin et lit une chaine. UKit ne peut pas s'en servir tel quel : ses identifiants sont un
 * **document JSON unique** sous `UKIT_CAS_CREDENTIALS` (voir SecureStoreService). Renommer les cles
 * du trousseau pour plaire a une bibliotheque deconnecterait tous les utilisateurs deja installes —
 * c'est le genre de migration qu'une bibliotheque n'a pas a imposer, et le paquet ne l'impose pas.
 *
 * Trois invariants tiennent l'hygiene, garantis par le moteur, a ne pas contourner :
 *
 *   - seuls les secrets **declares** par le Blueprint sont demandes ici ;
 *   - une valeur passee a l'appel gagne sur celle du trousseau ;
 *   - aucune valeur resolue ne franchit la frontiere des journaux (masquage actif par defaut).
 *
 * Voir docs/phase-6/6-a-socle.md.
 */

import type { SecretResolver } from '@aetherius/react-native';

/**
 * Le magasin d'identifiants, **declare** plutot qu'importe.
 *
 * Meme posture que le `SecretStore` du paquet, et pour la meme raison : ce module n'a besoin que
 * d'une methode, et l'importer ferait entrer `expo-secure-store` — donc un module natif — dans un
 * fichier qui n'est que de la projection de champs. Le typage structurel fait que
 * `SecureStoreService` satisfait ce contrat sans rien declarer, et le socle reste jouable hors
 * appareil (voir secrets.test.ts). C'est `client.ts` qui branche le vrai magasin.
 */
export interface CredentialStore {
    getCredentials(): Promise<{ username: string; password: string } | null>;
}

/**
 * Les noms de secrets, tels que les Blueprints les declarent, projetes sur les champs du document
 * stocke.
 *
 * C'est le seul endroit a toucher au jalon 6-G, quand les noms deviendront neutres vis-a-vis de
 * l'etablissement (`portail_user` / `portail_pass`) : les deux graphies cohabiteront ici le temps
 * que le parc migre, et ni le trousseau ni les ecrans n'en sauront rien.
 */
const SECRET_FIELD: Readonly<Record<string, 'username' | 'password'>> = {
    bordeaux_user: 'username',
    bordeaux_pass: 'password',
};

/**
 * Le resolver de UKit.
 *
 * Le document est relu a chaque demande plutot que mis en cache : un run peut suivre de peu une
 * deconnexion, et servir des identifiants effaces serait pire qu'un acces de trousseau de plus.
 * L'echec de lecture est traite comme une absence — la difference n'a pas de sens pour l'appelant,
 * et laisser echapper une erreur de plateforme ferait mourir un run qui n'avait peut-etre pas besoin
 * de ce secret.
 */
export function ukitSecrets(store: CredentialStore): SecretResolver {
    return {
        async resolve(name: string): Promise<string | undefined> {
            const field = SECRET_FIELD[name];
            if (!field) return undefined;

            try {
                const credentials = await store.getCredentials();
                return credentials?.[field] || undefined;
            } catch {
                return undefined;
            }
        },
    };
}

export type { SecretResolver };
