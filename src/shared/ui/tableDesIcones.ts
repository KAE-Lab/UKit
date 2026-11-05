/**
 * La table des icones : chaque glyphe de Material Design que l'application nomme, et l'icone au
 * trait de Lucide qui le dessine desormais (7-J, deuxieme passe). Les noms restent ceux de Material,
 * verifies par le compilateur contre ses tables : un appelant n'a rien a apprendre, et un nom venu
 * des donnees que cette table ignore retombe sur Material (`Icon`).
 *
 * Chaque icone s'importe seule, par `lucide-react-native/icons/<nom>` : l'index du paquet en
 * embarquerait plus de 3 800.
 */

import type { ComponentType } from 'react';
import type { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import type { LucideProps } from 'lucide-react-native';

import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Bell from 'lucide-react-native/icons/bell';
import Book from 'lucide-react-native/icons/book';
import BookAlert from 'lucide-react-native/icons/book-alert';
import BookOpen from 'lucide-react-native/icons/book-open';
import Building from 'lucide-react-native/icons/building';
import CakeSlice from 'lucide-react-native/icons/cake-slice';
import Calendar from 'lucide-react-native/icons/calendar';
import Calendar1 from 'lucide-react-native/icons/calendar-1';
import CalendarArrowDown from 'lucide-react-native/icons/calendar-arrow-down';
import CalendarArrowUp from 'lucide-react-native/icons/calendar-arrow-up';
import CalendarCheck from 'lucide-react-native/icons/calendar-check';
import CalendarCheck2 from 'lucide-react-native/icons/calendar-check-2';
import CalendarClock from 'lucide-react-native/icons/calendar-clock';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import CalendarHeart from 'lucide-react-native/icons/calendar-heart';
import CalendarRange from 'lucide-react-native/icons/calendar-range';
import CalendarSync from 'lucide-react-native/icons/calendar-sync';
import CalendarX from 'lucide-react-native/icons/calendar-x';
import Calendars from 'lucide-react-native/icons/calendars';
import ChartLine from 'lucide-react-native/icons/chart-line';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleUser from 'lucide-react-native/icons/circle-user';
import CircleX from 'lucide-react-native/icons/circle-x';
import Clock from 'lucide-react-native/icons/clock';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import Compass from 'lucide-react-native/icons/compass';
import CookingPot from 'lucide-react-native/icons/cooking-pot';
import Croissant from 'lucide-react-native/icons/croissant';
import CupSoda from 'lucide-react-native/icons/cup-soda';
import DoorClosed from 'lucide-react-native/icons/door-closed';
import DoorClosedLocked from 'lucide-react-native/icons/door-closed-locked';
import DoorOpen from 'lucide-react-native/icons/door-open';
import Dot from 'lucide-react-native/icons/dot';
import Drumstick from 'lucide-react-native/icons/drumstick';
import Egg from 'lucide-react-native/icons/egg';
import Feather from 'lucide-react-native/icons/feather';
import FileImage from 'lucide-react-native/icons/file-image';
import FileSearch from 'lucide-react-native/icons/file-search';
import FileText from 'lucide-react-native/icons/file-text';
import Fish from 'lucide-react-native/icons/fish';
import Folder from 'lucide-react-native/icons/folder';
import Footprints from 'lucide-react-native/icons/footprints';
import Funnel from 'lucide-react-native/icons/funnel';
import FunnelX from 'lucide-react-native/icons/funnel-x';
import Globe from 'lucide-react-native/icons/globe';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import Hamburger from 'lucide-react-native/icons/hamburger';
import HandHeart from 'lucide-react-native/icons/hand-heart';
import Hash from 'lucide-react-native/icons/hash';
import Hourglass from 'lucide-react-native/icons/hourglass';
import Info from 'lucide-react-native/icons/info';
import KeyRound from 'lucide-react-native/icons/key-round';
import Leaf from 'lucide-react-native/icons/leaf';
import Link from 'lucide-react-native/icons/link';
import ListFilter from 'lucide-react-native/icons/list-filter';
import Lock from 'lucide-react-native/icons/lock';
import LogIn from 'lucide-react-native/icons/log-in';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MailWarning from 'lucide-react-native/icons/mail-warning';
import Map from 'lucide-react-native/icons/map';
import MapPin from 'lucide-react-native/icons/map-pin';
import MapPinned from 'lucide-react-native/icons/map-pinned';
import Megaphone from 'lucide-react-native/icons/megaphone';
import Milk from 'lucide-react-native/icons/milk';
import Minus from 'lucide-react-native/icons/minus';
import PartyPopper from 'lucide-react-native/icons/party-popper';
import Pizza from 'lucide-react-native/icons/pizza';
import Plus from 'lucide-react-native/icons/plus';
import Popcorn from 'lucide-react-native/icons/popcorn';
import RectangleEllipsis from 'lucide-react-native/icons/rectangle-ellipsis';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Sandwich from 'lucide-react-native/icons/sandwich';
import School from 'lucide-react-native/icons/school';
import Search from 'lucide-react-native/icons/search';
import SearchX from 'lucide-react-native/icons/search-x';
import Settings from 'lucide-react-native/icons/settings';
import Share from 'lucide-react-native/icons/share';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Sofa from 'lucide-react-native/icons/sofa';
import Soup from 'lucide-react-native/icons/soup';
import Star from 'lucide-react-native/icons/star';
import SunMoon from 'lucide-react-native/icons/sun-moon';
import Trash2 from 'lucide-react-native/icons/trash';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import Unlink from 'lucide-react-native/icons/unlink';
import User from 'lucide-react-native/icons/user';
import UserSearch from 'lucide-react-native/icons/user-search';
import Users from 'lucide-react-native/icons/users';
import Utensils from 'lucide-react-native/icons/utensils';
import UtensilsCrossed from 'lucide-react-native/icons/utensils-crossed';
import X from 'lucide-react-native/icons/x';

export interface EntreeDIcone {
    readonly composant: ComponentType<LucideProps>;
    /** Un glyphe plein chez Material : l'etoile d'un favori. */
    readonly plein?: boolean;
}

function entree(composant: ComponentType<LucideProps>, plein = false): EntreeDIcone {
    return { composant, plein };
}

export const ICONES_COMMUNITY: Partial<Record<keyof typeof MaterialCommunityIcons.glyphMap, EntreeDIcone>> = {
    'account-circle': entree(CircleUser),
    'account-circle-outline': entree(CircleUser),
    'account-key-outline': entree(KeyRound),
    'account-search-outline': entree(UserSearch),
    'alert-circle-outline': entree(CircleAlert),
    'alert-outline': entree(TriangleAlert),
    'arrow-right': entree(ArrowRight),
    'autorenew': entree(RefreshCw),
    'baguette': entree(Sandwich),
    'bell-outline': entree(Bell),
    'book': entree(Book),
    'book-alert-outline': entree(BookAlert),
    'book-open-variant': entree(BookOpen),
    'bottle-soda': entree(CupSoda),
    'bowl-mix': entree(Soup),
    'bullhorn': entree(Megaphone),
    'bullhorn-outline': entree(Megaphone),
    'calendar': entree(Calendar),
    'calendar-account': entree(CalendarHeart),
    'calendar-alert': entree(CalendarX),
    'calendar-blank': entree(Calendar),
    'calendar-check': entree(CalendarCheck),
    'calendar-check-outline': entree(CalendarCheck),
    'calendar-clock': entree(CalendarClock),
    'calendar-export': entree(CalendarArrowUp),
    'calendar-import': entree(CalendarArrowDown),
    'calendar-lock-open-outline': entree(CalendarCheck2),
    'calendar-month-outline': entree(CalendarDays),
    'calendar-multiple': entree(Calendars),
    'calendar-range': entree(CalendarRange),
    'calendar-sync-outline': entree(CalendarSync),
    'calendar-today': entree(Calendar1),
    'chart-line': entree(ChartLine),
    'check': entree(Check),
    'check-circle': entree(CircleCheck),
    'cheese': entree(Milk),
    'chevron-down': entree(ChevronDown),
    'chevron-left': entree(ChevronLeft),
    'chevron-right': entree(ChevronRight),
    'chevron-up': entree(ChevronUp),
    'circle-medium': entree(Dot),
    'circle-small': entree(Dot),
    'clock': entree(Clock),
    'clock-outline': entree(Clock),
    'close': entree(X),
    'close-circle': entree(CircleX),
    'cloud-off': entree(CloudOff),
    'cog-outline': entree(Settings),
    'compass-outline': entree(Compass),
    'cupcake': entree(CakeSlice),
    'domain': entree(Building),
    'door-closed': entree(DoorClosed),
    'door-closed-lock': entree(DoorClosedLocked),
    'door-open': entree(DoorOpen),
    'egg': entree(Egg),
    'email': entree(Mail),
    'email-alert-outline': entree(MailWarning),
    'email-outline': entree(Mail),
    'export-variant': entree(Share),
    'feather': entree(Feather),
    'file-document-outline': entree(FileText),
    'file-eye-outline': entree(FileSearch),
    'file-image-outline': entree(FileImage),
    'file-pdf-box': entree(FileText),
    'filter-outline': entree(Funnel),
    'filter-remove-outline': entree(FunnelX),
    'filter-variant': entree(ListFilter),
    'filter-variant-remove': entree(FunnelX),
    'fish': entree(Fish),
    'folder': entree(Folder),
    'folder-outline': entree(Folder),
    'food-croissant': entree(Croissant),
    'food-drumstick': entree(Drumstick),
    'food-off': entree(UtensilsCrossed),
    'form-textbox-password': entree(RectangleEllipsis),
    'french-fries': entree(Popcorn),
    'hamburger': entree(Hamburger),
    'hand-heart-outline': entree(HandHeart),
    'information': entree(Info),
    'information-outline': entree(Info),
    'leaf': entree(Leaf),
    'link-variant-off': entree(Unlink),
    'link-variant-plus': entree(Link),
    'lock': entree(Lock),
    'lock-outline': entree(Lock),
    'login-variant': entree(LogIn),
    'logout': entree(LogOut),
    'magnify': entree(Search),
    'magnify-close': entree(SearchX),
    'map-marker': entree(MapPin),
    'map-marker-radius': entree(MapPinned),
    'map-search-outline': entree(Map),
    'minus': entree(Minus),
    'party-popper': entree(PartyPopper),
    'pasta': entree(CookingPot),
    'pizza': entree(Pizza),
    'plus': entree(Plus),
    'refresh': entree(RefreshCw),
    'school': entree(School),
    'school-outline': entree(School),
    'shield-check': entree(ShieldCheck),
    'shield-check-outline': entree(ShieldCheck),
    'silverware-spoon': entree(Utensils),
    'sofa-outline': entree(Sofa),
    'star': entree(Star, true),
    'star-outline': entree(Star),
    'swap-horizontal': entree(ArrowLeftRight),
    'taco': entree(Sandwich),
    'theme-light-dark': entree(SunMoon),
    'timer-sand': entree(Hourglass),
    'toolbox-outline': entree(GraduationCap),
    'trash-can-outline': entree(Trash2),
    'walk': entree(Footprints),
    'web': entree(Globe),
};

export const ICONES_MATERIAL: Partial<Record<keyof typeof MaterialIcons.glyphMap, EntreeDIcone>> = {
    'add': entree(Plus),
    'arrow-back': entree(ChevronLeft),
    'check': entree(Check),
    'close': entree(X),
    'code': entree(Hash),
    'date-range': entree(CalendarRange),
    'delete': entree(Trash2),
    'directions-walk': entree(Footprints),
    'event-note': entree(Calendar1),
    'group': entree(Users),
    'info-outline': entree(Info),
    'location-on': entree(MapPin),
    'navigate-before': entree(ChevronLeft),
    'navigate-next': entree(ChevronRight),
    'person': entree(User),
    'room': entree(MapPin),
    'schedule': entree(Clock),
    'star': entree(Star, true),
    'star-border': entree(Star),
};
