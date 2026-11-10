import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * La resolution de la position, sans appareil : `expo-location` est remplace par un double dont on
 * fixe la reponse. Ce qui est verrouille ici, c'est le contrat du 2026-11-10 : sans position, aucune
 * position, et une permission refusee ne se redemande pas.
 */
const permission = { lue: 'undetermined', demandee: 'denied' };
const demande = vi.fn();

vi.mock('expo-location', () => ({
    Accuracy: { Balanced: 3 },
    getForegroundPermissionsAsync: async () => ({ status: permission.lue }),
    requestForegroundPermissionsAsync: async () => {
        demande();
        return { status: permission.demandee };
    },
    getLastKnownPositionAsync: async () => ({ coords: { latitude: 44.8, longitude: -0.6 } }),
    getCurrentPositionAsync: async () => null,
}));

async function resoudre() {
    // Un module neuf a chaque cas : la derniere position est partagee au niveau du module.
    vi.resetModules();
    const { positionPartagee } = await import('./useCampusLocation');
    return positionPartagee();
}

describe('positionPartagee', () => {
    beforeEach(() => {
        demande.mockClear();
    });

    it('rend la position quand la permission est deja accordee, sans la demander', async () => {
        permission.lue = 'granted';
        expect(await resoudre()).toEqual({ lat: 44.8, lon: -0.6 });
        expect(demande).not.toHaveBeenCalled();
    });

    it('ne redemande pas une permission deja refusee, et ne rend aucune position', async () => {
        permission.lue = 'denied';
        expect(await resoudre()).toBeNull();
        expect(demande).not.toHaveBeenCalled();
    });

    it('demande une seule fois quand personne n a encore repondu', async () => {
        permission.lue = 'undetermined';
        permission.demandee = 'denied';
        expect(await resoudre()).toBeNull();
        expect(demande).toHaveBeenCalledTimes(1);

        permission.demandee = 'granted';
        expect(await resoudre()).toEqual({ lat: 44.8, lon: -0.6 });
    });
});
