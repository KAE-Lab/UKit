export interface CourseData {
	subject: string;
	date: { start: string; end: string };
	schedule: string;
	description: string;
	color?: string;
	category: string;
	/** Le premier code d'UE, celui que la fiche affiche ; `ues` porte tous les codes du cours. */
	UE?: string;
	ues?: string[];
	starttime: string;
	endtime: string;
	/**
	 * Les batiments declares par la source (`Batiment A28`), quand elle en declare.
	 *
	 * La fiche de cours les lit avant de deviner une salle dans la description. Facultatif : l'export
	 * iCalendar n'en a pas, et les caches ecrits avant ce champ non plus (PlanningAssembly.ts).
	 */
	sites?: string[];
	/** Les intitules de matiere declares par la source, tous, quand elle en declare (PlanningAssembly.ts). */
	modules?: string[];
}

export * from './CourseRow';
export * from './CourseGroupCarousel';
export * from './CalendarNewEventPrompt';