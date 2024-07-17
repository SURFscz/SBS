import {emitter} from "./Events";
import {stopEvent} from "./Utils";

let flash = {};

export function getFlash() {
    return {...flash};
}

export function setFlash(message, type = "info", action = null, actionLabel = null, duration = null) {
    flash = {message: message, type: type || "info", action: action, actionLabel: actionLabel, duration: duration};
    emitter.emit("flash", flash);
}

export function clearFlash(e) {
    stopEvent(e);
    emitter.emit("flash", {});
}