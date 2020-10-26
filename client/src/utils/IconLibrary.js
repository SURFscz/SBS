import {library} from '@fortawesome/fontawesome-svg-core'
import {
    faAngleDown,
    faAngleUp,
    faArrowDown,
    faArrowLeft,
    faArrowRight,
    faArrowUp,
    faBook,
    faCalendarAlt,
    faCaretDown,
    faCaretUp,
    faCheck,
    faCheckCircle,
    faCircle,
    faCopy,
    faDoorClosed,
    faEnvelope,
    faExternalLinkAlt,
    faGavel,
    faInfo,
    faHistory,
    faInfoCircle,
    faLightbulb,
    faLink,
    faPlus,
    faQuestion,
    faQuestionCircle,
    faSearch,
    faTimes,
    faTrash,
    faUserLock,
    faUserSecret,
    faWindowClose,
    faLock,
    faLockOpen
} from '@fortawesome/free-solid-svg-icons'

export function addIcons() {
    library.add(faLightbulb, faCalendarAlt, faArrowLeft, faCopy, faGavel, faLink, faBook, faCheckCircle, faInfoCircle, faInfo,
        faCircle, faCheck, faDoorClosed, faAngleDown,faAngleUp, faHistory,
        faPlus, faSearch, faWindowClose, faArrowRight, faExternalLinkAlt, faArrowUp, faArrowDown,
        faQuestion, faQuestionCircle, faEnvelope, faTrash, faTimes, faCaretUp, faCaretDown, faUserSecret, faUserLock,
        faLock, faLockOpen
    );
}
