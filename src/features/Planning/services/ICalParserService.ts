import ICAL from 'ical.js';
import moment from 'moment';
import 'moment/locale/fr';
import { PlanningEvent } from './PlanningApiService';
import { upperCaseFirstLetter } from '../../../shared/utils/formatUtils';

moment.locale('fr');

class ICalParserServiceClass {
    /**
     * Fetches and parses an iCal file from a given URL into an array of PlanningEvent objects.
     * @param url The URL of the .ics file.
     * @param groupName A string to assign as the group for these events.
     * @returns A Promise resolving to an array of PlanningEvent.
     */
    async fetchAndParseICal(url: string, groupName: string = 'Import iCal'): Promise<PlanningEvent[]> {
        try {
            // Fetch raw text from the URL
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Erreur réseau: impossible d'accéder à l'URL (Statut: ${response.status})`);
            }
            
            const icalText = await response.text();
            
            // Parse the iCal data
            // ICAL.parse may throw if the format is invalid
            const jcalData = ICAL.parse(icalText);
            const comp = new ICAL.Component(jcalData);
            
            // Extract all VEVENT components
            const vevents = comp.getAllSubcomponents('vevent');
            
            const events: PlanningEvent[] = vevents.map((vevent) => {
                const event = new ICAL.Event(vevent);
                
                // Extract iCal fields
                const summary = event.summary || 'Sans titre';
                const description = event.description || '';
                const location = event.location || '';
                const uid = event.uid || Math.random().toString(36).substring(2, 9);
                
                // Handle dates and timezones correctly
                // toJSDate() converts the ICAL.Time object into a standard JS Date in the local timezone
                const startDate = event.startDate.toJSDate();
                const endDate = event.endDate.toJSDate();
                
                const startMoment = moment(startDate);
                const endMoment = moment(endDate);
                
                const starttime = startMoment.format('HH:mm');
                const endtime = endMoment.format('HH:mm');
                
                const day = upperCaseFirstLetter(startMoment.format('dddd L'));
                const dayNumberInt = startMoment.isoWeekday();
                
                // Combine description and location if location exists
                const fullDescription = location ? `${location}\n${description}`.trim() : description;
                
                // Default color for iCal imports, can be parameterized
                const defaultColor = '#4a90e2';
                
                const planningEvent: PlanningEvent = {
                    id: uid,
                    style: `style="background-color:${defaultColor}"`,
                    color: defaultColor,
                    schedule: `${starttime}-${endtime} ${summary}`,
                    starttime,
                    endtime,
                    date: { 
                        start: startMoment.toISOString(), 
                        end: endMoment.toISOString() 
                    },
                    subject: summary,
                    description: fullDescription,
                    category: summary, // Alternatively, you could try to extract a category if present
                    group: groupName,
                    day,
                    dayNumber: String(dayNumberInt),
                };
                
                return planningEvent;
            });
            
            return events;
            
        } catch (error) {
            console.error('Erreur lors du parsing iCal:', error);
            if (error instanceof Error) {
                throw new Error(`Échec du traitement du fichier iCal: ${error.message}`);
            }
            throw new Error('Échec du traitement du fichier iCal: Format invalide ou URL inaccessible.');
        }
    }
}

export const ICalParserService = new ICalParserServiceClass();
