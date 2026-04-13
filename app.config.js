import 'dotenv/config';
import { version } from 'react';

export default {
	name: 'UKit',
	description: 'UKit, a companion app for student of University of Bordeaux',
	slug: 'Ukit',
	privacy: 'public',
	githubUrl: 'https://github.com/KAE-Lab/UKit',
	platforms: ['ios', 'android'],
	version: '5.6.1',
	versionCode: 550,
	orientation: 'portrait',
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
			UIBackgroundModes: ['fetch'],
			NSLocationWhenInUseUsageDescription: "UKit Bordeaux uses your device's location to calculate the distance to the nearest CROUS university restaurants and libraries. Your location is never stored or transmitted to our servers.",
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
