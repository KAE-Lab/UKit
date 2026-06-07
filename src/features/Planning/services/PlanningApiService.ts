import axios from 'axios';
import qs from 'qs';
import moment from 'moment';
import 'moment/locale/fr';
import { WebApiURL } from '../../../shared/constants/urls';
import { formatDescription, upperCaseFirstLetter } from '../../../shared/utils/formatUtils';

moment.locale('fr');

export interface PlanningEvent {
    id: string;
    style: string;
    color: string;
    schedule: string;
    starttime: string;
    endtime: string;
    date: { start: string; end: string };
    subject: string;
    description: string;
    category: string;
    group: string;
    toFilter?: string | null;
    day?: string;
    dayNumber?: string;
}

export interface RawPlanningEvent {
    id: string;
    eventCategory: string;
    start: string;
    end: string;
    backgroundColor: string;
    description: string;
    modules: string[] | null;
}

export interface PlanningWeekDay {
    dayNumber: string;
    dayTimestamp: number;
    courses: PlanningEvent[];
}

class PlanningApiServiceClass {
    fetchGroupList = async (): Promise<string[] | null> => {
        const options = {
            method: 'GET',
            url: WebApiURL.DOMAIN + WebApiURL.GROUPS,
            params: { searchTerm: '_', pageSize: '10000', resType: '103' },
        };
        try {
            const results = await axios.request(options);
            if (results?.status !== 200) return null;
            if (!results.data) return null;

            return results.data.results
                .map((e: { id: string }) => e.id)
                .filter((e: string) => e.length > 2)
                .sort();
        } catch (error) {
            return null;
        }
    };

    sortFunctionGroup = (a: { subject: string; starttime: string }, b: { subject: string; starttime: string }): number => {
        const regexUE = RegExp('([0-9][A-Z0-9]+) (.+)', 'im');
        let subectA = a.subject.toUpperCase();
        let subectB = b.subject.toUpperCase();
        const matchA = regexUE.exec(subectA);
        const matchB = regexUE.exec(subectB);

        if (matchA && matchA.length === 3) subectA = `${matchA[2]}`;
        if (matchB && matchB.length === 3) subectB = `${matchB[2]}`;

        if (a.starttime > b.starttime) return 1;
        if (a.starttime < b.starttime) return -1;
        else if (subectA > subectB) return 1;
        else if (subectA < subectB) return -1;
        return 0;
    };

    parseEvent(event: RawPlanningEvent, group: string, separator: string = '\n'): PlanningEvent {
        const startDate = moment(event.start);
        const endDate = moment(event.end);
        const starttime = startDate.format('HH:mm');
        const endtime = endDate.format('HH:mm');

        let subject = event.eventCategory;
        if (event.modules !== null) subject = event.modules.shift();

        const unfilteredDescription = formatDescription(event.description).split(separator);
        const description = [];
        for (const field of unfilteredDescription) {
            if (!field.includes(event.eventCategory) && !field.includes(subject)) {
                description.push(field.trim());
            }
        }

        let toFilter = null;
        if (description[0]?.includes(group)) {
            let filter = description[0].replace(group, '').replace('-', '').trim();
            toFilter = filter !== '' ? filter : null;
        }

        return {
            id: event.id,
            style: 'style="background-color:' + event.backgroundColor + '"',
            color: event.backgroundColor,
            schedule: starttime + '-' + endtime + ' ' + event.eventCategory,
            starttime,
            endtime,
            date: { start: startDate.toISOString(), end: endDate.toISOString() },
            subject,
            description: description.filter((e) => e != '').join('\n'),
            category: event.eventCategory,
            group,
            toFilter,
        };
    }

    fetchCalendarDay = async (group: string, date: string): Promise<PlanningEvent[] | null> => {
        const endQueryDate = moment(date, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');
        const data = {
            start: date,
            end: endQueryDate,
            resType: '103',
            calView: 'agendaDay',
            'federationIds[]': group,
            colourScheme: '3',
        };
        const options = {
            method: 'POST',
            url: WebApiURL.DOMAIN + WebApiURL.CALENDARDATA,
            headers: {
                Connection: 'keep-alive',
                Pragma: 'no-cache',
                'Cache-Control': 'no-cache',
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            data: qs.stringify(data, { arrayFormat: 'repeat' }),
        };

        try {
            const response = await axios.request(options);
            if (response?.status !== 200) return null;

            const eventList = [];
            for (const event of response.data) {
                if (event.eventCategory === 'Vacances') continue;
                if (moment(event.start).format('YYYY-MM-DD') !== date) continue;

                eventList.push(this.parseEvent(event, group, ';'));
            }
            return eventList.sort(this.sortFunctionGroup);
        } catch (error) {
            return null;
        }
    };

    fetchCalendarWeek = async (group: string, week: { year: number; week: number }): Promise<PlanningWeekDay[] | null> => {
        const searchDate = moment().year(week.year).isoWeek(week.week);
        const begin = searchDate.startOf('week').format('YYYY-MM-DD');
        const end = searchDate.endOf('week').format('YYYY-MM-DD');
        const data = {
            start: begin,
            end: end,
            resType: '103',
            calView: 'agendaWeek',
            'federationIds[]': group,
            colourScheme: '3',
        };
        const options = {
            method: 'POST',
            url: WebApiURL.DOMAIN + WebApiURL.CALENDARDATA,
            headers: {
                Connection: 'keep-alive',
                Pragma: 'no-cache',
                'Cache-Control': 'no-cache',
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            data: qs.stringify(data, { arrayFormat: 'repeat' }),
        };

        try {
            const response = await axios.request(options);
            if (response?.status !== 200) return null;

            const eventList: PlanningWeekDay[] = Array.from({ length: 6 }).map((_, i) => ({
                dayNumber: String(i + 1),
                dayTimestamp: searchDate.clone().startOf('week').add(i, 'day').unix(),
                courses: [],
            }));

            for (const event of response.data) {
                if (event.eventCategory === 'Vacances') continue;

                const startDate = moment(event.start);
                const day = upperCaseFirstLetter(moment(startDate).format('dddd L'));
                const dayNumberInt = moment(startDate).isoWeekday();

                if (dayNumberInt < 1 || dayNumberInt > 6) continue;

                const parsedEvent = this.parseEvent(event, group, '\n');
                parsedEvent.day = day;
                parsedEvent.dayNumber = String(dayNumberInt);

                eventList[dayNumberInt - 1].courses.push(parsedEvent);
            }

            for (const day of eventList) {
                day.courses.sort(this.sortFunctionGroup);
            }

            return eventList;
        } catch (error) {
            return null;
        }
    };

    fetchCalendarForSynchronization = async (group: string): Promise<PlanningEvent[] | null | void> => {
        const currentDate = moment();
        const begin = moment().set('month', 7).startOf('month');
        const end = moment().set('month', 7).startOf('month').add(1, 'year');

        if (currentDate.isBefore(begin)) {
            begin.subtract(1, 'year');
            end.subtract(1, 'year');
        }

        const data = {
            start: begin.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD'),
            resType: '103',
            calView: 'agendaWeek',
            'federationIds[]': group,
            colourScheme: '3',
        };

        const options = {
            method: 'POST',
            url: WebApiURL.DOMAIN + WebApiURL.CALENDARDATA,
            headers: {
                Connection: 'keep-alive',
                Pragma: 'no-cache',
                'Cache-Control': 'no-cache',
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            data: qs.stringify(data),
        };

        try {
            const response = await axios.request(options);
            if (response?.status !== 200) return;

            const events = [];
            for (const event of response.data) {
                if (event.eventCategory === 'Vacances') continue;

                const startDate = moment(event.start);
                const day = upperCaseFirstLetter(moment(startDate).format('dddd L'));
                const dayNumberInt = moment(startDate).isoWeekday();

                const parsedEvent = this.parseEvent(event, group, ';');
                parsedEvent.day = day;
                parsedEvent.dayNumber = String(dayNumberInt);

                events.push(parsedEvent);
            }

            return events.sort(this.sortFunctionGroup);
        } catch (error) {
            return null;
        }
    };
}

export const PlanningApiService = new PlanningApiServiceClass();
