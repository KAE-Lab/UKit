/**
 * La resolution des secrets : projection des champs, et absence traitee comme une absence.
 *
 * Jouable hors appareil parce que `ukitSecrets` recoit son magasin plutot que de l'importer. C'est
 * la raison d'etre du `CredentialStore` declare structurellement : le trousseau est un fait de
 * plateforme, la projection n'en est pas un.
 *
 *     npm test
 */

import { expect, test } from 'vitest';

import { ukitSecrets, type CredentialStore } from './secrets';

function magasin(credentials: { username: string; password: string } | null): CredentialStore {
    return { getCredentials: async () => credentials };
}

const IDENTIFIANTS = { username: 'etu42', password: 'motdepasse' };

test('les noms declares par les Blueprints sont projetes sur les champs du document', async () => {
    const resolver = ukitSecrets(magasin(IDENTIFIANTS));

    expect(await resolver.resolve('bordeaux_user')).toBe('etu42');
    expect(await resolver.resolve('bordeaux_pass')).toBe('motdepasse');
});

test('un nom inconnu rend undefined sans toucher au trousseau', async () => {
    let touche = false;
    const resolver = ukitSecrets({
        getCredentials: async () => {
            touche = true;
            return IDENTIFIANTS;
        },
    });

    expect(await resolver.resolve('bordeaux_admin')).toBeUndefined();
    // Un Blueprint ne peut pas se servir dans le trousseau : le nom est refuse avant la lecture.
    expect(touche).toBe(false);
});

test('un trousseau vide rend undefined, pas une chaine vide', async () => {
    const resolver = ukitSecrets(magasin(null));

    expect(await resolver.resolve('bordeaux_user')).toBeUndefined();
});

test('un champ vide est une absence', async () => {
    const resolver = ukitSecrets(magasin({ username: '', password: 'motdepasse' }));

    // Le moteur echoue au step qui lit le secret, la ou l'erreur a un sens. Rendre une chaine vide
    // enverrait un identifiant vide au CAS et produirait un « mot de passe incorrect » trompeur.
    expect(await resolver.resolve('bordeaux_user')).toBeUndefined();
    expect(await resolver.resolve('bordeaux_pass')).toBe('motdepasse');
});

test('un echec de lecture est traite comme une absence', async () => {
    const resolver = ukitSecrets({
        getCredentials: async () => {
            throw new Error('trousseau verrouille');
        },
    });

    // Laisser echapper une erreur de plateforme ferait mourir un run qui n'avait peut-etre pas
    // besoin de ce secret.
    expect(await resolver.resolve('bordeaux_user')).toBeUndefined();
});

test('le document est relu a chaque demande', async () => {
    let lectures = 0;
    const resolver = ukitSecrets({
        getCredentials: async () => {
            lectures += 1;
            return IDENTIFIANTS;
        },
    });

    await resolver.resolve('bordeaux_user');
    await resolver.resolve('bordeaux_pass');

    // Un run peut suivre de peu une deconnexion : servir des identifiants effaces serait pire qu'un
    // acces de trousseau de plus.
    expect(lectures).toBe(2);
});
