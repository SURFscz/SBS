import {emitter} from "./Events";
import {stopEvent} from "./Utils";

let flash = {};

export function getFlash() {
    return {...flash};
}

export function setFlash(message, type = "info", action = null, actionLabel = null) {
    flash = {message: message, type: type || "info", action: action, actionLabel: actionLabel};
    emitter.emit("flash", flash);
}

export function clearFlash(e) {
    stopEvent(e);
    emitter.emit("flash", {});
}