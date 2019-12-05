import {isEmpty, pseudoGuid, stopEvent} from "./Utils";
import {getParameterByName} from "./QueryParameters";

export function login(e) {
    stopEvent(e);
    const state = getParameterByName("state", window.location.search);
    const guid = pseudoGuid();
    const queryParameter = isEmpty(state) ? `guid=${guid}` : `guid=${guid}&state=${encodeURIComponent(state)}`;
    window.location.href = `/login?${queryParameter}`;
}