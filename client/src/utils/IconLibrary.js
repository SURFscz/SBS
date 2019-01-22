import {library} from '@fortawesome/fontawesome-svg-core'
// ⌘C the icon imports and then $ pbpaste | sort
import {
    faArrowDown,
    faArrowLeft,
    faArrowRight,
    faArrowUp,
    faBook,
    faCheck,
    faCheckCircle,
    faCircle,
    faEnvelope,
    faExternalLinkAlt,
    faGavel,
    faInfoCircle,
    faLightbulb,
    faLink,
    faPlus,
    faTimes,
    faQuestion,
    faQuestionCircle,
    faSearch,
    faTrash,
    faWindowClose,
} from '@fortawesome/free-solid-svg-icons'

export function addIcons() {
    library.add(faLightbulb, faArrowLeft, faGavel, faLink, faBook, faCheckCircle, faInfoCircle, faCircle, faCheck,
        faPlus, faSearch, faWindowClose, faArrowRight, faExternalLinkAlt, faArrowUp, faArrowDown,
        faQuestion, faQuestionCircle, faEnvelope, faTrash, faTimes);
}
