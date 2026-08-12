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
 * Ils sont **neutres vis-a-vis de l'etablissement** depuis le jalon 6-G. `bordeaux_user` aurait
 * oblige le portail de chaque nouvelle universite a declarer un nom que l'application ne connait
 * pas — donc a passer par une release, exactement ce que le multi-etablissement supprime.
 *
 * Le renommage est **net** : les anciennes graphies ne cohabitent pas. Elles n'ont plus de porteur
 * (aucun Blueprint embarque ne les declare, et un nom disparu du socle n'est plus resolu), donc les
 * garder serait du code mort et un perimetre de secrets deux fois plus large pour rien.
 *
 * **Les cles du trousseau, elles, n'ont pas bouge** : c'est ce qui fait que personne n'est
 * deconnecte par la mise a jour. Ce module traduit des noms, il ne migre pas un magasin.
 */
const SECRET_FIELD: Readonly<Record<string, 'username' | 'password'>> = {
    portail_user: 'username',
    portail_pass: 'password',
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
