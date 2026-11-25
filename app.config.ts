import { config as chargerEnv } from 'dotenv';

// dotenv 17 annonce chaque chargement sur la sortie standard, et cette configuration est evaluee a
// chaque commande Expo : on charge en silence.
chargerEnv({ quiet: true });

/*
 * Le build de developpement est une application a part : son propre identifiant, son propre nom, et
 * il s'installe a cote de celle du store au lieu de la remplacer (2026-11-23, docs/plateforme.md).
 * Le profil `development` d'eas.json pose la variable ; partout ailleurs, rien ne change.
 */
const DEVELOPPEMENT = process.env.APP_VARIANT === 'development';

export default {
	name: DEVELOPPEMENT ? 'UKit Dev' : 'UKit',
	description: 'UKit, a companion app for student of University of Bordeaux',
	slug: 'Ukit',
	/*
	 * Le schema de l'application, que la page `/ami` du site ouvre avec le lien d'un ami
	 * (docs/phase-8/8-amis.md). Le nom du domaine plutot que « ukit », trop court pour etre propre a
	 * cette application. Le build de developpement a le sien, pour ne pas se disputer le lien avec
	 * l'application du store sur le meme telephone.
	 */
	scheme: DEVELOPPEMENT ? 'ukit-bordeaux-dev' : 'ukit-bordeaux',
	privacy: 'public',
	githubUrl: 'https://github.com/KAE-Lab/UKit',
	platforms: ['ios', 'android'],
	version: '6.3.2',
	orientation: 'portrait',
	// `automatic` et non le defaut `light` : l'application impose son theme au natif par
	// `Appearance.setColorScheme` (AppCore.setTheme), ce qu'un style force par la configuration
	// empecherait. Sous Expo Go c'est de toute facon le reglage de l'hote qui s'applique.
	userInterfaceStyle: 'automatic',
	primaryColor: '#006F9F',
	icon: './assets/icons/icon.png',
	owner: 'kaelab',
	splash: {
		image: './assets/icons/splash.png',
		backgroundColor: '#ffffff',
		resizeMode: 'contain',
	},
	ios: {
		icon: './assets/icons/icon.png',
		supportsTablet: true,
		bundleIdentifier: DEVELOPPEMENT ? 'com.bordeaux.ukit.dev' : 'com.bordeaux.ukit',
		infoPlist: {
			NSCalendarsUsageDescription:
				'UKit Bordeaux requires calendar access to add your university classes (e.g., "Maths lecture at 8:00 AM") directly to your personal calendar. This allows you to view your school schedule alongside personal events. No calendar data ever leaves your device.',
			NSCalendarsFullAccessUsageDescription:
				'UKit Bordeaux requires full calendar access to list your existing calendars (so you can select an exact destination), to add your university classes (e.g., "Maths lecture at 8:00 AM") directly to your chosen calendar, and to display the events of the calendars you choose alongside your classes in the planning. This data is processed safely and entirely locally, and is never sent to our servers.',
			NSRemindersUsageDescription:
				'UKit Bordeaux requires access to your reminders to create alerts for your upcoming university classes and events.',
			// `processing`, pas `fetch` : la tache de fond passe par BGTaskScheduler depuis
			// expo-background-task (6.1.1-B), et l'identifiant permis est celui du module. Le greffon
			// du module les pose aussi ; les ecrire ici garde la configuration lisible sans lui.
			UIBackgroundModes: ['processing'],
			BGTaskSchedulerPermittedIdentifiers: ['com.expo.modules.backgroundtask.processing'],
			NSLocationWhenInUseUsageDescription: "UKit Bordeaux uses your device's location to calculate the distance to the nearest CROUS university restaurants and libraries. Your location is never stored or transmitted to our servers.",
			NSFaceIDUsageDescription: "UKit Bordeaux utilise Face ID pour protéger l'accès à vos informations universitaires.",
		},
	},
	android: {
		package: DEVELOPPEMENT ? 'com.bordeaux1.emplois.dev' : 'com.bordeaux1.emplois',
		permissions: ['READ_CALENDAR', 'WRITE_CALENDAR', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
		/*
		 * Aucune permission de galerie ni d'appareil photo (phase 8, lot 3, docs/phase-8/3-formulaire.md).
		 * `expo-screen-capture` declare READ_MEDIA_IMAGES pour Android 13, dont il lit la galerie pour
		 * detecter une capture ; UKit ne detecte qu'a partir d'Android 14, par le rappel du systeme
		 * (DETECT_SCREEN_CAPTURE, accordee a l'installation), et refait sa propre capture. Google Play
		 * demande de justifier toute permission photo : elle n'entre pas dans le manifeste. Le choix
		 * d'une image passe par le selecteur du systeme, qui n'en demande aucune ; CAMERA et
		 * RECORD_AUDIO, que le module de selection ajouterait, sont bloquees par son greffon plus bas.
		 */
		blockedPermissions: ['android.permission.READ_MEDIA_IMAGES'],
		/*
		 * Les identifiants Firebase, sans lesquels Android n'obtient aucun jeton de notification
		 * distante (jalon 6.1.x-E). Le fichier n'est **pas dans le depot** : il porte l'identite d'un
		 * projet Firebase, et ce depot est public. Il vit a la racine du poste (gitignore) et sur EAS
		 * comme variable d'environnement de type fichier, dont le chemin arrive ici a la construction.
		 *
		 * Sans lui — un poste qui ne l'a pas, une construction locale — la cle vaut `undefined` et
		 * Expo l'ignore : tout se construit, seules les notifications distantes manquent.
		 *
		 * Le build de developpement s'en passe : le fichier ne declare que le paquet du store, et
		 * Gradle refuse un paquet qu'il ne connait pas. Les notifications distantes d'Android se
		 * verifient donc sur un build du store, ou apres avoir declare le paquet `.dev` dans Firebase.
		 */
		googleServicesFile: DEVELOPPEMENT ? undefined : process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
		// La seule declaration : la cle racine du meme nom n'est pas un champ Expo et etait ignoree.
		// EAS fait de toute facon autorite sur le numero de build (eas.json, appVersionSource: remote).
		versionCode: 551,
	},
	androidStatusBar: {
		barStyle: 'light-content',
		backgroundColor: '#006F9F',
	},
	assetBundlePatterns: ['**/*'],
	updates: {
		enabled: false,
	},
	extra: {
		"eas": {
			"projectId": "77596c7c-87fc-4c86-9189-3a70fd839abf"
		},
		sentryDSN: process.env.SENTRY_DSN,
		// La base de publication (docs/backend.md). La cle `anon` est publique par conception : elle
		// est lisible dans n'importe quel binaire, et la frontiere de securite ce sont les politiques
		// RLS. La cle `service_role`, elle, ne doit jamais approcher ce fichier.
		// Absentes, l'application demarre et s'utilise sur son socle embarque : la base est un point
		// de publication, pas un intermediaire.
		supabaseUrl: process.env.SUPABASE_URL,
		supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
		// Le troisieme interrupteur d'arret de la livraison (docs/blueprints.md) : `false` fait
		// ignorer durablement la surcouche publiee, sans la detruire. Absent, la livraison est
		// active — une application doit recevoir ses corrections sans qu'on ait pense a le demander.
		blueprintsRemote: process.env.BLUEPRINTS_REMOTE !== 'false',
		// Le numero du projet Google Cloud lie a la Play Console, pour Play Integrity (phase 8, lot 1,
		// shared/communaute/appareil.ts). Un numero, pas un secret. Absent, Android contribue sans
		// attestation : ses contributions s'affichent en retrait et ne comptent pas.
		playIntegrityProjet: process.env.PLAY_INTEGRITY_PROJET,
	},
	plugins: [
		// Les racines de certification des universites, pour les Android d'avant mi-2021 qui ne les
		// ont pas : sans elles, tout ce qui touche aux facs echoue en erreur reseau sur ces
		// appareils (tools/expo/autorites-universitaires.js).
		"./tools/expo/autorites-universitaires",
		// Le reglage Android « Texte en gras » ignore : React Native ne le mesure pas, et le texte
		// dessine en gras perdait ses dernieres lettres (tools/expo/graisse-du-systeme.js).
		"./tools/expo/graisse-du-systeme",
		// Le portrait et le Wi-Fi, que Google Play deduisait exiges, declares facultatifs : sans eux,
		// UKit sortait des tablettes et des ordinateurs (tools/expo/fonctionnalites-facultatives.js).
		"./tools/expo/fonctionnalites-facultatives",
		"expo-background-task",
		"expo-secure-store",
		// Le selecteur d'image du formulaire de retour (lot 3) : PHPicker sur iOS, le selecteur photo
		// d'Android, aucun des deux ne demande de permission. Le greffon ne pose donc aucune phrase
		// d'usage, et bloque l'appareil photo et le micro qu'il ajouterait par defaut.
		[
			"expo-image-picker",
			{
				"photosPermission": false,
				"cameraPermission": false,
				"microphonePermission": false
			}
		],
		[
			"expo-local-authentication",
			{
				"faceIDPermission": "UKit Bordeaux utilise Face ID pour protéger l'accès à vos informations universitaires."
			}
		],
	],
};
