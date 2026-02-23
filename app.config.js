import 'dotenv/config';

export default {
	name: 'Ukit',
	description: 'Ukit, a companion app for student of University of Bordeaux',
	slug: 'Ukit',
	privacy: 'public',
	githubUrl: 'https://github.com/illumye/UKit',
	platforms: ['ios', 'android'],
	version: '5.0.0',
	orientation: 'portrait',
	primaryColor: '#006F9F',
	icon: './assets/icons/ios.png',
	owner: 'illumye',
	splash: {
		image: './assets/icons/splash.png',
		backgroundColor: '#009de0',
		resizeMode: 'contain',
	},
	ios: {
		icon: './assets/icons/ios.png',
		supportsTablet: true,
		bundleIdentifier: 'com.bordeaux.ukit',
		config: {
			googleMapsApiKey: 'AIzaSyB5JDcHP9k40e0ozKCSA9ObjPYusnhETBI',
			usesNonExemptEncryption: false,
		},
		infoPlist: {
			NSCalendarsUsageDescription:
				'This app use calendar access to synchronize your group calendar to a external calendar (only if the feature is enabled in Settings).',
			NSRemindersUsageDescription:
				'This app needs access to the calendar in order to create events from your schedule',
			UIBackgroundModes: ['fetch'],
		},
	},
	android: {
		package: 'me.illumye.ukit',
		config: {
			googleMaps: {
				apiKey: 'AIzaSyD8qcNLeWqiyS5KK4hWiCkznZkD3GbhFrI',
			},
		},
		adaptiveIcon: {
			foregroundImage: './assets/icons/android_foreground.png',
			backgroundImage: './assets/icons/android_background.png',
		},
		permissions: ['READ_CALENDAR', 'WRITE_CALENDAR'],
		versionCode: 63,
	},
	androidStatusBar: {
		barStyle: 'light-content',
		backgroundColor: '#009ee0',
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
	},
	plugins: [],
};
