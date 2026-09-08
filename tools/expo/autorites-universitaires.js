/**
 * `autorites-universitaires` — les racines de certification des universites, embarquees pour les
 * Android qui ne les ont pas.
 *
 * **Le probleme, mesure le 2026-09-08 sur deux telephones.** Les serveurs des deux facs — tout
 * `u-bordeaux.fr` et tout `bordeaux-inp.fr`, du portail CAS a Celcat — presentent une chaine emise
 * par GEANT TCS, le service de certificats du reseau de la recherche, qui remonte aux racines
 * **HARICA TLS Root CA 2021**. Ces deux racines datent du 19 fevrier 2021. Or Android ne met a jour
 * son magasin d'autorites qu'avec une mise a jour du systeme (le magasin n'est devenu modulaire
 * qu'avec Android 14) : un telephone dont l'image systeme est anterieure a mi-2021 ne les connait
 * pas et **refuse la connexion**. Sur ces appareils, Celcat, les salles libres, l'ENT, Moodle, le
 * webmail et Apogee tombent tous ensemble avec une erreur reseau, pendant que le reste de
 * l'application — la base Supabase, le CROUS, Affluences, tous chez des autorites plus anciennes —
 * fonctionne parfaitement. Ce n'est pas une question de version de TLS : les serveurs acceptent
 * jusqu'a TLS 1.0.
 *
 * **Le remede.** Android sait, depuis la version 7, lire une configuration de securite reseau qui
 * ajoute des autorites a celles du systeme. On y declare les deux racines HARICA, en gardant
 * `system` : on n'enleve la confiance a personne, on rend simplement a un vieil appareil ce qu'un
 * appareil recent a deja.
 *
 * **Pourquoi elles valent partout et non pour les seuls domaines des deux facs.** Le premier jet
 * les limitait a `u-bordeaux.fr` et `bordeaux-inp.fr`. C'etait contraire a la these du depot : un
 * campus s'ajoute par le catalogue, sans release. Une liste de domaines dans le binaire aurait
 * oblige a en publier une a chaque nouvelle fac — et GEANT TCS est le fournisseur de **toute**
 * l'universite francaise par RENATER, donc la prochaine y serait aussi. Les racines valent donc
 * pour toutes les connexions, ce qui ne coute rien : elles sont deja dans le programme de Mozilla
 * et dans tous les Android recents.
 *
 * Les deux fichiers viennent du jeu de racines de Mozilla livre par la distribution
 * (`/usr/share/ca-certificates/mozilla/`). Leurs empreintes SHA-256, a verifier si on les remplace :
 *
 *   RSA  D9:5D:0E:8E:DA:79:52:5B:F9:BE:B1:1B:14:D2:10:0D:32:94:98:5F:0C:62:D9:FA:BD:9C:D9:99:EC:CB:7B:1D
 *   ECC  3F:99:CC:47:4A:CF:CE:4D:FE:D5:87:94:66:5E:47:8D:15:47:73:9F:2E:78:0F:1B:B4:CA:9B:13:30:97:D4:01
 *
 * **iOS n'a pas ce probleme** : son magasin d'autorites se met a jour avec les mises a jour de
 * securite, independamment de la version majeure. Rien a faire de ce cote.
 *
 * Voir docs/plateforme.md.
 */

const fs = require('fs');
const path = require('path');

const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

/** Le nom du fichier de configuration, sans extension : c'est ainsi qu'Android le nomme. */
const CONFIG = 'network_security_config';

/** Les racines a embarquer, par leur nom de ressource — minuscules et blancs soulignes obliges. */
const RACINES = ['harica_tls_rsa_root_ca_2021', 'harica_tls_ecc_root_ca_2021'];

/**
 * La configuration elle-meme.
 *
 * `cleartextTrafficPermitted` n'est pose **que** pour la variante de developpement. Sans cette
 * variante, la configuration remplacerait `usesCleartextTraffic` du manifeste de debogage — qu'Android
 * ignore des qu'une configuration reseau existe — et un build de developpement perdrait Metro, qui
 * parle en clair. La variante principale, elle, n'en dit rien : le defaut d'une application qui vise
 * une API recente est deja « pas de trafic en clair », et c'est ce qu'on veut en production.
 */
function configuration(enClair) {
    const ancres = RACINES.map((nom) => `            <certificates src="@raw/${nom}" />`).join('\n');
    const clair = enClair ? ' cleartextTrafficPermitted="true"' : '';
    return `<?xml version="1.0" encoding="utf-8"?>
<!-- Genere par tools/expo/autorites-universitaires.js — ne pas editer a la main. -->
<network-security-config>
    <base-config${clair}>
        <trust-anchors>
            <certificates src="system" />
${ancres}
        </trust-anchors>
    </base-config>
</network-security-config>
`;
}

function ecrire(fichier, contenu) {
    fs.mkdirSync(path.dirname(fichier), { recursive: true });
    fs.writeFileSync(fichier, contenu);
}

const withFichiers = (config) => withDangerousMod(config, ['android', async (mod) => {
    const principal = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    const debogage = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'debug', 'res');
    const source = path.join(__dirname, 'autorites');

    for (const nom of RACINES) {
        ecrire(path.join(principal, 'raw', `${nom}.pem`), fs.readFileSync(path.join(source, `${nom}.pem`)));
    }
    ecrire(path.join(principal, 'xml', `${CONFIG}.xml`), configuration(false));
    ecrire(path.join(debogage, 'xml', `${CONFIG}.xml`), configuration(true));
    return mod;
}]);

const withManifeste = (config) => withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (application !== undefined) {
        application.$['android:networkSecurityConfig'] = `@xml/${CONFIG}`;
    }
    return mod;
});

module.exports = (config) => withManifeste(withFichiers(config));
