import 'dotenv/config';
import { version } from 'react';

export default {
	name: 'Ukit',
	description: 'Ukit, a companion app for student of University of Bordeaux',
	slug: 'Ukit',
	privacy: 'public',
	githubUrl: 'https://github.com/KAE-Lab/UKit',
	platforms: ['ios', 'android'],
	version: '5.5.1',
	versionCode: 550,
	orientation: 'portrait',
	primaryColor: '#006F9F',
	icon: './assets/icons/icon.png',
	owner: 'kaelab',
	splash: {
		image: './assets/icons/icon.png',
		backgroundColor: '#ffffff',
		resizeMode: 'contain',
	},
	ios: {
		icon: './assets/icons/icon.png',
		supportsTablet: true,
		bundleIdentifier: 'com.bordeaux.ukit',
		infoPlist: {
			NSCalendarsUsageDescription:
				'This app use calendar access to synchronize your group calendar to a external calendar (only if the feature is enabled in Settings).',
			NSRemindersUsageDescription:
				'This app needs access to the calendar in order to create events from your schedule',
			UIBackgroundModes: ['fetch'],
			NSLocationWhenInUseUsageDescription: "This app needs your location to show the nearest CROUS restaurants.",
		},
	},
	android: {
		package: 'com.bordeaux1.emplois',
		permissions: ['READ_CALENDAR', 'WRITE_CALENDAR', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
		versionCode: 541,
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
	},
	plugins: [
		"expo-web-browser",
	],
};
