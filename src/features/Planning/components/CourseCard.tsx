export interface CourseData {
	subject: string;
	date: { start: string; end: string };
	schedule: string;
	description: string;
	color?: string;
	category: string;
	UE?: string;
	starttime: string;
	endtime: string;
}

export * from './CourseRow';
export * from './CourseGroupCarousel';
export * from './CalendarNewEventPrompt';