import * as moment from 'moment';
import 'moment/locale/fr';
import 'moment/locale/es';

import { SettingsManager } from '../services/AppCore'; 
import EN from './en';
import FR from './fr';
import ES from './es';

export type TranslationDict = typeof EN;
export type TranslationKey = keyof TranslationDict;
export type SupportedLanguage = 'en' | 'fr' | 'es';

moment.updateLocale('en', {
	week: {
		dow: 1,
		doy: 4,
	},
});

const Translations: Record<SupportedLanguage, TranslationDict> = {
	en: EN,
	es: ES,
	fr: FR,
};

class TranslatorService {
	private _language: SupportedLanguage;

	constructor() {
		this._language = 'en'; // default before setting
		this.setLanguage(SettingsManager.getLanguage() || 'en');
	}

	setLanguage(lang: string): void {
		const validLang = lang.toLowerCase() as SupportedLanguage;
		if (Translations[validLang]) {
			this._language = validLang;
		} else {
			this._language = 'en';
		}
		moment.locale(this._language);
	}

	get(str: TranslationKey, ...args: (string | number)[]): string {
		const result = Translations[this._language][str];

		if (!result) return str as string;
		if (!args.length) return result;

		let currentArg = 0;
		return result.replace(/\$-/g, () => {
			if (args[currentArg] !== undefined && args[currentArg] !== null) {
				return String(args[currentArg++]);
			}
			return '';
		});
	}

	getLanguage(): SupportedLanguage {
		return this._language;
	}

	getLanguageString(): string {
		switch (this._language) {
			case 'fr': return 'Français';
			case 'en': return 'English';
			case 'es': return 'Español';
			default: return '';
		}
	}
}

const Translator = new TranslatorService();

SettingsManager.on('language', (newLang: string) => {
	Translator.setLanguage(newLang);
});

export default Translator;