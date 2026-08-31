import {emitter} from "./Events";
import {stopEvent} from "./Utils";

export type FlashState = {
    message?: string;
    type?: string;
    action?: (() => void) | null;
    actionLabel?: string | null;
    duration?: number | null;
};

let flash: FlashState = {};

export function getFlash(): FlashState {
    return {...flash};
}

export function setFlash(
    message: string,
    type = "info",
    action: (() => void) | null = null,
    actionLabel: string | null = null,
    duration: number | null = null
): void {
    flash = {message: message, type: type || "info", action: action, actionLabel: actionLabel, duration: duration};
    emitter.emit("flash", flash);
}

export function clearFlash(e?: unknown): void {
    stopEvent(e);
    emitter.emit("flash", {});
}
