import {emitter} from "./Events";
import {stopEvent} from "./Utils";

let flash = {};

export function getFlash() {
    return {...flash};
}

export function setFlash(message, type) {
    flash = {message, type: type || "info"};
    emitter.emit("flash", flash);
}

export function clearFlash(e) {
    stopEvent(e);
    emitter.emit("flash", {});
}