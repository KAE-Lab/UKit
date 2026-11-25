/**
 * `fonctionnalites-facultatives` — deux fonctionnalites materielles que le manifeste exigeait sans
 * le vouloir sont declarees facultatives, pour que Google Play ne retire pas UKit des appareils qui
 * ne les ont pas (registre, signale par la Play Console le 2026-11-24).
 *
 * **D'ou elles venaient.** Aucune n'est ecrite par UKit : Google Play les deduit.
 * `android.hardware.screen.portrait` vient de l'activite verrouillee en portrait
 * (`orientation: 'portrait'`, app.config.ts) ; `android.hardware.wifi`, de la permission
 * `ACCESS_WIFI_STATE` qu'une dependance declare. Une fonctionnalite deduite est exigee ; une
 * fonctionnalite declaree avec `android:required="false"` ne l'est plus, et Google Play ne la deduit
 * plus (« Permissions and APIs that Access Device Features », developer.android.com).
 *
 * **Pourquoi facultatives, et pas retirees.** L'application marche en paysage force (le verrou ne
 * fait que tourner l'ecran) et sans Wi-Fi (le reseau mobile suffit) : rien ne justifie d'exclure une
 * tablette, un ordinateur sous ChromeOS ou un casque. La preuve se lit dans l'APK :
 * `aapt2 dump badging` ne doit plus les montrer qu'en `uses-feature-not-required`.
 */

const { withAndroidManifest } = require('expo/config-plugins');

const FACULTATIVES = ['android.hardware.screen.portrait', 'android.hardware.wifi'];

/** Declare chaque fonctionnalite facultative, en remplacant une declaration qui l'exigerait. */
function declarerFacultatives(manifeste) {
    const racine = manifeste.manifest;
    const declarees = (racine['uses-feature'] ?? []).filter((f) => !FACULTATIVES.includes(f.$?.['android:name']));
    racine['uses-feature'] = [
        ...declarees,
        ...FACULTATIVES.map((nom) => ({ $: { 'android:name': nom, 'android:required': 'false' } })),
    ];
    return manifeste;
}

module.exports = function fonctionnalitesFacultatives(config) {
    return withAndroidManifest(config, (mod) => {
        mod.modResults = declarerFacultatives(mod.modResults);
        return mod;
    });
};

module.exports.declarerFacultatives = declarerFacultatives;
module.exports.FACULTATIVES = FACULTATIVES;
