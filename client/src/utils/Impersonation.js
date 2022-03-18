import {emitter} from "./Events";

export function emitImpersonation(user, history, path = "/home") {
    emitter.emit("impersonation",
        {
            "user": user, "callback": () => {
                const newPath = encodeURIComponent(path);
                history.push(`/refresh-route/${newPath}`);
            }
        })
}