import * as moment from 'moment';
import 'moment/locale/fr';
import 'moment/locale/es';

import { SettingsManager } from '../services/AppCore'; 
import EN from './en';
import FR from './fr';
import ES from './es';

moment.updateLocale('en', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const Translations = {
	en: EN,
	es: ES,
	fr: FR,
};

class TranslatorService {
	constructor() {
		this.setLanguage(SettingsManager.getLanguage());
	}

	setLanguage(lang) {
		this._language = lang.toLowerCase();
		moment.locale(this._language);
	}

	get(str, ...args) {
		const result = Translations[this._language][str];

		if (!result) return str;
		if (!args.length) return result;

		let currentArg = 0;
		return result.replace('$-', () => {
			if (args[currentArg] !== undefined && args[currentArg] !== null) {
				return args[currentArg++];
			}
			return '';
		});
	}

	getLanguage() {
		return this._language;
	}

	getLanguageString() {
		switch (this._language) {
			case 'fr': return 'Français';
			case 'en': return 'English';
			case 'es': return 'Español';
			default: return '';
		}
	}
}

const Translator = new TranslatorService();

SettingsManager.on('language', (newLang) => {
	Translator.setLanguage(newLang);
});

export default Translator;