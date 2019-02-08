import {library} from '@fortawesome/fontawesome-svg-core'
// ⌘C the icon imports and then $ pbpaste | sort
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
        faCircle, faCheck,
        faPlus, faSearch, faWindowClose, faArrowRight, faExternalLinkAlt, faArrowUp, faArrowDown,
        faQuestion, faQuestionCircle, faEnvelope, faTrash, faTimes, faCaretUp, faCaretDown, faUserSecret,
    );
}
