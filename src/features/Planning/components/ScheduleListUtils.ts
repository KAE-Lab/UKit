import { PlanningEvent } from '../services/PlanningApiService';

export const groupOverlappingCourses = (courses: PlanningEvent[]) => {
    if (!courses || courses.length === 0) return [];
    if (courses.length === 1 && courses[0].category === 'nocourse') return [courses];

    const timeToMinutes = (timeStr: string) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };

    const sorted = [...courses].sort((a, b) => timeToMinutes(a.starttime) - timeToMinutes(b.starttime));

    const groups = [];
    let currentGroup = [sorted[0]];
    let groupEnd = timeToMinutes(sorted[0].endtime);

    for (let i = 1; i < sorted.length; i++) {
        const course = sorted[i];
        const start = timeToMinutes(course.starttime);
        const end = timeToMinutes(course.endtime);

        if (start < groupEnd) {
            currentGroup.push(course);
            groupEnd = Math.max(groupEnd, end);
        } else {
            groups.push(currentGroup);
            currentGroup = [course];
            groupEnd = end;
        }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);
    return groups;
};
