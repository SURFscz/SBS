import {library} from '@fortawesome/fontawesome-svg-core'
import {
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
    faInfoCircle,
    faLightbulb,
    faLink,
    faPlus,
    faQuestion,
    faQuestionCircle,
    faSearch,
    faTimes,
    faTrash,
    faUserSecret,
    faWindowClose,
} from '@fortawesome/free-solid-svg-icons'

export function addIcons() {
    library.add(faLightbulb, faCalendarAlt, faArrowLeft, faCopy, faGavel, faLink, faBook, faCheckCircle, faInfoCircle, faInfo,
        faCircle, faCheck, faDoorClosed,
        faPlus, faSearch, faWindowClose, faArrowRight, faExternalLinkAlt, faArrowUp, faArrowDown,
        faQuestion, faQuestionCircle, faEnvelope, faTrash, faTimes, faCaretUp, faCaretDown, faUserSecret,
    );
}
