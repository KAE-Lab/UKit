import { config as chargerEnv } from 'dotenv';

// dotenv 17 annonce chaque chargement sur la sortie standard, et cette configuration est evaluee a
// chaque commande Expo : on charge en silence.
chargerEnv({ quiet: true });

export default {
	name: 'UKit',
	description: 'UKit, a companion app for student of University of Bordeaux',
	slug: 'Ukit',
	privacy: 'public',
	githubUrl: 'https://github.com/KAE-Lab/UKit',
	platforms: ['ios', 'android'],
	version: '6.1.0',
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
		bundleIdentifier: 'com.bordeaux.ukit',
		infoPlist: {
			NSCalendarsUsageDescription:
				'UKit Bordeaux requires calendar access to add your university classes (e.g., "Maths lecture at 8:00 AM") directly to your personal calendar. This allows you to view your school schedule alongside personal events. No calendar data ever leaves your device.',
			NSCalendarsFullAccessUsageDescription:
				'UKit Bordeaux requires full calendar access to list your existing calendars (so you can select an exact destination) and to add your university classes (e.g., "Maths lecture at 8:00 AM") directly to your chosen calendar. This data is processed safely and entirely locally, and is never sent to our servers.',
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
		package: 'com.bordeaux1.emplois',
		permissions: ['READ_CALENDAR', 'WRITE_CALENDAR', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
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
	},
	plugins: [
		"expo-background-task",
		"expo-web-browser",
		"expo-secure-store",
		[
			"expo-local-authentication",
			{
				"faceIDPermission": "UKit Bordeaux utilise Face ID pour protéger l'accès à vos informations universitaires."
			}
		],
	],
};
