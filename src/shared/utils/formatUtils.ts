import { decode } from 'html-entities';

export const upperCaseFirstLetter = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1);

export const formatDescription = (string: string): string => {
    return decode(string.replace(/\r/g, '').replace(/<br \/>/g, '').replace(/\n\n\n\n/g, ';'));
};
